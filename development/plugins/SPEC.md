# JiMesh Plugin Manifest & Lifecycle Specification v1 (`plugin.yaml`)

## Overview
This document specifies the standard plugin manifest format (`plugin.yaml`) and runtime lifecycle model for all integrations within the JiMesh multi-provider gateway ecosystem.

All plugins integrated into JiMesh must declare their capabilities, surfaces, authentication requirements, and security policies via a valid `plugin.yaml` manifest in their root directory or registry distribution package.

---

## 1. Plugin Manifest Specification (`plugin.yaml`)

An example full `plugin.yaml` manifest:

```yaml
id: "jules"
name: "Google Jules"
version: "1.0.0"
description: "Google Jules AI coding agent integration for JiMesh"
icon: "bot"
surfaces:
  - "native"
  - "mcp"
  - "chat"
authSupported:
  - "api_key"
  - "service_account"
requiredSecretScopes:
  - "secrets:read:jules_api_key"
security:
  egress:
    - "https://jules.googleapis.com"
  capabilities:
    - "plugins:read"
    - "plugins:write"
healthCheck:
  path: "/api/plugins/jules/health"
  interval: "30s"
  timeout: "5s"
i18nKeys:
  - "plugins.jules.title"
  - "plugins.jules.description"
```

### Manifest Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | **Yes** | Unique plugin identifier slug (lowercase alphanumeric, hyphens, underscores). |
| `name` | `string` | **Yes** | Human-readable display name. |
| `version` | `string` | **Yes** | Semantic version string (e.g. `1.0.0`). |
| `description` | `string` | No | Short description of the plugin functionality. |
| `icon` | `string` | No | Lucide icon identifier (e.g. `bot`, `mail`, `shield`) or image URL. |
| `surfaces` | `array[string]` | **Yes** | Render surfaces provided by the plugin. See Surface Types below. |
| `authSupported` | `array[string]` | **Yes** | Authentication modes supported (`api_key`, `service_account`, `both`, `github_app`, `oauth_code_exchange`). |
| `requiredSecretScopes` | `array[string]` | No | Secret scope requirements requested from the JiMesh Secrets Engine. |
| `security` | `object` | **Yes** | Security constraints including allowed egress destinations and OPA capabilities. |
| `security.egress` | `array[string]` | **Yes** | Allowed egress hostnames, URLs, or IP ranges for network isolation. |
| `security.capabilities` | `array[string]` | **Yes** | Capability RBAC grants requested by the plugin (e.g. `plugins:read`). |
| `healthCheck` | `object` | No | Health check probe configuration. |
| `healthCheck.path` | `string` | No | Relative API health endpoint path. |
| `healthCheck.endpoint` | `string` | No | Absolute health check HTTP URL. |
| `healthCheck.interval` | `string` | No | Health check probe interval duration (e.g. `30s`). |
| `healthCheck.timeout` | `string` | No | Health check probe timeout duration (e.g. `5s`). |
| `i18nKeys` | `array[string]` | No | List of i18n translation key namespaces registered by the plugin. |

---

## 2. Surface Types (`surfaces[]`)

JiMesh supports 6 standardized render and integration surfaces:

| Surface | Category | Description |
|---|---|---|
| `native` | Frontend UI | Custom React component lazy-loaded directly in the JiMesh UI. **Note:** `native` covers both generic widget reuse (e.g. embedded session panels) AND fully custom standalone dashboards (such as the DSH DeepSeek Harness pattern). |
| `iframe` | Frontend UI | Sandboxed `<iframe>` rendering an externally hosted web application UI with strict origin/egress constraints. |
| `widget` | Frontend UI | Compact card widget docked into Workspace or Project dashboards (sidebar, dashboard slot, or detail view). |
| `chat` | Frontend UI | Integrated into the global JiMesh Plugin Chat Panel, providing interactive session context and assistant drawers. |
| `mcp` | Backend Protocol | Exposes Model Context Protocol (MCP) tools, prompts, and resources to the gateway and subagent orchestrator. |
| `api` | Backend Protocol | Registers HTTP/REST wrapper routes under `/api/plugins/{id}/*` on the JiMesh Gateway. |

---

## 3. Plugin Lifecycle Specification

The JiMesh plugin execution lifecycle consists of 7 explicit states:

```
[ Install ] ──► [ Enable ] ──► [ Configure ] ──► [ Run ] ──► [ Disable ] ──► [ Uninstall ]
                                     ▲               │
                                     └──── [ Update ]┘
```

### Lifecycle States & Requirements

1. **`Install`**:
   - The plugin manifest (`plugin.yaml`) is ingested and validated against `plugin.schema.json`.
   - The manifest is registered in the catalog index (`plugins` table).
   - Declared security requirements (egress rules, secret scopes, OPA capabilities) are staged for workspace approval.

2. **`Enable`**:
   - The plugin is marked as enabled for a specific Workspace or Project scope.
   - Surface components and Gateway API routes are registered in the active routing table.

3. **`Configure` (Auth Binding)**:
   - User or administrator configures authentication credentials via the Auth-Connector Framework (TASK-108).
   - Supported options: choice of existing Secret, creation of a new API key/OAuth token, or Service Account assignment.
   - Credential references are securely stored in the consolidated `secrets` table (`parent_type='plugin'`, `parent_id=plugin_id`).

4. **`Run`**:
   - Plugin enters active operational state.
   - Backend MCP tools, REST API endpoints, SSE event streams, and UI surfaces serve incoming user and agent requests.
   - Periodic health check probes run if configured (`healthCheck`).

5. **`Update`**:
   - Updated plugin manifest is parsed, validated, and updated in the catalog.
   - Active auth bindings and workspace scope configurations are preserved during update.
   - Any new required secret scopes or egress endpoints trigger user re-approval.

6. **`Disable`**:
   - Plugin execution is suspended; surface routes, background workers, and event streams are detached.
   - Configured auth credentials and installation metadata remain stored for re-enabling.

7. **`Uninstall`**:
   - Plugin is unregistered from the gateway, surface registry, and catalog index.
   - **Service-Account & Binding Cleanup (Mandatory)**: All service-account bindings, credential mapping references, and plugin attachment records linked to the plugin installation MUST be permanently deleted.
   - **User Secret Protection Policy**: Underlying secret values stored in the JiMesh Secrets Engine / Vault are **NEVER** deleted automatically during plugin uninstallation without explicit user confirmation.
