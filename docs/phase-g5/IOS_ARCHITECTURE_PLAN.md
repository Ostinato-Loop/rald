# IOS_ARCHITECTURE_PLAN.md
**Phase:** G.5 — Ecosystem Readiness  
**Workstream:** 7 — Mobile Strategy Preparation  
**Owner:** LILCKY STUDIO LIMITED  
**Date:** 2026-06-02  
**Evidence Source:** GitHub — Ostinato-Loop org repositories  
**Scope:** Architecture certification only — no mobile app built

---

## MANDATE

Produce architecture certification for iOS. Verify shared API, auth, profile, notification, and analytics layers. Do not build mobile apps.

---

## 1. CURRENT iOS POSTURE

No native iOS app exists. No iOS-specific repository found in the Ostinato-Loop org. `rald-sdk-react-native` and `rald-mobile-core` repositories exist with README only — no source code.

Both Loop and Messenger are served as Progressive Web Apps, accessible via Safari on iOS. PWA support on iOS is limited compared to Android (Safari service worker restrictions apply).

---

## 2. SHARED API LAYER — iOS CERTIFICATION

Identical to Android certification. All RALD APIs are HTTPS REST/JSON:

| Service | URL | iOS Compatible |
|---|---|---|
| RALD Auth | `auth.rald.cloud` | ✅ URLSession / Alamofire |
| Loop API | `loop.rald.cloud/api` | ✅ |
| Messenger API | `messenger.rald.cloud` | ✅ |
| CRM API | `crm.rald.cloud` | ✅ (pending ops) |

**Certification:** ✅ SHARED API LAYER — iOS COMPATIBLE

---

## 3. SHARED AUTH LAYER — iOS CERTIFICATION

### RALD Auth for iOS

**Integration path:**
```
iOS App
  → POST https://auth.rald.cloud/auth/send-otp { phone }
  → POST https://auth.rald.cloud/auth/verify-otp { pinId, pin, phone }
  → Receive { token, user }
  → Store token in iOS Keychain (SecItemAdd/SecItemCopyMatching)
  → Attach to all API calls: Authorization: Bearer <token>
```

**iOS SMS OTP auto-fill:** iOS supports SMS OTP auto-fill via `<input autocomplete="one-time-code">` in web views. In native apps, the system can auto-suggest OTP from SMS using the `UITextContentType.oneTimeCode` property. This requires the SMS message to contain the OTP prominently — current Termii format works as-is for iOS (iOS doesn't require the app hash suffix that Android does).

**Biometric authentication extension:** `auth_devices` table supports `is_trusted` flag. iOS Face ID / Touch ID can be integrated as a local authentication gate before retrieving the stored RALD JWT from Keychain, without any backend changes.

**Clerk integration:** `rald-auth-core/src/routes/clerk.ts` implements a Clerk exchange flow. Clerk supports iOS SDK (`@clerk/clerk-expo`) — the existing SSO exchange endpoint is compatible.

**Certification:** ✅ SHARED AUTH LAYER — iOS COMPATIBLE (SMS auto-fill works natively; biometric auth requires only client-side changes)

---

## 4. SHARED PROFILE LAYER — iOS CERTIFICATION

Same gap as Android. No unified profile endpoint. `GET /auth/me` returns core identity; product-specific profiles (Loop, Messenger) are in separate Supabase tables.

**iOS-specific consideration:** iOS apps typically cache profile data locally (Core Data or SQLite). The absence of a unified profile endpoint means the iOS app would need to make N API calls on launch (one per product). This adds latency and complexity.

**Recommendation:** Same as Android — implement `GET /auth/me/profile` that aggregates across products.

**Certification:** ⚠️ PARTIAL — Core fields available; product profile aggregation required.

---

## 5. SHARED NOTIFICATION LAYER — iOS CERTIFICATION

### Push notifications for iOS (APNs)

**Current gaps (same as Android with iOS-specific differences):**

| Requirement | Current State | iOS-specific |
|---|---|---|
| APNs certificate/key | Not implemented | p8 key from Apple Developer portal required |
| Device token registration | Schema lacks `push_token` column | `auth_devices` needs `push_token TEXT`, `push_provider TEXT` |
| `rald-notify` FCM/APNs dispatch | No source code | Must handle `provider: "apns"` separately from `"fcm"` |
| Notification payload | Not defined | iOS requires `aps: { alert, badge, sound }` format |
| Background push | Not implemented | iOS requires `content-available: 1` for background wake |

**iOS-specific consideration — Web Push on iOS Safari:**  
iOS 16.4+ supports Web Push for installed PWAs. Messenger's existing web push setup (VAPID) may work on iOS Safari if: (a) user adds Messenger to home screen, (b) user grants notification permission. This is a low-investment option for Messenger's campus pilot on iOS.

**Certification:** ❌ NOT READY — APNs integration not implemented; device schema lacks push_token.

---

## 6. SHARED ANALYTICS LAYER — iOS CERTIFICATION

No unified analytics pipeline exists (established in Workstream 4).

**iOS analytics options when building:**
- Option A: Implement RALD Analytics client in `rald-sdk-react-native` — batches events, sends to `rald-observability` endpoint
- Option B: Use Cloudflare Analytics Engine (already available via CF Worker accounts) — zero additional infrastructure
- Option C: Use PostHog or Mixpanel with RALD user_id as the identity key

**Recommendation:** Cloudflare Analytics Engine is the lowest-friction option given the existing CF Worker infrastructure. Events can be emitted from CF Workers directly without a separate analytics service.

**Certification:** ❌ NOT READY — No analytics pipeline. CF Analytics Engine recommended as first step.

---

## 7. iOS-SPECIFIC CONSIDERATIONS

### App Store requirements
- Privacy manifest (PrivacyInfo.xcprivacy) required for iOS 17+ — must declare data collection
- App Tracking Transparency (ATT) framework required if any analytics cross app boundaries
- RALD Identity data collection must be declared: phone number, name, user ID

### Deep linking
- Universal Links require AASA file at `https://rald.cloud/.well-known/apple-app-site-association`
- Not currently implemented — necessary for SSO cross-app navigation

### Background execution
- Audio rooms (Loop) require `audio` background mode in Info.plist
- Messaging (Messenger) requires `remote-notification` background mode
- Both are supported by React Native / Expo

### Safari/WebKit limitations for PWA
- Service workers: supported since iOS 11.3
- Push notifications: supported since iOS 16.4 (home screen PWA only)
- Background sync: NOT supported in Safari
- Web Bluetooth/NFC: NOT supported in Safari

---

## 8. iOS ARCHITECTURE RECOMMENDATION

```
┌─────────────────────────────────────────────────────┐
│              iOS App (React Native / Expo)           │
│  ┌───────────────────────────────────────────────┐  │
│  │  rald-sdk-react-native (to be implemented)   │  │
│  │  - RaldAuth (Keychain token storage)          │  │
│  │  - Face ID / Touch ID local gate             │  │
│  │  - APNs token registration                   │  │
│  │  - Analytics event emission                   │  │
│  └───────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────┘
                     │ HTTPS REST + JWT
         ┌───────────▼───────────┐
         │   RALD API Gateway    │
         └──┬──┬──┬──┬──────────┘
            │  │  │  │
     auth. loop. msg. crm.
```

**React Native / Expo recommendation:**
- Expo SDK 52+ (supports both iOS and Android in one codebase)
- `expo-secure-store` for Keychain/Keystore (replaces `localStorage`)
- `expo-local-authentication` for Face ID / Touch ID
- `expo-notifications` for APNs + FCM in one API
- `@supabase/supabase-js` (works in Expo with AsyncStorage adapter)

---

## 9. CERTIFICATION SUMMARY

| Layer | iOS-Ready | Gap |
|---|---|---|
| Shared API | ✅ YES | None |
| Shared Auth | ✅ YES | Biometric auth client-side only; no backend changes needed |
| Shared Profile | ⚠️ PARTIAL | Unified profile endpoint needed |
| Shared Notification | ❌ NO | APNs certificate, device schema extension, rald-notify APNs dispatch |
| Shared Analytics | ❌ NO | No pipeline; CF Analytics Engine recommended |

---

## CERTIFICATION DECISION

```
╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║   iOS ARCHITECTURE PLAN                                              ║
║                                                                      ║
║   API Layer: ✅ CERTIFIED                                            ║
║   Auth Layer: ✅ CERTIFIED (Face ID: client-only; APNs: pending)    ║
║   Profile Layer: ⚠️ PARTIAL — unified endpoint needed               ║
║   Notification Layer: ❌ NOT READY — APNs not integrated            ║
║   Analytics Layer: ❌ NOT READY — CF Analytics Engine recommended   ║
║                                                                      ║
║   DECISION: NOT READY FOR iOS APP DEVELOPMENT                        ║
║   Same blockers as Android, plus APNs configuration.                 ║
║   Messenger Web Push (VAPID) works on iOS 16.4+ PWA as             ║
║   a low-cost interim notification solution for campus pilot.         ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

LILCKY STUDIO LIMITED — RALD Ecosystem G.5 Certification  
Generated: 2026-06-02 | Evidence: GitHub Ostinato-Loop org
