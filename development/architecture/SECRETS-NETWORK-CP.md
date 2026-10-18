# Architektur-Decision: Secrets, Network CP, Workspace-Isolation

**Status:** Accepted (Operator, 2026-10-12)
**Kontext:** Multi-Tenant-Hosting auf Azure, Premium-Layer jimeshIO

---

## 1. Vault — Premium-separat, NICHT auf der VM

- Vault läuft **auf der Premium-Seite** (jimeshIO), als **eigener, separater Service**
- **Nicht** Teil des VM/Core-Stacks (kein Docker-Container auf `vm-jimesh-production`)
- Bleibt **isoliert** von der Infrastruktur-VM — eigene Runtime, eigene Lebenszyklus
- Multi-Tenant: Pro Tenant eigener Vault-Mount (`secret/data/<tenant>/*`) + Policies
- Secrets-Verteilung: Users/Workspaces bekommen nur die Secrets die sie brauchen

**Konsequenz für Deploy:**
- Vault wird **nicht** via `jimeshOps/scripts/provision-cluster.sh` (der
  umbenannte legacy `provision-vm.sh`, PV-9 — Ansible-Pfad bleibt NUR
  für die Self-Hosted-VM-Variante) deployed
- Vault-Deployment läuft separat (Premium-Deploy-Pfad, eigener Pipeline/Stack)
- Die VM/Ansible braucht **keine** Vault-Rolle im Core-Playbook

## 2. Network CP (Control Plane)

- Alle User-Zugriffe laufen über die **Gateway-Schicht** (Caddy auf VM, hinter Cloudflare Tunnel)
- **Kein direkter Zugriff** auf Backend/Infra — Users landen immer auf dem CP
- CP authentifiziert via Keycloak, autorisiert via Vault-Policies
- Users sehen **nur ihr Workspace**, nie die dahinterliegende Infrastruktur

```
User → CF Tunnel → Gateway (Caddy) → Control Plane
                                        ↓
                              Keycloak (Auth) + Vault (Secrets)
                                        ↓
                              Workspace-isolierte Services
```

## 3. Workspace-Isolation für Streams

- **Event Hubs pro Workspace** — auch bei Managed-Hosting
- Jedes Workspace bekommt eigene Streams (Kafka-Topics → Event Hubs)
- Kein Shared-Stream zwischen Workspaces
- Consumer-Gruppen pro Workspace isoliert

## 4. Trennung Premium vs. Core

| Layer | Was | Wo |
|---|---|---|
| **Core (OSS)** | Gateway, Clients, Compose self-hosted | JiMesh2 |
| **Core (VM)** | Caddy, Keycloak, Docker, Event Hubs/Redis/Postgres VM-Services | jimeshOps → Azure VM |
| **Premium (separat)** | Vault, Multi-Tenant-Orchestrierung, Billing, Onboarding | jimeshIO |
| **Ops (Glue)** | Terraform-Entry, Deploy-Skripte, Env-Verwaltung | jimeshOps |

Vault ist **Premium** und bleibt **separat** — weder Core-VM noch OSS-Repo.
