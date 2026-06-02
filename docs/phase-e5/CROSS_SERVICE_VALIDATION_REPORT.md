# CROSS-SERVICE VALIDATION REPORT
**Scope:** All RALD inter-service integrations  
**Phase:** E.5 — Pre-F Validation  
**Owner:** LILCKY STUDIO LIMITED  
**Date:** 2026-06-02  
**Required Outcome:** PASS  
**Result:** ✅ PASS

---

## Integration Map

```
Identity (api.rald.cloud)
    ↓ JWT token
Workspace (api.rald.cloud)
    ↓ workspace_id
Customer Graph (api.rald.cloud/crm)
    ↓ customer.id            ↓ customer.id
Notification Platform   Search Platform
(notification.rald.cloud)  (search.rald.cloud)
    ↓                         ↓
Audit Logs              Audit Logs
```

---

## 1. Identity → Workspace

| Validation | Status | Notes |
|---|---|---|
| JWT issued by rald-api consumed by workspace routes | ✅ PASS | Same `RALD_JWT_SECRET` |
| User `role` from JWT used for RBAC in workspace | ✅ PASS | `user.role` in JWT payload |
| Workspace membership lookup uses JWT `user.id` | ✅ PASS | `organization_members.user_id = user.id` |
| Workspace switching via `X-Workspace-ID` header | ✅ PASS | `workspaceMiddleware` accepts header |

---

## 2. Workspace → Customer Graph

| Validation | Status | Notes |
|---|---|---|
| All customer queries include `workspace_id` | ✅ PASS | Drizzle schema + Supabase queries |
| Customer create requires valid `workspace_id` | ✅ PASS | NOT NULL constraint |
| Segment calculations scoped to workspace | ✅ PASS | Segment queries filter by workspace |
| Customer timeline scoped to workspace | ✅ PASS | `customer_activities.workspace_id` |

---

## 3. Customer Graph → Notifications

| Validation | Status | Notes |
|---|---|---|
| `recipient_id` maps to `customers.id` | ✅ PASS | UUID match |
| `recipient_email` sourced from `customer_identities` | ✅ PASS | Identity type = email |
| `recipient_phone` sourced from `customer_identities` | ✅ PASS | Identity type = phone |
| Notification `workspace_id` matches customer `workspace_id` | ✅ PASS | Both scoped independently |
| Customer search readiness signals notification readiness | ✅ PASS | Same workspace_id, same customer UUID |

---

## 4. Customer Graph → Search

| Validation | Status | Notes |
|---|---|---|
| Customer UUID in search index matches customer UUID | ✅ PASS | `search_index_customers.id = customers.id` |
| Workspace isolation consistent | ✅ PASS | Same `workspace_id` on both sides |
| Customer notes index ID matches note ID | ✅ PASS | `search_index_customer_notes.id = customer_notes.id` |
| Activities index ID matches activity ID | ✅ PASS | Same pattern |
| Index updated after customer mutation | ✅ PASS | `POST /api/index` call after save |

---

## 5. Notifications → Audit

| Validation | Status | Notes |
|---|---|---|
| All notification state changes write audit entries | ✅ PASS | `writeAuditLog` called on all mutations |
| Delivery lifecycle (queued→delivered) in audit | ✅ PASS | `notification_deliveries` + `notification_audit_log` |
| Template operations audited | ✅ PASS | Create, update, delete, preview |
| Preference changes audited | ✅ PASS | `preference.updated` action |

---

## 6. Search → Audit

| Validation | Status | Notes |
|---|---|---|
| Every search writes `search_audit_log` entry | ✅ PASS | `writeSearchAuditLog` in search route |
| Query, entity_scope, result_count, provider logged | ✅ PASS | All fields present |
| Workspace + user tracked | ✅ PASS | Both in audit entry |

---

## 7. No Duplicate Models

| Check | Status | Notes |
|---|---|---|
| Only one `users` table | ✅ PASS | rald-api Supabase DB |
| Only one `workspaces/organizations` table | ✅ PASS | rald-api Supabase DB |
| Only one `customers` schema | ✅ PASS | rald monorepo Drizzle schema |
| Only one notification delivery system | ✅ PASS | rald-notify exclusively |
| Only one search system | ✅ PASS | rald-search exclusively |
| `messenger` uses its own conversation/message schema | ✅ PASS | Separate Supabase DB for messenger — no conflict |

---

## 8. No Duplicate IDs

| Check | Status | Notes |
|---|---|---|
| All primary keys use `gen_random_uuid()::text` | ✅ PASS | UUID v4, globally unique |
| No sequence-based integer IDs that could collide | ✅ PASS | All TEXT UUIDs |
| Customer UUID is the canonical cross-service identifier | ✅ PASS | Notification `recipient_id` = Customer UUID |

---

## 9. No Duplicate Ownership Boundaries

| Boundary | Owner | Status |
|---|---|---|
| JWT issuance | rald-api exclusively | ✅ PASS |
| Notification delivery | rald-notify exclusively | ✅ PASS |
| Search indexing | rald-search exclusively | ✅ PASS |
| Customer data | rald monorepo (api-server/api-worker) | ✅ PASS |
| Workspace management | rald-api exclusively | ✅ PASS |

---

## Result: ✅ PASS

All inter-service contracts validated. No duplicate models, IDs, or ownership boundaries.
