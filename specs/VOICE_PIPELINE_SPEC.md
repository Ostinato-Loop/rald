# VOICE PIPELINE SPECIFICATION
**BBC Voice-First Architecture**
Version: 1.0.0
Issued: 2026-06-05
Issuer: LILCKY STUDIO LIMITED
Status: CANONICAL

---

## 1. MANDATE

> **Voice-first is not a feature. It is the architecture.**

All RALD products default to Hold-to-Talk voice interaction. Text is a secondary fallback.

---

## 2. FULL VOICE PIPELINE

```
[1] Audio Capture (Hold-to-Talk)
  │  Max: 10MB, 5 minutes
  │  Formats: WAV, MP3, WebM, OGG
  │  Validate before upload
  │
  ▼
[2] Audio Validation
  │  Size check (<10MB)
  │  Duration check (<5 min)
  │  Format validation
  │  Silence detection
  │  Quality scoring
  │
  ▼
[3] Speech-to-Text (Deepgram)
  │  Primary: Deepgram Nova-2
  │  Fallback: Whisper (via OpenRouter)
  │  Retry queue: 3 attempts, exponential backoff
  │
  ▼
[4] BBC Language Detection
  │  Detect: language, dialect, accent, region
  │  Confidence scoring
  │  Low confidence → request clarification
  │
  ▼
[5] BBC Meaning + Intent Extraction
  │  Meaning Engine (primary)
  │  Intent Classification
  │  Cultural context mapping
  │
  ▼
[6] Trust Scoring
  │  Voice biometric factor (speaker consistency)
  │  Content risk assessment
  │  History factor (known speaker)
  │
  ▼
[7] SEKANI Routing
  │  Route to correct agent
  │  Select model via OpenRouter
  │
  ▼
[8] Response Generation
  │  Text response from model
  │
  ▼
[9] Text-to-Speech
  │  Convert response to voice
  │  Match user's language/dialect
  │
  ▼
[10] WIZMAC Storage
     language, dialect, accent, region, confidence
     transcript, meaning, intent, response
     speaker_id, duration, quality_score
```

---

## 3. METADATA STORED PER INTERACTION

Every voice interaction stores:

| Field | Type | Description |
|-------|------|-------------|
| `rawTranscript` | text | Exact STT output |
| `normalizedText` | text | BBC-normalized version |
| `detectedLanguage` | text | ISO language code |
| `detectedDialect` | text | Dialect identifier |
| `detectedAccent` | text | Accent classification |
| `detectedRegion` | text | Geographic region |
| `confidence` | float | Overall confidence score |
| `isBbcCompliant` | bool | Passed BBC pipeline |
| `agentRoute` | text | Which agent handled it |
| `processingMs` | int | Total processing time |

---

## 4. RETRY QUEUES

### Transcription Retry
- Max retries: 3
- Backoff: 1s, 5s, 30s
- On final failure: store as `transcription_failed`, alert MERMAC

### Translation Retry
- Max retries: 3
- Backoff: 2s, 10s, 60s
- Fallback: return original language, flag for human review

---

## 5. LANGUAGE SUPPORT TARGET

Phase 1: English, Pidgin (live)
Phase 2: Yoruba, Igbo, Hausa (2026 Q3)
Phase 3: Swahili, Twi, Zulu, Amharic (2026 Q4)
Phase 4: 20+ African languages (2027)
Phase 5: 100+ African languages (2028)
Phase 6: 1000+ dialects (2029+)

*VOICE_PIPELINE_SPEC V1 — LILCKY STUDIO LIMITED — 2026*
