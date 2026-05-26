import { useState } from "react";
import { useListServices, useRestartService } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListServicesQueryKey } from "@workspace/api-client-react";
import { RotateCw, Activity, ExternalLink } from "lucide-react";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    healthy: "text-primary border-primary/30 bg-primary/10",
    degraded: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
    down: "text-destructive border-destructive/30 bg-destructive/10",
    deploying: "text-blue-400 border-blue-400/30 bg-blue-400/10",
    unknown: "text-muted-foreground border-border bg-muted/50",
  };
  return (
    <span className={`px-2 py-0.5 text-xs font-medium uppercase tracking-wider border ${map[status] || "text-muted-foreground border-border"}`}>
      {status}
    </span>
  );
}

export default function Services() {
  const { data: services, isLoading } = useListServices();
  const [restartingId, setRestartingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const restartMutation = useRestartService({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
        setRestartingId(null);
      },
      onError: () => setRestartingId(null),
    },
  });

  const grouped = services?.reduce((acc, svc) => {
    const p = svc.product || "General";
    if (!acc[p]) acc[p] = [];
    acc[p].push(svc);
    return acc;
  }, {} as Record<string, typeof services>) || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-widest text-foreground">Services</h1>
          <p className="text-sm text-muted-foreground mt-1">{services?.length || 0} registered services</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground border border-border px-3 py-1.5">
          <Activity className="w-3.5 h-3.5 text-primary" />
          <span className="font-mono">{services?.filter(s => s.status === "healthy").length || 0} healthy</span>
        </div>
      </div>

      {isLoading ? (
        <div className="border border-border p-8 text-center text-sm text-muted-foreground">Loading services...</div>
      ) : (
        Object.entries(grouped).map(([product, svcs]) => (
          <div key={product}>
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">{product}</h2>
            <div className="border border-border">
              <div className="grid grid-cols-12 text-xs font-medium uppercase tracking-widest text-muted-foreground px-4 py-2 border-b border-border bg-muted/30">
                <div className="col-span-3">Service</div>
                <div className="col-span-2">Slug</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Version</div>
                <div className="col-span-2">Region</div>
                <div className="col-span-1 text-right">Action</div>
              </div>
              {svcs?.map((svc, i) => (
                <div key={svc.id} className={`grid grid-cols-12 items-center px-4 py-3 text-sm ${i < (svcs?.length || 0) - 1 ? "border-b border-border" : ""} hover:bg-muted/20 transition-colors`}>
                  <div className="col-span-3">
                    <div className="font-medium text-foreground">{svc.name}</div>
                    {svc.url && (
                      <a href={svc.url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mt-0.5">
                        {svc.url.replace("https://", "")} <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <div className="col-span-2 text-muted-foreground text-xs font-mono">{svc.slug}</div>
                  <div className="col-span-2"><StatusBadge status={svc.status} /></div>
                  <div className="col-span-2 font-mono text-xs text-muted-foreground">{svc.version || "—"}</div>
                  <div className="col-span-2 text-xs text-muted-foreground">{svc.region || "—"}</div>
                  <div className="col-span-1 flex justify-end">
                    <button
                      onClick={() => {
                        setRestartingId(svc.id);
                        restartMutation.mutate({ id: svc.id });
                      }}
                      disabled={restartingId === svc.id}
                      className="p-1.5 border border-border hover:border-primary hover:text-primary text-muted-foreground transition-colors disabled:opacity-50"
                      title="Restart service"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${restartingId === svc.id ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
