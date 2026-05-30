import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { metricsApi, type MetricPoint } from "@/lib/api";

function SparkBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ height: 6, background: "var(--bg-raised)", borderRadius: 3, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width 0.3s" }} />
    </div>
  );
}

function MiniChart({ data, color, field }: { data: MetricPoint[]; color: string; field: "requests" | "errors" }) {
  if (!data.length) return <div style={{ height: 60, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-faint)", fontSize: "0.72rem" }}>No data</div>;
  const vals = data.map(d => d[field]);
  const max  = Math.max(...vals, 1);
  const w = 100 / data.length;
  return (
    <svg viewBox={`0 0 ${data.length * 10} 40`} style={{ width: "100%", height: 56, display: "block" }}>
      {data.map((d, i) => {
        const h = Math.max(2, (d[field] / max) * 36);
        return (
          <rect key={i} x={i * 10 + 1} y={40 - h} width={w > 2 ? w - 2 : 6} height={h}
            fill={color} opacity={0.8} rx="1" />
        );
      })}
    </svg>
  );
}

export default function Usage() {
  const [data, setData] = useState<MetricPoint[]>([]);
  const [summary, setSummary] = useState({ totalRequests: 0, totalKeys: 0, errors: 0, lastActivity: null as string | null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([metricsApi.daily(), metricsApi.summary()])
      .then(([d, s]) => { setData(d); setSummary(s); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const maxReqs  = Math.max(...data.map(d => d.requests), 1);
  const errRate  = summary.totalRequests > 0 ? ((summary.errors / summary.totalRequests) * 100).toFixed(1) : "0.0";
  const avgLatency = data.length > 0 ? (data.reduce((a, d) => a + (d.latency_ms ?? 0), 0) / data.length).toFixed(0) : "—";

  return (
    <Layout title="Usage" subtitle="API request volume, error rates, and latency over the last 30 days.">
      {loading ? (
        <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Loading…</div>
      ) : (
        <>
          {/* Summary stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
            <div className="stat-card">
              <div className="stat-label">Total requests</div>
              <div className="stat-value">{summary.totalRequests.toLocaleString()}</div>
              <div className="stat-sub">Last 30 days</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Error rate</div>
              <div className="stat-value" style={{ color: parseFloat(errRate) > 1 ? "var(--ember)" : "var(--teal)" }}>{errRate}%</div>
              <div className="stat-sub">{summary.errors} errors</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Avg latency</div>
              <div className="stat-value">{avgLatency}<span style={{ fontSize: "0.8rem", fontWeight: 400 }}> ms</span></div>
              <div className="stat-sub">P50 response time</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Active keys</div>
              <div className="stat-value">{summary.totalKeys}</div>
              <div className="stat-sub">Making requests</div>
            </div>
          </div>

          {data.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="icon">📊</div>
                <div className="title">No usage data yet</div>
                <div className="sub">Start making API calls with your keys to see usage analytics here.</div>
              </div>
            </div>
          ) : (
            <>
              {/* Charts */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
                <div className="card">
                  <div className="section-title">Requests / day</div>
                  <MiniChart data={data} color="var(--teal)" field="requests" />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.65rem", color: "var(--text-faint)", marginTop: 4 }}>
                    <span>{data[0]?.date?.slice(5) ?? ""}</span>
                    <span>{data[data.length - 1]?.date?.slice(5) ?? ""}</span>
                  </div>
                </div>
                <div className="card">
                  <div className="section-title">Errors / day</div>
                  <MiniChart data={data} color="var(--ember)" field="errors" />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.65rem", color: "var(--text-faint)", marginTop: 4 }}>
                    <span>{data[0]?.date?.slice(5) ?? ""}</span>
                    <span>{data[data.length - 1]?.date?.slice(5) ?? ""}</span>
                  </div>
                </div>
              </div>

              {/* Daily breakdown table */}
              <div className="card">
                <div className="section-title">Daily Breakdown</div>
                <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Requests</th>
                        <th>Volume</th>
                        <th>Errors</th>
                        <th>Avg latency</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...data].reverse().map(d => (
                        <tr key={d.date}>
                          <td style={{ color: "var(--text-muted)" }}>{new Date(d.date).toLocaleDateString("en", { month: "short", day: "numeric" })}</td>
                          <td style={{ fontWeight: 600 }}>{d.requests.toLocaleString()}</td>
                          <td style={{ width: 120 }}><SparkBar value={d.requests} max={maxReqs} color="var(--teal)" /></td>
                          <td style={{ color: d.errors > 0 ? "var(--ember)" : "var(--text-muted)" }}>{d.errors}</td>
                          <td style={{ color: "var(--text-muted)" }}>{d.latency_ms ? `${d.latency_ms}ms` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </Layout>
  );
}
