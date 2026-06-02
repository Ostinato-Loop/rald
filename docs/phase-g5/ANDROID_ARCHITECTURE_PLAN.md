# ANDROID_ARCHITECTURE_PLAN.md
**Phase:** G.5 — Ecosystem Readiness  
**Workstream:** 7 — Mobile Strategy Preparation  
**Owner:** LILCKY STUDIO LIMITED  
**Date:** 2026-06-02  
**Evidence Source:** GitHub — Ostinato-Loop org repositories  
**Scope:** Architecture certification only — no mobile app built

---

## MANDATE

Produce architecture certification for Android. Verify shared API, auth, profile, notification, and analytics layers. Do not build mobile apps.

---

## 1. CURRENT MOBILE POSTURE

**Evidence from `rald-mobile-core` repository:**  
Repository exists (`rald-mobile-core` — "RALD Mobile Core — React Native shared app foundation") with README only. No source code committed.

**Evidence from `rald-sdk-react-native` repository:**  
Repository exists (`rald-sdk-react-native` — "RALD React Native SDK") with README only. No source code committed.

**Current mobile access:** Web apps only. Loop and Messenger are served as PWAs. No native Android APK exists.

---

## 2. SHARED API LAYER — CERTIFICATION

### Current State (Evidence-based)

| Service | URL | Protocol | Auth | Status |
|---|---|---|---|---|
| RALD Auth | `auth.rald.cloud` | HTTPS REST + JSON | Public | ✅ DEPLOYED |
| Loop API | `loop.rald.cloud/api` | HTTPS REST + JSON | RALD JWT | ✅ DEPLOYED (CF Worker) |
| Messenger API | `messenger.rald.cloud` | HTTPS REST + JSON | RALD JWT | ✅ DEPLOYED (CF Worker) |
| CRM API | `crm.rald.cloud` | HTTPS REST + JSON | RALD JWT | ⏳ PENDING OPS |
| Notify | `notification.rald.cloud` | HTTPS REST + JSON | RALD JWT | ⚠️ NO SOURCE |
| Search | `search.rald.cloud` | HTTPS REST + JSON | RALD JWT | ⚠️ NO SOURCE |

**Finding:** All APIs are HTTPS REST/JSON — fully compatible with Android (OkHttp, Retrofit, or Fetch API in React Native). No binary protocols, no WebSocket-only endpoints (Supabase Realtime degrades gracefully). **Shared API layer is Android-compatible.**

**Recommendation:** The `rald-auth-sdk` (`src/index.ts`) is written in pure TypeScript/Web Crypto — incompatible with React Native (no `window`, no `localStorage`, no `crypto.subtle` in older React Native environments). An Android SDK must either:
- Use `@react-native-async-storage/async-storage` for token persistence
- Polyfill `crypto.subtle` via `react-native-quick-crypto`
- Or rewrite the SDK for React Native (the `rald-sdk-react-native` repo is the intended home)

---

## 3. SHARED AUTH LAYER — CERTIFICATION

### RALD Auth for Android

**Current:** `rald-auth-core` at `auth.rald.cloud` accepts any HTTPS client.

**Android integration path:**

```
Android App
  → POST https://auth.rald.cloud/auth/send-otp { phone }
  → POST https://auth.rald.cloud/auth/verify-otp { pinId, pin, phone }
  → Receive { token, user }
  → Store token in Android Keystore (via EncryptedSharedPreferences)
  → Attach to all API calls: Authorization: Bearer <token>
```

**SMS OTP receipt:** Android OTP auto-fill via SMS Retriever API is possible if the OTP message format includes the app hash. Current Termii message: `"Your RALD verification code is <OTP>. Valid for 10 minutes."` — does NOT include Android app hash suffix.

**FINDING (MEDIUM):** Termii OTP message template needs Android app hash suffix for auto-fill (`<#> Your RALD code: 123456 FA+9qCX9VSu`). This requires: (a) generating Play Store app hash, (b) updating Termii message template in `rald-auth-core/src/lib/otp.ts`.

**Device registration:** `POST /devices/register` endpoint exists in `rald-auth-core`. Supports `device_name`, `device_type`, `os`, `browser`, `ip_address`, `is_trusted`. ✅ Ready for Android device registration.

**Certification:** ✅ SHARED AUTH LAYER — ANDROID COMPATIBLE (with SMS auto-fill caveat)

---

## 4. SHARED PROFILE LAYER — CERTIFICATION

### Current profile data

| Field | Location | Android-accessible |
|---|---|---|
| `id` (RALD UUID) | `auth_users.id` | ✅ Via `GET /auth/me` |
| `name` | `auth_users.name` | ✅ Via `GET /auth/me` |
| `email` | `auth_users.email` | ✅ Via `GET /auth/me` |
| `role` | `auth_users.role` | ✅ Via `GET /auth/me` |
| `rald_id` | `auth_users.rald_id` | ✅ Via `GET /auth/me` |
| `avatar_url` | `auth_users.avatar_url` | ✅ Via `GET /auth/me` |
| `interests` | `loop.profiles.interests` | ⚠️ Loop-specific endpoint |
| `display_name` | `loop.profiles.display_name` | ⚠️ Loop-specific endpoint |
| `username` | `loop.profiles.username` | ⚠️ Loop-specific endpoint |
| `customer_id` | `crm_customers.id` | ⚠️ Not yet resolved |

**FINDING (HIGH):** No unified profile endpoint exists. `GET /auth/me` returns core identity fields. Product-specific profile extensions (Loop interests, Messenger display name) are in separate DBs with no unified read endpoint.

**Android recommendation:** Build `GET /profile/me` at a new profile gateway (or `GET /auth/me/profile` in `rald-auth-core`) that aggregates: auth_users + loop profiles + customer_id. This becomes the Android profile source of truth.

**Certification:** ⚠️ PARTIAL — Core identity fields available; unified profile aggregation not implemented.

---

## 5. SHARED NOTIFICATION LAYER — CERTIFICATION

### Push notification for Android

**Current state:**
- Messenger has web push (VAPID) architecture (`lib/webpush.ts`, `pushSubscriptions` table)
- `rald-notify` service exists but no source code
- Loop has no push notification system

**Android push (FCM) requirements:**

```
Requirements for Android push:
1. Firebase Cloud Messaging (FCM) project setup
2. RALD app registered in FCM → FCM Server Key → stored as secret in rald-notify
3. Android app requests FCM device token on install
4. Token registered: POST /devices/register (extend with push_token + push_provider: "fcm")
5. rald-notify sends FCM notification on trigger
```

**Current gap:** `auth_devices` table (`auth_devices.device_type`, `auth_devices.os`) has no `push_token` or `push_provider` column. Android push tokens cannot be stored.

**FINDING (HIGH):** Android FCM integration requires schema extension to `auth_devices` (add `push_token TEXT`, `push_provider TEXT DEFAULT 'fcm'`) and FCM integration in `rald-notify`.

**Certification:** ❌ NOT READY — Shared notification layer does not support Android push. Schema extension and FCM integration required.

---

## 6. SHARED ANALYTICS LAYER — CERTIFICATION

As established in Workstream 4, no unified analytics pipeline exists. `rald-observability` has no source code.

**Android analytics requirements:**
- Client-side event emission (in-app events: screen views, taps, conversions)
- Server-side event receipt and storage
- Retention, DAU/WAU/MAU computation

**Current state:** No analytics SDK for Android. No analytics collection endpoint.

**Certification:** ❌ NOT READY — Shared analytics layer does not exist.

---

## 7. ANDROID ARCHITECTURE RECOMMENDATION

```
┌─────────────────────────────────────────────────┐
│              Android App (React Native)          │
│  ┌─────────────────────────────────────────────┐│
│  │  rald-sdk-react-native (to be implemented)  ││
│  │  - RaldAuth (AsyncStorage token store)      ││
│  │  - FCM token registration                   ││
│  │  - Analytics event emission                 ││
│  └─────────────────────────────────────────────┘│
└────────────────────┬────────────────────────────┘
                     │ HTTPS REST + JWT
         ┌───────────▼───────────┐
         │   RALD API Gateway    │
         │  rald-api-core        │
         │  (rate limiting, CORS)│
         └──┬──┬──┬──┬──┬───────┘
            │  │  │  │  │
     ┌──────┘  │  │  │  └──────────────┐
     ▼         ▼  ▼  ▼                 ▼
  auth.    loop. msg. crm.    notification.
 rald.cloud ...  ...  ...      rald.cloud
```

**Technology stack recommendation:**
- Framework: **React Native** (Expo SDK) — reuses TypeScript codebase, web team skills
- Auth: Extend `rald-auth-sdk` for React Native with `EncryptedStorage`
- Realtime: Supabase React Native client (`@supabase/supabase-js` works in RN)
- Push: FCM via `@notifee/react-native` or `react-native-firebase`
- Analytics: Implement `rald-observability` client for React Native

---

## 8. CERTIFICATION SUMMARY

| Layer | Android-Ready | Gap |
|---|---|---|
| Shared API | ✅ YES | None — HTTPS REST APIs work from any client |
| Shared Auth | ✅ YES (with caveat) | SMS auto-fill needs app hash in OTP template |
| Shared Profile | ⚠️ PARTIAL | No unified profile endpoint; product-specific data siloed |
| Shared Notification | ❌ NO | FCM not integrated; no push_token in device schema |
| Shared Analytics | ❌ NO | No analytics pipeline exists |

---

## CERTIFICATION DECISION

```
╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║   ANDROID ARCHITECTURE PLAN                                          ║
║                                                                      ║
║   API Layer: ✅ CERTIFIED                                            ║
║   Auth Layer: ✅ CERTIFIED (minor SMS auto-fill improvement needed)  ║
║   Profile Layer: ⚠️ PARTIAL — unified endpoint needed               ║
║   Notification Layer: ❌ NOT READY — FCM integration required       ║
║   Analytics Layer: ❌ NOT READY — pipeline must be built first      ║
║                                                                      ║
║   DECISION: NOT READY FOR ANDROID APP DEVELOPMENT                    ║
║   Blockers: FCM integration, unified profile endpoint,               ║
║             analytics pipeline must be built before Android          ║
║             development begins.                                      ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

LILCKY STUDIO LIMITED — RALD Ecosystem G.5 Certification  
Generated: 2026-06-02 | Evidence: GitHub Ostinato-Loop org
