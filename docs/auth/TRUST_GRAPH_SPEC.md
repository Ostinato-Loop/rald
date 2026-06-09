# TRUST_GRAPH_SPEC.md
**RALD Auth V1 — Trust Layer & Identity Graph**
**Date:** 2026-06-09 | **Authority:** RALD Auth V1 Lockdown Directive
**LILCKY STUDIO LIMITED**

---

## CORE PRINCIPLE

> Do not fake scores. Do not hardcode values. Build foundations for future BBC systems.

The Trust Graph is real infrastructure — not a gamification layer. Every score is computed from verifiable signals. Every signal is stored, auditable, and explainable.

---

## CURRENT STATE

### Loop: Client-computed trust score (temporary)

`use-auth.tsx` computes a profile-completeness score client-side:

```typescript
function computeTrustScore(profile: Profile): number {
  let score = 0;
  if (profile.username)        score += 5;
  if (profile.display_name)    score += 5;
  if (profile.avatar_url)      score += 10;
  if (profile.bio)             score += 10;
  if (profile.interests?.length >= 3) score += 10;
  if (profile.country)         score += 10;
  if (profile.state_id)        score += 5;
  if (profile.lga_id)          score += 5;
  if (profile.lcda_id)         score += 5;
  if (profile.onboarded)       score += 10; // etc.
}
```

This produces a 0–100 score, but it is **not persisted** — it is recomputed on every page load. V1 Certification acknowledges this as Sprint 2 work.

### Auth Core: Identity Graph (partial)

`graph.ts` route exists with:
- `GET /graph/me` — connection list from `rald_connections` table
- `GET /graph/mutual/:userId` — mutual connections
- `GET /graph/score/:userId` — connection score between two users

Connection score formula (from code comments):
```
+2  per shared room session
+3  per direct message thread
+5  per contact match
+10 for mutual followers
+1  per shared community / group
```

Tables required: `rald_connections`, `rald_connection_edges` (may or may not be migrated yet)

---

## TRUST SCORE ARCHITECTURE

### Principle

Trust Score = **Persistent, server-computed, incrementally updated.**

A user's score changes when real events happen. It is NOT recomputed from scratch on every request — it is maintained as a running total in `profiles.trust_score`.

### Score Components (V1)

| Signal | Points | Source |
|---|---|---|
| **Identity** | | |
| Phone verified | +10 | `auth_users.metadata.phone_verified` |
| Email verified | +5 | `auth_users.metadata.email_verified` |
| Display name set | +5 | `profiles.display_name IS NOT NULL` |
| Avatar uploaded | +10 | `profiles.avatar_url IS NOT NULL` |
| Bio written | +10 | `profiles.bio IS NOT NULL` |
| Region set (country) | +10 | `profiles.country IS NOT NULL` |
| State + LGA set | +5 | `profiles.state_id + lga_id IS NOT NULL` |
| 3+ interests set | +5 | `profiles.interests` array length |
| **Verification** | | |
| RALD Verified (any type) | +20 | `auth_verifications.status = 'approved'` |
| **Activity** (V2) | | |
| Rooms hosted (>5) | +5 | `rooms` table count |
| Rooms hosted (>20) | +10 | `rooms` table count |
| Messages sent (>50) | +5 | `messages` table count |
| Community created | +10 | `communities` table count |
| **Social** (V2) | | |
| Has followers (>10) | +5 | `follows` table count |
| Has followers (>100) | +10 | `follows` table count |

**Maximum V1 score: 100** (calibrated so a complete, verified profile hits 100)

### Trust Levels

| Score | Level | Badge |
|---|---|---|
| 0–19 | Member | — |
| 20–39 | Active Member | — |
| 40–59 | Contributor | — |
| 60–79 | Verified Contributor | ✓ |
| 80–100 | Trusted Leader | ✓✓ |

---

## PERSISTENCE MODEL

### Schema additions to `profiles` table

```sql
ALTER TABLE profiles ADD COLUMN trust_score   integer NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN trust_level   text    NOT NULL DEFAULT 'Member';
ALTER TABLE profiles ADD COLUMN trust_computed_at timestamptz;

-- Trust score change log (for transparency)
CREATE TABLE profile_trust_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  delta       integer NOT NULL,           -- +10, -5 etc.
  signal      text NOT NULL,              -- "avatar_uploaded", "verification_approved"
  score_after integer NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON profile_trust_events(user_id, created_at DESC);
```

### Computation Function (Supabase RPC)

```sql
CREATE OR REPLACE FUNCTION compute_trust_score(p_user_id uuid)
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  v_score integer := 0;
  v_profile profiles%ROWTYPE;
  v_phone_verified boolean;
  v_email_verified boolean;
  v_verified boolean;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  -- Identity signals
  IF v_profile.display_name IS NOT NULL THEN v_score := v_score + 5; END IF;
  IF v_profile.avatar_url   IS NOT NULL THEN v_score := v_score + 10; END IF;
  IF v_profile.bio          IS NOT NULL THEN v_score := v_score + 10; END IF;
  IF v_profile.country      IS NOT NULL THEN v_score := v_score + 10; END IF;
  IF v_profile.state_id     IS NOT NULL THEN v_score := v_score + 3; END IF;
  IF v_profile.lga_id       IS NOT NULL THEN v_score := v_score + 2; END IF;
  IF jsonb_array_length(COALESCE(v_profile.interests::jsonb, '[]')) >= 3
    THEN v_score := v_score + 5; END IF;

  -- Auth signals (from auth_users metadata)
  SELECT
    (metadata->>'phone_verified')::boolean,
    (metadata->>'email_verified')::boolean
  INTO v_phone_verified, v_email_verified
  FROM auth_users WHERE id = p_user_id;

  IF v_phone_verified THEN v_score := v_score + 10; END IF;
  IF v_email_verified THEN v_score := v_score + 5; END IF;

  -- Verification signal
  SELECT EXISTS(
    SELECT 1 FROM auth_verifications
    WHERE user_id = p_user_id AND status = 'approved'
  ) INTO v_verified;
  IF v_verified THEN v_score := v_score + 20; END IF;

  RETURN LEAST(v_score, 100);
END;
$$;
```

### Update Triggers

Trust score is recomputed (via Supabase trigger or Worker event) when:
- User updates their profile (avatar, bio, interests, region)
- Verification status changes to `approved`
- Phone/email verification completed

```sql
CREATE OR REPLACE FUNCTION refresh_trust_score()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE profiles SET
    trust_score = compute_trust_score(NEW.id),
    trust_computed_at = now()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_refresh_trust_on_profile_update
  AFTER UPDATE ON profiles FOR EACH ROW
  EXECUTE FUNCTION refresh_trust_score();
```

---

## IDENTITY GRAPH

### What it is

The Identity Graph maps relationships between RALD users based on real interaction signals. It is the foundation for:
- "People you may know" suggestions
- Community trust weighting
- Future BBC (BBC = RALD's AI reputation system) input signals

### Connection Types

```typescript
type ConnectionType =
  | "contact"       // Phone number mutual match
  | "followed"      // A follows B
  | "mutual"        // A and B follow each other
  | "roommate"      // Shared ≥3 room sessions
  | "messenger"     // Active DM thread
  | "community"     // Shared community member
```

### Connection Score Formula (from graph.ts)

```
connection_score = 
  (shared_rooms × 2)      +
  (shared_dm_threads × 3) +
  (contact_match × 5)     +
  (mutual_follow × 10)    +
  (shared_community × 1)
```

Capped at 100 per pair.

### BBC Foundation Signal

The BBC system (future) will consume:
- Trust scores as a credibility weight
- Connection graph as a social proof layer
- Verification status as identity confidence
- Activity signals as behavioral indicators

**Constraint:** BBC must never read raw trust_events or connection_edges directly. It must consume only the `trust_score`, `trust_level`, and verified connection graph via a stable API. The internal computation remains opaque to prevent gaming.

---

## VERIFICATION TYPES (from verification-engine.ts)

```typescript
type VerificationType =
  | "artist"      // Verified music artist
  | "label"       // Record label
  | "radio"       // Radio station
  | "advertiser"  // Brand / agency
  | "media_house" // Media organization
  | "community"   // Community organizer
```

Each type grants a `+20` trust score boost and a verified badge. Future types can be added by inserting new rows in a `verification_types` reference table.

---

## API ENDPOINTS (FULL SPEC)

```
GET  /profiles/me                    — includes trust_score, trust_level ✅ (once migrated)
GET  /trust/score/:userId            — public trust score for any user
GET  /trust/events/:userId           — trust score change history (own account only)
GET  /graph/me                       — connection list ✅ built
GET  /graph/mutual/:userId           — mutual connections ✅ built
GET  /graph/score/:userId            — connection score ✅ built
POST /trust/recompute                — admin: force recompute for a user
GET  /roles/me                       — current user's role + capabilities ✅ built
GET  /roles/all                      — full role matrix ✅ built
GET  /verify/status                  — verification status ✅ built
POST /verify/apply                   — submit verification application ✅ built
```

---

## IMPLEMENTATION PRIORITY

| Item | Sprint | Effort |
|---|---|---|
| Add `trust_score`, `trust_level` columns to `profiles` | Sprint 2 | 0.5 day |
| `compute_trust_score()` Supabase function | Sprint 2 | 1 day |
| Trigger: recompute on profile update | Sprint 2 | 0.5 day |
| `profile_trust_events` table | Sprint 2 | 0.5 day |
| Remove client-side trust computation from Loop | Sprint 2 | 0.5 day |
| Verification +20 point grant on approval | Sprint 2 | 0.5 day |
| V2: Room-hosting and follower count signals | Sprint 4 | 2 days |
| BBC input API (stable contract) | Sprint 5+ | TBD |

---

*TRUST_GRAPH_SPEC.md — LILCKY STUDIO LIMITED | 2026-06-09*
