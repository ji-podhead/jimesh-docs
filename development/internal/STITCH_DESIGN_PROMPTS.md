# Stitch Design Prompts for JiMesh

## Context
- **Project**: JiMesh - AI infrastructure orchestration dashboard
- **Tech Stack**: React 18, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, react-router-dom
- **Theme**: Dark-first, CSS variables for theming (src/theme/), 60 i18n locales
- **Component Library**: src/components/ui/* (shadcn-based: Button, Card, Input, Dialog, Badge, etc.)
- **Icons**: lucide-react
- **State**: TanStack Query for server state, local useState/useRef for UI state

---

## Already Built (Reference for Consistency)

### MeshSquad Chat Space (`/chat/space`) — MeshSquadChatSpacePage.tsx
- **Layout**: 2-column grid (lg:grid-cols-[1fr_1.6fr])
- **Left**: Space picker (Team/Main tabs) + channel list (cards with selection state)
- **Right**: Selected channel detail + "Open chat UI" deep-link button
- **States**: loading skeleton, not-installed gate, no-api-url, api-missing (404), error, empty
- **Components**: PageHeader, Card, Badge, Button, Skeleton, EmptyState, Select
- **Data**: useMeshSquadChatChannels + useMeshSquadTeams from lib/meshsquad-chat.ts

### MeshSquad Team Builder (`/chat/team-builder`) — MeshSquadTeamBuilderPage.tsx
- **Layout**: 3-column grid (lg:grid-cols-[280px_1fr_380px])
- **Left**: TeamsList (table: Name, Source, Active, Actions: Load/Activate/Delete)
- **Center**: Toggle Canvas/List → Role list (click to select, duplicate/delete buttons)
- **Right**: TeamForm (name, orchestrator_instructions, max_round, mandates) + RolePanel (full role editor)
- **Header actions**: Export/Import JSON, Refresh
- **States**: same gate pattern as chat space

### Sidebar Entries
- `MeshSquadChatEntry` + `MeshSquadTeamBuilderEntry` under AI section
- Shared gating via `useMeshSquadChatStatus()` (checks plugin install + activation)
- Grayed out when not installed, badge "Install" or "No backend"
- Opens PluginInstallWizardDialog when installable

---

## MISSING — Need Stitch Designs

### 1. Canvas View for Team Builder (React Flow)
**Route**: `/chat/team-builder` (center panel toggle)
**Current**: Placeholder "Visual canvas coming soon"
**Needed**: Full react-flow canvas for visual role graph editing

**Prompt**:
```
Design a react-flow canvas for the MeshSquad Team Builder center panel.
- Nodes: RoleNode component (already exists) — left handle = input (watches), right handle = output (result_kind)
- Edges: Drag from right handle (output) to left handle (input) = "watches" relationship
- Toolbar: Mini-map, zoom controls, fit-view, undo/redo
- Selection: Click node → highlights + opens RolePanel in right column (already wired)
- Add node: Toolbar button "Add Role" → drops new RoleNode at viewport center
- Delete: Backspace/Delete key on selected node, or context menu
- Auto-layout: Dagre layout button (hierarchical by watches edges)
- Persist: Positions saved in TeamConfig role metadata (x,y coords)
- Theme: Dark mode, node styling matches RoleNode.tsx (border-primary/60 when selected)
- Responsive: Full height of center card (h-[500px]), toolbar sticky top-right
```

### 2. Plugin Install Wizard — MeshSquad Config Step
**Component**: `PluginInstallWizardDialog` (shared, in components/plugins/)
**Current**: Generic wizard, needs meshsquad-specific config step
**Needed**: Step for `crewApiUrl` input + validation

**Prompt**:
```
Design a wizard step for MeshSquad plugin installation.
- Fields: 
  1. crewApiUrl (required) — input with helper "http://meshsquad-crew:8113 or https://your-domain.com"
  2. X-API-Key (optional) — password input, masked, for meshsquad API authentication
- Validation: crewApiUrl must be valid http(s) URL with host (client-side + server mirrors)
- Prefill: If catalog.wrapperApiBase exists, prefill crewApiUrl with it
- Help text: "The meshsquad crew API MUST send permissive CORS headers for this dashboard origin (Access-Control-Allow-Origin). See SPRINT-153 docs."
- Test button: "Test connection" → calls GET {crewApiUrl}/health, shows green/red toast with latency
- Layout: Standard wizard step (Card, form fields, primary Continue button disabled until valid)
```

### 3. Agent/Worker Runtime Dashboard
**Route**: `/workers` (new)
**Context**: S1 SquadMesh core — workers runtime (gvisor, workerd, cloudflare, aws-lambda, gcp-cloudrun)
**Needed**: Dashboard to manage/view deployed workers

**Prompt**:
```
Design a Workers Dashboard for SquadMesh hybrid runtime.
- Tabs: "Local (gVisor)", "Cloudflare Workers", "AWS Lambda", "GCP Cloud Run", "Workerd"
- Each tab: Table of deployed workers with columns:
  - Name / ID
  - Status (running/stopped/error — badge colored)
  - Runtime (badge: gvisor/workerd/cloudflare/aws-lambda/gcp-cloudrun)
  - Created
  - Actions: Logs (modal), Stop, Delete, Scale (for cloud)
- Top bar: "Deploy Worker" button → opens DeployWorkerDialog
- DeployWorkerDialog:
  - Runtime selector (radio cards with icons)
  - Name input
  - Code source: Git URL + ref OR upload zip OR inline editor (for workerd)
  - Env vars: key/value table
  - Resources: CPU/memory sliders (per runtime)
  - "Deploy" → POST to SquadMesh /workers endpoint
- Real-time: Status badges update via SSE or polling (TanStack Query refetchInterval)
- Empty state per tab: "No workers deployed on Cloudflare Workers yet"
```

### 4. SquadMesh Gateway Status Page
**Route**: `/squadmesh` (new)
**Context**: S1 — core message bus + gateway + WebSocket
**Needed**: Overview of message bus health, connected clients, throughput

**Prompt**:
```
Design a SquadMesh Gateway Status page (operator view).
- Header: "SquadMesh Gateway" + status badge (Healthy/Degraded/Down)
- Grid of 4 metric cards:
  1. Connected Clients (WebSocket count)
  2. Messages/sec (in/out)
  3. Bus Lag (ms, p50/p99)
  4. Active Channels/Topics
- WebSocket connections table:
  - Client ID, Connected Since, Subscriptions (chips), Last Message, Actions: Disconnect
- Redis Streams bus monitor:
  - Stream name, Consumer groups, Pending messages, Lag
  - "Inspect" → modal with recent messages (JSON viewer)
- Message Bus topology diagram (react-flow, read-only):
  - Nodes: gateways, workers, agents
  - Edges: subscription flows
  - Hover → tooltip with throughput
- Controls: "Restart Gateway", "Flush Bus" (danger, confirmation dialog)
- Auto-refresh: 5s interval, pause on hover
```

### 5. Agent Lifecycle Manager
**Route**: `/agents/lifecycle` (new)
**Context**: S7-9 — Agent Lifecycle (spawn, scale, hibernate, terminate)
**Needed**: Manage agent deployments across runtimes

**Prompt**:
```
Design an Agent Lifecycle Manager page.
- Two views: List (default) + Canvas (react-flow, agent dependency graph)
- List columns: Name, Team/Crew, Runtime, Status, Replicas, CPU%, Memory%, Actions
- Status badges: Spawning (spinner), Running (green), Scaling (amber), Hibernated (gray), Error (red)
- Row actions: Scale (+/- replicas), Hibernate, Wake, Terminate, View Logs
- Bulk actions: Select multiple → Scale all, Hibernate all
- Create Agent dialog:
  - Team picker (from meshsquad teams)
  - Role picker (roles within team)
  - Runtime selector
  - Replicas input
  - Resource limits
  - Env overrides
- Canvas view: Nodes = agents, edges = message flow (watches), grouped by team
- Real-time metrics via SSE from SquadMesh /agents/stream
```

### 6. Permission Scoping UI (S7-10)
**Route**: `/permissions` (new)
**Context**: Fine-grained RBAC for agents, teams, workspaces

**Prompt**:
```
Design a Permission Scoping interface.
- Three panels (resizable): Subjects | Resources | Policies
- Subjects tab: Users, Service Accounts, Agent Identities (tree, searchable)
- Resources tab: Workspaces, Projects, Teams, Channels, Vault paths, API endpoints
- Policies tab: Table — Subject | Resource | Actions (read/write/admin/invoke) | Conditions
- Policy builder (drawer):
  - Subject: select from tree (multi-select)
  - Resource: select from tree + optional path pattern (e.g., workspace:*/projects/*)
  - Actions: checkbox grid
  - Conditions: JSON editor (CEL expressions: `request.time < '22:00'`)
  - Effect: Allow / Deny
- Inheritance: Visual indicator when policy inherited from parent scope
- Audit trail: "Show who granted this" modal per policy row
- Export/Import: JSON/YAML for GitOps
```

### 7. PyTorch Lightning Training Dashboard (S7-8)
**Route**: `/lightning` (new)
**Context**: Model training jobs on SquadMesh workers

**Prompt**:
```
Design a PyTorch Lightning Training Dashboard.
- Tabs: "Runs", "Models", "Experiments" (MLflow-style)
- Runs table: Name, Experiment, Status, Epoch/Max, Train Loss, Val Loss, Duration, GPU%, Actions
- Run detail (drawer): 
  - Metrics charts (loss, lr, custom) — use recharts, real-time via SSE
  - Hyperparameters (JSON view)
  - Artifacts: checkpoints, logs, ONNX exports
  - "Compare" button → opens comparison view
- Experiments: Group runs, leaderboard by metric
- Models registry: Versioned, stage (Staging/Production/Archived), deploy button → SquadMesh worker
- New Run wizard: Experiment, config (YAML editor), compute (worker pool), "Start Training"
- Integration: Lightning Trainer callbacks push metrics to SquadMesh bus → dashboard SSE
```

### 8. Cloud Provider Worker Config (S6)
**Route**: `/workers/providers` (settings)
**Context**: AWS Lambda, GCP Cloud Run, Cloudflare credentials + defaults

**Prompt**:
```
Design Cloud Provider Worker Configuration page.
- Tabs per provider: AWS, GCP, Cloudflare, (future: Azure)
- Each tab:
  - Credentials: AWS (access key + secret OR role ARN), GCP (service account JSON), Cloudflare (API token)
  - Validation: "Test credentials" button → shows account ID / project ID
  - Defaults: Region, VPC/Network, Subnets, Security Groups, IAM roles
  - Quotas: Current usage vs limits (API calls to provider)
  - Secrets: Stored in JiMesh Vault (show masked, "Rotate" button)
- Global: "Default provider for new workers" radio
- Audit: Who changed what when (Vault audit log integration)
```

### 9. MeshSquad Chat — Message View (Deep-link Target)
**Not in JiMesh** — but needs design for meshsquad-public chat UI
**Context**: Tinode web UI for humans + agent messages via bus

**Prompt**:
```
Design the meshsquad chat message view (Tinode web client skin).
- Layout: 3-pane (Channels list | Messages | Thread/Context)
- Channels: Tree — Team > Sub-channels, Org-wide space at top
- Messages: 
  - Human messages: avatar, name, timestamp, markdown rendering
  - Agent messages: distinct styling (robot icon, "Agent: role-name" badge)
  - Tool calls: collapsible JSON blocks (input → output)
  - Reactions: emoji picker on hover
- Composer: Bottom, markdown shortcuts, @mention users/agents, /commands
- Thread panel: Right side, shows replies + agent reasoning traces
- Real-time: WebSocket to tinode, presence indicators
- Theme: Matches JiMesh dark mode (CSS variables), compact density option
- Mobile: Responsive — channels drawer, thread drawer
```

---

## Shared Design Tokens (Extract from JiMesh)

```css
/* src/theme/globals.css — use these in Stitch */
:root {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  --popover: 222.2 84% 4.9%;
  --popover-foreground: 210 40% 98%;
  --primary: 217.2 91.2% 59.8%;
  --primary-foreground: 222.2 84% 4.9%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 224.3 76.3% 94.1%;
  --radius: 0.5rem;
}
```

---

## Component Inventory (Reuse These)

| Component | Path | Use For |
|-----------|------|---------|
| Button | `src/components/ui/button.tsx` | All actions |
| Card | `src/components/ui/card.tsx` | Panels, metric cards |
| Input | `src/components/ui/input.tsx` | Forms |
| Textarea | `src/components/ui/textarea.tsx` | Multi-line |
| Select | `src/components/ui/select.tsx` | Dropdowns |
| Dialog | `src/components/ui/dialog.tsx` | Modals |
| Badge | `src/components/ui/badge.tsx` | Status chips |
| Table | `src/components/ui/table.tsx` | Data grids |
| Tabs | `src/components/ui/tabs.tsx` | Tabbed views |
| Tooltip | `src/components/ui/tooltip.tsx` | Hover hints |
| Skeleton | `src/components/ui/skeleton.tsx` | Loading states |
| EmptyState | `src/components/empty-state.tsx` | Empty views |
| PageHeader | `src/components/page-header.tsx` | Page titles + actions |
| Toast | `src/lib/toast.ts` | Notifications |

---

## Integration Notes for Stitch Outputs

1. **Export**: Stitch → React + TypeScript + Tailwind
2. **Import**: Drop components into `src/components/` or `src/views/`
3. **i18n**: Wrap all strings in `t('namespace.key')` — run `node scripts/check-i18n.mjs` after
4. **Types**: Define TypeScript interfaces matching existing API contracts
5. **Hooks**: Use existing `useMeshSquadChatStatus`, `useQuery` patterns
6. **Icons**: Only `lucide-react` — no new icon libs
7. **State**: TanStack Query for server, local state for UI

---

## Priority Order

1. **Canvas View** (Team Builder center panel) — unblocks visual editing
2. **Plugin Install Wizard Step** — unblocks meshsquad install UX
3. **Workers Dashboard** — S1 SquadMesh visibility
4. **Gateway Status** — S1 ops visibility
5. **Agent Lifecycle** — S7-9 core feature
6. **Permissions** — S7-10 security
7. **Lightning Dashboard** — S7-8 ML ops
8. **Cloud Provider Config** — S6 infra
9. **Meshsquad Chat UI** — separate repo (meshsquad-public)
