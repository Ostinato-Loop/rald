# PHASE G.12 — ECOSYSTEM SSO CERTIFICATION V2
## WORKSTREAM 2

**Status:** PASS
**Date:** 2026-06-03
**Owner:** LILCKY STUDIO LIMITED
**Version:** 2.0.0
**Supersedes:** G.11 SSO_E2E_CERTIFICATION.md

---

## SCOPE

Audit of all RALD ecosystem applications for SSO correctness including:
redirect_uri validation, session exchange, token handoff, logout propagation,
and workspace propagation.

---

## APPLICATIONS AUDITED

| Application | URL | SSO Method | Status |
|-------------|-----|-----------|--------|
| profiles.rald.cloud | Central profile hub | RALD SSO (master) | PASS |
| loop.rald.cloud | Loop social app | RALD SSO + native OTP | PASS |
| messenger.rald.cloud | Messenger | RALD SSO + native OTP | PASS |
| loop-business | Business workspace | RALD SSO exchange | PASS |
| payrald | Payments | RALD SSO exchange | PASS |
| dunarald | (Planned) | RALD SSO exchange | PLANNED |

---

## SSO MECHANISM (WS1-F2 / WS3-F1 RESOLUTION)

### Phase G.12 Fix Applied

**Before G.12:**
- Loop stored only Loop JWT (LOOP_JWT_SECRET)
- Messenger used RALD JWT (RALD_JWT_SECRET)
- Cross-app navigation required re-authentication

**After G.12 (this release):**
1. `use-auth.tsx` stores original `rald_token` as `rald_master_token` in localStorage
2. `cross-app.ts` `openMessenger(path)` passes `?rald_token=` to destination
3. Messenger `auth.tsx` detects `?rald_token=`, validates via `POST /auth/rald-sso`
4. Messenger worker confirms token, user lands on `/chats` without re-auth

### Token Authority

```
auth.rald.cloud
  ├── Issues: RALD master JWT (RALD_JWT_SECRET, 24h)
  ├── Validates: all cross-app tokens via /auth/me
  └── Exchange: POST /sso/exchange for app-scoped tokens

loop.rald.cloud
  ├── Accepts: RALD master JWT → issues Loop JWT (LOOP_JWT_SECRET, 7d)
  └── Stores: rald_master_token for cross-app navigation

messenger.rald.cloud
  ├── Accepts: RALD master JWT directly (RALD_JWT_SECRET)
  └── Upserts: user record on first SSO arrival
```

---

## REDIRECT URI VALIDATION

All applications validate `redirect_to` against an allowlist:

```
ALLOWED REDIRECT HOSTS:
  *.rald.cloud
  rald-auth-ui.pages.dev
  rald-app.pages.dev
  rald-control-center.pages.dev
  loop-messenger.pages.dev

REJECTED:
  Any external domain — returns 400 redirect_uri_mismatch
  HTTP origins — rejected in production
```

---

## TOKEN HANDOFF SEQUENCE

```
User on Loop → clicks "Open Messenger"
  1. openMessenger("/chats") called
  2. rald_master_token read from localStorage
  3. Browser navigates to: messenger.rald.cloud/chats?rald_token=TOKEN&app_id=messenger
  4. Messenger auth.tsx detects rald_token on mount
  5. POST /auth/rald-sso { rald_token: TOKEN }
  6. Worker validates token against auth.rald.cloud/auth/me
  7. User upserted in Messenger DB
  8. Token stored as messenger_rald_token in localStorage
  9. useGetMe() invalidated → refetches with Bearer token
 10. User lands on /chats — authenticated
```

---

## LOGOUT PROPAGATION

| Event | Loop | Messenger | Auth Core | Status |
|-------|------|-----------|-----------|--------|
| signOut() in Loop | loop_token cleared | rald_master_token cleared | — | PASS |
| Session expiry | 401 → redirect /login | 401 → redirect /auth | — | PASS |
| Manual token revocation | Immediate | On next request | DB record | PASS |

---

## ONBOARDING LOOP FIXES

All previously identified onboarding loops are resolved:
- G.9 OTL-1 (profile incomplete redirect): fixed, onboarded flag checked once ✓
- G.9 OTL-2 (SSO callback on non-login page): fixed, only AuthProvider handles callback ✓
- G.12 new: Messenger SSO callback redirects to /chats, not back to /auth ✓

---

## CERTIFICATION

```
profiles.rald.cloud   SSO: PASS | Redirect validation: PASS
loop.rald.cloud       SSO: PASS | Cross-app handoff: PASS
messenger.rald.cloud  SSO: PASS | RALD token accepted: PASS
loop-business         SSO: PASS | Exchange endpoint: PASS
payrald               SSO: PASS | Exchange endpoint: PASS
WS1-F2 RESOLVED:      PASS — rald_master_token stored and propagated
WS3-F1 RESOLVED:      PASS — Messenger accepts rald_token without re-auth
```

**ECOSYSTEM SSO CERTIFICATION V2: PASS**
