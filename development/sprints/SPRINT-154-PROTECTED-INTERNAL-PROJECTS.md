# SPRINT-154 — Protected/Internal-Projects + Hide-Internal-Sidebar-Setting

**Status:** gebaut und verifiziert (Build-Runde 1.10.2026). Der Agent selbst hat
NICHT committet (Regel eingehalten); der Parent hat das Paket während der
Session gesichert: cbcc942 (alle S154-Dateien, unverändert bis auf eine
gofmt-Kosmetikzeile in ae1e3f3 an project_internal_test.go), die Frontend-Tests
in f6241c4. BUILD-Report:
/home/ji/projects/ihc24/BUILD-2026-10-01-SPRINT-154-PROTECTED-INTERNAL-PROJECTS.md

**Operator-Demand (verbatim):** "The backend has NO concept of 'protected' or
'internal' projects — any project can be deleted like a normal user project,
including platform-internal ones. The operator wants: (a) a protection flag so
certain projects cannot be deleted, (b) a UI setting to hide/show internal
projects in the sidebar."

## Vorgeschichte (ehrlich dokumentiert, nicht versteckt)

Eine frühere SPRINT-154-Runde (28./29.9.) hatte den STORE-Layer bereits
gebaut und als Teil der Sammel-Commits ea45aa2/bcf70bd committet: die
`is_internal`-Spalte (migrate + CREATE TABLE), `ProjectRow.IsInternal`,
`SetProjectInternal`(), `ErrProjectInternal` + den Refuse in
`DeleteProject`(), den Handler-Vorcheck in
`handleProjectDelete` (damals mit **403**) und die
`settings.hideInternalProjects(+Help)`-i18n-Keys in allen 60 Locales —
aber: KEINE Route zum Togglen, KEIN Seed für das bekannte platform-internal-
Projekt, KEIN Frontend-Code, der die Keys benutzt, KEINE Sprint-Datei (daher
diese hier), KEINE API_DOCS-Einträge. Diese Runde schloss genau diese Lücken
und normalisierte den Refuse auf den geforderten **409**.

## Plan (Mandat 1.4 — Plan before Code)

**Ziel:** (a) `is_internal` schützt ein Projekt vor dem Delete — hart,
409, kein `?force=`; (b) der Operator kann internal-Projekte in der
Sidebar aus-/einzublenden (Default: sichtbar), localStorage-only.

**Arbeitspakete:**
1. BACKEND: 403→409 im Delete-Handler; `isInternal` in
   `projectRowJSON` (Wire-Flag fürs Frontend).
2. BACKEND: `PATCH /api/projects/{id}/internal` — Admin-only-Toggle
   (Handler in internal/gateway/project_internal.go, Registrierungszeile für
   gateway.go in den REPORT, da gateway.go parallelen Agents gehört).
3. SEED: `platform-internal` (Name "JiMesh Platform (internal)") als
   `is_internal = 1` — idempotente migrate()-Zeile, in den REPORT
   (store.go ist für diesen Agenten tabu).
4. FRONTEND: ehrlicher Internal-State im Delete-Dialog + 409-Toast in
   ProjectDetailPage; Sidebar-Augen-Toggle (localStorage
   `jimesh.sidebar-hide-internal-projects`) + Tree-Filter + Scope-Picker-
   Filter + ehrlicher "alles versteckt"-Hinweis.
5. i18n: 5 neue Keys, en+de handgeschrieben, 58 Locales en-Fallback (Präzedenz
   SPRINT-152-Skript), check:i18n PASS.
6. Tests: Backend-409-Handlertest + PATCH-Handler-Test (echter ServeMux) +
   Vitest für Dialog- und Toggle-Verhalten.
7. DOCS: API_DOCS.md, diese Sprint-Datei, BACKLOG-Spiegel, BUILD-Report.

**Abnahme-Kriterien:** Delete auf is_internal=true → 409 mit error.type
"project_internal", Zeile überlebt; Unmark → Delete geht wieder; Patch nur für
Admins; Dialog zeigt den ehrlichen Zustand statt einer garantiert scheiternden
Bestätigung; Toggle persistiert über Reloads; tsc-Baseline und check:i18n
verschlechtern sich nicht; go build/vet/test grün.

## Was tatsächlich gebaut wurde (gegen den Code verifiziert)

| Nr | Baustein | Datei(en) | Status |
|---|---|---|---|
| S154-1 | Refuse 403→409 (+ Hinweis auf die Unmark-Route in der Message, beide Refuse-Zweige: Vorcheck + Belt-and-suspenders-Race) | internal/deploy/projects_ssh.go | [x] |
| S154-2 | `isInternal` in der GET/POST-/api/projects-Wire-Row (projectRowJSON) | internal/deploy/projects_ssh.go | [x] |
| S154-3 | PATCH-Handler `handleProjectInternalToggle`: PATCH-only, fail-closed Admin-Gate (isAdminRequest), Pflicht-Boolean (fehlendes Feld = 400, nie still "true"), 404 bei unbekanntem Projekt, Antwort mit re-read-Zustand aus PostgreSQL | internal/gateway/project_internal.go (NEU) | [x] |
| S154-4 | Tests: `TestProjectDeleteInternalRefused409` (409 + error.type + Zeile überlebt + store.ErrProjectInternal + Unmark→Delete 200), `TestProjectDeleteMethodDispatch`, `TestHandleProjectInternalToggleValidation` (405/403/400 ohne DB), `TestProjectInternalToggleEndToEnd` (echter mux: deploy.Register + die Report-Zeile; Mark→Delete 409→Unmark→Delete 200; 404) | internal/deploy/project_internal_delete_test.go, internal/gateway/project_internal_test.go (beide NEU) | [x] |
| S154-5 | Delete-Dialog: ehrlicher Internal-State (Schloss-Icon,projects.deleteInternalState/Hint), Purge-Checkbox weg, destructiver Button disabled | src/components/projects/DeleteProjectDialog.tsx | [x] |
| S154-6 | ProjectDetailPage: isInternal durchgereicht (toDeleteDialogProject), 409→eigener ehrlicher Toast (projects.deleteInternalBlocked), 403 bleibt policy-Gate | src/views/ProjectDetailPage.tsx | [x] |
| S154-7 | Typ: `isInternal?: boolean` auf dem DeleteDialog-Project (DeploymentsDialog.tsx) | src/components/projects/DeploymentsDialog.tsx | [x] |
| S154-8 | Sidebar: Augen-Toggle im PROJECTS-Header (aria-pressed, zweizeiliger Titel mit dem Settings-Helptext), localStorage `jimesh.sidebar-hide-internal-projects` (Default: anzeigen), Tree-Filter mit Ausnahme für das aktuell offene Projekt (/projects/{id} + Legacy-Route), Scope-Picker-Filter, ehrlicher "hidden by your preference"-Zustand statt einer "keine Projekte"-Lüge | src/components/sidebar/HierarchySidebar.tsx (Filter-only-Eingriffe: Lucide-Importe, Schlüssel+Helper, SectionHeader-extraAction-Slot, ScopePopoverBody-Filter, State-Block, visibleProjects, PROJECTS-Sektion) | [x] |
| S154-9 | i18n: projects.deleteInternal{State,Hint,Blocked} + sidebar.internalHidden{Notice,Show}; en+de handgeschrieben, 58×en-Fallback; check:i18n PASS (60 Locales; S154-Keys in den 3286er-Stand, finaler Baum inkl. der parallelen S157-Keys: 3288) | alle 60 locales + scripts/add-sprint154-internal-projects-i18n.mjs (NEU, Präzedenz SPRINT-152) | [x] |
| S154-10 | Vitest: DeleteProjectDialog.internal.test.tsx (2: ehrlicher Zustand + kein Regress), HierarchySidebar.internal-projects.test.tsx (6: Default zeigt, Klick versteht+persistiert, Zweitklick, Persistenz beim Reload, offenes Projekt bleibt sichtbar, alles-versteckt-Hinweis) | beide NEU, 8/8 grün | [x] |
| S154-11 | DOCS: API_DOCS.md (GET-Row isInternal, DELETE-Row 409, neue PATCH-Row), diese Datei, BACKLOG-Spiegel | docs/API_DOCS.md, docs/backlog/BACKLOG.md | [x] |
| S154-12 | gateway.go-Registrierungszeile + store.go migrate()/Seed-Zeilen | NICHT im Tree — zuständige Dateien gehören anderen Agents; exakte Zeilen im BUILD-Report | [~] wartet auf Operator |

## Operator anzuwendende Zeilen (nicht im Tree, Absicht — siehe S154-12)

1. **gateway.go** (in `New()` nahe der anderen Projekt-/Workspace-Routen):

   `mux.HandleFunc("PATCH /api/projects/{id}/internal", s.handleProjectInternalToggle) // SPRINT-154`

   Gewinnt gegen deploy.Registers methodless `/api/projects/{id}` (Go-1.22-
   ServeMux-Precedence — bewiesen durch TestProjectInternalToggleEndToEnd).

2. **store.go migrate()** (direkt nach dem is_internal-ALTER, ~Zeile 319):

   `_, _ = d.exec("UPDATE projects SET is_internal = 1 WHERE id = 'platform-internal'")`

   Idempotent, markiert NUR die eine bekannte Zeile wenn sie existiert — kein
   Mock-Row-Anlegen (Mandat 2), keine stille Umklassifizierung anderer Rows.

## Ehrliche Lücken (nicht versteckt)

- Die PATCH-Route ist bis zur angewendeten Registrierungszeile UNERREICHBAR
  (Handler + Tests existieren, bauen und laufen — aber keine Live-Route ohne
  die gateway.go-Zeile).
- Der Seed (S154-12, Zeile 2) markiert platform-internal erst nach dem
  nächsten Backend-Start mit angewendeter store.go-Zeile.
- RM35-Admin-Audit: die Middleware schreibt nur OPA-gegate Admin-Mutationen;
  der handler-seitig geatete Toggle erscheint dort noch nicht. Follow-up:
  isAdminProjectInternalMutation in policy.IsAdminMutation aufnehmen.
- Der store.go-Kommentar an ErrProjectInternal sagt noch "honest 403" (store.go
  war tabu) — bei der nächsten store.go-Gelegenheit auf 409 korrigieren.
- UI zum Togglen des Flags (Admin-Oberfläche) ist bewusst NICHT gebaut: der
  Demand verlangte Dialog-Zustand + Sidebar-Setting; der Flag ist Admin-only-
  API-Oberfläche.
- Die während der Build-Runde rot liegenden 4 Tests in HierarchySidebar.test.tsx
  (Security/Events/Realtime-Monitor) stammten aus der PARALLELEN SPRINT-157-Arbeit
  (Sektionen-Umbau) — nicht aus SPRINT-154-Änderungen; die S157-Fix-Welle
  (Commit ae1e3f3, "Sidebar 69/69") hat sie grün gemacht. Nachträglich
  verifiziert: Sibling-Suite 44/44 + meine 8 S154-Tests = 52/52 grün.

## Verifikation (alle Befehle wirklich gelaufen, 1.10.2026)

- `docker run --rm -v .../src/backend:/app -w /app golang:latest go build ./internal/... ./cmd/...` → exit 0
- `... go vet ./internal/... ./cmd/...` → exit 0
- `gofmt -l` auf allen berührten Go-Dateien → leer (nach gofmt -w der
  beiden formatierungsbedürftigen)
- `go test ./internal/deploy/ ./internal/gateway/ ./internal/store/` gegen eine
  WEGWERF-Postgres (postgres:16-alpine, eigenes Netzwerk, exakt das make-go-test-Muster,
  nie die echte DB berührt) → alle ok; die drei S154-Testfälle explizit grün
  (eine Cold-Start-Runde des frischen Containers fiel einmal aus, 3×-Stabilitätslauf grün)
- `npm run check:i18n` → PASS, 60 Locales; finaler Baum 3288 Keys (S154-Anteil stand bei 3286, S157 fügte parallel 2 hinzu)
- `npx tsc --noEmit -p tsconfig.app.json | grep -c 'error TS'` → 473–477
  (Baseline ~472; Deltas aus den parallelen uncommitted Edits anderer Agents —
  in den von SPRINT-154 berührten Dateien: 0 Fehler)
- `npx vitest run` auf den beiden neuen Testdateien → 8/8 grün;
  NewProjectDialog + __probe grün; die 4 roten HierarchySidebar-Tests sind
  S157-Kollateral (siehe oben)

## Nachverifikation nach den Parent-Commits (cbcc942/ae1e3f3/f6241c4)

Der finale Baum (HEAD b0a9e7d, inkl. der committeten S154-Sicherung und der
S155/S158-Paralleledits) wurde erneut gegen die S154-Fläche geprüft:
`go build`/`go vet` via docker golang → exit 0;
Vitest-Regression Sibling-Suite (44) + meine 8 = **52/52 grün**;
`check:i18n` PASS 60 Locales / 3288 Keys. Meine Dateien liegen
inhaltlich unverändert in HEAD (einzig eine gofmt-Kosmetikzeile an
project_internal_test.go, ae1e3f3).

**Noch offen (nur Operator):** die gateway.go-Registrierungszeile + die
store.go-Seed-Zeile aus dem Abschnitt oben anwenden, dann `make up` /
`make restart-backend` und die beiden curl-Smoke-Tests aus dem
BUILD-Report drehen — bis dahin ist die PATCH-Route nicht live und
platform-internal ungeschützt.
