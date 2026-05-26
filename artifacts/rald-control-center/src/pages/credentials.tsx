import { useState } from "react";
import {
  useListCredentials,
  useCreateCredential,
  useRotateCredential,
  useDeleteCredential,
  getListCredentialsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, RotateCw, Trash2, Eye, EyeOff, KeyRound } from "lucide-react";

export default function Credentials() {
  const { data: credentials, isLoading } = useListCredentials();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState({ name: "", service: "", type: "api_key", value: "" });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListCredentialsQueryKey() });

  const createMutation = useCreateCredential({ mutation: { onSuccess: () => { invalidate(); setShowForm(false); setForm({ name: "", service: "", type: "api_key", value: "" }); } } });
  const rotateMutation = useRotateCredential({ mutation: { onSuccess: invalidate } });
  const deleteMutation = useDeleteCredential({ mutation: { onSuccess: invalidate } });

  const typeColors: Record<string, string> = {
    api_key: "text-primary border-primary/30",
    oauth_token: "text-secondary border-secondary/30",
    database_url: "text-chart-3 border-chart-3/30",
    webhook_secret: "text-chart-4 border-chart-4/30",
    ssh_key: "text-chart-5 border-chart-5/30",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-widest text-foreground">Credentials</h1>
          <p className="text-sm text-muted-foreground mt-1">{credentials?.length || 0} stored credentials — AES-256-CBC encrypted</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New Credential
        </button>
      </div>

      {showForm && (
        <div className="border border-primary/30 bg-primary/5 p-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Store Credential</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate({ data: form });
            }}
            className="grid grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. STRIPE_SECRET_KEY"
                className="w-full bg-input border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary placeholder:text-muted-foreground/50"
                required />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Service</label>
              <input value={form.service} onChange={e => setForm({ ...form, service: e.target.value })}
                placeholder="e.g. loop-business"
                className="w-full bg-input border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary placeholder:text-muted-foreground/50"
                required />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Type</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                className="w-full bg-input border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary">
                <option value="api_key">API Key</option>
                <option value="oauth_token">OAuth Token</option>
                <option value="database_url">Database URL</option>
                <option value="webhook_secret">Webhook Secret</option>
                <option value="ssh_key">SSH Key</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Value</label>
              <input value={form.value} onChange={e => setForm({ ...form, value: e.target.value })}
                type="password"
                placeholder="Credential value (will be encrypted)"
                className="w-full bg-input border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary placeholder:text-muted-foreground/50"
                required />
            </div>
            <div className="col-span-2 flex gap-3">
              <button type="submit" disabled={createMutation.isPending}
                className="bg-primary text-primary-foreground px-6 py-2 text-xs font-bold uppercase tracking-wider hover:bg-primary/90 disabled:opacity-50">
                {createMutation.isPending ? "Storing..." : "Store Encrypted"}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="border border-border text-muted-foreground px-6 py-2 text-xs uppercase tracking-wider hover:text-foreground">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="border border-border">
        <div className="grid grid-cols-12 text-xs font-medium uppercase tracking-widest text-muted-foreground px-4 py-2 border-b border-border bg-muted/30">
          <div className="col-span-1"><KeyRound className="w-3.5 h-3.5" /></div>
          <div className="col-span-3">Name</div>
          <div className="col-span-2">Service</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-3">Last Rotated</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading credentials...</div>
        ) : credentials?.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No credentials stored</div>
        ) : (
          credentials?.map((c, i) => (
            <div key={c.id} className={`grid grid-cols-12 items-center px-4 py-3 text-sm ${i < credentials.length - 1 ? "border-b border-border" : ""} hover:bg-muted/20`}>
              <div className="col-span-1">
                <button onClick={() => setVisible(v => ({ ...v, [c.id]: !v[c.id] }))} className="text-muted-foreground hover:text-primary">
                  {visible[c.id] ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="col-span-3">
                <div className="font-mono text-xs text-foreground">{c.name}</div>
                {visible[c.id] && c.maskedValue && (
                  <div className="font-mono text-xs text-primary mt-0.5">{c.maskedValue}</div>
                )}
              </div>
              <div className="col-span-2 text-xs text-muted-foreground">{c.service}</div>
              <div className="col-span-2">
                <span className={`text-xs border px-2 py-0.5 uppercase tracking-wider ${typeColors[c.type] || "text-muted-foreground border-border"}`}>
                  {c.type.replace("_", " ")}
                </span>
              </div>
              <div className="col-span-3 text-xs text-muted-foreground font-mono">
                {c.lastRotatedAt ? new Date(c.lastRotatedAt).toLocaleDateString() : "Never"}
              </div>
              <div className="col-span-1 flex justify-end gap-2">
                <button
                  onClick={() => rotateMutation.mutate({ id: c.id, data: {} })}
                  disabled={rotateMutation.isPending}
                  className="p-1.5 border border-border hover:border-primary hover:text-primary text-muted-foreground transition-colors"
                  title="Rotate credential"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete credential "${c.name}"?`)) {
                      deleteMutation.mutate({ id: c.id });
                    }
                  }}
                  className="p-1.5 border border-border hover:border-destructive hover:text-destructive text-muted-foreground transition-colors"
                  title="Delete credential"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="border border-border/50 bg-muted/20 px-4 py-3 flex items-center gap-3">
        <KeyRound className="w-4 h-4 text-primary flex-shrink-0" />
        <p className="text-xs text-muted-foreground">
          All credentials are stored with AES-256-CBC encryption. Only masked values are returned via API. Rotation generates a new value using the RALD key derivation function.
        </p>
      </div>
    </div>
  );
}
