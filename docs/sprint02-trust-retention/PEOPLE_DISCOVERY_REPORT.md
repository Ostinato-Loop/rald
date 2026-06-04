# PEOPLE DISCOVERY REPORT
## Sprint 02 — Trust & Retention
**Date:** 2026-06-04  
**Auditor:** LILCKY STUDIO LIMITED  
**Priority:** 3 — Find People (highest user priority per sprint brief)  

---

## Objective

A user must be able to find another user within **30 seconds** of opening the app. This report audits the current state of people discovery across RALD products and identifies gaps.

---

## Current State by Search Vector

### ✅ Search by Username — IMPLEMENTED (Messenger)
**Endpoint:** `GET /search/related?q=...`  
**Status:** Live (Sprint 01-H fix)

The Messenger search endpoint queries the `profiles` table for:
- `username ILIKE %query%`
- `display_name ILIKE %query%`
- `phone ILIKE %query%`

Results are cross-referenced against `messenger_user_profiles` and ranked by relationship score (+10 DM, +5 group, +3 mutual). Users with no prior conversation can still be found via the profiles table.

**Gap:** Search is currently in `GET /search/related` only. No people search exists in the Loop frontend (loop.rald.cloud).

---

### ✅ Search by Display Name — IMPLEMENTED (Messenger)
**Endpoint:** `GET /search/related?q=...`  
**Status:** Live

Display name matched via `display_name ILIKE %query%` on both `messenger_user_profiles` and `profiles` tables.

---

### ✅ Search by Phone Number — IMPLEMENTED (Messenger)
**Endpoint:** `GET /search/related?q=...`  
**Status:** Live (Sprint 01-H fix)

Phone numbers matched via `phone ILIKE %query%` on the `profiles` table (Step 3 of the search cascade). This allows users who know someone's phone number to find them directly.

**Gap:** Phone number is sensitive. The API currently returns full user profiles including phone. Consider returning only masked phone (e.g. `+234***1234`) in search results.

---

### ✅ Search by Existing Connections — IMPLEMENTED (Messenger)
**Endpoint:** `GET /search/related?q=...`  
**Status:** Live

Step 1 of the search cascade: finds users in existing DM conversations (score: +10) and group conversations (score: +5).

---

### ❌ Search by Mutual Connections — NOT YET IMPLEMENTED
**Status:** Gap — planned for Sprint 03

The search route has a "Step 3 broader network (name match)" slot but no mutual connection graph query exists. To implement:
1. Query `rald_connections` (or equivalent) table for the authenticated user's connections
2. For each connection, fetch their connections (2-hop graph)
3. Score mutual connections: +3 per shared connection

**Blockers:** No `connections` table visible in current Supabase schema. This is a Sprint 03 deliverable.

---

### ❌ People Search in Loop — NOT YET IMPLEMENTED
**Status:** Gap

The Loop app (loop.rald.cloud) has no people search UI. The search button in the Feed header (`onClick={() => {}}`) is a dead button — confirmed in `feed.tsx`.

To implement: wire the search button to a search overlay that calls either:
- The Loop worker `/api/users/search?q=...` (if it exists)
- Or the Messenger `/search/related` endpoint (cross-product people lookup)

---

### ❌ Suggested People on Home Screen — NOT YET IMPLEMENTED
**Status:** Gap

After signup, there are no "People you may know" suggestions. The onboarding flow in Loop ends at "Rooms" step (step 5) with real room recommendations, but no people recommendations.

---

## 30-Second Find Test

**Can a user find another user within 30 seconds?**

| Scenario | Result | Notes |
|----------|--------|-------|
| User knows the exact username | ✅ Yes | Messenger search works |
| User knows the phone number | ✅ Yes | Messenger search works |
| User knows approximate display name | ✅ Yes | Messenger search fuzzy match |
| User wants to find someone they met in a room | ❌ No | No "people in this room" feature |
| User wants to find mutual connections | ❌ No | Mutual graph not implemented |
| User is in Loop (not Messenger) | ❌ No | No people search in Loop |

**Overall: PARTIAL** — Discovery works within Messenger for users who know a name/phone. Does not work in Loop. No mutual or proximity-based discovery.

---

## Priority Fixes for Sprint 03

| Priority | Fix | Effort |
|----------|-----|--------|
| P1 | Wire Loop search button → people search overlay | Low |
| P2 | Add "People in this room" to Loop room view | Medium |
| P3 | Implement mutual connection scoring in Messenger search | High |
| P4 | "Suggested people" on Messenger home after signup | Medium |
| P5 | Mask phone numbers in search results | Low |

---

*PEOPLE_DISCOVERY_REPORT.md — Sprint 02 Trust & Retention — LILCKY STUDIO LIMITED*
