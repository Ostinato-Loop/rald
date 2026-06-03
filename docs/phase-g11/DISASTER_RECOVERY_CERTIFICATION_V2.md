# DISASTER_RECOVERY_CERTIFICATION_V2.md
**Phase:** G.11 — Ecosystem Hardening & Stabilization | Stream 6  
**Owner:** LILCKY STUDIO LIMITED  
**Date:** 2026-06-03

---

## OBJECTIVE

Verify database recovery, worker redeployment, DNS recovery, secret rotation, and service outage procedures. Create runbooks.

---

## RUNBOOK 1 — DATABASE RECOVERY (Supabase)

### Scenario: Supabase project degraded or data corrupted

**RTO (Recovery Time Objective):** <4 hours  
**RPO (Recovery Point Objective):** <24 hours (free tier) / <1 hour (Pro tier with PITR)

```
STEP 1: Check Supabase status
  → https://status.supabase.com/
  → If platform incident: wait for Supabase resolution (estimated ETA on status page)

STEP 2: Assess data impact
  → Log in to supabase.com/dashboard/project/onxdcikfttdmnhofsuwo
  → Check: Table Editor → audit_logs (should have recent entries)
  → If tables accessible but data missing: restore from backup

STEP 3: Restore from backup (Pro tier)
  → Supabase Dashboard → Settings → Backups
  → Select backup point (up to 7 days PITR on Pro)
  → Restore to new project or in-place

STEP 4: Restore from backup (Free tier)
  → Free tier: daily snapshots (7 day retention, point-in-time unavailable)
  → Export: `pg_dump postgresql://... > backup.sql`
  → Import: `psql postgresql://... < backup.sql`

STEP 5: Verify recovery
  SELECT COUNT(*) FROM audit_logs;
  SELECT COUNT(*) FROM users;
  SELECT COUNT(*) FROM messenger_conversations;

STEP 6: Update workers if project URL changed
  wrangler secret put SUPABASE_URL --name rald-auth
  wrangler secret put SUPABASE_URL --name loop-messenger-api
  wrangler secret put SUPABASE_URL --name rald-realtime
  wrangler deploy --name rald-auth
  wrangler deploy --name loop-messenger-api
  wrangler deploy --name rald-realtime

STEP 7: Communicate to pilot cohort (if >15min outage)
  → Send WhatsApp/email: "Brief maintenance — back in X minutes"
```

**Upgrade action:** Upgrade Supabase to Pro ($25/month) to enable PITR before campus pilot.

---

## RUNBOOK 2 — WORKER REDEPLOYMENT

### Scenario: Worker bug or bad deployment

**RTO:** <10 minutes (Cloudflare global propagation ~30 seconds after deploy)

```
STEP 1: Identify which worker is failing
  curl https://auth.rald.cloud/ready          # → should return 200
  curl https://messenger.rald.cloud/health    # → should return 200
  curl https://realtime.rald.cloud/health     # → should return 200

STEP 2: Check recent deploys
  wrangler deployments list --name rald-auth
  wrangler deployments list --name loop-messenger-api
  wrangler deployments list --name rald-realtime

STEP 3a: Rollback to previous deployment
  wrangler rollback --name rald-auth
  wrangler rollback --name loop-messenger-api
  wrangler rollback --name rald-realtime

STEP 3b: If rollback insufficient, fix and redeploy
  git pull                    # Get latest main
  [fix the issue]
  git commit -am "fix: ..."
  git push origin main        # CI/CD triggers deploy
  # OR manual deploy:
  wrangler deploy --name rald-auth

STEP 4: Verify
  curl https://auth.rald.cloud/ready  → { "ready": true }
  curl https://messenger.rald.cloud/health  → { "status": "ok" }
  curl https://realtime.rald.cloud/health  → { "status": "ok" }

STEP 5: Monitor for 15 minutes
  Cloudflare Dashboard → Workers → Error rate → should drop to <1%
```

---

## RUNBOOK 3 — DNS RECOVERY

### Scenario: rald.cloud domain or DNS record failure

**RTO:** <2 hours (DNS propagation after fix)

```
STEP 1: Identify DNS issue
  dig auth.rald.cloud          # Should resolve to Cloudflare proxy IP
  dig messenger.rald.cloud     # Should resolve to Cloudflare proxy IP
  dig realtime.rald.cloud      # Should resolve to Cloudflare proxy IP

STEP 2: Check Cloudflare DNS dashboard
  → dash.cloudflare.com → rald.cloud → DNS
  → Verify A/CNAME records point to Workers routes

STEP 3: Verify Worker routes
  wrangler routes list --name rald-auth
  # Should show: auth.rald.cloud/* → rald-auth

STEP 4: If route missing, re-add
  wrangler deploy --name rald-auth  # Re-registers routes from wrangler.toml

STEP 5: Check domain registration
  → Registrar: verify rald.cloud hasn't expired
  → Cloudflare nameservers: verify NS records at registrar

STEP 6: If full DNS failure (unlikely — CF manages DNS internally for Worker routes)
  → Wait for CF propagation (<5 minutes within CF network)
  → External DNS propagation: up to 48 hours (TTL-dependent)
```

---

## RUNBOOK 4 — SECRET ROTATION

### Scenario: RALD_JWT_SECRET suspected compromise

**RTO:** <30 minutes (new secret deployed; existing sessions invalidated)

```
WARNING: Rotating RALD_JWT_SECRET invalidates ALL active user sessions.
         Users must re-authenticate. Communicate before rotating.

STEP 1: Announce maintenance window (15 minutes)

STEP 2: Generate new secret (32+ bytes, cryptographically random)
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

STEP 3: Update secret across ALL workers simultaneously
  wrangler secret put RALD_JWT_SECRET --name rald-auth
  wrangler secret put RALD_JWT_SECRET --name loop-messenger-api
  wrangler secret put RALD_JWT_SECRET --name rald-realtime
  [Enter new secret value for each]

STEP 4: Redeploy all workers
  wrangler deploy --name rald-auth
  wrangler deploy --name loop-messenger-api
  wrangler deploy --name rald-realtime

STEP 5: Verify new secret active
  curl https://auth.rald.cloud/ready  → { "ready": true }
  # Request a new OTP and complete login → new JWT should work

STEP 6: Update GitHub Secrets (if used in CI/CD)
  GitHub → Ostinato-Loop/[repo] → Settings → Secrets → RALD_JWT_SECRET

STEP 7: Monitor for 30 minutes
  → audit_logs: verify login_success events continue
  → No auth_failed spikes
```

### Scenario: Provider credential compromise (CALLS_APP_SECRET, etc.)

```
STEP 1: Rotate credential in provider dashboard
  → Cloudflare Dashboard → Calls → App → Rotate Secret
  → LiveKit Dashboard → API Keys → Rotate
  → Tencent Console → TRTC → Security → Rotate

STEP 2: Update in Cloudflare Workers Secrets
  wrangler secret put CALLS_APP_SECRET --name rald-realtime
  wrangler deploy --name rald-realtime

STEP 3: Verify
  curl https://realtime.rald.cloud/health/providers  → all healthy
```

---

## RUNBOOK 5 — SERVICE OUTAGE (Platform Incident)

### Cloudflare Platform Outage

```
Source: https://www.cloudflarestatus.com/
Impact: All Cloudflare Workers (auth, messenger, realtime) degraded

Action:
1. Do not attempt to fix — this is a CF infrastructure issue
2. Monitor CF status page for ETA
3. Communicate to cohort if >15 minutes
4. No code changes during CF incident (changes won't deploy anyway)
5. Post-incident: verify all workers healthy
```

### Termii SMS Outage

```
Impact: OTP delivery fails — users cannot register/login

Action:
1. Check https://status.termii.com/
2. If Termii down: activate email OTP (POST /send-login-email-otp via Resend)
   → Requires: RESEND_API_KEY + verified domain in rald-auth-core
3. If both SMS + email down: implement temporary bypass for internal testing only
4. Communicate to cohort: "SMS delayed — try email login"
```

### Supabase Outage

```
Impact: Auth and database writes fail

Action:
1. Check https://status.supabase.com/
2. Read operations may still work (primary vs replica)
3. Do not attempt database changes during outage
4. After resolution: verify audit_logs continuity
   SELECT MAX(created_at) FROM audit_logs;  -- Should be recent
```

---

## BACKUP STATUS

| Data | Backup Method | Frequency | Retention |
|---|---|---|---|
| Supabase (free tier) | Automated snapshots | Daily | 7 days |
| Cloudflare Worker code | GitHub (main branch) | Per commit | Indefinite |
| Secrets | Cloudflare Workers Secrets | Manual rotation | N/A |
| KV data (rate limits, health) | Ephemeral | TTL-based | Not backed up |

**Recommendation:** Upgrade Supabase to Pro for PITR (point-in-time recovery). $25/month.

---

## CERTIFICATION DECISION

```
╔══════════════════════════════════════════════════════════════╗
║  G.11 STREAM 6 — DISASTER RECOVERY CERTIFICATION V2          ║
║                                                              ║
║  Database recovery runbook:    ✅                            ║
║  Worker redeployment runbook:  ✅                            ║
║  DNS recovery runbook:         ✅                            ║
║  Secret rotation runbook:      ✅ (JWT + provider creds)     ║
║  Service outage procedures:    ✅ (CF, Termii, Supabase)     ║
║  RTO defined:                  ✅ DB<4h, Worker<10m, DNS<2h  ║
║  RPO defined:                  ✅ <24h (free) / <1h (Pro)   ║
║  Backup status documented:     ✅                            ║
║                                                              ║
║  Action: upgrade Supabase to Pro before Level 3              ║
║                                                              ║
║  STATUS: ✅ PASS                                              ║
╚══════════════════════════════════════════════════════════════╝
```

LILCKY STUDIO LIMITED — RALD G.11 | 2026-06-03
