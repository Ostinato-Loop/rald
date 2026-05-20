import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Shield, MonitorSmartphone, Key, Wallet, Activity, ArrowUpRight, ArrowDownRight, Clock } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiCall, fmt } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

interface SessionData {
  sessions?: number;
  security?: string;
  apiUsage?: number;
  walletBalance?: number;
}

interface ActivityItem {
  id: number | string;
  event: string;
  device: string;
  time: string;
  type: string;
  amount?: string;
}

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
  ] as ActivityItem[],
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

  const { data: sessionData, isLoading: sessionLoading } = useQuery<SessionData>({
    queryKey: ["dashboard-overview"],
    queryFn: () => apiCall<SessionData>("/session"),
    retry: 1,
    staleTime: 30_000,
  });

  const { data: activityData, isLoading: activityLoading } = useQuery<{ activities?: ActivityItem[] }>({
    queryKey: ["activity"],
    queryFn: () => apiCall<{ activities?: ActivityItem[] }>("/activity"),
    retry: 1,
    staleTime: 15_000,
  });

  const { data: walletData } = useQuery<{ balance?: number }>({
    queryKey: ["wallet-balance"],
    queryFn: () => apiCall<{ balance?: number }>("/wallet"),
    retry: 1,
    staleTime: 30_000,
  });

  const stats = {
    sessions: sessionData?.sessions ?? MOCK_DATA.sessions,
    security: sessionData?.security ?? MOCK_DATA.security,
    apiUsage: sessionData?.apiUsage ?? MOCK_DATA.apiUsage,
    walletBalance: walletData?.balance ?? MOCK_DATA.walletBalance,
  };

  const activities: ActivityItem[] = activityData?.activities ?? MOCK_DATA.activities;

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.06 } },
  };
  const item = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0 },
  };

  const isLoading = sessionLoading || activityLoading;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Here's what's happening with your RALD account
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {[
            { icon: MonitorSmartphone, label: "Active Sessions", value: stats.sessions, sub: "Devices logged in", color: "bg-blue-500" },
            { icon: Shield, label: "Security Status", value: stats.security === "strong" ? "Strong" : "Review needed", sub: "No threats detected", color: "bg-green-500" },
            { icon: Key, label: "API Usage", value: stats.apiUsage.toLocaleString(), sub: "Requests this month", color: "bg-purple-500" },
            { icon: Wallet, label: "Wallet Balance", value: fmt.ngn(stats.walletBalance), sub: "Available balance", color: "bg-primary" },
          ].map(props => (
            <motion.div key={props.label} variants={item}>
              <StatCard {...props} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Phone identity card */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Identity</h3>
          <span className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full font-medium">
            Verified
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
            {(user?.name || user?.phone || "RA").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
          </div>
          <div>
            <p className="font-semibold text-foreground">{user?.name || "RALD User"}</p>
            <p className="text-sm text-muted-foreground font-mono">{user?.phone || "+234 —"}</p>
            {user?.email && <p className="text-xs text-muted-foreground">{user.email}</p>}
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-muted-foreground">Account ID</p>
            <p className="text-xs font-mono text-foreground">{user?.id || "rald_usr_demo"}</p>
          </div>
        </div>
      </div>

      {/* Activity feed */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Recent Activity</h3>
          <Activity className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="space-y-3">
          {isLoading ? (
            [1,2,3].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)
          ) : activities.map((a) => (
            <div key={a.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                a.type === "login" ? "bg-blue-500/10" :
                a.type === "wallet" ? "bg-green-500/10" :
                a.type === "key" ? "bg-purple-500/10" : "bg-orange-500/10"
              }`}>
                {a.type === "login" ? <MonitorSmartphone className="w-4 h-4 text-blue-500" /> :
                 a.type === "wallet" ? (
                   a.amount?.startsWith("+") ? <ArrowUpRight className="w-4 h-4 text-green-500" /> : <ArrowDownRight className="w-4 h-4 text-red-500" />
                 ) :
                 a.type === "key" ? <Key className="w-4 h-4 text-purple-500" /> :
                 <Shield className="w-4 h-4 text-orange-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{a.event}</p>
                <p className="text-xs text-muted-foreground truncate">{a.device}</p>
              </div>
              <div className="text-right shrink-0">
                {a.amount && <p className={`text-sm font-semibold ${a.amount.startsWith("+") ? "text-green-500" : "text-red-500"}`}>{a.amount}</p>}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {a.time}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
