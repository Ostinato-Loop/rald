# AUTH_REDIRECT_AUDIT.md
**RALD Auth V1 Lockdown — Redirect Security Audit**
**Date:** 2026-06-09
**Auditor:** LILCKY STUDIO LIMITED Engineering
**Scope:** All RALD ecosystem products with auth flows

---

## SUMMARY

| Status | Count | Description |
|---|---|---|
| ✅ PASS | 2 | Correct redirect flow implemented |
| ⚠️ GAP | 3 | Partial implementation — gaps documented |
| ❌ FAIL | 6 | No auth / redirect flow at all |
| 🔥 RISK | 1 | Token storage in localStorage (XSS exposure) |

---

## REDIRECT FLOW STANDARD

All RALD products must implement this exact pattern:

```
User visits protected route
  ↓
ProtectedRoute detects no session
  ↓
Redirect → profiles.rald.cloud/login?app_id=<id>&redirect_to=<callback>
  ↓
User authenticates at profiles.rald.cloud
  ↓
profiles.rald.cloud redirects → <callback>?rald_token=<JWT>
  ↓
App callback page: store rald_master_token → exchange for app-scoped token
  ↓
Navigate to intended destination (preserved via `next` param)
```

---

## PRODUCT AUDIT

### 1. Loop (`loop.rald.cloud`) — ✅ PASS

**Flow implemented correctly.**

- `login.tsx` shows a 2-second interstitial → redirects to:
  ```
  https://profiles.rald.cloud/login?app_id=loop&redirect_to=<callbackUrl>
  ```
- Callback URL includes `?next=<intended_path>` (correctly threaded through)
- `/auth/callback` page catches `rald_token` param → `AuthProvider` stores as `rald_master_token` in localStorage
- `AuthProvider` then calls `POST /api/auth/rald-sso` (Loop Worker) to exchange for loop-scoped JWT (`loop_token`)
- `ProtectedRoute` redirects unauthenticated users to `/login?next=<path>` — destination preserved

**Findings:**
- Loop also has its own phone OTP flow (`/api/auth/send-otp`, `/api/auth/verify-otp`) — this is acceptable as a direct-entry path and not a duplicate identity system (same `RALD_JWT_SECRET`)
- `openMessenger()` and `openProfiles()` helpers use `rald_master_token` to enable cross-app navigation without re-auth ✅
- `ssoError` state surfaced to user on callback failure ✅

**Gaps:**
- ❗ Token stored in `localStorage` (not HttpOnly cookie) — documented in security audit
- ❗ No silent token refresh — if 1-hour app token expires mid-session, user is silently logged out
- ❗ `VITE_RALD_AUTH_URL` env var must be set to `https://profiles.rald.cloud` in Cloudflare Pages — if unset, auth redirects go to undefined

**Verdict:** Auth redirect is correct. Storage and refresh need hardening.

---

### 2. Loop Messenger (`chat.rald.cloud`) — ✅ PASS

**SSO implemented, stateless architecture.**

- Accepts `rald_token` URL param on all pages
- `POST /auth/rald-sso` verifies token locally using shared `RALD_JWT_SECRET` — no HTTP round-trip to auth.rald.cloud ✅
- `GET /auth/silent` endpoint handles cookie-based silent session check
- Messenger is fully stateless — the RALD JWT IS the session, no separate user database
- `authMiddleware` validates Bearer token on every API call

**Gaps:**
- ❗ No documented callback URL registered in `registered_apps` table
- ❗ Frontend redirect path (unauthenticated entry) not audited — unclear if `return_to` is preserved for deep links
- ❗ No logout propagation to `auth.rald.cloud`

---

### 3. RALD Control Center (`admin.rald.cloud`) — ⚠️ PARTIAL

**Status: Auth exists, redirect standard not confirmed.**

- 89 files, full admin panel
- Auth implementation not read in this audit cycle
- `rald-auth-ui` registers `rald-control-center` as a known app_id in FALLBACK_APP_IDS ✅

**Action required:** Read `rald-control-center` auth flow and confirm `return_to` preservation.

---

### 4. Loop Business (`business.rald.cloud`) — ❌ FAIL

**No authentication whatsoever.**

- 131 files, all mock data
- No RALD Auth integration
- No `ProtectedRoute` equivalent
- No redirect to `profiles.rald.cloud`
- All routes fully accessible without authentication

**Impact:** Not yet deployed as a real product — UI prototype only. Auth must be wired before any real users touch this.

---

### 5. PayRald UI (`pay.rald.cloud`) — ❌ FAIL

**No authentication whatsoever.**

- 101 files, Lovable-built UI prototype
- No RALD Auth integration
- All data is hardcoded mock

**Impact:** Not yet deployed to real users. Auth must be the first engineering task when PayRald backend begins.

---

### 6. RALD TV (`tv.rald.cloud`) — ❌ FAIL

**No authentication whatsoever.**

- 90 files, Lovable-built UI prototype
- Static image content, no backend, no auth

---

### 7. RALD Memories, Mail, Dispatch, AI UIs — ❌ FAIL (×4)

All are Lovable-built UI prototypes with no auth integration. Not yet deployed to real users.

---

### 8. RALD Auth UI itself (`profiles.rald.cloud`) — ⚠️ PARTIAL

**Hosts the login UX — is the identity hub.**

- Handles `app_id` and `redirect_to` query params
- Redirects back to app callback URL with `rald_token`
- Known pages: Login, Register, Verify (OTP), Password, Forgot, Reset, Suspended, Identity, Dashboard
- `validateRedirectUrl()` enforces `*.rald.cloud` and `*.ostloop.name.ng` only ✅

**Gap found — PARAMETER NAMING INCONSISTENCY:**

The RALD Auth V1 Lockdown Directive specifies `return_to` as the standard parameter.
The actual codebase uses `redirect_to` everywhere.

**Decision:** Standardize on `redirect_to` (it is the implemented standard). Update the directive language.

---

## REDIRECT SECURITY RULES (IMPLEMENTED)

From `src/lib/redirect.ts` in rald-auth-core:

```typescript
const ALLOWED_PATTERNS: RegExp[] = [
  /^https:\/\/rald\.cloud(\/.*)?$/,
  /^https:\/\/[\w-]+\.rald\.cloud(\/.*)?$/,
  /^https:\/\/ostloop\.name\.ng(\/.*)?$/,
  /^https:\/\/[\w-]+\.ostloop\.name\.ng(\/.*)?$/,
];
```

- HTTP rejected ✅
- Non-RALD domains rejected ✅
- Validated on `POST /sso/exchange`, `POST /sso/handoff`, `POST /sso/registry` ✅
- `safeRedirect()` helper returns fallback to `profiles.rald.cloud` on invalid URL ✅
- `GET /sso/validate-redirect` endpoint allows apps to pre-check URLs ✅

---

## INFINITE REDIRECT RISK ASSESSMENT

| Scenario | Risk | Mitigation |
|---|---|---|
| Unauthenticated user hits protected Loop route | LOW | `ProtectedRoute` → `/login?next=<path>` → profiles.rald.cloud → `/auth/callback?next=<path>` → destination |
| Auth callback fails (bad token) | LOW | `ssoError` state shows error UI, links back to `/login` — no loop |
| Profile fetch fails after valid auth | LOW | `profile===null` falls through rather than blocking, user enters app |
| Supabase key missing | LOW | `authedSupabase()` returns 401s gracefully, does not redirect loop |
| `VITE_RALD_AUTH_URL` not set | MEDIUM | Falls back to `https://profiles.rald.cloud` hardcoded ✅ |
| Expired `rald_master_token` (24h) | MEDIUM | App token (1h) expires first; no silent refresh → auth flow triggered |
| App registered with wrong callback_url | LOW | `validateRedirectUrl()` rejects non-ecosystem URLs at SSO exchange |

**No infinite redirect loops detected in Loop or Messenger.**

---

## ACTION ITEMS

| Priority | Item | Owner | ETA |
|---|---|---|---|
| P0 | Set `VITE_RALD_AUTH_URL` in Cloudflare Pages for Loop | Infra | Immediate |
| P0 | Register Messenger callback URL in `registered_apps` table | Auth team | This sprint |
| P1 | Implement silent token refresh in Loop `AuthProvider` | Loop | Sprint 2 |
| P1 | Wire RALD Auth into Loop Business when backend begins | Business | Sprint 3 |
| P2 | Audit `rald-control-center` auth flow | Auth team | Sprint 2 |
| P2 | Standardize `redirect_to` parameter name in all docs | Docs | This sprint |
| P3 | Wire RALD Auth into PayRald UI before real users | PayRald | Before PayRald beta |

---

*Generated from source code audit of Ostinato-Loop GitHub organization*
*Audited repos: loop, messenger, rald-auth-core, rald-auth-ui, rald-loop-business, payrald-ui-ux, rald-tv-ui-ux*
