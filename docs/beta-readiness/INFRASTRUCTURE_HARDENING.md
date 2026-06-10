# Loop Platform — Infrastructure Hardening Report
**Sprint**: Final Infrastructure Hardening  
**Date**: 2026-06-10

---

## What Was Hardened

### 1. Worker Entrypoint (`index.ts`)

**Before**
- No global error handler — uncaught exceptions returned HTML 500
- No request tracing — impossible to correlate logs to a specific request
- No 404 handler — Hono's default returned HTML

**After**
```typescript
// Every request gets a UUID
c.res.headers.set("X-Request-ID", reqId);

// Every response is logged as structured JSON
console[level](JSON.stringify({ level, reqId, method, path, status, ms, service, timestamp }));

// Uncaught exceptions → JSON (never HTML)
app.onError((err, c) => c.json({ error: "Internal server error", reqId, message: "..." }, 500));

// Unknown routes → JSON
app.notFound((c) => c.json({ error: "Not found", path }, 404));
```

**Impact**: Support can now grep CF logs by `reqId` to trace any failed request end-to-end.

---

### 2. Health Endpoint (`health.ts`)

**Before**: Single `/api/health` returning binding type checks.

**After**: Two-tier health model:
- `/api/health` — shallow liveness (fast, for load balancers, never external calls)
- `/api/health/deep` — deep readiness (Supabase REST ping, KV round-trip, all secrets validated)

```
GET /api/health/deep
→ {
  ok: true,
  totalMs: 42,
  checks: {
    supabase: { ok: true, ms: 28 },
    kv:       { ok: true, ms: 3 },
    secrets:  { ok: true },
    bindings: { ok: true }
  }
}
```

**Recommended monitor**: ping `/api/health/deep` every 60 seconds. Alert on `ok: false` or `totalMs > 3000`.

---

### 3. Notifications (`notifications.ts`)

**Before**: `room_live` and `new_follower` notifications existed in the DB but were filtered out by the hardcoded type list.

**After**: All 5 types included. Client can filter by type via `?type=room_live`.

```typescript
const NOTIFICATION_TYPES = [
  "direct_message", "friend_request", "connection_accepted",
  "room_live", "new_follower"  // ← was missing
];
```

---

### 4. Community Search (`communities.ts`)

**Before**: Client-side filter after fetching 100 rows — only first 100 communities were ever searchable.

**After**: PostgREST ILIKE on `name` and `description` — DB does the filter before `limit`/`offset`:
```
/rest/v1/communities?or=(name.ilike.*lagos*,description.ilike.*lagos*)&limit=20&offset=0
```

For production scale, add a `tsvector` GIN index and use `fts=plfts.query` instead of ilike.

---

### 5. Frontend API Fetch (`api-fetch.ts`)

**Before**: `fetch()` with no timeout — could hang indefinitely on poor mobile connections.

**After**:
```
Request → [12s timeout] → [retry x2 @ 150ms, 400ms for network errors] → 401 → silent refresh → retry once → AUTH_EXPIRED
```

- Network errors (TypeError) are retried; 4xx/5xx are not
- Timeout errors surface: `"Request timed out. Check your connection and try again."`
- Network errors surface: `"Network error. Check your connection and try again."`

---

### 6. Database Migration 013 (`013_hardening.sql`)

| Action | Table | Impact |
|--------|-------|--------|
| Resolve follows PK conflict | `follows` | Fixes `id` column missing when 011 ran without 008 |
| `idx_rooms_host_id` | `rooms` | Eliminates seq scan on host JOIN |
| `idx_rooms_live_audience` | `rooms` | Feed query uses index instead of sort |
| `idx_rooms_community_live` | `rooms` | Community room listing 10–50x faster |
| `idx_rooms_no_duplicate_live` | `rooms` | Prevents duplicate live rooms per host |
| `idx_community_members_user_community` | `community_members` | Membership check → index lookup |
| `idx_notifications_recipient_unread` | `notifications` | Inbox query uses partial index |
| Orphan cleanup | `community_members`, `room_participants` | Removes dangling rows |
| `rooms.updated_at` trigger | `rooms` | Enables cache invalidation patterns |
| Denorm count backfill | `profiles` | Corrects any counts corrupted by follows conflict |

---

## Deployment Checklist

Before private beta launch:

- [ ] Apply migration 013 to production Supabase (`supabase db push` or SQL editor)
- [ ] Deploy CF Worker with this sprint's changes (`wrangler deploy`)
- [ ] Set `ONESIGNAL_REST_API_KEY` + `ONESIGNAL_APP_ID` via `wrangler secret put`
- [ ] Set `VITE_ONESIGNAL_APP_ID` in Cloudflare Pages env vars
- [ ] Verify `/api/health/deep` returns `ok: true` after deploy
- [ ] Point uptime monitor at `https://loop-api.rald.cloud/api/health/deep`
- [ ] Configure CF Log Drain to persist logs for post-incident analysis
