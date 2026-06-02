# FINAL_SECURITY_AUDIT.md
**Phase:** G.9 — Pre-Production Certification  
**Workstream:** 4 — Security Certification  
**Owner:** LILCKY STUDIO LIMITED  
**Date:** 2026-06-02  
**Evidence Source:** GitHub — Ostinato-Loop org  
**Target:** CRITICAL = 0, HIGH = 0

---

## 1. HARDCODED SECRETS AUDIT

| Repo | File | Finding | Status |
|---|---|---|---|
| `rald-auth-core` | `wrangler.toml` | `[vars]` section has only `ENVIRONMENT = "production"`. All secrets documented as `wrangler secret put`. No values in source. | ✅ CLEAN |
| `rald` (api-worker) | `wrangler.toml` | `[vars]` has `ENVIRONMENT = "production"`. KV namespace `id` is non-secret (infra ID). All secrets documented. | ✅ CLEAN |
| `loop` | `wrangler.toml` | Not read directly — deploy.yml injects `VITE_SUPABASE_URL` as `https://onxdcikfttdmnhofsuwo.supabase.co` in the workflow. This is the **project URL** (not a secret), but it does expose the Supabase project ID. | ⚠️ INFO |
| `loop` | `artifacts/loop/.env.development` `.env.production` | Files committed to repository. Content unknown — likely contains `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (anon key). | ⚠️ HIGH RISK |
| `messenger` | `workers/loop-messenger-api/wrangler.toml` | Service URLs in `[vars]` (not secrets). Secrets documented only as comments. | ✅ CLEAN |
| `rald-auth-sdk` | `src/index.ts` | No credentials. `baseUrl` defaults to `https://auth.rald.cloud`. | ✅ CLEAN |

**FINDING (HIGH — WS4-F1):** `loop` repository has `.env.development` and `.env.production` committed. The Supabase anon key (`VITE_SUPABASE_PUBLISHABLE_KEY`) exposed in these files grants public read access to the Supabase project (with RLS as the only guard). Must be rotated and removed.

**FINDING (INFO — WS4-F2):** `deploy.yml` in `loop` contains the Supabase project URL in plaintext: `https://onxdcikfttdmnhofsuwo.supabase.co`. This is the project URL (expected for front-end); not a credential by itself but exposes the project ID.

---

## 2. STARTUP SECRET VALIDATION

### rald-auth-core
```typescript
app.get("/ready", (c) => c.json({
  ready: !!(c.env.SUPABASE_URL && c.env.RALD_JWT_SECRET && c.env.RESEND_API_KEY),
  checks: {
    supabase: !!c.env.SUPABASE_URL && !!c.env.SUPABASE_SERVICE_ROLE_KEY,
    jwt: !!c.env.RALD_JWT_SECRET,
    termii: !!c.env.TERMII_API_KEY,
    resend: !!c.env.RESEND_API_KEY,
    clerk: !!c.env.CLERK_SECRET_KEY && !!c.env.CLERK_PUBLISHABLE_KEY,
  }
}));
```
Validates 5 required secrets on demand. Does not fail-fast at startup (CF Workers have no startup lifecycle). **PARTIAL PASS.**

**FINDING (MEDIUM — WS4-F3):** `send-otp` falls back to dev mode (`pinId: "dev-mode-pin-id"`) when `TERMII_API_KEY` is absent: `if (!c.env.TERMII_API_KEY) { console.log('[DEV] SMS OTP...'); return pinId: "dev-mode-pin-id" }`. If `TERMII_API_KEY` is not set in production, anyone can authenticate with OTP `123456`. This dev fallback must be gated on `ENVIRONMENT !== "production"`.

### rald/api-worker
```typescript
// artifacts/api-worker/src/index.ts (startup error handling)
// PORT env var validated at startup: throws if missing or non-numeric (Express server)
```
Express server throws on invalid PORT — fail-fast. ✅

### Messenger (CF Worker)
No `/ready` endpoint. No startup secret validation. **FINDING (MEDIUM — WS4-F4).**

---

## 3. OTP ABUSE PROTECTION

### rald-auth-core (`auth.rald.cloud`)
**OTP send:** No per-phone send rate limit in source code. Termii enforces `pin_attempts: 3` on *verification* only — not on sending.  
**FINDING (HIGH — WS4-F5):** An attacker can call `POST /auth/send-otp` unlimited times per phone, each triggering a Termii SMS. No KV rate limit applied. Could drain Termii balance and flood victim's phone.

**Remediation:** Add KV-backed rate limit: 3 sends per phone per 10 minutes (pattern exists in `rald/artifacts/api-worker/src/lib/rate-limit.ts`).

### rald/api-worker (`api.rald.cloud`)
```typescript
// RATE_LIMITS.otpSend(identifier): 5 per 10 min per phone
// RATE_LIMITS.login(ip): 10 per 15 min per IP
// RATE_LIMITS.register(ip): 5 per hour per IP
// RATE_LIMITS.passwordReset(email): 3 per 15 min
const { allowed } = await checkRateLimit(c.env.RATE_LIMIT_KV, RATE_LIMITS.otpSend(phone));
if (!allowed) return c.json({ error: "Too many requests. Try again later." }, 429);
```
Rate limiting implemented via Cloudflare KV sliding window. ✅

### Messenger (Express api-server)
```typescript
// Single-outstanding-OTP check:
const recent = await db.select()...where(phone + expires > now).limit(1);
if (recent.length > 0) return 429 { cooldownSeconds }
```
Prevents concurrent OTPs. Not a true rate limiter (10-minute expiry window is the gate). ⚠️

---

## 4. BRUTE-FORCE PROTECTION

### rald-auth-core
- Password login: No brute-force protection. No lockout after N failed attempts.  
**FINDING (HIGH — WS4-F6):** `POST /auth/login` has no rate limit and no lockout. An attacker can try unlimited passwords for a known email.

### rald/api-worker
- `RATE_LIMITS.login(ip)`: 10 attempts per 15 min per IP. ✅

### Messenger
- OTP has no attempt counter at the Express layer (Termii handles 3 attempts per pinId). ✅ (via Termii)

---

## 5. REDIRECT VALIDATION

### rald-auth-core (Clerk exchange)
```typescript
const APP_REDIRECTS: Record<string, string> = {
  "rald-app": "https://app.rald.cloud", ...
};
// appId must be in APP_REDIRECTS. User-controlled redirectTo is used as base URL only.
const redirectUrl = new URL(baseUrl); // throws if invalid URL
redirectUrl.searchParams.set("__clerk_ticket", signInToken.token);
```
Allowlist-based redirect. No open redirect possible. ✅

### Loop
```typescript
setTimeout(() => { window.location.href = data.is_new_user ? "/onboarding" : "/" }, 900);
```
Hardcoded local paths. No external redirect. ✅

### Messenger
```typescript
if (res.isNewUser) setLocation("/onboarding"); else setLocation("/chats");
```
Hardcoded local paths. ✅

**Redirect Validation Verdict:** ✅ PASS across all apps.

---

## 6. SESSION SECURITY

| Property | rald-auth-core | Loop | Messenger |
|---|---|---|---|
| JWT algorithm | HMAC-SHA256 | HMAC-SHA256 | HMAC-SHA256 |
| JWT expiry | 24h (86400s) | Not explicit (inherits) | Not explicit |
| Session in DB | ✅ `auth_sessions` | ❌ Stateless | ❌ Stateless |
| Session revocation | ✅ `revoked_at` | ❌ Not implemented | ❌ Not implemented |
| Token in localStorage | N/A | ✅ (standard for SPA) | ✅ (standard for SPA) |
| HttpOnly cookie | ❌ Not used | ❌ Not used | ❌ Not used |
| Secure cookie | ❌ Not used | ❌ Not used | ❌ Not used |

**FINDING (MEDIUM — WS4-F7):** No service uses HttpOnly cookies for token storage. `localStorage` tokens are vulnerable to XSS. Given the applications are running on Cloudflare Workers + CDN with strict CORS, XSS risk is low but not zero. For campus pilot, `localStorage` is acceptable; for public beta it should be revisited.

**FINDING (MEDIUM — WS4-F8):** JWT revocation in `rald-auth-core` marks `auth_sessions.revoked_at` but does not invalidate the stateless JWT. A revoked session's JWT remains valid until `exp`. No token blacklist exists.

---

## 7. ENVIRONMENT ISOLATION

| Repo | Isolation Mechanism | Status |
|---|---|---|
| rald-auth-core | Single `wrangler.toml`. `ENVIRONMENT = "production"`. Dev mode gates on `!TERMII_API_KEY`. | ⚠️ PARTIAL |
| rald/api-worker | Single wrangler config. `ENVIRONMENT = "production"`. | ⚠️ PARTIAL |
| Loop | `VITE_DEV_MODE_MOCK_OTP: "false"` set in deploy.yml for production build. | ✅ |
| Messenger (Express) | `process.env.NODE_ENV !== "production"` gate on dev OTP bypass. | ✅ |

**FINDING (MEDIUM — WS4-F9):** rald-auth-core dev fallback (OTP 123456) is gated on `!TERMII_API_KEY`, not on `ENVIRONMENT !== "production"`. If `TERMII_API_KEY` is accidentally not set in production CF secrets, anyone can log in with `123456`.

---

## 8. SECRET ROTATION PROCEDURES

**Documented in:** `rald/docs/DEPLOYMENT_STATUS.md`  
- Documents which secrets are needed per service
- Documents `wrangler secret put <NAME>` rotation procedure
- No automated rotation or rotation schedule defined

**FINDING (LOW — WS4-F10):** No secret rotation schedule or automated rotation procedure exists. `RALD_JWT_SECRET` rotation requires coordinated redeployment of all services that share the secret.

---

## 9. FINDINGS SUMMARY

| ID | Severity | Finding |
|---|---|---|
| WS4-F1 | HIGH | Loop `.env.development` + `.env.production` committed to repository — Supabase anon key likely exposed |
| WS4-F5 | HIGH | `rald-auth-core` `send-otp` has no rate limit — unlimited SMS sends per phone |
| WS4-F6 | HIGH | `rald-auth-core` `login` has no brute-force protection — unlimited password attempts |
| WS4-F3 | MEDIUM | Dev OTP fallback (pin 123456) gated on `!TERMII_API_KEY` not `ENVIRONMENT !== production` |
| WS4-F4 | MEDIUM | Messenger CF Worker has no `/ready` secret validation endpoint |
| WS4-F7 | MEDIUM | All tokens stored in `localStorage` — no HttpOnly cookie option |
| WS4-F8 | MEDIUM | JWT revocation does not invalidate active JWTs (session row ≠ JWT blacklist) |
| WS4-F9 | MEDIUM | rald-auth-core environment isolation incomplete — dev bypass gated on key presence |
| WS4-F2 | INFO | Supabase project URL exposed in `loop` deploy.yml |
| WS4-F10 | LOW | No secret rotation schedule documented |

---

## CERTIFICATION DECISION

```
╔══════════════════════════════════════════════╗
║  WS4 — FINAL SECURITY AUDIT                  ║
║  CRITICAL: 0  HIGH: 3  MEDIUM: 5  LOW: 1    ║
║                                              ║
║  TARGET: CRITICAL=0, HIGH=0                  ║
║  DECISION: ❌  FAIL (3 HIGH findings)         ║
║                                              ║
║  Must fix before ANY user launch:            ║
║  1. Remove .env files from loop repo         ║
║  2. Add rate limit to send-otp (auth-core)   ║
║  3. Add brute-force protection to login      ║
╚══════════════════════════════════════════════╝
```

LILCKY STUDIO LIMITED — RALD G.9 Certification | 2026-06-02
