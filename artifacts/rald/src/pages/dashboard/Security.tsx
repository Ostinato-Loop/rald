import { useState } from "react";
import {
  Shield,
  Smartphone,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
} from "lucide-react";

const MOCK_LOGIN_HISTORY = [
  {
    id: 1,
    device: "iPhone 14 Pro",
    browser: "Safari",
    location: "Lagos, NG",
    ip: "197.210.x.x",
    time: "Just now",
    status: "success",
  },
  {
    id: 2,
    device: "MacBook Pro",
    browser: "Chrome",
    location: "Lagos, NG",
    ip: "197.210.x.x",
    time: "2 hr ago",
    status: "success",
  },
  {
    id: 3,
    device: "Unknown Device",
    browser: "Firefox",
    location: "London, UK",
    ip: "82.33.x.x",
    time: "1 day ago",
    status: "failed",
  },
  {
    id: 4,
    device: "Samsung Galaxy",
    browser: "Chrome",
    location: "Abuja, NG",
    ip: "105.112.x.x",
    time: "3 days ago",
    status: "success",
  },
];

export default function Security() {
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Security</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your account security settings and login history
        </p>
      </div>

      {/* Security status */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-foreground">Security Status</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              icon: Shield,
              label: "OTP Authentication",
              status: "Enabled",
              ok: true,
            },
            {
              icon: Smartphone,
              label: "MFA",
              status: "Not enabled",
              ok: false,
            },
            {
              icon: CheckCircle,
              label: "Account Status",
              status: "Verified",
              ok: true,
            },
          ].map(({ icon: Icon, label, status, ok }) => (
            <div
              key={label}
              className={`p-3 rounded-lg border ${ok ? "border-green-500/20 bg-green-500/5" : "border-yellow-500/20 bg-yellow-500/5"}`}
              data-testid={`security-${label.toLowerCase().replace(/\s/g, "-")}`}
            >
              <Icon
                className={`w-4 h-4 mb-2 ${ok ? "text-green-500" : "text-yellow-500"}`}
              />
              <p className="text-xs font-medium text-foreground">{label}</p>
              <p
                className={`text-xs ${ok ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"}`}
              >
                {status}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Password */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Password</h3>
          <button
            onClick={() => setShowPasswordForm(!showPasswordForm)}
            className="text-xs text-primary hover:underline"
            data-testid="change-password"
          >
            {showPasswordForm ? "Cancel" : "Change password"}
          </button>
        </div>
        {!showPasswordForm ? (
          <p className="text-sm text-muted-foreground">
            Your password was last changed 30 days ago
          </p>
        ) : (
          <div className="space-y-3">
            {[
              {
                label: "Current password",
                show: showOld,
                toggle: () => setShowOld(!showOld),
                test: "current-password",
              },
              {
                label: "New password",
                show: showNew,
                toggle: () => setShowNew(!showNew),
                test: "new-password",
              },
            ].map(({ label, show, toggle, test }) => (
              <div key={label} className="relative">
                <input
                  type={show ? "text" : "password"}
                  placeholder={label}
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary pr-10"
                  data-testid={test}
                />
                <button
                  type="button"
                  onClick={toggle}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {show ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
            <button
              className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90"
              data-testid="save-password"
            >
              Update password
            </button>
          </div>
        )}
      </div>

      {/* Login history */}
      <div className="bg-card border border-border rounded-xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="font-semibold text-foreground">Login History</h3>
          <span className="text-xs text-muted-foreground">Last 30 days</span>
        </div>
        <div className="divide-y divide-border">
          {MOCK_LOGIN_HISTORY.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-3 px-5 py-4"
              data-testid={`login-history-${log.id}`}
            >
              <div
                className={`w-2 h-2 rounded-full mt-2 shrink-0 ${log.status === "success" ? "bg-green-500" : "bg-red-500"}`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {log.device} · {log.browser}
                </p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                    <MapPin className="w-3 h-3" />
                    {log.location}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {log.ip}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p
                  className={`text-xs font-medium ${log.status === "success" ? "text-green-500" : "text-red-500"}`}
                >
                  {log.status === "success" ? "Success" : "Failed"}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3" />
                  {log.time}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
