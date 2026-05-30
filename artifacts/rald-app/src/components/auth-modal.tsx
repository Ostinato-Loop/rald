import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import {
  X, Eye, EyeOff, User, Building2, Loader2,
  ArrowLeft, Phone, Mail, KeyRound, CheckCircle2,
} from "lucide-react";
import { raldAuth } from "@/lib/rald-auth-sdk";
import type { RaldUserRole } from "@/lib/rald-auth-sdk";
import { useAuth } from "@/lib/auth-context";
import { RaldLogo } from "@/components/logo";

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = "login" | "signup";

type AuthStep =
  | "identifier"          // enter email or phone
  | "email_method"        // choose OTP vs password for email
  | "email_otp_code"      // enter email OTP code
  | "email_password"      // enter password (login or register)
  | "phone_otp_code"      // enter SMS OTP code
  | "new_user_name"       // new user: enter name (+ email if phone-first)
  | "success";

interface AuthState {
  identifier: string;
  identifierType: "email" | "phone" | "unknown";
  tab: Tab;
  step: AuthStep;
  // email OTP
  emailSessionToken: string;
  emailOtpCode: string;
  emailToken: string;   // JWT proving email ownership
  // phone OTP
  pinId: string;
  phoneOtpCode: string;
  otpToken: string;     // JWT proving phone ownership
  // password
  password: string;
  showPass: boolean;
  // new user
  name: string;
  emailForPhone: string; // collected when registering via phone OTP
  role: RaldUserRole;
  businessName: string;
  // countdown
  resendCountdown: number;
}

interface AuthModalProps {
  initialTab?: Tab;
  onClose?: () => void;
  isModal?: boolean;
}

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? "https://api.rald.cloud";

// ── Identifier detection ──────────────────────────────────────────────────────

function detectType(value: string): "email" | "phone" | "unknown" {
  const t = value.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return "email";
  const digits = t.replace(/\D/g, "");
  if (digits.length >= 10 && digits.length <= 15) return "phone";
  return "unknown";
}

// ── OTP code input component ──────────────────────────────────────────────────

function OtpCodeInput({
  value, onChange, onSubmit, disabled,
}: {
  value: string; onChange: (v: string) => void; onSubmit: () => void; disabled: boolean;
}) {
  const refs = Array.from({ length: 6 }, () => useRef<HTMLInputElement>(null));

  const handleChange = (idx: number, char: string) => {
    if (!/^\d*$/.test(char)) return;
    const arr = value.split("").slice(0, 6);
    arr[idx] = char.slice(-1);
    const next = arr.join("").padEnd(6, "").slice(0, 6).trimEnd();
    // Compact to only real digits
    const compact = arr.filter((c, i) => i <= idx || c !== "").join("").slice(0, 6);
    onChange(compact);
    if (char && idx < 5) refs[idx + 1]?.current?.focus();
    if (compact.length === 6) onSubmit();
  };

  const handleKey = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[idx] && idx > 0) refs[idx - 1]?.current?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(text);
    if (text.length === 6) { refs[5]?.current?.focus(); onSubmit(); }
  };

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={refs[i]}
          type="text"
          inputMode="numeric"
          maxLength={1}
          disabled={disabled}
          value={value[i] ?? ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-lg border border-border bg-background focus:outline-none focus:border-[#2ECFA3] focus:ring-1 focus:ring-[#2ECFA3] transition-all disabled:opacity-50"
        />
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AuthPanel({ initialTab = "login", onClose, isModal = false }: AuthModalProps) {
  const { login } = useAuth();
  const [, setLocation] = useLocation();

  const init: AuthState = {
    identifier: "", identifierType: "unknown", tab: initialTab, step: "identifier",
    emailSessionToken: "", emailOtpCode: "", emailToken: "",
    pinId: "", phoneOtpCode: "", otpToken: "",
    password: "", showPass: false,
    name: "", emailForPhone: "", role: "user", businessName: "",
    resendCountdown: 0,
  };

  const [s, setS] = useState<AuthState>(init);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Countdown timer
  useEffect(() => {
    if (s.resendCountdown <= 0) return;
    const t = setTimeout(() => setS((p) => ({ ...p, resendCountdown: p.resendCountdown - 1 })), 1000);
    return () => clearTimeout(t);
  }, [s.resendCountdown]);

  const update = (patch: Partial<AuthState>) => setS((p) => ({ ...p, ...patch }));
  const err = (msg: string) => { setError(msg); setLoading(false); };

  const afterAuth = (token: string, user: { role: string }) => {
    login(token, user as any);
    if (user.role === "merchant") setLocation("/merchant");
    else if (user.role === "admin" || user.role === "operator") window.location.href = "https://admin.rald.cloud";
    else setLocation("/dashboard");
    onClose?.();
  };

  // ── Step: identifier ─────────────────────────────────────────────────────

  const handleIdentifierContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const type = detectType(s.identifier);
    if (type === "unknown") {
      return err("Enter a valid email address or phone number (with country code).");
    }
    update({ identifierType: type });

    if (type === "phone") {
      await sendPhoneOtp();
    } else {
      update({ step: "email_method" });
    }
  };

  // ── SMS OTP ──────────────────────────────────────────────────────────────

  const sendPhoneOtp = async () => {
    setLoading(true);
    setError("");
    const phone = s.identifier.replace(/\D/g, "");
    try {
      const res = await fetch(`${API_BASE}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json() as { pinId?: string; error?: string };
      if (!res.ok) return err(data.error ?? "Failed to send code. Try again.");
      update({ pinId: data.pinId!, step: "phone_otp_code", identifierType: "phone", resendCountdown: 60 });
    } catch {
      err("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (s.phoneOtpCode.length < 6) return;
    setLoading(true); setError("");
    const phone = s.identifier.replace(/\D/g, "");
    try {
      const res = await fetch(`${API_BASE}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinId: s.pinId, pin: s.phoneOtpCode, phone }),
      });
      const data = await res.json() as any;
      if (!res.ok) return err(data.error ?? "Invalid code. Try again.");
      if (data.token) {
        afterAuth(data.token, data.user);
      } else if (data.newUser) {
        update({ otpToken: data.otpToken, step: "new_user_name" });
      }
    } catch {
      err("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Email OTP ────────────────────────────────────────────────────────────

  const sendEmailOtp = async () => {
    setLoading(true); setError("");
    const email = s.identifier.trim().toLowerCase();
    try {
      const res = await fetch(`${API_BASE}/api/auth/send-login-email-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json() as { sessionToken?: string; error?: string };
      if (!res.ok) return err(data.error ?? "Failed to send code. Try again.");
      update({ emailSessionToken: data.sessionToken!, step: "email_otp_code", resendCountdown: 60 });
    } catch {
      err("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (s.emailOtpCode.length < 6) return;
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API_BASE}/api/auth/verify-login-email-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken: s.emailSessionToken, code: s.emailOtpCode }),
      });
      const data = await res.json() as any;
      if (!res.ok) return err(data.error ?? "Invalid code. Try again.");
      if (data.token) {
        afterAuth(data.token, data.user);
      } else if (data.newUser) {
        update({ emailToken: data.emailToken, step: "new_user_name" });
      }
    } catch {
      err("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Password login ───────────────────────────────────────────────────────

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    const email = s.identifier.trim().toLowerCase();
    try {
      const res = await raldAuth.login(email, s.password);
      afterAuth(res.token, res.user);
    } catch (e: any) {
      err(e.message ?? "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  // ── Password register ────────────────────────────────────────────────────

  const handlePasswordRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!s.name.trim()) return err("Full name is required.");
    if (s.password.length < 8) return err("Password must be at least 8 characters.");
    setLoading(true); setError("");
    try {
      const res = await raldAuth.register({
        name: s.name.trim(),
        email: s.identifier.trim().toLowerCase(),
        password: s.password,
        role: s.role,
        ...(s.role === "merchant" && s.businessName ? { businessName: s.businessName.trim() } : {}),
      });
      afterAuth(res.token, res.user);
    } catch (e: any) {
      err(e.message ?? "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── New user registration (from OTP) ────────────────────────────────────

  const handleNewUserRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!s.name.trim()) return err("Full name is required.");
    setLoading(true); setError("");

    try {
      let res: any;
      if (s.otpToken) {
        // Phone OTP path — need email too
        if (!s.emailForPhone.trim()) return err("Email address is required.");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.emailForPhone)) return err("Invalid email address.");
        const r = await fetch(`${API_BASE}/api/auth/register-from-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            otpToken: s.otpToken, name: s.name.trim(),
            email: s.emailForPhone.trim().toLowerCase(),
            role: s.role,
            ...(s.role === "merchant" && s.businessName ? { businessName: s.businessName.trim() } : {}),
          }),
        });
        res = await r.json();
        if (!r.ok) return err(res.error ?? "Registration failed. Please try again.");
      } else if (s.emailToken) {
        // Email OTP path
        const r = await fetch(`${API_BASE}/api/auth/register-from-email-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            emailToken: s.emailToken, name: s.name.trim(), role: s.role,
            ...(s.role === "merchant" && s.businessName ? { businessName: s.businessName.trim() } : {}),
          }),
        });
        res = await r.json();
        if (!r.ok) return err(res.error ?? "Registration failed. Please try again.");
      }
      if (res?.token) afterAuth(res.token, res.user);
    } catch {
      err("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    setError("");
    if (s.step === "email_method") update({ step: "identifier" });
    else if (s.step === "email_otp_code") update({ step: "email_method" });
    else if (s.step === "email_password") update({ step: "email_method" });
    else if (s.step === "phone_otp_code") update({ step: "identifier" });
    else if (s.step === "new_user_name") {
      if (s.otpToken) update({ step: "phone_otp_code" });
      else update({ step: "email_otp_code" });
    }
  };

  // ── Render steps ──────────────────────────────────────────────────────────

  const isLogin = s.tab === "login";
  const identifierDisplay = s.identifier.trim();

  const renderStep = () => {
    // ── Step: identifier entry ──────────────────────────────────────────────
    if (s.step === "identifier") {
      return (
        <div>
          <div className="flex border-b border-border mb-6">
            {(["login", "signup"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => { setError(""); update({ tab: t }); }}
                className={`pb-3 pr-6 text-sm font-bold uppercase tracking-widest transition-colors ${s.tab === t ? "tab-active" : "tab-inactive"}`}
              >
                {t === "login" ? "Sign In" : "Get Started"}
              </button>
            ))}
          </div>
          <form onSubmit={handleIdentifierContinue} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
                Email or Phone Number
              </label>
              <input
                type="text"
                autoComplete="username"
                autoFocus
                required
                className="rald-input"
                placeholder="you@example.com or +2348012345678"
                value={s.identifier}
                onChange={(e) => { setError(""); update({ identifier: e.target.value }); }}
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Enter your email for password or OTP login, or your phone for SMS verification.
              </p>
            </div>
            {error && <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading || !s.identifier.trim()} className="rald-btn-primary flex items-center justify-center gap-2 mt-2">
              {loading ? <Loader2 size={14} className="animate-spin" /> : null}
              {loading ? "Checking..." : "Continue"}
            </button>
          </form>
        </div>
      );
    }

    // ── Step: email method choice ───────────────────────────────────────────
    if (s.step === "email_method") {
      return (
        <div>
          <button onClick={goBack} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-5 transition-colors">
            <ArrowLeft size={13} /> Back
          </button>
          <p className="text-sm text-muted-foreground mb-1">Signing in as</p>
          <p className="font-semibold text-foreground mb-5 truncate">{identifierDisplay}</p>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">How would you like to continue?</p>
          <div className="space-y-2">
            <button
              onClick={sendEmailOtp}
              disabled={loading}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-lg border border-border hover:border-[#2ECFA3] hover:bg-[#2ECFA3]/5 transition-all text-left group"
            >
              <div className="w-9 h-9 rounded-lg bg-[#2ECFA3]/10 flex items-center justify-center shrink-0">
                <Mail size={16} className="text-[#2ECFA3]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Email code</p>
                <p className="text-xs text-muted-foreground">We'll send a 6-digit code to your email</p>
              </div>
              {loading && <Loader2 size={14} className="animate-spin ml-auto text-muted-foreground" />}
            </button>
            <button
              onClick={() => update({ step: "email_password" })}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-lg border border-border hover:border-muted-foreground hover:bg-secondary/50 transition-all text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <KeyRound size={16} className="text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Password</p>
                <p className="text-xs text-muted-foreground">Sign in with your password</p>
              </div>
            </button>
          </div>
          {error && <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded px-3 py-2 mt-3">{error}</p>}
        </div>
      );
    }

    // ── Step: email OTP code ────────────────────────────────────────────────
    if (s.step === "email_otp_code") {
      return (
        <div>
          <button onClick={goBack} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-5 transition-colors">
            <ArrowLeft size={13} /> Back
          </button>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-[#2ECFA3]/10 flex items-center justify-center shrink-0">
              <Mail size={18} className="text-[#2ECFA3]" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">Check your email</p>
              <p className="text-xs text-muted-foreground">Code sent to <span className="text-foreground">{identifierDisplay}</span></p>
            </div>
          </div>
          <OtpCodeInput
            value={s.emailOtpCode}
            onChange={(v) => { setError(""); update({ emailOtpCode: v }); }}
            onSubmit={handleVerifyEmailOtp}
            disabled={loading}
          />
          {error && <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded px-3 py-2 mt-4">{error}</p>}
          <button
            onClick={handleVerifyEmailOtp}
            disabled={loading || s.emailOtpCode.length < 6}
            className="rald-btn-primary flex items-center justify-center gap-2 mt-5"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            {loading ? "Verifying..." : "Verify Code"}
          </button>
          <div className="text-center mt-3">
            {s.resendCountdown > 0 ? (
              <p className="text-xs text-muted-foreground">Resend in {s.resendCountdown}s</p>
            ) : (
              <button onClick={sendEmailOtp} disabled={loading} className="text-xs text-[#2ECFA3] hover:underline">
                Resend code
              </button>
            )}
          </div>
        </div>
      );
    }

    // ── Step: phone OTP code ────────────────────────────────────────────────
    if (s.step === "phone_otp_code") {
      return (
        <div>
          <button onClick={goBack} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-5 transition-colors">
            <ArrowLeft size={13} /> Back
          </button>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-[#2ECFA3]/10 flex items-center justify-center shrink-0">
              <Phone size={18} className="text-[#2ECFA3]" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">Check your phone</p>
              <p className="text-xs text-muted-foreground">Code sent to <span className="text-foreground">{identifierDisplay}</span></p>
            </div>
          </div>
          <OtpCodeInput
            value={s.phoneOtpCode}
            onChange={(v) => { setError(""); update({ phoneOtpCode: v }); }}
            onSubmit={handleVerifyPhoneOtp}
            disabled={loading}
          />
          {error && <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded px-3 py-2 mt-4">{error}</p>}
          <button
            onClick={handleVerifyPhoneOtp}
            disabled={loading || s.phoneOtpCode.length < 6}
            className="rald-btn-primary flex items-center justify-center gap-2 mt-5"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            {loading ? "Verifying..." : "Verify Code"}
          </button>
          <div className="text-center mt-3">
            {s.resendCountdown > 0 ? (
              <p className="text-xs text-muted-foreground">Resend in {s.resendCountdown}s</p>
            ) : (
              <button onClick={sendPhoneOtp} disabled={loading} className="text-xs text-[#2ECFA3] hover:underline">
                Resend code
              </button>
            )}
          </div>
        </div>
      );
    }

    // ── Step: password login / register ─────────────────────────────────────
    if (s.step === "email_password") {
      return (
        <div>
          <button onClick={goBack} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-5 transition-colors">
            <ArrowLeft size={13} /> Back
          </button>
          <p className="text-sm text-muted-foreground mb-1">Signing in as</p>
          <p className="font-semibold text-foreground mb-5 truncate">{identifierDisplay}</p>

          {isLogin ? (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={s.showPass ? "text" : "password"}
                    autoComplete="current-password"
                    autoFocus required
                    className="rald-input pr-10"
                    placeholder="••••••••"
                    value={s.password}
                    onChange={(e) => update({ password: e.target.value })}
                  />
                  <button type="button" onClick={() => update({ showPass: !s.showPass })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {s.showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              {error && <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded px-3 py-2">{error}</p>}
              <button type="submit" disabled={loading} className="rald-btn-primary flex items-center justify-center gap-2 mt-2">
                {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                {loading ? "Signing in..." : "Sign In"}
              </button>
              <p className="text-center text-xs text-muted-foreground pt-1">
                No account?{" "}
                <button type="button" onClick={() => update({ tab: "signup", step: "identifier" })} className="text-[#2ECFA3] hover:underline font-semibold">
                  Create one free
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handlePasswordRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Account Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["user", "merchant"] as const).map((role) => (
                    <button key={role} type="button" onClick={() => update({ role })}
                      className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded border text-xs font-semibold uppercase tracking-wider transition-all ${
                        s.role === role
                          ? "border-[#2ECFA3] bg-[#2ECFA3]/10 text-[#2ECFA3]"
                          : "border-border text-muted-foreground hover:border-muted-foreground"
                      }`}>
                      {role === "user" ? <User size={16} /> : <Building2 size={16} />}
                      {role === "user" ? "Personal" : "Business"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Full Name</label>
                <input type="text" autoComplete="name" required className="rald-input"
                  placeholder="Ada Okafor" value={s.name}
                  onChange={(e) => update({ name: e.target.value })} />
              </div>
              {s.role === "merchant" && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Business Name</label>
                  <input type="text" autoComplete="organization" className="rald-input"
                    placeholder="Okafor Ventures Ltd" value={s.businessName}
                    onChange={(e) => update({ businessName: e.target.value })} />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Password</label>
                <div className="relative">
                  <input type={s.showPass ? "text" : "password"} autoComplete="new-password"
                    required minLength={8} className="rald-input pr-10"
                    placeholder="Min. 8 characters" value={s.password}
                    onChange={(e) => update({ password: e.target.value })} />
                  <button type="button" onClick={() => update({ showPass: !s.showPass })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {s.showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              {error && <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded px-3 py-2">{error}</p>}
              <button type="submit" disabled={loading} className="rald-btn-primary flex items-center justify-center gap-2 mt-2">
                {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                {loading ? "Creating account..." : s.role === "merchant" ? "Create Business Account" : "Create Account"}
              </button>
              <p className="text-center text-xs text-muted-foreground pt-1">
                Already have an account?{" "}
                <button type="button" onClick={() => update({ tab: "login", step: "identifier" })} className="text-[#2ECFA3] hover:underline font-semibold">Sign in</button>
              </p>
            </form>
          )}
        </div>
      );
    }

    // ── Step: new user registration (post-OTP) ──────────────────────────────
    if (s.step === "new_user_name") {
      const isPhonePath = !!s.otpToken;
      return (
        <div>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-[#2ECFA3]/10 flex items-center justify-center shrink-0">
              <CheckCircle2 size={18} className="text-[#2ECFA3]" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">Identity verified</p>
              <p className="text-xs text-muted-foreground">Let's complete your RALD account</p>
            </div>
          </div>
          <form onSubmit={handleNewUserRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Account Type</label>
              <div className="grid grid-cols-2 gap-2">
                {(["user", "merchant"] as const).map((role) => (
                  <button key={role} type="button" onClick={() => update({ role })}
                    className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded border text-xs font-semibold uppercase tracking-wider transition-all ${
                      s.role === role
                        ? "border-[#2ECFA3] bg-[#2ECFA3]/10 text-[#2ECFA3]"
                        : "border-border text-muted-foreground hover:border-muted-foreground"
                    }`}>
                    {role === "user" ? <User size={16} /> : <Building2 size={16} />}
                    {role === "user" ? "Personal" : "Business"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Full Name</label>
              <input type="text" autoComplete="name" autoFocus required className="rald-input"
                placeholder="Ada Okafor" value={s.name}
                onChange={(e) => update({ name: e.target.value })} />
            </div>
            {isPhonePath && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Email Address</label>
                <input type="email" autoComplete="email" required className="rald-input"
                  placeholder="you@example.com" value={s.emailForPhone}
                  onChange={(e) => update({ emailForPhone: e.target.value })} />
              </div>
            )}
            {s.role === "merchant" && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Business Name</label>
                <input type="text" autoComplete="organization" className="rald-input"
                  placeholder="Okafor Ventures Ltd" value={s.businessName}
                  onChange={(e) => update({ businessName: e.target.value })} />
              </div>
            )}
            {error && <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading} className="rald-btn-primary flex items-center justify-center gap-2 mt-2">
              {loading ? <Loader2 size={14} className="animate-spin" /> : null}
              {loading ? "Creating account..." : "Create My RALD Account"}
            </button>
          </form>
        </div>
      );
    }

    return null;
  };

  const canGoBack = !["identifier"].includes(s.step) && s.step !== "email_method";
  const showLogo = true;

  const content = (
    <div className={isModal ? "w-full max-w-md" : "w-full"}>
      <div className={`${isModal ? "bg-card border border-border rounded-xl p-8" : ""} animate-scale-in`}>
        {isModal && (
          <div className="flex items-center justify-between mb-7">
            <RaldLogo dark className="h-7 w-auto" />
            {onClose && (
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded" aria-label="Close">
                <X size={18} />
              </button>
            )}
          </div>
        )}
        {renderStep()}
      </div>
    </div>
  );

  if (!isModal) return content;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}
    >
      {content}
    </div>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuthModal() {
  const [open, setOpen] = useState(false);
  const [initialTab, setInitialTab] = useState<Tab>("login");

  const openLogin  = useCallback(() => { setInitialTab("login");  setOpen(true); }, []);
  const openSignup = useCallback(() => { setInitialTab("signup"); setOpen(true); }, []);
  const close      = useCallback(() => setOpen(false), []);

  return { open, initialTab, openLogin, openSignup, close };
}
