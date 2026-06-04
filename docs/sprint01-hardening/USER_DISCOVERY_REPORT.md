# User Discovery Report
**Sprint:** Production Readiness & Foundation Hardening
**Date:** 2026-06-04
**Author:** LILCKY STUDIO LIMITED — Engineering
**Status:** ✅ FUNCTIONAL — phone + username search added

---

## Scope

How users find other users across Loop and Messenger.

---

## Messenger Discovery (Revised After Fix)

### /search/related — Relationship-First Search

**Algorithm (3-step cascade):**

| Step | Source | Query | Score |
|------|--------|-------|-------|
| 1a | `messenger_conversation_members` + `messenger_user_profiles` | Existing DM partners | +10 |
| 1b | `messenger_conversation_members` + `messenger_user_profiles` | Shared group members | +5 |
| 2 | `messenger_user_profiles` | `display_name ilike %q%` | +1 |
| 3 (NEW) | `profiles` | `username ilike %q%` OR `phone ilike %q%` OR `display_name ilike %q%` | +1 |

**Fix applied:** Step 3 was missing. Users could only be found by display_name in `messenger_user_profiles`. Users who hadn't opened Messenger yet (no `messenger_user_profiles` row) were invisible even if their phone number was in the `profiles` table.

### /users/search

Searches `profiles` table directly for:
- `username ilike %q%`
- `display_name ilike %q%`
- `phone ilike %q%`

Returns `mapProfile()` shape including avatar, bio, verification status.

---

## Loop Discovery

| Feature | Status | Notes |
|---------|--------|-------|
| Trending rooms | ✅ | /api/trending |
| Room search by name | 🔴 | Not implemented |
| User search | 🔴 | Not implemented in Loop |
| Explore by interest/tag | 🔴 | Not implemented |
| Graph-based suggestions | 🔴 | /graph/suggestions in rald-auth-core (scaffolded) |

**Gap:** Loop has no user-to-user discovery. Users can only find rooms, not people.

---

## Cross-App Discovery

| Scenario | Status |
|----------|--------|
| Loop user discovers Messenger contacts | 🟡 Via openMessenger() but no pre-populated contact list |
| Messenger user finds Loop profile | 🔴 Not implemented |
| RALD Profiles as central directory | ✅ /profiles/* in rald-auth-core; /users/search queries it |

---

## Recommendations

1. **Add phone-number search to Loop** — allow searching by phone number from Loop's social graph (critical for WhatsApp-replacement narrative)
2. **Sync `messenger_user_profiles` from `profiles`** — trigger/webhook to keep messenger_user_profiles.display_name in sync with profiles.display_name
3. **Add Loop `/api/users/search`** — re-use profiles table to find users for DM initiation from Loop
4. **Implement `/graph/suggestions`** in rald-auth-core — mutual connection suggestions (scaffolded but empty)
