# Sprint-D: Onboarding, Utility-Apps, Docker-Networks, App-Discovery

**Quelle:** Operator 15.9. („Onboarding-Flow + Firewall-Deployment + Utility-Apps + jimesh_services + Scanopy Docker-Networks + App-Discovery mit React-Icons")
**Ziel:** Onboarding-Flow, Firewall-Deployment-Entscheidung, Utility-Apps-Architektur, App-Discovery-Integration, React-Icons
**Referenz:** Sprint E1-E5 (Entscheidungsvorlage), R40 (Misalignment-Audit), R41 (Feedback-Blitz), TASK-077 (Scanopy → Router), TASK-078 (Headscale Networks)

---

## Sprint-D1: Onboarding-Flow (First Start) — Welcome → Node → Firewall → Deploy

### Die 4 Schritte

**Step 1 — Welcome-Screen (First Start)**
- "Willkommen bei JiMesh" — Kurzübersicht (3-Punkte-Setup)
- CTA: "Start Worker-Node-Setup" → Step 2

**Step 2 — Worker-Node-Registrierung**
- SSH-Target-Formular: host, user, auth (password/key), gVisor-Install (Checkbox)
- gVisor-Install: `runsc` auf der Node installieren (Node-Eigenschaft, R40-M1)
- ssh_endpoints-Tabelle + `ssh_endpoints`-Store (bestehend, TASK-053)
- Verifikation: `ssh -o ConnectTimeout=5` + `runsc` check
- CTA: "Firewall-Setup" → Step 3

**Step 3 — Firewall-Deployment (Entscheidung)**
- Operator entscheidet: **4 FirewallProvider-Optionen** (FirewallProvider-Interface, Sprint 20 WP6 / TASK-050):

| Provider | Status | Architektur | Referenz |
|---|---|---|---|
| **NftablesProvider** | ✅ implementiert + live (TASK-050-WP1, Router-Node) | Kernel-Level (nft), Router-Node = Security-Node | firewall_provider.go |
| **OPNsense/pfSense** | ⬜ interface-ready, Provider fehlt | Open-Source-Firewall-Appliance, per API: VLANs, DHCP, Unbound split-horizon, WireGuard | browningluke/opnsense + ji-podhead/opnsense-helper (Operator-eigenes) |
| **Cloud Security Groups** | ⬜ geplant (Sprint-33, O1-O5) | AWS-SG / Hetzner-Firewall + host-nftables (dual-layer) | Sprint-33 |
| **BYOF** | ⬜ geplant (E-Firewall-Mandat) | User bringt eigene Firewall mit (BYOF-Pattern) | firewall.go:26-29 BYOF-stub |
| **UFW** | ⬜ einfach (Ubuntu-Level, kein Router-Level) | ufw default deny + allow | — |

- Die FirewallProvider-Architektur (Detect/Apply/Status) ist implementiert und interface-ready —
  eine neue Provider-Implementierung braucht nur das Interface konsumieren, KEINE Architektur-Änderung
- OPNsense-Referenz: `browningluke/opnsense` Terraform-Provider + `ji-podhead/opnsense-helper` (Python API)
  — der Operator hat bereits eine OPNsense-Appliance + eigene Infra (TASK-002: "Arbeitsreferenz")
- Die Decision wird gespeichert (Settings-Schema, nicht hartcodiert)
- Die Deploy-Commands werden aus dem Settings-Schema generiert
- CTA: "Erste App deployen" → Step 4

**Step 4 — Erste App deployen**
- Onboarding-Formular: Project-Name, Framework (dsh/python/go/node), App-Port, gVisor (Checkbox, Node-gesteuert)
- Trigger: `POST /api/projects` + `POST /api/projects/{id}/deploy` (bestehende Deploy-Pipeline)
- Verifikation: Container läuft, Port lauscht auf 127.0.0.1:<port>, Tunnel/Proxy erreichbar
- CTA: "Dashboard öffnen" → Dashboard mit dem Edge-Node live

### Acceptance
- [ ] 4 Steps sind klickbar (onboarding flow)
- [ ] Worker-Node-Registrierung: SSH-Target-Formular, gVisor-Install, ssh_endpoints-Verbindung live
- [ ] Firewall: UFW/iptables/nftables auswählbar, Commands werden aus dem Settings-Schema generiert
- [ ] Erste App: Deploy-Formular → bestehende Deploy-Pipeline → Container läuft
- [ ] Der Workflow ist klickbar ohne manuelle SSH/Docker-Befehle

### Constraints
- SSH-Credentials nur im Request-Body + Vault (Mandat 9)
- gVisor-Install: Node-Eigenschaft (R40-M1, NICHT Workspace-Property)
- Firewall: KEINE Direct-Bind auf 0.0.0.0 (Mandat 12)
- Deploy-Pipeline: bestehende Router-Firewall (TASK-050) + Socket-Guard (TASK-019) nutzen

---

## Sprint-D2: Utility-Apps + jimesh_services-Overlay

### Die Idee

JiMesh-eigene Utility-Apps (SIEM-Dashboard, Wazuh-Dashboard, Router-Config, Exposure) laufen als **jimesh_services**-Overlay — sichtbar in einer separaten Sektion, ausblendbar per Toggle (der User sieht normal nur seine eigenen Apps, die JiMesh-eigenen Utility-Apps werden ausgeblendet).

### Architektur

```
Sprint-D2 Sidebar (HIERARCHIE aus Sprint-D1):
├─ SSH TARGETS
│   ├─ user@host-1 ▼
│   │   ├─ Project-A ▼
│   │   │   ├─ App-1 (User-App)
│   │   │   └─ App-2
│   │   ├─ Project-B ▼
│   │   └─ Project-C ▼
│   └─ jimesh_services ▼ (Utility-Apps, ausblendbar per Toggle)
│       ├─ SIEM-Dashboard (Wazuh)
│       ├─ Router-Config
│       ├─ Exposure-Matrix
│       └─ Falco-Live
```

### Implementation

1. **jimesh_services-Ordner:**
   - Ein Special-Workspace (oder Virtual-Workspace) mit einer `jimesh_services`-Tag
   - Utility-Apps (SIEM, Router-Config, Exposure) werden dort deployed, NICHT im User-Workspace
   - Die Sidebar rendert sie in einer SEPARATEN Section mit dem Label "jimesh_services" + Toggle (ausblendbar)
2. **Toggle:**
   - localStorage-Flag: `jimesh_services.hidden` (UI-Präferenz, Mandat 3 — NOCH ok weil UI-Präferenz)
   - Ausgeblendet: jimesh_services-Collapse (nur Icon), User sieht nur seine Apps
   - Eingeblendet: jimesh_services-Expand, User sieht SIEM + Router-Config + Exposure
3. **Discovery-Integration:** App-Discovery finds utility apps (Wazuh :5601, Router :3100) → sortiert sie automatisch unter `jimesh_services` (nicht unter User-Projects)

### Acceptance
- [ ] Utility-Apps laufen unter jimesh_services (nicht User-Workspace)
- [ ] Toggle ausblendbar (nur Icon in der Sidebar)
- [ ] Discovery sortiert Utility-Apps automatisch in jimesh_services
- [ ] User sieht normal nur seine Apps; jimesh_services ist optional sichtbar

---

## Sprint-D3: Docker-Networks (Scanopy-Integration) + App-Discovery

### Die Idee

Docker-Networks (macvlan/ipvlan aus TASK-080) + Scanopy als Docker-Network-Discovery — der Scanopy-Port deckt ab: Welche Docker-Netzwerke existieren, welche Container sind in welchen Netzwerken, die Topologie wird als Graph dargestellt (TASK-078 Atlas-Pattern).

### Implementation

1. **Docker-Network-Discovery:**
   - Scanopy-Muster (AGPL-3, reference-only): Docker-Network-Layer-Discovery (docker network ls, docker container inspect), MAC/Port-Discovery
   - Die Discovery findet Docker-Networks + Container → sortiert in der HIERARCHIE (Target → Project → App)
2. **React-Icons für App-Discovery:**
   - App-Icons aus dem app-type: website → 🌐, database → 🗄, service → ⚙, terminal → 💻, IDE → 🧩
   - Devicons/react-icons: Mapping-Tabelle (type → Icon-Component)
   - Discovered Apps: auto-icon aus dem app-type
3. **Graph-View:** TASK-078 MeshTopology als Basis — erweitert um Docker-Network-Kanten (welcher Container in welchem Netz, macvlan/ipvlan-Topologie)
4. **Compose-File-Integration:** "das wäre nice auch welches compose/docker file" — Scanopy liest Docker-Compose-Files, findet Services, Ports, Networks → app-discovery schlägt sie in der HIERARCHIE vor

### Acceptance
- [ ] Docker-Networks werden discovered (macvlan/ipvlan, MAC/Port)
- [ ] Container-Topologie als Graph (React-Flow, TASK-078-Basis)
- [ ] App-Icons aus dem app-type (dynamisch, kein hartcodiertes Icon)
- [ ] Compose-File-Discovery: findet Services/Ports/Networks aus compose/docker files
- [ ] Discovery-Apps werden in der HIERARCHIE einsortiert (Target → Project → App)

---

## SPRINT-D-Reihenfolge

```
Sprint-D1 (Onboarding) → Sprint-D2 (jimesh_services) → Sprint-D3 (Docker-Networks + Discovery)
  ↓                          ↓                            ↓
  Onboarding-Flow         Utility-Apps              Discovery-Integration
  Welcome→Node→Firewall    jimesh_services-Overlay     React-Icons + Graph
  →Deploy                  Auto-Sortierung             Compose-File-Discovery
```

## Referenzen

- Sprint-22: Dashboard-IA + Admin-RBAC (E-IA-Struktur)
- TASK-050: Router-Firewall (TASK-050-WP1, live verifiziert)
- TASK-053: Frontend-IA (Workspace vs SSH-Endpoint getrennt)
- TASK-074: MiniSidebar → SectionRail (rechts Overlay, icons-only, Hover-Expansion)
- TASK-078: Headscale-Networks + Atlas-Graph (React-Flow Basis)
- TASK-080: VLAN-Isolation (macvlan/ipvlan + gVisor gemessen)
- R39: Frontend-Slop-Audit (localStorage-Verstoß, Fake-Logs, 404-Routen)
- R41: Prioritäten (A IA, C4 Security-Frontend, C2 Multi-User, C5 Feedback-Loop, C6 OAuth)
