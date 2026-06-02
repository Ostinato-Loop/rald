# LOOP_SECRET_ROTATION_REPORT.md
**Phase:** G.9 Level 2 Remediation — Remediation 1  
**Owner:** LILCKY STUDIO LIMITED  
**Date:** 2026-06-02  
**Evidence Source:** GitHub API — Ostinato-Loop/loop

---

## MANDATE

Remove `.env.development` and `.env.production` from the `loop` repository.  
Rotate all exposed credentials. Prevent future exposure.

---

## 1. FILES REMOVED

| File | Location | SHA Before Deletion | Status |
|---|---|---|---|
| `.env.development` | `artifacts/loop/.env.development` | `dbe056986b622ac9427985c9f1e2ddde84ca4830` | ✅ DELETED |
| `.env.production` | `artifacts/loop/.env.production` | `5436c003fa461beba629f0728ba43f2c05411e5d` | ✅ DELETED |

**Deletion commits:**
- `.env.development` deleted at commit `484ef069` on branch `main`
- `.env.production` deleted at commit `3d6844d9` on branch `main`

**Deletion message:** `security: remove committed .env files — rotate credentials (G.9 R1)`

---

## 2. KEYS THAT WERE EXPOSED

The `.env` files contained the following environment variable keys (values redacted):

| Key | Type | Risk |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL | LOW — public project URL, not a credential by itself |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key | HIGH — grants public API access to Supabase project |
| `VITE_API_BASE_URL` | API endpoint URL | LOW — public URL |
| `VITE_DEV_MODE_MOCK_OTP` | Boolean flag | LOW — no credential |

---

## 3. CREDENTIAL ROTATION REQUIRED

### VITE_SUPABASE_PUBLISHABLE_KEY (Supabase Anon Key)

**Risk:** The Supabase anon key grants access to the Supabase REST API with Row Level Security as the only guard. Any person who viewed the `loop` repository (public or with access) between the time the file was committed and now could have extracted this key.

**Required action:** Rotate the Supabase anon/publishable key immediately.

**Procedure:**
```
1. Go to Supabase Dashboard → Project onxdcikfttdmnhofsuwo
2. Project Settings → API
3. Click "Regenerate" on the anon key (publishable key)
4. Update GitHub Secret: SUPABASE_ANON_KEY in Ostinato-Loop/loop
5. Re-deploy loop frontend (CI/CD will inject new key via deploy.yml)
```

**Status:** ⚠️ OPERATOR ACTION REQUIRED — rotation cannot be performed from GitHub API alone

---

## 4. GITIGNORE PROTECTION

**Updated:** `loop/.gitignore` on `main` branch.  
**Added patterns:**
```
.env
.env.*
*.env
.env.local
.env.development
.env.production
.env.test
.env.staging
```

**Commit:** Included in `.gitignore` update commit on `main`.

These patterns will prevent any future accidental `.env` file commits to the `loop` repository.

---

## 5. GIT HISTORY NOTE

The files have been **deleted from the current HEAD** via the GitHub Contents API (DELETE operation). This creates a new commit that removes the files.

**Important:** The files still exist in git history at their original commit SHAs. The credentials should be considered **compromised** and rotated regardless of history status. For highly sensitive environments (e.g., after public beta), a full `git filter-repo` history rewrite may be warranted. For campus pilot scope (50-200 controlled users), credential rotation is sufficient.

---

## 6. DEPLOYMENT VERIFICATION

The `loop` frontend is built in CI (`deploy.yml`) which injects environment variables from GitHub Secrets, not from `.env` files:

```yaml
env:
  VITE_SUPABASE_URL: https://onxdcikfttdmnhofsuwo.supabase.co
  VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
  VITE_API_BASE_URL: https://loop-api.rald.cloud
  VITE_DEV_MODE_MOCK_OTP: "false"
```

The production build does NOT depend on the deleted `.env.production` file. Deployment is unaffected by the deletion. ✅

---

## FINDINGS

| ID | Severity | Finding | Status |
|---|---|---|---|
| WS4-F1 | HIGH | `.env.development` + `.env.production` committed | ✅ RESOLVED — Files deleted |
| — | HIGH | Supabase anon key exposed | ⚠️ PENDING OPERATOR rotation |

---

## CERTIFICATION DECISION

```
╔══════════════════════════════════════════════╗
║  REMEDIATION 1 — LOOP SECRET ROTATION        ║
║                                              ║
║  File deletion:     ✅ COMPLETE              ║
║  .gitignore update: ✅ COMPLETE              ║
║  Key rotation:      ⚠️ OPERATOR ACTION REQ   ║
║                                              ║
║  STATUS: CONDITIONAL PASS                    ║
║  Condition: Operator must rotate             ║
║  SUPABASE_ANON_KEY before pilot launch.      ║
╚══════════════════════════════════════════════╝
```

LILCKY STUDIO LIMITED — RALD G.9 Level 2 Remediation | 2026-06-02
