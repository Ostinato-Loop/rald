# UNIVERSAL_SSO_CERTIFICATION
**Document Type:** Identity Platform Certification  
**Owner:** LILCKY STUDIO LIMITED  
**Phase:** RALD Identity Platform V2  
**Date:** 2026-06-03  
**Version:** 2.0  
**Certification Level:** PASS

---

## EXECUTIVE SUMMARY

This document certifies the Universal SSO system for the RALD ecosystem. A user authenticates once at `auth.rald.cloud` and enters any RALD application without re-authentication or onboarding.

**Verdict:** ✅ CERTIFIED — CRITICAL: 0 · HIGH: 0

---

## SSO ARCHITECTURE

### Token Flow
```
User authenticates at auth.rald.cloud
  │
  ▼
RALD master JWT issued (HS256, 24h, signed with RALD_JWT_SECRET)
  │
  ▼
User enters any RALD app (Loop / Messenger / PayRald / DunaRald / GitRald / Inbox / Raldtics)
  │
  ▼
App calls POST auth.rald.cloud/sso/exchange  { appId, redirect_to? }
  │
  ▼
auth.rald.cloud validates master token + appId + redirect_to
  │
  ▼
App-scoped token returned (1h TTL)
  │
  ▼
App calls POST auth.rald.cloud/provision/app  { app_id }   [if first visit]
  │
  ▼
User enters application — zero additional login, zero onboarding
```

### Token Specification
| Field | Value |
|---|---|
| Algorithm | HS256 (HMAC-SHA256) |
| Secret | `RALD_JWT_SECRET` (CF Worker secret — never client-exposed) |
| Master token TTL | 86400s (24h) |
| App-scoped token TTL | 3600s (1h) |
| Handoff token TTL | 300s (5min) |
| Payload | `{ id, email, role, appId?, source, sso_v: 2 }` |

---

## TRUSTED APP REGISTRY

| App ID | Application | Domain |
|---|---|---|
| `profiles` | Profile Hub | profiles.rald.cloud |
| `loop` | Loop Social | loop.rald.cloud |
| `messenger` | Messenger | messenger.rald.cloud |
| `rald-inbox` | Unified Inbox | inbox.rald.cloud |
| `payrald` | PayRald | pay.rald.cloud |
| `dunarald` | DunaRald | duna.rald.cloud |
| `gitrald` | GitRald | git.rald.cloud |
| `raldtics` | Raldtics | analytics.rald.cloud |
| `rald-app` | RALD App | app.rald.cloud |
| `rald-control-center` | Control Center | admin.rald.cloud |
| `loop-business` | Loop Business | business.rald.cloud |

**Total trusted apps:** 29 (see `TRUSTED_APP_IDS` in `src/routes/sso.ts`)

---

## ENDPOINT CERTIFICATION

| Endpoint | Method | Auth | Description | Status |
|---|---|---|---|---|
| `/sso/exchange` | POST | Bearer | Master → app-scoped token | ✅ |
| `/sso/verify` | POST | None | Validate any RALD token | ✅ |
| `/sso/handoff` | POST | Bearer | Browser-safe handoff token | ✅ |
| `/sso/apps` | GET | None | List trusted app IDs | ✅ |
| `/sso/validate-redirect` | GET | None | Validate a redirect_to URL | ✅ |

---

## REDIRECT VALIDATION

All SSO endpoints enforce ecosystem-wide redirect validation:

```
Allowed:  *.rald.cloud
          *.ostloop.name.ng
          rald.cloud
          ostloop.name.ng

Rejected: Everything else (any external domain)
```

**Implementation:** `src/lib/redirect.ts` — `validateRedirectUrl()` and `safeRedirect()`  
Rejects HTTP (non-HTTPS) redirects unconditionally.

---

## INTEGRATION TEST RESULTS

| Flow | Expected Result | Status |
|---|---|---|
| RALD Login → Loop | Authenticated user enters Loop, no re-auth | ✅ PASS |
| RALD Login → Messenger | Authenticated user enters Messenger, no re-auth | ✅ PASS |
| RALD Login → DunaRald | Authenticated user enters DunaRald, no re-auth | ✅ PASS |
| RALD Login → PayRald | Authenticated user enters PayRald, no re-auth | ✅ PASS |
| RALD Login → Inbox | Authenticated user enters Inbox, no re-auth | ✅ PASS |
| Invalid redirect_to | 400 error, token not issued | ✅ PASS |
| Unknown appId | 400 error, token not issued | ✅ PASS |
| Expired master token | 401 error, exchange rejected | ✅ PASS |

---

## LEGACY MIGRATION

| Legacy | Replacement | Action |
|---|---|---|
| `accounts.rald.cloud` | `profiles.rald.cloud` | REMOVED from CORS |
| `app.rald.cloud` auth redirects | `auth.rald.cloud` | Standard auth endpoint |
| Legacy onboarding redirects | Silent provisioning via `/provision/app` | ELIMINATED |

---

## FINDINGS

### CRITICAL (0) — None
### HIGH (0) — None
### MEDIUM (0) — None
### LOW (1)
| ID | Finding |
|---|---|
| SSO-L01 | App-scoped tokens (1h) are not refreshable; users must re-exchange after expiry |

**Mitigation:** Refresh token rotation planned for V3. 1h window is acceptable for all current app use cases.

---

## CERTIFICATION DECISION

```
╔═══════════════════════════════════════════╗
║  UNIVERSAL SSO — CERTIFIED ✅             ║
║  CRITICAL: 0 · HIGH: 0 · MEDIUM: 0      ║
║  Version: 2.0 — 2026-06-03               ║
╚═══════════════════════════════════════════╝
```

**Signed:** LILCKY STUDIO LIMITED — 2026-06-03
