# SPRINT-52-Rest — Sidebar 4-Sections-Layout (WP2 Navigation + WP3 Events & Observability)

> Branch: fix-sidebar-layout (Working Tree, nicht committet — Standing-Rule).
> Arbeitsslice aus **S52-Rest** (docs/backlog/BACKLOG.md: „WP2 Navigation-Section,
> WP3 Events & Observability-Umbenennung, WP4-Vollausbau — offen, Tier 2").
> Operator-Spec: docs_dev/prompts/glm-sidebar-scope-redesign.md (21.9.2026,
> gitignored) — dort §„Neue Sidebar-Struktur (4 Sections)“.
> Die in docs_dev referenzierte SPRINT-52-SIDEBAR-SCOPE-MULTISELECT.md existiert
> in diesem Checkout nicht (docs_dev ist gegitignored); dieses File dokumentiert
> den WP2/WP3-Slice auf dem getrackten docs/sprints/-Pfad.

## Ziel

Die HierarchySidebar bekommt die vom Operator geforderten VIER Sections
(oben nach unten):

1. **Scope** — existierte schon (SPRINT-52 WP1: angedockte
   ScopeSelectorModal + Chips + Level-Menü) — unverändert.
2. **Navigation** — NEU: die Cross-Cutting-Work-Surfaces, die bisher im
   Baum und in Bottom-Buttons verstreut waren, als flache Section unter
   dem Scope.
3. **Events & Observability** — die bisherige kollapsible „Security“-Gruppe,
   umbenannt, flach, erweitert um Network Monitoring, SAST, DAST.
4. **Rest (der Baum)** — die Project→Workspace→App-Hierarchie.

Nur Navigation — keine neuen Surfaces, keine URL-Änderungen, keine neuen
Backend-Routen (damit auch kein API_DOCS.md-Eintrag nötig).

## Work Packages

### WP2 — Navigation-Section
- Einträge (alle echten Routen aus App.tsx, Labels = DIESELBEN nav-Keys,
  die auch das Top-Navbar aus lib/section-nav.ts rendert — ein Vokabular,
  zwei Renderer): Integrations (/agents, nav.agents), Apps
  (/workspaces/apps, nav.workspaceApps), Plugins (/plugins,
  nav.pluginCatalog), Deployments (/workspaces/deployments,
  nav.workspaceDeployments), Servers (/workspaces/endpoints,
  nav.sshEndpoints), Settings (/workspaces/settings, nav.workspaceSettings).
- Active-State über pathIn() (Import aus lib/section-nav.ts) — derselbe
  Segment-Grenzen-Matcher wie im Top-Navbar.
- Aus dem BAUM entfernt: die „+ New App“-Zeilen in Workspace-Expansions
  (Ziel war die generische Seite /workspaces/apps, NICHT der Workspace,
  unter dem der Button saß) sowie die Bottom-Buttons „+ New Project“
  (→ /workspaces; bleibt erreichbar über ALL-Button + Top-Navbar) und
  „+ New Target“ (→ /workspaces/endpoints; jetzt der flache
  Servers-Link). „+ New Workspace“ bleibt im Baum (präselektiert SEIN
  Projekt im Ensure-Dialog — kontextuell, nicht cross-cutting).

### WP3 — Events & Observability
- Umbenennung der kollapsiblen Security-Gruppe in eine flache Section
  „Events & Observability“ (neuer i18n-Key sidebar.eventsObservability).
- Bestand: Firewall Rules (/security/firewall-rules), SIEM Events
  (/security/siem) — unveränderte Ziele.
- NEU dazu (Operator-Wortlaut): **Network Monitoring** (/networks — das
  Headscale-Mesh-Dashboard: Node online/offline, Topologie; NICHT der
  LLM-Proxy-RealtimeMonitor, der Proxy-Traffic zeigt), **SAST**
  (/security/scans/sast) und **DAST** (/security/scans/dast) — direkte
  Tab-URLs der Scans-Layout-Route. DAST bleibt dabei der ehrliche
  Not-yet-implemented-Platzhalter (Mandate 2) — verlinkt wird die echte,
  leere Tab-Seite, nichts vorgetäuscht.

### WP-Dead-Code — layout/scope-selector.tsx (Claude-Fund nachgeprüft)
- components/layout/scope-selector.tsx + scope-selector.test.tsx +
  scope-selector.render.test.tsx GELÖSCHT.
- Beweis (grep über src/frontend/src): 0 Production-Importer — einzige
  Importer waren die zwei eigenen Test-Dateien; der im Dateikommentar
  behauptete „MiniSidebar header slot“ existiert nirgendwo im Code.
  Stale Kommentar-Verweise (HierarchySidebar.tsx, BreadcrumbBar.tsx,
  FirewallRulesPage.test.tsx) auf die toten Dateien korrigiert.
- hooks/use-scope-label BLEIBT (Production-Consumer:
  security-landing-strip.tsx) — mit scope-selector starb nur der zweite
  Consumer.

### WP-i18n (60 Locales, check:i18n)
- NEU: sidebar.navigation, sidebar.eventsObservability,
  sidebar.networkMonitoring — de echt übersetzt, alle übrigen 59 Locales
  mit englischem Wert (Repo-Präzedenz: fr/ru/es sidebar-Blöcke tragen
  bereits unverändert englische Werte).
- ENTFERNT (durch den Umbau verwaist, 0 Aufrufer verifiziert):
  sidebar.security, sidebar.newTarget, sidebar.newProject, sidebar.newApp.
- REPARATUR einer VORHERSCHENDEN roten Prüfung: check:i18n schlug vor
  dieser Änderung bereits mit 59 Fehlern fehl — die Backlog-#133-Keys
  sidebar.viewByProject/viewByServer/noServer/serverTag/projectTag waren
  nur in en.json angelegt, nie backgefüllt. Alle 5 Keys in die 59 Locales
  nachgetragen (de übersetzt, Rest englisch) → check:i18n GRÜN
  (60 Locales, 2804 Keys; vorher 2800, -4 tote +8 neue/gefüllte).

## Abnahme (verifiziert, nicht behauptet)

| Kriterium | Ergebnis |
|---|---|
| tsc A/B (tsc --noEmit -p tsconfig.app.json) | Baseline 481 → 481: **0 neue Fehler** |
| Vitest HierarchySidebar.test.tsx | **7/7 grün** (4 bestehende Scope-Tests + 3 neue: Navigation-Section rendert alle 6 Links, Events-Section rendert alle 5 Links, „+ New App“-Zeile aus dem Baum verschwunden) |
| eslint (alle berührten Dateien) | **0 Meldungen** |
| check:i18n | **grün** (vorher: 59 Fehler) |
| 0 Production-Importer für scope-selector | grep-verifiziert, Dateien gelöscht |
| Sidebar-Tests nach Löschung | HierarchySidebar-Suite unberührt grün |

## Retrospektive — was tatsächlich geliefert wurde

- WP2 und WP3 komplett umgesetzt wie oben beschrieben; der Scope-Abschnitt
  (WP1 aus SPRINT-52 Tier 1) blieb unangetastet und grün.
- **Kollision mit Parallel-Session** (21.9.2026): Backlog #134
  (fix-project-creation) arbeitete GLEICHZEITIG im selben Checkout und hat
  während dieses Umbaus Import + State für NewProjectDialog in die
  HierarchySidebar eingefügt. Der Zwischenzustand (Deklarationen ohne
  Consumer) erzeugte kurzzeitig 3 TS6133-Fehler; die Parallel-Session hat
  ihre Verdrahtung danach vervollständigt („+ New Project“-Button im
  Baum-Abschnitt — ein Create-ACTION, kein Cross-Cutting-Link, konsistent
  mit dieser Struktur — plus Dialog-Mount am Dateiende). tsc-Endstand auf
  dem komponierten Baum: 481 (= Baseline, 0 neu).
- **Offener Bug im Parallel-Stream (nicht von hier angefasst)**: deren
  Button ruft t('projects.newProject') auf, dieser Key existiert in
  en.json (und damit keinem Locale) NICHT — die Schaltfläche rendert den
  Roh-Key. Muss in deren Stream ergänzt werden (dann greift auch deren
  eigenes i18n-Paritäts-Gate).
- WP4 (Vollausbau: Overview-Pages auf Multi-Arrays, Stitch-Generierung)
  bleibt offen — siehe Backlog.
- Kein Commit (Standing-Rule: keine Git-Ops ohne explizite Freigabe);
  die Löschung der 3 toten Dateien liegt als gestrichene Dateien im
  Working-Tree-Staging des Branches fix-sidebar-layout.
