import { useState } from "react";
import { useListDeployments, useTriggerDeployment, useListServices } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListDeploymentsQueryKey } from "@workspace/api-client-react";
import { Rocket, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    success: "text-primary border-primary/30 bg-primary/10",
    running: "text-blue-400 border-blue-400/30 bg-blue-400/10",
    pending: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
    failed: "text-destructive border-destructive/30 bg-destructive/10",
    cancelled: "text-muted-foreground border-border",
  };
  const icons: Record<string, React.ElementType> = {
    success: CheckCircle2,
    running: Loader2,
    pending: Clock,
    failed: XCircle,
  };
  const Icon = icons[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium uppercase tracking-wider border ${map[status] || "text-muted-foreground border-border"}`}>
      {Icon && <Icon className={`w-3 h-3 ${status === "running" ? "animate-spin" : ""}`} />}
      {status}
    </span>
  );
}

export default function Deployments() {
  const { data: deployments, isLoading } = useListDeployments();
  const { data: services } = useListServices();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({ serviceId: "", environment: "production", version: "" });
  const [showForm, setShowForm] = useState(false);

  const triggerMutation = useTriggerDeployment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDeploymentsQueryKey() });
        setShowForm(false);
        setForm({ serviceId: "", environment: "production", version: "" });
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-widest text-foreground">Deployments</h1>
          <p className="text-sm text-muted-foreground mt-1">{deployments?.length || 0} total deployments</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors"
        >
          <Rocket className="w-3.5 h-3.5" />
          New Deployment
        </button>
      </div>

      {showForm && (
        <div className="border border-primary/30 bg-primary/5 p-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Trigger Deployment</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              triggerMutation.mutate({ data: form });
            }}
            className="grid grid-cols-3 gap-4"
          >
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Service</label>
              <select
                value={form.serviceId}
                onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
                className="w-full bg-input border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                required
              >
                <option value="">Select service...</option>
                {services?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Environment</label>
              <select
                value={form.environment}
                onChange={(e) => setForm({ ...form, environment: e.target.value })}
                className="w-full bg-input border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
              >
                <option value="production">Production</option>
                <option value="staging">Staging</option>
                <option value="development">Development</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Version</label>
              <input
                value={form.version}
                onChange={(e) => setForm({ ...form, version: e.target.value })}
                placeholder="e.g. v1.2.3 or latest"
                className="w-full bg-input border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary placeholder:text-muted-foreground/50"
              />
            </div>
            <div className="col-span-3 flex gap-3">
              <button
                type="submit"
                disabled={triggerMutation.isPending}
                className="bg-primary text-primary-foreground px-6 py-2 text-xs font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {triggerMutation.isPending ? "Deploying..." : "Deploy"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="border border-border text-muted-foreground px-6 py-2 text-xs font-medium uppercase tracking-wider hover:text-foreground hover:border-foreground/30 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="border border-border">
        <div className="grid grid-cols-12 text-xs font-medium uppercase tracking-widest text-muted-foreground px-4 py-2 border-b border-border bg-muted/30">
          <div className="col-span-3">Service</div>
          <div className="col-span-2">Environment</div>
          <div className="col-span-2">Version</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Duration</div>
          <div className="col-span-1">Triggered by</div>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
        ) : deployments?.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No deployments yet</div>
        ) : (
          deployments?.map((d, i) => (
            <div key={d.id} className={`grid grid-cols-12 items-center px-4 py-3 text-sm ${i < deployments.length - 1 ? "border-b border-border" : ""} hover:bg-muted/20`}>
              <div className="col-span-3 font-medium text-foreground">{d.serviceName}</div>
              <div className="col-span-2 text-xs uppercase text-muted-foreground">{d.environment}</div>
              <div className="col-span-2 font-mono text-xs text-muted-foreground">{d.version}</div>
              <div className="col-span-2"><StatusBadge status={d.status} /></div>
              <div className="col-span-2 text-xs text-muted-foreground font-mono">{d.duration || "—"}</div>
              <div className="col-span-1 text-xs text-muted-foreground truncate">{d.triggeredBy || "system"}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
