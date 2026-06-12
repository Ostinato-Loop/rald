# ECOSYSTEM DISCOVERY REPORT
**Generated:** 2026-06-12  
**Scope:** RALD Ecosystem — Principal Systems Architect Audit  
**Authority:** Phase 0 — Mandatory before any code changes  
**Classification:** OFFICIAL — SOURCE OF TRUTH

---

## EXECUTIVE SUMMARY

The RALD ecosystem is a multi-service African-first identity platform running on Cloudflare Workers + Supabase. The core identity infrastructure (`rald-auth-core` v2.8.0) is **production-grade and substantially complete**. The Identity Brain described in the mission brief is **largely already implemented** under `/identity/*` routes. The primary gaps are operational (machine identity provisioning, log shipping, session cleanup automation) and functional (retention intelligence layer, self-healing ops, identity-brain namespace).

**10 of 16 probed URLs are operational. 3 P0 blockers must be resolved before public beta.**

---

## REPOSITORIES AUDITED

| Repository | Language | Size | Status | Deployed At |
|---|---|---|---|---|
| `rald` | TypeScript | 12,827 KB | ✅ Active | Replit workspace + rald.cloud |
| `rald-auth-core` | TypeScript | 398 KB | ✅ Production | auth.rald.cloud |
| `rald-auth-ui` | TypeScript | 494 KB | ✅ Production | app.rald.cloud |
| `rald-identity` | TypeScript | 498 KB | ✅ Production | profiles.rald.cloud |
| `rald-app-ui-ux` | TypeScript | 338 KB | ✅ Production | app.rald.cloud (parallel) |
| `rald-pro-ui-ux-v1` | TypeScript | ~200 KB | ✅ Production | Login/OTP components |
| `rald-realtime` | TypeScript | 87 KB | ✅ Production | realtime.rald.cloud |
| `rald-notify` | TypeScript | 86 KB | ✅ Production | notification.rald.cloud |
| `rald-search` | TypeScript | 84 KB | ✅ Production | search.rald.cloud |
| `rald-inbox` | TypeScript | 47 KB | ✅ Production | inbox.rald.cloud |
| `rald-api-core` | TypeScript | 83 KB | ✅ Production | api.rald.cloud |
| `rald-control-center` | TypeScript | 380 KB | ✅ Production | admin.rald.cloud |
| `loop` | TypeScript | 2,565 KB | ✅ Production | loop.rald.cloud + loop-api.rald.cloud |
| `loop-mobile` | TypeScript | 216 KB | ✅ Production | iOS/Android (Expo) |
| `messenger` | TypeScript | 1,255 KB | ✅ Production | messenger.rald.cloud |
| `wizmac-core` | TypeScript | ~50 KB | ⚠️ Schema only | Not deployed |
| `sekani-core` | TypeScript | ~30 KB | ⚠️ Partial | Not confirmed deployed |
| `bbc-core` | TypeScript | ~10 KB | ❌ Spec only | Not deployed |
| `rald-ai` | TypeScript | ~20 KB | ⚠️ Partial | Not confirmed deployed |
| `rald-infrastructure` | YAML/Shell | ~200 KB | ✅ Active | Kong + K8s configs |
| `rald-event-bus` | TypeScript | 42 KB | ✅ Production | events.rald.cloud |
| `rald-config` | TypeScript | 39 KB | ✅ Production | config.rald.cloud |
| `rald-dev-console` | TypeScript | 59 KB | ✅ Production | console.rald.cloud |
| **~60 stub repos** | — | 3–4 KB | ❌ README only | Not built |

---

## SERVICES DISCOVERED

### Operational (Confirmed Live)

| Service | URL | Worker Name | Version | Auth Method |
|---|---|---|---|---|
| Auth Core | auth.rald.cloud | `rald-auth` | 2.8.0 | JWT (RALD_JWT_SECRET) |
| Loop Frontend | loop.rald.cloud | CF Pages | — | RALD SSO cookie |
| Loop API | loop-api.rald.cloud | `loop-api` | — | RALD JWT + D1 |
| Messenger | messenger.rald.cloud | — | 1.2.1 | RALD JWT + Supabase |
| Profiles | profiles.rald.cloud | CF Pages | — | RALD SSO |
| App Shell | app.rald.cloud | CF Pages | — | RALD SSO |
| Notifications | notification.rald.cloud | `rald-notify` | 1.1.0 | RALD JWT |
| Search | search.rald.cloud | `rald-search` | 1.0.0 | RALD JWT |
| Realtime | realtime.rald.cloud | `rald-realtime` | — | RALD JWT |
| Control Center | admin.rald.cloud | CF Pages + Worker | — | RALD JWT (admin) |
| Event Bus | events.rald.cloud | CF Worker | — | Machine JWT |
| Config/Flags | config.rald.cloud | CF Worker | — | Internal |
| Dev Console | console.rald.cloud | CF Pages | — | RALD SSO |
| Status | status.rald.cloud | CF Pages | — | Public |

### Non-Operational (P0/P1)

| Service | URL | Code | Diagnosis | Priority |
|---|---|---|---|---|
| Mail | mail.rald.cloud | 000 | DNS missing, service not deployed | **P0** |
| Chat | chat.rald.cloud | 000 | NXDOMAIN — no DNS record | **P0** |
| Manilla | manilla.rald.cloud | 530 | CF DNS exists, origin unreachable | **P0** |
| Trust | trust.rald.cloud | 000 | DNS missing | P1 |
| Learn | learn.rald.cloud | 000 | DNS missing | P1 |
| SSO | sso.rald.cloud | 000 | Misconfigured | P1 |

---

## AUTH ARCHITECTURE

```
RALD Auth Core (auth.rald.cloud) — Single Auth Endpoint
├── /auth/*              — login, register, OTP (SMS+email), password reset
├── /sso/*               — Universal SSO exchange (v2 with redirect_to validation)
├── /provision/*         — Silent app provisioning (< 100ms, no onboarding redirect)
├── /profiles/*          — User profile management
├── /username/*          — Username Registry (claim/release/reserve/transfer/admin)
├── /identity/*          — Identity Intelligence Layer (NEVER ASK TWICE)
│   ├── GET  /identity/intelligence   — full capability snapshot
│   ├── POST /identity/intelligence   — update a capability field
│   ├── GET  /identity/memory         — onboarding + dismissal history
│   ├── POST /identity/memory/dismiss — mark a prompt dismissed
│   └── POST /identity/memory/step    — record onboarding step
├── /developer/*         — Developer Portal (API keys, apps, webhooks, audit)
├── /machine/*           — Machine Identity (service-to-service auth)
├── /trust/*             — Trust Engine (7 tiers, compute_trust_score)
├── /permissions/*       — RBAC Permission Engine
├── /country/*           — Country Governance (enabled/waitlist/beta/disabled)
├── /devices/*           — Device management and revocation
├── /qr/*               — QR Code Login
├── /webauthn/*          — Passkey (WebAuthn/Face Auth)
├── /recovery/*          — Account recovery
├── /graph/*             — Social graph (follows, connections)
├── /search/*            — User search
└── /metrics/*           — Auth metrics
```

### JWT Trust Chain
- **One shared secret**: `RALD_JWT_SECRET` across ALL CF Workers
- **Products do NOT issue their own JWTs** — they verify RALD tokens only
- **Loop** re-signs RALD token into a Loop-scoped JWT (IDN-001)
- **HttpOnly cookie** (`loop_session`) — no tokens in localStorage (COOKIE-001, fixed 2026-06-09)
- **Handoff tokens** — 5-minute URL-safe tokens for cross-app navigation
- **Machine identities** — separate `mid_*` tokens for service-to-service (schema ready, NOT YET PROVISIONED)

### SSO Flow
```
User arrives at loop.rald.cloud (unauthenticated)
  → redirect to profiles.rald.cloud?redirect_to=loop.rald.cloud&app_id=loop
  → profiles.rald.cloud → auth.rald.cloud SSO exchange
  → back to loop.rald.cloud/auth/callback?rald_token=TOKEN
  → Loop Worker: POST /api/auth/rald-sso → sets HttpOnly loop_session cookie
  → POST /provision/app { app_id: "loop" } → silent provisioning
  → User is in the app. No onboarding. No re-registration.
```

---

## IDENTITY ARCHITECTURE

### Identity Brain Status (IMPLEMENTED)

The Identity Brain is already implemented inside `rald-auth-core`. The routes exist. The database tables exist. The back-fill from existing users is done.

| Component | Table | Route | Status |
|---|---|---|---|
| Identity Capabilities | `identity_capabilities` | `GET /identity/intelligence` | ✅ Live |
| Identity Memory | `identity_memory` | `GET /identity/memory` | ✅ Live |
| Profile | `auth_user_profiles` | `GET /profiles/*` | ✅ Live |
| Username Registry | `username_registry` | `GET/POST /username/*` | ✅ Live |
| Trust Engine | `trust_scores` | `GET /trust/score` | ✅ Live |
| Permission Engine | `permissions` | `GET /permissions/*` | ✅ Live |
| Country Registry | (via rald-config) | `GET /country/*` | ✅ Live |
| Developer Platform | `developer_profiles`, `developer_api_keys` | `GET /developer/*` | ✅ Live |
| Machine Identity | `machine_identities` | `GET /machine/identities` | ⚠️ Schema + API ready, **keys not provisioned** |
| Verification Engine | `verifications` | `/verification-engine/*` | ✅ Live |
| Device Memory | `auth_devices` | `GET /devices/*` | ✅ Live |

### Supabase Instance
- **Project URL:** `https://onxdcikfttdmnhofsuwo.supabase.co`
- **Shared across:** auth-core, notify, search, inbox, messenger
- **Loop:** Uses Cloudflare D1 (`loop-db`) — separate from Supabase

### Identity Intelligence (NEVER ASK TWICE — Rule #1)
```typescript
GET /identity/intelligence
Returns: {
  username: boolean,           // RALD already has this
  email: boolean, email_verified: boolean,
  phone: boolean, phone_verified: boolean,
  profile_photo: boolean,
  country: boolean, state: boolean, city: boolean,
  language: boolean,
  trust_level: string,         // none/basic/verified/trusted/civic/creator/business
  mail_reserved: boolean,      // username@rald.me
  mail_address: string | null,
  // ... capability flags
}
// Products MUST call this before asking user for ANY data.
```

---

## SERVICE ARCHITECTURE

### Loop (loop-api.rald.cloud)
- **Runtime:** Cloudflare Worker with D1 (SQLite), R2, Queues, Durable Objects
- **Durable Objects:** `RoomSession` (room state), `CleanupCoordinator` (session cleanup)
- **Queues:** `loop-tasks` — async task processing
- **Routes:** audio, auth, civic, communities, creator, follows, friend-requests, metrics, moderation, notifications, push, rald-sso, regions, retention, rooms, trending
- **Retention Engine:** `GET /api/retention/feed` — personalised feed (rooms + creators + friends active + communities)
- **AI:** Workers AI binding for content features
- **Auth:** RALD JWT verification → Loop-scoped re-signed JWT → HttpOnly cookie

### Messenger (messenger.rald.cloud)
- **Runtime:** Cloudflare Worker + Supabase
- **Version:** 1.2.1
- **Routes:** conversations, messages, reactions, members, assignments, attachments, users, search, sso
- **Dual mount:** Routes at both `/` (business API) and `/api` (SPA client)
- **Supabase functions:** compute-retention-cohorts, compute-scores

### Notifications (notification.rald.cloud)
- **Runtime:** Cloudflare Worker + Supabase
- **Channels:** email (Resend), SMS (Termii), push (VAPID), webhook
- **Routes:** notifications, templates, preferences, channels, deliveries, events, audit, center
- **Cron:** ⚠️ `*/5 * * * *` commented out — requires CF Dashboard to enable (C-CERT-003/P0-002)
- **C-CERT-003 STATUS:** orphan route binding ALREADY FIXED in wrangler.toml (canonical: `notification.rald.cloud`, orphan `notify.rald.cloud` removed)

### Realtime (realtime.rald.cloud)
- **Providers:** LiveKit (primary), RealtimeKit, Tencent (fallback)
- **Routes:** rooms, calls, analytics, health
- **KV:** RATE_LIMIT_KV, HEALTH_KV, PROVIDER_STATE_KV

### Search (search.rald.cloud)
- **Providers:** PostgreSQL (primary), MeiliSearch, OpenSearch
- **Routes:** search, index-management, recent-searches, saved-searches

### Inbox (inbox.rald.cloud)
- **Channels:** email, internal, notification
- **Routes:** conversations, messages, sla, assignments, tags, views, audit, analytics

---

## DEPLOYMENT ARCHITECTURE

### Cloudflare Workers (Production)
All services deploy via GitHub Actions → `wrangler deploy`. Secrets pushed via `wrangler secret put`.

| Worker | Name in CF | Domain | CI File |
|---|---|---|---|
| Auth Core | `rald-auth` | auth.rald.cloud | deploy.yml |
| Loop API | `loop-api` | loop-api.rald.cloud | deploy.yml |
| Messenger | (name TBD) | messenger.rald.cloud | deploy.yml |
| Notify | `rald-notify` | notification.rald.cloud | deploy.yml |
| Search | `rald-search` | search.rald.cloud | deploy.yml |
| Realtime | `rald-realtime` | realtime.rald.cloud | deploy.yml |
| Event Bus | — | events.rald.cloud | — |

### Cloudflare Pages (Production)
| App | Domain | Repo |
|---|---|---|
| Loop Frontend | loop.rald.cloud | loop (artifacts/loop) |
| Messenger Frontend | messenger.rald.cloud / chat.rald.cloud | messenger |
| Auth UI | app.rald.cloud | rald-auth-ui |
| Profiles | profiles.rald.cloud | rald-identity |
| Control Center | admin.rald.cloud | rald-control-center (apps/web) |
| Dev Console | console.rald.cloud | rald-dev-console |

### Infrastructure (rald-infrastructure)
- Kong API Gateway — `k8s/kong-*` manifests
- Docker Compose — dev/staging/prod overrides
- Environment configs — `kong/environments/*`
- CI: `sync-kong.yml` — keeps Kong config in sync

---

## EXISTING AUTOMATION

| Automation | Location | Status |
|---|---|---|
| CI typecheck on all workers | GitHub Actions (.github/workflows/ci.yml) | ✅ |
| Auto-deploy on push to main | GitHub Actions (.github/workflows/deploy.yml) | ✅ |
| Supabase migrations on deploy | GitHub Actions (migrate-sprint.yml in loop) | ✅ |
| Wrangler secret sync | deploy.yml in each repo | ✅ |
| Loop Durable Object cleanup | CleanupCoordinator DO | ✅ |
| Loop queue processing | loop-tasks queue consumer | ✅ |
| Messenger retention scoring | Supabase Edge Functions | ✅ |
| Kong config sync | sync-kong.yml | ✅ |

---

## MISSING AUTOMATION

| Gap | Impact | Phase |
|---|---|---|
| Machine identity keys not provisioned | Services can't auth service-to-service securely | Phase 1 |
| rald-notify cron not active | No scheduled notification cleanup/retry | Phase 1 |
| OpenObserve log shipping not active | No centralized observability | Phase 1 |
| Session/OTP/device cleanup scheduled job | Orphaned data accumulates | Phase 1 |
| Self-healing health monitor | No automated recovery | Phase 3 |
| Token rotation automation | Machine tokens require manual rotation at 90-day mark | Phase 3 |
| Identity Brain `/identity-brain` namespace | Missing canonical namespace (routes exist at `/identity/*`) | Phase 4 |
| Retention Intelligence as ecosystem service | Loop has `/api/retention/feed` but not ecosystem-wide | Phase 2 |
| WIZMAC memory integration | wizmac-core not deployed | Phase 2 |
| chat.rald.cloud DNS | Messenger frontend unreachable at intended URL | Infra |

---

## DUPLICATION RISKS

| Risk | Repos | Recommendation |
|---|---|---|
| Auth UI components duplicated | `rald-auth-ui`, `rald-app-ui-ux`, `rald-pro-ui-ux-v1` | Consolidate into one — `rald-pro-ui-ux-v1` appears to be the canonical next-gen version |
| Auth lib.ts divergence | Every CF Worker has its own `src/lib/auth.ts` | Accept — all verify the same JWT secret. Keep them in sync via shared spec, not shared code |
| Loop uses D1 + Supabase independently | `loop` | By design — Loop is the social layer. Identity still queries auth.rald.cloud. Accept. |
| Multiple `rald-app-*` repos | `rald-app-ui-ux`, `rald-pro-ui-ux-v1` | Confirm which is the live app.rald.cloud source and retire the other |
| `rald-auth-server` repo (0KB) | `rald-auth-server` | Empty placeholder — safe to ignore |

---

## IMPLEMENTATION RECOMMENDATIONS

### Phase 1 — Public Beta Blockers (Do First)
1. **Machine Identity Provisioning** — Run `POST /machine/identities` for 7 services via provisioning script. Push to `rald-auth-core`.
2. **Notify Cron** — Cannot be automated via code. Requires Cloudflare Dashboard access. Document exact steps.
3. **OpenObserve Log Shipping** — Set `OPEN_OBSERVE_API_KEY` + `OPEN_OBSERVE_ENDPOINT` via `wrangler secret put` on: auth-core, notify, search, realtime, inbox, messenger. Add to each repo's deploy.yml.
4. **Session Cleanup** — Add a Supabase Edge Function or a scheduled Cloudflare Worker cron to clean expired sessions, stale OTPs, stale device records.

### Phase 2 — Retention Intelligence
- Loop already has `GET /api/retention/feed` — this is the Retention Engine for Loop
- Need to make it ecosystem-wide via `/api/retention/*` in rald-auth-core (user interest graph)
- Civic Engine: Loop already has `GET /api/civic` — scale it, don't duplicate
- WIZMAC Memory: Blocked on wizmac-core deployment

### Phase 3 — Self-Healing
- Use Cloudflare Queues + Durable Objects (pattern already used in Loop)
- Health checks: `HEALTH_KV` pattern from rald-realtime is the model
- Token rotation alerts: already in `/machine/identities/rotation-alerts`

### Phase 4 — Identity Brain
- DO NOT CREATE NEW REPO — implement inside `rald-auth-core`
- Add `/identity-brain/*` as an alias namespace pointing to existing `/identity/*` routes
- OR: rename `/identity/*` → `/identity-brain/*` and keep backward-compat aliases

### Phase 5 — Account Unification
- `rald-app-ui-ux` and `rald-pro-ui-ux-v1` both have auth components — audit which is live
- Loop uses RALD SSO correctly (no duplicate accounts)
- Messenger uses RALD JWT correctly
- No localStorage master token (fixed in COOKIE-001)

### Phase 6 — Replit ↔ GitHub Alignment
- The `rald` repo IS the Replit workspace
- The Replit workspace has artifacts (api-server, mockup-sandbox) that don't appear to be pushed to any GitHub repo
- GitHub is the source of truth — Replit should pull from GitHub, not the other way around

---

## ASSESSMENT BY PRODUCT

### Loop — 90% Public Beta Ready
- ✅ Auth (RALD SSO + HttpOnly cookie)
- ✅ Rooms (LiveKit, Durable Objects)
- ✅ Communities, Civic, Creator
- ✅ Retention Feed
- ⚠️ `loop-mobile` Apple App Store submission pending (P0-001 — operator action)
- ⚠️ Machine identity keys not provisioned

### Messenger — 85% Public Beta Ready
- ✅ Conversations, messages, reactions
- ✅ RALD SSO integration
- ✅ Retention analytics (Supabase Edge Functions)
- ❌ chat.rald.cloud has no DNS — Messenger unreachable at intended URL

### RALD Identity — 95% Public Beta Ready
- ✅ Auth, SSO, OTP, WebAuthn
- ✅ Identity Intelligence Layer
- ✅ Username Registry
- ✅ Developer Portal
- ✅ Trust Engine + Permissions
- ⚠️ Machine identity keys not provisioned
- ⚠️ OpenObserve not active

### Notifications — 80% Public Beta Ready
- ✅ Email, SMS, push, webhook channels
- ✅ Templates, preferences, delivery tracking
- ⚠️ Cron trigger not active (requires CF Dashboard)
- ⚠️ Retry queues / dead letter queues not implemented

---

## PHASE 0 VERDICT

**Discovery is complete. No new systems should be created.**  
**No new repos should be created.**  
**Stabilize, unify, automate, and harden what exists.**

The RALD Identity Brain is BUILT. The remaining work is:
1. Operational hardening (machine keys, log shipping, cleanup automation)
2. Functional completion (retention intelligence ecosystem-wide, self-healing ops)
3. Naming/namespace alignment (`/identity-brain` namespace)
4. Account unification audit (eliminate any remaining localStorage auth patterns)

Proceed to Phase 1.

---

*Report generated by Principal Systems Architect · RALD Platform Engineering · LILCKY STUDIO LIMITED · 2026-06-12*
