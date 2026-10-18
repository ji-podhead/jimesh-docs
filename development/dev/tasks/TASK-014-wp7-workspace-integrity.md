# TASK-014 — WP7: Workspace-Integrität & Execution-Sandbox

> **Status:** ✅ UMGESETZT (Review ausstehend) · **Vorbedingung:** `docs/tasks/WORKTREE-PROTOCOL.md` gelesen
> **Branch:** `task/014-workspace-integrity` · **Speist:** Sprint 20 WP7

## Kontext

Isolationsschichten (VM, gVisor) schützen den Host vor dem Agenten — nicht das Repo
vor dem Agenten. Aus Kernel-Sicht ist `rm -rf` im gemounteten Workspace ein legitimer
Syscall. Diese Task adressiert das getrennt.

## Auftrag

### 1. Git-Worktree pro Task

Statt der Agent direkt im Hauptcheckout eines Projekts arbeitet: beim Task-Start
(wo genau ein "Task" beginnt, ist im Deploy-/Bridge-Code zu ermitteln — vermutlich
beim Aufruf, der einen Agenten-Container gegen ein Projekt startet) einen
`git worktree add` in einen `.jimesh/tasks/<session_id>/`-Unterordner ausführen.
Der Agent arbeitet dort, das Original bleibt unberührt.

Voraussetzung: Das Projekt muss ein Git-Repo sein. Für Projekte ohne Git: Fallback
dokumentieren (z. B. Kopie des Arbeitsverzeichnisses, oder Funktion nicht anbieten —
Entscheidung mit Begründung im Report).

### 2. Snapshot + Merge-Gate

Vor Task-Start: `git stash` oder ein Branch-Snapshot. Merge des Ergebnisses zurück
in den Hauptbranch erst nach Bestätigung — das ist ein HITL-Gate, keine
automatische Aktion. Baue nur den Mechanismus (Route/Funktion „Ergebnis
übernehmen"), nicht die Entscheidungslogik, wann automatisch gemerged werden darf —
das gibt es nicht, es ist immer manuell in dieser Task.

### 3. Execution-Sandbox für generierten Code

Getrennt vom persistenten Workspace: eine Route/Funktion, die ein Code-Snippet in
einem Wegwerf-Container ausführt:
```
docker run --rm --network=none --read-only --runtime=runsc \
  -v <snippet-only>:/work:ro <minimal-image> <command>
```
- `--runtime=runsc` nur verwenden, wenn gVisor auf dem Zielhost installiert ist
  (Detection, nicht Annahme — `docker info --format '{{json .Runtimes}}'` prüfen).
  Falls nicht installiert: mit `runc` ausführen, aber im Ergebnis **explizit als
  degradiert markieren** (Konsequenz aus E6 in Sprint 20 — degradieren ist erlaubt,
  stillschweigend degradieren nicht).
- **Kein Mount des eigentlichen Projekt-Repos** in diese Sandbox — nur das
  auszuführende Snippet.
- `--network=none` ist nicht verhandelbar für diese Funktion.

## Nicht tun

- Keine Kata-Containers-Integration (spätere Entscheidung, siehe
  `docs/PRODUCT-ROADMAP.md`/Sprint-20-Diskussion zu QEMU/Kata/gVisor).
- Keine automatische Merge-Entscheidung bauen — das HITL-Gate bleibt immer manuell.

## Akzeptanz

- `make go-build`/`go-vet` sauber.
- Ein Test-Snippet (z. B. `echo hello` oder ein einfaches Python-Skript) läuft
  über die neue Execution-Route und liefert die Ausgabe zurück, ohne dass das
  Projekt-Repo im Sandbox-Container sichtbar ist.
- Der Report nennt explizit, ob `runsc` auf dem Test-System verfügbar war und was
  passiert ist, wenn nicht.

## Ergebnis

## Ergebnis

_(Report des Executors — Format gemäß Worktree-Protokoll §6. Worktree:
`/home/ji/projects/jimesh/.jimesh-worktrees/task-014-workspace-integrity`,
Branch: `task/014-workspace-integrity`. Diese Task-Datei lag als einziges
`docs/tasks/`-File NICHT im Git (in main untracked) und wurde deshalb in
diesen Branch kopiert, damit das Ergebnis committed reviewbar ist.)_

### Vorzustand bei Übernahme

Der Branch enthielt uncommitted WIP, das NICHT baute: `workspace_integrity.go`
nur als Header-Kommentar mit drei ungenutzten Imports; `gateway.go` registrierte
`handleTaskStart/Status/Apply/Discard`, `projects_ssh.go` rief
`sanitizeTaskSessionID`/`taskWorktreePath`/`shQuote` — allesamt undefiniert
(`go build ./...` im `golang:latest`-Container, 10 Fehler). `exec_sandbox.go`
und der Test-File-Rumpf waren fertig. Der Sprint-20-Plan (WP7, Arbeitspakete
1–4) war als Spezifikation vorhanden und wurde 1:1 umgesetzt.

### Geändert

- `src/backend/internal/gateway/workspace_integrity.go` (NEU, 879 Zeilen) —
  Task-Lebenszyklus als Git-Mechanik: `sanitizeTaskSessionID`
  (Regex-Guard gegen Pfad-/Shell-Injection, Z. 64–77), `taskWorktreePath`
  (`<ws>/.jimesh/tasks/<sid>`, Z. 80–82), `shQuote` (POSIX-Single-Quote,
  Z. 96–101), `taskExec`-Runner-Typ (Z. 164 ff., lokal `sh -c` / remote SSH,
  gleiche Pfade wie der Deploy-Code), `taskStartExec` (Z. 325 ff.: Repo-Check
  → HEAD-Check → `.jimesh`-Index-Guard → Snapshot-Branch
  `jimesh/task-snapshot-<sid>` → Doppel-Start-Guard 409 →
  `.git/info/exclude`-Registrierung → nicht-destruktiver Stash-Capture
  `stash create`+`store` → `worktree add -B jimesh/task-<sid>` → WIP-Apply
  in den Worktree), `taskStatusExec` (live aus
  `git worktree list --porcelain` + `rev-list --count` + `git cherry`
  Patch-Äquivalenz; `-1` wenn nicht messbar — nie erfundene Zahlen),
  `taskApplyExec` (HITL-Gate `confirm:true` wird VOR jeder Ausführung im
  Handler geprüft; `merge --no-ff`; Konflikt bleibt liegen und wird 409
  gemeldet — keine Auto-Auflösung), `taskDiscardExec` (Worktree + Task-Branch
  weg, Snapshot bleibt; Verlust-Schutz: bei messbarem Verlust nur mit
  `confirm:true`), vier HTTP-Handler.
- `src/backend/internal/gateway/exec_sandbox.go` (übernommen + E6-Ergänzung,
  ~370 Zeilen) — `POST /api/exec/sandbox`: Snippet-only read-only Mount,
  `--network=none` fest verdrahtet, `--cap-drop=ALL`, pids/memory limits,
  inneres `timeout` + outer Go-Deadline + Orphan-Cleanup; Runtime-Detection
  je Aufruf (`docker info --format '{{json .Runtimes}}'`). NEU nach
  Live-Fund: Hosts, die `no-new-privileges` am Container-Start ablehnen
  (nested Docker, `exec /bin/sh: operation not permitted`), bekommen EINEN
  Retry ohne dieses Flag, laut gemeldet in `degradationReason`+`mounts`
  (`sandboxDockerArgs`, Z. 331; NPR-Detection/Retry Z. 266 ff.).
  `--network=none`/`--read-only` werden nie gedroppt.
- `src/backend/internal/gateway/workspace_integrity_test.go` (NEU, ~530
  Zeilen) — 22 Tests: Sanitizer/Quotes (vorhandener Rumpf) + Lifecycle
  end-to-end gegen ECHTE Git-Repos in `t.TempDir()` (start → worktree →
  WIP-Carry → status → apply inkl. Konflikt-409 → discard mit beiden
  Verlust-Arten) + E6-NPR-Pair-Filter.
- `src/backend/internal/gateway/gateway.go` (5 Routen registriert, Z. 158–166).
- `src/backend/internal/gateway/projects_ssh.go` — `DeployRequest.TaskID`
  (Z. 58): gesetzt ⇒ alle Agent-Container mounten den Task-Worktree statt
  des Hauptcheckouts; fehlt der Worktree → Deploy bricht laut ab
  (`if [ ! -e <wt>/.git ] … exit 1`); `git reset --hard origin/main` entfällt
  bei taskId (würde den Task-Branch plätten); Response echot
  `taskId`/`taskWorktreePath` + Security-Note (Z. 431 ff.).
- `API_DOCS.md` — Abschnitte „Per-task Workspace Integrity" und „Execution
  Sandbox" (Routen, Payloads, Fehler-Codes, Deviations) + `taskId`-Deploy-Note.
- `docs/sprints/SPRINT-20-KLAF-FOUNDATION.md` — WP7-Checkliste aktualisiert
  (3/4 erledigt, Dashboard-Anbindung offen) + „Umgesetzt"-Block mit
  Verifikationsstand.
- `docs/tasks/TASK-014-wp7-workspace-integrity.md` — diese Datei (Ergebnis).

### Build/Test-Status (ehrlich)

- `docker run --rm -v …/src/backend:/src -w /src golang:latest sh -c 'go
  build ./...'` → **OK** (kein Go auf dem Host, Build im Container).
- `go vet ./...` (Container) → **OK**.
- `gofmt -l` auf den drei neuen Dateien → **leer** (Hinweis: 29 der 30
  Dateien des gateway-Package sind gofmt-dirty — Vorbefund, nicht von dieser
  Task berührt).
- `go test ./internal/gateway/` (Container) → **22/22 neue Tests PASS**.
  Zwei Vorbefunde schlagen weiterhin fehl — verifiziert am UNBERÜHRTEN
  Hauptcheckout (read-only getestet, nichts geändert):
  `TestProviderQuotaSchemaMatrix` (nvidia-Capability-Matrix driftet —
  bestehender Repo-Bug) und `TestNewProviderProbeFlow` (braucht
  PostgreSQL auf 127.0.0.1:5432 — Umwelt, Stack läuft hier nicht).
- **Task-Lifecycle live verifiziert** (durch den echten Codepfad
  `taskStartExec/…` gegen echte Git-Repos, nicht gemockt): Worktree entsteht,
  tracked WIP wandert non-destruktiv in den Worktree (Hauptcheckout behält
  seine Änderungen), `.jimesh/` taucht nach dem Exclude-Eintrag nicht mehr im
  `git status` des Hauptcheckouts auf, Merge erzeugt das Ergebnis erst nach
  `confirm:true`, Konflikt bleibt sichtbar liegen (`UU f.txt`), Discard
  löscht Worktree+Branch und erhält den Snapshot-Branch.
- **Sandbox-Mechanik live verifiziert** (exakter `docker run`-Aufruf der
  degradierten Route auf dem Test-Host): Snippet-only-Mount (Repo NIE im
  Container), `--network=none` tot (`wget: bad address`), `--read-only`,
  exit 0 mit stdout zurück. **NICHT ausgeführt:** der HTTP-Route-Smoke gegen
  ein laufendes Backend mit DB (der Worktree hat keinen Dev-Stack). Operator:
  `make restart-backend`, dann
  `curl -s -X POST http://127.0.0.1:19091/api/exec/sandbox -H 'Content-Type: application/json' -d '{"language":"shell","code":"echo hello"}'`.
- **runsc auf dem Test-System:** NICHT verfügbar (nur
  `io.containerd.runc.v2` + `runc`) ⇒ Response würde
  `runtimeDegraded:true` + Grund liefern (E6: laut degradieren, nicht still).
- **Zusatzfund (live):** der Test-Host lehnt `no-new-privileges` am
  Container-Start ab (nested Docker) — ohne Behandlung wäre die Sandbox-Route
  auf solchen Hosts tot gewesen. Behandlung: E6-Retry ohne das Flag, laut
  gemeldet (siehe oben).

### Abweichungen von der Task-Vorgabe

1. **Discard-Verlust-Schutz** (nicht in der Vorgabe): das Wegwerfen eines
   Tasks mit uncommitteten/unmerged Arbeit verlangt zusätzlich
   `confirm:true`; der 409 nennt exakt, was verloren ginge. Begründung:
   gleiche HITL-Logik wie apply — Discard ist destruktiv.
2. **Untracked files werden beim Start nicht erfasst** (git stash create
   deckt nur tracked changes) — bewusst nicht umgangen (z. B. via
   `git stash -u`-Umweg), sondern im Response ehrlich gemeldet
   (`untrackedFilesNote`).
3. **E6-NPR-Retry** (nicht in der Vorgabe, aber deren Konsequenz): siehe
   Zusatzfund oben.
4. **Sandbox läuft auf dem Backend-Host** (Docker-CLI-Shellout); Remote-Node-
   Ausführung ist Folgearbeit und in API_DOCS so benannt. Der Task-Lifecycle
   selbst kann remote laufen (SSH-Pfad implementiert, gleiche Credentials wie
   Deploy).
5. **`docs/tasks/` war in main untracked** — Task-Datei in den Branch
   kopiert, damit das Ergebnis committed reviewbar ist (siehe Hinweis oben).

### Offene Fragen für den Reviewer

1. Discard-Gate: `confirm:true` nur bei messbarem Verlust (aktueller Stand) —
   oder immer? Immer wäre strenger, aber fügt Reibung für den leeren Fall.
2. `WIP_APPLY_FAILED`: wenn der Stash-Apply in den Worktree scheitert,
   startet der Task trotzdem (laut WARN im Output, Hauptcheckout unangetastet)
   — OK so, oder soll start hier hart scheitern?
3. Soll der Deploy-Pfad (projects_ssh.go) denselben E6-NPR-Retry lernen wie
   die Sandbox? (Außerhalb dieser Task; Fund steht im Report.)
4. Dashboard-Anbindung von `GET /api/projects/task/status` +
   `runtimeDegraded` (WP7-Punkt 4) — Frontend-Follow-up, Daten liegen bereit.

### Branch

`task/014-workspace-integrity`, Worktree
`/home/ji/projects/jimesh/.jimesh-worktrees/task-014-workspace-integrity`.
Commits und letzter Commit-Hash: siehe `## HANDOFF` in
`docs/tasks/subagents/s4/BRIEFING.md` (Hauptrepo — wird vom Executor
angehängt, nicht committed).
