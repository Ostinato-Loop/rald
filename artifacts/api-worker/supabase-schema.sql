-- ============================================================
-- RALD Production Schema — Clean (no seed data)
-- Run in Supabase SQL Editor to initialize the production DB.
-- ============================================================

-- Users (shared by all RALD apps — control center staff, end users, merchants)
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email       TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name        TEXT,
  role        TEXT NOT NULL DEFAULT 'user'
              CHECK (role IN ('admin', 'operator', 'viewer', 'user', 'merchant')),
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS users_email_idx ON users (email);
CREATE INDEX IF NOT EXISTS users_role_idx  ON users (role);

-- Services (control center registry)
CREATE TABLE IF NOT EXISTS services (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name             TEXT NOT NULL,
  slug             TEXT NOT NULL UNIQUE,
  status           TEXT NOT NULL DEFAULT 'unknown'
                   CHECK (status IN ('healthy','degraded','down','deploying','unknown')),
  product          TEXT NOT NULL,
  url              TEXT NOT NULL,
  version          TEXT NOT NULL DEFAULT 'v1.0.0',
  region           TEXT,
  uptime           REAL,
  response_time_ms REAL,
  last_deployed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS services_slug_idx ON services (slug);

-- Credentials (encrypted secrets vault)
CREATE TABLE IF NOT EXISTS credentials (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name            TEXT NOT NULL,
  service         TEXT NOT NULL,
  type            TEXT NOT NULL DEFAULT 'api_key',
  encrypted_value TEXT NOT NULL,
  masked_value    TEXT,
  last_rotated_at TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Deployments
CREATE TABLE IF NOT EXISTS deployments (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  service_id        TEXT,
  service_name      TEXT NOT NULL,
  product           TEXT NOT NULL,
  environment       TEXT NOT NULL DEFAULT 'production',
  version           TEXT NOT NULL DEFAULT 'latest',
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','building','deploying','success','failed','rolled_back')),
  branch            TEXT NOT NULL DEFAULT 'main',
  commit_sha        TEXT NOT NULL,
  commit_message    TEXT,
  triggered_by      TEXT NOT NULL,
  duration          TEXT,
  cf_deployment_url TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS deployments_service_id_idx ON deployments (service_id);
CREATE INDEX IF NOT EXISTS deployments_status_idx     ON deployments (status);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name           TEXT NOT NULL,
  slug           TEXT NOT NULL UNIQUE,
  tagline        TEXT NOT NULL,
  domain         TEXT NOT NULL,
  color          TEXT NOT NULL,
  version        TEXT NOT NULL DEFAULT 'v1.0.0',
  status         TEXT NOT NULL DEFAULT 'coming_soon'
                 CHECK (status IN ('live','beta','coming_soon','maintenance')),
  services_count INTEGER NOT NULL DEFAULT 0,
  active_users   INTEGER DEFAULT 0,
  mrr            REAL DEFAULT 0,
  url            TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS products_slug_idx ON products (slug);

-- Disable Row Level Security (service role key used from Worker)
ALTER TABLE users       DISABLE ROW LEVEL SECURITY;
ALTER TABLE services    DISABLE ROW LEVEL SECURITY;
ALTER TABLE credentials DISABLE ROW LEVEL SECURITY;
ALTER TABLE deployments DISABLE ROW LEVEL SECURITY;
ALTER TABLE products    DISABLE ROW LEVEL SECURITY;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'users_updated_at') THEN
    CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'services_updated_at') THEN
    CREATE TRIGGER services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'products_updated_at') THEN
    CREATE TRIGGER products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- NOTE: No seed data. Create your first admin via:
--   INSERT INTO users (email, password_hash, name, role) VALUES (
--     'admin@rald.cloud',
--     '<use the /api/auth/register endpoint or hash a password with the PBKDF2 lib>',
--     'RALD Admin', 'admin'
--   );
