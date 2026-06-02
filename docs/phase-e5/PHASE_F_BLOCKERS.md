# PHASE F BLOCKERS
**Phase F:** Unified Inbox  
**Phase:** E.5 — Pre-F Gate  
**Owner:** LILCKY STUDIO LIMITED  
**Date:** 2026-06-02

---

## Blocker Classification

| Type | Description |
|---|---|
| ENGINEERING | Code or architecture work required |
| OPERATIONS | Human operator action required (deploy, configure) |
| VENDOR | Third-party provider action required |
| ARCHITECTURE | Fundamental design issue blocking progress |

---

## Engineering Blockers

| # | Blocker | Severity | Status |
|---|---|---|---|
| E1 | Webhook URL SSRF validation missing in rald-notify | MEDIUM | Open — non-blocking |
| E2 | `workspaceMiddleware` membership check not pre-validated | MEDIUM | Open — data safe, non-blocking |
| E3 | Postgres FTS filter operators incomplete (gt/gte/lt/lte) | MEDIUM | Open — basic search fully functional |
| E4 | Push subscription auto-purge on 410 not implemented | LOW | Open — non-blocking |
| E5 | OTP expired record cleanup cron not implemented | LOW | Open — no data risk |

**Engineering Blockers Blocking Phase F: 0**

---

## Operations Blockers

| # | Blocker | Severity | Required Action |
|---|---|---|---|
| O1 | rald-notify CF Worker secrets not uploaded | HIGH | `wrangler secret put SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RALD_JWT_SECRET`, `RESEND_API_KEY`, `TERMII_API_KEY`, `VAPID_*` |
| O2 | rald-search CF Worker secrets not uploaded | HIGH | `wrangler secret put SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RALD_JWT_SECRET` |
| O3 | rald-notify Supabase schema not applied | HIGH | Run `supabase-schema.sql` in Supabase SQL editor |
| O4 | rald-search Supabase schema not applied | HIGH | Run `supabase-schema.sql` in Supabase SQL editor |
| O5 | rald-notify not deployed to Cloudflare Workers | HIGH | `wrangler deploy` from rald-notify repo |
| O6 | rald-search not deployed to Cloudflare Workers | HIGH | `wrangler deploy` from rald-search repo |
| O7 | KV namespace IDs need real values in wrangler.toml | MEDIUM | Create KV namespaces in CF Dashboard, update wrangler.toml |

**Operations Blockers blocking Phase F: 7 (all operator actions, no code changes)**

---

## Vendor Blockers

| # | Blocker | Severity | Required Action |
|---|---|---|---|
| V1 | Resend — `rald.cloud` domain not verified for `notify@rald.cloud` | HIGH | Add DNS records in Resend dashboard |
| V2 | Termii — RALD sender ID registration | MEDIUM | Register in Termii dashboard |
| V3 | Cloudflare — DNS routes for notification.rald.cloud and search.rald.cloud | HIGH | Add CNAME/AAAA records pointing to CF Workers |

**Vendor Blockers blocking Phase F: 3 (all vendor actions, no code changes)**

---

## Architecture Blockers

**Architecture Blockers blocking Phase F: 0**

No architectural issues remain. The Unified Inbox can be built directly on top of the existing services.

---

## Summary

| Type | Count | Phase F Blocking |
|---|---|---|
| ENGINEERING | 5 (MEDIUM/LOW) | 0 |
| OPERATIONS | 7 (HIGH) | 7 (but these are deploy steps, not code) |
| VENDOR | 3 (HIGH/MEDIUM) | 3 (but these are external actions) |
| ARCHITECTURE | 0 | 0 |

**Conclusion:** No ENGINEERING or ARCHITECTURE blockers. All remaining blockers are OPERATIONS or VENDOR steps that require platform access, not code work.

**Phase F engineering may begin while operations/vendor tasks proceed in parallel.**
