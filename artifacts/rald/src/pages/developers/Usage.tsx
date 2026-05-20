import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

const DAILY = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  requests: Math.floor(Math.random() * 2000) + 200,
  errors: Math.floor(Math.random() * 40),
}));

const BY_ENDPOINT = [
  { endpoint: "/session", requests: 4821, p95: "22ms" },
  { endpoint: "/login/send-otp", requests: 2341, p95: "312ms" },
  { endpoint: "/login/verify-otp", requests: 2289, p95: "89ms" },
  { endpoint: "/user", requests: 1847, p95: "18ms" },
  { endpoint: "/wallet", requests: 984, p95: "34ms" },
  { endpoint: "/sessions", requests: 732, p95: "41ms" },
];

const PIE_DATA = [
  { name: "Loop Workspace", value: 8841, color: "hsl(217 91% 60%)" },
  { name: "Mobile App", value: 3421, color: "hsl(142 71% 45%)" },
  { name: "Direct / Other", value: 2559, color: "hsl(38 92% 50%)" },
];

export default function Usage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Usage Analytics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">API usage breakdown, latency metrics, and quota status</p>
      </div>

      {/* Quota meters */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Requests / month", used: 14821, limit: 100000, unit: "req" },
          { label: "OTP sends / month", used: 4632, limit: 10000, unit: "OTP" },
          { label: "Webhook deliveries", used: 892, limit: 5000, unit: "events" },
        ].map(({ label, used, limit, unit }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4 space-y-3" data-testid={`quota-${label.replace(/\s/g, "-").toLowerCase()}`}>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-mono text-foreground">{used.toLocaleString()} / {limit.toLocaleString()}</span>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(used / limit) * 100}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">{((used / limit) * 100).toFixed(1)}% used · {(limit - used).toLocaleString()} {unit} remaining</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground text-sm mb-4">Request Volume (30 days)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={DAILY} barSize={6}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="requests" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground text-sm mb-4">Usage by App</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={PIE_DATA} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" strokeWidth={0}>
                {PIE_DATA.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {PIE_DATA.map(d => (
              <div key={d.name} className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                <span className="text-muted-foreground flex-1">{d.name}</span>
                <span className="font-mono text-foreground">{d.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top endpoints */}
      <div className="bg-card border border-border rounded-xl">
        <div className="p-5 border-b border-border">
          <h3 className="font-semibold text-foreground text-sm">Top Endpoints</h3>
        </div>
        <div className="divide-y divide-border">
          {BY_ENDPOINT.map(ep => (
            <div key={ep.endpoint} className="flex items-center gap-4 px-5 py-3">
              <span className="flex-1 text-sm font-mono text-foreground">{ep.endpoint}</span>
              <div className="w-40">
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${(ep.requests / BY_ENDPOINT[0].requests) * 100}%` }} />
                </div>
              </div>
              <span className="text-xs text-foreground font-mono w-16 text-right">{ep.requests.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground w-16 text-right">{ep.p95}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
