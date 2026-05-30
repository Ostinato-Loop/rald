import { useLocation, Link } from "wouter";
import { RaldIcon } from "./logo";
import { getUser, clearSession, redirectToLogin } from "@/lib/auth";

const NAV = [
  { path: "/",          icon: "⬡",  label: "Overview" },
  { path: "/keys",      icon: "🔑",  label: "API Keys" },
  { path: "/usage",     icon: "📊",  label: "Usage" },
  { path: "/org",       icon: "🏢",  label: "Organization" },
  { path: "/audit",     icon: "🗂",  label: "Audit Log" },
];

export function Sidebar() {
  const [location] = useLocation();
  const user = getUser();
  const initials = (user?.name ?? user?.email ?? "U").slice(0, 2).toUpperCase();

  const handleSignOut = () => {
    clearSession();
    redirectToLogin();
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <RaldIcon size={26} />
          <div>
            <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--text)", letterSpacing: "0.02em" }}>
              RALD
            </div>
            <div style={{ fontSize: "0.58rem", fontWeight: 600, color: "var(--text-faint)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
              Developer Portal
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Platform</div>
        {NAV.map(({ path, icon, label }) => {
          const active = path === "/" ? location === "/" : location.startsWith(path);
          return (
            <Link key={path} href={path}>
              <a className={`nav-item${active ? " active" : ""}`}>
                <span className="icon">{icon}</span>
                {label}
              </a>
            </Link>
          );
        })}

        <div className="sidebar-section-label" style={{ marginTop: 8 }}>Resources</div>
        <a className="nav-item" href="https://docs.rald.cloud" target="_blank" rel="noopener">
          <span className="icon">📖</span>
          Docs
        </a>
        <a className="nav-item" href="https://status.rald.cloud" target="_blank" rel="noopener">
          <span className="icon">🟢</span>
          Status
        </a>
      </nav>

      {/* User footer */}
      <div className="sidebar-footer">
        {user && (
          <div className="user-card">
            <div className="user-avatar">{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user.name ?? user.email}
              </div>
              {user.raldId && (
                <div style={{ fontSize: "0.62rem", color: "var(--teal)", fontWeight: 600 }}>
                  {user.raldId}
                </div>
              )}
            </div>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="nav-item"
          style={{ marginTop: 6, color: "var(--ember)", width: "100%" }}
        >
          <span className="icon">↩</span>
          Sign out
        </button>
      </div>
    </aside>
  );
}
