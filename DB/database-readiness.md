# Database Readiness Audit
**Date:** 2026-06-06  
**Auditor:** Foundation Hardening Program — Phase 7  

---

## Evidence Base

| Source | File |
|--------|------|
| Migrations | `Ostinato-Loop/rald-auth-core/supabase/migrations/` |
| App registry | `20260603_registered_apps.sql` |
| Identity | `20260603_identity_v2.sql` |
| Auth users | `20260601_auth_users_table.sql` |
| Recovery | `20260531_recovery_users_table.sql` |
| Search | `20260605_search_profile_columns.sql`, `20260605_search_rpc.sql` |
| Social | `20260605_social_graph_tables.sql` |

---

## Checks

### ✅ RLS (Row Level Security)
- `registered_apps`: `ALTER TABLE registered_apps ENABLE ROW LEVEL SECURITY;` — confirmed
- Service role bypasses RLS (Cloudflare Worker uses service role key)
- Additional tables require individual verification

### ✅ Indexes
- `idx_registered_apps_app_id ON registered_apps(app_id)` — confirmed
- `idx_registered_apps_status ON registered_apps(status)` — confirmed
- Search RPC present (`20260605_search_rpc.sql`) — implies indexed search columns

### ✅ Constraints
- `registered_apps.app_id` — `UNIQUE` constraint confirmed
- `registered_apps.status` — `CHECK (status IN ('active', 'suspended', 'pending'))` confirmed
- `registered_apps.created_at` — `NOT NULL DEFAULT now()` confirmed
- UUID primary keys with `gen_random_uuid()` — confirmed

### ✅ Audit Tables
- `writeAuditLog()` in `src/lib/audit.ts` — tracks: login, logout, sso_exchange, sso_handoff_issued, app_registered, role changes
- Auth login history: `auth_login_history` table (confirmed from sso.ts insert)

### ✅ Migration Tracking
- 8 migration files, date-prefixed, append-only
- Latest: `20260606_manilla_app_registry.sql` (added in this session)

### ⚠️ Backups
- Supabase managed backups — plan-dependent
- No custom backup script observed in repos
- **Required:** Confirm Supabase Pro plan backup policy, document RTO/RPO

### ⚠️ Orphan Data
- `auth_login_history` references `user_id` — foreign key constraint not confirmed
- Social graph tables added `20260605` — relationship integrity not fully verified

### ⚠️ v2 Schema
- `20260531_v2_schema.sql` — contents not fully reviewed
- `20260603_identity_v2.sql` — confirms role system, approval workflow

---

## Score

| Check | Score |
|-------|-------|
| Backups | 5/10 — Supabase default, not verified |
| RLS | 8/10 — confirmed on reviewed tables |
| Indexes | 8/10 — core indexes confirmed |
| Constraints | 9/10 |
| Audit Tables | 9/10 |
| Orphan Data | 6/10 — FK constraints not fully confirmed |
| Migration integrity | 9/10 |

**Total: 54/70 → 77/100**

### Gap to 95+
- Confirm Supabase backup policy and test restore
- Add FK constraints to `auth_login_history.user_id`
- Review full v2 schema for orphan data risks
- Document RTO/RPO targets
