# PUBLIC BETA BLOCKERS REPORT
**Generated:** 2026-06-12  
**Authority:** Phase 1 — Principal Platform Engineer Audit  
**Status:** 3 P0 blockers, 3 P1 blockers to resolve before beta opens  
**Classification:** OFFICIAL — SOURCE OF TRUTH

---

## SUMMARY

| Blocker | ID | Priority | Owner | Effort | Status |
|---|---|---|---|---|---|
| Machine Identity Keys Not Provisioned | C-CERT-001 | P0 | Platform | 2h scripted | ❌ Open |
| Notify Cron Trigger Not Active | P0-002 | P0 | Operator | 5 min CF Dashboard | ❌ Open |
| OpenObserve Log Shipping Not Active | C-CERT-004 | P0 | Platform | 2h wrangler secrets | ❌ Open |
| Session/OTP Cleanup Automation Missing | NEW | P1 | Platform | 4h | ❌ Open |
| Notify Retry/DLQ Not Implemented | NEW | P1 | Platform | 4h | ❌ Open |
| Mailgun DKIM Placeholder | P0-003 | P1 | Operator | 15 min | ❌ Open |

**Previously resolved:**
- ✅ C-CERT-003: rald-notify orphan route binding (`notify.rald.cloud`) — FIXED in wrangler.toml
- ✅ RALD Developer Platform — shipped (console.rald.cloud)
- ✅ RALD Identity Intelligence Layer — shipped (`identity_capabilities` + `/identity/*`)
- ✅ Loop crash (ErrorBoundary) — fixed with React.lazy()
- ✅ COOKIE-001: localStorage tokens → HttpOnly cookie — fixed 2026-06-09

---

## P0-001 — MACHINE IDENTITY KEYS NOT PROVISIONED (C-CERT-001)

### Problem
The `machine_identities` table schema is deployed and the `/machine/identities` API is live. However, no machine identity keys have been provisioned for any service. Services currently authenticate service-to-service via the shared `RALD_JWT_SECRET` or `RALD_INTERNAL_SECRET`, which is a security risk.

### Services That Need Machine Identities
| Service | Purpose |
|---|---|
| `loop-api` | Calls notify for room events |
| `messenger` | Calls notify for message events |
| `rald-notify` | Internal service |
| `rald-search` | Indexed by loop/messenger |
| `rald-inbox` | Receives from loop/messenger |
| `rald-realtime` | Room state coordination |
| `rald-event-bus` | Ecosystem event routing |

### Fix
Run `POST /machine/identities` (admin-authenticated) for each service. The API returns a `mid_*` secret that is set as `MACHINE_IDENTITY_SECRET` via `wrangler secret put` in each worker.

### Implementation Plan
1. Write provisioning script: `scripts/provision-machine-identities.sh`
2. Script calls `auth.rald.cloud/machine/identities` for each service
3. Outputs secrets for operator to run `wrangler secret put`
4. Push script to `rald-auth-core` repo
5. Update each worker's `lib/machine-auth.ts` to verify incoming machine JWTs

### Files to Modify
- `rald-auth-core/scripts/provision-machine-identities.sh` — provisioning script
- Each worker's deploy.yml — add `MACHINE_IDENTITY_SECRET` to secret push
- Each worker's `src/lib/machine-auth.ts` — verify incoming machine tokens

---

## P0-002 — NOTIFY CRON TRIGGER NOT ACTIVE

### Problem
The `rald-notify` worker has a cron trigger (`*/5 * * * *`) that handles:
- Notification retry for failed deliveries
- Dead letter queue processing
- Scheduled cleanup

The trigger is commented out in `wrangler.toml` because it requires `Workers Scripts:Edit` + `Scheduled Tasks:Edit` API token scope that isn't in the current CI token.

### Fix (Operator Action — Cannot Be Automated)
1. Go to: Cloudflare Dashboard → Workers & Pages → `rald-notify` → Triggers → Cron Triggers
2. Add: `*/5 * * * *`
3. Verify: Check the trigger appears in the dashboard and fires within 5 minutes

### Alternative (Can Be Automated)
Upgrade the Cloudflare API token used in `rald-notify`'s GitHub Actions secret to include `Workers Scripts:Edit` + `Scheduled Tasks:Edit` scopes, then uncomment the `[triggers]` block in wrangler.toml.

---

## P0-003 — OPENOBSERVE LOG SHIPPING NOT ACTIVE (C-CERT-004)

### Problem
All workers have the OpenObserve log shipping middleware (`requestLogger`) but the required env vars are not set:
- `OPEN_OBSERVE_API_KEY`
- `OPEN_OBSERVE_ENDPOINT`

Workers are running, but all logs are only going to the Cloudflare dashboard (ephemeral) with no centralized log aggregation. This means no cross-service correlation, no incident replay, no audit trail across workers.

### Workers That Need OpenObserve Secrets
| Worker | Repo |
|---|---|
| `rald-auth` | rald-auth-core |
| `rald-notify` | rald-notify |
| `rald-search` | rald-search |
| `rald-realtime` | rald-realtime |
| `rald-inbox` | rald-inbox |
| `loop-api` | loop |
| Messenger Worker | messenger |

### Fix
For each worker, run:
```bash
cd <repo>
wrangler secret put OPEN_OBSERVE_API_KEY   # value from OpenObserve dashboard
wrangler secret put OPEN_OBSERVE_ENDPOINT  # e.g. https://observe.rald.cloud/api/rald/<service>/_json
```

Then update each repo's `deploy.yml` to push these secrets automatically on deploy:
```yaml
- name: Push observability secrets
  run: |
    echo "${{ secrets.OPEN_OBSERVE_API_KEY }}" | wrangler secret put OPEN_OBSERVE_API_KEY
    echo "${{ secrets.OPEN_OBSERVE_ENDPOINT_AUTH }}" | wrangler secret put OPEN_OBSERVE_ENDPOINT
```

The Org secret `OPEN_OBSERVE_API_KEY` already exists in GitHub (if OpenObserve is configured) or needs to be added.

---

## P1-001 — SESSION/OTP CLEANUP AUTOMATION

### Problem
Expired sessions, stale OTPs, orphaned devices, and stale invites accumulate in Supabase with no automated cleanup. This causes:
- Table bloat slowing queries
- Auth state confusion from expired but un-garbage-collected records
- Security risk from stale OTPs remaining queryable

### Fix
Implement a Supabase Edge Function scheduled cleanup job OR add a Cloudflare Worker cron to `rald-auth-core`:

**Cleanup targets:**
```sql
-- Expired sessions (older than 30 days)
DELETE FROM auth_sessions WHERE expires_at < NOW() - INTERVAL '30 days';

-- Stale OTPs (older than 10 minutes)
DELETE FROM auth_otp_codes WHERE expires_at < NOW() - INTERVAL '10 minutes';

-- Orphaned devices (no session activity in 90 days)
DELETE FROM auth_devices WHERE last_seen_at < NOW() - INTERVAL '90 days';

-- Identity memory cleanup (stale dismissed prompts older than 180 days)
-- Not deleted — kept for audit trail
```

**Implementation:**
- Add `[triggers] crons = ["0 * * * *"]` to `rald-auth-core/wrangler.toml`
- Add `scheduled()` handler to `rald-auth-core/src/index.ts`
- Route to a `src/jobs/cleanup.ts` handler

---

## P1-002 — NOTIFY RETRY / DEAD LETTER QUEUE

### Problem
`rald-notify` has no retry queues or dead letter queues. A failed SMS or email notification is lost permanently. No replay protection.

### Fix
Use Cloudflare Queues (already used in `loop-api` with `loop-tasks`):
1. Add `[[queues.producers]]` and `[[queues.consumers]]` to `rald-notify/wrangler.toml`
2. On delivery failure: push to `notify-retry` queue with exponential backoff metadata
3. After 3 retries: push to `notify-dlq` queue for human review
4. Add `GET /api/deliveries/dlq` admin endpoint to view/replay DLQ items

---

## P1-003 — MAILGUN DKIM PLACEHOLDER

### Problem
`mailers._domainkey.mailers.rald.cloud` TXT record still has the placeholder value from initial setup. Until replaced with the real DKIM key, emails from `mailers.rald.cloud` may fail DKIM validation and land in spam.

### Fix (Operator Action)
1. Go to Mailgun Dashboard → Domains → `mailers.rald.cloud` → DNS Records
2. Copy the real DKIM TXT value
3. Update the DNS TXT record in Cloudflare: `mailers._domainkey.mailers.rald.cloud`

---

## RESOLUTION SEQUENCE

```
Week 1: P0 blockers
  Day 1-2: Machine identity provisioning script (code-deliverable)
  Day 2:   OpenObserve secrets pushed to all workers (operator + CI)
  Day 3:   Notify cron enabled via CF Dashboard (operator)
  Day 3:   Mailgun DKIM updated (operator)

Week 2: P1 blockers  
  Day 4-5: Session/OTP cleanup cron in rald-auth-core
  Day 5-6: Notify retry queue + DLQ
```

---

*Report generated by Principal Platform Engineer · RALD Platform Engineering · LILCKY STUDIO LIMITED · 2026-06-12*
