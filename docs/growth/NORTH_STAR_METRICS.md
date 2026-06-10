# RALD North Star Metrics

**Document:** RALD-NSM-001  
**Date:** 2026-06-09  
**Status:** ACTIVE — reviewed at every sprint review  
**Owner:** RALD Product (Ostinato-Loop)  
**Scope:** Loop · Messenger · RALD Identity Platform

---

## The North Star

> **Weekly Active Rooms (WAR)** — the number of distinct audio rooms created or joined by a unique user in a rolling 7-day window.

A WAR growing week-over-week means communities are forming, hosts are returning, and the product is delivering value. Every other metric below either predicts or explains WAR movement.

---

## Tier 1 — Core Health (reviewed weekly)

| Metric | Definition | Target (Private Beta) | Target (Launch) |
|--------|-----------|----------------------|-----------------|
| **WAR** | Unique users who hosted or joined ≥1 room in last 7 days | 500 | 10,000 |
| **D7 Retention** | % of new users still active 7 days after signup | 35% | 45% |
| **D30 Retention** | % of new users still active 30 days after signup | 15% | 25% |
| **DAU / MAU ratio** | Daily actives ÷ monthly actives (stickiness) | 0.20 | 0.35 |
| **Rooms created / week** | Total live rooms started across all regions | 200 | 5,000 |

---

## Tier 2 — Engagement Quality (reviewed bi-weekly)

| Metric | Definition | Why it matters |
|--------|-----------|---------------|
| **Avg session duration** | Minutes per active session (room join → leave) | Longer = stronger content pull; proxy for enjoyment |
| **Listener → Host rate** | % of active listeners who start a room within 30 days | Core creator funnel; predicts content supply |
| **Rooms per host / week** | Avg rooms created by users who hosted at least once | Host consistency = recurring audience |
| **Follow graph density** | Avg follows per active user | Social gravity — followed creators bring users back |
| **Rooms with ≥10 listeners** | % of rooms that reach 10+ concurrent | Breakout rooms signal community health |
| **Return visit rate** | % of users with ≥2 sessions in a 7-day window | Repeat engagement beyond onboarding |

---

## Tier 3 — Regional Growth (reviewed monthly)

| Metric | Definition | Why it matters |
|--------|-----------|---------------|
| **Regional penetration** | % of users with country + state + LGA set | Enables regional ranking and local community discovery |
| **Active regions** | Distinct LGA/state combos with ≥3 WAR users | Breadth of geographic footprint |
| **Regional room share** | % of rooms with region metadata | Feeds regional discovery and community formation |
| **Top 5 growing regions** | Ranked by week-over-week WAR growth | Identifies organic growth clusters to double down on |
| **Language distribution** | WAR breakdown by room language | Validates multi-language value and informs content priorities |

---

## Tier 4 — Creator Economics (reviewed monthly)

| Metric | Definition | Why it matters |
|--------|-----------|---------------|
| **Creator activation rate** | % of new users who host a room within 14 days | Velocity of supply-side growth |
| **Creator 30-day survival** | % of first-time hosts who host again within 30 days | Retention of content creators = retention of their audiences |
| **Avg audience per creator** | Avg peak listeners across a creator's rooms in 30 days | Creator reach — signals who to spotlight |
| **Follower growth / creator** | Week-over-week follower delta per active creator | Social capital accumulation = platform lock-in |
| **Invite-to-activate rate** | % of shared room links that result in a new account | Viral coefficient proxy; measures word-of-mouth growth |

---

## Tier 5 — Platform Health (reviewed monthly)

| Metric | Definition | Threshold |
|--------|-----------|-----------|
| **Signup completion rate** | % of sign-up attempts that reach an active profile | > 75% |
| **Onboarding completion rate** | % of new users who complete region + interests selection | > 60% |
| **Auth error rate** | % of login attempts that fail | < 2% |
| **Room start success rate** | % of "create room" actions that result in a live room | > 95% |
| **Push opt-in rate** | % of users who allow push notifications | > 40% (iOS), > 65% (Android) |
| **PWA install rate** | % of mobile users who install Loop to home screen | > 20% |
| **P95 API latency** | 95th percentile response time for all /api/* routes | < 400ms |

---

## Metric Definitions

### Weekly Active Room (WAR) — expanded
A user counts as a WAR if, in the past 7 calendar days, they:
- Started a live room (host action), OR
- Joined a live room for ≥2 minutes (sustained listen, not a bounce)

**Excluded:** Room preview bounces < 2 min, test/internal accounts, rooms with 0 other participants.

### D7 / D30 Retention
- Cohort: users who completed onboarding (region + interests set)
- Active = at least one WAR event (join or host) in the measurement window
- Calculated by weekly cohort (not rolling)

### DAU / MAU
- DAU: unique users with any room event (join or host) in last 24h
- MAU: unique users with any room event in last 30 days
- Ratio target 0.35 = users open Loop most days of the week

---

## Warning Signals

These are the leading indicators of trouble — any one of these triggers an immediate product review:

| Signal | Threshold | Likely Cause |
|--------|-----------|-------------|
| D7 retention drops below 25% | Any 2-week cohort | Onboarding failure or room quality |
| Host survival rate < 20% | 30-day window | Creator experience gap |
| WAR growth negative 2 consecutive weeks | — | Content supply crash |
| Signup completion < 60% | Any week | Auth or onboarding friction |
| Regional penetration < 40% | Among 4-week+ users | Missing regional nudges |
| Avg session duration < 4 min | Weekly average | Room quality or audio issues |

---

## Data Sources

| Layer | Source | Latency |
|-------|--------|---------|
| Room events | Supabase `room_participants` | Real-time |
| User events | Supabase `profiles`, `rooms` | Real-time |
| Follow graph | Supabase `follows` | Real-time |
| Auth events | RALD Auth Core `auth_sessions`, `audit_logs` | Real-time |
| Regional data | Supabase `profiles.country / state_id / lga_id` | Real-time |
| Push opt-in | Loop SW push subscription registry | Batch (daily) |
| PWA install | `beforeinstallprompt` event capture → analytics | Batch (daily) |

---

## Instrumentation Checklist

Events that must be firing before any metric is meaningful:

- [ ] `room.created` — host_id, category, language, region, timestamp
- [ ] `room.joined` — user_id, room_id, timestamp
- [ ] `room.left` — user_id, room_id, duration_seconds
- [ ] `follow.created` — follower_id, following_id, timestamp
- [ ] `profile.onboarded` — user_id, country, state_id, lga_id, interests[], timestamp
- [ ] `push.subscribed` — user_id, platform, timestamp
- [ ] `pwa.installed` — user_id (if known), platform, timestamp
- [ ] `invite.clicked` — room_id, source (copy/share), timestamp
- [ ] `invite.converted` — room_id, new_user_id, timestamp

---

## Sprint Connection

Each sprint should directly move at least one Tier 1 or Tier 2 metric. The sprint goal should name the metric and the expected direction:

| Sprint | Primary Metric Target |
|--------|----------------------|
| Auth hardening (done) | Auth error rate < 2% |
| Mobile readiness (current) | PWA install rate > 20%; push opt-in rate > 40% |
| Follows / Following | Follow graph density ↑; D7 retention ↑ |
| Push notifications | Return visit rate ↑; DAU/MAU ↑ |
| Community discovery | Regional penetration ↑; active regions ↑ |
| Room hosting metrics | Host survival rate ↑; creator activation rate ↑ |
| Creator growth mechanics | Listener → host rate ↑; invite-to-activate rate ↑ |
| Regional onboarding | Onboarding completion rate > 60%; regional room share ↑ |

---

## Review Cadence

| Frequency | Metrics | Audience |
|-----------|---------|----------|
| Weekly | WAR, D7 retention, rooms created, DAU/MAU | Full team |
| Bi-weekly | Tier 2 engagement quality | Product + engineering |
| Monthly | Tier 3 regional, Tier 4 creator economics | Founders |
| Per-sprint | Sprint-specific metric vs. target | Engineering |

---

*RALD North Star Metrics v1.0 — Ostinato-Loop / RALD Product*  
*Next review: 2026-06-16*
