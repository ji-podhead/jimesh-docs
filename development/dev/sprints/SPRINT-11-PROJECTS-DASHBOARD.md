# Sprint 11 — Project Manager + Multi-Window Dashboard

## Status: IN PROGRESS

## Epic: Operator Platform
Turn JiMesh into a deployment & management platform for HTTP projects with
multi-window split-screen dashboard, iframe caching, and hierarchical
deployments.

## Tasks

### WP1 — Project Registry (Hierarchical) ✅ DONE
- [x] `projects` table extended: description, layout_grid, iframe_url, health_url, category
- [x] `deployments` table: id, project_id, name, type, remote_path, port, config_path, status, chain_id, auto_provision
- [x] `POST/GET/PUT/DELETE /api/projects/{id}/deployments` — CRUD
- [x] `POST /api/projects/{id}/deployments/{depId}/redeploy` — mark for redeploy
- [x] Store: ListDeployments, CreateDeployment, UpdateDeployment, DeleteDeployment, GetDeployment, UpdateDeploymentStatus
- [x] Build verified
- Files: `store/deployments.go`, `gateway/deployments.go`, `store/store.go` (migration)

### WP2 — Multi-Window Grid + Iframe Cache
- [ ] Install react-grid-layout
- [ ] Projects tab with drag-resize iframes
- [ ] Layout persistence: PostgreSQL + localStorage
- [ ] `pointer-events: none` fix during drag/resize
- [ ] Iframe Cache (pending R9 research: client-side vs server-side HTTP/3):
  - `max_cached_iframes` (default 5), `iframe_cache_ttl_seconds` (default 300)
  - LRU eviction, TTL timer
  - Settings UI sliders
  - Cached badge on iframes
- Blocked by: R9 research (iframe cache strategy)

### WP3 — Deployment Management
- [ ] One-click deploy/stop per deployment
- [ ] Deploy status: building → running → stopped → error
- [ ] Single-deploy mutex (coding deployments only)
- [ ] Log tail per deployment (SSE bridge)
- [ ] Cross-project drag-drop deployments → redeploy on path change

### WP4 — SSH Remote Path Browser
- [ ] SSH config: remote_host, ssh_port, ssh_user, ssh_key_path per project
- [ ] `GET /api/projects/{id}/paths?dir=<path>` — list remote dirs via SSH
- [ ] Frontend tree browser (VS Code Remote style)
- [ ] Pre-fills deployment remote_path

### WP5 — Layered Deployment Schemas (pending R9)
- [ ] Base medium schema (terminal/dsh/opencode/vscode-server/custom)
- [ ] Provider/app addon schema (claude-code, aider, jimesh-mesh)
- [ ] Schema composition: base + addons + user overrides
- [ ] `deployment_schemas` + `deployment_addons` tables
- [ ] Frontend form generator from JSON schema
- [ ] Preset system per addon
- [ ] Icon set per deployment type
- Blocked by: R9 research (layered schemas)

## Acceptance Criteria
- [ ] Projects registered with health checks
- [ ] Multi-window grid with drag-resize iframes
- [ ] Iframe cache (client or server, per R9)
- [ ] One-click deploy/stop
- [ ] SSH path browser
- [ ] Layered deployment schemas with presets + icons
