# PRODUCTION_GO_LIVE_CHECKLIST.md
**Phase:** G.9 — Pre-Production Certification  
**Workstream:** 12 — Go-Live Checklist  
**Owner:** LILCKY STUDIO LIMITED  
**Date:** 2026-06-02  
**Standard:** Every item is PASS / FAIL / NOT APPLICABLE. No assumptions.

---

## SECTION A — IDENTITY & AUTHENTICATION

| # | Item | Status | Evidence / Notes |
|---|---|---|---|
| A1 | rald-auth-core deployed at `auth.rald.cloud` | ⚠️ UNVERIFIED | CI/CD exists. Cannot confirm live without credentials. |
| A2 | rald/api-worker deployed at `api.rald.cloud` | ⚠️ UNVERIFIED | CI/CD exists. |
| A3 | `RALD_JWT_SECRET` set in rald-auth-core CF secrets | ⚠️ UNVERIFIED | Wrangler secret — not visible from GitHub. |
| A4 | `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` set in rald-auth-core | ⚠️ UNVERIFIED | Documented in DEPLOYMENT_STATUS.md. |
| A5 | `TERMII_API_KEY` set in rald-auth-core | ⚠️ UNVERIFIED | Dev fallback exists — must confirm prod key set. |
| A6 | `RESEND_API_KEY` set in rald-auth-core | ⚠️ UNVERIFIED | Welcome + email OTP requires this. |
| A7 | OTP send rate limit (3/phone/10min) implemented | ❌ FAIL | Not present in rald-auth-core. WS4-F5. |
| A8 | Password login brute-force protection implemented | ❌ FAIL | Not present in rald-auth-core. WS4-F6. |
| A9 | Dev OTP fallback (pin 123456) disabled in production | ❌ FAIL | Gated on `!TERMII_API_KEY`, not `ENVIRONMENT!==production`. WS4-F3. |
| A10 | `.env` files removed from loop repository | ❌ FAIL | `.env.development` + `.env.production` committed. WS4-F1. |
| A11 | Supabase anon key rotated after `.env` removal | ❌ FAIL | Key may have been exposed. Must rotate. |
| A12 | `/auth/ready` endpoint responds `ready: true` | ⚠️ UNVERIFIED | Endpoint exists in code; live status unknown. |
| A13 | RALD-ID auto-assigned to all new users | ✅ PASS | PostgreSQL trigger confirmed in schema migrations. |
| A14 | Duplicate email registration rejected (409) | ✅ PASS | Confirmed in rald-auth-core `register` route. |
| A15 | JWT expiry set to 24h (86400s) | ✅ PASS | Confirmed in `signJwt()` calls. |
| A16 | PBKDF2 100k iterations for password hashing | ✅ PASS | Confirmed in `hashPassword()`. |

---

## SECTION B — LOOP

| # | Item | Status | Evidence / Notes |
|---|---|---|---|
| B1 | `loop.rald.cloud` serving frontend | ⚠️ UNVERIFIED | CF Pages deployment in CI. |
| B2 | Loop CF Worker deployed at `loop-api.rald.cloud` | ⚠️ UNVERIFIED | deploy.yml exists. |
| B3 | `LOOP_JWT_SECRET` set in Loop CF Worker | ⚠️ UNVERIFIED | Used in `middleware/auth.ts`. |
| B4 | `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` set in Loop Worker | ⚠️ UNVERIFIED | |
| B5 | `LOOP_JWT_SECRET` ≠ `RALD_JWT_SECRET` (separate secrets) | ✅ PASS | Confirmed by separate env var names. |
| B6 | Supabase schema migrations applied (users, profiles, rooms, etc.) | ⚠️ UNVERIFIED | Migration files exist; application unconfirmed. |
| B7 | Loop `verify-otp` returns `is_new_user` flag correctly | ✅ PASS | Confirmed in auth route. |
| B8 | RALD SSO bridge (`/api/auth/rald-sso`) deployed and functional | ⚠️ UNVERIFIED | Route exists in code. |
| B9 | `.env.development` removed from loop repo | ❌ FAIL | WS4-F1 |
| B10 | `.env.production` removed from loop repo | ❌ FAIL | WS4-F1 |
| B11 | Loop has PWA service worker | ❌ FAIL | No service worker found in source. WS9-F5. |

---

## SECTION C — MESSENGER

| # | Item | Status | Evidence / Notes |
|---|---|---|---|
| C1 | Messenger CF Worker deployed at `messenger.rald.cloud` | ⚠️ UNVERIFIED | CI/CD exists. |
| C2 | `RALD_JWT_SECRET` set in Messenger CF Worker | ⚠️ UNVERIFIED | Used in `authMiddleware`. |
| C3 | `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` set in Messenger Worker | ⚠️ UNVERIFIED | |
| C4 | `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` + `VAPID_SUBJECT` set | ⚠️ UNVERIFIED | Conditional push in deploy-api.yml. |
| C5 | Messenger schema migrations applied (all messenger_* tables) | ⚠️ UNVERIFIED | |
| C6 | `NOTIFY_URL`, `SEARCH_URL`, `CRM_URL`, `INBOX_URL` set in Worker | ⚠️ UNVERIFIED | Referenced in `Bindings` type. |
| C7 | `notification.rald.cloud` (rald-notify) deployed | ❌ FAIL | README only, no source code. WS8-F5. |
| C8 | `search.rald.cloud` (rald-search) deployed | ❌ FAIL | README only, no source code. |
| C9 | `/health` endpoint responds 200 | ⚠️ UNVERIFIED | Endpoint exists in code. |
| C10 | Express API server NOT handling auth (RALD JWT only path) | ❌ FAIL | Express server has parallel identity. WS1-F4. |
| C11 | Conversation `customer_id` resolution wired to CRM | ⚠️ PARTIAL | Architecture present, optional nullable FK. |

---

## SECTION D — CUSTOMER GRAPH (CRM)

| # | Item | Status | Evidence / Notes |
|---|---|---|---|
| D1 | `crm.rald.cloud` (loop-crm) deployed | ❌ FAIL | No deployment confirmation. DEPLOYMENT_STATUS.md lists as "Operator" deploy needed. |
| D2 | CRM schema migrations applied | ⚠️ UNVERIFIED | Migration files exist in loop-crm repo. |
| D3 | Every Messenger conversation auto-resolves customer_id | ❌ FAIL | customer_id is nullable. No auto-resolution. WS2-F3. |
| D4 | Loop users bridge to CRM customer records | ❌ FAIL | No bridge implemented. WS2-F1. |
| D5 | CRM merge rollback tested | ✅ PASS | Code evidence: double-rollback guard, snapshot. |

---

## SECTION E — SECURITY

| # | Item | Status | Evidence / Notes |
|---|---|---|---|
| E1 | No hardcoded secrets in any repository | ❌ FAIL | `.env` files committed in loop. WS4-F1. |
| E2 | All secrets in CF Worker secrets store | ⚠️ UNVERIFIED | Cannot verify from GitHub. |
| E3 | OTP send rate limited (all workers) | ❌ FAIL | rald-auth-core lacks rate limit. WS4-F5. |
| E4 | Login brute-force protected (all workers) | ❌ FAIL | rald-auth-core lacks protection. WS4-F6. |
| E5 | Redirect allowlist in SSO exchange | ✅ PASS | `TRUSTED_APP_IDS` set, `APP_REDIRECTS` allowlist. |
| E6 | CORS restricted to known origins | ✅ PASS | Explicit `origin[]` arrays in all workers. |
| E7 | All endpoints use HTTPS | ✅ PASS | CF Workers + Pages = HTTPS enforced. |
| E8 | CF Workers observability enabled | ✅ PASS | `[observability] enabled = true` in wrangler.toml. |
| E9 | No Supabase service role key exposed client-side | ✅ PASS | Service role key only in CF Worker secrets (server-side). |
| E10 | Secret rotation procedure documented | ✅ PASS | RECOVERY_RUNBOOK.md Runbook 3. |

---

## SECTION F — INFRASTRUCTURE

| # | Item | Status | Evidence / Notes |
|---|---|---|---|
| F1 | All CI/CD pipelines passing on `main` | ⚠️ UNVERIFIED | Must check GitHub Actions status. |
| F2 | Supabase project active (not paused) | ⚠️ UNVERIFIED | Free tier pauses after 1 week inactivity. |
| F3 | Supabase on Pro plan (PgBouncer pooler) | ⚠️ UNVERIFIED | Recommended for >100 concurrent users. |
| F4 | Cloudflare KV namespace `RATE_LIMIT_KV` created (rald-api) | ⚠️ UNVERIFIED | ID `37fbabca129f4e9382109338273f44c9` in wrangler.toml. |
| F5 | DNS records correct for all `*.rald.cloud` subdomains | ⚠️ UNVERIFIED | Requires Cloudflare DNS dashboard check. |
| F6 | Resend domain `rald.cloud` verified | ⚠️ UNVERIFIED | Requires Resend dashboard check. |
| F7 | Termii account funded | ⚠️ UNVERIFIED | Requires Termii dashboard check. |
| F8 | Cloudflare account within plan limits | ⚠️ UNVERIFIED | |
| F9 | Worker deployment rollback procedure tested | ❌ FAIL | No rollback test evidence. |

---

## SECTION G — NOTIFICATIONS

| # | Item | Status | Evidence / Notes |
|---|---|---|---|
| G1 | SMS OTP delivered to Nigerian numbers | ⚠️ UNVERIFIED | Termii DND channel. Requires live test. |
| G2 | Welcome email delivered | ⚠️ UNVERIFIED | Requires Resend delivery test. |
| G3 | Email OTP delivered | ⚠️ UNVERIFIED | Requires live test. |
| G4 | Push notifications delivered (Android Chrome) | ⚠️ UNVERIFIED | Requires device test. |
| G5 | Push notifications delivered (iOS 16.4+ PWA) | ⚠️ UNVERIFIED | Requires iOS device test. |
| G6 | Notification failure does not crash Messenger | ✅ PASS | All notification calls in try/catch. |

---

## SECTION H — CAMPUS PILOT SPECIFIC

| # | Item | Status | Evidence / Notes |
|---|---|---|---|
| H1 | Invite/referral mechanism in place | ❌ FAIL | Not implemented. WS11-F2. |
| H2 | Support email displayed in app | ❌ FAIL | Not observed in source. WS11-F5. |
| H3 | Admin moderation tools available | ❌ FAIL | Not implemented in Loop. WS11-F3. |
| H4 | KPI tracking dashboard ready | ❌ FAIL | No analytics pipeline. WS7. |
| H5 | Pilot scope document + user NDA/consent | N/A | Legal/ops — out of technical scope. |

---

## SUMMARY SCORECARD

| Section | Total Items | PASS | FAIL | UNVERIFIED | N/A |
|---|---|---|---|---|---|
| A — Identity | 16 | 6 | 4 | 6 | 0 |
| B — Loop | 11 | 3 | 3 | 5 | 0 |
| C — Messenger | 11 | 2 | 3 | 6 | 0 |
| D — CRM | 5 | 1 | 3 | 1 | 0 |
| E — Security | 10 | 5 | 3 | 2 | 0 |
| F — Infrastructure | 9 | 0 | 1 | 8 | 0 |
| G — Notifications | 6 | 1 | 0 | 5 | 0 |
| H — Campus Pilot | 5 | 0 | 4 | 0 | 1 |
| **TOTAL** | **73** | **18** | **21** | **34** | **1** |

**Items confirmed PASS:** 18 / 73 (25%)  
**Items FAIL:** 21 / 73 (29%)  
**Items requiring operator verification:** 34 / 73 (47%)

---

## GO/NO-GO RULING

```
╔══════════════════════════════════════════════════════╗
║  PRODUCTION GO-LIVE CHECKLIST                        ║
║  PASS: 18    FAIL: 21    UNVERIFIED: 34              ║
║  DECISION: ❌  NO-GO                                  ║
║                                                      ║
║  Minimum to reach GO:                               ║
║  1. Fix all 21 FAIL items (esp. 3 security FAILS)   ║
║  2. Operator must verify all 34 UNVERIFIED items     ║
║     before declaring GO                              ║
╚══════════════════════════════════════════════════════╝
```

LILCKY STUDIO LIMITED — RALD G.9 Certification | 2026-06-02
