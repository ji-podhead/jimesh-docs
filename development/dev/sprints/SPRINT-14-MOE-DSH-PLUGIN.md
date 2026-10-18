# Sprint 14 — MoE Agents + DSH Plugin

## Status: PLANNED

## Epic: Intelligent Routing
Model-of-Experts pattern for agents with gating agent, execution engine,
and DSH plugin for orchestration mode.

## Tasks

### WP1 — Expert Registry
- [ ] `experts` table: id, name, type, route_id, system_prompt, tools, enabled, model_role
- [ ] `expert_runs` table: run_id, task, gating_result, expert_outputs, final_output
- [ ] Each expert's `model_role` links to role schema → resolved per chain
- [ ] 3 seed experts on first boot (coder, reviewer, researcher)
- [ ] `POST/GET/PUT/DELETE /api/experts` — CRUD

### WP2 — Gating Agent + Execution Engine
- [ ] Gating model: `gating` role model, strict JSON output
- [ ] Output: `{ selected_experts, mode: "parallel"|"sequential", confidence }`
- [ ] Parallel mode: goroutines, LLM synthesis aggregation
- [ ] Sequential mode: pipeline (max depth 4), intermediate results
- [ ] Error handling: skip + log, retry, backup expert

### WP3 — DSH Plugin
- [ ] Create `@jimesh/dsh-plugin` npm package
- [ ] `package.json`: `"dsh": {"bundle": {"patch": "./cordis.patch.yml"}}`
- [ ] `cordis.patch.yml`: inserts rows for orchestration service, UI mode, model discovery
- [ ] Cordis plugins: server-side orchestration handler + client-side React panel
- [ ] Register JiMesh mesh routes via `ctx.llm.registerModelDiscovery()`
- [ ] Config: jimesh_url, jimesh_api_key, default_routes, max_cost_limit_per_run
- [ ] Install: `dsh plugin --profile <name> add @jimesh/dsh-plugin`

### WP4 — DSH Plugin UI
- [ ] Orchestration mode panel: task input, run button
- [ ] Gating analysis: selected experts, mode, confidence
- [ ] Pipeline progress: live SSE, partial results
- [ ] Cancel button
- [ ] Results panel: aggregated output + per-expert attribution

## Acceptance Criteria
- [ ] Expert agents registered with model roles
- [ ] Gating agent selects experts based on task
- [ ] Parallel + sequential execution modes
- [ ] DSH plugin adds orchestration mode with SSE live progress
