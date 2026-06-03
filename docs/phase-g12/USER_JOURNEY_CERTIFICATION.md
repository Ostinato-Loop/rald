# PHASE G.12 — USER JOURNEY CERTIFICATION
## WORKSTREAM 1

**Status:** PASS
**Date:** 2026-06-03
**Owner:** LILCKY STUDIO LIMITED
**Version:** 1.0.0

---

## OBJECTIVE

Certify that no user is lost, looped, or dropped across all eight critical
journey steps, from first registration through logout and re-login.

---

## JOURNEY A — NEW USER (E2E SEQUENCE)

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| A1 | Register via RALD (phone OTP) | Account created, RALD JWT issued | PASS |
| A2 | Verify OTP (6-digit SMS) | OTP validated, session active | PASS |
| A3 | Create profile | Profile record in Supabase, onboarded=true | PASS |
| A4 | Enter Loop | Redirected to loop.rald.cloud, JWT accepted | PASS |
| A5 | Enter Messenger | rald_master_token passed, session unbroken | PASS |
| A6 | Return to Profiles | Cross-app SSO, no re-auth required | PASS |
| A7 | Logout | loop_token + rald_master_token cleared | PASS |
| A8 | Login again | Full re-auth flow, profile restored | PASS |

**Duplicate account check:** Phone uniqueness enforced at DB level (unique constraint).
**Session loss check:** rald_master_token valid for 24h; loop_token valid for 7 days.
**Redirect loop check:** RALD Auth redirects only to allowlisted URIs.

---

## JOURNEY B — EXISTING USER (SINGLE SIGN-ON)

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| B1 | Login once via RALD | rald_master_token + loop_token stored | PASS |
| B2 | Open Loop | loop_token validated, session restored | PASS |
| B3 | Open Messenger | rald_master_token passed via ?rald_token= | PASS |
| B4 | Open Profile | Cross-app SSO, context preserved | PASS |
| B5 | Future app shell | Redirect to RALD SSO if no token | PASS |

**Session preservation:** Verified across all five app transitions — zero re-auth prompts.
**User context preservation:** Profile, role, workspace_id propagated in JWT claims.

---

## KNOWN EDGE CASES VERIFIED

- Expired `rald_master_token` → redirected to accounts.rald.cloud for re-auth ✓
- Revoked session → 401 from API, frontend clears tokens + redirects to auth ✓
- Deep-link arrival (e.g. loop.rald.cloud/room/X) → auth first, then destination ✓
- Slow 3G: OTP input held until response, no double-submit ✓

---

## CERTIFICATION

```
JOURNEY A (New User):   PASS — 8/8 steps verified
JOURNEY B (Existing):   PASS — 5/5 steps verified
Duplicate accounts:     NONE DETECTED
Session loss:           NONE DETECTED
Redirect loops:         NONE DETECTED
```

**USER JOURNEY CERTIFICATION: PASS**
