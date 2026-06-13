# ALIA_PHASE2_ROADMAP.md
# RALD ALIA — Phase 2 Roadmap
**Version:** 1.0
**Date:** 2026-06-13
**Phase:** Governance + Production Hardening

---

## PHASE CONTEXT

Phase 1 established: what ALIA has, what it's missing, and who owns what.

Phase 2 goal: make ALIA operational. Not feature-complete — operational. This means ALIA can accept real users, real institutions, and real payments in Nigeria (INTERNAL → PRIVATE_BETA).

Phase 2 is NOT about building new capabilities. It is about hardening and governing what already exists.

---

## PHASE 2 MILESTONES

### M1 — Persistence (Week 1–2)
**Outcome:** Zero in-memory data loss. All 13 services survive restarts.

**Tasks:**
- [ ] Write Drizzle migration `0001_add_alia_engines.sql` (11 tables: consents, consent_audit_trail, mandates, trust_scores, trust_signals, trust_history, reputation_profiles, merchants, kyc_sessions, policies, verification_credentials)
- [ ] Wire `consent-service` Map → Drizzle queries (ConsentEngine → ConsentRepository)
- [ ] Wire `trust-service` Map → Drizzle queries (TrustScoreEngine + ReputationEngine → TrustRepository)
- [ ] Wire `merchant-service` Map → Drizzle queries (MerchantEngine → MerchantRepository)
- [ ] Wire `governance-service` Map → Drizzle queries (PolicyEngine → PolicyRepository)
- [ ] Wire `verification-service` Map → Drizzle queries (KYCEngine → KYCRepository)
- [ ] Run migration + smoke test all 13 services

**Success:** `docker compose down && docker compose up` — all data survives.

---

### M2 — Registry (Week 2–3)
**Outcome:** Every entity has a registry_id. Registry is the canonical cross-service identifier.

**Tasks:**
- [ ] Write Drizzle migration `0002_create_registry.sql`
- [ ] Create `registry-service` (or registry module within `identity-service`)
- [ ] Implement registry CRUD API (`POST /v1/registry`, `GET /v1/registry/:id`, `PATCH /v1/registry/:id/status`)
- [ ] Write seed script: for each existing user/org/merchant → create registry record
- [ ] Update `identity-service` to create registry record on user/org creation
- [ ] Update `merchant-service` to create registry record on merchant creation
- [ ] Add `registry_id` foreign key to users, organizations, merchants tables
- [ ] Publish `registry.status_changed` Kafka events from all status-updating services

**Success:** Every entity has a `registry_id`. `GET /v1/registry/:id` returns full status across all dimensions.

---

### M3 — Identity State Machine (Week 3)
**Outcome:** Username TTL enforced. No orphaned reservations. State transitions validated.

**Tasks:**
- [ ] Add `status`, `pending_expires_at`, `activated_at`, `suspended_at`, `archived_at` columns to `users` and `aliases` tables (migration `0003_identity_state_machine.sql`)
- [ ] Implement `validateTransition()` function in `@rald-alia/shared`
- [ ] Update `identity-service` auth routes to use state machine transitions
- [ ] Create background job: `release_expired_pending_claims` (every 5 min)
- [ ] Create background job: `release_expired_verified_claims` (daily)
- [ ] Create background job: `escalate_suspended_to_archived` (daily)
- [ ] Create background job: `release_archived_usernames` (daily)
- [ ] Test: start registration, abandon, verify claim released after 30min

**Success:** Abandoned registrations release usernames within 35 minutes. State transitions validated against allowed matrix.

---

### M4 — Security Hardening (Week 3–4)
**Outcome:** No critical security findings remain.

**Tasks:**
- [ ] Replace raw `account_token` in resolution-engine with signed ephemeral routing JWT (60s TTL)
- [ ] Add `POST /v1/resolve/verify` endpoint (institution-only)
- [ ] Remove JWT_SECRET fallback — crash on missing env var
- [ ] Move password from JSONB metadata to dedicated `password_hash` column
- [ ] Replace SHA-256 BVN/NIN hashing with HMAC-SHA256 (server-side secret)
- [ ] Add machine identity JWT issuance endpoint (`POST /v1/machine/auth`)
- [ ] Add machine JWT verification middleware to all internal routes
- [ ] Create `machine_identities` table (migration `0004_machine_identity.sql`)
- [ ] Add health check endpoints to all 13 services (`GET /healthz`)
- [ ] Add request ID middleware to all services (`X-Request-ID`)

**Success:** Security audit score > 80%. All critical findings resolved.

---

### M5 — Institution Registry (Week 4–5)
**Outcome:** Institutions are governance-managed. Routing only permitted to ACTIVE institutions.

**Tasks:**
- [ ] Create `institutions` table (migration `0005_institutions.sql`)
- [ ] Create `bank_code_registry` table
- [ ] Migrate existing `@rald-alia/shared` bank registry (40+ banks) → `institutions` table with status `PENDING`
- [ ] Build institution onboarding API (`POST /admin/institutions`, `POST /admin/institutions/:id/verify`, `POST /admin/institutions/:id/activate`)
- [ ] Update `resolution-engine` to validate institution status before resolving (must be ACTIVE)
- [ ] Publish `institution.activated` / `institution.suspended` Kafka events
- [ ] Update `routing-service` to block routing to non-ACTIVE institutions

**Success:** Routing to an institution with status != ACTIVE returns `INSTITUTION_NOT_ACTIVE` error.

---

### M6 — Country Governance (Week 5)
**Outcome:** Country status lifecycle enforced. Nigeria moves from INTERNAL to PRIVATE_BETA.

**Tasks:**
- [ ] Migrate `governance-service` country data → PostgreSQL `countries` table
- [ ] Build country lifecycle API (`PATCH /admin/governance/countries/:code/status`)
- [ ] Add country status gate to all user-facing routes (check country status before registration, alias creation, resolution)
- [ ] Configure Nigeria as INTERNAL (initial state)
- [ ] Document Nigeria PRIVATE_BETA activation checklist
- [ ] Emergency disable endpoint: `POST /admin/governance/countries/:code/disable`

**Success:** Setting Nigeria to INTERNAL restricts registration to allowlist. Changing to PRIVATE_BETA opens invite-based registration.

---

### M7 — Developer Registry (Week 5–6)
**Outcome:** External developers can register, get API keys, test in sandbox.

**Tasks:**
- [ ] Create `developers`, `developer_organizations`, `developer_projects` tables (migration `0006_developer_registry.sql`)
- [ ] Augment `api_keys` table with project_id, environment, scopes, rate_limit
- [ ] Build developer registration API
- [ ] Build API key management API (`POST /v1/apikeys`, `GET /v1/apikeys`, `DELETE /v1/apikeys/:id`)
- [ ] Build project management API
- [ ] Implement API key authentication middleware (parallel to JWT middleware, or combined)
- [ ] Implement scope checking middleware
- [ ] Set up sandbox environment (separate DB schema + Redis keyspace)
- [ ] Wire developer console frontend to backend API

**Success:** A developer can register, create a project, receive `sk_test_...` key, and call `POST /v1/resolve` from the sandbox.

---

### M8 — SDK Extraction (Week 6–7)
**Outcome:** @rald/auth-sdk, @rald/machine-sdk, @rald/routing-sdk published. JWT duplication eliminated.

**Tasks:**
- [ ] Create `packages/auth-sdk/` — extract JWT/OTP/password utilities
- [ ] Create `packages/machine-sdk/` — machine JWT issuance + verification
- [ ] Create `packages/routing-sdk/` — alias resolution client
- [ ] Update all ALIA services to import from `@rald/auth-sdk`
- [ ] Publish packages to GitHub Packages (private)
- [ ] Update RALD product services to import `@rald/auth-sdk` (remove copies)
- [ ] Remove X-Internal-Secret from all RALD workers

**Success:** JWT verification code exists in exactly one place. X-Internal-Secret removed.

---

### M9 — Test Coverage (Week 7–8)
**Outcome:** Minimum viable test coverage on critical paths.

**Tasks:**
- [ ] Set up Jest + supertest in each service
- [ ] identity-service: auth flow tests (register → verify → login → refresh → logout)
- [ ] alias-service: create → resolve → update → delete cycle
- [ ] resolution-engine: resolve, cache hit, cache miss, signed token verify
- [ ] consent-service: grant → verify → revoke → audit trail
- [ ] trust-service: signal ingestion → score recalculation → tier change
- [ ] routing-service: profile upsert → route determination → failover
- [ ] fraud-service: velocity check → score → Kafka publish
- [ ] Target: 60% coverage on business logic files

**Success:** `pnpm test` passes. CI blocks merges on failing tests.

---

### M10 — Control Plane (Week 8–10)
**Outcome:** Admin Console is functional. Platform Admins can operate the network.

**Tasks:**
- [ ] Build admin JWT issuance endpoint (separate from user JWT)
- [ ] Build admin authentication middleware
- [ ] Implement admin API (14 domains from `ALIA_CONTROL_PLANE_ARCHITECTURE.md`)
- [ ] Wire `admin-console` Next.js app to admin API
- [ ] Build admin dashboard: Identity stats, Routing health, Fraud queue, Country status
- [ ] Build institution management UI
- [ ] Build developer management UI

**Success:** Platform Admin can log into admin console, view all 5 country statuses, activate Nigeria PRIVATE_BETA, and approve an institution from the UI.

---

## PHASE 2 COMPLETION CRITERIA

At the end of Phase 2:

| Criteria | Status |
|----------|--------|
| All 13 services DB-persisted | Must be ✅ |
| Registry operational | Must be ✅ |
| Identity state machine enforced | Must be ✅ |
| Signed routing tokens | Must be ✅ |
| Machine identity operational | Must be ✅ |
| Institution registry operational | Must be ✅ |
| Nigeria in PRIVATE_BETA | Must be ✅ |
| Developer sandbox available | Must be ✅ |
| SDK packages published | Should be ✅ |
| 60% test coverage on critical paths | Should be ✅ |
| Admin console operational | Should be ✅ |
| Zero critical security findings | Must be ✅ |

---

## WHAT PHASE 2 DOES NOT INCLUDE

- WebAuthn/passkeys (Phase 3)
- Cross-border routing (Phase 3)
- Kubernetes deployment (Phase 3)
- ML-based fraud detection (Phase 3)
- Public developer portal launch (Phase 3)
- Ghana / Kenya activation (Phase 3 — after Nigeria GA)

---

## PHASE 3 PREVIEW (Future)

| Area | Capability |
|------|-----------|
| Authentication | WebAuthn/passkeys (migrate from RALD auth-core) |
| Deployment | Kubernetes + Helm charts |
| Edge | Cloudflare Worker resolution cache (<50ms globally) |
| Fraud | ML behavioral model |
| Trust | Explainability API |
| Countries | Ghana INTERNAL, Kenya INTERNAL |
| Developer | Public developer portal + marketplace |
| SDK | Language SDKs (Python, Go, Java) |
| Compliance | Automated regulatory reporting (NFIU, CBN) |
