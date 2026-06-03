# OBSERVABILITY_CERTIFICATION.md
**Phase:** G.11 — Ecosystem Hardening & Stabilization | Stream 5  
**Owner:** LILCKY STUDIO LIMITED  
**Date:** 2026-06-03

---

## OBJECTIVE

Create centralized telemetry. Track: login success rates, OTP success rates, SSO success rates, room creation failures, message delivery failures, API latency, provider failover events. Integrate with Raldtics, Cloudflare Analytics, Worker logs.

---

## OBSERVABILITY ARCHITECTURE

```
RALD Services
    ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: Cloudflare Worker Observability (built-in)        │
│  - Worker request logs (Cloudflare Dashboard)               │
│  - CPU time, wall time, error rate per worker               │
│  - `head_sampling_rate: 1` (100% sampling) in all workers  │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 2: Supabase Audit Tables (application-level)         │
│  - audit_logs (rald-auth-core)                              │
│  - realtime_audit_log (rald-realtime)                       │
│  - realtime_provider_usage (rald-realtime)                  │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 3: Raldtics (Ostinato-Loop/raldtics-core)            │
│  - Product analytics events                                 │
│  - Feature usage tracking                                   │
│  - User retention signals                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## METRIC COVERAGE

### Login Success Rate

```sql
-- FROM: audit_logs (rald-auth-core)
SELECT
  DATE(created_at) AS day,
  COUNT(*) FILTER (WHERE action = 'login_success') AS success,
  COUNT(*) FILTER (WHERE action = 'login_failed') AS failure,
  ROUND(100.0 * COUNT(*) FILTER (WHERE action = 'login_success') /
    NULLIF(COUNT(*) FILTER (WHERE action IN ('login_success','login_failed')), 0), 1
  ) AS success_rate_pct
FROM audit_logs
WHERE created_at >= CURRENT_DATE - 7
GROUP BY day ORDER BY day;
```

**Target:** ≥90% login success rate.

### OTP Success Rate

```sql
SELECT
  ROUND(100.0 *
    SUM(CASE WHEN action='otp_verified' AND status='success' THEN 1 ELSE 0 END) /
    NULLIF(SUM(CASE WHEN action='otp_sent' THEN 1 ELSE 0 END), 0), 1
  ) AS otp_success_pct
FROM audit_logs
WHERE created_at >= CURRENT_DATE - 7;
```

**Target:** ≥85% OTP success rate.

### SSO Success Rate (Messenger)

```sql
-- Proxy: successful /login calls in Messenger scope
SELECT
  DATE(created_at) AS day,
  COUNT(*) AS sessions_initiated
FROM audit_logs
WHERE action = 'login_success'
  AND created_at >= CURRENT_DATE - 7
GROUP BY day ORDER BY day;
```

### Room Creation Failures

```sql
-- FROM: realtime_audit_log
SELECT
  DATE(created_at) AS day,
  COUNT(*) FILTER (WHERE status='success') AS success,
  COUNT(*) FILTER (WHERE status='failure') AS failure
FROM realtime_audit_log
WHERE action = 'room_created'
  AND created_at >= CURRENT_DATE - 7
GROUP BY day ORDER BY day;
```

**Target:** <5% room creation failure rate.

### Message Delivery Failures

```sql
-- FROM: Messenger worker logs (no explicit message delivery audit yet)
-- Proxy: HTTP 5xx errors from messenger.rald.cloud
-- Available in Cloudflare Dashboard → Workers → loop-messenger-api → Metrics
```

**Action:** Add `message_send_failed` event to `realtime_audit_log` when POST /conversations/:id/messages returns 5xx.

### API Latency

**Source:** Cloudflare Worker Observability (head_sampling_rate: 1 on all workers).

Available in Cloudflare Dashboard:
- `rald-auth` worker: p50, p95, p99 latency
- `loop-messenger-api` worker: p50, p95, p99 latency
- `rald-realtime` worker: p50, p95, p99 latency

**Targets:**
| Worker | p50 | p99 |
|---|---|---|
| rald-auth | <100ms | <500ms |
| loop-messenger-api | <50ms | <300ms |
| rald-realtime | <150ms | <600ms |

### Provider Failover Events

```sql
-- FROM: realtime_audit_log
SELECT
  DATE(created_at) AS day,
  provider,
  COUNT(*) AS failovers
FROM realtime_audit_log
WHERE action = 'provider_failover'
  AND created_at >= CURRENT_DATE - 7
GROUP BY day, provider
ORDER BY day DESC;
```

**Target:** <10 failovers/day during normal operations.

---

## CLOUDFLARE ANALYTICS INTEGRATION

All RALD Cloudflare Workers have:

```toml
[observability]
enabled = true
head_sampling_rate = 1
```

This enables:
- Request count
- Error rate (5xx)
- CPU time per request
- Duration histograms
- Geographic distribution

Available at: `dash.cloudflare.com → Workers → [worker] → Analytics`

**No additional configuration required for Cloudflare-native metrics.**

---

## RALDTICS INTEGRATION

`Ostinato-Loop/raldtics-core` provides product analytics. Events to emit from Messenger:

```typescript
// When a user sends their first message:
await fetch('https://analytics.rald.cloud/event', {
  method: 'POST',
  headers: { Authorization: `Bearer ${env.RALD_JWT_SECRET}` },
  body: JSON.stringify({
    event: 'first_message_sent',
    userId: payload.id,
    product: 'messenger',
    metadata: { conversationId }
  })
});
```

**Campus pilot minimum Raldtics events:**
- `user_registered`
- `otp_verified`
- `first_message_sent`
- `room_created`
- `room_joined`

Implementation: deferred to Loop/Messenger worker updates (not blocking campus pilot).

---

## CENTRALIZED OBSERVABILITY DASHBOARD — SQL

Operator runs these queries in Supabase to monitor the pilot:

```sql
-- DASHBOARD QUERY 1: Daily health summary
SELECT
  CURRENT_DATE AS date,
  (SELECT COUNT(*) FROM auth.users WHERE created_at >= CURRENT_DATE) AS new_users_today,
  (SELECT ROUND(100.0 * SUM(CASE WHEN action='otp_verified' AND status='success' THEN 1 ELSE 0 END) /
    NULLIF(SUM(CASE WHEN action='otp_sent' THEN 1 ELSE 0 END),0),1)
   FROM audit_logs WHERE created_at >= CURRENT_DATE) AS otp_success_pct_today,
  (SELECT ROUND(100.0 * SUM(CASE WHEN action='login_success' THEN 1 ELSE 0 END) /
    NULLIF(COUNT(*),0),1)
   FROM audit_logs WHERE action IN ('login_success','login_failed') AND created_at >= CURRENT_DATE) AS login_success_pct_today,
  (SELECT COUNT(*) FROM realtime_audit_log WHERE action='provider_failover' AND created_at >= CURRENT_DATE) AS failovers_today,
  (SELECT COUNT(*) FROM audit_logs WHERE action='rate_limited' AND created_at >= CURRENT_DATE) AS rate_limits_today;
```

---

## CERTIFICATION DECISION

```
╔══════════════════════════════════════════════════════════════╗
║  G.11 STREAM 5 — OBSERVABILITY CERTIFICATION                 ║
║                                                              ║
║  Cloudflare Worker observability: ✅ (all workers, 100%)    ║
║  Login success rate tracking:     ✅ SQL defined             ║
║  OTP success rate tracking:       ✅ SQL defined             ║
║  Room failure tracking:           ✅ SQL defined             ║
║  Failover event tracking:         ✅ SQL defined             ║
║  API latency tracking:            ✅ CF Dashboard            ║
║  Raldtics integration:            ⚠️ Defined, not deployed   ║
║  Message delivery audit:          ⚠️ Proxy only (CF metrics) ║
║  Daily dashboard query:           ✅ Single SQL statement    ║
║                                                              ║
║  STATUS: ✅ PASS (pilot baseline observability met)          ║
╚══════════════════════════════════════════════════════════════╝
```

LILCKY STUDIO LIMITED — RALD G.11 | 2026-06-03
