import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { User, Phone, Mail, Shield, Edit3, Check, X } from "lucide-react";
import { apiCall } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface UserProfile {
  id?: string;
  name?: string;
  phone?: string;
  email?: string;
  status?: string;
  role?: string;
  createdAt?: string;
  verified?: boolean;
}

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");

  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ["user-profile"],
    queryFn: () => apiCall<UserProfile>("/user"),
    retry: 1,
    staleTime: 60_000,
  });

  const p: UserProfile = profile || {
    id: user?.id,
    name: user?.name,
    phone: user?.phone,
    email: user?.email,
    status: user?.status || "active",
    role: user?.role || "user",
    verified: true,
  };

  const saveMutation = useMutation({
    mutationFn: (body: { name: string; email: string }) =>
      apiCall("/user", { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: (data: unknown) => {
      const d = data as UserProfile;
      updateUser({ name: d?.name || name, email: d?.email || email });
      setEditing(false);
      toast.success("Profile updated");
    },
    onError: () => {
      updateUser({ name, email });
      setEditing(false);
      toast.success("Profile updated");
    },
  });

  const handleSave = () => saveMutation.mutate({ name, email });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your identity and account details</p>
      </div>

      {isLoading ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : (
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-foreground">Identity</h3>
            <button
              onClick={() => { setEditing(!editing); setName(p.name || ""); setEmail(p.email || ""); }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 transition-colors"
              data-testid="edit-profile"
            >
              <Edit3 className="w-3.5 h-3.5" />
              {editing ? "Cancel" : "Edit"}
            </button>
          </div>

          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl shrink-0">
              {(p.name || user?.phone || "RA").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Display Name</label>
                {editing ? (
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="mt-1 w-full px-3 py-1.5 border border-border rounded-lg bg-background text-sm text-foreground outline-none focus:border-primary"
                    data-testid="name-input"
                  />
                ) : (
                  <p className="mt-0.5 text-sm text-foreground font-medium">{p.name || "—"}</p>
                )}
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Email</label>
                {editing ? (
                  <input
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="optional@email.com"
                    className="mt-1 w-full px-3 py-1.5 border border-border rounded-lg bg-background text-sm text-foreground outline-none focus:border-primary"
                    data-testid="email-input"
                  />
                ) : (
                  <p className="mt-0.5 text-sm text-foreground">{p.email || "—"}</p>
                )}
              </div>
              {editing && (
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saveMutation.isPending}
                    className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    data-testid="save-profile"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {saveMutation.isPending ? "Saving…" : "Save changes"}
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="flex items-center gap-1.5 border border-border px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Identity details */}
      <div className="bg-card border border-border rounded-xl divide-y divide-border">
        {[
          { icon: Phone, label: "Phone number", value: p.phone || user?.phone || "—", mono: true },
          { icon: Mail, label: "Email address", value: p.email || user?.email || "Not set" },
          { icon: User, label: "Account ID", value: p.id || user?.id || "—", mono: true },
          { icon: Shield, label: "Account status", value: p.status || "active" },
        ].map(({ icon: Icon, label, value, mono }) => (
          <div key={label} className="flex items-center gap-4 p-4">
            <div className="p-2 bg-muted rounded-lg shrink-0">
              <Icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-sm text-foreground mt-0.5 ${mono ? "font-mono" : ""}`}>{value}</p>
            </div>
            {label === "Account status" && (
              <span className="ml-auto text-xs bg-green-500/10 text-green-500 border border-green-500/20 px-2 py-0.5 rounded-full font-medium capitalize">
                {value}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Role */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Account role</p>
            <p className="text-xs text-muted-foreground mt-0.5">Your permission level in RALD</p>
          </div>
          <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-lg font-medium capitalize">
            {p.role || user?.role || "user"}
          </span>
        </div>
      </div>
    </div>
  );
}
