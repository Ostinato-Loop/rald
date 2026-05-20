import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { freshSupabase, type Env } from "../lib/supabase";
import { generateOTP, randomHex, sha256 } from "../lib/crypto";
import { signJWT, verifyJWT } from "../lib/jwt";
import { sendOTPSMS } from "../lib/termii";
import { requireAuth } from "../middleware/auth";

const auth = new Hono<{ Bindings: Env }>();

// ─── POST /api/auth/send-otp ─────────────────────────────────────────────────
auth.post(
  "/send-otp",
  zValidator(
    "json",
    z.object({
      phone: z.string().min(10).max(15),
      purpose: z.enum(["login", "signup"]).default("login"),
    }),
  ),
  async (c) => {
    const { phone, purpose } = c.req.valid("json");
    const db = freshSupabase(c.env);
    const ip = c.req.header("CF-Connecting-IP") ?? c.req.header("X-Forwarded-For") ?? "unknown";

    // Rate limit: max 3 OTPs per phone per 10 min
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await db
      .from("rald_otp_codes")
      .select("*", { count: "exact", head: true })
      .eq("phone", phone)
      .gte("created_at", tenMinAgo);
    if ((count ?? 0) >= 3) {
      return c.json({ error: "rate_limited", retryAfter: 600 }, 429);
    }

    // If signup: check user doesn't exist. If login: check user exists.
    const { data: existingUser } = await db
      .from("rald_users")
      .select("id, status")
      .eq("phone", phone)
      .single();

    if (purpose === "login" && !existingUser) {
      return c.json({ error: "user_not_found", hint: "signup_first" }, 404);
    }
    if (purpose === "signup" && existingUser) {
      return c.json({ error: "phone_taken", hint: "use_login" }, 409);
    }
    if (existingUser?.status === "suspended") {
      return c.json({ error: "account_suspended" }, 403);
    }

    // Invalidate previous unused OTPs for this phone
    await db
      .from("rald_otp_codes")
      .update({ used: true })
      .eq("phone", phone)
      .eq("used", false);

    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await db.from("rald_otp_codes").insert({
      phone,
      code,
      purpose,
      expires_at: expiresAt,
    });

    // Send via Termii
    const smsResult = await sendOTPSMS(
      phone,
      code,
      c.env.TERMII_API_KEY,
      c.env.TERMII_SENDER_ID ?? "N-Alert",
    );

    // Audit log
    await db.from("rald_audit_logs").insert({
      user_id: existingUser?.id ?? null,
      action: "otp.sent",
      ip,
      metadata: { phone, purpose, smsSuccess: smsResult.success },
    });

    if (!smsResult.success) {
      console.error("Termii SMS failed:", smsResult.error);
      // Don't reveal SMS failure to client in prod — still return 200
      // so attackers can't enumerate delivery status
    }

    return c.json({ sent: true, expiresIn: 600 });
  },
);

// ─── POST /api/auth/verify-otp ───────────────────────────────────────────────
auth.post(
  "/verify-otp",
  zValidator(
    "json",
    z.object({
      phone: z.string().min(10).max(15),
      otp: z.string().length(6),
      purpose: z.enum(["login", "signup"]).default("login"),
      name: z.string().optional(),
    }),
  ),
  async (c) => {
    const { phone, otp, purpose, name } = c.req.valid("json");
    const db = freshSupabase(c.env);
    const ip = c.req.header("CF-Connecting-IP") ?? c.req.header("X-Forwarded-For") ?? "unknown";
    const ua = c.req.header("User-Agent") ?? "";

    // Fetch latest unused OTP
    const { data: otpRecord } = await db
      .from("rald_otp_codes")
      .select("*")
      .eq("phone", phone)
      .eq("used", false)
      .eq("purpose", purpose)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!otpRecord) {
      return c.json({ error: "otp_not_found" }, 400);
    }
    if (new Date(otpRecord.expires_at) < new Date()) {
      return c.json({ error: "otp_expired" }, 400);
    }

    // Increment attempts
    const attempts = (otpRecord.attempts ?? 0) + 1;
    if (attempts > 5) {
      await db.from("rald_otp_codes").update({ used: true }).eq("id", otpRecord.id);
      return c.json({ error: "too_many_attempts" }, 400);
    }
    await db.from("rald_otp_codes").update({ attempts }).eq("id", otpRecord.id);

    if (otpRecord.code !== otp) {
      return c.json({ error: "invalid_otp", attemptsLeft: 5 - attempts }, 400);
    }

    // Mark OTP used
    await db.from("rald_otp_codes").update({ used: true }).eq("id", otpRecord.id);

    let user: { id: string; phone: string; name: string | null; email: string | null; role: string; status: string } | null = null;

    if (purpose === "signup") {
      const { data: newUser, error } = await db
        .from("rald_users")
        .insert({ phone, name: name ?? null, role: "user", status: "active" })
        .select()
        .single();
      if (error) return c.json({ error: "signup_failed" }, 500);
      user = newUser;
      // Create wallet
      await db.from("rald_wallets").insert({ user_id: newUser.id, balance: 0, available: 0 });
    } else {
      const { data: existingUser } = await db
        .from("rald_users")
        .select("id, phone, name, email, role, status")
        .eq("phone", phone)
        .single();
      if (!existingUser) return c.json({ error: "user_not_found" }, 404);
      if (existingUser.status === "suspended") return c.json({ error: "account_suspended" }, 403);
      user = existingUser;
    }

    // Parse user agent
    const deviceInfo = parseUserAgent(ua);

    // Create session token
    const sessionToken = randomHex(48);
    const tokenHash = await sha256(sessionToken);

    // Issue JWT
    const jwt = await signJWT(
      { sub: user.id, phone: user.phone, role: user.role, sid: tokenHash.slice(0, 16) },
      c.env.JWT_SECRET,
      60 * 60 * 24 * 30, // 30 days
    );

    const jwtHash = await sha256(jwt);

    const sessionId = `sess_${randomHex(16)}`;
    await db.from("rald_sessions").insert({
      id: sessionId,
      user_id: user.id,
      token_hash: jwtHash,
      device: deviceInfo.device,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      ip,
      user_agent: ua,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    await db.from("rald_audit_logs").insert({
      user_id: user.id,
      action: purpose === "signup" ? "user.registered" : "session.created",
      ip,
      metadata: { device: deviceInfo.device, browser: deviceInfo.browser },
    });

    return c.json({
      token: jwt,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
      session: { id: sessionId, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() },
    });
  },
);

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
auth.get("/me", requireAuth, async (c) => {
  const { sub } = c.get("user");
  const db = freshSupabase(c.env);
  const { data: user, error } = await db
    .from("rald_users")
    .select("id, phone, name, email, avatar_url, role, status, created_at, metadata")
    .eq("id", sub)
    .single();
  if (error || !user) return c.json({ error: "user_not_found" }, 404);
  return c.json({ user });
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
auth.post("/logout", requireAuth, async (c) => {
  const sessionId = c.get("sessionId");
  const { sub } = c.get("user");
  const db = freshSupabase(c.env);
  const ip = c.req.header("CF-Connecting-IP") ?? "";

  await db.from("rald_sessions").update({ revoked: true }).eq("id", sessionId);
  await db.from("rald_audit_logs").insert({
    user_id: sub,
    action: "session.revoked",
    ip,
    metadata: { sessionId },
  });
  return c.json({ ok: true });
});

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────
auth.post(
  "/refresh",
  zValidator("json", z.object({ token: z.string() })),
  async (c) => {
    const { token } = c.req.valid("json");
    const db = freshSupabase(c.env);

    let payload;
    try {
      // Allow verifying even if expired (just check signature)
      payload = await verifyJWT(token, c.env.JWT_SECRET);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg !== "token_expired") return c.json({ error: "invalid_token" }, 401);
      // If expired but valid signature — still allow refresh
    }

    if (!payload) return c.json({ error: "invalid_token" }, 401);

    const hash = await sha256(token);
    const { data: session } = await db
      .from("rald_sessions")
      .select("id, user_id, revoked, expires_at")
      .eq("token_hash", hash)
      .single();

    if (!session || session.revoked) return c.json({ error: "session_not_found" }, 401);

    const { data: user } = await db
      .from("rald_users")
      .select("id, phone, role, status")
      .eq("id", session.user_id)
      .single();

    if (!user || user.status !== "active") return c.json({ error: "user_inactive" }, 403);

    const newJwt = await signJWT(
      { sub: user.id, phone: user.phone, role: user.role, sid: session.id },
      c.env.JWT_SECRET,
      60 * 60 * 24 * 30,
    );

    const newHash = await sha256(newJwt);
    await db.from("rald_sessions").update({ token_hash: newHash, last_active: new Date().toISOString() }).eq("id", session.id);

    return c.json({ token: newJwt });
  },
);

// ── Utility ───────────────────────────────────────────────────────────────────
function parseUserAgent(ua: string): { device: string; browser: string; os: string } {
  const os = ua.includes("iPhone") || ua.includes("iPad")
    ? "iOS"
    : ua.includes("Android")
    ? "Android"
    : ua.includes("Mac")
    ? "macOS"
    : ua.includes("Win")
    ? "Windows"
    : ua.includes("Linux")
    ? "Linux"
    : "Unknown";

  const browser = ua.includes("Chrome")
    ? "Chrome"
    : ua.includes("Firefox")
    ? "Firefox"
    : ua.includes("Safari")
    ? "Safari"
    : ua.includes("Edge")
    ? "Edge"
    : "Unknown";

  const device = os === "iOS" || os === "Android" ? "Mobile" : "Desktop";
  return { device, browser, os };
}

export default auth;
