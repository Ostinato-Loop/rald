// RALD Control Center — Real-Time Endpoint Health Dashboard
// Polls all RALD-ecosystem endpoints every 30 seconds.
// LILCKY STUDIO LIMITED
import { useState, useEffect, useRef, useCallback } from "react";
import { Activity, AlertCircle, CheckCircle2, Clock, RefreshCw, Wifi, WifiOff } from "lucide-react";

// ── Endpoint registry ─────────────────────────────────────────────────────────
interface Endpoint {
  id: string;
  label: string;
  product: string;
  url: string;
  method?: "GET" | "HEAD";
  expectStatus?: number;
}

const ENDPOINTS: Endpoint[] = [
  { id: "api-health",     label: "API Worker",         product: "Core",       url: "https://api.rald.cloud/api/health",       method: "GET" },
  { id: "api-ready",      label: "API Ready",          product: "Core",       url: "https://api.rald.cloud/api/ready",        method: "GET" },
  { id: "identity",       label: "Identity (Profiles)", product: "Auth",      url: "https://profiles.rald.cloud",             method: "HEAD" },
  { id: "credentials",    label: "Developer Portal",   product: "Auth",       url: "https://credentials.rald.cloud",          method: "HEAD" },
  { id: "control",        label: "Control Center",     product: "Ops",        url: "https://control.rald.cloud",              method: "HEAD" },
  { id: "rald-cloud",     label: "Marketing (rald.cloud)", product: "Web",    url: "https://rald.cloud",                      method: "HEAD" },
  { id: "loop",           label: "Loop Commerce",      product: "Loop",       url: "https://loop.rald.cloud",                 method: "HEAD" },
  { id: "messenger",      label: "Loop Messenger",     product: "Messenger",  url: "https://messenger.rald.cloud",            method: "HEAD" },
  { id: "payrald",        label: "PayRald",            product: "Payments",   url: "https://payrald.rald.cloud",              method: "HEAD" },
  { id: "raldtics",       label: "Raldtics",           product: "Analytics",  url: "https://raldtics.rald.cloud",             method: "HEAD" },
];

// ── Types ─────────────────────────────────────────────────────────────────────
type CheckStatus = "up" | "down" | "degraded" | "pending";

interface CheckResult {
  status: CheckStatus;
  statusCode?: number;
  responseTimeMs?: number;
  error?: string;
  checkedAt: string;
}

interface EndpointState {
  id: string;
  current: CheckResult;
  history: CheckResult[];   // last 20 checks
}

const POLL_INTERVAL_MS = 30_000;
const TIMEOUT_MS       = 8_000;
const HISTORY_LIMIT    = 20;

// ── Probe function ────────────────────────────────────────────────────────────
async function probe(ep: Endpoint): Promise<CheckResult> {
  const checkedAt = new Date().toISOString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const t0 = performance.now();
  try {
    const res = await fetch(ep.url, {
      method: ep.method ?? "GET",
      signal: controller.signal,
      cache: "no-store",
      mode: "no-cors",   // avoids CORS failures for HEAD probes
    });
    clearTimeout(timer);
    const ms = Math.round(performance.now() - t0);
    // With mode:no-cors the status is 0 (opaque) but the request succeeded
    const ok = res.ok || res.type === "opaque";
    return {
      status: ms > 3000 ? "degraded" : (ok ? "up" : "down"),
      statusCode: res.status,
      responseTimeMs: ms,
      checkedAt,
    };
  } catch (err: unknown) {
    clearTimeout(timer);
    const ms = Math.round(performance.now() - t0);
    const isTimeout = (err as Error).name === "AbortError";
    return {
      status: "down",
      responseTimeMs: isTimeout ? TIMEOUT_MS : ms,
      error: isTimeout ? "Timeout" : (err as Error).message,
      checkedAt,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const PENDING_RESULT: CheckResult = { status: "pending", checkedAt: new Date().toISOString() };

function statusColor(s: CheckStatus) {
  if (s === "up")      return "text-primary border-primary/30 bg-primary/10";
  if (s === "degraded") return "text-yellow-400 border-yellow-400/30 bg-yellow-400/10";
  if (s === "down")    return "text-destructive border-destructive/30 bg-destructive/10";
  return "text-muted-foreground border-border bg-muted/30";
}

function statusDot(s: CheckStatus) {
  if (s === "up")       return "bg-primary";
  if (s === "degraded") return "bg-yellow-400";
  if (s === "down")     return "bg-destructive";
  return "bg-muted-foreground";
}

function StatusIcon({ status }: { status: CheckStatus }) {
  if (status === "up")       return <CheckCircle2 className="w-4 h-4 text-primary" />;
  if (status === "degraded") return <AlertCircle  className="w-4 h-4 text-yellow-400" />;
  if (status === "down")     return <WifiOff      className="w-4 h-4 text-destructive" />;
  return <Wifi className="w-4 h-4 text-muted-foreground animate-pulse" />;
}

function HistoryBar({ history }: { history: CheckResult[] }) {
  const slots = 20;
  const padded = Array.from({ length: slots }, (_, i) => history[history.length - slots + i]);
  return (
    <div className="flex gap-0.5 items-end h-5">
      {padded.map((r, i) => {
        if (!r) return <div key={i} className="w-1.5 h-1 bg-muted/30 rounded-sm" />;
        const h = r.responseTimeMs ? Math.min(20, Math.max(4, Math.round(r.responseTimeMs / 150))) : 4;
        return (
          <div
            key={i}
            title={`${r.status} · ${r.responseTimeMs ?? "?"}ms · ${new Date(r.checkedAt).toLocaleTimeString()}`}
            style={{ height: h }}
            className={`w-1.5 rounded-sm ${statusDot(r.status)} opacity-80`}
          />
        );
      })}
    </div>
  );
}

function fmt(ms?: number) {
  if (ms == null) return "—";
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

function timeAgo(iso: string) {
  const secs = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 5)  return "just now";
  if (secs < 60) return `${secs}s ago`;
  return `${Math.round(secs / 60)}m ago`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Health() {
  const [states, setStates] = useState<Map<string, EndpointState>>(() => {
    const m = new Map<string, EndpointState>();
    ENDPOINTS.forEach(ep => m.set(ep.id, { id: ep.id, current: PENDING_RESULT, history: [] }));
    return m;
  });
  const [lastSweep, setLastSweep] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const sweepRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sweep = useCallback(async () => {
    setRunning(true);
    const results = await Promise.allSettled(ENDPOINTS.map(ep => probe(ep)));
    setStates(prev => {
      const next = new Map(prev);
      ENDPOINTS.forEach((ep, i) => {
        const res = results[i];
        const result: CheckResult = res.status === "fulfilled"
          ? res.value
          : { status: "down", error: "Probe failed", checkedAt: new Date().toISOString() };
        const existing = next.get(ep.id)!;
        next.set(ep.id, {
          id: ep.id,
          current: result,
          history: [...existing.history, result].slice(-HISTORY_LIMIT),
        });
      });
      return next;
    });
    setLastSweep(new Date().toISOString());
    setRunning(false);
    setCountdown(POLL_INTERVAL_MS / 1000);
  }, []);

  // Initial sweep + polling
  useEffect(() => {
    sweep();
    const interval = setInterval(sweep, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [sweep]);

  // Countdown ticker
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // Aggregate stats
  const allStates = Array.from(states.values());
  const upCount       = allStates.filter(s => s.current.status === "up").length;
  const degradedCount = allStates.filter(s => s.current.status === "degraded").length;
  const downCount     = allStates.filter(s => s.current.status === "down").length;
  const avgResponseMs = (() => {
    const times = allStates.map(s => s.current.responseTimeMs).filter(Boolean) as number[];
    return times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null;
  })();

  const overallStatus: CheckStatus =
    downCount     > 0 ? "down"     :
    degradedCount > 0 ? "degraded" :
    upCount       > 0 ? "up"       : "pending";

  // Group by product
  const groups = ENDPOINTS.reduce<Record<string, Endpoint[]>>((acc, ep) => {
    acc[ep.product] = acc[ep.product] ?? [];
    acc[ep.product].push(ep);
    return acc;
  }, {});

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-widest text-foreground">Endpoint Health</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live probe of {ENDPOINTS.length} endpoints · refreshes every {POLL_INTERVAL_MS / 1000}s
          </p>
        </div>
        <button
          onClick={sweep}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${running ? "animate-spin" : ""}`} />
          {running ? "Checking…" : countdown > 0 ? `Next in ${countdown}s` : "Refresh"}
        </button>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Overall", value: overallStatus.toUpperCase(), status: overallStatus, icon: Activity },
          { label: "Up",      value: `${upCount} / ${ENDPOINTS.length}`,  status: "up"      as CheckStatus, icon: CheckCircle2 },
          { label: "Degraded",value: String(degradedCount), status: "degraded" as CheckStatus, icon: AlertCircle },
          { label: "Avg Latency", value: avgResponseMs != null ? fmt(avgResponseMs) : "—", status: overallStatus, icon: Clock },
        ].map(({ label, value, status, icon: Icon }) => (
          <div key={label} className="border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{label}</span>
              <Icon className={`w-4 h-4 ${status === "up" ? "text-primary" : status === "degraded" ? "text-yellow-400" : status === "down" ? "text-destructive" : "text-muted-foreground"}`} />
            </div>
            <div className="text-2xl font-bold text-foreground">{value}</div>
            {lastSweep && <div className="text-xs text-muted-foreground mt-1">{timeAgo(lastSweep)}</div>}
          </div>
        ))}
      </div>

      {/* Endpoint groups */}
      {Object.entries(groups).map(([product, eps]) => (
        <div key={product}>
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">{product}</h2>
          <div className="border border-border divide-y divide-border">
            {eps.map(ep => {
              const s = states.get(ep.id)!;
              return (
                <div key={ep.id} className="flex items-center gap-4 px-4 py-3.5">

                  {/* Status icon */}
                  <StatusIcon status={s.current.status} />

                  {/* Endpoint info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{ep.label}</span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${statusColor(s.current.status)}`}>
                        {s.current.status}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono truncate mt-0.5">{ep.url}</div>
                  </div>

                  {/* Latency */}
                  <div className="text-right w-16">
                    <div className="text-sm font-mono text-foreground">{fmt(s.current.responseTimeMs)}</div>
                    <div className="text-[10px] text-muted-foreground">latency</div>
                  </div>

                  {/* History sparkbar */}
                  <div className="w-32 flex flex-col items-end gap-1">
                    <HistoryBar history={s.history} />
                    <span className="text-[10px] text-muted-foreground">last {s.history.length} checks</span>
                  </div>

                  {/* Last checked */}
                  <div className="text-xs text-muted-foreground w-20 text-right">
                    {timeAgo(s.current.checkedAt)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Incident log */}
      {(() => {
        const incidents = allStates
          .flatMap(s => s.history.filter(h => h.status !== "up" && h.status !== "pending")
            .map(h => ({ ...h, endpointId: s.id })))
          .sort((a, b) => new Date(b.checkedAt).getTime() - new Date(a.checkedAt).getTime())
          .slice(0, 10);

        if (incidents.length === 0) return null;
        return (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Incident Log</h2>
            <div className="border border-border divide-y divide-border">
              {incidents.map((inc, i) => {
                const ep = ENDPOINTS.find(e => e.id === inc.endpointId);
                return (
                  <div key={i} className="flex items-center gap-4 px-4 py-3">
                    <AlertCircle className={`w-4 h-4 flex-shrink-0 ${inc.status === "degraded" ? "text-yellow-400" : "text-destructive"}`} />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-foreground">{ep?.label ?? inc.endpointId}</span>
                      {inc.error && <span className="ml-2 text-xs text-muted-foreground">— {inc.error}</span>}
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${statusColor(inc.status)}`}>
                      {inc.status}
                    </span>
                    <span className="text-xs text-muted-foreground w-20 text-right">{timeAgo(inc.checkedAt)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

    </div>
  );
}
