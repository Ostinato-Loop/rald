# ALIA_INSTITUTION_GOVERNANCE.md
# RALD ALIA — Institution Governance Model
**Version:** 1.0 — Phase 2 Governance
**Date:** 2026-06-13

---

## PRINCIPLE

No routing occurs to an institution that is not ACTIVE in ALIA. An institution's routing participation is not a technical setting — it is a governance decision made by ALIA Platform Admins with legal and compliance review.

---

## INSTITUTION TYPES

```typescript
type InstitutionType =
  | 'commercial_bank'       // Licensed commercial bank (e.g. Zenith Bank, Access Bank)
  | 'microfinance_bank'     // Licensed microfinance institution
  | 'fintech'               // Licensed fintech / digital bank (e.g. OPay, PalmPay)
  | 'mobile_money'          // Mobile money operator (e.g. MTN MoMo, Airtel Money)
  | 'payment_processor'     // Licensed payment processor / acquirer
  | 'payment_scheme'        // Interbank payment scheme (e.g. NIBSS, GhIPSS)
  | 'central_bank'          // Regulatory / lender of last resort
  | 'investment_bank'       // Licensed investment institution
  | 'savings_institution'   // Licensed savings/cooperative institution
  | 'insurance_provider'    // Licensed insurance carrier
  | 'pension_fund'          // Licensed pension fund administrator
  | 'tax_authority'         // Government tax body
  | 'customs_authority'     // Import/export duties
  | 'government_ministry';  // Other government payment entity
```

---

## INSTITUTION STATUS LIFECYCLE

```
                     ┌─────────────┐
                     │   PENDING   │ ← Onboarding application received
                     └──────┬──────┘
                            │ ALIA compliance review complete
                            ▼
                     ┌─────────────┐
                     │  VERIFIED   │ ← Documents checked, legal entity confirmed
                     └──────┬──────┘
                            │ Technical integration tested + admin approved
                            ▼
                     ┌─────────────┐
               ┌─────│   ACTIVE    │─────┐
               │     └─────────────┘     │
               │                         │
     Compliance│flag                     │Regulatory /
     or tech   │                         │Fraud action
     issue     ▼                         ▼
         ┌──────────────┐          ┌──────────────┐
         │  RESTRICTED  │          │  SUSPENDED   │
         │  (degraded   │          │  (all routing│
         │   routing)   │          │   blocked)   │
         └──────┬───────┘          └──────┬───────┘
                │                         │
                │ Cleared                 │ Not cleared (90 days)
                │                         │
                └────────► ACTIVE ◄───────┘
                                          │
                                          │ Permanent action
                                          ▼
                                   ┌──────────────┐
                                   │   REVOKED    │ ← Terminal. Never re-activated.
                                   └──────────────┘
```

---

## INSTITUTION RECORD SCHEMA

```sql
CREATE TABLE institutions (
  id                         TEXT PRIMARY KEY,
  registry_id                TEXT NOT NULL REFERENCES registry(registry_id),
  institution_type           TEXT NOT NULL,
  institution_subtype        TEXT,

  -- Legal identity
  legal_name                 TEXT NOT NULL,
  trading_name               TEXT,
  registration_number        TEXT NOT NULL,
  tax_identification         TEXT,
  swift_code                 TEXT,
  country_code               TEXT NOT NULL,

  -- ALIA routing
  bank_code                  TEXT UNIQUE,       -- The ALIA-assigned bank code for routing
  routing_prefix             TEXT,              // Prefix used in routing decisions
  supports_instant_payment   BOOLEAN NOT NULL DEFAULT false,
  supports_scheduled_payment BOOLEAN NOT NULL DEFAULT false,
  supports_mandate_payment   BOOLEAN NOT NULL DEFAULT false,
  max_routing_amount         NUMERIC,           -- Per-transaction limit for routing to this institution

  -- Regulatory
  regulatory_license_number  TEXT,
  regulatory_body            TEXT NOT NULL,
  license_expiry_date        DATE,
  aml_certifications         JSONB DEFAULT '[]',
  data_residency_compliant   BOOLEAN NOT NULL DEFAULT false,

  -- Status
  status                     TEXT NOT NULL DEFAULT 'pending',
  restricted_reason          TEXT,
  suspended_reason           TEXT,
  revoked_reason             TEXT,
  revoked_at                 TIMESTAMPTZ,

  -- Integration
  api_endpoint               TEXT,             -- Institution's API endpoint for verification callbacks
  webhook_url                TEXT,
  integration_type           TEXT,             -- 'nibss' | 'direct_api' | 'mock'
  sandbox_bank_code          TEXT,

  -- Approval
  verified_by                TEXT,
  verified_at                TIMESTAMPTZ,
  activated_by               TEXT,
  activated_at               TIMESTAMPTZ,
  approved_countries         JSONB DEFAULT '[]', -- Countries where routing is permitted

  -- Metadata
  contact_email              TEXT NOT NULL,
  contact_phone              TEXT,
  primary_admin_id           TEXT,              -- Institution's admin user in ALIA
  metadata                   JSONB,

  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX institutions_country_idx  ON institutions(country_code);
CREATE INDEX institutions_status_idx   ON institutions(status);
CREATE INDEX institutions_type_idx     ON institutions(institution_type);
CREATE INDEX institutions_bank_code_idx ON institutions(bank_code);
```

---

## INSTITUTION ONBOARDING PROCESS

### Step 1: Application (PENDING)
Institution submits onboarding request via ALIA Admin API or onboarding form.

Required documents:
- Certificate of Incorporation / Registration
- Regulatory License (CBN approval, BoG license, etc.)
- Tax Identification Number
- AML/KYC policy document
- Data processing agreement
- Technical integration contact

```
POST /v1/admin/institutions
  Body: { legal_name, institution_type, country_code, registration_number, ... }
  → status: 'pending'
  → Kafka: institution.application_received
  → ALIA ops team notified
```

### Step 2: Compliance Review (PENDING → VERIFIED)
ALIA compliance team reviews:
- Regulatory license validity
- AML certification
- Data residency compliance
- Sanctions screening (OFAC, UN)

```
POST /v1/admin/institutions/:id/verify
  Body: { verified_by, license_number, aml_certified, data_residency_compliant, notes }
  → status: 'verified'
  → Kafka: institution.verified
```

### Step 3: Technical Integration (VERIFIED)
ALIA tech team:
- Assigns `bank_code` (internal routing code)
- Configures routing integration type (NIBSS, direct API, or mock for testing)
- Tests sandbox routing end-to-end

### Step 4: Activation (VERIFIED → ACTIVE)
Platform Admin approves activation for specific countries.

```
POST /v1/admin/institutions/:id/activate
  Body: { activated_by, approved_countries: ['NG'], max_routing_amount }
  → status: 'active'
  → Kafka: institution.activated
  → Resolution engine cache warmed for institution
```

---

## ROUTING RULES BY INSTITUTION STATUS

| Status | Routing Allowed | Direction |
|--------|----------------|-----------|
| PENDING | ❌ | — |
| VERIFIED | ❌ (sandbox only) | — |
| ACTIVE | ✅ | Both inbound and outbound |
| RESTRICTED | ⚠️ | Inbound only, capped at 20% of standard limits |
| SUSPENDED | ❌ | All routing blocked, in-flight transactions returned |
| REVOKED | ❌ | Permanent block, aliases pointing to this institution marked for migration |

---

## INSTITUTION GOVERNANCE EVENTS

Every institution status change produces:

```
Kafka events (consumed by all services):
  institution.verified        → trust-service adds 'institution_verified' signal
  institution.activated       → resolution-engine warms institution routing cache
  institution.restricted      → routing-service reduces routing quota
  institution.suspended       → routing-service blocks all routing to institution
                              → fraud-service flags all pending resolutions
  institution.revoked         → routing-service permanent block
                              → alias-service flags all aliases pointing to this institution
                              → notification-service alerts affected users
```

---

## INSTITUTION RESTRICTIONS (RESTRICTED STATUS)

An institution enters RESTRICTED when there is a compliance concern that does not yet warrant full suspension. Examples:
- License renewal pending (grace period)
- Technical issues causing elevated routing failure rate
- AML policy update in progress

In RESTRICTED status:
- Inbound routing accepted (users can receive payments)
- Outbound routing suspended (users cannot initiate payments from this institution)
- Per-transaction limit reduced to 20% of normal
- Daily monitoring report auto-generated
- RESTRICTED auto-escalates to SUSPENDED after 30 days without resolution

---

## INSTITUTION REVOCATION (TERMINAL)

Revocation is permanent. Applied when:
- Regulatory license revoked by central bank
- Institution enters administration/receivership
- Systematic fraud detected originating from institution
- Institution voluntarily exits network

Upon revocation:
1. All routing blocked immediately
2. All open mandates for this institution cancelled
3. All users with routing profiles pointing to this institution notified
4. Migration window opened: users have 90 days to update routing profiles
5. After 90 days: aliases pointing to revoked institution marked unresolvable
6. Institution record archived, `bank_code` retired (never reused)

---

## BANK CODE REGISTRY

ALIA maintains a canonical bank code registry separate from any single country's interbank scheme. ALIA bank codes are:
- Globally unique across all ALIA-supported countries
- Prefixed with country code: `NG-058` (Zenith Bank Nigeria), `GH-030` (GCB Bank Ghana)
- Immutable — once assigned, never changed or reused
- Map to one or more interbank routing codes (NIBSS sort codes, SWIFT, etc.)

```sql
CREATE TABLE bank_code_registry (
  alia_code          TEXT PRIMARY KEY,   -- 'NG-058'
  institution_id     TEXT NOT NULL REFERENCES institutions(id),
  country_code       TEXT NOT NULL,
  nibss_sort_code    TEXT,
  swift_code         TEXT,
  gh_ipss_code       TEXT,
  ke_pesalink_code   TEXT,
  interbank_codes    JSONB NOT NULL DEFAULT '{}',  -- extensible
  is_active          BOOLEAN NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## PRE-LOADED INSTITUTION REGISTRY (40+ Banks)

The existing `@rald-alia/shared` bank registry covers:
- 20+ Nigerian banks (Zenith, Access, GTBank, First Bank, UBA, etc.)
- 8+ Ghanaian banks (GCB, Ecobank Ghana, etc.)
- 5+ Kenyan banks (KCB, Equity, etc.)
- 4+ South African banks (Standard Bank, FNB, etc.)
- 3+ Rwandan banks (BK, Equity Rwanda, etc.)

These will be migrated into the `institutions` table during Phase 2 setup, with initial status of `PENDING` until formal onboarding is completed for each institution.
