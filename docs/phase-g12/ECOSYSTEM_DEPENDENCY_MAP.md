# RALD Ecosystem — Complete Dependency Map
**Generated:** 2026-06-03 | **Scope:** Ostinato-Loop GitHub Org | **Owner:** LILCKY STUDIO LIMITED  
**Cloudflare Account:** `d5a1cd03b76f467430034af64a7062fd` | **Zone:** `rald.cloud` | **CF Subdomain:** `ideamack`

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              USER BROWSER                                           │
└────────────┬────────────────────┬───────────────────────┬──────────────────────────┘
             │                    │                        │
    profiles.rald.cloud    loop.rald.cloud       messenger.rald.cloud
    [rald-auth-ui]         [loop frontend]        [loop-messenger SPA]
    CF Pages               CF Pages               CF Pages
             │                    │                        │
             ▼                    ▼                        ▼
    auth.rald.cloud        loop-api.rald.cloud    messenger.rald.cloud
    [rald-auth]            [loop-api]             [loop-messenger-api]
    CF Worker              CF Worker              CF Worker
             │                    │   ╲                    │
             │                    │    ╲       ┌───────────┤
             └──────────┬─────────┘     ╲      │           │
                        │                ╲     ▼           ▼
                   Supabase            realtime.rald.cloud  notification.rald.cloud
              [onxdcikfttdmnhofsuwo]   [rald-realtime]      [rald-notify]
                   PostgreSQL           CF Worker            CF Worker
                        │                                    │
                        │             search.rald.cloud      │
                        │             [rald-search]          │
                        │             CF Worker              │
                        │                                    │
                        │             inbox.rald.cloud   ────┘
                        │             [rald-inbox]
                        │             CF Worker
                        │
              rald.cloud/api/*
              [rald-cloud-edge]  ← SSR for product subdomains
              CF Worker
```

---

## 1. FRONTEND LAYER

### Production Deployed Frontends

| # | Product | Live Domain | Repo | Dir | Framework | CF Project | Status |
|---|---------|------------|------|-----|-----------|------------|--------|
| F1 | **RALD Identity Hub** | `profiles.rald.cloud` | `rald-auth-ui` | `/` | React 18 + Vite + Wouter | `rald-auth-ui` | ✅ Live |
| F2 | **Loop** | `loop.rald.cloud` | `loop` | `artifacts/loop/` | React 18 + Vite + react-router-dom | `loop` | ✅ Live |
| F3 | **Messenger** | `messenger.rald.cloud` | `messenger` | `artifacts/loop-messenger/` | React 18 + Vite + Wouter + TanStack Query | `loop-messenger` | ✅ Live |
| F4 | **RALD Cloud / Marketing** | `rald.cloud` | `rald-cloud-web` | `artifacts/rald-cloud/` | React + Vite | (Pages) | ⚠️ 159h stale |
| F5 | **Control Center** | `control.rald.cloud` | `rald-control-center` | `apps/web/` | React + Vite + Wouter + TanStack Query | (Pages) | ⚠️ 87h stale |

### Frontend Environment Variables (Build-time Baked)

```
F1 — rald-auth-ui
  VITE_AUTH_API_URL  = "https://auth.rald.cloud"
  VITE_APP_NAME      = "RALD"

F2 — loop (loop.rald.cloud)
  VITE_API_BASE_URL  = "https://loop-api.rald.cloud"   ← confirmed in deployed bundle
  VITE_RALD_AUTH_URL = "https://profiles.rald.cloud"   ← confirmed in deployed bundle

F3 — messenger (messenger.rald.cloud)
  VITE_API_URL           = (set in CF Pages env vars — not in repo)
  VITE_SUPABASE_URL      = "https://onxdcikfttdmnhofsuwo.supabase.co"
  VITE_SUPABASE_ANON_KEY = (GitHub secret: VITE_SUPABASE_PUBLISHABLE_KEY)

F5 — rald-control-center
  VITE_API_URL = "https://cc-api.rald.cloud"
```

### Design-Only Frontends (Not Deployed — Lovable/gpt-engineer-app[bot])

All use `tanstack_start_ts` template. No backend, no CI, no live domain.

| Repo | Product | Last Commit | Age |
|------|---------|------------|-----|
| `rald-ai-ui-ux` | RALD AI | "Added guest mode tracking" | −4.9h (today) |
| `rald-tv-ui-ux` | RALD TV | "Wove Flywheel into pages" | −4.0h (today) |
| `loop-audio-ui-ux` | Loop Audio | "Implemented room and profile features" | −3.4h (today) |
| `loop-messenger-ui-ux` | Loop Messenger (design) | "Showed 4 message states" | −0.9h (today) |
| `gitrald-ui-ux` | GitRald | "Added full app suite & shell" | 19.9h |
| `rald-mail-ui-ux` | RALD Mail | "Added Vault, Guard & desktop UI" | 20.7h |
| `rald-dispatch-ui-ux` | RALD Dispatch | "Added dispute, channels, split" | 21.3h |
| `payrald-ui-ux` | PayRald | "Added RALD auth & screens" | 22.3h |
| `rald-memories-ui-ux` | RALD Memories | "Added Settings & Upload preview" | 42.8h |
| `waiting-room` | Brand reference | brand token update | 176h |

---

## 2. BACKEND LAYER

### Cloudflare Workers (Production)

#### B1 — `auth.rald.cloud` → Worker: `rald-auth`
**Repo:** `rald-auth-core` | **Version:** 2.1.0

```
Routes:   auth.rald.cloud/*
Runtime:  Cloudflare Workers (Hono framework)

Route modules:
  /auth/*       → src/routes/auth.ts       OTP send/verify, password login/register
  /sso/*        → src/routes/sso.ts        SSO exchange, registry, app verification
  /session/*    → src/routes/session.ts    Session broker (RALD_SESSION_KV)
  /profiles/*   → src/routes/profiles.ts   User profile management
  /devices/*    → src/routes/devices.ts    Device registration
  /provision/*  → src/routes/provision.ts  Account provisioning
  /clerk/*      → src/routes/clerk.ts      Legacy Clerk bridge (deprecated)

KV Bindings:
  RATE_LIMIT_KV    — per-phone, per-IP, per-email rate limits
  RALD_SESSION_KV  — session store / token broker

Supabase tables used:
  auth_users, auth_sessions, audit_log, registered_apps,
  devices, profiles, otp_sessions

Secrets:
  RALD_JWT_SECRET           ← CRITICAL shared secret — signs all RALD JWTs
  SUPABASE_SERVICE_ROLE_KEY ← Supabase admin access
  TERMII_API_KEY            ← SMS OTP delivery
  TERMII_SENDER_ID          ← SMS sender name (currently "RALD" — NOT registered in Termii ⚠️)
  RESEND_API_KEY            ← Email OTP delivery
  CLERK_SECRET_KEY          ← Legacy (clerk:false in readiness check)
  CLERK_PUBLISHABLE_KEY     ← Legacy
```

---

#### B2 — `loop-api.rald.cloud` → Worker: `loop-api`
**Repo:** `loop` | `artifacts/cloudflare-worker/`

```
Routes:   loop-api.rald.cloud/*  [env.production]
Runtime:  Cloudflare Workers (Hono + nodejs_compat)

Route modules:
  /api/health/*        → health check
  /api/auth/*          → OTP auth, RALD SSO exchange
  /api/auth/rald-sso   → POST: verify RALD JWT → issue Loop JWT
  /api/trending/*      → trending content
  /api/rooms/*         → room management (Durable Objects)

CF Bindings:
  DB          — D1 database "loop-db" (id: 4616fcac-96e0-4150-a42f-3d020f45cd1d)
  CACHE       — KV namespace (id: 3c71da01b3174d6c9353adbfde7491a3) — sessions, OTP, rate limits
  MEDIA       — R2 bucket "loop-media"
  TASK_QUEUE  — Queue "loop-tasks" (producer + consumer, batch=10, timeout=5s)
  ROOM_SESSION — Durable Object: RoomSession (SQLite, migration tag v1)
  AI          — Workers AI binding

Vars (production):
  ENVIRONMENT   = "production"
  SUPABASE_URL  = "https://onxdcikfttdmnhofsuwo.supabase.co"
  CORS_ORIGIN   = "https://loop.rald.cloud,https://loop.ostinato-loop.pages.dev"
  RALD_AUTH_URL = "https://auth.rald.cloud"

Secrets:
  SUPABASE_SERVICE_ROLE_KEY — Supabase admin
  TERMII_API_KEY            — SMS OTP (loop-native phone login)
  TERMII_SENDER_ID          — SMS sender (currently broken — "Failed to send OTP" ⚠️)
  LOOP_JWT_SECRET           — Signs Loop-native JWTs (not shared with other services)
  RALD_JWT_SECRET           ← CRITICAL shared secret — verifies RALD SSO tokens
  OPENROUTER_API_KEY        — AI/LLM features
```

---

#### B3 — `messenger.rald.cloud` → Worker: `loop-messenger-api`
**Repo:** `messenger` | `workers/loop-messenger-api/`

```
Routes:   messenger.rald.cloud/*
Runtime:  Cloudflare Workers
Account:  d5a1cd03b76f467430034af64a7062fd

Outbound calls to:
  RALD_AUTH_URL  = "https://auth.rald.cloud"   — JWT validation
  NOTIFY_URL     = "https://notification.rald.cloud"
  SEARCH_URL     = "https://search.rald.cloud"
  INBOX_URL      = "https://inbox.rald.cloud"
  CRM_URL        = "https://crm.rald.cloud"    — ⚠️ crm.rald.cloud NOT deployed
  SUPABASE_URL   = "https://onxdcikfttdmnhofsuwo.supabase.co"

Secrets:
  RALD_JWT_SECRET           ← CRITICAL — verifies RALD SSO tokens for /auth/rald-sso
  SUPABASE_SERVICE_ROLE_KEY — Supabase admin

CORS allows:
  (not explicitly listed — accepts rald.cloud origins from RALD auth headers)
```

---

#### B4 — `realtime.rald.cloud` → Worker: `rald-realtime`
**Repo:** `rald-realtime` | **Version:** 1.0.0

```
Routes:   realtime.rald.cloud/*
Runtime:  Cloudflare Workers (Hono)
Providers: Cloudflare RealtimeKit (P1) → LiveKit (P2) → Tencent TRTC (P3)

Route modules:
  /rooms/*     — room lifecycle management
  /calls/*     — call signaling
  /health/*    — health + provider state
  /analytics/* — usage analytics

KV Bindings:
  RATE_LIMIT_KV    — rate limiting
  HEALTH_KV        — health state
  PROVIDER_STATE_KV — active provider routing state

CORS allows:
  rald.cloud, app.rald.cloud, loop.rald.cloud, messenger.rald.cloud,
  business.rald.cloud, realtime.rald.cloud, profiles.rald.cloud,
  sv.rald.cloud, localhost:5173, localhost:3000

Secrets:
  SUPABASE_SERVICE_ROLE_KEY
  RALD_JWT_SECRET     ← WARNING: deploy.yml has WARNING (not exit 1) if missing
  TENCENT_SDK_APP_ID  — Tencent TRTC (P3 provider)
  TENCENT_SECRET_KEY
  CALLS_APP_SECRET    — CF Calls/RealtimeKit
```

---

#### B5 — `search.rald.cloud` → Worker: `rald-search`
**Repo:** `rald-search` | **Version:** 1.0.0

```
Routes:   search.rald.cloud/*
Runtime:  Cloudflare Workers (Hono)
Providers: Postgres/Supabase (primary) → Meilisearch (optional) → OpenSearch (optional)

Route modules:
  /search/*           — full-text search
  /saved-searches/*   — saved search management
  /recent-searches/*  — recent searches
  /index-management/* — index admin

KV Bindings:
  RATE_LIMIT_KV

Secrets:
  SUPABASE_URL (org secret)
  SUPABASE_SERVICE_ROLE_KEY (org secret)
  RALD_JWT_SECRET     ← WARNING: deploy.yml has WARNING if missing
  MEILISEARCH_HOST    — optional
  MEILISEARCH_API_KEY — optional
```

---

#### B6 — `inbox.rald.cloud` → Worker: `rald-inbox`
**Repo:** `rald-inbox` | **Version:** 1.0.0

```
Routes:   inbox.rald.cloud/*
Runtime:  Cloudflare Workers (Hono)

Route modules:
  /api/conversations/* — conversation management
  /api/messages/*      — message threads
  /api/assignments/*   — agent assignment
  /api/tags/*          — conversation tagging
  /api/views/*         — inbox views
  /api/sla/*           — SLA management + alerts
  /api/analytics/*     — inbox analytics
  /api/audit/*         — audit log

Outbound calls:
  NOTIFICATION_SERVICE_URL = "https://notification.rald.cloud"
  SEARCH_SERVICE_URL       = "https://search.rald.cloud"

CORS allows:
  loop-business.rald.cloud, app.rald.cloud, rald.cloud

Secrets:
  SUPABASE_URL (org secret)
  SUPABASE_SERVICE_ROLE_KEY (org secret)
  RALD_JWT_SECRET     ← WARNING: deploy.yml has WARNING if missing
```

---

#### B7 — `notification.rald.cloud` → Worker: `rald-notify`
**Repo:** `rald-notify` | **Version:** 1.0.0

```
Routes:   notification.rald.cloud/*
Runtime:  Cloudflare Workers (Hono)

Route modules:
  /notifications/*  — notification delivery
  /templates/*      — notification templates
  /preferences/*    — user notification preferences
  /channels/*       — channel configuration (email, SMS, push)
  /deliveries/*     — delivery tracking
  /events/*         — event-driven notifications
  /audit/*          — audit log

CORS allows:
  rald.cloud, app.rald.cloud, admin.rald.cloud, control.rald.cloud,
  business.rald.cloud, messenger.rald.cloud, loop.rald.cloud,
  pay.rald.cloud, dispatch.rald.cloud, localhost:5173, localhost:3000, localhost:5174

Secrets:
  SUPABASE_URL (org secret)
  SUPABASE_SERVICE_ROLE_KEY (org secret)
  RALD_JWT_SECRET     ← WARNING: deploy.yml has WARNING if missing
  RESEND_API_KEY      — email notifications
  TERMII_API_KEY      — SMS notifications (optional)
  VAPID_PUBLIC_KEY    — web push notifications
  VAPID_PRIVATE_KEY
  VAPID_SUBJECT
```

---

#### B8 — `rald.cloud/api/*` + product subdomains → Worker: `rald-cloud-edge`
**Repo:** `rald-cloud-web` | `artifacts/cf-worker/` | **Version:** 1.1.0

```
Routes (all on zone: rald.cloud):
  rald.cloud/api/*          — RALD platform API gateway
  payrald.rald.cloud/*      — PayRald SSR for Googlebot
  raldtics.rald.cloud/*     — Raldtics SSR for Googlebot
  dunarald.rald.cloud/*     — DunaRald SSR for Googlebot
  dispatch.rald.cloud/*     — RALD Dispatch SSR
  voice.rald.cloud/*        — RALD Voice SSR
  business.rald.cloud/*     — Loop Business SSR
  silicon.rald.cloud/*      — RALD Silicon SSR

No secret dependencies documented.
```

---

#### B9 — `cc-api.rald.cloud` + `api.control.rald.cloud` → Worker: `rald-control-center-api`
**Repo:** `rald-control-center` | `apps/api/`

```
Routes:
  api.control.rald.cloud/*
  cc-api.rald.cloud/*

CF Bindings:
  DB — D1 "rald-control-center-db" (id: a904867c-083d-40b5-a230-12e2be0ac771)

Runtime: Hono + jose + Supabase
Last deployed: 87h ago ⚠️
```

---

#### B10 — `credentials.rald.cloud` → Kong Konnect Serverless
```
Domain:   credentials.rald.cloud (CNAME, NOT Cloudflare proxied)
Service:  Kong Konnect Serverless (external — not in any repo)
Purpose:  API gateway / credential management
CRITICAL: Never proxy credentials.rald.cloud through Cloudflare
```

---

## 3. DATABASE LAYER

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Supabase — project: onxdcikfttdmnhofsuwo.supabase.co                           │
│                                                                                 │
│  Tables (confirmed):                                                            │
│    auth_users          ← rald-auth-core (login, register, OTP)                 │
│    auth_sessions       ← rald-auth-core (session tracking)                     │
│    audit_log           ← rald-auth-core (all auth events)                      │
│    registered_apps     ← ⚠️ MISSING — migration in rald/migrations/            │
│    devices             ← rald-auth-core (device registration)                  │
│    profiles            ← rald-auth-core (user profiles)                        │
│                                                                                 │
│  Consumers (all use SUPABASE_SERVICE_ROLE_KEY):                                 │
│    rald-auth-core  →  auth_users, auth_sessions, audit_log, registered_apps    │
│    loop-api        →  Supabase via service role (supplementary to D1)           │
│    messenger       →  messaging data                                            │
│    rald-realtime   →  room/session state                                        │
│    rald-search     →  indexed content (PostgreSQL search provider)              │
│    rald-inbox      →  conversation/message data                                 │
│    rald-notify     →  notification preferences, delivery tracking               │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│  Cloudflare D1 Databases                                                        │
│                                                                                 │
│  "loop-db"                 id: 4616fcac-96e0-4150-a42f-3d020f45cd1d            │
│    Consumer: loop-api      binding: DB                                          │
│    Content:  Loop primary data (posts, rooms, users, sessions)                  │
│                                                                                 │
│  "rald-control-center-db"  id: a904867c-083d-40b5-a230-12e2be0ac771            │
│    Consumer: rald-control-center-api   binding: DB                              │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│  Cloudflare KV Namespaces                                                       │
│                                                                                 │
│  RATE_LIMIT_KV (rald-auth)    binding: RATE_LIMIT_KV — ⚠️ placeholder ID       │
│  RALD_SESSION_KV (rald-auth)  binding: RALD_SESSION_KV — ⚠️ placeholder ID     │
│  3c71da01...   (loop-api)     binding: CACHE — sessions, OTP, rate limits       │
│  RATE_LIMIT_KV (rald-realtime) — ⚠️ placeholder ID                             │
│  HEALTH_KV     (rald-realtime) — ⚠️ placeholder ID                             │
│  PROVIDER_STATE_KV (realtime) — ⚠️ placeholder ID                              │
│  RATE_LIMIT_KV (rald-search)  — ⚠️ placeholder ID                              │
│  RATE_LIMIT_KV (rald-inbox)   — ⚠️ placeholder ID                              │
│  RATE_LIMIT_KV (rald-notify)  — ⚠️ placeholder ID                              │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│  Cloudflare R2 Buckets                                                          │
│  "loop-media"   binding: MEDIA   consumer: loop-api                             │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│  Cloudflare Durable Objects                                                     │
│  RoomSession  (SQLite, migration v1)  consumer: loop-api  binding: ROOM_SESSION │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. AUTH DEPENDENCY TREE

```
RALD_JWT_SECRET  ← THE SINGLE MOST CRITICAL SECRET IN THE ECOSYSTEM
│
├── SIGNS:    rald-auth-core (every RALD JWT issued at auth.rald.cloud)
│
└── VERIFIES:
    ├── loop-api              /api/auth/rald-sso      (RALD token → Loop JWT)
    ├── loop-messenger-api    /auth/rald-sso           (RALD token → Messenger session)
    ├── rald-realtime         authMiddleware            (protect all realtime endpoints)
    ├── rald-search           authMiddleware            (protect search endpoints)
    ├── rald-inbox            authMiddleware            (protect inbox endpoints)
    └── rald-notify           authMiddleware            (protect notification endpoints)

LOOP_JWT_SECRET  ← Loop-internal only
│
├── SIGNS:    loop-api (loop-native login and RALD SSO result)
└── VERIFIES: loop-api only (never leaves loop-api)

SUPABASE_SERVICE_ROLE_KEY  ← Org-level secret, shared across 7 workers
│
└── Used by: rald-auth-core, loop-api, messenger, rald-realtime,
             rald-search, rald-inbox, rald-notify
```

### Full SSO Token Lifecycle

```
STEP 1 — Identity Verification
  User at profiles.rald.cloud
  ├── Phone path: POST auth.rald.cloud/auth/send-otp
  │     → Termii sends SMS OTP (⚠️ BROKEN: sender "RALD" not registered)
  └── Email path: POST auth.rald.cloud/auth/send-login-email-otp
        → Resend sends email OTP (✅ working per /ready check)

STEP 2 — OTP Verification
  POST auth.rald.cloud/auth/verify-otp (phone)
  POST auth.rald.cloud/auth/verify-login-email-otp (email)
  → Returns: { token: RALD_MASTER_JWT (signed with RALD_JWT_SECRET), user: {...} }
  → Stored in: localStorage["rald_token"] at profiles.rald.cloud

STEP 3 — SSO Exchange (app-scoped token)
  POST auth.rald.cloud/sso/exchange { appId: "loop" }
  Headers: Authorization: Bearer RALD_MASTER_JWT
  → Validates RALD_MASTER_JWT with RALD_JWT_SECRET
  → Checks appId against registered_apps table (fallback to hardcoded list)
  → Returns: { token: APP_SCOPED_JWT (1hr TTL), appId: "loop" }
  → Stored in: localStorage["rald_master_token"] at loop.rald.cloud

STEP 4 — Loop Login Callback
  Browser: loop.rald.cloud/login?rald_token=APP_SCOPED_JWT&app_id=loop
  POST loop-api.rald.cloud/api/auth/rald-sso { rald_token: APP_SCOPED_JWT }
  → Validates APP_SCOPED_JWT with RALD_JWT_SECRET (⚠️ UNCONFIRMED if secret set)
  → Upserts user in Supabase
  → Returns: { access_token: LOOP_JWT (signed with LOOP_JWT_SECRET), user: {...} }
  → Stored in: localStorage["loop_token"] at loop.rald.cloud

STEP 5 — Messenger SSO
  Browser: messenger.rald.cloud/chats?rald_token=APP_SCOPED_JWT&app_id=messenger
  POST messenger.rald.cloud/auth/rald-sso { rald_token: APP_SCOPED_JWT }
  → Validates APP_SCOPED_JWT with RALD_JWT_SECRET
  → Returns: { authenticated: true, user: {...}, token: APP_SCOPED_JWT }
  → Stored in: localStorage["messenger_rald_token"]

TOKEN STORAGE SUMMARY:
  profiles.rald.cloud   localStorage["rald_token"]          ← RALD master JWT
  loop.rald.cloud       localStorage["rald_master_token"]   ← RALD app-scoped JWT
  loop.rald.cloud       localStorage["loop_token"]          ← Loop-native JWT
  messenger.rald.cloud  localStorage["messenger_rald_token"] ← RALD app-scoped JWT
```

---

## 5. DOMAIN REGISTRY

```
rald.cloud  (Cloudflare zone)
│
├── ACTIVE PRODUCTION
│   ├── profiles.rald.cloud     → CF Pages: rald-auth-ui        (Identity Hub SPA)
│   ├── auth.rald.cloud         → CF Worker: rald-auth          (Auth API)
│   ├── loop.rald.cloud         → CF Pages: loop                (Loop SPA)
│   ├── loop-api.rald.cloud     → CF Worker: loop-api           (Loop API)
│   ├── messenger.rald.cloud    → CF Worker: loop-messenger-api (Messenger API+serves SPA)
│   ├── realtime.rald.cloud     → CF Worker: rald-realtime      (Realtime abstraction)
│   ├── search.rald.cloud       → CF Worker: rald-search        (Search platform)
│   ├── inbox.rald.cloud        → CF Worker: rald-inbox         (Unified inbox)
│   ├── notification.rald.cloud → CF Worker: rald-notify        (Notifications)
│   ├── rald.cloud/api/*        → CF Worker: rald-cloud-edge    (API gateway + SSR)
│   ├── credentials.rald.cloud  → Kong Konnect (NOT CF proxied) (API credentials)
│   ├── cc-api.rald.cloud       → CF Worker: rald-control-center-api
│   └── api.control.rald.cloud  → CF Worker: rald-control-center-api (same worker, 2 routes)
│
├── PRODUCT SSR SUBDOMAINS (rald-cloud-edge handles — no real frontend yet)
│   ├── payrald.rald.cloud      → CF Worker: rald-cloud-edge (SSR for Googlebot)
│   ├── raldtics.rald.cloud     → CF Worker: rald-cloud-edge (SSR for Googlebot)
│   ├── dunarald.rald.cloud     → CF Worker: rald-cloud-edge (SSR for Googlebot)
│   ├── dispatch.rald.cloud     → CF Worker: rald-cloud-edge (SSR for Googlebot)
│   ├── voice.rald.cloud        → CF Worker: rald-cloud-edge (SSR for Googlebot)
│   ├── business.rald.cloud     → CF Worker: rald-cloud-edge (SSR for Googlebot)
│   └── silicon.rald.cloud      → CF Worker: rald-cloud-edge (SSR for Googlebot)
│
├── STALE / UNDEPLOYED
│   ├── accounts.rald.cloud     → ❌ 403 CF challenge (BLOCKED — decommissioned)
│   ├── crm.rald.cloud          → ❌ no worker deployed (messenger references it)
│   ├── app.rald.cloud          → unclear — referenced in CORS of notify, inbox
│   ├── admin.rald.cloud        → referenced in rald-notify CORS
│   ├── sv.rald.cloud           → referenced in rald-realtime CORS
│   ├── pay.rald.cloud          → referenced in rald-notify CORS (future PayRald)
│   └── control.rald.cloud      → CF Pages (rald-control-center) — stale 87h
│
└── REFERENCED BUT NOT CONFIRMED
    ├── api.rald.cloud          → previously a gateway (may be CF Worker)
    ├── loop-business.rald.cloud → referenced in rald-inbox CORS
    └── analytics.rald.cloud    → planned Raldtics
```

---

## 6. INTER-SERVICE CALL GRAPH

```
loop-messenger-api (messenger.rald.cloud)
  ─HTTP→  auth.rald.cloud         (JWT validation, RALD_AUTH_URL)
  ─HTTP→  notification.rald.cloud  (NOTIFY_URL — push notifications)
  ─HTTP→  search.rald.cloud        (SEARCH_URL — message search)
  ─HTTP→  inbox.rald.cloud         (INBOX_URL — inbox sync)
  ─HTTP→  crm.rald.cloud           (CRM_URL — ⚠️ NOT DEPLOYED)
  ─SQL→   Supabase onxdcikfttdmnhofsuwo

rald-inbox (inbox.rald.cloud)
  ─HTTP→  notification.rald.cloud  (NOTIFICATION_SERVICE_URL — SLA alerts)
  ─HTTP→  search.rald.cloud        (SEARCH_SERVICE_URL — conversation search)
  ─SQL→   Supabase onxdcikfttdmnhofsuwo

loop-api (loop-api.rald.cloud)
  ─HTTP→  auth.rald.cloud         (RALD_AUTH_URL — var, JWT validation config)
  ─SQL→   Supabase onxdcikfttdmnhofsuwo (service role)
  ─D1→    loop-db
  ─KV→    CACHE namespace
  ─R2→    loop-media
  ─DO→    RoomSession
  ─AI→    Workers AI (OPENROUTER_API_KEY for LLM)
  ─Q→     loop-tasks queue

rald-realtime (realtime.rald.cloud)
  ─HTTP→  auth.rald.cloud         (RALD_AUTH_URL)
  ─SQL→   Supabase
  ─CF→    Cloudflare Calls/RealtimeKit (CALLS_APP_SECRET)
  ─HTTP→  LiveKit (LIVEKIT_URL — P2 provider)
  ─HTTP→  Tencent TRTC (P3 provider)

rald-auth-ui (profiles.rald.cloud)
  ─HTTP→  auth.rald.cloud         (VITE_AUTH_API_URL)

loop frontend (loop.rald.cloud)
  ─HTTP→  loop-api.rald.cloud     (VITE_API_BASE_URL)
  ─HTTP→  profiles.rald.cloud     (VITE_RALD_AUTH_URL — SSO redirect)
  ─Supabase→ onxdcikfttdmnhofsuwo (VITE_SUPABASE_URL — optional direct queries)

messenger frontend (messenger.rald.cloud)
  ─HTTP→  messenger.rald.cloud    (VITE_API_URL — same domain, worker serves API)
  ─Supabase→ onxdcikfttdmnhofsuwo (VITE_SUPABASE_URL + anon key)

⚠️ Worker-to-Worker rule (from rald-infrastructure/docs/architecture-decisions.md):
  CF Workers CANNOT fetch proxied AAAA 100:: Worker hostnames directly.
  Must use Cloudflare Service Bindings ([[services]] in wrangler.toml).
  Exception: non-AAAA Workers may be reachable via HTTP.
  → This means messenger-api's outbound HTTP calls to auth/notify/search/inbox
    may need Service Bindings to be reliable.
```

---

## 7. DEPLOYMENT PATHS

```
Repository → Trigger → Build → Deploy → Target

rald-auth-core  →  push main  →  npx wrangler deploy
                                  + patch KV IDs via JS
                                  + secret push (RALD_JWT_SECRET, SUPABASE_SERVICE_ROLE_KEY)
                               →  auth.rald.cloud (CF Worker)

rald-auth-ui    →  push main  →  npm run build (Vite)
                                  env: VITE_AUTH_API_URL=https://auth.rald.cloud
                               →  wrangler pages deploy dist --project-name=rald-auth-ui
                               →  profiles.rald.cloud (CF Pages)

loop            →  push main  →  JOB 1: pnpm wrangler deploy --env production
                                  + push secrets: RALD_JWT_SECRET (exit 1 if missing)
                                    LOOP_JWT_SECRET, SUPABASE_SERVICE_ROLE_KEY
                                    TERMII_API_KEY, TERMII_SENDER_ID, OPENROUTER_API_KEY
                               →  loop-api.rald.cloud (CF Worker)
                                 JOB 2: pnpm build (Vite, bakes VITE_API_BASE_URL etc.)
                               →  wrangler pages deploy artifacts/loop/dist/public
                                    --project-name=loop
                               →  loop.rald.cloud (CF Pages)

messenger       →  push main  →  JOB 1: Worker deploy → loop-messenger-api
                               →  messenger.rald.cloud (CF Worker)
                                 JOB 2: pnpm build (env: VITE_API_URL, VITE_SUPABASE_*)
                               →  wrangler pages deploy artifacts/loop-messenger/dist/public
                                    --project-name=loop-messenger
                               →  messenger.rald.cloud (CF Pages — custom domain)
                                  (Worker and Pages share same domain — worker intercepts /api/*)

rald-realtime   →  push main  →  npx wrangler deploy + patch KV IDs
                                  + push: SUPABASE_SERVICE_ROLE_KEY, RALD_JWT_SECRET*
                                    TENCENT_SDK_APP_ID, TENCENT_SECRET_KEY, CALLS_APP_SECRET
                               →  realtime.rald.cloud (CF Worker)
                                  *WARNING only if missing (not exit 1) ⚠️

rald-search     →  push main  →  npx wrangler deploy + patch KV IDs
                                  + push: SUPABASE_SERVICE_ROLE_KEY, RALD_JWT_SECRET*
                               →  search.rald.cloud (CF Worker)  *WARNING only ⚠️

rald-inbox      →  push main  →  npx wrangler deploy + patch KV IDs
                                  + push: SUPABASE_SERVICE_ROLE_KEY, RALD_JWT_SECRET*
                               →  inbox.rald.cloud (CF Worker)  *WARNING only ⚠️

rald-notify     →  push main  →  npx wrangler deploy + patch KV IDs
                                  + push: SUPABASE_SERVICE_ROLE_KEY, RALD_JWT_SECRET*
                                    RESEND_API_KEY, TERMII_API_KEY, VAPID_*
                               →  notification.rald.cloud (CF Worker)  *WARNING only ⚠️

Lovable repos   →  push main  →  No CI/CD pipeline configured
(all *-ui-ux)                  →  NOT DEPLOYED anywhere
```

---

## 8. SECRET DEPENDENCY GRAPH

```
GitHub Org-Level Secrets (shared across all repos):
  SUPABASE_SERVICE_ROLE_KEY  → rald-auth-core, loop-api, messenger, realtime,
                                search, inbox, notify
  RALD_JWT_SECRET            → rald-auth-core (sign), loop-api (verify),
                                messenger (verify), realtime (verify),
                                search (verify), inbox (verify), notify (verify)
                                ← SINGLE POINT OF FAILURE for entire SSO chain

Repo-Level Secrets:
  RALD_JWT_SECRET (loop)     → loop-api worker [RALD SSO] — ⚠️ may not be set
  LOOP_JWT_SECRET (loop)     → loop-api worker [loop-native auth]
  TERMII_API_KEY (loop)      → loop-api worker
  TERMII_SENDER_ID (loop)    → loop-api worker — ⚠️ "RALD" sender broken
  OPENROUTER_API_KEY (loop)  → loop-api worker [AI]
  TERMII_API_KEY (auth-core) → rald-auth-core — ⚠️ "RALD" sender broken
  TERMII_SENDER_ID (auth-core) → rald-auth-core — ⚠️ broken
  RESEND_API_KEY (auth-core) → rald-auth-core [email OTP]
  CLERK_SECRET_KEY (auth-core) → rald-auth-core [legacy, unused]
  CALLS_APP_SECRET (realtime) → rald-realtime [CF Calls]
  TENCENT_SDK_APP_ID (realtime) → rald-realtime [P3 provider]
  TENCENT_SECRET_KEY (realtime) → rald-realtime [P3 provider]
  RESEND_API_KEY (notify)    → rald-notify [email notifications]
  VAPID_* (notify)           → rald-notify [web push]
  VITE_SUPABASE_PUBLISHABLE_KEY (messenger) → messenger frontend build
```

---

## 9. KNOWN GAPS AND RISKS

| # | Gap | Severity | Affected |
|---|-----|----------|---------|
| G1 | Termii sender "RALD" not registered in Termii (applicationId: 66189) | 🔴 CRITICAL | auth.rald.cloud phone OTP, loop-api phone OTP |
| G2 | `RALD_JWT_SECRET` may not be set in loop-api worker | 🔴 CRITICAL | RALD SSO → Loop silently fails |
| G3 | `registered_apps` table missing from Supabase | 🟡 HIGH | SSO exchange in fallback mode |
| G4 | RALD_JWT_SECRET missing: WARNING (not exit 1) in realtime, search, inbox, notify | 🟡 HIGH | All 4 services may be unprotected |
| G5 | `crm.rald.cloud` not deployed — messenger-api has hard-coded URL reference | 🟡 HIGH | Messenger CRM features fail |
| G6 | KV namespace IDs are placeholders in rald-auth-core, realtime, search, inbox, notify | 🟡 HIGH | Deploy.yml patches at deploy time — if not patched, KV operations fail |
| G7 | Worker-to-Worker calls (messenger→auth, messenger→notify, inbox→notify) may violate CF AAAA routing rules | 🟡 HIGH | Must use Service Bindings |
| G8 | `accounts.rald.cloud` 403 blocked — any hardcoded reference is a dead link | 🟠 MEDIUM | Legacy references in docs |
| G9 | Control Center (`rald-control-center`) stale 87h, no recent deployment | 🟠 MEDIUM | Admin tooling |
| G10 | No deploy.yml in `messenger` for worker deployment (only pages) | 🟠 MEDIUM | Messenger worker CD broken |
| G11 | `app.rald.cloud`, `admin.rald.cloud`, `sv.rald.cloud` referenced in CORS but no frontend deployed | 🟢 LOW | CORS will reject requests from these origins if they ever get frontends |
| G12 | All Lovable `*-ui-ux` repos have zero connection to production auth system | 🟢 INFO | Design prototypes only |

---

*Generated: 2026-06-03 | Source: live GitHub repo scan + production endpoint probes*  
*rald/docs/phase-g12/ECOSYSTEM_DEPENDENCY_MAP.md*
