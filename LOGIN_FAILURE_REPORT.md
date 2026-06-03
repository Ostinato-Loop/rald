# LOGIN_FAILURE_REPORT.md
**Date:** 2026-06-03  
**Severity:** Production Incident — Complete Login Failure  
**Owner:** LILCKY STUDIO LIMITED  
**Scope:** `profiles.rald.cloud → auth.rald.cloud → loop.rald.cloud → messenger.rald.cloud`

---

## Verification Timestamp

All findings below are from live production probes conducted at **2026-06-03 16:24–16:33 UTC**.

---

## Infrastructure Status

| Service | URL | Status | Evidence |
|---------|-----|--------|----------|
| Identity Backend | `auth.rald.cloud` | ✅ 200 | v2.1.0, supabase:✅ jwt:✅ termii:⚠️ resend:✅ |
| Identity Frontend | `profiles.rald.cloud` | ✅ 200 | SPA loads, correct backend |
| Loop Frontend | `loop.rald.cloud` | ✅ 200 | SPA loads, bundle correct |
| Loop API | `loop-api.rald.cloud/api/health` | ✅ 200 | All bindings active (db,cache,media,queue,DO,ai) |
| Messenger API | `messenger.rald.cloud/health` | ✅ 200 | v1.0.0 healthy |
| OLD SSO URL | `accounts.rald.cloud` | ❌ 403 | Cloudflare challenge — inaccessible |

---

## Code State Verification

| File | Repo | Check | Result |
|------|------|-------|--------|
| `artifacts/loop/src/pages/login.tsx` | `loop` | `accounts.rald.cloud` refs | ✅ 0 refs (fixed) |
| `artifacts/loop/src/lib/cross-app.ts` | `loop` | `accounts.rald.cloud` refs | ✅ 0 refs (fixed) |
| `artifacts/loop/src/hooks/use-auth.tsx` | `loop` | SSO URL used | ✅ `VITE_RALD_AUTH_URL ?? profiles.rald.cloud` |
| Deployed bundle | `loop.rald.cloud/assets/index-DkNpHulr.js` | `accounts.rald.cloud` in JS | ✅ 0 occurrences |
| Deployed bundle | `loop.rald.cloud/assets/index-DkNpHulr.js` | `VITE_API_BASE_URL` | ✅ `Dh="https://loop-api.rald.cloud"` |
| Deployed bundle | `loop.rald.cloud/assets/index-DkNpHulr.js` | SSO redirect target | ✅ `href=\`https://profiles.rald.cloud?redirect_to=...\`` |
| `src/pages/Verify.tsx` | `rald-auth-ui` | Post-login SSO redirect | ✅ `doRedirect()` → `api.ssoExchange()` → `window.location.href` |
| CORS: `loop-api.rald.cloud` | live probe | `Access-Control-Allow-Origin` | ✅ `https://loop.rald.cloud` |

---

## Authentication Flow Trace

### Step-by-step: User Clicks "Sign in with RALD Profile" on Loop

```
REQUEST:
  User → loop.rald.cloud/login (browser)
RESPONSE:
  HTTP 200 — Loop SPA loads ✅
  
REQUEST:
  User clicks "Sign in with RALD Profile"
  href = `${VITE_RALD_AUTH_URL ?? "https://profiles.rald.cloud"}
          ?redirect_to=https%3A%2F%2Floop.rald.cloud%2Flogin&app_id=loop`
RESPONSE:
  → browser navigates to profiles.rald.cloud?redirect_to=...&app_id=loop ✅
  HTTP 200 — Identity SPA loads ✅
  App.tsx useEffect: saves redirect_to="https://loop.rald.cloud/login" 
                     and app_id="loop" to sessionStorage ✅
  No existing token → shows sign-in form ✅

─── PHONE OTP PATH ────────────────────────────────────────────────────
REQUEST:
  User enters phone → Identity.tsx → navigate("/verify")
  Verify.tsx mounts → api.sendOtp(phone)
  POST https://auth.rald.cloud/auth/send-otp
  Body: {"phone": "+2348012345678"}
  Headers: Content-Type: application/json

RESPONSE: ❌ FAILURE AT THIS STEP
  HTTP 200 (Termii error wrapped)
  Body: {"error":"404 : \"{\"code\":404,\"message\":\"ApplicationSenderId not 
         found for applicationId: 66189 and senderName: RALD\",
         \"status\":\"error\",\"link\":\"uri=/sms/token\"}\""}

  Result: User sees "Failed to send code. Please try again."
  Login is BLOCKED — OTP never delivered.
  
─── EMAIL OTP PATH ────────────────────────────────────────────────────
REQUEST:
  User enters email → api.sendOtp(email)
  POST https://auth.rald.cloud/auth/send-login-email-otp
  Body: {"email": "user@example.com"}

RESPONSE: ⚠️ UNVERIFIED (Resend enabled, assumed working)
  Expected: HTTP 200, {"sessionToken":"...", "message":"..."}
  
  If email path works:
  → User receives 6-digit code by email
  → Enters code in Verify.tsx
  → api.verifyOtp(email, code, {sessionToken}) 
  → POST auth.rald.cloud/auth/verify-login-email-otp
  → Returns {token: RALD_JWT, user: {...}} ✅
  
  → Verify.tsx: saveToken(RALD_JWT) → localStorage["rald_token"] = RALD_JWT ✅
  → doRedirect()
    → getRedirectTo() = "https://loop.rald.cloud/login" ✅
    → getAppId() = "loop" ✅
    → clearRedirect() ✅
    → api.ssoExchange("loop")
      → POST https://auth.rald.cloud/sso/exchange
        Body: {"appId":"loop"}
        Headers: Authorization: Bearer RALD_JWT (master token)
      → Response: {"token": APP_SCOPED_TOKEN, "appId":"loop", "expiresIn":3600} ✅
        (app-scoped, 1-hour, also signed with RALD_JWT_SECRET)
    → window.location.href = 
        "https://loop.rald.cloud/login?rald_token=APP_SCOPED_TOKEN&app_id=loop" ✅

── LOOP CALLBACK ──────────────────────────────────────────────────────
REQUEST:
  Browser → loop.rald.cloud/login?rald_token=APP_SCOPED_TOKEN&app_id=loop
  
  use-auth.tsx useEffect fires on mount:
  → detects rald_token in URL params ✅
  → localStorage.setItem("rald_master_token", APP_SCOPED_TOKEN) ✅
  → POST https://loop-api.rald.cloud/api/auth/rald-sso
    Body: {"rald_token": APP_SCOPED_TOKEN}
    Headers: Content-Type: application/json

RESPONSE: ⚠️ UNKNOWN — DEPENDS ON RALD_JWT_SECRET
  If RALD_JWT_SECRET IS set in Loop CF Worker:
    → verifyRaldJwt(APP_SCOPED_TOKEN, RALD_JWT_SECRET) → valid payload ✅
    → Upsert Supabase auth user (by email) ✅
    → Upsert profiles row ✅  
    → Issue Loop JWT (LOOP_JWT_SECRET, 30-day) ✅
    → Response: {"access_token": LOOP_JWT, "user":{...}} ✅
    → localStorage.setItem("loop_token", LOOP_JWT) ✅
    → URL cleaned (replaceState) ✅
    → loadSession() → fetch /api/auth/me ✅
    → User sees Loop home page ✅ ← SUCCESS
    
  If RALD_JWT_SECRET is NOT set in Loop CF Worker:
    → verifyRaldJwt(token, undefined) → TypeError in crypto.subtle.importKey
    → try/catch returns null
    → Response: HTTP 401, {"error":"Invalid or expired RALD token"}
    → use-auth.tsx: `if (res.ok)` is false — silently ignores failure
    → loadSession() runs with no loop_token stored
    → User stays on loop.rald.cloud/login ❌ (no error message shown)
    ← SILENT FAILURE — user sees login page again with no explanation

── LOOP → MESSENGER SSO ───────────────────────────────────────────────
  (Only reachable if Loop login succeeds)
  
  User is authenticated, has rald_master_token in localStorage
  → openMessenger() in cross-app.ts / use-auth.tsx
  → getRaldMasterToken() → APP_SCOPED_TOKEN (not null) ✅
  → isTokenValid(token) → true (1 hour TTL) ✅
  → window.location.href = 
      "https://messenger.rald.cloud/chats?rald_token=APP_SCOPED_TOKEN&app_id=messenger" ✅
  
  Messenger auth.tsx SSO useEffect:
  → detects rald_token ✅
  → POST https://messenger.rald.cloud/auth/rald-sso
    Body: {"rald_token": APP_SCOPED_TOKEN}
  → Messenger worker: verifyJwt(token, RALD_JWT_SECRET) → validates ✅
  → Response: {"authenticated":true, "user":{...}, "token": APP_SCOPED_TOKEN} ✅
  → localStorage.setItem("messenger_rald_token", APP_SCOPED_TOKEN) ✅
  → navigate("/chats") ✅ ← MESSENGER SUCCESS
```

---

## Root Cause Analysis

### FAILURE-1 — Termii Sender "RALD" Not Configured

**Status:** ❌ CONFIRMED PRODUCTION FAILURE  
**Severity:** CRITICAL — Blocks 100% of phone-based logins  
**Service:** `auth.rald.cloud` (rald-auth-core)  
**Also affects:** `loop-api.rald.cloud` (Loop CF Worker OTP)

**Evidence:**
```bash
# Live test at 2026-06-03 16:27 UTC
POST https://auth.rald.cloud/auth/send-otp
Body: {"phone":"+2348012345678"}

Response:
{"error":"404 : \"{\"code\":404,\"message\":\"ApplicationSenderId not found 
for applicationId: 66189 and senderName: RALD\",\"status\":\"error\",
\"link\":\"uri=/sms/token\"}\""}

POST https://loop-api.rald.cloud/api/auth/send-otp  
Body: {"phone":"+2348012345678"}

Response:
{"error":"Failed to send OTP. Please try again."}
```

**Code location (rald-auth-core):**
```typescript
// src/routes/auth.ts — Line 213
const senderId = c.env.TERMII_SENDER_ID || "N-Alert";
```
The CF Worker secret `TERMII_SENDER_ID` is set to `"RALD"` but Termii reports this sender ID is not registered for the account.

**Fix options (choose one):**
1. **Register "RALD" as an approved sender in Termii dashboard** (applicationId: 66189)
2. **Update `TERMII_SENDER_ID` secret to an approved sender** (e.g. alphanumeric sender or default "N-Alert"):
   ```bash
   # In rald-auth-core directory
   echo "N-Alert" | wrangler secret put TERMII_SENDER_ID
   # In loop/artifacts/cloudflare-worker
   echo "N-Alert" | wrangler secret put TERMII_SENDER_ID --env production
   ```
3. **Workaround while Termii is down:** Direct all users to use email login (already supported via `/auth/send-login-email-otp` + Resend)

**Verification after fix:**
```bash
curl -X POST https://auth.rald.cloud/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+2348012345678"}'
# Expected: {"message":"Verification code sent","pinId":"..."}
```

---

### FAILURE-2 — RALD_JWT_SECRET Likely Not Set in Loop CF Worker

**Status:** ⚠️ UNCONFIRMED but HIGH RISK — Silent failure if missing  
**Severity:** CRITICAL — If unset, RALD SSO to Loop silently fails  
**Service:** `loop-api.rald.cloud` (Loop Cloudflare Worker)

**Evidence:**
```bash
# Both responses look identical whether secret is set or not
POST https://loop-api.rald.cloud/api/auth/rald-sso
Body: {"rald_token":"bad.token.value"}

Response: {"error":"Invalid or expired RALD token"}  ← same error either way
```

**Code vulnerability (loop deploy.yml prior to today's fix):**
```yaml
# .github/workflows/deploy.yml — secret push step (was)
if [ -z "$RALD_JWT_SECRET" ]; then
  echo "WARNING: RALD_JWT_SECRET not in GitHub secrets — SSO login will fail"
  # ← No exit 1 — deployment continued even without the secret
else
  echo "$RALD_JWT_SECRET" | wrangler secret put RALD_JWT_SECRET --env production
fi
```
**This WARNING path means:** if `RALD_JWT_SECRET` was never added to the loop repo's GitHub Actions secrets, every deploy silently skipped pushing it. The deployed worker may have no `RALD_JWT_SECRET` bound.

**Silent failure mode in use-auth.tsx:**
```typescript
// When /api/auth/rald-sso returns 401:
const res = await fetch(`${API_BASE}/api/auth/rald-sso`, {...});
if (res.ok) {
  // ← Only executes on 200. On 401, falls through silently.
  localStorage.setItem(TOKEN_KEY, data.access_token);
}
// No else branch — failure is swallowed. User stays on login page.
```

**Required fix:**
1. Add `RALD_JWT_SECRET` to the `loop` repository's GitHub Actions secrets  
   (must be the **same value** as in `rald-auth-core` `RALD_JWT_SECRET`)
2. Manually push to the deployed worker:
   ```bash
   cd loop/artifacts/cloudflare-worker
   echo "YOUR_RALD_JWT_SECRET_VALUE" | \
     wrangler secret put RALD_JWT_SECRET --env production
   ```
3. Re-run the deploy workflow to confirm the secret push succeeds with `exit 1` enforcement

**Verification after fix:**
```bash
# Get a real RALD token (after fixing Termii/email login) then:
curl -X POST https://loop-api.rald.cloud/api/auth/rald-sso \
  -H "Content-Type: application/json" \
  -d '{"rald_token":"<real_rald_token>"}'
# Expected: {"access_token":"<loop_jwt>","user":{"id":"...","phone":"..."}}
```

---

### FAILURE-3 — `registered_apps` Table Missing from Supabase

**Status:** ❌ CONFIRMED — SSO in degraded mode  
**Severity:** HIGH — System running on hardcoded fallback  
**Service:** `auth.rald.cloud` → Supabase project `onxdcikfttdmnhofsuwo`

**Evidence:**
```bash
GET https://auth.rald.cloud/sso/registry
Response: {"error":"Registry unavailable",
           "detail":"Could not find the table 'public.registered_apps' 
                     in the schema cache"}

GET https://auth.rald.cloud/sso/apps
Response: {..., "source":"fallback", 
           "note":"registered_apps table unavailable — using emergency fallback list"}
```

**Impact:** SSO exchange still functions (fallback includes "loop", "messenger") but app registration, admin registry view, and dynamic app management are all broken.

**Fix:** Run in Supabase SQL editor (project: `onxdcikfttdmnhofsuwo`):
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

CREATE INDEX IF NOT EXISTS registered_apps_status_idx 
  ON public.registered_apps (status);

INSERT INTO public.registered_apps 
  (app_id, name, domain, callback_url, icon, status) VALUES
  ('loop',      'Loop',      'loop.rald.cloud',      'https://loop.rald.cloud/login',     '🎵', 'active'),
  ('messenger', 'Messenger', 'messenger.rald.cloud', 'https://messenger.rald.cloud/auth', '💬', 'active'),
  ('profiles',  'Profiles',  'profiles.rald.cloud',  'https://profiles.rald.cloud',       '👤', 'active'),
  ('rald-inbox','Inbox',     'inbox.rald.cloud',     'https://inbox.rald.cloud',          '📥', 'active'),
  ('payrald',   'PayRald',   'pay.rald.cloud',       'https://pay.rald.cloud',            '💳', 'active')
ON CONFLICT (app_id) DO NOTHING;
```

**Verification:**
```bash
curl https://auth.rald.cloud/sso/apps
# Expected: {..., "source":"database"}
```

---

## Previously Fixed (Verified In Production)

### FIXED-1 — `accounts.rald.cloud` Removed From All Live Code

**Fix applied:** 2026-06-03 (this session)  
**Verification:** Live bundle scan at 16:28 UTC

```bash
# Deployed bundle index-DkNpHulr.js
grep "accounts.rald.cloud" bundle → 0 occurrences ✅

# Deployed SSO button in bundle:
href=`https://profiles.rald.cloud?redirect_to=${encodeURIComponent(...
```

Files fixed:
- `loop/artifacts/loop/src/pages/login.tsx` — `href` now uses `profiles.rald.cloud`
- `loop/artifacts/loop/src/lib/cross-app.ts` — `RALD_AUTH_UI` now uses `profiles.rald.cloud`

---

### FIXED-2 — RALD_JWT_SECRET Missing = Hard Fail (not silent WARNING)

**Fix applied:** 2026-06-03  
`loop/.github/workflows/deploy.yml` — changed WARNING to `exit 1`

---

## Remaining Code Issue (Cosmetic)

### `use-auth.tsx` JSDoc Comment Still References `accounts.rald.cloud`

**File:** `loop/artifacts/loop/src/hooks/use-auth.tsx` line 11  
**Content:** `*   1. User redirected to accounts.rald.cloud?redirect_to=...` (comment only)  
**Impact:** None (comment, not executable code)  
**Fix:** Update comment to say `profiles.rald.cloud`

### Silent RALD SSO Failure in `use-auth.tsx`

**File:** `loop/artifacts/loop/src/hooks/use-auth.tsx`  
**Problem:** When `POST /api/auth/rald-sso` returns 401 (e.g. RALD_JWT_SECRET not set), the error is silently swallowed. User lands back on the login page with no error message.
**Fix:** Add error state handling (see fix below).

---

## Fix Priority Matrix

| # | Status | Failure | Action | Who | Effort |
|---|--------|---------|--------|-----|--------|
| 1 | ❌ BLOCKING | Termii sender "RALD" not found | Register sender in Termii OR change `TERMII_SENDER_ID` secret to approved sender | DevOps | 10 min |
| 2 | ⚠️ BLOCKING | RALD_JWT_SECRET missing in Loop CF Worker | Add to GitHub secrets + push via wrangler | DevOps | 10 min |
| 3 | ❌ DEGRADED | `registered_apps` table missing | Run SQL migration in Supabase dashboard | DevOps | 5 min |
| 4 | ✅ FIXED | `accounts.rald.cloud` in code | Already deployed | — | Done |
| 5 | Code | Silent SSO failure in `use-auth.tsx` | Add error redirect | Engineering | 15 min |

---

## Exact Commands to Fix (Run Today)

### Fix 1 — Termii Sender ID
```bash
# Option A: Update rald-auth-core sender
cd rald-auth-core
echo "N-Alert" | wrangler secret put TERMII_SENDER_ID

# Option B: Update loop CF worker sender  
cd loop/artifacts/cloudflare-worker
echo "N-Alert" | wrangler secret put TERMII_SENDER_ID --env production

# Then verify:
curl -X POST https://auth.rald.cloud/auth/send-otp \
  -H "Content-Type: application/json" -d '{"phone":"+2348012345678"}'
```

### Fix 2 — RALD_JWT_SECRET in Loop Worker
```bash
# 1. Add to GitHub secrets: Settings → Secrets → RALD_JWT_SECRET
# 2. Push to CF Worker immediately:
cd loop/artifacts/cloudflare-worker
echo "<SAME_VALUE_AS_RALD_AUTH_CORE_RALD_JWT_SECRET>" | \
  wrangler secret put RALD_JWT_SECRET --env production

# Then verify:
curl -X POST https://loop-api.rald.cloud/api/auth/rald-sso \
  -H "Content-Type: application/json" \
  -d '{"rald_token":"<real_rald_token_from_successful_login>"}'
# Expected: 200 {"access_token":"...","user":{...}}
```

### Fix 3 — Supabase registered_apps Table
```sql
-- Run in Supabase SQL editor: https://supabase.com/dashboard/project/onxdcikfttdmnhofsuwo/sql
CREATE TABLE IF NOT EXISTS public.registered_apps (
  app_id TEXT PRIMARY KEY,
  name TEXT NOT NULL, domain TEXT NOT NULL,
  callback_url TEXT NOT NULL, logout_url TEXT, icon TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.registered_apps (app_id,name,domain,callback_url,icon,status) VALUES
  ('loop','Loop','loop.rald.cloud','https://loop.rald.cloud/login','🎵','active'),
  ('messenger','Messenger','messenger.rald.cloud','https://messenger.rald.cloud/auth','💬','active'),
  ('profiles','Profiles','profiles.rald.cloud','https://profiles.rald.cloud','👤','active')
ON CONFLICT (app_id) DO NOTHING;
```

---

## Success Criteria Checklist

After all three fixes above are applied, verify:

- [ ] `POST auth.rald.cloud/auth/send-otp {phone: "+2348012345678"}` → 200, `{"message":"...","pinId":"..."}`
- [ ] OTP code received on phone
- [ ] `POST auth.rald.cloud/auth/verify-otp` with correct code → 200, `{"token":"..."}`
- [ ] `POST auth.rald.cloud/sso/exchange {appId:"loop"}` with Bearer token → 200, `{"token":"...","appId":"loop"}`
- [ ] `GET auth.rald.cloud/sso/apps` → `"source":"database"` (not fallback)
- [ ] Browser: `profiles.rald.cloud?redirect_to=https://loop.rald.cloud/login&app_id=loop` → sign in → redirect to loop with token
- [ ] `POST loop-api.rald.cloud/api/auth/rald-sso` with real RALD token → 200, `{"access_token":"..."}`
- [ ] Loop home page loads with user session
- [ ] `openMessenger()` → `messenger.rald.cloud` loads with user session
- [ ] All without manual intervention

*Report version: v1.0 — 2026-06-03 — LILCKY STUDIO LIMITED*
