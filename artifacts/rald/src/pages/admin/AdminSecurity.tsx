import { AlertTriangle, Shield, Ban, Globe, Zap } from "lucide-react";
import { motion } from "framer-motion";

const THREATS = [
  {
    id: "t1",
    type: "Brute Force",
    target: "+2348099988877",
    source: "185.220.101.x",
    attempts: 42,
    status: "blocked",
    severity: "critical",
  },
  {
    id: "t2",
    type: "OTP Abuse",
    target: "+2348011122233",
    source: "194.165.x.x",
    attempts: 15,
    status: "monitoring",
    severity: "warn",
  },
  {
    id: "t3",
    type: "Impossible Travel",
    target: "+2348022233344",
    source: "Lagos→Tokyo (2hr)",
    attempts: 1,
    status: "flagged",
    severity: "warn",
  },
  {
    id: "t4",
    type: "Rate Limit Violation",
    target: "API Key: rald_sk_live••••",
    source: "197.210.55.x",
    attempts: 1200,
    status: "limited",
    severity: "warn",
  },
];

const severityColors: Record<string, string> = {
  critical: "text-red-500 bg-red-500/10 border-red-500/20",
  warn: "text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
};

export default function AdminSecurity() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Security Monitor</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Active threats, anomalies, and security events
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: Shield,
            label: "Threats Blocked",
            value: "7",
            color: "text-red-500 bg-red-500/10",
          },
          {
            icon: Ban,
            label: "IPs Banned",
            value: "23",
            color: "text-orange-500 bg-orange-500/10",
          },
          {
            icon: AlertTriangle,
            label: "Flagged Accounts",
            value: "4",
            color: "text-yellow-500 bg-yellow-500/10",
          },
          {
            icon: Globe,
            label: "Anomalies Detected",
            value: "12",
            color: "text-blue-500 bg-blue-500/10",
          },
        ].map(({ icon: Icon, label, value, color }) => (
          <div
            key={label}
            className="bg-card border border-border rounded-xl p-4 space-y-2"
            data-testid={`security-metric-${label.toLowerCase().replace(/\s/g, "-")}`}
          >
            <div className={`inline-flex p-2 rounded-lg ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl">
        <div className="p-5 border-b border-border flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-500" />
          <h3 className="font-semibold text-foreground text-sm">
            Active Threats
          </h3>
        </div>
        <div className="divide-y divide-border">
          {THREATS.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.06 }}
              className="flex items-center gap-4 px-5 py-4"
              data-testid={`threat-${t.id}`}
            >
              <div
                className={`text-xs px-2 py-0.5 rounded border font-medium ${severityColors[t.severity]}`}
              >
                {t.severity}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {t.type}
                </p>
                <p className="text-xs text-muted-foreground">
                  Target: {t.target} · Source: {t.source}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground">
                  {t.attempts} attempts
                </p>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    t.status === "blocked"
                      ? "bg-red-500/10 text-red-500"
                      : t.status === "flagged"
                        ? "bg-yellow-500/10 text-yellow-500"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {t.status}
                </span>
              </div>
              <button
                className="px-3 py-1.5 bg-destructive text-destructive-foreground text-xs font-medium rounded-lg hover:opacity-90"
                data-testid={`block-threat-${t.id}`}
              >
                Block
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
