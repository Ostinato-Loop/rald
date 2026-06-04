# MESSENGER RELIABILITY REPORT
## Sprint 02 — Trust & Retention
**Date:** 2026-06-04  
**Auditor:** LILCKY STUDIO LIMITED  
**Priority:** 5 — Messenger  

---

## Objective

No lost conversations. No disappearing messages unless intentional. Every message sent must be persisted and retrievable.

---

## Architecture Audit

### Message Persistence
**Store:** Cloudflare D1 (SQLite at the edge)  
**Schema table:** `messenger_messages`  
**Write path:** `POST /conversations/:id/messages` → D1 insert  
**Read path:** `GET /conversations/:id/messages` → D1 query ordered by `created_at`  

**Assessment:** D1 is durable. Messages are written synchronously before the HTTP response is returned. No in-memory queue that could drop on worker restart. **Persistence is sound.**

### Conversation Persistence
**Store:** D1 `messenger_conversations` + `messenger_conversation_members`  
**Assessment:** Conversations persist in D1 independent of sessions. Member rows persist through `left_at` flag (soft delete). A conversation is never lost unless explicitly deleted. **Conversation persistence is sound.**

### Session Persistence
**Auth:** RALD JWT stored in `localStorage` as `messenger_rald_token`.  
**Silent SSO:** `GET /auth/silent` re-validates `rald_session` cookie on reload.  

**Risk:** `localStorage` is cleared by browsers in private/incognito mode. If a user opens Messenger in a fresh incognito window, they are redirected to login. This is expected behaviour.

**Gap:** No `refresh_token` mechanism exists. When the RALD JWT expires, the user is silently redirected to Profiles login. Short JWT TTL = frequent redirects.

---

## Real-Time Delivery Audit

### Supabase Realtime (Presence + Typing)
**`presence.ts`:** tracks online/offline user IDs via Supabase realtime channel.  
**`typing.ts`:** broadcasts typing indicators via Supabase realtime.  
**Risk:** Supabase realtime rate limit is 10 events/second per channel. High-activity group conversations could hit this limit.

### `realtime-messages.ts`
**Pattern:** Supabase realtime subscription to new `messenger_messages` rows filtered by conversation ID.  
**Assessment:** Proper channel lifecycle management (subscribe on mount, unsubscribe on unmount). No message duplication risk observed.

---

## Contact Persistence
No dedicated contact/friend list exists yet. Contacts are inferred from conversation membership:
- Users a person has DMed appear in conversation list
- Users in groups appear via group membership

**Gap:** If a user is removed from a group or deletes a DM, they "lose" that contact. No explicit contact list or connections graph in Messenger.

---

## Known Reliability Gaps

| Gap | Severity | Notes |
|-----|----------|-------|
| JWT expiry → silent logout | High | No token refresh; expired session = forced redirect to Profiles |
| Offline message queue | High | Messages sent while offline fail silently; no retry queue |
| Message delivery receipts | Medium | No "delivered" / "read" receipt shown to sender |
| D1 500MB limit (free tier) | Medium | At scale, D1 database may need Paid tier or sharding strategy |
| Supabase realtime 10 events/s cap | Medium | Could cause typing/presence lag in active group conversations |
| No end-to-end encryption | High | Messages are stored in plaintext in D1 — disclose to users |
| Missing read receipts in multi-device | Low | Sessions are per-device; "read" status not synced across devices |

---

## Reliability Score

| Dimension | Score | Notes |
|-----------|-------|-------|
| Message persistence | 9/10 | D1 is durable; no drop risk |
| Conversation persistence | 9/10 | Soft-delete model; conversations not lost |
| Real-time delivery | 7/10 | Supabase realtime works; no retry for offline |
| Session persistence | 6/10 | JWT-based; no refresh token; incognito breaks session |
| Contact persistence | 4/10 | Contacts inferred from convs; no explicit contact list |
| Delivery confirmation | 3/10 | No delivery/read receipts to sender |

**Overall: 6.3/10** — Core persistence is solid. Real-time and session reliability need Sprint 03 attention.

---

## Sprint 03 Recommendations

| Priority | Fix | Impact |
|----------|-----|--------|
| P1 | Add offline message queue with retry | Prevents silent message loss on poor networks |
| P2 | Implement token refresh or longer JWT TTL | Reduces forced logouts |
| P3 | Add "delivered" / "read" receipts to message rows | Builds sender trust |
| P4 | Warn users about lack of E2E encryption | Legal and trust compliance |
| P5 | Implement explicit contact/connections list | Sprint 04 relationship graph |

---

*MESSENGER_RELIABILITY_REPORT.md — Sprint 02 Trust & Retention — LILCKY STUDIO LIMITED*
