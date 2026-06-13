# RALD Identity — User Registration State Machine

**Document:** IDENTITY_STATE_MACHINE.md  
**Status:** Implemented (PENDING→ACTIVE flow live)  
**Owner:** LILCKY STUDIO LIMITED  
**Last Updated:** 2026-06-13

---

## States

```
AVAILABLE
    ↓  POST /auth/register-username  (username reserved, user row created)
USERNAME_RESERVED / PENDING
    ↓  POST /auth/register-username/complete  (OTP verified)
IDENTITY_CREATED / OTP_VERIFIED
    ↓  (auto on complete)
PROFILE_COMPLETED
    ↓  (auto on complete)
ACTIVE
```

---

## State Definitions

| State | Description | username row status | auth_users row |
|-------|-------------|---------------------|----------------|
| `AVAILABLE` | Username free to claim | none | none |
| `PENDING` | Username reserved, OTP not yet verified | `active=false`, `pending_until=now+15min` | exists (unverified) |
| `ACTIVE` | Registration complete, identity live | `active=true` | verified |

---

## Transition Rules

### AVAILABLE → PENDING (`POST /auth/register-username`)

- Username inserted into `usernames` table with `active=false`, `pending_until=NOW()+15min`
- User row created in `auth_users` with `email_verified=false`, `phone_verified=false`
- `rald_internal_id` assigned
- `reserved_email_address = username@rald.me` reserved
- Rate limit: 10 registrations/hour per IP
- Returns `{ pending_user_id, username, rald_internal_id, reserved_mail }`

### PENDING → ACTIVE (`POST /auth/register-username/complete`)

- OTP verified (SMS via Termii or email via Resend)
- Username `active` flag set to `true`
- `auth_user_profiles` created (P1 fix — always created on completion)
- `auth_trust_profiles` created (P1 fix)
- All 8 ecosystem profiles provisioned (P2 fix):
  - `loop_profiles`
  - `messenger_profiles`
  - `mail_profiles` (alias `username@rald.me`)
  - `workspace_profiles`
  - `notification_profiles`
  - `search_index` (discovery)
  - `trust_profiles`
  - `auth_product_access` (loop provisioned)
- Welcome email sent via Resend
- HttpOnly session cookie issued (`rald_session`, 30 days)
- JWT issued with `{ id, email, role, username, via:"register-username" }`

### PENDING → AVAILABLE (username release)

**Trigger A — Cleanup job (hourly cron):**
- Any `usernames` row with `active=false` AND `pending_until < NOW()` is deleted
- Corresponding `auth_users` row with `email_verified=false AND phone_verified=false` and no active session is deleted
- Configured via `pending_until` column (default: 15 minutes)

**Trigger B — Registration failure:**
- If `/complete` fails (OTP mismatch, DB error), username is immediately released:
  ```sql
  DELETE FROM usernames WHERE username = $1 AND active = false;
  ```

---

## Rules

1. **Username is permanent only at ACTIVE** — a PENDING username expires after 15 minutes
2. **Existing users cannot create duplicate PENDING reservations** — availability check queries both `usernames (active=true)` and `auth_users (ilike username)`
3. **Reservation expiration is configurable** — change `pending_until` TTL in `register-username.ts`
4. **No orphan reservations** — cleanup job runs every hour, releases all expired PENDING usernames
5. **Loop-claim users bypass OTP** — `POST /auth/loop-claim` creates ACTIVE identity immediately (username verification deferred async)
6. **OTP brute-force protection** — 5 attempts per 15-minute window per user

---

## Loop Identity Shortcut

Loop users enter via `POST /auth/loop-claim` which creates an ACTIVE identity in one step without OTP. The identity is marked `needs_verification: true` to prompt async verification inside the Loop app. This is intentional — loop entry must be frictionless.

```
POST /auth/loop-claim  { username, display_name?, region?, country? }
  ↓
  → Creates ACTIVE identity immediately
  → Issues 30-day JWT
  → Sets rald_session HttpOnly cookie
  → needs_verification: true  (prompts in-app banner)
```

---

## Cleanup Schedule

Defined in `wrangler.toml [triggers]`:
- `"0 * * * *"` — hourly: expired OTPs + expired PENDING sessions
- `"0 0 * * *"` — daily: orphaned devices + rotation alerts + health snapshot

**Cleanup logic:** `rald-auth-core/src/jobs/cleanup.ts`

---

## Audit Log

| Date | Change |
|------|--------|
| 2026-06-13 | Full state machine documented |
| 2026-06-12 | P2: username PENDING→ACTIVE only after OTP verified |
| 2026-06-11 | P1: auth_user_profiles + auth_trust_profiles auto-created on completion |

