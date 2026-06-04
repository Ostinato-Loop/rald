# TRUST AUDIT REPORT
## Sprint 02 — Trust & Retention
**Date:** 2026-06-04  
**Auditor:** LILCKY STUDIO LIMITED  
**Scope:** Loop frontend, Messenger frontend, Loop Cloudflare Worker, Messenger Cloudflare Worker  

---

## Executive Summary

Four active trust violations were found and fixed in this sprint. All violations involved production pages or APIs serving fake, hardcoded, or mock data to real users. No violations were found in the Messenger chat core (conversations, messages, SSO, search).

**Status: ALL VIOLATIONS FIXED**

---

## Violations Found & Fixed

### V-001 — CRITICAL: Messenger Communities page displaying fake communities
**File:** `messenger/artifacts/loop-messenger/src/pages/communities.tsx`  
**Severity:** Critical  
**Type:** Fake statistics, fake member counts  

**Problem:**  
The Communities page imported from `mock-data.ts` and rendered 6 fake communities to every production user:
- "University of Ghana Tech" — 12,400 members (fake)
- "AfroDevs Collective" — 8,230 members (fake)
- "Accra Local" — 24,500 members (fake)
- "Loop Business Network" — 5,120 members (fake)
- "Design Africa" — 3,400 members (fake)
- "Nairobi Runners" — 1,820 members (fake)

All avatars were served from `i.pravatar.cc` (random placeholder avatar service). All member counts were invented. No backend exists.

**User harm:** Every user who opened the Communities tab saw fake communities they could not actually join. The "Join list" button showed a toast ("Communities launching soon") but the communities themselves were presented as real, verifiable entities with member counts. This is a fundamental trust violation.

**Fix:**  
Removed `communities` import from `mock-data.ts`. Replaced the fake community list with an honest empty state:
- "No communities yet" with category filter context
- Upcoming community types shown as category tabs (not fake data)
- "Notify me when live" CTA retained
- "Create a community" coming soon button retained

---

### V-002 — HIGH: Messenger Calls page displaying fake call history and audio rooms
**File:** `messenger/artifacts/loop-messenger/src/pages/calls.tsx`  
**Severity:** High  
**Type:** Fake call history, fake audio rooms with fake listener counts  

**Problem:**  
The Calls page imported `calls` and `audioRooms` from `mock-data.ts` and rendered them to every production user:

**Fake call history (5 entries):**
- "Adaeze Okafor" — outgoing video call (Today, 12:01) — fake person
- "Lagos Tech Circle" — incoming group call (Today, 10:32) — fake group
- "Michael Johnson" — missed voice call (Yesterday) — fake person
- "Wanjiku M." — incoming video call (Yesterday) — fake person
- "DJ Kemi" — outgoing voice call (Mon) — fake person

**Fake audio rooms (3 entries with fake listener counts):**
- "Building for Africa-first" — 412 listeners (fake)
- "RALD Townhall — 2026" — 1,280 listeners (fake)
- "Designers' open critique" — 87 listeners (fake)

All fake. All with functional-looking "Join room" / "Remind me" buttons.

**User harm:** A new user sees a full call history on first open, implying the app is active and populated. The audio rooms with real-looking listener counts imply live activity. No actual voice/video infrastructure is wired. Buttons do nothing meaningful.

**Fix:**  
Removed `calls` and `audioRooms` imports from `mock-data.ts`. Replaced with honest empty states:
- "No live rooms right now — Open Loop to browse and join audio rooms"
- "No call history yet — your calls will appear after your first call"

---

### V-003 — HIGH: Loop Feed hardcoding "Lagos · Nigeria" for all users
**File:** `loop/artifacts/loop/src/pages/feed.tsx`  
**Severity:** High  
**Type:** Hardcoded user-attributed data  

**Problem:**  
The Feed header showed `{userRegion.city} · {userRegion.country}` next to a pin icon, implying it reflected the user's actual location. The value was always "Lagos · Nigeria" for every user in every country, sourced from `loop-mock.ts`:

```typescript
export const userRegion: Region = { city: "Lagos", state: "Lagos State", country: "Nigeria" };
```

A user in Nairobi, Accra, or London would see "Lagos · Nigeria" as their location chip.

**User harm:** Location-attributed UI that is wrong for ~80%+ of users. Damages trust in the app's intelligence.

**Fix:**  
Removed `userRegion` import from `loop-mock`. Removed the location chip from the Feed header entirely. Location-aware routing is deferred until the user profile API returns a region field.

---

### V-004 — MEDIUM: Loop Trending API returning hardcoded topic labels
**File:** `loop/artifacts/cloudflare-worker/src/routes/trending.ts`  
**Severity:** Medium  
**Type:** Fake topic labels  

**Problem:**  
The `/api/trending` endpoint returned 3 hardcoded topic labels with `count: 0`:
```json
{ "label": "AfroTech",     "count": 0, "category": "tech" },
{ "label": "Civic Watch",  "count": 0, "category": "civic" },
{ "label": "Beats & Bars", "count": 0, "category": "music" }
```
The labels were invented — not derived from actual room activity or user behaviour. Even with `count: 0`, presenting these as "trending topics" implies the system is curating something meaningful.

**Fix:**  
Changed `topics` to `[]`. Phase 1 honest response: if no real trending data exists, return empty. Updated cache key from `trending:v1` to `trending:v2` to bust stale cached responses.

---

### V-005 — HIGH: Messenger CORS domain error (sv.rald.cloud vs chat.rald.cloud)
**File:** `messenger/workers/loop-messenger-api/src/index.ts`  
**Severity:** High  
**Type:** Domain misconfiguration  

**Problem:**  
Sprint 01-H added `sv.rald.cloud` to the Messenger Worker CORS allowlist. `sv.rald.cloud` is the RALD **admin/supervisor plane** — it is not a consumer-facing product and does not interact with the Messenger API. The **Messenger frontend** is at `chat.rald.cloud`, which was **missing** from the CORS list.

Effect: Any request from `chat.rald.cloud` (the actual Messenger frontend) would have been blocked by CORS in production.

**Fix:**  
- Removed `"https://sv.rald.cloud"` from Messenger CORS allowlist
- Added `"https://chat.rald.cloud"` as the primary CORS origin
- Added explanatory comment: `sv.rald.cloud is the RALD admin/supervisor plane and does NOT interact with the Messenger API directly`

---

## What Was NOT Violated

The following were audited and confirmed clean:

| Component | Status | Notes |
|-----------|--------|-------|
| `chats.tsx` | ✅ Clean | Uses `useListConversations`, `useSendMessage` — all real API |
| `profile.tsx` | ✅ Clean | Uses `useGetMe`, `useUpdateProfile` — all real API |
| `onboarding.tsx` (Messenger) | ✅ Clean | Uses `useUpdateProfile` — real API |
| `me-launch.tsx` (Loop) | ✅ Clean | Uses `useAuth()` profile fields only |
| `live.tsx` (Loop) | ✅ Clean | Uses `listRooms()` — real Supabase |
| `discover.tsx` (Loop) | ✅ Clean | Uses `listRooms()` — real Supabase, honest empty states |
| `onboarding.tsx` (Loop) | ✅ Clean | Saves to Supabase directly |
| `sso.ts` (Messenger Worker) | ✅ Clean | Real Supabase `profiles` table lookup |
| `search.ts` (Messenger Worker) | ✅ Clean | Real relationship-based search |
| `notification.service.ts` | ✅ Clean | Real web push infrastructure (VAPID from API) |
| Cross-app navigation | ✅ Clean | Token-based, falls back to login page |

---

## mock-data.ts Status

The file `messenger/artifacts/loop-messenger/src/lib/mock-data.ts` was NOT deleted. It serves as reference shapes for future API integration work. A prominent warning banner was added:

> ⚠️ WARNING: THIS FILE MUST NOT BE IMPORTED IN ANY PAGE OR COMPONENT THAT IS VISIBLE TO PRODUCTION USERS.

All active imports of this file from production pages have been removed.

---

## Remaining Trust Risks (Not Yet Fixed)

| Risk | Location | Priority | Notes |
|------|----------|----------|-------|
| Notification badge on Notifications button | Loop `feed.tsx` | Medium | `<span>` with static green dot implies unread notifications even when there are none |
| `loop-mock.ts` `rooms` array exists | Loop | Low | Not imported in any feed/discover page. Reference only. Safe. |
| Loop `me.tsx` settings items are dead buttons | Loop | Medium | Notifications, Language, Privacy, Audio Quality → no dialogs wired |
| `discoverPeople` in mock-data | Messenger | Low | No active page import found. Reference only. |

---

*TRUST_AUDIT_REPORT.md — Sprint 02 Trust & Retention — LILCKY STUDIO LIMITED*
