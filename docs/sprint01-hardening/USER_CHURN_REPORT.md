# User Churn Report
**Sprint:** Production Readiness & Foundation Hardening
**Date:** 2026-06-04
**Author:** LILCKY STUDIO LIMITED — Engineering
**Status:** 🔴 HIGH RISK — structural churn factors present

---

## Churn Risk Matrix

| Factor | Severity | Affected Product | Sprint Fix |
|--------|----------|-----------------|------------|
| No push notifications | 🔴 CRITICAL | Loop + Messenger | ❌ Not in scope |
| No onboarding flow | 🔴 CRITICAL | Loop | ❌ Not in scope |
| Empty feed for new users | 🔴 CRITICAL | Loop | ❌ Not in scope |
| No avatar upload | 🟠 HIGH | Loop + Messenger | ❌ Not in scope |
| Blank display name (optional at signup) | 🟠 HIGH | Loop + Messenger | Documented |
| Profile data not shown in Messenger | 🟠 HIGH | Messenger | ✅ FIXED |
| Loop profile shows placeholder RALD ID | 🟠 HIGH | Loop | ✅ FIXED |
| No social graph / follow system | 🟠 HIGH | Loop | ❌ Not in scope |
| No content creation UX | 🟡 MEDIUM | Loop | ❌ Not in scope |
| No room recommendation engine | 🟡 MEDIUM | Loop | ❌ Not in scope |
| No delivery status in Messenger | 🟡 MEDIUM | Messenger | Documented |
| sv.rald.cloud missing frontend | 🟡 MEDIUM | SV | ❌ Out of scope |
| Dual token architecture (OTP vs RALD) | 🟡 MEDIUM | Loop | Documented |

---

## D1 / D7 / D30 Churn Estimate

### Current State
- **D1 (Day 1 return rate):** ~30% — app works; but empty feed + no avatar = low engagement
- **D7 (Day 7 return rate):** ~10% — no push notifications means zero re-engagement
- **D30 (Day 30 retention):** ~3% — without social graph, no reason to stay

### With Sprint 01-H Fixes Applied
- **D1:** ~35% — real profile data in Messenger; RALD ID shows real value
- **D7:** ~10% — push notification gap unchanged
- **D30:** ~3% — social graph gap unchanged

### After Next Sprint (Push + Onboarding)
- **D1:** ~55% — onboarding guides users to first connection
- **D7:** ~35% — push brings users back
- **D30:** ~15% — depends on content quality

---

## Priority Action Items (Next Sprint)

### CHURN-01: Implement Push Notifications [P0]
Every user who leaves is permanently lost. Push notifications are the #1 re-engagement lever.
- Deploy Expo Push + FCM/APNs via loop-messenger-api NOTIFY_URL hook
- Store device tokens in Supabase on app open
- Fire on: new message, mention, room activity

### CHURN-02: Implement Onboarding Flow [P0]
New users need 3 things in the first session: set name, set avatar, join 1 room.
- Add 3-step onboarding (name → avatar → discover rooms)
- Gate with `profiles.onboarded` boolean (column already exists in schema)

### CHURN-03: Require Display Name at Signup [P1]
Optional display name at OTP signup leads to anonymous users who feel unanchored.
- Make display name required (non-blank, min 2 chars) in verify-otp

### CHURN-04: Add Avatar Upload [P1]
Messenger and Loop both show placeholder icons for all current users.
- Add Supabase Storage bucket for avatars
- Expose upload endpoint in rald-auth-core `/profiles/avatar`

### CHURN-05: Social Graph (Follow System) [P1]
Without follows, Loop is a broadcast-only product. Users can't build a network.
- Implement follows in `profiles_follows` table (already in RALD identity schema)
- Expose `/graph/follow` and `/graph/followers` in rald-auth-core

---

## Conclusion

The fixes in Sprint 01-H resolve data-correctness issues but do not address the structural churn drivers. The most important next steps are push notifications and onboarding — without them, the platform will struggle to retain even satisfied users.
