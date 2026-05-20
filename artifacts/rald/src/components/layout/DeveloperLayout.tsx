import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Code2, Key, Webhook, BarChart3, BookOpen,
  CreditCard, Settings, Shield, LogOut, ChevronLeft, ChevronRight,
  Sun, Moon, Menu, X, Bell, FileText
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme";

const devNavItems = [
  { path: "/developers", icon: LayoutDashboard, label: "Overview", exact: true },
  { path: "/developers/apps", icon: Code2, label: "Applications" },
  { path: "/developers/api-keys", icon: Key, label: "API Keys" },
  { path: "/developers/oauth", icon: Shield, label: "OAuth Clients" },
  { path: "/developers/webhooks", icon: Webhook, label: "Webhooks" },
  { path: "/developers/logs", icon: FileText, label: "API Logs" },
  { path: "/developers/usage", icon: BarChart3, label: "Usage" },
  { path: "/developers/sdks", icon: BookOpen, label: "SDKs" },
  { path: "/developers/billing", icon: CreditCard, label: "Billing" },
  { path: "/developers/settings", icon: Settings, label: "Settings" },
];

export function DeveloperLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "DE";

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        animate={{ width: collapsed ? 64 : 240 }}
        transition={{ duration: 0.2 }}
        className="hidden md:flex flex-col bg-sidebar border-r border-sidebar-border h-full relative z-20 overflow-hidden"
      >
        <div className="flex items-center h-16 px-4 border-b border-sidebar-border shrink-0 gap-3">
          <div className="flex items-center justify-center shrink-0 bg-white rounded-lg px-2 py-1 shadow-sm">
            <img src="/rald-logo.png" alt="RALD" className={`w-auto transition-all duration-200 ${collapsed ? "h-4" : "h-5"}`} />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <p className="font-bold text-sidebar-foreground text-sm leading-none">Developers</p>
                <p className="text-xs text-muted-foreground">RALD Platform</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="px-2 py-2 border-b border-sidebar-border">
          <Link href="/dashboard">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors cursor-pointer">
              <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
              <AnimatePresence>
                {!collapsed && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>User Dashboard</motion.span>}
              </AnimatePresence>
            </div>
          </Link>
        </div>

        <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
          {devNavItems.map(({ path, icon: Icon, label, exact }) => {
            const active = exact ? location === path : location.startsWith(path);
            return (
              <Link key={path} href={path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all group relative ${
                  active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
                data-testid={`dev-nav-${label.toLowerCase().replace(/\s/g, "-")}`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm font-medium overflow-hidden whitespace-nowrap">
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                    {label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-2 border-t border-sidebar-border">
          <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
            <LogOut className="w-4 h-4 shrink-0" />
            <AnimatePresence>
              {!collapsed && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm font-medium">Logout</motion.span>}
            </AnimatePresence>
          </button>
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-sidebar border border-sidebar-border rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground shadow-sm"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </motion.aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 border-b border-border bg-background/95 backdrop-blur-sm flex items-center px-4 gap-4 shrink-0">
          <button onClick={() => setMobileOpen(true)} className="md:hidden text-muted-foreground">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">v1.0</span>
            <span className="text-xs text-muted-foreground">API status:</span>
            <span className="flex items-center gap-1 text-xs text-green-500"><div className="w-1.5 h-1.5 rounded-full bg-green-500" />Operational</span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
              {initials}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
