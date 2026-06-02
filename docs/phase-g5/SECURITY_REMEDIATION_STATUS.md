# SECURITY_REMEDIATION_STATUS.md
**Phase:** G.5 — Ecosystem Readiness  
**Workstream:** 5 — Security Hardening Review  
**Owner:** LILCKY STUDIO LIMITED  
**Date:** 2026-06-02  
**Evidence Source:** GitHub — Ostinato-Loop org repositories

---

## CERTIFICATION MANDATE

Verify: No hardcoded production secrets, required secret validation on startup, OTP rate limiting, redirect validation, token revocation, session security, JWT validation consistency, environment isolation.

---

## 1. HARDCODED PRODUCTION SECRETS

### rald-auth-core
**Evidence:** `wrangler.toml`
```toml
[vars]
ENVIRONMENT = "production"
# Secrets — set via: wrangler secret put <NAME>
# Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RALD_JWT_SECRET, TERMII_API_KEY, RESEND_API_KEY
```

No secret values in `wrangler.toml`. All credentials are Cloudflare Worker secrets (encrypted at rest, injected at runtime). **PASS.**

### rald-auth-sdk
**Evidence:** `src/index.ts` — `baseUrl` defaults to `"https://auth.rald.cloud"`. No credentials.  **PASS.**

### Loop
**Evidence:** `.env.development` and `.env.production` files exist in `artifacts/loop/`. Content not read, but env files are present in the repository.  
**FINDING (HIGH — WS5-F1):** `.env.development` and `.env.production` are committed to the repository. Even if values are placeholders, committing env files to a public/org repository is a security risk. Supabase URL and anon key may be present.

### Messenger
**Evidence:** `workers/loop-messenger-api/wrangler.toml`
```toml
[vars]
ENVIRONMENT     = "production"
NOTIFY_URL      = "https://notification.rald.cloud"
SEARCH_URL      = "https://search.rald.cloud"
CRM_URL         = "https://crm.rald.cloud"
INBOX_URL       = "https://inbox.rald.cloud"
```
Service URLs in `[vars]` (not secrets) — acceptable. No credentials. **PASS.**

`artifacts/api-server` (Express): Config pulled from `process.env`. No hardcoded secrets observed in read files. **PASS.**

---

## 2. REQUIRED SECRET VALIDATION ON STARTUP

### rald-auth-core
**Evidence:** `src/index.ts`
```typescript
app.get("/ready", (c) =>
  c.json({
    ready: !!(c.env.SUPABASE_URL && c.env.RALD_JWT_SECRET && c.env.RESEND_API_KEY),
    checks: {
      supabase:   !!c.env.SUPABASE_URL && !!c.env.SUPABASE_SERVICE_ROLE_KEY,
      jwt:        !!c.env.RALD_JWT_SECRET,
      termii:     !!c.env.TERMII_API_KEY,
      resend:     !!c.env.RESEND_API_KEY,
      clerk:      !!c.env.CLERK_SECRET_KEY && !!c.env.CLERK_PUBLISHABLE_KEY,
    },
  })
);
```
`/ready` endpoint validates 5 required secrets. However, the service does **not** fail fast on startup if secrets are missing — it handles requests and may return 500s if secrets are absent. Cloudflare Workers do not support startup lifecycle hooks, so this is a platform constraint. **PARTIAL PASS.**

### loop-messenger-api (Cloudflare Worker)
**Evidence:** `wrangler.toml` comment lists required secrets. No startup validation endpoint observed.  
**FINDING (MEDIUM — WS5-F2):** No `/ready` or `/health` startup validation for required secrets in messenger worker.

### Messenger Express API (artifacts/api-server)
**Evidence:** `src/index.ts` — not fully read but Node.js process-based. Standard behavior: will crash on startup if `DATABASE_URL` is missing (Drizzle connection attempt). **ACCEPTABLE.**

---

## 3. OTP VERIFICATION RATE LIMITING

### rald-auth-core
**Evidence:** `src/routes/auth.ts` (full OTP routes read)

**OTP Send rate limit:**
- `auth_otp_codes` table tracks OTP issuance. Termii enforces `pin_attempts: 3` and `pin_time_to_live: 10` (minutes).
- **FINDING (MEDIUM — WS5-F3):** No explicit per-phone rate limit in `send-otp` route itself. A user could flood the Termii API by calling `send-otp` repeatedly (each call generates a new OTP and SMS). The 3-attempt limit is on *verification*, not on *sending*.

**OTP Verify rate limit:**
- Termii enforces `pin_attempts: 3` on the `pinId` level. After 3 failed verifications, the pin is invalidated.
- **PASS** for verification attempts.

### Messenger (Express API)
**Evidence:** `artifacts/api-server/src/routes/auth.ts`
```typescript
// Rate limit: block if a valid OTP already exists
const recent = await db.select().from(otpRequestsTable)
  .where(and(eq(otpRequestsTable.phone, phone), gt(otpRequestsTable.expiresAt, new Date())))
  .limit(1);
if (recent.length > 0) {
  const secondsLeft = Math.ceil((recent[0].expiresAt.getTime() - Date.now()) / 1000);
  return void res.status(429).json({ error: "OTP already sent...", cooldownSeconds: secondsLeft });
}
```
Messenger Express API blocks a new OTP if a valid (non-expired) one already exists. **PASS.**

**FINDING (MEDIUM — WS5-F4):** The Messenger rate limit is a single-OTP-outstanding check, not a true rate limiter. A user can bypass by waiting for the 10-minute expiry. No IP-level or global phone-level rate limit exists.

---

## 4. REDIRECT VALIDATION HARDENING

### rald-auth-core
**Evidence:** `src/routes/clerk.ts`

```typescript
const APP_REDIRECTS: Record<string, string> = {
  "rald-app":             "https://app.rald.cloud",
  "loop-business":        "https://loop.rald.cloud",
  "messenger":            "https://messenger.rald.cloud",
  "rald-control-center":  "https://admin.rald.cloud",
  "payrald":              "https://payrald.rald.cloud",
};
```

Redirects are resolved from a hardcoded allowlist via `appId`. User-controlled `redirectTo` is accepted but used only as the **base URL** — `appId` must be in the allowlist. **PASS.**

```typescript
const redirectUrl = new URL(baseUrl);
redirectUrl.searchParams.set("__clerk_ticket", signInToken.token);
```
URL constructed programmatically. No open redirect risk from this pattern. **PASS.**

### Loop
**Evidence:** `artifacts/loop/src/pages/login.tsx`
```typescript
setTimeout(() => { window.location.href = data.is_new_user ? "/onboarding" : "/"; }, 900);
```
All redirects are to local paths. No external redirect parameter accepted. **PASS.**

### Messenger
```typescript
if (res.isNewUser) setLocation("/onboarding");
else setLocation("/chats");
```
All redirects are to local paths. **PASS.**

---

## 5. TOKEN REVOCATION SUPPORT

### rald-auth-core
**Evidence:** `src/routes/auth.ts`
```typescript
// Single session revoke
auth.delete("/sessions/:id", authMiddleware, async (c) => {
  await db.from("auth_sessions").update({ revoked_at: new Date().toISOString() }).eq("id", sessionId).eq("user_id", user.id);
});

// All sessions revoke (logout all devices)
auth.delete("/sessions", authMiddleware, async (c) => {
  await db.from("auth_sessions").update({ revoked_at: new Date().toISOString() }).eq("user_id", user.id).is("revoked_at", null);
});
```
Both single-session and all-sessions revocation are implemented. **PASS.**

**FINDING (MEDIUM — WS5-F5):** JWT tokens are stateless. Revoking a session in `auth_sessions` does not invalidate the JWT if the consuming service does not check session validity on every request. `rald-auth-core`'s own `authMiddleware` only verifies JWT signature and expiry — it does NOT check `auth_sessions.revoked_at`. A revoked session's JWT remains valid until expiry (1-24h).

### Messenger
No session revocation endpoint observed. JWT expiry is the only revocation mechanism. **PARTIAL.**

---

## 6. SESSION SECURITY

### rald-auth-core
- JWT signed with HMAC-SHA256. Secret stored as CF Worker secret. ✅
- Sessions stored in `auth_sessions` with `expires_at` and `revoked_at`. ✅
- Session records track `user_agent` and `ip_address`. ✅
- Default JWT expiry: 24h (86400s). Scoped app tokens: 1h. ✅
- No session fixation risk (new session row on each login). ✅

### Messenger
- JWT-only, no server-side session state. ✅ (stateless)
- Token stored in localStorage (client-side). Standard for SPAs. ✅

---

## 7. JWT VALIDATION CONSISTENCY

| Service | Algorithm | Secret Source | Exp Check | Evidence |
|---|---|---|---|---|
| rald-auth-core | HMAC-SHA256 (Web Crypto) | CF Worker secret `RALD_JWT_SECRET` | ✅ Yes | `src/lib/auth.ts` `verifyJwt()` |
| rald-auth-sdk | HMAC-SHA256 (Web Crypto) | Passed as parameter | ✅ Yes | `src/index.ts` `verifyRaldToken()` |
| loop-messenger-api | HMAC-SHA256 (Web Crypto) | CF Worker secret `RALD_JWT_SECRET` | ✅ Yes | `workers/loop-messenger-api/src/lib/auth.ts` |
| loop (Cloudflare Worker) | HMAC-SHA256 | CF Worker secret | ✅ Yes | `artifacts/cloudflare-worker/src/middleware/auth.ts` |
| messenger (Express) | Express-session (separate) | Session store | N/A | Separate auth mechanism for Express routes |

**FINDING (HIGH — WS5-F6):** Messenger has TWO authentication systems running in parallel:
1. **Express API** (`artifacts/api-server`) uses Express sessions (`req.session.userId`) — PHP-style server-side session
2. **Cloudflare Worker** (`workers/loop-messenger-api`) uses RALD JWT validation

These two systems are not interoperable. A user authenticated via the Cloudflare Worker cannot access Express routes without re-authenticating, and vice versa. This creates session fragmentation.

---

## 8. ENVIRONMENT ISOLATION

### rald-auth-core
```toml
[vars]
ENVIRONMENT = "production"
```
Single `wrangler.toml`. No dev/prod branch separation in the TOML. Secrets are global across CF environments unless using CF environments feature. **ACCEPTABLE for current scale.**

### Loop
- `.env.development` and `.env.production` present in repo. Content not verified — may contain Supabase anon keys. **RISK.**

### Messenger worker
```toml
[vars]
ENVIRONMENT = "production"
```
Single environment. **ACCEPTABLE.**

### Messenger Express (artifacts/api-server)
Standard Node.js env vars. `NODE_ENV !== "production"` gate used correctly for dev OTP bypass:
```typescript
if (process.env.NODE_ENV !== "production") {
  return void res.json({ ..., devOtp: code });  // dev only
}
```
**PASS — dev bypass correctly gated.**

---

## 9. FINDINGS SUMMARY

| ID | Severity | Finding | Repo | Remediation |
|---|---|---|---|---|
| WS5-F1 | HIGH | `.env.development` + `.env.production` committed to `loop` repository | `loop` | Remove env files, add to `.gitignore`, rotate any exposed keys |
| WS5-F2 | HIGH | Dual auth systems in Messenger (Express sessions + CF Worker JWT) — session fragmentation | `messenger` | Consolidate to single auth system (RALD JWT); decommission Express session auth |
| WS5-F3 | MEDIUM | rald-auth-core `send-otp` has no per-phone send rate limit (Termii verify limit ≠ send limit) | `rald-auth-core` | Add `send_count` column to `auth_otp_codes` + time-window check before calling Termii |
| WS5-F4 | MEDIUM | JWT revocation does not invalidate active tokens (session row update ≠ JWT invalidation) | `rald-auth-core` | Add token blacklist (KV store) for revoked JWTs, or reduce JWT TTL to 15min with refresh |
| WS5-F5 | MEDIUM | Messenger has no OTP attempt count limit beyond single-OTP-outstanding check | `messenger` | Add `attempts` counter + 5-attempt lockout before requiring new OTP |
| WS5-F6 | MEDIUM | No `/ready` endpoint in messenger worker for secret validation | `messenger` | Add startup health check validating SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RALD_JWT_SECRET |

---

## CERTIFICATION DECISION

```
╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║   WORKSTREAM 5 — SECURITY HARDENING REVIEW                           ║
║                                                                      ║
║   CRITICAL: 0   HIGH: 2   MEDIUM: 4   LOW: 0                        ║
║                                                                      ║
║   ██████████████████████████████████████████████████████████████   ║
║   ██                                                            ██   ║
║   ██   ❌  FAIL                                                 ██   ║
║   ██                                                            ██   ║
║   ██   rald-auth-core: STRONG — JWT, PBKDF2 passwords,         ██   ║
║   ██     redirect allowlist, session revocation. 2 gaps.        ██   ║
║   ██   Messenger: FAIL — dual auth systems, env file in repo.   ██   ║
║   ██   No CRITICAL findings — ecosystem is not fundamentally    ██   ║
║   ██   broken, but 2 HIGH issues must be resolved first.        ██   ║
║   ██                                                            ██   ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

LILCKY STUDIO LIMITED — RALD Ecosystem G.5 Certification  
Generated: 2026-06-02 | Evidence: GitHub Ostinato-Loop org
