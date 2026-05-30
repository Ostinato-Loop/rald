# RALD Kong Gateway — Production Deployment Guide

**Owner:** LILCKY STUDIO LIMITED  
**Service:** `api.rald.cloud` · `auth.rald.cloud` · `identity.rald.cloud` · `credentials.rald.cloud`

---

## Architecture Overview

```
Internet
    │
    ▼
Cloudflare  ──── CDN · DDoS · WAF · SSL Termination
    │
    ▼
Kong Gateway (VPS — Docker)
    │   ├── JWT Validation
    │   ├── API Key Auth
    │   ├── Rate Limiting (Redis)
    │   ├── CORS
    │   ├── Request Logging
    │   └── Prometheus Metrics
    │
    ├──▶ api.rald.cloud  (RALD Auth Worker)
    ├──▶ loop.rald.cloud  (Loop Worker)
    ├──▶ messenger.rald.cloud  (Messenger Worker)
    ├──▶ payrald.rald.cloud  (PayRALD Worker)
    ├──▶ dispatch.rald.cloud  (Logistics Worker)
    ├──▶ git.rald.cloud  (GitRALD Worker)
    └──▶ ai.rald.cloud  (AI Worker)
```

---

## Prerequisites

- Ubuntu 22.04 LTS or Debian 12 VPS (min 4 vCPU, 8GB RAM, 80GB SSD)
- Docker 24+ and Docker Compose v2
- Domain DNS managed in Cloudflare
- A Cloudflare account with Cloudflare WAF enabled
- `make`, `curl`, `python3` on the host

---

## 1. Server Setup

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker && systemctl start docker

# Install Docker Compose v2
apt install docker-compose-plugin -y

# Create app user
useradd -m -s /bin/bash rald
usermod -aG docker rald

# Clone infrastructure repo
su - rald
git clone https://github.com/Ostinato-Loop/rald.git
cd rald/infrastructure/kong
```

---

## 2. SSL Certificates

RALD uses **Cloudflare Origin CA** certificates (not Let's Encrypt), because Cloudflare terminates public TLS. The cert only needs to be trusted by Cloudflare.

```bash
mkdir -p certs

# Download Cloudflare Origin CA root
curl -o certs/cloudflare-origin-pull-ca.pem \
  https://developers.cloudflare.com/ssl/static/authenticated_origin_pull_ca.pem
```

In Cloudflare Dashboard:
1. **SSL/TLS** → **Origin Server** → **Create Certificate**
2. Select hostnames: `*.rald.cloud`, `rald.cloud`
3. Validity: 15 years
4. Download as **PEM** format
5. Save as `certs/rald.cloud.crt` and `certs/rald.cloud.key`

```bash
chmod 600 certs/rald.cloud.key
```

---

## 3. Environment Configuration

```bash
cp .env.example .env
nano .env
```

Fill in at minimum:
```env
REDIS_PASSWORD=<generate: openssl rand -base64 32>
GRAFANA_ADMIN_PASSWORD=<generate: openssl rand -base64 32>
```

---

## 4. Validate Kong Configuration

**Always validate before deploying:**

```bash
make validate
```

Expected output:
```
parse successful
```

---

## 5. Deploy

```bash
# Production
make prod

# Verify health
make health
```

---

## 6. Cloudflare DNS Configuration

For each gateway domain, set:

| Type  | Name                    | Value              | Proxy |
|-------|-------------------------|--------------------|-------|
| A     | api.rald.cloud          | `<VPS IP>`         | ✅ Proxied |
| A     | auth.rald.cloud         | `<VPS IP>`         | ✅ Proxied |
| A     | identity.rald.cloud     | `<VPS IP>`         | ✅ Proxied |
| A     | credentials.rald.cloud  | `<VPS IP>`         | ✅ Proxied |

In Cloudflare **SSL/TLS** settings:
- Mode: **Full (Strict)**
- Enable **Authenticated Origin Pulls**
- Enable **Always Use HTTPS**

---

## 7. Cloudflare Firewall Rules

Create a WAF rule to **block** all traffic to Kong ports (8000, 8443) that doesn't come from Cloudflare IPs:

```
(not ip.src in $cloudflare_ips and http.host in {"api.rald.cloud" "auth.rald.cloud" "identity.rald.cloud" "credentials.rald.cloud"})
→ Block
```

---

## 8. Nginx Reverse Proxy (Kong → Host Ports)

If running Kong behind host Nginx (optional, for managing multiple services on one IP):

```nginx
upstream kong_proxy {
    server 127.0.0.1:8000;
    keepalive 64;
}

server {
    listen 80;
    server_name api.rald.cloud auth.rald.cloud identity.rald.cloud credentials.rald.cloud;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name api.rald.cloud auth.rald.cloud identity.rald.cloud credentials.rald.cloud;

    ssl_certificate     /etc/kong/certs/rald.cloud.crt;
    ssl_certificate_key /etc/kong/certs/rald.cloud.key;

    location / {
        proxy_pass http://kong_proxy;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 9. Zero-Downtime Config Updates

When `kong/kong.yml` changes (committed to GitHub):

```bash
# Pull latest config
git pull origin main

# Reload Kong without downtime
make reload
```

Kong DBless mode supports hot-reload via the Admin API — no service restart required.

---

## 10. Monitoring

- **Prometheus:** `http://127.0.0.1:9090` (internal only)
- **Grafana:** `https://monitoring.rald.cloud` (after DNS setup)

Import the official Kong dashboard: Grafana Dashboard ID `7424`

---

## 11. Upgrading Kong

```bash
# Pull new image
docker pull kong/kong-gateway:3.8   # or latest

# Rolling update (production)
docker compose -f docker-compose.yml -f docker-compose.production.yml pull kong
docker compose -f docker-compose.yml -f docker-compose.production.yml up -d --no-deps kong

# Verify
make health
```

---

## Troubleshooting

| Symptom | Check |
|---------|-------|
| 502 Bad Gateway | `make logs` — upstream Cloudflare Worker reachable? |
| 429 Rate Limited | `make plugins` — Redis connected? |
| 401 Unauthorized | JWT secret matches `RALD_JWT_SECRET`? |
| Config not loading | `make validate` — syntax error in kong.yml? |
| Redis connection failed | `make logs-redis` — password correct? |
