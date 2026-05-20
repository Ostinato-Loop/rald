import { createMiddleware } from "hono/factory";
import { verifyJWT, type JWTPayload } from "../lib/jwt";
import { freshSupabase, type Env } from "../lib/supabase";
import { sha256 } from "../lib/crypto";

declare module "hono" {
  interface ContextVariableMap {
    user: JWTPayload;
    sessionId: string;
  }
}

export const requireAuth = createMiddleware<{ Bindings: Env }>(
  async (c, next) => {
    const authHeader = c.req.header("Authorization") ?? "";
    const apiKeyHeader = c.req.header("X-API-Key") ?? "";

    // ── Bearer JWT ──────────────────────────────────────────────────────────
    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      try {
        const payload = await verifyJWT(token, c.env.JWT_SECRET);
        const db = freshSupabase(c.env);
        const hash = await sha256(token);
        const { data: session } = await db
          .from("rald_sessions")
          .select("id, revoked, expires_at")
          .eq("token_hash", hash)
          .single();
        if (!session || session.revoked || new Date(session.expires_at) < new Date()) {
          return c.json({ error: "session_revoked" }, 401);
        }
        // update last_active non-blocking
        db.from("rald_sessions")
          .update({ last_active: new Date().toISOString() })
          .eq("id", session.id)
          .then(() => {});
        c.set("user", payload);
        c.set("sessionId", session.id);
        return next();
      } catch {
        return c.json({ error: "invalid_token" }, 401);
      }
    }

    // ── X-API-Key ────────────────────────────────────────────────────────────
    if (apiKeyHeader) {
      try {
        const db = freshSupabase(c.env);
        const hash = await sha256(apiKeyHeader);
        const { data: key } = await db
          .from("rald_api_keys")
          .select("id, user_id, scopes, revoked, expires_at")
          .eq("key_hash", hash)
          .single();
        if (!key || key.revoked) {
          return c.json({ error: "invalid_api_key" }, 401);
        }
        if (key.expires_at && new Date(key.expires_at) < new Date()) {
          return c.json({ error: "api_key_expired" }, 401);
        }
        const { data: user } = await db
          .from("rald_users")
          .select("id, phone, role, status")
          .eq("id", key.user_id)
          .single();
        if (!user || user.status !== "active") {
          return c.json({ error: "user_inactive" }, 403);
        }
        db.from("rald_api_keys")
          .update({ last_used: new Date().toISOString() })
          .eq("id", key.id)
          .then(() => {});
        c.set("user", {
          sub: user.id,
          phone: user.phone,
          role: user.role,
          sid: key.id,
          scopes: key.scopes,
          iat: 0,
          exp: 0,
        });
        c.set("sessionId", key.id);
        return next();
      } catch {
        return c.json({ error: "invalid_api_key" }, 401);
      }
    }

    return c.json({ error: "unauthorized" }, 401);
  },
);

export const requireAdmin = createMiddleware<{ Bindings: Env }>(
  async (c, next) => {
    const user = c.get("user");
    if (!user || user.role !== "admin") {
      return c.json({ error: "forbidden" }, 403);
    }
    return next();
  },
);
