# DISASTER RECOVERY SPECIFICATION
**Backup, Recovery, and Business Continuity**
Version: 1.0.0
Issued: 2026-06-05
Issuer: LILCKY STUDIO LIMITED
Status: CANONICAL

---

## 1. RECOVERY TIME OBJECTIVE

**Target RTO: < 30 minutes**

The RALD Ecosystem must be restorable within 30 minutes of any failure.

---

## 2. BACKUP SCHEDULE

### Database Backups
| Frequency | Retention | Scope |
|-----------|-----------|-------|
| Hourly | 7 days | Permanent records only |
| Daily | 90 days | Full database |
| Weekly | 1 year | Full database + schema |
| Monthly | 5 years | Full snapshot |

### Knowledge Graph Exports
- Daily: WIZMAC entity/relationship export (JSON)
- Weekly: Full constitution engine export
- Monthly: Origin records archive export

### Voice Metadata Exports
- Daily: Voice interaction metadata
- Weekly: Speaker profiles
- Monthly: Language/dialect knowledge base

### Agent State Exports
- Daily: Agent registry + permissions
- Weekly: Agent memory (permanent)
- Monthly: Full agent history

---

## 3. BACKUP STORAGE

Primary: Cloudflare R2 (same region as workers)
Secondary: External S3-compatible storage
Tertiary: Encrypted cold storage (monthly snapshots)

---

## 4. RECOVERY RUNBOOK

### Full System Recovery

```
Step 1 (0–5 min): Identify failure scope
  - Check MERMAC system health dashboard
  - Identify which services are down
  - Check Cloudflare status page

Step 2 (5–10 min): Restore database
  - Pull latest daily backup from R2
  - Restore to new PostgreSQL instance
  - Verify: entity count, decision count, agent count

Step 3 (10–20 min): Restore API services
  - Deploy API server from GitHub (source of truth)
  - Configure environment secrets
  - Run environment validator

Step 4 (20–25 min): Verify WIZMAC integrity
  - Run WIZMAC health check
  - Verify origin records count
  - Verify directives count
  - Verify agent registry

Step 5 (25–30 min): Restore traffic
  - DNS failover (if needed)
  - Verify all endpoints respond
  - DRAGULA sends all-clear notification
```

---

## 5. WIZMAC PERMANENCE GUARANTEE

WIZMAC's permanent records (origin records, directives, decisions, audit logs) are backed up every hour.

Even in a catastrophic failure, the maximum data loss for permanent records is 1 hour.

Ephemeral records (session memory, temp state) may be lost. This is acceptable.

---

## 6. GITHUB AS SOURCE OF TRUTH

GitHub org: Ostinato-Loop
**All code must be pushed to GitHub immediately after any change.**

Recovery from GitHub takes 5 minutes:
```bash
git clone https://github.com/Ostinato-Loop/sekani-core
pnpm install
pnpm build
```

*DISASTER_RECOVERY_SPEC V1 — LILCKY STUDIO LIMITED — 2026*
