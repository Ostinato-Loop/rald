import { useState, useEffect } from "react";
import { Monitor, Smartphone, Globe, Trash2, Clock, RefreshCw } from "lucide-react";

interface Session {
  id: string;
  userAgent?: string;
  ipAddress?: string;
  lastSeenAt: string;
  createdAt: string;
  current?: boolean;
}

function parseDevice(ua?: string): { icon: typeof Monitor; label: string } {
  if (!ua) return { icon: Monitor, label: "Unknown device" };
  const lower = ua.toLowerCase();
  if (lower.includes("mobile") || lower.includes("iphone") || lower.includes("android")) {
    return { icon: Smartphone, label: lower.includes("iphone") ? "iPhone" : lower.includes("android") ? "Android" : "Mobile" };
  }
  if (lower.includes("firefox")) return { icon: Monitor, label: "Firefox" };
  if (lower.includes("chrome")) return { icon: Monitor, label: "Chrome" };
  if (lower.includes("safari")) return { icon: Monitor, label: "Safari" };
  return { icon: Globe, label: "Browser" };
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  const hr = Math.floor(min / 60);
  const days = Math.floor(hr / 24);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  if (hr < 24) return `${hr}h ago`;
  return `${days}d ago`;
}

export default function Sessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revoking, setRevoking] = useState<string | null>(null);

  const token = localStorage.getItem("rald_token");

  const fetchSessions = async () => {
    if (!token) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("https://api.rald.cloud/api/auth/sessions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json() as Session[];
        setSessions(data);
      } else {
        setSessions([{
          id: "current",
          userAgent: navigator.userAgent,
          lastSeenAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          current: true,
        }]);
      }
    } catch {
      setSessions([{
        id: "current",
        userAgent: navigator.userAgent,
        lastSeenAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        current: true,
      }]);
    } finally { setLoading(false); }
  };

  useEffect(() => { void fetchSessions(); }, []);

  const handleRevoke = async (sessionId: string) => {
    if (!token || sessionId === "current") return;
    setRevoking(sessionId);
    try {
      await fetch(`https://api.rald.cloud/api/auth/sessions/${sessionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch {
      setError("Failed to revoke session");
    } finally { setRevoking(null); }
  };

  const handleRevokeAll = async () => {
    if (!token) return;
    setRevoking("all");
    try {
      await fetch("https://api.rald.cloud/api/auth/sessions", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setSessions((prev) => prev.filter((s) => s.current));
    } catch {
      setError("Failed to revoke sessions");
    } finally { setRevoking(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Sessions</h1>
          <p className="text-sm text-muted-foreground mt-1">Active devices and sessions for your account</p>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={fetchSessions} disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground border border-border hover:border-muted-foreground transition-colors">
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          {sessions.length > 1 && (
            <button type="button" onClick={handleRevokeAll} disabled={revoking === "all"}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-destructive border border-destructive/30 hover:bg-destructive/10 transition-colors disabled:opacity-50">
              <Trash2 className="w-3 h-3" />
              Revoke all other
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="text-xs text-destructive border border-destructive/30 bg-destructive/10 px-3 py-2">{error}</p>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 bg-card border border-border animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => {
            const { icon: Icon, label } = parseDevice(session.userAgent);
            const isCurrent = session.current || session.id === "current";
            return (
              <div key={session.id}
                className={`bg-card border p-4 flex items-start justify-between gap-4 ${isCurrent ? "border-primary/30" : "border-border"}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 border flex items-center justify-center flex-shrink-0 ${isCurrent ? "border-primary/40 bg-primary/10" : "border-border bg-muted"}`}>
                    <Icon className={`w-4 h-4 ${isCurrent ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground">{label}</span>
                      {isCurrent && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-2 py-0.5">
                          Current
                        </span>
                      )}
                    </div>
                    {session.ipAddress && (
                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <Globe className="w-3 h-3" /> {session.ipAddress}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Last active {timeAgo(session.lastSeenAt)} · Created {timeAgo(session.createdAt)}
                    </p>
                  </div>
                </div>
                {!isCurrent && (
                  <button type="button"
                    onClick={() => handleRevoke(session.id)}
                    disabled={revoking === session.id}
                    className="flex-shrink-0 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center pt-2">
        RALD Control Center — LILCKY STUDIO LIMITED
      </p>
    </div>
  );
}
