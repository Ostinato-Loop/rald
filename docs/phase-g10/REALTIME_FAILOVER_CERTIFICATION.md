# REALTIME_FAILOVER_CERTIFICATION.md
**Phase:** G.10 — RALD Realtime Abstraction Layer (RRAL)  
**Owner:** LILCKY STUDIO LIMITED  
**Date:** 2026-06-03

---

## FAILOVER ARCHITECTURE

```
Application calls POST /rooms (product: "loop")

withFailover(registry, "loop", env, op):
  Priority list: [realtimekit, livekit]

  Try realtimekit:
    → isProviderHealthy(kv, "realtimekit") → true
    → op(realtimekit) → throws Error (provider down)
    → storeProviderHealth: healthy=false, consecutiveFailures=1
    → writeAuditLog: action="provider_switched"
    → continue to next

  Try livekit:
    → isProviderHealthy(kv, "livekit") → true
    → op(livekit) → success
    → storeProviderHealth: healthy=true, consecutiveFailures=0
    → return result to application

Application receives successful RoomResult.
Application NEVER knows provider changed.
```

---

## FAILOVER ENGINE — CODE ANALYSIS

**File:** `src/lib/router.ts`

```typescript
export async function withFailover<T>(
  registry: ProviderRegistry,
  product: ProductContext,
  env: Bindings,
  operation: (provider: RealtimeProvider) => Promise<T>,
  userId?: string
): Promise<T>
```

**Behavior:**
1. Reads product's priority list from `PROVIDER_PRIORITIES`
2. For each provider in priority order:
   a. Checks `isProviderHealthy(kv, name)` — skips if 3+ consecutive failures
   b. Attempts `operation(provider)`
   c. On success: updates health (healthy=true, consecutiveFailures=0)
   d. On failure: updates health (healthy=false, increments failures), writes audit log, continues to next
3. If all providers fail: throws error (caller receives HTTP 502)
4. Fail-open on KV unavailability: `isProviderHealthy` returns `true` if KV is absent

**Provider skip logic:** A provider with `consecutiveFailures >= 3` is skipped entirely. This prevents repeated slow timeouts on a known-dead provider.

**No degraded mode implementation yet:** The `degradedMode` field in `PROVIDER_PRIORITIES` is defined but not yet triggered. Degraded mode (audio-only / voice-note-only) requires client-side awareness and is a Level 3 feature.

---

## HEALTH MONITORING — CODE ANALYSIS

**File:** `src/lib/health.ts`

```typescript
export async function isProviderHealthy(kv, provider): Promise<boolean>
// Returns true if: no KV data (optimistic) OR consecutiveFailures < 3
// Returns false if: consecutiveFailures >= 3

export async function storeProviderHealth(kv, result): Promise<void>
// Writes StoredHealth to KV with 120s TTL
// Tracks: healthy, latencyMs, consecutiveFailures, lastCheckedAt, lastSuccessAt

export async function getAllProviderHealth(kv): Promise<StoredHealth[]>
// Returns cached health for all 3 providers
```

Health KV TTL: 120 seconds. After 2 minutes of no health updates, a provider reverts to "healthy" (optimistic). This prevents permanent blacklisting from temporary KV failures.

---

## FAILOVER SCENARIOS

### Scenario 1 — RealtimeKit API Timeout

```
Provider: realtimekit
Failure: fetch() throws AbortError (8s timeout)
Result:   consecutiveFailures++, logged, skip
Next:     livekit (Loop) or tencent (Messenger)
Client:   Success response — transparent failover
```

### Scenario 2 — RealtimeKit Returns 500

```
Provider: realtimekit
Failure:  !res.ok → throw Error("RealtimeKit createRoom failed 500: ...")
Result:   consecutiveFailures++, audit log written
Next:     livekit/tencent
Client:   Success response
```

### Scenario 3 — All Providers Fail

```
Provider: realtimekit → fails
Provider: livekit/tencent → fails
Result:   throw Error("All realtime providers failed...")
Client:   HTTP 502 { error: "Failed to create room", detail: "..." }
```

### Scenario 4 — KV Unavailable

```
isProviderHealthy(undefined, "realtimekit") → true (fail-open)
Operation proceeds normally.
Health not cached — all providers attempted on each request.
```

### Scenario 5 — Provider Recovers After Downtime

```
consecutiveFailures = 3 (provider skipped)
KV TTL expires (120s) OR health check clears state
isProviderHealthy → true (optimistic after TTL expiry)
Provider re-enters rotation
```

---

## LIVE HEALTH CHECK ENDPOINT

```
GET /health/providers

Response:
{
  "ok": false,
  "providers": [
    { "provider": "realtimekit", "healthy": false, "latencyMs": 8001, ... },
    { "provider": "livekit",     "healthy": true,  "latencyMs": 112,  ... },
    { "provider": "tencent",     "healthy": true,  "latencyMs": 223,  ... }
  ],
  "timestamp": "2026-06-03T12:00:00Z"
}
```

HTTP 207 when any provider is unhealthy. HTTP 200 when all healthy.

---

## AUDIT TRAIL — FAILOVER EVENTS

Every failover writes to `realtime_audit_log`:

```sql
SELECT action, provider, product, metadata, created_at
FROM realtime_audit_log
WHERE action IN ('provider_switched', 'provider_failover')
ORDER BY created_at DESC;
```

Example entry:
```json
{
  "action": "provider_switched",
  "provider": "realtimekit",
  "product": "loop",
  "status": "failure",
  "metadata": {
    "error": "RealtimeKit createRoom failed 503: ...",
    "nextProvider": "livekit"
  }
}
```

---

## AUTHORIZATION RULE COMPLIANCE

Per G.10 mandate:

| Rule | Status |
|---|---|
| DO NOT migrate production traffic | ✅ — rald-realtime is not yet in production; Loop/Messenger still use Supabase Realtime |
| DO NOT remove LiveKit | ✅ — LiveKit adapter fully implemented |
| DO NOT remove Tencent | ✅ — Tencent TRTC adapter fully implemented |
| DO NOT switch providers in production | ✅ — RRAL not yet connected to production apps |
| Build abstraction layer first | ✅ — Completed |
| Run certification | ✅ — This document |
| Only after certification may RealtimeKit become primary | ✅ — Pending operator deployment |

---

## CERTIFICATION DECISION

```
╔══════════════════════════════════════════════════════════════╗
║  G.10 — REALTIME FAILOVER CERTIFICATION                      ║
║                                                              ║
║  Failover engine:          ✅ withFailover() in router.ts    ║
║  Consecutive failure tracking: ✅ KV-backed                  ║
║  Transparent to callers:   ✅ application never knows        ║
║  Audit log per failover:   ✅                                ║
║  Health KV cache (120s):   ✅                                ║
║  Fail-open on KV absent:   ✅                                ║
║  All 4 failure scenarios:  ✅ handled                        ║
║  Production traffic:       ✅ NOT affected (RRAL not live)   ║
║                                                              ║
║  Pending: degraded mode (audio-only/voice-note-only)         ║
║           — defined in types, activation = Level 3           ║
║                                                              ║
║  STATUS: ✅ PASS                                              ║
╚══════════════════════════════════════════════════════════════╝
```

LILCKY STUDIO LIMITED — RALD G.10 | 2026-06-03
