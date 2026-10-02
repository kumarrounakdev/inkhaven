# n8n automation

One n8n workflow that both apps point at.

| File | Purpose |
| --- | --- |
| `inkdesk-bookings.json` | Receives Inkheaven bookings and serves the Inkdesk API. One URL for both. |

## How the single URL works

Both apps POST to the same webhook URL. The workflow tells them apart by the
body:

- **No `action` field** → a booking submitted from the Inkheaven website form.
- **`action` field** → an Inkdesk request (`list`, `dashboard`, `reschedule`, …).

That split is reliable because the two send genuinely different shapes:
`inkheaven/scripts/bookingProxy.mjs` forwards only allowlisted booking fields
and never sets `action`, while `inkdesk/src/lib/api.js` always sends
`{ action, ...params }`.

```
Inkheaven form ──POST /api/bookings──▶ bookingProxy ──┐
                                                     ├──▶ n8n webhook ──▶ store ──▶ respond
Inkdesk UI ─────────POST (CORS)───────────────────────┘        ▲
                                                             └── reads back
```

## Import

n8n → **Workflows** → **Import from File** → `inkdesk-bookings.json` →
**Import**. It arrives inactive — activate it once both apps are configured.

Production URL: `https://n8n.example.com/webhook/inkdesk-booking`

## Point Inkheaven at it

Either:

**Settings panel in the browser** (local only) — open the gear in the
bottom-right, paste the webhook URL. This needs
`ALLOW_CLIENT_WEBHOOK_OVERRIDE=1` in the server env, and it is rejected
outright if the URL points at a private host (`localhost`, `127.0.0.1`,
`192.168.x.x`, …) — `bookingProxy.mjs` blocks those because the URL is
attacker-influenced on that path. So a **local** n8n will not work through the
settings panel; use a tunnel or the env var below.

**Server env** (how it should run in production) — in `inkheaven/.env`:

```
BOOKING_WEBHOOK_URL=https://n8n.example.com/webhook/inkdesk-booking
```

## Point Inkdesk at it

Inkdesk calls the webhook straight from the browser, so the workflow must send
CORS headers — the `Respond with CORS` node does that, which is why it exists.

Paste the **same URL** into Inkdesk → Settings → API endpoint, then use Test
connection (it sends `{ action: 'ping' }`). While the endpoint is empty Inkdesk
stays in demo mode with sample data.

## Storage

Records live in the workflow's own static data (`$getWorkflowStaticData`), so
there is no database and no credential to configure.

The trade-off: static data is tied to the workflow record. It survives restarts,
but **deactivating and reactivating the workflow, or importing a fresh copy over
it, resets the bookings**. For anything you care about, move the `Route Request`
store to a real backend — an n8n Data Table, Airtable/Supabase, or a Postgres
node. The response shapes do not change, so nothing downstream needs editing.

## Actions

Every response is `{ ok: true, data }` or `{ ok: false, error, message }`, which
is the envelope `inkdesk/src/lib/api.js` unwraps.

| Action | Params | Returns |
| --- | --- | --- |
| *(no action)* | booking fields | the created appointment |
| `ping` | — | `{ service, version }` |
| `list` | `params.status`, `params.scope`, `params.q` | `{ items }` |
| `clientHistory` | `params.q` (phone or email) | `{ items, count, client }` |
| `dashboard` | — | `{ counts, today, week, upcoming }` |
| `meta` | — | `{ blockedDates }` |
| `updateStatus` | `id`, `status` | the updated appointment |
| `reschedule` | `id`, `payload.date`, `payload.time` | the updated appointment |
| `saveNotes` | `id`, `notes` | the updated appointment |
| `addManual` | `payload` | the created appointment |
| `deleteAppointment` | `id` | `{ id }` |
| `blockDate` | `payload.date`, `payload.reason` | `{ date }` |
| `unblockDate` | `payload.date` | `{ date }` |

Bookings land as `status: 'new'`, `source: 'website'`. Manual entries added in
Inkdesk land as `status: 'confirmed'`, `source: 'manual'`.

Two details the workflow handles that are easy to miss:

- Inkheaven sends `date` as `dd-mm-yyyy`; Inkdesk compares dates against
  `yyyy-mm-dd`. The workflow normalises `dateIso` / `date` on the way in.
- The `company` honeypot field is answered with success and nothing is stored.

## Test

Submit a booking the way the site does:

```bash
curl -X POST https://n8n.example.com/webhook/inkdesk-booking \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Riya Sharma",
    "email": "riya@example.com",
    "phone": "9876543210",
    "description": "Blackwork sleeve, botanical.",
    "date": "15-11-2026",
    "dateIso": "2026-11-15",
    "time": "14:00",
    "budget": "high"
  }'
```

Expect `{"ok":true,"data":{"id":"APT-0001",…}}`.

Then read it back the way Inkdesk does — `text/plain` is what the app sends to
avoid a CORS preflight, so the workflow parses a string body too:

```bash
curl -X POST https://n8n.example.com/webhook/inkdesk-booking \
  -H "Content-Type: text/plain;charset=utf-8" \
  -d '{"action":"list","params":{"status":"all","scope":"upcoming"}}'
```

Expect `{"ok":true,"data":{"items":[{…}]}}`.

> Inkheaven's proxy allows 8s for the webhook (`UPSTREAM_TIMEOUT_MS`), so keep
> the workflow fast — it is a single Code node, which is comfortably inside that.