# LOOP LOGIN ROOT CAUSE
**Date:** 2026-06-03 | **Phase:** G.12 | **Status:** ROOT CAUSE IDENTIFIED & FIXED

## Root Cause

`loop-api` Cloudflare Worker was deployed but had **no `[[routes]]` block in `[env.production]`** in `wrangler.toml`.

The worker existed at Cloudflare but was not attached to any domain.

## Evidence

```
# Worker alive but no routes:
OPTIONS https://loop-api.rald.cloud/health → 204 (CORS OK)
GET     https://loop-api.rald.cloud/health → 404 {"error":"Not found","path":"/health"}
GET     https://loop-api.rald.cloud/api/*  → 404 on every path
```

## Root Cause Chain

1. `wrangler.toml` had `[env.production]` with all bindings (D1, KV, R2, Durable Objects, AI)
2. **BUT no `[[env.production.routes]]` block**
3. Wrangler v4: named envs do NOT auto-inherit top-level routes
4. Worker deployed as orphan — not attached to loop-api.rald.cloud
5. Frontend built with `VITE_API_BASE_URL: https://loop-api.rald.cloud` — every API call 404

## Fix Applied

Added to `artifacts/cloudflare-worker/wrangler.toml`:
```toml
[[env.production.routes]]
pattern   = "loop-api.rald.cloud/*"
zone_name = "rald.cloud"
```

Also added to `deploy.yml`: explicit `wrangler secret put` for RALD_JWT_SECRET, LOOP_JWT_SECRET, SUPABASE_SERVICE_ROLE_KEY.

## Lesson

**Every Cloudflare Worker wrangler.toml that uses named environments MUST explicitly declare `[[env.production.routes]]`.**
Named environments do not inherit top-level `[[routes]]`.
