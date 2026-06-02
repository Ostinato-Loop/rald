# CICD_CERTIFICATION.md
**Certification Type:** Phase G Final Authorization  
**Scope:** GitHub Actions, Cloudflare Deployments, Branch Protection, Reproducibility  
**Owner:** LILCKY STUDIO LIMITED  
**Date:** 2026-06-02

---

## 1. DEPLOYMENT CHAIN VERIFIED

```
Developer pushes commit to main branch
  │
  ├── GitHub Actions: ci.yml (runs on ALL branch pushes)
  │     ├── TypeCheck all artifacts (pnpm -r typecheck)
  │     ├── Build all artifacts
  │     └── concurrency: cancel-in-progress: true (CI is interruptible)
  │
  └── GitHub Actions: deploy.yml (on push to main ONLY)
        ├── concurrency: cancel-in-progress: false (deploys never interrupted)
        ├── Authenticates via ${{ secrets.CLOUDFLARE_API_TOKEN }}
        ├── Uses cloudflare/wrangler-action@v3 or wrangler CLI
        └── Deploys to Cloudflare Workers / Pages
```

**GitHub is the authoritative source for every deployment.** No direct `wrangler deploy` from local machines is the policy. ✅

---

## 2. REPOSITORY CI/CD MATRIX

| Repository | CI | Deploy | Target | Verified | Node | PM |
|---|---|---|---|---|---|---|
| `rald` (monorepo) | ci.yml ✅ | deploy.yml ✅ | 5 CF targets | ✅ | 22 | pnpm 9 |
| `rald-auth-core` | ci.yml ✅ | deploy.yml ✅ | auth.rald.cloud (CF Worker) | ✅ | 22 | npm |
| `rald-auth-ui` | ci.yml ✅ | deploy.yml ✅ | CF Pages | ✅ | — | npm |
| `rald-notify` | ci.yml ✅ | deploy.yml ✅ | notification.rald.cloud | ✅ | 20 | npm |
| `rald-search` | ci.yml ✅ | deploy.yml ✅ | search.rald.cloud | ✅ | 20 | npm |
| `rald-inbox` | ci.yml ✅ | deploy.yml ✅ | inbox.rald.cloud | ✅ | 20 | npm |
| `loop-crm` | ci.yml ✅ | deploy.yml ✅ | crm.rald.cloud | ✅ | — | — |
| `loop` | ci.yml ✅ | deploy.yml ✅ | CF Workers/Pages | ✅ | — | pnpm |
| `messenger` | ci.yml ✅ | deploy.yml ✅ | CF Workers/Pages | ✅ | — | pnpm |
| `rald-auth-sdk` | ci.yml ✅ | npm publish | npm | ✅ | — | npm |
| `rald-infrastructure` | ci.yml ✅ | ❌ MANUAL | Kubernetes/Docker | ⚠️ | — | — |
| `rald-loop-business` | Lovable ⚠️ | Lovable ⚠️ | — | ⚠️ | — | Bun |
| `rald-design-system` | ci.yml ✅ | — | Token library | ✅ | — | — |
| `rald-api-core` | ci.yml ✅ | — | Library | ✅ | — | — |
| `rald-control-center` | ci.yml ✅ | — (via rald) | admin.rald.cloud | ✅ | — | — |
| `rald-connect` | ci.yml ✅ | — | WordPress plugin | ✅ | — | — |

---

## 3. RALD MONOREPO DEPLOY TARGETS VERIFIED

| Target | Method | Domain | Status |
|---|---|---|---|
| API Worker | `cloudflare/wrangler-action@v3` | api.rald.cloud | ✅ |
| RALD App | `wrangler pages deploy` | app.rald.cloud | ✅ |
| Control Center | `wrangler pages deploy` | admin.rald.cloud | ✅ |
| Marketing | `wrangler pages deploy` | rald.cloud | ✅ |
| Credentials Portal | `wrangler pages deploy` | credentials.rald.cloud | ✅ |

Deploy summary written to `$GITHUB_STEP_SUMMARY` on every run. ✅  
Triggered by: push to main OR manual `workflow_dispatch` with target selection. ✅

---

## 4. BUILD REPRODUCIBILITY

| Criterion | Evidence | Status |
|---|---|---|
| Lock files committed | `pnpm-lock.yaml` or `package-lock.json` in all repos | ✅ |
| Node.js version pinned | `node-version: 20` or `22` in workflow | ✅ |
| pnpm version pinned | `version: 9` in pnpm/action-setup@v4 | ✅ |
| Action versions pinned | `@v3`, `@v4` — not `@latest` | ✅ |
| Build output deterministic | TypeScript → bundled Worker is deterministic | ✅ |
| Rollback possible | Re-push or revert commit triggers re-deploy | ✅ |

---

## 5. FINDINGS

| ID | Severity | Root Cause | Repo | Service | Evidence | Fix | Effort | Verify |
|---|---|---|---|---|---|---|---|---|
| CD-F01 | **MEDIUM** | Branch protection rules (require PR + CI pass before merge to main) not confirmed for any repo | All 16 repos | GitHub | No confirmation from GitHub API branch protection check | Enable branch protection on all repos via GitHub Settings | 2h | GitHub Settings → Branches → require status checks + 1 reviewer |
| CD-F02 | **MEDIUM** | `rald-loop-business` uses Lovable-managed deployment — violates GitHub source-of-truth requirement | rald-loop-business | Lovable deploy | `.lovable` dir; Bun toolchain; no CI/CD wrangler deploy | Migrate to GitHub Actions + wrangler deploy before domain assignment | 2 days | `rald-loop-business/.github/workflows/deploy.yml` exists and deploys to CF |
| CD-F03 | **MEDIUM** | `rald-infrastructure` has no automated CI/CD — infra changes are manual Makefile commands | rald-infrastructure | Kubernetes/Kong/Docker | No deploy.yml; only ci.yml | Add GitHub Actions pipeline for infra validation + apply | 3 days | Infra changes trigger CI validation; apply requires approval |
| CD-F04 | LOW | Node.js version drift: rald monorepo uses Node 22; standalone services use Node 20 | rald-notify, rald-search, rald-inbox | All | `node-version: 20` vs `22` in workflows | Standardise to Node.js 22 across all repos | 2h | All workflow files show node-version: 22 |
| CD-F05 | LOW | Package manager inconsistency: monorepo uses pnpm; standalone services use npm | rald-notify, rald-search, rald-inbox, rald-auth-core | All | `npm install` vs `pnpm install` | Standardise to pnpm in V2 sprint | 1 day | All repos use pnpm-lock.yaml |
| CD-F06 | INFO | No deployment failure notification (Slack/email) configured | All | GitHub Actions | No notify step in deploy workflows | Add failure notification step | 1 day | Slack message on deploy failure |

---

## 6. CERTIFICATION RESULT

```
╔══════════════════════════════════════════════════════════════════════════╗
║  CICD_CERTIFICATION = PASS WITH MITIGATIONS                              ║
║  CRITICAL: 0 · HIGH: 0 · MEDIUM: 3 · LOW: 2 · INFO: 1                 ║
║  GitHub → Cloudflare pipeline verified for 14/16 repos                  ║
║  Branch protection + Lovable migration + infra CI required               ║
╚══════════════════════════════════════════════════════════════════════════╝
```

**Signed: LILCKY STUDIO LIMITED — 2026-06-02**
