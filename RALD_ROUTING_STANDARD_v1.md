# RALD_ROUTING_STANDARD_v1
**Document Type:** Platform Standard — Canonical  
**Owner:** LILCKY STUDIO LIMITED  
**Ecosystem:** RALD  
**Date:** 2026-06-02  
**Version:** 1.0  
**Classification:** OFFICIAL — SOURCE OF TRUTH

---

## PURPOSE

This document defines the universal routing standard for every current and future RALD product. Any product that deviates from this standard is non-compliant and must be remediated before launch.

---

## GUIDING PRINCIPLES

1. **Auth is centralised.** `api.rald.cloud` is the sole issuer of RALD JWTs.
2. **Onboarding is centralised.** `app.rald.cloud` is the sole arbiter of onboarding status.
3. **Products are consumers.** Products receive and trust the shared user state contract; they do not produce it.
4. **One login, all products.** A valid `rald_auth_token` in localStorage grants access across every RALD product on `*.rald.cloud`.
5. **No silent failures.** Every failed auth check must produce a deterministic redirect — never a blank page or infinite loop.

---

## 1. TRUSTED DOMAINS

All routing decisions between RALD products operate within the `rald.cloud` domain space.

| Domain | Product | Trust Level |
|---|---|---|
| `api.rald.cloud` | Identity & API | ISSUER — highest |
| `app.rald.cloud` | Platform Hub + Onboarding | AUTHORITY |
| `admin.rald.cloud` | Control Center | OPERATOR |
| `profiles.rald.cloud` | User Profiles | CONSUMER |
| `loop.rald.cloud` | Loop Social | CONSUMER |
| `business.rald.cloud` | Loop Business | CONSUMER |
| `messenger.rald.cloud` | Messenger | CONSUMER |
| `connect.rald.cloud` | Connect | CONSUMER |
| `developer.rald.cloud` | Developer Portal | CONSUMER |
| `notification.rald.cloud` | Notifications | SERVICE |
| `search.rald.cloud` | Search | SERVICE |
| `inbox.rald.cloud` | Unified Inbox | CONSUMER |

---

## 2. STANDARD URL PARAMETERS

All RALD products MUST honour the following query parameters when present:

| Parameter | Type | Description |
|---|---|---|
| `redirect_to` | `string` (URL-encoded) | The URL to return the user to after auth completes |
| `app_id` | `string` | The originating product identifier |
| `workspace_id` | `string` (UUID) | Pre-selects a workspace on arrival |
| `error` | `string` | Error code passed between products (see Section 6) |

### Rules
- `redirect_to` MUST be validated against the RALD trusted domain allowlist before use.
- Any `redirect_to` pointing outside `*.rald.cloud` MUST be rejected; redirect to `app.rald.cloud` instead.
- `redirect_to` MUST be URL-encoded when appended to a URL.
- `app_id` is informational only — products MUST NOT alter behaviour based on `app_id` alone.

### App ID Registry

| app_id | Product |
|---|---|
| `rald-app` | app.rald.cloud |
| `rald-profiles` | profiles.rald.cloud |
| `rald-loop` | loop.rald.cloud |
| `rald-business` | business.rald.cloud |
| `rald-messenger` | messenger.rald.cloud |
| `rald-connect` | connect.rald.cloud |
| `rald-developer` | developer.rald.cloud |
| `rald-admin` | admin.rald.cloud |

---

## 3. ROUTE PROTECTION STANDARD

Every RALD product MUST implement route protection in the following order:

```
Request arrives
      │
      ▼
[1] Read localStorage("rald_auth_token")
      │
      ├── null ──► Redirect to app.rald.cloud/login
      │             with redirect_to={current_url}&app_id={this_app}
      │
      ▼
[2] POST /api/auth/me (verify token with api.rald.cloud)
      │
      ├── 401 ──► Clear token from localStorage
      │            Redirect to app.rald.cloud/login
      │             with redirect_to={current_url}&app_id={this_app}
      │
      ▼
[3] Read onboarding_complete from user state contract
      │
      ├── false ──► Redirect to app.rald.cloud/onboarding
      │              with redirect_to={current_url}&app_id={this_app}
      │              DO NOT implement local onboarding
      │
      ▼
[4] Check workspace_id (if product is workspace-scoped)
      │
      ├── missing ──► Redirect to app.rald.cloud/workspace-select
      │               with redirect_to={current_url}&app_id={this_app}
      │
      ▼
[5] Check RBAC (role-specific routes)
      │
      ├── insufficient ──► Render 403 page (DO NOT redirect)
      │
      ▼
[6] Render protected content
```

---

## 4. REDIRECT RULES

### 4.1 Auth Redirect
When a product needs to send the user to authenticate:
```
https://app.rald.cloud/login
  ?redirect_to={encodeURIComponent(currentUrl)}
  &app_id={this_app_id}
```

### 4.2 Post-Auth Return
After a successful login at `app.rald.cloud`:
1. Check `redirect_to` parameter.
2. Validate `redirect_to` is within `*.rald.cloud`.
3. If valid: redirect to `redirect_to`.
4. If missing or invalid: redirect to `app.rald.cloud/home`.

### 4.3 Onboarding Redirect
When a product detects onboarding is incomplete (via user state contract):
```
https://app.rald.cloud/onboarding
  ?redirect_to={encodeURIComponent(currentUrl)}
  &app_id={this_app_id}
```

### 4.4 Post-Onboarding Return
After onboarding completes at `app.rald.cloud`:
1. Check `redirect_to`.
2. Validate within `*.rald.cloud`.
3. If valid: redirect to `redirect_to`.
4. If missing: redirect to `app.rald.cloud/home`.

---

## 5. LOOP PREVENTION

### 5.1 Redirect Counter
Every product MUST track redirect attempts using sessionStorage:

```typescript
const REDIRECT_KEY = "rald_redirect_count";
const MAX_REDIRECTS = 3;

function safeRedirect(url: string): void {
  const count = parseInt(sessionStorage.getItem(REDIRECT_KEY) ?? "0", 10);
  if (count >= MAX_REDIRECTS) {
    sessionStorage.removeItem(REDIRECT_KEY);
    window.location.href = "https://app.rald.cloud/error?code=redirect_loop";
    return;
  }
  sessionStorage.setItem(REDIRECT_KEY, String(count + 1));
  window.location.href = url;
}
```

### 5.2 Onboarding Loop Prevention
`app.rald.cloud` MUST NOT redirect to onboarding if the user is already on `app.rald.cloud/onboarding`.

### 5.3 Auth Loop Prevention
`app.rald.cloud` MUST NOT redirect to login if the user is already on `app.rald.cloud/login`.

### 5.4 `redirect_to` Sanitisation
```typescript
const RALD_DOMAIN_PATTERN = /^https:\/\/([a-z0-9-]+\.)?rald\.cloud(\/.*)?$/;

function sanitiseRedirectTo(url: string | null): string {
  if (!url) return "https://app.rald.cloud/home";
  try {
    const decoded = decodeURIComponent(url);
    if (RALD_DOMAIN_PATTERN.test(decoded)) return decoded;
  } catch { /* ignore */ }
  return "https://app.rald.cloud/home";
}
```

---

## 6. ERROR CODES

| Code | Meaning | Default Destination |
|---|---|---|
| `unauthenticated` | No valid session | `app.rald.cloud/login` |
| `onboarding_required` | Onboarding incomplete | `app.rald.cloud/onboarding` |
| `workspace_required` | No workspace context | `app.rald.cloud/workspace-select` |
| `permission_denied` | Insufficient role | Product's own 403 page |
| `session_expired` | Token expired | `app.rald.cloud/login` |
| `account_suspended` | User suspended | `app.rald.cloud/suspended` |
| `account_deleted` | User deleted | `app.rald.cloud/deleted` |
| `redirect_loop` | Loop detected | `app.rald.cloud/error?code=redirect_loop` |

---

## 7. NAVIGATION LIFECYCLE

```
Cold Start (no token)
  └─► app.rald.cloud/login → auth → return to product

Warm Start (valid token, onboarding complete)
  └─► Product loads directly ✅

Warm Start (valid token, onboarding incomplete)
  └─► Product → app.rald.cloud/onboarding → return to product

Warm Start (expired token)
  └─► Product → clear token → app.rald.cloud/login → return to product

Cross-Product Navigation
  └─► User clicks product link → product reads localStorage
      └─► Token present → verify with api.rald.cloud
          └─► Valid → render (no redirect needed) ✅
          └─► Invalid → redirect to app.rald.cloud/login
```

---

## 8. COMPLIANCE CHECKLIST

Every RALD product MUST pass this checklist before launch:

- [ ] Uses `rald_auth_token` from localStorage (not a custom token key)
- [ ] Calls `GET /api/auth/me` to validate token on app init
- [ ] Redirects to `app.rald.cloud/login` (not a local login page) on auth failure
- [ ] Reads `onboarding_complete` from user state contract (does NOT implement own logic)
- [ ] Redirects to `app.rald.cloud/onboarding` when `onboarding_complete = false`
- [ ] Honours `redirect_to` and `app_id` parameters
- [ ] Sanitises `redirect_to` against `*.rald.cloud` allowlist
- [ ] Implements redirect loop counter (max 3, sessionStorage)
- [ ] Clears `rald_auth_token` on logout
- [ ] Does NOT store auth state in a product-specific localStorage key

---

**Signed: LILCKY STUDIO LIMITED — 2026-06-02**
