# RALD_AUTH_SDK_PLAN.md
**RALD Auth SDK — Integration Plan**
**Date:** 2026-06-09 | **Authority:** RALD Auth V1 Lockdown Directive
**LILCKY STUDIO LIMITED**

---

## MISSION

> Future products must integrate using the SDK rather than custom authentication logic.

Every product that writes its own OTP flow, JWT parser, or redirect handler is a product that can diverge from the ecosystem standard. The RALD Auth SDK eliminates this. One import — complete RALD identity.

---

## CURRENT STATE

`Ostinato-Loop/rald-auth-sdk` exists with 8 files:
- `src/index.ts` (entry point — likely minimal or stub)
- `package.json`, `tsconfig.json`, standard tooling

The actual implementation logic currently lives duplicated across:
- `rald-auth-core/src/lib/auth.ts` — JWT sign/verify (Web Crypto)
- `loop/src/hooks/use-auth.tsx` — AuthProvider, ProtectedRoute, token storage
- `loop/src/pages/login.tsx` — redirect to profiles.rald.cloud
- `loop/src/pages/auth-callback.tsx` — token exchange on return
- `messenger/workers/loop-messenger-api/src/routes/sso.ts` — server-side token verification

**The SDK's job:** consolidate all of this into one publishable package.

---

## SDK SCOPE

Three packages from one monorepo:

| Package | Target | Purpose |
|---|---|---|
| `@rald/auth` | Browser + React | Frontend hooks, protected routes, auth provider |
| `@rald/auth-server` | Cloudflare Workers + Node | JWT verification, middleware, session management |
| `@rald/auth-react-native` | React Native (Expo) | Mobile auth, deep links, secure token storage |

---

## PACKAGE 1: `@rald/auth` (Browser/React)

### Install

```bash
npm install @rald/auth
```

### API

```typescript
import {
  RaldAuthProvider,      // React context provider — wraps your app
  useAuth,              // Hook: { user, profile, loading, signOut }
  ProtectedRoute,       // Component: redirects to login if unauthenticated
  openProduct,          // Navigate cross-app without re-auth
  redirectToLogin,      // Manual redirect to profiles.rald.cloud
  getRaldMasterToken,   // Get the stored master token
} from "@rald/auth";
```

### Usage

```tsx
// main.tsx — wrap your app
import { RaldAuthProvider } from "@rald/auth";

createRoot(document.getElementById("root")!).render(
  <RaldAuthProvider
    appId="your-app"
    apiBase="https://your-worker.workers.dev"
    authUrl="https://profiles.rald.cloud"
  >
    <App />
  </RaldAuthProvider>
);

// Any protected component
import { useAuth, ProtectedRoute } from "@rald/auth";

function HomePage() {
  const { user, profile, signOut } = useAuth();
  return <div>Welcome, {profile?.display_name}</div>;
}

// Route protection
<Route path="/dashboard" element={
  <ProtectedRoute><Dashboard /></ProtectedRoute>
} />

// Cross-app navigation
import { openProduct } from "@rald/auth";
openProduct("messenger", "/chats"); // Goes to chat.rald.cloud/chats — no re-auth
openProduct("loop", "/");           // Goes to loop.rald.cloud — no re-auth
```

### Required app routes (auto-handled by SDK)

The SDK provides ready-to-mount route components:

```tsx
import { LoginPage, AuthCallbackPage } from "@rald/auth";

// Add to your router:
<Route path="/login" element={<LoginPage />} />
<Route path="/auth/callback" element={<AuthCallbackPage />} />
```

No custom login or callback pages needed. The SDK handles the full flow.

---

## PACKAGE 2: `@rald/auth-server` (Workers/Node)

### Install

```bash
npm install @rald/auth-server
```

### API

```typescript
import {
  verifyRaldToken,     // Verify JWT locally — no HTTP call
  requireAuth,         // Hono middleware: validates Bearer JWT
  requireAdmin,        // Hono middleware: requires admin role
  buildSessionCookie,  // Set-Cookie header helper
  parseSessionCookie,  // Extract token from Cookie header
  writeAuditLog,       // Write to audit_logs table
  checkRateLimit,      // Sliding window rate limiter (KV-backed)
} from "@rald/auth-server";
```

### Usage

```typescript
import { Hono } from "hono";
import { requireAuth, verifyRaldToken } from "@rald/auth-server";

const app = new Hono();

// Protect a route
app.get("/api/profile", requireAuth(), (c) => {
  const user = c.get("user"); // { id, email, role }
  return c.json({ userId: user.id });
});

// Verify a token manually
const payload = await verifyRaldToken(token, env.RALD_JWT_SECRET);
if (!payload) return c.json({ error: "Unauthorized" }, 401);

// SSO endpoint — one line
import { ssoEndpoint } from "@rald/auth-server";
app.post("/auth/rald-sso", ssoEndpoint({ secret: env.RALD_JWT_SECRET }));
```

---

## PACKAGE 3: `@rald/auth-react-native` (Expo/React Native)

### Install

```bash
npx expo install @rald/auth-react-native expo-secure-store expo-linking expo-web-browser
```

### API

```typescript
import {
  RaldAuthProvider,  // Context provider
  useAuth,          // Same interface as web
  signIn,           // Opens profiles.rald.cloud in-app browser
  signOut,          // Clears secure storage + calls revoke
} from "@rald/auth-react-native";
```

### Token storage

Uses `expo-secure-store` (iOS Keychain / Android Keystore) — not AsyncStorage.

```typescript
// Tokens stored at:
SecureStore.setItemAsync("rald_master_token", token);
SecureStore.setItemAsync("app_token", appToken);
```

### Deep link handling

Requires `app.json` config:
```json
{
  "expo": {
    "scheme": "yourapp",
    "intentFilters": [
      {
        "action": "VIEW",
        "data": [{ "scheme": "https", "host": "yourapp.rald.cloud" }],
        "category": ["BROWSABLE", "DEFAULT"]
      }
    ]
  }
}
```

SDK handles:
- Universal Link: `https://yourapp.rald.cloud/auth/callback?rald_token=<JWT>`
- Custom scheme: `yourapp://auth/callback?rald_token=<JWT>`
- Session persistence across app restarts (SecureStore)
- Background token refresh

---

## SDK REPOSITORY STRUCTURE

```
rald-auth-sdk/
├── packages/
│   ├── auth/                     # @rald/auth (browser/react)
│   │   ├── src/
│   │   │   ├── provider.tsx      # RaldAuthProvider + AuthContext
│   │   │   ├── hooks.ts          # useAuth hook
│   │   │   ├── protected.tsx     # ProtectedRoute component
│   │   │   ├── pages/
│   │   │   │   ├── login.tsx     # Login interstitial + redirect
│   │   │   │   └── callback.tsx  # Token exchange + navigation
│   │   │   ├── cross-app.ts      # openProduct, redirectToLogin
│   │   │   ├── storage.ts        # Token storage (localStorage → cookie migration)
│   │   │   └── index.ts          # Public exports
│   │   └── package.json
│   ├── auth-server/              # @rald/auth-server (workers/node)
│   │   ├── src/
│   │   │   ├── jwt.ts            # verifyRaldToken, signJwt (Web Crypto)
│   │   │   ├── middleware.ts     # requireAuth, requireAdmin
│   │   │   ├── sso.ts            # ssoEndpoint factory
│   │   │   ├── cookie.ts         # Cookie helpers
│   │   │   ├── audit.ts          # writeAuditLog
│   │   │   ├── rate-limit.ts     # checkRateLimit (KV sliding window)
│   │   │   └── index.ts
│   │   └── package.json
│   └── auth-react-native/        # @rald/auth-react-native
│       ├── src/
│       │   ├── provider.tsx
│       │   ├── hooks.ts
│       │   ├── storage.ts        # SecureStore abstraction
│       │   ├── deep-links.ts     # Universal link + scheme handling
│       │   └── index.ts
│       └── package.json
├── examples/
│   ├── react-vite/               # Example: React + Vite app
│   ├── cloudflare-worker/        # Example: CF Worker integration
│   └── expo/                     # Example: Expo mobile app
├── docs/
│   └── RALD_AUTH_INTEGRATION_GUIDE.md (symlink)
└── package.json                  # pnpm workspace
```

---

## MIGRATION PATH: Loop → SDK

When `@rald/auth` reaches v0.1.0:

1. Replace `loop/src/hooks/use-auth.tsx` with `import { useAuth } from "@rald/auth"`
2. Replace `loop/src/pages/login.tsx` with `import { LoginPage } from "@rald/auth"`
3. Replace `loop/src/pages/auth-callback.tsx` with `import { AuthCallbackPage } from "@rald/auth"`
4. Replace `loop/src/components/protected-route.tsx` with `import { ProtectedRoute } from "@rald/auth"`

Net reduction: ~600 lines of auth code removed from the Loop repo.

Loop becomes a consumer of identity, not an owner.

---

## VERSIONING POLICY

```
@rald/auth: 0.x.x  — pre-stable, internal use only
@rald/auth: 1.0.0  — stable, all RALD products must migrate
@rald/auth: 1.x.x  — backwards compatible (minor + patch)
@rald/auth: 2.0.0  — breaking change — requires migration sprint
```

JWT format changes (algorithm, claim shape) require a major version bump and a 90-day migration window.

---

## IMPLEMENTATION PRIORITY

| Item | Sprint | Effort |
|---|---|---|
| Extract `jwt.ts` + `middleware.ts` into `@rald/auth-server` | Sprint 3 | 2 days |
| Extract `use-auth.tsx` + `login.tsx` + `callback.tsx` into `@rald/auth` | Sprint 3 | 3 days |
| Publish `@rald/auth-server@0.1.0` to npm (private) | Sprint 3 | 0.5 day |
| Publish `@rald/auth@0.1.0` to npm (private) | Sprint 3 | 0.5 day |
| Migrate Messenger Worker to `@rald/auth-server` | Sprint 4 | 1 day |
| Migrate Loop frontend to `@rald/auth` | Sprint 4 | 2 days |
| `@rald/auth-react-native` (Expo support) | Sprint 5 | 1 week |
| Stable `1.0.0` release with full docs | Sprint 6 | 3 days |

---

*RALD_AUTH_SDK_PLAN.md — LILCKY STUDIO LIMITED | 2026-06-09*
