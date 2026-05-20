import { useState } from "react";
import { Search, Filter, ShieldAlert, CheckCircle, XCircle } from "lucide-react";

const MOCK_USERS = Array.from({ length: 20 }, (_, i) => ({
  id: `rald_usr_${String(i + 1).padStart(4, "0")}`,
  phone: `+234${80 + (i % 4)}${String(Math.floor(Math.random() * 90000000) + 10000000)}`,
  name: ["Emeka Okafor", "Chioma Adeyemi", "Tunde Bakare", "Amaka Eze", "Sola Ibrahim", "Ngozi Obi", "Bola Ahmed", "Kemi Adewale"][i % 8],
  status: i % 7 === 0 ? "suspended" : i % 13 === 0 ? "pending" : "active",
  role: i === 0 ? "admin" : i % 5 === 0 ? "developer" : "user",
  riskScore: Math.floor(Math.random() * 100),
  sessions: Math.floor(Math.random() * 5),
  joined: `${["Jan", "Feb", "Mar", "Apr", "May"][i % 5]} 2026`,
}));

const statusColors: Record<string, string> = {
  active: "text-green-600 dark:text-green-400 bg-green-500/10",
  suspended: "text-red-500 bg-red-500/10",
  pending: "text-yellow-600 dark:text-yellow-400 bg-yellow-500/10",
};

const riskColor = (score: number) => score > 70 ? "text-red-500" : score > 40 ? "text-yellow-500" : "text-green-500";

export default function Users() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = MOCK_USERS.filter(u => {
    if (search && !u.phone.includes(search) && !u.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (status !== "all" && u.status !== status) return false;
    return true;
  });

  const selectedUser = MOCK_USERS.find(u => u.id === selected);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Users</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage all RALD accounts across the platform</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search phone or name..."
            className="w-full pl-9 pr-3 py-2 border border-border rounded-lg bg-background text-sm text-foreground outline-none focus:border-primary"
            data-testid="user-search"
          />
        </div>
        <div className="flex bg-muted rounded-lg p-0.5">
          {["all", "active", "suspended", "pending"].map(s => (
            <button key={s} onClick={() => setStatus(s)} className={`px-2.5 py-1 text-xs font-medium rounded-md capitalize transition-colors ${status === s ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>{s}</button>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {["User", "Status", "Role", "Risk", "Sessions", "Joined", "Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setSelected(u.id)} data-testid={`user-row-${u.id}`}>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{u.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{u.phone}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${statusColors[u.status]}`}>{u.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-foreground capitalize">{u.role}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold ${riskColor(u.riskScore)}`}>{u.riskScore}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{u.sessions}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{u.joined}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {u.status !== "suspended" ? (
                        <button className="p-1 text-muted-foreground hover:text-destructive rounded" onClick={e => { e.stopPropagation(); }} data-testid={`suspend-${u.id}`}>
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button className="p-1 text-muted-foreground hover:text-green-500 rounded" onClick={e => { e.stopPropagation(); }} data-testid={`activate-${u.id}`}>
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
          {filtered.length} users shown
        </div>
      </div>

      {/* User detail drawer */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50" onClick={() => setSelected(null)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()} data-testid="user-drawer">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">{selectedUser.name}</h3>
              <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground text-xl leading-none">&times;</button>
            </div>
            <div className="space-y-2 text-sm">
              {[
                { label: "User ID", value: selectedUser.id },
                { label: "Phone", value: selectedUser.phone },
                { label: "Status", value: selectedUser.status },
                { label: "Role", value: selectedUser.role },
                { label: "Risk Score", value: `${selectedUser.riskScore}/100` },
                { label: "Active Sessions", value: selectedUser.sessions },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium text-foreground font-mono text-xs">{value}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button className="flex-1 py-2 border border-border text-foreground text-sm rounded-lg hover:bg-muted">Revoke Sessions</button>
              <button className="flex-1 py-2 bg-destructive text-destructive-foreground text-sm font-medium rounded-lg hover:opacity-90">Suspend</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
