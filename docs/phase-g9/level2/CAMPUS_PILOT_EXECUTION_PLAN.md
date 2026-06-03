# CAMPUS_PILOT_EXECUTION_PLAN.md
**Phase:** G.9 Level 2 Remediation — Phase L2.8  
**Owner:** LILCKY STUDIO LIMITED  
**Date:** 2026-06-02  
**Authorization:** LEVEL 2 — CAMPUS PILOT AUTHORIZED  
**Scope:** 50–200 students, Messenger-only, controlled cohort

---

## PILOT DEFINITION

### What This Is

A controlled, invitation-only deployment of RALD Messenger to a defined student cohort. This is NOT a public launch. It is a real-world behavior study under controlled conditions.

**Goal:** Collect real user behavior data to validate:
- Onboarding flow (OTP registration, display name, first message)
- Retention (do students come back?)
- Friction points (where do they drop off?)
- Infrastructure resilience (does it hold under 50–200 real users?)

### What This Is Not

- Not a public launch
- Not national rollout
- Not Phase H (new features)
- Not Loop deployment (separate, future cohort)
- Not a marketing event

---

## PILOT SCOPE

| Dimension | Decision |
|---|---|
| **Primary product** | Messenger (`messenger.rald.cloud`) |
| **Secondary product** | None (Loop is excluded from this pilot) |
| **Cohort size** | 50–200 students |
| **Duration** | 30 days (with 7-day early review checkpoint) |
| **Enrollment method** | Operator-controlled distribution link |
| **Access control** | No invite code required — URL-based controlled distribution |
| **Geography** | Single campus (Nigeria — consistent with Termii SMS coverage) |
| **Platform** | Mobile web (PWA) + desktop web |

---

## OPERATOR READINESS CHECKLIST

All items must be COMPLETE before inviting the first student.

### HARD REQUIREMENTS — BLOCKING

| # | Action | Owner | Verification |
|---|---|---|---|
| 1 | Rotate Supabase anon key (Settings → API → Regenerate) | Operator | New key set in GitHub Secrets `SUPABASE_ANON_KEY`, Loop CI re-run |
| 2 | Create RATE_LIMIT_KV namespace: `wrangler kv namespace create rald-auth-rate-limit` | Operator | ID updated in `rald-auth-core/wrangler.toml`, pushed, worker redeployed |
| 3 | Set all rald-auth-core secrets: `wrangler secret list --name rald-auth` (all 6 must appear) | Operator | `curl https://auth.rald.cloud/ready` returns `"ready": true, "rate_limiting": true` |
| 4 | Apply `audit_logs` DDL in Supabase SQL Editor | Operator | `SELECT COUNT(*) FROM audit_logs` returns 0 (no error) |
| 5 | Verify Messenger worker health: `curl https://messenger.rald.cloud/health` | Operator | HTTP 200 |
| 6 | Verify auth worker health: `curl https://auth.rald.cloud/ready` | Operator | `"ready": true` |
| 7 | Set VAPID secrets in Messenger GitHub Secrets (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`) | Operator | Re-run Messenger CI/CD deploy |

### STRONGLY RECOMMENDED — NON-BLOCKING

| # | Action | Rationale |
|---|---|---|
| 8 | Upgrade Supabase to Pro ($25/month) | 7-day backup + PgBouncer connection pooler |
| 9 | Fund Termii ≥1,000 SMS credits | 200 students × 3 OTPs average = 600 SMS; 1,000 = 1.67× buffer |
| 10 | Verify Resend domain `rald.cloud` status | Email delivery for password reset |
| 11 | Add `support@rald.cloud` to Messenger footer | Pilot user support channel |
| 12 | Configure Resend to receive `support@rald.cloud` inbound | Review and respond to pilot issues |
| 13 | Define a cohort list (student emails or group) | Controlled distribution tracking |

---

## PILOT LAUNCH SEQUENCE

### Pre-Launch (T-7 days)

1. Complete all 7 hard requirements above
2. Internal smoke test: 5 team members register, send messages, log out, log back in
3. Verify audit_logs capture events: `SELECT action, COUNT(*) FROM audit_logs GROUP BY action`
4. Confirm Termii balance
5. Draft pilot announcement message for cohort

### Soft Launch (T-0)

1. Share `messenger.rald.cloud` URL with pilot cohort (not public posting)
2. Monitor first 30 minutes: watch Cloudflare dashboard for error rates
3. Watch Supabase for unusual query patterns
4. Watch Termii for OTP send rate
5. Have rollback plan ready: `wrangler rollback --name loop-messenger-api`

### Day 7 Review

Pull metrics (see KPI section) and evaluate against targets. If targets are severely missed, pause and diagnose before continuing.

### Day 30 Final

Full KPI report. Decision point for:
- Expand pilot (more students)
- Continue as-is for more data
- Begin Level 3 remediation (cross-app SSO + Phase H planning)

---

## USER JOURNEYS TO VERIFY

### Journey 1 — New Student Registration

```
1. Open messenger.rald.cloud on mobile
2. Tap "Get Started"
3. Enter Nigerian phone number (+234...)
4. Receive OTP via Termii SMS within 30 seconds
5. Enter 6-digit code
6. Enter display name (e.g., "Tunde Adeyemi")
7. Arrive at /chats
8. Create first room or join existing
9. Send first message
```

**Success criteria:** Steps 1–9 complete in under 2 minutes. OTP delivered.

### Journey 2 — Returning Student Login

```
1. Open messenger.rald.cloud on same device
2. localStorage token found → direct to /chats (no login prompt)
3. Sessions across devices: phone entry → OTP → /chats
```

**Success criteria:** Returning user on same device sees /chats without re-entering phone.

### Journey 3 — Group Conversation

```
1. Student A creates a room (e.g., "CS 301 Study Group")
2. Student A shares room link or room code
3. Students B, C, D join
4. Students exchange messages
5. Real-time delivery confirmed
```

**Success criteria:** Messages appear on all devices within 2 seconds.

### Journey 4 — OTP Resilience

```
1. Student enters phone
2. OTP not received after 30 seconds
3. Student taps "Resend"
4. Second OTP arrives
5. Student enters code — authenticates successfully
```

**Success criteria:** Resend works. Second OTP valid. First OTP invalidated or still valid (both acceptable for pilot).

---

## KEY PERFORMANCE INDICATORS

### Registration + Activation

| KPI | Definition | Target (30 days) |
|---|---|---|
| **Registrations** | `SELECT COUNT(DISTINCT id) FROM users` where `created_at` within pilot window | ≥80% of invited cohort |
| **OTP Success Rate** | `SELECT COUNT(*) FROM audit_logs WHERE action = 'otp_verified' AND status = 'success'` / `COUNT(*) WHERE action = 'otp_sent'` | ≥85% |
| **Registration Completion** | Users who reach /chats / Users who requested OTP | ≥70% |
| **Time-to-First-Message** | Median minutes from registration to first message sent | ≤5 minutes |

### Engagement

| KPI | Definition | Target |
|---|---|---|
| **DAU** | `SELECT COUNT(DISTINCT user_id) FROM messenger_messages WHERE DATE(created_at) = CURRENT_DATE` | ≥40% of registered |
| **WAU** | Unique users with activity in any 7-day window | ≥55% of registered |
| **Messages Sent (Week 1)** | `SELECT COUNT(*) FROM messenger_messages WHERE created_at < (pilot_start + INTERVAL '7 days')` | ≥2,000 |
| **Rooms Created** | `SELECT COUNT(*) FROM messenger_conversations WHERE type = 'group'` | ≥20 |
| **Messages per DAU** | Total messages / DAU (daily average) | ≥5 |

### Retention

| KPI | Definition | Target |
|---|---|---|
| **Day-1 Retention** | Users active on Day 1 / Total registered Day 0 | ≥60% |
| **Day-7 Retention** | Users active on Day 7 / Users registered Day 0-3 | ≥35% |
| **Day-30 Retention** | Users active on Day 30 / Total registered | ≥20% |

### Infrastructure + Reliability

| KPI | Definition | Target |
|---|---|---|
| **OTP Delivery Latency** | Termii SMS delivery within 30 seconds | ≥90% of OTPs |
| **Auth Error Rate** | HTTP 5xx from auth.rald.cloud / total auth requests | <1% |
| **Messenger Error Rate** | HTTP 5xx from messenger.rald.cloud / total requests | <1% |
| **Uptime** | Hours with <5% error rate / total pilot hours | ≥99% |
| **Rate Limit Events** | `SELECT COUNT(*) FROM audit_logs WHERE action = 'rate_limited'` | <50 (indicates no ongoing attacks) |
| **Notification Delivery Rate** | Push notifications delivered / attempted (VAPID) | ≥70% of subscribed users |

### Support + Quality

| KPI | Definition | Target |
|---|---|---|
| **User-Reported Issues** | Emails to support@rald.cloud per 100 DAU | <5 per week |
| **P0 Incidents** | Events requiring emergency rollback or service restart | 0 |
| **P1 Incidents** | Events degrading service for >15 min | <2 |

---

## MEASUREMENT QUERIES

Run these in Supabase SQL Editor to pull pilot metrics at any time:

```sql
-- Registrations this pilot
SELECT COUNT(*) AS total_registrations,
       MIN(created_at) AS first_registration,
       MAX(created_at) AS last_registration
FROM users
WHERE created_at >= '2026-06-09'; -- replace with pilot start date

-- DAU over pilot period
SELECT DATE(created_at) AS day, COUNT(DISTINCT user_id) AS dau
FROM messenger_messages
WHERE created_at >= '2026-06-09'
GROUP BY DATE(created_at)
ORDER BY day;

-- OTP success rate
SELECT
  SUM(CASE WHEN action = 'otp_sent' AND status = 'success' THEN 1 ELSE 0 END) AS sent,
  SUM(CASE WHEN action = 'otp_verified' AND status = 'success' THEN 1 ELSE 0 END) AS verified,
  ROUND(100.0 *
    SUM(CASE WHEN action = 'otp_verified' AND status = 'success' THEN 1 ELSE 0 END) /
    NULLIF(SUM(CASE WHEN action = 'otp_sent' THEN 1 ELSE 0 END), 0), 1) AS success_rate_pct
FROM audit_logs
WHERE created_at >= '2026-06-09';

-- Rate limit events (security monitoring)
SELECT metadata->>'reason' AS reason, COUNT(*) AS blocked_count
FROM audit_logs
WHERE action = 'rate_limited'
  AND created_at >= '2026-06-09'
GROUP BY reason
ORDER BY blocked_count DESC;

-- Day-7 retention
WITH cohort AS (
  SELECT id, DATE(created_at) AS reg_date FROM users WHERE created_at >= '2026-06-09'
),
active AS (
  SELECT DISTINCT user_id FROM messenger_messages
  WHERE created_at >= '2026-06-09' + INTERVAL '7 days'
    AND created_at < '2026-06-09' + INTERVAL '8 days'
)
SELECT
  COUNT(c.id) AS cohort_size,
  COUNT(a.user_id) AS retained,
  ROUND(100.0 * COUNT(a.user_id) / NULLIF(COUNT(c.id), 0), 1) AS retention_pct
FROM cohort c
LEFT JOIN active a ON c.id = a.user_id;

-- Messages per day
SELECT DATE(created_at) AS day, COUNT(*) AS messages_sent
FROM messenger_messages
WHERE created_at >= '2026-06-09'
GROUP BY DATE(created_at)
ORDER BY day;

-- Support proxy: login failures (friction indicator)
SELECT DATE(created_at) AS day, COUNT(*) AS login_failures
FROM audit_logs
WHERE action = 'login_failed'
  AND created_at >= '2026-06-09'
GROUP BY DATE(created_at)
ORDER BY day;
```

---

## INCIDENT RESPONSE — PILOT

### P0 — Service Down (all users affected)

```
1. Identify: curl https://messenger.rald.cloud/health → not 200
2. Check CF dashboard: Workers → loop-messenger-api → Recent errors
3. Rollback if recent deploy: wrangler rollback --name loop-messenger-api
4. If Supabase: check supabase.com/dashboard status page
5. Communicate to cohort via WhatsApp/email within 15 minutes
6. Resolve target: <1 hour
```

### P1 — Partial Degradation (OTP delays, message lag)

```
1. Check Termii dashboard for SMS queue
2. Check Cloudflare Worker CPU metrics
3. Check Supabase connection pool usage
4. If Termii: wait (carrier delay) or switch sender_id to N-Alert
5. If Supabase pool: connection surge — check for query without limit
6. Resolve target: <4 hours
```

### P2 — Individual User Issue

```
1. User contacts support@rald.cloud
2. Look up user: SELECT * FROM users WHERE metadata->>'phone' = '<phone>'
3. Check audit_logs: SELECT * FROM audit_logs WHERE user_id = '<id>' ORDER BY created_at DESC LIMIT 20
4. Common fixes: clear localStorage (ask user), re-send OTP, check if rate-limited
5. Resolve target: <24 hours
```

---

## ROLLBACK PLAN

If the pilot reveals critical infrastructure issues:

```bash
# Rollback Messenger worker to previous version
wrangler rollback --name loop-messenger-api

# Rollback auth worker to previous version
wrangler rollback --name rald-auth

# Communicate to cohort
# Announce maintenance window
# Fix issue, re-deploy, reopen
```

No student data is lost during a rollback — Supabase data persists independently of worker versions.

---

## PILOT COMMS TEMPLATE

### Cohort Invitation

```
Subject: [RALD] You're invited to try RALD Messenger — Campus Pilot

Hi [Name],

You've been selected for an early access pilot of RALD Messenger.

RALD Messenger is a group messaging app designed for Nigerian university students.

To get started:
→ Open messenger.rald.cloud on your phone
→ Enter your phone number and verify with the code we send
→ Set your display name
→ Start messaging

This is a controlled pilot. Your feedback shapes the product.

For any issues: support@rald.cloud

See you inside,
RALD Team
```

### Cohort Support Auto-Reply

```
Thanks for reaching out to RALD Support.

We're actively monitoring the campus pilot and will respond within 24 hours.

If you're experiencing a login issue:
• Make sure you're at messenger.rald.cloud
• Try clearing your browser cache
• If OTP didn't arrive, wait 60 seconds and request a new one

— RALD Team
```

---

## SUCCESS CRITERIA — LEVEL 3 GATE

After the 30-day pilot, Level 3 (Public Beta) planning may begin if ALL of the following are met:

| Gate | Metric | Threshold |
|---|---|---|
| G1 | Day-7 retention | ≥35% |
| G2 | OTP success rate | ≥85% |
| G3 | P0 incidents | 0 during pilot |
| G4 | Registered students | ≥50 |
| G5 | Messages sent | ≥5,000 total |
| G6 | Error rate | <1% sustained |
| G7 | User issues | <5/week per 100 DAU |

If any gate is not met: diagnose, fix, extend pilot before Level 3.

---

## CERTIFICATION DECISION

```
╔══════════════════════════════════════════════════════════════╗
║  PHASE L2.8 — CAMPUS PILOT EXECUTION PLAN                    ║
║                                                              ║
║  Pilot scope defined:        ✅ 50–200 students, Messenger   ║
║  Launch sequence documented: ✅                              ║
║  User journeys defined:      ✅ 4 key journeys               ║
║  KPIs defined:               ✅ 15 metrics across 4 groups   ║
║  SQL queries provided:       ✅ Ready to run in Supabase     ║
║  Incident response:          ✅ P0/P1/P2 procedures          ║
║  Rollback plan:              ✅ wrangler rollback documented  ║
║  Level 3 gate criteria:      ✅ 7 pass/fail thresholds       ║
║                                                              ║
║  STATUS: ✅ COMPLETE                                          ║
╚══════════════════════════════════════════════════════════════╝
```

LILCKY STUDIO LIMITED — RALD G.9 Level 2 Remediation | 2026-06-02
