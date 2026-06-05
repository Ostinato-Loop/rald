# MODEL ROUTER SPECIFICATION
**SEKANI Model Router — Provider-Agnostic AI Routing**
Version: 1.0.0
Issued: 2026-06-05
Issuer: LILCKY STUDIO LIMITED
Status: CANONICAL

---

## 1. ARCHITECTURE

```
BBC (intent + meaning + capability)
  │
  ▼
SEKANI (orchestration)
  │  SEKANI only requests capabilities. SEKANI never knows provider APIs.
  ▼
Model Router (/api/model-router/route)
  │  Selects provider + model based on capability, health, cost, latency
  ▼
OpenRouter (unified API gateway)
  │  Single API, multiple providers
  ▼
Model Provider
  ├── Claude (Anthropic)
  ├── GPT (OpenAI)
  ├── Gemini (Google)
  └── DeepSeek
  │
  ▼
WIZMAC
  └── Receives ALL routing decisions, usage, costs permanently
```

---

## 2. CAPABILITIES REGISTRY

| Capability | Description | Primary | Fallback Chain |
|-----------|-------------|---------|---------------|
| `reasoning` | Complex reasoning + analysis | Claude | GPT → Gemini → DeepSeek |
| `translation` | Language translation | Gemini | Claude → GPT → DeepSeek |
| `coding` | Code generation + review | Claude | DeepSeek → GPT → Gemini |
| `classification` | Intent + content classification | Gemini | GPT → Claude → DeepSeek |
| `summarization` | Document + content summarization | GPT | Claude → Gemini → DeepSeek |
| `voice-processing` | Voice + audio analysis | Gemini | Claude → GPT → — |
| `knowledge-analysis` | Knowledge graph analysis | Claude | GPT → Gemini → DeepSeek |
| `research` | Deep research + synthesis | Claude | GPT → Gemini → DeepSeek |
| `conversation` | General conversation | GPT | Claude → Gemini → DeepSeek |

---

## 3. ROUTING ALGORITHM

```
1. Receive capability request from SEKANI
2. Look up routing rule for capability
3. Get provider priority list (ordered)
4. For each provider in priority order:
   a. Check: is provider active?
   b. Check: is provider healthy?
   c. Check: is budget available?
   d. Check: does model support this capability?
   e. If all pass → SELECT this provider/model
   f. If fails → try next provider, log skip reason
5. Call OpenRouter with selected model
6. On error → fallback to next provider
7. Log routing decision to WIZMAC
8. Return response + metadata
```

---

## 4. PROVIDER FALLBACK CHAIN

```
Primary (capability-based)
  │
  ▼ (if down/degraded/over-budget)
Fallback 1
  │
  ▼ (if also fails)
Fallback 2
  │
  ▼ (if also fails)
Fallback 3
  │
  ▼ (if ALL fail)
503 + critical alert via DRAGULA + log to WIZMAC
```

---

## 5. DATABASE TABLES

| Table | Purpose |
|-------|---------|
| `model_providers` | Provider registry (Claude, GPT, Gemini, DeepSeek) |
| `model_capabilities` | Per-provider model capabilities + costs |
| `model_health` | Health check results (every 5 minutes) |
| `model_usage` | Every model call with tokens + cost + latency |
| `model_costs` | Aggregated cost per period/agent/capability |
| `routing_rules` | Capability → provider priority mapping |
| `routing_decisions` | Every routing decision logged permanently |

---

## 6. HEALTH MONITORING

- Health checks every 5 minutes
- A provider becomes `degraded` at error rate > 10%
- A provider becomes `down` at error rate > 30% or 3 consecutive failures
- A `down` provider is automatically excluded from routing
- Recovery: provider must pass 3 consecutive health checks to return to `active`

---

## 7. WIZMAC INTEGRATION

Every routing decision → written to `routing_decisions` table permanently.
Every model usage → written to `model_usage` table permanently.
Routing history queryable via: `GET /api/model-router/history`

*MODEL_ROUTER_SPEC V1 — LILCKY STUDIO LIMITED — 2026*
