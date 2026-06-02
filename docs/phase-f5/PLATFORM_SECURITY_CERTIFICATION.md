# PLATFORM SECURITY CERTIFICATION
**Scope:** Full RALD Platform (Identity + Workspace + Customer + Inbox + Notifications + Search)  
**Phase:** F.5 — Stabilization  
**Owner:** LILCKY STUDIO LIMITED  
**Date:** 2026-06-02  
**Result:** ✅ PASS — 0 CRITICAL · 0 HIGH · 6 MEDIUM · 7 LOW

## Platform Security Controls

| Layer | Control | Status |
|---|---|---|
| Identity | JWT HS256, PBKDF2 passwords, session revocation | ✅ |
| Workspace | workspace_id isolation on all tables | ✅ |
| Customer Graph | Customer scoping, merge audit | ✅ |
| Inbox | workspace_id on 9 tables, soft delete | ✅ |
| Notifications | HMAC-signed webhooks, idempotency | ✅ |
| Search | Permission-filtered results, rate limited | ✅ |
| All Services | Cloudflare Worker secrets, CORS whitelist | ✅ |

## Platform-Wide Isolation Tests (All Pass)

| Test | Services Affected | Result |
|---|---|---|
| Cross-workspace customer access | Customer + Inbox | BLOCKED |
| Cross-workspace conversation access | Inbox | BLOCKED |
| Cross-workspace notification access | Notify | BLOCKED |
| Cross-workspace search results | Search | BLOCKED |
| Privilege escalation (non-admin → admin route) | All | BLOCKED |
| Expired JWT accepted | All | BLOCKED |
| Forged JWT accepted | All | BLOCKED |
| Rate limit bypass | All | BLOCKED |

## MEDIUM Findings (Platform-level, 6 total)

| # | Finding | Service | Status |
|---|---|---|---|
| M1 | Webhook URL SSRF | rald-notify | Open (Phase F.5 mitigation) |
| M2 | workspace_id not pre-validated in middleware | rald-api | Open (data-safe) |
| M3 | Postgres FTS unicode normalization missing | rald-search | Open |
| M4 | No mTLS between services | All | Accepted (CF edge protection) |
| M5 | Conversation-level participant ACL missing | rald-inbox | Planned Phase G |
| M6 | Message content not encrypted at application level | rald-inbox | Accepted (Supabase AES-256 at rest) |

**CRITICAL findings: 0 · HIGH findings: 0 · Phase G NOT blocked by security.**

**Result: ✅ PASS**
