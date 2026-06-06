# Cloudflare Infrastructure Audit
**Date:** 2026-06-06  
**Auditor:** Foundation Hardening Program — Phase 4  

---

## Evidence Base

All findings from repo inspection of wrangler.toml files and CI deploy logs.

---

## Workers Deployed

| Worker | Route | Status | KV | Observability |
|--------|-------|--------|-----|---------------|
| rald-auth (`rald-auth-core`) | `auth.rald.cloud/*` | ✅ Deploy GREEN | RATE_LIMIT_KV + RALD_SESSION_KV | ✅ enabled, 100% sampling |
| rald-notify | `notify.rald.cloud/*` | ✅ Deploy GREEN | RATE_LIMIT_KV | confirmed |
| rald-search | `search.rald.cloud/*` | ✅ Deploy GREEN | RATE_LIMIT_KV | confirmed |
| rald-realtime | `realtime.rald.cloud/*` | ✅ Deploy GREEN | RATE_LIMIT_KV + HEALTH_KV + PROVIDER_STATE_KV | confirmed |
| rald-inbox | `inbox.rald.cloud/*` | ✅ Deploy GREEN | RATE_LIMIT_KV | confirmed |
| rald-ai | Worker | ✅ CI GREEN | — | — |
| loop-crm | Worker | ⚠️ CI fixed | — | — |
| messenger | `messenger.rald.cloud/*` | ✅ Deploy GREEN | — | — |

---

## KV Namespaces

| Binding | Namespace | ID | Used By |
|---------|-----------|-----|---------|
| RATE_LIMIT_KV | rald-auth-rate-limit | `b0e3c620619c4aab85e5f59f6ebddc0e` | rald-auth-core |
| RALD_SESSION_KV | rald-session | `15ee70c2a0534880a11843469d0468ef` | rald-auth-core |
| RATE_LIMIT_KV | rald-notify-rate-limit | `f54f9248247a428bb4e54ddfc1e2c832` | rald-notify |
| RATE_LIMIT_KV | rald-search-rate-limit | `279f321a984a4f3cb03bc041cb70b8a6` | rald-search |
| RATE_LIMIT_KV | rald-inbox-rate-limit | `be8b3854b50c4f9aac8d91345e955466` | rald-inbox |
| RATE_LIMIT_KV | rald-realtime-rate-limit | `5115e9d11424487eaaff71638addff34` | rald-realtime |
| HEALTH_KV | rald-realtime-health | `36a4c73ff82a4aabae5fa4b604622047` | rald-realtime |
| PROVIDER_STATE_KV | rald-realtime-state | `91d1b5895a99481588118695fba6bd52` | rald-realtime |

All 8 KV namespaces provisioned. IDs are real (confirmed from Cloudflare API in rald-workflows provision run).

---

## Pages Deployments

| App | Domain | Status |
|-----|--------|--------|
| rald-auth-ui | profiles.rald.cloud | ✅ Previously green; CI fix pushed 2026-06-06 |
| manilla-artist-contract | manilla-artist-contract.pages.dev | ⚠️ Re-deploying after JSX fix |
| manilla-91ff7f38 | manilla.rald.cloud (primary) | ✅ GREEN |
| rald-identity | identity.rald.cloud | ✅ Deploy GREEN |
| rald-control-center | control.rald.cloud | ✅ Deploy GREEN |
| loop | loop.rald.cloud | ✅ Deploy GREEN |
| messenger | messenger.rald.cloud | ✅ Pages + Worker GREEN |

---

## DNS / SSL

- Zone: `rald.cloud` (confirmed from wrangler.toml `zone_name = "rald.cloud"`)
- All worker routes use `https://` — no HTTP
- Redirect validation enforces `https:` protocol in `validateRedirectUrl()`

---

## Secrets (Workers)

Required secrets for `rald-auth-core` (none have fallbacks — confirmed in wrangler.toml comments):
- `SUPABASE_SERVICE_ROLE_KEY`
- `RALD_JWT_SECRET`
- `TERMII_API_KEY` + `TERMII_SENDER_ID`
- `RESEND_API_KEY`
- `CLERK_SECRET_KEY` + `CLERK_PUBLISHABLE_KEY`

⚠️ Secret rotation policy not confirmed — must be documented.

---

## Rate Limits

- Per-route rate limiting via KV namespaces — confirmed in `src/lib/rate-limit.ts`
- `getClientIp()` used for per-IP limiting

---

## Gaps

| Gap | Priority |
|-----|----------|
| R2 bucket usage not confirmed in any repo | MEDIUM |
| Cloudflare Queues not observed | LOW |
| Cache rules not confirmed | MEDIUM |
| Secret rotation policy undocumented | HIGH |
| `rald-auth-server` repo has no CI or wrangler config | HIGH |

---

## Score

| Check | Score |
|-------|-------|
| Workers deployed | 9/10 |
| KV namespaces provisioned | 10/10 |
| Pages deployed | 8/10 |
| DNS/SSL | 9/10 |
| Secrets managed | 8/10 — no rotation policy |
| Rate limiting | 9/10 |
| R2 | 3/10 — not confirmed |
| Queues | 3/10 — not observed |
| Cache rules | 5/10 — not confirmed |

**Total: 64/90 → 71/100**

### Gap to 95+
- Document and verify R2 buckets (media storage for Loop/Manilla)
- Implement Cloudflare Queues for async jobs
- Document cache rules per domain
- Establish secret rotation schedule
