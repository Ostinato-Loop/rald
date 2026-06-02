# ANALYTICS_INTEGRITY_REPORT.md
**Phase:** G.9 — Pre-Production Certification  
**Workstream:** 7 — Analytics Integrity  
**Owner:** LILCKY STUDIO LIMITED  
**Date:** 2026-06-02  
**Evidence Source:** GitHub — Ostinato-Loop org

---

## EVENT VERIFICATION MATRIX

| Event | rald-auth-core | rald/api-worker | Loop | Messenger | CRM |
|---|---|---|---|---|---|
| Registration | ⚠️ DB only | ⚠️ DB only | ⚠️ DB only | ⚠️ DB only | N/A |
| Login | ⚠️ DB only | ⚠️ DB only | ⚠️ DB only | ⚠️ DB only | N/A |
| Logout | ⚠️ DB (revoked_at) | ⚠️ DB only | ❌ Client-only | ❌ Client-only | N/A |
| OTP sent | ❌ Not tracked | ✅ Rate-limit KV | ❌ Not tracked | ✅ logger.warn on fail | N/A |
| OTP success | ⚠️ DB only | ⚠️ DB only | ❌ Client-only | ⚠️ DB only | N/A |
| OTP failure | ⚠️ DB only | ⚠️ DB only | ❌ Client-only | ✅ logger.warn | N/A |
| Room created | N/A | N/A | ⚠️ DB only | N/A | N/A |
| Room joined | N/A | N/A | ⚠️ DB only | N/A | N/A |
| Message sent | N/A | N/A | ⚠️ DB only | ✅ Audit log | N/A |
| Notification delivered | N/A | N/A | N/A | ✅ Triggered (no confirm) | N/A |
| Search executed | N/A | N/A | N/A | ✅ Indexed | N/A |

**Legend:**  
✅ = Analytics event forwarded to structured pipeline  
⚠️ = Data persisted in database but not forwarded to analytics  
❌ = Not tracked  

---

## 1. ANALYTICS INFRASTRUCTURE STATUS

### rald-observability (`Ostinato-Loop/rald-observability`)
- Repository exists: README only — "RALD Observability - Structured logging, metrics, Sentry, CloudWatch"
- **No source code.** No endpoint. No SDK. No collection pipeline.
- **Status:** ❌ DOES NOT EXIST

### Cloudflare Workers Observability (built-in)
All CF Workers have:
```toml
[observability]
enabled = true
head_sampling_rate = 1
```
This provides automatic CF-layer metrics (request count, CPU time, error rate) visible in Cloudflare Dashboard. This is infrastructure telemetry, NOT product analytics.

### Audit Logs (available for analytics queries)
- `messenger_audit_log` — 22 event types (append-only Supabase table)
- `crm_audit_log` — 9 event types (append-only Supabase table)
- `auth_sessions` — session lifecycle data (not structured analytics)

These tables CAN be queried for analytics but require direct Supabase SQL access. No API layer, no dashboard, no automated reporting.

---

## 2. EVENT NAMING CONSISTENCY

### Current event names in use

**Messenger audit log:**
```
conversation.created, conversation.updated, conversation.archived, conversation.deleted,
message.sent, message.edited, message.deleted,
reaction.added, reaction.removed,
member.added, member.removed, member.role_changed, member.left,
assignment.created, assignment.removed,
attachment.uploaded, conversation.customer_linked, conversation.inbox_sync,
search.indexed, notification.triggered,
member.muted, member.archived
```

**CRM audit log:**
```
workspace.created, workspace.member_added,
customer.created, customer.updated, customer.deleted,
customer.merged, customer.merge_rolled_back,
segment.created, segment.deleted
```

**Pattern:** Both use `domain.action` format consistently. ✅

**rald-auth-core:** No structured event emission. No naming convention applied.

**FINDING (MEDIUM — WS7-F1):** `domain.action` naming convention is used in Messenger and CRM but not documented as an ecosystem standard. rald-auth-core uses no events.

---

## 3. AUDIT COMPATIBILITY

| Field | Messenger | CRM | Compatible |
|---|---|---|---|
| workspace_id | ✅ | ✅ | ✅ |
| actor_id / actor_user_id | ✅ | ✅ | ⚠️ Different field name |
| action | ✅ | ✅ | ✅ |
| resource_type | ✅ | ✅ | ✅ |
| resource_id | ✅ | ✅ | ✅ |
| metadata / payload | ✅ (`metadata`) | ✅ (`payload`) | ⚠️ Different field name |
| created_at | ✅ | ✅ | ✅ |

**FINDING (LOW — WS7-F2):** Messenger uses `actor_id` and `metadata`; CRM uses `actor_user_id` and `payload`. Same semantic content, different column names. A unified analytics layer must map these.

---

## 4. CLOUDFLARE ANALYTICS ENGINE (RECOMMENDATION)

The most pragmatic path to analytics given existing CF Worker infrastructure:

```typescript
// In any CF Worker route, after a key event:
await c.env.ANALYTICS.writeDataPoint({
  blobs: [event_type, user_id, workspace_id],
  doubles: [1],
  indexes: [workspace_id],
});
```

**Requirements:**
1. Enable Analytics Engine in Cloudflare dashboard (no additional cost on Workers Paid)
2. Add `analytics_engine_datasets` binding to each `wrangler.toml`
3. Query via GraphQL API or dashboard

**This requires zero new infrastructure** — it uses the existing CF account.

---

## FINDINGS

| ID | Severity | Finding |
|---|---|---|
| WS7-F1 | HIGH | No analytics pipeline exists — rald-observability has no source code |
| WS7-F2 | HIGH | rald-auth-core emits zero analytics events (registration, login, OTP not tracked) |
| WS7-F3 | HIGH | Loop emits zero server-side analytics events |
| WS7-F4 | MEDIUM | `domain.action` naming convention not documented as ecosystem standard |
| WS7-F5 | LOW | Messenger and CRM use different field names for same semantic data (actor_id vs actor_user_id) |

---

## CERTIFICATION DECISION

```
╔══════════════════════════════════════════════╗
║  WS7 — ANALYTICS INTEGRITY                   ║
║  CRITICAL: 0  HIGH: 3  MEDIUM: 1  LOW: 1    ║
║  DECISION: ❌  FAIL                           ║
║                                              ║
║  Messenger audit: PASS (22 events)           ║
║  CRM audit: PASS (9 events)                  ║
║  Auth + Loop: FAIL (no event emission)       ║
║  Analytics pipeline: DOES NOT EXIST          ║
╚══════════════════════════════════════════════╝
```

LILCKY STUDIO LIMITED — RALD G.9 Certification | 2026-06-02
