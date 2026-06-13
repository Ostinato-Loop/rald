# ALIA_IMPLEMENTATION_STATUS.md
# RALD ALIA — Implementation Reality Audit
**Audit Date:** 2026-06-13
**Source:** `gitlab.com/sekanidev/rald-alia.git` — commit `ab66d353`
**Method:** Direct source code inspection, file-by-file, service-by-service

---

## SCORING METHODOLOGY

| Dimension | Definition |
|-----------|------------|
| **Documentation %** | README, API spec, architecture docs present and accurate |
| **Code %** | Business logic implemented (not scaffolding, not TODO stubs) |
| **Schema %** | Database tables / data structures defined and usable |
| **API %** | HTTP routes fully implemented and functional |
| **Deployment %** | Dockerfile + env config present and Docker-runnable |
| **Production Readiness %** | Passes: persistent storage, auth, error handling, input validation, CI |

---

## SERVICE IMPLEMENTATION SCORECARDS

### 1. `identity-service` (port 3001)

| Dimension | Score | Evidence |
|-----------|-------|----------|
| Documentation | 90% | OpenAPI spec complete, README covers service |
| Code | 85% | Full auth flow (register/verify/login/refresh/forgot-pw/reset), user CRUD, org CRUD, bank-links |
| Schema | 100% | `users`, `organizations`, `bank_links` tables — persisted via Drizzle |
| API | 90% | 17 routes implemented, all with Zod validation |
| Deployment | 85% | Dockerfile present, `.env.example` present, docker-compose wired |
| Production Readiness | 65% | **Gap:** password in JSONB metadata (not a typed column), no rate limiting at service level, no WebAuthn, no passkeys, no device trust |

**Overall: 86%** — Most complete service. Deployable. Not yet production hardened.

---

### 2. `alias-service` (port 3002)

| Dimension | Score | Evidence |
|-----------|-------|----------|
| Documentation | 85% | OpenAPI spec covers all alias routes |
| Code | 90% | Create/list/get/update/delete, normalisation, Kafka events, duplicate detection |
| Schema | 100% | `aliases` table — Drizzle persisted, soft delete via `deleted_at` |
| API | 90% | 5 routes with full validation |
| Deployment | 85% | Dockerfile + env example present |
| Production Readiness | 70% | **Gap:** No per-alias rate limiting, no alias verification flow (verification_status field missing), no alias quota enforcement |

**Overall: 87%** — Deployable. Solid core.

---

### 3. `directory-service` (port 3003)

| Dimension | Score | Evidence |
|-----------|-------|----------|
| Documentation | 70% | OpenAPI entry present |
| Code | 55% | Basic public lookup present, no caching layer, no alias type filtering |
| Schema | 80% | Reads from `aliases` table |
| API | 60% | GET /v1/directory/:alias only |
| Deployment | 80% | Dockerfile present |
| Production Readiness | 40% | **Gap:** No Redis cache, no CDN integration, no rate limiting, not hardened for public read at scale |

**Overall: 61%** — Functional but not production-ready for public traffic.

---

### 4. `resolution-engine` (port 3004)

| Dimension | Score | Evidence |
|-----------|-------|----------|
| Documentation | 90% | OpenAPI covers resolution fully |
| Code | 80% | Redis-cached lookup, DB fallback, Kafka event publishing, type detection |
| Schema | 100% | Reads `aliases` + `bank_links` via Drizzle |
| API | 75% | POST /v1/resolve — works; missing: /resolve/username, /resolve/email, etc. explicitly |
| Deployment | 85% | Dockerfile + env example |
| Production Readiness | 55% | **Critical gap:** Returns raw `account_token` — NOT a signed ephemeral token. This is a security issue. Token must be encrypted/signed. No signed routing token issued. |

**Overall: 81%** — Core logic works. Security hardening required before production.

---

### 5. `routing-service` (port 3005)

| Dimension | Score | Evidence |
|-----------|-------|----------|
| Documentation | 80% | OpenAPI covers routing profile routes |
| Code | 70% | Routing profile upsert, route determination (profile → bank_link → error), failover |
| Schema | 100% | `routing_profiles` table — Drizzle persisted |
| API | 70% | 3 routes implemented |
| Deployment | 85% | Dockerfile + env example |
| Production Readiness | 50% | **Gap:** No cross-country routing rules, no institution-level routing, no priority-based multi-destination, no latency metrics, no analytics |

**Overall: 76%** — Basic routing works. Missing advanced routing capabilities.

---

### 6. `fraud-service` (port 3006)

| Dimension | Score | Evidence |
|-----------|-------|----------|
| Documentation | 75% | Basic OpenAPI coverage |
| Code | 75% | Velocity checks (Redis), signal scoring, risk levels, Kafka publish on block |
| Schema | 90% | `fraud_events` table — Drizzle persisted |
| API | 70% | Score endpoint + list + resolve |
| Deployment | 85% | Dockerfile + env example |
| Production Readiness | 60% | **Gap:** Velocity only — no ML model, no behavioral baseline, no cross-entity correlation, no sanction list integration |

**Overall: 76%** — Rule-based fraud detection works. Needs ML/pattern integration for production.

---

### 7. `audit-service` (port 3007)

| Dimension | Score | Evidence |
|-----------|-------|----------|
| Documentation | 70% | OpenAPI covers audit queries |
| Code | 75% | Kafka consumer writing to `audit_logs` with SHA-256 checksum |
| Schema | 100% | `audit_logs` table — indexed by event_type, actor_id, target_id, created_at |
| API | 70% | GET /v1/audit — paginated, filterable |
| Deployment | 85% | Dockerfile present |
| Production Readiness | 65% | **Gap:** No write-once enforcement at DB level (relies on application layer), no WORM storage, no regulatory archive |

**Overall: 77%** — Functional. Needs WORM enforcement for compliance.

---

### 8. `notification-service` (port 3008)

| Dimension | Score | Evidence |
|-----------|-------|----------|
| Documentation | 65% | Minimal OpenAPI coverage |
| Code | 70% | Kafka consumer for 3 notification types (OTP, password-reset, welcome) |
| Schema | 0% | No persistence — fire-and-forget |
| API | 30% | No HTTP API (Kafka consumer only) |
| Deployment | 85% | Dockerfile + env example |
| Production Readiness | 55% | **Gap:** No delivery tracking, no retry logic, no provider abstraction implemented (pluggable interface exists but not wired), no SMS/webhook delivery |

**Overall: 51%** — Partial. Email notification works if provider credentials are set.

---

### 9. `governance-service` (port 3009)

| Dimension | Score | Evidence |
|-----------|-------|----------|
| Documentation | 70% | Partial OpenAPI |
| Code | 80% | Policy engine, country rules engine (5 countries), compliance validation, transaction validation |
| Schema | 30% | No DB persistence — in-memory Maps |
| API | 75% | Policy CRUD, validate endpoint, country rules, compliance checks, retention policies |
| Deployment | 80% | Dockerfile present (no .env.example) |
| Production Readiness | 40% | **Critical gap:** All data in-memory (lost on restart). No DB tables defined for policies. Countries hardcoded. |

**Overall: 55%** — Logic is solid. Needs DB persistence before production.

---

### 10. `consent-service` (port 3010)

| Dimension | Score | Evidence |
|-----------|-------|----------|
| Documentation | 80% | OpenAPI covers consent + mandate + permission |
| Code | 85% | Full consent lifecycle (grant/revoke/verify/expire/audit), mandate engine, permission registry |
| Schema | 0% | **CRITICAL:** All data in-memory (Map). No DB tables defined. Lost on every restart. |
| API | 85% | 12+ routes across consent/mandate/permission |
| Deployment | 80% | Dockerfile present (no .env.example) |
| Production Readiness | 25% | **Blocked:** In-memory only. Cannot run in production without DB persistence. |

**Overall: 55%** — Excellent logic, blocked by missing persistence.

---

### 11. `trust-service` (port 3011)

| Dimension | Score | Evidence |
|-----------|-------|----------|
| Documentation | 75% | Partial OpenAPI |
| Code | 80% | Trust score engine (15 signal types, weighted), reputation engine (flags, sanctions, PEP), history tracking |
| Schema | 0% | **CRITICAL:** All data in-memory (Map). No DB tables. Lost on restart. |
| API | 80% | GET/POST trust score, signal ingestion, batch scores, history, reputation |
| Deployment | 80% | Dockerfile present (no .env.example) |
| Production Readiness | 25% | **Blocked:** In-memory only. Cannot run in production. |

**Overall: 52%** — Excellent logic, blocked by missing persistence.

---

### 12. `merchant-service` (port 3012)

| Dimension | Score | Evidence |
|-----------|-------|----------|
| Documentation | 65% | Partial |
| Code | 75% | Merchant CRUD, verification, suspension, handle uniqueness, collection engine |
| Schema | 0% | **CRITICAL:** All data in-memory (Map). No DB tables. Lost on restart. |
| API | 75% | 10+ routes across merchant/handle/analytics/collection |
| Deployment | 80% | Dockerfile present (no .env.example) |
| Production Readiness | 25% | **Blocked:** In-memory only. |

**Overall: 45%** — Good logic, blocked by persistence.

---

### 13. `verification-service` (port 3013)

| Dimension | Score | Evidence |
|-----------|-------|----------|
| Documentation | 70% | Partial OpenAPI |
| Code | 70% | KYC multi-tier/country/provider, BVN/NIN verification, credential engine, document engine |
| Schema | 0% | All data in-memory. No DB tables. |
| API | 75% | 10+ routes across KYC/document/credential/provider |
| Deployment | 80% | Dockerfile present (no .env.example) |
| Production Readiness | 30% | **Blocked:** In-memory + provider calls stubbed (youverify/smile_id/dojah not wired). |

**Overall: 45%** — Solid structure, needs persistence + provider integration.

---

## CONSOLIDATED SCORECARD

| Service | Docs | Code | Schema | API | Deploy | Prod Ready | **OVERALL** |
|---------|------|------|--------|-----|--------|------------|-------------|
| identity-service | 90% | 85% | 100% | 90% | 85% | 65% | **86%** |
| alias-service | 85% | 90% | 100% | 90% | 85% | 70% | **87%** |
| directory-service | 70% | 55% | 80% | 60% | 80% | 40% | **61%** |
| resolution-engine | 90% | 80% | 100% | 75% | 85% | 55% | **81%** |
| routing-service | 80% | 70% | 100% | 70% | 85% | 50% | **76%** |
| fraud-service | 75% | 75% | 90% | 70% | 85% | 60% | **76%** |
| audit-service | 70% | 75% | 100% | 70% | 85% | 65% | **77%** |
| notification-service | 65% | 70% | 0% | 30% | 85% | 55% | **51%** |
| governance-service | 70% | 80% | 30% | 75% | 80% | 40% | **55%** |
| consent-service | 80% | 85% | 0% | 85% | 80% | 25% | **55%** |
| trust-service | 75% | 80% | 0% | 80% | 80% | 25% | **52%** |
| merchant-service | 65% | 75% | 0% | 75% | 80% | 25% | **45%** |
| verification-service | 70% | 70% | 0% | 75% | 80% | 30% | **45%** |

**Platform Average: 65%**

---

## TEST COVERAGE AUDIT

| Service | Unit Tests | Integration Tests | Status |
|---------|-----------|-------------------|--------|
| identity-service | ❌ | ❌ | None |
| alias-service | ❌ | ❌ | None |
| directory-service | ❌ | ❌ | None |
| resolution-engine | ❌ | ❌ | None |
| routing-service | ❌ | ❌ | None |
| fraud-service | ❌ | ❌ | None |
| audit-service | ❌ | ❌ | None |
| notification-service | ❌ | ❌ | None |
| governance-service | ❌ | ❌ | None |
| consent-service | ❌ | ❌ | None |
| trust-service | ❌ | ❌ | None |
| merchant-service | ❌ | ❌ | None |
| verification-service | ❌ | ❌ | None |

**Zero test coverage across the entire platform.**

This is the largest production risk in the codebase.

---

## WHAT COMPILES

All services use TypeScript with `tsc`. The pnpm workspace is well-structured. Based on package.json dependencies and import analysis:

- All 13 services **should compile** given a valid `node_modules` install
- The CI pipeline (`.gitlab-ci.yml`) confirms `pnpm typecheck` passes on `main`
- No compilation errors were detected in any file inspected

---

## DEPLOYABILITY

| Condition | Met? |
|-----------|------|
| All services have Dockerfiles | ✅ |
| docker-compose.yml wires all 13 services | ✅ |
| PostgreSQL + Redis + Kafka configured | ✅ |
| `.env.example` files present (8/13 services) | ⚠️ Partial |
| Environment variable documentation | ⚠️ Partial |
| Kubernetes/Helm configs | ❌ |
| Production secrets management | ❌ |
| Health check endpoints on all services | ⚠️ Gateway only (`/healthz`) |

**Verdict:** Deployable locally via `docker compose up`. Not deployable to production without additional infrastructure work.

---

## COMPARISON: ALIA vs RALD (GitHub)

### Capabilities Duplicated Between ALIA and RALD

| Capability | ALIA Implementation | RALD GitHub Implementation | Winner |
|-----------|--------------------|-----------------------------|--------|
| User identity | identity-service (complete) | rald-identity (partial) | **ALIA** |
| Authentication / JWT | identity-service auth routes | rald-auth-core (more advanced — WebAuthn, passkeys) | **RALD** |
| Audit logging | audit-service (Kafka + DB) | rald-auth-core migrations (partial) | **ALIA** |
| Trust/reputation | trust-service (rich signal model) | rald-auth-core trust_engine migration (schema only) | **ALIA** |
| Consent | consent-service (complete logic) | rald-auth-core consent migration (schema only) | **ALIA** |
| Notification | notification-service (Kafka-driven) | rald-notify (separate service) | Tie |
| API key management | api_keys table in DB + no API | rald-auth-core developer_platform migration | **Neither complete** |
| Merchant identity | merchant-service (complete logic) | Not present in RALD | **ALIA** |
| KYC/verification | verification-service | Not present in RALD | **ALIA** |
| Routing | routing-service + resolution-engine | rald-routing (being built) | **ALIA** — stop the new build |
| Fraud detection | fraud-service | Not present in RALD | **ALIA** |
| Governance | governance-service | Not present in RALD | **ALIA** |
| WebAuthn / Passkeys | ❌ Not present | rald-auth-core (implemented) | **RALD** |
| Machine identity | ❌ Not present | rald-auth-core machine_identity (migration exists) | **RALD** (partial) |

---

## CANONICAL OWNERSHIP DECISIONS

| Capability | Canonical Owner | Reasoning |
|-----------|----------------|-----------|
| Identity (users, orgs, merchants, institutions) | **ALIA** | Most complete implementation |
| Authentication (password, OTP, refresh) | **ALIA** | Full flow implemented |
| Authentication (WebAuthn, passkeys, device trust) | **RALD auth-core → migrate to ALIA** | RALD has it, ALIA needs it |
| Alias registry | **ALIA** | Complete, persisted, typed |
| Directory (public lookup) | **ALIA** | Natural owner |
| Resolution engine | **ALIA** | Complete, cached, event-driven |
| Routing profiles | **ALIA** | Complete, persisted |
| Trust scoring | **ALIA** | Rich signal model, migrate to DB |
| Fraud detection | **ALIA** | Complete, Kafka-integrated |
| Consent / mandates | **ALIA** | Complete, migrate to DB |
| Governance / country rules | **ALIA** | Complete, migrate to DB |
| KYC / verification | **ALIA** | Complete, wire providers |
| Audit trail | **ALIA** | Complete, Kafka-driven |
| Notifications | **ALIA** | Keep, wire providers |
| Machine identity | **RALD auth-core → migrate to ALIA** | RALD has schema, ALIA needs this |
| API key / developer platform | **ALIA** | DB table exists, build the API |
| SDK (auth, machine, routing) | **Shared SDK packages** | Extract from both |

---

## WHAT MUST BE DONE BEFORE BUILDING ANYTHING NEW

In priority order:

### P0 — Persistence (unblocks consent, trust, merchant, governance, verification)
1. Add Drizzle tables for: `consents`, `consent_audit_trail`, `mandates`, `trust_scores`, `trust_signals`, `trust_history`, `reputation_profiles`, `merchants`, `kyc_sessions`, `policies`, `verification_credentials`
2. Wire all in-memory Maps to DB
3. Add new migration: `0001_add_alia_engines.sql`

### P1 — Security hardening
1. Replace raw `account_token` in resolution-engine with a signed ephemeral JWT (60s TTL)
2. Add machine identity JWT to all service-to-service calls
3. Remove any X-Internal-Secret from RALD services
4. Move password hash to a dedicated `password_hash` column

### P2 — Missing capabilities
1. Migrate WebAuthn/passkeys from RALD auth-core into ALIA identity-service
2. Add machine identity service (or extract from RALD auth-core)
3. Build API key management API (table already exists)
4. Wire frontend apps to API

### P3 — Quality
1. Add test suite (Jest + supertest for integration tests)
2. Add per-service health check endpoints
3. Add Kubernetes configs for production deployment
