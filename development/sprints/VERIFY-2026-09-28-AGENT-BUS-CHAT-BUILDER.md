# VERIFY 2026-09-28 — Agent Builder · Message Bus · Chat · Phantom MCP Routes · React Flow

**Verifier:** read-only code verification, no tests executed, no repo file modified.
**Scope:** jimesh Go backend (`src/backend`), jimesh React frontend (`src/frontend/src`), cross-checked against `meshsquad-public` (sibling repo, the Python multi-agent stack the prior claims actually describe) and the prior-claim docs in `/home/ji/projects/ihc24/` (audit.md B14/P8/A6, MASTER-WANT-VS-HAVE, OPEN-ITEMS, SPRINT-DELIVERY-REVIEW, HANDOFF).

---

## Top summary — what exists end-to-end vs backend-only vs nothing

| Claimed feature | End-to-end (API + UI) | Backend-only (real, tested, no UI) | Nothing at all |
|---|---|---|---|
| Message bus (9/9 + 11/11 tests) | — | **meshsquad-public** (Python): `message_bus.py` + `test_message_bus.py` (exactly 9 tests) + `test_agents_bus_integration.py` (exactly 11 tests) — **not jimesh** | **jimesh**: no bus code, no routes, no tests, no frontend consumer |
| Chat (chat-gateway + tinode, 21/21) | — | **meshsquad-public/chat-gateway** (gateway.py, tinode_client.py, topic_map.py, redis_bus.py, `test_chat_gateway.py` = exactly 21 tests) + `tinode-compose.yml` — **not jimesh** | **jimesh**: no tinode/chat-gateway route, handler, or UI embedding |
| Agent builder (rm28) | meshsquad-public frontend on disk but **untracked in git** (React-Flow team-creator, 27 tests) | meshsquad backend `agents.py` (RoleDefinition/TeamConfig); jimesh has only the unrelated DSH Agent-Types/Sessions registry (`/api/agent-types`, `/api/sessions`) | **jimesh**: no agent-builder/creator endpoint family and **zero** frontend route/component — frontend missing confirmed for jimesh |
| Phantom MCP routes | — | — | `/api/plugins/{linear,github,dsh}/*`: **not registered** in gateway.go, **not called by frontend** — callers are the backend MCP server (`internal/mcpserver`); every call fails (404 in deployed mode) |
| React Flow team-creator canvas | jimesh has **no** team/agent canvas; its two real React-Flow usages are the proxy-chain editor (`chain-mesh-graph.tsx`) and the read-only mesh topology (`mesh-topology.tsx`) | — | team-creator canvas exists only in meshsquad-public/frontend (untracked) |

Bottom line: **none of the five claimed features is end-to-end in jimesh.** The bus and chat backends are real and tested — but in `meshsquad-public`, not in the jimesh Go/React repo. In jimesh itself: message bus = nothing; tinode chat = nothing; agent-builder frontend = nothing; the phantom plugin routes = MCP tools calling routes that were never registered; React Flow is real but serves chain/topology visualization, not agent teams.

---

## 1. Message bus — claimed 'message-bus tests 9/9, bus-integration tests 11/11 green'

**Verdict: the test counts are real and the test files exist — but in `/home/ji/projects/meshsquad-public` (Python), NOT in jimesh. In the jimesh repo there is no message-bus feature at all (no routes, no handlers, no tests, no frontend consumer).**

Evidence:

- **No bus files in jimesh backend.** Glob `src/backend/**/*bus*` -> 0 files. Content grep `(?i)\bbus\b|messagebus|message.bus` over all backend `*.go` -> exactly one hit, and it is a comment: `src/backend/internal/service/service.go:1536` — *'it inline when Redis is off, so the bandit still learns without a bus.'* That comment describes the fallback of `EmitRouteEvent` (service.go:1534–1541) and `StartFeedbackLoop` (service.go:1549+) — the internal Redis-Streams feedback loop for the Thompson-sampling router. An internal event mechanism with **no HTTP surface**, not a message-bus feature.
- **No bus routes in gateway.go.** All 61 direct `mux.HandleFunc` registrations (gateway.go:195–404) plus all sub-package `Register(mux)` call sites (gateway.go:194,206,210,222,227,271,277,283,289,295,300,308,315,319,358–361,366,370,385,397) contain zero bus paths.
- **No bus consumption in the jimesh frontend.** Grep `(?i)message.?bus|/api/bus|bus-integration|busClient|useBus` over `src/frontend/src` -> 0 matches.
- **The claimed test files exist in meshsquad-public, with exactly the claimed counts** (counted `def test_` definitions, not executed):
  - `meshsquad-public/test_message_bus.py` — **exactly 9 test functions** (lines 6, 29, 47, 58, 75, 91, 119, 132, 142): busy-agent-not-flooded, long-gap summarization, watches filtering, cursor advance past unwatched, invite idempotency, lazy pagination, room isolation — i.e. they plausibly cover what rm29 ('busy/idle inbox pagination') claimed.
  - `meshsquad-public/test_agents_bus_integration.py` — **exactly 11 test functions** (lines 50, 80, 112, 160, 180, 204, 226, 251, 279, 299, 339): bus-to-team integration (invites on team init, dispatch routing, held-instruction ordering, result chains, refusal semantics).
  - Implementation: `meshsquad-public/message_bus.py` (InMemoryBackend; the Redis-Streams variant there is an honest stub — cf. `plugin.yaml:19–22` — with the real Redis implementation only in `chat-gateway/redis_bus.py`, matching audit.md A6).
- **Route map (jimesh):** the only events-shaped HTTP surface remotely in this area is `/api/agents/logs` + `/api/agents/logs/stream` (SSE) + `/api/agents/analytics/summary`, registered at `src/backend/internal/analytics/analytics.go:40–42` — agent log ingest, not a bus. No frontend component queries any bus endpoint.

---

## 2. Chat (chat-gateway + tinode) — claimed '21/21 tests, backend fertig+live-getestet, UI embedding missing'

**Verdict: CONFIRMED. The chat backend is real and the test file holds exactly 21 tests — but again in meshsquad-public (chat-gateway + tinode), not jimesh. No tinode/chat-gateway route exists in jimesh gateway.go; the jimesh frontend chat component serves only its own LLM proxy; and no jimesh UI calls meshsquad team-assembly API (expected finding: none — confirmed).**

Evidence:

- **Backend files + tests exist (meshsquad-public):** `chat-gateway/` contains `gateway.py`, `tinode_client.py`, `topic_map.py`, `redis_bus.py`, `config.py`, `tinode_plugin.py`, `health_server.py`, `live_check.py`, `model_pb2(_grpc).py`; `chat-gateway/test_chat_gateway.py` — **exactly 21 test functions** (lines 268–701), covering MESSAGING_BACKEND config validation, topic-map semantics, Redis-backend pagination parity, human-message roundtrip through tinode, two-team/two-topic no-leak, cursor persistence across gateway restart. Live stack file: `meshsquad-public/tinode-compose.yml`. (SPRINT-DELIVERY-REVIEW:166–167 records 21/21 re-run green on 28.9.; the live tinode roundtrip was infra-gated, not re-run. I ran nothing, per instructions.)
- **Routes registered:** meshsquad REST/team surface lives in `meshsquad-public/server.py` (GET /teams :420, GET /teams/{name} :436, POST /teams :459, POST /teams/{name}/activate, DELETE /teams/{name}; port 8113 per plugin.yaml:30–31). **In jimesh gateway.go nothing chat-gateway/tinode-related is registered** — grep `(?i)tinode` over all of `src/backend` -> 0 matches; grep `(?i)tinode|chatgateway|chat-gateway` over `src/frontend/src` -> 0 matches.
- **What chat in jimesh actually is:** `/v1/chat/completions` and `/v1/chat/completions/ws` (OpenAI-compatible **LLM proxy**) at `src/backend/internal/ai/aihandlers.go:51–52` (registered via `s.ai.Register(mux)`, gateway.go:194). The frontend chat component `src/frontend/src/components/ChatInterface.tsx` (route `/chat`, App.tsx:572) calls `/v1/models` (line 45) and `/v1/chat/completions` (line 90) — a model playground, **not** a tinode/team chat and **not** an embedding of meshsquad chat.
- **No jimesh UI calls meshsquad team-assembly API:** the only `/api/teams` consumer in `src/frontend/src` is `src/frontend/src/views/TeamsPage.tsx:73,83,95` — and that is jimesh **own RBAC teams surface** (GET/POST/DELETE registered at `src/backend/internal/security/security.go:85`, semantics in `security/rbac.go:111–113`), served same-origin via `apiFetch` (`src/frontend/src/lib/api.ts:120`). Zero meshsquad references anywhere in the jimesh frontend. meshsquad team-assembly (`POST /teams` against the meshsquad server on :8113) is called **only by meshsquad standalone frontend** (`meshsquad-public/frontend/src/lib/api.ts:93–120`; POST /teams at :104). meshsquad remains standalone, as expected.
- Consistent with audit.md P8 ('0 Code auf jimesh-Seite' for the plugin chat panel) and the plugin manifest: `meshsquad-public/plugin.yaml` declares surfaces `api` and `chat` (lines 26–35), but no jimesh wrapper routes exist (`/api/plugins/meshsquad/*` -> 0 matches in `src/backend`).

---

## 3. Agent builder (rm28) — claimed 'backend exists, frontend MISSING entirely'

**Verdict: CONFIRMED for jimesh — no agent-builder/creator endpoint family, no frontend route/component. The rm28 backend is meshsquad config-driven `agents.py`; the frontend-missing part is now outdated for meshsquad itself: a React-Flow team-creator frontend exists on disk (27 tests) but is UNTRACKED in meshsquad git.**

Evidence:

- **Agent-ish endpoints that DO exist in jimesh gateway.go (exact names):**
  - `mux.HandleFunc("/api/agent-types", s.handleAgentTypes)` — `src/backend/internal/gateway/gateway.go:213`; handler at gateway.go:2710 under the section header *'DSH Advanced Agent Types & Sessions'* (gateway.go:2708): GET lists/seeds three default agent types (trading/expert/risk) into `store.AgentTypeRow`, POST upserts one. A small type/session **registry** for DSH agent logging — not a builder/creator for agent teams.
  - `mux.HandleFunc("/api/sessions", s.handleSessions)` — gateway.go:214 (handler :2755+); `mux.HandleFunc("/api/sessions/query", s.handleSessionsQuery)` — gateway.go:215.
  - Sub-package surface (registered from gateway.go): `/api/agents/logs`, `/api/agents/logs/stream`, `/api/agents/analytics/summary` — `src/backend/internal/analytics/analytics.go:40–42`; `/api/subagents`, `/api/subagents/guarded`, `/api/subagents/{id}`, `.../events`, `.../tool-calls`, `.../approve`, `.../deny` — `src/backend/internal/subagents/subagents.go:80–87` (wired via gateway.go:397); `/api/security/agent-scan` — `src/backend/internal/security/security.go:76`.
  - **No endpoint named or shaped like agent-builder, agents/create, or a team-assembly API anywhere in jimesh** (checked every `HandleFunc` registration in the backend).
- **Frontend: zero matches.** Grep `AgentCreator|AgentBuilder|agent-builder|agentBuilder` over `src/frontend/src` (incl. App.tsx + src/views) -> 0 matches. Existing routes: `/agents` -> `AgentsPage` (App.tsx:580), but `src/frontend/src/views/AgentsPage.tsx:3–41` is the Integrations hub rendering only `ActiveDeploymentsSection` + `SubagentsPanel`; `/sessions` (App.tsx:584–586); `/subagents/approvals` and `/subagents/tool-calls` (App.tsx:581–583); `/security/agent-scan` (App.tsx:676). `/builder` (App.tsx:578) is `DashboardBuilderPage` — a dashboard-card layout builder, unrelated to agents.
- **rm28 backend (meshsquad) exists:** `meshsquad-public/agents.py` — `class RoleDefinition` (:331), `class TeamConfig` (:406) with `TeamConfig.from_dict` (:430) — config-driven team assembly, exactly as MASTER-WANT-VS-HAVE section 2 describes.
- **Nuance on frontend missing:** `meshsquad-public/frontend/` **exists on disk** with a React-Flow team-creator (`src/components/RoleNode.tsx`, `RolePanel.tsx`, `TeamForm.tsx`, `TeamsList.tsx`; exactly 27 tests: api.test.ts 6 + graph.test.ts 16 + RolePanel.test.tsx 3 + TeamsList.test.tsx 2) calling the real team-assembly API (`src/lib/api.ts:93–120`: GET/POST `/teams`, `/teams/{name}/activate`, DELETE `/teams/{name}`). **But `git status` in meshsquad-public shows `?? frontend/` — untracked, not committed** (head: `f0cf5d1 meshsquad v0.3.0 — team assembly API`). The rm36/Master-doc statement predates this uncommitted delivery; for **jimesh** it remains true.

---

## 4. Phantom MCP routes — claim: `/api/plugins/{linear,github,dsh}/*` 'called by frontend code but NOT registered in gateway.go'

**Verdict: HALF CONFIRMED. (a) NOT registered in gateway.go = TRUE, exhaustively verified. (b) Called by frontend code = FALSE attribution — the callers are the backend MCP server (`internal/mcpserver`, binary `cmd/jimesh-mcp`), not the React frontend (zero frontend matches). The source claim audit.md B14 states this correctly ('von MCP-Tools aufgerufen'); the frontend phrasing is a misquote. Consequence: every call fails — 404 in the deployed mode.**

Evidence:

- **Registered plugin routes (exhaustive, all of src/backend):** `/api/plugins` (gateway.go:259), `/api/plugin-installations` (gateway.go:260), and only the jules family `/api/plugins/jules/sources|sessions|activities|events` (gateway.go:261–264). **Nothing for linear, github, or dsh under /api/plugins.** Also absent from `docs/API_DOCS.md` (0 matches for plugins/linear|github|dsh) — consistent with the repo mandate: if the route is not in gateway.go, it does not exist. (Note: `/api/dsh/settings|test|import|preview` at `src/backend/internal/discovery/discoveryhandlers.go:34–37` is a different, real DSH-import surface; it does not cover `/api/plugins/dsh/*`.)
- **Actual callers (backend MCP server, not frontend):**
  - `src/backend/internal/mcpserver/tools_linear.go:24` (GET `/api/plugins/linear/issues`), `:53` (POST `/api/plugins/linear/issues`)
  - `src/backend/internal/mcpserver/tools_github.go:30` (GET `/api/plugins/github/prs?repo=...`), `:64` (POST `/api/plugins/github/comments`)
  - `src/backend/internal/mcpserver/tools_dsh.go:22` (GET `/api/plugins/dsh/profiles`), `:52` (POST `/api/plugins/dsh/turns`)
  - All six are wired as MCP tools in `src/backend/internal/mcpserver/server.go:45–52` (ListLinearIssuesTool, CreateLinearIssueTool, ListGitHubPRsTool, CreateGitHubCommentTool, ListDSHProfilesTool, TriggerDSHTurnTool) and executed against the jimesh gateway via `GatewayClient` (default `http://127.0.0.1:19091`, env `JIMESH_URL`, `client.go:30,37,71`).
- **Frontend: zero calls.** Grep `api/plugins/(linear|github|dsh)` over `src/frontend/src` -> 0 matches. Only cosmetic/orthogonal mentions: auth-mode strings `'api_key' | 'github_app'` in `PluginInstallWizardDialog.tsx:67` and a `dsh` CSS color key in `ActiveDeploymentsSection.tsx:612–613`. The plugin **catalog** (`src/backend/internal/gateway/plugins.go:19–51`) does advertise `linear`, `github_app` (and `meshsquad`) entries — a hand-written catalog with no corresponding gateway routes, exactly as the audit framed it (audit.md:120).
- **Failure mode:** the gateway mux catch-all. In the deployed shape the frontend runs as its own Node process and is **not** handed to the backend `-static-dir` flag (`deploy/frontend/defaults.yml:15–17`), so staticDir is empty -> `mux.HandleFunc("/", s.handleNotFound)` (gateway.go:404) -> JSON 404 `{"error":{"message":"not found"}}` (gateway.go:738–741). (If `-static-dir` were set — default `/frontend-dist`, `src/backend/cmd/server/main.go:125` — the SPA fallback `spaHandler` (gateway.go:399–401) would instead serve `index.html` with HTTP 200; either way the MCP tool call cannot return valid data. The audit 404 claim holds for the deployed mode.)

---

## 5. React Flow usage in jimesh

**Verdict: `@xyflow/react` (^12.11.5, `src/frontend/package.json:26`) is real and used in exactly two components — the interactive proxy-chain canvas and the read-only mesh topology. There is NO team-creator-like canvas in jimesh; the only node-builder canvas builds model-routing chains/pools. A React-Flow team-creator exists only in meshsquad-public (untracked) frontend.**

Evidence:

- **Usage 1 — chain/mesh graph (interactive):** `src/frontend/src/components/chain-mesh-graph.tsx` imports ReactFlow, useNodesState/useEdgesState/addEdge from `@xyflow/react` (lines 5–18) and renders `<ReactFlow>` at lines 1498–1532. A real drag-and-drop editor: dragging models between pools (lines 120, 159, 184, 338–350, incl. the explicit `nodrag` interop comment at :349) and connecting pool nodes (onConnect, comment at :1067). Consumer: `src/frontend/src/views/FallbackPage.tsx:15` (import) and `:508` (usage) — the `/config` chain editor. Its backend is real: `GET/POST/PATCH/DELETE /api/chains/{id}/graph|nodes|edges` registered in `src/backend/internal/canvas/canvas.go:43–50` (wired via `s.canvas.Register(mux)`, gateway.go:210).
- **Usage 2 — mesh topology (read-only):** `src/frontend/src/components/networks/mesh-topology.tsx` imports ReactFlow (lines 3–10), renders at lines 201–215 with `nodesDraggable={false}` (line 209). Consumer: `src/frontend/src/views/NetworksPage.tsx:51` (import), `:696` (usage).
- **No team-creator canvas in jimesh:** no component in `src/frontend/src` renders agent/team nodes on a React-Flow canvas — the two consumers above are the only ones. `DashboardBuilderPage` (`/builder`, App.tsx:578) is a grid-card dashboard builder, not a canvas. The team-creator canvas (React-Flow RoleNodes, watch-relations as edges) exists only in `meshsquad-public/frontend` (xyflow in its package.json; `src/components/RoleNode.tsx`) — outside jimesh and untracked in git.

---

### Method notes
- No tests were run (explicitly forbidden); test counts were established by counting `def test_` / `it(` / `test(` definitions in the named files.
- No file inside `/home/ji/projects/jimesh` or meshsquad-public was modified; this report is the only file written.
- All backend route statements were cross-checked against both authoritative registration surfaces: the direct `mux.HandleFunc` block (gateway.go:195–404) and the 22 sub-package `Register(mux)` calls listed at gateway.go:194–397.
