# SSO_E2E_CERTIFICATION.md
**Phase:** G.11 — Ecosystem Hardening & Stabilization | Stream 2  
**Owner:** LILCKY STUDIO LIMITED  
**Date:** 2026-06-03

---

## OBJECTIVE

Test every app-to-app transition. Verify users never return to onboarding. Sessions preserved. Roles propagated. Workspace context preserved.

---

## TRANSITION MATRIX — CURRENT STATE

| From | To | Status | Session Preserved? | Notes |
|---|---|---|---|---|
| Profiles | Messenger | ✅ WORKS | ✅ Yes | RALD JWT shared |
| Profiles | Loop | ⚠️ PARTIAL | ❌ No | Supabase auth required separately |
| Profiles | Loop Business | ❌ NOT READY | N/A | Loop Business not deployed |
| Profiles | DunaRald | ❌ NOT READY | N/A | DunaRald not deployed |
| Profiles | PayRald | ❌ NOT READY | N/A | PayRald not in campus scope |
| Messenger | Messenger (refresh) | ✅ WORKS | ✅ Yes | localStorage JWT |
| Messenger | Loop | ⚠️ PARTIAL | ❌ No | Different JWT authority |

---

## TESTED TRANSITIONS

### Test 1 — Messenger Login → Refresh

```
1. User logs in: POST auth.rald.cloud/send-otp → OTP → POST /login → RALD JWT
2. JWT stored in localStorage as 'rald_auth_token'
3. User closes tab, reopens messenger.rald.cloud
4. Frontend reads localStorage → JWT present → /chats loaded directly
5. No re-authentication prompt
```

**Result: ✅ PASS** — Session preserved across refresh and tab close.

### Test 2 — Messenger Login → Another Browser Tab

```
1. User authenticated in Tab 1 (localStorage)
2. User opens messenger.rald.cloud in Tab 2
3. Tab 2 reads same localStorage → /chats loaded
4. No re-authentication
```

**Result: ✅ PASS** — localStorage shared within same origin.

### Test 3 — Messenger → Loop (Cross-App)

```
1. User authenticated in Messenger (RALD JWT)
2. User navigates to loop.rald.cloud
3. Loop reads localStorage → RALD JWT found
4. Loop attempts to use RALD JWT with Supabase → Supabase rejects (different secret)
5. User sees Loop login screen → must re-authenticate
```

**Result: ❌ FAIL** — Re-authentication required.

**Exception:** This is WS1-F2 / WS3-F1 from G.9 — scoped exception for Messenger-only campus pilot. Cross-app navigation is NOT presented to pilot users. This test failure is EXPECTED and DOCUMENTED.

### Test 4 — OTP Session Continuity

```
1. User requests OTP (POST /send-otp)
2. 5-minute window: user enters correct OTP
3. JWT issued — 1-hour expiry
4. User navigates freely within Messenger during 1 hour
5. After 1 hour: JWT expires → redirected to /login
6. User enters phone → OTP → new JWT → back to /chats
```

**Result: ✅ PASS** — Session lifecycle correct.

### Test 5 — Role Propagation (admin user)

```
1. Admin user authenticates via auth.rald.cloud
2. JWT payload includes: { "id": "...", "role": "admin" }
3. Admin accesses GET /analytics/summary in RRAL
4. RRAL extracts role from JWT: payload.role === "admin" → allowed
5. Regular user: payload.role === "user" → 403
```

**Result: ✅ PASS** — Role propagated via JWT payload. No server-side role store needed.

---

## SSO EXCHANGE ENDPOINT — AVAILABLE BUT NOT CALLED

`rald-auth-core` implements `POST /sso/exchange`. This is the mechanism for cross-app session handoff.

```typescript
// Available at: https://auth.rald.cloud/sso/exchange
// Input:  { token: "<loop-token>", source: "loop" }
// Output: { token: "<rald-jwt>", expiresAt: "..." }
```

When the Loop frontend is updated to call this endpoint on mount, Tests 3 and Test Profiles→Loop will PASS. This is the only code change needed to fully resolve WS1-F2 + WS3-F1.

---

## CAMPUS PILOT SSO REQUIREMENTS

The campus pilot is **Messenger-only**. The SSO transitions that are REQUIRED to work are:

| Transition | Required? | Status |
|---|---|---|
| Messenger → Messenger (refresh) | ✅ Yes | ✅ PASS |
| Messenger login → logout → login | ✅ Yes | ✅ PASS |
| OTP → JWT → session continuation | ✅ Yes | ✅ PASS |
| Admin token → /analytics access | ✅ Yes | ✅ PASS |

The transitions that are NOT required for the campus pilot:

| Transition | Required? | Status |
|---|---|---|
| Messenger → Loop | ❌ Not in pilot | ❌ FAIL (expected) |
| Profiles → Loop | ❌ Not in pilot | ❌ FAIL (expected) |
| Cross-app navigation | ❌ Not in pilot | ❌ FAIL (expected) |

---

## LEVEL 3 SSO REQUIREMENTS

Before Level 3, ALL of these must pass:

```
Profiles → Loop         ✅ (implement SSO exchange in Loop frontend)
Profiles → Messenger    ✅ (already works)
Loop → Messenger        ✅ (implement SSO exchange in Messenger on-mount)
Messenger → Loop        ✅ (implement SSO exchange in Loop on-mount)
Profiles → Loop Business (when deployed)
Profiles → DunaRald     (when deployed)
Profiles → PayRald      (when deployed)
```

---

## CERTIFICATION DECISION

```
╔══════════════════════════════════════════════════════════════╗
║  G.11 STREAM 2 — SSO E2E CERTIFICATION                       ║
║                                                              ║
║  Messenger self-session:       ✅ PASS                       ║
║  OTP lifecycle:                ✅ PASS                       ║
║  Role propagation:             ✅ PASS                       ║
║  Cross-tab (same app):        ✅ PASS                        ║
║  Cross-app (Loop↔Messenger):  ❌ FAIL — scoped exception     ║
║    (Messenger-only pilot — cross-app not presented)          ║
║                                                              ║
║  SSO exchange endpoint exists on rald-auth-core:  ✅         ║
║  Zero code needed for campus pilot SSO:           ✅         ║
║                                                              ║
║  STATUS: ✅ PASS (campus pilot scope)                        ║
╚══════════════════════════════════════════════════════════════╝
```

LILCKY STUDIO LIMITED — RALD G.11 | 2026-06-03
