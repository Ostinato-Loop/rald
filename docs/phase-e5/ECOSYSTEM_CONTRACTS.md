# ECOSYSTEM CONTRACTS
**Document Type:** Contract Lock — Phase E.5  
**Owner:** LILCKY STUDIO LIMITED  
**Date:** 2026-06-02  
**Status:** LOCKED

---

## Overview

This document defines all inter-service contracts within the RALD ecosystem. No undocumented contracts are permitted. Any service calling another must conform to the contracts defined here.

---

## 1. Authentication Contract

**Provider:** `api.rald.cloud` (rald-api → rald/artifacts/api-worker)

| Contract | Value |
|---|---|
| Token type | RALD JWT (HS256) |
| Header | `Authorization: Bearer <token>` |
| Signing secret | `RALD_JWT_SECRET` (shared across all services) |
| Token payload | `{ id, email, role, iat, exp }` |
| Token expiry | 24 hours (86400s) |
| Refresh token | 90-day rolling refresh (family-based rotation) |
| Algorithm | HMAC-SHA256 via Web Crypto API — no external library |
| Session storage | `sessions` table in Supabase (shared DB) |

**Consumers:** all services (`rald-notify`, `rald-search`, `rald-loop-business`, `messenger`)

**Contract rule:** Every protected route MUST validate the token against `RALD_JWT_SECRET`. Services MUST NOT issue their own tokens. `api.rald.cloud` is the sole token issuer.

---

## 2. Workspace Contract

**Provider:** `api.rald.cloud`

| Contract | Value |
|---|---|
| Workspace isolation header | `X-Workspace-ID: <uuid>` |
| Workspace table | `workspaces` (rald DB schema) |
| Membership table | `workspace_members` (rald DB schema) |
| Roles | `owner`, `admin`, `member`, `viewer` |
| Soft delete | `deleted_at` timestamp |
| Enforcement | Worker queries MUST include `workspace_id` filter |

**Contract rule:** Every multi-tenant endpoint MUST accept `X-Workspace-ID` header and enforce it at query level. No cross-workspace data access is permitted. RBAC is checked via `workspace_members.role`.

---

## 3. Customer Contract

**Provider:** `api.rald.cloud` / `rald` monorepo customer graph

| Contract | Value |
|---|---|
| Customer ID | UUID (TEXT primary key) |
| Customer table | `customers` (Drizzle schema: lib/db/src/schema/customers.ts) |
| Identity resolution | `customer_identities` table — email, phone, external_id per customer |
| Timeline | `customer_activities` table |
| Merge | `customer_merges` table (rollback-capable) |
| Notes | `customer_notes` table |
| Tags | `customer_tags` + `customer_tag_assignments` |
| Search readiness | Indexed in `rald-search` via `search_index_customers` |
| Notification readiness | `recipient_id` maps to customer UUID |

**Contract rule:** Customer records are owned by the workspace. `customer.workspace_id` is always required. The merge engine maintains rollback snapshots.

---

## 4. Notification Contract

**Provider:** `rald-notify` (notification.rald.cloud)

| Contract | Value |
|---|---|
| Base URL | `https://notification.rald.cloud` |
| Auth | RALD JWT Bearer token |
| Workspace header | `X-Workspace-ID` required |
| Create notification | `POST /api/notifications` |
| Required fields | `template_id`, `channels[]`, at least one recipient field |
| Channels | `email`, `sms`, `push`, `webhook` |
| Idempotency | `idempotency_key` field on POST |
| Response shape | `{ notification: { id, status, ... } }` |

**Contract rule:** All products MUST use `notification.rald.cloud` for delivery. No product may implement its own notification delivery. Products supply `template_id` + `context` + `recipient`.

---

## 5. Search Contract

**Provider:** `rald-search` (search.rald.cloud)

| Contract | Value |
|---|---|
| Base URL | `https://search.rald.cloud` |
| Auth | RALD JWT Bearer token |
| Workspace header | `X-Workspace-ID` required |
| Search endpoint | `POST /api/search` |
| Quick search | `GET /api/search?q=<query>&entity=<type>` |
| Entity types | `customers`, `customer_notes`, `customer_activities`, `segments`, `workspaces`, `users`, `notifications`, `templates` |
| Response shape | `{ hits: [{id, entity, data}], total, page, pages, took_ms }` |
| Index write | `POST /api/index` (admin only) |

**Contract rule:** All products MUST use `search.rald.cloud`. No product may query Supabase directly for search. Index writes happen via the indexer API after any customer/workspace mutation.

---

## 6. Audit Contract

**Provider:** Each service writes to its own audit table; cross-service audit is aggregated at the reporting layer.

| Service | Audit Table | Actions Logged |
|---|---|---|
| rald-api | `audit_logs` | auth, sessions, api-keys, orgs |
| rald-notify | `notification_audit_log` | notification, template, delivery, channel, preference |
| rald-search | `search_audit_log` | every search query |
| rald (customer graph) | `customer_audit_logs` | customer CRUD, merge, identity, notes |

**Contract rule:** Every state-changing operation MUST write an audit entry. Audit writes are best-effort (never block the main flow) but failures MUST be logged to console.

---

## 7. Permission Contract

| Role | Description | Scope |
|---|---|---|
| `admin` | Full workspace access | System + workspace |
| `operator` | Operational access (deploy, manage) | System-level only |
| `member` | Standard workspace member | Workspace |
| `viewer` | Read-only | Workspace |
| `user` | End-user (customer-facing) | Own data only |
| `merchant` | Merchant/business user | Own workspace data |

**Contract rule:** All services MUST respect this role hierarchy. No service may invent its own permission system. Role is read from the JWT payload `role` field.

---

## Contract Stability Note

All contracts in this document are LOCKED for Phase F. Any breaking change requires a new version suffix (e.g., `v2`) and backward-compatible migration path.

**Signed:** LILCKY STUDIO LIMITED — 2026-06-02
