# RALD ECOSYSTEM TRUTH AUDIT — G.12
**Date:** 2026-06-03 | **Phase:** G.12 Foundation Lockdown | **Method:** Live HTTP probing + GitHub API + Source analysis

## Service Status

| Service | Domain | Deployed | Health | Notes |
|---|---|---|---|---|
| Auth API | auth.rald.cloud | ✅ | ✅ 200 | v2.1.0 — fully operational |
| Profiles UI | profiles.rald.cloud | ✅ | ✅ 200 | CF Pages |
| App Portal | app.rald.cloud | ✅ | ✅ 200 | CF Pages |
| Admin | admin.rald.cloud | ✅ | ✅ 200 | RALD Control Center |
| Marketing | rald.cloud | ✅ | ✅ 200 | CF Pages |
| Loop Frontend | loop.rald.cloud | ✅ | ✅ HTML | CF Pages |
| Loop API | loop-api.rald.cloud | ✅ | ⏳ | Route fix deployed — awaiting verification |
| Messenger Frontend | messenger.rald.cloud | ✅ | ✅ HTML | CF Pages |
| Messenger API | messenger.rald.cloud | ✅ | ⏳ | Secrets fix deployed — awaiting verification |
| Notifications | notification.rald.cloud | ⏳ | ⏳ | Deploy workflow fixed — deploying |
| Search | search.rald.cloud | ⏳ | ⏳ | Deploy workflow fixed — deploying |
| Inbox | inbox.rald.cloud | ⏳ | ⏳ | Deploy workflow fixed — deploying |
| Realtime | realtime.rald.cloud | ⏳ | ⏳ | Deploy workflow created — deploying |

## Auth System (Live Verified — 2026-06-03)

```
GET  auth.rald.cloud/healthz   → 200 {"status":"ok","version":"2.1.0"}
GET  auth.rald.cloud/ready     → 200 {"ready":true,"checks":{"supabase":true,"jwt":true,"termii":true,"resend":true,"rate_limit_kv":true,"session_kv":true}}
GET  auth.rald.cloud/system/dependencies → supabase:542ms, termii:176ms(balance:10NGN), resend:144ms
POST auth.rald.cloud/auth/login           → 200 JWT issued ✅
POST auth.rald.cloud/auth/register        → 200 user created ✅
POST auth.rald.cloud/sso/exchange         → 200 app-scoped token ✅
POST auth.rald.cloud/sso/verify           → 200 valid:true ✅
GET  auth.rald.cloud/sso/apps             → 200 24 apps registered ✅
```

## Critical: Termii Balance

**Balance: 10 NGN (~$0.006 USD) — CRITICALLY LOW**
SMS OTP is non-functional. Email OTP works as fallback.
**Action: Register sender ID "RALD" in Termii dashboard + top up to ≥5,000 NGN**

## Supabase Database

**Project:** onxdcikfttdmnhofsuwo | **Status:** ✅ OPERATIONAL
users table: ✅ Recovered (was dropped by previous agent session — migration applied)

## G.12 Infrastructure Fixes Applied

| Repo | Fix | Status |
|---|---|---|
| rald-notify | deploy.yml rebuilt — KV auto-resolve + wrangler secret push | ✅ PUSHED |
| rald-notify | wrangler.toml — CF-API-resolvable KV placeholders | ✅ PUSHED |
| rald-search | deploy.yml rebuilt — KV auto-resolve + wrangler secret push | ✅ PUSHED |
| rald-search | wrangler.toml — CF-API-resolvable KV placeholders | ✅ PUSHED |
| rald-inbox | deploy.yml rebuilt — KV auto-resolve + wrangler secret push | ✅ PUSHED |
| rald-inbox | wrangler.toml — CF-API-resolvable KV placeholders | ✅ PUSHED |
| rald-realtime | deploy.yml created — KV auto-resolve + secret push | ✅ PUSHED |
| rald-realtime | wrangler.toml — CF-API-resolvable KV placeholders | ✅ PUSHED |
