# NOTIFICATION_CERTIFICATION.md
**Phase:** G.9 — Pre-Production Certification  
**Workstream:** 8 — Notification Certification  
**Owner:** LILCKY STUDIO LIMITED  
**Date:** 2026-06-02  
**Evidence Source:** GitHub — Ostinato-Loop org

---

## 1. NOTIFICATION CHANNELS

### SMS (Termii)
**Used by:** rald-auth-core, rald/api-worker, Messenger (Express), Loop

**Termii configuration** (`src/lib/otp.ts` in rald-auth-core):
```typescript
body: JSON.stringify({
  api_key: apiKey,
  message_type: "NUMERIC",
  to: phone,
  from: "RALD",                     // Sender ID
  channel: "dnd",                   // DND-compatible channel
  pin_attempts: 3,                  // Max verify attempts
  pin_time_to_live: 10,             // Minutes
  pin_length: 6,
  message_text: "Your RALD verification code is < 1234 >. Valid for 10 minutes. Do not share.",
  pin_type: "NUMERIC",
})
```

**rald/api-worker** (Twilio fallback):
```typescript
Body: `Your RALD verification code is ${code}. Valid for 10 minutes. Do not share.`
```

| Requirement | Status |
|---|---|
| Delivery tracking | ⚠️ PARTIAL — `pinId` returned but no delivery receipt stored |
| Retry logic | ✅ User can retry (new OTP request) |
| Template rendering | ✅ Fixed template with OTP placeholder |
| User preferences | ❌ No preference store (always SMS for OTP) |
| Workspace preferences | ❌ Not applicable for auth OTPs |
| Vendor hidden from user | ✅ "Termii" never appears in error messages |
| Twilio fallback | ✅ In rald/api-worker; ❌ Not in rald-auth-core |

**FINDING (MEDIUM — WS8-F1):** Termii `channel: "dnd"` is used — this routes through DND-compatible paths but may have lower delivery rates for Nigerian numbers on DND registry. No delivery confirmation webhook configured.

---

### Email (Resend)
**Used by:** rald-auth-core (welcome email, email OTP, password reset)

**Email types:**

| Type | Route | Non-blocking | Template |
|---|---|---|---|
| Welcome email | `POST /auth/register` | ✅ `.catch(console.error)` | Simple text (from `sendWelcomeEmail()`) |
| Email OTP login | `POST /auth/send-login-email-otp` | ❌ Awaited (blocking) | 6-digit code |
| Password reset | `POST /auth/request-password-reset` | ✅ `.catch()` | 6-digit code |

**Sender:** `auth@rald.cloud` via Resend (requires domain verification in Resend dashboard).

**FINDING (MEDIUM — WS8-F2):** Email templates are minimal plain-text. No HTML email templates verified in source. No brand-consistent design. Welcome email content not readable in current reads (`sendWelcomeEmail()` implementation in `src/lib/otp.ts` not fully captured).

**FINDING (LOW — WS8-F3):** Email domain verification at Resend (`rald.cloud` domain) must be confirmed. If not verified, emails go to spam. No evidence of verification status from GitHub.

---

### Push Notifications (Web Push / VAPID)
**Used by:** Messenger (CF Worker + Express)

**Evidence from `messenger/.github/workflows/deploy-api.yml`:**
```yaml
- name: Push VAPID secrets to worker
  run: |
    if [ -n "$VAPID_PUBLIC_KEY" ]; then
      echo "$VAPID_PUBLIC_KEY" | npx wrangler secret put VAPID_PUBLIC_KEY
      echo "$VAPID_PRIVATE_KEY" | npx wrangler secret put VAPID_PRIVATE_KEY
      echo "$VAPID_SUBJECT" | npx wrangler secret put VAPID_SUBJECT
```
VAPID secrets are pushed to the worker on each deployment **if** they are configured in GitHub Secrets.

**Evidence from Messenger schema:** `pushSubscriptions` table (device tokens). `lib/webpush.ts` in Express server.

| Requirement | Status |
|---|---|
| Web push architecture | ✅ VAPID keys wired in CI |
| Service worker | ✅ `public/sw.js` present |
| PWA manifest | ✅ `public/manifest.json` present |
| Push delivery tracking | ⚠️ No delivery receipt in source |
| Retry logic | ⚠️ Not observed in source |
| User preference (opt-in) | ✅ Browser prompt required before subscription |
| iOS 16.4+ support | ✅ Web Push on installed PWA |
| Android Chrome support | ✅ Web Push fully supported |
| VAPID keys confirmed | ⚠️ Only if GitHub Secret `VAPID_PUBLIC_KEY` is set |

**FINDING (HIGH — WS8-F4):** VAPID secrets are only pushed to the worker `if [ -n "$VAPID_PUBLIC_KEY" ]`. If GitHub Secret is not configured, push notifications silently skip — no error. No way to verify from GitHub whether secrets are currently set.

**Loop push notifications:** No PWA manifest, no service worker, no push subscription table observed. **❌ Loop has no push notification capability.**

---

### Webhook Notifications
**Evidence:** No webhook notification system found in any repository. `rald-notify` has README only.

**Status:** ❌ NOT IMPLEMENTED

---

## 2. rald-notify SERVICE

**Repository:** `Ostinato-Loop/rald-notify` — README only ("RALD Notifications — SMS, email, push").  
**Deployment URL:** `https://notification.rald.cloud` (referenced in Messenger `wrangler.toml`).  
**Source code:** None.

**FINDING (HIGH — WS8-F5):** `rald-notify` at `notification.rald.cloud` is called from Messenger for all notifications. If this service is not deployed, all Messenger notifications silently fail (caught in try/catch). No source code, no deployment evidence.

---

## 3. DELIVERY TRACKING

| Channel | Delivery Receipt | Stored | Dashboard |
|---|---|---|---|
| SMS (Termii) | Termii `pinId` returned but no webhook | ❌ Not stored | ❌ |
| Email (Resend) | Resend webhooks not configured | ❌ Not stored | ❌ |
| Push (VAPID) | No delivery receipt observed | ❌ Not stored | ❌ |
| Webhook | Not implemented | N/A | N/A |

**FINDING (MEDIUM — WS8-F6):** No notification delivery tracking exists. Cannot determine if users are receiving notifications in production.

---

## 4. USER / WORKSPACE PREFERENCES

| Feature | Status |
|---|---|
| User notification opt-out | ❌ Not implemented |
| Channel preference (SMS vs email) | ❌ Not implemented |
| Workspace notification settings | ❌ Not implemented |
| Quiet hours / do-not-disturb | ❌ Not implemented |

---

## FINDINGS SUMMARY

| ID | Severity | Finding |
|---|---|---|
| WS8-F4 | HIGH | VAPID secrets only pushed if GitHub Secret is set — may be unconfigured silently |
| WS8-F5 | HIGH | rald-notify service has no source code — notification.rald.cloud may not be deployed |
| WS8-F1 | MEDIUM | No SMS delivery receipt webhook — cannot confirm delivery |
| WS8-F2 | MEDIUM | Email templates are minimal — no brand-consistent HTML templates |
| WS8-F6 | MEDIUM | No notification delivery tracking across any channel |
| WS8-F3 | LOW | Resend domain verification status unknown from GitHub |

---

## CERTIFICATION DECISION

```
╔══════════════════════════════════════════════╗
║  WS8 — NOTIFICATION CERTIFICATION            ║
║  CRITICAL: 0  HIGH: 2  MEDIUM: 3  LOW: 1    ║
║  DECISION: ❌  FAIL                           ║
║                                              ║
║  SMS OTP: PASS (Termii + Twilio fallback)    ║
║  Email: PARTIAL (no HTML templates)          ║
║  Push: PARTIAL (VAPID wired, unconfirmed)    ║
║  Webhook: NOT IMPLEMENTED                    ║
║  rald-notify: NO SOURCE CODE                 ║
╚══════════════════════════════════════════════╝
```

LILCKY STUDIO LIMITED — RALD G.9 Certification | 2026-06-02
