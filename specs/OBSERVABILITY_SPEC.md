# OBSERVABILITY SPECIFICATION
**MERMAC — Observation, Monitoring, and Alerting**
Version: 1.0.0
Issued: 2026-06-05
Issuer: LILCKY STUDIO LIMITED
Status: CANONICAL

---

## 1. DASHBOARDS

All dashboards available at `/api/observe/*`:

| Dashboard | Endpoint | Managed By |
|-----------|---------|-----------|
| System Health | `/api/observe/system-health` | MERMAC |
| Agent Health | `/api/observe/agent-health` | MERMAC |
| Model Usage | `/api/observe/model-usage` | MERMAC |
| Security Center | `/api/observe/security` | FOUR |
| Voice Processing | `/api/observe/voice-processing` | MERMAC |
| Cost Monitoring | `/api/observe/cost-monitoring` | MERMAC |
| Audit Log | `/api/observe/audit-log` | WIZMAC |

---

## 2. METRICS TRACKED

### Latency
- P50, P90, P99 per endpoint
- Model call latency per provider
- BBC pipeline latency
- Voice processing end-to-end

### Errors
- Error rate per endpoint
- Error rate per agent
- Model provider failures
- BBC validation failures

### Token Usage
- Total tokens per period
- Tokens per model
- Tokens per agent
- Cost per token

### Queue Health
- Depth per queue
- Processing rate
- Dead letter count

### Storage Growth
- WIZMAC entity count growth
- Voice storage growth
- Knowledge graph size

### Agent Activity
- Actions per agent per period
- Success rate per agent
- Task completion time

---

## 3. ALERTING

MERMAC triggers alerts via DRAGULA when:

- Error rate > 5% in 5 minutes
- P99 latency > 5 seconds
- Model provider failure rate > 20%
- Queue depth > 1000 items
- Storage growth > 10GB/day
- Agent failure rate > 10%
- Cost approaching budget threshold

---

## 4. RETENTION

- Real-time metrics: 24 hours in memory
- Hourly aggregates: 90 days in database
- Daily aggregates: 3 years in WIZMAC
- Monthly snapshots: permanent in WIZMAC

*OBSERVABILITY_SPEC V1 — LILCKY STUDIO LIMITED — 2026*
