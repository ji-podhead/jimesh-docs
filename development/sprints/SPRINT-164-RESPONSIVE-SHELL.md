# SPRINT-164 — Responsive Shell: Sidebar-Drawer unter lg + breiteres Standard-Panel

**Status:** Fertig gebaut + verifiziert (Frontend-Toolchain), uncommitted — Parent committet · **Datum:** 1.10.2026 · **Parent:** SPRINT-160 (WP1) ·
**Scope:** NUR App-Shell-Layout (`App.tsx` + `HierarchySidebar.tsx` Layout-Schicht) —
keine IA-/Inhalts-Änderung (S157-IA bleibt exakt), keine Route ändert sich, kein
Backend-File, kein HTTP-Route → **API_DOCS.md unverändert** (nicht nötig).

## Operator-Auftrag (verbatim, SPRINT-160)

> „wir brauchen einfach responsive seite"
> „DAS HAUPT PANEL IN DER mITTE ... kein flex bzw max-w hat und so schmal ist"

## Ist-Zustand vor diesem Sprint (verifiziert am Tree)

- `HierarchySidebar.tsx:1651` — das `<aside>` ist `hidden md:flex`: unter 768px
  existierte die Sidebar GAR NICHT (keine Navigation, kein Tree, kein Scope), zwischen
  768–1023px fraß die fixe `w-64`-Spalte ein Drittel des Viewports. Kein Toggle, kein
  Drawer, kein Kollaps — die Sidebar war der größte Responsive-Blocker.
- `App.tsx:552-554` — der Inhalts-Wrapper `min-w-0 flex-1` + `PageContainer` `w-full`
  existieren bereits (das Panel füllt per flex — siehe WP2-Analyse), aber:
- `App.tsx:505` — der Standard-Tier ist `max-w-6xl` (72rem): auf dem Operator-Monitor
  (Sidebar 256px + 1440px+) blieben ~6–26rem Rand rechts/links leer — genau das
  „so schmal" aus dem Operator-Zitat.

## Ziel

1. **WP1 — Responsive Sidebar.** Unter `lg` (1024px) wird die SEITENLEISTE zum
   Overlay-Drawer (Off-Canvas): geschlossen = gar nicht im Layout (kein Platzverbrauch,
   kein Overflow bei 375px), geöffnet = fixe Overlayschicht + Backdrop, mit klarem
   Toggle (Navbar-Button), Close-Button im Drawer-Header, Backdrop-Klick, Escape und
   automatisches Schließen bei Routenwechsel. Desktop (>= lg): das `<aside>` bleibt
   **klassen-byte-identisch** (`sticky top-14 hidden h-[calc(100vh-3.5rem)] w-64
   shrink-0 flex-col overflow-y-auto border-r bg-background/95 md:flex`) — keine
   Section-Umbenennung, keine Umgruppierung, S157-IA unangetastet.
2. **WP2 — Haupt-Panel-Breite.** Standard-Tier `max-w-6xl` → `max-w-7xl` (80rem),
   Tier-System (full-bleed / wide / standard) bleibt erhalten; das zentrale Panel
   füllt den verfügbaren Platz zwischen Sidebar und Rand per flex (`min-w-0 flex-1` +
   `w-full` — bereits vorhanden, wird gepinnt und dokumentiert).
3. **WP3 — Keine IA-/Inhaltsänderung.** Nur Layout/Responsiveness. Der Tree, alle
   Sektionen, Labels, Badges, Row-Actions, Dialoge, der Scope-Speicher — unverändert.
4. **WP4 — Tests.** Neue Datei `ResponsiveShell.test.tsx` mit gemocktem
   `matchMedia`/Viewport: schmal → kollabierter Default-Zustand + Toggle funktioniert;
   Desktop → unveränderter Default-Zustand. `HierarchySidebar.test.tsx` wird NICHT
   angefasst (der Sidebar-Test ist Desktop-Default: ohne matchMedia-Mock rendert die
   Komponente exakt wie vorher — das ist der Kompatibilitäts-Kontrakt).
5. **WP5 — Docs.** Dieses Sprint-File. BACKLOG-Spiegel macht der Parent (Backlog ist
   für mich gesperrt).

## Design-Entscheidungen

- **Overlay-Drawer statt Icon-Rail.** Ein Icon-Rail würde jeden der ~40 Row-Renderer
  um Label-Ausblendung erweitern (Eingriff in Inhalts-Schicht + Test-Fläche des
  S157/156-Stands); der Drawer rendert den GLEICHEN Baum unverändert in einer
  fixierten Schicht — reine Layout-Schicht, null IA-Risiko.
- **JS-Tier-Erkennung via `matchMedia('(min-width: 1024px)')` + CSS-`lg:` als
  Sicherheitsnetz.** Ohne `matchMedia` (jsdom-Tests, SSR-Guard) fällt der Hook auf
  **Desktop** zurück → die bestehenden Sidebar-Suites (44+ Tests, alle ohne
  matchMedia-Mock) sehen ein byte-identisches DOM. Der Drawer-Zustand selbst ist ein
  externer Mini-Store (`lib/sidebar-drawer.ts`, `useSyncExternalStore` — das exakt
  gleiche Idiom wie `lib/global-scope.ts`/`lib/toast.ts`), weil Navbar (Toggle) und
  Sidebar (Drawer) Geschwister sind.
- **Keine `transform`-Animation am Drawer** (bewusst): `translate-x-*` am `<aside>`
  würde einen Transform-Containing-Block erzeugen und die fix positionierten Modals
  (WorkspaceTerminal, FileBrowser, AppPanelDrawer — alle Kindelemente des aside)
  relativ zum Drawer statt zum Viewport positionieren. Schlichtes hidden↔fixed statt
  Animation ist der ehrliche Preis.
- **WP2: Navbar-Behälter bleibt `max-w-6xl`** (bewusst). Der Navbar ist ein eigenes
  Band über der Sidebar+Content-Zeile und zentriert im VOLLEN Viewport, das Content-
  Panel zentriert in (Viewport−256px) — die beiden sind heute schon nicht kantengleich
  (bei 1440px: Brand bei x≈160px, Content-Linkskante bei 0). Der Operator-Auftrag
  zielt auf das Haupt-Panel; eine Navbar-Verbreiterung wäre eine zusätzliche,
  nicht beauftragte Desktop-Änderung. Beobachtung → Offen-Items.
- **Keine Änderung am Wide-Tier** (`max-w-7xl xl:max-w-[1600px]`): beauftragt ist nur
  der Standard-Tier. Unter `xl` sind wide und standard damit visuell identisch (beide
  80rem) — das Tier-System bleibt 3-stufig erhalten (full-bleed / wide / standard).

## Akzeptanzkriterien

1. `< lg`: Drawer geschlossen = aside `hidden` (kein Flex-Kind, kein Overflow bei
   375px); Toggle in der Navbar (`lg:hidden`) öffnet/schließt; Backdrop-Klick, X-Button,
   Escape und Routenwechsel schließen ebenfalls.
2. `>= lg`: aside-Klassen exakt wie vor SPRINT-164 (s.o.), kein Drawer-Chrome im DOM,
   Sektionen/IA unverändert (Reachability-Guard der bestehenden Sidebar-Tests bleibt
   grün, ohne dass `HierarchySidebar.test.tsx` angefasst wird).
3. Standard-Tier 80rem (`max-w-7xl`), Tier-System erhalten, full-bleed unangetastet.
4. `ResponsiveShell.test.tsx` grün (schmal: kollabiert + Toggle; Desktop: unveränderter
   Default; matchMedia-Wechsel schließt den Drawer; Navigation schließt den Drawer;
   kein matchMedia = Desktop-Default).
5. Baseline nicht verschlechtert: `npx tsc -p tsconfig.app.json --noEmit` bleibt bei
   471 Fehlern (keiner in SPRINT-164-Dateien); `npx vitest run` grün (57 Dateien/
   464 Tests + die neuen); `node scripts/check-i18n.mjs` PASS 60/3307 unverändert.
   Backend unberührt → `make go-build`/`go-vet` nicht nötig.

## Arbeitslog (was tatsächlich passiert ist — Datei:Zeilen-Belege)

**Neue Dateien (SPRINT-164, alle neu erstellt):**

1. **`src/frontend/src/hooks/use-media-query.ts`** (neu, 55 Z.) — der Live-Media-Query-Hook
   für die Shell-Tier-Entscheidung. Fallback-Kontrakt: ohne `matchMedia` (jsdom ohne Mock,
   non-DOM) wird der Caller-Fallback benutzt, NIE geraten — die Shell übergibt `true`
   (= Desktop), deshalb sehen Umgebungen ohne Media-Engine das unveränderte Desktop-DOM.
   Change-Events live abonniert (modernes `addEventListener`, Legacy-`addListener` als
   zweiter Zweig).
2. **`src/frontend/src/lib/sidebar-drawer.ts`** (neu, 54 Z.) — der Drawer-Open-State als
   Mini-Store: Module-State + subscribe/getSnapshot + `useSyncExternalStore`, exakt das
   Idiom aus `lib/global-scope.ts`/`lib/toast.ts`. Exportiert
   `SIDEBAR_DESKTOP_QUERY = '(min-width: 1024px)'` als EINE Quelle für Komponente,
   CSS-Sicherheitsnetze (`lg:hidden`) und Tests. Bewusst NICHT persistiert: ein Drawer,
   der einen Reload überlebt, läge über der Seite, zu der der Operator gerade navigiert
   ist — kein Operator-DATA, kein Persistence-Mandat-Gegenstand.
3. **`src/frontend/src/components/sidebar/SidebarDrawerToggle.tsx`** (neu, 33 Z.) — der
   Navbar-Button (`PanelLeft`, ghost/icon, `lg:hidden`), `aria-expanded` am Store, Label
   via `tf`-Fallback. Eigenes Modul statt inline in App.tsx, damit der Toggle-Kontrakt
   testbar ist, OHNE den 80-Import-Route-Baum aus App.tsx in jsdom zu ziehen.
4. **`src/frontend/src/components/sidebar/ResponsiveShell.test.tsx`** (neu, 420 Z., 12
   Tests) — siehe WP4 unten.

**Geänderte Dateien:**

5. **`src/frontend/src/components/sidebar/HierarchySidebar.tsx`** — NUR Layout-Schicht,
   rein additiv (git diff: 110 insertions, 4 deletions — die 4 entfernten Zeilen sind die
   import-/tf-/aside-Zeilen, jede durch ihre erweiterte Version ersetzt; null IA-Änderung):
   - Import-Erweiterungen: `useEffect` + `Link` (`:1-2`), `X` (lucide, alphabetisch
     einsortiert), `useMediaQuery` + Drawer-Store (`:73-78`), `JimeshMark` (`:88`).
   - `tf` exportiert (`:225`) — SidebarDrawerToggle nutzt denselben Inline-Fallback.
   - Drawer-Tier-State + 3 Effekte (`:934-969`): Tier-Erkennung
     (`isDesktopViewport = useMediaQuery(SIDEBAR_DESKTOP_QUERY, true)`, `:941`),
     Auto-Close wenn Viewport über lg wächst, Auto-Close bei Routenwechsel (der Drawer
     navigiert selbst — das Overlay verdeckt nie die Zielseite), Escape-Close.
   - Render: `asideClassName` (`:1705-1718`) — drei Zustände: Desktop = EXAKT die
     Pre-164-Klassen; Drawer offen = `fixed inset-y-0 left-0 z-50 flex w-64 max-w-[85vw]
     ... shadow-xl`; Drawer zu = `hidden w-64 flex-col` (out of flow, keine Tab-Stops,
     kein Overflow bei 375px). Bewusst KEINE transform-Animation (Containing-Block-Falle
     für die fixen Modals im aside — siehe Design-Entscheidungen).
   - Backdrop (`:1722-1734`): rendert NUR im offenen Drawer-Zustand, z-40 (über dem
     Navbar, unter dem Drawer z-50), Klick schließt, `lg:hidden` als CSS-Sicherheitsnetz.
   - Drawer-Header (`:1736-1756`): Brand-Mark + [`X` Close]-Button (`:1751`,
     `sidebar.closeDrawer`-Label via tf-Fallback) — nur im Drawer-Modus im DOM, Desktop
     unberührt.
6. **`src/frontend/src/App.tsx`** — WP1-Toggle-Einbau + WP2-Tier-Anhebung (git diff: nur
   SPRINT-164-Zeilen):
   - Import (`:147-150`) + Navbar-Einbau (`:316-320`): `<SidebarDrawerToggle />` vor
     dem Brand; `lg:hidden` → Desktop-Navbar bleibt pixel-identisch.
   - PageContainer (`:482-489`, `:500`, `:508-512`, `:523`): Standard-Tier
     `max-w-6xl` → **`max-w-7xl` (80rem)**, Kommentare honestly umgeschrieben; Wide-Tier
     (`max-w-7xl xl:max-w-[1600px]`) und Full-Bleed (`/projects`) unverändert.
   - Der Flex-Fill ist bereits strukturell da und wird von der neuen Tier-Klasse erst
     wirksam: `App.tsx:570` (`flex min-h-0 flex-1`) → `App.tsx:572` Inhalts-Wrapper
     `min-w-0 flex-1` → `main` `w-full` → füllt den Platz zwischen Sidebar und Rand bis
     zur Tier-Kappe (bis ~1536px-Viewport KOMPLETT randfüllend, darüber 80rem zentriert).

**WP4 — Test-Datei (`ResponsiveShell.test.tsx`, 12 Tests, alle grün):**

- Store-Unit (`:248-262`): Startzustand, toggle, idempotentes set, Subscriber-Notify.
- Schmal < lg (`:266-365`): kollabierter Default (aside = `hidden w-64 flex-col`, nie
  `sticky`), End-to-End-Toggle (Store + echte Komponenten: öffnet `fixed` + Backdrop +
  aria-expanded, schließt wieder), X-Button-Close, Backdrop-Klick-Close, Escape-Close,
  Routenwechsel-Close (echter Navigation-Row-Click → pathname-Probe auf
  `/workspaces/apps` + Drawer zu), Viewport-Wachs-über-lg-Close (Desktop-Klassen + Store
  zurückgesetzt).
- Desktop >= lg (`:368-404`): aside-Klassen BYTE-IDENTITÄSCH gepinnt
  (`DESKTOP_ASIDE_CLASS`), kein Drawer-Chrome im DOM, Toggle inert (Effekt räumt State
  sofort ab), Viewport-Schrumpf → Drawer.
- Kein matchMedia (`:407-417`): Desktop-Default — der Kompatibilitäts-Kontrakt, unter
  dem die unverändert gelassenen Pre-164-Suites laufen.
- Fetch-Gerüst und Provider-Wrapper sind die ECHTEN Wire-Shapes aus
  HierarchySidebar.test.tsx (ssh_endpoints/auth-status/users/projects/workspaces), plus
  ein matchMedia-Mock mit gespeicherten Change-Listenern für echte Resize-Simulation.
- `HierarchySidebar.test.tsx` NICHT angefasst: die 44 Tests + internal-projects-Suite +
  __probe-Suite laufen ohne matchMedia → Desktop-Default → DOM byte-identisch → grün
  (bewiesen durch die volle Suite, s. Verifikation).

## Verifikation (Mandat 6 — alle Befehle wirklich gelaufen, cwd `src/frontend`)

**Baseline VOR den Änderungen (Tree clean außer fremden Sprint-Docs):**

- `npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c 'error TS'` → **471** (= Soll-Baseline)
- `npx vitest run` → **Test Files 57 passed (57), Tests 464 passed (464)**
- `node scripts/check-i18n.mjs` → **"i18n validation passed for 60 locales and 3307 keys"**

**Nach den SPRINT-164-Änderungen:**

- `npx vitest run src/components/sidebar/ResponsiveShell.test.tsx` → **12 passed (12)**
- `npx vitest run` → **Test Files 59 passed (59), Tests 482 passed (482)**
  — alle grün, inkl. der unangetasteten Sidebar-Suiten (44 HierarchySidebar + internal-
  projects + probe). Delta zur Rechnung 57+1 Dateien / 464+12 Tests: +1 Datei/+6 Tests
  stammen vom PARALLEL arbeitenden ProjectDetailPage-Agent (dessen neue
  `ProjectDetailPage.test.tsx`), nicht von SPRINT-164 — hier nur transparent
  dokumentiert, nicht angefasst.
- `npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c 'error TS'` → **414**
- `npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -E 'ResponsiveShell|use-media-query|sidebar-drawer|SidebarDrawerToggle|HierarchySidebar\.tsx|src/App\.tsx'` →
  **LEER — null Fehler in SPRINT-164-Dateien.** Die Zahl fiel 471→414 NICHT durch
  SPRINT-164 (meine Dateien: 0 Fehler vorher laut Aufgabenstellung, 0 nachher — der
  grep-Filter beweist es), sondern durch die PARALLELEN Agents (u.a. ProjectDetailPage-
  Rewrite, 447 Zeilen deren Ownership). Baseline-Regel „nicht verschlechtern, keiner in
  meinen Dateien" damit eingehalten und besser.
- `node scripts/check-i18n.mjs` → **"i18n validation passed for 60 locales and 3307
  keys"** — unverändert; keine Locale-Datei angefasst.
- Backend: von SPRINT-164 NULL .go-Datei angefasst → `make go-build`/`make go-vet` nicht
  nötig (und nicht gelaufen — nichts von mir zu prüfen; die parallelen Backend-Agent-
  Diffs sind deren Verantwortung).

## Offene Items / Handoff-Notes (ehrlich)

1. **Live-Verhalten bei 375px NICHT im Browser gemessen** (Mandat-2/6-Ehrlichkeit): der
   Compose-Stack ist bewusst down, jsdom hat kein Layout-Engine. Der
   „kein horizontaler Overflow"-Nachweis ist der DESIGN-Kontrakt (unter lg ist das aside
   `hidden`/`fixed` = nie Flex-Kind; Inhalts-Wrapper `min-w-0 flex-1`; Drawer
   `max-w-[85vw]` + `w-64` < 375px) plus die Klass-Asserts in ResponsiveShell.test.tsx —
   kein Live-Screenshot. Wer es live sieht: `make up` + DevTools 375px.
2. **Zwei neue i18n-Keys — Handoff an den Locale-Agent** (Locale-Dateien sind für mich
   gesperrt): `sidebar.toggleDrawer` (en: "Toggle sidebar", Navbar-Drawer-Toggle-Label)
   und `sidebar.closeDrawer` (en: "Close sidebar", X-Button im Drawer-Header). Beide
   laufen über den etablierten `tf`-Inline-Fallback und zeigen bis zur Eintragung
   echtes English (gleiche Mechanik wie `sidebar.navigation`); check-i18n ist davon
   unberührt (Parity-Check zwischen Locale-Files, nicht Code-Scan) — trotzdem sollen sie
   regulär in alle 60 Locales kommen.
3. **Kein Icon-Rail gebaut** — bewusste Design-Entscheidung (Drawer statt Rail), kein
   offener Punkt, aber falls der Operator ein Rail will: Aufwand liegt in den ~40
   Row-Renderern (Inhalts-Schicht!), hat hier nichts verloren.
4. **Navbar-Behälter bleibt `max-w-6xl`** (Design-Entscheidung, s.o.). VORSCHLAG, nicht
   implementiert (WP3-Disziplin): wenn der Operator die obere Leiste an die 80rem-
   Inhaltsbreite angleichen will, wäre das eine Zeile in `App.tsx` (`Navbar`-Container)
   plus visueller Check — bewusst nicht gemacht, weil es eine Desktop-Änderung OHNE
   Operator-Auftrag wäre.
5. **Routenwechsel-Close deckt Popover-Aktionen mit ab** (Toggle im Scope-Popover, [+]
   New Project) — die navigierenden Aktionen schließen den Drawer mit (gewollt), aber
   Dialoge, die NICHT navigieren (Terminal/Files/NewProjectDialog), bleiben offen, solange
   der Drawer offen ist; die Modals liegen viewport-fixiert ÜBER dem Drawer (z-50-Kontext,
   DOM-Reihenfolge) — visuell fein, aber ungetestet in jsdom (keine Layout-Engine).
6. **Parallele Agents im Tree**: mein Diff ist ausschließlich `App.tsx` (26 Z.),
   `HierarchySidebar.tsx` (110+/4−) + 4 neue Dateien + dieses Doc. Die übrigen
   Working-Tree-Änderungen (gateway/plugins/vault/ProjectDetailPage/…) gehören SPRINT-
   161/163/166-Agents — unangetastet gelassen.
