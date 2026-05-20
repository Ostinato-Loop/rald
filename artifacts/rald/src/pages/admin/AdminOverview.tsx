import { motion } from "framer-motion";
import { Users, MonitorSmartphone, Zap, MessageSquare, AlertTriangle, Shield, Activity, Server } from "lucide-react";

const METRICS = [
  { label: "Active Users", value: "2,841", sub: "Online now", icon: Users, color: "text-blue-500 bg-blue-500/10", pulse: false },
  { label: "Live Sessions", value: "1,247", sub: "Across all devices", icon: MonitorSmartphone, color: "text-green-500 bg-green-500/10", pulse: true },
  { label: "API Req/min", value: "4,392", sub: "+12% from avg", icon: Zap, color: "text-yellow-500 bg-yellow-500/10", pulse: false },
  { label: "OTP Requests", value: "384", sub: "Last 10 minutes", icon: MessageSquare, color: "text-purple-500 bg-purple-500/10", pulse: false },
  { label: "Failed Logins", value: "23", sub: "Last 1 hour", icon: AlertTriangle, color: "text-orange-500 bg-orange-500/10", pulse: false },
  { label: "Threats Blocked", value: "7", sub: "Active mitigations", icon: Shield, color: "text-red-500 bg-red-500/10", pulse: true },
  { label: "Queue Backlog", value: "142", sub: "OTP + webhook jobs", icon: Activity, color: "text-cyan-500 bg-cyan-500/10", pulse: false },
  { label: "Worker Health", value: "100%", sub: "All nodes healthy", icon: Server, color: "text-green-500 bg-green-500/10", pulse: false },
];

const LIVE_EVENTS = [
  { type: "login", msg: "+2348012345678 logged in via OTP", time: "1s ago", severity: "info" },
  { type: "otp", msg: "OTP sent to +2348055566677", time: "3s ago", severity: "info" },
  { type: "fail", msg: "Failed login: +2348099988877 (3 attempts)", time: "8s ago", severity: "warn" },
  { type: "admin", msg: "Admin role granted to user_id: rald_usr_04", time: "12s ago", severity: "warn" },
  { type: "threat", msg: "Brute force detected from 185.220.x.x — blocked", time: "18s ago", severity: "error" },
  { type: "otp", msg: "OTP sent to +2348022233344", time: "22s ago", severity: "info" },
  { type: "login", msg: "+2348033344455 logged in via OTP", time: "31s ago", severity: "info" },
];

const severityBg: Record<string, string> = {
  info: "bg-blue-500",
  warn: "bg-yellow-500",
  error: "bg-red-500",
};

export default function AdminOverview() {
  const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
  const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">System Overview</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Real-time operational metrics for the RALD platform</p>
      </div>

      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {METRICS.map(({ label, value, sub, icon: Icon, color, pulse }) => (
          <motion.div key={label} variants={item} className="bg-card border border-border rounded-xl p-4 space-y-2" data-testid={`admin-metric-${label.toLowerCase().replace(/\s/g, "-")}`}>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{label}</p>
              <div className={`relative p-2 rounded-lg ${color}`}>
                <Icon className="w-3.5 h-3.5" />
                {pulse && (
                  <motion.div
                    className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500"
                    animate={{ opacity: [1, 0.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{sub}</p>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live event stream */}
        <div className="bg-card border border-border rounded-xl">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <div className="flex items-center gap-2">
              <motion.div className="w-2 h-2 rounded-full bg-red-500" animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
              <h3 className="font-semibold text-foreground text-sm">Live Event Stream</h3>
            </div>
          </div>
          <div className="divide-y divide-border">
            {LIVE_EVENTS.map((e, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-3" data-testid={`live-event-${i}`}>
                <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${severityBg[e.severity]}`} />
                <p className="flex-1 text-xs text-foreground">{e.msg}</p>
                <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">{e.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Provider health */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-5">
          <h3 className="font-semibold text-foreground text-sm">OTP Provider Health</h3>
          {[
            { name: "Termii", status: "operational", latency: "312ms", success: "99.7%", volume: 1842 },
            { name: "Twilio", status: "operational", latency: "418ms", success: "99.1%", volume: 541 },
            { name: "Africa's Talking", status: "degraded", latency: "1,204ms", success: "94.3%", volume: 213 },
          ].map(p => (
            <div key={p.name} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${p.status === "operational" ? "bg-green-500" : "bg-yellow-500"}`} />
                  <span className="text-sm font-medium text-foreground">{p.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${p.status === "operational" ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"}`}>
                    {p.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{p.latency}</span>
                  <span className="text-green-500">{p.success}</span>
                </div>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${p.status === "operational" ? "bg-green-500" : "bg-yellow-500"}`}
                  style={{ width: p.success }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
