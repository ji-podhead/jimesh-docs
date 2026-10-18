# Next Session Prompts — Complete SquadMesh Integration + Stitch Designs

## Context
All code is in branches on origin. Need to:
1. Build SquadMesh Go binary
2. Wire Team Builder → SquadMesh Go → meshsquad-public
3. Implement Stitch designs for agent pages
4. Create PRs

---

## Prompt 1: Build & Deploy SquadMesh Go

```bash
# On machine with Go 1.23 (or use Docker):
cd /home/ji/projects/jimesh/squadmesh
make tidy && make build && make docker-build

# Deploy to target node:
scp bin/squadmesh root@<target-ip>:/usr/local/bin/
ssh root@<target-ip> "systemctl enable --now squadmesh"
```

**Verify:**
```bash
curl http://<target-ip>:8080/health
curl http://<target-ip>:8115/ws
curl http://<target-ip>:8080/chat/channels
```

---

## Prompt 2: Wire Team Builder → SquadMesh Go

**Files to modify:**

1. `src/frontend/src/lib/meshsquad-chat.ts` — Point chat space to SquadMesh Go
2. `src/frontend/src/lib/meshsquad/api.ts` — Point Team Builder to SquadMesh Go  
3. Add SquadMesh Go chat endpoints in `squadmesh/gateway/gateway.go`

**SquadMesh Go needs these endpoints (add to gateway.go):**
```go
// GET /chat/channels — meshSquadChatSpacePage expects this
// POST /chat/channels — create sub-channel
// GET /teams — Team Builder expects this  
// POST /teams — create team
// POST /teams/{name}/activate — activate team
// DELETE /teams/{name} — delete team
```

**Update frontend clients:**
```typescript
// lib/meshsquad-chat.ts line ~200
const DEFAULT_BASE_URL = "http://<squadmesh-ip>:8080"  // SquadMesh Go HTTP port

// lib/meshsquad/api.ts line ~30  
const DEFAULT_BASE_URL = "http://<squadmesh-ip>:8080"
```

**Add CORS to SquadMesh Go** (gateway.go):
```go
router.Use(cors.New(cors.Config{
    AllowOrigins: []string{"https://dashboard.jimesh.internal"},
    AllowMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
    AllowHeaders: []string{"Origin", "Content-Type", "X-API-Key"},
    AllowCredentials: true,
}))
```

---

## Prompt 3: Implement Stitch Designs — Agent Pages

### Priority Order (implement one at a time, verify each):

#### 1. AgentSessionDetailPage.tsx (`/sessions/:sessionId`)
**Stitch ref:** `jimesh-agent-session-detail-sess-a8f2c.html`

**Required components:**
- MeshCoreConsoleSidebar (left nav tree)
- TopNavBar (breadcrumb + PromQL/Deploy/Terminal/Notif)
- TelemetryChips (Runtime, Uptime, Model, Mem, Latency)
- ActionButtons (Attach PTY, Export Trace, Pause, Terminate)
- ConversationStream with ThinkingPill (expandable reasoning)
- CodeBlock (syntax highlighted, copy button)
- ToolCallsPanel (right panel, live streaming)
- DockedInput (context chips, model/permission selectors, Spawn Subagent)

**New components to create:**
```
src/frontend/src/components/meshcore/
├── MeshCoreConsoleSidebar.tsx
├── TopNavBar.tsx
├── TelemetryChips.tsx
├── ThinkingPill.tsx
├── CodeBlock.tsx
├── LiveToolCallCard.tsx
├── FilterPills.tsx
├── ContextChips.tsx
└── DockedInput.tsx
```

**Replace:** `src/frontend/src/views/AgentSessionDetailPage.tsx`

---

#### 2. ToolCallInspectorPage.tsx (`/subagents/tool-calls`)
**Stitch ref:** `jimesh-tool-call-inspector.html`

**Add to existing page:**
- Live telemetry badges (eBPF TC Ingress: Active)
- Executing state animation (amber pulse)
- Live status stream for executing calls
- Embedded CodeBlock for params/results
- Error containers with explanations
- FilterPills with counts

---

#### 3. TracesPage.tsx (`/traces` or `/security/traces`)
**Stitch ref:** `jimesh-distributed-trace-detail-dsh-agent-session.html`

**Backend prerequisite:** Add OTel call sites to `internal/oteltrace/oteltrace.go`
```go
// In internal/oteltrace/oteltrace.go - add actual StartSpan/EndSpan calls
// Add HTTP route: GET /api/traces, GET /api/traces/:traceId
```

**Frontend:**
- Trace waterfall/flamegraph (use recharts or d3)
- Span detail panel
- Service map
- Export OTLP JSON

---

#### 4. SecurityFindingsPage.tsx (`/security/findings`)
**Stitch ref:** `jimesh-security-findings-refined.html`

**Add:**
- Severity filter pills (CRITICAL/HIGH/MEDIUM counts)
- "Scan Now" button (Checkov/Gosec/Trivy)
- Export SARIF/JSON
- Policy Engine Active badge
- Rich finding cards

---

#### 5. SubagentApprovalQueuePage.tsx (`/subagents/approvals`)
**Stitch ref:** `jimesh-subagent-approval-queue.html`

**Add:**
- Tree nav integration (Subagents expanded)
- Live telemetry streaming badge
- Risk badges + policy context

---

#### 6. ContainerLogsPage.tsx (`/containers/:id/logs`) — NEW PAGE
**Stitch ref:** `jimesh-container-logs-tab.html`

**Create new view:**
- Live log streaming (SSE from backend)
- Filter pills (All/Errors/Warnings/Info)
- Context chips (pod, eBPF sandbox)
- Expandable JSON payloads
- eBPF TC Ingress status

---

#### 7. TeamsResourceMatrix.tsx (`/teams` matrix tab) — NEW TAB
**Stitch ref:** `jimesh-teams-resource-bindings.html`

**3-panel layout (like Team Builder):**
- Left: Teams list
- Center: Subject tree (users, service accounts, agents)
- Right: Resource tree (workspaces, projects, vault paths) + CEL editor

---

#### 8. VaultAccessMatrix.tsx (`/vault/access-matrix`) — NEW TAB
**Stitch ref:** `jimesh-vault-access-matrix.html`

**3-panel:**
- Subjects | Resources | Policies
- CEL condition editor
- Violation highlighting (pulse animation)
- Audit trail per binding

---

## Prompt 4: Create PRs (Manual — GitHub API failing)

Open these URLs in browser:
1. https://github.com/ji-podhead/JiMesh2/pull/new/feat/s186-wp3-workspace-file-editor
2. https://github.com/ji-podhead/JiMesh2/pull/new/feat/squadmesh-impl
3. https://github.com/ji-podhead/JiMesh2/pull/new/feat/squadmesh-docs

**PR titles:**
- `feat(s186): Workspace File Editor + MeshSquad Team Builder + Stitch Design System`
- `feat(squadmesh): Go microservice — message bus, gateway, workers, IAC`
- `docs(squadmesh): Architecture SPEC, SPRINTS, AUDIT_FINDINGS`

---

## Prompt 5: Verify Full Integration

```bash
# 1. Deploy meshsquad-public (port 8113)
./deploy-ssh.sh root@<ip> https://dashboard.jimesh.internal

# 2. Deploy SquadMesh Go (ports 8080, 8115)
./deploy-squadmesh-ssh.sh root@<ip>

# 3. Install meshsquad plugin in jimesh with:
crewApiUrl: "http://<meshsquad-ip>:8113"
# AND squadmeshApiUrl: "http://<squadmesh-ip>:8080"

# 4. Test Team Builder:
# - Create team → saves to meshsquad-public
# - Activate team → meshsquad runtime deploys agents
# - Agents connect to SquadMesh Go message bus (Redis Streams)
# - Chat Space shows sub-channels via SquadMesh Go /chat/channels

# 5. Test Agent Session Detail:
# - Start agent via SquadMesh
# - View session at /sessions/:id → full Stitch UI
# - Tool calls stream live in right panel
```

---

## File Checklist for Next Session

- [ ] `squadmesh/gateway/gateway.go` — add chat + team endpoints
- [ ] `src/frontend/src/lib/meshsquad-chat.ts` — point to SquadMesh Go
- [ ] `src/frontend/src/lib/meshsquad/api.ts` — point to SquadMesh Go
- [ ] `src/frontend/src/components/meshcore/*.tsx` — 9 new components
- [ ] `src/frontend/src/views/AgentSessionDetailPage.tsx` — full rewrite
- [ ] `src/frontend/src/views/ToolCallInspectorPage.tsx` — enhance
- [ ] `src/frontend/src/views/TracesPage.tsx` — implement
- [ ] `src/frontend/src/views/SecurityFindingsPage.tsx` — enhance
- [ ] `src/frontend/src/views/SubagentApprovalQueuePage.tsx` — enhance
- [ ] `src/frontend/src/views/ContainerLogsPage.tsx` — new
- [ ] `src/frontend/src/views/TeamsPage.tsx` — add matrix tab
- [ ] `src/frontend/src/views/VaultDashboardPage.tsx` — add access matrix tab
- [ ] `src/frontend/src/index.css` — Stitch tokens (already done)
- [ ] PR creation (3 manual)

---

## Run Commands for Next Session

```bash
# Frontend verify
cd /home/ji/projects/jimesh/src/frontend
npm run lint && npm test && npm run check:i18n

# Backend verify (on Go machine)
cd /home/ji/projects/jimesh/squadmesh
make tidy && make build && make test

# Full stack test
curl http://localhost:8080/health && curl http://localhost:8113/health
```
