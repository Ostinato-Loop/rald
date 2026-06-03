# RALD PLATFORM — LEVEL 2 CERTIFICATION
## PHASE G.12 FINAL DELIVERABLE

**Certification Level:** LEVEL 2 — CAMPUS PILOT AUTHORIZED
**Date:** 2026-06-03
**Owner:** LILCKY STUDIO LIMITED
**Certifier:** RALD Platform Engineering
**Version:** 2.0.0

---

## EXECUTIVE SUMMARY

All nine G.12 workstreams have passed certification. All critical and high
security findings are resolved. The RALD ecosystem is authorized for a
Level 2 Campus Pilot of up to 500 concurrent student users.

**AUTHORIZATION GRANTED: Level 2 Campus Pilot**

---

## CERTIFICATION GATE RESULTS

| Gate | Status | Certification |
|------|--------|---------------|
| Critical Findings = 0 | ✅ PASS | WS1-F2 + WS3-F1 RESOLVED in G.12 |
| High Findings = 0 | ✅ PASS | All HIGH findings resolved in G.11 |
| SSO Certification | ✅ PASS | ECOSYSTEM_SSO_CERTIFICATION_V2.md |
| Security Certification | ✅ PASS | SECURITY_HARDENING_CERTIFICATION_V3.md |
| Account Integrity | ✅ PASS | ACCOUNT_INTEGRITY_CERTIFICATION.md |
| Failure Containment | ✅ PASS | FAILURE_CONTAINMENT_REPORT.md |
| Load Certification | ✅ PASS | CAMPUS_LOAD_CERTIFICATION.md |
| Recovery Certification | ✅ PASS | PRODUCTION_RECOVERY_CERTIFICATION_V2.md |
| QA Certification | ✅ PASS | ECOSYSTEM_QA_REPORT.md |

**ALL GATES: PASS**

---

## PHASE HISTORY

| Phase | Focus | Status |
|-------|-------|--------|
| G.9 L2.1–L2.8 | Auth hardening, OTP, rate limits, audit | COMPLETE |
| G.10 | RRAL (realtime abstraction layer) | COMPLETE |
| G.11 | Ecosystem hardening & stabilization | COMPLETE |
| G.12 | User experience hardening, SSO unification | COMPLETE |

---

## CRITICAL FINDINGS — COMPLETE HISTORY

| ID | Phase | Finding | Resolution |
|----|-------|---------|-----------|
| WS1-F2 | G.9 | Loop dual-JWT (LOOP_JWT_SECRET + RALD_JWT_SECRET) | Resolved G.12: rald_master_token stored; cross-app SSO implemented |
| WS3-F1 | G.9 | Cross-app session continuity broken | Resolved G.12: Messenger /auth/rald-sso route + auth.tsx SSO callback |

---

## WHAT WAS BUILT (G.12)

### SSO Unification (WS1-F2 / WS3-F1 Resolution)

**Loop frontend (`use-auth.tsx` + `cross-app.ts`):**
- After RALD SSO callback: stores original `rald_token` as `rald_master_token`
- `openMessenger(path)` passes `?rald_token=` for seamless cross-app navigation
- `redirectToRaldAuth()` for sign-in/sign-up redirect to accounts.rald.cloud
- `signOut()` clears both `loop_token` and `rald_master_token`

**Messenger worker (`workers/loop-messenger-api/src/routes/sso.ts`):**
- `POST /auth/rald-sso` validates rald_token against auth.rald.cloud
- Upserts user in Messenger DB (deduplicates on rald_id, phone, or email)
- Returns confirmation; caller uses rald_token directly as Bearer

**Messenger auth page (`auth.tsx`):**
- Detects `?rald_token=` on mount — automatic SSO login
- "Continue with RALD account" button for new Messenger users
- Zero re-authentication required when arriving from Loop

---

## LEVEL 2 PILOT PARAMETERS

```
Scope:       messenger.rald.cloud
Users:       50–500 students
Duration:    30 days
Monitoring:  Daily metric review (login, OTP, SSO, messages, errors)
Support:     ops@rald.cloud on-call during pilot hours
Escalation:  CRITICAL finding → halt pilot within 1 hour
```

---

## LEVEL 3 PREREQUISITES (STILL BLOCKED)

Level 3 (Public Beta) requires ALL of the following:

### Technical Prerequisites (9)
1. Supabase connection pooler enabled (pool at 87% at 1000 users)
2. rald-secrets repo audited and .env files confirmed deleted
3. Loop × Messenger workspace propagation end-to-end tested
4. Push notification delivery confirmed ≥ 95% on real devices
5. Admin dashboard for monitoring pilot metrics (ops visibility)
6. Automated session cleanup job deployed and verified
7. P2 QA defects QA-006 and QA-007 resolved
8. RALD_JWT_SECRET rotation runbook rehearsed with full team
9. Legal: terms of service and privacy policy approved for campus deployment

### Pilot KPIs (6) — Must be collected during Level 2
1. Login success rate ≥ 95% (7-day rolling average)
2. OTP success rate ≥ 90% (7-day rolling average)
3. Message delivery ≥ 99% (7-day rolling average)
4. Cross-app SSO success ≥ 98% (first week)
5. Zero P0 production incidents during 30-day pilot
6. Student NPS ≥ 30 (end-of-pilot survey)

---

## AUTHORIZATION STATEMENT

This certification confirms that the RALD ecosystem meets all requirements
for a supervised campus pilot deployment. All blocking security findings
are resolved. The platform is stable, observable, and recoverable.

```
╔══════════════════════════════════════════════════════╗
║  RALD PLATFORM CERTIFICATION                         ║
║  LEVEL 2 — CAMPUS PILOT AUTHORIZED                   ║
║                                                      ║
║  Max concurrent users:   500                         ║
║  Authorized product:     messenger.rald.cloud        ║
║  Pilot duration:         30 days                     ║
║  Critical findings:      0                           ║
║  High findings:          0                           ║
║                                                      ║
║  Authorized: 2026-06-03                              ║
║  By: RALD Platform Engineering                       ║
║  Owner: LILCKY STUDIO LIMITED                        ║
╚══════════════════════════════════════════════════════╝

LEVEL 3 (Public Beta):   BLOCKED — 9 tech + 6 KPI prerequisites
PHASE H:                 BLOCKED — requires Level 3
```

---

*GitHub is the single source of truth.*
*This document was committed at the conclusion of Phase G.12.*
