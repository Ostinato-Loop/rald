# RALD ACCOUNT CENTER — app.rald.cloud
## Hardening Sprint — Phase 12: Transformation Specification

**Date:** 2026-06-12  
**Transform:** app.rald.cloud → RALD Account Center (single source of ecosystem truth)  
**Prepared by:** RALD Platform Engineering · LILCKY STUDIO LIMITED

---

## Vision

app.rald.cloud transforms from a marketing/landing page into the **RALD Account Center** — the authenticated control panel for every user's ecosystem identity.

```
BEFORE: app.rald.cloud = marketing landing page
AFTER:  app.rald.cloud = RALD Account Center (authenticated)
```

---

## Account Center: Section Map

### 1. Identity
- Profile photo, name, username, bio
- Verified badges display (phone, email, ID, creator, business, civic)
- Trust tier + score visualization
- Social graph (followers / following)
- SSO: which products this identity is logged into

### 2. Security
- Active sessions list (device, location, last seen)
- Trusted devices management
- Security log (login history, OTP requests, device changes)
- Global logout button
- WebAuthn / Passkey management
- Two-factor authentication status

### 3. Trust
- Current trust score + tier breakdown
- What each signal adds to your score
- How to increase trust (verification paths)
- Trust history (when tier changed)

### 4. RALD Mail *(future)*
- mail.rald.cloud mailbox access
- Mail address: username@rald.cloud

### 5. Business *(future)*
- Business profile
- Organization membership
- Storefront links

### 6. AI *(future)*
- AI assistant access
- Usage stats

### 7. Regions
- Active countries for this account
- Country-specific regulatory acknowledgments (NDPR, POPIA, GDPR)
- Data residency information

### 8. Developer Access
- Developer status (registered / pending / not registered)
- API keys management
- Applications registered
- Webhooks registered
- Usage stats

### 9. Machine Access *(admin only)*
- Machine identities registered to this organization
- Key rotation history
- Provisioning new machine identities

### 10. Notifications
- Notification preferences by product and type
- Connected push devices
- Communication preferences (SMS, email, push)

### 11. Privacy
- Data export request
- Account deletion request
- Third-party data sharing controls
- Audit trail: "What does RALD know about me?"

### 12. Audit Center *(operator Sprint Phase 4)*
- Full audit stream (admin only)
- Security events
- Cross-ecosystem activity timeline

---

## API Endpoints Needed (from rald-auth-core)

All already exist:
- `GET /me` — identity
- `GET /session` — active sessions
- `GET /devices` — devices
- `GET /trust/score` — trust score
- `GET /permissions/regulatory/:country` — regulatory info
- `GET /developer/*` — developer access
- `GET /privacy/*` — privacy controls
- `GET /admin/metrics/*` — metrics (admin only)

---

## Implementation Plan

| Component | Phase | Effort |
|---|---|---|
| Auth wall (SSO into app.rald.cloud) | 1 | 1 day |
| Identity section | 1 | 2 days |
| Security section (sessions, devices) | 1 | 2 days |
| Trust section | 2 | 1 day |
| Notifications section | 2 | 2 days |
| Privacy section | 2 | 1 day |
| Developer section | 3 | 3 days |
| Regions section | 3 | 2 days |
| Audit Center (admin) | 4 | 3 days |
| Business + Mail + AI | Post-GA | — |

**Total to MVP Account Center (Phases 1–2):** ~9 days of frontend work

---

*RALD Account Center — One identity. Everything in one place.*  
*LILCKY STUDIO LIMITED · 2026*
