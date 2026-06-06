# RALD Profiles — Readiness Audit
**Date:** 2026-06-06  
**Repo:** Ostinato-Loop/rald-auth-core  
**Auditor:** Foundation Hardening Program — Phase 1  

---

## Evidence Base

| Source | File |
|--------|------|
| Auth routes | `src/routes/auth.ts`, `src/routes/sso.ts`, `src/routes/session.ts` |
| Middleware | `src/lib/middleware.ts`, `src/lib/rate-limit.ts` |
| Session | `src/lib/session.ts`, `src/lib/cookie.ts` |
| Audit | `src/lib/audit.ts` |
| Schema | `supabase/migrations/20260603_registered_apps.sql`, `20260603_identity_v2.sql` |
| Deployment | `wrangler.toml` → `auth.rald.cloud/*` |

---

## Phase 1 Checks

### ✅ Login
- Route: `POST /auth/login` (password + OTP flows confirmed in `src/routes/auth.ts`)
- JWT issued via `signJwt()` with `RALD_JWT_SECRET`
- Post-auth SSO redirect wired in rald-auth-ui `Login.tsx`

### ✅ Registration
- Route: `POST /auth/register`
- Email verification flow present (`src/lib/otp.ts`, Resend/Termii integrations)
- Approval workflow: `pending_review → admin_approval → role_activation` (identity_v2 schema)

### ✅ Sessions
- KV-backed session store: `RALD_SESSION_KV` (id: `15ee70c2a0534880a11843469d0468ef`)
- Cookie building via `src/lib/cookie.ts`
- Session validation via `authMiddleware` in `src/lib/middleware.ts`

### ✅ Password Reset
- Route present in `src/routes/auth.ts`
- OTP-gated via `src/lib/otp.ts`

### ✅ Email Verification
- Resend API wired (`RESEND_API_KEY` required secret)
- Termii for SMS OTP (`TERMII_API_KEY`, `TERMII_SENDER_ID`)

### ✅ Roles
- Role system in `identity_v2` migration
- `User`, `Artist`, `Label`, `Manager`, `Radio`, `Advertiser`, `Contributor` confirmed
- RBAC enforced via `adminMiddleware`

### ✅ Audit Logs
- `src/lib/audit.ts` — `writeAuditLog()` called on: login, sso_exchange, sso_handoff, app_registered, role changes
- Actions tracked: `login`, `logout`, `sso_exchange`, `sso_handoff_issued`, `app_registered`

### ✅ API Security
- Rate limiting: `RATE_LIMIT_KV` (id: `b0e3c620619c4aab85e5f59f6ebddc0e`)
- JWT validation: `verifyJwt()` on all protected routes
- Redirect validation: `validateRedirectUrl()` — only `*.rald.cloud` and `*.ostloop.name.ng`
- `authMiddleware` and `adminMiddleware` enforced

### ✅ SSO App Registry
- `registered_apps` table — DB-driven, 24 apps seeded
- Fallback set for DB outage (`FALLBACK_APP_IDS`)
- Manilla registered: ✅ (added 2026-06-06)

### ⚠️ Organizations
- Not confirmed in reviewed migrations — requires verification against `identity_v2.sql` full contents

---

## Score

| Area | Score |
|------|-------|
| Login | 10/10 |
| Registration | 10/10 |
| Sessions | 10/10 |
| Password Reset | 9/10 |
| Email Verification | 9/10 |
| Roles | 10/10 |
| Organizations | 6/10 — not fully confirmed |
| Audit Logs | 10/10 |
| API Security | 10/10 |

**Total: 84/90 → 93/100**

### Gap to 95+
- Confirm Organization model in `identity_v2.sql`
- Add MFA groundwork (Phase 2 of SSO spec)
- Document password reset token expiry policy
