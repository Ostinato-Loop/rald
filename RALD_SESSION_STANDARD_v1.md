# RALD_SESSION_STANDARD_v1
**Document Type:** Platform Standard — DEPRECATED  
**Owner:** LILCKY STUDIO LIMITED  
**Ecosystem:** RALD  
**Date:** 2026-06-02  
**Version:** 1.0  
**Classification:** DEPRECATED — superseded by RALD_SESSION_STANDARD_v2.md

---

> ⚠️ **DEPRECATED — 2026-06-12**
>
> This document describes the v1 localStorage-based session model. It is **retired**.  
> The canonical session standard is now **[RALD_SESSION_STANDARD_v2.md](./RALD_SESSION_STANDARD_v2.md)**.
>
> **All products MUST migrate to Session Standard V2:**
> - Remove all `localStorage.getItem / setItem / removeItem` calls for auth tokens
> - Replace with HttpOnly cookie-based auth (`credentials: "include"` on fetch)
> - The shared `rald_session` cookie (Domain=.rald.cloud) is the single source of truth
>
> **Compliance deadline: public beta launch**

---

*Original v1 content preserved below for migration reference only.*

---

## PURPOSE

This document defined the universal session standard for the RALD ecosystem under v1 (localStorage-based auth). This approach has been retired due to XSS exposure risk — localStorage tokens are readable by any JavaScript executing on the page.

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

---

## 2. TOKEN STORAGE (RETIRED)

~~**Standard: localStorage**~~  
~~Key   : rald_auth_token~~  
~~Scope : Window origin (per subdomain on rald.cloud)~~

**V1 localStorage storage is retired. See v2 for the HttpOnly cookie standard.**

---

*Remainder of v1 spec omitted — see v2 document for the current standard.*

**Signed: LILCKY STUDIO LIMITED — 2026-06-02**  
**Deprecated: LILCKY STUDIO LIMITED — 2026-06-12**
