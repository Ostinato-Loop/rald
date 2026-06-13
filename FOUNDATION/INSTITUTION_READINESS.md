# INSTITUTION READINESS
**RALD Ecosystem Finalization Program — Phase 14**
**Date:** 2026-06-13 | **Status:** SPECIFICATION

---

## Mission

Prepare RALD to serve Banks, Governments, and Enterprises as verified institutional participants — not just as background payment or identity infrastructure, but as full ecosystem partners with their own accounts, verified status, branded presence, and delegated authorization flows.

---

## Institutional Account Types

```typescript
type InstitutionType =
  | "bank"
  | "fintech"
  | "microfinance"
  | "insurance"
  | "government_federal"
  | "government_state"
  | "government_local"
  | "enterprise_large"        // > 250 employees
  | "enterprise_sme"          // 10–250 employees
  | "ngo"
  | "university"
  | "media"
  | "telco";
```

Institutions get:
- `trust_score: 90+` on verification
- Verified badge (government-green tick for government, blue for others)
- Enhanced API limits (Enterprise tier by default)
- Delegated Authorization flows
- Audit export capabilities
- Compliance report generation
- Multi-party authorization

---

## Institutional Verification Flow

```
1. Organization creates RALD account
   └── type: "government_state" | "bank" | etc.

2. Submit verification documents:
   └── CAC Certificate / Government Gazette Entry
   └── Contact person with signing authority
   └── Official domain email confirmation
   └── Optional: physical address verification

3. RALD Compliance Review (SLA: 5 business days)
   └── Manual review for Banks and Governments
   └── Automated for SME (CAC number lookup)

4. Verification granted:
   └── trust_score set to 90–100
   └── `is_verified: true` on org record
   └── Verified badge displayed in all RALD products
   └── Enterprise API tier activated
   └── Emit `organization.verified` event
```

---

## Delegated Authorization

Institutions need to manage permissions across many employees:

```
Institution Admin
  ├── Owner       → full control, billing, verification
  ├── Admin       → manage members, configure integrations
  ├── Operator    → approve transactions, review queues
  ├── Analyst     → read-only access to dashboards and reports
  └── Developer   → API access, webhook management

Delegation Rules:
- Owners can do everything
- Admins can grant up to Admin level to others (cannot grant Owner)
- Operators can approve anything within their configured limits
- Analysts can export data but cannot write
- No role can escalate their own privileges
```

---

## Multi-Party Authorization (Approval Chains)

For high-stakes operations (large payments, user data exports, policy changes):

```typescript
interface ApprovalChain {
  id:          string;
  operation:   string;    // "transfer.large", "data.export", "user.ban"
  thresholds: {
    amount?:    number;   // trigger if transfer > X
    data_rows?: number;   // trigger if export > X rows
  };
  required_approvers: number;      // e.g. 2-of-3
  approver_roles:     string[];    // e.g. ["operator", "admin"]
  timeout_hours:      number;      // auto-reject if not approved in time
}

// Example: Government bulk payment
const GOV_PAYMENT_CHAIN: ApprovalChain = {
  id:                 "gov-bulk-payment",
  operation:          "transfer.bulk",
  thresholds:         { amount: 1_000_000 },  // ₦1M+
  required_approvers: 2,
  approver_roles:     ["operator", "admin"],
  timeout_hours:      48,
};
```

---

## Audit Export

Institutions receive compliance-grade audit exports:

```
GET /institution/:id/audit-export?from=...&to=...&format=json|csv|pdf

Export includes:
├── All API calls made by institution (timestamp, user, endpoint, result)
├── All permission changes (who granted what to whom)
├── All approval chain decisions (who approved/rejected what)
├── All data access events (what user data was accessed and why)
├── All payments initiated (payer, payee, amount, status)
└── Compliance summary (KYC levels, risk flags, anomaly detections)

Data retention: 7 years (configurable per institution)
Format: NDPR-compliant (Nigerian Data Protection Regulation)
Signature: Cryptographically signed for legal validity
```

---

## Government Integration Features

### Identity Verification Bridge
```
Government can issue RALD-verifiable credentials:
  - NIN (National Identity Number) → verified via NIMC API
  - BVN (Bank Verification Number) → verified via CBN API
  - NIN/BVN verification → trust_score += 20, is_verified = true
```

### Citizen Services Portal
```
Government agencies can embed RALD Account for:
  - Citizen identity (RALD is the login)
  - Document submissions (via RALD Files)
  - Notifications (via RALD Messenger)
  - Payments (via PayRald)
  - Permit applications and tracking
```

### Electoral / Community Governance
```
Communities on Loop can use RALD's trust-gated voting:
  - Proposals posted on Loop
  - Voting requires trust_score ≥ 25 (active member)
  - Results verifiable via event audit trail
  - Used for: community decisions, LGA budgets, DAO governance
```

---

## Risk Review System

```typescript
interface RiskReview {
  id:          string;
  subject_id:  string;   // user or org being reviewed
  trigger:     "velocity" | "fraud_report" | "compliance_flag" | "manual";
  risk_level:  "low" | "medium" | "high" | "critical";
  findings:    RiskFinding[];
  status:      "open" | "under_review" | "cleared" | "action_taken";
  created_at:  string;
  resolved_at: string | null;
  actions:     RiskAction[];  // suspend, limit, flag, clear
}
```

---

## Compliance Certifications Target

| Certification | Target Date | Owner |
|--------------|-------------|-------|
| NDPR (Nigeria) | Q3 2026 | Legal + Engineering |
| CBN FinTech Sandbox | Q3 2026 | PayRald team |
| ISO 27001 | Q4 2026 | Engineering |
| SOC 2 Type I | Q4 2026 | Engineering |
| PCI-DSS (for card flows) | Q1 2027 | PayRald |

---

*See also: ALIA_CONSENT_ENGINE.md, OBSERVABILITY_STANDARD.md, RALD_ECOSYSTEM_SCORECARD.md*
