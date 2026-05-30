import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { orgApi, type Org } from "@/lib/api";
import { getUser } from "@/lib/auth";

function CreateOrgModal({ onClose, onCreate }: { onClose: () => void; onCreate: (o: Org) => void }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    if (!name.trim()) { setErr("Organization name is required"); return; }
    setBusy(true); setErr("");
    try {
      const org = await orgApi.create(name.trim());
      onCreate(org);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to create organization");
    } finally { setBusy(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <div className="modal-title">Create Organization</div>
        <div className="modal-sub">Organizations let you group API keys and collaborate with your team.</div>
        <div style={{ marginBottom: 16 }}>
          <label className="label">Organization name</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. Acme Corp" autoFocus onKeyDown={e => e.key === "Enter" && submit()} />
        </div>
        {err && <div className="error-box">{err}</div>}
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={submit} disabled={busy}>
            {busy ? "Creating…" : "Create organization"}
          </button>
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function Organization() {
  const user = getUser();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    orgApi.list()
      .then(os => { setOrgs(os); if (os.length) setActive(os[0]!.id); })
      .catch(() => setErr("Could not load organizations"))
      .finally(() => setLoading(false));
  }, []);

  const activeOrg = orgs.find(o => o.id === active);

  const handleCreate = (org: Org) => {
    setOrgs(prev => [...prev, org]);
    setActive(org.id);
    setShowCreate(false);
  };

  return (
    <Layout
      title="Organization"
      subtitle="Switch between organizations and manage team access."
      action={<button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Organization</button>}
    >
      {err && <div className="error-box">{err}</div>}

      {loading ? (
        <div style={{ color: "var(--text-muted)" }}>Loading…</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 16 }}>

          {/* Org list */}
          <div>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
              Organizations
            </div>
            {orgs.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: 20 }}>
                <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: 12 }}>No organizations yet</div>
                <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>Create one</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>

                {/* Personal workspace */}
                <button
                  onClick={() => setActive(null)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid", cursor: "pointer", textAlign: "left", background: active === null ? "var(--teal-dim)" : "var(--bg-card)", borderColor: active === null ? "var(--teal)" : "var(--border)", color: active === null ? "var(--teal)" : "var(--text)", transition: "all 0.12s" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--teal-dim)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700, color: "var(--teal)", flexShrink: 0 }}>
                    {(user?.name ?? user?.email ?? "P").slice(0, 1).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Personal</div>
                    <div style={{ fontSize: "0.65rem", color: active === null ? "var(--teal)" : "var(--text-muted)" }}>{user?.email}</div>
                  </div>
                </button>

                {orgs.map(org => (
                  <button key={org.id}
                    onClick={() => setActive(org.id)}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid", cursor: "pointer", textAlign: "left", background: active === org.id ? "var(--teal-dim)" : "var(--bg-card)", borderColor: active === org.id ? "var(--teal)" : "var(--border)", color: active === org.id ? "var(--teal)" : "var(--text)", transition: "all 0.12s" }}>
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: "var(--bg-raised)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 800, flexShrink: 0 }}>
                      {org.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "0.8rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{org.name}</div>
                      {org.plan && <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>{org.plan} plan</div>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Org details */}
          <div>
            {active === null ? (
              <PersonalWorkspace user={user} />
            ) : activeOrg ? (
              <OrgDetails org={activeOrg} />
            ) : null}
          </div>
        </div>
      )}

      {showCreate && <CreateOrgModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
    </Layout>
  );
}

function PersonalWorkspace({ user }: { user: ReturnType<typeof getUser> }) {
  return (
    <div className="card">
      <div className="section-title">Personal Workspace</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
        <InfoRow label="Name"    value={user?.name ?? "—"} />
        <InfoRow label="Email"   value={user?.email ?? "—"} />
        <InfoRow label="RALD ID" value={user?.raldId ?? "—"} mono accent />
        <InfoRow label="Role"    value={user?.role ?? "—"} />
      </div>
      <div className="separator" />
      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
        Personal workspace API keys are scoped to your individual account. Create an organization to collaborate with your team.
      </div>
    </div>
  );
}

function OrgDetails({ org }: { org: Org }) {
  return (
    <div className="card">
      <div className="section-title">{org.name}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
        <InfoRow label="Organization ID" value={org.id} mono />
        <InfoRow label="Slug"            value={org.slug} mono />
        <InfoRow label="Plan"            value={org.plan ?? "Free"} />
        <InfoRow label="Created"         value={new Date(org.created_at).toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" })} />
      </div>
      <div className="separator" />
      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
        Organization member management and role-based access control coming soon.
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono, accent }: { label: string; value: string; mono?: boolean; accent?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", flexShrink: 0 }}>{label}</span>
      <span className={mono ? "mono" : ""} style={{ fontSize: "0.8rem", color: accent ? "var(--teal)" : "var(--text)", marginLeft: 16, textAlign: "right" }}>
        {value}
      </span>
    </div>
  );
}
