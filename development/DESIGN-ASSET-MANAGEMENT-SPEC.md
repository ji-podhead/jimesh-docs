# DESIGN-ASSET-MANAGEMENT — Spec für Design-Components, Stitch-Integration, Container-Logs & Plugin-System

| | |
|---|---|
| **Status** | Konzept — kein Code in dieser Änderung |
| **Auftrag** | Designs als first-class Components in JiMesh, Stitch als Integration, Container-Logs, IaC-Code-Referenzen, Custom Categories, API-Keys im Vault |
| **Operator-Input** | Designs unter Project als Custom-Kategorie, Stitch-Sessions als Components mit Assets/Chat-History, Container-Logs + Audit-Logs als Components, IaC-Code immer referenziert, Plugin-System für Custom Categories, API-Keys im Vault mit Scope-Vererbung |

---

## 1. Neue Component-Typen

### 1.1 Design & Design-Folder
```typescript
export type OverviewComponentType =
  // ...bestehende 23 Typen...
  | 'design-folder'    // Ordner unter Project für Designs (z.B. "stitch-designs", "figma-imports")
  | 'design'          // Ein einzelnes Design (Stitch-Screenshot, Figma-Export, Mockup)
  | 'design-session'  // Eine Stitch/Figma-Session mit Chat-History + Prompt + Assets
  | 'container-logs'  // Live-Container-Logs (docker logs) als Component
  | 'audit-logs'      // Audit-Trail für App/Container (wer hat wann was gemacht)
  | 'deployment-logs' // Deploy-Pipeline-Logs (build, health, errors)
```

### 1.2 Parent/Child-Hierarchie

| Type | parent | children | Datenquelle | Plugin benötigt |
|---|---|---|---|---|
| `design-folder` | `{level:'project'}` | `design`, `design-session` | `GET /api/projects/{id}/designs` | Stitch/Figma/DrawIO Plugin |
| `design` | `{level:'project', id: designFolderId}` | — | `GET /api/designs/{id}` | je nach Quelle |
| `design-session` | `{level:'project', id: designFolderId}` | `design` (Referenzen) | `GET /api/design-sessions/{id}` (Stitch MCP) | Stitch Plugin |
| `container-logs` | `{level:'app'}` | — | `GET /api/projects/{id}/containers/{cid}/logs` (SSE) | nein (native) |
| `audit-logs` | `{level:'app'}` oder `{level:'project'}` | — | `GET /api/projects/{id}/audit-logs` | nein (native) |
| `deployment-logs` | `{level:'project'}` | — | `GET /api/projects/{id}/deployment-logs` | nein (native) |

---

## 2. Stitch-Integration als Plugin

### 2.1 Plugin-Konzept
Stitch ist ein **Container-native Integration** — es läuft NICHT als eigener Container, sondern als **API-Integration** die über MCP oder REST mit Stitch kommuniziert:

```typescript
interface StitchPlugin {
  kind: 'stitch'
  // MCP-Verbindung oder REST API
  config: {
    apiKey: string          // Vault: global oder project-scope
    mcpUrl: 'https://stitch.googleapis.com/mcp'
    transport: 'http'
  }
  // Was das Plugin liefert:
  capabilities: [
    'design-creation',      // Neue Designs erstellen via Stitch
    'design-upload',        // Bestehende Screenshots hochladen
    'session-history',       // Chat-Verlauf + Prompts abrufen
    'asset-export',          // Designs als PNG/SVG exportieren
    'code-generation',       // HTML/CSS aus Designs generieren
  ]
}
```

### 2.2 Plugin-Installation
```
1. User geht zu Project → Settings → Plugins → "Install Stitch"
2. API-Key wird im Vault gespeichert (project-scope oder global)
3. Design-Folder wird unter dem Project angelegt: "stitch-designs"
4. Custom-Kategorie erscheint in der Sidebar unter dem Project
5. Die ersten Designs aus Stitch-Sessions werden importiert
```

### 2.3 Design-Session Component
```typescript
interface DesignSession {
  id: string                    // "ds-<stitch-session-id>"
  type: 'design-session'
  parent: { level: 'project', id: designFolderId }
  data: {
    source: 'stitch' | 'figma' | 'drawio'
    prompt: string              // Der Design-Prompt der Session
    chatHistory: ChatMessage[]   // Vollständiger Verlauf
    assets: DesignAsset[]       // Referenzierte Screenshots/Mockups
    generatedCode?: string      // HTML/CSS wenn generiert
    createdAt: string
  }
}

interface DesignAsset {
  id: string
  kind: 'screenshot' | 'mockup' | 'export' | 'uploaded'
  url: string                   // Download-URL
  mimeType: 'image/png' | 'image/svg+xml' | 'image/webp'
  label?: string
  // Klick → selektiert das Asset im Design-Folder
}
```

---

## 3. Container-Logs, Audit-Logs & Deployment-Logs

### 3.1 Container-Logs Component (Native)
```
Tab in App-Overview: "Logs"
→ SSE-Stream von docker logs (live, tail)
→ Timestamp + Log-Level + Message
→ Filter: time-range (1h/24h/7d), level (error/warn/info)
→ Export als Download
```

### 3.2 Audit-Logs Component (Native)
```
Tab in App-Overview: "Audit"
→ Wer hat wann was gemacht (deploy, stop, config-change)
→ Zeigt: user, action, timestamp, details
→ Quelle: security_events + eigene audit-Tabelle
```

### 3.3 Deployment-Logs Component (Native)
```
Tab in Project-Overview: "Deployments"
→ Deploy-Pipeline-Logs: build, health-check, errors
→ Derzeit: triggerBootstrap zeigt Logs im Terminal
→ Soll: persistiert in deployment_logs-Tabelle, browsable
```

---

## 4. IaC-Code-Integration bei Deployments

Wenn ein Container deployed wird:
1. **Dockerfile** wird aus dem Container-Image extrahiert
2. **docker-compose.yml** wird generiert (aus der deploy-Konfig)
3. Beides landet im Project unter `iac-files` (Referenz)
4. Das IaC-File ist mit dem Deployment verknüpft (`iacFileIds`)
5. User kann auf das IaC-File klicken → Overview-Seite zeigt den Code

Bei Playwright als Integration:
1. Playwright-Container wird deployed
2. Dockerfile + compose.yml werden ins Project-Repo geschrieben
3. Der Code ist versioniert und wiederholbar

---

## 5. Custom Categories (Plugin-gated Sidebar-Entries)

```typescript
interface CustomCategory {
  id: string                    // "stitch", "figma", "drawio", "flowchart"
  label: string
  icon: LucideIcon
  pluginRequired: string        // Plugin-ID die installiert sein muss
  folderName: string            // Design-Folder-Name unter Project
  componentTypes: OverviewComponentType[]
}

// Custom Categories erscheinen in der Sidebar unter jedem Project:
// Project → [Custom: Stitch Designs] → Design-Sessions
// Project → [Custom: Figma Imports] → Figma-Files
// Project → [Custom: Flowcharts] → DrawIO-Files
// ABER: nur wenn das jeweilige Plugin installiert ist!
```

---

## 6. API-Keys im Vault mit Scope-Vererbung

### 6.1 Utility-API-Keys (Global)
```
Vault: utility-keys (global scope)
  → STITCH_API_KEY
  → FIGMA_API_KEY
  → GITHUB_TOKEN
  → OPENAI_API_KEY
  → ANTHROPIC_API_KEY
```

### 6.2 Project-Overrides
```
Vererbung: Global → Workspace → Project
  → Wenn Project einen eigenen Key hat, überschreibt er den Workspace-Key
  → Wenn Workspace einen eigenen Key hat, überschreibt er den Global-Key
  → OPA-Policy entscheidet ob Override erlaubt ist
```

### 6.3 Settings-Sections
```
Settings → API Keys:
  ├── Global Utility Keys (Vault)
  │     ├── Stitch API Key [•••••] [Edit] [Delete]
  │     ├── Figma API Key [•••••] [Edit] [Delete]
  │     └── ...
  ├── Workspace Keys (pro Workspace)
  └── Project Keys (pro Project, mit "Override Global" toggle)
```

### 6.4 Onboarding
Step 2.5 (optional): "Connect your design tools"
  → Stitch API Key eingeben → Vault
  → Figma API Key (optional)

---

## 7. Figma-Integration (parallel zu Stitch)

Gleiches Muster wie Stitch:
```
1. Figma Plugin installieren
2. Figma API Key im Vault
3. Design-Folder "figma-imports" unter Project
4. Figma-Files als Design-Components importierbar
5. Custom-Kategorie "Figma" in der Sidebar
```

---

## 8. Flowchart/DrawIO Integration

```
1. DrawIO Plugin (Container oder API)
2. API MCP für Flowcharts + Project-Management-Planning
3. Custom-Kategorie "Flowcharts" in der Sidebar
4. .drawio-Files als Components im Project
```

---

## 9. Research-Prompts für Gemini/Stitch

### Prompt A: Design Asset Management Systems
```
Wir bauen ein Infrastructure-Management-System (JiMesh) mit 4-Tier-Hierarchie:
SSH Target → Workspace → Project → App.

NEU: Designs (UI-Mockups von Google Stitch, Figma-Exports, DrawIO-Flowcharts)
sollen als Components unter Projects verwaltet werden.

Fragen:
1. Welche Design-Asset-Management-Systeme gibt es (Open-Source + Commercial)?
2. Wie kategorisieren die Designs, Versionen und Sessions?
3. Wie verwalten sie Assets (Screenshots, Mockups, Code-Exports)?
4. Gibt es Standards für Design-Metadaten (ähnlich wie SWID-Tags für Software)?
5. Wie integrieren andere Tools Stitch/Figma als Design-Quelle?
6. Zeige eine konkrete API für Design-Versioning mit Session-History.
```

### Prompt B: Stitch MCP Integration
```
Wir haben einen Stitch MCP-Endpoint (https://stitch.googleapis.com/mcp)
mit API-Key-Auth und wollen Designs als Components in JiMesh verwalten.

Fragen:
1. Welche Stitch-MCP-Tools gibt es (design-creation, upload, session-history, code-gen)?
2. Wie rufen wir die Chat-History einer Session ab?
3. Wie exportieren wir generierte Designs als Assets?
4. Wie verknüpfen wir Design-Assets mit Infrastructure-Components?
5. Zeige eine konkrete Integration: Design-Session → JiMesh Component.
```

### Prompt C: Container-Logs als Component
```
Wir haben Container (Docker) auf SSH-Nodes deployed.
Container-Logs (docker logs), Audit-Logs und Deployment-Logs
sollen als Component-Tabs in der App-Overview-Page erscheinen.

Fragen:
1. Wie streamen wir Live-Logs via SSE vom SSH-Node zum Browser?
2. Wie persistieren wir Logs für Browsing (time-range filter)?
3. Wie strukturieren wir Audit-Events (who/what/when/details)?
4. Zeige eine konkrete PostgreSQL-Tabelle + API für container_logs.
```