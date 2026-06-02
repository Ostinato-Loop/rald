# RALD_SESSION_STANDARD_v1
**Document Type:** Platform Standard — Canonical  
**Owner:** LILCKY STUDIO LIMITED  
**Ecosystem:** RALD  
**Date:** 2026-06-02  
**Version:** 1.0  
**Classification:** OFFICIAL — SOURCE OF TRUTH

---

## PURPOSE

This document defines the universal session standard for the RALD ecosystem. A user authenticates once and moves freely across all RALD products without re-authentication.

---

## 1. TOKEN SPECIFICATION

### JWT Structure
```
Algorithm : HS256 (HMAC-SHA256)
Secret    : RALD_JWT_SECRET (Cloudflare Worker secret — never exposed to frontend)
Issuer    : api.rald.cloud
```

### JWT Payload
```typescript
interface RaldJwtPayload {
  id: string;       // User UUID (internal)
  email: string;    // Primary email
  role: string;     // "user" | "merchant" | "admin" | "operator" | "viewer"
  iat: number;      // Issued at (Unix timestamp)
  exp: number;      // Expiry (Unix timestamp)
}
```

### Default Expiry
| Session Type | Expiry |
|---|---|
| Standard session | 24 hours (86400s) |
| Remember me (future) | 30 days (2592000s) |
| OTP token (short-lived) | 10 minutes (600s) |
| Email OTP session token | 15 minutes (900s) |
| Password reset code | 15 minutes (900s) |

---

## 2. TOKEN STORAGE

### Standard: localStorage
```
Key   : rald_auth_token
Scope : Window origin (per subdomain on rald.cloud)
```

### Cross-Product Accessibility
Because all RALD products are on `*.rald.cloud` subdomains, they each have their own localStorage partition (browsers partition localStorage by origin). Therefore:

**The JWT MUST be re-read from the ISSUING domain's storage via the SSO exchange flow** — products do not share localStorage directly across subdomains.

See Section 4 (SSO Exchange) for the cross-product token delivery mechanism.

### Session Memory Cache
After verifying the token on init, products MUST cache the `RaldUserState` in memory (React state, Zustand, etc.) for the duration of the session. They MUST NOT call `GET /api/auth/me` on every route change.

---

## 3. SESSION LIFECYCLE

### 3.1 Creation
```
POST /api/auth/login          → returns { token, user }
POST /api/auth/register       → returns { token, user }
POST /api/auth/verify-otp     → returns { token, user } | { newUser, otpToken }
POST /api/auth/verify-login-email-otp → returns { token, user } | { newUser, emailToken }
```
On receipt: `localStorage.setItem("rald_auth_token", token)`

### 3.2 Validation (on app init)
```typescript
const token = localStorage.getItem("rald_auth_token");
if (!token) → redirect to app.rald.cloud/login

GET /api/auth/me
Authorization: Bearer {token}

200 → cache user state, proceed
401 → clear localStorage, redirect to app.rald.cloud/login
```

### 3.3 Refresh
RALD JWTs are **not refreshed** — they expire and the user must re-authenticate. However, the 24h window means normal users are never interrupted during a working day.

**Future (V2):** Refresh token rotation with family-based invalidation.

### 3.4 Expiry Detection
On any API call returning `401`, products MUST:
1. Clear `rald_auth_token` from localStorage.
2. Call `raldAuth.logout()` to notify all listeners.
3. Redirect to `app.rald.cloud/login?redirect_to={current_url}&app_id={this_app}`.

### 3.5 Revocation
Sessions are revoked server-side via the sessions table. A revoked token will return `401` from `GET /api/auth/me`.

| Endpoint | Effect |
|---|---|
| `DELETE /api/auth/sessions/:id` | Revoke single session |
| `DELETE /api/auth/sessions` | Revoke all sessions |

### 3.6 Logout
```typescript
// Client-side
localStorage.removeItem("rald_auth_token");
raldAuth.logout(); // notifies all onAuthStateChange listeners
// Optional: redirect to app.rald.cloud/login or product home
```

---

## 4. SSO EXCHANGE — CROSS-PRODUCT SESSION FLOW

Since subdomains cannot directly access each other's localStorage, RALD uses a **URL-parameter-based token handoff** via `app.rald.cloud` as the SSO bridge.

### 4.1 Token Handoff Protocol

```
User on product-A, clicks link to product-B

product-A:
  token = localStorage.getItem("rald_auth_token")
  if (token) {
    // Pass token via secure handoff URL
    navigate to: https://app.rald.cloud/sso/handoff
      ?token={encodeURIComponent(token)}
      &destination={encodeURIComponent("https://product-b.rald.cloud/path")}
      &app_id=rald-product-a
  }

app.rald.cloud/sso/handoff:
  1. Validate token with GET /api/auth/me
  2. If valid: redirect to destination with token param
     → https://product-b.rald.cloud/path?sso_token={token}
  3. If invalid: redirect to /login

product-B on mount:
  sso_token = urlParams.get("sso_token")
  if (sso_token) {
    // Validate and store
    user = await GET /api/auth/me (with sso_token)
    localStorage.setItem("rald_auth_token", sso_token)
    // Remove token from URL (history.replaceState)
    window.history.replaceState({}, "", window.location.pathname)
  } else {
    // Normal init flow
    existing_token = localStorage.getItem("rald_auth_token")
    ...
  }
```

### 4.2 Security Rules for SSO Handoff
- `destination` MUST be validated against `*.rald.cloud` allowlist.
- `sso_token` MUST be removed from the URL after storage (prevent bookmark leakage).
- `app.rald.cloud/sso/handoff` MUST only accept tokens it can verify with `api.rald.cloud`.
- Tokens passed via URL are the same JWT — no new token is minted.

---

## 5. MULTI-DEVICE SESSIONS

### Session Table Schema
```sql
sessions (
  id          UUID PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id),
  token_hash  TEXT NOT NULL,      -- SHA-256 of JWT
  user_agent  TEXT,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  revoked_at  TIMESTAMPTZ         -- null = active
)
```

### Behaviour
- Each login creates one session record.
- Up to 10 concurrent sessions allowed per user (V1).
- Session list visible at `app.rald.cloud/settings/sessions`.
- Any session can be individually revoked.
- "Sign out everywhere" revokes all sessions via `DELETE /api/auth/sessions`.

---

## 6. LOGOUT PROPAGATION

### Tab-Level (BroadcastChannel — future V2)
```typescript
// Emit logout event to all open tabs of the same origin
const channel = new BroadcastChannel("rald_auth");
channel.postMessage({ type: "logout" });
channel.addEventListener("message", (e) => {
  if (e.data.type === "logout") raldAuth.logout();
});
```

### Cross-Product (V1 — manual)
In V1, logout clears localStorage on the current product only. The user is logged out from other products when their token is next validated (401 response on next API call).

### Cross-Product (V2 — active propagation)
Future: `app.rald.cloud` broadcasts logout to all product origins via cross-origin postMessage or a shared Cloudflare KV revocation list.

---

## 7. AUTH STATE LISTENER PATTERN

All RALD React apps MUST implement the auth state listener pattern:

```typescript
// On app init (AuthProvider)
useEffect(() => {
  const unsubscribe = raldAuth.onAuthStateChange((session) => {
    setUser(session?.user ?? null);
    setToken(session?.token ?? null);
    if (!session) {
      // User logged out — redirect to login
      window.location.href = `https://app.rald.cloud/login
        ?redirect_to=${encodeURIComponent(window.location.href)}
        &app_id=${APP_ID}`;
    }
  });
  return unsubscribe;
}, []);
```

---

## 8. COMPLIANCE CHECKLIST

- [ ] Token stored as `rald_auth_token` in localStorage (not a custom key)
- [ ] Token validated via `GET /api/auth/me` on every app init
- [ ] 401 response → clear localStorage → redirect to login
- [ ] `raldAuth.onAuthStateChange` listener registered in AuthProvider
- [ ] SSO handoff implemented for cross-product navigation
- [ ] `sso_token` removed from URL after storage
- [ ] Logout clears `rald_auth_token` and calls `raldAuth.logout()`
- [ ] No token stored in sessionStorage, cookies (without httpOnly), or URL permanently
- [ ] User state contract cached in memory — NOT re-fetched on every route change

---

**Signed: LILCKY STUDIO LIMITED — 2026-06-02**
