# RETENTION INTELLIGENCE REPORT
**Generated:** 2026-06-12  
**Authority:** Phase 2 — Principal Product Engineer  
**Status:** Partially built in Loop. Ecosystem-wide layer not yet deployed.  
**Classification:** OFFICIAL — SOURCE OF TRUTH

---

## EXECUTIVE SUMMARY

Loop already has a working Retention Engine (`GET /api/retention/feed`) that produces personalised feeds. The Civic Engine exists as Loop routes (`/api/civic`). The Entertainment Engine is embedded in Loop's room/creator/trending routes. WIZMAC memory integration is designed but blocked on `wizmac-core` not being deployed.

**The work is not to build from scratch. The work is to:**
1. Promote Loop's retention feed to an ecosystem-wide service
2. Add the Civic Engine as a standalone capability in `rald-auth-core`
3. Wire WIZMAC memory once deployed
4. Instrument retention metrics across all products

---

## A — CIVIC ENGINE

### Current State

The Civic Engine exists inside the Loop Cloudflare Worker:

| Route | Purpose | Status |
|---|---|---|
| `GET /api/civic` | List civic rooms and discussions | ✅ Live in Loop |
| `GET /api/regions` | LGA/state/country hierarchy | ✅ Live in Loop |
| `GET /api/communities` | Community discovery | ✅ Live in Loop |
| Loop Durable Objects | Room session state | ✅ Live |

### What the Civic Engine Supports (Currently)

```
Country Rooms         — national discussions
State Rooms           — state-level governance
LGA Rooms             — local government area rooms  
Civic Communities     — structured community groups
Public Discussions    — open discourse
```

### Metrics Currently Tracked

```
Room Participation    — audience_count per room (live)
Community Members     — member_count per community (live)
Creator Growth        — followers_count on profiles (live)
```

### What's Missing

| Gap | Impact | Implementation |
|---|---|---|
| Community health score | Can't identify dying communities | Add `community_health_score` column + Supabase function |
| Governance room lifecycle | No start/end for governance sessions | Add `governance_sessions` table |
| Civic engagement metrics per user | Can't personalise civic content | Track `user_civic_engagement` in identity_memory |
| Cross-product civic feed | Civic content only surfaces in Loop | Add `GET /identity/retention/civic` to rald-auth-core |

### Phase 2 Implementation Tasks

**Task A.1 — Community Health Score**
```sql
-- Add to communities table
ALTER TABLE communities ADD COLUMN health_score FLOAT DEFAULT 0;
ALTER TABLE communities ADD COLUMN last_activity_at TIMESTAMPTZ DEFAULT now();

-- Score components: member activity (40%), room participation (30%), new members (20%), posts (10%)
CREATE OR REPLACE FUNCTION compute_community_health(community_uuid UUID)
RETURNS FLOAT AS $$ ... $$ LANGUAGE plpgsql;
```

**Task A.2 — Civic Engagement in Identity Memory**  
Add `civic_engagement` to `identity_memory.preferences`:
```json
{
  "civic_engagement": {
    "followed_lga": "lagos-island",
    "followed_state": "lagos",
    "active_communities": ["abc123", "def456"],
    "last_civic_session": "2026-06-10T14:30:00Z"
  }
}
```

---

## B — ENTERTAINMENT ENGINE

### Current State

The Entertainment Engine is embedded across Loop routes:

| Route | Purpose | Status |
|---|---|---|
| `GET /api/trending` | Trending rooms and topics | ✅ Live |
| `GET /api/creator` | Creator profiles + rooms | ✅ Live |
| `GET /api/rooms` | All live rooms | ✅ Live |
| `GET /api/retention/feed` | Personalised retention feed | ✅ Live |
| Retention feed components | Suggested rooms, creators, friends active, communities | ✅ Live |

### Retention Feed Detail (Loop — Already Working)

The `GET /api/retention/feed` endpoint returns in one call:
```json
{
  "suggested_rooms": [...],      // live rooms matching interests + region
  "suggested_creators": [...],   // top creators to follow (not yet followed)
  "friends_active": [...],       // people the user follows who are in live rooms NOW
  "people_you_may_know": [...],  // users with shared followers
  "suggested_communities": [...]  // communities matching interests
}
```

This is the core Retention Intelligence for Loop. It is working.

### Metrics to Add

| Metric | Current | Target |
|---|---|---|
| Session length | Not tracked | Add analytics event on room leave |
| Room participation rate | audience_count only | Track join/leave with duration |
| Creator growth rate | followers_count snapshot | Add follower_delta_7d column |
| Return rate (D1, D7, D30) | Supabase Edge Function exists (compute-retention-cohorts) | Activate and expose |

### Phase 2 Implementation Tasks

**Task B.1 — Session Length Tracking**
```typescript
// In Loop Worker: room leave handler
POST /api/rooms/:id/leave
// Record: { user_id, room_id, joined_at, left_at, duration_seconds }
// Table: room_participation_events
```

**Task B.2 — Activate Retention Cohort Function**
Messenger already has `compute-retention-cohorts` Supabase Edge Function. Run it on a schedule:
```sql
-- Add cron via Supabase Dashboard → Edge Functions → Schedules
-- Schedule: daily at 02:00 UTC
```

**Task B.3 — Entertainment Interests in Identity Brain**
Update `identity_capabilities` with `entertainment_interests` field:
```typescript
POST /identity/intelligence
{ field: "entertainment_interests", value: ["music", "sports", "comedy"] }
```

---

## C — WIZMAC MEMORY INTEGRATION

### Current State

WIZMAC is designed but **not deployed**. The `wizmac-core` repo has schema definitions and agent specs but no running service. Memory integration is blocked.

### What WIZMAC Memory Should Track

| Signal | Source | Table |
|---|---|---|
| Joined rooms | Loop `room_participants` | wizmac_user_context |
| Followed communities | Loop `community_members` | wizmac_user_context |
| Content interests | Loop interactions + onboarding | wizmac_user_context |
| Active times | Session start/end events | wizmac_user_context |
| Preferred content types | Room category engagement | wizmac_user_context |

### Integration Design

```
User joins room "Lagos Finance Discussion" (category: civic, state: Lagos)
  → Loop Worker emits event to rald-event-bus
  → rald-event-bus routes to WIZMAC (when deployed)
  → WIZMAC updates user_context { civic: +1, lagos: +1, finance: +1 }
  → Next time: GET /identity/retention/civic → Lagos civic rooms prioritised
```

### Unblocking Path

1. Deploy `wizmac-core` as a Cloudflare Worker — blocked on operator action
2. Connect `rald-event-bus` → WIZMAC routing — add route in event-bus worker
3. WIZMAC reads from `identity_memory.preferences` and writes back enriched signals
4. Products query via `GET /identity/intelligence` — no product-specific code needed

### Phase 2 Tasks (Contingent on WIZMAC Deployment)

**Task C.1** — Add `user_context` JSONB column to `identity_memory`:
```sql
ALTER TABLE identity_memory ADD COLUMN wizmac_context JSONB DEFAULT '{}';
```

**Task C.2** — Event bus routing config: `events.rald.cloud` → WIZMAC endpoint

**Task C.3** — WIZMAC write-back: POST `auth.rald.cloud/identity/memory/update` after context update

---

## ECOSYSTEM-WIDE RETENTION METRICS DASHBOARD

### Required Metrics (Control Center)

| Metric | Source | Frequency |
|---|---|---|
| DAU/MAU ratio | auth_sessions + loop analytics | Daily |
| Onboarding completion rate | identity_capabilities.completed_onboarding | Real-time |
| Average session length | room_participation_events | Daily |
| D1/D7/D30 retention cohorts | compute-retention-cohorts Edge Function | Daily |
| Community health scores | community_health_score function | Daily |
| Civic engagement rate | room_participants WHERE category=civic | Daily |
| Creator growth rate | profiles.followers_count delta | Weekly |

### Implementation

Add a `GET /api/retention-metrics` endpoint to `rald-control-center/apps/api`:
- Queries above metrics from Supabase
- Cached in Cloudflare KV for 5 minutes
- Exposed in Control Center dashboard

---

## SUMMARY OF PHASE 2 WORK

| Item | Complexity | Repo | Status |
|---|---|---|---|
| Community health score function | Medium | loop | ❌ Not built |
| Civic engagement in identity_memory | Low | rald-auth-core | ❌ Not built |
| Session length tracking (room) | Low | loop | ❌ Not built |
| Retention cohort schedule activation | Low | messenger + loop | ❌ Not activated |
| Entertainment interests in identity_brain | Low | rald-auth-core | ❌ Not built |
| WIZMAC context column | Low | rald-auth-core | ❌ Blocked on WIZMAC deploy |
| WIZMAC event bus routing | Medium | rald-event-bus | ❌ Blocked on WIZMAC deploy |
| Retention metrics API in control center | Medium | rald-control-center | ❌ Not built |

---

*Report generated by Principal Product Engineer · RALD Platform Engineering · LILCKY STUDIO LIMITED · 2026-06-12*
