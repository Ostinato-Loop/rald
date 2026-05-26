#!/bin/bash
# Setup Cloudflare DNS records for rald.cloud domain
# Run once to configure all subdomains

CF_API="https://api.cloudflare.com/client/v4"
ZONE_ID="" # Set after: curl -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" "$CF_API/zones?name=rald.cloud" | jq '.result[0].id'

create_cname() {
  local name=$1
  local target=$2
  curl -s -X POST "$CF_API/zones/$ZONE_ID/dns_records" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"type\":\"CNAME\",\"name\":\"$name\",\"content\":\"$target\",\"proxied\":true}"
  echo ""
}

echo "Creating DNS records for rald.cloud..."
create_cname "api"       "rald-api.workers.dev"
create_cname "admin"     "rald-control-center.pages.dev"
create_cname "loop"      "loop-business.pages.dev"
create_cname "pay"       "payrald.pages.dev"
create_cname "dispatch"  "loop-dispatch.pages.dev"
create_cname "analytics" "raldtics.pages.dev"
create_cname "voice"     "loop-voice.pages.dev"
create_cname "git"       "gitrald.pages.dev"
echo "DNS setup complete."
