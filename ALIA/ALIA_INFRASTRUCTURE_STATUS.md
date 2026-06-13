# ALIA_INFRASTRUCTURE_STATUS.md
# RALD ALIA — Infrastructure Status
**Audit Date:** 2026-06-13

---

## CURRENT INFRASTRUCTURE

### Runtime
| Component | Version | Status |
|-----------|---------|--------|
| Node.js | 20 (LTS) | ✅ Configured |
| TypeScript | 5.7.3 | ✅ Configured |
| pnpm | 9 | ✅ Configured |

### Data Layer
| Component | Version | Config | Status |
|-----------|---------|--------|--------|
| PostgreSQL | 16-alpine | `POSTGRES_USER=raldalia` | ✅ Docker |
| Redis | 7-alpine | appendonly enabled | ✅ Docker |
| Apache Kafka | 7.6.0 (Confluent) | via Zookeeper 2181 | ✅ Docker |
| Zookeeper | 7.6.0 (Confluent) | port 2181 | ✅ Docker |

### Services
| Service | Port | Dockerfile | .env.example | Kafka | Redis | PostgreSQL |
|---------|------|-----------|-------------|-------|-------|-----------|
| identity-service | 3001 | ✅ | ✅ | ✅ | ❌ | ✅ |
| alias-service | 3002 | ✅ | ✅ | ✅ | ✅ | ✅ |
| directory-service | 3003 | ✅ | ✅ | ❌ | ✅ | ✅ |
| resolution-engine | 3004 | ✅ | ✅ | ✅ | ✅ | ✅ |
| routing-service | 3005 | ✅ | ✅ | ❌ | ❌ | ✅ |
| fraud-service | 3006 | ✅ | ✅ | ✅ | ✅ | ✅ |
| audit-service | 3007 | ✅ | ✅ | ✅ | ❌ | ✅ |
| notification-service | 3008 | ✅ | ✅ | ✅ | ❌ | ❌ |
| governance-service | 3009 | ✅ | ❌ | ✅ | ✅ | ❌ |
| consent-service | 3010 | ✅ | ❌ | ✅ | ✅ | ❌ |
| trust-service | 3011 | ✅ | ❌ | ✅ | ✅ | ❌ |
| merchant-service | 3012 | ✅ | ❌ | ✅ | ✅ | ❌ |
| verification-service | 3013 | ✅ | ❌ | ✅ | ❌ | ❌ |
| **gateway** | **80** | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## CI/CD STATUS

### GitLab CI (`.gitlab-ci.yml`)
```
Stages: install → typecheck → build → docker-build

Artifacts: services/*/dist/, packages/*/dist/
Registry: registry.gitlab.com/sekanidev/rald-alia
Branch: main only for docker-build
```

| Stage | Status |
|-------|--------|
| Install (pnpm frozen-lockfile) | ✅ Configured |
| TypeCheck (pnpm typecheck) | ✅ Configured |
| Build (pnpm build) | ✅ Configured |
| Docker build (13 services) | ✅ Configured |
| Docker push to GitLab registry | ✅ Configured |
| Deploy to production | ❌ NOT configured |

### GitHub Actions (`.github/workflows/ci.yml`)
```
Triggers: push to main/develop, PRs to main/develop
Jobs: typecheck → build
```

| Job | Status |
|-----|--------|
| TypeCheck | ✅ Configured |
| Build | ✅ Configured |
| Docker build | ❌ Not configured |
| Deploy | ❌ Not configured |

---

## WHAT IS MISSING FROM INFRASTRUCTURE

### Missing: Health Check Endpoints
Only the gateway has `/healthz`. Each service needs its own health endpoint for:
- Docker health checks
- Load balancer routing
- Kubernetes readiness/liveness probes

Required on each service:
```
GET /healthz → { status: 'ok', service: 'identity-service', db: 'ok', kafka: 'ok' }
```

### Missing: Kubernetes Deployment
No Kubernetes configs (Deployments, Services, ConfigMaps, Secrets, Ingress, HPA).

Without Kubernetes:
- Cannot auto-scale under load
- Cannot do rolling deployments without downtime
- Cannot enforce resource limits per service
- Cannot auto-restart crashed services (docker-compose has restart: unless-stopped but no orchestration)

### Missing: Observability
| Component | Status |
|-----------|--------|
| Structured logging (Pino) | ✅ gateway + some services |
| Metrics (Prometheus/OpenMetrics) | ❌ None |
| Distributed tracing (OpenTelemetry) | ❌ None |
| Alerting | ❌ None |
| Dashboard | ❌ None |
| Error tracking (Sentry) | ❌ None |

### Missing: Secret Management
All secrets are environment variables. No:
- Vault / AWS Secrets Manager integration
- Automatic rotation
- Secret leakage detection
- Per-environment secret scoping

### Missing: Data Backup
No PostgreSQL backup configuration. If the PostgreSQL container or volume is lost, all data is gone.

Required:
- Automated daily PostgreSQL dumps
- Point-in-time recovery (WAL archiving)
- Backup encryption
- Offsite backup storage

### Missing: CDN / Edge
No CDN or edge caching for:
- Public directory lookups (`GET /v1/directory/:alias`)
- Resolution caching (Redis exists at service level, but not globally)

This limits geographic distribution. A user in Lagos and a user in Nairobi both hit the same origin.

---

## SCALABILITY TARGETS vs CURRENT STATE

| Metric | Target | Current Capability | Gap |
|--------|--------|-------------------|-----|
| Users | 100M+ | Unbounded (DB scales) | Schema OK, no sharding plan |
| Aliases | 1B+ | Unbounded with `aliases` table | Unique index OK |
| Throughput | 10,000+ TPS | Unknown — no load tests | No load test setup |
| Availability | 99.99% | Unknown — no redundancy | Single points of failure |
| Resolution Latency | <200ms globally | <200ms locally (Redis) | No global edge |

---

## PRODUCTION DEPLOYMENT GAP ANALYSIS

To deploy ALIA to production requires:

| Requirement | Status | Priority |
|-------------|--------|----------|
| All services use persistent storage | ⚠️ 5/13 in-memory | P0 |
| Health checks on all services | ❌ | P0 |
| PostgreSQL hosted (not docker) | ❌ Supabase/RDS/Neon needed | P0 |
| Redis hosted (not docker) | ❌ Redis Cloud/Upstash needed | P0 |
| Kafka hosted (not docker) | ❌ Confluent Cloud/Upstash Kafka needed | P0 |
| TLS on all endpoints | ❌ | P0 |
| Machine identity (internal auth) | ❌ | P0 |
| Signed routing tokens | ❌ | P0 |
| Secret management (no fallback secrets) | ❌ | P0 |
| Kubernetes or equivalent orchestration | ❌ | P1 |
| Backup strategy | ❌ | P1 |
| Observability | ❌ | P1 |
| Load testing | ❌ | P1 |
| Test coverage | ❌ | P0 |
| Domain + SSL configuration | ❌ | P0 |

**Production Readiness: 15%**

The architecture is correct. The code logic is solid. The infrastructure setup is the primary blocker.

---

## RECOMMENDED PRODUCTION STACK

| Layer | Recommended Service | Why |
|-------|--------------------|----|
| PostgreSQL | Supabase (or Neon) | Matches existing RALD auth-core pattern |
| Redis | Upstash Redis | Serverless, pay-per-use |
| Kafka | Upstash Kafka (or Confluent Cloud) | Managed, no ops overhead |
| Compute | Railway or Fly.io | Simple container deployment, supports Node.js |
| CDN/Edge | Cloudflare | Required for <100ms globally |
| DNS | Cloudflare | Matches existing RALD infrastructure |
| Secrets | Doppler or Railway env vars | Simple, auditable |
| Monitoring | Betterstack + Sentry | Affordable, effective |
| CI/CD | GitHub Actions (migrate from GitLab) | Consistent with RALD ecosystem |

This stack allows ALIA to run in production without Kubernetes while targeting the 99.99% SLA and <200ms resolution latency.
