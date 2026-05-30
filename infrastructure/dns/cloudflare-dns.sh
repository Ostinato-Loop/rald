#!/usr/bin/env bash
# ============================================================
# RALD Ecosystem — Cloudflare DNS Configuration
# LILCKY STUDIO LIMITED
#
# Configures ALL DNS records for the RALD ecosystem via
# the Cloudflare API. Run once after provisioning.
#
# Prerequisites:
#   export CF_API_TOKEN="your-cloudflare-api-token"
#   export CF_ZONE_ID="your-rald.cloud-zone-id"
#   export KONG_VPS_IP="your-kong-vps-ip"  # optional, for future Kong deployment
#
# To get your Zone ID:
#   curl -s -H "Authorization: Bearer $CF_API_TOKEN" \
#     "https://api.cloudflare.com/client/v4/zones?name=rald.cloud" \
#     | jq -r '.result[0].id'
#
# To create an API token:
#   Cloudflare Dashboard → My Profile → API Tokens
#   → Create Token → Edit zone DNS → Zone: rald.cloud
# ============================================================

set -euo pipefail

CF_BASE="https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records"

# Require env vars
: "${CF_API_TOKEN:?Set CF_API_TOKEN to your Cloudflare API token}"
: "${CF_ZONE_ID:?Set CF_ZONE_ID to your rald.cloud zone ID}"

KONG_VPS_IP="${KONG_VPS_IP:-}"  # optional — leave blank until VPS is provisioned

H_AUTH="Authorization: Bearer ${CF_API_TOKEN}"
H_CT="Content-Type: application/json"

cfapi() {
  local method="$1" path="$2" body="${3:-}"
  local url="${CF_BASE}${path}"
  if [[ -n "$body" ]]; then
    curl -s -X "$method" "$url" -H "$H_AUTH" -H "$H_CT" -d "$body"
  else
    curl -s -X "$method" "$url" -H "$H_AUTH" -H "$H_CT"
  fi
}

upsert_record() {
  local type="$1" name="$2" content="$3" proxied="${4:-true}" priority="${5:-}"
  echo "  → $type $name → $content (proxied: $proxied)"

  local body
  if [[ -n "$priority" ]]; then
    body=$(printf '{"type":"%s","name":"%s","content":"%s","ttl":1,"proxied":%s,"priority":%s}' \
      "$type" "$name" "$content" "$proxied" "$priority")
  else
    body=$(printf '{"type":"%s","name":"%s","content":"%s","ttl":1,"proxied":%s}' \
      "$type" "$name" "$content" "$proxied")
  fi

  # Check if record exists
  local existing
  existing=$(cfapi GET "?type=${type}&name=${name}" | node -e \
    "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const r=JSON.parse(d).result;console.log(r&&r[0]?r[0].id:'');});")

  if [[ -n "$existing" ]]; then
    cfapi PUT "/${existing}" "$body" > /dev/null
    echo "    ✓ Updated existing record"
  else
    cfapi POST "" "$body" > /dev/null
    echo "    ✓ Created new record"
  fi
}

echo "════════════════════════════════════════════════"
echo "  RALD Ecosystem — Cloudflare DNS Setup"
echo "  Domain: rald.cloud"
echo "════════════════════════════════════════════════"
echo ""

# ── Cloudflare Pages deployments ──────────────────────────────────────────────
echo "▶  Cloudflare Pages — SPA frontends"

# app.rald.cloud → RALD Auth Portal (Cloudflare Pages)
# Set in Pages dashboard: Custom domain → app.rald.cloud
# CNAME is auto-created by Pages. Add here as CNAME to pages project:
upsert_record CNAME "app.rald.cloud"          "rald-app.pages.dev"               "true"
upsert_record CNAME "credentials.rald.cloud"  "rald-credentials-portal.pages.dev" "true"
upsert_record CNAME "control.rald.cloud"      "rald-control-center.pages.dev"    "true"
upsert_record CNAME "rald.cloud"              "rald-marketing.pages.dev"          "true"   # root → marketing
upsert_record CNAME "www.rald.cloud"          "rald-marketing.pages.dev"          "true"

echo ""

# ── Cloudflare Workers — backend services ─────────────────────────────────────
echo "▶  Cloudflare Workers — API services"

# api.rald.cloud is configured in wrangler.toml [[routes]]
# The Worker route automatically creates a DNS entry.
# Add explicit AAAA record as Cloudflare requires:
upsert_record AAAA "api.rald.cloud"            "100::"                             "true"
upsert_record AAAA "auth.rald.cloud"           "100::"                             "true"
upsert_record AAAA "identity.rald.cloud"       "100::"                             "true"
upsert_record AAAA "loop.rald.cloud"           "100::"                             "true"
upsert_record AAAA "messenger.rald.cloud"      "100::"                             "true"

# Future services — Worker routes to be added when workers are deployed
upsert_record AAAA "payrald.rald.cloud"        "100::"                             "true"
upsert_record AAAA "dispatch.rald.cloud"       "100::"                             "true"
upsert_record AAAA "git.rald.cloud"            "100::"                             "true"
upsert_record AAAA "ai.rald.cloud"             "100::"                             "true"
upsert_record AAAA "business.rald.cloud"       "100::"                             "true"

echo ""

# ── Kong Gateway VPS (add after VPS is provisioned) ───────────────────────────
if [[ -n "$KONG_VPS_IP" ]]; then
  echo "▶  Kong Gateway VPS — $KONG_VPS_IP"
  # Once Kong VPS is live, switch these from AAAA (Worker proxy) to A (Kong VPS)
  # Kong handles: api, auth, identity, credentials gateway functions
  # The Worker stays at api.rald.cloud/*, Kong provides the gateway layer
  upsert_record A "gateway.rald.cloud" "$KONG_VPS_IP"  "true"
  upsert_record A "monitoring.rald.cloud" "$KONG_VPS_IP" "true"
  echo ""
fi

# ── Admin and status subdomains ───────────────────────────────────────────────
echo "▶  Admin & Status"
upsert_record CNAME "admin.rald.cloud"          "rald-admin.pages.dev"             "true"
upsert_record CNAME "status.rald.cloud"         "rald-status.pages.dev"            "true"

echo ""

# ── Email (MX, SPF, DKIM, DMARC) ─────────────────────────────────────────────
echo "▶  Email records (Resend)"

# Resend → verify at resend.com/domains, copy records here:
# Replace RESEND_DKIM_VALUE with actual value from Resend dashboard

upsert_record MX  "rald.cloud"  "feedback-smtp.us-east-1.amazonses.com"  "false" "10"

upsert_record TXT "rald.cloud"  "v=spf1 include:amazonses.com ~all"  "false"

# DKIM — replace value from Resend dashboard:
# upsert_record CNAME "resend._domainkey.rald.cloud"  "RESEND_DKIM_VALUE"  "false"

upsert_record TXT "_dmarc.rald.cloud"  "v=DMARC1; p=quarantine; rua=mailto:dmarc@rald.cloud; ruf=mailto:dmarc@rald.cloud; pct=100"  "false"

echo ""

# ── SSL settings reminder ─────────────────────────────────────────────────────
echo "════════════════════════════════════════════════"
echo "✅  DNS records configured."
echo ""
echo "Cloudflare settings to apply manually:"
echo "  SSL/TLS → Mode: Full (Strict)"
echo "  SSL/TLS → Edge Certs → Always Use HTTPS: ON"
echo "  SSL/TLS → Edge Certs → HSTS: enable (max-age=31536000)"
echo "  SSL/TLS → Origin Server → Authenticated Origin Pulls: ON"
echo "  Speed → Optimization → Auto Minify: JS, CSS, HTML"
echo "  Caching → Cache Rules → Bypass for /api/*"
echo "  Security → WAF → Managed Rules: Cloudflare Managed Ruleset ON"
echo "  Security → DDoS → Customize → HTTP DDoS Attack Protection: High"
echo ""
echo "Cloudflare Pages — add custom domains:"
echo "  rald-app               → app.rald.cloud"
echo "  rald-credentials-portal → credentials.rald.cloud"
echo "  rald-control-center    → control.rald.cloud"
echo "  rald-marketing         → rald.cloud + www.rald.cloud"
echo "════════════════════════════════════════════════"
