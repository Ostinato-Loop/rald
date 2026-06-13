# ALIA CONSENT ENGINE
**RALD Ecosystem Finalization Program — Phase 8**
**Date:** 2026-06-13 | **Status:** SPECIFICATION

---

## Mission

No RALD system — not even ALIA — acts on a user's data without explicit, auditable consent. The Consent Engine is the single authority for all consent grants across the ecosystem. Products and AI agents check it before accessing any user data.

---

## Consent Model

```
Consent Grant
├── user_id       → WHO granted consent
├── app_id        → WHICH application received consent
├── scopes        → WHAT data/capabilities are granted
├── purpose       → WHY the grant exists (human-readable)
├── granted_at    → WHEN consent was given
├── expires_at    → WHEN consent expires (null = perpetual until revoked)
├── granted_by    → "user" | "admin" | "implicit"
└── revoked_at    → IF/WHEN revoked (null = active)
```

---

## Consent Scopes

### Identity Scopes
```
rald:identity:read        → Read user's public identity (username, display_name)
rald:identity:private     → Read private fields (phone, email) — requires explicit confirmation
rald:identity:write       → Write profile fields on behalf of user
rald:identity:delete      → Delete user's account (only user themselves)
```

### AI / ALIA Scopes
```
alia:chat               → Basic ALIA conversation
alia:context:profile    → ALIA can read user profile for personalisation
alia:context:location   → ALIA can access user's country/region
alia:context:history    → ALIA can read conversation history
alia:context:activity   → ALIA can read cross-product activity (Loop, PayRald)
alia:action:post        → ALIA can post to Loop on user's behalf
alia:action:pay         → ALIA can initiate payments (requires trust_score ≥ 50)
alia:action:search      → ALIA can perform external web searches
alia:action:notify      → ALIA can send notifications to user
alia:deep               → Deep research mode (requires trust_score ≥ 50)
```

### Product Scopes
```
loop:read               → Read user's Loop content
loop:write              → Post to Loop on behalf of user
loop:notifications      → Send Loop push notifications
messenger:read          → Read message threads
messenger:write         → Send messages on behalf of user
payrald:balance         → Read PayRald balance
payrald:transfer        → Initiate transfers (requires explicit confirmation)
```

### Developer Scopes
```
developer:api:read      → Read-only API access
developer:api:write     → Write API access
developer:webhooks      → Register and receive webhooks
developer:sandbox       → Sandbox environment access
```

---

## Consent Flows

### User → App (OAuth-style)
```
App requests scopes → User sees consent screen → User grants/denies
  → Consent stored in auth_consent_grants
  → App receives access token with granted scopes
  → app_id embedded in RALD JWT
```

### Implicit Consent (First-party RALD products)
```
RALD products (Loop, Messenger, PayRald) receive implicit consent
for their base scopes automatically on account creation.
User can review and revoke at profiles.rald.cloud/privacy.
```

### ALIA Context Consent
```
ALIA shows a one-time "To help you better, ALIA can..." prompt
before accessing profile, location, or activity context.
User approves → alia:context:* scopes granted.
User can revoke at profiles.rald.cloud/privacy > ALIA Settings.
```

---

## Database Schema

```sql
CREATE TABLE auth_consent_grants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  app_id        TEXT NOT NULL,
  scopes        TEXT[] NOT NULL,
  purpose       TEXT,
  granted_by    TEXT NOT NULL CHECK (granted_by IN ('user','admin','implicit')),
  granted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ,
  revoked_at    TIMESTAMPTZ,
  metadata      JSONB
);

CREATE INDEX idx_consent_user_app ON auth_consent_grants (user_id, app_id)
  WHERE revoked_at IS NULL;
```

---

## Consent API

```
GET  /consent/grants              → List user's active consent grants
GET  /consent/grants/:app_id      → Get grants for specific app
POST /consent/grant               → Grant new scopes
DELETE /consent/grants/:app_id    → Revoke all grants for app
DELETE /consent/grants/:app_id/:scope → Revoke specific scope
GET  /consent/audit-log           → Full history of consent changes
```

---

## Checking Consent (Internal)

All RALD workers that access user data on behalf of an app MUST call:

```typescript
async function checkConsent(
  userId: string,
  appId: string,
  requiredScopes: string[],
  env: Env
): Promise<ConsentCheckResult> {
  const grants = await getActiveGrants(userId, appId, env);
  const grantedScopes = new Set(grants.flatMap(g => g.scopes));
  
  const missing = requiredScopes.filter(s => !grantedScopes.has(s));
  
  return {
    granted: missing.length === 0,
    missing_scopes: missing,
    grants,
  };
}
```

If `granted: false`, the request MUST be rejected with:
```json
{ "error": "consent_required", "missing_scopes": [...], "consent_url": "https://profiles.rald.cloud/consent?app_id=...&scopes=..." }
```

---

## GDPR / NDPR Compliance

| Requirement | Implementation |
|------------|----------------|
| Right to access | `GET /consent/audit-log` exports all grants |
| Right to erasure | `DELETE /consent/grants/*` + `user.deleted` event |
| Data minimisation | Scopes enforce purpose limitation |
| Consent withdrawal | Revocation immediately propagated via event |
| Audit trail | All consent changes logged with IP, user-agent, timestamp |
| Portability | `GET /consent/export` returns machine-readable JSON |

---

## User-Facing Consent Dashboard (profiles.rald.cloud/privacy)

```
Privacy Dashboard
├── What ALIA knows about you
│   ├── Profile data (view / revoke)
│   ├── Location data (view / revoke)
│   └── Activity data (view / revoke)
├── Connected Apps
│   ├── [App name] — granted [scopes] on [date]
│   └── Revoke button per app
├── Data Exports
│   └── Download all your RALD data
└── Account Deletion
    └── Request deletion (30-day grace period)
```

---

*See also: ALIA_TRUST_ENGINE.md, ALIA_ROUTING_ENGINE.md, INSTITUTION_READINESS.md*
