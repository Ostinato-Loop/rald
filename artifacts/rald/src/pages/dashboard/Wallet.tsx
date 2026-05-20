import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, ArrowDownLeft, Clock, Send, Download, Plus, Filter } from "lucide-react";
import { apiCall, fmt } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

interface Transaction {
  id: string;
  type: "credit" | "debit" | "escrow";
  desc: string;
  amount: number;
  status: "completed" | "pending" | "failed";
  time: string;
  ref: string;
}

interface WalletData {
  balance?: number;
  available?: number;
  escrow?: number;
  pending?: number;
  frozen?: number;
  transactions?: Transaction[];
}

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: "t1", type: "credit", desc: "Wallet funded via Paystack", amount: 50000, status: "completed", time: "3 hr ago", ref: "PAY-2026051200001" },
  { id: "t2", type: "debit", desc: "Transfer to Chioma A.", amount: -12500, status: "completed", time: "1 day ago", ref: "TRF-2026051100023" },
  { id: "t3", type: "escrow", desc: "Escrow funded - Logo Design", amount: -25000, status: "pending", time: "2 days ago", ref: "ESC-2026050900011" },
  { id: "t4", type: "credit", desc: "Escrow released - Web Dev", amount: 85000, status: "completed", time: "5 days ago", ref: "ESC-2026050600003" },
  { id: "t5", type: "debit", desc: "Withdrawal to GTBank", amount: -40000, status: "completed", time: "1 week ago", ref: "WTH-2026050400007" },
];

const statusClasses: Record<string, string> = {
  completed: "text-green-500 bg-green-500/10",
  pending: "text-yellow-500 bg-yellow-500/10",
  failed: "text-red-500 bg-red-500/10",
};

export default function WalletPage() {
  const [activeTab, setActiveTab] = useState<"all" | "credit" | "debit">("all");

  const { data, isLoading } = useQuery<WalletData>({
    queryKey: ["wallet"],
    queryFn: () => apiCall<WalletData>("/wallet"),
    retry: 1,
    staleTime: 30_000,
  });

  const balance = data?.available ?? data?.balance ?? 125000;
  const escrow = data?.escrow ?? 50000;
  const pending = data?.pending ?? 8500;
  const frozen = data?.frozen ?? 0;
  const transactions: Transaction[] = data?.transactions ?? MOCK_TRANSACTIONS;

  const filtered = activeTab === "all" ? transactions : transactions.filter(t => {
    if (activeTab === "credit") return t.amount > 0;
    return t.amount < 0;
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Wallet</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your NGN wallet, transfers, and escrow</p>
      </div>

      {isLoading ? (
        <Skeleton className="h-44 rounded-2xl" />
      ) : (
        <div className="relative rounded-2xl overflow-hidden" data-testid="wallet-balance-card">
          <div className="bg-gradient-to-br from-primary to-blue-700 p-6 text-white">
            <p className="text-sm opacity-75 font-medium">Available Balance</p>
            <p className="text-4xl font-bold mt-1 font-mono">{fmt.ngn(balance)}</p>
            <p className="text-xs opacity-60 mt-0.5">NGN · RALD Wallet</p>
            <div className="flex gap-6 mt-4">
              {[
                { label: "Escrow", value: fmt.ngn(escrow) },
                { label: "Pending", value: fmt.ngn(pending) },
                { label: "Frozen", value: fmt.ngn(frozen) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs opacity-60">{label}</p>
                  <p className="text-sm font-semibold opacity-90 font-mono">{value}</p>
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
                className="bg-card py-3 flex flex-col items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                data-testid={`wallet-action-${label.toLowerCase()}`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Transactions */}
      <div className="bg-card border border-border rounded-xl">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Transactions</h3>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
            {(["all", "credit", "debit"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-colors capitalize ${activeTab === tab ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-border">
          {isLoading ? (
            [1,2,3,4].map(i => <Skeleton key={i} className="h-16 m-3 rounded-lg" />)
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-10">No transactions found</p>
          ) : filtered.map(t => (
            <div key={t.id} className="flex items-center gap-3 p-4" data-testid={`tx-${t.id}`}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${t.amount > 0 ? "bg-green-500/10" : "bg-red-500/10"}`}>
                {t.amount > 0
                  ? <ArrowDownLeft className="w-4 h-4 text-green-500" />
                  : <ArrowUpRight className="w-4 h-4 text-red-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{t.desc}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${statusClasses[t.status]}`}>{t.status}</span>
                  <span className="text-xs text-muted-foreground font-mono">{t.ref}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-sm font-semibold font-mono ${t.amount > 0 ? "text-green-500" : "text-foreground"}`}>
                  {t.amount > 0 ? "+" : ""}{fmt.ngn(Math.abs(t.amount))}
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end mt-0.5">
                  <Clock className="w-3 h-3" />
                  {t.time}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-border">
          <button className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground py-1.5 transition-colors">
            <Filter className="w-3.5 h-3.5" />
            Filter & export
          </button>
        </div>
      </div>
    </div>
  );
}
