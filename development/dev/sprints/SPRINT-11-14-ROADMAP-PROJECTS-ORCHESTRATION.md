# Sprint 11-14 — Verified Roadmap

All research decisions locked + live API tests confirm feasibility.

---

## Sprint 11 — Project Manager + Multi-Window Dashboard

### Decisions
- **Grid**: react-grid-layout (free-form, drag-resize, React 18+, TS)
- **Iframes**: parallel, `sandbox="allow-scripts allow-same-origin allow-forms allow-popups"`
- **Pointer fix**: `pointer-events: none` on iframes during drag via `data-dragging` body attr
- **Iframe Cache**: keep iframes in cache (hidden, not destroyed) when switching tabs
  - 2 settings: `max_cached_iframes` (default 5), `iframe_cache_ttl_seconds` (default 300)
  - Switching back to a cached iframe = instant (no reload)
  - TTL expiry → iframe evicted from cache → next access = fresh load
  - Max reached → LRU eviction (least recently used iframe destroyed)
  - Configurable in Settings page
- **Single-Deploy**: only for JiMesh-managed coding deployments; independent projects (LeadScraper) run parallel
- **LeadScraper**: separate project, NOT managed by JiMesh
- **Deployments are children of Projects** (hierarchical):
  - Project = container with: description, layout grid (react-grid-layout positions), remote target path
  - Deployment = child of a project: actual deployable instance (DSH instance, OpenCode instance, etc.)
  - Project's `remote_path` is display-only ("expected path on remote target")
  - Each deployment must specify its own `remote_path` at deploy time (the real path)
  - Deployments can be drag-and-dropped between projects → requires redeploy if path changes
  - SSH Remote Path Browser: query remote target via SSH to list available paths (like VS Code Remote)

### Work Packages

**WP1 — Project Registry (Hierarchical)**
- `projects` table: id, name, description, category, remote_host, remote_path (display), layout_grid (JSONB)
- `deployments` table: id, project_id (FK), name, type (dsh/opencode/vscode-server/custom),
  remote_path (actual), port, config_path, status, created_at
- `POST/GET/PUT/DELETE /api/projects` — project CRUD
- `POST/GET/PUT/DELETE /api/projects/{id}/deployments` — deployment CRUD (scoped to project)
- `POST /api/projects/{id}/deployments/{dep_id}/redeploy` — redeploy with new path
- Periodic health check → status badge (green/red)
- Docker compose integration: start/stop deployments

**WP2 — Multi-Window Grid + Iframe Cache**
- Install `react-grid-layout`
- Projects tab with drag-resize iframes
- Layout persistence: PostgreSQL (SSOT) + localStorage cache
- Reset-to-default button
- `pointer-events: none` fix during drag/resize
- **Iframe Cache**:
  - Hidden iframe pool (display:none, not unmounted) keyed by project/deployment ID
  - Cache state: `{ [id]: { iframeEl, lastUsed, loaded } }`
  - Eviction: LRU when `max_cached_iframes` exceeded; TTL timer evicts after `iframe_cache_ttl_seconds`
  - Switch to cached iframe → `display:block` (instant, no reload)
  - Settings UI: sliders for max count + TTL seconds
  - Badge on cached iframes: "cached" indicator

**WP3 — Deployment Management**
- One-click deploy/stop per deployment (child of project)
- Deploy status: `building → running → stopped → error`
- Single-deploy enforcement: mutex in DB for coding deployments only
- Log tail per deployment (reuse SSE bridge pattern)
- Drag-and-drop deployments between projects:
  - Visual: deployment card draggable → drop target = project header
  - On drop: update `project_id` FK, mark as "needs redeploy" (path may differ)
  - Redeploy button highlighted after cross-project drop

**WP4 — SSH Remote Path Browser**
- SSH config: `remote_host`, `ssh_port`, `ssh_user`, `ssh_key_path` per project
- `GET /api/projects/{id}/paths?dir=<path>` — list remote directories via SSH
  - Backend opens SSH connection (golang.org/x/crypto/ssh)
  - Runs `ls -d <dir>/*/` on remote host
  - Returns JSON array of paths
- Frontend: path picker modal (tree browser, like VS Code Remote)
  - Navigate up/down remote filesystem
  - Select path → pre-fills deployment's `remote_path` field
  - Shows which paths contain existing projects (git repos, docker-compose.yml, etc.)

---

## Sprint 12 — Coding Deployment Config + Auto-Provision

### Decisions
- **Editor**: CodeMirror 6 (lighter than Monaco)
- **Virtual models**: New `GET /v1/mesh/models` endpoint (chain names as model IDs)
- **Auto-provision**: Hybrid (auto on deploy + manual drag-drop)
- **JSONC patcher**: Surgical string insertion preserves comments

### Work Packages

**WP1 — Config Editor**
- Settings button (⚙ icon) on coding deployment cards
- CodeMirror 6 with JSON/YAML syntax highlight
- `GET /api/projects/{id}/config` — read config file
- `PUT /api/projects/{id}/config` — write (with backup)
- `POST /api/projects/{id}/restart` — restart with health check
- "Apply & Hot-Reload" vs "Apply & Restart" (per project type)

**WP2 — Virtual /v1/mesh/models**
- New endpoint returns chain names: `jimesh:smart:coding-free`
- OpenAI-compatible format: `{ "object": "list", "data": [{ "id": "jimesh:smart:coding-free", ... }] }`
- Existing `/v1/models` unchanged (platform model IDs)

**WP3 — Auto-Provision**
- `POST /api/projects/{id}/provision` — body: `{ chainId, format }`
- Formats: OpenCode (provider config), DSH (vconfig.json), Cursor (settings.json)
- JSONC-aware patcher: string insertion for .jsonc, parse+serialize for .json
- Auto-provision checkbox per coding project
- Drag-drop: mesh endpoint → coding deployment config
- Toast feedback

---

## Sprint 13 — Orchestration + Entropy Routing + Model Role Schemas

### Decisions (VERIFIED)
- **Entropy approach**: Full-Response + avg entropy (R8)
- **Planner model**: `nvidia/nemotron-nano-3-30b-a3b` (3B active, free, NVIDIA)
- **Entropy formula**: H_norm = H / log2(k), k=5, range 0..1
- **Threshold**: 0.45 (empirically tunable)
- **Logprobs**: verified working through JiMesh proxy (NVIDIA cloud API)
- **Live test**: "What is 2+2?" → 20 tokens → avg entropy 0.14 (below threshold → no escalation)
- **Model Role Schemas**: classify models by their purpose/utility, project-scoped

### Work Packages

**WP0 — Model Role Schemas (Foundation for WP1-WP4)**
- Classify models by role, not just provider/model ID:
  - `routing` — fast, small, supports logprobs (planner/entropy routing)
  - `utility` — general purpose, balanced (simple chat, classification)
  - `coding` — code generation, instruction-tuned for code
  - `reasoning` — large, slow, deep reasoning (DeepSeek-R1, o1, nemotron-ultra)
  - `vision` — multimodal, image support
  - `aggregation` — synthesis of multiple expert outputs
  - `gating` — small, strict JSON output (MoE gating agent)
- `model_roles` table: model_id, role, priority (int, lower = preferred for this role)
- Default roles auto-assigned from catalog metadata (is_paid, size hints, model name patterns)
- **Chain-scoped overrides**: `chain_model_roles` table: chain_id, role, model_id
  - Each fallback chain (mesh router) can specify which model serves which role
  - e.g., `smart:coding-free` chain: `routing` → nemotron-nano, `coding` → nemotron-ultra,
    `reasoning` → deepseek-r1, `aggregation` → nemotron-nano
  - Different chains use different models for the same role
  - Falls back to global `model_roles` if no chain-specific override
- `GET /api/model-roles` — list all global role assignments
- `PUT /api/model-roles` — assign/reorder models for a role (global)
- `GET /api/chains/{id}/model-roles` — chain-specific role overrides
- `PUT /api/chains/{id}/model-roles` — set chain-specific model per role
- Frontend: chain node settings → "Model Roles" tab
  - Drag-reorder priority within each role
  - "Auto-assign" button: heuristic fill from catalog
  - "Inherit from global" toggle per role (clears chain override)
- Schema JSON example:
  ```json
  {
    "chain_id": "smart:coding-free",
    "roles": {
      "routing": { "model": "nvidia/nemotron-nano-3-30b-a3b", "priority": 1 },
      "utility": { "model": "meta/llama-3.3-70b-instruct", "priority": 1 },
      "coding": { "model": "nvidia/nemotron-3-ultra-550b-a55b", "priority": 1 },
      "reasoning": { "model": "deepseek/deepseek-r1", "priority": 1 },
      "aggregation": { "model": "nvidia/nemotron-nano-3-30b-a3b", "priority": 1 },
      "gating": { "model": "google/gemma-2b", "priority": 1 }
    }
  }
  ```
- Resolution order: chain override → global default → catalog heuristic
- Entropy routing (WP1), orchestration (WP2), and MoE (Sprint 14) all read from
  model role schemas to pick the right model for each role — no hardcoded model IDs.
  The active chain's role schema determines which model is used.

**WP1 — Entropy Routing Engine**
- Proxy option: `entropy_routing: { enabled, threshold, cache_ttl }`
- Planner model = `routing` role from model schema (project-scoped if set)
- Phase 1: routing model generates full response with `logprobs: true, top_logprobs: 5`
- Compute avg normalized Shannon entropy over all response tokens
- If entropy < threshold → serve routing model response (fast, cheap)
- If entropy >= threshold → discard, re-route to `reasoning` role model
- Cache routing decisions for 300s
- Store entropy in request_log

**WP2 — Orchestration Endpoint**
- `POST /api/orchestrate` — SSE stream
- Gating model (`gating` role) classifies task → selects role-based mesh routes
- `routing` role → planner, `coding` role → coder, `reasoning` role → reviewer
- SSE events: `plan` → `expert_start` → `expert_output` → `expert_done` → `complete`
- `POST /api/orchestrate/cancel` — stop all running experts
- `GET /api/orchestrate/history` — past runs

**WP3 — Role-Based Mesh Routes**
- Chain type: `ORCHESTRATION` with named roles (planner, coder, reviewer, simple)
- Each role maps to a mesh route (pool/chain)
- Go structs: AgentRole, RouteMapping, Task, TaskResult, WorkflowState
- Goroutines for parallel execution, native SSE for streaming

**WP4 — Python Sidecar (Optional)**
- Separate Python process, started only when enabled
- CrewAI-compatible role-based agent execution
- Pydantic structured output validation
- Speaks to JiMesh via HTTP (OpenAI-compatible API)
- Managed by JiMesh Go core (start/stop/health check)

---

## Sprint 14 — MoE Agents + DSH Plugin

### Decisions
- **Seed**: 3 experts on first boot (coder-nemotron, reviewer-r1, researcher-phi)
- **Gating agent**: small model, strict JSON output
- **Aggregation**: LLM synthesis (via planner model)
- **DSH plugin**: YAML-patch-based (NOT registerPlugin API — verified)

### Work Packages

**WP1 — Expert Registry**
- `experts` table: id, name, type (coder/reviewer/planner/researcher/general),
  route_id, system_prompt, tools, enabled, model_role (FK to model role schema)
- `expert_runs` table: run_id, task, gating_result, expert_outputs, final_output
- Each expert's `model_role` links to the role schema → actual model resolved
  per-project from `project_model_schemas`
- `POST/GET/PUT/DELETE /api/experts` — CRUD
- 3 seed experts on first boot

**WP2 — Gating Agent + Execution Engine**
- Gating model: planner model (nemotron-nano), strict JSON output
- Output: `{ selected_experts, mode: "parallel"|"sequential", confidence }`
- Parallel mode: goroutines, LLM synthesis aggregation
- Sequential mode: pipeline, max depth 4, intermediate results
- Error handling: skip + log, retry, backup expert

**WP3 — DSH Plugin**
- Create `@jimesh/dsh-plugin` npm package
- `package.json`: `"dsh": {"bundle": {"patch": "./cordis.patch.yml"}}`
- `cordis.patch.yml`: inserts rows for orchestration service, UI mode, model discovery
- Cordis plugins: server-side orchestration handler + client-side React panel
- Register JiMesh mesh routes via `ctx.llm.registerModelDiscovery()`
- Config: jimesh_url, jimesh_api_key, default_routes, max_cost_limit_per_run
- Install: `dsh plugin --profile <name> add @jimesh/dsh-plugin`

**WP4 — DSH Plugin UI**
- Orchestration mode panel: task input, run button
- Gating analysis display: selected experts, mode, confidence
- Pipeline progress: live SSE updates, partial results
- Cancel button
- Results panel: aggregated output + per-expert attribution

---

## Dependencies

```
Sprint 11 (Projects) ──────→ Sprint 12 (Config + Provision)
                                    ↓
Sprint 13 (Orchestration + Entropy) ──→ Sprint 14 (MoE + DSH Plugin)
```

Sprint 13 needs the entropy routing + orchestration core before the DSH plugin (Sprint 14) can use it.
