# SEARCH HARDENING REPORT
**Service:** rald-search — search.rald.cloud  
**Phase:** E.5 — Hardening Sprint  
**Owner:** LILCKY STUDIO LIMITED  
**Date:** 2026-06-02  
**Result:** ✅ PASS

---

## Hardening Summary

See detailed analysis in `SEARCH_STABILIZATION_REPORT.md`.

### Search Accuracy (Postgres FTS)
- `plainto_tsquery('english', query)` handles multi-word queries correctly
- English dictionary for stemming (search "notifications" finds "notification")
- GIN index on `tsvector` with `WHERE deleted_at IS NULL` — only live records returned
- **Improvement (Phase F):** Add trigram index for partial-match (names like "Adeola" vs "Adeolade")

### Pagination Correctness
- `page=1, limit=20` → `RANGE 0..19`
- `totalPages = Math.ceil(total / limit)` — correct rounding
- Empty results return `{ hits: [], total: 0, page: 1, pages: 1 }`

### Filters
- `eq`, `neq`, `in` operators implemented for Postgres
- `gt`, `gte`, `lt`, `lte` defined in interface (Meilisearch/OpenSearch implement them)
- **Gap:** Postgres provider doesn't implement all filter operators — Phase F improvement

### Sorting
- Postgres: `.order(field, direction)` via Supabase client
- Meilisearch/OpenSearch: sort passed natively
- Default sort: relevance (tsvector rank)

### Permission Filtering
- All queries include `workspace_id` filter
- Deleted records excluded via `deleted_at IS NULL` partial index
- No cross-workspace results possible

### Future Meilisearch Compatibility
- Provider swap is purely operational (`SEARCH_PROVIDER=meilisearch`)
- All 3 providers implement the same `SearchProvider` interface
- API response shape identical across providers
- Meilisearch requires bulk reindex on migration (documented)

### Findings
- **MEDIUM:** Postgres FTS filter operators incomplete (gt/gte/lt/lte missing)
- **LOW:** No trigram index for partial name matching
- **LOW:** Meilisearch index management (create indexes per workspace) not automated

**Result:** ✅ PASS
