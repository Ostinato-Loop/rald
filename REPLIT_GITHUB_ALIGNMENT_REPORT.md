# REPLIT ↔ GITHUB ALIGNMENT REPORT
**Generated:** 2026-06-12  
**Authority:** Phase 6 — Principal DevOps Engineer  
**Verdict:** Replit workspace is a DEVELOPMENT SANDBOX. GitHub is SOURCE OF TRUTH.  
**Classification:** OFFICIAL — SOURCE OF TRUTH

---

## RELATIONSHIP BETWEEN REPLIT AND GITHUB

The Replit workspace (`rald` repo on GitHub) contains:
- A pnpm monorepo scaffold for local development
- `artifacts/api-server/` — Express API server (Replit-local, not deployed to production)
- `artifacts/mockup-sandbox/` — UI prototyping sandbox (Replit-local only)
- `lib/` — shared TypeScript libraries (db, api-spec, api-client-react, api-zod)
- Ecosystem-wide documentation and certification reports
- `scripts/` — utility scripts

**The Replit workspace is NOT the source of any production service.** Production services live in their individual repos (`rald-auth-core`, `loop`, `messenger`, `rald-notify`, etc.) and deploy via their own GitHub Actions pipelines.

---

## DRIFT ANALYSIS

### Files in Replit NOT in GitHub (rald repo)

| Item | Location | Status |
|---|---|---|
| `artifacts/api-server/src/lib/auth.ts` | Replit local | ⚠️ May have local changes not pushed |
| `artifacts/api-server/src/lib/events.ts` | Replit local | ⚠️ May have local changes not pushed |
| `artifacts/api-server/src/lib/search.ts` | Replit local | ⚠️ May have local changes not pushed |
| `artifacts/api-server/src/middlewares/workspace.ts` | Replit local | ⚠️ May have local changes not pushed |
| `artifacts/api-server/src/routes/credentials.ts` | Replit local | ⚠️ May have local changes not pushed |
| `artifacts/api-server/src/routes/customers.ts` | Replit local | ⚠️ May have local changes not pushed |
| `artifacts/api-server/src/routes/deployments.ts` | Replit local | ⚠️ May have local changes not pushed |
| `artifacts/api-server/src/routes/metrics.ts` | Replit local | ⚠️ May have local changes not pushed |
| `artifacts/api-server/src/routes/notifications.ts` | Replit local | ⚠️ May have local changes not pushed |
| `artifacts/api-server/src/routes/products.ts` | Replit local | ⚠️ May have local changes not pushed |
| `artifacts/api-server/src/routes/services.ts` | Replit local | ⚠️ May have local changes not pushed |
| `artifacts/api-server/src/routes/workspaces.ts` | Replit local | ⚠️ May have local changes not pushed |
| `artifacts/api-worker/` | Replit local | ⚠️ Entire directory not in rald GitHub |
| `artifacts/credentials-portal/` | Replit local | ⚠️ Entire directory not in rald GitHub |
| `lib/api-client-react/` | Replit local | ⚠️ Not in rald GitHub |
| `lib/api-spec/openapi.yaml` | Replit local | ⚠️ Not in rald GitHub (but IS in rald-api-core) |

### GitHub rald repo has files Replit doesn't show
The GitHub `rald` repo has all the certification docs, AUDIT files, FOUNDATION docs, etc. These are markdown documents, not code.

---

## PRODUCTION SERVICE ↔ GITHUB MAPPING

| Production URL | Source of Truth Repo | Branch | CI/CD |
|---|---|---|---|
| auth.rald.cloud | `rald-auth-core` | main | ✅ Auto-deploy |
| loop.rald.cloud | `loop` (artifacts/loop) | main | ✅ Auto-deploy |
| loop-api.rald.cloud | `loop` (artifacts/cloudflare-worker) | main | ✅ Auto-deploy |
| messenger.rald.cloud | `messenger` | main | ✅ Auto-deploy |
| profiles.rald.cloud | `rald-identity` | main | ✅ Auto-deploy |
| app.rald.cloud | `rald-auth-ui` | main | ✅ Auto-deploy |
| notification.rald.cloud | `rald-notify` | main | ✅ Auto-deploy |
| search.rald.cloud | `rald-search` | main | ✅ Auto-deploy |
| realtime.rald.cloud | `rald-realtime` | main | ✅ Auto-deploy |
| admin.rald.cloud | `rald-control-center` | main | ✅ Auto-deploy |
| console.rald.cloud | `rald-dev-console` | main | ✅ Auto-deploy |
| events.rald.cloud | `rald-event-bus` | main | ✅ Auto-deploy |
| config.rald.cloud | `rald-config` | main | ✅ Auto-deploy |

---

## ALIGNMENT RULES (ENFORCED FROM NOW)

### Rule 1 — GitHub is the canonical source for all production code
Every change to any production service MUST go through its respective GitHub repo → CI → Cloudflare deploy pipeline. No hotfixes via Wrangler CLI without a corresponding commit.

### Rule 2 — Replit workspace (`rald` repo) is for ecosystem-level work
The Replit workspace is used for:
- Ecosystem-wide documentation (certification reports, architecture docs)
- The Replit-local API server (development/prototyping only)
- Shared lib packages that get published for other repos to consume
- Phase reports and audit documents (like this one)

### Rule 3 — Never push production secrets to any repository
All secrets are managed via `wrangler secret put` or GitHub Actions org secrets. No `.env` files with real values are ever committed.

### Rule 4 — Branch protection on all repos
- `main` branch requires a PR + CI pass before merge
- All feature work goes to `feat/*` branches
- All hotfixes go to `fix/*` branches

### Rule 5 — Replit pushes to GitHub, not the reverse
When the Replit workspace produces code (reports, scripts, shared libs), it pushes to GitHub via the PAT. GitHub then triggers CI for affected repos.

---

## MISSING DEPLOYMENTS

| Feature | Built In | Should Deploy To | Status |
|---|---|---|---|
| Machine identity provisioning script | rald-auth-core (to be written) | rald-auth-core | ❌ Not written yet |
| Session cleanup cron | rald-auth-core (to be added) | rald-auth-core | ❌ Not added yet |
| Self-healing health monitor | Not built | rald-auth-core or standalone | ❌ |
| `/identity-brain` namespace | rald-auth-core (alias of /identity) | rald-auth-core | ❌ Not aliased yet |

---

## ACTION ITEMS

1. **Commit Replit-local api-server changes** to `rald` GitHub repo (via PR)
2. **Confirm `rald-api-core` vs Replit `rald`** — `rald-api-core` has a similar `artifacts/api-server` — these may have diverged
3. **Archive or retire** the Replit-local `artifacts/api-worker` and `artifacts/credentials-portal` if they've been superseded by `rald-auth-core` and `rald-dev-console`
4. **Update this Replit workspace** to reflect GitHub as source of truth — git pull from `rald` main before each session

---

*Report generated by Principal DevOps Engineer · RALD Platform Engineering · LILCKY STUDIO LIMITED · 2026-06-12*
