# Operational Readiness Audit
**Date:** 2026-06-06  
**Auditor:** Foundation Hardening Program — Phase 8  

---

## Requirement
Admin must operate platform without database access.  
Support must operate platform without database access.

---

## Evidence Base

| Tool | Repo | Status |
|------|------|--------|
| Control Center | `Ostinato-Loop/rald-control-center` | CI ✅ Deploy ✅ |
| Admin portal | `Manilla-Network/manilla-artist-contract` → `/admin` route | CI: fixed |
| Health endpoint | `rald-auth-core` → `HealthTab` component | confirmed |
| Audit logs API | `src/lib/audit.ts` + Supabase | confirmed |

---

## Dashboards Assessed

### ✅ Health Dashboard
- `HealthTab` in manilla-artist-contract admin portal
- rald-control-center deployed at `control.rald.cloud`
- Cloudflare Workers observability: enabled at 100% head sampling in rald-auth-core

### ✅ Support Console
- `SupportTab` in manilla-artist-contract admin portal
- Admin contract status updates via UI (no direct DB access required)
- Contract resend via UI action (`callResendContract()`)

### ✅ Audit Log Access
- `writeAuditLog()` logs all key actions to Supabase `audit_logs` table
- Accessible via admin UI (not direct DB)

### ⚠️ Queue Dashboard
- `rald-workflows` repo exists for provisioning
- No dedicated queue monitoring dashboard confirmed
- Cloudflare Queues not observed in any wrangler.toml

### ⚠️ Incident Dashboard
- No dedicated incident dashboard repo or tool observed
- No on-call runbook confirmed in any repo

### ⚠️ Support Without DB Access
- Currently support operations rely on Supabase dashboard or direct queries
- Admin UI partially covers this but not fully end-to-end without DB

---

## Score

| Check | Score |
|-------|-------|
| Health Dashboard | 7/10 |
| Support Console | 7/10 |
| Queue Dashboard | 2/10 — not present |
| Incident Dashboard | 2/10 — not present |
| Admin-without-DB operations | 6/10 |
| Support-without-DB operations | 5/10 |

**Total: 29/60 → 48/100**

### Gap to 95+
- Build dedicated Queue monitoring UI (or use Cloudflare dashboard)
- Create incident runbook and link to a status page (rald-status repo exists)
- Expand rald-control-center to cover user management, session revocation, app management without DB access
- Implement support ticket routing in SupportTab so agents never need DB
