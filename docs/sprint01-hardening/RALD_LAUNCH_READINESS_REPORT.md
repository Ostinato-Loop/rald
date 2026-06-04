# RALD Ecosystem Launch Readiness Report
**Sprint:** Production Readiness & Foundation Hardening
**Date:** 2026-06-04
**Author:** LILCKY STUDIO LIMITED — Engineering

---

## Overall Status: 🟡 CONDITIONAL GO

The RALD ecosystem is functional and safe to launch for beta users. Core authentication, messaging, and content flows work end-to-end. Critical data-correctness bugs have been fixed. Structural gaps (push notifications, onboarding, social graph) are documented and must be resolved before general availability.

---

## Service Readiness

| Service | URL | Status | Notes |
|---------|-----|--------|-------|
| rald-auth-core | auth.rald.cloud | ✅ GO | v2.2.0; all critical fixes applied |
| loop-messenger-api | messenger.rald.cloud | ✅ GO | v1.2.0; profile data fix applied |
| loop-api | loop.rald.cloud | ✅ GO | auth/me fix applied; real data |
| profiles (UI) | profiles.rald.cloud | ✅ GO | Identity hub; SSO source |
| rald-control-center | control.rald.cloud | 🟡 BETA | Admin UI functional |
| rald-marketing | rald.cloud | 🟡 BETA | Marketing site |
| sv.rald.cloud | — | 🔴 NO GO | No frontend. No backend. Domain only. |

---

## Critical Path Items

### RESOLVED (Sprint 01 + 01-H)

| Item | Resolution |
|------|-----------|
| D-009: WIZMAC not maintained | ✅ D-012 added Sprint 01 |
| D-010: /sso/silent dead code | ✅ Fixed Sprint 01 |
| D-011: rald-auth-core not pushed | ✅ Pushed Sprint 01 |
| D-012: Messenger SSO Step 3 | ✅ Fixed Sprint 01 |
| I-005: Messenger cross-app nav | ✅ Fixed Sprint 01 |
| I-006: Loop had mock data | ✅ Fixed Sprint 01 |
| I-007: Loop me-launch mock data | ✅ Fixed Sprint 01 |
| SEC-001: Hardcoded JWT fallback | ✅ Fixed Sprint 01-H |
| SEC-003: Loop /auth/me wrong secret | ✅ Fixed Sprint 01-H |
| Messenger /auth/me: null profile | ✅ Fixed Sprint 01-H |
| Loop me-launch: hardcoded RALD ID | ✅ Fixed Sprint 01-H |
| Messenger search: no phone/username | ✅ Fixed Sprint 01-H |
| sv.rald.cloud missing from CORS | ✅ Fixed Sprint 01-H (Messenger + Loop) |

### OPEN — Must Fix Before GA

| ID | Item | Severity | ETA |
|----|------|----------|-----|
| GA-001 | Push notifications | 🔴 P0 | Sprint 02 |
| GA-002 | Onboarding flow | 🔴 P0 | Sprint 02 |
| GA-003 | Avatar upload | 🟠 P1 | Sprint 02 |
| GA-004 | Require display name at signup | 🟠 P1 | Sprint 02 |
| GA-005 | Social graph (follows) | 🟠 P1 | Sprint 03 |

### OPEN — Nice-to-Have Before GA

| ID | Item |
|----|------|
| GA-NTH-001 | Typing indicators in Messenger |
| GA-NTH-002 | Message delivery status in UI |
| GA-NTH-003 | Room search in Loop |
| GA-NTH-004 | Group discovery in Messenger |
| GA-NTH-005 | `/sso/logout` endpoint in rald-auth-core |

---

## sv.rald.cloud — Launch Blocker Assessment

**Status:** 🔴 NO GO — missing product
**Root cause:** `sv.rald.cloud` is referenced in CORS configurations across rald-auth-core but no frontend or backend code exists for this domain.
**Scope:** This is a new product (Streaming Video) — outside the "no new products" constraint of this sprint.
**Recommendation:** Remove `sv.rald.cloud` from active CORS lists or add a placeholder 404 service until the product is built. Do not advertise this URL.
**Risk:** Any external link to sv.rald.cloud results in a blank page or CORS error. Users who find this URL will have a broken experience.

---

## Infrastructure Readiness

| Check | Status |
|-------|--------|
| All workers have fail-fast (503 on missing secrets) | ✅ |
| All workers have /health endpoint | ✅ |
| JWT secrets use 64-char base64url minimum | ✅ (RALD_JWT_SECRET) |
| CORS covers all ecosystem domains | ✅ |
| Rate limiting on OTP send | ✅ (5/hr/phone via KV) |
| Supabase service-role key isolated per worker | ✅ |
| No hardcoded secrets in code | ✅ (fixed SEC-001) |

---

## Go/No-Go Decision

**Recommended decision: CONDITIONAL GO for BETA**

The platform is safe, functional, and honest (real data, no mocks). Proceed with a controlled beta of 100–500 users while Sprint 02 (push + onboarding) is completed. Do not launch to the general public until GA-001 and GA-002 are resolved — retention will be too low to sustain growth.
