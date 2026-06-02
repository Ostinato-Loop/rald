# RALD_ONBOARDING_STANDARD_v1
**Document Type:** Platform Standard — Canonical  
**Owner:** LILCKY STUDIO LIMITED  
**Ecosystem:** RALD  
**Date:** 2026-06-02  
**Version:** 1.0  
**Classification:** OFFICIAL — SOURCE OF TRUTH

---

## PURPOSE

This document defines the universal onboarding standard for every RALD product. Onboarding decisions are centralised. Products are consumers of onboarding state, not producers.

---

## CORE RULE

> **Only `app.rald.cloud` may determine and execute onboarding.**  
> No other RALD product may present its own onboarding flow, onboarding checks, or onboarding redirects based on local logic.

Any product that violates this rule is non-compliant.

---

## 1. USER STATE CONTRACT

Every authenticated RALD session exposes a **User State Contract** — a structured object products must consume to determine routing. This contract is returned by `GET /api/auth/me` and cached client-side.

### Contract Schema

```typescript
interface RaldUserState {
  // Identity
  id: string;                    // Internal UUID
  raldId: string;                // Permanent RALD-XXXXXXXX handle
  email: string;
  phone: string | null;
  name: string | null;
  role: "user" | "merchant" | "admin" | "operator" | "viewer";

  // Verification
  emailVerified: boolean;
  phoneVerified: boolean;

  // Onboarding — AUTHORITATIVE — set only by api.rald.cloud
  onboarding_complete: boolean;  // true = user may access products
  onboarding_step: OnboardingStep | null;  // current step if incomplete

  // Account Status
  status: "active" | "suspended" | "deleted" | "pending";

  // Workspace Context
  default_workspace_id: string | null;
  workspace_count: number;

  // Products
  active_products: AppId[];      // products the user has access to

  // Timestamps
  createdAt: string;
  lastSeenAt: string;
}

type OnboardingStep =
  | "profile"       // name, avatar
  | "workspace"     // create or join first workspace
  | "product"       // select first product
  | "verification"  // email or phone verification
  | "complete";     // terminal state

type AppId =
  | "rald-app"
  | "rald-profiles"
  | "rald-loop"
  | "rald-business"
  | "rald-messenger"
  | "rald-connect"
  | "rald-developer"
  | "rald-admin";
```

---

## 2. ONBOARDING AUTHORITY

### Who Sets `onboarding_complete`
Only `api.rald.cloud` sets `onboarding_complete`. It is persisted in the `users` table. No product may write or flip this field.

### Who Reads `onboarding_complete`
Every RALD product reads this from the User State Contract via `GET /api/auth/me`. Products MUST NOT compute onboarding completeness independently.

### Onboarding Gateway
`app.rald.cloud/onboarding` is the single onboarding experience for all products. The flow adapts based on `onboarding_step` and `role`.

---

## 3. USER JOURNEYS

### 3.1 First-Time User (new registration)
```
Register at app.rald.cloud/login
  │
  ▼
api.rald.cloud creates user
  onboarding_complete = false
  onboarding_step = "profile"
  │
  ▼
app.rald.cloud/onboarding (step: profile)
  │
  ▼
app.rald.cloud/onboarding (step: workspace)
  │
  ▼
app.rald.cloud/onboarding (step: product)
  │
  ▼
api.rald.cloud sets onboarding_complete = true
  │
  ▼
Redirect to redirect_to (or app.rald.cloud/home)
```

### 3.2 Returning User (onboarding_complete = true)
```
Login at app.rald.cloud/login
  │
  ▼
Token issued → localStorage
  │
  ▼
Redirect to redirect_to or app.rald.cloud/home
  (NO onboarding check needed — contract says complete)
```

### 3.3 Incomplete Registration (onboarding_complete = false)
```
User navigates to any RALD product
  │
  ▼
Product calls GET /api/auth/me
  onboarding_complete = false
  │
  ▼
Product redirects to:
  https://app.rald.cloud/onboarding
    ?redirect_to={encodeURIComponent(currentUrl)}
    &app_id={this_app}
  (Product does NOT render any onboarding UI)
  │
  ▼
app.rald.cloud completes onboarding
  │
  ▼
Redirects back to redirect_to
```

### 3.4 Consumer User (role = "user")
- Onboarding: profile → verify email/phone → complete
- Default product: loop.rald.cloud

### 3.5 Business User (role = "merchant")
- Onboarding: profile → workspace creation → product selection → complete
- Default product: business.rald.cloud

### 3.6 Multi-Workspace User
- Onboarding complete per user (not per workspace).
- Workspace switching is separate (see RALD_WORKSPACE_SWITCHER_STANDARD_v1).

### 3.7 Multi-Product User
- `active_products` in user state contract lists accessible products.
- Onboarding is not repeated per-product.

### 3.8 Suspended User
- `status = "suspended"`
- All products redirect to `app.rald.cloud/suspended`.
- No product presents a local suspended screen.

### 3.9 Deleted User
- `status = "deleted"`
- Token revoked at API.
- All products get 401 → clear token → redirect to `app.rald.cloud/login?error=account_deleted`.

---

## 4. PRODUCT RESPONSIBILITIES

### MUST DO
- Call `GET /api/auth/me` on init and read `onboarding_complete`.
- Redirect to `app.rald.cloud/onboarding` if `onboarding_complete = false`.
- Include `redirect_to` and `app_id` in the redirect.
- Trust the User State Contract unconditionally.

### MUST NOT DO
- Implement a local onboarding form or flow.
- Store `onboarding_complete` in a product-specific key.
- Redirect to onboarding if the user is already there.
- Show partial onboarding UI while the contract says `complete`.
- Block a user with `role`-based onboarding logic not present in the contract.

---

## 5. API CONTRACT

### GET /api/auth/me
**Returns:** Full `RaldUserState` object  
**Auth:** Bearer token (RALD JWT)  
**Frequency:** Once per app init; cached in memory for session lifetime.

```http
GET /api/auth/me
Authorization: Bearer {rald_auth_token}

200 OK
{
  "id": "uuid",
  "raldId": "RALD-A1B2C3D4",
  "email": "user@example.com",
  "name": "Amara Osei",
  "role": "merchant",
  "emailVerified": true,
  "phoneVerified": true,
  "onboarding_complete": true,
  "onboarding_step": null,
  "status": "active",
  "default_workspace_id": "uuid",
  "workspace_count": 2,
  "active_products": ["rald-business", "rald-loop"],
  "createdAt": "2026-05-01T10:00:00Z",
  "lastSeenAt": "2026-06-02T08:30:00Z"
}
```

---

## 6. ONBOARDING LOOP PREVENTION

| Scenario | Prevention |
|---|---|
| User on `/onboarding`, product redirects them there again | `app.rald.cloud` checks: if already on `/onboarding`, do not re-redirect |
| `onboarding_complete` flips back to false erroneously | API guards: only terminal step can set `onboarding_complete = true`; it is never auto-reset |
| Onboarding redirect loop (3+ redirects) | `safeRedirect()` loop counter breaks the cycle; lands at `/error?code=redirect_loop` |
| Product sets `onboarding_complete` locally | Disallowed by standard; API is sole writer |

---

## 7. COMPLIANCE CHECKLIST

- [ ] Product reads `onboarding_complete` from User State Contract, not local state
- [ ] Product redirects to `app.rald.cloud/onboarding` (not a local onboarding route)
- [ ] Product includes `redirect_to` and `app_id` in onboarding redirect
- [ ] Product renders NO onboarding UI of its own
- [ ] Product trusts `onboarding_complete = true` unconditionally
- [ ] Product handles `status = "suspended"` by redirecting to `app.rald.cloud/suspended`
- [ ] Product handles `status = "deleted"` by clearing token and redirecting to login

---

**Signed: LILCKY STUDIO LIMITED — 2026-06-02**
