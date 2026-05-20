// Admin utility functions for RALD
// Provides typed helpers for admin operations

export type UserRole = "user" | "admin" | "super_admin";

export interface AdminUser {
  id: string;
  phone: string;
  created_at: string;
  last_sign_in_at: string | null;
  is_active: boolean;
  role: UserRole;
  metadata: Record<string, unknown>;
}

export interface AdminSession {
  id: string;
  user_id: string;
  created_at: string;
  expires_at: string;
  ip_address: string;
  user_agent: string;
  risk_score: number;
  is_active: boolean;
}

export interface OTPRecord {
  id: string;
  phone: string;
  created_at: string;
  expires_at: string;
  verified: boolean;
  provider: "termii" | "twilio" | "africas_talking";
  attempts: number;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  actor_id: string;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  ip_address: string;
  severity: "low" | "medium" | "high" | "critical";
}

export type AdminEventPayload = Record<string, unknown>;

export interface AdminFilter {
  search?: string;
  role?: UserRole;
  is_active?: boolean;
  from_date?: string;
  to_date?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface AdminStats {
  total_users: number;
  active_sessions: number;
  otp_success_rate: number;
  api_requests_today: number;
  blocked_threats: number;
  wallet_volume_ngn: number;
}

export interface WalletRecord {
  id: string;
  user_id: string;
  balance_ngn: number;
  frozen_ngn: number;
  created_at: string;
  updated_at: string;
}

export function buildAdminFilter(params: AdminFilter): Record<string, string> {
  const query: Record<string, string> = {};
  if (params.search) query.search = params.search;
  if (params.role) query.role = params.role;
  if (params.is_active !== undefined) query.is_active = String(params.is_active);
  if (params.from_date) query.from_date = params.from_date;
  if (params.to_date) query.to_date = params.to_date;
  if (params.page) query.page = String(params.page);
  if (params.limit) query.limit = String(params.limit);
  return query;
}

export function formatNGN(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
  }).format(amount);
}

export function getRiskLevel(
  score: number,
): "low" | "medium" | "high" | "critical" {
  if (score < 25) return "low";
  if (score < 50) return "medium";
  if (score < 75) return "high";
  return "critical";
}

export function maskPhone(phone: string): string {
  if (phone.length < 6) return phone;
  return phone.slice(0, 4) + "****" + phone.slice(-3);
}

export function parseAdminEvent(raw: unknown): AdminEventPayload {
  if (typeof raw === "object" && raw !== null) {
    return raw as AdminEventPayload;
  }
  return {};
}

export function isAdminUser(user: AdminUser): boolean {
  return user.role === "admin" || user.role === "super_admin";
}
