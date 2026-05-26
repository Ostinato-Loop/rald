# GitHub Repository Secrets Setup

Configure these secrets in **Settings → Secrets and variables → Actions** before the deploy workflow can run.

## Required Secrets

| Secret | Description | Where to find it |
|--------|-------------|------------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Workers and Pages permissions | [Cloudflare Dashboard → Profile → API Tokens](https://dash.cloudflare.com/profile/api-tokens) — use "Edit Cloudflare Workers" template, add Pages:Edit |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID | Cloudflare Dashboard → right sidebar |

## Required Cloudflare Worker Secrets

Set these on the deployed Worker via wrangler (run once after first deploy):

```bash
npx wrangler secret put SUPABASE_URL --name rald-api
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --name rald-api
npx wrangler secret put RALD_JWT_SECRET --name rald-api
npx wrangler secret put RALD_ENCRYPTION_KEY --name rald-api
```

Values for these are already stored as Replit Secrets.

## Cloudflare Pages Environment Variables

In the Cloudflare Pages project settings for `rald-control-center`, add:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://api.rald.cloud` |

## Setting Up Cloudflare Pages Projects

Create both projects before the first deploy:

```bash
# Control Center
npx wrangler pages project create rald-control-center

# Marketing
npx wrangler pages project create rald-marketing
```

## Custom Domains (after first deploy)

In Cloudflare Pages Dashboard → each project → Custom Domains:
- `rald-control-center` → `admin.rald.cloud`
- `rald-marketing` → `rald.cloud` and `www.rald.cloud`

The API Worker is mapped to `api.rald.cloud` via `wrangler.toml`.

## Supabase Database Setup

Run `artifacts/api-worker/supabase-schema.sql` in the Supabase SQL editor once to provision tables.
Then update the admin user's password hash via the RALD Control Center.
