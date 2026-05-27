import { useState } from "react";
import { useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import type { AuthToken } from "@workspace/api-client-react";
import { RaldLogo } from "@/components/logo";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("admin@rald.cloud");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data: AuthToken) => {
        localStorage.setItem("rald_token", data.token);
        setLocation("/");
      },
      onError: () => {
        setError("Invalid credentials. Check email and password.");
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    loginMutation.mutate({ data: { email, password } });
  };

  return (
    <div className="min-h-screen bg-background dark flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center mb-10">
          <RaldLogo dark className="h-10 w-auto" />
        </div>
        <div className="border border-border bg-card p-8">
          <h1 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-6">
            Operator Access
          </h1>
          <form onSubmit={handleSubmit} className="space-y-4">
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
            {error && (
              <p className="text-xs text-destructive border border-destructive/30 bg-destructive/10 px-3 py-2">{error}</p>
            )}
            <button type="submit" disabled={loginMutation.isPending}
              className="w-full bg-primary text-primary-foreground py-2.5 text-sm font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {loginMutation.isPending ? "Authenticating…" : "Access Control Center"}
            </button>
          </form>

          <div className="flex items-center justify-between mt-5 pt-4 border-t border-border">
            <button type="button" onClick={() => setLocation("/forgot-password")}
              className="text-xs text-muted-foreground hover:text-primary transition-colors">
              Forgot password?
            </button>
            <button type="button" onClick={() => setLocation("/signup")}
              className="text-xs text-muted-foreground hover:text-primary transition-colors">
              Create account
            </button>
          </div>

          <p className="text-xs text-muted-foreground mt-4 text-center">
            RALD by LILCKY STUDIO LIMITED — Authorized Personnel Only
          </p>
        </div>
      </div>
    </div>
  );
}
