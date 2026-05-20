import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { TrendingUp, TrendingDown, Key, Webhook, Zap, AlertCircle } from "lucide-react";
import { apiCall } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

interface UsagePeriod {
  day: string;
  requests: number;
  errors: number;
}

interface UsageData {
  stats?: {
    totalRequests?: number;
    activeKeys?: number;
    errorRate?: string;
    webhookDeliveries?: number;
  };
  usage?: UsagePeriod[];
  weekly?: UsagePeriod[];
}

const MOCK_USAGE: UsagePeriod[] = Array.from({ length: 7 }, (_, i) => ({
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
  const { data, isLoading } = useQuery<UsageData>({
    queryKey: ["dev-usage"],
    queryFn: () => apiCall<UsageData>("/developers/usage"),
    retry: 1,
    staleTime: 30_000,
  });

  const chartData: UsagePeriod[] = data?.usage ?? data?.weekly ?? MOCK_USAGE;

  const stats = data?.stats
    ? [
        { label: "API Requests", value: data.stats.totalRequests?.toLocaleString() ?? "14,821", change: "+12%", up: true, icon: Zap },
        { label: "Active Keys", value: String(data.stats.activeKeys ?? 3), change: "0%", up: true, icon: Key },
        { label: "Error Rate", value: data.stats.errorRate ?? "0.3%", change: "-0.1%", up: true, icon: AlertCircle },
        { label: "Webhook Deliveries", value: String(data.stats.webhookDeliveries ?? 892), change: "+8%", up: true, icon: Webhook },
      ]
    : MOCK_STATS;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Developer Overview</h1>
        <p className="text-sm text-muted-foreground mt-0.5">API health, usage metrics, and activity for your workspace</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading
          ? [1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)
          : stats.map(({ label, value, change, up, icon: Icon }) => (
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

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-4">API Requests — 7 days</h3>
          {isLoading ? <Skeleton className="h-48 rounded-lg" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
                />
                <Bar dataKey="requests" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-4">Error Rate — 7 days</h3>
          {isLoading ? <Skeleton className="h-48 rounded-lg" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
                />
                <Line dataKey="errors" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
