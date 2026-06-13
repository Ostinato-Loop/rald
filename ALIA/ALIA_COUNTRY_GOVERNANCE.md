# ALIA_COUNTRY_GOVERNANCE.md
# RALD ALIA — Country Governance Model
**Version:** 1.0 — Phase 2 Governance
**Date:** 2026-06-13

---

## PRINCIPLE

No country activates automatically. No service becomes available in a country without explicit admin approval. Every country lifecycle change requires human sign-off and is permanently audit logged.

---

## COUNTRY STATUS LIFECYCLE

```
DISABLED ──► INTERNAL ──► PRIVATE_BETA ──► PUBLIC_BETA ──► GA
    ▲            │              │                │           │
    │            │              │                │           │
    └────────────┴──────────────┴────────────────┴───────────┘
                         (any status can be reverted to DISABLED)
```

### DISABLED
Default state for every country. ALIA services are not available.

- No registrations accepted from this country
- No aliases resolved for this country's institutions
- No routing to this country's banks
- API returns: `{ error: 'COUNTRY_NOT_SUPPORTED', country: 'XX' }`

---

### INTERNAL
ALIA team access only. Used for integration testing with partner banks.

- Registration restricted to email domains on an internal allowlist
- Alias resolution available for whitelisted institution codes
- All transactions flagged as `TEST_MODE`
- Not visible on public developer console

**Entry criteria:**
- ALIA Platform Admin approval
- At least one banking integration tested end-to-end
- Country regulatory body formally identified

---

### PRIVATE_BETA
Approved external testers (selected banks, fintechs, developers).

- Registration requires invitation code
- All features available to invited users
- Transaction limits set at 10% of KYC tier limits (caution mode)
- Feedback loop active: all errors reported to ALIA ops channel
- Minimum 1 verified institution in ACTIVE status required

**Entry criteria:**
- At least 2 ACTIVE institutions registered
- Country regulatory framework documented in `governance-service`
- KYC tiers configured for country
- Country compliance frameworks verified by legal
- ALIA Platform Admin + Legal sign-off

---

### PUBLIC_BETA
Open registration with waitlist or direct signup. Managed scale.

- Open signup enabled
- Transaction limits at 50% of standard KYC tier limits
- SLA: 99.9% uptime (not yet full 99.99%)
- Developer API access open to approved developers
- Country shown on public status page

**Entry criteria:**
- PRIVATE_BETA successfully operated for minimum 60 days
- At least 5 ACTIVE institutions
- At least 1,000 verified users
- No critical incidents in past 30 days
- Regulatory sandbox approval (if required by country)
- ALIA Platform Admin approval

---

### GA (General Availability)
Full public access. Full transaction limits. Full SLA.

- All features enabled at full limits
- 99.99% uptime SLA
- Developer API open to all verified developers
- Country featured in marketing
- Full regulatory compliance enforced

**Entry criteria:**
- PUBLIC_BETA successfully operated for minimum 90 days
- At least 10 ACTIVE institutions
- At least 10,000 active users
- No P0 incidents in past 60 days
- Full regulatory compliance certification
- Data residency requirements met (if applicable)
- ALIA Platform Admin + Board sign-off

---

## CURRENT COUNTRY STATUS

| Country | Code | Status | Regulatory Body | Notes |
|---------|------|--------|----------------|-------|
| Nigeria | NG | INTERNAL | Central Bank of Nigeria (CBN) | Primary market. CBN Open Banking Framework. Data residency required. |
| Ghana | GH | DISABLED | Bank of Ghana (BoG) | Framework documented. No active institutions. |
| Kenya | KE | DISABLED | Central Bank of Kenya (CBK) | CBK Digital Credit Guidelines. No active institutions. |
| South Africa | ZA | DISABLED | SARB | FAIS, FICA, POPIA requirements. No active institutions. |
| Rwanda | RW | DISABLED | National Bank of Rwanda (BNR) | BNR Digital Financial Services Policy. No active institutions. |

---

## COUNTRY CONFIGURATION

Each country has a canonical configuration record that controls all ALIA behavior for that country:

```typescript
interface CountryConfig {
  code:                   string;           // ISO 3166-1 alpha-2
  name:                   string;
  currency:               string;           // ISO 4217
  status:                 CountryStatus;
  regulatory_body:        string;
  open_banking_standard:  string;
  data_residency_required: boolean;

  // KYC configuration
  kyc_tiers:              KYCTierConfig[];
  identity_requirements:  string[];         // ['BVN', 'NIN'] for NG

  // Transaction limits (in smallest currency unit)
  limits: {
    daily_individual:     number;
    daily_business:       number;
    single_transaction:   number;
    reporting_threshold:  number;           // Auto-report to regulator above this
  };

  // Alias configuration
  alias_rules: {
    max_per_user:         number;
    verification_required: boolean;
  };

  // Compliance
  compliance_frameworks:  string[];         // ['CBN_AML', 'NDPR', 'NFIU_REGULATIONS']
  kyc_mandatory:          boolean;

  // Feature gates
  features: {
    mandate_payments:     boolean;
    cross_border:         boolean;
    developer_api:        boolean;
    merchant_payments:    boolean;
  };

  // Activation
  activated_at?:          string;
  activated_by?:          string;
  beta_start_date?:       string;
  ga_date?:               string;

  // Metadata
  notes:                  string;
  legal_sign_off_by?:     string;
  legal_sign_off_at?:     string;
}
```

---

## COUNTRY ACTIVATION WORKFLOW

```
1. ALIA Platform Admin creates country record (status: DISABLED)
2. ALIA Tech Team completes integration tests (INTERNAL)
3. ALIA Legal Team reviews regulatory requirements → signs off
4. ALIA Admin activates PRIVATE_BETA
5. Partner institutions onboarded (need 2+ ACTIVE institutions)
6. 60-day PRIVATE_BETA monitoring period
7. ALIA Admin reviews metrics → activates PUBLIC_BETA
8. 90-day PUBLIC_BETA monitoring period
9. ALIA Admin + Board reviews → activates GA
```

Every transition emits:
- Kafka event: `governance.country_status_changed`
- Audit log entry (platform_admin actor)
- Email notification to ALIA operations team

---

## WHAT CHANGES WITH COUNTRY STATUS

| Capability | DISABLED | INTERNAL | PRIVATE_BETA | PUBLIC_BETA | GA |
|-----------|---------|----------|-------------|------------|-----|
| User registration | ❌ | ✅ (allowlist) | ✅ (invite) | ✅ (waitlist) | ✅ |
| Alias resolution | ❌ | ✅ | ✅ | ✅ | ✅ |
| KYC tier 1 | ❌ | ✅ | ✅ | ✅ | ✅ |
| KYC tier 2+ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Payment routing | ❌ | ✅ (test) | ✅ | ✅ | ✅ |
| Full tx limits | ❌ | ❌ | ❌ (10%) | ❌ (50%) | ✅ |
| Developer API | ❌ | ❌ | ❌ | ✅ (approved) | ✅ |
| Merchant payments | ❌ | ❌ | ✅ | ✅ | ✅ |
| Mandate payments | ❌ | ❌ | ❌ | ✅ | ✅ |
| Cross-border routing | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## COMPLIANCE ENFORCEMENT BY COUNTRY

### Nigeria (NG)
- BVN required for tier 2+
- NIN required for tier 3
- Daily reporting to CBN for transactions > NGN 5,000,000
- NDPR data privacy rules enforced (data residency in Nigeria)
- NFIU AML rules enforced
- Max aliases per user: 10
- Alias verification required

### Ghana (GH)
- Ghana Card required for tier 2+
- Daily reporting for transactions > GHS 10,000
- Data Protection Act 2012 enforced
- Max aliases per user: 5

### Kenya (KE)
- National ID + KRA PIN required for tier 2+
- Daily reporting for transactions > KES 150,000
- Data Protection Act 2019 enforced
- Max aliases per user: 5

### South Africa (ZA)
- SA ID required for tier 2+
- FAIS, FICA, POPIA, NCA enforced
- Daily reporting for transactions > ZAR 25,000
- Max aliases per user: 5

### Rwanda (RW)
- Rwanda National ID required for tier 2+
- BNR AML rules enforced (data residency required)
- Daily reporting for transactions > RWF 1,000,000
- Max aliases per user: 5

---

## EMERGENCY COUNTRY DISABLE

In the event of:
- Regulatory sanction
- National internet outage
- Systematic fraud event
- Force majeure

A `platform_admin` can immediately revert any country to DISABLED:

```
POST /admin/governance/countries/:code/disable
  Body: { reason: string, incident_id: string }
  Effect: Immediate — all in-flight operations gracefully fail with COUNTRY_UNAVAILABLE
  Notification: All affected developers and institutions notified via webhook
```

This is the only status transition that is immediate (no review period). All others require a 24-hour notice window except for GA → DISABLED which requires Platform Admin + Legal.
