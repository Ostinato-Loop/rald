# CONSENT_CENTER_SPEC.md
**RALD Auth V1 — Consent & Notification Management**
**Date:** 2026-06-09 | **Authority:** RALD Auth V1 Lockdown Directive
**LILCKY STUDIO LIMITED**

---

## MISSION

Users must be in full control of every communication channel the RALD ecosystem uses to reach them. Consent is stored once, honored everywhere.

---

## CURRENT STATE

Consent preferences partially exist in `auth_users.metadata` as `marketing_emails`, `profile_visible`, `activity_tracking` flags. No dedicated consent table. No UI. No per-product granularity.

---

## CONSENT MODEL

### Schema: `auth_consent_preferences`

```sql
CREATE TABLE auth_consent_preferences (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE UNIQUE,
  
  -- Notifications
  email_transactional     boolean NOT NULL DEFAULT true,   -- OTP, password reset (cannot opt out)
  email_product_updates   boolean NOT NULL DEFAULT true,   -- new features, changelog
  email_marketing         boolean NOT NULL DEFAULT false,  -- promotions, offers
  sms_transactional       boolean NOT NULL DEFAULT true,   -- OTP (cannot opt out)
  sms_marketing           boolean NOT NULL DEFAULT false,  -- promotions
  push_all                boolean NOT NULL DEFAULT true,   -- master push toggle
  push_room_invites       boolean NOT NULL DEFAULT true,   -- Loop room invitations
  push_messages           boolean NOT NULL DEFAULT true,   -- new messages
  push_mentions           boolean NOT NULL DEFAULT true,   -- @mentions in rooms/chats
  push_community_updates  boolean NOT NULL DEFAULT true,   -- community announcements
  push_marketing          boolean NOT NULL DEFAULT false,  -- promotional pushes

  -- Privacy
  profile_discoverable    boolean NOT NULL DEFAULT true,   -- appear in search results
  activity_visible        boolean NOT NULL DEFAULT true,   -- show "Active now" status
  read_receipts           boolean NOT NULL DEFAULT true,   -- show message read status
  activity_tracking       boolean NOT NULL DEFAULT true,   -- analytics + recommendations

  -- Personalization
  recommendations_enabled boolean NOT NULL DEFAULT true,   -- algorithmic recommendations
  
  -- Legal
  terms_accepted_at       timestamptz NULL,
  privacy_accepted_at     timestamptz NULL,
  marketing_consent_at    timestamptz NULL,
  marketing_consent_ip    text NULL,

  updated_at              timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ON auth_consent_preferences(user_id);
```

---

## CONSENT CATEGORIES

### 1. Transactional (Cannot be disabled)
- SMS OTP — required for authentication
- Email OTP — required for account recovery
- Security alerts — required for account safety
- *UI: shown as locked/greyed, with explanation why they're required*

### 2. Product Notifications (On by default, can opt out)
- Product updates and new features
- Room invitations from connections
- New messages and @mentions
- Community announcements

### 3. Personalization (On by default, can opt out)
- Algorithmic recommendations (who to follow, rooms to join)
- Activity tracking for recommendations
- "Active now" status visible to others
- Read receipts in Messenger

### 4. Marketing (Off by default, opt-in)
- Promotional emails
- SMS marketing
- Promotional push notifications

---

## ENDPOINTS

```
GET   /consent              — returns all consent preferences for authenticated user
PATCH /consent              — update one or more preferences
POST  /consent/marketing    — explicit opt-in to marketing (requires IP logging)
DELETE /consent/marketing   — opt out of all marketing communications
GET   /consent/history      — audit log of consent changes (last 100)
```

### PATCH /consent request

```json
{
  "email_marketing": false,
  "push_room_invites": true,
  "activity_visible": false,
  "recommendations_enabled": true
}
```

Every PATCH writes to `audit_logs`:
```
action: "privacy_permissions_updated"
metadata: { changed: ["email_marketing", "activity_visible"], previous_values: {...} }
```

---

## PER-PRODUCT CONSENT LAYER

Each product can declare its own notification types. The master consent at RALD Auth overrides all. If `push_all = false`, no product may send push notifications — regardless of product-level settings.

```
RALD Auth consent  →  overrides  →  product-level settings
(master switch)                     (product-specific prefs)
```

This is identical to how iOS notification settings work: system Settings → Notifications → [App] are overridden by the top-level "Allow Notifications" toggle.

---

## UI SPECIFICATION (`profiles.rald.cloud` → Privacy tab)

Already scaffolded as "privacy" tab in Dashboard.tsx.

```
┌─────────────────────────────────────────────────┐
│  NOTIFICATION PREFERENCES                       │
│                                                 │
│  Messages & Mentions                            │
│  Push when someone messages or mentions you     │
│  [●══════] On                                   │
│                                                 │
│  Room Invitations                               │
│  Push when invited to a Loop room               │
│  [●══════] On                                   │
│                                                 │
│  Product Updates                                │
│  Email about new features                       │
│  [●══════] On                                   │
│                                                 │
│  Marketing                                      │
│  Promotional offers and campaigns               │
│  [○══════] Off                                  │
│                                                 │
├─────────────────────────────────────────────────┤
│  PRIVACY                                        │
│                                                 │
│  Appear in search results                       │
│  [●══════] On                                   │
│                                                 │
│  Show "Active now" status                       │
│  [●══════] On                                   │
│                                                 │
│  Show read receipts                             │
│  [●══════] On                                   │
│                                                 │
│  Personalized recommendations                   │
│  [●══════] On                                   │
└─────────────────────────────────────────────────┘
```

---

## IMPLEMENTATION NOTES

- `email_transactional` and `sms_transactional` are shown in the UI but cannot be toggled (greyed out with a lock icon and explanation: "Required for authentication and security alerts")
- Marketing opt-in requires explicit double-confirmation (not just a toggle flip) to comply with Nigerian Data Protection Act (NDPA) and GDPR principles
- `marketing_consent_ip` stored for legal compliance
- Consent history retained for 7 years per NDPA requirements
- Preferences are returned in every `/profiles/me` response under `preferences` key so all apps can read them without a separate API call

---

## CROSS-APP HONOR CONTRACT

Any RALD product that sends notifications MUST:

1. Fetch user consent from RALD Auth before sending: `GET /consent` with user's Bearer token
2. Check the relevant flag before sending (e.g. `push_room_invites` before sending Loop room invite push)
3. Never send if `push_all = false`
4. Never send marketing if `email_marketing = false` / `sms_marketing = false` / `push_marketing = false`

No product may maintain its own "unsubscribe" list that conflicts with RALD Auth consent.

---

## IMPLEMENTATION PRIORITY

| Item | Sprint | Effort |
|---|---|---|
| Create `auth_consent_preferences` table (migration) | Sprint 2 | 0.5 day |
| `GET /consent` + `PATCH /consent` endpoints | Sprint 2 | 1 day |
| Consent UI in Dashboard Privacy tab | Sprint 2 | 2 days |
| Marketing opt-in double-confirm flow | Sprint 3 | 1 day |
| Consent check in Loop push notifications | Sprint 3 | 1 day |
| Consent check in Messenger push notifications | Sprint 3 | 1 day |

---

*CONSENT_CENTER_SPEC.md — LILCKY STUDIO LIMITED | 2026-06-09*
