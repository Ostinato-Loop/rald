# RALD INFRASTRUCTURE CONSOLIDATION PLAN
**Generated:** June 17, 2026  
**Authority:** DevOps Director / Infrastructure Division

---

## CURRENT INFRASTRUCTURE FOOTPRINT

### Cloudflare (Primary Compute Layer)
Cloudflare is the dominant runtime for RALD. The majority of services are Cloudflare Workers or Pages.

**Cloudflare Workers (active):**
| Service | Worker Name | URL |
|---------|------------|-----|
| rald-os | `rald-os` | api.rald.cloud |
| rald-routing | `rald-routing` | routing.rald.cloud |
| rald-auth-core | `rald-auth` | auth.rald.cloud |
| rald-config | `rald-config` | config.rald.cloud |
| rald-event-bus | `rald-event-bus` | events.rald.cloud |
| rald-notify | `rald-notify` | notify.rald.cloud |
| payrald-core | `payrald-core` | core.pay.rald.cloud |
| payrald-api | `payrald-api` | api.pay.rald.cloud |
| payrald-wallet | `payrald-wallet` | wallet.pay.rald.cloud |
| payrald-merchant | `payrald-merchant` | merchant.pay.rald.cloud |
| payrald-cards | `payrald-cards` | cards.pay.rald.cloud |
| payrald-checkout | `payrald-checkout` | checkout.pay.rald.cloud |
| payrald-risk | `payrald-risk` | risk.pay.rald.cloud |
| payrald-settlements | `payrald-settlements` | settlements.pay.rald.cloud |
| rald-trust | `rald-trust` | trust.rald.cloud |
| rald-status | `rald-status` | status.rald.cloud |
| rald-docs | `rald-docs` | docs.rald.cloud |
| messenger (API) | CF Worker | messenger.rald.cloud |
| rald-auth-ui | `rald-auth-ui` | auth.rald.cloud (UI) |

**Cloudflare Pages (active):**
| Service | URL |
|---------|-----|
| rald-alia (frontend) | alia.rald.cloud |
| rald-admin | admin.rald.cloud |
| rald-control-center | control.rald.cloud |
| rald-cloud-web | rald.cloud |
| payrald-ui-ux | app.pay.rald.cloud |
| payrald-your-digital-wallet | wallet.rald.cloud |
| messenger (frontend) | messenger.rald.cloud |
| elimu (frontend proxy) | elimu.rald.cloud |

**Cloudflare KV (used by):** `rald-config`, `payrald-api` (rate limiting — currently disabled)  
**Cloudflare Durable Objects (used by):** `messenger` (realtime presence/channels)

---

### AWS (ALIA Backend + CDN + Email)
AWS is used for the ALIA identity microservices and supporting infrastructure.

| Service | AWS Resource | Status |
|---------|-------------|--------|
| ALIA microservices (15 services) | ECR (registry: 093583252030.dkr.ecr.*.amazonaws.com) | ❌ ECR push broken |
| ALIA backend runtime | ECS (assumed) | ❌ Not deployed (blocked) |
| RALD SES | AWS SES email identity | ✅ Active (rald-infra) |
| RALD CDN | AWS S3 + CloudFront | ✅ Active (rald-infra) |
| Elimu backend | AWS ALB | ✅ Active |

---

### Supabase (Database Layer)
**Project:** `onxdcikfttdmnhofsuwo.supabase.co`  
**Used by:** `payrald-core`, `payrald-api`, `rald-auth-core`, `rald-os`, `rald-notify`, `rald-event-bus`, `loop-mobile`, `messenger`, `loop`

⚠️ **Risk:** Single Supabase project shared across all financial and auth services. Service role key compromise exposes all data.

---

### Self-Hosted Docker (ALIA Monorepo)
Used by `rald-alia` for local dev and intended AWS ECS deployment:
- **Databases:** PostgreSQL (Docker container)
- **Cache:** Redis (Docker container)
- **Services:** 15 TypeScript microservices in containers

---

### GitHub
- **Org:** `Ostinato-Loop`
- **Repos:** 115 total
- **CI/CD:** GitHub Actions (primary CI for all repos)
- **Container Registry:** NOT used (AWS ECR used for ALIA)
- **Secrets:** Org-level secrets (partially configured)
- **Packages:** npm packages via GitHub Packages (secondary) + npm registry

---

### GitLab
- **Account:** `sekanidev`
- **Repos:** 14 (mix of RALD mirrors and personal projects)
- **CI/CD:** GitLab CI (`.gitlab-ci.yml`) — used only by `rald-alia`
- **Container Registry:** `registry.gitlab.com/sekanidev/rald-alia` (secondary target)

---

## CONSOLIDATION RECOMMENDATIONS

### KEEP — No Changes

| System | Reasoning |
|--------|-----------|
| Cloudflare Workers (all active) | Excellent performance, zero cold start for TypeScript. Keep all active workers. |
| Cloudflare Pages (all active) | Free tier CDN for frontends. Keep all. |
| AWS ECR + ECS for ALIA | ALIA microservices require persistent compute — CF Workers not suitable for stateful identity services with PostgreSQL + Redis. AWS ECS is correct. |
| AWS SES + S3 + CloudFront | Email sending + CDN. Cost-effective. Keep. |
| Supabase | Excellent DX for auth + real-time. Keep. |
| GitHub Actions | Primary CI/CD. Standardise all repos on GitHub Actions. |

---

### MOVE — Migrate to Cloudflare or Consolidate

| What | From | To | Reason |
|------|------|----|--------|
| GitLab CI pipeline | GitLab CI (sekanidev/rald-alia) | GitHub Actions | GitHub is SSOT. GitLab should receive mirror pushes only, not run independent CI. Eliminates dual-pipeline confusion. |
| ALIA Docker registry | GitLab Container Registry | AWS ECR exclusively | Prevents dual-registry drift. ECR is already the target. |
| `rald-realtime` WebSocket layer | Standalone (no deploy target) | Cloudflare Durable Objects (same as messenger) | Unify realtime infrastructure. |
| `rald-search` | Standalone | Cloudflare Workers + Vectorize | Leverage existing CF infrastructure. |
| `rald-data-core` (future) | Stub | Cloudflare Queues + Workers Analytics Engine | When built, use CF-native event streaming. |

---

### ELIMINATE — Remove or Decommission

| What | Action | Reason |
|------|--------|--------|
| GitLab independent development | Convert to mirror-only | GitHub is SSOT. Dual development creates divergence risk. |
| Duplicate GitLab repos (8 personal/legacy) | Archive + delete | WatchVII, ostloop, loop-messenger-lvb, etc. — not RALD ecosystem |
| `rald-auth-server` (empty GitHub repo) | Delete | Never developed. Empty. |
| `rald-infrastructure` (private Shell) | Archive | Replaced by `rald-infra` |
| `rald-design-system` (private) | Archive | Replaced by `rald-design` |
| `payrald` (private JS monolith) | Archive | Replaced by payrald-* microservices |
| `rald-events` (private) | Archive | Replaced by `rald-event-bus` |
| `rald-shared-sdk` (private) | Archive | Replaced by `rald-sdk` |
| `rald-console` (private) | Archive | Replaced by `rald-dev-console` + `rald-control-center` |
| `loop-business-8cd0eb1` (private) | Archive | CI/CD artifact fork, no value |
| `rald-loop-business` (private) | Archive | Old design exploration |
| `rald-observability` (stub) | Archive | Observability handled by Sentry + CloudWatch |
| `raldtics` (private) | Rebuild from scratch when ready | Current stub has zero code |

---

## TARGET STATE ARCHITECTURE (Post-Consolidation)

```
┌─────────────────────────────────────────────────────┐
│                  rald.cloud DNS                      │
│              (Cloudflare DNS + CDN)                  │
└──────────────────────┬──────────────────────────────┘
                       │
        ┌──────────────▼──────────────┐
        │    api.rald.cloud           │
        │    RALD OS (CF Worker)      │
        │    rald-os                  │
        └──────────────┬──────────────┘
                       │
      ┌────────────────┼────────────────────────────┐
      │                │                            │
      ▼                ▼                            ▼
 CF Workers        AWS ECS                    Supabase
 ──────────        ───────                    ────────
 rald-auth-core    ALIA microservices         Auth DB
 rald-routing  →→→ identity-service          PayRald DB
 rald-event-bus    alias-service             Messenger DB
 rald-notify       resolution-engine         Loop DB
 rald-config       routing-service
 payrald-core      fraud-service
 payrald-api       audit-service
 payrald-wallet    consent-service
 payrald-merchant  trust-service
 payrald-risk      governance-service
 payrald-*         merchant-service
 messenger         verification-service
 rald-trust        directory-service
 rald-status       registry-service
 rald-docs         developer-service

      │                │                            │
      └────────────────┼────────────────────────────┘
                       │
        ┌──────────────▼──────────────┐
        │    AWS SES + S3             │
        │    Email + CDN Assets       │
        └─────────────────────────────┘
```

---

## INFRASTRUCTURE COST OPTIMIZATION

| Item | Recommendation |
|------|---------------|
| Cloudflare Workers | Already on Cloudflare Workers Paid plan (required for KV, DO). Review worker count against plan limits. |
| AWS ECS | Use Fargate Spot for ALIA development environments. Reserve capacity only for production. |
| Supabase | Audit storage usage on shared project. Separate financial data onto dedicated Supabase project. |
| GitHub Actions | Review Actions minutes usage — 30+ active repos with CodeQL can consume significant minutes. |
| GitLab | Downgrade or remove GitLab subscription if only used as a mirror. |

---

## MIGRATION TIMELINE

| Phase | Action | ETA |
|-------|--------|-----|
| Week 1 | Fix AWS ECR secrets → first successful ALIA Docker push | Immediate |
| Week 1 | Convert GitLab to mirror-only; disable independent CI | Immediate |
| Week 2 | Archive 38 stub repos (batch operation) | Week 2 |
| Week 2 | Archive 11 deprecated repos | Week 2 |
| Week 3 | Merge SDK repos into rald-sdk monorepo | Week 3 |
| Week 4 | Separate Supabase projects (financial vs. auth vs. comms) | Week 4 |
| Month 2 | Build RALDtics analytics platform (replace stub) | Month 2 |
| Month 2 | Implement GitRald CI platform (replace stubs) | Month 2 |
