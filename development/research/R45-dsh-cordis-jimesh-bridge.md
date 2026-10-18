# R45 — DeepSeek Harness (DSH) Cordis Plugin & JiMesh MCP Bridge Specification

**Datum:** 16. September 2026
**Status:** SPECIFICATION
**Ziel:** Zwei-Wege-Integration zwischen DeepSeek Harness (DSH) und JiMesh Gateway:
1. **DSH als Client an JiMesh MCP Server:** DSH nutzt den JiMesh MCP Server zur Fernsteuerung von Workspaces, Datenbanken, Jules-Sessions und Linear-Issues.
2. **DSH Cordis Plugin (`dsh-jimesh-bridge`):** Ein Cordis Plugin für DSH, das DSH-Events (`turn/start`, `agent/turn-stopping`, `tool/call`) an den JiMesh SSE Stream spiegelt.

---

## 1. DSH Cordis Architecture Overview

DSH ist auf dem **Cordis Framework** aufgebaut. Plugins registrieren Services, Events und Reversible Effects im gemeinsamen Cordis-Kontext `ctx`.

```
+-------------------------------------------------------------------------+
|                      DEEPSEEK HARNESS (DSH) RUNTIME                     |
|                                                                         |
|  Cordis Context (ctx)                                                   |
|  ├── ctx.sessions  (core/session)                                       |
|  ├── ctx.tools     (core/tools)                                         |
|  ├── ctx.agents    (core/agent)                                         |
|  └── dsh-jimesh-bridge (CORDIS PLUGIN)                                  |
|         │                                                               |
|         ├── Intercepts turn/start, agent/turn-stopping                  |
|         └── Dispatches JSON-RPC via stdio/HTTP MCP to JiMesh Gateway    |
+---------|---------------------------------------------------------------+
          │
          v
+-------------------------------------------------------------------------+
|                       JIMESH GATEWAY & MCP SERVER                       |
|                                                                         |
|  mcp.MCPServer (mark3labs/mcp-go)                                       |
|  ├── list_sessions / create_session                                     |
|  ├── create_jules_session / list_jules_sources                          |
|  ├── list_linear_issues / create_linear_issue                           |
|  └── list_github_prs / create_github_comment                            |
+-------------------------------------------------------------------------+
```

---

## 2. MCP Tool Integration Summary

In `src/backend/internal/mcpserver/server.go`, the following tools allow DSH and external AI agents to trigger Jules and manage plugin workflows:

- `list_jules_sources`: List connected repository sources in Google Jules v1alpha API.
- `create_jules_session`: Start an autonomous Jules coding session for a given prompt and repository source.
- `list_linear_issues`: Fetch active Linear issues for workspace task tracking.
- `create_linear_issue`: Create new Linear issues directly from agent execution turns.
- `list_github_prs`: List open pull requests in the connected repository.
- `create_github_comment`: Post review comments on GitHub PRs.
- `list_dsh_profiles`: List available DSH Cordis profiles.
- `trigger_dsh_turn`: Execute a DSH agent turn step and delegate tool execution.
