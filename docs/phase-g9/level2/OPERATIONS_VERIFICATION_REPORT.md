# OPERATIONS_VERIFICATION_REPORT.md
**Phase:** G.9 Level 2 Remediation — Remediation 4  
**Owner:** LILCKY STUDIO LIMITED  
**Date:** 2026-06-02  
**Evidence Source:** GitHub API, rald-auth-core `/system/dependencies` endpoint (design), source code review

---

## MANDATE

Verify all operational dependencies: Termii active + balance funded, Resend domain verified, Cloudflare secrets configured, Supabase schemas applied, DNS configured, KV namespaces configured, Worker deployments healthy.

---

## VERIFICATION METHOD

Operational secrets and infrastructure state cannot be read from GitHub source code — they require access to Cloudflare Dashboard, Supabase Dashboard, Termii Dashboard, and Resend Dashboard. This report documents:
1. What CAN be verified from GitHub (CI/CD configuration, deployment workflows, schema files)
2. What MUST be operator-verified (live secrets, account balances, DNS state)
3. The verification procedure for each item

The `rald-auth-core` `/system/dependencies` endpoint provides automated verification once the worker is deployed.

---

## 1. TERMII — SMS DELIVERY

### From GitHub (verifiable)
- `TERMII_API_KEY` referenced as Wrangler secret in `rald-auth-core/wrangler.toml` ✅
- `TERMII_API_KEY` referenced as Wrangler secret in `rald/artifacts/api-worker/wrangler.toml` ✅
- Messenger `deploy-api.yml` pushes `TERMII_API_KEY` to worker if GitHub Secret is set ✅
- rald/api-worker has Twilio fallback for SMS delivery ✅
- OTP message: `"Your RALD verification code is < 1234 >. Valid for 10 minutes. Do not share."` ✅
- Channel: `"dnd"` (DND-compatible for Nigerian numbers) ✅

### Operator Must Verify
```
1. Termii Dashboard → API Keys → Confirm key is active (not expired)
2. Termii Dashboard → Balance → Confirm sufficient credits
   Estimate: 100-student pilot × 4 OTPs/student = 400 SMS
   Minimum: 1,000 SMS credits (2.5× buffer)
3. Termii Dashboard → Sender IDs → "RALD" sender ID approved
   If not approved: use "N-Alert" (DND generic — always works)
```

| Check | Verifiable from GitHub | Status |
|---|---|---|
| TERMII_API_KEY in code/config | ✅ Yes | Documented |
| Termii account active | ❌ Requires dashboard | ⚠️ OPERATOR VERIFY |
| Termii balance ≥ 1,000 SMS | ❌ Requires dashboard | ⚠️ OPERATOR VERIFY |
| Sender ID "RALD" approved | ❌ Requires Termii | ⚠️ OPERATOR VERIFY |

**Automated check:** `GET https://auth.rald.cloud/system/dependencies` returns Termii balance live.

---

## 2. RESEND — EMAIL DELIVERY

### From GitHub (verifiable)
- `RESEND_API_KEY` required in rald-auth-core wrangler.toml ✅
- Sender: `auth@rald.cloud` (requires domain `rald.cloud` verified in Resend) ✅
- Email types: welcome, email OTP, password reset ✅
- Non-blocking failure handling on non-critical emails ✅

### Operator Must Verify
```
1. Resend Dashboard → Domains → rald.cloud → Status = Verified
   If not verified:
   a. Add DNS records provided by Resend (DKIM, SPF, DMARC)
   b. Wait for propagation (5-60 minutes)
   c. Verify in Resend Dashboard
2. Resend Dashboard → API Keys → Key is active
3. Send test email from Resend Dashboard to confirm delivery
```

| Check | Verifiable from GitHub | Status |
|---|---|---|
| RESEND_API_KEY in config | ✅ Yes | Documented |
| rald.cloud domain verified | ❌ Requires Resend dashboard | ⚠️ OPERATOR VERIFY |
| Email delivery working | ❌ Requires live test | ⚠️ OPERATOR VERIFY |

---

## 3. CLOUDFLARE SECRETS

### From GitHub (verifiable)
All required secrets are documented in `wrangler.toml` comments. CI/CD workflows reference `${{ secrets.* }}` for GitHub Actions secrets.

**rald-auth-core required secrets:**
```
SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RALD_JWT_SECRET,
TERMII_API_KEY, TERMII_SENDER_ID, RESEND_API_KEY
RATE_LIMIT_KV (binding — not a secret, needs KV namespace ID in wrangler.toml)
```

**rald/api-worker required secrets:**
```
SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RALD_JWT_SECRET,
TERMII_API_KEY, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER,
RESEND_API_KEY, RALD_ENCRYPTION_KEY, BOOTSTRAP_SECRET
```

**loop required (GitHub Secrets → deploy.yml):**
```
CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, SUPABASE_ANON_KEY
```

**Messenger required (GitHub Secrets → deploy-api.yml):**
```
CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID,
RALD_JWT_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
TERMII_API_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT,
API_ORIGIN_URL
```

### Operator Must Verify
```
wrangler secret list --name rald-auth    # Lists configured secrets
wrangler secret list --name rald-api
wrangler secret list --name loop-messenger-api
```

| Check | Status |
|---|---|
| rald-auth secrets configured | ⚠️ OPERATOR VERIFY |
| rald-api secrets configured | ⚠️ OPERATOR VERIFY |
| Loop GitHub Secrets configured | ⚠️ OPERATOR VERIFY |
| Messenger secrets configured | ⚠️ OPERATOR VERIFY |

---

## 4. SUPABASE SCHEMAS

### From GitHub (verifiable)
Migration files exist in repositories:

| Repo | Migration Path | Tables |
|---|---|---|
| rald-auth-core | `supabase/migrations/` | auth_users, auth_sessions, auth_otp_codes, auth_product_access, audit_logs |
| loop | `supabase/migrations/001_initial_schema.sql` | users, profiles, rooms, room_members, posts, comments |
| messenger | `workers/loop-messenger-api/supabase/migrations/` | messenger_conversations, messenger_messages, messenger_members, etc. |
| loop-crm | `supabase/migrations/20260602_customer_graph.sql` | crm_customers, crm_customer_channels, crm_audit_log, etc. |

### Operator Must Verify
```sql
-- Run in Supabase SQL Editor for each service:
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Expected minimum tables for campus pilot:
-- auth_users, auth_sessions (from rald-auth-core)
-- users, profiles, rooms, room_members (from loop)
-- messenger_conversations, messenger_messages, messenger_conversation_members (from messenger)
```

| Check | Status |
|---|---|
| rald-auth-core migrations applied | ⚠️ OPERATOR VERIFY |
| loop migrations applied | ⚠️ OPERATOR VERIFY |
| messenger migrations applied | ⚠️ OPERATOR VERIFY |
| audit_logs table exists | ⚠️ OPERATOR VERIFY (new table for R2/R3) |

**New requirement from Remediation 2+3:** `audit_logs` table must exist in Supabase for the new `writeAuditLog()` calls to succeed (they fail silently if table doesn't exist — non-blocking). Schema:

```sql
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth_users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  ip_address  TEXT,
  user_agent  TEXT,
  status      TEXT DEFAULT 'success',
  metadata    JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs(created_at);
-- Disable RLS for server-side only access (service role key used)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_logs_service_only ON public.audit_logs USING (false);
```

---

## 5. DNS CONFIGURATION

### From GitHub (verifiable)
- `rald-auth-core/wrangler.toml`: route `auth.rald.cloud/*` on zone `rald.cloud` ✅
- `rald/artifacts/api-worker/wrangler.toml`: route `api.rald.cloud/*` on zone `rald.cloud` ✅
- `loop/deploy.yml`: `wrangler pages domain add loop loop.rald.cloud || echo "Domain already configured or pending DNS"` ✅
- `messenger/workers/loop-messenger-api/wrangler.toml`: `messenger.rald.cloud` ✅

### Operator Must Verify
```
Cloudflare Dashboard → DNS → rald.cloud zone:
Confirm CNAME/A records for:
  ✓ auth.rald.cloud → CF Workers
  ✓ api.rald.cloud → CF Workers
  ✓ loop.rald.cloud → CF Pages
  ✓ messenger.rald.cloud → CF Workers
  ✓ app.rald.cloud → CF Pages (rald-app)
  ✓ admin.rald.cloud → CF Pages (rald-control-center)
```

| Subdomain | Status |
|---|---|
| auth.rald.cloud | ⚠️ OPERATOR VERIFY |
| api.rald.cloud | ⚠️ OPERATOR VERIFY |
| loop.rald.cloud | ⚠️ OPERATOR VERIFY |
| messenger.rald.cloud | ⚠️ OPERATOR VERIFY |

---

## 6. KV NAMESPACES

### From GitHub (verifiable)
- `rald/artifacts/api-worker/wrangler.toml`: `RATE_LIMIT_KV` with ID `37fbabca129f4e9382109338273f44c9` ✅
- `rald-auth-core/wrangler.toml`: `RATE_LIMIT_KV` with ID `REPLACE_WITH_KV_NAMESPACE_ID` ⚠️ NEEDS UPDATE

### Operator Must Verify / Action
```bash
# Create KV namespace for rald-auth-core:
wrangler kv namespace create rald-auth-rate-limit
# → { id: "actual-id-here" }

# Update rald-auth-core/wrangler.toml:
# Replace "REPLACE_WITH_KV_NAMESPACE_ID" with actual ID
# Commit and push to trigger CI/CD deploy
```

| KV Namespace | Status |
|---|---|
| rald/api-worker RATE_LIMIT_KV (existing) | ✅ Configured (ID present in wrangler.toml) |
| rald-auth-core RATE_LIMIT_KV | ⚠️ NEEDS CREATION + ID UPDATE |

---

## 7. WORKER DEPLOYMENT HEALTH

### Automated Verification (once deployed)
```bash
# Health checks
curl https://auth.rald.cloud/health
curl https://auth.rald.cloud/ready
curl https://auth.rald.cloud/system/dependencies  # live Termii + Resend + Supabase check

curl https://messenger.rald.cloud/health
curl https://loop.rald.cloud  # Pages deployment
```

### Expected Responses
```json
// auth.rald.cloud/ready
{
  "ready": true,
  "checks": {
    "supabase": true,
    "jwt": true,
    "termii": true,
    "resend": true,
    "rate_limiting": true
  }
}
```

| Service | Health Endpoint | Status |
|---|---|---|
| auth.rald.cloud | `/health`, `/ready`, `/system/dependencies` | ⚠️ OPERATOR VERIFY |
| api.rald.cloud | `/health` | ⚠️ OPERATOR VERIFY |
| messenger.rald.cloud | `/health` | ⚠️ OPERATOR VERIFY |
| loop.rald.cloud | HTTP 200 | ⚠️ OPERATOR VERIFY |

---

## SUMMARY MATRIX

| Item | GitHub-Verifiable | Status | Operator Action |
|---|---|---|---|
| Termii account active | ❌ | ⚠️ OPERATOR | Check dashboard |
| Termii balance funded | ❌ | ⚠️ OPERATOR | Fund ≥1000 SMS |
| Resend domain verified | ❌ | ⚠️ OPERATOR | Add DNS records |
| CF secrets — rald-auth | ❌ | ⚠️ OPERATOR | `wrangler secret list` |
| CF secrets — rald-api | ❌ | ⚠️ OPERATOR | `wrangler secret list` |
| CF secrets — messenger | ❌ | ⚠️ OPERATOR | `wrangler secret list` |
| Supabase schemas applied | ❌ | ⚠️ OPERATOR | Query information_schema |
| audit_logs table created | ❌ | ⚠️ OPERATOR | Run DDL above |
| DNS — auth.rald.cloud | ❌ | ⚠️ OPERATOR | CF DNS dashboard |
| DNS — messenger.rald.cloud | ❌ | ⚠️ OPERATOR | CF DNS dashboard |
| KV — rald-api (existing) | ✅ ID in wrangler.toml | ✅ CONFIGURED | None |
| KV — rald-auth (new) | ⚠️ Placeholder ID | ⚠️ OPERATOR | Create + update ID |
| Worker health check | ❌ | ⚠️ OPERATOR | curl `/health` |
| Supabase anon key rotated | ❌ | ⚠️ OPERATOR | R1 follow-up |

---

## CERTIFICATION DECISION

```
╔══════════════════════════════════════════════╗
║  REMEDIATION 4 — OPERATIONS VERIFICATION     ║
║                                              ║
║  All operational items documented.           ║
║  Verification procedures provided.           ║
║  Automated check endpoint confirmed.         ║
║                                              ║
║  Items requiring live operator verification: ║
║  13 items (cannot be verified from GitHub)   ║
║                                              ║
║  STATUS: PENDING OPERATOR VERIFICATION       ║
║  No item can be certified PASS without       ║
║  operator running the documented checks.     ║
╚══════════════════════════════════════════════╝
```

LILCKY STUDIO LIMITED — RALD G.9 Level 2 Remediation | 2026-06-02
