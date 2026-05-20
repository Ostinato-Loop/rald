import { useState } from "react";
import { Key, Plus, Copy, Eye, EyeOff, Trash2 } from "lucide-react";
import { toast } from "sonner";

const MOCK_DEV_KEYS = [
  { id: "dk1", name: "Loop Workspace Production", key: "rald_sk_live_devA1B2C3D4E5F6G7H8", scopes: ["profile:read", "session:write", "wallet:read"], lastUsed: "2 min ago", created: "Jan 15, 2026", requests: 12841 },
  { id: "dk2", name: "Mobile App Test Key", key: "rald_sk_test_devZ9Y8X7W6V5U4T3S2R1", scopes: ["profile:read"], lastUsed: "1 day ago", created: "Mar 10, 2026", requests: 342 },
];

const ALL_SCOPES = ["profile:read", "profile:write", "phone:read", "session:read", "session:write", "wallet:read", "wallet:write", "admin:read"];

export default function DevApiKeys() {
  const [keys, setKeys] = useState(MOCK_DEV_KEYS);
  const [revealed, setRevealed] = useState<string[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["profile:read"]);

  const mask = (k: string) => k.slice(0, 14) + "••••••••••" + k.slice(-4);
  const toggleReveal = (id: string) => setRevealed(r => r.includes(id) ? r.filter(x => x !== id) : [...r, id]);
  const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success("Copied"); };

  const create = () => {
    if (!newName.trim()) return;
    setKeys(k => [{
      id: `dk${Date.now()}`, name: newName,
      key: `rald_sk_live_dev${Math.random().toString(36).slice(2, 20).toUpperCase()}`,
      scopes: selectedScopes, lastUsed: "Never", created: "Today", requests: 0,
    }, ...k]);
    setShowCreate(false); setNewName(""); setSelectedScopes(["profile:read"]);
    toast.success("API key created");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">API Keys</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Server-side keys for authenticating API requests</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:opacity-90" data-testid="create-dev-key">
          <Plus className="w-3.5 h-3.5" /> New Key
        </button>
      </div>

      {showCreate && (
        <div className="bg-card border border-primary/30 rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-foreground">New API Key</h3>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Key name" className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm text-foreground outline-none focus:border-primary" />
          <div className="grid grid-cols-2 gap-2">
            {ALL_SCOPES.map(s => (
              <label key={s} className="flex items-center gap-2 cursor-pointer text-xs">
                <input type="checkbox" checked={selectedScopes.includes(s)} onChange={e => setSelectedScopes(sc => e.target.checked ? [...sc, s] : sc.filter(x => x !== s))} className="rounded" />
                <span className="font-mono text-foreground">{s}</span>
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={create} className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90">Create</button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 border border-border text-foreground text-sm rounded-lg hover:bg-muted">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {keys.map(k => (
          <div key={k.id} className="bg-card border border-border rounded-xl p-5 space-y-3" data-testid={`dev-key-${k.id}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold text-foreground text-sm">{k.name}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{k.requests.toLocaleString()} requests</span>
                <button onClick={() => toggleReveal(k.id)} className="p-1.5 text-muted-foreground hover:text-foreground rounded">{revealed.includes(k.id) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</button>
                <button onClick={() => copy(k.key)} className="p-1.5 text-muted-foreground hover:text-foreground rounded"><Copy className="w-3.5 h-3.5" /></button>
                <button onClick={() => { setKeys(ks => ks.filter(x => x.id !== k.id)); toast.success("Key revoked"); }} className="p-1.5 text-muted-foreground hover:text-destructive rounded"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <p className="text-xs font-mono text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg break-all">{revealed.includes(k.id) ? k.key : mask(k.key)}</p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Last used: {k.lastUsed} · Created: {k.created}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {k.scopes.map(s => <span key={s} className="text-xs font-mono bg-muted text-muted-foreground px-2 py-0.5 rounded">{s}</span>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
