# DISASTER_RECOVERY_CERTIFICATION.md
**Phase:** G.9 — Pre-Production Certification  
**Workstream:** 5 — Failure & Disaster Simulation  
**Owner:** LILCKY STUDIO LIMITED  
**Date:** 2026-06-02  
**Evidence Source:** GitHub — Ostinato-Loop org (source code only — no live failure injection performed)

---

## SIMULATION METHOD

All simulations are **static code analysis** of failure handling paths. No live fault injection was performed. Evidence citations reference actual source code.

---

## SIMULATION 1 — TERMII UNAVAILABLE

### rald-auth-core
```typescript
// src/routes/auth.ts — send-otp
try {
  const { pinId } = await sendSmsOtp(phone, c.env.TERMII_API_KEY, senderId);
  return c.json({ pinId, message: "Verification code sent" });
} catch (err) {
  console.error("SMS OTP error:", err);
  return c.json({ error: err.message ?? "Failed to send code. Try again." }, 502);
}
```
- **Failure response:** HTTP 502 with user-friendly error message. ✅
- **User impact:** OTP cannot be sent. Error displayed. User can retry. ✅
- **Recovery:** Automatic — next retry calls Termii again. No manual intervention. ✅
- **Dev fallback:** `if (!c.env.TERMII_API_KEY)` → pin `123456`. ⚠️ Must be production-gated (WS4-F3).

### rald/api-worker (Termii + Twilio fallback)
```typescript
// src/lib/otp.ts — sendSmsOtp()
// Tries Termii first; falls back to Twilio on failure
try {
  return await sendTermiiSmsOtp(phone, env.TERMII_API_KEY);
} catch (termiiErr) {
  if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN) {
    return await sendTwilioSmsOtp(phone, code, env.TWILIO_ACCOUNT_SID, ...);
  }
  throw termiiErr;
}
```
- **Primary failure → Twilio fallback:** Automatic. ✅
- **Both fail:** Error propagated to route → 502 returned. ✅
- **Result:** api-worker has better SMS resilience than rald-auth-core. **PASS.**

### Loop (Cloudflare Worker)
```typescript
// routes/auth.ts — send-otp
// Sends to Termii directly. No try/catch in visible code beyond generic error handler.
app.onError((err, c) => c.json({ error: env.ENVIRONMENT === "production" ? "Internal error" : err.message }, 500));
```
- **Failure response:** Generic 500. ⚠️ Not user-friendly.

### Messenger (Express api-server)
```typescript
const smsResult = await sendTermiiOtp(phone, code);
if (!smsResult.ok) {
  logger.warn({ errMsg: smsResult.error }, "SMS OTP delivery failed");
  if (process.env.NODE_ENV !== "production") {
    return res.json({ message: "OTP sent (dev mode)", devOtp: code });
  }
  await db.delete(otpRequestsTable).where(eq(otpRequestsTable.id, inserted.id));
  return res.status(502).json({ error: "SMS delivery failed. Please try again." });
}
```
- **Failure:** OTP record deleted (user can retry), 502 with message. ✅
- **Dev bypass:** Correctly gated on `NODE_ENV !== "production"`. ✅

**Termii Failure Verdict:** ✅ PASS (rald/api-worker has Twilio fallback). ⚠️ rald-auth-core and Loop Worker return errors without fallback.

---

## SIMULATION 2 — RESEND UNAVAILABLE

### rald-auth-core
```typescript
// Email OTP
try {
  await sendLoginEmailOtp(email, code, c.env.RESEND_API_KEY);
  return c.json({ sessionToken, message: "Verification code sent" });
} catch (err) {
  return c.json({ error: "Failed to send verification email. Try again." }, 502);
}

// Welcome email (non-blocking)
if (c.env.RESEND_API_KEY)
  sendWelcomeEmail(...).catch(console.error);  // Non-blocking: failure does not affect registration
```
- **Email OTP failure:** 502 with user-friendly message. ✅
- **Welcome email failure:** Silent — does not affect registration or login. ✅
- **Password reset email failure:** `sendEmailOtp().catch(e => console.error(...))` — non-blocking.
  - **FINDING (MEDIUM — WS5-F1):** Password reset email failure is silent — user receives "code sent" but email was never delivered. User cannot distinguish "Resend is down" from "check your spam".

**Resend Failure Verdict:** ✅ PASS (non-critical paths fail silently with log). ⚠️ Password reset silent failure is confusing UX.

---

## SIMULATION 3 — SUPABASE UNAVAILABLE

### rald-auth-core
```typescript
// auth.ts — /auth/login
const { data: users } = await db.from("auth_users")...
// No explicit try/catch — Supabase PostgREST returns error object
// Unhandled Supabase connection error → propagates to:
app.onError((err, c) => {
  console.error("[RALD Auth Error]", err.message ?? err);
  return c.json({ error: "Internal server error" }, 500);
});
```
- **Failure response:** Generic 500. ⚠️ No user-friendly message.
- **Sessions:** Auth operations fail entirely.
- **No circuit breaker:** No retry logic, no cache fallback.

**FINDING (HIGH — WS5-F2):** Supabase unavailability causes 500s across all auth endpoints with no graceful degradation. `GET /ready` can be used to detect this state but no automated circuit breaker exists.

### Loop
- Supabase failure on `verify-otp` → 500 → generic error shown.
- Supabase Realtime for rooms → connections drop silently; UI should handle reconnect.

### Messenger (CF Worker)
```typescript
const db = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
// Per-request client — no connection pooling
// Supabase failure → Supabase error object returned → routes return 500
app.onError((err, c) => c.json({ error: "Internal server error" }, 500));
```
- Generic 500 on Supabase failure. ⚠️

**Supabase Failure Verdict:** ⚠️ PARTIAL — Services return 500, no data corruption risk. No graceful degradation or circuit breaker.

---

## SIMULATION 4 — CLOUDFLARE KV UNAVAILABLE

### rald/api-worker rate limiter
```typescript
export async function checkRateLimit(kv: KVNamespace | undefined, ...): Promise<RateLimitResult> {
  if (!kv) {
    // No KV configured — allow all in dev mode
    return { allowed: true, remaining: config.limit, resetAt: ... };
  }
  // KV write failure is non-fatal:
  try {
    await kv.put(kvKey, JSON.stringify(timestamps), { expirationTtl: ... });
  } catch { /* KV write failure is non-fatal */ }
}
```
- KV read failure: `timestamps = []` (empty array) — rate limit resets. ⚠️ Allows through all requests.
- KV write failure: Non-fatal, rate limit state lost. ⚠️

**KV Failure Verdict:** ✅ Service remains operational (fails open). Rate limiting becomes ineffective during KV outage. Acceptable for campus pilot scale.

---

## SIMULATION 5 — WORKER DEPLOYMENT FAILURE

### CI/CD evidence (`rald-auth-core/.github/workflows/deploy.yml`)
```yaml
- name: Type check
  run: npm run typecheck  # Fails deploy if types broken
- name: Deploy rald-auth Worker
  run: npx wrangler deploy
  # Wrangler deploy is atomic — previous version stays live on failure
```

### Loop deploy (`loop/.github/workflows/deploy.yml`)
```yaml
concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: true  # New push cancels in-flight deploy
jobs:
  typecheck → deploy-worker
  typecheck → deploy-pages
```

**Deployment rollback:** Cloudflare Workers deployment is atomic. If `wrangler deploy` fails, the previous worker version continues serving. Previous versions are available for instant rollback via CF dashboard. ✅

**FINDING (MEDIUM — WS5-F3):** No automated rollback trigger exists. Manual rollback requires: Cloudflare dashboard → Workers → Deployments → Roll back. No runbook for this procedure documented in any repo.

---

## SIMULATION 6 — EXPIRED SECRETS

### JWT secret expiry (secrets don't expire, but if rotated incorrectly)
If `RALD_JWT_SECRET` is changed without a rollout window:
- All existing JWTs become invalid immediately
- All active users are logged out ecosystem-wide
- No grace period for old tokens

**FINDING (HIGH — WS5-F4):** No secret rotation procedure documented. Rotating `RALD_JWT_SECRET` requires: (a) coordinating all workers that share it, (b) accepting a brief logout of all users. No dual-key rotation window implemented.

### Missing secrets at runtime
```typescript
// rald-auth-core: dev fallback
if (!c.env.TERMII_API_KEY) → OTP bypass (pin 123456)
// If RALD_JWT_SECRET missing → signJwt() would fail with crypto error → 500
// If SUPABASE_URL missing → db queries fail → 500
```
- Missing `RALD_JWT_SECRET`: All authenticated operations fail (500). ✅ (fail-closed)
- Missing `TERMII_API_KEY`: Falls back to dev mode. ⚠️ (fail-open for auth)

---

## SIMULATION 7 — DNS FAILURE

### Impact per service
| Service | DNS Dependency | Failure Impact |
|---|---|---|
| `auth.rald.cloud` | Cloudflare proxied | CF-layer failure; very unlikely. |
| `messenger.rald.cloud` | Cloudflare proxied | Same. |
| `loop.rald.cloud` | Cloudflare Pages | Same. |
| `crm.rald.cloud` | Not confirmed deployed | Service unavailable. |
| `notification.rald.cloud` | Not confirmed deployed | Messenger notifications fail silently (try/catch). |
| `search.rald.cloud` | Not confirmed deployed | Messenger search fails silently (try/catch). |

**Messenger integration resilience:**
```typescript
// lib/notify.ts, lib/search.ts, lib/crm.ts — all wrapped in try/catch
try {
  await fetch(`${notifyUrl}/notifications`, ...);
} catch (e) {
  console.error("[messenger] notify trigger failed:", String(e));
}
```
Messenger continues to function if `rald-notify`, `rald-search`, or `crm.rald.cloud` are unreachable. ✅

---

## RECOVERY PROCEDURES INVENTORY

| Procedure | Documented | Location |
|---|---|---|
| Worker rollback | ⚠️ Implicit (CF dashboard) | No explicit runbook |
| Secret rotation | ⚠️ Partial (DEPLOYMENT_STATUS.md lists secrets) | No rotation procedure |
| Supabase restore | ❌ Not documented | No runbook |
| DNS failure recovery | ❌ Not documented | No runbook |
| Incident escalation | ❌ Not documented | No runbook |

**FINDING (HIGH — WS5-F5):** No recovery runbook exists for any failure scenario. `RECOVERY_RUNBOOK.md` (WS10) addresses this.

---

## FINDINGS SUMMARY

| ID | Severity | Finding |
|---|---|---|
| WS5-F2 | HIGH | Supabase unavailability causes raw 500s with no graceful degradation |
| WS5-F4 | HIGH | No `RALD_JWT_SECRET` rotation procedure — mass user logout risk on rotation |
| WS5-F5 | HIGH | No documented recovery runbooks for any failure scenario |
| WS5-F1 | MEDIUM | Password reset email failure is silent — user receives "code sent" with no delivery |
| WS5-F3 | MEDIUM | Worker rollback procedure not documented — relies on CF dashboard knowledge |

---

## CERTIFICATION DECISION

```
╔══════════════════════════════════════════════╗
║  WS5 — DISASTER RECOVERY CERTIFICATION       ║
║  CRITICAL: 0  HIGH: 3  MEDIUM: 2  LOW: 0    ║
║  DECISION: ❌  FAIL                           ║
║                                              ║
║  Termii: PASS (api-worker has Twilio fallback)║
║  Resend: PASS (non-blocking failures)        ║
║  KV outage: PASS (fails open safely)         ║
║  Supabase: FAIL (raw 500s, no degradation)   ║
║  Recovery runbooks: FAIL (none exist)        ║
╚══════════════════════════════════════════════╝
```

LILCKY STUDIO LIMITED — RALD G.9 Certification | 2026-06-02
