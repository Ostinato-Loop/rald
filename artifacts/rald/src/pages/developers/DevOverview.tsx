import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { TrendingUp, TrendingDown, Key, Webhook, Zap, AlertCircle } from "lucide-react";
import { apiCall } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

const MOCK_USAGE = Array.from({ length: 7 }, (_, i) => ({
  day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i],
  requests: Math.floor(Math.random() * 3000) + 500,
  errors: Math.floor(Math.random() * 50),
}));

const MOCK_STATS = [
  { label: "API Requests", value: "14,821", change: "+12%", up: true, icon: Zap },
  { label: "Active Keys", value: "3", change: "0%", up: true, icon: Key },
  { label: "Error Rate", value: "0.3%", change: "-0.1%", up: true, icon: AlertCircle },
  { label: "Webhook Deliveries", value: "892", change: "+8%", up: true, icon: Webhook },
];

export default function DevOverview() {
  const { data, isLoading } = useQuery({
    queryKey: ["dev-usage"],
    queryFn: () => apiCall("/developers/usage"),
    retry: false,
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Developer Overview</h1>
        <p className="text-sm text-muted-foreground mt-0.5">API health, usage metrics, and activity for your workspace</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {MOCK_STATS.map(({ label, value, change, up, icon: Icon }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4 space-y-2" data-testid={`dev-stat-${label.toLowerCase().replace(/\s/g, "-")}`}>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{label}</p>
              <Icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <div className={`flex items-center gap-1 text-xs ${up ? "text-green-500" : "text-red-500"}`}>
              {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {change} this week
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground text-sm mb-4">Request Volume (7 days)</h3>
          {isLoading ? <Skeleton className="h-48" /> : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={MOCK_USAGE}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="requests" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground text-sm mb-4">Error Rate (7 days)</h3>
          {isLoading ? <Skeleton className="h-48" /> : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={MOCK_USAGE}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="errors" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent events */}
      <div className="bg-card border border-border rounded-xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="font-semibold text-foreground text-sm">Recent API Events</h3>
          <span className="text-xs text-muted-foreground">Live stream</span>
        </div>
        <div className="divide-y divide-border">
          {[
            { method: "POST", path: "/login/send-otp", status: 200, latency: "42ms", time: "2s ago" },
            { method: "GET", path: "/session", status: 200, latency: "18ms", time: "5s ago" },
            { method: "POST", path: "/login/verify-otp", status: 200, latency: "91ms", time: "12s ago" },
            { method: "GET", path: "/user", status: 401, latency: "8ms", time: "28s ago" },
            { method: "GET", path: "/wallet", status: 200, latency: "34ms", time: "45s ago" },
          ].map((log, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3 font-mono text-xs" data-testid={`dev-log-${i}`}>
              <span className={`px-1.5 py-0.5 rounded text-xs font-semibold min-w-[40px] text-center ${
                log.method === "GET" ? "bg-blue-500/10 text-blue-500" : "bg-green-500/10 text-green-500"
              }`}>{log.method}</span>
              <span className="flex-1 text-foreground">{log.path}</span>
              <span className={`px-1.5 py-0.5 rounded ${log.status >= 400 ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"}`}>
                {log.status}
              </span>
              <span className="text-muted-foreground w-12 text-right">{log.latency}</span>
              <span className="text-muted-foreground w-16 text-right">{log.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
