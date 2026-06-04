# WIZMAC — RALD Ecosystem Knowledge Map & Operations Brain

> **WIZMAC** = Workspace Intelligence, Zero-friction Messaging, Auth, Commerce
>
> This is the institutional memory of RALD. All architecture decisions, incidents,
> migrations, and weekly plans live here. If it is not in WIZMAC, it does not exist.
>
> Organisation: Ostinato-Loop (GitHub)
> Author: LILCKY STUDIO LIMITED

---

## 1. Ecosystem Overview

The RALD Platform is a suite of apps that behave as ONE product under ONE identity.

```
profiles.rald.cloud          ← Identity Authority (THE truth)
    │
    ├── loop.rald.cloud        ← Loop (audio rooms, feed, communities)
    ├── messenger.rald.cloud   ← Loop Messenger (DMs, voice, calls)
    ├── tv.rald.cloud          ← RALD TV (entertainment layer)
    ├── ai.rald.cloud          ← RALD AI (intelligence layer)
    ├── pay.rald.cloud         ← PayRALD (commerce layer)
    └── git.rald.cloud         ← GitRALD (builder layer)
```

### Identity Axiom (Phase H / Phase 1)
> **profiles.rald.cloud is the ONLY identity issuer. No app re-signs tokens.**

- Users sign in at `profiles.rald.cloud`.
- Profiles issues a RALD Master JWT (HS256, `RALD_JWT_SECRET`).
- Apps receive the JWT via `?rald_token=` query param on redirect.
- Apps call their own `/api/auth/rald-sso` to validate and bootstrap a session.
- Apps call `/api/auth/logout` on sign-out, then redirect to `profiles.rald.cloud/logout`.

---

## 2. Product Registry

| Product | Status | Domain | Stack | Owner Repo |
|---------|--------|--------|-------|------------|
| Profiles | Production | profiles.rald.cloud | — | rald |
| Loop | Production | loop.rald.cloud | React Router DOM v7, Vite, Supabase | loop |
| Messenger API | Production | messenger.rald.cloud | Hono, CF Worker, D1 | messenger |
| Messenger Frontend | Production | chat.rald.cloud | Wouter, Vite, Cloudflare Pages | messenger |
| RALD Auth Core | Production | auth.rald.cloud | TypeScript | rald |
| PayRALD | Development | pay.rald.cloud | — | payrald |
| RALD TV | Planned | tv.rald.cloud | — | — |
| RALD AI | Planned | ai.rald.cloud | — | rald-ai |
| GitRALD | Development | git.rald.cloud | — | gitrald-core |

---

## 3. Domain Registry

| Domain | Points To | Purpose |
|--------|-----------|---------|
| profiles.rald.cloud | Profiles app | Identity, login, registration |
| loop.rald.cloud | Loop SPA | Audio rooms, feed, communities |
| messenger.rald.cloud | Messenger API (CF Worker) | DMs, voice, calls — API layer |
| chat.rald.cloud | Messenger SPA (frontend) | Messenger web app consumer |
| auth.rald.cloud | rald-auth-core | SSO, search, graph API |
| pay.rald.cloud | PayRALD | Payments, wallets |
| git.rald.cloud | GitRALD | Developer tools |
| rald.me | Marketing | Public-facing brand site |

---

## 4. Architecture Registry

### 4.1 Repos (GitHub: Ostinato-Loop)

| Repo | Description | Stack |
|------|-------------|-------|
| `loop-audio-ui-ux` | **Reference** feed/room/profile UI | TanStack Router, Vite |
| `loop-messenger-ui-ux` | **Reference** messenger/communities/calls UI | TanStack Router, Vite |
| `loop` | **Production** Loop app (feed, rooms) | React Router DOM v7, Vite |
| `messenger` | **Production** Messenger app | Wouter, Vite |
| `rald` | **Core** auth, WIZMAC, Constitution, governance | TypeScript |
| `payrald` | PayRALD app | TBD |
| `rald-ai` | RALD AI service | TBD |
| `gitrald-core` | GitRALD core | TBD |

### 4.2 Auth Flow

```
1. User visits loop.rald.cloud
2. No token → redirect to profiles.rald.cloud/login?app_id=loop&redirect_to=loop.rald.cloud
3. Profiles issues RALD JWT, redirects to loop.rald.cloud/?rald_token=JWT
4. Loop AuthProvider detects rald_token → stores as rald_master_token in localStorage
5. Loop calls POST /api/auth/rald-sso {rald_token} → validates JWT → returns {access_token}
6. access_token stored in localStorage as loop_token
7. Silent auth: GET /api/auth/silent validates rald_session cookie on each reload
8. Logout: POST /api/auth/logout (clears cookie) → redirect to profiles.rald.cloud/logout
```

### 4.3 RALD JWT Claims
```json
{
  "id":    "rald_user_id",
  "phone": "+234...",
  "email": "user@rald.me",
  "role":  "user|creator|admin",
  "sso_v": 2,
  "exp":   1234567890
}
```

### 4.4 Cross-App Navigation

| From | To | Method |
|------|----|--------|
| Loop → Messenger | `openMessenger(path)` in `use-auth.tsx` | Appends `?rald_token=MASTER_TOKEN` |
| Loop → Profiles | `openProfiles(path)` in `use-auth.tsx` | Appends `?rald_token=MASTER_TOKEN` |
| Any app → Loop | Redirect to `loop.rald.cloud?rald_token=TOKEN` | Same SSO flow |

### 4.5 Loop App Internal Routes

```
/               → FeedPage      (real rooms from Supabase + mock content items)
/discover       → DiscoverPage  (real rooms from Supabase)
/rooms/:roomId  → RoomPage      (real Supabase realtime room)
/messages       → MessagesPage  (links to Messenger)
/me             → MeLaunchPage  (profile + RALD Identity section)
/create         → CreatePage
/create/:kind   → CreatePage    (room|discussion|event|community|post|article)
/login          → LoginPage     (redirects to profiles if SSO available)
/onboarding     → OnboardingPage (5-step: username, name, language, interests, rooms)
```

### 4.6 Messenger App Internal Routes

```
/               → RootRedirect  (→ /chats if authed, → /auth if not)
/auth           → AuthPage      (RALD SSO exchange)
/onboarding     → OnboardingPage (display name + avatar)
/chats          → ChatsPage     (real D1 conversations + Supabase realtime)
/chats/:convId  → ChatsPage     (conversation view)
/communities    → CommunitiesPage (honest empty state — communities backend pending)
/calls          → CallsPage     (honest empty state — call history API pending)
/profile        → ProfilePage
/settings       → SettingsPage
```

### 4.7 Fail-Fast Rules (Production)

- **Loop API**: `RALD_JWT_SECRET` missing → all auth routes return 503, explicit error message.
- **Loop API**: Missing Supabase env → profile lookup returns null (non-blocking).
- **Messenger Worker**: `MESSENGER_DB` D1 binding missing → `dbMiddleware` returns 400.
- **All apps**: Missing env returns structured JSON error. Zero silent failures.

---

## 5. Incident Registry

| # | Date | System | Description | Cause | Resolution | Status |
|---|------|--------|-------------|-------|------------|--------|
| 001 | 2026-06 | Loop Feed | Feed showed hardcoded mock data to all users | Feed.tsx used loop-mock.ts instead of real API | Wired listRooms() Supabase call with mock fallback | Resolved |
| 002 | 2026-06 | Loop Nav | BottomNav not visible on Feed and Me pages | AppShell wrapper missing from feed.tsx and me-launch.tsx | Added AppShell import and wrapper | Resolved |
| 003 | 2026-06 | Loop Nav | /search Link had no route, silently redirected to / | Dead route with no catch | Changed to `<button>` (search overlay pending) | Resolved |
| 004 | 2026-06 | loop-store.ts | Duplicate `import from "react"` statements | Sprint refactor did not consolidate imports | Merged into single `import React, { ... }` | Resolved |
| 005 | 2026-06-04 | rald-auth-core | `/sso/silent` route was dead code — never reachable | Route registered AFTER `export default session` — Hono ignores routes added after export | Moved `/sso/silent` registration before `export default session` | Resolved |
| 006 | 2026-06-04 | Messenger auth.tsx | Silent SSO (cookie-based re-auth) not implemented | Step 3 (`/auth/silent`) was missing; users always redirected to Profiles login even with valid `rald_session` cookie | Added `/auth/silent` call as Step 3 in the auth cascade | Resolved |
| 007 | 2026-06-04 | Loop / Messenger | Mock identity data (avatar, name, bio) shown instead of real auth profile | `me` object from loop-mock.ts used in me-launch.tsx | Wired `useAuth()` profile fields; mock `me` removed; relationship graph shows honest zero | Resolved |
| 008 | 2026-06-04 | Loop | All SSO users had null profile in `/api/auth/me` | Loop `/api/auth/me` validated with `LOOP_JWT_SECRET` only; SSO users carry RALD tokens signed with `RALD_JWT_SECRET` → 401 silently swallowed in use-auth.tsx catch block | Updated `/api/auth/me` to try `RALD_JWT_SECRET` first; LOOP_JWT_SECRET as fallback; resolved `payload.id ?? payload.sub` for user ID | Resolved |
| 009 | 2026-06-04 | Loop | Hardcoded fallback secret `"loop-dev-secret-change-in-prod"` in production worker | OTP verify path used `c.env.LOOP_JWT_SECRET ?? "loop-dev-secret-change-in-prod"` — if env var absent, any attacker could forge tokens | Removed all hardcoded fallback strings; fail-fast pattern enforced | Resolved |
| 010 | 2026-06-04 | Messenger | `/auth/me` returned null avatar, null bio, email-derived name for all users | No Supabase lookup performed; identity derived from JWT claims only | Rewrote `/auth/me` to query Supabase `profiles` table; email fallback retained for users with no profile row | Resolved |
| 011 | 2026-06-04 | Messenger / Loop | sv.rald.cloud blocked by CORS in Messenger and Loop workers | sv.rald.cloud present in rald-auth-core CORS but missing from Messenger and Loop workers | Added sv.rald.cloud to Messenger explicit CORS list; updated Loop CORS middleware to multi-origin reflect allowlist | Resolved |
| 012 | 2026-06-04 | Messenger search | Phone number and username search returned no results | `/search/related` only queried `messenger_user_profiles` by display_name; users findable only by display name | Added Step 3: cross-reference `profiles` table for username, phone, and display_name; users without a messenger_user_profiles row are now discoverable | Resolved |
| 013 | 2026-06-04 | Loop | me-launch.tsx RALD ID field showed `"rald_8f2c…a91"` (static hardcoded placeholder) for all users | Hard-coded string in JSX | Changed to `rald_${user.id.slice(0, 8)}…` from real `useAuth()` user object | Resolved |
| 014 | 2026-06-04 | Messenger Worker | sv.rald.cloud (admin plane) wrongly added to Messenger CORS in Sprint 01-H; chat.rald.cloud (Messenger SPA) was missing from CORS allowlist | Sprint 01-H misidentified sv.rald.cloud as a Messenger consumer — it is the admin/supervisor plane | Removed sv.rald.cloud; added chat.rald.cloud as primary CORS origin with explanatory comment | Resolved |
| 015 | 2026-06-04 | Messenger Frontend | Communities page rendered 6 fake communities (12,400–24,500 fake member counts, pravatar.cc avatars) from mock-data.ts to production users | communities.tsx imported `communities` array from mock-data.ts; no backend exists | Removed mock import; replaced with honest empty state and "Notify me when live" CTA | Resolved |
| 016 | 2026-06-04 | Messenger Frontend | Calls page rendered 5 fake call history entries and 3 fake audio rooms (412–1,280 fake listener counts) from mock-data.ts | calls.tsx imported `calls` + `audioRooms` from mock-data.ts; no call history API exists | Removed mock imports; replaced with honest empty states for both sections | Resolved |
| 017 | 2026-06-04 | Loop Frontend | Feed header showed "Lagos · Nigeria" as user location for every user worldwide | `userRegion` imported from loop-mock.ts was hardcoded `{ city: "Lagos", country: "Nigeria" }` — not derived from user profile | Removed userRegion import; removed location chip from Feed header entirely | Resolved |
| 018 | 2026-06-04 | Loop Worker | `/api/trending` returned 3 hardcoded topic labels (AfroTech, Civic Watch, Beats & Bars) with count:0 | Phase 1 placeholder included invented topic names that implied editorial curation | Replaced with empty `topics: []`; updated cache key to `trending:v2` to bust stale cached response | Resolved |

---

## 6. Decision Registry

| # | Date | Decision | Rationale | Owner |
|---|------|----------|-----------|-------|
| D001 | 2026-06 | profiles.rald.cloud is sole identity provider | No identity fragmentation across products. One RALD ID. | LILCKY STUDIO |
| D002 | 2026-06 | Loop uses React Router DOM v7, not TanStack Router | Production app must have stable routing; reference UI used TanStack | LILCKY STUDIO |
| D003 | 2026-06 | Messenger uses Wouter, not React Router DOM | Messenger is a separate SPA; lighter router preferred | LILCKY STUDIO |
| D004 | 2026-06 | RALD JWT (HS256) is the cross-app token | Simplest shared secret approach; avoids per-app key management | LILCKY STUDIO |
| D005 | 2026-06 | Messenger CF Worker uses D1 (not Supabase) | Edge worker compatibility; low-latency for realtime messaging | LILCKY STUDIO |
| D006 | 2026-06 | Loop SPA uses Supabase directly for rooms/profiles | Loop is a more traditional SPA; Supabase realtime fits | LILCKY STUDIO |
| D007 | 2026-06 | Feed wired to real listRooms() with mock fallback | Prevent empty states on pre-launch; graceful degradation | LILCKY STUDIO |
| D008 | 2026-06 | Username regex allows ASCII only (a-z, 0-9, _) | URL-safe usernames; display name is the place for Unicode | LILCKY STUDIO |
| D009 | 2026-06-04 | Sprint 01 scope: Identity, Discovery, Relationships, Retention only | No music, sports, PayRALD, Dispatch, or creator monetization in Sprint 01 | LILCKY STUDIO |
| D010 | 2026-06-04 | `/sso/silent` route MUST be registered before `export default session` in rald-auth-core | Hono router ignores routes registered after the router is exported; route was dead code | LILCKY STUDIO |
| D011 | 2026-06-04 | Cross-app navigation via `?rald_token=` handoff with valid-token check | Token is passed only if locally valid (not expired); falls back to Profiles login. Helpers in `@/lib/cross-app.ts` in Messenger. | LILCKY STUDIO |
| D012 | 2026-06-04 | Sprint 01 Priority 3: Zero mock data visible to real users | All mock content items replaced with honest empty states. Profile data comes from `useAuth()` only. Relationship graph deferred to Sprint 02. | LILCKY STUDIO |
| D013 | 2026-06-04 | Loop `/api/auth/me` MUST try `RALD_JWT_SECRET` before `LOOP_JWT_SECRET` | SSO users store RALD tokens; legacy OTP users store LOOP tokens. The me endpoint must handle both. RALD_JWT_SECRET always tried first (Identity Axiom). | LILCKY STUDIO |
| D014 | 2026-06-04 | No hardcoded JWT secret fallback strings in any worker | The `?? "loop-dev-secret-change-in-prod"` pattern is forbidden. All workers must fail-fast (503) if secrets are absent rather than silently using weak fallbacks. | LILCKY STUDIO |
| D015 | 2026-06-04 | RALD JWTs use `id` claim; legacy Loop OTP JWTs use `sub` — always resolve with `payload.id ?? payload.sub` | RALD auth core issues `{ id, email, phone, role }`. Legacy OTP path issues `{ sub, phone, role }`. All profile lookups must use the resolved userId, never assume one field. | LILCKY STUDIO |
| D016 | 2026-06-04 | Loop CORS middleware must reflect the request Origin against a production allowlist, not return a single static origin | Single-origin CORS breaks credentialed requests from sv.rald.cloud, messenger.rald.cloud etc. Middleware reads `Origin` header, reflects if allowlisted, adds `Vary: Origin`. | LILCKY STUDIO |
| D017 | 2026-06-04 | Messenger `/auth/me` must fetch real profile from Supabase `profiles` table on every call | Previously returned null avatar, null bio, email-derived name. Now queries profiles table; falls back to email-derived name only if no row exists. | LILCKY STUDIO |
| D018 | 2026-06-04 | sv.rald.cloud is a domain name only — no frontend, no backend | Referenced in CORS configs but no product exists. Do not advertise this URL. Classified RED in launch readiness. Build frontend before re-enabling. | LILCKY STUDIO |
| D019 | 2026-06-04 | Messenger frontend domain is chat.rald.cloud; messenger.rald.cloud is the API Worker | messenger.rald.cloud Cloudflare Worker route confirmed in wrangler.toml. The Messenger SPA (Vite/React) is deployed to Cloudflare Pages as chat.rald.cloud. CORS allowlist must use chat.rald.cloud as the primary frontend origin. | LILCKY STUDIO |
| D020 | 2026-06-04 | sv.rald.cloud MUST NOT be in the Messenger Worker CORS allowlist | sv.rald.cloud is the RALD admin/supervisor plane. It has no need to make credentialed requests to the Messenger API. Adding it to CORS was an error introduced in Sprint 01-H. | LILCKY STUDIO |
| D021 | 2026-06-04 | Trust rule: mock-data.ts files must never be imported in production pages visible to users | Fake member counts, fake usernames, and fake call history are trust violations. All pages must use real API data or honest empty states. mock-data.ts files are retained as reference shapes only. | LILCKY STUDIO |
| D022 | 2026-06-04 | Loop Feed location chip removed until user profile API returns a real region field | Showing a hardcoded "Lagos · Nigeria" to a user in Nairobi destroys product intelligence perception. Location features require a `region` column on the `profiles` table, populated during onboarding. Defer until Sprint 03. | LILCKY STUDIO |

---

## 7. Migration History

| Migration | Date | Repo | Description | Reversible |
|-----------|------|------|-------------|------------|
| 0001 | 2026 | rald | Initial registered_apps table | Yes |
| 0002 | 2026 | rald | SSO sessions and refresh tokens | Yes |
| 0003 | 2026 | rald | User graph and connections | Yes |
| 0004 | 2026-06 | rald | lifecycle_state column on registered_apps; seeded Loop, Messenger, Profiles, Auth Core | Yes |

**Migration Policy:**
- All migrations use `IF NOT EXISTS` / `IF EXISTS` guards.
- `ON CONFLICT DO UPDATE` used for seed data — never raw INSERT without conflict handling.
- Migrations are append-only. No migration may drop a column without a deprecation phase.
- Every migration must be tested on a staging database before production.

---

## 8. Community Registry

| Community | Status | Members | Platform |
|-----------|--------|---------|----------|
| AfroDevs Collective | Planned | — | Loop + Messenger |
| Lagos Tech Circle | Planned | — | Loop + Messenger |
| RALD Announcements | Active | All users | Messenger |
| University communities | Planned | — | Loop |
| Regional (city-level) | Planned | — | Loop |

**Note:** Communities.tsx now shows an honest empty state. The mock community data has been removed from the production page. Community backend is Sprint 04.

---

## 9. Expansion Registry

| Phase | Market | Status | Notes |
|-------|--------|--------|-------|
| Phase 1 | Nigeria (Lagos) | In progress | Core launch market |
| Phase 2 | Kenya (Nairobi) | Planned | English + Swahili |
| Phase 3 | Ghana (Accra) | Planned | English + Twi |
| Phase 4 | South Africa | Planned | English + Zulu |
| Phase 5 | Rest of Africa | Planned | Per-market localization |
| Phase 6 | Diaspora | Planned | UK, USA, Canada |

---

## 10. Weekly Planning Registry

| Week | Focus | Key Deliverables | Status |
|------|-------|-----------------|--------|
| 2026-W23 | Foundation Lockdown Sprint | Identity propagation, Loop launch UI, Messenger communities/calls, WIZMAC, Governance SQL | Completed |
| 2026-W24 | Feed Real Data + Constitution | Wire listRooms() to feed, write RALD Constitution, fix audit bugs, push to GitHub | Completed |
| 2026-W24 (H) | Sprint 01-H Hardening | Fix Loop /auth/me RALD token bug, Messenger /auth/me profile lookup, Loop hardcoded RALD ID, CORS sv.rald.cloud, Messenger search phone+username, security hardening, full audit reports | Completed |
| 2026-W25 | Sprint 02 Trust & Retention | Remove all fake data (communities, calls, region chip, trending topics), fix Messenger CORS (chat.rald.cloud), 6 audit reports, WIZMAC v1.3 | Completed |
| 2026-W26 | Sprint 03 People & Push | Loop people search, Messenger push delivery (server-side VAPID), invite mechanism, onboarding improvements (suggested people, avatar), relationship graph foundation | Planned |

**Weekly Planning Process:**
1. Each Monday: Update this registry with the week's focus and deliverables.
2. Each Friday: Mark completed items. Note blockers for the following week.
3. No sprint starts without a WIZMAC entry.

---

## 11. Design System

### Loop (Audio)
- Font: Bricolage Grotesque (display), DM Sans (body)
- Primary: `#00FF88` — neon green (RALD/Loop brand)
- Background: `#0A1F16` — deep commerce dark
- Live indicator: `#FF2E2E` red + pulse animation
- Orange accent: `#FF7A00`
- CSS tokens: `--neon`, `--neon-foreground`, `--orange`, `--live`
- Utility classes: `.neon-glow`, `.scrollbar-none`, `.live-dot`, `.safe-pb`

### Messenger
- Font: Inter (system)
- Primary: `#7C3AED` (purple/violet) or `#FF7A00` (orange variant)
- Background: `#0B0D0E` dark
- Surface: `#131618`
- CSS tokens: `--primary`, `--surface`, `--muted-foreground`

### Shared Rules
- Both apps use `--primary` for their brand color (scoped per-app)
- Mobile-first: max-width 480px container, safe-area-inset support
- All interactive elements minimum 44px tap target
- `env(safe-area-inset-bottom)` on all sticky footers

---

## 12. Knowledge Registry

### African Market Context
- Nigeria: ~220M population, ~40% smartphone penetration, average 3G speeds
- Kenya: ~55M population, M-Pesa dominant, higher data literacy
- Ghana: ~33M population, strong English literacy, growing startup ecosystem
- Data costs: Nigeria ₦1,000–₦3,000/GB; Kenya KSh 50–150/GB

### Competitive Positioning
- WhatsApp: strongest competitor for messaging (3B users). RALD differentiates on identity + civic rooms.
- Telegram: channels and communities. RALD differentiates on local/regional context.
- TikTok/Instagram: content platforms. RALD's Loop is not a content feed — it is a conversation platform.
- Twitter/X: public discourse. RALD's audio rooms are the equivalent but with voice and local context.

### Technical Constraints Documented
- TRTC (Tencent RTC) used for Loop audio — data routes through Tencent infrastructure. Disclose to users.
- Supabase realtime used in both Loop (rooms) and Messenger (presence, typing). Rate limit: 10 events/second.
- CF Workers D1 is the Messenger message store — 500MB limit per database on free tier.

---

*WIZMAC v1.3 — Updated 2026-06-04 — LILCKY STUDIO LIMITED*
*This document is the single source of truth for RALD platform operations.*
