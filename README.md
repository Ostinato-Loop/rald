# RALD — Root Authentication & Login Directory

> Production-grade authentication-as-a-service built on Cloudflare Workers + Supabase.
> Phone/OTP (Termii), JWT sessions, API keys, OAuth 2.0 + OIDC — V1 live, V2–V5 pipeline ready.

---

## Architecture

```
Client (React/Vite)
       │
       ▼ HTTPS
Cloudflare Workers  ─── Termii SMS API (OTP)
(Hono framework)    ─── Supabase (PostgreSQL)
  auth.ostloop.name.ng
```

**Stack:**
- **Runtime**: Cloudflare Workers (edge, global) + `@hono/node-server` for local dev
- **Framework**: [Hono](https://hono.dev) — ultra-fast, Workers-native
- **Database**: Supabase PostgreSQL (service role, row-level isolation)
- **OTP delivery**: [Termii](https://termii.com) SMS API (`N-Alert` channel)
- **Auth tokens**: HS256 JWT via Web Crypto (no library, CF-native)
- **Validation**: Zod on every route
- **CI/CD**: GitHub Actions → Wrangler → Cloudflare Workers

---

## V1 — Live (current)

| Feature | Status |
|---|---|
| `POST /api/auth/send-otp` | ✅ Phone OTP via Termii |
| `POST /api/auth/verify-otp` | ✅ JWT + session creation |
| `POST /api/auth/refresh` | ✅ Token refresh |
| `POST /api/auth/logout` | ✅ Session revocation |
| `GET  /api/auth/me` | ✅ Current user |
| `PATCH /api/users/profile` | ✅ Profile update |
| `GET  /api/users/sessions` | ✅ Active sessions |
| `DELETE /api/users/sessions/:id` | ✅ Revoke session |
| `POST /api/users/api-keys` | ✅ Create API key |
| `DELETE /api/users/api-keys/:id` | ✅ Revoke API key |
| `GET  /api/oauth/openid-configuration` | ✅ OIDC discovery |
| `GET  /api/oauth/authorize` | ✅ OAuth 2.0 + PKCE |
| `POST /api/oauth/token` | ✅ Auth code exchange |
| `GET  /api/oauth/userinfo` | ✅ OIDC userinfo |
| `POST /api/oauth/revoke` | ✅ Token revocation |
| `GET  /api/admin/users` | ✅ Admin user list |
| `PATCH /api/admin/users/:id` | ✅ Admin user update |
| Supabase schema | ✅ 10-table migration |
| Rate limiting (OTP 3/10min) | ✅ |
| Audit logging | ✅ |
| IP + User-Agent tracking | ✅ |
| GitHub Actions CI/CD | ✅ |

---

## V2 — Wallet & Transactions _(next)_

- `POST /api/wallet/fund` — Paystack/Flutterwave top-up
- `POST /api/wallet/transfer` — Peer-to-peer transfers
- `GET  /api/wallet/balance` — Balance + transaction history
- `POST /api/wallet/withdraw` — Bank account withdrawal
- Supabase migration: `rald_wallets`, `rald_transactions`
- Idempotency keys on all write operations

---

## V3 — Multi-factor & Social Auth

- TOTP (Google Authenticator) via Web Crypto
- Email OTP as fallback to SMS
- OAuth provider login: Google, GitHub, Apple
- Biometric passkey (WebAuthn) registration + assertion
- Recovery codes

---

## V4 — Organizations & RBAC

- Multi-tenant organizations (`rald_orgs`, `rald_memberships`)
- Granular permissions: `resource:action` scopes
- API key scoping per organization
- Invitation flow (OTP-gated)
- Admin dashboard (React SPA)
- Audit log search & export

---

## V5 — Enterprise & Marketplace

- SSO: SAML 2.0 + Enterprise OIDC federation
- Branding customization per tenant (logo, colours, domain)
- SDK packages: `@rald/js`, `@rald/react`, `@rald/node`
- Developer portal with API key management UI
- SLA monitoring, uptime dashboard
- Webhooks (user events → partner systems)

---

## Local Development

```bash
# 1. Install dependencies
pnpm install

# 2. Set environment variables (create .env in artifacts/api-server)
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
JWT_SECRET=your-32-char-minimum-secret
TERMII_API_KEY=your-termii-key
TERMII_SENDER_ID=N-Alert

# 3. Start dev server (port 8080)
pnpm --filter @workspace/api-server run dev

# 4. Start frontend (port 5173, proxies /api → 8080)
pnpm --filter @workspace/rald run dev

# 5. Typecheck
pnpm --filter @workspace/api-server run typecheck
```

---

## Cloudflare Workers Deploy

### 1 — Set Cloudflare secrets
```bash
cd artifacts/api-server

wrangler secret put JWT_SECRET              --env production
wrangler secret put SUPABASE_URL            --env production
wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env production
wrangler secret put TERMII_API_KEY          --env production
wrangler secret put TERMII_SENDER_ID        --env production
```

### 2 — Set GitHub Actions secrets
In **Settings → Secrets → Actions** on this repo:
| Secret | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | CF API token with Workers:Edit |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |
| `VITE_API_URL` | `https://auth.ostloop.name.ng` |

### 3 — Push to main
GitHub Actions runs `quality → build → deploy` automatically on every push to `main`.

---

## Database

Migration at `supabase/migrations/001_rald_schema.sql`.

Apply to Supabase:
```bash
# Using Supabase CLI
supabase db push

# Or paste directly in Supabase SQL Editor
```

**Tables:** `rald_users`, `rald_sessions`, `rald_otp_codes`, `rald_api_keys`,
`rald_oauth_clients`, `rald_oauth_codes`, `rald_oauth_tokens`, `rald_wallets`,
`rald_audit_logs`, `rald_rate_limits`

---

## Security notes

- OTP rate-limited: 3 per phone per 10 minutes, max 5 verification attempts
- Session tokens are stored as SHA-256 hashes only (plain token never persisted)
- API keys stored as SHA-256 hashes only
- JWT verified against live session record on every request (revocation supported)
- All auth errors use timing-safe comparison
- Termii delivery failure is silent to client (no enumeration leaks)
- CF-Connecting-IP used for real IP (behind Cloudflare proxy)

---

## Termii OTP

Credentials stored as **Cloudflare Worker secrets** (never in code or env files):
- `TERMII_API_KEY` — your Termii API key
- `TERMII_SENDER_ID` — sender ID (default `N-Alert` for DND-compliant delivery in Nigeria)

OTP message format:
> `Your RALD verification code is: 847291. Valid for 10 minutes. Do not share this code.`
