# ONBOARDING_CERTIFICATION.md
**Phase:** G.5 — Ecosystem Readiness  
**Workstream:** 3 — Onboarding Certification  
**Owner:** LILCKY STUDIO LIMITED  
**Date:** 2026-06-02  
**Evidence Source:** GitHub — Ostinato-Loop org repositories

---

## CERTIFICATION MANDATE

Map every onboarding flow. Verify new and existing user paths. Validate no loops, dead ends, broken redirects, orphan accounts, or incomplete profile states.

---

## 1. LOOP — ONBOARDING FLOW

**Repository:** `Ostinato-Loop/loop`  
**Evidence:** `artifacts/loop/src/pages/login.tsx`, `artifacts/loop/src/pages/onboarding.tsx`

### New User Path

```
RALD Registration
  → POST /api/auth/send-otp (phone)
  → POST /api/auth/verify-otp { mode: "signup", displayName }
  → Server returns { access_token, is_new_user: true }
  → Client: setLoopToken(token)
  → Navigate to /onboarding (is_new_user flag)
  
  ONBOARDING STEPS:
  Step 0: username
    → Check availability: GET /api/auth/username-check
    → Validated: 3+ chars, alphanumeric, no spaces
  Step 1: interests
    → Multi-select from INTERESTS array
    → Minimum 3 required to advance
  Step 2: rooms
    → Optional: join a live room
    → "Skip" available → /
    
  COMPLETE → finish() → PATCH /api/auth/profile + navigate("/")
```

### Existing User Path

```
RALD Login
  → POST /api/auth/send-otp
  → POST /api/auth/verify-otp { mode: "signin" }
  → Server returns { access_token, is_new_user: false }
  → Navigate to "/" (home/rooms)
```

### Forgot/Recovery Path

```
RALD Recovery
  → POST /api/auth/send-otp { tab: "forgot" }
  → POST /api/auth/verify-otp { mode: "forgot" }
  → Same destination as signin
```

### Validation

| Check | Finding | Status |
|---|---|---|
| No onboarding loops | Steps are linear 0→1→2→complete. Back button available but no cycle. | ✅ PASS |
| No dead ends | Step 2 (rooms) has explicit "skip" to "/" | ✅ PASS |
| No broken redirects | `is_new_user` flag routes correctly | ✅ PASS |
| No orphan accounts | OTP-verified account always issues token; profile created on verify | ✅ PASS |
| No incomplete profile states | `onboarded` boolean set in `profiles` on finish() | ✅ PASS |
| Tab switching resets flow | `switchTab()` resets step, code, errors | ✅ PASS |
| Auto-submit on 6-digit OTP | `useEffect` triggers verify on `code.length === 6` | ✅ PASS |
| Resend cooldown | 30-second countdown, client-side rate limit `canSendNow()` | ✅ PASS |

**Loop Onboarding Verdict:** ✅ PASS

---

## 2. MESSENGER — ONBOARDING FLOW

**Repository:** `Ostinato-Loop/messenger`  
**Evidence:** `artifacts/loop-messenger/src/pages/auth.tsx`, `artifacts/loop-messenger/src/pages/onboarding.tsx`

### New User Path

```
Phone Entry
  → POST /api/auth/send-otp (via useSendOtp hook → api-server)
  → Cooldown: res.cooldownSeconds (typically 60s)
  
OTP Verification
  → POST /api/auth/verify-otp (via useVerifyOtp hook)
  → Server returns { access_token, isNewUser, user }
  → On isNewUser: navigate("/onboarding")
  → On returning: navigate("/chats")
```

### Existing User Path

```
Same flow, isNewUser=false → navigate("/chats")
```

### Validation

| Check | Finding | Status |
|---|---|---|
| No onboarding loops | Linear phone→OTP→onboarding/chats | ✅ PASS |
| No dead ends | `/onboarding` page completes to `/chats` | ✅ PASS |
| No broken redirects | `isNewUser` flag from server drives routing | ✅ PASS |
| No orphan accounts | OTP verify creates user record before issuing token | ✅ PASS |
| Incomplete profile states | Onboarding page collects displayName before proceeding | ✅ PASS |
| OTP cooldown enforced | Server returns `cooldownSeconds`; client shows countdown | ✅ PASS |
| Resend flow | `resendOtp()` function with cooldown gate | ✅ PASS |

**Messenger Onboarding Verdict:** ✅ PASS

---

## 3. RALD AUTH CORE — REGISTRATION GUARD

**Repository:** `Ostinato-Loop/rald-auth-core`  
**Evidence:** `src/routes/auth.ts`

```typescript
// Duplicate check before insert
const { data: existing } = await db.from("auth_users").select("id").eq("email", email).limit(1);
if (existing?.length) return c.json({ error: "An account with this email already exists" }, 409);
```

**Welcome email:** Sent asynchronously on registration success (non-blocking, does not fail registration).

**RALD-ID assignment:** Database trigger auto-generates on every new `auth_users` insert.

**Verdict:** ✅ PASS — Registration is idempotent and guarded against duplicates.

---

## 4. CROSS-ECOSYSTEM ONBOARDING PATH

**Mandate:** A single user should register once via RALD Identity and access all products.

**Actual flow (evidence-based):**

```
User registers at loop.rald.cloud
  → POST /api/auth/send-otp → verify-otp
  → Token stored: setLoopToken()
  → Loop profile created in Supabase profiles table
  
User navigates to messenger.rald.cloud
  → No SSO session handoff observed in Messenger
  → User must re-enter phone and OTP
  → Messenger creates SEPARATE user record in local `users` table
  
User navigates to another app (business/payrald/dispatch)
  → No source code available; cannot verify
```

**FINDING (CRITICAL — WS3-F1):** There is no ecosystem-level session handoff. A user authenticated in Loop must re-authenticate from scratch in Messenger. The SSO exchange endpoint (`POST /sso/exchange`) exists in `rald-auth-core` and is consumed by Loop's `rald-sso.ts` route, but the full browser session continuity (cookie/token propagation between `*.rald.cloud` domains) is not implemented. Each product starts a fresh auth flow.

---

## 5. VALIDATION CHECKLIST

| Requirement | Status | Evidence |
|---|---|---|
| No onboarding loops | ✅ PASS | Loop and Messenger flows are linear with skip options |
| No dead ends | ✅ PASS | All onboarding steps have a completion or skip path |
| No broken redirects | ✅ PASS | `is_new_user` flag drives correct routing |
| No orphan accounts | ✅ PASS | Token only issued after successful OTP verification |
| No incomplete profile states | ✅ PASS | `onboarded` flag set; displayName required before completion |
| Cross-ecosystem onboarding | ❌ FAIL | Re-authentication required for each product; no SSO session handoff |

---

## 6. FINDINGS SUMMARY

| ID | Severity | Finding | Repo | Remediation |
|---|---|---|---|---|
| WS3-F1 | CRITICAL | No cross-ecosystem session handoff. Users re-authenticate per product. | Ecosystem | Implement shared session cookie on `.rald.cloud` domain, or implement silent SSO token refresh on product load using `rald-auth-sdk` |
| WS3-F2 | HIGH | Loop Business, DunaRald, Dispatch, PayRald have no onboarding flows to verify | Multiple | Implement and source-control these flows |
| WS3-F3 | LOW | Messenger onboarding does not ask for username/interests (minimal profile). | `messenger` | Add profile completion step or sync from RALD Identity |

---

## CERTIFICATION DECISION

```
╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║   WORKSTREAM 3 — ONBOARDING CERTIFICATION                            ║
║                                                                      ║
║   CRITICAL: 1   HIGH: 1   MEDIUM: 0   LOW: 1                        ║
║                                                                      ║
║   ██████████████████████████████████████████████████████████████   ║
║   ██                                                            ██   ║
║   ██   ❌  FAIL                                                 ██   ║
║   ██                                                            ██   ║
║   ██   Loop: PASS — well-implemented OTP + onboarding.          ██   ║
║   ██   Messenger: PASS — clean OTP auth flow.                   ██   ║
║   ██   Cross-ecosystem: CRITICAL — no SSO session continuity.   ██   ║
║   ██   4 apps: no source code to verify.                        ██   ║
║   ██                                                            ██   ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

LILCKY STUDIO LIMITED — RALD Ecosystem G.5 Certification  
Generated: 2026-06-02 | Evidence: GitHub Ostinato-Loop org
