# RALD IDENTITY PLATFORM V2
**Document Type:** Platform Architecture — Canonical  
**Owner:** LILCKY STUDIO LIMITED  
**Phase:** Universal Identity Hardening  
**Date:** 2026-06-03  
**Version:** 2.0  
**Classification:** OFFICIAL — SOURCE OF TRUTH

---

## MISSION

> **One RALD Identity. One Login. One Profile. One Ecosystem. Zero Reauthentication. Zero Onboarding Loops.**

RALD Identity Platform V2 transforms `auth.rald.cloud` into an ecosystem-wide identity system modelled after Apple ID. Every RALD application shares a single authenticated identity. Users are never asked to log in twice or complete onboarding more than once.

---

## IDENTITY ARCHITECTURE OVERVIEW

```
┌────────────────────────────────────────────────────────────────┐
│                  RALD IDENTITY LAYER V2                        │
│                                                                │
│  auth.rald.cloud          profiles.rald.cloud                  │
│  ┌──────────────────┐    ┌──────────────────────────────────┐  │
│  │ Authentication   │    │ Identity Hub (canonical)         │  │
│  │ • login/register │    │ • Profile management             │  │
│  │ • OTP (SMS/Email)│    │ • Universal App Launcher         │  │
│  │ • SSO exchange   │    │ • Connected Apps Dashboard       │  │
│  │ • Token verify   │    │ • Session control                │  │
│  │ • App provision  │    │ • Device history                 │  │
│  │ • Redirect valid │    │ • Login history                  │  │
│  └──────────────────┘    └──────────────────────────────────┘  │
│                                                                │
│  Identity API surface (all on auth.rald.cloud):                │
│  /auth/*         /sso/*         /provision/*    /profiles/*    │
│                                                                │
└────────────────────────────────────────────────────────────────┘
              │                           │
    ┌─────────┴───────────────────────────┴────────┐
    │          RALD ECOSYSTEM APPS                  │
    │                                               │
    │  loop.rald.cloud        messenger.rald.cloud  │
    │  inbox.rald.cloud       pay.rald.cloud        │
    │  duna.rald.cloud        git.rald.cloud        │
    │  analytics.rald.cloud   business.rald.cloud   │
    └───────────────────────────────────────────────┘
```

---

## V2 CHANGES FROM V1

| Area | V1 | V2 |
|---|---|---|
| Identity hub | `accounts.rald.cloud` | **`profiles.rald.cloud`** |
| Auth endpoint | `auth.rald.cloud` | `auth.rald.cloud` (unchanged) |
| Onboarding | Product-level onboarding flows | **Silent auto-provisioning** |
| App access | Manual product setup | **Auto-provisioned on first visit** |
| App launcher | None | **`GET /profiles/apps`** (8 apps) |
| Connected apps | None | **`GET /profiles/connected-apps`** |
| Login history | None | **`GET /profiles/activity`** |
| Redirect validation | Not enforced | **Enforced: *.rald.cloud + *.ostloop.name.ng** |
| SSO version | v1 (basic exchange) | **v2 (redirect_to validation + handoff endpoint)** |
| Auth worker version | 1.4.0 | **2.0.0** |

---

## CANONICAL IDENTITY RULES

### Rule 1 — Single Authentication Point
```
Auth endpoint:  auth.rald.cloud
No exceptions.  No product may implement its own auth.
```

### Rule 2 — Profile Hub
```
Profile management: profiles.rald.cloud
accounts.rald.cloud: DEPRECATED AND REMOVED
identity.rald.cloud: DEPRECATED (alias only, no new features)
```

### Rule 3 — Silent Provisioning
```
When a user enters an app for the first time:
  → App calls POST auth.rald.cloud/provision/app { app_id }
  → App provisioned silently (< 100ms)
  → User enters application
  
NEVER: redirect authenticated user to onboarding
NEVER: show "complete your profile" screens on login
NEVER: create duplicate accounts per product
```

### Rule 4 — Ecosystem Redirect Validation
```
Allowed redirects:  *.rald.cloud  +  *.ostloop.name.ng
All others:         REJECTED (400)
HTTPS only:         HTTP redirects rejected
```

### Rule 5 — One JWT Secret
```
RALD_JWT_SECRET is shared across all CF Workers.
The same secret verifies tokens in auth-core, messenger, inbox, realtime, etc.
Products NEVER issue their own JWTs — they verify RALD tokens only.
```

---

## DATABASE SCHEMA V2

### Existing Tables (certified, unchanged)
- `auth_users` — identity records (email, name, role, metadata)
- `auth_sessions` — active session tracking
- `auth_devices` — device registry
- `auth_product_access` — product access grants (UNIQUE user_id, product)
- `auth_otp_codes` — OTP code storage

### New Tables (V2)
- `auth_user_profiles` — extended profile (display_name, avatar, bio, preferences, provisioned_apps)
- `auth_login_history` — per-app login/SSO event log (powers Connected Apps Dashboard)

### New Functions
- `provision_app_append(user_id, app_id)` — idempotent array append for provisioned_apps

---

## API SURFACE — FULL REGISTRY

### Authentication (`/auth/*`)
| Endpoint | Method | Purpose |
|---|---|---|
| `/auth/login` | POST | Password login |
| `/auth/register` | POST | Registration |
| `/auth/send-otp` | POST | SMS OTP send |
| `/auth/verify-otp` | POST | SMS OTP verify |
| `/auth/send-login-email-otp` | POST | Email OTP send |
| `/auth/verify-login-email-otp` | POST | Email OTP verify |
| `/auth/request-password-reset` | POST | Reset request |
| `/auth/reset-password` | POST | Apply reset |
| `/auth/me` | GET | Current user |
| `/auth/sessions` | GET | Active sessions |
| `/auth/sessions/:id` | DELETE | Revoke session |
| `/auth/sessions` | DELETE | Revoke all |

### Universal SSO (`/sso/*`)
| Endpoint | Method | Purpose |
|---|---|---|
| `/sso/exchange` | POST | Master → app-scoped token |
| `/sso/verify` | POST | Validate any RALD token |
| `/sso/handoff` | POST | Browser-safe handoff |
| `/sso/apps` | GET | Trusted app list |
| `/sso/validate-redirect` | GET | Validate redirect_to |

### App Provisioning (`/provision/*`)
| Endpoint | Method | Purpose |
|---|---|---|
| `/provision/app` | POST | Self-service provisioning (any user) |
| `/provision/status` | GET | Provisioning status across all apps |
| `/provision/user` | POST | Admin provisioning |
| `/provision/user/:id/products` | GET | List user's products |

### Profile Hub (`/profiles/*`)
| Endpoint | Method | Purpose |
|---|---|---|
| `/profiles/me` | GET / PATCH | Full profile card + updates |
| `/profiles/apps` | GET | Universal App Launcher |
| `/profiles/sessions` | GET / DELETE | Session management |
| `/profiles/sessions/:id` | DELETE | Revoke specific session |
| `/profiles/activity` | GET | Login history |
| `/profiles/connected-apps` | GET | Connected apps |
| `/profiles/devices` | GET | Device history |

---

## DEPLOYMENT

| Component | Location | Version |
|---|---|---|
| `rald-auth-core` worker | `auth.rald.cloud` | 2.0.0 |
| `profiles.rald.cloud` | CF Pages (pending deployment) | V2 |
| `supabase/migrations/20260603_identity_v2.sql` | Supabase | New tables |
| `src/lib/redirect.ts` | auth.rald.cloud | Redirect validation |

---

## CERTIFICATION SUMMARY

| Domain | Certification | Result |
|---|---|---|
| Universal SSO | UNIVERSAL_SSO_CERTIFICATION.md | ✅ CERTIFIED (CRITICAL: 0, HIGH: 0) |
| App Provisioning | PROVISIONING_CERTIFICATION.md | ✅ CERTIFIED (CRITICAL: 0, HIGH: 0) |
| Ecosystem Navigation | ECOSYSTEM_NAVIGATION_CERTIFICATION.md | ✅ CERTIFIED (CRITICAL: 0, HIGH: 0) |
| **Platform V2** | **This document** | **✅ CERTIFIED** |

### Aggregate Finding Totals
| Severity | Count |
|---|---|
| CRITICAL | **0** |
| HIGH | **0** |
| MEDIUM | 1 (CRM link best-effort) |
| LOW | 4 (token refresh, function dep, CF Pages deploy, icon system) |

---

## OPEN ITEMS (Pre-Launch Checklist)

| # | Item | Priority | Owner |
|---|---|---|---|
| 1 | Deploy `profiles.rald.cloud` CF Pages app | P0 | Engineering |
| 2 | Run `20260603_identity_v2.sql` migration on production Supabase | P0 | Engineering |
| 3 | Deploy `rald-auth-core` v2.0.0 via GitHub → CF Workers | P0 | CI/CD auto |
| 4 | Add DNS record for `profiles.rald.cloud` → CF Pages | P0 | Infra |
| 5 | Implement refresh token rotation (V3 scope) | P2 | Engineering |
| 6 | Replace emoji icons with SVG icon system in App Launcher | P2 | Design |

---

## AUTHORIZATION

```
╔══════════════════════════════════════════════════════╗
║  RALD IDENTITY PLATFORM V2 — CERTIFIED ✅            ║
║                                                      ║
║  One RALD Identity.  One Login.                      ║
║  One Profile.        One Ecosystem.                  ║
║  Zero Reauthentication.  Zero Onboarding Loops.      ║
║                                                      ║
║  CRITICAL: 0 · HIGH: 0                               ║
║  Version: 2.0 — 2026-06-03                           ║
╚══════════════════════════════════════════════════════╝
```

**Signed:** LILCKY STUDIO LIMITED — 2026-06-03
