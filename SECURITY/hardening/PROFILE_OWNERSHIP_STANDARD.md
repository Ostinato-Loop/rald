# RALD — Profile Ownership Standard

**Document:** PROFILE_OWNERSHIP_STANDARD.md  
**Status:** Enforced  
**Owner:** LILCKY STUDIO LIMITED  
**Last Updated:** 2026-06-13

---

## Principle

All core identity editing happens inside `app.rald.cloud` and `profiles.rald.cloud`. Products own only their product-specific preferences.

---

## What Products Can Edit

| Data Type | Editable By Product | Editable By Identity |
|-----------|--------------------|--------------------|
| Username | ❌ | ✅ profiles.rald.cloud |
| Email address | ❌ | ✅ profiles.rald.cloud |
| Phone number | ❌ | ✅ profiles.rald.cloud |
| Name | ❌ | ✅ profiles.rald.cloud |
| Country / Region | ❌ | ✅ profiles.rald.cloud |
| Profile photo | Loop: own avatar | ✅ profiles.rald.cloud (canonical) |
| Bio | Loop: own bio | ✅ profiles.rald.cloud (canonical) |
| Product display name | ✅ (loop display name) | ✅ (canonical name) |
| Notification preferences | ✅ (product scope) | ❌ |
| Privacy settings | ✅ (product scope) | ❌ |
| Local product preferences | ✅ | ❌ |

---

## Canonical Redirect Endpoint

When a product needs to direct a user to edit their core identity:

```
GET https://auth.rald.cloud/identity/canonical-redirect
    ?return_to=https://loop.rald.cloud/settings
    Authorization: Bearer <user_jwt>
```

**Response:** `302 Redirect → https://profiles.rald.cloud/account?return_to=https://loop.rald.cloud/settings`

---

## Implementation

**File:** `rald-auth-core/src/routes/identity.ts`

The canonical redirect endpoint is already implemented as part of the identity routes. Products should call it instead of building their own identity editing screens.

---

## Rules

1. Products **must not** implement screens for editing username, email, phone, or name
2. Products **must not** store a copy of the canonical identity — they call `/profiles/me` on demand
3. Products **may** store product-specific extensions (Loop bio, Loop avatar) in their own `[product]_profiles` table
4. Products **must** show a "Manage your RALD Account" link that opens `profiles.rald.cloud`
5. Any product-level "Settings" page that touches identity must redirect to the canonical redirect endpoint

---

## Audit Log

| Date | Change |
|------|--------|
| 2026-06-13 | Standard documented |

