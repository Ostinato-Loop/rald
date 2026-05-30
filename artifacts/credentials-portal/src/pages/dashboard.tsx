import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { apiKeysApi, metricsApi, type ApiKey } from "@/lib/api";
import { getUser } from "@/lib/auth";

function RelTime({ ts }: { ts: string | null }) {
  if (!ts) return <span style={{ color: "var(--text-faint)" }}>—</span>;
  const d = new Date(ts);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  const str  = days > 0 ? `${days}d ago` : hrs > 0 ? `${hrs}h ago` : mins > 0 ? `${mins}m ago` : "just now";
  return <span title={d.toLocaleString()}>{str}</span>;
}

export default function Dashboard() {
  const user = getUser();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [stats, setStats] = useState({ totalRequests: 0, totalKeys: 0, errors: 0, lastActivity: null as string | null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([apiKeysApi.list(), metricsApi.summary()])
      .then(([ks, s]) => { setKeys(ks); setStats({ ...s, totalKeys: ks.length }); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const liveKeys = keys.filter(k => k.environment === "live").length;
  const testKeys = keys.filter(k => k.environment === "test").length;
  const recentKeys = keys.slice(0, 4);

  return (
    <Layout
      title={`Welcome back${user?.name ? `, ${user.name.split(" ")[0]}` : ""}`}
      subtitle="Your RALD Developer Portal — API keys, usage, and credentials in one place."
    >
      {loading ? (
        <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Loading…</div>
      ) : (
        <>
          {/* Stats grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 28 }}>
            <div className="stat-card">
              <div className="stat-label">Total API Keys</div>
              <div className="stat-value">{keys.length}</div>
              <div className="stat-sub" style={{ color: "var(--teal)" }}>
                {liveKeys} live · {testKeys} test
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">API Calls (30d)</div>
              <div className="stat-value">{stats.totalRequests.toLocaleString()}</div>
              <div className="stat-sub">Total authenticated requests</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Error Rate</div>
              <div className="stat-value" style={{ color: stats.errors > 0 ? "var(--ember)" : "var(--teal)" }}>
                {stats.totalRequests > 0 ? `${((stats.errors / stats.totalRequests) * 100).toFixed(1)}%` : "0%"}
              </div>
              <div className="stat-sub">{stats.errors} errors</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Last Activity</div>
              <div className="stat-value" style={{ fontSize: "1rem" }}>
                <RelTime ts={stats.lastActivity} />
              </div>
              <div className="stat-sub">Most recent API call</div>
            </div>
          </div>

          {/* RALD Identity card */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 28 }}>
            <div className="card">
              <div className="section-title">Your RALD Identity</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Row label="RALD ID" value={user?.raldId ?? "—"} mono accent />
                <Row label="Email"   value={user?.email ?? "—"} />
                <Row label="Role"    value={user?.role ?? "—"} badge />
              </div>
              <div className="separator" />
              <a href="/keys" style={{ color: "var(--teal)", fontSize: "0.78rem", fontWeight: 600, textDecoration: "none" }}>
                Manage API keys →
              </a>
            </div>

            <div className="card">
              <div className="section-title">Quick Actions</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <QuickAction href="/keys"  icon="🔑" title="Create API Key"    sub="Generate a new live or test key" />
                <QuickAction href="/usage" icon="📊" title="View Usage"        sub="Monitor requests and errors" />
                <QuickAction href="/audit" icon="🗂" title="Audit Log"         sub="Review recent account activity" />
                <QuickAction href="https://docs.rald.cloud" icon="📖" title="Read the docs" sub="Integration guides and reference" ext />
              </div>
            </div>
          </div>

          {/* Recent keys */}
          {recentKeys.length > 0 && (
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div className="section-title" style={{ margin: 0 }}>Recent API Keys</div>
                <a href="/keys" style={{ color: "var(--teal)", fontSize: "0.75rem", fontWeight: 600, textDecoration: "none" }}>View all →</a>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Prefix</th>
                      <th>Env</th>
                      <th>Last used</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentKeys.map(k => (
                      <tr key={k.id}>
                        <td style={{ fontWeight: 600 }}>{k.name}</td>
                        <td><code className="mono">{k.key_prefix}…</code></td>
                        <td><span className={`badge badge-${k.environment}`}>{k.environment}</span></td>
                        <td><RelTime ts={k.last_used_at} /></td>
                        <td><RelTime ts={k.created_at} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}

function Row({ label, value, mono, accent, badge: isBadge }: { label: string; value: string; mono?: boolean; accent?: boolean; badge?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{label}</span>
      {isBadge ? (
        <span className="badge badge-active">{value}</span>
      ) : (
        <span className={mono ? "mono" : ""} style={{ fontSize: "0.8rem", color: accent ? "var(--teal)" : "var(--text)", fontWeight: mono ? 600 : 400 }}>
          {value}
        </span>
      )}
    </div>
  );
}

function QuickAction({ href, icon, title, sub, ext }: { href: string; icon: string; title: string; sub: string; ext?: boolean }) {
  const props = ext ? { href, target: "_blank", rel: "noopener" } : { href };
  return (
    <a {...props} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "var(--bg-raised)", borderRadius: "var(--radius-sm)", textDecoration: "none", cursor: "pointer", border: "1px solid var(--border-muted)" }}>
      <span style={{ fontSize: "1.1rem", width: 24, textAlign: "center" }}>{icon}</span>
      <div>
        <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text)" }}>{title}</div>
        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{sub}</div>
      </div>
    </a>
  );
}
