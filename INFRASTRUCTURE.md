# RALD.cloud — Infrastructure Runbook
> Last updated: 2026-06-12 · Public beta readiness

---

## Architecture Overview

```
USERS
 │
 ├─ app.rald.cloud          → CF Pages: rald-cloud-web frontend (project: rald-cloud)
 ├─ messenger.rald.cloud    → CF Pages: Loop Messenger frontend (project: loop-messenger)
 ├─ console.rald.cloud      → CF Pages: RALD Dev Console (project: rald-dev-console)
 │
 ├─ auth.rald.cloud         → CF Worker: rald-auth-core (Hono)
 ├─ api.rald.cloud          → Fly.io jnb: rald-cloud-api  [Express/Node + PostgreSQL]
 ├─ chat-api.rald.cloud     → Fly.io jnb: loop-messenger-api [Express/Node + PostgreSQL]
 │
 └─ [product subdomains] ── all CNAME → app.rald.cloud
      payrald, loop, dispatch, voice, raldtics,
      dunarald, developers, dev, identity, sdk, gitrald, business
```

---

## DNS Records — rald.cloud zone

All records: **CF Proxy enabled (orange cloud)** unless noted.

### CF Pages custom domains
| Type  | Name      | Value                              |
|-------|-----------|------------------------------------|
| CNAME | app       | rald-cloud.pages.dev               |
| CNAME | messenger | loop-messenger.pages.dev           |
| CNAME | console   | rald-dev-console.pages.dev         |

> CF Pages project must exist before adding custom domain (Pages → project → Custom domains)

### CF Workers — auth.rald.cloud
| Type | Name | Value | Note |
|------|------|-------|------|
| AAAA | auth | 100:: | Placeholder — CF Worker route handles actual traffic |

### Fly.io API servers
| Type  | Name     | Value                           |
|-------|----------|---------------------------------|
| CNAME | api      | rald-cloud-api.fly.dev          |
| CNAME | chat-api | loop-messenger-api.fly.dev      |

Get actual Fly.io hostname: `flyctl status --app rald-cloud-api`

### Product subdomains → all CNAME to app.rald.cloud
```
payrald   → app.rald.cloud
loop      → app.rald.cloud
dispatch  → app.rald.cloud
voice     → app.rald.cloud
raldtics  → app.rald.cloud
dunarald  → app.rald.cloud
developers → app.rald.cloud
dev       → app.rald.cloud
identity  → app.rald.cloud
sdk       → app.rald.cloud
gitrald   → app.rald.cloud
business  → app.rald.cloud
```

### Email — Mailgun (rald.cloud)
```
TXT  @              v=spf1 include:mailgun.org ~all
TXT  mg._domainkey  (DKIM key from Mailgun dashboard)
CNAME email.mg      mailgun.org
MX   @              10 mxa.mailgun.org
MX   @              10 mxb.mailgun.org
```

---

## CF Pages Projects — Create in Dashboard First

| Project name     | Branch | Build output dir                     | Custom domain        |
|------------------|--------|--------------------------------------|----------------------|
| rald-cloud       | main   | artifacts/rald-cloud/dist/public     | app.rald.cloud       |
| loop-messenger   | main   | artifacts/loop-messenger/dist/public | messenger.rald.cloud |
| rald-dev-console | main   | dist                                 | console.rald.cloud   |

Leave CF Pages build command blank — GitHub Actions builds and deploys dist.

---

## CF Pages Environment Variables

Set via CF dashboard → Pages → project → Settings → Environment variables.

**rald-cloud (app.rald.cloud)**
```
BASE_PATH=/
VITE_RALD_AUTH_URL=https://auth.rald.cloud
VITE_API_BASE_URL=https://api.rald.cloud
```

**loop-messenger (messenger.rald.cloud)**
```
BASE_PATH=/
VITE_API_BASE_URL=https://messenger.rald.cloud
VITE_RALD_AUTH_URL=https://auth.rald.cloud
```

**rald-dev-console (console.rald.cloud)**
```
VITE_RALD_AUTH_URL=https://auth.rald.cloud
VITE_RALD_IDENTITY_URL=https://identity.rald.cloud
```

---

## GitHub Actions Secrets per Repo

```bash
# CF Pages + Worker deploys (all 4 repos)
gh secret set CLOUDFLARE_API_TOKEN --body "..." --repo Ostinato-Loop/messenger
gh secret set CLOUDFLARE_API_TOKEN --body "..." --repo Ostinato-Loop/rald-cloud-web
gh secret set CLOUDFLARE_API_TOKEN --body "..." --repo Ostinato-Loop/rald-dev-console
gh secret set CLOUDFLARE_API_TOKEN --body "..." --repo Ostinato-Loop/rald-auth-core

# Fly.io API deploys
gh secret set FLY_API_TOKEN --body "..." --repo Ostinato-Loop/messenger
gh secret set FLY_API_TOKEN --body "..." --repo Ostinato-Loop/rald-cloud-web

# rald-auth-core Worker secrets (injected at deploy time)
gh secret set SUPABASE_SERVICE_ROLE_KEY --body "..." --repo Ostinato-Loop/rald-auth-core
gh secret set RALD_JWT_SECRET           --body "..." --repo Ostinato-Loop/rald-auth-core
gh secret set TERMII_API_KEY            --body "..." --repo Ostinato-Loop/rald-auth-core
gh secret set TERMII_SENDER_ID          --body "..." --repo Ostinato-Loop/rald-auth-core
gh secret set RESEND_API_KEY            --body "..." --repo Ostinato-Loop/rald-auth-core
gh secret set CLERK_SECRET_KEY          --body "..." --repo Ostinato-Loop/rald-auth-core
gh secret set CLERK_PUBLISHABLE_KEY     --body "..." --repo Ostinato-Loop/rald-auth-core
```

---

## Cloudflare API Token Permissions

Create at: https://dash.cloudflare.com/profile/api-tokens

| Permission                  | Scope |
|-----------------------------|-------|
| Account: Cloudflare Pages   | Edit  |
| Account: Workers Scripts    | Edit  |
| Zone: Workers Routes        | Edit  |
| Zone: DNS                   | Edit  |
| Zone: Zone                  | Read  |

---

## Fly.io — First-time App Setup

```bash
curl -L https://fly.io/install.sh | sh
flyctl auth login

# RALD Cloud API (Express + PostgreSQL)
flyctl launch --name rald-cloud-api --region jnb --no-deploy
flyctl secrets set DATABASE_URL="postgres://..." --app rald-cloud-api
flyctl secrets set JWT_SECRET="..." --app rald-cloud-api
cd rald-cloud-web && flyctl deploy --remote-only --config artifacts/api-server/fly.toml
flyctl certs add api.rald.cloud --app rald-cloud-api

# Loop Messenger API (Express + PostgreSQL + WebSocket)
flyctl launch --name loop-messenger-api --region jnb --no-deploy
flyctl secrets set DATABASE_URL="postgres://..." --app loop-messenger-api
flyctl secrets set SESSION_SECRET="..." --app loop-messenger-api
cd messenger && flyctl deploy --remote-only --config artifacts/api-server/fly.toml
flyctl certs add chat-api.rald.cloud --app loop-messenger-api
```

---

## rald-auth Worker — Manual Deploy (pre-GHA)

```bash
cd rald-auth-core
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put RALD_JWT_SECRET
wrangler secret put TERMII_API_KEY
wrangler secret put TERMII_SENDER_ID
wrangler secret put RESEND_API_KEY
wrangler secret put CLERK_SECRET_KEY
wrangler secret put CLERK_PUBLISHABLE_KEY
wrangler deploy --env production
```

---

## P0 Operator Blockers (require dashboard access)

| # | Blocker                          | Action                                                     |
|---|----------------------------------|------------------------------------------------------------|
| 1 | Cloudflare API token             | Create token with permissions above                        |
| 2 | CF Pages projects not created    | Create rald-cloud, loop-messenger, rald-dev-console in UI  |
| 3 | DNS records missing              | Add all records from DNS tables above                      |
| 4 | Fly.io apps not launched         | flyctl launch for rald-cloud-api + loop-messenger-api      |
| 5 | GitHub Actions secrets           | Set CLOUDFLARE_API_TOKEN + FLY_API_TOKEN + Worker secrets  |
| 6 | Supabase migration               | Apply developer_platform.sql to production                 |
| 7 | iOS push notification certs      | Apple Developer → Identifiers → Push Notification certs    |
| 8 | Mailgun DKIM                     | Verify domain in Mailgun → add DNS TXT records             |
| 9 | CF cron trigger (rald-notify)    | CF Workers dashboard → Add Cron Trigger                    |

---

## Ordered Deploy Sequence

1. Create Cloudflare API token (permissions table above)
2. Set GitHub Actions secrets per repo (gh secret set ...)
3. Create CF Pages projects in CF dashboard (names must match GHA workflows)
4. Launch Fly.io apps + set secrets
5. Apply Supabase migration to production DB
6. Trigger GitHub Actions workflows on each repo main branch
7. Add custom domains in CF Pages dashboard
8. Add DNS records in Cloudflare
9. Push Worker secrets + deploy rald-auth-core (if GHA hasn't run)
10. Smoke test: app.rald.cloud, messenger.rald.cloud, console.rald.cloud
11. Verify API health: api.rald.cloud/api/health, chat-api.rald.cloud/api/health, auth.rald.cloud/health
