# HANDOFF-2026-09-18 — FULL SESSION TRANSFER

> **An die nächste Session (Claude/GLM/Gemini/egal):** Du bist FRISCH. Du hast keinen Kontext aus
> den vorherigen Sessions. Dieses Dokument ist DEIN EINZIGER EINSTIEG. Lies es VOLLSTÄNDIG, dann
> lies die referenzierten Dateien, dann entscheide was als nächstes passiert.

---

## 1. WAS IST JIMESH?

JiMesh ist ein **Container-Native Infrastructure Management System** mit:
- Go-Backend (CGO_ENABLED=0, PostgreSQL via pgx v5, Redis Streams, OPA embedded)
- Next.js 15 Frontend (React, TypeScript, Tailwind, shadcn/ui, react-router-dom)
- 4-Tier-Hierarchie: SSH Target → Workspace → Project → App
- LLM-Proxy (Multi-Provider: OpenAI/Anthropic/Nvidia/etc. hinter einer /v1 API)
- Agent-Orchestrierung (Subagent-Spawn, GUARDED-Queue, SSE-Progress)
- Security-Stack (Keycloak OIDC, OPA-Policies, Vault, Firewall-Manager, SIEM)

Deployed auf: Trading-Node (187.124.2.174, VPN 100.64.0.6) via SSH, erreichbar über
Tailscale-Mesh (http://localhost:8090 via socat-forward, oder http://100.64.0.6:8090 direkt).

---

## 2. WAS WURDE BEREITS GEBAUT (verifiziert, deployed)

### OAuth-Login (KOMPLETT gefixt, 18.9.)
- Keycloak auf trading, Realm jimesh, Client jimesh-dashboard
- Secret = .env-Wert (via Admin-API gefixt + Bootstrap reconciled)
- Redirect: localhost:8090/api/auth/callback (via Traefik)
- Keycloak über Traefik-Route /realms/* erreichbar
- Admin-User mit echtem Passwort (reconciled bei jedem Boot)

### CI/CD
- 3-Job ci.yml (backend go build+vet, frontend vitest+i18n+build, repo-checks ohne Root-Install)
- Backend war build-broken (prometheus fehlte in go.mod, mcp-go API-Mismatch) → gefixt

### Frontend (deployed via Hot-Reload auf trading)
- Sidebar: „Alle SSH-Targets" Parent-Row (Scope all), Settings-Gear pro Target,
  SSH-Target-Klick navigiert zu /workspaces, Highlight aktiv
- Node-Health-Strip auf /workspaces (CPU%, RAM, Disk, Load, 5s-Poll, via /proc)
- WorkspaceDeploymentsPage folgt dem global Scope
- n.filter-Crash gefixt (keys Array-Guard)
- Onboarding: 4-Step-Flow (Welcome→Node→Firewall→Deploy) mit echter SSH-Verifikation
- SubagentsPanel mit GUARDED-Approval-Queue, Stop-Action, SSE-Härtung
- OpenApiPage (/api-docs) rendert /openapi.json
- 3 File-Browser-Komponenten: FilePathInput (SSH-Autocomplete), FileBrowserModal (Baum),
  FileBrowserField (kombiniert) — Backend /api/ssh/explore noch unvollständig

### Backend
- POST /api/users: echte Keycloak-Realm-User erstellen (email+password+Rolle)
- GET /api/nodes/health: Host-Stats via /proc (loadavg, CPU%, RAM, Disk, uptime)
- GET /api/deployments: alle Deployments aus PostgreSQL (neue Route)
- POST /api/security/findings/dismiss: DB-Dismiss-Flag für Security-Findings
- GET /api/security/findings/dismissed

---

## 3. ALLE RESEARCH-/SPEC-DOCS (15 Dateien, alle committed)

| # | Datei | Zeilen | Kern |
|---|---|---|---|
| 1 | docs/FE-IA-SPEC.md | 570 | Scope-Modell, Team-Bindings-Design, 14-Punkte-Fix-Liste, **ScopeSelector ist toter Code** |
| 2 | docs/FE-PLUGINS-CONCEPT.md | 346 | App→Deployment→Interface, **DeploymentRows SIND die Apps**, Plugin=schon belegt |
| 3 | docs/FE-OVERVIEW-SPEC.md | 587 | Component-Schema (19 Typen), React-Grid, Multiauswahl, Navbar-Tab, Dashboard-Builder |
| 4 | docs/FE-IAC-DISCOVERY-SPEC.md | 357 | SSH-Datei-Scan, iac_files-Tabelle, Container-Verknüpfung, MCP/Snyk |
| 5 | docs/COMPONENT-SCHEMA.md | 566 | **KANONISCHES SCHEMA**: 23 Typen, Parent/Child-Tabelle, Secrets-Scope, Integration |
| 6 | docs/RESEARCH-SAM-ONTOLOGY.md | 411 | SAM-Standards (ITIL/CMDB/CIM), OSS-Vergleich (GLPI/Ralph/NetBox), 10 Gemini-Fragen |
| 7 | docs/DESIGN-ASSET-MANAGEMENT-SPEC.md | ~200 | Designs als Components (Stitch/Figma/DrawIO), Container-Logs, API-Keys im Vault |
| 8 | docs/RESEARCH-UPDATE-SESSION-INPUT.md | 68 | Alle Session-Inputs konsolidiert |
| 9 | docs/PROMPTS-STITCH-DESIGN.md | 71 | 6 UI-Design-Prompts für Google Stitch |
| 10 | docs/PROMPT-LORA-CLOUDFLARE.md | 34 | Artikel-Prompt für LoRA/Cloudflare Workers |
| 11 | docs/PROMPT-BROWSER-COMPARE.md | 25 | KasmWeb vs Browserless vs Webtop |
| 12 | docs/RESEARCH-COMPILE-TIME-OBSERVABILITY.md | 186 | otelc, Semgrep, AutoLogger, Deploy-Gate-Pipeline |
| 13 | docs/MASTER-PLAN.md | 191 | **DER PLAN**: P0-P3 priorisiert, 25 API-Routen, 3 Sprints, Risiken |
| 14 | docs/sprints/SPRINT-1-DESIGN-FIRST.md | — | Design-First Sprint (Stitch + Scope-Fundament) |
| 15 | docs/sprints/SPRINT-2-APP-DEPLOYMENT-TRUTH.md | — | Deploy-Persistenz + Team-Bindings + IaC |

+ docs/sprints/SPRINT-3-SECURITY-HARDENING.md
+ docs/backlog/BACKLOG.md (14 Backlog-Items)
+ 4 Security-Reports in docs_dev/research/reports/ (889 Z.)

---

## 4. WAS FEHLT — ALLE OFFENEN ITEMS

### P0 (blockiert alles):
1. **Scope-System auf Pfad-Modell** — ScopeSelector ist toter Code, muss reaktiviert werden
2. **Component-Schema-Typen anlegen** — TypeScript-Interfaces in types/domain/
3. **Deploy-Persistenz** — executeDeploy schreibt KEINE Deployment-Rows/Interfaces

### P1 (15 Items aus Master-Plan):
4. /overview Route + react-grid-layout installieren + Component-Adapter (23 Typen)
5. Multiauswahl in global-scope.ts (additives SelectionSet)
6. 6 scope-blinde Pages auf Scope umstellen
7. Breadcrumb/Back-Button (App→Workspace→Project→Target→All)
8. Team→Server-Bindings (team_resource_bindings + OPA)
9. Interfaces-UI (Integration-Badges auf App-Zeilen)
10. Integrations-Backend (POST /api/apps/{id}/integrations)
11. IaC-Discovery Backend (iac_files + SSH-Scan)
12. Auto-Project (Deploy ohne Project → auto-Project)
13. Browser-Deploy-Option (KasmWeb Chrome vs VNC)
14. Container-Logs SSE + Audit-Logs + Deployment-Logs
15. POST /api/ssh/explore (File-Browser-Backend)
16. OTel-Spine (otelc + OTLP-Export)
17. Semgrep in CI + jimesh-Regeln
18. Vault-ACL-Fix (R2 Gap)
19. Outbound-DLP (R2)
20. Agent-Scan lokal (R1)
21. Red-Team-Suite (R3)

### P2/P3:
22. Stitch-Plugin-Backend + Design-Folder + Session-Import
23. Docker-Hub-Container-Metadaten
24. Figma-Integration
25. DrawIO/Flowchart-Integration
26. Dashboard-Builder (leobot-artig)
27. AutoLogger-Agent (KI-Pipeline)
28. Tree-sitter für User-Code-Analysis
29. API-Keys im Vault (Global→Workspace→Project)
30. Weiche nodeHost-Kette auf echte FKs migrieren

---

## 5. ALLE AGENT-PROMPTS (für Subagents — zum Kopieren)

### 5.1 AutoLogger-Agent
```
AUFGABE: Baue eine KI-Pipeline die automatisch Log-Statements in Go-Code injiziert.
VORGEHEN: 1. Backward Slicing (alle Variablen im Scope), 2. LLM-Kontext (Code+Scope)
3. Generiere Log-Statement mit Level+Variablen, 4. Injiziere via ast-grep --rewrite
5. Re-Compile + Test → CI-Gate prüft ob Logging vorhanden.
QUELLE: docs/RESEARCH-COMPILE-TIME-OBSERVABILITY.md §6.2
```

### 5.2 Design-Component (Stitch/Figma)
```
AUFGABE: Implementiere Design-Assets als Components in JiMesh.
1. Backend: POST /api/designs (Session importieren), GET /api/designs/{id}
2. Frontend: Design-Folder unter Project, Design-Session-Card mit Asset-Preview
3. Plugin-System: Custom-Kategorie wenn Stitch-Plugin installiert
QUELLE: docs/DESIGN-ASSET-MANAGEMENT-SPEC.md
```

### 5.3 File-Browser-Backend
```
AUFGABE: POST /api/ssh/explore — Verzeichnisse auf Remote-Node via SSH listen.
VORHANDEN: dialSSH (projects_ssh.go:987), runSSHCommand (:1025),
Handler-Beginn in deploy/ssh_explore.go. Route registriert in deploy.go.
FEHLT: JSON encoding in ssh_explore.go, imports, Tests.
```

### 5.4 Container-Logs Backend
```
AUFGABE: SSE-Route für Live-Container-Logs (docker logs) + persistierte Logs-Tabelle.
1. GET /api/projects/{id}/containers/{cid}/logs (SSE-Stream)
2. container_logs-Tabelle (id, container_id, line, level, timestamp)
3. UI: Tab in App-Overview mit Live-Stream + Time-Range-Filter
```

### 5.5 Team-Bindings Backend
```
AUFGABE: Team→Server-Zugriff über team_resource_bindings-Tabelle + OPA.
1. CREATE TABLE team_resource_bindings (id, team_id, resource_type, resource_id, vererbbar, created_at)
2. GET/POST/DELETE /api/team-bindings
3. team-bindings.rego OPA-Modul (fail-closed, Admin-Bypass)
4. UI: Teams-Page bekommt Resource-Bindings Tab
QUELLE: docs/FE-IA-SPEC.md §Team-Bindings
```

### 5.6 Stitch-Plugin Backend
```
AUFGABE: Stitch-Integration als Plugin (API-Key im Vault, MCP/REST-Verbindung).
1. stitch-api-key in Vault (scope: global oder project)
2. Backend: GET /api/plugins/stitch/sessions (Session-Liste)
3. Backend: GET /api/plugins/stitch/sessions/{id} (Chat-History + Assets)
4. Frontend: Design-Folder + Session-Cards
MCP-Endpoint: https://stitch.googleapis.com/mcp
```

### 5.7 IaC-Discovery Backend
```
AUFGABE: IaC-Dateien auf SSH-Nodes entdecken und indexieren.
1. iac_files-Tabelle (id, project_id, path, type[dockerfile|compose|tf|ansible], sha256, git_tracked)
2. GET /api/projects/{id}/iac-files
3. POST /api/projects/{id}/iac-files/scan (SSH find über workspacePath)
4. GET /api/projects/{id}/iac-files/{fileId} (Live-Content)
QUELLE: docs/FE-IAC-DISCOVERY-SPEC.md §4
```

### 5.8 Browser-Utility-App Deploy
```
AUFGABE: KasmWeb Chrome / VNC Desktop als Deploy-Option bei "Add Browser".
1. Framework-Erweiterung: kasmweb-chrome, kasmweb-desktop, playwright
2. UI: Zwei Karten (Chrome empfohlen, VNC Desktop) + Playwright-Checkbox
3. Docker-Run-Commands für beide Images + Port-Allokation
QUELLE: docs/PROMPT-BROWSER-COMPARE.md
```

### 5.9 OTel-Spine
```
AUFGABE: OpenTelemetry Compile-Time Instrumentation für Go-Backend.
1. go install go.opentelemetry.io/auto/build-tools/otelc@latest
2. go build -toolexec=otelc ./...
3. OTLP-Export nach Grafana Tempo oder Langfuse v4
4. Spans: invoke_agent, execute_tool, verify
QUELLE: docs/RESEARCH-COMPILE-TIME-OBSERVABILITY.md + R4-Report
```

### 5.10-15: Security-Implementierungen
```
Vault-ACL-Fix: allowed_agents-Filter in vault.go Read-Path (R2-Report)
DLP-Hook: dlp_hook.go in toolcalls.go, pass/redact/block (R2-Report)
Agent-Scan: 5 deterministische Checks lokal (R1-Report)
Red-Team: Phase 0 db-frei, Go-Tests gegen Policy-Gate (R3-Report)
Semgrep: jimesh-static-analysis.yaml, CI-Gate vor Deploy
OTel-Spine: otelc + OTLP-Export (R4-Report)
QUELLE: docs_dev/research/reports/01-04_*.md
```

---

## 6. GIT-STAND

```
Branch: feat/security-engineer-gateway-commands
Remote: origin → https://github.com/ji-podhead/JiMesh2.git
Deployed-Repo auf trading: /opt/jimesh/repo (tracked jimesh.git — ANDERES Remote!)
Deployed: Frontend hot-reload (bind-mounted), Backend jimesh-backend:local

⚠️ ZWEI DIFFERENTE REMOTES: JiMesh2.git (dev) vs jimesh.git (server)
   Der Trading-Server pulled von jimesh.git, nicht von JiMesh2.git!
   Fix: Branch nach jimesh.git pushen ODER Trading-Remote umstellen
```

---

## 7. DIE VISION (Operator-Wortlaut)

1. **JiMesh baut JiMesh** — Stitch designed die UI, JiMesh deployed sie
2. **Design-First** — erst designen, dann implementieren
3. **Jules macht Frontend** — ich gebe API-Docs + Struktur, Jules mockt die UI
4. **Ich schiebe Backend** — parallel zu Jules, dann integrieren
5. **Container statt iframe** — KasmWeb Chrome oder VNC direkt im Browser-Tab
6. **Alle Components in einem Schema** — 23+ Typen, über alles hinweg
7. **Compile-Time Observability** — otelc + Semgrep vor jedem Deploy
8. **KI-gestütztes Auto-Logging** — AutoLogger-Agent entscheidet where-to-log
9. **Designs als Assets** — unter Project, mit Session-History + Assets
10. **Drag & Drop** — Apps zwischen Projects verschieben (Auto-Project)

---

## 8. NÄCHSTER SCHRITT

Lies MASTER-PLAN.md (docs/MASTER-PLAN.md, 191 Z.) für die komplette
priorisierte Fix-Liste + Sprint-Vorschläge.

Dann: Sprint 1 starten (docs/sprints/SPRINT-1-DESIGN-FIRST.md) =
1. Stitch-Designs erstellen (6 Prompts in docs/PROMPTS-STITCH-DESIGN.md)
2. Component-Schema-Typen anlegen
3. Scope-Multiauswahl implementieren
4. Echte JiMesh-Logos erstellen

Oder: Backend zuerst wenn Jules das Frontend macht —
dann P0-Persistenz + /api/ssh/explore + Container-Logs + Team-Bindings.