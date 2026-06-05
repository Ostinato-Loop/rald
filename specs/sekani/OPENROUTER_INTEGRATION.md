# OPENROUTER INTEGRATION
**Unified AI Provider Gateway**
Version: 1.0.0
Issued: 2026-06-05
Status: CANONICAL

---

## 1. WHY OPENROUTER

OpenRouter provides:
- Single API for all model providers
- No provider-specific API keys needed
- Automatic model routing (as backup)
- Usage tracking and billing
- Provider uptime monitoring

**All RALD model calls go through OpenRouter. No service calls providers directly.**

---

## 2. OPENROUTER API

Base URL: `https://openrouter.ai/api/v1`

Authentication:
```
Authorization: Bearer $OPENROUTER_API_KEY
HTTP-Referer: https://rald.cloud
X-Title: SEKANI-BBC-WIZMAC
```

Endpoint: `POST /chat/completions`

---

## 3. MODEL IDs

| Provider | RALD Name | OpenRouter Model ID |
|----------|-----------|-------------------|
| Anthropic | Claude | `anthropic/claude-3.5-sonnet` |
| OpenAI | GPT | `openai/gpt-4o` |
| Google | Gemini | `google/gemini-pro-1.5` |
| DeepSeek | DeepSeek | `deepseek/deepseek-chat` |

---

## 4. REQUEST FORMAT

```typescript
{
  model: "anthropic/claude-3.5-sonnet",
  messages: [
    { role: "system", content: "..." },
    { role: "user", content: "..." }
  ],
  max_tokens: 4096,
  temperature: 0.7,
  stream: false
}
```

---

## 5. RESPONSE PARSING

```typescript
{
  choices: [{
    message: { role: "assistant", content: "..." }
  }],
  usage: {
    prompt_tokens: 150,
    completion_tokens: 300,
    total_tokens: 450
  },
  model: "anthropic/claude-3.5-sonnet"
}
```

---

## 6. ERROR HANDLING

| HTTP Code | Meaning | Action |
|-----------|---------|--------|
| 200 | Success | Use response |
| 429 | Rate limit | Wait + fallback |
| 503 | Provider down | Immediate fallback |
| 400 | Bad request | Return error |
| 401 | Auth failure | Alert + fallback |
| 500 | Server error | Retry 1x, then fallback |

---

## 7. COST TRACKING

OpenRouter returns usage per call.
Every call is logged to `model_usage` with:
- `inputTokens` from `usage.prompt_tokens`
- `outputTokens` from `usage.completion_tokens`
- `costUsd` computed from capability model config

*OPENROUTER_INTEGRATION V1 — LILCKY STUDIO LIMITED — 2026*
