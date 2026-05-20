import { useState } from "react";
import { Wallet, ArrowUpRight, ArrowDownLeft, Clock, Send, Download, Plus, Filter } from "lucide-react";
import { motion } from "framer-motion";

const MOCK_TRANSACTIONS = [
  { id: "t1", type: "credit", desc: "Wallet funded via Paystack", amount: 50000, status: "completed", time: "3 hr ago", ref: "PAY-2026051200001" },
  { id: "t2", type: "debit", desc: "Transfer to Chioma A.", amount: -12500, status: "completed", time: "1 day ago", ref: "TRF-2026051100023" },
  { id: "t3", type: "escrow", desc: "Escrow funded - Logo Design", amount: -25000, status: "pending", time: "2 days ago", ref: "ESC-2026050900011" },
  { id: "t4", type: "credit", desc: "Escrow released - Web Dev", amount: 85000, status: "completed", time: "5 days ago", ref: "ESC-2026050600003" },
  { id: "t5", type: "debit", desc: "Withdrawal to GTBank", amount: -40000, status: "completed", time: "1 week ago", ref: "WTH-2026050400007" },
];

export default function WalletPage() {
  const [activeTab, setActiveTab] = useState<"all" | "credit" | "debit">("all");
  const filtered = activeTab === "all" ? MOCK_TRANSACTIONS : MOCK_TRANSACTIONS.filter(t => t.type === activeTab || (activeTab === "credit" && t.type === "escrow" && t.amount > 0));

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Wallet</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your NGN wallet, transfers, and escrow</p>
      </div>

      {/* Balance cards */}
      <div className="relative rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-br from-primary to-blue-700 p-6 text-white" data-testid="wallet-balance-card">
          <p className="text-sm opacity-75 font-medium">Available Balance</p>
          <p className="text-4xl font-bold mt-1">₦125,000<span className="text-lg font-normal">.00</span></p>
          <p className="text-xs opacity-60 mt-0.5 font-mono">NGN · RALD Wallet</p>
          <div className="flex gap-6 mt-4">
            {[
              { label: "Escrow", value: "₦50,000" },
              { label: "Pending", value: "₦8,500" },
              { label: "Frozen", value: "₦0" },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs opacity-60">{label}</p>
                <p className="text-sm font-semibold opacity-90">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-px bg-border">
          {[
            { icon: Plus, label: "Fund" },
            { icon: Send, label: "Transfer" },
            { icon: Download, label: "Withdraw" },
            { icon: Clock, label: "Statement" },
          ].map(({ icon: Icon, label }) => (
            <button
              key={label}
              className="flex flex-col items-center gap-1.5 py-4 bg-card hover:bg-muted transition-colors"
              data-testid={`wallet-action-${label.toLowerCase()}`}
            >
              <Icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Escrow summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Active Escrows", value: "2", sub: "In progress" },
          { label: "Completed", value: "8", sub: "Total" },
          { label: "Disputes", value: "0", sub: "Open" },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4 text-center" data-testid={`escrow-stat-${label.toLowerCase().replace(/\s/g, "-")}`}>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs font-medium text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground">{sub}</p>
          </div>
        ))}
      </div>

      {/* Transactions */}
      <div className="bg-card border border-border rounded-xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="font-semibold text-foreground text-sm">Transaction History</h3>
          <div className="flex items-center gap-2">
            <div className="flex bg-muted rounded-lg p-0.5">
              {(["all", "credit", "debit"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md capitalize transition-colors ${activeTab === tab ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="divide-y divide-border">
          {MOCK_TRANSACTIONS.map(t => (
            <div key={t.id} className="flex items-center gap-3 px-5 py-3.5" data-testid={`transaction-${t.id}`}>
              <div className={`p-2 rounded-lg ${t.amount > 0 ? "bg-green-500/10" : "bg-red-500/10"}`}>
                {t.amount > 0 ? <ArrowDownLeft className="w-4 h-4 text-green-500" /> : <ArrowUpRight className="w-4 h-4 text-red-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{t.desc}</p>
                <p className="text-xs text-muted-foreground font-mono">{t.ref}</p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-sm font-semibold ${t.amount > 0 ? "text-green-500" : "text-foreground"}`}>
                  {t.amount > 0 ? "+" : ""}₦{Math.abs(t.amount).toLocaleString()}
                </p>
                <div className="flex items-center justify-end gap-1.5 mt-0.5">
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${t.status === "completed" ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"}`}>
                    {t.status}
                  </span>
                  <span className="text-xs text-muted-foreground">{t.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
