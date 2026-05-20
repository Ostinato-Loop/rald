import { useState } from "react";
import { Filter, RefreshCw } from "lucide-react";

const METHODS = ["ALL", "GET", "POST", "DELETE", "PUT"];
const STATUSES = ["ALL", "2xx", "4xx", "5xx"];

const MOCK_LOGS = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  method: ["GET", "POST", "DELETE", "GET", "POST"][i % 5],
  path: ["/session", "/login/send-otp", "/api-keys/k1", "/user", "/login/verify-otp"][i % 5],
  status: [200, 200, 204, 401, 200][i % 5],
  latency: `${Math.floor(Math.random() * 200) + 10}ms`,
  key: "rald_sk_live_a1b2••••",
  time: `${Math.floor(i * 3.2)}s ago`,
  ip: `197.210.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
}));

const statusColor = (s: number) => s >= 500 ? "text-red-500 bg-red-500/10" : s >= 400 ? "text-yellow-500 bg-yellow-500/10" : "text-green-500 bg-green-500/10";
const methodColor = (m: string) => m === "GET" ? "text-blue-500 bg-blue-500/10" : m === "DELETE" ? "text-red-500 bg-red-500/10" : "text-green-500 bg-green-500/10";

export default function Logs() {
  const [method, setMethod] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");

  const filtered = MOCK_LOGS.filter(l => {
    if (method !== "ALL" && l.method !== method) return false;
    if (status !== "ALL") {
      const code = parseInt(status);
      if (l.status < code || l.status >= code + 100) return false;
    }
    if (search && !l.path.includes(search)) return false;
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">API Logs</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Real-time stream of API requests from your applications</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter by path..."
          className="flex-1 min-w-[200px] px-3 py-2 border border-border rounded-lg bg-background text-sm text-foreground outline-none focus:border-primary"
          data-testid="logs-search"
        />
        <div className="flex bg-muted rounded-lg p-0.5">
          {METHODS.map(m => (
            <button key={m} onClick={() => setMethod(m)} className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${method === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>{m}</button>
          ))}
        </div>
        <div className="flex bg-muted rounded-lg p-0.5">
          {STATUSES.map(s => (
            <button key={s} onClick={() => setStatus(s)} className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${status === s ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>{s}</button>
          ))}
        </div>
        <button className="p-2 border border-border rounded-lg text-muted-foreground hover:text-foreground transition-colors" data-testid="refresh-logs">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {["Method", "Path", "Status", "Latency", "Key", "IP", "Time"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-muted-foreground font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.slice(0, 20).map(log => (
                <tr key={log.id} className="hover:bg-muted/30 transition-colors" data-testid={`log-row-${log.id}`}>
                  <td className="px-4 py-2.5">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${methodColor(log.method)}`}>{log.method}</span>
                  </td>
                  <td className="px-4 py-2.5 text-foreground">{log.path}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-1.5 py-0.5 rounded ${statusColor(log.status)}`}>{log.status}</span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{log.latency}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{log.key}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{log.ip}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{log.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
          Showing {filtered.length} of {MOCK_LOGS.length} events
        </div>
      </div>
    </div>
  );
}
