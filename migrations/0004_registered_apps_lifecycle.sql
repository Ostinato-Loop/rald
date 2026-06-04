-- Migration: 0004_registered_apps_lifecycle
-- Phase 9 — Product Governance: lifecycle state for registered RALD apps
-- LILCKY STUDIO LIMITED

-- ── Add lifecycle state column ────────────────────────────────────────────────
ALTER TABLE registered_apps
  ADD COLUMN IF NOT EXISTS lifecycle_state TEXT
    NOT NULL DEFAULT 'development'
    CHECK (lifecycle_state IN ('development', 'staging', 'production', 'deprecated', 'archived'));

-- ── Add launch metadata ───────────────────────────────────────────────────────
ALTER TABLE registered_apps
  ADD COLUMN IF NOT EXISTS launched_at    TIMESTAMPTZ;

ALTER TABLE registered_apps
  ADD COLUMN IF NOT EXISTS deprecated_at  TIMESTAMPTZ;

ALTER TABLE registered_apps
  ADD COLUMN IF NOT EXISTS archived_at    TIMESTAMPTZ;

ALTER TABLE registered_apps
  ADD COLUMN IF NOT EXISTS launch_region  TEXT DEFAULT 'ng'; -- ISO-3166 alpha-2

ALTER TABLE registered_apps
  ADD COLUMN IF NOT EXISTS app_version    TEXT DEFAULT '0.1.0';

-- ── Seed the known RALD apps ──────────────────────────────────────────────────
INSERT INTO registered_apps (
  app_id, display_name, app_url, redirect_uris, lifecycle_state, app_version, launch_region, launched_at
) VALUES
  (
    'loop',
    'Loop',
    'https://loop.rald.cloud',
    '["https://loop.rald.cloud/","https://loop.rald.cloud/login"]',
    'production',
    '2.0.0',
    'ng',
    NOW()
  ),
  (
    'messenger',
    'Loop Messenger',
    'https://messenger.rald.cloud',
    '["https://messenger.rald.cloud/","https://messenger.rald.cloud/auth"]',
    'production',
    '1.2.0',
    'ng',
    NOW()
  ),
  (
    'profiles',
    'RALD Profiles',
    'https://profiles.rald.cloud',
    '["https://profiles.rald.cloud/"]',
    'production',
    '1.0.0',
    'ng',
    NOW()
  ),
  (
    'rald-auth-core',
    'RALD Auth Core',
    'https://auth.rald.cloud',
    '[]',
    'production',
    '1.0.0',
    'ng',
    NOW()
  )
ON CONFLICT (app_id) DO UPDATE SET
  lifecycle_state = EXCLUDED.lifecycle_state,
  app_version     = EXCLUDED.app_version,
  launched_at     = COALESCE(registered_apps.launched_at, EXCLUDED.launched_at);

-- ── Index for lifecycle queries ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_registered_apps_lifecycle
  ON registered_apps (lifecycle_state);

COMMENT ON COLUMN registered_apps.lifecycle_state IS
  'App lifecycle: development → staging → production → deprecated → archived';

COMMENT ON COLUMN registered_apps.launch_region IS
  'Primary launch region (ISO-3166 alpha-2). Used for regional rollouts.';
