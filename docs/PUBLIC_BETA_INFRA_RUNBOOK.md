# RALD Public Beta Infrastructure Runbook
## DNS · Cloudflare Pages · Fly.io
**Closes:** #12  
**Date:** 2026-06-12  
**Owner:** RALD Platform Engineering · LILCKY STUDIO LIMITED

---

## Overview

This runbook covers the three infrastructure pillars required to open the RALD public beta:

1. **DNS** — All `*.rald.cloud` subdomains pointed correctly
2. **Cloudflare Pages** — Frontend apps deployed and routed
3. **Fly.io** — If any services run on Fly (fallback for non-CF workloads)

---

## 1. DNS — Cloudflare Zone: `rald.cloud`

All DNS is managed in the Cloudflare dashboard under the `rald.cloud` zone.

### Required Records

| Subdomain | Type | Target | Proxy | Purpose |
|---|---|---|---|---|
| `auth.rald.cloud` | CNAME | `rald-auth-core.<account>.workers.dev` | ✅ Proxied | Identity & Auth |
| `notification.rald.cloud` | CNAME | `rald-notify.<account>.workers.dev` | ✅ Proxied | Notification service |
| `events.rald.cloud` | CNAME | `rald-event-bus.<account>.workers.dev` | ✅ Proxied | Event bus |
| `config.rald.cloud` | CNAME | `rald-config.<account>.workers.dev` | ✅ Proxied | Feature flags & config |
| `app.rald.cloud` | CNAME | `rald-app.pages.dev` | ✅ Proxied | Account Center (CF Pages) |
| `loop.rald.cloud` | CNAME | `rald-loop.pages.dev` | ✅ Proxied | Loop audio app (CF Pages) |
| `control.rald.cloud` | CNAME | `rald-control-center.pages.dev` | ✅ Proxied | Control Center (CF Pages) |
| `profiles.rald.cloud` | CNAME | `rald-profiles.pages.dev` | ✅ Proxied | Identity profiles (CF Pages) |
| `rald.cloud` | A | `192.0.2.1` (CF Pages IP) | ✅ Proxied | Root domain → marketing |

### Verification
```bash
# Verify all Workers are reachable
for HOST in auth notification events config; do
  echo -n "$HOST.rald.cloud: "
  curl -s -o /dev/null -w "%{http_code}" "https://$HOST.rald.cloud/health"
  echo ""
done

# Verify CF Pages apps
for HOST in app loop control profiles; do
  echo -n "$HOST.rald.cloud: "
  curl -s -o /dev/null -w "%{http_code}" "https://$HOST.rald.cloud"
  echo ""
done
```

---

## 2. Cloudflare Pages — App Deployments

All frontend apps deploy via `git push` to `main` through the CF Pages GitHub integration.

### App Registry

| App | CF Pages Project | Repo | Build Command | Output Dir |
|---|---|---|---|---|
| Account Center | `rald-app` | `Ostinato-Loop/rald` | `pnpm --filter @workspace/rald-app run build` | `artifacts/rald-app/dist` |
| Loop | `rald-loop` | `Ostinato-Loop/loop` | `pnpm --filter @workspace/loop run build` | `artifacts/loop/dist` |
| Control Center | `rald-control-center` | `Ostinato-Loop/rald` | `pnpm --filter @workspace/rald-control-center run build` | `artifacts/rald-control-center/dist` |
| Marketing | `rald-marketing` | `Ostinato-Loop/rald` | `pnpm --filter @workspace/rald-marketing run build` | `artifacts/rald-marketing/dist` |

### Required Environment Variables per CF Pages Project

Set in **Cloudflare Dashboard → Pages → [project] → Settings → Environment Variables**:

```
VITE_API_URL=https://auth.rald.cloud
VITE_EVENT_BUS_URL=https://events.rald.cloud
VITE_CONFIG_URL=https://config.rald.cloud
VITE_NOTIFY_URL=https://notification.rald.cloud
VITE_SUPABASE_URL=https://onxdcikfttdmnhofsuwo.supabase.co
VITE_SUPABASE_ANON_KEY=<supabase_anon_key>
```

### Deploy Steps
```bash
# 1. Create CF Pages project (one-time)
wrangler pages project create rald-app --production-branch main

# 2. Connect to GitHub repo
# Do this via Cloudflare Dashboard → Pages → Create project → Connect to Git

# 3. Trigger manual deploy (after creating project)
wrangler pages deploy artifacts/rald-app/dist --project-name rald-app

# 4. Set custom domain
# Dashboard → Pages → rald-app → Custom domains → Add domain → app.rald.cloud
```

### Custom Domain Configuration
After adding custom domain in CF Pages:
- CF automatically creates a CNAME `app.rald.cloud → rald-app.pages.dev`
- If created manually, ensure Proxy is **enabled** (orange cloud)

---

## 3. Cloudflare Workers — Deployment Checklist

All Workers are deployed via `wrangler deploy` or the GitHub Actions `deploy.yml` workflow.

### Pre-Deploy Secrets (run once per environment)

```bash
# rald-auth-core
wrangler secret put SUPABASE_SERVICE_ROLE_KEY --name rald-auth-core
wrangler secret put RALD_JWT_SECRET            --name rald-auth-core
wrangler secret put RALD_ADMIN_SECRET          --name rald-auth-core

# rald-event-bus
wrangler secret put SUPABASE_SERVICE_ROLE_KEY  --name rald-event-bus
wrangler secret put RALD_JWT_SECRET            --name rald-event-bus
wrangler secret put RALD_INTERNAL_SECRET       --name rald-event-bus

# rald-config
wrangler secret put SUPABASE_SERVICE_ROLE_KEY  --name rald-config
wrangler secret put RALD_JWT_SECRET            --name rald-config
wrangler secret put RALD_ADMIN_SECRET          --name rald-config

# rald-notify
wrangler secret put SUPABASE_SERVICE_ROLE_KEY  --name rald-notify
wrangler secret put RALD_JWT_SECRET            --name rald-notify
wrangler secret put RESEND_API_KEY             --name rald-notify
wrangler secret put RALD_INTERNAL_SECRET       --name rald-notify
```

### Deploy All Workers
```bash
# From each service directory:
wrangler deploy --env production

# Or trigger via GitHub Actions (push to main runs deploy.yml)
git push origin main
```

### Health Check All Workers
```bash
for WORKER in auth.rald.cloud notification.rald.cloud events.rald.cloud config.rald.cloud; do
  STATUS=$(curl -s "https://$WORKER/health" | jq -r '.status // .ok')
  echo "$WORKER: $STATUS"
done
```

---

## 4. Fly.io (Fallback / Non-CF Workloads)

Currently **no RALD services run on Fly.io** — all backend is Cloudflare Workers + Supabase. If Fly.io is needed for future workloads (e.g., long-running jobs, WebSocket servers at scale):

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Authenticate
flyctl auth login

# Create app (if needed)
flyctl launch --name rald-<service> --region jnb  # Johannesburg — closest to Nigeria/Kenya/Ghana

# Deploy
flyctl deploy

# Set secrets
flyctl secrets set SUPABASE_URL=https://onxdcikfttdmnhofsuwo.supabase.co
```

**Recommended Fly.io regions for Africa-first:**
| Region | Code | Latency from Lagos |
|---|---|---|
| Johannesburg | `jnb` | ~50ms |
| London | `lhr` | ~90ms |
| Amsterdam | `ams` | ~95ms |

---

## 5. Pre-Beta Launch Checklist

- [ ] All Workers deployed and `/health` returns `200`
- [ ] All CF Pages apps deployed and loading
- [ ] All custom domains configured with `rald.cloud` zone
- [ ] Supabase upgraded to Pro (connection pooling via PgBouncer)
- [ ] Machine identities provisioned: `bash scripts/provision-machine-identities.sh production`
- [ ] Wrangler secrets set for all Workers
- [ ] `OPEN_OBSERVE_API_KEY` + `OPEN_OBSERVE_ENDPOINT` set (log shipping)
- [ ] Nigeria (NG) / Kenya (KE) / Ghana (GH) country rows active in `country_registry`
- [ ] OTP provider (Termii) tested in all 3 markets
- [ ] Payment provider (Paystack/Flutterwave) sandbox confirmed

---

*RALD — One identity. African-first. LILCKY STUDIO LIMITED · 2026*
