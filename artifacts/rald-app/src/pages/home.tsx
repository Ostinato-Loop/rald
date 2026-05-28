import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { RaldLogo } from "@/components/logo";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

type Tab = "signin" | "create";
type Step = "phone" | "otp" | "create" | "email-otp" | "password" | "forgot";

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

function OtpBoxes({
  value,
  onChange,
  autoFocusFirst = false,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  autoFocusFirst?: boolean;
}) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null, null, null]);

  useEffect(() => {
    if (autoFocusFirst) inputRefs.current[0]?.focus();
  }, [autoFocusFirst]);

  const handleChange = (i: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const next = [...value];
    next[i] = digit;
    onChange(next);
    if (digit && i < 5) inputRefs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !value[i] && i > 0) inputRefs.current[i - 1]?.focus();
    if (e.key === "ArrowLeft" && i > 0) inputRefs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < 5) inputRefs.current[i + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length > 0) {
      const next = [...value];
      pasted.split("").forEach((ch, idx) => { if (idx < 6) next[idx] = ch; });
      onChange(next);
      inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
    e.preventDefault();
  };

  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }} onPaste={handlePaste}>
      {value.map((v, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={v}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="otp-input"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          style={{ flex: 1, minWidth: 0 }}
        />
      ))}
    </div>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <p style={{
      fontSize: "0.8rem", color: "#E63946", marginBottom: 12,
      padding: "8px 12px", background: "rgba(230,57,70,0.08)",
      borderRadius: 6, border: "1px solid rgba(230,57,70,0.2)",
    }}>{msg}</p>
  );
}

function LinkBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} style={{
      background: "none", border: "none", color: "#2ECFA3",
      fontSize: "0.875rem", cursor: "pointer", padding: 0,
    }}>
      {children}
    </button>
  );
}

function GhostBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} style={{
      background: "none", border: "none", color: "hsl(215 20% 52%)",
      fontSize: "0.8rem", cursor: "pointer", padding: 0,
    }}>
      {children}
    </button>
  );
}

export default function Home() {
  const { user, loading, login } = useAuth();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<Tab>("signin");
  const [step, setStep] = useState<Step>("phone");
  const [country, setCountry] = useState("+234");
  const [phone, setPhone] = useState("");
  const [pinId, setPinId] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "merchant">("user");
  const [otpToken, setOtpToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [forgotCode, setForgotCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!loading && user) {
      if (user.role === "merchant") setLocation("/merchant");
      else if (user.role === "user") setLocation("/dashboard");
      else window.location.href = "https://admin.rald.cloud";
    }
  }, [user, loading, setLocation]);

  const startCooldown = useCallback(() => {
    setResendCooldown(60);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) { clearInterval(cooldownRef.current!); return 0; }
        return s - 1;
      });
    }, 1000);
  }, []);

  const resetFlow = useCallback(() => {
    setStep("phone"); setOtp(["", "", "", "", "", ""]);
    setPinId(""); setOtpToken(""); setErr(""); setInfo("");
    setPhone(""); setName(""); setEmail(""); setPassword("");
    setForgotCode(""); setNewPassword(""); setResendCooldown(0);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
  }, []);

  const switchTab = useCallback((t: Tab) => { setTab(t); resetFlow(); }, [resetFlow]);
  const fullPhone = `${country}${phone.replace(/^0/, "")}`;

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!phone.trim()) { setErr("Enter your phone number"); return; }
    setBusy(true); setErr("");
    try {
      const res = await api.auth.sendOtp(fullPhone);
      setPinId(res.pinId); setStep("otp");
      setOtp(["", "", "", "", "", ""]); startCooldown();
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : "Failed to send code"); }
    finally { setBusy(false); }
  };

  const handleVerifyOtp = async () => {
    const code = otp.join("");
    if (code.length < 6) { setErr("Enter the 6-digit code"); return; }
    setBusy(true); setErr("");
    try {
      const res = await api.auth.verifyOtp(pinId, code, fullPhone);
      if ("token" in res) { login(res.token, res.user); }
      else { setOtpToken(res.otpToken); setStep("create"); }
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : "Invalid code"); }
    finally { setBusy(false); }
  };

  const handleCreate = async () => {
    if (!name.trim()) { setErr("Enter your name"); return; }
    if (!email.trim()) { setErr("Enter your email address"); return; }
    setBusy(true); setErr("");
    try {
      const res = await api.auth.registerFromOtp({ otpToken, name, email, role });
      login(res.token, res.user);
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : "Registration failed"); }
    finally { setBusy(false); }
  };

  const handlePasswordLogin = async () => {
    if (!email.trim()) { setErr("Enter your email"); return; }
    if (!password) { setErr("Enter your password"); return; }
    setBusy(true); setErr("");
    try {
      const res = await api.auth.login(email, password);
      login(res.token, res.user);
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : "Invalid email or password"); }
    finally { setBusy(false); }
  };

  const handleForgotRequest = async () => {
    if (!email.trim()) { setErr("Enter your email"); return; }
    setBusy(true); setErr(""); setInfo("");
    try {
      await api.auth.requestPasswordReset(email);
      setInfo("If this email has an account, a 6-digit reset code was sent.");
    } catch { setInfo("If this email has an account, a 6-digit reset code was sent."); }
    finally { setBusy(false); }
  };

  const handleForgotReset = async () => {
    if (!forgotCode.trim() || forgotCode.length < 6) { setErr("Enter the 6-digit code"); return; }
    if (!newPassword || newPassword.length < 8) { setErr("Password must be at least 8 characters"); return; }
    setBusy(true); setErr("");
    try {
      await api.auth.resetPassword(email, forgotCode, newPassword);
      setInfo("Password updated. You can now sign in.");
      setStep("password"); setForgotCode(""); setNewPassword("");
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : "Reset failed. Try again."); }
    finally { setBusy(false); }
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: "100svh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <RaldLogo dark className="h-9 w-auto animate-pulse" />
      </div>
    );
  }

  const selectedCountry = COUNTRIES.find((c) => c.code === country) ?? COUNTRIES[0];

  return (
    <div className="rald-auth-root">
      {/* Top bar */}
      <div style={{ width: "100%", display: "flex", justifyContent: "flex-end", padding: "12px 16px", flexShrink: 0 }}>
        <div style={{ width: 36, height: 36 }} />
      </div>

      {/* Center panel */}
      <div
        className="animate-fade-up"
        style={{ width: "100%", maxWidth: 420, padding: "0 20px", flex: "0 0 auto" }}
      >
        {/* Logo + tagline */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
          <RaldLogo dark className="h-10 w-auto" />
          <p style={{
            marginTop: 10, fontSize: "0.65rem", fontWeight: 600,
            letterSpacing: "0.22em", color: "hsl(215 20% 45%)",
            textTransform: "uppercase", textAlign: "center",
          }}>
            Root Authentication &amp; Login Directory
          </p>
        </div>

        {/* Tabs */}
        <div className="tab-switcher" style={{ marginBottom: 16 }}>
          {(["signin", "create"] as const).map((t) => (
            <button key={t} type="button" className={`tab-pill${tab === t ? " active" : ""}`} onClick={() => switchTab(t)}>
              {t === "signin" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        {/* Card */}
        <div className="rald-card">

          {/* ── Phone step ── */}
          {step === "phone" && (
            <div className="animate-slide-in">
              <h2 className="rald-step-title">{tab === "signin" ? "Welcome back" : "Create your account"}</h2>
              <p className="rald-step-subtitle">
                {tab === "signin" ? "Enter your phone to receive a verification code" : "We'll send a code to verify your number"}
              </p>

              <div style={{ display: "flex", marginBottom: 16 }}>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="country-select"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                  ))}
                </select>
                <input
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                  placeholder="801 234 5678"
                  style={{
                    flex: 1, background: "hsl(220 30% 10%)",
                    border: "1px solid hsl(220 30% 14%)",
                    borderRadius: "0 8px 8px 0",
                    padding: "0 14px", minHeight: 48, fontSize: "1rem",
                    color: "hsl(210 40% 97%)", outline: "none",
                  }}
                />
              </div>

              <ErrorMsg msg={err} />

              <button type="button" className="rald-btn-primary" onClick={handleSendOtp} disabled={busy} style={{ marginBottom: 14 }}>
                {busy ? "Sending…" : <><span>Send code</span><span>→</span></>}
              </button>

              {tab === "signin" && (
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  <LinkBtn onClick={() => { setStep("password"); setErr(""); }}>Use password instead</LinkBtn>
                </div>
              )}
            </div>
          )}

          {/* ── OTP step ── */}
          {step === "otp" && (
            <div className="animate-slide-in">
              <h2 className="rald-step-title">Enter your code</h2>
              <p className="rald-step-subtitle">
                Sent to <strong style={{ color: "hsl(210 40% 97%)" }}>{selectedCountry.flag} {country} {phone}</strong>
              </p>

              <div style={{ marginBottom: 20 }}>
                <OtpBoxes value={otp} onChange={setOtp} autoFocusFirst />
              </div>

              <ErrorMsg msg={err} />

              <button type="button" className="rald-btn-primary" onClick={handleVerifyOtp}
                disabled={busy || otp.join("").length < 6} style={{ marginBottom: 14 }}>
                {busy ? "Verifying…" : "Verify & continue"}
              </button>

              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <GhostBtn onClick={() => { setStep("phone"); setErr(""); setOtp(["","","","","",""]); }}>← Change number</GhostBtn>
                <span style={{ color: "hsl(215 20% 35%)", fontSize: "0.75rem" }}>·</span>
                <button type="button"
                  onClick={resendCooldown > 0 ? undefined : handleSendOtp}
                  disabled={resendCooldown > 0}
                  style={{
                    background: "none", border: "none",
                    color: resendCooldown > 0 ? "hsl(215 20% 40%)" : "#2ECFA3",
                    fontSize: "0.8rem", cursor: resendCooldown > 0 ? "not-allowed" : "pointer", padding: 0,
                  }}>
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                </button>
              </div>
            </div>
          )}

          {/* ── Create account step ── */}
          {step === "create" && (
            <div className="animate-slide-in">
              <h2 className="rald-step-title">Almost there</h2>
              <p className="rald-step-subtitle">Phone verified ✓ — fill in your details to finish</p>

              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Full name" className="rald-input" style={{ marginBottom: 10 }} autoFocus />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address" className="rald-input" style={{ marginBottom: 14 }} />

              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                {(["user", "merchant"] as const).map((r) => (
                  <button key={r} type="button" onClick={() => setRole(r)} style={{
                    flex: 1, padding: "10px 12px", borderRadius: 8, fontSize: "0.8rem", fontWeight: 600,
                    border: `1px solid ${role === r ? "#2ECFA3" : "hsl(220 30% 14%)"}`,
                    background: role === r ? "rgba(46,207,163,0.1)" : "hsl(220 30% 10%)",
                    color: role === r ? "#2ECFA3" : "hsl(215 20% 52%)",
                    cursor: "pointer", transition: "all 0.15s",
                  }}>
                    {r === "user" ? "🙋 Personal" : "🏪 Business"}
                  </button>
                ))}
              </div>

              <ErrorMsg msg={err} />
              <button type="button" className="rald-btn-primary" onClick={handleCreate} disabled={busy}>
                {busy ? "Creating account…" : "Create account →"}
              </button>
            </div>
          )}

          {/* ── Password login step ── */}
          {step === "password" && (
            <div className="animate-slide-in">
              <h2 className="rald-step-title">Sign in</h2>
              <p className="rald-step-subtitle">Enter your email and password</p>

              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address" className="rald-input" style={{ marginBottom: 10 }} autoFocus />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePasswordLogin()}
                placeholder="Password" className="rald-input" style={{ marginBottom: 6 }} />

              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
                <LinkBtn onClick={() => { setStep("forgot"); setErr(""); setInfo(""); }}>Forgot password?</LinkBtn>
              </div>

              <ErrorMsg msg={err} />

              <button type="button" className="rald-btn-primary" onClick={handlePasswordLogin} disabled={busy} style={{ marginBottom: 14 }}>
                {busy ? "Signing in…" : "Sign in"}
              </button>

              <LinkBtn onClick={() => { setStep("phone"); setErr(""); setEmail(""); setPassword(""); }}>
                Use phone number instead
              </LinkBtn>
            </div>
          )}

          {/* ── Forgot password step ── */}
          {step === "forgot" && (
            <div className="animate-slide-in">
              <h2 className="rald-step-title">Reset password</h2>
              <p className="rald-step-subtitle">
                {info ? "Enter the 6-digit code sent to your email and a new password." : "Enter your email to receive a reset code."}
              </p>

              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address" className="rald-input" style={{ marginBottom: 10 }} autoFocus={!info} />

              {info && !info.includes("updated") && (
                <>
                  <input type="text" inputMode="numeric" value={forgotCode}
                    onChange={(e) => setForgotCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="6-digit code" className="rald-input" style={{ marginBottom: 10 }} autoFocus />
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password (min 8 chars)" className="rald-input" style={{ marginBottom: 16 }} />
                </>
              )}

              {info && (
                <p style={{ fontSize: "0.8rem", color: "#2ECFA3", marginBottom: 12, padding: "8px 12px", background: "rgba(46,207,163,0.08)", borderRadius: 6, border: "1px solid rgba(46,207,163,0.2)" }}>
                  {info}
                </p>
              )}
              <ErrorMsg msg={err} />

              {!info ? (
                <button type="button" className="rald-btn-primary" onClick={handleForgotRequest} disabled={busy} style={{ marginBottom: 14 }}>
                  {busy ? "Sending…" : "Send reset code"}
                </button>
              ) : info.includes("updated") ? null : (
                <button type="button" className="rald-btn-primary" onClick={handleForgotReset} disabled={busy} style={{ marginBottom: 14 }}>
                  {busy ? "Resetting…" : "Reset password"}
                </button>
              )}

              <GhostBtn onClick={() => { setStep("password"); setErr(""); setInfo(""); }}>← Back to sign in</GhostBtn>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ width: "100%", textAlign: "center", padding: "20px 20px 28px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: "0.7rem", color: "#2ECFA3" }}>◉</span>
          <span style={{ fontSize: "0.72rem", color: "hsl(215 20% 45%)", letterSpacing: "0.04em" }}>Secured by RALD</span>
          <span style={{ color: "hsl(215 20% 30%)", fontSize: "0.7rem" }}>·</span>
          <span style={{ fontSize: "0.72rem", color: "hsl(215 20% 45%)" }}>Your data is never shared</span>
        </div>
        <p style={{ fontSize: "0.62rem", color: "hsl(215 20% 32%)", letterSpacing: "0.02em" }}>
          RALD is owned and operated by <span style={{ color: "hsl(215 20% 42%)" }}>LILCKY STUDIO LIMITED</span>
        </p>
      </div>
    </div>
  );
}
