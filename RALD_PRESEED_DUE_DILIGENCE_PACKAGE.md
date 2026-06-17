# RALD ECOSYSTEM — PRE-SEED DUE DILIGENCE PACKAGE
**Generated:** June 17, 2026  
**Classification:** Confidential — Investor Distribution Only  
**Prepared by:** Principal Architect / CTO Office

---

## EXECUTIVE SUMMARY

RALD is an African-first technology group building the identity, financial, communications, and education infrastructure layer for the African digital economy. RALD operates as a platform company: every product it builds runs on shared RALD infrastructure, creating compounding network effects across divisions.

**The core thesis:** Africa lacks trusted digital identity infrastructure. Every fintech, edtech, and communications product on the continent must solve identity from scratch. RALD solves identity once — then charges every product that builds on top of it.

---

## 1. ARCHITECTURE OVERVIEW

### Platform Architecture
```
RALD OS (api.rald.cloud) — Single API Gateway
│
├── IDENTITY LAYER
│   └── RALD ALIA — Financial Identity Network
│       ├── 15 microservices (identity, alias, routing, consent, trust, fraud, KYC)
│       ├── Alias resolution: any user reachable via name@rald
│       └── Deployed: AWS ECS (containers) + Cloudflare Workers (routing)
│
├── FINANCIAL LAYER  
│   └── PayRald — Payment Infrastructure
│       ├── 8 microservices (core, API, wallet, merchant, cards, checkout, risk, settlements)
│       └── Deployed: Cloudflare Workers + Supabase
│
├── COMMUNICATIONS LAYER
│   ├── Loop — Social Audio Platform (web + iOS + Android)
│   └── Loop Messenger — Realtime messaging
│       └── Deployed: Cloudflare Workers + Durable Objects
│
├── EDUCATION LAYER
│   └── RALD Elimu — African School ERP
│       └── Deployed: AWS ALB + Cloudflare Pages
│
└── AI LAYER
    ├── SEKANI — AI Orchestration
    ├── WIZMAC — Permanent Knowledge Graph
    └── BBC — African-cultural Linguistic AI
```

### Technology Stack
| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Edge compute | Cloudflare Workers | Zero cold start, global distribution, <1ms latency in Africa via CF PoPs |
| Backend services | TypeScript / Hono | Type-safe, lightweight, CF-native |
| Identity microservices | TypeScript / Docker / AWS ECS | Stateful services requiring persistent DB connections |
| Database | Supabase (PostgreSQL) + Redis | Real-time capable, row-level security, instant setup |
| Mobile | Expo / React Native | Single codebase for iOS + Android |
| CI/CD | GitHub Actions | Industry standard, tight GitHub integration |
| DNS + CDN | Cloudflare | Africans route through 70+ Cloudflare PoPs on the continent |
| Object storage | AWS S3 + CloudFront | Media and asset CDN |

### Technology Moat
1. **ALIA Routing Engine** — `name@rald` alias system resolves to any identity across all products. Network effect: every new user makes the entire alias graph more valuable.
2. **Cross-product identity** — A single sign-on propagates across Loop, PayRald, Elimu, and Messenger. Users never re-verify.
3. **Cloudflare-native at the edge** — RALD's compute is physically closer to African users than AWS us-east-1 based competitors. Cloudflare has 70+ PoPs in Africa (Johannesburg, Nairobi, Lagos, Cairo, Casablanca, and more).
4. **AI-native infrastructure** — SEKANI + WIZMAC embed AI orchestration at the platform layer, not the product layer. Every RALD product gets AI capabilities without building them.
5. **BBC linguistic AI** — African language, cultural, and voice context embedded in the platform. No Western AI model understands Yoruba, Swahili, Zulu, and Amharic simultaneously.

---

## 2. PRODUCT PORTFOLIO MAP

| Product | Market | Revenue Model | Status | Users |
|---------|--------|--------------|--------|-------|
| **RALD ALIA** | Identity-as-a-Service (Africa) | SaaS (per-identity fees, KYC API calls, enterprise licensing) | Beta | Internal |
| **PayRald** | African payments & wallets | Transaction fees (0.5–1.5%), FX spread, virtual card interchange | Beta | Internal |
| **Loop** | African social audio | Subscription, creator monetisation, in-app purchases | Beta | Internal |
| **Loop Messenger** | African messaging | Freemium, in-conversation payments (PayRald), enterprise | Beta | Internal |
| **RALD Elimu** | African EdTech (B2B schools) | SaaS subscription per school/student | Beta | Internal |
| **RALD SDK** | Developer platform | Freemium API (free tier + paid tiers) | Beta | Internal |
| **RALD Connect** | WordPress integration | Freemium plugin, premium features | Alpha | — |

---

## 3. REPOSITORY & ENGINEERING METRICS

| Metric | Value |
|--------|-------|
| Total repositories | 115 GitHub + 14 GitLab = **129** |
| Active / production repos | **35** |
| CI/CD pipelines active | **25+ GitHub Actions workflows** |
| Languages | TypeScript (primary), PHP, Shell, HTML |
| Frameworks | Hono (CF Workers), Expo (mobile), React/Vite (web), Express (services) |
| Deployment platforms | Cloudflare Workers, Cloudflare Pages, AWS ECS, AWS ALB, Supabase |
| Engineers (inferred) | 1–3 (high velocity, solo-founder architecture) |
| Commits this week | 50+ across ecosystem (June 17, 2026) |
| CodeQL scanning | Active on all major repos |
| Dependabot | Active on all major repos |

---

## 4. GOVERNANCE REPORT

**Current governance maturity: Early-stage, high velocity**

| Governance Area | Status |
|----------------|--------|
| Repository organisation | ✅ Single GitHub org (Ostinato-Loop), clear naming convention |
| CI/CD standardisation | ✅ GitHub Actions across all repos, consistent patterns |
| Secret management | ⚠️ In progress — org-level secrets, some missing |
| Code review process | ⚠️ Small team — PR process in place but coverage varies |
| Incident management | ⚠️ Issues tracked in GitHub, no formal on-call rotation yet |
| Architecture documentation | ✅ `rald` repo + governance documents (this package) |
| Security scanning | ✅ CodeQL + Dependabot across major repos |
| Access control | ✅ Private repos for AI/sensitive services |

**Governance plan post-funding:**
1. Hire dedicated DevSecOps engineer (Q3 2026)
2. Implement formal PR review policy (2 reviewers for financial + identity repos)
3. Establish weekly architecture review board meetings
4. Implement incident response playbook

---

## 5. RISK REPORT

### Technical Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| ALIA Docker pipeline broken (no production deploy path) | 🔴 High | Fix ECR secrets — 1 day fix |
| Exposed Supabase key in GitLab (legacy repo) | 🔴 High | Rotate key — immediate action |
| Single Supabase project for all PayRald data | 🟠 Medium | Separate projects per division (Q3 2026) |
| No formal disaster recovery plan | 🟠 Medium | Document + test DR for each product (pre-launch) |
| AI division (SEKANI) has no CI or deployment | 🟡 Low | Not on beta path, future phase |
| 33 stub repos creating noise | 🟡 Low | Archive batch — 1 week effort |

### Market Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Regulatory uncertainty (African fintech) | 🟠 Medium | `rald-compliance` roadmap; legal partner engagement |
| Telco-backed competitors (MTN MoMo, Airtel Money) | 🟠 Medium | RALD's moat is identity + developer platform, not just payments |
| Fragmented African internet infrastructure | 🟡 Low | Mitigated by Cloudflare's 70+ African PoPs |
| Currency volatility (multi-currency wallets) | 🟠 Medium | `payrald-settlements` and `payrald-risk` designed for this |

---

## 6. SECURITY REPORT (SUMMARY)

Full detail: `SECURITY_GOVERNANCE_REPORT.md`

| Finding | Count |
|---------|-------|
| P0 Critical (active breach or deploy blocker) | 3 |
| P1 High (pre-beta required) | 8 |
| P2 Medium (post-launch) | 9 |

**Key P0 findings:**
1. Exposed Supabase key in public GitLab repo (rotate immediately)
2. ALIA Docker deploy blocked (no AWS ECR credentials in CI)
3. GitLab CI failing 5 consecutive times (deploy frozen)

**Security strengths:**
- CodeQL scanning on all major repos
- Dependabot active across ecosystem
- Machine JWT with 30-second TTL for service-to-service auth
- Separate service role keys per product
- Dedicated security scan workflow on ALIA
- Secret rotation workflow in rald-alia

---

## 7. INFRASTRUCTURE REPORT (SUMMARY)

Full detail: `INFRASTRUCTURE_CONSOLIDATION_PLAN.md`

**Cloud spend profile (estimated):**
| Platform | Usage | Estimated Monthly |
|----------|-------|------------------|
| Cloudflare Workers Paid | ~20 Workers, KV, Durable Objects | ~$20–50 |
| AWS ECS (ALIA) | 15 containers (not yet running) | TBD post-fix |
| AWS SES + S3 + CloudFront | Email + CDN | ~$10–30 |
| Supabase Pro | 1 shared project | ~$25 |
| GitHub Team | 115 repos + Actions | ~$44 |
| **Total (current)** | | **~$100–150/month** |
| **Total (post-ALIA deploy)** | | **~$400–800/month** |

**Infrastructure strengths:**
- Cloudflare-native architecture scales to billions of requests with no additional infrastructure
- Serverless-first = no idle compute costs
- Supabase provides real-time, auth, and storage in one managed service
- AWS ECS auto-scales per container

---

## 8. TECHNOLOGY MOAT REPORT

### Moat 1: RALD ALIA — Africa's Identity Layer
No company has built a unified, alias-based financial identity network for Africa. RALD ALIA provides:
- `name@rald` alias resolution across all products
- Cross-product KYC — verify once, use everywhere
- Consent management (GDPR-style, Africa-first)
- Trust scoring integrated with financial risk

**Comparable:** Stripe Identity (US-focused), Plaid (US/EU) — neither operates in Africa at this layer.

### Moat 2: Edge-Native African Infrastructure
RALD's Cloudflare Workers deployment means its services run at Cloudflare PoPs in Lagos, Nairobi, Johannesburg, and Cairo — physically closer to African users than any AWS us-east-1 deployment.

**Latency advantage:** ~200ms improvement vs. US-hosted competitors for users in West and East Africa.

### Moat 3: Cross-Product Network Effects
Every user who joins Loop is automatically an ALIA identity. Every ALIA identity can be a PayRald wallet. Every school on Elimu gets RALD infrastructure. The platform compounds.

### Moat 4: African-Cultural AI Layer
BBC (Blanchard Blanquette Code) + WIZMAC are designed specifically for African linguistic, cultural, and voice contexts. This cannot be replicated by generic LLM providers.

### Moat 5: Developer Platform
`@rald/sdk`, `rald-connect` (WordPress), `rald-docs`, and `rald-dev-console` create a developer ecosystem that monetizes every third-party integration.

---

## 9. USE OF FUNDS (Pre-Seed Assumptions)

| Allocation | % | Use |
|-----------|---|-----|
| Engineering | 50% | 2–3 senior engineers; focus on ALIA production deployment, PayRald certification |
| Infrastructure | 15% | AWS ECS production environment, Supabase scale, security audit |
| Security & Compliance | 15% | External penetration test, legal (Nigerian fintech license, NDPC compliance) |
| Go-to-Market | 15% | Developer relations, school partnerships (Elimu), Loop creator program |
| Operations | 5% | Legal, accounting, tooling |

---

## 10. MILESTONES TO SERIES A

| Milestone | Target | Dependency |
|-----------|--------|-----------|
| ALIA production deployment | Month 1 | Fix ECR secrets → deploy 15 services |
| PayRald public launch (Nigeria) | Month 2 | Fix DB tables, rate limiting, JWT security |
| Loop public beta | Month 1 | Rotate exposed key → near-certified already |
| First 1,000 RALD identities | Month 3 | ALIA + Loop live |
| First 100 PayRald transactions | Month 2 | PayRald public launch |
| First 10 schools on Elimu | Month 3 | Elimu RALD stack integration complete |
| Developer platform launch | Month 2 | rald-docs + rald-sdk publishable |
| Pre-seed close | Month 1 | This document |
| Series A | Month 12 | 10,000 users, $50K MRR, full regulatory compliance |
