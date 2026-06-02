# IDENTITY HARDENING V2 REPORT
**Service:** Identity Layer — api.rald.cloud  
**Phase:** E.5 — Hardening Sprint  
**Owner:** LILCKY STUDIO LIMITED  
**Date:** 2026-06-02  
**Result:** ✅ PASS

---

## Hardening Areas

### JWT Rotation Strategy
- **Current:** 24-hour access tokens, 90-day refresh tokens
- **Rotation on refresh:** New token issued; old token remains valid until expiry
- **Recommendation:** Consider 1-hour access tokens for Phase F (more active revocation)
- **Status:** Acceptable for MVP scale

### Session Expiry Behavior
- Sessions expire via `expires_at = NOW() + 30 days`
- Sessions can be explicitly revoked via `revoked_at` timestamp
- Expired sessions rejected even if not revoked
- Behavior: ✅ Correct

### Multi-Device Handling
- Multiple concurrent sessions supported per user
- Each session has unique `token_hash`
- Devices tracked via `device_name`, `user_agent`, `ip_address`
- Users can view all sessions and revoke individual or all
- Behavior: ✅ Correct

### Provider Failover
- SMS OTP: Termii → Twilio automatic fallback
- Email OTP: Resend only (no fallback configured)
- **Recommendation:** Add SendGrid as Resend fallback
- **Status:** LOW risk — Resend has 99.9% uptime SLA

### PBKDF2 Password Hashing
- 100,000 iterations, SHA-256, random salt
- Legacy HMAC-SHA256 format supported for migration
- Strong against brute-force at current iteration count
- Status: ✅ Secure

### Findings
- **LOW:** No Resend email fallback provider
- **LOW:** Access token lifetime (24h) longer than security best practice (1h)

**Result:** ✅ PASS
