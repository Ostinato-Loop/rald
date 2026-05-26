# RALD Ecosystem

**The fully unified AI-native African infrastructure and commerce operating system.**

Six products — Loop Business, PayRald, Loop Dispatch, Raldtics, Loop Voice, GitRald — all governed from a single admin control center, deployed to Cloudflare's global edge.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  rald.cloud/products/      │  admin.rald.cloud           │
│  RALD Marketing Site        │  RALD Control Center        │
│  (CF Pages — React+Vite)    │  (CF Pages — React+Vite)    │
└────────────────┬────────────┴──────────────┬────────────┘
                 │                           │
                 └──────────┬────────────────┘
                            ▼
                 api.rald.cloud  (CF Worker)
                 artifacts/api-worker/  [PROD]
                 artifacts/api-server/  [DEV]
                            │
                 ┌──────────┴──────────┐
              Supabase [PROD]     Replit PG [DEV]
```

## Run & Operate

| Command | Purpose |
|---------|---------|
| Workflows panel | Start/stop all services |
| `pnpm run typecheck` | Full typecheck across all packages |
| `pnpm run build` | Build all packages (no env vars needed) |
| `pnpm --filter @workspace/api-spec run codegen` | Regenerate API hooks from OpenAPI spec |
| `pnpm --filter @workspace/db run push` | Push DB schema changes (dev only) |

## Dev Credentials

- **Admin login:** `admin@rald.cloud` / `rald-admin-2025`
- **API base:** `http://localhost:8080/api`
- **Control Center:** `http://localhost:18795`
- **Marketing:** `http://localhost:21457/products/`

## Production Deployment

Deploys automatically via GitHub Actions on push to `main`.
See `.github/SECRETS.md` for required GitHub/Cloudflare secrets setup.

Manual deploy:
```bash
cd artifacts/api-worker && npx wrangler deploy src/index.ts --name rald-api
```

## Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 24, TypeScript 5.9 |
| Monorepo | pnpm workspaces |
| Dev API | Express 5 + PostgreSQL (Drizzle ORM) |
| Prod API | Cloudflare Worker (Hono) + Supabase |
| Frontend | React 19 + Vite 7 + Tailwind CSS v4 |
| State | TanStack Query v5 + Wouter |
| API contract | OpenAPI 3.1 → Orval codegen |
| CI/CD | GitHub Actions → Cloudflare Workers/Pages |
| Auth | Custom HMAC-SHA256 JWT (no external auth) |
| Encryption | AES-256-GCM (credentials at rest) |

## User Preferences

- No placeholder data — always use real seeded data
- Apple-grade icon integration on all pages
- Professional, production-ready (not amateur)
- GitHub is source of truth — all infra changes via PRs
- RALD branding: dark navy (#0b111e) for Control Center, black (#000000) for marketing
