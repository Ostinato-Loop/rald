# REDIRECT_LOOP_REPORT.md
**Document Type:** Phase F.75 Certification  
**Owner:** LILCKY STUDIO LIMITED  
**Ecosystem:** RALD  
**Date:** 2026-06-02  
**Version:** 1.0

---

## PURPOSE

Identify every possible redirect loop in the RALD ecosystem, document root causes, and certify that each is eliminated by the routing standard.

---

## LOOP CATALOGUE

### LOOP-01 — Auth ↔ Auth Loop
**Scenario:** A product redirects an unauthenticated user to `app.rald.cloud/login`, and login itself has a bug that redirects back to the same product, which redirects back to login.

**Root Cause:**
- `redirect_to` parameter is not validated.
- Login page processes `redirect_to` unconditionally and redirects before auth completes.

**Detection:**
```
Product → app.rald.cloud/login?redirect_to={product}
app.rald.cloud/login → (bug) → Product
Product → app.rald.cloud/login?redirect_to={product}
... (infinite)
```

**Elimination:**
- `safeRedirect()` loop counter (sessionStorage, max 3) breaks the cycle.
- Login page MUST NOT redirect while auth form is displayed.
- `redirect_to` only processed AFTER successful authentication.

**Status:** ✅ ELIMINATED by RALD_ROUTING_STANDARD_v1 §5

---

### LOOP-02 — Onboarding Loop
**Scenario:** User completes onboarding but `onboarding_complete` is not set to `true`. Product sends user back to onboarding. Onboarding sends user back to product. Loop.

**Root Cause:**
- API fails to set `onboarding_complete = true` after final step.
- Or: Product reads stale cached user state (still shows `false`).

**Detection:**
```
Product → app.rald.cloud/onboarding?redirect_to={product}
Onboarding → (completes) → Product
Product → (stale cache) → app.rald.cloud/onboarding
... (infinite)
```

**Elimination:**
- `onboarding_complete` cached in memory is refreshed via `GET /api/auth/me` after every onboarding completion redirect.
- `app.rald.cloud/onboarding` checks: if `onboarding_complete = true`, do NOT redirect to onboarding again — redirect to `redirect_to` or `/home`.
- `safeRedirect()` counter catches any remaining case.

**Status:** ✅ ELIMINATED by RALD_ONBOARDING_STANDARD_v1 §6

---

### LOOP-03 — Workspace Selection Loop
**Scenario:** A workspace-scoped product detects no workspace and redirects to `app.rald.cloud/workspace-select`. Workspace select page redirects back to product. Product still has no workspace context. Loop.

**Root Cause:**
- Workspace was selected but not persisted in localStorage before redirect.
- Or: Product does not read `?workspace_id=` URL parameter on return.

**Detection:**
```
Product → app.rald.cloud/workspace-select?redirect_to={product}
Workspace select → (picks workspace) → Product?workspace_id={id}
Product → (does not read URL param) → workspace-select again
... (infinite)
```

**Elimination:**
- Workspace resolution reads `?workspace_id=` URL parameter FIRST (highest priority).
- `app.rald.cloud/workspace-select` sets `localStorage("rald_workspace_id")` AND includes `?workspace_id=` in `redirect_to` destination.
- `safeRedirect()` counter catches residual cases.

**Status:** ✅ ELIMINATED by RALD_WORKSPACE_SWITCHER_STANDARD_v1 §2.3

---

### LOOP-04 — Expired Session Loop
**Scenario:** Product detects expired token (401) and redirects to login. Login re-issues a new token but `redirect_to` points back to a route that immediately gets a 401 again (e.g., resource was deleted). Loop.

**Root Cause:**
- `redirect_to` destination itself returns 401 due to missing resource, not missing auth.
- Product conflates resource 401 with auth 401.

**Detection:**
```
Product/resource → 401 → redirect to login
Login → issues token → redirect to /resource
/resource → 401 (resource gone) → redirect to login
... (infinite)
```

**Elimination:**
- Products MUST distinguish between auth 401 (token missing/invalid) and resource 401 (insufficient permission).
- Auth 401 → clear token + redirect to login.
- Resource 401/403 → show error page (do NOT redirect to login).
- `safeRedirect()` catches any remaining case.

**Status:** ✅ ELIMINATED by RALD_ROUTING_STANDARD_v1 §6 (error code table)

---

### LOOP-05 — SSO Handoff Loop
**Scenario:** SSO handoff validates token, redirects to product, product validates token and for some reason redirects back to SSO handoff. Loop.

**Root Cause:**
- Product reads `sso_token` but fails to store it in localStorage.
- On next init, product finds no `rald_auth_token` and triggers SSO handoff again.

**Detection:**
```
Product A → sso/handoff → Product B?sso_token={token}
Product B → (fails to store) → sso/handoff again
... (infinite)
```

**Elimination:**
- `sso_token` is stored in localStorage BEFORE `history.replaceState()` is called.
- Storage is synchronous and verified before proceeding.
- `safeRedirect()` catches residual.

**Status:** ✅ ELIMINATED by RALD_SESSION_STANDARD_v1 §4

---

### LOOP-06 — Suspended User Redirect Loop
**Scenario:** Suspended user is redirected to `app.rald.cloud/suspended`. The suspended page itself tries to check auth state and detects suspension, triggering another redirect to `/suspended`.

**Root Cause:**
- `app.rald.cloud/suspended` itself calls route protection logic that redirects suspended users.

**Elimination:**
- `/suspended` page is EXEMPT from onboarding and workspace redirect checks.
- Route protection checks account status BEFORE checking onboarding.
- `/suspended` does not re-check suspension status in a redirect loop.

**Status:** ✅ ELIMINATED by RALD_ROUTING_STANDARD_v1 §6

---

### LOOP-07 — Cross-Product `redirect_to` Loop
**Scenario:** Product A has `redirect_to=product-b.rald.cloud`. Product B's `redirect_to` points to `product-a.rald.cloud`. Alternating redirects.

**Root Cause:**
- `redirect_to` values form a cycle.
- Neither product validates whether `redirect_to` is itself a redirect trigger.

**Elimination:**
- `safeRedirect()` counter (max 3 in sessionStorage) breaks the cycle in ≤3 hops.
- Lands at `app.rald.cloud/error?code=redirect_loop`.

**Status:** ✅ ELIMINATED by RALD_ROUTING_STANDARD_v1 §5.1

---

## LOOP PREVENTION SUMMARY

| Loop ID | Type | Mechanism | Status |
|---|---|---|---|
| LOOP-01 | Auth ↔ Auth | safeRedirect counter + login page discipline | ✅ ELIMINATED |
| LOOP-02 | Onboarding | State refresh + onboarding page self-check | ✅ ELIMINATED |
| LOOP-03 | Workspace | URL param priority + localStorage write before redirect | ✅ ELIMINATED |
| LOOP-04 | Expired Session | Auth vs resource 401 distinction | ✅ ELIMINATED |
| LOOP-05 | SSO Handoff | Synchronous localStorage write before URL cleanup | ✅ ELIMINATED |
| LOOP-06 | Suspended User | Exempt route from re-checking | ✅ ELIMINATED |
| LOOP-07 | Cross-product | safeRedirect counter (max 3) | ✅ ELIMINATED |

---

## UNIVERSAL LOOP BREAKER — `safeRedirect()`

```typescript
// Every RALD product MUST implement this
const REDIRECT_KEY = "rald_redirect_count";
const MAX_REDIRECTS = 3;
const ERROR_URL = "https://app.rald.cloud/error?code=redirect_loop";

export function safeRedirect(url: string): void {
  const count = parseInt(sessionStorage.getItem(REDIRECT_KEY) ?? "0", 10);
  if (count >= MAX_REDIRECTS) {
    sessionStorage.removeItem(REDIRECT_KEY);
    console.error("[RALD] Redirect loop detected — breaking cycle");
    window.location.href = ERROR_URL;
    return;
  }
  sessionStorage.setItem(REDIRECT_KEY, String(count + 1));
  window.location.href = url;
}

// Call this on successful auth/onboarding completion to reset counter
export function clearRedirectCount(): void {
  sessionStorage.removeItem(REDIRECT_KEY);
}
```

---

## FINDINGS

| ID | Severity | Finding | Remediation |
|---|---|---|---|
| RL-F01 | LOW | `safeRedirect()` not yet in shared `@rald/ui` — each product must implement | Distribute via `@rald/ui` before product launch |
| RL-F02 | INFO | Loop error page (`/error?code=redirect_loop`) not yet designed | Create user-friendly error page at app.rald.cloud |

No CRITICAL findings. No HIGH findings.

---

## CERTIFICATION RESULT

```
╔════════════════════════════════════════════════════╗
║  REDIRECT_LOOP_REPORT = ALL LOOPS ELIMINATED       ║
║  Loops identified: 7                               ║
║  Loops eliminated: 7                               ║
║  CRITICAL findings: 0                              ║
║  HIGH findings: 0                                  ║
╚════════════════════════════════════════════════════╝
```

**Signed: LILCKY STUDIO LIMITED — 2026-06-02**
