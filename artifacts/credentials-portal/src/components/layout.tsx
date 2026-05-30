import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Sidebar } from "./sidebar";
import { getToken, redirectToLogin, handleAuthRedirect } from "@/lib/auth";
import { authApi } from "@/lib/api";

interface LayoutProps { children: React.ReactNode; title: string; subtitle?: string; action?: React.ReactNode; }

export function Layout({ children, title, subtitle, action }: LayoutProps) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <div className="page-header" style={{ paddingBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
            <div>
              <h1 className="page-title">{title}</h1>
              {subtitle && <p className="page-subtitle">{subtitle}</p>}
            </div>
            {action && <div style={{ flexShrink: 0 }}>{action}</div>}
          </div>
        </div>
        <div className="page-body">{children}</div>
      </div>
    </div>
  );
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [, setLoc] = useLocation();

  useEffect(() => {
    handleAuthRedirect();
    const token = getToken();
    if (!token) { redirectToLogin(); return; }
    authApi.me()
      .then(() => setReady(true))
      .catch(() => redirectToLogin());
  }, [setLoc]);

  if (!ready) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", flexDirection: "column", gap: 12 }}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 92 108" width="36" height="36" style={{ opacity: 0.8, animation: "spin 1.4s linear infinite" }}>
          <defs>
            <mask id="sl" maskUnits="userSpaceOnUse" x="0" y="0" width="92" height="108">
              <text fontFamily="Arial Black,sans-serif" fontSize="106" fontWeight="900" x="0" y="104" fill="white">A</text>
            </mask>
          </defs>
          <rect x="0" y="0"  width="92" height="48" fill="#2ECFA3" mask="url(#sl)" />
          <rect x="0" y="48" width="46" height="60" fill="#E63946" mask="url(#sl)" />
          <rect x="46" y="48" width="46" height="60" fill="#F4A261" mask="url(#sl)" />
        </svg>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", letterSpacing: "0.1em" }}>AUTHENTICATING…</span>
      </div>
    );
  }

  return <>{children}</>;
}
