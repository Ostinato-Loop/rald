const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "https://api.rald.cloud";

export type UserRole = "admin" | "operator" | "viewer" | "user" | "merchant";

export interface User {
  id: string;
  email: string;
  phone?: string | null;
  name: string | null;
  role: UserRole;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  createdAt: string;
}

export interface AuthToken {
  token: string;
  user: User;
}

async function apiFetch<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
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
      apiFetch<AuthToken>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

    register: (input: { name: string; email: string; password: string; phone?: string; role: "user" | "merchant"; businessName?: string }) =>
      apiFetch<AuthToken>("/auth/register", { method: "POST", body: JSON.stringify(input) }),

    me: (token: string) => apiFetch<User>("/auth/me", {}, token),

    sendOtp: (phone: string) =>
      apiFetch<{ pinId: string; message: string }>("/auth/send-otp", {
        method: "POST",
        body: JSON.stringify({ phone }),
      }),

    verifyOtp: (pinId: string, pin: string, phone: string) =>
      apiFetch<AuthToken | { newUser: true; phone: string; otpToken: string }>("/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ pinId, pin, phone }),
      }),

    registerFromOtp: (input: { otpToken: string; name: string; email: string; role: "user" | "merchant"; businessName?: string }) =>
      apiFetch<AuthToken>("/auth/register-from-otp", { method: "POST", body: JSON.stringify(input) }),

    sendEmailOtp: (email: string, token: string) =>
      apiFetch<{ message: string }>("/auth/send-email-otp", {
        method: "POST",
        body: JSON.stringify({ email }),
      }, token),

    verifyEmailOtp: (code: string, token: string) =>
      apiFetch<{ message: string; user: User }>("/auth/verify-email-otp", {
        method: "POST",
        body: JSON.stringify({ code }),
      }, token),

    requestPasswordReset: (email: string) =>
      apiFetch<{ message: string }>("/auth/request-password-reset", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),

    sessions: (token: string) =>
      apiFetch<Array<{ id: string; userAgent?: string; ipAddress?: string; lastSeenAt: string; createdAt: string; current: boolean }>>("/auth/sessions", {}, token),

    revokeSession: (sessionId: string, token: string) =>
      apiFetch<{ message: string }>(`/auth/sessions/${sessionId}`, { method: "DELETE" }, token),
  },
};
