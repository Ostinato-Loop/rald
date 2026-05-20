import { useState } from "react";
import { toast } from "sonner";

const INITIAL_FLAGS = [
  { id: "otp_v2", name: "OTP v2 Engine", desc: "Use the new OTP routing engine with Termii priority", enabled: true, rollout: 100, env: "production" },
  { id: "wallet_escrow", name: "Wallet Escrow", desc: "Enable escrow holds and dispute resolution", enabled: true, rollout: 80, env: "production" },
  { id: "mfa_totp", name: "TOTP MFA", desc: "Time-based one-time password for 2FA", enabled: false, rollout: 0, env: "beta" },
  { id: "oauth_pkce", name: "OAuth PKCE Flow", desc: "Proof Key for Code Exchange for public clients", enabled: true, rollout: 100, env: "production" },
  { id: "ai_fraud", name: "AI Fraud Detection", desc: "ML-powered anomaly detection for login patterns", enabled: false, rollout: 10, env: "beta" },
  { id: "passkey", name: "Passkey Support", desc: "WebAuthn / FIDO2 biometric authentication", enabled: false, rollout: 0, env: "alpha" },
];

const envColors: Record<string, string> = {
  production: "bg-green-500/10 text-green-600 dark:text-green-400",
  beta: "bg-blue-500/10 text-blue-500",
  alpha: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
};

export default function FeatureFlags() {
  const [flags, setFlags] = useState(INITIAL_FLAGS);

  const toggle = (id: string) => {
    setFlags(f => f.map(flag => flag.id === id ? { ...flag, enabled: !flag.enabled, rollout: !flag.enabled ? flag.rollout || 100 : 0 } : flag));
    const flag = flags.find(f => f.id === id);
    toast.success(`${flag?.name} ${flag?.enabled ? "disabled" : "enabled"}`);
  };

  const setRollout = (id: string, value: number) => {
    setFlags(f => f.map(flag => flag.id === id ? { ...flag, rollout: value } : flag));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Feature Flags</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Control feature rollouts and environment targeting</p>
      </div>

      <div className="space-y-3">
        {flags.map(flag => (
          <div key={flag.id} className={`bg-card border rounded-xl p-5 space-y-3 transition-colors ${flag.enabled ? "border-border" : "border-border/50 opacity-70"}`} data-testid={`flag-${flag.id}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-semibold text-foreground text-sm">{flag.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${envColors[flag.env]}`}>{flag.env}</span>
                </div>
                <p className="text-xs text-muted-foreground">{flag.desc}</p>
              </div>
              <button
                onClick={() => toggle(flag.id)}
                className={`relative w-10 rounded-full transition-colors shrink-0 ${flag.enabled ? "bg-primary" : "bg-muted"}`}
                style={{ height: 22 }}
                data-testid={`toggle-flag-${flag.id}`}
              >
                <div
                  className="absolute bg-white rounded-full shadow transition-transform"
                  style={{ width: 18, height: 18, top: 2, left: flag.enabled ? "calc(100% - 20px)" : 2 }}
                />
              </button>
            </div>

            {flag.enabled && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Rollout percentage</span>
                  <span className="font-semibold text-foreground">{flag.rollout}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={flag.rollout}
                  onChange={e => setRollout(flag.id, Number(e.target.value))}
                  className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
                  data-testid={`rollout-${flag.id}`}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
