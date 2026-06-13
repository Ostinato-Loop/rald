# RALD — Universal User Registry

**Document:** UNIVERSAL_USER_REGISTRY.md  
**Status:** Architecture defined — product isolation enforced  
**Owner:** LILCKY STUDIO LIMITED  
**Last Updated:** 2026-06-13

---

## Principle

**RALD owns identity. Products do not.**

There is exactly one user in the ecosystem. All products consume identity from RALD Identity — they do not create their own user records.

---

## Canonical User Structure

```
User (auth_users — owned by auth.rald.cloud)
  │
  ├── Organizations (auth_organizations)
  │     └── Teams (auth_teams)
  │           └── Roles (auth_roles)
  │                 └── Permissions (auth_permissions)
  │
  ├── Product Access (auth_product_access)
  │     └── { product: "loop" | "messenger" | "payrald" | ... , role, granted_at }
  │
  ├── Trust Profile (auth_trust_profiles)
  │     └── { trust_level, trust_score, has_username, has_verified_phone, ... }
  │
  └── Ecosystem Profiles (provisioned on registration)
        ├── loop_profiles
        ├── messenger_profiles
        ├── mail_profiles
        ├── workspace_profiles
        └── [product]_profiles  (read-only for identity fields)
```

---

## Products

Each product **consumes** identity via the RALD Auth SDK or direct calls to `auth.rald.cloud`. No product creates its own user registration flow.

| Product | Identity Source | Product-Specific Data |
|---------|----------------|----------------------|
| Loop | `auth.rald.cloud` → `loop_profiles` | Bio, avatar, following, rooms |
| Messenger | `auth.rald.cloud` → `messenger_profiles` | Conversations, contacts |
| PayRald | `auth.rald.cloud` → `payrald_profiles` | KYC, bank details, wallet |
| TradeOS / DunaRald | `auth.rald.cloud` → `trade_profiles` | Business details, warehouse |
| GitRald | `auth.rald.cloud` → `gitrald_profiles` | Repos, SSH keys |
| RALD Mail | `auth.rald.cloud` → `mail_profiles` | Mailbox (`username@rald.me`) |
| RALD TV | `auth.rald.cloud` → `tv_profiles` | Watch history, subscriptions |

---

## No Duplicate Registration

Products **must not** implement their own registration pages or user creation flows. Any attempt to create a user at the product level must redirect to `profiles.rald.cloud`.

**Enforcement mechanism:**
- `auth_product_access` table: product access is granted by `auth.rald.cloud` only
- Product workers call `GET /profiles/me` with the user's JWT to retrieve identity
- Products receive a **scoped JWT** (`aud: "loop"`) — they cannot issue ecosystem-wide tokens

---

## Provisioning

When a user completes registration at `profiles.rald.cloud`, all 8 core ecosystem profiles are provisioned automatically (fire-and-forget):

```typescript
// rald-auth-core/src/routes/register-username.ts
await provisionAllEcosystemProfiles(db, userId, username, displayName);
```

This creates rows in `loop_profiles`, `messenger_profiles`, `mail_profiles`, `workspace_profiles`, `notification_profiles`, `auth_trust_profiles`, search index, and `auth_product_access`.

---

## Identity Lookup API

Products retrieve canonical identity via:

```
GET  https://auth.rald.cloud/profiles/me
     Authorization: Bearer <product_scoped_jwt>
     → { id, username, name, email, phone, role, avatar_url, trust_level, ... }

GET  https://auth.rald.cloud/identity/:username
     → Public identity card (username, display_name, trust_level, verified)
```

---

## Implementation Status

| Item | Status |
|------|--------|
| Single `auth_users` canonical table | ✅ |
| `auth_product_access` table | ✅ |
| Ecosystem profile provisioning on registration | ✅ (P2 fix) |
| No product-level user creation | ✅ (products use SSO) |
| Organization / Team model | ⚠️ Schema exists — UI not complete |
| Role engine (`/roles/*`) | ✅ |
| Permissions engine (`/permissions/*`) | ✅ |

---

## Audit Log

| Date | Change |
|------|--------|
| 2026-06-13 | Universal registry documented |
| 2026-06-12 | Ecosystem profile provisioning enforced on registration |

