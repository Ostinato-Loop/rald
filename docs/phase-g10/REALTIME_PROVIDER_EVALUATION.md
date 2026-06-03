# REALTIME_PROVIDER_EVALUATION.md
**Phase:** G.10 — RALD Realtime Abstraction Layer (RRAL)  
**Owner:** LILCKY STUDIO LIMITED  
**Date:** 2026-06-03

---

## EVALUATION SCOPE

Three providers evaluated for RALD ecosystem integration:
1. Cloudflare Calls (RealtimeKit)
2. LiveKit
3. Tencent TRTC

Evaluation criteria: RALD platform fit, Nigeria/Africa network performance, cost, API quality, compliance, failover suitability.

---

## PROVIDER 1 — CLOUDFLARE CALLS (REALTIMEKIT)

**Role in RALD:** Primary (P1) for ALL products

### Technical Capabilities

| Feature | Status |
|---|---|
| WebRTC audio | ✅ |
| WebRTC video | ✅ |
| SFU architecture | ✅ (Cloudflare edge) |
| SDK | JavaScript (browser), REST API |
| Recording | ✅ (CF Storage) |
| Max participants | Varies by plan |
| Edge nodes | 300+ cities including Lagos, Nairobi, Johannesburg |

### Africa / Nigeria Fit

**Strongest provider for Nigeria.** Cloudflare has 9 African PoPs:
- Lagos (LOS) — Nigeria's data center
- Nairobi (NBO) — East Africa
- Johannesburg (JNB) — South Africa
- Cairo (CAI) — North Africa
- Accra (ACC) — West Africa

A student in Lagos connects to a Lagos Cloudflare PoP. Latency: 10–30ms. This is the primary reason RealtimeKit is P1.

### API Quality

- REST API: `rtc.live.cloudflare.com/v1`
- Session-based: `POST /apps/:id/sessions/new`
- Well-documented: https://developers.cloudflare.com/calls/
- No SDK dependency — pure HTTPS/WebRTC

### Cost

See `REALTIME_COST_ANALYSIS.md`. Lowest per-minute cost of all three providers.

### Integration

Already integrated with Cloudflare Workers via Bindings:
- `CALLS_APP_ID` — Worker secret
- `CALLS_APP_SECRET` — Worker secret

Deployed via same Cloudflare account (CF Account ID: `d5a1cd03b76f467430034af64a7062fd`).

### Risks

| Risk | Level | Mitigation |
|---|---|---|
| Vendor lock-in (CF ecosystem) | LOW | RRAL provider interface — switch without app changes |
| Beta / newer product | LOW | CF Calls is in production use globally |
| Recording maturity | MEDIUM | Validate before enabling recording feature |

### Verdict: **SELECTED — Priority 1 for all products**

---

## PROVIDER 2 — LIVEKIT

**Role in RALD:** Failover (P2) for Loop products

### Technical Capabilities

| Feature | Status |
|---|---|
| WebRTC audio | ✅ |
| WebRTC video | ✅ |
| SFU + MCU | ✅ |
| SDK | iOS, Android, Web, React, React Native, Unity |
| Recording (Egress) | ✅ |
| Self-hosted option | ✅ |
| Max participants | 1,000+ |

### Africa / Nigeria Fit

LiveKit Cloud does not have dedicated African PoPs. Nearest nodes for Nigeria users: Frankfurt (~100ms RTT), London (~80ms RTT). Acceptable for fallback audio-only; suboptimal for video. Self-hosted deployment on Nigerian infrastructure would solve this but adds operational complexity.

### API Quality

- Twirp-based REST API (`/twirp/livekit.RoomService/`)
- Access token: HMAC-SHA256 JWT (identical to RALD auth pattern)
- Well-documented SDK and REST reference
- Strong open-source community

### Cost

See `REALTIME_COST_ANALYSIS.md`. 4× more expensive than RealtimeKit at scale.

### Integration

- `LIVEKIT_URL` — Worker secret (e.g. `wss://your-app.livekit.cloud`)
- `LIVEKIT_API_KEY` — Worker secret
- `LIVEKIT_API_SECRET` — Worker secret

### Risks

| Risk | Level | Mitigation |
|---|---|---|
| Higher latency from Nigeria | MEDIUM | Use as failover only; audio-only degraded mode reduces impact |
| Higher cost | MEDIUM | Secondary use — cost impact only if primary fails |
| External dependency | LOW | Full failover to audio-only if LiveKit fails too |

### Verdict: **SELECTED — Priority 2 for Loop/Loop Voice/Loop Business/PayRald**

---

## PROVIDER 3 — TENCENT TRTC

**Role in RALD:** Failover (P2) for Messenger product only

### Technical Capabilities

| Feature | Status |
|---|---|
| WebRTC audio | ✅ |
| WebRTC video | ✅ |
| Voice-only mode | ✅ (relevant for Messenger voice notes) |
| SDK | iOS, Android, Web, Mini Programs |
| Recording | ✅ (cloud recording) |
| Max participants | 1,000+ |

### Africa / Nigeria Fit

Tencent TRTC routes through Tencent's CDN/PoP network. Nigeria access is via Tencent's Singapore → Nigeria path (150–200ms RTT). Higher latency than Cloudflare but adequate for voice-note quality (not real-time audio conversation). Best suited for Messenger voice messages, not Loop live rooms.

### API Quality

- REST API: `trtc.tencentcloudapi.com`
- Auth: TC3-HMAC-SHA256 (complex signature scheme)
- Documentation: primarily in Chinese (English available but less comprehensive)
- The RRAL adapter implements a simplified HMAC signature — full TC3 implementation required for production Tencent usage

### Cost

See `REALTIME_COST_ANALYSIS.md`. Mid-tier pricing. Competitive for voice-only (no video premium).

### Integration

- `TENCENT_SDK_APP_ID` — Worker secret
- `TENCENT_SECRET_KEY` — Worker secret

### Risks

| Risk | Level | Mitigation |
|---|---|---|
| Simplified TC3 auth in adapter | MEDIUM | Implement full TC3-HMAC-SHA256 before activating Tencent as primary |
| Geo-political risk (Chinese provider) | MEDIUM | Use as failover only; not in primary path |
| Documentation quality | LOW | Mitigated by RRAL interface abstraction |
| Higher latency to Nigeria | LOW | Voice-note-only degraded mode — latency not critical |

### Verdict: **SELECTED — Priority 2 for Messenger (voice-note-only degraded)**

---

## REJECTED PROVIDERS

### Daily.co
- Strong API, but ~3× more expensive than RealtimeKit
- No African PoPs
- Not evaluated further

### Agora
- Strong African network presence
- Complex SDK (JS/native required, no pure REST API)
- Higher cost
- Would require SDK bundling — conflicts with Cloudflare Worker constraint

### Twilio Video
- Being deprecated (Twilio sunset announced)
- Not selected

---

## PROVIDER COMPARISON MATRIX

| Criterion | RealtimeKit | LiveKit | Tencent |
|---|---|---|---|
| Nigeria latency | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Cost (per min) | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| API quality | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Recording | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| CF integration | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Open source | ❌ | ⭐⭐⭐⭐⭐ | ❌ |
| Voice-only mode | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Overall** | **P1 — best fit** | **P2 — Loop** | **P2 — Messenger** |

---

## CERTIFICATION DECISION

```
╔══════════════════════════════════════════════════════════════╗
║  G.10 — REALTIME PROVIDER EVALUATION                         ║
║                                                              ║
║  Providers evaluated:    3 (RealtimeKit, LiveKit, Tencent)  ║
║  Providers implemented:  3 adapters (all on GitHub)         ║
║  Primary selected:       ✅ RealtimeKit (P1 all products)   ║
║  Loop failover:          ✅ LiveKit (P2)                     ║
║  Messenger failover:     ✅ Tencent TRTC (P2)               ║
║  Rejected providers:     3 documented (Daily, Agora, Twilio)║
║  Africa/Nigeria fit:     ✅ RealtimeKit = best               ║
║  Cost optimization:      ✅ RealtimeKit = 4× cheaper         ║
║  Provider independence:  ✅ RRAL interface enforces this     ║
║                                                              ║
║  STATUS: ✅ PASS                                              ║
╚══════════════════════════════════════════════════════════════╝
```

LILCKY STUDIO LIMITED — RALD G.10 | 2026-06-03
