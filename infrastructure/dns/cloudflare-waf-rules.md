# RALD — Cloudflare WAF Rules

Configure in: **Security → WAF → Custom Rules**

---

## Rule 1: Block non-Cloudflare traffic to Kong VPS
*(Add after Kong VPS is live — prevents bypassing the gateway)*

**Rule name:** Block direct VPS access  
**Expression:**
```
(ip.src ne $cloudflare_ips and http.host in {"api.rald.cloud" "auth.rald.cloud" "identity.rald.cloud" "credentials.rald.cloud"})
```
**Action:** Block

---

## Rule 2: Rate limit OTP endpoints
*(Belt-and-suspenders on top of Kong + Worker rate limiting)*

**Rule name:** OTP rate limit  
**Expression:**
```
(http.request.uri.path contains "/api/auth/otp" or http.request.uri.path contains "/api/auth/send")
```
**Action:** Rate limit → 10 requests per minute per IP  
**Mitigation:** Block for 60 seconds

---

## Rule 3: Block known bad bots on auth
**Rule name:** Block bots from auth  
**Expression:**
```
(cf.client.bot and http.request.uri.path contains "/api/auth")
```
**Action:** Block

---

## Rule 4: Challenge suspicious traffic on API key creation
**Rule name:** Challenge API key creation  
**Expression:**
```
(http.request.uri.path eq "/api/api-keys" and http.request.method eq "POST" and cf.threat_score gt 10)
```
**Action:** Managed Challenge (Turnstile)

---

## Rule 5: Skip WAF for Cloudflare health checks
**Rule name:** Allow CF health probes  
**Expression:**
```
(http.request.uri.path eq "/healthz" or http.request.uri.path eq "/health" or http.request.uri.path eq "/ready")
```
**Action:** Skip → All remaining custom rules

---

## Cache Rules (Caching → Cache Rules)

**Rule 1: Never cache API responses**  
Expression: `(http.request.uri.path wildcard "/api/*")`  
Cache setting: Bypass cache

**Rule 2: Cache static assets aggressively**  
Expression: `(http.request.uri.path wildcard "*.js" or http.request.uri.path wildcard "*.css" or http.request.uri.path wildcard "*.woff2")`  
Cache setting: Cache everything, Edge TTL: 1 year, Browser TTL: 1 month
