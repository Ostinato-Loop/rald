import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { User, Phone, Mail, Shield, MonitorSmartphone, Edit3, Check, X } from "lucide-react";
import { motion } from "framer-motion";

export default function Profile() {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your identity and account details</p>
      </div>

      {/* Avatar + identity */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-foreground">Identity</h3>
          <button
            onClick={() => setEditing(!editing)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 transition-colors"
            data-testid="edit-profile"
          >
            <Edit3 className="w-3.5 h-3.5" />
            {editing ? "Cancel" : "Edit"}
          </button>
        </div>

        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl shrink-0">
            {(user?.name || "RA").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Display Name</label>
              {editing ? (
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-border rounded-lg bg-background text-sm text-foreground outline-none focus:border-primary"
                  data-testid="name-input"
                />
              ) : (
                <p className="mt-1 text-sm font-medium text-foreground">{user?.name || "Not set"}</p>
              )}
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Email</label>
              {editing ? (
                <input
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  type="email"
                  placeholder="Add email address"
                  className="mt-1 w-full px-3 py-2 border border-border rounded-lg bg-background text-sm text-foreground outline-none focus:border-primary"
                  data-testid="email-input"
                />
              ) : (
                <p className="mt-1 text-sm text-foreground">{user?.email || <span className="text-muted-foreground">Not set</span>}</p>
              )}
            </div>
            {editing && (
              <div className="flex gap-2">
                <button onClick={handleSave} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90" data-testid="save-profile">
                  <Check className="w-3.5 h-3.5" /> Save
                </button>
                <button onClick={() => setEditing(false)} className="flex items-center gap-1.5 px-4 py-2 border border-border text-foreground text-sm rounded-lg hover:bg-muted" data-testid="cancel-edit">
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
              </div>
            )}
            {saved && <p className="text-sm text-green-500 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Changes saved</p>}
          </div>
        </div>
      </div>

      {/* Primary identity */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h3 className="font-semibold text-foreground">Primary Identity</h3>
        <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Phone className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">{user?.phone || "+2348012345678"}</p>
            <p className="text-xs text-muted-foreground">Phone number · Primary identity</p>
          </div>
          <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/40 px-2 py-1 rounded-full">
            <Shield className="w-3 h-3" />
            <span>Verified</span>
          </div>
        </div>
      </div>

      {/* Account info */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h3 className="font-semibold text-foreground">Account Information</h3>
        <div className="space-y-3">
          {[
            { label: "Account ID", value: user?.id || "rald_usr_demo", mono: true },
            { label: "Account Status", value: "Active" },
            { label: "Role", value: user?.role || "User" },
            { label: "Member since", value: "May 2026" },
            { label: "Last login", value: "Just now" },
          ].map(({ label, value, mono }) => (
            <div key={label} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
              <span className="text-sm text-muted-foreground">{label}</span>
              <span className={`text-sm font-medium text-foreground ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
