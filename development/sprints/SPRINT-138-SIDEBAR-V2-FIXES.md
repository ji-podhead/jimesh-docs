# SPRINT-138 — SIDEBAR-V2-FIXES (4 live gemeldete Operator-Fixe)

> Auslöser: Operator-Report live am laufenden GUI (4 UI-Probleme an der
> S137-Sidebar). Branch: `sidebar-v2-fixes` (von main) · Datum: 27.9.2026
> · Datei: src/frontend/src/components/sidebar/HierarchySidebar.tsx

## Parallel-Sektion (SHARED CHECKOUT — vorab lesen)

Diese Session lief GLEICHZEITIG mit der Sibling-Session
**SPRINT-138 feat-workspace-terminal** (echtes Workspace-Terminal via
docker exec, eigener Backend-Route) im SELBEN Working Tree. Die locale
JSONs tragen deshalb BEIDER Sessions Keys (meine 4 sidebar.*-Keys + deren
terminal.*-Gruppe + wsDetail.openTerminal); `check:i18n` ist grün (60
Locales, 2905 Keys). Die Sibling-Session hat außerdem die FIX-4-[Terminal]-
Kette im Sidebar übernommen und erweitert (siehe FIX 4 unten): deployed →
ECHTES Exec-Terminal-Modal, statt meines Interims-Tunnels. Deren eigene
Suite (WorkspaceTerminal.test.tsx) ist zum Commit-Zeitpunkt NOCH in Arbeit
(7/7 rot, 2 tsc-Fehler in deren Datei) — NICHT Teil dieses Commits; die
tsc-Delta-Rechnung unten trennt das ehrlich auf.

## Ziel

Vier gemeldete Probleme an der S137-Sidebar beheben, ohne den
SIDEBAR-UX-FINAL-Vertrag (parallele Achsen, §8.3b-Namen, echte Badges,
KILL-Liste) zu brechen:

1. **FIX 1 — Projekt-Button-Größe**: Der [+] Projekt-Button in
   Sektions-Headern war KLEINER als die Zeilen-Items darunter. Er trägt
   jetzt exakt deren Metrik (px-2 py-1.5 text-sm, Plus size-3.5) — gleiche
   Höhe, gleiches Padding, kein Mini-Button neben vollgroßen Zeilen.
2. **FIX 2 — Scope-Selector nach UNTEN**: Die Scope-Bar steht nicht mehr
   ganz oben, sondern GANZ UNTEN (Reihenfolge: B ALL SSH TARGETS → C
   PROJECTS → D Navigation → E Events & Observability → A Scope-Bar),
   `mt-auto` + `sticky bottom-0` am Sidebar-Boden (kurzer Baum: pinnt
   unten; langer Baum: bleibt beim Scrollen sichtbar), `side="top"`
   lässt den Popover nach oben aufgehen.
3. **FIX 3 — Multi-Select im Baum, gekoppelt an den Scope**: Der Baum IST
   jetzt der Scope-Selector — Projektklick (PROJECTS-Sektion) und
   Server-Klick (ALL SSH TARGETS, nur registrierte Targets) togglen die
   Multi-Auswahl DIREKT über `setGlobalScope`
   (selectedServerIds/selectedProjectIds via das eine `applyScopeSelection`,
   derselbe Writer wie der Popover; leer = clearGlobalScope). Ausgewählte
   Zeilen: Highlight bg-primary/15 + Check-Icon + aria-pressed; Chevron
   expandiert, Label toggelt die Auswahl; Workspace-Klick expandiert
   weiterhin OHNE Scope-Change (Doppelklick navigiert wie bisher). Die
   Bar unten zeigt NUR die Zusammenfassung ("2 servers · 1 projects" /
   Anker-Name / "All servers & projects") — die entfernbaren Chips sind
   GESTRICHEN (Toggle im Baum + Popover sind die Exits). Ein von einer
   Seite gesetzter Single-Form-Scope (kind ssh/project/workspace/app/
   session) zählt als Auswahl mit (ein Auswahlkonzept, jede Front).
4. **FIX 4 — Terminal + Files auf Workspace-Ebene**: Jede Workspace-Zeile
   (beide Sektionen) trägt zwei IMMER sichtbare Icon-Buttons (kein
   Hover-Gate, kein Deployment-Gate): [Terminal] (lucide Terminal, size-3.5)
   — als Endergebnis der Parallel-Integration: deployed → das ECHTE
   WorkspaceTerminal-Exec-Modal (docker exec über WebSocket in den
   gVisor-Container, GET /api/workspaces/{id}/terminal — NIE ein SSH-Hop
   auf den Host, Operator-Sicherheitsentscheid; App-Zeilen behalten die
   bewährte Tunnel-Kette), nicht deployed → BrowserRuntimeModal
   (runtimeModalProject-State, deployt nötigenfalls einen Shell-Runtime in
   den Workspace-Container), ohne Projekt-Kontext ehrlicher Toast;
   [Files] (lucide FolderOpen) — das ECHTE FileBrowserModal
   (components/files) auf dem registrierten Node der Workspace (Match:
   ws.sshTarget → endpoint host/name, Fallback project.nodeHost; volles
   SshEndpoint-Row via useSshEndpoints, weil die SSOT-Registry kein
   authMethod trägt), Startpfad = project.workspacePath, dirs_only aus
   (auch Dateien), gewählter Pfad → Zwischenablage + Toast; ohne Endpoint
   ehrlicher Toast statt Fake-Browser.

**Bewusst unverändert**: lib/global-scope.ts (keine Zeile angerührt —
Multi-Arrays existierten seit SPRINT-52), ScopeSelectorModal.tsx (bleibt
Datei), §8.3b-Namen, App-Badges, [+ App]-Quick-Deploy, [⚙]-Buttons,
Empty-States, Collapse-Persistenz, API_DOCS.md (keine Route von DIESER
Session berührt — die terminal-Route gehört der Sibling-Session).

## Work Packages

| WP | Inhalt | Status |
|---|---|---|
| WP1 | FIX 1+2: SectionHeader-[+] auf Zeilen-Metrik (px-2 py-1.5 text-sm); Scope-Bar aus dem Kopf entfernt, als letztes Element mit mt-auto + sticky bottom-0 + border-t + bg-background (kein Durchscheinen beim Scrollen), Popover side="top"; Sektion B verliert ihr border-t (erster Abschnitt) und bekommt pt-3 | [x] erledigt |
| WP2 | FIX 3: activeServerIds/activeProjectIds (Multi-Arrays zuerst, Single-Form-Anker zählt mit — identisch zur Popover-Draft-Saat), toggleServerInScope/toggleProjectInScope über das eine applyScopeSelection; Server-/Projekt-Zeilen in Chevron (expand, aria-expanded) + Label (Toggle, aria-pressed, bg-primary/15 + Check) getrennt; selectProject gelöscht (Klick selektiert statt zu navigieren; [⚙] bleibt der Detail-Weg); Workspace-Klick = reines toggleRow; scopeSummary ohne Chips (Single-Form-Anker zeigt echten Namen); ScopeChip-Interface + Chips-Memo + removeScopeChip entfernt (−170 Zeilen toten Chip-Codes) | [x] erledigt |
| WP3 | FIX 4: renderWorkspaceRow umgebaut — Terminal-Handler (deployed → WorkspaceTerminal-Exec-Modal [Sibling-Integration, ersetzt meinen Interims-Tunnel], sonst BrowserRuntimeModal-Fallback, sonst ehrlicher Toast) und openWorkspaceFiles (Endpoint-Match sshTarget/Name/nodeHost → FileBrowserModal mit initialPath=workspacePath, dirsOnly=false; sonst ehrlicher Toast); beide Icon-Buttons IMMER sichtbar (eigener Span ohne actionVisibility, jenseits des [+ App]-Hover-Badges); FileBrowserModal-Renderblock mit Pfad→Clipboard + Toast; useSshEndpoints (eigener QueryKey, kein Cache-Poisoning zum SSOT-Store) | [x] erledigt |
| WP4 | i18n: 4 neue Keys (sidebar.badge.files, sidebar.terminalRequiresContext, sidebar.filesRequireEndpoint, sidebar.filesPathCopied) in en.json + de.json von Hand; dann scripts/i18n-translate.py wie beauftragt — Google Translate drosselte diese IP hart (429 über 20+ Minuten, trotz 3×-Retry im Script und separat getakteter Probeloop), das Script schrieb daher seinen DESIGNETEN ehrlichen en-Fallback in die 58 Locales (S55/S135-Standard, gleiche Praxis wie S137: 21 en-Fallback-Locales). de ist echt hand-übersetzt. Nachtrag möglich, sobald Google die IP wieder lässt | [x] erledigt — mit dokumentiertem 429-Fallback |
| WP5 | Tests: HierarchySidebar.test.tsx überarbeitet — Projekt-Zeilen-Klicks der alten Tests auf den neuen Expand-Chevron umgestellt; Popover-Rows auf [data-slot="popover-content"] gescopet (Kollision mit den neuen aria-pressed-Baumzeilen); Chip-Removal-Test ersetzt durch den FIX-3/4-Vertrag; NEUE Tests: Multi-Select toggelt Scope (Projekte + Server + Mixed), Highlight (bg-primary/15 + Check + aria-pressed), Bottom-Position + sticky, [+]-Metrik, Workspace-Expand ohne Scope-Change, Single-Form-Highlight, Terminal→Exec-Modal (deployed) / Terminal→BrowserRuntimeModal (undeployed), Files→FileBrowserModal mit echtem /api/ssh/explore-Body; xterm in jsdom gemockt (Canvas-Messung gehört der WorkspaceTerminal-Suite) | [x] erledigt — 31/31 |
| WP6 | Docs: dieses Sprint-File, Backlog-Spiegel S138; API_DOCS.md unverändert von DIESER Session (terminal-Route dokumentiert die Sibling-Session) | [x] erledigt |

## Akzeptanz & Verifikation (am Code verifiziert, 27.9.2026)

- `npx tsc --noEmit -p tsconfig.app.json`: **478 Fehler vor == 478 nach
  für DIESE Session (0 neue)** — beide geänderten Sidebar-Dateien tragen
  0 Fehler. Der Baum misst aktuell 480 = 478 + 2, wobei BEIDE neuen in
  src/components/workspaces/WorkspaceTerminal.test.tsx der SIBLING-Session
  liegen (deren Datei, mid-flight, NICHT in diesem Commit).
- `npx vitest run src/components/sidebar/` (der beauftragte Scope):
  **31/31 PASS**. Die Voll-Suite war zum Verifikationszeitpunkt meiner
  Änderungen (vor dem Erscheinen der Sibling-Test-Datei) **306/306 PASS**
  (29 Dateien); aktuell wäre die Voll-Suite rot NUR durch
  WorkspaceTerminal.test.tsx (Sibling, 7/7 — nicht Teil dieses Commits).
- `npx eslint` auf beiden geänderten Sidebar-Dateien: **clean (0
  Probleme)**.
- `npm run check:i18n`: **grün — 60 Locales, 2905 Keys** (beider Sessions
  Keys, Parität intakt).
- Flows: Projekt im Baum anklicken = Scope-Filter (kein Navigationssprung
  mehr) · Chevron = expandieren · Popover unten = zweite Wahl-Möglichkeit ·
  Terminal an jeder Workspace-Zeile (deployed → Exec-Modal, undeployed →
  Deploy-Fallback) · Files an jeder Workspace-Zeile.

## Ehrliche Grenzen & Offenes (Mandate 5)

- **i18n 429**: Google Translate blockte diese IP (5 req/s-Limit; das Script
  taktet 0.1 s und macht 236 Requests für 59 Locales — für den Free-
  Endpoint zu aggressiv, known limitation des Scripts). en-Fallbacks sind
  der dokumentierte Standard; Nachübersetzen ist ein Einzeiler, sobald die
  IP frei ist (`python3 scripts/i18n-translate.py --key sidebar.badge.files
  --locale <X>` etc. oder --all nach Prüfung).
- **Negativ-Pfade**: die Fixture-Registries geben jedem Workspace ein
  Projekt und einen matchenden Endpoint; die beiden ehrlichen Hint-Toasts
  (Terminal ohne Projekt-Kontext, Files ohne registriertes Target) sind
  3-Zeilen-Guards — per Code-Inspektion verifiziert, nicht per UI-Test
  (im Test-File-Kopf ehrlich dokumentiert).
- **Shared-Tree-Kollisionen** (alle ehrlich aufgelöst): (1) mein Translate-
  Script und das i18n-Migrationsscript der Sibling-Session schrieben
  concurrently in dieselben 60 locale JSONs — da.json verlor dadurch kurz
  deren terminal-Keys; ein Re-Run von add-sprint138-terminal-i18n.mjs
  (idempotent, verändert existierende Keys nie) heilte den Baum, check:i18n
  grün. (2) Die Sibling-Session ersetzte meinen Interims-Tunnel im
  FIX-4-Terminal-Handler durch ihr echtes Exec-Modal — übernommen, meine
  Tests entsprechend erweitert (deren WS-Protokoll-Assertions bleiben in
  deren Suite, wie deren eigener Kommentar es vorsieht). (3)
  WorkspaceTerminal.tsx (Sibling-Komponente) muss MIT in diesem Commit
  sein, weil HierarchySidebar.tsx es importiert — ohne sie wäre der Branch
  nicht buildbar; deren Test-Datei (rot, mid-flight) bewusst NICHT
  mit-committet.
- **node_modules-Fund**: vitest+jsdom fehlten im Frontend-node_modules
  (NODE_ENV=production im Shell → npm omit=dev); mit
  `npm install --include=dev` aus dem Lockfile (vitest 3.2.7, jsdom
  27.4.0) wiederhergestellt — kein package.json/Lockfile-Drift.
- **FileBrowserModal-Title-Bug (pre-existing)**: dessen `t(key, fallback)`-
  Muster funktioniert mit der echten i18n-t-Signatur nicht (Arg 2 ist
  vars) — der Modal-Titel zeigt den Raw-Key. NICHT hier gefixt (nicht
  Teil des Auftrags); als Fund notiert.
- **Live-Smoke am laufenden Stack**: offen (Operator).
