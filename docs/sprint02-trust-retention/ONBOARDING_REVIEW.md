# ONBOARDING REVIEW
## Sprint 02 — Trust & Retention
**Date:** 2026-06-04  
**Auditor:** LILCKY STUDIO LIMITED  
**Priority:** 7 — Onboarding  

---

## Standard

After signup, a user must never feel lost. They must always have a clear next action:
- **Suggested Actions** — what to do right now
- **Suggested People** — someone to connect with
- **Suggested Communities** — a group to join
- **Suggested Conversations** — a room or DM to start

---

## Loop Onboarding Audit

### Flow: 5-Step Onboarding (`loop/artifacts/loop/src/pages/onboarding.tsx`)
1. **Username** — alphanumeric, 3–20 chars, validated with regex
2. **Display Name** — 2–40 chars
3. **Language** — 8 options (English, Swahili, Hausa, Yoruba, Igbo, Français, Arabic, Português)
4. **Interests** — 15 topics, minimum 3 required
5. **Rooms** — shows real rooms from `listRooms()` for the user to "join" (follow)

**Assessment:**
- ✅ Steps 1–4: real data, saves to Supabase `profiles` table
- ✅ Step 5 (Rooms): pulls real rooms from Supabase via `listRooms()`; if empty, shows honest skeleton
- ✅ Gate: `profile.onboarded` flag prevents skipping onboarding
- ❌ **No suggested people** — Step 5 only suggests rooms. No "people to follow"
- ❌ **No cross-app prompt** — After onboarding, users land on `/feed`. No prompt to open Messenger
- ❌ **Empty rooms state**: if no live rooms exist, Step 5 shows blank (no graceful fallback message)

### Post-Onboarding Experience
After completing onboarding, users land on `FeedPage`. The feed shows:
- Live room strip (real, but may be empty)
- "Discussions coming soon" honest empty state

**User's immediate question: "What do I do now?"**  
There is no answer. No action cards. No "Start a room", "Find someone", "Message someone" prompts.

**Gap:** The post-onboarding empty state is honest but has no next-step guidance.

---

## Messenger Onboarding Audit

### Flow: 1-Step Onboarding (`messenger/artifacts/loop-messenger/src/pages/onboarding.tsx`)
1. **Display Name** — 2–50 chars (required)
2. **Avatar URL** — optional, validated as URL

**Assessment:**
- ✅ Saves via `useUpdateProfile` (real API)
- ✅ Redirects to `/chats` after completion
- ❌ **Minimal** — only display name + avatar. No username step.
- ❌ **No contact suggestions** — after completing, lands on empty chats list
- ❌ **No cross-app context** — new user has no idea what to do in an empty Messenger

### Empty Chats State
When a new user completes Messenger onboarding and lands on `/chats` with no conversations:
- No empty state UI confirmed in `chats.tsx`
- No "Start a conversation" prompt visible in header
- `+ New Conversation` button likely exists (need to verify)

**Risk:** New user sees blank screen with no prompts → leaves within 2 minutes.

---

## Onboarding Completeness Score

| Dimension | Loop | Messenger | Notes |
|-----------|------|-----------|-------|
| Username collection | ✅ | ❌ | Messenger skips username |
| Display name | ✅ | ✅ | Both collect |
| Avatar | ❌ | ✅ | Loop skips avatar in onboarding |
| Suggested people | ❌ | ❌ | Neither suggests people |
| Suggested communities | ❌ | ❌ | Communities not live yet |
| Suggested rooms | ✅ | ❌ | Loop does this; Messenger doesn't |
| Cross-app prompt | ❌ | ❌ | No "also try Messenger/Loop" |
| First-action guidance | ❌ | ❌ | No post-onboarding prompt |

---

## Sprint 03 Recommendations

| Priority | Fix | Notes |
|----------|-----|--------|
| P1 | Add "Your first conversation" prompt to Messenger empty chats | Card: "Search for someone you know" with search shortcut |
| P2 | Add suggested people to Loop onboarding step 5 | Query `profiles` for recently active users |
| P3 | Add "Open Messenger" CTA on Loop post-onboarding | Cross-app retention |
| P4 | Add avatar upload to Loop onboarding | Increases identity completion |
| P5 | Add username to Messenger onboarding | Required for discoverability |
| P6 | Empty rooms fallback in Loop onboarding step 5 | "No rooms yet — you'll be first to start one" |

---

*ONBOARDING_REVIEW.md — Sprint 02 Trust & Retention — LILCKY STUDIO LIMITED*
