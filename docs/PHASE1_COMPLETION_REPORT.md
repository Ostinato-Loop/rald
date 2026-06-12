# Phase 1 — Public Beta Blockers: Completion Report
**Principal Systems Architect — RALD Ecosystem (Ostinato-Loop)**  
**Date:** 2026-06-12  
**Status:** COMPLETE — All deliverables committed. PRs open. Operator actions documented.

---

## Summary

Phase 1 addressed the 5 highest-priority blockers identified in the Phase 0 audit. All code changes are committed to feature branches and PRs are open for review. Two items require operator action (not automatable via CI).

---

## Deliverables

### 1. rald-auth-core v2.9.0 — PR: `feat/phase-1-blockers`

| File | Change |
|---|---|
| `src/jobs/cleanup.ts` | New — OTP cleanup, session deletion, device inactivation, rotation alerts, health snapshot |
| `src/index.ts` | v2.9.0 — identity-brain namespace alias (`/identity-brain/*` → `/identity/*`), scheduled handler |
| `wrangler.toml` | Added cron triggers: `0 * * * *` (hourly) + `0 0 * * *` (daily) |
| `scripts/provision-machine-identities.sh` | New — provisions machine identity for all 7 services |
| `.github/workflows/deploy.yml` | Added OPEN_OBSERVE, MACHINE_IDENTITY_SECRET, ADMIN_USER_ID secret push steps |

**Blockers resolved by code:**
- `C-CERT-003` — Scheduled cleanup automation (OTP, sessions, devices) ✅
- `P0-003` — Identity Brain namespace accessible at `/identity-brain/*` ✅

### 2. OpenObserve Log Shipping — 6 service PRs: `feat/phase-1-observability`

| Repo | Worker | PR |
|---|---|---|
| rald-auth-core | rald-auth | In `feat/phase-1-blockers` |
| rald-notify | rald-notify | PR #1 |
| rald-search | rald-search | PR #1 |
| rald-realtime | rald-realtime | PR #1 |
| rald-inbox | rald-inbox | PR #1 |
| messenger | messenger | PR #1 |

**Blockers resolved once org secrets are added:**
- `C-CERT-004` — Centralized log shipping ✅ (code merged; secrets = operator action)

---

## Operator Actions Required

### Action 1 — C-CERT-001: Machine Identity Provisioning

**Status:** Provisioning script committed. Requires operator admin JWT.

```bash
# 1. Get your admin JWT
curl -X POST https://auth.rald.cloud/auth/login \
  -d '{"phone":"<ADMIN_PHONE>","password":"<ADMIN_PASSWORD>"}'

# 2. Export it
export RALD_ADMIN_JWT="eyJ..."

# 3. Run the provisioning script
bash scripts/provision-machine-identities.sh
# (from the rald-auth-core repo directory)
```

Then add each generated `MACHINE_IDENTITY_SECRET` to its service GitHub repo secrets and trigger a redeploy.

**Services needing machine identities:** loop, messenger, rald-notify, rald-search, rald-inbox, rald-realtime, rald-event-bus

### Action 2 — C-CERT-004: Add OpenObserve Org Secrets

**Status:** Deploy pipelines updated. Secrets not yet set.

Go to: **GitHub → Ostinato-Loop → Settings → Secrets → Actions**

| Secret | Value |
|---|---|
| `OPEN_OBSERVE_API_KEY` | Your OpenObserve API key |
| `OPEN_OBSERVE_ENDPOINT_AUTH` | `https://observe.rald.cloud/api/rald/rald-auth-core/_json` |
| `OPEN_OBSERVE_ENDPOINT_NOTIFY` | `https://observe.rald.cloud/api/rald/rald-notify/_json` |
| `OPEN_OBSERVE_ENDPOINT_SEARCH` | `https://observe.rald.cloud/api/rald/rald-search/_json` |
| `OPEN_OBSERVE_ENDPOINT_REALTIME` | `https://observe.rald.cloud/api/rald/rald-realtime/_json` |
| `OPEN_OBSERVE_ENDPOINT_INBOX` | `https://observe.rald.cloud/api/rald/rald-inbox/_json` |
| `OPEN_OBSERVE_ENDPOINT_MESSENGER` | `https://observe.rald.cloud/api/rald/messenger/_json` |

Then trigger a redeploy on each service (push empty commit or run workflow manually).

### Action 3 — P0-002: rald-notify Cron Trigger

**Status:** Requires Cloudflare Dashboard — cannot be set via wrangler if token lacks Scheduled Tasks scope.

**CF Dashboard:** Workers & Pages → `rald-notify` → Triggers → Add Cron Trigger: `0 * * * *`

### Action 4 — Add RALD_ADMIN_USER_ID Secret

This UUID enables rotation alerts and health alerts to fire via email/push to the admin account.

```bash
# Get your RALD user ID after logging in
curl -H "Authorization: Bearer <YOUR_JWT>" https://auth.rald.cloud/profiles/me | jq .id
# Add as GitHub org secret: RALD_ADMIN_USER_ID = <uuid>
```

---

## Remaining Open Blockers

| ID | Description | Status | Action |
|---|---|---|---|
| C-CERT-001 | Machine identity keys not provisioned | Script committed | Operator runs provisioning script |
| C-CERT-004 | OpenObserve secrets not set | Deploy pipelines updated | Operator adds org secrets |
| P0-002 | rald-notify cron (CF Dashboard) | N/A — CF API limitation | Operator adds via CF Dashboard |

---

## Phase 2 Preview — Retention Intelligence

Phase 2 will build on Phase 1's foundation:
- Engagement scoring pipeline (Supabase → CF D1)
- Push notification trigger rules (integrates with machine identity auth from Phase 1)
- Churn prediction signals
- Waitlist to active conversion tracking

**Entry criteria:** Phase 1 PRs merged + machine identities provisioned.

---

*RALD Ecosystem — Principal Platform Engineering*  
*LILCKY STUDIO LIMITED — 2026-06-12*
