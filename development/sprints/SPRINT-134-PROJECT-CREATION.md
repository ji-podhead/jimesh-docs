# SPRINT-134 — Project-Creation (Backlog #134 / fix-project-creation)

> Branch: **fix-project-creation** (Branch-Pointer auf 0d491e0 + Doku-Commit; der
> Code selbst wurde von der Parallel-Session in 68d2d06 auf main komponiert —
> siehe Retrospektive). Backlog: docs_dev/backlog/BACKLOG.md #134 (gitignored,
> lokale Datei): „'New Project' (Top-Level-Button) bleibt offen — echte
> Projekt-Erstellung läuft über /api/projects/deploy (voller Deploy-Flow), kein
> simpler 'leeres Project anlegen'-Dialog gefunden".

## Ziel

User konnten KEINE Projekte anlegen — nur Workspaces. Die Kette des
Dead-Ends (alle vier Glieder verifiziert am Code):

1. **Backend**: `/api/projects` (deploy.go:69 → handleProjectsList)
   antwortete auf POST mit 405 — es existierte nur der GET-List-Zweig. Die
   Deploy-Pipeline persistiert Projekt-Rows nur als Nebenprodukt eines
   vollen Container-Deploys.
2. **WorkspacesPage** (= /workspaces; /projects redirectet dorthin,
   App.tsx:563): der „+ New Workspace"-Ensure-Dialog verlangt ein
   EXISTIERENDES Projekt aus einem Dropdown; der Trigger ist bei
   `projects.length === 0` sogar disabled (WorkspacesPage.tsx:363).
3. Der Empty-State-Escape-Button bei 0 Projekten verlinkte auf `/projects`
   → Redirect zurück auf `/workspaces` → Loop, die man nirgendwo verlassen
   kann.
4. **HierarchySidebar**: der Bottom-„+ New Project"-Button navigierte nur
   nach /workspaces (SPRINT-48 WP6-Hintergrund), öffnete nie einen Dialog.

## Plan (Work Packages)

| WP | Inhalt |
|---|---|
| WP-Backend | POST-Zweig in handleProjectsList + handleProjectCreate: Name-Feld, server-generierte ID, ehrliche Row-Defaults, GET-identische Response-Shape |
| WP-Gate | policy.IsAdminMutation: präzises `POST /api/projects`-Match (Create-Schwester des DELETE-Gates) + Test |
| WP-Frontend | NewProjectDialog (Name-Feld → POST → Refetch BEIDER Project-Caches: ['projects'] + queryKeys.projectsList) |
| WP-Mounts | Button auf /projects (= WorkspacesPage-Header) + in der Sidebar; Empty-State-Rewire (Loop → Create) |
| WP-i18n | 9 neue projects.*-Keys in alle 60 Locales (echt übersetzt, nicht englisch dupliziert) |
| WP-Docs | API_DOCS.md-Zeile, RBAC-Sektion, Sprint-File, Backlog-Spiegel, docs_dev #134 |

## Was gebaut wurde

### Backend
- `internal/deploy/projects_ssh.go`: handleProjectsList ist jetzt ein
  GET/POST-Dispatch (405 nennt die erlaubten Methoden); neuer
  handleProjectCreate — Body `{name}` (getrimmt, Pflicht, ≤255 =
  VARCHAR(255)-Bound), ID `proj-` + 16 Hex aus crypto/rand (dieselbe Idiom
  wie newWorkspaceID), Status `stopped` (nichts wurde deployt — derselbe
  Wert, den der Undeploy-Sweep hinterlässt), Store.CreateProject schreibt
  NUR id/name/status: alle Deployment-Metadaten behalten ihren
  Schema-Default (framework '', node_port 22, network_mode 'isolated',
  enable_nat 1) — nichts wird erfunden (Mandat 2). Response:
  `{success, created, project}` mit der exakt geteilten projectRowJSON
  (aus dem GET-Loop extrahiert) — ein neu erzeugtes Row ist feldidentisch
  mit einem gelisteten. Kein SSH, kein Container, kein Node-Kontakt: die
  Erzeugung ist Buchhaltung, kein Deploy.
- `internal/store/store.go`: CreateProject(id, name, status) — bewusst
  kein ON CONFLICT (kollidierende Server-IDs wären ein Programmfehler,
  kein Upsert-Case).
- `internal/policy/policy.go`: isAdminProjectCreateMutation — exakt
  `POST /api/projects` (zwei Segmente, nichts darunter; /deploy,
  /undeploy, /task/* bleiben Session-only). Wer das gemeinsame Parent-Team-
  Tier anlegen darf, IST eine Privileg-Entscheidung — die SPRINT-47-Rego
  verweigert die Erzeugung dem Dev-Tier ohnehin per Nicht-Regel
  (project_gate_test.go: „dev may NOT create projects"); das Admin-Gate
  macht diese Posture jetzt real statt zufällig (vorher wäre ein handler
  für jede Session offen gewesen). Password-Operator und Keycloak
  jimesh-admin passieren (default.rego), Devs erhalten die 403 mit der
  bekannten Deny-Text. Consumer-Keys erreichen die Route gar nicht
  (Auth-Middleware fällt auf 401 durch — nur /api/sdk/*, router/config,
  firewall, vault-read haben Key-Zweige).
- Tests: policy_test.go (POST /api/projects IST Admin-Mutation, GET bleibt
  lesbar, die Sub-Path-POST-Familie bleibt ungated) +
  projects_create_test.go (Validierung ohne DB: invalid JSON/leer/
  Whitespace/überlang → 400, PUT → 405 mit Methoden-Nennung;
  DB-Contract-Test: Create → ID-Shape → Row-Defaults → sofortige
  GET-Sichtbarkeit → 255-Bound; skipped ehrlich ohne Postgres).

### Frontend
- `components/projects/NewProjectDialog.tsx` (neu): ein Dialog, zwei
  Mount-Punkte. Name-Feld (Enter submit, Disabled bei leer), POST
  /api/projects, onSuccess: invalidateQueries BEIDER Keys —
  WorkspacesPage-['projects'] UND queryKeys.projectsList (SSOT-Store der
  Sidebar/Overview) — dann Toast + Close. Fehler laufen über den
  App-weiten MutationCache-Toast (403-Meldung des Backends bleibt
  sichtbar), der Dialog bleibt offen für Retry.
- WorkspacesPage: „+ New Project"-Button neben dem Ensure-Trigger im
  PageHeader; Empty-State (0 Projekte) öffnet denselben Dialog statt der
  Redirect-Loop.
- HierarchySidebar: „+ New Project"-Zeile im Baum-Abschnitt (Sektion 4
  des S52-Rest-Layouts — die Erzeugung ist eine AKTION, kein
  Cross-Cutting-Link, deshalb nicht in deren Navigation-Section) + Dialog
  am Dateiende. Nach dem Erzeugen refetcht der SSOT-Store und das Projekt
  erscheint im Baum — ohne Reload.

### i18n
- 9 Keys (`projects.newProject/createTitle/createDescription/
  createNameLabel/createNamePlaceholder/createHint/createSubmit/creating/
  createdToast`) in ALLE 60 Locales — pro Sprache echt übersetzt (nicht
  englisch dupliziert), {name}-Platzhalter paritätisch (check:i18n-Gate).
  Das S52-Rest-Sprint-File notierte als offenen Bug, mein Button rendere
  den Roh-Key `projects.newProject` — die Key-Lücke wurde mit diesem
  Patch geschlossen (der Bug-Fund war korrekt für den Moment zwischen
  Verdrahtung und Locale-Patch).

## Abnahme (verifiziert, nicht behauptet)

| Kriterium | Befehl | Ergebnis |
|---|---|---|
| Backend baut | `make go-build` (golang:latest-Container) | RC 0 |
| go vet | `make go-vet` | RC 0 |
| Policy-Tests | `go test ./internal/policy/` | ok — TestIsAdminMutation PASS (inkl. neuer POST-Asserts) |
| Handler-Validierung | `go test -run TestHandleProjectCreateValidation ./internal/deploy/` | PASS (4×400 + 405-Dispatch) |
| Handler-DB-Contract | `go test -run TestHandleProjectCreateRowAndContract ./internal/deploy/` gegen Wegwerf-Postgres (`postgres:16-alpine`, eigenes Docker-Netz, danach entfernt) | **PASS (0.06s) — Create → Readback → GET-Sichtbarkeit gegen echte DB** (jimesh-Stack down in dieser Umgebung; `make go-test` braucht jimesh-postgres, deshalb der Wegwerf-Container) |
| tsc | `npx tsc --noEmit -p tsconfig.app.json` | 481 Fehler im komponierten Shared-Tree (= Baseline, s. S52-Rest-Doc), **0 in den angefassten Dateien** (NewProjectDialog/WorkspacesPage/HierarchySidebar) |
| Vitest | `npx vitest run` | **27 Dateien / 274 Tests grün** (inkl. HierarchySidebar 7/7 mit Button + Dialog) |
| ESLint | `npx eslint` auf die 3 Dateien + HEAD-Kopie von WorkspacesPage als A/B | 2 Findings im prä-existierenden Mount-Effect (byteweit identisch in HEAD, mit Kopie bewiesen) — **0 neue durch diesen Change** |
| check:i18n | `npm run check:i18n` | grün — 60 Locales, 2839 Keys |

Nicht gelaufen (ehrlich): Live-Smoke am laufenden Stack — der jimesh-Stack
ist in dieser Umgebung down und `make up` hat kein Compose-File mehr
(standing directive 16.9.); Live-Deploy-Verifikation bleibt Operator-Punkt
(wie auch S54-WS-3).

## Retrospektive — was tatsächlich geliefert wurde

- Alle 6 WPs umgesetzt; die „Create"-Antwort ist die einzige neue
  Backend-Route (API_DOCS.md-Zeile + RBAC-Sektion aktualisiert).
- **Parallel-Kollision, dokumentiert statt versteckt**: Die S52-Rest-
  Session hat die Sidebar parallel restrukturiert und dabei den alten
  Bottom-„+ New Project"-Button GELÖSCHT (er „navigierte nur"). Zwischen-
  stand: meine Import/State-Edits landeten in deren umgebauter Datei,
  e3/e4 mussten gegen den NEUEN 4-Sektionen-Stand neu angesetzt werden.
  Ergebnis der Komposition: die Create-Aktion sitzt als Zeile im
  Baum-Abschnitt (dort, wo die Projekte leben), das S52-Rest-Sprint-File
  beschreibt die Kollision aus deren Sicht.
- **Commit-Lage**: Dieser Stream hat — der Aufgabenstellung folgend —
  zuerst den Branch fix-project-creation angelegt und NICHT selbst auf
  main committet. Die Parallel-/Parent-Session hat den gemeinsamen
  Working-Tree (mein Code + S52-Rest + S54-WS) als 68d2d06/0d491e0 auf
  main komponiert; ein Rewrite von main wäre destruktiv für deren Arbeit
  und war nicht meine Entscheidung. Der Branch-Pointer steht auf 0d491e0,
  der Doku-Nachtrag (API_DOCS + dieses File + Backlog-Spiegel) ist der
  einzige eigene Commit auf fix-project-creation.
