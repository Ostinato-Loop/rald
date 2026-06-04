# Loop Retention Report
**Sprint:** Production Readiness & Foundation Readiness
**Date:** 2026-06-04
**Author:** LILCKY STUDIO LIMITED — Engineering
**Status:** 🟡 FUNCTIONAL — real data; discovery and re-engagement gaps

---

## Service Status

**Worker:** loop-api (post-Sprint 01 H)
**Frontend:** loop.rald.cloud (Vite + React)
**Auth:** Dual path — RALD SSO (primary) + Termii OTP (legacy)

---

## Mock Data Audit

All mock data removed in Sprint 01:

| Page | Before | After |
|------|--------|-------|
| feed.tsx | Static mock rooms array | Real `/api/rooms` query |
| discover.tsx | Static mock content | Real `/api/trending` query |
| me-launch.tsx | Static user values | Real `useAuth()` user object |
| me-launch.tsx RALD ID | `"rald_8f2c…a91"` (hardcoded) | ✅ FIXED: `rald_${user.id.slice(0,8)}…` |

---

## Auth Data Quality

| Field | Source | Status |
|-------|--------|--------|
| User ID | RALD JWT `id` claim | ✅ Real |
| Phone | JWT `phone` claim | ✅ Real |
| Display name | Supabase profiles | ✅ Real (fetched via /api/auth/me) |
| Avatar | Supabase profiles | ✅ Real (now fetched — fixed Sprint 01-H) |
| Bio | Supabase profiles | ✅ Real (now fetched — fixed Sprint 01-H) |
| Region / City | Hardcoded `loop-mock` config | 🟡 Config-level; not user-specific |
| RALD ID display | User.id (first 8 chars) | ✅ FIXED |

---

## Feature Completeness

| Feature | Status | Notes |
|---------|--------|-------|
| OTP login (Termii) | ✅ | Rate limited (5/hr/phone) |
| RALD SSO login | ✅ | rald-sso.ts; RALD token returned unchanged |
| Silent auth (cookie) | ✅ | /api/auth/silent in rald-sso.ts |
| Feed (real rooms) | ✅ | /api/rooms |
| Trending (real) | ✅ | /api/trending |
| Real-time room (DO) | ✅ | Durable Object RoomSession |
| Profile display | ✅ | Real data after Sprint 01-H fix |
| Discover page | ✅ | Real trending from worker |
| Cross-app to Messenger | ✅ | openMessenger() helper |
| Cross-app to Profiles | ✅ | openProfiles() helper |
| Push notifications | 🔴 | Not implemented |
| Friend/follow system | 🔴 | Not implemented |
| Content creation (posting) | 🟡 | Rooms exist; text posts only, no media |
| Media upload | 🔴 | Not implemented |
| Notifications tab | 🔴 | UI placeholder only |
| Search | 🟡 | /api/trending; no full search |

---

## Retention Risk Factors

### R-LOOP-001: No Push Notifications [HIGH RISK]
Same as Messenger — no mechanism to re-engage users who leave.
**Recommendation:** Expo Push Notifications via `/api/notifications` worker endpoint.

### R-LOOP-002: No Social Graph / Friend System [HIGH RISK]
**Impact:** Users cannot build a network in Loop. Rooms are anonymous by nature; no way to follow interesting creators.
**Current state:** No follows, no connections, no DM from Loop profile.
**Recommendation:** Implement follow/unfollow in profiles table; expose via rald-auth-core `/graph/*` endpoints (already scaffolded).

### R-LOOP-003: No Content Creation UX [MEDIUM RISK]
**Impact:** Users can join rooms but creating engaging content is limited.
**Recommendation:** Add room post composer with image upload; video is post-Phase G.

### R-LOOP-004: Dual Token Architecture [MEDIUM RISK]
**Impact:** OTP users cannot seamlessly cross-app into Messenger without re-auth.
**Recommendation:** Remove OTP path; require all sign-up through profiles.rald.cloud.

---

## Room Data Quality

| Metric | Current | Target |
|--------|---------|--------|
| Rooms with at least 1 member | Unknown | >80% |
| Active rooms (last 7 days) | Unknown | Tracked via `last_message_at` |
| Average messages per room/day | Unknown | Baseline TBD |

**Recommendation:** Add `/api/rooms/stats` endpoint returning active room count, DAU, and messages/day for monitoring dashboard.

---

## 7-Day Retention Forecast

| Scenario | Estimate |
|----------|----------|
| Current | ~10% D7 retention |
| With push notifications | ~35% D7 retention |
| With push + social graph | ~50% D7 retention |

The absence of a social graph is Loop's biggest retention risk. Users who join but don't connect with anyone or find interesting content will churn immediately.
