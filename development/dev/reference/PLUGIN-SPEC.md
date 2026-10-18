# JiMesh Plugin Manifest Specification v1 (`plugin.yaml`)

## Specification
Every JiMesh plugin must include a `plugin.yaml` manifest in its root directory specifying runtime surfaces, authentication modes, egress rules, and required capabilities.

```yaml
id: "jules"
name: "Google Jules"
version: "1.0.0"
surfaces:
  - "native"
  - "mcp"
  - "chat"
authSupported:
  - "api_key"
  - "github_app"
requiredSecretScopes:
  - "plugins:read:jules"
security:
  egress:
    - "https://jules.googleapis.com"
  capabilities:
    - "plugins:read"
    - "plugins:write"
```
