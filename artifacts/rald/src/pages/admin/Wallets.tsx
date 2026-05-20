import { Wallet, TrendingUp, AlertTriangle, Lock } from "lucide-react";

const MOCK_WALLETS = Array.from({ length: 15 }, (_, i) => ({
  id: `w${i + 1}`,
  user: `+234${80 + (i % 4)}${String(Math.floor(Math.random() * 90000000) + 10000000)}`,
  balance: Math.floor(Math.random() * 500000),
  escrow: Math.floor(Math.random() * 200000),
  frozen: i % 7 === 0 ? Math.floor(Math.random() * 50000) : 0,
  status: i % 7 === 0 ? "frozen" : "active",
  transactions: Math.floor(Math.random() * 100),
}));

export default function Wallets() {
  const totalVolume = MOCK_WALLETS.reduce((s, w) => s + w.balance, 0);
  const totalEscrow = MOCK_WALLETS.reduce((s, w) => s + w.escrow, 0);
  const frozenFunds = MOCK_WALLETS.reduce((s, w) => s + w.frozen, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Wallets</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Platform-wide wallet surveillance and financial overview
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: Wallet,
            label: "Total Volume",
            value: `₦${(totalVolume / 1000000).toFixed(1)}M`,
            color: "text-blue-500 bg-blue-500/10",
          },
          {
            icon: TrendingUp,
            label: "Total Escrow",
            value: `₦${(totalEscrow / 1000).toFixed(0)}K`,
            color: "text-green-500 bg-green-500/10",
          },
          {
            icon: Lock,
            label: "Frozen Funds",
            value: `₦${(frozenFunds / 1000).toFixed(0)}K`,
            color: "text-red-500 bg-red-500/10",
          },
          {
            icon: AlertTriangle,
            label: "Frozen Wallets",
            value: String(
              MOCK_WALLETS.filter((w) => w.status === "frozen").length,
            ),
            color: "text-yellow-500 bg-yellow-500/10",
          },
        ].map(({ icon: Icon, label, value, color }) => (
          <div
            key={label}
            className="bg-card border border-border rounded-xl p-4 space-y-2"
          >
            <div className={`inline-flex p-2 rounded-lg ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {[
                  "User",
                  "Balance",
                  "Escrow",
                  "Frozen",
                  "Transactions",
                  "Status",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs text-muted-foreground font-medium"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {MOCK_WALLETS.map((w) => (
                <tr
                  key={w.id}
                  className="hover:bg-muted/30 transition-colors"
                  data-testid={`wallet-row-${w.id}`}
                >
                  <td className="px-4 py-3 font-mono text-xs text-foreground">
                    {w.user}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-foreground">
                    ₦{w.balance.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    ₦{w.escrow.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-red-500">
                    {w.frozen > 0 ? `₦${w.frozen.toLocaleString()}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {w.transactions}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full capitalize ${w.status === "active" ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-red-500/10 text-red-500"}`}
                    >
                      {w.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {w.status === "frozen" && (
                      <button
                        className="text-xs text-primary hover:underline"
                        data-testid={`unfreeze-${w.id}`}
                      >
                        Unfreeze
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
