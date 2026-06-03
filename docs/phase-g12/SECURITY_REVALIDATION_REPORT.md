# SECURITY REVALIDATION REPORT
**Date:** 2026-06-03 | **Phase:** G.12 | **Target:** CRITICAL=0 HIGH=0

## Results

**CRITICAL: 0 | HIGH: 2 (operator actions only — no code changes required)**

## Checklist

| Check | Status | Evidence |
|---|---|---|
| No default/weak JWT secrets | ✅ PASS | RALD_JWT_SECRET is a CF Worker secret, never in source |
| No committed .env files | ✅ PASS | .gitignore covers .env, .dev.vars in all repos |
| No exposed API keys in source | ✅ PASS | All keys are CF Worker or GitHub Actions secrets |
| OTP brute-force protection | ✅ PASS | RATE_LIMIT_KV enforces 5/min per phone/email |
| OTP rate limiting active | ✅ PASS | auth.rald.cloud/ready → rate_limit_kv:true |
| Session revocation | ✅ PASS | POST /logout, DELETE /auth/sessions/:id verified live |
| Token expiration | ✅ PASS | SSO tokens: 1h. Master JWT: 24h |
| Redirect validation | ✅ PASS | /sso/handoff validates against registered app list |
| App whitelist validation | ✅ PASS | /sso/exchange rejects unregistered appId values |
| KV session store operational | ✅ PASS | RALD_SESSION_KV: true in /ready |

## HIGH Severity — Operator Action Required

| Issue | Severity | Fix |
|---|---|---|
| Termii sender ID "RALD" not registered | HIGH | Register "RALD" in Termii dashboard → Settings > Sender IDs |
| Termii balance: 10 NGN ($0.006) | HIGH | Top up to ≥5,000 NGN. SMS OTP non-functional until resolved. Email OTP works as fallback. |

## Note on Clerk

Clerk SSO is disabled (clerk:false in /system/status). This is intentional — not a security issue.
