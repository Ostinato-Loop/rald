# SECURITY REVALIDATION REPORT
**Date:** 2026-06-03
**Phase:** G.12 Foundation Lockdown
**Target:** CRITICAL=0, HIGH=0
**Status:** REVALIDATED

## Checklist

| Check | Status | Evidence |
|---|---|---|
| No default/weak JWT secrets | ✅ PASS | RALD_JWT_SECRET is a CF Worker secret, never in source code |
| No committed .env files | ✅ PASS | .gitignore covers .env, .dev.vars in all repos |
| No exposed API keys in source | ✅ PASS | All keys are CF Worker secrets or GitHub Actions secrets |
| OTP brute-force protection | ✅ PASS | RATE_LIMIT_KV enforces 5/min per phone/email |
| OTP rate limiting | ✅ PASS | auth.rald.cloud /ready → rate_limit_kv:true |
| Session revocation | ✅ PASS | POST /logout, DELETE /auth/sessions/:id — routes verified live |
| Token expiration | ✅ PASS | Access tokens: 1h (SSO), master: 24h |
| Redirect validation | ✅ PASS | /sso/handoff validates redirect against registered app list |
| App whitelist validation | ✅ PASS | /sso/exchange rejects unregistered appId values |
| KV session store | ✅ PASS | RALD_SESSION_KV operational |

## Known Issues

| Issue | Severity | Status |
|---|---|---|
| Termii sender ID "RALD" not registered | HIGH | ⚠️ OPERATOR ACTION — SMS OTP broken |
| Termii balance: 10 NGN ($0.006) | HIGH | ⚠️ OPERATOR ACTION — Top up required |
| Clerk SSO disabled | LOW | ℹ️ Not used — expected |

## Action Required (Operator)

1. Register sender ID "RALD" in Termii dashboard (Settings > Sender IDs)
2. Top up Termii balance to minimum 5,000 NGN
3. Verify `TERMII_SENDER_ID` secret matches registered sender ID

## Result

**CRITICAL: 0 | HIGH: 2 (operator actions only — no code changes required)**
