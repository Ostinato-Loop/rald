import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Zap, TrendingUp, AlertCircle, Clock } from "lucide-react";

const HOURLY = Array.from({ length: 24 }, (_, i) => ({
  hour: `${String(i).padStart(2, "0")}h`,
  requests: Math.floor(Math.random() * 8000) + 1000,
  errors: Math.floor(Math.random() * 200),
  p95: Math.floor(Math.random() * 200) + 20,
}));

const TOP_CONSUMERS = [
  { key: "rald_sk_live_a1b2••••", requests: 8821, errors: 12, app: "Loop Workspace" },
  { key: "rald_sk_live_z9y8••••", requests: 3241, errors: 5, app: "Loop Pay Mobile" },
  { key: "rald_sk_live_m3n4••••", requests: 1247, errors: 2, app: "Direct API" },
];

export default function ApiTraffic() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">API Traffic</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Real-time API observability — request volume, errors, and latency</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Zap, label: "Req/min (now)", value: "4,392", color: "text-blue-500 bg-blue-500/10" },
          { icon: TrendingUp, label: "Total (24hr)", value: "84,210", color: "text-green-500 bg-green-500/10" },
          { icon: AlertCircle, label: "Error Rate", value: "0.3%", color: "text-red-500 bg-red-500/10" },
          { icon: Clock, label: "P95 Latency", value: "89ms", color: "text-yellow-500 bg-yellow-500/10" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4 space-y-2">
            <div className={`inline-flex p-2 rounded-lg ${color}`}><Icon className="w-4 h-4" /></div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground text-sm mb-4">Request Volume</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={HOURLY} barSize={6}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} interval={3} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="requests" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground text-sm mb-4">P95 Latency (ms)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={HOURLY}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} interval={3} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="p95" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl">
        <div className="p-5 border-b border-border"><h3 className="font-semibold text-foreground text-sm">Top API Consumers</h3></div>
        <div className="divide-y divide-border">
          {TOP_CONSUMERS.map((c, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
              <div className="flex-1">
                <p className="text-xs font-mono text-foreground">{c.key}</p>
                <p className="text-xs text-muted-foreground">{c.app}</p>
              </div>
              <span className="text-sm font-semibold text-foreground">{c.requests.toLocaleString()} req</span>
              <span className="text-xs text-red-500">{c.errors} errors</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
