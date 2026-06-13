# UNIVERSAL USER MODEL
**RALD Ecosystem Finalization Program — Phase 2**
**Date:** 2026-06-13 | **Status:** SPECIFICATION

---

## Mission

Define a single canonical user model that all RALD products reference. No product may maintain its own user table that duplicates identity data. Products own product-specific state (posts, messages, balances) but never own identity.

---

## Canonical User Structure

```
User (auth_users)
├── id                  UUID — primary key, stable forever
├── phone               E.164 format, globally unique
├── email               Optional, globally unique
├── username            @handle, globally unique, URL-safe
├── display_name        Human-readable display name
├── identity_state      See IDENTITY_STATE_MACHINE.md
├── role                user | admin | developer | institution
├── trust_level         none | member | active | contributor | verified | leader
├── trust_score         0–100 integer
├── country             ISO 3166-1 alpha-2
├── language            BCP 47 language tag
├── avatar_url          URL to profile picture
├── bio                 Free text, 256 chars max
├── is_verified         Boolean — government/institutional KYC
├── is_creator          Boolean — content creator status
├── mfa_enabled         Boolean
├── passkeys            Array of registered passkeys
├── created_at          Timestamp
├── updated_at          Timestamp
└── metadata            JSONB — extensible without schema migrations

Organizations (auth_organizations)
├── id                  UUID
├── owner_id            → User.id
├── name                Display name
├── handle              URL-safe identifier
├── type                personal | business | institution | government
├── country             ISO 3166-1 alpha-2
├── verified            Boolean
└── created_at

Teams (auth_teams)
├── id
├── organization_id     → Organization.id
├── name
└── created_at

Memberships (auth_memberships)
├── user_id             → User.id
├── organization_id     → Organization.id
├── team_id             → Team.id (nullable)
├── role                owner | admin | member | viewer
└── joined_at

Permissions (auth_permissions)
├── id
├── membership_id       → Membership
├── resource            string — e.g. "loop:post", "payrald:transfer"
├── action              create | read | update | delete | execute
└── granted_at
```

---

## Product-to-Identity Mapping

Each product has a lightweight profile table that extends the canonical user with product-specific data. The canonical user is never duplicated.

```
Loop (loop.profiles)
├── id → auth_users.id (FK, not a separate user)
├── onboarded         Boolean
├── interests         Text[]
├── state_id          → rald geographic state
├── lga_id            → local government area
├── lcda_id           → LCDA
└── loop_created_at

Messenger (messenger.profiles)
├── id → auth_users.id
├── chat_preferences  JSONB
└── messenger_joined_at

PayRald (payrald.accounts)
├── id → auth_users.id
├── account_number    RALD pay routing number
├── balance           Decimal
├── currency          ISO 4217
└── kyc_level         0 | 1 | 2 | 3

TradeOS (tradeos.merchants)
├── id → auth_users.id
├── business_name
├── merchant_id
└── settlement_account → payrald.accounts.id

GitRald (gitrald.developers)
├── id → auth_users.id
├── developer_tier    free | pro | team | enterprise
└── api_key_count
```

---

## Rules

### Rule 1 — No Duplicate Identity Columns
Products MUST NOT have columns for: username, display_name, phone, email, avatar_url, bio, country, trust_level, trust_score, is_verified.

These columns live ONLY in `auth_users`. Products join to `auth_users` to read them.

### Rule 2 — Foreign Key Discipline
Every product profile table MUST have:
```sql
CONSTRAINT fk_user FOREIGN KEY (id) REFERENCES auth_users(id) ON DELETE CASCADE
```

### Rule 3 — Read via SSO Token
Products receive user identity through the RALD JWT claims (username, display_name, etc.). They MUST NOT query `auth_users` directly in production — use the claims in the token.

### Rule 4 — Writes via Identity API
Profile mutations (username, avatar, bio, country) MUST go through `auth.rald.cloud` or `profiles.rald.cloud`. Products surface the edit UI but POST to the identity API.

### Rule 5 — Sync via Events
When identity data changes (`identity.updated`), products receive the event and update their local cache/view. They do not poll the identity service.

---

## API Surface (Identity Service)

```
GET  /me                     → Full canonical user + product profiles
GET  /user/:id               → Public profile (truncated)
GET  /user/by-username/:u    → Resolve username → user
PUT  /me/profile             → Update display_name, bio, avatar_url, country
PUT  /me/username            → Claim/change username (identity_state checks)
PUT  /me/phone               → Change phone (requires OTP)
PUT  /me/email               → Add/change email (requires OTP)
POST /me/mfa                 → Enable/configure MFA
GET  /me/devices             → List registered devices
GET  /me/sessions            → List active sessions
GET  /me/organizations       → List memberships
POST /organizations          → Create organization
POST /organizations/:id/invite  → Invite member
```

---

## Migration Path for Existing Products

1. **Audit**: List all product tables with identity columns (username, email, etc.)
2. **Backfill**: Ensure `auth_users` has all the data
3. **Migrate reads**: Replace `SELECT username FROM loop_users` with JWT claim or join
4. **Drop columns**: Remove duplicate columns from product tables
5. **Validate**: All product auth flows use RALD JWT, not internal user tables

---

*See also: IDENTITY_STATE_MACHINE.md, ACCOUNT_ARCHITECTURE.md, EVENT_BUS_STANDARD.md*
