# ALIA_MIGRATION_PLAN.md
# RALD ALIA — Migration Plan: Moving to Production-Ready Architecture
**Audit Date:** 2026-06-13

---

## CRITICAL PATH TO PRODUCTION

5 things must happen before ALIA can serve production traffic:

1. ⛔ Fix in-memory persistence (consent, trust, merchant, governance, verification)
2. ⛔ Implement signed routing tokens (security fix in resolution-engine)
3. ⛔ Add machine identity (service-to-service auth)
4. ⛔ Wire verification providers (youverify/smile_id)
5. ⛔ Add test suite (any production system requires minimum coverage)

---

## MIGRATION M1: Database Persistence

### Files to create/modify

**File:** `packages/db/migrations/0001_add_alia_engines.sql`

```sql
-- Consent
CREATE TABLE consents (
  id               TEXT PRIMARY KEY,
  subject_id       TEXT NOT NULL,
  subject_type     TEXT NOT NULL,
  grantee_id       TEXT NOT NULL,
  grantee_type     TEXT NOT NULL,
  scope            JSONB NOT NULL DEFAULT '[]',
  purpose          TEXT NOT NULL,
  data_classes     JSONB NOT NULL DEFAULT '[]',
  status           TEXT NOT NULL DEFAULT 'active',
  signature        TEXT NOT NULL,
  version          INTEGER NOT NULL DEFAULT 1,
  conditions       JSONB,
  ip_address       TEXT,
  user_agent       TEXT,
  granted_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at       TIMESTAMPTZ,
  revoked_at       TIMESTAMPTZ,
  revocation_reason TEXT,
  revoked_by       TEXT
);
CREATE INDEX consents_subject_idx  ON consents(subject_id);
CREATE INDEX consents_grantee_idx  ON consents(grantee_id);
CREATE INDEX consents_status_idx   ON consents(status);

-- Consent audit trail
CREATE TABLE consent_audit_trail (
  id          TEXT PRIMARY KEY,
  consent_id  TEXT NOT NULL REFERENCES consents(id),
  event       TEXT NOT NULL,
  actor_id    TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mandates
CREATE TABLE mandates (
  id                    TEXT PRIMARY KEY,
  subject_id            TEXT NOT NULL,
  merchant_id           TEXT NOT NULL,
  purpose               TEXT NOT NULL,
  amount                NUMERIC,
  max_amount            NUMERIC,
  currency              TEXT NOT NULL,
  frequency             TEXT NOT NULL,
  custom_interval_days  INTEGER,
  start_date            TIMESTAMPTZ NOT NULL,
  end_date              TIMESTAMPTZ,
  bank_account_alias    TEXT,
  status                TEXT NOT NULL DEFAULT 'active',
  cancellation_reason   TEXT,
  cancelled_by          TEXT,
  cancelled_at          TIMESTAMPTZ,
  total_executions      INTEGER NOT NULL DEFAULT 0,
  last_executed_at      TIMESTAMPTZ,
  next_execution_at     TIMESTAMPTZ,
  metadata              JSONB,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX mandates_subject_idx  ON mandates(subject_id);
CREATE INDEX mandates_merchant_idx ON mandates(merchant_id);
CREATE INDEX mandates_status_idx   ON mandates(status);

-- Trust scores
CREATE TABLE trust_scores (
  id                    TEXT PRIMARY KEY,
  entity_id             TEXT NOT NULL,
  entity_type           TEXT NOT NULL,
  overall_score         INTEGER NOT NULL DEFAULT 30,
  components            JSONB NOT NULL DEFAULT '[]',
  tier                  TEXT NOT NULL DEFAULT 'unverified',
  risk_level            TEXT NOT NULL DEFAULT 'high',
  fraud_score           INTEGER NOT NULL DEFAULT 70,
  signals_count         INTEGER NOT NULL DEFAULT 0,
  last_recalculated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX trust_scores_entity_idx ON trust_scores(entity_id, entity_type);

-- Trust signals
CREATE TABLE trust_signals (
  id           TEXT PRIMARY KEY,
  entity_id    TEXT NOT NULL,
  entity_type  TEXT NOT NULL,
  signal_type  TEXT NOT NULL,
  value        NUMERIC NOT NULL,
  source       TEXT NOT NULL,
  metadata     JSONB,
  applied_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX trust_signals_entity_idx ON trust_signals(entity_id);

-- Trust history
CREATE TABLE trust_history (
  id          TEXT PRIMARY KEY,
  entity_id   TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  score       INTEGER NOT NULL,
  event       TEXT NOT NULL,
  delta       INTEGER NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX trust_history_entity_idx ON trust_history(entity_id);

-- Reputation profiles
CREATE TABLE reputation_profiles (
  id                   TEXT PRIMARY KEY,
  entity_id            TEXT NOT NULL,
  entity_type          TEXT NOT NULL,
  reputation_score     INTEGER NOT NULL DEFAULT 50,
  flags                JSONB NOT NULL DEFAULT '[]',
  sanctions_match      BOOLEAN NOT NULL DEFAULT false,
  pep_match            BOOLEAN NOT NULL DEFAULT false,
  adverse_media        BOOLEAN NOT NULL DEFAULT false,
  participation_history JSONB NOT NULL DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX reputation_entity_idx ON reputation_profiles(entity_id, entity_type);

-- Merchants
CREATE TABLE merchants (
  id                           TEXT PRIMARY KEY,
  name                         TEXT NOT NULL,
  handle                       TEXT NOT NULL,
  owner_id                     TEXT NOT NULL,
  owner_type                   TEXT NOT NULL DEFAULT 'user',
  category                     TEXT NOT NULL,
  country                      TEXT NOT NULL,
  business_registration_number TEXT,
  tax_identification_number    TEXT,
  contact_email                TEXT NOT NULL,
  contact_phone                TEXT NOT NULL,
  website                      TEXT,
  description                  TEXT,
  bank_alias                   TEXT,
  status                       TEXT NOT NULL DEFAULT 'pending',
  verified                     BOOLEAN NOT NULL DEFAULT false,
  verified_at                  TIMESTAMPTZ,
  verified_by                  TEXT,
  verification_notes           TEXT,
  trust_score                  INTEGER NOT NULL DEFAULT 30,
  suspension_reason            TEXT,
  suspended_at                 TIMESTAMPTZ,
  suspended_by                 TEXT,
  metadata                     JSONB,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX merchants_handle_idx ON merchants(handle);
CREATE INDEX merchants_owner_idx         ON merchants(owner_id);
CREATE INDEX merchants_country_idx       ON merchants(country);
CREATE INDEX merchants_status_idx        ON merchants(status);

-- KYC sessions
CREATE TABLE kyc_sessions (
  id                     TEXT PRIMARY KEY,
  entity_id              TEXT NOT NULL,
  entity_type            TEXT NOT NULL,
  country                TEXT NOT NULL,
  tier                   TEXT NOT NULL,
  documents              JSONB NOT NULL DEFAULT '[]',
  provider               TEXT NOT NULL DEFAULT 'internal',
  status                 TEXT NOT NULL DEFAULT 'pending',
  rejection_reason       TEXT,
  review_notes           TEXT,
  reviewed_by            TEXT,
  reviewed_at            TIMESTAMPTZ,
  callback_url           TEXT,
  verification_reference TEXT NOT NULL,
  expires_at             TIMESTAMPTZ NOT NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX kyc_sessions_entity_idx ON kyc_sessions(entity_id);
CREATE INDEX kyc_sessions_status_idx ON kyc_sessions(status);

-- Policies
CREATE TABLE policies (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  description     TEXT,
  type            TEXT NOT NULL,
  scope           TEXT NOT NULL,
  country         TEXT,
  institution_id  TEXT,
  service         TEXT,
  rules           JSONB NOT NULL DEFAULT '[]',
  active          BOOLEAN NOT NULL DEFAULT true,
  effective_from  TIMESTAMPTZ,
  effective_until TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX policies_scope_idx   ON policies(scope);
CREATE INDEX policies_country_idx ON policies(country);
CREATE INDEX policies_active_idx  ON policies(active);

-- Verification credentials
CREATE TABLE verification_credentials (
  id              TEXT PRIMARY KEY,
  subject_id      TEXT NOT NULL,
  credential_type TEXT NOT NULL,
  issuer_id       TEXT NOT NULL,
  claims          JSONB NOT NULL DEFAULT '{}',
  signature       TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active',
  issued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ,
  revoked_at      TIMESTAMPTZ,
  revocation_reason TEXT
);
CREATE INDEX vc_subject_idx ON verification_credentials(subject_id);
CREATE INDEX vc_type_idx    ON verification_credentials(credential_type);

-- Machine identities (for service-to-service auth)
CREATE TABLE machine_identities (
  id              TEXT PRIMARY KEY,
  service_name    TEXT NOT NULL,
  service_version TEXT,
  client_id       TEXT NOT NULL,
  client_secret_hash TEXT NOT NULL,
  scopes          JSONB NOT NULL DEFAULT '[]',
  allowed_services JSONB NOT NULL DEFAULT '[]',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  last_auth_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX machine_client_id_idx ON machine_identities(client_id);
```

---

## MIGRATION M2: Routing Token Security

### Current (INSECURE)
```typescript
// resolution-engine returns:
{ token: entry.accountToken, routing: { destinationBankCode: entry.bankCode } }
```

### Target (SECURE)
```typescript
// resolution-engine issues:
{ routing_token: "<hs256.signed.jwt>", public_hint: "Zenith Bank", expires_at: "+60s" }

// Institutions call:
POST /v1/resolve/verify
  Body: { routing_token }
  Response: { valid: true, account_token: "...", destination_bank_code: "..." }
```

Token payload (never leave ALIA):
```json
{
  "jti": "unique-token-id",
  "sub": "alias:usr_123",
  "destination": "bank:058",
  "public_hint": "Zenith Bank",
  "iat": 1718000000,
  "exp": 1718000060,
  "used": false
}
```

---

## MIGRATION M3: Machine Identity

### New endpoint (in identity-service or new machine-service)

```
POST /v1/machine/auth
  Body: { service_name, client_id, client_secret }
  Returns: { machine_jwt, expires_in: 86400 }

Machine JWT payload:
{
  "type": "machine",
  "machine_id": "svc_xxx",
  "service_name": "resolution-engine",
  "scopes": ["resolve:execute", "alias:read"],
  "allowed_services": ["audit-service", "notification-service"],
  "iat": ...,
  "exp": ...   // 24h
}
```

### Usage pattern
```typescript
// All internal routes use:
import { requireMachine } from '@rald/machine-sdk';
router.post('/internal/resolve', requireMachine('resolve:execute'), handler);
```

---

## MIGRATION M4: ALIA GitLab → GitHub Push

**Target:** `Ostinato-Loop/rald-alia`

Steps:
1. Create GitHub repo `Ostinato-Loop/rald-alia` via API
2. Push entire ALIA codebase via GitHub tree API
3. Set branch protection on `main`
4. Add GitHub Actions CI (equivalent to GitLab CI pipeline)
5. Update GitLab to mirror-only

---

## MIGRATION M5: WebAuthn from rald-auth-core → ALIA

Files to migrate from `rald-auth-core`:
- WebAuthn challenge generation route
- WebAuthn credential verification
- Passkey storage schema (migrate from Supabase to Drizzle)
- Device trust tracking

Target location in ALIA:
```
identity-service/src/routes/passkeys.ts
identity-service/src/services/webauthn.service.ts
packages/db/migrations/0002_add_webauthn.sql
```

---

## ROLLBACK STRATEGY

Each migration is additive (new tables, new endpoints). No existing tables are modified.

Rollback for any migration:
1. Run `DOWN` migration SQL (DROP TABLE ... each new table)
2. Restart affected services — they fall back to in-memory
3. No data loss for services that were already DB-persisted (identity, alias, routing, fraud, audit)

**Risk:** Consent, trust, merchant data created between migration and rollback would be lost. Mitigation: run persistence migrations before accepting production traffic.
