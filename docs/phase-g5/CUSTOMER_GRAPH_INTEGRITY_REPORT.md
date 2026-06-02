# CUSTOMER_GRAPH_INTEGRITY_REPORT.md
**Phase:** G.5 — Ecosystem Readiness  
**Workstream:** 2 — Customer Graph Certification  
**Owner:** LILCKY STUDIO LIMITED  
**Date:** 2026-06-02  
**Evidence Source:** GitHub — Ostinato-Loop org repositories

---

## CERTIFICATION MANDATE

Verify every authenticated user resolves to `customer_id` across Loop, Messenger, CRM, Business, and future services.

---

## 1. CUSTOMER GRAPH INFRASTRUCTURE

### loop-crm (crm.rald.cloud)
**Repository:** `Ostinato-Loop/loop-crm`  
**Deployment:** Cloudflare Worker → `crm.rald.cloud/*`

**Schema evidence (`supabase/migrations/20260602_customer_graph.sql`):**

```sql
CREATE TABLE crm_customers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   UUID NOT NULL REFERENCES crm_workspaces(id),
  rald_user_id   TEXT,   -- optional link to auth_users (if customer has RALD account)
  name           TEXT NOT NULL,
  email          TEXT,
  phone          TEXT,
  ...
  merged_into    UUID REFERENCES crm_customers(id),
  is_primary     BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at     TIMESTAMPTZ
);
```

This is the canonical customer record. `crm_customers.id` is the `customer_id` referenced across the ecosystem.

**Channel resolution table (`crm_customer_channels`):**
```sql
-- Enables identity resolution: find customer by incoming channel
CREATE TABLE crm_customer_channels (
  channel_type  TEXT NOT NULL,   -- email | phone | whatsapp | instagram | ...
  channel_id    TEXT NOT NULL,   -- actual identifier
  customer_id   UUID NOT NULL REFERENCES crm_customers(id),
  UNIQUE(workspace_id, channel_type, channel_id)
);
```

This enables inbound identity resolution: an incoming message on any channel maps to exactly one `customer_id` per workspace.

---

## 2. CUSTOMER GRAPH — LOOP INTEGRATION

**Repository:** `Ostinato-Loop/loop`  
**Evidence:** Loop `supabase/migrations/001_initial_schema.sql` creates `profiles` table with `id UUID` but **no `customer_id` field** and no reference to `crm_customers`.

**Finding:** Loop's `profiles` table does not resolve to `customer_id`. Users who sign up for Loop exist in `auth_users` (RALD Identity) and optionally in `profiles` (Loop-specific). There is no bridge to `crm_customers`.

**Status:** ❌ NOT INTEGRATED — Loop users do not resolve to `customer_id`

---

## 3. CUSTOMER GRAPH — MESSENGER INTEGRATION

**Repository:** `Ostinato-Loop/messenger`  
**Evidence:** `workers/loop-messenger-api/supabase/migrations/20260602_messenger_foundation.sql`

```sql
CREATE TABLE messenger_conversations (
  customer_id  UUID,  -- FK to crm_customers (optional)
  ...
);
```

The Messenger schema has a `customer_id` FK on conversations. This means when a conversation is linked to a customer, the Messenger correctly references `crm_customers.id`.

**Worker config (`wrangler.toml`):**
```
CRM_URL = "https://crm.rald.cloud"
```

**CRM client library** (`workers/loop-messenger-api/src/lib/crm.ts`) is present — Messenger posts timeline events to the CRM.

**Finding:** Messenger has the CRM integration architecture in place. Customer resolution is *possible* (conversation can have `customer_id`), but it is **optional** — conversations without a customer_id are valid. Automatic resolution of a message sender to `customer_id` is not automatic.

**Status:** ✅ ARCHITECTURE IN PLACE — customer_id FK present, CRM URL wired, timeline integration exists. Incomplete: auto-resolution of sender → customer not enforced.

---

## 4. CUSTOMER GRAPH — CRM VERIFICATION

**Repository:** `Ostinato-Loop/loop-crm`  
**Certification:** `CUSTOMER_GRAPH_CERTIFICATION.md` is present and PASSES all 12 domains (score: 9.9/10).

| Domain | Status |
|---|---|
| Workspace isolation | ✅ PASS |
| Customer CRUD | ✅ PASS |
| Channel resolution | ✅ PASS |
| Identity merge engine | ✅ PASS |
| Merge rollback | ✅ PASS |
| Audit trail | ✅ PASS |
| RBAC enforcement | ✅ PASS |
| Soft deletes | ✅ PASS |
| Scalability design | ✅ PASS |
| African-first | ✅ PASS |

**Blocking:** 3 ops tasks pending (DNS, secrets, migration apply). Code is ready.

---

## 5. CUSTOMER GRAPH — OTHER APPLICATIONS

| Application | Repo | customer_id Evidence | Status |
|---|---|---|---|
| Loop Business | `loop-business` | No source code | ❌ UNVERIFIABLE |
| DunaRald | `dunarald` | No source code | ❌ UNVERIFIABLE |
| Dispatch | `loop-dispatch` | No source code | ❌ UNVERIFIABLE |
| PayRald | `payrald` | No source code | ❌ UNVERIFIABLE |

---

## 6. VALIDATION CHECKLIST

| Requirement | Status | Evidence |
|---|---|---|
| No duplicate customer creation | ✅ PASS (CRM) | `UNIQUE(workspace_id, channel_type, channel_id)` prevents duplicate channel records |
| Identity merge safety | ✅ PASS (CRM) | Full merge engine with rollback, snapshot, soft-delete of secondary |
| Profile consistency | ⚠️ PARTIAL | CRM has canonical profile; Loop profiles are not synced |
| Customer timeline integrity | ✅ PASS (CRM + Messenger) | `crm_customer_activity` append-only; Messenger posts timeline events |
| Audit trail integrity | ✅ PASS | `crm_audit_log` — append-only, 9 event types; Messenger audit_log — 22 types |

---

## 7. FINDINGS SUMMARY

| ID | Severity | Finding | Repo | Remediation |
|---|---|---|---|---|
| WS2-F1 | HIGH | Loop users do not resolve to `customer_id`. No bridge between `profiles` and `crm_customers`. | `loop` | On first Loop login/registration, create or lookup `crm_customers` record; store `customer_id` on profile. |
| WS2-F2 | HIGH | Loop Business, DunaRald, Dispatch, PayRald have no source code — customer_id resolution cannot be verified. | Multiple | Ship source code with CRM integration. |
| WS2-F3 | MEDIUM | Messenger sender→customer resolution is optional (customer_id is nullable on conversations). | `messenger` | Implement identity resolution middleware: on message send, attempt to resolve sender phone → customer_id via CRM. |
| WS2-F4 | LOW | CRM ops deployment is pending (DNS, migration, secrets not confirmed applied). | `loop-crm` | Apply migration, set secrets, verify `GET /health` at crm.rald.cloud. |

---

## CERTIFICATION DECISION

```
╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║   WORKSTREAM 2 — CUSTOMER GRAPH CERTIFICATION                        ║
║                                                                      ║
║   CRITICAL: 0   HIGH: 2   MEDIUM: 1   LOW: 1                        ║
║                                                                      ║
║   ██████████████████████████████████████████████████████████████   ║
║   ██                                                            ██   ║
║   ██   ❌  FAIL                                                 ██   ║
║   ██                                                            ██   ║
║   ██   CRM (loop-crm): PASS — exceptional implementation.       ██   ║
║   ██   Messenger: ARCHITECTURE READY — auto-resolution missing. ██   ║
║   ██   Loop: No customer_id bridge exists.                      ██   ║
║   ██   Business/DunaRald/Dispatch/PayRald: no source code.      ██   ║
║   ██                                                            ██   ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

LILCKY STUDIO LIMITED — RALD Ecosystem G.5 Certification  
Generated: 2026-06-02 | Evidence: GitHub Ostinato-Loop org
