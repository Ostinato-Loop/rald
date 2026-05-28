import { Hono } from "hono";
import type { Bindings, Variables } from "../index";

const referrals = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/* ── POST /api/referrals/generate ── Generate a referral code for a user */
referrals.post("/generate", async (c) => {
  const body = await c.req.json().catch(() => ({})) as { userId?: string; email?: string };
  const db = c.get("db");

  // Find or create a user record
  let userId = body.userId;
  if (!userId && body.email) {
    const { data: u } = await db.from("users").select("id").eq("email", body.email.toLowerCase()).single();
    userId = u?.id;
  }
  if (!userId) userId = crypto.randomUUID();

  // Generate a short unique code
  const code = Array.from(crypto.getRandomValues(new Uint8Array(5)))
    .map(b => "ABCDEFGHJKMNPQRSTUVWXYZ23456789"[b % 32])
    .join("");

  const { data, error } = await db
    .from("referral_codes")
    .insert({ user_id: userId, code, max_uses: 20, use_count: 0, is_active: true })
    .select()
    .single();
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ code: data.code, userId, referralUrl: `https://rald.cloud?ref=${data.code}` }, 201);
});

/* ── POST /api/referrals/join ── Use a referral code */
referrals.post("/join", async (c) => {
  const body = await c.req.json().catch(() => ({})) as { code?: string; refereeId?: string; refereeEmail?: string };
  if (!body.code) return c.json({ error: "code required" }, 400);
  const db = c.get("db");

  const { data: rc } = await db
    .from("referral_codes")
    .select("*")
    .eq("code", body.code.toUpperCase())
    .eq("is_active", true)
    .single();
  if (!rc) return c.json({ error: "Invalid or expired referral code" }, 404);
  if (rc.use_count >= rc.max_uses) return c.json({ error: "Referral code has reached its usage limit" }, 410);

  let refereeId = body.refereeId;
  if (!refereeId && body.refereeEmail) {
    const { data: u } = await db.from("users").select("id").eq("email", body.refereeEmail.toLowerCase()).single();
    refereeId = u?.id;
  }

  const { data: referral, error } = await db
    .from("referrals")
    .insert({ referral_code_id: rc.id, referee_id: refereeId ?? null, status: "pending" })
    .select()
    .single();
  if (error && error.code !== "23505") return c.json({ error: error.message }, 500);

  // Increment use count
  await db.from("referral_codes").update({ use_count: rc.use_count + 1 }).eq("id", rc.id);

  return c.json({ ok: true, referral, referrerId: rc.user_id });
});

/* ── GET /api/referrals/code/:code ── Look up a referral code */
referrals.get("/code/:code", async (c) => {
  const db = c.get("db");
  const { data, error } = await db
    .from("referral_codes")
    .select("id,code,use_count,max_uses,is_active,created_at")
    .eq("code", c.req.param("code").toUpperCase())
    .single();
  if (error || !data) return c.json({ error: "Not found" }, 404);
  return c.json({ ...data, valid: data.is_active && data.use_count < data.max_uses });
});

/* ── GET /api/referrals/stats ── Aggregate referral stats */
referrals.get("/stats", async (c) => {
  const db = c.get("db");
  const { count: totalCodes } = await db.from("referral_codes").select("*", { count: "exact", head: true });
  const { count: totalReferrals } = await db.from("referrals").select("*", { count: "exact", head: true });
  const { count: confirmed } = await db.from("referrals").select("*", { count: "exact", head: true }).eq("status", "confirmed");
  return c.json({ totalCodes: totalCodes ?? 0, totalReferrals: totalReferrals ?? 0, confirmed: confirmed ?? 0 });
});

export default referrals;
