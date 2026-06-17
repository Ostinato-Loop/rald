# RALD SECURITY GOVERNANCE REPORT
**Generated:** June 17, 2026  
**Authority:** Security Lead / DevSecOps Director  
**Scope:** All 129 repositories, GitHub Actions, GitLab CI, Cloudflare, Supabase, AWS

---

## EXECUTIVE SUMMARY

| Severity | Count | Status |
|----------|-------|--------|
| 🔴 P0 — Critical / Active Breach | 3 | Requires immediate action |
| 🟠 P1 — High / Pre-Beta Blocker | 8 | Required before public launch |
| 🟡 P2 — Medium / Post-Beta | 9 | Required within 30 days of launch |

---

## P0 — CRITICAL (ACT NOW)

### SEC-P0-001 — Exposed Supabase Anon Key in Public GitLab Repository
**Repository:** `Hanzosekani/loop-messenger-lvb` (GitLab, public fork)  
**File:** `.env` committed to repository history  
**Exposed credential:** Supabase anon key (project: likely `loop` or `messenger` Supabase project)  
**Risk:** Any actor can read/write Supabase data using the anon key with RLS bypasses if policies are misconfigured  
**Status:** 🔴 ACTIVE BREACH — Key has been in public commit history  

**Immediate Actions:**
1. Go to Supabase dashboard → Project Settings → API → Regenerate `anon` key NOW
2. Update all services using the old anon key: `loop`, `messenger`, `loop-mobile`
3. Archive the GitLab repo after rotation (do NOT delete — preserve for audit trail)
4. Run `git filter-branch` or BFG Repo Cleaner on the GitLab repo to expunge the key from history
5. File an internal security incident report

---

### SEC-P0-002 — All ALIA Docker Services Cannot Deploy (Missing AWS ECR Secrets)
**Repository:** `rald-alia` (GitHub)  
**Issue:** GitHub Actions `Docker Build & Push` jobs for all 15 services fail at the push step  
**Missing secrets in GitHub org secrets:**
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`  
- `ECR_REGISTRY` (account: `093583252030.dkr.ecr.*.amazonaws.com`)

**Risk:** ALIA identity layer has never successfully deployed to production. This means identity routing, alias resolution, consent management, and trust scoring are all running on last manually deployed state (if any) — no CI/CD guardrail.

**Actions:**
1. Create AWS IAM user/role with ECR push permissions (`ecr:GetAuthorizationToken`, `ecr:BatchCheckLayerAvailability`, `ecr:PutImage`, `ecr:InitiateLayerUpload`, `ecr:UploadLayerPart`, `ecr:CompleteLayerUpload`)
2. Add to GitHub org secrets: `Settings → Secrets → Actions`
3. Prefer OIDC-based authentication (GitHub Actions OIDC → AWS IAM role) over long-lived access keys

---

### SEC-P0-003 — GitLab CI rald-alia Pipeline Failing (5 Consecutive Failures Today)
**Repository:** `sekanidev/rald-alia` (GitLab)  
**Issue:** Every push to `main` today triggers a failing pipeline — Docker build stage failing, preventing any deployment  
**Risk:** ALIA services are frozen at last working state. Any hotfix cannot be deployed.

**Actions:**
1. Inspect GitLab job traces — likely missing `CI_REGISTRY_USER` / `CI_REGISTRY_PASSWORD` variables in GitLab CI/CD settings
2. Add required CI/CD variables in GitLab project: `Settings → CI/CD → Variables`
3. Coordinate with GitHub SSOT — GitLab should be a mirror, not a parallel dev branch

---

## P1 — HIGH (Required Before Public Beta)

### SEC-P1-001 — JWT Stored in localStorage (XSS Vulnerability)
**Repository:** `payrald-ui-ux`  
**Issue:** Access tokens stored in `localStorage` — trivially readable by any XSS payload  
**Risk:** Full account takeover if any XSS exists in the PayRald UI  
**CVE pattern:** CWE-922 (Insecure Storage of Sensitive Information)

**Fix:**
```typescript
// Remove from localStorage:
localStorage.setItem('jwt', token); // ❌

// Replace with httpOnly cookie pattern:
// Server sets: Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Strict
// Client stores: access token in memory only (React state / closure)
// On refresh: call /auth/refresh → returns new short-lived access token
```

---

### SEC-P1-002 — Auth Endpoint Rate Limiting Disabled
**Repository:** `payrald-api`  
**Issue:** KV namespace for rate limiting is commented out in the worker config  
**Risk:** Credential stuffing, brute force attacks on `/auth/login`, `/auth/otp`, voucher redemption  

**Fix:**
```toml
# wrangler.toml — uncomment and provision:
[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "YOUR_KV_NAMESPACE_ID"
```
Then run: `wrangler kv:namespace create RATE_LIMIT_KV --env production`

---

### SEC-P1-003 — CORS Wildcard on rald-control-center API
**Repository:** `rald-control-center`  
**Issue:** API allows `Access-Control-Allow-Origin: *` — any origin can make authenticated requests  
**Risk:** CSRF-style attacks from malicious sites against authenticated admin sessions  

**Fix:**
```typescript
const ALLOWED_ORIGINS = [
  'https://control.rald.cloud',
  'https://admin.rald.cloud',
  'https://rald.cloud'
];
const origin = request.headers.get('Origin');
if (ALLOWED_ORIGINS.includes(origin)) {
  headers.set('Access-Control-Allow-Origin', origin);
}
```

---

### SEC-P1-004 — rald-alia Docker Services Using Node.js 20 Actions (Deprecated)
**Repository:** `rald-alia` (GitHub Actions)  
**Issue:** All Docker build jobs use `actions/checkout@v4`, `aws-actions/configure-aws-credentials@v4` etc. on Node.js 20 — forced to Node 24 from June 16, 2026  
**Risk:** Actions may behave unexpectedly; GitHub will forcibly migrate to Node 24 on September 16, 2026  

**Fix:** Update all action versions to Node 24-compatible releases:
- `actions/checkout@v4` → `actions/checkout@v4.2.2+` (Node 24 support)
- `docker/build-push-action@v6` → latest
- `aws-actions/configure-aws-credentials@v4` → `v4.0.3+`
- Add to workflow: `env: FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true`

---

### SEC-P1-005 — Missing Supabase Tables Causing Runtime Crashes
**Repository:** `payrald-core`  
**Missing tables:** `otp_codes`, `user_devices`, `product_access`, `payrald_voucher_products`  
**Risk:** Authentication flows silently fail or throw 500 errors in production for real users  

**Fix:** Run migrations immediately:
```sql
-- payrald-core migration
CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  device_fingerprint TEXT NOT NULL,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  trusted BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS product_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id TEXT NOT NULL,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS payrald_voucher_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  denomination NUMERIC NOT NULL,
  currency VARCHAR(3) DEFAULT 'NGN',
  active BOOLEAN DEFAULT TRUE
);
```

---

### SEC-P1-006 — rald-admin CI Broken — npm/Node.js 24 Compatibility
**Repository:** `rald-admin`  
**Issue:** CI fails with `npm error: Exit handler never called` — incompatibility between npm 10 and Node.js 24 runner  
**Risk:** rald-admin cannot be updated or deployed via CI  

**Fix:** Switch to `pnpm` (consistent with ecosystem) or pin node version:
```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '22'  # Use LTS 22 instead of 24
    cache: 'npm'
```

---

### SEC-P1-007 — sekani-core Has No CI — AI Orchestration Untested
**Repository:** `sekani-core` (private)  
**Issue:** No GitHub Actions workflow exists. Code has never been tested or type-checked in CI.  
**Risk:** AI orchestration layer deployed manually with no safety gates  

**Fix:** Add `.github/workflows/ci.yml` with typecheck + build + test steps (mirror pattern from `rald-os` or `rald-routing`).

---

### SEC-P1-008 — rald-routing CF Worker Blocked — ALIA_RESOLUTION_ENGINE_URL Not Set
**Repository:** `rald-routing`  
**Issue:** CF Worker deploy depends on `ALIA_RESOLUTION_ENGINE_URL` secret which points to an ALIA backend service that has never been deployed (blocked by SEC-P0-002)  
**Risk:** ALIA alias routing is non-functional in production  

**Fix:** Chain resolution:
1. Fix SEC-P0-002 (AWS ECR secrets) → deploy ALIA services
2. Set `ALIA_RESOLUTION_ENGINE_URL` = `https://api.alia.rald.cloud` in GitHub org secrets
3. Trigger `rald-routing` deploy workflow

---

## P2 — MEDIUM (Within 30 Days of Launch)

### SEC-P2-001 — No Secrets Rotation Policy
No automated secret rotation exists for any service. `rald-alia` has a `Rotate Machine Secrets` workflow (GitHub Actions state: active) but its schedule and coverage is unverified.  
**Action:** Implement 90-day rotation policy for all service credentials. Use Cloudflare Workers Secrets API + GitHub Actions secrets rotation workflow.

### SEC-P2-002 — Supabase Project Shared Across PayRald Services
All PayRald services (`payrald-core`, `payrald-api`, `payrald-wallet`, etc.) share Supabase project `onxdcikfttdmnhofsuwo`. A single compromised service role key gives access to all payment data.  
**Action:** Implement per-service Supabase RLS policies. Consider separate Supabase projects for financial data and auth data.

### SEC-P2-003 — No Security Scanning in Most Pipelines
Only `rald-alia` has a dedicated `Security Scan` workflow. `rald-auth-core`, `payrald-*`, `messenger`, `loop` rely solely on CodeQL.  
**Action:** Add `gitrald-security` (or Trivy/Snyk) to all P0 product pipelines.

### SEC-P2-004 — CodeQL Not Running on All Active Repos
CodeQL advanced scanning is configured only for `loop`, `messenger`, `rald-alia`, `rald-auth-core`, `payrald-api`, `payrald-settlements`. Missing from: `payrald-core`, `payrald-wallet`, `payrald-merchant`, `rald-routing`, `rald-event-bus`, `rald-notify`, `rald-os`, `elimu`.  
**Action:** Enable GitHub Advanced Security CodeQL on all active TypeScript repos.

### SEC-P2-005 — No Penetration Testing Record
No evidence of pentest for PayRald (financial product) or RALD ALIA (identity product).  
**Action:** Commission external pentest before public launch. Prioritize: ALIA identity resolution endpoints, PayRald transaction flows, auth bypass vectors.

### SEC-P2-006 — Cloudflare Pages Deploy Secrets Unaudited
Multiple repos (`rald-admin`, `payrald-ui-ux`, `messenger`) deploy to Cloudflare Pages using `CLOUDFLARE_API_TOKEN`. If this is a single global token with account-wide permissions, compromise of one repo exposes all Pages deployments.  
**Action:** Issue scoped Cloudflare API tokens per product with minimum required permissions.

### SEC-P2-007 — No WAF / DDoS Policy Documented
While Cloudflare provides baseline DDoS protection, no custom WAF rules are documented for `api.rald.cloud`, `routing.rald.cloud`, or `core.pay.rald.cloud`.  
**Action:** Document and implement Cloudflare WAF rules for financial endpoints.

### SEC-P2-008 — rald-connect (WordPress Plugin) Has No Security Review
`rald-connect` is a PHP WordPress plugin. WordPress plugins are a common attack surface.  
**Action:** Code review for SQL injection, XSS, CSRF, nonce validation before publishing to wordpress.org.

### SEC-P2-009 — No Data Retention / GDPR Policy Implementation
For a financial identity product operating in Africa, data retention policies and right-to-erasure must be implemented in `rald-alia` and `payrald-core`.  
**Action:** Implement data retention schedules and deletion workflows before onboarding users in GDPR-adjacent jurisdictions.

---

## SECRETS INVENTORY

### Secrets That Should Exist in GitHub Org Secrets (Settings → Secrets → Actions)

| Secret Name | Used By | Status |
|-------------|---------|--------|
| `AWS_ACCESS_KEY_ID` | `rald-alia` Docker builds | ❌ Missing |
| `AWS_SECRET_ACCESS_KEY` | `rald-alia` Docker builds | ❌ Missing |
| `ECR_REGISTRY` | `rald-alia` Docker builds | ❌ Missing |
| `ALIA_RESOLUTION_ENGINE_URL` | `rald-routing` deploy | ❌ Missing |
| `CLOUDFLARE_API_TOKEN` | All CF Workers/Pages deploys | ⚠️ Exists (scope unverified) |
| `CLOUDFLARE_ACCOUNT_ID` | All CF Workers/Pages deploys | ⚠️ Exists (scope unverified) |
| `SUPABASE_URL` | `payrald-*`, `rald-auth-core`, `rald-os` | ⚠️ Exists (shared project risk) |
| `SUPABASE_SERVICE_ROLE_KEY` | `payrald-*`, `rald-auth-core` | ⚠️ Exists (shared project risk) |
| `RALD_JWT_SECRET` | `rald-routing`, `rald-auth-core` | ⚠️ Exists |
| `MACHINE_JWT_SECRET` | `rald-routing` | ⚠️ Exists |

### Immediately Rotate
| Secret | Reason |
|--------|--------|
| Supabase anon key (loop/messenger project) | Exposed in GitLab public repo (SEC-P0-001) |
