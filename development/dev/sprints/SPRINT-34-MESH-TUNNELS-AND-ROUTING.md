# SPRINT 34: Inter-Host Service Mesh & Overlay Tunnels (Layer-0 Routing)

## 🎯 Goal
Eliminate direct host port exposure for deployed workspaces (e.g., DSH, GoTTY, Code-Server) on remote nodes. Implement a strict "Tunnel-First" architecture where deployments are interconnected across multiple remote hosts via secure, latency-aware utility proxy containers (Service Mesh / VPN Tunnels) managed over SSH. Direct host port exposure will be hidden behind a stern UI warning.

## 📌 Epics & Requirements

### 1. Default-Deny Port Binding (Zero-Trust Deployments)
* **Behavior Change:** By default, when a user deploys a framework on a remote host, the `docker-compose` or `docker run` command MUST NOT publish any `-p` ports to the host's `0.0.0.0` or `127.0.0.1`.
* **Isolated Networks:** The workspace must be completely isolated within its `jimesh_jimesh-net` (or gVisor sandbox).
* **UI Warning for Host Access:** If the user explicitly checks an "Expose Ports to Public Host IP" or "Host Network Access" option in the UI, a red warning icon/modal must be displayed (e.g., "Warning: Bypasses JiMesh Tunnels and exposes the service to the host network").

### 2. Utility Proxy Containers (The "Mesh Agents")
* JiMesh will automatically provision a lightweight "Tunnel Utility Container" (e.g., based on Envoy, WireGuard, Nebula, or eBPF/Cilium) on each target remote host.
* These utility containers will join a unified, encrypted overlay network ("Layer-0 / Layer-3 Mesh").
* **Cross-Host Routing:** If DSH on Host A wants to talk to a database on Host B, the traffic flows: `DSH (Host A) -> Utility Proxy (Host A) -> Encrypted Tunnel -> Utility Proxy (Host B) -> Database (Host B)`.

### 3. Latency-Aware Dynamic Routing
* The utility proxy mesh must employ dynamic routing to find the fastest path between nodes.
* **Protocol Evaluation:**
  * Evaluate **WireGuard / Tailscale (DERP)** for mesh connectivity.
  * Evaluate **B.A.T.M.A.N. (Better Approach To Mobile Adhoc Networking)** or **OSPF/BGP** inside the overlay for pure latency/link-quality routing.
  * Evaluate **Envoy/Cilium (eBPF)** for Layer-7 latency-aware load balancing and mTLS.

### 4. Operator Access (SSH Reverse Proxy Integration)
* For the operator to view the UI (e.g., the DSH iframe) locally on their laptop, JiMesh will utilize the existing Go-native SSH Reverse Proxy Tunnel (or a direct WireGuard connection to the mesh).
* The browser iframe will route through `http://localhost:19091/api/projects/{id}/tunnel/{port}/`, which funnels through the operator's SSH connection directly into the specific remote container, bypassing the remote host's firewall entirely.

## 🛠 Implementation Plan
1. **[UI]** Add "Network Mesh Routing" toggles to the Project Deployment settings.
2. **[Backend]** Update `projects_ssh.go` to omit `-p` flags unless explicitly requested.
3. **[Backend]** Implement the automated lifecycle deployment of the `jimesh-mesh-proxy` utility container on remote nodes during `/api/nodes/provision`.
4. **[Networking]** Define the overlay protocol (e.g., a shared WireGuard interface inside the utility containers) and establish the latency-ping health checks.
