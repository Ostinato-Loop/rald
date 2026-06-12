# C-CERT-004 — Centralized Log Shipping Operator Guide
**Phase 1 — Public Beta Blockers**  
**Date:** 2026-06-12  
**Status:** Deploy.yml updated. Secrets not yet pushed.  

---

## What This Fixes

All RALD services have the OpenObserve log shipping middleware (`requestLogger`) built in. The middleware ships structured JSON logs to OpenObserve when two secrets are set on each worker:
- `OPEN_OBSERVE_API_KEY` — your OpenObserve API key
- `OPEN_OBSERVE_ENDPOINT` — the per-service ingest URL

Without these secrets, logs go only to Cloudflare's ephemeral tail logger (no cross-service correlation, no audit trail retention).

---

## Step 1 — Add Org Secrets to GitHub

Go to: **GitHub → Ostinato-Loop org → Settings → Secrets → Actions → New organization secret**

Add these secrets (select "All repositories" or select each repo individually):

| Secret Name | Value |
|---|---|
| `OPEN_OBSERVE_API_KEY` | Your OpenObserve API key from the OpenObserve dashboard |
| `OPEN_OBSERVE_ENDPOINT_AUTH` | `https://observe.rald.cloud/api/rald/rald-auth-core/_json` |
| `OPEN_OBSERVE_ENDPOINT_NOTIFY` | `https://observe.rald.cloud/api/rald/rald-notify/_json` |
| `OPEN_OBSERVE_ENDPOINT_SEARCH` | `https://observe.rald.cloud/api/rald/rald-search/_json` |
| `OPEN_OBSERVE_ENDPOINT_REALTIME` | `https://observe.rald.cloud/api/rald/rald-realtime/_json` |
| `OPEN_OBSERVE_ENDPOINT_INBOX` | `https://observe.rald.cloud/api/rald/rald-inbox/_json` |
| `OPEN_OBSERVE_ENDPOINT_LOOP` | `https://observe.rald.cloud/api/rald/loop-api/_json` |
| `OPEN_OBSERVE_ENDPOINT_MESSENGER` | `https://observe.rald.cloud/api/rald/messenger/_json` |

---

## Step 2 — Trigger Deploys

After adding the secrets, trigger a redeploy on each repo to push the secrets to the workers:

```bash
# Option 1: Push an empty commit to each repo
git commit --allow-empty -m "chore: trigger redeploy (C-CERT-004 observability secrets)"

# Option 2: Trigger via GitHub Actions UI
# Go to each repo → Actions → Deploy → Run workflow
```

**Repos to redeploy:**
- `rald-auth-core` → auth.rald.cloud
- `rald-notify` → notification.rald.cloud  
- `rald-search` → search.rald.cloud
- `rald-realtime` → realtime.rald.cloud
- `rald-inbox` → (inbox.rald.cloud)
- `loop` → loop-api.rald.cloud
- `messenger` → messenger.rald.cloud

---

## Step 3 — Verify Log Shipping

After redeploy, make a request to any service and check OpenObserve:

```bash
# Test request
curl https://auth.rald.cloud/health

# Check OpenObserve dashboard
# Go to: https://observe.rald.cloud
# Select stream: rald-auth-core
# You should see the health check request logged
```

---

## Step 4 — Set Up Log Retention Policy

In OpenObserve dashboard:
- Streams → rald-* → Set retention to 30 days minimum
- Create an alert for: error_rate > 5% over 5 minutes

---

## OpenObserve Log Format

All workers ship logs in this format:
```json
{
  "timestamp": "2026-06-12T14:30:00.000Z",
  "service": "rald-auth-core",
  "method": "POST",
  "path": "/auth/login",
  "status": 200,
  "latency_ms": 45,
  "request_id": "req_abc123",
  "user_agent": "RALD-SDK/1.0",
  "cf_ray": "...",
  "cf_country": "NG"
}
```

Use `request_id` to trace a request across multiple services.

---

*Operator Guide · RALD Platform Engineering · LILCKY STUDIO LIMITED · 2026-06-12*
