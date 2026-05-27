import { useState } from "react";
import { useLocation } from "wouter";
import { RaldLogo } from "@/components/logo";

export default function Signup() {
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setBusy(true);
    try {
      const res = await fetch("https://api.rald.cloud/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role: "operator" }),
      });
      const data = await res.json() as { token?: string; error?: string };
      if (!res.ok) { setError(data.error ?? "Registration failed"); return; }
      if (data.token) {
        localStorage.setItem("rald_token", data.token);
        setLocation("/verify-email");
      }
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
            Create Operator Account
          </h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Full name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full bg-input border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                required autoFocus />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-input border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                required />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-input border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                required />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Confirm password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-input border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                required />
            </div>
            {error && (
              <p className="text-xs text-destructive border border-destructive/30 bg-destructive/10 px-3 py-2">{error}</p>
            )}
            <button type="submit" disabled={busy}
              className="w-full bg-primary text-primary-foreground py-2.5 text-sm font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {busy ? "Creating account…" : "Create Account"}
            </button>
          </form>
          <p className="text-xs text-muted-foreground mt-6 text-center">
            Already have access?{" "}
            <button type="button" onClick={() => setLocation("/login")} className="text-primary hover:underline">Sign in</button>
          </p>
          <p className="text-xs text-muted-foreground mt-4 text-center">
            RALD by LILCKY STUDIO LIMITED — Authorized Personnel Only
          </p>
        </div>
      </div>
    </div>
  );
}
