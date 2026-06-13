# RALD — Session Standard V2

**Document:** SESSION_STANDARD_V2.md  
**Status:** V2 Active — Legacy V1 Retired  
**Owner:** LILCKY STUDIO LIMITED  
**Last Updated:** 2026-06-13  
**Supersedes:** SESSION_STANDARD_V1 (retired)

---

## V2 Canonical Session

Every RALD ecosystem session is stored in an **HttpOnly cookie**:

```
Set-Cookie: rald_session=<jwt>
  Domain=.rald.cloud
  Path=/
  Max-Age=2592000        (30 days)
  HttpOnly
  Secure
  SameSite=Lax
```

Product-scoped sessions use the product's cookie name:

| Product | Cookie Name | Domain | SameSite |
|---------|-------------|--------|----------|
| auth.rald.cloud | `rald_session` | `.rald.cloud` | `Lax` |
| loop.rald.cloud | `loop_session` | *(no domain scope — P9 fix needed)* | `Lax` |

---

## V1 Legacy Storage (Retired)

The following patterns are **retired** and must not be used:

```javascript
// ❌ RETIRED — V1 patterns
localStorage.setItem("rald_token", token)
localStorage.setItem("loop_token", token)
localStorage.setItem("rald_master_token", token)
localStorage.setItem("rald_auth_token", token)
sessionStorage.setItem("rald_token", token)
```

### Migration Status

| File | Legacy Pattern | Status |
|------|---------------|--------|
| `loop/src/lib/session-store.ts` | `localStorage["loop_token"]` | ✅ Replaced with in-memory + cookie |
| `loop/src/hooks/use-auth.tsx` | `localStorage["rald_master_token"]` | ✅ Removed (COOKIE-001) |
| `loop/src/lib/cross-app.ts` | `rald_master_token` in URL | ✅ Replaced with handoff tokens |
| `rald-auth-ui/src/lib/api.ts` | `localStorage.getItem("rald_token")` | ⚠️ Exists but app is deprecated (redirects only) |
| `rald-identity/src/lib/store.ts` | `sessionStorage` for flow state | ✅ Acceptable — non-sensitive flow state only |

---

## V2 Token Architecture

```
In-memory (tab lifetime only):
  getSessionToken() / setSessionToken()  — loop/src/lib/session-store.ts
  Used by: api-fetch.ts for Authorization headers

HttpOnly Cookie (30-day persistence):
  loop_session — survives page refresh
  rald_session — survives page refresh, cross-subdomain

On page refresh:
  AuthProvider → GET /api/auth/silent → cookie-based re-hydration
  → fresh access_token returned → stored in memory
```

---

## Phase 9 Outstanding Items

| Item | Status | Priority |
|------|--------|----------|
| Add `Domain=.rald.cloud` to `loop_session` cookie | ❌ Not done | High |
| Change `SameSite=Lax` → `SameSite=None` on loop_session | ❌ Not done | Medium |
| Remove deprecated `rald-auth-ui/src/lib/api.ts` localStorage read | ⚠️ App deprecated — redirect only | Low |
| Audit all RALD products for remaining localStorage token storage | ❌ Not audited | Medium |

---

## Audit — Files with localStorage/sessionStorage Usage

Files found using `localStorage` or `sessionStorage` across audited repos:

- `rald-identity/src/lib/store.ts` — sessionStorage for **non-sensitive flow state** (username, appId, redirectTo) — ✅ Acceptable
- `rald-identity/src/screens/Login.tsx` — `localStorage` for last identifier (non-sensitive UX hint) — ✅ Acceptable  
- `loop/src/lib/session-store.ts` — ✅ In-memory only, no localStorage
- `loop/src/hooks/use-auth.tsx` — ✅ No localStorage (COOKIE-001)
- `loop/src/lib/cross-app.ts` — ✅ No localStorage (COOKIE-001)
- `rald-auth-ui/src/lib/api.ts` — ❌ `localStorage.getItem("rald_token")` — app deprecated
- `rald-auth-ui/src/pages/*` — ❌ Various localStorage reads — app deprecated (redirect-only)

---

## Audit Log

| Date | Change |
|------|--------|
| 2026-06-13 | V2 session standard documented, V1 retired |
| 2026-06-09 | COOKIE-001: HttpOnly cookies deployed, localStorage cleared |

