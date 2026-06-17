# RALD ECOSYSTEM GOVERNANCE STRUCTURE
**Generated:** June 17, 2026  
**Model:** Three-tier corporate technology group  
**Authority:** Board → Holdings → Divisions → Products

---

```
┌─────────────────────────────────────────────────────────────────┐
│                        RALD HOLDINGS                            │
│              (Ostinato Loop — GitHub Organization)              │
│         Board of Directors / CTO / Principal Architect          │
└────────────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
  Platform Core     Products         Infrastructure
```

---

## LEVEL 1 — RALD HOLDINGS

**Legal entity:** Ostinato Loop  
**GitHub Org:** `github.com/Ostinato-Loop`  
**GitLab:** `gitlab.com/sekanidev` (deploy mirror for ALIA)  
**Principal systems:** `rald-os` (api.rald.cloud), `rald-platform`, `rald-control-center`  
**Governance artifacts:** `rald` (architecture docs), `RALD_MASTER_OPERATING_SYSTEM.md`

**Governance bodies:**
- **Architecture Review Board (ARB)** — Reviews all new services and cross-product integrations
- **Security Review Board (SRB)** — Reviews all secret changes, IAM policies, and infrastructure changes
- **Product Portfolio Committee (PPC)** — Approves new product ideas vs. consolidation

---

## LEVEL 2 — DIVISIONS

### DIVISION 1: IDENTITY DIVISION
**Mission:** Own and govern all identity, authentication, alias resolution, trust, and consent across the ecosystem  
**Head system:** `rald-alia` + `rald-auth-core`  
**Motto:** *Every person in Africa deserves a trusted digital identity.*

| Repo | Role | Status |
|------|------|--------|
| `rald-alia` | Identity Network — 15 microservices | 🟡 Beta |
| `rald-auth-core` | Auth engine (CF Worker) | 🟡 Beta |
| `rald-auth-ui` | Auth UI | 🟡 Beta |
| `rald-routing` | ALIA routing engine | 🟡 Beta |
| `rald-identity` | Unified profile store | 🟡 Beta |
| `alia-ui-ux` | Frontend | 🟡 Beta |
| `rald-trust` | Public trust center | 🟢 Production |

**Internal ALIA services (within rald-alia monorepo):**
`identity-service`, `alias-service`, `directory-service`, `resolution-engine`, `routing-service`, `fraud-service`, `audit-service`, `notification-service`, `governance-service`, `consent-service`, `trust-service`, `merchant-service`, `verification-service`, `developer-service`, `registry-service`, `control-plane`, `institution-service`, `gateway`, `loop-voice`

---

### DIVISION 2: FINANCIAL DIVISION
**Mission:** African-first payment infrastructure — wallets, virtual cards, merchant payments, settlements  
**Head system:** `payrald-core`  
**Motto:** *Money should move as freely as a conversation.*

| Repo | Role | Status |
|------|------|--------|
| `payrald-core` | Core payment engine | 🟡 Beta |
| `payrald-api` | Public API | 🟡 Beta |
| `payrald-wallet` | Wallet & balance | 🟡 Beta |
| `payrald-merchant` | Merchant onboarding | 🟡 Beta |
| `payrald-cards` | Virtual card issuance | 🟡 Beta |
| `payrald-checkout` | Checkout SDK | 🟡 Beta |
| `payrald-risk` | Fraud & risk engine | 🟡 Beta |
| `payrald-settlements` | Settlements & reconciliation | 🟡 Beta |
| `payrald-your-digital-wallet` | Consumer wallet app | 🟡 Beta |
| `payrald-ui-ux` | Merchant dashboard | 🟡 Beta |

---

### DIVISION 3: EDUCATION DIVISION
**Mission:** African-first education operating system for schools  
**Head system:** `elimu`  
**Motto:** *Every African child deserves world-class school infrastructure.*

| Repo | Role | Status |
|------|------|--------|
| `elimu` | School Management ERP | 🟡 Beta |
| `rald-elimu-ui-ux` | Elimu UX | 🔶 Prototype |

---

### DIVISION 4: COMMUNICATIONS DIVISION
**Mission:** Social audio, realtime messaging, and community infrastructure for Africa  
**Head system:** `loop` + `messenger`  
**Motto:** *African voices, amplified.*

| Repo | Role | Status |
|------|------|--------|
| `loop` | Social audio platform | 🟡 Beta |
| `loop-mobile` | iOS & Android app | 🟡 Beta |
| `loop-core` | Platform primitives | 🔵 Internal |
| `messenger` | Realtime messaging | 🟡 Beta |
| `loop-messenger-ui-ux` | Messenger UX | 🔶 Prototype |
| `loop-crm` | Customer relationships | 🔶 Prototype |
| `loop-audio-ui-ux` | Audio UI | 🔶 Prototype |

---

### DIVISION 5: INFRASTRUCTURE DIVISION
**Mission:** Platform backbone — API gateway, event bus, config, SDK, notifications, observability  
**Head system:** `rald-os`  
**Motto:** *The plumbing that makes Africa's digital future run.*

| Repo | Role | Status |
|------|------|--------|
| `rald-os` | API Gateway | 🔵 Internal |
| `rald-platform` | Monorepo | 🔵 Internal |
| `rald-event-bus` | Event streaming | 🔵 Internal |
| `rald-notify` | Notifications | 🔵 Internal |
| `rald-config` | Feature flags | 🔵 Internal |
| `rald-sdk` | Ecosystem SDK | 🔵 Internal |
| `rald-sdk-react` | React SDK | 🔵 Internal |
| `rald-sdk-payments` | Payments SDK | 🔵 Internal |
| `rald-realtime` | WebSockets/SSE | 🔵 Internal |
| `rald-search` | Search | 🔵 Internal |
| `rald-inbox` | Unified inbox | 🔵 Internal |
| `rald-api-core` | API primitives | 🔵 Internal |
| `rald-workflows` | Job orchestration | 🔶 Prototype |
| `rald-admin` | Admin console | 🔵 Internal |
| `rald-control-center` | Command plane | 🔵 Internal |
| `rald-dev-console` | Developer portal | 🔵 Internal |
| `rald-infra` | AWS infrastructure | 🔵 Internal |
| `rald-connect` | WordPress plugin | 🔵 Internal |
| `rald-design` | Design system | 🔵 Internal |
| `rald-cloud-web` | Marketing site | 🟢 Production |
| `rald-trust` | Trust center | 🟢 Production |
| `rald-status` | Status page | 🟢 Production |
| `rald-docs` | Developer docs | 🟢 Production |
| `rald-identity` | Identity profiles | 🔵 Internal |

**Future build-out (stub repos):**
`raldtics-core`, `raldtics-*` (analytics), `rald-media` (CDN), `rald-data-core` (streaming), `rald-compliance` (AML), `rald-billing` (subscriptions), `rald-growth` (referrals), `rald-i18n` (localisation), `rald-support` (helpdesk)

---

### DIVISION 6: AI DIVISION
**Mission:** AI orchestration, permanent knowledge, and African-cultural voice AI  
**Head system:** `sekani-core`  
**Motto:** *Intelligence that understands Africa.*

| Repo | Role | Status |
|------|------|--------|
| `sekani-core` | AI orchestration | 🔶 Prototype |
| `wizmac-core` | Permanent knowledge graph | 🔶 Prototype |
| `bbc-core` | Linguistic/cultural/voice AI | 🔶 Prototype |
| `rald-ai` | AI APIs | 🔶 Prototype |
| `rald-ai-ui-ux` | AI UI | 🔶 Prototype |

---

## LEVEL 3 — PRODUCT MAP

```
RALD HOLDINGS
│
├── IDENTITY DIVISION
│   ├── RALD ALIA (Financial Identity Network)
│   ├── RALD Auth (SSO & OAuth)
│   └── ALIA Routing Engine
│
├── FINANCIAL DIVISION
│   ├── PayRald Core (Payment Engine)
│   ├── PayRald Wallet (Consumer)
│   ├── PayRald Merchant (Business)
│   ├── PayRald Cards (Virtual Cards)
│   └── PayRald Risk (Fraud)
│
├── EDUCATION DIVISION
│   └── RALD Elimu (School ERP)
│
├── COMMUNICATIONS DIVISION
│   ├── Loop (Social Audio)
│   ├── Loop Mobile (iOS/Android)
│   └── Loop Messenger (Realtime Chat)
│
├── INFRASTRUCTURE DIVISION
│   ├── RALD OS (API Gateway)
│   ├── RALD Event Bus
│   ├── RALD Notify
│   ├── RALD Config
│   ├── RALD SDK (@rald/sdk)
│   ├── RALD Design System
│   ├── RALD Control Center
│   ├── RALD Status / Trust / Docs
│   └── RALD Connect (WordPress)
│
└── AI DIVISION
    ├── SEKANI (Orchestration)
    ├── WIZMAC (Knowledge Graph)
    └── BBC (Linguistic AI)
```

---

## GOVERNANCE PROCESSES

### Repo Creation Policy
1. New repos require Architecture Review Board approval
2. Must be assigned to a Division before creation
3. Must have a GitHub Actions CI workflow on day 1
4. Stub repos (placeholder only) are PROHIBITED — create when ready to build
5. Must follow naming convention: `{division-prefix}-{product}` or `{product}-{component}`

### Release Policy
1. All changes merge to `main` via Pull Request (no direct pushes)
2. Minimum 1 reviewer for internal services, 2 reviewers for financial and identity services
3. All PRs must pass CI before merge
4. Production deploys triggered only by CI/CD pipelines — no manual `wrangler publish`

### Incident Response
1. **P0 Incidents:** Alert on-call within 5 minutes. Status page update within 15 minutes.
2. **P1 Incidents:** Resolution within 24 hours. Post-mortem within 72 hours.
3. **Security incidents:** Immediately rotate affected credentials. Preserve all logs.

### Quarterly Review
- Portfolio Committee reviews stub repos — either build or archive
- Security Review Board audits all secrets for rotation compliance
- Architecture Review Board reviews inter-service dependency graph
