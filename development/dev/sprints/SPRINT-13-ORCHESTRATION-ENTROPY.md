# Sprint 13 — Orchestration + Entropy Routing + Model Role Schemas

## Status: IN PROGRESS

## Epic: Intelligent Routing
Chain-scoped model role schemas, entropy-based routing with logprobs, and
orchestration endpoint with SSE streaming.

## Tasks

### WP0 — Model Role Schemas ✅ DONE
- [x] `model_roles` table: global model-to-role assignments
- [x] `chain_model_roles` table: per-chain overrides
- [x] 7 roles: routing, utility, coding, reasoning, vision, aggregation, gating
- [x] Resolution: chain override → global default → catalog heuristic
- [x] API: GET/PUT/DELETE /api/model-roles, /api/chains/{id}/model-roles
- [x] Store: ResolveModelRole, ListModelRoles, UpsertModelRole, etc.
- [x] Build verified
- Files: `store/model_roles.go`, `gateway/model_roles.go`, `store/store.go`

### WP1 — Entropy Routing Engine ✅ DONE
- [x] Two-phase request: routing model + logprobs → avg Shannon entropy
- [x] If entropy < threshold (0.45) → serve routing response (fast)
- [x] If entropy >= threshold → discard, escalate to reasoning model
- [x] `request_log` columns: entropy REAL, escalated INTEGER
- [x] RequestSummary: Entropy + Escalated fields
- [x] maybeEntropyRoute() called before normal failover walk
- [x] Config: entropy_routing.enabled, .threshold (settings table)
- [x] Live verified: logprobs work through JiMesh proxy on NVIDIA cloud API
- [x] Test: "What is 2+2?" → avg entropy 0.14 (below 0.45 → no escalation)
- Files: `gateway/entropy_routing.go`, `store/store.go`, `service/service.go`

### WP2 — Orchestration Endpoint
- [ ] `POST /api/orchestrate` — SSE stream
- [ ] Gating model (`gating` role) classifies task → selects role-based routes
- [ ] SSE events: plan → expert_start → expert_output → expert_done → complete
- [ ] `POST /api/orchestrate/cancel` — stop running experts
- [ ] `GET /api/orchestrate/history` — past runs
- [ ] Go structs: AgentRole, RouteMapping, Task, TaskResult, WorkflowState

### WP3 — Role-Based Mesh Routes
- [ ] Chain type: ORCHESTRATION with named roles
- [ ] Each role maps to a mesh route (pool/chain)
- [ ] Goroutines for parallel execution
- [ ] Native SSE streaming

### WP4 — Python Sidecar (Optional)
- [ ] Separate Python process, started only when enabled
- [ ] CrewAI-compatible role-based agent execution
- [ ] Pydantic structured output validation
- [ ] Speaks to JiMesh via HTTP (OpenAI-compatible API)
- [ ] Managed by JiMesh Go core

### WP5 — Model Stats Enrichment Pipeline (pending R10)
- [ ] OpenRouter enrichment (static facts: context, pricing, modality)
- [ ] Artificial Analysis enrichment (benchmarks, quality scores)
- [ ] SearXNG fallback + utility model extraction
- [ ] Fuzzy deduplication (group identical model classes)
- [ ] `model_enrichment` table (field, value, source, last_updated)
- [ ] Settings: openrouter_api_key, artificial_analysis_key, searxng_url
- Blocked by: R10 research (model stats pipeline)

## Acceptance Criteria
- [x] Model role schemas with chain-scoped overrides
- [x] Entropy routing with logprobs + threshold escalation
- [ ] Orchestration endpoint with SSE
- [ ] Role-based mesh routes
- [ ] Model stats enrichment pipeline (OpenRouter → AA → SearXNG)
