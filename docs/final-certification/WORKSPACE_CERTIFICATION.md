# WORKSPACE_CERTIFICATION.md
**Certification Type:** Phase G Final Authorization  
**Scope:** Workspace Management, RBAC, Isolation, Persistence  
**Owner:** LILCKY STUDIO LIMITED  
**Date:** 2026-06-02

---

## 1. WORKSPACE MODEL

Workspaces (also called organisations) are the fundamental multi-tenancy unit. Every data object in the RALD ecosystem belongs to a workspace. Workspace isolation is enforced at the application layer via `workspace_id` on every table and every query.

**Workspace Types:** `personal` · `team` · `business`

---

## 2. CREATION & LIFECYCLE

| Operation | Implementation | Status |
|---|---|---|
| Create workspace | `POST /api/organizations` | ✅ |
| Creator auto-assigned owner | `organization_members` insert on create | ✅ |
| Unique slug enforced | `UNIQUE(slug)` on organizations table | ✅ |
| Soft delete (`deleted_at`) | Column on organizations table | ✅ |
| Name and type required | Validated at route | ✅ |

---

## 3. WORKSPACE SWITCHING

| Criterion | Implementation | Status |
|---|---|---|
| Active workspace in `localStorage("rald_workspace_id")` | Per standard | ✅ |
| Resolution order: URL → localStorage → default → first | WORKSPACE_SWITCHER_STANDARD_v1 §3 | ✅ |
| URL `?workspace_id=` highest priority | Standard §3.1 | ✅ |
| No workspace found → redirect to /workspace/select | Standard §3.5 | ✅ |
| `X-Workspace-ID` header on all API calls | Standard pattern | ✅ |
| JWT claim workspace_id is authoritative on server | Security requirement | ✅ |

---

## 4. MEMBERSHIP & RBAC

| Role | Permissions | Enforced By |
|---|---|---|
| owner | Full control, delete workspace, manage billing | Route-level checks |
| admin | Manage members, settings, data | `adminMiddleware` |
| member | Read + write workspace data | `authMiddleware` |
| viewer | Read-only | Role check in data queries |

| Operation | Status |
|---|---|
| `GET /organizations/:id/members` | ✅ |
| `POST /organizations/:id/members` (invite) | ✅ |
| `DELETE /organizations/:id/members/:userId` | ✅ |
| Role change by owner/admin | ✅ |
| 403 on insufficient role | ✅ |

---

## 5. ISOLATION VERIFICATION

| Service | Isolation Method | Verified |
|---|---|---|
| rald/api-worker | `workspace_id` from JWT; all queries filtered | ✅ |
| loop-crm | `workspace_id` on all crm_* tables | ✅ (Phase D cert) |
| rald-notify | `workspace_id` on all notification_* tables | ✅ (Phase E cert) |
| rald-search | `workspace_id` on all search_index_* tables | ✅ (Phase E cert) |
| rald-inbox | `workspace_id` on all 9 inbox tables | ✅ (Phase F cert) |

**Cross-workspace isolation test: 5/5 BLOCKED** — confirmed in RALD_FOUNDATION_CERTIFICATION_v1.

---

## 6. PERSISTENCE

| Criterion | Status |
|---|---|
| Workspace ID survives browser refresh | ✅ localStorage |
| Workspace ID survives tab close + reopen | ✅ localStorage |
| Default workspace server-stored (`PATCH /api/users/me`) | ✅ |
| URL workspace_id overrides localStorage on arrival | ✅ |

---

## 7. FINDINGS

| ID | Severity | Root Cause | Repo | Service | Evidence | Fix | Effort | Verify |
|---|---|---|---|---|---|---|---|---|
| WS-F01 | LOW | WorkspaceSwitcher UI component not in `@rald/ui` — each product builds its own | All frontend repos | UI layer | No shared component found in rald-design-system or rald-auth-sdk | Build WorkspaceSwitcher as shared component | 1 day | Import from @rald/ui in loop, messenger, rald-app |
| WS-F02 | LOW | `X-Workspace-ID` header contract not formally documented for new product teams | All repos | API contract | No API contract doc found in GitHub | Publish API contract docs to GitHub | 0.5 day | New product team can integrate without asking |
| WS-F03 | INFO | Workspace activity log not yet exposed to members via API | rald/api-worker | api.rald.cloud | No `GET /organizations/:id/audit-log` endpoint confirmed | V2 feature — workspace audit trail | 2 days | `GET /organizations/:id/audit-log` paginates events |

---

## 8. CERTIFICATION RESULT

```
╔═══════════════════════════════════════════════════╗
║  WORKSPACE_CERTIFICATION = PASS                   ║
║  CRITICAL: 0 · HIGH: 0 · MEDIUM: 0 · LOW: 2      ║
║  Full workspace lifecycle verified                ║
║  Isolation confirmed across all 5 services        ║
╚═══════════════════════════════════════════════════╝
```

**Signed: LILCKY STUDIO LIMITED — 2026-06-02**
