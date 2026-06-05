# EVENT BUS SPECIFICATION
**Cloudflare Queues — RALD Ecosystem Event Bus**
Version: 1.0.0
Issued: 2026-06-05
Issuer: LILCKY STUDIO LIMITED
Status: CANONICAL

---

## 1. PRINCIPLE

> **No direct service coupling. Everything communicates through events.**

Services never call each other directly. Services emit events. Services consume events. SEKANI orchestrates routing.

---

## 2. INFRASTRUCTURE

Platform: Cloudflare Queues
Fallback: In-memory event emitter (development only)

---

## 3. EVENT REGISTRY

| Event | Emitter | Consumers | Description |
|-------|---------|-----------|-------------|
| `voice.recorded` | Voice Pipeline | SEKANI, WIZMAC | Voice recording completed |
| `translation.completed` | BBC | WIZMAC | Translation finished |
| `knowledge.updated` | WIZMAC | All agents | Knowledge graph updated |
| `contract.approved` | PayRALD | WIZMAC, DRAGULA | Contract signed |
| `radio.created` | Loop | MERMAC, WIZMAC | New radio station |
| `radio.connected` | Loop | MERMAC | Station went live |
| `station.provisioned` | Loop | MERMAC, WIZMAC | Station provisioning complete |
| `payment.completed` | PayRALD | WIZMAC, DRAGULA | Payment processed |
| `dispatch.completed` | Loop Dispatch | MERMAC, WIZMAC | Dispatch completed |
| `training.contribution.recorded` | AI Training | WIZMAC | Voice training contribution logged |
| `voice.licensed` | Voice License | WIZMAC, DRAGULA | Voice license issued |
| `agent.task.completed` | Any agent | WIZMAC | Agent completed a task |
| `security.threat` | FOUR | SEKANI, WIZMAC | Security threat detected |
| `system.health.degraded` | MERMAC | SEKANI, DRAGULA | Service health degraded |
| `knowledge.conflict` | WIZMAC | SEKANI, FOUR | Knowledge conflict detected |

---

## 4. EVENT ENVELOPE

All events follow this structure:

```typescript
{
  eventId: uuid,        // Unique event ID
  eventType: string,    // e.g. "voice.recorded"
  version: "1.0",       // Event schema version
  emitter: string,      // Which service/agent emitted
  occurredAt: ISO8601,  // When it happened
  traceId: uuid,        // Trace across services
  payload: object,      // Event-specific data
  bbcCompliant: boolean, // Did this pass BBC?
  metadata: object,     // Additional context
}
```

---

## 5. DELIVERY GUARANTEES

- At-least-once delivery (Cloudflare Queues)
- Idempotent consumers required
- Dead letter queue for failed events
- Events stored in WIZMAC for replay capability

---

## 6. DEVELOPMENT FALLBACK

In development (no Cloudflare Queues):
- Events logged to `system_events` table
- Synchronous in-process delivery
- Same envelope structure

---

## 7. FUTURE EXPANSION

Additional queues planned:
- `rald-voice-queue` — Voice processing pipeline
- `rald-training-queue` — AI training contributions
- `rald-radio-queue` — Radio provisioning
- `rald-payment-queue` — Payment processing

*EVENT_BUS_SPEC V1 — LILCKY STUDIO LIMITED — 2026*
