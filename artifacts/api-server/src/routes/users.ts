import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { freshSupabase, type Env } from "../lib/supabase";
import { randomHex, sha256 } from "../lib/crypto";
import { requireAuth } from "../middleware/auth";

const users = new Hono<{ Bindings: Env }>();

users.use("*", requireAuth);

// ─── GET /api/users/me (alias for /api/auth/me) ───────────────────────────────
users.get("/me", async (c) => {
  const { sub } = c.get("user");
  const db = freshSupabase(c.env);
  const { data: user } = await db
    .from("rald_users")
    .select("id, phone, name, email, avatar_url, role, status, created_at, metadata")
    .eq("id", sub)
    .single();
  if (!user) return c.json({ error: "not_found" }, 404);
  return c.json({ user });
});

// ─── PATCH /api/users/profile ─────────────────────────────────────────────────
users.patch(
  "/profile",
  zValidator(
    "json",
    z.object({
      name: z.string().min(1).max(100).optional(),
      email: z.string().email().optional(),
      avatar_url: z.string().url().optional(),
    }),
  ),
  async (c) => {
    const { sub } = c.get("user");
    const db = freshSupabase(c.env);
    const body = c.req.valid("json");

    const { data, error } = await db
      .from("rald_users")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", sub)
      .select("id, phone, name, email, avatar_url, role, status")
      .single();

    if (error) return c.json({ error: "update_failed" }, 500);
    return c.json({ user: data });
  },
);

// ─── GET /api/users/sessions ──────────────────────────────────────────────────
users.get("/sessions", async (c) => {
  const { sub } = c.get("user");
  const currentSid = c.get("sessionId");
  const db = freshSupabase(c.env);

  const { data: sessions } = await db
    .from("rald_sessions")
    .select("id, device, browser, os, ip, location, last_active, created_at, expires_at, revoked")
    .eq("user_id", sub)
    .eq("revoked", false)
    .gte("expires_at", new Date().toISOString())
    .order("last_active", { ascending: false });

  return c.json({
    sessions: (sessions ?? []).map((s) => ({
      ...s,
      current: s.id === currentSid,
    })),
  });
});

// ─── DELETE /api/users/sessions/:id ──────────────────────────────────────────
users.delete("/sessions/:id", async (c) => {
  const { sub } = c.get("user");
  const sessionId = c.req.param("id");
  const db = freshSupabase(c.env);
  const ip = c.req.header("CF-Connecting-IP") ?? "";

  const { error } = await db
    .from("rald_sessions")
    .update({ revoked: true })
    .eq("id", sessionId)
    .eq("user_id", sub);

  if (error) return c.json({ error: "revoke_failed" }, 500);

  await db.from("rald_audit_logs").insert({
    user_id: sub,
    action: "session.revoked",
    ip,
    metadata: { sessionId, revokedBy: sub },
  });

  return c.json({ ok: true });
});

// ─── DELETE /api/users/sessions (revoke all except current) ──────────────────
users.delete("/sessions", async (c) => {
  const { sub } = c.get("user");
  const currentSid = c.get("sessionId");
  const db = freshSupabase(c.env);

  await db
    .from("rald_sessions")
    .update({ revoked: true })
    .eq("user_id", sub)
    .neq("id", currentSid);

  return c.json({ ok: true });
});

// ─── GET /api/users/api-keys ──────────────────────────────────────────────────
users.get("/api-keys", async (c) => {
  const { sub } = c.get("user");
  const db = freshSupabase(c.env);

  const { data: keys } = await db
    .from("rald_api_keys")
    .select("id, name, key_prefix, env, scopes, last_used, created_at, revoked, expires_at")
    .eq("user_id", sub)
    .eq("revoked", false)
    .order("created_at", { ascending: false });

  return c.json({ keys: keys ?? [] });
});

// ─── POST /api/users/api-keys ─────────────────────────────────────────────────
users.post(
  "/api-keys",
  zValidator(
    "json",
    z.object({
      name: z.string().min(1).max(64),
      env: z.enum(["live", "test"]).default("live"),
      scopes: z
        .array(
          z.enum([
            "profile:read",
            "profile:write",
            "session:read",
            "session:write",
            "wallet:read",
            "wallet:write",
            "keys:read",
            "keys:write",
            "oauth:read",
          ]),
        )
        .default(["profile:read"]),
      expiresInDays: z.number().min(1).max(365).optional(),
    }),
  ),
  async (c) => {
    const { sub } = c.get("user");
    const db = freshSupabase(c.env);
    const body = c.req.valid("json");

    const rawKey = `rald_sk_${body.env === "test" ? "test" : "live"}_${randomHex(24)}`;
    const keyHash = await sha256(rawKey);
    const keyPrefix = rawKey.slice(0, 20) + "...";

    const expiresAt = body.expiresInDays
      ? new Date(Date.now() + body.expiresInDays * 86400_000).toISOString()
      : null;

    const { data, error } = await db
      .from("rald_api_keys")
      .insert({
        user_id: sub,
        name: body.name,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        env: body.env,
        scopes: body.scopes,
        expires_at: expiresAt,
      })
      .select("id, name, key_prefix, env, scopes, created_at")
      .single();

    if (error) return c.json({ error: "create_failed" }, 500);

    await db.from("rald_audit_logs").insert({
      user_id: sub,
      action: "key.created",
      metadata: { keyId: data.id, name: body.name },
    });

    // Return raw key ONCE — never stored in plaintext
    return c.json({ key: rawKey, ...data }, 201);
  },
);

// ─── DELETE /api/users/api-keys/:id ──────────────────────────────────────────
users.delete("/api-keys/:id", async (c) => {
  const { sub } = c.get("user");
  const keyId = c.req.param("id");
  const db = freshSupabase(c.env);

  const { error } = await db
    .from("rald_api_keys")
    .update({ revoked: true })
    .eq("id", keyId)
    .eq("user_id", sub);

  if (error) return c.json({ error: "revoke_failed" }, 500);

  await db.from("rald_audit_logs").insert({
    user_id: sub,
    action: "key.revoked",
    metadata: { keyId },
  });

  return c.json({ ok: true });
});

// ─── GET /api/users/wallet ────────────────────────────────────────────────────
users.get("/wallet", async (c) => {
  const { sub } = c.get("user");
  const db = freshSupabase(c.env);

  const { data: wallet } = await db
    .from("rald_wallets")
    .select("id, balance, available, escrow, frozen, currency")
    .eq("user_id", sub)
    .single();

  const { data: txns } = await db
    .from("rald_transactions")
    .select("id, type, description, amount, balance_after, status, reference, created_at")
    .eq("user_id", sub)
    .order("created_at", { ascending: false })
    .limit(20);

  return c.json({
    wallet: wallet
      ? {
          ...wallet,
          // Convert kobo → naira for display
          balance: (wallet.balance ?? 0) / 100,
          available: (wallet.available ?? 0) / 100,
          escrow: (wallet.escrow ?? 0) / 100,
          frozen: (wallet.frozen ?? 0) / 100,
        }
      : null,
    transactions: (txns ?? []).map((t) => ({
      ...t,
      amount: t.amount / 100,
      balance_after: t.balance_after / 100,
    })),
  });
});

// ─── GET /api/users/activity ──────────────────────────────────────────────────
users.get("/activity", async (c) => {
  const { sub } = c.get("user");
  const db = freshSupabase(c.env);

  const { data: logs } = await db
    .from("rald_audit_logs")
    .select("id, action, ip, metadata, created_at")
    .eq("user_id", sub)
    .order("created_at", { ascending: false })
    .limit(50);

  return c.json({ activity: logs ?? [] });
});

export default users;
