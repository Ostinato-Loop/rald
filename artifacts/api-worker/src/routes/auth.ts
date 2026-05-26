import { Hono } from "hono";
import type { Bindings, Variables } from "../index";
import { signJwt, verifyPassword } from "../lib/auth";
import { authMiddleware } from "../lib/middleware";

const auth = new Hono<{ Bindings: Bindings; Variables: Variables }>();

auth.post("/login", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body?.email || !body?.password) {
    return c.json({ error: "Email and password required" }, 400);
  }
  const db = c.get("db");
  const { data: users } = await db.from("users").select("*").eq("email", body.email).limit(1);
  const user = users?.[0];
  if (!user || !(await verifyPassword(body.password, user.password_hash))) {
    return c.json({ error: "Invalid email or password" }, 401);
  }
  const token = await signJwt(
    { id: user.id, email: user.email, role: user.role },
    c.env.RALD_JWT_SECRET
  );
  return c.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.created_at },
  });
});

auth.get("/me", authMiddleware, async (c) => {
  const user = c.get("user")!;
  const db = c.get("db");
  const { data: users } = await db.from("users").select("id,email,name,role,created_at").eq("id", user.id).limit(1);
  const u = users?.[0];
  if (!u) return c.json({ error: "User not found" }, 404);
  return c.json({ id: u.id, email: u.email, name: u.name, role: u.role, createdAt: u.created_at });
});

export default auth;
