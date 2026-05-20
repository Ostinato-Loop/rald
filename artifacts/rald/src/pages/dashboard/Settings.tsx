import { useState } from "react";
import { Bell, Shield, Globe, Trash2, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme";
import { toast } from "sonner";

export default function Settings() {
  const { logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState({
    login: true,
    security: true,
    wallet: true,
    marketing: false,
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your account preferences
        </p>
      </div>

      {/* Appearance */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-foreground">Appearance</h3>
        <div className="grid grid-cols-2 gap-2">
          {(["light", "dark"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`flex items-center gap-2 p-3 rounded-lg border transition-colors capitalize ${theme === t ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
              data-testid={`theme-${t}`}
            >
              <div
                className={`w-4 h-4 rounded-full border-2 ${t === "light" ? "bg-white border-gray-300" : "bg-gray-900 border-gray-600"}`}
              />
              <span className="text-sm font-medium">{t} mode</span>
            </button>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Notifications</h3>
        </div>
        <div className="space-y-3">
          {(
            Object.entries(notifications) as [
              keyof typeof notifications,
              boolean,
            ][]
          ).map(([key, val]) => (
            <div
              key={key}
              className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
            >
              <div>
                <p className="text-sm font-medium text-foreground capitalize">
                  {key === "marketing"
                    ? "Marketing updates"
                    : `${key.charAt(0).toUpperCase() + key.slice(1)} alerts`}
                </p>
                <p className="text-xs text-muted-foreground">
                  Receive notifications for {key} activity
                </p>
              </div>
              <button
                onClick={() => setNotifications((n) => ({ ...n, [key]: !val }))}
                className={`relative w-10 h-5.5 rounded-full transition-colors ${val ? "bg-primary" : "bg-muted"}`}
                data-testid={`notification-${key}`}
              >
                <div
                  className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform ${val ? "translate-x-5" : "translate-x-0.5"}`}
                  style={{ width: 18, height: 18, top: 1.5 }}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Security prefs */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">
            Security Preferences
          </h3>
        </div>
        <div className="space-y-3">
          {[
            {
              label: "Auto-logout after 30 days",
              desc: "Automatically end inactive sessions",
            },
            {
              label: "Login notifications",
              desc: "Get alerted on new device logins",
            },
          ].map(({ label, desc }) => (
            <div key={label} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <button
                className="relative w-10 rounded-full bg-primary transition-colors"
                style={{ height: 22 }}
                data-testid={`pref-${label.replace(/\s/g, "-").toLowerCase()}`}
              >
                <div
                  className="absolute bg-white rounded-full shadow"
                  style={{ width: 18, height: 18, top: 2, right: 2 }}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-card border border-destructive/20 rounded-xl p-5 space-y-3">
        <h3 className="font-semibold text-destructive">Danger Zone</h3>
        <div className="space-y-2">
          <button
            onClick={() => {
              logout();
            }}
            className="w-full flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm text-foreground hover:bg-muted transition-colors"
            data-testid="logout-all"
          >
            <LogOut className="w-4 h-4" />
            Sign out of all devices
          </button>
          <button
            onClick={() =>
              toast.error("Contact support to delete your account")
            }
            className="w-full flex items-center gap-2 px-4 py-2.5 border border-destructive/30 rounded-lg text-sm text-destructive hover:bg-destructive/5 transition-colors"
            data-testid="delete-account"
          >
            <Trash2 className="w-4 h-4" />
            Delete account
          </button>
        </div>
      </div>
    </div>
  );
}
