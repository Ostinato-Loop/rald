-- ═══════════════════════════════════════════════════════════════════
-- RALD ECOSYSTEM — COMPLETE SUPABASE MIGRATION
-- Run in: https://supabase.com/dashboard/project/onxdcikfttdmnhofsuwo/sql/new
-- ═══════════════════════════════════════════════════════════════════

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ─── RALD USERS (main platform accounts) ────────────────────────────────
create table if not exists users (
  id           uuid primary key default uuid_generate_v4(),
  email        text unique not null,
  name         text not null default '',
  password_hash text,
  role         text not null default 'user' check (role in ('user','admin','operator')),
  is_active    boolean not null default true,
  email_verified boolean not null default false,
  avatar_url   text,
  last_login   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_users_email on users(email);

-- ─── REFERRAL CODES ──────────────────────────────────────────────────────
create table if not exists referral_codes (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid references users(id) on delete cascade,
  code         text unique not null,
  max_uses     integer not null default 10,
  use_count    integer not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);
create index if not exists idx_referral_codes_code on referral_codes(code);
create index if not exists idx_referral_codes_user on referral_codes(user_id);

-- ─── REFERRALS ───────────────────────────────────────────────────────────
create table if not exists referrals (
  id               uuid primary key default uuid_generate_v4(),
  referral_code_id uuid references referral_codes(id) on delete set null,
  referee_id       uuid references users(id) on delete cascade,
  status           text not null default 'pending' check (status in ('pending','confirmed','rewarded','expired')),
  rewarded_at      timestamptz,
  created_at       timestamptz not null default now()
);
create index if not exists idx_referrals_code on referrals(referral_code_id);
create index if not exists idx_referrals_referee on referrals(referee_id);

-- ─── WAITLIST ────────────────────────────────────────────────────────────
create table if not exists waitlist (
  id            uuid primary key default uuid_generate_v4(),
  email         text not null,
  name          text not null default '',
  product       text not null default 'rald.cloud',
  referral_code text,
  status        text not null default 'waiting' check (status in ('waiting','approved','rejected')),
  user_id       uuid references users(id) on delete set null,
  approved_at   timestamptz,
  created_at    timestamptz not null default now(),
  unique(email, product)
);
create index if not exists idx_waitlist_email on waitlist(email);
create index if not exists idx_waitlist_status on waitlist(status);
create index if not exists idx_waitlist_product on waitlist(product);

-- ─── SESSIONS ────────────────────────────────────────────────────────────
create table if not exists sessions (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references users(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists idx_sessions_user on sessions(user_id);
create index if not exists idx_sessions_token on sessions(token_hash);

-- ─── PRODUCTS ────────────────────────────────────────────────────────────
create table if not exists products (
  id          uuid primary key default uuid_generate_v4(),
  slug        text unique not null,
  name        text not null,
  description text,
  url         text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
insert into products (slug, name, description, url) values
  ('rald.cloud',  'RALD',          'African digital commerce ecosystem',    'https://rald.cloud'),
  ('loop',        'Loop Business', 'Commerce OS for African merchants',      'https://loop.rald.cloud'),
  ('payrald',     'PayRald',       'Multi-gateway payments infrastructure',  'https://payrald.rald.cloud'),
  ('raldtics',    'Raldtics',      'Real-time analytics platform',          'https://raldtics.rald.cloud'),
  ('dunarald',    'DunaRald',      'Digital entertainment & content',        'https://dunarald.rald.cloud'),
  ('dispatch',    'Loop Dispatch', 'Last-mile delivery infrastructure',      'https://dispatch.rald.cloud'),
  ('voice',       'Loop Voice',    'Voice infrastructure for builders',      'https://voice.rald.cloud'),
  ('messenger',   'Loop Messenger','Secure business communications',         'https://messenger.rald.cloud'),
  ('identity',    'RALD Identity', 'BVN/NIN verification & SSO',            'https://app.rald.cloud'),
  ('gitrald',     'GitRald',       'CI/CD for African software teams',       'https://gitrald.rald.cloud'),
  ('sdk',         'RALD SDK',      'Developer tools & integrations',         'https://sdk.rald.cloud')
on conflict (slug) do nothing;

-- ─── RALD CONTROL CENTER USERS ───────────────────────────────────────────
create table if not exists rald_cc_users (
  id            uuid primary key default uuid_generate_v4(),
  username      text unique not null,
  email         text unique not null,
  password_hash text not null,
  role          text not null default 'viewer' check (role in ('admin','operator','viewer')),
  is_active     boolean not null default true,
  last_login    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─── CONTROL CENTER TABLES ───────────────────────────────────────────────
create table if not exists rald_cc_ai_providers (
  id                  uuid primary key default uuid_generate_v4(),
  name                text not null,
  provider_type       text not null,
  is_active           boolean not null default true,
  api_key_encrypted   text,
  routing_priority    integer not null default 99,
  supported_languages jsonb not null default '["en"]',
  total_tokens_used   bigint not null default 0,
  total_cost_usd      numeric(12,4) not null default 0,
  avg_latency_ms      integer not null default 0,
  request_count       bigint not null default 0,
  failure_count       bigint not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table if not exists rald_cc_ai_models (
  id               uuid primary key default uuid_generate_v4(),
  provider_id      uuid references rald_cc_ai_providers(id) on delete set null,
  model_name       text not null,
  display_name     text,
  capabilities     jsonb not null default '[]',
  language_support jsonb not null default '["en"]',
  context_window   integer not null default 4096,
  avg_cost_per_1k  numeric(10,6) not null default 0,
  avg_latency_ms   integer not null default 0,
  routing_priority integer not null default 99,
  is_active        boolean not null default true,
  health_status    text not null default 'unknown',
  created_at       timestamptz not null default now()
);

create table if not exists rald_cc_github_repos (
  id             uuid primary key default uuid_generate_v4(),
  github_id      text unique not null,
  name           text not null,
  full_name      text not null,
  description    text,
  url            text not null,
  default_branch text not null default 'main',
  is_private     boolean not null default false,
  stars          integer not null default 0,
  forks          integer not null default 0,
  open_issues    integer not null default 0,
  language       text,
  topics         jsonb not null default '[]',
  category       text not null default 'Other',
  is_archived    boolean not null default false,
  last_synced    timestamptz,
  pushed_at      timestamptz,
  created_at     timestamptz not null default now()
);

create table if not exists rald_cc_language_packs (
  id                      uuid primary key default uuid_generate_v4(),
  language_code           text unique not null,
  language_name           text not null,
  is_active               boolean not null default true,
  dialect_count           integer not null default 0,
  slang_entries           integer not null default 0,
  translation_memory_size integer not null default 0,
  voice_accent_count      integer not null default 0,
  accuracy                numeric(5,2) not null default 0,
  last_updated            timestamptz not null default now(),
  created_at              timestamptz not null default now()
);

create table if not exists rald_cc_audit_logs (
  id         uuid primary key default uuid_generate_v4(),
  username   text not null,
  action     text not null,
  resource   text not null,
  ip_address text,
  metadata   jsonb,
  created_at timestamptz not null default now()
);

-- ─── INDEXES & RLS ───────────────────────────────────────────────────────
create index if not exists idx_rald_cc_audit_created on rald_cc_audit_logs(created_at desc);
create index if not exists idx_rald_cc_providers_active on rald_cc_ai_providers(is_active);
create index if not exists idx_rald_cc_repos_category on rald_cc_github_repos(category);

-- Enable RLS on all tables
alter table users enable row level security;
alter table referral_codes enable row level security;
alter table referrals enable row level security;
alter table waitlist enable row level security;
alter table sessions enable row level security;
alter table products enable row level security;
alter table rald_cc_users enable row level security;
alter table rald_cc_ai_providers enable row level security;
alter table rald_cc_ai_models enable row level security;
alter table rald_cc_github_repos enable row level security;
alter table rald_cc_language_packs enable row level security;
alter table rald_cc_audit_logs enable row level security;

-- Service role has full access to everything
create policy if not exists "service_full" on users for all to service_role using (true) with check (true);
create policy if not exists "service_full" on referral_codes for all to service_role using (true) with check (true);
create policy if not exists "service_full" on referrals for all to service_role using (true) with check (true);
create policy if not exists "service_full" on waitlist for all to service_role using (true) with check (true);
create policy if not exists "service_full" on sessions for all to service_role using (true) with check (true);
create policy if not exists "service_full" on products for all to service_role using (true) with check (true);
create policy if not exists "service_full" on rald_cc_users for all to service_role using (true) with check (true);
create policy if not exists "service_full" on rald_cc_ai_providers for all to service_role using (true) with check (true);
create policy if not exists "service_full" on rald_cc_ai_models for all to service_role using (true) with check (true);
create policy if not exists "service_full" on rald_cc_github_repos for all to service_role using (true) with check (true);
create policy if not exists "service_full" on rald_cc_language_packs for all to service_role using (true) with check (true);
create policy if not exists "service_full" on rald_cc_audit_logs for all to service_role using (true) with check (true);

-- Public read for products
create policy if not exists "anon_read" on products for select to anon using (is_active = true);

-- ─── SEED DATA ───────────────────────────────────────────────────────────
insert into rald_cc_ai_providers (name, provider_type, is_active, routing_priority, supported_languages, total_tokens_used, total_cost_usd, request_count)
values
  ('OpenAI',           'openai',    true, 1, '["en","yo","ig","ha","sw"]', 496747,  310.41, 9451),
  ('Anthropic Claude', 'anthropic', true, 2, '["en","yo","ig","ha","sw"]', 4618252, 305.51, 2755),
  ('Google Gemini',    'gemini',    true, 3, '["en","yo","ig","ha","sw"]', 1450019, 327.78, 9760),
  ('DeepSeek',         'deepseek',  true, 4, '["en","yo","ig","ha","sw"]', 4166186, 465.97, 1389),
  ('Whisper',          'whisper',   true, 5, '["en","yo","ig","ha","sw","pcm","tw","am","zu"]', 2807638, 474.90, 5233)
on conflict do nothing;

insert into rald_cc_language_packs (language_code, language_name, is_active, accuracy, dialect_count, slang_entries, voice_accent_count, translation_memory_size)
values
  ('yo','Yoruba',          true,87.3,12,3420,8,6),
  ('ig','Igbo',            true,82.1,8, 2100,5,4),
  ('ha','Hausa',           true,91.5,15,4800,12,8),
  ('sw','Swahili',         true,94.2,20,8900,18,10),
  ('pcm','Nigerian Pidgin',true,78.6,6, 1560,4,3),
  ('tw','Twi',             true,75.4,7, 980, 3,2),
  ('am','Amharic',         true,88.9,11,5200,9,6),
  ('zu','Zulu',            true,83.7,9, 2800,6,5)
on conflict (language_code) do nothing;

-- ═══════════════════════════════════════════════════════════════════
-- AFTER RUNNING THIS SQL:
-- 1. Create admin via: POST https://cc-api.rald.cloud/api/auth/setup-admin
--    Body: {"username":"admin","email":"admin@rald.cloud","password":"<your-password>"}
-- 2. Create RALD API admin via: POST https://api.rald.cloud/api/admin/bootstrap
--    Header: X-Bootstrap-Secret: RALD-Bootstrap-2026-Production-Activate
-- ═══════════════════════════════════════════════════════════════════
