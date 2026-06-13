# ALIA_IDENTITY_STATE_MACHINE.md
# RALD ALIA — Identity State Machine
**Version:** 1.0 — Phase 2 Governance
**Date:** 2026-06-13

---

## THE PROBLEM

`profiles.rald.cloud` allows usernames to be reserved during registration, but abandoned registrations hold usernames indefinitely. A user who starts registration but never completes it locks a username permanently.

This is a systemic governance failure. The state machine below prevents it.

---

## IDENTITY STATE DIAGRAM

```
                    ┌──────────────┐
                    │  AVAILABLE   │ ← Initial state for all alias slots
                    └──────┬───────┘
                           │ Registration begins
                           │ (30 minute claim TTL created)
                           ▼
                    ┌──────────────┐
                    │   PENDING    │ ← Username claimed, registration in progress
                    └──────┬───────┘
          ┌────────────────┼────────────────────────────┐
          │                │                            │
          │ timeout or     │ Email/phone verified        │
          │ explicit       │                            │
          │ abandon        ▼                            │
          │        ┌──────────────┐                     │
          │        │   VERIFIED   │                     │
          │        └──────┬───────┘                     │
          │               │ Profile complete             │
          │               │                             │
          │               ▼                             │
          ▼        ┌──────────────┐                     │
    AVAILABLE      │    ACTIVE    │ ←←←←←←←←←←←←←←←←←┘
    (released)     └──────┬───────┘ (trust signal: account_created)
                          │
           ┌──────────────┼──────────────────┐
           │              │                  │
           │ KYC tier 2+  │                  │ Suspicious
           ▼              │ Fraud /          │ activity
    ┌──────────────┐      │ Compliance       ▼
    │   TRUSTED    │      │          ┌──────────────┐
    └──────┬───────┘      │          │  SUSPENDED   │
           │              │          └──────┬───────┘
           └──────────────┼─────────────────┤
                          │                 │ Review complete:
                          │                 │ cleared → ACTIVE
                          │                 │ not cleared → ARCHIVED
                          │                 ▼
                          │         ┌──────────────┐
                          └────────►│   ARCHIVED   │ ← Terminal. Non-reversible.
                                    └──────────────┘
```

---

## STATES DEFINED

### AVAILABLE
The default state of every alias slot.

- Username/email/phone has no claim
- No database record exists for this alias
- First-come-first-served when registration begins

**Entry condition:** System start or release of PENDING/SUSPENDED claim
**Transitions out:** → PENDING (user begins registration)

---

### PENDING
Username is claimed by a user beginning registration. This is a temporary lock.

- `aliases` row created with `status = 'pending'`
- `registry` record created with `identity_status = 'pending'`
- A 30-minute TTL is set: `pending_expires_at = NOW() + INTERVAL '30 minutes'`
- Kafka event: `identity.registration_started`

**TTL enforcement:** A background job runs every 5 minutes:
```sql
UPDATE aliases SET status = 'available', deleted_at = NOW()
WHERE status = 'pending' AND pending_expires_at < NOW();
```

If TTL expires: alias returns to AVAILABLE, registry record is deleted or archived.

**Entry condition:** User initiates registration
**Transitions out:**
- → VERIFIED (email/phone OTP verified)
- → AVAILABLE (TTL expired or user abandoned)

---

### VERIFIED
Email or phone has been verified. The user's claim is confirmed but the account is not yet fully active.

- `users.status = 'verified'`
- `registry.identity_status = 'verified'`
- `registry.verification_status = 'tier_1'`
- Kafka event: `identity.email_verified`

The TTL is extended: verified accounts have 7 days to complete profile setup before returning to PENDING (extended timeout). After 7 days of inactivity they revert to AVAILABLE.

**Entry condition:** Successful OTP verification
**Transitions out:**
- → ACTIVE (profile completion, any additional required fields submitted)
- → PENDING (if 7-day extension expires without completion — rare, logged)

---

### ACTIVE
Fully registered identity. Normal network access.

- `users.status = 'active'`
- `registry.identity_status = 'active'`
- `registry.routing_status = 'not_configured'` (until first bank link)
- Kafka event: `identity.activated`
- Trust signal submitted: `account_created` (+5 trust points)

The username is permanently assigned at this transition. It cannot be released back to AVAILABLE unless the account is ARCHIVED.

**Entry condition:** Profile setup complete, all required fields present
**Transitions out:**
- → TRUSTED (KYC tier 2+ approved)
- → SUSPENDED (fraud detection, compliance action)
- → ARCHIVED (user request + data retention window)

---

### TRUSTED
Active identity with KYC tier 2 or above. Unlocks higher transaction limits.

- `registry.identity_status = 'trusted'`
- `registry.verification_status = 'tier_2'` or `'tier_3'`
- `registry.trust_tier = 'standard'` or above
- Kafka event: `identity.kyc_upgraded`
- Trust signal submitted: `kyc_upgrade` (+20 trust points)

**Entry condition:** Verification service approves tier 2 KYC
**Transitions out:**
- → SUSPENDED (fraud detection, compliance action)
- → ARCHIVED (user request)

---

### SUSPENDED
Access restricted. Entity is under review.

- `users.status = 'suspended'`
- `registry.identity_status = 'suspended'`
- `registry.routing_status = 'suspended'`
- All active consents frozen (grantee cannot act on them)
- New resolutions for this entity rejected
- Kafka event: `identity.suspended`
- Admin notification created
- Trust signal submitted: `account_suspended` (-20 trust points)

**Entry condition:** Fraud score ≥ 70, manual admin action, compliance trigger
**Transitions out:**
- → ACTIVE or TRUSTED (review cleared, reinstatement)
- → ARCHIVED (review not cleared within 90 days, or severe violation)

**Suspension TTL:** If no admin review within 90 days, auto-escalate to ARCHIVED.

---

### ARCHIVED
Permanent deactivation. Non-reversible.

- `users.status = 'archived'`
- `registry.identity_status = 'archived'`
- `registry.archived_at = NOW()`
- All active consents revoked
- All active mandates cancelled
- Routing profile suspended
- Alias marked as deleted (soft delete, retains audit trail)
- Username becomes AVAILABLE for reassignment after 90-day cool-off

**Entry condition:** User account deletion request (GDPR/NDPR), admin action, suspension escalation
**Transitions out:** None. Terminal state.

**Username release:** After 90-day cool-off period, alias slot returns to AVAILABLE. This prevents a user from archiving an account solely to "park" a username.

---

## IMPLEMENTATION

### Alias Claim TTL (Redis + PostgreSQL)

```typescript
// When registration begins:
await redis.set(`alias:claim:${normalizedAlias}`, userId, 'EX', 1800); // 30 min

// When registration times out (background job):
const expiredClaims = await db.select()
  .from(aliases)
  .where(and(eq(aliases.status, 'pending'), lt(aliases.pendingExpiresAt, new Date())));

for (const alias of expiredClaims) {
  await db.update(aliases).set({ status: 'available', deletedAt: new Date() })
    .where(eq(aliases.id, alias.id));
  await redis.del(`alias:claim:${alias.normalizedValue}`);
  await publishEvent(KAFKA_TOPICS.ALIAS_RELEASED, { aliasId: alias.id, reason: 'ttl_expired' });
}
```

### State Transition Validation

All state transitions are validated against this table before execution:

```typescript
const ALLOWED_TRANSITIONS: Record<IdentityStatus, IdentityStatus[]> = {
  available:  ['pending'],
  pending:    ['verified', 'available'],
  verified:   ['active', 'pending'],
  active:     ['trusted', 'suspended', 'archived'],
  trusted:    ['suspended', 'archived'],
  suspended:  ['active', 'trusted', 'archived'],
  archived:   [],  // Terminal
};

function validateTransition(from: IdentityStatus, to: IdentityStatus): void {
  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new InvalidTransitionError(`Cannot transition from ${from} to ${to}`);
  }
}
```

### Database Column

```sql
-- Add to aliases table:
ALTER TABLE aliases ADD COLUMN pending_expires_at TIMESTAMPTZ;
ALTER TABLE aliases ADD COLUMN state_changed_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE aliases ADD COLUMN state_changed_by TEXT;

-- Add to users table:
ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE users ADD COLUMN activated_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN suspended_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN suspension_reason TEXT;
ALTER TABLE users ADD COLUMN archived_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN archive_reason TEXT;
```

---

## GOVERNING RULES

### Rule 1: Usernames are AVAILABLE until registration begins
No reservation, no pre-claiming, no "is this available?" lock. Check happens at claim time. First to complete the OTP wins.

### Rule 2: PENDING has a hard 30-minute TTL
No extension. If the user needs more time, they restart registration and race for the alias again.

### Rule 3: VERIFIED has a 7-day activity window
If the user verifies email but never completes profile setup, the alias is released after 7 days. They must re-register.

### Rule 4: ACTIVE username assignment is permanent
Once ACTIVE, the username can only be released via ARCHIVE. No voluntary release while ACTIVE.

### Rule 5: ARCHIVED usernames have 90-day cool-off
Prevents cycling — archiving then re-registering the same username repeatedly to monopolize it.

### Rule 6: All transitions publish Kafka events
No silent state changes. All changes are auditable.

### Rule 7: Suspension blocks routing immediately
When SUSPENDED, routing_status → 'suspended'. No payments can be initiated to or from this entity until reinstated.

---

## BACKGROUND JOBS

```
Job: release_expired_pending_claims
  Schedule: every 5 minutes
  Action: release aliases where status='pending' AND pending_expires_at < NOW()

Job: release_expired_verified_claims
  Schedule: daily at 02:00 UTC
  Action: release aliases where status='verified' AND state_changed_at < NOW() - INTERVAL '7 days'

Job: escalate_suspended_to_archived
  Schedule: daily at 03:00 UTC
  Action: archive accounts where status='suspended' AND suspended_at < NOW() - INTERVAL '90 days'
         (with admin notification 14 days before escalation)

Job: release_archived_usernames
  Schedule: daily at 04:00 UTC
  Action: mark alias as available where status='archived' AND archived_at < NOW() - INTERVAL '90 days'
```
