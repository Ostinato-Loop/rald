-- ============================================================
-- RALD Production Schema v1.1 — Clean (no seed data)
-- Owner: LILCKY STUDIO LIMITED
-- Run in Supabase SQL Editor to initialize the production DB.
-- ============================================================

-- Users
CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email           TEXT NOT NULL UNIQUE,
  phone           TEXT UNIQUE,
  password_hash   TEXT NOT NULL DEFAULT '',
  name            TEXT,
  role            TEXT NOT NULL DEFAULT 'user'
                  CHECK (role IN ('admin','operator','viewer','user','merchant')),
  email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  phone_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS users_email_idx ON users (email);
CREATE INDEX IF NOT EXISTS users_phone_idx ON users (phone);
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

-- OTPs (SMS + Email verification codes)
CREATE TABLE IF NOT EXISTS otps (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  phone       TEXT,
  email       TEXT,
  pin_id      TEXT,        -- Termii pinId for SMS OTPs
  code_hash   TEXT,        -- SHA-256 hash for email OTPs
  type        TEXT NOT NULL DEFAULT 'sms'
              CHECK (type IN ('sms','email','password_reset')),
  used        BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS otps_email_idx   ON otps (email) WHERE used = FALSE;
CREATE INDEX IF NOT EXISTS otps_phone_idx   ON otps (phone) WHERE used = FALSE;
CREATE INDEX IF NOT EXISTS otps_expires_idx ON otps (expires_at);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL UNIQUE,
  user_agent   TEXT,
  ip_address   TEXT,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at   TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days')
);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx   ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_idx   ON sessions (expires_at);

-- Disable RLS (service role key used from Worker)
ALTER TABLE users        DISABLE ROW LEVEL SECURITY;
ALTER TABLE services     DISABLE ROW LEVEL SECURITY;
ALTER TABLE credentials  DISABLE ROW LEVEL SECURITY;
ALTER TABLE deployments  DISABLE ROW LEVEL SECURITY;
ALTER TABLE products     DISABLE ROW LEVEL SECURITY;
ALTER TABLE otps         DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions     DISABLE ROW LEVEL SECURITY;

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

-- NOTE: No seed data. RALD is owned and operated by LILCKY STUDIO LIMITED.
-- To create the first admin account, register via /api/auth/register with role='admin'.
