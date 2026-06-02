# RALD_PRODUCT_SWITCHER_STANDARD_v1
**Document Type:** Platform Standard — Canonical  
**Owner:** LILCKY STUDIO LIMITED  
**Ecosystem:** RALD  
**Date:** 2026-06-02  
**Version:** 1.0  
**Classification:** OFFICIAL — SOURCE OF TRUTH

---

## PURPOSE

This document defines the universal product switcher that appears in every RALD product. It is the primary navigation surface for moving between RALD products without re-authentication.

---

## 1. PRODUCT REGISTRY

| app_id | Display Name | Domain | Icon | Role Gate |
|---|---|---|---|---|
| `rald-app` | Platform Home | app.rald.cloud | 🏠 | all |
| `rald-loop` | Loop | loop.rald.cloud | 🎙️ | user, merchant |
| `rald-business` | Loop Business | business.rald.cloud | 🏢 | merchant |
| `rald-messenger` | Messenger | messenger.rald.cloud | 💬 | user, merchant |
| `rald-connect` | Connect | connect.rald.cloud | 🔗 | merchant |
| `rald-developer` | Developer | developer.rald.cloud | ⚙️ | all |
| `rald-profiles` | Profiles | profiles.rald.cloud | 👤 | all |
| `rald-admin` | Control Center | admin.rald.cloud | 🔐 | admin, operator |

---

## 2. SWITCHER BEHAVIOUR

### 2.1 Visibility Rules
- Always visible in the top navigation bar of every RALD product.
- Displays only products available to the current user (`active_products` from User State Contract).
- Admin-only products are hidden from non-admin users.

### 2.2 Product Navigation (SSO Handoff)
When a user selects a product:
```typescript
function navigateToProduct(targetAppId: AppId, targetDomain: string, currentPath = "/") {
  const token = localStorage.getItem("rald_auth_token");
  const destination = `https://${targetDomain}${currentPath}`;

  if (token) {
    // SSO handoff via app.rald.cloud
    window.location.href =
      `https://app.rald.cloud/sso/handoff` +
      `?token=${encodeURIComponent(token)}` +
      `&destination=${encodeURIComponent(destination)}` +
      `&app_id=${CURRENT_APP_ID}`;
  } else {
    // No token — go to login with post-auth destination
    window.location.href =
      `https://app.rald.cloud/login` +
      `?redirect_to=${encodeURIComponent(destination)}` +
      `&app_id=${CURRENT_APP_ID}`;
  }
}
```

### 2.3 State Tracking
The switcher MUST track and display:
- **Current product** — highlighted/active state
- **Last used product** — stored in `localStorage("rald_last_product")`
- **Pinned products** — stored in `localStorage("rald_pinned_products")` (JSON array of app_ids)
- **Recent products** — stored in `localStorage("rald_recent_products")` (JSON array, max 5, most recent first)

---

## 3. COMPONENT SPECIFICATION

### 3.1 Trigger
- **Desktop:** Persistent product grid icon in the left sidebar or top nav.
- **Mobile:** Bottom navigation bar item or hamburger menu entry.
- **Keyboard shortcut:** `Cmd+K` / `Ctrl+K` (future V2).

### 3.2 Panel Layout

```
┌─────────────────────────────────────┐
│  RALD Products            [×]       │
├─────────────────────────────────────┤
│  📌 PINNED                          │
│  ┌──────────┐  ┌──────────┐        │
│  │  🏢      │  │  💬      │        │
│  │ Business │  │Messenger │        │
│  └──────────┘  └──────────┘        │
├─────────────────────────────────────┤
│  🕐 RECENT                          │
│  ┌──────────┐  ┌──────────┐        │
│  │  🔗      │  │  ⚙️      │        │
│  │ Connect  │  │Developer │        │
│  └──────────┘  └──────────┘        │
├─────────────────────────────────────┤
│  ALL PRODUCTS                       │
│  ┌──────────┐  ┌──────────┐        │
│  │  🏠      │  │  🎙️      │        │
│  │  Home    │  │  Loop    │        │
│  └──────────┘  └──────────┘        │
│  ┌──────────┐  ┌──────────┐        │
│  │  👤      │  │  🔐      │        │
│  │ Profiles │  │  Admin   │ (role) │
│  └──────────┘  └──────────┘        │
└─────────────────────────────────────┘
```

### 3.3 Product Card
Each product card displays:
- Product icon
- Product name
- Status badge (Live, Beta, Coming Soon)
- Active indicator (current product)

### 3.4 Role Awareness
Products not in `active_products` are either:
- Hidden (if completely inaccessible to the user's role)
- Shown with "Coming Soon" or "Upgrade" badge (if role-upgradeable)

### 3.5 Workspace Awareness
If the target product is workspace-scoped:
- The switcher appends `?workspace_id={current_workspace_id}` to the destination URL.
- If no current workspace, it omits the workspace_id (target product will handle workspace selection).

---

## 4. STATE SCHEMA

```typescript
interface ProductSwitcherState {
  currentProductId: AppId;
  pinnedProducts: AppId[];       // max 6, user-ordered
  recentProducts: AppId[];       // max 5, auto-managed (most recent first)
  lastUsedProduct: AppId | null;
}

// localStorage keys
const PINNED_KEY    = "rald_pinned_products";   // JSON: AppId[]
const RECENT_KEY    = "rald_recent_products";   // JSON: AppId[]
const LAST_KEY      = "rald_last_product";      // string: AppId
```

### State Update on Navigation
```typescript
function recordProductVisit(appId: AppId) {
  // Update recent
  const recent: AppId[] = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
  const updated = [appId, ...recent.filter(id => id !== appId)].slice(0, 5);
  localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  // Update last
  localStorage.setItem(LAST_KEY, appId);
}
```

---

## 5. SHARED COMPONENT

The product switcher MUST be implemented as a shared component consumable by all RALD products. It is distributed via the RALD shared SDK / component library (`@rald/ui`).

```tsx
// Usage in any RALD product
import { ProductSwitcher } from "@rald/ui";

<ProductSwitcher
  currentAppId="rald-business"
  userState={userState}           // RaldUserState from auth context
  workspaceId={currentWorkspaceId}
/>
```

---

## 6. COMPLIANCE CHECKLIST

- [ ] Product switcher visible in every top-level layout
- [ ] Uses SSO handoff for cross-product navigation (no bare URL links)
- [ ] Filters products by `active_products` from User State Contract
- [ ] Hides admin/operator products from non-admin users
- [ ] Tracks recent products in `rald_recent_products` (localStorage)
- [ ] Tracks pinned products in `rald_pinned_products` (localStorage)
- [ ] Passes `workspace_id` to workspace-scoped product destinations
- [ ] Shows current product in active/highlighted state
- [ ] Imported from `@rald/ui` shared component (not reimplemented per product)

---

**Signed: LILCKY STUDIO LIMITED — 2026-06-02**
