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
there is no database to run and nothing to migrate. Email is the one credential
in play, and it belongs to the `Send Email` node rather than to the store.

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
| `suggestSlots` | `params.from` (the appointment's date) | `{ items: [{ date, time }] }` |
| `updateStatus` | `id`, `status` | the updated appointment |
| `reschedule` | `id`, `payload.options`, `payload.note` | the updated appointment |
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

## Customer email

The Code node has **one** output, so `Route Request` returns a single item and the
`notify` payload rides along on it. Both the reply and the mail branch hang off
that one output:

```
Bookings Webhook → Route Request ──┬─ → Respond with CORS        (always — the API reply)
                                   └─ → Email queued?           (gate)
                                          │
                                          ├─ yes → Which email? ─┬─ confirmation → Email: Confirmation
                                          │                      └─ anything else → Email: Reschedule
                                          └─ no  → (branch ends)
```

| Branch | Goes to | When |
| --- | --- | --- |
| reply | `Respond with CORS` | always — this is the API reply |
| mail | `Email queued?` → `Which email?` | only when `notify` is present on the item |

The one item looks like this:

```jsonc
{
  "status": 200,                    // HTTP status for Respond with CORS
  "body":    { "ok": true, "data": {} },
  "notify":  { "kind": "…", "to": "…", "subject": "…", "html": "…" }  // absent when nothing to send
}
```

`Email queued?` exists only because a Code node cannot return one item per
output — it tests `{{ $json.notify.to }}` *is not empty* and stops the branch when
there is no mail. `Respond with CORS` is listed **first** on the connection so the
browser gets its reply before any SMTP work begins, and both `Email:` nodes are set
to *continue on error*, so a bad password or a full mailbox can never delay or
fail a booking request.

`notify` is never sent to the browser: `Respond with CORS` serialises only
`$json.body`.

> Do not try to restore a second output on `Route Request`. n8n's Code node
> declares `outputs: [main]` and its runner returns a flat `INodeExecutionData[]`;
> a second connection is silently dropped on import and the downstream node shows
> *no input connected*.

### Telling the emails apart

Every queued email carries a `kind`, and `Which email?` routes on it:

| `kind` | Sent by | Meaning |
| --- | --- | --- |
| `confirmation` | `Email: Confirmation` | the studio confirmed a booking |
| `reschedule` | `Email: Reschedule` | the studio offered alternative times |
| `unavailable` | `Email: Reschedule` | the customer asked for a slot the studio cannot honour |

There are two `Email:` nodes but three kinds: `reschedule` and `unavailable` are
both "pick a different time" messages with the same call to action, so they share
a node and therefore a single SMTP credential. A third kind that needs its own
copy would want its own node.

The item on the mail branch looks like this, and `kind` is visible in the
execution log — so a send stays identifiable after the fact:

```json
{
  "notify": {
    "kind": "confirmation",
    "to": "riya@example.com",
    "toName": "Riya Sharma",
    "appointmentId": "APT-0001",
    "subject": "Your Inkheaven booking is confirmed — APT-0001",
    "html": "<!doctype html>…"
  }
}
```

Anything unrecognised falls through to `Email: Reschedule` rather than being
dropped, so a kind added later still gets delivered instead of vanishing.

The API response carries `emailQueued` and `emailKind` so Inkdesk can say *which*
email was queued, not merely that one was. Inkdesk still cannot know whether n8n
actually delivered it.

**Adding a kind** (a cancellation notice, say): add it to `EMAIL_KINDS` at the top
of `Route Request`, set `kind` on the builder that produces it, and add a branch
to `Which email?` only if it needs its own copy. Nothing else needs touching.

| Trigger | `kind` |
| --- | --- |
| `updateStatus` → `confirmed` | `confirmation` |
| `reschedule` with `payload.options` | `reschedule` |
| website intake asking for an unbookable slot | `unavailable` |

A booking that arrives on an available slot is **not** emailed. It only reaches
the studio as `new`, and not every enquiry is one you want to answer —
confirming it is the deliberate moment.

### Unavailable slots

`slotProblem` is the single definition of "the studio cannot take this", and it
returns the reason or `null`:

| Reason | Message |
| --- | --- |
| not a real date | `We could not read that date.` |
| in the past | `That date has already passed.` |
| closed day | `The studio is closed on Sundays.` |
| blocked in Settings | `The studio has blocked Wed, 14 Oct 2026.` |
| outside opening hours | `We are only open Mon–Sat · 11:00 AM – 6:00 PM.` |
| already booked | `Mon, 02 Nov 2026 at 3:00 PM is already booked.` |

When it fires, the customer is emailed the reason plus three real alternatives
drawn from the same engine the reschedule offer uses. Two decisions are worth
knowing:

- **The enquiry is never dropped.** It is stored with the date the customer
  actually asked for, so losing a real lead because a date picker offered a
  Sunday would be the wrong trade. It is also flagged `slot_request_issue` and
  gets an `admin_notes` line naming the date they asked for and why it failed,
  because the dashboard shows the date but not why that date is a problem.
- **The check runs before the record is stored.** Once it exists, `slotTaken`
  would find this very booking and report every request as a clash.

Both flags are **stored, not just returned** — read them back from `list`, not
from the intake response. `unavailableReply` writes to the record first and the
response is cloned from it, so the two can never drift apart.

Answering a reschedule offer through the website form is checked too. If the
customer types a slot the studio cannot take, the offer is left **open** and they
are sent alternatives, rather than the booking silently moving to a Sunday.
`slotTaken` takes an `exceptId` so re-picking the slot they already hold is not
mistaken for a clash.

Once a slot *is* honoured, a stale flag is deleted from the record — otherwise a
confirmed Monday would still read as a live problem. The `admin_notes` trail
keeps the history, and a second refusal of the same booking appends rather than
overwriting it.

The response gains `slot_request_issue`, `suggested_slots`, `emailQueued` and
`emailKind`. Inkdesk can surface those; the workflow does not depend on it.

### The email template

Both emails are built by helpers in `Route Request`, above the dispatch section:

| Helper | Job |
| --- | --- |
| `shell` | the whole document: `<head>`, header band, body slot, footer |
| `preheader` | the hidden line an inbox shows next to the subject |
| `whenBlock` | the date/time card, promoted out of the detail table |
| `details` | the remaining facts as a quiet hairline table |
| `quote` | a studio note or the reason a slot is unavailable, as a pull-quote |
| `slotCard` | one numbered alternative time |
| `button` + `fallbackLink` | the call to action, plus the raw URL behind it |
| `hoursLabel` | footer hours, derived from `STUDIO.weekdays`/`STUDIO.hours` |

The palette in `T` is lifted from the site theme (`ink` `#0b0e11`, steel-blue
`accent`), so a confirmation looks like it came from Inkheaven. Display type is
Georgia standing in for the site's Bodoni Moda, which no mail client can load.

Four constraints are load-bearing. Breaking one degrades the mail in real
inboxes rather than failing a test, so the suite guards them explicitly:

- **No `font:` shorthand.** Outlook runs a Word rendering engine that ignores the
  shorthand and would fall back to Times New Roman at the wrong size. Every rule
  spells out `font-family`, `font-size`, `font-weight` and `line-height`.
- **Inline styles only.** Gmail and Outlook strip `<style>` and classes. The one
  `<style>` block is a mobile media query that layers on top with `!important`,
  so desktop never depends on it.
- **Layout is tables.** `role="presentation"`, `cellpadding="0"`, `cellspacing="0"`.
- **Escaping is mandatory.** `name`, `description` and the reschedule `note` are
  attacker-controlled and land in HTML here. Everything interpolated goes through
  `esc()`, including anything inside an attribute.

`color-scheme` is pinned to `light` so a dark-mode client cannot invert the ink
header band, and `-webkit-text-size-adjust:100%` stops iOS inflating the type.

`STUDIO` supplies the personalisation — `name`, `city`, `fromName`, `bookingUrl`.
The footer hours are *computed* from `weekdays` and `hours`, so the email cannot
advertise times the booking form no longer offers.

### Before the first send: the SMTP credential

Both `Email:` nodes ship with a placeholder credential ID
(`REPLACE_WITH_YOUR_SMTP_CREDENTIAL_ID`). Nothing sends until you replace it, in
both nodes:

1. In n8n: **Credentials** → **Add credential** → **SMTP**.
2. Host/port/user/password from your mail provider (Gmail needs an App Password,
   not your account password).
3. Open `Email: Confirmation` and `Email: Reschedule` and pick the credential on
   each.
4. Check the **From Email** on both (`kumarrounak.dev@gmail.com`) matches the
   address your provider has verified. Most providers silently drop mail from an
   unverified From.

**No password is ever written into this file or the repo.** The credential lives
in n8n's encrypted store, which is the only place it should exist.

### Slot suggestions

`suggestSlots` and the reschedule offer both draw from the same engine: opening
hours are Mon–Sat 11:00–18:00. They, plus `city` and `fromName` in the email
footer, live in `STUDIO` at the top of `Route Request` — one place to edit when the
studio changes them. Suggestions give one slot per day so the client gets three
genuinely different days, skipping Sundays, blocked dates and times an active
appointment already holds. Nothing is ever offered before the date the client
originally asked for.

## How a reschedule offer closes

The client answers through the ordinary Inkheaven booking form — the email links
to `http://localhost:5173/#booking`. The form carries no appointment ID, so the
workflow matches the submission against any appointment still marked
`awaiting_customer` by email or phone. On a match it updates **that** record
instead of creating a duplicate: new date and time applied, status `confirmed`,
offer cleared, and an admin note explaining what happened.

If the client is answering someone else's booking, or the match is wrong, it
lands as a normal new booking and you can merge by hand.

## Re-importing

Importing this file over an existing workflow **resets the bookings** — the
store lives in the workflow's static data. Export your current bookings first if
you have any.

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

Offer the client some new times, the way the Reschedule dialog does:

```bash
curl -X POST https://n8n.example.com/webhook/inkdesk-booking \
  -H "Content-Type: text/plain;charset=utf-8" \
  -d '{"action":"suggestSlots","params":{"from":"2026-11-15"}}'
# {"ok":true,"data":{"items":[{"date":"2026-11-16","time":"11:00"},…]}}

curl -X POST https://n8n.example.com/webhook/inkdesk-booking \
  -H "Content-Type: text/plain;charset=utf-8" \
  -d '{"action":"reschedule","id":"APT-0001","payload":{"note":"Away that week.","options":[{"date":"2026-11-16","time":"11:00"}]}}'
```

Expect the appointment back with `awaiting_customer: true`, `proposed_slots`,
`emailQueued: true` and `emailKind: 'reschedule'` — and check the execution log
to confirm `Email: Reschedule` ran.

> Inkheaven's proxy allows 8s for the webhook (`UPSTREAM_TIMEOUT_MS`), so keep
> the workflow fast — it is a single Code node, which is comfortably inside that.