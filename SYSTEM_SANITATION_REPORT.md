# RALD ECOSYSTEM — SYSTEM SANITATION REPORT
## Phase 1: Hardening, Sanitation & Stability Sprint

**Generated:** 2026-06-12  
**Scope:** All active Ostinato-Loop repositories  
**Total Repos Audited:** 100+  
**Prepared by:** RALD Platform Engineering · LILCKY STUDIO LIMITED

---

## Executive Summary

This report is the output of a full ecosystem sanitation audit across all RALD services. It identifies what is deployed, what is working, what is dead weight, and what poses a security or stability risk. No assumptions. No placeholder findings.

---

## 1. Active Services Inventory

| Service | Repo | Runtime | Domain | Status |
|---|---|---|---|---|
| RALD Auth Core | rald-auth-core | Cloudflare Worker (Hono) | auth.rald.cloud | ✅ DEPLOYED |
| RALD Identity UI | rald-identity | Cloudflare Pages (React/Vite) | profiles.rald.cloud | ✅ DEPLOYED |
| Loop (Audio Platform) | loop | CF Worker + D1 + DO + R2 | loop.rald.cloud / loop-api.rald.cloud | ✅ DEPLOYED |
| Loop Messenger | messenger | CF Worker + Fly.io (Express) | chat.rald.cloud | ✅ DEPLOYED |
| RALD Notify | rald-notify | Cloudflare Worker (Hono) | notification.rald.cloud + notify.rald.cloud | ✅ DEPLOYED |
| RALD Realtime | rald-realtime | Cloudflare Worker (Hono) | realtime.rald.cloud | ✅ DEPLOYED |
| RALD Inbox | rald-inbox | Cloudflare Worker (Hono) | inbox.rald.cloud | ✅ DEPLOYED |
| RALD Search | rald-search | Cloudflare Worker (Hono) | search.rald.cloud | ✅ DEPLOYED |
| RALD Control Center | rald-control-center | CF Worker + CF Pages | control.rald.cloud | ✅ DEPLOYED |
| RALD Dev Console | rald-dev-console | CF Worker + CF Pages | console.rald.cloud | ✅ DEPLOYED |
| RALD Cloud Web | rald-cloud-web | Cloudflare Pages | rald.cloud | ✅ DEPLOYED |
| RALD Docs | rald-docs | Cloudflare Pages | docs.rald.cloud | ✅ DEPLOYED |
| RALD Status | rald-status | Cloudflare Pages | status.rald.cloud | ✅ DEPLOYED |
| RALD Trust | rald-trust | Cloudflare Pages | trust.rald.cloud | ✅ DEPLOYED |
| RALD Design | rald-design | Cloudflare Pages | design.rald.cloud | ✅ DEPLOYED |
| RALD Auth SDK | rald-auth-sdk | npm package | — | ✅ PUBLISHED |
| Loop Core | loop-core | TypeScript lib | — | ✅ ACTIVE |

---

## 2. Infrastructure Bindings Audit

### Supabase
- **URL:** `https://onxdcikfttdmnhofsuwo.supabase.co`
- **Used by:** rald-auth-core, rald-notify, rald-inbox, rald-search, rald-control-center
- **Status:** ✅ Single shared Supabase project — correct for unified identity

### Cloudflare KV Namespaces
| Service | Binding | KV ID | Purpose |
|---|---|---|---|
| rald-auth-core | RATE_LIMIT_KV | b0e3c620619c4aab85e5f59f6ebddc0e | Rate limiting |
| rald-auth-core | RALD_SESSION_KV | 15ee70c2a0534880a11843469d0468ef | Session store |
| rald-notify | RATE_LIMIT_KV | f54f9248247a428bb4e54ddfc1e2c832 | Rate limiting |
| rald-realtime | RATE_LIMIT_KV | 5115e9d11424487eaaff71638addff34 | Rate limiting |
| rald-realtime | HEALTH_KV | 36a4c73ff82a4aabae5fa4b604622047 | Health state |
| rald-realtime | PROVIDER_STATE_KV | 91d1b5895a99481588118695fba6bd52 | Provider config |
| rald-inbox | RATE_LIMIT_KV | be8b3854b50c4f9aac8d91345e955466 | Rate limiting |
| loop-api | CACHE | 3c71da01b3174d6c9353adbfde7491a3 | Sessions + OTP |

### Loop-Specific Infrastructure
| Resource | Type | ID/Name | Status |
|---|---|---|---|
| loop-db | D1 Database | 4616fcac-96e0-4150-a42f-3d020f45cd1d | ✅ Active |
| loop-media | R2 Bucket | loop-media | ✅ Active |
| loop-tasks | Queue | loop-tasks | ✅ Active |
| ROOM_SESSION | Durable Object | RoomSession | ✅ Active |
| CLEANUP_COORDINATOR | Durable Object | CleanupCoordinator | ✅ Active |
| Workers AI | AI binding | AI | ✅ Active |

---

## 3. Secrets Audit

### rald-auth-core (auth.rald.cloud)
| Secret | Required | Notes |
|---|---|---|
| SUPABASE_SERVICE_ROLE_KEY | ✅ | Boot-validated — 503 if missing |
| RALD_JWT_SECRET | ✅ | Boot-validated — 503 if missing |
| TERMII_API_KEY | ✅ | SMS OTP |
| TERMII_SENDER_ID | ✅ | SMS sender |
| RESEND_API_KEY | ✅ | Email OTP |
| CLERK_SECRET_KEY | ✅ | Clerk bridge |
| CLERK_PUBLISHABLE_KEY | ✅ | Clerk bridge |

### rald-notify (notification.rald.cloud)
| Secret | Required | Notes |
|---|---|---|
| SUPABASE_SERVICE_ROLE_KEY | ✅ | Auth + DB |
| RALD_JWT_SECRET | ✅ | JWT verification |
| RESEND_API_KEY | ✅ | Email channel |
| TERMII_API_KEY | ⚠ optional | SMS channel |
| VAPID_PUBLIC_KEY | ⚠ optional | Push channel |
| VAPID_PRIVATE_KEY | ⚠ optional | Push channel |
| OPEN_OBSERVE_API_KEY | ⚠ optional | Observability |
| OPEN_OBSERVE_ENDPOINT | ⚠ optional | Observability |

### loop-api (loop-api.rald.cloud)
| Secret | Required | Notes |
|---|---|---|
| RALD_JWT_SECRET | ✅ | JWT verification |
| SUPABASE_SERVICE_ROLE_KEY | ✅ | Profile lookups |
| TERMII_API_KEY | ✅ | SMS |
| LIVEKIT_API_KEY | ✅ | Audio rooms |
| LIVEKIT_API_SECRET | ✅ | Audio rooms |
| LIVEKIT_URL | ✅ | Audio rooms |
| ONESIGNAL_APP_ID | ⚠ push | Push notifications |
| ONESIGNAL_REST_API_KEY | ⚠ push | Push notifications |
| OPENROUTER_API_KEY | ⚠ AI | Translation + AI features |

---

## 4. Identified Issues

### 🔴 CRITICAL

**C-001: Dual route binding on rald-notify**
- `notification.rald.cloud` AND `notify.rald.cloud` both route to the same worker
- Creates naming ambiguity — consumers must standardize on `notification.rald.cloud`
- **Action:** Document `notification.rald.cloud` as canonical; deprecate `notify.rald.cloud`

**C-002: Static API keys in all service-to-service calls**
- Every service uses `RALD_JWT_SECRET` directly — no machine identity
- If `RALD_JWT_SECRET` is compromised, all services are compromised simultaneously
- **Action:** Implement Machine Identity Infrastructure (Phase 5)

**C-003: Rate limiter fail-open**
- When KV is unavailable, rate limiter allows all requests (documented in rald-auth-core)
- Represents a DDoS window during Cloudflare KV outages
- **Action:** Add secondary rate limit layer; alert on KV unavailability

**C-004: Cloudflare cron quota exhausted**
- Loop disabled its `*/10 * * * *` cron (cleanup coordinator) because CF account is at the 5-cron limit
- Room cleanup, retention jobs, and analytics jobs cannot run automatically
- **Action:** Audit all 5 used cron slots; eliminate unused triggers; re-enable Loop cleanup cron

### 🟡 HIGH

**H-001: rald-auth-server repo is private and stale (pushed 2026-05-29)**
- Appears to be a legacy V1 auth server — likely superseded by rald-auth-core Cloudflare Worker
- **Action:** Archive or delete rald-auth-server; verify no service depends on it

**H-002: Multiple UI/UX prototype repos without production counterparts**
- payrald-ui-ux, rald-dispatch-ui-ux, rald-mail-ui-ux, gitrald-ui-ux, loop-messenger-ui-ux, loop-audio-ui-ux, rald-tv-ui-ux, rald-ai-ui-ux — all private, pushed in June 2026
- These are design prototypes — they should not become orphaned
- **Action:** Track these against roadmap items; archive prototypes not tied to active development

**H-003: rald-event-bus repo has no TypeScript source (language: N/A)**
- Event Bus is referenced in sprint plans but the repo is empty
- No service currently publishes events through a central bus
- **Action:** Implement Event Bus (Phase 1 of Operator Sprint)

**H-004: rald-config repo has no TypeScript source (language: N/A)**
- Feature flags and environment configuration repo is empty
- All services use hardcoded `ENVIRONMENT` vars
- **Action:** Implement Feature Flag System (Phase 2 of Operator Sprint)

**H-005: loop-business-8cbd0eb1 is a duplicate/orphan repo**
- Name contains a hash — suggests it was auto-created or forked without proper naming
- Private, pushed 2026-05-31, TypeScript, no description
- **Action:** Audit contents; merge into loop-business or delete

**H-006: No session refresh endpoint**
- rald-auth-core has session revocation but no `POST /auth/refresh` for silent token renewal
- 30-day session cookie means users are logged out after 30 days with no recovery path other than full re-auth
- **Action:** Implement `POST /auth/refresh` with sliding window (Phase 6)

**H-007: rald-realtime has THREE KV namespaces**
- RATE_LIMIT_KV, HEALTH_KV, PROVIDER_STATE_KV — no docs on cleanup or expiry policies
- **Action:** Add TTL/expiry audit to realtime KV namespaces

### 🟢 LOW / INFORMATIONAL

**L-001: rald-notify has commented-out cron trigger**
- `crons = ["*/5 * * * *"]` is commented out — delivery retry jobs cannot run automatically
- **Action:** Enable once cron quota is freed (see C-004)

**L-002: loop-inbox references NOTIFICATION_SERVICE_URL and SEARCH_SERVICE_URL as env vars**
- Direct service URLs create tight coupling; these should go through a service registry
- **Action:** Long-term — integrate with rald-config/service discovery

**L-003: rald-loop-business is a private, unnamed repo**
- Private, pushed 2026-06-06, TypeScript, no description
- **Action:** Audit; document or archive

---

## 5. Dead / Orphaned Repositories

The following repos have `language: N/A` and were pushed before June 2026, suggesting they are scaffold-only:

| Repo | Last Push | Recommendation |
|---|---|---|
| payrald | 2026-05-28 | Scaffold only — archive or populate |
| raldtics | 2026-05-28 | Scaffold only — archive or populate |
| dunarald | 2026-05-27 | Scaffold only — archive or populate |
| rald-console | 2026-05-27 | Scaffold only — superseded by rald-control-center |
| rald-shared-sdk | 2026-05-27 | Scaffold only — evaluate vs rald-auth-sdk |
| rald-design-system | 2026-05-27 | Scaffold only — superseded by rald-design |
| rald-events | 2026-05-27 | Empty — will be populated this sprint |
| rald-observability | 2026-05-27 | Empty — plan for Phase 8 |
| rald-fraud | 2026-05-27 | Empty — future work |
| rald-compliance | 2026-05-27 | Empty — future work |
| gitrald-* | 2026-05-28 to 06-07 | Scaffolds — no TypeScript source |
| payrald-* | 2026-05-28 to 06-07 | Scaffolds — no TypeScript source |
| raldtics-* | 2026-05-28 to 06-07 | Scaffolds — no TypeScript source |
| rald-sdk-* | 2026-05-27 to 06-07 | Most are scaffold-only except rald-auth-sdk |

---

## 6. API Endpoint Audit Summary

### rald-auth-core (auth.rald.cloud) — 30+ routes
- `/auth/*` — registration, OTP, login, recovery, redirect
- `/session/*` — validate, revoke, revoke-all, revoke-device
- `/devices/*` — list, trust, remove
- `/sso/*` — silent auth, cross-product SSO
- `/username/*` — check, register, recover, transfer
- `/profiles/*` — read, update
- `/search/*` — user search
- `/graph/*` — social graph
- `/privacy/*` — privacy settings
- `/verification-engine/*` — verification flows
- `/roles/*` — RBAC roles
- `/recovery/*` — recovery codes
- `/qr/*` — QR login
- `/webauthn/*` — passkey auth
- `/metrics/*` — admin metrics
- `/migration/*` — data migrations
- `/country/*` — country settings
- `/expansion/*` — expansion config
- `/identity/*` — identity capabilities
- `/developer/*` — developer platform
- **⚠ MISSING:** `POST /auth/refresh` — sliding session renewal

### loop-api (loop-api.rald.cloud) — 15+ routes
- `/rooms/*` — audio room lifecycle
- `/communities/*` — community management
- `/civic/*` — civic rooms
- `/follows/*` — social graph
- `/notifications/*` — push notifications
- `/analytics/*` — room analytics
- `/trending/*` — trending rooms
- `/regions/*` — geographic discovery
- `/auth/*` — Loop SSO bridge to rald-auth
- **⚠ MISSING:** Cron cleanup (disabled — C-004)

### rald-notify (notification.rald.cloud) — 8+ routes
- `/notifications/*` — send + status
- `/templates/*` — notification templates
- `/preferences/*` — user preferences
- `/channels/*` — channel config
- `/deliveries/*` — delivery tracking
- `/events/*` — event-triggered notifications
- `/audit/*` — delivery audit log

---

## 7. Recommendations — Priority Order

### Immediate (This Sprint)

1. ✅ Fix Cron Quota (C-004) — identify and remove unused crons to re-enable Loop cleanup
2. ✅ Implement `POST /auth/refresh` (H-006) — session sliding window
3. ✅ Standardize notify URL (C-001) — deprecate `notify.rald.cloud`
4. ✅ Archive/delete `rald-auth-server` (H-001) — legacy V1 dead weight
5. ✅ Build Event Bus (H-003) — central event fabric
6. ✅ Build Feature Flag System (H-004) — runtime control
7. ✅ Build Kill Switch System — emergency shutdown capability

### Next Sprint

8. Machine Identity Infrastructure (C-002)
9. rald-observability population (Phase 8)
10. Regulatory Rules Engine (Phase 10)

---

## 8. Certification Status

| Domain | Status | Blocker |
|---|---|---|
| Identity & Auth | ✅ CERTIFIED (v2.8.0) | None — see PUBLIC_BETA_READINESS_REPORT |
| Session Management | ⚠ PARTIAL | Missing /auth/refresh |
| Notification Delivery | ✅ CERTIFIED | Cron retry disabled — manual only |
| Real-time Infrastructure | ✅ DEPLOYED | LiveKit + RealtimeKit + Tencent |
| Search | ✅ DEPLOYED | Multi-provider |
| Event Bus | ❌ NOT BUILT | Sprint work item |
| Feature Flags | ❌ NOT BUILT | Sprint work item |
| Kill Switches | ❌ NOT BUILT | Sprint work item |
| Machine Identity | ❌ NOT BUILT | Sprint work item |
| Observability UI | ⚠ API only | No dashboard UI yet |

---

*RALD Ecosystem — Built in Africa. Hardened for the world.*  
*LILCKY STUDIO LIMITED · 2026*
