import { Hono } from "hono";
import type { Bindings, Variables } from "../index";
import { hashPassword } from "../lib/auth";
import { sendWelcomeEmail } from "../lib/email";

const admin = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const SCHEMA_SQL = `
-- RALD Production Schema v1.1 — auto-migrate
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT NOT NULL UNIQUE,
  phone TEXT UNIQUE,
  password_hash TEXT NOT NULL DEFAULT '',
  name TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin','operator','viewer','user','merchant')),
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS users_email_idx ON users (email);
CREATE INDEX IF NOT EXISTS users_role_idx ON users (role);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'unknown' CHECK (status IN ('healthy','degraded','down','deploying','unknown')),
  product TEXT NOT NULL, url TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT 'v1.0.0', region TEXT,
  uptime REAL, response_time_ms REAL,
  last_deployed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS credentials (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL, service TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'api_key',
  encrypted_value TEXT NOT NULL, masked_value TEXT,
  last_rotated_at TIMESTAMPTZ, expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deployments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  service_id TEXT, service_name TEXT NOT NULL,
  product TEXT NOT NULL, environment TEXT NOT NULL DEFAULT 'production',
  version TEXT NOT NULL DEFAULT 'latest',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','building','deploying','success','failed','rolled_back')),
  branch TEXT NOT NULL DEFAULT 'main', commit_sha TEXT NOT NULL,
  commit_message TEXT, triggered_by TEXT NOT NULL,
  duration TEXT, cf_deployment_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
  tagline TEXT NOT NULL, domain TEXT NOT NULL,
  color TEXT NOT NULL, version TEXT NOT NULL DEFAULT 'v1.0.0',
  status TEXT NOT NULL DEFAULT 'coming_soon' CHECK (status IN ('live','beta','coming_soon','maintenance')),
  services_count INTEGER NOT NULL DEFAULT 0,
  active_users INTEGER DEFAULT 0, mrr REAL DEFAULT 0, url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS otps (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  phone TEXT, email TEXT, pin_id TEXT, code_hash TEXT,
  type TEXT NOT NULL DEFAULT 'sms' CHECK (type IN ('sms','email','password_reset')),
  used BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS otps_email_idx ON otps (email) WHERE used = FALSE;
CREATE INDEX IF NOT EXISTS otps_expires_idx ON otps (expires_at);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE, user_agent TEXT, ip_address TEXT,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ, expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days')
);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);

CREATE TABLE IF NOT EXISTS waitlist (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT NOT NULL,
  name TEXT,
  product TEXT NOT NULL DEFAULT 'rald.cloud',
  referral_code TEXT,
  approved BOOLEAN NOT NULL DEFAULT FALSE,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(email, product)
);
CREATE INDEX IF NOT EXISTS waitlist_email_idx ON waitlist (email);
CREATE INDEX IF NOT EXISTS waitlist_product_idx ON waitlist (product);

ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE services DISABLE ROW LEVEL SECURITY;
ALTER TABLE credentials DISABLE ROW LEVEL SECURITY;
ALTER TABLE deployments DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE otps DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist DISABLE ROW LEVEL SECURITY;
`;

const SEED_PRODUCTS = [
  { slug: "loop", name: "Loop", tagline: "Social commerce for Africa", domain: "loop.rald.cloud", color: "#22C55E", status: "live", url: "https://loop.rald.cloud" },
  { slug: "payrald", name: "PayRald", tagline: "Digital payments & wallets", domain: "payrald.rald.cloud", color: "#1A3A8F", status: "coming_soon", url: "https://payrald.rald.cloud" },
  { slug: "raldtics", name: "Raldtics", tagline: "Real-time analytics", domain: "raldtics.rald.cloud", color: "#EAB308", status: "coming_soon", url: "https://raldtics.rald.cloud" },
  { slug: "dunarald", name: "DunaRald", tagline: "Entertainment & streaming", domain: "dunarald.rald.cloud", color: "#A855F7", status: "coming_soon", url: "https://dunarald.rald.cloud" },
  { slug: "dispatch", name: "Loop Dispatch", tagline: "Last-mile logistics", domain: "dispatch.rald.cloud", color: "#3B82F6", status: "coming_soon", url: "https://dispatch.rald.cloud" },
  { slug: "messenger", name: "Loop Messenger", tagline: "Business communications", domain: "messenger.rald.cloud", color: "#F97316", status: "live", url: "https://messenger.rald.cloud" },
  { slug: "identity", name: "RALD Identity", tagline: "Unified auth & KYC", domain: "app.rald.cloud", color: "#2ECFA3", status: "live", url: "https://app.rald.cloud" },
  { slug: "gitrald", name: "GitRald", tagline: "Deployment governance", domain: "admin.rald.cloud", color: "#EF4444", status: "beta", url: "https://admin.rald.cloud" },
  { slug: "rald-sdk", name: "RALD SDK", tagline: "Platform SDK", domain: "sdk.rald.cloud", color: "#06B6D4", status: "beta", url: "https://rald.cloud/sdk" },
  { slug: "control-center", name: "RALD Control Center", tagline: "Ecosystem governance", domain: "control.rald.cloud", color: "#8B5CF6", status: "live", url: "https://control.rald.cloud" },
];

// ── POST /api/admin/bootstrap ── Protected schema migration + admin creation
admin.post("/bootstrap", async (c) => {
  const secret = c.req.header("X-Bootstrap-Secret");
  if (!secret || secret !== c.env.BOOTSTRAP_SECRET) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const db = c.get("db");
  const results: Record<string, unknown> = {};

  // Run schema migrations via Supabase RPC (if function exists)
  try {
    const { error: migErr } = await db.rpc("exec_sql", { sql: SCHEMA_SQL });
    results.migration = migErr ? { warning: migErr.message } : { ok: true };
  } catch (e) {
    results.migration = { warning: "exec_sql RPC not available — run schema manually" };
  }

  // Seed products (upsert)
  const { error: prodErr } = await db.from("products").upsert(SEED_PRODUCTS, { onConflict: "slug" });
  results.products = prodErr ? { error: prodErr.message } : { seeded: SEED_PRODUCTS.length };

  // Check if admin exists
  const { data: existing } = await db.from("users").select("id,email").eq("role", "admin").limit(1);
  results.admin_exists = (existing?.length ?? 0) > 0 ? existing?.[0]?.email : false;

  return c.json({ ok: true, timestamp: new Date().toISOString(), results });
});

// ── POST /api/admin/create-admin ── Create super admin user
admin.post("/create-admin", async (c) => {
  const secret = c.req.header("X-Bootstrap-Secret");
  if (!secret || secret !== c.env.BOOTSTRAP_SECRET) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json().catch(() => null) as { email?: string; name?: string; password?: string } | null;
  if (!body?.email || !body?.name || !body?.password) {
    return c.json({ error: "email, name, and password required" }, 400);
  }
  if (body.password.length < 8) {
    return c.json({ error: "Admin password must be at least 8 characters" }, 400);
  }

  const db = c.get("db");
  const { data: existing } = await db.from("users").select("id").eq("role", "admin").limit(1);
  if (existing && existing.length > 0) {
    return c.json({ error: "Admin already exists. Use update-admin to change credentials." }, 409);
  }

  const password_hash = await hashPassword(body.password);
  const { data: newUser, error } = await db.from("users")
    .insert({ email: body.email.trim().toLowerCase(), name: body.name, password_hash, role: "admin", email_verified: true })
    .select("id,email,name,role,created_at").single();

  if (error) return c.json({ error: error.message }, 500);

  if (c.env.RESEND_API_KEY) {
    try { await sendWelcomeEmail(body.email, body.name, c.env.RESEND_API_KEY); } catch {}
  }

  return c.json({ ok: true, admin: { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role } }, 201);
});

// ── POST /api/admin/approve-waitlist ── Approve waitlist entry → create user
admin.post("/approve-waitlist/:id", async (c) => {
  const secret = c.req.header("X-Bootstrap-Secret");
  if (!secret || secret !== c.env.BOOTSTRAP_SECRET) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const db = c.get("db");
  const { data: entry } = await db.from("waitlist").select("*").eq("id", c.req.param("id")).single();
  if (!entry) return c.json({ error: "Waitlist entry not found" }, 404);

  // Generate temp password
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  const tempPassword = Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => chars[b % chars.length]).join("");
  const password_hash = await hashPassword(tempPassword);

  const { data: user, error } = await db.from("users").upsert({
    email: entry.email, name: entry.name ?? "RALD User", password_hash,
    role: "user", email_verified: true
  }, { onConflict: "email" }).select("id,email").single();
  if (error) return c.json({ error: error.message }, 500);

  await db.from("waitlist").update({ approved: true, approved_at: new Date().toISOString() }).eq("id", entry.id);

  if (c.env.RESEND_API_KEY) {
    const { sendWaitlistApprovedEmail } = await import("../lib/email");
    try { await sendWaitlistApprovedEmail(entry.email, entry.name ?? "Friend", tempPassword, c.env.RESEND_API_KEY); } catch {}
  }

  return c.json({ ok: true, user: { id: user.id, email: user.email, tempPassword } });
});

export default admin;
