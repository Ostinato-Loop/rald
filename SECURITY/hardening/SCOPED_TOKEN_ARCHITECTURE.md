# RALD — Scoped Token Architecture

**Document:** SCOPED_TOKEN_ARCHITECTURE.md  
**Status:** Partially Implemented — rald_master_token eliminated  
**Owner:** LILCKY STUDIO LIMITED  
**Last Updated:** 2026-06-13

---

## Problem (Resolved: COOKIE-001 — 2026-06-09)

The ecosystem previously passed the master RALD JWT through URL query parameters (`?rald_token=<master_jwt>`). Any token leak — referer header, browser history, server log — would compromise the entire ecosystem.

---

## Current Architecture

### Token Hierarchy

```
RALD Identity (auth.rald.cloud)
  ↓ Issues: Master RALD JWT (30-day, HttpOnly rald_session cookie)
  ↓         Claims: { id, email, role, username, iss:"rald.cloud" }

Loop Worker (loop.rald.cloud)
  ↓ Receives: Master RALD JWT via POST body (never URL)
  ↓ Issues:   Loop-scoped JWT (HttpOnly loop_session cookie)
  ↓           Claims: { sub, id, email, role, username, iss:"loop.rald.cloud", aud:"loop", jti }

Cross-App Navigation
  ↓ Requests: 5-minute Handoff Token (POST /api/auth/rald-sso/handoff)
  ↓ Passes:   handoff_token in URL query param ONLY
  ↓ Receiving app exchanges handoff_token for its own scoped session
```

### Master JWT — Never in URL

The `rald_master_token` is no longer stored in `localStorage` or passed via URL. It lives exclusively in the `rald_session` HttpOnly cookie (`Domain=.rald.cloud`).

**Implementation in `rald-identity/src/lib/store.ts`:**
- `token` field in `OnboardingState` holds the JWT only during the registration flow (in-memory + `sessionStorage`)
- `resolveRedirectUrl()` appends `rald_token` to redirect URL — **this is the remaining risk** (see below)

---

## Handoff Token Flow

```
Loop App
  ↓
POST /api/auth/rald-sso/handoff  { app_id: "messenger" }
  Authorization: Bearer <loop_session_token>  OR  Cookie: loop_session=...
  ↓
Worker issues:
  { handoff_token: <5-min JWT, aud:"messenger">, expires_in: 300 }
  ↓
window.location.href = "https://chat.rald.cloud/chats?rald_token=<handoff>&app_id=messenger"
  ↓
Messenger worker:
  POST /api/auth/rald-sso  { rald_token: <handoff> }
  → verifyJwt with aud:null (SSO-AUD-FIX-001)
  → re-sign as messenger-scoped JWT
  → Set-Cookie: messenger_session (HttpOnly)
```

---

## Remaining Risk: rald_token in redirect URLs

**File:** `rald-identity/src/lib/store.ts` — `resolveRedirectUrl()`

```typescript
url.searchParams.set("rald_token", state.token);  // ← master JWT in URL during registration redirect
```

**Risk level:** Medium. Occurs only during first-time registration redirect. The token is a 30-day master JWT, not a scoped one.

**Required fix:** Replace with a server-side one-time handoff token from auth.rald.cloud before redirecting post-registration.

---

## One-Time Handoff Token (for registration redirects)

```
After registration completes at profiles.rald.cloud:
  POST /auth/sso/one-time-handoff  { app_id, redirect_to }
  Authorization: Bearer <fresh_master_jwt>
  ↓
  auth.rald.cloud creates:
    - short-lived record in handoff_tokens table (5 min TTL, single use)
    - returns { handoff_token: <opaque_random_token> }
  ↓
  Redirect: https://loop.rald.cloud?rald_token=<handoff>&app_id=loop
  ↓
  Loop worker:
    POST /api/auth/rald-sso  { rald_token: <handoff> }
    → Worker calls auth.rald.cloud/sso/exchange-handoff
    → auth.rald.cloud validates + marks token used + returns user claims
    → Loop issues loop_session cookie
    → Handoff token destroyed
```

---

## Implementation Status

| Item | Status |
|------|--------|
| `rald_master_token` removed from localStorage | ✅ COOKIE-001 |
| Master JWT not passed via URL for cross-app nav | ✅ Handoff tokens |
| `rald_session` HttpOnly cookie on auth.rald.cloud | ✅ |
| `loop_session` HttpOnly cookie on loop.rald.cloud | ✅ |
| Master JWT still in registration redirect URL | ⚠️ Medium risk — needs server-side handoff |
| Server-side one-time handoff token for registration | ❌ Not implemented |

---

## Audit Log

| Date | Change |
|------|--------|
| 2026-06-13 | Architecture documented — remaining risk identified |
| 2026-06-09 | COOKIE-001: rald_master_token removed from localStorage and URLs |

