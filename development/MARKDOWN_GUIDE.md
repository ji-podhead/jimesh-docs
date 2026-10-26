# Markdown & Documentation Guide

Welcome to the **JiMesh Markdown & Documentation Guide**. This document showcases the rich Markdown capabilities, GitHub Flavored Markdown (GFM) extensions, code formatting, and architectural diagrams supported across JiMesh documentation, workspace notes, and agent artifacts.

---

## 🚀 Quick Navigation & Capabilities

- [Alerts & Callouts](#s-alerts)
- [Code Syntax Highlighting](#s-code)
- [Architecture & Flowcharts](#s-diagrams)
- [Data Tables & Matrix](#s-tables)
- [Task Lists & Checklists](#s-tasks)
- [Summary & Best Practices](#s-summary)

---

## 🔔 Alerts & Callouts

JiMesh documentation natively parses GitHub-style callout alerts to emphasize critical zero-trust security postures and operational directives.

> [!NOTE]
> **Zero-Trust Boundary**: All traffic passing through the mesh is authenticated via WireGuard SPIFFE identities. Unauthenticated packets are discarded before TCP handshake completion.

> [!TIP]
> **Performance Recommendation**: For high-throughput AI inference pipelines, enable eBPF socket acceleration (`AF_XDP`) in `/etc/jimesh/daemon.conf` to bypass kernel TCP stack overhead.

> [!IMPORTANT]
> **Token Rotation Policy**: Vault-minted dynamic session tokens expire after 900 seconds. Ensure agent background daemons refresh their credentials via `POST /api/v1/vault/tokens/renew`.

> [!WARNING]
> **Quarantine Trigger**: Any agent process attempting an unauthorized `execve` syscall on `/bin/sh` or `/bin/bash` will be immediately frozen by the BPF-Jailer LSM hook.

> [!CAUTION]
> **Breaking Operational Change**: Deleting a project root workspace permanently revokes all associated WireGuard peer configs and purges the Apache Ozone S3 volume prefix.

---

## 💻 Code Syntax Highlighting

Multi-language code blocks provide line numbering, semantic token coloring, and copy-ready snippets.

### Go Backend (K-LAF Hook)

```go
package security

import (
	"context"
	"fmt"
	"net/http"
)

// InterceptAgentPrompt inspects inbound prompts using Llama Guard 3
func InterceptAgentPrompt(ctx context.Context, sessionID string, prompt string) error {
	verdict, category, err := LlamaGuardScan(ctx, prompt)
	if err != nil {
		return fmt.Errorf("guard scanner error: %w", err)
	}

	if verdict == "UNSAFE" {
		RecordSecurityEvent(ctx, SecurityEvent{
			Scanner:   "llama-guard",
			Verdict:   "block",
			Category:  category,
			SessionID: sessionID,
		})
		return &SecurityError{StatusCode: http.StatusForbidden, Reason: "prompt_injection"}
	}

	return nil
}
```

### TypeScript Client (WebRTC DataChannel)

```typescript
import { MeshPeer, type SignalPayload } from '@jimesh/client'

export async function connectSharedBrowser(sessionId: string): Promise<RTCDataChannel> {
  const peer = new MeshPeer({
    iceServers: [{ urls: 'stun:stun.jimesh.internal:3478' }],
    wireguardBinding: '100.127.129.1:51820',
  })

  peer.on('signal', async (signal: SignalPayload) => {
    await fetch(`/api/v1/workspaces/${sessionId}/browser/signal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signal),
    })
  })

  return peer.createDataChannel('input-events', { ordered: true })
}
```

### Docker Compose Profile

```yaml
version: '3.9'

services:
  opencode-runner:
    image: ghcr.io/jimesh/runner-sandbox:v1.4.3
    runtime: runsc
    security_opt:
      - seccomp=/etc/jimesh/seccomp-agent.json
      - apparmor=jimesh-jailer
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    environment:
      - JIMESH_MESH_IP=100.127.129.42
      - JIMESH_ZERO_TRUST_MODE=strict
    networks:
      - private-mesh
```

---

## 📊 Data Tables & Matrix

Markdown tables provide structured policy matrices, RBAC role scopes, and component states.

| Capability Domain | Minimum Grant | Target Namespace | Enforced By | Audit Status |
| :--- | :---: | :--- | :---: | :---: |
| `vault:secrets:read` | `collaborator` | `prj-gvisor-vault-agent` | OPA / Rego | **Verified Active** |
| `files:ozone:upload` | `collaborator` | `s3://workspaces/ws-01/` | S3 Gateway | **Sealed AES-256** |
| `network:wireguard:route` | `operator` | `100.127.129.0/24` | Headscale Control | **Strict ACL** |
| `admin:users:provision` | `admin` | `realm:jimesh-core` | Keycloak OIDC | **Hardware MFA** |
| `kernel:ebpf:attach` | `cluster-admin` | `host:cgroup2/jimesh` | BPF-Jailer LSM | **Signed Driver** |

---

## 📋 Task Lists & Verification Checklists

Interactive check items trace deployment milestones and security gates.

- [x] Initialized WireGuard Mesh Router on `edge-router-01`
- [x] Provisioned Keycloak 24 OIDC Realm with WebAuthn Passkey enforcement
- [x] Configured Apache Ozone S3 Gateway with AES-256-GCM ciphertext at rest
- [x] Attached eBPF-Jailer LSM hook on Docker socket proxy
- [ ] Deploy multi-region Azure Managed Grafana bridge
- [ ] Rotate root CA certificates for mutual TLS SPIFFE identities

---

## 📐 Architecture & Routing Diagrams

```
+-------------------------------------------------------------------------+
|                           JI-MESH ZERO TRUST GATEWAY                    |
+-------------------------------------------------------------------------+
       |                                              |
       v                                              v
 [Prompt Hook]                                [Network Ingress]
       |                                              |
       |--> Llama Guard 3 (NVIDIA NIM)                |--> Suricata 7.0.3 IDS
       |    - Scan: Prompt Injection                  |    - 38,412 Signatures
       |    - Verdict: 403 Forbidden                  |    - Wire eBPF Mirror
       v                                              v
 [eBPF Jailer LSM]                            [WireGuard Mesh]
       |                                              |
       +--------------------+-------------------------+
                            |
                            v
               [Wazuh SIEM Unified Timeline]
```

---

## 🔒 Summary & Best Practices

1. **Keep documentation proximate**: Store Markdown files alongside code in `docs/` or within project root directories.
2. **Never commit raw credentials**: Use placeholder variables like `${VAULT_TOKEN}` or `ghp_!… [MASKED]`.
3. **Use GFM alerts intentionally**: Reserve `[!WARNING]` and `[!CAUTION]` for destructive or security-critical actions.
