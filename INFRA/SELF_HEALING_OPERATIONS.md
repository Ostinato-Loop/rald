# SELF-HEALING OPERATIONS
**RALD Ecosystem Finalization Program — Phase 10**
**Date:** 2026-06-13 | **Status:** SPECIFICATION

---

## Mission

The RALD ecosystem must detect, isolate, and recover from failures automatically. No manual intervention for routine failures. Human escalation only for true incidents (data corruption, security breach, novel failure modes).

---

## Failure Categories

| Category | Examples | Target Recovery | Strategy |
|----------|---------|-----------------|----------|
| Transient | Network timeout, rate limit hit | < 30 seconds | Retry + circuit break |
| Worker crash | Unhandled exception, OOM | < 60 seconds | Auto-restart by Cloudflare |
| Database contention | Lock timeout, slow query | < 2 minutes | Query retry + connection pool reset |
| Secret rotation | JWT secret changed | < 5 minutes | Rolling rotation with overlap |
| Upstream degradation | auth.rald.cloud slow | < 10 minutes | Fallback to cached identity |
| Full service outage | Worker deployment failure | < 15 minutes | Instant rollback |
| Data inconsistency | Profile desync across products | < 1 hour | Event replay + reconciliation |

---

## Health Check Infrastructure

Every RALD worker exposes:

```
GET /_health         → 200 OK { status: "ok", ts: "..." }
GET /_health/deep    → Full dependency check (DB, KV, queues, upstream APIs)
GET /_ready          → Readiness probe (returns 503 during startup)
```

### Deep Health Response
```json
{
  "status": "degraded",
  "ts": "2026-06-13T12:00:00Z",
  "checks": {
    "database":       { "status": "ok",      "latency_ms": 12 },
    "kv_store":       { "status": "ok",      "latency_ms": 2  },
    "auth_upstream":  { "status": "degraded","latency_ms": 850, "note": "above threshold" },
    "queue":          { "status": "ok",      "latency_ms": 5  }
  },
  "version": "1.4.2",
  "uptime_seconds": 86400
}
```

---

## Circuit Breaker Pattern

Implemented in every service-to-service call:

```typescript
class CircuitBreaker {
  private failures = 0;
  private state: "closed" | "open" | "half-open" = "closed";
  private openedAt: number | null = null;

  constructor(
    private readonly threshold = 5,          // failures before opening
    private readonly timeout   = 30_000,     // ms before half-open
    private readonly name: string
  ) {}

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.openedAt! > this.timeout) {
        this.state = "half-open";
      } else {
        throw new Error(`Circuit open: ${this.name}`);
      }
    }
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (e) {
      this.onFailure();
      throw e;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = "closed";
  }

  private onFailure() {
    this.failures++;
    if (this.failures >= this.threshold) {
      this.state = "open";
      this.openedAt = Date.now();
    }
  }
}
```

---

## Retry Policy

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { maxAttempts: number; baseDelay: number; maxDelay: number }
): Promise<T> {
  let lastError: Error;
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      lastError = e;
      if (attempt === opts.maxAttempts) break;
      // Exponential backoff + jitter
      const delay = Math.min(
        opts.baseDelay * Math.pow(2, attempt - 1) + Math.random() * 100,
        opts.maxDelay
      );
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastError!;
}

// Standard retry policies
export const AUTH_RETRY   = { maxAttempts: 3, baseDelay: 200, maxDelay: 2000 };
export const DB_RETRY     = { maxAttempts: 5, baseDelay: 100, maxDelay: 5000 };
export const QUEUE_RETRY  = { maxAttempts: 10, baseDelay: 1000, maxDelay: 30000 };
```

---

## Secret Rotation Procedure

The `RALD_JWT_SECRET` must be rotatable without user logouts:

```
Step 1: Generate new secret (RALD_JWT_SECRET_NEXT)
Step 2: Deploy to all workers in "dual-accept" mode
        Workers verify: try CURRENT secret first, then NEXT secret
Step 3: Workers begin issuing tokens signed with NEXT secret
Step 4: Wait for all CURRENT-signed tokens to expire (1 hour max)
Step 5: Remove CURRENT secret from all workers
Step 6: NEXT becomes CURRENT
```

Implementation in auth worker:
```typescript
async function verifyWithRotation(token: string, env: Env): Promise<JWTPayload | null> {
  // Try current secret
  const primary = await verifyJwt(token, env.RALD_JWT_SECRET);
  if (primary) return primary;
  // Try next secret during rotation window
  if (env.RALD_JWT_SECRET_NEXT) {
    return await verifyJwt(token, env.RALD_JWT_SECRET_NEXT);
  }
  return null;
}
```

---

## Automated Recovery Playbooks

### Playbook: Auth Worker Unhealthy
```
1. Alert fires: /_health/deep returns degraded
2. Cloudflare automatically retries requests to healthy instances
3. If all instances degraded → fallback to cached session validation (KV)
4. Page on-call engineer if KV fallback duration > 5 min
5. Deploy previous version via CF Workers rollback
```

### Playbook: Database Connection Pool Exhausted
```
1. Alert fires: Supabase connection count > 90% of pool max
2. Identify slowest queries via pg_stat_activity
3. Kill idle connections > 30 minutes old
4. Auto-scale Supabase connection pooler (pgBouncer)
5. Review slow queries → add indexes if needed
```

### Playbook: Identity Desync
```
1. Detect: user.username in loop_profiles differs from auth_users.username
2. Trigger reconciliation job: SELECT loop_profiles p LEFT JOIN auth_users u ON p.id = u.id WHERE p.username != u.username
3. Emit corrective identity.updated events
4. Products consume events and update their caches
5. Log discrepancy count for trend analysis
```

---

## Alerting Thresholds

| Metric | Warning | Critical | Auto-action |
|--------|---------|----------|-------------|
| Auth error rate | > 1% | > 5% | Page on-call |
| JWT verify latency | > 200ms | > 1s | Open circuit breaker |
| DB query latency (p99) | > 500ms | > 2s | Kill slow queries |
| KV write latency | > 50ms | > 200ms | Alert |
| Queue backlog | > 1,000 | > 10,000 | Scale consumers |
| Failed logins / hour | > 500 | > 2,000 | Enable CAPTCHA |

---

*See also: OBSERVABILITY_STANDARD.md, MACHINE_IDENTITY_STANDARD.md*
