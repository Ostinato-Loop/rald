# SEKANI CORE
**Chief Intelligence and Coordination Agent**
Version: 1.0.0
Issued: 2026-06-05
Issuer: LILCKY STUDIO LIMITED
Status: CANONICAL

---

## 1. WHAT IS SEKANI

SEKANI is NOT a chatbot.

SEKANI is the AI orchestration layer of the RALD Ecosystem — an AI operating system powered by BBC and WIZMAC.

SEKANI coordinates all agents, routes all requests, and ensures every interaction is BBC-compliant.

---

## 2. ARCHITECTURE

```
Input (Voice/Text/API)
  │
  ▼
BBC (Meaning + Intent + Trust)
  │
  ▼
SEKANI (Orchestration)
  ├── Routes to: WIZMAC (memory)
  ├── Routes to: FOUR (security)
  ├── Routes to: MIKA (specialized ops)
  ├── Routes to: BUTCHERS (execution)
  ├── Routes to: MERMAC (monitoring)
  └── Routes to: DRAGULA (reporting)
  │
  ▼
Model Router (OpenRouter)
  ├── Gemini (translation)
  ├── Claude (reasoning)
  ├── GPT (conversation)
  └── DeepSeek (bulk processing)
  │
  ▼
WIZMAC (permanent memory storage)
```

---

## 3. AGENT REGISTRY

| Agent | Role | Model Preference | Memory Scope |
|-------|------|-----------------|--------------|
| **SEKANI** | Chief Intelligence and Coordination | Claude | Full ecosystem |
| **WIZMAC** | Knowledge Graph and Institutional Memory | Claude | Permanent, all scopes |
| **4 (FOUR)** | Security and Threat Response | Claude | Security events |
| **MIKA** | Specialized Operations Coordination | Claude | Operational context |
| **BUTCHERS** | Execution Agents | DeepSeek | Task-scoped |
| **MERMAC** | Observation and Monitoring | GPT | Metrics and telemetry |
| **DRAGULA** | Reporting and Communication | GPT | Reports and comms |

---

## 4. ROUTING LOGIC

SEKANI routes based on BBC-extracted intent:

| Intent Pattern | Agent Route | Model |
|---------------|-------------|-------|
| Language/translation/dialect | SEKANI | Gemini |
| Security/threat/breach | FOUR | Claude |
| Memory/store/history | WIZMAC | Claude |
| Report/summary/analytics | DRAGULA | GPT |
| Execute/run/task/bulk | BUTCHERS | DeepSeek |
| Monitor/observe/health | MERMAC | GPT |
| Reason/analyze/strategy | MIKA | Claude |
| General | SEKANI | Claude |

---

## 5. MODEL ROUTER

SEKANI never hardcodes a single model provider. BBC decides model selection:

```
BBC intent → SEKANI → Model Router → Provider
```

**OpenRouter** is the unified model abstraction layer. All future AI providers connect through model adapters.

No product may call an AI provider directly — all calls go through the Model Router.

---

## 6. EVENT BUS

SEKANI communicates via events (Cloudflare Queues):

| Event | Emitter | Listeners |
|-------|---------|-----------|
| `voice.recorded` | Voice Pipeline | SEKANI, WIZMAC |
| `translation.completed` | BBC | WIZMAC |
| `knowledge.updated` | WIZMAC | All agents |
| `contract.signed` | PayRALD | WIZMAC, DRAGULA |
| `dispatch.completed` | Loop Dispatch | MERMAC, WIZMAC |
| `radio.created` | Loop | MERMAC, WIZMAC |
| `station.connected` | Loop | MERMAC |
| `payment.completed` | PayRALD | WIZMAC, DRAGULA |
| `security.threat` | FOUR | SEKANI, WIZMAC |
| `agent.task.completed` | Any agent | WIZMAC |

---

## 7. API ENDPOINTS

All SEKANI endpoints at `/api/sekani/`:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/sekani/health` | SEKANI system health |
| GET | `/sekani/status` | Full system status with agents |
| POST | `/sekani/process` | Process a BBC-compliant request |
| GET | `/sekani/agents` | List all agents |
| POST | `/sekani/events` | Emit an event |

---

## 8. VOICE-FIRST MANDATE

SEKANI enforces voice-first interaction:

- All user-facing products default to Hold-to-Talk
- Text is a secondary fallback
- All voice interactions are BBC-compliant
- All voice data is stored in WIZMAC

---

*SEKANI_CORE — LILCKY STUDIO LIMITED — 2026*
