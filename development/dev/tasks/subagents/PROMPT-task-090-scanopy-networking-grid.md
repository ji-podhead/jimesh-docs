# PROMPT-task-090-scanopy-networking-grid.md — Scanopy & OPNsense Network Topology Grid

## Goal
Implement editable Network/VLAN Topology Grid UI for Workspaces and SSH Targets, backed by standardized Go and TypeScript domain schemas (`VLANNetwork`, `NetworkMetadata`, `NetworkInterfaceCard`).

---

## Reference Repositories & Python Schemas (Operator Reference)
The operator's OPNsense automation and OVS bridge collections serve as design and schema references:
- **`https://github.com/scanopy/scanopy`**: Scanopy network topology visualizer (Reference-only clean-room inspiration for UI layout and device classification; no direct code copying due to AGPL licensing).
- **`ji-podhead/opnsense-helper`**: OPNsense Python helper API client.
- **`ji-podhead/opnsense-api-client`**: Python API wrapper for OPNsense REST API endpoints.
- **`ji-podhead/opnsense-scripts-autodocs`**: Automated documentation generator for OPNsense API endpoints.
- **`ji-podhead/ovs-bridge-collection`**: Ansible collection for Open vSwitch and VLAN provisioning.

---

## Technical Specifications & Architecture

### 1. Domain Schemas
- **Go**: `src/backend/internal/domain/schema/networking.go`
  - `VLANNetwork`: ID, VLANID (1-4094), Name, SubnetCIDR, GatewayIP, Driver (`macvlan`|`ipvlan`|`bridge`), ProjectID, WorkspaceID, Metadata, NICs.
  - `NetworkMetadata`: Color (Hex), Description, Category (`isolated`|`shared`|`dmz`|`management`).
  - `NetworkInterfaceCard`: ID, Name, MACAddress, IPAddresses, IsVirtual.
- **TypeScript**: `src/frontend/src/types/domain/networking.ts`
  - Mirrors Go schema verbatim for frontend React components.

### 2. UI Components
- **`NetworkEditingGrid.tsx`**:
  - React Grid component for Workspaces and SSH Targets.
  - Visual color indicators, CIDRs, Gateways, Driver badges.
  - Redeploy trigger callback for project containers when network settings change.

---

## Deliverables & Acceptance Criteria
1. Schema files in Go backend and TypeScript frontend compiled cleanly.
2. `NetworkEditingGrid` component rendering topology grid with editable metadata.
3. CI slop checks (`node scripts/check-frontend-slop.mjs`) passing cleanly.
