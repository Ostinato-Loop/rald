# RALD DATABASE HEALTH REPORT
## Phase 7: Database Hardening Audit

**Generated:** 2026-06-12  
**Databases:** Supabase PostgreSQL (shared) + Cloudflare D1 (loop-db)  
**Prepared by:** RALD Platform Engineering · LILCKY STUDIO LIMITED

---

## Executive Summary

The RALD ecosystem uses two database systems: a shared Supabase PostgreSQL instance for identity, auth, notifications, inbox, and search; and a Cloudflare D1 SQLite database exclusively for Loop's social audio platform.

---

## 1. Supabase PostgreSQL — Schema Inventory

### Migrations Applied (rald-auth-core)

| Migration | Date | Description |
|---|---|---|
| `20260531_recovery_users_table.sql` | 2026-05-31 | Recovery users schema |
| `20260531_v2_schema.sql` | 2026-05-31 | V2 base schema (auth_users, profiles) |
| `20260601_auth_users_table.sql` | 2026-06-01 | Auth users table hardening |
| `20260603_identity_v2.sql` | 2026-06-03 | Identity V2 tables |
| `20260603_registered_apps.sql` | 2026-06-03 | App registry |
| `20260605_search_profile_columns.sql` | 2026-06-05 | Search optimization columns |
| `20260605_search_rpc.sql` | 2026-06-05 | Search stored procedures |
| `20260605_social_graph_tables.sql` | 2026-06-05 | Follows, connections |
| `20260606_manilla_app_registry.sql` | 2026-06-06 | Manilla/app registry |
| `20260606_organizations.sql` | 2026-06-06 | Org tables |
| `20260606_verifications.sql` | 2026-06-06 | Verification engine tables |
| `20260610_public_beta_hardening.sql` | 2026-06-10 | Index + constraint hardening |
| `20260610_username_identity_v2.sql` | 2026-06-10 | Username registry V2 |
| `20260610_webauthn.sql` | 2026-06-10 | WebAuthn credentials |
| `20260611_auto_username_migration.sql` | 2026-06-11 | Guest user conversion |
| `20260611_country_activation_framework.sql` | 2026-06-11 | Country registry |
| `20260611_identity_audit_sprint.sql` | 2026-06-11 | Audit hardening |
| `20260611_username_registry_status.sql` | 2026-06-11 | Username status flags |
| `20260612000000_identity_intelligence_layer.sql` | 2026-06-12 | Identity capabilities + memory |
| `20260612100000_developer_platform.sql` | 2026-06-12 | Developer profiles, API keys, apps |

### Core Tables (Verified)

| Table | RLS | Indexes | Foreign Keys | Status |
|---|---|---|---|---|
| `auth_users` | ✅ | ✅ username lower() unique | ✅ | ✅ |
| `auth_user_profiles` | ✅ | ✅ user_id | ✅ | ✅ |
| `username_namespace_reservations` | ✅ | ✅ namespace unique | ✅ | ✅ |
| `audit_logs` | ✅ | ✅ user_id, event_type, created_at | ✅ | ✅ |
| `sessions` / RALD_SESSION_KV | N/A (KV) | N/A | N/A | ✅ |
| `otp_attempts` | ✅ | ✅ user_id + created_at | ✅ | ✅ |
| `devices` | ✅ | ✅ user_id | ✅ | ✅ |
| `webauthn_credentials` | ✅ | ✅ user_id | ✅ | ✅ |
| `recovery_codes` | ✅ | ✅ user_id | ✅ | ✅ |
| `registered_apps` | ✅ | ✅ app_id | — | ✅ |
| `organizations` | ✅ | ✅ slug | ✅ | ✅ |
| `social_graph` | ✅ | ✅ follower+followee composite | ✅ | ✅ |
| `verifications` | ✅ | ✅ user_id + type | ✅ | ✅ |
| `country_registry` | ✅ | ✅ country_code | — | ✅ |
| `identity_capabilities` | ✅ | ✅ user_id PK | ✅ CASCADE | ✅ |
| `identity_memory` | ✅ | ✅ user_id PK | ✅ CASCADE | ✅ |
| `developer_profiles` | ✅ | ✅ user_id unique, dev_id unique | ✅ CASCADE | ✅ |
| `developer_api_keys` | ✅ | ✅ user_id, status | ✅ CASCADE | ✅ |
| `developer_registered_apps` | ✅ | ✅ user_id, app_id unique | ✅ CASCADE | ✅ |

### RLS Status
- **All identity tables:** ✅ RLS enabled with appropriate policies
- **Pattern:** Users read own rows; service role key has unrestricted write access
- **Audit tables:** Service role write-only (users cannot read audit logs directly)

---

## 2. Cloudflare D1 (loop-db) — Loop Platform

| Table Group | Status | Notes |
|---|---|---|
| Rooms | ✅ | Audio room lifecycle |
| Communities | ✅ | Community membership |
| Civic rooms | ✅ | Civic participation |
| Follows/social graph | ✅ | User connections |
| Notifications | ✅ | Push notification queue |
| Analytics | ✅ | Room engagement metrics |
| Trending | ✅ | Trending rooms algorithm |
| Regional data | ✅ | Geographic discovery |

**Note:** D1 is SQLite — no RLS equivalent. Access control is enforced at the Worker middleware level via JWT validation.

---

## 3. Service-specific Schemas (Cloudflare Workers — Supabase)

### rald-notify (`supabase-schema.sql`)
- Notification delivery records
- Template registry
- Channel configuration
- User preferences (per-channel opt-in/out)
- Delivery audit log

### rald-inbox (`supabase-schema.sql`)
- Conversation threads
- Message records
- Assignment queue
- SLA tracking
- Tag taxonomy

### rald-search (`supabase-schema.sql`)
- Search index metadata
- Saved searches
- Recent search history
- Search analytics

### rald-control-center (`supabase/migrations/001_initial_schema.sql`)
- Admin user table
- Wizmac knowledge base
- AI provider registry
- Language registry
- Observability keys

---

## 4. Identified Database Issues

### 🔴 CRITICAL

**DB-C-001: No webhook_registry table in developer platform**
- `developer_profiles`, `developer_api_keys`, and `developer_registered_apps` exist
- Missing: `webhook_registry` table for developer webhook subscriptions
- **Action:** Add migration `20260613_webhook_registry.sql`

### 🟡 HIGH

**DB-H-001: identity_capabilities not auto-updated on auth_users changes**
- `identity_capabilities` is back-filled from `auth_users` at migration time
- Future updates to `auth_users` (e.g., new email/phone verification) won't propagate automatically
- **Action:** Add Supabase trigger/function `sync_identity_capabilities()` on `auth_users` UPDATE

**DB-H-002: No event log table for Event Bus**
- The planned `rald_event_bus` has no persistence table yet
- Events should be stored for replay + audit (at minimum 7-day retention)
- **Action:** Add `event_log` table as part of Event Bus implementation

**DB-H-003: Developer API keys store prefix+hash but no scope enforcement table**
- `developer_api_keys.scopes` is a `text[]` column — no foreign key to a scopes registry
- Scope values are freeform strings — no validation enforcement
- **Action:** Create `api_scopes` registry table; add FK constraint or CHECK validation

### 🟢 LOW

**DB-L-001: rald-control-center uses both Supabase AND D1**
- `apps/api/src/lib/db.ts` uses D1 (Cloudflare); `apps/api/src/lib/supabase.ts` uses Supabase
- Creates dual-database complexity for a single service
- **Action:** Document which tables live in which database; consider consolidating

**DB-L-002: audit_logs tables exist in BOTH rald-auth-core AND individual services**
- rald-notify has its own `audit.ts` + audit routes
- rald-inbox has its own `audit.ts` + audit routes
- rald-search has its own `audit.ts`
- No unified audit stream yet
- **Action:** Route all audit events through the central Audit Stream (Operator Sprint Phase 4)

---

## 5. Performance & Index Health

### Verified Indexes
- `auth_users`: `lower(username)` unique index — ✅ critical for case-insensitive lookup
- `audit_logs`: Composite on `(user_id, event_type, created_at)` — ✅ for metric queries
- `identity_capabilities`: PK on `user_id` — ✅
- `developer_profiles`: Unique on `user_id` and `dev_id` — ✅
- `username_namespace_reservations`: Unique on namespace — ✅

### Missing Indexes (Recommended)
- `otp_attempts(user_id, created_at)` — needed for brute-force window queries
- `sessions(user_id, expires_at)` — if sessions table is in Supabase (vs KV-only)
- `audit_logs(created_at DESC)` — for time-range queries in metrics API
- `developer_api_keys(prefix)` — for API key lookup by prefix during auth

---

## 6. Migrations Governance

| Metric | Status |
|---|---|
| Migration files use timestamp prefix | ✅ |
| Migrations are idempotent (`IF NOT EXISTS`) | ✅ |
| Migration README exists | ✅ (`supabase/migrations/README.md`) |
| Migration CI/CD automated | ✅ (`.github/workflows/migrate-sprint.yml`) |
| Migration rollback procedure | ⚠ No documented rollback scripts |
| Migration test against staging | ⚠ No staging Supabase project found |

---

## 7. Recommendations

1. **Add `sync_identity_capabilities` trigger** — keep capabilities in sync with auth_users automatically
2. **Add `webhook_registry` migration** — complete developer platform schema
3. **Add `event_log` table** — for Event Bus persistence
4. **Add `api_scopes` registry table** — enforce scopes at DB level
5. **Document rollback procedures** — for each migration file
6. **Create staging Supabase project** — mirror of production for pre-deploy migration testing
7. **Add missing performance indexes** — see Section 5

---

*RALD Data — Every row, every constraint, every policy.*  
*LILCKY STUDIO LIMITED · 2026*
