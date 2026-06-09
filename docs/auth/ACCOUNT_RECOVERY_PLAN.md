# ACCOUNT_RECOVERY_PLAN.md
**RALD Auth V1 — Account Recovery System**
**Date:** 2026-06-09 | **Authority:** RALD Auth V1 Lockdown Directive
**LILCKY STUDIO LIMITED**

---

## MISSION

Users must never permanently lose their RALD Identity.

A RALD Account is permanent infrastructure — tied to a user's RALD ID, their communities, their reputation, and their history across every RALD product. Loss of access is not acceptable.

---

## CURRENT STATE

| Recovery Method | Implemented | Where |
|---|---|---|
| SMS OTP re-auth | ✅ Yes | `POST /auth/otp/send` + `/auth/otp/verify` |
| Email OTP re-auth | ✅ Yes | `POST /auth/email-otp/send` |
| Password reset | ✅ Yes | `POST /auth/forgot-password` → email link |
| Backup email | ❌ Not built | — |
| Recovery codes | ❌ Not built | — |
| Trusted device bypass | ❌ Not built | — |
| Admin-assisted recovery | ⚠️ Partial | Admin can unsuspend via `/session/suspend` |

---

## RECOVERY HIERARCHY

Recovery methods in order of trust level (highest first):

```
1. Trusted Device              — device previously marked trusted by user
2. Backup Email OTP            — OTP sent to user-registered backup email
3. Original Phone OTP          — OTP sent to phone on file
4. Recovery Code               — pre-generated one-time code
5. Admin-Assisted Recovery     — LILCKY STUDIO LIMITED support, with identity verification
```

A user must succeed at exactly one level to regain access. Higher levels are preferred.

---

## RECOVERY FLOWS

### Flow 1: Phone Number Changed (Primary Identifier Lost)

```
User reports: "I changed my SIM / lost my phone number"

1. User visits profiles.rald.cloud/recover
2. Enters RALD ID (@boyd or rald_xxxxxx) or email
3. System shows masked phone (e.g. +234 *** *** 4521)
4. Options presented:
   a. "I have access to my backup email" → send backup email OTP
   b. "I have a recovery code" → enter 8-word recovery phrase
   c. "I need help" → support ticket with identity verification
5. On success: user can update primary phone and re-verify
6. Audit log: account_recovery_completed, method: backup_email
```

### Flow 2: Email + Password Lost

```
1. User visits /recover
2. Selects "I can't access my email"
3. If phone on file: send SMS OTP to phone
4. On SMS verify: allow email update
5. Audit log: account_recovery_completed, method: sms_otp
```

### Flow 3: Account Locked (Suspended)

```
1. User sees /suspended page (already in rald-auth-ui)
2. System shows reason (if safe to disclose) or generic message
3. Appeal link → POST /auth/appeal { user_id, reason }
4. LILCKY STUDIO LIMITED reviews within 48 hours
5. Admin uses POST /session/suspend { userId, suspended: false } to reinstate
```

### Flow 4: Recovery Code Redemption

```
1. User enters recovery code at /recover/code
2. Server: POST /auth/recover/code { recovery_code, rald_id }
3. Server validates: bcrypt compare against stored hashed code
4. Code is single-use — immediately invalidated
5. User gains temporary 15-minute session to set new phone/email
6. User is prompted to generate new recovery codes immediately
```

---

## RECOVERY CODE SPECIFICATION

### Generation

- Generated at account creation or at user request from Security Center
- Format: 8 words from BIP-39 English wordlist (128-bit entropy)
- Example: `abandon castle forget lemon orbit puzzle salmon tower`
- Quantity: 8 codes generated per batch
- Storage: bcrypt-hashed in `auth_recovery_codes` table
- Display: shown ONCE — never retrievable after initial display

### Schema: `auth_recovery_codes`

```sql
CREATE TABLE auth_recovery_codes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  code_hash   text NOT NULL,          -- bcrypt hash of recovery code
  used_at     timestamptz NULL,       -- null = still valid
  created_at  timestamptz NOT NULL DEFAULT now(),
  batch_id    uuid NOT NULL           -- codes grouped by generation batch
);
CREATE INDEX ON auth_recovery_codes(user_id, used_at);
```

### Rules

- A code can only be used once (`used_at` becomes non-null)
- When all 8 codes in a batch are used, user is prompted to regenerate
- Regenerating codes invalidates ALL existing codes (new batch_id)
- Rate limit: 3 recovery code attempts per hour per user

---

## BACKUP EMAIL SPECIFICATION

### Schema Addition to `auth_users`

```sql
ALTER TABLE auth_users ADD COLUMN backup_email text NULL;
ALTER TABLE auth_users ADD COLUMN backup_email_verified boolean NOT NULL DEFAULT false;
ALTER TABLE auth_users ADD COLUMN backup_email_verified_at timestamptz NULL;
```

### Endpoints

```
POST /auth/backup-email/set      { backup_email }  → sends verification OTP
POST /auth/backup-email/verify   { otp }           → marks verified
POST /auth/backup-email/remove   {}                → removes backup email
GET  /auth/backup-email/status   {}                → returns masked email + verified status
```

---

## TRUSTED DEVICE BYPASS

When a device is marked as trusted (`is_trusted = true` in `auth_devices`):

- User can initiate account recovery from that device without OTP
- Device fingerprint validated server-side (User-Agent + device_id cookie)
- Recovery session issued for 15 minutes — must complete full re-auth after

**Implementation:** Requires device fingerprinting at login (see DEVICE_CENTER_SPEC.md)

---

## ADMIN-ASSISTED RECOVERY

For users who have lost access to all recovery methods:

```
1. User submits support ticket at rald.cloud/support
2. LILCKY STUDIO LIMITED agent verifies identity:
   - Government ID check (name match)
   - Video verification (for high-value accounts)
   - Account creation date + known activity
3. Agent issues forced recovery via admin API:
   POST /auth/admin/recovery { userId, new_phone, reason, agent_id }
4. Full audit trail written
5. User notified via all available channels
6. 24-hour lock on account changes post-recovery (fraud prevention)
```

---

## API ENDPOINTS (TO BUILD)

```
GET  /auth/recovery/options      — returns available recovery methods for a RALD ID
POST /auth/recover/code          — redeem a recovery code
POST /auth/backup-email/set      — register backup email
POST /auth/backup-email/verify   — verify backup email OTP
POST /auth/backup-email/remove   — remove backup email
POST /auth/recovery-codes/generate — generate 8 new recovery codes
GET  /auth/recovery-codes/status — count of remaining valid codes (not the codes themselves)
POST /auth/appeal                — submit suspension appeal
```

---

## IMPLEMENTATION PRIORITY

| Item | Sprint | Effort |
|---|---|---|
| Backup email field + verification | Sprint 3 | 3 days |
| Recovery codes generation + storage | Sprint 3 | 2 days |
| Recovery code redemption endpoint | Sprint 3 | 1 day |
| Recovery UI at profiles.rald.cloud/recover | Sprint 3 | 3 days |
| Trusted device bypass | Sprint 4 | 3 days |
| Admin-assisted recovery flow | Sprint 4 | 2 days |

---

## SUCCESS CRITERIA

- ≥ 99% of users who lose phone access can recover their account within 24 hours
- Zero permanent account losses due to credential loss
- All recovery events fully audited
- Recovery codes shown exactly once, never stored in plaintext

---

*ACCOUNT_RECOVERY_PLAN.md — LILCKY STUDIO LIMITED | 2026-06-09*
