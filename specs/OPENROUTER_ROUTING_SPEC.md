# OPENROUTER ROUTING SPECIFICATION
**Model Resiliency — Multi-Provider AI Routing**
Version: 1.0.0
Issued: 2026-06-05
Issuer: LILCKY STUDIO LIMITED
Status: CANONICAL

---

## 1. PRINCIPLE

> **No product may call an AI provider directly. All model calls go through the Model Router.**

The Model Router ensures:
- No single-provider outages bring down the platform
- Cost optimization through model selection
- BBC controls which model is used (not the caller)
- Token usage tracked per agent, per model, per period

---

## 2. PROVIDER HIERARCHY

| Task Type | Primary | Fallback 1 | Fallback 2 | Fallback 3 |
|-----------|---------|-----------|-----------|-----------|
| Translation | Gemini | Claude | GPT | DeepSeek |
| Reasoning | Claude | GPT | Gemini | DeepSeek |
| Conversation | GPT | Claude | Gemini | DeepSeek |
| Bulk Processing | DeepSeek | Gemini | GPT | Claude |
| Code | Claude | DeepSeek | GPT | Gemini |
| Analysis | Claude | GPT | Gemini | DeepSeek |
| Voice | Gemini | Claude | GPT | — |
| General | Claude | GPT | Gemini | DeepSeek |

---

## 3. AGENT → MODEL DEFAULTS

| Agent | Default Task Type | Default Model |
|-------|------------------|---------------|
| SEKANI | reasoning | Claude 3.5 Sonnet |
| WIZMAC | reasoning | Claude 3.5 Sonnet |
| FOUR | analysis | Claude 3.5 Sonnet |
| MIKA | reasoning | Claude 3.5 Sonnet |
| BUTCHERS | bulk | DeepSeek Chat |
| MERMAC | analysis | GPT-4o |
| DRAGULA | conversation | GPT-4o |

---

## 4. FAILOVER LOGIC

```
1. Try primary model
2. If error (5xx, timeout, quota exceeded) → try Fallback 1
3. If Fallback 1 fails → try Fallback 2
4. If Fallback 2 fails → try Fallback 3
5. If all fail → return 503, log critical system event
```

Maximum retry delay: 500ms between attempts
Total timeout per request: 30 seconds

---

## 5. COST CONTROLS

Every model call records:
- Model provider + model ID
- Input tokens
- Output tokens
- Cost in USD
- Agent that called it

Budgets enforced by the Cost Management system.
If an agent exceeds budget: throttle to lowest-cost model only.

---

## 6. FUTURE: RALD MODELS

When RALD trains its own models:
- RALD Voice Model (African language ASR)
- RALD Translation Model (African language MT)
- RALD BBC Model (intent classification, dialect detection)

These will be added as additional providers in the router with highest priority for relevant tasks.

---

## 7. IMPLEMENTATION

File: `artifacts/api-server/src/lib/openrouter.ts`

```typescript
callModel(taskType: TaskType, messages: Message[], options?: Options)
selectModel(taskType: TaskType): string
getModelForAgent(agentRole: string): TaskType
```

*OPENROUTER_ROUTING_SPEC V1 — LILCKY STUDIO LIMITED — 2026*
