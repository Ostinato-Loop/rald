# E2E_PRODUCTION_QA_CERTIFICATION.md
**Phase:** G.9 — Pre-Production Certification  
**Workstream:** 3 — End-to-End User Journey QA  
**Owner:** LILCKY STUDIO LIMITED  
**Date:** 2026-06-02  
**Evidence Source:** GitHub — Ostinato-Loop org (source code trace, not live environment test)

> **IMPORTANT:** This report traces user journeys through code paths. Live integration testing against production endpoints was not performed (no test environment credentials). All findings are from static code analysis.

---

## JOURNEY 1 — NEW USER (LOOP)

### Step-by-step code trace

**1. Registration (`artifacts/loop/src/pages/login.tsx`)**
```
User selects mode: signup
Enters displayName
Selects country (+234 default), enters phone
→ POST /api/auth/send-otp { phone }
  Worker: auth.ts → Termii sendOtp() OR dev fallback
  Response: { pinId, message } | { error } 502 if Termii fails
```

**2. OTP Verification**
```
User enters 6-digit code (auto-submit on 6th digit)
→ POST /api/auth/verify-otp { phone, token: pinId, code, mode: "signup" }
  Worker: verify → Supabase upsert user
  Returns: { access_token, is_new_user: true, user }
→ setLoopToken(access_token) → localStorage
→ navigate("/onboarding")
```

**3. Onboarding (`artifacts/loop/src/pages/onboarding.tsx`)**
```
Step 0: username input
  → GET /api/auth/username-check?username=X (availability check)
  → Validation: 3+ chars, alphanumeric
Step 1: interests (multi-select, min 3)
Step 2: join a room (skippable → "/")
→ finish() → PATCH /api/auth/profile { username, interests, onboarded: true }
→ navigate("/")
```

**Failure paths:**
- Termii unavailable: `send-otp` returns 502 with `{ error: "..." }`. Client displays error. User can retry. ✅
- OTP wrong/expired: Termii returns failed verification → 401. Message: "Invalid or expired code." ✅
- Username taken: `username-check` returns `{ available: false }`. User must pick another. ✅
- Supabase unavailable: `verify-otp` → Supabase insert fails → 500. Generic error shown. ⚠️ Not graceful — no recovery message.

**Loop New User Verdict:** ✅ PASS (success path). ⚠️ PARTIAL (Supabase failure not gracefully handled).

---

## JOURNEY 2 — RETURNING USER (LOOP)

**Code trace:**
```
POST /api/auth/send-otp { phone }
→ POST /api/auth/verify-otp { mode: "signin" }
  → User found in Supabase by phone
  → Returns: { access_token, is_new_user: false, user }
→ setLoopToken(access_token) → navigate("/")
```

**No onboarding loop:** `is_new_user: false` → direct to home. ✅  
**Session restoration:** `use-auth.tsx` reads localStorage on mount — silent token restore. ✅  
**Expired token:** `verifyLoopJwt()` checks `exp` → returns null → client shows login page. ✅

**Loop Returning User Verdict:** ✅ PASS

---

## JOURNEY 3 — NEW USER (MESSENGER)

**Code trace (`artifacts/loop-messenger/src/pages/auth.tsx`):**
```
Phone entry → POST /api/auth/send-otp (Express api-server)
  api-server: rate-limit check (one valid OTP outstanding)
  → Termii sendTermiiOtp(phone, code)
  Response: { message, cooldownSeconds } | 429 if rate-limited | 502 if Termii fails

OTP verify → POST /api/auth/verify-otp { phone, code }
  api-server: match code in otpRequestsTable (expires > now)
  → Lookup/create user in local `users` table
  → sign JWT with RALD_JWT_SECRET (shared secret)
  Returns: { access_token, isNewUser, user }
→ isNewUser → navigate("/onboarding")
→ !isNewUser → navigate("/chats")
```

**Onboarding:** Collects `displayName` → PATCH /users/me. No interests/username step.

**Failure paths:**
- Termii unavailable (production): OTP record deleted → user can retry immediately. ✅
- OTP expired: 401 "Invalid or expired code". ✅
- Rate limit (same OTP outstanding): 429 with `cooldownSeconds`. ✅

**Messenger New User Verdict:** ✅ PASS (success path and failure paths handled).

---

## JOURNEY 4 — RETURNING USER (MESSENGER)

```
POST /auth/send-otp → POST /auth/verify-otp { mode: signin }
→ user found in local `users` table by phone
→ JWT issued → navigate("/chats")
```

**Session restoration:** localStorage token → Messenger hook reads on mount. ✅  
**Expired token:** Worker `authMiddleware` → 401 → client redirects to login. ✅

**Messenger Returning User Verdict:** ✅ PASS

---

## JOURNEY 5 — CROSS-APP NAVIGATION (LOOP → MESSENGER)

**Code trace:**
```
User authenticated in Loop (has loop_token in localStorage)
User opens messenger.rald.cloud in browser
→ Messenger checks localStorage for token: NOT FOUND (different origin)
→ Messenger shows login page
→ User must re-enter phone + OTP
→ Messenger creates SEPARATE session in local `users` table
```

**FINDING (CRITICAL — WS3-F1):** Cross-app navigation requires full re-authentication. There is no session handoff mechanism. `loop.rald.cloud` and `messenger.rald.cloud` are different origins — `localStorage` is not shared. No shared cookie on `.rald.cloud`. The RALD SSO exchange endpoint exists (`POST /sso/exchange`) but no product automatically calls it to silently resume a session when the user navigates to a new app.

---

## JOURNEY 6 — ACCOUNT RECOVERY

**rald-auth-core password reset:**
```
POST /auth/request-password-reset { email }
→ Lookup auth_users by email
→ Generate 6-digit code → hash → store in auth_otp_codes
→ Send via Resend (if RESEND_API_KEY configured)
→ Always returns same message (no email enumeration)

POST /auth/reset-password { email, code, newPassword }
→ Verify code from auth_otp_codes (TTL 15min, type=password_reset)
→ Update password_hash
→ Invalidates used=true
```

**Loop recovery (phone-based — no email reset):**
```
"Forgot" tab → send-otp → verify-otp { mode: "forgot" }
→ Same OTP flow → new session issued
→ No password to reset (phone-first, passwordless)
```

**Error messaging:**
- Invalid code: "Incorrect reset code." ✅
- No account: Returns same success message (prevents enumeration) ✅  
- Resend unavailable: 502 "Failed to send verification email. Try again." ✅

**Account Recovery Verdict:** ✅ PASS

---

## JOURNEY 7 — LOGOUT AND RE-LOGIN

**Loop:**
```
Client: removeLoopToken() → localStorage cleared
Re-login: full OTP flow
No server-side session invalidation observed in Loop auth routes.
```

**FINDING (MEDIUM — WS3-F2):** Loop logout is client-side only. The CF Worker JWT remains valid until expiry (no server-side revocation).

**rald-auth-core:**
```
DELETE /auth/sessions or DELETE /auth/sessions/:id
→ auth_sessions.revoked_at = NOW()
→ JWT itself remains valid until exp (stateless)
```

**Logout Verdict:** ⚠️ PARTIAL — Sessions revoked in DB but JWTs remain valid until natural expiry.

---

## VALIDATION MATRIX

| Journey | Success Path | Failure Path | Error Messaging | Status |
|---|---|---|---|---|
| Loop new user | ✅ | ✅ (Termii) ⚠️ (Supabase) | ✅ | PASS |
| Loop returning | ✅ | ✅ | ✅ | PASS |
| Messenger new user | ✅ | ✅ | ✅ | PASS |
| Messenger returning | ✅ | ✅ | ✅ | PASS |
| Cross-app nav | ❌ No SSO handoff | N/A | N/A | FAIL |
| Account recovery | ✅ | ✅ | ✅ | PASS |
| Logout → re-login | ⚠️ Client-only | N/A | N/A | PARTIAL |

---

## FINDINGS

| ID | Severity | Finding |
|---|---|---|
| WS3-F1 | CRITICAL | Cross-app navigation requires full re-authentication. No session handoff between products. |
| WS3-F2 | MEDIUM | Loop logout is client-side only — no server-side JWT revocation. |
| WS3-F3 | MEDIUM | Supabase failure on Loop `verify-otp` returns generic 500 with no user recovery path. |
| WS3-F4 | LOW | Messenger onboarding collects only `displayName` (no username, interests). Minimal profile. |

---

## CERTIFICATION DECISION

```
╔══════════════════════════════════════════════╗
║  WS3 — E2E PRODUCTION QA CERTIFICATION       ║
║  CRITICAL: 1  HIGH: 0  MEDIUM: 2  LOW: 1    ║
║  DECISION: ❌  FAIL                           ║
║                                              ║
║  Individual app journeys: PASS.              ║
║  Cross-ecosystem journey: CRITICAL FAIL.     ║
╚══════════════════════════════════════════════╝
```

LILCKY STUDIO LIMITED — RALD G.9 Certification | 2026-06-02
