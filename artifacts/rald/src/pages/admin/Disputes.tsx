import { useState } from "react";
import { AlertCircle, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";

const MOCK_DISPUTES = [
  { id: "d1", ref: "ESC-2026050900011", buyer: "+2348012345678", seller: "+2348098765432", amount: 25000, reason: "Service not delivered", evidence: "pending", status: "open", created: "3 days ago" },
  { id: "d2", ref: "ESC-2026050600003", buyer: "+2348055566677", seller: "+2348033344455", amount: 85000, reason: "Quality dispute", evidence: "submitted", status: "in_review", created: "5 days ago" },
  { id: "d3", ref: "ESC-2026050300007", buyer: "+2348022233344", seller: "+2348011122233", amount: 40000, reason: "Partial delivery", evidence: "submitted", status: "escalated", created: "7 days ago" },
];

const statusColors: Record<string, string> = {
  open: "bg-blue-500/10 text-blue-500",
  in_review: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  escalated: "bg-red-500/10 text-red-500",
  resolved: "bg-green-500/10 text-green-600 dark:text-green-400",
};

export default function Disputes() {
  const [disputes, setDisputes] = useState(MOCK_DISPUTES);

  const resolve = (id: string, winner: "buyer" | "seller") => {
    setDisputes(d => d.filter(x => x.id !== id));
    toast.success(`Dispute resolved in favor of ${winner}`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Escrow Disputes</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage escrow disputes and mediation</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Open", value: disputes.filter(d => d.status === "open").length, color: "text-blue-500" },
          { label: "In Review", value: disputes.filter(d => d.status === "in_review").length, color: "text-yellow-500" },
          { label: "Escalated", value: disputes.filter(d => d.status === "escalated").length, color: "text-red-500" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4 text-center">
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {disputes.map(d => (
          <div key={d.id} className="bg-card border border-border rounded-xl p-5 space-y-4" data-testid={`dispute-${d.id}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground font-mono">{d.ref}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[d.status]}`}>{d.status.replace("_", " ")}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Opened {d.created}</p>
              </div>
              <p className="text-lg font-bold text-foreground">₦{d.amount.toLocaleString()}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-muted-foreground">Buyer</p>
                <p className="font-mono text-foreground mt-0.5">{d.buyer}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Seller</p>
                <p className="font-mono text-foreground mt-0.5">{d.seller}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Reason</p>
                <p className="text-foreground mt-0.5">{d.reason}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Evidence</p>
                <p className={`mt-0.5 capitalize ${d.evidence === "submitted" ? "text-green-500" : "text-yellow-500"}`}>{d.evidence}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => resolve(d.id, "buyer")} className="flex-1 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:opacity-90" data-testid={`resolve-buyer-${d.id}`}>
                Release to Buyer
              </button>
              <button onClick={() => resolve(d.id, "seller")} className="flex-1 py-2 border border-border text-foreground text-xs font-medium rounded-lg hover:bg-muted" data-testid={`resolve-seller-${d.id}`}>
                Release to Seller
              </button>
            </div>
          </div>
        ))}

        {disputes.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <CheckCircle className="w-10 h-10 mx-auto mb-3 text-green-500" />
            <p className="font-medium">No open disputes</p>
            <p className="text-sm">All disputes have been resolved</p>
          </div>
        )}
      </div>
    </div>
  );
}
