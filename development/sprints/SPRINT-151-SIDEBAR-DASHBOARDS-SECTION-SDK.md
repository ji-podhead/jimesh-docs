# SPRINT-151 — Sidebar-Dashboards-Sektion + Presets + `jimesh.dashboards`-SDK (Phase 3 aus SPRINT-149)

**Status:** ✅ Gebaut (Build-Agent, 28.9., Arbeitsbaum-Diff, kein Commit). Vollständiges Design in
`docs/sprints/SPRINT-149-UIUX-REDESIGN-NAVBAR-SIDEBAR.md`, Abschnitt 2 + 4.6 (SDK-Nachtrag). Build-Report
Abschnitt unten, mit Datei:Zeile-Belegen und Verifikationsergebnissen.

## Auftrag, verbatim (Operator, 28.9.)

> "wir erstellen in der sidebar einen neuen sidebar section mit dropdown für eigene dashboards mit
> einem default dashboard was man aber auch löschen kann doer später als default dashboard wieder
> aus den presets erstellen kann oder seine eigene presets benutzen kann."

Plus Nachtrag: Agents/Scripts müssen Dashboards genauso programmatisch verwalten können wie
Secrets heute (`jimesh.secrets.get()`-Muster, `internal/sdk/secrets`).

## Was zu tun ist

1. Backend: neue Dashboard/Preset-Tabelle (bisher nur `DashboardBuilderPage.tsx`'s Card/Preset-
   Modell im Frontend, keine eigene Persistenz — prüfen was wiederverwendbar ist).
2. `jimesh.dashboards`-Go-SDK-Package, exakt gespiegelt an `internal/sdk/secrets`/`internal/sdk/logger`
   (gleicher Env-/Bearer-/Scope-Vertrag).
3. Sidebar: neue Sektion mit Dropdown, Default-Dashboard (löschbar, aus Presets neu erstellbar),
   eigene Presets.

## Task-Tabelle

| Nr | Task | Status |
|---|---|---|
| S151-1 | Backend-Tabelle für Dashboards/Presets (Migration) | [x] gebaut |
| S151-2 | REST-Routen (GET/POST/DELETE Dashboards + Presets) | [x] gebaut |
| S151-3 | `jimesh.dashboards`-SDK-Package (Go, secrets/logger-Muster) | [x] gebaut |
| S151-4 | Sidebar-Dropdown-UI (Default+löschbar+Presets) | [x] gebaut |
| S151-5 | Tests + i18n | [x] gebaut |

---

## Build Report (Build-Agent, 28.9.2026, Arbeitsbaum-Diff, kein Commit)

### Kollisions-Hinweis (verifiziert vor Start UND während Verifikation)

`git status --short` vor Start zeigte nur `src/backend/datalaked`, `src/backend/threat-responder`,
`src/frontend/scripts/__pycache__` als fremde Untracked-Reste — kein Konflikt mit diesem Sprint. Während
der Verifikation (später am Abend) sind **parallel andere Agents aktiv geworden** und haben u.a.
`internal/gateway/threat_correlation.go`, `internal/gateway/threat_correlation_test.go`,
`internal/gateway/notifications.go`, `internal/notify/`, `ControlPlanesPage.tsx`, `ProjectDetailPage.tsx`
verändert — **keine dieser Dateien wurde von diesem Build angefasst** (bestätigt per `git diff --stat`
vor jedem Edit). Eine dieser fremden Änderungen (`threat_correlation_test.go`, Stand des letzten
Checks: `import "strings"` ungenutzt) blockiert aktuell `go vet ./...`/`go test ./...` für das GESAMTE
Modul, weil `internal/gateway` ein Test-Compile-Fehler hat — dieser Fehler ist NICHT in diesem Build
entstanden (siehe Verifikation unten: eine vollständige `go test ./...`-Runde VOR dieser fremden Änderung
war grün für `internal/gateway`, inkl. aller neuen Dashboards-Tests). Absichtlich nicht angefasst
(collision safety, "build additively").

### Backend

1. **`src/backend/internal/store/dashboards.go`** (neu) — `user_dashboards` +
   `user_dashboard_presets` Tabellen (`EnsureDashboardsTable`, Postgres, `?`→`$N` via `d.exec`), ID-Alphabet
   `dash-`/`dashp-` (16 Hex, `crypto/rand`, Muster von `newWorkspaceMemberID`), `created_at`/`updated_at`
   als BIGINT ms. `SystemDashboardPresets` (Go-Konstante, `default`/`security-focused`/`ops-focused`,
   Zeilen ~64-82) — Daten, kein Code, 1:1 gespiegelt in `lib/dashboard-presets.ts`. CRUD:
   `CreateDashboard`/`GetDashboard`/`ListDashboards`/`UpdateDashboard`/`ApplyDashboardPreset`/
   `DeleteDashboard` + `CreateDashboardPreset`/`GetDashboardPresetByNameOrID`/`ListDashboardPresets`/
   `DeleteDashboardPreset`. Genau EIN `is_default=true` pro Owner erzwungen
   (`clearDefaultDashboard`, Zeile ~229). Registriert in `store.go` migrate() (`_ = d.EnsureDashboardsTable()`,
   nach der `EnsureWorkspaceMembersTable()`-Zeile, SPRINT-145-Muster).
2. **`src/backend/internal/gateway/dashboards.go`** (neu) — Session-Routen:
   `GET/POST /api/dashboards`, `GET/PUT/DELETE /api/dashboards/{id}`,
   `POST /api/dashboards/{id}/apply-preset`, `GET/POST /api/dashboard-presets`,
   `DELETE /api/dashboard-presets/{id}`. Owner-Scoping über `dashboardOwnerID(r)` (Zeile ~58): Operator
   → literales `"operator"` (files.go's `vaultAccessor`-Präzedenzfall), Keycloak-Sub → `GetUserBySub` auf
   `users.id`, Fallback roher Sub (workspace_members.go Dual-Shape-Muster). Registriert via
   `s.registerDashboards(mux)` in `gateway.go` (nach `s.registerWorkspaceMembers(mux)`).
3. **`src/backend/internal/sdkdashboards/sdkdashboards.go`** (neu) — SDK-Surface:
   `GET/POST/DELETE /api/sdk/dashboards` (Query-Param `?id=`, Muster von `sdksecrets`),
   `POST /api/sdk/dashboards/{id}/apply-preset`. Owner-Pin: `ck.UserID` (die Minting-User des Consumer-Keys
   — der dashboards-Äquivalent zu `sdksecrets.resolveKV`'s `ck.ProjectID`-Pin, dokumentiert im Package-Doc).
   Registriert via `s.sdkdashboards.Register(mux)` in `gateway.go`.
4. **Auth-Wiring**: `internal/auth/consumer_key.go` — neuer `gateDashboardsKey` (Zeile ~197, akzeptiert
   `kind=service` ODER `kind=user`, kein Projekt-Zwang da Dashboards keine Projekt-Dimension haben) +
   `errNotDashboardsKey`. `internal/auth/auth.go` — neuer `/api/sdk/dashboards`-Zweig (HasPrefix, deckt auch
   `/apply-preset` ab) in der Middleware, exakt neben dem bestehenden `/api/sdk/secrets`-Zweig.
5. **`src/backend/internal/sdk/dashboards/dashboards.go`** (neu) — `jimesh.dashboards`-Go-SDK:
   `New()`/`NewWith()`, `List()`/`Get(id)`/`Create(name, cardIds, presetKey)`/`Delete(id)`/
   `ApplyPreset(id, presetKey)`, `APIError{Status,Message}` — 1:1 Struktur/Namenskonvention von
   `internal/sdk/secrets/secrets.go` (gleiche `JIMESH_SERVICE_KEY`/`JIMESH_GATEWAY_URL`-Env-Verträge,
   gleicher Bearer-Auth, gleicher `DefaultGatewayURL`).

### Frontend

6. **`src/frontend/src/lib/dashboard-presets.ts`** (neu) — `CardId`-Union + `DEFAULT_LAYOUT` +
   `DASHBOARD_PRESETS` (Daten, kein Code, spiegelt `SystemDashboardPresets` des Backends) +
   `filterKnownCardIds`, ausgelagert aus `DashboardBuilderPage.tsx` (SPRINT-149 §4.1: dessen
   Karten-Modell ist die Grundlage, keine zweite Erfindung).
7. **`src/frontend/src/lib/dashboards-api.ts`** (neu) — Frontend-Client für die Session-Routen
   (`listDashboards`/`getDashboard`/`createDashboard`/`updateDashboard`/`deleteDashboard`/
   `applyDashboardPreset`/`listDashboardPresets`/`createDashboardPreset`/`deleteDashboardPreset`), über
   `apiFetch` (bestehende Bearer-Session + Workspace-Scope-Maschinerie, keine zweite Auth).
8. **`src/frontend/src/components/sidebar/DashboardsDropdown.tsx`** (neu) — die Sidebar-Sektion: Popover-
   Dropdown (Muster `ActiveAppsDropdown.tsx`/`WorkspaceSwitcher.tsx`), zeigt aktives Dashboard, Liste mit
   Default-Badge + Lösch-Icon (Default löschbar, keine Sonderbehandlung — SPRINT-149 §4.4 #1), "+ Neues
   Dashboard…" (Inline-Namensfeld), "+ Aus Preset erstellen" (System- + eigene Presets), Leer-Zustand mit
   "Standard-Dashboard wiederherstellen"-Button (§4.4 #2/#3). Zeilen sind `<div role="button">`, NICHT
   verschachtelte `<button>` (HTML-Parser hebt verschachtelte Buttons aus dem DOM-Baum, bricht sowohl A11y
   als auch Tests).
9. **`src/frontend/src/components/sidebar/HierarchySidebar.tsx`** — neue Sektion direkt unter
   "Navigation" (Zeile ~1606ff, `<DashboardsDropdown />`), Import Zeile ~82.
10. **`src/frontend/src/views/DashboardBuilderPage.tsx`** — liest `?dashboard=<id>` (`useSearchParams`);
    mit ID: lädt echte Zeile via `getDashboard`, seedet `activeCardIds` daraus, speichert Edits via
    `updateDashboard` (PUT) zurück — NICHT localStorage. Ohne ID: unverändertes Alt-Verhalten
    (localStorage, `jimesh.builderLayout`), null Regression. Ein `justReseeded`-Ref verhindert einen
    überflüssigen No-Op-PUT direkt nach dem Laden; das reine `activeCardIds.length===0`-Gate wurde bewusst
    NICHT als "noch nicht geladen"-Signal verwendet, weil 0 Karten ein echter, speicherbarer Nutzerzustand
    ist (SPRINT-149 §4.4's Leer-Zustand-Philosophie gilt auch für die Karten einer Dashboard-Zeile, nicht
    nur für "0 Dashboards").

### i18n

11. Neue Keys `builder.loadingDashboard`, `builder.saveFailed` (bestehender Namespace) + kompletter neuer
    Namespace `dashboardsSidebar.*` (19 Keys: sectionTitle, triggerLabel, defaultBadge, newDashboard,
    namePlaceholder, create, fromPreset, deleteDashboard, deleteConfirm, empty, restoreDefault, loadError,
    createFailed, deleteFailed, created, deleted, presetDefault, presetSecurityFocused, presetOpsFocused)
    — in ALLEN 60 Locale-Dateien ergänzt (Englisch als Text bei den meisten Sprachen, echtes Deutsch bei
    `de.json` — gleiche Qualitätsstufe wie der bestehende `builder.*`-Namespace, der ebenfalls
    Englisch-Kopien in den meisten Nicht-EN-Locales trägt). `node scripts/check-i18n.mjs` bestätigt:
    "i18n validation passed for 60 locales and 3212 keys".

### Tests (real, keine Mocks — Mandate 2)

- **`internal/store/dashboards_test.go`** — `TestDashboardsStoreLifecycle`,
  `TestDashboardPresetsStoreLifecycle`: echte Postgres-Zeilen (Ensure-Idempotenz, Default-Exklusivität,
  Update/ApplyPreset/Delete, Fremd-Owner-Isolation, Preset-Namenskollision mit System-Presets).
- **`internal/gateway/dashboards_test.go`** — 6 Tests: Honest-Empty, Full-CRUD inkl. Fremd-Owner-404,
  Preset-Create ("Restore Default" ohne explizite cardIds), ApplyPreset, System+Custom-Presets, Validation
  (leere Felder, kein Identity-Header → 403).
- **`internal/sdk/dashboards/dashboards_test.go`** — echter `httptest.Server`, kein Mock-Transport:
  `New()` fail-fast ohne Key, Env-Defaults, List/Get/Create/Delete/ApplyPreset End-to-End, falscher Key →
  403 `*APIError`, Client-seitige Argumentvalidierung.
- **`src/frontend/src/components/sidebar/DashboardsDropdown.test.tsx`** — 5 Tests gegen echte Wire-Shapes
  (fetch-Mock auf HTTP-Ebene, kein Komponenten-Mock): Trigger zeigt echten Namen, Zeilen-Klick navigiert zu
  `/builder?dashboard=<id>`, Leer-Zustand → Restore-Default → Navigation, Default-Löschen ohne
  Sonderbehandlung, "Aus Preset erstellen"-Liste + Erstellung.
- **`src/frontend/src/views/DashboardBuilderPage.test.tsx`** — 3 Tests: kein `dashboard`-Param → altes
  Verhalten, echter Server-Call, kein Backend-Call; mit Param → lädt echte Zeile; Karte entfernen → GENAU
  EIN PUT mit den neuen cardIds, kein localStorage-Schreiben.

### Verifikation (Ergebnisse, mit Timestamp-Kontext)

- `make go-build` (Docker `golang:latest`, kein Host-Go) — **PASS**, keine Fehler.
- `make go-vet` — **PASS** für den gesamten Build-Umfang dieses Sprints (mehrfach verifiziert). Ein
  SPÄTERER `go vet ./...`-Lauf über das GESAMTE Modul schlägt fehl wegen einer fremden, parallel laufenden
  Änderung an `internal/gateway/threat_correlation_test.go` (ungenutzter `strings`-Import) — siehe
  Kollisions-Hinweis oben; isoliert geprüft: `go vet ./internal/store/... ./internal/sdkdashboards/...
  ./internal/sdk/dashboards/... ./internal/auth/...` — **PASS**, keine Fehler.
- `go test ./...` gegen eine ECHTE, isolierte Wegwerf-Postgres (ad-hoc `postgres:16`-Container + eigenes
  Docker-Netz, nichts an `jimesh-net`/`jimesh-postgres` angefasst, danach entfernt) — **PASS** für
  `internal/store` (1.330s), `internal/gateway` (1.313s, alle 6 Dashboards-Tests inklusive), `internal/sdk/
  dashboards` (0.011s). Die einzigen Fehlschläge im Gesamtlauf (`internal/ai`, `internal/service`) sind
  VORBESTEHEND und unabhängig von diesem Sprint — ihre Tests rufen `store.Open(dbFile)` mit einer lokalen
  Variable statt `os.Getenv("DATABASE_URL")` auf (verifiziert per grep, Zeile-Beleg:
  `internal/service/agents_test.go:19`, `internal/ai/provider_schema_test.go:107`).
- `gofmt -l` auf alle neuen/geänderten Go-Dateien dieses Builds — **PASS** (ein initialer
  Ausrichtungsfehler in `dashboards_test.go`'s Struct-Tags wurde mit `gofmt -w` korrigiert).
- `npx tsc -p tsconfig.app.json --noEmit` — Gesamtzahl Fehler VOR und NACH allen Edits identisch bei
  genau denselben 10 Stellen in `DashboardBuilderPage.tsx` (alle vorbestehende `t(key, fallbackString)`-
  Aufrufe außerhalb der von diesem Build geänderten Zeilen, nur verschobene Zeilennummern durch neue
  Imports/Hooks) — **0 neue Fehler**. Kein einziger Fehler in den 5 neuen Dateien dieses Builds
  (`dashboard-presets.ts`, `dashboards-api.ts`, `DashboardsDropdown.tsx`, `DashboardsDropdown.test.tsx`,
  `DashboardBuilderPage.test.tsx`) oder in `HierarchySidebar.tsx`.
- `npx vitest run` (voller Suite-Lauf) — **PASS**: 50 Testdateien, 433 Tests, inklusive aller neuen
  Dashboards-Tests UND aller 42 vorbestehenden `HierarchySidebar.test.tsx`-Tests (keine Regression durch
  die neue Sektion).
- `node scripts/check-i18n.mjs` — **PASS**: "i18n validation passed for 60 locales and 3212 keys".

### Bewusste Design-Entscheidungen (nicht im Auftrag explizit, aber notwendig)

- **Owner-Scope = `ck.UserID`** (nicht Projekt-Bindung wie bei Secrets): Dashboards sind persönlicher
  UI-Zustand, keine projekt-gebundene Ressource — `ConsumerKeyRow.UserID` ist für BEIDE `kind`-Werte
  (`service`+`user`) immer gesetzt (die Minting-User), also der ehrliche, immer verfügbare Scope-Anker.
- **PUT `/api/dashboards/{id}`** (Session-Route, nicht im SDK): notwendig, damit der Dashboard-Builder
  echte Edits an einer Backend-Zeile speichern kann — das SDK selbst hält sich exakt an die im
  SPRINT-149-Dokument aufgelisteten 5 Aufrufe (List/Get/Create/Delete/ApplyPreset), keine Erweiterung dort.
- **Keine Migration-Datei**: dieses Repo hat kein `migrations/`-Verzeichnis — Tabellen werden idempotent in
  `store.go`s `migrate()` via `Ensure*Table()`-Funktionen erstellt (SPRINT-145-Präzedenzfall,
  `workspace_members.go`), exakt fortgeführt.
