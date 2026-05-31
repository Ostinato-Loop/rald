-- ============================================================
-- RALD Auth Core — Supabase Migration v2.0
-- Owner: LILCKY STUDIO LIMITED
-- Date:  2026-05-31
-- Adds:  user_devices, product_access, otp_codes tables
-- Also:  backfills rald_id on users; adds missing indexes
-- Safe:  fully idempotent — run on any v1.x schema without harm
-- ============================================================

-- ── 0. Prerequisites ─────────────────────────────────────────────────────────
-- Ensure the pgcrypto extension is available for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 1. Patch users — ensure rald_id, phone_verified exist ────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS rald_id        TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone          TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS metadata       JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Unique index on rald_id (skip if already exists)
CREATE UNIQUE INDEX IF NOT EXISTS users_rald_id_idx ON users (rald_id) WHERE rald_id IS NOT NULL;

-- Backfill rald_id for any users that still lack one
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM users WHERE rald_id IS NULL LOOP
    UPDATE users
    SET rald_id = 'RALD-' || upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8))
    WHERE id = r.id AND rald_id IS NULL;
  END LOOP;
END $$;

-- ── 2. user_devices — trusted device registry ─────────────────────────────────
-- Tracks known devices per user; supports push-auth and trusted-device flows.
CREATE TABLE IF NOT EXISTS user_devices (
  id            TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id       TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id     TEXT        NOT NULL,                          -- stable browser/app fingerprint
  name          TEXT,                                          -- human label: "iPhone 15 Pro", "Chrome / macOS"
  type          TEXT        NOT NULL DEFAULT 'browser'
                            CHECK (type IN ('browser','mobile','desktop','api','unknown')),
  os            TEXT,                                          -- "iOS 17", "Android 14", "macOS 14"
  browser       TEXT,                                          -- "Chrome 124", "Safari 17"
  ip_address    TEXT,
  trusted       BOOLEAN     NOT NULL DEFAULT FALSE,
  trusted_at    TIMESTAMPTZ,
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at    TIMESTAMPTZ,
  UNIQUE(user_id, device_id)
);

CREATE INDEX IF NOT EXISTS user_devices_user_idx    ON user_devices (user_id);
CREATE INDEX IF NOT EXISTS user_devices_device_idx  ON user_devices (device_id);
CREATE INDEX IF NOT EXISTS user_devices_trusted_idx ON user_devices (user_id, trusted)
  WHERE revoked_at IS NULL;

ALTER TABLE user_devices DISABLE ROW LEVEL SECURITY;

-- ── 3. product_access — granular per-user/org product entitlements ────────────
-- Controls which RALD products (loop, payrald, identity, raldtics, etc.)
-- a user or organisation has access to, and at which plan tier.
CREATE TABLE IF NOT EXISTS product_access (
  id           TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id      TEXT        REFERENCES users(id) ON DELETE CASCADE,
  org_id       TEXT        REFERENCES organizations(id) ON DELETE CASCADE,
  product_slug TEXT        NOT NULL,                           -- 'loop','payrald','identity','raldtics', …
  plan         TEXT        NOT NULL DEFAULT 'free'
                           CHECK (plan IN ('free','starter','growth','enterprise','custom')),
  granted_by   TEXT        REFERENCES users(id) ON DELETE SET NULL,
  granted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ,
  revoked_at   TIMESTAMPTZ,
  metadata     JSONB,
  -- A record belongs to a user OR an org (not both; at least one required)
  CHECK (user_id IS NOT NULL OR org_id IS NOT NULL)
);

-- Enforce uniqueness per (user, product) and (org, product) separately
CREATE UNIQUE INDEX IF NOT EXISTS product_access_user_product_idx
  ON product_access (user_id, product_slug)
  WHERE user_id IS NOT NULL AND revoked_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS product_access_org_product_idx
  ON product_access (org_id, product_slug)
  WHERE org_id IS NOT NULL AND revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS product_access_user_idx    ON product_access (user_id)      WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS product_access_org_idx     ON product_access (org_id)       WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS product_access_product_idx ON product_access (product_slug) WHERE revoked_at IS NULL;

ALTER TABLE product_access DISABLE ROW LEVEL SECURITY;

-- ── 4. otp_codes — clean OTP management (replaces legacy otps table) ──────────
-- Supports all RALD OTP flows: SMS login, email login, password reset,
-- phone/email verification, device trust, 2FA.
-- Provider-agnostic: works with Termii (SMS), Twilio (SMS fallback), Resend (email).
CREATE TABLE IF NOT EXISTS otp_codes (
  id           TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id      TEXT        REFERENCES users(id) ON DELETE CASCADE,

  -- Target (phone or email being verified)
  target       TEXT        NOT NULL,
  target_type  TEXT        NOT NULL DEFAULT 'phone'
                           CHECK (target_type IN ('phone','email')),

  -- Code storage — never store plaintext; store SHA-256 hash
  code_hash    TEXT        NOT NULL,
  pin_id       TEXT,                                           -- Termii pin_id for SMS OTPs (needed for verify call)

  -- Flow context
  purpose      TEXT        NOT NULL DEFAULT 'login'
                           CHECK (purpose IN (
                             'login',            -- one-click login via OTP
                             'signup',           -- new user registration
                             'password_reset',   -- forgot password
                             'email_verify',     -- verify email address on account
                             'phone_verify',     -- verify phone number on account
                             'device_trust',     -- approve a new device
                             '2fa'               -- second factor
                           )),

  -- Delivery provider
  provider     TEXT        NOT NULL DEFAULT 'internal'
                           CHECK (provider IN ('termii','twilio','resend','internal')),

  -- Rate-limit / brute-force guards
  attempts     INTEGER     NOT NULL DEFAULT 0,
  max_attempts INTEGER     NOT NULL DEFAULT 5,

  -- Lifecycle
  used_at      TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Context for security / audit
  ip_address   TEXT,
  user_agent   TEXT
);

CREATE INDEX IF NOT EXISTS otp_codes_target_idx   ON otp_codes (target)    WHERE used_at IS NULL;
CREATE INDEX IF NOT EXISTS otp_codes_user_idx     ON otp_codes (user_id)   WHERE used_at IS NULL;
CREATE INDEX IF NOT EXISTS otp_codes_expires_idx  ON otp_codes (expires_at);
CREATE INDEX IF NOT EXISTS otp_codes_purpose_idx  ON otp_codes (purpose);

ALTER TABLE otp_codes DISABLE ROW LEVEL SECURITY;

-- ── 5. Auto-update trigger helper (idempotent) ────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

-- ── 6. Triggers for new tables ────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'user_devices_last_seen') THEN
    CREATE TRIGGER user_devices_last_seen
      BEFORE UPDATE ON user_devices
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- ── 7. Seed: default product_access for Identity (free tier) ─────────────────
-- Gives every existing verified user free-tier access to the Identity product.
-- No-op if already seeded.
INSERT INTO product_access (user_id, product_slug, plan, granted_at)
SELECT id, 'identity', 'free', NOW()
FROM users
WHERE email_verified = TRUE OR phone_verified = TRUE
ON CONFLICT DO NOTHING;

-- ── End of migration 20260531_v2_schema ──────────────────────────────────────
-- Next migration: 20260601_v2_1_device_push_tokens.sql
