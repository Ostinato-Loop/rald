# RALD DUPLICATE ANALYSIS
**Generated:** June 17, 2026  
**Scope:** 129 repositories across GitHub (Ostinato-Loop) + GitLab (sekanidev, Hanzosekani)

---

## DUPLICATE CATEGORY 1 — IDENTITY / AUTH SYSTEMS

### Finding: 5 Auth Repos for 1 Auth System

| Repo | Size | Language | Last Push | Verdict |
|------|------|----------|-----------|---------|
| `rald-auth-core` | 652 KB | TypeScript | June 17, 2026 | ✅ **KEEP** — This is the canonical Hono CF Worker auth system |
| `rald-auth-ui` | 503 KB | HTML | June 17, 2026 | ✅ **KEEP** — Frontend for auth flows |
| `rald-auth-sdk` (private) | 17 KB | TypeScript | June 4, 2026 | 🔀 **MERGE** → into `rald-sdk` as `packages/auth` |
| `rald-auth-server` | 0 KB | — | May 29, 2026 | 🗄️ **ARCHIVE** — Empty, never developed |
| `rald-auth` | 3 KB | — | June 7, 2026 | 🗄️ **ARCHIVE** — Stub placeholder only |

**Action:** Archive `rald-auth-server` + `rald-auth`. Merge `rald-auth-sdk` into `rald-sdk/packages/auth`. Keep `rald-auth-core` + `rald-auth-ui`.

---

## DUPLICATE CATEGORY 2 — RALD ALIA CROSS-PLATFORM MIRRORS

### Finding: rald-alia exists on both GitHub and GitLab with divergence risk

| Repo | Platform | Last Activity | CI | Verdict |
|------|----------|--------------|-----|---------|
| `Ostinato-Loop/rald-alia` (GH) | GitHub | June 15, 2026 | ❌ Docker failing | ✅ **KEEP** — Primary source of truth |
| `sekanidev/rald-alia` (GL) | GitLab | June 17, 2026 | ❌ Pipeline failing | 🔀 **KEEP but clarify role** — Should be mirror/deploy target only, not separate development |
| `alia-ui-ux` (GH) | GitHub | June 16, 2026 | ✅ Green | ✅ **KEEP** — Active frontend |
| `sekanidev/rald-alia-ui-ux` (GL) | GitLab | June 11, 2026 | No CI | 🗄️ **ARCHIVE** — Dormant mirror of GH repo |

**Action:** Establish GitHub as SSOT. GitLab pipeline should pull from GitHub main and deploy only. Archive GL UI mirror. Document the sync mechanism.

---

## DUPLICATE CATEGORY 3 — SDK FRAGMENTATION (8 repos for 1 SDK)

### Finding: rald-sdk should be one package with sub-packages, not 7 separate repos

| Repo | Size | Active | Verdict |
|------|------|--------|---------|
| `rald-sdk` | 59 KB | ✅ Yes | ✅ **KEEP** — Canonical SDK with packages |
| `rald-sdk-react` | 12 KB | ✅ Yes | 🔀 **MERGE** → `rald-sdk/packages/react` |
| `rald-sdk-payments` | 5 KB | ✅ Yes | 🔀 **MERGE** → `rald-sdk/packages/payments` |
| `rald-sdk-auth` | 3 KB | Stub | 🔀 **MERGE** → `rald-sdk/packages/auth` (with rald-auth-sdk) |
| `rald-sdk-nextjs` | 3 KB | Stub | 🔀 **MERGE** → `rald-sdk/packages/nextjs` |
| `rald-sdk-messaging` | 3 KB | Stub | 🔀 **MERGE** → `rald-sdk/packages/messaging` |
| `rald-sdk-logistics` | 3 KB | Stub | 🔀 **MERGE** → `rald-sdk/packages/logistics` |
| `rald-sdk-react-native` | 3 KB | Stub | 🔀 **MERGE** → `rald-sdk/packages/react-native` |
| `rald-shared-sdk` (private) | 3 KB | Stub | 🗄️ **ARCHIVE** — Superseded by rald-sdk |

**Action:** Consolidate all SDK packages into a single `rald-sdk` pnpm monorepo. Publish sub-packages as `@rald/react`, `@rald/payments`, `@rald/auth`, etc.

---

## DUPLICATE CATEGORY 4 — MESSENGER / LOOP COMMUNICATIONS

### Finding: 7 messenger/loop repos across 2 platforms with 3 deprecated

| Repo | Platform | Active | Verdict |
|------|----------|--------|---------|
| `messenger` (GH) | GitHub | ✅ Yes (10 open issues) | ✅ **KEEP** — Production messaging platform |
| `loop-messenger-ui-ux` (GH) | GitHub | ✅ Design | ✅ **KEEP** — Active UX work |
| `loop-messenger-lvb` (GH: Hanzosekani) | GitLab mirror | ❌ Old | ⚫ **ARCHIVE** — Old prototype, contains exposed .env |
| `sekanidev/loop-messenger-lvb` (GL) | GitLab | ❌ Old | ⚫ **ARCHIVE** — Duplicate of above |
| `sekanidev/loop-messenger-private-32a6527d` (GL) | GitLab | ❌ Old | ⚫ **ARCHIVE** — Private fork artifact |
| `sekanidev/Loop` (GL) | GitLab | ❌ Old | ⚫ **ARCHIVE** — Pre-RALD version |
| `sekanidev/loop-live` (GL) | GitLab | ❌ Old | ⚫ **ARCHIVE** — Abandoned experiment |

**⚠️ SECURITY NOTE:** `loop-messenger-lvb` GitLab repo contains exposed Supabase anon key in `.env`. **Rotate immediately before archiving.**

---

## DUPLICATE CATEGORY 5 — LOOP / OSTLOOP OVERLAP

| Repo | Platform | Active | Verdict |
|------|----------|--------|---------|
| `loop` (GH) | GitHub | ✅ Yes | ✅ **KEEP** — Canonical Loop social audio |
| `loop-mobile` (GH) | GitHub | ✅ Yes | ✅ **KEEP** — Mobile app |
| `Hanzosekani/ostloop` (GL) | GitLab | ❌ Old | ⚫ **ARCHIVE** — Pre-RALD Loop prototype |
| `sekanidev/ostloop` (GL) | GitLab | ❌ Old | ⚫ **ARCHIVE** — Duplicate of above |

---

## DUPLICATE CATEGORY 6 — LOOP BUSINESS

| Repo | Platform | Active | Verdict |
|------|----------|--------|---------|
| `loop-business` (GH) | GitHub | Stub | 🗄️ **ARCHIVE** — Stub placeholder |
| `loop-business-8cbd0eb1` (GH, private) | GitHub | ❌ Legacy | ⚫ **ARCHIVE** — CI/CD artifact fork |
| `rald-loop-business` (GH, private) | GitHub | ❌ Legacy | ⚫ **ARCHIVE** — Old design exploration |

---

## DUPLICATE CATEGORY 7 — DESIGN SYSTEMS

| Repo | Size | Active | Verdict |
|------|------|--------|---------|
| `rald-design` | 86 KB | ✅ Yes | ✅ **KEEP** — Active at design.rald.cloud |
| `rald-design-system` (private) | 10 KB | ❌ Old | ⚫ **ARCHIVE** — Superseded |

---

## DUPLICATE CATEGORY 8 — INFRASTRUCTURE REPOS

| Repo | Language | Purpose | Verdict |
|------|----------|---------|---------|
| `rald-infra` | — | AWS CloudFormation (SES, S3, CloudFront) | ✅ **KEEP** |
| `rald-infrastructure` (private) | Shell | RALD Auth V1 legacy infra | ⚫ **ARCHIVE** — Auth V1 is superseded by rald-auth-core |

---

## DUPLICATE CATEGORY 9 — PAYRALD MONOLITH vs MICROSERVICES

| Repo | Type | Status | Verdict |
|------|------|--------|---------|
| `payrald` (private) | JS monolith | ❌ Legacy | ⚫ **ARCHIVE** — Replaced by payrald-* microservices |
| `payrald-core` | CF Worker | ✅ Active | ✅ **KEEP** |
| `payrald-api` | CF Worker | ✅ Active | ✅ **KEEP** |
| `payrald-wallet` | CF Worker | ✅ Active | ✅ **KEEP** |
| `payrald-merchant` | CF Worker | ✅ Active | ✅ **KEEP** |
| `payrald-cards` | CF Worker | ✅ Active | ✅ **KEEP** |
| `payrald-checkout` | CF Worker | ✅ Active | ✅ **KEEP** |
| `payrald-risk` | CF Worker | ✅ Active | ✅ **KEEP** |
| `payrald-settlements` | CF Worker | ✅ Active | ✅ **KEEP** |

---

## DUPLICATE CATEGORY 10 — NON-RALD REPOS IN GITLAB

These are personal projects from Hanzosekani under GitLab that are entirely unrelated to RALD:

| Repo | Product | Action |
|------|---------|--------|
| `Hanzosekani/watchvii-docs` | WatchVII streaming? | 🚫 Move to personal account |
| `Hanzosekani/watchvii-infra` | WatchVII infra | 🚫 Move to personal account |
| `Hanzosekani/watchvii-ai` | WatchVII AI | 🚫 Move to personal account |
| `Hanzosekani/watchvii-flutterflow` | WatchVII mobile | 🚫 Move to personal account |
| `sekanidev/easy-git-push` | Git utility script | 🚫 Personal utility, not RALD |

---

## CONSOLIDATION SUMMARY

| Action | Count | Repos |
|--------|-------|-------|
| ✅ Keep | 35 | All active production/beta repos |
| 🔀 Merge | 9 | SDK repos → rald-sdk; rald-auth-sdk → rald-sdk |
| 🗄️ Archive (stubs) | 38 | All zero/minimal content repos |
| ⚫ Deprecate | 11 | Legacy versions replaced by new architecture |
| 🚫 Remove from ecosystem | 5 | WatchVII + personal repos (GitLab) |

**Net reduction: 129 repos → ~35 active repos after consolidation**
