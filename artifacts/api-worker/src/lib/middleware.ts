import type { Context, Next } from "hono";
import { verifyJwt } from "./auth";
import type { Bindings, Variables } from "../index";

export async function authMiddleware(
  c: Context<{ Bindings: Bindings; Variables: Variables }>,
  next: Next
): Promise<Response | void> {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Missing or invalid authorization header" }, 401);
  }
  const token = authHeader.slice(7);
  const payload = await verifyJwt(token, c.env.RALD_JWT_SECRET);
  if (!payload) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
  c.set("user", payload);
  await next();
}

/** Require admin or operator role */
export async function adminMiddleware(
  c: Context<{ Bindings: Bindings; Variables: Variables }>,
  next: Next
): Promise<Response | void> {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  if (!["admin", "operator"].includes(user.role)) {
    return c.json({ error: "Insufficient permissions" }, 403);
  }
  await next();
}

/** API key authentication middleware (reads X-RALD-Key header) */
export async function apiKeyMiddleware(
  c: Context<{ Bindings: Bindings; Variables: Variables }>,
  next: Next
): Promise<Response | void> {
  const apiKey = c.req.header("X-RALD-Key") ?? c.req.header("Authorization")?.replace("Bearer ", "");
  if (!apiKey?.startsWith("rk_")) {
    return c.json({ error: "Valid API key required (X-RALD-Key header)" }, 401);
  }

  const keyHash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(apiKey))
    .then((buf) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join(""));

  const db = c.get("db");
  const { data: keyRecord } = await db.from("api_keys")
    .select("id,user_id,scopes,environment")
    .eq("key_hash", keyHash)
    .is("revoked_at", null)
    .single();

  if (!keyRecord) return c.json({ error: "Invalid or revoked API key" }, 401);

  // Touch last_used_at (best-effort)
  db.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRecord.id).catch(() => {});

  // Fetch user for context
  const { data: users } = await db.from("users")
    .select("id,rald_id,email,name,role,created_at")
    .eq("id", keyRecord.user_id).limit(1);
  if (!users?.[0]) return c.json({ error: "Key owner not found" }, 401);

  c.set("user", { id: users[0].id, email: users[0].email, role: users[0].role, iat: 0, exp: 0 } as any);
  await next();
}
