# HEALTH MONITORING
**Model Provider Health Checks and Alerting**
Version: 1.0.0
Issued: 2026-06-05
Status: CANONICAL

---

## 1. HEALTH CHECK SCHEDULE

All registered providers checked every **5 minutes**.

Health check is a minimal POST to `/chat/completions`:
```json
{
  "model": "<provider_model_id>",
  "messages": [{"role": "user", "content": "ping"}],
  "max_tokens": 5
}
```

---

## 2. HEALTH STATUS STATES

| Status | Condition | Routing Behavior |
|--------|-----------|-----------------|
| `active` | Error rate < 5%, latency normal | Used as primary |
| `degraded` | Error rate 5-30%, high latency | Used as fallback only |
| `down` | Error rate > 30% or 3 consecutive failures | Excluded from routing |
| `disabled` | Manually disabled | Never used |

---

## 3. METRICS TRACKED

Per provider, per check:

- `latency_ms` — Time to first token (TTFT)
- `error_rate` — Errors / total checks (rolling 1h)
- `success_count` — Successful checks (rolling 24h)
- `error_count` — Failed checks (rolling 24h)
- `uptime_percent` — Success rate (rolling 7d)
- `last_error` — Last error message

---

## 4. ALERTING

| Event | Alert Via | Severity |
|-------|-----------|---------|
| Provider → degraded | DRAGULA notification | Warning |
| Provider → down | DRAGULA + SEKANI alert | Critical |
| All providers → down | DRAGULA urgent + WIZMAC event | CRITICAL |
| Provider → recovered | DRAGULA notification | Info |

---

## 5. RECOVERY PROTOCOL

A provider recovers from `down` to `active` by:
1. Passing 3 consecutive health checks
2. Error rate dropping below 5%
3. Manual override by administrator

---

## 6. HEALTH DASHBOARD

Available at: `GET /api/model-router/health`

Returns per-provider:
- Current status
- Latency (latest + P50/P90/P99)
- Error rate (1h/24h/7d)
- Uptime percent
- Last check timestamp

*HEALTH_MONITORING V1 — LILCKY STUDIO LIMITED — 2026*
