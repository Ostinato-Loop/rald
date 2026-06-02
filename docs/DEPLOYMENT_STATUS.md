# DEPLOYMENT STATUS
**Ecosystem:** RALD  
**Date:** 2026-06-02  
**Owner:** LILCKY STUDIO LIMITED

---

## Service Registry

| Service | Repo | Domain | Workers | CI | Deploy |
|---|---|---|---|---|---|
| Identity + Core API | rald | api.rald.cloud | ✅ | ✅ | Operator |
| Notification Platform | rald-notify | notification.rald.cloud | ✅ Code ready | ✅ Workflow | Operator |
| Search Platform | rald-search | search.rald.cloud | ✅ Code ready | ✅ Workflow | Operator |
| Unified Inbox | rald-inbox | inbox.rald.cloud | ✅ Code ready | ✅ Workflow | Operator |
| Loop Messenger | messenger | messenger.rald.cloud | ✅ | ✅ | Operator |
| Loop Business | rald-loop-business | loop-business.rald.cloud | ✅ UI | ✅ | Operator |

---

## CI/CD Pipeline Status

All three worker repos now have:

| Workflow | Trigger | Actions |
|---|---|---|
| `ci.yml` | push + PR to main | Install → typecheck → dry-run build |
| `deploy.yml` | push to main only | Install → typecheck → `wrangler deploy --env production` |

---

## Required GitHub Secrets (per repo)

Add these to **each worker repo** under `Settings → Secrets → Actions`:

| Secret | Value Source |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare Dashboard → User API Tokens → Workers Deploy |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Dashboard → Account Home |
| `SUPABASE_URL` | Supabase Project Settings → API → URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Project Settings → API → service_role |
| `RALD_JWT_SECRET` | Generate: `openssl rand -base64 32` |

### rald-notify additional secrets:
| Secret | Value Source |
|---|---|
| `RESEND_API_KEY` | Resend Dashboard → API Keys |
| `TERMII_API_KEY` | Termii Dashboard → API Keys |
| `TWILIO_ACCOUNT_SID` | Twilio Console |
| `TWILIO_AUTH_TOKEN` | Twilio Console |
| `VAPID_PUBLIC_KEY` | `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | `npx web-push generate-vapid-keys` |

---

## Required Cloudflare KV Namespaces

Create in **Cloudflare Dashboard → Workers → KV** and update `wrangler.toml`:

| Worker | KV Binding | Purpose |
|---|---|---|
| rald-notify | `RATE_LIMIT_KV` | Rate limiting |
| rald-search | `RATE_LIMIT_KV` | Rate limiting |
| rald-inbox | `RATE_LIMIT_KV` | Rate limiting |

After creating each KV namespace, update the `id` field in the repo's `wrangler.toml`.

---

## Required DNS Records (Cloudflare)

| Type | Name | Value |
|---|---|---|
| CNAME | notification.rald.cloud | `rald-notify.<account>.workers.dev` |
| CNAME | search.rald.cloud | `rald-search.<account>.workers.dev` |
| CNAME | inbox.rald.cloud | `rald-inbox.<account>.workers.dev` |

---

## Required Supabase Schema Migrations

Run in **Supabase SQL Editor** for each service:

| Service | Schema File |
|---|---|
| rald-notify | `Ostinato-Loop/rald-notify/supabase-schema.sql` |
| rald-search | `Ostinato-Loop/rald-search/supabase-schema.sql` |
| rald-inbox | `Ostinato-Loop/rald-inbox/supabase-schema.sql` |

---

## Email Domain Verification (Resend)

1. Go to Resend Dashboard → Domains
2. Add `rald.cloud`
3. Add DNS records provided by Resend (SPF, DKIM, DMARC)
4. Verify

---

## Deployment Sequence (Once Secrets Are Set)

```
Step 1: Apply Supabase schemas (rald-notify, rald-search, rald-inbox)
Step 2: Create KV namespaces in Cloudflare, update wrangler.toml in each repo
Step 3: Add all GitHub secrets
Step 4: git push to main → deploy.yml triggers automatically
Step 5: Verify /healthz and /readyz on each domain
Step 6: Verify /readyz shows supabase: "ok"
```

---

## Self-Healing Health Checks

Once deployed, monitor:

```
GET https://notification.rald.cloud/healthz  → {"status":"ok"}
GET https://notification.rald.cloud/readyz   → {"status":"ready","checks":{...}}
GET https://search.rald.cloud/healthz        → {"status":"ok"}
GET https://search.rald.cloud/readyz         → {"status":"ready","checks":{...}}
GET https://inbox.rald.cloud/healthz         → {"status":"ok"}
GET https://inbox.rald.cloud/readyz          → {"status":"ready","checks":{...}}
```

---

## What Auto-Syncs to GitHub (Source of Truth)

Every push to `main` on any worker repo:
1. CI runs `tsc --noEmit` — catches type errors before deploy
2. CI runs dry-run build — catches bundling errors before deploy
3. Deploy runs `wrangler deploy --env production` — pushes to CF edge
4. GitHub is the source of truth — rollback = `git revert` + push

LILCKY STUDIO LIMITED — 2026-06-02
