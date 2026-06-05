# COST MANAGEMENT
**Model Router Cost Control and Budget Enforcement**
Version: 1.0.0
Issued: 2026-06-05
Status: CANONICAL

---

## 1. COST TRACKING

Every model call records:

```
costUsd = (inputTokens / 1000 × costPer1kInput) + (outputTokens / 1000 × costPer1kOutput)
```

Stored in `model_usage.cost_usd` and aggregated in `model_costs` per:
- Period (daily/weekly/monthly)
- Agent role
- Capability
- Provider

---

## 2. BUDGET ENFORCEMENT

Budgets set in `cost_budgets` table (from Phase 11).

The Model Router checks budgets before selecting a provider:

```
if (providerCostThisPeriod >= budget * alertThreshold):
  → Skip this provider (use next cheapest)
  → Alert DRAGULA

if (providerCostThisPeriod >= budget):
  → Block this provider entirely
  → Use only DeepSeek (cheapest)
  → Alert DRAGULA + SEKANI
```

---

## 3. COST BY PROVIDER (per million tokens)

| Provider | Input | Output |
|----------|-------|--------|
| Claude | $3.00 | $15.00 |
| GPT-4o | $5.00 | $15.00 |
| Gemini Pro | $1.25 | $3.75 |
| DeepSeek | $0.14 | $0.28 |

**Cost optimization**: Route to Gemini or DeepSeek when cost is primary concern and quality threshold is met.

---

## 4. ANALYTICS

`GET /api/model-router/analytics` returns:

- Cost by provider (today/week/month)
- Cost by capability
- Cost by agent
- Token usage trends
- Cost projection (based on current rate)
- Most expensive operations
- Cheapest provider for each capability

---

## 5. COST REDUCTION STRATEGIES

1. **Prompt caching**: Cache common prompts for repeated requests
2. **Capability matching**: Always use lowest-cost provider that meets quality threshold
3. **Token budgets**: Set max_tokens per capability to prevent runaway costs
4. **Batch processing**: BUTCHERS batches requests for lower effective cost

*COST_MANAGEMENT V1 — LILCKY STUDIO LIMITED — 2026*
