# RALD Loop — Access Reliability Standard

**Document:** LOOP_ACCESS_RELIABILITY.md  
**Status:** Mostly Fixed — Residual Issues Documented  
**Owner:** LILCKY STUDIO LIMITED  
**Last Updated:** 2026-06-13

---

## Goal

**User clicks login → Authenticated → Feed loads in < 2 seconds.**

No dead ends. No blank pages. No silent failures.

---

## Current Auth Flow

```
User visits loop.rald.cloud
  ↓
AuthProvider mounts → calls GET /api/auth/silent (cookie check)
  ↓ (cookie exists)
  → silent returns { valid: true, access_token, user }
  → setSessionToken(access_token)
  → setSession({ access_token, user })
  → Router renders: /feed (authenticated)
  ↓ (no cookie)
  → Router renders: /login page
  
Login Flow:
  User clicks "Sign in with RALD"
  ↓
  Redirected to profiles.rald.cloud?app_id=loop&redirect_to=https://loop.rald.cloud/auth/callback
  ↓
  User authenticates at profiles.rald.cloud
  ↓
  Redirect: https://loop.rald.cloud/auth/callback?rald_token=<handoff_5min>
  ↓
  AuthProvider detects rald_token in URL params
  ↓
  POST /api/auth/rald-sso  { rald_token }  (COOKIE-001: token in body, not URL forever)
  ↓
  Worker: verifyJwt → upsertProfile → registerDevice → issueLoopToken
  → Set-Cookie: loop_session=<scoped_jwt>; HttpOnly; Secure; SameSite=Lax
  → { access_token, user, has_username }
  ↓
  AuthProvider: setSessionToken(access_token) → setSession(...)
  ↓
  URL cleaned (rald_token + app_id params stripped)
  ↓
  Router renders: /feed
```

---

## Audit Results

### ✅ Fixed Items

| Item | Fix | Date |
|------|-----|------|
| `loop_session` HttpOnly cookie | COOKIE-001 | 2026-06-09 |
| rald_master_token removed from localStorage | COOKIE-001 | 2026-06-09 |
| Silent session refresh | GET /api/auth/silent (cookie-based) | 2026-06-09 |
| JTI revocation blocklist | PHD-001 | 2026-06-07 |
| User-level revoke-all timestamp | REVOKE-ALL-001 | 2026-06-09 |
| Username not overwritten on SSO | USN-001 | 2026-06-12 |
| SSO audience mismatch | SSO-AUD-FIX-001 | 2026-06-10 |
| Fallback verify to auth.rald.cloud | SSO-VERIFY-FALLBACK-001 | 2026-06-12 |
| onboarded=true set on SSO exchange | ZERO-FRICTION-001 | 2026-06-12 |
| Device registration on every login | Sprint 2 | 2026-06-09 |

### ⚠️ Remaining Issues

| Issue | Severity | Details |
|-------|----------|---------|
| `loop_session` cookie: no `Domain` scope | Medium | Cookie set without `Domain=.rald.cloud` — cross-subdomain propagation not guaranteed |
| `SameSite=Lax` on loop_session | Low | Phase 9 specifies `SameSite=None` for cross-subdomain SSO — Lax is safer but may block some cross-origin cookie flows |
| rald_session cookie on auth-core: `SameSite=Lax` | Low | Same issue — Phase 9 target is `SameSite=None; Secure` for cross-app cookie propagation |
| Registration redirect still passes master JWT in URL | Medium | `resolveRedirectUrl()` in rald-identity appends `rald_token=<master_jwt>` — should be replaced with server-side handoff |
| rald-auth-ui still uses localStorage for token reads | Medium | `rald-auth-ui/src/lib/api.ts` reads `localStorage.getItem("rald_token")` — app is deprecated (redirects to profiles.rald.cloud) but code exists |

---

## Session Flow Diagram

```
profiles.rald.cloud (rald_session cookie)
        │
        ├── loop.rald.cloud (loop_session cookie)
        ├── chat.rald.cloud (messenger_session cookie)
        └── pay.rald.cloud (payrald_session cookie)

Each product has its own HttpOnly session cookie.
Cross-product navigation uses 5-minute handoff tokens.
Silent refresh checks the product's own cookie first.
```

---

## Proactive Session Refresh

The Loop frontend schedules a proactive refresh before token expiry:

```typescript
// use-auth.tsx — scheduleProactiveRefresh()
// Calls /api/auth/silent 5 minutes before token expiry
// Refreshes loop_session cookie TTL
// No user action required
```

---

## Target Metrics

| Metric | Target | Status |
|--------|--------|--------|
| Cold start (no cookie) → feed load | < 3s | ✅ Achievable with current flow |
| Silent auth (cookie present) | < 500ms | ✅ Single KV lookup |
| SSO exchange latency | < 1s | ✅ Worker + KV |
| Revocation check | < 1ms | ✅ KV blocklist |

---

## Audit Log

| Date | Change |
|------|--------|
| 2026-06-13 | Full access reliability audit |
| 2026-06-12 | USN-001: username propagation fixed |
| 2026-06-09 | COOKIE-001: cookie-based auth, localStorage removed |

