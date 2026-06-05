# PROVIDER REGISTRY
**Registered AI Model Providers**
Version: 1.0.0
Issued: 2026-06-05
Status: CANONICAL

---

## REGISTERED PROVIDERS

### Claude (Anthropic)
- **Slug**: `claude`
- **Priority**: 1 (highest)
- **OpenRouter Model**: `anthropic/claude-3.5-sonnet`
- **Max Tokens**: 8,192 output / 200k context
- **Cost**: $0.003 / 1k input · $0.015 / 1k output
- **Strengths**: Reasoning, analysis, knowledge work, coding
- **Capabilities**: reasoning, coding, knowledge-analysis, research, voice-processing, summarization, conversation
- **Health Check**: POST /chat/completions with minimal prompt

### GPT (OpenAI)
- **Slug**: `gpt`
- **Priority**: 2
- **OpenRouter Model**: `openai/gpt-4o`
- **Max Tokens**: 4,096 output / 128k context
- **Cost**: $0.005 / 1k input · $0.015 / 1k output
- **Strengths**: Conversation, summarization, general tasks
- **Capabilities**: conversation, summarization, classification, research, reasoning
- **Health Check**: POST /chat/completions with minimal prompt

### Gemini (Google)
- **Slug**: `gemini`
- **Priority**: 3
- **OpenRouter Model**: `google/gemini-pro-1.5`
- **Max Tokens**: 8,192 output / 1M context
- **Cost**: $0.00125 / 1k input · $0.00375 / 1k output
- **Strengths**: Translation, multilingual, classification, cost-effective
- **Capabilities**: translation, classification, voice-processing, summarization, conversation
- **Health Check**: POST /chat/completions with minimal prompt

### DeepSeek
- **Slug**: `deepseek`
- **Priority**: 4 (lowest cost)
- **OpenRouter Model**: `deepseek/deepseek-chat`
- **Max Tokens**: 4,096 output / 64k context
- **Cost**: $0.00014 / 1k input · $0.00028 / 1k output
- **Strengths**: Bulk processing, cost-sensitive tasks, coding
- **Capabilities**: coding, summarization, classification, conversation
- **Health Check**: POST /chat/completions with minimal prompt

---

## FUTURE PROVIDERS

When RALD trains its own models:

| Provider | Model | Capability Focus |
|----------|-------|-----------------|
| RALD ASR | rald-asr-v1 | African language speech-to-text |
| RALD NMT | rald-nmt-v1 | African language neural machine translation |
| RALD BBC | rald-bbc-v1 | Intent classification, dialect detection |

These will be added as `priority: 0` for their specific capabilities.

*PROVIDER_REGISTRY V1 — LILCKY STUDIO LIMITED — 2026*
