# ALIA_CONTROL_PLANE_ARCHITECTURE.md
# RALD ALIA — Control Plane Architecture
**Version:** 1.0 — Phase 2 Governance
**Date:** 2026-06-13

---

## PURPOSE

The ALIA Control Plane is the operational layer that governs the entire network. It is not a product. It is the instrument through which ALIA Platform Admins operate the infrastructure — activating countries, approving institutions, managing machine identities, monitoring network health, and enforcing governance policies.

The Control Plane has two surfaces:
1. **Admin API** — machine-readable, used by automation, CI/CD, and admin tooling
2. **Admin Console** — human-readable UI (the `admin-console` Next.js app, currently UI-only)

---

## CONTROL PLANE DOMAINS

### Domain 1: Identity Governance

**What it controls:**
- Review and override identity state transitions
- Manually activate, suspend, or archive entities
- Investigate orphaned PENDING claims
- Force-release stuck username reservations
- View full identity history for any registry_id

**Admin API:**
```
GET  /admin/identity                          — list entities by status, type, country
GET  /admin/identity/:registry_id             — full entity profile
POST /admin/identity/:registry_id/activate    — force activate
POST /admin/identity/:registry_id/suspend     — suspend with reason
POST /admin/identity/:registry_id/archive     — archive with reason
POST /admin/identity/:registry_id/reinstate   — reinstate from suspended
GET  /admin/identity/pending/expired          — list expired PENDING claims
POST /admin/identity/pending/release-all      — batch release expired claims
GET  /admin/identity/state-transitions        — audit log of all transitions
```

**Required role:** `platform_admin` or `identity_admin`

---

### Domain 2: Routing Governance

**What it controls:**
- Monitor resolution engine health and latency
- View routing profile configuration per entity
- Suspend routing for specific entities or institutions
- Override routing profiles in emergencies
- Monitor Redis cache hit/miss rates
- View resolution latency percentiles (p50, p95, p99)

**Admin API:**
```
GET  /admin/routing/health                    — resolution engine status
GET  /admin/routing/metrics                   — latency, cache hit %, error rate
GET  /admin/routing/:registry_id/profile      — entity routing profile
POST /admin/routing/:registry_id/suspend      — suspend routing
POST /admin/routing/:registry_id/restore      — restore routing
GET  /admin/routing/institutions/active       — list active institution destinations
POST /admin/routing/cache/flush               — flush resolution cache (with reason)
GET  /admin/routing/errors                    — recent routing failures
```

**Required role:** `platform_admin` or `routing_admin`

---

### Domain 3: Trust Governance

**What it controls:**
- View trust scores and signal history for any entity
- Manually apply trust signals (admin-level signal with elevated weight)
- Freeze trust scores under investigation
- Run sanctions screening against a batch of entities
- Bulk-update trust tiers after data corrections
- Configure signal weights

**Admin API:**
```
GET  /admin/trust/:registry_id                — full trust profile
GET  /admin/trust/:registry_id/signals        — signal history
POST /admin/trust/:registry_id/signal         — admin signal (elevated weight)
POST /admin/trust/:registry_id/freeze         — freeze score under investigation
POST /admin/trust/:registry_id/unfreeze       — unfreeze with resolution
POST /admin/trust/:registry_id/sanction       — mark as sanctioned (OFAC/UN match)
GET  /admin/trust/sanctions/watchlist         — view current watchlist
POST /admin/trust/sanctions/scan              — run batch sanctions screening
GET  /admin/trust/config/signal-weights       — view signal weight configuration
PATCH /admin/trust/config/signal-weights      — update weights (audit logged)
```

**Required role:** `platform_admin` or `trust_admin`

---

### Domain 4: Consent Governance

**What it controls:**
- Inspect all active consents between entities
- Revoke consents on behalf of entities (regulatory requirement)
- View mandate history
- Force-cancel mandates on regulatory grounds
- Generate consent audit reports for regulators

**Admin API:**
```
GET  /admin/consent                           — list consents (filter by subject, grantee, scope)
GET  /admin/consent/:consent_id               — full consent record
POST /admin/consent/:consent_id/revoke        — admin revoke with regulatory reason
GET  /admin/consent/:registry_id/all          — all consents for an entity
GET  /admin/mandates                          — list mandates
POST /admin/mandates/:mandate_id/cancel       — admin cancel with reason
GET  /admin/consent/reports/regulatory        — consent audit report (CSV)
```

**Required role:** `platform_admin` or `compliance_admin`

---

### Domain 5: Registry Governance

**What it controls:**
- Full registry record management
- Merge duplicate registry records
- Correct entity type misclassifications
- Promote/demote entity subtypes
- View cross-status entity breakdowns

**Admin API:**
```
GET  /admin/registry                          — query registry
GET  /admin/registry/:registry_id             — full record
PATCH /admin/registry/:registry_id            — admin correction (audit logged)
POST /admin/registry/merge                    — merge duplicate records
GET  /admin/registry/stats                    — entity counts by type/status/country
GET  /admin/registry/export                   — full registry export (regulatory)
```

**Required role:** `platform_admin`

---

### Domain 6: Institution Registry

**What it controls:**
- Institution onboarding pipeline (PENDING → VERIFIED → ACTIVE)
- Institution credential management
- Institution routing activation
- Institution suspension and revocation
- View all routing traffic per institution

**Admin API:**
```
GET  /admin/institutions                      — list all institutions
GET  /admin/institutions/:institution_id      — institution detail
POST /admin/institutions                      — onboard new institution
POST /admin/institutions/:id/verify           — approve institution
POST /admin/institutions/:id/activate         — activate routing
POST /admin/institutions/:id/restrict         — restrict (limited routing)
POST /admin/institutions/:id/suspend          — suspend all routing
POST /admin/institutions/:id/revoke           — permanent revocation
GET  /admin/institutions/:id/traffic          — routing traffic metrics
```

**Required role:** `platform_admin` or `institution_admin`

---

### Domain 7: Merchant Registry

**What it controls:**
- Merchant onboarding and verification queue
- Merchant category classification
- Merchant suspension and reinstatement
- Merchant trust score management

**Admin API:**
```
GET  /admin/merchants                         — list (filter by status, country, category)
GET  /admin/merchants/:merchant_id            — merchant detail
POST /admin/merchants/:id/verify              — approve merchant
POST /admin/merchants/:id/suspend             — suspend
POST /admin/merchants/:id/reinstate           — reinstate
PATCH /admin/merchants/:id/category           — reclassify
GET  /admin/merchants/queue                   — pending verification queue
```

**Required role:** `platform_admin` or `merchant_admin`

---

### Domain 8: Developer Governance

**What it controls:**
- Developer account approval
- API key management (view active keys, revoke)
- Rate limit configuration per developer/org/environment
- Country access grants for developers
- Machine identity issuance and revocation
- SDK access provisioning

**Admin API:**
```
GET  /admin/developers                        — list developers
GET  /admin/developers/:developer_id          — developer profile
POST /admin/developers/:id/approve            — approve developer account
POST /admin/developers/:id/suspend            — suspend access
GET  /admin/api-keys                          — list all active API keys
POST /admin/api-keys/:key_id/revoke           — revoke API key
GET  /admin/machine-identities                — list machine identities
POST /admin/machine-identities/:id/revoke     — revoke machine credential
PATCH /admin/developers/:id/rate-limits       — override rate limits
POST /admin/developers/:id/country-access     — grant country access
```

**Required role:** `platform_admin` or `developer_admin`

---

### Domain 9: Machine Identities

**What it controls:**
- Register new services into the machine identity network
- Issue machine credentials
- View all active machine tokens
- Revoke compromised machine credentials
- Audit machine-to-machine call patterns

**Admin API:**
```
GET  /admin/machines                          — list registered services
POST /admin/machines                          — register new service
GET  /admin/machines/:machine_id              — service detail + credential status
POST /admin/machines/:id/rotate              — force credential rotation
POST /admin/machines/:id/revoke              — emergency revocation
GET  /admin/machines/audit                   — machine-to-machine call audit
```

**Required role:** `platform_admin`

---

### Domain 10: Fraud & Risk

**What it controls:**
- View all fraud events
- Resolve / dismiss fraud events
- Bulk-process fraud queue
- Configure velocity thresholds
- View real-time fraud metrics

**Admin API:**
```
GET  /admin/fraud                             — list events (filter by risk_level, status)
GET  /admin/fraud/:event_id                   — event detail
POST /admin/fraud/:event_id/resolve           — mark resolved
POST /admin/fraud/:event_id/escalate          — escalate to compliance
GET  /admin/fraud/metrics                     — real-time fraud metrics
PATCH /admin/fraud/config/thresholds          — update velocity thresholds
GET  /admin/fraud/reports/daily               — daily fraud summary
```

**Required role:** `platform_admin` or `fraud_admin`

---

### Domain 11: Audit Network

**What it controls:**
- Query the full audit log
- Generate compliance audit reports
- Verify audit log integrity (SHA-256 checksum)
- Export audit records for regulators

**Admin API:**
```
GET  /admin/audit                             — query audit log
GET  /admin/audit/:entry_id                   — entry detail + checksum verify
GET  /admin/audit/reports/compliance          — compliance report (date range)
POST /admin/audit/verify/batch               — batch checksum verification
GET  /admin/audit/export                      — export for regulator (CSV/JSON)
```

**Required role:** `platform_admin` or `compliance_admin`

---

### Domain 12: Country Governance

**What it controls:**
- Country lifecycle management (DISABLED → GA)
- Country-specific configuration (KYC tiers, limits)
- Country compliance framework management

**See:** `ALIA_COUNTRY_GOVERNANCE.md` for full details.

---

### Domain 13: Feature Governance

**What it controls:**
- Feature flags per country, entity type, developer tier
- Gradual rollout configuration
- Emergency feature kill switches

**Admin API:**
```
GET  /admin/features                          — list feature flags
POST /admin/features                          — create flag
PATCH /admin/features/:flag_id               — update (enable/disable, rollout %)
POST /admin/features/:flag_id/kill           — emergency disable
GET  /admin/features/:flag_id/eligibility    — check entity eligibility
```

**Required role:** `platform_admin`

---

### Domain 14: API Governance

**What it controls:**
- Global rate limit defaults
- Per-endpoint rate limit overrides
- API version lifecycle (deprecation, sunset)
- API quota management

**Admin API:**
```
GET  /admin/api/config                        — current API config
PATCH /admin/api/config/rate-limits          — global defaults
GET  /admin/api/versions                      — API version registry
POST /admin/api/versions/:version/deprecate  — deprecation notice
POST /admin/api/versions/:version/sunset     — sunset (disable version)
GET  /admin/api/usage                         — usage by version, endpoint
```

**Required role:** `platform_admin`

---

## ADMIN ROLES

| Role | Access |
|------|--------|
| `platform_admin` | All domains, all countries |
| `identity_admin` | Domain 1, 5 |
| `routing_admin` | Domain 2, 6 |
| `trust_admin` | Domain 3 |
| `compliance_admin` | Domain 4, 11 |
| `institution_admin` | Domain 6 |
| `merchant_admin` | Domain 7 |
| `developer_admin` | Domain 8 |
| `fraud_admin` | Domain 10 |
| `country_admin` | Domain 12 (scoped to assigned countries) |
| `auditor` | Domain 11 read-only |

All admin actions are audit logged. Admin JWT contains `role` + `admin_id`. All admin routes require `type: 'admin'` in JWT payload.

---

## CONTROL PLANE SECURITY

- All admin API endpoints require admin JWT (`X-Admin-Token`)
- Admin JWTs issued separately from user JWTs (different secret, 4h TTL)
- MFA required for admin login
- All mutations are dual-logged: structured log (Pino) + audit-service Kafka event
- No admin action is reversible without audit trail
- Destructive actions (archive, revoke, sanction) require explicit `confirm: true` in request body
- Admin API rate limited: 60 req/min per admin
- Admin API accessible only from ALIA VPN / allowlisted IPs in production
