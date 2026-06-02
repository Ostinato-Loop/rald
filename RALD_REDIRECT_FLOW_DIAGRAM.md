# RALD_REDIRECT_FLOW_DIAGRAM
**Document Type:** Platform Standard — Reference Diagrams  
**Owner:** LILCKY STUDIO LIMITED  
**Ecosystem:** RALD  
**Date:** 2026-06-02  
**Version:** 1.0  
**Classification:** OFFICIAL — SOURCE OF TRUTH

---

## PURPOSE

Canonical ASCII flow diagrams for every authentication, onboarding, session, cross-product navigation, and error scenario in the RALD ecosystem. These diagrams are authoritative for implementation and debugging.

---

## DIAGRAM 1 — COLD START (No Session)

```
User navigates to product.rald.cloud
              │
              ▼
   ┌──────────────────────┐
   │ Read localStorage     │
   │ rald_auth_token       │
   └──────────┬───────────┘
              │
           null?
              │
              ▼ YES
   ┌──────────────────────────────────────────┐
   │ Redirect to:                             │
   │ app.rald.cloud/login                     │
   │   ?redirect_to={product_url}             │
   │   &app_id={this_app}                     │
   └──────────────────────────────────────────┘
              │
              ▼
   ┌──────────────────────┐
   │ User authenticates   │
   │ (OTP / password)     │
   └──────────┬───────────┘
              │
              ▼
   ┌──────────────────────────────────────────┐
   │ api.rald.cloud issues JWT                │
   │ localStorage.setItem("rald_auth_token")  │
   └──────────┬───────────────────────────────┘
              │
              ▼
   ┌──────────────────────────────────────────┐
   │ Check onboarding_complete                │
   │ (from GET /api/auth/me)                  │
   └──────────┬───────────────────────────────┘
              │
       false? │ true?
    ┌─────────┴──────────┐
    ▼                    ▼
┌───────────┐     ┌──────────────────────────────┐
│ Redirect  │     │ Validate redirect_to          │
│ to        │     │ (must match *.rald.cloud)     │
│ onboarding│     └──────────────┬───────────────┘
│ (see D2)  │                    │
└───────────┘            valid? │ invalid?
                      ┌─────────┴──────────┐
                      ▼                    ▼
              ┌──────────────┐    ┌─────────────────┐
              │ Redirect to  │    │ Redirect to     │
              │ redirect_to  │    │ app.rald.cloud  │
              │  ✅ Done     │    │ /home  ✅       │
              └──────────────┘    └─────────────────┘
```

---

## DIAGRAM 2 — ONBOARDING FLOW

```
app.rald.cloud/onboarding
(user arrives with redirect_to and app_id)
              │
              ▼
   ┌──────────────────────────────────────┐
   │ Read onboarding_step from user state │
   └──────────────┬───────────────────────┘
                  │
        ┌─────────┼──────────┬────────────┐
        ▼         ▼          ▼            ▼
  "profile"  "workspace" "product"  "verification"
        │         │          │            │
        ▼         ▼          ▼            ▼
  Fill name  Create or  Select first  Verify email
  + avatar   join WS    product       or phone
        │         │          │            │
        └─────────┴──────────┴────────────┘
                             │
                             ▼
               ┌─────────────────────────────┐
               │ POST /api/auth/onboarding   │
               │   complete                  │
               │ sets onboarding_complete=true│
               └──────────────┬──────────────┘
                              │
                              ▼
               ┌─────────────────────────────┐
               │ Validate redirect_to        │
               │ Redirect user back          │
               │ to originating product ✅   │
               └─────────────────────────────┘
```

---

## DIAGRAM 3 — WARM START (Valid Session, Onboarding Complete)

```
User navigates to product.rald.cloud
              │
              ▼
   ┌──────────────────────┐
   │ rald_auth_token      │ ← found in localStorage
   │ exists               │
   └──────────┬───────────┘
              │
              ▼
   ┌──────────────────────────────────┐
   │ GET /api/auth/me                 │
   │ Authorization: Bearer {token}    │
   └──────────────┬───────────────────┘
                  │
          200 ───►│◄─── 401
          │               │
          ▼               ▼
   ┌──────────┐   ┌──────────────────────────┐
   │ Cache    │   │ Clear localStorage        │
   │ userState│   │ Redirect to login ↩       │
   └────┬─────┘   └──────────────────────────┘
        │
        ▼
   onboarding_complete?
        │
   true │ false
   ─────┼───────────────► app.rald.cloud/onboarding
        │
        ▼
   workspace_required?
        │
    yes │ no
   ─────┼──────────────────────────────────────
        │                                      │
        ▼                                      ▼
  workspace_id       ┌──────────────────────────────┐
   in localStorage?  │  Render product (no redirect) │
        │            │  ✅ Done                      │
    yes │ no         └──────────────────────────────┘
   ─────┼─────────────► app.rald.cloud/workspace-select
        │
        ▼
  Send X-Workspace-ID header
  on all API calls
  ✅ Done
```

---

## DIAGRAM 4 — CROSS-PRODUCT NAVIGATION (SSO HANDOFF)

```
User is on business.rald.cloud
User clicks Messenger in product switcher
              │
              ▼
   ┌──────────────────────────────────────┐
   │ token = localStorage("rald_auth_    │
   │          token")                    │
   │ token present? ─── no ──► login     │
   └──────────────┬───────────────────────┘
                  │ yes
                  ▼
   ┌──────────────────────────────────────────────┐
   │ Navigate to:                                 │
   │ app.rald.cloud/sso/handoff                   │
   │   ?token={encodeURIComponent(token)}         │
   │   &destination={encodeURIComponent(          │
   │     "https://messenger.rald.cloud/")}        │
   │   &app_id=rald-business                      │
   └──────────────┬───────────────────────────────┘
                  │
                  ▼
   ┌──────────────────────────────────────┐
   │ app.rald.cloud/sso/handoff           │
   │ validates token via GET /api/auth/me  │
   └──────────────┬───────────────────────┘
                  │
          valid? ─┼─ invalid?
          │               │
          ▼               ▼
   ┌──────────────┐ ┌──────────────────────┐
   │ Redirect to  │ │ Redirect to login     │
   │ destination  │ │ with redirect_to=     │
   │ ?sso_token=  │ │ messenger.rald.cloud  │
   │ {token}      │ └──────────────────────┘
   └──────┬───────┘
          │
          ▼
   messenger.rald.cloud/?sso_token={token}
          │
          ▼
   ┌──────────────────────────────────────┐
   │ Read sso_token from URL              │
   │ Validate via GET /api/auth/me        │
   │ localStorage.setItem("rald_auth_    │
   │   token", sso_token)                │
   │ history.replaceState() → remove     │
   │   sso_token from URL                │
   └──────────────┬───────────────────────┘
                  │
                  ▼
          Render Messenger ✅
```

---

## DIAGRAM 5 — LOGOUT FLOW

```
User clicks "Sign Out" on any RALD product
              │
              ▼
   ┌────────────────────────────────────┐
   │ localStorage.removeItem(           │
   │   "rald_auth_token")              │
   │ raldAuth.logout()                 │
   │ (notifies all onAuthStateChange   │
   │  listeners in current tab)        │
   └──────────────┬─────────────────────┘
                  │
                  ▼
   ┌────────────────────────────────────┐
   │ Optional: server-side revocation  │
   │ DELETE /api/auth/sessions/:id     │
   └──────────────┬─────────────────────┘
                  │
                  ▼
   ┌────────────────────────────────────┐
   │ Redirect to:                      │
   │ app.rald.cloud/login              │
   │ (or product home/marketing page)  │
   └────────────────────────────────────┘
```

---

## DIAGRAM 6 — SESSION EXPIRY DURING ACTIVE USE

```
User is using product.rald.cloud
Product makes API call (GET, POST, etc.)
              │
              ▼
   ┌──────────────────────┐
   │ API returns 401      │
   │ (token expired or    │
   │  revoked)            │
   └──────────┬───────────┘
              │
              ▼
   ┌──────────────────────────────────────┐
   │ Product's API client catches 401     │
   │ localStorage.removeItem(             │
   │   "rald_auth_token")                │
   │ raldAuth.logout()                   │
   └──────────────┬───────────────────────┘
                  │
                  ▼
   ┌──────────────────────────────────────────┐
   │ safeRedirect(                            │
   │   "https://app.rald.cloud/login" +       │
   │   "?redirect_to=" + encodeURI(current) + │
   │   "&app_id=" + APP_ID +                  │
   │   "&error=session_expired"               │
   │ )                                        │
   └──────────────────────────────────────────┘
              │
              ▼
   app.rald.cloud/login shows:
   "Your session has expired. Please sign in again."
```

---

## DIAGRAM 7 — REDIRECT LOOP DETECTION

```
Product redirects user (auth / onboarding / workspace)
              │
              ▼
   ┌──────────────────────────────────────┐
   │ count = sessionStorage               │
   │   .getItem("rald_redirect_count")   │
   │   ?? 0                              │
   └──────────────┬───────────────────────┘
                  │
              count >= 3?
                  │
         no ──────┼────── yes
         │                │
         ▼                ▼
   ┌───────────────┐  ┌──────────────────────────────────────┐
   │ increment     │  │ sessionStorage.remove(               │
   │ count         │  │   "rald_redirect_count")             │
   │ perform       │  │ Navigate to:                         │
   │ redirect      │  │ app.rald.cloud/error                 │
   └───────────────┘  │   ?code=redirect_loop               │
                      │ (break the cycle)                    │
                      └──────────────────────────────────────┘
```

---

## DIAGRAM 8 — SUSPENDED / DELETED ACCOUNT

```
Any RALD product calls GET /api/auth/me
              │
              ▼
   ┌──────────────────────────────────────┐
   │ User state: status = "suspended"     │
   │             or status = "deleted"    │
   └──────────────┬───────────────────────┘
                  │
        suspended │ deleted
    ┌─────────────┴──────────┐
    ▼                        ▼
┌──────────────────┐  ┌──────────────────────────────────┐
│ Redirect to      │  │ localStorage.removeItem(          │
│ app.rald.cloud   │  │   "rald_auth_token")             │
│ /suspended       │  │ Redirect to:                     │
│ (token preserved)│  │ app.rald.cloud/login             │
└──────────────────┘  │   ?error=account_deleted         │
                      └──────────────────────────────────┘
```

---

## DIAGRAM 9 — INVITE ACCEPTANCE

```
User receives invite email → clicks link
  https://app.rald.cloud/invite?token={invite_token}
              │
              ▼
   ┌──────────────────────┐
   │ User authenticated?  │
   │ rald_auth_token?     │
   └──────────┬───────────┘
              │
       yes ───┼─── no
       │              │
       ▼              ▼
┌────────────┐  ┌─────────────────────────────────────────┐
│ POST       │  │ Redirect to:                            │
│ /api/orgs  │  │ app.rald.cloud/login                   │
│ /invite    │  │   ?redirect_to=/invite?token={token}   │
│ /accept    │  │   &app_id=rald-app                     │
│ { token }  │  │ (after login, lands back on invite page)│
└─────┬──────┘  └─────────────────────────────────────────┘
      │
      ▼
Workspace membership created
localStorage.setItem("rald_workspace_id", workspace_id)
Redirect to appropriate product ✅
```

---

**Signed: LILCKY STUDIO LIMITED — 2026-06-02**
