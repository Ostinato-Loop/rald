# DEVELOPER CLOUD ARCHITECTURE
**RALD Ecosystem Finalization Program — Phase 9**
**Date:** 2026-06-13 | **Status:** SPECIFICATION

---

## Mission

Build the RALD Developer Cloud — the platform that lets external developers build on top of the RALD ecosystem. The developer cloud is the API, SDK, dashboard, sandbox, and marketplace in one unified surface.

---

## Products in the Developer Cloud

```
RALD Developer Cloud (developer.rald.cloud)
├── GitRald          → git hosting + CI/CD for RALD-native apps
├── API Gateway      → unified access to all RALD APIs
├── SDK Hub          → official SDKs (JS, Python, Go, Swift, Kotlin)
├── Sandbox          → isolated test environment with fake users/data
├── Marketplace      → publish and monetize apps on the RALD platform
├── Webhooks         → real-time event delivery to developer endpoints
└── Analytics        → usage metrics, error rates, latency per endpoint
```

---

## API Gateway

All external developer API calls route through `api.rald.cloud`:

```
api.rald.cloud/v1/identity/*    → rald-auth-core
api.rald.cloud/v1/loop/*        → loop-api-worker
api.rald.cloud/v1/alia/*        → rald-routing (ALIA routing engine)
api.rald.cloud/v1/pay/*         → payrald-worker
api.rald.cloud/v1/messenger/*   → messenger-worker
api.rald.cloud/v1/tradeos/*     → tradeos-worker
api.rald.cloud/v1/events/*      → event-bus-worker (webhooks)
```

### Gateway Responsibilities
- API key authentication (for server-to-server)
- OAuth 2.0 token authentication (for user-delegated access)
- Rate limiting per tier
- Request logging for audit
- Circuit breaking on upstream failures
- Response caching where appropriate

---

## Developer Tiers

| Tier | Rate Limit | Sandbox | Support | Price |
|------|-----------|---------|---------|-------|
| Free | 1,000 req/day | Shared | Community | Free |
| Starter | 50,000 req/day | Dedicated | Email | ₦5,000/mo |
| Pro | 500,000 req/day | Dedicated | Priority | ₦25,000/mo |
| Team | 5M req/day | Dedicated | SLA | ₦100,000/mo |
| Enterprise | Unlimited | Custom | Dedicated | Custom |

Trust gate for production access: `trust_score ≥ 40` (contributor level)

---

## API Key System

```typescript
interface APIKey {
  id:           string;          // public key id (shown to user)
  secret_hash:  string;          // bcrypt hash of secret (never stored plaintext)
  user_id:      string;
  name:         string;          // human name e.g. "Production server"
  scopes:       string[];        // which API sections this key can access
  tier:         DeveloperTier;
  environment:  "sandbox" | "production";
  created_at:   string;
  last_used_at: string | null;
  expires_at:   string | null;
  revoked_at:   string | null;
  allowed_ips:  string[];        // optional IP allowlist
}
```

Keys are prefixed by environment:
- `rald_live_...` — production keys
- `rald_test_...` — sandbox keys

---

## Sandbox Environment

The sandbox is a fully isolated instance of all RALD APIs:

```
sandbox.rald.cloud/v1/identity/*
sandbox.rald.cloud/v1/loop/*
sandbox.rald.cloud/v1/alia/*    → mock ALIA (fast, deterministic responses)
sandbox.rald.cloud/v1/pay/*     → fake money (test transactions only)
```

Sandbox features:
- Pre-seeded test users (100 synthetic users with varied trust scores)
- Test OTP always: `000000`
- Test transactions never touch real money
- Sandbox state resets every 24 hours (or on-demand via `DELETE /sandbox/reset`)
- Webhooks fire to registered test endpoints

---

## SDK Architecture

```
@rald/sdk (core) — framework-agnostic
  ├── @rald/sdk-react       → React hooks
  ├── @rald/sdk-react-native → Expo/React Native
  ├── @rald/sdk-js          → Vanilla JS / Node.js
  ├── @rald/sdk-python      → Python
  └── @rald/sdk-go          → Go

Core SDK responsibilities:
- API key management
- OAuth token lifecycle (auto-refresh)
- Typed request/response models
- Error normalization
- Retry with exponential backoff
- Event listener for webhooks (in Node.js)
```

---

## Marketplace

Developers can publish apps to the RALD Marketplace:

```
App Submission → Review (automated + manual) → Published
  ├── Required: OAuth scopes declared
  ├── Required: Privacy policy URL
  ├── Required: developer.trust_score ≥ 40
  ├── Required: sandbox testing passed
  └── Optional: RALD-verified badge (manual review)
```

Monetization options:
- Free apps
- One-time purchase
- Subscription (monthly/annual)
- Usage-based billing via PayRald

---

## GitRald

```
gitrald.com / git.rald.cloud
├── Git hosting (HTTP + SSH)
├── Web UI (repository browser, diffs, issues, PRs)
├── CI/CD (RALD Actions — similar to GitHub Actions)
│   └── Workers-native deploy: push to main → auto-deploy to Cloudflare
├── Package registry (npm-compatible)
└── Integration: auto-provision API keys on repo creation
```

---

## Developer Onboarding Journey

```
1. Sign in with RALD Account (trust_score ≥ 25 required)
2. Enable developer mode (profiles.rald.cloud → Developer tab)
3. Create first app
4. Get sandbox API key automatically
5. Browse API docs (developer.rald.cloud/docs)
6. Build in sandbox → test with synthetic users
7. Submit for production access (trust_score ≥ 40)
8. Receive production API key
9. Publish to marketplace (optional)
```

---

*See also: MACHINE_IDENTITY_STANDARD.md, ALIA_CONSENT_ENGINE.md*
