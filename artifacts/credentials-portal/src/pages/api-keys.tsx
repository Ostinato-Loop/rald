import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/layout";
import { apiKeysApi, type ApiKey, type ApiKeyCreated } from "@/lib/api";

const SCOPES = ["read", "write", "admin", "webhook", "pay", "identity"];

// ── Key created modal ─────────────────────────────────────────────────────────
function KeyRevealModal({ keyData, onClose }: { keyData: ApiKeyCreated; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(keyData.key).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">API Key Created</div>
        <div className="modal-sub">Copy your key now. It will <strong>never</strong> be shown again.</div>
        <div className="warning-box">⚠ Store this key in a secrets manager. Anyone with this key can authenticate as you.</div>
        <div className="key-box">{keyData.key}</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={copy}>
            {copied ? "✓ Copied!" : "Copy key"}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
          Name: <strong style={{ color: "var(--text)" }}>{keyData.name}</strong> ·
          Env: <span className={`badge badge-${keyData.environment}`}>{keyData.environment}</span>
        </div>
      </div>
    </div>
  );
}

// ── Create key modal ──────────────────────────────────────────────────────────
function CreateModal({ onClose, onCreate }: { onClose: () => void; onCreate: (k: ApiKeyCreated) => void }) {
  const [name, setName] = useState("");
  const [env, setEnv] = useState<"live" | "test">("live");
  const [scopes, setScopes] = useState<string[]>(["read"]);
  const [expiresAt, setExpiresAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const toggleScope = (s: string) => setScopes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const submit = async () => {
    if (!name.trim()) { setErr("Name is required"); return; }
    setBusy(true); setErr("");
    try {
      const key = await apiKeysApi.create({ name, environment: env, scopes, expiresAt: expiresAt || undefined });
      onCreate(key);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to create key");
    } finally { setBusy(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Create API Key</div>
        <div className="modal-sub">Keys are scoped to your account and environment.</div>

        <div style={{ marginBottom: 12 }}>
          <label className="label">Key name</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Production backend" autoFocus />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label className="label">Environment</label>
          <div className="env-toggle">
            <button className={env === "live" ? "active-live" : ""} onClick={() => setEnv("live")}>Live</button>
            <button className={env === "test" ? "active-test" : ""} onClick={() => setEnv("test")}>Test</button>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label className="label">Scopes</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {SCOPES.map(s => (
              <button key={s} onClick={() => toggleScope(s)}
                style={{ padding: "4px 10px", borderRadius: 99, fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", border: "1px solid", transition: "all 0.12s",
                  background: scopes.includes(s) ? "var(--teal-dim)" : "transparent",
                  color: scopes.includes(s) ? "var(--teal)" : "var(--text-muted)",
                  borderColor: scopes.includes(s) ? "var(--teal)" : "var(--border)" }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="label">Expires (optional)</label>
          <input className="input" type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)}
            min={new Date().toISOString().split("T")[0]} />
        </div>

        {err && <div className="error-box">{err}</div>}

        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={submit} disabled={busy}>
            {busy ? "Creating…" : "Create key"}
          </button>
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Confirm modal (revoke / rotate) ──────────────────────────────────────────
function ConfirmModal({
  title, message, confirmLabel, danger,
  onConfirm, onCancel, busy,
}: { title: string; message: string; confirmLabel: string; danger?: boolean; onConfirm: () => void; onCancel: () => void; busy: boolean }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
        <div className="modal-title">{title}</div>
        <div className="modal-sub" style={{ marginBottom: 20 }}>{message}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className={`btn ${danger ? "btn-danger" : "btn-primary"}`} style={{ flex: 1 }} onClick={onConfirm} disabled={busy}>
            {busy ? "Working…" : confirmLabel}
          </button>
          <button className="btn btn-ghost" onClick={onCancel} disabled={busy}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ApiKeys() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [revealKey, setRevealKey] = useState<ApiKeyCreated | null>(null);
  const [confirm, setConfirm] = useState<{ type: "revoke" | "rotate"; id: string; name: string } | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [err, setErr] = useState("");
  const [envFilter, setEnvFilter] = useState<"all" | "live" | "test">("all");

  const load = useCallback(async () => {
    try {
      const ks = await apiKeysApi.list();
      setKeys(ks);
    } catch { setErr("Failed to load API keys"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = (key: ApiKeyCreated) => {
    setShowCreate(false);
    setRevealKey(key);
    load();
  };

  const handleRevoke = async () => {
    if (!confirm) return;
    setActionBusy(true);
    try {
      await apiKeysApi.revoke(confirm.id);
      setConfirm(null);
      load();
    } catch { setErr("Failed to revoke key"); }
    finally { setActionBusy(false); }
  };

  const handleRotate = async () => {
    if (!confirm) return;
    setActionBusy(true);
    try {
      const newKey = await apiKeysApi.rotate(confirm.id);
      setConfirm(null);
      setRevealKey(newKey);
      load();
    } catch { setErr("Failed to rotate key"); }
    finally { setActionBusy(false); }
  };

  const filtered = envFilter === "all" ? keys : keys.filter(k => k.environment === envFilter);

  const formatScopes = (s: string | string[]) => {
    const arr = Array.isArray(s) ? s : (typeof s === "string" ? JSON.parse(s || "[]") : []);
    return arr.slice(0, 3).join(", ") + (arr.length > 3 ? ` +${arr.length - 3}` : "");
  };

  const formatDate = (ts: string | null) => ts ? new Date(ts).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" }) : "—";

  return (
    <Layout
      title="API Keys"
      subtitle="Create and manage API keys for RALD services."
      action={<button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New API Key</button>}
    >
      {err && <div className="error-box" style={{ marginBottom: 16 }}>{err}</div>}

      {/* Filter bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>Show:</span>
        <div className="env-toggle">
          {(["all", "live", "test"] as const).map(f => (
            <button key={f}
              className={envFilter === f ? (f === "live" ? "active-live" : f === "test" ? "active-test" : "active-live") : ""}
              onClick={() => setEnvFilter(f)}
              style={{ textTransform: "capitalize" }}>
              {f === "all" ? `All (${keys.length})` : `${f} (${keys.filter(k => k.environment === f).length})`}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🔑</div>
          <div className="title">{keys.length === 0 ? "No API keys yet" : "No keys match this filter"}</div>
          <div className="sub" style={{ marginBottom: 16 }}>Create your first key to start making authenticated requests.</div>
          {keys.length === 0 && <button className="btn btn-primary" onClick={() => setShowCreate(true)}>Create your first key</button>}
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Key prefix</th>
                <th>Env</th>
                <th>Scopes</th>
                <th>Last used</th>
                <th>Expires</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(k => (
                <tr key={k.id}>
                  <td style={{ fontWeight: 600 }}>{k.name}</td>
                  <td><code className="mono">{k.key_prefix}…</code></td>
                  <td><span className={`badge badge-${k.environment}`}>{k.environment}</span></td>
                  <td><span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>{formatScopes(k.scopes)}</span></td>
                  <td style={{ color: "var(--text-muted)" }}>{formatDate(k.last_used_at)}</td>
                  <td style={{ color: k.expires_at && new Date(k.expires_at) < new Date() ? "var(--ember)" : "var(--text-muted)" }}>
                    {formatDate(k.expires_at)}
                  </td>
                  <td style={{ color: "var(--text-muted)" }}>{formatDate(k.created_at)}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="btn btn-ghost btn-sm"
                        onClick={() => setConfirm({ type: "rotate", id: k.id, name: k.name })}>
                        Rotate
                      </button>
                      <button className="btn btn-danger btn-sm"
                        onClick={() => setConfirm({ type: "revoke", id: k.id, name: k.name })}>
                        Revoke
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}

      {revealKey && <KeyRevealModal keyData={revealKey} onClose={() => setRevealKey(null)} />}

      {confirm?.type === "revoke" && (
        <ConfirmModal
          title="Revoke API key?"
          message={`"${confirm.name}" will be permanently invalidated. Any services using this key will stop working immediately.`}
          confirmLabel="Revoke key"
          danger
          onConfirm={handleRevoke}
          onCancel={() => setConfirm(null)}
          busy={actionBusy}
        />
      )}

      {confirm?.type === "rotate" && (
        <ConfirmModal
          title="Rotate API key?"
          message={`A new key will be generated for "${confirm.name}". The old key will be revoked immediately. Update your services before closing the new key.`}
          confirmLabel="Rotate key"
          onConfirm={handleRotate}
          onCancel={() => setConfirm(null)}
          busy={actionBusy}
        />
      )}
    </Layout>
  );
}
