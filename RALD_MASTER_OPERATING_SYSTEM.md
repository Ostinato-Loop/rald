# RALD MASTER OPERATING SYSTEM
**Version:** 1.0.0  
**Generated:** June 17, 2026  
**Authority:** Principal Architect / CTO  
**Classification:** Internal — All Teams

---

> This is the single operating manual for the entire RALD ecosystem.  
> When in doubt: consult this document first.  
> All decisions must align with this document or go through the Architecture Review Board.

---

## PART 1 — WHAT IS RALD?

RALD is an African-first technology group. We build the identity, financial, communications, and education infrastructure that Africa's digital economy runs on. We are a platform company — every product we ship runs on shared RALD infrastructure, so every user we gain makes the entire ecosystem more valuable.

**Our belief:** Africa doesn't need copies of Western products. Africa needs African infrastructure built for African context, languages, economies, and networks.

**Our products:**
| Product | One-liner |
|---------|-----------|
| RALD ALIA | Every African deserves a trusted digital identity |
| PayRald | Money should move as freely as a conversation |
| Loop | African voices, amplified |
| Loop Messenger | The conversation layer of the African internet |
| RALD Elimu | World-class school infrastructure for every African school |
| RALD OS | The platform everything else runs on |

---

## PART 2 — ECOSYSTEM MAP

### The Seven Layers of RALD

```
┌─────────────────────────────────────────────────────────────────────────┐
│  LAYER 7: PRODUCTS (what users see)                                     │
│  Loop, Loop Messenger, PayRald Wallet, Elimu, RALD ALIA                 │
├─────────────────────────────────────────────────────────────────────────┤
│  LAYER 6: DEVELOPER PLATFORM                                            │
│  @rald/sdk, rald-docs, rald-dev-console, rald-connect                  │
├─────────────────────────────────────────────────────────────────────────┤
│  LAYER 5: AI LAYER                                                      │
│  SEKANI (orchestration), WIZMAC (knowledge), BBC (linguistic AI)        │
├─────────────────────────────────────────────────────────────────────────┤
│  LAYER 4: FINANCIAL LAYER                                               │
│  payrald-core, payrald-wallet, payrald-merchant, payrald-risk          │
├─────────────────────────────────────────────────────────────────────────┤
│  LAYER 3: IDENTITY LAYER                                                │
│  rald-alia (15 services), rald-auth-core, rald-routing                  │
├─────────────────────────────────────────────────────────────────────────┤
│  LAYER 2: PLATFORM LAYER                                                │
│  rald-os, rald-event-bus, rald-notify, rald-config, rald-realtime      │
├─────────────────────────────────────────────────────────────────────────┤
│  LAYER 1: INFRASTRUCTURE                                                │
│  Cloudflare Workers/Pages, AWS ECS, Supabase, GitHub Actions            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## PART 3 — THE CANON (Single Sources of Truth)

Every domain has exactly ONE authoritative system. No exceptions.

| Domain | Authoritative System | URL |
|--------|---------------------|-----|
| Identity & Auth | `rald-auth-core` | auth.rald.cloud |
| Alias Resolution | `rald-routing` + `rald-alia` | routing.rald.cloud |
| Payments | `payrald-core` | core.pay.rald.cloud |
| Wallet | `payrald-wallet` | wallet.pay.rald.cloud |
| Messaging | `messenger` | messenger.rald.cloud |
| Social Audio | `loop` + `loop-mobile` | loop.rald.cloud |
| Education | `elimu` | elimu.rald.cloud |
| API Gateway | `rald-os` | api.rald.cloud |
| Event Bus | `rald-event-bus` | events.rald.cloud |
| Notifications | `rald-notify` | notify.rald.cloud |
| Feature Flags | `rald-config` | config.rald.cloud |
| SDK | `rald-sdk` | npm: @rald/sdk |
| Governance | `rald-control-center` | control.rald.cloud |
| Design System | `rald-design` | design.rald.cloud |
| Documentation | `rald-docs` | docs.rald.cloud |
| Marketing | `rald-cloud-web` | rald.cloud |
| Status | `rald-status` | status.rald.cloud |
| Infrastructure | `rald-infra` | AWS/CloudFormation |
| Code SSOT | **GitHub** `Ostinato-Loop` | github.com/Ostinato-Loop |

---

## PART 4 — GOVERNANCE STRUCTURE

```
RALD HOLDINGS (Board)
│
├── IDENTITY DIVISION      → RALD ALIA, rald-auth-core, rald-routing
├── FINANCIAL DIVISION     → PayRald (8 services)
├── EDUCATION DIVISION     → RALD Elimu
├── COMMUNICATIONS DIVISION → Loop, Loop Mobile, Messenger
├── INFRASTRUCTURE DIVISION → RALD OS, Event Bus, Notify, Config, SDK
└── AI DIVISION            → SEKANI, WIZMAC, BBC
```

**Architecture Review Board (ARB):**
- Reviews all new service proposals
- Approves cross-division integrations
- Maintains this document
- Meets: every 2 weeks

**Security Review Board (SRB):**
- Reviews all secret changes
- Reviews all IAM policy changes
- Approves new infrastructure
- Meets: monthly (+ ad hoc for P0 incidents)

---

## PART 5 — ENGINEERING STANDARDS

### Repository Standards
1. All repos live in **GitHub `Ostinato-Loop`** — this is the SSOT
2. GitLab is used **only** as a deployment mirror for `rald-alia` (not development)
3. Every new repo **must have CI** on day 1 (no stubs without code)
4. Naming: `{product}-{component}` (e.g. `payrald-wallet`, `rald-auth-core`)
5. All repos must have a `README.md` with: purpose, tech stack, deploy target, env vars

### Branch Strategy
- `main` is always deployable
- Feature branches: `feature/{ticket-id}-description`
- Hotfixes: `fix/{ticket-id}-description`
- No direct pushes to `main` — always PR

### CI/CD Requirements (per repo)
```
Required workflows:
  ci.yml       — typecheck + build + test (runs on every PR and push to main)
  deploy.yml   — deploys to production (runs on merge to main, CI must pass)
  codeql.yml   — security scanning (runs on push + weekly schedule)

Optional but recommended:
  schedule.yml — uptime monitor / health check (every 5 minutes)
  migrate.yml  — database migrations (on merge to main, before deploy)
```

### Code Standards
- **Language:** TypeScript (strict mode) for all new services
- **Runtime:** Cloudflare Workers (Hono) for stateless services; AWS ECS (Docker) for stateful
- **Database:** Supabase (PostgreSQL) — one project per division, not per service
- **Auth:** All routes validate JWT from `rald-auth-core` — no local auth
- **Events:** Cross-product side effects go through `rald-event-bus` — no direct API calls
- **Notifications:** All user-facing notifications go through `rald-notify`

---

## PART 6 — SECURITY OPERATING RULES

### The Seven Non-Negotiables
1. **No secrets in code.** All secrets go in GitHub Actions org secrets or Cloudflare Worker secrets.
2. **No JWT in localStorage.** Tokens live in memory (access) + httpOnly cookie (refresh).
3. **No wildcard CORS.** Explicitly allowlist origins per service.
4. **No direct auth.** All authentication goes through `rald-auth-core`.
5. **No raw service role keys in client code.** Service role keys are server-only.
6. **Rotate on exposure.** Any exposed credential gets rotated within 1 hour of discovery.
7. **Rate limit all auth endpoints.** Minimum: 10 req/min per IP for auth, 5 req/min for payments.

### Secrets Hierarchy
```
GitHub Org Secrets (Settings → Secrets → Actions)
├── AWS_ACCESS_KEY_ID          → rald-alia Docker builds
├── AWS_SECRET_ACCESS_KEY      → rald-alia Docker builds
├── ECR_REGISTRY               → rald-alia Docker builds
├── ALIA_RESOLUTION_ENGINE_URL → rald-routing deploy
├── CLOUDFLARE_API_TOKEN       → all CF Worker/Pages deploys (scoped)
├── CLOUDFLARE_ACCOUNT_ID      → all CF deploys
├── SUPABASE_URL               → per-division
└── SUPABASE_SERVICE_ROLE_KEY  → per-division (server-only)

Cloudflare Worker Secrets (wrangler secret put)
├── RALD_JWT_SECRET            → rald-routing, rald-auth-core
├── MACHINE_JWT_SECRET         → rald-routing (M2M, 30s TTL)
└── SUPABASE_SERVICE_ROLE_KEY  → each Worker that needs DB access
```

### Incident Response
| Severity | Response Time | Who |
|----------|--------------|-----|
| P0 (breach, outage) | 5 min alert, 15 min status update | All hands |
| P1 (degraded service) | 30 min alert, 1hr resolution target | On-call |
| P2 (non-urgent) | Next business day | Assigned engineer |

---

## PART 7 — INFRASTRUCTURE OPERATING RULES

### Cloudflare Workers
- Deploy via `wrangler deploy` from GitHub Actions **only** (no manual publishes)
- All Workers must have a `wrangler.toml` with `name` and `routes` defined
- KV namespaces must be provisioned before CI deploys
- Durable Objects used only for: realtime (messenger), stateful session (auth)

### AWS
- All containers published to **AWS ECR** (`093583252030.dkr.ecr.*.amazonaws.com`)
- ECS tasks use Fargate — no EC2 management
- SES for transactional email (via `rald-notify`)
- S3 + CloudFront for media assets (via `rald-media` when built)
- No hardcoded regions — use `AWS_REGION` env var

### Supabase
- **One Supabase project per Division** (not per service):
  - Identity Division: `rald-identity-db`
  - Financial Division: `rald-financial-db` (currently `onxdcikfttdmnhofsuwo`)
  - Communications Division: `rald-comms-db`
  - Education Division: `rald-edu-db`
- All schema changes via migration files committed to the repo
- Row Level Security (RLS) enabled on all user-facing tables
- Service role key = server-only (never in client code)

### DNS (Cloudflare)
All RALD services use `*.rald.cloud` subdomains managed via Cloudflare DNS.

| Subdomain | Service |
|-----------|---------|
| rald.cloud | Marketing |
| api.rald.cloud | RALD OS |
| auth.rald.cloud | RALD Auth |
| alia.rald.cloud | RALD ALIA |
| routing.rald.cloud | ALIA Routing |
| events.rald.cloud | Event Bus |
| notify.rald.cloud | Notifications |
| config.rald.cloud | Config/Flags |
| control.rald.cloud | Control Center |
| admin.rald.cloud | Admin Console |
| dev.rald.cloud | Dev Console |
| design.rald.cloud | Design System |
| docs.rald.cloud | Documentation |
| status.rald.cloud | Status Page |
| trust.rald.cloud | Trust Center |
| loop.rald.cloud | Loop Social Audio |
| messenger.rald.cloud | Loop Messenger |
| elimu.rald.cloud | RALD Elimu |
| wallet.rald.cloud | PayRald Wallet (consumer) |
| core.pay.rald.cloud | PayRald Core |
| api.pay.rald.cloud | PayRald API |
| merchant.pay.rald.cloud | PayRald Merchant |

---

## PART 8 — PRODUCT OPERATING RULES

### How a New Feature Ships
```
1. Engineer creates feature branch from main
2. PR opened → CI runs (typecheck + build + test)
3. Code review (1 reviewer for infra, 2 for financial/identity)
4. PR merged → CI passes → deploy workflow fires
5. Production deploy → health check → done
6. Any failure → automatic rollback to previous deploy
```

### How a New Service is Born
```
1. ARB approves the service (validates it doesn't duplicate existing)
2. Engineer bootstraps from template (Hono CF Worker or Node.js Express)
3. wrangler.toml created with route and name
4. CI workflow added (ci.yml + deploy.yml)
5. Secret provisioned in GitHub org secrets + CF Worker secrets
6. Service registered in rald-os routing table
7. Domain added to Cloudflare DNS
8. Added to RALD_ECOSYSTEM_INVENTORY.md
```

### How a Repo Gets Archived
```
1. ARB confirms the repo is truly redundant/deprecated
2. Final commit: add ARCHIVED.md explaining what replaced it
3. GitHub repo archived (Settings → Archive)
4. Remove from all CI dependency chains
5. Update RALD_ECOSYSTEM_INVENTORY.md status to Archive
```

---

## PART 9 — CURRENT STATUS DASHBOARD

**As of June 17, 2026**

| Product | CI | Deploy | Beta Ready | Score |
|---------|-----|--------|-----------|-------|
| 🔐 RALD ALIA | ❌ Docker failing | ❌ Not deployed | ❌ 3 weeks | 54/100 |
| 💳 PayRald | ✅ Green | ✅ Live | ❌ 2 weeks | 55/100 |
| 🎵 Loop | ✅ Green | ✅ Live | ⚠️ 1 week | 74/100 |
| 💬 Messenger | ✅ Green | ✅ Live | ⚠️ 1 week | 75/100 |
| 🎓 Elimu | ✅ Green | ✅ Live | ❌ 3 weeks | 63/100 |
| 🔵 RALD OS | ✅ Green | ✅ Live | ✅ Now | 80/100 |
| 🤖 AI Division | ❌ No CI | ❌ Not deployed | ❌ Future | 9/100 |

**Active P0 Blockers:**
1. 🔴 SEC-P0-001 — Rotate exposed Supabase key (loop-messenger-lvb GitLab)
2. 🔴 SEC-P0-002 — Add AWS ECR secrets → fix ALIA Docker builds
3. 🔴 SEC-P0-003 — Fix GitLab rald-alia pipeline (5 consecutive failures)
4. 🔴 B03 — Seed missing Supabase tables (payrald-core: otp_codes, user_devices, etc.)
5. 🔴 B04 — rald-routing CF Worker blocked (ALIA_RESOLUTION_ENGINE_URL not set)

---

## PART 10 — 90-DAY OPERATING PLAN

### WEEK 1–2: FIX THE FOUNDATION
- [ ] Rotate exposed Supabase key (Day 1)
- [ ] Add AWS ECR secrets to GitHub → trigger ALIA Docker builds
- [ ] Fix GitLab rald-alia CI (likely missing CI variables)
- [ ] Create missing PayRald Supabase tables
- [ ] Fix rald-admin CI (Node.js 24 npm crash)
- [ ] Archive 38 stub repos (batch operation)
- [ ] Move JWT from localStorage to httpOnly cookie (payrald-ui-ux)

### WEEK 3–4: CERTIFY LOOP + MESSENGER
- [ ] Loop beta certification: complete DR plan + Supabase backup
- [ ] Messenger beta certification: rate limiting + DR plan
- [ ] Enable rate limiting on payrald-api auth endpoints
- [ ] Lock CORS on rald-control-center
- [ ] Fix CF Pages domain workflow for payrald-ui-ux
- [ ] Update all GitHub Actions to Node.js 24-compatible versions

### MONTH 2: ALIA PRODUCTION
- [ ] ALIA services deployed to AWS ECS (all 15 containers)
- [ ] ALIA_RESOLUTION_ENGINE_URL set → rald-routing live
- [ ] PayRald beta certification complete
- [ ] ALIA beta certification complete
- [ ] Merge rald-sdk-react, rald-sdk-payments into rald-sdk
- [ ] Separate Supabase projects per division

### MONTH 3: PUBLIC BETA
- [ ] Loop public launch
- [ ] Messenger public launch
- [ ] PayRald Nigeria launch
- [ ] RALD ALIA developer API launch
- [ ] @rald/sdk published to npm
- [ ] rald-docs fully populated
- [ ] First external developer integrations
- [ ] Pre-seed fundraise close

### MONTH 6: SERIES A PREPARATION
- [ ] 10,000 RALD identities created
- [ ] 1,000 PayRald transactions processed
- [ ] 50 schools on Elimu
- [ ] SEKANI AI integration in Loop (voice-first features)
- [ ] RALDtics analytics platform live
- [ ] Nigerian fintech regulatory compliance complete
- [ ] External security audit complete
- [ ] Series A deck + data room ready

---

## PART 11 — REFERENCE DOCUMENTS

| Document | Purpose |
|----------|---------|
| `RALD_ECOSYSTEM_INVENTORY.md` | Complete repo-by-repo inventory with classification |
| `RALD_DUPLICATE_ANALYSIS.md` | All duplicates with Keep/Merge/Archive recommendations |
| `RALD_SOURCE_OF_TRUTH.md` | Authoritative system for every domain |
| `SECURITY_GOVERNANCE_REPORT.md` | All security findings P0/P1/P2 with fixes |
| `RALD_GOVERNANCE_STRUCTURE.md` | Division structure, product mapping, processes |
| `INFRASTRUCTURE_CONSOLIDATION_PLAN.md` | What stays/moves/is eliminated in infrastructure |
| `RALD_PUBLIC_BETA_CERTIFICATION.md` | Per-product beta readiness scores |
| `RALD_PRESEED_DUE_DILIGENCE_PACKAGE.md` | Investor-facing architecture and risk report |
| `RALD_MASTER_OPERATING_SYSTEM.md` | **This document** — the operating manual |

---

*This document is maintained by the Architecture Review Board. All proposed changes require ARB approval. Version history tracked in GitHub.*

**Next review:** July 17, 2026  
**Document owner:** Principal Architect / CTO Office  
**Distribution:** All RALD engineering and leadership teams
