-- ============================================================
-- RALD Production Schema v1.2 — Clean (no seed data)
-- Owner: LILCKY STUDIO LIMITED
-- Run in Supabase SQL Editor to initialize or migrate the DB.
-- All statements are idempotent (IF NOT EXISTS / OR REPLACE).
-- ============================================================

-- ── Users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  rald_id         TEXT UNIQUE,                          -- permanent RALD-XXXXXXXX identity
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
CREATE INDEX IF NOT EXISTS users_email_idx   ON users (email);
CREATE INDEX IF NOT EXISTS users_phone_idx   ON users (phone);
CREATE INDEX IF NOT EXISTS users_role_idx    ON users (role);
CREATE INDEX IF NOT EXISTS users_rald_id_idx ON users (rald_id);

-- Backfill rald_id for existing users that don't have one
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM users WHERE rald_id IS NULL LOOP
    UPDATE users
    SET rald_id = 'RALD-' || upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8))
    WHERE id = r.id AND rald_id IS NULL;
  END LOOP;
END $$;

-- ── Services ──────────────────────────────────────────────────
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

-- ── Credentials (encrypted secrets vault) ─────────────────────
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

-- ── Deployments ───────────────────────────────────────────────
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

-- ── Products ──────────────────────────────────────────────────
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

-- ── OTPs ──────────────────────────────────────────────────────
-- email_login = stateless login OTP via JWT; email = account verify OTP
CREATE TABLE IF NOT EXISTS otps (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  phone       TEXT,
  email       TEXT,
  pin_id      TEXT,
  code_hash   TEXT,
  type        TEXT NOT NULL DEFAULT 'sms'
              CHECK (type IN ('sms','email','email_login','password_reset')),
  used        BOOLEAN NOT NULL DEFAULT FALSE,
  provider    TEXT,                        -- 'termii' | 'twilio' | 'resend'
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS otps_email_idx   ON otps (email)   WHERE used = FALSE;
CREATE INDEX IF NOT EXISTS otps_phone_idx   ON otps (phone)   WHERE used = FALSE;
CREATE INDEX IF NOT EXISTS otps_expires_idx ON otps (expires_at);

-- ── Sessions ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash    TEXT NOT NULL UNIQUE,
  user_agent    TEXT,
  ip_address    TEXT,
  device_name   TEXT,
  trusted       BOOLEAN NOT NULL DEFAULT FALSE,
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at    TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days')
);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions (expires_at);
CREATE INDEX IF NOT EXISTS sessions_token_idx   ON sessions (token_hash);

-- ── Refresh Tokens ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  family_id  TEXT NOT NULL,               -- rotation chain; theft detected if family reused
  session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
  used_at    TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS refresh_tokens_user_id_idx ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_family_idx  ON refresh_tokens (family_id);

-- ── Waitlist ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS waitlist (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email         TEXT NOT NULL,
  name          TEXT,
  product       TEXT NOT NULL DEFAULT 'rald.cloud',
  referral_code TEXT,
  approved      BOOLEAN NOT NULL DEFAULT FALSE,
  approved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(email, product)
);
CREATE INDEX IF NOT EXISTS waitlist_email_idx   ON waitlist (email);
CREATE INDEX IF NOT EXISTS waitlist_product_idx ON waitlist (product);

-- ── Organizations (multi-tenant) ──────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  owner_id   TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  plan       TEXT NOT NULL DEFAULT 'free'
             CHECK (plan IN ('free','starter','growth','enterprise')),
  metadata   JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS orgs_owner_idx ON organizations (owner_id);

CREATE TABLE IF NOT EXISTS organization_members (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id     TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member'
             CHECK (role IN ('owner','admin','member','viewer')),
  invited_by TEXT REFERENCES users(id),
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);
CREATE INDEX IF NOT EXISTS org_members_org_idx  ON organization_members (org_id);
CREATE INDEX IF NOT EXISTS org_members_user_idx ON organization_members (user_id);

-- ── API Keys (Developer Portal) ───────────────────────────────
CREATE TABLE IF NOT EXISTS api_keys (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id      TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  key_prefix  TEXT NOT NULL,             -- e.g. rk_live_AbCd1234
  key_hash    TEXT NOT NULL UNIQUE,      -- SHA-256 of the full key
  scopes      JSONB NOT NULL DEFAULT '["read"]',
  environment TEXT NOT NULL DEFAULT 'live' CHECK (environment IN ('live','test')),
  last_used_at TIMESTAMPTZ,
  revoked_at  TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS api_keys_user_idx   ON api_keys (user_id);
CREATE INDEX IF NOT EXISTS api_keys_org_idx    ON api_keys (org_id);
CREATE INDEX IF NOT EXISTS api_keys_prefix_idx ON api_keys (key_prefix);

-- ── Webhook Secrets ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhook_secrets (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id      TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  url         TEXT NOT NULL,
  secret_hash TEXT NOT NULL,
  events      JSONB NOT NULL DEFAULT '["*"]',
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  last_fired_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Audit Logs ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id       TEXT REFERENCES users(id) ON DELETE SET NULL,
  action        TEXT NOT NULL,           -- 'login', 'logout', 'register', 'otp_sent', etc.
  resource_type TEXT,
  resource_id   TEXT,
  ip_address    TEXT,
  user_agent    TEXT,
  status        TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success','failure','blocked')),
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS audit_logs_user_idx   ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON audit_logs (action);
CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs (created_at DESC);

-- ── Disable RLS (service role key used from Worker) ──────────
ALTER TABLE users               DISABLE ROW LEVEL SECURITY;
ALTER TABLE services            DISABLE ROW LEVEL SECURITY;
ALTER TABLE credentials         DISABLE ROW LEVEL SECURITY;
ALTER TABLE deployments         DISABLE ROW LEVEL SECURITY;
ALTER TABLE products            DISABLE ROW LEVEL SECURITY;
ALTER TABLE otps                DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions            DISABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens      DISABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist            DISABLE ROW LEVEL SECURITY;
ALTER TABLE organizations       DISABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys            DISABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_secrets     DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs          DISABLE ROW LEVEL SECURITY;

-- ── Auto-update updated_at ────────────────────────────────────
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
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'orgs_updated_at') THEN
    CREATE TRIGGER orgs_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- NOTE: No seed data. RALD is owned and operated by LILCKY STUDIO LIMITED.
-- To create the first admin: POST /api/admin/create-admin with X-Bootstrap-Secret header.
