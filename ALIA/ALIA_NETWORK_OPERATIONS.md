# ALIA_NETWORK_OPERATIONS.md
# RALD ALIA — Network Operations Guide
**Version:** 1.0 — Phase 2 Governance
**Date:** 2026-06-13

---

## PURPOSE

This document defines how ALIA is operated at scale. It covers the operational responsibilities of the ALIA Platform Team, the runbooks for common incidents, the monitoring setup, and the SLA commitments by environment.

---

## SLA BY ENVIRONMENT

| Environment | Uptime Target | Resolution Latency | Error Rate |
|-------------|--------------|-------------------|------------|
| Sandbox | 99.5% | <500ms p99 | <5% |
| INTERNAL | 99.9% | <300ms p99 | <2% |
| PRIVATE_BETA | 99.9% | <200ms p99 | <1% |
| PUBLIC_BETA | 99.95% | <200ms p99 | <0.5% |
| GA | 99.99% | <150ms p95, <200ms p99 | <0.1% |

---

## MONITORING STACK

### Metrics
- **Source:** Pino structured logs from all services → log aggregation
- **Target:** Prometheus metrics endpoint on each service (`GET /metrics`)
- **Visualization:** Grafana dashboards per domain
- **Alerting:** PagerDuty for P0/P1, Slack for P2/P3

### Key Metrics Per Service

**All services:**
```
alia_request_total{service, method, path, status}
alia_request_duration_seconds{service, method, path, quantile}
alia_error_total{service, error_type}
```

**resolution-engine:**
```
alia_resolution_latency_ms{cache_hit}
alia_resolution_cache_hit_rate
alia_resolution_error_total{reason}
alia_routing_token_issued_total
alia_routing_token_verified_total
```

**trust-service:**
```
alia_trust_score_distribution{tier}
alia_trust_signal_total{signal_type}
alia_trust_score_update_duration_ms
```

**fraud-service:**
```
alia_fraud_score_distribution{risk_level}
alia_fraud_velocity_block_total
alia_fraud_event_total{action}
```

**consent-service:**
```
alia_consent_granted_total{scope}
alia_consent_revoked_total{reason}
alia_mandate_created_total
alia_mandate_executed_total
```

**kafka (shared):**
```
alia_kafka_publish_total{topic}
alia_kafka_publish_failure_total{topic}
alia_kafka_consumer_lag{topic, group}
```

---

## ALERTING THRESHOLDS

| Alert | Condition | Severity | Response Time |
|-------|-----------|----------|--------------|
| Resolution latency high | p95 > 300ms for 5 min | P1 | 30 min |
| Resolution error rate | > 2% for 5 min | P0 | 15 min |
| Kafka consumer lag | > 10,000 messages on any topic | P1 | 30 min |
| DB connection pool exhausted | < 5 connections available | P0 | 15 min |
| Redis disconnected | 3 consecutive failed pings | P0 | 15 min |
| Fraud blocking rate spike | > 10x baseline for 2 min | P1 | 30 min |
| Service down | Health check failure for 60s | P0 | 15 min |
| Machine JWT rotation failed | 3 consecutive failures | P1 | 30 min |
| Institution suspended automatically | Any institution auto-suspended | P2 | 2 hours |
| Country status change | Any country status transition | P2 | 2 hours (notify) |

---

## RUNBOOKS

### Runbook 1: Resolution Engine High Latency

**Trigger:** p95 resolution latency > 300ms for 5+ minutes

**Diagnosis steps:**
1. Check Redis connectivity: `redis-cli -h $REDIS_HOST ping`
2. Check Redis cache hit rate: `GET redis:stats:hit_rate` or metrics
3. If cache miss rate high → check if aliases table is healthy: `SELECT COUNT(*) FROM aliases WHERE status = 'active'`
4. Check PostgreSQL slow query log for alias lookup queries
5. Check Kafka consumer lag on `resolution.*` topics

**Remediation:**
- Low cache hit rate: run `POST /admin/routing/cache/flush` with reason, allow resolution to rebuild cache
- PostgreSQL slow: check index on `aliases(normalized_value, status, deleted_at)` — recreate if needed
- Kafka lag: increase consumer concurrency in resolution-engine env vars

**Escalation:** If latency remains high after 30 minutes → P0, engage Database Admin

---

### Runbook 2: Service Down

**Trigger:** `GET /healthz` fails for 60+ seconds on any service

**Diagnosis steps:**
1. Check container status: `docker ps | grep <service-name>`
2. Check container logs: `docker logs --tail=100 <service-name>`
3. Check for OOM: `docker stats <service-name>`
4. Check for crash loop: `docker inspect <service-name> | grep -A5 'RestartCount'`

**Remediation:**
1. If crash loop: check logs for unhandled exception → review recent deployment
2. If OOM: increase container memory limit → redeploy
3. If DB connection error: verify DB credentials + pool settings
4. If Kafka connection error: verify Kafka broker health

**Escalation:** If service cannot restart within 15 minutes → activate backup instance, page on-call

---

### Runbook 3: In-Flight Payment Routing Failure

**Trigger:** Resolution errors > 5% OR institution suspended during active routing window

**Impact:** PayRald and other payment products receive `ROUTING_UNAVAILABLE` errors

**Diagnosis:**
1. Check institution status: `GET /admin/institutions?status=suspended`
2. Check routing-service error logs
3. Check if specific bank code is failing: `GET /admin/routing/errors`

**Remediation:**
- If specific institution suspended: verify if correct (check fraud-service events), notify affected institution
- If routing-service crash: restart service, check for DB connection issues
- If broad failure: activate country-level routing degradation mode (limit routing to verified institutions only)

**User communication:** If > 500 users affected, draft incident notice via notification-service

---

### Runbook 4: Fraud False Positive Spike

**Trigger:** Fraud blocking rate > 10x baseline OR merchant reports legitimate transactions blocked

**Diagnosis:**
1. Check fraud-service metrics: what signals are triggering?
2. Check Redis velocity keys: `redis-cli keys "fraud:velocity:*" | wc -l`
3. Check if configuration change caused spike: `GET /admin/fraud/config/thresholds`

**Remediation:**
- If velocity threshold too low: `PATCH /admin/fraud/config/thresholds` to adjust
- If Redis velocity keys stale: flush specific keys for affected entities
- Bulk resolve false positives: `POST /admin/fraud/:event_id/resolve` with reason `FALSE_POSITIVE`

---

### Runbook 5: Kafka Consumer Lag

**Trigger:** Consumer lag > 10,000 messages on any topic

**Impact:** Audit trail delayed, trust signals not processing, notifications delayed

**Diagnosis:**
1. Check consumer group status
2. Identify which service is lagging (audit-service? notification-service? trust-service?)
3. Check if service is healthy and processing

**Remediation:**
- If service crashed: restart, lag will process naturally
- If processing is slow: increase consumer parallelism in service config
- If lag is on `audit.*` only: acceptable — audit is async, not user-facing
- If lag is on `notification.*`: check notification-service provider connectivity

---

### Runbook 6: Machine Identity Credential Compromise

**Trigger:** Suspicious machine JWT usage OR security team reports potential compromise

**Immediate actions (< 5 minutes):**
1. Identify compromised service: `GET /admin/machines`
2. Immediately revoke: `POST /admin/machines/:id/revoke`
3. All in-flight machine JWTs for that service are immediately invalid
4. Service cannot authenticate until new credentials issued

**Remediation:**
1. Identify root cause (credential leaked in logs, env var exposed, etc.)
2. Fix root cause
3. Issue new machine credentials: `POST /admin/machines/:id/rotate`
4. Update service environment variables
5. Restart affected service
6. Monitor for additional suspicious activity

---

## OPERATIONAL PROCEDURES

### Daily Operations Checklist

```
□ Review fraud queue (> 0 unresolved events)
□ Check resolution engine latency (must be < 200ms p95)
□ Check Kafka consumer lag (must be < 1,000 on all topics)
□ Review institution onboarding queue
□ Check developer API key usage anomalies
□ Review audit trail completeness (spot-check 10 random events)
□ Verify all services passing health checks
```

### Weekly Operations Checklist

```
□ Review trust score distribution (expected: 80% active users > tier 'basic')
□ Review fraud false positive rate (target: < 2% of blocked events overturned)
□ Run batch sanctions screening on all active entities
□ Review pending institution onboarding applications
□ Review developer production access queue
□ Check database storage growth (alert if > 80% used)
□ Review Redis memory usage (alert if > 80% used)
□ Verify backup integrity (test restore of last backup)
□ Review machine identity last_auth_at (rotate any not used in 30 days)
```

### Monthly Operations Checklist

```
□ Regulatory report generation (NFIU, CBN, BoG as applicable)
□ Audit trail integrity check (batch SHA-256 checksum verification)
□ Review API version usage (deprecate endpoints with < 1% usage)
□ Security scan of all dependencies (npm audit)
□ Review country status against activation criteria
□ Review institution license expiry dates (alert if < 90 days)
□ Performance review: is p99 latency trending up?
□ Developer quota review: are any developers hitting limits regularly?
□ Reset sandbox environment (notify developers 7 days in advance)
```

---

## CAPACITY PLANNING

### PostgreSQL

| Table | Current Size | 1M Users | 10M Users | 100M Users |
|-------|-------------|----------|-----------|------------|
| registry | ~0 | ~500 MB | ~5 GB | ~50 GB |
| aliases | ~0 | ~2 GB | ~20 GB | ~200 GB |
| trust_scores | ~0 | ~1 GB | ~10 GB | ~100 GB |
| consents | ~0 | ~5 GB | ~50 GB | ~500 GB |
| audit_logs | ~0 | ~10 GB | ~100 GB | ~1 TB |
| resolution cache | (Redis) | ~2 GB | ~20 GB | ~200 GB |

**At 10M users:** Single PostgreSQL instance with read replicas is viable.
**At 100M users:** Database sharding required. Per-service databases required. Consider partitioning `audit_logs` by month.

### Redis

| Usage | 1M Users | 10M Users | 100M Users |
|-------|----------|-----------|------------|
| Resolution cache | 500 MB | 5 GB | 50 GB |
| Fraud velocity | 100 MB | 1 GB | 10 GB |
| Session/OTP | 50 MB | 500 MB | 5 GB |
| Rate limiting | 100 MB | 1 GB | 10 GB |
| **Total** | **750 MB** | **7.5 GB** | **75 GB** |

**At 10M users:** Redis Cluster recommended (3 shards minimum).

### Kafka

Target throughput at scale:
- 100M users, 1,000 TPS → 86.4M events/day
- Each event avg 2 KB → 173 GB/day
- Retention: 7 days → 1.2 TB total

**Requires:** Kafka cluster with 6+ brokers, topic partitioning by country code.

---

## INCIDENT SEVERITY DEFINITIONS

| Severity | Definition | Example | Response |
|----------|-----------|---------|----------|
| P0 — Critical | Platform-wide outage or data loss | Resolution engine down | 15 min |
| P1 — High | Major capability degraded | Fraud blocking all transactions | 30 min |
| P2 — Medium | Partial capability affected | 1 institution suspended | 2 hours |
| P3 — Low | Degraded experience, no data impact | Admin console slow | 24 hours |
| P4 — Info | Monitoring alert, no user impact | Kafka lag briefly spiked | Next business day |
