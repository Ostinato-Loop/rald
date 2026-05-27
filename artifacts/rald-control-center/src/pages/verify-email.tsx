import { useState } from "react";
import { useLocation } from "wouter";
import { RaldLogo } from "@/components/logo";

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const token = localStorage.getItem("rald_token");

  const handleSendCode = async () => {
    if (!token) { setLocation("/login"); return; }
    setBusy(true); setError("");
    try {
      const meRes = await fetch("https://api.rald.cloud/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const me = await meRes.json() as { email?: string };
      if (!me.email) { setError("Could not retrieve account email."); return; }

      const res = await fetch("https://api.rald.cloud/api/auth/send-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: me.email }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setError(data.error ?? "Failed to send code"); return; }
      setSent(true);
    } catch {
      setError("Network error. Please try again.");
    } finally { setBusy(false); }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) { setLocation("/login"); return; }
    setError("");
    setBusy(true);
    try {
      const res = await fetch("https://api.rald.cloud/api/auth/verify-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setError(data.error ?? "Verification failed"); return; }
      setLocation("/");
    } catch {
      setError("Network error. Please try again.");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-background dark flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center mb-10">
          <RaldLogo dark className="h-10 w-auto" />
        </div>
        <div className="border border-border bg-card p-8">
          <h1 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Verify Email
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            Verify your email address to secure your RALD operator account.
          </p>

          {!sent ? (
            <div className="space-y-4">
              <p className="text-sm text-foreground">
                We'll send a 6-digit verification code to your registered email address.
              </p>
              {error && <p className="text-xs text-destructive border border-destructive/30 bg-destructive/10 px-3 py-2">{error}</p>}
              <button type="button" onClick={handleSendCode} disabled={busy}
                className="w-full bg-primary text-primary-foreground py-2.5 text-sm font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {busy ? "Sending…" : "Send Verification Code"}
              </button>
            </div>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code sent to your email.
              </p>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Verification Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="w-full bg-input border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors tracking-widest text-center text-lg font-bold"
                  placeholder="123456"
                  autoFocus
                />
              </div>
              {error && <p className="text-xs text-destructive border border-destructive/30 bg-destructive/10 px-3 py-2">{error}</p>}
              <button type="submit" disabled={busy || code.length < 6}
                className="w-full bg-primary text-primary-foreground py-2.5 text-sm font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {busy ? "Verifying…" : "Verify Email"}
              </button>
              <button type="button" onClick={handleSendCode} disabled={busy}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
                Resend code
              </button>
            </form>
          )}

          <button type="button" onClick={() => setLocation("/")}
            className="w-full text-xs text-muted-foreground hover:text-foreground mt-4 transition-colors py-1">
            Skip for now →
          </button>
        </div>
      </div>
    </div>
  );
}
