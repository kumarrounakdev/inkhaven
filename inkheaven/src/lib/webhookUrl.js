// Local-only override for the booking webhook, used solely when the server runs
// with ALLOW_CLIENT_WEBHOOK_OVERRIDE=1 (a local development convenience).
//
// In a normal deployment the server holds BOOKING_WEBHOOK_URL and this module
// is unused — nothing here reaches the network on its own.
const STORAGE_KEY = 'inkheaven:webhook-url'

export function getWebhookUrl() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

export function setWebhookUrl(value) {
  const next = String(value).trim()
  try {
    if (next) window.localStorage.setItem(STORAGE_KEY, next)
    else window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage unavailable (private mode) — the in-page value still applies.
  }
}

export function isValidWebhookUrl(value) {
  const raw = String(value).trim()
  if (!raw) return false
  try {
    const url = new URL(raw)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}