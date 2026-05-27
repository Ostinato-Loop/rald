import { Hono } from "hono";
import type { Bindings, Variables } from "../index";
import { signJwt, verifyJwt, verifyPassword, hashPassword } from "../lib/auth";
import { authMiddleware } from "../lib/middleware";
import {
  sendSmsOtp,
  verifySmsOtp,
  generateNumericOtp,
  sendEmailOtp,
  hashOtpCode,
  verifyOtpCode,
} from "../lib/otp";

const auth = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ── Login (email + password) ────────────────────────────────────────────────
auth.post("/login", async (c) => {
  const body = await c.req.json().catch(() => null) as { email?: string; password?: string } | null;
  if (!body?.email || !body?.password) {
    return c.json({ error: "Email and password required" }, 400);
  }
  const db = c.get("db");
  const { data: users } = await db.from("users").select("*").eq("email", body.email.trim().toLowerCase()).limit(1);
  const user = users?.[0];
  if (!user || !user.password_hash || !(await verifyPassword(body.password, user.password_hash))) {
    return c.json({ error: "Invalid email or password" }, 401);
  }
  const token = await signJwt({ id: user.id, email: user.email, role: user.role }, c.env.RALD_JWT_SECRET);
  return c.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.created_at } });
});

// ── Register (email + password) ─────────────────────────────────────────────
auth.post("/register", async (c) => {
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
  if (existing && existing.length > 0) return c.json({ error: "An account with this email already exists" }, 409);
  const password_hash = await hashPassword(body.password);
  const metadata: Record<string, string> = {};
  if (role === "merchant" && body.businessName) metadata["business_name"] = body.businessName.trim();
  const { data: newUsers, error } = await db
    .from("users")
    .insert({ email, password_hash, name, role, phone: body.phone?.trim() || null, metadata: Object.keys(metadata).length > 0 ? metadata : null })
    .select("id, email, name, role, created_at").limit(1);
  if (error || !newUsers || newUsers.length === 0) {
    console.error("Register error:", error);
    return c.json({ error: "Failed to create account. Please try again." }, 500);
  }
  const newUser = newUsers[0];
  if (!newUser) return c.json({ error: "Failed to create account. Please try again." }, 500);
  const token = await signJwt({ id: newUser.id, email: newUser.email, role: newUser.role }, c.env.RALD_JWT_SECRET);
  return c.json({ token, user: { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role, createdAt: newUser.created_at } }, 201);
});

// ── Send SMS OTP ─────────────────────────────────────────────────────────────
auth.post("/send-otp", async (c) => {
  const body = await c.req.json().catch(() => null) as { phone?: string } | null;
  if (!body?.phone) return c.json({ error: "Phone number required" }, 400);
  const phone = body.phone.replace(/\s/g, "");
  if (phone.length < 10) return c.json({ error: "Invalid phone number" }, 400);

  if (!c.env.TERMII_API_KEY) {
    console.log(`[DEV] OTP for ${phone}: 123456`);
    return c.json({ pinId: "dev-mode-pin-id", message: "OTP sent (dev mode: use 123456)" });
  }
  try {
    const { pinId } = await sendSmsOtp(phone, c.env.TERMII_API_KEY);
    return c.json({ pinId, message: "Verification code sent" });
  } catch (err: unknown) {
    console.error("Termii error:", err);
    const msg = err instanceof Error ? err.message : "Failed to send code";
    return c.json({ error: msg }, 502);
  }
});

// ── Verify SMS OTP ───────────────────────────────────────────────────────────
auth.post("/verify-otp", async (c) => {
  const body = await c.req.json().catch(() => null) as {
    pinId?: string; pin?: string; phone?: string;
  } | null;
  if (!body?.pinId || !body?.pin || !body?.phone) {
    return c.json({ error: "pinId, pin, and phone are required" }, 400);
  }

  let verified = false;
  if (!c.env.TERMII_API_KEY || body.pinId === "dev-mode-pin-id") {
    verified = body.pin === "123456";
  } else {
    try {
      verified = await verifySmsOtp(body.pinId, body.pin, c.env.TERMII_API_KEY);
    } catch (err) {
      console.error("Termii verify error:", err);
      return c.json({ error: "Verification service error. Try again." }, 502);
    }
  }
  if (!verified) return c.json({ error: "Invalid or expired code. Try again." }, 401);

  const db = c.get("db");
  const phone = body.phone.replace(/\s/g, "");
  const { data: users } = await db.from("users").select("id, email, name, role, created_at").eq("phone", phone).limit(1);
  const existingUser = users?.[0];

  if (existingUser) {
    const token = await signJwt({ id: existingUser.id, email: existingUser.email, role: existingUser.role }, c.env.RALD_JWT_SECRET);
    return c.json({ token, user: { id: existingUser.id, email: existingUser.email, name: existingUser.name, role: existingUser.role, createdAt: existingUser.created_at } });
  }

  const otpToken = await signJwt({ phone, purpose: "phone-verified" }, c.env.RALD_JWT_SECRET, 300);
  return c.json({ newUser: true, phone, otpToken });
});

// ── Register from OTP (after phone verification) ─────────────────────────────
auth.post("/register-from-otp", async (c) => {
  const body = await c.req.json().catch(() => null) as {
    otpToken?: string; name?: string; email?: string;
    role?: string; businessName?: string;
  } | null;
  if (!body?.otpToken || !body?.name || !body?.email) {
    return c.json({ error: "otpToken, name, and email are required" }, 400);
  }
  const payload = await verifyJwt(body.otpToken, c.env.RALD_JWT_SECRET);
  if (!payload || (payload as { purpose?: string }).purpose !== "phone-verified") {
    return c.json({ error: "Invalid or expired phone verification token" }, 401);
  }
  const phone = (payload as { phone?: string }).phone;
  if (!phone) return c.json({ error: "Phone not found in token" }, 400);

  const email = body.email.trim().toLowerCase();
  const name = body.name.trim();
  const role = body.role === "merchant" ? "merchant" : "user";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return c.json({ error: "Invalid email address" }, 400);

  const db = c.get("db");
  const { data: existing } = await db.from("users").select("id").eq("email", email).limit(1);
  if (existing && existing.length > 0) return c.json({ error: "An account with this email already exists" }, 409);

  const metadata: Record<string, string> = {};
  if (role === "merchant" && body.businessName) metadata["business_name"] = body.businessName.trim();
  const { data: newUsers, error } = await db
    .from("users")
    .insert({ email, name, role, phone, phone_verified: true, password_hash: "", metadata: Object.keys(metadata).length > 0 ? metadata : null })
    .select("id, email, name, role, created_at").limit(1);
  if (error || !newUsers || newUsers.length === 0) {
    console.error("register-from-otp error:", error);
    return c.json({ error: "Failed to create account. Please try again." }, 500);
  }
  const newUser = newUsers[0];
  if (!newUser) return c.json({ error: "Failed to create account." }, 500);
  const token = await signJwt({ id: newUser.id, email: newUser.email, role: newUser.role }, c.env.RALD_JWT_SECRET);
  return c.json({ token, user: { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role, createdAt: newUser.created_at } }, 201);
});

// ── Send Email OTP ───────────────────────────────────────────────────────────
auth.post("/send-email-otp", authMiddleware, async (c) => {
  const body = await c.req.json().catch(() => null) as { email?: string } | null;
  if (!body?.email) return c.json({ error: "Email required" }, 400);
  const email = body.email.trim().toLowerCase();
  const code = generateNumericOtp(6);
  const codeHash = await hashOtpCode(code);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const db = c.get("db");
  await db.from("otps").insert({ email, code_hash: codeHash, type: "email", expires_at: expiresAt });

  if (!c.env.RESEND_API_KEY) {
    console.log(`[DEV] Email OTP for ${email}: ${code}`);
    return c.json({ message: "Email OTP sent (dev mode: check logs)" });
  }
  try {
    await sendEmailOtp(email, code, c.env.RESEND_API_KEY);
    return c.json({ message: "Verification code sent to your email" });
  } catch (err: unknown) {
    console.error("Resend error:", err);
    return c.json({ error: "Failed to send email verification. Try again." }, 502);
  }
});

// ── Verify Email OTP ─────────────────────────────────────────────────────────
auth.post("/verify-email-otp", authMiddleware, async (c) => {
  const body = await c.req.json().catch(() => null) as { code?: string } | null;
  if (!body?.code) return c.json({ error: "Verification code required" }, 400);
  const user = c.get("user")!;
  const db = c.get("db");
  const { data: userRow } = await db.from("users").select("email").eq("id", user.id).limit(1);
  const email = userRow?.[0]?.email;
  if (!email) return c.json({ error: "User not found" }, 404);

  const now = new Date().toISOString();
  const { data: otps } = await db.from("otps")
    .select("*").eq("email", email).eq("type", "email").eq("used", false)
    .gte("expires_at", now).order("created_at", { ascending: false }).limit(1);
  const otp = otps?.[0];
  if (!otp) return c.json({ error: "No valid code found. Request a new one." }, 400);

  const match = await verifyOtpCode(body.code, otp.code_hash);
  if (!match) return c.json({ error: "Incorrect code. Try again." }, 401);

  await db.from("otps").update({ used: true }).eq("id", otp.id);
  await db.from("users").update({ email_verified: true }).eq("id", user.id);
  const { data: updatedUsers } = await db.from("users").select("id,email,name,role,created_at").eq("id", user.id).limit(1);
  const u = updatedUsers?.[0];
  return c.json({ message: "Email verified", user: u ? { id: u.id, email: u.email, name: u.name, role: u.role, createdAt: u.created_at } : null });
});

// ── Request Password Reset ───────────────────────────────────────────────────
auth.post("/request-password-reset", async (c) => {
  const body = await c.req.json().catch(() => null) as { email?: string } | null;
  if (!body?.email) return c.json({ error: "Email required" }, 400);
  const email = body.email.trim().toLowerCase();
  const db = c.get("db");
  const { data: users } = await db.from("users").select("id,name").eq("email", email).limit(1);
  if (!users || users.length === 0) {
    return c.json({ message: "If an account exists with this email, a reset link has been sent." });
  }
  const user = users[0];
  if (!user) return c.json({ message: "If an account exists with this email, a reset link has been sent." });

  const code = generateNumericOtp(6);
  const codeHash = await hashOtpCode(code);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  await db.from("otps").insert({ email, code_hash: codeHash, type: "password_reset", expires_at: expiresAt });

  if (c.env.RESEND_API_KEY) {
    try {
      await sendEmailOtp(email, code, c.env.RESEND_API_KEY);
    } catch (err) {
      console.error("Resend reset error:", err);
    }
  } else {
    console.log(`[DEV] Password reset code for ${email}: ${code}`);
  }
  return c.json({ message: "If an account exists with this email, a reset code has been sent." });
});

// ── Reset Password ───────────────────────────────────────────────────────────
auth.post("/reset-password", async (c) => {
  const body = await c.req.json().catch(() => null) as { email?: string; code?: string; newPassword?: string } | null;
  if (!body?.email || !body?.code || !body?.newPassword) {
    return c.json({ error: "Email, code, and new password are required" }, 400);
  }
  if (body.newPassword.length < 8) return c.json({ error: "Password must be at least 8 characters" }, 400);
  const email = body.email.trim().toLowerCase();
  const now = new Date().toISOString();
  const db = c.get("db");
  const { data: otps } = await db.from("otps")
    .select("*").eq("email", email).eq("type", "password_reset").eq("used", false)
    .gte("expires_at", now).order("created_at", { ascending: false }).limit(1);
  const otp = otps?.[0];
  if (!otp) return c.json({ error: "No valid reset code found. Request a new one." }, 400);
  const match = await verifyOtpCode(body.code, otp.code_hash);
  if (!match) return c.json({ error: "Incorrect reset code." }, 401);
  await db.from("otps").update({ used: true }).eq("id", otp.id);
  const password_hash = await hashPassword(body.newPassword);
  await db.from("users").update({ password_hash }).eq("email", email);
  return c.json({ message: "Password updated successfully. You can now sign in." });
});

// ── Get current user ─────────────────────────────────────────────────────────
auth.get("/me", authMiddleware, async (c) => {
  const user = c.get("user")!;
  const db = c.get("db");
  const { data: users } = await db.from("users").select("id,email,name,role,phone,email_verified,phone_verified,created_at").eq("id", user.id).limit(1);
  const u = users?.[0];
  if (!u) return c.json({ error: "User not found" }, 404);
  return c.json({ id: u.id, email: u.email, name: u.name, role: u.role, phone: u.phone, emailVerified: u.email_verified, phoneVerified: u.phone_verified, createdAt: u.created_at });
});

// ── Sessions ─────────────────────────────────────────────────────────────────
auth.get("/sessions", authMiddleware, async (c) => {
  const user = c.get("user")!;
  const db = c.get("db");
  const { data: sessions } = await db.from("sessions")
    .select("id,user_agent,ip_address,last_seen_at,created_at")
    .eq("user_id", user.id).is("revoked_at", null)
    .gte("expires_at", new Date().toISOString())
    .order("last_seen_at", { ascending: false });
  return c.json(sessions ?? []);
});

auth.delete("/sessions/:id", authMiddleware, async (c) => {
  const sessionId = c.req.param("id");
  const user = c.get("user")!;
  const db = c.get("db");
  await db.from("sessions").update({ revoked_at: new Date().toISOString() })
    .eq("id", sessionId).eq("user_id", user.id);
  return c.json({ message: "Session revoked" });
});

auth.delete("/sessions", authMiddleware, async (c) => {
  const user = c.get("user")!;
  const db = c.get("db");
  await db.from("sessions").update({ revoked_at: new Date().toISOString() })
    .eq("user_id", user.id).is("revoked_at", null);
  return c.json({ message: "All sessions revoked" });
});

export default auth;
