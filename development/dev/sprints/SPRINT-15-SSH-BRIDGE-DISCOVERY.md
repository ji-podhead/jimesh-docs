# Sprint 15 — SSH Bridge, Port Detection & E2E Deployment

## Goal
Go backend as SSH tunnel proxy (not browser). Port detection, E2E deployment,
monitoring. All via SSH, no polling.

## Work Packages

### WP1: Port Detection ✅ built & compiled
- `network/port_detection.go` — ParsePorts (ss -tlnp), KnownPorts (40+),
  CheckPortFree, SuggestPort, FormatPortList
- `GET /api/projects/{id}/ports` — SSH scan, returns [{port, process, pid, status}]

### WP2: SSH Tunnel Bridge ✅ built & compiled
- `network/tunnel.go` — TunnelPool (persistent SSH per project),
  GetReverseProxy (custom DialContext via sshClient.Dial), Exec, CloseAll
- `GET /api/projects/{id}/tunnel/{port}` — HTTP reverse proxy through SSH
- `PUT/GET /api/projects/{id}/ssh-config` — store/get SSH credentials

### WP3: Monitoring Bridge ✅ built & compiled
- `GET /api/projects/{id}/monitoring` — SSE stream of:
  - Memory (free -m), Disk (df -h), CPU (top), Docker stats (docker stats)

### WP4: Docker Event Discovery ✅ built & compiled
- `gateway/discovery.go` — DiscoveredContainer, DiscoveryRegistry
- `GET /api/discovery` — list discovered containers
- `POST /api/discovery/scan` — one-time docker ps via SSH
- `GET /api/discovery/events` — SSE stream of container events

### WP5: Tech Ontology ✅ built & compiled
- `metadata/ontology.go` — 40+ technologies, 0ms latency
- Port → Icon (Iconify) → Category → Sidecar Suggestions
- `GET /api/ontology?port=5432` → PostgreSQL definition + Adminer suggestion
- `GET /api/ontology?category=Databases` → list by category
- `GET /api/ontology?image=postgres:alpine` → match by image name

### WP6: Cost Circuit Breaker ✅ built & compiled
- `gateway/cost_breaker.go` — CostTracker, CostTrackerRegistry
- Per-run token cost tracking in RAM
- context.Cancel() when limit exceeded (default $0.50)
- `GET /api/cost-trackers` — live stats

### WP7: Traffic Inspector ✅ built & compiled
- `gateway/traffic_inspector.go` — RAM-based traffic metrics per edge
- Rolling window rps, error rate, latency, status (healthy/slow/error)
- `GET /api/traffic` — current snapshot
- `GET /api/traffic/stream` — SSE stream (2s updates)

### WP8: Vault ✅ built & compiled
- `store/vault.go` — vault_secrets, vault_audit_log, vault_tokens tables
- `store/secrets.go` — AES-GCM-256 encrypt/decrypt
- `gateway/vault.go` — CRUD + audit + tokens + access
- `gateway/vault_client.go` — HashiCorp Vault client (GetSecret, PutSecret)
- `docker-compose.yml` — hashicorp/vault:latest (port 8200, dev mode)
- Multi-tenant: secret/data/projects/{project_id}/*

### WP9: RBAC Budgets & Teams ✅ built & compiled
- `store/rbac.go` — project_user_budgets, teams, team_members, app_categories
- `gateway/rbac.go` — Budget CRUD, budget check, teams CRUD, team members
- Roles: admin, manager, developer, sub_agent
- Cascading: Team → Project → User/Agent
- 6 app categories seeded (Infrastructure, Databases, Coding Tools, etc.)
- TypeToCategory + SmartSuggestions maps

### WP10: Security Audit ✅ built & compiled
- `GET /api/security/audit` — checks encryption, cost breaker, SSH host key
- Returns score 0-100 + issues with severity + fix

## Files
- `internal/network/tunnel.go` — TunnelPool, SSHConfig
- `internal/network/port_detection.go` — PortInfo, KnownPorts, ParsePorts
- `internal/metadata/ontology.go` — StaticTechOntology (40+), MatchService
- `internal/gateway/tunnel.go` — SSH tunnel handlers
- `internal/gateway/discovery.go` — Docker discovery handlers
- `internal/gateway/ontology.go` — Ontology API handler
- `internal/gateway/cost_breaker.go` — Cost circuit breaker
- `internal/gateway/traffic_inspector.go` — Traffic metrics
- `internal/gateway/vault.go` — Vault handlers + security audit
- `internal/gateway/vault_client.go` — HashiCorp Vault client
- `internal/gateway/rbac.go` — Budget/Team/Category handlers
- `internal/store/vault.go` — Vault DB methods
- `internal/store/rbac.go` — RBAC/Team/Category DB methods
- `internal/store/secrets.go` — AES-GCM-256

## Build Status: ✅ VERIFIED (Go 1.25.0, CGO_ENABLED=0, clean compile)
