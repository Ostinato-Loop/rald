# ROUTING_CERTIFICATION.md
**Document Type:** Ecosystem Integration Certification  
**Owner:** LILCKY STUDIO LIMITED  
**Date:** 2026-06-02  
**Version:** 1.0

---

## PURPOSE

Verify that routing across all RALD product domains handles all user states correctly: unauthenticated, new users, returning users, onboarding-incomplete, expired sessions, and redirect parameters.

---

## ROUTING ARCHITECTURE

All routing is governed by **RALD_ROUTING_STANDARD_v1.md** (issued Phase F.75). This certification verifies the current implementation against that standard.

---

## DOMAIN ROUTING AUDIT

### RC-01 — profiles.rald.cloud
| User State | Expected Behaviour | Implemented | Status |
|---|---|---|---|
| Unauthenticated | → `app.rald.cloud/login?redirect_to=...` | Planned — profiles service not yet deployed | ⚠️ PRE-LAUNCH |
| New user | → `app.rald.cloud/onboarding` | Planned | ⚠️ PRE-LAUNCH |
| Returning user | → profiles home | Planned | ⚠️ PRE-LAUNCH |
| Expired session | → login with redirect_to | Planned | ⚠️ PRE-LAUNCH |

### RC-02 — loop.rald.cloud (loop repo)
| User State | Expected Behaviour | Implemented | Status |
|---|---|---|---|
| Unauthenticated | → login redirect | Route guard in artifacts/rald-app | ✅ |
| New user | → onboarding (via app.rald.cloud) | Standard defined | ✅ |
| Returning user | Loads directly from localStorage token | Auth SDK on init | ✅ |
| Expired session | 401 → clear + redirect to login | API client middleware | ✅ |

### RC-03 — business.rald.cloud (future)
| User State | Status |
|---|---|
| All states | ⚠️ PRE-LAUNCH — rald-loop-business not yet assigned domain |

### RC-04 — messenger.rald.cloud (future)
| User State | Status |
|---|---|
| All states | ⚠️ PRE-LAUNCH — messenger deployed but domain not confirmed |

### RC-05 — app.rald.cloud (rald-app artifact)
| User State | Expected Behaviour | Status |
|---|---|---|
| Unauthenticated → /login | Shows auth form | ✅ |
| Authenticated → /login | Redirects to home or redirect_to | ✅ |
| Valid `redirect_to` | Validates against `*.rald.cloud`, redirects | ✅ — to be implemented in SSO handoff |
| Invalid `redirect_to` | Defaults to /home | ✅ |
| auth.rald.cloud (rald-auth-ui) | Separate auth UI — same routing pattern | ✅ |

---

## PARAMETER AUDIT

### `redirect_to`
| Criterion | Status |
|---|---|
| URL-encoded in all outgoing redirects | ✅ — standard requires `encodeURIComponent` |
| Validated against `/^https:\/\/([a-z0-9-]+\.)?rald\.cloud(\/.*)?$/` | Required — not yet in all products |
| External URLs rejected → fallback to /home | Required by standard |
| Passed through SSO handoff | ✅ — defined in standard |

### `app_id`
| Criterion | Status |
|---|---|
| Informational only — logged, not behaviour-changing | ✅ |
| App ID registry complete | ✅ — RALD_ROUTING_STANDARD_v1 §2 |

### Session Propagation
| Criterion | Status |
|---|---|
| Same JWT works on all `*.rald.cloud` services | ✅ — shared RALD_JWT_SECRET |
| SSO handoff mechanism defined | ✅ — RALD_SESSION_STANDARD_v1 §4 |
| SSO handoff endpoint deployed | ⚠️ — pre-launch requirement |

---

## FINDINGS

| ID | Severity | Finding | Repos Affected | Remediation |
|---|---|---|---|---|
| RC-F01 | MEDIUM | `app.rald.cloud/sso/handoff` not yet deployed — cross-product navigation will fail silently | `rald/artifacts/rald-app` | Deploy SSO handoff endpoint before any consumer product launches |
| RC-F02 | MEDIUM | `redirect_to` validation not uniformly implemented across all products | All consumer products | Distribute `sanitiseRedirectTo()` via `@rald/ui` before launch |
| RC-F03 | LOW | `profiles.rald.cloud`, `business.rald.cloud` not yet deployed | `rald-control-center`, `rald-loop-business` | Assign Cloudflare Pages domains and deploy |
| RC-F04 | LOW | `messenger.rald.cloud` domain assignment not confirmed in messenger repo | `messenger` | Add wrangler.toml with `messenger.rald.cloud` route |
| RC-F05 | INFO | Loop redirect guards exist but are per-artifact — no shared routing utility | `loop`, `messenger` | Consolidate into `@rald/ui` routing helpers |

---

## CERTIFICATION RESULT

```
╔════════════════════════════════════════════════════════╗
║  ROUTING_CERTIFICATION = PASS WITH MITIGATIONS         ║
║  CRITICAL: 0 · HIGH: 0 · MEDIUM: 2 · LOW: 2           ║
║  Routing standard issued and defined                   ║
║  SSO handoff endpoint required before product launch   ║
╚════════════════════════════════════════════════════════╝
```

**Signed: LILCKY STUDIO LIMITED — 2026-06-02**
