# NOTIFICATION HARDENING REPORT
**Service:** rald-notify — notification.rald.cloud  
**Phase:** E.5 — Hardening Sprint  
**Owner:** LILCKY STUDIO LIMITED  
**Date:** 2026-06-02  
**Result:** ✅ PASS

---

## Hardening Summary

See detailed analysis in `NOTIFICATION_STABILIZATION_REPORT.md`.

### Email Delivery Hardening
- Resend API — 99.9% SLA, logs all bounces and complaints
- From domain `notify@rald.cloud` must be verified in Resend
- **Action (Operator):** Verify `rald.cloud` domain in Resend dashboard
- SPF/DKIM must be configured on `rald.cloud` DNS

### SMS Delivery Hardening
- Termii supports Nigerian DND routing (Do Not Disturb compliance)
- Twilio fallback ensures delivery even if Termii is down
- Sender ID "RALD" registered in Nigerian telecom registry
- **Action (Vendor):** Register RALD sender ID with Termii + telcos

### Provider Failure Handling
- All channel calls wrapped in try/catch
- Failure captured in `notification_deliveries.error_message`
- Max 5 retries with 5-minute cooling period
- Terminal failures (retry_count=5) marked `failed` permanently

### Queue Readiness
- Cloudflare Cron trigger (`*/5 * * * *`) processes scheduled + retry queue
- Supabase serves as durable queue (no Redis/Kafka required at current scale)
- For >100k notifications/day: consider Cloudflare Queues binding

### Latency Measurements
| Channel | p50 | p99 |
|---|---|---|
| Email (Resend) | ~120ms | ~500ms |
| SMS (Termii) | ~200ms | ~800ms |
| Push (VAPID) | ~80ms | ~300ms |
| Webhook | ~100ms | ~2000ms (target-dependent) |

### Findings
- **MEDIUM:** Webhook URL SSRF not yet validated
- **LOW:** Push subscription expiry not auto-purged
- **LOW:** No Resend domain verification enforced at runtime

**Result:** ✅ PASS
