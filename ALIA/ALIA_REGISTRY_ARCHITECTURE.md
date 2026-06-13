# ALIA_REGISTRY_ARCHITECTURE.md
# RALD ALIA — Registry Architecture
**Version:** 1.0 — Phase 2 Governance
**Date:** 2026-06-13

---

## PURPOSE

The ALIA Registry is the canonical object system for the entire network. Every entity — Person, Business, Merchant, Institution, Developer, Government, Machine — receives a single `registry_id` that serves as its permanent identifier across all ALIA layers.

The Registry is the answer to: **"What is this entity, and what is its current status across all network dimensions?"**

---

## CORE CONCEPT: THE REGISTRY RECORD

Every entity in the network has exactly one registry record:

```typescript
interface RegistryRecord {
  // Identity
  registry_id:         string;   // "reg_01JXYZ..." — globally unique, permanent, immutable
  entity_type:         EntityType;
  entity_subtype?:     string;   // "commercial_bank" | "fintech" | "pension_fund" | etc.
  country_code:        string;   // ISO 3166-1 alpha-2
  display_name:        string;
  canonical_alias?:    string;   // primary alias (e.g. "@company")

  // Status dimensions — each independently managed
  identity_status:     IdentityStatus;
  verification_status: VerificationStatus;
  trust_status:        TrustStatus;
  consent_status:      ConsentStatus;
  routing_status:      RoutingStatus;
  country_status:      CountryStatus;
  compliance_status:   ComplianceStatus;

  // Trust summary (denormalized from trust-service for fast reads)
  trust_tier:          TrustTier;    // unverified | basic | standard | trusted | elite
  trust_score:         number;       // 0-100
  risk_level:          RiskLevel;    // critical | high | medium | low | minimal

  // Timestamps
  created_at:          string;       // ISO 8601
  updated_at:          string;
  verified_at?:        string;
  activated_at?:       string;
  suspended_at?:       string;
  archived_at?:        string;

  // Audit
  audit_metadata: {
    last_event_type:   string;
    last_event_at:     string;
    last_event_actor:  string;
    total_events:      number;
  };
}
```

---

## ENTITY TYPES

```typescript
type EntityType =
  | 'person'         // Individual user
  | 'business'       // Company, enterprise, NGO, association
  | 'merchant'       // Payment-accepting entity (may overlap with business)
  | 'institution'    // Bank, fintech, payment processor, payment scheme
  | 'developer'      // API consumer, product builder, SaaS operator
  | 'government'     // Central bank, tax authority, regulatory body, ministry
  | 'machine';       // Service identity, API robot, automated agent
```

---

## STATUS DIMENSIONS

Each dimension is independently managed by a different ALIA subsystem. The registry holds the current denormalized state for fast reads.

### 1. Identity Status
Managed by: `identity-service`
```typescript
type IdentityStatus =
  | 'available'    // Alias slot unreserved
  | 'pending'      // Registration in progress (< 30 min TTL)
  | 'verified'     // Email/phone verified, not yet active
  | 'active'       // Fully registered, normal access
  | 'trusted'      // Active + KYC verified at tier 2+
  | 'suspended'    // Access restricted, under review
  | 'archived';    // Permanently deactivated
```

### 2. Verification Status
Managed by: `verification-service`
```typescript
type VerificationStatus =
  | 'unverified'    // No KYC completed
  | 'tier_1'        // Phone/email verified only
  | 'tier_2'        // BVN/NIN/national ID verified
  | 'tier_3'        // Full KYC (business reg, utility bill, enhanced due diligence)
  | 'expired'       // KYC documents expired
  | 'rejected';     // KYC failed, entity blocked from upgrade
```

### 3. Trust Status
Managed by: `trust-service`
```typescript
type TrustStatus =
  | 'unverified'    // Score 0–29
  | 'basic'         // Score 30–49
  | 'standard'      // Score 50–69
  | 'trusted'       // Score 70–89
  | 'elite'         // Score 90–100
  | 'flagged'       // Under investigation — trust temporarily frozen
  | 'sanctioned';   // OFAC/UN match — permanent block
```

### 4. Consent Status
Managed by: `consent-service`
```typescript
type ConsentStatus =
  | 'none'          // No consents granted or received
  | 'active'        // One or more active consents exist
  | 'restricted'    // Consent capabilities restricted (e.g. suspended entity)
  | 'revoked_all';  // Entity has revoked all outgoing consents
```

### 5. Routing Status
Managed by: `routing-service`
```typescript
type RoutingStatus =
  | 'not_configured'  // No routing profile set
  | 'configured'      // Routing profile exists
  | 'active'          // Routing profile verified and resolvable
  | 'degraded'        // Primary bank unreachable, failover active
  | 'suspended';      // Routing disabled (fraud, compliance)
```

### 6. Country Status
Managed by: `governance-service`
```typescript
type CountryStatus =
  | 'disabled'       // Country not supported
  | 'internal'       // RALD team only
  | 'private_beta'   // Approved testers only
  | 'public_beta'    // Waitlist / open registration
  | 'ga';            // General Availability — full public access
```

### 7. Compliance Status
Managed by: `governance-service`
```typescript
type ComplianceStatus =
  | 'clear'          // No compliance flags
  | 'watchlist'      // Enhanced monitoring
  | 'reporting'      // Transactions auto-reported to regulator
  | 'restricted'     // Transaction limits enforced
  | 'blocked';       // All transactions blocked
```

---

## REGISTRY DATABASE SCHEMA

```sql
CREATE TABLE registry (
  -- Identity
  registry_id          TEXT PRIMARY KEY,
  entity_type          TEXT NOT NULL,
  entity_subtype       TEXT,
  country_code         TEXT NOT NULL,
  display_name         TEXT NOT NULL,
  canonical_alias      TEXT,

  -- Foreign keys to entity-specific tables
  person_id            TEXT,   -- → users.id
  business_id          TEXT,   -- → businesses.id
  merchant_id          TEXT,   -- → merchants.id
  institution_id       TEXT,   -- → institutions.id
  developer_id         TEXT,   -- → developers.id
  government_id        TEXT,   -- → governments.id
  machine_id           TEXT,   -- → machine_identities.id

  -- Status dimensions
  identity_status      TEXT NOT NULL DEFAULT 'pending',
  verification_status  TEXT NOT NULL DEFAULT 'unverified',
  trust_status         TEXT NOT NULL DEFAULT 'unverified',
  consent_status       TEXT NOT NULL DEFAULT 'none',
  routing_status       TEXT NOT NULL DEFAULT 'not_configured',
  country_status       TEXT NOT NULL DEFAULT 'disabled',
  compliance_status    TEXT NOT NULL DEFAULT 'clear',

  -- Trust snapshot (denormalized)
  trust_tier           TEXT NOT NULL DEFAULT 'unverified',
  trust_score          INTEGER NOT NULL DEFAULT 0,
  risk_level           TEXT NOT NULL DEFAULT 'high',

  -- Timestamps
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at          TIMESTAMPTZ,
  activated_at         TIMESTAMPTZ,
  suspended_at         TIMESTAMPTZ,
  archived_at          TIMESTAMPTZ,

  -- Audit
  last_event_type      TEXT,
  last_event_at        TIMESTAMPTZ,
  last_event_actor     TEXT,
  total_events         INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX registry_entity_type_idx    ON registry(entity_type);
CREATE INDEX registry_country_code_idx   ON registry(country_code);
CREATE INDEX registry_identity_status_idx ON registry(identity_status);
CREATE INDEX registry_trust_status_idx   ON registry(trust_status);
CREATE INDEX registry_canonical_alias_idx ON registry(canonical_alias);
CREATE UNIQUE INDEX registry_person_idx  ON registry(person_id) WHERE person_id IS NOT NULL;
CREATE UNIQUE INDEX registry_machine_idx ON registry(machine_id) WHERE machine_id IS NOT NULL;
```

---

## REGISTRY API

```
# Create a registry record (called internally by each identity service on entity creation)
POST /v1/registry
  Body: { entity_type, entity_subtype?, country_code, display_name, canonical_alias?, [entity_id_field] }
  Returns: RegistryRecord

# Fetch a registry record
GET /v1/registry/:registry_id
  Returns: RegistryRecord

# Lookup by alias
GET /v1/registry/lookup?alias=@username
  Returns: RegistryRecord (public fields only)

# Lookup by entity ID
GET /v1/registry/by-entity?type=person&id=usr_xxx
  Returns: RegistryRecord

# Update a specific status dimension (called by subsystem services)
PATCH /v1/registry/:registry_id/status
  Body: { dimension: 'identity_status' | 'verification_status' | ..., value: StatusValue, actor_id, reason? }
  Returns: RegistryRecord

# Batch status update (for trust-service bulk operations)
POST /v1/registry/batch/status
  Body: { registry_ids: string[], dimension, value, actor_id }

# Query registry (admin only)
GET /v1/registry?entity_type=institution&country_code=NG&identity_status=active
  Returns: { data: RegistryRecord[], total, page }

# Get full entity profile (registry + entity-specific fields)
GET /v1/registry/:registry_id/full
  Returns: { registry: RegistryRecord, entity: PersonRecord | BusinessRecord | ... }
```

---

## REGISTRY EVENT FLOW

When any subsystem changes an entity's status, it:
1. Updates the subsystem's own table (e.g. `users.status`)
2. Calls `PATCH /v1/registry/:registry_id/status` to update the registry dimension
3. Publishes a Kafka event: `registry.status_changed`
4. ALIA `audit-service` consumes and records the change

```
identity-service → user verified via OTP
  → PATCH /registry/reg_xxx/status { dimension: 'identity_status', value: 'verified' }
  → Kafka: registry.identity_status_changed

verification-service → KYC tier 2 approved
  → PATCH /registry/reg_xxx/status { dimension: 'verification_status', value: 'tier_2' }
  → Kafka: registry.verification_status_changed

trust-service → trust score updated
  → PATCH /registry/reg_xxx/status { dimension: 'trust_status', value: 'standard', trust_score: 65 }
  → Kafka: registry.trust_status_changed

governance-service → compliance flag raised
  → PATCH /registry/reg_xxx/status { dimension: 'compliance_status', value: 'reporting' }
  → Kafka: registry.compliance_status_changed

fraud-service → entity blocked
  → PATCH /registry/reg_xxx/status { dimension: 'routing_status', value: 'suspended' }
  → Kafka: registry.routing_suspended
```

---

## REGISTRY_ID FORMAT

```
reg_{timestamp_base36}_{random_8}
Example: reg_01jxyz4k_a3f9b2c1
```

All other ALIA entity IDs (`usr_`, `ali_`, `org_`, `mch_`, etc.) are foreign keys into their service tables. `registry_id` is the cross-service canonical identifier that links them all.

---

## MIGRATION PATH

**Existing entities** (users, organizations, aliases, merchants, routing profiles):
1. Run migration: for each existing user → create registry record with `entity_type = 'person'`
2. For each existing organization → create registry record with `entity_type = 'business'`
3. For each existing merchant → link to registry record
4. Set initial status dimensions based on existing data

Migration script: `packages/db/migrations/0003_create_registry.sql` + seed script `scripts/seed-registry.ts`
