# LOAD_TEST_REPORT.md
**Phase:** G.9 — Pre-Production Certification  
**Workstream:** 6 — Load & Performance Testing  
**Owner:** LILCKY STUDIO LIMITED  
**Date:** 2026-06-02  
**Evidence Source:** GitHub — Architecture analysis only. No live load test performed.

> **IMPORTANT:** Live load testing requires test environment credentials and load testing infrastructure (k6, Artillery, Grafana). This report is an architectural capacity assessment based on infrastructure configuration, code patterns, and platform capabilities. Actual load testing must be performed against staging before production launch.

---

## INFRASTRUCTURE CAPACITY BASELINE

### Cloudflare Workers (rald-auth-core, loop, messenger)
- **Concurrency:** CF Workers handle millions of requests/day per zone. No fixed concurrency limit (scales automatically).
- **CPU per request:** 50ms CPU time (free plan), 30s wall-clock (paid)
- **Memory:** 128MB per worker instance
- **Cold start:** 0ms (V8 isolates, no cold start)
- **Supabase PostgREST:** Bottleneck — shared database connection pool

### Supabase Project (`onxdcikfttdmnhofsuwo`)
- **Plan:** Unknown (not readable from GitHub). Assuming Free/Pro.
- **PostgreSQL connections:** Free: ~60 direct connections. Pro: ~200+
- **PostgREST connections:** Pooled via PgBouncer on Pro
- **Read replicas:** Not configured (no evidence)

---

## ESTIMATED PERFORMANCE — LOGIN LATENCY

### rald-auth-core `POST /auth/login`

**Code path:**
1. Parse + validate request body — <1ms
2. Supabase query: `SELECT * FROM auth_users WHERE email=?` — 20-50ms (indexed)
3. PBKDF2 password verification — 20-100ms (100k iterations, CPU-bound)
4. `signJwt()` — <1ms (Web Crypto, fast)
5. `auth_sessions.insert()` — 10-20ms (non-blocking fallback on error)

**Estimated p50 latency:** 50-170ms  
**Estimated p99 latency:** 200-400ms (PBKDF2 variance)

**At 100 concurrent logins:** CF Worker CPU budget is 50ms. PBKDF2 at 100k iterations consumes ~50-100ms CPU. This may hit the CPU limit on the free/standard plan.

**FINDING (HIGH — WS6-F1):** PBKDF2 with 100,000 iterations is correct security practice but may exceed CF Workers' 50ms CPU budget under load. This will cause intermittent 503 "Worker exceeded CPU limit" errors at scale. **Mitigation:** Reduce to 10,000 iterations (still secure for bcrypt-equivalent) or move to CF Workers Paid plan (no CPU limit).

---

## ESTIMATED PERFORMANCE — OTP LATENCY

### `POST /auth/send-otp`

**Code path:**
1. Validate phone — <1ms
2. Termii API call: `fetch('https://api.ng.termii.com/...')` — 200-1000ms (external, Africa network)

**Estimated p50:** 300-600ms  
**Estimated p99:** 1000-2000ms (Termii + African carrier routing)

At 100 concurrent OTP sends: Termii rate limits apply (plan-dependent). If Termii rate limit is hit, requests queue or return 429.

---

## ESTIMATED PERFORMANCE — MESSAGE LATENCY

### Messenger `POST /conversations/:id/messages`

**Code path:**
1. JWT validation — <5ms
2. Workspace middleware — <1ms
3. Conversation access check (Supabase) — 10-20ms
4. Message insert (Supabase) — 10-20ms
5. Conversation `last_message_at` update — 10-20ms
6. `notifyNewMessage()` — non-blocking (fire and forget)
7. `indexMessage()` — non-blocking (fire and forget)
8. Audit log write — non-blocking

**Estimated p50:** 40-80ms  
**Estimated p99:** 100-200ms

---

## SIMULATED USER LOAD ANALYSIS

### 100 Users (Campus Pilot Target)

| Operation | Requests/min | CF Workers | Supabase | Assessment |
|---|---|---|---|---|
| Login (OTP send) | ~20 | ✅ Trivial | ✅ Fine | PASS |
| Login (OTP verify) | ~20 | ✅ Trivial | ✅ Fine | PASS |
| Message send | ~200 | ✅ Trivial | ✅ Fine | PASS |
| Room join | ~40 | ✅ Trivial | ✅ Fine | PASS |

**100 users:** No degradation expected. Well within CF Workers + Supabase Free tier limits.

### 500 Users

| Operation | Requests/min | CF Workers | Supabase | Assessment |
|---|---|---|---|---|
| Login peak (all at once) | ~200 | ⚠️ PBKDF2 CPU | ⚠️ Connection pool | WARNING |
| Message send | ~1000 | ✅ Fine | ⚠️ Connection pool | WARNING |
| Concurrent auth | 500 concurrent | ⚠️ CPU budget | ⚠️ 60 connections | WARNING |

**500 users:** Risk of PBKDF2 CPU overrun and Supabase connection pool exhaustion (Free tier ~60 connections). Supabase Pro + PgBouncer pooler recommended.

### 1,000 Users

| Operation | Requests/min | CF Workers | Supabase | Assessment |
|---|---|---|---|---|
| Auth peak | ~400 concurrent | ❌ CPU overrun likely | ❌ Connection exhaustion | FAIL |
| Messaging | ~5000/min | ✅ CF scales | ❌ DB bottleneck | FAIL |

**1,000 users:** Requires: (a) Supabase Pro + PgBouncer, (b) PBKDF2 iteration reduction or CF Paid plan, (c) potentially read replicas.

---

## PERFORMANCE TARGETS ASSESSMENT

| Target | 100 Users | 500 Users | 1000 Users |
|---|---|---|---|
| No critical degradation | ✅ | ⚠️ | ❌ |
| No service crashes | ✅ | ✅ | ⚠️ |
| Login <500ms p99 | ✅ | ⚠️ | ❌ |
| Message send <200ms p99 | ✅ | ✅ | ⚠️ |
| OTP delivery <2s p99 | ✅ | ✅ | ⚠️ |

---

## FINDINGS

| ID | Severity | Finding |
|---|---|---|
| WS6-F1 | HIGH | PBKDF2 100k iterations may exceed CF Workers 50ms CPU budget under concurrent login load |
| WS6-F2 | HIGH | No live load test performed — architectural analysis only. Actual performance unknown. |
| WS6-F3 | HIGH | Supabase connection pool (Free ~60 connections) will be exhausted at 500+ concurrent users |
| WS6-F4 | MEDIUM | No performance monitoring or alerting configured (rald-observability has no source code) |
| WS6-F5 | MEDIUM | Termii latency to Nigerian carriers (200-1000ms) is outside ecosystem control |

---

## CERTIFICATION DECISION

```
╔══════════════════════════════════════════════╗
║  WS6 — LOAD & PERFORMANCE TESTING           ║
║  CRITICAL: 0  HIGH: 3  MEDIUM: 2  LOW: 0   ║
║  DECISION: ❌  FAIL                          ║
║                                             ║
║  100 users: PASS (architectural analysis)   ║
║  500 users: WARNING                         ║
║  1000 users: FAIL                           ║
║                                             ║
║  No live load test performed.               ║
║  Live test required before public launch.   ║
╚══════════════════════════════════════════════╝
```

LILCKY STUDIO LIMITED — RALD G.9 Certification | 2026-06-02
