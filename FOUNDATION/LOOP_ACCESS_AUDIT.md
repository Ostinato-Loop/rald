# LOOP ACCESS AUDIT
**RALD Ecosystem Finalization Program — Phase 4**
**Date:** 2026-06-13 | **Status:** COMPLETE — all P0/P1 issues resolved

---

## Mission

Eliminate every authentication dead-end in the Loop entry path. Authentication success must equal feed access. No exceptions.

---

## Full Entry Path (Post-Fix)

```
Step 1  loop.rald.cloud (any path)
          ↓ ProtectedRoute: no session
          ↓ Navigate /login?next=<path>

Step 2  LoginPage (300ms interstitial)
          ↓ window.location.href →
          profiles.rald.cloud/login?app_id=loop&redirect_to=
            https://loop.rald.cloud/auth/callback?next=<path>

Step 3  profiles.rald.cloud
          ↓ Smart login (phone / email / username)
          ↓ OTP via SMS or email
          ↓ OTP verified → master JWT issued
          ↓ POST auth.rald.cloud/sso/exchange { appId: "loop" }
          ↓ app-scoped JWT (1hr TTL, sso_v:2, username claim)
          ↓ resolveRedirectUrl() →
            https://loop.rald.cloud/auth/callback?rald_token=<jwt>&app_id=loop

Step 4  loop.rald.cloud/auth/callback
          ↓ AuthProvider detects rald_token param
          ↓ POST /api/auth/rald-sso { rald_token }  [credentials:include]
          ↓ Loop Worker:
              verifyJwt(token, RALD_JWT_SECRET, null)  ← SSO-AUD-FIX-001
              fallback: POST auth.rald.cloud/sso/verify ← SSO-VERIFY-FALLBACK-001
              upsertProfile() → onboarded:true          ← ZERO-FRICTION-001
              registerDevice()
              issueLoopToken() → loop_session cookie
          ↓ setSessionToken(access_token)  [in-memory]
          ↓ URL cleaned (rald_token removed)
          ↓ loadSession() → /api/auth/me → profile loaded
          ↓ navigate(next)

Step 5  Feed renders. Total time: <2 seconds.
```

---

## Fixed Issues

| ID | Symptom | Root Cause | Fix | Commit |
|----|---------|------------|-----|--------|
| F-001 | 5-second delay before redirect | Success countdown `useState(5)` | `useState(2)` | `6fd1e88` |
| F-002 | Other products can't do silent restore | `/sso/silent` no `access_token` | Return `access_token` in response | `13e8297` |
| F-003 | SSO users hit onboarding gate | `upsertProfile` didn't set `onboarded` | Add `onboarded: true` to upsert | `ec16747` |
| F-004 | Messenger nav broken | URL mismatch `messenger.rald.cloud` vs `chat.rald.cloud` | Align ECOSYSTEM_APPS | `215c0cb` |
| F-005 | Users saw "Session token missing" | Raw internal state shown as warning | Remove warning block | `6fd1e88` |
| PREV-1 | "Invalid or expired RALD token" | JWT audience enforcement | SSO-AUD-FIX-001 (null aud check) | prior |
| PREV-2 | master token in localStorage | Security vulnerability | COOKIE-001 (HttpOnly cookie) | prior |
| PREV-3 | Username overwritten on every SSO | `upsertProfile` used email slug | USN-001 (JWT claim only) | prior |
| PREV-4 | Secret mismatch hard-fails SSO | No fallback verify | SSO-VERIFY-FALLBACK-001 | prior |

---

## Remaining Monitoring Points

| Area | Risk | Action |
|------|------|--------|
| `rald_token` expiry during callback | Token issued at profiles, user delays > 1hr | Reduce token TTL to 10min for SSO exchange tokens |
| Auth.rald.cloud downtime | New logins fail; returning users work via cookie | Add synthetic monitoring on `/sso/exchange` |
| `RALD_JWT_SECRET` rotation | 7-day grace on refresh, 3s timeout on fallback verify | Automate secret rotation with 24hr overlap |
| 72 repos not yet audited | Downstream apps may bypass RALD session model | Per-product audit — see RALD_ECOSYSTEM_SCORECARD.md |

---

## Silent Entry Implementation (All Products)

Every RALD product MUST implement on startup:

```typescript
// 1. Check in-memory token (exists if SSO just happened)
let token = getSessionToken();

// 2. If not found, try cookie-based silent restore
if (!token) {
  const res = await fetch(`${API_BASE}/api/auth/silent`, { credentials: "include" });
  if (res.ok) {
    const data = await res.json();
    if (data.valid && data.access_token) token = data.access_token;
  }
}

// 3. If still no token → redirect to profiles.rald.cloud (NOT to local login)
if (!token) {
  window.location.href = `https://profiles.rald.cloud/login?app_id=${APP_ID}&redirect_to=${encodeURIComponent(CALLBACK_URL)}`;
}
```

Products that do NOT implement this pattern fall back to forcing re-authentication on every page refresh. This is non-compliant.

---

## Error Handling Standard

All auth errors shown to users must be human-language:

| Technical Error | Human Message |
|----------------|---------------|
| `JWT validation failed` | "Your session ended. Sign in again." |
| `Token invalid` | "We couldn't verify your account. Please try again." |
| `Session expired` | "Your session ended. Sign in again." |
| `Invalid or expired RALD token` | "Your session couldn't be verified. Please sign in again." |
| `Account suspended` | "Your account is temporarily unavailable. Contact support." |
| `Rate limit exceeded` | "Too many attempts. Please wait a moment and try again." |

---

*See also: AUTH_FLOW_AUDIT.md (rald-auth-core/reports/), IDENTITY_STATE_MACHINE.md*
