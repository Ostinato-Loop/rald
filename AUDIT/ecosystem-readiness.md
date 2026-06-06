# Ecosystem Readiness Audit
**Date:** 2026-06-06  
**Auditor:** Foundation Hardening Program — Phase 10  

---

## Question
Can Profiles support all ecosystem apps without architectural changes?

---

## Apps to Support

| App | Domain | Registered in SSO | Repo |
|-----|--------|-------------------|------|
| Manilla | manilla.rald.cloud | ✅ YES (added 2026-06-06) | Manilla-Network/Manilla |
| Loop | loop.rald.cloud | ✅ YES | Ostinato-Loop/loop |
| Loop Business | business.rald.cloud | ✅ YES | Ostinato-Loop/loop-business |
| RALD Voice | voice.rald.cloud | ✅ YES (`dispatch` app_id) | Ostinato-Loop/loop-voice |
| RALD TV | — | ⚠️ Not explicitly registered | Ostinato-Loop/rald-tv-ui-ux |
| RALD Mail | — | ⚠️ Not explicitly registered | Ostinato-Loop/rald-mail-ui-ux |
| DunaRald | duna.rald.cloud | ✅ YES | Ostinato-Loop/dunarald |

---

## Architecture Assessment

### ✅ No Schema Changes Needed
- `registered_apps` uses `INSERT ON CONFLICT DO NOTHING` — add any app with zero schema change
- JWT structure is app-agnostic (`appId` field in payload)
- `ECOSYSTEM_APPS` array in `redirect.ts` is additive — no breaking changes

### ✅ SSO Protocol is Universal
- Authorization Code-style flow via `/sso/exchange` and `/sso/handoff`
- Any app that implements `/auth/callback` can participate immediately
- Token format is stable (`sso_v: 2`)

### ✅ Role System is Extensible
- Roles defined once in Profiles — all apps consume via JWT
- Adding a new role = 1 DB migration, 0 code changes in consuming apps

### ✅ Audit Logging is Universal
- `writeAuditLog()` logs by `user_id` + `app_id` — works for any app

### ⚠️ RALD TV Not Registered
- `rald-tv-ui-ux` repo exists — no SSO registration found
- `app_id: rald-tv` or `tv` not in `registered_apps` migration
- Fix: add to `registered_apps` via migration (same pattern as Manilla)

### ⚠️ RALD Mail Not Registered
- `rald-mail-ui-ux` repo exists — no SSO registration found
- Fix: same as above

### ⚠️ RALD Voice App ID
- Registered as `voice` + `dispatch` — these map to `loop-voice` and `loop-dispatch`
- Verify which `app_id` the actual Voice app uses

---

## Score

| Check | Score |
|-------|-------|
| Manilla support | 10/10 |
| Loop support | 10/10 |
| Loop Business support | 10/10 |
| RALD Voice support | 8/10 |
| RALD TV support | 5/10 — not registered |
| RALD Mail support | 5/10 — not registered |
| DunaRald support | 10/10 |
| No architectural changes required | 10/10 |

**Total: 68/80 → 85/100**

### Gap to 95+
- Register RALD TV: `INSERT INTO registered_apps (app_id: 'rald-tv', ...)`
- Register RALD Mail: `INSERT INTO registered_apps (app_id: 'rald-mail', ...)`
- Verify RALD Voice uses correct `app_id`
- Implement `/auth/callback` in Manilla, RALD TV, RALD Mail
