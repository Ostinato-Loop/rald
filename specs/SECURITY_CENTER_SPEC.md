# SECURITY CENTER SPECIFICATION
**Agent 4 (FOUR) — Security and Threat Response**
Version: 1.0.0
Issued: 2026-06-05
Issuer: LILCKY STUDIO LIMITED
Status: CANONICAL

---

## 1. MANDATE

Agent 4 (FOUR) is the sole agent responsible for:
- Abuse detection
- Credential monitoring
- Rate limit violations
- Agent misuse detection
- System anomaly detection

MIKA supports FOUR with classification and analysis.

---

## 2. THREAT CATEGORIES

| Category | Severity | Auto-Block | WIZMAC Log |
|----------|----------|-----------|-----------|
| SQL Injection attempt | HIGH | ✅ Yes | ✅ Permanent |
| Prompt injection | HIGH | ✅ Yes | ✅ Permanent |
| Credential in request | CRITICAL | ✅ Yes | ✅ Permanent |
| Rate limit exceeded | MEDIUM | 🔄 Throttle | ✅ Permanent |
| Agent permission violation | HIGH | ✅ Yes | ✅ Permanent |
| Unusual traffic pattern | MEDIUM | ❌ Alert only | ✅ Permanent |
| Failed auth spike | HIGH | ✅ Yes (15min) | ✅ Permanent |
| Data exfiltration pattern | CRITICAL | ✅ Yes | ✅ Permanent |

---

## 3. SECURITY DASHBOARDS

The Security Center exposes at `/api/observe/security`:

- Total events (24h / 7d / 30d)
- By severity: critical / high / medium / low
- Unresolved events
- High-risk requests
- Top offending IPs
- Agent misuse events

---

## 4. INCIDENT RESPONSE

```
FOUR detects threat
  │
  ▼
Generate security_event (severity, actor, description)
  │
  ▼
WIZMAC records permanently
  │
  ▼
If severity >= HIGH:
  DRAGULA sends alert notification
  SEKANI suspends actor session
  │
  ▼
If severity = CRITICAL:
  Auto-block IP/actor
  SEKANI escalates to human administrator
  DRAGULA sends urgent notification
```

---

## 5. AGENT MISUSE DETECTION

FOUR monitors all agent actions for:
- Agents attempting actions beyond their permission scope
- Agents attempting to bypass BBC
- Agents writing permanent memory (only WIZMAC can)
- Agents directly calling model providers

All violations logged, escalated, and stored in WIZMAC.

---

## 6. COMPLIANCE

All security events stored in WIZMAC permanently.
FOUR provides monthly security report (via DRAGULA).
Annual security audit required.

*SECURITY_CENTER_SPEC V1 — LILCKY STUDIO LIMITED — 2026*
