# RESEARCH-UPDATE — Session-Input 18.9.

## Was der Operator zusätzlich zu den 6 Specs + 4 Security-Reports geschickt hat:

### 1. Browser/Container-Integration (statt iframe)
- KasmWeb Chrome (kasmweb/chrome, 25M pulls): Voll-Chrome im Container, per KasmVNC direkt im Browser-Tab
- KasmWeb Desktop (kasmweb/desktop): Kompletter Desktop mit VNC
- User-Wunsch: Bei Deploy kann man KasmWeb Chrome oder VNC Desktop statt iframe waehlen
- Playwright: Zusaetzlich als Automation-Integration installierbar
- Der grosse Container der auch VS Code nutzt = Electron/CEF fuer Desktop-Apps; KasmVNC/Webtop fuer Server-Container

### 2. File-Manager / File-Browser
- pkg/sftp (Go): SSH-Dateisystem ueber bestehenden Tunnel (dialSSH/runSSHCommand existiert)
- Chonky (React): Moderner File-Browser
- react-folder-tree: Leichter Ordner-Baum fuer Modals
- UX: Input mit SSH-Autocomplete + Browse-Button -> File-Browser Modal
- Gebaut: 3 React-Komponenten in src/frontend/src/components/files/
- Fehlt: Backend-Route POST /api/ssh/explore

### 3. Design Asset Management (Stitch/Figma/DrawIO)
- Designs als Components unter Project
- Stitch als Plugin-Integration (MCP oder REST)
- Session-History: Prompt + Chat-Verlauf + Assets pro Session
- Custom Categories (plugin-gated): Stitch/Figma/DrawIO/Flowchart in Sidebar
- API-Keys: Vault (global -> workspace -> project, ueberschreibbar)
- Siehe: docs/DESIGN-ASSET-MANAGEMENT-SPEC.md

### 4. Container-Logs / Audit-Logs / Deployment-Logs
- container-logs: Tab in App-Overview (docker logs via SSE)
- audit-logs: Tab (who/what/when)
- deployment-logs: Tab (build/pipeline-logs persistiert)
- Fehlt im Backend: Persistierte Logs-Tabelle + SSE-Route

### 5. IaC-Code bei Deployments
- Dockerfile + compose.yml ins Project-Repo schreiben
- iacFileIds auf Deployment verknuepft den Code

### 6. Security-Research (4 Reports)
- R1 Agent-Scan: Snyk -> lokale Neuimplementierung (Consent-Falle)
- R2 Outbound-DLP: Tool-Response-Scanning Gap
- R3 CI-Red-Team: AgentDojo + PromptMap gegen OPA-Gate
- R4 OTel-Tracing: OpenLLMetry Spans + Langfuse OTLP
- Siehe: docs_dev/research/reports/

### 7. Gemini-Research-Prompts (10 Stueck)
- Siehe: docs/RESEARCH-SAM-ONTOLOGY.md Abschnitt 6

### 8. Stitch-Integration
- Google Stitch: https://stitch.withgoogle.com
- MCP-Endpoint: https://stitch.googleapis.com/mcp
- Ich (GLM/DSH): KEIN MCP-Client — aber Stitch ueber REST-API nutzbar
- Claude Code: hat MCP-Client (claude mcp add stitch)
- Screenshot: jimesh-dashboard.png
- Als JiMesh-Plugin: Stitch-Container + MCP-Server fuer Design-Management

### 9. Was noch FEHLT (offene Frontend-Items)
- Overview-Tab in Navbar
- Breadcrumb/Back-Button-Kette
- Scope-Multiauswahl (SelectionSet in global-scope.ts)
- React-Grid-Layout installieren
- Component-Adapter (19+ Typen)
- Auto-Project-Erstellung im Backend
- Team->Server-Bindings (team_resource_bindings + OPA)
- Container-Logs SSE-Route
- IaC-Discovery-Backend (iac_files + Scan-Route)
- Docker-Hub-Container-Metadaten-Route
- POST /api/ssh/explore (File-Browser-Backend)
- Integrations-Backend (POST /api/apps/{id}/integrations)
- Stitch-Plugin-Backend