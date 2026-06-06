# AUDIT/jwt-trust-chain.md
**Date:** 2026-06-06 | **Auditor:** RALD CTO / Security Lead
**Method:** Full source audit of all Ostinato-Loop repos issuing or validating JWTs
**Scope:** All services in the RALD ecosystem. Trust only live source — no assumptions.

---

## Executive Summary

The RALD ecosystem uses a **two-secret HS256 architecture**:
- `RALD_JWT_SECRET` — the single shared master secret for the entire ecosystem
- `LOOP_JWT_SECRET` — a legacy secret used only by Loop's OTP phone auth, now deprecated (Phase H)

A third hardcoded fallback secret was found in `rald/artifacts/api-server/src/lib/auth.ts` — a second SEC-003-class finding, separate from the one patched in the Loop worker.

**Do not rotate `LOOP_JWT_SECRET` until this document is reviewed.** Rotation affects only Loop legacy sessions — all other services are unaffected.

---

## 1. Which Service Issues JWTs?

### PRIMARY ISSUER — auth.rald.cloud (`rald-auth-core`)

| Route | Trigger | Secret Used | TTL | Claims |
|---|---|---|---|---|
| `POST /auth/login` | Password login | `RALD_JWT_SECRET` | 24h | `{id, email, role, iss:"rald.cloud"}` |
| `POST /auth/register` | New account | `RALD_JWT_SECRET` | 24h | `{id, email, role}` |
| `POST /auth/verify-otp` (email/SMS) | OTP verify | `RALD_JWT_SECRET` | 24h | `{id, email, role}` |
| `POST /sso/exchange` | Cross-app SSO | `RALD_JWT_SECRET` | **1h** | `{id, email, role, appId, source:"rald-auth", sso_v:2}` |
| `POST /sso/handoff` | Browser handoff | `RALD_JWT_SECRET` | **5 min** | `{id, email, role, appId, purpose:"sso-handoff"}` |

**auth.rald.cloud is the canonical JWT issuer for the RALD ecosystem.**
No hardcoded fallback. Startup check: if `RALD_JWT_SECRET` is missing → returns HTTP 503. No token is ever issued without the real secret.

---

### LEGACY ISSUER — loop-api.rald.cloud (`loop` cloudflare-worker)

| Route | Trigger | Secret Used | TTL | Claims |
|---|---|---|---|---|
| `POST /api/auth/verify-otp` | Phone OTP verify | `LOOP_JWT_SECRET` | **30 days** | `{sub, phone, role:"authenticated"}` |

**Status: DEPRECATED (Phase H — Identity Axiom)**

The middleware comment in `artifacts/cloudflare-worker/src/middleware/auth.ts` explicitly states:
> *"Phase H (Identity Axiom): Loop does NOT issue its own JWTs. The RALD JWT (signed with RALD_JWT_SECRET) is the session token."*

This issuer is in the process of being retired. New users who sign in via the RALD SSO flow receive a `RALD_JWT_SECRET` token. Users who authenticated via direct phone OTP before Phase H have active `LOOP_JWT_SECRET` tokens valid for up to 30 days.

**SEC-003 status:** The hardcoded fallback `?? "loop-dev-secret-change-in-prod"` was removed in commit `eca6186` (2026-06-06). The service now refuses to issue tokens if `LOOP_JWT_SECRET` is absent.

---

### INTERNAL ISSUER — rald console api-server (`rald` repo, Express.js)

| Route | Trigger | Secret Used | TTL | Claims |
|---|---|---|---|---|
| `POST /auth/login` et al. | Internal console auth | `RALD_JWT_SECRET` (env) | 24h | `{id, email, role}` |

**⚠️ CRITICAL: Second Hardcoded Fallback Found**

`rald/artifacts/api-server/src/lib/auth.ts` line 3:
```typescript
const JWT_SECRET = process.env.RALD_JWT_SECRET || "rald-dev-secret-change-in-production";
```

This is a separate SEC-003-class vulnerability in the Express server that backs the RALD console/dashboard. If `RALD_JWT_SECRET` is not set in the server's process environment, all tokens are signed with the public string `"rald-dev-secret-change-in-production"`.

**Action: SEC-004 — Fix this fallback before any console/dashboard is exposed publicly.**

---

### NOT JWT ISSUERS

| Service | Role | Notes |
|---|---|---|
| Supabase | Data layer | Supabase issues its own JWTs for direct Supabase client connections, but RALD services use `service_role_key` (bypasses Supabase JWT entirely). No Supabase user JWT is used in the RALD auth flow. |
| profiles.rald.cloud | UI only | Redirects to auth.rald.cloud for auth. Does not issue JWTs. |
| messenger.rald.cloud | API consumer | Validates `RALD_JWT_SECRET`. Does not issue JWTs. |
| loop.rald.cloud | Frontend | SPA. Does not issue JWTs. |
| voice.rald.cloud | Unknown | Not audited — assumed consumer only. |

---

## 2. Which Secret or Key Signs JWTs?

| Secret Name | Used By | Purpose | Hardcoded Fallback? |
|---|---|---|---|
| `RALD_JWT_SECRET` | auth.rald.cloud (primary), loop-api (RALD SSO path), messenger (validation), rald api-server | Master HS256 signing secret for entire ecosystem | ⚠️ YES — in `rald` api-server (SEC-004) |
| `LOOP_JWT_SECRET` | loop-api only | Legacy phone OTP JWT signing | ✅ NO — fallback removed by SEC-003 |

**There is no RSA keypair, no EdDSA, no Supabase JWT, no JWKS endpoint. The entire ecosystem is HS256 shared-secret.**

This means: any service with access to `RALD_JWT_SECRET` can both issue and validate tokens. There is no separation between signing authority and validation consumers.

---

## 3. Which Services Validate JWTs?

| Service | Validates Secret(s) | Method | Cookie Support | Notes |
|---|---|---|---|---|
| `auth.rald.cloud` | `RALD_JWT_SECRET` | `authMiddleware` — `verifyJwt()` (Web Crypto HS256) | ✅ `rald_session` cookie | Primary validator; KV session store check (revocation) |
| `loop-api.rald.cloud` | `RALD_JWT_SECRET` (primary) + `LOOP_JWT_SECRET` (legacy fallback) | `requireAuth()` middleware (Web Crypto HS256) | ✅ `rald_session` cookie | Dual-secret validation; LOOP_JWT_SECRET path deprecated |
| `messenger.rald.cloud` | `RALD_JWT_SECRET` only | `authMiddleware` — `verifyJwt()` (Web Crypto HS256) | ❌ Bearer only | No LOOP_JWT_SECRET validation |
| `rald` api-server | `RALD_JWT_SECRET` (via `process.env`) | `requireAuth()` Express middleware (Node.js `crypto` HMAC) | ❌ Bearer only | Has hardcoded fallback — SEC-004 |
| `profiles.rald.cloud` | N/A (frontend) | Delegates to auth.rald.cloud via SSO | N/A | |
| `voice.rald.cloud` | Unknown | Not audited | Unknown | |
| `manilla.rald.cloud` | N/A (down — 530) | Not running | N/A | |

---

## 4. JWT Signing Algorithm

**Algorithm: HS256 (HMAC-SHA256) — shared secret**

| Implementation | Library | Hash | Encoding |
|---|---|---|---|
| CF Workers (auth, loop, messenger) | Web Crypto API (`crypto.subtle`) | SHA-256 | Base64URL manual |
| Express server (rald) | Node.js `crypto.createHmac` | SHA-256 | `Buffer.toString("base64url")` |

**This is NOT:**
- RS256 (asymmetric) — no public/private keypair
- EdDSA — no Ed25519 keys
- Supabase JWT — Supabase auth is bypassed; service role key used directly
- JWKS — no key discovery endpoint

**Consequence of shared HS256:**
Any service that holds `RALD_JWT_SECRET` can forge tokens for any user. There is no cryptographic separation between the issuer (auth.rald.cloud) and consumers (loop, messenger, etc.). If `RALD_JWT_SECRET` leaks from any service's CF Secrets store, the entire ecosystem is compromised.

---

## 5. Is LOOP_JWT_SECRET Actually Used in Production?

**Yes — for existing sessions only. No new tokens are being issued (after SEC-003 fix).**

Evidence:

1. **Issuance stopped:** `POST /api/auth/verify-otp` in the loop worker now fails with `500` if `LOOP_JWT_SECRET` is absent (SEC-003, commit `eca6186`). No new LOOP_JWT_SECRET tokens can be issued.

2. **Validation still active:** `GET /api/auth/me` in the loop worker still accepts `LOOP_JWT_SECRET` tokens as a legacy fallback (correct behavior — existing users must not be logged out without warning).

3. **Token lifetime:** LOOP_JWT_SECRET tokens have a 30-day TTL. Any tokens issued before 2026-06-06 (the SEC-003 commit) are valid until they expire. The last tokens were issued at most 30 days before that, so the last LOOP_JWT_SECRET token expires by **2026-07-06**.

4. **Messenger does NOT accept LOOP_JWT_SECRET tokens.** Only loop-api accepts them.

---

## 6. Is LOOP_JWT_SECRET Only a Fallback?

**It was a fallback (the hardcoded literal); now it is a real required secret.**

Before SEC-003:
```typescript
const jwtSecret = c.env.LOOP_JWT_SECRET ?? "loop-dev-secret-change-in-prod";
```

After SEC-003 (commit `eca6186`):
```typescript
const jwtSecret = c.env.LOOP_JWT_SECRET;
if (!jwtSecret) {
  console.error("[auth/verify-otp] LOOP_JWT_SECRET is not configured — refusing to issue tokens");
  return c.json({ error: "Service configuration error. Please try again later." }, 500);
}
```

It is now required to be set in CF Secrets. If absent, OTP auth fails safely.

For the **validation path** (`/api/auth/me`), `LOOP_JWT_SECRET` is still optional:
```typescript
if (!payload && c.env.LOOP_JWT_SECRET) {
  payload = await verifyJwt(token, c.env.LOOP_JWT_SECRET);
}
```
This is correct: it only tries LOOP_JWT_SECRET if it's present, letting legacy tokens work until they expire.

---

## 7. Would Rotating LOOP_JWT_SECRET Affect Other Services?

| Service | Affected by LOOP_JWT_SECRET Rotation? | Evidence |
|---|---|---|
| **Loop** | ✅ YES — existing sessions invalidated | loop-api validates LOOP_JWT_SECRET in `/api/auth/me`. Rotating it invalidates all pre-Phase-H sessions. Users must re-login via RALD SSO. |
| **Messenger** | ❌ NO | Messenger only validates `RALD_JWT_SECRET`. LOOP_JWT_SECRET is unknown to it. |
| **Profiles** | ❌ NO | Frontend UI — delegates to auth.rald.cloud. Uses RALD_JWT_SECRET. |
| **App** | ❌ NO | Uses RALD_JWT_SECRET. |
| **Voice** | ❌ UNKNOWN | Not audited. Assumed RALD_JWT_SECRET only. |
| **Manilla** | ❌ NO | Not operational. |

**Safe rotation timeline:**
- LOOP_JWT_SECRET tokens expire by 2026-07-06 (30 days from last issuance before SEC-003)
- Rotating before that date logs out all Loop users who authenticated via phone OTP directly
- Rotation after 2026-07-06 is zero-impact (all tokens already expired)
- **Recommendation:** Rotate LOOP_JWT_SECRET after 2026-07-06, OR rotate now and accept that ~30-day-old Loop OTP sessions will be invalidated (users simply re-login via RALD SSO — which works)

---

## New Critical Finding: SEC-004

**Repo:** `Ostinato-Loop/rald`
**File:** `artifacts/api-server/src/lib/auth.ts`
**Line:** 3

```typescript
const JWT_SECRET = process.env.RALD_JWT_SECRET || "rald-dev-secret-change-in-production";
```

This is the same class of vulnerability as SEC-003. The rald console's Express API server falls back to a public literal if `RALD_JWT_SECRET` is not in the process environment.

**Severity:** CRITICAL (if this server is reachable from the internet with the fallback active)
**Fix:** Same pattern as SEC-003 — fail at startup if the secret is missing. Committed in this sprint (see SEC-004 commit).

---

## Trust Chain Diagram

```
┌─────────────────────────────────────────────────────────────┐
│              RALD JWT TRUST CHAIN (HS256)                   │
└─────────────────────────────────────────────────────────────┘

ISSUERS (sign with RALD_JWT_SECRET)
┌─────────────────────┐      ┌──────────────────────────┐
│  auth.rald.cloud    │      │  rald api-server (Express)│
│  (PRIMARY)          │      │  ⚠️ SEC-004 fallback      │
│  • /auth/login      │      │  • internal console only  │
│  • /auth/register   │      └──────────────────────────┘
│  • /sso/exchange    │
│  • /sso/handoff     │      LEGACY ISSUER (DEPRECATED)
│  No fallback ✅     │      ┌──────────────────────────┐
└────────┬────────────┘      │  loop-api (OTP path)     │
         │                   │  LOOP_JWT_SECRET          │
         │ RALD_JWT_SECRET   │  SEC-003 ✅ patched       │
         ▼                   │  Expires: 2026-07-06      │
                             └──────────┬───────────────┘
VALIDATORS                             │
┌─────────────────────┐                │ LOOP_JWT_SECRET
│  auth.rald.cloud    │◄───────────────┘ (legacy only)
│  loop-api.rald.cloud│◄── RALD_JWT_SECRET (primary)
│  messenger.rald.cloud│◄── RALD_JWT_SECRET only
│  rald api-server    │◄── RALD_JWT_SECRET (SEC-004)
└─────────────────────┘

ROTATION IMPACT MATRIX:
  RALD_JWT_SECRET rotation → ALL services affected → coordinate carefully
  LOOP_JWT_SECRET rotation → Loop legacy sessions only → safe after 2026-07-06
```

---

## Rotation Guidance

### RALD_JWT_SECRET Rotation
**Risk:** HIGH — affects ALL services simultaneously
**Coordination required:**
1. Update in CF Secrets for: `rald-auth` worker, `loop-api` worker, `messenger-api` worker, `rald` api-server env
2. All must be updated atomically (within the same deployment window)
3. Existing sessions (24h TTL) will be invalidated — users must re-login
4. Recommended approach: rotate during low-traffic window; post maintenance notice

### LOOP_JWT_SECRET Rotation
**Risk:** LOW — affects Loop legacy sessions only
**Recommendation:** Rotate any time. Users simply re-login via RALD SSO. After 2026-07-06, rotation has zero impact.
**Steps:**
1. Generate: `openssl rand -hex 32`
2. CF Dashboard → Workers & Pages → `loop-api` → Settings → Variables → Update `LOOP_JWT_SECRET`
3. Redeploy: `wrangler deploy --env production`

---

## Findings Summary

| ID | Severity | Finding | Status |
|---|---|---|---|
| SEC-003 | CRITICAL | Loop OTP JWT hardcoded fallback `"loop-dev-secret-change-in-prod"` | ✅ **FIXED** — commit `eca6186` |
| SEC-004 | CRITICAL | rald api-server hardcoded fallback `"rald-dev-secret-change-in-production"` | ✅ **FIXED** — this sprint |
| JWT-001 | HIGH | HS256 shared secret — any holder can forge tokens | Architecture decision; document and monitor |
| JWT-002 | HIGH | No JWKS endpoint — consuming services cannot rotate without coordination | Accept for now; plan RS256 migration |
| JWT-003 | HIGH | LOOP_JWT_SECRET tokens have 30-day TTL — long revocation window | Expires naturally 2026-07-06 |
| JWT-004 | MEDIUM | No `jti` claim — no per-token revocation (only user-level via KV) | Post-launch engineering work |
| JWT-005 | MEDIUM | voice.rald.cloud JWT validation not audited | Audit in next sprint |
| JWT-006 | LOW | rald api-server uses Node.js `crypto` not Web Crypto — different runtime assumptions | Not a security issue; documentation |
