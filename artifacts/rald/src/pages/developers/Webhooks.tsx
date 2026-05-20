import { useState } from "react";
import { Plus, Trash2, Play, CheckCircle, XCircle, Webhook } from "lucide-react";
import { toast } from "sonner";

const EVENTS = ["user.login", "user.logout", "otp.sent", "otp.verified", "session.created", "session.revoked", "wallet.funded", "wallet.transferred", "api-key.created", "api-key.revoked"];

const MOCK_WEBHOOKS = [
  { id: "wh1", url: "https://workspace.ostloop.ng/webhooks/rald", events: ["user.login", "session.created"], status: "active", lastDelivery: "2 min ago", successRate: "99.2%" },
  { id: "wh2", url: "https://hooks.zapier.com/hooks/catch/12345678/abcdef", events: ["wallet.funded"], status: "active", lastDelivery: "1 hr ago", successRate: "98.7%" },
];

export default function Webhooks() {
  const [hooks, setHooks] = useState(MOCK_WEBHOOKS);
  const [showCreate, setShowCreate] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(["user.login"]);

  const create = () => {
    if (!newUrl.trim()) return;
    setHooks(h => [{ id: `wh${Date.now()}`, url: newUrl, events: selectedEvents, status: "active", lastDelivery: "Never", successRate: "—" }, ...h]);
    setShowCreate(false); setNewUrl(""); setSelectedEvents(["user.login"]);
    toast.success("Webhook created");
  };

  const testWebhook = (id: string) => {
    toast.success("Test payload sent");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Webhooks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Receive real-time event notifications at your endpoints</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:opacity-90" data-testid="create-webhook">
          <Plus className="w-3.5 h-3.5" /> Add Endpoint
        </button>
      </div>

      {showCreate && (
        <div className="bg-card border border-primary/30 rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-foreground">New Webhook Endpoint</h3>
          <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://your-app.com/webhook" className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm text-foreground outline-none focus:border-primary" data-testid="webhook-url" />
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Listen for events</p>
            <div className="grid grid-cols-2 gap-1.5">
              {EVENTS.map(e => (
                <label key={e} className="flex items-center gap-2 cursor-pointer text-xs">
                  <input type="checkbox" checked={selectedEvents.includes(e)} onChange={ev => setSelectedEvents(s => ev.target.checked ? [...s, e] : s.filter(x => x !== e))} className="rounded" />
                  <span className="font-mono text-foreground">{e}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={create} className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90">Add Endpoint</button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 border border-border text-foreground text-sm rounded-lg hover:bg-muted">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {hooks.map(hook => (
          <div key={hook.id} className="bg-card border border-border rounded-xl p-5 space-y-3" data-testid={`webhook-${hook.id}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Webhook className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-mono text-foreground truncate">{hook.url}</span>
                  <span className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full shrink-0">{hook.status}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Last delivery: {hook.lastDelivery}</span>
                  <span className="text-green-500">{hook.successRate} success</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => testWebhook(hook.id)} className="flex items-center gap-1 px-2.5 py-1 border border-border text-xs text-foreground rounded-lg hover:bg-muted" data-testid={`test-webhook-${hook.id}`}>
                  <Play className="w-3 h-3" /> Test
                </button>
                <button onClick={() => { setHooks(h => h.filter(x => x.id !== hook.id)); toast.success("Webhook removed"); }} className="p-1.5 text-muted-foreground hover:text-destructive rounded">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {hook.events.map(e => <span key={e} className="text-xs font-mono bg-muted text-muted-foreground px-2 py-0.5 rounded">{e}</span>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
