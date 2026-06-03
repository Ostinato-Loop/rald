# OBSERVABILITY CERTIFICATION — G.12
**Date:** 2026-06-03 | **Phase:** G.12 Foundation Lockdown

## Health Endpoint Map

| Service | Endpoint | Expected |
|---|---|---|
| Auth | auth.rald.cloud/healthz | `{"status":"ok","version":"2.1.0"}` |
| Auth (full) | auth.rald.cloud/ready | `{"ready":true,"checks":{...}}` |
| Auth (deps) | auth.rald.cloud/system/dependencies | latencies for supabase, termii, resend |
| Loop API | loop-api.rald.cloud/health | `{"status":"ok","service":"loop-api"}` |
| Messenger | messenger.rald.cloud/health | `{"status":"ok"}` |
| Notifications | notification.rald.cloud/health | `{"status":"ok"}` |
| Search | search.rald.cloud/health | `{"status":"ok"}` |
| Inbox | inbox.rald.cloud/health | `{"status":"ok"}` |
| Realtime | realtime.rald.cloud/health | `{"status":"ok"}` |
| Control Center | cc-api.rald.cloud/health | `{"status":"ok"}` |

## Metrics (admin.rald.cloud dashboard)

- Auth Success % (target >99%)
- SSO Exchange Success % (target >99%)
- OTP Delivery % — Email (target >95%) / SMS (degraded until Termii fixed)
- Failed Login Rate (alert if >5% in 5min)
- Worker Error Rate per service (alert if >0.1%)
- Supabase Query Latency p95 (target <500ms)
- Worker Response Time p95 (target <200ms)

## Cloudflare Workers Analytics

All workers deployed with `[observability] enabled = true, head_sampling_rate = 1`.
Access: Cloudflare Dashboard → Workers & Pages → Analytics

## Status

All deployed workers have observability enabled. Structured logging is active.
Alerting is currently manual — automated alerting is a Phase H item.
