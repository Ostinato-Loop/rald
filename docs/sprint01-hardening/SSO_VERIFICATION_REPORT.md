# SSO Verification Report
**Sprint:** Production Readiness & Foundation Hardening
**Date:** 2026-06-04
**Author:** LILCKY STUDIO LIMITED — Engineering
**Status:** ✅ VERIFIED — with critical fix applied

---

## Executive Summary

The RALD SSO Identity Axiom has been fully implemented and verified across the Loop, Messenger, and RALD Auth Core workers. One critical token-validation bug was discovered and fixed: Loop's `/api/auth/me` endpoint was validating tokens with `LOOP_JWT_SECRET` rather than `RALD_JWT_SECRET`, causing silent profile-load failures for all SSO users.

---

## SSO Architecture

```
User visits loop.rald.cloud / messenger.rald.cloud
        ↓
profiles.rald.cloud issues RALD JWT (RALD_JWT_SECRET)
        ↓
JWT passed via ?rald_token URL param to destination app
        ↓
App calls /api/auth/rald-sso (or /auth/rald-sso) → validates token locally
        ↓
Same RALD JWT stored in localStorage, used as Bearer for all API calls
        ↓
Silent SSO: rald_session HttpOnly cookie at .rald.cloud domain
            → app calls /auth/silent → cookie validated → auto-login
```

---

## Verification Results by Service

### 1. rald-auth-core (auth.rald.cloud)

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/sso/silent` | GET | ✅ FIXED (Sprint 01) | Was dead code; now validates rald_session cookie |
| `/auth/login` | POST | ✅ | Issues RALD JWT via email/OTP |
| `/auth/me` | GET | ✅ | Returns full profile from Supabase |
| `/sso/exchange` | POST | ✅ | Cross-app token validation |
| `/session/*` | * | ✅ | KV-backed session store |

**Version:** 2.2.0
**Secret used:** `RALD_JWT_SECRET`
**Cookie:** Sets `rald_session` HttpOnly, SameSite=None, Secure at `.rald.cloud`

---

### 2. loop-messenger-api (messenger.rald.cloud)

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/auth/rald-sso` | POST | ✅ | Validates RALD JWT locally; stateless |
| `/auth/me` | GET | ✅ FIXED (Sprint 01-H) | Now fetches real profile from Supabase profiles table |
| `/auth/silent` | GET | ✅ | Cookie-based session; validates rald_session |

**Version:** 1.2.0
**Secret used:** `RALD_JWT_SECRET`
**Profile lookup:** Now fetches `display_name`, `username`, `avatar_url`, `bio` from Supabase

**Fix applied:** `/auth/me` previously returned `avatar: null`, `bio: null`, `displayName` derived from email only. Now performs real Supabase lookup with email fallback.

---

### 3. loop-api (loop.rald.cloud)

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/api/auth/rald-sso` | POST | ✅ | Returns RALD token unchanged; provisions Supabase user |
| `/api/auth/silent` | GET | ✅ | Cookie-based session (rald-sso.ts) |
| `/api/auth/me` | GET | ✅ FIXED (Sprint 01-H) | Now tries RALD_JWT_SECRET first, LOOP_JWT_SECRET fallback |
| `/api/auth/send-otp` | POST | ✅ | Termii OTP with KV rate limiting |
| `/api/auth/verify-otp` | POST | ✅ | Issues LOOP_JWT_SECRET tokens (legacy OTP path only) |

**Version:** post-Sprint 01 H
**Critical fix:** `/api/auth/me` was validating with `LOOP_JWT_SECRET` only, causing all SSO users (RALD token holders) to receive 401 on profile load. Fixed to try `RALD_JWT_SECRET` first.
**Secondary fix:** Profile lookup now uses `payload.id ?? payload.sub` to handle both RALD JWTs (`id` claim) and legacy OTP JWTs (`sub` claim).
**Security fix:** Removed hardcoded fallback `"loop-dev-secret-change-in-prod"` from OTP verify path.

---

### 4. rald-auth-core CORS

| Origin | Included | Notes |
|--------|----------|-------|
| profiles.rald.cloud | ✅ | Identity hub |
| loop.rald.cloud | ✅ | |
| messenger.rald.cloud | ✅ | |
| sv.rald.cloud | ✅ | No frontend yet; CORS pre-approved |
| business.rald.cloud | ✅ | |
| admin.rald.cloud | ✅ | |
| control.rald.cloud | ✅ | |

---

### 5. Cross-App SSO Flow (Full Trace)

**Step 1 — User opens loop.rald.cloud (no stored token)**
- `loadSession()` checks localStorage for `loop_token` → none
- Calls `/api/auth/silent` with `credentials: include`
- Worker reads `rald_session` cookie → validates with RALD_JWT_SECRET
- Returns `{ valid: true, access_token: <rald_token> }`
- Token stored; user is logged in without redirect ✅

**Step 2 — User clicks "Open Messenger"**
- `openMessenger()` reads `rald_master_token` from localStorage
- Navigates to `messenger.rald.cloud/chats?rald_token=<token>`
- Messenger `auth.tsx` detects `rald_token` URL param
- Calls `/auth/rald-sso` → validates locally → stores token
- Calls `/auth/me` → real profile returned from Supabase ✅

**Step 3 — User opens Messenger directly (already has cookie)**
- `auth.tsx` calls `/auth/silent` → `rald_session` cookie present
- Returns token → stored → user logged in ✅

---

## Known Gaps

| ID | Gap | Impact | Remediation |
|----|-----|--------|-------------|
| G-SSO-001 | sv.rald.cloud has no frontend — SSO cannot be tested end-to-end | Medium | Frontend must be built before SSO can be exercised |
| G-SSO-002 | Loop OTP legacy tokens (LOOP_JWT_SECRET) still functional — should be deprecated | Low | Phase out OTP flow when all users are migrated to RALD SSO |
| G-SSO-003 | Logout propagation from Loop does not revoke rald_session cookie at auth.rald.cloud | Medium | Implement `/sso/logout` on auth core that clears the cookie |

---

## Conclusion

The RALD SSO Identity Axiom is **operationally correct** after the Sprint 01-H fixes. All three workers now accept RALD JWTs, perform real profile lookups, and support cookie-based silent auth. Two previously identified dead-code paths (`/sso/silent` in rald-auth-core and `/auth/me` returning stale data in Messenger) have been resolved.
