# DEVICE_CENTER_SPEC.md
**RALD Auth V1 — Device Management Center**
**Date:** 2026-06-09 | **Authority:** RALD Auth V1 Lockdown Directive
**LILCKY STUDIO LIMITED**

---

## CURRENT STATE

The `auth_devices` table and three endpoints exist in rald-auth-core:

```
GET    /devices          — list devices (name, type, OS, browser, IP, last_seen, is_trusted)
POST   /devices/:id/trust — mark device trusted
DELETE /devices/:id      — remove device
```

**Gap:** Devices are not automatically registered at login. The table exists but nothing writes to it on sign-in.

---

## VISION

Every user at `profiles.rald.cloud` can see exactly which devices have accessed their RALD Account — the same way Google Account's "Your devices" panel works.

---

## DEVICE SCHEMA (CURRENT + ADDITIONS)

```sql
-- Current: auth_devices
CREATE TABLE auth_devices (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  device_name    text,          -- "iPhone 15 Pro", "Chrome on macOS"
  device_type    text,          -- "mobile" | "desktop" | "tablet" | "unknown"
  os             text,          -- "iOS 17", "macOS 15", "Android 14", "Windows 11"
  browser        text,          -- "Safari", "Chrome", "Firefox"
  ip_address     text,
  last_seen_at   timestamptz,
  is_trusted     boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Add: device fingerprint for trusted device bypass
ALTER TABLE auth_devices ADD COLUMN device_fingerprint text NULL;  -- SHA-256 of UA+IP+screen
ALTER TABLE auth_devices ADD COLUMN city               text NULL;  -- Cloudflare cf-ipcity header
ALTER TABLE auth_devices ADD COLUMN country            text NULL;  -- Cloudflare cf-ipcountry header
ALTER TABLE auth_devices ADD COLUMN session_count      integer NOT NULL DEFAULT 1;
ALTER TABLE auth_devices ADD COLUMN first_seen_at      timestamptz NOT NULL DEFAULT now();
```

---

## AUTO-REGISTRATION AT LOGIN

Every successful login must write/update an `auth_devices` row. Add to `POST /auth/login` and `POST /auth/otp/verify`:

```typescript
async function registerDevice(env: Bindings, userId: string, req: Request): Promise<void> {
  const ua         = req.headers.get("User-Agent") ?? "Unknown";
  const ip         = req.headers.get("CF-Connecting-IP") ?? "unknown";
  const city       = req.headers.get("cf-ipcity") ?? null;
  const country    = req.headers.get("cf-ipcountry") ?? null;
  const now        = new Date().toISOString();

  // Parse UA into human-readable form (simple heuristic)
  const { deviceType, deviceName, os, browser } = parseUserAgent(ua);

  // Fingerprint: hash of UA + first-seen IP (stable across IP changes on mobile)
  const fingerprint = await sha256(`${ua}:${ip}`);

  // Upsert: update last_seen + session_count if same fingerprint
  await db.from("auth_devices").upsert({
    user_id:            userId,
    device_fingerprint: fingerprint,
    device_name:        deviceName,
    device_type:        deviceType,
    os,
    browser,
    ip_address:         ip,
    city,
    country,
    last_seen_at:       now,
    session_count:      1,  // Supabase will handle increment via trigger or separate update
  }, { onConflict: "user_id,device_fingerprint", ignoreDuplicates: false });
}
```

---

## ENDPOINTS (FULL SPEC)

```
GET    /devices                 — list all devices for authenticated user
GET    /devices/:id             — get single device detail
POST   /devices/:id/trust       — mark device as trusted
DELETE /devices/:id             — remove device (revokes any active session on it)
POST   /devices/logout-all      — logout all devices except current
POST   /devices/:id/logout      — logout a specific remote device
```

### GET /devices response shape

```json
{
  "devices": [
    {
      "id": "uuid",
      "device_name": "iPhone 15 Pro",
      "device_type": "mobile",
      "os": "iOS 17.4",
      "browser": "Safari",
      "ip_address": "105.112.xx.xx",
      "city": "Lagos",
      "country": "NG",
      "last_seen_at": "2026-06-09T14:30:00Z",
      "first_seen_at": "2026-05-01T09:12:00Z",
      "is_trusted": true,
      "is_current": true,
      "session_count": 47
    }
  ],
  "count": 3,
  "current_device_id": "uuid"
}
```

---

## UI SPECIFICATION (`profiles.rald.cloud` → Devices tab)

Already partially scaffolded in `rald-auth-ui/src/pages/Dashboard.tsx` (tab: "devices").

### Device Card

```
┌─────────────────────────────────────────────┐
│ 📱 iPhone 15 Pro                 ● Active   │
│    iOS 17.4 · Safari                        │
│    Lagos, Nigeria · 105.112.xx.xx           │
│    Last seen: Just now · 47 sessions        │
│                                             │
│  [✓ Trusted]  [Logout this device]          │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ 💻 Chrome on macOS               ○ 3d ago  │
│    macOS 15 · Chrome 124                    │
│    Abuja, Nigeria · 41.58.xx.xx             │
│    First seen: May 1, 2026                  │
│                                             │
│  [Mark Trusted]  [Remove]                   │
└─────────────────────────────────────────────┘
```

### Actions

- **Mark Trusted** → `POST /devices/:id/trust` → device can bypass OTP on next login
- **Logout this device** → `POST /devices/:id/logout` → revokes KV session for that device
- **Logout all other devices** → `POST /devices/logout-all` → `revokeAllUserSessions` except current
- **Remove** → `DELETE /devices/:id` → removes record entirely

---

## NEW DEVICE ALERT

When a login occurs from an unrecognized device fingerprint:

1. Send notification to user's primary phone (SMS) or email:
   > "New sign-in to your RALD Account\nDevice: Chrome on Windows\nLocation: Kano, Nigeria\nTime: Jun 9, 2026 2:30 PM\nNot you? Secure your account →"
2. Write `audit_logs` record: `action: "login"`, `metadata: { new_device: true, city, country }`
3. Link in notification: `profiles.rald.cloud/security?alert=new_device`

**Rate limit:** Max 1 new-device alert per device fingerprint per 24 hours.

---

## USER AGENT PARSER (LIGHTWEIGHT)

No library dependency — implement simple heuristic in the Worker:

```typescript
function parseUserAgent(ua: string): { deviceType: string; deviceName: string; os: string; browser: string } {
  const isIphone  = /iPhone/.test(ua);
  const isIpad    = /iPad/.test(ua);
  const isAndroid = /Android/.test(ua);
  const isMac     = /Macintosh/.test(ua);
  const isWindows = /Windows/.test(ua);
  const isLinux   = /Linux/.test(ua) && !isAndroid;

  const deviceType = isIphone || isAndroid ? "mobile" : isIpad ? "tablet" : "desktop";
  const os = isIphone ? `iOS ${ua.match(/OS (\d+_\d+)/)?.[1]?.replace("_", ".") ?? ""}` :
             isAndroid ? `Android ${ua.match(/Android ([\d.]+)/)?.[1] ?? ""}` :
             isMac ? "macOS" : isWindows ? "Windows" : isLinux ? "Linux" : "Unknown";

  const browser = /Chrome\/(\d+)/.test(ua) && !/Chromium|Edg/.test(ua) ? "Chrome" :
                  /Safari\//.test(ua) && !/Chrome/.test(ua) ? "Safari" :
                  /Firefox\//.test(ua) ? "Firefox" :
                  /Edg\//.test(ua) ? "Edge" : "Unknown";

  const deviceName = isIphone ? "iPhone" : isIpad ? "iPad" : isAndroid ? "Android" :
                     `${browser} on ${os}`;

  return { deviceType, deviceName, os, browser };
}
```

---

## IMPLEMENTATION PRIORITY

| Item | Sprint | Effort |
|---|---|---|
| Auto-register device on every login | Sprint 2 | 1 day |
| Add city/country/fingerprint columns | Sprint 2 | 2 hours |
| Device list UI in Dashboard | Sprint 2 | 2 days |
| `POST /devices/:id/logout` endpoint | Sprint 2 | 1 day |
| `POST /devices/logout-all` endpoint | Sprint 2 | 0.5 day |
| New device alert (SMS/email) | Sprint 3 | 2 days |
| Trusted device bypass at login | Sprint 3 | 2 days |

---

*DEVICE_CENTER_SPEC.md — LILCKY STUDIO LIMITED | 2026-06-09*
