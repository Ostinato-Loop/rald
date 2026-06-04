# WIZMAC — RALD Ecosystem Knowledge Map

> **WIZMAC** = Workspace Intelligence, Zero-friction Messaging, Auth, Commerce
> 
> Sprint: "RALD Foundation Lockdown & Ecosystem Stabilization"
> Organisation: Ostinato-Loop (GitHub)
> Author: LILCKY STUDIO LIMITED

---

## 1. Ecosystem Overview

The RALD Platform is a suite of apps that behave as ONE product under ONE identity.

```
profiles.rald.cloud          ← Identity Authority (THE truth)
    │
    ├── loop.rald.cloud        ← Loop (audio rooms, feed)
    ├── messenger.rald.cloud   ← Loop Messenger (DMs, communities)
    ├── mail.rald.cloud        ← RALD Mail (coming)
    └── pay.rald.cloud         ← PayRALD (coming)
```

### Identity Axiom (Phase H / Phase 1)
> **profiles.rald.cloud is the ONLY identity issuer. No app re-signs tokens.**

- Users sign in at `profiles.rald.cloud`.
- Profiles issues a RALD Master JWT (HS256, `RALD_JWT_SECRET`).
- Apps receive the JWT via `?rald_token=` query param.
- Apps call their own `/api/auth/rald-sso` to validate and bootstrap a session.
- Apps call `/api/auth/logout` on sign-out, then redirect to `profiles.rald.cloud/logout`.

---

## 2. Repos (GitHub: Ostinato-Loop)

| Repo | Description | Stack |
|------|-------------|-------|
| `loop-audio-ui-ux` | **Reference** feed/room/profile UI | TanStack Router, Vite |
| `loop-messenger-ui-ux` | **Reference** messenger/communities/calls UI | TanStack Router, Vite |
| `loop` (main) | **Production** Loop app (feed, rooms) | React Router DOM v7, Vite |
| `loop-messenger` | **Production** Messenger app | Wouter, Vite |
| `loop-api` | **Production** Loop Express API | Node, Express, Supabase |
| `loop-messenger-api` | **Production** Messenger CF Worker | Hono, Cloudflare Workers, D1 |
| `rald-auth-core` | **Production** RALD Auth Core (search, graph, SSO) | TypeScript |

---

## 3. Auth Flow (all apps)

```
1. User visits loop.rald.cloud
2. No token → redirect to profiles.rald.cloud/login?app_id=loop&redirect_to=loop.rald.cloud
3. Profiles issues RALD JWT, redirects to loop.rald.cloud/?rald_token=JWT
4. Loop AuthProvider detects rald_token → stores as rald_master_token
5. Loop calls /api/auth/rald-sso {rald_token} → validates JWT → returns {access_token}
6. access_token stored in localStorage as loop_token
7. Silent auth: /api/auth/silent validates rald_session cookie on reload
8. Logout: /api/auth/logout (clears cookie) → redirect to profiles.rald.cloud/logout
```

### RALD JWT claims
```json
{
  "id": "rald_user_id",
  "phone": "+234...",
  "email": "user@rald.me",
  "role": "user|creator|admin",
  "sso_v": 2,
  "exp": 1234567890
}
```

---

## 4. Cross-App Navigation

| From | To | Method |
|------|----|--------|
| Loop → Messenger | `openMessenger(path)` in `use-auth.tsx` | Appends `?rald_token=MASTER_TOKEN` |
| Loop → Profiles | `openProfiles(path)` in `use-auth.tsx` | Appends `?rald_token=MASTER_TOKEN` |
| Any app → Loop | Manual redirect to `loop.rald.cloud?rald_token=TOKEN` | Same SSO flow |

---

## 5. Loop App (React Router DOM v7)

### Route Map
```
/                 → FeedPage         (loop-audio-ui-ux design)
/discover         → DiscoverPage     (existing, enhanced)
/rooms/:roomId    → RoomLaunchPage   (loop-audio-ui-ux design)
/messages         → MessagesPage     (existing — links to Messenger)
/me               → MeLaunchPage     (loop-audio-ui-ux design)
/create           → CreatePage       (existing)
/create/:kind     → CreatePage       (room|discussion|event|community|post)
/login            → LoginPage        (redirects to profiles)
/onboarding       → OnboardingPage
```

### State Management
- **LoopStoreProvider** (React Context + useReducer, persisted to localStorage)
- Key: `loop-ui-state-v1`
- Tracks: follows, notifPrefs, joined rooms, speakState, muted, queuePos, interests

### CSS Tokens (index.css)
- `--neon` = `#00FF88` (primary brand)
- `--neon-foreground` = `#041A0D`
- `--orange` = `#FF7A00`
- `--live` = `#FF2E2E`
- Tailwind classes: `text-neon`, `bg-neon`, `neon-glow`, `text-live`, `text-orange`

---

## 6. Loop Messenger (Wouter + Hono CF Worker)

### Route Map
```
/auth             → AuthPage
/onboarding       → OnboardingPage
/chats            → ChatsPage         (existing, real API data)
/chats/:convId    → ChatsPage         (conversation view)
/communities      → CommunitiesPage   (loop-messenger-ui-ux design)
/calls            → CallsPage         (loop-messenger-ui-ux design)
/profile          → ProfilePage
/settings         → SettingsPage
```

### Real API (CF Worker)
- POST `/api/auth/rald-sso` — SSO exchange
- GET  `/api/conversations` — list conversations
- GET  `/api/messages/:convId` — list messages
- POST `/api/messages/:convId` — send message
- POST `/api/messages/:convId/reactions` — react to message
- GET  `/api/users/search?q=` — search users (RALD identity search)
- GET  `/api/health` — health check

### D1 Database Tables
- `workspaces`, `conversations`, `conversation_members`, `messages`, `message_reactions`, `attachments`, `assignments`, `presence`

---

## 7. rald-auth-core

### Routes
- `GET  /search?q=&type=people|rooms|content` — cross-ecosystem search
- `GET  /graph/connections?userId=` — social graph connections
- `GET  /graph/suggestions?userId=` — connection suggestions

### JWT Verification
```typescript
import { verifyJwt } from "../lib/jwt";
const payload = await verifyJwt(token, RALD_JWT_SECRET);
```

---

## 8. Environment Variables

| Var | Used By | Description |
|-----|---------|-------------|
| `RALD_JWT_SECRET` | Loop API, Messenger Worker | 64-char base64url HS256 signing secret |
| `SUPABASE_URL` | Loop API | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Loop API | Service role key for server-side DB access |
| `VITE_API_BASE_URL` | Loop SPA | Base URL for Loop API (e.g., `/loop-api`) |
| `VITE_RALD_AUTH_URL` | Loop SPA, Messenger SPA | Profiles URL (default: `https://profiles.rald.cloud`) |
| `MESSENGER_DB` | Messenger Worker | D1 database binding |
| `JWT_SECRET` | Messenger Worker | Same as RALD_JWT_SECRET |

---

## 9. Fail-Fast Rules

- **Loop API**: `PORT` must be set (throws on start if missing)
- **Loop API**: `RALD_JWT_SECRET` checked per-request (503 if missing, not a startup crash)
- **Messenger Worker**: `MESSENGER_DB` D1 binding checked via `dbMiddleware` (400 if missing)
- **All apps**: Missing env returns structured error, never silent failure

---

## 10. Sprint Phases — Foundation Lockdown

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Identity Completion — logout propagation + /logout route | ✅ Done |
| 2 | Loop Consolidation — Feed, Room, Profile launch screens | ✅ Done |
| 3 | Messenger Consolidation — Communities, Calls pages | ✅ Done |
| 4 | rald-auth-core search routes | ✅ Done (prev sprint) |
| 5 | rald-auth-core graph routes | ✅ Done (prev sprint) |
| 6 | Loop production readiness — health + error boundaries | ✅ Done |
| 7 | Messenger production readiness — fail-fast bindings | ✅ Done (prev sprint) |
| 8 | WIZMAC ecosystem knowledge document | ✅ Done (this file) |
| 9 | Product governance — lifecycle state | ✅ Done |
| 10 | Failure testing documentation | ✅ Done |
| 11 | Messenger cross-app nav integration | 🔜 Next sprint |
| 12 | Loop audio engine integration | 🔜 Next sprint |

---

## 11. Design System

### Loop (Audio)
- Font: Bricolage Grotesque (display), DM Sans (body)
- Primary: #00FF88 neon green
- Background: #0A1F16 deep commerce
- Live indicator: #FF2E2E red + pulse animation

### Messenger
- Font: Inter (system)
- Primary: #7C3AED (purple/violet)
- Background: #0B0D0E dark
- Surface: #131618

### Shared Tokens
- Both apps use `--primary` for their brand color
- CSS custom properties are app-scoped (no conflicts)
- RALD Identity badge uses neon green (`#00FF88`) across all apps

---

*Generated by LILCKY STUDIO LIMITED — RALD Foundation Lockdown Sprint*
