import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { RaldLogo } from "@/components/logo";
import { AuthPanel, useAuthModal } from "@/components/auth-modal";
import { useAuth } from "@/lib/auth-context";
import { ArrowRight, Shield, Zap, Globe } from "lucide-react";

const PRODUCTS = [
  { name: "Loop Business", tagline: "Commerce infrastructure for African merchants", color: "#6366F1", emoji: "🏪" },
  { name: "PayRald", tagline: "Unified payments & finance layer", color: "#10B981", emoji: "💳" },
  { name: "Loop Dispatch", tagline: "Last-mile logistics & delivery", color: "#F59E0B", emoji: "📦" },
  { name: "Raldtics", tagline: "Intelligence & analytics", color: "#8B5CF6", emoji: "📊" },
  { name: "Loop Voice", tagline: "Communications & SIP infrastructure", color: "#EC4899", emoji: "📞" },
  { name: "GitRald", tagline: "Infrastructure governance & CI/CD", color: "#EF4444", emoji: "⚙️" },
];

export default function Home() {
  const { open, initialTab, openLogin, openSignup, close } = useAuthModal();
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && user) {
      if (user.role === "merchant") setLocation("/merchant");
      else if (user.role === "user") setLocation("/dashboard");
      else window.location.href = "https://admin.rald.cloud";
    }
  }, [user, loading, setLocation]);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <RaldLogo dark className="h-10 w-auto animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col dark">
      <nav className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <RaldLogo dark className="h-8 w-auto" />
          <div className="flex items-center gap-3">
            <button onClick={openLogin} className="rald-btn-ghost text-xs py-2 px-4 hidden sm:block">Sign In</button>
            <button onClick={openSignup} className="rald-btn-primary text-xs py-2 px-4 w-auto">Get Started</button>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        <section ref={heroRef} className="relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#2ECFA3]/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#E63946]/5 rounded-full blur-3xl" />
          </div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-32">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div className="animate-fade-up">
                <div className="inline-flex items-center gap-2 bg-[#2ECFA3]/10 border border-[#2ECFA3]/20 rounded-full px-3 py-1.5 mb-8">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2ECFA3] animate-pulse" />
                  <span className="text-[#2ECFA3] text-xs font-semibold uppercase tracking-widest">Now in production</span>
                </div>
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight tracking-tight text-foreground mb-6">
                  Your unified<br />
                  <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(90deg, #2ECFA3, #F4A261)" }}>
                    African commerce
                  </span>
                  <br />platform.
                </h1>
                <p className="text-lg text-muted-foreground max-w-md mb-10 leading-relaxed">
                  One identity. Six powerful products. Built for individuals and businesses across Africa — from payments to logistics to analytics.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={openSignup}
                    className="flex items-center gap-2 bg-[#2ECFA3] text-[#0D2137] px-6 py-3 rounded font-black text-sm uppercase tracking-widest hover:opacity-90 transition-opacity"
                  >
                    Create Free Account <ArrowRight size={16} />
                  </button>
                  <button
                    onClick={openLogin}
                    className="flex items-center gap-2 border border-border text-foreground px-6 py-3 rounded font-bold text-sm uppercase tracking-widest hover:bg-secondary transition-colors"
                  >
                    Sign In
                  </button>
                </div>
                <div className="flex flex-wrap gap-6 mt-8 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Shield size={13} className="text-[#2ECFA3]" /> No credit card needed</span>
                  <span className="flex items-center gap-1.5"><Zap size={13} className="text-[#F4A261]" /> Instant access</span>
                  <span className="flex items-center gap-1.5"><Globe size={13} className="text-[#E63946]" /> Pan-African coverage</span>
                </div>
              </div>

              <div className="hidden md:block animate-fade-up" style={{ animationDelay: "0.15s" }}>
                <div className="bg-card border border-border rounded-lg p-8">
                  <div className="mb-6 flex items-center gap-3">
                    <RaldLogo dark className="h-8 w-auto" />
                  </div>
                  <div className="flex border-b border-border mb-6">
                    <div className="pb-3 pr-6 text-sm font-bold uppercase tracking-widest tab-active">Sign In</div>
                    <div className="pb-3 pr-6 text-sm font-bold uppercase tracking-widest tab-inactive">Get Started</div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Email</div>
                      <div className="rald-input text-muted-foreground/40 select-none">you@example.com</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Password</div>
                      <div className="rald-input text-muted-foreground/40 select-none">••••••••</div>
                    </div>
                    <button
                      onClick={openLogin}
                      className="rald-btn-primary"
                    >
                      Sign In →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-border/60 py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-3">The RALD product suite</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">One login unlocks your entire digital business infrastructure.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {PRODUCTS.map((p, i) => (
                <div
                  key={p.name}
                  className="bg-card border border-border rounded-lg p-5 hover:border-muted-foreground/40 transition-all animate-fade-up"
                  style={{ animationDelay: `${i * 0.08}s` }}
                >
                  <div className="text-2xl mb-3">{p.emoji}</div>
                  <h3 className="font-black text-sm uppercase tracking-wider mb-1" style={{ color: p.color }}>{p.name}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{p.tagline}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border/60 py-16">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-4">Ready to get started?</h2>
            <p className="text-muted-foreground mb-8">Join thousands of individuals and businesses building with RALD.</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <button onClick={openSignup} className="flex items-center gap-2 bg-[#2ECFA3] text-[#0D2137] px-6 py-3 rounded font-black text-sm uppercase tracking-widest hover:opacity-90 transition-opacity">
                Create Free Account <ArrowRight size={16} />
              </button>
              <button onClick={() => { window.location.href = "https://admin.rald.cloud"; }} className="flex items-center gap-2 border border-border text-muted-foreground px-6 py-3 rounded font-bold text-sm uppercase tracking-widest hover:bg-secondary transition-colors">
                Operator Access
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <RaldLogo dark className="h-6 w-auto" />
          <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} RALD Inc. All rights reserved.</p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <a href="https://rald.cloud" className="hover:text-foreground transition-colors">rald.cloud</a>
          </div>
        </div>
      </footer>

      {open && <AuthPanel initialTab={initialTab} onClose={close} isModal={true} />}
    </div>
  );
}
