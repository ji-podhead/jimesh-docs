# BUILD — SPRINT-156 Projekt-Navigation (Sidebar → Projekt-Detail)

**Datum:** Nacht 28./29.9.2026 (~00:15). **Agent:** SPRINT-156 Projekt-Navigation.
**Commit-Kontext:** Dieser Agent hat NICHT committet. Der Orchestrator sicherte die laufende
Arbeit (inkl. S156) im Wave-Commit `cbcc942` ("6 Sprint-Teilwellen von gekillten Agents
gesichert"); die S156-Dokumente und die letzten Konsistenz-Fixes liegen zusätzlich UNCOMMITTED
im Working Tree von `/home/ji/projects/jimesh`.

## Operator-Report (verbatim, dreischichtig — alle drei behoben)

> 1. "/projects ist nur ein Redirect zu /workspaces — keine echte Seite"
> 2. "Klick auf den Projektnamen in der Sidebar navigiert NICHT — schaltet nur Scope-Auswahl um"
> 3. "die echte Projekt-Detailseite (ProjectDetailPage.tsx) ist nur über ein fast unsichtbares
>    Hover-only-Zahnrad-Icon erreichbar, fälschlich Settings beschriftet, UND liegt unter
>    /workspaces/projects/{id} (Workspaces-Namespace obwohl Projekt-Inhalt)"

## Gebaut

1. **Projektnamenzeile navigiert** (`HierarchySidebar.tsx`, renderProjectRow ab :1585): Klick auf
   den Projektnamen (nicht das Icon) → `/projects/{id}` (ProjectDetailPage). Der Scope-Switch
   bleibt als **eigene, immer sichtbare [◎]-Sekundäraktion** (Crosshair, aria-pressed, gleicher
   `toggleProjectInScope`-Writer wie das Scope-Popover unten — der FIX-3-Multi-Select geht
   KEIN Klick verloren).
2. **[⚙]-Fehllabel beseitigt:** Das hover-only (`opacity-0 group-hover:opacity-100`), als
   "Settings" beschriftete Zahnrad ist WEG. Ersetzt durch ein **immer sichtbares [↗ Open
   project]** (ExternalLink-Glyph + Label = die tatsächliche Aktion). Zusätzlich kehrt der
   Titel-Hint "Open project: {name}" auf der ganzen Namenzeile.
3. **Route fix:** `/projects/:projectId` → ProjectDetailPage (`App.tsx:589`). Die Legacy-Route
   `/workspaces/projects/{id}` (`App.tsx:767`) bleibt — alle 7 Bestands-Links funktionieren
   unangetastet (SSHTargetDetailPage, DeploymentDetailPage ×2, AppDiscoveryPage, OverviewPage,
   AppPanelDrawer, DeployedProjectsCard). Bare `/projects` bleibt der /workspaces-Redirect
   (keine Fake-Index-Seite). `/projects/discover` behält static precedence über das dynamische
   Segment (react-router-v6-Ranking).
4. **i18n:** `sidebar.openProject` + `sidebar.toggleProjectScope` in allen 60 Locale-Dateien
   (chirurgisches Text-Insert, JSON-validiert). 41 Locales handübersetzt, 19 dokumentierter
   EN-Fallback per RM35-Präzedenz (am, az, gu, ha, ig, ka, km, kn, ml, mr, my, ne, or, pa, si,
   ta, te, uz, yo).
5. **Tests** (`HierarchySidebar.test.tsx`, `__probe.test.tsx`): jsdom-Navigations-Beweis —
   Klick auf die Namenzeile → Probe-assert `/projects/prj-1` (Test :482); [↗]-Action erreicht
   dasselbe Ziel + kein "Settings"-Label mehr auf der Row + kein `opacity-0`-Hover-Gate
   (Test :494); [◎]-Scope-Multi-Select mit dem vollen FIX-3-Vertrag erhalten (Test :512);
   Popover-/Highlight-/Single-Form-Assertions auf die [◎]-Aktion umgestellt; die alte
   FIX-3-Debugprobe (`__probe.test.tsx`) nutzt jetzt den [◎]-Scope-Action-Helper.
6. **Dokumentation:** `docs/sprints/SPRINT-156-PROJEKT-NAVIGATION.md` (Plan + Lieferung +
   Verifikation + offene Punkte), BACKLOG-Spiegel S156 oben in `docs/backlog/BACKLOG.md`,
   dieser BUILD-Report. **API_DOCS.md: kein Eintrag** — es wird keine HTTP-Route berührt
   (reine SPA-Route; docs/API_DOCS.md dokumentiert exklusiv den Gateway-Surface).

## Von diesem Agenten geänderte Dateien

| Datei | Art |
|---|---|
| `src/frontend/src/components/sidebar/HierarchySidebar.tsx` | renderProjectRow umbau + FIX-3-Kommentarverträge + ExternalLink-Import (abgedeckt von cbcc942) |
| `src/frontend/src/App.tsx` | eine Route: /projects/:projectId (abgedeckt von cbcc942) |
| `src/frontend/src/i18n/locales/*.json` ×60 | je 2 neue Keys (abgedeckt von cbcc942) |
| `src/frontend/src/components/sidebar/HierarchySidebar.test.tsx` | S156-Tests + FIX-3-Umstellung (abgedeckt von cbcc942; String-Konsistenz danach im Tree) |
| `src/frontend/src/components/sidebar/__probe.test.tsx` | scopeAction-Helper statt Namenzeilen-Klick (abgedeckt von cbcc942) |
| `docs/sprints/SPRINT-156-PROJEKT-NAVIGATION.md` | NEU, untracked im Tree |
| `docs/backlog/BACKLOG.md` | S156-Spiegel oben |
| `/home/ji/projects/ihc24/BUILD-2026-09-29-SPRINT-156-PROJEKT-NAVIGATION.md` | dieser Report |

Nicht berührt (Vorgabe eingehalten): gateway.go / alle .go-Dateien, meshsquad-chat-Dateien,
DeploymentsPage, WorkspacesPage, section-nav.ts, ProjectDetailPage.tsx.

## Verifikation (finaler Baumzustand, Nacht 28./29.9. ~00:10)

```
cd src/frontend && npx vitest run        → 460/460 PASS (gesamte Suite)
cd src/frontend && npm run check:i18n     → PASS, 60 Locales, 3288 Keys
cd src/frontend && npx tsc --noEmit -p tsconfig.app.json | grep -c 'error TS'
                                          → 472 (= exakt die 472-Baseline; S156-Dateien: 0 Fehler)
docker run --rm -v /home/ji/projects/jimesh/src/backend:/app -w /app golang:latest \
    go build ./internal/... ./cmd/...     → EXIT 0
docker run … go vet ./internal/... ./cmd/... → EXIT 0
```

## Multi-Agent-Kontext (wichtig für die Interpretation von Zwischenmessungen)

SPRINT-153/154/155/157/158 liefen PARALLEL in denselben Dateien. Während der Session:
- cbcc942 sicherte alle Wellen; zwischenzeitlich zeigte tsc 476 (nachweislich 4 unbenutzte
  Deklarationen aus S154-Mid-Flight — inzwischen verdrahtet, zurück auf 472).
- S157s Section-Umbenennung (Security → "Firewall & Threat Detection", LLM Proxy → "LLM-Proxy",
  Events & Observability → "Observability & Events") brach zeitweise bis zu 12 Sidebar-Tests
  mit alten Section-Namen; der Orchestrator-Repair-Agent vollendete deren Migration.
- i18n-Wert-Race um `sidebar.toggleProjectScope` (eine Welle änderte den committeten Wert,
  der Repair stellte den Originalwert "Toggle scope selection" wieder her; S156-Tests matchen
  den wiederhergestellten Wert).
- Endzustand: Suite vollständig grün (460/460), tsc auf Baseline, i18n PASS.

## Offene Punkte (außerhalb des S156-Scopes, gemeldet)

1. **Server-Rows** haben denselben hover-only [⚙ "Settings"]-Pattern (→ SSHTargetDetailPage).
   Vom Operator nicht beklagt → unangetastet; konsistente Nachziehung als eigenes WP denkbar
   (S156-8).
2. **ProjectDetailPage IaC-Tab enthärt hartkodierte Mock-Daten** — "Discovered Services (3)"-Grid
   (app/redis/postgres), Fake-Compose-Preview inkl. `POSTGRES_PASSWORD: secret`, Statuszeile
   "eBPF proxy routing active" — Mandat-2-Verstoß (No-Mock), Scope war explizit gesperrt → für
   ein eigenes WP gemeldet (S156-9).

## Operator-Smoke-Test (nach `make up` / `make restart-backend`)

1. Sidebar PROJECTS öffnen → auf einen **Projektnamen** klicken → URL muss `/projects/<id>`
   zeigen und die Projekt-Detailseite (IaC-Files/Deployments/Secrets-Tabs) rendern.
2. Auf derselben Zeile: [◎] togglet den Scope (Bodenleiste zählt mit), [↗] öffnet dieselbe
   Detailseite; kein Zahnrad, kein "Settings" mehr auf der Projekt-Row.
3. Altes Bookmark `/workspaces/projects/<id>` muss weiterhin dieselbe Seite zeigen.
4. `/projects/discover` (App Discovery) muss weiterhin die Discovery-Seite zeigen (nicht die
   Detail-Route eines Projekts mit der Id "discover").
