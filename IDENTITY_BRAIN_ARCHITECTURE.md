# IDENTITY BRAIN ARCHITECTURE
**Generated:** 2026-06-12  
**Authority:** Phase 4 — Principal Platform Architect  
**Status:** Identity Brain IS BUILT — this document is the canonical spec  
**Location:** `rald-auth-core` (auth.rald.cloud)  
**Classification:** OFFICIAL — SOURCE OF TRUTH

---

## MISSION

The RALD Identity Brain is the single source of truth for everything RALD knows about a user. No product may store independent identity state. Every product queries Identity Brain before asking a user for any information.

**Core rule: NEVER ASK THE USER TWICE.**

---

## CURRENT IMPLEMENTATION STATUS

The Identity Brain is implemented inside `rald-auth-core` v2.8.0. All routes are live at `auth.rald.cloud`.

### Implemented Components

| Component | Namespace | Table | Status |
|---|---|---|---|
| Capability Snapshot | `/identity/intelligence` | `identity_capabilities` | ✅ Live |
| Memory Engine | `/identity/memory` | `identity_memory` | ✅ Live |
| Profile Store | `/profiles/*` | `auth_user_profiles` | ✅ Live |
| Username Registry | `/username/*` | `username_registry` | ✅ Live |
| Trust Engine | `/trust/*` | `trust_scores` | ✅ Live |
| Permission Engine | `/permissions/*` | `permissions` | ✅ Live |
| Country Registry | `/country/*` | (via rald-config) | ✅ Live |
| Device Memory | `/devices/*` | `auth_devices` | ✅ Live |
| Verification Engine | `/verification-engine/*` | `verifications` | ✅ Live |
| Developer Platform | `/developer/*` | `developer_profiles` | ✅ Live |
| Machine Identities | `/machine/*` | `machine_identities` | ⚠️ Schema ready, keys not provisioned |

---

## IDENTITY BRAIN API SURFACE

### Core Intelligence Query

```
GET /identity/intelligence
Authorization: Bearer <rald_jwt>

Response: {
  // What RALD already has — TRUE means "don't ask user"
  username:              boolean,
  username_verified:     boolean,
  email:                 boolean,
  email_verified:        boolean,
  phone:                 boolean,
  phone_verified:        boolean,
  profile_photo:         boolean,
  country:               boolean,
  state:                 boolean,
  city:                  boolean,
  language:              boolean,
  
  // Trust and verification
  trust_level:           "none" | "basic" | "verified" | "trusted" | "civic" | "creator" | "business",
  creator_verified:      boolean,
  business_verified:     boolean,
  civic_verified:        boolean,
  
  // RALD Mail
  mail_reserved:         boolean,
  mail_address:          "username@rald.me" | null,
  
  // Onboarding
  completed_onboarding:  boolean
}
```

**Every product MUST call this endpoint before showing any onboarding step or data-collection prompt.**

### Memory Engine

```
GET /identity/memory
POST /identity/memory/dismiss  { prompt_id: string }
POST /identity/memory/step     { step: string, product: string }
```

### Capability Update

```
POST /identity/intelligence
{ field: "country", value: "NG" }
{ field: "language", value: "en" }
{ field: "profile_photo", value: "https://..." }
```

---

## DATABASE SCHEMA

### identity_capabilities (PRIMARY TABLE)

```sql
CREATE TABLE identity_capabilities (
  user_id            UUID PRIMARY KEY REFERENCES auth_users(id),
  username           TEXT,
  username_verified  BOOLEAN NOT NULL DEFAULT false,
  email              TEXT,
  email_verified     BOOLEAN NOT NULL DEFAULT false,
  phone              TEXT,
  phone_verified     BOOLEAN NOT NULL DEFAULT false,
  profile_photo      TEXT,
  country            TEXT,
  state              TEXT,
  city               TEXT,
  language           TEXT,
  timezone           TEXT,
  trust_level        TEXT NOT NULL DEFAULT 'none',
  creator_verified   BOOLEAN NOT NULL DEFAULT false,
  business_verified  BOOLEAN NOT NULL DEFAULT false,
  civic_verified     BOOLEAN NOT NULL DEFAULT false,
  mail_reserved      TEXT,
  completed_onboarding BOOLEAN NOT NULL DEFAULT false,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### identity_memory (ONBOARDING HISTORY)

```sql
CREATE TABLE identity_memory (
  user_id               UUID PRIMARY KEY REFERENCES auth_users(id),
  last_onboarding_step  TEXT,
  dismissed_prompts     JSONB NOT NULL DEFAULT '[]',
  verification_history  JSONB NOT NULL DEFAULT '[]',
  product_history       JSONB NOT NULL DEFAULT '[]',
  preferences           JSONB NOT NULL DEFAULT '{}',
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## PRODUCT INTEGRATION PROTOCOL

Every product that integrates with the RALD Identity Brain MUST follow this protocol:

### Step 1 — Authenticate via RALD SSO

```javascript
// App receives RALD token (via SSO redirect or handoff)
// Exchange token with RALD auth:
const { token, user } = await fetch("https://auth.rald.cloud/sso/exchange", {
  method: "POST",
  body: JSON.stringify({ rald_token: urlParams.get("rald_token"), app_id: "my-product" })
});
```

### Step 2 — Provision App (Silent)

```javascript
// Silently provision the user into this product
await fetch("https://auth.rald.cloud/provision/app", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: JSON.stringify({ app_id: "my-product" })
});
// Returns immediately. User is NEVER redirected to onboarding.
```

### Step 3 — Query Identity Brain Before Any Prompt

```javascript
const intelligence = await fetch("https://auth.rald.cloud/identity/intelligence", {
  headers: { Authorization: `Bearer ${token}` }
}).then(r => r.json());

// Only ask user for data that RALD doesn't already have:
if (!intelligence.country) {
  showCountryPicker(); // Ask once
  await updateCapability("country", selectedCountry);
} else {
  useKnownCountry(intelligence.country); // Use existing
}

if (!intelligence.username) {
  showUsernamePrompt(); // Ask once
} // else: username already exists, never ask again
```

### Step 4 — Store New Data Back to Identity Brain

```javascript
// After collecting data once, store permanently
await fetch("https://auth.rald.cloud/identity/intelligence", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: JSON.stringify({ field: "country", value: "NG" })
});
```

---

## PRODUCTS AND THEIR IDENTITY BRAIN INTEGRATION STATUS

| Product | SSO | Provision | Query Intelligence | Status |
|---|---|---|---|---|
| Loop (loop.rald.cloud) | ✅ | ✅ | ✅ (use-progressive-identity.ts) | ✅ Integrated |
| Messenger (messenger.rald.cloud) | ✅ | ✅ | ⚠️ Partial | 🟡 Partial |
| App Shell (app.rald.cloud) | ✅ | ✅ | ✅ | ✅ Integrated |
| Dev Console (console.rald.cloud) | ✅ | ✅ | ⚠️ Partial | 🟡 Partial |
| Control Center (admin.rald.cloud) | ✅ | ✅ | N/A (admin) | ✅ Integrated |

---

## PHASE 4 IMPLEMENTATION TASKS

### Task 4.1 — Add `/identity-brain` Namespace Alias
Add alias routes in `rald-auth-core/src/index.ts` so products can also call `/identity-brain/*` (maps to existing `/identity/*`). Backward-compatible.

```typescript
// In src/index.ts — add alias
app.route("/identity-brain", identityRoutes); // alias of /identity
```

### Task 4.2 — Sync identity_capabilities on Every Write
Any time a product stores data (email, phone, country, avatar) it should update `identity_capabilities`. Currently this sync happens at user creation. Add a trigger/webhook for profile updates.

### Task 4.3 — Messenger Intelligence Integration
Audit `messenger` frontend: confirm it calls `GET /identity/intelligence` before showing any profile prompt. If not, add the call.

### Task 4.4 — Universal Identity SDK
Create `rald-sdk-auth/src/identity-brain.ts` — a thin client wrapper that any RALD product can import:

```typescript
export class IdentityBrain {
  async getIntelligence(token: string): Promise<Intelligence> { ... }
  async updateCapability(token: string, field: string, value: unknown): Promise<void> { ... }
  async dismissPrompt(token: string, promptId: string): Promise<void> { ... }
}
```

---

## NEVER ASK TWICE — ENFORCEMENT CHECKLIST

Before any product shows a data-collection prompt, it MUST:

- [ ] Call `GET /identity/intelligence` with the user's RALD JWT
- [ ] Check the relevant boolean flag (`username`, `email`, `country`, etc.)
- [ ] If `true` → use the existing value, never show the prompt
- [ ] If `false` → show the prompt ONCE
- [ ] After collection → call `POST /identity/intelligence` to store permanently
- [ ] After storage → the flag becomes `true` ecosystem-wide

---

*Document generated by Principal Platform Architect · RALD Platform Engineering · LILCKY STUDIO LIMITED · 2026-06-12*
