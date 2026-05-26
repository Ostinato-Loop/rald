#!/bin/bash
set -e

echo "=== RALD Ecosystem Deployment ==="
echo "Account: $CLOUDFLARE_ACCOUNT_ID"

# Deploy API Worker
echo ""
echo "--- Deploying RALD API Worker ---"
cd /workspace
pnpm --filter @workspace/api-server run build
npx wrangler deploy --config deploy/workers/rald-api-worker.toml

# Deploy Control Center (admin) to pages
echo ""
echo "--- Deploying RALD Control Center ---"
pnpm --filter @workspace/rald-control-center run build
npx wrangler pages deploy artifacts/rald-control-center/dist/public \
  --project-name="rald-control-center" \
  --branch="main"

# Deploy Product Marketing Pages
echo ""
echo "--- Deploying RALD Marketing Pages ---"
pnpm --filter @workspace/rald-marketing run build
npx wrangler pages deploy artifacts/rald-marketing/dist/public \
  --project-name="rald-marketing" \
  --branch="main"

echo ""
echo "=== All deployments complete ==="
echo "Control Center: https://admin.rald.cloud"
echo "Marketing:      https://rald.cloud/products/"
echo "API:            https://api.rald.cloud"
