# GitHub Repository Secrets Setup

Configure these secrets in **Settings → Secrets and variables → Actions** before the deploy workflow can run.

## Required GitHub Secrets

| Secret | Value | Notes |
|--------|-------|-------|
| `CLOUDFLARE_API_TOKEN` | From Cloudflare Dashboard | Use "Edit Cloudflare Workers" template + Pages:Edit permission |
| `CLOUDFLARE_ACCOUNT_ID` | `d5a1cd03b76f467430034af64a7062fd` | Confirmed account ID (Ideamack@gmail.com's Account) |

## Cloudflare Worker Secrets — Already Injected

The following secrets are already set on the `rald-api` Worker (injected during V1 deploy):

| Secret | Status |
|--------|--------|
| `SUPABASE_URL` | ✅ Set |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Set |
| `RALD_JWT_SECRET` | ✅ Set (64-char base64url) |
| `RALD_ENCRYPTION_KEY` | ✅ Set (64-char hex) |

To rotate any of these:
```bash
cd artifacts/api-worker
CLOUDFLARE_API_TOKEN=<token> CLOUDFLARE_ACCOUNT_ID=d5a1cd03b76f467430034af64a7062fd \
  npx wrangler secret put RALD_JWT_SECRET --name rald-api
```

## Cloudflare Pages Environment Variables — Already Set

| Project | Variable | Value | Status |
|---------|----------|-------|--------|
| `rald-control-center` | `VITE_API_URL` | `https://api.rald.cloud` | ✅ Set |

## Deployed Services (V1)

| Service | URL | Status |
|---------|-----|--------|
| API Worker | `https://api.rald.cloud` | ✅ Live |
| Control Center | `https://admin.rald.cloud` | ✅ Live (DNS propagating) |
| Marketing | `https://rald.cloud` + `www.rald.cloud` | ✅ Live (DNS propagating) |
| pages.dev preview (CC) | `https://rald-control-center.pages.dev` | ✅ Live now |
| pages.dev preview (MKT) | `https://rald-marketing.pages.dev` | ✅ Live now |
| workers.dev preview | `https://rald-api.ideamack.workers.dev` | ✅ Live now |

## Supabase Database Setup (REQUIRED)

The Worker is live but needs the database schema to handle auth and data.

1. Open your Supabase project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor**
3. Paste the contents of `artifacts/api-worker/supabase-schema.sql`
4. Click **Run**

This provisions: `users`, `services`, `deployments`, `credentials`, `products` tables and seeds the default admin account.

Default admin after schema run:
- Email: `admin@rald.cloud`
- Password: `rald-admin-2025`

## CI/CD Pipeline

Every push to `main` triggers:
1. **CI** (`.github/workflows/ci.yml`) — TypeScript check + build on all packages
2. **Deploy** (`.github/workflows/deploy.yml`) — All 3 targets to Cloudflare in parallel

The `main` branch is protected: requires TypeScript + Build checks to pass before merging.
