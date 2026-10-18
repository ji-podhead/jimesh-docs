# Sprint 17 — Container Registry, MCP & Auto-Discovery

## Goal
JiMesh becomes the universal bridge: container registry, MCP integration,
auto-discovery, agent tool registry, project roadmap graph, icon system.
Agents and humans work seamlessly across projects with mutual control.

## Work Packages

### WP1: Container/Environment Registry
- [ ] `environment_templates` table: id, name, base_image, packages (JSONB),
      config (JSONB), version, created_at
- [ ] `POST /api/environments` — create template
- [ ] `GET /api/environments` — list templates
- [ ] `POST /api/environments/{id}/instantiate` — build + run container from template
      - Uses `github.com/docker/docker/client`
      - Returns container ID + port mapping
- [ ] Pre-built seeds: Python+CrewAI, Go+DSH, Node+Claude, Terminal, Adminer
- [ ] Agent can create template → instantiate → run → destroy
- [ ] Versioning: template v1/v2, rollback

### WP2: MCP Integration (Docker MCP Toolkit)
- [ ] JiMesh MCP Server (`cmd/mcp-server/main.go`)
      - Uses `github.com/mark3labs/mcp-go`
      - Exposes JiMesh API as MCP tools: deploy, provision, list_chains,
        execute_experts, orchestrate, enrich_model, create_environment
      - Runs as Docker container: `docker mcp server add jimesh`
      - Dockerfile: `docker/mcp/Dockerfile`
- [ ] JiMesh MCP Client
      - Connects to Docker MCP Gateway (`docker/mcp-gateway:latest`)
      - Discovers all running MCP servers → auto-registers as agent tools
      - Agents can call: filesystem.read, postgres.query, github.create_pr,
        brave_search.search, puppeteer.navigate, docker.create
- [ ] MCP tool schema (JSON schema for function calling)
      - Each MCP tool has input/output schema
      - Agents use schema for function calling
- [ ] API:
      - `GET /api/mcp/servers` — list discovered MCP servers
      - `GET /api/mcp/tools` — list all available MCP tools
      - `POST /api/mcp/call` — call an MCP tool (for testing/debugging)
- [ ] Docker Compose: mcp-gateway + jimesh-mcp service

### WP3: Auto-Discovery (Containers + Ports + Apps + MCP)
- [ ] `discovered_services` table: id, project_id, name, type (container/
      mcp_server/port/app), image, port, process, mcp_tools (JSONB), status
      (discovered/promoted/ignored), discovered_at, last_seen
- [ ] Discovery scanner (cron job via `github.com/robfig/cron/v3`):
      1. `docker ps --format json` via SSH → running containers
      2. `docker mcp server list --format json` via SSH → MCP servers
      3. `ss -tlnp` via SSH → open ports + process names
      4. `find ~/projects -maxdepth 2 -name "docker-compose.yml"` → apps
      5. Parse → auto-register in `discovered_services`
- [ ] Auto-tool registration:
      - Discovered PostgreSQL (5432) → register `db_query` agent tool
      - Discovered Redis (6379) → register `cache_get/set` agent tool
      - Discovered MCP server → register all its tools as agent tools
- [ ] API:
      - `GET /api/discovery` — list all discovered services
      - `POST /api/discovery/{id}/promote` — promote to deployment
      - `POST /api/discovery/{id}/add-tool` — add as agent tool
      - `DELETE /api/discovery/{id}` — ignore/remove

### WP4: Agent Tool Registry
- [ ] `agent_tools` table: id, name, type (shell/database/docker/browser/api/
      filesystem/mcp/custom), config (JSONB), enabled, source (discovered/
      manual/mcp), mcp_server (nullable), created_at
- [ ] Built-in tools:
      - `shell_exec` — execute command in container/SSH
      - `db_query` — query database (postgres/mysql/redis)
      - `docker_create` — create container
      - `docker_logs` — tail container logs
      - `e2e_deploy` — full deployment via templates
      - `browser_navigate` — browser automation (Sprint 16)
      - `jimesh_api` — JiMesh REST API access
      - `filesystem` — read/write files (SSH or local)
- [ ] API:
      - `GET /api/agent-tools` — list all tools
      - `POST /api/agent-tools` — register tool
      - `PUT /api/agent-tools/{id}` — update
      - `DELETE /api/agent-tools/{id}` — remove
- [ ] Tool config schema → frontend form generator (auto-generate form from
      JSON schema)

### WP5: Project Roadmap Visualization
- [ ] React Flow graph view (reuse `@xyflow/react`):
      - Nodes: projects, deployments, chains, environments, discovered services
      - Edges: dependencies (project → deployment → chain → models)
      - Auto-layout: `@dagrejs/dagre`
      - Interactive: click node → details panel
      - Filter: by type, status, category
- [ ] Tabs:
      - "Mesh Canvas" (existing — chains/pools/edges)
      - "Projects" (project graph — deployments/dependencies)
      - "Discovery" (auto-discovered services graph + MCP badge)
      - "Agents" (expert registry + runs + tool list)
- [ ] Sidebar customization:
      - `project_sidebar_items` table: user_id, project_id, order
      - User picks which projects/deployments in sidebar
      - Others visible in graph but not sidebar
- [ ] Frontend route: `/roadmap`

### WP6: Icon System (react-icons)
- [ ] Install `react-icons` (npm)
- [ ] Icon mapping component: `src/frontend/src/components/service-icon.tsx`
- [ ] Maps: deployment type, environment template, discovered service, agent
      tool → appropriate icon (Si*, Fa*, lucide)
- [ ] Used in: deployment cards, environment templates, discovery tab,
      agent tool list, sidebar

### WP7: Docker MCP Server (JiMesh as MCP)
- [ ] `src/backend/cmd/mcp-server/main.go` — standalone MCP server binary
- [ ] Exposes JiMesh API tools via `github.com/mark3labs/mcp-go`
- [ ] Tools: deploy, provision, list_chains, execute_experts, orchestrate,
      enrich_model, create_environment
- [ ] `docker/mcp/Dockerfile` — builds MCP server container
- [ ] `docker/mcp/docker-compose.yml` — mcp-gateway + jimesh-mcp
- [ ] User: `docker mcp server add jimesh` → agents can call JiMesh via MCP

## Acceptance Criteria
- [ ] User can compose environment templates and instantiate them as containers
- [ ] JiMesh MCP server runs as Docker container, agents can call JiMesh tools
- [ ] Network discovery finds running containers, ports, MCP servers → auto-registers
- [ ] Agent tool registry: all tools listed, auto-registered from discovery + MCP
- [ ] Project roadmap graph: visual graph of projects → deployments → chains
- [ ] Icons: all service types have proper tech icons
- [ ] All APIs documented in API_DOCS.md
- [ ] Build verified: CGO_ENABLED=0 clean compile
