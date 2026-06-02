# RECOVERY_RUNBOOK.md
**Phase:** G.9 — Pre-Production Certification  
**Workstream:** 10 — Backup & Recovery  
**Owner:** LILCKY STUDIO LIMITED  
**Date:** 2026-06-02  
**Classification:** Operational — Internal Only

---

## SCOPE

This runbook covers recovery procedures for the RALD ecosystem:
- `auth.rald.cloud` (rald-auth-core)
- `api.rald.cloud` (rald/artifacts/api-worker)
- `loop.rald.cloud` (loop)
- `messenger.rald.cloud` (messenger)
- Supabase project `onxdcikfttdmnhofsuwo`
- Cloudflare account ID `d5a1cd03b76f467430034af64a7062fd`

---

## SEVERITY DEFINITIONS

| Level | Description | Response Time |
|---|---|---|
| P0 | Complete auth failure — no users can log in | 15 minutes |
| P1 | Partial auth failure or data loss risk | 1 hour |
| P2 | Degraded service, non-auth features broken | 4 hours |
| P3 | Performance degradation, minor features | Next business day |

---

## RUNBOOK 1 — WORKER DEPLOYMENT FAILURE

**Symptoms:** CI/CD deploy fails. Old version still serving (Wrangler atomic deploy). Green checkmark missing on GitHub Actions.

**Verification:**
```bash
# Check worker status
wrangler deployments list --name rald-auth
# Expected: lists deployments with latest at top
```

**Recovery (via Cloudflare Dashboard):**
1. Go to `dash.cloudflare.com` → Workers & Pages
2. Select failing worker (`rald-auth`, `rald-api`, `loop-messenger-api`)
3. Click "Deployments" tab
4. Find the last successful deployment
5. Click "Rollback to this deployment"
6. Verify health: `curl https://auth.rald.cloud/health`

**Recovery (via Wrangler CLI):**
```bash
# List deployments
wrangler deployments list --name rald-auth

# Rollback to specific deployment ID
wrangler rollback <deployment-id> --name rald-auth
```

**Post-recovery verification:**
```bash
curl -s https://auth.rald.cloud/health | jq .
curl -s https://api.rald.cloud/health | jq .
curl -s https://messenger.rald.cloud/health | jq .
```

**Severity:** P1 if new version is broken, P3 if deploy failed but old version is fine.

---

## RUNBOOK 2 — SUPABASE UNAVAILABLE

**Symptoms:** All auth operations return 500. `GET /ready` returns `ready: false`. Supabase Status page shows incident.

**Verification:**
```bash
# Check Supabase status
curl -s https://status.supabase.com/api/v2/status.json | jq .status

# Test direct connection
curl -s "https://onxdcikfttdmnhofsuwo.supabase.co/rest/v1/" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" | jq .
```

**Recovery options:**
1. **Wait for Supabase recovery** — Supabase SLA: 99.9% uptime. Most outages resolve within 30 minutes.
2. **Check Supabase Dashboard** → `onxdcikfttdmnhofsuwo` → Project Settings → for any pausing/quota issues.
3. **If project paused (Free tier):** Resume from Supabase Dashboard → Projects → Resume.

**Escalation:** If outage > 1 hour, check `https://status.supabase.com`. Open Supabase support ticket.

**No failover DB exists.** This is a P0 — auth is completely unavailable during Supabase outage.

**Post-recovery:** Auth services recover automatically on next request after Supabase comes back. No manual restart needed (CF Workers are stateless).

---

## RUNBOOK 3 — JWT SECRET ROTATION

**When needed:** Secret compromised, periodic rotation, security incident.

**Impact:** All existing JWTs become invalid immediately. All active users are logged out.

**Procedure:**
```bash
# 1. Generate new secret (min 32 bytes)
NEW_SECRET=$(openssl rand -base64 48)

# 2. Update rald-auth-core worker secret
echo "$NEW_SECRET" | wrangler secret put RALD_JWT_SECRET --name rald-auth

# 3. Update rald/api-worker secret
echo "$NEW_SECRET" | wrangler secret put RALD_JWT_SECRET --name rald-api

# 4. Update Messenger CF Worker secret
echo "$NEW_SECRET" | wrangler secret put RALD_JWT_SECRET --name loop-messenger-api

# 5. Verify all workers redeployed (Wrangler auto-deploys on secret change)
wrangler deployments list --name rald-auth | head -3
wrangler deployments list --name rald-api | head -3
wrangler deployments list --name loop-messenger-api | head -3

# 6. Test auth flow
curl -s -X POST https://auth.rald.cloud/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"TEST_PHONE"}' | jq .
```

**IMPORTANT:** Steps 2, 3, 4 must be done in rapid succession. Between steps, old tokens are rejected by updated workers while not-yet-updated workers still accept them. Complete all 3 rotations within 5 minutes.

**User communication:** If campus pilot is live, notify users: "We've updated our security. Please log in again."

**Note:** `LOOP_JWT_SECRET` is only used in Loop. Rotate separately:
```bash
echo "$NEW_LOOP_SECRET" | wrangler secret put LOOP_JWT_SECRET --name loop-api
```

---

## RUNBOOK 4 — DATABASE BACKUP & RESTORE

### Backup (Supabase built-in)
Supabase Free tier: Daily backups, 1-day retention.  
Supabase Pro tier: Daily backups, 7-day retention + Point-in-time recovery.

**Check backup status:**
```
Supabase Dashboard → Project → Database → Backups
```

**Manual backup (if needed):**
```bash
# Requires Supabase CLI + service role key
supabase db dump \
  --db-url "postgresql://postgres:$PASSWORD@db.onxdcikfttdmnhofsuwo.supabase.co:5432/postgres" \
  -f backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore from backup
```
Supabase Dashboard → Project → Database → Backups → Restore
```
Or use PITR if on Pro plan.

### Schema re-application (if DB wiped):
```bash
# Run migrations in order from each repo:
# 1. rald-auth-core migrations
supabase db push --db-url <connection-string>

# 2. loop migrations (Supabase CLI)
supabase db push --db-url <connection-string>

# 3. messenger migrations
supabase db push --db-url <connection-string>

# 4. loop-crm migrations
supabase db push --db-url <connection-string>
```

**Migration order dependency:** rald-auth-core → loop-crm → messenger → loop (loop-crm references auth_users)

---

## RUNBOOK 5 — TERMII UNAVAILABLE

**Symptoms:** `POST /auth/send-otp` returns 502. SMS not delivered.

**Verification:**
```bash
curl -s https://api.ng.termii.com/api/ping -H "apikey: $TERMII_API_KEY"
# Check Termii status: https://status.termii.com
```

**rald/api-worker:** Automatic Twilio fallback activates. No manual intervention needed. ✅

**rald-auth-core:** No fallback. Options:
1. Wait for Termii recovery (most outages < 1 hour)
2. Temporarily enable email OTP as primary auth method (user-facing message: "SMS unavailable, use email")

**Twilio fallback configuration** (rald-auth-core — not yet implemented):
```typescript
// Add to rald-auth-core src/routes/auth.ts:
} catch (termiiErr) {
  if (c.env.TWILIO_ACCOUNT_SID) {
    return await sendTwilioOtp(phone, ...);
  }
  throw termiiErr;
}
```

---

## RUNBOOK 6 — SECRET MISSING FROM WORKER

**Symptoms:** Auth returns 500 with no specific message. Worker logs show `undefined` for expected env vars.

**Detection:**
```bash
# Check /ready endpoint
curl -s https://auth.rald.cloud/ready | jq .
# Response: { "ready": false, "checks": { "supabase": false, "jwt": false, ... } }
```

**Recovery:**
```bash
# List current secrets (names only, not values)
wrangler secret list --name rald-auth

# Re-set missing secret
echo "$SECRET_VALUE" | wrangler secret put SECRET_NAME --name rald-auth
```

**Required secrets per service:**

| Worker | Required Secrets |
|---|---|
| rald-auth | SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RALD_JWT_SECRET, TERMII_API_KEY, RESEND_API_KEY |
| rald-api | SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RALD_JWT_SECRET, TERMII_API_KEY, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, RESEND_API_KEY, RALD_ENCRYPTION_KEY |
| loop-messenger-api | RALD_JWT_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT |
| Loop (CF Pages) | SUPABASE_ANON_KEY (via GitHub Secret → deploy.yml) |

---

## RUNBOOK 7 — CLOUDFLARE KV UNAVAILABLE

**Symptoms:** Rate limiting stops working (requests pass through). 503 errors from KV operations (unlikely — KV errors are caught).

**Evidence from code:**
```typescript
// Rate limiter fails open — all requests allowed
if (!kv) return { allowed: true, ... };
// KV write failure is non-fatal
try { await kv.put(...) } catch { /* ok */ }
```

**Impact:** Service operational. Rate limiting ineffective. OTP abuse possible.  
**Action:** Monitor Termii balance during KV outage. Manually block abusive IPs via CF WAF if needed.

---

## BACKUP & RECOVERY STATUS MATRIX

| Asset | Backup Exists | RTO | RPO | Procedure |
|---|---|---|---|---|
| Supabase DB | ✅ (Supabase auto) | 1-2h | 24h (Free) / PITR (Pro) | Runbook 4 |
| CF Worker code | ✅ (GitHub + CF) | 5 min | 0 (git) | Runbook 1 |
| CF Worker secrets | ⚠️ Not backed up externally | N/A | Must re-enter manually | Runbook 6 |
| CF Pages assets | ✅ (GitHub → rebuild) | 10 min | 0 (git) | Redeploy CI |
| KV data (rate limits) | ❌ (Ephemeral by design) | N/A | N/A | N/A |
| VAPID keys | ⚠️ GitHub Secrets only | N/A | Push subscriptions lost | Generate new keys |

**FINDING (HIGH — WS10-F1):** CF Worker secrets are not backed up externally. If CF account is lost or secrets deleted, all secrets must be regenerated from scratch. All existing user sessions will be invalidated.

**FINDING (HIGH — WS10-F2):** Supabase Free tier provides only 24h backup retention. Data loss window is up to 24 hours. Pro plan with PITR recommended before campus pilot.

---

## INCIDENT RESPONSE

**Step 1 — Identify:** Check `https://auth.rald.cloud/ready` and `https://messenger.rald.cloud/health`  
**Step 2 — Scope:** Determine which services are affected (auth / messaging / both)  
**Step 3 — Communicate:** Notify campus pilot users if > 15 minutes  
**Step 4 — Recover:** Follow applicable runbook above  
**Step 5 — Post-mortem:** Document within 24 hours: what failed, why, what was fixed, what prevents recurrence

**Contact escalation:**
- Cloudflare: `https://support.cloudflare.com`
- Supabase: `https://supabase.com/support`
- Termii: `https://termii.com/contact`
- Resend: `https://resend.com/support`

---

## WS10 STATUS ASSESSMENT

| Requirement | Status |
|---|---|
| Database backup process | ⚠️ PARTIAL (Supabase auto-backup, 24h Free / PITR Pro) |
| Restore process | ✅ Documented (Runbook 4) |
| Worker rollback process | ✅ Documented (Runbook 1) |
| Secret rotation process | ✅ Documented (Runbook 3) |
| Incident response process | ✅ Documented (above) |

---

## FINDINGS SUMMARY

| ID | Severity | Finding |
|---|---|---|
| WS10-F1 | HIGH | CF Worker secrets not backed up — loss requires full secret regeneration |
| WS10-F2 | HIGH | Supabase Free tier 24h backup only — data loss window unacceptable for production |
| WS10-F3 | MEDIUM | No runbook for VAPID key rotation — all push subscriptions invalidated on rotation |
| WS10-F4 | MEDIUM | No automated health monitoring or alerting — incidents detected manually |

---

## CERTIFICATION DECISION

```
╔══════════════════════════════════════════════╗
║  WS10 — BACKUP & RECOVERY                    ║
║  CRITICAL: 0  HIGH: 2  MEDIUM: 2  LOW: 0    ║
║  DECISION: ❌  FAIL                           ║
║                                              ║
║  Runbooks: WRITTEN (this document)           ║
║  Worker rollback: DOCUMENTED ✅              ║
║  DB backup: PARTIAL (24h window only)        ║
║  Secret backup: NOT IMPLEMENTED              ║
╚══════════════════════════════════════════════╝
```

LILCKY STUDIO LIMITED — RALD G.9 Certification | 2026-06-02
