// RALD Developer Portal — API Key Management
// credentials.rald.cloud
// LILCKY STUDIO LIMITED

import { Hono } from "hono";
import type { Bindings, Variables } from "../index";
import { authMiddleware } from "../lib/middleware";
import { writeAuditLog } from "../lib/audit";
import { getClientIp } from "../lib/rate-limit";

const apiKeys = new Hono<{ Bindings: Bindings; Variables: Variables }>();
apiKeys.use("*", authMiddleware);

// ── Helpers ───────────────────────────────────────────────────────────────────

async function hashKey(key: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateApiKey(env: "live" | "test"): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const suffix = Array.from(bytes).map((b) => chars[b % chars.length]).join("");
  return `rk_${env}_${suffix}`;
}

// ── GET /api/api-keys — list caller's API keys ────────────────────────────────

apiKeys.get("/", async (c) => {
  const user = c.get("user")!;
  const db = c.get("db");
  const { data } = await db.from("api_keys")
    .select("id,name,key_prefix,scopes,environment,last_used_at,revoked_at,expires_at,created_at")
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });
  return c.json(data ?? []);
});

// ── POST /api/api-keys — create a new key ─────────────────────────────────────

apiKeys.post("/", async (c) => {
  const user = c.get("user")!;
  const body = await c.req.json().catch(() => null) as {
    name?: string;
    scopes?: string[];
    environment?: "live" | "test";
    expiresAt?: string;
    orgId?: string;
  } | null;

  if (!body?.name?.trim()) return c.json({ error: "name required" }, 400);

  const env: "live" | "test" = body.environment === "test" ? "test" : "live";
  const scopes = Array.isArray(body.scopes) ? body.scopes : ["read"];
  const rawKey = generateApiKey(env);
  const keyHash = await hashKey(rawKey);
  const keyPrefix = rawKey.slice(0, 16); // e.g. rk_live_AbCd12

  const db = c.get("db");
  const { data, error } = await db.from("api_keys").insert({
    user_id: user.id,
    org_id: body.orgId ?? null,
    name: body.name.trim(),
    key_prefix: keyPrefix,
    key_hash: keyHash,
    scopes: JSON.stringify(scopes),
    environment: env,
    expires_at: body.expiresAt ?? null,
  }).select("id,name,key_prefix,scopes,environment,expires_at,created_at").single();

  if (error) return c.json({ error: error.message }, 500);
  await writeAuditLog(db, {
    userId: user.id, action: "api_key_created",
    resourceType: "api_key", resourceId: data.id,
    ip: getClientIp(c.req.raw),
  });

  // Return full key ONCE — never stored in plaintext
  return c.json({ ...data, key: rawKey, warning: "Store this key securely. It will not be shown again." }, 201);
});

// ── DELETE /api/api-keys/:id — revoke ────────────────────────────────────────

apiKeys.delete("/:id", async (c) => {
  const user = c.get("user")!;
  const db = c.get("db");

  const { data: existing } = await db.from("api_keys")
    .select("id").eq("id", c.req.param("id")).eq("user_id", user.id).single();
  if (!existing) return c.json({ error: "API key not found" }, 404);

  await db.from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", c.req.param("id"));

  await writeAuditLog(db, {
    userId: user.id, action: "api_key_revoked",
    resourceType: "api_key", resourceId: c.req.param("id"),
    ip: getClientIp(c.req.raw),
  });
  return c.json({ message: "API key revoked" });
});

// ── POST /api/api-keys/:id/rotate — rotate key ───────────────────────────────

apiKeys.post("/:id/rotate", async (c) => {
  const user = c.get("user")!;
  const db = c.get("db");

  const { data: existing } = await db.from("api_keys")
    .select("id,name,environment,scopes,org_id,expires_at")
    .eq("id", c.req.param("id")).eq("user_id", user.id).single();
  if (!existing) return c.json({ error: "API key not found" }, 404);

  // Revoke old key
  await db.from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", existing.id);

  // Generate replacement
  const env = (existing.environment ?? "live") as "live" | "test";
  const rawKey = generateApiKey(env);
  const keyHash = await hashKey(rawKey);
  const keyPrefix = rawKey.slice(0, 16);

  const { data: newKey, error } = await db.from("api_keys").insert({
    user_id: user.id,
    org_id: existing.org_id,
    name: existing.name,
    key_prefix: keyPrefix,
    key_hash: keyHash,
    scopes: existing.scopes,
    environment: env,
    expires_at: existing.expires_at,
  }).select("id,name,key_prefix,scopes,environment,expires_at,created_at").single();

  if (error) return c.json({ error: error.message }, 500);
  await writeAuditLog(db, {
    userId: user.id, action: "api_key_rotated",
    resourceType: "api_key", resourceId: existing.id,
    ip: getClientIp(c.req.raw),
    metadata: { newKeyId: newKey.id },
  });
  return c.json({ ...newKey, key: rawKey, warning: "Store this key securely. It will not be shown again." });
});

export default apiKeys;
