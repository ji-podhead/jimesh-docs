# SPRINT-40 — Sektions-Navigation: Mini-Sidebar + Overview-Landing (TASK-074)

**Quelle:** E-IA-Zielstruktur (Operator 14.9.2026 „ok go go go",
`docs/research/DECISIONS.md` §E-IA): 5 Haupt-Tabs (Proxy / Workspaces /
Platform / Security / DBs) + separates Admin. Security war auf 6 Sub-Seiten
gewachsen, ohne dass die Sub-Navigation im Haupttab-Dropdown sichtbar
konsumierbar ist — der Operator muss die Sub-Struktur IM Abschnitt sehen.

**Auftrag (TASK-074, GLM-Batch 14.9.):** Das Navigations-PATTERN bauen —
eine geteilte MiniSidebar pro Haupt-Route + pro Sektion eine
Overview-Landing — Pilot ist Security (die Sektion mit den meisten
Sub-Seiten). NICHT alle 5 halbfertig bauen: erst muss das Muster gut sein,
dann wird es repliziert (Pattern-Report unten).

Schwester-Sprints desselben Nummernkreises: `SPRINT-40-CONSOLIDATION.md`
(TASK-066, Platform-Tab + /security/secrets), `SPRINT-40-HEADSCALE-NETWORKS.md`
(TASK-078).

## Bauplan (Plan vor Code, Mandat 1.4)

### Ziel

1. **MiniSidebar-Komponente** (`src/frontend/src/components/layout/mini-sidebar.tsx`,
   neues Verzeichnis `components/layout/`):
   - Requisiten: Sektions-Routen (`items: MiniSidebarItem[]` mit `to`,
     `labelKey`, `icon`, optional `divider`, optional `isActive`-Prädikat)
     + `ariaLabelKey`. Labels laufen als i18n-Keys durch die Komponente
     (`t(labelKey)`) — keine fertigen Strings als Props.
   - **Aktive Route:** bewusst KEINE `activePath`-Prop — das aktive
     Highlight hängt an `NavLink` (reaktiert auf Router-Kontext, kann nie
     gegen den echten Pfad driften); pro Item überschreibbares
     `isActive(pathname)`-Prädikat nach dem `navGroups`-Vorbild in App.tsx
     (nötig für `/security/scans/sast`, das den Eintrag `/security/scans/iac`
     highlighting, ohne dass NavLink-Partial-Match greift).
   - Styling folgt der bestehenden Ästhetik der App (Vertikal-Variante des
     AdminLayout-Sub-Nav-Idioms: `bg-accent text-accent-foreground` aktiv,
     `text-muted-foreground hover:text-foreground` inaktiv), sticky beim
     Scrollen, `hidden` unter `md` (Mobile hat das Hamburger-Menü mit allen
     Gruppen — dort geht keine Sub-Nav verloren).
2. **Security-Layout-Outlet** (`src/frontend/src/views/SecurityLayout.tsx`,
   dünn: MiniSidebar + `<Outlet/>`): hängt an `<Route path="/security">`
   nach dem einzigen existierenden Outlet-Präzedenzfall (`/admin` →
   AdminLayout). ALLE Security-Sub-Routen werden relative Kinder — keine
   URL ändert sich, `/security` bekommt einen Index-Redirect auf
   `/security/overview` (zuvor: `*` → NotFoundPage).
3. **Overview-Landing-Upgrade** (additiv, kein Funktions-Umbau — TASK-069
   hat die Seite parallel weiterentwickelt, also als eigene Komponente
   `components/security-landing-strip.tsx` + 1 Import + 1 JSX-Zeile in der
   SecurityOverviewPage): Sektions-Landing mit den wichtigsten Infos:
   - **Criticals der letzten 24h** (fester 24h-Fenster, unabhängig vom
     gewählten Range-Filter) mit den neuesten kritischen Meldungen
   - **Scanner-Status Falco/Wazuh/Checkov/Guard** — ehrlich als
     „letzte Fundmeldung"-Alter, NICHT als Erreichbarkeitsprüfung
     („keine Funde (24h)" ist ein Ist-Zustand, kein Down-Behauptung)
   - **Aktive Quarantänen** (`GET /api/security/quarantine`) mit Link auf
     die Freigabe-Worklist im IaC-Tab
   - **Events-Trend (24h)**: Funde pro Stunde als Balkendiagramm, aus den
     echten Zeilen client-seitig gebucket — All-Null = ehrliche Null-Anzeige
   - Alle Daten aus existierenden Routen: `GET /api/sdk/logs?type=audit`,
     `GET /api/security/events`, `GET /api/security/quarantine`. KEIN neuer
     Backend-Route (→ API_DOCS unverändert, Mandat 1.1 greift nicht).
4. **App.tsx minimal + hunk-isoliert:** nur Import + Umordnung der
   Security-Routen in das verschachtelte Layout (TASK-066 hat die
   Platform-Gruppe bereits geliefert — daran wird NICHTs geändert).

### Akzeptanz

- Alle bestehenden Security-URLs antworten unverändert (Mandat 2: kein 404
  für eine Route, die funktionierte) — `/security/vault`-Redirect bleibt.
- tsc --noEmit: 0 NEUE Fehler gegen die Baseline des Worktree-HEAD.
- check:i18n grün (60 Locales, en/de handübersetzt, Rest via backfill).
- Live: Dev-Server aus dem Worktree, `curl /security` = 200, kompiliert
  ohne Fehler. (:19090 bedient den Haupt-Checkout, nicht den Worktree —
  deshalb eigener Port, dokumentiert in „Baubericht".)
- Kein Mock, keine erfundene Zahl: jede Landing-Kachel zeigt echte
  API-Daten oder einen ehrlichen Leer-/Fehlerzustand.

## Baubericht

**Umgesetzt 14.9.2026** (isolation: eigener Worktree
`../jimesh-worktrees/task-074-mini-sidebar`, Branch `task/074-mini-sidebar`
— Worktree-Pattern ab 45ab997; der laufende `jimesh-frontend-1`-Container
mounted den Haupt-Checkout, deshalb lief die Live-Verifikation gegen einen
eigenen Dev-Server aus dem Worktree, nicht gegen :19090).

Gebaut — Stand gegen die HEAD-Base `1c4887a` (TASK-066 war da schon
gemerged, d.h. Platform-Tab + `/security/secrets` + Redirect existierten;
App.tsx brauchte dafür nichts mehr):

1. **`src/frontend/src/components/layout/mini-sidebar.tsx`** (neu, 91 Z.):
   die geteilte Sektionssidebar. Props: `items` (Sektions-Routen mit
   `to`/`labelKey`/`icon`, optional `divider`, optional `isActive`-Prädikat
   nach dem navGroups-Muster) + `ariaLabelKey`; i18n-Labels löst die
   Komponente selbst über `t(labelKey)` auf. Aktive Route:NavLink- statt
   einer `activePath`-Prop (Begründung im Bauplan). Sticky (`top-20`), unter
   `md` hidden (Hamburger-Gruppenmenü deckt Mobile ab).
2. **`src/frontend/src/views/SecurityLayout.tsx`** (neu): SecurityLayout
   mit `SECURITY_SECTION_ITEMS` (Overview/Exposure/Project Secrets/
   Events/Scans/Testing — gleiche Reihenfolge + gleiche `nav.*`-Keys wie
   die Dropdown-`securityItems` in App.tsx) + `Scans`-`isActive`-Prädikat
   (deckt `sast`/`dast`, die neben der Entry-URL `iac` liegen) + Flex-Row
   aus MiniSidebar und `<Outlet/>`.
3. **`src/frontend/src/App.tsx`** (minimal, 3 Hunks, 34+/23−): Import +
   Umordnung der Security-Routen unter `<Route path="/security"
   element={<SecurityLayout />}>` mit relativen Kindern (Events-Routen
   zogen aus ihrer Nische hinter dem Admin-Block in den Block) +
   Index-Redirect `/security` → `/security/overview` (zuvor: NotFound-
   catch-all). navGroups/Platform-Gruppe (TASK-066) unangetastet.
4. **`src/frontend/src/components/security-landing-strip.tsx`** (neu):
   die Sektions-Landing als 4-Kachel-Grid, eigene Queries, fixe 24h-
   Fenster: Kritische Funde (24h, Zahl + die 3 neuesten Meldungen),
   Scanner-Aktivität (Falco/Wazuh/Checkov/Guard + alle im Feed tatsächlich
   vorhandenen Scanner; Alter der letzten Fundmeldung, ehrlich „keine
   Funde (24h)", mit explizit beschriftetem Disclaimer „keine
   Erreichbarkeitsprüfung"), Aktive Quarantänen (`GET
   /api/security/quarantine`, 0 = ehrliche Leeranzeige, >0 mit Link auf
   die Freigabe-Worklist im IaC-Tab), Events-Trend (24 Balken à Stunde,
   client-gebucktet, rot getönt wenn kritisch im Bucket; All-Null = „Keine
   Funde"). **„Jetzt"-Anker ist `dataUpdatedAt` der react-query-Snapshots**
   (Fetch-Zeit), NICHT `Date.now()` im Render — react-hooks/purity
   (ESLint) verbietet impure Render-Aufrufe; der Fetch-Anker ist sogar der
   ehrlichere, weil der Server sein `range=24h` im selben Moment angewendet
   hat. Query-Keys teilen sich mit SecurityOverviewPage (`['security-
   overview-sdk-logs','24h']`, `['security-overview-events']`) → dedupe,
   kein Doppel-Fetch.
5. **`src/frontend/src/views/SecurityOverviewPage.tsx`** (2 Zeilen:
   1 Import + `<SecurityLandingStrip />` nach dem PageHeader): die
   Parallel-Owner (TASK-064/067/069) verlieren keine Zeilen.
6. **i18n:** 20 neue Keys unter `securityLanding.*` — en/de
   handübersetzt, 58 Locales via `scripts/backfill-i18n.mjs`
   (1160 Backfills).

**Nicht gebaut (bewusst):** Replication auf Proxy/Workspaces/Platform/DBs —
Auftrag war ausdrücklich „nicht alle 5 halbfertig", erst muss das Muster
gut sein (Bewertung unten). Kein Mobile-Drawer der MiniSidebar (Rail ist
`hidden md:flex`, Mobile hat das Gruppen-Hamburger-Menü). Keine
WIDE_ROUTES-Änderung (Exposure-Tabelle passt in die verbleibende Breite;
bei einer späteren breiten Security-Seite muss PageContainer auf
Präfix-Match umgestellt werden — siehe Friction #4).

**Kein Backend-Route berührt** → API_DOCS.md unverändert (Mandat 1.1: nur
angefasste Routen dokumentieren; keine ist angefasst).

## Verify (Mandat 6 — was wirklich lief)

- `tsc --noEmit -p tsconfig.app.json`: **205 Fehler vor der Änderung
  (Baseline, HEAD-Noise, vgl. TASK-066-Bericht), 205 danach — `diff`
  der beiden Ausgaben leer: 0 neue.**
- `npm run check:i18n`: **grün — 60 Locales, 2001 Keys** (1981 + 20 neue).
- ESLint auf allen geänderten Dateien: sauber (2 anfängliche
  react-hooks/purity-Fehler durch `Date.now()` im useMemo behoben —
  Fetch-Anker statt Render-Uhr, siehe Bauplanpunkt 4).
- **Live aus dem Worktree** (`npx vite --port 5175`, Proxy-Env auf den
  Host-Backend 127.0.0.1:19091): `curl /security` = **200**; die
  transformierten Module (`/src/App.tsx`, `SecurityLayout.tsx`,
  `mini-sidebar.tsx`, `security-landing-strip.tsx`,
  `SecurityOverviewPage.tsx`, `main.tsx`) alle **200 und fehlerfrei
  transformiert** (stärkerer Compile-Beweis als die Shell: curl führt kein
  JS aus, aber Vite transformiert TSX on-demand — ein Fehler würde hier
  als 500/Error-Overlay erscheinen). Vite-Stderr: kein Fehler.
- Grenze, ehrlich benannt: `:19090` dient den HAUPT-Checkout (bind mount)
  und kann Worktree-Code nicht sehen; die /api-Proxy-Regel des
  vite-dev-Servers hängt auf dem Host bereits im Haupt-Checkout
  (nachgestellt, nicht von dieser Änderung berührt — der Container nutzt
  Next-Rewrites, der Vite-Host-Pfad war nie betrieben). Direktcurl auf den
  Backend (19091) bestätigt: `/health` 200, `/api/sdk/logs` 403
  (Session-Gate), `/v1/models` 200 — die angezeigten Datenquellen sind live
  und erreichbar; was curl nicht sieht, ist das client-seitige Rendern
  hinter AuthGate (gleiche Einschränkung wie im TASK-066-Bericht).
- Vitest-Lauf: siehe Abschlussbericht im Task-File (pre-existing
  chart-axis-Fehler sind dokumentiert von TASK-069, nicht von 074).

## Pattern-Report: Replizierbarkeit auf die anderen 4 Sektionen

**Kurzantwort: die Sidebar-Replication ist mechanisch (½ Stunde je
Sektion), die Landing-Replication ist je Sektion eigene Arbeit, und der
App.tsx-Umbau ist die konfliktträchtigste Fläche.** Das Muster ist reif zur
Replikation — mit den folgenden ehrlichen Reibungspunkten:

### Straightforward

1. **Die Komponente ist wirklich generisch.** Keine Security-Annahme in
   `mini-sidebar.tsx`; Proxy/Workspaces/Platform/DBs brauchen nur eine
   Items-Konstante + eine ~40-Zeilen-Layout-View + den App.tsx-Nesting-
   Umbau. DBs (2 Items) und Platform (3 Items) sind der Minimalfall.
2. **Sub-Sub-Layouts klappen.** Scans hat sein eigenes inneres Tab-Layout
   (`SecurityScansLayout`) — verschachtelte Outlets koexistieren mit der
   äußeren Rail ohne Anpassung; die Rail bleibt beim Wechsel iac→sast→dast
   stabil. Das war die wichtigste offene Frage vor dem Pilot.
3. **Ein Design-Idiom, drei Ausprägungen.** Top-Tab (Underline, Task-
   Dropdown), AdminLayout (horizontale Sub-Tabs) und MiniSidebar
   (vertikale Rail, `bg-accent`-aktiv) — gleiche Farb-/Typo-Sprache, keine
   neue Designsprache nötig.

### Friction (ehrlich, mit Empfehlung)

1. **Route-Umordnung ist der teuerste Teil.** Flache Routen müssen als
   JSX-Kinder unter das Layout-Route — und sie liegen nicht ordentlich
   beieinander: die Security-Events-Routen saßen physisch HINTER dem
   Admin-Block. Jede weitere Sektion verschiebt damit Zeilen durch
   fremde Hunks = Merge-Konflikt-Fläche für parallele Agents (066/069/072
   bauen gleichzeitig an App.tsx). **Empfehlung:** pro Sektion den
   Route-Move als ersten, reinen Verschiebe-Commit machen (die
   Item-Erweiterungen danach getrennt) — so löst sich ein Konflikt als
   reine Move-Diff.
2. **„Overview" ist kein Transistor-Pattern.** Security hatte schon eine
   Aggregations-Overview (TASK-064) — die Landing war dort nur ein
   Streifen-Upgrade. Proxy hat kein Overview-Äquivalent (primär ist /config
   = Router-Chat-Workspace), DBs hat GAR keine Übersichtsseite (nur
   Backups + ehrlicher Discovery-Empty-State). **Die Sidebar ist überall
   replizierbar; die Landing braucht je Sektion eine Inhaltsentscheidung,
   welche Feeds es überhaupt echt gibt (Mandat 2: eine Fake-Landing mit
   erfundenen Kacheln wäre ein Verstoß).** DBs-Landing wäre heute eine
   einzige Zeile „Backups: N" — lieber erst bauen, wenn echte
   DB-Feeds existieren.
3. **`isActive`-Prädikate fallen pro Sektion an**, wo Nav-Eintrag ≠ URL:
   Scans deckt iac/sast/dast; Proxy hat getabbte Seiten hinter einer URL
   (/sdk-logs?tab=…), Workspaces bekommt Detailrouten (/workspaces/:id),
   die die Rail-Einträge weiter beleuchten müssen. Der Baustein existiert
   (navGroups-Vorbild), aber jede Sektion muss ihre Ausnahmen selbst
   denken — NavLink-Partial-Match allein genügt nicht.
4. **Breite:** Die Rail kostet ~11rem der max-w-6xl-Spalte (Inhalt ~58rem).
   Für die Security-Tabellen unkritisch. ABER: `WIDE_ROUTES` ist ein Set
   exakter Pfade — wenn eine Sektion mit Rail später eine Wide-Page
   braucht, muss `PageContainer` auf Präfix-Matching umgestellt werden.
   Vorher nicht anfassen; bei Replication auf Proxy (/sdk-logs ist wide!)
   wird das akut — dort zuerst lösen.
5. **AuthGate/StrictMode-Unschärfen:** gelöst über den Fetch-Anker statt
   `Date.now()`; jede künftige Landing mit Zeitfenstern sollte dieses
   Muster direkt kopieren (ESLint erzwingt es ohnehin).

**Fazit für die nächsten 4 Sektionen:** Reihenfolge DBs → Platform →
Workspaces → Proxy (kleine, konfliktarme Flächen zuerst; Proxy zuletzt,
weil dort Wide-Routes + fehlende Landing-Entscheidung zusammenkommen).

---

## Work-Package 2 (Follow-up, Operator 14.9.): Globaler Scope-Selector

**Auftrag:** „globaler Selector für Workspace, SSH-Target, Session, App +
hierarchisches Dropdown in der MiniSidebar; ein globaler Hook, der die
Auswahl im Store direkt speichert, überall als Selector nutzbar; Liste der
Verwendungsstellen."

### Bauplan (vor Code, Mandat 1.4)

1. **Store + Hook** (`src/frontend/src/lib/global-scope.ts`, neues Modul,
   Toast-Store-Idiom aus `lib/toast.ts`: Modul-State +
   `useSyncExternalStore`, KEINE neue Dependency): `GlobalScope {kind:
   workspace|session|app|ssh, workspaceId?, projectId?, containerId?,
   sessionId?, sshEndpointId?}` + `setGlobalScope()/clearGlobalScope()` +
   `useGlobalScope()`. Persistenz: localStorage (`jimesh.global-scope`),
   ehrlich beschriftet wie beim Notifications-Bell-Präzedenzfall
   (Browser-lokal, überlebt Reload; kein Backend-Write pro Klick —
   Mandat-3-Abwägung im Baubericht).
2. **Hierarchisches Dropdown** (`components/layout/scope-selector.tsx`):
   reale Daten ausschließlich — Workspaces (`GET /api/workspaces`, Key
   `['workspaces','']`, dedupet mit WorkspaceAppsPage), Sessions
   (`GET /api/sessions` → AgentSessionRow mit project_id/container_id/
   status), SSH-Targets (`GET /api/settings/ssh_endpoints` via
   `lib/ssh-endpoints`, Key geteilt). Workspace-Submenü zeigt die echte
   Hierarchie: Workspace → Session (`workspaces.session_id`) → App
   (`workspaces.container_id`) → SSH-Target (`workspaces.sshTarget`).
   Klick setzt den globalen Scope (kein Navigations-Side-Effect — der Scope
   ist Filterkontext).
3. **MiniSidebar**: generischer `header?: ReactNode`-Slot über den Items —
   jede Sektion mountet ihren eigenen Selektor; Pilot: SecurityLayout.
4. **Pilot-Verbraucher** (beweist den Loop, in eigenen Dateien — Parallel-
   Owner unberührt): Landing-Strip zeigt bei aktivem Scope einen Chip +
   filtert die Funde-24h-Kacheln (Criticals/Scanner/Trend) nach
   Workspace/Session; `lib/security-overview.ts` bekommt additiv `sessionId`
   auf `UnifiedFinding` (SDK-Zeilen tragen `session_id`, Events `sessionId`).
   Quarantäne-Kachel bewusst UNgefiltert (HITL-Worklist ist per Definition
   global).
5. **Verwendungsstellen-Inventar** (Lieferumfang, nicht alles verdrahtet):
   dokumentierte Liste realer Anschlußpunkte im Sprint-File + Bericht.

### Akzeptanz (WP2)

- Klick auf Session im Dropdown → Store gesetzt → Landing-Chip + Filter
  reagieren im selben Render; Reload hält die Auswahl (localStorage).
- Keine neue Dependency; keine neue Backend-Route (API_DOCS unverändert).
- tsc 0 neue Fehler gegen die 205er-Baseline, check:i18n grün, ESLint
  sauber, Live-Kompilierung.

### Baubericht WP2

**Umgesetzt 14.9.2026** (gleicher Worktree/Branch, auf 901165b aufgesetzt):

1. **`src/frontend/src/lib/global-scope.ts`** (neu): der Store —
   Modul-State + `subscribeGlobalScope`/`getGlobalScope` +
   `useGlobalScope()` via `useSyncExternalStore` (exakt das
   `lib/toast.ts`-Idiom, keine neue Dependency, kein Provider nötig).
   `GlobalScope {kind, workspaceId?, projectId?, containerId?,
   sessionId?, sshEndpointId?}`. Persistenz localStorage
   `jimesh.global-scope` (ehrlich beschriftet im Dropdown-Fuß; bewusst
   wie beim Notifications-Bell-Präzedenzfall: UI-Filterkontext ≠
   Mandat-3-Daten, kein Backend-Write pro Klick. Für Cross-Browser-Sync
   wäre ein Settings-Row-Roundtrip der dokumentierte nächste Schritt —
   die Form ist bereit.)
2. **`src/frontend/src/hooks/use-scope-label.ts`** (neu):
   `useScopeRegistries()` (geteilte Query-Keys: `['workspaces','']`,
   `['sessions']`, `endpointsQueryKey` aus lib/ssh-endpoints) +
   `useScopeLabel()` — löst die Ids in Label/Status auf; `known:false`
   für entfernte Rows (ehrlich „nicht mehr in der Registry" statt
   Verschwindenlassen).
3. **`src/frontend/src/components/layout/scope-selector.tsx`** (neu): das
   hierarchische Dropdown — Workspaces mit ECHTEN Sub-Zweigen (Session
   `workspaces.session_id`, App `workspaces.container_id`, SSH-Target
   `workspaces.sshTarget`), Sessions-Liste (Status verbatim,
   Workspace-Attribution über session-id ODER container-id), SSH-Targets
   (Name + host:port). Klick setzt nur den Scope — kein
   Navigations-Side-Effect. Aktiver Knoten hervorgehoben, „Scope
   aufheben" oben, Speicher-Hinweis unten, ehrliche Empty-Items je
   Gruppe.
4. **MiniSidebar** (`mini-sidebar.tsx`): generischer `header?: ReactNode`-
   Slot über den Items; **SecurityLayout** mounted `<ScopeSelector />`
   dort (die Rail bleibt sektions-generic).
5. **Pilot-Verbraucher** (`security-landing-strip.tsx`): Scope-Chip
   („Gefiltert nach Scope: …" + Aufheben-Knopf — nie stilles Filtern) +
   Filter der Funde-Kacheln: Workspace → Rows des Workspace UND seines
   Projekts; Session → exakte session-id (dafür trägt
   `UnifiedFinding` jetzt additiv `sessionId` — SDK `session_id`, Events
   `sessionId`; `lib/security-overview.ts`, keine Producer geändert);
   App → Workspace-Filter (Funde referenzieren keine Container-Ids — als
   solches über den Chip sichtbar); SSH → Workspace-Filter wenn
   attribuiert, sonst sichtbar-ungefiltert. Quarantäne-Kachel bewusst
   UNgefiltert (HITL-Worklist ist global).
6. **Funktionsbeweis** `src/lib/global-scope.test.ts` (neu, jsdom):
   set→Subscriber→Snapshot→localStorage; clear; Reload lädt
   persistierten Scope; Garbage/ungültige kind-Werte in localStorage →
   ehrlicher null-Scope. **3/3 grün.**
7. **i18n:** 15 Keys `scopeSelector.*` + 2 Keys `securityLanding.scope*`
   — en/de handübersetzt, 58 Locales via backfill (986 Backfills).

**Verify WP2:** tsc 205=205-Baseline (`diff` leer, **0 neue**);
check:i18n grün (60 Locales/**2018** Keys); ESLint auf allen geänderten
Dateien sauber; Vitest: Store-Tests 3/3, volle Suite **228 passed** / 5
pre-existing chart-axis (s. Baubericht WP1); Live aus dem Worktree
(vite :5175): `curl /security` = 200, alle 7 geänderten/neuen Module
sauber transformiert. Kein Backend-Route, keine neue Dependency
(API_DOCS/package.json unverändert).

### Verwendungsstellen-Inventar (wo `useGlobalScope()` andocken kann)

Legende: 🔗 verdrahtet (dieser WP) · 📋 Inventar (echter Anschlußpunkt,
bewusst NICHT verdrahtet — das Eigentum steht bei anderen Tasks bzw.
wäre je Zeile ein eigenes kleines WP):

| Stelle | Datei | Anschluß |
|---|---|---|
| 🔗 Security-Landing (Criticals/Scanner/Trend + Chip) | `components/security-landing-strip.tsx` | Pilot-Verbraucher, s. o. |
| 🔗 Scope-Selector selbst | `components/layout/scope-selector.tsx` | Trigger-Label + aktive Hervorhebung |
| 📋 Overview-Tabelle (Target-Filter, TASK-069-Picker) | `views/SecurityOverviewPage.tsx` | Scope → `targetFilter`-Preselect statt Nur-Dropdown; `UnifiedFinding.sessionId` existiert dafür schon |
| 📋 Exposure — hat schon einen lokalen Projekt-Filter | `views/SecurityExposurePage.tsx:212` (`HierarchyProjectSelection`) | Scope→projectId als Quelle des bestehenden Filters + `?project=<id>`-Sonde |
| 📋 Events-Liste + Report | `views/SecurityEventsPage.tsx`, `views/SecurityReportPage.tsx` | Filter nach `scope.sessionId`/`projectId` (Rows tragen beides) |
| 📋 SDK/Proxy-Logs | `views/SDKLogsPage.tsx` | Rows tragen `session_id`/`workspace_id`/`project_id` — Scope als Filter-Preset |
| 📋 Workspace-Unterseiten | `views/WorkspacesPage.tsx`, `WorkspaceAppsPage/…` | Scoped Workspace highlighten/öffnen statt Liste ab null |
| 📋 Deploy-Dialoge (Playground/ProjectsPage) | `components/workspaces/workspace-deploy-dialogs.tsx`, `ssh-target-select.tsx` | `scope.sshEndpointId`/`workspaceId` als Preselect (nichts wird automatisch deployed) |
| 📋 Control-Planes Deploy-Dialog | `views/ControlPlanesPage.tsx` | `scope.projectId` als Projekt-Preselect |
| 📋 Analytics/Kosten | `views/AnalyticsPage.tsx`, SDK-Logs-Kostenspalte (`GET /api/analytics/by-workspace`) | Kachel des scoped Workspace hervorheben/allein zeigen |
| 📋 RoutingAnalytics / RealtimeMonitor | `components/RoutingAnalytics.tsx`, `RealtimeMonitor.tsx` | Stream-Filter nach `scope.sessionId`/`workspaceId` |
| 📋 Chat/Agents | `components/ChatInterface.tsx`, `views/AgentsPage.tsx` | `scope.sessionId` als aktiver Agent-Kontext |
| 📋 Networks (Platform, TASK-078-Fläche) | `views/NetworksPage.tsx` | Scoped Container/Session im Mesh hervorheben |
| 📋 Künftige Sektion-Rails (DBs/Platform/Proxy) | `views/SecurityLayout.tsx` als Muster | `<ScopeSelector />` in den `header`-Slot — 1 Zeile je Sektion |

**Muster fürs Andocken** (überall gleich):

```ts
const { scope, clearScope } = useGlobalScope()
// gehört diese Zeile zum Scope?
const inScope = scope?.kind === 'session'
  ? row.session_id === scope.sessionId
  : scope?.kind === 'workspace'
    ? row.workspace_id === scope.workspaceId || row.project_id === scope.projectId
    : true // kein Scope = alles — und ohne sichtbaren Chip wird nie gefiltert
```

Regel gegen stilles Filtern (Mandat 2): jede Fläche, die den Scope liest,
zeigt ihn auch — der Landing-Chip ist das Muster; ein Scope ohne
sichtbaren Filter-Hinweis wäre ein Bug.

---

## Work-Package 3 (Follow-up, Operator 14.9.): Scope-Selector nur dort zeigen, wo er benutzt wird

**Auftrag:** „blende den hierarchischen Selector aus, wenn er auf der Seite
nicht verwendet wird; schreib am besten ein Schema-File dafür."

### Bauplan (vor Code)

1. **Schema-File** (`src/frontend/src/lib/scope-usage-schema.ts`): getippte
   Registry `ScopeUsageEntry {route, consumesScope, consumer?, planned?}` —
   pro (Security-)Route die EHRliche Aussage, ob die Seite den Scope
   verbraucht, mit Beweis-Anker: `consumer: Datei:Zeile` des lesenden Codes
   bei true, `planned: Anschlußpunkt` (Inventar) bei false. Matcher
   `scopeSelectorVisibleFor(pathname)`: Segment-Grenzen wie App.tsx
   `pathIn`, longest-match gewinnt, UNLISTED Route → hidden (nicht
   deklariert = nicht verbrauchend — Mandat-2-Vorsicht, kein
   Fake-Sichtbarkeit).
2. **SecurityLayout:** rendert `<ScopeSelector />` nur, wenn das Schema die
   aktuelle Route für sichtbar erklärt (Layout bleibt Besitzer des
   header-Slots; das Schema ist die eine Wahrheit).
3. **Funktionsbeweis:** Matcher-Unit-Test (node-env): overview sichtbar,
   Schwestern versteckt, unlisted Route versteckt, Segment-Grenzen
   (kein /security/overview-legacy-Fehl-Match).

### Akzeptanz

- Selector sichtbar NUR auf /security/overview (+ Bare-/security über den
  Index-Redirect) — überall sonst ausgeblendet, bis die Fläche wirklich
  verbraucht und im Schema eingetragen ist.
- tsc 0 neue Fehler, ESLint sauber, Vitest grün, Live-Kompilierung.

### Baubericht WP3

**Umgesetzt 14.9.2026** (neuer Worktree `../jimesh-worktrees/task-074-scope-usage`,
Branch `task/074-wp3-scope-usage` auf main `56b29ad` — WP1/WP2 waren da
schon gemerged, `b73917e` hatte App.tsx+Brand berührt, meine Rail-Dateien
nicht).

1. **`src/frontend/src/lib/scope-usage-schema.ts`** (neu): das Schema-File
   — `ScopeUsageEntry {route, exact?, consumesScope, consumer?, planned?}`,
   Eintrag je Security-Route. Ehrlichkeits-Anker: `consumer: Datei:Zeile`
   bei true (Overview: `security-landing-strip.tsx findingMatchesScope`;
   Bare-/security: der Index-Redirect), `planned:` Inventar-Anschlußpunkt
   bei false (Exposure/Secrets/Scans/Events/Testing). Matcher
   `scopeSelectorVisibleFor(pathname)`: Segment-Grenzen (pathIn-Semantik)
   + `exact` für den Section-Root, longest-match gewinnt, **unlisted Route
   → hidden** (nicht deklariert = nicht verbrauchend). Der Root verleiht
   unlisted künftigen Sub-Pages NICHTS (bewusst `exact` — strengste Lesung
   der Operator-Regel; eine neue Sub-Page startet versteckt und bekommt
   ihren Eintrag in derselben Änderung, die sie verdrahtet).
2. **`views/SecurityLayout.tsx`**: mountet `<ScopeSelector />` nur, wenn
   das Schema die aktuelle Route sichtbar erklärt (`useLocation` — der
   Selector erscheint/verschwindet mit der Route).
3. **`src/lib/scope-usage-schema.test.ts`** (neu): 5 Matcher-Tests —
   Overview sichtbar, alle unwired Schwestern versteckt (auch tiefe Pfade
   wie scans/sast, events/42), Bare-/security sichtbar, unlisted Route
   versteckt, Segment-Grenzen (kein /security/overview-legacy-Fehl-Match).
   **5/5 grün.**

**Sichtbar-Regel heute (ehrlicher Stand):** Selector NUR auf
`/security/overview` (+ den Bare-Pfad während des Index-Redirects) — alle
anderen Security-Seiten blenden ihn aus, bis sie den Scope wirklich lesen
und ihr `planned:` zu `consumer:` wird.

**Verify WP3:** tsc 205=205-Baseline (`diff` leer, **0 neue**, keine
Fehler in geänderten Dateien); ESLint sauber; Vitest voll: **245 passed**
/ 5 pre-existing chart-axis (davon 5 neue Schema-Tests + 3 Store-Tests
von WP2, alle grün); Live aus dem Worktree (vite :5177): /security,
/security/overview, /security/events, /security/scans/sast = 200, alle 4
betroffenen Module sauber transformiert. Kein Backend-Route, keine neue
Dependency, keine i18n-Änderung nötig.

---

## Work-Package 4 (Follow-up, Operator 14.9.): Globale SectionRail rechts + MenuGroupContext-Crash-Fix

**Auftrag:** „Warum ist die Sidebar nur im Security-Tab?" (Antwort: 074 war
als PILOT gescoped — Pattern-Report empfahl die Replication; sie kommt
jetzt) + „Sidebar an der Seite GANZ RECHS als Overlap über dem Canvas,
aufschieben/ausklappen bei Hover, sonst nur Icons" + Crash-Meldung
„Base UI: MenuGroupContext is missing".

### Bauplan (vor Code)

1. **Crash-Fix (eigener Commit, unabhängig mergebar):** Root Cause: das
   Schema-Selector-Dropdown rendert `DropdownMenuLabel` direkt in der
   `DropdownMenuContent` — Base UIs `MenuGroupLabel` liest zwingend
   `MenuGroupContext` (geworfen in `MenuGroupContext.mjs:
   useMenuGroupRootContext`), existiert nur innerhalb `<Menu.Group>` (=
   `DropdownMenuGroup`). Das Top-Nav-Muster (App.tsx Mobile-Menü) wrappt
   deshalb. Fix: jede der 3 Label-Sektionen (Workspaces/Sessions/
   SSH-Targets) in `DropdownMenuGroup` wrappen. Regressionstest: jsdom-
   Render, Trigger öffnen, kein Throw, Content im DOM.
2. **Nav-Modell extrahieren** (`src/frontend/src/lib/section-nav.ts`):
   EINE Quelle für pathIn + *_BASES + NavEntry (+ per-Item-Icon, neu +
   optionales `isActive`) + navGroups (6 Gruppen, Stand nach b73917e:
   Workspaces/Platform/Security/DBs/LLM-Proxy). App.tsx importiert
   daraus (inline-Block fällt, Names unverändert) — die E-IA-
   Enforcement-Tabelle bleibt EIN Mal. Export `activeSectionFor(pathname)`.
3. **SectionRail** (`components/layout/section-rail.tsx`): einmal in der
   App-Shell gemountet (neben Toaster — KEIN Route-Nesting für die
   anderen Sektionen nötig); leitet die aktive Sektion aus der Location
   ab (Group-`isActive`); `fixed` am RECHTEN Rand unter der Navbar,
   Overlay über dem Canvas (kein Layout-Shift, kein max-w-Gewüstere),
   kollabiert w-12 NUR Icons, bei Hover/focus-within w-44 mit Labels
   (reine CSS-Transition), Backdrop-blur+Schatten gegen das
   durchscheinende Canvas. Scope-Selector sitzt oben in der Rail
   (schema-gegart nach WP3, Label via CSS nur im expandierten Zustand).
4. **SecurityLayout** vereinfacht zu `<Outlet/>` (Rail ist global);
   `mini-sidebar.tsx` (linke In-Flow-Rail, obsolet) wird gelöscht;
   `scope-selector.tsx` bleibt (lebt jetzt in der Rail).
5. **Verify:** tsc 0 neu, ESLint, Vitest (inkl. neuer Crash-Regressionstest
   + Section-Matcher-Test), Live-Kompilierung aus dem Worktree.

### Akzeptanz

- Der Crash ist weg (Regressionstest beweist das Öffnen des Dropdowns).
- Rail erscheint auf ALLEN Sektions-Seiten (Workspaces, Platform,
  Security, DBs, LLM-Proxy), rechts, icon-only, Hover-Expansion.
- Keine URL-Änderung, kein Route-Nesting-Churn in App.tsx für die
  neuen Sektionen (nur Import-Umbau + Rail-Mount).

### Baubericht WP4

*(nach Implementierung)*

### Baubericht WP4

**Umgesetzt 14.9.2026** (Worktree `../jimesh-worktrees/task-074-scope-usage`,
Branch `task/074-wp4-section-rail`, 2 Commits: WP4a `e2d04da` Crash-Fix,
WP4b SectionRail).

**WP4a — der Crash (Operator-Meldung „Base UI: MenuGroupContext is
missing"):** Root Cause: `DropdownMenuLabel` = Base UI `MenuGroupLabel`,
das zwingend `useMenuGroupRootContext()` liest — existiert nur innerhalb
`<Menu.Group>`. Die 3 Labels des Scope-Selektors saßen NACKT in der
`DropdownMenuContent` → Throw beim ÖFFNEN → ErrorBoundary schluckte das
Dashboard. Fix: jede Label-Sektion in `DropdownMenuGroup` gewickelt
(dasselbe Muster wie das Mobile-Menü der Top-Nav). Regressionstest
(`scope-selector.test.tsx`, jsdom, reales Öffnen des Menüs): 2/2 grün —
der ERSTE Test, der transitiv eine `@/`-Komponente importiert (deshalb
`@`-Alias in vitest.config.ts).

**Nebenfund (groot):** die 5 „pre-existing" chart-axis-Failures (seit
TASK-069 dokumentiert, nie erklärt) haben dieselbe Wurzel wie der erste
Testlauf-FAIL meines Regressionstests: die Agent-Harness-Shell exportiert
`NODE_ENV=production` → Vitest übernimmt ein GESETZTES NODE_ENV (defaultet
nur bei unset auf `test`) → React lädt den Production-Build → `act` ist
dort undefined → „(0, act) is not a function". Fix in vitest.config.ts:
NODE_ENV wird vor allen Imports auf `test` erzwungen. **Die Suite ist
damit erstmals komplett grün: 252/252 (vorher 245/5).**

**WP4b — die globale SectionRail („warum nur im Security-Tab?"):**
Antwort auf die Frage: 074 war als PILOT gescoped (Pattern-Report:
Replication als eigenes WP). Jetzt gebaut — aber NICHT durch 5× Route-
Nesting (meine eigene Friction-Warnung: konfliktträchtigste Fläche),
sondern durch eine Mount-in-der-Shell-Rail:

1. **`src/frontend/src/lib/section-nav.ts`** (neu): das Nav-Modell aus
   App.tsx EXTRARIERT — pathIn, *_BASES, NavEntry (jetzt mit Pflicht-
   `icon` + optionalem `isActive`), alle Items, navGroups (5 Gruppen
   nach b73917e: Workspaces/Platform/Security/DBs/LLM-Proxy). EINE
   Quelle für Top-Nav UND Rail (E-IA-Enforcement lebt in EINER Datei) +
   `activeSectionFor(pathname)`.
2. **`components/layout/section-rail.tsx`** (neu): EINMAL in der App-
   Shell gemountet (neben Toaster, kein Route-Nesting!); leitet die
   aktive Sektion aus der Location ab; `fixed` am RECHTEN Rand unter der
   Navbar, **Overlay über dem Canvas** (kein Layout-Shift, Full-Bleed-
   Seiten wie /projects laufen darunter durch); kollabiert w-12 NUR
   Icons (title-Tooltip), bei Hover/focus-within CSS-Transition auf w-44
   mit Labels — kein State, kein Listener, nichts kann gegen den Router
   driften; backdrop-blur+Schatten gegen das durchscheinende Canvas;
   Toasts (z-60) liegen ÜBER der Rail (z-30). Hidden <md (Hamburger
   deckt Mobile). Der Scope-Selector sitzt oben in der Rail,
   schema-gegart (WP3): nur auf konsumierenden Routes, sonst reine
   Icon-Nav.
3. **SecurityLayout** → reiner `<Outlet/>`-Pass-Through (Rail ist
   global; Route-Struktur bleibt, künftige Sektions-Shell-Arbeit hat ein
   Zuhause). **`mini-sidebar.tsx` gelöscht** (linke In-Flow-Rail,
   obsolet — 3 veraltete Kommentar-Referenzen aktualisiert).
4. **App.tsx** (minimal): inline-Nav-Block (pathIn..navGroups) ersetzt
   durch 2 Importe + `<SectionRail />` in der Shell; 5 Gruppen-Icons aus
   dem lucide-Import entfernt (leben jetzt im Modell). KEINE URL-
   Änderung, kein Route-Churn.
5. **`lib/section-nav.test.ts`** (neu): 4 Tests — aktive Sektion für
   Repräsentanten aller 5 Sektionen, null außerhalb (/admin, /premium),
   jeder labelKey (Gruppen+Items) löst in en.json auf, jedes Item hat
   ein Icon (Rail rendert icon-only). 4/4 grün.

**Verify WP4:** tsc 205=205-Baseline (0 neue, keine in geänderten
Dateien); ESLint sauber; **Vitest 256/256** (252 nach WP4a + 4 neue;
erstmals komplette Suite grün); Live aus dem Worktree (vite :5178):
/security/overview, /workspaces, /control-planes, /dbs/backups, /config,
/admin/users = 200, alle 5 Module sauber transformiert. Kein Backend-
Route, keine neue Dependency, keine i18n-Keys nötig (Rail nutzt die
nav.*-Keys des Modells).

**Offen / bewusst nicht gebaut:** Rail-Overlay deckt rechts bis 3rem
Inhalt (gewünscht: „overlap über dem Canvas"); falls störend, wäre ein
`pr-12` an PageContainer der eine-Zeilen-Follow-up. Touch: Rail bleibt
kollabiert (Tipp navigiert direkt, title-Tooltip verrät das Ziel) —
eine Pin-Toggle-Variante wäre ein Mini-WP. Die 12 📋-Scope-Anschlüsse
aus WP2 bleiben Inventar.

> **Unabhängige Zweitverifikation (Session 2, fix/scope-selector-menu-group):** derselbe
> Crash wurde parallel diagnostiziert und mit einem RED→GREEN-Render-Test reproduziert
> (MenuGroupContext.mjs:10 vor Fix). Zusätzlich in dieser Fassung: hierarchische
> Project→Workspace→App-Gruppierung im Scope-Selector (Projektnamen aus
> GET /api/projects) + vitest.config pinned NODE_ENV=test (identischer Effekt).



---

**Verify Hotfix:** tsc **205 = 205-Baseline** (0 neue, 0 in geänderten
Dateien); ESLint auf allen 4 geänderten Dateien sauber; check:i18n grün
(60 Locales / 2090 Keys — Keys unverändert, kein neuer Key nötig);
Vitest **252/252** (auch mit `NODE_ENV=production`). Branch
`fix/scope-selector-menu-group` (Worktree `fix-scope-selector`, Basis
main `d6b6bec`), Dateien: `scope-selector.tsx`, `use-scope-label.ts`,
`vitest.config.ts`, neuer `scope-selector.render.test.tsx`, dieses Doc.
Kein Backend-Route, keine neue Dependency, keine i18n-Änderung.

## Operator-Follow-up 13.9.: Rail als rechts schwebendes Overlay (icons-only, Hover-Expansion)

**Operator-Wunsch:** „Warum ist die Sidebar nicht an der Seite ganz rechts
als Overlap über dem Canvas? Von mir aus kannst du sie gerne aufschieben,
wenn jemand hovert — aber sonst nur Icons zeigen."

**Vorher:** die MiniSidebar war eine LINKSSEITIGE Layout-Spalte
(`flex shrink-0 w-44` + `gap-8` im SecurityLayout) — sie hat dem Canvas
~200px Breite weggenommen.

**Nachher (`components/layout/mini-sidebar.tsx`, geteilte Komponente — gilt
für jede Sektion, die das Pattern übernimmt):**
- **Rechts schwebendes Overlay:** `md:fixed md:right-2 md:top-20` +
  Border + Shadow + `bg-background/90 backdrop-blur` — sie liegt ÜBER dem
  Canvas (z-30, unter der Navbar z-40), reserviert KEINEN Layout-Platz;
  die Seiten behalten volle Breite. SecurityLayout dazu entschlackt
  (flex/gap-Gutter raus, nur noch Rail + Outlet).
- **Icons-only kollabiert** (`md:w-14`): nur die Sektions-Icons, aktives
  Item per NavLink-Highlight sichtbar; Label-Spans bleiben IM DOM
  (Screen-Reader), kollabieren visuell über `max-w-0 opacity-0`.
- **Hover- UND Tastatur-Expansion** („aufschieben wenn jemand hovert"):
  reine CSS-Group-Varianten, kein JS-State — `md:group-hover:w-44` +
  `md:group-focus-within:w-44` (Tab-Navigation öffnet dieselbe
  Expansion); Rail animiert `transition-[width]`, Labels faden/sliden
  mit `delay-75` nach. Header-Slot (Scope-Selector) erscheint mit der
  Expansion (`hidden group-hover:block`), kollabiert wie gewünscht nur
  Icons.

**Beweis:** neuer Kontrakt-Test `mini-sidebar.render.test.tsx` (jsdom,
echte MemoryRouter-Routen): pinned die Klasse-Komposition (group,
md:fixed/right, kollabierte Breite, beide Expansions-Varianten),
Label-Spans im DOM mit max-w-0/opacity-0 + Gruppen-Expansion, Header-Slot
hidden-bis-Hover, Icons je Item — plus Active-Highlight mit
isActive-Präzedenz auf /security/scans/sast (NavLink allein würde dort
nicht leuchten). jsdom animiert kein CSS — der Test pinnt den Kontrakt,
nicht die Animation.

**Verify:** Vitest **254/254** (23 Dateien; auch mit NODE_ENV=production);
tsc **205 = Baseline** (0 neue, 0 in geänderten Dateien); ESLint sauber;
check:i18n 60/2090 (kein neuer Key). Kein Backend-Route, keine neue
Dependency. Zweiter Commit auf `fix/scope-selector-menu-group`.
