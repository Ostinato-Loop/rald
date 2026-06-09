# RALD_AUTH_INTEGRATION_GUIDE.md
**How to Integrate a New Product into RALD Auth**
**Version:** 1.0 | **Date:** 2026-06-09
**Authority:** RALD Auth V1 Lockdown Directive
**Maintained by:** LILCKY STUDIO LIMITED Engineering

---

## PHILOSOPHY

> Applications must never own authentication. Applications consume authentication.

RALD Auth (`auth.rald.cloud`) is the permanent, single identity layer for the entire RALD ecosystem. Every product — current and future — must plug into it using this guide.

A user creates one RALD Account. Everything else consumes that identity.

---

## PREREQUISITES

Before integrating, you need:

1. **`RALD_JWT_SECRET`** — the shared secret used to sign and verify all RALD JWTs. Stored as a Cloudflare Worker secret. Get it from the RALD Auth team. Never commit it.
2. **An `app_id`** — a unique identifier for your product. Examples: `loop`, `messenger`, `payrald`, `gitrald`. Register it (see Step 1).
3. **A callback URL** — the HTTPS endpoint on your domain where RALD Auth will redirect after authentication. Must be on `*.rald.cloud` or `*.ostloop.name.ng`.

---

## STEP 1 — REGISTER YOUR APP

Register via the RALD Auth admin API (requires admin JWT):

```bash
curl -X POST https://auth.rald.cloud/sso/registry \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "app_id": "your-app",
    "name": "Your App Name",
    "domain": "https://yourapp.rald.cloud",
    "callback_url": "https://yourapp.rald.cloud/auth/callback",
    "logout_url": "https://yourapp.rald.cloud/auth/logout",
    "icon": "🚀"
  }'
```

Verify registration:
```bash
curl https://auth.rald.cloud/sso/apps
# Should include "your-app" in the apps array
```

---

## STEP 2 — BACKEND: VERIFY RALD TOKENS

Add this to your Cloudflare Worker or API server. **Never make HTTP calls to `auth.rald.cloud` to verify tokens** — verify locally using the shared secret.

```typescript
// lib/jwt.ts — copy this into your worker
const RALD_JWT_SECRET = env.RALD_JWT_SECRET; // from Cloudflare Worker secrets

async function verifyRaldToken(token: string, secret: string): Promise<RaldPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const sigBytes = Uint8Array.from(
      atob(sig.replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0)
    );

    const valid = await crypto.subtle.verify(
      "HMAC", key, sigBytes,
      new TextEncoder().encode(`${header}.${body}`)
    );

    if (!valid) return null;

    const payload = JSON.parse(
      atob(body.replace(/-/g, "+").replace(/_/g, "/"))
    );

    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

// Auth middleware for your routes
async function requireAuth(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) return c.json({ error: "Authentication required" }, 401);

  const payload = await verifyRaldToken(token, c.env.RALD_JWT_SECRET);
  if (!payload) return c.json({ error: "Invalid or expired token" }, 401);

  c.set("user", payload);
  await next();
}
```

**RALD JWT payload shape:**
```typescript
interface RaldPayload {
  id: string;       // User UUID (matches profiles.id in Supabase)
  email: string;
  role: string;     // "user" | "merchant" | "admin"
  iat: number;      // Issued at (unix seconds)
  exp: number;      // Expires at (unix seconds)
  appId?: string;   // App-scoped tokens include this
  source?: string;  // "rald-auth"
  sso_v?: number;   // SSO version (2 = current)
}
```

---

## STEP 3 — BACKEND: SSO ENDPOINT

Create one endpoint in your Worker that accepts RALD tokens and returns identity:

```typescript
// POST /auth/rald-sso — accept RALD token, return user identity
app.post("/auth/rald-sso", async (c) => {
  const body = await c.req.json<{ rald_token?: string }>().catch(() => ({}));
  if (!body.rald_token) return c.json({ error: "rald_token required" }, 400);

  const rald = await verifyRaldToken(body.rald_token, c.env.RALD_JWT_SECRET);
  if (!rald) return c.json({ error: "Invalid or expired RALD token" }, 401);

  // Optional: enrich with profile data from Supabase
  // const profile = await getProfile(c.env, rald.id);

  return c.json({
    authenticated: true,
    user: {
      id: rald.id,
      email: rald.email,
      role: rald.role,
    },
    token: body.rald_token, // Pass back for frontend to use as Bearer
  });
});

// GET /auth/me — return enriched user identity (requires Bearer token)
app.get("/auth/me", requireAuth, async (c) => {
  const user = c.get("user");

  // Fetch profile from Supabase
  const { data: profile } = await db
    .from("profiles")
    .select("display_name, username, avatar_url, bio, is_verified")
    .eq("id", user.id)
    .single();

  return c.json({
    id: user.id,
    displayName: profile?.display_name ?? null,
    username: profile?.username ?? null,
    avatar: profile?.avatar_url ?? null,
    bio: profile?.bio ?? null,
    isVerified: profile?.is_verified ?? false,
    role: user.role,
  });
});
```

---

## STEP 4 — FRONTEND: PROTECTED ROUTES

```typescript
// hooks/use-auth.tsx

const RALD_AUTH_URL = import.meta.env.VITE_RALD_AUTH_URL ?? "https://profiles.rald.cloud";
const API_BASE      = import.meta.env.VITE_API_BASE_URL ?? "";
const APP_ID        = "your-app"; // your registered app_id

export function redirectToLogin(returnPath = "/") {
  const callbackBase = `${window.location.origin}/auth/callback`;
  const callbackUrl = returnPath !== "/"
    ? `${callbackBase}?next=${encodeURIComponent(returnPath)}`
    : callbackBase;
  window.location.href =
    `${RALD_AUTH_URL}/login?app_id=${APP_ID}&redirect_to=${encodeURIComponent(callbackUrl)}`;
}
```

```typescript
// components/protected-route.tsx
import { useAuth } from "@/hooks/use-auth";
import { redirectToLogin } from "@/hooks/use-auth";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      redirectToLogin(location.pathname + location.search);
    }
  }, [user, loading, location]);

  if (loading) return <LoadingSpinner />;
  if (!user) return null; // Will redirect

  return <>{children}</>;
}
```

---

## STEP 5 — FRONTEND: AUTH CALLBACK PAGE

Create `/auth/callback` in your frontend router:

```typescript
// pages/auth-callback.tsx
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") ?? "/";

  useEffect(() => {
    const raldToken = params.get("rald_token");
    if (!raldToken) {
      // No token — return to login
      navigate("/login", { replace: true });
      return;
    }

    // Exchange RALD token for app-scoped session
    fetch(`${API_BASE}/auth/rald-sso`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rald_token: raldToken }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated) {
          // Store master token for cross-app navigation
          localStorage.setItem("rald_master_token", raldToken);
          // Store app-scoped token for API calls
          // TODO: migrate to HttpOnly cookie — see AUTH_SECURITY_CERTIFICATION.md
          localStorage.setItem("app_token", data.token);
          navigate(next, { replace: true });
        } else {
          navigate("/login?error=sso_failed", { replace: true });
        }
      })
      .catch(() => navigate("/login?error=sso_failed", { replace: true }));
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p>Signing you in…</p>
    </div>
  );
}
```

---

## STEP 6 — CROSS-APP NAVIGATION (NO RE-AUTH)

When linking a user from your app to another RALD app, use the master token:

```typescript
// Navigate to Messenger from your app — no re-auth required
export function openMessenger(path = "/") {
  const raldToken = localStorage.getItem("rald_master_token");
  if (raldToken) {
    window.location.href =
      `https://chat.rald.cloud${path}?rald_token=${encodeURIComponent(raldToken)}&app_id=messenger`;
  } else {
    redirectToLogin(); // Fall back to full auth
  }
}

// Navigate to Loop from your app
export function openLoop(path = "/") {
  const raldToken = localStorage.getItem("rald_master_token");
  if (raldToken) {
    window.location.href =
      `https://loop.rald.cloud${path}?rald_token=${encodeURIComponent(raldToken)}&app_id=loop`;
  } else {
    redirectToLogin();
  }
}
```

---

## STEP 7 — GLOBAL LOGOUT

When a user signs out of your app, revoke their session at RALD Auth too:

```typescript
export async function signOut() {
  const raldToken = localStorage.getItem("rald_master_token");

  // 1. Clear local tokens
  localStorage.removeItem("app_token");
  localStorage.removeItem("rald_master_token");

  // 2. Revoke session at RALD Auth (fire and forget — don't block UX)
  if (raldToken) {
    fetch("https://auth.rald.cloud/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${raldToken}` },
    }).catch(() => {}); // Non-blocking
  }

  // 3. Redirect to RALD Auth logout (clears auth.rald.cloud session cookie)
  window.location.href = "https://profiles.rald.cloud/logout?redirect_to=https://yourapp.rald.cloud";
}
```

---

## STEP 8 — USER IDENTITY (SINGLE SOURCE OF TRUTH)

**Never store a duplicate user profile database.** Fetch user identity from `auth.rald.cloud`:

```typescript
// Get user identity from RALD Auth (cached, not repeated)
const response = await fetch("https://auth.rald.cloud/me", {
  headers: { Authorization: `Bearer ${raldToken}` }
});
const user = await response.json();
// Returns: { id, rald_id, email, name, role, phone, created_at }
```

**Get enriched profile from Supabase `profiles` table** (shared across all RALD products):
```sql
SELECT id, username, display_name, avatar_url, bio, is_verified,
       country, state_id, trust_score, trust_level
FROM profiles
WHERE id = '<user_id_from_rald_jwt>'
```

The `profiles` table is the shared profile store. All RALD products read and write to the same table. This is how a profile picture set in Loop appears in Messenger automatically.

---

## ENVIRONMENT VARIABLES

Add these to your Cloudflare Worker secrets:

```
RALD_JWT_SECRET      = <shared secret — get from RALD Auth team>
SUPABASE_URL         = https://onxdcikfttdmnhofsuwo.supabase.co
SUPABASE_SERVICE_ROLE_KEY = <service role key — get from RALD Auth team>
```

Add these to your Cloudflare Pages environment variables:

```
VITE_RALD_AUTH_URL   = https://profiles.rald.cloud
VITE_API_BASE_URL    = https://your-worker.your-account.workers.dev
```

---

## COMMON MISTAKES

| Mistake | Correct approach |
|---|---|
| Building your own OTP or password auth | Don't. Redirect to `profiles.rald.cloud`. |
| Storing user profile data in your own DB | Don't. Read from `profiles` Supabase table. |
| Making HTTP calls to `auth.rald.cloud` on every request to verify tokens | Don't. Verify JWT locally with `RALD_JWT_SECRET`. |
| Using `redirect_to` with non-`*.rald.cloud` domains | Only `*.rald.cloud` and `*.ostloop.name.ng` are allowed. |
| Calling your callback URL `return_to` | Use `redirect_to` — that is the ecosystem standard. |
| Hardcoding `RALD_JWT_SECRET` in source code | Never. Use Cloudflare Worker secrets only. |
| Storing tokens in localStorage | Migrate to HttpOnly cookies (see AUTH_SECURITY_CERTIFICATION.md). |

---

## TESTING YOUR INTEGRATION

```bash
# 1. Get a test token from RALD Auth
curl -X POST https://auth.rald.cloud/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@rald.cloud","password":"<test-password>"}'
# → { token: "<RALD_JWT>" }

# 2. Exchange for app-scoped token
curl -X POST https://auth.rald.cloud/sso/exchange \
  -H "Authorization: Bearer <RALD_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"appId":"your-app","redirect_to":"https://yourapp.rald.cloud/auth/callback"}'
# → { token: "<APP_JWT>", appId: "your-app", expiresIn: 3600 }

# 3. Test your SSO endpoint
curl -X POST https://your-worker.workers.dev/auth/rald-sso \
  -H "Content-Type: application/json" \
  -d '{"rald_token":"<RALD_JWT>"}'
# → { authenticated: true, user: { id, email, role } }

# 4. Test token verification endpoint
curl -X POST https://auth.rald.cloud/sso/verify \
  -H "Content-Type: application/json" \
  -d '{"token":"<APP_JWT>"}'
# → { valid: true, user: { id, email, role } }
```

---

## REFERENCE IMPLEMENTATIONS

Study these production implementations before building:

| Product | SSO Route | Auth Hook | Callback Page |
|---|---|---|---|
| **Loop** | `loop/artifacts/cloudflare-worker/src/routes/auth.ts` | `loop/artifacts/loop/src/hooks/use-auth.tsx` | `loop/artifacts/loop/src/pages/auth-callback.tsx` |
| **Messenger** | `messenger/workers/loop-messenger-api/src/routes/sso.ts` | (stateless — Bearer only) | — |
| **Auth Core** | `rald-auth-core/src/routes/sso.ts` | — | — |

---

## SUPPORT

- Ecosystem app registration: contact RALD Auth team for admin JWT
- `RALD_JWT_SECRET`: never shared via chat — transferred via Cloudflare team secrets
- Questions: open an issue in `Ostinato-Loop/rald-auth-core`

---

*RALD_AUTH_INTEGRATION_GUIDE.md — LILCKY STUDIO LIMITED*
*Review cycle: quarterly or on any rald-auth-core major version bump*
