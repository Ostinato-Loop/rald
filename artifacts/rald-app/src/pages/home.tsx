import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { RaldLogo } from "@/components/logo";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

type Tab = "signin" | "create";
type Step = "phone" | "otp" | "create" | "email-otp" | "password";

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
    if (e.key === "Backspace" && !value[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && i > 0) inputRefs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < 5) inputRefs.current[i + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length > 0) {
      const next = [...value];
      pasted.split("").forEach((ch, idx) => { if (idx < 6) next[idx] = ch; });
      onChange(next);
      const focusIdx = Math.min(pasted.length, 5);
      inputRefs.current[focusIdx]?.focus();
    }
    e.preventDefault();
  };

  return (
    <div className="flex gap-2 justify-between" onPaste={handlePaste}>
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
        />
      ))}
    </div>
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
  const [emailOtp, setEmailOtp] = useState(["", "", "", "", "", ""]);
  const [otpToken, setOtpToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
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
    setStep("phone");
    setOtp(["", "", "", "", "", ""]);
    setEmailOtp(["", "", "", "", "", ""]);
    setPinId("");
    setOtpToken("");
    setErr("");
    setPhone("");
    setName("");
    setEmail("");
    setPassword("");
    setResendCooldown(0);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
  }, []);

  const switchTab = useCallback((t: Tab) => {
    setTab(t);
    resetFlow();
  }, [resetFlow]);

  const fullPhone = `${country}${phone.replace(/^0/, "")}`;

  const handleSendOtp = async () => {
    if (!phone.trim()) { setErr("Enter your phone number"); return; }
    setBusy(true); setErr("");
    try {
      const res = await api.auth.sendOtp(fullPhone);
      setPinId(res.pinId);
      setStep("otp");
      setOtp(["", "", "", "", "", ""]);
      startCooldown();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to send code");
    } finally { setBusy(false); }
  };

  const handleVerifyOtp = async () => {
    const code = otp.join("");
    if (code.length < 6) { setErr("Enter the 6-digit code"); return; }
    setBusy(true); setErr("");
    try {
      const res = await api.auth.verifyOtp(pinId, code, fullPhone);
      if ("token" in res) {
        login(res.token, res.user);
      } else {
        setOtpToken(res.otpToken);
        setStep("create");
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Invalid code");
    } finally { setBusy(false); }
  };

  const handleCreate = async () => {
    if (!name.trim()) { setErr("Enter your name"); return; }
    if (!email.trim()) { setErr("Enter your email address"); return; }
    setBusy(true); setErr("");
    try {
      const res = await api.auth.registerFromOtp({ otpToken, name, email, role });
      login(res.token, res.user);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Registration failed");
    } finally { setBusy(false); }
  };

  const handlePasswordLogin = async () => {
    if (!email.trim()) { setErr("Enter your email"); return; }
    if (!password) { setErr("Enter your password"); return; }
    setBusy(true); setErr("");
    try {
      const res = await api.auth.login(email, password);
      login(res.token, res.user);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Invalid credentials");
    } finally { setBusy(false); }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100svh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <RaldLogo dark className="h-9 w-auto animate-pulse" />
      </div>
    );
  }

  const selectedCountry = COUNTRIES.find((c) => c.code === country) ?? COUNTRIES[0];

  return (
    <div
      style={{
        minHeight: "100svh",
        minHeight: "100vh",
        background: "hsl(224 50% 5%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "env(safe-area-inset-top, 0) env(safe-area-inset-right, 0) env(safe-area-inset-bottom, 0) env(safe-area-inset-left, 0)",
      }}
    >
      {/* Top spacer / theme toggle placeholder */}
      <div style={{ width: "100%", display: "flex", justifyContent: "flex-end", padding: "12px 16px" }}>
        <div style={{ width: 36, height: 36 }} />
      </div>

      {/* Center Content */}
      <div
        className="animate-fade-up"
        style={{ width: "100%", maxWidth: 400, padding: "0 20px", flex: "0 0 auto" }}
      >
        {/* Logo */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 20 }}>
          <RaldLogo dark className="h-10 w-auto" />
          <p
            style={{
              marginTop: 10,
              fontSize: "0.65rem",
              fontWeight: 600,
              letterSpacing: "0.22em",
              color: "hsl(215 20% 52%)",
              textTransform: "uppercase",
              textAlign: "center",
            }}
          >
            Root Authentication &amp; Login Directory
          </p>
        </div>

        {/* Tab switcher */}
        <div className="tab-switcher" style={{ marginBottom: 16 }}>
          <button
            type="button"
            className={`tab-pill ${tab === "signin" ? "active" : ""}`}
            onClick={() => switchTab("signin")}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`tab-pill ${tab === "create" ? "active" : ""}`}
            onClick={() => switchTab("create")}
          >
            Create account
          </button>
        </div>

        {/* Auth Card */}
        <div
          style={{
            background: "hsl(222 45% 8%)",
            border: "1px solid hsl(220 30% 14%)",
            borderRadius: 14,
            padding: "24px 20px",
          }}
        >
          {/* ── Phone step ── */}
          {(step === "phone") && (
            <div className="animate-slide-in">
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: 6 }}>
                {tab === "signin" ? "Welcome back" : "Create your account"}
              </h2>
              <p style={{ fontSize: "0.875rem", color: "hsl(215 20% 52%)", marginBottom: 20, lineHeight: 1.5 }}>
                {tab === "signin"
                  ? "Enter your phone number to receive a verification code"
                  : "We'll send a code to verify your number"}
              </p>

              <div style={{ display: "flex", marginBottom: 16 }}>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  style={{
                    background: "hsl(220 30% 10%)",
                    border: "1px solid hsl(220 30% 14%)",
                    borderRight: "none",
                    color: "hsl(210 40% 97%)",
                    borderRadius: "8px 0 0 8px",
                    padding: "0 10px",
                    minHeight: 48,
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    outline: "none",
                    flexShrink: 0,
                    cursor: "pointer",
                  }}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code}
                    </option>
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
                    flex: 1,
                    background: "hsl(220 30% 10%)",
                    border: "1px solid hsl(220 30% 14%)",
                    borderRadius: "0 8px 8px 0",
                    padding: "0 14px",
                    minHeight: 48,
                    fontSize: "1rem",
                    color: "hsl(210 40% 97%)",
                    outline: "none",
                  }}
                />
              </div>

              {err && (
                <p style={{ fontSize: "0.8rem", color: "#E63946", marginBottom: 12, padding: "8px 12px", background: "rgba(230,57,70,0.08)", borderRadius: 6, border: "1px solid rgba(230,57,70,0.2)" }}>{err}</p>
              )}

              <button
                type="button"
                className="rald-btn-primary"
                onClick={handleSendOtp}
                disabled={busy}
                style={{ marginBottom: 14 }}
              >
                {busy ? "Sending…" : <><span>Send code</span> <span>→</span></>}
              </button>

              {tab === "signin" && (
                <button
                  type="button"
                  onClick={() => { setStep("password"); setErr(""); }}
                  style={{ background: "none", border: "none", color: "#2ECFA3", fontSize: "0.875rem", cursor: "pointer", padding: 0 }}
                >
                  Use password instead
                </button>
              )}
            </div>
          )}

          {/* ── OTP step ── */}
          {step === "otp" && (
            <div className="animate-slide-in">
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: 6 }}>Enter your code</h2>
              <p style={{ fontSize: "0.875rem", color: "hsl(215 20% 52%)", marginBottom: 20, lineHeight: 1.5 }}>
                Sent to <strong style={{ color: "hsl(210 40% 97%)" }}>{selectedCountry.flag} {country} {phone}</strong>
              </p>

              <div style={{ marginBottom: 20 }}>
                <OtpBoxes value={otp} onChange={setOtp} autoFocusFirst />
              </div>

              {err && (
                <p style={{ fontSize: "0.8rem", color: "#E63946", marginBottom: 12, padding: "8px 12px", background: "rgba(230,57,70,0.08)", borderRadius: 6, border: "1px solid rgba(230,57,70,0.2)" }}>{err}</p>
              )}

              <button
                type="button"
                className="rald-btn-primary"
                onClick={handleVerifyOtp}
                disabled={busy || otp.join("").length < 6}
                style={{ marginBottom: 14 }}
              >
                {busy ? "Verifying…" : "Verify & continue"}
              </button>

              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => { setStep("phone"); setErr(""); setOtp(["","","","","",""]); }}
                  style={{ background: "none", border: "none", color: "hsl(215 20% 52%)", fontSize: "0.8rem", cursor: "pointer", padding: 0 }}
                >
                  ← Change number
                </button>
                <span style={{ color: "hsl(215 20% 35%)", fontSize: "0.75rem" }}>·</span>
                <button
                  type="button"
                  onClick={resendCooldown > 0 ? undefined : handleSendOtp}
                  disabled={resendCooldown > 0}
                  style={{ background: "none", border: "none", color: resendCooldown > 0 ? "hsl(215 20% 40%)" : "#2ECFA3", fontSize: "0.8rem", cursor: resendCooldown > 0 ? "not-allowed" : "pointer", padding: 0 }}
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                </button>
              </div>
            </div>
          )}

          {/* ── Create account step ── */}
          {step === "create" && (
            <div className="animate-slide-in">
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: 6 }}>Almost there</h2>
              <p style={{ fontSize: "0.875rem", color: "hsl(215 20% 52%)", marginBottom: 20, lineHeight: 1.5 }}>
                Phone verified ✓ — fill in your details to finish
              </p>

              <div style={{ marginBottom: 12 }}>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  className="rald-input"
                  style={{ marginBottom: 10 }}
                  autoFocus
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="rald-input"
                  style={{ marginBottom: 14 }}
                />

                <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                  {(["user", "merchant"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      style={{
                        flex: 1, padding: "10px 12px", borderRadius: 8, fontSize: "0.8rem", fontWeight: 600,
                        border: `1px solid ${role === r ? "#2ECFA3" : "hsl(220 30% 14%)"}`,
                        background: role === r ? "rgba(46,207,163,0.1)" : "hsl(220 30% 10%)",
                        color: role === r ? "#2ECFA3" : "hsl(215 20% 52%)",
                        cursor: "pointer", transition: "all 0.15s",
                      }}
                    >
                      {r === "user" ? "🙋 Personal" : "🏪 Business"}
                    </button>
                  ))}
                </div>
              </div>

              {err && (
                <p style={{ fontSize: "0.8rem", color: "#E63946", marginBottom: 12, padding: "8px 12px", background: "rgba(230,57,70,0.08)", borderRadius: 6, border: "1px solid rgba(230,57,70,0.2)" }}>{err}</p>
              )}

              <button
                type="button"
                className="rald-btn-primary"
                onClick={handleCreate}
                disabled={busy}
              >
                {busy ? "Creating account…" : "Create account →"}
              </button>
            </div>
          )}

          {/* ── Password login step ── */}
          {step === "password" && (
            <div className="animate-slide-in">
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: 6 }}>Sign in</h2>
              <p style={{ fontSize: "0.875rem", color: "hsl(215 20% 52%)", marginBottom: 20, lineHeight: 1.5 }}>
                Enter your email and password
              </p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="rald-input"
                style={{ marginBottom: 10 }}
                autoFocus
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePasswordLogin()}
                placeholder="Password"
                className="rald-input"
                style={{ marginBottom: 16 }}
              />

              {err && (
                <p style={{ fontSize: "0.8rem", color: "#E63946", marginBottom: 12, padding: "8px 12px", background: "rgba(230,57,70,0.08)", borderRadius: 6, border: "1px solid rgba(230,57,70,0.2)" }}>{err}</p>
              )}

              <button
                type="button"
                className="rald-btn-primary"
                onClick={handlePasswordLogin}
                disabled={busy}
                style={{ marginBottom: 14 }}
              >
                {busy ? "Signing in…" : "Sign in"}
              </button>

              <button
                type="button"
                onClick={() => { setStep("phone"); setErr(""); setEmail(""); setPassword(""); }}
                style={{ background: "none", border: "none", color: "#2ECFA3", fontSize: "0.875rem", cursor: "pointer", padding: 0 }}
              >
                Use phone number instead
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ width: "100%", textAlign: "center", padding: "20px 20px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: "0.7rem", color: "#2ECFA3" }}>◉</span>
          <span style={{ fontSize: "0.72rem", color: "hsl(215 20% 45%)", letterSpacing: "0.04em" }}>
            Secured by RALD
          </span>
          <span style={{ color: "hsl(215 20% 30%)", fontSize: "0.7rem" }}>·</span>
          <span style={{ fontSize: "0.72rem", color: "hsl(215 20% 45%)" }}>
            Your data is never shared
          </span>
        </div>
        <p style={{ fontSize: "0.62rem", color: "hsl(215 20% 32%)", letterSpacing: "0.02em" }}>
          RALD is owned and operated by <span style={{ color: "hsl(215 20% 42%)" }}>LILCKY STUDIO LIMITED</span>
        </p>
      </div>
    </div>
  );
}
