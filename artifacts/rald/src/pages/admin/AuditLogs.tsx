import { useState } from "react";
import { Search, AlertCircle, Info, AlertTriangle, Shield } from "lucide-react";

const SEVERITIES = ["all", "info", "warn", "critical"];

const MOCK_AUDIT = Array.from({ length: 40 }, (_, i) => ({
  id: `audit_${String(i + 1).padStart(6, "0")}`,
  actor: ["+2348012345678", "admin@rald.ng", "system", "+2348055566677"][i % 4],
  action: ["user.login", "role.change", "key.revoked", "session.revoked", "otp.sent", "user.suspended", "flag.enabled", "dispute.resolved"][i % 8],
  resource: ["user:rald_usr_0001", "api-key:k1", "session:s2", "feature:otp_v2", "wallet:w1"][i % 5],
  ip: `197.210.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
  severity: ["info", "info", "warn", "critical"][i % 4],
  time: `${i * 4} min ago`,
}));

const severityIcon = (s: string) => {
  if (s === "critical") return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
  if (s === "warn") return <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />;
  return <Info className="w-3.5 h-3.5 text-blue-500" />;
};

export default function AuditLogs() {
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("all");

  const filtered = MOCK_AUDIT.filter(l => {
    if (severity !== "all" && l.severity !== severity) return false;
    if (search && !l.action.includes(search) && !l.actor.includes(search)) return false;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Audit Logs</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Immutable record of all actions taken on the platform</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search action or actor..." className="w-full pl-9 pr-3 py-2 border border-border rounded-lg bg-background text-sm text-foreground outline-none focus:border-primary" data-testid="audit-search" />
        </div>
        <div className="flex bg-muted rounded-lg p-0.5">
          {SEVERITIES.map(s => (
            <button key={s} onClick={() => setSeverity(s)} className={`px-2.5 py-1 text-xs font-medium rounded-md capitalize transition-colors ${severity === s ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>{s}</button>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {["Severity", "Action", "Actor", "Resource", "IP", "Time"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-muted-foreground font-medium not-italic">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.slice(0, 25).map(log => (
                <tr key={log.id} className="hover:bg-muted/30 transition-colors" data-testid={`audit-row-${log.id}`}>
                  <td className="px-4 py-2.5">{severityIcon(log.severity)}</td>
                  <td className="px-4 py-2.5 text-foreground">{log.action}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{log.actor}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{log.resource}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{log.ip}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{log.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground flex items-center gap-2">
          <Shield className="w-3.5 h-3.5" />
          Showing {filtered.length} immutable log entries
        </div>
      </div>
    </div>
  );
}
