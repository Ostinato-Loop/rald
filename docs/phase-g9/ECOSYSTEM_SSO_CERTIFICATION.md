# ECOSYSTEM_SSO_CERTIFICATION.md
**Phase:** G.9 — Pre-Production Certification  
**Workstream:** 1 — Ecosystem SSO Certification  
**Owner:** LILCKY STUDIO LIMITED  
**Date:** 2026-06-02  
**Evidence Source:** GitHub — Ostinato-Loop org (source code, CI/CD, wrangler configs)

---

## CERTIFICATION MANDATE

Verify RALD Identity → Loop → Messenger → Loop Business → Future Applications with:
no duplicate users, no duplicate customer records, no onboarding loops, no redirect loops, no session fragmentation, no isolated identity systems, shared profile continuity.

---

## 1. IDENTITY INFRASTRUCTURE

### rald-auth-core (`auth.rald.cloud`)
**Repo:** `Ostinato-Loop/rald-auth-core` | **Version:** 1.3.0 | **Deploy:** CF Worker

**Auth capabilities** (all confirmed in `src/routes/auth.ts`, `src/lib/auth.ts`):

| Method | Route | Purpose |
|---|---|---|
| POST | `/auth/login` | Password login → JWT |
| POST | `/auth/register` | Register → JWT (409 on duplicate email) |
| POST | `/auth/send-otp` | Termii SMS OTP (dev fallback: pin 123456) |
| POST | `/auth/verify-otp` | Verify → JWT or `{newUser, otpToken}` |
| POST | `/auth/register-from-otp` | Complete phone-first registration |
| POST | `/auth/send-login-email-otp` | Resend email OTP (stateless JWT-encoded hash) |
| POST | `/auth/verify-login-email-otp` | Verify → JWT or `{newUser, emailToken}` |
| GET | `/auth/me` | Profile (id, email, name, role, phone) |
| GET | `/auth/sessions` | Active sessions list |
| DELETE | `/auth/sessions/:id` | Single session revoke |
| DELETE | `/auth/sessions` | All sessions revoke |
| POST | `/sso/exchange` | Master JWT → app-scoped JWT (1h) |
| POST | `/sso/verify` | Verify any RALD token |
| POST | `/sso/clerk-exchange` | RALD JWT → Clerk sign-in token |

**JWT:** HMAC-SHA256 (Web Crypto). Secret: `RALD_JWT_SECRET` (CF Worker secret — not in source). Expiry 24h (86400s). App-scoped tokens: 1h.

**RALD-ID:** PostgreSQL trigger `generate_rald_id()` auto-assigns `RALD-XXXXXX` on every insert. Confirmed in `20260601_auth_users_table.sql`.

**Password:** PBKDF2-SHA256, 100,000 iterations, 16-byte random salt. Legacy HMAC format handled in `verifyPassword()` fallback. **PASS.**

### rald/artifacts/api-worker (`api.rald.cloud`)
**Repo:** `Ostinato-Loop/rald` | **Deploy:** CF Worker at `api.rald.cloud`

This is a **separate auth worker** with KV-backed rate limiting and Termii + Twilio fallback. Contains its own `/auth/*` routes. Relationship to `rald-auth-core`:
- `rald-auth-core` → `auth.rald.cloud` — primary identity authority  
- `api-worker` → `api.rald.cloud` — RALD platform API (includes auth for `rald-app`, control center)

**FINDING (HIGH — WS1-F1):** Two separate auth workers exist in the ecosystem (`auth.rald.cloud` and `api.rald.cloud`). Both issue JWTs signed with `RALD_JWT_SECRET`. They are independent deployments with separate Supabase table namespaces (`auth_users` in rald-auth-core vs `users`/`sessions` in api-worker). A user registered at `auth.rald.cloud` is NOT automatically visible at `api.rald.cloud`. This is a **dual identity authority problem**.

---

## 2. SSO TOKEN FLOW

**`POST /sso/exchange`** (rald-auth-core):
```typescript
const TRUSTED_APP_IDS = new Set([
  "rald-app", "loop-business", "rald-control-center",
  "payrald", "messenger", "dispatch", "voice", "raldtics"
]);
// Returns: { token: app-scoped JWT, appId, expiresIn: 3600 }
```

**Loop RALD SSO Bridge** (`artifacts/cloudflare-worker/src/routes/rald-sso.ts`):
```typescript
// POST /api/auth/rald-sso { rald_token }
// 1. Validates with auth.rald.cloud/auth/me
// 2. Upserts user in Supabase (by rald_id or phone)
// 3. Issues Loop-scoped JWT (signed with LOOP_JWT_SECRET — separate secret)
```

**FINDING (CRITICAL — WS1-F2):** Loop uses a **separate JWT secret** (`LOOP_JWT_SECRET`) from RALD (`RALD_JWT_SECRET`). After SSO token exchange, Loop issues its own JWT. This means:
- A RALD token is not directly usable in Loop — must go through the bridge
- No browser-level session sharing (no shared cookie on `.rald.cloud`)
- A user opening `messenger.rald.cloud` after `loop.rald.cloud` must re-authenticate
- The SSO bridge works one-way (RALD → Loop) but there is **no automatic cross-app session continuity**

**Messenger JWT validation** (`workers/loop-messenger-api/src/lib/auth.ts`): Validates `RALD_JWT_SECRET` directly — RALD tokens work in Messenger without exchange. This is architecturally correct.

**Loop validates Loop JWTs** (`middleware/auth.ts`): Uses `LOOP_JWT_SECRET`. RALD tokens require the `/api/auth/rald-sso` bridge.

---

## 3. APPLICATION-BY-APPLICATION AUDIT

### Loop (`loop.rald.cloud`)
- Auth: Phone OTP (Termii) → Loop JWT (LOOP_JWT_SECRET)
- RALD SSO: `POST /api/auth/rald-sso` bridges RALD token → Loop JWT ✅
- Profile: `users` table (Supabase) + `profiles` table (bio, interests)
- **No duplicate identity**: Loop `users.id` is Supabase Auth UUID; `profiles.id` same UUID
- **FINDING (MEDIUM — WS1-F3):** Loop has its own OTP auth path (Termii direct) AND a RALD SSO bridge. A user can create an identity in Loop without ever registering at `auth.rald.cloud`. This means a Loop user may not have an `auth_users` record at `rald-auth-core`.

### Messenger (`messenger.rald.cloud`)
- CF Worker: Validates RALD JWT from `auth.rald.cloud` — correct ✅
- Express API (`artifacts/api-server`): Has local `users` table (integer PK, phone-based OTP auth)
- **FINDING (HIGH — WS1-F4):** Messenger Express API creates parallel user records independent of RALD Identity. Integer PK `users` table exists alongside RALD UUID identity.

### Loop Business (`loop-business.rald.cloud`)
- Repository: README only (3 files). **UNVERIFIABLE.**

### DunaRald, Dispatch, PayRald
- Repositories: README only. **UNVERIFIABLE.**

---

## 4. SHARED PROFILE CONTINUITY

| Field | Source | Available Across Apps | Status |
|---|---|---|---|
| `id` (RALD UUID) | `auth_users.id` | Via `GET /auth/me` | ✅ |
| `name` | `auth_users.name` | Via `GET /auth/me` | ✅ |
| `email` | `auth_users.email` | Via `GET /auth/me` | ✅ |
| `role` | `auth_users.role` | Via `GET /auth/me` | ✅ |
| `rald_id` | `auth_users.rald_id` | Via `GET /auth/me` | ✅ |
| `phone` | `auth_users.metadata.phone` | Via `GET /auth/me` | ✅ |
| `avatar_url` | `auth_users.avatar_url` | Via `GET /auth/me` | ✅ |
| `display_name` | `loop.profiles` | Loop API only | ⚠️ Siloed |
| `interests` | `loop.profiles` | Loop API only | ⚠️ Siloed |
| `customer_id` | `crm_customers` | Not wired yet | ❌ Missing |

---

## 5. FINDINGS

| ID | Severity | Finding |
|---|---|---|
| WS1-F1 | HIGH | Two separate auth workers (`auth.rald.cloud` + `api.rald.cloud`) with different Supabase table namespaces. Users registered at one are not visible at the other. |
| WS1-F2 | CRITICAL | No cross-app browser session continuity. Loop uses LOOP_JWT_SECRET; Messenger uses RALD_JWT_SECRET. No shared `.rald.cloud` cookie. Users must re-authenticate per product. |
| WS1-F3 | MEDIUM | Loop has its own OTP auth path (Termii direct) independent of `rald-auth-core`. A Loop user may never have a RALD Identity record. |
| WS1-F4 | HIGH | Messenger Express API maintains local `users` table (integer PK) — parallel identity independent of RALD. |
| WS1-F5 | HIGH | 4 of 7 applications (Loop Business, DunaRald, Dispatch, PayRald) have no source code — SSO cannot be verified. |

---

## CERTIFICATION DECISION

```
╔══════════════════════════════════════════════╗
║  WS1 — ECOSYSTEM SSO CERTIFICATION           ║
║  CRITICAL: 1  HIGH: 3  MEDIUM: 1  LOW: 0     ║
║  DECISION: ❌  FAIL                           ║
║                                              ║
║  Blocker: No cross-app session continuity.   ║
║  Blocker: Dual auth workers.                 ║
║  Blocker: Messenger parallel identity.       ║
╚══════════════════════════════════════════════╝
```

LILCKY STUDIO LIMITED — RALD G.9 Certification | 2026-06-02
