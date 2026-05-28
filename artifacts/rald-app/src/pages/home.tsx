// app.rald.cloud — RALD Identity Portal
// LILCKY STUDIO LIMITED — Sovereign Authentication
import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { RaldLogo } from "@/components/logo";
import { useAuth } from "@/lib/auth-context";
import { raldAuth, type RaldNewUserSms, type RaldNewUserEmail } from "@/lib/rald-auth-sdk";

// ── Types ────────────────────────────────────────────────────────────────────
type AuthMethod = "sms" | "email";
type Step =
  | "method"    // choose SMS or Email
  | "phone"     // enter phone for SMS
  | "sms-otp"   // enter SMS OTP
  | "email-in"  // enter email for Email OTP
  | "email-otp" // enter Email OTP
  | "create"    // fill name/role after phone verify
  | "create-email" // fill name/role after email verify
  | "password"  // password login
  | "forgot"    // password reset

const COUNTRIES = [
  { flag: "🇳🇬", code: "+234", name: "Nigeria" },
  { flag: "🇬🇭", code: "+233", name: "Ghana" },
  { flag: "🇰🇪", code: "+254", name: "Kenya" },
  { flag: "🇿🇦", code: "+27", name: "South Africa" },
  { flag: "🇺🇬", code: "+256", name: "Uganda" },
  { flag: "🇹🇿", code: "+255", name: "Tanzania" },
  { flag: "🇸🇳", code: "+221", name: "Senegal" },
  { flag: "🇨🇮", code: "+225", name: "Côte d'Ivoire" },
  { flag: "🇨🇲", code: "+237", name: "Cameroon" },
  { flag: "🇪🇹", code: "+251", name: "Ethiopia" },
  { flag: "🇬🇧", code: "+44", name: "United Kingdom" },
  { flag: "🇺🇸", code: "+1", name: "United States" },
];

// ── OTP Boxes ─────────────────────────────────────────────────────────────────
function OtpBoxes({ value, onChange, autoFocusFirst = false }: { value: string[]; onChange: (v: string[]) => void; autoFocusFirst?: boolean }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  useEffect(() => { if (autoFocusFirst) refs.current[0]?.focus(); }, [autoFocusFirst]);
  const change = (i: number, raw: string) => {
    const d = raw.replace(/\D/g, "").slice(-1);
    const next = [...value]; next[i] = d; onChange(next);
    if (d && i < 5) refs.current[i + 1]?.focus();
  };
  const keydown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !value[i] && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < 5) refs.current[i + 1]?.focus();
  };
  const paste = (e: React.ClipboardEvent) => {
    const p = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (p.length) { const next = [...value]; p.split("").forEach((c, i) => { if (i < 6) next[i] = c; }); onChange(next); refs.current[Math.min(p.length, 5)]?.focus(); }
    e.preventDefault();
  };
  return (
    <div style={{ display: "flex", gap: 8 }} onPaste={paste}>
      {value.map((v, i) => (
        <input key={i} ref={el => { refs.current[i] = el; }} type="text" inputMode="numeric" pattern="[0-9]*"
          maxLength={1} value={v} onChange={e => change(i, e.target.value)} onKeyDown={e => keydown(i, e)}
          className="otp-input" autoComplete={i === 0 ? "one-time-code" : "off"} style={{ flex: 1, minWidth: 0 }} />
      ))}
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────
const Err = ({ msg }: { msg: string }) => !msg ? null : (
  <p style={{ fontSize: "0.8rem", color: "#E63946", marginBottom: 12, padding: "8px 12px", background: "rgba(230,57,70,0.08)", borderRadius: 6, border: "1px solid rgba(230,57,70,0.2)" }}>{msg}</p>
);
const Info = ({ msg }: { msg: string }) => !msg ? null : (
  <p style={{ fontSize: "0.8rem", color: "#2ECFA3", marginBottom: 12, padding: "8px 12px", background: "rgba(46,207,163,0.08)", borderRadius: 6, border: "1px solid rgba(46,207,163,0.2)" }}>{msg}</p>
);
const LinkBtn = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
  <button type="button" onClick={onClick} style={{ background: "none", border: "none", color: "#2ECFA3", fontSize: "0.875rem", cursor: "pointer", padding: 0, textDecoration: "none" }}>{children}</button>
);
const GhostBtn = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
  <button type="button" onClick={onClick} style={{ background: "none", border: "none", color: "hsl(215 20% 50%)", fontSize: "0.8rem", cursor: "pointer", padding: 0 }}>{children}</button>
);

// ── Brand panel (desktop left) ────────────────────────────────────────────────
function BrandPanel() {
  const features = [
    { icon: "📱", label: "SMS OTP", sub: "12 African carriers" },
    { icon: "📧", label: "Email OTP", sub: "Instant delivery" },
    { icon: "🔐", label: "JWT Auth", sub: "Edge-native" },
    { icon: "⚡", label: "Cloudflare", sub: "Global edge" },
    { icon: "🛡️", label: "Zero-storage", sub: "Stateless OTPs" },
    { icon: "🌍", label: "Africa-first", sub: "Built for scale" },
  ];
  return (
    <div className="rald-brand-panel">
      {/* Logo */}
      <div style={{ marginBottom: 32 }}>
        <RaldLogo dark className="h-10 w-auto" />
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2ECFA3", display: "inline-block", boxShadow: "0 0 6px #2ECFA3" }} />
          <span style={{ fontSize: "0.7rem", color: "#2ECFA3", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Live · Production</span>
        </div>
      </div>

      {/* Headline */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 900, lineHeight: 1.2, color: "#F0F4F8", margin: "0 0 12px", letterSpacing: "-0.02em" }}>
          Sovereign Identity<br />
          <span style={{ color: "#2ECFA3" }}>for Africa's</span><br />
          Digital Economy
        </h1>
        <p style={{ fontSize: "0.875rem", color: "hsl(215 20% 50%)", lineHeight: 1.6, margin: 0 }}>
          RALD is the authentication layer for the entire LILCKY STUDIO ecosystem — phone-first, email-optional, always encrypted.
        </p>
      </div>

      {/* Feature grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 32 }}>
        {features.map(f => (
          <div key={f.label} style={{ background: "hsl(222 45% 7%)", border: "1px solid hsl(220 30% 13%)", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: 10 }}>
            <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>{f.icon}</span>
            <div>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#F0F4F8" }}>{f.label}</div>
              <div style={{ fontSize: "0.7rem", color: "hsl(215 20% 45%)", marginTop: 2 }}>{f.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Owner badge */}
      <div style={{ borderTop: "1px solid hsl(220 30% 13%)", paddingTop: 20 }}>
        <p style={{ fontSize: "0.7rem", color: "hsl(215 20% 38%)", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>Built by</p>
        <div style={{ background: "hsl(222 45% 7%)", border: "1px solid hsl(220 30% 13%)", borderRadius: 8, padding: "10px 14px", display: "inline-block" }}>
          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#F0F4F8", letterSpacing: "0.02em" }}>LILCKY STUDIO LIMITED</span>
        </div>
        <p style={{ fontSize: "0.7rem", color: "hsl(215 20% 35%)", margin: "12px 0 0", lineHeight: 1.5 }}>
          "Building sovereign digital infrastructure for Africa — starting with identity."
        </p>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Home() {
  const { user, loading, login } = useAuth();
  const [, setLocation] = useLocation();

  // state
  const [method, setMethod] = useState<AuthMethod>("sms");
  const [step, setStep] = useState<Step>("phone");
  const [tab, setTab] = useState<"signin" | "create">("signin");
  const [country, setCountry] = useState("+234");
  const [phone, setPhone] = useState("");
  const [pinId, setPinId] = useState("");
  const [smsOtp, setSmsOtp] = useState(["","","","","",""]);
  const [email, setEmail] = useState("");
  const [emailSessionToken, setEmailSessionToken] = useState("");
  const [emailOtp, setEmailOtp] = useState(["","","","","",""]);
  const [name, setName] = useState("");
  const [role, setRole] = useState<"user" | "merchant">("user");
  const [businessName, setBusinessName] = useState("");
  const [smsOtpToken, setSmsOtpToken] = useState("");
  const [emailVerifyToken, setEmailVerifyToken] = useState("");
  const [password, setPassword] = useState("");
  const [forgotCode, setForgotCode] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!loading && user) {
      if (user.role === "merchant") setLocation("/merchant");
      else if (user.role === "user") setLocation("/dashboard");
      else window.location.href = "https://admin.rald.cloud";
    }
  }, [user, loading, setLocation]);

  const startCooldown = useCallback(() => {
    setCooldown(60);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setCooldown(s => { if (s <= 1) { clearInterval(timerRef.current!); return 0; } return s - 1; }), 1000);
  }, []);

  const reset = useCallback(() => {
    setStep(method === "sms" ? "phone" : "email-in");
    setSmsOtp(["","","","","",""]); setEmailOtp(["","","","","",""]);
    setPinId(""); setSmsOtpToken(""); setEmailSessionToken(""); setEmailVerifyToken("");
    setErr(""); setInfo(""); setPhone(""); setEmail(""); setName(""); setPassword("");
    setForgotCode(""); setNewPwd(""); setCooldown(0);
    if (timerRef.current) clearInterval(timerRef.current);
  }, [method]);

  const switchMethod = (m: AuthMethod) => {
    setMethod(m);
    setStep(m === "sms" ? "phone" : "email-in");
    setErr(""); setInfo("");
    setSmsOtp(["","","","","",""]); setEmailOtp(["","","","","",""]);
  };

  const switchTab = (t: "signin" | "create") => { setTab(t); reset(); };
  const fullPhone = `${country}${phone.replace(/^0/, "")}`;
  const selectedCountry = COUNTRIES.find(c => c.code === country) ?? COUNTRIES[0]!;

  // ── SMS handlers ─────────────────────────────────────────────────────────
  const handleSendSms = async () => {
    if (!phone.trim()) { setErr("Enter your phone number"); return; }
    setBusy(true); setErr("");
    try {
      const res = await raldAuth.sendSmsOtp(fullPhone);
      setPinId(res.pinId); setStep("sms-otp"); setSmsOtp(["","","","","",""]); startCooldown();
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : "Failed to send code"); }
    finally { setBusy(false); }
  };

  const handleVerifySms = async () => {
    const code = smsOtp.join("");
    if (code.length < 6) { setErr("Enter the 6-digit code"); return; }
    setBusy(true); setErr("");
    try {
      const res = await raldAuth.verifySmsOtp(pinId, code, fullPhone);
      if ("token" in res) { login(res.token, res.user); }
      else { setSmsOtpToken((res as RaldNewUserSms).otpToken); setStep("create"); }
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : "Invalid code"); }
    finally { setBusy(false); }
  };

  const handleCreateFromSms = async () => {
    if (!name.trim()) { setErr("Enter your full name"); return; }
    if (!email.trim()) { setErr("Enter your email address"); return; }
    setBusy(true); setErr("");
    try {
      const res = await raldAuth.registerFromSmsOtp({ otpToken: smsOtpToken, name, email, role, businessName: businessName || undefined });
      login(res.token, res.user);
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : "Registration failed"); }
    finally { setBusy(false); }
  };

  // ── Email OTP handlers ───────────────────────────────────────────────────
  const handleSendEmailOtp = async () => {
    if (!email.trim()) { setErr("Enter your email address"); return; }
    setBusy(true); setErr("");
    try {
      const res = await raldAuth.sendEmailLoginOtp(email);
      setEmailSessionToken(res.sessionToken); setStep("email-otp"); setEmailOtp(["","","","","",""]); startCooldown();
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : "Failed to send code"); }
    finally { setBusy(false); }
  };

  const handleVerifyEmailOtp = async () => {
    const code = emailOtp.join("");
    if (code.length < 6) { setErr("Enter the 6-digit code"); return; }
    setBusy(true); setErr("");
    try {
      const res = await raldAuth.verifyEmailLoginOtp(emailSessionToken, code);
      if ("token" in res) { login(res.token, res.user); }
      else { setEmailVerifyToken((res as RaldNewUserEmail).emailToken); setStep("create-email"); }
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : "Invalid code"); }
    finally { setBusy(false); }
  };

  const handleCreateFromEmail = async () => {
    if (!name.trim()) { setErr("Enter your full name"); return; }
    setBusy(true); setErr("");
    try {
      const res = await raldAuth.registerFromEmailOtp({ emailToken: emailVerifyToken, name, role, businessName: businessName || undefined });
      login(res.token, res.user);
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : "Registration failed"); }
    finally { setBusy(false); }
  };

  // ── Password handlers ────────────────────────────────────────────────────
  const handlePasswordLogin = async () => {
    if (!email.trim()) { setErr("Enter your email"); return; }
    if (!password) { setErr("Enter your password"); return; }
    setBusy(true); setErr("");
    try { const res = await raldAuth.login(email, password); login(res.token, res.user); }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : "Invalid credentials"); }
    finally { setBusy(false); }
  };

  const handleForgotRequest = async () => {
    if (!email.trim()) { setErr("Enter your email"); return; }
    setBusy(true); setErr(""); setInfo("");
    try { await raldAuth.requestPasswordReset(email); setInfo("If this email has an account, a 6-digit code was sent."); }
    catch { setInfo("If this email has an account, a 6-digit code was sent."); }
    finally { setBusy(false); }
  };

  const handleForgotReset = async () => {
    if (forgotCode.length < 6) { setErr("Enter the 6-digit code"); return; }
    if (newPwd.length < 8) { setErr("Password must be at least 8 characters"); return; }
    setBusy(true); setErr("");
    try {
      await raldAuth.resetPassword(email, forgotCode, newPwd);
      setInfo("Password updated. You can now sign in."); setStep("password"); setForgotCode(""); setNewPwd("");
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : "Reset failed"); }
    finally { setBusy(false); }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: "100svh", display: "flex", alignItems: "center", justifyContent: "center", background: "hsl(224 50% 5%)" }}>
      <RaldLogo dark className="h-10 w-auto" style={{ animation: "pulse 2s infinite" }} />
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="rald-root">
      {/* Brand panel — desktop only */}
      <BrandPanel />

      {/* Auth panel */}
      <div className="rald-auth-panel">
        {/* Mobile logo */}
        <div className="rald-mobile-logo">
          <RaldLogo dark className="h-9 w-auto" />
          <p style={{ marginTop: 8, fontSize: "0.62rem", fontWeight: 600, letterSpacing: "0.2em", color: "hsl(215 20% 42%)", textTransform: "uppercase", textAlign: "center" }}>
            Root Authentication &amp; Login Directory
          </p>
        </div>

        {/* Auth method tabs (SMS / Email) */}
        <div className="rald-method-tabs">
          {(["sms", "email"] as const).map(m => (
            <button key={m} type="button"
              className={`rald-method-tab${method === m ? " active" : ""}`}
              onClick={() => { switchMethod(m); setTab("signin"); }}>
              {m === "sms" ? "📱 Phone" : "📧 Email"}
            </button>
          ))}
        </div>

        {/* Sign in / Create tabs */}
        <div className="tab-switcher" style={{ marginBottom: 16 }}>
          {(["signin", "create"] as const).map(t => (
            <button key={t} type="button" className={`tab-pill${tab === t ? " active" : ""}`} onClick={() => switchTab(t)}>
              {t === "signin" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        {/* Auth card */}
        <div className="rald-card">

          {/* ── SMS: Phone step ── */}
          {method === "sms" && step === "phone" && (
            <div className="animate-slide-in">
              <h2 className="rald-step-title">{tab === "signin" ? "Welcome back" : "Create your account"}</h2>
              <p className="rald-step-subtitle">Enter your phone number to receive a verification code</p>
              <div style={{ display: "flex", marginBottom: 16 }}>
                <select value={country} onChange={e => setCountry(e.target.value)} className="country-select">
                  {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
                </select>
                <input type="tel" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSendSms()}
                  placeholder="801 234 5678" className="rald-input" style={{ flex: 1, borderRadius: "0 8px 8px 0", borderLeft: "none" }} />
              </div>
              <Err msg={err} />
              <button type="button" className="rald-btn-primary" onClick={handleSendSms} disabled={busy} style={{ marginBottom: 14 }}>
                {busy ? "Sending…" : <><span>Send code</span><span>→</span></>}
              </button>
              {tab === "signin" && <LinkBtn onClick={() => { setStep("password"); setErr(""); }}>Use password instead</LinkBtn>}
            </div>
          )}

          {/* ── SMS: OTP step ── */}
          {method === "sms" && step === "sms-otp" && (
            <div className="animate-slide-in">
              <h2 className="rald-step-title">Enter your code</h2>
              <p className="rald-step-subtitle">Sent to <strong style={{ color: "#F0F4F8" }}>{selectedCountry.flag} {country} {phone}</strong></p>
              <div style={{ marginBottom: 20 }}><OtpBoxes value={smsOtp} onChange={setSmsOtp} autoFocusFirst /></div>
              <Err msg={err} />
              <button type="button" className="rald-btn-primary" onClick={handleVerifySms} disabled={busy || smsOtp.join("").length < 6} style={{ marginBottom: 14 }}>
                {busy ? "Verifying…" : "Verify & continue"}
              </button>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <GhostBtn onClick={() => { setStep("phone"); setErr(""); setSmsOtp(["","","","","",""]); }}>← Change number</GhostBtn>
                <span style={{ color: "hsl(215 20% 30%)" }}>·</span>
                <button type="button" onClick={cooldown > 0 ? undefined : handleSendSms} disabled={cooldown > 0}
                  style={{ background: "none", border: "none", color: cooldown > 0 ? "hsl(215 20% 38%)" : "#2ECFA3", fontSize: "0.8rem", cursor: cooldown > 0 ? "not-allowed" : "pointer", padding: 0 }}>
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                </button>
              </div>
            </div>
          )}

          {/* ── SMS: Create account step ── */}
          {step === "create" && (
            <div className="animate-slide-in">
              <h2 className="rald-step-title">Almost there</h2>
              <p className="rald-step-subtitle">Phone verified ✓ — complete your profile</p>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Full name" className="rald-input" style={{ marginBottom: 10 }} autoFocus />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" className="rald-input" style={{ marginBottom: 14 }} />
              <RoleSelector role={role} onChange={setRole} businessName={businessName} onBizName={setBusinessName} />
              <Err msg={err} />
              <button type="button" className="rald-btn-primary" onClick={handleCreateFromSms} disabled={busy}>
                {busy ? "Creating account…" : "Create account →"}
              </button>
            </div>
          )}

          {/* ── Email: Enter email step ── */}
          {method === "email" && step === "email-in" && (
            <div className="animate-slide-in">
              <h2 className="rald-step-title">{tab === "signin" ? "Welcome back" : "Create your account"}</h2>
              <p className="rald-step-subtitle">Enter your email to receive a 6-digit sign-in code</p>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSendEmailOtp()}
                placeholder="you@example.com" className="rald-input" style={{ marginBottom: 16 }} autoFocus />
              <Err msg={err} />
              <button type="button" className="rald-btn-primary" onClick={handleSendEmailOtp} disabled={busy} style={{ marginBottom: 14 }}>
                {busy ? "Sending…" : <><span>Send code</span><span>→</span></>}
              </button>
              {tab === "signin" && <LinkBtn onClick={() => { setStep("password"); setErr(""); }}>Use password instead</LinkBtn>}
            </div>
          )}

          {/* ── Email: OTP step ── */}
          {method === "email" && step === "email-otp" && (
            <div className="animate-slide-in">
              <h2 className="rald-step-title">Check your inbox</h2>
              <p className="rald-step-subtitle">Code sent to <strong style={{ color: "#F0F4F8" }}>{email}</strong></p>
              <div style={{ marginBottom: 20 }}><OtpBoxes value={emailOtp} onChange={setEmailOtp} autoFocusFirst /></div>
              <Err msg={err} />
              <button type="button" className="rald-btn-primary" onClick={handleVerifyEmailOtp} disabled={busy || emailOtp.join("").length < 6} style={{ marginBottom: 14 }}>
                {busy ? "Verifying…" : "Verify & continue"}
              </button>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <GhostBtn onClick={() => { setStep("email-in"); setErr(""); setEmailOtp(["","","","","",""]); }}>← Change email</GhostBtn>
                <span style={{ color: "hsl(215 20% 30%)" }}>·</span>
                <button type="button" onClick={cooldown > 0 ? undefined : handleSendEmailOtp} disabled={cooldown > 0}
                  style={{ background: "none", border: "none", color: cooldown > 0 ? "hsl(215 20% 38%)" : "#2ECFA3", fontSize: "0.8rem", cursor: cooldown > 0 ? "not-allowed" : "pointer", padding: 0 }}>
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                </button>
              </div>
            </div>
          )}

          {/* ── Email: Create account step ── */}
          {step === "create-email" && (
            <div className="animate-slide-in">
              <h2 className="rald-step-title">Almost there</h2>
              <p className="rald-step-subtitle">Email verified ✓ — complete your profile</p>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Full name" className="rald-input" style={{ marginBottom: 14 }} autoFocus />
              <RoleSelector role={role} onChange={setRole} businessName={businessName} onBizName={setBusinessName} />
              <Err msg={err} />
              <button type="button" className="rald-btn-primary" onClick={handleCreateFromEmail} disabled={busy}>
                {busy ? "Creating account…" : "Create account →"}
              </button>
            </div>
          )}

          {/* ── Password login ── */}
          {step === "password" && (
            <div className="animate-slide-in">
              <h2 className="rald-step-title">Sign in</h2>
              <p className="rald-step-subtitle">Enter your email and password</p>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" className="rald-input" style={{ marginBottom: 10 }} autoFocus />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handlePasswordLogin()} placeholder="Password" className="rald-input" style={{ marginBottom: 6 }} />
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
                <LinkBtn onClick={() => { setStep("forgot"); setErr(""); setInfo(""); }}>Forgot password?</LinkBtn>
              </div>
              <Err msg={err} />
              <button type="button" className="rald-btn-primary" onClick={handlePasswordLogin} disabled={busy} style={{ marginBottom: 14 }}>
                {busy ? "Signing in…" : "Sign in"}
              </button>
              <LinkBtn onClick={() => { setStep(method === "sms" ? "phone" : "email-in"); setErr(""); setEmail(""); setPassword(""); }}>
                ← {method === "sms" ? "Use phone instead" : "Use email OTP instead"}
              </LinkBtn>
            </div>
          )}

          {/* ── Forgot password ── */}
          {step === "forgot" && (
            <div className="animate-slide-in">
              <h2 className="rald-step-title">Reset password</h2>
              <p className="rald-step-subtitle">{info && !info.includes("updated") ? "Enter the code sent to your email and a new password." : "Enter your email to receive a reset code."}</p>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" className="rald-input" style={{ marginBottom: 10 }} autoFocus={!info} />
              {info && !info.includes("updated") && (
                <>
                  <input type="text" inputMode="numeric" value={forgotCode} onChange={e => setForgotCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit reset code" className="rald-input" style={{ marginBottom: 10 }} autoFocus />
                  <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="New password (min 8 chars)" className="rald-input" style={{ marginBottom: 16 }} />
                </>
              )}
              <Info msg={info} /><Err msg={err} />
              {!info ? (
                <button type="button" className="rald-btn-primary" onClick={handleForgotRequest} disabled={busy} style={{ marginBottom: 14 }}>{busy ? "Sending…" : "Send reset code"}</button>
              ) : !info.includes("updated") ? (
                <button type="button" className="rald-btn-primary" onClick={handleForgotReset} disabled={busy} style={{ marginBottom: 14 }}>{busy ? "Resetting…" : "Reset password"}</button>
              ) : null}
              <GhostBtn onClick={() => { setStep("password"); setErr(""); setInfo(""); }}>← Back to sign in</GhostBtn>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="rald-footer">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: "0.65rem", color: "#2ECFA3" }}>◉</span>
            <span style={{ fontSize: "0.7rem", color: "hsl(215 20% 42%)" }}>Secured by RALD</span>
            <span style={{ color: "hsl(215 20% 28%)" }}>·</span>
            <span style={{ fontSize: "0.7rem", color: "hsl(215 20% 42%)" }}>Your data is never shared</span>
          </div>
          <p style={{ fontSize: "0.6rem", color: "hsl(215 20% 30%)" }}>
            RALD is owned and operated by <span style={{ color: "hsl(215 20% 40%)" }}>LILCKY STUDIO LIMITED</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Role selector sub-component ───────────────────────────────────────────────
function RoleSelector({ role, onChange, businessName, onBizName }: {
  role: "user" | "merchant"; onChange: (r: "user" | "merchant") => void;
  businessName: string; onBizName: (s: string) => void;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: role === "merchant" ? 10 : 0 }}>
        {(["user", "merchant"] as const).map(r => (
          <button key={r} type="button" onClick={() => onChange(r)} style={{
            flex: 1, padding: "10px 12px", borderRadius: 8, fontSize: "0.8rem", fontWeight: 600,
            border: `1px solid ${role === r ? "#2ECFA3" : "hsl(220 30% 14%)"}`,
            background: role === r ? "rgba(46,207,163,0.1)" : "hsl(220 30% 10%)",
            color: role === r ? "#2ECFA3" : "hsl(215 20% 50%)", cursor: "pointer", transition: "all 0.15s",
          }}>{r === "user" ? "🙋 Personal" : "🏪 Business"}</button>
        ))}
      </div>
      {role === "merchant" && (
        <input type="text" value={businessName} onChange={e => onBizName(e.target.value)}
          placeholder="Business name (optional)" className="rald-input" />
      )}
    </div>
  );
}
