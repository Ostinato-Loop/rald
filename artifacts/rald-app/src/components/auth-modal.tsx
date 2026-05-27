import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { X, Eye, EyeOff, User, Building2, Loader2 } from "lucide-react";
import { api, RegisterInput } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { RaldLogo } from "@/components/logo";

type Tab = "login" | "signup";

interface AuthModalProps {
  initialTab?: Tab;
  onClose?: () => void;
  isModal?: boolean;
}

export function AuthPanel({ initialTab = "login", onClose, isModal = false }: AuthModalProps) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const [, setLocation] = useLocation();

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState<RegisterInput & { businessName: string }>({
    name: "",
    email: "",
    password: "",
    role: "user",
    businessName: "",
  });

  useEffect(() => { setError(""); setShowPass(false); }, [tab]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token, user } = await api.auth.login(loginForm.email, loginForm.password);
      login(token, user);
      if (user.role === "merchant") setLocation("/merchant");
      else if (user.role === "user") setLocation("/dashboard");
      else window.location.href = "https://admin.rald.cloud";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (signupForm.password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    try {
      const payload: RegisterInput = {
        name: signupForm.name.trim(),
        email: signupForm.email.trim(),
        password: signupForm.password,
        role: signupForm.role,
        ...(signupForm.role === "merchant" && signupForm.businessName ? { businessName: signupForm.businessName.trim() } : {}),
      };
      const { token, user } = await api.auth.register(payload);
      login(token, user);
      if (user.role === "merchant") setLocation("/merchant");
      else setLocation("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const panelContent = (
    <div className={isModal ? "w-full max-w-md" : "w-full"}>
      <div className={`${isModal ? "bg-card border border-border rounded-lg p-8" : ""} animate-scale-in`}>
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

        <div className="flex border-b border-border mb-6">
          {(["login", "signup"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-3 pr-6 text-sm font-bold uppercase tracking-widest transition-colors ${tab === t ? "tab-active" : "tab-inactive"}`}
            >
              {t === "login" ? "Sign In" : "Get Started"}
            </button>
          ))}
        </div>

        {tab === "login" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Email</label>
              <input
                type="email"
                autoComplete="email"
                required
                className="rald-input"
                placeholder="you@example.com"
                value={loginForm.email}
                onChange={(e) => setLoginForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  className="rald-input pr-10"
                  placeholder="••••••••"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
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
              <button type="button" onClick={() => setTab("signup")} className="text-[#2ECFA3] hover:underline font-semibold">
                Create one free
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Account Type</label>
              <div className="grid grid-cols-2 gap-2">
                {(["user", "merchant"] as const).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setSignupForm((f) => ({ ...f, role }))}
                    className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded border text-xs font-semibold uppercase tracking-wider transition-all ${
                      signupForm.role === role
                        ? "border-[#2ECFA3] bg-[#2ECFA3]/10 text-[#2ECFA3]"
                        : "border-border text-muted-foreground hover:border-muted-foreground"
                    }`}
                  >
                    {role === "user" ? <User size={16} /> : <Building2 size={16} />}
                    {role === "user" ? "Personal" : "Business"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
                {signupForm.role === "merchant" ? "Your Full Name" : "Full Name"}
              </label>
              <input
                type="text"
                autoComplete="name"
                required
                className="rald-input"
                placeholder="Ada Okafor"
                value={signupForm.name}
                onChange={(e) => setSignupForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            {signupForm.role === "merchant" && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Business Name</label>
                <input
                  type="text"
                  autoComplete="organization"
                  className="rald-input"
                  placeholder="Okafor Ventures Ltd"
                  value={signupForm.businessName}
                  onChange={(e) => setSignupForm((f) => ({ ...f, businessName: e.target.value }))}
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Email</label>
              <input
                type="email"
                autoComplete="email"
                required
                className="rald-input"
                placeholder="you@example.com"
                value={signupForm.email}
                onChange={(e) => setSignupForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  className="rald-input pr-10"
                  placeholder="Min. 8 characters"
                  value={signupForm.password}
                  onChange={(e) => setSignupForm((f) => ({ ...f, password: e.target.value }))}
                />
                <button type="button" onClick={() => setShowPass((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            {error && <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading} className="rald-btn-primary flex items-center justify-center gap-2 mt-2">
              {loading ? <Loader2 size={14} className="animate-spin" /> : null}
              {loading ? "Creating account..." : signupForm.role === "merchant" ? "Create Business Account" : "Create Account"}
            </button>
            <p className="text-center text-xs text-muted-foreground pt-1">
              Already have an account?{" "}
              <button type="button" onClick={() => setTab("login")} className="text-[#2ECFA3] hover:underline font-semibold">Sign in</button>
            </p>
          </form>
        )}
      </div>
    </div>
  );

  if (!isModal) return panelContent;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}
    >
      {panelContent}
    </div>
  );
}

export function useAuthModal() {
  const [open, setOpen] = useState(false);
  const [initialTab, setInitialTab] = useState<Tab>("login");

  const openLogin = useCallback(() => { setInitialTab("login"); setOpen(true); }, []);
  const openSignup = useCallback(() => { setInitialTab("signup"); setOpen(true); }, []);
  const close = useCallback(() => setOpen(false), []);

  return { open, initialTab, openLogin, openSignup, close };
}
