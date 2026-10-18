# Stitch Designs vs Current Implementation — Gap Analysis

## Overview
50+ Stitch designs exist in `/assets/design-assets/stitch/`. Key gaps for **Agents, Permissions, Logs, Traces**:

---

## 🔴 CRITICAL — Not Implemented At All

| Page | Route | Status |
|------|-------|--------|
| **Distributed Trace Detail** | `/traces` or `/security/traces` | ❌ Empty page — "OTel spine has zero call sites" |
| **Container Logs Tab** | `/containers/:id/logs` | ❌ No dedicated logs page (only ContainerDetail overview) |
| **Vault Access Matrix** | `/vault/access-matrix` | ❌ VaultDashboard is engine registry, not access matrix |
| **Teams Resource Bindings Matrix** | `/teams` (matrix view) | ❌ TeamsPage has basic CRUD + TeamBindingsPanel, no matrix |

---

## 🟡 PARTIAL — Major Visual/Functional Gaps

### Agent Session Detail (`/sessions/:sessionId`)
| Feature | Stitch Design | Current |
|---------|---------------|---------|
| MeshCore Console Sidebar | ✅ Full tree nav | ❌ None |
| Top Nav Bar (PromQL, Deploy, Terminal, Notif) | ✅ | ❌ |
| Agent Telemetry Chips (Runtime, Uptime, Model, Mem, Latency) | ✅ | ❌ |
| Action Buttons (Attach PTY, Export Trace, Pause, Terminate) | ✅ | ❌ |
| Conversation Stream with Thinking Pills | ✅ Expandable reasoning | ❌ Basic messages only |
| Embedded Code Blocks (syntax highlighted) | ✅ | ❌ |
| Live Tool Call Streaming (executing → done) | ✅ Animated progress | ❌ Static list |
| Right Panel: Tool Calls with Live Status Stream | ✅ | ❌ |
| Docked Input: Context Chips, Model/Permission Selectors | ✅ | ❌ |
| Spawn Subagent Button | ✅ | ❌ |
| Material Symbols + Geist/JetBrains Mono | ✅ | ❌ lucide-react |

### Tool Call Inspector (`/subagents/tool-calls`)
| Feature | Stitch Design | Current |
|---------|---------------|---------|
| Live Telemetry Badges (eBPF TC Ingress) | ✅ | ❌ |
| Filter Pills with Counts | ✅ | ✅ Basic |
| Live Executing State (animated) | ✅ | ❌ |
| Expandable Params + Live Status Stream | ✅ | ❌ Params only |
| Embedded Code Blocks | ✅ | ❌ |
| Error Containers with Explanations | ✅ | ❌ |

### Subagent Approval Queue (`/subagents/approvals`)
| Feature | Stitch Design | Current |
|---------|---------------|---------|
| Tree Nav Integration (Subagents expanded) | ✅ | ❌ |
| Live Telemetry Streaming Badge | ✅ | ❌ |
| Risk Badges + Policy Context | ✅ | ❌ |

### Security Findings (`/security/findings`)
| Feature | Stitch Design | Current |
|---------|---------------|---------|
| Severity Filter Pills (CRITICAL/HIGH/MEDIUM counts) | ✅ | ❌ |
| Scan Now (Checkov/Gosec/Trivy) | ✅ | ❌ IaC only |
| Export SARIF/JSON | ✅ | ❌ |
| Policy Engine Active Badge | ✅ | ❌ |
| Rich Finding Cards (CVE, file, rule) | ✅ | ⚠️ Basic |

### Container Logs (NEW PAGE NEEDED)
| Feature | Stitch Design | Current |
|---------|---------------|---------|
| Live Log Streaming (follow mode) | ✅ | ❌ |
| Filter Pills (All/Errors/Warnings/Info) | ✅ | ❌ |
| Context Chips (pod, eBPF sandbox) | ✅ | ❌ |
| eBPF TC Ingress Status | ✅ | ❌ |
| Expandable JSON Payloads | ✅ | ❌ |

---

## 🟢 EXISTING BUT NEEDS STITCH POLISH

| Page | Current | Needs |
|------|---------|-------|
| **TeamsPage** | Teams CRUD + Members + TeamBindingsPanel | Matrix view, CEL conditions, audit trail |
| **VaultDashboardPage** | Engine registry + namespace tabs | Access matrix, violation highlighting, CEL |
| **AgentConfigScannerPage** | Exists | Compare with Stitch `jimesh-agent-config-scanner` |

---

## 🎨 DESIGN SYSTEM GAPS

| Token | Stitch Design | Current (jimesh) |
|-------|---------------|------------------|
| **Icons** | Material Symbols Outlined | lucide-react |
| **Fonts** | Geist (UI) + JetBrains Mono (code) | Inter/System fonts |
| **Colors** | Material 3 Extended (primary #d0bcff, surface #12131d, etc.) | Custom CSS variables |
| **Border Radius** | 0.125rem (DEFAULT), 0.5rem (xl) | 0.5rem (DEFAULT) |
| **Spacing** | Custom scale (space-xs, space-sm, space-md, space-lg, space-xl) | Standard Tailwind |
| **Typography** | label-caps (JetBrains Mono, uppercase, tracking-wide) | Not used |

---

## 📋 IMPLEMENTATION PRIORITY

### Phase 1: Foundation (Design System)
1. Add Material Symbols Outlined font
2. Add Geist + JetBrains Mono fonts
3. Update Tailwind config with Stitch color tokens, spacing, border-radius
4. Create label-caps, code-sm, code-md utility classes

### Phase 2: Agent Session Detail (Highest Value)
1. Redesign `AgentSessionDetailPage.tsx` per Stitch
2. Add MeshCore Console sidebar (shared component)
3. Add TopNavBar with actions
4. Implement Conversation Stream with Thinking Pills
5. Implement Tool Calls Right Panel with Live Streaming
6. Add Docked Input with Context Chips + Spawn Subagent

### Phase 3: Tool Call Inspector
1. Add live telemetry badges
2. Add executing state animation
3. Add embedded code blocks (react-syntax-highlighter)
4. Add live status stream for executing calls
5. Add error containers with explanations

### Phase 4: Distributed Traces
1. Fix backend: add OTel call sites to internal/oteltrace
2. Add `/api/traces` route serving spans
3. Build Trace Detail page with waterfall/flamegraph

### Phase 5: Container Logs
1. Create `ContainerLogsPage.tsx` 
2. Add live streaming via SSE/WebSocket
3. Add filter pills, context chips, expandable JSON

### Phase 6: Permissions (Teams + Vault)
1. Teams Resource Matrix (3-panel like Team Builder)
2. Vault Access Matrix (subjects × resources)
3. CEL condition editor
4. Audit trail per binding

### Phase 6: Subagent Approval Queue + Security Findings Polish
1. Tree nav integration
2. Severity filter pills
3. Scan Now + Export SARIF

---

## 🔗 SHARED COMPONENTS NEEDED (from Stitch)

1. **MeshCoreConsoleSidebar** — Left nav with tree structure (used by Agent Session, Traces, Tool Call Inspector, Subagent Approval)
2. **TopNavBar** — Breadcrumb + actions (Run PromQL, Deploy, Terminal, Notifications)
3. **TelemetryChips** — Runtime, Uptime, Model, Mem, Latency
4. **ThinkingPill** — Expandable reasoning with numbered steps
5. **CodeBlock** — Syntax highlighted, copy button, file label
6. **LiveToolCallCard** — Executing/done/error with status stream
7. **FilterPills** — With counts, keyboard accessible
8. **ContextChips** — Removable, with icons
9. **DockedInput** — Textarea + permissions/model selectors + Spawn Subagent

---

## 📁 FILES TO CREATE/MODIFY

### New Components
```
src/frontend/src/components/
├── meshcore/
│   ├── MeshCoreConsoleSidebar.tsx
│   ├── TopNavBar.tsx
│   ├── TelemetryChips.tsx
│   ├── ThinkingPill.tsx
│   ├── CodeBlock.tsx
│   ├── LiveToolCallCard.tsx
│   ├── FilterPills.tsx
│   ├── ContextChips.tsx
│   └── DockedInput.tsx
├── agents/
│   ├── AgentSessionDetailV2.tsx (or replace existing)
│   ├── ToolCallInspectorV2.tsx
│   └── SubagentApprovalQueueV2.tsx
├── traces/
│   └── TraceDetailPage.tsx
├── containers/
│   └── ContainerLogsPage.tsx
├── security/
│   └── SecurityFindingsV2.tsx
├── teams/
│   └── TeamsResourceMatrix.tsx
└── vault/
    └── VaultAccessMatrix.tsx
```

### Modified Views
```
src/frontend/src/views/
├── AgentSessionDetailPage.tsx ← REPLACE
├── ToolCallInspectorPage.tsx ← REPLACE
├── TracesPage.tsx ← REPLACE (add real implementation)
├── SecurityFindingsPage.tsx ← ENHANCE
├── SubagentApprovalQueuePage.tsx ← ENHANCE
├── ContainerDetailPage.tsx ← ADD LOGS TAB
├── TeamsPage.tsx ← ADD MATRIX TAB
└── VaultDashboardPage.tsx ← ADD ACCESS MATRIX TAB
```

### Design System
```
src/frontend/
├── tailwind.config.ts ← UPDATE with Stitch tokens
├── src/styles/globals.css ← ADD Material Symbols, Geist, JetBrains Mono
└── src/lib/design-tokens.ts ← NEW: shared tokens
```

---

## 🚀 NEXT STEPS

1. **Start Phase 1** — Update design system (fonts, colors, icons)
2. **Phase 2** — Agent Session Detail (most complex, highest value)
3. **Phase 3** — Tool Call Inspector (shares components with Agent Session)
4. **Phase 4-6** — Parallelizable after foundation

**Estimated effort**: 2-3 weeks for full implementation
**Dependencies**: Backend OTel call sites for Traces; SSE endpoint for Container Logs
