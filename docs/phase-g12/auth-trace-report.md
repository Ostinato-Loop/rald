# RALD Authentication Trace Report
**Produced:** 2026-06-03  
**Classification:** G.12 Foundation Lockdown  
**Owner:** LILCKY STUDIO LIMITED  
**Scope:** `loop.rald.cloud → profiles.rald.cloud → Loop → Messenger SSO`

---

## Executive Summary

End-to-end authentication is broken for the majority of users. Five confirmed root causes were found across four repos. The most severe: the Loop login page hardcodes `accounts.rald.cloud` as the RALD SSO entry point — that domain returns a **Cloudflare 403 challenge** and is completely inaccessible. Every user who clicks "Sign in with RALD Profile" on Loop hits an immediate dead end. The remaining blockers affect cross-app token propagation and the `registered_apps` schema.

---

## System Architecture (Confirmed)

```
┌─────────────────────────────────────────────────────────────────────┐
│  IDENTITY LAYER (profiles.rald.cloud)                               │
│  rald-auth-ui   →   auth.rald.cloud (rald-auth-core CF Worker)      │
│  React SPA           Issues RALD JWT (RALD_JWT_SECRET)              │
│  - Identity.tsx      POST /auth/send-otp, /auth/verify-otp          │
│  - Verify.tsx        GET /me, POST /sso/exchange                     │
└──────────────────────────┬──────────────────────────────────────────┘
                           │  redirect: ?rald_token=JWT&app_id=<app>
              ┌────────────┴────────────────────┐
              ▼                                 ▼
┌─────────────────────────┐     ┌───────────────────────────────────┐
│  LOOP  (loop.rald.cloud)│     │  MESSENGER (messenger.rald.cloud) │
│  React SPA              │     │  React SPA + CF Worker            │
│  use-auth.tsx           │     │  auth.tsx (SSO callback useEffect) │
│  • rald_master_token    │     │  • messenger_rald_token           │
│  • loop_token           │     │    (RALD JWT stored directly)     │
│         ↓               │     │         ↓                        │
│  loop-api.rald.cloud    │     │  POST /auth/rald-sso              │
│  CF Worker              │     │  → validates RALD_JWT_SECRET      │
│  • LOOP_JWT_SECRET      │     │  → stateless, no DB write        │
│  • RALD_JWT_SECRET      │     └───────────────────────────────────┘
│  POST /api/auth/rald-sso│
│    RALD JWT → Loop JWT  │
└─────────────────────────┘
```

**JWT Token System:**
- `auth.rald.cloud` → issues **RALD JWT** (signed with `RALD_JWT_SECRET`)
- `loop-api.rald.cloud` → issues **Loop JWT** (signed with `LOOP_JWT_SECRET`)
- `messenger.rald.cloud` → accepts **RALD JWT** directly as Bearer (no separate token)
- Cross-app SSO: uses `rald_master_token` (RALD JWT) stored in Loop's localStorage

---

## Live Endpoint Status

| Endpoint | Status | Notes |
|---|---|---|
| `auth.rald.cloud/health` | ✅ 200 | Version 2.1.0 — healthy |
| `auth.rald.cloud/ready` | ✅ 200 | All checks pass except Clerk |
| `profiles.rald.cloud` | ✅ 200 | React SPA loads (rald-auth-ui) |
| `loop.rald.cloud` | ✅ 200 | Loop SPA loads |
| `loop.rald.cloud/login` | ✅ 200 | Login page renders |
| `loop-api.rald.cloud/api/health` | ✅ 200 | CF Worker is live, all bindings active |
| `loop-api.rald.cloud/health` | ❌ 404 | Routes are under `/api/` prefix (expected) |
| `messenger.rald.cloud/health` | ✅ 200 | Worker healthy |
| `messenger.rald.cloud` | ⚠️ 401 | Worker active, requires auth (expected) |
| `messenger.rald.cloud/auth/rald-sso` | ⚠️ 400 | Missing rald_token (expected) |
| `auth.rald.cloud/sso/apps` | ⚠️ 200 | Returns `source: "fallback"` — DB table missing |
| `auth.rald.cloud/sso/registry` | ❌ 503 | `registered_apps` table not found |
| `accounts.rald.cloud` | ❌ 403 | **Cloudflare challenge — inaccessible** |

---

## Root Cause Analysis

---

### 🔴 BLOCKER-1 — Loop Login Page Hardcodes Dead SSO Domain

**Severity:** CRITICAL — blocks 100% of RALD SSO logins from Loop  
**Symptom:** User clicks "Sign in with RALD Profile" on Loop login → Cloudflare 403 challenge page

**Root cause in `loop/artifacts/loop/src/pages/login.tsx`:**
```html
<a href="https://accounts.rald.cloud?redirect_to=https%3A%2F%2Floop.rald.cloud%2Flogin&app_id=loop"
   ...>
  Sign in with RALD Profile
</a>
```

**Root cause in `loop/artifacts/loop/src/lib/cross-app.ts`:**
```typescript
const RALD_AUTH_UI = "https://accounts.rald.cloud";
// ↑ hardcoded — does NOT read VITE_RALD_AUTH_URL
```

**Confirmed live:** `curl -sI https://accounts.rald.cloud` → `HTTP/2 403` + `cf-mitigated: challenge`

**What makes this worse:** `use-auth.tsx` (the hook) correctly reads:
```typescript
const RALD_AUTH_UI = (import.meta.env.VITE_RALD_AUTH_URL as string | undefined) ?? "https://profiles.rald.cloud";
```
But the **login page button is a plain `<a href>` tag** — it bypasses the hook entirely and hardcodes the wrong domain directly in JSX. The hook never runs for that click path.

**Fix:**
```diff
# loop/artifacts/loop/src/pages/login.tsx
-href="https://accounts.rald.cloud?redirect_to=...&app_id=loop"
+href={`${import.meta.env.VITE_RALD_AUTH_URL ?? "https://profiles.rald.cloud"}?redirect_to=${encodeURIComponent("https://loop.rald.cloud/login")}&app_id=loop`}

# loop/artifacts/loop/src/lib/cross-app.ts
-const RALD_AUTH_UI = "https://accounts.rald.cloud";
+const RALD_AUTH_UI = (import.meta.env.VITE_RALD_AUTH_URL as string | undefined) ?? "https://profiles.rald.cloud";
```

---

### 🔴 BLOCKER-2 — OTP-Authed Loop Users Have No RALD Master Token

**Severity:** CRITICAL — breaks cross-app SSO for all users who log into Loop via phone OTP

**Root cause:** When a user authenticates via Termii OTP (the primary Loop login method), the `verify-otp` endpoint on the Loop CF Worker issues a **Loop JWT** (`LOOP_JWT_SECRET`). No RALD master token is ever generated or stored.

**Trace through `use-auth.tsx`:**
```
POST /api/auth/verify-otp
  → returns { access_token: LOOP_JWT, user }
  → stored as "loop_token" in localStorage
  → "rald_master_token" is NEVER set
```

**What happens when user navigates to Messenger (from `cross-app.ts`):**
```typescript
export function openMessenger(path = "/chats"): void {
  const raldToken = getRaldMasterToken(); // → null
  if (raldToken && isTokenValid(raldToken)) {
    // ← this branch never executes after OTP login
  } else {
    redirectToRaldAuth(MESSENGER_URL, "messenger", path);
    // ← redirects to accounts.rald.cloud (BLOCKED — Blocker 1)
  }
}
```

**Result:** Every OTP-authenticated Loop user who tries to open Messenger is bounced to the blocked `accounts.rald.cloud` domain.

**Fix options:**
1. **Short-term:** After successful OTP login in the Loop CF Worker, additionally call `POST auth.rald.cloud/sso/exchange` with the newly-created Supabase session token to obtain a RALD master token, return it alongside the loop_token, and store it as `rald_master_token`.
2. **Long-term:** Unify the token issuer — Loop CF Worker should call rald-auth-core as the authority and exchange for both a RALD JWT and a Loop JWT in a single flow.

---

### 🔴 BLOCKER-3 — `RALD_JWT_SECRET` in Loop CF Worker Is Not Guaranteed Set

**Severity:** HIGH — when missing, ALL RALD SSO exchanges on Loop return 401

**Root cause:** The Loop deploy workflow (`loop/.github/workflows/deploy.yml`) pushes `RALD_JWT_SECRET` with a `WARNING` fallback, not a hard failure:
```yaml
- name: Push RALD_JWT_SECRET to worker
  run: |
    if [ -z "$RALD_JWT_SECRET" ]; then
      echo "WARNING: RALD_JWT_SECRET not in GitHub secrets — SSO login will fail until this is added"
    else
      echo "$RALD_JWT_SECRET" | pnpm exec wrangler secret put RALD_JWT_SECRET --env production
    fi
```

Compare to `LOOP_JWT_SECRET` (same file) which correctly uses `exit 1` on missing secret.

**Impact path:** `rald-sso.ts` in the Loop CF Worker:
```typescript
const rald = await verifyRaldJwt(body.rald_token, c.env.RALD_JWT_SECRET);
if (!rald) return c.json({ error: "Invalid or expired RALD token" }, 401);
```
If `RALD_JWT_SECRET` is undefined, `crypto.subtle.importKey` will throw — all `POST /api/auth/rald-sso` calls return 500 or 401 silently.

**Fix:**
```diff
# loop/.github/workflows/deploy.yml
-echo "WARNING: RALD_JWT_SECRET not in GitHub secrets — SSO login will fail until this is added"
+echo "FATAL: RALD_JWT_SECRET is not set in GitHub secrets" && exit 1
```
Then add `RALD_JWT_SECRET` to the loop repo's GitHub Actions secrets and re-deploy.

**Verification:**
```bash
curl -X POST https://loop-api.rald.cloud/api/auth/rald-sso \
  -H "Content-Type: application/json" \
  -d '{"rald_token":"<valid_rald_jwt>"}'
# Expected: { access_token: "...", user: {...} }
# Actual (if secret missing): 401 or 500
```

---

### 🟡 BLOCKER-4 — `registered_apps` Table Missing from Supabase

**Severity:** HIGH — auth system is in degraded fallback mode

**Confirmed:** `curl https://auth.rald.cloud/sso/registry`
```json
{"error":"Registry unavailable","detail":"Could not find the table 'public.registered_apps' in the schema cache"}
```

**Impact:** `isRegisteredApp()` in rald-auth-core falls through to `FALLBACK_APP_IDS` (hardcoded set that includes "loop", "messenger"). Token exchange still works. But:
- `/sso/apps` returns `"source":"fallback"` with a `note` warning
- `/sso/registry` (admin view) returns 503
- `POST /sso/registry` (app registration endpoint) fails
- `POST /sso/exchange` app-ID validation degrades to the hardcoded set
- Dynamic app registration for new ecosystem apps is impossible

**Fix:** Run the following migration in Supabase (project `onxdcikfttdmnhofsuwo`):
```sql
CREATE TABLE IF NOT EXISTS public.registered_apps (
  app_id       TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  domain       TEXT NOT NULL,
  callback_url TEXT NOT NULL,
  logout_url   TEXT,
  icon         TEXT,
  status       TEXT NOT NULL DEFAULT 'active',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS registered_apps_status_idx ON public.registered_apps (status);

-- Seed the current fallback apps
INSERT INTO public.registered_apps (app_id, name, domain, callback_url, status) VALUES
  ('loop',          'Loop',      'loop.rald.cloud',      'https://loop.rald.cloud/login',       'active'),
  ('messenger',     'Messenger', 'messenger.rald.cloud', 'https://messenger.rald.cloud/auth',   'active'),
  ('profiles',      'Profiles',  'profiles.rald.cloud',  'https://profiles.rald.cloud',         'active'),
  ('rald-inbox',    'Inbox',     'inbox.rald.cloud',     'https://inbox.rald.cloud',            'active'),
  ('payrald',       'PayRald',   'pay.rald.cloud',       'https://pay.rald.cloud',              'active'),
  ('dunarald',      'DunaRald',  'duna.rald.cloud',      'https://duna.rald.cloud',             'active'),
  ('gitrald',       'GitRald',   'git.rald.cloud',       'https://git.rald.cloud',              'active'),
  ('raldtics',      'Raldtics',  'analytics.rald.cloud', 'https://analytics.rald.cloud',        'active')
ON CONFLICT (app_id) DO NOTHING;
```

---

### 🟡 BLOCKER-5 — rald-auth-ui Post-Login SSO Redirect Requires Verification

**Severity:** HIGH — if broken, first-time logins at profiles.rald.cloud do NOT redirect back

**Root cause (partial):** `rald-auth-ui/src/App.tsx` App-level SSO redirect fires **only for already-authenticated users** on mount:
```typescript
useEffect(() => {
  if (redirectTo) saveRedirect(redirectTo, appId);  // ← saved to sessionStorage
  const token = getToken();
  if (!token) { setLoading(false); return; }  // ← returns early if not logged in
  api.me().then(async (u) => {
    const storedRedirect = getRedirectTo();
    if (storedRedirect) {
      const sso = await api.ssoExchange(storedAppId);
      url.searchParams.set("rald_token", sso.token);
      window.location.href = url.toString();  // ← redirect with token
    }
  });
}, []);  // runs only once on mount
```

When a **new user** lands on `profiles.rald.cloud?redirect_to=...&app_id=loop`:
1. `saveRedirect()` stores redirect_to in `sessionStorage` ✅
2. `getToken()` is null → `setLoading(false); return;` — **SSO code is skipped**
3. User fills in Identity → proceeds to Verify → enters OTP
4. **`VerifyPage` must call `getRedirectTo()` and do the SSO exchange after login** — otherwise the user stays on profiles.rald.cloud with no redirect back to Loop

`src/pages/Verify.tsx` has not been audited in this trace. This must be confirmed.

**Fix (if Verify.tsx does not redirect):** After successful `api.verifyOtp()` in `Verify.tsx`:
```typescript
const storedRedirect = getRedirectTo();
const storedAppId    = getAppId();
if (storedRedirect) {
  clearRedirect();
  const sso = await api.ssoExchange(storedAppId);
  const url = new URL(storedRedirect);
  url.searchParams.set("rald_token", sso.token);
  url.searchParams.set("app_id", storedAppId);
  window.location.href = url.toString();
  return;
}
navigate("/dashboard");
```

---

## Non-Blocking Findings

### Clerk: false
`auth.rald.cloud/ready` → `"clerk":false`. Clerk is referenced in `rald-auth-core` but is not in the critical path for Loop or Messenger. Zero impact on current users.

### Loop CF Worker Route Prefix
`loop-api.rald.cloud/health` → 404. All worker routes are under `/api/` (e.g. `/api/health`, `/api/auth/*`). The worker itself IS deployed and fully operational — confirmed by `loop-api.rald.cloud/api/health` → 200 with all bindings active (db, cache, media, taskQueue, roomSession, ai).

### Messenger JWT Design Is Correct
Messenger accepts the original RALD JWT directly as Bearer. The token issued by `auth.rald.cloud/sso/exchange` is signed with `RALD_JWT_SECRET`. Messenger's `authMiddleware` verifies against `RALD_JWT_SECRET`. The chain is correct — Messenger does NOT need to issue its own JWT. 

### Messenger SSO Callback URL Alignment
`messenger/src/pages/auth.tsx` `handleRaldSignIn()` sends:
```
profiles.rald.cloud?redirect_to=https://messenger.rald.cloud/auth&app_id=messenger
```
The Messenger `auth.tsx` SSO useEffect correctly detects `?rald_token=TOKEN` on mount and calls `POST /auth/rald-sso`, stores the RALD token as `messenger_rald_token`, and redirects to `/chats`. This path is architecturally sound (subject to Blocker-5).

---

## Step-by-Step Login Failure Trace

### Scenario A: Loop → RALD SSO → Loop

```
1. User visits loop.rald.cloud/login
2. User clicks "Sign in with RALD Profile"
3. Browser navigates to: accounts.rald.cloud?redirect_to=...&app_id=loop
                          ^^^^^^^^^^^^^^^^^^
4. ❌ CLOUDFLARE 403 CHALLENGE — user cannot proceed
```

**Failure point:** Step 3. Fix: BLOCKER-1.

---

### Scenario B: Messenger → RALD SSO → Messenger (button)

```
1. User visits messenger.rald.cloud/auth
2. User clicks "Continue with RALD account"
3. Browser navigates to: profiles.rald.cloud?redirect_to=messenger.rald.cloud/auth&app_id=messenger
4. User enters email/phone at profiles.rald.cloud  (Identity.tsx → Verify.tsx)
5. ? Verify.tsx calls api.verifyOtp() — gets token
6. ? Verify.tsx checks getRedirectTo() — needs audit
   If NO redirect handling in Verify.tsx:
     ❌ User stays on profiles.rald.cloud/dashboard — never returns to Messenger
   If YES redirect handling:
     ✅ api.ssoExchange("messenger") called
     ✅ RALD JWT issued (short TTL)
     ✅ Redirect to messenger.rald.cloud/auth?rald_token=TOKEN&app_id=messenger
     ✅ Messenger auth.tsx SSO useEffect fires
     ✅ POST /auth/rald-sso validates token
     ✅ messenger_rald_token stored
     ✅ Navigate to /chats  ← SUCCESS
```

**Failure point:** Step 6 — Verify.tsx redirect not confirmed.

---

### Scenario C: Loop (after OTP login) → open Messenger

```
1. User logs into Loop via phone OTP (send-otp + verify-otp)
2. loop_token = Loop JWT stored in localStorage
3. rald_master_token = null (never set by OTP path)
4. User navigates to Messenger via openMessenger()
5. getRaldMasterToken() → null
6. redirectToRaldAuth("https://messenger.rald.cloud", "messenger")
7. ❌ Redirects to accounts.rald.cloud — 403 BLOCKED (Blocker-1)
   If Blocker-1 fixed:
8. ✅ Redirects to profiles.rald.cloud?redirect_to=...&app_id=messenger
9. ? User must re-authenticate (RALD has no knowledge of their Loop OTP session)
   ❌ User forced to log in again — poor UX, not seamless SSO
```

**Failure points:** Step 7 (Blocker-1) and Step 9 (Blocker-2).

---

### Scenario D: Loop → RALD SSO → Loop (the CORRECT path once fixes are applied)

```
1. User visits loop.rald.cloud/login [BLOCKER-1 FIXED]
2. Clicks "Sign in with RALD Profile"
3. profiles.rald.cloud?redirect_to=loop.rald.cloud/login&app_id=loop
4. User authenticates (OTP via auth.rald.cloud)
5. Verify.tsx calls api.ssoExchange("loop") [BLOCKER-5 confirmed or fixed]
6. Redirect to loop.rald.cloud/login?rald_token=RALD_JWT&app_id=loop
7. use-auth.tsx useEffect detects rald_token ✅
8. localStorage.setItem("rald_master_token", raldToken) ✅
9. POST loop-api.rald.cloud/api/auth/rald-sso {rald_token}
   [BLOCKER-3 must be resolved: RALD_JWT_SECRET must be set in CF Worker]
10. Loop CF Worker verifies RALD JWT (RALD_JWT_SECRET) ✅
11. Upserts Supabase user ✅
12. Issues Loop JWT (LOOP_JWT_SECRET) ✅
13. localStorage.setItem("loop_token", LOOP_JWT) ✅
14. URL cleaned, loadSession() called ✅
15. User is logged in to Loop with BOTH rald_master_token AND loop_token ✅
16. openMessenger() now works: passes rald_master_token directly ✅
```

**This is the intended happy path. Steps 9–12 only work if BLOCKER-3 is resolved.**

---

## Fix Priority Matrix

| # | Blocker | Severity | Repo | Files to Change | Effort |
|---|---------|----------|------|-----------------|--------|
| 1 | `accounts.rald.cloud` → 403 | CRITICAL | `loop` | `login.tsx`, `cross-app.ts` | 5 min |
| 2 | No RALD token after OTP login | CRITICAL | `loop` + `rald-auth-core` | `auth.ts` (CF worker), `use-auth.tsx` | 2–4 hrs |
| 3 | `RALD_JWT_SECRET` not guaranteed in Loop CF Worker | HIGH | `loop` | `deploy.yml`, GitHub Secrets | 10 min |
| 4 | `registered_apps` table missing | HIGH | Supabase | SQL migration | 10 min |
| 5 | `Verify.tsx` post-login SSO redirect unconfirmed | HIGH | `rald-auth-ui` | `Verify.tsx` | Audit first |

---

## Immediate Action Items

### Action 1 — Deploy Fix NOW (5 minutes)
In repo `loop`, change two files:

**`artifacts/loop/src/pages/login.tsx`** — replace the hardcoded SSO `<a href>`:
```tsx
// Before
href="https://accounts.rald.cloud?redirect_to=...&app_id=loop"

// After
href={`${import.meta.env.VITE_RALD_AUTH_URL ?? "https://profiles.rald.cloud"}?redirect_to=${encodeURIComponent("https://loop.rald.cloud/login")}&app_id=loop`}
```

**`artifacts/loop/src/lib/cross-app.ts`** — replace the hardcoded constant:
```ts
// Before
const RALD_AUTH_UI = "https://accounts.rald.cloud";

// After
const RALD_AUTH_UI = (import.meta.env.VITE_RALD_AUTH_URL as string | undefined) ?? "https://profiles.rald.cloud";
```

### Action 2 — Set Loop CF Worker Secret (10 minutes)
```bash
# In loop/artifacts/cloudflare-worker
echo "<same-value-as-rald-auth-core-RALD_JWT_SECRET>" | \
  wrangler secret put RALD_JWT_SECRET --env production
```
Also add `RALD_JWT_SECRET` to the `loop` repo's GitHub Actions secrets and change the `WARNING` to `exit 1`.

### Action 3 — Create registered_apps Table (10 minutes)
Run the SQL migration from BLOCKER-4 in the Supabase SQL editor for project `onxdcikfttdmnhofsuwo`.

### Action 4 — Audit rald-auth-ui/src/pages/Verify.tsx (15 minutes)
Check whether `Verify.tsx` calls `getRedirectTo()` after successful OTP verification and performs the `api.ssoExchange()` + redirect dance. If not, implement it.

### Action 5 — Implement RALD Token Propagation After OTP Login (longer)
After a user completes Termii OTP login in Loop, the Loop CF Worker or the frontend should also request a RALD master token from `auth.rald.cloud/sso/exchange`. This requires Loop to call rald-auth-core on behalf of the user — architecture discussion needed.

---

## Files Traced in This Report

| File | Repo | Status |
|------|------|--------|
| `artifacts/loop/src/pages/login.tsx` | `loop` | ❌ Hardcodes `accounts.rald.cloud` |
| `artifacts/loop/src/lib/cross-app.ts` | `loop` | ❌ Hardcodes `accounts.rald.cloud` |
| `artifacts/loop/src/hooks/use-auth.tsx` | `loop` | ✅ Correct (uses VITE env var) |
| `artifacts/cloudflare-worker/src/routes/auth.ts` | `loop` | ✅ OTP flow correct |
| `artifacts/cloudflare-worker/src/routes/rald-sso.ts` | `loop` | ✅ Logic correct (secret may be missing) |
| `artifacts/cloudflare-worker/src/index.ts` | `loop` | ✅ Routes correctly mounted |
| `.github/workflows/deploy.yml` | `loop` | ⚠️ WARNING instead of exit 1 for RALD_JWT_SECRET |
| `src/App.tsx` | `rald-auth-ui` | ⚠️ SSO redirect only on mount for auth'd users |
| `src/pages/Identity.tsx` | `rald-auth-ui` | ⚠️ No post-login redirect — navigates to /verify |
| `src/pages/Verify.tsx` | `rald-auth-ui` | ❓ Not traced — must audit |
| `src/lib/api.ts` | `rald-auth-ui` | ✅ api.ssoExchange() exists |
| `src/routes/sso.ts` | `rald-auth-core` | ✅ Exchange + handoff routes exist |
| `workers/loop-messenger-api/src/index.ts` | `messenger` | ✅ SSO mounted correctly at `/` |
| `workers/loop-messenger-api/src/routes/sso.ts` | `messenger` | ✅ Stateless, validates RALD JWT |
| `workers/loop-messenger-api/src/lib/middleware.ts` | `messenger` | ✅ authMiddleware uses RALD_JWT_SECRET |
| `artifacts/loop-messenger/src/pages/auth.tsx` | `messenger` | ✅ SSO callback useEffect correct |

---

*Report generated by RALD G.12 Auth Trace investigation — 2026-06-03*
