# ALIA_COMPONENT_MAP.md
# RALD ALIA — Complete Component Map
**Audit Date:** 2026-06-13

---

## LAYER ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CONSUMER PRODUCTS                                │
│  Loop · Messenger · PayRald · GitRald · Raldtics · TradeOS          │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ consume ALIA via SDK / API
┌──────────────────────────▼──────────────────────────────────────────┐
│                   ALIA GATEWAY (Express.js)                         │
│  JWT auth · Rate limit (300/min) · Service proxy · Pino logging     │
└──┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬─────────┘
   │      │      │      │      │      │      │      │      │
   ▼      ▼      ▼      ▼      ▼      ▼      ▼      ▼      ▼
IDENTITY ALIAS  DIR   RESOL ROUTING CONSENT TRUST  FRAUD  GOVERN
:3001   :3002  :3003  :3004  :3005   :3010  :3011  :3006  :3009
                              │
                    MERCHANT VERIF  AUDIT  NOTIFY
                     :3012   :3013  :3007  :3008
                                      ▲      ▲
                              ┌───────┘      │
                              │    KAFKA EVENT BUS   │
                              └──────────────────────┘
                                     │
                              ┌──────▼──────┐
                              │ PostgreSQL   │
                              │  (shared)   │
                              └─────────────┘
                              ┌──────────────┐
                              │   Redis 7    │
                              │  (cache +    │
                              │  velocity)   │
                              └──────────────┘
```

---

## COMPONENT MAP BY LAYER

### Layer 1: Identity

| Component | Location | Status | Persisted |
|-----------|----------|--------|-----------|
| User identity | identity-service/src/services/identity.service.ts | ✅ Complete | ✅ PostgreSQL |
| Organization identity | identity-service/src/services/identity.service.ts | ✅ Complete | ✅ PostgreSQL |
| Auth (register/login/OTP/refresh) | identity-service/src/routes/auth.ts | ✅ Complete | ✅ PostgreSQL |
| Bank links | identity-service/src/routes/bank-links.ts | ✅ Complete | ✅ PostgreSQL |
| Alias registry | alias-service/src/services/alias.service.ts | ✅ Complete | ✅ PostgreSQL |
| Merchant identity | merchant-service/src/services/merchantEngine.ts | ✅ Complete | ❌ In-memory |
| KYC / Verification | verification-service/src/services/kycEngine.ts | ✅ Complete | ❌ In-memory |
| WebAuthn / Passkeys | — | ❌ Missing | — |
| Device trust | — | ❌ Missing | — |
| Machine identity | — | ❌ Missing | — |
| Government identity | — | ❌ Missing | — |
| Institution identity | — | ❌ Missing | — |
| Developer identity | — | ❌ Missing | — |

### Layer 2: Trust

| Component | Location | Status | Persisted |
|-----------|----------|--------|-----------|
| Trust score engine | trust-service/src/services/trustScoreEngine.ts | ✅ Complete | ❌ In-memory |
| Trust signal ingestion | trust-service/src/services/trustScoreEngine.ts | ✅ Complete | ❌ In-memory |
| Reputation engine | trust-service/src/services/reputationEngine.ts | ✅ Complete | ❌ In-memory |
| Fraud detection | fraud-service/src/services/fraud.service.ts | ✅ Complete | ✅ PostgreSQL |
| Trust history | trust-service/src/routes/trustHistory.ts | ✅ Complete | ❌ In-memory |
| Trust tier derivation | trustScoreEngine.ts (deriveTier) | ✅ Complete | — |
| Explainability API | — | ❌ Missing | — |
| Sanctions screening | — | ❌ Missing | — |

### Layer 3: Consent

| Component | Location | Status | Persisted |
|-----------|----------|--------|-----------|
| Consent grant | consent-service/src/services/consentEngine.ts | ✅ Complete | ❌ In-memory |
| Consent revoke | consent-service/src/services/consentEngine.ts | ✅ Complete | ❌ In-memory |
| Consent expiration | consentEngine.ts (verifyConsent checks expires_at) | ✅ Complete | ❌ In-memory |
| Consent audit trail | consentEngine.ts (recordAudit) | ✅ Complete | ❌ In-memory |
| Consent verification | consent-service/src/routes/consent.ts | ✅ Complete | ❌ In-memory |
| Mandate engine | consent-service/src/services/mandateEngine.ts | ✅ Complete | ❌ In-memory |
| Permission registry | consent-service/src/routes/permission.ts | ✅ Partial | ❌ In-memory |
| Multi-party approval | — | ❌ Missing | — |
| Enterprise approval | — | ❌ Missing | — |

### Layer 4: Routing

| Component | Location | Status | Persisted |
|-----------|----------|--------|-----------|
| Alias creation | alias-service/src/services/alias.service.ts | ✅ Complete | ✅ PostgreSQL |
| Alias lookup | alias-service | ✅ Complete | ✅ PostgreSQL |
| Public directory | directory-service | ✅ Partial | ✅ PostgreSQL |
| Resolution engine | resolution-engine/src/services/resolution.service.ts | ✅ Complete | ✅ PostgreSQL + Redis |
| Routing profiles | routing-service/src/services/routing.service.ts | ✅ Complete | ✅ PostgreSQL |
| Multi-bank failover | routing-service (fallbackBankCode) | ✅ Partial | ✅ PostgreSQL |
| Signed routing token | — | ❌ Missing | — |
| Cross-country routing | — | ❌ Missing | — |
| Institution routing | — | ❌ Missing | — |
| Routing analytics | — | ❌ Missing | — |

### Layer 5: Machine Identity

| Component | Location | Status | Persisted |
|-----------|----------|--------|-----------|
| Machine JWT | — | ❌ Missing | — |
| Service registry | — | ❌ Missing | — |
| Service trust | — | ❌ Missing | — |
| Credential rotation | — | ❌ Missing | — |
| mTLS | — | ❌ Missing | — |

### Layer 6: Developer Cloud

| Component | Location | Status | Persisted |
|-----------|----------|--------|-----------|
| API keys (schema) | packages/db/src/schema/index.ts | ✅ Schema only | ✅ PostgreSQL |
| API key API | — | ❌ Missing routes | — |
| Projects | — | ❌ Missing | — |
| SDK provisioning | lib/api-client-react | ✅ Partial | — |
| Developer console (UI) | frontend/apps/developer-console | ✅ UI only | — |
| Webhooks (schema) | packages/db webhooks table | ✅ Schema only | ✅ PostgreSQL |
| Webhooks API | — | ❌ Missing routes | — |

### Infrastructure

| Component | Location | Status |
|-----------|----------|--------|
| API Gateway | services/gateway | ✅ Complete |
| Kafka event bus | packages/kafka | ✅ Complete |
| PostgreSQL (Drizzle ORM) | packages/db | ✅ Complete |
| Redis cache | Used in alias + resolution + fraud | ✅ Operational |
| Docker Compose | docker-compose.yml | ✅ Complete |
| GitLab CI | .gitlab-ci.yml | ✅ Active |
| OpenAPI spec | lib/api-spec/openapi.yaml | ✅ Complete |
| Zod validators | lib/api-zod | ✅ Partial |
| React API client | lib/api-client-react | ✅ Partial |
| Kubernetes | — | ❌ Missing |
| Secret management | — | ❌ Missing |
| Observability (metrics) | — | ❌ Missing |
| Distributed tracing | — | ❌ Missing |

---

## KAFKA EVENT TOPOLOGY

```
identity-service ──► notification.send_otp ──► notification-service
identity-service ──► notification.welcome ──► notification-service
identity-service ──► notification.send_password_reset ──► notification-service
identity-service ──► user.verified ──► audit-service, trust-service

alias-service ──► alias.created ──► audit-service, fraud-service
alias-service ──► alias.updated ──► audit-service
alias-service ──► alias.deleted ──► audit-service

resolution-engine ──► resolution.requested ──► audit-service, fraud-service
resolution-engine ──► resolution.completed ──► audit-service

fraud-service ──► fraud.detected ──► audit-service, notification-service

consent-service ──► consent.granted ──► audit-service, trust-service
consent-service ──► consent.revoked ──► audit-service
consent-service ──► mandate.created ──► audit-service
consent-service ──► mandate.cancelled ──► audit-service

trust-service ──► trust.score_updated ──► audit-service
trust-service ──► trust.tier_changed ──► audit-service

merchant-service ──► merchant.created ──► audit-service
merchant-service ──► merchant.verified ──► trust-service, audit-service

verification-service ──► verification.kyc_approved ──► trust-service, audit-service
verification-service ──► verification.bvn_verified ──► identity-service
verification-service ──► verification.credential_issued ──► audit-service

governance-service ──► governance.policy_created ──► audit-service
governance-service ──► governance.policy_violated ──► audit-service, fraud-service
```

---

## DATABASE SCHEMA MAP

### Tables persisted in PostgreSQL (8 tables)
```sql
users              — user identity, auth metadata, BVN/NIN hashes
organizations      — organization identity, RC number, owner
aliases            — email/phone/username/business_handle → bank token
bank_links         — user → bank account (tokenized)
routing_profiles   — user → primary + fallback bank code
api_keys           — organization → API key (prefix + hash, scoped)
audit_logs         — immutable event log (SHA-256 checksum)
fraud_events       — risk events with flags and resolution
webhooks           — organization → webhook URL + events
```

### Tables needed (not yet defined — 11 tables)
```sql
consents           — subject/grantee, scope, purpose, status, signature
consent_audit_trail — immutable consent change log
mandates           — recurring payment authorization
trust_scores       — entity trust score + components + tier
trust_signals      — individual signal records
trust_history      — score change history
reputation_profiles — flags, sanctions, PEP, participation
merchants          — merchant entity (currently in-memory)
kyc_sessions       — KYC session state (currently in-memory)
policies           — governance policies (currently in-memory)
verification_credentials — verifiable credentials
```
