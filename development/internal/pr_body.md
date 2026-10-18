## SquadMesh Implementation — Go Message Bus + Agent Governance Layer

This PR implements the complete SquadMesh Go microservice that replaces the Python `chat-gateway` + `message_bus` + `scheduling-engine` with a single, efficient Go service.

### Implementation Files (24 files, 9144 lines)

| Package | Files | Description |
|---------|-------|-------------|
| **bus/** | `backend.go`, `client.go` | Redis Streams backend (XADD/XRANGE), AgentBusClient, Inbox, Orchestrator — busy/idle, catch-up (raw/summary), pagination, watches |
| **gateway/** | `gateway.go` | Tinode Plugin gRPC (human→bus) + Node gRPC (bus→human), cursor persistence, retry logic |
| **ws/** | `hub.go` | WebSocket/SSE hub with presence (🟢🟡🔴⚫), threads, history pagination, catch-up banner |
| **agent/** | `standalone.go` | Standalone agent mode (no tinode), polling loop, GetStatus() |
| **orchestrator/** | `orchestrator.go` | Agent registry, subteams, direct/broadcast, escalation, polling, governance integration |
| **scheduler/** | `scheduler.go` | Cron/lambda rules, daily/weekly report scheduling, governance request triggers |
| **integrations/** | `registry.go` | Linear, Jira, GitHub, Obsidian, S3, Slack, Email connectors + Vault credential management |
| **storage/** | `s3.go` | MinIO/S3 client with workspace-scoped prefixes (`workspaces/{ws-id}/...`) |
| **governance/** | `governance.go`, `tags.go` | **Complete governance layer** (see below) |
| **internal/** | `config.go`, `tracer.go` | Env config, OTLP tracing with SquadMesh attributes |
| **cmd/** | `main.go` | Full wiring: gateway, agent, orchestrator, scheduler, governance, integrations, HTTP API |
| **deploy/** | `topic_map.json`, `tinode/config.template` | Tinode topic ↔ bus channel mappings |
| **web/** | `index.html` | Discord-like frontend (channels, threads, markdown, catch-up, presence) |

### Governance Layer (Major Addition in `governance/governance.go`)

**1. Escalation Categories (separate from priority):**
- **Agent Operations** (Tier 2-3): `agent_stuck`, `agent_error`, `agent_timeout`, `agent_resource`, `agent_capability`, `tool_failure`, `tool_permission`, `tool_rate_limit`, `tool_config`, `infra_unavailable`, `infra_degraded`, `infra_capacity`, `mandate_violation`, `policy_violation`, `workflow_blocked`
- **Security/Abuse** (Tier 4 - Critical): `prompt_injection`, `abuse`, `data_exfiltration`, `unauthorized_access`, `malicious_code`

**2. Tier System (1-4):**
- Tier 1: Log only (24h SLA)
- Tier 2: Team notify, supervisor aware (4h SLA)
- Tier 3: Supervisor intervenes, agent restricted (1h SLA, **agent containment**)
- Tier 4: Immediate containment, operator paged (15min SLA, **agent containment — NOT network/container freeze**)

**3. User-Configurable Policy:**
- `EscalationPolicy` with custom rules, tier overrides, guardrail hooks
- `EscalationRule` with conditions, priority, custom actions

**4. Guardrail Engine:**
- Auto-detects: prompt injection, abuse, data exfiltration
- Auto-escalates with trace anchoring
- Tool call validation (shell/exec require approval)

**5. Structured Requests:**
- JSON Schema validation, routing, response schema
- Templates: tool_access (Linear/Jira), code_change, infrastructure, credential, agent_spawn, mandate_proposal, custom
- 9 default templates in `RequestTemplateRegistry`

**6. Semantic Tags:**
- Agent tags (`need-linear-write`) → internal (`tool:linear:write`)
- Auto-learning registry for unknown tags

### API Endpoints Implemented

```
GET  /health
GET  /ws, /events                    # WebSocket/SSE
POST /api/v1/agent/...               # Agent messaging, inbox, status
POST /api/v1/orchestrator/...        # Invite, subteam, direct, catchup, agents
POST /api/v1/governance/...          # Requests, mandates, voting, tags, critical errors
POST /api/v1/scheduler/...           # Rules, reports
POST /api/v1/integrations/...        # Config, agent access
GET  /api/v1/gateway/...             # Gateway status, forward
POST /api/v1/agents/...              # Agent registry (create, list, get, delete)
```

### Integration with jimesh

- `meshsquad` plugin installs with `crewApiUrl` → SquadMesh HTTP
- jimesh `MeshSquadChatSpacePage` calls SquadMesh directly (CORS)
- MCP tools (`tools_linear.go`, etc.) fixed to call SquadMesh `/api/v1/integrations/*`
- Agent governance requests for code changes → route to jimesh coding team via `RequestTypeCodeChange`
- Critical errors → always Level 3, trace-anchored, pager

### Audit Traceability

All findings from VERIFY-2026-09-28, OPEN-ITEMS, PROMPTS-VS-DELIVERY, SESSION-PROMPTS-TAIL mapped to sprint tasks in `AUDIT_FINDINGS.md` — nothing lost.

---

**Ready for review.** Next steps after merge: implement S1 (core bus + gateway + frontend) in the `squadmesh/` package.