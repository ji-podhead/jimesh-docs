# SPRINT-182 WP3 — Projekt-Terminal (Shell in den laufenden Containern des Projekts)

Status: **in Arbeit** (diese Session, 4.10.)
BACKLOG: `S182-WP3` — „Terminal in Projects (Default Utility Container): Route
`/workspaces/projects/:id/terminal`, Default Utility Container, Container
Dropdown, WebSocket Terminal".

## 1. Warum

Der Workspace-Terminal (`SPRINT-138`, `gateway/terminal.go`) existiert und ist
bewährt, aber er hängt am Workspace: `GET /api/workspaces/{id}/terminal` zielt
auf `jimesh-framework-<wsId>-<runID>`. In der neuen IA (S173, Nav-Umbau live)
ist die Terminal-Funktion **explizit nach PROJECTS umgezogen** (S173
NACHTRAG 4, Operator-Wortlaut: „TERMINAL → PROJECTS, ausdrücklich entschieden
(Ausnahme vom Global-Charakter — deployed eh by default im
Utility-Container)").

Die Workspace-Seite behält ihr Terminal (nicht Gegenstand dieses Sprints);
dieser Sprint bringt die Shell dorthin, wo die IA sie verortet: ans Projekt.

### 1.1 Der „Default Utility Container" existiert noch nicht — ehrliche Grenze

`deploy/utility-container/` existiert nicht, `S170` steht im BACKLOG auf
`[ ] geplant` (S170-1..8 alle offen). Es gibt also HEUTE keinen
Utility-Container, auf den man zielen könnte.

**Operator-Entscheidung (4.10., Rückfrage dieser Session):** Default = der
**laufende Container des Projekts**, sonst ein ehrlicher Fehler — nicht ein
Name, den noch niemand je deployed hat:

> „Laufender Container des Projekts, sonst ehrlicher Fehler. Dropdown listet
> die REAL laufenden Container des Projekts (Docker-Fakt, Mandate 2),
> Vorauswahl = erster laufender; keiner da → klare Meldung ‚kein laufender
> Container — deploy first'. Wenn S170 kommt, wird `utility-<projectId>`
> automatisch zuerst genommen."

Der Sprint baut die S170-Präferenz gleich mit ein (ein Prefix-Match auf
`utility-<projectId>`, siehe §2.3) — sie kostet nichts und läuft leer, bis
S170 existiert. Kein toter Code: die Präferenz greift für jeden Projekt-
Container, der dieses Prefix trägt, sobald der existiert.

## 2. Design

### 2.1 Route

```
GET /api/projects/{id}/terminal?container=<containerID|name>   (WebSocket)
```

Method-gelockt registriert (`mux.HandleFunc("GET /api/projects/{id}/terminal", …)`),
wie die DNS-Routen — ein all-Methoden-Muster würde neben
`/api/projects/{id}` (Collection) unklare Prioritäten erzeugen.

Frontend-Route (eine Zeile in `App.tsx`, direkt neben der Projekt-Detail-Route):

```
/workspaces/projects/:projectId/terminal   → ProjectTerminalPage
```

### 2.2 Gate: `security.VaultProjectDenial` (fail closed)

Für Projekt-Routen mit Substanz ist das die Häuslichkeit (plugins.go:325/435,
meshsquad.go:271, secrets_engines.go:260):

* Operator-Passwort-Session oder `X-JiMesh-Identity-Admin: true` → offen.
* Sonst: **verifizierter** Keycloak-Sub + Rolle `jimesh-dev` + Developer-Grant
  auf GENAU dieses Projekt (E-Policy, `VaultProjectDenial`).
* Kein Sub → Ablehnung. Grant fehlt → Ablehnung mit dem Wortlaut des Gates.

Ein Shell-Zugang bekommt dieselbe Schwelle wie das Vault — absichtlich: eine
Shell ist stärker als ein Read. Die Identity-Header sind serverseitig
(auth.Middleware strippet Client-Kopien, S174-1), das Gate liest nur die.

### 2.3 Ziel-Auflösung (Sicherheitskern: Ownership ist SERVER-seitig)

Das Dropdown ist KEINE Sicherheitsgrenze — `?container=` kommt vom Client.
Erlaubt ist genau die Menge **P** der Projekt-Container:

```
P = { c : c läuft auf dem Gateway-Daemon UND
           ( c.Name beginnt mit "utility-<projectID>"          (S170-Ready)
          ODER c.Name beginnt mit "jimesh-framework-<wsID>-"    (ws ∈ Projekt)
          ODER c.ID ∈ { rows.containerId : rows = ListContainersByProject(projectID) } ) }
```

* **Ohne `?container=`** → Vorauswahl = `utility-<projectID>` (falls in **P**),
  sonst der **neueste** laufende Kandidat (sortiert nach `Created`, wie
  `resolveWorkspaceContainer`); **P** leer → Fehlerframe
  `project has no running container — deploy first` (Close 4001).
* **Mit `?container=`** → Muss in **P** liegen, sonst Fehlerframe
  `container <x> does not belong to project <id>` (Close 4003) — der
  Ownership-Check läuft, BEVOR exec'd wird.
* **Zwei Ablehnungen, zwei Wahrheiten** (Nachtrag während des Baus):
  „uns nicht" ist ein Sicherheitsurteil (4003), „uns, läuft aber nicht" ist
  ein Betriebszustand (4001). Ohne diese Trenne würde ein Container, den das
  Projekt besitzt und der nur gestoppt ist (Bookkeeping läuft nach einem
  Redeploy nach), als fremder gemeldet — eine falsche Aussage über die Welt
  (Mandate 2). Deshalb liefert `projectContainerCandidates` zusätzlich die
  Ownership-Menge, und der Handler schreibt diesen Fall um:
  `container "x" belongs to project y but is not running — deploy first`.
  (`owns()` deckt buchbare IDs/Namen, den utility-Namen und die Workspace-
  Präfixe ab; Test `TestProjectOwnershipOwns`.)
* Danach: läuft der Kandidat wirklich? (`ContainerList` ist die Quelle für
  „läuft", die Rows nur für die Menge) sonst 4001 mit ehrlicher Meldung.

Workspace-IDs kommen aus `store.ListWorkspaces(projectID)`; die
DB-Rows-Liste ist der Sekundärpfad (Bookkeeping kann nachlaufen — der
laufende Container ist der Fakt, Mandate 2; die Row dient nur der
Menge, der Docker-Befund entscheidet über „läuft").

Kein SSH, kein anderer Knoten: derselbe Daemon wie der Workspace-Terminal
(`dockerclient.FromEnv`), dieselbe Begründung aus SPRINT-138 — die Shell
landet IM Container, nie auf dem Host.

### 2.4 Wiederverwendung (eine Implementierung, kein zweites Protokoll)

| Baustein | Quelle | Status |
|---|---|---|
| Upgrade-first + Fehlerframes + Close-Codes | `terminal.go` | übernommen (1000/4001/4003/4004/1011) |
| `terminalSendError` | `terminal.go:485` | direkt benutzt |
| `createWorkspaceExec` (bash → sh Fallback) | `terminal.go` | direkt benutzt, unverändert |
| `pumpWorkspaceTerminal` (Bidirektional, Resize, Ping) | `terminal.go:381` | direkt benutzt — der Name sagt Workspace, der Code ist ziel-blind |
| xterm-Fläche | `WorkspaceTerminal.tsx` | neue optionale Props `terminalPath`/`container` (URL-Bau), Rest identisch |

Ein zweites Pump/Protokoll zu schreiben wäre genau die Doppel-Implementierung,
vor der E-Policy warnt.

### 2.5 Frontend: `ProjectTerminalPage`

* Kopf: Projektname, **Container-Dropdown** aus
  `GET /api/projects/{id}/containers` (S182-WP4-Route, existiert),
  Auswahl hängt an `?container=` (Teilen per URL möglich).
* Liste leer → kein Blind-Button: Hinweis, dass kein Container des
  Projekts registriert ist (ehrlich, kein Fake-Eintrag).
* Terminal-Fläche = `WorkspaceTerminal` mit `terminalPath =
  /api/projects/<id>/terminal` + `container` (Query-Parameter),
  `embedded`-Modus wie im AppPanelDrawer.
* i18n: neue Keys in **alle 60 Locales** (englischer Fallback; Übersetzung
  de = vollständig, Rest = S181-7). `check:i18n` muss grün bleiben.

## 3. Akzeptanz (echte Befehle, nach dem Bau)

```bash
# Backend
make go-vet  > /tmp/vet.log  2>&1; echo "VET_RC=$?"        # 0
make go-test > /tmp/got.log  2>&1; echo "GOTEST_RC=$?"     # 0, 0 FAIL
gofmt -l internal/gateway/project_terminal.go internal/gateway/project_terminal_test.go  # leer

# Frontend
docker run --rm -v "$(pwd):/repo" -w /repo/src/frontend node:20-alpine sh -c \
  "npx tsc -p tsconfig.app.json > /tmp/t.log 2>&1; echo TSC_RC=\$?"      # 0
docker run --rm -v "$(pwd):/repo" -w /repo/src/frontend node:20-alpine sh -c \
  "npm test > /tmp/v.log 2>&1; echo VITEST_RC=\$?; grep -E 'Test Files|Tests '" # 0
docker run --rm -v "$(pwd):/repo" -w /repo/src/frontend node:20-alpine sh -c \
  "npm run check:i18n > /tmp/i.log 2>&1; echo I18N_RC=\$?"               # 0
```

**Ist-Stand nach dem Bau siehe §6** — die Zielwerte `GOTEST_RC=0` und
`VITEST_RC=0` sind es NICHT: beide Laufungen enden ausschließlich an fremden,
bereits dokumentierten Rotstellen (`dns_test.go` von 5cac559a bzw.
`NewProjectDialog.test.tsx` von 24e67c74, auf sauberem HEAD reproduziert).
Meine eigenen Teile laufen in beiden grün.

Live (Stack oben):

```bash
# 1. Gate: ohne Grant -> ehrlicher Fehler, kein Shell
curl -s "http://127.0.0.1:8090/api/projects/<id>/terminal" | head -c 200
# 2. WS mit Token, ohne laufenden Container -> "project has no running container — deploy first"
# 3. WS mit laufendem Container -> Shell, `hostname` zeigt den Containernamen
# (3. ist hier NICHT ausführbar: es existiert kein laufender Projekt-Container
#  auf superleo — genau der Fall §1.1. Der volle Pfad ist stattdessen im Test
#  mit gemountetem Daemon belegt, §6.)
```

## 4. Bewusst NICHT gebaut (ehrliche Grenze)

* **Kein Utility-Container** — S170 ist `[ ] geplant`; die Präferenz baut nur
  die Erkennung, nicht den Container.
* **Kein Container auf einem anderen Knoten** — derselbe Daemon-Befund wie
  SPRINT-138, kein SSH-Hop („KEIN SSH auf den Host. NIEMALS.").
* **Kein Container-Erstellen/Starten** — das Terminal deployt nichts; ein
  gestoppter Container ist ein „deploy first", kein Auto-Start.
* **Kein Terminal-Tab im ProjectDetailPage** — die Route ist eigenständig;
  der Tab (falls gewünscht) wäre eigener Schnitt, und ProjectDetailPage
  ist gerade Baustelle der dritten Session.
* **Kein zweites Protokoll** — siehe §2.4.

## 5. Mitgefundener, hier NICHT entschiedener Befund

`handleProjectContainers` (S182-WP4 der dritten Session) fragt
`ListContainersByProject` aus der **DB** ab — die Rows können nach einem
Redeploy nachlaufen, und die Route meldet keinen Docker-Befund (läuft der
Container? welcher?). Für das Dropdown in diesem Sprint nutze ich dieselbe
Liste als REGISTER, aber die Ziel-Auflösung entscheidet der Docker-Befehl
(laufend/nicht laufend). Ob die WP4-Route um einen Live-Status ergänzt wird,
ist S182-WP4-Sache, nicht diese.

## 6. Verifikation (echte Befehle, echte Ausgaben — 4.10.)

```bash
# Backend — Formatierung (neue Dateien; fremde Altdateien bleiben unangetastet)
docker run --rm -v "$(pwd)/src/backend:/src" -w /src -v go-cache:/go golang:latest \
  gofmt -l internal/gateway/project_terminal.go internal/gateway/project_terminal_test.go
# -> (leer)

make go-vet > /tmp/opencode/vet-wp3.log 2>&1; echo "VET_RC=$?"
# VET_RC=0   (zuvor rot gewesen: "project_terminal_test.go:126:2: unreachable code"
#  — die return 0 nach der Endlosschleife, behoben vor dem Commit)
```

```bash
# Meine Tests, gezielt, gegen die echte Throwaway-Postgres (--env-file,
# Passwort nie in argv):
go test ./internal/gateway/ -run 'TestProjectTerminal|TestPickProjectContainer|TestFilterProjectContainers' -v
# TARGET_RC=0
#   --- PASS: TestPickProjectContainer (7 Subtests: deploy-first/4001,
#             default=neueste, utility gewinnt, name/id, fremd -> 4003,
#             utility eines ANDEREN Projekts -> 4003)
#   --- PASS: TestFilterProjectContainersOwnership
#   --- PASS: TestProjectOwnershipOwns (10 Fälle: die zwei Ablehnungen)
#   --- PASS: TestProjectTerminalGetOnly
#   --- PASS: TestProjectTerminalUnknownProjectCloses4004
#   --- PASS: TestProjectTerminalGateDeniesWithoutIdentity
#   --- PASS: TestProjectTerminalOperatorGetsHonestDeployFirst (mit Socket)
#   (6 Testfunktionen, 7 mit dem Daemon-Pfad, 0 FAIL)
# Derselbe Test MIT gemountetem Daemon (beweist den vollen Pfad
# Gate -> docker -> leere Kandidaten -> ehrliche Ablehnung):
#   DOCKER_PATH_RC=0  --- PASS: TestProjectTerminalOperatorGetsHonestDeployFirst
#
# Voller Lauf: make go-test > log 2>&1; echo "GOTEST_RC=$?"
# GOTEST_RC=2 — ausschließlich 5 fremde Rotstellen:
#   TestProjectDNS_{Get_NoRow,Put_Valid,Delete,UnknownProject,MethodNotAllowed}
#   ("expected 200 OK, got 400: project id required" — dns_test.go von 5cac559a,
#    Session 3: der Test ruft den Handler ohne PathValue auf. NICHT diese Dateien,
#    nicht dieser Sprint; liegt bei Nemotron Phase 1.) Meine 6 Tests: 0 FAIL.
```

```bash
# Build des Arbeitsspeichers (ohne meine noch untracked Dateien war er ROT —
# siehe §6.2): go build ./...  ->  WORKTREE_BUILD_RC=0
```

### 6.1 Frontend (echte Befehle, echte Ausgaben — 4.10.)

```bash
docker run --rm -v "$(pwd):/repo" -w /repo/src/frontend node:20-alpine \
  sh -c "npx tsc -p tsconfig.app.json > /tmp/tsc.log 2>&1; echo TSC_RC=\$?"
# TSC_RC=0   (zuvor 2 echte Fehler, beide behoben:
#   TS2322 Select-onValueChange erwartet (value: string|null) -> v && selectContainer(v)
#   TS2741 workspaceId war required, obwohl terminalPath sie ersetzt -> optional)

npm run check:i18n   # I18N_RC=0
# 9 neue Keys (projectTerminal.*) in ALLEN 60 Locales: de vollständig,
# 59 mit englischem Fallback; Round-trip 60/60 unverändert (indent=2,
# en/de ohne, die anderen 58 mit abschließendem Newline).

npm test   # = vitest + check:i18n
# NPMTEST_RC=1 — Vitest: 604 bestanden | 4 fehlgeschlagen (608),
#   i18n-Anteil: 0 Fehler.
#   Die 4: NewProjectDialog.test.tsx ("server select trigger not found").
#   Nachweis, dass sie NICHT von dieser Änderung kommen — derselbe Test auf
#   sauberem HEAD 24e67c74 (ohne meine Dateien), eigenes Worktree + echter
#   node_modules-Mount:  HEAD_VITEST_RC=1, identische 5 Fälle, identische
#   Fehlerursache. Dieses Sprint-Feature ändert NewProjectDialog nicht.
#   Zuständigkeit: Nemotron (Frontend-Phase).
#
# Meine Fläche: WorkspaceTerminal.test.tsx — 12/12 PASS, davon 3 neu:
#   - Projekt-Route mit token UND container=, nie die Workspace-Route
#   - ohne Vorauswahl kein container= (der Server wählt utility/neueste)
#   - Close 4001 mit PROJEKT-Wortlaut, nicht mit Workspace-Wortlaut
```

### 6.2 Zwischenfall beim Committen (mitgefundene Querschrift, ehrlich protokolliert)

Die Registrierungszeile `s.registerProjectTerminal(mux)` liegt in **`gateway.go`,
bereits committed — aber in `5cac559a` (Session 3), nicht in meinem Commit.**
Session 3 hat `git add` auf `gateway.go` ausgeführt, während meine Zeile dort
als flüchtige Änderung stand; der Handler selbst (`project_terminal.go`) blieb
untracked. Folge: **HEAD war nicht baubar**, bewiesen an einem sauberen
Arbeitsbaumkopf:

```
go build ./...  ->  HEAD_BUILD_RC=1
internal/gateway/gateway.go:459:4: s.registerProjectTerminal undefined
  (type *Server has no field or method registerProjectTerminal)
```

Dieses Commit (`project_terminal.go` + Test) macht HEAD wieder baubar:
`WORKTREE_BUILD_RC=0`. Kein Schaden im Repo (die Commits von 5cac559a/24e67c74
sind lokal, `origin/main` = `706f28e1`), aber die Regel für alle drei Sessions:
**nur eigene Pfade committen** — `gateway.go` war zu dem Zeitpunkt meine eine
Zeile fremder Index geworden.

## 7. Operator-Zitate zum Ablauf (verbatim, 4.10.)

Die beiden inhaltlichen Entscheidungs-Zitate stehen an ihrem Ort: die
Ziel-Entscheidung in **§1.1**, die Platzierung „TERMINAL → PROJECTS" in **§1**.
Hier der Ablauf drumherum, damit nichts nur in der Konversation steht:

> „vergiss nicht alles in den sprints und backlogs zu dokumentieren mit meinen zitat"

→ Doku-Regel, eingetragen als Kopf-Vermerk in `docs/backlog/BACKLOG.md`
(Muster `**Anlass (verbatim):**`); die WP3-Entscheidung steht jetzt zusätzlich
wörtlich in der Backlog-Sektion **Sprint-Spiegel S184-WP3/WP4**.

> „ok du kannst weiter machen"

→ Auftrag zum Weiterbauen nach Abschluss des DNS-Apex-Fixes; dieser Sprint
(Plan → Backend → Tests → Frontend → i18n → Verifikation → Commit/Push) lief
darunter.

> „hast du jetzt wie er das iwll neudeployed?"

→ betraf den DNS-Redeploy, nicht diesen Sprint — weil die Laptop-Session
darauf wartete, wurde der Apex-Fix hier mit erledigt statt auf Nemotrons
Phase 1 verschoben. Voller Wortlaut und Verifikation: **`SPRINT-184-DNS-OVERHAUL.md`,
NACHTRAG 4.10.** (dort auch die Fragen zum Hardcoding der IP und die Antwort,
dass die Werte vollständig aus IaC/Make kommen).

> „PR #13 ist bereits gemergt" (Rückmeldung der Laptop-Session: „Beide
> Korrekturen bestätigt, main aktualisiert … HEAD = d8ba0943, enthält
> 43803283 … Ich habe zone.j2 nicht angefaßt")

→ Arbeitsteilung hielt: Zone auf superleo gefixt und deployed, Laptop prüft
vom Laptop aus nach. Auch das in `SPRINT-184` NACHTRAG.
