# EVENT BUS STANDARD
**RALD Ecosystem Finalization Program — Phase 5**
**Date:** 2026-06-13 | **Status:** SPECIFICATION

---

## Mission

All RALD products communicate through events. No direct service-to-service synchronization. No polling. No shared database writes across product boundaries.

---

## Architecture

```
Producer (any RALD service)
  ↓  publish(event)
Event Bus (Cloudflare Queues / Workers KV broadcast)
  ↓  fan-out to subscribers
Consumers (per-product workers)
  ↓  process event
  ↓  update local state
  ↓  emit derived events
```

**Transport Layer:** Cloudflare Queues (primary) + Workers KV (lightweight fanout for small payloads)
**Delivery guarantee:** At-least-once (consumers must be idempotent)
**Ordering:** Per-producer FIFO within a queue

---

## Event Catalog

### Identity Events (Owner: auth.rald.cloud)

```typescript
interface UserCreatedEvent {
  type:       "user.created";
  version:    1;
  id:         string;   // event UUID
  occurred_at: string;  // ISO 8601
  payload: {
    user_id:      string;
    username:     string | null;
    display_name: string | null;
    phone:        string;         // masked: "+234***7890"
    country:      string;
    created_via:  "sms_otp" | "email_otp" | "passkey";
  };
}

interface UserVerifiedEvent {
  type:    "user.verified";
  version: 1;
  payload: { user_id: string; verification_type: "phone" | "email" | "gov_id"; };
}

interface UsernameClaimed {
  type:    "username.claimed";
  version: 1;
  payload: { user_id: string; username: string; previous_username: string | null; };
}

interface IdentityUpdatedEvent {
  type:    "identity.updated";
  version: 1;
  payload: {
    user_id:      string;
    changed_fields: string[];  // e.g. ["display_name","avatar_url"]
    trust_score:  number;
    trust_level:  string;
  };
}

interface TrustUpdatedEvent {
  type:    "trust.updated";
  version: 1;
  payload: { user_id: string; old_score: number; new_score: number; trigger: string; };
}

interface SessionSuspendedEvent {
  type:    "session.suspended";
  version: 1;
  payload: { user_id: string; reason: string; suspended_by: "admin" | "system"; };
}

interface UserDeletedEvent {
  type:    "user.deleted";
  version: 1;
  payload: { user_id: string; deletion_type: "soft" | "hard"; };
}
```

### Commerce Events (Owner: payrald)

```typescript
interface MerchantCreatedEvent { type: "merchant.created"; payload: { merchant_id, user_id, business_name }; }
interface PaymentSucceededEvent { type: "payment.succeeded"; payload: { transaction_id, payer_id, payee_id, amount, currency }; }
interface PaymentFailedEvent    { type: "payment.failed";    payload: { transaction_id, reason }; }
```

### Organization Events (Owner: auth.rald.cloud)

```typescript
interface OrganizationCreatedEvent { type: "organization.created"; payload: { org_id, name, owner_id, type }; }
interface DeveloperEnabledEvent    { type: "developer.enabled";    payload: { user_id, tier }; }
```

### Consent Events (Owner: auth.rald.cloud)

```typescript
interface ConsentGrantedEvent { type: "consent.granted"; payload: { user_id, app_id, scopes, expires_at }; }
interface ConsentRevokedEvent { type: "consent.revoked"; payload: { user_id, app_id, scopes }; }
```

---

## Event Ownership Registry

| Event Type | Owner | Subscribers |
|-----------|-------|-------------|
| `user.created` | auth.rald.cloud | loop, messenger, payrald, gitrald |
| `user.verified` | auth.rald.cloud | payrald (unlock higher limits) |
| `username.claimed` | auth.rald.cloud | loop (update @mention index), messenger |
| `identity.updated` | auth.rald.cloud | all products (refresh cached claims) |
| `trust.updated` | auth.rald.cloud | loop (creator unlock), payrald (limit unlock) |
| `consent.granted` | auth.rald.cloud | third-party apps |
| `consent.revoked` | auth.rald.cloud | third-party apps |
| `merchant.created` | payrald | tradeos, loop (merchant badge) |
| `organization.created` | auth.rald.cloud | loop-business, gitrald |
| `developer.enabled` | auth.rald.cloud | gitrald, rald-sdk |
| `session.suspended` | auth.rald.cloud | all products (invalidate cached sessions) |
| `user.deleted` | auth.rald.cloud | all products (cascade anonymize content) |

---

## Event Schema Standard

All events MUST follow:

```typescript
interface RaldEvent<T = unknown> {
  type:        string;          // domain.action — e.g. "user.created"
  version:     number;          // integer, increment on breaking schema change
  id:          string;          // UUID — used for deduplication
  occurred_at: string;          // ISO 8601 UTC
  producer:    string;          // service name — e.g. "auth.rald.cloud"
  payload:     T;
  metadata?: {
    correlation_id?: string;    // trace ID for observability
    ip?:             string;    // masked IP for audit
    user_agent?:     string;
  };
}
```

---

## Consumer Idempotency

Consumers MUST check for duplicate events before processing:

```typescript
async function handleUserCreated(event: UserCreatedEvent) {
  // Check if already processed
  const processed = await kv.get(`event:processed:${event.id}`);
  if (processed) return; // Skip duplicate

  // Process
  await createLoopProfile(event.payload.user_id);

  // Mark as processed (TTL: 7 days)
  await kv.put(`event:processed:${event.id}`, "1", { expirationTtl: 604800 });
}
```

---

## Implementation Priority

| Phase | Action |
|-------|--------|
| Now | Add event publishing stubs to auth.rald.cloud key routes |
| Sprint 1 | Stand up Cloudflare Queue for `identity.*` events |
| Sprint 2 | Loop and Messenger consume `identity.updated` |
| Sprint 3 | Add `merchant.*` events from PayRald |
| Sprint 4 | Full event mesh across all 7 core products |

---

*See also: IDENTITY_STATE_MACHINE.md, MACHINE_IDENTITY_STANDARD.md*
