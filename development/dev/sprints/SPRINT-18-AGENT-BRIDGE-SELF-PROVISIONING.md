# Sprint 18 — Agent Bridge: Self-Provisioning & Dynamic Tool Hot-Reload

## Goal
The Endgegner. An autonomous self-provisioning agent loop: agent requests
infrastructure → bridge checks RBAC budget → spawns Docker container →
injects credentials from Vault JIT → hot-reloads MCP tool without restart.
Dual-API: REST (OpenAPI-compatible) + MCP (JSON-RPC).

## Papers
- LATM (arXiv:2305.17126) — LLMs As Tool Makers
- CRAFT — Customizable Robotic Agent Framework
- arXiv:2601.13671 — MCP orchestration

## Work Packages

### WP1: Agent Bridge Core ✅ built & compiled
- `gateway/agent_bridge.go` — AgentBridge, ExecuteSelfProvisioning
- 4-step pipeline: RBAC check → Docker spawn → Vault credential → MCP hot-reload
- Thread-safe provisioning progress tracking (runID → steps)
- Cost deduction: $0.05 per container spawn from user budget

### WP2: Dynamic Tool Registry ✅ built & compiled
- `gateway/dynamic_registry.go` — DynamicToolRegistry
- Thread-safe hot-reload: RegisterTool/UnregisterTool/ListTools/ListByProject
- Tools registered at runtime without gateway restart
- When agent provisions Postgres → `postgres_query_abc12345` hot-registered

### WP3: REST API (OpenAPI-compatible) ✅ built & compiled
- `POST /api/bridge/provision` — self-provision infrastructure
  - Body: `{ projectId, userId, serviceType }`
  - Returns: `{ containerId, toolName, status, costUsd, port }`
  - 402 if budget exceeded, 403 if no access
- `GET /api/bridge/stream?runId=X` — SSE progress stream
  - Events: provision_start → provision_update → provision_complete
- `GET /api/bridge/openapi.json` — OpenAPI 3.0 spec for LLM function calling
  - LLMs (GPT, Claude) parse this to auto-generate function calls
- `GET /api/bridge/tools` — list all dynamically registered tools

### WP4: MCP Integration (planned)
- [ ] mcp-go server (expose provision as MCP tool)
- [ ] MCP client (connect to Docker MCP Gateway)
- [ ] JSON-RPC over stdio/WebSocket for CLI agents (Claude Code, Aider)
- [ ] Same Go core logic, dual-protocol exposure

## Architecture
```
Agent (Claude Code / DSH / Utility Model)
  ↓ "I need PostgreSQL for this task"
  ↓ POST /api/bridge/provision { projectId, userId, serviceType: "postgres" }

JiMesh Bridge (Go backend)
  1. RBAC check → budget ok? (402/403 if not)
  2. Ontology lookup → postgres → port 5432, icon: logos:postgresql
  3. Docker spawn → container "jimesh-postgres-..."
  4. Vault → store generated password (agent never sees it)
  5. Hot-reload → register "postgres_query_abc12345" as MCP tool
  6. Deduct $0.05 from user budget

  ↓ Returns: { containerId, toolName, "postgres_query_abc12345", port: 5432 }

Agent now uses: mcp.call("postgres_query_abc12345", { sql: "SELECT 1" })
  → Bridge injects Vault credential JIT → executes → returns rows
```

## Files
- `internal/gateway/agent_bridge.go` — AgentBridge, handlers, OpenAPI spec
- `internal/gateway/dynamic_registry.go` — DynamicToolRegistry (hot-reload)

## Build Status: ✅ VERIFIED (Go 1.25.0, exit 0)
