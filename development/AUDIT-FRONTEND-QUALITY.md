# Audit: Frontend-Code-Qualität — Overview / App-Detail / Security / RBAC

**Datum:** 2026-09-07 · **Umfang:** 12 gelistete Dateien (OverviewPage, AppDetailPage, SecurityFindingsPage, SecurityOverviewPage, BreadcrumbBar, OverviewGrid, ScopeSelectorModal, ContainerLogViewer, MeshBadge, team-bindings-panel, create-access-section, mesh-icons) + Domänen-Typen `types/domain/overview.ts`, `types/domain/hierarchy.ts`, `lib/global-scope.ts`
**Modus:** Nur Befunde — es wurde **kein Code verändert**.

---

## Executive Summary

Die auditierten Seiten und Komponenten sind im Kern **solide und mandatstreu gebaut**: Das No-Mock-Mandat wird konsequent umgesetzt (echte Store-/API-Quellen, deaktivierte Query mit bereitstehendem echtem Fetch, disabled Buttons mit ehrlichem Titel, derive-only Interfaces, ehrliche Empty-States). SecurityOverviewPage dokumentiert ihre Datenherkunft vorbildlich.

Dennoch gibt es **2 Befunde mit hohem Schweregrad**:

1. **SecurityFindingsPage fragt eine Backend-Route ab, die es nicht gibt** (`GET /api/security/findings`) — die Seite läuft damit permanent in ihren Fehler-/Leerzustand; ihr Dokumentationskommentar behauptet fälschlich, die Route existiere.
2. **`lib/mesh-icons.ts` ist typfehlerhaft** (2× TS2353): die Icon-Mapping-Tabelle driftet vom kanonischen `OverviewComponentType`/`AppType`-Union ab.

Dazu kommen mittlere Befunde bei i18n (`overview.empty` fehlt in **allen** 60 Locales und rendert ohne Fallback den rohen Key; SecurityFindingsPage hat **gar kein** i18n), React-Konventionen (setState-in-Effect im OverviewGrid, statisches Icon im MeshBadge) und eine systematische **Icon-Vokabular-Doppelung** — vier neue Komponenten pflegen eigene Icon-Maps statt die deklarierte Brücke `mesh-icons.ts` zu nutzen (deren eigener Header-Comment verbietet genau das).

**Statistik:** 19 Findings (2 × high, 7 × medium, 10 × info). Kein critical.

---

## Check 1 — TypeScript (`tsc --noEmit`)

**Verdict: FINDING** (3 Fehler in 2 der auditierten Dateien; alles Übrige pre-existing)

Der wie beauftragt ausgeführte Befehl `npx tsc --noEmit` scheitert bereits **an der Root-Toolchain-Konfiguration**, bevor eine Quelldatei geprüft wird: `tsconfig.json` referenziert `tsconfig.app.json`/`tsconfig.node.json` als Projects, diese haben aber kein `composite: true` und verbieten Emit → TS6305/TS6306/TS6310 (plus Deprecation-Fehler TS5101/TS5107). Das ist **pre-existing** und betrifft das ganze Repo. MANDATES.md §6 benennt deshalb den sanktionierten Check: `tsc --noEmit -p tsconfig.app.json` — dieser wurde zusätzlich ausgeführt.

Ergebnis `-p tsconfig.app.json`: **226 Fehler in 35 Dateien** (Exit 2). Davon in den **gelisteten Dateien genau 3**, in 33 Dateien pre-existing Noise (u. a. `FallbackPage.tsx` 32, `chain-mesh-graph.tsx` 108, fehlendes Modul `../../../shared/types` in `KeysPage.tsx`).

| # | Datei:Zeile | Fehler |
|---|---|---|
| 1 | `src/components/mesh/MeshBadge.tsx(30,70)` | TS2345: `t(badge.labelKey, badge.value)` — `string` ist kein `Record<string, string \| number>` (→ F-03) |
| 2 | `src/lib/mesh-icons.ts(37,3)` | TS2353: `plugin-installation` existiert nicht im `OverviewComponentType`-Union (→ F-02) |
| 3 | `src/lib/mesh-icons.ts(54,3)` | TS2353: `browser` existiert nicht im `AppType`-Union (→ F-02) |

Positiv: **keine** toten Imports in den auditierten Dateien (`noUnusedLocals`-Fehler TS6133 treten — anders als im Rest des Repos — in den auditierten Dateien nicht auf).

---

## Check 2 — i18n (`npm run check:i18n`)

**Verdict: FINDING**

`check:i18n` besteht (Exit 0: „passed for 60 locales and 2301 keys") — aber das Skript prüft **nur Locale-Parität** (en.json ↔ 59 weitere Dictionaries, Platzhalter-Typen), **nicht die Abdeckung Code → Locale**. Diese Lücke lässt echte Befunde durch:

- **F-05 (medium):** `overview.empty` fehlt in en.json — und damit in **allen** 60 Locales. `OverviewGrid.tsx:191` rendert `t('overview.empty')` **ohne Fallback**; der I18nProvider gibt bei fehlendem Key den rohen Key zurück (`I18nProvider.tsx:212`) → Nutzer sieht wörtlich `overview.empty`.
- **F-06 (medium):** `SecurityFindingsPage.tsx` nutzt **kein i18n** — sämtliche UI-Texte sind hartcodiertes Englisch: Titel/Beschreibung (79–80), `Refresh` (84), `No security findings…` (98), `Open (N)` (105), `Dismiss` (130), `Dismissed (N)` (141), `dismissed <date>` (149).
- **F-14 (info):** Zwei über `tf(...)` mit Inline-Fallback abgesicherte Keys sind nie in en.json registriert: `overview.breadcrumb.ariaLabel` (BreadcrumbBar.tsx:194), `scopeSelector.searchPlaceholder` (ScopeSelectorModal.tsx:208). Degradation ist gewollt („ships readable now"), aber der Key-Bestand und der Code klaffen auseinander — check:i18n kann das nicht sehen.
- **F-13 (info):** Es gibt **keine** `t('key','fallback')`-Signatur. `t` ist `t(key, vars?)` (`i18n/context.ts:7`). Der Fallback wird auf drei inkonsistente Weise emuliert: lokaler `tf`-Wrapper (in **zwei Kopien**: BreadcrumbBar.tsx:48–52, ScopeSelectorModal.tsx:62–66), bewusster Raw-Key-Rückfall, und im MeshBadge ein **typfehlerhafter** Missbrauch `t(key, value-as-vars)` (F-03).
- **F-19 (info):** OverviewPage hardcodet englische Count-Suffixes in Badge-Werten: ` ws` (37), ` projects` (58), ` apps` (79) — nicht übersetzbar.

Alle übrigen **130 von mir stichprobenartig geprüften Keys** der auditierten Dateien (appDetail.*, teams.*, createAccess.*, securityOverview.*, scopeSelector.*, common.*) existieren in en.json. ✅

---

## Check 3 — No-Mock-Mandat

**Verdict: OK** (kein Fake-Datenbestand; ein Dokumentations-Ehrlichkeitsproblem geht als F-01 ein)

Grep über alle 12 Dateien auf `dummy|mock|fake|sample|Beispiel|example.com|TODO|FIXME` — **jeder Treffer ist ein Kommentar, der das Mandat selbst zitiert**, kein Fake-Datum:

- `ContainerLogViewer.tsx`: Query `enabled: false` mit **echtem** `queryFn` (139–147) + TODO-Beleg, dass die Backend-Route fehlt; ehrlicher Leerzustand statt erfundener Log-Zeilen. Mustergültig.
- `team-bindings-panel.tsx`: echter GET-Stream (`/api/team-bindings?teamId=`, Route existiert: `gateway/team_bindings.go`); POST-Button bewusst `disabled` mit ehrlichem Titel (`teams.bindingsRouteMissing`, 218–229) — pretends nicht.
- `AppDetailPage.tsx`: Interfaces werden **nur aus echten App-/Deploy-Feldern** abgeleitet (96–109); Terminal-Connect zeigt ehrlich einen „folgt"-Toast (150–155).
- `create-access-section.tsx`: POST `/api/budgets` ist real (Route: `security/security.go:81`), inkl. Upsert-Schutz für `spentBudgetUSD` (169–199); ehrlicher Fehler-Toast statt Still-Schweigen (216–223).
- `SecurityOverviewPage.tsx`: aggregiert **echte** Routes (`/api/sdk/logs?type=audit` — `sdklogs/sdklogs.go:67`; `/api/security/events` — `security/security.go:53`; `/api/workspaces`; `/api/projects`) und dokumentiert die Live-Verifikation im Header.
- Keine Beispiel-Arrays, keine hash-basierten Zähler, keine erfundenen Status.

---

## Check 4 — React-Konventionen

**Verdict: FINDING** (1 Lint-klassifizierter Effect-Verstoß + Key-Hygiene-Infos; sonst sauber)

Geprüft: setState im Render/Effect-Loop, useQuery-Nutzung mit echten Pfaden, tote Imports, Listen-Keys.

- **F-04 (medium):** `OverviewGrid.tsx:183–185` — `useEffect(() => setLayout(prev => mergeLayout(derivedLayout, prev)), [derivedLayout])` → Lint-Fehler `react-hooks/set-state-in-effect` (cascading renders). Muster ist memoisiert und terminiert, aber es ist genau der Verstoß, den die neue react-hooks-Regel verbietet; die Merge-Semantik ließe sich ohne Effect lösen.
- **F-03/F-09:** MeshBadge erzeugt die Icon-Referenz im Render (`badgeKindIcon` → JSX `<Icon/>`) → Lint-Fehler `react-hooks/static-components` (MeshBadge.tsx:22/29). Faktisch stabil (Lookup-Tabelle), aber regelkonform zu fixen.
- **F-10 (info):** Listen-Keys: `OverviewGrid.tsx:124` Badge-Key mit `index`-Anteil (`kind:value:index`); `OverviewGrid.tsx:133–155` Link-Key = `link.to` (Kollision bei zwei Links aufs gleiche Ziel); `ContainerLogViewer.tsx:213` `key={index}` für Logzeilen (bei Filterwechsel verschieben sich Indizes). Alle rendern aktuell korrekt — Hygiene-Hinweis.
- **F-11 (info):** `ContainerLogViewer.tsx:139–147` — Query-Key `['container-logs', appId]` lässt `projectId`/`containerId` unberücksichtigt; nach Redeploy/Container-Swap dieselbe App → potenziell stale Zeilen (erst relevant, sobald `enabled` live geht).
- **F-17 (info):** `SecurityFindingsPage.tsx:54` invalidiert `security-findings-dismissed` — ein Key, den **keine** Query dieser/anderer Datei nutzt (Dead-Invalidation). Zudem nutzen SecurityFindings/SecurityOverview Inline-Literal-Keys statt der zentralen Registry `lib/query-keys.ts`.
- **F-18 (info):** `SecurityFindingsPage.tsx:58–64` — `open/dismissed`-Filter außerhalb `useMemo` (trivial, korrekt); `severityBadge` rendert `{sev}` ggf. `undefined` (leeres Badge-Label).

**Positiv verifiziert:** Kein setState im Render; alle `useQuery`-Pfade der auditierten Dateien sind echte Backend-Routes **mit einer Ausnahme (F-01)**; alle Imports benutzt; Routing real (`/overview` → OverviewPage, `/workspaces/apps/:appId` → AppDetailPage, `App.tsx:507/616`).

---

## Check 5 — mesh-icons-Konsistenz

**Verdict: FINDING** (Systematik: 4 Komponenten duplizieren das Icon-Vokabular; Typdrift in mesh-icons selbst)

`lib/mesh-icons.ts` deklariert sich selbst als DIE Brücke: *„eine Mapping-Tabelle statt verstreuter Icon-Imports — keine Komponente importiert Icons ad hoc"* (Zeile 13–15). Verifiziert dagegen:

- **F-02 (high):** `mesh-icons.ts` selbst driftet vom kanonischen Union ab: `COMPONENT_ICONS` enthält 7 Keys ohne `OverviewComponentType`-Mitgliedschaft (`plugin-installation` 37, `design-folder` 41, `design` 42, `design-session` 43, `container-logs` 44, `audit-logs` 45, `deployment-logs` 46); `APP_TYPE_ICONS` enthält `browser` (54) und `utility` (58) außerhalb des Operator-`AppType`. tsc meldet pro Objekt-Literal den **ersten** Excess-Key (TS2353 an 37 und 54) — die übrigen surfen erst auf, wenn der erste gefixt ist. Die Datei failt damit den Type-Check.
- **F-07 (medium):** Vier auditierte Komponenten pflegen **eigene, teils widersprüchliche** Icon-Maps statt die Brücke zu nutzen:
  - `AppDetailPage.tsx:63–68` `INTERFACE_ICONS`: code-server = **Code** — die Brücke (`mesh-icons.ts:65`) mappt code-server auf **Wrench**.
  - `BreadcrumbBar.tsx:55–60` `KIND_ICONS`: workspace = **Boxes** (Brücke: FolderOpen), app = **Container** (Brücke: Box).
  - `ScopeSelectorModal.tsx:144–176`: Server/Boxes/Folder ad hoc; für Apps `getAppIcon(app.type)` aus `lib/app-icons.ts` — dem **zweiten, legacy-keyed** Registry (website/api/service/tool/database). Operator-Typen (agent/ide/frontend/…) fallen dort pauschal auf **Bot** zurück, während `appTypeIcon` aus mesh-icons sie differenziert mappen würde.
  - `team-bindings-panel.tsx:54–78` `RESOURCE_BADGE`: ssh_target = **Terminal** (Brücke: Server), workspace = **Layers** (Brücke: FolderOpen), app = **Boxes** (Brücke: Box).
  - `ContainerLogViewer.tsx:178` nutzt `ScrollText`, obwohl `COMPONENT_ICONS['container-logs'] = Terminal` existiert (info); die Security-Seiten nutzen Aktions-Icons (RefreshCw/EyeOff) — legitim, kein Verstoß. `MeshBadge.tsx:22` nutzt `badgeKindIcon` korrekt ✅, `OverviewGrid` rendert Badges ikonlos (Text) — kein Verstoß.

---

## Check 6 — Lint (`npm run lint`)

**Verdict: FINDING** (6 Fehler in 3 der auditierten Dateien; Rest pre-existing Repo-Noise)

Repo-weit: **293 Probleme (277 errors, 16 warnings)**, Exit 1. Auf die **gelisteten Dateien entfallen genau 6 Fehler**:

| Datei | Stelle | Regel |
|---|---|---|
| `OverviewGrid.tsx` | 52:17 | `react-refresh/only-export-components` (Export `layoutFromComponents`) |
| `OverviewGrid.tsx` | 184:5 | `react-hooks/set-state-in-effect` (→ F-04) |
| `MeshBadge.tsx` | 29:8 | `react-hooks/static-components` (→ F-03) |
| `create-access-section.tsx` | 89:17, 122:17, 154:17 | `react-refresh/only-export-components` (Hook-/Helper-Exports) |

Keine andere auditierte Datei taucht im Lint-Log auf. Zur Einordnung: `only-export-components` feuert repo-weit ebenfalls an `media-models.tsx`, `model-table.tsx` etc. — die neuen Dateien folgen einem bestehenden (räumigen) Muster; es bleibt dennoch ein regelkonformer Befund an den neuen Dateien.

---

## FINDINGS-Tabelle

| ID | Severity | file:line | Beschreibung | Empfehlung |
|---|---|---|---|---|
| F-01 | **high** | `views/SecurityFindingsPage.tsx:12,42` | Haupt-Query ruft `GET /api/security/findings` — **diese Route existiert nicht** (Backend registriert nur `…/dismissed` und `…/dismiss`, `internal/security/security.go:59–60`; kein List-Handler in `findings.go`). Seite landet permanent im Fehler-/Leerzustand; Header-Kommentar behauptet fälschlich die Route. | Route implementieren **oder** Seite auf die echten Feed-Routes (`/api/sdk/logs?type=audit`, `/api/security/events`) wie der Notification-Bell stellen; Kommentar wahrheitsgemäß korrigieren; API_DOCS.md synchron halten. |
| F-02 | **high** | `lib/mesh-icons.ts:37,41–46,54,58` | Mapping-Tabelle driftet vom kanonischen Union ab (7 + 2 Keys außerhalb `OverviewComponentType`/`AppType`) → 2× TS2353, Datei failt tsc. | Unions erweitern (dokumentiert) oder Tabelle auf Union-Keys stutzen; danach `tsc -p tsconfig.app.json` grün für diese Datei. |
| F-03 | medium | `components/mesh/MeshBadge.tsx:22,29–30` | `t(badge.labelKey, badge.value)` übergibt `string` als `vars` → TS2345; zur Laufzeit rendern Template-Labels rohe `{platzhalter}`. `t` hat keinen Fallback-Parameter. | Zweites Argument entfernen bzw. `labelKey`-Semantik (Key vs. Wert) sauber trennen; statisches `<Icon/>`-Muster regelkonform lösen. |
| F-04 | medium | `components/overview/OverviewGrid.tsx:183–185` | `setLayout` synchron im Effect (Lint: set-state-in-effect) — cascading renders beim Layout-Re-Derive. | Merge ohne Effect ableiten (Render-Derivation via `componentsKey`). |
| F-05 | medium | `components/overview/OverviewGrid.tsx:191` | `t('overview.empty')` ohne Fallback; Key fehlt in en.json → **alle 60 Locales** rendern den rohen Key. | Key in en.json ergänzen (+ 59 Dictionaries, check:i18n zwingt Parität) oder `tf`-Fallback nutzen. |
| F-06 | medium | `views/SecurityFindingsPage.tsx:79–84,98,105,130,141,149` | Komplette Seite ohne i18n — alle UI-Texte hartcodiert englisch. | useI18n + `securityFindings.*`-Keys einführen (inkl. 60-Locale-Parität). |
| F-07 | medium | `views/AppDetailPage.tsx:63–68`; `components/overview/BreadcrumbBar.tsx:55–60`; `components/overview/ScopeSelectorModal.tsx:144–176`; `components/rbac/team-bindings-panel.tsx:54–78` | Vier Komponenten duplizieren/widersprechen dem Icon-Vokabular von `mesh-icons.ts`; zusätzlich zweite Legacy-Registry `lib/app-icons.ts` (Operator-Typen → pauschal Bot). Eigene Header-Regel von mesh-icons („keine ad-hoc-Icon-Imports") wird verletzt. | Icon-Mappings nach `mesh-icons.ts` konsolidieren; `lib/app-icons.ts` als Alias auf die Brücke führen oder entfernen. |
| F-08 | medium | `views/OverviewPage.tsx:103` | App-Karte: Link-Label `nav.workspaces` („Workspaces") zeigt auf `/workspaces/apps/:appId` — Label/Ziel-Mismatch. | Eigenen LabelKey (z. B. `overview.link.openApp`) einführen. |
| F-09 | medium | `components/overview/OverviewGrid.tsx:52`; `components/rbac/create-access-section.tsx:89,122,154`; `components/mesh/MeshBadge.tsx:29` | 6 Lint-Errors in neuen Dateien (only-export-components ×4, set-state-in-effect, static-components). | Exports in eigene `lib/*`-Dateien ziehen; F-03/F-04 fixen. |
| F-10 | info | `components/overview/OverviewGrid.tsx:124,133–155`; `components/apps/ContainerLogViewer.tsx:213` | Key-Hygiene: Index-Anteile im Badge-Key, `link.to` als Key (Kollisionsrisiko), `key={index}` für Logzeilen. | Stabile natural keys (fingerprint/row-id) oder Kombinations-Keys ohne Index. |
| F-11 | info | `components/apps/ContainerLogViewer.tsx:139–147` | Query-Key `['container-logs', appId]` ohne `projectId`/`containerId` → Cache-Staleness nach Container-Swap (erst bei `enabled: true` relevant). | Key um beide Ids erweitern, wenn die Route live geht. |
| F-12 | info | `views/AppDetailPage.tsx:162–167` | Session-Token als URL-Query (`?token=`) beim Tunnel-Connect → landet in Browser-History/Logs. Etabliertes Muster (ProjectsPage), aber security-relevant. | Mittelfristig Header-basiertes Tunnel-Auth oder kurzlebige Tickets. |
| F-13 | info | `i18n/context.ts:7`; `BreadcrumbBar.tsx:48–52`; `ScopeSelectorModal.tsx:62–66`; `MeshBadge.tsx:30` | Kein echtes `t(key, fallback)`: Fallback wird dreifach inkonsistent emuliert (2× duplizierter `tf`-Wrapper, Raw-Key-Rückfall, typfehlerhafter Missbrauch). | `t` um optionalen Fallback-Parameter erweitern und `tf`-Duplikate entfernen. |
| F-14 | info | `BreadcrumbBar.tsx:194`; `ScopeSelectorModal.tsx:208,96–103` | `tf`-Fallback-Keys nie in en.json registriert (`overview.breadcrumb.ariaLabel`, `scopeSelector.searchPlaceholder`); Modal reusemt fremde Keys (`sidebar.noProjects`, `wsApps.emptyTitle`) als Empty-Texts. | Keys registrieren bzw. dedizierte `scopeSelector.*`-Empty-Keys schaffen; check:i18n um Code→Locale-Abgleich erweitern. |
| F-15 | info | `components/rbac/create-access-section.tsx:50` | `DEFAULT_BUDGET_USD = 5.00` spiegelt das Backend-Default (rbac.go) im Frontend — Divergenz-Risiko bei Änderung. | Default vom Backend liefern lassen oder Beleg maschinenlesbar halten. |
| F-16 | info | `views/SecurityFindingsPage.tsx:29–35` vs. `lib/security-overview.ts` | Zwei Severity-Vokabulare im selben Tab: critical/high/medium/low/info vs. critical/warning/info; `SEVERITY_TONES` lokal statt `SEVERITY_BADGE_CLASS` wiederverwendet. | Ein Vokabular + eine Ton-Map; SecurityFindingsPage an `lib/security-overview` koppeln. |
| F-17 | info | `views/SecurityFindingsPage.tsx:54`; Query-Keys inline statt `lib/query-keys.ts` | Dead-Invalidation (`security-findings-dismissed` existiert in keiner Query); Inline-Literal-Keys neben zentraler Registry. | Registry nutzen, toten Invalidate entfernen. |
| F-18 | info | `views/SecurityFindingsPage.tsx:58–67` | Filter außerhalb `useMemo`; `severityBadge` rendert `{sev}` ggf. `undefined`. | Memoisieren; leeres Severity abfangen. |
| F-19 | info | `views/OverviewPage.tsx:37,58,79` | Count-Badges mit hartcodierten englischen Suffixes (` ws`, ` projects`, ` apps`) — nicht übersetzbar. | Schema-gerecht `labelKey` + reine `value`-Zahl trennen. |

---

## Anhang — exakt ausgeführte Befehle & Exit-Codes

| # | Befehl (cwd `src/frontend`) | Exit | Ergebnis (gekürzt) |
|---|---|---|---|
| 1 | `npx tsc --noEmit` | **1** | Scheitert an Root-tsconfig: TS6305 (dutzende), TS6306 ×2, TS6310 ×2, TS5101, TS5107 — Project-References ohne `composite`/`noEmit`-Konflikt. **Pre-existing Tooling-Problem, nicht die auditierten Dateien.** |
| 2 | `npx tsc --noEmit -p tsconfig.app.json` (per MANDATES §6 der sanktionierte Check) | **2** | 226 Fehler in 35 Dateien. In auditierten Dateien: `MeshBadge.tsx(30,70)` TS2345; `mesh-icons.ts(37,3)` + `(54,3)` TS2353. Rest pre-existing (`FallbackPage.tsx` 32, `chain-mesh-graph.tsx` 108, `KeysPage.tsx` fehlendes Modul `../../../shared/types`, …). |
| 3 | `npm run check:i18n` | **0** | „i18n validation passed for 60 locales and 2301 keys". Skript prüft nur Locale-Parität, nicht Code→Locale-Abdeckung (→ F-05/F-14 entgleiten ihm). |
| 4 | `npm run lint` | **1** | 293 Probleme (277 errors, 16 warnings). Auditierte Dateien: 6 Fehler (OverviewGrid ×2, MeshBadge ×1, create-access-section ×3); alles Übrige pre-existing. |
| 5 | Manueller Key-Abgleich Code → `en.json` (130 Keys der auditierten Dateien) | — | 3 fehlen: `overview.empty`, `overview.breadcrumb.ariaLabel`, `scopeSelector.searchPlaceholder` |
| 6 | Grep No-Mock-Marker über die 12 Dateien | — | Nur Kommentar-Treffer; keine Fake-Daten |
| 7 | Grep Backend (`src/backend/internal/…`) nach `api/security/findings`, `api/security/events`, `api/sdk/logs`, `api/team-bindings`, `api/budgets`, `api/users` | — | `/api/security/findings` **nicht registriert**; alle übrigen von den Seiten genutzten Routes existieren. |
| 8 | Routing-Verifikation `src/App.tsx` | — | `/overview` (507), `/workspaces/apps/:appId` (616) vorhanden. |

**Dateien gelesen (Pflichtlektüre):** MANDATES.md, alle 12 gelisteten Quelltexte, `types/domain/overview.ts`, `types/domain/hierarchy.ts`, `lib/global-scope.ts`, `i18n/context.ts`, `i18n/I18nProvider.tsx`, `lib/app-icons.ts`, `scripts/check-i18n.mjs`, Backend-Evidenz (`security/security.go`, `security/findings.go`, `gateway/team_bindings.go`, `sdklogs/sdklogs.go`).
