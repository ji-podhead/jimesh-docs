# SPRINT-59 — Drei bestätigte Deploy-Flow-Lücken

**Status:** 🟡 Umsetzung 2026-09-28 (zweiter Durchgang). Item 1 (Projekt-Löschung) und die
Browser-Integration-Fehlplatzierung (separater Fund, siehe unten) sind mit echtem Code behoben.
Item 3 (Dashboard-Services) bleibt architektonisch blockiert — siehe Abschnitt "Umsetzung" für
den genauen Befund und warum ein Hack hier bewusst nicht gebaut wurde.

---

## 1. Projekt-Löschung unerreichbar (bestätigt, kein neuer Fund — F13 aus `audit.md`)

`App.tsx` importiert `ProjectsPage` (mit dem echten `DeleteProjectDialog`), rendert sie aber nie
— `/projects` ist nur `<Navigate to="/workspaces" replace />`. Die einzige funktionierende
Lösch-UI ist im toten Code gefangen.

## 2. Kein Deploy-Time-Integrations/Plugin-Picker

Operator: "wieso kann man nicht gleich Integrations oder Plugins oder whatever dazudeployen" beim
Anlegen eines Projects/Workspace. Kein Code gefunden, der das tut — der Deploy-Dialog
(`WorkspaceDeployAppDialog.tsx`) kennt nur `TOOL_OPTIONS` (gcc/python/node/.../chromium/playwright),
keine Plugin-/Integrations-Auswahl. Müsste geprüft werden, ob das am fehlenden generischen
Plugin-Lifecycle (audit.md P1, `#107 Plugin-Registry-API` — Install-Persistenz ist No-Op-Stub)
hängt, bevor man eine UI dafür baut, die nichts Echtes dahinter hat.

## 3. Dashboard-Node-Provisioning kennt die neue `services:`-Liste nicht

Heute gebaut: `config.yml`-Node-Eintrag mit `services: [grafana, ozone, ...]`, gelesen von
`render-inventory.py` → `.node-services`, konsumiert von `make deploy-all` (CLI-Weg).

**Bestätigt, echt geprüft:** `handleNodeProvision` (`internal/deploy/node_provision.go`) — der
auch vom Dashboard aus über `ssh_provider.go`s Wrapper läuft — installiert echt `runsc`/gVisor
automatisch, **kennt aber die `services:`-Liste überhaupt nicht.** Wer einen neuen Worker über
das Dashboard hinzufügt, bekommt Docker+Netzwerk+gVisor, aber NICHT die in `config.yml` für
diesen Node deklarierten optionalen Services — nur der CLI-Weg (`make deploy-all`) tut das
aktuell.

**Nächster Schritt:** `handleNodeProvision` (oder ein direkt anschließender Schritt im selben
Request) muss nach dem Docker/gVisor-Teil die für den Node in `config.yml` deklarierten Services
auslesen und ausrollen — derselbe `.node-services`-Mechanismus, nicht ein zweiter. Betrifft
denselben Code-Pfad wie CLI, da `ssh_provider.go` laut gestrigem Fund explizit ein dünner Wrapper
um dieselbe Pipeline ist (Mandat 11) — sollte an EINER Stelle gelöst werden, nicht zweimal.

---

## Umsetzung 2026-09-28

### 1. Projekt-Löschung — ERLEDIGT

`ProjectsPage.tsx` bleibt bewusst tot (sein State ist der alte lokale Projekt-Store aus der
Zeit vor TASK-053/084 — passt nicht mehr zur echten Workspaces-IA und zur
Server-Wahrheit-`GET /api/projects`). Statt sie wieder zu verdrahten, ist die Lösch-Aktion jetzt
dort, wo ein Projekt in der HEUTIGEN UI wirklich exponiert ist:

- `HierarchySidebar.tsx`s PROJECTS-Baum (`renderProjectRow`) hat pro Projekt schon ein
  `[⚙ Settings]`-Icon, das nach `/workspaces/projects/:projectId` navigiert
  (`ProjectDetailPage.tsx`) — die reale Projekt-Detailseite mit Tabs (Overview/Deployments/
  IaC/Secrets/Integrations) und einer "Quick Actions"-Zeile.
- `ProjectDetailPage.tsx` (`src/frontend/src/views/ProjectDetailPage.tsx`) hat jetzt einen
  "Delete project"-Button in dieser Zeile, der den echten, bereits vorhandenen
  `DeleteProjectDialog` (`components/projects/DeleteProjectDialog.tsx`) öffnet und beim Bestätigen
  `DELETE /api/projects/{id}` aufruft (derselbe Endpoint, den `ProjectsPage.tsx`s
  `handleConfirmProjectDelete` schon rief — verifiziert gegen `handleProjectDelete`,
  `internal/deploy/projects_ssh.go:3145`: löscht den DB-Row + kaskadiert Workspaces/Service-Keys,
  reportet VLAN-/Headscale-Leftover ehrlich, räumt aber NICHT node-seitig auf — das ist laut
  Backend-Kommentar explizit Aufgabe von `undeploy`).
- Best-effort node-seitiges Aufräumen: wird ein SSH-Endpoint gefunden, dessen `host` zum
  Projekt-`nodeHost` passt, feuert danach `POST /api/workspaces/undeploy` mit `purgeVolume`
  (derselbe zweite Call, den `ProjectsPage.tsx`s `triggerCleanup` nach dem Delete machte) — sonst
  bleibt das DB-Delete stehen und der node-seitige Leftover bleibt ehrlich ungekehrt (Mandate-2-Stil
  dieses Repos: kein erfundenes Aufräumen).
- Die GET-`/api/projects`-Zeile trägt mehr Felder (`framework`, `port`, `workspacePath`, …) als der
  schlanke `types/domain/hierarchy.ts`-`Project`-Typ deklariert — dieselbe
  Shape-Tolerant-Read-Lücke, die `HierarchySidebar.tsx`s `asProjectRow`/`asBrowserRuntimeProject`
  schon überbrücken; `ProjectDetailPage.tsx`s neue `toDeleteDialogProject()` macht dasselbe für
  den `DeleteProjectDialog`s `Project`-Typ (aus `DeploymentsDialog.tsx`).

Datei: `src/frontend/src/views/ProjectDetailPage.tsx`.

### 2. Browser-Integration-Nav zeigt auf die falsche Seite — separater Fund, ERLEDIGT

(Nicht identisch mit dem "Deploy-Time-Integrations-Picker"-Fund oben — ein zweiter, heute
verifizierter Fund: der Sidebar-Nav-Eintrag "Browser Integration" (`section-nav.ts`s
`workspaceItems`) öffnete `BrowserRuntimeModal` per `?browser=1` auf der Deployments-Seite
(`/workspaces/deployments`) — komplett getrennt vom echten Integrations/Plugins-Bereich
(`/plugins`, `PluginCatalogPage`/`PluginSettingsPage`/`ActiveDeploymentsSection`), obwohl
`/plugins` im selben Nav-Eintrags-Array direkt danebensteht.

`BrowserRuntimeModal` (`components/workspaces/BrowserRuntimeModal.tsx`) braucht KEINEN
Workspace/App-Kontext zwingend — sein `project`-Prop ist optional; ohne ihn fragt der Dialog
selbst nach Ziel-SSH-Endpoint + Projekt (dieselbe Select-UI, die `WorkspaceDeploymentsPage.tsx`
schon ohne Vorauswahl nutzte). Verschoben:

- `section-nav.ts`: der Eintrag zeigt jetzt auf `/plugins?browser=1` statt
  `/workspaces/deployments?browser=1`, direkt neben den bestehenden `/plugins`-Einträgen.
- `PluginCatalogPage.tsx` (`/plugins`) bekam den `?browser=1`-Handler (identischer
  useEffect-Pattern, 1:1 von `WorkspaceDeploymentsPage.tsx` übernommen) + einen
  "Open Browser Runtime"-Button im Seitenkopf, der `BrowserRuntimeModal` ohne `project`-Prop
  öffnet.
- `WorkspaceDeploymentsPage.tsx` verliert den Button + Handler + Modal-Render wieder (verschoben,
  nicht dupliziert) — die Seite bleibt sonst unverändert (Projekt-Auswahl, Deployment-Tabelle,
  Redeploy).
- `ActiveDeploymentsSection.tsx`s eigene, kontextgebundene `BrowserRuntimeModal`-Fallback-Kette
  (Terminal-Badge ohne echtes Terminal-Interface) bleibt unangetastet — anderer Use-Case
  (pro-Deployment-Fallback mit Projekt-Kontext, nicht der freie Einstiegspunkt).

Dateien: `src/frontend/src/lib/section-nav.ts`, `views/PluginCatalogPage.tsx`,
`views/WorkspaceDeploymentsPage.tsx`.

### 3. Dashboard-Node-Provisioning kennt `services:` nicht — BLOCKIERT (architektonisch, kein Hack gebaut)

Echt geprüft, ob `make redeploy SERVICE=<svc> NODE=<name>` aus dem laufenden Go-Backend-Prozess
heraus repliziert werden kann. Ergebnis: nein, nicht sauber, aus mehreren voneinander
unabhängigen Gründen — jeder für sich schon ausreichend:

1. **Produktions-Image ist distroless.** `src/backend/Dockerfile`s Runtime-Stage ist
   `gcr.io/distroless/static-debian12:nonroot` mit NUR der statischen `/server`-Binary — kein
   Shell, kein `docker`-CLI, kein `ansible`, kein `make`. Ein `exec.Command("sh", "-c", …)` (wie
   `node_provision.go`s eigener `isLocal`-Zweig es versucht) hat dort schlicht kein `/bin/sh` zum
   Aufrufen. Ein Shell-out zu `make redeploy` scheitert also schon am fehlenden Interpreter, ganz
   unabhängig von Docker-Zugriff.
2. **Der ganze `make redeploy`/`deploy-all`-Mechanismus ist "Operator-Desktop-als-Controller",
   nicht Server-seitig.** Er braucht (a) `config.yml` + `.env` im aktuellen Arbeitsverzeichnis
   (`.env` trägt laut `render-inventory.py`s eigenem Header-Kommentar bewusst NIE echte
   IPs/Secrets im Server-Filesystem — "real IPs/SSH users must never live in a tracked file"),
   (b) `$SSH_AUTH_SOCK` (SSH-Agent-Socket) + `~/.ssh/known_hosts` vom aufrufenden Rechner, (c) den
   `deploy/`-Ansible-Baum (Playbooks + pro-Service `ansible-task.yml`/`defaults.yml`) und (d) das
   einmalig lokal gebaute `jimesh-ansible-runner:local`-Image (`ansible-runner-build`) — alles
   Pfade/Dateien auf dem Rechner, der `make` aufruft, nie auf dem Server ausgerollt.
3. **`docker.sock` ist zwar gemountet, hilft hier aber nicht.** `deploy/backend/ansible-task.yml`
   mountet `/var/run/docker.sock` in den Backend-Container (bestätigt: der Prozess KANN also den
   lokalen Docker-Daemon des Nodes ansprechen, auf dem er selbst läuft). Das löst aber weder (1)
   noch (2): ein `docker run` des Ansible-Runners bräuchte Bind-Mounts von `config.yml`/`.env`/
   `deploy/`/SSH-Agent-Socket — Pfade, die auf DIESEM Host (dem Control-Plane-Node, auf dem das
   Backend läuft) nicht existieren, und selbst wenn sie es täten: `docker.sock` spricht nur den
   Daemon auf demselben Host — für einen ANDEREN (Worker-)Node, für den `services:` typischerweise
   gedacht ist, bringt das lokale Docker-Socket gar nichts; erreichbar ist ein entfernter Node
   ohnehin nur über SSH (dieselbe Grenze, an der `handleNodeProvision` schon über
   `dialSSH`/`runSSHCommand` arbeitet, nicht über Docker).
4. **Keine Identitäts-Brücke zwischen Dashboard-Node und `config.yml`-Node.** Das Dashboard kennt
   Nodes nur als SSH-Endpoints (`GET/PUT /api/settings/ssh_endpoints` — Name/Host/User/Port,
   verwaltet über `WorkspaceEndpointsPage`), `config.yml`s `nodes:`-Liste kennt Nodes nur über ihr
   eigenes `name:`-Feld (plus `${VAR}`-Referenzen in `.env`). Es gibt aktuell keine gemeinsame ID —
   selbst mit einem funktionierenden Deploy-Mechanismus müsste erst geklärt werden, welcher
   `config.yml`-Node-Name zu welchem SSH-Endpoint-Eintrag gehört.
5. **Keinen Go-nativen Ersatzpfad gefunden, der das nicht duplizieren würde.** `ssh_provider.go`
   (Mandat 11, "eine Pipeline, kein Rebuild") wrapped nur `executeDeploy` (Projekt-Container-Deploy),
   `handleProjectUndeploy` und `handleNodeProvision` — keiner davon deployt einen benannten
   Plattform-/Optional-Service wie `grafana`/`ozone`/`suricata-network-ids`. Diese Services leben
   ausschließlich als Ansible-Rollen unter `deploy/<service>/` (`ansible-task.yml` +
   `defaults.yml`), konsumiert nur über `deploy-service.yml` mit `-e service=<name>`. Eine
   Go-Reimplementierung jeder Rolle als SSH-Kommando-Kette wäre exakt die "zweite Stelle", die der
   Sprint-Fund selbst schon ausschließt (Mandat 11) — und bei >10 Services (siehe
   `deploy/{grafana,ozone,siem,suricata-network-ids,tetragon,...}`) ein Wartungsrisiko, nicht ein
   kleiner Patch.
6. Geprüft, ob im Go-Backend schon ein `config.yml`-YAML-Parser existiert (Auftrag: "keinen neuen
   Parser erfinden, falls einer existiert") — nein: `sigs.k8s.io/yaml` ist zwar vendored, aber nur
   für `internal/domain/schema/plugin_manifest.go` (Plugin-Manifeste) genutzt; nichts im
   Go-Backend liest `config.yml` heute. Selbst ein neuer, sauberer Parser änderte nichts an
   1./2./3./4./5.

**Fazit:** kein Hack gebaut. Ein sauberer Fix bräuchte mindestens: das Produktions-Image mit einem
Ansible-Runner-Äquivalent + den `deploy/`-Rollen auszustatten (Architekturänderung, kein Patch),
einen echten Server-seitigen Zugriff auf (eine bereinigte Kopie von) `config.yml`/`.env`
herzustellen, ohne das "keine Secrets im Server-Filesystem"-Mandat zu brechen, und eine
Node-Identitäts-Brücke zwischen SSH-Endpoint-Registry und `config.yml`-Namen einzuführen — jedes
davon ein eigenes Sprint-Ticket, keine 30-Minuten-Ergänzung zu `handleNodeProvision`.

### Verifikation

- Frontend: `npx tsc -p tsconfig.app.json --noEmit` — 0 neue Fehler durch diese Änderung (Baseline
  vorher/nachher exakt gleich viele Fehler in den drei geänderten Dateien; die Baseline selbst hat
  vorbestehende, vom Projekt tolerierte Fehler — `next.config.mjs` setzt
  `typescript.ignoreBuildErrors: true`).
- `npx eslint src/views/ProjectDetailPage.tsx src/views/PluginCatalogPage.tsx
  src/views/WorkspaceDeploymentsPage.tsx src/lib/section-nav.ts` — keine neuen Fehlerklassen; der
  einzige "neue" Fehler (`react-hooks/set-state-in-effect` in `PluginCatalogPage.tsx`) ist derselbe
  vorbestehende Fehler, der 1:1 mit dem verschobenen `?browser=1`-Effekt aus
  `WorkspaceDeploymentsPage.tsx` mitgewandert ist (dort vorher identisch vorhanden).
- `npx vitest run` — 364/365 Tests grün; der eine Fehlschlag
  (`create-access-section.test.ts`, prüft String-Inhalt von `WorkspacesPage.tsx`, die nicht
  angefasst wurde) ist vorbestehend (verifiziert per `git stash` gegen den unveränderten Stand).
- `node scripts/check-i18n.mjs` — "i18n validation passed for 60 locales and 3014 keys" (keine
  neuen Keys nötig, alle verwendeten Keys existierten schon).
- Backend (Item 3): keine Go-Dateien geändert (reine Recherche/Dokumentation); `go` ist in dieser
  Umgebung nicht installiert, daher kein `go build`/`go vet` möglich — irrelevant, da kein
  Go-Code angefasst wurde.
