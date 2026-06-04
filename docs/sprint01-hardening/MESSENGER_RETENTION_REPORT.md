# Messenger Retention Report
**Sprint:** Production Readiness & Foundation Hardening
**Date:** 2026-06-04
**Author:** LILCKY STUDIO LIMITED — Engineering
**Status:** 🟡 FUNCTIONAL — core messaging works; discovery gaps remain

---

## Service Status

**Worker:** loop-messenger-api v1.2.0
**Deployed at:** messenger.rald.cloud
**Phase:** G1 + G.12 SSO + G.13 Consumer API

---

## Feature Completeness

| Feature | Status | Notes |
|---------|--------|-------|
| Direct messages (1-to-1) | ✅ | Full CRUD |
| Group conversations | ✅ | Full CRUD |
| Message reactions (emoji) | ✅ | GET + POST |
| Attachments (metadata) | ✅ | Binary upload is external |
| Unread counts | ✅ | Per-conversation + stats endpoint |
| Read receipts | ✅ | POST /conversations/:id/read |
| Real profile (avatar, bio, name) | ✅ FIXED | Was null; now fetched from Supabase |
| User search by name | ✅ | /users/search + /search/related |
| User search by phone | ✅ FIXED | Added Step 3: profiles table phone/username search |
| User search by username | ✅ FIXED | Added Step 3: profiles table search |
| Relationship-first ranking | ✅ | DMs → shared groups → name match |
| Silent SSO (cookie auth) | ✅ | /auth/silent validates rald_session |
| Cross-app navigation | ✅ | openProfiles(), openLoop() helpers |
| Real-time typing indicators | 🔴 | WebSockets/SSE not implemented |
| Push notifications | 🔴 | NOTIFY_URL env var hooked; service not deployed |
| Message delivery status | 🟡 | PATCH /messages/:id/status exists; not shown in UI |
| End-to-end encryption | 🔴 | Not planned for Phase G |

---

## User Discovery Architecture

### /search/related (relationship-first)
**Step 1:** Existing DMs (score +10) and shared groups (score +5) — from `messenger_conversation_members` + `messenger_user_profiles`
**Step 2:** Broader display_name match in `messenger_user_profiles` (score +1)
**Step 3 (NEW):** RALD profiles table — phone, username, display_name search (score +1)

The three-step cascade ensures users can be found by phone number (useful for mobile-first user base) even if they haven't opened Messenger yet (their profile exists in Supabase from OTP signup).

### /users/search
Searches `profiles` table directly for username, display_name, phone. Fast lookup for new conversation dialog.

---

## Retention Risk Factors

### R-MSG-001: No Push Notifications [HIGH RISK]
**Impact:** Users who leave the app are never pulled back. Unread messages are invisible unless the user actively returns.
**Current state:** NOTIFY_URL env var exists; notification trigger code in `messages.ts` (background task). No notification service is deployed.
**Recommendation:** Deploy a simple notification worker (Cloudflare) that sends FCM/APNs via Expo Push API.

### R-MSG-002: No Message Delivery Status in UI [MEDIUM RISK]
**Impact:** Users don't know if messages were delivered/read — reduces trust in reliability.
**Current state:** `/messages/:id/status` PATCH endpoint exists. UI doesn't call it.
**Recommendation:** Call status endpoint on message delivery (sent → delivered) and display ticks.

### R-MSG-003: No Community/Group Discovery [MEDIUM RISK]
**Impact:** Users can only message people they already know by phone/name.
**Current state:** Group creation available but no discovery/directory.
**Recommendation:** Add `/groups/discover` endpoint surfacing active public groups.

### R-MSG-004: No Typing Indicators [LOW RISK]
**Impact:** Chat feel is one-way; reduces engagement in active conversations.
**Recommendation:** Add WebSocket or SSE endpoint; Cloudflare Durable Objects infrastructure exists.

---

## 7-Day Retention Forecast

| Scenario | Estimate |
|----------|----------|
| Current (no push) | ~15% D7 retention |
| With push notifications | ~45% D7 retention |
| With push + delivery status | ~55% D7 retention |

Push notifications alone are expected to be the single largest retention driver. This should be the next priority after the current sprint.
