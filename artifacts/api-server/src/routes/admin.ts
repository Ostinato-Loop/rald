import { Hono } from "hono";
import { freshSupabase, type Env } from "../lib/supabase";
import { requireAuth, requireAdmin } from "../middleware/auth";

const admin = new Hono<{ Bindings: Env }>();

admin.use("*", requireAuth, requireAdmin);

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
admin.get("/users", async (c) => {
  const db = freshSupabase(c.env);
  const page = Number(c.req.query("page") ?? 1);
  const limit = Math.min(Number(c.req.query("limit") ?? 50), 100);
  const search = c.req.query("search") ?? "";
  const role = c.req.query("role");
  const status = c.req.query("status");

  let query = db
    .from("rald_users")
    .select("id, phone, name, email, role, status, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (search) query = query.or(`phone.ilike.%${search}%,name.ilike.%${search}%,email.ilike.%${search}%`);
  if (role) query = query.eq("role", role);
  if (status) query = query.eq("status", status);

  const { data, count, error } = await query;
  if (error) return c.json({ error: "query_failed" }, 500);
  return c.json({ users: data ?? [], total: count ?? 0, page, limit });
});

// ─── PATCH /api/admin/users/:id ───────────────────────────────────────────────
admin.patch("/users/:id", async (c) => {
  const userId = c.req.param("id");
  const db = freshSupabase(c.env);
  const body = await c.req.json<{ status?: string; role?: string }>();
  const { sub } = c.get("user");

  const { data, error } = await db
    .from("rald_users")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select("id, phone, role, status")
    .single();

  if (error) return c.json({ error: "update_failed" }, 500);

  await db.from("rald_audit_logs").insert({
    user_id: sub,
    action: "admin.user_updated",
    metadata: { targetUserId: userId, changes: body },
  });

  return c.json({ user: data });
});

// ─── GET /api/admin/sessions ──────────────────────────────────────────────────
admin.get("/sessions", async (c) => {
  const db = freshSupabase(c.env);
  const page = Number(c.req.query("page") ?? 1);
  const limit = Math.min(Number(c.req.query("limit") ?? 50), 100);

  const { data, count } = await db
    .from("rald_sessions")
    .select(
      "id, user_id, device, browser, os, ip, location, last_active, created_at, revoked, rald_users(phone, name)",
      { count: "exact" },
    )
    .order("last_active", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  return c.json({ sessions: data ?? [], total: count ?? 0, page, limit });
});

// ─── GET /api/admin/otp-monitor ───────────────────────────────────────────────
admin.get("/otp-monitor", async (c) => {
  const db = freshSupabase(c.env);
  const since = c.req.query("since") ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: recent } = await db
    .from("rald_otp_codes")
    .select("id, phone, purpose, used, attempts, created_at, expires_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(200);

  const total = recent?.length ?? 0;
  const used = recent?.filter((o) => o.used).length ?? 0;
  const failed = recent?.filter((o) => !o.used && new Date(o.expires_at) < new Date()).length ?? 0;

  return c.json({
    summary: { total, used, failed, successRate: total > 0 ? Math.round((used / total) * 100) : 0 },
    recent: recent ?? [],
  });
});

// ─── GET /api/admin/api-traffic ───────────────────────────────────────────────
admin.get("/api-traffic", async (c) => {
  const db = freshSupabase(c.env);
  const since = c.req.query("since") ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: logs, count } = await db
    .from("rald_audit_logs")
    .select("action, created_at, ip, user_id", { count: "exact" })
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(500);

  // Aggregate by action
  const byAction: Record<string, number> = {};
  for (const log of logs ?? []) {
    byAction[log.action] = (byAction[log.action] ?? 0) + 1;
  }

  return c.json({
    total: count ?? 0,
    byAction,
    recent: (logs ?? []).slice(0, 50),
  });
});

// ─── GET /api/admin/audit-logs ────────────────────────────────────────────────
admin.get("/audit-logs", async (c) => {
  const db = freshSupabase(c.env);
  const page = Number(c.req.query("page") ?? 1);
  const limit = Math.min(Number(c.req.query("limit") ?? 50), 200);
  const action = c.req.query("action");
  const userId = c.req.query("user_id");

  let query = db
    .from("rald_audit_logs")
    .select("id, user_id, action, resource, ip, metadata, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (action) query = query.eq("action", action);
  if (userId) query = query.eq("user_id", userId);

  const { data, count } = await query;
  return c.json({ logs: data ?? [], total: count ?? 0, page, limit });
});

// ─── GET /api/admin/wallets ───────────────────────────────────────────────────
admin.get("/wallets", async (c) => {
  const db = freshSupabase(c.env);
  const { data } = await db
    .from("rald_wallets")
    .select("id, user_id, balance, available, escrow, frozen, currency, rald_users(phone, name)")
    .order("balance", { ascending: false })
    .limit(100);
  return c.json({ wallets: data ?? [] });
});

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────
admin.get("/stats", async (c) => {
  const db = freshSupabase(c.env);
  const [users, sessions, keys, clients] = await Promise.all([
    db.from("rald_users").select("id", { count: "exact", head: true }),
    db.from("rald_sessions").select("id", { count: "exact", head: true }).eq("revoked", false),
    db.from("rald_api_keys").select("id", { count: "exact", head: true }).eq("revoked", false),
    db.from("rald_oauth_clients").select("id", { count: "exact", head: true }).eq("status", "active"),
  ]);
  return c.json({
    totalUsers: users.count ?? 0,
    activeSessions: sessions.count ?? 0,
    activeApiKeys: keys.count ?? 0,
    oauthClients: clients.count ?? 0,
  });
});

export default admin;
