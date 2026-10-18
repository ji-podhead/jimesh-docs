# SPRINT-55 — SIDEBAR-LAYOUT-V2 (fix-sidebar-layout-v2)

> Anlass: Operator-Decision zu
> docs_dev/prompts/glm-sidebar-scope-redesign.md — „mach statt diesem scope
> selector oben bitte ein by server, all projects, all workspaces buttons
> auf und das sind layout buttons für den oberen teil der sidebar".
> **+ KLARSTELLUNG gleichen Tages (höchste Priorität)**: Buttons heißen
> jetzt **[ Server ] [ Workspace ] [ Project ]**, darunter je Modus ein
> Entity-Selector ('All <Axis>' oder eine spezifische ID), der den Baum
> filtert — Layout-Switch + Entity-Filter in EINEM (s. Abschnitt
> „Operator-Klarstellung").
> Die Buttons sind LAYOUT-Schalter für die Anordnung des Baums, KEIN
> Scope-Selector; die ScopeSelectorModal-Funktionalität (globaler Scope =
> Data Filtering) bleibt vollständig erhalten.
> Branch: `fix-sidebar-layout-v2` · Datum: 27.9.2026

## Ziel

Die Sidebar (src/frontend/src/components/sidebar/HierarchySidebar.tsx)
bekommt ganz oben eine horizontale 3-Wege-Buttongruppe:

**[ By Server ] [ All Projects ] [ All Workspaces ]**

Sections der Sidebar danach (oben → unten, 3+4 immer sichtbar):

1. **Layout** — die drei Buttons (rein visuell, pro Viewer persistiert,
   localStorage `jimesh.sidebar-view-mode`; berühren NIE den globalen Scope)
2. **Scope** — Trigger + Chips + ScopeSelectorModal (SPRINT-52 WP1,
   Funktionalität unverändert, nur unter die Layout-Buttons gerückt)
3. **Events & Observability** — Firewall Rules, SIEM Events, Network
   Monitoring, SAST, DAST
4. **Navigation** — Integrations, Apps, Plugins, Deployments, Servers,
   Settings
5. **Baum** — modusabhängig:
   - `server`: ALLE SSH-Endpoints (Registry `/api/settings/ssh_endpoints`
     ∪ Ad-hoc-sshTarget-Labels) als Header, darunter Workspaces gruppiert
     nach sshTarget (21.9. Operator-Fund: auch registrierte Server ohne
     Workspaces erscheinen als ehrliche leere Gruppe)
   - `projects`: ALLE Projects als Header, darunter Workspaces pro
     echtem FK (`Workspace.projectId`) + `no_parent`-Bucket
   - `workspaces`: ALLE Workspaces in EINER flachen Liste, jede Row mit
     Project-Tag UND sshTarget-Tag

Entfernt: der alte 2-Wege-Toggle (By Project / By Server) und der
ALL-Parent-Button — „alles sehen" ist jetzt der Default-Zustand jedes
Modus (jeder Modus listet seine komplette Achse); der globale Scope
bleibt über die Scope-Section steuerbar.

## Work Packages

| WP | Inhalt | Status |
|---|---|---|
| WP1 | `HierarchySidebar.tsx`: `SidebarViewMode` auf `'server' \| 'projects' \| 'workspaces'` erweitert (Legacy-Wert `'project'` migriert nach `'projects'`, ohne Verlust gespeicherter Viewer-Präferenzen); Layout-Buttongruppe als Section 1; Scope-Section darunter (unverändert); Reihenfolge Events → Navigation; alter Toggle + ALL-Parent-Button entfernt | [x] erledigt |
| WP2 | Neuer Modus `workspaces`: flache Liste (Sortierung Project → Server → Id), jede Row mit BEIDEN Tags, ehrlicher Empty-State (`sidebar.noWorkspaces`), Rows wie gehabt aufklappbar (Apps) und klickbar (Workspace-Detail) | [x] erledigt |
| WP3 | i18n: `sidebar.allProjects` / `sidebar.allWorkspaces` in ALLEN 60 Locales (de: „Alle Projekte"/„Alle Workspaces", Rest English-Fallback wie beim bestehenden `viewByServer`); `sidebar.viewByServer` („By Server") wiederverwendet | [x] erledigt |
| WP4 | Tests (`HierarchySidebar.test.tsx`): Layout-Button-Vertrag — 3 Buttons, Default `server` zeigt registrierte Endpoints als Header, `All Projects` listet Project-Header, `All Workspaces` flach mit beiden Tags, Legacy-Migration `project` → `projects` | [x] erledigt |

## Akzeptanz & Verifikation (am Code verifiziert, 27.9.2026)

- `npx tsc --noEmit -p tsconfig.app.json`: **479 Fehler vor == 479 nach,
  identische Fehlermenge** (diff leer) — 0 neue Fehler; die 479 sind
  pre-existing (u. a. t()-Signatur in Views, Vite-Rest-tsconfig).
- `npx vitest run src/components/sidebar/HierarchySidebar.test.tsx`:
  **11/11 grün** (7 bestehende Scope-/Section-Tests unangetastet grün +
  4 neue Layout-Tests).
- `npx vitest run` (GESAMTE Frontend-Suite): **27 Dateien / 278 Tests,
  alle grün** — die Locale-Ergänzungen und die Sidebar brechen nichts.
- `npm run check:i18n` (src/frontend): **grün — 60 Locales, 2841 Keys**
  (Parität; die Keys sind neu in allen Locales).
- Keine Route geändert → API_DOCS.md unverändert; keine neuen Oberflächen,
  keine URL-Änderungen (Mandate 2/14 eingehalten — Navigation-Section ist
  unverändert der bestehende Routen-Vorrat).

## Operator-Klarstellung (27.9., höchste Priorität — Nachtrag-Commit)

Klartext des Operators: OBEN ein Layout-Switch mit 3 Buttons
**[ Server ] [ Workspace ] [ Project ]**; bei JEDEM Modus danach ein
Selector **'All <Axis>' oder eine spezifische ID** (Server aus
/api/settings/ssh_endpoints, Workspace, Project). Der Baum DARUNTER wird
nach der Auswahl GEFILTERT: Server-Modus Server→Workspaces→Apps,
Workspace-Modus Workspaces→Apps, Project-Modus Projects→Workspaces→Apps.
**KEIN ScopeSelectorModal für die visuelle Anordnung** — Layout-Switch +
Entity-Filter sind EIN Unit; der global-scope (Daten-Filterung für
API-Calls) bleibt separat (Scope-Section, unverändert).

| WP | Inhalt | Status |
|---|---|---|
| K1 | Buttons auf [ Server ] [ Workspace ] [ Project ] umgestellt (Reihenfolge + Singular-Labels, neue Keys `sidebar.modeServer/modeWorkspace/modeProject`); Layout-Buttons + Entity-Selector in EINER Section | [x] erledigt |
| K2 | Entity-Selector (Base-UI-Dropdown, Single-Select): 'All Servers/Workspaces/Projects' oder eine konkrete Registry-Row; pro Modus EIGENER Selection-Slot (localStorage `jimesh.sidebar-entity-filter`), gegen die Live-Registries validiert (stale id → ehrlich 'All') | [x] erledigt |
| K3 | Baum-Filterung: Server-/Project-Gruppe bzw. Workspace-Row wird auf die Auswahl gefiltert und eine Ebene auto-expandiert (expliziter Toggle gewinnt weiterhin); no_parent-Bucket nur in der All-Ansicht; ScopeSelectorModal NICHT in die Anordnung eingebunden | [x] erledigt |
| K4 | i18n: `sidebar.allServers` neu (de „Alle Server"), mode-Keys in allen 60 Locales | [x] erledigt — check:i18n grün (60 Locales, 2845 Keys) |
| K5 | Tests auf den Klarstellungs-Vertrag umgeschrieben (13 gesamt): 3 Buttons + All-Selector-Default, Server-Filter (auto-expand + Reset), Workspace-Filter, Project-Filter, Per-Mode-Slots, Legacy-Migration | [x] erledigt — Sidebar-Suite 13/13 |

Verifikation des Nachtrags: tsc A/B **479 → 479, identische Fehlermenge**
(0 neue); Voll-Suite **27 Dateien / 280 Tests grün**; eslint der beiden
geänderten Dateien 0 Meldungen; `npm run check:i18n` grün (2845 Keys).

## Retrospektive / offene Punkte

- Commit-Sequenz des Klarstellungs-Nachtrags: die Parallel-Session hat
  den Sidebar-Teil der Klarstellung am 27.9. 11:17 als `e934f0b`
  ("alter 2-Wege-Toggle entfernt") committet — der Code-Stand war meine
  fertige Klarstellungs-Implementierung aus dem Working Tree; Tests,
  60 Locales und Doku folgten in `af39b19`. Der Endzustand beider
  Commits ist identisch mit dem hier verifizierten Stand.
- Parallel-Session-Kontext: beim Start dieses Sprints trugen
  docs/API_DOCS.md, docs/backlog/BACKLOG.md und die S54/S134-Sprint-Files
  UNCOMMITETE Parallel-Session-Diffs. Jene Session (fix-project-creation,
  fix-deploy-dialog) hat ihre Arbeit unmittelbar VOR dem Branch-Cut nach
  main gemergt (4396439) — dieser Branch basiert auf dem gemergten Stand,
  die fremden Diffs sind dadurch NICHT in den Sidebar-Commit gerutscht;
  der Backlog-Spiegel S55 wurde sauber aufgesetzt und in einem eigenen
  Nachtrags-Commit ergänzt.
- Layout-Buttons sind Text-only (keine Icons): im 256px-Sidebar passt
  der längste Label-Text nur ohne Icon in eine Zeile (Operator-Sketch
  zeigt Text-Buttons; mit der Klarstellung sind es kurze Singular-Labels
  bei text-[11px]).
- Design-Delta Erstrund vs. Klarstellung: die Erstrund-Labels („By Server
  / All Projects / All Workspaces") wurden vom Operator zu
  [ Server ] [ Workspace ] [ Project ] + separatem Entity-Selector
  präzisiert — die Erstrund-Keys (allProjects/allWorkspaces) bleiben als
  All-Option-Labels des Selectors in Nutzung, viewByServer/viewByProject
  sind jetzt ungenutzt (bleiben in den Locales, Parität unberührt).
- Der Scope-Section-Header (`sidebar.scope`/`sidebar.scopeChoose`) nutzt
  weiter den tf()-Inline-Fallback (wie SPRINT-52) — Locale-Keys können
  später adoptieren.
- Live-Smoke am laufenden Stack offen (Operator) — Verifikation hier ist
  die Voll-Suite (278/278) + tsc A/B + check:i18n.
