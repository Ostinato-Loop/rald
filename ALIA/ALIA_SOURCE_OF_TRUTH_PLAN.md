# ALIA_SOURCE_OF_TRUTH_PLAN.md
# RALD ALIA — Source of Truth Decision
**Audit Date:** 2026-06-13

---

## THE QUESTION

Should ALIA become:

**A. Infrastructure Core** — All RALD products consume ALIA. ALIA owns identity, trust, consent, routing. Products cannot reimplement.

**B. Shared Library** — ALIA is a set of importable packages. Products call ALIA functions locally.

**C. Independent Service Network** — ALIA is fully independent. Products connect via API/SDK. ALIA has its own deployment, versioning, SLA.

---

## RECOMMENDATION: Option A — Infrastructure Core

**ALIA must become Infrastructure Core.**

### Reasoning

1. **ALIA already has the routing and resolution architecture.** The resolution-engine correctly treats routing as infrastructure — alias lookup, tokenized bank references, Redis caching, Kafka events. This is infrastructure, not application code.

2. **Products duplicating ALIA logic is the core problem today.** JWT verification in 6+ RALD services, audit logging in 4+ services, identity checking in every worker — this duplication exists because ALIA was not positioned as infrastructure.

3. **Option B (Shared Library) doesn't solve the real problem.** If ALIA is importable packages, services still import and run their own instances. No consistency. No centralized audit trail. No single trust score per entity.

4. **Option C (Independent Network) is the correct end state.** But it requires Option A as an intermediate step — establish ALIA as the canonical owner first, then expose it as a network.

5. **The analogy holds:** DNS is not a library you import. SWIFT is not a function you call locally. Plaid is not code you copy into your app. These are services you authenticate to and call. ALIA must be the same.

---

## DECISION: ALIA IS THE CANONICAL SOURCE OF TRUTH

All 6 layers belong in ALIA:

| Layer | Owner | Products' Role |
|-------|-------|---------------|
| Identity | ALIA | Products call ALIA to create/verify identities |
| Trust | ALIA | Products call ALIA to get trust scores |
| Consent | ALIA | Products call ALIA to grant/verify consent |
| Authorization | ALIA | Products call ALIA to verify permissions |
| Routing | ALIA | Products call ALIA to resolve aliases |
| Machine Identity | ALIA | Services authenticate to ALIA |

**Products (Loop, Messenger, PayRald, GitRald, Raldtics, TradeOS) must:**
- Consume ALIA via API or SDK
- Never reimplement identity, trust, consent, routing, or authorization
- Store only their product-specific data

---

## TECHNOLOGY DECISION: ALIA RUNTIME

| Question | Decision | Reasoning |
|----------|----------|-----------|
| Keep Node.js + Express? | **YES** for services | Entire codebase is Node.js. Rewriting to Cloudflare Workers would discard all existing code. |
| Keep PostgreSQL? | **YES** | Drizzle ORM schema is solid. Move to per-service databases for isolation. |
| Keep Redis? | **YES** | Critical for resolution-engine caching (<200ms target). |
| Keep Kafka? | **YES** | Event bus is well-designed with 30+ typed events. |
| Add Cloudflare Workers? | **YES — for edge resolution** | The public `POST /resolve` endpoint benefits from edge caching. Run the resolution-engine behind a Cloudflare Worker that calls the origin. |
| GitHub vs GitLab? | **GitHub = Source of Truth** | Per confirmed project decision. Push all ALIA code to `Ostinato-Loop/rald-alia` on GitHub. |

---

## MIGRATION STRATEGY

### Step 1: GitLab → GitHub (Immediate)
Push all ALIA GitLab code to `Ostinato-Loop/rald-alia` GitHub repo. Maintain GitLab as mirror only.

### Step 2: Fix persistence (Before any product integration)
Wire the 5 in-memory services to PostgreSQL. No product should consume ALIA until this is done.

### Step 3: Machine identity (Before RALD products connect)
All service-to-service calls must use machine JWT. Products must obtain a machine JWT to call ALIA. This is the authentication model.

### Step 4: RALD products integrate
Each RALD product: Loop, Messenger, PayRald — removes its own identity/auth/routing logic and calls ALIA via SDK.

### Step 5: Edge resolution layer
Deploy Cloudflare Worker that:
- Accepts `POST /resolve`
- Checks edge cache (KV, 30s TTL)
- On miss: proxies to ALIA resolution-engine origin
- Achieves <50ms globally for cached resolutions

---

## RISK ANALYSIS

### Risk 1: Architecture mismatch (Node.js + Docker vs Cloudflare Workers)
**Severity: Medium**
ALIA is Docker-based. RALD GitHub services are Cloudflare Workers-based. These don't share runtime.

**Mitigation:** Products stay on Cloudflare Workers. They call ALIA via HTTPS. ALIA stays on Node.js/Docker. Edge caching layer bridges the latency gap.

### Risk 2: In-memory data loss (consent, trust, merchant, governance)
**Severity: Critical**
5 services lose all data on restart.

**Mitigation:** Blocked on P0 — DB persistence must be implemented before any external integration.

### Risk 3: Single PostgreSQL for 13 services
**Severity: High**
One compromised service can read all data.

**Mitigation:** Per-domain database split in Phase 3. For now: implement row-level security + service-specific DB users with minimal permissions.

### Risk 4: No tests
**Severity: High**
Zero coverage means regressions are invisible.

**Mitigation:** Add integration test suite before any product integration. Minimum: identity-service, alias-service, resolution-engine.

### Risk 5: Raw account_token in resolution response
**Severity: Critical — MUST FIX NOW**
Current resolution-engine returns `account_token` directly. This is a tokenized bank reference but it still represents sensitive routing data.

**Mitigation:** Implement signed ephemeral routing token (60s TTL, HS256). Add `POST /resolve/verify` endpoint for institutions to consume.

---

## FINAL OWNERSHIP TABLE

| Capability | Where it lives | Status |
|-----------|---------------|--------|
| Identity | ALIA `identity-service` | ✅ Ready (with hardening) |
| Alias registry | ALIA `alias-service` | ✅ Ready |
| Resolution | ALIA `resolution-engine` | ✅ Ready (fix token signing) |
| Routing profiles | ALIA `routing-service` | ✅ Ready |
| Trust scoring | ALIA `trust-service` | ⚠️ Needs DB persistence |
| Consent | ALIA `consent-service` | ⚠️ Needs DB persistence |
| Fraud detection | ALIA `fraud-service` | ✅ Ready |
| Audit trail | ALIA `audit-service` | ✅ Ready |
| Notifications | ALIA `notification-service` | ⚠️ Needs provider wiring |
| Governance | ALIA `governance-service` | ⚠️ Needs DB persistence |
| Merchant identity | ALIA `merchant-service` | ⚠️ Needs DB persistence |
| KYC / Verification | ALIA `verification-service` | ⚠️ Needs provider wiring |
| Machine identity | New service or ALIA auth extension | ❌ Build |
| WebAuthn / Passkeys | Migrate from RALD auth-core | ❌ Migrate |
| Developer API keys | ALIA (table exists, API missing) | ❌ Build API |
| Edge resolution cache | Cloudflare Worker (thin proxy to ALIA) | ❌ Build |
