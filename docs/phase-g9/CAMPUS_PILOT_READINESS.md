# CAMPUS_PILOT_READINESS.md
**Phase:** G.9 — Pre-Production Certification  
**Workstream:** 11 — Campus Pilot Readiness  
**Owner:** LILCKY STUDIO LIMITED  
**Date:** 2026-06-02  
**Evidence Source:** GitHub — Ostinato-Loop org

---

## PILOT SCOPE

**Target:** First university deployment  
**Products in scope:** Messenger (primary) + Loop (secondary)  
**Products out of scope:** Loop Business, DunaRald, Dispatch, PayRald (no source code)  
**Scale:** Phase 1 = 100 students. Phase 2 = 500 students.

---

## 1. REGISTRATION FLOW

### What works
```
Student opens messenger.rald.cloud on mobile browser
→ Enters phone number (country picker with +234 default)
→ Receives SMS OTP via Termii (6 digits, 10 min TTL)
→ Enters OTP (6-digit input, auto-submit at completion)
→ Enters display name
→ Lands in Messenger (chat list)
```

**OTP delivery:** Termii with `channel: "dnd"` — DND-compatible for Nigerian numbers. ✅  
**Error handling:** Termii failure → 502 with retry prompt. ✅  
**Duplicate phone:** Same phone → existing account retrieved, no duplicate. ✅

**Time to complete registration:** ~60 seconds on 4G (OTP delivery ~5-15 seconds).

**Issues:**
- `FINDING (MEDIUM — WS11-F1)`: If student registers on Messenger then goes to Loop, they must re-register (no cross-app session). This creates a fragmented onboarding experience for pilots using both products.

---

## 2. REFERRAL FLOW

**Status:** ❌ NOT IMPLEMENTED  
**Evidence:** No referral code, invite link, or campus-specific registration flow found in any repository.

**FINDING (HIGH — WS11-F2):** No referral flow implemented. Campus pilots typically use invite codes or link-based registration to control who can join. Without this, the platform is open to anyone with a phone number — not suitable for a controlled university pilot.

**Recommended minimum:** A campus-specific invite code or `.edu` email domain restriction on registration.

---

## 3. COMMUNITY CREATION (LOOP)

### What works
```
Authenticated Loop user → "Create Room" flow
→ Room name, description, category
→ Room created in Supabase
→ Invites via search (by username)
→ Realtime updates via Supabase subscriptions
```

**Room types confirmed:** open, closed (invite required), private  
**Room membership:** `room_members` table — enforced access control ✅  
**Max room size:** Not enforced in code (no `maxMembers` limit observed) — unlimited ✅

**Issues:**
- `FINDING (MEDIUM — WS11-F3)`: No moderation tools (ban, mute, report) observed in Loop source. Campus communities need at minimum a "remove member" action.
- `FINDING (LOW — WS11-F4)`: No room discovery beyond search. Campus students need a way to browse available community rooms.

---

## 4. NOTIFICATION READINESS FOR CAMPUS PILOT

### SMS (OTP only)
- Termii account: Required, must be provisioned with balance for 100-500 registrations (each ~1-2 SMS)
- 100 students × 2 OTPs (register + re-verify): ~200 SMS
- 500 students × 2 OTPs: ~1,000 SMS
- **Status:** ✅ Ready (assuming Termii account is funded)

### Push Notifications (Messenger)
- VAPID keys must be set in GitHub Secrets and deployed
- Students must install Messenger as PWA or receive push in browser tab
- iOS users: Must add to home screen (iOS 16.4+) for push
- **Status:** ⚠️ PARTIAL (VAPID set up in CI, confirmation required)

### Email Notifications
- Resend domain verification required for `rald.cloud`
- **Status:** ⚠️ PARTIAL (Resend API key needed, domain must be verified)

---

## 5. USER SUPPORT READINESS

**Support infrastructure:**  
- No in-app help or FAQ
- No support email shown in UI
- No feedback/bug report button
- No admin moderation dashboard for pilot management

**FINDING (HIGH — WS11-F5):** No user support infrastructure. For a campus pilot with real students, a minimum support mechanism is required: a support email address displayed in the app and an internal tool to look up users and reset accounts.

**Minimum for campus pilot:**
- Support email: `support@rald.cloud` (needs Resend setup)
- Admin dashboard (`admin.rald.cloud` / `rald-control-center`) — exists in ecosystem but state unknown
- Operator runbook for common issues (student locked out, OTP not received)

---

## 6. PILOT KPIs

### Primary KPIs (7-day launch window)

| KPI | Target (100 students) | Measurement Method |
|---|---|---|
| Registrations | 80+ (80% of invited students) | `COUNT(*) FROM users` |
| Day-1 Active Users | 60+ | `COUNT(DISTINCT user_id) FROM messages WHERE date=launch+1` |
| 7-Day Retention | 40%+ | Users active on Day 7 / Total registered |
| Messages Sent (Day 1) | 500+ | `COUNT(*) FROM messages WHERE date=launch+1` |
| Rooms Created | 5+ | `COUNT(*) FROM rooms` |
| OTP Success Rate | >90% | Successful verifications / OTP sends |

### Secondary KPIs (30-day window)

| KPI | Target | Measurement Method |
|---|---|---|
| 30-Day Retention | 25%+ | Users active on Day 30 / Total registered |
| Daily Active Users | 30+ | Avg over 30 days |
| Weekly Active Users | 50+ | Avg over 4 weeks |
| Messages/DAU/day | 10+ | Total messages / DAU |
| Notifications Delivered | >80% of push subscribers | Push delivery receipt |

### Failure KPIs (trigger review)

| Trigger | Action |
|---|---|
| OTP success rate < 70% | Pause registration, check Termii |
| Day-1 DAU < 20% of registered | Review onboarding friction |
| 7-day retention < 20% | Product review — core loop not working |
| Any auth-related data loss | P0 incident — halt pilot |

---

## 7. PRE-PILOT CHECKLIST

**Technical (must be PASS before inviting students):**

| # | Item | Status |
|---|---|---|
| 1 | Remove `.env.development` + `.env.production` from loop repo | ❌ PENDING |
| 2 | Add `send-otp` rate limit to rald-auth-core (3/phone/10min) | ❌ PENDING |
| 3 | Add brute-force protection to rald-auth-core `/auth/login` | ❌ PENDING |
| 4 | Confirm `TERMII_API_KEY` set in production CF secrets | ⚠️ UNVERIFIED |
| 5 | Confirm `RESEND_API_KEY` set + domain verified | ⚠️ UNVERIFIED |
| 6 | Confirm `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` set in GitHub Secrets | ⚠️ UNVERIFIED |
| 7 | Run Supabase migrations for messenger + rald-auth-core on production DB | ⚠️ UNVERIFIED |
| 8 | Confirm Supabase project is on Pro plan (PgBouncer pooler) | ⚠️ UNVERIFIED |
| 9 | Deploy `crm.rald.cloud` with migration (for Messenger conversations) | ❌ PENDING |
| 10 | Confirm `messenger.rald.cloud` worker is deployed with all secrets | ⚠️ UNVERIFIED |

**Operational (must be ready before inviting students):**

| # | Item | Status |
|---|---|---|
| 11 | Support email `support@rald.cloud` displayed in app | ❌ PENDING |
| 12 | RALD team monitoring Cloudflare + Supabase dashboards | ❌ PENDING |
| 13 | Termii account funded (estimate: 2× number of invited students in credits) | ⚠️ UNVERIFIED |
| 14 | Invite mechanism defined (code, link, or email invite) | ❌ PENDING |
| 15 | Recovery runbook accessible to all operators | ✅ This document |

---

## 8. WHAT CAN LAUNCH NOW (NARROWLY SCOPED)

If the 3 HIGH security findings (WS4-F1, WS4-F5, WS4-F6) are remediated and operational items 4-6 are confirmed:

**MESSENGER ONLY campus pilot with:**
- SMS registration + OTP login ✅
- 1:1 and group conversations ✅
- Message reactions + read status ✅
- Basic push notifications (PWA install required) ⚠️
- No cross-app SSO (students use Messenger standalone) ✅ (acceptable for narrow pilot)

**NOT suitable yet:** Loop communities (no PWA, no moderation tools, no referral system)

---

## FINDINGS SUMMARY

| ID | Severity | Finding |
|---|---|---|
| WS11-F2 | HIGH | No referral or invite flow — open registration unsuitable for controlled pilot |
| WS11-F5 | HIGH | No user support infrastructure (help, support email, moderation) |
| WS11-F1 | MEDIUM | Cross-app registration required if students use both Messenger + Loop |
| WS11-F3 | MEDIUM | No moderation tools in Loop (ban, mute, report) |
| WS11-F4 | LOW | No room discovery browse in Loop — search only |

---

## CERTIFICATION DECISION

```
╔══════════════════════════════════════════════╗
║  WS11 — CAMPUS PILOT READINESS              ║
║  CRITICAL: 0  HIGH: 2  MEDIUM: 2  LOW: 1   ║
║  DECISION: ❌  FAIL                          ║
║                                             ║
║  Messenger core: READY (after 3 security    ║
║    fixes + ops verification)                ║
║  Loop communities: NOT READY                ║
║  Referral/invite: NOT IMPLEMENTED           ║
║  User support: NOT READY                    ║
╚══════════════════════════════════════════════╝
```

LILCKY STUDIO LIMITED — RALD G.9 Certification | 2026-06-02
