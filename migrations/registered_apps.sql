-- RALD Ecosystem — registered_apps schema migration
-- Run in Supabase SQL editor: project onxdcikfttdmnhofsuwo
-- Required for: auth.rald.cloud/sso/exchange, /sso/registry, /sso/apps (source: database)
-- Without this table the system runs on emergency fallback (FALLBACK_APP_IDS)

CREATE TABLE IF NOT EXISTS public.registered_apps (
  app_id       TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  domain       TEXT NOT NULL,
  callback_url TEXT NOT NULL,
  logout_url   TEXT,
  icon         TEXT,
  status       TEXT NOT NULL DEFAULT 'active',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS registered_apps_status_idx
  ON public.registered_apps (status);

-- Row-level security: allow service role full access
ALTER TABLE public.registered_apps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON public.registered_apps
  USING (true)
  WITH CHECK (true);

-- Seed production apps
INSERT INTO public.registered_apps (app_id, name, domain, callback_url, icon, status) VALUES
  ('loop',       'Loop',      'loop.rald.cloud',      'https://loop.rald.cloud/login',     '🎵', 'active'),
  ('messenger',  'Messenger', 'messenger.rald.cloud', 'https://messenger.rald.cloud/auth', '💬', 'active'),
  ('profiles',   'Profiles',  'profiles.rald.cloud',  'https://profiles.rald.cloud',       '👤', 'active'),
  ('rald-inbox', 'Inbox',     'inbox.rald.cloud',     'https://inbox.rald.cloud',          '📥', 'active'),
  ('payrald',    'PayRald',   'pay.rald.cloud',       'https://pay.rald.cloud',            '💳', 'active'),
  ('dunarald',   'DunaRald',  'duna.rald.cloud',      'https://duna.rald.cloud',           '🛒', 'active'),
  ('gitrald',    'GitRald',   'git.rald.cloud',       'https://git.rald.cloud',            '⚙️', 'active'),
  ('raldtics',   'Raldtics',  'analytics.rald.cloud', 'https://analytics.rald.cloud',      '📊', 'active')
ON CONFLICT (app_id) DO NOTHING;

-- Verification query (run after migration):
-- SELECT app_id, name, status FROM public.registered_apps ORDER BY name;
