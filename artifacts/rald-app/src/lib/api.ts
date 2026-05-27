const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "https://api.rald.cloud";

export type UserRole = "admin" | "operator" | "viewer" | "user" | "merchant";

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  createdAt: string;
}

export interface AuthToken {
  token: string;
  user: User;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role: "user" | "merchant";
  businessName?: string;
}

async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init.headers as Record<string, string> | undefined ?? {}),
  };
  const res = await fetch(`${API_BASE}/api${path}`, { ...init, headers });
  const data = await res.json() as { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Request failed: ${res.status}`);
  return data as T;
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      apiFetch<AuthToken>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),

    register: (input: RegisterInput) =>
      apiFetch<AuthToken>("/auth/register", {
        method: "POST",
        body: JSON.stringify(input),
      }),

    me: (token: string) => apiFetch<User>("/auth/me", {}, token),
  },
};
