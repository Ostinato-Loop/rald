# ALIA_SECURITY_AUDIT.md
# RALD ALIA — Security Audit
**Audit Date:** 2026-06-13
**Scope:** GitLab `rald-alia` + GitHub RALD ecosystem

---

## CRITICAL FINDINGS (Fix Before Production)

### CRITICAL-1: Raw Account Token Exposed in Resolution Response

**Severity: CRITICAL**
**Service:** `resolution-engine`
**File:** `services/resolution-engine/src/services/resolution.service.ts`

```typescript
// CURRENT — INSECURE
const result: ResolutionResult = {
  token: entry.accountToken,    // Raw bank account token returned to caller
  routing: { destinationBankCode: entry.bankCode, ... }
};
```

The `accountToken` is a tokenized bank account reference. Returning it directly to any authenticated caller means:
- Any RALD service that calls `/resolve` receives the raw routing token
- If a service is compromised, account tokens are exposed
- No expiry, no single-use enforcement, no audit trail per consumption

**Fix:** Issue a signed ephemeral JWT (60s TTL). The JWT references the account_token internally but never exposes it in responses. Add `POST /v1/resolve/verify` — only called by verified institutions to consume the routing token and get the actual destination details.

---

### CRITICAL-2: Password Stored in JSONB Metadata

**Severity: HIGH**
**Service:** `identity-service`
**File:** `services/identity-service/src/routes/auth.ts`

```typescript
// CURRENT — RISKY
const meta: UserMeta = { passwordHash, otpHash, otpExpiresAt };
await db.insert(users).values({ ..., metadata: meta });  // In JSONB blob
```

Issues:
- `metadata` is a JSONB column — not typed, not indexed, not auditable
- A SQL query on `users` cannot separately filter/index on `passwordHash`
- Accidental `SELECT *` logs or error traces may expose metadata
- No schema enforcement — any key can be written to `metadata`

**Fix:** Add `password_hash TEXT` column to `users` table. Store only in that column. Remove from metadata. Keep metadata for non-sensitive operational data only.

---

### CRITICAL-3: No Machine Identity (All Internal Calls Unprotected)

**Severity: CRITICAL**
**Scope:** All 13 ALIA services

Internal service-to-service calls use no authentication. Example:
- `resolution-engine` calls nothing to verify it should publish to `fraud-service` topic
- Kafka topics are unprotected — any service can publish to any topic
- Services trust each other implicitly based on network access

**Fix:** Implement machine identity JWT system. All internal routes require `X-Machine-Token: <machine_jwt>`. Kafka producer credentials scoped per service.

---

### CRITICAL-4: X-Internal-Secret Still Active in RALD GitHub Workers

**Severity: HIGH**
**Scope:** RALD GitHub ecosystem

From Phase 1A audit, 6+ RALD Cloudflare Workers authenticate internal calls with a shared secret (`X-Internal-Secret`). A single credential compromise exposes all services.

**Fix:** Remove `X-Internal-Secret`. Replace with machine JWT via `@rald/machine-sdk`.

---

### CRITICAL-5: JWT Secrets with Insecure Fallbacks

**Severity: HIGH**
**Service:** `identity-service`, `gateway`

```typescript
// identity-service/src/routes/auth.ts
const JWT_SECRET = process.env['JWT_SECRET'] ?? 'dev-secret-change-me';
const JWT_REFRESH_SECRET = process.env['JWT_REFRESH_SECRET'] ?? 'dev-refresh-secret-change-me';
```

If `JWT_SECRET` env var is not set in production, the fallback `'dev-secret-change-me'` is used silently. This means a production deployment without env vars set would still start — and accept tokens signed with the predictable dev secret.

**Fix:** Replace fallback strings with startup assertion:
```typescript
const JWT_SECRET = process.env['JWT_SECRET'];
if (!JWT_SECRET) throw new Error('JWT_SECRET environment variable is required');
```

---

## HIGH SEVERITY FINDINGS

### HIGH-1: In-Memory Data (5 Services) Is Not Encrypted or Access-Controlled

**Services:** consent, trust, merchant, governance, verification

All data stored in JavaScript `Map` objects in process memory. While this is temporary, it means:
- No access control — any code in the process can read all consent/trust data
- No encryption at rest
- Data lost on restart

**Fix:** Move to PostgreSQL immediately (Migration M1).

---

### HIGH-2: Single PostgreSQL for All 13 Services

**Severity: HIGH**

All services share one PostgreSQL connection string. If one service is compromised:
- Attacker has read/write access to ALL tables (users, aliases, fraud_events, audit_logs, api_keys)
- No row-level security enforced

**Fix (immediate):** Create separate PostgreSQL users per service domain with minimal permissions:
```sql
-- identity-service can only access: users, organizations, bank_links
CREATE USER alia_identity WITH PASSWORD '...';
GRANT SELECT, INSERT, UPDATE ON users, organizations, bank_links TO alia_identity;

-- audit-service can only INSERT to audit_logs
CREATE USER alia_audit WITH PASSWORD '...';
GRANT INSERT ON audit_logs TO alia_audit;
```

**Fix (long-term):** Separate PostgreSQL databases per service domain.

---

### HIGH-3: BVN/NIN Hashing Uses SHA-256 (No Salt)

**Severity: HIGH**
**Service:** `identity-service`

```typescript
const bvnHash = crypto.createHash('sha256').update(data.bvn).digest('hex');
```

BVN is an 11-digit number. SHA-256 without salt is vulnerable to rainbow table attacks — there are only ~100 billion possible BVNs, which can be precomputed.

**Fix:** Use HMAC-SHA256 with a server-side secret:
```typescript
const bvnHash = crypto.createHmac('sha256', process.env.BVN_HASH_SECRET!).update(data.bvn).digest('hex');
```

---

### HIGH-4: No HTTPS Enforcement Between Services

Internal service calls use `http://localhost:PORT`. No TLS between services in docker-compose.

**Fix:** Enforce TLS in production using a service mesh or at the load balancer level.

---

### HIGH-5: OTP Stored as SHA-256 Hash in JSONB

Similar to HIGH-3 — OTP is 6 digits, SHA-256 without salt. 1,000,000 possible values can be precomputed in milliseconds.

**Fix:** Use bcrypt for OTP hashing, or use HMAC-SHA256 with server-side secret.

---

## MEDIUM SEVERITY FINDINGS

### MEDIUM-1: No Rate Limiting at Service Level

All rate limiting is at the gateway (300 req/min per IP). If a service is accessed directly (bypassing gateway), no rate limiting applies.

**Fix:** Add rate limiting middleware in each service. Redis-based (already available).

---

### MEDIUM-2: Error Responses May Leak Stack Traces

Several services have catch blocks that don't sanitize errors:

```typescript
} catch (err) {
  res.status(500).json({ error: 'INTERNAL_ERROR' });  // OK in some services
}
```

But `identity-service` uses Zod `.parse()` which throws `ZodError` — if not caught properly, full validation error details including field paths are returned. This is acceptable for client errors (422) but schema info should not leak.

**Fix:** Add global error handler that strips stack traces in production.

---

### MEDIUM-3: Webhook Secret Stored as Hash (Correct) — But Delivery Not Signed

The `webhooks` table stores `secret_hash`. Good. But there's no evidence the delivery uses HMAC-SHA256 signature on the payload (like GitHub webhook signatures).

**Fix:** When notification-service delivers a webhook, include `X-RALD-Signature: sha256=<hmac_of_body>`.

---

### MEDIUM-4: API Keys Stored as `key_prefix + key_hash`

The `api_keys` table correctly stores only the prefix and SHA-256 hash. This is the correct Stripe-style pattern. However:
- The hash algorithm is SHA-256 (fast — brute-forceable for short keys)
- Key length is not defined

**Fix:** Use bcrypt for API key hash. Ensure keys are 32+ random bytes.

---

## LOW SEVERITY FINDINGS

| Finding | Service | Fix |
|---------|---------|-----|
| CORS origin set to `'*'` as fallback | gateway | Set explicit origin list |
| `helmet()` defaults — no CSP | gateway | Add Content-Security-Policy |
| No request ID / trace ID in all services | all | Add `X-Request-ID` middleware |
| Kafka PLAINTEXT (no TLS) | kafka | Enable Kafka TLS in production |
| No connection pooling config for Redis | multiple | Add maxRetries, connectTimeout |
| No idle timeout on DB pool | multiple | `idleTimeoutMillis: 30000` (set in client.ts — confirm in all services) |

---

## SECURITY SCORECARD

| Category | Score | Status |
|----------|-------|--------|
| Authentication | 55% | JWT correct, but no machine identity, no passkeys |
| Authorization | 45% | Gateway-level only, no service-level RBAC |
| Data protection | 40% | In-memory data in 5 services, single DB |
| Secrets management | 30% | Env var fallbacks to dev secrets |
| Input validation | 80% | Zod on all routes |
| Audit trail | 75% | Kafka-driven audit, SHA-256 checksum |
| Transport security | 40% | No mTLS, no service mesh |
| Credential hygiene | 50% | Bcrypt passwords (good), SHA-256 BVN/OTP (weak) |
| **Overall** | **52%** | Not production-ready |

---

## REMEDIATION PRIORITY

| # | Finding | Effort | Impact |
|---|---------|--------|--------|
| 1 | CRITICAL-1: Raw account token | 1 day | Critical |
| 2 | CRITICAL-3: No machine identity | 3 days | Critical |
| 3 | CRITICAL-5: JWT secret fallbacks | 1 hour | Critical |
| 4 | CRITICAL-4: Remove X-Internal-Secret | 2 days | Critical |
| 5 | HIGH-2: Per-service DB users | 1 day | High |
| 6 | HIGH-3: BVN/NIN HMAC-SHA256 | 2 hours | High |
| 7 | HIGH-5: OTP HMAC-SHA256 | 2 hours | High |
| 8 | CRITICAL-2: Password column | 1 day | High |
| 9 | MEDIUM-3: Webhook signing | 4 hours | Medium |
| 10 | Add test coverage | 1 week | High (quality) |
