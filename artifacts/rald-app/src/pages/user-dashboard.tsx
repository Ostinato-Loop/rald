import { useEffect } from "react";
import { useLocation } from "wouter";
import { LogOut, User, CreditCard, Package, BarChart3, Phone, GitBranch, ChevronRight, Copy, CheckCircle } from "lucide-react";
import { useState } from "react";
import { RaldLogo } from "@/components/logo";
import { useAuth } from "@/lib/auth-context";

const PRODUCTS = [
  { name: "PayRald", desc: "Payments & transfers", color: "#10B981", icon: CreditCard, href: "https://pay.rald.cloud", badge: "LIVE" },
  { name: "Loop Business", desc: "Commerce tools", color: "#6366F1", icon: Package, href: "https://loop.rald.cloud", badge: "LIVE" },
  { name: "Loop Dispatch", desc: "Logistics & delivery", color: "#F59E0B", icon: Package, href: "https://dispatch.rald.cloud", badge: "BETA" },
  { name: "Raldtics", desc: "Analytics & insights", color: "#8B5CF6", icon: BarChart3, href: "https://analytics.rald.cloud", badge: "BETA" },
  { name: "Loop Voice", desc: "Communications", color: "#EC4899", icon: Phone, href: "https://voice.rald.cloud", badge: "BETA" },
  { name: "GitRald", desc: "Infrastructure & CI/CD", color: "#EF4444", icon: GitBranch, href: "https://git.rald.cloud", badge: "SOON" },
];

function CopyableId({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 font-mono font-semibold text-[#2ECFA3] hover:text-[#2ECFA3]/80 transition-colors group"
      title="Copy RALD ID"
    >
      {value}
      {copied
        ? <CheckCircle size={12} className="text-[#2ECFA3]" />
        : <Copy size={12} className="opacity-0 group-hover:opacity-60 transition-opacity" />
      }
    </button>
  );
}

export default function UserDashboard() {
  const { user, logout, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !user) setLocation("/");
  }, [user, loading, setLocation]);

  const handleLogout = () => { logout(); setLocation("/"); };

  if (loading || !user) {
    return (
      <div className="min-h-dvh flex items-center justify-center dark">
        <RaldLogo dark className="h-10 w-auto animate-pulse" />
      </div>
    );
  }

  const firstName = user.name?.split(" ")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const raldId = (user as any).raldId ?? null;

  return (
    <div className="min-h-dvh flex flex-col dark bg-background text-foreground">
      <nav className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <RaldLogo dark className="h-7 w-auto" />
          <div className="flex items-center gap-3">
            {raldId && (
              <div className="hidden md:flex items-center gap-1.5 bg-[#2ECFA3]/10 border border-[#2ECFA3]/20 rounded-full px-3 py-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#2ECFA3]/60">ID</span>
                <span className="text-xs font-mono font-semibold text-[#2ECFA3]">{raldId}</span>
              </div>
            )}
            <div className="hidden sm:flex items-center gap-2 bg-secondary rounded-full px-3 py-1.5">
              <div className="w-5 h-5 rounded-full bg-[#2ECFA3]/20 flex items-center justify-center">
                <User size={10} className="text-[#2ECFA3]" />
              </div>
              <span className="text-xs font-medium text-foreground">{user.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded border border-border hover:bg-secondary"
            >
              <LogOut size={13} /> <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-10">
        <div className="mb-10 animate-fade-up">
          <p className="text-xs uppercase tracking-widest text-[#2ECFA3] font-semibold mb-1">{greeting}</p>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">{firstName} 👋</h1>
          <p className="text-muted-foreground mt-2 text-sm">Welcome to your RALD account. Access all your products below.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10 animate-fade-up" style={{ animationDelay: "0.1s" }}>
          {[
            { label: "Active Products", value: "6", color: "#2ECFA3" },
            { label: "Transactions", value: "0", color: "#F4A261" },
            { label: "Deliveries", value: "0", color: "#E63946" },
            { label: "Member Since", value: new Date(user.createdAt).getFullYear().toString(), color: "#8B5CF6" },
          ].map((stat) => (
            <div key={stat.label} className="bg-card border border-border rounded-lg p-4">
              <div className="text-2xl font-black" style={{ color: stat.color }}>{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-1 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>

        <h2 className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-4">Your Products</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-fade-up" style={{ animationDelay: "0.2s" }}>
          {PRODUCTS.map((p) => {
            const Icon = p.icon;
            return (
              <a
                key={p.name}
                href={p.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-4 bg-card border border-border rounded-lg p-4 hover:border-muted-foreground/40 hover:bg-card/80 transition-all"
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${p.color}15` }}>
                  <Icon size={18} style={{ color: p.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm">{p.name}</span>
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider" style={{ background: `${p.color}20`, color: p.color }}>{p.badge}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{p.desc}</p>
                </div>
                <ChevronRight size={14} className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
              </a>
            );
          })}
        </div>

        <div className="mt-10 bg-card border border-border rounded-lg p-6 animate-fade-up" style={{ animationDelay: "0.3s" }}>
          <h3 className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-4">Account</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Name</div>
              <div className="font-semibold">{user.name ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Email</div>
              <div className="font-semibold truncate">{user.email}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Account Type</div>
              <div className="font-semibold capitalize">{user.role === "merchant" ? "Business" : "Personal"}</div>
            </div>
            {raldId && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">RALD ID</div>
                <CopyableId value={raldId} />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
