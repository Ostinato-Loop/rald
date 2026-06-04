# NOTIFICATION STRATEGY REPORT
## Sprint 02 — Trust & Retention
**Date:** 2026-06-04  
**Auditor:** LILCKY STUDIO LIMITED  
**Priority:** 9 — Notifications  

---

## Objective

Audit existing notification infrastructure. Identify what can trigger return visits. No overengineering — focus on retention.

---

## Current Infrastructure Audit

### Messenger — Web Push (FULLY IMPLEMENTED)
**File:** `messenger/artifacts/loop-messenger/src/lib/notification.service.ts`

**What exists:**
- ✅ `initPushNotifications()` called on app mount (in `App.tsx`)
- ✅ Browser permission request flow
- ✅ `PushManager.subscribe()` — creates push subscription
- ✅ Subscription sent to API: `POST /api/notifications/push/subscribe`
- ✅ VAPID public key fetched from API at runtime (never hardcoded in build)
- ✅ `unsubscribePush()` for clean logout
- ✅ Service Worker integration (`navigator.serviceWorker`)
- ⚠️ API endpoint `GET /api/notifications/push/vapid-key` exists in frontend code — need to verify it exists in the Messenger Worker

**What is missing:**
- ❌ The push sending server (VAPID push delivery) — the subscription is stored but what triggers a push?
- ❌ `POST /api/notifications/push/subscribe` route in `workers/loop-messenger-api` — not found in reviewed routes
- ❌ No service worker file (`sw.js`) confirmed in the Messenger frontend repository
- ❌ No event triggers documented (new message, friend request, etc.)

**Assessment:** The client-side infrastructure is built correctly. The server-side push delivery is not yet implemented. Subscriptions cannot be used yet.

---

### Loop — No Push Notifications
**Status:** Not implemented  
The Loop app has no notification service. The notification bell icon in the Feed header has a static green dot (cosmetic only — always shows even when there are no notifications).

---

## Events That Can Trigger Return Visits

Ranked by retention value:

| Event | Impact | Implementation Effort | Status |
|-------|--------|----------------------|--------|
| New message received | Critical | Low (hook into message write in Worker) | Not done |
| Missed call | Critical | Low (hook into call initiation) | Not done |
| Friend/connection request | High | Medium (requires connections graph) | Not done |
| Mention in a message | High | Medium (parse @mentions on write) | Not done |
| Community invite | High | Medium (requires communities backend) | Blocked |
| Room started by someone followed | High | Medium (requires follow graph + room events) | Not done |
| New follower | Medium | Low | Not done |
| Reply to your message | Medium | Low (hook into message write, parent_id check) | Not done |
| Weekly digest ("Here's what happened in your rooms") | Medium | High | Not done |
| Daily re-engagement ("X people are live right now") | Low | High | Not done |

---

## Most Valuable Trigger: New Message

A new message notification for Messenger is the single highest-value trigger for return visits. A user who receives a message and returns within 5 minutes is far more likely to stay in the app.

**Implementation path (Messenger Worker):**
1. After `INSERT INTO messenger_messages`, check if the recipient has a push subscription in D1
2. If yes, send a Web Push via VAPID to their subscription endpoint
3. Payload: `{ title: sender_name, body: message_preview, url: /chats/conversation_id }`
4. Add `workers-push` library or use the Web Push Protocol directly from the CF Worker

**Estimated effort:** 2–3 days for server-side push delivery.

---

## Notification Categories

### Retention (trigger return visit)
- New message
- Missed call
- Mention
- Connection request accepted

### Engagement (drive deeper use)
- Room starting in a topic of interest
- New community invite
- Mutual connection joined the app

### Operational (trust + compliance)
- Account security alerts
- Login from new device
- Password/PIN change confirmation

---

## Sprint 03 Recommendations

| Priority | Fix | Notes |
|----------|-----|--------|
| P1 | Implement server-side push delivery in Messenger Worker | Hook into message write; VAPID push to subscribed users |
| P2 | Add service worker file to Messenger frontend | Required for push to work in production |
| P3 | Verify `/api/notifications/push/subscribe` route in Worker | Client already calls this; Worker may not have it |
| P4 | Remove static notification dot from Loop feed | False urgency indicator |
| P5 | Add Loop notification infrastructure | Start with in-app; add push in Sprint 04 |

---

*NOTIFICATION_STRATEGY_REPORT.md — Sprint 02 Trust & Retention — LILCKY STUDIO LIMITED*
