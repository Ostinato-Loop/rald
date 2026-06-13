# ALIA_SDK_EXTRACTION_PLAN.md
# RALD ALIA — SDK Extraction Plan
**Audit Date:** 2026-06-13

---

## PROBLEM

JWT verification code exists in 6+ places:
- ALIA `identity-service/src/middleware/authenticate.ts`
- ALIA `gateway/src/middleware/authenticate.ts`
- RALD `rald-auth-core`
- RALD `rald-identity/src/middleware/`
- RALD `rald-realtime/src/middleware/`
- RALD `rald-control-center/src/middleware/`
- RALD `rald-search/src/middleware/`

Machine auth middleware exists in 3+ places.

shadcn/ui duplicated across 6+ RALD frontend repos.

Result: security fix applied to one copy doesn't reach others. This is how vulnerabilities persist.

---

## SDK PLAN

### SDK 1: `@rald/auth-sdk`

**Purpose:** Single JWT verification implementation for all RALD/ALIA services.

**Source:** Extract from ALIA `gateway/src/middleware/authenticate.ts` and `identity-service/src/routes/auth.ts`.

**Package location:** `packages/auth-sdk/` in `Ostinato-Loop/rald-alia`

```typescript
// @rald/auth-sdk exports:

// JWT
export function signJwt(payload: object, secret: string, expiresIn: string): string;
export function verifyJwt(token: string, secret: string): Promise<JwtPayload | null>;
export function signRefreshToken(userId: string, secret: string): string;
export function verifyRefreshToken(token: string, secret: string): Promise<{ sub: string } | null>;

// OTP
export function generateOtp(): string;
export function hashOtp(otp: string): string;
export function verifyOtp(otp: string, hash: string): boolean;

// Password
export function hashPassword(password: string): Promise<string>;
export function verifyPassword(password: string, hash: string): Promise<boolean>;

// Middleware (Express + Hono variants)
export function expressAuthenticate(): ExpressMiddleware;
export function honoAuthenticate(): HonoMiddleware;

// Helpers
export function extractBearerToken(authHeader: string | undefined): string | null;
export function getClientIp(req: Request): string;

// Types
export interface JwtPayload { sub: string; email?: string; role?: string; iat: number; exp: number; }
```

**Replaces:**
- RALD: `rald-auth-core/src/lib/jwt.ts` (copy-pasted into 5 services)
- ALIA: `gateway/src/middleware/authenticate.ts`, `identity-service` JWT helpers

**Services that consume:**
- All 13 ALIA services
- All RALD product Cloudflare Workers

---

### SDK 2: `@rald/machine-sdk`

**Purpose:** Service-to-service machine JWT authentication. Eliminates X-Internal-Secret.

**Source:** New — based on design from `rald-auth-core` machine_identity migration.

**Package location:** `packages/machine-sdk/` in `Ostinato-Loop/rald-alia`

```typescript
// @rald/machine-sdk exports:

// Token management
export async function getMachineToken(opts: {
  clientId: string;
  clientSecret: string;
  authEndpoint: string;  // https://api.alia.rald.cloud/v1/machine/auth
}): Promise<MachineToken>;

export function cacheMachineToken(token: MachineToken): void;
export function getCachedToken(clientId: string): MachineToken | null;

// Verification (used by receiving services)
export async function verifyMachineToken(token: string, secret: string): Promise<MachinePayload | null>;

// Middleware (Express + Hono variants)
export function expressMachineAuth(requiredScope?: string): ExpressMiddleware;
export function honoMachineAuth(requiredScope?: string): HonoMiddleware;

// Types
export interface MachineToken {
  token: string;
  expires_at: string;
  scopes: string[];
}

export interface MachinePayload {
  type: 'machine';
  machine_id: string;
  service_name: string;
  scopes: string[];
  allowed_services: string[];
  iat: number;
  exp: number;
}
```

**Replaces:**
- `X-Internal-Secret` header in all RALD workers
- Manual machine auth in `rald-auth-core`

**Services that consume:**
- All 13 ALIA services (internal routes)
- All RALD products calling ALIA

---

### SDK 3: `@rald/routing-sdk`

**Purpose:** Alias resolution client. Products call this instead of building resolution logic.

**Source:** Extracted from ALIA `resolution-engine` client surface.

**Package location:** `packages/routing-sdk/` in `Ostinato-Loop/rald-alia`

```typescript
// @rald/routing-sdk exports:

// Resolution
export async function resolveAlias(opts: {
  identifier: string;           // "@username", "email@...", "+234..."
  type?: AliasType;             // optional hint
  initiatingBank?: string;
  transactionRef?: string;
  endpoint: string;             // ALIA resolution-engine URL
  machineToken: string;         // @rald/machine-sdk token
}): Promise<ResolveResult>;

// Token verification
export async function verifyRoutingToken(opts: {
  token: string;
  endpoint: string;
  machineToken: string;
}): Promise<RoutingTokenPayload | null>;

// Types
export type AliasType = 'email' | 'phone' | 'username' | 'business_handle';

export interface ResolveResult {
  resolved: boolean;
  routing_token?: string;
  public_hint?: string;          // "Zenith Bank" — safe to display
  identity_type?: AliasType;
  latency_ms: number;
  resolution_id: string;
  expires_at?: string;
  error?: string;
}

export interface RoutingTokenPayload {
  valid: boolean;
  account_token?: string;         // Only returned to verified institutions
  destination_bank_code?: string;
  account_name?: string;
}
```

**Replaces:**
- Any RALD product attempting to implement alias resolution internally
- The partially-built `rald-routing` Cloudflare Worker

**Services that consume:**
- `payrald` — calls resolveAlias before every payment
- `loop` — calls resolveAlias to find user messaging handles
- `tradeos` — merchant resolution
- Any future product that needs to route to a user/business

---

### SDK 4: `@rald/ui` (Future)

**Purpose:** Shared UI component library for all RALD + ALIA frontends.

**Source:** Extract from ALIA `frontend/packages/ui` + merge shadcn/ui copies from 6 RALD repos.

```typescript
// Exports: Button, Card, Badge, Input, Stat, Table, Modal, Sidebar, Nav, Footer
```

**Replaces:**
- `frontend/packages/ui` in ALIA
- shadcn/ui copies in: loop-web, messenger-web, payrald-web, gitrald-web, raldtics-web, tradeos-web

---

## SDK PACKAGE STRUCTURE

```
Ostinato-Loop/rald-alia/
└── packages/
    ├── db/                   # Existing Drizzle ORM
    ├── kafka/                # Existing Kafka client
    ├── shared/               # Existing shared types
    ├── auth-sdk/             # NEW — JWT auth utilities
    │   ├── src/
    │   │   ├── jwt.ts        # sign/verify JWT
    │   │   ├── otp.ts        # OTP generate/hash/verify
    │   │   ├── password.ts   # bcrypt helpers
    │   │   ├── middleware/
    │   │   │   ├── express.ts
    │   │   │   └── hono.ts
    │   │   └── index.ts
    │   ├── package.json      # name: @rald/auth-sdk
    │   └── tsconfig.json
    ├── machine-sdk/          # NEW — machine identity
    │   ├── src/
    │   │   ├── token.ts
    │   │   ├── verify.ts
    │   │   ├── cache.ts
    │   │   ├── middleware/
    │   │   │   ├── express.ts
    │   │   │   └── hono.ts
    │   │   └── index.ts
    │   ├── package.json      # name: @rald/machine-sdk
    │   └── tsconfig.json
    └── routing-sdk/          # NEW — alias resolution client
        ├── src/
        │   ├── resolve.ts
        │   ├── token.ts
        │   ├── types.ts
        │   └── index.ts
        ├── package.json      # name: @rald/routing-sdk
        └── tsconfig.json
```

---

## MIGRATION SEQUENCE

**Step 1:** Build `@rald/auth-sdk` in ALIA monorepo.

**Step 2:** Update ALIA services to import from `@rald/auth-sdk` (swap authenticate.ts content for SDK import).

**Step 3:** Publish `@rald/auth-sdk` to npm (private scope or GitHub Packages).

**Step 4:** Update each RALD GitHub service to import `@rald/auth-sdk`, remove copy-pasted JWT verification.

**Step 5:** Build `@rald/machine-sdk` — release.

**Step 6:** Remove X-Internal-Secret from all RALD services. Add machine JWT.

**Step 7:** Build `@rald/routing-sdk` — release.

**Step 8:** RALD products (payrald, loop) import `@rald/routing-sdk`.

**Estimated effort:** 2 weeks for Steps 1-7.

---

## SERVICES TO MODIFY (RALD GitHub)

| Service | Change |
|---------|--------|
| rald-auth-core | Export WebAuthn/passkey logic → into ALIA. Keep as auth reference. |
| rald-identity | Remove JWT middleware → import @rald/auth-sdk |
| rald-realtime | Remove JWT middleware → import @rald/auth-sdk |
| rald-control-center | Remove JWT middleware → import @rald/auth-sdk |
| rald-search | Remove JWT middleware → import @rald/auth-sdk |
| loop | Remove identity logic → call ALIA. Import @rald/auth-sdk, @rald/routing-sdk |
| messenger | Same as loop |
| payrald | Remove routing logic → call ALIA resolution-engine. Import @rald/routing-sdk |
| gitrald | Import @rald/auth-sdk |
| raldtics | Kafka consumer for ALIA audit events. Remove local auth. |
| tradeos | Import @rald/routing-sdk for merchant resolution |
