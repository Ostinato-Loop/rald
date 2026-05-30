// RALD Developer Portal — API Client
// Connects to api.rald.cloud

const BASE = "https://api.rald.cloud";

function getToken(): string | null {
  return localStorage.getItem("rald_auth_token");
}

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json as { error?: string }).error ?? `API error ${res.status}`);
  }
  return json as T;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  me: () => req<{ id: string; raldId?: string; email: string; name: string; role: string }>("/api/auth/me"),
};

// ── API Keys ──────────────────────────────────────────────────────────────────
export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string | string[];
  environment: "live" | "test";
  last_used_at: string | null;
  revoked_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface ApiKeyCreated extends ApiKey {
  key: string;
  warning: string;
}

export const apiKeysApi = {
  list: () => req<ApiKey[]>("/api/api-keys"),

  create: (body: {
    name: string;
    scopes?: string[];
    environment?: "live" | "test";
    expiresAt?: string;
    orgId?: string;
  }) =>
    req<ApiKeyCreated>("/api/api-keys", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  revoke: (id: string) =>
    req<{ message: string }>(`/api/api-keys/${id}`, { method: "DELETE" }),

  rotate: (id: string) =>
    req<ApiKeyCreated>(`/api/api-keys/${id}/rotate`, { method: "POST" }),
};

// ── Audit Logs ────────────────────────────────────────────────────────────────
export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  ip: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export const auditApi = {
  list: (limit = 50) =>
    req<AuditLog[]>(`/api/admin/audit-logs?limit=${limit}`).catch(() => [] as AuditLog[]),
};

// ── Metrics / Usage ───────────────────────────────────────────────────────────
export interface MetricPoint {
  date: string;
  requests: number;
  errors: number;
  latency_ms: number;
}

export const metricsApi = {
  summary: () =>
    req<{ totalRequests: number; totalKeys: number; errors: number; lastActivity: string | null }>(
      "/api/metrics/summary"
    ).catch(() => ({ totalRequests: 0, totalKeys: 0, errors: 0, lastActivity: null })),

  daily: () =>
    req<MetricPoint[]>("/api/metrics/daily").catch(() => [] as MetricPoint[]),
};

// ── Organizations ─────────────────────────────────────────────────────────────
export interface Org {
  id: string;
  name: string;
  slug: string;
  plan: string | null;
  created_at: string;
}

export const orgApi = {
  list: () => req<Org[]>("/api/organizations").catch(() => [] as Org[]),

  create: (name: string) =>
    req<Org>("/api/organizations", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
};
