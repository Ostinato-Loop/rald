# RALD Loop — LiveKit Role Model

**Document:** LIVEKIT_ROLE_MODEL.md  
**Status:** P0 Fix Required  
**Owner:** LILCKY STUDIO LIMITED  
**Last Updated:** 2026-06-13

---

## Current State (BROKEN — P0)

**File:** `loop/artifacts/cloudflare-worker/src/routes/audio.ts`

```typescript
video: {
  roomJoin:       true,
  room:           roomId,
  canPublish:     true,   // ← EVERY authenticated user gets canPublish=true
  canSubscribe:   true,
  canPublishData: true,
},
```

**Problem:** Every authenticated user in every room receives `canPublish: true`. There is no role-based permission enforcement. Any user can force microphone access into any room.

---

## Required Role Model

### Roles

| Role | canPublish | canSubscribe | canPublishData | Description |
|------|------------|--------------|----------------|-------------|
| `listener` | `false` | `true` | `false` | Read-only audience member |
| `speaker` | `true` | `true` | `true` | Active participant |
| `host` | `true` | `true` | `true` | Room creator — can manage speakers |
| `moderator` | `true` | `true` | `true` | Elevated — can mute/remove users |
| `admin` | `true` | `true` | `true` | Full platform access |

### Permission Matrix

```
listener  → canPublish=false, canSubscribe=true,  canPublishData=false
speaker   → canPublish=true,  canSubscribe=true,  canPublishData=true
host      → canPublish=true,  canSubscribe=true,  canPublishData=true
moderator → canPublish=true,  canSubscribe=true,  canPublishData=true
admin     → canPublish=true,  canSubscribe=true,  canPublishData=true
```

### Room Role Lookup

Room roles are stored in the `room_participants` table:

```sql
CREATE TABLE room_participants (
  room_id     TEXT NOT NULL,
  user_id     UUID NOT NULL,
  role        TEXT NOT NULL DEFAULT 'listener',  -- listener|speaker|host|moderator
  joined_at   TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);
```

**Token issuance flow:**

```
GET /api/audio/token?room_id=<id>
  → Look up user's role in room_participants WHERE room_id + user_id
  → Default to 'listener' if no record
  → Issue LiveKit JWT with permissions matching role
```

---

## Required Code Fix

**File:** `loop/artifacts/cloudflare-worker/src/routes/audio.ts`

```typescript
// Replace the static payload with role-based permissions:

async function getRoomRole(
  sbUrl: string,
  sbKey: string,
  userId: string,
  roomId: string,
): Promise<"listener" | "speaker" | "host" | "moderator" | "admin"> {
  const resp = await fetch(
    `${sbUrl}/rest/v1/room_participants?room_id=eq.${encodeURIComponent(roomId)}&user_id=eq.${encodeURIComponent(userId)}&select=role&limit=1`,
    { headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` } },
  ).catch(() => null);
  if (!resp?.ok) return "listener";
  const rows = await resp.json() as { role?: string }[];
  const role = rows[0]?.role;
  if (role === "speaker" || role === "host" || role === "moderator" || role === "admin") {
    return role;
  }
  return "listener";
}

function roleToPermissions(role: string) {
  const canPublish = role !== "listener";
  return {
    roomJoin:       true,
    canPublish,
    canSubscribe:   true,
    canPublishData: canPublish,
  };
}
```

---

## Host Elevation API

Hosts must be able to promote listeners to speakers:

```
POST /api/audio/rooms/:roomId/participants/:userId/role
  Body: { role: "speaker" | "listener" }
  Auth: requireAuth() — caller must be host/moderator/admin
```

---

## Implementation Status

| Item | Status |
|------|--------|
| Role model defined | ✅ This document |
| `room_participants` table schema | ⚠️ Needs migration |
| `audio.ts` role-based token | ❌ Not implemented — P0 |
| Host elevation API | ❌ Not implemented |
| Moderator mute/remove | ❌ Not implemented |

---

## Audit Log

| Date | Change |
|------|--------|
| 2026-06-13 | Initial role model document — P0 gap identified |

