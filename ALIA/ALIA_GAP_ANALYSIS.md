# ALIA_GAP_ANALYSIS.md
# RALD ALIA — What Exists, What is Missing, What Must Be Built
**Audit Date:** 2026-06-13

---

## SUMMARY

ALIA is 65% complete across all layers. The platform has strong logic in all 5 layers but has specific, fixable gaps — primarily around persistence, machine identity, signed tokens, and advanced authorization.

---

## IDENTITY LAYER

### ✅ EXISTS
- User registration with OTP email verification
- Email/password authentication + JWT (15m access, 30d refresh)
- User profile management (CRUD, owner-only PATCH)
- Organization identity (create, get, list by owner)
- Bank account linking (tokenized — no raw NUBAN stored)
- BVN/NIN hashing (SHA-256, stored on `users` table)
- Alias registry: email, phone, username, business_handle
- KYC session engine (multi-tier, multi-country, multi-provider hooks)
- Merchant identity (registration, verification, suspension)
- Country profiles: Nigeria, Ghana, Kenya, South Africa, Rwanda

### ❌ MISSING
| Gap | Priority | Notes |
|-----|----------|-------|
| WebAuthn / Passkeys | P0 | RALD auth-core has this — migrate into ALIA |
| Device trust tracking | P0 | Required for Zero Trust model |
| Machine identity (service-to-service JWT) | P0 | Nothing. All services use user JWT or no auth for internal calls |
| Institution identity type | P1 | Central banks, commercial banks, fintechs |
| Government identity type | P2 | For gov payment rails integration |
| Developer identity (API access) | P1 | Table exists, no identity concept |
| Account recovery beyond OTP | P2 | Social recovery, backup codes |
| Passkey-based account recovery | P1 | Follows WebAuthn implementation |
| Identity linking (merge accounts) | P2 | User has email + phone + username alias — no merge flow |
| Identity state machine | P1 | PENDING → VERIFIED → ACTIVE → SUSPENDED — formal state transitions missing |

---

## TRUST LAYER

### ✅ EXISTS
- Trust score engine with 15 weighted signal types
- Trust tier derivation: unverified / basic / standard / trusted / elite
- Risk level derivation: critical / high / medium / low / minimal
- Fraud score = 100 - trust_score (inverse relationship)
- Signal ingestion API
- Batch trust score lookup (100 entities)
- Trust history with from/to filters
- Reputation engine: flags, sanctions_match, pep_match, adverse_media
- Fraud velocity checks (Redis, 60s window)
- Fraud signal analysis: HIGH_VELOCITY, NEW_DEVICE, UNUSUAL_HOUR, FOREIGN_IP

### ❌ MISSING
| Gap | Priority | Notes |
|-----|----------|-------|
| DB persistence for trust scores | P0 | Currently in-memory — lost on restart |
| DB persistence for reputation | P0 | Currently in-memory |
| Explainability API | P1 | "Why is this entity's trust score 45?" — required for regulatory transparency |
| Sanctions screening integration | P1 | OFAC, UN sanctions list API hookup |
| PEP screening integration | P1 | Politically Exposed Persons list |
| ML-based behavioral anomaly detection | P2 | Replaces rule-based velocity check |
| Cross-entity correlation | P1 | Fraud network graph (A paid B, B paid C...) |
| Trust score export (for institutions) | P2 | Allows partner banks to query trust |

---

## CONSENT LAYER

### ✅ EXISTS
- Full consent lifecycle: grant / revoke / verify / expire / audit
- Typed consent: scope[], purpose, data_classes, duration_days, conditions
- Consent verification: does grantee have required scopes from subject?
- Immutable consent audit trail (per consent)
- Consent signature (SHA-256 of subject+grantee+scope+timestamp)
- Mandate engine: recurring payment authorization (frequency, max_amount, currency, end_date)
- Mandate verification before charge execution
- Permission scope registry

### ❌ MISSING
| Gap | Priority | Notes |
|-----|----------|-------|
| DB persistence for consents | P0 | Critical — consents lost on restart |
| DB persistence for mandates | P0 | Critical |
| DB persistence for permissions | P0 | Critical |
| Multi-party approval flows | P1 | e.g. "Requires approval from 2 of 3 directors" |
| Delegated authorization | P1 | "Entity A authorizes Entity B to act on its behalf" |
| Enterprise approval workflows | P2 | Org-level approval chains |
| Consent notification on revocation | P1 | Notify grantee when consent revoked |
| Consent version history | P2 | Full audit of all consent changes |
| Regulatory consent formats | P2 | CBN Open Banking consent schema compliance |

---

## ROUTING LAYER

### ✅ EXISTS
- Alias → bank routing token resolution (Redis-cached, DB-backed)
- Type detection: email / phone / username / business_handle
- Resolution with Kafka event publishing
- Routing profiles: primary + fallback bank code per user
- Multi-bank failover: profile → bank_link → error
- Public directory service (basic)
- Bank registry: 40+ banks across 5 African countries

### ❌ MISSING
| Gap | Priority | Notes |
|-----|----------|-------|
| Signed ephemeral routing token | P0 | Current resolution returns raw `account_token` — SECURITY ISSUE |
| Institution routing rules | P1 | Route by institution type, not just bank code |
| Cross-country routing | P1 | Nigerian user → Ghanaian institution |
| Routing analytics / latency metrics | P1 | Required for SLA monitoring |
| Signed routing token validation endpoint | P0 | `POST /resolve/token/verify` |
| Government institution resolution | P2 | Tax authority, pension fund identifiers |
| Routing rule engine | P1 | Priority-based rule matching (trust level, country, institution type) |
| Real-time routing health | P1 | Which destinations are up/down right now |

---

## MACHINE IDENTITY LAYER

### ✅ EXISTS
- Nothing.

### ❌ MISSING
| Gap | Priority | Notes |
|-----|----------|-------|
| Machine JWT issuance | P0 | Required for service-to-service auth |
| Service registry | P0 | Canonical list of registered services |
| Machine token verification middleware | P0 | Used by all internal routes |
| Service trust scores | P1 | Does service A trust service B? |
| Credential rotation (automatic) | P1 | 24h machine credential TTL |
| mTLS support | P2 | Future hardening |
| X-Internal-Secret removal | P0 | Must be removed from RALD GitHub services |

---

## DEVELOPER CLOUD LAYER

### ✅ EXISTS
- `api_keys` table (schema complete: prefix, hash, org, environment, scopes, expires_at)
- `webhooks` table (schema complete)
- Developer console UI (all pages, no API connection)
- `lib/api-client-react` — React SDK scaffolded
- `lib/api-spec/openapi.yaml` — Full OpenAPI 3.1.0 spec

### ❌ MISSING
| Gap | Priority | Notes |
|-----|----------|-------|
| API key management API | P1 | `POST /v1/apikeys`, `DELETE /v1/apikeys/:id`, etc. |
| Webhook management API | P1 | CRUD + delivery tracking |
| Developer portal API integration | P1 | Wire frontend to backend |
| Sandbox environment | P1 | Separate Kafka namespace + DB schema for sandbox |
| API usage tracking | P1 | Per-key request counts, rate limits |
| SDK provisioning | P2 | Auto-generate SDKs per language on key creation |
| Developer workspace (projects) | P2 | Multi-project per org |
| Billing integration | P2 | Usage-based billing hooks |

---

## CROSS-CUTTING GAPS

| Gap | Priority | Affected Services |
|-----|----------|------------------|
| Zero test coverage | P0 | All 13 services |
| In-memory persistence (5 services) | P0 | consent, trust, merchant, governance, verification |
| No health check endpoints | P1 | All services except gateway |
| No distributed tracing | P1 | All services |
| No metrics/observability | P1 | All services |
| No per-service rate limiting | P1 | All services (gateway-level only) |
| Single shared PostgreSQL | P1 | All services — no isolation |
| No Kubernetes config | P1 | Deployment only via docker-compose |
| No secret management | P0 | JWT secrets hardcoded in code as fallback |
| Frontend not wired to API | P1 | All 4 frontend apps |
| Provider integrations stubbed | P1 | verification-service (youverify, smile_id, etc.) |
| No event replay / dead-letter | P1 | Kafka consumer failures silently dropped |
| Missing `gateway` entry for new services | P1 | governance, consent, trust, merchant, verification routes need gateway entries |

---

## PRIORITY BUILD ORDER

### Phase 1 (Do First — unblocks production)
1. Add Drizzle migrations for 11 missing tables
2. Wire in-memory services to DB (consent, trust, merchant, governance, verification)
3. Replace raw `account_token` with signed ephemeral routing token
4. Add machine identity middleware + token issuance endpoint
5. Add health check endpoints to all services
6. Add test coverage (Jest + supertest) for identity + alias + resolution

### Phase 2 (Before external launch)
1. Migrate WebAuthn/passkeys from RALD auth-core
2. Wire verification service to real providers (youverify, smile_id)
3. Build API key management API
4. Add Kafka dead-letter queue handling
5. Add observability (Pino structured logs already exist — add metrics)

### Phase 3 (Scale hardening)
1. Split PostgreSQL per service domain
2. Add Kubernetes deployment configs
3. Add mTLS between services
4. Add ML-based fraud detection
5. Add explainability API for trust scores
