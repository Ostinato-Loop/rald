-- ============================================================
-- RALD Auth Core — Rollback for migration v2.0
-- Owner: LILCKY STUDIO LIMITED
-- Date:  2026-05-31
-- WARNING: Destructive. Only run to undo 20260531_v2_schema.sql.
--          All data in dropped tables will be permanently lost.
-- ============================================================

-- ── Drop v2 tables (reverse order respects no FK deps between them) ───────────
DROP TABLE IF EXISTS otp_codes     CASCADE;
DROP TABLE IF EXISTS product_access CASCADE;
DROP TABLE IF EXISTS user_devices   CASCADE;

-- ── Remove backfilled columns added in v2 (only if safe) ─────────────────────
-- NOTE: rald_id was present in v1.2 of some deployments.
-- Only drop if you are certain it was NOT present before this migration.
-- ALTER TABLE users DROP COLUMN IF EXISTS rald_id;

-- ── Remove backfilled indexes ─────────────────────────────────────────────────
-- (indexes are dropped automatically via CASCADE above for their tables)

-- ── End rollback ─────────────────────────────────────────────────────────────
-- To re-apply: run 20260531_v2_schema.sql again (fully idempotent).
