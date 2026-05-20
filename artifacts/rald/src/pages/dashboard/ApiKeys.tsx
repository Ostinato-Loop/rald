import { useState } from "react";
import { Key, Plus, Copy, RotateCcw, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const MOCK_KEYS = [
  { id: "k1", name: "Production API", key: "rald_sk_live_a1b2c3d4e5f6g7h8i9j0", scopes: ["profile:read", "session:write"], lastUsed: "5 min ago", created: "Jan 15, 2026", status: "active" },
  { id: "k2", name: "Development", key: "rald_sk_test_z9y8x7w6v5u4t3s2r1q0", scopes: ["profile:read"], lastUsed: "2 days ago", created: "Mar 10, 2026", status: "active" },
  { id: "k3", name: "Legacy Integration", key: "rald_sk_live_0q1r2s3t4u5v6w7x8y9z", scopes: ["profile:read", "wallet:read"], lastUsed: "1 month ago", created: "Dec 1, 2025", status: "active" },
];

const ALL_SCOPES = ["profile:read", "profile:write", "phone:read", "session:read", "session:write", "wallet:read", "wallet:write", "api-keys:read", "api-keys:write"];

export default function ApiKeys() {
  const [keys, setKeys] = useState(MOCK_KEYS);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["profile:read"]);
  const [revealed, setRevealed] = useState<string[]>([]);

  const mask = (key: string) => key.slice(0, 12) + "••••••••••••••••" + key.slice(-4);

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("API key copied to clipboard");
  };

  const toggleReveal = (id: string) => {
    setRevealed(r => r.includes(id) ? r.filter(x => x !== id) : [...r, id]);
  };

  const revokeKey = (id: string) => {
    setKeys(k => k.filter(x => x.id !== id));
    toast.success("API key revoked");
  };

  const createKey = () => {
    if (!newKeyName.trim()) return;
    const newKey = {
      id: `k${Date.now()}`,
      name: newKeyName,
      key: `rald_sk_live_${Math.random().toString(36).slice(2, 22)}`,
      scopes: selectedScopes,
      lastUsed: "Never",
      created: "Today",
      status: "active",
    };
    setKeys(k => [newKey, ...k]);
    setShowCreate(false);
    setNewKeyName("");
    setSelectedScopes(["profile:read"]);
    toast.success("API key created");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">API Keys</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your API keys and access permissions</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity"
          data-testid="create-api-key"
        >
          <Plus className="w-3.5 h-3.5" /> Create key
        </button>
      </div>

      {showCreate && (
        <div className="bg-card border border-primary/30 rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-foreground">New API Key</h3>
          <input
            value={newKeyName}
            onChange={e => setNewKeyName(e.target.value)}
            placeholder="Key name (e.g. Production App)"
            className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm text-foreground outline-none focus:border-primary"
            data-testid="key-name-input"
          />
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Permissions</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ALL_SCOPES.map(scope => (
                <label key={scope} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={selectedScopes.includes(scope)}
                    onChange={e => setSelectedScopes(s => e.target.checked ? [...s, scope] : s.filter(x => x !== scope))}
                    className="rounded border-border"
                  />
                  <span className="text-xs text-foreground font-mono">{scope}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={createKey} className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90" data-testid="confirm-create-key">Create</button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 border border-border text-foreground text-sm rounded-lg hover:bg-muted">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {keys.map(k => (
          <div key={k.id} className="bg-card border border-border rounded-xl p-5 space-y-3" data-testid={`api-key-${k.id}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold text-foreground text-sm">{k.name}</span>
                <span className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full">Active</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => toggleReveal(k.id)} className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors" data-testid={`reveal-key-${k.id}`}>
                  {revealed.includes(k.id) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => copyKey(k.key)} className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors" data-testid={`copy-key-${k.id}`}>
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => revokeKey(k.id)} className="p-1.5 text-muted-foreground hover:text-destructive rounded transition-colors" data-testid={`revoke-key-${k.id}`}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <p className="text-xs font-mono text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg break-all">
              {revealed.includes(k.id) ? k.key : mask(k.key)}
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Last used: {k.lastUsed}</span>
              <span>Created: {k.created}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {k.scopes.map(s => (
                <span key={s} className="text-xs font-mono bg-muted text-muted-foreground px-2 py-0.5 rounded">{s}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
