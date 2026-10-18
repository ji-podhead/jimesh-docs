# JiMesh Plugin Architecture & Integration Roadmap

This document outlines the architecture, shipped features, and roadmap for JiMesh plugins, IDE extensions, and AI coding-agent integrations.

---

## 1. Executive Summary & Capabilities Overview

JiMesh acts as a centralized Control Plane and LLM Gateway that bridges autonomous coding agents, developer tools, and host infrastructure. The plugin ecosystem allows external tools (e.g. Google Jules, Linear, GitHub, DeepSeek Harness) and coding CLI agents (e.g. Claude Code, OpenCode, OpenHands, Aider) to securely interface with JiMesh via REST APIs, Model Context Protocol (MCP), and SSE event streams.

---

## 2. Shipped Capabilities (Current State)

### A. Gateway Plugin Catalog & Installation Schema
- **Domain Schema:** Defined in `src/backend/internal/domain/schema/plugins.go` (`Plugin`, `PluginInstallation`).
- **REST Endpoints:**
  - `GET /api/plugins` — Returns the registered plugin catalog.
  - `GET /api/plugin-installations` — Retrieves scope-assigned plugin activations.
  - `POST /api/plugin-installations` — Activates and configures a plugin for a Workspace or Project.
- **Native Integrations Shipped:**
  1. **Google Jules (`jules`):** Autonomous coding agent integration for repository PR reviews, code changes, and task execution.
  2. **Linear (`linear`):** Issue tracking and session linking via GraphQL wrapper.
  3. **GitHub App (`github_app`):** Webhook receiver for PR comments and automated code review actions.

### B. DeepSeek Harness (DSH) Cordis Bridge
- **MCP Tool Integration:** Defined in `src/backend/internal/mcpserver/tools_dsh.go`.
  - `list_dsh_profiles` — Lists available Harness execution profiles (web, headless, sdk, acp).
  - `trigger_dsh_turn` — Triggers agent turn execution and routes tool calls to Jules or Linear.
- **REST Proxy Endpoints:** `/api/plugins/dsh/profiles` and `/api/plugins/dsh/turns`.

### C. Model Context Protocol (MCP) Server
- **Location:** `src/backend/cmd/jimesh-mcp/` and `src/backend/internal/mcpserver/`.
- Exposes JiMesh infrastructure tools, Vault secret access, deployment control, and agent sessions over JSON-RPC stdio/WebSocket protocols.

### D. Frontend Surface Rendering & SSE Event Streaming
- **UI Components:** `PluginActivationCard.tsx`, `JulesSessionsWidget.tsx`, `AgentsPage.tsx`.
- **Event Streaming:** `src/frontend/src/lib/jules-events.ts` streams live agent progress and turn outputs via Server-Sent Events (SSE).

---

## 3. Planned Capabilities & Technical Roadmap

### A. VS Code Extension & Web IDE Integration *(Planned)*
- **Status:** Architecture Spec & Design Phase.
- **Goal:** Provide a native VS Code extension and Web IDE plugin that connects your editor directly to the JiMesh Control Plane.
- **Technical Approach:**
  - **Local Control Plane Connection:** Connects via authenticated API tokens or local SSH tunnels.
  - **Direct Remote Deployment:** Right-click a project or file to trigger a sandboxed gVisor deployment directly on remote SSH Targets.
  - **Secret Management:** Access Vault secrets directly in VS Code without maintaining `.env` files locally.
  - **Live Log & Agent Stream:** Embedded terminal panel to monitor live thread execution and gVisor container logs.

### B. Multi-Agent Coding Framework Integrations *(Planned)*
- **Status:** Architectural Design & Tool Splicing.
- **Target Agents:** Claude Code, OpenCode, OpenHands, Goose, Aider, Roo Code, Cursor.
- **Technical Approach:**
  - **MCP Splicing (`mcp_splice.go`):** Automatically inject JiMesh infrastructure tools into local agent runtime configurations (`.mcp/config.json` or stdio adapters).
  - **Zero-Trust Secret Delivery:** When agents require cloud API keys or database connection strings, JiMesh injects them just-in-time via the Vault proxy boundary without exposing plaintext keys to the agent context.
  - **Workspace Tool Scoping:** Restrict agent execution capabilities based on active project guardrails and RBAC budgets.

---

## 4. Architectural Comparison

| Integration | Protocol | Auth Mechanism | Primary Use Case | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Google Jules** | REST + SSE | API Key / OAuth | Task execution & PR reviews | **Shipped** |
| **Linear** | GraphQL | API Key | Issue sync & ticket linking | **Shipped** |
| **GitHub App** | Webhooks | GitHub App Installation | Automated PR comments & CI checks | **Shipped** |
| **DeepSeek Harness** | REST + MCP | Bearer Token | Multi-profile agent turns & headless browser turns | **Shipped** |
| **JiMesh MCP Server** | stdio / WebSocket | Gateway API Token | Agent tool execution (Claude Code, Aider, OpenCode) | **Shipped** |
| **VS Code Extension** | Language Server / Webview | OAuth / Token | IDE remote deployment & secret injection | **Planned** |
| **OpenHands / Goose** | MCP Splicer | Vault Token | Automated coding & sandbox execution | **Planned** |

---

## 5. Security & Isolation Guarantee

All plugin executions and agent tools respect JiMesh's **Zero-Trust Security Model**:
1. **No Plaintext Secrets:** Plugins retrieve short-lived tokens or proxy requests through the JiMesh Gateway.
2. **gVisor Sandboxing:** Code executed by AI agents runs inside `runsc` isolated container environments.
3. **Audit Logging:** Every tool call, agent turn, and secret access is logged in `vault_audit_log` and accessible via the dashboard.
