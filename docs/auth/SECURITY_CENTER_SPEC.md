# SECURITY_CENTER_SPEC.md
**RALD Auth V1 — Security Center**
**Date:** 2026-06-09 | **Authority:** RALD Auth V1 Lockdown Directive
**LILCKY STUDIO LIMITED**

---

## VISION

Every RALD user has a Security Center at `profiles.rald.cloud/security` — a Google Account Security Checkup equivalent — that gives them a real, actionable security posture score with specific recommendations.

---

## SECURITY SCORE MODEL

Score: 0–100. Composed of weighted sub-scores. **Never faked. Always computed from real data.**

| Factor | Weight | How computed |
|---|---|---|
| Phone verified | 20 pts | `auth_users.metadata.phone_verified = true` |
| Email verified | 15 pts | `auth_users.metadata.email_verified = true` |
| Backup email set | 15 pts | `auth_users.backup_email_verified = true` |
| Recovery codes generated | 15 pts | Count of valid codes in `auth_recovery_codes > 0` |
| Trusted device registered | 10 pts | `auth_devices.is_trusted = true` for ≥1 device |
| No suspicious events in 30 days | 10 pts | Zero `audit_logs` with `action IN ('login_failed','rate_limited','redirect_rejected')` in last 30d |
| Password set (not OTP-only) | 10 pts | `auth_users.password_hash IS NOT NULL` |
| Recent activity reviewed | 5 pts | User has visited `/security` tab in last 90 days |

### Score Tiers

| Score | Label | Color |
|---|---|---|
| 0–39 | At Risk | 🔴 Red |
| 40–69 | Needs Attention | 🟡 Amber |
| 70–89 | Good | 🟢 Green |
| 90–100 | Excellent | ✅ Mint |

---

## ENDPOINT: GET /security/score

```json
{
  "score": 75,
  "tier": "Good",
  "factors": {
    "phone_verified":       { "score": 20, "max": 20, "achieved": true },
    "email_verified":       { "score": 15, "max": 15, "achieved": true },
    "backup_email":         { "score": 0,  "max": 15, "achieved": false, "action": "Add a backup email" },
    "recovery_codes":       { "score": 15, "max": 15, "achieved": true },
    "trusted_device":       { "score": 10, "max": 10, "achieved": true },
    "no_suspicious_events": { "score": 10, "max": 10, "achieved": true },
    "password_set":         { "score": 0,  "max": 10, "achieved": false, "action": "Set a password" },
    "activity_reviewed":    { "score": 5,  "max": 5,  "achieved": true }
  },
  "recommendations": [
    { "priority": "high",   "action": "Add a backup email", "href": "/security/backup-email" },
    { "priority": "medium", "action": "Set a password for faster login", "href": "/security/password" }
  ],
  "computed_at": "2026-06-09T14:00:00Z"
}
```

---

## SESSION HISTORY

### Endpoint: GET /security/sessions

Returns last 100 active and recent sessions with full context.

```json
{
  "sessions": [
    {
      "id": "uuid",
      "app_id": "loop",
      "app_name": "Loop",
      "ip_address": "105.112.xx.xx",
      "city": "Lagos",
      "country": "NG",
      "device_name": "iPhone 15 Pro",
      "created_at": "2026-06-09T08:00:00Z",
      "expires_at": "2026-06-10T08:00:00Z",
      "is_current": true,
      "is_active": true
    }
  ],
  "count": 5
}
```

**Source:** `auth_sessions` table + `auth_login_history` table joined on `user_id`.

---

## LOGIN HISTORY

### Endpoint: GET /security/login-history

Returns last 500 login events (successes and failures).

```json
{
  "events": [
    {
      "timestamp": "2026-06-09T14:00:00Z",
      "action": "login",
      "status": "success",
      "app_id": "loop",
      "ip_address": "105.112.xx.xx",
      "city": "Lagos",
      "country": "NG",
      "device": "iPhone 15 Pro",
      "method": "otp"
    },
    {
      "timestamp": "2026-06-07T03:12:00Z",
      "action": "login_failed",
      "status": "failure",
      "ip_address": "41.58.xx.xx",
      "city": "Unknown",
      "country": "RU",
      "note": "Suspicious — unfamiliar location"
    }
  ],
  "total": 247
}
```

**Source:** `audit_logs` table filtered to auth-relevant actions.

---

## SUSPICIOUS ACTIVITY DETECTION

Rules (implemented server-side, evaluated at login):

| Rule | Trigger | Action |
|---|---|---|
| Unfamiliar country | Login from country not seen in last 30 sessions | Flag in login history, send alert |
| Rapid successive failures | ≥5 failed logins in 15 minutes | Rate limit already applied; add `suspicious_event` audit entry |
| Multiple concurrent sessions | >10 active sessions simultaneously | Flag for user review |
| Unusual hour | Login between 01:00–04:00 local time from new device | Flag (soft signal only) |

**"Impossible travel" (future):** Login from Lagos at T=0, login from London at T=5min → flag. Requires storing last-login location per user.

### Endpoint: GET /security/alerts

```json
{
  "alerts": [
    {
      "id": "uuid",
      "type": "unfamiliar_country",
      "severity": "medium",
      "message": "Sign-in from Russia (RU) — not your usual location",
      "timestamp": "2026-06-07T03:12:00Z",
      "dismissed": false
    }
  ],
  "unread_count": 1
}
```

---

## UI SPECIFICATION (`profiles.rald.cloud` → Security tab)

Already scaffolded as "security" tab in Dashboard.tsx.

### Security Score Card

```
┌────────────────────────────────────────────────────┐
│  Security Score                                    │
│                                                    │
│           75 / 100                                 │
│         ██████████████░░░░░                        │
│              Good                                  │
│                                                    │
│  ✅ Phone verified                                 │
│  ✅ Email verified                                 │
│  ✅ Recovery codes active                          │
│  ⚠️  No backup email — Add one →                  │
│  ⚠️  No password set — Set one →                  │
└────────────────────────────────────────────────────┘
```

### Recent Activity Feed

```
  🔑 Signed in · Loop · Lagos · iPhone 15 Pro · Just now
  🔑 Signed in · Messenger · Lagos · iPhone 15 Pro · 2h ago
  ❌ Failed login attempt · 41.58.xx.xx (Russia) · Jun 7 ⚠️
  🔑 Signed in · Loop · Lagos · MacBook · Jun 5
```

---

## ENDPOINTS (FULL SPEC)

```
GET  /security/score          — security score + recommendations
GET  /security/sessions       — active and recent sessions
GET  /security/login-history  — login events (success + failure)
GET  /security/alerts         — suspicious activity alerts
POST /security/alerts/:id/dismiss — dismiss an alert
POST /security/logout-all     — logout all sessions (calls session/revoke-all)
```

---

## IMPLEMENTATION PRIORITY

| Item | Sprint | Effort |
|---|---|---|
| `GET /security/score` endpoint | Sprint 2 | 2 days |
| Login history from `audit_logs` | Sprint 2 | 1 day |
| Active sessions list | Sprint 2 | 1 day |
| Security Center UI | Sprint 2 | 3 days |
| Alert generation on suspicious login | Sprint 3 | 3 days |
| Unfamiliar country detection | Sprint 3 | 2 days |
| Impossible travel detection | Sprint 4 | 3 days |

---

*SECURITY_CENTER_SPEC.md — LILCKY STUDIO LIMITED | 2026-06-09*
