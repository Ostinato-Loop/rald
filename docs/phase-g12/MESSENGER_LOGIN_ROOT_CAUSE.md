# MESSENGER LOGIN ROOT CAUSE
**Date:** 2026-06-03 | **Phase:** G.12 | **Status:** ROOT CAUSE IDENTIFIED & FIXED

## Root Cause

The `deploy-api.yml` workflow deployed the Cloudflare Worker successfully but **never pushed `SUPABASE_SERVICE_ROLE_KEY` or `RALD_JWT_SECRET` to the deployed worker**.

Both secrets existed in GitHub repo secrets. Neither reached the CF Worker.

## Evidence

```
# Worker alive (CORS preflight works):
OPTIONS https://messenger.rald.cloud/health → 204

# Every route crashes:
GET  https://messenger.rald.cloud/health         → 500 {"error":"Internal server error"}
POST https://messenger.rald.cloud/auth/rald-sso  → 500 {"error":"Internal server error"}
POST https://messenger.rald.cloud/conversations  → 500 {"error":"Internal server error"}
```

## Root Cause Chain

1. `deploy-api.yml` ran — CI reported ✅ success (worker deployed)
2. `SUPABASE_SERVICE_ROLE_KEY` was in GitHub repo secrets ✅
3. `RALD_JWT_SECRET` was NOT in GitHub repo secrets ❌
4. `deploy-api.yml` only pushed: TERMII_API_KEY, API_ORIGIN, VAPID_* — nothing else
5. `SUPABASE_SERVICE_ROLE_KEY` sat in GitHub, never pushed to CF Worker
6. `dbMiddleware` in `src/lib/middleware.ts` runs on EVERY request:
   `createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)`
   — `c.env.SUPABASE_SERVICE_ROLE_KEY === undefined`
7. `@supabase/supabase-js` v2 throws TypeError on undefined key
8. `app.onError` → `{"error":"Internal server error"}`
9. **Result: 100% 500 on every endpoint, including /health**

## Fix Applied

Rebuilt `messenger/.github/workflows/deploy-api.yml` to explicitly push:
```yaml
- name: Push SUPABASE_SERVICE_ROLE_KEY to worker
  run: echo "$SUPABASE_SERVICE_ROLE_KEY" | npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY

- name: Push RALD_JWT_SECRET to worker
  run: echo "$RALD_JWT_SECRET" | npx wrangler secret put RALD_JWT_SECRET
```

Added `RALD_JWT_SECRET` to messenger GitHub repo secrets.

## Lesson

**CI/CD ✅ success means the code deployed — it does NOT mean the secrets were pushed.**
Always verify: (a) deploy workflow explicitly pushes each required secret, (b) those secrets exist in GitHub.
The `/ready` or `/health` endpoint is the true production health signal — not CI status.
