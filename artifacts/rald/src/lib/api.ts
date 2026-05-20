/**
 * RALD API client
 * API_BASE is empty in dev so Vite proxies /api → backend.
 * In production set VITE_API_URL to your Cloudflare Worker URL.
 */
export const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "";

function getToken(): string | null {
  try {
    const stored = localStorage.getItem("rald_user");
    if (!stored) return null;
    const user = JSON.parse(stored);
    return user?.token || user?.access_token || null;
  } catch {
    return null;
  }
}

export async function apiCall<T = unknown>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const token = getToken();
  const rawHeaders =
    options?.headers instanceof Headers
      ? Array.from(options.headers.entries()).reduce<Record<string, string>>(
          (acc, [k, v]) => { acc[k] = v; return acc; },
          {},
        )
      : typeof options?.headers === "object" && options.headers !== null
        ? (options.headers as Record<string, string>)
        : {};

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...rawHeaders,
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...options,
    headers,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => `HTTP ${res.status}`);
    throw new ApiError(res.status, text);
  }

  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json() as Promise<T>;
  return (await res.text()) as unknown as T;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

export const fmt = {
  ngn: (n: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 2,
    }).format(n),
  date: (s: string) =>
    new Date(s).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" }),
  phone: (p: string) =>
    p.replace(/^(\+234)(\d{3})(\d{3})(\d{4})$/, "$1 $2 $3 $4"),
};
