# RALD — Root Authentication & Login Directory

Nigeria-first identity infrastructure platform — auth, identity, wallet, and developer tooling for West Africa.

## Run & Operate

- `pnpm --filter @workspace/rald run dev` — run the RALD frontend (port 20261)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- External API: `https://auth.ostloop.name.ng` — production backend

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Wouter (routing) + Tailwind CSS v4
- UI: shadcn/ui components + lucide-react icons
- Data: TanStack Query for API fetching, mock fallback data for all pages
- Animations: Framer Motion
- Charts: Recharts
- Toasts: Sonner

## Where things live

- `artifacts/rald/src/App.tsx` — main router (all routes wired)
- `artifacts/rald/src/lib/api.ts` — API client (base: https://auth.ostloop.name.ng)
- `artifacts/rald/src/lib/auth-context.tsx` — auth state (localStorage persistence)
- `artifacts/rald/src/lib/theme.tsx` — dark/light ThemeProvider
- `artifacts/rald/src/index.css` — full RALD theme (CSS vars, Inter font)
- `artifacts/rald/src/components/auth/GlowBox.tsx` — state-driven animated auth container
- `artifacts/rald/src/components/auth/PhoneInput.tsx` — phone input (+234 default)
- `artifacts/rald/src/components/auth/OTPInput.tsx` — 6-digit OTP input
- `artifacts/rald/src/components/layout/DashboardLayout.tsx` — user dashboard sidebar
- `artifacts/rald/src/components/layout/DeveloperLayout.tsx` — developer portal sidebar
- `artifacts/rald/src/components/layout/AdminLayout.tsx` — admin control center sidebar

## Architecture decisions

- Frontend-only, consuming external backend at `https://auth.ostloop.name.ng`
- All pages show realistic mock fallback data when API calls fail — never blank screens
- Auth guard via ProtectedRoute — unauthenticated users redirected to /login
- Auth state persisted in localStorage (key: `rald_user`)
- Dark mode first, persisted in localStorage (key: `rald-theme`)
- GlowBox component animates card border: default → loading (yellow pulse) → error (red shake) → success (green pulse)

## Product

RALD is a Nigeria-first identity infrastructure platform. It provides:
- **Phone OTP authentication** with +234 default, 6-digit OTP input, 60s resend timer
- **Password login** fallback with visibility toggle
- **OAuth consent flows** (Google-style: entry → consent → success/denied)
- **User Dashboard** — identity overview, sessions, security, API keys, NGN wallet, developer tools, settings
- **Developer Portal** — OAuth apps, API keys, webhooks, API logs, usage analytics, SDKs, billing
- **Admin Control Center** — realtime metrics, live event stream, user management, threat monitoring, OTP monitoring, API traffic, wallet surveillance, dispute resolution, audit logs, feature flags

## Routes

### Auth
- `/login` `/signup` `/auth` — phone OTP / password login
- `/oauth/authorize` `/oauth/consent` — OAuth consent flow

### Dashboard (requires auth)
- `/dashboard` — overview with stats and activity feed
- `/dashboard/profile` — profile editing
- `/dashboard/security` — password, login history
- `/dashboard/sessions` — device session management
- `/dashboard/api-keys` — API key CRUD
- `/dashboard/wallet` — NGN wallet with transactions
- `/dashboard/developers` — quick links to developer portal
- `/dashboard/settings` — preferences, notifications, theme

### Developer Portal (requires auth)
- `/developers` — API usage overview with charts
- `/developers/apps` — OAuth application management
- `/developers/api-keys` — developer API keys
- `/developers/oauth` — OAuth client registry
- `/developers/webhooks` — webhook endpoint management
- `/developers/logs` — filterable API log stream
- `/developers/usage` — charts, quota meters, per-app breakdown
- `/developers/sdks` — TypeScript, Python, Go, Dart SDK snippets
- `/developers/billing` — plan and invoice history
- `/developers/settings` — IP allowlist, rate limits, alerts

### Admin (requires auth)
- `/admin` — realtime operational metrics
- `/admin/activity` — live event stream (auto-updates every 2.5s)
- `/admin/users` — searchable user table with detail drawer
- `/admin/sessions` — all platform sessions with risk scores
- `/admin/security` — active threats and mitigations
- `/admin/otp` — OTP monitoring, provider health (Termii, Twilio, Africa's Talking)
- `/admin/api-traffic` — request volume, latency, top consumers
- `/admin/wallets` — wallet surveillance, frozen funds
- `/admin/disputes` — escrow dispute resolution
- `/admin/audit` — immutable audit log
- `/admin/feature-flags` — feature toggles with rollout sliders
- `/admin/settings` — system thresholds and config

## User preferences

- Nigeria-first: default country code +234, NGN currency, Nigerian phone prefixes
- No emojis in UI
- Dark mode as default
- Mock data fallback for all pages — never show blank screens
- External backend at `https://auth.ostloop.name.ng` (credentials: omit for CORS)

## Gotchas

- ProtectedRoute redirects unauthenticated users to /login — click "Send code" without typing a number to log in with demo user
- API server EADDRINUSE on port 8080 — not critical for frontend-only development
- All pages use mock data when API fails — realistic demo data is always shown
