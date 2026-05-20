import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { MessageSquare, CheckCircle, XCircle, Clock } from "lucide-react";

const HOURLY = Array.from({ length: 24 }, (_, i) => ({
  hour: `${String(i).padStart(2, "0")}:00`,
  sent: Math.floor(Math.random() * 300) + 50,
  delivered: Math.floor(Math.random() * 280) + 45,
  failed: Math.floor(Math.random() * 20),
}));

export default function OTPMonitor() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">OTP Monitor</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Real-time OTP delivery monitoring and provider health
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: MessageSquare,
            label: "Sent (24hr)",
            value: "4,632",
            color: "text-blue-500 bg-blue-500/10",
          },
          {
            icon: CheckCircle,
            label: "Delivered",
            value: "4,589",
            color: "text-green-500 bg-green-500/10",
          },
          {
            icon: XCircle,
            label: "Failed",
            value: "43",
            color: "text-red-500 bg-red-500/10",
          },
          {
            icon: Clock,
            label: "Avg Delivery",
            value: "312ms",
            color: "text-yellow-500 bg-yellow-500/10",
          },
        ].map(({ icon: Icon, label, value, color }) => (
          <div
            key={label}
            className="bg-card border border-border rounded-xl p-4 space-y-2"
            data-testid={`otp-stat-${label.toLowerCase().replace(/\s/g, "-")}`}
          >
            <div className={`inline-flex p-2 rounded-lg ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold text-foreground text-sm mb-4">
          OTP Volume (24 hours)
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={HOURLY}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="hour"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              interval={3}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="sent"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="delivered"
              stroke="hsl(142 71% 45%)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="failed"
              stroke="hsl(0 84% 60%)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card border border-border rounded-xl">
        <div className="p-5 border-b border-border">
          <h3 className="font-semibold text-foreground text-sm">
            Provider Status
          </h3>
        </div>
        <div className="divide-y divide-border">
          {[
            {
              name: "Termii",
              volume: "2,841",
              success: "99.7%",
              latency: "312ms",
              status: "operational",
            },
            {
              name: "Twilio",
              volume: "1,248",
              success: "99.1%",
              latency: "418ms",
              status: "operational",
            },
            {
              name: "Africa's Talking",
              volume: "543",
              success: "94.3%",
              latency: "1,204ms",
              status: "degraded",
            },
          ].map((p) => (
            <div
              key={p.name}
              className="flex items-center gap-4 px-5 py-4"
              data-testid={`provider-${p.name.toLowerCase().replace(/'/g, "").replace(/\s/g, "-")}`}
            >
              <div
                className={`w-2 h-2 rounded-full shrink-0 ${p.status === "operational" ? "bg-green-500" : "bg-yellow-500"}`}
              />
              <p className="font-medium text-foreground text-sm flex-1">
                {p.name}
              </p>
              <span className="text-xs text-muted-foreground">
                Vol: {p.volume}
              </span>
              <span className="text-xs text-green-500">{p.success}</span>
              <span className="text-xs text-muted-foreground">
                {p.latency} avg
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full capitalize ${p.status === "operational" ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"}`}
              >
                {p.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
