import { Hono } from "hono";
import type { Bindings, Variables } from "../index";
import { signJwt, verifyJwt, verifyPassword, hashPassword } from "../lib/auth";
import { sendWelcomeEmail } from "../lib/email";
import { authMiddleware } from "../lib/middleware";
import { SupabaseClient } from "@supabase/supabase-js";
import {
  sendSmsOtp, verifySmsOtp,
  generateNumericOtp, sendEmailOtp, sendLoginEmailOtp,
  hashOtpCode, verifyOtpCode,
} from "../lib/otp";
import { checkRateLimit, RATE_LIMITS, getClientIp } from "../lib/rate-limit";
import { writeAuditLog } from "../lib/audit";

const auth = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ── Helpers ───────────────────────────────────────────────────────────────────

type UserRow = {
  id: string; rald_id: string | null; email: string;
  name: string | null; role: string; created_at: string;
  phone?: string | null;
};

const userShape = (u: UserRow) => ({
  id: u.id,
  raldId: u.rald_id,
  email: u.email,
  name: u.name,
  role: u.role,
  phone: u.phone ?? null,
  createdAt: u.created_at,
});

/** Generate a permanent RALD ID — format: RALD-XXXXXXXX */
async function generateRaldId(): Promise<string> {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const suffix = Array.from(bytes).map((b) => chars[b % chars.length]).join("");
  return `RALD-${suffix}`;
}

/** Hash a token for session/refresh storage */
async function hashToken(token: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Create a session record for device tracking */
async function createSession(
  db: SupabaseClient,
  userId: string,
  token: string,
  request: Request
): Promise<void> {
  try {
    const tokenHash = await hashToken(token);
    const userAgent = request.headers.get("User-Agent") ?? undefined;
    const ip = getClientIp(request);
    await db.from("sessions").insert({
      user_id: userId,
      token_hash: tokenHash,
      user_agent: userAgent,
      ip_address: ip,
      expires_at: new Date(Date.now() + 86400 * 1000).toISOString(), // 24h (matches JWT)
    });
  } catch { /* Session tracking is best-effort */ }
}

/** Update session last_seen (best-effort) */
async function touchSession(
  db: SupabaseClient,
  token: string
): Promise<void> {
  try {
    const tokenHash = await hashToken(token);
    await db.from("sessions")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("token_hash", tokenHash)
      .is("revoked_at", null);
  } catch { /* ok */ }
}

const SELECT_USER = "id,rald_id,email,name,role,created_at,phone" as const;

// ── Identifier detection ──────────────────────────────────────────────────────

function detectIdentifierType(identifier: string): "email" | "phone" | "unknown" {
  const trimmed = identifier.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "email";
  // Accepts: +234..., 0801..., 234..., etc. — strip non-digits for length check
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length >= 10 && digits.length <= 15) return "phone";
  return "unknown";
}

// ── PASSWORD AUTH ─────────────────────────────────────────────────────────────

auth.post("/login", async (c) => {
  const ip = getClientIp(c.req.raw);
  const rl = await checkRateLimit(c.env.RATE_LIMIT_KV, RATE_LIMITS.login(ip));
  if (!rl.allowed) {
    return c.json({ error: "Too many login attempts. Please wait and try again." }, 429);
  }

  const body = await c.req.json().catch(() => null) as {
    email?: string; password?: string;
  } | null;
  if (!body?.email || !body?.password) {
    return c.json({ error: "Email and password required" }, 400);
  }

  const db = c.get("db");
  const { data: users } = await db.from("users")
    .select(`${SELECT_USER},password_hash`)
    .eq("email", body.email.trim().toLowerCase()).limit(1);
  const user = users?.[0];

  if (!user || !user.password_hash || !(await verifyPassword(body.password, user.password_hash))) {
    await writeAuditLog(db, { action: "login_failed", ip, metadata: { email: body.email } });
    return c.json({ error: "Invalid email or password" }, 401);
  }

  const token = await signJwt({ id: user.id, raldId: user.rald_id, email: user.email, role: user.role }, c.env.RALD_JWT_SECRET);
  await createSession(db, user.id, token, c.req.raw);
  await writeAuditLog(db, { userId: user.id, action: "login", ip, status: "success" });
  return c.json({ token, user: userShape(user) });
});

auth.post("/register", async (c) => {
  const ip = getClientIp(c.req.raw);
  const rl = await checkRateLimit(c.env.RATE_LIMIT_KV, RATE_LIMITS.register(ip));
  if (!rl.allowed) {
    return c.json({ error: "Too many registration attempts. Please wait and try again." }, 429);
  }

  const body = await c.req.json().catch(() => null) as {
    email?: string; password?: string; name?: string;
    role?: string; businessName?: string; phone?: string;
  } | null;
  if (!body?.email || !body?.password || !body?.name) {
    return c.json({ error: "Name, email, and password are required" }, 400);
  }

  const email = body.email.trim().toLowerCase();
  const name = body.name.trim();
  const role = body.role === "merchant" ? "merchant" : "user";
  if (body.password.length < 8) return c.json({ error: "Password must be at least 8 characters" }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return c.json({ error: "Invalid email address" }, 400);

  const db = c.get("db");
  const { data: existing } = await db.from("users").select("id").eq("email", email).limit(1);
  if (existing?.length) return c.json({ error: "An account with this email already exists" }, 409);

  const password_hash = await hashPassword(body.password);
  const rald_id = await generateRaldId();
  const meta: Record<string, string> = {};
  if (body.phone?.trim()) meta.phone = body.phone.trim().replace(/\D/g, "");
  if (role === "merchant" && body.businessName) meta.business_name = body.businessName.trim();

  const insertData: Record<string, unknown> = { email, password_hash, name, role, rald_id };
  if (Object.keys(meta).length) insertData.metadata = meta;

  const { data: newUsers, error } = await db.from("users").insert(insertData)
    .select(SELECT_USER).limit(1);
  if (error || !newUsers?.length) {
    console.error("Register error:", JSON.stringify(error));
    return c.json({ error: "Failed to create account. Please try again." }, 500);
  }

  const newUser = newUsers[0]!;
  const token = await signJwt({ id: newUser.id, raldId: newUser.rald_id, email: newUser.email, role: newUser.role }, c.env.RALD_JWT_SECRET);
  await createSession(db, newUser.id, token, c.req.raw);
  await writeAuditLog(db, { userId: newUser.id, action: "register", ip, status: "success" });
  if (c.env.RESEND_API_KEY) sendWelcomeEmail(newUser.email, newUser.name ?? name, c.env.RESEND_API_KEY).catch(console.error);
  return c.json({ token, user: userShape(newUser) }, 201);
});

// ── REFRESH TOKEN ─────────────────────────────────────────────────────────────

auth.post("/refresh", async (c) => {
  const body = await c.req.json().catch(() => null) as { refreshToken?: string } | null;
  if (!body?.refreshToken) return c.json({ error: "refreshToken required" }, 400);

  const tokenHash = await hashToken(body.refreshToken);
  const db = c.get("db");

  const { data: rt } = await db.from("refresh_tokens")
    .select("id,user_id,family_id,used_at,revoked_at,expires_at")
    .eq("token_hash", tokenHash).limit(1);
  const record = rt?.[0];

  if (!record) return c.json({ error: "Invalid refresh token" }, 401);
  if (record.revoked_at) return c.json({ error: "Refresh token revoked" }, 401);
  if (new Date(record.expires_at) < new Date()) return c.json({ error: "Refresh token expired" }, 401);

  // Theft detection: if token was already used, revoke entire family
  if (record.used_at) {
    await db.from("refresh_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("family_id", record.family_id);
    return c.json({ error: "Refresh token reuse detected. All sessions revoked for security." }, 401);
  }

  // Mark old token as used
  await db.from("refresh_tokens").update({ used_at: new Date().toISOString() }).eq("id", record.id);

  // Fetch user
  const { data: users } = await db.from("users").select(SELECT_USER).eq("id", record.user_id).limit(1);
  const user = users?.[0];
  if (!user) return c.json({ error: "User not found" }, 404);

  // Issue new access token
  const accessToken = await signJwt(
    { id: user.id, raldId: user.rald_id, email: user.email, role: user.role },
    c.env.RALD_JWT_SECRET, 86400
  );

  // Issue new refresh token (rotation)
  const newRefreshToken = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const newTokenHash = await hashToken(newRefreshToken);
  await db.from("refresh_tokens").insert({
    user_id: record.user_id,
    token_hash: newTokenHash,
    family_id: record.family_id,
    expires_at: new Date(Date.now() + 90 * 86400 * 1000).toISOString(),
  });

  await createSession(db, user.id, accessToken, c.req.raw);
  await writeAuditLog(db, { userId: user.id, action: "token_refreshed", ip: getClientIp(c.req.raw) });

  return c.json({ token: accessToken, refreshToken: newRefreshToken, user: userShape(user) });
});

// ── SMS OTP AUTH ──────────────────────────────────────────────────────────────

auth.post("/send-otp", async (c) => {
  const body = await c.req.json().catch(() => null) as { phone?: string } | null;
  if (!body?.phone) return c.json({ error: "Phone number required" }, 400);

  const phone = body.phone.replace(/\D/g, "");
  if (phone.length < 10) return c.json({ error: "Invalid phone number" }, 400);

  const ip = getClientIp(c.req.raw);
  const rl = await checkRateLimit(c.env.RATE_LIMIT_KV, RATE_LIMITS.otpSend(phone));
  if (!rl.allowed) {
    return c.json({ error: "Too many verification requests. Please wait before trying again." }, 429);
  }

  const db = c.get("db");
  await writeAuditLog(db, { action: "otp_sent", ip, metadata: { channel: "sms", phoneDigits: phone.slice(-4) } });

  try {
    const result = await sendSmsOtp(phone, {
      termiiApiKey: c.env.TERMII_API_KEY,
      twilioAccountSid: c.env.TWILIO_ACCOUNT_SID,
      twilioAuthToken: c.env.TWILIO_AUTH_TOKEN,
      twilioFromNumber: c.env.TWILIO_FROM_NUMBER,
    });
    return c.json({ pinId: result.pinId, provider: result.provider, message: "Verification code sent" });
  } catch (err: unknown) {
    console.error("SMS OTP error:", err);
    return c.json({ error: err instanceof Error ? err.message : "Failed to send code. Try again." }, 502);
  }
});

auth.post("/verify-otp", async (c) => {
  const body = await c.req.json().catch(() => null) as {
    pinId?: string; pin?: string; phone?: string;
  } | null;
  if (!body?.pinId || !body?.pin || !body?.phone) {
    return c.json({ error: "pinId, pin, and phone are required" }, 400);
  }

  const ip = getClientIp(c.req.raw);
  const phone = body.phone.replace(/\D/g, "");

  const verified = await verifySmsOtp(body.pinId, body.pin, {
    termiiApiKey: c.env.TERMII_API_KEY,
    twilioAccountSid: c.env.TWILIO_ACCOUNT_SID,
    twilioAuthToken: c.env.TWILIO_AUTH_TOKEN,
    twilioFromNumber: c.env.TWILIO_FROM_NUMBER,
  });

  const db = c.get("db");
  if (!verified) {
    await writeAuditLog(db, { action: "otp_failed", ip, metadata: { channel: "sms" } });
    return c.json({ error: "Invalid or expired code. Try again." }, 401);
  }

  // Look up existing user by phone
  let existingUser: UserRow | undefined;
  try {
    const { data } = await db.from("users").select(SELECT_USER).eq("phone", phone).limit(1);
    existingUser = data?.[0];
  } catch { /* schema v1.0 */ }
  if (!existingUser) {
    const { data } = await db.from("users").select(SELECT_USER).filter("metadata->>phone", "eq", phone).limit(1);
    existingUser = data?.[0];
  }

  if (existingUser) {
    const token = await signJwt(
      { id: existingUser.id, raldId: existingUser.rald_id, email: existingUser.email, role: existingUser.role },
      c.env.RALD_JWT_SECRET
    );
    await createSession(db, existingUser.id, token, c.req.raw);
    await writeAuditLog(db, { userId: existingUser.id, action: "login", ip, status: "success", metadata: { method: "sms_otp" } });
    return c.json({ token, user: userShape(existingUser) });
  }

  const otpToken = await signJwt({ phone, purpose: "phone-verified" }, c.env.RALD_JWT_SECRET, 300);
  return c.json({ newUser: true, phone, otpToken });
});

auth.post("/register-from-otp", async (c) => {
  const body = await c.req.json().catch(() => null) as {
    otpToken?: string; name?: string; email?: string; role?: string; businessName?: string;
  } | null;
  if (!body?.otpToken || !body?.name || !body?.email) {
    return c.json({ error: "otpToken, name, and email are required" }, 400);
  }

  const payload = await verifyJwt(body.otpToken, c.env.RALD_JWT_SECRET);
  if (!payload || (payload as Record<string, unknown>).purpose !== "phone-verified") {
    return c.json({ error: "Invalid or expired phone verification token" }, 401);
  }
  const phone = (payload as Record<string, string>).phone;
  if (!phone) return c.json({ error: "Phone missing from token" }, 400);

  const email = body.email.trim().toLowerCase();
  const name = body.name.trim();
  const role = body.role === "merchant" ? "merchant" : "user";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return c.json({ error: "Invalid email address" }, 400);

  const db = c.get("db");
  const { data: existing } = await db.from("users").select("id").eq("email", email).limit(1);
  if (existing?.length) return c.json({ error: "An account with this email already exists" }, 409);

  const rald_id = await generateRaldId();
  const meta: Record<string, string> = { phone };
  if (role === "merchant" && body.businessName) meta.business_name = body.businessName.trim();

  const { data: newUsers, error } = await db.from("users")
    .insert({ email, name, role, password_hash: "", rald_id, metadata: meta })
    .select(SELECT_USER).limit(1);
  if (error || !newUsers?.length) {
    console.error("register-from-otp error:", JSON.stringify(error));
    return c.json({ error: "Failed to create account. Please try again." }, 500);
  }

  const newUser = newUsers[0]!;
  const token = await signJwt(
    { id: newUser.id, raldId: newUser.rald_id, email: newUser.email, role: newUser.role },
    c.env.RALD_JWT_SECRET
  );
  await createSession(db, newUser.id, token, c.req.raw);
  await writeAuditLog(db, { userId: newUser.id, action: "register", ip: getClientIp(c.req.raw), metadata: { method: "sms_otp" } });
  if (c.env.RESEND_API_KEY) sendWelcomeEmail(newUser.email, newUser.name ?? name, c.env.RESEND_API_KEY).catch(console.error);
  return c.json({ token, user: userShape(newUser) }, 201);
});

// ── EMAIL OTP LOGIN ───────────────────────────────────────────────────────────
// Stateless: code hash encoded in short-lived JWT — works without DB

auth.post("/send-login-email-otp", async (c) => {
  const body = await c.req.json().catch(() => null) as { email?: string } | null;
  if (!body?.email) return c.json({ error: "Email required" }, 400);

  const email = body.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return c.json({ error: "Invalid email address" }, 400);

  const ip = getClientIp(c.req.raw);
  const rl = await checkRateLimit(c.env.RATE_LIMIT_KV, RATE_LIMITS.otpSend(email));
  if (!rl.allowed) {
    return c.json({ error: "Too many verification requests. Please wait before trying again." }, 429);
  }

  const code = generateNumericOtp(6);
  const codeHash = await hashOtpCode(code);
  const sessionToken = await signJwt({ email, codeHash, purpose: "email-otp-login" }, c.env.RALD_JWT_SECRET, 600);

  const db = c.get("db");
  // Best-effort DB storage — uses 'email_login' type (v1.2 schema)
  try {
    await db.from("otps").insert({
      email, code_hash: codeHash, type: "email_login", provider: "resend",
      expires_at: new Date(Date.now() + 600000).toISOString(),
    });
  } catch { /* schema v1.0 — JWT is authoritative */ }

  await writeAuditLog(db, { action: "otp_sent", ip, metadata: { channel: "email", email } });

  if (!c.env.RESEND_API_KEY) {
    console.log(`[DEV] Email login OTP for ${email}: ${code}`);
    return c.json({ sessionToken, message: "Verification code sent to your email" });
  }
  try {
    await sendLoginEmailOtp(email, code, c.env.RESEND_API_KEY);
    return c.json({ sessionToken, message: "Verification code sent to your email" });
  } catch (err: unknown) {
    console.error("Login email OTP error:", err);
    return c.json({ error: "Failed to send verification email. Try again." }, 502);
  }
});

auth.post("/verify-login-email-otp", async (c) => {
  const body = await c.req.json().catch(() => null) as {
    sessionToken?: string; code?: string;
  } | null;
  if (!body?.sessionToken || !body?.code) {
    return c.json({ error: "sessionToken and code are required" }, 400);
  }

  const payload = await verifyJwt(body.sessionToken, c.env.RALD_JWT_SECRET);
  if (!payload || (payload as Record<string, unknown>).purpose !== "email-otp-login") {
    return c.json({ error: "Invalid or expired session. Request a new code." }, 401);
  }

  const { email, codeHash } = payload as Record<string, string>;
  if (!email || !codeHash) return c.json({ error: "Invalid session data" }, 400);

  const inputHash = await hashOtpCode(body.code.trim());
  const db = c.get("db");
  const ip = getClientIp(c.req.raw);

  if (inputHash !== codeHash) {
    await writeAuditLog(db, { action: "otp_failed", ip, metadata: { channel: "email", email } });
    return c.json({ error: "Invalid or expired code. Try again." }, 401);
  }

  // Best-effort: mark used in otps table
  try {
    const { data: otps } = await db.from("otps")
      .select("id").eq("email", email).eq("type", "email_login")
      .eq("used", false).gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }).limit(1);
    if (otps?.[0]) await db.from("otps").update({ used: true }).eq("id", otps[0].id);
  } catch { /* ok */ }

  const { data: users } = await db.from("users").select(SELECT_USER).eq("email", email).limit(1);
  const existingUser = users?.[0];

  if (existingUser) {
    const token = await signJwt(
      { id: existingUser.id, raldId: existingUser.rald_id, email: existingUser.email, role: existingUser.role },
      c.env.RALD_JWT_SECRET
    );
    await createSession(db, existingUser.id, token, c.req.raw);
    await writeAuditLog(db, { userId: existingUser.id, action: "login", ip, status: "success", metadata: { method: "email_otp" } });
    return c.json({ token, user: userShape(existingUser) });
  }

  const emailToken = await signJwt({ email, purpose: "email-verified" }, c.env.RALD_JWT_SECRET, 300);
  return c.json({ newUser: true, email, emailToken });
});

auth.post("/register-from-email-otp", async (c) => {
  const body = await c.req.json().catch(() => null) as {
    emailToken?: string; name?: string; role?: string; businessName?: string;
  } | null;
  if (!body?.emailToken || !body?.name) {
    return c.json({ error: "emailToken and name are required" }, 400);
  }

  const payload = await verifyJwt(body.emailToken, c.env.RALD_JWT_SECRET);
  if (!payload || (payload as Record<string, unknown>).purpose !== "email-verified") {
    return c.json({ error: "Invalid or expired email verification token" }, 401);
  }
  const email = (payload as Record<string, string>).email;
  if (!email) return c.json({ error: "Email missing from token" }, 400);

  const name = body.name.trim();
  const role = body.role === "merchant" ? "merchant" : "user";
  const db = c.get("db");
  const { data: existing } = await db.from("users").select("id").eq("email", email).limit(1);
  if (existing?.length) return c.json({ error: "An account with this email already exists" }, 409);

  const rald_id = await generateRaldId();
  const meta: Record<string, string> = {};
  if (role === "merchant" && body.businessName) meta.business_name = body.businessName.trim();

  const insertData: Record<string, unknown> = { email, name, role, password_hash: "", rald_id };
  if (Object.keys(meta).length) insertData.metadata = meta;

  const { data: newUsers, error } = await db.from("users")
    .insert(insertData).select(SELECT_USER).limit(1);
  if (error || !newUsers?.length) {
    console.error("register-from-email-otp error:", JSON.stringify(error));
    return c.json({ error: "Failed to create account. Please try again." }, 500);
  }

  const newUser = newUsers[0]!;
  const token = await signJwt(
    { id: newUser.id, raldId: newUser.rald_id, email: newUser.email, role: newUser.role },
    c.env.RALD_JWT_SECRET
  );
  await createSession(db, newUser.id, token, c.req.raw);
  await writeAuditLog(db, { userId: newUser.id, action: "register", ip: getClientIp(c.req.raw), metadata: { method: "email_otp" } });
  if (c.env.RESEND_API_KEY) sendWelcomeEmail(newUser.email, newUser.name ?? name, c.env.RESEND_API_KEY).catch(console.error);
  return c.json({ token, user: userShape(newUser) }, 201);
});

// ── ACCOUNT EMAIL VERIFICATION (post-login) ───────────────────────────────────

auth.post("/send-email-otp", authMiddleware, async (c) => {
  const body = await c.req.json().catch(() => null) as { email?: string } | null;
  if (!body?.email) return c.json({ error: "Email required" }, 400);

  const email = body.email.trim().toLowerCase();
  const code = generateNumericOtp(6);
  const codeHash = await hashOtpCode(code);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const db = c.get("db");

  try {
    await db.from("otps").insert({ email, code_hash: codeHash, type: "email", expires_at: expiresAt });
  } catch { /* schema v1.0 */ }

  if (!c.env.RESEND_API_KEY) {
    console.log(`[DEV] Account email OTP for ${email}: ${code}`);
    return c.json({ message: "Verification code sent to your email" });
  }
  try {
    await sendEmailOtp(email, code, c.env.RESEND_API_KEY);
    return c.json({ message: "Verification code sent to your email" });
  } catch (err: unknown) {
    console.error("Email OTP error:", err);
    return c.json({ error: "Failed to send verification email. Try again." }, 502);
  }
});

auth.post("/verify-email-otp", authMiddleware, async (c) => {
  const body = await c.req.json().catch(() => null) as { code?: string } | null;
  if (!body?.code) return c.json({ error: "Verification code required" }, 400);

  const user = c.get("user")!;
  const db = c.get("db");
  const { data: userRow } = await db.from("users").select("email").eq("id", user.id).limit(1);
  const email = userRow?.[0]?.email;
  if (!email) return c.json({ error: "User not found" }, 404);

  const now = new Date().toISOString();
  let otp: { id: string; code_hash: string } | undefined;
  try {
    const { data: otps } = await db.from("otps")
      .select("id,code_hash").eq("email", email).eq("type", "email")
      .eq("used", false).gte("expires_at", now)
      .order("created_at", { ascending: false }).limit(1);
    otp = otps?.[0];
  } catch {
    return c.json({ error: "Email verification not available yet. Contact support@rald.cloud." }, 503);
  }

  if (!otp) return c.json({ error: "No valid code found. Request a new one." }, 400);
  const match = await verifyOtpCode(body.code, otp.code_hash);
  if (!match) return c.json({ error: "Incorrect code. Try again." }, 401);

  await db.from("otps").update({ used: true }).eq("id", otp.id);
  try { await db.from("users").update({ email_verified: true }).eq("id", user.id); } catch { /* column may not exist */ }

  const { data: u } = await db.from("users").select(SELECT_USER).eq("id", user.id).limit(1);
  const updated = u?.[0];
  return c.json({ message: "Email verified successfully", user: updated ? userShape(updated) : null });
});

// ── PASSWORD RESET ────────────────────────────────────────────────────────────

auth.post("/request-password-reset", async (c) => {
  const body = await c.req.json().catch(() => null) as { email?: string } | null;
  if (!body?.email) return c.json({ error: "Email required" }, 400);

  const email = body.email.trim().toLowerCase();
  const ip = getClientIp(c.req.raw);
  const rl = await checkRateLimit(c.env.RATE_LIMIT_KV, RATE_LIMITS.passwordReset(email));
  if (!rl.allowed) {
    return c.json({ error: "Too many reset requests. Please wait before trying again." }, 429);
  }

  const db = c.get("db");
  const { data: users } = await db.from("users").select("id").eq("email", email).limit(1);
  const okMsg = { message: "If an account exists with this email, a reset code has been sent." };
  if (!users?.length) return c.json(okMsg);

  const code = generateNumericOtp(6);
  const codeHash = await hashOtpCode(code);
  try {
    await db.from("otps").insert({
      email, code_hash: codeHash, type: "password_reset",
      expires_at: new Date(Date.now() + 900000).toISOString(),
    });
  } catch { console.warn("otps table unavailable"); }

  await writeAuditLog(db, { userId: users[0]?.id, action: "password_reset_requested", ip });
  if (c.env.RESEND_API_KEY) sendEmailOtp(email, code, c.env.RESEND_API_KEY).catch((e) => console.error("Reset email error:", e));
  else console.log(`[DEV] Password reset for ${email}: ${code}`);
  return c.json(okMsg);
});

auth.post("/reset-password", async (c) => {
  const body = await c.req.json().catch(() => null) as {
    email?: string; code?: string; newPassword?: string;
  } | null;
  if (!body?.email || !body?.code || !body?.newPassword) {
    return c.json({ error: "Email, code, and new password are required" }, 400);
  }
  if (body.newPassword.length < 8) return c.json({ error: "Password must be at least 8 characters" }, 400);

  const email = body.email.trim().toLowerCase();
  const db = c.get("db");

  let otp: { id: string; code_hash: string } | undefined;
  try {
    const { data: otps } = await db.from("otps")
      .select("id,code_hash").eq("email", email).eq("type", "password_reset")
      .eq("used", false).gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }).limit(1);
    otp = otps?.[0];
  } catch {
    return c.json({ error: "Password reset not available. Contact support@rald.cloud." }, 503);
  }

  if (!otp) return c.json({ error: "No valid reset code. Request a new one." }, 400);
  const match = await verifyOtpCode(body.code, otp.code_hash);
  if (!match) return c.json({ error: "Incorrect reset code." }, 401);

  await db.from("otps").update({ used: true }).eq("id", otp.id);
  const password_hash = await hashPassword(body.newPassword);
  await db.from("users").update({ password_hash }).eq("email", email);
  await writeAuditLog(db, { action: "password_reset_completed", ip: getClientIp(c.req.raw), metadata: { email } });
  return c.json({ message: "Password updated. You can now sign in." });
});

// ── ME / SESSIONS ─────────────────────────────────────────────────────────────

auth.get("/me", authMiddleware, async (c) => {
  const user = c.get("user")!;
  const db = c.get("db");

  // Touch the session to track last_seen
  const authHeader = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) touchSession(db, authHeader.slice(7)).catch(() => {});

  const { data: users } = await db.from("users")
    .select(`${SELECT_USER},metadata,email_verified,phone_verified`)
    .eq("id", user.id).limit(1);
  const u = users?.[0];
  if (!u) return c.json({ error: "User not found" }, 404);

  const meta = u.metadata as Record<string, string> | null;
  return c.json({
    id: u.id,
    raldId: u.rald_id,
    email: u.email,
    name: u.name,
    role: u.role,
    phone: u.phone ?? meta?.phone ?? null,
    emailVerified: (u as Record<string, unknown>).email_verified ?? false,
    phoneVerified: (u as Record<string, unknown>).phone_verified ?? false,
    createdAt: u.created_at,
  });
});

auth.get("/sessions", authMiddleware, async (c) => {
  const user = c.get("user")!;
  const db = c.get("db");
  try {
    const { data } = await db.from("sessions")
      .select("id,user_agent,ip_address,device_name,trusted,last_seen_at,created_at")
      .eq("user_id", user.id).is("revoked_at", null)
      .gte("expires_at", new Date().toISOString())
      .order("last_seen_at", { ascending: false });
    return c.json(data ?? []);
  } catch { return c.json([]); }
});

auth.patch("/sessions/:id/trust", authMiddleware, async (c) => {
  const user = c.get("user")!;
  const db = c.get("db");
  await db.from("sessions")
    .update({ trusted: true })
    .eq("id", c.req.param("id")).eq("user_id", user.id);
  return c.json({ message: "Session marked as trusted" });
});

auth.delete("/sessions/:id", authMiddleware, async (c) => {
  const user = c.get("user")!;
  const db = c.get("db");
  try {
    await db.from("sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", c.req.param("id")).eq("user_id", user.id);
  } catch { /* ok */ }
  await writeAuditLog(db, { userId: user.id, action: "session_revoked", ip: getClientIp(c.req.raw) });
  return c.json({ message: "Session revoked" });
});

auth.delete("/sessions", authMiddleware, async (c) => {
  const user = c.get("user")!;
  const db = c.get("db");
  try {
    await db.from("sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("user_id", user.id).is("revoked_at", null);
    await db.from("refresh_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("user_id", user.id).is("revoked_at", null);
  } catch { /* ok */ }
  await writeAuditLog(db, { userId: user.id, action: "all_sessions_revoked", ip: getClientIp(c.req.raw) });
  return c.json({ message: "All sessions revoked" });
});

// ── IDENTIFIER DETECTION ──────────────────────────────────────────────────────

auth.post("/detect-identifier", async (c) => {
  const body = await c.req.json().catch(() => null) as { identifier?: string } | null;
  if (!body?.identifier) return c.json({ error: "identifier required" }, 400);
  const type = detectIdentifierType(body.identifier);
  return c.json({ type, identifier: body.identifier.trim() });
});

export default auth;
