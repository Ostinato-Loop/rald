# Loop Platform — Critical Issues Report
**Sprint**: Final Infrastructure Hardening  
**Date**: 2026-06-10  
**Status**: All CRITICAL + HIGH issues resolved in this sprint

---

## CRITICAL Issues (resolved ✅)

### CRIT-001 — No global error handler in CF Worker
- **Risk**: Unhandled exceptions return a 500 HTML page — completely unusable by API clients. Any uncaught `throw` in a route handler produces an HTML response that the frontend cannot parse.
- **Fix**: Added `app.onError()` in `index.ts` — all uncaught errors now return `{ error, reqId, message }` JSON.
- **Commit**: `feat(hardening): global error handler...`
- **Status**: ✅ RESOLVED

### CRIT-002 — Migration numbering conflict (008 and 011 both define the follows table)
- **Risk**: `008_follows.sql` creates `public.follows` with UUID primary key + triggers. `011_follows.sql` also runs `CREATE TABLE IF NOT EXISTS follows` with a composite PK. If applied in sequence: the 011 table creation is skipped (IF NOT EXISTS), but there is no guarantee both ran in every environment. On any environment where only 011 ran, the `id` column is missing, breaking `follows.ts` routes.
- **Fix**: Migration `013_hardening.sql` normalises the table: adds `id` column if missing, ensures unique constraint exists regardless of which migration ran first.
- **Status**: ✅ RESOLVED

### CRIT-003 — room_live and new_follower notifications never returned to clients
- **Risk**: Push notification types `room_live` and `new_follower` were added to the DB schema (009_push_subscriptions.sql) but `notifications.ts` hardcoded `.in("type", ["direct_message","friend_request","connection_accepted"])` — these two types were silently invisible in the notification inbox. Users never saw "X started following you" or "Room is live" notifications.
- **Fix**: Updated `notifications.ts` to include all 5 types. Added `type` query param so clients can filter by a single type.
- **Status**: ✅ RESOLVED

---

## HIGH Issues (resolved ✅)

### HIGH-001 — Community text search was client-side
- **Risk**: `GET /api/communities?q=lagos` fetched the first 100 communities, then filtered in-memory. Any result beyond position 100 was never searchable. The search result set was also unsorted by relevance.
- **Fix**: Moved to PostgREST ILIKE: `&or=(name.ilike.*q*,description.ilike.*q*)`. DB does the filter before the limit/offset — correct pagination and full-corpus search.
- **Status**: ✅ RESOLVED

### HIGH-002 — Health endpoint was shallow
- **Risk**: `/api/health` only checked binding type presence (`typeof c.env.DB !== "undefined"`). A misconfigured Supabase URL, wrong service key, or missing ONESIGNAL_REST_API_KEY would return `ok: true` while the app was functionally broken.
- **Fix**: Added `/api/health/deep` — pings Supabase REST, writes/reads KV, validates all required secrets. Returns `503` if any check fails.
- **Status**: ✅ RESOLVED

### HIGH-003 — api-fetch.ts had no timeout
- **Risk**: On poor mobile connections, `fetch()` can hang indefinitely. Any stalled request would block the UI forever — no spinner timeout, no error shown to user.
- **Fix**: Added 12-second `AbortController` timeout via `fetchWithTimeout()`. Added 2-retry exponential backoff for network-level errors (not 4xx/5xx). Timeout errors now surface a clean user-facing message.
- **Status**: ✅ RESOLVED

### HIGH-004 — Missing performance indexes
- **Risk**: `rooms.host_id` had no index — every room listing JOIN did a full seq scan. `community_members(user_id, community_id)` had no composite index — membership checks for every community detail view were slow. `notifications(recipient_id)` partial index on `read_at IS NULL` was missing.
- **Fix**: Migration 013 adds 7 targeted indexes.
- **Status**: ✅ RESOLVED

---

## MEDIUM Issues (tracked, not blocking beta)

| ID | Issue | Owner | Target |
|----|-------|-------|--------|
| MED-001 | Room CRUD incomplete — no `DELETE /api/rooms/:id` to end a room | Backend | Sprint after beta |
| MED-002 | LiveKit token (4hr) has no refresh path — client must rejoin on expiry | Audio | Sprint after beta |
| MED-003 | Durable Object `RoomSession` is scaffold only — no real presence state | Backend | Sprint after beta |
| MED-004 | Rate limiting absent on community create/join routes | Backend | Sprint after beta |
| MED-005 | `push_subscriptions` table is now obsolete (OneSignal) but still exists | DB | Post-beta cleanup |
| MED-006 | No metrics dashboard (CF Log Drain not configured) | Ops | Pre-public launch |

---

## LOW Issues (backlog)

- `009_push_subscriptions.sql` creates VAPID-specific columns (`endpoint`, `p256dh`, `auth`) now unused
- CORS allowlist missing `*.loop.rald.cloud` subdomain pattern for future edge deployments
- `room_messages` has no cleanup policy — old messages accumulate indefinitely
- No request body size limit on POST routes — potential for large payload abuse
