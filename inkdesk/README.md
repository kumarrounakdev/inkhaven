# InkDesk Admin

Standalone React 19 + Vite app. Same design tokens as the marketing site
(Bodoni Moda + Manrope, self-hosted woff2 in `public/fonts/`). No router, no state library.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5174
```

First run is in **demo mode** (sample data, nothing leaves the browser).

## Connect your n8n workflow

The app talks to a single n8n **Webhook** node. Create a workflow with a
`POST` webhook, activate it, then open the app → **Settings** → paste the
production URL (`https://<host>/webhook/<path>`) → **Test connection** →
**Save & reload**.

The URL is stored per-browser. For a deployed build, bake it into
`src/lib/config.js`
(`export const API_URL = 'https://n8n.example.com/webhook/inkdesk'`) instead.

### Request

Every call is a `POST` with `Content-Type: text/plain;charset=utf-8` and a
JSON body. `text/plain` keeps it a CORS *simple* request, so the browser
never sends an `OPTIONS` preflight the workflow would have to answer.

```json
{ "action": "list", "params": { "q": "", "status": "all", "scope": "upcoming" } }
```

Actions the app sends:

| action | payload |
| --- | --- |
| `ping` | — |
| `list` | `params: { q, status, scope }` |
| `clientHistory` | `params: { q, status, scope }` |
| `dashboard` | — |
| `meta` | — |
| `updateStatus` | `id`, `status` |
| `reschedule` | `id`, `payload: { date, time, note? }` |
| `saveNotes` | `id`, `notes` |
| `addManual` | `payload: { …appointment fields }` |
| `deleteAppointment` | `id` |
| `blockDate` | `payload: { date, reason }` |
| `unblockDate` | `payload: { date }` |

### Response

Either the `{ ok, data }` envelope or a bare payload both work — the app
unwraps whichever it gets.

```json
{ "ok": true, "data": { "items": [ /* appointments */ ] } }
{ "ok": false, "error": "validation", "message": "Date is required." }
```

Expected `data` per action: `list` → `{ items }`, `clientHistory` →
`{ items, count, client }`, `dashboard` → `{ counts, upcoming, week, today }`,
`meta` → `{ blockedDates }`, everything else → `{}`.

Appointment objects use `id`, `date`, `time`, `status`, `name`, `email`,
`phone`, `style`, `placement`, `size`, `description`, `budget`,
`admin_notes`, `source`, `created_at`, `updated_at`.

`clientHistory` matches on phone or email — strip spaces, punctuation and
country code on both sides before comparing, or a lookup for
`+91 90000 00000` will miss a search for `9000000000`.

### CORS

The browser will hide the response unless the workflow sends
`Access-Control-Allow-Origin: *`. Add it on the **Respond to Webhook** node
(response headers), e.g.:

```json
{ "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS" }
```

Enable **Raw Body** on the Webhook node so the JSON string lands in `body`,
then route on `body.action` (a Switch node keyed on that field).

## Build & deploy

```bash
npm run build      # → dist/
```

- **Netlify** — drag `dist/` into https://app.netlify.com/drop. Done.
- **Vercel** — `vercel` from this folder (framework preset: Vite, output `dist`).
- **GitHub Pages** — push, then use the `dist/` folder as the Pages source.

Add `<meta name="robots" content="noindex">` is already in `index.html` — keep it.

## Structure

```
src/
├── App.jsx                  # renders Appointments
├── screens/
│   └── Appointments.jsx     # stats, filters, table, drawer, modals
├── components/
│   ├── ApptDetail.jsx       # drawer content: brief, notes, actions
│   ├── RescheduleModal.jsx  # new date/time + optional client note
│   ├── AddManualModal.jsx   # walk-in / phone bookings
│   ├── SettingsModal.jsx    # n8n webhook URL + connection test
│   ├── Modal / StatusBadge / Toast
└── lib/
    ├── api.js               # fetch layer (text/plain POST — CORS-simple)
    ├── mock.js              # demo-mode backend, same contract as the workflow
    ├── config.js            # API_URL (empty = demo mode)
    ├── constants.js         # statuses, styles, scopes, labels
    ├── storage.js           # localStorage shim (sandbox/private-mode safe)
    └── utils.js             # date/time formatting helpers
```
