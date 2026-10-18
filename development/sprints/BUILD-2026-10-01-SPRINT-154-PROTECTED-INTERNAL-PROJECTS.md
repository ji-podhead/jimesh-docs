# BUILD-Report — SPRINT-154: Protected/Internal-Projects + Hide-Internal-Sidebar-Setting

**Datum:** 1.10.2026 · **Repo:** /home/ji/projects/jimesh · **Commit-Status:**
Der Agent hat selbst NICHT committet (Regel eingehalten). Der Parent hat das
fertige S154-Paket während der Session gesichert — cbcc942 (Backend-Handler,
409, beide Backend-Tests, Dialog, Typ, Sidebar-Filter, i18n-Keys, i18n-Skript),
f6241c4 (beide Frontend-Testdateien), ae1e3f3 (nur eine gofmt-Kosmetikzeile an
project_internal_test.go). Working Tree ist danach sauber.
Sprint-Datei: docs/sprints/SPRINT-154-PROTECTED-INTERNAL-PROJECTS.md ·
Backlog-Spiegel: S154 oben in docs/backlog/BACKLOG.md.

**Operator-Demand:** (a) Schutz-Flag, damit bestimmte Projekte nicht gelöscht
werden können; (b) Sidebar-Setting zum Aus-/Einblenden interner Projekte.

## ⚠️ Erst lesen: 3 Zeilen, die NUR DU anwendest (Dateien anderer Agents)

Dieser Agent durfte gateway.go und store.go NICHT anfassen. Der Handler und der
Seed existieren und sind getestet — die folgenden Zeilen machen sie live:

**1. gateway.go** — in `New()` neben die anderen Projekt-/Workspace-Routen:

    mux.HandleFunc("PATCH /api/projects/{id}/internal", s.handleProjectInternalToggle) // SPRINT-154

Gewinnt gegen deploy.Registers methodless `/api/projects/{id}` (Go-1.22-
ServeMux-Precedence; bewiesen durch TestProjectInternalToggleEndToEnd, der genau
diese Topologie aufbaut). Handler: internal/gateway/project_internal.go.

**2. store.go, migrate()** — direkt nach dem `is_internal`-ALTER (~Zeile 319),
damit das bekannte platform-interne Projekt beim nächsten Start geschützt ist:

    // SPRINT-154: das bekannte platform-interne Projekt markieren — idempotent,
    // nur die eine Zeile wenn sie existiert (kein Mock-Row-Anlegen, Mandat 2).
    _, _ = d.exec("UPDATE projects SET is_internal = 1 WHERE id = 'platform-internal'")

**3. Korrektur bei Gelegenheit (store.go-Kommentar)**: der Kommentar an
`ErrProjectInternal` (~Zeile 1961) sagt noch "honest 403" — der Handler
antwortet jetzt 409. Ein Wort nachziehen, wenn du eh in store.go bist.

## Was vorgefunden wurde (ehrlich)

Eine frühere SPRINT-154-Runde hatte den Store-Layer committet (Sammel-Commit
ea45aa2): is_internal-Spalte, ProjectRow.IsInternal, SetProjectInternal(),
ErrProjectInternal + DeleteProject-Refuse, Handler-Vorcheck (damals **403**) und
die settings.hideInternalProjects-i18n-Keys (60 Locales) — aber keine Route,
keinen Seed, kein Frontend, keine Sprint-Datei, keine Docs. Diese Runde schloss
alle Lücken und stellte den geforderten **409** her.

## Geänderte Dateien (vollständig — sonst nichts)

**Backend:**
- src/backend/internal/deploy/projects_ssh.go — Delete-Handler: Refuse 403→409
  (beide Zweige: Vorcheck + Belt-and-suspenders-Race), Message nennt jetzt die
  Unmark-Route; `isInternal` in projectRowJSON (GET/POST-Wire-Row);
  gofmt-Ausrichtung desselben Literals.
- src/backend/internal/gateway/project_internal.go — NEU: PATCH-Handler (PATCH-only,
  fail-closed Admin-Gate via isAdminRequest, Pflicht-Boolean — fehlendes Feld =
  400, nie still "true" —, 404 ehrlich, Antwort mit re-read-Zustand).
- src/backend/internal/gateway/project_internal_test.go — NEU: Validation-Zweige
  (405/403/400, ohne DB) + End-to-End auf dem ECHTEN mux (deploy.Register +
  die Report-Zeile: Mark→DELETE 409→Unmark→DELETE 200; 404).
- src/backend/internal/deploy/project_internal_delete_test.go — NEU: 409-Vertrag
  (error.type "project_internal", Message nennt die Unmark-Route, Zeile überlebt,
  store.ErrProjectInternal defense-in-depth, Unmark→Delete 200) + 405-Dispatch.

**Frontend:**
- src/frontend/src/components/projects/DeleteProjectDialog.tsx — ehrlicher
  Internal-Zustand (Lock-Icon + deleteInternalState/Hint statt Delete-Warnung,
  Purge-Checkbox weg, destructiver Button disabled).
- src/frontend/src/components/projects/DeploymentsDialog.tsx — Typ: isInternal?: boolean.
- src/frontend/src/views/ProjectDetailPage.tsx — Delete-Dialog-Sektion: isInternal
  durchgereicht; onError: 409→eigener Toast (deleteInternalBlocked), 403 bleibt
  Policy-Gate.
- src/frontend/src/components/sidebar/HierarchySidebar.tsx — NUR Internal-Filter:
  Lucide-Importe (Eye/EyeOff), localStorage-Schlüssel + Helper, SectionHeader-
  extraAction-Slot (generisch, alle anderen Sektionen unverändert), ScopePopover-
  Picker-Filter, State/Persist-Block, visibleProjects-Filter (offenes Projekt
  /projects/{id} bleibt sichtbar), Augen-Toggle im PROJECTS-Header (aria-pressed,
  Titel = Label + Hilfetext), ehrlicher "von deiner Einstellung versteckt"-
  Zustand statt der "keine Projekte"-Lüge.
- src/frontend/src/i18n/locales/*.json — 60 Dateien × 5 neue Keys
  (projects.deleteInternal{State,Hint,Blocked}, sidebar.internalHidden{Notice,Show});
  en+de handgeschrieben, 58× en-Fallback (Präzedenz SPRINT-152-Skript).
- src/frontend/scripts/add-sprint154-internal-projects-i18n.mjs — NEU (Propagierung).
- src/frontend/src/components/projects/DeleteProjectDialog.internal.test.tsx — NEU (2 Tests).
- src/frontend/src/components/sidebar/HierarchySidebar.internal-projects.test.tsx — NEU (6 Tests).

**Docs:** docs/API_DOCS.md (GET-Row isInternal; DELETE-Row 409-Schutz; neue PATCH-Row),
docs/sprints/SPRINT-154-PROTECTED-INTERNAL-PROJECTS.md (NEU), docs/backlog/BACKLOG.md
(S154-Spiegel oben).

## Nicht berührt (Regeln eingehalten)

gateway.go · store.go · policy.go · deploy.go (Route-Registrierung) · top-level
deploy/ · plugins* · files* · suricata* · threat* · meshsquad* — inkl. aller
uncommitteden Parallel-Arbeiten (S153-Chat, S156-Nav, S157-Sidebar-IA sind im
Tree geblieben, wie vorgefunden; die HierarchySidebar-Edits von S157 liefen
WÄHREND meiner Session herein und wurden nicht angefasst).

## Verifikation (jeder Befehl wirklich gelaufen — Mandat 6)

| Check | Befehl | Ergebnis |
|---|---|---|
| Go build | docker run --rm -v src/backend:/app -w /app golang:latest go build ./internal/... ./cmd/... | **exit 0** |
| Go vet | dito go vet ./internal/... ./cmd/... | **exit 0** |
| gofmt | gofmt -l (alle berührten Go-Dateien) | **leer** |
| Go tests | go test ./internal/deploy/ ./internal/gateway/ ./internal/store/ gegen WEGWERF-Postgres (postgres:16-alpine, eigenes Netz+Volumes, entspricht make-go-test, echte DB nie berührt; Stack war down, kein jimesh-postgres da) | **alle ok**; die 4 S154-Fälle explizit grün; 1×Cold-Start-Ausreißer des frischen DB-Containers beim Allererststart, danach 3× stabil grün |
| check:i18n | npm run check:i18n | **PASS — 60 Locales, 3288 Keys** (3286 aus S154 + 2 parallele S157-Keys, gemeinsamer Baum) |
| tsc-Baseline | npx tsc --noEmit -p tsconfig.app.json | grep -c 'error TS' | **472 = Baseline** (meine Dateien: 0 Fehler; zwischenzeitliche 473–477 stammten aus den uncommitteden Parallel-Edits, die sich inzwischen gesetzt haben) |
| Neue Vitests | npx vitest run (Dialog + Sidebar-Toggle) | **8/8 grün** |
| Backend-Live-Smoke | — | **NICHT gelaufen** — Stack ist down; nach `make up` + Angabe der gateway.go-Zeile: curl -X PATCH + curl -X DELETE -Verifierung wie in API_DOCS.md beschrieben |

**Bekannte rote Tests, die NICHT von S154 waren:** zeitweise rot während der
Build-Runde: 4 Fälle in HierarchySidebar.test.tsx (Security/Events/Realtime-
Monitor) — Kollateral des parallelen S157-Sektionen-Umbaus, NICHT aus S154.
Die S157/S156-Fix-Welle (Commit ae1e3f3, "Sidebar 69/69") hat sie inzwischen
grün gemacht; nachträglich verifiziert: Sibling-Suite 44/44 + meine 8 S154-
Tests = 52/52 grün im finalen Baum.

## Smoke-Test für den Operator (nach make up + angewandter gateway.go-Zeile)

    # Flag setzen (Admin-Session):
    curl -X PATCH http://127.0.0.1:3010/api/projects/platform-internal/internal \
      -H 'Content-Type: application/json' -d '{"internal": true}'
    # → {"success":true,"id":"platform-internal","isInternal":true,...}
    # Delete muss jetzt verweigern:
    curl -X DELETE http://127.0.0.1:3010/api/projects/platform-internal
    # → 409 {"error":{"message":"... protected from deletion — unmark it first
    #    ... (PATCH /api/projects/platform-internal/internal with \"internal\": false)",
    #    "type":"project_internal"}}

UI-Verifikation: Projekt-Detail eines internen Projekts → Delete-Button öffnet
den Dialog mit Schloss-Zustand, Confirm disabled; Sidebar → Augen-Icon im
PROJECTS-Header togglet + persistiert über Reloads; Details eines internen
Projekts bleiben erreichbar (Filter versteckt nur Baumzeilen).
