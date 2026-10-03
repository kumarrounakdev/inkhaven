/**
 * Server-side booking webhook proxy.
 *
 * The n8n webhook URL lives in the SERVER environment and is never shipped to
 * the browser, which is what lets the site keep `connect-src 'self'`.
 *
 * The destination is whatever URL the visitor saved in the site settings, sent
 * as `x-webhook-url`. BOOKING_WEBHOOK_URL is only the fallback for when the
 * browser supplies nothing.
 *
 * Env (all optional):
 *   BOOKING_WEBHOOK_URL      fallback destination when no override is sent
 *   TRUST_PROXY              set to "1" to read the client IP from
 *                            X-Forwarded-For (only behind a real proxy)
 *   BOOKING_RATE_LIMIT       max submissions per window, default 5
 *   BOOKING_RATE_WINDOW_MS   window length in ms, default 10 minutes
 */

// Load .env into process.env without adding a dependency. Server-side only:
// nothing here is prefixed VITE_, so none of it can leak into the client bundle.
try {
  process.loadEnvFile('.env')
} catch {
  // No .env file — fall back to the real environment.
}

const WEBHOOK_URL = (process.env.BOOKING_WEBHOOK_URL || '').trim()
const TRUST_PROXY = process.env.TRUST_PROXY === '1'

const RATE_LIMIT = Number(process.env.BOOKING_RATE_LIMIT || 5)
const RATE_WINDOW_MS = Number(process.env.BOOKING_RATE_WINDOW_MS || 10 * 60 * 1000)

const MAX_BODY_BYTES = 16 * 1024
const UPSTREAM_TIMEOUT_MS = 8000

const BOOKINGS_PATH = '/api/bookings'

// Field allowlist + per-field length caps. Anything unexpected is dropped, so a
// crafted body cannot smuggle extra keys through to the webhook.
const FIELDS = {
  name: 120,
  email: 200,
  phone: 40,
  style: 40,
  placement: 40,
  size: 40,
  description: 4000,
  date: 10,
  dateIso: 10,
  time: 5,
  budget: 40,
  page: 500,
  company: 200, // honeypot
}

const REQUIRED = ['name', 'email', 'phone', 'description']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Ten national digits, trunk code optional so a hand-written or older payload
// that omits "+91" is not rejected. The form cannot produce anything else.
const PHONE_RE = /^(?:\+?91)?[0-9]{10}$/

// Fixed per-IP token bucket. Unbounded maps are a memory leak, so old entries
// are pruned whenever a new request is admitted.
const hits = new Map()

function clientIp(req) {
  if (TRUST_PROXY) {
    const forwarded = req.headers['x-forwarded-for']
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0].trim()
    }
  }
  return req.socket?.remoteAddress || 'unknown'
}

function rateLimited(ip) {
  const now = Date.now()
  const entry = hits.get(ip)

  if (!entry || now - entry.start > RATE_WINDOW_MS) {
    hits.set(ip, { start: now, count: 1 })
    for (const [key, value] of hits) {
      if (now - value.start > RATE_WINDOW_MS) hits.delete(key)
    }
    return false
  }

  entry.count += 1
  return entry.count > RATE_LIMIT
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0

    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Payload too large'), { statusCode: 413 }))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload)
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(body)
}

function resolveTarget(requested) {
  // A URL saved in the site settings wins, so the endpoint can be changed
  // without a rebuild or a server restart. The env var is the fallback.
  const raw = String(requested || WEBHOOK_URL).trim()

  if (!raw) {
    return {
      error:
        'Enter a webhook URL in the site settings, or set BOOKING_WEBHOOK_URL on the server.',
    }
  }

  let url
  try {
    url = new URL(raw)
  } catch {
    return { error: 'Booking endpoint is not a valid URL.' }
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return { error: 'Booking endpoint must use http or https.' }
  }

  return { url }
}

function sanitize(input) {
  const out = {}
  const errors = {}

  for (const [key, max] of Object.entries(FIELDS)) {
    if (typeof input[key] !== 'string') continue
    // Strip control characters so the payload stays clean for email/CSV sinks.
    const value = input[key].replace(/[\u0000-\u001f\u007f]/g, ' ').trim()
    if (value) out[key] = value.slice(0, max)
  }

  for (const key of REQUIRED) {
    if (!out[key]) errors[key] = 'Missing required field.'
  }
  if (out.email && !EMAIL_RE.test(out.email)) {
    errors.email = 'Enter a valid email address.'
  }
  if (out.phone && !PHONE_RE.test(out.phone)) {
    errors.phone = 'Enter a 10-digit mobile number.'
  }
  if (out.date && !/^\d{2}-\d{2}-\d{4}$/.test(out.date)) {
    errors.date = 'Enter the date as dd-mm-yyyy.'
  }

  // Honeypot: a bot filled it in. Report success, send nothing, learn nothing.
  if (out.company) return { bot: true, errors: null }

  return { bot: false, errors: Object.keys(errors).length ? errors : null, value: out }
}

/**
 * Handle a booking request. Returns true when the route was served, false when
 * the caller should fall through to its own routing.
 */
export async function handleBookingRequest(req, res) {
  const pathname = new URL(req.url || '/', 'http://localhost').pathname
  if (pathname !== BOOKINGS_PATH) return false

  if (req.method === 'GET') {
    sendJson(res, 200, {
      // Whether the server holds a fallback URL. A URL saved in the browser
      // always works, so the panel always offers the field regardless.
      configured: Boolean(WEBHOOK_URL),
    })
    return true
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    sendJson(res, 405, { ok: false, error: 'Method not allowed.' })
    return true
  }

  const contentType = String(req.headers['content-type'] || '')
  if (!contentType.includes('application/json')) {
    sendJson(res, 415, { ok: false, error: 'Expected application/json.' })
    return true
  }

  let parsed
  try {
    parsed = JSON.parse(await readBody(req))
  } catch (err) {
    const status = err.statusCode || 400
    sendJson(res, status, { ok: false, error: 'Could not read the request body.' })
    return true
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    sendJson(res, 400, { ok: false, error: 'Unexpected request body.' })
    return true
  }

  if (rateLimited(clientIp(req))) {
    res.setHeader('Retry-After', String(Math.ceil(RATE_WINDOW_MS / 1000)))
    sendJson(res, 429, { ok: false, error: 'Too many requests. Please try again later.' })
    return true
  }

  const { bot, errors, value } = sanitize(parsed)
  if (bot) {
    sendJson(res, 200, { ok: true })
    return true
  }
  if (errors) {
    sendJson(res, 400, { ok: false, error: 'Please check the highlighted fields.', fields: errors })
    return true
  }

  const { url, error: targetError } = resolveTarget(req.headers['x-webhook-url'])
  if (targetError) {
    // 503: the deployment is missing configuration, not the visitor's fault.
    sendJson(res, 503, { ok: false, error: targetError })
    return true
  }

  // The server stamps its own time — client clocks are not trustworthy.
  const payload = {
    ...value,
    budget: value.budget || null,
    submittedAt: new Date().toISOString(),
  }
  delete payload.company

  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      redirect: 'error',
    })

    if (!upstream.ok) {
      // Never forward the upstream body or URL — it may leak internal details.
      console.error(`[booking] webhook responded ${upstream.status}`)
      sendJson(res, 502, { ok: false, error: 'The booking service did not accept the request.' })
      return true
    }
  } catch (err) {
    console.error(`[booking] webhook request failed: ${err.message}`)
    sendJson(res, 502, { ok: false, error: 'Could not reach the booking service.' })
    return true
  }

  sendJson(res, 200, { ok: true })
  return true
}

/** Connect-style middleware, for use as Vite dev/preview middleware. */
export function bookingMiddleware(req, res, next) {
  handleBookingRequest(req, res).then(
    (handled) => {
      if (!handled) next()
    },
    (err) => {
      console.error(`[booking] unhandled: ${err.message}`)
      if (!res.headersSent) sendJson(res, 500, { ok: false, error: 'Something went wrong.' })
    },
  )
}