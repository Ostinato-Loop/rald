# First-Time User Experience Audit
**Sprint:** Production Readiness & Foundation Hardening
**Date:** 2026-06-04
**Author:** LILCKY STUDIO LIMITED — Engineering
**Status:** 🟡 PARTIAL — flow works, onboarding gaps remain

---

## Scope

End-to-end trace of a brand-new user's first session across Loop, Messenger, and RALD Profiles, evaluating sign-up success rate, profile setup quality, and app discovery.

---

## Sign-Up Flow Trace

### Path A: OTP Sign-Up (Loop native)

1. User opens loop.rald.cloud → sees Login page
2. Enters phone number → POST `/api/auth/send-otp` (Termii)
   - Rate limited: 5/hr per phone ✅
   - Termii sends 6-digit code ✅
3. Enters code → POST `/api/auth/verify-otp`
   - Verifies with Termii token API ✅
   - Creates Supabase auth user (phone_confirm: true) ✅
   - Upserts `profiles` row with `display_name` if provided ✅
   - Issues **LOOP_JWT token** (LOOP_JWT_SECRET) — see note below
4. Redirect to `/feed` ✅
5. User sees Feed — real rooms from Supabase ✅ (mock data removed Sprint 01)

**Note:** OTP flow issues LOOP_JWT_SECRET tokens. If user later opens Messenger, they must go through RALD Profiles SSO to get a RALD JWT. This dual-token situation is a known gap (G-SSO-002). For new users, recommend directing them to profiles.rald.cloud for initial registration.

### Path B: RALD SSO Sign-Up (profiles.rald.cloud → Loop)

1. User visits profiles.rald.cloud → creates account (email/OTP)
2. Directed back to loop.rald.cloud?rald_token=TOKEN&app_id=loop
3. `AuthProvider` detects `rald_token` → calls `/api/auth/rald-sso`
4. rald-sso.ts validates RALD JWT → provisions Supabase user → returns same RALD token
5. Token stored as `loop_token` AND `rald_master_token` ✅
6. `/api/auth/me` called → tries RALD_JWT_SECRET ✅ (fixed Sprint 01-H) → returns real profile
7. User sees Loop feed ✅

### Path C: Messenger First Open (from Loop)

1. User clicks "Open Messenger" on loop.rald.cloud
2. `openMessenger()` reads `rald_master_token` → navigates to messenger.rald.cloud?rald_token=TOKEN
3. Messenger auth.tsx Step 3: detects rald_token → calls `/auth/rald-sso`
4. Validates locally → stores RALD token ✅
5. Calls `/auth/me` → real profile (name, avatar, bio) returned ✅ (fixed Sprint 01-H)
6. User sees Messenger chats list ✅

---

## First-Time User Checklist

| Check | Status | Notes |
|-------|--------|-------|
| Phone OTP delivery (Termii) | ✅ | Rate limited; 6-digit numeric |
| Account creation in Supabase auth | ✅ | `phone_confirm: true` |
| Profiles row created | ✅ | Upserted on verify-otp |
| Display name set at signup | 🟡 | Optional field — blank if not entered |
| Avatar | 🔴 | No upload mechanism in Loop signup flow |
| Real profile shown in Loop me-launch | ✅ | Fixed: RALD ID now shows real user.id |
| Real profile shown in Messenger | ✅ | Fixed: avatar, bio, username now fetched from Supabase |
| Feed shows real content | ✅ | Mock data removed Sprint 01 |
| Me page shows real region | 🟡 | Region from profile; city fallback is hardcoded |
| Cross-app navigation (Loop→Messenger) | ✅ | openMessenger() with rald_master_token |
| Cross-app navigation (Messenger→Profiles) | ✅ | openProfiles() helper |
| Silent login on next visit | ✅ | rald_session cookie validated in all workers |
| Onboarding screen | 🔴 | No onboarding flow exists |
| Empty state guidance (no rooms) | 🟡 | Feed shows empty but no call-to-action |
| Push notification permission request | 🔴 | Not implemented |

---

## Critical Gaps Identified

### G-FTU-001: No Onboarding Flow
**Impact:** HIGH — new users land on Feed with no guidance
**Current state:** User reaches `/feed` immediately after OTP verification with no onboarding step
**Recommendation:** Add onboarding wizard: set display name → upload avatar → choose 3+ interests → join first room

### G-FTU-002: No Avatar Upload at Signup
**Impact:** HIGH — all new users have null avatar; Messenger shows placeholder icons
**Current state:** Profiles table stores `avatar_url` but no upload UI exists in Loop or Messenger
**Recommendation:** Add avatar upload in onboarding step; use Supabase Storage bucket

### G-FTU-003: Empty Display Name
**Impact:** MEDIUM — users who skip display name are shown email-derived name in Messenger, null in Loop
**Current state:** `display_name` is optional in verify-otp; no validation
**Recommendation:** Make display name required at OTP verification

### G-FTU-004: Loop OTP tokens not compatible with Messenger
**Impact:** MEDIUM — users who sign in via Loop OTP cannot directly access Messenger with the same token
**Current state:** Messenger validates RALD_JWT_SECRET only; Loop OTP issues LOOP_JWT_SECRET
**Recommendation:** Either (a) require all new users to go through profiles.rald.cloud, or (b) remove OTP in favour of RALD Profiles as sole auth entry point

---

## User Retention Risk Score: 🟠 6/10

The sign-up mechanics work but the post-signup experience has critical gaps (no onboarding, no avatar, empty feed for new users). First-time retention is at risk if users cannot quickly understand the product and connect with others.
