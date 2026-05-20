import { useState } from "react";
import { toast } from "sonner";
import { Shield, Globe, Bell } from "lucide-react";

export default function DevSettings() {
  const [ipWhitelist, setIpWhitelist] = useState(
    "197.210.0.0/16\n105.112.0.0/16",
  );
  const [rateLimit, setRateLimit] = useState("1000");
  const [saved, setSaved] = useState(false);

  const save = () => {
    setSaved(true);
    toast.success("Settings saved");
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Workspace Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          API access control and developer environment configuration
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">IP Allowlist</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          One CIDR range or IP address per line. Leave empty to allow all IPs.
        </p>
        <textarea
          value={ipWhitelist}
          onChange={(e) => setIpWhitelist(e.target.value)}
          rows={4}
          className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm font-mono text-foreground outline-none focus:border-primary resize-none"
          data-testid="ip-allowlist"
        />
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Rate Limiting</h3>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">
            Requests per minute (per API key)
          </label>
          <input
            type="number"
            value={rateLimit}
            onChange={(e) => setRateLimit(e.target.value)}
            className="mt-1 w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm text-foreground outline-none focus:border-primary"
            data-testid="rate-limit"
          />
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Alert Email</h3>
        </div>
        <input
          type="email"
          placeholder="alerts@your-company.com"
          className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm text-foreground outline-none focus:border-primary"
          data-testid="alert-email"
        />
        <p className="text-xs text-muted-foreground">
          Receive alerts for API errors, quota warnings, and security events
        </p>
      </div>

      <button
        onClick={save}
        className="px-6 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:opacity-90"
        data-testid="save-dev-settings"
      >
        {saved ? "Saved!" : "Save Settings"}
      </button>
    </div>
  );
}
