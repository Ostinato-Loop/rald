import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Filter, RefreshCw, Circle } from "lucide-react";
import { apiCall } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

interface LogEntry {
  id: string | number;
  method: string;
  path: string;
  status: number;
  latency: string;
  key?: string;
  time: string;
  ip?: string;
}

const METHODS = ["ALL", "GET", "POST", "DELETE", "PUT"];
const STATUSES = ["ALL", "2xx", "4xx", "5xx"];

const MOCK_LOGS: LogEntry[] = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  method: ["GET", "POST", "DELETE", "GET", "POST"][i % 5],
  path: [
    "/session",
    "/login/send-otp",
    "/api-keys/k1",
    "/user",
    "/login/verify-otp",
  ][i % 5],
  status: [200, 200, 204, 401, 200][i % 5],
  latency: `${Math.floor(Math.random() * 200) + 10}ms`,
  key: "rald_sk_live_a1b2••••",
  time: `${Math.floor(i * 3.2)}s ago`,
  ip: `197.210.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
}));

const statusColor = (s: number) =>
  s >= 500
    ? "text-red-500 bg-red-500/10"
    : s >= 400
      ? "text-yellow-500 bg-yellow-500/10"
      : "text-green-500 bg-green-500/10";

const methodColor = (m: string) =>
  m === "GET"
    ? "text-blue-500 bg-blue-500/10"
    : m === "DELETE"
      ? "text-red-500 bg-red-500/10"
      : "text-green-500 bg-green-500/10";

export default function Logs() {
  const [method, setMethod] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [live, setLive] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data, isLoading, refetch } = useQuery<
    LogEntry[] | { logs?: LogEntry[] }
  >({
    queryKey: ["dev-logs"],
    queryFn: () => apiCall("/developers/logs"),
    retry: 1,
    staleTime: 10_000,
    refetchInterval: live ? 5000 : false,
  });

  const logs: LogEntry[] = Array.isArray(data)
    ? data
    : ((data as { logs?: LogEntry[] })?.logs ?? MOCK_LOGS);

  const filtered = logs.filter((l) => {
    if (method !== "ALL" && l.method !== method) return false;
    if (status !== "ALL") {
      const code = parseInt(status);
      if (l.status < code || l.status >= code + 100) return false;
    }
    if (search && !l.path.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">API Logs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time stream of API requests from your applications
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLive((l) => !l)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${live ? "border-green-500/40 bg-green-500/10 text-green-500" : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            <Circle
              className={`w-2 h-2 fill-current ${live ? "animate-pulse" : ""}`}
            />
            {live ? "Live" : "Paused"}
          </button>
          <button
            onClick={() => refetch()}
            className="p-2 border border-border rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            data-testid="refresh-logs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by path..."
          className="flex-1 min-w-[200px] px-3 py-2 border border-border rounded-lg bg-background text-sm text-foreground outline-none focus:border-primary"
          data-testid="logs-search"
        />
        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
          {METHODS.map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={`px-2.5 py-1 text-xs rounded font-mono font-medium transition-colors ${method === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-2.5 py-1 text-xs rounded font-mono font-medium transition-colors ${status === s ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Log table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="grid grid-cols-[80px_60px_1fr_60px_80px_100px] gap-0 px-4 py-2 border-b border-border bg-muted/40">
          {["Method", "Status", "Path", "Latency", "IP", "Time"].map((h) => (
            <p
              key={h}
              className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider"
            >
              {h}
            </p>
          ))}
        </div>

        <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
          {isLoading ? (
            [1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 m-2 rounded" />
            ))
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">
              No logs match your filters
            </p>
          ) : (
            filtered.map((l) => (
              <div
                key={l.id}
                className="grid grid-cols-[80px_60px_1fr_60px_80px_100px] gap-0 px-4 py-2.5 items-center hover:bg-muted/30 transition-colors"
                data-testid={`log-row-${l.id}`}
              >
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded w-fit ${methodColor(l.method)}`}
                >
                  {l.method}
                </span>
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded w-fit ${statusColor(l.status)}`}
                >
                  {l.status}
                </span>
                <span className="text-xs font-mono text-foreground truncate pr-2">
                  {l.path}
                </span>
                <span className="text-xs font-mono text-muted-foreground">
                  {l.latency}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground truncate">
                  {l.ip || "—"}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {l.time}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="px-4 py-2 border-t border-border bg-muted/20">
          <p className="text-[10px] text-muted-foreground">
            {filtered.length} of {logs.length} entries ·{" "}
            {live ? "Live stream active" : "Paused"}
          </p>
        </div>
      </div>
    </div>
  );
}
