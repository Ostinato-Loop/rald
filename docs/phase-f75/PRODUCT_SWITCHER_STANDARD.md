# PRODUCT_SWITCHER_STANDARD.md
**Document Type:** Phase F.75 Certification  
**Owner:** LILCKY STUDIO LIMITED  
**Ecosystem:** RALD  
**Date:** 2026-06-02  
**Version:** 1.0

---

## PURPOSE

Design and certify the Universal Product Switcher. This document is the implementation specification. The authoritative standard is RALD_PRODUCT_SWITCHER_STANDARD_v1.md.

---

## REQUIREMENTS

| Requirement | Status |
|---|---|
| Visible in every RALD product | REQUIRED |
| Shows only products user has access to | REQUIRED |
| Uses SSO handoff for navigation (no re-auth) | REQUIRED |
| Tracks recent products | REQUIRED |
| Supports pinned products | REQUIRED |
| Role-aware (hides admin products from non-admins) | REQUIRED |
| Workspace-aware (passes workspace_id to workspace-scoped products) | REQUIRED |
| Sourced from shared `@rald/ui` component | REQUIRED |

---

## PRODUCT REGISTRY

| app_id | Name | Domain | Roles Allowed | Workspace-Scoped |
|---|---|---|---|---|
| `rald-app` | Platform Home | app.rald.cloud | all | no |
| `rald-profiles` | Profiles | profiles.rald.cloud | all | no |
| `rald-loop` | Loop | loop.rald.cloud | user, merchant | optional |
| `rald-business` | Loop Business | business.rald.cloud | merchant | yes |
| `rald-messenger` | Messenger | messenger.rald.cloud | user, merchant | yes |
| `rald-connect` | Connect | connect.rald.cloud | merchant | yes |
| `rald-developer` | Developer | developer.rald.cloud | all | yes |
| `rald-admin` | Control Center | admin.rald.cloud | admin, operator | no |

---

## COMPONENT API

```tsx
// @rald/ui — ProductSwitcher

interface ProductSwitcherProps {
  currentAppId: AppId;
  userState: RaldUserState;           // from auth context
  workspaceId?: string | null;        // current workspace
  onNavigate?: (appId: AppId) => void; // optional override
}

export function ProductSwitcher(props: ProductSwitcherProps): JSX.Element;
```

### Internal Logic
```typescript
function getVisibleProducts(userState: RaldUserState): ProductConfig[] {
  return PRODUCT_REGISTRY.filter(p => {
    // Role gate
    if (p.rolesAllowed !== "all" && !p.rolesAllowed.includes(userState.role)) {
      return false;
    }
    // Active products gate (once active_products is in user state)
    if (userState.active_products && userState.active_products.length > 0) {
      return userState.active_products.includes(p.appId) || p.appId === "rald-app";
    }
    return true;
  });
}
```

---

## STATE MANAGEMENT

```typescript
// localStorage keys (shared across all products on same origin)
const PINNED_PRODUCTS_KEY  = "rald_pinned_products";  // JSON: AppId[]
const RECENT_PRODUCTS_KEY  = "rald_recent_products";  // JSON: AppId[], max 5
const LAST_PRODUCT_KEY     = "rald_last_product";     // string: AppId

// Call on every product visit
function recordProductVisit(appId: AppId): void {
  const recent = JSON.parse(localStorage.getItem(RECENT_PRODUCTS_KEY) ?? "[]") as AppId[];
  const updated = [appId, ...recent.filter(id => id !== appId)].slice(0, 5);
  localStorage.setItem(RECENT_PRODUCTS_KEY, JSON.stringify(updated));
  localStorage.setItem(LAST_PRODUCT_KEY, appId);
}

function togglePin(appId: AppId): void {
  const pinned = JSON.parse(localStorage.getItem(PINNED_PRODUCTS_KEY) ?? "[]") as AppId[];
  const updated = pinned.includes(appId)
    ? pinned.filter(id => id !== appId)
    : [...pinned, appId].slice(0, 6);
  localStorage.setItem(PINNED_PRODUCTS_KEY, JSON.stringify(updated));
}
```

---

## NAVIGATION IMPLEMENTATION

```typescript
function navigateToProduct(
  config: ProductConfig,
  currentToken: string | null,
  currentWorkspaceId: string | null
): void {
  let destination = `https://${config.domain}/`;
  if (config.workspaceScoped && currentWorkspaceId) {
    destination += `?workspace_id=${currentWorkspaceId}`;
  }

  recordProductVisit(config.appId);

  if (currentToken) {
    window.location.href =
      `https://app.rald.cloud/sso/handoff` +
      `?token=${encodeURIComponent(currentToken)}` +
      `&destination=${encodeURIComponent(destination)}` +
      `&app_id=${config.appId}`;
  } else {
    window.location.href =
      `https://app.rald.cloud/login` +
      `?redirect_to=${encodeURIComponent(destination)}` +
      `&app_id=${config.appId}`;
  }
}
```

---

## VISUAL SPECIFICATION

### Desktop
- **Placement:** Left sidebar, below RALD logo. Fixed, always visible.
- **Trigger:** Click to open a floating panel (right of sidebar).
- **Width:** 280px
- **Sections:** Pinned → Recent → All Products

### Mobile
- **Placement:** Bottom navigation bar, rightmost item (grid icon).
- **Trigger:** Tap to open full-screen sheet from bottom.

### Product Card (48×48px grid item)
```
┌─────────┐
│  [Icon] │
│ Product │
│  Name   │
└─────────┘
```
- Active product: accent border + filled background
- Pinned: pin icon in top-right corner
- Coming soon: greyed out with "Soon" badge

---

## CERTIFICATION RESULT

```
╔═══════════════════════════════════════════════════╗
║  PRODUCT_SWITCHER_STANDARD = CERTIFIED            ║
║  Design: COMPLETE                                 ║
║  Implementation: REQUIRED before product launch   ║
║  Shared component: @rald/ui — REQUIRED            ║
╚═══════════════════════════════════════════════════╝
```

**Signed: LILCKY STUDIO LIMITED — 2026-06-02**
