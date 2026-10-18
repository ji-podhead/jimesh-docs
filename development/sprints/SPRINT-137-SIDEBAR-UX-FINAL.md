# SPRINT-137 — SIDEBAR-UX-FINAL (sidebar-ux-final)

> Vorlage: docs_dev/SIDEBAR-UX-FINAL-CONCEPT.md (499 Zeilen, UX-Case-Study,
> Operator-freigegeben) — „Zwei immer sichtbare Baum-Sektionen (Server,
> Projekte) mit echten Namen statt UUIDs, ein einziger kompakter
> Scope-Regler darüber, Aktions-Badges (Terminal / Logs / Code / Web / VNC /
> DSH) und [+ App]-Quick-Deploy direkt an den Zeilen, Cross-Cutting-Links
> darunter."
> Branch: `sidebar-ux-final` (von main bbfb85d) · Datum: 27.9.2026

## Ziel (aus dem Konzept §3, 1:1)

Die Sidebar (src/frontend/src/components/sidebar/HierarchySidebar.tsx,
kompletter Rewrite) ersetzt den 3-Button-Umschalter + Entity-Filter +
Level-Modal-Kaskade durch genau diese Reihenfolge:

1. **A — Scope-Bar**: eine kompakte Zeile (Crosshair + Zusammenfassung des
   aktiven Scopes: „All servers & projects" / „2 servers · 1 project" /
   der eine Name) + Chips darunter. Klick öffnet EINEN Popover mit
   BEIDEN Achsen als Checkbox-Bäumen (Gruppe SSH targets + Gruppe
   Projects). Apply schreibt den GLOBAL SCOPE mit den Multi-Arrays
   (lib/global-scope.ts UNVERÄNDERT — ein Scope-Konzept, zwei Eingänge:
   Popover für Multi, Zeilen-Klick für Navigation).
2. **B — „ALL SSH TARGETS"**: Server → Workspaces → Apps, immer sichtbar,
   eigenständig einklappbar, **default zu** (Ops-/Gesundheitsblick;
   die Arbeit ist projektzentriert). [+]-Knopf im Header → Endpoints-Form
   (/workspaces/endpoints).
3. **C — „PROJECTS"**: Projects → Workspaces → Apps, immer sichtbar,
   **default offen**. [+]-Knopf im Header → NewProjectDialog (Backlog
   #134). Workspace-Zeilen nach §8.3b benannt, die jeweils ANDERE Achse
   als Tag.
4. **D — Navigation**: die 7 Cross-Cutting-Links unverändert.
5. **E — Events & Observability**: die 5 Links, jetzt UNTEN (K4), default
   zu, mit ehrlichem Count-Badge aus echten SIEM-Events (A6; nur > 0,
   Mandate 2).

**Kill-Liste (Konzept §5, umgesetzt):** K1 Layout-Buttons +
`jimesh.sidebar-view-mode` · K2 Entity-Filter +
`jimesh.sidebar-entity-filter` · K3 Level-Dropdown → ein Popover mit
beiden Achsen · K4 Events über Navigation · K5/K6 UUID-Workspace-Labels →
§8.3b-Namen · K7 „+ New App" als primärer Erzeug-Weg (Deploy ist jetzt
Zeilen-Aktion; /workspaces/apps bleibt Management-Übersicht) — plus der
freistehende „+ New Project"-Knopf wanderte in den PROJECTS-Header (§3.7).

**Add-Liste (Konzept §6, umgesetzt):** A1 Badges T/L/C/W/V/D an App-Zeilen ·
A2 [+ App]-Quick-Deploy an Workspace-Zeilen (beide Sektionen) · A4
Onboarding-Einstieg über den Empty-State · A5 Status-Punkte (echt für
Deployment-Rows, ehrlich grau für Server-Registry-Rows ohne Statusfeld) ·
A6 Event-Count-Badge · A7 echte Workspace-Anzeigenamen · A8 Scope-Bar als
Zusammenfassung + Popover + Chips.

**Bewusst NICHT umgesetzt (ehrlich, Konzept-Zitat):** WP0/WP4
Multi-Select-Selection-Mode + Selection-Bar (§3.8) — jede verbindende
Multi-Aktion ist laut Konzept VOR dem Verdrahten an die Endpoint-Audit-
Tabelle und Operator-Freigabe gebunden; die existiert nicht, also wird
nichts halb-audiert ausgeliefert. A3 („Standard-App sofort mitdeployen")
und A9 (Suchfeld, Konzept: „optional, WP zuletzt") ebenso zurückgestellt —
A9 als kleiner Follow-up. Das ScopeSelectorModal bleibt als Datei
existieren (Auftrag), ist aber nirgends mehr getriggert: sein einziger
Konsument war die Sidebar (grep-Beleg) — Reachability-Note siehe unten.

## Work Packages

| WP | Inhalt | Status |
|---|---|---|
| WP1 | `HierarchySidebar.tsx` kompletter Rewrite: Scope-Bar (Popover-Body mit frischem Draft pro Öffnen, Apply → `setGlobalScope` Multi-Arrays, leer = clearGlobalScope; Chips + Entfernen 1:1 aus SPRINT-52 übernommen, Workspace-Chips jetzt mit §8.3b-Namen); K1/K2/K3 entfernt; kein zweiter Selection-Store mehr | [x] erledigt |
| WP2 | Parallele Sektionen B/C inkl. Collapse-Chevron + Persistenz in EINEM neuen localStorage-Key `jimesh.sidebar-collapsed` (§3.10; ersetzt view-mode + entity-filter), §8.3b-Namen + Reihenfolge (own → company → andere User → Raw-ID-Fallback), Gegenachsen-Tags (§8.5-Regel ohne Toggle), Unassigned-Bucket nur wenn belegt, Empty-States mit handelnden Einstiegen (A4: Start onboarding + New Project / Register server) | [x] erledigt |
| WP3 | Row-Aktionen (§3.5): App-Badges [T][L][C][W][V][D] NUR aus echten Deployment-Row-Daten (`interfaces`, P0-4-Derivation des Deploy-Engines, shape-tolerant gelesen; Framework über `type`) — [T] Terminal → Tunnel auf Port 3080 bzw. vnc/code-server-Port bzw. BrowserRuntimeModal-Deploy-Fallback (exakt die ActiveDeploymentsSection-Kette), [L] Logs → ContainerLogViewer im Dialog (SSE-Route), [C]/[W]/[V] → Tunnel-URL im iframe-Dialog (ProjectsPage-Panentechnik), [D] → /sessions; [+ App] → WorkspaceDeployAppDialog (workspace + Project-Row vorbefüllt, DSH-Default via initialAppId); Workspace-[T] = erster App-Shell des Workspace; [⚙] auf Server- (→ SSHTargetDetailPage) und Project-Zeilen; Status-Punkte: Deployment-Status echt (grün/rot/amber/grau), Server-Rows ehrlich grau | [x] erledigt |
| WP4 | `NewProjectDialog.tsx` Preselect-Umverdrahtung (direkte K1/K2-Folge): die toten localStorage-Keys sind durch den GLOBAL SCOPE ersetzt — Preselect = kind 'ssh' + sshEndpointId (Endpoint-ID statt altes Host-Slot), Stale-ID/anderer Scope-Kind → ehrlich 'All Servers'. `NewProjectDialog.test.tsx` auf Scope-getrieben umgestellt | [x] erledigt |
| WP5 | Sections D/E: Events & Observability unter Navigation, default zu, Count-Badge = `siemEvents.length` (echte /api/sdk/logs?type=audit-Rows, nur > 0); DAST behält sein ehrliches „not yet implemented"-Tab-Label | [x] erledigt |
| WP6 | i18n: 17 neue Keys (`sidebar.scopeAll`, `myWorkspace`, `companyWorkspace`, `quickDeploy`, `emptyServers`, `registerServer`, `startOnboarding`, `terminalOpened`, `badge.{terminal,logs,code,web,vnc,dsh}`, `scopeServersCount`, `scopeProjectsCount`, `eventsCount`) in ALLEN 60 Locales — 39 echt übersetzt (inkl. de; Plural-Sprachen mit zahlensicherer „Label: {count}"-Form), 21 en-Fallback (S55/S135-Standard, scripts/backfill-i18n.mjs-Logik); bestehende Keys (scopeSelector.*, nav.*, sidebar.*, common.*, appDetail.*) weiterverwendet | [x] erledigt — check:i18n grün (60 Locales, 2893 Keys) |
| WP7 | Tests: `HierarchySidebar.test.tsx` kompletter Rewrite (21 Tests) — Scope-Bar/Popover/Chips/Kontra-Vertrag (keine Layout-Buttons, keine Entity-Filter-Keys), parallele Sektionen + Persistenz, §8.3b-Namen, Badge-Realität je Interfaces, [L]/[+ App]-Dialoge, Name-Klick → AppDetailPage, [D] → /sessions, Events-Count + K4-Lage, Empty-States, Onboarding-Navigation | [x] erledigt — 21/21 |
| WP8 | Docs: dieses Sprint-File, Backlog-Spiegel S137, ARCHITECTURE.md §8.5 Sidebar-Teil (parallele Sektionen statt Dual-Toggle, Detailseiten-Dreifachansicht bleibt offen), Konzept-Statusnote; API_DOCS.md unverändert (keine Route berührt) | [x] erledigt |

## Akzeptanz & Verifikation (am Code verifiziert, 27.9.2026)

- `npx tsc --noEmit -p tsconfig.app.json`: **478 Fehler vor == 478 nach,
  0 neue** (A/B via git stash des Sidebar-Rewrites).
- `npx eslint .`: **433 → 431 Probleme (−2, 0 neue)**; alle 4 angefassten
  Dateien lint-clean.
- `npx vitest run` (Voll-Suite): **296/296 PASS** (29 Dateien), davon
  Sidebar-Suite 21/21 und NewProjectDialog-Suite 6/6 (neu: Scope-getriebene
  Preselect-Verträge).
- `npm run check:i18n`: **grün — 60 Locales, 2893 Keys** (vorher 2876;
  +17 Keys × 60 Locales, Platzhalter paritätisch).
- Flows (Konzept §7): F1 Projekt erstellen = [+] im PROJECTS-Header + Formular
  (≤ 2 Klicks) · F2 App deployen = [+ App] an der Workspace-Zeile + Mini-Dialog
  (≤ 2 Klicks + Dialog) · F3 Terminal = [T]-Badge (1 Klick, Tunnel) · F4 Logs
  = [L]-Badge (1 Klick, Dialog) · F5 Security = Events-Section aufklappen + Link
  (≤ 2 Klicks). Jeder Zero-State hat einen handelnden Einstieg (kein reiner
  Text).

## Ehrliche Grenzen & Offenes (Mandate 5)

- **[D]-Badge**: springt auf die reale /sessions-Fläche (Route existiert,
  AgentSessionDetailPage wählt die aktive Session selbst). Eine
  App↔Session-Deep-Link-Zuordnung braucht ein echtes Backend-Feld
  (SessionRow↔workspace/container) — nicht erfunden (Mandate 2).
- **Server-Statuspunkte**: die ssh_endpoints-Registry hat kein Statusfeld →
  grau = unbekannt (§3.9), kein Fake-Grün. Echte Server-Health bräuchte eine
  echte Quelle.
- **WP0/WP4 (Selection-Mode)**: wie oben — erst Audit-Tabelle + Operator-
  Freigabe, dann UI.
- **A3 Auto-Deploy-Checkbox**: braucht den Deploy-Endpoint-Stand aus Backlog
  #128 (GET /api/deployments existiert als Row-Registry; der Konzept-Autor
  meinte vermutlich einen Status/Lauf-Endpoint) — ehrlich weggelassen.
- **ScopeSelectorModal now orphaned**: bleibt laut Auftrag als Datei
  bestehen, hat aber keinen UI-Trigger mehr (zuvor: einziger Konsument war
  die Sidebar-Level-Kaskade, K3). Erwartbare Mandate-14-Diskussion beim
  Operator: entweder löschen oder neu andocken — hier bewusst NICHT entschieden.
- **Live-Smoke am laufenden Stack**: offen (Operator) — Stack läuft in dieser
  Umgebung nicht; die Verifikation lief über die Voll-Suite.
