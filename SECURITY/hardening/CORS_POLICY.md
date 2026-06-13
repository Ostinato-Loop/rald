# RALD Ecosystem — CORS Policy

**Document:** CORS_POLICY.md  
**Status:** Enforced — Production  
**Owner:** LILCKY STUDIO LIMITED  
**Last Updated:** 2026-06-13

---

## Overview

All RALD services enforce an explicit origin allowlist. Wildcard (`*`) origins are **never** used in production. Dynamic origin reflection is permitted only when the reflected origin appears in the static allowlist.

---

## Current Implementation

### rald-auth-core (auth.rald.cloud)

Uses Hono `cors()` middleware with `origin: (origin) => isAllowedOrigin(origin) ? origin : null`.

**Allowed origins (static set):**

```
https://profiles.rald.cloud
https://credentials.rald.cloud
https://app.rald.cloud
https://learn.rald.cloud
https://rald.cloud
https://auth.rald.cloud
https://admin.rald.cloud
https://control.rald.cloud
https://console.rald.cloud
https://sdk.rald.cloud
https://sv.rald.cloud
https://silicon.rald.cloud
https://loop.rald.cloud
https://messenger.rald.cloud
https://chat.rald.cloud
https://inbox.rald.cloud
https://pay.rald.cloud
https://payrald.rald.cloud
https://duna.rald.cloud
https://git.rald.cloud
https://analytics.rald.cloud
https://business.rald.cloud
https://ostloop.name.ng
https://identity.rald.cloud
https://rald-identity.pages.dev
https://rald-auth-ui.pages.dev   (deprecated — redirects only)
https://rald-app.pages.dev
https://rald-control-center.pages.dev
```

**Pattern-matched origins:**
- `https://*.replit.app` — development preview environments
- `https://*.replit.dev` — development preview environments

**Development origins (non-production only):**
- `http://localhost:5173`
- `http://localhost:3000`
- `http://localhost:4173`

### loop-worker (loop.rald.cloud)

Uses custom CORS middleware resolving from `CORS_ORIGIN` env var (comma-separated), falling back to a hardcoded production allowlist. Wildcard `*` is rejected for credentialed requests per CORS spec (§3.2.3).

---

## Rules

1. **No wildcard origins** — `Access-Control-Allow-Origin: *` is never emitted for credentialed requests.
2. **No dynamic reflection** — an origin is only reflected if it appears in the static allowlist or matches the Replit pattern.
3. **Credentials require explicit origin** — `Access-Control-Allow-Credentials: true` is only set when origin is not `*`.
4. **Production domains only in production** — localhost origins are blocked in production deployments (enforced via `ENVIRONMENT` binding).
5. **All new RALD subdomains must be added to the allowlist** before going live.

---

## Adding a New Trusted Origin

1. Add the domain to `STATIC_ORIGINS` in `rald-auth-core/src/index.ts`
2. Add the domain to `PRODUCTION_ALLOWLIST` in `loop/artifacts/cloudflare-worker/src/middleware/cors.ts`
3. Add the domain to the allowlist of all other affected services (messenger, rald-identity, etc.)
4. Deploy all affected workers
5. Update this document

---

## Allowed Headers

```
Authorization
Content-Type
X-Request-ID
X-App-ID
```

## Allowed Methods

```
GET, POST, PUT, PATCH, DELETE, OPTIONS
```

---

## Audit Log

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Initial CORS policy document | RALD Security Hardening Program |
| 2026-06-07 | Fixed credentials + wildcard origin bug in loop-worker | COOKIE-001 |
| Pre-existing | rald-auth-core: explicit allowlist enforced | LILCKY STUDIO |

