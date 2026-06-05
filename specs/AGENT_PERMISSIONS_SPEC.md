# AGENT PERMISSIONS SPECIFICATION
**Role-Based Permissions for RALD Ecosystem Agents**
Version: 1.0.0
Issued: 2026-06-05
Issuer: LILCKY STUDIO LIMITED
Status: CANONICAL

---

## 1. PRINCIPLE

> **No agent receives unrestricted access.**

Every agent has explicit, scoped permissions. Permissions must be declared in the agent registry and enforced by SEKANI before any operation.

---

## 2. PERMISSION MATRIX

| Permission | SEKANI | WIZMAC | 4 (FOUR) | MIKA | BUTCHERS | MERMAC | DRAGULA |
|-----------|--------|--------|---------|------|----------|--------|---------|
| `route_all` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `read_all_memory` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `write_permanent_memory` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `write_ephemeral_memory` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `invoke_model_router` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `read_security_logs` | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `block_actors` | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `trigger_n8n` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `execute_trigger_jobs` | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| `send_communications` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `read_all_metrics` | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `write_security_events` | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `create_origin_records` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `validate_decisions` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `write_reports` | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |

---

## 3. AGENT-SPECIFIC RULES

### SEKANI
- Routes all requests — no domain restrictions
- Cannot write permanent memory (must route to WIZMAC)
- Sole authority over model routing

### WIZMAC
- Sole authority over permanent memory writes
- Can read all data across all agents
- Cannot route requests (that is SEKANI's role)
- Cannot block actors (that is FOUR's role)

### 4 (FOUR)
- Sole authority to block actors
- Cannot trigger n8n workflows
- Must log all security events to WIZMAC

### MIKA
- Can create Trigger.dev jobs
- Cannot directly invoke n8n
- Routes all execution to BUTCHERS

### BUTCHERS
- Execution-only — no write to permanent memory
- Cannot read security logs
- Reports all results to WIZMAC via SEKANI

### MERMAC
- Read-only for most data
- Can write monitoring/system events
- Alerts via DRAGULA only

### DRAGULA
- Sole authority to trigger n8n and send communications
- Cannot write to security tables
- All communications logged via WIZMAC

---

## 4. ENFORCEMENT

Agent permissions are declared in `agent_registry.permissions` (JSONB array).

SEKANI validates permissions before routing every request:

```typescript
if (!agent.permissions.includes(requiredPermission)) {
  throw new Error(`Agent ${agent.role} lacks permission: ${requiredPermission}`);
}
```

*AGENT_PERMISSIONS_SPEC V1 — LILCKY STUDIO LIMITED — 2026*
