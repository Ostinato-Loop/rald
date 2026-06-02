# RALD_WORKSPACE_SWITCHER_STANDARD_v1
**Document Type:** Platform Standard — Canonical  
**Owner:** LILCKY STUDIO LIMITED  
**Ecosystem:** RALD  
**Date:** 2026-06-02  
**Version:** 1.0  
**Classification:** OFFICIAL — SOURCE OF TRUTH

---

## PURPOSE

This document defines the universal workspace switcher for all workspace-scoped RALD products. A workspace represents an organisation, team, or business context. Users may belong to multiple workspaces and switch between them without re-authenticating.

---

## 1. WORKSPACE MODEL

### Core Concepts
- A **workspace** corresponds to an `organizations` row in the RALD database.
- A user may belong to multiple workspaces via `organization_members`.
- Each workspace has an **owner** and optional **admin/member/viewer** members.
- Workspace context is passed to the API via the `X-Workspace-ID` header.

### Workspace Roles
| Role | Permissions |
|---|---|
| `owner` | Full control — delete, transfer, billing |
| `admin` | Manage members, settings, all data |
| `member` | Read + write product data |
| `viewer` | Read-only |

---

## 2. WORKSPACE CONTEXT STANDARD

### 2.1 Active Workspace Storage
```
localStorage key : rald_workspace_id
Value            : UUID (workspace / organization ID)
Scope            : Per product origin
```

### 2.2 API Header
Every authenticated API call to a workspace-scoped endpoint MUST include:
```http
X-Workspace-ID: {workspace_id}
```

### 2.3 Workspace Resolution Order
On product init, the workspace is resolved in this order:
1. `?workspace_id=` URL parameter (highest priority — from product switcher or external link)
2. `localStorage.getItem("rald_workspace_id")` (user's last selection)
3. `user_state.default_workspace_id` (from User State Contract)
4. First workspace in user's membership list (fallback)
5. No workspace → redirect to `app.rald.cloud/workspace-select?redirect_to=...`

---

## 3. SWITCHER COMPONENT SPECIFICATION

### 3.1 Placement
- Top navigation bar, left of the product switcher.
- Shows current workspace avatar, name, and dropdown chevron.

### 3.2 Dropdown Layout

```
┌────────────────────────────────────────┐
│  [Avatar] Acme Corp          ▼         │  ← trigger (current workspace)
└────────────────────────────────────────┘

On click:
┌────────────────────────────────────────┐
│  YOUR WORKSPACES                       │
│  ──────────────────────────────────    │
│  ✓ [🔵] Acme Corp          owner      │  ← active
│    [🟣] Lagos Vendors      member     │
│    [🟠] LILCKY Studio      admin      │
│  ──────────────────────────────────    │
│  + Create new workspace                │
│    Join with invite code               │
└────────────────────────────────────────┘
```

### 3.3 Switching Behaviour
When a user selects a different workspace:
```typescript
async function switchWorkspace(newWorkspaceId: string) {
  // 1. Store new selection
  localStorage.setItem("rald_workspace_id", newWorkspaceId);

  // 2. Persist as default (optional — user preference)
  await PATCH /api/users/me { default_workspace_id: newWorkspaceId };

  // 3. Reload current page with new workspace context
  //    (all components re-fetch data scoped to new workspace)
  window.location.reload();
  // OR: use React context to re-scope all queries without full reload
}
```

### 3.4 Workspace Isolation Guarantee
Every API call from a workspace-scoped product MUST send `X-Workspace-ID`. The API enforces that the user is a member of that workspace on every request. Cross-workspace data leakage is blocked at the API layer.

---

## 4. WORKSPACE CREATION FLOW

```
User clicks "+ Create new workspace"
  │
  ▼
app.rald.cloud/workspace/create (or in-product modal)
  │
  ▼
POST /api/organizations { name, slug, type }
  → creates organization
  → creates owner membership
  → returns { workspace_id, ... }
  │
  ▼
localStorage.setItem("rald_workspace_id", workspace_id)
  │
  ▼
Redirect to product home (workspace already set)
```

---

## 5. INVITE AND MEMBERSHIP FLOW

```
Owner sends invite:
POST /api/organizations/:id/invitations { email, role }
  → creates invitation record
  → sends invite email via notification.rald.cloud

Invitee accepts:
GET /invite?token={invite_token}  (any RALD product or app.rald.cloud)
  │
  ├── logged in → POST /api/organizations/invitations/accept { token }
  │               → creates membership
  │               → redirect to workspace
  │
  └── not logged in → redirect to app.rald.cloud/login
                        ?redirect_to=/invite?token={token}
                        &app_id=rald-app
```

---

## 6. DEFAULT WORKSPACE LOGIC

| Condition | Default Workspace |
|---|---|
| User has `default_workspace_id` set | Use that workspace |
| `default_workspace_id` is null, user has 1 workspace | Use that workspace |
| User has multiple workspaces, no default | Show workspace switcher modal on first visit |
| User has 0 workspaces | Redirect to `app.rald.cloud/workspace-select` |

---

## 7. WORKSPACE SWITCHER STATE SCHEMA

```typescript
interface WorkspaceSwitcherState {
  activeWorkspaceId: string | null;
  workspaces: WorkspaceSummary[];
}

interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  role: "owner" | "admin" | "member" | "viewer";
  memberCount: number;
}
```

### API Endpoint
```http
GET /api/organizations
Authorization: Bearer {token}

200 OK
[
  {
    "id": "uuid",
    "name": "Acme Corp",
    "slug": "acme-corp",
    "avatarUrl": null,
    "role": "owner",
    "memberCount": 5
  },
  ...
]
```

---

## 8. PRODUCTS REQUIRING WORKSPACE CONTEXT

| Product | Workspace Required? |
|---|---|
| loop.rald.cloud | Optional (personal + workspace content) |
| business.rald.cloud | Required |
| messenger.rald.cloud | Required |
| connect.rald.cloud | Required |
| developer.rald.cloud | Required |
| profiles.rald.cloud | Optional |
| app.rald.cloud | Optional |
| admin.rald.cloud | Optional (operator-scoped) |

---

## 9. COMPLIANCE CHECKLIST

- [ ] Workspace stored in `rald_workspace_id` (localStorage)
- [ ] `X-Workspace-ID` header sent on every workspace-scoped API call
- [ ] Workspace resolved in correct priority order (URL param → localStorage → default → first)
- [ ] No workspace → redirect to `app.rald.cloud/workspace-select`
- [ ] Workspace switcher shows all user workspaces with roles
- [ ] Switching workspace updates localStorage and re-scopes all data
- [ ] Workspace switcher imported from `@rald/ui` (not reimplemented per product)
- [ ] Create workspace and join-by-invite flows implemented

---

**Signed: LILCKY STUDIO LIMITED — 2026-06-02**
