import { useState } from "react";
import { Monitor, Smartphone, Globe, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

const MOCK_SESSIONS = Array.from({ length: 20 }, (_, i) => ({
  id: `s${i + 1}`,
  user: `+234${80 + (i % 4)}${String(Math.floor(Math.random() * 90000000) + 10000000)}`,
  device: [
    "iPhone 14 Pro",
    "MacBook Pro",
    "Samsung Galaxy S23",
    "iPad Air",
    "Windows PC",
  ][i % 5],
  browser: ["Safari", "Chrome", "Firefox", "Edge"][i % 4],
  location: [
    "Lagos, NG",
    "Abuja, NG",
    "Port Harcourt, NG",
    "London, UK",
    "Accra, GH",
  ][i % 5],
  ip: `${197 + (i % 3)}.210.${Math.floor(Math.random() * 255)}.${i + 1}`,
  riskScore: Math.floor(Math.random() * 100),
  age: `${Math.floor(Math.random() * 120) + 1}m`,
  type: i % 3 === 0 ? "mobile" : "desktop",
}));

const riskColor = (s: number) =>
  s > 70 ? "text-red-500" : s > 40 ? "text-yellow-500" : "text-green-500";

export default function AdminSessions() {
  const [sessions, setSessions] = useState(MOCK_SESSIONS);
  const [search, setSearch] = useState("");

  const filtered = sessions.filter(
    (s) =>
      !search ||
      s.user.includes(search) ||
      s.location.toLowerCase().includes(search.toLowerCase()),
  );

  const revoke = (id: string) => {
    setSessions((s) => s.filter((x) => x.id !== id));
    toast.success("Session revoked");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Active Sessions
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            All active sessions across the platform
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-foreground">
            {sessions.length}
          </p>
          <p className="text-xs text-muted-foreground">live sessions</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by phone or location..."
          className="w-full pl-9 pr-3 py-2 border border-border rounded-lg bg-background text-sm text-foreground outline-none focus:border-primary"
          data-testid="session-search"
        />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {["User", "Device", "Location", "IP", "Risk", "Age", ""].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs text-muted-foreground font-medium"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((s) => (
                <tr
                  key={s.id}
                  className="hover:bg-muted/30 transition-colors"
                  data-testid={`admin-session-${s.id}`}
                >
                  <td className="px-4 py-3 font-mono text-xs text-foreground">
                    {s.user}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {s.type === "mobile" ? (
                        <Smartphone className="w-3.5 h-3.5 text-muted-foreground" />
                      ) : (
                        <Monitor className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                      <span className="text-xs text-foreground">
                        {s.device}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Globe className="w-3 h-3" />
                      {s.location}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                    {s.ip}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-semibold ${riskColor(s.riskScore)}`}
                    >
                      {s.riskScore}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {s.age}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => revoke(s.id)}
                      className="p-1.5 text-muted-foreground hover:text-destructive rounded"
                      data-testid={`admin-revoke-${s.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
          {filtered.length} sessions
        </div>
      </div>
    </div>
  );
}
