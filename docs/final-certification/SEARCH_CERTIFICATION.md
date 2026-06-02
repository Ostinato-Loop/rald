# SEARCH_CERTIFICATION.md
**Certification Type:** Phase G Final Authorization  
**Service:** rald-search — search.rald.cloud  
**Phase:** E (inherited) + G Pre-check  
**Owner:** LILCKY STUDIO LIMITED  
**Date:** 2026-06-02

---

## 1. PRIOR CERTIFICATION

Phase E: **PASS** (rald-search/SEARCH_CERTIFICATION.md, 2026-06-02)  
This re-certifies for Phase G pre-launch status.

---

## 2. DEPLOYMENT HEALTH

| Criterion | Evidence | Status |
|---|---|---|
| CF Worker deployed (search.rald.cloud) | `wrangler.toml pattern = "search.rald.cloud/*"` | ✅ |
| GitHub → push main → auto-deploy | `deploy.yml on push:main` | ✅ |
| Default provider: Postgres FTS | `SEARCH_PROVIDER = "postgres"` in vars | ✅ |
| Observability enabled | `[observability] enabled = true` | ✅ |
| Latest commit: 2026-06-02 (wrangler fix + CI) | `git log` | ✅ |

---

## 3. PROVIDER ABSTRACTION

| Provider | Status | Activation |
|---|---|---|
| Postgres FTS (GIN-indexed tsvector) | ✅ DEFAULT | `SEARCH_PROVIDER=postgres` |
| Meilisearch | ✅ IMPLEMENTED | `SEARCH_PROVIDER=meilisearch` + API keys |
| OpenSearch | ✅ IMPLEMENTED | `SEARCH_PROVIDER=opensearch` + API keys |

Zero code changes to switch providers. `SearchProvider` interface is the contract. ✅

---

## 4. INDEXED ENTITIES (LIVE)

| Entity | Index Table | Status |
|---|---|---|
| Customers | `search_index_customers` | ✅ |
| Customer Notes | `search_index_customer_notes` | ✅ |
| Customer Activities | `search_index_customer_activities` | ✅ |
| Segments | `search_index_segments` | ✅ |
| Workspaces | `search_index_workspaces` | ✅ |
| Users | `search_index_users` | ✅ |
| Notifications | `search_index_notifications` | ✅ |
| Templates | `search_index_templates` | ✅ |
| Conversations (Phase G) | PLANNED | 🔵 |
| Messages (Phase G) | PLANNED | 🔵 |

---

## 5. WORKSPACE ISOLATION

`workspace_id` enforced on every search index and query. JWT workspace claim is authoritative. Phase E cert confirmed no cross-workspace results returned. ✅

---

## 6. PERFORMANCE

| Criterion | Status |
|---|---|
| GIN index on tsvector | ✅ |
| p95 < 200ms (Postgres FTS at current scale) | ✅ (per Phase E cert) |
| Pagination (page + limit) | ✅ |
| Minimal payload GET variant | ✅ (African-first bandwidth optimisation) |
| Saved searches | ✅ |
| Recent search history | ✅ |

---

## 7. FINDINGS

| ID | Severity | Root Cause | Repo | Service | Evidence | Fix | Effort | Verify |
|---|---|---|---|---|---|---|---|---|
| SRC-F01 | **MEDIUM** | KV namespace `RATE_LIMIT_KV` placeholder ID — rate limiting NOT active | rald-search | search.rald.cloud | `id = "placeholder-replace-with-actual-kv-id"` | Create real CF KV namespace; update wrangler.toml; push to GitHub | 2h | `wrangler kv:namespace list` shows real ID; 429 response under load |
| SRC-F02 | LOW | Conversations and messages not yet indexed — inbox search limited to subject FTS only | rald-search | search.rald.cloud | Only 8 entity types indexed; inbox does FTS on subject field locally | Complete Phase G conversation indexing sprint | 2 days | `GET /search?q=hello&entity=conversations` returns results |
| SRC-F03 | INFO | Meilisearch/OpenSearch providers untested under production load | rald-search | search.rald.cloud | Implemented but no prod test | Run load test before switching providers | 1 day | Provider switch: p95 < 100ms under 100 concurrent queries |

---

## 8. CERTIFICATION RESULT

```
╔═══════════════════════════════════════════════════════════════════╗
║  SEARCH_CERTIFICATION = PASS WITH MITIGATIONS                     ║
║  CRITICAL: 0 · HIGH: 0 · MEDIUM: 1 · LOW: 1 · INFO: 1           ║
║  Phase E cert inherited · 8 entity types indexed                  ║
║  KV namespace must be replaced before scaling                     ║
╚═══════════════════════════════════════════════════════════════════╝
```

**Signed: LILCKY STUDIO LIMITED — 2026-06-02**
