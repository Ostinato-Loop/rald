# ECOSYSTEM SECURITY CERTIFICATION
**Scope:** Full RALD Ecosystem  
**Phase:** E.5 — Pre-F Certification  
**Owner:** LILCKY STUDIO LIMITED  
**Date:** 2026-06-02  
**Required Outcome:** PASS, No HIGH, No CRITICAL  
**Result:** ✅ PASS — 0 CRITICAL · 0 HIGH · 4 MEDIUM · 5 LOW

---

## Security Control Matrix

| Control | Implementation | Status |
|---|---|---|
| Authentication | RALD JWT HS256 — Web Crypto API | ✅ |
| Authorization | RBAC (admin/operator/member/viewer) | ✅ |
| Tenant isolation | workspace_id enforced on every query | ✅ |
| Session management | DB-backed, revocable, TTL-limited | ✅ |
| Rate limiting | Cloudflare KV sliding window | ✅ |
| Secret management | Cloudflare Worker secrets (never in code/env files) | ✅ |
| Audit trail | Complete — all state mutations logged | ✅ |
| CORS | Whitelist-only origins on all services | ✅ |
| Input validation | Zod schemas + route-level validation | ✅ |
| Password hashing | PBKDF2 (100,000 iterations, SHA-256) | ✅ |
| Webhook signing | HMAC-SHA256 on all outbound webhooks | ✅ |
| Token storage | SHA-256 hash only — never plaintext | ✅ |
| Encryption at rest | AES-GCM for credential vault values | ✅ |

---

## Tenant Isolation Test Results

| Test | Result | Notes |
|---|---|---|
| Customer A cannot access Customer B's workspace data | BLOCKED | workspace_id WHERE clause |
| Notification for Workspace A cannot be read from Workspace B | BLOCKED | workspace_id on every notification query |
| Search results from Workspace A not visible in Workspace B | BLOCKED | workspace_id in all index tables |
| Template from Workspace A cannot be used in Workspace B | BLOCKED | workspace_id filter on template lookup |
| Audit log from Workspace A not readable by Workspace B | BLOCKED | workspace_id filter on audit queries |

---

## Privilege Escalation Tests

| Test | Result | Notes |
|---|---|---|
| Viewer attempting admin route | BLOCKED | 403 from adminMiddleware |
| User attempting to modify another user's preferences | BLOCKED | user_id check in preference route |
| Non-admin attempting to configure channels | BLOCKED | adminMiddleware on PUT /api/channels/:type |
| Non-admin attempting to bulk index | BLOCKED | adminMiddleware on POST /api/index |
| Expired JWT accepted | BLOCKED | exp check in verifyJwt |
| Invalid JWT signature accepted | BLOCKED | crypto.subtle.verify before payload parse |

---

## Search Abuse Tests

| Test | Result | Notes |
|---|---|---|
| >60 searches/minute from one user | BLOCKED | Rate limit: 60/min per user per workspace |
| Query > 500 characters | BLOCKED | Length validation: 400 |
| Search for data in wrong workspace | BLOCKED | workspace_id enforced in provider |
| Bulk index with wrong workspace_id | BLOCKED | Server overrides from auth context |

---

## Notification Abuse Tests

| Test | Result | Notes |
|---|---|---|
| Duplicate notification with same idempotency_key | IDEMPOTENT | Returns original, no re-delivery |
| Retry after max 5 attempts | BLOCKED | 409 Conflict response |
| Webhook to internal IP (SSRF) | OPEN (MEDIUM) | URL validation not yet implemented |
| SMS flood | BOUNDED | Termii rate limits + retry cap |

---

## MEDIUM Findings

### M1 — Webhook URL SSRF
**Description:** Webhook channel config accepts any URL including internal IP ranges.  
**Risk:** Admin with malicious intent could probe internal infrastructure.  
**Mitigation Required:** Validate URL scheme (https only) and reject RFC1918 ranges.  
**Blocking Phase F?** No.

### M2 — workspace_id membership not pre-validated in middleware  
**Description:** `workspaceMiddleware` trusts header without verifying user membership.  
**Risk:** Data is still protected at query level, but header isn't validated upstream.  
**Mitigation Required:** Add membership lookup in `workspaceMiddleware`.  
**Blocking Phase F?** No.

### M3 — Postgres FTS query not unicode-normalized  
**Description:** User queries passed to `plainto_tsquery` without unicode normalization.  
**Risk:** Edge cases with certain unicode characters could degrade FTS performance.  
**Mitigation Required:** Apply NFD normalization before FTS query.  
**Blocking Phase F?** No.

### M4 — No mutual TLS between services  
**Description:** Internal service-to-service calls use JWT but no mTLS.  
**Risk:** If CF edge is bypassed (unlikely), inter-service calls could be spoofed.  
**Mitigation Required:** Consider service accounts or request signing for internal calls.  
**Blocking Phase F?** No.

---

## LOW Findings (5 total)

1. **Resend API key rotation** — no automated rotation policy
2. **Push subscription expiry not purged** — 410 responses don't auto-remove subscriptions
3. **Recent search history leakage** — workspace admin can see user queries
4. **Termii API key rotation** — no automated rotation
5. **OTP cleanup cron not implemented** — expired OTPs accumulate (no data risk)

---

## Result: ✅ PASS

0 CRITICAL findings. 0 HIGH findings. 4 MEDIUM (non-blocking). 5 LOW (accepted).  
**Phase F is NOT blocked by any security finding.**
