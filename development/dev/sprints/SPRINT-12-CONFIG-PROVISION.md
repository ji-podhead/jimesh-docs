# Sprint 12 — Coding Deployment Config + Auto-Provision

## Status: PLANNED

## Epic: Operator Platform
Edit config files for coding deployments and auto-provision mesh endpoints
into them.

## Tasks

### WP1 — Config Editor
- [ ] Settings button (⚙ icon) on coding deployment cards
- [ ] CodeMirror 6 with JSON/YAML syntax highlight
- [ ] `GET /api/projects/{id}/config` — read config file
- [ ] `PUT /api/projects/{id}/config` — write (with backup)
- [ ] `POST /api/projects/{id}/restart` — restart with health check
- [ ] "Apply & Hot-Reload" vs "Apply & Restart" (per project type)

### WP2 — Virtual /v1/mesh/models
- [ ] New endpoint returns chain names: `jimesh:smart:coding-free`
- [ ] OpenAI-compatible format
- [ ] Existing `/v1/models` unchanged

### WP3 — Auto-Provision
- [ ] `POST /api/projects/{id}/provision` — body: `{ chainId, format }`
- [ ] Formats: OpenCode, DSH, Cursor
- [ ] JSONC-aware patcher (surgical string insertion preserves comments)
- [ ] Auto-provision checkbox per coding project
- [ ] Drag-drop: mesh endpoint → coding deployment config
- [ ] Toast feedback

## Acceptance Criteria
- [ ] Config editor modal for coding projects
- [ ] Restart/hot-reload button per project type
- [ ] One-click mesh endpoint injection
- [ ] Auto-provision on deploy
