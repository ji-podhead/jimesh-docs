# Package & Fork Recommendations — Don't Reinvent the Wheel

Every feature mapped to an existing, maintained package or fork.
Use these instead of building from scratch.

---

## Frontend (React / TypeScript)

| Feature | Package | Why | Alt |
|---|---|---|---|
| **Grid layout** (multi-window) | `react-grid-layout` | Mature, drag+resize, TS, React 18 | `@allotment/allotment` |
| **Icons** (tech/dev) | `react-icons` | One package: Fa*, Si*, Di*, Vsc* — Docker, Python, Go, PG, Redis, Node | `@iconify/react` |
| **Dev icons** (colored brands) | `react-icons/si` (Simple Icons) | 2000+ brand/tech SVGs: SiDocker, SiPostgresql, SiGo, SiPython | `devicons-react` |
| **Code editor** (config) | `@uiw/react-codemirror` | CodeMirror 6 React wrapper, JSON/YAML lang, dark theme | `@monaco-editor/react` (heavier) |
| **Graph/canvas** | `@xyflow/react` | Already in JiMesh, reuse for roadmap graph | — |
| **Auto-layout** (graph) | `@dagrejs/dagre` | Auto-position nodes in React Flow | `elkjs` |
| **Terminal** (web) | `@xterm/xterm` + `@xterm/addon-fit` | xterm.js — web terminal, WebSocket backend | `ttyd` (separate server) |
| **Toasts** | `sonner` | Already used in JiMesh | — |
| **UI components** | `@base-ui-components/react` | Already used in JiMesh | — |

## Backend (Go)

| Feature | Package | Why | Alt |
|---|---|---|---|
| **SSH client** | `golang.org/x/crypto/ssh` | Standard Go SSH, tunnel, exec | — |
| **Docker API** | `github.com/docker/docker/client` | Official Docker Go client: containers, images, volumes, exec | `github.com/fsouza/go-dockerclient` |
| **Browser automation** | `github.com/chromedp/chromedp` | Go CDP client, headless/headed, screenshots, click, type | `github.com/playwright-community/playwright-go` |
| **HTTP/3 / QUIC** | `github.com/quic-go/quic-go` | Go HTTP/3 server+client, 0-RTT, multiplexing | — |
| **MCP server** | `github.com/mark3labs/mcp-go` | Go MCP server SDK, JSON-RPC, tools, resources | `github.com/modelcontextprotocol/go-sdk` |
| **Fuzzy matching** | `github.com/agnivade/levenshtein` | Levenshtein distance in Go | `github.com/lithium-ion/go-fuzzy` |
| **JSONC parsing** | `github.com/tailscale/jsonc` | JSON with comments parser | `github.com/muhammadmuzzammil1998/jsonc` |
| **Template engine** | `text/template` (stdlib) | Go stdlib, sufficient for Dockerfile/compose templates | `github.com/Masterminds/sprout` (extra functions) |
| **WebSocket** | `github.com/coder/websocket` (nhooyr) | Go WebSocket, used for xterm.js terminal | `github.com/gorilla/websocket` |
| **Cron/scheduler** | `github.com/robfig/cron/v3` | Periodic health checks, discovery scans | `time.Ticker` (stdlib, simpler) |
| **Postgres driver** | `github.com/jackc/pgx/v5` | Already in JiMesh | — |
| **Redis client** | `github.com/redis/go-redis/v9` | Already in JiMesh | — |
| **SearXNG** | (self-hosted service) | No Go package needed — HTTP client only | `searxng/docker-searxng` |
| **OpenRouter** | (HTTP only) | No package — `net/http` calls to openrouter.ai | — |

## Python Sidecar (Optional, Sprint 13 WP4)

| Feature | Package | Why |
|---|---|---|
| **CrewAI** | `crewai` | Multi-agent framework, roles, tasks, sequential/hierarchical |
| **Instructor** | `instructor` | Structured output via pydantic, retry on validation |
| **LangGraph** | `langgraph` | Graph-based agent workflows (optional adapter) |
| **MCP client** | `mcp` (official) | Python MCP client SDK |
| **HTTP server** | `fastapi` + `uvicorn` | Python sidecar HTTP server |

## Docker / Infrastructure

| Feature | Package/Image | Why |
|---|---|---|
| **Base images** | `ubuntu:24.04`, `python:3.12-slim`, `golang:1.22`, `node:20-alpine` | Official, slim, cached |
| **SearXNG** | `searxng/searxng` | Official Docker image, self-hosted meta search |
| **Adminer** | `adminer:latest` | DB admin UI, one container |
| **ttyd** (web terminal) | `tsl0922/ttyd` | Web terminal server (alt to xterm.js custom) |
| **xterm.js** (preferred) | `@xterm/xterm` + WebSocket | More control, no extra container |
| **Docker MCP Gateway** | `docker/mcp-gateway:latest` | Single gateway for all MCP servers, agents connect once |
| **Docker MCP Catalog** | `docker mcp catalog list` | Verified MCP connectors (filesystem, github, postgres, etc.) |

## Docker MCP Toolkit

| Feature | Package | Why |
|---|---|---|
| **MCP server (Go)** | `github.com/mark3labs/mcp-go` | Go MCP server SDK — build JiMesh MCP server as Docker container |
| **MCP client (Go)** | `github.com/mark3labs/mcp-go/mcp` | Go MCP client — connect to Docker MCP gateway |
| **MCP catalog** | `docker mcp catalog list` | Docker-curated verified MCP connectors |
| **MCP server install** | `docker mcp server add <name>` | User installs connector → Docker runs it as isolated container |
| **MCP gateway** | `docker mcp gateway run` | Single endpoint agents connect to → all MCP tools available |
| **MCP discovery** | `docker mcp server list --format json` | List running MCP servers → JiMesh auto-registers as agent tools |
| **MCP client (Python)** | `mcp` (official Anthropic) | Python MCP client for CrewAI sidecar |

## Icon Mapping (react-icons/si + Fa)

```typescript
import { SiDocker, SiGo, SiPython, SiPostgresql, SiRedis, SiNodedotjs,
  SiTypescript, SiAnthropic, SiPhp, SiRust, SiReact, SiVite } from 'react-icons/si'
import { FaTerminal, FaDatabase, FaCube, FaNetworkWired } from 'react-icons/fa'
import { Cpu, Terminal, Wrench, FolderHeart, Layers } from 'lucide-react'

const iconMap = {
  // Deployment types
  dsh:           <Cpu />,           // lucide
  terminal:      <Terminal />,     // lucide
  opencode:      <FaTerminal />,   // fa
  'vscode-server': <SiTypescript />,
  custom:        <FaCube />,        // fa

  // Addons / providers
  'claude-code':  <SiAnthropic />,  // si
  aider:          <Wrench />,       // lucide
  crewai:         <SiPython />,     // si
  'jimesh-mesh':  <Layers />,       // lucide

  // Environments
  python:        <SiPython />,
  go:            <SiGo />,
  node:          <SiNodedotjs />,
  docker:        <SiDocker />,
  rust:          <SiRust />,

  // Services (auto-discovered)
  postgresql:    <SiPostgresql />,
  mysql:         <SiPhp />,         // fallback
  redis:         <SiRedis />,
  adminer:        <SiPhp />,
  node_app:      <SiNodedotjs />,

  // Tools (agent tools)
  shell:         <FaTerminal />,
  database:      <FaDatabase />,
  docker:        <SiDocker />,
  browser:       <SiReact />,      // fallback
  network:       <FaNetworkWired />,
}
```

## What We DON'T Need to Build (use packages instead)

| Feature | Instead of building | Use |
|---|---|---|
| Docker management | Custom Docker API calls | `github.com/docker/docker/client` |
| MCP server/client | Custom JSON-RPC | `github.com/mark3labs/mcp-go` + Docker MCP Toolkit |
| MCP connectors | Custom tools for DB/git/files | Docker MCP Catalog (`docker mcp server add`) |
| MCP gateway | Custom tool router | `docker/mcp-gateway:latest` |
| Browser automation | Custom CDP client | `github.com/chromedp/chromedp` |
| SSH tunnel | Custom tunnel | `golang.org/x/crypto/ssh` |
| HTTP/3 server | Custom QUIC | `github.com/quic-go/quic-go` |
| Web terminal | Custom terminal | `@xterm/xterm` + `@xterm/addon-fit` |
| Fuzzy match | Custom Levenshtein | `github.com/agnivade/levenshtein` |
| JSONC parsing | Custom comment stripper | `github.com/tailscale/jsonc` |
| Code editor | Custom textarea | `@uiw/react-codemirror` |
| Graph auto-layout | Custom positioning | `@dagrejs/dagre` |
| Icons | Custom SVGs | `react-icons` (Si*, Fa*, Di*) |
| CrewAI support | Custom agent framework | `crewai` (Python sidecar) |
| Structured output | Custom validation | `instructor` (Python) or Go struct + JSON |
| Container isolation | Custom sandboxing | Docker MCP runs each connector in its own container |

## What We Already Have (no package needed)

| Feature | Status |
|---|---|
| React Flow canvas | `@xyflow/react` — already in JiMesh |
| Toast notifications | `sonner` — already in JiMesh |
| PostgreSQL | `pgx/v5` — already in JiMesh |
| Redis | `go-redis/v9` — already in JiMesh |
| SSE streaming | Custom Go handler — already built |
| Entropy routing | Custom Go — already built (Sprint 13 WP1) |
| Orchestration | Custom Go — already built (Sprint 13 WP2) |
| MoE agents | Custom Go — already built (Sprint 14 WP2) |
