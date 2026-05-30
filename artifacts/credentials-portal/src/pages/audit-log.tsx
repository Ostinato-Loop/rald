import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { auditApi, type AuditLog } from "@/lib/api";

const ACTION_COLORS: Record<string, string> = {
  api_key_created:      "var(--teal)",
  api_key_revoked:      "var(--ember)",
  api_key_rotated:      "var(--amber)",
  login_success:        "var(--teal)",
  login_failed:         "var(--ember)",
  otp_sent:             "var(--amber)",
  otp_verified:         "var(--teal)",
  otp_failed:           "var(--ember)",
  password_reset:       "var(--amber)",
  session_created:      "var(--teal)",
  session_revoked:      "var(--ember)",
  refresh_token_used:   "var(--teal)",
  refresh_family_revoked: "var(--ember)",
};

const ACTION_ICONS: Record<string, string> = {
  api_key_created:  "🔑",
  api_key_revoked:  "🗑",
  api_key_rotated:  "↻",
  login_success:    "✓",
  login_failed:     "✗",
  otp_sent:         "📨",
  otp_verified:     "✓",
  otp_failed:       "✗",
  password_reset:   "🔒",
  session_created:  "🟢",
  session_revoked:  "⊘",
  refresh_token_used: "↻",
  refresh_family_revoked: "🚫",
};

function RelTime({ ts }: { ts: string }) {
  const d = new Date(ts);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  const str  = days > 0 ? `${days}d ago` : hrs > 0 ? `${hrs}h ago` : mins > 0 ? `${mins}m ago` : "just now";
  return <span title={d.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}>{str}</span>;
}

function ActionBadge({ action }: { action: string }) {
  const color = ACTION_COLORS[action] ?? "var(--text-muted)";
  const icon  = ACTION_ICONS[action] ?? "•";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.72rem", fontWeight: 600, color }}>
      <span>{icon}</span>
      {action.replace(/_/g, " ")}
    </span>
  );
}

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  useEffect(() => {
    auditApi.list(100)
      .then(setLogs)
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, []);

  const allActions = [...new Set(logs.map(l => l.action))].sort();

  const filtered = logs.filter(l => {
    const matchAction = actionFilter === "all" || l.action === actionFilter;
    const matchSearch = !search || l.action.includes(search) || l.ip?.includes(search) || l.resource_type?.includes(search) || l.resource_id?.includes(search);
    return matchAction && matchSearch;
  });

  return (
    <Layout title="Audit Log" subtitle="A complete history of security events on your account.">
      {/* Filter bar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <input
          className="input"
          style={{ maxWidth: 220 }}
          placeholder="Search events…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="input"
          style={{ maxWidth: 200 }}
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
        >
          <option value="all">All events</option>
          {allActions.map(a => <option key={a} value={a}>{a.replace(/_/g, " ")}</option>)}
        </select>
        <div style={{ marginLeft: "auto", fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center" }}>
          {filtered.length} event{filtered.length !== 1 ? "s" : ""}
        </div>
      </div>

      {loading ? (
        <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🗂</div>
          <div className="title">No audit events found</div>
          <div className="sub">Account activity will appear here as you use RALD services.</div>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Event</th>
                <th>Resource</th>
                <th>IP address</th>
                <th>Metadata</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(log => (
                <tr key={log.id}>
                  <td><ActionBadge action={log.action} /></td>
                  <td>
                    {log.resource_type ? (
                      <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                        {log.resource_type}
                        {log.resource_id && <code className="mono" style={{ marginLeft: 6, fontSize: "0.68rem" }}>{log.resource_id.slice(0, 8)}…</code>}
                      </span>
                    ) : <span style={{ color: "var(--text-faint)" }}>—</span>}
                  </td>
                  <td>
                    <code className="mono" style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {log.ip ?? "—"}
                    </code>
                  </td>
                  <td>
                    {log.metadata && Object.keys(log.metadata).length > 0 ? (
                      <details>
                        <summary style={{ cursor: "pointer", fontSize: "0.72rem", color: "var(--text-muted)" }}>
                          {Object.keys(log.metadata).length} field{Object.keys(log.metadata).length !== 1 ? "s" : ""}
                        </summary>
                        <pre style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: 4, maxWidth: 200, overflow: "auto" }}>
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </details>
                    ) : <span style={{ color: "var(--text-faint)" }}>—</span>}
                  </td>
                  <td style={{ color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                    <RelTime ts={log.created_at} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
