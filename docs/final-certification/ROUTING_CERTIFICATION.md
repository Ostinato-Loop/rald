# ROUTING_CERTIFICATION.md
**Certification Type:** Phase G Final Authorization  
**Scope:** Routing across all RALD domains — all user states  
**Owner:** LILCKY STUDIO LIMITED  
**Date:** 2026-06-02

---

## 1. GOVERNING STANDARD

**RALD_ROUTING_STANDARD_v1.md** (Phase F.75) defines all routing rules. This certification verifies implementation compliance.

---

## 2. DOMAIN ROUTING MATRIX

| Domain | Repo | Status | Auth-Required |
|---|---|---|---|
| `auth.rald.cloud` | rald-auth-core | ✅ LIVE | Public (login/register) + JWT (protected) |
| `api.rald.cloud` | rald/artifacts/api-worker | ✅ LIVE | JWT all routes |
| `app.rald.cloud` | rald/artifacts/rald-app | ✅ LIVE | Auth-gated SPA |
| `admin.rald.cloud` | rald/artifacts/rald-control-center | ✅ LIVE | Admin role required |
| `rald.cloud` | rald/artifacts/rald-marketing | ✅ LIVE | Public |
| `credentials.rald.cloud` | rald/artifacts/credentials-portal | ✅ LIVE | Auth-gated |
| `notification.rald.cloud` | rald-notify | ✅ LIVE | JWT |
| `search.rald.cloud` | rald-search | ✅ LIVE | JWT |
| `inbox.rald.cloud` | rald-inbox | ✅ LIVE | JWT |
| `crm.rald.cloud` | loop-crm | ✅ LIVE | JWT |
| `loop.rald.cloud` | loop | ⚠️ Pre-launch | JWT |
| `messenger.rald.cloud` | messenger | ⚠️ Pre-launch | JWT |
| `business.rald.cloud` | rald-loop-business | ⚠️ Pre-launch | JWT |
| `profiles.rald.cloud` | (to be assigned) | ⚠️ Pre-launch | JWT |

---

## 3. USER STATE ROUTING

### 3.1 Unauthenticated User
```
Request to any protected *.rald.cloud route
  → 401 from API or auth guard in SPA
  → redirect to app.rald.cloud/login?redirect_to=<encoded_url>&app_id=<id>
  → After login → JWT issued → redirect to original URL
```
**Status:** ✅ Standard-defined and implemented in auth-gated SPAs

### 3.2 New User (onboarding_complete=false)
```
Login → API returns user.onboarding_complete=false
  → SPA redirects to /onboarding
  → User completes onboarding → PATCH /api/users/me { onboarding_complete: true }
  → Redirect to redirect_to OR product home
```
**Status:** ✅ Standard-defined; `safeRedirect()` prevents loops

### 3.3 Returning User (onboarding_complete=true)
```
App initialises → GET /auth/me → valid user + onboarding_complete=true
  → Load product directly
  → No redirect, no re-auth
```
**Status:** ✅ Auth SDK `me()` on app init

### 3.4 Expired Session
```
Any API call → 401
  → Auth SDK clears localStorage
  → redirect to /login?redirect_to=<current_path>
  → Login → new JWT → returns to original path
```
**Status:** ✅ All platform services return 401 on expired JWT

### 3.5 Cross-Product Navigation
```
User on Product A → selects Product B
  → POST /sso/exchange { appId: "product-b" }
  → Receive app-scoped token (1h)
  → Navigate to product-b.rald.cloud?token=<app_token>&workspace_id=<id>
  → Product B validates → loads
```
**Status:** ✅ Exchange implemented; URL pattern standard-defined

---

## 4. REDIRECT LOOP ELIMINATION

All 7 redirect loops identified in Phase F.75 have been eliminated:

| Loop | Elimination Method |
|---|---|
| Product → onboarding → product → onboarding | `safeRedirect()` counter (max 3) |
| Auth → already-auth → auth | SPA guard checks auth state before redirect |
| Onboarding → already-complete → onboarding | `onboarding_complete` check before redirect |
| Workspace-select → no workspace → workspace-select | Fallback to workspace creation |
| SSO → invalid token → SSO | Token validated before any redirect |
| 404 → app root → 404 | Catch-all route in SPA router |
| Admin → non-admin route → admin | Role redirect is one-time |

---

## 5. PARAMETER VERIFICATION

| Parameter | Validation | Status |
|---|---|---|
| `redirect_to` | `encodeURIComponent` on outgoing; pattern match `^https://([a-z0-9-]+\.)?rald\.cloud` | ✅ Standard-defined |
| `app_id` | Informational only; logged, not behaviour-changing | ✅ |
| `workspace_id` | URL param overrides localStorage; JWT claim authoritative on server | ✅ |
| `token` | Validated immediately on receipt; discarded from URL | ✅ Standard-defined |

---

## 6. FINDINGS

| ID | Severity | Root Cause | Repo | Service | Evidence | Fix | Effort | Verify |
|---|---|---|---|---|---|---|---|---|
| RT-F01 | **MEDIUM** | `redirect_to` validation utility (`sanitiseRedirectTo()`) not confirmed as shipped in all products | All frontend repos | app.rald.cloud, loop, messenger | No shared utility found in rald-design-system | Build and ship `sanitiseRedirectTo()` in `@rald/ui` before consumer launch | 1 day | All products import from @rald/ui; invalid redirect_to defaults to /home |
| RT-F02 | **MEDIUM** | SSO handoff URL exposes app-scoped token in query string — visible in browser history and server logs | All products | Cross-service | Standard §4 defines URL-based handoff | Implement one-time exchange code (TTL 10s) to replace token in URL | 2 days | Token in URL is unguessable + expires in 10s; not reusable |
| RT-F03 | LOW | `profiles.rald.cloud`, `business.rald.cloud` not yet assigned Cloudflare Pages domains | rald-control-center, rald-loop-business | CF Pages | No wrangler.toml route for these domains | Assign domains before product launch | 1 day | CF Pages dashboard shows domain assigned |
| RT-F04 | LOW | `messenger.rald.cloud` domain assignment not confirmed in messenger repo wrangler config | messenger | CF Worker | No route pattern for messenger.rald.cloud found | Add route to wrangler.toml; push to GitHub | 2h | messenger.rald.cloud resolves to CF Worker |
| RT-F05 | INFO | Deep-link routing (direct URL to specific content) not formally standardised | All | Cross-service | Standard covers top-level routing only | V2 deep-link standard | 2 days | N/A |

---

## 7. CERTIFICATION RESULT

```
╔════════════════════════════════════════════════════════════════╗
║  ROUTING_CERTIFICATION = PASS WITH MITIGATIONS                 ║
║  CRITICAL: 0 · HIGH: 0 · MEDIUM: 2 · LOW: 2 · INFO: 1       ║
║  Routing standard issued · All redirect loops eliminated       ║
║  SSO handoff + redirect_to validation required before launch  ║
╚════════════════════════════════════════════════════════════════╝
```

**Signed: LILCKY STUDIO LIMITED — 2026-06-02**
