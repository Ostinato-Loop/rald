# ALIA_DUPLICATION_REPORT.md
# RALD ALIA — Duplication Report: ALIA (GitLab) vs RALD (GitHub)
**Audit Date:** 2026-06-13

---

## EXECUTIVE SUMMARY

There are **5 categories of duplication** between ALIA (GitLab) and the RALD GitHub ecosystem. In all cases, ALIA has the more complete implementation. The exception is WebAuthn/passkeys, where RALD auth-core leads.

The most dangerous duplication is building `rald-routing` (new Cloudflare Worker service) when `resolution-engine` + `routing-service` already exist in ALIA with working resolution. **This build has been stopped.**

---

## DUPLICATION CATEGORY 1: Routing / Resolution

| Component | ALIA (GitLab) | RALD GitHub | Verdict |
|-----------|--------------|-------------|---------|
| Alias resolution | `resolution-engine` — complete, Redis-cached, Kafka | `rald-routing` — 19 files built to /tmp, NOT pushed | **Use ALIA. Delete rald-routing attempt.** |
| Routing profiles | `routing-service` — PostgreSQL-persisted, failover | GitHub stub `rald-routing` — no schema | **Use ALIA** |
| Bank registry | `@rald-alia/shared/banks` — 40+ banks, 5 countries | None | **Use ALIA** |
| Route determination | `routing-service` — profile + bank_link strategy | Not implemented in GitHub | **Use ALIA** |

**Action:** Discard `/tmp/rald-routing/` files. Do not push to GitHub. The ALIA resolution-engine + routing-service covers this capability.

---

## DUPLICATION CATEGORY 2: Identity

| Component | ALIA (GitLab) | RALD GitHub | Verdict |
|-----------|--------------|-------------|---------|
| User identity | `identity-service` — complete (register, verify, CRUD) | `rald-identity` — partial | **ALIA is canonical** |
| Organization identity | `identity-service` — complete | Not present in rald-identity | **ALIA is canonical** |
| Merchant identity | `merchant-service` — complete logic | Not present | **ALIA is canonical** |
| KYC / verification | `verification-service` — complete structure | Not present in RALD | **ALIA is canonical** |
| Auth (password, OTP) | `identity-service/auth.ts` — complete | `rald-auth-core` — supabase-based, more migrations | **ALIA for logic; RALD for advanced features** |
| Auth (WebAuthn) | ❌ Not present | `rald-auth-core` — implemented (80+ migrations) | **Migrate RALD → ALIA** |
| Auth (machine JWT) | ❌ Not present | `rald-auth-core` machine_identity migration | **Migrate RALD → ALIA** |

---

## DUPLICATION CATEGORY 3: Trust / Fraud

| Component | ALIA (GitLab) | RALD GitHub | Verdict |
|-----------|--------------|-------------|---------|
| Trust scoring | `trust-service` — rich signal model, tiers | `rald-auth-core` trust_engine migration (schema only) | **ALIA logic + RALD schema → merge into ALIA** |
| Reputation engine | `trust-service` — flags, PEP, sanctions | Not present in RALD | **ALIA is canonical** |
| Fraud detection | `fraud-service` — velocity, signals, Kafka | Not present as standalone in RALD | **ALIA is canonical** |

---

## DUPLICATION CATEGORY 4: Consent / Authorization

| Component | ALIA (GitLab) | RALD GitHub | Verdict |
|-----------|--------------|-------------|---------|
| Consent lifecycle | `consent-service` — grant/revoke/verify/expire/audit | `rald-auth-core` consent migration (schema only) | **ALIA logic is canonical** |
| Mandate engine | `consent-service` — recurring payment mandates | Not present in RALD | **ALIA is canonical** |
| Permission registry | `consent-service` — RBAC scope registry | `rald-auth-core` permission_engine migration | **ALIA for API; RALD schema contributes** |

---

## DUPLICATION CATEGORY 5: JWT Auth Logic

The single most pervasive duplication across the RALD GitHub ecosystem.

| Location | Duplication |
|----------|------------|
| `rald-auth-core` | JWT issuance (primary) |
| `rald-identity` | Copy-pasted JWT verification |
| `rald-realtime` | Copy-pasted JWT verification |
| `rald-control-center` | Copy-pasted JWT verification |
| `rald-search` | Copy-pasted JWT verification |
| RALD workers (multiple) | X-Internal-Secret + JWT verification |
| ALIA `identity-service` | JWT issuance (different implementation) |
| ALIA `gateway` | JWT verification |

**Action:** Create `@rald/auth-sdk` package. All services consume SDK. Delete copies.

---

## DUPLICATION CATEGORY 6: Audit Logging

| Component | ALIA | RALD GitHub |
|-----------|------|-------------|
| Audit trail | `audit-service` — Kafka-driven, SHA-256 checksum, DB-persisted | Multiple RALD services write audit logs independently |

**Action:** All RALD product services should emit Kafka events to ALIA audit-service.

---

## DUPLICATION CATEGORY 7: Notification

| Component | ALIA | RALD GitHub |
|-----------|------|-------------|
| Notifications | `notification-service` — Kafka-driven | `rald-notify` — separate GitHub service |

**Action:** ALIA notification-service becomes the canonical notification hub. RALD products publish events; ALIA delivers.

---

## DUPLICATE FRONTEND UI COMPONENTS

| Pattern | ALIA | RALD GitHub |
|---------|------|-------------|
| UI components | `frontend/packages/ui` (Button, Card, Badge, etc.) | shadcn/ui copied into 6+ RALD repos |
| Admin dashboards | `frontend/apps/admin-console` | `rald-control-center` |

**Action:** ALIA `@rald-alia/ui` package → becomes `@rald/ui` shared across ecosystem.

---

## WHAT TO DELETE / DISCARD

| Item | Action | Reason |
|------|--------|--------|
| `/tmp/rald-routing/` files (locally written) | **Discard** | rald-routing capability already exists in ALIA |
| `rald-routing` GitHub repo (if created) | **Delete or archive** | ALIA routing-service + resolution-engine cover this |
| `X-Internal-Secret` from all RALD workers | **Remove** | Replace with machine identity JWT |
| Copy-pasted JWT verification in 5+ RALD services | **Remove** | Replace with `@rald/auth-sdk` |
| `shadcn/ui` copies in 6+ RALD repos | **Remove** | Replace with `@rald/ui` |

---

## WHAT TO KEEP FROM RALD (AND MIGRATE INTO ALIA)

| Item | Location | Migration Target |
|------|----------|-----------------|
| WebAuthn/passkeys implementation | `rald-auth-core` | `alia/identity-service/auth.ts` |
| Machine identity JWT issuance | `rald-auth-core` machine_identity migration | New `alia/identity-service/machine.ts` or new machine-service |
| Developer platform schema | `rald-auth-core` developer_platform migration | `alia/packages/db` — add to schema |
| Trust engine schema | `rald-auth-core` trust_engine migration | `alia/packages/db` — add to schema |
| 80+ supabase migrations history | `rald-auth-core/supabase/migrations/` | Reference for Drizzle migration equivalents |
