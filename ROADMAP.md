# RALD Identity Ecosystem — Product Roadmap
**Owner:** LILCKY STUDIO LIMITED  
**Platform:** RALD — Root Authentication & Login Directory  
**Last Updated:** 2026-05-28

---

## Current Architecture

```
rald.cloud           → rald-marketing  (Cloudflare Pages)
app.rald.cloud       → rald-app        (Cloudflare Pages)
admin.rald.cloud     → rald-control-center (Cloudflare Pages)
api.rald.cloud       → api-worker      (Cloudflare Workers)
                         └─ Supabase (users, otps, sessions)
                         └─ Termii   (SMS OTP — hidden)
                         └─ Resend   (Email OTP — hidden)
```

---

## V1 — Foundation (LIVE ✅)

**Goal:** Production-ready sovereign identity infrastructure.

### Shipped
- [x] SMS OTP authentication (Termii — 12+ African carriers, sender: RALD)
- [x] Email OTP authentication (Resend — sender: RALD Identity <auth@rald.cloud>)
- [x] Password + forgot-password reset flow
- [x] JWT-based sessions (HS256, 24h default)
- [x] User registration — phone-first (OTP) or email-first (OTP or password)
- [x] Merchant vs. user role differentiation
- [x] Custom RALD Auth SDK v1.2 (`rald-auth-sdk.ts`)
- [x] Stateless email OTP (JWT-encoded code hash — no otps table required)
- [x] app.rald.cloud — dual auth (SMS + Email tabs), desktop two-column layout
- [x] Desktop brand panel — features, LILCKY STUDIO LIMITED identity
- [x] admin.rald.cloud — operator control center
- [x] rald.cloud — marketing site
- [x] GitHub → Cloudflare CI/CD (auto-deploy all 4 targets on push to main)
- [x] TERMII_API_KEY + RESEND_API_KEY auto-synced to Cloudflare Worker on deploy
- [x] All vendor names hidden from users (Termii, Resend never visible)
- [x] LILCKY STUDIO LIMITED branding in all footers and emails

### API Endpoints (v1.2.0)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | — | Password login |
| POST | `/api/auth/register` | — | Password registration |
| POST | `/api/auth/send-otp` | — | Send SMS OTP (Termii) |
| POST | `/api/auth/verify-otp` | — | Verify SMS OTP → JWT or otpToken |
| POST | `/api/auth/register-from-otp` | — | Complete registration after SMS verify |
| POST | `/api/auth/send-login-email-otp` | — | Send email OTP (Resend) — stateless |
| POST | `/api/auth/verify-login-email-otp` | — | Verify email OTP → JWT or emailToken |
| POST | `/api/auth/register-from-email-otp` | — | Complete registration after email verify |
| GET | `/api/auth/me` | JWT | Get current user |
| POST | `/api/auth/request-password-reset` | — | Send password reset code |
| POST | `/api/auth/reset-password` | — | Reset password with code |
| GET | `/api/auth/sessions` | JWT | List active sessions |
| DELETE | `/api/auth/sessions/:id` | JWT | Revoke session |
| DELETE | `/api/auth/sessions` | JWT | Revoke all sessions |

---

## V2 — Security & Scale (Next)

**Goal:** Harden auth, add rate limiting, session intelligence.

### Planned
- [ ] Rate limiting on OTP endpoints (5/min per phone/email) — Cloudflare Workers KV
- [ ] JWT refresh token system (access: 1h, refresh: 30d)
- [ ] Supabase schema migration — add `phone`, `email_verified`, `phone_verified`, `otps`, `sessions` tables
- [ ] Login attempt logging (ip_address, user_agent, result, timestamp)
- [ ] Device fingerprinting on session creation
- [ ] OTP cooldown enforcement server-side (not just client)
- [ ] Webhook support — `auth.login`, `auth.register`, `auth.otp_failed` events
- [ ] Admin API — view users, revoke sessions, lock accounts
- [ ] 2FA enforcement option per role (admin/operator)
- [ ] Automated onboarding email sequence (Day 0, Day 3, Day 7)

---

## V3 — Growth & OAuth

**Goal:** Add OAuth providers, analytics, referral integration.

### Planned
- [ ] Google OAuth provider (Sign in with Google)
- [ ] Apple Sign-In (iOS/Safari)
- [ ] Referral code capture at registration → attributed to referrer
- [ ] Auth analytics dashboard — logins/day, OTP success rate, drop-off funnel
- [ ] Multi-language support (English, French, Hausa, Swahili)
- [ ] RALD Auth embeddable widget (iframe drop-in for LILCKY products)
- [ ] Account linking — merge phone + email + OAuth identities
- [ ] Bot detection (honeypot field + timing analysis)

---

## V4 — Multi-tenant & Published SDK

**Goal:** RALD as auth-as-a-service for the full LILCKY ecosystem.

### Planned
- [ ] Published npm package: `@rald/auth-sdk` (works in any web/Node project)
- [ ] Multi-tenant JWT namespaces — per-product auth contexts (PayRald, Loop, etc.)
- [ ] Edge KV caching for token validation (sub-1ms auth at edge)
- [ ] Per-product white-label auth UI (custom colors/logos via config)
- [ ] Cloudflare D1 migration option (reduce Supabase dependency)
- [ ] Auth health dashboard in admin.rald.cloud — uptime, latency, error rate
- [ ] Bulk user import/export (for product migrations)

---

## V5 — Enterprise & Compliance

**Goal:** Enterprise-grade identity with SSO and compliance tooling.

### Planned
- [ ] SAML 2.0 support (enterprise SSO)
- [ ] OIDC provider mode (RALD as identity provider for third-party services)
- [ ] GDPR compliance tools — right to erasure, data portability export
- [ ] SOC 2 readiness audit log
- [ ] API key management (long-lived keys for server-to-server auth)
- [ ] Compliance report generation (user data inventory, consent records)
- [ ] Penetration testing + security audit
- [ ] SLA monitoring and uptime guarantees

---

## Provider Strategy

| Function | Provider | Exposure |
|----------|----------|----------|
| SMS OTP | Termii | Backend only — users see "RALD" |
| Email OTP | Resend | Backend only — emails from "RALD Identity <auth@rald.cloud>" |
| Database | Supabase | Backend only — no Supabase branding ever |
| Edge/Deploy | Cloudflare | Infrastructure — no CF branding in UI |
| DNS/Routing | Cloudflare | Transparent |

All providers are subject to change without user-facing impact. The RALD brand is the single identity surface.

---

## CI/CD Pipeline

Every push to `main` on [github.com/Ostinato-Loop/rald](https://github.com/Ostinato-Loop/rald) triggers:

1. **CI** — TypeScript typecheck + build for all 4 artifacts
2. **Deploy API Worker** → `api.rald.cloud` (Cloudflare Workers)
3. **Deploy RALD App** → `app.rald.cloud` (Cloudflare Pages)
4. **Deploy Control Center** → `admin.rald.cloud` (Cloudflare Pages)
5. **Deploy Marketing** → `rald.cloud` (Cloudflare Pages)

Secrets auto-sync: `TERMII_API_KEY` and `RESEND_API_KEY` pushed to Cloudflare Worker on every deploy.

---

*RALD is built and maintained by LILCKY STUDIO LIMITED.*  
*All authentication infrastructure is sovereign — no third-party branding ever reaches the user.*
