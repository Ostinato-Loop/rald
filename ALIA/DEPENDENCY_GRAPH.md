# RALD ALIA — DEPENDENCY GRAPH
> Audit Date: 2026-06-13

## Service Dependency Graph

```
                        ┌──────────────────┐
                        │   rald-config    │
                        │  (feature flags, │
                        │   kill switches, │
                        │   country rules) │
                        └────────┬─────────┘
                                 │ reads
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                   ▼
  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
  │  rald-auth-core │  │  rald-event-bus │  │   rald-notify   │
  │  auth.rald.cloud│  │ events.rald.cloud│  │ notification.   │
  │                 │  │                 │  │ rald.cloud      │
  │  - identity     │  │  - event fanout │  │  - email/SMS    │
  │  - trust        │  │  - subscriptions│  │  - push/webhook │
  │  - consent      │  │  - audit stream │  │  - templates    │
  │  - machine auth │  └────────┬────────┘  └────────┬────────┘
  └────────┬────────┘           │ emits to            │ triggered by
           │ issues JWT         ▼                     ▼
           │           ┌─────────────────┐   events from event-bus
           │           │  subscribers:   │
           │           │  - rald-notify  │
           │           │  - rald-search  │
           │           │  - rald-realtime│
           │           │  - loop-api     │
           │           └─────────────────┘
           │
           ├──────────────────────────────────────────────┐
           ▼                                              ▼
  ┌─────────────────┐                          ┌─────────────────┐
  │  rald-identity  │                          │   rald-search   │
  │ profiles.rald   │                          │ search.rald.    │
  │ .cloud          │                          │ cloud           │
  │ (React SPA)     │                          │ - meilisearch   │
  │ - registration  │                          │ - opensearch    │
  │ - login UI      │                          │ - postgres FTS  │
  │ - account portal│                          └─────────────────┘
  └─────────────────┘
           ▲
           │ redirects from
  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
  │  loop.rald.cloud│  │messenger.rald.  │  │  app.rald.cloud │
  │  (loop repo)    │  │cloud            │  │ (rald-cloud-web)│
  │  - audio rooms  │  │ (messenger repo)│  │  - product hub  │
  │  - communities  │  │ - conversations │  │  - app switcher │
  │  - social graph │  │ - calls/messages│  └─────────────────┘
  └─────────────────┘  └─────────────────┘
           │                    │
           └────────────────────┘
                     │ both depend on
                     ▼
  ┌─────────────────────────────────────────────┐
  │              rald-realtime                   │
  │           (LiveKit + WebSocket)              │
  │  - room sessions    - call signaling         │
  │  - real-time events - presence               │
  └─────────────────────────────────────────────┘
```

## NPM/Package Dependencies (shared patterns)

All Cloudflare Worker services use:
- `hono` — HTTP framework
- `@supabase/supabase-js` — database client
- `hono/cors`, `hono/logger` — middleware

All React frontends use:
- `react`, `react-router-dom`
- `tailwindcss`
- `shadcn/ui` components (duplicated across every repo)
- `sonner` (toasts)
- `lucide-react` (icons)

## Critical Dependency Issues

### 1. Duplicated UI Components (HIGH RISK)
Every React repo contains a **full copy** of shadcn/ui components:
- `rald-identity/src/components/ui/*` — ~50 files
- `loop/artifacts/loop/src/components/ui/*` — ~50 files
- `messenger/src/components/ui/*` — ~50 files
- `rald-control-center/src/components/ui/*` — ~50 files
- `rald-cloud-web/src/components/ui/*` — ~50 files
- `rald-marketing/src/components/ui/*` — ~50 files

**Impact**: Design divergence, 6x maintenance surface. Need shared `@rald/ui` package.

### 2. Duplicated Auth Logic (HIGH RISK)
Multiple services implement their own JWT verification:
- `rald-event-bus/src/lib/auth.ts` — custom HMAC-SHA256
- `rald-config/src/lib/auth.ts` — same custom HMAC-SHA256
- `rald-notify/src/lib/auth.ts` — same pattern
- `loop/artifacts/cloudflare-worker/src/lib/jwt.ts` — same pattern

**Impact**: Any JWT secret rotation must touch every service manually. Need `@rald/auth-sdk`.

### 3. Duplicated Machine Auth (MEDIUM RISK)
- `rald-event-bus/src/lib/machine-auth.ts`
- `rald-config/src/lib/machine-auth.ts`
- `rald-notify/src/lib/machine-auth.ts`

Same file, copy-pasted. Backward-compat `X-Internal-Secret` still present in all.

### 4. No Shared DB Schema Package
Each service maintains its own `supabase-schema.sql`. No single schema registry.
`rald-auth-core` has the most comprehensive migrations (90+ files) but they are ad-hoc numbered.
