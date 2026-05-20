import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Shield, MonitorSmartphone, Key, Wallet, Activity, ArrowUpRight, ArrowDownRight, Clock } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiCall } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

const MOCK_DATA = {
  sessions: 3,
  security: "strong",
  apiUsage: 1247,
  walletBalance: 125000,
  activities: [
    { id: 1, event: "Login via OTP", device: "iPhone 14 Pro", time: "2 min ago", type: "login" },
    { id: 2, event: "API key created", device: "Chrome · macOS", time: "1 hr ago", type: "key" },
    { id: 3, event: "Wallet funded", device: "Paystack", time: "3 hr ago", type: "wallet", amount: "+₦50,000" },
    { id: 4, event: "Session revoked", device: "Firefox · Windows", time: "1 day ago", type: "security" },
    { id: 5, event: "Password changed", device: "Chrome · Android", time: "2 days ago", type: "security" },
  ],
};

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-3" data-testid={`stat-${label.toLowerCase().replace(/\s/g, "-")}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground font-medium">{label}</p>
        <div className={`p-2 rounded-lg ${color || "bg-primary/10"}`}>
          <Icon className={`w-4 h-4 ${color ? "text-white" : "text-primary"}`} />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function Overview() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-overview"],
    queryFn: () => apiCall("/session"),
    retry: false,
  });

  const stats = MOCK_DATA;

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.06 } },
  };
  const item = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {user?.name ? `Welcome back, ${user.name.split(" ")[0]}` : "Dashboard"}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Here's an overview of your RALD account</p>
      </div>

      {/* Stats grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <motion.div variants={item}>
          {isLoading ? <Skeleton className="h-28 rounded-xl" /> : (
            <StatCard icon={MonitorSmartphone} label="Active Sessions" value={stats.sessions} sub="Across all devices" />
          )}
        </motion.div>
        <motion.div variants={item}>
          {isLoading ? <Skeleton className="h-28 rounded-xl" /> : (
            <StatCard icon={Shield} label="Security Status" value="Strong" sub="No threats detected" color="bg-green-500" />
          )}
        </motion.div>
        <motion.div variants={item}>
          {isLoading ? <Skeleton className="h-28 rounded-xl" /> : (
            <StatCard icon={Key} label="API Requests" value={stats.apiUsage.toLocaleString()} sub="Last 30 days" />
          )}
        </motion.div>
        <motion.div variants={item}>
          {isLoading ? <Skeleton className="h-28 rounded-xl" /> : (
            <StatCard icon={Wallet} label="Wallet Balance" value={`₦${stats.walletBalance.toLocaleString()}`} sub="NGN · Available" color="bg-blue-500" />
          )}
        </motion.div>
      </motion.div>

      {/* Activity feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card border border-border rounded-xl"
        >
          <div className="flex items-center justify-between p-5 border-b border-border">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold text-foreground text-sm">Recent Activity</h3>
            </div>
            <span className="text-xs text-muted-foreground">Last 7 days</span>
          </div>
          <div className="divide-y divide-border">
            {stats.activities.map(a => (
              <div key={a.id} className="flex items-start gap-3 px-5 py-3.5" data-testid={`activity-${a.id}`}>
                <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                  a.type === "login" ? "bg-blue-500" :
                  a.type === "wallet" ? "bg-green-500" :
                  a.type === "key" ? "bg-yellow-500" : "bg-muted-foreground"
                }`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{a.event}</p>
                  <p className="text-xs text-muted-foreground">{a.device}</p>
                </div>
                <div className="text-right shrink-0">
                  {a.amount && <p className="text-sm font-semibold text-green-500">{a.amount}</p>}
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />{a.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Identity summary */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-card border border-border rounded-xl p-5 space-y-5"
        >
          <h3 className="font-semibold text-foreground text-sm">Identity Summary</h3>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
              {user?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "RA"}
            </div>
            <div>
              <p className="font-semibold text-foreground">{user?.name || "RALD User"}</p>
              <p className="text-sm text-muted-foreground">{user?.phone || "+234 800 000 0000"}</p>
              <div className="flex items-center gap-1 mt-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="text-xs text-muted-foreground">Active · Verified</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { label: "Account ID", value: user?.id || "rald_usr_demo" },
              { label: "Email", value: user?.email || "Not set" },
              { label: "Role", value: user?.role || "User" },
              { label: "Member since", value: "May 2026" },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium text-foreground text-right font-mono text-xs max-w-[160px] truncate">{value}</span>
              </div>
            ))}
          </div>

          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
            <p className="text-xs text-green-700 dark:text-green-300 font-medium">Your account is secured with OTP verification</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
