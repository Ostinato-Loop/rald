# CUSTOMER_GRAPH_INTEGRITY_REPORT.md
**Phase:** G.9 — Pre-Production Certification  
**Workstream:** 2 — Customer Graph Integrity  
**Owner:** LILCKY STUDIO LIMITED  
**Date:** 2026-06-02  
**Evidence Source:** GitHub — Ostinato-Loop org

---

## CERTIFICATION MANDATE

Every authenticated user resolves to `customer_id` across all applications. Validate identity resolution, merge safety, profile consistency, timeline consistency, audit trail integrity.

---

## 1. CUSTOMER GRAPH INFRASTRUCTURE

### loop-crm (`crm.rald.cloud`)
**Repo:** `Ostinato-Loop/loop-crm` | **Deployment:** CF Worker (pending ops)

**Schema** (`supabase/migrations/20260602_customer_graph.sql`):

```sql
crm_customers        — canonical customer record (UUID PK, workspace-scoped)
crm_customer_channels— identity resolution (channel_type + channel_id → customer_id)
crm_customer_notes   — internal notes (soft delete)
crm_customer_segments— smart + manual segments
crm_customer_activity— append-only timeline
crm_audit_log        — append-only audit (9 event types)
crm_customer_merge_log — merge snapshots for rollback
crm_workspaces       — workspace layer
crm_workspace_members— RBAC (owner|admin|member|viewer)
```

**Existing Certification:** `CUSTOMER_GRAPH_CERTIFICATION.md` in repo — PASS, 9.9/10, all 12 domains.

---

## 2. IDENTITY RESOLUTION COVERAGE

### Loop → customer_id
**Evidence:** Loop `supabase/migrations/001_initial_schema.sql` — creates `users` and `profiles` tables. No `customer_id` column, no FK to `crm_customers`.  
**Status:** ❌ Loop users do NOT resolve to `customer_id`.

### Messenger → customer_id
**Evidence:** `workers/loop-messenger-api/supabase/migrations/` — `messenger_conversations.customer_id UUID` (nullable FK to `crm_customers`). `lib/crm.ts` client present. `CRM_URL = https://crm.rald.cloud` wired.  
**Status:** ⚠️ Architecture present. `customer_id` on conversations is optional (nullable). Auto-resolution of sender → customer not enforced.

### CRM → customer_id
**Evidence:** `crm_customers.rald_user_id TEXT` — optional link to `auth_users`. Channel resolution via `crm_customer_channels` (UNIQUE on workspace + channel_type + channel_id).  
**Status:** ✅ CRM is the canonical source. Resolution works if channel is registered.

---

## 3. MERGE SAFETY

**Evidence:** `src/routes/merge.ts`

| Requirement | Implementation | Status |
|---|---|---|
| Primary survives | Primary ID kept, secondary soft-deleted | ✅ |
| Channel re-pointing | `crm_customer_channels` → primary_id | ✅ |
| Notes re-pointing | `crm_customer_notes` → primary_id | ✅ |
| Activity preserved | `crm_customer_activity` → primary_id | ✅ |
| Spend aggregated | `total_spend` summed | ✅ |
| Tags union | Deduped union | ✅ |
| Full snapshot | `merge_snapshot JSONB` in `crm_customer_merge_log` | ✅ |
| Rollback API | `POST /merge/rollback/:merge_log_id` | ✅ |
| Double-rollback guard | Returns 409 if `rolled_back_at` set | ✅ |
| Self-merge guard | Returns 400 if primary_id === secondary_id | ✅ |
| Audit trail | `crm_audit_log` entry on every merge + rollback | ✅ |

**Merge Safety Verdict:** ✅ PASS

---

## 4. PROFILE CONSISTENCY

| Profile Field | CRM Source | Loop Source | Consistent |
|---|---|---|---|
| Name | `crm_customers.name` | `profiles.display_name` | ⚠️ Unsynchronised |
| Email | `crm_customers.email` | `auth_users.email` | ⚠️ Two sources |
| Phone | `crm_customer_channels.channel_id` (type=phone) | `auth_users.metadata.phone` | ⚠️ Unsynchronised |
| Avatar | `crm_customers.avatar_url` | `profiles.avatar_url` | ⚠️ Two copies |
| RALD ID | `crm_customers.rald_user_id` (optional) | `auth_users.rald_id` | ⚠️ Not always wired |

**Profile Consistency Verdict:** ⚠️ PARTIAL — No sync layer between RALD Identity, Loop profiles, and CRM. Updates in one do not propagate to others.

---

## 5. TIMELINE INTEGRITY

**Messenger timeline integration** (`lib/crm.ts` — `writeCrmActivity()`):
```typescript
// Called from conversations.ts on conversation create
await writeCrmActivity(c.env.CRM_URL, jwtToken, {
  workspaceId, customerId, eventType: "conversation.started", ...
});
```

**CRM timeline** (`crm_customer_activity`):
- Append-only — no DELETE routes exposed
- Pagination enforced (max 200 per page)
- `event_type` validated against `VALID_EVENT_TYPES` list
- `POST /timeline/customer/:id` — external systems can append events

**Timeline Integrity Verdict:** ✅ PASS (when customer_id is present on conversation)

---

## 6. AUDIT TRAIL INTEGRITY

| Service | Audit Table | Events | Append-Only |
|---|---|---|---|
| loop-crm | `crm_audit_log` | 9 types | ✅ No DELETE |
| messenger | `messenger_audit_log` | 22 types | ✅ No DELETE |
| rald-auth-core | `auth_sessions` (revoked_at) | Session lifecycle | ⚠️ Not a dedicated audit log |

**Audit Integrity Verdict:** ✅ PASS (CRM + Messenger). ⚠️ PARTIAL (rald-auth-core has no dedicated audit log).

---

## 7. FINDINGS

| ID | Severity | Finding |
|---|---|---|
| WS2-F1 | HIGH | Loop users do not resolve to `customer_id`. No bridge from `profiles` to `crm_customers`. |
| WS2-F2 | HIGH | 4 apps (Loop Business, DunaRald, Dispatch, PayRald) have no source — customer_id unverifiable. |
| WS2-F3 | MEDIUM | Messenger `customer_id` on conversations is nullable — auto-resolution not enforced. |
| WS2-F4 | MEDIUM | Profile fields (name, email, phone, avatar) exist in multiple stores with no sync. |
| WS2-F5 | LOW | `crm.rald.cloud` deployment pending ops (DNS, migration, 3 secrets). Code is ready. |

---

## CERTIFICATION DECISION

```
╔══════════════════════════════════════════════╗
║  WS2 — CUSTOMER GRAPH INTEGRITY              ║
║  CRITICAL: 0  HIGH: 2  MEDIUM: 2  LOW: 1    ║
║  DECISION: ❌  FAIL                           ║
║                                              ║
║  loop-crm: PASS (9.9/10, all 12 domains).   ║
║  Messenger: ARCHITECTURE READY.              ║
║  Loop: NO customer_id bridge.                ║
╚══════════════════════════════════════════════╝
```

LILCKY STUDIO LIMITED — RALD G.9 Certification | 2026-06-02
