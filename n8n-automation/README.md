# n8n automation

n8n workflows that back the Inkheaven site. The site never talks to n8n
directly — `inkheaven/scripts/bookingProxy.mjs` forwards to the webhook so the
URL stays server-side and the browser can keep `connect-src 'self'`.

## Workflows

| File | Purpose |
| --- | --- |
| `inkheaven-booking.json` | Receives booking enquiries, validates them, emails the studio, answers the visitor. |

## Import

n8n → **Workflows** → **Import from File** → pick the JSON → **Import**.

Workflows are committed inactive. Activate it yourself once the credentials and
variables below are set.

## Booking workflow

Path: `POST /webhook/inkheaven-booking`, method `POST`.

Flow: `Booking Webhook` → `Validate Booking` → `Dedupe Window` →
`Is New Enquiry` → `Has Budget` → `Email Studio` → `Respond OK`.

- **Validate Booking** re-checks the required fields and the honeypot, then
  normalises the payload so every downstream node sees the same shape.
- **Dedupe Window** waits 100 minutes and `Is New Enquiry` drops anything with
  the same email, so a double-submit or a refresh does not email twice.
- **Has Budget** tags the enquiry as high or standard priority.

### Expected payload

Matches the allowlist in `bookingProxy.mjs`:

```json
{
  "name": "…",
  "email": "…",
  "phone": "…",
  "style": "…",
  "placement": "…",
  "size": "…",
  "description": "…",
  "date": "dd-mm-yyyy",
  "dateIso": "yyyy-mm-dd",
  "time": "HH:mm",
  "budget": "…",
  "page": "…",
  "submittedAt": "2026-01-01T00:00:00.000Z"
}
```

`name`, `email`, `phone` and `description` are required. `company` is a
honeypot — a filled-in value is dropped silently.

## Setup

### Site side

Copy `inkheaven/.env.example` to `inkheaven/.env` and set:

```
BOOKING_WEBHOOK_URL=https://n8n.example.com/webhook/inkheaven-booking
```

Leave `ALLOW_CLIENT_WEBHOOK_OVERRIDE` unset in production — it turns
`/api/bookings` into an open relay to any public host.

### n8n side

1. Add an **SMTP** credential to the `Email Studio` node.
2. Add n8n variables (Settings → Variables, or `n8n` → Variables):
   - `INKHEAVEN_NOTIFICATION_EMAIL` — where enquiries go.
   - `INKHEAVEN_SMTP_FROM` — the sender address.
3. Activate the workflow and copy the production webhook URL.

### Test

```bash
curl -X POST https://n8n.example.com/webhook/inkheaven-booking \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","phone":"5550100","description":"Test enquiry"}'
```

Expect `{"ok":true}`. The proxy waits up to 8s for the webhook, so keep the
workflow under that — the wait node is inside it.