# RALD_SESSION_STANDARD_v2
**Document Type:** Platform Standard — Canonical  
**Owner:** LILCKY STUDIO LIMITED  
**Ecosystem:** RALD  
**Date:** 2026-06-12  
**Version:** 2.0  
**Classification:** OFFICIAL — SOURCE OF TRUTH  
**Supersedes:** RALD_SESSION_STANDARD_v1.md (localStorage model — retired)

---

## EXECUTIVE SUMMARY

Session Standard V2 retires all localStorage-based authentication across the RALD ecosystem. Authentication state is maintained exclusively via an HttpOnly cookie (`rald_session`) issued by the authoritative RALD identity worker at `auth.rald.cloud`. The cookie is scoped to `Domain=.rald.cloud`, making it automatically shared across all `*.rald.cloud` products without any JavaScript token passing.

**Core axiom:** No RALD JavaScript ever reads, writes, or forwards a session token. Authentication happens server-side through the cookie alone.

---

## 1. THE SESSION COOKIE

### Specification

| Property | Value |
|---|---|
| Name | `rald_session` |
| Domain | `.rald.cloud` |
| Path | `/` |
| HttpOnly | ✅ Yes (JS cannot read it) |
| Secure | ✅ Yes (HTTPS only) |
| SameSite | `Lax` |
| TTL | 30 days (rolling — refreshed on every validated request) |
| Issued by | `auth.rald.cloud` CF Worker (RALD_JWT_SECRET) |

### Per-product session cookies (optional)

Products may additionally issue their own HttpOnly session cookie for product-specific session state. These are scoped to their own subdomain (`Domain=messenger.rald.cloud`) and are SECONDARY to the root `rald_session` cookie.

| Product | Cookie Name | Domain |
|---|---|---|
| Messenger | `messenger_session` | `messenger.rald.cloud` |
| Loop | `loop_session` | `loop.rald.cloud` |
| Pay | `pay_session` | `pay.rald.cloud` |

---

## 2. JWT PAYLOAD (UNCHANGED)

```typescript
interface RaldJwtPayload {
  id: string;       // User UUID (internal)
  email: string;    // Primary email
  role: string;     // "user" | "merchant" | "admin" | "operator" | "viewer"
  iat: number;      // Issued at (Unix timestamp)
  exp: number;      // Expiry (Unix timestamp)
}
```

```
Algorithm : HS256
Secret    : RALD_JWT_SECRET (CF Worker secret — never exposed to frontend)
Issuer    : api.rald.cloud
```

---

## 3. SESSION EXPIRY

| Session Type | Expiry |
|---|---|
| Standard session | 30 days (rolling) |
| SSO handoff token | 5 minutes (one-time use) |
| OTP token | 10 minutes |
| Password reset | 15 minutes |

---

## 4. SESSION LIFECYCLE

### 4.1 Creation

```
User completes login at profiles.rald.cloud/login or app.rald.cloud/login

POST /api/auth/login
→ 200 { user: {...} }
  Set-Cookie: rald_session=<JWT>; Domain=.rald.cloud; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000

No token in the response body. The cookie is the session.
```

### 4.2 Validation (app init — V2 pattern)

```typescript
// On every RALD product's auth page init:

// 1. Check for ?rald_token= in URL (SSO handoff from another product)
const raldToken = new URLSearchParams(location.search).get("rald_token");
if (raldToken) {
  await fetch(`${API_BASE}/auth/rald-sso`, {
    method: "POST",
    credentials: "include",            // sends + receives cookies
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rald_token: raldToken }),
  });
  // Server validates handoff token, sets product session cookie
  // Client does NOT store raldToken. Remove from URL:
  window.history.replaceState({}, "", window.location.pathname);
  // Proceed to app
  return;
}

// 2. Attempt silent SSO via shared rald_session cookie
const res = await fetch(`${API_BASE}/auth/silent`, { credentials: "include" });
if (res.ok && (await res.json()).valid) {
  // Cookie is valid. Proceed to app.
  return;
}

// 3. No session — redirect to login
window.location.href = `https://profiles.rald.cloud/login?app_id=${APP_ID}&redirect_to=${encodeURIComponent(location.href)}`;
```

### 4.3 All API requests

```typescript
// Every API call must include credentials so the browser sends the session cookie.
// The RALD api-client-react customFetch does this automatically in V2:
fetch("/api/conversations", {
  credentials: "include",  // sends rald_session + product session cookie
});

// The server validates the cookie. No Authorization header needed.
// Authorization: Bearer is only used for Expo (mobile) builds via setAuthTokenGetter.
```

### 4.4 Cookie Refresh

On every authenticated API call, if the cookie TTL is within 7 days of expiry, the server issues a refreshed cookie (same JWT, new exp = +30 days). This is transparent to the client.

### 4.5 Logout

```typescript
// Client
await fetch(`${API_BASE}/auth/logout`, {
  method: "POST",
  credentials: "include",
});
// Server responds with:
// Set-Cookie: rald_session=; Max-Age=0; Domain=.rald.cloud; HttpOnly; Secure
// Set-Cookie: messenger_session=; Max-Age=0; ...  (product cookie if applicable)
// The cookies are cleared. Client has no token to delete from localStorage.
window.location.href = "https://profiles.rald.cloud/login";
```

### 4.6 Revocation

Server-side only. Sessions are stored in Supabase `sessions` table. Calling `DELETE /api/auth/sessions` (or `:id`) marks sessions as revoked. The next cookie validation returns 401 and clears the cookie.

---

## 5. CROSS-PRODUCT SSO (ZERO TOKEN PASSING)

### V2 Flow

Because `rald_session` has `Domain=.rald.cloud`, it is sent by the browser automatically to every `*.rald.cloud` subdomain. No token passing is needed for same-browser navigation.

```
User on loop.rald.cloud → clicks link → messenger.rald.cloud

messenger.rald.cloud loads → auth page runs:
  Step 1: No ?rald_token= in URL
  Step 2: GET /auth/silent { credentials: "include" }
          → Browser sends rald_session cookie automatically
          → Server validates → returns { valid: true }
          → User is signed in ✅

Zero tokens passed. Zero localStorage. Completely invisible to the user.
```

### When a handoff token IS needed

Only when the destination product requires its own signed product session (not just the root `rald_session`). In this case:

```
Source product: POST /auth/sso/handoff { app_id: "messenger" }
                credentials: "include"
                → Server returns { handoff_token: "<5-min one-time JWT>" }

Navigate to: https://messenger.rald.cloud/auth?rald_token=<handoff_token>&app_id=messenger

Messenger auth page:
  POST /auth/rald-sso { rald_token: <handoff_token> }
  credentials: "include"
  → Server validates → sets messenger_session cookie → done
  window.history.replaceState — token removed from URL
```

The handoff token is:
- Short-lived (5 minutes)
- One-time use (invalidated on exchange)
- Never stored by the client
- Removed from URL immediately after exchange

---

## 6. LOGOUT PROPAGATION

### V2 Approach

When the user logs out from any product:

1. The product calls `POST /api/auth/logout` (clears product + root cookies)
2. `auth.rald.cloud` marks the session as revoked in the sessions table
3. All other products will receive 401 on their next `/auth/silent` call and redirect to login

**Cross-tab propagation (V2):**
```typescript
// After logout, broadcast to other tabs of the same product:
const channel = new BroadcastChannel("rald_auth");
channel.postMessage({ type: "logout" });

// Every tab listens:
channel.addEventListener("message", (e) => {
  if (e.data.type === "logout") window.location.href = "/auth";
});
```

---

## 7. EXPO / REACT NATIVE (MOBILE) EXCEPTION

Mobile builds cannot use HttpOnly cookies. The V2 standard for Expo is:

1. Auth token stored in **SecureStore** (`expo-secure-store`) — NOT AsyncStorage
2. Token passed via `Authorization: Bearer <token>` header using `setAuthTokenGetter`
3. Token refreshed via `POST /api/auth/refresh` before expiry
4. `setAuthTokenGetter` is called ONLY in the Expo entry point — never in web builds

```typescript
// Expo main.tsx only — never in web main.tsx:
import * as SecureStore from "expo-secure-store";
setAuthTokenGetter(() => SecureStore.getItemAsync("rald_auth_token"));
```

---

## 8. WHAT IS EXPLICITLY FORBIDDEN

| Practice | Reason |
|---|---|
| `localStorage.setItem("rald_auth_token", ...)` | XSS-readable; retired in V2 |
| `localStorage.getItem("rald_auth_token")` | As above |
| `sessionStorage` for auth tokens | Same XSS risk |
| Passing JWT in URL params permanently | Leaks in browser history, referrer headers |
| `Authorization: Bearer` from localStorage in web builds | Retired in V2 |
| Reading cookie value in JS | Not possible for HttpOnly cookies — by design |

---

## 9. MIGRATION CHECKLIST (V1 → V2)

Per product, before public beta:

- [ ] Remove all `MESSENGER_TOKEN_KEY` / `RALD_TOKEN_KEY` / `rald_auth_token` localStorage reads/writes
- [ ] Remove `setAuthTokenGetter(() => localStorage.getItem(...))` from web main.tsx
- [ ] Add `credentials: "include"` to all `fetch()` calls (or confirm customFetch default is set)
- [ ] Verify `/auth/silent` returns `{ valid: true }` with a live `rald_session` cookie
- [ ] Verify `/auth/rald-sso` sets product session cookie via `Set-Cookie` header
- [ ] Verify `/auth/logout` clears all cookies via `Set-Cookie: ...; Max-Age=0`
- [ ] Replace cross-app token-in-URL navigation with direct link (cookie handles SSO)
- [ ] Update CORS on Express/Hono servers to allow `credentials: true`
- [ ] Verify `allowedOrigins` in CORS covers all `*.rald.cloud` origins

---

## 10. SERVER IMPLEMENTATION CONTRACT

Every RALD CF Worker or API server MUST:

```typescript
// On every protected route handler:
// 1. Read cookie (not Authorization header) for web requests:
const cookie = request.headers.get("Cookie");
const session = parseCookie(cookie)["rald_session"]; // or "messenger_session", etc.
if (!session) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

// 2. Verify JWT:
const payload = await verifyJwt(session, env.RALD_JWT_SECRET);
if (!payload) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

// 3. On successful validation + cookie near expiry → refresh:
const daysLeft = (payload.exp - Date.now() / 1000) / 86400;
if (daysLeft < 7) {
  // Re-sign and set refreshed cookie
  const refreshed = await signJwt(payload, env.RALD_JWT_SECRET, "30d");
  response.headers.append("Set-Cookie",
    `rald_session=${refreshed}; Domain=.rald.cloud; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`
  );
}
```

---

**Signed: LILCKY STUDIO LIMITED — 2026-06-12**  
**Status: CANONICAL — enforced for public beta**
