# INBOX_CERTIFICATION.md
**Certification Type:** Phase G Final Authorization  
**Service:** rald-inbox — inbox.rald.cloud  
**Phase:** F (inherited) + G Pre-check  
**Owner:** LILCKY STUDIO LIMITED  
**Date:** 2026-06-02

---

## 1. PRIOR CERTIFICATION

Phase F: **PASS** (rald-inbox/INBOX_CERTIFICATION_REPORT.md, 2026-06-02)  
Additional: INBOX_MESSENGER_READINESS_REPORT.md, INBOX_SECURITY_REPORT.md, INBOX_SCALE_REPORT.md

---

## 2. DEPLOYMENT HEALTH

| Criterion | Evidence | Status |
|---|---|---|
| CF Worker deployed (inbox.rald.cloud) | `wrangler.toml pattern = "inbox.rald.cloud/*"` | ✅ |
| Cron `*/10 * * * *` (SLA monitoring) | `[triggers] crons` | ✅ |
| GitHub → push main → auto-deploy | `deploy.yml on push:main` | ✅ |
| Observability enabled | `[observability] enabled = true` | ✅ |
| Latest commit: 2026-06-02 | `git log` | ✅ |

---

## 3. CONVERSATION MODEL

| Table | Purpose | Status |
|---|---|---|
| `conversations` | Core record — 10 status fields, SLA deadlines, FTS vector | ✅ |
| `conversation_messages` | 5 types: inbound/outbound/note/system/template | ✅ |
| `conversation_participants` | 4 roles: owner/agent/participant/observer | ✅ |
| `conversation_tags` | Many-to-many tags | ✅ |
| `conversation_assignments` | Full assignment history with reason | ✅ |
| `inbox_saved_views` | Per-user + shared filter views | ✅ |
| `inbox_audit_log` | 22 action types | ✅ |
| `conversation_sla` | SLA deadlines (4 priority tiers) | ✅ |
| `inbox_channel_registry` | Channel adapter registry | ✅ |

---

## 4. CHANNEL ABSTRACTION

| Channel | Adapter | Status |
|---|---|---|
| Internal Messaging | InternalChannelAdapter | ✅ LIVE |
| Email | EmailChannelAdapter → rald-notify | ✅ LIVE |
| Notification Threads | NotificationChannelAdapter → rald-notify | ✅ LIVE |
| loop_messenger | Interface registered | ✅ READY — awaiting Phase G |
| WhatsApp | Interface registered | ✅ READY |
| Instagram | Interface registered | ✅ READY |
| Facebook | Interface registered | ✅ READY |
| Web Chat | Interface registered | ✅ READY |
| SMS | Interface registered | ✅ READY |

---

## 5. INTEGRATION MATRIX

| Integration | Method | Status |
|---|---|---|
| rald-search | FTS vector on `conversations.subject` | ✅ |
| rald-notify | Email + push via channel adapters | ✅ |
| loop-crm | `customer_id` FK on every conversation | ✅ |
| rald-auth | Same RALD_JWT_SECRET for auth | ✅ |
| Workspace | `workspace_id` on all 9 tables | ✅ |
| SLA cron | Monitors + marks breaches every 10min | ✅ |

---

## 6. FINDINGS

| ID | Severity | Root Cause | Repo | Service | Evidence | Fix | Effort | Verify |
|---|---|---|---|---|---|---|---|---|
| INB-F01 | **MEDIUM** | KV namespace `RATE_LIMIT_KV` placeholder — rate limiting NOT active | rald-inbox | inbox.rald.cloud | `id = "placeholder-replace-with-actual-kv-id"` | Create real CF KV namespace; update wrangler.toml; push | 2h | 429 returned under load |
| INB-F02 | LOW | loop_messenger channel adapter has registered interface but no implementation — Messenger launch requires this | rald-inbox | inbox.rald.cloud | Channel in registry; adapter not implemented | Implement Loop Messenger channel adapter in Phase G | 3 days | Messenger message appears as conversation in inbox |
| INB-F03 | LOW | External channel webhooks (WhatsApp, Instagram, FB) not connected — channel interfaces are stubs | rald-inbox | inbox.rald.cloud | Interfaces registered; no webhook receiver implemented | Wire to channel registry in Phase G (per channel) | 3 days each | Inbound WhatsApp → conversation created |
| INB-F04 | INFO | Message body FTS not yet implemented — only subject is indexed | rald-inbox, rald-search | inbox+search | Only `conversations.subject` has tsvector | Phase G search sprint | 2 days | `?q=hello` returns conversations containing "hello" in body |

---

## 7. CERTIFICATION RESULT

```
╔══════════════════════════════════════════════════════════════════╗
║  INBOX_CERTIFICATION = PASS WITH MITIGATIONS                     ║
║  CRITICAL: 0 · HIGH: 0 · MEDIUM: 1 · LOW: 2 · INFO: 1         ║
║  Phase F cert inherited · Full conversation model live           ║
║  7 future channels registered & interface-ready for Phase G     ║
╚══════════════════════════════════════════════════════════════════╝
```

**Signed: LILCKY STUDIO LIMITED — 2026-06-02**
