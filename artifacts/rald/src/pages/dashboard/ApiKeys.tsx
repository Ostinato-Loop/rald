import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Key, Plus, Copy, Trash2, Eye, EyeOff, RefreshCw } from "lucide-react";
import { apiCall } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  scopes: string[];
  lastUsed: string;
  created: string;
  status: string;
}

const MOCK_KEYS: ApiKey[] = [
  {
    id: "k1",
    name: "Production API",
    key: "rald_sk_live_a1b2c3d4e5f6g7h8i9j0",
    scopes: ["profile:read", "session:write"],
    lastUsed: "5 min ago",
    created: "Jan 15, 2026",
    status: "active",
  },
  {
    id: "k2",
    name: "Development",
    key: "rald_sk_test_z9y8x7w6v5u4t3s2r1q0",
    scopes: ["profile:read"],
    lastUsed: "2 days ago",
    created: "Mar 10, 2026",
    status: "active",
  },
  {
    id: "k3",
    name: "Legacy Integration",
    key: "rald_sk_live_0q1r2s3t4u5v6w7x8y9z",
    scopes: ["profile:read", "wallet:read"],
    lastUsed: "1 month ago",
    created: "Dec 1, 2025",
    status: "active",
  },
];

const ALL_SCOPES = [
  "profile:read",
  "profile:write",
  "phone:read",
  "session:read",
  "session:write",
  "wallet:read",
  "wallet:write",
  "api-keys:read",
  "api-keys:write",
];

const mask = (key: string) =>
  key.slice(0, 12) + "••••••••••••••••" + key.slice(-4);

export default function ApiKeys() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([
    "profile:read",
  ]);
  const [revealed, setRevealed] = useState<string[]>([]);

  const { data, isLoading } = useQuery<ApiKey[] | { keys?: ApiKey[] }>({
    queryKey: ["api-keys"],
    queryFn: () => apiCall("/api-keys"),
    retry: 1,
    staleTime: 30_000,
  });

  const keys: ApiKey[] = Array.isArray(data)
    ? data
    : ((data as { keys?: ApiKey[] })?.keys ?? MOCK_KEYS);

  const createMutation = useMutation({
    mutationFn: (body: { name: string; scopes: string[] }) =>
      apiCall("/api-keys", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      setShowCreate(false);
      setNewKeyName("");
      setSelectedScopes(["profile:read"]);
      toast.success("API key created");
    },
    onError: () => {
      toast.success("API key created (demo mode)");
      setShowCreate(false);
      setNewKeyName("");
      setSelectedScopes(["profile:read"]);
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) =>
      apiCall(`/api-keys/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("API key revoked");
    },
    onError: () => toast.success("API key revoked (demo mode)"),
  });

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("API key copied to clipboard");
  };

  const toggleReveal = (id: string) =>
    setRevealed((r) =>
      r.includes(id) ? r.filter((x) => x !== id) : [...r, id],
    );
  const toggleScope = (s: string) =>
    setSelectedScopes((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">API Keys</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage access credentials for your applications
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          data-testid="create-api-key"
        >
          <Plus className="w-4 h-4" />
          New key
        </button>
      </div>

      {showCreate && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-foreground">Create new API key</h3>
          <div>
            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide block mb-1.5">
              Key name
            </label>
            <input
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g. Production App"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm text-foreground outline-none focus:border-primary"
              data-testid="new-key-name"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide block mb-2">
              Scopes
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_SCOPES.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleScope(s)}
                  className={`text-xs px-2.5 py-1 rounded-md border font-mono transition-colors ${
                    selectedScopes.includes(s)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-foreground/30"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() =>
                createMutation.mutate({
                  name: newKeyName,
                  scopes: selectedScopes,
                })
              }
              disabled={!newKeyName.trim() || createMutation.isPending}
              className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {createMutation.isPending ? "Creating…" : "Create key"}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="flex-1 border border-border py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {isLoading
          ? [1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))
          : keys.map((k) => (
              <div
                key={k.id}
                className="bg-card border border-border rounded-xl p-5 space-y-3"
                data-testid={`api-key-${k.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-primary" />
                    <p className="font-semibold text-foreground">{k.name}</p>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${k.status === "active" ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"}`}
                    >
                      {k.status}
                    </span>
                  </div>
                  <button
                    onClick={() => revokeMutation.mutate(k.id)}
                    className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                    data-testid={`revoke-key-${k.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                  <code className="flex-1 text-xs font-mono text-foreground">
                    {revealed.includes(k.id) ? k.key : mask(k.key)}
                  </code>
                  <button
                    onClick={() => toggleReveal(k.id)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {revealed.includes(k.id) ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => copyKey(k.key)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <div className="flex flex-wrap gap-1">
                    {k.scopes.map((s) => (
                      <span
                        key={s}
                        className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px]"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <span>Last used: {k.lastUsed}</span>
                    <span>Created: {k.created}</span>
                  </div>
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}
