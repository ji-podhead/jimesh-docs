# PROMPT-task-087-domain-schema-hierarchy.md — 4-Tier Domain Hierarchy & Schema Standardization

## Goal
Implement the strict 4-Tier Domain Hierarchy (**SSH Target -> Workspace -> Project -> App**) across the JiMesh backend stores, gateway APIs, and React frontend navigation/views per **MANDATE 13**.

---

## Technical Specifications & Architecture

### 1. 4-Tier Model Definition
- **Level 0 (SSH Target)**: SSH host endpoint (`user@host:port`), gVisor runtime status.
- **Level 1 (Workspace)**: Server environment workspace hosting projects on a given SSH target.
- **Level 2 (Project)**: Grouping of apps (`prj-default`). **Projects carry NO independent published ports.**
- **Level 3 (App)**: Deployed container/instance. **Apps ALWAYS carry published ports, paths, and type classification.**

### 2. `no_parent` Fallback & Port Hash Lookup
- Apps without a parent project assigned default to `projectId: "no_parent"`.
- Projects without a parent workspace default to `workspaceId: "no_parent"`.
- Nodes labeled `no_parent` are conditionally rendered in navigation/sidebar **ONLY when unassigned discovered apps or ports exist**.
- Port allocations aggregate upwards from App level to Project/Workspace/Node via `PortAggregationLookup` hash tables initialized at startup/update.

### 3. App Discovery & Icon Mapping
- Integration with Docker container event discovery (`/api/discovery`).
- Automatic icon rendering via devicons / Lucide React (`AppType`: website -> 🌐/Globe, database -> 🗄️/Database, service -> ⚙️/Cog, tool -> 🛠️/Wrench).

---

## Tasks & Deliverables

1. **Backend Integration**:
   - Update `internal/store/store.go` and schema migrations to support `workspaces` and `projects` tables linked to `ssh_targets`.
   - Implement `GET /api/hierarchy` endpoint returning the full 4-tier tree with aggregated port lookup maps.

2. **Frontend UI & Sidebar Refactoring**:
   - Refactor `ScopeSelector` and `SectionRail` / navigation components to render the 4-level tree: `SSH Target > Workspace > Project > App`.
   - Support drag-and-drop / selector assignment for unassigned `no_parent` items.

3. **Validation & Slop Gate**:
   - Ensure `scripts/check-frontend-slop.mjs` and `go test ./...` pass cleanly.
