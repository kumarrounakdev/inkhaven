// The webhook URL the visitor saved in the site settings, sent to the booking
// proxy as `x-webhook-url`.
//
// The proxy honours this header unconditionally - there is no flag gating it -
// so it is a local/private-network convenience, not something to expose
// publicly without an authenticated hop in front. BOOKING_WEBHOOK_URL is the
// server-side fallback when nothing was saved.
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