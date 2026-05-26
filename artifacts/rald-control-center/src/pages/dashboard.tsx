import { useGetMetricsSummary, useListServices, useListDeployments, useGetServiceMetrics } from "@workspace/api-client-react";
import { Activity, Box, Database, KeyRound, TrendingUp, CheckCircle2, AlertCircle, Clock } from "lucide-react";

function StatCard({ label, value, sub, icon: Icon, accent }: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent?: string;
}) {
  return (
    <div className="border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{label}</span>
        <Icon className={`w-4 h-4 ${accent || "text-muted-foreground"}`} />
      </div>
      <div className="text-3xl font-bold text-foreground mb-1">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    running: "text-primary border-primary/30 bg-primary/10",
    healthy: "text-primary border-primary/30 bg-primary/10",
    success: "text-primary border-primary/30 bg-primary/10",
    degraded: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
    stopped: "text-muted-foreground border-border bg-muted/50",
    failed: "text-destructive border-destructive/30 bg-destructive/10",
    pending: "text-blue-400 border-blue-400/30 bg-blue-400/10",
  };
  return (
    <span className={`px-2 py-0.5 text-xs font-medium uppercase tracking-wider border ${map[status] || "text-muted-foreground border-border"}`}>
      {status}
    </span>
  );
}

export default function Dashboard() {
  const { data: metrics, isLoading: metricsLoading } = useGetMetricsSummary();
  const { data: services } = useListServices();
  const { data: deployments } = useListDeployments();
  const { data: serviceMetrics } = useGetServiceMetrics();

  const recentDeployments = deployments?.slice(0, 5) || [];
  const recentServices = services?.slice(0, 6) || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold uppercase tracking-widest text-foreground">System Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">RALD Infrastructure — Live Status</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Total Services"
          value={metricsLoading ? "—" : (metrics?.totalServices ?? 0)}
          sub="Managed services"
          icon={Activity}
          accent="text-primary"
        />
        <StatCard
          label="Active Services"
          value={metricsLoading ? "—" : (metrics?.activeServices ?? 0)}
          sub="Currently running"
          icon={CheckCircle2}
          accent="text-primary"
        />
        <StatCard
          label="Deployments"
          value={metricsLoading ? "—" : (metrics?.totalDeployments ?? 0)}
          sub="All environments"
          icon={Box}
          accent="text-secondary"
        />
        <StatCard
          label="Products"
          value={metricsLoading ? "—" : (metrics?.totalProducts ?? 0)}
          sub="RALD ecosystem"
          icon={Database}
          accent="text-chart-3"
        />
      </div>

      {serviceMetrics && serviceMetrics.length > 0 && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Service Metrics</h2>
          <div className="grid grid-cols-3 gap-3">
            {serviceMetrics.slice(0, 6).map((m) => (
              <div key={m.serviceId} className="border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground truncate">{m.serviceName}</span>
                  <TrendingUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Uptime</span>
                    <span className="text-primary font-mono">{m.uptime}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Requests/hr</span>
                    <span className="text-foreground font-mono">{m.requestsPerHour.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Error rate</span>
                    <span className={`font-mono ${parseFloat(m.errorRate) > 1 ? "text-destructive" : "text-foreground"}`}>{m.errorRate}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Recent Deployments</h2>
          <div className="border border-border">
            {recentDeployments.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">No deployments yet</div>
            ) : (
              recentDeployments.map((d, i) => (
                <div key={d.id} className={`flex items-center justify-between px-4 py-3 ${i < recentDeployments.length - 1 ? "border-b border-border" : ""}`}>
                  <div>
                    <div className="text-sm font-medium text-foreground">{d.serviceName}</div>
                    <div className="text-xs text-muted-foreground font-mono">{d.environment} · {d.version}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={d.status} />
                    {d.duration && <span className="text-xs text-muted-foreground font-mono flex items-center gap-1"><Clock className="w-3 h-3" />{d.duration}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Service Health</h2>
          <div className="border border-border">
            {recentServices.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">No services registered</div>
            ) : (
              recentServices.map((s, i) => (
                <div key={s.id} className={`flex items-center justify-between px-4 py-3 ${i < recentServices.length - 1 ? "border-b border-border" : ""}`}>
                  <div>
                    <div className="text-sm font-medium text-foreground">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.product}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={s.status} />
                    {s.status === "running" ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
