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
**Import**.

## Publish it — this is the step that makes it "keep running"

An imported workflow is a **draft**. Until you publish/activate it, the
production URL `/webhook/inkdesk-booking` returns **404** and the only thing
that answers is `/webhook-test/inkdesk-booking`, which lives only while the
editor tab is open. That is the whole reason it looks like it "stops after one
request": the test URL dies with the tab, and the real URL was never live.

Open the workflow and click **Publish** (n8n 2.38+) or toggle **Active**
(older versions). Confirm the production URL works:

```bash
curl -X POST http://localhost:5678/webhook/inkdesk-booking \
  -H "Content-Type: text/plain;charset=utf-8" \
  -d '{"action":"ping"}'
# {"ok":true,"data":{"service":"inkdesk-api (n8n)","version":1}}
```

Two more things that look like the same bug:

- **Editing a published workflow reopens a draft.** Until you publish the edit,
  the live version keeps running the old code. Publish again after changing
  anything.
- **Static data is only written for live executions.** While you were testing
  in the editor, bookings appeared to vanish between runs — n8n does not save
  static data for manual/test executions. Once published, they persist.

From the CLI, the equivalent is `n8n publish:workflow --id=<id>`, but note it
warns that changes do not apply until n8n restarts.

## Point Inkheaven at it

Paste the webhook URL into the site itself: gear icon, bottom-right → paste the
URL → Save. It is stored in that browser and sent with every booking, so a
localhost n8n works:

```
http://localhost:5678/webhook/inkdesk-booking
```

`BOOKING_WEBHOOK_URL` in `inkheaven/.env` is only a fallback for browsers with
nothing saved, so you can leave `.env` alone entirely.

Because the URL is client-supplied, anyone who can reach the site can point the
proxy anywhere it likes. Fine for local or private-network use; put an
authenticated hop in front before exposing it publicly.

## Point Inkdesk at it

Inkdesk calls the webhook straight from the browser, so the workflow must send
CORS headers — the `Respond with CORS` node does that, which is why it exists.

Paste the **same URL** into Inkdesk → Settings → API endpoint, then use Test
connection (it sends `{ action: 'ping' }`). While the endpoint is empty Inkdesk
stays in demo mode with sample data.

## Storage

Records live in the workflow's own static data (`$getWorkflowStaticData`), so
there is no database and no credential to configure.

The trade-off: static data is tied to the workflow record. It survives restarts
and repeated executions, but **deactivating and reactivating the workflow, or
importing a fresh copy over it, resets the bookings**. For anything you care
about, move the `Route Request` store to a real backend — an n8n Data Table,
Airtable/Supabase, or a Postgres node. The response shapes do not change, so
nothing downstream needs editing.

If n8n runs in Docker without a volume on `~/.n8n`, the database itself is lost
when the container is recreated. Bind-mount it before this matters:

```yaml
volumes:
  - n8n_data:/home/node/.n8n
```

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