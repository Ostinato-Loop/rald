-- RALD Production Schema for Supabase
-- Run this in the Supabase SQL editor to set up the production database

-- Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'operator', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Services
CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'unknown' CHECK (status IN ('healthy', 'degraded', 'down', 'deploying', 'unknown')),
  product TEXT NOT NULL,
  url TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT 'v1.0.0',
  region TEXT,
  uptime REAL,
  response_time_ms REAL,
  last_deployed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Credentials
CREATE TABLE IF NOT EXISTS credentials (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  service TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'api_key',
  encrypted_value TEXT NOT NULL,
  masked_value TEXT,
  last_rotated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Deployments
CREATE TABLE IF NOT EXISTS deployments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  service_id TEXT,
  service_name TEXT NOT NULL,
  product TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'production',
  version TEXT NOT NULL DEFAULT 'latest',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'building', 'deploying', 'success', 'failed', 'rolled_back')),
  branch TEXT NOT NULL DEFAULT 'main',
  commit_sha TEXT NOT NULL,
  commit_message TEXT,
  triggered_by TEXT NOT NULL,
  duration TEXT,
  cf_deployment_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  tagline TEXT NOT NULL,
  domain TEXT NOT NULL,
  color TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT 'v1.0.0',
  status TEXT NOT NULL DEFAULT 'coming_soon' CHECK (status IN ('live', 'beta', 'coming_soon', 'maintenance')),
  services_count INTEGER NOT NULL DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  mrr REAL DEFAULT 0,
  url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed admin user (password: rald-admin-2025 — CHANGE IN PRODUCTION)
INSERT INTO users (email, password_hash, name, role) VALUES
  ('admin@rald.cloud', 'pbkdf2:change-this-after-running-setup:placeholder', 'RALD Admin', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Seed products
INSERT INTO products (name, slug, tagline, domain, color, version, status, active_users) VALUES
  ('Loop Business', 'loop-business', 'Commerce infrastructure for African merchants', 'loop.rald.cloud', '#6366F1', 'v1.0.0', 'live', 1240),
  ('PayRald', 'payrald', 'Unified payments and finance layer', 'pay.rald.cloud', '#10B981', 'v1.0.0', 'live', 890),
  ('Loop Dispatch', 'loop-dispatch', 'Last-mile logistics and delivery', 'dispatch.rald.cloud', '#F59E0B', 'v0.9.0', 'beta', 340),
  ('Raldtics', 'raldtics', 'Intelligence and analytics', 'analytics.rald.cloud', '#8B5CF6', 'v0.8.0', 'beta', 120),
  ('Loop Voice', 'loop-voice', 'Communications and SIP infrastructure', 'voice.rald.cloud', '#EC4899', 'v0.7.0', 'beta', 80),
  ('GitRald', 'gitrald', 'Infrastructure governance and CI/CD', 'git.rald.cloud', '#EF4444', 'v0.5.0', 'coming_soon', 0)
ON CONFLICT (slug) DO NOTHING;

-- RLS policies (disable RLS since we use service role key from Worker)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE services DISABLE ROW LEVEL SECURITY;
ALTER TABLE credentials DISABLE ROW LEVEL SECURITY;
ALTER TABLE deployments DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
