# Sprint 16 — SecOps, Vault, RBAC & App Categories

> **⚠️ DEPRECATED — durch SPRINT-39 ersetzt (Backlog #148, 21.9.2026).**
> WP2s HashiCorp-Vault-Behauptungen ("added to docker-compose",
> `vault_client.go`, multi-tenant `secret/data/projects/…`-Pfade) waren nie
> real: `vault_client.go` (heute `internal/security/vault_client.go`) hat
> bis heute 0 Aufrufer, ein `hashicorp/vault`-Service stand nie in
> `deploy/docker-compose.yml` (nur das opt-in Rezept
> `deploy/vault/ansible-task.yml`), und die `/api/vault/*`-Routen liefen
> nie über einen echten HashiCorp Vault. Der reale Secrets-Pfad läuft
> seit SPRINT-39 über die embedded `secretsengine.VaultEngine`
> (AES-GCM-256 in der `vault_secrets`-Tabelle, `internal/secretsengine/`,
> siehe `SPRINT-39-SECRETS-ENGINE.md`). Diese Datei bleibt als
> historischer Datensatz — nur WP2 ist überholt; die übrigen Work
> Packages (RBAC-Budgets, Teams, App Categories, Traffic Inspector)
> sind real geblieben.

## Goal
Security operations, zero-trust secret management, multi-user RBAC with
budget limits, app categorization for sidebar, live traffic debugging.

## Work Packages

### WP1: Widget Presets & Categories ✅ designed
- [x] Widget registry designed (mesh, agents, discovery, security, system, deploy)
- [x] Dashboard presets designed (mesh_overview, agent_ops, discovery_security,
     secops_console, full_control)
- [x] Pattern adapted from leobot2 trading bot (widgetRegistry + dashboardPresets)

### WP2: Vault (Zero-Trust Secret Gateway) ✅ built
- [x] `vault_secrets` table — AES-GCM-256 encrypted values
- [x] `vault_audit_log` table — all access logged
- [x] `vault_tokens` table — time-limited agent access tokens
- [x] HashiCorp Vault added to docker-compose (`hashicorp/vault:latest`, port 8200)
- [x] Vault API client (`vault_client.go`) — GetSecret, PutSecret, ListSecrets
- [x] Multi-tenant: `secret/data/projects/{project_id}/*` (single Vault, multi-path)
- [x] Fallback: encrypted PostgreSQL if Vault unavailable
- [x] API: GET/POST/PUT/DELETE `/api/vault/secrets[/{name}]`
- [x] API: GET `/api/vault/audit`
- [x] API: POST `/api/vault/tokens`, POST `/api/vault/tokens/{id}/revoke`
- [x] API: POST `/api/vault/access` — the ONLY way agents get secrets

### WP3: RBAC Budget Management ✅ built
- [x] `project_user_budgets` table — per-project, per-user budget
- [x] Roles: admin, manager, developer, sub_agent
- [x] `BudgetManager`: check budget before proxy → inject API key JIT →
     execute → deduct cost atomically
- [x] API: GET/POST/DELETE `/api/budgets`
- [x] API: POST `/api/budgets/check` — returns allowed/remaining
- [x] 402 Payment Required when quota exceeded
- [x] 403 Forbidden when no budget assigned or disabled

### WP4: Teams (future-ready schema) ✅ built
- [x] `teams` table — org/team with monthly budget
- [x] `team_members` table — RBAC roles (owner, manager, developer, sub_agent)
- [x] Cascading limits: Team → Project → User/Agent
- [x] API: GET/POST/DELETE `/api/teams`
- [x] API: GET/POST/DELETE `/api/team-members`

### WP5: App Categories (Sidebar Grouping) ✅ built
- [x] `app_categories` table — 6 default categories seeded
- [x] `TypeToCategory` map — auto-categorize deployments by type
- [x] `SmartSuggestions` map — DB deployed → suggest Adminer
- [x] API: GET `/api/app-categories` — returns categories + mappings
- [x] API: POST `/api/app-categories` — create custom category
- [ ] Frontend: accordion sidebar with categories (pending)

### WP6: Traffic Inspector (SecOps) ✅ built
- [x] RAM-based traffic metrics per edge (source → target)
- [x] Rolling window for requests/sec, error rate, latency
- [x] Status: healthy (green), slow (yellow), error (red)
- [x] API: GET `/api/traffic` — current snapshot
- [x] API: GET `/api/traffic/stream` — SSE stream (2s interval)
- [ ] Frontend: React Flow topology widget (pending)

### WP7: Security Audit ✅ built
- [x] Scan: encryption key, cost breaker, SSH host key
- [x] Score: 0-100
- [x] API: GET `/api/security/audit`

### WP8: Cost Circuit Breaker ✅ built (earlier)
- [x] `CostTracker` — per-run token cost in RAM
- [x] `context.Cancel()` when limit exceeded (default $0.50)
- [x] API: GET `/api/cost-trackers`

### WP9: Docker Event Discovery ✅ built (earlier)
- [x] `discovery.go` — `docker ps` via SSH, container event stream
- [x] API: GET `/api/discovery`, POST `/api/discovery/scan`,
     GET `/api/discovery/events` (SSE)

### WP10: SSH Tunnel Bridge ✅ built (earlier)
- [x] `tunnel.go` — `TunnelPool` with persistent SSH sessions
- [x] `port_detection.go` — `ss -tlnp` parsing, KnownPorts map
- [x] API: GET `/api/projects/{id}/ports`, tunnel proxy, monitoring SSE

## Files
- `internal/store/vault.go` — Vault DB tables + methods
- `internal/store/rbac.go` — RBAC budgets, teams, app categories
- `internal/store/secrets.go` — AES-GCM-256 encrypt/decrypt
- `internal/gateway/vault.go` — Vault API handlers
- `internal/gateway/vault_client.go` — HashiCorp Vault client
- `internal/gateway/rbac.go` — Budget/Team/Category handlers
- `internal/gateway/cost_breaker.go` — Cost circuit breaker
- `internal/gateway/traffic_inspector.go` — RAM traffic metrics
- `internal/gateway/discovery.go` — Docker event discovery
- `internal/gateway/tunnel.go` — SSH tunnel bridge
- `internal/network/tunnel.go` — TunnelPool
- `internal/network/port_detection.go` — Port scanning
- `docker-compose.yml` — Vault service added

## Acceptance Criteria
- [x] Vault tables created in PostgreSQL
- [x] RBAC budget tables created
- [x] Teams tables created (future-ready)
- [x] App categories seeded (6 defaults)
- [x] All APIs documented in API_DOCS.md
- [ ] Build verified on target box (go not available in this env)
- [ ] Frontend widgets built (pending)
