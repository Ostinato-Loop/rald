# RALD Ecosystem — Phase 10 Final Audit

**Document:** PHASE_10_FINAL_AUDIT.md  
**Date:** 2026-06-13  
**Audited From:** GitHub source code (Ostinato-Loop org)  
**Auditor:** RALD Security Hardening Program  
**Owner:** LILCKY STUDIO LIMITED

---

## Scores

| Domain | Score | Grade |
|--------|-------|-------|
| **SECURITY SCORE** | 72/100 | C+ |
| **IDENTITY SCORE** | 85/100 | B+ |
| **LOOP SCORE** | 78/100 | C+ |
| **SSO SCORE** | 80/100 | B |
| **SESSION SCORE** | 75/100 | C+ |

### READY FOR BETA: **CONDITIONAL — Fix P0 items first**

---

## Security Score: 72/100

### ✅ Passing

| Item | Evidence |
|------|----------|
| CORS: explicit allowlist enforced | `rald-auth-core/src/index.ts` — static `STATIC_ORIGINS` set |
| Security headers: HSTS, CSP, X-Frame-Options | `rald-auth-core/src/index.ts` Phase 8 middleware |
| JWT: HMAC-SHA256 with HS256 | `rald-auth-core/src/lib/auth.ts` |
| Password: PBKDF2 (100,000 iterations) | `rald-auth-core/src/lib/auth.ts` |
| Rate limiting: IP + per-user + global | `rald-auth-core/src/lib/rate-limit.ts` |
| OTP brute-force protection (5 attempts/15min) | `register-username.ts`, `login-username.ts` |
| Machine identity middleware exists | `rald-auth-core/src/middleware/machine.ts` |
| JTI revocation blocklist | `loop/src/middleware/auth.ts` PHD-001 |
| User-level revoke-all timestamp | `loop/src/middleware/auth.ts` REVOKE-ALL-001 |
| Audit logging | `rald-auth-core/src/lib/audit.ts` |

### ❌ Failing (Blockers)

| Item | Severity | Details |
|------|----------|---------|
| **LiveKit: canPublish=true for all users** | **P0 CRITICAL** | `loop/artifacts/cloudflare-worker/src/routes/audio.ts:79` — every authenticated user gets `canPublish:true`. Room moderation is completely broken. |
| **X-Internal-Secret still accepted** | P1 HIGH | `machine.ts` grants `permissions:["*"]` to any caller with `X-Internal-Secret`. Migration in progress but legacy path is active. |
| **Master JWT in registration redirect URL** | P1 HIGH | `rald-identity/src/lib/store.ts:resolveRedirectUrl()` appends 30-day master JWT as URL param. |
| **rald-auth-ui localStorage token reads** | P2 MEDIUM | App is deprecated but `rald-auth-ui/src/lib/api.ts` reads `localStorage.getItem("rald_token")` — risk if app somehow serves live traffic. |

---

## Identity Score: 85/100

### ✅ Passing

| Item | Evidence |
|------|----------|
| Username-first registration | `/auth/register-username` → PENDING → ACTIVE state machine |
| Username PENDING→ACTIVE only after OTP | P2 fix in `register-username.ts` |
| Orphan cleanup (hourly cron) | `jobs/cleanup.ts` |
| Reserved namespace protection | RESERVED_WORDS set in all registration routes |
| All 8 ecosystem profiles provisioned on registration | `provisionAllEcosystemProfiles()` |
| Username change policy (30 days) | `/username/change` endpoint |
| Trust profile auto-created | P1 fix |
| auth_user_profiles auto-created | P1 fix |
| Canonical user registry (single source of truth) | `auth_users` table owned by auth.rald.cloud |
| Product access granted by identity only | `auth_product_access` table |
| Loop-claim shortcut for frictionless entry | `/auth/loop-claim` |

### ❌ Failing

| Item | Severity | Details |
|------|----------|---------|
| `user.verified` event not published | P2 | Registration completion does not fire `user.verified` |
| Organization/Team UI incomplete | P3 | Schema exists, no complete admin UI |
| Loop-claim users not counted in `user.created` event | P2 | `/auth/loop-claim` should publish `user.created` |

---

## Loop Score: 78/100

### ✅ Passing

| Item | Evidence |
|------|----------|
| HttpOnly `loop_session` cookie | `loop/artifacts/cloudflare-worker/src/lib/cookie.ts` |
| In-memory session store | `loop/artifacts/loop/src/lib/session-store.ts` |
| localStorage removed for tokens | COOKIE-001 |
| Silent session refresh | `GET /api/auth/silent` |
| Proactive token refresh | `use-auth.tsx scheduleProactiveRefresh()` |
| SSO audience fix | SSO-AUD-FIX-001 |
| SSO verify fallback | SSO-VERIFY-FALLBACK-001 |
| Username propagation fixed | USN-001 |
| onboarded=true set on SSO | ZERO-FRICTION-001 |
| Device registration on login | Sprint 2 |
| CORS: explicit allowlist + no wildcard with credentials | Loop worker CORS middleware |

### ❌ Failing

| Item | Severity | Details |
|------|----------|---------|
| **LiveKit role-based permissions missing** | **P0 CRITICAL** | See Security Score |
| `loop_session` missing `Domain=.rald.cloud` | P1 | Cross-subdomain propagation not guaranteed |
| `SameSite=Lax` should be `SameSite=None` for cross-origin cookie | P2 | Spec requires None for cross-origin credentialed requests |

---

## SSO Score: 80/100

### ✅ Passing

| Item | Evidence |
|------|----------|
| Scoped JWTs per product (not master) | `raldSso.issueLoopToken()` re-signs with `aud:"loop"` |
| Handoff tokens for cross-app nav (5 min) | `POST /api/auth/rald-sso/handoff` |
| No master JWT in URLs (cross-app) | COOKIE-001 |
| rald-auth-ui deprecated → redirects to profiles.rald.cloud | `rald-auth-ui/src/App.tsx` |
| SSO fallback verify | SSO-VERIFY-FALLBACK-001 |
| Dynamic app registry (registered_apps table) | `sso.ts` |
| Open-redirect protection | `rald-auth-core/src/lib/redirect.ts` |

### ❌ Failing

| Item | Severity | Details |
|------|----------|---------|
| Master JWT in registration redirect | P1 | `resolveRedirectUrl()` appends master JWT |
| No one-time handoff token for post-registration redirect | P1 | Server-side handoff not implemented |

---

## Session Score: 75/100

### ✅ Passing

| Item | Evidence |
|------|----------|
| HttpOnly cookies deployed (auth + loop) | COOKIE-001 |
| KV-backed session store (auth-core) | `rald-auth-core/src/lib/session.ts` |
| JTI revocation (loop-worker) | `loop/src/middleware/auth.ts` |
| User-level revoke-all | `revoke_before:<userId>` KV key |
| Session suspension | `suspendUser()` in session.ts |
| 30-day session TTL with sliding window | Both auth-core and loop-worker |

### ❌ Failing

| Item | Severity | Details |
|------|----------|---------|
| `loop_session` no `Domain` attribute | P1 HIGH | Cookie not propagated to subdomains |
| `SameSite=Lax` instead of `None` | P2 | Breaks credentialed cross-origin requests |
| `rald-auth-ui` localStorage reads | P2 | Deprecated app still has legacy code |
| `rald-auth-core` cookie: `SameSite=Lax` | P2 | Should be `None` per Phase 9 spec |

---

## P0 Blockers (Must Fix Before Beta)

| # | Item | Repo | File | Fix |
|---|------|------|------|-----|
| 1 | LiveKit: canPublish=true for all users | loop | `artifacts/cloudflare-worker/src/routes/audio.ts` | Implement role lookup from `room_participants` table; see LIVEKIT_ROLE_MODEL.md |

---

## P1 Blockers (Fix Before Beta)

| # | Item | Repo | File | Fix |
|---|------|------|------|-----|
| 2 | `loop_session` missing `Domain=.rald.cloud` | loop | `artifacts/cloudflare-worker/src/lib/cookie.ts` | Add `Domain=.rald.cloud` to cookie |
| 3 | Master JWT in registration redirect URL | rald-identity | `src/lib/store.ts` | Replace with server-side handoff token |
| 4 | X-Internal-Secret still grants wildcard permissions | rald-auth-core | `src/middleware/machine.ts` | Complete machine identity migration; remove X-Internal-Secret fallback |

---

## P2 Items (Recommended Before Beta)

| # | Item | Repo | Fix |
|---|------|------|-----|
| 5 | `SameSite=None` for cross-origin sessions | loop, rald-auth-core | Change cookie SameSite attribute |
| 6 | Publish `user.verified` event | rald-auth-core | Fire event in `/auth/register-username/complete` |
| 7 | Publish `user.created` from loop-claim | rald-auth-core | Fire event in `/auth/loop-claim` |
| 8 | Decommission rald-auth-ui legacy localStorage code | rald-auth-ui | Delete remaining auth pages (app redirects only) |

---

## Remaining Blockers Summary

```
READY FOR BETA: NO

Fix P0 first:
  - LiveKit role-based permissions (audio.ts)

Then P1:
  - loop_session Domain attribute
  - Registration redirect master JWT
  - X-Internal-Secret retirement

Beta is achievable within 1-2 engineering days after these fixes.
```

