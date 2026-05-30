// RALD Audit Logging — writes to audit_logs table (best-effort, never throws)
// LILCKY STUDIO LIMITED

import { SupabaseClient } from "@supabase/supabase-js";

export type AuditAction =
  | "login"
  | "login_failed"
  | "logout"
  | "register"
  | "otp_sent"
  | "otp_verified"
  | "otp_failed"
  | "password_reset_requested"
  | "password_reset_completed"
  | "session_revoked"
  | "all_sessions_revoked"
  | "api_key_created"
  | "api_key_revoked"
  | "api_key_rotated"
  | "token_refreshed"
  | "rate_limited"
  | "org_created"
  | "org_member_added"
  | "org_member_removed";

export interface AuditEntry {
  userId?: string | null;
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  ip?: string;
  userAgent?: string;
  status?: "success" | "failure" | "blocked";
  metadata?: Record<string, unknown>;
}

export async function writeAuditLog(db: SupabaseClient, entry: AuditEntry): Promise<void> {
  try {
    await db.from("audit_logs").insert({
      user_id: entry.userId ?? null,
      action: entry.action,
      resource_type: entry.resourceType ?? null,
      resource_id: entry.resourceId ?? null,
      ip_address: entry.ip ?? null,
      user_agent: entry.userAgent ?? null,
      status: entry.status ?? "success",
      metadata: entry.metadata ?? null,
    });
  } catch (err) {
    // Audit logging must never break the main flow
    console.warn("[audit] write failed:", err);
  }
}
