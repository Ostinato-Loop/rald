# PUBLIC BETA READINESS REPORT
**Generated:** 2026-06-15  
**Sprint:** Public Beta Hardening Sprint  
**Authority:** Principal Platform Engineer — RALD Platform Engineering  
**Version:** 1.0 — Final sprint output  
**Classification:** OFFICIAL — SOURCE OF TRUTH

---

## EXECUTIVE SUMMARY

The Public Beta Hardening Sprint is **complete**. All 12 sprint tasks have been addressed. The RALD ecosystem has been hardened across identity, session management, service-to-service authentication, graph/search schema alignment, and operational automation. Two P0 items remain as operator-action items (cron activation + secret rotation) that require Cloudflare Dashboard access.

**Beta readiness: CONDITIONAL GO** — pending the two operator actions below.

---

## SPRINT TASK RESULTS

### Task 1 — Remove Duplicate Auth Refresh ✅
**File:** `loop/artifacts/cloudflare-worker/src/routes/auth.ts`  
**Fix (USN-002 + DEDUP-001, 2026-06-15):**
- `GET /api/auth/silent` (canonical) was re-issuing tokens without the `username` claim. After silent refresh, any Loop component reading `payload.username` would see `null`, breaking the username-setup guard and causing repeated username-setup prompts.
- Fix: `username` now carried forward in the re-issued JWT. Profile upsert now propagates `username` to the DB (matching `rald-sso/silent`). Response includes `has_username` flag.
- `GET /api/auth/rald-sso/silent` is kept as a backward-compat alias — both paths now have identical semantics.

---

### Task 2 — Fix Graph Schema Mismatch ✅
**Migration:** `rald-auth-core/supabase/migrations/20260614000000_graph_schema_align.sql`  
**Root cause:** `20260605_social_graph_tables.sql` created columns under different names than `graph.ts` queries used.

| Table | Old column | New column |
|---|---|---|
| `rald_connections` | `connected_to` | `target_user_id` |
| `rald_connection_edges` | `from_user` | `user_id` |
| `rald_connection_edges` | `to_user` | `target_user_id` |

Also added `type` column to `rald_connections` (routes read `.type`; schema had `.edge_type`). Data migrated in-place. Indexes recreated with correct names.

---

### Task 3 — Fix Search RPC Mismatch ✅
**Migration:** `rald-auth-core/supabase/migrations/20260614100000_search_rpc_fix.sql`  
**Root cause:** Deployed `search_users_public(search_query, result_limit, result_offset)` signature; `routes/search.ts` calls it with `{p_query, p_pattern, p_limit, p_username, p_display_name, p_rald_address, p_location, p_interests}`.

Fix: Dropped old function, recreated with `p_`-prefixed parameters plus the additional field-specific filters (`p_location`, `p_interests`, `p_pattern`). Added `GRANT EXECUTE` to `service_role` and `anon`.

---

### Task 4 — Repair Migration Ordering ✅
**Migration:** `rald-auth-core/supabase/migrations/20260614200000_migration_ordering_fix.sql`  
Three ordering problems fixed:
- **(A)** `update_identity_updated_at()` referenced in `20260612400000_machine_identity.sql` but the base schema only defines `update_updated_at()`. Created alias function.
- **(B)** `machine_identity_rotation_alerts` VIEW created twice with incompatible column names (`days_until_due` INTERVAL vs `days_until_rotation` INT). `cleanup.ts` queries `days_until_rotation` — normalized to single authoritative view with INT column.
- **(C)** `machine_identities` updated_at trigger re-applied with correct function name.

---

### Task 5 — Move repair_identity_records Out of Login Path ✅
**File:** `rald-auth-core/src/routes/login-username.ts`  
Confirmed removed. Comment in the file: *"P5 fix superseded: repair_identity_records removed from login path (sprint hardening)"*.

`repair_identity_records()` now correctly called only from:
- `POST /migration/claim-username` — explicit user-triggered migration
- `GET /profiles/identity` — lazy repair on profile fetch (non-blocking)
- `GET /username/:username` — lazy repair on username lookup (non-blocking)
- `migration.ts` admin endpoints — admin-triggered bulk repair

All invocations are either user-triggered or background/admin contexts. Zero login-path overhead.

---

### Task 6 — Session Cleanup and Pruning ✅
**Files:**
- `rald-auth-core/src/jobs/cleanup.ts` — full cleanup job (268 lines)
- `rald-auth-core/src/index.ts` — `scheduled()` handler with `ctx.waitUntil`
- `rald-auth-core/wrangler.toml` — `[triggers]` block with two crons

**Hourly (0 * * * *):**
- Delete expired OTP codes
- Delete expired sessions

**Daily midnight UTC (0 0 * * *):**
- Delete stale device records (inactive 90+ days)
- Rotation alerts — notify admin of machine identities due for rotation
- Health snapshot — log ecosystem health metrics

**Machine token pattern:** `jobs/cleanup.ts` uses `MACHINE_KEY_ID` + `MACHINE_KEY_SECRET` (not the old shared `MACHINE_IDENTITY_SECRET`) to call `/machine/auth` for scoped tokens when sending admin notifications.

**Operator action required:** If the CI deploy token lacks `Scheduled Tasks:Edit` scope, enable crons manually in CF Dashboard → Workers & Pages → `rald-auth` → Triggers.

---

### Task 7 — Replace Shared MACHINE_IDENTITY_SECRET ✅
**Status:** Code complete. Operator rotation pending.

**Architecture:** Each service now has a unique `key_id` + `secret` pair. Services call `POST /machine/auth` with their credentials to exchange for a scoped 1-hour JWT. The JWT carries service name, scopes, and exp — verifiable without a DB call.

**rald-config (`config.rald.cloud`):** `src/lib/machine-auth.ts` — `requireMachineRead` / `requireMachineWrite` middleware. Accepts machine JWTs; backward-compatible with `RALD_ADMIN_SECRET` header during transition.

**rald-event-bus (`events.rald.cloud`):** `src/lib/machine-auth.ts` — `requireMachineAuth` middleware. Accepts machine JWTs; backward-compatible with `X-Internal-Secret` header during transition.

**Seed migration:** `20260615000000_machine_identity_seed.sql` — 8 service rows inserted with placeholder secrets.

**Provisioning:** `scripts/provision-machine-identities.sh` — rotates placeholders, outputs `wrangler secret put` commands for each service.

**Operator action required:** Run the provisioning script and push `MACHINE_KEY_ID` + `MACHINE_KEY_SECRET` to each service via wrangler.

---

### Task 8 — Build config.rald.cloud as Authoritative Feature Flag Service ✅
**Repo:** `rald-config`  
**Deployed at:** `config.rald.cloud`

**Capabilities:**
- Feature flag CRUD: `GET/POST/PATCH/DELETE /api/flags`
- Workspace-scoped flags with inheritance
- A/B rollout percentages (0–100%)
- Machine JWT auth (`requireMachineRead` / `requireMachineWrite`)
- Backward-compat `RALD_ADMIN_SECRET` header during rollout
- Health + readiness endpoints

All services should read flags via `GET config.rald.cloud/api/flags/:key` before branching on feature availability.

---

### Task 9 — Build events.rald.cloud as Canonical Event Bus ✅
**Repo:** `rald-event-bus`  
**Deployed at:** `events.rald.cloud`

**Capabilities:**
- Event publish: `POST /api/events` (machine auth required)
- Topic subscription management: `POST/DELETE /api/subscriptions`
- Event history: `GET /api/events/:topic`
- Delivery retry with exponential backoff
- Machine JWT auth (`requireMachineAuth`)
- Backward-compat `X-Internal-Secret` header during rollout
- Health + readiness endpoints

---

### Task 10 — Create rald-identity-brain as Ecosystem Authority ✅
**Repo:** `rald-auth-core` (deployed at `auth.rald.cloud`)  
**Version:** v2.9.0

**Namespace:** `/identity-brain/*` — canonical alias for `/identity/*`. Added in v2.9.0.

**Routes (all accessible at both `/identity/*` and `/identity-brain/*`):**
- `GET /identity-brain/intelligence` — cross-service identity analysis
- `GET /identity-brain/memory` — identity memory (dismissed prompts, preferences)
- `GET /identity-brain/health` — identity brain manifest + system status
- `GET /trust/:userId` — trust score + verification levels
- `GET /machine/*` — machine identity management (admin)
- `GET /profiles/*` — canonical profile data

The identity brain is the single source of truth for all identity decisions across the ecosystem. Services must not maintain local user stores — all user data flows through `auth.rald.cloud`.

---

### Task 11 — Audit Every Service for Direct Identity Logic ✅
**Report:** `messenger/IDENTITY_AUDIT.md`

**Summary of audit findings:**

| Service | Identity Model | Gap | Risk |
|---|---|---|---|
| `rald-auth-core` | Canonical RALD identity (Supabase Auth + JWT) | None — this IS the authority | N/A |
| `loop` | RALD SSO via `/api/auth/rald-sso` + Loop-scoped re-signed JWT | None after USN-002 fix | Low |
| `rald-config` | Machine JWT via `/machine/auth` | None | None |
| `rald-event-bus` | Machine JWT via `/machine/auth` | None | None |
| `rald-search` | User JWT (RALD_JWT_SECRET) for user context, machine JWT for indexing | None | None |
| `messenger` | **Express sessions + local `usersTable` (phone+displayName)** | **Critical gap** | **High** |
| `rald-realtime` | Not read (Cloudflare Durable Objects) | Assumed machine JWT | Medium |
| `rald-notify` | Internal machine JWT | None (send-only, no user store) | None |

**Messenger is the primary gap.** It maintains a completely separate identity system. See `messenger/IDENTITY_AUDIT.md` for the full remediation plan (3-phase migration to RALD SSO bridge).

---

### Task 12 — Public Beta Readiness Report ✅
This document.

---

## REMAINING OPERATOR ACTIONS (Beta Gate)

These items cannot be automated without elevated Cloudflare API token scopes:

| Action | Command/Location | Urgency |
|---|---|---|
| Rotate machine identity secrets | `export RALD_ADMIN_JWT=... && bash rald-auth-core/scripts/provision-machine-identities.sh` | **P0 — before beta** |
| Enable rald-auth cron triggers | CF Dashboard → Workers → rald-auth → Triggers: add `"0 * * * *"` + `"0 0 * * *"` | P0 — before beta |
| Enable rald-notify cron trigger | CF Dashboard → Workers → rald-notify → Triggers: add `"*/5 * * * *"` | P0 — before beta |
| Push OpenObserve secrets to all workers | `wrangler secret put OPEN_OBSERVE_API_KEY` + `OPEN_OBSERVE_ENDPOINT` per worker | P1 — before beta |
| Update Mailgun DKIM DNS record | Cloudflare DNS → `mailers._domainkey.mailers.rald.cloud` | P1 — before beta |

---

## ECOSYSTEM ARCHITECTURE (post-sprint)

```
┌─────────────────────────────────────────────────────────────────┐
│                        RALD Identity Brain                       │
│              auth.rald.cloud  (rald-auth-core v2.9.0)           │
│                                                                  │
│  /auth/*          — login, OTP, register, refresh               │
│  /sso/*           — token exchange, silent refresh              │
│  /identity-brain/* — canonical namespace (aliases /identity/*)  │
│  /username/*      — check, claim, change                        │
│  /trust/*         — trust scores, verification                  │
│  /machine/*       — machine identity management                 │
│  /profiles/*      — canonical profile store                     │
│  scheduled()      — hourly OTP/session cleanup, daily alerts    │
└──────────────┬────────────────────────────────────────────────┬─┘
               │ RALD JWT (RS256, RALD_JWT_SECRET)              │ machine JWT
               │                                                 │
    ┌──────────┴─────────┐                         ┌────────────┴─────────┐
    │  Loop (loop.rald.cloud)                      │  config.rald.cloud   │
    │  Cloudflare Worker + Hono                    │  Feature flags CRUD  │
    │  - /api/auth/rald-sso  SSO bridge            │  Machine JWT auth    │
    │  - /api/auth/silent    canonical refresh     └──────────────────────┘
    │  - /api/communities/*  V2 community          ┌──────────────────────┐
    │  - /api/follows/*      graph                 │  events.rald.cloud   │
    │  - Supabase (own DB)                         │  Event bus CRUD      │
    └──────────────────────────────────────────────│  Machine JWT auth    │
                                                   └──────────────────────┘
    ┌─────────────────────────┐
    │  Messenger (messenger.rald.cloud)  ← ⚠️ GAP
    │  Express + Drizzle/PostgreSQL
    │  - usersTable (local, phone-based)
    │  - Express sessions (NOT RALD JWT)
    │  - Remediation: Phase 1 SSO bridge
    └─────────────────────────┘

    ┌─────────────────────────┐     ┌─────────────────────────┐
    │  rald-search            │     │  rald-notify            │
    │  search.rald.cloud      │     │  notify.rald.cloud      │
    │  RALD JWT user auth     │     │  Machine JWT in-only    │
    │  3 providers (postgres/ │     │  Termii + Resend        │
    │  meilisearch/opensearch)│     │  ⚠️ Cron not active     │
    └─────────────────────────┘     └─────────────────────────┘
```

---

## POST-BETA BACKLOG

| Item | Priority | Effort |
|---|---|---|
| Messenger SSO bridge (Phase 1: add RALD JWT path alongside Express sessions) | P1 | 1 week |
| Messenger SSO migration (Phase 2: migrate `usersTable` → RALD identity) | P2 | 2 weeks |
| Notify retry / dead letter queue | P2 | 3 days |
| OpenObserve centralized logging | P1 | 1 day (operator) |
| rald-realtime identity audit | P2 | 1 day |
| Full ecosystem SSO health dashboard | P3 | 1 week |

---

*Report produced by Public Beta Hardening Sprint · RALD Platform Engineering · LILCKY STUDIO LIMITED · 2026-06-15*
