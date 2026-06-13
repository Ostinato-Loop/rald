# OBSERVABILITY STANDARD
**RALD Ecosystem Finalization Program — Phase 12**
**Date:** 2026-06-13 | **Status:** SPECIFICATION

---

## Mission

Every RALD service emits structured logs, traces, and metrics in a consistent format. Any engineer can diagnose any incident in under 5 minutes using only these observability outputs.

---

## Three Pillars

```
Logs    → What happened (structured JSON events)
Traces  → How it happened (request lifecycle across services)
Metrics → How often / how fast (counters, histograms, gauges)
```

---

## Structured Log Format

All logs MUST be JSON. Never raw strings.

```typescript
interface RaldLogEntry {
  ts:          string;         // ISO 8601 UTC
  level:       "debug" | "info" | "warn" | "error" | "fatal";
  service:     string;         // e.g. "auth.rald.cloud"
  version:     string;         // deployment version
  msg:         string;         // human-readable message
  trace_id?:   string;         // Trace ID (propagated via X-Trace-ID header)
  span_id?:    string;         // Current span
  user_id?:    string;         // Masked: first 8 chars of UUID only
  request_id?: string;         // Unique per request
  method?:     string;         // HTTP method
  path?:       string;         // URL path (no query params with PII)
  status?:     number;         // HTTP response status
  duration_ms?: number;        // Request duration
  error?:      {
    code:    string;
    message: string;
    stack?:  string;           // Dev only; never in production
  };
  [key: string]: unknown;      // Additional structured fields
}
```

### Logger Implementation

```typescript
class RaldLogger {
  constructor(
    private readonly service: string,
    private readonly version: string
  ) {}

  private log(level: string, msg: string, fields: Record<string, unknown> = {}) {
    console.log(JSON.stringify({
      ts:      new Date().toISOString(),
      level,
      service: this.service,
      version: this.version,
      msg,
      ...fields,
    }));
  }

  info  = (msg: string, fields?: Record<string, unknown>) => this.log("info",  msg, fields);
  warn  = (msg: string, fields?: Record<string, unknown>) => this.log("warn",  msg, fields);
  error = (msg: string, fields?: Record<string, unknown>) => this.log("error", msg, fields);
  debug = (msg: string, fields?: Record<string, unknown>) => this.log("debug", msg, fields);
}

export const logger = new RaldLogger(
  process.env.SERVICE_NAME ?? "unknown",
  process.env.DEPLOY_VERSION ?? "unknown"
);
```

---

## Distributed Tracing

### Trace Propagation

All services MUST propagate the trace ID:

```typescript
// In every worker: extract or generate trace ID
function getTraceId(request: Request): string {
  return request.headers.get("X-Trace-ID") ?? crypto.randomUUID();
}

// In every outbound fetch: forward trace ID
const upstream = await fetch(url, {
  headers: {
    "X-Trace-ID": traceId,
    "X-Span-ID":  crypto.randomUUID(),
    "X-Service":  SERVICE_NAME,
  }
});
```

### Trace Schema
```
Trace ID: 550e8400-e29b-41d4-a716-446655440000
  ├── Span: profiles.rald.cloud (login form submit) 45ms
  ├── Span: auth.rald.cloud /auth/verify-otp        30ms
  ├── Span: auth.rald.cloud /sso/exchange            15ms
  ├── Span: loop.rald.cloud /api/auth/rald-sso       85ms
  │     ├── Span: Supabase upsertProfile             22ms
  │     └── Span: KV registerDevice                  5ms
  └── Total: 175ms
```

---

## Standard Metrics

### Auth Metrics
```
rald_auth_otp_sent_total          counter  { country, channel }
rald_auth_otp_verified_total      counter  { country, result: success|fail }
rald_auth_login_total             counter  { method: sms|email|passkey, result }
rald_auth_jwt_issued_total        counter  { scope: user|sso|machine }
rald_auth_session_active          gauge    current active sessions
rald_auth_request_duration_ms     histogram { route, status }
rald_auth_error_rate              gauge    errors per minute
```

### Identity Metrics
```
rald_identity_users_total         gauge    total users by state
rald_identity_username_reserved   gauge    currently reserved usernames
rald_identity_verifications_total counter  { type: phone|email|gov_id, result }
rald_trust_score_distribution     histogram trust score buckets
```

### Infrastructure Metrics
```
rald_db_query_duration_ms         histogram { query, service }
rald_kv_latency_ms                histogram { operation: get|put|delete }
rald_queue_depth                  gauge    { queue_name }
rald_queue_lag_seconds            gauge    { queue_name }
rald_upstream_latency_ms          histogram { service, endpoint }
rald_circuit_breaker_state        gauge    { breaker: open=1, closed=0 }
```

---

## Dashboard Structure (Cloudflare Analytics / Grafana)

```
RALD Platform Overview
├── AUTH HEALTH
│   ├── Login success rate (%)
│   ├── OTP delivery rate (%)
│   ├── P95 auth latency (ms)
│   └── Active sessions (count)
│
├── IDENTITY
│   ├── New users today
│   ├── Trust score distribution (histogram)
│   └── Username reservation expiry rate
│
├── LOOP
│   ├── DAU / WAU / MAU
│   ├── Post creation rate
│   └── Auth callback success rate
│
├── ALIA
│   ├── Requests routed by instance type
│   ├── P95 response latency
│   └── Consent grant rate
│
├── INFRA
│   ├── DB connection pool usage
│   ├── KV read/write rates
│   ├── Queue backlogs
│   └── Circuit breaker states
│
└── ERRORS
    ├── Top 10 errors by volume
    ├── Error rate by service
    └── Unhandled exceptions
```

---

## Alerting Rules

```yaml
# PagerDuty / Cloudflare Alerts
alerts:
  - name: AuthLoginErrorSpike
    condition: rald_auth_error_rate > 5% for 2min
    severity: critical
    action: page_oncall

  - name: DBLatencyHigh
    condition: rald_db_query_duration_ms_p99 > 2000 for 5min
    severity: warning
    action: slack_infra

  - name: QueueBacklogHigh
    condition: rald_queue_depth > 10000
    severity: warning
    action: slack_infra

  - name: ALIARoutingDown
    condition: rald_routing_health != "ok" for 1min
    severity: critical
    action: page_oncall

  - name: MachineJWTFailures
    condition: rald_machine_auth_failures > 10 per 5min
    severity: critical
    action: page_oncall + security_notify
```

---

## Privacy Rules for Logs

- Never log: full phone numbers, email addresses, OTP codes, JWT secrets, payment card numbers
- Phone numbers: mask as `+234***7890` (first 4 + last 4 digits)
- User IDs: log only first 8 chars of UUID in non-auth-core services
- Passwords/secrets: never log under any circumstances
- IP addresses: log only in auth.rald.cloud for security audit; hash before exporting

---

*See also: SELF_HEALING_OPERATIONS.md, MACHINE_IDENTITY_STANDARD.md*
