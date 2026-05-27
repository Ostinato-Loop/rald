import { Hono } from "hono";
import type { Bindings, Variables } from "../index";
import { signJwt, verifyPassword, hashPassword } from "../lib/auth";
import { authMiddleware } from "../lib/middleware";

const auth = new Hono<{ Bindings: Bindings; Variables: Variables }>();

auth.post("/login", async (c) => {
  const body = await c.req.json().catch(() => null) as { email?: string; password?: string } | null;
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

auth.post("/register", async (c) => {
  const body = await c.req.json().catch(() => null) as {
    email?: string;
    password?: string;
    name?: string;
    role?: string;
    businessName?: string;
  } | null;

  if (!body?.email || !body?.password || !body?.name) {
    return c.json({ error: "Name, email, and password are required" }, 400);
  }

  const email = body.email.trim().toLowerCase();
  const name = body.name.trim();
  const role = body.role === "merchant" ? "merchant" : "user";

  if (body.password.length < 8) {
    return c.json({ error: "Password must be at least 8 characters" }, 400);
  }

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(email)) {
    return c.json({ error: "Invalid email address" }, 400);
  }

  const db = c.get("db");

  const { data: existing } = await db.from("users").select("id").eq("email", email).limit(1);
  if (existing && existing.length > 0) {
    return c.json({ error: "An account with this email already exists" }, 409);
  }

  const password_hash = await hashPassword(body.password);
  const metadata: Record<string, string> = {};
  if (role === "merchant" && body.businessName) {
    metadata["business_name"] = body.businessName.trim();
  }

  const { data: newUsers, error } = await db
    .from("users")
    .insert({
      email,
      password_hash,
      name,
      role,
      metadata: Object.keys(metadata).length > 0 ? metadata : null,
    })
    .select("id, email, name, role, created_at")
    .limit(1);

  if (error || !newUsers || newUsers.length === 0) {
    console.error("Register error:", error);
    return c.json({ error: "Failed to create account. Please try again." }, 500);
  }

  const newUser = newUsers[0];
  if (!newUser) {
    return c.json({ error: "Failed to create account. Please try again." }, 500);
  }

  const token = await signJwt(
    { id: newUser.id, email: newUser.email, role: newUser.role },
    c.env.RALD_JWT_SECRET
  );

  return c.json({
    token,
    user: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      createdAt: newUser.created_at,
    },
  }, 201);
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
