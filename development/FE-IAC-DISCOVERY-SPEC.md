# FE-IAC-DISCOVERY-SPEC — IaC-/Agent-Code-Erkennung im Workspace („Deployment-Code")

**Status:** Spezifikation (Research + Design, **kein Code in diesem Stand implementiert** — alle „Soll“-Abschnitte sind Vorschläge auf Belegbasis).
**Auftrag:** Der Operator will IaC-Code und Container verbinden — Dockerfiles, `docker-compose.yml`, Terraform (`.tf`) und Ansible (`.yml`) im Workspace-Dateisystem auf SSH-Nodes **und** in Git-Repos erkennen, an Apps/Projects als „References“ anzeigen, per Klick eine IaC-File-Overview-Seite öffnen, Deployment-Code mit dem eigentlichen Deployment verknüpfen und Agent-Code (MCP-Server-Definitionen, Snyk-Konfigurationen) erkennen.
**Lesweise:** Jede Behauptung über den **Ist-Zustand** trägt eine `datei:zeile`-Belegstelle. „Soll“-Abschnitte sind Design-Entscheidungen, explizit als Vorschlag markiert, und erfinden keine Datenquellen — jede angenommene Fähigkeit ist in Abschnitt 2 belegt oder in Abschnitt 8 als „fehlt“ verzeichnet.
**Pfad-Korrektur zum Auftrag:** `TASK-102-suricata-network-anomaly.md` liegt nicht unter `docs/tasks/`, sondern unter `docs_dev/tasks/jules/TASK-102-suricata-network-anomaly.md:1-38` (Scanner-/SIEM-Kontext: Suricata-IDS als Sidecar im SIEM-Compose, EVE-JSON → `/api/sdk/logs`, alias=suricata — Zeilen 14-23). Sie belegt zwei für diese Spec relevante Muster: (a) repo-eigene Compose-Files als IaC (`deploy/siem/docker-compose.yml`, Zeile 15) und (b) Scanner-Ergebnisse laufen über das Event-Surface `/api/sdk/logs` mit Quell-Alias (Zeilen 17, 23).

---

## 1 Kontext: Wo der Deployment-Code lebt

### 1.1 Der Deploy-Workflow (Ist)

Der Deploy-Engine ist `POST /api/projects/deploy` → `executeDeploy` in `src/backend/internal/deploy/projects_ssh.go:1161` (Registrierung `internal/deploy/deploy.go:49`). Der Request `DeployRequest` (`projects_ssh.go:31-154`) trägt u. a.:

| Feld | Zeile | Bedeutung (Belegkommentar) |
|---|---|---|
| `workspacePath` | :47 | Pfad des Checkouts **auf dem Node** — der Container mountet ihn (`-v %s:/workspace`, :1714-1715) |
| `gitToken` | :121 | „NEVER persisted in PostgreSQL: passed to the container as GIT_TOKEN env and configured as a git credential store INSIDE the persistent volume“ (:118-120) |
| `taskId` / `workspaceId` | :128 / :140 | Mount-Override auf Task-/User-Worktree (Projektion von `workspacePath`) |
| `iacGate` | :153 | Posture des IaC-Quarantine-Gates (Abschnitt 2.3) |

Die Pipeline `mkdir -p <workspacePath>` (:1293) → ggf. Worktree-Auflösung (Task: `<ws>/.jimesh/tasks/<taskId>`, :1236; User: `<ws>/.jimesh/worktrees/<wsId>` aus der Store-Row, :1263-1274) → Framework-Container-Start (mountet `agentMountPath`, :1714-1720) → **`cd <workspacePath> && docker compose down/up -d`** beim Framework `jimesh` (:1803-1804) mit `git fetch --all && git reset --hard origin/main` bzw. `git clone` davor (:1798-1801) → Container-Bookkeeping (`SaveContainerForWorkspace`, :2192-2196) → **IaC-Quarantine-Gate über genau diesen Workspace-Pfad** (:2232-2243, `gateContext.workspacePath = agentMountPath` :2237).

Das ist der Vertrag, an dem die Discovery andockt: **der Workspace-Path auf dem Node enthält den Code**, und es gibt bereits eine funktionierende, gepoolte SSH-Ausführungsinfrastruktur dorthin (2.1).

### 1.2 Einordnung in die 4-Tier-Hierarchie

FE-IA-SPEC (docs/FE-IA-SPEC.md:11-20) fixiert die Hierarchie **SSH-Target → Workspace → Project → App**. Diese Spec hängt an **Ebene 3 (Project-Overview, FE-IA-SPEC.md:279-287)** an und liefert zusätzlich eine **File-Detail-Ebene** unterhalb des Projects. IaC-Code ist projekt-/workspace-gelogen (`projects.workspace_path`, `store/store.go:607`; Workspace-Worktree `workspaces.worktree_path`, `store/workspaces.go:61`), nicht app-gelogen — ein App (Container, `store/store.go:623-631`) **verwendet** IaC-Code, besitzt ihn aber nicht (Verknüpfung in Abschnitt 4).

---

## 2 Ist-Analyse (grep-belegt)

### 2.1 SSH-Run-Infrastruktur — vollständig vorhanden

1. **SSH-Pool:** `network.Pool` ist der prozessweite `TunnelPool`-Singleton — eine persistente SSH-Session pro Project-Schlüssel, geteilt über alle Domänen-Packages („deploy/tunnel, provisioning, security/exposure and discovery … called into it“, `internal/network/tunnel.go:30-38`). Primitiven: `Register(projectID, SSHConfig)` (:71-114, TOFU-Host-Key-Store gepflegt, :104-110), `GetOrCreate(projectID, host, port)` (:117-155), **`Exec(projectID, host, port, command)`** (:194-208 — CombinedOutput eines Shell-Kommandos über die gepoolte Session).
2. **Per-Request-Dial im Deploy-Pfad:** `dialSSH` + `runSSHCommand` (`internal/deploy/projects_ssh.go:1150-1156`, `runSSHCommand` :1025); das IaC-Gate nutzt `runCapture` mit `timeout`-Budget über dieselbe Session (`internal/deploy/quarantine.go:110-150`).
3. **Read-only-Probe-Präzedenzen** (exakt das Ausführungsmuster, das ein IaC-Scan wiederverwenden würde):
   * Node-Status-Probe (uname, Docker-Version, Container-Count) über `dialSSH`/`runSSHCommand` — `internal/deploy/ssh_provider.go:18-19` („a real probe built from the EXISTING primitives“), Ausführung :207.
   * Monitoring-Snapshot via `network.Pool.Exec`: `free -m`, `df -h` (`internal/deploy/tunnel.go:230-231`; Route `/api/projects/{id}/monitoring`, `docs/API_DOCS.md:688` — SSH-Config aus **projekt-scoped Settings** `ssh_<id>_*`, globaler Fallback).
   * Exposure-Scan via `network.Pool.Exec`: `ss -tlnp`, `docker ps --format "{{.Names}}\t{{.Image}}\t{{.Ports}}"`, `ip addr` (`internal/security/exposure.go:876-892`, Kommando-Template :57).
   * Node-Provision über SSH: Kommandos werden als String-Liste gebaut, mit ` && ` vereint und remote ausgeführt (`internal/deploy/node_provision.go:102-152`, Route `POST /api/nodes/provision` :30-34).
4. **Keine Datei-Discovery existiert:** grep über `src/backend` nach `find`/`ls` als Remote-Dateilisten-Befehl → keine Treffer außer `find` im gosec-Container-Check (`quarantine.go:435`) und im Workspace-Perm-Helper (`projects_ssh.go:1388`). `git ls-tree` / Repo-Tree-Listing: 0 Treffer (2.6).

### 2.2 Deploy-Pipeline schreibt Workspace-Path + Container-Rows (Verknüpfungsanker)

* `UpsertProject` persistiert `WorkspacePath` (`projects_ssh.go:2130-2149`; Spalte `projects.workspace_path`, `store/store.go:607`) — **der Node-Checkout ist nach dem Deploy in PostgreSQL auffindbar**, auch ohne Request-Kontext.
* Container-Rows: `SaveContainerForWorkspace(key+"-framework", projID, name, name, status, tags, workspaceID)` (:2192-2196) → `containers` (`store/store.go:623-631`, inkl. `workspace_id`).
* Deploy-Response trägt `taskWorktreePath`/`workspaceWorktreePath` (:2388-2399) — die Mount-Projektion ist damit Response-sichtbar.
* `/api/projects`-Liste gibt `workspacePath` an das Frontend weiter (`projects_ssh.go:2858-2878`, Feld :2870).

### 2.3 IaC-Scanning existiert bereits — als Security-Gate, nicht als Discovery

Das ist der wichtigste Ist-Befund: **Scan-Vokabular, Policies und Findings-Shapes sind da; die Verzeichnis-/Index-Sicht fehlt.**

* **Gate:** Nach jedem Deploy scannt das TASK-059-Quarantine-Gate („IaC-Gate“, `internal/deploy/quarantine.go:1-15`) den Workspace-Checkout mit gepinntem **Checkov** (`bridgecrew/checkov:3.2.421@sha256:…`, `internal/scanner/iac.go:40-42`): der Checkout wird `-v <workspacePath>:/tf` in den Gate-Container gemountet, `checkov -d /tf -o json -s --external-checks-dir /jimesh-checks` läuft mit `timeout 300` (`quarantine.go:295-301`; argv `internal/scanner/iac.go:196-203`). Dazu SAST-Stage v1: gosec (Go-Workspaces) bzw. trivy (Runtime-Image) (`quarantine.go:425-480`, Pins `iac.go:43-46`).
* **Compose-Coverage:** Checkov 3.x hat **keinen** docker-compose-Framework mehr (live verifiziert, `iac.go:16-26`) — JiMesh schiffte deshalb vier versionierte Custom-Policies auf Checkovs yaml-Framework mit: `CKV_JIMESH_COMPOSE_1` (privileged), `_2` (docker.sock-Mount), `_3` (unbound Port-Binds), `_4` (host-PID/IPC/NET-Namespace) — `internal/scanner/policies/ComposePrivileged.py:1-16`, `ComposeDockerSocket.py:1-12`, `ComposeUnboundPort.py:1-13`, `ComposeHostNamespace.py:1-11`. Stock-Frameworks (dockerfile/kubernetes/terraform/cloudformation) laufen regulär (`deploy/scan/README.md:15-18`).
* **Finding-Shape:** `IaCFinding{CheckID, CheckName, Severity, File, LineStart, LineEnd, Resource}` (`iac.go:81-89`) — **inklusive Dateipfad (workspace-relativ)** und Zeilenbereich; Inhalt wird bewusst NICHT übernommen („reference, not quotation“, :76-80).
* **Persistenz & Oberflächen:** Findings → `security_events` (type `iac_finding`, `quarantine.go:325-340`), Audit-Log über `/api/sdk/logs` mit `alias=checkov` (:588-615), HITL-Release `POST /api/security/quarantine/release` (`projects_ssh.go:2329-2330`). Das Verdict reist als `securityGate` im Deploy-Response (:2371, `QuarantineGateResult` `quarantine.go:75-86`). Frontend existiert: `/security/scans/iac` (`src/frontend/src/App.tsx:557-560`, `SecurityScansPage.tsx:175-179`), liest `GET /api/security/events` (`SecurityScansPage.tsx:117-119`).
* **Was das Gate NICHT ist:** Es ist ephemeral (nur im Deploy-Moment), indexiert keine Dateien, kennt keine Dateiliste, hat kein Browse-UI für die IaC-Files selbst und verknüpft nichts mit Deployments/Containern. Scanner-Ergebnisse hängen lose über den Dateipfad im Finding — ohne Datei-Index ist keine stabile „File → Findings“-Referenz möglich.

### 2.4 Container-Discovery heute — drei getrennte Mechaniken

1. **`internal/discovery` (Container-Events):** `DiscoveredContainer{id, name, image, status, ports, labels, isMcp, isAgentTool}` (`discovery.go:25-35`) — inkl. **Agent-Labels** `mcp=true` / `jimesh.agent.tool=true` (:32-33). Quellen: `docker events --format json` über SSH (:96) und `docker ps`-One-Shot (:186-187); In-Memory-Registry (:37-45), Routen `GET /api/discovery`, `POST /api/discovery/scan`, `GET /api/discovery/events` (SSE) (`discoveryhandlers.go:29-32`). **Grenze:** nutzt die **globalen** `ssh_host`/`ssh_user`-Settings (`discovery.go:66-77`) — ein einzelner globaler Host, nicht projekt-/node-gelogen.
2. **`POST /api/projects/discover`** (`projects_ssh.go:2656-2841`): lokaler `docker ps -a` über den gemounteten Socket (:2659), Name-Parsing `jimesh-framework-<key>-<runID>`/`jimesh-codeserver-<key>-<runID>` (:2715-2740), Workspace-Key-Auflösung über die `workspaces`-Tabelle (:2683-2704), Persistenz von Project- + Container-Rows (:2820-2833). Dokumentiert `docs/API_DOCS.md:1048`.
3. **Exposure-Attribution:** Project-Zuordnung eines Ports/Containers über die Namenskonvention `jimesh-framework-<id>-…` bzw. manuelle Zuordnung `POST /api/projects/{id}/ports/assign` (`docs/API_DOCS.md:1029, 684`).

**Für die Verknüpfung „IaC-File ↔ Container“ existiert heute:** Namenskonvention + Container-Rows + Port-Parsing. **Nicht existent:** das Lesen von Compose-Labels (`com.docker.compose.*`) oder Mount-Bind-Quellen per `docker inspect` (grep nach `docker inspect` zeigt nur Runtime-/State-Probes: `projects_ssh.go:1829-1830`, `subagents`-Status :177/:353 — keine Label-/Mount-Auswertung).

### 2.5 Deployments-API — Datenmodell mit IaC-Ankern, aber ohne Automatik

* `DeploymentRow{ID, ProjectID, Name, Type, RemotePath, Port, ConfigPath, Status, ChainID, AutoProvision, CreatedAt}` (`internal/store/deployments.go:6-18`). `remote_path` + `config_path` sind **die natürlichen Link-Felder** für „Deployment-Code ↔ Deployment“.
* CRUD-Routen: `GET/POST /api/projects/{id}/deployments`, `GET/PUT/DELETE …/{depId}`, `POST …/{depId}/redeploy` (`internal/deploy/deployments.go:12-119`; Registrierung `deploy.go:71-73`; dokumentiert `API_DOCS.md:494-499`) plus Querschnitt `GET /api/deployments` (`deploy.go:77-97`).
* **Ehrlicher Befund:** Die Deploy-Pipeline schreibt **keine** Deployment-Rows — `CreateDeployment` wird ausschließlich vom manuellen POST-CRUD gerufen (`deployments.go:40`), und die `redeploy`-Route setzt nur `status=building` (`deployments.go:115`) — sie löst keinen Deploy aus. Die Spalten `remotePath`/`configPath` werden heute von keiner Automatik befüllt.

### 2.6 Git-Anbindung — und die harte Grenze für „Git-Repos scannen“

* Vorhanden: `git fetch/reset/clone` nur im `jimesh`-Framework-Zweig mit **hartkodiertem** Remote `https://github.com/ji-podhead/jimesh.git` (`projects_ssh.go:253`, Clone :1783-1801); Credential-Store im State-Volume (:1841); Task-/User-Worktrees via `git worktree add -B` (`internal/deploy/workspace_integrity.go:350`) und Live-Status via `git worktree list --porcelain` (:415, Parser :528); Task-Routen `/api/projects/task/{start,status,apply,discard}` (`deploy.go:61-64`), Status „live state measured out of git (no mirrored task table)“ (`API_DOCS.md:1088`).
* **Harte Grenze (architektur-relevant):** `gitToken` wird **nie** persistiert (`projects_ssh.go:118-121`; Mandate 5, `MANDATES.md:76-77` „never stored in PostgreSQL“). Das Backend kann daher **fremde Repos nicht selbst klonen** — einen „Git-Scan“ gibt es nur als SSH-Kommando **auf dem vorhandenen Checkout des Nodes** (`git -C <ws> ls-tree …`) oder über die vom Operator bereitgestellten per-Request-Credentials (gleiche Klasse wie der `/api/projects/{id}/vlan`-POST-Body, `API_DOCS.md:1046`). Ein serverseitiger Clone-on-Demand ist ohne Neubau (Token-Tresor) unmöglich — das ist eine Design-Constraint, kein Implementierungsdetail.

### 2.7 Agent-Code heute (MCP / Snyk)

* **Backend-MCP-Provider:** `internal/mcpserver` — `server.go` registriert **13 Tools** (sessions ×2, DB/router ×3 `tools_infra.go`, jules ×2, linear ×2, github ×2 `tools_github.go:13-74`, DSH ×2 `tools_dsh.go`) (`server.go:36-52`). Standalone-Binary `cmd/jimesh-mcp` (Sprint 36 WP4, `cmd/jimesh-mcp/README.md:1-11`).
* **Welche MCP-Definitions-Dateien dieses Repo selbst benutzt:** `.mcp.json` (Claude Code, `mcpServers`-Key) und `~/.gemini/settings.json` (`mcpServers`-Key) — `cmd/jimesh-mcp/README.md:130-164`. Das ist die im Repo dokumentierte/verwendete Konfigurationsform für MCP-Server-Definitionen.
* **Agent-Container-Labels:** `discovery.go:32-33` klassifiziert Container mit `mcp=true` / `jimesh.agent.tool=true` als MCP-/Agent-Tool-Container — heute aber ohne UI-Verwertung in einer Agent-Code-Sicht.
* **Snyk: 0 Code.** Grep über das ganze Repo: einziger Treffer `docs/FEATURE_ROADMAP.md:188` — offener Roadmap-Punkt „Security Audit — npm audit, snyk“. Keine CLI-Anbindung, keine Konfig-Verarbeitung, kein Route.

### 2.8 Repo-eigene IaC (Referenzmaterial, kein Workspace-Scan-Ziel)

`deploy/scan/docker-compose.yml` + `deploy/scan/checks/` (Operator-Scan-Profil, `deploy/scan/README.md:1-33`), `deploy/siem/docker-compose.yml` (TASK-102, Zeile 15), `deploy/datalake/docker-compose.yml`, `deploy/topology.yml` (Ports/Hostnames-SSOT, :1-8), `deploy/deployments/<profile>.yml` (Deployment-Profile), `deploy/ansible/` (Playbooks + Runner; Node-Deploy über Ansible, `Makefile:196-219`). Wichtig für das Realitätsbild: **Die Haupt-Stack-Orchestrierung ist seit 16.9. keine Compose mehr** — `deploy/docker-compose.yml` wurde entfernt („standing directive: no compose anywhere, not even local dev“, `Makefile:28-31`), der lokale Stack läuft über `src/scripts/local-stack.sh` (raw `docker` CLI, :2-4). Der `docker compose up -d`-Pfad des `jimesh`-Frameworks (:1803-1804) zielt deshalb auf die Historie des geklonten Monorepos (sein Kommentar verweist auf die alte Root-Compose-Bindung, :1793-1797) — ein Workspace kann trotzdem beliebige eigene Compose-Files enthalten; die Discovery klassifiziert, was liegt.

### 2.9 Frontend heute

* Workspaces-Sub-Nav: `/workspaces`, `/workspaces/apps`, `/workspaces/endpoints`, `/workspaces/deployments`, `/workspaces/settings`, `/workspaces/networks` (`App.tsx:590-612`); `/projects` redirected nach `/workspaces` (:505).
* `WorkspaceDeploymentsPage` (`/workspaces/deployments`): Task-053-Seite über `GET /api/projects/{id}/deployments` + Redeploy-Mutation (`WorkspaceDeploymentsPage.tsx:28-33, 61-100`) und **einzige Workspaces-Page, die dem globalen Scope folgt** (:68-72).
* `WorkspaceAppsPage`: flache Apps-Sicht über `/api/workspaces` + `/api/discovery`, Scan-Button-Mutation gegen `POST /api/discovery/scan` (`WorkspaceAppsPage.tsx:25-37, 70-101`) — das „Rescan“-Interaktionsmuster, das die IaC-Liste übernehmen kann.
* Security-Scans (IaC-Tab) existiert (2.3) — ist aber Findings-zentriert, nicht Datei-zentriert.
* IA-Referenz: FE-IA-SPEC definiert Overview-Ebenen (Ebene 3 Project-Overview: Deployments/Ports/VLAN/Secrets/Access, `FE-IA-SPEC.md:279-287`) und Sidebar-Einträge je Project („Deployments → /workspaces/deployments (Scope project)“, :316).

### 2.10 Namensraum-Hinweis

`/api/discovery/status` und `/api/discovery/sync` (`gateway.go:295-296`) sind **Modellkatalog-Sync** (Provider-Katalog, `gateway.go:1850-1872`, Status-Stub :2485-2488) — nicht Container-Discovery. Neue IaC-Routen sollten diesen Namensraum nicht berühren (Abschnitt 5).

---

## 3 Discovery-Architektur (Soll)

### 3.1 Kernentscheidung: SSH-Datei-Scan ist Primärquelle; `git ls-tree` ist Zusatzsignal

**Beide Modi sind nötig, aber nicht gleichwertig, und beide laufen über dieselbe SSH-Sitzung auf dem Node — kein zweiter Transport.**

| | Modus „node“ (SSH `find`) | Modus „git“ (`git ls-tree` via SSH) |
|---|---|---|
| Wahrheit über | was der Container **wirklich mountet** (inkl. untracked/lokal erzeugter Files) | was Git **trackt** (Repo-View, unabhängig von lokalem Dreck) |
| Vorlaufbedingung | Checkout existiert auf dem Node (`projects.workspace_path` befüllt nach Deploy, 2.2) | Checkout ist ein Git-Repo (immer wahr nach Worktree-/Clone-Pfad, 1.1) |
| Blinde Flecken | nichts außerhalb des gemounteten Pfads | untracked Dockerfiles/compose-Files unsichtbar |
| Beleg der Fähigkeit | read-only-SSH-Probes existieren mehrfach (2.1.3) | `git`-Plumbing über SSH existiert (`worktree list --porcelain`, 2.6) |
| Rolle in v1 | **Primär** (Liste = was gemountet läuft) | **Ergänzung**: `gitTracked`-Flag pro File + Branch-Kontext |

**Abgelehnte Alternative:** ein serverseitiger Clone pro Project. Grund: `gitToken` ist nicht persistiert (2.6) und `deployGitRemoteURL` ist hartkodiert auf das JiMesh-Repo (`projects_ssh.go:253`) — für fremde Repos wäre das ein Neubau (Token-Tresor + Clone-Verwaltung), der das bestehende „der Code liegt auf dem Node“-Modell untergräbt. Falls der Operator später Repo-Scans ohne Node-Checkout will, ist das ein separater Sprint (Abschnitt 9).

### 3.2 Modus „node“ — Scan-Kommando (Entwurf)

Ein einzelnes, read-only, `timeout`-begrenztes Kommando über die gepoolte Session bzw. `dialSSH` (Muster wie `node_provision.go:102-130` + Budget-Muster `quarantine.go:60-69`):

    timeout 60 find <workspacePath> -maxdepth 8 \
      \( -name .git -o -name node_modules -o -name .jimesh -o -name .terraform \) -prune -o \
      -type f \( \
          -name 'Dockerfile*' -o -name '*.dockerfile' \
          -o -name 'docker-compose*.yml' -o -name 'docker-compose*.yaml' \
          -o -name 'compose*.yml' -o -name 'compose*.yaml' \
          -o -name '*.tf' -o -name '*.tfvars' \
          -o -name '*playbook*.yml' -o -name 'ansible*.yml' -o -name 'site.yml' \
          -o -name '.mcp.json' -o -name '.snyk' \
        \) -printf '%p\t%s\t%T@\n'

* **Prune-Regeln sind bewusst:** `.jimesh` enthält die Task-/User-Worktrees (`projects_ssh.go:124, 133`) — sie würden sonst dieselben Files mehrfach listen; Worktrees scannen ist ein **expliziter** Modus-Parameter (3.5).
* **Begrenzungen, die die Spec ehrlich macht:** `-maxdepth` (kein unbegrenzter Baum auf fremden Nodes), `timeout` (exit 124 = Scan abgebrochen → ehrlicher `failed`-Status, analog Gate-Fail-Open-Diskiplin `quarantine.go:561-564`), keine Content-Indizierung (3.7).
* Local-Node-Sonderfall: `isLocalAddress` (`projects_ssh.go:1163`) → `sh -c` lokal statt SSH (identisch zum lokalen Branch jeder bestehenden SSH-Route, z. B. `node_provision.go:134-138`).

### 3.3 Modus „git“ — Ergänzungs-Kommando (Entwurf)

    git -C <workspacePath> rev-parse --abbrev-ref HEAD
    git -C <workspacePath> ls-tree -r HEAD --name-only

Die Menge wird in Go mit derselben Klassifikations-Regel (3.4) gefiltert; Ergebnis liefert pro File den Zusatz `gitTracked: true` und den `branch`. Für den Inhalt im Git-Modus: `git -C <ws> show HEAD:<path>`. Modus „git“ allein ist keine vollwertige Discovery (untracked Files fehlen) — die API erlaubt beide Modi separat, das UI zeigt den node-Scan als Basis und markiert Git-Abweichungen („nur in Git / nur auf Disk“).

### 3.4 Klassifikation ohne neue Dependencies

Filename-Muster klassifizieren grob (dockerfile / compose / terraform / ansible / agent_mcp / snyk), Feinklassifikation durch Go-Parsing des Inhalts **on demand** (nur bei Detail-View/Link-Bestätigung): z. B. YAML-Subset-Parser nach dem Repo-Präzedenz `gateway/dsh_import.go:62-176` (`parseSimpleYAML` — Mandate 7: „no new dependencies without need“, `MANDATES.md:100-102`; Compose-Service-Keys, Ansible `hosts:`-Key, `mcpServers`-Key). Terraform bleibt v1 rein pfadbasiert (`*.tf`) — ein HCL-Parser ist explizit Nicht-Ziel (Abschnitt 9).

### 3.5 Scan-Scope und Worktree-Projektion

Basis ist `projects.workspace_path` (Haupt-Checkout). Optionaler Scope-Parameter deckt die Mount-Projektion des Deploy-Vertrags ab, mit denselben Helfern der Deploy-Pipeline:

* `worktree=task:<taskId>` → `taskWorktreePath(workspacePath, sid)` (`workspace_integrity.go:79-81`, Verwendung `projects_ssh.go:1236`), Existenz-Regel wie im Deploy: fehlender Worktree = laut ablehnen, kein Fallback auf den Haupt-Checkout (:1295-1299).
* `worktree=workspace:<wsId>` → `userWorktreePath(...)` (`workspaces.go:40-44`, Verwendung :1263-1274; Pfad stammt autoritativ aus der `workspaces`-Row).

### 3.6 Persistenz: neue Tabelle `iac_files` (Vorschlag)

Ein File-Index muss Restart-sicher sein (Mandate 3, `MANDATES.md:44-52`); dafür reicht die Settings-Tabelle nicht (nur K/V; `API_DOCS.md:684` nennt dieses Muster explizit als bewussten Sonderweg). Vorschlag nach dem Ensure-Muster `EnsureWorkspacesTable` (`store/workspaces.go:50-88`):

    CREATE TABLE IF NOT EXISTS iac_files (
      id            BIGSERIAL PRIMARY KEY,
      project_id    VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      workspace_id  TEXT DEFAULT '',
      node_host     TEXT DEFAULT '',
      workspace_path TEXT NOT NULL,
      mode          TEXT NOT NULL,                  -- 'node' | 'git'
      branch        TEXT DEFAULT '',
      path          TEXT NOT NULL,                  -- relativ zu workspace_path
      kind          TEXT NOT NULL,                  -- dockerfile|compose|terraform|ansible|agent_mcp|snyk|other
      size_bytes    BIGINT DEFAULT 0,
      mtime_unix    BIGINT DEFAULT 0,
      content_sha256 TEXT DEFAULT '',               -- Referenz, nie der Inhalt
      git_tracked   BOOLEAN DEFAULT FALSE,
      container_refs TEXT DEFAULT '[]',             -- JSON: [{containerId,name,source}]
      discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (project_id, workspace_path, path, mode)
    );

* `content_sha256` macht Drift sichtbar (File geändert seit letztem Scan) **ohne** Inhalt zu speichern (3.7).
* `workspace_path` im Key erlaubt dieselbe Datei in Haupt-Checkout vs. Worktree als eigene Zeile mit klarer Projektion.
* Container-Links (Abschnitt 4) werden als JSON-Snapshot mitgespeichert — der Link-Zustand zum Scan-Zeitpunkt; ein Frisch-Scan überschreibt.

### 3.7 Trigger, Budgets, Redaction

* **Trigger v1:** manuell — Rescan-Button (Mutation-Muster `WorkspaceAppsPage.tsx:95-101`) + optional Auto-Rescan beim Öffnen, wenn `discovered_at` zu alt ist (Policy-Entscheid im Sprint). **v2-Seam:** das IaC-Gate hat beim Deploy ohnehin `workspacePath` in der Hand (`gateContext.workspacePath`, `projects_ssh.go:2237`) — eine Deploy-Zeit-Erkennung wäre ein Zusatz-Schritt im selben Pfad; in dieser Spec nur als Naht markiert, nicht entworfen.
* **SSH-Credentials:** wie `/api/projects/{id}/monitoring` — projekt-scoped Settings `ssh_<id>_*` mit globalem Fallback (`API_DOCS.md:686-688`); **keine** Credentials per Query-String (das `/ports`-Muster, `API_DOCS.md:683`, wird bewusst nicht kopiert).
* **Redaction-Diskiplin (Mandat):** Der **Inhalt** wird nie indexiert, nie persistiert — nur Hash, Größe, mtime. Live-Read (Abschnitt 5) holt Inhalt on demand mit Größen-Cap. Begründung aus dem Bestand: Findings tragen „reference, not quotation“ (`iac.go:76-80`), und Workspace-Dateien können Secrets enthalten (`projects_ssh.go:1354-1362` behandelt genau dieses Risiko generell).

---

## 4 Verknüpfung: IaC-File ↔ Container ↔ Deployment

### 4.1 Container-Links

1. **v1 — Namenskonvention (alles vorhanden):** Ein `jimesh-framework-<key>-<runID>`-Container des Projekts verweist per Container-Row (`SaveContainerForWorkspace`, :2192-2196) und Name-Parsing (:2715-2740) auf das Project; die Workspace-Auflösung über die `workspaces`-Row existiert (:2683-2704). Ein gefundenes Dockerfile/Compose-File im Workspace wird mit den Container-Rows desselben nameKey verlinkt (`source: "name-convention"`).
2. **v1.1 — `docker inspect`-Pass (neu, klar markiert):** Für Compose-Stacks (Framework `jimesh`) gibt es **keinen** Single-Workspace-Container (dokumentierte Limitation: `frameworkStartsWorkspace` `projects_ssh.go:294-311`, Security-Note :2318-2321). Der Brückenschlag ist ein zweiter read-only SSH-Befehl:

       docker inspect -f '{{.Name}}\t{{index .Config.Labels "com.docker.compose.project"}}\t{{index .Config.Labels "com.docker.compose.project.working_dir"}}\t{{index .Config.Labels "com.docker.compose.project.config_files"}}\t{{json .Mounts}}' $(docker ps -aq)

   Compose-Labels benennen Project/Working-Dir/Config-Files direkt; `Mounts` verbindet per Bind-Source == `workspacePath` auch Non-Compose-Container (z. B. `-v <workspacePath>:/workspace`, :1714-1720). `source: "compose-label" | "mount"`. **Beleg der Neuartigkeit:** keine Inspect-Label-/Mount-Auswertung existiert heute (2.4).
3. **Ehrliche Grenze (bleibt bestehen):** Für `jimesh`-Compose-Stacks bleiben Egress-/socket-guard-familige per-Container-Zusagen unwired (TASK-019, :2320) — das betrifft nicht die Discovery, aber die UI soll den Stack-Charakter anzeigen statt einen Schein-Container zu suggerieren.

### 4.2 Deployment-Links

* **Datenmodell vorhanden:** `deployments.remote_path`/`config_path` (`store/deployments.go:11-13`). Vorschlag v1: Der Scan **schlägt** eine Verknüpfung vor, wenn `remotePath == workspacePath` (oder Pfad-Präfix-Match) und zeigt sie als Referenz; Bestätigung = `PUT /api/projects/{id}/deployments/{depId}` mit `configPath` (Route existiert, `deployments.go:77-89`). Damit bleibt die Deployments-API die Autorität und der Scan liest nur.
* **Alternative (Verhaltensänderung, Sprint-Entscheid):** die Deploy-Pipeline schreibt künftig selbst `DeploymentRow`s (`remotePath` = `workspacePath`, `configPath` = gefundenes Compose-File). Beleg, dass das heute fehlt: `CreateDeployment` wird nur vom manuellen CRUD gerufen (2.5). Bis dahin sind Deployment-Links „best effort über remotePath“ und die UI darf keine automatische Verknüpfung suggerieren (Mandate 2).

---

## 5 API-Design (Soll)

Registrierung nach dem Register-Muster in `internal/deploy/deploy.go:48-78`; Dokumentationspflicht `docs/API_DOCS.md` (Mandate 1, `MANDATES.md:10-15`). Alle Routen read-only außer dem Scan-Trigger; das Policy-Gate (`internal/policy/policy.go:105-122`, Prefix-Basis) prüft, ob neue Routen `IsAdminMutation`-Behandlung brauchen.

### 5.1 Routen

| Methode | Pfad | Zweck |
|---|---|---|
| `GET` | `/api/projects/{id}/iac-files?mode=node\|git&kind=…` | persistierter Index (aus `iac_files`), **kein** Node-Kontakt |
| `POST` | `/api/projects/{id}/iac-files/scan` | Scan auslösen; Body optional `{mode?, worktree?}`; SSH wie `/monitoring` (projekt-scoped Settings, globaler Fallback) |
| `GET` | `/api/projects/{id}/iac-files/{fileId}` | Detail: Metadaten + **live gelesener** Inhalt (Cap) + Findings-Bezug + Container-/Deployment-Links |
| `GET` | `/api/projects/{id}/iac-files/{fileId}/raw` | Inhalt als `text/plain` (Viewer/Download-Option) — optional, v1.1 |

`fileId` = numerische `iac_files.id` (stabil, Restart-sicher). Project unbekannt → `404` (Muster `handleProjectDelete`, `projects_ssh.go:2909-2912`).

### 5.2 Response-Shapes (Beispiele)

**GET …/iac-files** (ehrlicher Leerzustand nach Mandate 2):

    {
      "projectId": "prj-1",
      "workspacePath": "/srv/project",
      "scannedAt": "2026-09-16T10:00:00Z",      // leer, wenn nie gescannt
      "files": [
        {
          "id": 42,
          "kind": "compose",
          "path": "deploy/scan/docker-compose.yml",
          "sizeBytes": 1873,
          "mtimeUnix": 1789500000,
          "gitTracked": true,
          "branch": "main",
          "contentSha256": "…",
          "discoveredAt": "2026-09-16T10:00:00Z",
          "mode": "node",
          "workspaceId": "",                     // nur bei Worktree-Scan gesetzt
          "containerRefs": [{"containerId":"abc123","name":"jimesh-framework-prj-1-12345","source":"name-convention"}],
          "findingCount": 3                       // Join gegen security_events (iac_finding), File-Pfad-Match (2.3)
        }
      ],
      "kinds": {"dockerfile": 2, "compose": 1, "terraform": 0, "ansible": 0, "agentMcp": 1, "snyk": 0},
      "errors": []                                // Scan-Teilausfälle, nie still verschluckt
    }

**POST …/scan** — Antwort wie GET plus `scan: {mode, workspacePath, durationMs, commands: […], notice}` (Kommando-Transparenz im Stil des Deploy-Response-`output`, :2359) und `502` bei SSH-Versagen (Semantik wie `/ports`, `API_DOCS.md:683`).

**GET …/iac-files/{fileId}** — Metadaten wie oben, zusätzlich:

    {
      "content": "services:\n  backend: …",       // live, Größen-Cap (z. B. 256 KiB; überschritten → contentTruncated)
      "contentTruncated": false,
      "findings": [ {"checkId":"CKV_JIMESH_COMPOSE_2","checkName":"…","severity":"CRITICAL","lineStart":12,"lineEnd":12} ],
      "deployments": [ {"id":7,"name":"…","status":"stopped","linkConfirmed":false} ],
      "agentHints": {"serverNames":["jimesh"]}     // nur bei kind=agent_mcp; Namen, KEINE env-Werte (Abschnitt 7)
    }

### 5.3 Fehler-Semantik (aus dem Bestand abgeleitet)

* `400` unbekannter `mode`/`worktree`-Form, `404` unbekanntes Project/File, `409` Scan läuft bereits (Idempotenz-Guard), `502` SSH-/Kommando-Fehlschlag mit echtem stderr-Ausschnitt (Muster `node_provision.go:143-149`), `200` mit `errors[]` für Teilausfälle. Ein fehlgeschlagener Scan **überschreibt** den alten Index nicht (alter Stand bleibt sichtbar + `errors` weist darauf hin) — fail-open ohne Lüge, analog Gate-Diskiplin `quarantine.go:561-564`.

---

## 6 UI-Konzept (Soll)

### 6.1 Einhängepunkt — Project-Overview, „Deployment Code“

Anknüpfung an FE-IA-SPEC Ebene 3 (Project-Overview, `FE-IA-SPEC.md:279-287`): dort bekommt das Project eine **„Deployment Code“-Sektion** (neben Deployments/Ports/VLAN). Route nach der Sub-Nav-Konvention: **`/workspaces/iac`** mit `?project=<id>`-Seed und Scope-Follow wie `WorkspaceDeploymentsPage.tsx:68-72`; Sidebar-Eintrag unterhalb des Projects analog „Deployments“ (`FE-IA-SPEC.md:316`). Die File-Detail-Seite ist `/workspaces/iac/<fileId>` (Klick aus der Liste). Sobald die FE-IA-SPEC-Project-Overview umgesetzt ist, verlinkt dieselbe Sektion in der Overview-Karte hierher — diese Spec ändert nichts an der IA-Hierarchie, sie hängt nur eine File-Ebene darunter an.

### 6.2 Listenansicht („References“-Charakter)

* Gruppierung nach `kind` (Dockerfiles, Compose, Terraform, Ansible, Agent-Code, Sonstige).
* Spalten: Pfad (mono, truncate), Branch + `gitTracked`-Badge („nur auf Disk“ wenn `gitTracked=false`), Größe/mtime, **Container-Ref-Badges** (Name + `source`-Kürzel), **Findings-Badge** (CRITICAL/HIGH-Zählung; Klick → File-Detail-Findings bzw. `/security/scans/iac`).
* Scan-Button + `scannedAt`-Anzeige (Muster `WorkspaceAppsPage.tsx:95-101`); Rescan pro Worktree (Scope-Param 3.5).
* Ehrliche Leer-/Fehlerzustände: „nie gescannt“ (kein Datei-Fabrikat), „Checkout auf dem Node nicht gefunden“ (Workspace-Path aus `/api/projects` anzeigen, :2870), „Scan fehlgeschlagen: <Grund>“.

### 6.3 IaC-File-Overview-Seite (Klick-Ziel)

* Kopf: Pfad, kind-Badge, Branch, `workspacePath`-Kontext (welcher Node/Checkout), `contentSha256` + mtime (Drift-Hinweis, wenn ≠ letzter Scan).
* **Inhalts-Viewer:** read-only, mono, Zeilennummern (relevant für Findings-Zeilenbezüge `LineStart/LineEnd`, `iac.go:81-89`); Cap-Hinweis bei Truncation. Für `kind=agent_mcp`: Viewer nur mit env-Redaction-Warnung oder v1 ganz ohne Inhalt — nur erkannte Server-Namen (Abschnitt 7).
* **Findings-Sektion:** die `security_events`-`iac_finding`-Rows zu diesem Pfad (gleicher Join wie 5.2), Deeplink `/security/scans/iac` — die beiden Sichten ergänzen sich: Scans-Seite = zeitliche Findings-Historie, diese Seite = datei-zentriert.
* **„Verwendet von“ (References):** Container-Badges (Kontext `/workspaces/apps` bzw. App-Overview, FE-IA-SPEC Ebene 4, :289-293) und Deployment-Zeilen (Verweis `/workspaces/deployments`), mit `linkConfirmed`-Kennzeichnung (4.2).
* **Aktionen (nur existierende Infrastruktur):** Rescan; SSH-Config-Anzeige (lesend, `GET /api/projects/{id}/ssh-config` — Booleans only, `API_DOCS.md:687`); Tunnel-Hinweis, falls ein Port aus dem Compose-File geparst wurde (Tunnel-Route existiert, `deploy.go:67`). Kein „Bearbeiten/Deployen aus dieser Seite“ — das ist Neuland und gehört in einen Sprint-Beschluss (Abschnitt 9).

### 6.4 Navigation zwischen den Ebenen

* Scope-Chip + Breadcrumb-Kette nach FE-IA-SPEC 2.4 (`FE-IA-SPEC.md:333+`): App ← Project (IaC) ← Workspace ← Target ← All. Aus der File-Detail-Seite führen die References zurück nach oben (Deployment-Liste, Apps), aus der Project-Overview führt „Deployment Code“ hinunter.
* i18n: eigener Schlüssel-Namensraum `wsIac.*` analog `wsDeployments.*` (`src/frontend/src/i18n/locales/de.json`; Nutzungsmuster `WorkspaceDeploymentsPage.tsx:97,105-164`).

---

## 7 Agent-Code-Erkennung (Soll, vorsichtig)

### 7.1 MCP-Server-Definitions-Dateien

* **Erkennungs-Muster (an den im Repo dokumentierten Formen orientiert):** `.mcp.json` im Workspace-Root (Key `mcpServers`) — die Claude-Code-Form; `~/.gemini/settings.json` (`mcpServers`-Key) — die Gemini-CLI-Form; beides ist die im Repo selbst verwendete Konfiguration (`cmd/jimesh-mcp/README.md:130-164`). Als **Kandidaten** zusätzlich: `.claude.json`, `.cursor/mcp.json` (gelistet als Heuristik, **nicht** durch Repo-Beleg gedeckt — im Sprint verifizieren oder streichen).
* **Auswertung:** nur Server-**Namen** und Command-Binaries aus `mcpServers` extrahieren (Go-Subset-Parser, 3.4). **Env-Werte werden nie gelesen, nie angezeigt** — ein `.mcp.json` kann per env Provider-Keys weiterreichen; Mandate 9 („Agents never receive plaintext API keys“, `MANDATES.md:119-132`) zwingt zur Namen-only-Sicht. `agentHints` im API-Shape (5.2) ist bewusst auf `serverNames` beschränkt.
* **Container-Sicht ergänzt Files:** Container mit `mcp=true`/`jimesh.agent.tool=true` (`discovery.go:32-33`) erscheinen in derselben „Agent-Code“-Gruppe als laufende Referenz — Files (definiert) und Container (lebt) nebeneinander.

### 7.2 Snyk

* **Ist-Zustand:** keine Snyk-Integration im Backend, kein Route, keine Config-Verarbeitung — der einzige Repo-Beleg ist der offene Roadmap-Punkt `docs/FEATURE_ROADMAP.md:188`. Diese Spezifikation erfindet keine Snyk-API.
* **Was trotzdem realistisch ist:** `.snyk`-Policy-Dateien sind reines **File-Matching** im selben `find`-Scan (3.2) → `kind=snyk` in der Liste, Detail-View wie jede andere Datei. Eine echte Snyk-Anbindung (CLI im Scanner-Stil, Ergebnisse → `security_events`) wäre eine neue Scanner-Stage nach dem bestehenden TASK-059-Muster (`quarantine.go`, Pins `iac.go:40-46`) und gehört in einen eigenen Sprint — vorhandene Alternativen im Repo: checkov/gosec/trivy (2.3).

### 7.3 Grenzen

* Agent-Configs sind produktabhängig und verändern sich; die Spec matcht bewusst nur die zwei repo-evidenten Formen + zwei klar markierte Heuristik-Kandidaten (7.1). Alles Weitere erst mit Beleg.
* MCP-Server-Definitionen an **anderen** Orten (Node-`$HOME`, Container-Images) sind Nicht-Ziel: Die Discovery scannt den Workspace-Checkout (der Deploy-Vertrag, 1.1), nicht das Node-Home.

---

## 8 Existiert vs. fehlt (Kompakt-Tabelle)

| Fähigkeit | Status | Beleg |
|---|---|---|
| SSH-Pool mit `Exec` pro Project | ✅ | `network/tunnel.go:38,117,194` |
| Per-Request-Dial im Deploy-Pfad | ✅ | `projects_ssh.go:1150-1156`, `node_provision.go:141-147` |
| Read-only-Probes über SSH (Muster für Scan) | ✅ | `tunnel.go:230-231`, `exposure.go:876-892`, `ssh_provider.go:18-19,207` |
| Workspace-Path persistiert pro Project | ✅ | `projects_ssh.go:2130-2149`, `store/store.go:607` |
| Worktree-Pfad-Helfer + Existenz-Regeln | ✅ | `workspace_integrity.go:79-81,350`, `workspaces.go:40-49`, `projects_ssh.go:1295-1305` |
| IaC-Scan (Checkov + Compose-Policies + SAST) beim Deploy | ✅ | `quarantine.go:295-301,425-480`, `scanner/iac.go:40-46,196-203`, `policies/Compose*.py` |
| Findings mit Dateipfad/Zeilen persistiert | ✅ | `iac.go:81-89`, `quarantine.go:325-340`; UI `/security/scans/iac` (`App.tsx:559`) |
| Container-Discovery + Agent-Labels | ✅ | `discovery.go:25-35` (Labels :32-33), `projects_ssh.go:2656-2841` |
| Deployments-CRUD mit `remotePath`/`configPath` | ✅ | `store/deployments.go:6-18`, `deployments.go:12-119` |
| Git-Plumbing über SSH (worktrees, Live-Status) | ✅ | `workspace_integrity.go:350,415,528` |
| MCP-Provider (13 Tools) + Config-Formen `.mcp.json`/`settings.json` | ✅ | `mcpserver/server.go:36-52`, `cmd/jimesh-mcp/README.md:130-164` |
| **IaC-File-Discovery** (`find` über SSH) | ❌ fehlt | grep: kein Remote-Datei-Listing im Backend (2.1.4) |
| **`git ls-tree`-Repo-Scan** | ❌ fehlt | grep: 0 Treffer (2.6) |
| **`iac_files`-Index-Store** | ❌ fehlt | `store/` hat nur projects/containers/workspaces/deployments/project_vlans (2.2/2.5) |
| **`/api/projects/{id}/iac-files*`-Routen** | ❌ fehlt | `deploy.go:48-78` + `gateway.go`-Register — keine solchen Routen |
| **Live-File-Content-Endpoint** | ❌ fehlt | grep `cat`: nur config.json-**Schreib**-Pfade (`projects_ssh.go:1342,1349`) |
| **Container-Linking via compose-Labels/Mounts** | ❌ fehlt | `docker inspect`-Nutzung nur Runtime/State (`projects_ssh.go:1829-1830`) |
| **Auto-Befüllung `deployments.remotePath`** | ❌ fehlt | `CreateDeployment` nur im manuellen CRUD (`deployments.go:40`) |
| **Agent-File-Erkennung (MCP-Defs/`.snyk`)** | ❌ fehlt | grep `.mcp.json` nur im jimesh-mcp-README; `.snyk`: 0 Treffer |
| **Snyk-Integration** | ❌ fehlt | `docs/FEATURE_ROADMAP.md:188` (offen) |
| **Frontend IaC-Liste/-Detail** | ❌ fehlt | `App.tsx:485-618` — keine solche Route |

---

## 9 Nicht-Ziele & offene Punkte

* **Nicht-Ziele dieser Spec:** Secrets-Indizierung oder -Anzeige (Mandate 9), Auto-Deploy aus der IaC-Sicht, HCL-Parser, Snyk-CLI-Anbindung, MCP-Erkennung außerhalb des Workspace-Checkouts, Backend-seitiges Clonen fremder Repos (3.1).
* **Sprint-Entscheidungen offen:** (a) Deployment-Verknüpfung — Scan-Vorschlag + manuelle Bestätigung (v1, 4.2) vs. Deploy-Pipeline schreibt `DeploymentRow`s (Verhaltensänderung); (b) Deploy-Zeit-Hook der Discovery am Gate (3.7, v2-Seam); (c) Auto-Rescan-Policy; (d) Heuristik-Kandidaten `.claude.json`/`.cursor/mcp.json` verifizieren oder streichen (7.1).
* **Bestehende Limitationen, die diese Spec nicht behebt:** `jimesh`-Compose-Stack ohne Single-Container (TASK-019, `projects_ssh.go:2320`); `/api/discovery`-globaler-Host-Charakter (`discovery.go:66-77`) — die neue Discovery nutzt deshalb projekt-gelogene SSH-Config, nicht die globale Discovery-Registrierung.
* **Dokumentationspflicht bei Umsetzung (Mandate 1):** neue Routen → `docs/API_DOCS.md`; Sprint-Plan → `docs/sprints/`; Backlog-Mirror → `docs/backlog/BACKLOG.md`. Diese Spec selbst ist der Plan-Seed.
