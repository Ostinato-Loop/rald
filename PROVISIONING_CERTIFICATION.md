# PROVISIONING_CERTIFICATION
**Document Type:** Identity Platform Certification  
**Owner:** LILCKY STUDIO LIMITED  
**Phase:** RALD Identity Platform V2  
**Date:** 2026-06-03  
**Version:** 2.0  
**Certification Level:** PASS

---

## EXECUTIVE SUMMARY

This document certifies the Universal App Provisioning Service. Authenticated RALD users are never redirected to onboarding when entering a new application. Missing local records are created automatically and silently.

**Verdict:** ✅ CERTIFIED — CRITICAL: 0 · HIGH: 0

---

## CORE RULE

> Authenticated RALD users are **never redirected to onboarding**.  
> If a local app record does not exist, it is created automatically.  
> The user enters the application without interruption.

---

## PROVISIONING FLOW

```
User (authenticated, has RALD master token) enters any RALD app
  │
  ▼
App checks local records (e.g. no messenger_users row for this user)
  │
  ▼
App calls POST auth.rald.cloud/provision/app  { app_id: "messenger" }
  Authorization: Bearer <master_token>
  │
  ▼
Provisioning Service:
  1. Upsert auth_product_access (user_id, product, role: "user")
  2. Upsert auth_user_profiles (creates default preferences)
  3. Append app_id to provisioned_apps array [idempotent]
  4. Non-blocking: write auth_login_history event
  5. Non-blocking: write audit log
  │
  ▼
Response: { ok: true, provisioned: true, app_id, role, message }
  │
  ▼
User is in the application — zero onboarding, zero redirect
```

**Idempotent:** Calling `/provision/app` for an already-provisioned app is safe and returns immediately.

---

## ENDPOINT CERTIFICATION

| Endpoint | Method | Auth | Description | Status |
|---|---|---|---|---|
| `/provision/app` | POST | Bearer (any user) | Self-service silent provisioning | ✅ |
| `/provision/status` | GET | Bearer | List provisioning status across all 8 apps | ✅ |
| `/provision/user` | POST | Bearer (admin only) | Admin-provisioned user product access | ✅ |
| `/provision/user/:userId/products` | GET | Bearer (admin only) | List a user's provisioned products | ✅ |

---

## APP PROVISIONING MATRIX

| App | App ID | Auto-provision? | CRM Link | Default Role |
|---|---|---|---|---|
| Profile Hub | `profiles` | ✅ | No (identity layer) | user |
| Loop | `loop` | ✅ | Via customer_id | user |
| Messenger | `messenger` | ✅ | Via customer_id | user |
| Unified Inbox | `rald-inbox` | ✅ | Via customer_id | user |
| PayRald | `payrald` | ✅ | Via customer_id | user |
| DunaRald | `dunarald` | ✅ | Via customer_id | user |
| GitRald | `gitrald` | ✅ | No (developer tool) | user |
| Raldtics | `raldtics` | ✅ | Via workspace_id | user |

---

## DATABASE TABLES

### `auth_product_access` (existing)
| Column | Type | Notes |
|---|---|---|
| user_id | UUID FK → auth_users | |
| product | TEXT | App ID |
| role | TEXT | "user" / "merchant" / "admin" |
| granted_at | TIMESTAMPTZ | Auto-set on provision |
| UNIQUE | (user_id, product) | Upsert-safe |

### `auth_user_profiles` (V2 — new)
| Column | Type | Notes |
|---|---|---|
| user_id | UUID UNIQUE FK | 1:1 with auth_users |
| display_name | TEXT ≤80 | |
| avatar_url | TEXT ≤500 | |
| bio | TEXT ≤300 | |
| preferences | JSONB | Default: `{}` |
| provisioned_apps | TEXT[] | Auto-appended on provision |

### `auth_login_history` (V2 — new)
| Column | Type | Notes |
|---|---|---|
| user_id | UUID | |
| app_id | TEXT | App being entered |
| ip_address | TEXT | |
| success | BOOLEAN | |
| created_at | TIMESTAMPTZ | |

---

## FINDINGS

### CRITICAL (0) — None
### HIGH (0) — None
### MEDIUM (1)
| ID | Finding |
|---|---|
| PROV-M01 | CRM customer linking is non-blocking (fire-and-forget); CRM unavailability does not block provisioning — however, customer_id linkage may be delayed |

**Mitigation:** CRM link is best-effort at provision time. Full customer graph integrity is verified by loop-crm's own reconciliation job.

### LOW (1)
| ID | Finding |
|---|---|
| PROV-L01 | `provision_app_append` PG function is called via RPC; if the function doesn't exist on a fresh DB, the append is silently skipped (migration must run before production use) |

---

## CERTIFICATION DECISION

```
╔═══════════════════════════════════════════╗
║  APP PROVISIONING — CERTIFIED ✅          ║
║  CRITICAL: 0 · HIGH: 0 · MEDIUM: 1      ║
║  Version: 2.0 — 2026-06-03               ║
╚═══════════════════════════════════════════╝
```

**Signed:** LILCKY STUDIO LIMITED — 2026-06-03
