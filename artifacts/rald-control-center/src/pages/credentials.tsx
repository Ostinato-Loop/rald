import { useState } from "react";
import {
  useListCredentials,
  useCreateCredential,
  useRotateCredential,
  useDeleteCredential,
  getListCredentialsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, RotateCw, Trash2, KeyRound } from "lucide-react";

const CATEGORIES = ["aws", "github", "supabase", "cloudflare", "stripe", "termii", "custom"] as const;
type Category = typeof CATEGORIES[number];

const categoryColors: Record<Category, string> = {
  aws: "text-orange-400 border-orange-400/30",
  github: "text-white border-white/20",
  supabase: "text-green-400 border-green-400/30",
  cloudflare: "text-orange-500 border-orange-500/30",
  stripe: "text-purple-400 border-purple-400/30",
  termii: "text-blue-400 border-blue-400/30",
  custom: "text-muted-foreground border-border",
};

export default function Credentials() {
  const { data: credentials, isLoading } = useListCredentials();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ key: "", category: "custom" as Category, value: "", description: "" });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListCredentialsQueryKey() });

  const createMutation = useCreateCredential({
    mutation: {
      onSuccess: () => {
        invalidate();
        setShowForm(false);
        setForm({ key: "", category: "custom", value: "", description: "" });
      },
    },
  });
  const rotateMutation = useRotateCredential({ mutation: { onSuccess: invalidate } });
  const deleteMutation = useDeleteCredential({ mutation: { onSuccess: invalidate } });

  const handleRotate = (id: string, key: string) => {
    const newValue = window.prompt(`Enter new value for "${key}":`);
    if (newValue === null || newValue.trim() === "") return;
    rotateMutation.mutate({ id, data: { value: newValue.trim() } });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-widest text-foreground">Credentials</h1>
          <p className="text-sm text-muted-foreground mt-1">{credentials?.length || 0} stored credentials — AES-256-GCM encrypted</p>
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
              createMutation.mutate({ data: { key: form.key, value: form.value, category: form.category, description: form.description || undefined } });
            }}
            className="grid grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Key</label>
              <input value={form.key} onChange={e => setForm({ ...form, key: e.target.value })}
                placeholder="e.g. STRIPE_SECRET_KEY"
                className="w-full bg-input border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary placeholder:text-muted-foreground/50"
                required />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as Category })}
                className="w-full bg-input border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary">
                {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Description</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Optional description"
                className="w-full bg-input border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary placeholder:text-muted-foreground/50"
              />
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
          <div className="col-span-4">Key</div>
          <div className="col-span-2">Category</div>
          <div className="col-span-3">Last Rotated</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading credentials...</div>
        ) : credentials?.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No credentials stored</div>
        ) : (
          credentials?.map((c, i) => (
            <div key={c.id} className={`grid grid-cols-12 items-center px-4 py-3 text-sm ${i < credentials.length - 1 ? "border-b border-border" : ""} hover:bg-muted/20`}>
              <div className="col-span-1">
                <KeyRound className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div className="col-span-4">
                <div className="font-mono text-xs text-foreground">{c.key}</div>
                {c.description && <div className="text-xs text-muted-foreground mt-0.5">{c.description}</div>}
              </div>
              <div className="col-span-2">
                <span className={`text-xs border px-2 py-0.5 uppercase tracking-wider ${categoryColors[c.category as Category] || "text-muted-foreground border-border"}`}>
                  {c.category}
                </span>
              </div>
              <div className="col-span-3 text-xs text-muted-foreground font-mono">
                {c.lastRotatedAt ? new Date(c.lastRotatedAt).toLocaleDateString() : "Never"}
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                <button
                  onClick={() => handleRotate(c.id, c.key)}
                  disabled={rotateMutation.isPending}
                  className="p-1.5 border border-border hover:border-primary hover:text-primary text-muted-foreground transition-colors"
                  title="Rotate credential"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`Delete credential "${c.key}"?`)) {
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
          All credentials are stored with AES-256-GCM encryption. Values are never returned via API. Rotation replaces the stored ciphertext with the new value.
        </p>
      </div>
    </div>
  );
}
