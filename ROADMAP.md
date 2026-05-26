# RALD Ecosystem Roadmap

> A fully unified AI-native African infrastructure and commerce operating system.

---

## V1 — Foundation (Current)

**Goal:** Production-ready core platform with all primary surfaces live.

### Shipped
- [x] RALD Control Center — admin dashboard with full service governance
- [x] Product marketing site — Loop Business, PayRald, Loop Dispatch, Raldtics, Loop Voice, GitRald
- [x] REST API with JWT auth — all core routes live
- [x] Credential management — AES-256-GCM encrypted, rotatable
- [x] Deployment pipeline — Cloudflare Workers (API) + Pages (frontends)
- [x] GitHub Actions CI/CD — typecheck, build, deploy on every push to main
- [x] RALD Auth — custom HMAC-SHA256 JWT, no external auth provider dependency
- [x] PostgreSQL schema — users, services, credentials, deployments, products

### V1 Acceptance Criteria
- All 6 product pages live on rald.cloud
- Admin login works on admin.rald.cloud
- API responds at api.rald.cloud/api/healthz
- CI pipeline green on main
- Zero known security vulnerabilities (OWASP Top 10 clear)

---

## V2 — Multi-Tenant & Team Management (Q3 2025)

**Goal:** Support multiple organizations, role-based access control, and team collaboration.

### Planned
- [ ] Organizations table — multi-tenant isolation
- [ ] Invite system — email-based team onboarding
- [ ] Fine-grained RBAC — per-product permissions (owner / admin / editor / viewer)
- [ ] Audit log — every mutation tracked with actor, timestamp, and diff
- [ ] API key management — per-service programmatic access keys
- [ ] SSO integration — Google OAuth + SAML for enterprise teams
- [ ] Credential rotation policies — automated rotation schedules
- [ ] Webhook delivery — outbound events for deployment state changes
- [ ] Dark mode / light mode toggle in Control Center

---

## V3 — Intelligence & Automation (Q4 2025)

**Goal:** AI-powered insights, automated scaling, and smart alerting.

### Planned
- [ ] Raldtics embedded — analytics dashboards inside Control Center
- [ ] AI anomaly detection — automatic incident detection + root cause suggestions
- [ ] Smart deployment rollback — auto-rollback on error rate spike
- [ ] Cost analytics — Cloudflare Workers/Pages spend tracking
- [ ] Infrastructure as Code — export current service config as Terraform/Pulumi
- [ ] Alert routing — PagerDuty / Slack / WhatsApp integration
- [ ] Predictive scaling — Cloudflare Durable Objects for stateful burst handling
- [ ] AI-generated runbooks — incident documentation auto-generated from logs

---

## V4 — Marketplace & Partner Ecosystem (Q1 2026)

**Goal:** Open the RALD platform to third-party developers and integration partners.

### Planned
- [ ] RALD Developer Portal — API docs, sandbox keys, SDK downloads
- [ ] Partner marketplace — certified integrations (Stripe, Termii, Fincra, Paystack)
- [ ] Loop Business App Store — merchant-installable extensions
- [ ] Revenue sharing — tracked via PayRald, settled monthly
- [ ] Mobile SDK — React Native SDK for Loop Business + PayRald
- [ ] RALD CLI — `rald deploy`, `rald secrets set`, `rald logs tail`
- [ ] Public API v2 — versioned, backward-compatible, OpenAPI 3.1 spec published
- [ ] Localization — Swahili, French, Hausa, Yoruba, Igbo

---

## V5 — Pan-African Edge Infrastructure (Q3 2026)

**Goal:** Distributed edge compute across Africa with sub-50ms latency continent-wide.

### Planned
- [ ] RALD Edge Network — PoPs in Lagos, Nairobi, Johannesburg, Cairo, Accra, Dakar
- [ ] Multi-region Cloudflare D1 — replicated database with region-aware routing
- [ ] RALD CDN — content delivery optimized for African last-mile networks
- [ ] Offline-first SDK — Progressive Web App + service worker sync for low-connectivity
- [ ] Loop Voice Carrier — licensed SIP termination across 20+ African countries
- [ ] PayRald Stablecoin Settlement — USDC/cNGN cross-border settlement layer
- [ ] RALD Compute — serverless GPU burst for AI workloads (inference at the edge)
- [ ] Full SOC 2 Type II compliance + PCI DSS Level 1 certification

---

## Architecture Principles (All Versions)

| Principle | Implementation |
|-----------|---------------|
| GitHub is source of truth | All infra changes via PRs, no console-only changes |
| Zero-trust auth | Every request authenticated, no implicit trust |
| Encrypted at rest | AES-256-GCM for credentials, Supabase encryption for data |
| Edge-first | Cloudflare Workers for API, Pages for frontends |
| Observable | Every route logs to Cloudflare Workers Analytics Engine |
| Resilient | Health checks, auto-restart, deployment rollback |

---

*Last updated: May 2026 — V1 shipped.*
