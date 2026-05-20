import { Shield, Copy, Plus } from "lucide-react";
import { toast } from "sonner";

const MOCK_CLIENTS = [
  { id: "c1", name: "Loop Workspace", clientId: "cli_loop_ws_prod_a1b2c3d4", grantTypes: ["authorization_code", "refresh_token"], redirectUris: ["https://workspace.ostloop.ng/auth/callback"], scopes: ["profile:read", "session:write"] },
  { id: "c2", name: "Loop Pay Mobile", clientId: "cli_pay_mob_dev_z9y8x7w6", grantTypes: ["authorization_code"], redirectUris: ["looppay://auth/callback"], scopes: ["profile:read", "wallet:read"] },
];

export default function OAuthClients() {
  const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success("Copied"); };
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">OAuth Clients</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage OAuth 2.0 client registrations and grant types</p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:opacity-90">
          <Plus className="w-3.5 h-3.5" /> Register Client
        </button>
      </div>

      <div className="space-y-4">
        {MOCK_CLIENTS.map(c => (
          <div key={c.id} className="bg-card border border-border rounded-xl p-5 space-y-4" data-testid={`oauth-client-${c.id}`}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg"><Shield className="w-4 h-4 text-primary" /></div>
              <div>
                <p className="font-semibold text-foreground">{c.name}</p>
                <p className="text-xs text-muted-foreground">OAuth 2.0 client</p>
              </div>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Client ID</span>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-foreground">{c.clientId}</span>
                  <button onClick={() => copy(c.clientId)} className="p-1 text-muted-foreground hover:text-foreground"><Copy className="w-3 h-3" /></button>
                </div>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-muted-foreground">Grant Types</span>
                <div className="flex flex-wrap gap-1 justify-end">
                  {c.grantTypes.map(g => <span key={g} className="font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{g}</span>)}
                </div>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-muted-foreground">Redirect URIs</span>
                <div className="space-y-0.5 text-right">
                  {c.redirectUris.map(u => <p key={u} className="font-mono text-foreground">{u}</p>)}
                </div>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-muted-foreground">Scopes</span>
                <div className="flex flex-wrap gap-1 justify-end">
                  {c.scopes.map(s => <span key={s} className="font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{s}</span>)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
