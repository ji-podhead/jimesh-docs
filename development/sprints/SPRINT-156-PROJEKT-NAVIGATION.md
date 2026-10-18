# SPRINT-156 — Projekt-Navigation (Sidebar → Projekt-Detail)

**Status:** ✅ Gebaut & verifiziert (Nacht 28./29.9.2026). Agent: SPRINT-156 Projekt-Navigation.
**Scope (vom Parent-Agent gesetzt):** HierarchySidebar.tsx, App.tsx (nur Route), ProjectDetailPage.tsx
(nur falls Gear-Label dort ändern müsste — war nicht nötig, unberührt), i18n, Docs. NICHT berührt:
gateway.go / jegliche .go-Dateien, meshsquad-chat-Dateien, DeploymentsPage, WorkspacesPage,
section-nav.ts (der /projects-Redirect bleibt). Kein git commit — alles liegt im Working Tree.

## Operator-Report (verbatim, dreischichtig)

> 1. "/projects ist nur ein Redirect zu /workspaces — keine echte Seite"
> 2. "Klick auf den Projektnamen in der Sidebar navigiert NICHT — schaltet nur Scope-Auswahl um"
> 3. "die echte Projekt-Detailseite (ProjectDetailPage.tsx) ist nur über ein fast unsichtbares
>    Hover-only-Zahnrad-Icon erreichbar, fälschlich Settings beschriftet, UND liegt unter
>    /workspaces/projects/{id} (Workspaces-Namespace obwohl Projekt-Inhalt)"

## Plan (vor dem Code — Mandat 1 §2)

**Ziel:** Der Projektname in der Sidebar navigiert zur echten Projekt-Detailseite — sichtbar,
ehrlich beschriftet, unter sauberer URL — ohne den Scope-Multi-Select zu verlieren und ohne
Bookmarks zu brechen.

**Work Packages:**
- **WP1 Sidebar:** renderProjectRow umbauen — Projekt-Namenzeile = primäre Navigation zur
  Detailseite; der FIX-3-Scope-Toggle überlebt als eigene, IMMER sichtbare [◎]-Sekundäraktion
  (gleicher `toggleProjectInScope`-Writer wie das untere Popover); das hover-only
  [⚙ "Settings"]-Fehllabel verschwindet und wird durch ein immer sichtbares, ehrliches
  [↗ Open project] ersetzt.
- **WP2 Route:** `/projects/{id}` → ProjectDetailPage (neu, sauberer Namespace). Legacy
  `/workspaces/projects/{id}` bleibt (Bookmarks, Mandat 2: keine Route, die funktionierte,
  darf 404en). Bare `/projects` bleibt der /workspaces-Redirect (keine Fake-Index-Seite —
  Operator-Punkt 1 wird durch die echte {id}-Route geschlossen, nicht durch eine Behelfsseite).
  `/projects/discover` behält static precedence über das dynamische Segment (react-router-v6-Specificity).
- **WP3 i18n:** `sidebar.openProject` + `sidebar.toggleProjectScope` in en + 59 Locales
  (41 handübersetzt, 19 dokumentierter EN-Fallback — RM35-Präzedenz wie SPRINT-140/S140-7).
- **WP4 Tests:** jsdom-Navigations-Assertion für die Namenzeile UND die [↗]-Aktion;
  FIX-3-Scope-Tests auf die [◎]-Aktion umgestellt; Settings-Fehllabel-weg-Assertion;
  `__probe.test.tsx` (FIX-3-Debugprobe) auf die [◎]-Aktion umgestellt.
- **WP5 Docs:** dieser Sprint-File, BACKLOG-Spiegel, BUILD-Report nach ihc24.
  API_DOCS.md: **kein Eintrag nötig** — es wird keine HTTP-Route berührt (reine SPA-Route;
  docs/API_DOCS.md dokumentiert exklusiv den Gateway-HTTP-Surface).

**Akzeptanzkriterien:**
1. Klick auf den Projektname → URL `/projects/{id}`, ProjectDetailPage rendert (gleicher
   :projectId-Param wie die Legacy-Route), Multi-Scope bleibt unberührt.
2. [◎]-Klick toggelt den Multi-Scope exakt wie vorher (selectedProjectIds, gleicher Writer,
   Zusammenfassung in der Bodenleiste, Highlight bg-primary/15 + Check-Icon bleibt).
3. Kein "Settings"-Label mehr auf der Projekt-Row; [↗] ohne opacity-0-Hover-Gate.
4. Alle 7 bestehenden Link-Verbraucher von `/workspaces/projects/{id}` unangetastet und
   funktional (SSHTargetDetailPage, DeploymentDetailPage ×2, AppDiscoveryPage, OverviewPage,
   AppPanelDrawer, DeployedProjectsCard).
5. tsc-Baseline durch DIESEN Change nicht schlechter; check:i18n PASS.

## Was tatsächlich gebaut wurde (gegen den Code verifiziert)

| Nr | Change | Datei:Zeile | Status |
|---|---|---|---|
| S156-1 | Projektnamenzeile navigiert zu `/projects/{id}` (onClick), Titel-Hint "Open project: {name}", Selection-Highlight bleibt rein darstellend auf der Zeile | `HierarchySidebar.tsx:1585` ff. (renderProjectRow) | [x] |
| S156-2 | [◎]-Scope-Toggle als eigene IMMER sichtbare Sekundäraktion (aria-pressed, aria-label "Toggle scope selection: {name}", gleicher toggleProjectInScope-Writer) | `HierarchySidebar.tsx` (renderProjectRow, [◎]-Button) | [x] |
| S156-3 | Hover-only [⚙ "Settings"] entfernt → ehrliches, immer sichtbares [↗ Open project] (ExternalLink-Glyph + Label = tatsächliche Aktion; kein Settings-Mismatch mehr) | `HierarchySidebar.tsx` (renderProjectRow, [↗]-Button) | [x] |
| S156-4 | Route `/projects/:projectId` → ProjectDetailPage ergänzt; Legacy-Route (App.tsx:767) bleibt; bare /projects-Redirect bleibt; /projects/diskeep static precedence | `App.tsx:589` | [x] |
| S156-5 | i18n: 2 neue Keys in 60 Locale-Dateien (chirurgisches Text-Insert, JSON-validiert; 41 handübersetzt, 19 EN-Fallback: am, az, gu, ha, ig, ka, km, kn, ml, mr, my, ne, or, pa, si, ta, te, uz, yo) | `i18n/locales/*.json` (sidebar-Block-Head) | [x] |
| S156-6 | Tests: 3 neue/umgeschriebene Suites-Tests — Name-Row-Navigation (Zeile 482), [↗]-Action + Settings-weg + kein-Hover-Gate (Zeile 494), [◎]-Scope-Multi-Select (Zeile 512); Popover/Highlight/Single-Form-Assertions auf [◎] umgestellt (u.a. Zeile 428); `__probe.test.tsx`-Update (scopeAction-Helper Zeile 73) | `HierarchySidebar.test.tsx`, `__probe.test.tsx` | [x] |
| S156-7 | Kommentare: FIX-3-Verträge (Header-Kommentar + Inline) auf den neuen Projekt-Zustand gebracht (Server-Achse: FIX 3 unverändert) | `HierarchySidebar.tsx:133`, `:1163`, `:1571` | [x] |

**Bewusst NICHT geändert:**
- **Server-Rows** haben denselben hover-only [⚙ "Settings"]-Pattern (→ SSHTargetDetailPage).
  Vom Operator nicht beklagt, vom Task nicht gefordert → unangetastet (siehe offene Punkte).
- **ProjectDetailPage.tsx** selbst: kein Gear-Label dort → keine Änderung nötig.
- **section-nav.ts**: unberührt (Vorgabe). Der bare /projects-Redirect steht in App.tsx:578.
- **Alle /workspaces/projects/{id}-Link-Verbraucher**: bleiben auf der Legacy-URL, die weiter
  funktioniert — die Sidebar nutzt die neue URL, überall sonst bleibt Bestandsverhalten.

## Verifikation (ehrlich, Mandat 6 — finaler Stand, Nacht 28./29.9., ~00:10)

**Multi-Agent-Kontext:** SPRINT-153 (Chat), SPRINT-154 (Protected-Projects), SPRINT-155
(Datalake), SPRINT-157 (Sidebar-IA-Reorg) und SPRINT-158 (Ozone-Creds) arbeiteten PARALLEL
in denselben Dateien. Der Orchestrator sicherte alle Wellen — inkl. SPRINT-156 — im
Wave-Commit **cbcc942** ("6 Sprint-Teilwellen von gekillten Agents gesichert"); dieser
Agent hat selbst NICHT committet. Finaler Stand des Gesamtbaums:

- `npx vitest run` (GESAMTE Suite): **460/460 PASS** — inkl. der 45 Sidebar+Probe-Tests
  (44 Sidebar: +2 netto durch die S156-Navigationstests; 1 Probe), der S157-Reachability-
  Guards und der Chat-Suite.
- `npm run check:i18n`: **PASS — 60 Locales, 3288 Keys** (darunter die S156-Keys
  `sidebar.openProject` + `sidebar.toggleProjectScope`).
- tsc: **472 = exakt die 472-Baseline** (Zwischenstand 476 war nachweislich SPRINT-154-
  Mid-Flight: `TS6133: 'Eye'/'EyeOff'/'persistHideInternal'/'hiddenInternalCount' declared
  but never read` — inzwischen verdrahtet). S156-Dateien tragen **0 Fehler**.
- `docker run --rm -v …/src/backend:/app -w /app golang:latest go build ./internal/... ./cmd/...`
  → **EXIT 0**; `go vet` über dasselbe Setup → **EXIT 0** (keine .go-Datei berührt,
  trotzdem gegen die stehende Vorgabe verifiziert).

**Zwischenfälle der Session (ehrlich dokumentiert, alle aufgelöst):**
1. **S157-Section-Rename-Fallout:** S157s gesicherte Reorg benannte Sections um (Security →
   "Firewall & Threat Detection", LLM Proxy → "LLM-Proxy", Events & Observability →
   "Observability & Events") und brach damit zwischenzeitlich bis zu 12 Sidebar-Tests,
   deren Assertions die alten Section-Namen referenzieren. Der Orchestrator-Repair-Agent
   vollendete die Migration; S156-Assertions wurden von diesem Agenten nur im eigenen
   Scope (Scope-Toggle-Label) konsistent gehalten. Endzustand: Suite grün.
2. **i18n-Wert-Race:** eine Parallel-Welle änderte den committeten Wert von
   `sidebar.toggleProjectScope` ("Toggle scope selection" → "Toggle project scope"), ohne die
   zugehörigen Tests zu migrieren; der Repair-Agent stellte den Originalwert wieder her. Die
   S156-Tests matchen den wiederhergestellten Wert ("Toggle scope selection: {name}").

## Offene Punkte (nicht in diesem Scope)

| Nr | Punkt | Status |
|---|---|---|
| S156-8 | Server-Rows: derselbe hover-only [⚙ "Settings"]-Pattern → SSHTargetDetailPage (Operator hat es nicht beklagt; konsistente Nachziehung als eigenes WP denkbar) | [ ] offen (bewusst) |
| S156-9 | ProjectDetailPage IaC-Tab: **hartkodierte Mock-Daten** ("Discovered Services (3)"-Grid mit app/redis/postgres, Fake-Compose-Preview inkl. 'POSTGRES_PASSWORD: secret', "eBPF proxy routing active"-Statuszeile) — verstößt gegen Mandat 2 (No-Mock). Außerhalb des SPRINT-156-Scopes ("only if the gear icon label needs changing there"), für ein eigenes WP vorgesehen. | [x] erledigt (SPRINT-166, 30.9. — Mock-Daten entfernt, echte /iac-files-Wiring) |

## Reachability-Beweis (Mandat 14 §2)

Klickpfad: **Sidebar PROJECTS-Section → Projektname ("Alpha") → URL /projects/prj-1 →
ProjectDetailPage** — bewiesen durch `HierarchySidebar.test.tsx:482` (jsdom: `where()`-Probe
assert `'/projects/prj-1'` nach Klick auf die Namenzeile) und `:494` (gleiches Ziel über die
immer sichtbare [↗ Open project]-Aktion). Zweite, unabhängige Entrichtung: [↗]-Icon-Button
auf derselben Zeile. Kein Ghost: die neue Route ist von der Sidebar aus erreichbar, die
Legacy-Route bleibt von 7 bestehenden Links erreichbar.
