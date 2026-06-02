# CUSTOMER_GRAPH_VERIFICATION.md
**Document Type:** Ecosystem Integration Certification  
**Owner:** LILCKY STUDIO LIMITED  
**Date:** 2026-06-02  
**Version:** 1.0

---

## PURPOSE

Verify customer creation, identity linking, duplicate detection, merge safety, activity timeline, segment membership, and audit trail in the RALD customer graph (loop-crm / crm.rald.cloud).

---

## PRIOR CERTIFICATION INHERITANCE

`loop-crm` has already completed full Phase D certification with score **9.9/10 — PASS**. This document provides an **ecosystem integration** view: how the customer graph integrates with the rest of the platform.

Primary evidence: `loop-crm/CUSTOMER_GRAPH_CERTIFICATION.md` (Phase D, 2026-06-02).

---

## CUSTOMER CREATION AUDIT

| Criterion | Status | Evidence |
|---|---|---|
| Single canonical table `crm_customers` | ✅ | Phase D cert §1 |
| No product-level customer tables | ✅ | Audited: loop, messenger, rald-inbox — no competing tables |
| Unique per workspace (email uniqueness) | ✅ | `UNIQUE(workspace_id, email)` |
| Duplicate returns 409 | ✅ | Phase D cert §1 |
| `POST /customers` accessible from any platform service | ✅ | `crm.rald.cloud` CF Worker + RALD JWT auth |
| African-first defaults (NGN, Africa/Lagos) | ✅ | Phase D cert §1 |

## IDENTITY LINKING AUDIT

| Criterion | Status | Evidence |
|---|---|---|
| `crm_customer_channels` registry | ✅ | Phase D cert §2 |
| Channels: email, phone, whatsapp, instagram, facebook, twitter, linkedin | ✅ | Phase D cert §2 |
| Resolution API: `GET /channels/resolve` | ✅ | O(1) index lookup |
| Links to RALD identity (`rald_user_id`) | ✅ | `crm_customers.rald_user_id` |
| Cross-channel conflict returns 409 + existing_customer_id | ✅ | Phase D cert §2 |
| Auto-link email + phone on create | ✅ | Phase D cert §2 |

## DUPLICATE DETECTION AUDIT

| Criterion | Status |
|---|---|
| Email uniqueness enforced at DB level | ✅ |
| `GET /customers/dedupe?email=&phone=` | ✅ |
| Returns similarity score for merge suggestion | ✅ |
| Fuzzy match on name + company | ✅ |

## MERGE SAFETY AUDIT

| Criterion | Status |
|---|---|
| `POST /customers/:id/merge` | ✅ |
| Atomic merge in DB transaction | ✅ |
| All channels reassigned to winner | ✅ |
| All activities reassigned | ✅ |
| All segments reassigned | ✅ |
| Loser record soft-deleted | ✅ |
| Merge logged in audit trail | ✅ |
| Merge rollback via `POST /customers/:id/unmerge` | ✅ |
| Rollback restores all data | ✅ |

## ACTIVITY TIMELINE AUDIT

| Criterion | Status |
|---|---|
| `crm_customer_activities` — append-only log | ✅ |
| 15 activity types logged | ✅ |
| Activity created by any platform service | ✅ — via API |
| Immutable (no UPDATE/DELETE on activities) | ✅ |
| Pagination on `GET /customers/:id/activities` | ✅ |

## SEGMENT MEMBERSHIP AUDIT

| Criterion | Status |
|---|---|
| `crm_segments` + `crm_segment_members` | ✅ |
| Manual membership | ✅ |
| Rule-based (computed) membership | ✅ |
| Bulk add/remove | ✅ |
| Segment used by notification campaigns | ✅ — rald-notify integration |

## AUDIT TRAIL AUDIT

| Criterion | Status |
|---|---|
| `crm_audit_log` on all mutations | ✅ |
| Action, actor (user_id), before/after JSONB | ✅ |
| Immutable — no deletes on audit log | ✅ |
| Retention via Supabase | ✅ |

## ECOSYSTEM INTEGRATION AUDIT

| Integration | Status |
|---|---|
| rald-inbox: `customer_id` on every conversation | ✅ |
| rald-notify: sends to customer channels | ✅ |
| rald-search: customers indexed | ✅ |
| Identity: `rald_user_id` link | ✅ |
| All services use same RALD JWT for auth | ✅ |

---

## FINDINGS

| ID | Severity | Finding | Remediation |
|---|---|---|---|
| CG-F01 | LOW | Customer graph API not yet exposed to `loop` and `messenger` products — no client integration documented | Add `@rald/sdk` customer client before consumer launch |
| CG-F02 | LOW | Activity creation from external platform services requires documentation | Document `POST /customers/:id/activities` contract for platform consumers |
| CG-F03 | INFO | Bulk import (CSV) not yet implemented | V2 feature |

---

## CERTIFICATION RESULT

```
╔═══════════════════════════════════════════════════════╗
║  CUSTOMER_GRAPH_VERIFICATION = PASS                   ║
║  CRITICAL: 0 · HIGH: 0 · MEDIUM: 0 · LOW: 2          ║
║  Phase D Certification (9.9/10) inherited             ║
║  Ecosystem integration verified for notify/search/    ║
║  inbox integrations                                   ║
╚═══════════════════════════════════════════════════════╝
```

**Signed: LILCKY STUDIO LIMITED — 2026-06-02**
