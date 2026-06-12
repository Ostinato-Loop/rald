# SELF-HEALING STATUS REPORT
**Generated:** 2026-06-12  
**Authority:** Phase 3 — Principal DevOps + Security Engineer  
**Status:** Partial. Health KV pattern exists. Automation not wired.  
**Classification:** OFFICIAL — SOURCE OF TRUTH

---

## EXECUTIVE SUMMARY

The infrastructure has building blocks for self-healing (Cloudflare Queues in Loop, HEALTH_KV in Realtime, machine identity rotation alerts, Durable Objects for coordination) but no central automation layer ties them together. This report defines what must be built.

---

## EXISTING SELF-HEALING COMPONENTS

| Component | Location | Function | Status |
|---|---|---|---|
| CleanupCoordinator Durable Object | Loop Worker | Coordinates room cleanup | ✅ Running |
| HEALTH_KV | rald-realtime | Tracks provider health state | ✅ Active |
| PROVIDER_STATE_KV | rald-realtime | LiveKit/RealtimeKit/Tencent state | ✅ Active |
| Rotation alerts view | rald-auth-core | `machine_identity_rotation_alerts` | ✅ Schema ready |
| loop-tasks queue | Loop Worker | Async task processing | ✅ Active |
| Supabase Edge Functions | messenger | Retention cohort scoring | ✅ Deployed (not scheduled) |
| Observability | All workers | CF Workers built-in logs | ✅ Active |
| OpenObserve | All workers | Centralized log shipping | ❌ Not configured |

---

## HEALTH MONITORING

### Current Uptime Monitoring

| Service | Monitor | Alerting | Status |
|---|---|---|---|
| loop.rald.cloud | Uptime workflow in loop repo (`.github/workflows/uptime.yml`) | GitHub Actions | ✅ Active |
| auth.rald.cloud | None configured | None | ❌ Missing |
| notification.rald.cloud | None configured | None | ❌ Missing |
| messenger.rald.cloud | None configured | None | ❌ Missing |
| realtime.rald.cloud | HEALTH_KV internal | None external | ⚠️ Internal only |

### Health Check Endpoints (All Confirmed Live)

```
GET auth.rald.cloud/health
GET loop-api.rald.cloud/health
GET messenger.rald.cloud/health
GET notification.rald.cloud/health (or /api/health)
GET search.rald.cloud/health
GET realtime.rald.cloud/health
GET admin.rald.cloud/health (control-center API)
```

### Phase 3 Implementation — Ecosystem Health Monitor

**Add to `rald-control-center/apps/api`:**

```typescript
// GET /api/health/ecosystem — polls all services
const SERVICES = [
  { name: "auth",       url: "https://auth.rald.cloud/health" },
  { name: "loop-api",   url: "https://loop-api.rald.cloud/health" },
  { name: "messenger",  url: "https://messenger.rald.cloud/health" },
  { name: "notify",     url: "https://notification.rald.cloud/health" },
  { name: "search",     url: "https://search.rald.cloud/health" },
  { name: "realtime",   url: "https://realtime.rald.cloud/health" },
  { name: "inbox",      url: "https://inbox.rald.cloud/health" },
];

// Run every 5 minutes via cron
// Store results in: ecosystem_health_snapshots table
// Alert via: rald-notify if service goes down 3 consecutive checks
```

---

## AUTOMATED REMEDIATION

### What Can Be Automated (No Payment Required)

| Failure | Detection | Auto-Remediation | Implementation |
|---|---|---|---|
| Service health check fails | Cron poll | Alert via rald-notify (push + email to admin) | Phase 3 |
| Machine token approaching expiry | rotation_alerts view | Alert admin, generate new key candidate | Phase 3 |
| Expired sessions accumulating | Row count threshold | Trigger cleanup job | Phase 1 (session cleanup) |
| Stale OTPs | Row count + age | Delete via scheduled cron | Phase 1 |
| Orphaned devices | Last seen age | Mark inactive, delete after 90 days | Phase 1 |
| Notify delivery failure | Delivery status | Retry queue (exponential backoff) | Phase 1 |
| Room participant stuck | CleanupCoordinator DO | Already handles this | ✅ Done |

### What MUST NOT Be Automated (Payment Protection — Rule #12)

| Action | Reason |
|---|---|
| Supabase plan upgrades | Financial transaction |
| Cloudflare Workers paid plan changes | Financial transaction |
| SMS purchase (Termii credits) | Financial transaction |
| App store payments | Financial transaction |
| Infrastructure scaling (K8s node pools) | Financial transaction |
| LLM API billing (OpenRouter, etc.) | Financial transaction |

---

## TOKEN AUTOMATION

### Machine Identity Rotation

**Current State:** `machine_identity_rotation_alerts` view exists in Supabase. Alerts when `rotation_due_at < NOW() + INTERVAL '7 days'`.

**Missing:** Nothing queries this view automatically. No alert is fired.

**Phase 3 Implementation:**

```typescript
// In rald-auth-core scheduled handler (runs daily at midnight)
export async function handleScheduled(event: ScheduledEvent, env: Bindings) {
  if (event.cron === "0 0 * * *") {
    await runTokenRotationAlerts(env);
    await runSessionCleanup(env);
    await runOtpCleanup(env);
    await runDeviceCleanup(env);
  }
  if (event.cron === "*/5 * * * *") {
    await runHealthChecks(env);
  }
}

async function runTokenRotationAlerts(env: Bindings) {
  const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const { data } = await db.from("machine_identity_rotation_alerts").select("*");
  if (data?.length) {
    // Send alert via notify service to admin
    await fetch("https://notification.rald.cloud/api/notifications", {
      method: "POST",
      headers: { "Authorization": `Bearer ${machineToken}` },
      body: JSON.stringify({
        user_id: env.ADMIN_USER_ID,
        type: "machine_token_rotation",
        title: `${data.length} machine token(s) due for rotation`,
        body: data.map(d => `${d.service_name}: due ${d.rotation_due_at}`).join("\n"),
        channel: "email"
      })
    });
  }
}
```

### Session Token Cleanup

```typescript
async function runSessionCleanup(env: Bindings) {
  const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  
  // Expired sessions
  await db.from("auth_sessions")
    .delete()
    .lt("expires_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
  
  // Stale OTPs (older than 15 minutes)
  await db.from("auth_otp_codes")
    .delete()
    .lt("expires_at", new Date(Date.now() - 15 * 60 * 1000).toISOString());
  
  // Inactive devices (no activity in 90 days)
  await db.from("auth_devices")
    .update({ status: "inactive" })
    .lt("last_seen_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
    .eq("status", "active");
}
```

---

## AUDIT AUTOMATION

### Audit Log Generation

**Already implemented:**
- `writeAuditLog()` in `rald-auth-core/src/lib/audit.ts` — called on every significant action
- Audit logs stored in Supabase `auth_audit_logs` table
- Developer audit via `GET /developer/audit`

**Missing:**
- Automated audit report generation (daily/weekly summary)
- Anomaly detection on audit logs (unusual login patterns, bulk operations)
- Audit log export to OpenObserve for long-term retention

### Phase 3 Audit Automation Implementation

```typescript
// Daily audit summary (runs at 08:00 UTC)
async function generateDailyAuditSummary(env: Bindings) {
  const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  const { data: summary } = await db.rpc("generate_audit_summary", {
    from_date: yesterday,
    to_date: new Date().toISOString()
  });
  
  // Store in audit_daily_reports table
  // Send to admin via rald-notify
}
```

---

## WRANGLER.TOML CHANGES REQUIRED

For `rald-auth-core`, add scheduled handlers:

```toml
[triggers]
crons = [
  "*/5 * * * *",   # Health checks + notify retry
  "0 * * * *",     # Hourly cleanup (OTPs, stale sessions)
  "0 0 * * *"      # Daily: token rotation alerts, audit summary, device cleanup
]
```

**Note:** Requires Cloudflare API token with `Workers Scripts:Edit` + `Scheduled Tasks:Edit` scopes. If token doesn't have these scopes, add via CF Dashboard manually (same as P0-002 for rald-notify).

---

## OBSERVABILITY PLAN

### OpenObserve Integration (C-CERT-004)

All workers already have the `requestLogger` middleware that ships to OpenObserve when `OPEN_OBSERVE_API_KEY` and `OPEN_OBSERVE_ENDPOINT` are set. The implementation is complete — only secrets are missing.

**Endpoint pattern per service:**
```
https://observe.rald.cloud/api/rald/<service-name>/_json
```

**Secrets needed (push via wrangler):**
```bash
# For each service (auth, notify, search, realtime, inbox, loop-api, messenger):
wrangler secret put OPEN_OBSERVE_API_KEY
wrangler secret put OPEN_OBSERVE_ENDPOINT
```

### Log Correlation Strategy

Every request already gets a `X-Request-ID` header. Workers log this ID. To trace a request across services:
1. auth.rald.cloud receives request, logs `{ request_id, user_id, action }`
2. Loop Worker calls rald-notify with same `X-Request-ID` forwarded
3. rald-notify logs `{ request_id, delivery_id, channel }`
4. Search in OpenObserve by `request_id` to see full cross-service trace

---

## PHASE 3 TASK LIST

| Task | Repo | Effort | Dependency |
|---|---|---|---|
| Add scheduled handler to rald-auth-core | rald-auth-core | 2h | CF token scopes |
| Session/OTP/device cleanup job | rald-auth-core | 2h | Scheduled handler |
| Token rotation alert job | rald-auth-core | 1h | Scheduled handler + notify keys provisioned |
| Ecosystem health check poll | rald-control-center | 3h | None |
| Health check alerting via notify | rald-auth-core | 1h | Machine identity keys |
| OpenObserve secrets pushed | All 7 workers | 30min | OpenObserve API key |
| Audit daily summary job | rald-auth-core | 2h | Scheduled handler |
| Notify retry queue + DLQ | rald-notify | 4h | CF Queues binding |
| Anomaly detection on audit logs | rald-auth-core | 4h | Audit summary job |

**Total estimated effort: ~20 hours**

---

*Report generated by Principal DevOps + Security Engineer · RALD Platform Engineering · LILCKY STUDIO LIMITED · 2026-06-12*
