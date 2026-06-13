# RALD ALIA — MISSING COMPONENTS
> Audit Date: 2026-06-13 | Priority: P0 = blocking, P1 = Phase 1, P2 = Phase 2

## P0 — Blocking Phase 1

### 1. ALIA Core Gateway (`rald-alia-core`)
**What**: Unified API gateway exposing all ALIA capabilities under one domain (`api.alia.rald.cloud`)
**Why missing**: Each service has its own subdomain. No unified ALIA surface.
**Required endpoints**:
```
POST   /v1/identity/resolve         — username/email/phone → identity
GET    /v1/identity/:id             — get identity profile
PATCH  /v1/identity/:id/status      — state machine transitions
POST   /v1/trust/score              — compute trust score
GET    /v1/trust/:id/explain        — WHY score explanation
POST   /v1/consent/grant            — grant permission
POST   /v1/consent/revoke           — revoke permission
GET    /v1/consent/:id/history      — consent audit trail
POST   /v1/authorize                — request authorization
POST   /v1/routing/resolve          — identity → routing instruction
```

### 2. Routing Engine (`rald-routing`)
**What**: Resolves identity (username/email/phone) to institution destination + secure token
**Why missing**: No repo, no service, no schema
**Spec requirement**: <200ms latency
**Required tables**:
```sql
routing_endpoints  — registered institution endpoints
routing_tokens     — ephemeral secure tokens (TTL: 60s)
routing_logs       — immutable routing decisions
```

### 3. Consent Engine API
**What**: Full consent management — grant, revoke, history, audit
**Why missing**: Privacy routes exist on auth-core but are informational only
**Required tables**:
```sql
consent_grants     — what was granted, to whom, why
consent_revocations — immutable revoke events
consent_history    — full audit trail
```

### 4. Identity Type + State Machine
**What**: Formal `identity_type` column + state machine in `auth_users`
**Why missing**: Current schema uses boolean flags, not a typed state machine
**Required**:
```sql
ALTER TABLE auth_users ADD COLUMN identity_type TEXT
  CHECK (identity_type IN ('username','email','phone','business','merchant','developer','institution'));
ALTER TABLE auth_users ADD COLUMN identity_state TEXT NOT NULL DEFAULT 'PENDING'
  CHECK (identity_state IN ('PENDING','VERIFIED','ACTIVE','SUSPENDED','REVOKED'));
```

### 5. Business / Merchant / Institution Identity
**What**: Identity types required by ALIA spec beyond personal identity
**Why missing**: Only personal (username/email/phone) identity is implemented
**Required tables**:
```sql
business_identities    — business KYB data
merchant_identities    — merchant onboarding
institution_identities — financial institution registry
```

---

## P1 — Phase 1 Required

### 6. Trust Score Explainability
**What**: Every trust score must explain WHY it exists
**Current state**: `trust_engine` migration exists but no explanation/signal API
**Required**:
- `GET /v1/trust/:id/signals` — list all signals contributing to score
- `GET /v1/trust/:id/explain` — human-readable explanation
- Audit: every score change logged with reason

### 7. Multi-Approval Authorization
**What**: Enterprise-grade multi-signature authorization
**Current state**: Single permission grants only
**Required**:
```
single approval      ✅ partial
multi approval       🔴 missing
delegated approval   🔴 missing
enterprise approval  🔴 missing
```

### 8. Developer Workspace API
**What**: Every identity automatically receives Developer Workspace + Project Space + Sandbox Access
**Current state**: `developer_platform` migration exists. No API surface exposed.
**Required**:
```
POST /developer/workspaces        — create workspace
GET  /developer/workspaces/:id    — get workspace
POST /developer/workspaces/:id/projects — create project
POST /developer/credentials       — issue internal service credentials (NOT public API keys yet)
```

### 9. Automated Machine Identity Rotation
**What**: Automatic rotation + expiration + renewal of machine credentials
**Current state**: Machine JWT issued manually. No rotation scheduler.
**Required**: Scheduled rotation job in `rald-auth-core` jobs directory

### 10. OpenTelemetry Pipeline
**What**: Full OTel instrumentation across all services
**Current state**: OpenObserve endpoint configured but request logging only
**Required**:
- Trace context propagation (W3C `traceparent`)
- Span creation for every route handler
- Metrics: latency, error rate, trust score distribution

### 11. Shared `@rald/auth-sdk` Package
**What**: Single source of truth for JWT verification across all Cloudflare Workers
**Why needed**: JWT logic duplicated in 6+ services
**Location**: Should live in a new `rald-sdk-auth` repo (currently a stub)

### 12. Shared `@rald/ui` Package
**What**: Single shadcn/ui component library shared across all React apps
**Why needed**: 6+ React apps each contain a full copy (~50 files each)
**Location**: Should live in new `rald-design` repo (currently TypeScript, 86KB — check if exists)

---

## P2 — Phase 2 / Post-Foundation

### 13. PayRald Infrastructure
All 9 PayRald repos are empty stubs.

### 14. mTLS Service Mesh
No confirmed mTLS between services. All use bearer tokens over HTTPS only.

### 15. Data Portability API
Migration `20260613500000_data_portability.sql` exists but no API.

### 16. Abuse Defense
Migration `20260613400000_abuse_defense.sql` exists but no API.

### 17. Kill Switch API (Admin)
Migration `20260613600000_kill_switches.sql` exists. `rald-config` has kill-switch routes but no admin UI wired to ALIA layer.

---

## Missing Database Tables (Phase 1 Spec)

| Table | Status | Service |
|-------|--------|---------|
| `routing_endpoints` | 🔴 Missing | Need: rald-routing |
| `routing_tokens` | 🔴 Missing | Need: rald-routing |
| `consent_grants` | 🔴 Missing | Need: rald-alia-core |
| `consent_revocations` | 🔴 Missing | Need: rald-alia-core |
| `business_identities` | 🔴 Missing | Need: rald-auth-core |
| `merchant_identities` | 🔴 Missing | Need: rald-auth-core |
| `institution_identities` | 🔴 Missing | Need: rald-auth-core |
| `authorization_requests` | 🔴 Missing | Need: rald-alia-core |
| `authorization_approvals` | 🔴 Missing | Need: rald-alia-core |
| `trust_signal_log` | 🟡 Partial | rald-auth-core (migration exists) |
| `developer_workspaces` | 🟡 Partial | rald-auth-core (migration exists) |
