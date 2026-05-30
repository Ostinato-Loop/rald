# RALD Kong Gateway — Backup Strategy

**Owner:** LILCKY STUDIO LIMITED  
**RPO (Recovery Point Objective):** 1 hour  
**RTO (Recovery Time Objective):** 15 minutes

---

## What Needs Backing Up

| Component | Location | Criticality | Backup Method |
|-----------|----------|-------------|---------------|
| `kong/kong.yml` | GitHub (source of truth) | 🔴 Critical | Git — always current |
| Redis rate-limit data | Docker volume | 🟡 Low | Loss = counters reset (acceptable) |
| TLS certificates | `certs/` directory | 🔴 Critical | Encrypted S3/R2 backup |
| `.env` secrets | Server filesystem | 🔴 Critical | Secrets manager / encrypted backup |
| Prometheus data | Docker volume | 🟢 Low | Grafana Cloud or S3 |
| Grafana dashboards | Docker volume | 🟡 Medium | JSON export to Git |

---

## Automated Backup Script

```bash
#!/usr/bin/env bash
# /opt/rald/scripts/backup.sh
# Run via cron: 0 * * * * /opt/rald/scripts/backup.sh

set -euo pipefail

BACKUP_DIR="/opt/rald/backups/$(date +%Y%m%d-%H%M%S)"
R2_BUCKET="s3://rald-backups/kong"  # Cloudflare R2 or AWS S3
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

echo "[backup] Starting RALD Kong backup at $(date)"

# 1. Config (always in Git — but snapshot for point-in-time)
cp /opt/rald/rald/infrastructure/kong/kong/kong.yml "$BACKUP_DIR/kong.yml"

# 2. TLS Certificates (encrypted)
tar -czf "$BACKUP_DIR/certs.tar.gz" /opt/rald/rald/infrastructure/kong/certs/
gpg --symmetric --cipher-algo AES256 --batch --yes \
    --passphrase "$BACKUP_ENCRYPTION_KEY" \
    "$BACKUP_DIR/certs.tar.gz"
rm "$BACKUP_DIR/certs.tar.gz"

# 3. Redis RDB snapshot
docker exec rald-redis redis-cli -a "$REDIS_PASSWORD" BGSAVE
sleep 5
docker cp rald-redis:/data/dump.rdb "$BACKUP_DIR/redis-dump.rdb"

# 4. Grafana dashboards export
curl -s -u "admin:$GRAFANA_ADMIN_PASSWORD" \
    http://127.0.0.1:3000/api/dashboards/home \
    > "$BACKUP_DIR/grafana-dashboards.json"

# 5. Upload to R2/S3
aws s3 sync "$BACKUP_DIR" "$R2_BUCKET/$(date +%Y%m%d-%H%M%S)/" \
    --endpoint-url https://<ACCOUNT_ID>.r2.cloudflarestorage.com

# 6. Prune local backups older than 7 days
find /opt/rald/backups -type d -mtime +7 -exec rm -rf {} + 2>/dev/null || true

# 7. Prune remote backups older than retention
aws s3 ls "$R2_BUCKET/" | awk '{print $2}' | while read -r prefix; do
  date_str="${prefix%/}"
  if [[ "$(date -d "$date_str" +%s 2>/dev/null || echo 0)" -lt "$(date -d "-$RETENTION_DAYS days" +%s)" ]]; then
    aws s3 rm --recursive "$R2_BUCKET/$prefix"
  fi
done

echo "[backup] Completed at $(date) → $BACKUP_DIR"
```

---

## Cron Setup

```bash
# Edit crontab as rald user
crontab -e

# Add:
# Hourly backups
0 * * * * /opt/rald/scripts/backup.sh >> /var/log/rald-backup.log 2>&1

# Daily verification test
30 3 * * * /opt/rald/scripts/verify-backup.sh >> /var/log/rald-backup-verify.log 2>&1
```

---

## Backup Verification Script

```bash
#!/usr/bin/env bash
# /opt/rald/scripts/verify-backup.sh

LATEST=$(ls -t /opt/rald/backups/ | head -1)
BACKUP="/opt/rald/backups/$LATEST"

echo "[verify] Checking backup $LATEST"

# Verify kong.yml is valid
docker run --rm \
  -v "$BACKUP/kong.yml:/kong/declarative/kong.yml:ro" \
  kong/kong-gateway:3.7 \
  kong config parse /kong/declarative/kong.yml \
  && echo "[verify] kong.yml: PASS" \
  || echo "[verify] kong.yml: FAIL"

# Verify Redis dump exists and is non-empty
[ -s "$BACKUP/redis-dump.rdb" ] \
  && echo "[verify] Redis dump: PASS" \
  || echo "[verify] Redis dump: FAIL"

echo "[verify] Done"
```

---

## Kong Config Recovery (Primary Path)

Since `kong.yml` is **always in GitHub**, the primary recovery is:

```bash
git clone https://github.com/Ostinato-Loop/rald.git
cd rald/infrastructure/kong
cp .env.example .env && nano .env  # restore secrets
make prod
# Done — full recovery in under 15 minutes
```

---

## Secret Recovery

Secrets (`.env`, TLS keys) are **never in Git**. Recovery paths:

1. **Primary:** Pull from encrypted backup in Cloudflare R2
2. **Secondary:** Re-generate (Cloudflare Origin CA cert) + re-issue secrets via Wrangler

---

## Monitoring Backup Health

Add a Grafana alert if backup hasn't run in 2 hours:

```yaml
# In Grafana alerting
condition: last(file_mtime("/var/log/rald-backup.log")) > 7200
severity: critical
notify: ops@rald.cloud
```
