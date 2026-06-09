# AUTH_SECURITY_CERTIFICATION.md
**RALD Auth V1 — Security Certification**
**Date:** 2026-06-09
**Version:** v2.3.0 (rald-auth-core)
**Auditor:** LILCKY STUDIO LIMITED Engineering

---

## CERTIFICATION SUMMARY

| Domain | Score | Status |
|---|---|---|
| OTP Flows | 9/10 | ✅ CERTIFIED |
| JWT Security | 7/10 | ⚠️ CONDITIONAL |
| Token Storage | 5/10 | ❌ NEEDS REMEDIATION |
| Session Management | 8/10 | ✅ CERTIFIED |
| Rate Limiting | 9/10 | ✅ CERTIFIED |
| Device Trust | 6/10 | ⚠️ PARTIAL |
| CORS & Headers | 9/10 | ✅ CERTIFIED |
| Redirect Security | 9/10 | ✅ CERTIFIED |
| Audit Logging | 9/10 | ✅ CERTIFIED |
| **OVERALL** | **7.9/10** | **⚠️ CONDITIONAL PASS** |

**Certification status: CONDITIONAL PASS — approved for private beta (≤500 users). Token storage hardening required before public beta.**

---

## 1. OTP FLOWS — 9/10 ✅

### SMS OTP (Termii — 12+ African carrier routes)

**Loop Worker (`/api/auth/send-otp`):**

Five independent rate limit layers:
```
1. Phone-level:  5 OTPs / phone / hour
2. IP send:     10 sends / IP / hour
3. IP verify:   20 verifies / IP / hour
4. Global day: 100 OTPs / calendar day
5. Abuse logging: console.warn [LOOP/ABUSE] with timestamp + phoneSuffix
```

Rate limiter: sliding-window using Cloudflare KV — correct implementation with timestamp arrays, filtered by window boundary.

OTP storage: 6-digit numeric code hashed before KV storage — raw code never persisted.

OTP expiry: 10 minutes (TTL enforced via KV expiration).

**RALD Auth Core OTP (Termii + Resend):**
- SMS OTP via `sendSmsOtp()` with Termii
- Email OTP via `sendEmailOtp()` / `sendLoginEmailOtp()` with Resend
- OTP hashed with HMAC before storage
- `verifyOtpCode()` uses constant-time comparison

**Findings:**
- ✅ Rate limiting on send + verify independently
- ✅ Global daily cap prevents abuse-driven cost spike
- ✅ OTPs hashed before storage — not reversible
- ✅ Numeric only (6 digits) — no alphabet-based OTPs that could be guessed more easily
- ⚠️ No OTP attempt count per session (a single phone+IP could retry verify up to IP limit)

---

## 2. JWT SECURITY — 7/10 ⚠️

### Algorithm

HS256 (HMAC-SHA-256) implemented in native Web Crypto API — no library dependencies.

```typescript
// Pure Web Crypto — no JWT library
async function hmacKey(secret: string): Promise<CryptoKey>
export async function signJwt(payload, secret, expiresInSeconds = 86400): Promise<string>
export async function verifyJwt(token, secret): Promise<JwtPayload | null>
```

✅ Constant-time signature verification via `crypto.subtle.verify`
✅ Expiry (`exp`) checked after signature verification
✅ No JWT library dependencies — no dependency chain vulnerabilities

### Token Lifetimes

| Token type | TTL | Storage |
|---|---|---|
| Master RALD JWT (login) | 24 hours | localStorage (`rald_master_token`) |
| App-scoped SSO token | 1 hour | localStorage (`loop_token`) / cookie |
| SSO handoff token | 5 minutes | URL param (transient) |
| OTP verification token | 10 minutes | KV (server-side) |

### JWT Claims (Standard — documented in AUDIT/jwt-claim-standard.md)

```
sub, email, role, iss ("rald.cloud"), aud, iat, exp, jti, id, phone, source
```

**Security issues:**
- ⚠️ **No `jti` blacklist checked on SSO exchange** — a revoked Loop token can still be exchanged for a fresh app token at `/sso/exchange`. Fix: check jti against KV blocklist before issuing app-scoped tokens.
- ⚠️ **Phone included in JWT body** — the JWT payload is base64-decoded (not encrypted). Any MITM or XSS attacker reading the token can see the user's phone number. Mitigation: remove phone from JWT claims; fetch from `/me` endpoint instead.
- ✅ `source: "rald-auth"` claim lets apps verify token origin
- ✅ `sso_v: 2` versioning allows future algorithm migration

---

## 3. TOKEN STORAGE — 5/10 ❌ NEEDS REMEDIATION

### Current State

| Product | Token | Storage | Risk |
|---|---|---|---|
| Loop | `loop_token` | `localStorage` | XSS — any injected script can read |
| Loop | `rald_master_token` | `localStorage` | XSS — 24h master token exposed |
| Messenger | `rald_session` | HttpOnly Cookie | ✅ XSS-safe |
| Auth Core | session cookie | `Set-Cookie` with `HttpOnly` | ✅ XSS-safe |

### Risk Assessment

**Loop's localStorage usage is the highest-priority security gap in the ecosystem.**

An XSS vulnerability in Loop (e.g. via a malicious room title, message content, or community description) would allow an attacker to:
1. Read `rald_master_token` — a 24-hour master token valid across the entire RALD ecosystem
2. Read `loop_token` — a 1-hour session token
3. Exchange the master token for app-scoped tokens for any RALD app
4. Access the user's account across Loop, Messenger, and any other RALD product

**Current XSS protections in Loop:**
- React renders content via JSX (auto-escaping for most cases)
- No `dangerouslySetInnerHTML` observed in audited components
- Room titles, descriptions, messages go through React render — escaped by default

**However:** localStorage storage violates the security standard. One future mistake (dangerouslySetInnerHTML, third-party script injection, CDN compromise) would be catastrophic.

### Required Fix

Migrate Loop token storage from localStorage to HttpOnly cookies:

```
1. Loop Worker sets: Set-Cookie: loop_token=<JWT>; HttpOnly; Secure; SameSite=Lax; Path=/
2. Frontend never reads the cookie (it's HttpOnly)
3. API calls include cookies automatically via credentials: "include"
4. Supabase authedSupabase() must be updated — fetches token via /api/auth/me instead of localStorage
5. Cross-app token passing: use /sso/handoff redirect pattern instead of URL param
```

**Timeline:** Required before public beta. Acceptable for private beta (≤500 invited users, controlled XSS surface).

---

## 4. SESSION MANAGEMENT — 8/10 ✅

### RALD Auth Core Session Infrastructure

**KV Session Store:**
- Sessions stored in `RALD_SESSION_KV` Cloudflare KV namespace
- `isSessionActive(kv, sessionId)` — checks revocation on every `GET /session` call
- `revokeKvSession(kv, sessionId)` — instant revocation
- `revokeAllUserSessions(kv, userId)` — logout everywhere
- `isUserSuspended(kv, userId)` — account suspension check

**Endpoints:**
```
GET  /session              — validate token + check KV revocation
GET  /me                   — fetch user identity
POST /logout               — revoke current session
POST /session/revoke-all   — revoke all sessions (logout everywhere)
POST /session/suspend      — admin: suspend user
```

✅ Session revocation is immediate (KV lookup on every request)
✅ Suspension checked on every session validation call
✅ Audit log written on every session event
✅ `revoke-all` endpoint enables "logout all devices" feature

**Gaps:**
- ⚠️ Loop frontend doesn't call `auth.rald.cloud/logout` on sign-out — local token cleared but server session not revoked
- ⚠️ No session refresh mechanism in Loop (1h token expires without warning)
- ⚠️ Auth Core session cookie: missing `Max-Age` confirmation for long-lived sessions

---

## 5. RATE LIMITING — 9/10 ✅

### RALD Auth Core Rate Limits

```typescript
RATE_LIMITS = {
  loginIp:     (ip)    → 10 attempts / IP / 15 minutes
  loginEmail:  (email) → 5 attempts / email / 15 minutes
  registerIp:  (ip)    → 5 registrations / IP / hour
  otpSend:     (id)    → 5 OTP sends / phone / hour
  otpVerify:   (id)    → 10 verify attempts / phone / 30 minutes
}
```

### Loop Worker Rate Limits

```
Phone OTP send:   5 / phone / hour
IP OTP send:     10 / IP / hour
IP OTP verify:   20 / IP / hour
Global daily:   100 / calendar day
```

✅ Dual-layer: per-identity + per-IP
✅ Sliding window (not fixed window — no burst at window boundary)
✅ Stored in Cloudflare KV with TTL-based expiration
✅ Abuse events logged with timestamp + identifier suffix

**Minor gap:** Global daily OTP cap of 100 may be too low for growth phase. Recommend raising to 1,000 with alerting at 500.

---

## 6. DEVICE TRUST — 6/10 ⚠️

### Implemented

```
GET  /devices          — list user's devices (name, type, OS, browser, IP, last_seen)
POST /devices/:id/trust — mark device as trusted
DELETE /devices/:id    — remove device
```

✅ Device table: `id, device_name, device_type, os, browser, ip_address, last_seen_at, is_trusted, created_at`
✅ User can view and manage their own devices

### Gaps

- ❌ **No automatic device fingerprinting on login** — devices must be manually registered; no automatic detection of new device sign-in
- ❌ **No new-device alert** — user not notified when a new device logs in from an unfamiliar IP
- ❌ **No suspicious login detection** — no IP geolocation comparison, no impossible travel detection
- ❌ **Device trust not enforced** — `is_trusted` flag exists but not checked in any auth flow yet

**Status:** Device management is UI-ready but not security-enforced. Acceptable for private beta.

---

## 7. CORS & SECURITY HEADERS — 9/10 ✅

### RALD Auth Core CORS (Static + Dynamic)

```typescript
const STATIC_ORIGINS = new Set([
  "https://profiles.rald.cloud",
  "https://loop.rald.cloud",
  "https://messenger.rald.cloud",
  "https://pay.rald.cloud",
  ... (35 explicit origins)
]);
// Dynamic: also allows *.rald.cloud and *.ostloop.name.ng subdomains
// Dynamic: also allows Replit preview/publish domains
```

✅ Explicit allowlist — not wildcard `*`
✅ `localhost:5173`, `localhost:3000`, `localhost:4173` for development only
✅ OPTIONS preflight handled

### Security Headers (Phase 8)

Applied to all responses:
```
Content-Security-Policy: default-src 'self'
Strict-Transport-Security: max-age=31536000; includeSubDomains
Referrer-Policy: strict-origin-when-cross-origin
```

✅ CSP prevents cross-origin script injection
✅ HSTS enforces HTTPS for 1 year including subdomains

**Minor gap:** No `X-Frame-Options` or `frame-ancestors` CSP directive — profiles.rald.cloud could potentially be iframed. Recommend adding `frame-ancestors 'none'` to auth pages.

---

## 8. REDIRECT SECURITY — 9/10 ✅

(See AUTH_REDIRECT_AUDIT.md for full detail)

- ✅ `validateRedirectUrl()` enforces `*.rald.cloud` and `*.ostloop.name.ng` only
- ✅ HTTPS required — HTTP rejected
- ✅ `safeRedirect()` with fallback to `profiles.rald.cloud`
- ✅ Validated on every SSO endpoint that touches a redirect

---

## 9. AUDIT LOGGING — 9/10 ✅

All auth events written to `audit_logs` table via `writeAuditLog()`:

```typescript
actions logged: login, login_failed, register, logout, otp_send, otp_verify_failed,
                otp_verify_success, rate_limited, sso_exchange, sso_handoff_issued,
                app_registered, app_provisioned, session_revoked, session_revoke_all,
                user_suspended, password_reset
```

Each log includes: `userId, action, ip, status, metadata, created_at`

✅ All auth events logged
✅ Rate limit blocks logged
✅ IP address captured from `CF-Connecting-IP` header (Cloudflare true IP)
✅ Metadata captures contextual detail (email, app_id, device)

---

## CERTIFICATION DECISION

| Gate | Requirement | Status |
|---|---|---|
| Private beta (≤500 users) | Auth works, rate limiting active, OTPs real | ✅ PASS |
| Public beta (≤10,000 users) | Token storage hardened, global logout implemented, silent refresh | ❌ BLOCKED on localStorage remediation |
| Scale (>10,000 users) | Device trust enforced, new-device alerts, impossible travel detection | ❌ NOT YET BUILT |

**Signed: LILCKY STUDIO LIMITED Engineering | 2026-06-09**

---

## REMEDIATION ROADMAP

| Priority | Item | Effort | Gate |
|---|---|---|---|
| P0 | Migrate Loop tokens from localStorage to HttpOnly cookies | 3–5 days | Public beta |
| P0 | Loop `signOut()` calls `auth.rald.cloud/logout` (global revocation) | 1 day | Public beta |
| P1 | Silent token refresh in Loop (re-exchange 10min before expiry) | 2 days | Public beta |
| P1 | Remove phone number from JWT payload | 1 day | Public beta |
| P1 | Add `jti` blocklist check to `/sso/exchange` | 1 day | Public beta |
| P2 | Automatic device fingerprinting on login | 1 week | Scale |
| P2 | New-device login alert (email/SMS) | 3 days | Scale |
| P2 | Add `frame-ancestors 'none'` to auth pages CSP | 2 hours | Immediate |
| P3 | Raise global OTP cap to 1,000/day with alerting | 1 hour | Immediate |
