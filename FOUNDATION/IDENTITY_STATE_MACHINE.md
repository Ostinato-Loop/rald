# IDENTITY STATE MACHINE
**RALD Ecosystem Finalization Program — Phase 1**
**Date:** 2026-06-13 | **Status:** SPECIFICATION

---

## Mission

Define the canonical state machine governing every RALD identity from first contact to permanently active. No user record, username, or session may exist outside these defined states. All products and services that touch identity must honour this machine.

---

## States

```
AVAILABLE
    ↓  (username check passes)
USERNAME_RESERVED
    ↓  (OTP sent / registration initiated)
PENDING_VERIFICATION
    ↓  (OTP verified)
OTP_VERIFIED
    ↓  (profile fields set)
PROFILE_COMPLETED
    ↓  (final activation)
ACTIVE
    ↓  (voluntary or admin)
SUSPENDED
    ↓  (voluntary deletion)
DELETED
```

### State Descriptions

| State | Description | TTL |
|-------|-------------|-----|
| `AVAILABLE` | Username does not exist or has been released | — |
| `USERNAME_RESERVED` | Username claimed in-flight; identity record created, unverified | 15 min (configurable) |
| `PENDING_VERIFICATION` | OTP dispatched; awaiting user entry | 10 min |
| `OTP_VERIFIED` | Phone/email confirmed; profile not yet complete | 30 min |
| `PROFILE_COMPLETED` | All required fields supplied; awaiting activation | 24 hr |
| `ACTIVE` | Fully operational identity | — |
| `SUSPENDED` | Temporarily blocked; sessions revoked; username held | — |
| `DELETED` | Soft-deleted; all PII scrubbed; username released after 30 days |

---

## Transitions

### AVAILABLE → USERNAME_RESERVED
**Trigger:** `POST /auth/register/start { username, country }`
**Guard:** Username passes regex, not reserved word, not taken
**Action:**
- Create `auth_users` row with `identity_state = USERNAME_RESERVED`
- Set `username_reservation_expires_at = NOW() + 15min`
- Return `{ pending_user_id, reservation_token }`

### USERNAME_RESERVED → PENDING_VERIFICATION
**Trigger:** `POST /auth/register/verify-contact { pending_user_id, phone|email }`
**Guard:** Reservation has not expired; contact not already used
**Action:**
- Dispatch OTP
- Set `identity_state = PENDING_VERIFICATION`
- Set `otp_expires_at = NOW() + 10min`

### PENDING_VERIFICATION → OTP_VERIFIED
**Trigger:** `POST /auth/register/confirm-otp { pending_user_id, code }`
**Guard:** OTP matches and not expired
**Action:**
- Set `identity_state = OTP_VERIFIED`
- Issue `registration_jwt` (15 min, scoped to complete profile only)

### OTP_VERIFIED → PROFILE_COMPLETED
**Trigger:** `POST /auth/register/complete-profile { name, ... }`
**Guard:** Valid `registration_jwt`; required fields present
**Action:**
- Set `identity_state = PROFILE_COMPLETED`

### PROFILE_COMPLETED → ACTIVE
**Trigger:** Automatic on profile completion (or manual admin activation for special cases)
**Action:**
- Set `identity_state = ACTIVE`
- Issue full RALD master JWT
- Emit `user.created` event
- Emit `identity.updated` event

### ACTIVE → SUSPENDED
**Trigger:** Admin `POST /session/suspend` or automated fraud detection
**Action:**
- Set `identity_state = SUSPENDED`
- Revoke all KV sessions
- Emit `session.suspended` event

### SUSPENDED → ACTIVE
**Trigger:** Admin `POST /session/unsuspend`
**Action:**
- Restore `identity_state = ACTIVE`
- Emit `session.unsuspended` event

### ANY → DELETED
**Trigger:** `DELETE /identity` (user) or admin hard-delete
**Action:**
- Soft-delete; scrub PII fields after 30-day grace
- Release username after 30-day grace (set to `AVAILABLE`)
- Emit `user.deleted` event

---

## Expiry & Cleanup Rules

### Username Reservation Expiry
- Cron job runs every 5 minutes
- Query: `WHERE identity_state = 'USERNAME_RESERVED' AND username_reservation_expires_at < NOW()`
- Action: Set `identity_state = DELETED` (immediate); username returns to `AVAILABLE`

### OTP Expiry
- Cron job runs every 5 minutes
- Query: `WHERE identity_state = 'PENDING_VERIFICATION' AND otp_expires_at < NOW()`
- Action: Set `identity_state = AVAILABLE` (reset); username released

### Partial Profile Expiry
- Cron job runs hourly
- Query: `WHERE identity_state IN ('OTP_VERIFIED','PROFILE_COMPLETED') AND updated_at < NOW() - 24hr`
- Action: Set `identity_state = AVAILABLE`; username released

---

## Database Schema Changes Required

```sql
-- Add to auth_users table
ALTER TABLE auth_users
  ADD COLUMN identity_state TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK (identity_state IN (
      'USERNAME_RESERVED','PENDING_VERIFICATION','OTP_VERIFIED',
      'PROFILE_COMPLETED','ACTIVE','SUSPENDED','DELETED'
    )),
  ADD COLUMN username_reservation_expires_at TIMESTAMPTZ,
  ADD COLUMN otp_expires_at TIMESTAMPTZ;

-- Index for cleanup cron
CREATE INDEX idx_auth_users_state_expiry
  ON auth_users (identity_state, username_reservation_expires_at)
  WHERE identity_state IN ('USERNAME_RESERVED','PENDING_VERIFICATION');

-- Migration: set all existing users to ACTIVE
UPDATE auth_users SET identity_state = 'ACTIVE' WHERE identity_state IS NULL OR identity_state = '';
```

---

## Implementation Files (rald-auth-core)

| File | Change |
|------|--------|
| `src/routes/auth.ts` | Add `identity_state` checks to login; block `SUSPENDED`/`DELETED` |
| `src/routes/sso.ts` | Guard `/sso/exchange`: only `ACTIVE` identities get SSO tokens |
| `src/lib/session.ts` | Add `getUserIdentityState(userId)` helper |
| `src/cron/cleanup.ts` | New file: expired reservation cleanup job |
| `migrations/add_identity_state.sql` | Schema migration |

---

## Event Emissions

| Transition | Event |
|-----------|-------|
| → ACTIVE (new) | `user.created` |
| → ACTIVE (restore) | `session.unsuspended` |
| → SUSPENDED | `session.suspended` |
| → DELETED | `user.deleted` |
| Profile updated | `identity.updated` |
| Username claimed | `username.claimed` |

---

*See also: UNIVERSAL_USER_MODEL.md, EVENT_BUS_STANDARD.md*
