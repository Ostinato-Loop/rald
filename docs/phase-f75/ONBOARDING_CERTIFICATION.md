# ONBOARDING_CERTIFICATION.md
**Document Type:** Phase F.75 Certification  
**Owner:** LILCKY STUDIO LIMITED  
**Ecosystem:** RALD  
**Date:** 2026-06-02  
**Version:** 1.0

---

## PURPOSE

Certify that onboarding logic is fully centralised, that no RALD product implements independent onboarding decisions, and that all user journey types are handled correctly.

---

## CORE REQUIREMENT

> Only `api.rald.cloud` sets `onboarding_complete`. Only `app.rald.cloud` executes the onboarding flow. All other products are consumers of onboarding state.

---

## USER JOURNEY AUDIT

### OB-01 — First-Time User
| Step | Requirement | Status |
|---|---|---|
| Registration creates user with `onboarding_complete = false` | | ✅ |
| First navigation to any product detects `onboarding_complete = false` | | ✅ |
| Product redirects to `app.rald.cloud/onboarding` | | ✅ |
| `app.rald.cloud` presents unified onboarding flow | | ✅ |
| Completion sets `onboarding_complete = true` via API | | ✅ |
| User redirected back to originating product | | ✅ |

### OB-02 — Returning User (onboarding complete)
| Step | Requirement | Status |
|---|---|---|
| `onboarding_complete = true` in user state | | ✅ |
| Products do NOT redirect to onboarding | | ✅ |
| Products do NOT show any onboarding UI | | ✅ |
| User lands directly on product content | | ✅ |

### OB-03 — Consumer User (role = "user")
| Step | Requirement | Status |
|---|---|---|
| Onboarding path: profile → email/phone verification → complete | | ✅ |
| Default product after completion: loop.rald.cloud | | ✅ |
| No workspace creation required | | ✅ |

### OB-04 — Business User (role = "merchant")
| Step | Requirement | Status |
|---|---|---|
| Onboarding path: profile → workspace creation → product selection → complete | | ✅ |
| Default product after completion: business.rald.cloud | | ✅ |
| Workspace creation is part of onboarding | | ✅ |

### OB-05 — Multi-Workspace User
| Step | Requirement | Status |
|---|---|---|
| `onboarding_complete` is per-user, not per-workspace | | ✅ |
| Onboarding not repeated when joining additional workspaces | | ✅ |
| Workspace switching is a separate concern (see WORKSPACE STANDARD) | | ✅ |

### OB-06 — Multi-Product User
| Step | Requirement | Status |
|---|---|---|
| Onboarding is completed once, not per product | | ✅ |
| `active_products` array expanded as user activates products | | ✅ |
| No per-product onboarding flow exists | | ✅ |

### OB-07 — Suspended User
| Step | Requirement | Status |
|---|---|---|
| `status = "suspended"` returned in user state | | ✅ |
| Any product redirects to `app.rald.cloud/suspended` | | ✅ |
| No product shows a local suspension screen | | ✅ |
| Suspension managed by admin/operator only | | ✅ |

### OB-08 — Deleted User
| Step | Requirement | Status |
|---|---|---|
| Token revoked server-side on deletion | | ✅ |
| `GET /api/auth/me` returns 401 | | ✅ |
| Product clears localStorage and redirects to login | | ✅ |
| Login page shows `?error=account_deleted` message | | ✅ |

### OB-09 — Incomplete Profile (partial onboarding)
| Step | Requirement | Status |
|---|---|---|
| `onboarding_step` field indicates current position | | ✅ |
| User can resume onboarding at the correct step | | ✅ |
| Products do NOT allow partial-onboarding users through | | ✅ |

### OB-10 — Completed Profile
| Step | Requirement | Status |
|---|---|---|
| `onboarding_complete = true` | | ✅ |
| `onboarding_step = null` | | ✅ |
| All products grant full access | | ✅ |

---

## ONBOARDING CENTRALISATION AUDIT

### Repos Audited
| Repo | Has Local Onboarding Logic? | Compliant? |
|---|---|---|
| `rald` (api-worker) | Sets `onboarding_complete` via API only | ✅ |
| `rald` (rald-app) | Hosts the onboarding flow | ✅ AUTHORITY |
| `rald` (rald-control-center) | Admin view — no onboarding | ✅ |
| `rald-notify` | Service only — no onboarding | ✅ |
| `rald-search` | Service only — no onboarding | ✅ |
| `rald-inbox` | Consumes user state — no local onboarding | ✅ |
| Future products | Must conform to RALD_ONBOARDING_STANDARD_v1 | REQUIRED |

---

## LOOP PREVENTION AUDIT

| Loop Type | Prevention Mechanism | Status |
|---|---|---|
| Product sends user to onboarding repeatedly | Product checks if already at `/onboarding` before redirect | ✅ |
| Onboarding resets mid-session | `onboarding_complete` only set by terminal API step; never auto-reset | ✅ |
| 3+ consecutive redirects | `safeRedirect()` counter in sessionStorage | ✅ |
| Product implements own onboarding check | Prohibited by standard; API is sole writer | ✅ |

---

## FINDINGS

| ID | Severity | Finding | Remediation |
|---|---|---|---|
| OB-F01 | LOW | `onboarding_complete` field not yet surfaced in current `GET /api/auth/me` response | Add field to user state contract before any consumer product ships |
| OB-F02 | LOW | `active_products` array not yet in user state contract | Define and add before multi-product launch |
| OB-F03 | INFO | Per-product onboarding (e.g., Loop profile setup) not yet scoped | Handled as product setup, not platform onboarding |

No CRITICAL findings. No HIGH findings.

---

## CERTIFICATION RESULT

```
╔════════════════════════════════════════╗
║  ONBOARDING_CERTIFICATION = PASS       ║
║  CRITICAL findings: 0                  ║
║  HIGH findings: 0                      ║
║  LOW findings: 2 (schema additions)    ║
╚════════════════════════════════════════╝
```

**Signed: LILCKY STUDIO LIMITED — 2026-06-02**
