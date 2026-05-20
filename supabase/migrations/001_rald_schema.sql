-- RALD V1 Schema
-- Run this in Supabase SQL Editor

create extension if not exists "pgcrypto";

-- ─── Users ────────────────────────────────────────────────────────────────────
create table if not exists rald_users (
  id           text primary key default 'usr_' || replace(gen_random_uuid()::text, '-', ''),
  phone        text unique not null,
  name         text,
  email        text,
  avatar_url   text,
  role         text not null default 'user',   -- user | admin | developer
  status       text not null default 'active', -- active | suspended | pending
  metadata     jsonb not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists rald_users_phone_idx on rald_users(phone);
create index if not exists rald_users_role_idx  on rald_users(role);

-- ─── OTP Codes ────────────────────────────────────────────────────────────────
create table if not exists rald_otp_codes (
  id         text primary key default gen_random_uuid()::text,
  phone      text not null,
  code       text not null,
  purpose    text not null default 'login',  -- login | signup | reset
  used       boolean not null default false,
  attempts   int not null default 0,
  expires_at timestamptz not null default now() + interval '10 minutes',
  created_at timestamptz not null default now()
);

create index if not exists rald_otp_phone_idx on rald_otp_codes(phone);
create index if not exists rald_otp_expires_idx on rald_otp_codes(expires_at);

-- Auto-expire old OTP codes (cleanup helper)
create or replace function rald_cleanup_otp() returns void language sql as $$
  delete from rald_otp_codes where expires_at < now() - interval '1 hour';
$$;

-- ─── Sessions ─────────────────────────────────────────────────────────────────
create table if not exists rald_sessions (
  id           text primary key default 'sess_' || replace(gen_random_uuid()::text, '-', ''),
  user_id      text not null references rald_users(id) on delete cascade,
  token_hash   text not null unique,  -- SHA-256 of the JWT token
  device       text,
  browser      text,
  os           text,
  ip           text,
  location     text,
  user_agent   text,
  last_active  timestamptz not null default now(),
  expires_at   timestamptz not null default now() + interval '30 days',
  revoked      boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists rald_sessions_user_idx    on rald_sessions(user_id);
create index if not exists rald_sessions_hash_idx    on rald_sessions(token_hash);
create index if not exists rald_sessions_expires_idx on rald_sessions(expires_at);

-- ─── API Keys ─────────────────────────────────────────────────────────────────
create table if not exists rald_api_keys (
  id         text primary key default 'key_' || replace(gen_random_uuid()::text, '-', ''),
  user_id    text not null references rald_users(id) on delete cascade,
  name       text not null,
  key_hash   text not null unique,   -- SHA-256 of the actual key
  key_prefix text not null,          -- first 12 chars shown in UI
  env        text not null default 'live',  -- live | test
  scopes     text[] not null default '{}',
  last_used  timestamptz,
  expires_at timestamptz,
  revoked    boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists rald_api_keys_user_idx on rald_api_keys(user_id);
create index if not exists rald_api_keys_hash_idx on rald_api_keys(key_hash);

-- ─── OAuth Clients ────────────────────────────────────────────────────────────
create table if not exists rald_oauth_clients (
  id            text primary key default 'cli_' || replace(gen_random_uuid()::text, '-', ''),
  owner_id      text not null references rald_users(id) on delete cascade,
  name          text not null,
  description   text,
  logo_url      text,
  secret_hash   text not null,
  redirect_uris text[] not null default '{}',
  scopes        text[] not null default '{}',
  verified      boolean not null default false,
  status        text not null default 'active',
  metadata      jsonb not null default '{}',
  created_at    timestamptz not null default now()
);

create index if not exists rald_oauth_clients_owner_idx on rald_oauth_clients(owner_id);

-- ─── OAuth Authorization Codes ────────────────────────────────────────────────
create table if not exists rald_oauth_codes (
  id           text primary key default gen_random_uuid()::text,
  client_id    text not null references rald_oauth_clients(id) on delete cascade,
  user_id      text not null references rald_users(id) on delete cascade,
  code         text not null unique,
  redirect_uri text not null,
  scopes       text[] not null default '{}',
  code_challenge      text,
  code_challenge_method text,
  used         boolean not null default false,
  expires_at   timestamptz not null default now() + interval '10 minutes',
  created_at   timestamptz not null default now()
);

-- ─── OAuth Access Tokens ──────────────────────────────────────────────────────
create table if not exists rald_oauth_tokens (
  id            text primary key default 'tok_' || replace(gen_random_uuid()::text, '-', ''),
  client_id     text not null references rald_oauth_clients(id) on delete cascade,
  user_id       text not null references rald_users(id) on delete cascade,
  token_hash    text not null unique,
  refresh_hash  text unique,
  scopes        text[] not null default '{}',
  expires_at    timestamptz not null default now() + interval '1 hour',
  revoked       boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists rald_oauth_tokens_user_idx on rald_oauth_tokens(user_id);

-- ─── Wallet ───────────────────────────────────────────────────────────────────
create table if not exists rald_wallets (
  id          text primary key default 'wal_' || replace(gen_random_uuid()::text, '-', ''),
  user_id     text not null unique references rald_users(id) on delete cascade,
  balance     bigint not null default 0,   -- stored in kobo (smallest unit)
  available   bigint not null default 0,
  escrow      bigint not null default 0,
  frozen      bigint not null default 0,
  currency    text not null default 'NGN',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists rald_transactions (
  id         text primary key default 'txn_' || replace(gen_random_uuid()::text, '-', ''),
  user_id    text not null references rald_users(id) on delete cascade,
  wallet_id  text not null references rald_wallets(id),
  type       text not null,   -- credit | debit | escrow | release
  amount     bigint not null, -- in kobo
  balance_after bigint not null,
  description text not null,
  reference  text unique,
  status     text not null default 'completed',
  metadata   jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists rald_txn_user_idx on rald_transactions(user_id);
create index if not exists rald_txn_created_idx on rald_transactions(created_at desc);

-- ─── Audit Logs ───────────────────────────────────────────────────────────────
create table if not exists rald_audit_logs (
  id         text primary key default gen_random_uuid()::text,
  user_id    text references rald_users(id) on delete set null,
  action     text not null,    -- otp.sent | otp.verified | session.created | session.revoked | key.created | key.revoked | oauth.authorized | oauth.denied
  resource   text,
  ip         text,
  user_agent text,
  metadata   jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists rald_audit_user_idx    on rald_audit_logs(user_id);
create index if not exists rald_audit_action_idx  on rald_audit_logs(action);
create index if not exists rald_audit_created_idx on rald_audit_logs(created_at desc);

-- ─── Row-Level Security ───────────────────────────────────────────────────────
alter table rald_users        enable row level security;
alter table rald_otp_codes    enable row level security;
alter table rald_sessions     enable row level security;
alter table rald_api_keys     enable row level security;
alter table rald_oauth_clients enable row level security;
alter table rald_oauth_codes  enable row level security;
alter table rald_oauth_tokens enable row level security;
alter table rald_wallets      enable row level security;
alter table rald_transactions enable row level security;
alter table rald_audit_logs   enable row level security;

-- Service role bypasses RLS (worker uses service key)
-- All policies below are for completeness; the CF Worker uses service_role

-- Users can read their own data
create policy "users_self_read"  on rald_users    for select using (true);
create policy "sessions_self"    on rald_sessions  for all    using (true);
create policy "api_keys_self"    on rald_api_keys  for all    using (true);
create policy "wallets_self"     on rald_wallets   for all    using (true);
create policy "txns_self"        on rald_transactions for all using (true);
create policy "audit_service"    on rald_audit_logs  for all using (true);
create policy "otp_service"      on rald_otp_codes   for all using (true);
create policy "oauth_clients"    on rald_oauth_clients for all using (true);
create policy "oauth_codes"      on rald_oauth_codes   for all using (true);
create policy "oauth_tokens"     on rald_oauth_tokens  for all using (true);
