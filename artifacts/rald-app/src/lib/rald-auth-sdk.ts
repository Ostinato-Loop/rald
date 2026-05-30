// ============================================================================
// RALD AUTH SDK  v1.2.0
// Sovereign identity infrastructure — LILCKY STUDIO LIMITED
// Usage: import { raldAuth } from "@/lib/rald-auth-sdk"
// ============================================================================

const SDK_VERSION = "1.2.0";
const DEFAULT_BASE = "https://api.rald.cloud";
const TOKEN_KEY = "rald_auth_token";

// ── Types ────────────────────────────────────────────────────────────────────

export type RaldUserRole = "user" | "merchant" | "admin" | "operator" | "viewer";

export interface RaldUser {
  id: string;
  raldId?: string | null;   // permanent RALD-XXXXXXXX identity
  email: string;
  name: string | null;
  role: RaldUserRole;
  phone?: string | null;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  createdAt: string;
}

export interface RaldSession {
  token: string;
  user: RaldUser;
}

export type RaldAuthMethod = "sms" | "email" | "password";

export interface RaldOtpSession {
  pinId: string;            // SMS OTP
  phone: string;
}

export interface RaldEmailOtpSession {
  sessionToken: string;     // Email OTP (JWT-based, stateless)
  email: string;
}

export interface RaldNewUserSms {
  newUser: true;
  phone: string;
  otpToken: string;         // short-lived JWT proving phone ownership
}

export interface RaldNewUserEmail {
  newUser: true;
  email: string;
  emailToken: string;       // short-lived JWT proving email ownership
}

export class RaldAuthError extends Error {
  constructor(public message: string, public status?: number) {
    super(message);
    this.name = "RaldAuthError";
  }
}

type AuthStateListener = (session: RaldSession | null) => void;

// ── SDK Class ────────────────────────────────────────────────────────────────

export class RaldAuthSDK {
  readonly version = SDK_VERSION;
  private base: string;
  private storageKey: string;
  private _session: RaldSession | null = null;
  private listeners = new Set<AuthStateListener>();
  private initialized = false;

  constructor(opts: { baseUrl?: string; storageKey?: string } = {}) {
    this.base = (opts.baseUrl ?? DEFAULT_BASE).replace(/\/$/, "");
    this.storageKey = opts.storageKey ?? TOKEN_KEY;
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private async _fetch<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-RALD-SDK": SDK_VERSION,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const res = await fetch(`${this.base}/api${path}`, { ...init, headers });
    const data = await res.json() as { error?: string };
    if (!res.ok) throw new RaldAuthError(data.error ?? `Request failed: ${res.status}`, res.status);
    return data as T;
  }

  private _notify(session: RaldSession | null) {
    for (const fn of this.listeners) fn(session);
  }

  private _saveSession(session: RaldSession) {
    this._session = session;
    try { localStorage.setItem(this.storageKey, session.token); } catch { /* SSR */ }
    this._notify(session);
  }

  private _clearSession() {
    this._session = null;
    try { localStorage.removeItem(this.storageKey); } catch { /* SSR */ }
    this._notify(null);
  }

  // ── Init (call once on app load) ─────────────────────────────────────────

  async init(): Promise<RaldSession | null> {
    if (this.initialized) return this._session;
    this.initialized = true;
    let token: string | null = null;
    try { token = localStorage.getItem(this.storageKey); } catch { /* SSR */ }
    if (!token) return null;
    try {
      const user = await this._fetch<RaldUser>("/auth/me", {}, token);
      this._session = { token, user };
      return this._session;
    } catch {
      this._clearSession();
      return null;
    }
  }

  // ── Session ───────────────────────────────────────────────────────────────

  getSession(): RaldSession | null { return this._session; }
  getToken(): string | null { return this._session?.token ?? null; }
  getUser(): RaldUser | null { return this._session?.user ?? null; }
  isAuthenticated(): boolean { return this._session !== null; }

  setSession(session: RaldSession): void { this._saveSession(session); }

  logout(): void { this._clearSession(); }

  onAuthStateChange(fn: AuthStateListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  // ── SMS OTP (Termii — backend only) ──────────────────────────────────────

  async sendSmsOtp(phone: string): Promise<{ pinId: string; message: string }> {
    return this._fetch("/auth/send-otp", { method: "POST", body: JSON.stringify({ phone }) });
  }

  async verifySmsOtp(
    pinId: string, pin: string, phone: string
  ): Promise<RaldSession | RaldNewUserSms> {
    return this._fetch("/auth/verify-otp", { method: "POST", body: JSON.stringify({ pinId, pin, phone }) });
  }

  async registerFromSmsOtp(opts: {
    otpToken: string; name: string; email: string;
    role?: RaldUserRole; businessName?: string;
  }): Promise<RaldSession> {
    const res = await this._fetch<RaldSession>("/auth/register-from-otp", { method: "POST", body: JSON.stringify(opts) });
    this._saveSession(res);
    return res;
  }

  // ── Email OTP (Resend — backend only) ────────────────────────────────────

  async sendEmailLoginOtp(email: string): Promise<{ sessionToken: string; message: string }> {
    return this._fetch("/auth/send-login-email-otp", { method: "POST", body: JSON.stringify({ email }) });
  }

  async verifyEmailLoginOtp(
    sessionToken: string, code: string
  ): Promise<RaldSession | RaldNewUserEmail> {
    return this._fetch("/auth/verify-login-email-otp", { method: "POST", body: JSON.stringify({ sessionToken, code }) });
  }

  async registerFromEmailOtp(opts: {
    emailToken: string; name: string;
    role?: RaldUserRole; businessName?: string;
  }): Promise<RaldSession> {
    const res = await this._fetch<RaldSession>("/auth/register-from-email-otp", { method: "POST", body: JSON.stringify(opts) });
    this._saveSession(res);
    return res;
  }

  // ── Password Auth ─────────────────────────────────────────────────────────

  async login(email: string, password: string): Promise<RaldSession> {
    const res = await this._fetch<RaldSession>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    this._saveSession(res);
    return res;
  }

  async register(opts: {
    name: string; email: string; password: string;
    role?: RaldUserRole; phone?: string; businessName?: string;
  }): Promise<RaldSession> {
    const res = await this._fetch<RaldSession>("/auth/register", { method: "POST", body: JSON.stringify(opts) });
    this._saveSession(res);
    return res;
  }

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    return this._fetch("/auth/request-password-reset", { method: "POST", body: JSON.stringify({ email }) });
  }

  async resetPassword(email: string, code: string, newPassword: string): Promise<{ message: string }> {
    return this._fetch("/auth/reset-password", { method: "POST", body: JSON.stringify({ email, code, newPassword }) });
  }

  // ── Account email verification ────────────────────────────────────────────

  async sendAccountEmailOtp(email: string): Promise<{ message: string }> {
    return this._fetch("/auth/send-email-otp", { method: "POST", body: JSON.stringify({ email }) }, this.getToken() ?? undefined);
  }

  async verifyAccountEmailOtp(code: string): Promise<{ message: string; user: RaldUser }> {
    return this._fetch("/auth/verify-email-otp", { method: "POST", body: JSON.stringify({ code }) }, this.getToken() ?? undefined);
  }

  // ── User ──────────────────────────────────────────────────────────────────

  async me(): Promise<RaldUser> {
    const user = await this._fetch<RaldUser>("/auth/me", {}, this.getToken() ?? undefined);
    if (this._session) this._session.user = user;
    return user;
  }

  // ── Sessions ──────────────────────────────────────────────────────────────

  async getSessions(): Promise<Array<{ id: string; userAgent?: string; lastSeenAt: string; createdAt: string }>> {
    return this._fetch("/auth/sessions", {}, this.getToken() ?? undefined);
  }

  async revokeSession(sessionId: string): Promise<{ message: string }> {
    return this._fetch(`/auth/sessions/${sessionId}`, { method: "DELETE" }, this.getToken() ?? undefined);
  }

  async revokeAllSessions(): Promise<{ message: string }> {
    return this._fetch("/auth/sessions", { method: "DELETE" }, this.getToken() ?? undefined);
  }
}

// ── Singleton instance ────────────────────────────────────────────────────────
export const raldAuth = new RaldAuthSDK({
  baseUrl: (typeof import.meta !== "undefined" && (import.meta as Record<string, unknown>).env)
    ? ((import.meta as Record<string, Record<string, string>>).env.VITE_API_URL ?? DEFAULT_BASE)
    : DEFAULT_BASE,
});
