# BBC Readiness Audit
**Date:** 2026-06-06  
**Auditor:** Foundation Hardening Program — Phase 9  

---

## Scope
Verify architecture extension points for BBC products. Do NOT implement.

---

## BBC Products

| Product | Repo | Status |
|---------|------|--------|
| WIZMAC | `Ostinato-Loop/wizmac-core` | Repo exists, pushed 2026-06-05, no CI |
| Sekani | `Ostinato-Loop/sekani-core` | Repo exists, pushed 2026-06-05, no CI |
| BBC Core | `Ostinato-Loop/bbc-core` | Repo exists, pushed 2026-06-05, no CI |
| MerMac | Not observed | — |
| Dragula | Not observed | — |
| Mika | Not observed | — |
| Butchers | Not observed | — |
| 4 | Not observed | — |

Also referenced: `Ostinato-Loop/rald` contains `BBC_SPEC_V1.md`, `WIZMAC.md`, `WIZMAC_ARCHITECTURE.md`, `SEKANI_CORE.md`

---

## Extension Points Verified

### ✅ SSO Extension
- `registered_apps` table supports any new BBC app via `INSERT` — no architectural change needed
- `validateRedirectUrl()` already allows `*.rald.cloud` — BBC apps on subdomains are pre-approved

### ✅ Event Architecture (Phase 10 SSO spec)
- `rald-events` repo exists (`Ostinato-Loop/rald-events`)
- `rald-event-bus` repo exists (`Ostinato-Loop/rald-event-bus`)
- Events defined in SSO spec: `user.created`, `user.approved`, `artist.verified`, `label.verified`, `login.success`, `login.failed`, `role.changed`
- WIZMAC can subscribe to these without coupling to auth core

### ✅ Role System Extension
- Roles are centrally owned by Profiles/rald-auth-core
- BBC apps can consume roles via SSO token (`role` field in JWT)
- No BBC app needs to create its own role system

### ✅ Audit Log Extension
- `writeAuditLog()` accepts extensible `metadata` object
- BBC-specific events can be logged without schema changes

### ⚠️ wizmac-core / sekani-core / bbc-core
- Repos exist but no CI — contents not reviewed
- Architecture compatibility unverified at code level
- Spec documents exist in `rald` repo (`BBC_SPEC_V1.md`, `WIZMAC_ARCHITECTURE.md`)

### ⚠️ MerMac, Dragula, Mika, Butchers, 4
- No repos found in either org
- Spec may exist in `BBC_SPEC_V1.md` — not reviewed in this session

---

## Score

| Check | Score |
|-------|-------|
| WIZMAC extension points | 7/10 — repo exists, spec exists, CI missing |
| Sekani extension points | 6/10 — repo exists, no CI, no code review |
| SSO extensibility | 10/10 — registered_apps handles all apps |
| Event architecture | 8/10 — repos exist, spec defined |
| Role system extensibility | 9/10 |
| MerMac/Dragula/Mika/Butchers/4 | 3/10 — no repos found |

**Total: 43/60 → 72/100**

### Gap to 95+
- Add CI to bbc-core, wizmac-core, sekani-core
- Review BBC_SPEC_V1.md and confirm all 7 products have repos
- Create repos for MerMac, Dragula, Mika, Butchers, 4
- Document WIZMAC event subscription patterns
