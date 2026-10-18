# PROMPT-task-100-workspace-settings-inheritance-unification.md — Unified Workspace/Project Settings & Utility Network Inheritance

## Goal
Eliminate fragmented settings and port configurations across Workspaces, Projects, and Apps by implementing strict schema-driven inheritance and unified network/utility configuration.

---

## Architectural Specification & Schema Inheritance

### 1. Unified Port Allocation & Inheritance
- **App Level**: Primary location for published application and IDE/VS Code ports (`port`, `vscodePort`, `vncPort`).
- **Project Level**: Groups Apps, inherits published ports upwards into port aggregation hash tables. **Projects do NOT define independent ports.**
- **Workspace Level**: Execution environment on SSH Target; aggregates all child Project and App ports.

### 2. Network & Utility Settings Allocation
- **Project Level**: Primary parent owner for network definitions (`macvlan`/`ipvlan` + gVisor).
- **App Level**: Assigned exactly 1 parent network inherited from its Project.
- **`jimesh_services` Utility Tier**: Auto-configured background services (`SIEM`, `Keycloak`, `Router`, `PostgreSQL`, `Redis`) exposed in Workspace sidebar/grid with health and network status indicators.

---

## Deliverables & Acceptance Criteria
1. Refactored Workspace Settings UI (`WorkspaceSettingsPage.tsx`) supporting hierarchical Project and App selection.
2. Unified Vault and Project Secrets scoping driven by `useGlobalScope()`.
3. Validation via `node scripts/check-frontend-slop.mjs` and Go backend compilation.
