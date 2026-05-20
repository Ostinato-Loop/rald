import { useState } from "react";
import { Shield, Zap, Bell, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    maxFailedLogins: "5",
    otpExpiry: "300",
    sessionTimeout: "2592000",
    rateLimit: "1000",
    maintenanceMode: false,
    alertEmail: "admin@rald.ng",
  });

  const save = () => toast.success("System settings saved");

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">System Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Global platform configuration and security thresholds</p>
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-center gap-3">
        <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
        <p className="text-xs text-yellow-700 dark:text-yellow-300">Changes here affect the entire RALD platform. Proceed with caution.</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-muted-foreground" /><h3 className="font-semibold text-foreground">Security Thresholds</h3></div>
        {[
          { label: "Max failed login attempts before lockout", key: "maxFailedLogins", type: "number" },
          { label: "OTP expiry (seconds)", key: "otpExpiry", type: "number" },
          { label: "Session timeout (seconds)", key: "sessionTimeout", type: "number" },
        ].map(({ label, key, type }) => (
          <div key={key}>
            <label className="text-xs text-muted-foreground">{label}</label>
            <input
              type={type}
              value={settings[key as keyof typeof settings] as string}
              onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))}
              className="mt-1 w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm text-foreground outline-none focus:border-primary"
              data-testid={`setting-${key}`}
            />
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-muted-foreground" /><h3 className="font-semibold text-foreground">Rate Limiting</h3></div>
        <div>
          <label className="text-xs text-muted-foreground">Global API rate limit (requests per minute per key)</label>
          <input type="number" value={settings.rateLimit} onChange={e => setSettings(s => ({ ...s, rateLimit: e.target.value }))} className="mt-1 w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm text-foreground outline-none focus:border-primary" />
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2"><Bell className="w-4 h-4 text-muted-foreground" /><h3 className="font-semibold text-foreground">Alerts</h3></div>
        <div>
          <label className="text-xs text-muted-foreground">Admin alert email</label>
          <input type="email" value={settings.alertEmail} onChange={e => setSettings(s => ({ ...s, alertEmail: e.target.value }))} className="mt-1 w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm text-foreground outline-none focus:border-primary" />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Maintenance Mode</p>
            <p className="text-xs text-muted-foreground">Temporarily disable all API access except admin</p>
          </div>
          <button
            onClick={() => setSettings(s => ({ ...s, maintenanceMode: !s.maintenanceMode }))}
            className={`relative w-10 rounded-full transition-colors ${settings.maintenanceMode ? "bg-destructive" : "bg-muted"}`}
            style={{ height: 22 }}
            data-testid="maintenance-mode"
          >
            <div className="absolute bg-white rounded-full shadow transition-transform" style={{ width: 18, height: 18, top: 2, left: settings.maintenanceMode ? "calc(100% - 20px)" : 2 }} />
          </button>
        </div>
      </div>

      <button onClick={save} className="px-6 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:opacity-90" data-testid="save-admin-settings">
        Save Settings
      </button>
    </div>
  );
}
