# AUTH_OBSERVABILITY_SPEC.md
**RALD Auth V1 — Founder Observability Dashboard**
**Date:** 2026-06-09 | **Authority:** RALD Auth V1 Lockdown Directive
**LILCKY STUDIO LIMITED**

---

## PURPOSE

A founder dashboard that surfaces the health of the RALD Auth identity platform in real time. No third-party analytics tools required — all data lives in `audit_logs` and `auth_login_history` in Supabase.

**Audience:** LILCKY STUDIO LIMITED founders and engineering leads.
**Location:** `admin.rald.cloud` → Auth Health tab (rald-control-center)

---

## METRICS CATALOG

### Tier 1: Real-Time Health (refresh every 60s)

| Metric | Source | Query |
|---|---|---|
| OTP success rate (%) | `audit_logs` | `otp_verified / (otp_verified + otp_failed)` in last hour |
| OTP failure rate (%) | `audit_logs` | `otp_failed / total_otp_attempts` in last hour |
| Login success rate (%) | `audit_logs` | `login / (login + login_failed)` in last hour |
| Active sessions right now | `auth_sessions` | `COUNT(*) WHERE expires_at > now()` |
| Auth errors last hour | `audit_logs` | actions: `login_failed, otp_failed, rate_limited` in last hour |
| New registrations last hour | `audit_logs` | `action = 'register'` in last hour |

### Tier 2: Daily Trends (refresh every 5 min)

| Metric | Source |
|---|---|
| New registrations per day | `audit_logs action='register'` grouped by date |
| Logins per day | `audit_logs action='login'` grouped by date |
| OTP sends per day | `audit_logs action='otp_sent'` grouped by date |
| SSO exchanges per day | `audit_logs action='sso_exchange'` grouped by date |
| App provisioning per day | `audit_logs action='app_provisioned'` grouped by date |
| Session revocations per day | `audit_logs action='session_revoked'` grouped by date |

### Tier 3: Security Signals (refresh every 5 min)

| Metric | Source |
|---|---|
| Rate-limit triggers (last 24h) | `audit_logs action='rate_limited'` |
| Redirect rejections (last 24h) | `audit_logs action='redirect_rejected'` |
| Suspicious login events | `audit_logs action='login_failed'` from new countries |
| Account suspensions (last 30d) | `audit_logs action='account_suspended'` |
| Recovery attempts (last 7d) | Will add `action='account_recovery_attempted'` |
| Data export requests (last 30d) | `audit_logs action='data_export_requested'` |

### Tier 4: Product Distribution (refresh hourly)

| Metric | Source |
|---|---|
| SSO exchanges by app_id | `audit_logs action='sso_exchange' GROUP BY metadata->>'appId'` |
| App provisioning by product | `audit_logs action='app_provisioned' GROUP BY metadata->>'app_id'` |
| Login method distribution | OTP vs password vs SSO |
| Top 10 countries by registrations | `auth_users + auth_login_history` with country from CF headers |
| Device type breakdown | `auth_devices.device_type GROUP BY` |

---

## QUERY LAYER

All metrics computed directly from Supabase. No intermediate data warehouse needed for V1.

### Example: OTP success rate (last hour)

```sql
SELECT
  COUNT(*) FILTER (WHERE action = 'otp_verified') AS successes,
  COUNT(*) FILTER (WHERE action = 'otp_failed')   AS failures,
  ROUND(
    COUNT(*) FILTER (WHERE action = 'otp_verified')::numeric /
    NULLIF(COUNT(*) FILTER (WHERE action IN ('otp_verified', 'otp_failed')), 0) * 100,
    1
  ) AS success_rate_pct
FROM audit_logs
WHERE created_at > now() - interval '1 hour';
```

### Example: Daily registrations (last 30 days)

```sql
SELECT
  DATE(created_at) AS date,
  COUNT(*) AS registrations
FROM audit_logs
WHERE action = 'register'
  AND created_at > now() - interval '30 days'
GROUP BY DATE(created_at)
ORDER BY date;
```

### Example: SSO by product

```sql
SELECT
  metadata->>'appId' AS app_id,
  COUNT(*) AS exchanges,
  DATE(created_at) AS date
FROM audit_logs
WHERE action = 'sso_exchange'
  AND created_at > now() - interval '7 days'
GROUP BY app_id, date
ORDER BY date DESC, exchanges DESC;
```

---

## ALERT THRESHOLDS

Automatically surface alerts in the founder dashboard when:

| Condition | Threshold | Severity |
|---|---|---|
| OTP success rate drops | < 80% in any 1-hour window | 🔴 Critical |
| Login failure rate spikes | > 30% in any 15-min window | 🔴 Critical |
| Rate limit triggers surge | > 50 in any 5-min window | 🟡 Warning |
| Zero registrations | 6+ hours with no new `register` events | 🟡 Warning |
| SSO exchange errors | > 10 failures in 1 hour | 🟡 Warning |
| Redirect rejection spike | > 20 in any 1 hour | 🔴 Critical (possible phishing attempt) |

**Delivery:** Alerts surface in the admin.rald.cloud dashboard banner. Phase 2: send to a Loop room or WhatsApp group for the engineering team.

---

## DASHBOARD UI LAYOUT (admin.rald.cloud → Auth Health)

```
┌─────────────────────────────────────────────────────────────────┐
│  RALD AUTH — HEALTH OVERVIEW              Updated: 14:32 UTC    │
├──────────────┬──────────────┬──────────────┬───────────────────┤
│ OTP Success  │ Login Rate   │ Active       │ New Users         │
│    94.2%     │   97.8%      │ Sessions     │  Today            │
│  last hour   │  last hour   │    1,247     │    83             │
│  🟢 Healthy  │  🟢 Healthy  │              │                   │
├──────────────┴──────────────┴──────────────┴───────────────────┤
│  REGISTRATIONS — LAST 30 DAYS                                   │
│  [bar chart: daily new users]                                   │
├─────────────────────────────────────────────────────────────────┤
│  SSO EXCHANGES — BY PRODUCT                                     │
│  loop: 4,821  messenger: 2,103  payrald: 0  business: 0        │
│  [line chart: daily by product]                                 │
├─────────────────────────────────────────────────────────────────┤
│  SECURITY SIGNALS                                               │
│  Rate limits (24h): 12      ○ Normal                           │
│  Redirect rejections (24h): 3  ○ Normal                        │
│  Login failures (24h): 47   ○ Normal                           │
│  Suspicious events: 0       ✅ Clean                           │
├─────────────────────────────────────────────────────────────────┤
│  TOP COUNTRIES                    DEVICE TYPES                  │
│  🇳🇬 Nigeria: 78%               Mobile: 84%                    │
│  🇬🇭 Ghana: 8%                  Desktop: 14%                   │
│  🇰🇪 Kenya: 5%                  Tablet: 2%                     │
│  🇿🇦 South Africa: 3%                                          │
│  Other: 6%                                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## OBSERVABILITY ENDPOINTS (for admin.rald.cloud)

```
GET  /admin/auth/metrics/realtime    — Tier 1 metrics (requires admin JWT)
GET  /admin/auth/metrics/daily       — Tier 2 daily trends (requires admin JWT)
GET  /admin/auth/metrics/security    — Tier 3 security signals (requires admin JWT)
GET  /admin/auth/metrics/products    — Tier 4 product distribution (requires admin JWT)
GET  /admin/auth/alerts              — active threshold alerts
```

All admin endpoints require `role: "admin"` in the JWT payload.

---

## AUDIT LOG ENRICHMENT (to add)

Currently missing from `audit_logs` for observability purposes:

```sql
ALTER TABLE audit_logs ADD COLUMN country text NULL;   -- from CF-IPCountry header
ALTER TABLE audit_logs ADD COLUMN city    text NULL;   -- from CF-IPCity header
ALTER TABLE audit_logs ADD COLUMN app_id  text NULL;   -- denormalized from metadata
ALTER TABLE audit_logs ADD COLUMN method  text NULL;   -- "otp" | "password" | "sso"
```

This enables geographic and product-level analysis without JSON metadata parsing.

---

## IMPLEMENTATION PRIORITY

| Item | Sprint | Effort |
|---|---|---|
| `GET /admin/auth/metrics/realtime` endpoint | Sprint 2 | 2 days |
| `GET /admin/auth/metrics/daily` endpoint | Sprint 2 | 1 day |
| Auth Health tab in admin.rald.cloud | Sprint 2 | 3 days |
| Alert threshold detection | Sprint 3 | 2 days |
| Country/city columns in `audit_logs` | Sprint 2 | 0.5 day |
| Product distribution metrics | Sprint 3 | 1 day |
| Suspicious event detection rules | Sprint 3 | 2 days |

---

*AUTH_OBSERVABILITY_SPEC.md — LILCKY STUDIO LIMITED | 2026-06-09*
