# DISASTER RECOVERY V1
**Date:** 2026-06-03 | **Phase:** G.12 | **Target:** RPO < 15 minutes | RTO < 60 minutes

## Service Dependency Map

```
auth.rald.cloud (CRITICAL — all services depend on this)
├── Supabase onxdcikfttdmnhofsuwo (users, sessions, otp_codes)
├── Termii (SMS OTP — optional, email OTP is fallback)
├── Resend (Email OTP — fallback delivery)
└── CF KV: rald-auth-rate-limit, rald-session

loop-api.rald.cloud
├── Supabase (same project, loop schema)
├── CF D1: loop-db, CF KV: loop-cache, CF R2: loop-media

messenger.rald.cloud (API Worker)
├── Supabase (messenger schema)
├── Termii (SMS OTP)
└── Tencent TRTC (voice/video — optional)

notification.rald.cloud, search.rald.cloud, inbox.rald.cloud
└── Supabase (same project, respective schemas)
```

## Recovery Procedures

### Auth Worker Down — RTO: ~3 minutes
```
1. Cloudflare auto-restarts crashed Workers
2. Code issue: git revert + push to main → deploy.yml redeploys
3. Verify: GET auth.rald.cloud/healthz → 200
```

### Supabase Incident — RTO: 15-60 minutes
```
1. Check: https://status.supabase.com
2. Email OTP continues working (stateless JWT-encoded OTP — no DB required)
3. If users table dropped: run rald-auth-core/supabase/migrations/recovery_users_table.sql
```

### Worker Secret Missing/Corrupt — RTO: ~5 minutes
```
1. Identify via /ready or /health endpoint
2. Push fresh secret: echo "NEW_VALUE" | wrangler secret put SECRET_NAME --name <worker>
3. Worker picks up immediately — no restart required
```

### Cloudflare Outage — RTO: Cloudflare SLA (99.99%)
```
1. Check: https://www.cloudflarestatus.com
2. No action required — Cloudflare handles failover automatically
```

## Backup Inventory

| Asset | Backup | Frequency | Recovery |
|---|---|---|---|
| Database | Supabase PITR | Continuous | Supabase dashboard |
| Worker code | GitHub main branch | Every commit | Push → auto-deploy |
| Worker secrets | GitHub Actions secrets | Manual rotation | wrangler secret put |
| CF Pages builds | Cloudflare Pages history | Every deploy | Rollback in CF dashboard |
| Supabase schema | SQL migrations in repos | Every schema change | Run migration SQL |

## Secret Inventory

All secrets stored in: (1) CF Worker Secrets (encrypted at rest) + (2) GitHub Actions Secrets.

| Secret | Org-Level | Repos |
|---|---|---|
| CLOUDFLARE_API_TOKEN | ✅ org | All repos |
| CLOUDFLARE_ACCOUNT_ID | ✅ org | All repos |
| SUPABASE_SERVICE_ROLE_KEY | ✅ org | All repos |
| SUPABASE_URL | ✅ org | All repos |
| RALD_JWT_SECRET | ❌ org | rald-auth-core, loop, messenger (repo-level) |
| TERMII_API_KEY | ❌ org | rald-auth-core, messenger (repo-level) |
| RESEND_API_KEY | ❌ org | rald-auth-core (repo-level) |

**Action Required:** Add RALD_JWT_SECRET as org-level secret to automatically propagate to all new repos.
