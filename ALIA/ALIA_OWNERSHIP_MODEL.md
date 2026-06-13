# ALIA_OWNERSHIP_MODEL.md
# RALD ALIA — Canonical Ownership Model
**Version:** 1.0 — Phase 2 Governance
**Date:** 2026-06-13

---

## AXIOM

> ALIA is permanent financial infrastructure.
> Products consume ALIA. Products never reimplement ALIA.

This document is binding. Any RALD product, service, or team that reimplements a capability owned by ALIA is creating a protocol violation. The remedy is migration, not coexistence.

---

## ALIA-OWNED CAPABILITIES

The following capabilities belong permanently to ALIA. No other service may implement a competing version.

### 1. Identity
**Owner:** ALIA `identity-service` + `registry` (new)

ALIA is the single source of truth for every entity that exists in the network:
- Person (individual user)
- Business (company, enterprise)
- Merchant (payment-accepting entity)
- Institution (bank, fintech, processor, payment scheme)
- Developer (API consumer, product builder)
- Government (central bank, regulatory body, tax authority)
- Machine (service identity, API robot)

Any external system referencing an entity uses the ALIA `registry_id`. No entity exists in the network without a registry record.

**Prohibition:** No RALD product may maintain its own user identity database, user credential store, or entity roster that duplicates ALIA identity.

---

### 2. Trust
**Owner:** ALIA `trust-service`

ALIA computes and owns all trust scores, reputation profiles, and risk classifications for every entity.

Products may:
- Read trust scores via API (`GET /v1/trust/:entityId`)
- Submit trust signals via API (`POST /v1/trust/signal`)

Products may not:
- Store trust scores locally
- Override or modify trust scores
- Apply their own trust tiers or reputation labels

---

### 3. Consent
**Owner:** ALIA `consent-service`

ALIA records and enforces all consent grants, revocations, mandates, and permission grants between entities.

Products must:
- Verify consent before accessing another entity's data (`POST /v1/consents/verify`)
- Record consent when a user authorizes a product action (`POST /v1/consents/grant`)
- Respect revocations immediately upon receiving a revocation event

Products may not:
- Store consent records locally
- Self-certify consent ("the user agreed to our ToS")
- Bypass consent verification for any cross-entity data access

---

### 4. Authorization
**Owner:** ALIA `consent-service` (permission engine) + `governance-service` (policy engine)

ALIA defines what actions are permitted for each entity type in each country under each policy regime.

**Prohibition:** No product may define its own authorization policy that affects another entity's data or funds without ALIA policy backing.

---

### 5. Routing
**Owner:** ALIA `resolution-engine` + `routing-service`

ALIA resolves every alias to a routing token. ALIA manages every routing profile. No payment may be initiated to an alias without an ALIA-issued routing token.

Products must:
- Call ALIA resolution before initiating any payment (`POST /v1/resolve`)
- Consume the signed routing token, not the raw account token
- Never cache routing tokens beyond their TTL

Products may not:
- Build their own alias → bank account resolution
- Store bank account details discovered through ALIA resolution
- Bypass the routing token system

---

### 6. Directory
**Owner:** ALIA `directory-service`

The public alias directory is ALIA-owned. No product may expose a competing public alias lookup.

---

### 7. Machine Identity
**Owner:** ALIA (new `machine-service` or extension of `identity-service`)

Every service-to-service interaction in the RALD network uses ALIA-issued machine JWTs. No service may call another service using a shared secret, hardcoded header, or any mechanism other than a machine JWT.

---

### 8. Fraud Signals
**Owner:** ALIA `fraud-service`

All fraud events, velocity checks, and risk signals are centralized in ALIA. Products submit signals, ALIA scores and decides.

**Prohibition:** No product may block or flag an entity based on its own fraud logic. Products submit signals. ALIA acts.

---

### 9. Audit Network
**Owner:** ALIA `audit-service`

Every meaningful event in the network is recorded in ALIA's audit trail. Products must publish events to ALIA's Kafka bus. Products may not maintain separate audit logs that exclude ALIA.

---

### 10. Institution Registry
**Owner:** ALIA (new `institution-registry` or extension of `identity-service`)

Every bank, fintech, processor, and payment scheme that participates in the network must be registered, verified, and approved in ALIA before routing to it is permitted.

---

### 11. Merchant Registry
**Owner:** ALIA `merchant-service`

All merchants are registered, verified, and governed by ALIA. Product apps may display merchant data from ALIA. They may not maintain competing merchant databases.

---

### 12. Business Registry
**Owner:** ALIA (business entity type within registry)

All registered businesses (companies with RC numbers or equivalent) are canonical ALIA entities. ALIA validates business registration against country registries.

---

### 13. Developer Registry
**Owner:** ALIA (new developer governance layer)

All developers, organizations, projects, and API keys are issued and governed by ALIA. No product may issue API keys for ALIA-owned capabilities.

---

### 14. Government Registry
**Owner:** ALIA

Government entities (central banks, tax authorities, pension funds) are registered in ALIA. Routing to government entities requires explicit governance approval.

---

## RALD PRODUCT OWNERSHIP

The following are owned by individual RALD products. ALIA does not govern them.

| Product | Owns |
|---------|------|
| **Loop** | Messaging threads, posts, communities, social graph, media |
| **Messenger** | Direct messages, group chats, encryption keys per conversation |
| **PayRald** | Payment UX, payment history display, payment notifications |
| **GitRald** | Repositories, branches, commits, issues, pull requests, code review |
| **Raldtics** | Analytics dashboards, report definitions, visualizations |
| **TradeOS** | Trade listings, bids, escrow logic, commodity categories |
| **DunaRald** | Education content, courses, enrollments, certificates |
| **RALD Mail** | Emails, inboxes, labels, threads (not identity) |
| **RALD TV** | Videos, channels, playlists, streaming configuration |

**Every product calls ALIA for:** identity resolution, trust scores, consent verification, payment routing, audit event publishing.

---

## ENFORCEMENT RULES

### Rule 1: No Competing Identity
Any service that creates a `users` table without linking to `registry_id` is in violation. Exception: local caching of ALIA-issued identity fields (name, email) for performance, as long as ALIA is the write authority.

### Rule 2: No Direct Bank Account Access
No product may store, transmit, or request bank account numbers, NUBAN, sort codes, or any account identifiers. All routing goes through ALIA. ALIA issues tokens, never raw account data.

### Rule 3: No Local Consent Storage
Any product that writes `consent_granted: true` or equivalent to its own database without an ALIA consent record is in violation. ALIA is the ledger.

### Rule 4: No Self-Signed Machine Auth
Any service that uses `X-Internal-Secret`, hardcoded API keys, or shared passwords for service-to-service auth is in violation. All machine auth uses ALIA machine JWTs.

### Rule 5: Events Must Reach ALIA Audit
Any action that affects another entity's identity, funds, data, or consent must publish a Kafka event that reaches ALIA `audit-service`. Silent mutations are not permitted.

### Rule 6: Trust is Read-Only for Products
Products may read trust scores. They may submit signals. They may not write trust scores, override tiers, or maintain local reputation systems.

---

## GOVERNANCE AUTHORITY

| Decision Type | Authority |
|--------------|-----------|
| Add new ALIA-owned capability | ALIA Platform Team |
| Register a new institution | ALIA Country Admin |
| Activate a new country | ALIA Platform Admin |
| Issue machine identity to a new service | ALIA Platform Admin |
| Grant RALD product access to a new ALIA scope | ALIA Platform Team |
| Override governance policy for an institution | ALIA Platform Admin + Legal sign-off |
