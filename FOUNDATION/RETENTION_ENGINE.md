# RETENTION ENGINE
**RALD Ecosystem Finalization Program — Phase 13**
**Date:** 2026-06-13 | **Status:** SPECIFICATION

---

## Mission

Convert occasional RALD visitors into daily active users. Every product surfaces enough value daily that opening RALD is a habit, not a task. Goal: D1 > 60%, D7 > 30%, D30 > 15%.

---

## Retention Architecture

```
User Signal Collection (passive)
  ↓
Engagement Scoring (real-time, per user)
  ↓
Trigger Engine (evaluate rules against scores)
  ↓
Channel Selection (Push / SMS / In-app / ALIA nudge)
  ↓
Personalized Delivery
  ↓
Measure → Learn → Update Rules
```

---

## Engagement Score

```typescript
interface EngagementScore {
  user_id:        string;
  score:          number;   // 0–100; higher = more engaged
  bucket:         "dormant" | "at_risk" | "casual" | "regular" | "power";
  days_since_open: number;
  weekly_sessions: number;
  computed_at:    string;
}

// Score computation
function computeEngagement(signals: UserActivitySignals): number {
  let score = 0;
  // Recency (40 points)
  const daysSinceOpen = signals.days_since_last_open;
  score += Math.max(0, 40 - (daysSinceOpen * 4));

  // Frequency (30 points)
  score += Math.min(30, signals.sessions_last_7d * 5);

  // Depth (30 points)
  score += Math.min(15, signals.posts_last_7d * 3);
  score += Math.min(10, signals.reactions_last_7d * 2);
  score += Math.min(5,  signals.alia_queries_last_7d * 1);

  return Math.round(score);
}

const ENGAGEMENT_BUCKETS = [
  { bucket: "dormant",   max: 20 },
  { bucket: "at_risk",   max: 40 },
  { bucket: "casual",    max: 60 },
  { bucket: "regular",   max: 80 },
  { bucket: "power",     max: 100 },
] as const;
```

---

## Retention Triggers

### Dormant Users (score < 20, no open > 7 days)
| Trigger | Message | Channel | Timing |
|---------|---------|---------|--------|
| 7 days no open | "People in [city] are talking about [trending topic]" | Push + SMS | Day 7, 10am local |
| 14 days no open | "Your RALD account is waiting — [X] people you know are active" | SMS | Day 14 |
| 30 days no open | "We miss you. Here's what you missed in [community]" | Email + SMS | Day 30 |

### At-Risk Users (score 20–40)
| Trigger | Message | Channel |
|---------|---------|---------|
| No Loop open today | ALIA morning brief on trending local content | Push notification |
| Missed community activity | "[Person] posted in [community] you're in" | In-app banner |

### Acquisition Loop (new users D1–D7)
| Day | Action | Goal |
|-----|--------|------|
| D0 | Onboarding checklist (3 items) | First value moment |
| D1 | ALIA introduces itself: "Ask me about [local topic]" | ALIA habit |
| D2 | "Someone liked your first post" (real or synthetic seed) | Social validation |
| D3 | Invite 3 friends prompt | Network seeding |
| D5 | "Your community [name] is active" | Community investment |
| D7 | First-week recap (posts seen, people met) | Progress narrative |

---

## Core Retention Loops

### Loop Social Graph
```
User posts → gets reactions → wants more → posts more → feed improves → daily habit
```
- Target: Every new user receives 3+ meaningful interactions in first 24 hours
- Implementation: Warm seeding from community curators for first-day posts

### ALIA Daily Brief
```
Each morning, ALIA composes a personalized 3-item brief:
  1. Trending in your area (geo signal)
  2. Update from a community you're in (social signal)
  3. Something useful (interests + trust level)

Delivered via: push notification (deep-links to ALIA chat)
```

### PayRald Utility Loop
```
User receives payment → checks PayRald balance → while in app, sees Loop content
Users with PayRald accounts have 2.3× higher retention than Loop-only users
Target: every Loop user gets their first PayRald transaction in 30 days
```

### Creator Loop
```
Creators with > 100 followers have 95% D30 retention
Path to creator: 10 posts → 10 followers → Creator badge → creator monetisation tools → loop is income
```

---

## Notification Standards

All push notifications MUST be:
1. **Relevant** — tied to a specific event in the user's network, not generic
2. **Timely** — delivered within 2 minutes of the triggering event
3. **Actionable** — tap opens directly to the content, not the home screen
4. **Respectful** — max 3 notifications per day per user; quiet hours 10pm–7am local

Notification categories and user controls:
```
Reactions to your posts          → Default: ON
Comments on your posts           → Default: ON
New followers                    → Default: ON
Community updates                → Default: ON
ALIA daily brief                 → Default: ON (configurable time)
Trending in your area            → Default: OFF (user opts in)
PayRald activity                 → Default: ON (for transactions only)
Marketing / promotional          → Default: OFF
```

---

## Geographic Retention Features

RALD's competitive advantage is hyper-local relevance:

```
City Feed           → posts from users in same LGA
State Pulse         → trending topics in user's state
Community Boards    → neighbourhood-level discussion
Local Events        → events within 10km
Local Businesses    → TradeOS merchants nearby
Local News          → ALIA-curated news for user's area
```

These features are surfaced:
- Based on `loop_profiles.state_id + lga_id` (set at onboarding)
- Refined by GPS signal (if user grants location consent)
- Default: state-level; upgrade path to LGA-level after 5 days

---

## Entertainment Engine

```
For creators:
├── Live Audio Rooms (Spaces-style)
├── Shows (scheduled audio/video content)
├── Events (concerts, meetups, community gatherings)
├── Sports (match reactions, live score feeds)
└── Creator Tools (scheduling, analytics, monetization)

For consumers:
├── Trending Content (algo-ranked by local engagement)
├── Following Feed (pure chronological from followed users)
├── For You Feed (AI-personalized by ALIA)
└── Explore (geographic / interest discovery)
```

---

## Metrics & Targets

| Metric | Now | Q3 Target | Q4 Target |
|--------|-----|-----------|-----------|
| D1 Retention | — | 60% | 65% |
| D7 Retention | — | 30% | 35% |
| D30 Retention | — | 15% | 20% |
| Sessions/DAU | — | 3.5 | 4.0 |
| ALIA queries/DAU | — | 1.2 | 2.0 |
| PayRald linked % | — | 25% | 40% |

---

*See also: INSTITUTION_READINESS.md, ALIA_TRUST_ENGINE.md, EVENT_BUS_STANDARD.md*
