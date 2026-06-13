# ALIA_DEVELOPER_GOVERNANCE.md
# RALD ALIA — Developer Governance Model
**Version:** 1.0 — Phase 2 Governance
**Date:** 2026-06-13

---

## PURPOSE

The Developer Registry governs how external builders — startups, enterprises, RALD products, and individual developers — access ALIA capabilities. Every API call to ALIA from outside the core platform originates from a registered developer entity with an assigned API key, machine identity, or SDK access grant.

---

## DEVELOPER ENTITY HIERARCHY

```
Developer (person or org) ─── owns ──► Organization
                                             │
                                   ─── has ──┼──► Projects (1-N)
                                             │
                                   ─── has ──┼──► API Keys (per project, per environment)
                                             │
                                   ─── has ──┼──► Machine Identities (per service)
                                             │
                                   ─── has ──┴──► Webhooks (per project)
```

---

## DEVELOPER REGISTRY SCHEMA

```sql
-- Developer accounts
CREATE TABLE developers (
  id                    TEXT PRIMARY KEY,
  registry_id           TEXT NOT NULL REFERENCES registry(registry_id),
  user_id               TEXT NOT NULL REFERENCES users(id),
  display_name          TEXT NOT NULL,
  developer_type        TEXT NOT NULL DEFAULT 'individual',  -- 'individual' | 'startup' | 'enterprise'
  status                TEXT NOT NULL DEFAULT 'pending',      -- 'pending' | 'active' | 'suspended' | 'revoked'
  verified_at           TIMESTAMPTZ,
  approved_by           TEXT,

  -- Access configuration
  tier                  TEXT NOT NULL DEFAULT 'free',         -- 'free' | 'starter' | 'growth' | 'enterprise'
  sandbox_enabled       BOOLEAN NOT NULL DEFAULT true,
  production_enabled    BOOLEAN NOT NULL DEFAULT false,       -- requires approval
  allowed_countries     JSONB NOT NULL DEFAULT '[]',          -- [] = all countries in prod
  allowed_entity_types  JSONB NOT NULL DEFAULT '["person"]',

  -- Rate limits (requests per minute)
  rate_limit_sandbox    INTEGER NOT NULL DEFAULT 60,
  rate_limit_production INTEGER NOT NULL DEFAULT 100,

  -- Agreement
  terms_accepted_at     TIMESTAMPTZ,
  terms_version         TEXT,
  data_processing_agreed BOOLEAN NOT NULL DEFAULT false,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Organizations (multi-developer, team-based)
CREATE TABLE developer_organizations (
  id                    TEXT PRIMARY KEY,
  registry_id           TEXT NOT NULL REFERENCES registry(registry_id),
  name                  TEXT NOT NULL,
  slug                  TEXT UNIQUE NOT NULL,
  owner_developer_id    TEXT NOT NULL REFERENCES developers(id),
  status                TEXT NOT NULL DEFAULT 'active',
  tier                  TEXT NOT NULL DEFAULT 'free',
  country_code          TEXT,
  website               TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Organization members
CREATE TABLE org_members (
  org_id                TEXT NOT NULL REFERENCES developer_organizations(id),
  developer_id          TEXT NOT NULL REFERENCES developers(id),
  role                  TEXT NOT NULL DEFAULT 'member',  -- 'owner' | 'admin' | 'member' | 'viewer'
  invited_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  joined_at             TIMESTAMPTZ,
  PRIMARY KEY (org_id, developer_id)
);

-- Projects
CREATE TABLE developer_projects (
  id                    TEXT PRIMARY KEY,
  org_id                TEXT REFERENCES developer_organizations(id),
  developer_id          TEXT REFERENCES developers(id),  -- if no org
  name                  TEXT NOT NULL,
  slug                  TEXT NOT NULL,
  description           TEXT,
  environment           TEXT NOT NULL DEFAULT 'sandbox',  -- 'sandbox' | 'production'
  status                TEXT NOT NULL DEFAULT 'active',

  -- Permissions
  allowed_scopes        JSONB NOT NULL DEFAULT '[]',
  allowed_countries     JSONB NOT NULL DEFAULT '[]',
  allowed_entity_types  JSONB NOT NULL DEFAULT '["person"]',
  rate_limit_override   INTEGER,

  -- Usage tracking
  total_requests        BIGINT NOT NULL DEFAULT 0,
  last_request_at       TIMESTAMPTZ,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, slug),
  UNIQUE (developer_id, slug)
);
```

---

## API KEY GOVERNANCE

### Key Lifecycle

```
CREATED ──► ACTIVE ──► REVOKED (terminal)
              │
              └──► EXPIRED (if expiry_date set)
```

### API Key Schema (extends existing `api_keys` table)

```sql
-- Augment existing api_keys table:
ALTER TABLE api_keys ADD COLUMN project_id TEXT REFERENCES developer_projects(id);
ALTER TABLE api_keys ADD COLUMN environment TEXT NOT NULL DEFAULT 'sandbox';
ALTER TABLE api_keys ADD COLUMN scopes JSONB NOT NULL DEFAULT '[]';
ALTER TABLE api_keys ADD COLUMN allowed_countries JSONB NOT NULL DEFAULT '[]';
ALTER TABLE api_keys ADD COLUMN rate_limit_per_minute INTEGER NOT NULL DEFAULT 60;
ALTER TABLE api_keys ADD COLUMN last_used_at TIMESTAMPTZ;
ALTER TABLE api_keys ADD COLUMN total_requests BIGINT NOT NULL DEFAULT 0;
ALTER TABLE api_keys ADD COLUMN revoked_at TIMESTAMPTZ;
ALTER TABLE api_keys ADD COLUMN revoked_by TEXT;
ALTER TABLE api_keys ADD COLUMN revocation_reason TEXT;
```

### API Key Format

```
Sandbox:    sk_test_{random_32_bytes_base62}
Production: sk_live_{random_32_bytes_base62}
Machine:    mk_{service_name}_{random_24_bytes_base62}
```

Key is shown exactly once on creation. ALIA stores only:
- `key_prefix` — first 8 characters (for display in console)
- `key_hash` — bcrypt hash of full key (for verification)

---

## API SCOPES

Scopes follow the format `{resource}:{action}`. Developers request scopes; ALIA grants or restricts.

### Identity Scopes
```
identity:read          — Read entity identity fields (name, status, country)
identity:verify        — Trigger verification events on consented entities
identity:write         — Create/update identity records (elevated — requires approval)
```

### Alias Scopes
```
alias:read             — Read alias records for consented entities
alias:write            — Create/update aliases for consented entities
alias:resolve          — Resolve alias to routing token (standard)
alias:resolve:bulk     — Bulk resolve (rate limited separately)
```

### Trust Scopes
```
trust:read             — Read trust scores for consented entities
trust:signal           — Submit trust signals for entities you have consent for
```

### Consent Scopes
```
consent:read           — Read consent records where you are grantee
consent:grant          — Initiate consent grant request (subject must approve)
consent:verify         — Verify consent status
consent:mandate:read   — Read mandates you hold
consent:mandate:create — Create mandate request (subject must approve)
consent:mandate:execute — Execute a charge against an approved mandate
```

### Routing Scopes
```
routing:resolve        — Resolve alias to routing token (standard)
routing:verify         — Verify a routing token (institution-level)
routing:profile:read   — Read routing profiles for consented entities
```

### Fraud Scopes
```
fraud:signal           — Submit fraud signal for entity you have consent for
```

### Developer Scopes (machine-only)
```
machine:auth           — Obtain machine JWT (service accounts only)
admin:*                — All admin operations (platform_admin only, never issued via API key)
```

---

## PERMISSION TIERS

### Free Tier
- Sandbox only
- 60 req/min
- Scopes: `alias:resolve`, `identity:read`, `trust:read`
- Countries: all sandbox countries
- Entity types: person only
- No production access

### Starter Tier
- Sandbox + production (with approval)
- 300 req/min production
- Scopes: all standard scopes
- Countries: must request per-country access
- Entity types: person + merchant

### Growth Tier
- 1,000 req/min production
- All standard scopes
- All countries where ALIA is GA
- Entity types: person + business + merchant

### Enterprise Tier
- Custom rate limits
- All scopes including routing:verify
- Dedicated support
- SLA-backed
- Custom data residency options

---

## DEVELOPER ONBOARDING WORKFLOW

```
1. Developer registers → registry_id created (entity_type: 'developer')
2. Developer agrees to terms + DPA
3. Sandbox access granted automatically (free tier)
4. Developer creates project → API key issued (sk_test_...)
5. Developer tests in sandbox
6. Developer requests production access → manual review
7. ALIA Developer Admin reviews:
   - Use case description
   - Entity types requested
   - Countries requested
   - Scopes requested
   - Terms compliance
8. Production access granted → production API key issued (sk_live_...)
9. Country access granted per-request
```

---

## RATE LIMITING ARCHITECTURE

Rate limits are enforced at the API Gateway level using Redis:

```
Key: rate:{api_key_prefix}:{minute_bucket}
Value: request count
TTL: 120 seconds (2 minute window for cleanup)

Algorithm: Token bucket (allows burst up to 2x limit for 10 seconds)

Headers returned:
  X-RateLimit-Limit: 300
  X-RateLimit-Remaining: 247
  X-RateLimit-Reset: 1718001660
  X-RateLimit-Window: 60
```

Rate limit exceeded response:
```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "API rate limit exceeded. Limit: 300/min.",
  "retry_after": 23
}
```

---

## MACHINE IDENTITY FOR RALD PRODUCTS

RALD products (Loop, Messenger, PayRald, etc.) authenticate to ALIA using machine identities, not API keys. This is a separate credential class:

```
Machine credential lifecycle:
  1. RALD product service registers with ALIA (via admin)
  2. machine_id + client_secret issued
  3. Service calls POST /v1/machine/auth on startup → receives machine_jwt (24h)
  4. All ALIA calls include: Authorization: Bearer <machine_jwt>
  5. JWT includes: service_name, allowed_scopes, allowed_services
  6. Machine JWT auto-rotates every 24h
  7. Compromise → admin revokes via /admin/machines/:id/revoke
```

RALD product machine credentials:
| Product | Service Name | Scopes |
|---------|-------------|--------|
| PayRald | `payrald-api` | `alias:resolve`, `routing:resolve`, `trust:read`, `consent:mandate:execute`, `fraud:signal` |
| Loop | `loop-api` | `identity:read`, `alias:resolve`, `consent:verify`, `trust:read` |
| Messenger | `messenger-api` | `identity:read`, `consent:verify` |
| GitRald | `gitrald-api` | `identity:read` |
| Raldtics | `raldtics-consumer` | Kafka consumer only (no API scope needed) |
| TradeOS | `tradeos-api` | `alias:resolve`, `merchant:read`, `trust:read`, `consent:verify` |

---

## DEVELOPER WEBHOOK GOVERNANCE

Webhooks notify developers of events affecting entities they have access to:

```
Events available per scope:
  identity:read      → identity.status_changed, identity.verified
  alias:read         → alias.created, alias.updated, alias.deleted
  trust:read         → trust.score_changed, trust.tier_changed
  consent:read       → consent.granted, consent.revoked, consent.expired
  routing:profile:read → routing.profile_updated, routing.suspended
  fraud:signal       → fraud.flagged (for entities they submitted signals for)
```

Webhook delivery:
- HTTPS POST to developer's endpoint
- Signed with HMAC-SHA256 (`X-RALD-Signature: sha256={hmac}`)
- Retry: 3 attempts with exponential backoff (1m, 5m, 30m)
- After 3 failures: webhook marked as `delivery_failed`, developer notified
- Delivery log retained for 30 days

---

## SANDBOX ENVIRONMENT

The sandbox is a fully isolated ALIA environment:
- Separate PostgreSQL schema (`alia_sandbox`)
- Separate Redis keyspace (`sandbox:*`)
- Separate Kafka topic prefix (`sandbox.*`)
- Test bank codes: `SANDBOX-001` through `SANDBOX-010`
- Test entities pre-seeded (valid BVN/NIN hashes for testing)
- All transactions flagged: `{ mode: 'sandbox', real_money: false }`
- Resolution always succeeds for test aliases

Sandbox data is reset monthly. Developers are notified 7 days in advance.
