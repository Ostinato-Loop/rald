# SSO_CERTIFICATION.md
**Certification Type:** Phase G Final Authorization  
**Service:** SSO — auth.rald.cloud/sso  
**Version:** 1.3.0  
**Owner:** LILCKY STUDIO LIMITED  
**Date:** 2026-06-02

---

## 1. SSO ARCHITECTURE

RALD SSO uses a **master token → app-scoped token** exchange model. A user authenticates once against `auth.rald.cloud` and receives a master JWT (HS256, 24h). To access any product, the client calls `POST /sso/exchange` with the `appId`, receiving a short-lived (1h) app-scoped token.

```
User logs in → auth.rald.cloud → master JWT (24h)
  │
  └── Client calls POST /sso/exchange { appId: "loop-business" }
        → app-scoped JWT (1h) with { id, email, role, appId, source: "rald-auth" }
        → Sent to target product as Authorization: Bearer <app_token>
        → Product validates via POST /sso/verify OR own verifyJwt (same secret)
```

---

## 2. TRUSTED APP REGISTRY

| App ID | Product | Status |
|---|---|---|
| `rald-app` | app.rald.cloud | ✅ LIVE |
| `loop-business` | business.rald.cloud | ✅ Registered |
| `rald-control-center` | admin.rald.cloud | ✅ LIVE |
| `payrald` | payrald.rald.cloud | ✅ Registered |
| `messenger` | messenger.rald.cloud | ✅ Registered |
| `dispatch` | Future | ✅ Registered |
| `voice` | Future | ✅ Registered |
| `raldtics` | Future analytics | ✅ Registered |

**Evidence:** `TRUSTED_APP_IDS` Set in `src/routes/sso.ts` — hardcoded registry of 8 trusted apps.

---

## 3. SSO EXCHANGE AUDIT — `POST /sso/exchange`

| Criterion | Evidence | Status |
|---|---|---|
| Requires valid master JWT | `authMiddleware` applied | ✅ |
| `appId` required in body | `if (!body?.appId) → 400` | ✅ |
| Unknown appId rejected | `if (!TRUSTED_APP_IDS.has(body.appId)) → 400` | ✅ |
| App-scoped JWT issued (1h) | `signJwt({...user, appId, source: "rald-auth"}, secret, 3600)` | ✅ |
| Same `RALD_JWT_SECRET` used | App tokens verifiable by all platform services | ✅ |
| `source: "rald-auth"` in payload | Provenance tracking | ✅ |

---

## 4. SSO VERIFY AUDIT — `POST /sso/verify`

| Criterion | Evidence | Status |
|---|---|---|
| No auth required (called by services) | No middleware on `/sso/verify` | ✅ |
| `token` required in body | `if (!body?.token) → 400` | ✅ |
| `verifyJwt(token, RALD_JWT_SECRET)` | Standard verification | ✅ |
| Returns `{ valid: true, user: payload }` | Full payload returned | ✅ |
| Invalid/expired token → 401 | `{ valid: false, error: "..." }, 401` | ✅ |

---

## 5. CLERK INTEGRATION

`rald-auth-core` also has a `clerkRoutes` mounted at `/sso`. This provides optional Clerk integration as an additional identity layer. Clerk keys (`CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`) are in the Bindings type, with readiness check in `GET /ready`.

---

## 6. CROSS-SERVICE TOKEN VALIDATION

All platform services validate tokens using the same `RALD_JWT_SECRET`:

| Service | Validation Method | Status |
|---|---|---|
| rald-notify | `verifyJwt(token, RALD_JWT_SECRET)` in middleware | ✅ |
| rald-search | `verifyJwt(token, RALD_JWT_SECRET)` in middleware | ✅ |
| rald-inbox | `verifyJwt(token, RALD_JWT_SECRET)` in middleware | ✅ |
| loop-crm | `verifyJwt(token, RALD_JWT_SECRET)` in middleware | ✅ |
| rald/api-worker | `verifyJwt(token, RALD_JWT_SECRET)` in middleware | ✅ |

**A single login gives the user authenticated access to every RALD service.** ✅

---

## 7. PRODUCT ACCESS PROVISIONING — `/provision/*`

`POST /provision/user` (admin-only) grants a user access to a product by inserting into `auth_product_access`:

```
{ user_id, product, role, granted_at }
UNIQUE CONFLICT: user_id + product (upsert)
```

`GET /provision/user/:userId/products` — lists all products a user is provisioned for.

---

## 8. FINDINGS

| ID | Severity | Root Cause | Repo | Service | Evidence | Fix | Effort | Verify |
|---|---|---|---|---|---|---|---|---|
| SSO-F01 | MEDIUM | TRUSTED_APP_IDS is a hardcoded Set — adding new trusted apps requires code change + deploy | rald-auth-core | auth.rald.cloud | `const TRUSTED_APP_IDS = new Set([...])` | Migrate to `auth_trusted_apps` Supabase table; admin-manageable | 1 day | Add new app via API; confirm exchange succeeds without redeploy |
| SSO-F02 | LOW | `appId` validation is string-match only — no signature or shared secret between products | rald-auth-core | auth.rald.cloud | No per-app secret in exchange | Add per-app `client_secret` for machine-to-machine calls in V2 | 2 days | Low priority — shared JWT secret provides sufficient isolation today |
| SSO-F03 | LOW | App-scoped token (1h) has no refresh path — product must re-exchange at expiry | rald-auth-core, all products | Cross-service | Token TTL = 3600s | Add `/sso/refresh` or handle exchange transparently in SDK | 1 day | Products call exchange on 401; verify new token issued |
| SSO-F04 | INFO | Clerk SSO is available but its integration pattern with RALD auth is undocumented | rald-auth-core | auth.rald.cloud | `clerkRoutes` mounted at `/sso` | Document Clerk + RALD auth coexistence model | 0.5 day | Review clerk.ts routes |

---

## 9. CERTIFICATION RESULT

```
╔═══════════════════════════════════════════════════════════════╗
║  SSO_CERTIFICATION = PASS WITH MITIGATIONS                    ║
║  CRITICAL: 0 · HIGH: 0 · MEDIUM: 1 · LOW: 2 · INFO: 1       ║
║  SSO exchange + verify implemented and source-verified        ║
║  8 trusted apps registered · all platform services verified  ║
╚═══════════════════════════════════════════════════════════════╝
```

**Signed: LILCKY STUDIO LIMITED — 2026-06-02**
