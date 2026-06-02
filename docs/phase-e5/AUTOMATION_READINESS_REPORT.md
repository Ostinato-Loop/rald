# AUTOMATION READINESS REPORT
**Phase:** E.5 — Pre-Phase F Autonomous Hardening  
**Owner:** LILCKY STUDIO LIMITED  
**Date:** 2026-06-02

---

## Classification System
- **AUTOMATABLE** — Can be done programmatically with no human intervention
- **OPERATOR REQUIRED** — Needs a human with system access
- **EXTERNAL VENDOR REQUIRED** — Depends on a third-party provider action

---

## Service: api.rald.cloud (rald-api)

| Task | Classification | Status |
|---|---|---|
| Schema validation (Supabase) | AUTOMATABLE | ✅ Zod types generated |
| JWT secret rotation | OPERATOR REQUIRED | CF `wrangler secret put` |
| Bootstrap secret rotation | OPERATOR REQUIRED | CF `wrangler secret put` |
| OTP expired record cleanup | AUTOMATABLE | Cron: DELETE WHERE expires_at < NOW() |
| Rate limit KV creation | OPERATOR REQUIRED | CF Dashboard → KV namespace |
| Deploy to CF Workers | AUTOMATABLE | `wrangler deploy` via CI/CD |
| DB migration run | OPERATOR REQUIRED | Run `supabase-schema.sql` in Supabase SQL editor |
| Health check | AUTOMATABLE | `GET /healthz` → 200 |

---

## Service: notification.rald.cloud (rald-notify)

| Task | Classification | Status |
|---|---|---|
| Schema validation | AUTOMATABLE | Supabase schema SQL is idempotent |
| Resend domain verification | EXTERNAL VENDOR REQUIRED | DNS + Resend dashboard |
| Termii sender ID registration | EXTERNAL VENDOR REQUIRED | Termii dashboard |
| VAPID key generation | AUTOMATABLE | `npx web-push generate-vapid-keys` |
| VAPID secret upload | OPERATOR REQUIRED | CF `wrangler secret put` |
| Webhook URL validation | AUTOMATABLE | Add regex check in channel config route |
| Push subscription cleanup | AUTOMATABLE | Cron: mark 410 subscriptions expired |
| Deploy | AUTOMATABLE | `wrangler deploy` |
| Health check | AUTOMATABLE | `GET /healthz` → 200 |

---

## Service: search.rald.cloud (rald-search)

| Task | Classification | Status |
|---|---|---|
| Schema validation | AUTOMATABLE | SQL is idempotent |
| Index initial population | AUTOMATABLE | `POST /api/index/bulk` after customer migration |
| Meilisearch provisioning | OPERATOR REQUIRED | Create Meilisearch Cloud project |
| OpenSearch provisioning | OPERATOR REQUIRED | Create OpenSearch domain |
| Provider switch | OPERATOR REQUIRED | `wrangler secret put SEARCH_PROVIDER` |
| GIN index creation | AUTOMATABLE | Included in supabase-schema.sql |
| Health check | AUTOMATABLE | `GET /healthz` + `GET /api/index/health` |
| Deploy | AUTOMATABLE | `wrangler deploy` |

---

## Service: messenger (messenger.rald.cloud)

| Task | Classification | Status |
|---|---|---|
| TRTC credentials | EXTERNAL VENDOR REQUIRED | Tencent TRTC dashboard |
| Push notification setup | AUTOMATABLE | Via rald-notify VAPID |
| Supabase Realtime enabled | OPERATOR REQUIRED | Supabase dashboard |
| DB schema migration | OPERATOR REQUIRED | Run Drizzle migrations |
| Deploy | AUTOMATABLE | CI/CD pipeline |

---

## Service: rald-loop-business

| Task | Classification | Status |
|---|---|---|
| Build + deploy to CF Pages | AUTOMATABLE | `pnpm build && cf pages deploy` |
| Environment variables (API URLs) | OPERATOR REQUIRED | CF Pages env vars |
| DNS CNAME | OPERATOR REQUIRED | Cloudflare DNS dashboard |

---

## Self-Healing Implemented

| Service | Health Check | Secret Detection | DB Connectivity |
|---|---|---|---|
| rald-api | ✅ `/healthz` | ✅ `/ready` checks | ✅ `checks.supabase` field |
| rald-notify | ✅ `/healthz` | ✅ `/ready` checks | ✅ DB middleware |
| rald-search | ✅ `/healthz` | ✅ `/ready` checks | ✅ Provider health endpoint |
| messenger | ✅ `/health` | Partial | ✅ Supabase client check |

---

## Zero-Touch Summary

| Service | Automated Fixes Applied | Remaining Operator Actions | Remaining Vendor Actions |
|---|---|---|---|
| rald-api | Schema, CI/CD, health | Secret upload, DB migration | None |
| rald-notify | Schema, CI/CD, health | Secret upload, DB migration, VAPID | Resend domain, Termii sender ID |
| rald-search | Schema, CI/CD, health | Secret upload, DB migration | None (Postgres default) |
| messenger | Schema, CI/CD | Secret upload, DB migration | TRTC credentials |
| loop-business | Build, deploy config | CF Pages env vars, DNS | None |
