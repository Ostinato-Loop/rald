import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { freshSupabase, type Env } from "../lib/supabase";
import { randomHex, sha256 } from "../lib/crypto";
import { signJWT, verifyJWT } from "../lib/jwt";
import { requireAuth } from "../middleware/auth";

const oauth = new Hono<{ Bindings: Env }>();

// ─── GET /.well-known/openid-configuration ────────────────────────────────────
oauth.get("/openid-configuration", (c) => {
  const base = new URL(c.req.url).origin;
  return c.json({
    issuer: base,
    authorization_endpoint: `${base}/api/oauth/authorize`,
    token_endpoint: `${base}/api/oauth/token`,
    userinfo_endpoint: `${base}/api/oauth/userinfo`,
    jwks_uri: `${base}/api/oauth/jwks`,
    revocation_endpoint: `${base}/api/oauth/revoke`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["HS256"],
    scopes_supported: [
      "openid",
      "profile",
      "email",
      "phone",
      "wallet:read",
      "wallet:write",
      "session:read",
      "session:write",
    ],
    token_endpoint_auth_methods_supported: ["client_secret_post", "client_secret_basic"],
    claims_supported: ["sub", "phone", "name", "email", "role", "iat", "exp"],
    code_challenge_methods_supported: ["S256"],
  });
});

// ─── GET /api/oauth/jwks ──────────────────────────────────────────────────────
oauth.get("/jwks", (c) => {
  // HS256 — symmetric, so JWKS only advertises alg
  return c.json({ keys: [{ kty: "oct", alg: "HS256", use: "sig" }] });
});

// ─── GET /api/oauth/authorize ─────────────────────────────────────────────────
oauth.get("/authorize", async (c) => {
  const query = c.req.query();
  const { client_id, redirect_uri, scope, state, response_type, code_challenge, code_challenge_method } = query;

  if (response_type !== "code") {
    return c.json({ error: "unsupported_response_type" }, 400);
  }

  const db = freshSupabase(c.env);
  const { data: client } = await db
    .from("rald_oauth_clients")
    .select("id, name, logo_url, verified, redirect_uris, scopes, status")
    .eq("id", client_id)
    .single();

  if (!client || client.status !== "active") {
    return c.json({ error: "invalid_client" }, 400);
  }
  if (!client.redirect_uris.includes(redirect_uri)) {
    return c.json({ error: "invalid_redirect_uri" }, 400);
  }

  const requestedScopes = (scope ?? "").split(" ").filter(Boolean);
  const allowedScopes = requestedScopes.filter((s) => client.scopes.includes(s));

  // Return client info for the consent page
  return c.json({
    client: {
      id: client.id,
      name: client.name,
      logo_url: client.logo_url,
      verified: client.verified,
    },
    scopes: allowedScopes,
    state,
    redirect_uri,
    code_challenge,
    code_challenge_method,
  });
});

// ─── POST /api/oauth/authorize (user grants consent) ─────────────────────────
oauth.post(
  "/authorize",
  requireAuth,
  zValidator(
    "json",
    z.object({
      client_id: z.string(),
      redirect_uri: z.string().url(),
      scope: z.string(),
      state: z.string().optional(),
      decision: z.enum(["allow", "deny"]),
      code_challenge: z.string().optional(),
      code_challenge_method: z.string().optional(),
    }),
  ),
  async (c) => {
    const body = c.req.valid("json");
    const { sub } = c.get("user");
    const db = freshSupabase(c.env);

    if (body.decision === "deny") {
      const url = new URL(body.redirect_uri);
      url.searchParams.set("error", "access_denied");
      if (body.state) url.searchParams.set("state", body.state);

      await db.from("rald_audit_logs").insert({
        user_id: sub,
        action: "oauth.denied",
        metadata: { client_id: body.client_id },
      });

      return c.json({ redirect: url.toString() });
    }

    const { data: client } = await db
      .from("rald_oauth_clients")
      .select("id, redirect_uris, scopes")
      .eq("id", body.client_id)
      .single();

    if (!client || !client.redirect_uris.includes(body.redirect_uri)) {
      return c.json({ error: "invalid_client" }, 400);
    }

    const scopes = body.scope.split(" ").filter((s) => client.scopes.includes(s));
    const code = randomHex(32);
    const codeHash = await sha256(code);

    await db.from("rald_oauth_codes").insert({
      client_id: body.client_id,
      user_id: sub,
      code: codeHash,
      redirect_uri: body.redirect_uri,
      scopes,
      code_challenge: body.code_challenge,
      code_challenge_method: body.code_challenge_method,
    });

    await db.from("rald_audit_logs").insert({
      user_id: sub,
      action: "oauth.authorized",
      metadata: { client_id: body.client_id, scopes },
    });

    const url = new URL(body.redirect_uri);
    url.searchParams.set("code", code);
    if (body.state) url.searchParams.set("state", body.state);

    return c.json({ redirect: url.toString() });
  },
);

// ─── POST /api/oauth/token ────────────────────────────────────────────────────
oauth.post(
  "/token",
  zValidator(
    "form",
    z.object({
      grant_type: z.enum(["authorization_code", "refresh_token"]),
      code: z.string().optional(),
      refresh_token: z.string().optional(),
      client_id: z.string(),
      client_secret: z.string(),
      redirect_uri: z.string().optional(),
      code_verifier: z.string().optional(),
    }),
  ),
  async (c) => {
    const body = c.req.valid("form");
    const db = freshSupabase(c.env);

    // Verify client credentials
    const secretHash = await sha256(body.client_secret);
    const { data: client } = await db
      .from("rald_oauth_clients")
      .select("id, secret_hash, status")
      .eq("id", body.client_id)
      .single();

    if (!client || client.secret_hash !== secretHash || client.status !== "active") {
      return c.json({ error: "invalid_client" }, 401);
    }

    if (body.grant_type === "authorization_code") {
      if (!body.code) return c.json({ error: "missing_code" }, 400);

      const codeHash = await sha256(body.code);
      const { data: authCode } = await db
        .from("rald_oauth_codes")
        .select("*")
        .eq("code", codeHash)
        .eq("client_id", body.client_id)
        .eq("used", false)
        .single();

      if (!authCode || new Date(authCode.expires_at) < new Date()) {
        return c.json({ error: "invalid_grant" }, 400);
      }

      // PKCE verification
      if (authCode.code_challenge && authCode.code_challenge_method === "S256") {
        if (!body.code_verifier) return c.json({ error: "missing_code_verifier" }, 400);
        const verifierHash = await sha256(body.code_verifier);
        const challenge = btoa(
          String.fromCharCode(...new Uint8Array(Uint8Array.from(verifierHash, (c) => c.charCodeAt(0)))),
        )
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=/g, "");
        if (challenge !== authCode.code_challenge) {
          return c.json({ error: "invalid_code_verifier" }, 400);
        }
      }

      await db.from("rald_oauth_codes").update({ used: true }).eq("id", authCode.id);

      const { data: user } = await db
        .from("rald_users")
        .select("id, phone, name, email, role")
        .eq("id", authCode.user_id)
        .single();

      if (!user) return c.json({ error: "user_not_found" }, 400);

      const accessTokenRaw = randomHex(48);
      const refreshTokenRaw = randomHex(48);
      const accessHash = await sha256(accessTokenRaw);
      const refreshHash = await sha256(refreshTokenRaw);

      const expiresAt = new Date(Date.now() + 3600_000).toISOString();

      await db.from("rald_oauth_tokens").insert({
        client_id: body.client_id,
        user_id: user.id,
        token_hash: accessHash,
        refresh_hash: refreshHash,
        scopes: authCode.scopes,
        expires_at: expiresAt,
      });

      const idToken = await signJWT(
        {
          sub: user.id,
          phone: user.phone,
          name: user.name,
          email: user.email,
          role: user.role,
          aud: body.client_id,
        },
        c.env.JWT_SECRET,
        3600,
      );

      return c.json({
        access_token: accessTokenRaw,
        refresh_token: refreshTokenRaw,
        token_type: "Bearer",
        expires_in: 3600,
        scope: authCode.scopes.join(" "),
        id_token: idToken,
      });
    }

    // refresh_token grant
    if (!body.refresh_token) return c.json({ error: "missing_refresh_token" }, 400);
    const refreshHash = await sha256(body.refresh_token);
    const { data: existing } = await db
      .from("rald_oauth_tokens")
      .select("*")
      .eq("refresh_hash", refreshHash)
      .eq("client_id", body.client_id)
      .eq("revoked", false)
      .single();

    if (!existing) return c.json({ error: "invalid_grant" }, 400);

    // Rotate tokens
    const newAccessRaw = randomHex(48);
    const newRefreshRaw = randomHex(48);
    const newAccessHash = await sha256(newAccessRaw);
    const newRefreshHash = await sha256(newRefreshRaw);

    await db.from("rald_oauth_tokens").update({ revoked: true }).eq("id", existing.id);
    await db.from("rald_oauth_tokens").insert({
      client_id: body.client_id,
      user_id: existing.user_id,
      token_hash: newAccessHash,
      refresh_hash: newRefreshHash,
      scopes: existing.scopes,
      expires_at: new Date(Date.now() + 3600_000).toISOString(),
    });

    return c.json({
      access_token: newAccessRaw,
      refresh_token: newRefreshRaw,
      token_type: "Bearer",
      expires_in: 3600,
      scope: existing.scopes.join(" "),
    });
  },
);

// ─── GET /api/oauth/userinfo ──────────────────────────────────────────────────
oauth.get("/userinfo", requireAuth, async (c) => {
  const { sub } = c.get("user");
  const db = freshSupabase(c.env);
  const { data: user } = await db
    .from("rald_users")
    .select("id, phone, name, email, avatar_url, role")
    .eq("id", sub)
    .single();
  if (!user) return c.json({ error: "not_found" }, 404);
  return c.json({
    sub: user.id,
    phone: user.phone,
    name: user.name,
    email: user.email,
    picture: user.avatar_url,
    role: user.role,
  });
});

// ─── POST /api/oauth/revoke ───────────────────────────────────────────────────
oauth.post(
  "/revoke",
  zValidator("form", z.object({ token: z.string(), client_id: z.string(), client_secret: z.string() })),
  async (c) => {
    const { token, client_id, client_secret } = c.req.valid("form");
    const db = freshSupabase(c.env);
    const secretHash = await sha256(client_secret);
    const { data: client } = await db
      .from("rald_oauth_clients")
      .select("id")
      .eq("id", client_id)
      .eq("secret_hash", secretHash)
      .single();
    if (!client) return c.json({ error: "invalid_client" }, 401);
    const hash = await sha256(token);
    await db.from("rald_oauth_tokens").update({ revoked: true }).eq("token_hash", hash).eq("client_id", client_id);
    await db.from("rald_oauth_tokens").update({ revoked: true }).eq("refresh_hash", hash).eq("client_id", client_id);
    return c.json({ ok: true });
  },
);

// ─── POST /api/oauth/clients (create OAuth app) ───────────────────────────────
oauth.post(
  "/clients",
  requireAuth,
  zValidator(
    "json",
    z.object({
      name: z.string().min(2).max(100),
      description: z.string().max(500).optional(),
      logo_url: z.string().url().optional(),
      redirect_uris: z.array(z.string().url()).min(1).max(5),
      scopes: z
        .array(
          z.enum([
            "openid",
            "profile",
            "email",
            "phone",
            "wallet:read",
            "wallet:write",
            "session:read",
            "session:write",
          ]),
        )
        .default(["openid", "profile"]),
    }),
  ),
  async (c) => {
    const { sub } = c.get("user");
    const db = freshSupabase(c.env);
    const body = c.req.valid("json");

    const rawSecret = `rald_cs_${randomHex(32)}`;
    const secretHash = await sha256(rawSecret);

    const { data, error } = await db
      .from("rald_oauth_clients")
      .insert({
        owner_id: sub,
        name: body.name,
        description: body.description,
        logo_url: body.logo_url,
        secret_hash: secretHash,
        redirect_uris: body.redirect_uris,
        scopes: body.scopes,
      })
      .select("id, name, redirect_uris, scopes, created_at")
      .single();

    if (error) return c.json({ error: "create_failed" }, 500);

    return c.json({ client: data, client_secret: rawSecret }, 201);
  },
);

// ─── GET /api/oauth/clients ───────────────────────────────────────────────────
oauth.get("/clients", requireAuth, async (c) => {
  const { sub } = c.get("user");
  const db = freshSupabase(c.env);
  const { data: clients } = await db
    .from("rald_oauth_clients")
    .select("id, name, description, logo_url, verified, redirect_uris, scopes, status, created_at")
    .eq("owner_id", sub)
    .order("created_at", { ascending: false });
  return c.json({ clients: clients ?? [] });
});

export default oauth;
