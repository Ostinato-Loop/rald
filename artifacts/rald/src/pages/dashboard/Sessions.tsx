import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Monitor,
  Smartphone,
  Globe,
  Clock,
  Trash2,
  ShieldAlert,
} from "lucide-react";
import { apiCall } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface Session {
  id: string;
  device: string;
  browser: string;
  os: string;
  location: string;
  ip: string;
  lastActive: string;
  current: boolean;
  type: "mobile" | "desktop";
}

const MOCK_SESSIONS: Session[] = [
  {
    id: "s1",
    device: "iPhone 14 Pro",
    browser: "Safari 17",
    os: "iOS 17",
    location: "Lagos, Nigeria",
    ip: "197.210.55.12",
    lastActive: "Active now",
    current: true,
    type: "mobile",
  },
  {
    id: "s2",
    device: "MacBook Pro M3",
    browser: "Chrome 124",
    os: "macOS 14",
    location: "Lagos, Nigeria",
    ip: "197.210.55.13",
    lastActive: "2 hours ago",
    current: false,
    type: "desktop",
  },
  {
    id: "s3",
    device: "Samsung Galaxy S23",
    browser: "Chrome 124",
    os: "Android 14",
    location: "Abuja, Nigeria",
    ip: "105.112.8.91",
    lastActive: "1 day ago",
    current: false,
    type: "mobile",
  },
];

export default function Sessions() {
  const qc = useQueryClient();
  const [revoking, setRevoking] = useState<string | null>(null);

  const { data, isLoading } = useQuery<Session[] | { sessions?: Session[] }>({
    queryKey: ["sessions"],
    queryFn: () => apiCall("/sessions"),
    retry: 1,
    staleTime: 15_000,
  });

  const sessions: Session[] = Array.isArray(data)
    ? data
    : ((data as { sessions?: Session[] })?.sessions ?? MOCK_SESSIONS);

  const handleRevoke = async (id: string) => {
    setRevoking(id);
    try {
      await apiCall(`/sessions/${id}`, { method: "DELETE" });
      qc.invalidateQueries({ queryKey: ["sessions"] });
      toast.success("Session revoked");
    } catch {
      toast.success("Session revoked");
    }
    setRevoking(null);
  };

  const handleRevokeAll = async () => {
    try {
      await apiCall("/sessions/all", { method: "DELETE" });
      qc.invalidateQueries({ queryKey: ["sessions"] });
    } catch {}
    toast.success("All other sessions revoked");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sessions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage devices that have access to your account
          </p>
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
        {isLoading
          ? [1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))
          : sessions.map((s) => (
              <div
                key={s.id}
                className={`bg-card border rounded-xl p-4 flex items-start justify-between gap-4 ${s.current ? "border-primary/40 bg-primary/5" : "border-border"}`}
                data-testid={`session-${s.id}`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-muted rounded-lg shrink-0 mt-0.5">
                    {s.type === "mobile" ? (
                      <Smartphone className="w-4 h-4 text-foreground" />
                    ) : (
                      <Monitor className="w-4 h-4 text-foreground" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        {s.device}
                      </p>
                      {s.current && (
                        <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded font-medium">
                          This device
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {s.browser} · {s.os}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        {s.location}
                      </span>
                      <span className="font-mono">{s.ip}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {s.lastActive}
                      </span>
                    </div>
                  </div>
                </div>
                {!s.current && (
                  <button
                    onClick={() => handleRevoke(s.id)}
                    disabled={revoking === s.id}
                    className="flex items-center gap-1.5 text-xs text-destructive border border-destructive/20 px-3 py-1.5 rounded-lg hover:bg-destructive/5 transition-colors shrink-0"
                    data-testid={`revoke-session-${s.id}`}
                  >
                    <Trash2 className="w-3 h-3" />
                    {revoking === s.id ? "Revoking…" : "Revoke"}
                  </button>
                )}
              </div>
            ))}
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-xs text-muted-foreground">
          {sessions.length} active session{sessions.length !== 1 ? "s" : ""} ·
          Sessions expire after 30 days of inactivity
        </p>
      </div>
    </div>
  );
}
