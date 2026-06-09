# SSO_COMPATIBILITY_MATRIX.md
**RALD Ecosystem — SSO Compatibility Matrix**
**Date:** 2026-06-09
**Version:** 1.0
**Authority:** RALD Auth V1 Lockdown Directive

---

## THE SSO STANDARD

Every RALD product must be able to:

1. **Receive** a `rald_token` URL parameter on any page
2. **Exchange** it at RALD Auth Core for an app-scoped token
3. **Redirect** unauthenticated users to `profiles.rald.cloud/login?app_id=<id>&redirect_to=<callback>`
4. **Handle** the callback with `?rald_token=<JWT>` in the URL
5. **Silently validate** session on page load without prompting re-auth

---

## MATRIX

| Product | App ID | Domain | Receive Token | Exchange Token | Auth Redirect | Silent Session | Global Logout | Deep Link Support | Overall |
|---|---|---|---|---|---|---|---|---|---|
| **RALD Auth Core** | `profiles` | auth.rald.cloud | ✅ native | ✅ native | ✅ IS the IdP | ✅ `/session` | ✅ `/session/revoke-all` | ❌ not built | 🟢 **LIVE** |
| **Loop** | `loop` | loop.rald.cloud | ✅ `/auth/callback` | ✅ `/api/auth/rald-sso` | ✅ `/login` → profiles | ⚠️ no refresh | ⚠️ local only | ❌ not built | 🟡 **COMPATIBLE** |
| **Messenger** | `messenger` | chat.rald.cloud | ✅ URL param | ✅ `/auth/rald-sso` | ⚠️ not confirmed | ✅ `/auth/silent` | ❌ not built | ❌ not built | 🟡 **COMPATIBLE** |
| **Control Center** | `rald-control-center` | admin.rald.cloud | ❓ unknown | ❓ unknown | ❓ unknown | ❓ unknown | ❓ unknown | ❌ N/A | ⚪ **UNAUDITED** |
| **Loop Business** | `loop-business` | business.rald.cloud | ❌ none | ❌ none | ❌ none | ❌ none | ❌ none | ❌ none | 🔴 **NOT INTEGRATED** |
| **PayRald** | `payrald` | pay.rald.cloud | ❌ none | ❌ none | ❌ none | ❌ none | ❌ none | ❌ none | 🔴 **NOT INTEGRATED** |
| **RALD TV** | `rald-tv` | tv.rald.cloud | ❌ none | ❌ none | ❌ none | ❌ none | ❌ none | ❌ none | 🔴 **NOT INTEGRATED** |
| **Memories** | TBD | memories.rald.cloud | ❌ none | ❌ none | ❌ none | ❌ none | ❌ none | ❌ none | 🔴 **NOT INTEGRATED** |
| **Mail** | TBD | mail.rald.cloud | ❌ none | ❌ none | ❌ none | ❌ none | ❌ none | ❌ none | 🔴 **NOT INTEGRATED** |

---

## SSO ENGINE DETAIL (RALD Auth Core v2.3.0)

### Endpoints

| Endpoint | Method | Purpose | Auth Required |
|---|---|---|---|
| `POST /sso/exchange` | POST | Exchange master JWT for app-scoped token (1h) | ✅ Bearer JWT |
| `POST /sso/handoff` | POST | Browser redirect SSO — issues 5-min handoff token | ✅ Bearer JWT |
| `POST /sso/verify` | POST | Verify any RALD token (for microservices) | ❌ Public |
| `GET /sso/apps` | GET | List all registered app IDs (DB-driven) | ❌ Public |
| `GET /sso/registry` | GET | Full app registry with domains + callbacks | ❌ Public |
| `POST /sso/registry` | POST | Register a new ecosystem app | ✅ Admin JWT |
| `GET /sso/validate-redirect` | GET | Pre-validate a redirect URL | ❌ Public |

### App Registry (registered_apps table + fallback)

Current registered apps in FALLBACK_APP_IDS:

```
rald-app, loop-business, rald-control-center, dispatch, voice,
profiles, identity, rald-identity, loop-identity, credentials,
loop, loop-app, loop-core, loop-messenger, messenger,
payrald, dunarald, gitrald, rald-inbox, raldtics, raldtics-app,
gitrald-app, pay, duna, manilla
```

**Note:** Fallback is emergency-only. All apps must be registered in the `registered_apps` DB table.

### ECOSYSTEM_APPS (redirect.ts — used by provision endpoint)

| App ID | Name | Domain |
|---|---|---|
| manilla | Manilla | manilla.rald.cloud |
| profiles | Profile | profiles.rald.cloud |
| loop | Loop | loop.rald.cloud |
| messenger | Messenger | messenger.rald.cloud |
| rald-inbox | Inbox | inbox.rald.cloud |
| payrald | PayRald | pay.rald.cloud |
| dunarald | DunaRald | duna.rald.cloud |
| gitrald | GitRald | git.rald.cloud |
| raldtics | Raldtics | analytics.rald.cloud |

---

## LOOP SSO FLOW (FULLY TRACED)

```
1. User visits loop.rald.cloud/rooms/abc (unauthenticated)
2. ProtectedRoute → navigate to /login?next=%2Frooms%2Fabc
3. LoginPage (2s interstitial) → window.location.href =
   https://profiles.rald.cloud/login?app_id=loop&redirect_to=https://loop.rald.cloud/auth/callback?next=%2Frooms%2Fabc
4. profiles.rald.cloud authenticates user (OTP / password)
5. profiles.rald.cloud redirects → https://loop.rald.cloud/auth/callback?next=%2Frooms%2Fabc&rald_token=<JWT>
6. AuthProvider detects `rald_token` URL param:
   a. Stores as `rald_master_token` in localStorage (24h master JWT)
   b. POSTs to /api/auth/rald-sso with { rald_token }
   c. Loop Worker verifies JWT locally (shared RALD_JWT_SECRET)
   d. Returns { token, user } — stored as `loop_token` in localStorage (1h)
7. AuthCallbackPage detects user → navigate to /rooms/abc (intended destination)
```

**Cross-app from Loop → Messenger:**
```javascript
// openMessenger() in use-auth.tsx:
const raldToken = getRaldMasterToken(); // rald_master_token from localStorage
window.location.href = `https://chat.rald.cloud/chats?rald_token=<raldToken>&app_id=messenger`;
// Messenger receives rald_token, exchanges via /auth/rald-sso, enters immediately
```

✅ **No second login required — this is functional cross-app SSO.**

---

## MESSENGER SSO FLOW (FULLY TRACED)

```
1. User arrives at chat.rald.cloud (with rald_token URL param from Loop)
2. Frontend detects rald_token → POST /auth/rald-sso { rald_token }
3. Messenger Worker verifies JWT locally (shared RALD_JWT_SECRET — no HTTP call)
4. Returns { authenticated: true, user, token }
5. Frontend stores token for all subsequent Bearer calls
6. authMiddleware validates Bearer on every API request
```

✅ **Fully stateless — no separate user database. JWT IS the session.**

---

## GAP ANALYSIS: GLOBAL LOGOUT

**Current state:**
- Loop `signOut()`: clears `loop_token` + `rald_master_token` from localStorage → calls Loop Worker `/api/auth/signout` (revokes jti in KV blocklist)
- Loop logout does NOT call `POST auth.rald.cloud/logout` to revoke the master session
- Messenger has no logout implementation audited
- RALD Auth Core has `POST /logout` + `POST /session/revoke-all` — not called by apps on logout

**Impact:** User logs out of Loop but:
- Master RALD token still valid (24h) — could be reused
- Messenger session remains active
- Other apps remain active

**Fix required:**
1. Loop `signOut()` must call `POST https://auth.rald.cloud/logout` with `rald_master_token`
2. Messenger must implement equivalent logout
3. Auth Core's `revoke-all` should be the single call that terminates all app sessions

---

## REQUIRED ACTIONS (PRIORITY ORDER)

### Sprint 2 — Loop/Messenger Focus

| # | Action | Product | Effort |
|---|---|---|---|
| 1 | Register Messenger callback URL in `registered_apps` table | Auth | 1 hour |
| 2 | Implement global logout: Loop calls `POST auth.rald.cloud/logout` on sign-out | Loop | 1 day |
| 3 | Implement silent token refresh in Loop AuthProvider (re-exchange before 1h expires) | Loop | 2 days |
| 4 | Confirm Messenger deep link handling for `rald_token` param on any page | Messenger | 1 day |
| 5 | Audit Control Center auth flow | Auth | 2 hours |

### Before any new product ships

| # | Action | Notes |
|---|---|---|
| 6 | Wire Loop Business to RALD SSO | Use Loop's pattern as template |
| 7 | Wire PayRald UI to RALD SSO | Before ANY real payment testing |
| 8 | Add Loop/Messenger to RALD TV (when auth is needed) | When TV gets real content |

---

## MOBILE SSO (NOT YET IMPLEMENTED)

**Required for iOS/Android:**
- Universal Links / Deep Links for `rald.cloud` and `ostloop.name.ng`
- App-to-app token passing via URL scheme or shared Keychain (iOS) / AccountManager (Android)
- Push notification auth (APNs/FCM token registration post-SSO)
- Biometric session persistence

**Status:** Not built in any current repo. Required before mobile launch.

---

*Matrix based on source code audit of: rald-auth-core, loop, messenger, rald-auth-ui, rald-loop-business, payrald-ui-ux, rald-tv-ui-ux*
*Generated: 2026-06-09 | LILCKY STUDIO LIMITED*
