# SquadMesh ↔ jimesh Integration Plan

## Executive Summary

SquadMesh is a **standalone Go microservice** that provides:
- **Message Bus** (Redis Streams) for agent-to-agent communication
- **Chat Gateway** bridging Tinode (human chat) ↔ Redis Streams (agent bus)
- **Agent Orchestration** (lifecycle, subteams, scheduling, governance)
- **Workers Runtime** (workerd, gVisor, Cloudflare, AWS Lambda, GCP Cloud Run)
- **Model/Workflow Layer** (invocation, model inference, workflows)
- **PyTorch Lightning Integration** (training, sync, GPU, distributed)

jimesh already has **SPRINT-163 meshsquad plugin lifecycle** (status/health/uninstall) but the **chat-space API and agent runtime are missing**. SquadMesh provides the missing pieces as a **connector system** — a standalone Go service that jimesh integrates with via plugin installation.

---

## Current State (What Exists)

### jimesh Side ✅
| Component | Status | Location |
|-----------|--------|----------|
| Plugin lifecycle (status/health/uninstall) | ✅ Done | `gateway/meshsquad.go` |
| Plugin install validation | ✅ Done | `plugins.go` |
| Plugin catalog (meshsquad entry) | ✅ Done | `plugins.go` |
| Frontend: Chat space page | ✅ Done | `MeshSquadChatSpacePage.tsx` |
| Frontend: Status hook | ✅ Done | `meshSquadChatDeepLink()` |
| Frontend: Sidebar entry | ✅ Done | `MeshSquadChatEntry.tsx` |
| Frontend: Deploy gate | ✅ Done | `MeshSquadChatGateSection.tsx` |
| Frontend: API client | ✅ Done | `meshsquad-chat.ts` |

### jimesh Side ❌ Missing
| Component | Needed For | Sprint |
|-----------|------------|--------|
| Chat-space API proxy (`/chat/channels`, `/teams`) | Frontend calls SquadMesh directly | S1 |
| Agent runtime (workers) | Agent execution | S1-S7 |
| SquadMesh worker deployment | Deploy SquadMesh via plugin | S6 |
| Workers AI integration | Model inference | S7 |
| workerd auto-download | Local agent workers | S1 |

### SquadMesh (feat/squadmesh-impl branch) ✅ Ready
| Package | Purpose |
|---------|---------|
| `bus/` | Redis Streams backend, AgentBusClient, Orchestrator, Inbox |
| `gateway/` | Tinode ↔ Redis bridge |
| `ws/` | WebSocket/SSE hub |
| `agent/` | Standalone agent mode |
| `orchestrator/` | Agent lifecycle, subteams, scheduling |
| `scheduler/` | Cron/lambda, report generation |
| `integrations/` | Linear, Jira, GitHub, Obsidian, S3, Slack + Vault |
| `storage/` | S3/MinIO with workspace-scoped prefixes |
| `governance/` | Tier-based escalation, mandates, structured requests |
| `workers/` | workerd, gVisor, Cloudflare, AWS Lambda, GCP Cloud Run |
| `workers/providers/workers_ai.go` | Cloudflare Workers AI (30+ models) |
| `workers/providers/workerd.go` | workerd auto-download, wrangler.toml generation |

---

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        JIMESH DASHBOARD                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Plugin UI   │  │ Chat Space  │  │ Agent Builder / Config  │  │
│  │ (Install)   │  │ Page        │  │ (Agent Config + Target) │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                │                     │                │
│         ▼                ▼                     ▼                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              JIMESH BACKEND (Go)                            ││
│  │  • Plugin lifecycle (status/health/uninstall)               ││
│  │  • Plugin install validation (crewApiUrl validation)        ││
│  │  • Plugin catalog (meshsquad entry with installable=true)   ││
│  │  • NO chat-space proxy (browser calls SquadMesh directly)   ││
│  └─────────────────────────────────────────────────────────────┘│
│         │                │                     │                │
│         ▼                ▼                     ▼                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              SQUADMESH SERVICE (Go)                         ││
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  ││
│  │  │ Gateway  │  │ Bus      │  │ Orchest. │  │ Workers    │  ││
│  │  │ (Tinode) │  │ (Redis)  │  │ (Agent)  │  │ (Multi)    │  ││
│  │  └──────────┘  └──────────┘  └──────────┘  └────────────┘  ││
│  │         │            │            │            │            ││
│  │         └────────────┴────────────┴────────────┘            ││
│  │                      │                                      ││
│  │              ┌───────┴───────┐                              ││
│  │              │ Workers Mgr   │                              ││
│  │              │ • workerd     │                              ││
│  │              │ • gVisor      │                              ││
│  │              │ • Cloudflare  │                              ││
│  │              │ • AWS Lambda  │                              ││
│  │              │ • GCP CloudRun│                              ││
│  │              └───────────────┘                              ││
│  └─────────────────────────────────────────────────────────────┘│
│         │                │                     │                │
│         ▼                ▼                     ▼                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ TINODE      │  │ REDIS       │  │ WORKER TARGETS          │ │
│  │ (Human chat)│  │ (Message    │  │ • workerd (local)       │ │
│  │ Tinode UI)  │  │ Bus)        │  │ • gVisor (Docker)       │ │
│  └─────────────┘  └─────────────┘  │ • Cloudflare Workers AI │ │
│                                    │ • AWS Lambda            │ │
│                                    │ • GCP Cloud Run         │ │
│                                    └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Integration Points

### 1. Plugin Installation (Already Works)
```bash
# User installs meshsquad plugin via jimesh UI
POST /api/plugin-installations
{
  "pluginId": "meshsquad",
  "config": {
    "crewApiUrl": "http://squadmesh:8080"  # or external URL
  }
}
```
- jimesh validates `crewApiUrl` (valid HTTP(S) URL)
- Persists installation row with `secretRef` for any secrets
- Sets `installable=true` (because `pluginBackendRoutes["meshsquad"]` has routes)

### 2. Chat Space API (Frontend → SquadMesh Direct)
**Frontend calls SquadMesh directly** (no jimesh proxy):
```typescript
// From meshsquad-chat.ts
GET  {crewApiUrl}/chat/channels   → { teams: [{ team, channels: [...] }] }
POST {crewApiUrl}/chat/channels   { team, channel_name, is_main? }
GET  {crewApiUrl}/teams           → { active, teams: [...] }
```

**Requirements for SquadMesh:**
- CORS headers for jimesh dashboard origin
- Endpoints: `GET /chat/channels`, `POST /chat/channels`, `GET /teams`
- Response format matches `MeshSquadChatSpace[]`, `MeshSquadChannel`, `MeshSquadTeamRow`

### 3. Agent Runtime (SquadMesh Workers)
```yaml
# SquadMesh deployment via docker-compose
services:
  squadmesh:
    build: .
    environment:
      - MODE=combined
      - REDIS_URL=redis://redis:6379
      - TINODE_ADDR=tinode:16060
      - MODE=combined
      - AGENT_ID=squadmesh-agent
      - CHANNELS=general,agents
      - WORKER_TARGET=local-workerd  # or cloudflare, aws-lambda, gcp-cloudrun
```

### 4. Agent Deployment (Agent Deploys Agent)
```go
// From orchestrator/orchestrator.go
func (o *Orchestrator) DeployAgent(ctx context.Context, spec AgentSpec) (WorkerID, error) {
    worker, err := o.workerManager.CreateWorker(ctx, WorkerConfig{
        Target:       spec.Target,        // local-workerd, gVisor, Cloudflare, etc.
        RuntimeID:    fmt.Sprintf("agent-%s-%d", spec.Type, time.Now().UnixNano()),
        MemoryMB:     spec.MemoryMB,
        CPUSeconds:   spec.CPUSeconds,
        Language:     spec.Language,      // "python", "javascript", "typescript"
        Environment:  spec.Environment,
    })
    return worker.GetInfo().ID, nil
}
```

---

## Deployment Options

### Option 1: Docker Compose (Local Dev)
```yaml
# docker-compose.yml (add to jimesh)
services:
  squadmesh:
    build: ./squadmesh
    environment:
      - MODE=combined
      - REDIS_URL=redis://redis:6379
      - TINODE_ADDR=tinode:16060
      - TINODE_BASIC_AUTH=${TINODE_BASIC_AUTH}
      - TOPIC_MAP_PATH=/config/topic_map.json
      - AGENT_ID=squadmesh-agent
      - CHANNELS=general,agents
      - HTTP_PORT=8080
      - HEALTH_PORT=8115
      - POLL_INTERVAL=1s
    depends_on:
      redis:
        condition: service_healthy
      tinode:
        condition: service_healthy
    ports:
      - "8080:8080"   # HTTP + WebSocket
      - "8115:8115"   # Health
      - "18060:18060" # Tinode plugin gRPC
    volumes:
      - ./squadmesh/deploy/topic_map.json:/config/topic_map.json:ro

  redis:
    image: redis:7-alpine
    # ... existing redis config

  tinode:
    image: tinode/tinode:0.25.3
    # ... existing tinode config
```

### Option 2: Kubernetes (Production)
```yaml
# squadmesh-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: squadmesh
spec:
  replicas: 3
  selector:
    matchLabels:
      app: squadmesh
  template:
    spec:
      containers:
      - name: squadmesh
        image: squadmesh:latest
        env:
        - name: MODE
          value: "combined"
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: url
        - name: TINODE_ADDR
          value: "tinode:16060"
        - name: WORKER_TARGET
          value: "cloudflare"  # or local-workerd, aws-lambda, etc.
        ports:
        - containerPort: 8080
        - containerPort: 8115
        - containerPort: 18060
---
apiVersion: v1
kind: Service
metadata:
  name: squadmesh
spec:
  selector:
    app: squadmesh
  ports:
  - name: http
    port: 8080
  - name: health
    port: 8115
  - name: grpc
    port: 18060
```

### Option 3: Plugin-Deployed (Future)
```go
// In jimesh plugin install, auto-deploy SquadMesh
func (s *Server) handleMeshSquadInstall(w http.ResponseWriter, r *http.Request) {
    // ... existing install logic ...
    
    // NEW: Auto-deploy SquadMesh if not running
    if err := deploySquadMesh(config); err != nil {
        log.Printf("Failed to auto-deploy SquadMesh: %v", err)
        // Don't fail install - SquadMesh can be deployed separately
    }
}
```

---

## Worker Target Selection

| Target | Use Case | Cold Start | GPU | Python | JS/TS |
|--------|----------|------------|-----|--------|-------|
| `local-workerd` | Local dev, JS/TS agents | 5ms | ❌ | ❌ | ✅ |
| `local-gvisor` | Python agents, full Linux | 200ms | ✅ | ✅ | ✅ |
| `cloudflare` | Edge, global scale | 5ms | ❌ | ✅* | ✅ |
| `aws-lambda` | Heavy compute, Firecracker | 100ms | ✅ | ✅ | ✅ |
| `gcp-cloudrun` | Container + gVisor, Knative | 100ms | ✅ | ✅ | ✅ |

*Cloudflare Workers AI supports Python via Python Workers (beta)

**Auto-selection logic** (in `WorkerManager`):
```go
func (m *WorkerManager) selectTargetForTask(task *TaskPayload) WorkerTarget {
    switch task.Language {
    case "python":
        return TargetLocalGVisor
    case "javascript", "typescript", "wasm":
        if m.hasProvider(TargetCloudflare) {
            return TargetCloudflare
        }
        return TargetLocalWorkerd
    default:
        return m.defaultTarget
    }
}
```

---

## Frontend Integration (Already Works)

### Chat Space Page (`MeshSquadChatSpacePage.tsx`)
- Already calls SquadMesh directly via `meshsquad-chat.ts`
- Expects endpoints: `GET /chat/channels`, `POST /chat/channels`, `GET /teams`
- Handles 404/405 "not deployed yet" state gracefully

### Sidebar Entry (`MeshSquadChatEntry.tsx`)
- Shows install status, navigates to `/chat/space`
- Uses `useMeshSquadChatStatus()` hook

### Deploy Gate (`MeshSquadChatGateSection.tsx`)
- Shows "Open chat" button when installed
- Links to `/chat/space`

### Install Wizard (`PluginInstallWizardDialog.tsx`)
- Collects `crewApiUrl` for meshsquad
- Uses `service_account` auth mode

---

## Configuration

### jimesh Side
```yaml
# config.yml
meshsquad:
  crewApiUrl: "http://squadmesh:8080"  # internal or external
  # No other config needed - chat space calls SquadMesh directly
```

### SquadMesh Side
```bash
# Environment variables
MODE=combined
REDIS_URL=redis://redis:6379
TINODE_ADDR=tinode:16060
TINODE_BASIC_AUTH=user:pass
TINODE_PLUGIN_LISTEN=0.0.0.0:18060
TOPIC_MAP_PATH=/config/topic_map.json
AGENT_ID=squadmesh-agent
CHANNELS=general,agents
HTTP_PORT=8080
HEALTH_PORT=8115
POLL_INTERVAL=1s
WORKER_TARGET=local-workerd
CF_ACCOUNT_ID=xxx
CF_API_TOKEN=xxx
AWS_REGION=us-east-1
GCP_PROJECT_ID=xxx
```

### Topic Map (Shared)
```json
# deploy/topic_map.json
{
  "teams": [
    {"team": "marketing", "tinode_topic": "grpMarketing", "bus_channel": "marketing", "forward_kinds": ["message", "agent_reply"]},
    {"team": "engineering", "tinode_topic": "grpEngineering", "bus_channel": "engineering", "forward_kinds": ["message", "agent_reply"]},
    {"team": "general", "tinode_topic": "grpGeneral", "bus_channel": "general", "forward_kinds": ["message"]},
    {"team": "agents", "tinode_topic": "grpAgents", "bus_channel": "agents", "forward_kinds": ["message", "agent_reply", "tool_call", "tool_result"]},
    {"team": "org:main", "tinode_topic": "grpMain", "bus_channel": "main", "forward_kinds": ["message", "agent_reply"]}
  ]
}
```

---

## Integration Checklist

### jimesh Changes Required
| Item | Status | Effort |
|------|--------|--------|
| Add SquadMesh to docker-compose.yml | ❌ | 1 hour |
| Ensure CORS for `/chat/*` and `/teams` on SquadMesh | ❌ | 30 min |
| Update `config.yml` with SquadMesh URL | ❌ | 5 min |
| Add `meshSquad` topic map to deploy | ❌ | 10 min |
| Optional: Auto-deploy SquadMesh on plugin install | ⏳ | 4 hours |

### SquadMesh Ready Items
| Component | Status |
|-----------|--------|
| Redis Streams backend | ✅ |
| AgentBusClient + Orchestrator | ✅ |
| Tinode gateway | ✅ |
| WebSocket/SSE hub | ✅ |
| workerd provider (auto-download) | ✅ |
| Workers AI (30+ models) | ✅ |
| gVisor, Cloudflare, AWS Lambda, GCP Cloud Run | ✅ |
| WorkerManager with target selection | ✅ |
| Orchestrator with lifecycle | ✅ |
| Scheduler with governance | ✅ |
| PyTorch Lightning integration | ✅ |
| Permissions + Agent Bible | ✅ |

---

## Next Steps

### Immediate (This Week)
1. **Add SquadMesh to jimesh docker-compose.yml** - 1 hour
2. **Configure CORS on SquadMesh** for jimesh dashboard origin - 30 min
3. **Add topic_map.json to jimesh deploy** - 10 min
3. **Test end-to-end**: Install plugin → Open chat space → Create channel → Send message

### This Month
1. **Deploy SquadMesh to staging** with docker-compose
2. **Test agent deployment**: Agent A deploys Agent B via WorkerManager
3. **Test Workers AI**: Agent invokes Llama 3.1 via Workers AI
4. **Test PyTorch Lightning**: Agent triggers training run

### Future
- **Auto-deploy SquadMesh** on plugin install
- **Multi-workspace isolation** (X-Workspace-Scope for Redis Streams)
- **Agent billing/metering** per worker-second
- **Worker autoscaling** based on queue depth

---

## Key Decisions Made

| Decision | Rationale |
|----------|-----------|
| **No jimesh chat proxy** | Frontend calls SquadMesh directly (CORS), simpler, no proxy overhead |
| **SquadMesh as separate service** | Independent scaling, separate deployments, language-agnostic |
| **workerd auto-download** | Zero-config local dev, same binary as Cloudflare |
| **Workers AI integration** | 30+ models ready, same API as Cloudflare |
| **workerd auto-download** | Zero-config local dev |
| **wrangler.toml generation** | Deploy to Cloudflare from local |
| **Agent deploys agent** | Specialized workers on-demand |
| **Minimal tool scoping** | ST2 learnings, Agent Bible compliance |

---

## File Locations

| File | Purpose |
|------|---------|
| `/home/ji/projects/jimesh/SQUADMESH_JIMESH_INTEGRATION.md` | This document |
| `/home/ji/projects/jimesh-squadmesh-impl/` | SquadMesh implementation (feat/squadmesh-impl branch) |
| `/home/ji/projects/jimesh/src/backend/internal/gateway/meshsquad.go` | jimesh plugin lifecycle |
| `/home/ji/projects/jimesh/src/frontend/src/lib/meshsquad-chat.ts` | Frontend API client |
| `/home/ji/projects/jimesh/src/frontend/src/views/MeshSquadChatSpacePage.tsx` | Chat space UI |
| `/home/ji/projects/jimesh-squadmesh-impl/squadmesh/` | SquadMesh source code |

---

## Next Actions

1. **Review this document** with team
2. **Add SquadMesh to jimesh docker-compose.yml**
3. **Deploy to test environment**
4. **Run integration test**: Install plugin → Open chat → Create channel → Agent sends message

The integration is designed to be **minimal on jimesh side** (just lifecycle + config) with **SquadMesh doing all the heavy lifting** as a standalone service. This keeps jimesh clean and SquadMesh independently deployable/scalable.