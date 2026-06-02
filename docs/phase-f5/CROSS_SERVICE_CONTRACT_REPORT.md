# CROSS-SERVICE CONTRACT REPORT
**Phase:** F.5 — Stabilization  
**Owner:** LILCKY STUDIO LIMITED  
**Date:** 2026-06-02  
**Result:** ✅ PASS

## Contract Test Matrix

| Integration | Contract | Result |
|---|---|---|
| Identity → Workspace | JWT payload `id` + `role` used in workspace queries | ✅ PASS |
| Workspace → Customer Graph | `workspace_id` FK on all customer tables | ✅ PASS |
| Customer Graph → Inbox | `customer_id` on `conversations` maps to `customers.id` | ✅ PASS |
| Inbox → Notifications | Email/push via `POST https://notification.rald.cloud/api/notifications` | ✅ PASS |
| Inbox → Search | FTS via `rald-search` + local `search_vector` for subject | ✅ PASS |
| Inbox → Audit | All 22 action types logged to `inbox_audit_log` | ✅ PASS |
| Search → Audit | Every search query logged in `search_audit_log` | ✅ PASS |
| Notifications → Audit | Every notification logged in `notification_audit_log` | ✅ PASS |

## No Duplicate Models Confirmed

| Model | Single Owner | Status |
|---|---|---|
| Users | rald-api | ✅ |
| Workspaces | rald-api | ✅ |
| Customers | rald monorepo | ✅ |
| Notifications | rald-notify | ✅ |
| Search | rald-search | ✅ |
| Conversations | rald-inbox | ✅ |
| Messages | rald-inbox | ✅ |

**Result: ✅ PASS — All cross-service contracts validated.**
