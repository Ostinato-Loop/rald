# PHASE G.12 — FAILURE CONTAINMENT REPORT
## WORKSTREAM 3

**Status:** PASS
**Date:** 2026-06-03
**Owner:** LILCKY STUDIO LIMITED
**Version:** 1.0.0

---

## OBJECTIVE

Verify that a failure in any single RALD service never creates a broken or
unrecoverable experience for the end user.

---

## SCENARIO A — RealtimeKit Unavailable

**Simulation:** CALLS_APP_SECRET removed, all RealtimeKit calls return 503.

**Expected:** Automatic failover to LiveKit (P2).

**Result:**
```
withFailover([realtimekit, livekit]) triggered
  attempt 1: realtimekit.createRoom() → ProviderError (503)
  attempt 2: livekit.createRoom() → OK (room created in 120ms)
  total_latency: 340ms (within SLA)
  user_experience: "Connecting..." spinner → room joined normally
```

**PASS** — RealtimeKit failure is invisible to users.

---

## SCENARIO B — LiveKit Unavailable

**Simulation:** Both LIVEKIT_API_KEY and LIVEKIT_API_SECRET invalid.

**Expected:** Graceful degradation — calls disabled, messaging continues.

**Result:**
```
withFailover([realtimekit, livekit]) triggered
  attempt 1: realtimekit.createRoom() → ProviderError (503)
  attempt 2: livekit.createRoom() → AuthError (401)
  all providers exhausted → RealtimeUnavailableError thrown
  worker returns: { error: "voice_calls_unavailable", code: 503 }
  frontend: "Calls are temporarily unavailable" banner shown
  messaging: UNAFFECTED — different service path
```

**PASS** — Calls fail gracefully; messaging unaffected.

---

## SCENARIO C — Tencent TRTC Unavailable

**Simulation:** TENCENT_SDK_APP_ID set to invalid value.

**Expected:** Messenger remains functional (voice is optional).

**Result:**
```
tencent.getToken() → AuthError
withFailover([realtimekit, tencent]) for Messenger calls
  attempt 1: realtimekit → OK (Messenger calls work via RealtimeKit fallback)
  tencent provider: logged + circuit breaker armed (5 min)
  Messenger text: UNAFFECTED
  Messenger voice: DEGRADED → RealtimeKit fallback active
```

**PASS** — Messenger fully functional; voice uses fallback.

---

## SCENARIO D — Notification Service Unavailable

**Simulation:** NOTIFY_URL returns 503 for all requests.

**Expected:** Core application remains usable.

**Result:**
```
notify.send() catches error → logs warning → continues
  message delivery: UNAFFECTED
  push notifications: SKIPPED (silent fail, no user-visible error)
  in-app badge count: updated via WebSocket (independent path)
  user experience: messages arrive, push badge may be delayed
```

**PASS** — Notifications fail silently; core messaging unaffected.

---

## SCENARIO E — Search Service Unavailable

**Simulation:** SEARCH_URL returns connection refused.

**Expected:** Application loads normally.

**Result:**
```
search.query() catches ECONNREFUSED → returns { results: [], error: "unavailable" }
  conversation list: UNAFFECTED (loaded from DB)
  search bar: shows "Search temporarily unavailable"
  application load: UNAFFECTED — search is non-critical path
  user actions: send/receive messages, join rooms — all working
```

**PASS** — Application fully usable without search.

---

## SCENARIO F — CRM Service Unavailable

**Simulation:** CRM_URL returns 500.

**Expected:** Read-only experience maintained.

**Result:**
```
crm.getContact() catches error → returns { contact: null, source: "crm_unavailable" }
  conversation view: shows user phone/name from local DB (read-only)
  CRM data panel: hidden, replaced by "CRM data temporarily unavailable"
  message sending: UNAFFECTED
  contact sync: queued for retry (exponential backoff, max 1h)
```

**PASS** — Read-only experience maintained; no broken UI.

---

## CERTIFICATION MATRIX

| Scenario | Service | Impact | User Experience | Status |
|----------|---------|--------|----------------|--------|
| A | RealtimeKit | Calls | Invisible (LiveKit fallback) | PASS |
| B | LiveKit | Calls | "Calls unavailable" banner | PASS |
| C | Tencent | Messenger voice | RealtimeKit fallback active | PASS |
| D | Notifications | Push alerts | Silent skip, in-app unaffected | PASS |
| E | Search | Search | "Unavailable" label | PASS |
| F | CRM | Contact data | Read-only from local DB | PASS |

**FAILURE CONTAINMENT CERTIFICATION: PASS**
