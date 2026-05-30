# RALD Kong Gateway — Disaster Recovery Plan

**Owner:** LILCKY STUDIO LIMITED  
**Classification:** Internal — Infrastructure  
**RPO:** 1 hour | **RTO:** 15 minutes (config) · 30 minutes (full)

---

## Scenarios & Playbooks

---

### Scenario 1 — Kong Process Crash

**Symptoms:** `api.rald.cloud` returning 502/504. Kong container exited.

**Impact:** All API traffic blocked. Auth fails across all RALD products.

**Steps:**

```bash
# 1. Check container status
docker ps -a | grep kong

# 2. View crash logs
docker logs rald-kong --tail 100

# 3. Restart Kong
docker compose -f docker-compose.yml -f docker-compose.production.yml restart kong

# 4. Verify
make health
curl -I https://api.rald.cloud/healthz
```

**Time to recover:** ~2 minutes

---

### Scenario 2 — Redis Failure

**Symptoms:** Rate limiting errors, 502 from Kong (if `fault_tolerant = false`).

**Impact:** Rate limiting disabled (if fault_tolerant=true, traffic passes; otherwise blocked).

**Steps:**

```bash
# 1. Check Redis
docker logs rald-redis --tail 50

# 2. Restart Redis
docker compose restart redis

# 3. Verify
docker exec rald-redis redis-cli -a $REDIS_PASSWORD ping
```

**Note:** Kong's `rate-limiting` plugin has `fault_tolerant: true` configured — traffic continues even if Redis is down. Redis failure does NOT block the API.

**Time to recover:** ~1 minute

---

### Scenario 3 — VPS Failure (Server Down)

**Symptoms:** All gateway domains unreachable. Full server loss.

**Impact:** All API traffic blocked until new server provisioned.

**Steps:**

```bash
# 1. Provision new VPS (DigitalOcean / Hetzner / AWS)
#    Min spec: 4 vCPU, 8GB RAM, Ubuntu 22.04

# 2. Run server setup script
curl -fsSL https://raw.githubusercontent.com/Ostinato-Loop/rald/main/infrastructure/kong/scripts/setup.sh | bash

# 3. Clone repo
git clone https://github.com/Ostinato-Loop/rald.git /opt/rald/rald
cd /opt/rald/rald/infrastructure/kong

# 4. Restore secrets
# Pull .env from encrypted R2 backup
aws s3 cp s3://rald-backups/kong/latest/.env.gpg .
gpg --decrypt --passphrase "$BACKUP_ENCRYPTION_KEY" .env.gpg > .env

# 5. Restore TLS certs
aws s3 cp s3://rald-backups/kong/latest/certs.tar.gz.gpg .
gpg --decrypt --passphrase "$BACKUP_ENCRYPTION_KEY" certs.tar.gz.gpg | tar -xz -C .

# 6. Deploy
make prod

# 7. Update Cloudflare DNS A records to new IP
#    api.rald.cloud → <NEW VPS IP>
#    auth.rald.cloud → <NEW VPS IP>
#    identity.rald.cloud → <NEW VPS IP>
#    credentials.rald.cloud → <NEW VPS IP>

# 8. Verify
make health
curl -I https://api.rald.cloud/healthz
```

**Time to recover:** 15–30 minutes

---

### Scenario 4 — Bad Config Deployed (kong.yml Corruption)

**Symptoms:** 404/502 on routes after a config change. Kong logs show parse errors.

**Impact:** Specific routes or all routes broken.

**Steps:**

```bash
# 1. Check what Kong loaded
curl -s http://127.0.0.1:8001/config | python3 -m json.tool | head -50

# 2. Roll back kong.yml to last known good commit
git log --oneline infrastructure/kong/kong/kong.yml | head -10
git checkout <LAST_GOOD_COMMIT> -- infrastructure/kong/kong/kong.yml

# 3. Validate
make validate

# 4. Reload without restart
make reload

# 5. Verify routes
make routes
```

**Time to recover:** ~3 minutes

---

### Scenario 5 — TLS Certificate Expiry

**Symptoms:** SSL error in browsers. Cloudflare shows SSL handshake failure.

**Note:** Cloudflare Origin CA certs have 15-year validity. This scenario is unlikely but documented.

**Steps:**

```bash
# 1. Generate new Cloudflare Origin CA cert (via dashboard)
#    SSL/TLS → Origin Server → Create Certificate

# 2. Replace certs
cp new-cert.pem certs/rald.cloud.crt
cp new-key.pem certs/rald.cloud.key
chmod 600 certs/rald.cloud.key

# 3. Reload Kong (reads new certs on reload)
docker compose -f docker-compose.yml -f docker-compose.production.yml restart kong

# 4. Verify
make health
```

---

### Scenario 6 — DDoS / Traffic Spike

**Symptoms:** Extremely high request rates. Redis rate-limit counters hitting limits. Legitimate users blocked.

**Steps:**

```bash
# 1. Check Cloudflare dashboard for attack pattern
# 2. Enable Cloudflare "Under Attack" mode (5-second challenge)
# 3. Add IP block rules in Cloudflare WAF for attacking IPs

# 4. Temporarily tighten Kong rate limits (hot-reload, no restart)
# Edit kong/kong.yml: reduce rate-limiting minute: 600 → 100
make reload

# 5. After attack subsides, restore limits
make reload
```

**First line of defense:** Cloudflare WAF and rate-limiting absorb the attack before Kong. Kong is a second layer.

---

## Runbook Contact

| Role | Contact |
|------|---------|
| Infrastructure Lead | ops@rald.cloud |
| Security Lead | security@rald.cloud |
| On-call | support@rald.cloud |

---

## Post-Incident Actions

After any Scenario 3–6:

1. Write incident report (timeline, root cause, resolution, prevention)
2. Update this playbook if new scenario discovered
3. Add monitoring/alert if one was missing
4. Commit changes to GitHub (this is the source of truth)
