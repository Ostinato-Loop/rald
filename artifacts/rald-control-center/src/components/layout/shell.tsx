import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { Activity, Box, Database, KeyRound, LayoutDashboard, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { RaldLogo } from "@/components/logo";

export function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout } = useAuth();
  const { data: user } = useGetMe({ query: { queryKey: getGetMeQueryKey(), enabled: location !== "/login" } });

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/services", label: "Services", icon: Activity },
    { href: "/deployments", label: "Deployments", icon: Box },
    { href: "/credentials", label: "Credentials", icon: KeyRound },
    { href: "/products", label: "Products", icon: Database },
  ];

  return (
    <div className="flex min-h-screen w-full bg-background dark text-foreground">
      <aside className="w-64 border-r border-border bg-sidebar flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <RaldLogo dark className="h-7 w-auto" />
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div className={cn(
                "flex items-center px-4 py-2.5 text-sm font-medium transition-colors border border-transparent cursor-pointer",
                location === item.href
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground hover:border-border"
              )}>
                <item.icon className="w-4 h-4 mr-3" />
                {item.label}
              </div>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-border mt-auto">
          <div className="flex items-center mb-4 px-2">
            <div className="w-8 h-8 bg-muted border border-border flex items-center justify-center text-xs font-bold mr-3 uppercase">
              {user?.name?.charAt(0) || user?.email?.charAt(0) || "U"}
            </div>
            <div className="overflow-hidden">
              <div className="text-sm font-medium truncate">{user?.name || "Operator"}</div>
              <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center px-4 py-2 text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20 transition-colors"
          >
            <LogOut className="w-4 h-4 mr-3" />
            Sign Out
          </button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col h-screen overflow-auto bg-background">
        <div className="flex-1 p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
