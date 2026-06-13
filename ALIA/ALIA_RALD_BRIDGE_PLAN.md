# ALIA_RALD_BRIDGE_PLAN.md
# RALD ALIA — Bridge Plan: GitLab ALIA ↔ GitHub RALD Ecosystem
**Audit Date:** 2026-06-13

---

## OBJECTIVE

Define exactly how ALIA (GitLab, Node.js + Kafka + PostgreSQL) integrates with the RALD GitHub ecosystem (Cloudflare Workers + Supabase). Both exist. Both have real code. They must become one coherent system.

---

## CURRENT STATE (BEFORE BRIDGE)

```
GitHub Ecosystem (Cloudflare Workers + Supabase)
├── rald-auth-core       — WebAuthn, machine JWT, 80+ migrations
├── rald-identity        — Profiles (partial)
├── rald-event-bus       — Events
├── loop, messenger      — Products (auth duplicated internally)
├── payrald, gitrald     — Products (auth duplicated)
├── raldtics, tradeos    — Products (auth duplicated)
└── rald-routing         — CANCELLED (duplication of ALIA)

GitLab (Node.js + Kafka + PostgreSQL)
├── identity-service     — Full auth + identity
├── alias-service        — Full alias registry
├── resolution-engine    — Full routing resolution
├── routing-service      — Full routing profiles
├── trust-service        — Trust scoring (in-memory)
├── consent-service      — Consent lifecycle (in-memory)
├── fraud-service        — Fraud detection
├── audit-service        — Audit trail
├── governance-service   — Policy + country rules (in-memory)
├── merchant-service     — Merchant identity (in-memory)
├── verification-service — KYC (in-memory)
└── notification-service — Notifications
```

---

## TARGET STATE (AFTER BRIDGE)

```
ALIA Platform (Node.js + Kafka + PostgreSQL)
│   ↓ exposed via HTTPS API + machine JWT auth
├── All 13 ALIA services (fully persisted, hardened)
└── Edge resolution layer (Cloudflare Worker → ALIA origin)

RALD Products (Cloudflare Workers)
├── loop, messenger, payrald, gitrald, raldtics, tradeos
│   └── Each uses @rald/auth-sdk + @rald/routing-sdk to call ALIA
│   └── Each does NOT implement identity/trust/consent/routing internally
│
└── rald-auth-core → MIGRATE WebAuthn + machine-JWT → into ALIA identity-service

Shared SDKs (npm packages)
├── @rald/auth-sdk        — JWT verification (replaces 6 copies)
├── @rald/machine-sdk     — Machine identity (service-to-service)
└── @rald/routing-sdk     — Alias resolution client
```

---

## BRIDGE PHASES

### Phase B1: Repository Consolidation

**Action:** Push ALIA GitLab codebase to `Ostinato-Loop/rald-alia` on GitHub.

**Method:**
1. Create `Ostinato-Loop/rald-alia` GitHub repo
2. Push all ALIA code from GitLab via GitHub API (no destructive git ops)
3. Set `Ostinato-Loop/rald-alia` as the canonical ALIA source
4. Keep GitLab as read-only mirror

**No code changes required at this step.**

---

### Phase B2: Persistence Fix (Unblocks integration)

**Action:** Add Drizzle migrations for 11 missing tables.

```sql
-- New migration: 0001_add_alia_engines.sql
CREATE TABLE consents (...);
CREATE TABLE consent_audit_trail (...);
CREATE TABLE mandates (...);
CREATE TABLE trust_scores (...);
CREATE TABLE trust_signals (...);
CREATE TABLE trust_history (...);
CREATE TABLE reputation_profiles (...);
CREATE TABLE merchants (...);
CREATE TABLE kyc_sessions (...);
CREATE TABLE policies (...);
CREATE TABLE verification_credentials (...);
```

Wire each in-memory service to DB. This is the single most impactful change.

---

### Phase B3: Machine Identity

**Action:** Build machine identity endpoint in ALIA identity-service (or a new machine-service).

```
POST /v1/machine/auth
  Body: { service_name, service_id, client_secret }
  Response: { machine_jwt, expires_at }

GET /v1/machine/verify  (middleware)
  Header: X-Machine-Token: <machine_jwt>
  Injects: service_id, service_name, scopes
```

**Source:** Migrate the machine_identity schema from `rald-auth-core` into ALIA.

**Impact:** All RALD product services get machine credentials on startup. Remove X-Internal-Secret.

---

### Phase B4: Signed Routing Token

**Action:** Fix the security issue in resolution-engine. Replace raw `account_token` with signed ephemeral JWT.

```
Current: { token: "acc_xyz123", routing: { destinationBankCode: "058" } }

Target:  { routing_token: "<signed.jwt.here>", public_hint: "Zenith Bank", expires_at: "+60s" }
```

The routing token is verified by ALIA (single-use, 60s TTL). The institution calls `POST /resolve/verify` to consume it. Raw account_token never leaves ALIA.

---

### Phase B5: SDK Extraction

**Action:** Create 3 npm packages from ALIA + RALD code:

#### `@rald/auth-sdk`
```typescript
// Exports:
verifyJwt(token: string, secret: string): Promise<JwtPayload | null>
signJwt(payload: object, secret: string, expiresIn: string): string
generateOtp(): string
hashOtp(otp: string): string
```

#### `@rald/machine-sdk`
```typescript
// Exports:
getMachineToken(serviceId: string, secret: string): Promise<string>
verifyMachineToken(token: string): Promise<MachinePayload | null>
requireMachine(scope: string): Middleware
```

#### `@rald/routing-sdk`
```typescript
// Exports:
resolveAlias(alias: string, opts: ResolveOptions): Promise<RoutingToken>
verifyRoutingToken(token: string): Promise<TokenPayload | null>
```

---

### Phase B6: Product Integration

Each RALD product integrates ALIA:

**Loop (messaging):**
- Remove internal JWT auth → use ALIA identity-service
- Add `@rald/auth-sdk` for token verification
- User identity lookup → `GET /v1/users/:id` via ALIA
- Consent check before reading DMs → `POST /v1/consents/verify`

**Messenger:**
- Same as Loop

**PayRald:**
- Remove internal routing → use ALIA resolution-engine
- `POST /resolve` before every payment initiation
- Trust check before high-value transfers → `GET /v1/trust/:entityId`
- Consent check for recurring payments → `POST /v1/mandates/:id/verify`
- Fraud signal on failed payments → `POST /v1/trust/signal`

**GitRald:**
- Identity verification via ALIA
- Machine identity for repository access tokens

**Raldtics (analytics):**
- Consume ALIA audit events via Kafka for analytics
- No write integration — read-only consumer

**TradeOS:**
- Merchant verification via ALIA merchant-service
- Institution routing via ALIA routing-service

---

### Phase B7: WebAuthn Migration

**Action:** Port WebAuthn/passkey implementation from `rald-auth-core` into ALIA `identity-service`.

Affected files in rald-auth-core (to migrate):
- `supabase/migrations/` — webauthn-related migrations
- WebAuthn challenge generation / verification routes
- Passkey credential storage schema

Target in ALIA:
```
identity-service/src/routes/passkeys.ts
identity-service/src/services/webauthn.service.ts
packages/db/migrations/0002_add_webauthn.sql
```

---

## BRIDGE COMPLETION CHECKLIST

| Phase | Deliverable | Status |
|-------|-------------|--------|
| B1 | ALIA GitLab → GitHub push | ⬜ Pending |
| B2 | 11 Drizzle table migrations | ⬜ Pending |
| B2 | 5 in-memory services → DB | ⬜ Pending |
| B3 | Machine JWT endpoint | ⬜ Pending |
| B3 | X-Internal-Secret removed from RALD | ⬜ Pending |
| B4 | Signed routing token in resolution-engine | ⬜ Pending |
| B5 | @rald/auth-sdk | ⬜ Pending |
| B5 | @rald/machine-sdk | ⬜ Pending |
| B5 | @rald/routing-sdk | ⬜ Pending |
| B6 | PayRald → ALIA routing integration | ⬜ Pending |
| B6 | Loop → ALIA identity integration | ⬜ Pending |
| B7 | WebAuthn migration | ⬜ Pending |
