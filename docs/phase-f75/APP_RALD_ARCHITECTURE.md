# APP_RALD_ARCHITECTURE.md
**Document Type:** Phase F.75 — Architecture Design  
**Owner:** LILCKY STUDIO LIMITED  
**Ecosystem:** RALD  
**Date:** 2026-06-02  
**Version:** 1.0

---

## PURPOSE

Design `app.rald.cloud` as the RALD Platform Operating Layer — the unified hub that handles auth, onboarding, SSO, workspace management, product switching, notifications, and identity status for the entire ecosystem.

---

## ROLE IN THE ECOSYSTEM

```
┌────────────────────────────────────────────────────────────────┐
│                    app.rald.cloud                              │
│              RALD Platform Operating Layer                     │
│                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │    Auth      │  │  Onboarding  │  │  SSO Bridge  │        │
│  │  /login      │  │  /onboarding │  │ /sso/handoff │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │   Platform   │  │  Workspace   │  │  Product     │        │
│  │   Home       │  │  Selector    │  │  Switcher    │        │
│  │   /home      │  │  /workspace  │  │  (global)    │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │   Identity   │  │    Settings  │  │   Error /    │        │
│  │   /profiles  │  │   /settings  │  │  Suspended   │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
└────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
       loop.rald.cloud  business.rald.cloud  messenger.rald.cloud
       (consumer)       (consumer)           (consumer)
```

---

## ROUTE STRUCTURE

| Route | Purpose | Auth Required |
|---|---|---|
| `/login` | Primary auth entry point (all products redirect here) | No |
| `/login?redirect_to=&app_id=` | Auth with post-auth destination | No |
| `/onboarding` | Universal onboarding flow | YES |
| `/onboarding?redirect_to=&app_id=` | Onboarding with return destination | YES |
| `/sso/handoff` | SSO bridge — validates token + redirects to destination | NO (validates token itself) |
| `/home` | Platform hub — product launcher, recent activity | YES |
| `/workspace-select` | Workspace selection when no workspace context | YES |
| `/workspace/create` | Create new workspace | YES |
| `/settings` | Account settings (profile, security, sessions, notifications) | YES |
| `/settings/sessions` | Active sessions management | YES |
| `/settings/security` | Password, 2FA, connected devices | YES |
| `/suspended` | Account suspended — information page | Partial |
| `/error` | Error landing (redirect loops, system errors) | No |
| `/invite` | Workspace invitation acceptance | Partial |

---

## PLATFORM HOME — /home

The central destination for authenticated, onboarded users.

### Layout

```
┌─────────────────────────────────────────────────────┐
│  [RALD Logo]   [Workspace Switcher]   [🔔]  [👤]   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Welcome back, Amara!                               │
│  Acme Corp · owner                                  │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  YOUR PRODUCTS                              │   │
│  │  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐   │   │
│  │  │ Loop │  │Biz.  │  │Msg.  │  │ Dev  │   │   │
│  │  └──────┘  └──────┘  └──────┘  └──────┘   │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  RECENT ACTIVITY                            │   │
│  │  · New message in Acme Corp — 2m ago        │   │
│  │  · Invoice #1042 paid — 1h ago              │   │
│  │  · 3 new followers on Loop — today          │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  IDENTITY STATUS                            │   │
│  │  ✅ Email verified                          │   │
│  │  ✅ Phone verified                          │   │
│  │  ⚠️  Business verification — pending       │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Data Sources
| Section | API Endpoint |
|---|---|
| User greeting + workspace | `GET /api/auth/me` + `GET /api/organizations` |
| Product list | User state `active_products` |
| Recent activity | `GET /api/activity/recent` (future) |
| Identity status | User state `emailVerified`, `phoneVerified`, verification status |
| Notifications bell | `GET /api/notifications?unread=true` (via inbox.rald.cloud) |

---

## SSO HANDOFF ENDPOINT — /sso/handoff

```typescript
// app.rald.cloud/sso/handoff implementation

async function handleSsoHandoff(params: {
  token: string;
  destination: string;
  app_id?: string;
}): Promise<Response> {
  // 1. Validate destination is *.rald.cloud
  const RALD_PATTERN = /^https:\/\/([a-z0-9-]+\.)?rald\.cloud(\/.*)?$/;
  const decoded = decodeURIComponent(params.destination);
  if (!RALD_PATTERN.test(decoded)) {
    return redirect("https://app.rald.cloud/home");
  }

  // 2. Validate token
  const user = await fetch("https://api.rald.cloud/api/auth/me", {
    headers: { Authorization: `Bearer ${params.token}` }
  });
  if (!user.ok) {
    const loginUrl = `https://app.rald.cloud/login?redirect_to=${
      encodeURIComponent(decoded)
    }`;
    return redirect(loginUrl);
  }

  // 3. Redirect to destination with token
  const dest = new URL(decoded);
  dest.searchParams.set("sso_token", params.token);
  return redirect(dest.toString());
}
```

---

## IDENTITY STATUS DASHBOARD

Surfaces user verification and trust level:

| Status | Display | Action |
|---|---|---|
| Email unverified | ⚠️ Verify email | Send OTP button |
| Email verified | ✅ Email verified | — |
| Phone unverified | ⚠️ Add phone number | Add phone button |
| Phone verified | ✅ Phone verified | — |
| Business unverified | ⚠️ Business verification pending | Submit docs button |
| Business verified | ✅ Business verified | — |
| RALD ID assigned | `RALD-A1B2C3D4` | Copy button |

---

## NOTIFICATION CENTRE

- Bell icon in top nav shows unread count badge.
- Click opens notification panel (sourced from `inbox.rald.cloud` / notification API).
- Notification types: system alerts, product updates, workspace invites, security events.

---

## ERROR PAGES

| Route | Scenario | Message |
|---|---|---|
| `/error?code=redirect_loop` | Loop detected (safeRedirect) | "Something went wrong with navigation. Click here to go home." |
| `/error?code=permission_denied` | Role insufficient | "You don't have access to that resource." |
| `/suspended` | Account suspended | "Your account has been suspended. Contact support." |
| `/error?code=account_deleted` | Deleted account | "This account no longer exists." |

---

## TECHNOLOGY STACK

| Layer | Technology |
|---|---|
| Framework | React 19 + Vite 7 |
| Routing | Wouter |
| State | TanStack Query v5 |
| Auth | RALD Auth SDK v1.2.0 |
| Styling | Tailwind CSS v4 |
| Deploy | Cloudflare Pages |
| Domain | app.rald.cloud |

---

**Signed: LILCKY STUDIO LIMITED — 2026-06-02**
