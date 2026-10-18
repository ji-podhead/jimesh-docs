# SSOT-PLAN 2026-09-28 — FRONTEND (src/frontend) — Single Source of Truth für ALLE Komponenten

**Auftrag (Operator, 28.9. ~04:20, wörtlich):** "mich nervt komplett das es ueberall doppelte components gibt, wo teilweise neue geschrieben wurden, aber an anderen Stellen noch alte benutzt werden, die nicht mehr supported werden — ich will wirklich fuer ALLES SSOT-fix und keine zehnfachen Ausfuehrungen von Komponenten. Beispiel: das komische provision-workspace, was ich nicht mal weiss was das ueberhaupt sein soll, sah aus wie dasselbe alte Component wie das normale deploy-workspace/add-workspace, aber in einer alten Ausfuehrung mit irgendwelchen SSH-Keys."

**Audit-Modus:** READ-ONLY. Keine Repo-Datei verändert. Alle Schreibzugriffe nur in ihc24/.
**Baum-Stand:** HEAD `26b675b` **plus uncommitted In-Flight-Änderungen** (`HierarchySidebar.tsx`+Test, `section-nav.ts`+Test modified; `components/workspaces/FileBrowser.tsx` untracked = Agent C).
**Ausführungsregel:** Jede Phase NUR nach dem Landing der laufenden Build-Agents ausführen (Abschnitt 5d). Phase A berührt keine in-flight Datei und ist sofort sicher, sobald der Baum committed ist.

> **⚠ Stand-Update (Audit-Ende, ~04:25):** Der Baum hat sich WÄHREND des Audits bewegt. Commit `07b51b5` (SPRINT-141) hat HierarchySidebar + section-nav (Onboarding in die Servers-Sektion) gelandet — die beiden sind damit aus dem kritischen Pfad. JETZT in-flight (modified, uncommitted): `AppPanelDrawer.tsx`+Test, `PluginInstallWizardDialog.tsx`, `PluginActivationCard.tsx`, `types/domain/plugins.ts`, `PluginCatalogPage.tsx`, `ProjectDetailPage.tsx`, `WorkspaceDeploymentsPage.tsx`, `WorkspaceSettingsPage.tsx`, `WorkspacesPage.tsx`+Test, 60 Locale-Dateien. `workspaces/FileBrowser.tsx` bleibt untracked (Agent C, importiert `ui/progress.tsx` → progress wird damit LIVE, NICHT löschen). Die Phase-A-Dateien (A1–A8) sind von KEINER dieser Änderungen berührt — Phase A bleibt sofort ausführbar, sobald der aktuelle In-Flight-Stand committed ist. Vor jeder Ausführung: `git status` gegen die Phase-D-Liste abgleichen.

> **⚠ STANDING ORDER (Operator, 28.9.):** Agenten committen **NIEMALS** git (parallele Agent-Commits haben sich gegenseitig Dateien überschrieben und fremde Dateien in Commits gezogen) — **NUR der Parent reviewt und committet alles.** Zusätzlich: kein Agent editiert/revertet/stasht/checkt aus/cleaned Dateien außerhalb seines explizit gelisteten Scopes (uncommitted Arbeit anderer Agents im Baum ist ERWARTET und wird nicht angefasst). Konsequenz für DIESEN Plan: Jede Phase wird vom Ausführungs-Agent nur als Arbeitsbaum-Änderung gebaut; das Commit (und erst danach die nächste Phase) macht ausschließlich der Parent nach Review. Benötigt ein Schritt eine Shared-Datei außerhalb des eigenen Scopes, werden die exakten zeilenbezogenen Änderungen stattdessen in den Build-Report geschrieben (W1-Präzedenzfall: Nav-/Route-Zeilen → Parent wendet sie an).

> **⚠ Delta ~05:15 — Welle 1 GELANDET, Welle 2 läuft:** Der Parent hat committed: `b03e494` **SPRINT-60** (Suricata-IDS-Panel auf /networks + `GET /api/suricata/status` + API_DOCS), `b4dd808` **SPRINT-143** (WorkspaceDeleteButton auf AppPanelDrawer-Danger-Zone + Deployments-Zeilen), `324ac6d` **SPRINT-140** (echte Plugin-Installations-Zustände statt Echo), `3181175` **Headscale-Key-Fix** (die 503-Ursache der /networks-Mesh-Seite — der zweite Teil des C6-Live-Funds ist damit behoben), dazu SIEM/Grafana-IaC. **JETZT in-flight (Welle 2, SPRINT-140 PART 2):** /agents → /plugins-Fusion — `App.tsx` modified (AgentsPage-Import raus, /agents = Navigate), `command-palette.tsx` modified (p-agents → p-plugins), `views/AgentsPage.tsx` im Baum GELÖSCHT, `PluginCatalogPage.tsx`+Test modified, untracked `scripts/update-sprint140-merged-page-i18n.cjs` (relabels nav.pluginCatalog → "Integrations & Plugins"). Ausstehende Parent-Zeilen-Edits aus dieser Welle: `section-nav.ts:141` + `HierarchySidebar.tsx:246` (`nav.agents`-Einträge → Redirect-Ziel). `workspaces/FileBrowser.tsx` weiterhin untracked (Agent C). Phase-A-Kandidaten: **alle 13 unverändert verifiziert** (Import-Graph v3 gegen den aktuellen Baum, ~05:15). Netzwerk-Fall C6: Inhalts-Voraussetzung erfüllt — /networks zeigt jetzt ECHTES Monitoring (Mesh + IDS); nur noch Label-SSOT offen.

---

## 0. Zahlen-Summary (verifiziert gegen den aktuellen Baum, nicht gegen Doku)

| Kennzahl | Wert | Nachweis |
|---|---|---|
| .ts/.tsx unter `src/frontend/src` | **291** (253 Quell-Dateien + 38 Test-Dateien) | find+Zählskript (Import-Graph, s. Methode unten) |
| Live (von main.tsx / App.tsx / app/ erreichbar) | **233** | Import-Graph inkl. `export … from` |
| **DEAD** (0 Importer, auch kein Test) | **11** | Abschnitt 5a |
| **Zombie** (nur von Dead-Dateien importiert) | **3** (`FilePathInput`, `ui/progress`, `lib/mesh-icons`) | Import-Graph |
| **Test-only** (kein Live-Importer, nur Tests) | **5** (`lib/attachments`, `scope-usage-schema`, 3× `playground-*`) | Import-Graph |
| **Importiert, aber von keiner Route gerendert** | **1** (`views/ProjectsPage.tsx`, 1357 Zeilen) | App.tsx:40 Import, 0 `<ProjectsPage>` |
| Views (`src/views/`) | **75** Quell-Dateien, **74** routed, 1 unrouted-imported (ProjectsPage) | alle 75 von App.tsx importiert |
| `<Route>`-Einträge in App.tsx | **104** | grep |
| Bestätigt verwaiste Routen | **4** (`/agents/sessions/:sessionId`, `/api-docs`, `/overview`, `/security/findings`) + **1 gefixt seit Audit** (`/dbs/datalake` jetzt in nav) | Abschnitt 2b |
|`*.bak`-Leichen (untracked) | **19** (15× `lib/*.test.ts.bak`, 4× `__tests__/pages/*.test.ts.bak`) | git ls-files: keine getrackt |
| Build-Doppelung | **Next.js ist live** (`npm run dev/build` + Makefile = `next`); `vite.config.ts`+`index.html`+`main.tsx` = zweiter, toter Build-Pfad | package.json, Makefile:134-148 |
| Falsch benannte, nie existierende Pfade | `src/pages/` **existiert nicht mehr** (Mandat 7 ist als Aussage überholt) | find |

**Methode:** Vollständiger Import-Graph über alle 291 Dateien (statisches `import … from`, `export … from`, dynamisches `import()`), Aliase `@/` aufgelöst, Erreichbarkeit von den echten Entry-Points (`main.tsx`, `App.tsx`, `app/layout.tsx`, `app/[[...slug]]/page.tsx`), Test-Dateien als eigene Vitest-Entry-Points behandelt. Danach jede verdächtige Datei einzeln per Export-Bezeichner-Grep nachverifiziert (nicht nur Dateiname). Route-Erreichbarkeit gegen die 3 Link-Quellen geprüft: `lib/section-nav.ts`, `HierarchySidebar.tsx` (NAVIGATION/SERVERS/EVENTS-Items), `command-palette.tsx`, plus Volltext-Grep über den Baum.

---

## 1. Lead-Re-Verifikation (jede These gegen den HEUTIGEN Baum geprüft)

### 1a. Mandat 7 (MANDATES.md:113-114): "src/pages/ is a stale duplicate of src/views/"

**Befund: Die Aussage ist selbst STALE — das Duplikat ist bereits weg.** Es gibt kein `src/pages/` mehr (irgendwo unter src/frontend). Der einzige Rest:

| Pfad | Inhalt | Status |
|---|---|---|
| `src/frontend/src/__tests__/pages/*.test.ts.bak` | 4 Dateien: agent-descriptions, capability-tier-hint, model-limit-hints, routing-more-options | **untracked `.bak`-Leichen** → Phase A-Löschung (A6) |
| `src/frontend/.next/`, `node_modules/` | Build-Artefakte | irrelevant |

Kein einziger Live-Code importiert `@/pages` (grep über den Baum: 0 Treffer). Mandat 7 sollte nach Ausführung von Phase A auf den neuen Zustand umformuliert werden ("früheres src/pages wurde entfernt; Views nur noch in src/views") — Doku-Sync-Punkt, kein Code.

### 1b. Doku "AUDIT-2026-09-27-FRONTEND-INTEGRATION-GAPS" (liegt in `docs_dev/`, NICHT in ihc24 — der ihc24-Pfad im Audit-Auftrag existiert nicht): 9 tote Komponenten + 3 tote Lib-Module + 5 verwaiste Routen — JEDE einzeln nachgeprüft:

| # | Behauptung (27.9.) | Heute (28.9., HEAD 26b675b) | Verdict |
|---|---|---|---|
| 1 | `playground/conversation-sidebar.tsx` tot | 0 Importer (nur .bak-Test-Variante existiert zusätzlich) | **weiterhin DEAD** ✓ |
| 2 | `playground/settings-rail.tsx` tot | 0 Importer | **weiterhin DEAD** ✓ |
| 3 | `lib/playground-conversations.ts` tot | nur importiert von totem conversation-sidebar + eigenem Test | **TEST-ONLY** ✓ |
| 4 | `lib/playground-sampling.ts` tot | nur von totem settings-rail + Test | **TEST-ONLY** ✓ |
| 5 | `lib/playground-stream.ts` tot | nur eigener Test | **TEST-ONLY** ✓ |
| 6 | `overview/ScopeSelectorModal.tsx` tot | 0 Importer; NUR Kommentar-Erwähnungen in `HierarchySidebar.tsx` (Z. 87, 113, 161, 438) und `BreadcrumbBar.tsx:55` | **weiterhin DEAD** ✓ |
| 7 | `mesh/MeshBadge.tsx` tot | 0 Importer; schleppt `lib/mesh-icons.ts` mit (auch sonst nirgends benutzt) | **weiterhin DEAD** (+1 Lib-Leiche mehr als das Audit zählte) ✓ |
| 8 | `files/FileBrowserField.tsx` tot | 0 Importer; `FilePathInput.tsx` wird NUR von ihm importiert (beide weg) | **weiterhin DEAD** (Kette) ✓ |
| 9 | `ProviderStatus.tsx` tot | 0 Importer, echter Backend-Wire (`GET /api/dsh/settings`) vorhanden | **weiterhin DEAD — Entscheidungsfall C3** ✓ |
| 10 | `TierOnboarding.tsx` tot | 0 Importer, echte Endpoints (`GET /api/dsh/settings` + `POST /api/dsh/import`) | **weiterhin DEAD — Entscheidungsfall C3** ✓ |
| 11 | `ui/progress.tsx` tot | **NICHT MEHR TOT-LOSBAR**: wird von Agent Cs neuem `workspaces/FileBrowser.tsx` (untracked, in-flight) importiert → wird LIVE, sobald der landet | **Statuswechsel: PROTECTED (5d)** ⚠ |
| 12 | `ui/separator.tsx` tot | 0 Importer | **weiterhin DEAD** ✓ |
| — | (+ nicht im Audit) `lib/attachments.ts`, `lib/scope-usage-schema.ts` | je nur vom eigenen Test importiert | **NEU: TEST-ONLY, Löschung A5** |
| — | (+ nicht im Audit) `types/domain/network_ownership.ts`, `types/domain/utility_deps.ts` | 0 Importer | **NEU: DEAD, Löschung A4** |
| — | (+ nicht im Audit) `WorkspaceStatusBadge` (Export in `workspace-deploy-dialogs.tsx:542`) | 0 Verwendungen (WorkspacesPage nutzt seit SPRINT-139 die Badge-Klassen aus `lib/workspace-status.ts`) | **NEU: toter Export in Live-Datei, B1** |
| R1 | Route `/agents/sessions/:sessionId` = 0 Links | immer noch genau 0 Treffer außer der eigenen Route (App.tsx:586); reguläres `/sessions/:sessionId` deckt ab | **weiterhin ORPHAN** ✓ |
| R2 | Route `/api-docs` = 1 Zufallslink | immer noch genau 1 Link (`OpnsenseFirewallConfigPage.tsx:159`), kein Nav/Palette-Eintrag | **weiterhin ORPHAN** ✓ |
| R3 | Route `/overview` = nur Root-Redirect | kein Nav-Eintrag in section-nav.ts/Sidebar/Palette | **weiterhin ORPHAN** ✓ |
| R4 | Route `/security/findings` = 1 Inline-Link | genau 1 Link (`WorkspaceDetailPage.tsx:453`), fehlt in securityItems | **weiterhin ORPHAN** ✓ |
| R5 | Route `/dbs/datalake` = 0 Links | **GEFIXT**: seit heute in `section-nav.ts:216` (dbItems) | **erledigt, kein Handeln** ✅ |

### 1c. "ProjectsPage ist intentionally-dead, wird aber von App.tsx importiert" — **BESTÄTIGT**

- `App.tsx:40` importiert `ProjectsPage` — **es gibt aber kein `<ProjectsPage/>`-Render und keine Route** (`/projects` = `<Navigate to="/workspaces"/>`, App.tsx:571; Nav-Label "Playground", section-nav.ts:140).
- Die Seite ist kein kleiner Stub, sondern **das komplette ALTE Ausführungs-UI (1357 Zeilen)**: eigene Add-Project-Form mit SSH-Node-Pick (Z. 955+), eigene Deploy-/Redeploy-/Undeploy-Calls mit `sshKey`/`sshPassword` im Body und `LOCAL_ENDPOINT_FALLBACK` (Z. 33, 436-465, 516-545, 584-601), eigene Terminal-/iframe-/VSCode-Panes, Tunnel-URLs (691-700), DeploymentsDialog (1346), DeleteProjectDialog (1350).
- Offiziell "bewusst tot" laut OPEN-ITEMS (`bleibt bewusst tot`). Schleppt aber exklusiv mit sich: `ProjectExplorerSidebar.tsx` (230 Z., einziger Konsument) und die **Render-Basis von `DeploymentsDialog.tsx`** (1346 — der einzige Render-Call überhaupt).
- Schadens-Kosten pro Tag, in dem sie liegt: jeder Agent liest sie als "vielleicht doch die echte Projects-Oberfläche", der tsc-Check kompiliert ihre 1357 Zeilen mit, und der Operator sieht in der Nav einen "Playground"-Eintrag, der nach /workspaces umleitet.
→ **Empfehlung C2: formal retiren** (Löschen + Migration der 3 weiterbenutzten Typen), Detailplan in 3.5/5c.

### 1d. "Playground-Chat-Subsystem (dead but tested)" — **TEILWEISE WIDERLEGT**

- `ChatInterface.tsx` (327 Z.) ist **LIVE**: Route `/chat` (App.tsx:572) **und** Nav-Eintrag (`section-nav.ts:139`, `nav.chat`). Kein Löschen!
- Tot ist der **alte Playground**: `conversation-sidebar.tsx` + `settings-rail.tsx` + 3 Support-Libs + 3 Tests + 3 `.bak`-Tests. Ihr Host (`/projects` als eigene Playground-Page) existiert nicht mehr — die Route leitet um.
- Zusätzliche Altlast: `App.tsx:465` `FULL_BLEED_ROUTES = ['/projects']` (Kommentar nennt es "the Playground") referenziert eine Route, die nur noch redirected; `/test` (764) und `/playground` (765) leiten auf /projects → /workspaces weiter.
→ Entscheidung C1 (Empfehlung: endgültig löschen — das_feature ist durch /chat ersetzt).

---

## 2. Duplikat-Cluster — die "zehnfachen Ausführungen", gruppiert

Legende: **K** = kanonische Komponente (gewinnt), **L** = live Alt-Variante, **D** = dead Variante, **Kosten** = konkretes Operator-/Wartungsproblem.

| # | Concern (Cluster) | Kanonisch (SSOT-Ziel) | Varianten | Kosten der Koexistenz |
|---|---|---|---|---|
| 1 | **Workspace-Container deploy/redeploy/stop** | `WorkspaceDeployDialog` — `components/workspaces/workspace-deploy-dialogs.tsx:118` (Modi deploy/redeploy/stop; Registry-Target via `SshTargetSelect`) | **L1** `WorkspaceDeployAppDialog` (`workspaces/WorkspaceDeployAppDialog.tsx:114`, 482 Z., App-Katalog) — HierarchySidebar:1502, WorkspaceDetailPage:493 · **L2** `BrowserRuntimeModal` (`workspaces/BrowserRuntimeModal.tsx:155`, 719 Z., Runtime-Auswahl) — HierarchySidebar:1509, ActiveDeploymentsSection:1080, PluginCatalogPage:327 · **D** ProjectsPage-Inline-Forms (triggerBootstrap/triggerRedeploy/triggerCleanup, 436/516/584) · **F** ProjectDetailPage:350-357 "Trigger Deployment"-Button = **nur ein Toast, kein API-Call (No-Mock-Verstoß)** | Alle 3 Live-Dialoge POSTen denselben Endpoint `/api/workspaces/deploy|redeploy|undeploy`, haben aber 3 eigene Framework-Kataloge (`FRAMEWORKS` Z.90, `APP_OPTIONS` Z.65, BrowserRuntimeModal-Liste), 3 eigene Credential-Prefills und 3 verschiedene Optiken für dieselbe Aktion → genau der Operator-Befund "überall doppelte Components" |
| 2 | **Workspace provision** | WorkspacesPage-Provision-Dialog (`views/WorkspacesPage.tsx:991-1067`, POST `/api/workspaces/{id}/provision`, Registry-Prefill aus Browser-Secret-Store) + Result-Dialog 1072-1110 | Keine Workspace-Parallele — ABER **Begriffs-Kollision**: `OnboardingPage.tsx:101` POST `/api/nodes/provision` (= NODE-Provisioning) und `ControlPlanesPage` hat ein eigenes "provision" (Control-Planes). Drei Bedeutungen von "provision" | Operator: "provision-workspace … ich weiss nicht mal was das sein soll" — der Name kollidiert mit 2 anderen Provision-Flows. Kein Code-Duplikat, aber ein SSOT-Benennungsproblem (C7) |
| 3 | **Workspace create ("add workspace")** | WorkspacesPage-Ensure-Dialog 484-619 (create-is-create: Projekt + Kind-Radio + Owner + Secrets + Access; **ohne SSH-Felder seit SPRINT-139**) + `NewProjectDialog` (Project-Tier, 256 Z.) | **D** ProjectsPage-Add-Project-Form (955+) mit Node/SSH-Pick; die alte Create-mit-SSH-Felder-Generation wurde in SPRINT-139 entfernt (Commit 14d1012) | Alte Generation war bis heute sichtbar (totes UI), Neue existiert parallel — Operator sah beide nacheinander |
| 4 | **Workspace delete / worktree-sweep** | Row-Delete `ConfirmButton` (WorkspacesPage:880-888 → DELETE `/api/workspaces/{id}`, 408-418) | **L-Alt** Remove-Worktree-Dialog WorkspacesPage:901-965 — **freie Text-Felder** nodeHost/nodeUser/nodePort + authMethod + SSH-Key-Textarea/Passwort (917-956), NICHT die Registry | Dieselbe Seite zeigt die neue Registry-Welt (Provision, Create) und den alten Freitext-SSH-Stil (Remove) — Kern der "irgendwelchen SSH-Keys"-Verwirrung (B2) |
| 5 | **Project delete** | `DeleteProjectDialog` @ ProjectDetailPage:485 (echtes DELETE + Best-Effort-Node-Sweep 149-177) | **D** zweiter Render in ProjectsPage:1350 | Dialog selbst geteilt — nur der tote Call-Site ist Altlast |
| 6 | **Deployments-Liste (Anzeige + Redeploy)** | `WorkspaceDeploymentsPage` (/workspaces/deployments, 252 Z., zeilenweise Redeploy) + `DeploymentDetailPage` (Detail) | **L** `ProjectDetailPage` DeploymentsTabView (Z. 934+, inline Tab, eigene Row-Renderings) · **D** `DeploymentsDialog` (150 Z., hand-gestricktes Overlay, **hartcodierte englische Strings**, gerendert NUR von toter ProjectsPage:1346) · **Typ-Doppelung**: `DeploymentRow` definiert in `DeploymentsDialog.tsx:34` UND `DeploymentDetailPage.tsx` (von WorkspaceDeploymentsPage:44 re-exportiert); `Project`-Typ lebt in `DeploymentsDialog.tsx:7` | 3 Oberflächen für dieselbe Deployment-Liste, 2 Typ-Heime, 1 davon hängt an einer toten Seite |
| 7 | **Workspace-Status-Badge** | `lib/workspace-status.ts` (SPRINT-139: Dot+Badge-Klassen, komplette Status-Kette inkl. Legacy-Status) — genutzt von WorkspacesPage:792-803 + HierarchySidebar | **D** `WorkspaceStatusBadge` (workspace-deploy-dialogs.tsx:542, alte Semantik deployed/ready/failed/stopped) — 0 Verwendungen | Toter Export verwirrt jede Suche nach "wo ist der Workspace-Status gerendert" |
| 8 | **SSH-Target & SSH-Secrets** | `SshTargetSelect`+`useSshEndpoints` (`workspaces/ssh-target-select.tsx`, 13 Konsumenten) + `lib/ssh-endpoints.ts` (getEndpointSecrets/withSecrets, Browser-Secret-Store) | **L-Alt** Freitext-Felder im Remove-Dialog (Cluster 4) · **D** `LOCAL_ENDPOINT_FALLBACK` in ProjectsPage:33 | 2 Credential-Eingabe-Generationen in einem Produkt |
| 9 | **File-Browsing** | `files/FileBrowserModal.tsx` (SSH-Remote-Ordner-Picker, live: HierarchySidebar:1529) | **IN-FLIGHT** `workspaces/FileBrowser.tsx` (Agent C: verschlüsselter Workspace-File-Manager via `/api/workspaces/{id}/files/*`, bewusst NEBEN dem SSH-Picker) · **D** `files/FileBrowserField.tsx` + `files/FilePathInput.tsx` (nie verdrahtete Input+Button-Kombi) | Zwei "FileBrowser*" mit verschiedenem Zweck + 2 tote Geschwister = Namens-Kollision; Agent Cs Neuer ist KEIN Duplikat, sondern ein zweiter bewusster Surface (Doku im File-Kommentar) |
| 10 | **Nav-Registries** | `lib/section-nav.ts` (navGroups — laut Kommentar "the ONE canonical nav model") | **L** `HierarchySidebar.tsx`: eigene Registries `NAVIGATION_ITEMS`:245, `SERVERS_SECTION_ITEMS`:264, `EVENTS_ITEMS`:271 · **L** `command-palette.tsx` (eigene Einträge) · AdminLayout-Subnav | 3 Link-Quellen pflegen Route-Erreichbarkeit → jede neue Route muss 3× verdrahtet werden, sonst "orphan" (genau die Audit-Fundklasse R1-R4); + falsches Label "Network Monitoring" → /networks = Headscale-Mesh, kein IDS (C6) |
| 11 | **Apps-Dropdowns** | `apps/ActiveAppsDropdown` (Sidebar: ALLE laufenden Deployments aus dem SSOT-Store) vs. `workspaces/workspace-apps-dropdown` (pro-Workspace-Container aus Discovery) | — | KEIN Duplikat (Datenquellen/Scope verschieden), aber irreführende Namensnähe — nur Doku-Kommentar, kein Merge |
| 12 | **Terminal** | `workspaces/WorkspaceTerminal.tsx` (docker-exec-WebSocket `/api/workspaces/{id}/terminal`; 3 Render-Sites: AppPanelDrawer, HierarchySidebar, WorkspaceDetailPage) | `apps/ContainerLogViewer` = Logs (anderer Zweck, kein Duplikat) | sauber — kein Handeln |
| 13 | **Query-Keys** | `lib/query-keys.ts` (TASK-086 "Central Query Key Registry") | **L** Literale: `['projects']` (WorkspacesPage:166-172, NewProjectDialog:149), `['workspaces']` (WorkspacesPage:191, workspace-deploy-dialogs.ts:210), `['project-deployments', id]` (5 Dateien) | **Zwei Caches für dieselbe Resource**: WorkspacesPage cached GET /api/projects unter `['projects']`, der SSOT-Store unter `queryKeys.projectsList` (`['projects-list']`) — NewProjectDialog:149-150 muss beide invalidieren. Drift-Gefahr bei jedem neuen Consumer (B6) |
| 14 | **Alter Chat-Playground** | `ChatInterface` (/chat, live) | **D** conversation-sidebar + settings-rail + 3 Libs + 3 Tests + 3 .bak + Nav-Eintrag "Playground"→/projects-Redirect + `FULL_BLEED_ROUTES`-Rest | C1 |
| 15 | **"Dashboard"-Namen** | `OverviewPage`+OverviewGrid (SSOT-Home), `DashboardBuilderPage` (/builder, Widget-Builder), `DashboardsPage` (/dashboards, Embed-Launcher), `CostDashboard` (AnalyticsPage), `ProviderHealthDashboard` (KeysPage) | — | 5 verschiedene "Dashboard"-Oberflächen mit verschiedenem Zweck — kein Codemerge nötig, aber Namens-/Erwartungs-Kosten (nur dokumentieren) |
| 16 | **Drei "Network"-Oberflächen** | `/networks` "Network Monitoring" = Netzwerk-Status-Seite (Headscale-Mesh-Sektion + Suricata-IDS-Panel — Zielbild NACH W1-Landing) | **L heute:** `/networks` ist das reine Headscale-Mesh-Dashboard (NetworksPage, 1107 Z., users/nodes/pre-auth-keys/ACL) mit ZWEI verschiedenen Labels in den zwei Registern ("Networks" `section-nav.ts:166` vs "Network Monitoring" `HierarchySidebar.tsx:274`, Events & Observability-Sektion) · **L:** `/workspaces/networks` = NetworkEditingPage (per-Project-VLAN-Zuweisung, TASK-080), Label "Network Editing" (`nav.networkEditing`) · **IN-FLIGHT:** Suricata-IDS-Panel (W1-Agent: `components/networks/suricata-ids-panel.tsx` + Einbau in NetworksPage; Backend `suricata.go` bereits im Baum) | Operator-Klick-Falle (LIVE beobachtet 28.9.): "Network Monitoring" verspricht IDS/Packet-Monitoring, die Seite zeigt Mesh-Tabellen — und wirkt ZUSÄTZLICH leer, weil der Headscale-API-Key nie in die .env eingetragen wurde. Drei Netzwerk-Dinge ohne klare Namen. Lösung: C6-Details |

---

## 3. DIALOG-FAMILIEN DEEP-DIVE (jeder Dialog, der ein Workspace/Project erstellen/deployen/provisionen/undeployen/löschen kann)

### 3a. Workspace-Lifecycle — welcher Dialog ist kanonisch für welchen Schritt

| Schritt | Kanonisch (file:line) | Endpoint | Alte/störende Varianten (file:line) |
|---|---|---|---|
| **Project anlegen** | `NewProjectDialog.tsx:91` — Render: WorkspacesPage:483, HierarchySidebar:1604 (+ Test `NewProjectDialog.test.tsx`) | POST /api/projects | **D**: ProjectsPage-Add-Form (Z. 955+, freier Node-Pick + Deploy-Parameter im selben Formular) |
| **Workspace anlegen** | WorkspacesPage-Ensure-Dialog **484-619** (Kind-Radio user/shared 518-558, Owner-Select 559-575, Secrets-Section 589-596, Access-Section 603-607, `?project=`-Autoopen 244-251) | POST /api/workspaces | **D**: ProjectsPage-Form; **historisch**: bis SPRINT-139 hatte genau dieser Dialog SSH-Felder (entfernt in 14d1012 — der Operator-Fund "warum will das nen ssh key????" ist bereits gefixt) |
| **Create-Result** | WorkspacesPage:970-988 (nur die Row, kein Key) | — | — |
| **Workspace provisionieren** (Worktree + Service-Key) | WorkspacesPage-Provision-Dialog **991-1067**: `SshTargetSelect` 1007-1011, Workspace-Pfad 1014-1023, Credentials nur bei key/password-Endpoint (1027-1048, aus Registry-Secret-Store vorbelegt, nie leer sendbar — 358-367, 1054-1058) | POST /api/workspaces/{id}/provision | Result-Dialog 1072-1110 (Service-Key einmalig, Copy-Button). **Kein Alt-Duplikat für Workspace-Provision** — die Verwirrung kam aus Cluster 1/4 (Deploy-Dialoge + Remove-Dialog mit freien SSH-Feldern) und der Namens-Kollision "provision" (1d) |
| **App/Container deployen** | `WorkspaceDeployDialog` (workspace-deploy-dialogs.tsx:118-539): Target 313-318, Credentials <details> 320-346 (Registry-Prefill), Framework 350-365, Preset 366-381, NetworkPresetPicker 387-396, Ports 398-428, GitToken 430-440, DockerSock 446-456, VLAN 458-504 — Render: WorkspacesPage:1117, WorkspaceSettingsPage:184, NetworkEditingPage:414 | POST /api/workspaces/deploy | /redeploy | /undeploy | **L1** `WorkspaceDeployAppDialog`:114 (App-Katalog APP_OPTIONS:65-75 + Tools 81, Ports-Sende-Regel "nur echte Interfaces" 171-180) — Render: HierarchySidebar:1502 ([+ App]-Badge, nur provisioned+ — 1110-1119), WorkspaceDetailPage:493 · **L2** `BrowserRuntimeModal`:155 (Runtime-/Desktop-Auswahl, ehrlich nur Backend-gestützte Frameworks) — Render: HierarchySidebar:1509 ([T]-Fallback: "deploy a shell runtime"), ActiveDeploymentsSection:1080, PluginCatalogPage:327 (?browser=1) · **D** ProjectsPage triggerBootstrap 423-501 / triggerRedeploy 503-569 · **F** ProjectDetailPage:350-357 Fake-Button (nur `toast.success`) |
| **Container stoppen/undeployen** | `WorkspaceDeployDialog` mode='stop' (216-221: purgeVolume:false, sweept nur den Owner) | POST /api/workspaces/undeploy | **D** ProjectsPage triggerCleanup 571-627 (eigener Body, eigener Error-Sweep) · **L** ProjectDetailPage:156-177 (Best-Effort-Sweep NACH Project-Delete — legitim, aber 3. Code-Pfad für denselben Endpoint) · `ActiveDeploymentsSection` eigene Stop-Action |
| **Workspace-Zeile löschen** | ConfirmButton WorkspacesPage:880-888 (`confirm:false` — DB-Row + Service-Key, Worktree bleibt) | DELETE /api/workspaces/{id} | — |
| **Worktree explizit mitlöschen** | Remove-Worktree-Dialog WorkspacesPage:901-965 (`confirm:true` + Node-Angaben) — **aber ALT-STIL**: freie Inputs 917-928, authMethod-Select 929-939, SSH-Key-Textarea/Passwort 941-956 | DELETE /api/workspaces/{id} | Migration B2: auf `SshTargetSelect` + `getEndpointSecrets` umstellen (Body bleibt kompatibel: nodeHost/nodeUser/nodePort/authMethod/sshKey/sshPassword) |
| **Project löschen** | `DeleteProjectDialog` @ ProjectDetailPage:485 (+ Purge-Volume-Checkbox) | DELETE /api/projects/{id} (+ Best-Effort-Undeploy 149-177) | **D**: ProjectsPage:1350 (+ eigene handleConfirmProjectDelete 634-650) |

**Ehrliches Merge-/Retire-Ergebnis für die Workspace-Dialoge:** Create/Provision (SPRINT-139) sind kanonisch und getestet (`WorkspacesPage.test.tsx`: 8 Its — create ohne SSH-Felder 184, Registry-Prefill 256, Provision-Gates 278). Die Deploy-Seite hat **bewusst 3 Einstiegs-Dialoge** (Zeilen-Aktion / App-Katalog / Runtime-Auswahl) — kein UI-Merge sinnvoll, WOHL aber: 1 gemeinsamer Target+Secrets-Hook, 1 gemeinsamer Framework-Katalog, 1 gemeinsamer DeployResponse-Typ (B4). Zu retieren sind nur: ProjectsPage-Inline-Forms (D), der Fake-Button (F), und der Freitext-Remove-Dialog (B2).

### 3b. Was die Alt-Dialoge noch können, die die Neuen nicht können (ehrliche Differenz — nichts geht verloren)

- ProjectsPage-Formulare: **nichts**, was WorkspaceDeployDialog/WorkspaceDeployAppDialog nicht decken (dessen VLAN/GitToken/Ports/Tools sind gleichwertig; das alte Formular hat zusätzlich einen lokalen `projects`-Schattenstate und hartcodierte englische Toasts — Altlast, keine Fähigkeit).
- Remove-Worktree-Dialog (Alt): kann freie Node-Adressen eintippen. Die Registry deckt das über /workspaces/endpoints ab; B2 behält die Fähigkeit, ohne die dritte Freitext-SSH-Instanz.
- DeploymentsDialog (D): kann pro Projekt deployen-Listen + Redeploy — deckt `WorkspaceDeploymentsPage` (dieselbe GET/POST, Filter + Detail-Klick) vollständig ab.

---

## 4. Sicherheitsbeweis-Methodik (gilt für jeden Löschvorschlag unten)

Pro Datei nachgewiesen: (1) **0 Live-Route-Renders** — kein `<Component/>`-Aufruf irgendwo im Erreichbarkeitsgraph der App-Entry-Points; (2) **0 Importer aus Live-Code** — Import-Graph über alle 291 Dateien, manuell per Export-Bezeichner nachgegrept; (3) **Tests, die sie referenzieren, aufgelistet** und im selben Schritt mitgelöscht (Tests sind Vitest-Entry-Points, kein Live-Beweis); (4) Kommentar-Erwähnungen (die der tsc NICHT prüft) identifiziert und als Mit-Änderung dokumentiert. Jede Phase endet mit dem Verifikationsprotokoll aus Abschnitt 6.

---

## 5. GEORDNETER AUSFÜHRUNGSPLAN

### 5a. PHASE A — Sichere Löschungen JETZT (berühren KEINE in-flight Datei; jede mit Beweis)

> Bedingung: einmal `git status` — Phase A ist sicher, sobald die 4 modified Dateien (HierarchySidebar*, section-nav*) committed sind; sie editiert ausschließlich Dateien, die KEIN Agent gerade anfasst. A1–A8 liegen alle außerhalb der Protected-Liste.

| ID | Löschung | Beweis (heutiger Baum) | Tests betroffen | Mit-Änderungen |
|---|---|---|---|---|
| **A1** | `components/overview/ScopeSelectorModal.tsx` | 0 Importer; nur 5 Kommentar-Erwähnungen in `HierarchySidebar.tsx` (87, 113, 161, 438) + 1 in `BreadcrumbBar.tsx:55` | keine | Kommentare mitlöschen/umformulieren (nur wenn HierarchySidebar schon gelandet ist — sonst als Nachtrag, die Kommentare kompilieren weiter) |
| **A2** | `components/mesh/MeshBadge.tsx` **+** `lib/mesh-icons.ts` | MeshBadge: 0 Importer; mesh-icons: einziger Importer IST MeshBadge | keine | keine |
| **A3** | `components/files/FileBrowserField.tsx` **+** `components/files/FilePathInput.tsx` | FileBrowserField: 0 Importer; FilePathInput: einziger Importer ist FileBrowserField. NICHT anfassen: `files/FileBrowserModal.tsx` (live, HierarchySidebar:1529) und `workspaces/FileBrowser.tsx` (Agent C) | keine | keine |
| **A4** | `types/domain/network_ownership.ts`, `types/domain/utility_deps.ts` | je 0 Importer | keine | keine |
| **A5** | `lib/attachments.ts` + `lib/attachments.test.ts`, `lib/scope-usage-schema.ts` + `lib/scope-usage-schema.test.ts` | je nur vom eigenen Test importiert (keine Live-Kante) | die beiden genannten (werden mitgelöscht) | keine |
| **A6** | 19 `.bak`-Leichen (15× `lib/*.test.ts.bak`, 4× `__tests__/pages/*.test.ts.bak`) | untracked (git ls-files: 0 getrackt), kein Build/Test liest `.bak` | keine (Vitest-Include: `*.test.ts` — `.bak` matcht nicht) | keine |
| **A7** | `dev/mockApi.ts` | 0 Referenzen im ganzen src/frontend; Mock-Helper widerstreitet dem No-Mock-Mandat | keine | keine |
| **A8** | `components/ui/separator.tsx` | 0 Importer | keine | keine |

**Phase-A-Effekte:** −13 getrackte Dateien (1.356 Zeilen, per wc verifiziert: ScopeSelectorModal, MeshBadge+mesh-icons, FileBrowserField+FilePathInput, 2× types/domain, attachments+Test, scope-usage-schema+Test, mockApi, separator) + 19 untracked .bak-Leichen. tsc-Baseline sinkt (keine neuen Fehler möglich — nur Entfernen), vitest verliert genau die 2 mitgelöschten Suites (attachments, scope-usage-schema — ~15-20 Cases, alle test-only). check:i18n bleibt grün (prüft Anwesenheit benutzter Keys). **Nicht** in Phase A: playground (C1), ProviderStatus/TierOnboarding (C3), progress (in-flight-Konsument!), ProjectsPage (C2).

### 5b. PHASE B — Konsolidierungen + Call-Site-Migrationen (nach Landing; Reihenfolge = Risiko aufsteigend)

**B1 — Toter Export + Typ-Heime auflösen** (berührt: workspace-deploy-dialogs.tsx, DeploymentsDialog-Nachfolge)
1. `WorkspaceStatusBadge` aus `workspace-deploy-dialogs.tsx:542-557` löschen (0 Verwendungen; kanonisch ist `lib/workspace-status.ts`).
2. Typen-SSOT: `Project` (heute `DeploymentsDialog.tsx:7-32`) und `DeploymentRow` (heute doppelt: `DeploymentsDialog.tsx:34-46` UND `DeploymentDetailPage.tsx`) in EIN Modul ziehen — Vorschlag `src/frontend/src/types/domain/deployments.ts` (oder `lib/deployment-types.ts`), Import-Umleitung in `ProjectDetailPage.tsx:49`, `DeleteProjectDialog.tsx:6`, `ProjectExplorerSidebar.tsx:15`, `WorkspaceDeploymentsPage.tsx:44` (re-export entfernen), `ActiveDeploymentsSection.tsx` (Import aus `views/DeploymentDetailPage` → neues Modul).
3. Naiv-Brecher: wer nur den Datei-Pfad greppt, findet `DeploymentRow` mehrfach — deshalb Schritt 2 VOR jeder DeploymentsDialog-Löschung (C2). Der `['project-deployments']`-Key muss identisch bleiben (Query-Cache-Kompatibilität).

**B2 — Remove-Worktree-Dialog auf Registry umstellen** (berührt: WorkspacesPage → **NACH deren Landing**)
- `SshTargetSelect` statt freier nodeHost/nodeUser/nodePort-Inputs; Credentials wie im Provision-Dialog aus `getEndpointSecrets(endpointId)`, editierbar, nie leer sendbar (Guard analog WorkspacesPage:358-367). Body unverändert kompatibel (dieselben Feldnamen). Die alte Freitext-Möglichkeit entfällt ehrlich — freie Nodes gehören in die Registry (/workspaces/endpoints).
- Test: `WorkspacesPage.test.tsx` erweitern (Remove-Dialog-It im Stil der Provision-Its).

**B3 — ProjectDetailPage "Trigger Deployment"-Fake-Button entfernen/ersetzen** (berührt: ProjectDetailPage → nach Landing)
- Der Button (350-357) macht NUR `toast.success(t('projectDetail.deploymentTriggered'))` — kein API-Call (Mandat-2-Verstoß, "Deployment triggered"-Fiktion). Entweder löschen ODER wie WorkspaceDetailPage:493 echten `WorkspaceDeployAppDialog` öffnen. Empfehlung: ersetzen (der Ort ist der natürliche Deploy-Einstieg des Projects).

**B4 — Deploy-Dialog-Familie: gemeinsame SSOT-Bausteine** (berührt: 3 Dialog-Dateien, alle NICHT protected)
1. `lib/deploy-catalog.ts` (neu): EIN Framework/App-Katalog (`FRAMEWORKS` aus workspace-deploy-dialogs.tsx:90-98 + `APP_OPTIONS` aus WorkspaceDeployAppDialog.tsx:65-75 + BrowserRuntimeModal-Liste zusammenführen, `id/framework/runtime/image/vnc/codeServer` als Schema) + EIN `DeployResponse`-Typ (heute 2× definiert: workspace-deploy-dialogs.tsx:100-110 und WorkspaceDeployAppDialog.tsx:87-105).
2. Hook `useDeployTarget()`: Endpoint-Preselect (host==project.nodeHost), Credential-Prefill aus `getEndpointSecrets`, `withSecrets`-Merge (heute 3× kopiert: workspace-deploy-dialogs.tsx:139-176, WorkspaceDeployAppDialog.tsx:129-150, BrowserRuntimeModal eigener Block).
3. Naiv-Brecher: die 3 Dialoge bleiben 3 UX-Oberflächen (Zeilenauftrag/Katalog/Runtime-Wahl) — NICHT in einen Dialog mergen (das wäre der nächste Doppel-Bau). Nur Katalog/Typ/Target-Logik wird EIN Mal bezogen.

**B5 — Query-Key-SSOT** (berührt u.a. protected: WorkspacesPage, WorkspaceDeploymentsPage, ProjectDetailPage → nach Landing)
- Literale ersetzen: `['projects']` → `queryKeys.projectsList` (WorkspacesPage:167, NewProjectDialog:149 — dann entfällt die Doppel-Invalidierung), `['workspaces']` → `queryKeys.workspacesList` (neu anlegen), `['project-deployments', id]` → `queryKeys.projectDeployments(id)` (DeploymentsDialog falls C2 behalten, ProjectDetailPage:221, WorkspaceDetailPage:123, WorkspaceDeploymentsPage:94).
- Naiv-Brecher: Cache-Migration — nach Umstellung auf `projectsList` holt der erste Render einmal neu (akzeptabel); Invalidierungen prüfen: NewProjectDialog, WorkspacesPage-Ensure/Delete, DeploymentsDialog-Redeploy.

**B6 — Orphan-Route-Aufräumarbeit in App.tsx** (App.tsx ist NICHT protected; die Nav-Hälfte hängt an protected section-nav → teilen)
1. Sofort nach Landing: `<Route path="/agents/sessions/:sessionId">` (App.tsx:586) löschen — `/sessions/:sessionId` rendert dieselbe Komponente; 0 Inbound-Links.
2. Nav-Ergänzungen (berührt section-nav.ts → nach dessen Landing, Agent-Koordination): `/api-docs` in platformItems (neben Control-Planes/Vault/Networks/Builder), `/security/findings` in securityItems, `/overview` als erstes workspaceItems- oder eigenes Home-Item; Command-Palette-Einträge mitdenken (3. Link-Quelle).
3. Altlasten: `FULL_BLEED_ROUTES=['/projects']` (App.tsx:465) löschen sobald C2 entschieden ist; `/test`-Route (764) löschen (redirectet nur in die /projects-Umleitung).

**B7 — Doku-/Mandats-Sync** (mit jeder Phase, Documentation-Mandat):
- Mandat 7 (MANDATES.md:113-114) auf neuen Stand umformulieren (src/pages existiert nicht mehr; Views-SSOT = src/views + keine unrouted Imports in App.tsx — optional eine lint-Regel/ein Test, der "Import ohne Route" in App.tsx fängt, damit nie wieder eine ProjectsPage-Lage entsteht).
- Jede Löschung/Konsolidierung: Sprint-File-Eintrag (`docs/sprints/` bzw. docs_dev-Pendant) + BACKLOG-Spiegel + i18n-Hinweis (s. 6).

### 5c. PHASE C — Operator-Entscheidungen (mit Empfehlung)

| ID | Entscheidung | Empfehlung (mit Begründung) |
|---|---|---|
| **C1** | Alter Playground: löschen oder reaktivieren (eigenes /playground)? Betroffen: `conversation-sidebar.tsx`, `settings-rail.tsx`, `lib/playground-{conversations,sampling,stream}.ts` + je 1 Test, Nav-Eintrag "Playground" (section-nav.ts:126→/projects-Redirect), `/playground`+\`/test\`-Redirects (App.tsx:764-765), `FULL_BLEED_ROUTES`-Rest | **LÖSCHEN.** Code+Tests existieren komplett, aber ohne Host seit dem /projects-Rename; /chat deckt den Live-Chat ab; OPEN-ITEMS #9 führt genau diese Entscheidung. Reaktivierung wäre ein Neubau (kein aktueller Konsument). Migration: 2 Komponenten + 3 Libs + 3 Tests + 3 .bak löschen, Nav-Eintrag entfernen, Redirects entfernen (Mandat 2: alte Bookmarks landen auf /workspaces — ehrlich). |
| **C2** | `views/ProjectsPage.tsx` (1357 Z.) formal retiren? | **JA, LÖSCHEN** — inkl. `ProjectExplorerSidebar.tsx` (einziger Konsument) und `components/projects/DeploymentsDialog.tsx` (einziger Render: ProjectsPage:1346; Funktionalität vollständig in WorkspaceDeploymentsPage). VORHER B1 (Typen umziehen: Project/DeploymentRow), sonst brechen 4 Live-Dateien. App.tsx:40-Import + /projects-Redirect-Nachfahren: Redirect BEHALTEN (Mandate 2 — alte Deep-Links landen ehrlich auf /workspaces), Nav-"Playground"-Eintrag entfällt mit C1. Was naiv bricht: `ProjectExplorerSidebar`-Import, DeploymentsDialog-Render, `Project`-Typ-Importe (4 Dateien, in B1 vorbereitet). |
| **C3** | `ProviderStatus.tsx` + `TierOnboarding.tsx`: verdrahten oder löschen? | **Verdrahten wäre billig** (beide echt ans Backend gebunden: /api/dsh/settings, /api/dsh/import; Kandidaten /keys bzw. /onboarding) — ABER solange kein Produktwunsch: **löschen ist die SSOT-konforme Variante** (keine halbfertige Oberfläche warten lassen). Git-Historie bewahrt sie. Entscheide eine der beiden; Empfehlung: TierOnboarding nach /onboarding verdrahten (passt thematisch), ProviderStatus löschen. |
| **C4** | Nav-Dual-Registry (section-nav.ts vs. HierarchySidebar-Items) | **Kein Blind-Merge.** Die Sidebar-Items sind bewusst eine andere Menge (Sections/Events). Empfehlung: Vertrag dokumentieren ("neue Route ⇒ section-nav + Sidebar-Liste + Palette prüfen") + optional Ableitung/Diff-Test; sonst droht der nächste Orphan. (Owner: Nav/IA-Agent, nach dessen Landing.) |
| **C5** | Vite-Restposten entfernen? (`vite.config.ts`, `index.html`, `main.tsx` — Next.js ist der einzige Build: package.json dev/build/start + Makefile 134-148; vitest hat eigenes Standalone-Config) | **ENTFERNEN**, aber erst nach 1× `make frontend-build` (next build) + `npm run test` grün OHNE die Dateien im Baum; tsconfig.app.json-Include mitbereinigen. Risiko klein, Testaufwand 10 Minuten. |
| **C6** | **"Network Monitoring"-Mislabeled + Drei-Networks-IA** (LIVE-Fall 28.9., vom Operator beobachtet): `HierarchySidebar.tsx:274` (EVENTS_ITEMS = "Events & Observability") labelt `/networks` als "Network Monitoring" (`sidebar.networkMonitoring`), aber `/networks` = NetworksPage = reines **Headscale-Mesh-Dashboard** (1107 Z., TASK-066/078). Dieselbe Route trägt im zweiten Register ein ANDERES Label ("Networks", `section-nav.ts:166`, `nav.networks`) — eine Route, zwei Labels widerspricht dem eigenen "ONE canonical nav model"-Anspruch. Die Seite wirkte ZUSÄTZLICH leer, weil der Headscale-API-Key nie in die .env eingetragen wurde — Label-Versprechen UND Datenschicht gleichzeitig gebrochen. | Volllösung im Kasten **"C6-Details"** unten: Label-SSOT (EIN Key für /networks in BEIDEN Registern), NetworkEditingPage-Rebrand ("VLAN / Network Assignment"), ehrlicher Mesh-Empty-State, W2-SIEM-Namensgrenze — abgestimmt auf die W1-Flächen-Entscheidung (Suricata-Panel GEHT IN /networks, KEINE zweite Route). Sequencing NACH W1-Frontend-Landing + Parent-Nav-Anwendung (Phase D). |
| **C7** | "provision"-Begriff dreifach belegt (Workspace vs. Node/Onboarding vs. Control-Plane) | **Doku/Label-Entscheidung:** WorkspacesPage-Provision i18n-Labels verdeutlichen ("Workspace bereitstellen (Worktree + Key)"); Onboarding-Flow konsequent "Node" nennen. Reine Label-/Doku-Änderung, kein Code-Merge. |

### C6-Details — Network-Naming-SSOT (live-Fall, eingefaltet in die laufende W1-Arbeit)

**(a) Der Befund (konkret, live beobachtet 28.9., verifiziert gegen den gelandeten Stand 07b51b5):**

- `HierarchySidebar.tsx:274`: `{ to: '/networks', labelKey: 'sidebar.networkMonitoring', icon: Network }` — steht in der **EVENTS_ITEMS**-Sektion ("Events & Observability", Z. 271 ff.). Das Label verspricht Monitoring/Observability-Daten.
- Das Ziel `/networks` (`views/NetworksPage.tsx`, 1107 Z.) ist das **Headscale-Mesh-Dashboard** (TASK-078: users/nodes/pre-auth-keys/ACL gegen `/api/networks/*`) — kein IDS, kein Packet-Monitoring.
- Dieselbe Route hat in `section-nav.ts:166` (platformItems) das Label **"Networks"** (`nav.networks`, en.json:20) — eine Route, zwei verschiedene Labels in den zwei Registern.
- Die Mesh-Daten hängen am Headscale-API-Key, der nie in die `.env` eingetragen wurde → die Seite wirkte leer: falsches Label-Versprechen + nicht konfigurierte Datenschicht = doppelte Verwirrung.

**(b) Zielbild "Ein Name pro Oberfläche" — abgestimmt auf die W1-Flächen-Entscheidung** (W1-Agent: Suricata-Panel wird als Sektion IN `/networks` gebaut, KEINE neue Route/Nav-Änderung — SPRINT-60-Akzeptanzkriterium 3 verbietet dem Agent die Nav-Dateien):

| Oberfläche | Route | EIN Label (beide Register) | Inhalt |
|---|---|---|---|
| **Network Monitoring** | `/networks` (NetworksPage) | EIN gemeinsamer Key (z. B. `nav.networkMonitoring`, "Network Monitoring"/"Netzwerk-Monitoring") für `section-nav.ts:166` UND `HierarchySidebar.tsx:274` | Headscale-Mesh-Status-Sektion + Suricata-IDS-Panel (W1: Service-Badge, echte Capture-Stats, Alert-Tabelle, ehrliche 0-/400-/502-Zustände) |
| **VLAN / Network Assignment** | `/workspaces/networks` (NetworkEditingPage) | `nav.networkEditing`-WERT ändern → "VLAN / Network Assignment" (de: "VLAN-/Netzwerk-Zuweisung"); Route bleibt (Mandat 2) | Per-Project-VLAN/Netzwerk-Zuweisung (TASK-080) — sagt ab sofort WAS es tut; "Network Editing" klingt wie Editieren des Monitorings |
| **SIEM (künftig, W2)** | `/security/*` (SIEM-Frontend nach SIEM-Deploy) | konsequent "SIEM …" nennen, NIE "Network …" | Wazuh-Alerts, Falco-Events, SIEM-Status — bleibt in der Security-IA, damit das 3-Wege-Naming stabil bleibt |

Zusätzliche SSOT-Schritte zu (b):
1. **Label-Key-SSOT:** `sidebar.networkMonitoring` (nur Sidebar) und `nav.networks` (nur Top-Nav) für dieselbe Route auflösen → EIN Key, beide Register darauf; den anderen Key aus den 60 Locales entfernen (check:i18n-Run).
2. **Ehrlicher Mesh-Empty-State:** NetworksPage muss den Grund für Leere IN DER UI benennen ("Headscale-API-Key fehlt in .env — Mesh-Daten nicht verfügbar"), solange der Key nicht eingetragen ist — nach W1-Landing verifizieren, ob der bestehende Error-Zustand das leistet; wenn nicht, nachbessern (Mandat 2: kein toter, unerklärter leerer Screen).
3. **Grenze zum IDS-Panel:** das Suricata-Panel bleibt Sektion IN `/networks`; falls es die Seite je outgrows, wandert es MIT gleichzeitiger Label-Pflege in BEIDEN Registern (Dual-Registry-Falle, Cluster 10) — nie eine zweite "Network …"-Seite parallel anfangen.

**(c) Sequencing gegen die laufenden Agenten (Phase-D-Ergänzung):**

- **W1 (Suricata) IST GELANDET** (`b03e494`, ~05:00): `components/networks/suricata-ids-panel.tsx` + Test committed, Panel auf NetworksPage (Import Z.54, Invalidate Z.215), Route `GET /api/suricata/status` vom Parent registriert + API_DOCS gepflegt. **Headscale-Key-Root-Cause ebenfalls behoben** (`3181175`: HEADSCALE_URL/HEADSCALE_API_KEY durch den docker run gereicht — die 503-Ursache der Mesh-Sektion). Damit hat `/networks` jetzt ECHTES Monitoring als Inhalt — das Label "Network Monitoring" beschreibt die Seite ab jetzt WAHR.
- **C6-Label-SSOT ist damit FREIGEGEBEN** — und soll gebündelt werden: Der Parent führt für die laufende Welle 2 ohnehin ausstehende Nav-Zeilen-Edits aus (`nav.agents`-Retirement: `section-nav.ts:141`, `HierarchySidebar.tsx:246`). **Ein Nav-Fenster, alle Zeilen:** (1) nav.agents-Retirement (Welle 2), (2) C6-Label-SSOT für /networks (beide Register auf EINEN Key), (3) B6.2-Nav-Ergänzungen (/api-docs, /security/findings, /overview), (4) C1-Playground-Eintrag. So berührt nur EINE Anwendung die Nav-Dateien (Cluster 10: Dual-Registry-Falle endgültig umschifft).
- Mesh-Empty-State-Prüfung: durch den Key-Fix vermutlich obsolet — einmal live verifizieren, dass die Mesh-Sektion Daten lädt; der UI-Hinweis auf fehlende Keys bleibt als Absicherung sinnvoll, wenn die Env den Key nicht hergibt.
- Die NetworkEditingPage-Label-Umbenennung ist unabhängig (nur Locale-Werte von `nav.networkEditing`) und kann mit dem nächsten i18n-Block mitfahren.

### 5d. PHASE D — PROTECTED/DEFERRED (in-flight Dateien; jeder Plan-Schritt, der sie berührt)

> **Delta-Stand ~05:15 (Parent hat die Welle committed):** Die frühere In-Flight-Menge (WorkspacesPage, WorkspaceDeploymentsPage, WorkspaceSettingsPage, AppPanelDrawer, ProjectDetailPage, PluginInstallWizardDialog, PluginActivationCard, types/domain/plugins.ts, 60 Locales, WorkspaceDeleteButton, W1-Suricata) ist **GELANDET** (`b03e494` SPRINT-60 Suricata-Panel auf /networks + Route/API_DOCS; `b4dd808` SPRINT-143 WorkspaceDeleteButton auf AppPanelDrawer-Danger-Zone + Deployments-Zeilen; `324ac6d` SPRINT-140 echte Installations-Zustände; `3181175` **Headscale-Key-Fix** — die 503-Ursache der /networks-Mesh-Seite ist behoben). Dadurch sind **B1, B2, B3, B5 jetzt UNBLOCKED** (sobald die AKTUELLE Welle — SPRINT-140 PART 2 — ebenfalls gelandet ist). Neue Baselines: **tsc 474, vitest 388/389, check:i18n PASS 60/3058.**

| Datei (Agent-Status) | Plan-Schritte, die sie berühren | Ausführungsregel |
|---|---|---|
| `App.tsx` — **JETZT in-flight** (SPRINT-140 PART 2: /agents → Navigate /plugins, AgentsPage-Import entfernt) | B6.1 (/agents/sessions-Route löschen), B6.3 (FULL_BLEED_ROUTES//test), ggf. C2-Import-Zeile | NACH Landing + Parent-Commit dieser Welle; Zeilen-Edits an den Parent statt Selbst-Edit, wenn der Agent noch aktiv ist |
| `components/command-palette.tsx` — **JETZT in-flight** (p-agents → p-plugins ersetzt) | B6.2-Palette-Hälfte (Einträge für /api-docs, /security/findings, /overview mitdenken) | gleiche Welle; Palette-Edits mit dem laufenden IA-Agent koordinieren |
| `views/PluginCatalogPage.tsx` + Test — **JETZT in-flight** (merged Integrations-Oberfläche) + `views/AgentsPage.tsx` **im Baum gelöscht** (42-Zeilen-Page weg) | keine SSOT-Änderung geplant — die Fusion /agents→/plugins IST selbst eine SSOT-Konsolidierung ( Cluster 16-Analogon: ehrliche Retirement statt Zweit-Fläche) | nach Landing: /agents-Redirect BEHALTEN (Mandat 2), `nav.agents`-Einträge sehen (s.u.) |
| `lib/section-nav.ts` + Test | B6.2 (Nav-Einträge api-docs/findings/overview), C1 (Playground-Eintrag Z.126→/projects-Redirect), C6 (Label-SSOT /networks, Z.166) | **der Parent führt noch ausstehende Zeilen-Edits aus**: `nav.agents`-Eintrag (Z.141 → jetzt Redirect auf /plugins) retireren (laut SPRINT-140-PART-2-Script-Kommentar bewusst dem Parent überlassen) — meine B6.2/C1/C6-Zeilen in DENSELBEN Nav-Edit-Batch des Parents legen (ein Fenster, alle Zeilen) |
| `components/sidebar/HierarchySidebar.tsx` + Test | A1-Kommentare, C4, C6 (Label-SSOT Z.274) + `nav.agents`-Rest (Z.246 → /agents-Redirect) | gelandet in 07b51b5; meine Zeilen in denselben Parent-Nav-Batch wie section-nav |
| `views/WorkspacesPage.tsx` | B2 (Remove-Dialog → Registry), B5 (Query-Keys) | **gelandet** (SPRINT-143/140-Welle committed) → frei nach der aktuellen Welle |
| `views/WorkspaceDeploymentsPage.tsx` | B1 (Typ-Import), B5 | **gelandet** → frei |
| `views/ProjectDetailPage.tsx` | B3 (Fake-Button — **noch da, jetzt Z.366**, toast-only "Trigger Deployment"), B1 (Typ), B5 | **gelandet** → frei; SPRINT-140 hat nur den Configure-Button echt gemacht, der Deploy-Fake-Button bleibt B3 |
| `components/apps/AppPanelDrawer.tsx` + Test | keine direkten; WorkspaceDeleteButton ist gelandet und ersetzt/ergänzt die Row-Deletes | erledigt/beobachten; Cluster-4-Doku nachziehen (WorkspaceDeleteButton = geteilter Delete, KEIN Duplikat — positiv) |
| `views/PluginCatalogPage.tsx` (alt), `PluginInstallWizardDialog.tsx`, `PluginSettingsPage.tsx` | PluginCatalogPage in-flight (s.o.); Wizard + Settings **gelandet** | nur noch CatalogPage beobachten |
| `components/workspaces/FileBrowser.tsx` (weiterhin untracked, Agent C) + `components/ui/progress.tsx` | NICHT löschen! progress wird durch ihn LIVE | unverändert; nach Landing progress aus der Dead-Liste streichen |
| `components/networks/suricata-ids-panel.tsx` + Test + `views/NetworksPage.tsx` | **GELANDET** (`b03e494`) — C6-Inhalts-Voraussetzung erfüllt: /networks hat jetzt ECHTES Monitoring (Mesh + IDS-Panel) | C6-Label-SSOT jetzt freigegeben für den Parent-Nav-Batch; Mesh-Empty-State-Check: durch `3181175` (Key-Fix) vermutlich obsolet — 1× live verifizieren |
| `src/backend/internal/gateway/suricata.go` + Test (gelanded, Backend) | OUT of frontend scope | erledigt (Route registriert, API_DOCS gepflegt) |
| Git-Stashes (6), `*.s138wip` (2, backend) | OUT OF SCOPE | nicht anfassen |

---

## 6. Verifikationsprotokoll (nach JEDEM Schrittblock)

1. `cd src/frontend && npm run test` — vitest + check:i18n; Referenz: Stand 28.9. laut Commit 26b675b: vitest 364/365 (1 vorbestehender Fail), check:i18n PASS.
2. `npx tsc --noEmit -p tsconfig.app.json` — gegen die dokumentierte Baseline (477 vorbestehende "Fehler"; zählt nur NEUE).
3. `npx eslint <geänderte Dateien>`.
4. Route-Smoke: `/workspaces`, `/workspaces/deployments`, `/plugins`, `/security/findings` je einmal curlen (Backend-Stack vorausgesetzt).
5. i18n: Löschungen hinterlassen_orphanierte Keys in 60 Locale-Dateien (check:i18n prüft nur Anwesenheit benutzter Keys, bleibt also grün). Optionaler Aufräum-Lauf mit `scripts/check-i18n.mjs`-Erweiterung oder dokumentiertem Verzicht.
6. Doku-Sync (Mandat): Sprint-File + BACKLOG-Spiegel in jedem Block, API_DOCS unberührt (keine Backend-Route betroffen).

## 7. Nicht-Ziele dieses Plans

- Backend-Duplikate (z.B. /api/projects/* vs /api/workspaces/* Legacy-Aliasse — nur dokumentiert: der Frontend-Plan sendet konsequent an die kanonischen /api/workspaces/*-Pfade).
- Meshsquad-/marketing-Repositories, deploy/-IaC, git-Stash-Archäologie.
- UI-Redesigns: dieser Plan konsolidiert EXISTierende kanonische Oberflächen, erfindet keine neuen.

---

## Appendix A — Vollständiges Inventar (253 Quell-Dateien)

> **Snapshot-Hinweis:** Bestand zum Audit-Zeitpunkt (HEAD 26b675b + damals uncommitted Sidebar/Nav-Stand, inzwischen als 07b51b5 gelandet). Seitdem im Baum dazugekommen (in-flight, NICHT im Bestand): `components/workspaces/WorkspaceDeleteButton.tsx` (Delete-UI-Agent, untracked) und — sobald W1-WP3 landet — `components/networks/suricata-ids-panel.tsx` + NetworksPage-Einbau. `src/frontend/src/i18n/locales/*` (60 Dateien) gerade modified durch den Plugin/Workspace-Agent (i18n-Nachzug).

*Legende: Routed in App.tsx = wird von einer Route gerendert ("imported only, NOT routed" = ProjectsPage-Fall). Live importers = Anzahl nicht-Test-Dateien, die die Datei importieren (die haeufigsten 3 als Beleg). LIVE = vom App-Entry erreichbar. DEAD = 0 Importer. ZOMBIE = nur von Dead-Dateien importiert bzw. importiert-aber-nie-gerendert. TEST-ONLY = nur Tests importieren. PROTECTED/IN-FLIGHT = gerade von Parallel-Agents bearbeitet (Phase D).*


### views

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 1 | `views/AdminAuditLogPage.tsx` | 309 | routed | 1 (`App.tsx`) | LIVE |
| 2 | `views/AdminBudgetsPage.tsx` | 264 | routed | 1 (`App.tsx`) | LIVE |
| 3 | `views/AdminCapabilitiesPage.tsx` | 365 | routed | 1 (`App.tsx`) | LIVE |
| 4 | `views/AdminLayout.tsx` | 50 | routed | 1 (`App.tsx`) | LIVE |
| 5 | `views/AdminUsersPage.tsx` | 783 | routed | 1 (`App.tsx`) | LIVE |
| 6 | `views/AgentConfigScannerPage.tsx` | 513 | routed | 1 (`App.tsx`) | LIVE |
| 7 | `views/AgentSessionDetailPage.tsx` | 549 | routed | 1 (`App.tsx`) | LIVE |
| 8 | `views/AgentsPage.tsx` | 42 | routed | 1 (`App.tsx`) | LIVE |
| 9 | `views/AnalyticsPage.tsx` | 1170 | routed | 1 (`App.tsx`) | LIVE |
| 10 | `views/AppDetailPage.tsx` | 280 | routed | 1 (`App.tsx`) | LIVE |
| 11 | `views/AppDiscoveryPage.tsx` | 302 | routed | 1 (`App.tsx`) | LIVE |
| 12 | `views/AudioPage.tsx` | 6 | routed | 1 (`App.tsx`) | LIVE |
| 13 | `views/BackupsPage.tsx` | 19 | routed | 1 (`App.tsx`) | LIVE |
| 14 | `views/ConsumerKeysPage.tsx` | 403 | routed | 1 (`App.tsx`) | LIVE |
| 15 | `views/ControlPlanesPage.tsx` | 784 | routed | 1 (`App.tsx`) | LIVE |
| 16 | `views/DashboardBuilderPage.tsx` | 273 | routed | 1 (`App.tsx`) | LIVE |
| 17 | `views/DashboardsPage.tsx` | 139 | routed | 1 (`App.tsx`) | LIVE |
| 18 | `views/DatalakePage.tsx` | 210 | routed | 1 (`App.tsx`) | LIVE |
| 19 | `views/DeploymentDetailPage.tsx` | 440 | routed | 3 (`App.tsx`, `components/plugins/ActiveDeploymentsSection.tsx`, `views/WorkspaceDeploymentsPage.tsx`) | LIVE |
| 20 | `views/DiscoveryPage.tsx` | 23 | routed | 1 (`App.tsx`) | LIVE |
| 21 | `views/DlpSettingsPage.tsx` | 463 | routed | 1 (`App.tsx`) | LIVE |
| 22 | `views/DocsPage.tsx` | 29 | routed | 1 (`App.tsx`) | LIVE |
| 23 | `views/EmbeddingDetailPage.tsx` | 148 | routed | 1 (`App.tsx`) | LIVE |
| 24 | `views/EmbeddingsPage.tsx` | 249 | routed | 1 (`App.tsx`) | LIVE |
| 25 | `views/FallbackPage.tsx` | 993 | routed | 1 (`App.tsx`) | LIVE |
| 26 | `views/FirewallProviderSetupPage.tsx` | 710 | routed | 1 (`App.tsx`) | LIVE |
| 27 | `views/FirewallRulesPage.tsx` | 694 | routed | 1 (`App.tsx`) | LIVE |
| 28 | `views/FirewallTrafficLogPage.tsx` | 566 | routed | 1 (`App.tsx`) | LIVE |
| 29 | `views/FusionPage.tsx` | 334 | routed | 1 (`App.tsx`) | LIVE |
| 30 | `views/ImagePage.tsx` | 6 | routed | 1 (`App.tsx`) | LIVE |
| 31 | `views/KeysPage.tsx` | 316 | routed | 2 (`App.tsx`, `views/FallbackPage.tsx`) | LIVE |
| 32 | `views/LandingPage.tsx` | 270 | routed | 1 (`App.tsx`) | LIVE |
| 33 | `views/LlmProxyOverviewPage.tsx` | 575 | routed | 1 (`App.tsx`) | LIVE |
| 34 | `views/MediaDetailPage.tsx` | 125 | routed | 1 (`App.tsx`) | LIVE |
| 35 | `views/ModelDetailPage.tsx` | 769 | routed | 1 (`App.tsx`) | LIVE |
| 36 | `views/NetworkEditingPage.tsx` | 435 | routed | 1 (`App.tsx`) | LIVE |
| 37 | `views/NetworksPage.tsx` | 1108 | routed | 1 (`App.tsx`) | LIVE |
| 38 | `views/NotFoundPage.tsx` | 25 | routed | 1 (`App.tsx`) | LIVE |
| 39 | `views/NotificationCenterPage.tsx` | 430 | routed | 1 (`App.tsx`) | LIVE |
| 40 | `views/OnboardingPage.tsx` | 290 | routed | 1 (`App.tsx`) | LIVE |
| 41 | `views/OpenApiPage.tsx` | 143 | routed | 1 (`App.tsx`) | LIVE |
| 42 | `views/OpnsenseFirewallConfigPage.tsx` | 449 | routed | 1 (`App.tsx`) | LIVE |
| 43 | `views/OverviewPage.tsx` | 131 | routed | 1 (`App.tsx`) | LIVE |
| 44 | `views/PluginCatalogPage.tsx` | 332 | routed | 1 (`App.tsx`) | LIVE — PROTECTED/IN-FLIGHT |
| 45 | `views/PluginSettingsPage.tsx` | 365 | routed | 1 (`App.tsx`) | LIVE — PROTECTED/IN-FLIGHT |
| 46 | `views/PremiumPage.tsx` | 249 | routed | 1 (`App.tsx`) | LIVE |
| 47 | `views/ProjectDetailPage.tsx` | 1080 | routed | 1 (`App.tsx`) | LIVE — PROTECTED/IN-FLIGHT |
| 48 | `views/ProjectSecretsPage.tsx` | 724 | routed | 1 (`App.tsx`) | LIVE |
| 49 | `views/ProjectsPage.tsx` | 1358 | imported only, NOT routed | 1 (`App.tsx`) | ZOMBIE (imported by App.tsx, rendered by no route) |
| 50 | `views/ProxyChainsPage.tsx` | 775 | routed | 1 (`App.tsx`) | LIVE |
| 51 | `views/SDKLogsPage.tsx` | 585 | routed | 1 (`App.tsx`) | LIVE |
| 52 | `views/SecurityEventsPage.tsx` | 136 | routed | 1 (`App.tsx`) | LIVE |
| 53 | `views/SecurityExposurePage.tsx` | 1384 | routed | 1 (`App.tsx`) | LIVE |
| 54 | `views/SecurityFindingsPage.tsx` | 340 | routed | 1 (`App.tsx`) | LIVE |
| 55 | `views/SecurityGuardDemoPage.tsx` | 407 | routed | 1 (`App.tsx`) | LIVE |
| 56 | `views/SecurityLayout.tsx` | 21 | routed | 1 (`App.tsx`) | LIVE |
| 57 | `views/SecurityOverviewPage.tsx` | 437 | routed | 1 (`App.tsx`) | LIVE |
| 58 | `views/SecurityReportPage.tsx` | 450 | routed | 1 (`App.tsx`) | LIVE |
| 59 | `views/SecurityScansPage.tsx` | 345 | routed | 1 (`App.tsx`) | LIVE |
| 60 | `views/SIEMEventsPage.tsx` | 225 | routed | 1 (`App.tsx`) | LIVE |
| 61 | `views/SSHTargetDetailPage.tsx` | 272 | routed | 1 (`App.tsx`) | LIVE |
| 62 | `views/SubagentApprovalQueuePage.tsx` | 557 | routed | 1 (`App.tsx`) | LIVE |
| 63 | `views/TeamsPage.tsx` | 445 | routed | 1 (`App.tsx`) | LIVE |
| 64 | `views/ToolCallInspectorPage.tsx` | 558 | routed | 1 (`App.tsx`) | LIVE |
| 65 | `views/TourPage.tsx` | 430 | routed | 1 (`App.tsx`) | LIVE |
| 66 | `views/TracesPage.tsx` | 80 | routed | 1 (`App.tsx`) | LIVE |
| 67 | `views/VaultDashboardPage.tsx` | 827 | routed | 1 (`App.tsx`) | LIVE |
| 68 | `views/VideoPage.tsx` | 6 | routed | 1 (`App.tsx`) | LIVE |
| 69 | `views/WafMatrixPage.tsx` | 466 | routed | 1 (`App.tsx`) | LIVE |
| 70 | `views/WorkspaceAppsPage.tsx` | 219 | routed | 1 (`App.tsx`) | LIVE |
| 71 | `views/WorkspaceDeploymentsPage.tsx` | 253 | routed | 1 (`App.tsx`) | LIVE — PROTECTED/IN-FLIGHT |
| 72 | `views/WorkspaceDetailPage.tsx` | 528 | routed | 1 (`App.tsx`) | LIVE |
| 73 | `views/WorkspaceEndpointsPage.tsx` | 511 | routed | 1 (`App.tsx`) | LIVE |
| 74 | `views/WorkspaceSettingsPage.tsx` | 241 | routed | 1 (`App.tsx`) | LIVE |
| 75 | `views/WorkspacesPage.tsx` | 1136 | routed | 1 (`App.tsx`) | LIVE — PROTECTED/IN-FLIGHT |

### components/admin

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 76 | `components/admin/budgets-section.tsx` | 342 | — | 2 (`views/AdminBudgetsPage.tsx`, `views/TeamsPage.tsx`) | LIVE |

### components/api-usage.tsx

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 77 | `components/api-usage.tsx` | 28 | — | 3 (`components/command-palette.tsx`, `views/EmbeddingDetailPage.tsx`, `views/MediaDetailPage.tsx`) | LIVE |

### components/apps

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 78 | `components/apps/ActiveAppsDropdown.tsx` | 112 | — | 1 (`components/sidebar/HierarchySidebar.tsx`) | LIVE |
| 79 | `components/apps/AppPanelDrawer.tsx` | 456 | — | 2 (`components/sidebar/HierarchySidebar.tsx`, `views/WorkspaceDetailPage.tsx`) | LIVE — PROTECTED/IN-FLIGHT |
| 80 | `components/apps/ContainerLogViewer.tsx` | 228 | — | 3 (`components/apps/AppPanelDrawer.tsx`, `components/sidebar/HierarchySidebar.tsx`, `views/AppDetailPage.tsx`) | LIVE |

### components/auth-gate.tsx

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 81 | `components/auth-gate.tsx` | 633 | — | 1 (`App.tsx`) | LIVE |

### components/brand

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 82 | `components/brand/jimesh-mark.tsx` | 40 | — | 1 (`App.tsx`) | LIVE |

### components/builder

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 83 | `components/builder/DeployedProjectsCard.tsx` | 109 | — | 2 (`views/DashboardBuilderPage.tsx`, `views/OverviewPage.tsx`) | LIVE |
| 84 | `components/builder/NetworksSummaryCard.tsx` | 88 | — | 2 (`views/DashboardBuilderPage.tsx`, `views/OverviewPage.tsx`) | LIVE |
| 85 | `components/builder/RunningAppsCard.tsx` | 96 | — | 2 (`views/DashboardBuilderPage.tsx`, `views/OverviewPage.tsx`) | LIVE |
| 86 | `components/builder/SecretsSummaryCard.tsx` | 82 | — | 2 (`views/DashboardBuilderPage.tsx`, `views/OverviewPage.tsx`) | LIVE |
| 87 | `components/builder/SecuritySummaryCard.tsx` | 123 | — | 2 (`views/DashboardBuilderPage.tsx`, `views/OverviewPage.tsx`) | LIVE |

### components/chain-mesh-graph.tsx

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 88 | `components/chain-mesh-graph.tsx` | 1684 | — | 1 (`views/FallbackPage.tsx`) | LIVE |

### components/ChatInterface.tsx

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 89 | `components/ChatInterface.tsx` | 328 | — | 1 (`App.tsx`) | LIVE |

### components/command-palette-state.ts

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 90 | `components/command-palette-state.ts` | 6 | — | 2 (`App.tsx`, `components/command-palette.tsx`) | LIVE |

### components/command-palette.tsx

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 91 | `components/command-palette.tsx` | 340 | — | 1 (`App.tsx`) | LIVE |

### components/confirm-button.tsx

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 92 | `components/confirm-button.tsx` | 75 | — | 20 (`components/keys/backups-section.tsx`, `components/keys/client-profiles-section.tsx`, `components/keys/provider-list.tsx`, …) | LIVE |

### components/copy-button.tsx

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 93 | `components/copy-button.tsx` | 45 | — | 10 (`components/api-usage.tsx`, `components/keys/agent-compatibility-section.tsx`, `components/markdown.tsx`, …) | LIVE |

### components/CostDashboard.tsx

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 94 | `components/CostDashboard.tsx` | 524 | — | 1 (`views/AnalyticsPage.tsx`) | LIVE |

### components/embeddings

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 95 | `components/embeddings/custom-provider-dialog.tsx` | 170 | — | 1 (`views/EmbeddingsPage.tsx`) | LIVE |

### components/empty-state.tsx

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 96 | `components/empty-state.tsx` | 29 | — | 32 (`components/apps/ActiveAppsDropdown.tsx`, `components/apps/AppPanelDrawer.tsx`, `components/apps/ContainerLogViewer.tsx`, …) | LIVE |

### components/error-boundary.tsx

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 97 | `components/error-boundary.tsx` | 57 | — | 1 (`App.tsx`) | LIVE |

### components/files

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 98 | `components/files/FileBrowserField.tsx` | 87 | — | 0 | DEAD (zero importers) |
| 99 | `components/files/FileBrowserModal.tsx` | 173 | — | 2 (`components/files/FileBrowserField.tsx`, `components/sidebar/HierarchySidebar.tsx`) | LIVE |
| 100 | `components/files/FilePathInput.tsx` | 138 | — | 1 (`components/files/FileBrowserField.tsx`) | ZOMBIE (imported only by dead files) |

### components/floating-bar.tsx

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 101 | `components/floating-bar.tsx` | 31 | — | 2 (`views/FallbackPage.tsx`, `views/FusionPage.tsx`) | LIVE |

### components/keys

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 102 | `components/keys/add-endpoint-key-dialog.tsx` | 103 | — | 1 (`components/keys/provider-list.tsx`) | LIVE |
| 103 | `components/keys/add-key-dialog.tsx` | 93 | — | 1 (`views/KeysPage.tsx`) | LIVE |
| 104 | `components/keys/add-key-form.tsx` | 291 | — | 1 (`components/keys/add-key-dialog.tsx`) | LIVE |
| 105 | `components/keys/agent-compatibility-section.tsx` | 234 | — | 1 (`views/KeysPage.tsx`) | LIVE |
| 106 | `components/keys/anthropic-section.tsx` | 103 | — | 1 (`views/KeysPage.tsx`) | LIVE |
| 107 | `components/keys/backups-section.tsx` | 379 | — | 2 (`views/BackupsPage.tsx`, `views/KeysPage.tsx`) | LIVE |
| 108 | `components/keys/budget-status-section.tsx` | 143 | — | 1 (`views/KeysPage.tsx`) | LIVE |
| 109 | `components/keys/client-profiles-section.tsx` | 195 | — | 1 (`views/KeysPage.tsx`) | LIVE |
| 110 | `components/keys/copy-key-dialog.tsx` | 121 | — | 1 (`components/keys/provider-list.tsx`) | LIVE |
| 111 | `components/keys/custom-provider-section.tsx` | 280 | — | 1 (`components/keys/add-key-dialog.tsx`) | LIVE |
| 112 | `components/keys/discover-models-dialog.tsx` | 250 | — | 2 (`components/keys/custom-provider-section.tsx`, `components/keys/provider-list.tsx`) | LIVE |
| 113 | `components/keys/endpoints-panel.tsx` | 482 | — | 1 (`views/FallbackPage.tsx`) | LIVE |
| 114 | `components/keys/export-keys-dialog.tsx` | 216 | — | 1 (`views/KeysPage.tsx`) | LIVE |
| 115 | `components/keys/import-keys-section.tsx` | 286 | — | 1 (`components/keys/add-key-dialog.tsx`) | LIVE |
| 116 | `components/keys/model-scope-dialog.tsx` | 142 | — | 1 (`components/keys/provider-list.tsx`) | LIVE |
| 117 | `components/keys/model-select-dialog.tsx` | 163 | — | 1 (`components/keys/add-key-dialog.tsx`) | LIVE |
| 118 | `components/keys/provider-checklist-section.tsx` | 103 | — | 1 (`views/KeysPage.tsx`) | LIVE |
| 119 | `components/keys/provider-list.tsx` | 931 | — | 1 (`views/KeysPage.tsx`) | LIVE |
| 120 | `components/keys/proxy-settings-section.tsx` | 258 | — | 1 (`views/KeysPage.tsx`) | LIVE |
| 121 | `components/keys/quota-signals-section.tsx` | 56 | — | 1 (`views/KeysPage.tsx`) | LIVE |
| 122 | `components/keys/shared.tsx` | 149 | — | 5 (`components/keys/add-key-form.tsx`, `components/keys/import-keys-section.tsx`, `components/keys/provider-list.tsx`, …) | LIVE |
| 123 | `components/keys/unified-key-section.tsx` | 120 | — | 1 (`views/KeysPage.tsx`) | LIVE |

### components/language-switcher.tsx

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 124 | `components/language-switcher.tsx` | 53 | — | 1 (`App.tsx`) | LIVE |

### components/markdown.tsx

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 125 | `components/markdown.tsx` | 136 | — | 1 (`components/update-reminder.tsx`) | LIVE |

### components/media-models.tsx

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 126 | `components/media-models.tsx` | 279 | — | 4 (`views/AudioPage.tsx`, `views/ImagePage.tsx`, `views/MediaDetailPage.tsx`, …) | LIVE |

### components/mesh

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 127 | `components/mesh/MeshBadge.tsx` | 34 | — | 0 | DEAD (zero importers) |

### components/model-combobox.tsx

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 128 | `components/model-combobox.tsx` | 165 | — | 3 (`components/keys/add-key-form.tsx`, `components/playground/settings-rail.tsx`, `views/SecurityOverviewPage.tsx`) | LIVE |

### components/model-table.tsx

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 129 | `components/model-table.tsx` | 465 | — | 1 (`views/ModelDetailPage.tsx`) | LIVE |

### components/models-tabs.tsx

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 130 | `components/models-tabs.tsx` | 26 | — | 6 (`components/media-models.tsx`, `views/EmbeddingDetailPage.tsx`, `views/EmbeddingsPage.tsx`, …) | LIVE |

### components/networks

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 131 | `components/networks/mesh-topology.tsx` | 219 | — | 1 (`views/NetworksPage.tsx`) | LIVE |

### components/nodes

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 132 | `components/nodes/NodeHealthStrip.tsx` | 77 | — | 4 (`views/AppDiscoveryPage.tsx`, `views/DashboardBuilderPage.tsx`, `views/OverviewPage.tsx`, …) | LIVE |

### components/overview

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 133 | `components/overview/BreadcrumbBar.tsx` | 251 | — | 2 (`views/DashboardBuilderPage.tsx`, `views/OverviewPage.tsx`) | LIVE |
| 134 | `components/overview/OverviewGrid.tsx` | 223 | — | 1 (`views/OverviewPage.tsx`) | LIVE |
| 135 | `components/overview/ScopeSelectorModal.tsx` | 307 | — | 0 | DEAD (zero importers) |

### components/page-header.tsx

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 136 | `components/page-header.tsx` | 26 | — | 54 (`components/media-models.tsx`, `views/AdminAuditLogPage.tsx`, `views/AdminBudgetsPage.tsx`, …) | LIVE |

### components/penalty-inspector.tsx

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 137 | `components/penalty-inspector.tsx` | 228 | — | 1 (`views/FallbackPage.tsx`) | LIVE |

### components/playground

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 138 | `components/playground/conversation-sidebar.tsx` | 217 | — | 0 | DEAD (zero importers) |
| 139 | `components/playground/settings-rail.tsx` | 248 | — | 0 | DEAD (zero importers) |

### components/plugins

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 140 | `components/plugins/ActiveDeploymentsSection.tsx` | 1088 | — | 2 (`views/AgentsPage.tsx`, `views/PluginCatalogPage.tsx`) | LIVE |
| 141 | `components/plugins/PluginInstallWizardDialog.tsx` | 656 | — | 1 (`views/PluginCatalogPage.tsx`) | LIVE — PROTECTED/IN-FLIGHT |

### components/projects

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 142 | `components/projects/DeleteProjectDialog.tsx` | 65 | — | 2 (`views/ProjectDetailPage.tsx`, `views/ProjectsPage.tsx`) | LIVE |
| 143 | `components/projects/DeploymentsDialog.tsx` | 151 | — | 4 (`components/projects/DeleteProjectDialog.tsx`, `components/projects/ProjectExplorerSidebar.tsx`, `views/ProjectDetailPage.tsx`, …) | LIVE |
| 144 | `components/projects/NewProjectDialog.tsx` | 257 | — | 2 (`components/sidebar/HierarchySidebar.tsx`, `views/WorkspacesPage.tsx`) | LIVE |
| 145 | `components/projects/ProjectExplorerSidebar.tsx` | 231 | — | 1 (`views/ProjectsPage.tsx`) | LIVE |

### components/ProviderHealthDashboard.tsx

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 146 | `components/ProviderHealthDashboard.tsx` | 356 | — | 1 (`views/KeysPage.tsx`) | LIVE |

### components/ProviderStatus.tsx

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 147 | `components/ProviderStatus.tsx` | 321 | — | 0 | DEAD (zero importers) |

### components/rbac

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 148 | `components/rbac/create-access-section.tsx` | 326 | — | 2 (`views/ProjectsPage.tsx`, `views/WorkspacesPage.tsx`) | LIVE |
| 149 | `components/rbac/team-bindings-panel.tsx` | 307 | — | 1 (`views/TeamsPage.tsx`) | LIVE |

### components/realtime-logs.tsx

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 150 | `components/realtime-logs.tsx` | 435 | — | 2 (`views/FallbackPage.tsx`, `views/SDKLogsPage.tsx`) | LIVE |

### components/RealtimeMonitor.tsx

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 151 | `components/RealtimeMonitor.tsx` | 279 | — | 1 (`App.tsx`) | LIVE |

### components/RoutingAnalytics.tsx

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 152 | `components/RoutingAnalytics.tsx` | 266 | — | 1 (`App.tsx`) | LIVE |

### components/secrets

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 153 | `components/secrets/consolidated-secrets.tsx` | 329 | — | 2 (`views/ProjectSecretsPage.tsx`, `views/VaultDashboardPage.tsx`) | LIVE |

### components/security-landing-strip.tsx

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 154 | `components/security-landing-strip.tsx` | 432 | — | 1 (`views/SecurityOverviewPage.tsx`) | LIVE |

### components/security-notifications.tsx

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 155 | `components/security-notifications.tsx` | 230 | — | 1 (`App.tsx`) | LIVE |

### components/settings-dialog.tsx

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 156 | `components/settings-dialog.tsx` | 1091 | — | 1 (`App.tsx`) | LIVE |

### components/sidebar

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 157 | `components/sidebar/HierarchySidebar.tsx` | 1608 | — | 1 (`App.tsx`) | LIVE — PROTECTED/IN-FLIGHT |
| 158 | `components/sidebar/WorkspaceSwitcher.tsx` | 197 | — | 1 (`components/sidebar/HierarchySidebar.tsx`) | LIVE |

### components/subagents

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 159 | `components/subagents/SubagentsPanel.tsx` | 435 | — | 1 (`views/AgentsPage.tsx`) | LIVE |

### components/TierOnboarding.tsx

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 160 | `components/TierOnboarding.tsx` | 401 | — | 0 | DEAD (zero importers) |

### components/toaster.tsx

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 161 | `components/toaster.tsx` | 84 | — | 1 (`App.tsx`) | LIVE |

### components/token-usage-bar.tsx

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 162 | `components/token-usage-bar.tsx` | 239 | — | 2 (`views/AnalyticsPage.tsx`, `views/FallbackPage.tsx`) | LIVE |

### components/tooltip.tsx

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 163 | `components/tooltip.tsx` | 92 | — | 7 (`components/keys/provider-checklist-section.tsx`, `components/keys/provider-list.tsx`, `components/model-combobox.tsx`, …) | LIVE |

### components/ui

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 164 | `components/ui/badge.tsx` | 53 | — | 81 (`components/CostDashboard.tsx`, `components/ProviderHealthDashboard.tsx`, `components/ProviderStatus.tsx`, …) | LIVE |
| 165 | `components/ui/breadcrumb.tsx` | 61 | — | 5 (`views/DeploymentDetailPage.tsx`, `views/FirewallProviderSetupPage.tsx`, `views/FirewallTrafficLogPage.tsx`, …) | LIVE |
| 166 | `components/ui/button.tsx` | 59 | — | 118 (`App.tsx`, `components/ChatInterface.tsx`, `components/CostDashboard.tsx`, …) | LIVE |
| 167 | `components/ui/card.tsx` | 104 | — | 46 (`components/CostDashboard.tsx`, `components/ProviderHealthDashboard.tsx`, `components/ProviderStatus.tsx`, …) | LIVE |
| 168 | `components/ui/dialog.tsx` | 72 | — | 34 (`components/admin/budgets-section.tsx`, `components/embeddings/custom-provider-dialog.tsx`, `components/keys/add-endpoint-key-dialog.tsx`, …) | LIVE |
| 169 | `components/ui/dropdown-menu.tsx` | 267 | — | 6 (`App.tsx`, `components/keys/provider-list.tsx`, `components/language-switcher.tsx`, …) | LIVE |
| 170 | `components/ui/field-error.tsx` | 12 | — | 7 (`components/auth-gate.tsx`, `components/keys/add-key-form.tsx`, `components/keys/copy-key-dialog.tsx`, …) | LIVE |
| 171 | `components/ui/input.tsx` | 21 | — | 49 (`components/admin/budgets-section.tsx`, `components/auth-gate.tsx`, `components/chain-mesh-graph.tsx`, …) | LIVE |
| 172 | `components/ui/label.tsx` | 19 | — | 40 (`components/admin/budgets-section.tsx`, `components/auth-gate.tsx`, `components/embeddings/custom-provider-dialog.tsx`, …) | LIVE |
| 173 | `components/ui/popover.tsx` | 44 | — | 8 (`components/apps/ActiveAppsDropdown.tsx`, `components/model-combobox.tsx`, `components/security-notifications.tsx`, …) | LIVE |
| 174 | `components/ui/progress.tsx` | 31 | — | 1 (`components/workspaces/FileBrowser.tsx`) | ZOMBIE (imported only by dead files) |
| 175 | `components/ui/segmented-control.tsx` | 45 | — | 10 (`components/apps/ContainerLogViewer.tsx`, `components/keys/add-key-dialog.tsx`, `components/keys/provider-list.tsx`, …) | LIVE |
| 176 | `components/ui/select.tsx` | 202 | — | 33 (`components/admin/budgets-section.tsx`, `components/keys/agent-compatibility-section.tsx`, `components/keys/anthropic-section.tsx`, …) | LIVE |
| 177 | `components/ui/separator.tsx` | 24 | — | 0 | DEAD (zero importers) |
| 178 | `components/ui/skeleton.tsx` | 48 | — | 11 (`components/keys/provider-list.tsx`, `components/media-models.tsx`, `views/AnalyticsPage.tsx`, …) | LIVE |
| 179 | `components/ui/switch.tsx` | 31 | — | 21 (`components/admin/budgets-section.tsx`, `components/apps/ContainerLogViewer.tsx`, `components/keys/agent-compatibility-section.tsx`, …) | LIVE |
| 180 | `components/ui/table.tsx` | 117 | — | 37 (`components/admin/budgets-section.tsx`, `components/keys/budget-status-section.tsx`, `components/keys/import-keys-section.tsx`, …) | LIVE |
| 181 | `components/ui/tabs.tsx` | 51 | — | 6 (`components/apps/AppPanelDrawer.tsx`, `views/AppDetailPage.tsx`, `views/NotificationCenterPage.tsx`, …) | LIVE |
| 182 | `components/ui/textarea.tsx` | 19 | — | 12 (`components/keys/add-key-form.tsx`, `components/keys/client-profiles-section.tsx`, `components/keys/custom-provider-section.tsx`, …) | LIVE |

### components/update-reminder.tsx

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 183 | `components/update-reminder.tsx` | 278 | — | 2 (`App.tsx`, `components/settings-dialog.tsx`) | LIVE |

### components/usage-summary-card.tsx

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 184 | `components/usage-summary-card.tsx` | 97 | — | 1 (`components/media-models.tsx`) | LIVE |

### components/workspaces

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 185 | `components/workspaces/BrowserRuntimeModal.tsx` | 720 | — | 3 (`components/plugins/ActiveDeploymentsSection.tsx`, `components/sidebar/HierarchySidebar.tsx`, `views/PluginCatalogPage.tsx`) | LIVE |
| 186 | `components/workspaces/FileBrowser.tsx` | 395 | — | 0 | PROTECTED/IN-FLIGHT — aktuell 0 Importer, wird LIVE sobald Agent C ihn verdrahtet (deshalb NICHT in Phase A) |
| 187 | `components/workspaces/firewall-rules.tsx` | 369 | — | 1 (`views/WorkspacesPage.tsx`) | LIVE |
| 188 | `components/workspaces/JulesSessionsWidget.tsx` | 181 | — | 1 (`views/WorkspaceSettingsPage.tsx`) | LIVE |
| 189 | `components/workspaces/network-preset-picker.tsx` | 185 | — | 2 (`components/workspaces/WorkspaceDeployAppDialog.tsx`, `components/workspaces/workspace-deploy-dialogs.tsx`) | LIVE |
| 190 | `components/workspaces/PluginActivationCard.tsx` | 78 | — | 1 (`views/WorkspaceSettingsPage.tsx`) | LIVE |
| 191 | `components/workspaces/ssh-target-select.tsx` | 93 | — | 13 (`components/plugins/ActiveDeploymentsSection.tsx`, `components/projects/NewProjectDialog.tsx`, `components/sidebar/HierarchySidebar.tsx`, …) | LIVE |
| 192 | `components/workspaces/workspace-apps-dropdown.tsx` | 128 | — | 3 (`components/plugins/ActiveDeploymentsSection.tsx`, `views/WorkspaceAppsPage.tsx`, `views/WorkspacesPage.tsx`) | LIVE |
| 193 | `components/workspaces/workspace-deploy-dialogs.tsx` | 558 | — | 9 (`components/sidebar/HierarchySidebar.tsx`, `components/workspaces/WorkspaceDeployAppDialog.tsx`, `hooks/use-scope-label.ts`, …) | LIVE |
| 194 | `components/workspaces/workspace-secrets-section.tsx` | 140 | — | 1 (`views/WorkspacesPage.tsx`) | LIVE |
| 195 | `components/workspaces/WorkspaceDeployAppDialog.tsx` | 483 | — | 2 (`components/sidebar/HierarchySidebar.tsx`, `views/WorkspaceDetailPage.tsx`) | LIVE |
| 196 | `components/workspaces/WorkspaceTerminal.tsx` | 368 | — | 3 (`components/apps/AppPanelDrawer.tsx`, `components/sidebar/HierarchySidebar.tsx`, `views/WorkspaceDetailPage.tsx`) | LIVE |

### lib

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 197 | `lib/acl-policy.ts` | 369 | — | 1 (`views/NetworksPage.tsx`) | LIVE |
| 198 | `lib/admin-audit.ts` | 51 | — | 1 (`views/AdminAuditLogPage.tsx`) | LIVE |
| 199 | `lib/alias-merge.ts` | 53 | — | 1 (`views/ModelDetailPage.tsx`) | LIVE |
| 200 | `lib/api.ts` | 224 | — | 129 (`App.tsx`, `components/CostDashboard.tsx`, `components/ProviderHealthDashboard.tsx`, …) | LIVE |
| 201 | `lib/app-icons.ts` | 26 | — | 4 (`components/apps/ActiveAppsDropdown.tsx`, `components/apps/AppPanelDrawer.tsx`, `components/overview/ScopeSelectorModal.tsx`, …) | LIVE |
| 202 | `lib/app-status.ts` | 72 | — | 4 (`components/apps/ActiveAppsDropdown.tsx`, `components/apps/AppPanelDrawer.tsx`, `components/sidebar/HierarchySidebar.tsx`, …) | LIVE |
| 203 | `lib/attachments.ts` | 201 | — | 0 | TEST-ONLY (no live importer) |
| 204 | `lib/chart-axis.ts` | 151 | — | 2 (`views/AnalyticsPage.tsx`, `views/LlmProxyOverviewPage.tsx`) | LIVE |
| 205 | `lib/clipboard.ts` | 58 | — | 12 (`components/command-palette.tsx`, `components/copy-button.tsx`, `components/keys/client-profiles-section.tsx`, …) | LIVE |
| 206 | `lib/env.ts` | 33 | — | 14 (`App.tsx`, `components/api-usage.tsx`, `components/keys/anthropic-section.tsx`, …) | LIVE |
| 207 | `lib/firewall-provider.ts` | 190 | — | 2 (`views/FirewallProviderSetupPage.tsx`, `views/OpnsenseFirewallConfigPage.tsx`) | LIVE |
| 208 | `lib/fusion-filter.ts` | 39 | — | 1 (`views/FusionPage.tsx`) | LIVE |
| 209 | `lib/global-scope.ts` | 364 | — | 11 (`components/overview/BreadcrumbBar.tsx`, `components/overview/ScopeSelectorModal.tsx`, `components/projects/NewProjectDialog.tsx`, …) | LIVE |
| 210 | `lib/jules-events.ts` | 61 | — | 1 (`components/workspaces/JulesSessionsWidget.tsx`) | LIVE |
| 211 | `lib/mesh-icons.ts` | 99 | — | 1 (`components/mesh/MeshBadge.tsx`) | ZOMBIE (imported only by dead files) |
| 212 | `lib/model-groups.ts` | 75 | — | 2 (`lib/fusion-filter.ts`, `views/FusionPage.tsx`) | LIVE |
| 213 | `lib/model-scope-selection.ts` | 103 | — | 2 (`components/keys/add-key-form.tsx`, `components/keys/model-select-dialog.tsx`) | LIVE |
| 214 | `lib/model-settings.ts` | 187 | — | 1 (`views/ModelDetailPage.tsx`) | LIVE |
| 215 | `lib/playground-conversations.ts` | 161 | — | 1 (`components/playground/conversation-sidebar.tsx`) | TEST-ONLY (no live importer) |
| 216 | `lib/playground-sampling.ts` | 207 | — | 1 (`components/playground/settings-rail.tsx`) | TEST-ONLY (no live importer) |
| 217 | `lib/playground-stream.ts` | 188 | — | 0 | TEST-ONLY (no live importer) |
| 218 | `lib/pool-legend.ts` | 152 | — | 1 (`components/token-usage-bar.tsx`) | LIVE |
| 219 | `lib/query-keys.ts` | 74 | — | 21 (`components/apps/AppPanelDrawer.tsx`, `components/nodes/NodeHealthStrip.tsx`, `components/plugins/ActiveDeploymentsSection.tsx`, …) | LIVE |
| 220 | `lib/routing.ts` | 445 | — | 14 (`components/chain-mesh-graph.tsx`, `components/command-palette.tsx`, `components/keys/add-key-form.tsx`, …) | LIVE |
| 221 | `lib/scope-usage-schema.ts` | 118 | — | 0 | TEST-ONLY (no live importer) |
| 222 | `lib/section-nav.ts` | 293 | — | 2 (`App.tsx`, `components/sidebar/HierarchySidebar.tsx`) | LIVE — PROTECTED/IN-FLIGHT |
| 223 | `lib/security-events.ts` | 42 | — | 11 (`components/security-landing-strip.tsx`, `components/security-notifications.tsx`, `lib/security-overview.ts`, …) | LIVE |
| 224 | `lib/security-overview.ts` | 197 | — | 7 (`components/security-landing-strip.tsx`, `components/security-notifications.tsx`, `views/FirewallTrafficLogPage.tsx`, …) | LIVE |
| 225 | `lib/siem-timeline.ts` | 166 | — | 1 (`views/SIEMEventsPage.tsx`) | LIVE |
| 226 | `lib/ssh-endpoints.ts` | 216 | — | 19 (`components/files/FileBrowserField.tsx`, `components/files/FileBrowserModal.tsx`, `components/files/FilePathInput.tsx`, …) | LIVE |
| 227 | `lib/store.tsx` | 164 | — | 17 (`App.tsx`, `components/apps/ActiveAppsDropdown.tsx`, `components/apps/AppPanelDrawer.tsx`, …) | LIVE |
| 228 | `lib/toast-timer.ts` | 63 | — | 1 (`components/toaster.tsx`) | LIVE |
| 229 | `lib/toast.ts` | 83 | — | 69 (`App.tsx`, `components/admin/budgets-section.tsx`, `components/auth-gate.tsx`, …) | LIVE |
| 230 | `lib/tunnel.ts` | 24 | — | 2 (`components/apps/AppPanelDrawer.tsx`, `components/sidebar/HierarchySidebar.tsx`) | LIVE |
| 231 | `lib/utils.ts` | 30 | — | 37 (`components/apps/ContainerLogViewer.tsx`, `components/confirm-button.tsx`, `components/copy-button.tsx`, …) | LIVE |
| 232 | `lib/validate.ts` | 17 | — | 3 (`components/auth-gate.tsx`, `components/keys/custom-provider-section.tsx`, `components/plugins/PluginInstallWizardDialog.tsx`) | LIVE |
| 233 | `lib/workspace-scope.ts` | 96 | — | 2 (`components/sidebar/WorkspaceSwitcher.tsx`, `lib/api.ts`) | LIVE |
| 234 | `lib/workspace-status.ts` | 125 | — | 2 (`components/sidebar/HierarchySidebar.tsx`, `views/WorkspacesPage.tsx`) | LIVE |

### App.tsx

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 235 | `App.tsx` | 790 | root | 2 (`app/[[...slug]]/page.tsx`, `main.tsx`) | LIVE |

### app

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 236 | `app/[[...slug]]/page.tsx` | 11 | Next.js entry (live) | 0 | LIVE |
| 237 | `app/layout.tsx` | 28 | Next.js entry (live) | 0 | LIVE |

### hooks

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 238 | `hooks/use-premium.ts` | 41 | — | 2 (`App.tsx`, `views/PremiumPage.tsx`) | LIVE |
| 239 | `hooks/use-scope-label.ts` | 163 | — | 1 (`components/security-landing-strip.tsx`) | LIVE |
| 240 | `hooks/useRealtimeStore.ts` | 254 | — | 2 (`components/RealtimeMonitor.tsx`, `components/RoutingAnalytics.tsx`) | LIVE |

### i18n

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 241 | `i18n/context.ts` | 23 | — | 2 (`i18n/I18nProvider.tsx`, `i18n/index.ts`) | LIVE |
| 242 | `i18n/I18nProvider.tsx` | 218 | — | 1 (`i18n/index.ts`) | LIVE |
| 243 | `i18n/index.ts` | 11 | — | 141 (`App.tsx`, `components/admin/budgets-section.tsx`, `components/api-usage.tsx`, …) | LIVE |
| 244 | `i18n/locale-config.ts` | 67 | — | 4 (`components/language-switcher.tsx`, `i18n/I18nProvider.tsx`, `i18n/context.ts`, …) | LIVE |

### main.tsx

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 245 | `main.tsx` | 11 | NOT referenced (Next build uses app/) | 0 | LIVE |

### theme-context.ts

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 246 | `theme-context.ts` | 20 | — | 3 (`components/command-palette.tsx`, `components/settings-dialog.tsx`, `theme.tsx`) | LIVE |

### theme.tsx

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 247 | `theme.tsx` | 57 | — | 1 (`App.tsx`) | LIVE |

### types

| # | File | Lines | Routed in App.tsx | Live importers | Verdict |
|---|---|---|---|---|---|
| 248 | `types/domain/hierarchy.ts` | 82 | — | 9 (`components/apps/ActiveAppsDropdown.tsx`, `components/apps/AppPanelDrawer.tsx`, `components/rbac/team-bindings-panel.tsx`, …) | LIVE |
| 249 | `types/domain/network_ownership.ts` | 16 | — | 0 | DEAD (zero importers) |
| 250 | `types/domain/overview.ts` | 323 | — | 5 (`components/mesh/MeshBadge.tsx`, `components/overview/OverviewGrid.tsx`, `lib/mesh-icons.ts`, …) | LIVE |
| 251 | `types/domain/plugins.ts` | 30 | — | 4 (`components/plugins/PluginInstallWizardDialog.tsx`, `components/workspaces/PluginActivationCard.tsx`, `views/PluginCatalogPage.tsx`, …) | LIVE |
| 252 | `types/domain/security.ts` | 59 | — | 2 (`views/SecurityExposurePage.tsx`, `views/WafMatrixPage.tsx`) | LIVE |
| 253 | `types/domain/utility_deps.ts` | 25 | — | 0 | DEAD (zero importers) |

---

## Appendix B — Orphan-Route-Beweise (grep ueber den gesamten src/frontend/src, 28.9.)

| Route | App.tsx | Inbound-Links (alles ausser eigene Route-Zeile) | section-nav | HierarchySidebar-Items | Command-Palette |
|---|---|---|---|---|---|
| /agents/sessions/:sessionId | Z. 586 | **0 Treffer** | nein | nein | nein |
| /api-docs | Z. 612 | 1: OpnsenseFirewallConfigPage.tsx:159 | nein | nein | nein |
| /overview | Z. 554 | nur Root-Redirect (App.tsx:514) | nein | nein | nein |
| /security/findings | Z. 675 | 1: WorkspaceDetailPage.tsx:453 | nein (securityItems komplett ohne findings) | nein | nein |
| /dbs/datalake | Z. 703 | — | **JA (Z. 216)** — Audit-Fund R5 ist seit heute gefixt | — | — |

## Appendix C — Test-Dateien (38 Vitest-Entry-Points; fuer Loesch-Nachweise)

components: AppPanelDrawer.test.tsx, NewProjectDialog.test.tsx, create-access-section.test.ts, team-bindings-panel.test.tsx, HierarchySidebar.test.tsx, WorkspaceSwitcher.test.tsx, __probe.test.tsx, SubagentsPanel.test.tsx, settings-dialog.test.ts, fallback-page.test.ts, WorkspaceTerminal.test.tsx
views: AdminAuditLogPage, AdminUsersPage, DashboardsPage, FirewallRulesPage, WafMatrixPage, WorkspacesPage (je .test.tsx)
lib: acl-policy, alias-merge, attachments, chart-axis, chart-axis.render, clipboard, fusion-filter, global-scope, model-scope-selection, model-settings, playground-conversations, playground-sampling, playground-stream, pool-legend, routing, scope-usage-schema, section-nav, toast, toast-timer, workspace-scope, workspace-status (je .test.ts(x))

Test-Referenzen auf Plan-Objekte: WorkspaceDeployDialog / WorkspaceDeployAppDialog / BrowserRuntimeModal — **kein direkter Test** (WorkspacesPage.test.tsx deckt die Create/Provision/Gate-Flows ab, HierarchySidebar.test.tsx die Quick-Deploy-Wiring); DeploymentsDialog / ProjectsPage — **kein Test**; DeleteProjectDialog — ungetestet (Live-Pfad ProjectDetailPage); NewProjectDialog — 1 Suite; WorkspaceTerminal — 1 Suite; AppPanelDrawer — 1 Suite.

## Appendix D — Referenz-Dokumente

- docs_dev/AUDIT-2026-09-27-FRONTEND-INTEGRATION-GAPS.md (der 27.9.-Audit; liegt in jimesh/docs_dev, NICHT in ihc24 — der im Auftrag genannte ihc24-Pfad existiert nicht)
- docs_dev/CASE-STUDY-2026-09-28-NAV-IA-CONSOLIDATION.md (Nav/IA-Bezug fuer C4/C6)
- /home/ji/projects/ihc24/OPEN-ITEMS-2026-09-28.md (Punkte 5, 9, 12, 15-17 = Kontext dieses Plans)
- MANDATES.md:113-114 (Mandat 7 — nach Phase A auf den neuen Stand umformulieren)
- Verifikations-Baselines laut Commit 26b675b: tsc 477 vorbestehend, vitest 364/365 (1 vorbestehender Fail), check:i18n PASS
