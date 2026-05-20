import { useState } from "react";
import { Plus, Copy, Eye, EyeOff, Edit3, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const MOCK_APPS = [
  {
    id: "app1",
    name: "Loop Workspace",
    clientId: "cli_loop_ws_prod_a1b2c3d4",
    clientSecret: "sec_8f9g0h1i2j3k4l5m6n7o8p9",
    redirectUris: ["https://workspace.ostloop.ng/auth/callback"],
    grantTypes: ["authorization_code", "refresh_token"],
    scopes: ["profile:read", "session:write"],
    createdAt: "Jan 15, 2026",
    status: "active",
  },
  {
    id: "app2",
    name: "Loop Pay Mobile",
    clientId: "cli_pay_mob_dev_z9y8x7w6",
    clientSecret: "sec_1a2b3c4d5e6f7g8h9i0j1k2",
    redirectUris: ["looppay://auth/callback"],
    grantTypes: ["authorization_code"],
    scopes: ["profile:read", "wallet:read"],
    createdAt: "Mar 10, 2026",
    status: "active",
  },
];

export default function Apps() {
  const [apps, setApps] = useState(MOCK_APPS);
  const [revealed, setRevealed] = useState<string[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUri, setNewUri] = useState("");

  const maskSecret = (s: string) => s.slice(0, 8) + "•••••••••••••••" + s.slice(-4);
  const toggleReveal = (id: string) => setRevealed(r => r.includes(id) ? r.filter(x => x !== id) : [...r, id]);
  const copy = (text: string, label: string) => { navigator.clipboard.writeText(text); toast.success(`${label} copied`); };

  const createApp = () => {
    if (!newName.trim()) return;
    const app = {
      id: `app${Date.now()}`,
      name: newName,
      clientId: `cli_${Math.random().toString(36).slice(2, 12)}`,
      clientSecret: `sec_${Math.random().toString(36).slice(2, 26)}`,
      redirectUris: [newUri || "https://your-app.com/callback"],
      grantTypes: ["authorization_code"],
      scopes: ["profile:read"],
      createdAt: "Today",
      status: "active",
    };
    setApps(a => [app, ...a]);
    setShowCreate(false);
    setNewName("");
    setNewUri("");
    toast.success("Application created");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Applications</h1>
          <p className="text-sm text-muted-foreground mt-0.5">OAuth 2.0 applications and client credentials</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:opacity-90" data-testid="create-app">
          <Plus className="w-3.5 h-3.5" /> New App
        </button>
      </div>

      {showCreate && (
        <div className="bg-card border border-primary/30 rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-foreground">New Application</h3>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="App name" className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm text-foreground outline-none focus:border-primary" data-testid="app-name-input" />
          <input value={newUri} onChange={e => setNewUri(e.target.value)} placeholder="Redirect URI (e.g. https://app.example.com/callback)" className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm text-foreground outline-none focus:border-primary" data-testid="redirect-uri-input" />
          <div className="flex gap-2">
            <button onClick={createApp} className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90" data-testid="confirm-create-app">Create</button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 border border-border text-foreground text-sm rounded-lg hover:bg-muted">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {apps.map(app => (
          <div key={app.id} className="bg-card border border-border rounded-xl p-5 space-y-4" data-testid={`app-${app.id}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">{app.name}</p>
                <p className="text-xs text-muted-foreground">Created {app.createdAt}</p>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full">Active</span>
                <button className="p-1.5 text-muted-foreground hover:text-destructive rounded transition-colors" onClick={() => setApps(a => a.filter(x => x.id !== app.id))} data-testid={`delete-app-${app.id}`}><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              {[
                { label: "Client ID", value: app.clientId, mono: true, copyable: true },
              ].map(({ label, value, mono, copyable }) => (
                <div key={label} className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground min-w-[100px]">{label}</span>
                  <div className="flex items-center gap-1 flex-1 min-w-0">
                    <span className={`${mono ? "font-mono" : ""} text-foreground truncate`}>{value}</span>
                    {copyable && <button onClick={() => copy(value, label)} className="p-1 text-muted-foreground hover:text-foreground"><Copy className="w-3 h-3" /></button>}
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground min-w-[100px]">Client Secret</span>
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <span className="font-mono text-foreground truncate">{revealed.includes(app.id) ? app.clientSecret : maskSecret(app.clientSecret)}</span>
                  <button onClick={() => toggleReveal(app.id)} className="p-1 text-muted-foreground hover:text-foreground" data-testid={`reveal-secret-${app.id}`}>{revealed.includes(app.id) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}</button>
                  <button onClick={() => copy(app.clientSecret, "Client secret")} className="p-1 text-muted-foreground hover:text-foreground"><Copy className="w-3 h-3" /></button>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Redirect URIs</p>
              {app.redirectUris.map(uri => (
                <div key={uri} className="flex items-center gap-1.5 text-xs font-mono text-foreground bg-muted/50 px-3 py-1.5 rounded-lg">
                  <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />{uri}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {app.scopes.map(s => <span key={s} className="text-xs font-mono bg-muted text-muted-foreground px-2 py-0.5 rounded">{s}</span>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
