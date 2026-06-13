# RALD — Event Bus Standard

**Document:** EVENT_BUS_STANDARD.md  
**Status:** Schema defined — Publishing is log-based stub (Cloudflare Queue not yet provisioned)  
**Owner:** LILCKY STUDIO LIMITED  
**Last Updated:** 2026-06-13

---

## Principle

All inter-product communication happens via events. Products never call each other's APIs directly for state changes. RALD Identity publishes events; products subscribe and react.

---

## Event Ownership Registry

| Event | Owner | Publisher | Consumers |
|-------|-------|-----------|-----------|
| `user.created` | RALD Identity | auth.rald.cloud | Loop, Messenger, PayRald, Mail, GitRald |
| `user.verified` | RALD Identity | auth.rald.cloud | Loop, PayRald, Raldtics |
| `user.deleted` | RALD Identity | auth.rald.cloud | All products |
| `username.claimed` | RALD Identity | auth.rald.cloud | Loop, Messenger, Mail |
| `profile.updated` | RALD Identity | auth.rald.cloud | Loop, Messenger, PayRald |
| `organization.created` | RALD Identity | auth.rald.cloud | Loop Business, PayRald |
| `developer.enabled` | RALD Identity | auth.rald.cloud | GitRald, RALD Console |
| `merchant.created` | PayRald | payrald | DunaRald, TradeOS, Raldtics |
| `trust.updated` | RALD Identity | auth.rald.cloud | Loop, PayRald, Raldtics |
| `consent.updated` | RALD Identity | auth.rald.cloud | All products |

---

## Event Schema

```typescript
interface RaldEvent<T = unknown> {
  type:        string;          // e.g. "user.created"
  version:     number;          // schema version
  id:          string;          // UUID — idempotency key
  occurred_at: string;          // ISO 8601
  producer:    string;          // "auth.rald.cloud"
  payload:     T;               // event-specific data
  metadata?: {
    correlation_id?: string;    // trace across services
    ip?:             string;    // originating IP (where relevant)
  };
}
```

---

## Current Implementation (Log-based stub)

`rald-auth-core/src/lib/events.ts` publishes events as structured JSON logs:

```json
{
  "level": "info",
  "msg": "event.published",
  "event_type": "user.created",
  "event_id": "<uuid>",
  "event": { ... }
}
```

These logs are consumed by OpenObserve (via `OPEN_OBSERVE_ENDPOINT`) and can trigger webhooks or downstream processors.

---

## Production Target: Cloudflare Queues

```typescript
// Uncomment once queue is provisioned:
if (env.EVENT_QUEUE) {
  await env.EVENT_QUEUE.send(event);
  return;
}
```

**Queue binding to add to wrangler.toml:**

```toml
[[queues.producers]]
queue = "rald-event-bus"
binding = "EVENT_QUEUE"
```

---

## Events Currently Published

| Event | Where Published |
|-------|----------------|
| `user.created` | `register-username.ts` (completion) |
| `user.deleted` | `privacy.ts` (deletion request) |
| `username.claimed` | `username.ts` (claim), `register-username.ts` |
| `identity.updated` | `profiles.ts` (PATCH /profiles/me) |
| `session.suspended` | `admin routes` |
| `session.unsuspended` | `admin routes` |
| `trust.updated` | `trust.ts` |
| `consent.granted` / `consent.revoked` | `privacy.ts` |

---

## Events Not Yet Published (Gap)

| Event | Missing From |
|-------|-------------|
| `user.verified` (phone/email) | register-username/complete |
| `developer.enabled` | developer.ts |
| `organization.created` | Org creation route |
| `merchant.created` | PayRald (separate service) |
| `profile.updated` | profiles.ts PATCH |

---

## Audit Log

| Date | Change |
|------|--------|
| 2026-06-13 | Event bus standard documented, ownership registry created |
| Pre-existing | events.ts stub implemented in auth-core |

