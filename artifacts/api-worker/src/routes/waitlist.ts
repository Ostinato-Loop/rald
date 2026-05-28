import { Hono } from "hono";
import type { Bindings, Variables } from "../index";
import { hashPassword } from "../lib/auth";
import { sendWaitlistConfirmation, sendWelcomeEmail } from "../lib/email";

const waitlist = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/* ── POST /api/waitlist/join ── Join waitlist + auto-create account ── */
waitlist.post("/join", async (c) => {
  const body = await c.req.json().catch(() => null) as {
    email?: string; name?: string; product?: string; referralCode?: string; autoCreate?: boolean;
  } | null;
  if (!body?.email) return c.json({ error: "email required" }, 400);
  const email = body.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return c.json({ error: "Invalid email" }, 400);

  const product = body.product ?? "rald.cloud";
  const name = body.name?.trim() ?? "Friend";
  const db = c.get("db");

  // Add to waitlist
  const { data: entry, error: wErr } = await db.from("waitlist")
    .upsert({ email, name, product, referral_code: body.referralCode }, { onConflict: "email,product" })
    .select().single();
  if (wErr && wErr.code !== "23505") return c.json({ error: wErr.message }, 500);

  // Auto-create user account
  const { data: existingUser } = await db.from("users").select("id").eq("email", email).limit(1);
  let userCreated = false;
  let userId: string | null = null;

  if (!existingUser?.length) {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    const tempPassword = Array.from(crypto.getRandomValues(new Uint8Array(12)))
      .map(b => chars[b % chars.length]).join("");
    const password_hash = await hashPassword(tempPassword);

    const { data: newUser } = await db.from("users")
      .insert({ email, name, password_hash, role: "user", email_verified: false })
      .select("id").single();
    if (newUser) { userCreated = true; userId = newUser.id; }
  } else {
    userId = existingUser[0]?.id ?? null;
  }

  // Send confirmation email
  if (c.env.RESEND_API_KEY) {
    try {
      await sendWaitlistConfirmation(email, name, product, c.env.RESEND_API_KEY);
    } catch (e) { console.error("Waitlist email error:", e); }
  }

  return c.json({
    ok: true,
    message: "You\'re on the waitlist! Check your email for confirmation.",
    product,
    accountCreated: userCreated,
    userId,
    entry: entry ?? { email, product },
  }, 201);
});

/* ── GET /api/waitlist/stats ── Public stats ── */
waitlist.get("/stats", async (c) => {
  const db = c.get("db");
  const product = c.req.query("product");
  let query = db.from("waitlist").select("*", { count: "exact", head: true });
  if (product) query = query.eq("product", product);
  const { count } = await query;
  return c.json({ total: count ?? 0, product: product ?? "all" });
});

/* ── GET /api/waitlist/check ── Check if email is on waitlist ── */
waitlist.get("/check", async (c) => {
  const email = c.req.query("email");
  if (!email) return c.json({ error: "email query param required" }, 400);
  const db = c.get("db");
  const { data } = await db.from("waitlist").select("product,approved,created_at").eq("email", email.toLowerCase());
  return c.json({ email, entries: data ?? [] });
});

export default waitlist;
