# MACHINE IDENTITY STANDARD
**RALD Ecosystem Finalization Program — Phase 11**
**Date:** 2026-06-13 | **Status:** SPECIFICATION

---

## Mission

Every RALD service that calls another RALD service must identify itself with a cryptographically verifiable machine identity. No more `X-Internal-Secret` header passing. No more hardcoded shared secrets for service-to-service auth.

---

## Problem: Current State

Services currently authenticate each other with:
```
X-Internal-Secret: <shared secret>
```

This is:
- **Brittle** — one rotation requires updating every caller simultaneously
- **Unauditable** — all services share the same identity
- **Insecure** — secret visible in logs, environment variables, deployment configs
- **Unscalable** — can't grant per-service permissions

---

## Solution: Machine JWTs

Each RALD service has a machine identity. It presents a short-lived signed JWT on every outbound call.

```
Service A wants to call Service B
  ↓
A generates machine JWT signed with A's private key:
  {
    "iss": "auth.rald.cloud",         // issuer
    "sub": "svc:loop-worker",         // machine identity
    "aud": "svc:auth-core",           // intended recipient
    "iat": 1718000000,
    "exp": 1718000300,                // 5-minute TTL
    "permissions": ["session.read","profile.read"],
    "machine": true
  }
  ↓
A sends: Authorization: MachineBearer <machine-jwt>
  ↓
B verifies JWT:
  - Checks signature with Auth Core public key
  - Checks aud == "svc:auth-core"
  - Checks iat/exp
  - Checks permissions include required scope
  - Proceeds or rejects
```

---

## Machine Identity Registry

```typescript
interface MachineIdentity {
  id:           string;    // e.g. "svc:loop-worker"
  display_name: string;    // e.g. "Loop Worker"
  service:      string;    // e.g. "loop"
  environment:  "production" | "staging" | "sandbox";
  permissions:  string[];  // what this service is allowed to do
  created_at:   string;
  rotated_at:   string;
}

const MACHINE_IDENTITIES: MachineIdentity[] = [
  {
    id: "svc:auth-core",
    display_name: "Auth Core",
    service: "auth.rald.cloud",
    environment: "production",
    permissions: ["*"],  // auth core has full permissions
  },
  {
    id: "svc:loop-worker",
    display_name: "Loop Worker",
    service: "loop",
    environment: "production",
    permissions: ["session.read", "profile.read", "profile.write", "sso.exchange"],
  },
  {
    id: "svc:messenger-worker",
    display_name: "Messenger Worker",
    service: "messenger",
    environment: "production",
    permissions: ["session.read", "profile.read", "sso.exchange"],
  },
  {
    id: "svc:payrald-worker",
    display_name: "PayRald Worker",
    service: "payrald",
    environment: "production",
    permissions: ["session.read", "profile.read", "trust.read", "sso.exchange"],
  },
  {
    id: "svc:rald-routing",
    display_name: "ALIA Routing Engine",
    service: "rald-routing",
    environment: "production",
    permissions: ["session.read", "trust.read", "consent.read", "identity.read"],
  },
];
```

---

## Implementation

### Generating a Machine JWT

```typescript
// shared lib: @rald/auth/machine
import { SignJWT } from "jose";

export async function generateMachineJWT(
  caller: string,         // "svc:loop-worker"
  audience: string,       // "svc:auth-core"
  permissions: string[],
  privateKey: CryptoKey
): Promise<string> {
  return new SignJWT({
    sub:         caller,
    aud:         audience,
    permissions,
    machine:     true,
  })
    .setProtectedHeader({ alg: "ES256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .setIssuer("auth.rald.cloud")
    .sign(privateKey);
}
```

### Verifying a Machine JWT

```typescript
export async function verifyMachineJWT(
  token: string,
  expectedAudience: string,
  requiredPermission: string,
  publicKey: CryptoKey
): Promise<MachineClaims | null> {
  try {
    const { payload } = await jwtVerify(token, publicKey, {
      audience: expectedAudience,
      issuer:   "auth.rald.cloud",
    });
    if (!payload.machine) return null;
    const perms = payload.permissions as string[];
    if (perms.includes("*") || perms.includes(requiredPermission)) {
      return payload as MachineClaims;
    }
    return null;
  } catch {
    return null;
  }
}
```

### Auth Middleware for Machine Callers

```typescript
// In rald-auth-core: middleware for service-to-service endpoints
export function requireMachine(requiredPermission: string) {
  return async (c: Context, next: Next) => {
    const auth = c.req.header("Authorization") ?? "";
    
    if (auth.startsWith("MachineBearer ")) {
      const token = auth.slice("MachineBearer ".length);
      const claims = await verifyMachineJWT(
        token,
        `svc:auth-core`,
        requiredPermission,
        c.env.RALD_MACHINE_PUBLIC_KEY
      );
      if (claims) {
        c.set("machine", claims);
        return next();
      }
    }
    
    return c.json({ error: "machine identity required" }, 401);
  };
}
```

---

## Migration from X-Internal-Secret

| Step | Action |
|------|--------|
| 1 | Generate machine key pair per service (Ed25519/P-256) |
| 2 | Store private key in Cloudflare Secrets |
| 3 | Register public key in auth.rald.cloud machine registry |
| 4 | Update auth-core middleware to accept MachineBearer (parallel with X-Internal-Secret) |
| 5 | Update each worker to send MachineBearer instead of X-Internal-Secret |
| 6 | After all workers migrated: remove X-Internal-Secret support |

### Files to Update
- `rald-auth-core/src/middleware/auth.ts` — add `requireMachine()` middleware
- `loop/artifacts/cloudflare-worker/src/routes/rald-sso.ts` — replace `X-Internal-Secret` with `MachineBearer`
- `messenger/src/worker.ts` — replace `X-Internal-Secret`
- `payrald/src/worker.ts` — replace `X-Internal-Secret`

---

## Key Rotation

Machine keys rotate every 90 days:
1. Generate new key pair
2. Register new public key (alongside old one) in auth-core
3. Workers begin signing with new private key
4. After 1 hour (all in-flight JWTs expired) remove old public key
5. Delete old private key from Cloudflare Secrets

---

*See also: SELF_HEALING_OPERATIONS.md, DEVELOPER_CLOUD_ARCHITECTURE.md*
