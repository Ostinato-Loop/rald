# RALD Ecosystem — DNS Architecture

**Registrar:** Cloudflare  
**Zone:** `rald.cloud`  
**Owner:** LILCKY STUDIO LIMITED

---

## Full DNS Map

```
rald.cloud                   → Cloudflare Pages (marketing site)
www.rald.cloud               → Cloudflare Pages (marketing site)

app.rald.cloud               → Cloudflare Pages (RALD Auth Portal)
credentials.rald.cloud       → Cloudflare Pages (Developer Portal)
control.rald.cloud           → Cloudflare Pages (Control Center)
admin.rald.cloud             → Cloudflare Pages (Admin Center — future)
status.rald.cloud            → Cloudflare Pages (Status page — future)

api.rald.cloud               → Cloudflare Worker (RALD Auth backend)
auth.rald.cloud              → Cloudflare Worker (RALD Auth alias)
identity.rald.cloud          → Cloudflare Worker (RALD Identity alias)
loop.rald.cloud              → Cloudflare Worker (Loop backend)
messenger.rald.cloud         → Cloudflare Worker (Messenger backend)
payrald.rald.cloud           → Cloudflare Worker (PayRALD — future)
dispatch.rald.cloud          → Cloudflare Worker (Logistics — future)
git.rald.cloud               → Cloudflare Worker (GitRALD — future)
ai.rald.cloud                → Cloudflare Worker (AI — future)
business.rald.cloud          → Cloudflare Worker (Loop Business — future)

gateway.rald.cloud           → Kong VPS (after provisioning)
monitoring.rald.cloud        → Kong VPS / Grafana (after provisioning)
```

---

## Record Types

### Cloudflare Pages (CNAME → pages.dev project)
Pages auto-creates DNS when you add a custom domain in the dashboard.

| Subdomain | Pages Project |
|-----------|--------------|
| `app` | `rald-app` |
| `credentials` | `rald-credentials-portal` |
| `control` | `rald-control-center` |
| `rald.cloud` (apex) | `rald-marketing` |

### Cloudflare Workers (AAAA → 100:: proxy)
Workers use `AAAA 100::` + Cloudflare proxy. The Worker route in `wrangler.toml` does the actual routing.

```toml
# wrangler.toml
[[routes]]
pattern = "api.rald.cloud/*"
zone_name = "rald.cloud"
```

### Kong VPS (A record → VPS IP)
Once the Kong VPS is provisioned:
```
gateway.rald.cloud    A    <VPS_IP>    proxied
monitoring.rald.cloud A    <VPS_IP>    proxied
```

---

## Cloudflare Settings Checklist

| Setting | Value |
|---------|-------|
| SSL/TLS Mode | **Full (Strict)** |
| Always Use HTTPS | ✅ On |
| HSTS | ✅ On (max-age: 1 year) |
| Authenticated Origin Pulls | ✅ On (for Kong VPS) |
| HTTP/3 | ✅ On |
| 0-RTT Connection Resumption | ✅ On |
| Auto Minify | ✅ JS, CSS, HTML |
| Brotli Compression | ✅ On |
| Cache API routes | ❌ Bypass `/api/*` |
| Cloudflare WAF Managed Ruleset | ✅ On |
| DDoS Protection | ✅ High sensitivity |
| Bot Fight Mode | ✅ On |

---

## Email (Resend → rald.cloud)

After adding your domain to [resend.com/domains](https://resend.com/domains):

| Type | Name | Value |
|------|------|-------|
| MX | `rald.cloud` | `feedback-smtp.us-east-1.amazonses.com` (priority 10) |
| TXT | `rald.cloud` | `v=spf1 include:amazonses.com ~all` |
| CNAME | `resend._domainkey.rald.cloud` | *(from Resend dashboard)* |
| TXT | `_dmarc.rald.cloud` | `v=DMARC1; p=quarantine; rua=mailto:dmarc@rald.cloud; pct=100` |

---

## Running the Setup Script

```bash
export CF_API_TOKEN="your-token"   # Zone: Edit DNS permission
export CF_ZONE_ID="your-zone-id"   # rald.cloud zone ID

# Optional (after VPS provisioned):
export KONG_VPS_IP="1.2.3.4"

chmod +x cloudflare-dns.sh
./cloudflare-dns.sh
```

---

## Cloudflare Pages Deployment (credentials.rald.cloud)

In Cloudflare Pages dashboard for `rald-credentials-portal`:

| Setting | Value |
|---------|-------|
| Production branch | `main` |
| Build command | `pnpm --filter @workspace/credentials-portal run build` |
| Build output directory | `artifacts/credentials-portal/dist` |
| Root directory | *(leave blank — repo root)* |
| Environment variable | `NODE_VERSION=20` |

After first deploy, add custom domain: **credentials.rald.cloud**
