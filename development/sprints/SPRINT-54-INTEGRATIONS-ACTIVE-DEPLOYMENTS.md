# SPRINT 54 — INTEGRATIONS: ACTIVE DEPLOYMENTS (BACKLOG #170)

> Branch `fix-integrations-deployments`. Auftrag: Die Integrations-Fläche
> (Plugin-Katalog, `/plugins`) zeigt nur die linke Design-Hälfte — das
> "Active Deployments"-Panel mit Sidecar-Management (Ports, Shell-Zugriff,
> Monitoring) fehlt komplett (docs_dev/backlog/BACKLOG.md #170). Der Sprint
> baut die fehlende rechte Hälfte als echte Section auf die bestehende
> PluginCatalogPage (keine neue Route — die Integrations-Page IST der
> Katalog, siehe Backlog-Fund „Keine eigene /integrations-Route").
> Pflichtlektüre vorab: MANDATES.md (Mandat 2 no-mock), API_DOCS.md
> §deploy (alle konsumierten Routen), SPRINT-50 WP2 (DeploymentRow-Modell).

## Ziel

Eine "Active Deployments"-Section auf der Integrations-Seite
(`PluginCatalogPage.tsx`), die JEDE persistierte Deployment-Row über
GET /api/deployments listet (alle Projekte, alle Workspace-Scopes) und je
Row die Sidecar-Management-Flächen des Designs mit ECHTEN Backend-Routen
verdrahtet: Ports, SSH-Tunnel-Zugriff, Container-Logs (SSE), Monitoring
(SSE), Terminal, Redeploy, Undeploy.

## Plan (vor Code, Mandat „Plan before code")

### Datenquellen (alle existieren, alle dokumentiert in API_DOCS.md)

| Route | Zweck in der Section |
|---|---|
| GET `/api/deployments` | alle Deployment-Rows (id, projectId, workspaceId, name, type=framework, port, status, interfaces, createdAt) |
| GET `/api/projects` | Projekt-Kontext: Name, Node-Koordinaten, vnc/codeServer-Ports, workspacePath (für Tunnel-URL + Undeploy-Body) |
| GET `/api/discovery` | Live-Container-Registry → Container-Id je Deployment (Namen `jimesh-framework-<nameKey>-<runID>`, nameKey = workspaceId oder projectId) für die Logs-SSE |
| GET `/api/projects/{id}/tunnel/{port}` | SSH-Tunnel-Link auf den App-Port + ttyd/gotty Web-Terminal (Shell-Frameworks, Port 3080) + VNC-Desktop |
| GET `/api/projects/{id}/containers/{cid}/logs` | SSE `event: log` {`line`,`ts`} + `event: end` — docker logs --follow über SSH |
| GET `/api/projects/{id}/monitoring` | SSE `monitoring_start` + EIN `metrics`-Snapshot (free -m / df -h / top / docker stats) je Verbindung |
| GET `/api/settings/ssh_endpoints` (+ lokale Secrets) | SSH-Credentials für den Undeploy (Endpoint per nodeHost-Match, wie BrowserRuntimeModal) |
| POST `/api/projects/{id}/deployments/{depId}/redeploy` | Row-Mark → status `building` |
| POST `/api/workspaces/undeploy` | echter Sweep (Containers stoppen+rm, State-Volume BLEIBT — purgeVolume=false, Mandat „safe deploys"); workspaceId-Scope beachtet TASK-037 |

### Abnahmekriterien

1. Section listet alle Rows aus GET /api/deployments; je Row: Framework-
   Badge (type), Status-Badge (echter Werteraum), Port-Chips (interfaces +
   port), Links SSH-Tunnel / Container-Logs / Monitoring, Actions-Menu.
2. Actions: Open Terminal, View Logs (SSE), Redeploy (POST), Undeploy
   (POST, Confirm-Dialog, volume kept).
3. Terminal-Pfad je Row ehrlich nach Interface-Lage: terminal-Interface →
   Tunnel auf 3080 (ttyd/gotty/DSH-Web-GUI — der Web-Terminal-Port, den die
   Deploy-Engine in projects_ssh.go startet), vnc-Interface → Tunnel auf
   vncPort, code-server → Tunnel auf codeServerPort, sonst →
   BrowserRuntimeModal (Shell-Runtime nachdeployen; vom Auftrag explizit
   sanktionierte Variante).
4. SSE-Konsum per fetch+Bearer (EventSource kann keine Header setzen —
   gleiche Begründung wie realtime-logs.tsx TASK-029 B.5).
5. Keine Zeile Design-Fiktion (Mandat 2): kein StatefulSet, keine
   Pull-Counts, keine Registry-Artefakte — die DeploymentRow hat dafür
   keine Felder. Ehrliche Leerzustände statt Fakes.
6. tsc A/B ohne neue Fehler; lint 0; vitest grün; check:i18n grün (60
   Locales, neue Keys `activeDeployments.*`).
7. Doku-Sync: BACKLOG-Spiegel, docs_dev-Backlog #170, dieser Sprint-
   Retro mit Verifikationszeilen.

## Work Packages

### WP1 — ActiveDeploymentsSection (components/plugins/)
Section-Komponente: Queries (all-deployments/projects/discovery), Card-
Liste je Deployment, Undeploy-Confirm-Dialog, Actions-Dropdown, Terminal-
Auflösung, Tunnel-Link-Logik (Local-Node-Direktzugriff vs. Tunnel, wie
AppDetailPage).

### WP2 — SSE-Dialoge (Logs + Monitoring)
Logs-Dialog: fetch-SSE auf containers/{cid}/logs, Level-Färbung nach
Text-Parsing (wie ContainerLogViewer), ehrlicher Zustand ohne Container-Id
(discovery-Scan-Hinweis). Monitoring-Dialog: fetch-SSE auf monitoring,
Snapshot-Rendering (memory/disk/cpu/containers), Auto-Refresh 10s +
manuellem Refresh (Endpoint sendet EINEN Snapshot pro Verbindung).

### WP3 — Verdrahtung + i18n
Section auf die PluginCatalogPage (unterhalb des Headers, über dem
Installed-Shelf), Query-Key `allDeployments` in der Registry (getrennt
vom SSOT-Store-Key `deployments-ssot`, der die Rows zu App[] mappt —
gleiche Route, anderer Shape, wie 'projects' vs. 'projects-list' Präzedenz).
i18n-Keys `activeDeployments.*` in en.json + alle 60 Locales.

## Retrospektive (nach Verifikationslauf ausgefüllt)

- [folgt dem Implementierungs-Commit]
