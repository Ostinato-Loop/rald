# ECOSYSTEM_SSO_CERTIFICATION.md
**Phase:** G.5 — Ecosystem Readiness  
**Workstream:** 1 — SSO & Identity Certification  
**Owner:** LILCKY STUDIO LIMITED  
**Date:** 2026-06-02  
**Evidence Source:** GitHub — Ostinato-Loop org repositories

---

## CERTIFICATION MANDATE

Verify every application supports RALD Identity:  
Authentication → Session creation → Profile retrieval → Logout → Session validation

---

## 1. IDENTITY INFRASTRUCTURE EVIDENCE

### rald-auth-core (auth.rald.cloud)
**Repository:** `Ostinato-Loop/rald-auth-core`  
**Deployment:** Cloudflare Worker → `auth.rald.cloud/*`  
**Version:** 1.3.0

**Auth capabilities confirmed in source:**

| Capability | Route | Evidence |
|---|---|---|
| Password login | `POST /auth/login` | `src/routes/auth.ts` — verifyPassword + signJwt |
| Registration | `POST /auth/register` | `src/routes/auth.ts` — duplicate check, RALD-ID trigger |
| SMS OTP send | `POST /auth/send-otp` | `src/lib/otp.ts` — Termii integration |
| SMS OTP verify | `POST /auth/verify-otp` | `src/lib/otp.ts` — verifySmsOtp |
| Email OTP login | `POST /auth/send-login-email-otp` | `src/lib/otp.ts` — Resend integration |
| Profile retrieval | `GET /auth/me` | `src/routes/auth.ts` — authMiddleware guard |
| Session list | `GET /auth/sessions` | `src/routes/auth.ts` |
| Session revocation | `DELETE /auth/sessions/:id` | `src/routes/auth.ts` — revoked_at timestamp |
| All sessions logout | `DELETE /auth/sessions` | `src/routes/auth.ts` — bulk revoke |
| SSO exchange | `POST /sso/exchange` | `src/routes/sso.ts` — app-scoped JWT |
| SSO verify | `POST /sso/verify` | `src/routes/sso.ts` — token validation |
| Clerk exchange | `POST /sso/clerk-exchange` | `src/routes/clerk.ts` — Clerk sign-in token |
| Admin provisioning | `POST /provision/user` | `src/routes/provision.ts` |
| Readiness check | `GET /ready` | `src/index.ts` — validates all 5 required secrets |

**JWT implementation:** Custom HMAC-SHA256 via Web Crypto API (no third-party JWT library). Tokens expire with `exp` claim. Verified in every middleware invocation.

**Database schema:** `auth_users`, `auth_sessions`, `auth_devices`, `auth_product_access`, `auth_otp_codes` — all prefixed `auth_*` to prevent table collision with other products on the shared Supabase project. Migration: `20260601_auth_users_table.sql`.

**RALD-ID:** Auto-generated on every new user insert via PostgreSQL trigger (`RALD-XXXXXX` format, 6-char alphanumeric).

---

## 2. TRUSTED APP REGISTRY (SSO Exchange)

**Source:** `rald-auth-core/src/routes/sso.ts`

```
TRUSTED_APP_IDS = {
  "rald-app", "loop-business", "rald-control-center",
  "payrald", "messenger", "dispatch", "voice", "raldtics"
}
```

**SSO Flow:**  
1. App holds user's master RALD JWT  
2. App calls `POST /sso/exchange { appId }` with Bearer token  
3. Auth core returns app-scoped JWT (1h TTL, includes `appId` + `source: "rald-auth"`)  
4. App uses scoped token for its own API calls  

**App Redirect Registry** (from `src/routes/clerk.ts`):
```
rald-app            → https://app.rald.cloud
loop-business       → https://loop.rald.cloud
messenger           → https://messenger.rald.cloud
rald-control-center → https://admin.rald.cloud
payrald             → https://payrald.rald.cloud
```

---

## 3. APPLICATION-BY-APPLICATION VERIFICATION

### Loop (loop.rald.cloud)
**Repository:** `Ostinato-Loop/loop`

| Check | Finding | Status |
|---|---|---|
| Authentication | Phone OTP via `POST /api/auth/send-otp` → `verify-otp`. Returns `access_token`. | ✅ |
| RALD SSO bridge | `src/routes/rald-sso.ts` — dedicated route for RALD token exchange | ✅ |
| Session creation | `access_token` stored client-side via `setLoopToken()` | ✅ |
| Profile retrieval | `use-auth.tsx` hook + `GET /api/auth/me` | ✅ |
| Logout | Token cleared on `logout()` | ✅ |
| Session validation | `requireAuth()` middleware on all protected routes | ✅ |
| Onboarding guard | `isNewUser` flag → redirects to `/onboarding` | ✅ |
| Application-specific identity store | Uses Supabase `profiles` table (bio, interests) — NOT duplicating `auth_users`. This is the user profile layer. | ✅ ACCEPTABLE |
| Duplicate account prevention | `existing` check before insert in `auth/register` | ✅ |
| Redirect loops | OTP flow: phone → OTP → home/onboarding. No cycle detected. | ✅ |

**NOTE — FINDING (MEDIUM):** Loop has its own `profiles` table in Supabase (`supabase/migrations/001_initial_schema.sql`) which stores `display_name`, `interests`, `avatar_url`, `onboarded`. This is a profile/preference store, not an auth store. However, the `id` field is a `uuid primary key` with no explicit foreign key linking to `auth_users.id`. The join between Loop's `profiles.id` and `rald-auth-core`'s `auth_users.id` is implicit (both use Supabase Auth UUID). If a user registers through `rald-auth-core` but not through Supabase Auth, the profile record will be orphaned.

---

### Messenger (messenger.rald.cloud)
**Repository:** `Ostinato-Loop/messenger`

| Check | Finding | Status |
|---|---|---|
| Authentication | Phone OTP via Express API (`artifacts/api-server/src/routes/auth.ts`) + Cloudflare Worker JWT validation | ✅ |
| RALD JWT acceptance | Worker `lib/auth.ts` validates `RALD_JWT_SECRET` tokens from `auth.rald.cloud` | ✅ |
| Session creation | JWT token returned on verify-otp, stored client-side | ✅ |
| Profile retrieval | `GET /users/me` route | ✅ |
| Logout | Token removal client-side | ✅ |
| Session validation | `authMiddleware` on every protected route | ✅ |
| Application-specific identity store | `usersTable` in `lib/db/src/schema/users.ts` stores `phone`, `displayName`, `bio` — this is a **LOCAL** user table separate from `auth_users`. | ⚠️ FINDING |
| Duplicate account prevention | `phone UNIQUE` constraint on `usersTable` | ✅ |

**FINDING (HIGH — WS1-F1):** Messenger has a local `users` table (`lib/db/src/schema/users.ts`) with `serial` primary key (integer), entirely separate from `rald-auth-core`'s `auth_users` (UUID). A user registering in Messenger creates a record in `users` with no linkage to the RALD Identity `user.id`. This is an **application-specific identity store** — a direct violation of WS1 requirement 6.

The `workers/loop-messenger-api` correctly consumes RALD JWTs. But the `artifacts/api-server` auth route creates a parallel identity record. This creates two identity records per user: one in `auth_users` (RALD Identity) and one in Messenger's local `users` table.

---

### Loop Business (loop.rald.cloud → business)
**Repository:** `Ostinato-Loop/loop-business` — README only, 3 files total.  
**Finding:** No source code beyond README and CI workflow. Cannot verify SSO implementation.  
**Status:** ❌ UNVERIFIABLE — NO SOURCE CODE

---

### DunaRald
**Repository:** `Ostinato-Loop/dunarald` — README only, 3 files total.  
**Finding:** No source code.  
**Status:** ❌ UNVERIFIABLE — NO SOURCE CODE

---

### Dispatch (loop-dispatch)
**Repository:** `Ostinato-Loop/loop-dispatch` — README only, 3 files total.  
**Finding:** No source code.  
**Status:** ❌ UNVERIFIABLE — NO SOURCE CODE

---

### PayRald
**Repository:** `Ostinato-Loop/payrald` — README only, 3 files total.  
**Finding:** No source code.  
**Status:** ❌ UNVERIFIABLE — NO SOURCE CODE

---

## 4. VALIDATION CHECKLIST

| Requirement | Status | Evidence |
|---|---|---|
| No duplicate account creation | ✅ PASS (rald-auth-core) | Unique email constraint + explicit check before insert |
| No duplicate user records | ⚠️ FAIL — Messenger local `users` table | `lib/db/src/schema/users.ts` — integer PK, no RALD ID link |
| No redirect loops | ✅ PASS (Loop, Messenger) | OTP flow is linear: phone → OTP → destination |
| No onboarding loops | ✅ PASS | `isNewUser` flag routes once to onboarding, then home |
| No session fragmentation | ⚠️ PARTIAL | Sessions tracked in `auth_sessions`; Messenger uses stateless JWT only |
| No application-specific identity stores | ⚠️ FAIL — Messenger | `users` table with integer PK is independent of RALD Identity |

---

## 5. FINDINGS SUMMARY

| ID | Severity | Finding | Repo | Remediation |
|---|---|---|---|---|
| WS1-F1 | HIGH | Messenger `users` table is an independent identity store (integer PK, no RALD user ID link) | `messenger` | Replace `users.id` (serial) with `user_id UUID` referencing RALD `auth_users.id`; remove local OTP auth in `artifacts/api-server` |
| WS1-F2 | HIGH | Loop Business, DunaRald, Dispatch, PayRald have no source code — SSO cannot be verified | Multiple | Implement application shells with RALD SSO integration |
| WS1-F3 | MEDIUM | Loop `profiles.id` has no explicit FK to `auth_users.id` — implicit UUID join is fragile | `loop` | Add `FOREIGN KEY (id) REFERENCES auth_users(id)` or document the join contract |
| WS1-F4 | LOW | `rald-auth-ui` and `rald-identity` repos contain UI shells only — no auth logic confirmed | `rald-identity` | Verify these are thin wrappers consuming `rald-auth-core` |

---

## CERTIFICATION DECISION

```
╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║   WORKSTREAM 1 — SSO & IDENTITY CERTIFICATION                        ║
║                                                                      ║
║   CRITICAL: 0   HIGH: 2   MEDIUM: 1   LOW: 1                        ║
║                                                                      ║
║   ██████████████████████████████████████████████████████████████   ║
║   ██                                                            ██   ║
║   ██   ❌  FAIL                                                 ██   ║
║   ██                                                            ██   ║
║   ██   rald-auth-core is production-ready.                      ██   ║
║   ██   Messenger maintains a parallel identity store.           ██   ║
║   ██   4 of 7 applications have no verifiable source code.      ██   ║
║   ██                                                            ██   ║
║   ██   Cannot certify cross-ecosystem SSO without source.       ██   ║
║   ██                                                            ██   ║
╚══════════════════════════════════════════════════════════════════════╝
```

**Required remediations before PASS:**
1. Remove Messenger local `users` table; use RALD `user_id` (UUID) as the identity anchor
2. Ship minimum viable source code for Loop Business, DunaRald, Dispatch, PayRald demonstrating RALD SSO consumption
3. Add explicit FK from `loop.profiles.id` → `auth_users.id`

---

LILCKY STUDIO LIMITED — RALD Ecosystem G.5 Certification  
Generated: 2026-06-02 | Evidence: GitHub Ostinato-Loop org
