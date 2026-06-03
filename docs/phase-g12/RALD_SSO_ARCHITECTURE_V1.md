# RALD SSO ARCHITECTURE V1
**Date:** 2026-06-03 | **Owner:** LILCKY STUDIO LIMITED | **Status:** CURRENT PRODUCTION ARCHITECTURE

## Architecture

```
profiles.rald.cloud  ──▶  auth.rald.cloud  ──▶  Consumer Apps
(Identity Hub)            (Auth API Worker)      (Loop, Messenger, etc.)
```

## Token Flow

```
1. User visits loop.rald.cloud
2. App checks localStorage for rald_token
3. If absent → redirect to profiles.rald.cloud/login?app_id=loop&redirect_to=https://loop.rald.cloud/auth/callback
4. User authenticates → POST auth.rald.cloud/auth/login → master JWT (24h)
5. profiles.rald.cloud calls POST auth.rald.cloud/sso/exchange {"appId":"loop"}
6. auth.rald.cloud returns app-scoped JWT (1h, appId:"loop", sso_v:2)
7. Redirect → https://loop.rald.cloud/auth/callback?rald_token=<token>
8. App stores in localStorage, creates local session
9. All API calls: Authorization: Bearer <app_token>
10. Worker authMiddleware validates JWT using shared RALD_JWT_SECRET (zero round-trip)
```

## Token Payload (sso_v: 2)

```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "role": "user",
  "appId": "loop",
  "source": "rald-auth",
  "sso_v": 2,
  "exp": 1234567890
}
```

## Shared Secret Distribution

All consumer workers share `RALD_JWT_SECRET` (HS256).
Stored as Cloudflare Worker Secret. Pushed via `wrangler secret put` in each deploy.yml.
Never stored in source code or wrangler.toml.

## Registered Apps (24)

loop, messenger, payrald, dunarald, gitrald, loop-business, loop-dispatch, loop-voice,
raldtics, rald-control-center, rald-inbox, rald-connect + more.
Full list: GET auth.rald.cloud/sso/apps

## V2 Migration Path (Phase H — after current apps work end-to-end)

Migrate to proper OAuth 2.0 / OpenID Connect for external app compatibility:
- `/oauth/authorize` — authorization code + PKCE
- `/oauth/token`, `/oauth/revoke`, `/oauth/introspect`
- `/.well-known/openid-configuration`, `/.well-known/jwks.json`
- Consent screens per registered client
- Switch signing from HS256 (shared secret) to RS256 (public/private key pair)

**Do NOT migrate until shared-secret SSO works end-to-end for all current apps.**
