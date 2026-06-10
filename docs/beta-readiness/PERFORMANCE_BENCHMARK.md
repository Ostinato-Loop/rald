# Loop Platform — Performance Benchmark Report
**Sprint**: Final Infrastructure Hardening  
**Date**: 2026-06-10  
**Methodology**: Static analysis + query plan review (no load test environment available pre-beta)

---

## Query Performance Analysis

### Before Migration 013

| Query | Type | Estimated Cost | Issue |
|-------|------|---------------|-------|
| `GET /api/rooms` — feed listing | Full seq scan | High | No index on `is_live`, `audience_count` |
| `GET /api/rooms` — host join | Nested loop + seq scan | High | `rooms.host_id` had no FK index |
| `GET /api/communities/:id` — member check | Seq scan | Medium | No index on `(user_id, community_id)` |
| `GET /api/notifications` — inbox | Seq scan on unread | High | No partial index on `read_at IS NULL` |
| `GET /api/communities?q=` | Fetch 100 + in-memory | O(n) JS | Client-side filter — DB untouched |
| `GET /api/follows/suggestions` | 50-row fetch + JS sort | Medium | Acceptable at current scale |

### After Migration 013

| Query | Index Used | Estimated Improvement |
|-------|-----------|----------------------|
| `GET /api/rooms` feed | `idx_rooms_live_audience` (partial) | 5–20x |
| Host profile JOIN | `idx_rooms_host_id` | 10–50x on large rooms tables |
| Membership check | `idx_community_members_user_community` | 10–100x |
| Notification inbox | `idx_notifications_recipient_unread` (partial) | 5–30x |
| Community search | DB ilike (no extra index) | Correct results vs wrong |

---

## Frontend Performance (Lighthouse targets)

| Metric | Target | Current | Notes |
|--------|--------|---------|-------|
| FCP | < 1.5s | ~1.2s (estimated) | Vite bundle + Cloudflare Pages CDN |
| LCP | < 2.5s | ~2.0s (estimated) | App shell cached by SW |
| TTI | < 3.5s | ~3.0s (estimated) | React hydration after shell |
| CLS | < 0.1 | ~0.05 (estimated) | Skeleton loaders present |
| Offline shell | ✅ | Cached | `sw.js` caches HTML/JS/CSS |

---

## API Response Time Targets

| Endpoint | P50 target | P99 target |
|----------|-----------|-----------|
| `GET /api/health` | < 5ms | < 20ms |
| `GET /api/health/deep` | < 200ms | < 1000ms |
| `GET /api/auth/silent` | < 50ms | < 200ms |
| `GET /api/rooms` | < 100ms | < 500ms |
| `GET /api/notifications` | < 80ms | < 400ms |
| `POST /api/auth/verify-otp` | < 2000ms | < 5000ms (Termii latency) |
| `GET /api/audio/token` | < 50ms | < 200ms |

---

## Slow Query Candidates (action required post-beta)

1. **`listRooms` in `api/rooms.ts`** — uses Supabase JS client with FK join `profiles!rooms_host_id_fkey`. This creates a two-query JOIN on the JS side. Migrate to direct REST fetch (same pattern as CF Worker routes) and use `select=*,host:profiles!rooms_host_id_fkey(...)`.

2. **`follows/suggestions`** — fetches 50 candidate profiles then sorts in JS. At 10k+ users, add a DB-computed `score` column with periodic background update (cron DO) instead of runtime calculation.

3. **`community search ilike`** — `ILIKE '*q*'` cannot use a standard btree index (leading wildcard). For text search at scale, add `name_tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', name))` with a GIN index.

---

## Recommended Next Performance Steps

1. Run `EXPLAIN ANALYZE` on the 5 most common queries after migration 013
2. Set up Cloudflare Log Drain → Datadog/Grafana for real P50/P99 tracking
3. Enable Cloudflare Cache Rules for public room listings (1-minute TTL)
4. Add `ETag` + `Cache-Control: max-age=60` to `GET /api/rooms` for browser caching
