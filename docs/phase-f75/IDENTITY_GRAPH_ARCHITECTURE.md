# IDENTITY_GRAPH_ARCHITECTURE.md
**Document Type:** Phase F.75 — Architecture Design  
**Owner:** LILCKY STUDIO LIMITED  
**Ecosystem:** RALD  
**Date:** 2026-06-02  
**Version:** 1.0

---

## PURPOSE

Document the complete identity graph for the RALD ecosystem — the entities, their relationships, and how they flow across products.

---

## ENTITY MAP

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        RALD IDENTITY GRAPH                              │
│                                                                         │
│         ┌──────────┐                                                    │
│         │   USER   │ ← core identity anchor                            │
│         │ (users)  │                                                    │
│         └────┬─────┘                                                    │
│              │                                                          │
│    ┌─────────┼──────────────────────────────────┐                      │
│    │         │                │                 │                      │
│    ▼         ▼                ▼                 ▼                      │
│ DEVICE   SESSION          WORKSPACE         VERIFICATION               │
│(devices) (sessions)    (organizations)    (verifications)              │
│    │         │                │                                        │
│    │         │    ┌───────────┼──────────────────┐                    │
│    │         │    │           │                  │                    │
│    │         │    ▼           ▼                  ▼                    │
│    │         │ MEMBER      INVITE           WORKSPACE_ROLE            │
│    │         │ (org_mbrs)  (invitations)    (rbac)                    │
│    │         │    │                                                    │
│    │         │    └──────────►──────────────────────────────┐         │
│    │         │                                              │         │
│    │         │    ┌──────────────────────┐                 │         │
│    │         │    │   PRODUCTS           │                 │         │
│    │         │    │                      │                 │         │
│    │         │    │  loop.rald.cloud     │                 │         │
│    │         │    │  business.rald.cloud │◄────────────────┘         │
│    │         │    │  messenger.rald.cloud│                            │
│    │         │    │  connect.rald.cloud  │                            │
│    │         │    │  developer.rald.cloud│                            │
│    │         │    └──────────────────────┘                            │
│    │         │                                                         │
│    │    ┌────▼──────────┐                                             │
│    │    │  API_KEY      │ ← developer auth alternative                │
│    │    │ (api_keys)    │                                             │
│    │    └───────────────┘                                             │
│    │                                                                   │
│    └──────────────────────────────────────────────────────────────────┘
│                                                                         │
│    CUSTOMER GRAPH (CRM layer — scoped to workspace)                    │
│    ┌──────────────────────────────────────────────┐                    │
│    │  CUSTOMER (customers)                        │                    │
│    │    ├── CONTACT_POINTS (email, phone, ext_id) │                    │
│    │    ├── ACTIVITIES (customer_activities)      │                    │
│    │    ├── NOTES (customer_notes)                │                    │
│    │    ├── TAGS (customer_tags)                  │                    │
│    │    └── SEGMENTS (customer_segments)          │                    │
│    └──────────────────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## ENTITY SPECIFICATIONS

### USER
The root identity entity. One user per unique person.

```typescript
interface User {
  id: string;               // UUID — internal primary key
  rald_id: string;          // RALD-XXXXXXXX — permanent public handle
  email: string;            // Primary email (unique)
  phone: string | null;     // Primary phone (unique if set)
  name: string | null;
  role: UserRole;           // "user" | "merchant" | "admin" | "operator" | "viewer"
  password_hash: string | null;    // PBKDF2 hashed
  email_verified: boolean;
  phone_verified: boolean;
  onboarding_complete: boolean;
  onboarding_step: string | null;
  status: "active" | "suspended" | "deleted" | "pending";
  default_workspace_id: string | null;
  created_at: timestamp;
  updated_at: timestamp;
  deleted_at: timestamp | null;    // soft delete
}
```

---

### DEVICE
A user's authenticated device (future entity — not yet implemented in V1).

```typescript
interface Device {
  id: string;               // UUID
  user_id: string;          // FK → users.id
  device_fingerprint: string;
  device_name: string | null;       // "iPhone 15 Pro"
  os: string | null;                // "iOS 17.4"
  browser: string | null;           // "Safari 17"
  trusted: boolean;                 // user-approved trusted device
  last_seen_at: timestamp;
  created_at: timestamp;
  revoked_at: timestamp | null;
}
```

---

### SESSION
A user's active auth token.

```typescript
interface Session {
  id: string;               // UUID
  user_id: string;          // FK → users.id
  token_hash: string;       // SHA-256 of JWT
  user_agent: string | null;
  ip_address: string | null;
  created_at: timestamp;
  last_seen_at: timestamp;
  revoked_at: timestamp | null;     // null = active
}
```

---

### WORKSPACE (Organization)
A team, business, or project context. The multi-tenancy boundary.

```typescript
interface Organization {
  id: string;               // UUID
  name: string;
  slug: string;             // URL-safe unique identifier
  type: "personal" | "team" | "business";
  owner_id: string;         // FK → users.id
  plan: string;             // "free" | "starter" | "pro" | "enterprise"
  avatar_url: string | null;
  created_at: timestamp;
  deleted_at: timestamp | null;
}
```

---

### MEMBER (Organization Membership)
The link between a user and a workspace.

```typescript
interface OrganizationMember {
  id: string;
  organization_id: string;  // FK → organizations.id
  user_id: string;          // FK → users.id
  role: "owner" | "admin" | "member" | "viewer";
  invited_by: string | null; // FK → users.id
  joined_at: timestamp;
  removed_at: timestamp | null;
}
```

---

### INVITATION
Pending workspace membership invitation.

```typescript
interface Invitation {
  id: string;
  organization_id: string;
  email: string;            // invitee email
  role: "admin" | "member" | "viewer";
  invited_by: string;       // FK → users.id
  token: string;            // UUID v4 (sent in email link)
  accepted_at: timestamp | null;
  expires_at: timestamp;
  created_at: timestamp;
}
```

---

### VERIFICATION
Identity verification events and status.

```typescript
interface Verification {
  id: string;
  user_id: string;          // FK → users.id
  type: "email" | "phone" | "business" | "identity";
  status: "pending" | "verified" | "failed" | "expired";
  provider: string;         // "resend" | "termii" | "manual"
  verified_at: timestamp | null;
  created_at: timestamp;
  expires_at: timestamp | null;
}
```

---

### API_KEY
Developer authentication credential.

```typescript
interface ApiKey {
  id: string;
  user_id: string;          // FK → users.id
  name: string;             // human-readable label
  key_hash: string;         // SHA-256 — never store raw key
  prefix: string;           // "rk_" — shown to user for identification
  scopes: string[];         // e.g. ["read:customers", "write:notifications"]
  environment: "live" | "test";
  last_used_at: timestamp | null;
  revoked_at: timestamp | null;
  created_at: timestamp;
}
```

---

### CUSTOMER (CRM Identity)
A workspace's customer — separate from RALD User identity.

```typescript
interface Customer {
  id: string;
  workspace_id: string;     // FK → organizations.id (multi-tenant)
  rald_user_id: string | null; // FK → users.id (if customer is also a RALD user)
  email: string | null;
  phone: string | null;
  external_id: string | null;   // your system's ID
  name: string | null;
  status: "active" | "inactive" | "blocked";
  merged_into: string | null;   // FK → customers.id (merge engine)
  created_at: timestamp;
  deleted_at: timestamp | null;
}
```

---

## RELATIONSHIP GRAPH

```
users (1) ──────────────────── (N) sessions
users (1) ──────────────────── (N) api_keys
users (1) ──────────────────── (N) verifications
users (1) ──────────────────── (N) organization_members
users (1) ──────────────────── (N) invitations (sent)
users (1) ──────────────────── (1) organizations (as owner)

organizations (1) ────────────── (N) organization_members
organizations (1) ────────────── (N) invitations
organizations (1) ────────────── (N) customers

customers (1) ─────────────────── (N) customer_activities
customers (1) ─────────────────── (N) customer_notes
customers (N) ─────────────────── (N) customer_tags (via junction)
customers (N) ─────────────────── (N) customer_segments (via junction)
customers (0..1) ─────────────── (0..1) users (rald_user_id — optional link)
```

---

## PRODUCT IDENTITY EXTENSIONS

Each product extends the core identity graph with product-specific entities:

| Product | Extension |
|---|---|
| loop.rald.cloud | `loop_profiles`, `follows`, `posts`, `rooms` |
| business.rald.cloud | `storefronts`, `products`, `orders`, `inventory` |
| messenger.rald.cloud | `conversations`, `messages`, `participants` |
| connect.rald.cloud | `connections`, `integrations`, `webhooks` |
| developer.rald.cloud | Extends `api_keys` + `deployments`, `logs` |

All product extensions inherit `workspace_id` for multi-tenant isolation.

---

## IDENTITY RESOLUTION RULES

| Scenario | Rule |
|---|---|
| Same email, different accounts | Merge candidates — `customers.merged_into` engine |
| RALD user is also a customer | Link via `customers.rald_user_id` |
| Deleted RALD user, active customer | Customer record preserved; `rald_user_id` nulled |
| Customer created before RALD signup | Linked retrospectively on signup via email/phone match |

---

**Signed: LILCKY STUDIO LIMITED — 2026-06-02**
