import { CreditCard, FileText, TrendingUp } from "lucide-react";

const INVOICES = [
  { id: "inv_001", period: "May 2026", amount: "₦0", status: "current", due: "Jun 1, 2026" },
  { id: "inv_002", period: "Apr 2026", amount: "₦0", status: "paid", due: "May 1, 2026" },
  { id: "inv_003", period: "Mar 2026", amount: "₦0", status: "paid", due: "Apr 1, 2026" },
];

export default function Billing() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Billing</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your current plan and usage-based billing estimate</p>
      </div>

      <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">Current Plan</p>
            <p className="text-2xl font-bold text-foreground mt-1">Developer Free</p>
          </div>
          <div className="px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full">Active</div>
        </div>
        <div className="grid grid-cols-3 gap-4 pt-2">
          {[{ label: "API Requests", limit: "100,000 / mo", used: "14,821" }, { label: "OTP Sends", limit: "10,000 / mo", used: "4,632" }, { label: "Team Members", limit: "Unlimited", used: "1" }].map(({ label, limit, used }) => (
            <div key={label}>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">{used}</p>
              <p className="text-xs text-muted-foreground">of {limit}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Usage Estimate</h3>
        </div>
        <p className="text-3xl font-bold text-foreground">₦0 <span className="text-sm font-normal text-muted-foreground">this month</span></p>
        <p className="text-xs text-muted-foreground">Free tier — no charges until limits are exceeded</p>
      </div>

      <div className="bg-card border border-border rounded-xl">
        <div className="flex items-center gap-2 p-5 border-b border-border">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-foreground text-sm">Invoice History</h3>
        </div>
        <div className="divide-y divide-border">
          {INVOICES.map(inv => (
            <div key={inv.id} className="flex items-center justify-between px-5 py-3.5" data-testid={`invoice-${inv.id}`}>
              <div>
                <p className="text-sm font-medium text-foreground">{inv.period}</p>
                <p className="text-xs text-muted-foreground">Due {inv.due}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-foreground">{inv.amount}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${inv.status === "paid" ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-blue-500/10 text-blue-500"}`}>{inv.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
