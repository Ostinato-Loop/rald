# ROUTING RULES
**SEKANI Model Router — Capability to Provider Mapping**
Version: 1.0.0
Issued: 2026-06-05
Status: CANONICAL

---

## ROUTING RULES TABLE

| Capability | Priority 1 | Priority 2 | Priority 3 | Priority 4 |
|-----------|-----------|-----------|-----------|-----------|
| `reasoning` | Claude | GPT | Gemini | DeepSeek |
| `translation` | Gemini | Claude | GPT | DeepSeek |
| `coding` | Claude | DeepSeek | GPT | Gemini |
| `classification` | Gemini | GPT | Claude | DeepSeek |
| `summarization` | GPT | Claude | Gemini | DeepSeek |
| `voice-processing` | Gemini | Claude | GPT | — |
| `knowledge-analysis` | Claude | GPT | Gemini | DeepSeek |
| `research` | Claude | GPT | Gemini | DeepSeek |
| `conversation` | GPT | Claude | Gemini | DeepSeek |

---

## ROUTING CONDITIONS

Each routing decision also checks:

1. **Health Gate**: Provider must be `active` or `degraded`-but-below-threshold
2. **Budget Gate**: Provider must not have exceeded its budget for this period
3. **Capability Gate**: Selected model must support the requested capability
4. **Latency Gate**: Provider P99 latency must not exceed rule's `maxLatencyMs`

If a condition fails → skip to next provider in priority order.

---

## FORCING A PROVIDER

Callers can force a provider by setting `forceProvider` in the request.
This bypasses the routing rule priority.
The forced provider must still pass health and budget gates.

---

## ROUTING DECISION REASONS

| Reason | Description |
|--------|-------------|
| `primary_selected` | Normal — top priority provider chosen |
| `fallback_latency` | Primary too slow, fallback used |
| `fallback_error` | Primary returned error |
| `fallback_budget` | Primary over budget |
| `fallback_capability` | Primary doesn't support this capability |
| `health_degraded` | Primary health check failed |
| `forced_selection` | Caller forced a specific provider |

All routing decisions logged to WIZMAC permanently.

*ROUTING_RULES V1 — LILCKY STUDIO LIMITED — 2026*
