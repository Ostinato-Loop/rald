# ACCOUNT ARCHITECTURE
**RALD Ecosystem Finalization Program — Phase 3**
**Date:** 2026-06-13 | **Status:** SPECIFICATION

---

## Mission

Define RALD Account — the Google Account equivalent for the RALD ecosystem. One account. Every product. Managed at `profiles.rald.cloud` (canonical domain: `accounts.rald.cloud`).

---

## What RALD Account Owns

```
RALD Account (profiles.rald.cloud)
├── Identity
│   ├── Username (@handle)
│   ├── Display Name
│   ├── Phone Number (primary credential)
│   ├── Email Address
│   ├── Avatar & Profile Photo
│   ├── Bio
│   ├── Country & Region
│   └── Language
│
├── Security
│   ├── Passkeys (WebAuthn)
│   ├── MFA (TOTP / SMS backup)
│   ├── Trusted Devices
│   ├── Active Sessions
│   ├── Recovery Options
│   └── Login History
│
├── Trust & Verification
│   ├── Trust Score (0–100)
│   ├── Trust Level (Member → Trusted Leader)
│   ├── Government ID Verification
│   ├── Business Verification
│   └── Creator Status
│
├── Consent
│   ├── Per-product Data Access Grants
│   ├── Third-party App Authorizations
│   ├── Marketing Preferences
│   └── Data Export / Deletion Rights
│
├── Developer
│   ├── API Keys
│   ├── OAuth Applications
│   ├── Webhooks
│   └── Sandbox Access
│
├── Organizations
│   ├── Personal Organizations
│   ├── Business Organizations
│   ├── Team Memberships
│   └── Role Management
│
└── Ecosystem Access
    ├── Linked Products (Loop, Messenger, PayRald, ...)
    ├── SSO Sessions
    ├── Cross-product Permissions
    └── Notification Preferences
```

---

## What Products Own

Products own ONLY product-specific state:

| Product | Owns |
|---------|------|
| Loop | Posts, Rooms, Communities, Feed preferences |
| Messenger | Message threads, Contact lists, Chat settings |
| PayRald | Account balance, Transaction history, Settlement settings |
| TradeOS | Merchant listings, Orders, Inventory |
| GitRald | Repositories, Issues, Pull requests |
| RALD Mail | Inbox, Compose drafts, Folder structure |

Products do NOT own: username, phone, email, avatar, bio, trust, verification status, sessions, devices, consent, organizations.

---

## Domain Architecture

```
accounts.rald.cloud (canonical)
  └── alias: profiles.rald.cloud (current, kept for compatibility)

auth.rald.cloud (API layer — never accessed directly by users)
  ├── /auth/*        OTP, MFA, passkeys, sessions
  ├── /sso/*         Cross-product token exchange
  ├── /session/*     Session management, revocation
  └── /identity/*    Profile CRUD, username management
```

---

## Account Dashboard Routes

```
/                    → Overview (trust score, activity, linked products)
/account             → Profile editing (name, username, avatar, bio, country)
/security            → Devices, sessions, MFA, passkeys, login history
/privacy             → Consent grants, data exports, deletion
/developer           → API keys, OAuth apps, webhooks
/organizations       → Org management, team roles
/ecosystem           → Linked products, SSO connections
/notifications       → Cross-product notification preferences
```

---

## SSO Architecture (One Account, Many Products)

```
User opens Loop
  → Not authenticated → redirect to profiles.rald.cloud/login?app_id=loop&redirect_to=...
  → Authenticates (phone OTP or passkey)
  → auth.rald.cloud issues master JWT (1 hour)
  → POST /sso/exchange { appId: "loop" } → app-scoped JWT
  → Loop receives rald_token → exchanges for loop_session cookie
  → User is IN Loop. No second login. No second registration.

User navigates to Messenger from Loop
  → POST /api/auth/rald-sso/handoff { app_id: "messenger" }
  → 5-minute handoff_token issued
  → Redirect to chat.rald.cloud?rald_token=<handoff>
  → Messenger exchanges token → messenger_session cookie
  → User is IN Messenger. Zero friction.

User returns to Loop after 2 days (cookie still valid)
  → GET /api/auth/silent → loop_session cookie → fresh token
  → Feed opens. Zero friction.
```

---

## Product Onboarding via RALD Account

When a user first enters a product via SSO:

1. Product calls `POST /api/auth/rald-sso { rald_token }`
2. Worker receives verified JWT with user claims
3. Worker calls `upsertProfile()` — creates product row if absent
4. Product row auto-populated with:
   - `id` (from JWT)
   - `display_name` (from JWT name claim)
   - `username` (from JWT username claim, if set)
   - `onboarded: true` (no onboarding gate)
5. User enters product immediately

No "complete your profile" screen. No "choose a username" screen. No "verify your email" screen. Account is already complete.

---

## Account Settings Separation

| Setting | Owned By | Edited At |
|---------|----------|-----------|
| Username | RALD Account | profiles.rald.cloud |
| Display Name | RALD Account | profiles.rald.cloud |
| Phone | RALD Account | profiles.rald.cloud |
| Email | RALD Account | profiles.rald.cloud |
| Avatar | RALD Account | profiles.rald.cloud |
| Loop notification preferences | Loop | loop.rald.cloud/settings |
| PayRald settlement account | PayRald | pay.rald.cloud/settings |
| Messenger message retention | Messenger | chat.rald.cloud/settings |

Products surface a "Manage your RALD Account" link that deep-links to the relevant profiles.rald.cloud section via cross-app SSO handoff.

---

## Security Requirements

- All account mutations require re-authentication (fresh OTP or passkey challenge)
- Session management shows real device names, locations, and last-active times
- "Sign out all other devices" terminates all KV sessions except current
- Account deletion: 30-day grace period, PII scrubbed, username released

---

*See also: IDENTITY_STATE_MACHINE.md, UNIVERSAL_USER_MODEL.md*
