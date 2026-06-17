# RALD ECOSYSTEM INVENTORY
**Generated:** June 17, 2026 | **Principal Architect:** Governance Scan  
**Total Repositories:** 115 GitHub + 14 GitLab = 129 repos  
**Active Products:** 8 | **Divisions:** 6 | **Stub Repos:** 33 | **Deprecated/Archive Candidates:** 12

---

## CLASSIFICATION KEY
| Symbol | Status |
|--------|--------|
| 🟢 | Production |
| 🟡 | Beta |
| 🔵 | Internal / Platform |
| 🔶 | Prototype |
| 🔴 | Duplicate |
| ⚫ | Deprecated |
| 📦 | Archive Candidate (stub, no code) |

---

## DIVISION 1 — IDENTITY & ROUTING (RALD ALIA)

| Repo | Product | Language | Framework | Deploy Target | Production URL | CI/CD | Status | Classification |
|------|---------|----------|-----------|--------------|----------------|-------|--------|----------------|
| `rald-alia` (GH) | RALD ALIA — Financial Identity Network | TypeScript | Hono / Express / pnpm monorepo | AWS ECS (Docker) + CF Pages | alia.rald.cloud | ❌ Docker push failing (ECR secrets) | Active | 🟡 Beta |
| `sekanidev/rald-alia` (GL) | RALD ALIA mirror | TypeScript | pnpm monorepo | GitLab CI → AWS | alia.rald.cloud | ❌ Pipeline failing (5 consecutive) | Active | 🟡 Beta |
| `rald-routing` | ALIA Routing Engine | TypeScript | Hono (CF Worker) | Cloudflare Workers | routing.rald.cloud | ✅ Green | Active | 🟡 Beta |
| `rald-auth-core` | RALD Auth V1 | TypeScript | Hono (CF Worker) | Cloudflare Workers + Supabase | auth.rald.cloud | ✅ Green | Active | 🟡 Beta |
| `rald-auth-ui` | RALD Auth UI | HTML/JS | Vanilla | Cloudflare Pages | auth.rald.cloud (UI) | ✅ Green | Active | 🟡 Beta |
| `rald-identity` | RALD Identity — Unified Profiles | TypeScript | React | Cloudflare Pages | identity.rald.cloud | ✅ Green | Active | 🟡 Beta |
| `alia-ui-ux` | RALD ALIA Frontend | TypeScript | React/Vite | Cloudflare Pages | alia.rald.cloud | ✅ Green | Active | 🟡 Beta |
| `sekanidev/rald-alia-ui-ux` (GL) | ALIA UI mirror | TypeScript | React/Vite | GitLab | — | No CI | Dormant | 🔴 Duplicate |
| `rald-auth-sdk` (private) | Auth SDK | TypeScript | — | npm | @rald/auth-sdk | No CI | Dormant | 🔴 Duplicate → merge to rald-sdk |
| `rald-auth-server` | Auth Server V1 | — | — | — | — | No CI | Empty | 📦 Archive |
| `rald-auth` | Auth placeholder | — | — | — | — | No CI | Stub | 📦 Archive |
| `rald-infrastructure` (private) | Auth V1 Infra | Shell | CloudFormation | AWS | — | No CI | Legacy | ⚫ Deprecated |

**Secrets Used:** `RALD_JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `MACHINE_JWT_SECRET`, `ALIA_RESOLUTION_ENGINE_URL`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `CI_REGISTRY_USER`, `CI_REGISTRY_PASSWORD`  
**Databases:** PostgreSQL (self-hosted Docker), Redis (self-hosted Docker), Supabase (auth flows)

---

## DIVISION 2 — FINANCIAL SERVICES (PAYRALD)

| Repo | Product | Language | Framework | Deploy Target | Production URL | CI/CD | Status | Classification |
|------|---------|----------|-----------|--------------|----------------|-------|--------|----------------|
| `payrald-core` | PayRald Core Payment Engine | TypeScript | Hono (CF Worker) | Cloudflare Workers + Supabase | core.pay.rald.cloud | ✅ Green | Active | 🟡 Beta |
| `payrald-api` | PayRald Public API | TypeScript | Hono (CF Worker) | Cloudflare Workers + Supabase | api.pay.rald.cloud | ✅ Green | Active | 🟡 Beta |
| `payrald-wallet` | PayRald Wallet & Balance | TypeScript | Hono (CF Worker) | Cloudflare Workers | wallet.pay.rald.cloud | ✅ Green | Active | 🟡 Beta |
| `payrald-merchant` | Merchant Onboarding | TypeScript | Hono (CF Worker) | Cloudflare Workers | merchant.pay.rald.cloud | ✅ Green | Active | 🟡 Beta |
| `payrald-cards` | Virtual Cards | TypeScript | Hono (CF Worker) | Cloudflare Workers | cards.pay.rald.cloud | ✅ Green | Active | 🟡 Beta |
| `payrald-checkout` | Checkout SDK | TypeScript | Hono (CF Worker) | Cloudflare Workers | checkout.pay.rald.cloud | ✅ Green | Active | 🟡 Beta |
| `payrald-risk` | Fraud & Risk Engine | TypeScript | Hono (CF Worker) | Cloudflare Workers | risk.pay.rald.cloud | ✅ Green | Active | 🟡 Beta |
| `payrald-settlements` | Settlements & Reconciliation | TypeScript | Hono (CF Worker) | Cloudflare Workers | settlements.pay.rald.cloud | ✅ Green | Active | 🟡 Beta |
| `payrald-your-digital-wallet` | PayRald Consumer App | TypeScript | React/Vite | Cloudflare Pages | wallet.rald.cloud | ✅ Green | Active | 🟡 Beta |
| `payrald-ui-ux` | PayRald Design/UX | TypeScript | React/Vite | Cloudflare Pages | app.pay.rald.cloud | ✅ Green | Active | 🟡 Beta |
| `payrald` (private) | PayRald Monolith V0 | JavaScript | — | — | — | No CI | Legacy | ⚫ Deprecated |
| `payrald-admin` | PayRald Admin Panel | — | — | — | — | No CI | Stub | 📦 Archive |

**Secrets Used:** `SUPABASE_URL` (onxdcikfttdmnhofsuwo.supabase.co), `SUPABASE_SERVICE_ROLE_KEY`, `ROUTING_URL`, `EVENT_BUS_URL`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`  
**Databases:** Supabase (PostgreSQL) — shared project `onxdcikfttdmnhofsuwo`

---

## DIVISION 3 — COMMUNICATIONS (LOOP)

| Repo | Product | Language | Framework | Deploy Target | Production URL | CI/CD | Status | Classification |
|------|---------|----------|-----------|--------------|----------------|-------|--------|----------------|
| `loop` | Loop Social Audio Platform | TypeScript | — | Cloudflare / AWS | loop.rald.cloud | ✅ Green | Active | 🟡 Beta |
| `loop-mobile` | Loop iOS & Android App | TypeScript | Expo / React Native | App Stores | iOS + Android | ✅ Green | Active | 🟡 Beta |
| `messenger` | Loop Messenger — Realtime | TypeScript | Hono (CF Worker) + Supabase | Cloudflare Workers + Pages | messenger.rald.cloud | ✅ Green | Active | 🟡 Beta |
| `loop-core` | Loop Core Platform | TypeScript | — | Cloudflare | — | ✅ Green | Active | 🔵 Internal |
| `loop-crm` | Loop CRM | TypeScript | — | Cloudflare | — | No CI | Prototype | 🔶 Prototype |
| `loop-messenger-ui-ux` | Messenger UX | TypeScript | React/Vite | Cloudflare Pages | — | No CI | Design | 🔶 Prototype |
| `loop-audio-ui-ux` | Audio UI | TypeScript | React/Vite | — | — | No CI | Design | 🔶 Prototype |
| `loop-business-8cbd0eb1` (private) | Loop Business Fork | TypeScript | — | — | — | No CI | Artifact | ⚫ Deprecated |
| `loop-business` | Loop Business Storefront | — | — | — | — | No CI | Stub | 📦 Archive |
| `loop-admin` | Loop Admin Dashboard | — | — | — | — | No CI | Stub | 📦 Archive |
| `loop-voice` | Loop Voice / SIP | — | — | — | — | No CI | Stub | 📦 Archive |
| `loop-dispatch` | Nigerian Last-Mile Delivery | — | — | — | — | No CI | Stub | 📦 Archive |
| `loop-domains` | Hosted Domains | — | — | — | — | No CI | Stub | 📦 Archive |
| `loop-logistics` | Logistics & Shipping | — | — | — | — | No CI | Stub | 📦 Archive |
| `loop-meta-cloud` | Meta Cloud Infra | — | — | — | — | No CI | Stub | 📦 Archive |
| `loop-storefronts` | Hosted Storefronts | — | — | — | — | No CI | Stub | 📦 Archive |
| `Hanzosekani/loop-messenger-lvb` (GL) | Messenger LVB (old) | — | — | GitLab | — | No CI | Legacy | ⚫ Deprecated |
| `sekanidev/loop-messenger-lvb` (GL) | Messenger LVB dup | — | — | GitLab | — | No CI | Legacy | ⚫ Deprecated |
| `sekanidev/loop-messenger-private-32a6527d` (GL) | Messenger Private Fork | — | — | GitLab | — | No CI | Legacy | ⚫ Deprecated |
| `sekanidev/Loop` (GL) | Loop V0 | — | — | GitLab | — | No CI | Legacy | ⚫ Deprecated |
| `Hanzosekani/ostloop` (GL) | OstLoop | — | — | GitLab | — | No CI | Legacy | ⚫ Deprecated |
| `sekanidev/ostloop` (GL) | OstLoop dup | — | — | GitLab | — | No CI | Legacy | ⚫ Deprecated |
| `sekanidev/loop-live` (GL) | Loop Live | — | — | GitLab | — | No CI | Legacy | ⚫ Deprecated |

**Secrets Used:** Supabase credentials, Cloudflare API token, various deploy secrets  
**Databases:** Supabase (PostgreSQL), Cloudflare KV, Cloudflare Durable Objects (realtime)

---

## DIVISION 4 — EDUCATION (RALD ELIMU)

| Repo | Product | Language | Framework | Deploy Target | Production URL | CI/CD | Status | Classification |
|------|---------|----------|-----------|--------------|----------------|-------|--------|----------------|
| `elimu` | RALD Elimu — School ERP | TypeScript | — | AWS ALB + CF Pages | elimu.rald.cloud | ✅ Green | Active | 🟡 Beta |
| `rald-elimu-ui-ux` (private) | Elimu UX | TypeScript | React/Vite | Cloudflare Pages | — | No CI | Design | 🔶 Prototype |

**Databases:** AWS RDS / Supabase (TBD)

---

## DIVISION 5 — PLATFORM / INFRASTRUCTURE

| Repo | Product | Language | Framework | Deploy Target | Production URL | CI/CD | Status | Classification |
|------|---------|----------|-----------|--------------|----------------|-------|--------|----------------|
| `rald-os` | RALD OS — API Gateway | TypeScript | Hono (CF Worker) | Cloudflare Workers | api.rald.cloud | ✅ Green | Active | 🔵 Internal |
| `rald-platform` | RALD Platform Monorepo | TypeScript | pnpm monorepo | Cloudflare | — | ✅ Green | Active | 🔵 Internal |
| `rald-event-bus` | Event Bus (NATS/pubsub) | TypeScript | Hono (CF Worker) | Cloudflare Workers | events.rald.cloud | ✅ Green | Active | 🔵 Internal |
| `rald-notify` | Notifications (SMS/Email/Push) | TypeScript | Hono (CF Worker) | Cloudflare Workers | notify.rald.cloud | ✅ Green | Active | 🔵 Internal |
| `rald-config` | Feature Flags & Config | TypeScript | Hono (CF Worker) | Cloudflare Workers | config.rald.cloud | ✅ Green | Active | 🔵 Internal |
| `rald-sdk` | @rald/sdk — Ecosystem SDK | TypeScript | — | npm registry | @rald/sdk | ✅ Green | Active | 🔵 Internal |
| `rald-sdk-react` | React SDK | TypeScript | React | npm | @rald/react | ✅ Green | Active | 🔵 Internal |
| `rald-sdk-payments` | Payments SDK | TypeScript | — | npm | @rald/payments | ✅ Green | Active | 🔵 Internal |
| `rald-api-core` | Shared API Gateway | TypeScript | — | Cloudflare | — | No CI | Active | 🔵 Internal |
| `rald-realtime` | WebSockets & SSE | TypeScript | — | Cloudflare | — | No CI | Active | 🔵 Internal |
| `rald-search` | Search Engine | TypeScript | — | Cloudflare | — | No CI | Active | 🔵 Internal |
| `rald-inbox` | Unified Inbox | TypeScript | — | Cloudflare | inbox.rald.cloud | No CI | Active | 🔵 Internal |
| `rald-admin` | Admin Console | TypeScript | React/Vite | Cloudflare Pages | admin.rald.cloud | ❌ npm/Node24 crash | Active | 🔵 Internal |
| `rald-control-center` | Unified Command Plane | TypeScript | React/Vite | Cloudflare Pages | control.rald.cloud | ✅ Green | Active | 🔵 Internal |
| `rald-dev-console` | Developer Portal | TypeScript | — | Cloudflare Pages | dev.rald.cloud | No CI | Active | 🔵 Internal |
| `rald-infra` | AWS Infrastructure | — | CloudFormation | AWS | — | No CI | Active | 🔵 Internal |
| `rald-workflows` | Async Job Orchestration | — | — | Cloudflare | — | No CI | Prototype | 🔶 Prototype |
| `rald-trust` | Public Trust Center | TypeScript | Hono (CF Worker) | Cloudflare | trust.rald.cloud | ✅ Green | Active | 🟢 Production |
| `rald-status` | Status Page | TypeScript | Hono (CF Worker) | Cloudflare | status.rald.cloud | ✅ Green | Active | 🟢 Production |
| `rald-docs` | Developer Docs | TypeScript | Hono (CF Worker) | Cloudflare | docs.rald.cloud | ✅ Green | Active | 🟢 Production |
| `rald-cloud-web` | Marketing Site | TypeScript | — | Cloudflare Pages | rald.cloud | ✅ Green | Active | 🟢 Production |
| `rald-connect` | WordPress Plugin | PHP | WordPress | wordpress.org / direct | — | No CI | Active | 🔵 Internal |
| `rald-design` | Design System | TypeScript | — | Cloudflare | design.rald.cloud | No CI | Active | 🔵 Internal |
| `rald-identity` | Identity Profiles | TypeScript | React | Cloudflare Pages | identity.rald.cloud | ✅ Green | Active | 🔵 Internal |
| `rald-media` | Media CDN | — | — | AWS S3/CloudFront | — | No CI | Stub | 📦 Archive |
| `rald-mobile-core` | React Native Foundation | — | — | — | — | No CI | Stub | 📦 Archive |
| `rald-data-core` | Event Streaming Pipeline | — | — | — | — | No CI | Stub | 📦 Archive |
| `rald-compliance` | AML & Regulatory | — | — | — | — | No CI | Stub | 📦 Archive |
| `rald-growth` | Referrals & Growth | — | — | — | — | No CI | Stub | 📦 Archive |
| `rald-i18n` | Internationalisation | — | — | — | — | No CI | Stub | 📦 Archive |
| `rald-support` | Help Desk | — | — | — | — | No CI | Stub | 📦 Archive |
| `rald-billing` | Subscriptions & Invoicing | — | — | — | — | No CI | Stub | 📦 Archive |
| `rald-console` (private) | Developer Console | — | — | — | — | No CI | Stub | 📦 Archive |
| `rald-events` (private) | EventBridge | — | — | — | — | No CI | Legacy | ⚫ Deprecated |
| `rald-observability` | Observability (private) | — | — | — | — | No CI | Stub | 📦 Archive |
| `rald-fraud` | Fraud Detection | — | — | — | — | No CI | Stub | 📦 Archive |
| `rald-secrets` | Secrets Rotation | — | — | — | — | No CI | Stub | 📦 Archive |
| `rald-ai-memory` | AI Memory | — | — | — | — | No CI | Stub | 📦 Archive |
| `waiting-room` (private) | Waitlist App | TypeScript | React/Vite | Cloudflare Pages | — | No CI | Prototype | 🔶 Prototype |
| `rald` | Ecosystem Architecture Docs | TypeScript | — | — | — | No CI | Docs Repo | 🔵 Internal |

---

## DIVISION 6 — AI LAYER (SEKANI / WIZMAC / BBC)

| Repo | Product | Language | Framework | Deploy Target | Production URL | CI/CD | Status | Classification |
|------|---------|----------|-----------|--------------|----------------|-------|--------|----------------|
| `sekani-core` (private) | SEKANI — AI Orchestration | TypeScript | — | — | — | ❌ No CI | Active | 🔶 Prototype |
| `wizmac-core` (private) | WIZMAC — Knowledge Graph | TypeScript | — | — | — | No CI | Active | 🔶 Prototype |
| `bbc-core` (private) | BBC — Linguistic AI Framework | TypeScript | — | — | — | No CI | Active | 🔶 Prototype |
| `rald-ai` (private) | RALD AI APIs | TypeScript | — | — | — | No CI | Active | 🔶 Prototype |
| `rald-ai-ui-ux` (private) | RALD AI UI | TypeScript | React/Vite | — | — | No CI | Design | 🔶 Prototype |

---

## DIVISION 7 — ANALYTICS (RALDTICS)

| Repo | Product | Language | Framework | Deploy Target | CI/CD | Status | Classification |
|------|---------|----------|-----------|--------------|-------|--------|----------------|
| `raldtics` (private) | RALDtics Analytics | — | — | — | No CI | Stub | 📦 Archive |
| `raldtics-core` | Analytics Core | — | — | — | No CI | Stub | 📦 Archive |
| `raldtics-ai` | AI Summaries | — | — | — | No CI | Stub | 📦 Archive |
| `raldtics-events` | Event Tracking | — | — | — | No CI | Stub | 📦 Archive |
| `raldtics-growth` | Growth Analytics | — | — | — | No CI | Stub | 📦 Archive |
| `raldtics-insights` | Merchant Intelligence | — | — | — | No CI | Stub | 📦 Archive |

---

## GITRALD — CI/CD PLATFORM (All Stubs)

| Repo | Description | Status |
|------|------------|--------|
| `gitrald-core` | CI/CD orchestration core | 📦 Stub |
| `gitrald-deploy` | Deploy engine | 📦 Stub |
| `gitrald-memory` | AI memory & context | 📦 Stub |
| `gitrald-monitor` | Deployment monitor | 📦 Stub |
| `gitrald-observability` | Telemetry | 📦 Stub |
| `gitrald-runner` | Workflow runner | 📦 Stub |
| `gitrald-security` | Secret scanning | 📦 Stub |
| `gitrald-ai` | AI agent | 📦 Stub |
| `gitrald-ui-ux` | UI scaffold | 📦 Stub |

---

## SDK ECOSYSTEM

| Repo | Purpose | Status |
|------|---------|--------|
| `rald-sdk` | Primary unified SDK (@rald/sdk) | ✅ Active |
| `rald-sdk-react` | React bindings | ✅ Active |
| `rald-sdk-payments` | Payments bindings | ✅ Active |
| `rald-sdk-auth` | Auth bindings | 📦 Stub — fold into rald-sdk |
| `rald-sdk-nextjs` | Next.js bindings | 📦 Stub — fold into rald-sdk |
| `rald-sdk-messaging` | Messaging bindings | 📦 Stub — fold into rald-sdk |
| `rald-sdk-logistics` | Logistics bindings | 📦 Stub — fold into rald-sdk |
| `rald-sdk-react-native` | RN bindings | 📦 Stub — fold into rald-sdk |
| `rald-shared-sdk` (private) | Legacy shared SDK | ⚫ Deprecated |

---

## UI/UX DESIGN REPOS

| Repo | Product | Status |
|------|---------|--------|
| `rald-app-ui-ux` | RALD App general UX | 🔶 Prototype |
| `rald-cinder-ui-ux` (private) | Cinder UX (unknown product) | 🔶 Prototype |
| `rald-dispatch-ui-ux` | Dispatch UX | 🔶 Prototype |
| `rald-mail-ui-ux` | Mail UX | 🔶 Prototype |
| `rald-memories-ui-ux` | Memories feature UX | 🔶 Prototype |
| `rald-pro-ui-ux-v1` (private) | RALD Pro UX | 🔶 Prototype |
| `rald-tv-ui-ux` (private) | RALD TV UX | 🔶 Prototype |
| `rald-loop-business` (private) | Loop Business UX | ⚫ Deprecated |
| `rald-design-system` (private) | Design system V0 | ⚫ Deprecated → superseded by rald-design |

---

## GITLAB-ONLY REPOS (Not mirrored to GitHub)

| Repo | Owner | Status | Verdict |
|------|-------|--------|---------|
| `Hanzosekani/watchvii-docs` | Personal | Dormant | ❌ Not RALD ecosystem |
| `Hanzosekani/watchvii-infra` | Personal | Dormant | ❌ Not RALD ecosystem |
| `Hanzosekani/watchvii-ai` | Personal | Dormant | ❌ Not RALD ecosystem |
| `Hanzosekani/watchvii-flutterflow` | Personal | Dormant | ❌ Not RALD ecosystem |
| `sekanidev/easy-git-push` | Personal | Dormant | ❌ Utility script |
| `sekanidev/loop-live` | Personal | Legacy | ⚫ Deprecated |
| `sekanidev/ostloop` | Personal | Legacy | ⚫ Deprecated |
| `sekanidev/Loop` | Personal | Legacy | ⚫ Deprecated |

---

## SUMMARY STATISTICS

| Category | Count |
|----------|-------|
| 🟢 Production | 4 |
| 🟡 Beta (active, not yet GA) | 21 |
| 🔵 Internal/Platform | 22 |
| 🔶 Prototype | 12 |
| 🔴 Duplicate | 4 |
| ⚫ Deprecated | 11 |
| 📦 Archive Candidate (stubs) | 38 |
| ❌ Not RALD ecosystem (GitLab personal) | 5 |
| **Total** | **117** |
