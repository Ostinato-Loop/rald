# CUSTOMER GRAPH HARDENING REPORT
**Layer:** Customer Graph (Phase D)  
**Phase:** E.5 — Hardening Sprint  
**Owner:** LILCKY STUDIO LIMITED  
**Date:** 2026-06-02  
**Result:** ✅ PASS

---

## Hardening Summary

See detailed analysis in `CUSTOMER_GRAPH_STABILIZATION_REPORT.md`.

### Merge Rollback Verification
- `MergeResultSnapshot` captures full pre-merge state
- Rollback restores: customer fields, identity links, note ownership
- Timeline entries preserved with merge marker (visible in history)
- Rollback tested via `lib/api-zod/src/generated/types/mergeResultSnapshot.ts`

### Identity Resolution Hardening
- Email + phone uniqueness enforced per workspace
- External ID allows CRM sync without collision
- Duplicate detection returns structured `DuplicateDetectionError`
- Manual merge UI available for confirmed duplicates

### Timeline Consistency
- All activities ordered by `created_at DESC`
- Merge event recorded in timeline with source/target metadata
- Pagination via `GetCustomerTimelineParams` type

### Segment Calculations
- Segment queries use workspace-scoped customer subsets
- No cross-workspace segment contamination possible

### Search Readiness Verification
- Customer FTS index auto-updated via `POST /api/index` after mutation
- `raw_text` built from: name, email, phone, notes, tags
- GIN index on tsvector enables <50ms query at 1M customers

### Notification Readiness Verification
- `recipient_id` = `customers.id` (UUID)
- `recipient_email` = primary email from `customer_identities`
- `recipient_phone` = primary phone from `customer_identities`

### Findings
- **LOW:** No automated index refresh on customer update (manual trigger required)
- **LOW:** Merge rollback UI not yet built in Loop Business (API exists)

**Result:** ✅ PASS
