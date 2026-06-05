# WIZMAC IMMUTABILITY SPECIFICATION
**Permanent Knowledge — Rules of Immutability**
Version: 1.0.0
Issued: 2026-06-05
Issuer: LILCKY STUDIO LIMITED
Status: CANONICAL

---

## 1. CORE RULE

> **WIZMAC is the ONLY system allowed to permanently remember things.**

Permanent records in WIZMAC cannot be deleted via any API.
Attempting to delete a permanent record returns HTTP 403.

---

## 2. IMMUTABLE RECORD TYPES

### Origin Records
- Created once per product/system/agent
- NEVER deleted
- NEVER modified — only versioned
- `isDeleted: false` always — delete API returns 403
- Versioned via `version` integer field

### Directives
- Founding directives are IMMUTABLE
- Cannot be deleted — can only be superseded
- Superseded directives remain visible with `status: "superseded"`
- `supersededBy` references the new directive ID

### Decision Records (Historical)
- All architectural decisions logged permanently
- Cannot be deleted
- Updated by creating a new decision that supersedes the old one

### Audit Logs
- Cannot be deleted (no DELETE API exposed)
- Append-only
- Indexes created for fast query, not for deletion

### Founding Documents
- Archives of BBC specs, WIZMAC specs, RALD Constitution
- `isImmutable: true` — no delete API
- Versioned via `version` integer field

---

## 3. VERSIONING PROTOCOL

When an immutable record needs updating:

```
1. Create new record (new ID, incremented version)
2. Set old record: status = "superseded", supersededBy = new_id
3. Both records remain in database
4. API returns latest active version by default
5. Historical versions always queryable
```

---

## 4. ENFORCEMENT IN API

```typescript
// Origin Records — DELETE returns 403 always
router.delete("/origin-records/:id", (_req, res) => {
  res.status(403).json({
    error: "Origin records cannot be deleted. They are permanent WIZMAC records.",
  });
});

// Agent Memory — isPermanent=true cannot be deleted
router.delete("/memory/:id", async (req, res) => {
  const [mem] = await db.select()...
  if (mem.isPermanent) {
    return res.status(403).json({ error: "Cannot delete permanent WIZMAC memory." });
  }
  // proceed with deletion for non-permanent records
});
```

---

## 5. KNOWLEDGE CONFIDENCE SYSTEM

Every knowledge item must include:

| Field | Type | Description |
|-------|------|-------------|
| `source` | text | Where the knowledge came from |
| `confidence` | float (0–1) | How confident the system is |
| `verificationStatus` | enum | `unverified` / `verified` / `canonical` |
| `timestamp` | timestamp | When it was recorded |
| `recordedBy` | text | Which agent or human recorded it |

---

## 6. DISASTER RECOVERY GUARANTEE

Even in catastrophic failure:
- Daily backups ensure max 24h data loss for ephemeral data
- Permanent records (origin, directives, decisions) backed up hourly
- WIZMAC exports can rebuild the full knowledge graph from backup

*WIZMAC_IMMUTABILITY_SPEC V1 — LILCKY STUDIO LIMITED — 2026*
