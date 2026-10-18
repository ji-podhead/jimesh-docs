# SPRINT-182 — Dashboard-Builder (st2-Grid) + Navbar/IA (S173-Umbau)

**Status:** 🔄 Offen — WP1 (IA) in Vorbereitung, WP2 (Grid) nicht begonnen. **WP4 (Container Overview Widget + SSH Target) erledigt** (4. Session/Nemotron, 4.10.).

## Auftrag, verbatim (Operator, 3.10.)

- "du machst den task mit den dashboards und der neuen navbar"
- "st2 ist im pojects folder" → "oder unter trading kp" → Pfad = `/home/ji/projects/trading/st-2`
- "außerdem das mit resposnives wra auch gut gelst in st2"
- Reihenfolge gewählt (Question): **"Erst Navbar/IA nach S173"**

## Operative Constraints (aus der Session, verbatim)

- **"du sollst nicht hier deployen!!!"** → auf podhead NUR edit/commit/push. Ausführung auf
  superleo, **"nein ich deploye"** → ich nenne Commands, der Operator führt sie aus. "drüben is
  die cp" (superleo = CP).
- **"lass die andere session das mergen dann kannst du danach hier pullen"** → nie stashen/
  forcieren; `git pull --no-rebase` nach dem Merge der parallelen S181-Session.

## Bezug zu bestehenden Sprints

- **S173** = die verbindliche IA-Blaupause (Konzept, NICHT gebaut). Dieser Sprint baut sie.
- **S173 Bau-Sequenz Nr. 2** sagt: "Der S173-Nav-Umbau selbst: **live mit dem Operator in der
  S150-Session**" — der Operator hat den Umbau stattdessen an mich vergeben (siehe Auftrag).
  Die in S173 **bewusst vertagten** Entscheidungen bleiben vertagt.
- **S150** (Tab-Strip, "📋 Geplant, NICHT gebaut") baut auf S173 auf → bleibt unberührt.
- **S157 / S165 / S149** = Vorgänger-Reorgs; Navigation-only-Prinzip (Mandat 14) bleibt.

---

# WP1 — Navbar/IA nach S173

## Bestand (gemessen 3.10.)

| Datei | Umfang | Rolle |
|---|---|---|
| `src/frontend/src/lib/section-nav.ts` | 544 Z | **EINE** kanonische Tabelle: `*_BASES`, `*Items`, `navGroups`, `activeSectionFor`. Konsumiert von App.tsx. |
| `src/frontend/src/App.tsx` | Z.145, 325, 414 | Navbar-Tabs + Mobile-Menu aus `navGroups` |
| `src/frontend/src/components/sidebar/HierarchySidebar.tsx` | 2266 Z | **Zweite Registrierung (RM35)**: eigene Arrays `SERVERS_SECTION_ITEMS`, `OBSERVABILITY_ITEMS`, `AI_CHAT/PROXY/MODEL_ITEMS` … spiegeln section-nav 1:1 |
| `src/frontend/src/lib/section-nav.test.ts` | — | 30+ `activeSectionFor(...).labelKey`-Assertions |
| `src/frontend/src/components/sidebar/HierarchySidebar.test.tsx` | — | Sidebar-Mirror-Tests |

**Aktuelle Struktur: 6 Gruppen, EINE Ebene.** S173 will **5 Hauptkategorien mit Subkategorien**
(= Modellerweiterung, nicht nur Reihenfolge).

## Ziel-Mapping (S173 Kern-Entscheidung 3)

| # | Ziel-Kategorie | Quelle (heute) | Subkategorien |
|---|---|---|---|
| 1 | **PROJECTS** | Group 1 `nav.workspaces` | Servers, Files, Apps, Plugins, Subagents, **Terminal** (Nachtrag 4), **SAST+DAST** (Kern 3) |
| 2 | **INFRA** (Arbeitstitel, alias "Security & Monitoring") | Group 2 `platformItems` + Group 3 `firewallItems` + Group 4 `observabilityItems` | Registries · Firewall & Threat · Observability & Events |
| 3 | **AI** | Group 6 `aiItems` (S165) — **passt exakt, kein Rework** | Chat, Proxy, Models |
| 4 | **DATABASES** | Group 5 `dbItems` | Backups, Discovery, Datalake |
| 5 | **GENERAL/UTILITY** (Name offen) | **NEU** | Email, Settings, Admin, Secrets, **Dashboards**, Builder?, Chat? — **KEIN Scope-Selector** |

## Jetzt entscheidbar (ohne offene Fragen)

1. Neue 5. Gruppe `GENERAL/UTILITY` anlegen; `'/dashboards'` raus aus `PLATFORM_BASES`,
   `'/security/secrets'` + `'/security/email'` raus aus `FIREWALL_BASES` (S173 Nachtrag 3).
2. Gruppenlabel PROJECTS: `nav.projects` existiert bereits in allen 60 Locales (77 nav.-Keys).
3. Modellerweiterung `NavGroup.subgroups` (zweite Ebene) — erste Ebene = Navbar-Tabs,
   zweite = Sidebar-Sektionen; `activeSectionFor` läuft weiter FIRST-match über beide Ebenen.
4. `section-nav.test.ts` + `HierarchySidebar.test.tsx` + i18n in **allen 60** Locales.

## Operator-Entscheidungen (Question-Runde, 3.10.) — verbatim

- **Q1 Name der 5. Kategorie:** **"Utility"** → `nav.utility`.
- **Q2 Static Analysis:** **"Ganze Scans-Fläche → Projects"** → `/security/scans/*` wandert als
  GANZES (Eintrag + `isActive`) nach PROJECTS; Route/URL unverändert (Mandat 14).
- **Q3 Firewall-Platzierung:** **"Firewall sofort eigene Kategorie"** → die von S173 Nachtrag 1
  an den UIUX-Audit **vertagte 3/2/1-Frage ist damit VORAB ENTSCHIEDEN**: Firewall wird eine
  Hauptkategorie. *Das ist eine bewusste Abweichung von S173* (dort: "entscheidet der UIUX-Agent
  im finalen Audit") — hier dokumentiert, damit das spätere Audit sie nicht doppelt entscheidet.
- **Q4 Chat:** *"crew chat bei ai aber unterkategorie ode rcomponent bei meshsquad da sollen die
  eigenen crews dropdowns haben und dann den chat, aber der chat kann oben auch den
  hauptchannel wechseln da ist immer default auch der haupt jimesh user chat"*
  → **Beide Chats bleiben bei AI** (kein Sprung nach Utility). Zusatz-Anforderung an die
  **Komponente**, nicht an die Nav:
  1. AI → Unterkategorie/Component **MeshSquad**: eigene **Crews als Dropdown**, darunter der Chat.
  2. Chat-Kopfzeile: **Hauptchannel wechselbar**; **Default = Haupt-JiMesh-User-Chat**.
  → eigener Task WP1b, Teil der MeshSquad-Chat-Komponente.
- **Q4-Nachfrage "Unterkategorie/component bei MeshSquad"** (offen gelassen, dann
  nachgefragt): Operator antwortete **„Sidebar-Sub-Block"** → AI bekommt einen
  aufklappbaren Crew-Block mit der Crew-Liste; jeder Eintrag führt in seinen Raum.
  → Task 7b, `MeshSquadCrewsBlock.tsx` + `?team=`-Brücke. Nicht geraten, sondern
  die Antwort auf die im WP1b-Abgleich ausdrücklich offengelegte Mehrdeutigkeit.

## Ergebnende Struktur (6 Hauptkategorien)

Reihenfolge nach S173 ("2 haupt kategorien: projects und infra … 3. global kategorie könnte ai
sein … databases … und dann haben wir noch so basic sachen") + Firewall an INFRA:

| # | Kategorie | labelKey | Landing | Inhalt |
|---|---|---|---|---|
| 1 | **Projects** | `nav.projects` ✅ existiert | `/workspaces` | workspaceItems **+ Static Analysis** (Q2) |
| 2 | **Infra** | `nav.infra` ❌ neu | `/control-planes` | Registries (control-planes, api-docs, vault) **+ Observability & Events** (7 Einträge) |
| 3 | **Firewall & Threat Detection** | ✅ existiert | `/security/overview` | firewallItems **minus** Scans, minus secrets/email |
| 4 | **AI** | `nav.ai` ✅ | `/chat` | aiItems **unverändert** (S165 bleibt) |
| 5 | **DBs** | `nav.dbs` ✅ | `/dbs/backups` | dbItems unverändert |
| 6 | **Utility** | `nav.utility` ❌ neu | `/dashboards` | Dashboards, Dashboard Builder, Secrets, Email, Admin — **KEIN Scope-Selector** |

**Folge aus der Firewall-Entscheidung:** die ehemaligen Gruppen *Platform* (2) und
*Observability & Events* (4) verschmelzen zu **Infra** — `nav.platform` und
`nav.observabilityEvents` werden zu deren **Unterkategorien-Labels** (keine neuen Keys nötig).

## Bei Gelegenheit mitgezogene Leichen (Mandate 14, gleiche BASES-Liste)

- `/api-docs` liegt in `platformItems`, **fehlt aber in `PLATFORM_BASES`** → leuchtet heute
  KEINE Gruppe. Wandert mit in `INFRA_BASES`.
- `/admin` hat einen eigenen Route-Block (App.tsx:764) + `SHOW_ADMIN_NAV`, **kein BASES-Mitglied**
  → leuchtet heute keine Gruppe. Wandert in `UTILITY_BASES`.
- `/security/{secrets,email}` sind in `FIREWALL_BASES`, haben aber **keinen `NavEntry`**
  (nur Sidebar-Cross-Cuts, HierarchySidebar:395/403) → wandern zu `UTILITY_BASES`.
- **Kein Terminal-Eintrag:** es existiert keine `/terminal`-Route → S173 Nachtrag 4 (Terminal
  → PROJECTS) kann laut Mandat 2 (kein Nav-Eintrag ohne Seite) **nicht** gebaut werden.
  Als Lücke vermerkt, nicht erfunden.
- **Kein Settings-Eintrag:** keine Top-Level-`/settings`-Route; `nav.settings` ist nur das
  Label der Workspace-Berechtigung. `nav.workspaceSettings` (`/workspaces/settings`) bleibt
  projektbasiert → **bleibt in Projects**.

## Task-Tabelle WP1

| Nr | Task | Status |
|---|---|---|
| 1 | Operator-Entscheidungen Q1–Q4 aufnehmen | ✅ |
| 2 | `NavSubgroup`/`flattenSubgroups`-Modell in section-nav.ts | ✅ |
| 3 | 6 Hauptkategorien + BASES-Umverteilung (Scans→Projects, Dashboards/Builder/Secrets/Email/Admin→Utility, api-docs→Infra) | ✅ |
| 4 | HierarchySidebar-Mirror (Arrays + neue Reihenfolge + Utility-Sektion) | ✅ |
| 5 | i18n: `nav.infra` + `nav.utility` in **allen 60** Locales | ✅ |
| 6 | Tests: section-nav (9), HierarchySidebar (47) | ✅ |
| 7 | **WP1b:** MeshSquad — Q4 gegen den S153-Bestand abgeglichen + Breadcrumb-Fix | ✅ |
| 7b | **WP1b:** Sidebar-Sub-Block `MeshSquadCrewsBlock` (AI → Crews → Chat) + `?team=`-Deep-Link | ✅ (Operator antwortete **„Sidebar-Sub-Block"**) |
| 8 | Echter zwei-Ebenen-Header-Wrapper in der Sidebar (Haupt-Header über Platform+Observability / über die Projects-Cluster) | ⬜ offen — s.u. |

**Verifikation (3.10., ausgeführt auf podhead):**
- `npx vitest run src/components/sidebar/ src/lib/section-nav.test.ts` → **88 passed (8)**
- `npm test` (vitest + check:i18n) → **496 passed (61)**; `i18n validation passed for 60 locales, 3307 keys, 4017 literal t() calls`
- `npx eslint` auf die 4 geänderten Dateien → **0 neue** (1 vorbestehender `react-refresh/only-export-components` in HierarchySidebar.tsx:230 — `export function tf`, seit SPRINT-164, **vor** dieser Änderung in HEAD)
- `npx tsc --noEmit` → nur vorbestehende tsconfig-Konfigurationsfehler (TS6306/6310/5101/5107 composite + deprecations), **0 Fehler** in den geänderten Dateien

### WP1b — Q4 gegen den S153-Bestand (3.10.)

Q4 beschreibt großteils einen Zustand, den **SPRINT-153 bereits gebaut hat**
(`MeshSquadChatSpacePage.tsx`, 437 Z). Abgleich Punkt für Punkt:

| Q4-Aussage | Ist-Zustand (S153) | Status |
|---|---|---|
| "crew chat … bei AI" | `/chat/space` ist Route in der AI-Gruppe (S165), `MeshSquadChatEntry` in `AI_CHAT_ITEMS` | ✅ nach S182-Nav |
| "eigene Crews als Dropdown, dann der Chat" | `<select id="meshsquad-team-select">` aus echtem `GET {crewApiUrl}/teams` (plus spaces ohne Crew-Config), darunter die Kanalliste + Chat | ✅ |
| "der Chat kann oben auch den Hauptchannel wechseln" | `mode`-Toggle `team` ↔ `main` → `MESHSQUAD_ORG_WIDE_TEAM = 'org:main'`; der Org-Raum ist bewusst ein MODE, nie eine Pickeroption | ✅ |
| "immer default auch der Haupt-JiMesh-User-Chat" | `useState<SpaceMode>('team')` — Default ist die **aktive Crew** (`/teams`-`active`-Flag), Org-Channel ist jederzeit ein Klick entfernt | ⚠️ **umstritten, bewusst NICHT geändert** |

**Zur ⚠️-Zeile — warum nicht geändert:** *"da ist immer default auch der Haupt-…"*
ist **zwei lesbar**. (a) Default soll der Haupt-Channel sein → `useState('main')`;
(b) der Haupt-Channel soll immer **mit** da sein (neben dem Default) → erfüllt.
Gegen (a): der bestehende Test *„team mode: preselects the ACTIVE crew"*
behandelt `team` als bewussten Default, und in Q4 steht unmittelbar davor
*„da sollen die eigenen Crews Dropdowns haben und dann der Chat"* — wäre der
Org-Mode Default, stünde das Crew-Dropdown beim ersten Öffnen gar nicht im Bild.
**Ohne Operator-klärung wird der Default nicht verschoben** (eine Zeile, jederzeit
nachholbar) — Raten an einer sichtbaren UI-Entscheidung kostet mehr als das Warten.

**Gebaut — der eine echte Fehler:** der Seiten-Breadcrumb war **stale**. Er sagte
`Workspaces / MeshSquad Chat`, obwohl SPRINT-165 `/chat/space` von
`workspaceItems` in die AI-Gruppe verschoben hat (*„ai section wo proxy und
meshsquad reinkommt"*). Der Sektionsname wurde damals nie mitgenommen.
Fix: `nav.workspaces` → `nav.ai` (`MeshSquadChatSpacePage.tsx:164`), mit Kommentar.

**Offene Teilfrage — vom Operator beantwortet:** *„Unterkategorie/component bei
MeshSquad"* → Operator: **„Sidebar-Sub-Block"**. Gebaut als
`components/sidebar/MeshSquadCrewsBlock.tsx`, eingebaut in `HierarchySidebar.tsx`
**direkt vor** `<MeshSquadChatEntry />` (Q4-Reihenfolge: zuerst die Crews, dann
der Chat):

- **Sichtbar nur wenn installiert** — ohne `meshsquad`-Integration rendert der
  Block **gar nichts** (keine Platzhalter-Crew-Liste, das wäre erfundene Daten;
  die Install-Affordanz bleibt, unverändert, auf `MeshSquadChatEntry`).
- Chevron-togglebar (`aria-expanded`), **collapsed default** — die Sidebar wächst
  nicht von selbst um einen immer offenen Block.
- Zeilen kommen aus dem **echten `GET {crewApiUrl}/teams`** (`useMeshSquadTeams`);
  daneben **kein** erfundener Crew-Name. Fehlerfall → bestehender Key
  `meshsquadChat.teamsUnavailable` (mit `{error}`), leeres Feld → `noTeams`.
- `active`-Flag bekommt denselben Marker wie die Seite, damit beide
  Oberflächen dieselbe „aktive" Crew zeigen.
- Klick → `/chat/space?team=<name>`.

**URL-Brücke (war der eigentliche Grund, warum `teamName` in `useState` lag):**
`MeshSquadChatSpacePage` liest `?team=` nun über `useSearchParams`, das
Crew-`<select>` hält den Wert und schreibt ihn bei Wechsel mit
`replace: true` zurück — dadurch ist der Zurück-Button eine echte Spur und kein
stiller State-Overwrite. **Ohne Parameter gilt unverändert `defaultTeamName`**
(aktive Crew des Servers), also byte-identisch das Verhalten vor S182. Der URL
gewinnt bewusst **über** dem Server-Default, weil genau das der Zweck des Params
ist: „die Crew, die ich in der Sidebar angeklickt habe".

**i18n:** genau **ein** neuer Key `meshsquadChat.crewsLabel` = „Crews" (en+de
hand-written, Rest der 60 Locales ehrlicher en-Fallback) via
`scripts/add-sprint182-crews-i18n.mjs`. `noTeams`/`teamsUnavailable`/
`mainBadge` werden **wiederverwendet**, nicht verdoppelt.

**Verifikation (3.10., ausgeführt auf podhead):**
- `npm test` (vitest + check:i18n) → **540 passed (63)** (+9: 7 Crew-Block, 2
  Deep-Link); `i18n validation passed for 60 locales, 3309 keys` (+1)
- `npx vitest run src/components/sidebar/MeshSquadCrewsBlock.test.tsx` → **7 passed**
  (nicht installiert → nichts gerendert + kein Crew-Call; collapsed; echte
  `GET /teams`-Roster; Klick → `?team=`; active-Marker; 500er-Fehler → ehrlich,
  0 erfundene Rows; leeres Roster)
- `npx vitest run src/views/MeshSquadChatSpacePage.test.tsx` → **9 passed** (7 +
  2 neue Deep-Link-Verträge: `?team=coding` schlägt den Server-Default
  `active=marketing`, und das Ändern des Pickers schreibt `?team=` zurück)
- `npx eslint` auf die 6 geänderten Dateien → **1 error, 2 warnings, keiner von
  mir** (`react-refresh/only-export-components` HierarchySidebar.tsx:231 = der
  alte Z.230-Fehler nur um den neuen Import verschoben; 2× `exhaustive-deps` auf
  Z.96 `spaces` = dieselben wie HEAD Z.76, +20 Zeilen durch meinen State-Block)
- `npx tsc --noEmit` → **0 echte Typfehler** (nur Config-Level TS6305×338,
  TS6310×2, TS6306×2, TS5107, TS5101)
- Secret-Scan auf dem Diff → leer; `.env`/`config.yml` nicht angetastet


**Verbleibend, offen benannt (8):** Die Sidebar ist weiterhin **flach** — sie zeigt
Plattform/Observability als zwei benachbarte Sektionen, ohne gemeinsamen
"Infra"-Überkopf-Header, und die drei Projects-Sektionen (SSH targets /
Projects-Baum / Workspaces-more) stehen unter keinem gemeinsamen
"Projects"-Header. Die **Zuordnung** stimmt jetzt (gleiche Routen in
derselben Hauptkategorie wie die Navbar), die **sichtbare zweite Ebene** ist
aber noch nicht als Verschachtelung gebaut. Das braucht neues Layout und
eine visuelle Prüfung, die ich ohne Deployment nicht abnehmen kann —
bewusst als eigenen Task stehen gelassen, statt es ohne Gegenprobe zu bauen.


**Sequenz:** 2+3+5+6 zuerst (Navbar-Tabs stimmen danach, inkrementell testbar) → 4 (Sidebar-
Mirror) → 7 (Komponente).

---

# WP2 — Dashboard-Builder: st2-Grid

Blaupause: `/home/ji/projects/trading/st-2/frontend/leo-bot`.

## Das st2-Muster (übernommen)

- **Widget-Registry** (`config/widgetRegistry.js`): `WIDGET_REGISTRY` id → `{label, icon,
  category, grid:{w,h,minW,minH}, resizable}` + `WIDGET_CATEGORIES` + `getAvailableWidgets()`.
  **Ein Widget = ein Registry-Eintrag.**
- **Presets** (`config/dashboardPresets.js`): `DASHBOARD_PRESETS` mit `gridLayout`,
  Helper `g(id,x,y,w,h)` zieht `minW/minH` aus der Registry. 12 Spalten, `ROW_HEIGHT = 30`.
- **Edit-Mode** (`pages/AgentDashboard.jsx`): Toggle → `isDraggable/isResizable`,
  `static: !editMode`, `draggableHandle=".rgl-drag-handle"`, `compactType` nur im Edit vertikal,
  Grid-Overlay im Edit, `WIDTH_CYCLE = [3,4,6,8,12]` als Height/Width-Button, Preset-Auswahl
  beim Tab-Erstellen, `WidgetPickerSidebar` zum Hinzufügen. Layout-Persistenz pro Projekt.
- **Jedes Widget holt seine eigenen Daten** vom eigenen Endpoint.

## Responsive-Regeln (st2, verbatim übernommen)

```js
const COLS = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }
const ROW_HEIGHT = 30
breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
```

1. **sm/xs/xxs nie persistiert** — zur Laufzeit via `buildStackedLayout(widgetIds, COLS.sm)` aus
   den widgetIds **abgeleitet**: 1 Widget pro Zeile auf volle Containerbreite, `static` injiziert.
   Grund: "phones never show overlapping or w<minW-cropped tiles" / "phones never inherit a
   desktop drag".
2. **`hydrated`-Gate:** Grid mountet erst nach ResizeObserver-Messung + localStorage-Read →
   kein First-Load-Flicker (st2-Kommentar: Bug, den der Operator gesehen hat, "fixed itself"
   erst nach Preset-Wechsel, 2026-06-24).
3. **SSR-safety:** initial mit `DEFAULT_LAYOUT`, localStorage erst nach Mount (React #418
   Hydration-Mismatch).
4. `static: !editMode` wird **pro Breakpoint** injiziert, damit RGL Nicht-Edit-Items nie als
   beweglich behandelt.

## Jimesh-Bestand (WP2-Ausgangslage)

- `views/DashboardBuilderPage.tsx` — heutiges **Card-Modell** (`colSpan 1..12`, Add/Remove/
  Up/Down), **kein Grid** → wird ersetzt.
- `views/DashboardsPage.tsx` (S57) — Embed-Launcher, kein Grid.
- `lib/dashboard-presets.ts` (`CardId`, `DEFAULT_LAYOUT`), `lib/dashboards-api.ts`,
  `components/sidebar/DashboardsDropdown.tsx` — teilen das Card-Modell → **shared model
  bleibt**, nur die Darstellung wird Grid.
- Aufgabe: st2-Registry-Muster + **Grafana-Embed-Widget-Typ** (S57-Embeds als eigener Typ).

## Task-Tabelle WP2

| Nr | Task | Status |
|---|---|---|
| 1 | `lib/widget-registry.ts` (st2-Registry-Muster) | ✅ |
| 2 | `DashboardBuilderPage` von Card-Modell → `react-grid-layout` | ✅ |
| 3 | Responsive-Regeln 1–4 aus st2 übernehmen | ✅, als Tests gepinnt |
| 4 | Grafana-Embed-Widget-Typ (S57-Embeds) | ⛔ **gebrochen — Design-Konflikt, s. u.** |
| 5 | Presets + Picker + Edit-Toggle | ✅ (Presets = unveränderte Backend-Daten, Geometrie abgeleitet) |
| 6 | Tests / Playwright-E2E je Widget (st2-Muster) | ✅ Unit + DOM. **Playwright-E2E nicht möglich** — das Framework existiert im Repo nicht (nur ein Artefakt unter `docs_dev/research/`); kein neues Test-Framework in einem Frontend-Sprint eingeführt |

## Was gebaut wurde (3.10.)

**`src/frontend/src/lib/widget-registry.ts` (neu, 240 Z)** — `WIDGET_REGISTRY`
(CardId → `{titleKey, defaultTitle, icon, grid:{w,h,minW,minH}}`), die vier st2-Konstanten
(`DASH_COLS`, `DASH_ROW_HEIGHT = 30`, `DASH_BREAKPOINTS`, `DASH_MARGIN`), `STACKED_BREAKPOINTS`,
`STACK_HEIGHTS` + `buildStackedLayout`, `layoutFromCardIds`, `mergeLayout`, `dedupeLayout`,
`getAvailableWidgets`.

**`DashboardBuilderPage.tsx` (344 → ~470 Z)** — CSS-Grid + `colClass`-Switch und der
„drag & drop arrives with Phase 2"-Hinweis sind weg; stattdessen
`ResponsiveGridLayout` mit `dragConfig`/`resizeConfig` (react-grid-layout **v2**, der API-Stil
von `components/overview/OverviewGrid.tsx`, nicht st2s v1-Klassiker — Repo-Konvention vor
Kopie), Edit-Toggle in der Toolbar, `data-testid="builder-widget-<id>"` je Karte.

### Die zwei Speicher-Fakten (bewusst getrennt)

| Fakt | Speicher | Warum |
|---|---|---|
| **Welche** Karten, **in welcher Reihenfolge** | Backend-Zeile (`cardIds`, unverändertes Wire-Format) bzw. `jimesh.builderLayout` anonym | Ist die SPRINT-151-Verabredung; die Reihenfolge ist zugleich die Stapelreihenfolge für Handys (Regel 4) |
| **Wo** lg/md sitzen | `jimesh.builderGrid.<scope>` (neu, nur Client) | `dashboards.go` kennt kein Geometrie-Feld, und SPRINT-182 ist ein Frontend-Task — **nichts am Wire erfunden**, Geometrie ist eine Client-Angelegenheit mit eigenem Schlüssel |

Die beiden können sich nicht bekriegen: `edits` wird nur jemals auf frisch abgeleitete
Footprints **gemerged** (`mergeLayout`), also fällt eine Karte, die die Zeile verlässt, auch aus
der Geometrie, und eine neu hinzugekommene bekommt ein echtes Footprint statt einer stale
Position.

### Bewusste Abweichungen vom st2-Muster (mit Grund)

| st2 | jimesh | Grund |
|---|---|---|
| `category` + `WIDGET_CATEGORIES` (6 Domänen) | **entfällt** | st2 katalogisiert ~80 Widgets, jimesh hat **fünf** und ein flaches Dropdown. Eine Taxonomie, die nichts rendert, wäre tote Daten (Mandat 2) |
| `defaultHeight` px neben `grid.h` | **entfällt** | st2 braucht beide, weil Widgets auch außerhalb des Grids gerendert werden; hier ist `grid.h` die einzige Größen-Tatsache |
| `draggableHandle=".rgl-drag-handle"`, `isDraggable/isResizable`, `compactType` | `dragConfig`/`resizeConfig`, `compactor` | react-grid-layout **v2**-API (jimesh installiert ^2.2.4), Konvention von `OverviewGrid.tsx` |
| `WIDTH_CYCLE`/`HEIGHT_CYCLE`-Buttons | RGL-Resize-Handle (`se`) | die Zyklus-Buttons umgehen das, was der Resize-Handle nativ kann |
| `WidgetPickerSidebar` | bestehendes `DropdownMenu` | fünf Einträge brauchen keinen Sidebar-Drawer; UI nicht ohne Not verbreitert |
| Handgesetzte `DEFAULT_LAYOUT_MD` | aus `layoutFromCardIds(ids, 10)` abgeleitet | kein zweites, gepflegtes Layout-Schema pro Breakpoint; Operator kann `md` ziehen und es wird gespeichert |
| `hydrated`-Flag nach Mount-Read | **synchroner Read** + `measureBeforeMount`-Gate | st2 braucht den Mount-Read wegen Next.js SSR (React #418). **jimesh ist eine CSR-SPA (Vite), da gibt es keinen Hydration-Mismatch**; die Regel *zweck* (kein First-Paint-Flicker) wird durch synchron korrekte Geometrie + das Width-Gate erfüllt. Die dritte st2-Regel ist damit **erfüllt, nicht 1:1 kopiert** — hier dokumentiert, damit niemand sie für vergessen hält |

### Task 4 — Grafana-/Embed-Widget: Konflikt vom Operator aufgelöst

`src/backend/internal/gateway/embed.go:19` hält fest:

> **NO IFRAME, NO AGENT-BROWSER**: the JiMesh frontend never frames the third-party
> UI. The page IS the route — `/embed/{name}/*` serves the dashboard itself, same-origin,
> so Grafana's X-Frame-Options/DENY can never bite.

Als Frage an den Operator vorgelegt (die zwei aus dem Regeltext folgenden Alternativen:
Launcher-Widget vs. echtes `<iframe>`). **Operator-Antwort verbatim:**

> *"chromium oder halt über den proxy aber eigentlich wollten wir sachen nativ rendern
> oder wie ein browser halt"*

→ **kein `<iframe>`** (S57-Regel bleibt unberührt, weder gebrochen noch umgedeutet),
sondern **`ChromiumPluginRenderer` (SPRINT-159)**: ein *echter* Chromium rendert die
Dashboard-Oberfläche und streamt sie per WebRTC ins Widget. Das ist die dritte, von der
Regel gedeckte Variante, die vorher gar nicht im Lösungsraum stand — der Proxy-Weg
(`?token=` → Cookie → `/embed/*`) bleibt unverändert für den **vollflächigen**
Aufruf von `DashboardsPage` zuständig.

**Design (bewusst eng an bestehendem Code, nichts erfunden):**

| Punkt | Entscheidung | Warum |
|---|---|---|
| Woher die Dashboard-Liste | echtes `GET /api/embeds` (`JIMESH_EMBED_TARGETS`), dieselbe Quelle wie `DashboardsPage` | **Mandate 2** — das Widget erfindet kein Target |
| Render-Node | `SshTargetSelect` + `useSshEndpoints()`, exakt wie `AppRendererTab` | dort steht der Grund: *„Auto-deriving one target+node pair that is honestly correct for every app row is not a solved problem"* |
| `targetUrl` | mit dem **absoluten** `target.url` vorgefüllt, Operator editierbar | dieselbe Regel wie `AppRendererTab` (nur absolut = von der Node aus erreichbar) |
| Speicher | `jimesh.builderWidget.<scope>.<widgetId>` → `{ target, endpointId, targetUrl }` | Scope wie `jimesh.builderGrid.<scope>`; **nur IDs/URLs** |
| Secrets | **nie im Storage** — `sshPassword`/`sshKey` werden zur Laufzeit aus `useSshEndpoints()` + `withSecrets()` aufgelöst | Mandat: keine Secrets im Klartext persistieren |
| Start | **expliziter Klick**, kein Auto-Start | Öffnen eines Dashboards darf nicht ungefragt einen Chromium-Prozess auf einer Node spawnen |
| view vs. edit | editMode → Konfigurationsformular; viewMode → ehrlich „nicht konfiguriert" bzw. „Session starten" | kein irreführender Leerraum |

Nicht eingeplant (bewusst): `category`/`WIDGET_CATEGORIES` und ein `draggableHandle`
für das Widget — beides folgt der WP2-Abweichungstabelle oben (5+1 Widgets, flaches
Dropdown).

## Verifikation WP2 (3.10., ausgeführt auf podhead)

- `npx vitest run src/lib/widget-registry.test.ts` → **26 passed** (die vier Regeln als
  explizite Tests gepinnt: COLS/ROW_HEIGHT/breakpoints/Stapel-Breakpoints, plus Packen, Mergen,
  Deduplizieren, Picker)
- `npx vitest run src/views/DashboardBuilderPage.test.tsx` → **11 passed** (3 aus SPRINT-151
  **unverändert grün** + 8 neue Speicher-/Grid-Verträge)
- `npm test` (vitest + check:i18n) → **531 passed (62)**;
  `i18n validation passed for 60 locales, 3308 keys, 4018 literal t() calls`
  (3307 → 3308 = +2 Keys `builder.editLayout`/`builder.doneEditing`, −1 `builder.phase2Notice`)
- `npx eslint` auf alle geänderten Dateien → **1 error, 2 warnings — keiner von mir**:
  - error Z.166 = **identisch zu HEAD Z.134** (`setActiveCardIds(filterKnownCardIds(...))`
    in der SPRINT-151-Reseed-Effekt, ungeänderter Code, `react-hooks/set-state-in-effect`,
    eslint-plugin-react-hooks 7.1.1) — **vorbestehend**,
  - 2 warnings = `react-hooks/exhaustive-deps` auf `MeshSquadChatSpacePage.tsx:76`, vorbestehend
- `npx tsc --noEmit` → **0 echte Typfehler** (nur die bekannten Config-Level-Fehler
  TS6305/6306/6310/5101/5107)
- Secret-Scan auf dem Diff → leer; `.env`/`config.yml` nicht angetastet

### Zwei von den Tests gefundene echte Bugs (bevor sie grün waren)

1. **`useContainerWidth` misst nur, solange sich `mounted` ändert.** Bei `?dashboard=<id>`
   startet die Kartenliste leer (die Reseed lädt erst), der `containerRef`-Div hing also
   *nach* dem einzigen Effekt-Lauf an — es wurde nie gemessen, `mounted` blieb `false`, das
   Grid **hätte nie gerendert**. Fix: der Ref-Div umschließt auch den Empty-State, er existiert
   also ab dem ersten Commit. (`DashboardBuilderPage.tsx:423`)
2. **`readGeometry` erzeugte `{lg: undefined, md: undefined}`** statt `{}` — dadurch wurde ein
   unberührter Schlüssel bei jedem Laden mit Phantom-Keys neu geschrieben, und ein Round-Trip
   war nicht stabil. Fix: nur echte Arrays werden übernommen, der Rest bleibt **abwesend**.

**Bewusst nicht regressiert:** die SPRINT-151-Tests laufen **unverändert** weiter — der
Grid-Umbau hat weder das `?dashboard=`-Verhalten noch die „genau ein PUT, niemals
localStorage" Verabredung angerührt.

---

## Verifikation (Mandat: echter Befehl vor "fertig")

- `cd src/frontend && npx tsc --noEmit`
- `cd src/frontend && npx vitest run src/lib/section-nav.test.ts src/components/sidebar`
- `cd src/frontend && npx playwright test` (bei WP2-E2E)
- Kein Deploy von podhead; Redeploy-Commands nur nennen.

## WP3 — Terminal in Projects (Default Utility Container)

**Operator-Auftrag (Prompt 144166, 144961):**
> "terminal kommt in worpsces/projects rein obwohl das eigentlich acuh glbal ist aber ausnahmsweise machen wr das in projects rein obwohl man eigentlich da uach nen container auswählen darf aber wir lassen es da weil es imme by default im utility container das teminal deployed"

### Design

| Aspekt | Entscheidung | Grund |
|--------|--------------|-------|
| **Platzierung** | Sidebar unter **Projects** → "Terminal" | Operator: "in projects rein" |
| **Default Target** | Utility Container des Projekts | "immer by default im utility container das terminal deployed" |
| **Container Auswahl** | Dropdown im Terminal-Header (optional) | "eigentlich da uach nen container auswählen darf" |
| **Backend** | Bestehender `WorkspaceTerminal` (WebSocket + Docker exec) | Wiederverwendung, kein Neubau |
| **Route** | `/workspaces/projects/:id/terminal` | Konsistent mit Project-Detail |

### Implementation

**Route (`App.tsx`):**
```tsx
// Neue Route unter Projects
<Route path="/workspaces/projects/:projectId/terminal" element={<ProjectTerminal />} />
```

**Component (`views/ProjectTerminal.tsx`):**
```tsx
// Wiederverwendet WorkspaceTerminal (embedded Mode)
import { WorkspaceTerminal } from '@/components/terminal/WorkspaceTerminal';

export function ProjectTerminal({ projectId }: { projectId: string }) {
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => apiFetch(`/api/projects/${projectId}`),
  });
  
  // Default: Utility Container des Projekts
  const utilityContainerName = `utility-${projectId}`;
  
  return (
    <WorkspaceTerminal
      embedded={true}
      projectId={projectId}
      defaultContainer={utilityContainerName}
      // Container-Auswahl Dropdown im Header
      showContainerSelector={true}
      onContainerChange={handleContainerChange}
    />
  );
}
```

**Sidebar Integration (`HierarchySidebar.tsx`):**
```tsx
// Unter Projects-Sektion → Terminal Eintrag
{projectItems.map(project => (
  <>
    <ProjectRow project={project} />
    <TerminalLink projectId={project.id} />
  </>
))}
```

### Acceptance Criteria

| # | Kriterium | Verifikation |
|---|-----------|--------------|
| 1 | Terminal Tab unter Projects sichtbar | Sidebar → Project → "Terminal" Link |
| 2 | Default: Utility Container des Projekts | Terminal öffnet → `utility-{projectId}` |
| 3 | Container Dropdown funktioniert | Dropdown im Header → Container wechseln |
| 4 | WebSocket Terminal funktioniert | Docker exec WebSocket → Terminal rendert |
| 5 | Kein eigener Container | Kein neuer Container, nutzt Utility Container |

---

## WP4 — Container Overview Widget mit SSH Target

**Operator-Auftrag (Prompt 144961):**
> "also direkt im repo, aber wenn man im container/app fenster auf ein container klickt, hat man in de roverview seite des container s auch wieder das iwdget aber mit einem anderen ssh target im arg von dem component"

### Design

| Aspekt | Entscheidung |
|--------|--------------|
| **Platzierung** | Container Detail Page (`/workspaces/containers/:id`) |
| **Widget** | `ContainerOverviewWidget` (neu) |
| **SSH Target** | Dynamisch per Prop (`sshTarget` Prop) |
| **Wiederverwendung** | Bestehendes `ContainerOverviewWidget` / `ContainerOverviewPage` |
| **Datenquelle** | `GET /api/containers/:id/overview` + `GET /api/containers/:id/ssh-target` |

### Component Structure

```tsx
// components/containers/ContainerOverviewWidget.tsx
interface ContainerOverviewWidgetProps {
  containerId: string;
  sshTarget?: SSHTarget;  // Überschreibt Default
  embedded?: boolean;     // Für Dashboard Embedding
}

export function ContainerOverviewWidget({ 
  containerId, 
  sshTarget, 
  embedded = false 
}: ContainerOverviewWidgetProps) {
  const { data: overview } = useQuery({
    queryKey: ['container-overview', containerId],
    queryFn: () => apiFetch(`/api/containers/${containerId}/overview`),
  });
  
  const { data: sshTarget } = useQuery({
    queryKey: ['container-ssh-target', containerId],
    queryFn: () => apiFetch(`/api/containers/${containerId}/ssh-target`),
    enabled: !sshTarget, // Nur laden wenn nicht per Prop übergeben
  });
  
  const effectiveTarget = sshTarget || overview?.sshTarget;
  
  return (
    <ContainerOverviewPanel
      overview={overview}
      sshTarget={effectiveTarget}
      embedded={embedded}
      onTerminalClick={() => navigate(`/workspaces/containers/${containerId}/terminal`)}
      onLogsClick={() => navigate(`/workspaces/containers/${containerId}/logs`)}
    />
  );
}
```

### Integration Points

| Ort | Integration |
|-------------|-------------|
| **Container Detail Page** | `ContainerDetailPage.tsx` → `<ContainerOverviewWidget containerId={id} />` |
| **Dashboard Embed** | Dashboard Builder Widget → `<ContainerOverviewWidget containerId={id} embedded={true} />` |
| **App Panel Drawer** | `AppPanelDrawer` → Tab "Container" → `<ContainerOverviewWidget />` |
| **Project Detail** | Project Detail → Container Cards → Click → Overview Widget |

### Acceptance Criteria

| # | Kriterium | Verifikation |
|---|-----------|--------------|
| 1 | Widget rendert Container Overview | Container Detail Page → Overview Tab |
| 2 | SSH Target dynamisch per Prop | Prop `sshTarget` überschreibt Default |
| 3 | Funktioniert in Dashboard Embed | Dashboard Widget → zeigt Overview |
| 4 | Terminal Link funktioniert | Klick → `/workspaces/containers/:id/terminal` |
| 5 | Logs Link funktioniert | Klick → `/workspaces/containers/:id/logs` |

---

## Verifikation (Mandat: echter Befehl vor "fertig")

- `cd src/frontend && npx tsc --noEmit`
- `cd src/frontend && npx vitest run src/lib/section-nav.test.ts src/components/sidebar`
- `cd src/frontend && npx playwright test` (bei WP2-E2E)
- Kein Deploy von podhead; Redeploy-Commands nur nennen.

## Offene Punkte / Nicht in diesem Sprint

- S180-Reste: `jimesh-siem-falco` BPF-Crash (errno 7), S180-16 Secret-Rotation, S180-17
  `.env`-Abgleich, S180-21 Root-Git-Credential nicht automatisiert, S179-10 record-deploy.
- S150 Tab-Strip (baut auf S173 auf, bleibt "geplant").
- Scope-Modal+Tag-Chips (S173 Kern 5) — eigener Build.
- **WP3 Terminal in Projects** — oben definiert, noch nicht gebaut
- **WP4 Container Overview Widget** — oben definiert, noch nicht gebaut
