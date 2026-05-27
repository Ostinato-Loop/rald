import { useEffect } from "react";
import { useLocation } from "wouter";
import { LogOut, Building2, CreditCard, Package, BarChart3, ChevronRight, TrendingUp, Users, Truck, Zap } from "lucide-react";
import { RaldLogo } from "@/components/logo";
import { useAuth } from "@/lib/auth-context";

const MERCHANT_PRODUCTS = [
  { name: "Loop Business", desc: "Your merchant storefront & inventory", color: "#6366F1", icon: Package, href: "https://loop.rald.cloud", badge: "LIVE", primary: true },
  { name: "PayRald", desc: "Accept payments from customers", color: "#10B981", icon: CreditCard, href: "https://pay.rald.cloud", badge: "LIVE", primary: true },
  { name: "Loop Dispatch", desc: "Manage deliveries & logistics", color: "#F59E0B", icon: Truck, href: "https://dispatch.rald.cloud", badge: "BETA", primary: false },
  { name: "Raldtics", desc: "Sales analytics & insights", color: "#8B5CF6", icon: BarChart3, href: "https://analytics.rald.cloud", badge: "BETA", primary: false },
];

const QUICK_ACTIONS = [
  { label: "Add Product", icon: Package, color: "#6366F1" },
  { label: "View Orders", icon: Users, color: "#10B981" },
  { label: "Track Delivery", icon: Truck, color: "#F59E0B" },
  { label: "View Revenue", icon: TrendingUp, color: "#8B5CF6" },
];

export default function MerchantDashboard() {
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

  return (
    <div className="min-h-dvh flex flex-col dark bg-background text-foreground">
      <nav className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <RaldLogo dark className="h-7 w-auto" />
            <span className="hidden sm:block text-xs font-black uppercase tracking-widest text-[#F4A261] border border-[#F4A261]/30 bg-[#F4A261]/10 px-2 py-0.5 rounded">Merchant</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-secondary rounded-full px-3 py-1.5">
              <div className="w-5 h-5 rounded-full bg-[#F4A261]/20 flex items-center justify-center">
                <Building2 size={10} className="text-[#F4A261]" />
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
          <p className="text-xs uppercase tracking-widest text-[#F4A261] font-semibold mb-1">Merchant Portal</p>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Welcome, {firstName} 🏪</h1>
          <p className="text-muted-foreground mt-2 text-sm">Your business command center. Manage sales, logistics, and analytics in one place.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10 animate-fade-up" style={{ animationDelay: "0.1s" }}>
          {[
            { label: "Total Revenue", value: "₦0", color: "#10B981" },
            { label: "Active Orders", value: "0", color: "#F4A261" },
            { label: "Products Listed", value: "0", color: "#6366F1" },
            { label: "Customers", value: "0", color: "#8B5CF6" },
          ].map((stat) => (
            <div key={stat.label} className="bg-card border border-border rounded-lg p-4">
              <div className="text-2xl font-black" style={{ color: stat.color }}>{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-1 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="mb-6 animate-fade-up" style={{ animationDelay: "0.15s" }}>
          <h2 className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  className="flex flex-col items-center gap-2 bg-card border border-border rounded-lg p-4 hover:border-muted-foreground/40 transition-all text-sm font-semibold"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${action.color}15` }}>
                    <Icon size={16} style={{ color: action.color }} />
                  </div>
                  {action.label}
                </button>
              );
            })}
          </div>
        </div>

        <h2 className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-4">Your Tools</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8 animate-fade-up" style={{ animationDelay: "0.2s" }}>
          {MERCHANT_PRODUCTS.map((p) => {
            const Icon = p.icon;
            return (
              <a
                key={p.name}
                href={p.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-4 bg-card border border-border rounded-lg p-4 hover:border-muted-foreground/40 transition-all"
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${p.color}15` }}>
                  <Icon size={18} style={{ color: p.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm">{p.name}</span>
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider" style={{ background: `${p.color}20`, color: p.color }}>{p.badge}</span>
                    {p.primary && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider bg-[#F4A261]/15 text-[#F4A261]">Core</span>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{p.desc}</p>
                </div>
                <ChevronRight size={14} className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
              </a>
            );
          })}
        </div>

        <div className="bg-gradient-to-r from-[#F4A261]/10 to-[#2ECFA3]/10 border border-[#F4A261]/20 rounded-lg p-6 animate-fade-up" style={{ animationDelay: "0.3s" }}>
          <div className="flex items-start gap-3">
            <Zap size={18} className="text-[#F4A261] mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-black text-sm mb-1">Get set up in minutes</h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                Launch your storefront on Loop Business, connect PayRald for payments, and start selling to customers across Africa.
              </p>
              <a
                href="https://loop.rald.cloud"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#F4A261] hover:underline"
              >
                Launch Loop Business <ChevronRight size={12} />
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
