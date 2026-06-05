# COST MANAGEMENT SPECIFICATION
**Budget Protection and Cost Optimization**
Version: 1.0.0
Issued: 2026-06-05
Issuer: LILCKY STUDIO LIMITED
Status: CANONICAL

---

## 1. PRINCIPLE

> **No agent can bankrupt the platform. Budgets are enforced, not suggested.**

---

## 2. BUDGET HIERARCHY

```
Platform Budget (monthly)
  │
  ├── Per-Service Budget (Loop, Messenger, RALD TV, etc.)
  │
  └── Per-Agent Budget
        ├── SEKANI
        ├── WIZMAC
        ├── FOUR
        ├── MIKA
        ├── BUTCHERS
        ├── MERMAC
        └── DRAGULA
```

---

## 3. BUDGET TYPES

| Budget Type | Scope | Period | Alert At |
|------------|-------|--------|---------|
| Platform | All services | Monthly | 80% |
| Per-service | Single service | Monthly | 80% |
| Per-agent | Single agent | Daily | 90% |
| Per-model | Single model | Daily | 85% |

---

## 4. ENFORCEMENT ACTIONS

| Usage Level | Action |
|------------|--------|
| < 80% | Normal operation |
| 80% | Alert DRAGULA → notify admin |
| 90% | Throttle to lower-cost models |
| 95% | Block all but lowest-cost model |
| 100% | Block all model calls for the scope |

---

## 5. MODEL COST TABLE (as of 2026)

| Model | Input $/1k tokens | Output $/1k tokens |
|-------|------------------|------------------|
| Claude 3.5 Sonnet | $0.003 | $0.015 |
| GPT-4o | $0.005 | $0.015 |
| Gemini Pro | $0.00125 | $0.00375 |
| DeepSeek Chat | $0.00014 | $0.00028 |

**When budget is tight: fall back to DeepSeek or Gemini.**

---

## 6. TRACKING

All model calls tracked in `cost_usage` table:
- Agent role
- Model provider + model ID
- Input tokens
- Output tokens
- Cost in USD
- Period (daily/monthly bucket)

Dashboard at: `/api/observe/cost-monitoring`

---

## 7. AUTOMATIC THROTTLING

When agent budget is at 90%:
```
MERMAC detects budget threshold
  → SEKANI receives throttle signal
  → Model Router switches agent to cheapest fallback
  → DRAGULA sends cost alert to admin
  → WIZMAC logs cost event
```

*COST_MANAGEMENT_SPEC V1 — LILCKY STUDIO LIMITED — 2026*
