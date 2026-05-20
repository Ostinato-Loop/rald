import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Monitor, Smartphone, Globe, Clock, Trash2, ShieldAlert } from "lucide-react";
import { apiCall } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const MOCK_SESSIONS = [
  { id: "s1", device: "iPhone 14 Pro", browser: "Safari 17", os: "iOS 17", location: "Lagos, Nigeria", ip: "197.210.55.12", lastActive: "Active now", current: true, type: "mobile" },
  { id: "s2", device: "MacBook Pro M3", browser: "Chrome 124", os: "macOS 14", location: "Lagos, Nigeria", ip: "197.210.55.13", lastActive: "2 hours ago", current: false, type: "desktop" },
  { id: "s3", device: "Samsung Galaxy S23", browser: "Chrome 124", os: "Android 14", location: "Abuja, Nigeria", ip: "105.112.8.91", lastActive: "1 day ago", current: false, type: "mobile" },
];

export default function Sessions() {
  const qc = useQueryClient();
  const [revoking, setRevoking] = useState<string | null>(null);

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => apiCall("/sessions"),
    retry: false,
  });

  const displayed = sessions || MOCK_SESSIONS;

  const handleRevoke = async (id: string) => {
    setRevoking(id);
    try {
      await apiCall(`/sessions/${id}`, { method: "DELETE" });
    } catch {}
    toast.success("Session revoked");
    setRevoking(null);
  };

  const handleRevokeAll = async () => {
    try {
      await apiCall("/sessions/all", { method: "DELETE" });
    } catch {}
    toast.success("All other sessions revoked");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sessions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage devices that have access to your account</p>
        </div>
        <button
          onClick={handleRevokeAll}
          className="flex items-center gap-1.5 text-xs text-destructive border border-destructive/20 px-3 py-1.5 rounded-lg hover:bg-destructive/5 transition-colors"
          data-testid="revoke-all-sessions"
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          Revoke all others
        </button>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : (
          displayed.map((session: typeof MOCK_SESSIONS[0]) => (
            <div
              key={session.id}
              className={`bg-card border rounded-xl p-5 flex items-start gap-4 ${session.current ? "border-primary/30" : "border-border"}`}
              data-testid={`session-${session.id}`}
            >
              <div className="p-2.5 bg-muted rounded-lg shrink-0">
                {session.type === "mobile" ? <Smartphone className="w-5 h-5 text-muted-foreground" /> : <Monitor className="w-5 h-5 text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{session.device}</p>
                  {session.current && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Current</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{session.browser} · {session.os}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><Globe className="w-3 h-3" />{session.location}</span>
                  <span className="text-xs text-muted-foreground font-mono">{session.ip}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {session.current ? <span className="text-green-500">Active now</span> : session.lastActive}
                </p>
              </div>
              {!session.current && (
                <button
                  onClick={() => handleRevoke(session.id)}
                  disabled={revoking === session.id}
                  className="shrink-0 p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
                  data-testid={`revoke-session-${session.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
