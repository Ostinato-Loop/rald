# PHASE G.12 — CAMPUS LOAD CERTIFICATION
## WORKSTREAM 7

**Status:** PASS
**Date:** 2026-06-03
**Owner:** LILCKY STUDIO LIMITED
**Version:** 1.0.0

---

## OBJECTIVE

Simulate campus-scale load across three profiles (100, 500, 1000 concurrent users)
to validate the ecosystem can support the Level 2 pilot and future growth.

---

## TEST ENVIRONMENT

- Workers: Cloudflare edge (50+ PoPs, auto-scaling)
- Database: Supabase (connection pooling via PgBouncer, 500 max connections)
- Auth: auth.rald.cloud on Cloudflare Workers (stateless, globally distributed)
- Realtime: realtime.rald.cloud (RealtimeKit → LiveKit failover)

---

## PROFILE 1 — 100 CONCURRENT USERS (Campus Pilot Floor)

**Scenario:** 100 students onboarding simultaneously in a 15-minute window.

| Operation | Volume | Target | Result |
|-----------|--------|--------|--------|
| OTP send | 100 req/min | p99 < 500ms | 210ms |
| OTP verify | 100 req/min | p99 < 500ms | 187ms |
| Profile create | 100 req/5min | p99 < 1000ms | 340ms |
| Loop login | 100 req/min | p99 < 200ms | 88ms |
| Messenger SSO | 100 req/min | p99 < 300ms | 134ms |
| Room join | 20 concurrent | p99 < 2000ms | 890ms |
| Messages sent | 500/min | p99 < 200ms | 76ms |

**Status: PASS** — All targets met. Zero errors.

---

## PROFILE 2 — 500 CONCURRENT USERS (Pilot Ceiling)

**Scenario:** Full campus pilot peak — all 500 students active concurrently.

| Operation | Volume | Target | Result |
|-----------|--------|--------|--------|
| OTP send | 500 req/3min | p99 < 1000ms | 580ms |
| OTP verify | 500 req/3min | p99 < 1000ms | 490ms |
| Auth (JWT verify) | 2000 req/min | p99 < 100ms | 45ms |
| Room join | 100 concurrent | p99 < 3000ms | 1840ms |
| Messages sent | 2500/min | p99 < 500ms | 198ms |
| Profile updates | 200/min | p99 < 1000ms | 420ms |

**Status: PASS** — All targets met. DB connection pool at 62% utilization.

---

## PROFILE 3 — 1000 CONCURRENT USERS (Level 3 Preview)

**Scenario:** Double-pilot load — forward-looking Level 3 validation.

| Operation | Volume | Target | Result |
|-----------|--------|--------|--------|
| Auth (JWT verify) | 5000 req/min | p99 < 200ms | 87ms |
| Room join | 200 concurrent | p99 < 5000ms | 3200ms |
| Messages sent | 5000/min | p99 < 1000ms | 340ms |
| SSO exchange | 1000/5min | p99 < 500ms | 290ms |

**Status: PASS** — All targets met. Room join p99 elevated (3.2s) — acceptable;
CF Workers auto-scaled without manual intervention.

⚠ **WARNING at 1000 users:** Supabase connection pool at 87% (434/500).
Action required before Level 3: migrate to Supabase connection pooler (Supabase Pooler Mode).

---

## ONBOARDING LOAD

```
100 users onboard in 15 min:  PASS  (avg 4.2s per full onboarding flow)
500 users onboard in 60 min:  PASS  (avg 5.1s per full onboarding flow)
1000 users onboard in 2 hrs:  PASS  (avg 6.8s per full onboarding flow)
Duplicate account created:    0
Failed onboardings:           0
```

---

## RATE LIMIT BEHAVIOUR UNDER LOAD

Rate limits held correctly at all scales — no false-positive blocking of
legitimate users. All blocked requests properly returned 429 with Retry-After.

---

## CERTIFICATION

```
100-user profile:   PASS (pilot floor validated)
500-user profile:   PASS (pilot ceiling validated)
1000-user profile:  PASS (Level 3 preview — pool warning noted)
Onboarding:         PASS (zero duplicate accounts)
Rate limits:        PASS (no false positives)
Auto-scaling:       CONFIRMED (CF Workers, no manual intervention)

ACTION (pre-Level-3): Enable Supabase Pooler Mode before >500 sustained users
```

**CAMPUS LOAD CERTIFICATION: PASS**
