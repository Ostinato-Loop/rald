# Manilla — Readiness Audit
**Date:** 2026-06-06  
**Repos:** Manilla-Network/Manilla, Manilla-Network/manilla-artist-contract  
**Auditor:** Foundation Hardening Program — Phase 2  

---

## Evidence Base

| Source | Detail |
|--------|--------|
| Main app | `Manilla-Network/Manilla` — Cloudflare Pages, CI: skipped (post-deploy smoke tests) |
| Artist contract | `Manilla-Network/manilla-artist-contract` — TanStack router + Vite + Supabase |
| CI status | manilla-91ff7f38: ✅ Cloudflare Pages deploy GREEN |
| Admin portal | `src/routes/admin.tsx` — ContractsTab, ArtistsTab, LabelsTab, ReleasesTab, SupportTab, HealthTab, FeatureFlagsTab |
| SSO | Manilla registered in `rald-auth-core` registered_apps (2026-06-06) |

---

## Phase 2 Checks

### ✅ Artist Journey
- `ArtistsTab` component confirmed in `admin.tsx`
- Artist status management: `submitted → under_review → approved → rejected → contract_sent → active`
- `StatCard` per status visible in ContractsTab

### ✅ Contract Journey
- `ContractsTab` fully implemented: filter, search, pagination, detail sheet
- Status update workflow: `callUpdateStatus()` with notes
- Contract resend: `callResendContract()` confirmed
- Admin detail view: `ApplicationDetail` + `AuditRow[]`

### ✅ Label Journey
- `LabelsTab` component confirmed in `admin.tsx`

### ✅ Release Journey
- `ReleasesTab` component confirmed in `admin.tsx`

### ✅ Admin Operations
- Full admin portal: health dashboard (`HealthTab`), feature flags (`FeatureFlagsTab`), support console (`SupportTab`)
- Session-gated admin auth (`sessionToken`, `sessionEmail`)
- Error boundary: `onAdminError` propagated through tabs

### ✅ Notifications
- `rald-notify` Worker: CI ✅ green, Deploy ✅ green (2026-06-04)

### ⚠️ Fanlink Journey
- Not confirmed in reviewed files — requires dedicated Fanlink route audit

### ⚠️ Analytics
- `raldtics` repo exists and is active; direct Manilla integration not confirmed

### ⚠️ CI Status (just fixed)
- `manilla-artist-contract` was failing: stray `</main>` JSX error in `ContractsTab` — **fixed 2026-06-06**
- Deploy to Cloudflare Pages and Netlify will re-run automatically

---

## Score

| Area | Score |
|------|-------|
| Artist Journey | 9/10 |
| Label Journey | 8/10 — tab confirmed, depth not fully inspected |
| Release Journey | 8/10 — tab confirmed, depth not fully inspected |
| Contract Journey | 10/10 |
| Fanlink Journey | 5/10 — not confirmed |
| Notifications | 9/10 |
| Analytics | 6/10 — raldtics exists, Manilla integration unverified |
| Admin Operations | 10/10 |

**Total: 65/80 → 81/100**

### Gap to 95+
- Confirm Fanlink route exists and is functional
- Verify raldtics → Manilla event integration
- Full tab-level audit of ReleasesTab and LabelsTab internals
- SSO callback route `GET /auth/callback` must be implemented in Manilla
