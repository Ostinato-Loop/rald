# RALD ALIA — PHASE 1 ROADMAP
> Generated: 2026-06-13 | Based on audit findings

## Guiding Principle
Infrastructure correctness over feature count.
ALIA must support hundreds of millions of identities without foundational redesign.

---

## Sprint 1 — Identity Foundation (Weeks 1–2)

### 1.1 Formalize Identity State Machine
**Repo**: `rald-auth-core`
**Work**:
```sql
-- Add to auth_users
ALTER TABLE auth_users ADD COLUMN identity_type TEXT
  CHECK (identity_type IN ('username','email','phone','business','merchant','developer','institution'));
ALTER TABLE auth_users ADD COLUMN identity_state TEXT NOT NULL DEFAULT 'PENDING'
  CHECK (identity_state IN ('PENDING','VERIFIED','ACTIVE','SUSPENDED','REVOKED'));
ALTER TABLE auth_users ADD COLUMN routing_status TEXT NOT NULL DEFAULT 'INACTIVE'
  CHECK (routing_status IN ('INACTIVE','ACTIVE','RESTRICTED'));
ALTER TABLE auth_users ADD COLUMN consent_status TEXT NOT NULL DEFAULT 'NONE'
  CHECK (consent_status IN ('NONE','GRANTED','REVOKED'));
```
**Route**: `PATCH /identity/:id/state` — transitions with audit log

### 1.2 Business / Merchant / Institution Identity Tables
**Repo**: `rald-auth-core`
**New migration**: `20260614_extended_identity_types.sql`
```sql
CREATE TABLE business_identities (...);
CREATE TABLE merchant_identities (...);
CREATE TABLE institution_identities (...);
```

### 1.3 Kill X-Internal-Secret
**All repos**: `rald-event-bus`, `rald-config`, `rald-notify`, loop worker
Remove backward-compat path. Machine JWT only.

---

## Sprint 2 — Consent + Authorization (Weeks 2–3)

### 2.1 Consent Engine
**New migration**: `20260615_consent_engine.sql`
**New routes** in `rald-auth-core`:
```
POST /v1/consent/grant
POST /v1/consent/revoke
GET  /v1/consent/:id/history
GET  /v1/consent/:id/audit
```

### 2.2 Multi-Approval Authorization
**New migration**: `20260615_authorization_engine.sql`
```sql
CREATE TABLE authorization_requests (
  id TEXT PRIMARY KEY,
  requester_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  action TEXT NOT NULL,
  required_approvals INTEGER NOT NULL DEFAULT 1,
  expires_at TIMESTAMPTZ NOT NULL,
  state TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE authorization_approvals (
  id TEXT PRIMARY KEY,
  request_id TEXT REFERENCES authorization_requests(id),
  approver_id TEXT NOT NULL,
  approved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT
);
```

### 2.3 Immutable Audit Logs
Add PostgreSQL trigger on `audit_stream` preventing UPDATE + DELETE.
```sql
CREATE RULE no_update_audit AS ON UPDATE TO audit_stream DO INSTEAD NOTHING;
CREATE RULE no_delete_audit AS ON DELETE TO audit_stream DO INSTEAD NOTHING;
```

---

## Sprint 3 — Routing Engine (Weeks 3–4)

### 3.1 `rald-routing` New Service
**New repo** or new routes in `rald-auth-core`
**Target**: <200ms identity → routing instruction
```
POST /v1/routing/resolve
  body: { identifier: "@username" | "email" | "+234..." }
  returns: { routing_token, destination_hint, ttl: 60 }
```

### 3.2 Routing Tables
```sql
CREATE TABLE routing_endpoints (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  endpoint_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  country_code TEXT NOT NULL
);

CREATE TABLE routing_tokens (
  token TEXT PRIMARY KEY,
  identity_id TEXT NOT NULL,
  destination_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL -- NOW() + 60 seconds
);

CREATE TABLE routing_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  identity_id TEXT NOT NULL,
  destination_hint TEXT NOT NULL,
  latency_ms INTEGER,
  resolved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) -- append-only
```

---

## Sprint 4 — Trust Engine Explainability (Weeks 4–5)

### 4.1 Trust Signal Log
**New routes**:
```
GET /v1/trust/:id/signals   — all signals
GET /v1/trust/:id/explain   — human explanation
POST /v1/trust/:id/signal   — add signal (machine auth required)
```

### 4.2 Trust Score Transparency
Every score change must emit a `trust_level.changed` event to event bus with payload:
```json
{
  "old_score": 45,
  "new_score": 72,
  "signals_added": ["email_verified", "device_trusted"],
  "explanation": "Email verification added 20 points. Trusted device added 7 points."
}
```

---

## Sprint 5 — Developer Cloud + Machine Identity Hardening (Weeks 5–6)

### 5.1 Developer Workspace API
Expose the existing `developer_platform` migration as an API surface.

### 5.2 Automated Machine Identity Rotation
Add a scheduled job (Cloudflare Cron Trigger) to rotate machine credentials:
```typescript
// src/jobs/cleanup.ts — add rotation logic
export async function rotateMachineIdentities(env: Bindings) {
  // Find machine_identities expiring in < 24h
  // Issue new credentials
  // Notify via event bus: "machine_identity.rotated"
  // Deactivate old credentials
}
```

### 5.3 Shared `@rald/auth-sdk` Package
Move JWT verification to `rald-sdk-auth` repo.
All workers import from `@rald/auth-sdk` instead of local copy.

---

## Sprint 6 — Observability + OTel (Weeks 6–7)

### 6.1 OpenTelemetry Integration
Add W3C trace context propagation to all Cloudflare Workers.
Ship spans to OpenObserve.

### 6.2 ALIA Core Gateway
Build `api.alia.rald.cloud` as unified facade over all ALIA services.
Version all routes: `/v1/identity/*`, `/v1/trust/*`, `/v1/consent/*`, etc.

---

## What NOT to Build in Phase 1

Per spec — do not build:
- ❌ Merchant tools
- ❌ Cards
- ❌ Government systems
- ❌ Checkout
- ❌ Lending
- ❌ Crypto
- ❌ Public API keys (developer infrastructure only, internal credentials)
- ❌ Auto-expansion to new countries (Nigeria only, ADMIN APPROVAL for others)
