# RALD ALIA — SERVICE MAP
> Audit Date: 2026-06-13

## Production Services (Deployed)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        RALD ECOSYSTEM SERVICES                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  CLIENT LAYER                                                         │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │ profiles.rald   │  │  app.rald.cloud  │  │  loop.rald.cloud │   │
│  │ .cloud          │  │  (ecosystem hub) │  │  (audio platform)│   │
│  │ rald-identity   │  │  rald-cloud-web  │  │  loop repo       │   │
│  └────────┬────────┘  └────────┬─────────┘  └────────┬─────────┘   │
│           │                    │                       │              │
│  ┌────────┴────────────────────┴───────────────────────┴──────────┐ │
│  │                    auth.rald.cloud                               │ │
│  │                    rald-auth-core (Hono + Supabase)             │ │
│  │  Routes:                                                         │ │
│  │  POST /auth/register-username        GET  /identity/:id          │ │
│  │  POST /auth/send-otp                 POST /machine/auth          │ │
│  │  POST /auth/register-username/complete GET /session              │ │
│  │  POST /smart-login                   POST /webauthn/*            │ │
│  │  GET  /username/check/:username      POST /trust/*               │ │
│  │  GET  /sso/token                     GET  /permissions/*         │ │
│  │  POST /developer/register            GET  /graph/*               │ │
│  └──────────────────────────────┬───────────────────────────────────┘ │
│                                 │                                       │
│  INFRASTRUCTURE LAYER           │                                       │
│  ┌──────────────────┐  ┌───────┴──────────┐  ┌──────────────────┐   │
│  │ events.rald.cloud│  │ config.rald.cloud│  │notification.rald │   │
│  │ rald-event-bus   │  │ rald-config      │  │.cloud            │   │
│  │                  │  │                  │  │ rald-notify      │   │
│  │ POST /events     │  │ GET  /flags      │  │                  │   │
│  │ GET  /events     │  │ GET  /countries  │  │ POST /notifications│ │
│  │ POST /subscriptions│ │PATCH /countries/:│  │ GET  /preferences│   │
│  │ GET  /audit      │  │ PATCH /flags/:   │  │ POST /templates  │   │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘   │
│                                                                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │ search.rald.cloud│  │realtime.rald.cloud│ │control.rald.cloud│   │
│  │ rald-search      │  │ rald-realtime    │  │ rald-control-    │   │
│  │                  │  │ (LiveKit + WS)   │  │ center           │   │
│  │ GET /search      │  │                  │  │ (ops dashboard)  │   │
│  │ POST /index      │  │ GET /rooms       │  │                  │   │
│  └──────────────────┘  │ GET /calls       │  └──────────────────┘   │
│                         └──────────────────┘                          │
│                                                                       │
│  DATA LAYER                                                           │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                     Supabase (PostgreSQL)                     │    │
│  │  auth_users · auth_sessions · auth_devices · auth_otp_codes  │    │
│  │  identity_profiles · username_registry · trust_scores        │    │
│  │  permission_grants · consent_records · machine_identities    │    │
│  │  event_bus_events · audit_stream · feature_flags             │    │
│  │  country_configs · notification_* · developer_workspaces     │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Service Domains

| Service | Domain | Repo | Runtime |
|---------|--------|------|---------|
| Identity Portal | profiles.rald.cloud | rald-identity | CF Pages |
| Auth Core | auth.rald.cloud | rald-auth-core | CF Worker |
| Event Bus | events.rald.cloud | rald-event-bus | CF Worker |
| Config/Flags | config.rald.cloud | rald-config | CF Worker |
| Notifications | notification.rald.cloud | rald-notify | CF Worker |
| Search | search.rald.cloud | rald-search | CF Worker |
| Realtime | (TBD) | rald-realtime | CF Worker |
| Control Center | control.rald.cloud | rald-control-center | CF Pages + Worker |
| Loop | loop.rald.cloud | loop | CF Pages + Worker |
| Messenger | messenger.rald.cloud | messenger | CF Pages + Worker |
| Ecosystem Hub | app.rald.cloud | rald-cloud-web | CF Pages |
| Trust Center | trust.rald.cloud | rald-trust | CF Pages |

## Missing Services (Phase 1 Required)

| Service | Purpose | Priority |
|---------|---------|---------|
| `rald-routing` | Identity → destination resolution (<200ms) | CRITICAL |
| `rald-consent` | Consent grant/revoke/audit API | HIGH |
| `rald-authorization` | Multi-approval/delegated authorization engine | HIGH |
| `rald-alia-core` | ALIA unified API gateway | HIGH |
| `rald-developer-api` | Developer workspace + sandbox API | MEDIUM |

## Inter-Service Communication

### Current (partially implemented)
- Services use `X-Internal-Secret` (DEPRECATED) or Machine JWT (`X-Machine-Token`)
- Machine JWT issued by `auth.rald.cloud POST /machine/auth`
- Event fan-out via `rald-event-bus` (webhook subscriptions)
- No service mesh or mTLS confirmed in production

### Required (per Phase 1 spec)
- Full mTLS between all services
- Zero shared secrets
- Automatic credential rotation
- Certificate chain per service
