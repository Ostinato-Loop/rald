# RALD ALIA — SECURITY STATUS
> Audit Date: 2026-06-13

## Security Scorecard

| Control | Required by Spec | Status | Risk |
|---------|-----------------|--------|------|
| TLS 1.3 | ✅ | ✅ Cloudflare enforces | LOW |
| AES-256 at rest | ✅ | ✅ Supabase encrypts at rest | LOW |
| mTLS service-to-service | ✅ | 🔴 NOT IMPLEMENTED | HIGH |
| RBAC | ✅ | 🟡 Partial — role column exists | MEDIUM |
| ABAC | ✅ | 🔴 NOT IMPLEMENTED | HIGH |
| Passkeys / WebAuthn | ✅ | 🟡 Migration+routes exist, not fully wired | MEDIUM |
| Tokenization | ✅ | 🔴 NOT IMPLEMENTED | HIGH |
| Secret Rotation (automated) | ✅ | 🔴 Manual only | HIGH |
| Immutable Audit Logs | ✅ | 🟡 audit_stream exists, not append-only enforced | MEDIUM |
| Machine Identities | ✅ | 🟡 60% — JWT issued, not rotated automatically | MEDIUM |
| Zero Trust | ✅ | 🟡 Machine JWT path only | MEDIUM |
| HttpOnly Cookies | ✅ | ✅ cookie.ts correctly sets HttpOnly + Secure + SameSite=Lax | LOW |
| No localStorage auth | ✅ | ✅ Confirmed — no localStorage token writes found | LOW |
| Rate Limiting | ✅ | ✅ KV-based rate limiter in all workers | LOW |
| Open Redirect Protection | ✅ | ✅ validateRedirectUrl() with allowlist in rald-identity | LOW |

---

## Critical Security Issues

### 🔴 CRITICAL: X-Internal-Secret Still Active
**All** Cloudflare Workers accept `X-Internal-Secret` as a backward-compat bypass.
This is a **shared secret** — if leaked, any service can impersonate any other.
```typescript
// Found in: rald-event-bus, rald-config, rald-notify, loop worker
const internalSecret = c.req.header("X-Internal-Secret");
if (internalSecret && env.RALD_INTERNAL_SECRET && internalSecret === env.RALD_INTERNAL_SECRET) {
  console.warn("DEPRECATED: X-Internal-Secret used — migrate to machine JWT");
  return next();
}
```
**Action**: Set hard deadline for X-Internal-Secret removal. All services must use Machine JWT only.

### 🔴 CRITICAL: mTLS Not Implemented
Service-to-service calls are authenticated via bearer tokens over HTTPS, not mTLS.
Spec requires: "No shared secrets. Every service receives service identity + certificate chain."
**Action**: Implement mTLS at Cloudflare service bindings level or via Cloudflare Access mTLS.

### 🔴 HIGH: No Automated Secret Rotation
Machine JWTs are issued manually. No automated rotation, no expiration enforcement at infrastructure level.
**Action**: Implement rotation job in `rald-auth-core/src/jobs/cleanup.ts`.

### 🟡 MEDIUM: ABAC Not Implemented
Spec requires Attribute-Based Access Control. Only RBAC (role-based) exists.
ABAC is needed for: country-specific access, trust-level gating, consent-based permissions.

### 🟡 MEDIUM: Audit Logs Not Enforced as Immutable
`audit_stream` table has no `GENERATED ALWAYS` columns or write-once enforcement.
Records can be deleted/updated by service role key.
**Action**: Add PostgreSQL trigger to prevent UPDATE/DELETE on audit_stream rows.

### 🟡 MEDIUM: WebAuthn Incomplete
Migration `20260610_webauthn.sql` and `src/routes/webauthn.ts` exist.
Passkey flow not confirmed as end-to-end working.

### 🟡 MEDIUM: Single Supabase Project
All services share one Supabase instance. A compromise of the service role key exposes all data.
**Action**: Consider per-service schema isolation or separate Supabase projects for sensitive data.

---

## What's Done Well

- **HttpOnly cookies** correctly implemented with Secure + SameSite=Lax
- **Open redirect protection** with explicit allowlist in rald-identity
- **Rate limiting** in every Cloudflare Worker using KV namespaces
- **JWT expiry** enforced in all verifyJwt implementations
- **CORS** strictly configured — only RALD domains allowed, not wildcard
- **Security headers** on every response (X-Frame-Options, Strict-Transport-Security, etc.)
- **No localStorage token writes** found anywhere in codebase
- **Machine JWT scopes** enforced — can't call an endpoint without the right scope
