# ALIA TRUST ENGINE
**RALD Ecosystem Finalization Program — Phase 7**
**Date:** 2026-06-13 | **Status:** SPECIFICATION

---

## Mission

The Trust Engine is the single authority that decides how much of the RALD ecosystem a user can access. It computes a `trust_score` (0–100) and `trust_level` based on verifiable signals, making the score tamper-proof, portable across all products, and always up-to-date.

---

## Trust Score

```
trust_score: integer 0–100

0      No activity / new account
10     Phone verified
20     Email added
25     First 5 meaningful social interactions
35     Active for 7 days
40     Business profile added
50     Government ID verified
55     Community contributor (50+ meaningful contributions)
60     High-activity member (daily active 30 days)
70     Institutional verification (bank, employer, government agency)
75     RALD-verified merchant with track record
80     Developer with published apps
85     Elected community leader
90     Enterprise organization with verified compliance
95     Strategic partner (pre-approved)
100    Reserved (internal use)
```

---

## Trust Levels

```
none         → 0–9
member       → 10–24
active       → 25–39
contributor  → 40–59
verified     → 60–74
leader       → 75–89
institutional → 90–100
```

---

## Trust Signals

```typescript
interface TrustSignal {
  signal:     string;
  weight:     number;   // points added to score
  category:   "identity" | "social" | "commerce" | "institutional" | "behavioral";
  verifiable: boolean;  // can be cryptographically verified
  ttl?:       number;   // seconds; null = permanent
}

const TRUST_SIGNALS: TrustSignal[] = [
  // Identity
  { signal: "phone_verified",           weight: 10, category: "identity",    verifiable: true },
  { signal: "email_verified",           weight: 5,  category: "identity",    verifiable: true },
  { signal: "passkey_registered",       weight: 5,  category: "identity",    verifiable: true },
  { signal: "gov_id_verified",          weight: 20, category: "institutional",verifiable: true },
  { signal: "biometric_enrolled",       weight: 5,  category: "identity",    verifiable: true },
  // Social
  { signal: "first_week_complete",      weight: 5,  category: "social",      verifiable: false },
  { signal: "50_contributions",         weight: 10, category: "social",      verifiable: false },
  { signal: "30d_active",               weight: 10, category: "behavioral",  verifiable: false, ttl: 2592000 },
  // Commerce
  { signal: "payrald_transaction",      weight: 5,  category: "commerce",    verifiable: true },
  { signal: "verified_merchant",        weight: 15, category: "commerce",    verifiable: true },
  { signal: "enterprise_customer",      weight: 20, category: "institutional",verifiable: true },
  // Institutional
  { signal: "bank_linked",             weight: 10, category: "institutional",verifiable: true },
  { signal: "employer_verified",        weight: 15, category: "institutional",verifiable: true },
  { signal: "government_account",       weight: 20, category: "institutional",verifiable: true },
  // Developer
  { signal: "published_app",            weight: 10, category: "institutional",verifiable: true },
  { signal: "developer_active_30d",     weight: 5,  category: "behavioral",  verifiable: false, ttl: 2592000 },
];
```

---

## Computation

```typescript
async function computeTrustScore(userId: string, env: Env): Promise<TrustResult> {
  const signals = await getUserTrustSignals(userId, env);
  
  let score = 0;
  const applied: string[] = [];
  
  for (const signal of TRUST_SIGNALS) {
    const userSignal = signals.find(s => s.signal === signal.signal);
    if (!userSignal) continue;
    
    // Check TTL
    if (signal.ttl && userSignal.granted_at + signal.ttl < Date.now() / 1000) continue;
    
    score += signal.weight;
    applied.push(signal.signal);
  }
  
  score = Math.min(100, score);
  
  const level = scoreTolevel(score);
  
  return { score, level, signals: applied, computed_at: new Date().toISOString() };
}

function scoreTolevel(score: number): TrustLevel {
  if (score >= 90) return "institutional";
  if (score >= 75) return "leader";
  if (score >= 60) return "verified";
  if (score >= 40) return "contributor";
  if (score >= 25) return "active";
  if (score >= 10) return "member";
  return "none";
}
```

---

## Trust in the JWT

Every RALD JWT includes trust claims:

```json
{
  "sub":          "user_uuid",
  "username":     "handle",
  "trust_score":  45,
  "trust_level":  "contributor",
  "trust_signals": ["phone_verified","email_verified","50_contributions"],
  "iat":          1718000000,
  "exp":          1718003600
}
```

Trust claims are computed at JWT issuance and refreshed on each new token. Claims are not trusted beyond the JWT expiry.

---

## Trust-Gated Capabilities

| Capability | Minimum Level | Minimum Score |
|-----------|--------------|--------------|
| RALD Account creation | none | 0 |
| Loop post (text) | member | 10 |
| Loop post (media) | active | 25 |
| Create community | contributor | 40 |
| PayRald send | member | 10 |
| PayRald send > ₦100k | contributor | 40 |
| Merchant account | contributor | 40 |
| ALIA deep research | contributor | 40 |
| ALIA legal advice | verified | 60 |
| ALIA institutional mode | institutional | 90 |
| Developer API | active | 25 |
| Developer production | contributor | 40 |
| Enterprise org | institutional | 90 |

---

## Trust Signal API

```
POST /trust/signal          → Emit a trust signal event (internal only)
GET  /trust/score/:user_id  → Get current trust score + level
GET  /trust/explain/:user_id → Get breakdown of how score was computed
POST /trust/revoke/:user_id  → Admin: revoke a signal (fraud/abuse)
```

---

## Anti-Gaming Rules

1. **Each signal category capped**: Identity 30pts, Social 25pts, Commerce 30pts, Institutional 40pts, Behavioral 15pts. Total can't exceed sum of caps.
2. **Velocity check**: More than 3 new signals in 24 hours → manual review queue.
3. **Revocation cascade**: If `gov_id_verified` is revoked (fraud), score is recomputed immediately and all TTL signals are invalidated.
4. **No self-reporting**: Signals must be generated by verifiable system events, not user claims.

---

*See also: ALIA_CONSENT_ENGINE.md, ALIA_ROUTING_ENGINE.md, UNIVERSAL_USER_MODEL.md*
