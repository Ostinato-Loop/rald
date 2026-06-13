# ALIA_CODE_AUDIT.md
# RALD ALIA — Complete GitLab Source Code Audit
**Audit Date:** 2026-06-13
**Auditor:** RALD Agent — Phase 1B Pre-Build Audit
**Source:** `gitlab.com/sekanidev/rald-alia.git` (commit ab66d353)
**Status:** REAL CODEBASE — 499 objects, last active 2026-06-11

---

## EXECUTIVE SUMMARY

The GitLab ALIA repository contains a **fully implemented, production-grade microservices platform**. It is NOT empty. A previous clone attempt failed due to authentication configuration. On re-clone with a valid token, the full codebase was retrieved.

**ALIA is more complete than the GitHub ecosystem audit suggested.**

The previous Phase 1 audit classified Routing at 5% complete. The correct figure is **~65%** when ALIA GitLab is included.

---

## REPOSITORY STRUCTURE

```
rald-alia/
├── services/           # 13 microservices
│   ├── identity-service/       # port 3001 — users, auth, organizations, bank-links
│   ├── alias-service/          # port 3002 — email/phone/username/business aliases
│   ├── directory-service/      # port 3003 — public alias directory lookup
│   ├── resolution-engine/      # port 3004 — alias → routing token resolution
│   ├── routing-service/        # port 3005 — routing profiles + multi-bank failover
│   ├── fraud-service/          # port 3006 — velocity checks, risk scoring
│   ├── audit-service/          # port 3007 — immutable audit log consumer
│   ├── notification-service/   # port 3008 — email, SMS, webhooks via Kafka
│   ├── governance-service/     # port 3009 — policies, country rules, compliance
│   ├── consent-service/        # port 3010 — grant/revoke/mandate/permission
│   ├── trust-service/          # port 3011 — trust scores, signals, reputation
│   ├── merchant-service/       # port 3012 — merchant registration + verification
│   └── verification-service/   # port 3013 — KYC, BVN, NIN, credentials
├── packages/
│   ├── db/             # Drizzle ORM — PostgreSQL schema + migrations
│   ├── kafka/          # Apache Kafka producer/consumer + 30+ typed events
│   └── shared/         # Types, errors, bank registry, utilities
├── lib/
│   ├── api-spec/       # OpenAPI 3.1.0 contract (full multi-domain spec)
│   ├── api-client-react/  # React/fetch SDK (auto-generated)
│   └── api-zod/        # Zod validation schemas
├── frontend/
│   ├── apps/admin-console/       # Next.js admin dashboard
│   ├── apps/bank-dashboard/      # Next.js bank portal
│   ├── apps/developer-console/   # Next.js developer portal
│   ├── apps/marketing-site/      # Next.js marketing landing
│   └── packages/ui/              # Shared Tailwind component library
└── scripts/            # Seed scripts
```

---

## SERVICE-BY-SERVICE AUDIT

### 1. `identity-service` — Port 3001
**Status: COMPLETE**

**Authentication system:**
- `POST /v1/auth/register` — email + password, OTP via Kafka → notification-service
- `POST /v1/auth/verify-email` — 6-digit OTP verification, issues JWT pair
- `POST /v1/auth/resend-otp` — OTP resend with rate logic
- `POST /v1/auth/login` — bcrypt password verification, JWT pair
- `POST /v1/auth/refresh` — 30-day refresh token rotation
- `POST /v1/auth/forgot-password` — reset OTP, email enumeration-safe
- `POST /v1/auth/reset-password` — OTP + new password
- `GET  /v1/auth/me` — authenticated profile (strips bvnHash, ninHash, metadata)

**User management:**
- `POST /v1/users` — create user (service-to-service, no auth required)
- `GET  /v1/users/:id` — fetch user (auth required)
- `PATCH /v1/users/:id` — update (owner-only, auth required)
- `POST /v1/users/:id/verify` — trigger verification event

**Organization management:**
- `POST /v1/organizations` — create org with RC number
- `GET  /v1/organizations/:id` — fetch org
- `GET  /v1/organizations` — list by owner
- `PATCH /v1/organizations/:id` — update

**Bank links:**
- `POST /v1/bank-links` — link bank account (tokenized, no NUBAN stored)
- `GET  /v1/bank-links` — list by user
- `DELETE /v1/bank-links/:id` — unlink

**Identity types supported:**
- ✅ User (individual) — fully implemented
- ✅ Organization — fully implemented
- ❌ Business (separate from org) — not differentiated
- ❌ Merchant — delegated to merchant-service (no identity linking)
- ❌ Institution — not implemented
- ❌ Developer — not implemented (portal frontend only)
- ❌ Government — not implemented
- ❌ WebAuthn / Passkeys — not implemented (RALD auth-core has this)
- ❌ Device trust — not implemented
- ❌ Account recovery beyond OTP — not implemented

**Security implementation:**
- bcryptjs SALT_ROUNDS=12
- JWT access: 15m, JWT refresh: 30d
- OTP: `crypto.randomInt(100_000, 999_999)` — SHA-256 hashed, 10m TTL
- Password stored as bcrypt hash in `users.metadata.passwordHash` (JSONB — not a dedicated column)
- BVN/NIN stored as SHA-256 hashes (`bvn_hash`, `nin_hash` columns)

---

### 2. `alias-service` — Port 3002
**Status: COMPLETE**

Types supported: `email` | `phone` | `username` | `business_handle`

- `POST /v1/aliases` — create alias → validates uniqueness, publishes ALIAS_CREATED
- `GET  /v1/aliases` — list (paginated, filter by userId)
- `GET  /v1/aliases/:id` — get by ID
- `PATCH /v1/aliases/:id` — update bankCode/accountToken/accountName/isPrimary → publishes ALIAS_UPDATED
- `DELETE /v1/aliases/:id` — soft delete (deletedAt) → publishes ALIAS_DELETED

Persistence: Drizzle → PostgreSQL `aliases` table with unique `normalized_value` index.

---

### 3. `directory-service` — Port 3003
**Status: IMPLEMENTED** (basic)

Public alias lookup — `GET /v1/directory/:alias` — no auth required.

---

### 4. `resolution-engine` — Port 3004
**Status: COMPLETE**

The core ALIA resolution capability:
- `POST /v1/resolve` — alias → routing token, <200ms target
- Redis cache (60s TTL) on `resolve:{normalized_alias}`
- Auto-detects alias type: email/phone/username/business_handle
- DB lookup via `aliases` table (active + not deleted)
- Falls back to `bank_links` for institution name
- Publishes `resolution.requested` + `resolution.completed` Kafka events
- Returns: `token` (account_token), `routing.destinationBankCode`, `routing.destinationBankName`, `routing.accountName`, `resolvedAt`, `latencyMs`

**What's missing:**
- ❌ Signed routing token (currently returns raw `account_token` — should be ephemeral signed JWT)
- ❌ Government/institution/developer identity resolution
- ❌ Cross-country routing rules
- ❌ Rate limiting at service level (relies on gateway)

---

### 5. `routing-service` — Port 3005
**Status: COMPLETE** (basic routing profiles)

- `GET  /v1/routing/:userId` — get routing profile
- `POST /v1/routing/:userId` — upsert routing profile (primaryBankCode, fallback)
- `POST /v1/routing/resolve` — determine optimal route for a transaction

Persistence: `routing_profiles` table. Failover logic: profile → bank_links → error.

**What's missing:**
- ❌ Institution-level routing rules
- ❌ Priority-based multi-destination routing
- ❌ Country-based routing rules
- ❌ Routing analytics/latency metrics

---

### 6. `fraud-service` — Port 3006
**Status: COMPLETE**

- Velocity tracking via Redis (60s window, >50 = CRITICAL, >20 = ELEVATED)
- Signals: `NEW_DEVICE`, `UNUSUAL_HOUR`, `FOREIGN_IP`, `HIGH_VELOCITY`, `ELEVATED_VELOCITY`
- Risk levels: `low` / `medium` / `high` / `critical`
- Actions: `allow` / `review` / `block`
- Persists fraud events to DB when score ≥ 40
- Publishes `fraud.detected` Kafka event on block
- `GET /v1/fraud` — list events
- `POST /v1/fraud/resolve/:id` — mark resolved

---

### 7. `audit-service` — Port 3007
**Status: IMPLEMENTED**

Kafka consumer listening to all event topics. Writes immutable entries to `audit_logs` with SHA-256 checksum field.
- `GET /v1/audit` — query audit logs (paginated, filterable)

---

### 8. `notification-service` — Port 3008
**Status: COMPLETE**

Kafka consumer for:
- `notification.send_otp` — email OTP
- `notification.send_password_reset` — reset code
- `notification.welcome` — welcome email

Pluggable provider interface (email: Resend/SendGrid/SMTP, SMS: Termii/Twilio).

---

### 9. `governance-service` — Port 3009
**Status: COMPLETE**

Policy engine + country rules:
- 5 countries fully profiled: NG, GH, KE, ZA, RW (regulatory body, KYC tiers, transaction limits, compliance frameworks)
- Real compliance frameworks encoded: CBN_AML, NDPR, NFIU, BOG_AML, FAIS, FICA, POPIA, POPIA, BNR_AML
- Transaction validation (limit checks, reporting thresholds)
- Policy CRUD (`POST /v1/governance/policies`, `GET`, `PATCH`, `DELETE`)
- Policy evaluation engine with condition matching
- `POST /v1/governance/validate` — validate action against policies
- Country rules: BVN/NIN requirements, alias limits, KYC mandates

---

### 10. `consent-service` — Port 3010
**Status: COMPLETE**

Consent engine:
- `POST /v1/consents/grant` — typed consent (scope[], purpose, data_classes, duration, conditions)
- `GET  /v1/consents` — list (filter by subject/grantee/scope/status)
- `GET  /v1/consents/:id` — get consent
- `POST /v1/consents/:id/revoke` — revoke with reason + audit entry
- `POST /v1/consents/verify` — check if grantee has required scopes from subject
- `GET  /v1/consents/:id/audit` — immutable consent audit trail

Mandate engine (recurring payment authorization):
- `POST /v1/mandates` — create mandate (frequency, max_amount, currency, end_date)
- `POST /v1/mandates/:id/cancel` — cancel with reason
- `POST /v1/mandates/:id/verify` — verify before executing a charge

Permission route: scope registry + RBAC verification.

**Limitation:** In-memory storage (Map). Persistence via DB is NOT yet wired. Needs Drizzle + PostgreSQL tables.

---

### 11. `trust-service` — Port 3011
**Status: COMPLETE**

Trust score engine:
- `GET  /v1/trust/:entityId?entity_type=` — get trust score
- `POST /v1/trust/calculate` — calculate with signals
- `POST /v1/trust/signal` — ingest a single signal (15 signal types with weights)
- `GET  /v1/trust/batch` — batch score lookup (up to 100 entities)
- `GET  /v1/trust/:entityId/history` — score history with from/to filters

Tiers: `unverified` < `basic` < `standard` < `trusted` < `elite`
Risk: `critical` < `high` < `medium` < `low` < `minimal`

Signal weights: `verification_completed: +15`, `fraud_flagged: -30`, `kyc_upgrade: +20`, etc.

Reputation engine:
- `GET  /v1/trust/reputation/:entityId` — get profile
- `POST /v1/trust/reputation/flag` — flag entity (severity: low/medium/high/critical)
- Tracks: sanctions_match, PEP_match, adverse_media, participation_history

**Limitation:** In-memory storage (Map). Persistence NOT yet wired to DB.

**What's missing:**
- ❌ Explainability API (`GET /v1/trust/:id/explain`)
- ❌ Cross-service trust signal ingestion hooks

---

### 12. `merchant-service` — Port 3012
**Status: COMPLETE**

- Merchant registration (handle uniqueness, owner linkage)
- Merchant verification (verified_by, trust_score +30 on approval)
- Merchant suspension (reason + audit)
- Handle availability check
- Collection engine (payment collection flows)
- Analytics routes

**Limitation:** In-memory storage (Map). Persistence NOT wired.

---

### 13. `verification-service` — Port 3013
**Status: COMPLETE** (with stub provider hooks)

KYC engine:
- `POST /v1/verification/kyc/initiate` — multi-tier (1/2/3), multi-country, multi-provider
- Providers: `internal` | `youverify` | `smile_id` | `dojah` | `prembly`
- Documents: BVN, NIN, passport, national_id, ghana_card, driving_license, voters_card, utility_bill, bank_statement, CAC certificate, tax certificate
- `POST /v1/verification/kyc/verify/bvn` — BVN verification (hash + youverify hook)
- `POST /v1/verification/kyc/verify/nin` — NIN verification
- `POST /v1/verification/kyc/session/:id/approve` — admin approval
- `POST /v1/verification/kyc/session/:id/reject` — rejection with reason

Credential engine: verifiable credential issuance/revocation.
Document engine: document verification workflows.

**Limitation:** Provider calls are stubbed (returns mock response with note). Live integration with youverify/smile_id requires production credentials.

---

## SHARED PACKAGE AUDIT

### `@rald-alia/db`
- Drizzle ORM + node-postgres
- 8 tables: `users`, `organizations`, `aliases`, `bank_links`, `routing_profiles`, `api_keys`, `audit_logs`, `fraud_events`, `webhooks`
- Full migration in `0000_initial_schema.sql`

### `@rald-alia/kafka`
- 30+ typed Kafka events with full TypeScript interfaces
- Topics: alias.*, bank.*, resolution.*, fraud.*, user.*, consent.*, mandate.*, trust.*, merchant.*, verification.*, governance.*, notification.*
- Idempotent producer (maxInFlightRequests: 5)
- Consumer with group-based processing

### `@rald-alia/shared`
- Bank registry: 40+ banks across NG, GH, KE, ZA, RW
- Error classes: `RaldAliaError`, `NotFoundError`, `ValidationError`, `ConflictError`, `UnauthorizedError`, `ForbiddenError`, `RateLimitError`, domain-specific errors
- Type definitions: `Alias`, `User`, `Organization`, `BankLink`, `ResolutionResult`, `FraudScore`, `AuditEntry`, `ApiKey`, `Webhook`

---

## FRONTEND AUDIT

All 4 Next.js apps exist with full page structure:

| App | Pages | Status |
|-----|-------|--------|
| `admin-console` | overview, users, aliases, analytics, banks, governance, risk, incidents | UI ONLY — no API integration |
| `bank-dashboard` | overview, alias-directory, audit-logs, compliance, fraud-monitoring, institutions, resolution-metrics | UI ONLY |
| `developer-console` | dashboard, projects, api-keys, analytics, billing, sandbox, usage, webhooks | UI ONLY |
| `marketing-site` | landing (Hero, Features, HowItWorks, ForBanks, ForDevelopers, Pricing, Security, Stats) | UI ONLY |

Shared `@rald-alia/ui` package: Button, Card, Badge, Input, Stat, Table.

**No frontend is wired to the API.** The `lib/api-client-react` package is scaffolded but not integrated.

---

## INFRASTRUCTURE AUDIT

- **Runtime:** Node.js 20, pnpm 9
- **Database:** PostgreSQL 16 (single shared DB — no per-service isolation)
- **Cache:** Redis 7 (ioredis)
- **Message Bus:** Apache Kafka 3.x (Confluent, via Zookeeper)
- **CI/CD:** GitLab CI (typecheck → build → Docker push to `registry.gitlab.com/sekanidev/rald-alia`)
- **Deployment model:** Docker Compose (development) — no Kubernetes config, no Helm charts
- **Gateway:** Custom Express.js reverse proxy with JWT verification and service proxying

---

## ANSWERS TO THE 7-CATEGORY QUESTIONNAIRE

### Identity — Does ALIA implement:
- ✅ Username system — `username` alias type
- ✅ Email identity — `email` alias type + auth system
- ✅ Phone identity — `phone` alias type
- ✅ Recovery — OTP-based password reset
- ❌ Passkeys — NOT implemented (RALD auth-core has it)
- ❌ WebAuthn — NOT implemented
- ❌ Device trust — NOT implemented
- ✅ Account recovery — Email OTP-based recovery

### Trust — Does ALIA implement:
- ✅ Trust scores — Full scoring engine with weights
- ✅ Reputation — ReputationEngine with flags, sanctions, PEP
- ✅ Fraud signals — FraudService with velocity + context signals
- ✅ Verification — KYC multi-tier/provider
- ❌ Explainable trust — No `/explain` endpoint

### Consent — Does ALIA implement:
- ✅ Grant — Full consent grant with scopes, purpose, data_classes
- ✅ Revoke — With reason, audit trail
- ✅ Expiration — `duration_days` → `expires_at`, auto-expire on verify
- ✅ History — `GET /consents/:id/audit`
- ✅ Audit — Full audit trail per consent

### Authorization — Does ALIA implement:
- ✅ One-time approval — Consent verify
- ✅ Delegated approval — Mandate engine (merchant → user delegated payments)
- ❌ Multi-party approval — NOT implemented
- ❌ Enterprise approval — NOT implemented

### Routing — Does ALIA implement:
- ✅ Username resolution — `POST /v1/resolve` (username type)
- ✅ Phone resolution — `POST /v1/resolve` (phone type)
- ✅ Email resolution — `POST /v1/resolve` (email type)
- ✅ Merchant resolution — `business_handle` type
- ❌ Institution resolution — NOT implemented
- ❌ Signed routing token — Returns raw account_token (not ephemeral signed JWT)

### Machine Identity — Does ALIA implement:
- ❌ Service authentication — NONE. Gateway uses user JWT, no machine JWT
- ❌ Machine JWT — NOT implemented
- ❌ Service registry — NOT implemented
- ❌ Service trust — NOT implemented
- ❌ Credential rotation — NOT implemented

### Developer Cloud — Does ALIA implement:
- ✅ API keys — `api_keys` table exists in DB schema
- ✅ Organizations — Full organization identity
- ❌ Projects — No project concept (only organizations)
- ❌ SDK provisioning — No developer-facing SDK generation
- ❌ Developer workspaces — Frontend exists, no backend
- ❌ API key management API — Table exists, no routes exposed

---

## CRITICAL FINDINGS

1. **Machine identity is completely absent** — all 13 services use user JWT or no auth for internal calls. No service-to-service authentication exists.

2. **Consent, Trust, and Merchant services use in-memory Maps** — Data is lost on restart. These 3 services need DB persistence wired.

3. **Resolution returns raw account_token** — This is a security issue. The token directly references bank account data. Should be an ephemeral signed JWT that expires in 60 seconds.

4. **Single shared PostgreSQL database** — All services share one DB. No isolation at DB level. A compromised service can read any table.

5. **Password stored in JSONB metadata** — `users.metadata.passwordHash` is not indexed and not in a dedicated column. This makes security auditing difficult.

6. **No WebAuthn/passkeys** — RALD auth-core (GitHub) has this; ALIA does not.

7. **No Cloudflare/edge deployment** — ALIA is Docker-only. No edge caching, no CDN routing. Target latency of <200ms is achievable locally but not globally without edge.

8. **Frontend is not wired to API** — All 4 frontend apps have no API integration. Pages render static/mock data.
