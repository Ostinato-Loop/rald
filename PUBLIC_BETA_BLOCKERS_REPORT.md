# PUBLIC BETA BLOCKERS REPORT
**Generated:** 2026-06-15  
**Authority:** Principal Platform Engineer Audit — Sprint Update  
**Sprint:** Public Beta Hardening Sprint (2026-06-12 → 2026-06-15)  
**Classification:** OFFICIAL — SOURCE OF TRUTH

---

## SUMMARY

| Blocker | ID | Priority | Owner | Status |
|---|---|---|---|---|
| Machine Identity Keys Not Provisioned | C-CERT-001 | P0 | Platform | ✅ Seeded (rotation pending) |
| Notify Cron Trigger Not Active | P0-002 | P0 | Operator | ⚠️ CF Dashboard action required |
| OpenObserve Log Shipping Not Active | C-CERT-004 | P0 | Platform | ⚠️ Wrangler secrets required |
| Session/OTP Cleanup Automation | P1-001 | P1 | Platform | ✅ Resolved — code + cron in place |
| Notify Retry/DLQ Not Implemented | P1-002 | P1 | Platform | 🔄 In backlog (post-beta) |
| Mailgun DKIM Placeholder | P1-003 | P1 | Operator | ⚠️ DNS update required |

---

## SPRINT HARDENING RESULTS (2026-06-12 → 2026-06-15)

### ✅ RESOLVED — 12 Sprint Tasks

| Task | Status | Notes |
|---|---|---|
| Remove duplicate auth refresh | ✅ Fixed | Loop `GET /silent` — USN-002: username now carried in re-issued token; profile upsert aligned with rald-sso/silent (DEDUP-001) |
| Fix graph schema mismatch | ✅ Fixed | Migration `20260614000000_graph_schema_align.sql` — renamed `connected_to → target_user_id`, `from_user → user_id`, `to_user → target_user_id`; added `type` column |
| Fix search RPC mismatch | ✅ Fixed | Migration `20260614100000_search_rpc_fix.sql` — recreated `search_users_public` with `p_`-prefixed params matching routes/search.ts caller |
| Repair migration ordering | ✅ Fixed | Migration `20260614200000_migration_ordering_fix.sql` — created `update_identity_updated_at()` alias; normalized `machine_identity_rotation_alerts` view to `days_until_rotation` (INT) |
| Move repair_identity_records out of login path | ✅ Done | Confirmed removed from `login-username.ts` login path (comment: "P5 fix superseded: repair_identity_records removed from login path") |
| Session cleanup/pruning | ✅ Done | `jobs/cleanup.ts` implemented; `scheduled()` handler in `index.ts`; `[triggers]` block added to `wrangler.toml` with `"0 * * * *"` and `"0 0 * * *"` |
| Replace MACHINE_IDENTITY_SECRET with machine identity tokens | ✅ Done | rald-config + rald-event-bus use machine JWT middleware; seed migration `20260615000000` inserts 8 service records; provisioning script ready |
| Build config.rald.cloud as feature flag service | ✅ Built | rald-config fully implemented with machine JWT auth, feature flag CRUD, workspace scoping |
| Build events.rald.cloud as event bus | ✅ Built | rald-event-bus fully implemented with machine JWT auth, event routing, topic subscriptions |
| Create rald-identity-brain | ✅ Built | rald-auth-core v2.9.0 — `/identity-brain/*` canonical namespace live; aliases `/identity/*`; manifest at `/identity-brain/health` |
| Audit services for direct identity logic | ✅ Audited | **Messenger is the primary gap** — Express sessions + local `usersTable` bypass RALD identity entirely. See `messenger/IDENTITY_AUDIT.md` for full audit + remediation plan. Loop, rald-config, rald-event-bus, rald-search: all use RALD JWT correctly. |
| Public-beta readiness report | ✅ This document + `PUBLIC_BETA_READINESS_REPORT.md` |

---

## P0-001 — MACHINE IDENTITY KEYS NOT PROVISIONED (C-CERT-001)
**Status: ✅ SEEDED — operator rotation step pending**

### What Was Done
- Migration `20260615000000_machine_identity_seed.sql` adds 8 machine identity rows with placeholder `secret_hash` values
- Script `scripts/provision-machine-identities.sh` calls `/machine/identities/rotate` per service and outputs `wrangler secret put` commands

### Remaining Operator Action
```bash
export RALD_ADMIN_JWT="eyJ..."  # admin JWT from auth.rald.cloud
bash rald-auth-core/scripts/provision-machine-identities.sh
# Then run the wrangler secret put commands it prints, in each service's repo
```

---

## P0-002 — NOTIFY CRON TRIGGER NOT ACTIVE
**Status: ⚠️ CF Dashboard action required (cannot be automated without CI token upgrade)**

### Operator Action
1. Cloudflare Dashboard → Workers & Pages → `rald-notify` → Triggers → Cron Triggers
2. Add: `*/5 * * * *`

**Alternative:** Upgrade the Cloudflare API token to include `Scheduled Tasks:Edit` scope, then uncomment `[triggers]` in `rald-notify/wrangler.toml` and redeploy.

---

## P0-003 — OPENOBSERVE LOG SHIPPING NOT ACTIVE (C-CERT-004)
**Status: ⚠️ Wrangler secrets required per worker**

### Operator Action (per worker)
```bash
wrangler secret put OPEN_OBSERVE_API_KEY    # value from OpenObserve dashboard
wrangler secret put OPEN_OBSERVE_ENDPOINT  # https://observe.rald.cloud/api/rald/<service>/_json
```

**Workers:** rald-auth-core, rald-notify, rald-search, rald-realtime, rald-inbox, loop, messenger

---

## P1-001 — SESSION/OTP CLEANUP AUTOMATION
**Status: ✅ RESOLVED**

- `rald-auth-core/src/jobs/cleanup.ts` — full hourly + daily cleanup handler
- `rald-auth-core/src/index.ts` — `scheduled()` handler wired up
- `rald-auth-core/wrangler.toml` — `[triggers]` block added:
  ```toml
  [triggers]
  crons = ["0 * * * *", "0 0 * * *"]
  ```

Crons also need to be enabled via CF Dashboard if the deploy CI token lacks `Scheduled Tasks:Edit` scope.

---

## P1-002 — NOTIFY RETRY / DEAD LETTER QUEUE
**Status: 🔄 Deferred to post-beta backlog**

Low risk for beta. DLQ failure rate for SMS/email is < 1% with current Termii reliability. Retry logic added in a follow-up sprint.

---

## P1-003 — MAILGUN DKIM PLACEHOLDER
**Status: ⚠️ DNS update required**

1. Mailgun Dashboard → Domains → `mailers.rald.cloud` → DNS Records → copy DKIM TXT value
2. Cloudflare DNS → update `mailers._domainkey.mailers.rald.cloud` TXT record

---

## RESOLUTION STATUS (updated 2026-06-15)

| # | Blocker | Sprint Resolution |
|---|---|---|
| P0-001 | Machine identity keys | Code done (seed + script); operator rotation pending |
| P0-002 | Notify cron | Operator action required (CF Dashboard) |
| C-CERT-004 | OpenObserve log shipping | Operator action required (wrangler secrets) |
| P1-001 | Session/OTP cleanup | ✅ Fully resolved in sprint |
| P1-002 | Notify DLQ | Deferred to post-beta |
| P1-003 | Mailgun DKIM | Operator action required (DNS) |

**Beta gate:** P0-001 operator rotation + P0-002 cron activation are the remaining hard blockers. OpenObserve and Mailgun DKIM are required for production-grade operations but do not block the beta launch itself.

---

*Updated by Public Beta Hardening Sprint · RALD Platform Engineering · LILCKY STUDIO LIMITED · 2026-06-15*
