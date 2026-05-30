#!/usr/bin/env bash
# ============================================================
# RALD Kong Gateway — Server Setup Script
# Runs on fresh Ubuntu 22.04 / Debian 12 VPS
# Usage: curl -fsSL https://raw.githubusercontent.com/Ostinato-Loop/rald/main/infrastructure/kong/scripts/setup.sh | bash
# ============================================================

set -euo pipefail

RALD_USER=rald
APP_DIR=/opt/rald

echo "════════════════════════════════════════"
echo "  RALD Kong Gateway — Server Setup"
echo "  LILCKY STUDIO LIMITED"
echo "════════════════════════════════════════"

# ── System update ─────────────────────────────────────────────────────────────
apt-get update -qq && apt-get upgrade -y -qq

# ── Install dependencies ──────────────────────────────────────────────────────
apt-get install -y -qq \
  curl wget git make python3 \
  jq unzip ca-certificates gnupg \
  fail2ban ufw

# ── Install Docker ────────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  echo "▶ Installing Docker…"
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker && systemctl start docker
fi

# ── Install Docker Compose v2 ─────────────────────────────────────────────────
if ! docker compose version &>/dev/null; then
  apt-get install -y docker-compose-plugin
fi

# ── Create RALD user ──────────────────────────────────────────────────────────
if ! id "$RALD_USER" &>/dev/null; then
  useradd -m -s /bin/bash "$RALD_USER"
fi
usermod -aG docker "$RALD_USER"

# ── App directory ─────────────────────────────────────────────────────────────
mkdir -p "$APP_DIR"
chown "$RALD_USER:$RALD_USER" "$APP_DIR"

# ── UFW Firewall ──────────────────────────────────────────────────────────────
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP (redirect to HTTPS via Cloudflare)
ufw allow 443/tcp   # HTTPS
# Kong ports — only reachable via Cloudflare (never direct)
# 8000/8443 are NOT exposed through UFW — Nginx or iptables handles port mapping
ufw --force enable

# ── fail2ban (SSH brute-force protection) ─────────────────────────────────────
systemctl enable fail2ban && systemctl start fail2ban

# ── Kernel tuning for high traffic ───────────────────────────────────────────
cat >> /etc/sysctl.conf <<'EOF'
# RALD Gateway tuning
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_tw_reuse = 1
net.ipv4.ip_local_port_range = 1024 65535
net.core.netdev_max_backlog = 65536
vm.swappiness = 10
EOF
sysctl -p -q

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "✅ Server setup complete."
echo ""
echo "Next steps:"
echo "  1. Clone the repo:  git clone https://github.com/Ostinato-Loop/rald.git $APP_DIR/rald"
echo "  2. cd $APP_DIR/rald/infrastructure/kong"
echo "  3. cp .env.example .env && nano .env"
echo "  4. Add TLS certs to certs/ directory"
echo "  5. make validate && make prod"
echo ""
