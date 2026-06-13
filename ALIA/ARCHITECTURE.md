# RALD ALIA — ARCHITECTURE
> Audit Date: 2026-06-13 | Version: Phase 1 Foundation

## Vision

ALIA is a **Financial Identity Network** — not a bank, not a payment processor.
ALIA is the identity, trust, consent, authorization, and routing layer beneath African financial institutions.

```
Think: DNS for financial infrastructure.
```

## Current Architecture

### Runtime: Cloudflare-first
All backend services are **Cloudflare Workers** (Hono framework).
All frontends are **Cloudflare Pages** (React + Vite).
Database: **Supabase** (PostgreSQL with RLS) — single shared project.

### Authentication Pattern
```
User → profiles.rald.cloud → auth.rald.cloud
  1. Register username (POST /auth/register-username)
  2. Send OTP (SMS or Email)
  3. Verify OTP → receive JWT + rald_token
  4. rald_token appended to redirect URL
  5. Target app (loop, messenger, etc.) exchanges rald_token → session
```

### Machine-to-Machine Pattern
```
Service A → auth.rald.cloud POST /machine/auth
  → returns Machine JWT (scoped: ["events:write"])
Service A → events.rald.cloud POST /events
  Header: X-Machine-Token: <machine_jwt>
```

### Event Pattern
```
Any service → events.rald.cloud POST /events (with machine JWT)
  → event stored + fan-out to subscribers (webhook)
  → subscribers: notify, search, analytics, etc.
```

## ALIA Phase 1 Target Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    ALIA IDENTITY NETWORK                         │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   ALIA Core Gateway                       │    │
│  │              api.alia.rald.cloud (MISSING)               │    │
│  │                                                           │    │
│  │  /identity/*    /trust/*    /consent/*                   │    │
│  │  /authorize/*   /routing/*  /developer/*                 │    │
│  └──────────┬──────────────────────────────────┬────────────┘    │
│             │                                   │                  │
│  ┌──────────▼──────────┐          ┌────────────▼─────────────┐  │
│  │   IDENTITY ENGINE   │          │     TRUST ENGINE          │  │
│  │  auth.rald.cloud    │          │   (partially in auth-core)│  │
│  │                     │          │                           │  │
│  │  identity_id        │          │  trust_score              │  │
│  │  identity_type      │          │  verification_signals     │  │
│  │  verification_status│          │  device_signals           │  │
│  │  trust_status       │          │  behavior_signals         │  │
│  │  routing_status     │          │  institution_signals      │  │
│  │  country_status     │          │  WHY explanations         │  │
│  │  consent_status     │          │  audit trail              │  │
│  │                     │          └───────────────────────────┘  │
│  │  State Machine:     │                                          │
│  │  PENDING→VERIFIED   │          ┌───────────────────────────┐  │
│  │  →ACTIVE→SUSPENDED  │          │    CONSENT ENGINE         │  │
│  │  →REVOKED           │          │    (MISSING)              │  │
│  └─────────────────────┘          │                           │  │
│                                   │  grant / revoke           │  │
│  ┌──────────────────────┐         │  history / audit          │  │
│  │  AUTHORIZATION ENGINE│         │  immutable log            │  │
│  │  (partial in auth-   │         └───────────────────────────┘  │
│  │   core permissions)  │                                         │
│  │                      │         ┌───────────────────────────┐  │
│  │  single approval     │         │    ROUTING ENGINE         │  │
│  │  multi approval      │         │    (MISSING)              │  │
│  │  delegated approval  │         │                           │  │
│  │  enterprise approval │         │  username/email/phone     │  │
│  │  immutable logs      │         │  → institution            │  │
│  └──────────────────────┘         │  → secure token           │  │
│                                   │  → routing instruction    │  │
│                                   │  Target: <200ms           │  │
│                                   └───────────────────────────┘  │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                INFRASTRUCTURE LAYER                       │    │
│  │  events.rald.cloud  config.rald.cloud  notification.*   │    │
│  │  search.rald.cloud  realtime.*                           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                DATA LAYER (Supabase)                      │    │
│  │  Single PostgreSQL instance — all services share         │    │
│  │  ⚠️ Risk: no service isolation at DB layer               │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Identity Types (Required by Spec)

| Type | Status | Notes |
|------|--------|-------|
| Username | ✅ Implemented | `rald-auth-core` |
| Email | ✅ Implemented | verified OTP |
| Phone | ✅ Implemented | SMS OTP |
| Business Identity | 🔴 Missing | No business identity tables found |
| Merchant Identity | 🔴 Missing | PayRald repos are stubs |
| Developer Identity | 🟡 Partial | `developer_platform` migration exists |
| Institution Identity | 🔴 Missing | Required for ALIA routing layer |

## Identity Fields Required (per spec)

```
identity_id           ✅ exists (auth_users.id)
identity_type         🔴 MISSING — no enum, no type column
verification_status   🟡 partial (email_verified, phone_verified)
trust_status          🟡 partial (trust migration exists)
routing_status        🔴 MISSING
country_status        🟡 partial (country_configs table)
consent_status        🔴 MISSING
```

## State Machine (Required)

```
PENDING → VERIFIED → ACTIVE → SUSPENDED → REVOKED
```

Current implementation: informal. `is_active` boolean only. No formal state machine.

## Security Architecture

| Control | Required | Status |
|---------|---------|--------|
| TLS 1.3 | ✅ | CF handles |
| AES-256 | 🟡 | at rest via Supabase |
| mTLS | 🔴 | NOT IMPLEMENTED |
| RBAC | 🟡 | Partial (roles table exists) |
| ABAC | 🔴 | NOT IMPLEMENTED |
| Passkeys/WebAuthn | 🟡 | Migration exists, not fully wired |
| Tokenization | 🔴 | NOT IMPLEMENTED |
| Secret Rotation | 🟡 | Machine JWT rotation designed, not automated |
| Immutable Audit Logs | 🟡 | audit_stream exists, not immutable |
| Machine Identities | 🟡 | 60% complete |
| Zero Trust | 🟡 | Machine JWT path exists, not universal |
| HttpOnly Cookies | ✅ | cookie.ts in auth-core |
| No localStorage auth | ✅ | confirmed |
