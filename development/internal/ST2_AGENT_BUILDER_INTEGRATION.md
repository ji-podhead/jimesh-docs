# ST2 Agent Builder Integration Plan

## Executive Summary

The ST2 Agent Builder (config-driven team/agent creation) exists in **meshsquad-public** (Python/React) but is **missing entirely from jimesh**. This document outlines the integration plan to bring the agent builder into jimesh, leveraging SquadMesh as the runtime backend.

---

## Current State Analysis

### What Exists (meshsquad-public - Python/React) ✅
| Component | Location | Status |
|-----------|----------|--------|
| **Backend** | `meshsquad-public/agents.py` | ✅ RoleDefinition, TeamConfig, Team API |
| **Backend API** | `meshsquad-public/server.py` | ✅ GET/POST /teams, activate, delete |
| **Frontend** | `meshsquad-public/frontend/src/components/` | ✅ RoleNode, RolePanel, TeamForm, TeamsList |
| **Frontend Graph** | React Flow based team creator | ✅ 27 tests |
| **Config** | `presets/*.json` (marketing, coding, social-media) | ✅ Role definitions |

### What Exists (jimesh) ❌/⚠️
| Component | Status |
|-----------|--------|
| Agent Builder Backend | ❌ Only DSH Agent-Types/Sessions registry (`/api/agent-types`, `/api/sessions`) |
| Agent Builder Frontend | ❌ Zero matches for `AgentCreator\|AgentBuilder` |
| Dashboard Builder | ⚠️ `chain-mesh-graph.tsx` - React Flow chain/pool editor (different purpose) |
| SquadMesh Integration | ⚠️ Plugin lifecycle only (SPRINT-163) |

### What Exists (SquadMesh - feat/squadmesh-impl) ✅
| Component | Purpose |
|-----------|---------|
| `bus/` | Redis Streams message bus |
| `orchestrator/` | Agent lifecycle, subteams, scheduling |
| `workers/` | Multi-target runtime (workerd, gVisor, Cloudflare, AWS, GCP) |
| `governance/` | Permissions, mandates, structured requests |
| `integrations/` | Linear, Jira, GitHub, etc. |
| `workers/providers/workerd.go` | workerd auto-download, wrangler deploy |
| `workers/providers/workers_ai.go` | Workers AI (30+ models) |

---

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        JIMESH AGENT BUILDER ARCHITECTURE                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────────┐  │
│  │   JIMESH UI     │     │  JIMESH BACKEND │     │    SQUADMESH        │  │
│  │  (React/TS)     │◄───►│    (Go)         │◄───►│    (Go Service)     │  │
│  │                 │     │                 │     │                     │  │
│  │ ┌─────────────┐ │     │ ┌─────────────┐ │     │ ┌───────────────┐  │  │
│  │ │ Agent Builder│ │     │ │ Agent Builder│ │     │ │ Worker Manager │  │  │
│  │ │ (React Flow) │ │     │ │ API          │ │     │ │ • workerd     │  │  │
│  │ │ • TeamForm   │ │     │ │ • POST /teams│ │     │ │ • gVisor      │  │  │
│  │ │ │ RoleNode   │ │     │ │ • GET /teams │ │     │ │ • Cloudflare  │  │  │
│  │ │ │ RolePanel  │ │     │ │ • Role CRUD  │ │     │ │ • Workers AI  │  │  │
│  │ │ │ TeamsList  │ │     │ │ • Role CRUD  │ │     │ │ • AWS Lambda  │  │  │
│  │ └─────────────┘ │     │ └─────────────┘ │     │ └───────────────┘  │  │
│  │        │        │     │        │        │     │         │          │  │
│  │        └────────┼────┼────────┼────────┘     │         │          │  │
│  │                 ▼    ▼        ▼              │         ▼          │  │
│  │         ┌───────────────────────┐            │  ┌─────────────┐   │  │
│  │         │  JIMESH MESSAGE BUS   │            │  │ SQUADMESH   │   │  │
│  │         │  (Redis Streams)      │◄───────────►│  │ MESSAGE BUS │   │  │
│  │         └───────────────────────┘            │  │ (Redis)     │   │  │
│  │                                              │  └─────────────┘   │  │
│  └──────────────────────────────────────────────┴─────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Integration Plan

### Phase 1: Backend API (Week 1-2)

#### 1.1 Agent Builder API in jimesh Backend
```go
// New file: src/backend/internal/gateway/agentbuilder.go
// Routes to add in gateway.go New():
mux.HandleFunc("/api/agent-builder/teams", s.handleListTeams)
mux.HandleFunc("/api/agent-builder/teams", s.handleCreateTeam)
mux.HandleFunc("/api/agent-builder/teams/{name}", s.handleGetTeam)
mux.HandleFunc("/api/agent-builder/teams/{name}", s.handleUpdateTeam)
mux.HandleFunc("/api/agent-builder/teams/{name}", s.handleDeleteTeam)
mux.HandleFunc("/api/agent-builder/teams/{name}/activate", s.handleActivateTeam)
mux.HandleFunc("/api/agent-builder/roles", s.handleListRoles)
mux.HandleFunc("/api/agent-builder/roles", s.handleCreateRole)
mux.HandleFunc("/api/agent-builder/roles/{id}", s.handleGetRole)
mux.HandleFunc("/api/agent-builder/roles/{id}", s.handleUpdateRole)
mux.HandleFunc("/api/agent-builder/roles/{id}", s.handleDeleteRole)
mux.HandleFunc("/api/agent-builder/presets", s.handleListPresets)
mux.HandleFunc("/api/agent-builder/deploy", s.handleDeployTeam)
```

#### 1.2 Data Models (Port from meshsquad-public)
```go
// New file: src/backend/internal/agentbuilder/types.go
type TeamConfig struct {
    Name                    string   `json:"name"`
    OrchestratorInstructions string `json:"orchestrator_instructions,omitempty"`
    MaxRound                int      `json:"max_round"`
    MaxSubAgents            int      `json:"max_sub_agents"`
    Mandates                []string `json:"mandates"`
    Roles                   []RoleDefinition `json:"roles"`
}

type RoleDefinition struct {
    ID              string   `json:"id"`
    Name            string   `json:"name"`
    Watches         []string `json:"watches"`
    RequestKind     string   `json:"request_kind"`
    Instructions    string   `json:"instructions"`
    Harness         string   `json:"harness"` // "opencode", "claude", "custom"
    RequestKind     string   `json:"request_kind"`
    ResultKind      string   `json:"result_kind,omitempty"`
    Watches         []string `json:"watches"`
}
```

#### 1.3 Storage (Port from meshsquad-public/store)
```go
// New file: src/backend/internal/store/agentbuilder.go
func (s *Store) CreateTeam(team TeamConfig) error
func (s *Store) GetTeam(name string) (TeamConfig, error)
func (s *Store) ListTeams() ([]TeamConfig, error)
func (s *Store) UpdateTeam(name string, team TeamConfig) error
func (s *Store) DeleteTeam(name string) error
func (s *Store) ActivateTeam(name string) error
```

#### 1.4 Deployment Integration (SquadMesh)
```go
// In agentbuilder.go
func (s *Server) handleDeployTeam(w http.ResponseWriter, r *http.Request) {
    // 1. Get team config
    // 2. Call SquadMesh WorkerManager.CreateWorker for each role
    // 3. Register agents with SquadMesh Orchestrator
    // 4. Create chat channels in SquadMesh (via chat-space API)
    // 4. Return deployment status
}
```

---

### Phase 2: Frontend (Week 2-3)

#### 2.1 Port meshsquad-public Frontend to jimesh
| Source | Target | Notes |
|--------|--------|-------|
| `meshsquad-public/frontend/src/components/RoleNode.tsx` | `src/frontend/src/components/agentbuilder/RoleNode.tsx` | Port to jimesh UI components |
| `meshsquad-public/frontend/src/components/RolePanel.tsx` | `src/frontend/src/components/agentbuilder/RolePanel.tsx` | |
| `meshsquad-public/frontend/src/components/TeamForm.tsx` | `src/frontend/src/components/agentbuilder/TeamForm.tsx` | |
| `meshsquad-public/frontend/src/components/TeamsList.tsx` | `src/frontend/src/components/agentbuilder/TeamsList.tsx` | |
| `meshsquad-public/frontend/src/components/TeamForm.tsx` | `src/frontend/src/components/agentbuilder/TeamForm.tsx` | |
| `meshsquad-public/frontend/src/lib/types.ts` | `src/frontend/src/lib/agentbuilder/types.ts` | Port types |
| `meshsquad-public/frontend/src/lib/graph.ts` | `src/frontend/src/lib/agentbuilder/graph.ts` | Graph logic |
| `meshsquad-public/frontend/src/lib/api.ts` | `src/frontend/src/lib/agentbuilder/api.ts` | Point to jimesh API |

#### 2.2 New jimesh Routes
```tsx
// In App.tsx
<Route path="/agent-builder" element={<AgentBuilderPage />} />
<Route path="/agent-builder/teams/:name" element={<TeamDetailPage />} />
<Route path="/agent-builder/teams/new" element={<TeamCreatePage />} />
```

#### 2.3 Sidebar Integration
```tsx
// In section-nav.ts
{
  group: "agent-builder",
  labelKey: "nav.agentBuilder",
  to: "/agent-builder",
  items: [
    { labelKey: "agentBuilder.teams", to: "/agent-builder" },
    { labelKey: "agentBuilder.roles", to: "/agent-builder/roles" },
    { labelKey: "agentBuilder.presets", to: "/agent-builder/presets" },
  ]
}
```

#### 2.4 Deploy Button Integration
```tsx
// In TeamDetailPage
<Button onClick={handleDeploy} disabled={deploying}>
  {deploying ? (
    <>
      <Loader2 className="w-4 h-4 animate-spin" />
      Deploying...
    </>
  ) : (
    <>
      <Rocket className="w-4 h-4" />
      Deploy to SquadMesh
    </>
  )}
</Button>
```

---

### Phase 3: SquadMesh Integration (Week 3-4)

#### 3.1 Team Deployment Flow
```
User clicks "Deploy Team"
       │
       ▼
POST /api/agent-builder/deploy { teamName }
       │
       ▼
jimesh Backend validates team config
       │
       ▼
For each role in team:
  1. Determine WorkerTarget (Python→gVisor, JS→workerd)
  2. WorkerManager.CreateWorker(config)
  3. SquadMesh Orchestrator.RegisterAgent()
  4. Create chat channels in SquadMesh (via chat-space API)
       │
       ▼
Return deployment status with WorkerIDs
```

#### 3.2 SquadMesh Agent Registration
```go
// In SquadMesh orchestrator
func (o *Orchestrator) DeployTeam(team TeamConfig) error {
    for _, role := range team.Roles {
        worker, err := o.workerManager.CreateWorker(ctx, WorkerConfig{
            Target:       selectTarget(role.Language),
            RuntimeID:    fmt.Sprintf("agent-%s-%s", team.Name, role.ID),
            Language:     role.Harness, // "python", "javascript", etc.
            MemoryMB:     512,
            CPUSeconds:   30,
            Environment:  buildEnv(role),
        })
        if err != nil { return err }
        
        // Register with orchestrator
        agent := &AgentState{
            AgentID:      worker.GetInfo().ID,
            Capabilities: role.Capabilities,
            Integrations: role.Integrations,
        }
        o.RegisterAgent(ctx, agent)
    }
    return nil
}
```

---

### Phase 4: Permission & Tool Scoping (Week 4)

#### 4.1 Agent Bible Compliance
```go
// In permissions/agentbible.go
type AgentBibleRules struct {
    MinimalScope     bool `json:"minimal_scope"`     // Grant only tools agent uses
    NoWildcards      bool `json:"no_wildcards"`      // No * permissions
    DescriptionRequired bool `json:"desc_required"`  // Every tool has description
    TTLOnEscalation  bool `json:"ttl_escalation"`    // Auto-expire escalations
    AuditTrail       bool `json:"audit_trail"`       // Every tool call logged
    CrewInheritance  bool `json:"crew_inheritance"`  // Crew perms = union
    Revocable        bool `json:"revocable"`         // Any perm revocable
}

func ValidateAgentConfig(team TeamConfig) error {
    for _, role := range team.Roles {
        if len(role.Tools) == 0 {
            return fmt.Errorf("role %s has no tools defined", role.ID)
        }
        for _, tool := range role.Tools {
            if tool.Description == "" {
                return fmt.Errorf("tool %s missing description", tool.Name)
            }
            if tool.Permission == "*" {
                return fmt.Errorf("wildcard permission not allowed for %s", tool.Name)
            }
        }
    }
    return nil
}
```

#### 4.2 Runtime Tool Access Requests
```go
// Agent requests tool at runtime
type ToolAccessRequest struct {
    AgentID    string   `json:"agent_id"`
    ToolName   string   `json:"tool_name"`
    Reason     string   `json:"reason"`
    TTL        Duration `json:"ttl"`
}

// Supervisor approves
func (s *Supervisor) ApproveToolAccess(req ToolAccessRequest) error {
    // Validate against Agent Bible
    // Update ToolScope (versioned)
    // Notify agent
    // Set TTL expiration
}
```

---

## API Contract Summary

### jimesh Agent Builder API
```
GET    /api/agent-builder/teams              → List all teams
POST   /api/agent-builder/teams              → Create team
GET    /api/agent-builder/teams/:name        → Get team
PUT    /api/agent-builder/teams/:name        → Update team
DELETE /api/agent-builder/teams/:name        → Delete team
POST   /api/agent-builder/teams/:name/activate → Activate team
POST   /api/agent-builder/teams/:name/deploy → Deploy to SquadMesh

GET    /api/agent-builder/roles              → List all roles
POST   /api/agent-builder/roles              → Create role
GET    /api/agent-builder/roles/:id          → Get role
PUT    /api/agent-builder/roles/:id          → Update role
DELETE /api/agent-builder/roles/:id          → Delete role

GET    /api/agent-builder/presets            → List presets (marketing, coding, etc.)
```

### SquadMesh Deployment API
```
POST   /api/v1/orchestrator/deploy-team      → Deploy team to workers
GET    /api/v1/orchestrator/agents           → List deployed agents
GET    /api/v1/orchestrator/agents/:id       → Get agent status
POST   /api/v1/orchestrator/agents/:id/sleep → Sleep agent
POST   /api/v1/orchestrator/agents/:id/wake  → Wake agent
POST   /api/v1/orchestrator/agents/:id/archive → Archive agent
```

---

## Migration Steps

### Step 1: Copy meshsquad-public Frontend to jimesh
```bash
# Copy frontend components
cp -r /home/ji/projects/meshsquad-public/frontend/src/components/* \
  /home/ji/projects/jimesh/src/frontend/src/components/agentbuilder/

cp /home/ji/projects/meshsquad-public/frontend/src/lib/types.ts \
  /home/ji/projects/jimesh/src/frontend/src/lib/agentbuilder/types.ts

cp /home/ji/projects/meshsquad-public/frontend/src/lib/graph.ts \
  /home/ji/projects/jimesh/src/frontend/src/lib/agentbuilder/graph.ts

cp /home/ji/projects/meshsquad-public/frontend/src/lib/api.ts \
  /home/ji/projects/jimesh/src/frontend/src/lib/agentbuilder/api.ts
```

### Step 2: Update Imports & API Calls
```typescript
// In agentbuilder/api.ts
const API_BASE = '/api/agent-builder'

export async function fetchTeams() {
  const res = await fetch(`${API_BASE}/teams`)
  return res.json()
}

export async function deployTeam(name: string) {
  const res = await fetch(`/api/agent-builder/teams/${name}/deploy`, {
    method: 'POST'
  })
  return res.json()
}
```

### Step 3: Add Backend Routes
```go
// In gateway.go New()
mux.HandleFunc("/api/agent-builder/teams", s.handleAgentBuilderTeams)
mux.HandleFunc("/api/agent-builder/teams/", s.handleAgentBuilderTeamByName)
mux.HandleFunc("/api/agent-builder/roles", s.handleAgentBuilderRoles)
mux.HandleFunc("/api/agent-builder/presets", s.handleAgentBuilderPresets)
mux.HandleFunc("/api/agent-builder/deploy", s.handleDeployTeam)
```

---

## Testing Strategy

| Test | Target |
|------|--------|
| Unit tests for TeamConfig validation | `agentbuilder/types_test.go` |
| Unit tests for RoleDefinition | `agentbuilder/types_test.go` |
| Integration test: Create team → Deploy → Verify agents running | `agentbuilder/deploy_test.go` |
| Frontend: TeamForm validation | `TeamForm.test.tsx` |
| Frontend: RoleNode drag-drop | `RoleNode.test.tsx` |
| E2E: Create team → Deploy → Verify agents in SquadMesh | `agentbuilder_e2e_test.go` |

---

## Timeline

| Week | Focus |
|------|-------|
| 1 | Backend API (types, storage, routes) |
| 2 | Frontend port (components, types, API) |
| 3 | SquadMesh integration (deploy, lifecycle) |
| 4 | Permissions, testing, documentation |

---

## Dependencies

| Dependency | Status |
|----------|--------|
| SquadMesh WorkerManager | ✅ Ready |
| SquadMesh Orchestrator | ✅ Ready |
| SquadMesh Workers AI | ✅ Ready |
| jimesh Redis Streams | ✅ Ready |
| jimesh Plugin System | ✅ Ready (SPRINT-163) |
| meshsquad-public frontend | ✅ Ready (copy) |
| meshsquad-public backend types | ✅ Ready (port) |

---

## Success Criteria

- [ ] Create team via UI → appears in list
- [ ] Edit team roles, watches, instructions
- [ ] Click "Deploy" → agents appear in SquadMesh Orchestrator
- [ ] Agents receive messages via Redis Streams
- [ ] Agents can invoke tools (with permission scoping)
- [ ] Agent lifecycle: sleep/wake/archive works
- [ ] Audit trail shows all tool calls
- [ ] Team config persists in jimesh DB
- [ ] Frontend tests pass (27 tests from meshsquad-public)
- [ ] Backend tests pass (Go tests)

---

## Related Documents

| Document | Purpose |
|----------|---------|
| `SQUADMESH_JIMESH_INTEGRATION.md` | SquadMesh ↔ jimesh integration |
| `SQUADMESH_SPEC.md` | SquadMesh full spec |
| `SPRINTS.md` | Sprint breakdown |
| `VERIFY-2026-09-28-AGENT-BUS-CHAT-BUILDER.md` | Audit findings |
| `SQUADMESH_JIMESH_INTEGRATION.md` | Integration plan |

---

*Generated from analysis of meshsquad-public, jimesh, SquadMesh, and ST2 audit findings.*