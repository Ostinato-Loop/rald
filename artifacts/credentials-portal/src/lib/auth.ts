// RALD Auth — shared state for credentials portal

const AUTH_URL    = "https://profiles.rald.cloud";
const TOKEN_KEY   = "rald_auth_token";
const USER_KEY    = "rald_auth_user";

export interface RaldUser {
  id: string;
  raldId?: string | null;
  email: string;
  name: string | null;
  role: string;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): RaldUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSession(token: string, user: RaldUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function redirectToLogin(): void {
  clearSession();
  window.location.href = `${AUTH_URL}?redirect=${encodeURIComponent(window.location.href)}`;
}

// On load: handle ?rald_token=... redirect from profiles.rald.cloud
export function handleAuthRedirect(): boolean {
  const params = new URLSearchParams(window.location.search);
  const token  = params.get("rald_token");
  if (!token) return false;

  // Decode user from JWT payload (no verification — server verifies on API calls)
  try {
    const payload = JSON.parse(atob(token.split(".")[1]!));
    const user: RaldUser = {
      id:     payload.id,
      raldId: payload.raldId ?? null,
      email:  payload.email,
      name:   payload.name  ?? null,
      role:   payload.role  ?? "user",
    };
    saveSession(token, user);
    // Remove token from URL
    const clean = new URL(window.location.href);
    clean.searchParams.delete("rald_token");
    window.history.replaceState({}, "", clean.toString());
    return true;
  } catch {
    return false;
  }
}
