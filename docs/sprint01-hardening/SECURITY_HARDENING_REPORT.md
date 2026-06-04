# Security Hardening Report
**Sprint:** Production Readiness & Foundation Hardening
**Date:** 2026-06-04
**Author:** LILCKY STUDIO LIMITED — Engineering
**Status:** ✅ HARDENED — critical issues resolved

---

## Executive Summary

Three security issues identified and resolved in this sprint. No issues remain at CRITICAL severity. Three LOW items remain as documented technical debt.

---

## Issues Resolved

### SEC-001 — Hardcoded JWT Secret Fallback in Loop Worker [CRITICAL → RESOLVED]

**File:** `loop/artifacts/cloudflare-worker/src/routes/auth.ts`
**Before:**
```js
const jwtSecret = c.env.LOOP_JWT_SECRET ?? "loop-dev-secret-change-in-prod";
```
**Impact:** If `LOOP_JWT_SECRET` env var was absent from Cloudflare, any attacker could forge Loop OTP tokens using the known fallback string, authenticate as any user, and gain full API access.
**Fix:** Removed hardcoded fallback. `/api/auth/me` now validates with `RALD_JWT_SECRET` first (SSO users) and `LOOP_JWT_SECRET` second (legacy OTP, no fallback). If neither secret validates the token, 401 is returned.
**Status:** ✅ RESOLVED

---

### SEC-002 — Dead-Code `/sso/silent` in rald-auth-core [HIGH → RESOLVED in Sprint 01]

**File:** `rald-auth-core/src/routes/sso.ts`
**Issue:** `/sso/silent` handler existed but was ordered after a catch-all — never executed. Silent auth always returned 404.
**Impact:** Users with valid rald_session cookies were forced to re-authenticate; no actual session hijacking risk, but a misleading security surface.
**Fix:** Resolved in Sprint 01 by reordering route declarations.
**Status:** ✅ RESOLVED

---

### SEC-003 — Loop /api/auth/me Unable to Validate RALD Tokens [HIGH → RESOLVED]

**File:** `loop/artifacts/cloudflare-worker/src/routes/auth.ts`
**Issue:** `/api/auth/me` only accepted tokens signed with `LOOP_JWT_SECRET`. All SSO users (RALD JWT holders) received a 401, and the `catch {}` in `use-auth.tsx` swallowed the error — users silently had no profile data.
**Fix:** Updated to try `RALD_JWT_SECRET` first, then `LOOP_JWT_SECRET` fallback. Also fixed profile lookup to use `payload.id ?? payload.sub` for correct user ID resolution.
**Status:** ✅ RESOLVED

---

## CORS Security Posture

| Service | Strategy | sv.rald.cloud | credentials: true |
|---------|----------|---------------|-------------------|
| rald-auth-core | Explicit allowlist | ✅ | ✅ |
| loop-messenger-api | Explicit allowlist | ✅ Added | ✅ |
| loop-api | Origin-reflect allowlist | ✅ Added | ✅ Added |

**Change:** Loop worker's CORS middleware was updated from single-origin (`CORS_ORIGIN ?? "*"`) to multi-origin reflect with an explicit production allowlist. This prevents wildcard CORS while correctly serving credentialed requests from all RALD ecosystem domains.

---

## Fail-Fast Audit

All three workers enforce fail-fast on missing secrets (returns 503, logs to console):

| Service | RALD_JWT_SECRET | SUPABASE_URL | SUPABASE_SERVICE_ROLE_KEY |
|---------|----------------|--------------|--------------------------|
| rald-auth-core | ✅ | ✅ | ✅ |
| loop-messenger-api | ✅ | ✅ | ✅ |
| loop-api | ✅ | ✅ | ✅ |

---

## Open Items (Low Severity)

| ID | Issue | Risk | Owner |
|----|-------|------|-------|
| SEC-L-001 | Loop OTP tokens (`LOOP_JWT_SECRET`) are still issued for legacy users — two JWT secrets in production | Low | Deprecate OTP flow |
| SEC-L-002 | No token revocation mechanism — issued RALD JWTs are valid until expiry (30 days) | Low | Implement refresh-token rotation |
| SEC-L-003 | `rald_session` cookie is scoped to `.rald.cloud` — no per-domain isolation | Low | By design; cross-app SSO requirement |

---

## Recommendations

1. **Rotate `LOOP_JWT_SECRET`** in production Cloudflare — previous value had a known hardcoded fallback.
2. **Add TERMII_API_KEY to fail-fast** in loop-api's `auth.ts` OTP path — currently the OTP route errors at runtime rather than at startup.
3. **Implement `/sso/logout`** in rald-auth-core that clears the `rald_session` cookie — required for proper logout propagation.
