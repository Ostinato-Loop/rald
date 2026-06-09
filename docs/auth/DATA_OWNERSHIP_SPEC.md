# DATA_OWNERSHIP_SPEC.md
**RALD Auth V1 — Data Ownership, Export & Deletion**
**Date:** 2026-06-09 | **Authority:** RALD Auth V1 Lockdown Directive
**LILCKY STUDIO LIMITED**

---

## MISSION

Every RALD user owns their data. They can take it all with them or delete it completely. RALD Auth is the single source of truth and the single point of control.

---

## CURRENT STATE

`GET /privacy/export` is **already implemented** in rald-auth-core v2.3.0.

It exports:
- Identity: `auth_users` row (id, email, name, role, created_at)
- Profile: `auth_user_profiles` (bio, avatar, preferences)
- Apps: `auth_product_access` (which products are provisioned)
- Sessions: `auth_sessions`
- Devices: `auth_devices`
- Audit log: last 500 entries from `audit_logs`
- Login history: last 500 entries from `auth_login_history`

**Gap:** The export only covers the auth layer. It does NOT yet include:
- Loop rooms hosted / rooms joined
- Messenger conversations / messages
- Communities created / joined
- Activity (reactions, follows)
- PayRald transactions (when built)

---

## FULL DATA EXPORT SPECIFICATION

### What must be exported

| Data Category | Source | Endpoint to call | Sprint |
|---|---|---|---|
| RALD Identity | rald-auth-core | `/privacy/export` | ✅ Done |
| Devices | rald-auth-core | `/devices` | ✅ Done |
| Audit log | rald-auth-core | `/privacy/export` | ✅ Done |
| Loop rooms hosted | Loop Worker | `/api/rooms?host=me` | Sprint 3 |
| Loop rooms joined | Loop Worker | `/api/rooms/history` | Sprint 3 |
| Loop communities | Loop Worker | `/api/communities?member=me` | Sprint 3 |
| Loop messages sent | Loop Worker | `/api/messages/export` | Sprint 3 |
| Messenger conversations | Messenger Worker | `/api/export/conversations` | Sprint 3 |
| Messenger messages | Messenger Worker | `/api/export/messages` | Sprint 3 |
| Reactions / follows | Loop Worker | `/api/activity/export` | Sprint 4 |
| PayRald transactions | PayRald (future) | `/api/export` | Future |

### Export format

All exports are in JSON with JSONL line fallback for large datasets.

```json
{
  "_meta": {
    "export_requested_at": "2026-06-09T14:00:00Z",
    "export_version": "1.0",
    "data_controller": "LILCKY STUDIO LIMITED",
    "contact": "privacy@rald.cloud",
    "data_residency": "Nigeria (af-south-1)",
    "retention_policy": "Account data retained for 90 days after deletion request."
  },
  "identity": { ... },
  "profile": { ... },
  "connected_apps": [ ... ],
  "devices": [ ... ],
  "audit_log": [ ... ],
  "loop": {
    "rooms_hosted": [ ... ],
    "rooms_joined": [ ... ],
    "communities": [ ... ],
    "messages": [ ... ]
  },
  "messenger": {
    "conversations": [ ... ],
    "messages": [ ... ]
  }
}
```

### Delivery

Phase 1 (current): synchronous JSON response (acceptable for small accounts)
Phase 2 (Sprint 3): async job + email link for accounts with >1,000 records

```
POST /privacy/export/request    — triggers async export job
GET  /privacy/export/status     — check job status
GET  /privacy/export/download   — download completed export (signed URL, 7 days)
```

---

## ACCOUNT DELETION SPECIFICATION

### Current State

`POST /privacy/delete` is implemented in rald-auth-core v2.3.0.

```typescript
privacy.post("/delete", authMiddleware, async (c) => {
  // Verified by current session — no additional OTP required yet
  // Marks account as deleted, sets deleted_at timestamp
  // Does NOT immediately hard-delete (90-day retention per policy)
});
```

### Required Deletion Flow

```
1. User clicks "Delete Account" at profiles.rald.cloud/privacy
2. Confirmation step 1: "Are you sure?" with summary of what will be deleted
3. Confirmation step 2: Enter OTP sent to phone (prevents accidental deletion)
4. POST /privacy/delete  { otp: "123456", reason?: string }
5. Server:
   a. Verifies OTP
   b. Sets auth_users.deleted_at = now()
   c. Anonymizes: email → deleted_<uuid>@deleted.rald, name → "Deleted User"
   d. Revokes all sessions (revokeAllUserSessions)
   e. Removes auth_devices, auth_recovery_codes
   f. Schedules hard delete job at deleted_at + 90 days
   g. Sends confirmation email/SMS: "Your account deletion has been scheduled. You have 14 days to cancel."
6. User is redirected to profiles.rald.cloud/deleted (already has /Suspended page as template)
```

### 14-Day Grace Period

```
POST /privacy/delete/cancel  — cancels pending deletion (within 14 days)
```

If user signs back in within 14 days, they see a banner: "Your account is scheduled for deletion on [date]. Cancel deletion →"

### Hard Delete (90-day retention then purge)

After `deleted_at + 90 days`, a scheduled Cloudflare Cron Trigger:

```typescript
// Cron: daily at 03:00 UTC
async function purgeDeletedAccounts(env: Bindings) {
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data: accounts } = await db
    .from("auth_users")
    .select("id")
    .not("deleted_at", "is", null)
    .lt("deleted_at", cutoff);

  for (const account of accounts ?? []) {
    // Hard delete across all tables (cascade should handle most)
    await db.from("auth_users").delete().eq("id", account.id);
    // Notify product services to purge their data too
    await notifyProductServices("user_purged", { userId: account.id });
  }
}
```

### What is deleted

| Data | When | How |
|---|---|---|
| RALD Auth identity | After 90-day grace | Hard delete from `auth_users` |
| Sessions & devices | Immediately | `revokeAllUserSessions` |
| Profile data | After 90-day grace | CASCADE from `auth_users` |
| Loop rooms hosted | After 90-day grace | Rooms remain but host becomes "Deleted User" |
| Messenger messages | After 90-day grace | Message content replaced with "[Message deleted]" |
| Communities created | After 90-day grace | Transferred to a co-admin or archived |
| Audit logs | Retained 7 years | Not deleted (legal requirement) — user_id anonymized |
| PayRald transactions | Retained 7 years | Not deleted (financial record) — user_id anonymized |

---

## DATA RESIDENCY

All RALD Auth data is stored in:
- **Supabase:** `af-south-1` (Africa/South Africa region) — closest available to Nigerian users
- **Cloudflare KV:** Global edge — session tokens only, no PII stored in KV
- **Cloudflare Workers:** No persistent storage — stateless

**Statement to users:** "Your RALD Account data is stored on servers in Africa. LILCKY STUDIO LIMITED does not sell your data to third parties."

---

## UI SPECIFICATION

### Export section (Dashboard → Privacy tab → Data section)

```
┌──────────────────────────────────────────────────┐
│  YOUR DATA                                       │
│                                                  │
│  Download a copy of all your RALD data           │
│  Includes: profile, rooms, messages, activity    │
│                                                  │
│  [⬇ Download my data]                           │
│  Last exported: Never                            │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│  DELETE ACCOUNT                                  │
│                                                  │
│  Permanently remove your RALD Account and all   │
│  associated data. This action cannot be undone  │
│  after a 14-day grace period.                   │
│                                                  │
│  [Delete my account →]   (destructive button)   │
└──────────────────────────────────────────────────┘
```

---

## ENDPOINTS (FULL SPEC)

```
GET  /privacy/me              — privacy overview (current) ✅ built
GET  /privacy/export          — synchronous export (current) ✅ built
POST /privacy/delete          — request account deletion ✅ built (needs OTP hardening)
POST /privacy/delete/cancel   — cancel pending deletion
PATCH /privacy/permissions    — update privacy preferences
GET  /privacy/export/status   — check async export job status (Sprint 3)
GET  /privacy/export/download — download completed export (Sprint 3)
```

---

## IMPLEMENTATION PRIORITY

| Item | Sprint | Effort |
|---|---|---|
| Add OTP confirmation to delete flow | Sprint 2 | 1 day |
| 14-day grace period + cancel endpoint | Sprint 2 | 1 day |
| Add Loop data to export (rooms, messages) | Sprint 3 | 2 days |
| Add Messenger data to export | Sprint 3 | 2 days |
| Hard delete cron job (90-day purge) | Sprint 3 | 2 days |
| Async export for large accounts | Sprint 4 | 3 days |

---

*DATA_OWNERSHIP_SPEC.md — LILCKY STUDIO LIMITED | 2026-06-09*
