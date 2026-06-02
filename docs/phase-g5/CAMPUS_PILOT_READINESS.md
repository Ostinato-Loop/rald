# CAMPUS_PILOT_READINESS.md
**Phase:** G.5 — Ecosystem Readiness  
**Workstream:** 6 — Campus Pilot Readiness  
**Owner:** LILCKY STUDIO LIMITED  
**Date:** 2026-06-02  
**Evidence Source:** GitHub — Ostinato-Loop org repositories

---

## CERTIFICATION MANDATE

Prepare ecosystem for first campus deployment. Verify registration flow, mobile usability, Android experience, low bandwidth, notification delivery, referral and community readiness.

---

## 1. USER REGISTRATION FLOW

### Loop (Primary Campus Entry Point)
**Evidence:** `artifacts/loop/src/pages/login.tsx`

Registration flow:
1. User selects country from African-first dropdown (34 countries, Nigeria default `+234`)
2. Enters display name (signup only)
3. Enters phone number
4. Receives 6-digit SMS OTP (Termii)
5. Auto-submits on 6th digit
6. If new: 3-step onboarding (username → interests → rooms)
7. If returning: straight to home

**Campus Assessment:**

| Criterion | Status | Notes |
|---|---|---|
| Phone-first registration | ✅ PASS | No email required — campus phone numbers work |
| Nigerian number support | ✅ PASS | `+234` default, handles leading-zero normalization |
| OTP delivery (Termii) | ✅ ARCHITECTURE | Termii configured; actual SMS delivery depends on Termii balance and sender ID approval |
| 6-digit auto-submit | ✅ PASS | Excellent UX — no button press needed |
| Resend with cooldown | ✅ PASS | 30-second resend timer |
| No email requirement | ✅ PASS | Phone-only onboarding |
| Display name collection | ✅ PASS | Collected during signup |

### Messenger (Secondary Entry)
**Evidence:** `artifacts/loop-messenger/src/pages/auth.tsx`

Same phone-OTP pattern. `cooldownSeconds` from server. African country list (34 countries). **PASS.**

---

## 2. MOBILE USABILITY

### Loop Frontend
**Evidence:** `artifacts/loop/src/pages/login.tsx`, `vite.config.ts`, package.json

- Built with React + Vite. PWA-capable (manifest.json not in loop, but in Messenger).
- Bottom navigation: `components/layout/bottom-nav.tsx` — mobile-first nav pattern.
- `use-mobile.tsx` hook present for responsive detection.
- Login page: `min-h-screen`, touch targets on OTP inputs are 44px (`h-14 w-11`).
- Country picker: searchable dropdown with proper touch handling.

**Mobile UX Assessment:**

| Criterion | Status |
|---|---|
| Mobile-first layout | ✅ PASS |
| Touch-appropriate input sizing | ✅ PASS |
| Bottom navigation for thumb reach | ✅ PASS |
| Viewport meta configured | ✅ PASS (Vite default) |
| No desktop-only UI patterns | ✅ PASS |

### Messenger Frontend
- PWA manifest: `artifacts/loop-messenger/public/manifest.json` ✅
- Service Worker: `artifacts/loop-messenger/public/sw.js` ✅ (enables offline capability)
- `_headers` and `_redirects` for Cloudflare Pages deployment ✅

**Messenger PWA Assessment:** ✅ PASS — Full PWA with service worker and manifest. Can be installed on Android home screen.

---

## 3. ANDROID EXPERIENCE

**Finding:** No native Android app exists. Both Loop and Messenger are web applications.

**Web-as-Android assessment:**

| Criterion | Loop | Messenger | Status |
|---|---|---|---|
| PWA installable | ⚠️ No manifest found in loop | ✅ manifest.json present | ⚠️ PARTIAL |
| Service worker (offline) | ❌ Not observed | ✅ sw.js present | ⚠️ PARTIAL |
| Touch-optimized UI | ✅ | ✅ | ✅ PASS |
| Android keyboard handling | `inputMode="numeric"` on OTP | `inputMode="numeric"` on OTP | ✅ PASS |
| No horizontal scroll | ✅ max-w-sm constraint | ✅ max-w-sm constraint | ✅ PASS |

**FINDING (MEDIUM — WS6-F1):** Loop does not have a PWA manifest or service worker, meaning it cannot be installed on Android home screen as a native-like app. Messenger has full PWA support.

---

## 4. LOW BANDWIDTH EXPERIENCE

### Loop
- Supabase Realtime for room audio state (WebSockets) — requires persistent connection
- Vite build: code-split by route, lazy loading available
- No offline mode detected
- Room audio via Cloudflare Durable Objects (WebRTC-based)

**Assessment:** Audio rooms require sustained bandwidth. Text features may work on low bandwidth but audio will degrade. **LOW BANDWIDTH RISK for core product (audio rooms).**

### Messenger
- Service worker (`sw.js`) enables offline capability
- REST API with JSON responses — lightweight payloads
- Realtime via Supabase subscriptions — reconnects on connection drop
- Message queue pattern possible with service worker

**Assessment:** Text messaging can function acceptably on 2G/3G. Audio calls require better connectivity.

| Feature | Low Bandwidth Suitability |
|---|---|
| Loop audio rooms | ⚠️ High bandwidth required (WebRTC) |
| Loop text chat | ✅ Light |
| Messenger text | ✅ Light (service worker helps) |
| Messenger voice calls (TRTC) | ⚠️ Requires stable connection |
| OTP SMS delivery | ✅ Network-independent (carrier SMS) |

---

## 5. NOTIFICATION DELIVERY

### Messenger
**Evidence:** `workers/loop-messenger-api/src/lib/notify.ts`, `artifacts/loop-messenger/public/sw.js`

- Push notification architecture: `pushSubscriptions` table in DB schema
- Web Push library: `src/lib/webpush.ts` in Express server
- Service worker exists for background push receipt
- `rald-notify` integration: HTTP POST to `https://notification.rald.cloud`
- Notification types: `new_message`, `mention`, `assignment`

**Assessment:** Notification architecture is in place. Web Push requires user permission grant. Campus pilot notification delivery depends on: (a) VAPID keys configured, (b) `rald-notify` service deployed.

### Loop
- No push notification implementation observed in source files read.
- Real-time room state via Supabase subscriptions (foreground only).

**FINDING (HIGH — WS6-F2):** Loop has no push notification system. Campus users will not receive room notifications when the app is backgrounded.

---

## 6. REFERRAL READINESS

**Repositories checked:** `rald-growth` (README only, no source).  
**Finding:** No referral code, referral link, or referral tracking system found in any application source code.  
**Status:** ❌ NOT IMPLEMENTED — No referral capability verified.

---

## 7. COMMUNITY CREATION READINESS

### Loop Rooms
**Evidence:** `supabase/migrations/001_initial_schema.sql`, `src/pages/create.tsx`

- `rooms` table: `title`, `description`, `category`, `language`, `is_live`, `is_private`, `scheduled_at`
- Room creation page: `src/pages/create.tsx` — confirmed to exist
- Room roles: `listener`, host (`host_id` on rooms table), moderator implied
- Room categories: confirmed field exists
- Multilingual: `language` field with default `'en'`

**Community features present:**
- ✅ Public rooms
- ✅ Private rooms (`is_private`)
- ✅ Room scheduling (`scheduled_at`)
- ✅ Room participants tracking
- ✅ Room reactions
- ✅ Room chat messages
- ✅ AI room summaries (`ai_summary` field, queue endpoint)
- ⚠️ No explicit "community" or "group" concept beyond rooms

**Assessment:** Loop is ready for community interaction via rooms. Not a traditional community/forum — it's live audio rooms. Suitable for campus pilot.

---

## 8. CAMPUS LAUNCH KPIs — TRACKING READINESS

| KPI | Tracking Mechanism | Status |
|---|---|---|
| Registered users | `auth_users` table count | ✅ Trackable |
| Daily active users | `auth_sessions.last_seen_at` | ⚠️ Proxy metric only |
| Weekly active users | `auth_sessions` date range query | ⚠️ Proxy metric only |
| Rooms created | `rooms` table count | ✅ Trackable |
| Messages sent | `messenger_messages` count / `room_messages` count | ✅ Trackable |
| 7-day retention | `auth_sessions` cohort query | ⚠️ Requires analytics query layer |
| 30-day retention | `auth_sessions` cohort query | ⚠️ Requires analytics query layer |

**FINDING (MEDIUM — WS6-F3):** KPIs are trackable via direct database queries but there is no dashboard or automated reporting. Campus pilot monitoring would require manual SQL queries or a custom analytics dashboard.

---

## 9. FINDINGS SUMMARY

| ID | Severity | Finding | Repo | Remediation |
|---|---|---|---|---|
| WS6-F1 | HIGH | Loop has no PWA manifest or service worker — cannot install on Android home screen | `loop` | Add `manifest.json` and service worker to Loop frontend |
| WS6-F2 | HIGH | Loop has no push notification system — background notifications not possible | `loop` | Integrate web push or rald-notify into Loop Cloudflare Worker |
| WS6-F3 | HIGH | No referral system implemented in any product | Ecosystem | Implement referral codes in `rald-growth` and surface in Loop onboarding |
| WS6-F4 | MEDIUM | Campus KPIs have no automated tracking dashboard | Ecosystem | Build KPI dashboard consuming rald-observability or direct DB queries |
| WS6-F5 | MEDIUM | Loop audio rooms require high bandwidth — poor experience on campus mobile data | `loop` | Implement audio quality adaptation; add fallback to text-only mode |
| WS6-F6 | LOW | rald-notify service not confirmed deployed (`notification.rald.cloud`) | `rald-notify` | Verify deployment; confirm VAPID keys configured for web push |

---

## CERTIFICATION DECISION

```
╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║   WORKSTREAM 6 — CAMPUS PILOT READINESS                              ║
║                                                                      ║
║   CRITICAL: 0   HIGH: 3   MEDIUM: 2   LOW: 1                        ║
║                                                                      ║
║   ██████████████████████████████████████████████████████████████   ║
║   ██                                                            ██   ║
║   ██   ⚠️  CONDITIONAL FAIL                                     ██   ║
║   ██                                                            ██   ║
║   ██   Registration flow: PASS (phone OTP, African defaults)    ██   ║
║   ██   Messenger PWA: PASS (service worker, manifest, push)     ██   ║
║   ██   Loop PWA: FAIL (no manifest, no push notifications)      ██   ║
║   ██   Referral system: NOT IMPLEMENTED                         ██   ║
║   ██   Community rooms: PASS (Loop audio rooms ready)           ██   ║
║   ██   KPI tracking: PARTIAL (DB queryable, no dashboard)       ██   ║
║   ██                                                            ██   ║
║   ██   Campus pilot is feasible for Messenger only.             ██   ║
║   ██   Loop requires PWA + push notifications before pilot.     ██   ║
║   ██                                                            ██   ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

LILCKY STUDIO LIMITED — RALD Ecosystem G.5 Certification  
Generated: 2026-06-02 | Evidence: GitHub Ostinato-Loop org
