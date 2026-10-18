# TASK-098 — Networking-Tab Vollausbau: VLAN-Schema (Farben/Beschreibungen/IPs), React-Grid, Scanopy-Audit, App-Icons als Component

**Quelle:** Operator 16.9. — „Networking-Tab und dem Scanopy copy/salvage und den App-Icons — auch als Component für Workspaces bzw SSH-Targets. In der Componente die Networks anzeigt und editierbar macht (falls Redeploy benötigt dann auch anbieten) und eine React-Grid-Darstellung zu den Children. Farben als Metadaten für VLANs und Beschreibungen, Names, IPs — alles drum und dran. Networks, VLANs und NIC brauchen ordentliche Schemas und Klassen und Vererbungen — am besten nach einem offenen Standard oder ein Go-Package benutzen. Bitte die Scanopy-Repo auditen für ähnliche Styles."

---

## WP1 — VLAN-Schema erweitern (Farben, Beschreibungen, IPs, Names)

**Aktuell (VLANSpec in vlan.go):** nur projectId, vlanId, driver, parentIface, subnet, gateway — keine Farben, keine Beschreibungen, keine Namen.

**Erweitertes Schema (nach offenen Standards):**

```go
// internal/network/vlan_schema.go (erweitert VLANSpec)
type VLANMetadata struct {
    Name        string `json:"name"`        // der lesbare Name, z.B. "Kunden-Produktions-VLAN"
    Description string `json:"description"` // was läuft in diesem VLAN
    Color       string `json:"color"`       // hex, z.B. "#22d3ee" — für die Grid-Darstellung
    Tags        []string `json:"tags"`      // z.B. ["production", "customer-a"]
    Labels      map[string]string `json:"labels"` // freie Metadaten (Kubernetes-Label-Stil)
}

type VLANSpec struct {
    ProjectID   string `json:"projectId"`
    VlanID      int    `json:"vlanId"`
    Driver      string `json:"driver"`      // macvlan | ipvlan
    ParentIface string `json:"parentIface"` // z.B. eth0
    Subnet      string `json:"subnet"`      // z.B. 172.16.100.0/24
    Gateway     string `json:"gateway"`     // z.B. 172.16.100.1
    Metadata    VLANMetadata `json:"metadata"` // NEU
}

// NIC-Schema (die physische Karte):
type NICInfo struct {
    Name       string `json:"name"`       // eth0, enp3s0
    Type       string `json:"type"`       // physical | virtual | bridge
    MACAddress  string `json:"macAddress"`
    MTU        int    `json:"mtu"`
    Speed      string `json:"speed"`      // z.B. "1Gbps"
    Status     string `json:"status"`     // up | down
    VLANs      []VLANSpec `json:"vlans"`  // alle VLANs auf dieser NIC
}
```

**Offener Standard für das Schema:** Kubernetes NetworkPolicy + CNI-Spec als Vorbild — Labels/Annotations als freie Metadaten, deterministische Namen, das VLAN als CRD-artiges Objekt mit Spec+Status.

**Go-Package (nach offenen Standards, kein CGO):**
- `github.com/vishvananda/netlink` (reines Go, netlink-Binding ohne CGO) — für NIC-Discovery, Link-Status, VLAN-Management
- KEIN neues Package wenn iproute2-Command-Emission reicht (aktuelles Muster)

## WP2 — React-Grid-Darstellung (Network-Hierarchie als visuelles Grid)

**Das Soll:**
```
┌─────────────────────────────────────────────────────────────┐
│ NETWORKS (Grid-Darstellung)                                 │
├──────────┬──────────┬──────────┬──────────┬───────────────────┤
│ NIC: eth0│          │          │          │                   │
│ [1Gbps]  │          │          │          │                   │
├──────────┴──────────┴──────────┴──────────┴───────────────────┤
│ ┌─────────────────────────────────┐ ┌───────────────────────┐ │
│ │ 🔵 VLAN 100: Kunden-Prod        │ │ 🟢 VLAN 200: Staging  │ │
│ │    Color: #22d3ee               │ │    Color: #a78bfa     │ │
│ │    172.16.100.0/24              │ │    172.16.200.0/24    │ │
│ │    Gateway: 172.16.100.1        │ │    Gateway: .1        │ │
│ │    macvlan + gVisor            │ │    ipvlan + gVisor     │ │
│ │    ┌─────────────────────────┐ │ │    ┌─────────────────┐ │ │
│ │    │ App-1  [🌐]  :3000      │ │ │    │ App-3 [🗄] :5432 │ │ │
│ │    │ App-2  [⚙]   :8080     │ │ │    │                  │ │ │
│ │    │ [+ Deploy App]          │ │ │    │ [+ Deploy App]   │ │ │
│ │    └─────────────────────────┘ │ │    └─────────────────┘ │ │
│ │    [Edit] [Redeploy] [Delete]  │ │    [Edit] [Redeploy]  │ │
│ └─────────────────────────────────┘ └───────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Component-Struktur:**
```
components/networks/
├── NetworkGrid.tsx        — das Grid (VLAN-Karten als farbige Tiles)
├── VLANTile.tsx           — eine VLAN-Karte (Farbe, Name, Subnet, Gateway, Apps)
├── AppIcon.tsx            — App-Icon aus dem app-type (devicons/react-icons)
├── NICTree.tsx            — NIC-Übersicht (welche physischen Karten, welche VLANs drauf)
└── NetworkEditDialog.tsx  — VLAN bearbeiten (Name, Farbe, Beschreibung, Tags)
```

**Editierbar + Redeploy:** jede VLAN-Karte hat [Edit] (Metadaten ändern — Name/Farbe/Beschreibung/Tags) + [Redeploy] (falls Container-Neustart nötig nach Netz-Änderung).

## WP3 — Scanopy-Repo auditieren (für UI-Styles)

**Die Referenzen:**

| Projekt | Lizenz | Rolle |
|---|---|---|
| **scanopy/scanopy** | AGPL-3.0 + Commercial-Dual | **REFERENCE-ONLY** (R35-Regel) — Network-Topology-Visualizer, 230+ Service-Signaturen, agentless Discovery |
| **karam-ajaj/atlas** | MIT | **Pattern-Donor** — Go-native, neon-pink UI, Docker-Integration, Multi-Interface-Scanning |
| **docker-network-graph** (LeoVerto) | MIT | Graph-Visualisierung von Docker-Netzwerken |
| **DockerNet** (oslabs-beta) | React-UI | Docker-Netzwerk-Management als Web-UI |
| **Edgeshark** (Siemens) | Open-Source | Container-Wiring-Visualisierung (Wireshark-Plugin) |

**Audit-Auftrag:** Clone scanopy/scanopy + atlas + docker-network-graph nach /tmp — studiere die UI-Stile (Grid-Layouts, Farb-Codierung, Netz-Topologie-Darstellung, App-Discovery-Integration) für die React-Grid-Komponente. AGPL = kein Code kopieren, nur die Stile/Ideen übernehmen (R35).

## WP4 — App-Icons als Component (für Workspaces + SSH-Targets)

**Aktuell:** `lib/app-icons.ts` hat Lucide-Icons (Globe/Database/Cog/Wrench/LayoutGrid) — 5 AppTypes.

**Soll:**
- App-Icons als **Component** (nicht nur Mapping) mit Tooltip (App-Name, Port, Status)
- In Workspace-Views UND SSH-Target-Views verwendbar
- devicons/react-icons als erweitertes Set (für bekannte Frameworks: Next.js, Django, Rails, Go, etc.)
- Auto-Erkennung aus dem app-type + framework + container-image

---

## OFFENE TASK-LISTE (Stand 16.9.)

| # | Task | Was | Status |
|---|---|---|---|
| **081** | LLM-Security-Tab | per-Project Guard-Policies (Llama Guard Rules je Project) | geplant |
| **082** | Exposed-Ports WAF Matrix | Port-Matrix + WAF-Inspection-Status | geplant |
| **083** | Tailscale Magic-Certs | ACME DNS-01 via Tailscale für App-Domains | geplant |
| **084** | SSOT & Redundanz | localStorage-Audit (4 Views), Dead-Ends (/api/subagents) | geplant |
| **085** | docs_temp + OpenAPI | huma → /openapi.json → Scalar-Render → GH-Pages | geplant |
| **086** | Slop-Audit + Store/GC | Query-Key-Registry, CI-Gate, Stale-Cache-GC | geplant |
| **098** | **Networking-Tab Vollausbau** | VLAN-Schema (Farben/IPs/Metadaten), React-Grid, Scanopy-Audit, App-Icons als Component | **NEU — dieser Task** |
| **M5-Rest** | /projects → /workspaces | Rest-Funktionen in WorkspacesPage integrieren | geplant |
| **089** | Utility-Dependencies | ✅ von Jules implementiert (93d3e95) | **teilweise umgesetzt** |
| **088/090/091** | Provider-Creds + Onboarding + jimesh_services | ✅ von Jules implementiert (1b82d41) | **teilweise umgesetzt** |
