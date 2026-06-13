# RALD Account Standard

**Document:** RALD_ACCOUNT_STANDARD.md  
**Status:** Enforced  
**Owner:** LILCKY STUDIO LIMITED  
**Last Updated:** 2026-06-13

---

## Google Account Model

A user registers **once** at `profiles.rald.cloud`. Every product in the ecosystem uses that single identity. No re-registration. No repeated identity questions.

---

## Registration Collects

At `profiles.rald.cloud`, registration collects only:

| Field | Required | Notes |
|-------|----------|-------|
| Username | ✅ | Permanent identifier — `@username` |
| Phone **or** Email | ✅ | OTP verification |
| Country / Region | Optional | Auto-detected from CF-IPCountry header |

That's it. No password. No display name (optional at time of registration). No profile photo required.

---

## Product-Specific Additional Data

After the user is active, products may request **additional** data only if required for their function. The user is never asked for data they already provided.

| Product | May Request | May Never Request |
|---------|------------|-------------------|
| Loop | Display Name, Bio, Avatar | Name, Username, Email, Phone |
| PayRald | KYC, Business/Compliance data | Name, Username, Email, Phone |
| TradeOS / DunaRald | Business details, Warehouse, Merchant info | Name, Username, Email, Phone |
| GitRald | SSH keys, display preferences | Name, Username, Email, Phone |
| RALD Mail | Signature, mail preferences | Name, Username, Email, Phone |

---

## Never Ask Twice

The following are **owned by RALD Identity** and must never be re-requested by any product:

- Username
- Name
- Email address
- Phone number
- Country / Region

Products retrieve these via `GET /profiles/me` on the user's JWT.

---

## Smart Fill

When a product requests additional data, it should pre-fill from identity:

```typescript
// GET /profiles/me returns:
{
  smart_fill: {
    country:      "NG",
    region:       "Lagos",
    display_name: "Seun Adewale",
  }
}
```

Products use `smart_fill` to pre-populate their forms — the user only needs to confirm or change.

---

## RALD Account Center

Identity editing happens exclusively at:
- `app.rald.cloud` — ecosystem hub
- `profiles.rald.cloud` — full account portal

Products that need to direct users to edit their identity use:

```
GET https://auth.rald.cloud/identity/canonical-redirect?return_to=<product_url>
```

This redirects to `profiles.rald.cloud/account?return_to=<product_url>` where the user edits their identity and is returned to the product.

---

## Audit Log

| Date | Change |
|------|--------|
| 2026-06-13 | Standard documented |

