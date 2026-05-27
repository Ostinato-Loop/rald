import { useState } from "react";
import { useLocation } from "wouter";
import { RaldLogo } from "@/components/logo";

type Step = "email" | "code" | "done";

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("https://api.rald.cloud/api/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      await res.json();
      setStep("code");
    } catch {
      setError("Network error. Please try again.");
    } finally { setBusy(false); }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) { setError("Passwords do not match"); return; }
    if (newPassword.length < 8) { setError("Password must be at least 8 characters"); return; }
    setBusy(true);
    try {
      const res = await fetch("https://api.rald.cloud/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setError(data.error ?? "Reset failed"); return; }
      setStep("done");
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
          <h1 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-6">
            {step === "email" ? "Reset Password" : step === "code" ? "Enter Reset Code" : "Password Updated"}
          </h1>

          {step === "email" && (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                Enter your email address and we'll send you a 6-digit reset code.
              </p>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-input border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                  required autoFocus />
              </div>
              {error && <p className="text-xs text-destructive border border-destructive/30 bg-destructive/10 px-3 py-2">{error}</p>}
              <button type="submit" disabled={busy}
                className="w-full bg-primary text-primary-foreground py-2.5 text-sm font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {busy ? "Sending…" : "Send Reset Code"}
              </button>
            </form>
          )}

          {step === "code" && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                Enter the 6-digit code sent to <strong className="text-foreground">{email}</strong> and choose a new password.
              </p>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Reset Code</label>
                <input type="text" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="w-full bg-input border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors tracking-widest"
                  required autoFocus placeholder="123456" />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">New Password</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-input border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                  required />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Confirm New Password</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-input border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                  required />
              </div>
              {error && <p className="text-xs text-destructive border border-destructive/30 bg-destructive/10 px-3 py-2">{error}</p>}
              <button type="submit" disabled={busy}
                className="w-full bg-primary text-primary-foreground py-2.5 text-sm font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {busy ? "Resetting…" : "Reset Password"}
              </button>
              <button type="button" onClick={handleRequestReset} disabled={busy}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
                Resend code
              </button>
            </form>
          )}

          {step === "done" && (
            <div className="text-center space-y-4">
              <p className="text-4xl">✓</p>
              <p className="text-sm text-muted-foreground">Your password has been updated successfully.</p>
              <button type="button" onClick={() => setLocation("/login")}
                className="w-full bg-primary text-primary-foreground py-2.5 text-sm font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors">
                Sign In
              </button>
            </div>
          )}

          {step !== "done" && (
            <button type="button" onClick={() => setLocation("/login")}
              className="w-full text-xs text-muted-foreground hover:text-foreground mt-4 transition-colors py-1">
              ← Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
