# ALIA ROUTING ENGINE
**RALD Ecosystem Finalization Program — Phase 6**
**Date:** 2026-06-13 | **Status:** SPECIFICATION

---

## Mission

ALIA is the intelligence layer of the RALD ecosystem. The Routing Engine determines which ALIA instance responds to a given request: which country, which domain, which persona, which capability set. It is the front door to the entire ALIA intelligence network.

---

## Architecture Overview

```
User Request
  ↓
ALIA Gateway (rald-routing worker)
  ├── Identity Resolution  → Who is this user? (RALD user_id, trust_level, country)
  ├── Intent Classification → What are they asking for? (domain, intent_type)
  ├── Consent Check        → Does ALIA have consent to act on this? (see ALIA_CONSENT_ENGINE.md)
  ├── Trust Gate           → Is trust level sufficient for this capability?
  └── Route Selection      → Which ALIA instance handles this?
        ├── country-ALIA (Nigeria → NG-ALIA, Ghana → GH-ALIA, ...)
        ├── domain-ALIA  (finance → PayALIA, law → LexALIA, ...)
        ├── persona-ALIA (Coach, Assistant, Mentor, Professional)
        └── capability-ALIA (deep research, voice, code, vision)
  ↓
Selected ALIA Instance
  ↓  (response)
ALIA Gateway
  ↓  (streamed back to client)
User
```

---

## ALIA Instance Registry

```typescript
interface ALIAInstance {
  id:           string;   // e.g. "ng-general", "financealia", "coach-v2"
  name:         string;   // Human display name
  type:         "country" | "domain" | "persona" | "capability";
  geographic:   string[];  // ISO 3166-1 codes or ["ALL"]
  languages:    string[];  // BCP 47
  domains:      string[];  // e.g. ["finance","tax","banking"]
  capabilities: string[];  // e.g. ["chat","voice","document","deep_search"]
  trust_minimum: 0 | 10 | 25 | 50 | 75;  // minimum trust_score to access
  consent_scopes: string[];  // required consent grants
  endpoint:     string;   // Worker URL
  priority:     number;   // lower = preferred when multiple match
  active:       boolean;
}
```

### Current ALIA Instances

| ID | Type | Countries | Domains | Minimum Trust |
|----|------|-----------|---------|---------------|
| `ng-general` | country | NG | all | 0 |
| `gh-general` | country | GH | all | 0 |
| `ke-general` | country | KE | all | 0 |
| `za-general` | country | ZA | all | 0 |
| `finance-alia` | domain | ALL | finance, banking, tax, investment | 10 |
| `legal-alia` | domain | ALL | law, contracts, compliance, rights | 25 |
| `gov-alia` | domain | ALL | government, policy, permits | 10 |
| `health-alia` | domain | ALL | health, medical (general info only) | 0 |
| `coach-alia` | persona | ALL | personal development, productivity | 0 |
| `business-alia` | persona | ALL | SME, entrepreneurship, operations | 10 |
| `deep-alia` | capability | ALL | deep research, document analysis | 50 |
| `voice-alia` | capability | ALL | voice interaction | 0 |
| `code-alia` | capability | ALL | code generation, debugging | 10 |

---

## Routing Algorithm

```typescript
async function route(request: ALIARequest): Promise<ALIAInstance> {
  const user = await resolveUser(request.auth_token);
  
  // Step 1: Filter by geography (user.country matches instance.geographic)
  const geoMatched = instances.filter(i =>
    i.active &&
    (i.geographic.includes("ALL") || i.geographic.includes(user.country))
  );
  
  // Step 2: Filter by trust gate
  const trustGated = geoMatched.filter(i => user.trust_score >= i.trust_minimum);
  
  // Step 3: Filter by consent
  const consented = await filterByConsent(trustGated, user.id, request);
  
  // Step 4: Classify intent
  const intent = await classifyIntent(request.input);
  
  // Step 5: Score remaining instances
  const scored = consented.map(i => ({
    instance: i,
    score: scoreInstance(i, intent, user)
  })).sort((a, b) => b.score - a.score);
  
  // Step 6: Select best match (or ng-general as ultimate fallback)
  return scored[0]?.instance ?? instances.find(i => i.id === "ng-general")!;
}

function scoreInstance(instance: ALIAInstance, intent: Intent, user: User): number {
  let score = 0;
  // Domain match
  if (instance.domains.some(d => intent.domains.includes(d))) score += 100;
  // Language match
  if (instance.languages.includes(user.language)) score += 50;
  // Capability match
  if (intent.requires_capability && instance.capabilities.includes(intent.requires_capability)) score += 75;
  // Lower priority number = higher preference
  score -= instance.priority;
  return score;
}
```

---

## Intent Classification

```typescript
interface Intent {
  domains:              string[];   // detected domain(s)
  intent_type:          "question" | "task" | "analysis" | "generation" | "conversation";
  requires_capability:  string | null;  // "voice", "deep_search", "code", "vision"
  complexity:           "simple" | "moderate" | "complex";
  is_sensitive:         boolean;   // medical, legal, financial advice flag
  language:             string;    // detected input language
}
```

Intent classification runs in the routing worker before backend selection. Uses a lightweight classifier (< 10ms, runs at edge).

---

## Request Format

```typescript
interface ALIARequest {
  auth_token:   string;   // RALD JWT
  input:        string;   // User message
  context?: {
    thread_id?:    string;
    app_source?:   string;  // "loop", "messenger", "accounts"
    location?:     { country: string; region?: string; };
    attachments?:  ALIAAttachment[];
  };
  preferences?: {
    persona?:    string;  // "coach", "assistant", "professional"
    language?:   string;  // preferred response language
    streaming?:  boolean;
  };
}
```

---

## Worker Implementation (rald-routing)

```typescript
// src/index.ts
import { Hono } from "hono";
import { verifyJwt } from "@rald/auth";
import { routeRequest } from "./router";

const app = new Hono();

app.post("/alia/route", async (c) => {
  const auth = c.req.header("Authorization");
  const user = await verifyJwt(auth?.replace("Bearer ", "") ?? "", c.env.RALD_JWT_SECRET);
  if (!user) return c.json({ error: "unauthorized" }, 401);

  const body: ALIARequest = await c.req.json();
  const instance = await routeRequest(body, user, c.env);
  
  // Proxy to selected instance
  const upstream = await fetch(instance.endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-RALD-User-ID": user.sub, "X-RALD-Trust": String(user.trust_score) },
    body: JSON.stringify(body),
  });
  
  return new Response(upstream.body, {
    headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" }
  });
});

export default app;
```

---

## Geographic Expansion Plan

Phase 1 (Now): NG, GH, KE, ZA
Phase 2 (Q3 2026): SN, CI, CM, UG, ET, TZ
Phase 3 (Q4 2026): EG, MA, DZ, TN, ZM, ZW
Phase 4 (2027): Continental ALIA — 54 country nodes

---

*See also: ALIA_TRUST_ENGINE.md, ALIA_CONSENT_ENGINE.md, MACHINE_IDENTITY_STANDARD.md*
