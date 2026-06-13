# RALD — Machine Identity Standard

**Document:** MACHINE_IDENTITY_STANDARD.md  
**Status:** Phase 11 In Migration — Legacy X-Internal-Secret Being Retired  
**Owner:** LILCKY STUDIO LIMITED  
**Last Updated:** 2026-06-13

---

## Principle

Service-to-service calls use **Machine JWT** tokens — not shared secrets. No service knows another service's secret.

---

## Legacy Pattern (Being Retired)

```
X-Internal-Secret: <INTERNAL_SECRET env var>
```

**Status:** Still accepted by `rald-auth-core/src/middleware/machine.ts` for backward compatibility during migration. Will be removed once all callers are migrated.

---

## V2 Machine Identity Pattern

```
Authorization: MachineBearer <machine_jwt>
```

Machine JWTs are issued by `auth.rald.cloud/machine/identities` and contain:

```json
{
  "sub": "svc:loop-worker",
  "aud": "svc:auth-core",
  "iss": "auth.rald.cloud",
  "permissions": ["session.read", "user.read"],
  "machine": true,
  "iat": 1749820000,
  "exp": 1749906400
}
```

---

## Machine Identity Registry

**Table:** `machine_identities`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Stable identity ID |
| `service_name` | TEXT | e.g. `svc:loop-worker` |
| `display_name` | TEXT | Human-readable name |
| `key_id` | TEXT | `mid_<hex>` — public identifier |
| `key_hash` | TEXT | SHA-256(secret:salt) — stored, not the secret |
| `key_salt` | TEXT | Salt for key hash |
| `scopes` | TEXT[] | Permitted operations |
| `allowed_services` | TEXT[] | Which services may be called |
| `status` | TEXT | `active` / `rotated` / `revoked` |
| `rotation_due_at` | TIMESTAMPTZ | Next required rotation |
| `last_rotated_at` | TIMESTAMPTZ | Last rotation |
| `environment` | TEXT | `production` / `staging` |

---

## Machine Services Registry

| Service | Machine ID | Scopes |
|---------|-----------|--------|
| Loop Worker | `svc:loop-worker` | `session.read`, `user.read`, `profile.read` |
| Messenger | `svc:messenger` | `user.read`, `profile.read` |
| PayRald | `svc:payrald` | `user.read`, `kyc.write`, `payment.write` |
| RALD Notify | `svc:rald-notify` | `user.read`, `notification.send` |
| RALD Events | `svc:rald-events` | `event.publish` |
| RALD AI | `svc:rald-ai` | `user.read`, `profile.read` |

---

## Rotation Policy

- **Default rotation window:** 90 days
- **Rotation alerts:** Sent 7 days before expiry via `auth.rald.cloud` scheduled cleanup
- **Emergency rotation:** `POST /machine/identities/:id/rotate` (admin only)
- **Key revocation:** `POST /machine/identities/:id/revoke` (admin only)

---

## Audit Log

Machine JWT usage is logged per request:
- `service_name`, `key_id`, `endpoint`, `timestamp`, `outcome`
- Stored in `machine_audit_logs` table
- Accessible via `GET /machine/identities/:id/audit-log` (admin only)

---

## TODO: Asymmetric Verification

Current implementation uses symmetric HMAC (shared `RALD_JWT_SECRET`). The target is ES256/Ed25519 asymmetric verification:

```typescript
// TODO in rald-auth-core/src/middleware/machine.ts:
// Replace: jwtVerify(token, symmetricSecret)
// With:    jwtVerify(token, publicKey)  — each service has its own keypair
```

This removes the need for services to share `RALD_JWT_SECRET` entirely.

---

## Migration Checklist

| Service | X-Internal-Secret | MachineBearer | Status |
|---------|------------------|---------------|--------|
| rald-auth-core middleware | Accepts both | Accepts both | ⚠️ In migration |
| loop-worker | Unknown | Not implemented | ❌ Needs migration |
| rald-notify | Unknown | Not implemented | ❌ Needs migration |
| All other services | Unknown | Not implemented | ❌ Needs audit |

---

## Audit Log

| Date | Change |
|------|--------|
| 2026-06-13 | Machine identity standard documented |
| 2026-06-12 | Phase 11: machine.ts middleware + machine routes added to auth-core |

