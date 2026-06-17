# RALD SINGLE SOURCE OF TRUTH
**Generated:** June 17, 2026  
**Authority Level:** Principal Architect Directive — All engineering decisions must align with this document.

---

> This document defines the ONE authoritative system for every domain in the RALD ecosystem.  
> No team may operate a parallel system without explicit governance board approval.

---

## CORE PLATFORM SYSTEMS

### 🔐 Identity & Authentication
**Authoritative System:** `rald-auth-core`  
**URL:** `auth.rald.cloud`  
**Technology:** Hono on Cloudflare Workers + Supabase  
**What it owns:** Session management, OAuth flows, JWT issuance, SSO across all RALD products  
**All products MUST:** Redirect auth flows to `auth.rald.cloud`. Never implement local auth.  
**Retired systems:** `rald-auth-server`, `rald-auth`, `rald-shared-sdk`, `rald-auth-sdk`

---

### 🌍 Identity Resolution & Alias Routing
**Authoritative System:** `rald-alia` (GitHub Ostinato-Loop) + `rald-routing`  
**URLs:** `alia.rald.cloud` (identity layer), `routing.rald.cloud` (CF Worker routing)  
**Technology:** pnpm monorepo (15 microservices) on AWS ECS + Hono CF Worker  
**What it owns:** RALD alias resolution (`name@rald`), trust scoring, consent management, KYC routing  
**GitLab mirror:** `sekanidev/rald-alia` — deploy pipeline only, not development SSOT  
**All products MUST:** Resolve identities through `routing.rald.cloud/v1/resolve` before any transaction.

---

### 💳 Payments & Wallet
**Authoritative System:** `payrald-core`  
**URL:** `core.pay.rald.cloud`  
**Technology:** Hono on Cloudflare Workers + Supabase (`onxdcikfttdmnhofsuwo`)  
**What it owns:** Payment engine, transaction ledger, settlement logic  
**Supporting systems (not duplicates):**
- `payrald-api` → Public-facing API (`api.pay.rald.cloud`)
- `payrald-wallet` → Wallet balance & history (`wallet.pay.rald.cloud`)
- `payrald-merchant` → Merchant onboarding (`merchant.pay.rald.cloud`)
- `payrald-cards` → Virtual card issuance
- `payrald-checkout` → Checkout SDK
- `payrald-risk` → Fraud & risk scoring
- `payrald-settlements` → Reconciliation & settlements
**Retired systems:** `payrald` (JavaScript monolith, private)

---

### 💬 Messaging & Realtime
**Authoritative System:** `messenger`  
**URL:** `messenger.rald.cloud`  
**Technology:** Hono CF Worker + Supabase + Cloudflare Durable Objects  
**What it owns:** All realtime messaging, presence, channels, threads  
**Supporting systems:**
- `loop-messenger-ui-ux` → UX design only
- `rald-realtime` → Shared WebSocket/SSE primitives
**Retired systems:** All GitLab messenger-lvb repos, loop-live, ostloop

---

### 🎵 Social Audio
**Authoritative System:** `loop` + `loop-mobile`  
**URLs:** `loop.rald.cloud` (web), App Stores (mobile)  
**Technology:** TypeScript (web), Expo / React Native (mobile)  
**What it owns:** Audio rooms, follows, social graph, live audio  
**Supporting systems:**
- `loop-core` → Shared platform primitives
- `loop-crm` → Customer relationship data

---

### 🎓 Education
**Authoritative System:** `elimu`  
**URL:** `elimu.rald.cloud`  
**Technology:** TypeScript + AWS ALB + Cloudflare Pages  
**What it owns:** School management, student records, attendance, billing for schools

---

### 🚪 API Gateway
**Authoritative System:** `rald-os`  
**URL:** `api.rald.cloud`  
**Technology:** Hono on Cloudflare Workers + Supabase  
**What it owns:** Single entry point for all RALD services, rate limiting, auth middleware, request routing  
**All external integrations MUST:** Call `api.rald.cloud` — never individual service URLs directly.

---

### 📡 Event Bus / Pubsub
**Authoritative System:** `rald-event-bus`  
**URL:** `events.rald.cloud`  
**Technology:** Hono on Cloudflare Workers + Supabase  
**What it owns:** Cross-product event pipeline, DLQ, replay, event schema registry  
**All products MUST:** Publish domain events to `events.rald.cloud`. Never use direct API calls for cross-product side effects.

---

### 🔔 Notifications
**Authoritative System:** `rald-notify`  
**URL:** `notify.rald.cloud`  
**Technology:** Hono on Cloudflare Workers + Supabase  
**What it owns:** SMS, email, push — all notification delivery  
**All products MUST:** Send notifications through `rald-notify`. Never integrate directly with Twilio/SendGrid/FCM.

---

### ⚙️ Configuration & Feature Flags
**Authoritative System:** `rald-config`  
**URL:** `config.rald.cloud`  
**Technology:** Hono on Cloudflare Workers + Cloudflare KV  
**What it owns:** Feature flags, environment config, per-tenant settings  
**All products MUST:** Fetch feature flags from `rald-config` at startup. No hardcoded flags.

---

### 🛠️ SDK
**Authoritative System:** `rald-sdk` (npm: `@rald/sdk`)  
**Technology:** TypeScript pnpm monorepo  
**What it owns:** All client-facing SDK packages  
**Package map:**
- `@rald/sdk` — Core client
- `@rald/react` — React hooks (from rald-sdk-react)
- `@rald/payments` — Payment flows (from rald-sdk-payments)
- `@rald/auth` — Auth flows (from rald-auth-sdk → merge pending)
- `@rald/nextjs` — Next.js adapter (from rald-sdk-nextjs → merge pending)
- `@rald/react-native` — RN adapter (from rald-sdk-react-native → merge pending)

---

### 🏛️ Governance & Admin
**Authoritative System:** `rald-control-center`  
**URL:** `control.rald.cloud`  
**What it owns:** Cross-product admin, incident management, feature rollouts, audit logs  
**Supporting systems:**
- `rald-admin` → Executive RALDTICS dashboard (`admin.rald.cloud`)
- `rald-dev-console` → Developer portal

---

### 🧠 AI Orchestration
**Authoritative System:** `sekani-core`  
**Technology:** TypeScript — BBC + WIZMAC powered  
**What it owns:** All AI agent orchestration, voice-first interfaces, AI-driven product features  
**Supporting systems:**
- `wizmac-core` → Permanent knowledge graph
- `bbc-core` → Linguistic/cultural/voice framework
- `rald-ai` → AI APIs (moderation, recommendations)

---

### 🔍 Search
**Authoritative System:** `rald-search`  
**What it owns:** Unified search across all RALD products

---

### 📊 Analytics
**Authoritative System:** To be built — `raldtics-core` (currently stub)  
**Interim:** Sentry (error tracking) + CloudWatch (infra metrics)  
**Target:** `RALDtics` — merchant intelligence + growth analytics platform

---

### 🌐 Infrastructure
**Authoritative Systems:**
- `rald-infra` → AWS (SES, S3, CloudFront, CloudFormation)
- Cloudflare → All Workers and Pages deployments
- Supabase project `onxdcikfttdmnhofsuwo` → All financial/auth databases
- AWS ECR → Docker image registry for ALIA microservices

---

### 🎨 Design System
**Authoritative System:** `rald-design`  
**URL:** `design.rald.cloud`  
**What it owns:** Component library, tokens, animation system, brand guidelines  
**Retired:** `rald-design-system` (private) — archived

---

### 🌍 Public Web
| System | Repo | URL |
|--------|------|-----|
| Marketing site | `rald-cloud-web` | `rald.cloud` |
| Trust center | `rald-trust` | `trust.rald.cloud` |
| Status page | `rald-status` | `status.rald.cloud` |
| Developer docs | `rald-docs` | `docs.rald.cloud` |
| Design system | `rald-design` | `design.rald.cloud` |

---

## ENFORCEMENT RULES

1. **No new auth implementations.** All products authenticate via `rald-auth-core`.
2. **No direct payment processing.** All payments route through `payrald-core`.
3. **No cross-product direct API calls.** Use `rald-event-bus` for async, `rald-os` for sync.
4. **No direct notification provider calls.** Route through `rald-notify`.
5. **No separate user databases per product.** User records live in `rald-identity`/`rald-auth-core`.
6. **GitHub is the SSOT for all code.** GitLab is a deployment mirror for ALIA only.
7. **`rald-sdk` is the only official client SDK.** No other SDK packages may be published under `@rald`.
