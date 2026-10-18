# SPRINT-135 — Project-Server-Select (fix-project-server-select)

> Branch: **fix-project-server-select**. Operator-Anfrage 27.9.2026:
> „wieso kann man bei new project nicht den server im modal auswählen bzw
> ist der der aktuell ausgewählt ist" — der NewProjectDialog (SPRINT-134)
> hatte NUR ein Name-Feld; welcher Server das Projekt tragen soll, konnte man
> im Modal nicht wählen, und die aktuelle Server-Auswahl der Sidebar
> floss nicht hinein.

## Ziel

Der NewProjectDialog bekommt eine echte Server-Auswahl:

1. **Dropdown aus der SSH-Endpoint-Registry** (GET /api/settings/ssh_endpoints
   via useSshEndpoints — dieselbe Liste, die jeder Deploy-Dialog nutzt; nie
   Freitext, TASK-053-Regel), mit einer expliziten „All Servers"-Option.
2. **Preselect**: Steht die Sidebar im Modus 'server' UND ist dort ein
   konkreter Server gewählt (localStorage `jimesh.sidebar-view-mode` +
   `jimesh.sidebar-entity-filter`, Server-Slot = Endpoint-HOST), ist genau
   dieser Server im Dialog vorbelegt. 'All Servers' (oder ein anderer Modus,
   oder ein verschollener Host) → keine Vorauswahl, alle Server im Dropdown.
3. **Persistenz statt Meta-Data**: Der gewählte Server wandert als
   `nodeHost`/`nodeUser`/`nodePort` in die POST /api/projects-Anfrage und
   vom Backend in die ECHTEN `projects.node_host/node_user/node_port`-Spalten
   — kein localStorage (Mandat 3: das war genau der SPRINT-33-Fehler, den das
   Repo ausgegraben hat). 'All servers' sendet nur den Namen, alle Spalten
   behalten ihre Schema-Defaults (das exakte #134-Verhalten).

## Plan (Work Packages)

| WP | Inhalt |
|---|---|
| WP-Backend | projectCreateRequest + handleProjectCreate: optionaler Server-Pin (Validierung: Port 0→22-Default, 0-65535, Pin ohne Host 400); Store.CreateProjectOnNode schreibt die 6-Spalten-INSERTs; Pin-los bleibt CreateProject (3 Spalten) unverändert |
| WP-Frontend | NewProjectDialog: Server-Dropdown (Select + items-Registry), Preselect aus der Sidebar-Persistenz, Pin in die Create-Body; 'All Servers' = Name-only |
| WP-Tests | Backend: 4 neue Validierungs-400s + DB-Contract-Test (Pin Roundtrip über Create/GET, Default-Port 22); Frontend: NewProjectDialog.test.tsx (6 Tests: Listing, Preselect, Degradation, Wire-Body, Manuelle Wahl) |
| WP-i18n | 2 neue projects.*-Keys (createServerLabel/createServerHint) in alle 60 Locales; 42 echt übersetzt, 18 English-Fallback (scripts/backfill-i18n.mjs, S55-Standard) |
| WP-Docs | API_DOCS.md (POST-Zeile), dieses Sprint-File, Backlog-Spiegel, docs_dev #135 |
| WP-Bonus | headscale_user fehlte im Fresh-DB-CREATE (gleiche TASK-076-Lücke wie einst node_host) — nachgezogen, sonst scheitert der Contract-Test auf jeder frischen jimesh_test |

## Was gebaut wurde

### Backend
- `internal/deploy/projects_ssh.go`: `projectCreateRequest` trägt jetzt
  optionale `nodeHost`/`nodeUser`/`nodePort` (fix-project-server-select;
  KEINE erfundenen Deploy-Fakten, sondern die explizite Operator-Wahl aus
  der persistierten Endpoint-Registry). handleProjectCreate validiert:
  Host getrimmt/≤255, Port 0/absent → 22 (derselbe Wert wie der
  Schema-Default), Port außerhalb 0-65535 → 400, nodeUser/nodePort ohne
  nodeHost → 400 („a server pin needs a host"). Pin vorhanden →
  `Store.CreateProjectOnNode`, sonst unverändert `Store.CreateProject`.
- `internal/store/store.go`: `CreateProjectOnNode` — INSERT über
  (id, name, status, node_host, node_user, node_port), kein ON CONFLICT
  (Server-generierte crypto/rand-ID wie bei CreateProject). Und:
  `headscale_user TEXT DEFAULT ''` in den Fresh-DB-CREATE TABLE projects
  nachgezogen — die Sprint-40-Spalte hing nur im ALTER-Block, der auf einer
  frischen DB VOR dem CREATE läuft und dort lautlos fehlschlägt
  (dokumentierter TASK-076-Fehler; gefunden, weil der Contract-Test auf
  frischer jimesh_test gegen die fehlende Spalte lief).

### Frontend
- `components/projects/NewProjectDialog.tsx`: Server-Dropdown unter dem
  Name-Feld — 'All Servers' + die Registry („name (host:port)"). Die
  `items`-Prop an Select.Root sorgt dafür, dass der Trigger das LABEL der
  vorbelegten Auswahl zeigt, nicht die rohe Endpoint-ID (Base UI leitet
  Labels erst aus Popup-Items ab, die vor dem ersten Öffnen nicht
  existieren — die bestehenden SshTargetSelects zeigen diese Lücke bis zum
  ersten Öffnen). Preselect: `jimesh.sidebar-view-mode === 'server'` +
  Entity-Filter-Server-Slot (HOST) → passender Endpoint; verschollener
  Host → 'All servers' (dieselbe selectedServerKey-Ehrlichkeitsregel wie
  die Sidebar). Manuelle Wahl gewinnt bis der Dialog neu öffnet. Submit:
  Pin → Body {name, nodeHost, nodeUser, nodePort}; 'All servers' →
  {name}. Keine Endpoints registriert → ehrlicher Hinweis + Link auf
  /workspaces/endpoints (wie SshTargetSelect).
- `components/projects/NewProjectDialog.test.tsx` (neu): 6 Tests gegen
  echte Provider (I18nProvider/react-query/MemoryRouter) mit
  Fetch-Stubs in echter Wire-Shape — Dropdown-Inhalt, Preselect über die
  echten localStorage-Keys, Stale/Modus-Degradation, der exakte POST-Body
  (Pin und Name-only) und die manuelle Wahl über den Popup-Klick
  (pointerdown+click — Base UI verwirft nackte jsdom-Clicks).

### i18n
- `projects.createServerLabel` („Server"/„Serveur"/„Сервер"/…) und
  `projects.createServerHint` (erklärt Vorbelegung + Persistenz als Node)
  in alle 60 Locales: 42 Sprachen echt übersetzt (inkl. de, es, fr, it, pt,
  nl, pl, ru, uk, tr, skandinavisch, cs/sk/el/hu/ro, id/ms/vi, ja, zh-CN,
  zh-TW, ko, ar, he, fa, hi, bn, ur, th, sw, tl, ka, lt, bg, hr, sr),
  18 Locales English-Fallback über scripts/backfill-i18n.mjs (S55-Standard).
  'All Servers' selbst wird wiederverwendet: `sidebar.allServers`.

## Abnahme (verifiziert, nicht behauptet)

| Kriterium | Befehl | Ergebnis |
|---|---|---|
| Backend baut | `make go-build` (golang:latest-Container) | RC 0 |
| go vet | `make go-vet` | RC 0 |
| Create-Tests (Validierung, immer) | `go test ./internal/deploy/ -run TestHandleProjectCreate -v -count=1` (golang-Container) | PASS — Validation (inkl. 4 neuer 400s), RowAndContract, ServerPin |
| Create-Tests gegen echte DB | frische Wegwerf-jimesh_test auf dem (gestoppten) jimesh-postgres gestartet, `--network container:jimesh-postgres` + DATABASE_URL, danach DB gedroppt + Container wieder gestoppt | PASS — Pin-Roundtrip (Create→Response→GET-Sichtbarkeit, Port-Default 22), 0.603s |
| Store-Paket gegen Dieselbe DB | `go test ./internal/store/ -count=1` | ok — headscale_user-CREATE-Fix bricht keine Store-Tests |
| tsc | `npx tsc --noEmit -p tsconfig.app.json` | 479 → 479 Fehler (A/B gegen Baseline vor dem Change), **0 in den angefassten Dateien** |
| Vitest | `npx vitest run` | **28 Dateien / 287 Tests grün** (281 davor + 6 neue Dialog-Tests) |
| check:i18n | `npm run check:i18n` | grün — 60 Locales, 2821 Keys |
| i18n-Diff-Disziplin | `git diff --shortstat src/frontend/src/i18n/locales` | 60 Dateien, exakt +3/−1 je Datei, keine Reformat-Churn (en.json-Dublette unberührt) |

Nicht gelaufen (ehrlich): Live-Smoke am laufenden Stack (POST mit Pin gegen
echte Session + Klick durchs Modal) — der jimesh-Stack ist in dieser
Umgebung down; Operator-Punkt wie bei S134-6. Der frische jimesh-postgres
wurte für die DB-Tests einmalig gestartet und danach wieder gestoppt.

## Retrospektive — was tatsächlich geliefert wurde

- Alle WPs umgesetzt; die einzige Backend-Route, deren Payload sich ändert,
  ist POST /api/projects selbst (rückwärtskompatibel: ohne nodeHost
  verhält sie sich byte-identisch zu #134 — der Name-only-Pfad testet das
  im selben Lauf mit).
- **Fremd-Fund 1 (behoben)**: `headscale_user` fehlte im Fresh-DB-CREATE
  von projects — der dokumentierte TASK-076-Fehler hatte sich bei der
  Sprint-40-Spalte wiederholt. Ohne den Fix wäre JEDE frische jimesh_test
  am GetProject-Readback gescheitert (der alte Contract-Test bewies es).
- **Fremd-Fund 2 (nur notiert, unberührt)**: en.json enthält die Dublette
  `"newProject": "New Project"` zweimal im projects-Block (JSON.parse
  kollabiert sie; check:i18n sieht sie nie). Nicht entrümpelt — außerhalb
  dieses Work Packages; die i18n-Patches liefen textuell, genau deshalb.
- **Umgebungs-Notiz**: jimesh-net-Container-zu-Container-TCP wird auf
  diesem Host von der Firewall geschluckt (pg_isready von jimesh-net:
  no response) — die DB-Tests liefen deshalb über `--network
  container:jimesh-postgres` (geteilter Netz-Namespace, 127.0.0.1). Weder
  `make go-test` (braucht -T auf docker exec, das der Docker-Shim hier
  nicht kennt) noch der Bridge-Weg liefen; der Weg über den geteilten
  Namespace ist der ehrliche gleiche Test.

## Commit-Lage — Parallel-Kollision (S134-Präzedenzfall, 27.9.)

Diese Session hat — der Aufgabenstellung folgend — den Branch
**fix-project-server-select** angelegt und dort NICHT selbst auf main
committet. Eine Parallel-Session hat den gemeinsamen Working-Tree
ausgewertet, hielt meine (vollständige und lokal verifizierte) Arbeit für
eine „gestorbene Agent-Session" und hat sie als „Agent-Reste" in IHRE
main-Komposition übernommen — verteilt über drei Commits:

  * `907dde6` (post-mortem — 4 Agent-Arbeiten): Backend-Dateien
    (projects_ssh.go, projects_create_test.go, store.go)
  * `ed88c37` (merge: fix-crashes-integrations): Frontend-Dateien
    (NewProjectDialog.tsx, NewProjectDialog.test.tsx)
  * `50fec72` (post-mortem: gestorbene Agent-Reste sichern): API_DOCS.md,
    dieses Sprint-File und die 60 Locale-Updates

Ein Rewrite von main wäre destruktiv für deren Arbeit und war nicht meine
Entscheidung — der Branch-Pointer steht deshalb auf **50fec72** (der
komponierte Stand, der ALLE meine Änderungen enthält), exakt der
SPRINT-134-Lösung für den identischen Fall. Der einzige eigene Commit auf
fix-project-server-select ist der Doku-Nachtrag: Backlog-Spiegel S135 +
Bereinigung der Konflikt-Marker in docs/backlog/BACKLOG.md (die
Parallel-Session hat ihren Merge ed88c37 mit `<<<<<<< HEAD`-Markern
committet — leere Our-Seite, Theirs = die S57/S55/S134-Spiegel; Auflösung
eindeutig: Marker raus, Inhalt bleibt) + dieser Abschnitt. **main trägt
die Marker noch** — der Merge dieses Branches (fast-forward ab 50fec72)
heilt sie.

Die Abnahme-Tabelle oben lief auf exakt diesem Tree-Inhalt: die
Arbeitskopie war byte-identisch, bevor und nachdem die Parallel-Session
die unveränderten Inhalte in ihre Commits hob.

### Nachtrag: Lint-Reedition des Preselect-Musters (eigener Commit)

Ein Nach-Lint der eigenen Dateien fand 2 NEUE Errors
(`react-hooks/set-state-in-effect`) — das Preselect-Sync lief über zwei
useEffect-SetState-Tänze. Umgebaut auf das repo-sanktionierte Muster, das
die Parallel-Session selbst für WorkspaceDeployAppDialog etabliert hat
(„Derived prefill instead of setState-in-effect"): `manualServerId`
(null = noch keine Wahl) als Override, `autoServerId` als abgeleiteter
Wert (useMemo über open+endpoints — frischer localStorage-Lese bei jedem
Öffnen, kein Mount-Zeit-Snapshot), Reset des Overrides über JEDEN
Schließ-Pfad (Backdrop, Escape, Cancel-Button, erfolgreicher Create —
alle laufen durch handleOpenChange). Verhalten unverändert, Verifikation
nachgezogen: eslint RC 0 auf beiden angefassten Dateien, Dialog-Suite
6/6, Voll-Suite 287/287, tsc 479 = Baseline, check:i18n grün. Der Branch
trägt damit eigene Commits nach 50fec72 — der Merge nach main ist kein
Fast-Forward mehr, aber konfliktfrei, solange main seit 50fec72 nichts
Neues bekommt.
