# SEARCH_CERTIFICATION.md
**Document Type:** Ecosystem Integration Certification  
**Owner:** LILCKY STUDIO LIMITED  
**Date:** 2026-06-02  
**Version:** 1.0

---

## PURPOSE

Verify search indexing, workspace isolation, permissions, query performance, and reindex behaviour across the RALD ecosystem via rald-search (search.rald.cloud).

---

## PRIOR CERTIFICATION INHERITANCE

`rald-search` has completed Phase E certification — **PASS** (2026-06-02).  
Primary evidence: `rald-search/SEARCH_CERTIFICATION.md`

---

## DEPLOYMENT VERIFICATION

| Criterion | Status | Evidence |
|---|---|---|
| CF Worker deployed (search.rald.cloud) | ✅ | `wrangler.toml` — `pattern = "search.rald.cloud/*"` |
| GitHub → push to main → auto-deploy | ✅ | `.github/workflows/deploy.yml` |
| Observability enabled | ✅ | `[observability] enabled = true` |
| Default provider: Postgres FTS | ✅ | `SEARCH_PROVIDER = "postgres"` |

---

## INDEXING AUDIT

| Entity | Index Table | Status |
|---|---|---|
| Customers | `search_index_customers` | ✅ LIVE |
| Customer Notes | `search_index_customer_notes` | ✅ LIVE |
| Customer Activities | `search_index_customer_activities` | ✅ LIVE |
| Segments | `search_index_segments` | ✅ LIVE |
| Workspaces | `search_index_workspaces` | ✅ LIVE |
| Users | `search_index_users` | ✅ LIVE |
| Notifications | `search_index_notifications` | ✅ LIVE |
| Templates | `search_index_templates` | ✅ LIVE |
| Conversations | PLANNED Phase F | 🔵 |
| Messages | PLANNED Phase F | 🔵 |

---

## WORKSPACE ISOLATION AUDIT

| Criterion | Status |
|---|---|
| `workspace_id` enforced on every index | ✅ |
| Every query filtered by caller's workspace | ✅ |
| Cross-workspace data not returned | ✅ |
| JWT workspace_id validated before query | ✅ |

---

## PERMISSIONS AUDIT

| Criterion | Status |
|---|---|
| RALD JWT required on all endpoints | ✅ |
| Role-based result filtering | ✅ |
| Admin searches all within workspace | ✅ |
| Member searches within visibility rules | ✅ |
| Saved searches scoped per user | ✅ |

---

## QUERY PERFORMANCE AUDIT

| Criterion | Status |
|---|---|
| GIN index on tsvector columns | ✅ |
| Pagination (page + limit) | ✅ |
| Result count returned | ✅ |
| Minimal payload GET variant for low-bandwidth | ✅ — African-first |
| p95 target < 200ms (Postgres FTS) | ✅ — per Phase E cert |
| Provider abstraction (zero code change to switch) | ✅ |

---

## REINDEX AUDIT

| Criterion | Status |
|---|---|
| `POST /reindex` endpoint (admin-only) | ✅ |
| Full reindex rebuilds all tsvectors | ✅ |
| Partial reindex by entity type | ✅ |
| Reindex progress tracked | ✅ |
| Zero-downtime reindex | ✅ |

---

## ECOSYSTEM INTEGRATION AUDIT

| Integration | Status |
|---|---|
| rald-inbox uses rald-search for conversation FTS | ✅ — search vector on conversations.subject |
| loop-crm customers indexed in rald-search | ✅ |
| All callers auth via RALD JWT | ✅ |

---

## FINDINGS

| ID | Severity | Finding | Remediation |
|---|---|---|---|
| SC-F01 | MEDIUM | KV namespace `RATE_LIMIT_KV` ID is a placeholder — rate limiting inactive | Create KV namespace; update wrangler.toml |
| SC-F02 | LOW | Conversations + messages not yet indexed — inbox search is limited to subject FTS | Complete Phase F conversation indexing |
| SC-F03 | INFO | Meilisearch/OpenSearch providers implemented but untested in production | Run provider integration tests before switching |

---

## CERTIFICATION RESULT

```
╔═══════════════════════════════════════════════════════════╗
║  SEARCH_CERTIFICATION = PASS WITH MITIGATIONS             ║
║  CRITICAL: 0 · HIGH: 0 · MEDIUM: 1 · LOW: 1              ║
║  Phase E cert inherited — 8 entity types indexed          ║
║  KV namespace placeholder must be replaced pre-launch     ║
╚═══════════════════════════════════════════════════════════╝
```

**Signed: LILCKY STUDIO LIMITED — 2026-06-02**
