# TASK-030 — Backend/Frontend: Frameworks erweitern + VNC localhost + Ports→Projekt-Zuweisung

> **Status:** ✅ ERLEDIGT (Backend+Frontend, verifiziert) · **Owner:** Recovery-Session nach Hänger, Worktree `agent-a4d9f71e9b274ff5b`
> **Speist:** Sprint 20 WP5 (VNC-Item), Sprint 26/29, Operator-Anfragen 8.9.2026

## Umfang

1. **Frameworks erweitern** (internal/deploy/projects_ssh.go):
   - `opencode` als Framework (neben bestehenden); Image-Referenz ehrlich
     wählen — wenn kein öffentliches Image verifiziert ist: wie beim
     noVNC-Image mit TODO(security) + securityNote im Deploy-Response
     arbeiten statt ein unbekanntes Image stillschweigend zu pullen.
   - `claude-code` und `gemini-cli` als Frameworks (je ein Runtime-Container;
     gleicher Musterpfad wie die existierenden Framework-Entries in
     `frameworkStartsWorkspace`/Category-Mapping, app_categories).
2. **Shell-Tag:** Deployments, deren Framework eine Shell-App ist, bekommen
   das Tag `shell` (sessions/deployment tags) + im Deploy-Response die
   Hinweis-Komponente: Shell-Apps brauchen **entweder VNC oder SSH-Shell**
   — beide Zugangswege im Deployment-Row abbilden (noVNC-Port, SSH-Tunnel-Port).
3. **VNC localhost-only (Sprint 20 WP5 offener Punkt):** im Framework-Deploy
   (projects_ssh.go:1001) `-p $ALLOC_VNC:6080` →
   `-p 127.0.0.1:$ALLOC_VNC:6080` (und dasselbe für VS-Code-Port, falls
   analog offen). Der Zugang läuft dann bewusst nur über den SSH-Tunnel
   (wie bisher), Ports bleiben im Deployment sichtbar — die Ports für
   App (8080) bleiben regulär gebunden, NUR die unauthentifizierten
   noVNC/VS-Code-Web-UIs werden loopback-only. securityNote entsprechend
   anpassen (kein TODO mehr, sondern "loopback-bound by WP5").
4. **Ports→Projekt-Zuweisung (Backend):** Routen prüfen
   (/api/discovery-Row ↔ Projekt-Referenz) und — falls nicht vorhanden —
   `POST /api/projects/{id}/ports/assign {portId|containerId}` bzw. ein
   `project_id`-Feld am discovery-entry ergänzen (store-Änderung klein halten,
   Mandat 7: prüfen, ob discovery entries schon ein project-Feld haben).
   "No Project"-Semantik: entries ohne project_id erscheinen im Frontend
   unter "No Project" (TASK-029) — hier nur das Backend-Feld garantieren.

## Akzeptanz

- [x] opencode/claude-code/gemini-cli erscheinen als wählbare Frameworks
  (app_categories konsistent), Deploy-Response enthält für jedes eine
  ehrliche Image/Security-Note
- [x] Shell-Frameworks tragen das `shell`-Tag; noVNC/VS-Code-Ports werden
  loopback-gebunden und bleiben im Deployment-Row/Ports-Panel sichtbar
- [x] Ports→Projekt-Zuweisung backend-verdrahtet (API_DOCS-Eintrag!)
- [x] go build/vet grün (verifiziert); go test NICHT ausgeführt (siehe Ergebnis);
  Live-Deploy-Verifikation eines Framework-Deployments gegen den lokalen
  Docker-Host durchgeführt (ehrl report)
- [x] `## Ergebnis` + Commits auf Branch

## Regeln

WORKTREE-PROTOCOL: eigener Worktree `.claude/worktrees/`, Branch
worktree-task-030-frameworks-vnc-ports, commit ja, push/merge nein.
src/backend/cmd/socket-guard + egress-Mechanik NICHT umbauen (WP5 ist
live-verifiziert). Restart des geteilten Backends nur koordiniert.

## Ergebnis

Diese Session hat eine vorherige, gehängte Session übernommen (Worktree
`.claude/worktrees/agent-a4d9f71e9b274ff5b`, 7 Dateien uncommitted). Der
vorgefundene Backend-Diff wurde kritisch gegen die Akzeptanzkriterien
geprüft (nicht blind übernommen), eine Frontend-Lücke ergänzt, dann committed.

### Geändert

- `src/backend/internal/deploy/projects_ssh.go` — `claude-code`/`gemini-cli`
  als Frameworks (npm-install auf `node:22-bookworm` zur Deployzeit, da kein
  verifiziertes öffentliches Image existiert — ehrliches `TODO(security, …)`
  + `securityNote` je Framework, gleiches Muster wie das bestehende
  opencode-noVNC-TODO). `isShellFramework()` (neue Funktion) taggt
  dsh/opencode/claude-code/gemini-cli (+ `_code_server`-Varianten) als
  `"shell"`; Deploy-Response nennt jetzt beide Zugangswege (SSH-Tunnel
  `docker exec`, loopback-gebundener noVNC-Port wo real vorhanden) plus
  `tags`/`shellAccess`-Felder.
- **VNC/VS-Code loopback-binding (Item 3, Sprint 20 WP5):** war bereits VOR
  dieser Session im Code (`dockerBindLoopback = "127.0.0.1:"`, verifiziert per
  `git show 9f769e0:…` — sowohl `$ALLOC_VNC:6080` als auch `$ALLOC_VS:8443`
  waren am Branchpunkt schon loopback-gebunden). Nicht neu angefasst, nur
  geprüft und live bestätigt (siehe unten).
- `src/backend/internal/security/exposure.go` (+179 Zeilen) — neue
  `POST /api/projects/{id}/ports/assign` (Body `{containerId?, portId?}`,
  400/404 auf Fehlfälle) persistiert eine manuelle Port/Container→Projekt-
  Zuordnung über die bestehende `settings`-Tabelle (kein neues Table, Mandat 7).
  `GET /api/security/exposure` löst `project_id`/`project_name` pro Port auf:
  projekt-eigener Node → direkt zugeordnet; lokaler Mixed-Node →
  Container-Name-Match gegen `jimesh-framework-<id>-`/`jimesh-codeserver-<id>-`,
  dann die manuelle Zuweisung; sonst leer ("No Project").
- `src/backend/internal/store/store.go` — `containers.tags`-Spalte
  (Migration `ADD COLUMN IF NOT EXISTS`-Pattern) + `SaveContainer(..., tags
  []string)`-Signaturänderung, an allen 3 bestehenden Call-Sites nachgezogen
  (`projects_ssh.go` ×3, `provisioning/bridge.go` ×1).
- `src/backend/internal/store/rbac.go` — `gemini-cli` → `"Coding Tools"` in
  `TypeToCategory`.
- `API_DOCS.md` — neue Route dokumentiert, `/api/security/exposure` und
  `/api/projects/deploy` Notizen um die neuen Felder ergänzt.
- `src/frontend/src/views/ProjectsPage.tsx` — **Lücke gefunden und
  geschlossen:** der Backend-Diff unterstützte `claude-code`/`gemini-cli`
  bereits, aber `Project['framework']`-Union und beide Deploy-Dropdowns
  (Create + Edit) hatten die neuen Werte nicht — die Frameworks waren also
  entgegen Akzeptanzkriterium 1 NICHT wählbar. Ergänzt: Type-Union, 2×
  `<select>`-Optionen, `hasVSCode`-Checks (4 Stellen) + VS-Code-Port-Guard für
  die `_code_server`-Varianten. Zusätzlich: neues `isShellOnlyFramework`-Flag
  — claude-code/gemini-cli-Container laufen nur `npm install -g …; sleep
  infinity`, nichts hört auf dem App-Port. Ein Iframe dagegen wäre genau die
  Art stille Lüge, die das No-Mock-Mandat verbietet — der "Active Framework
  UI"-Tab zeigt für diese beiden jetzt einen echten Hinweis (docker exec /
  SSH-Tunnel, oder VS-Code-Server-Tab) statt eines toten Iframes. opencode/dsh
  unverändert.

### Build/Test-Status (ehrlich)

- `docker run --rm -v $(pwd)/src/backend:/src -v /home/ji/go/pkg/mod:/go/pkg/mod -v jimesh_go-build:/root/.cache/go-build -w /src golang:latest sh -c 'go build ./... && go vet ./...'`
  → **grün, keine Ausgabe/Fehler** (Modul-Cache-Mount nach Makefile-Vorbild
  ergänzt, ohne Mount schlägt der Container mangels Netzzugriff auf
  proxy.golang.org fehl). Ausgeführt vor UND nach dem Merge von main.
- `go test` — **nicht ausgeführt.** Das Protokoll verlangt explizit nur
  build+vet im Container; ein throwaway-DB-Testlauf (`make go-test`) hätte
  den geteilten Compose-Stack gebraucht, was ich nicht koordiniert habe.
- Frontend: `npx tsc --noEmit -p tsconfig.app.json` und `npx eslint
  src/views/ProjectsPage.tsx` liefen nach `npm install` (Netzzugriff
  vorhanden, `node_modules` fehlte im Worktree). Beide zeigen ausschließlich
  bereits vorher vorhandenes Rauschen (unused imports, `no-explicit-any` auf
  altem Code, eine `Date.now()`-Purity-Warnung) — **null neue Fehler auf
  irgendeiner von mir angefassten Zeile**, verifiziert per Zeilenabgleich.
- **Live-Verifikation (echt, nicht behauptet):** die gehängte Vorgänger-
  Session hatte bereits einen isolierten Verify-Stack laufen
  (`jimesh-verify-pg`/`-redis`/`-backend`, Backend-Binary auf
  `127.0.0.1:18099`, gebaut aus demselben uncommitted Diff) UND einen echten
  claude-code-Deploy: Container `jimesh-framework-task030-verify-82113`,
  Image `node:22-bookworm`, `docker inspect` zeigt
  `127.0.0.1:28080->3080/tcp`. Bestätigt:
  - Host-`ss -tlnp` zeigt `127.0.0.1:28080` — echt loopback-only, nicht nur
    behauptet (Mandat 12: nur `ss`/die Mapping selbst sagen die Wahrheit).
  - `docker exec … which claude` → `/usr/local/bin/claude`,
    `/tmp/claude-code-install.log` zeigt `added 2 packages in 1m` — der
    npm-install-Pfad funktioniert wirklich end-to-end, nicht nur im Code.
  - `curl http://127.0.0.1:18099/health` → 200; `curl …/api/projects` und
    `curl -X POST …/ports/assign` → beide korrekt `401 authentication
    required` (Session-Gate greift, Route ist registriert und antwortet ohne
    Panic — ein Routing-Konflikt mit dem bestehenden `/api/projects/{id}/ports`
    hätte hier sichtbar werden müssen). **Kein authentifizierter End-to-End-
    Test der neuen Route** — dafür fehlten mir Dashboard-Login-Credentials;
    das ist eine ehrliche Lücke, kein verschwiegener Fehlschlag.
  - Diesen Verify-Stack habe ich unangetastet gelassen (nicht Teil meines
    Commits, gehört der vorherigen Session / dem Reviewer zur Inspektion).

### Abweichungen von der Task-Vorgabe

- Item 4 nennt als Ansatz `/api/discovery-Row ↔ Projekt-Referenz`. Verifiziert
  (und von der parallel gemergten TASK-029-Session unabhängig genauso
  festgestellt, `SecurityExposurePage.tsx:194-201`): `/api/discovery`s
  `DiscoveredContainer` trägt **keinerlei** Projekt- oder Port-Referenz. Die
  Zuweisung wurde stattdessen an `/api/security/exposure` (das bereits
  Container-/Port-Detail pro Node liefert) und `containerId`/`portId`
  angebunden — inhaltlich näher an der Task-Absicht als der genannte, aber
  nicht existente Datenpfad.
- Branch heißt `worktree-agent-a4d9f71e9b274ff5b`, nicht wie in "Regeln"
  gefordert `worktree-task-030-frameworks-vnc-ports` — laut Auftrag der
  übernehmenden Session ausdrücklich beizubehalten ("don't rename it, don't
  create a new worktree"), hier vermerkt statt stillschweigend umbenannt.
- `git merge main` (nicht rebase) wurde durchgeführt wie vom Auftrag verlangt
  — main war zum Merge-Zeitpunkt bereits 3 Commits weiter als im Auftrag
  beschrieben (zusätzlich `a63ec77` TASK-029-Frontend-Runde). Merge war
  konfliktfrei; Build/Vet/tsc/eslint danach erneut grün.

### Offene Fragen für den Reviewer

1. **TASK-029s Frontend ist jetzt stale in einer Aussage:** `SecurityExposurePage.tsx:214-219`
   (`AssignToProjectPicker`) sagt explizit "no backend route persists this
   assignment yet" und hält die Auswahl nur im lokalen React-State. Das
   stimmte, als TASK-029 geschrieben wurde — seit diesem Commit gibt es
   `POST /api/projects/{id}/ports/assign`. Ob/wie man diesen Picker an die
   neue Route anschließt (die Route erwartet `containerId`, das discovery-Row
   `id` müsste dafür als Docker-Container-ID verifiziert werden) habe ich
   NICHT angefasst — das ist TASK-029-Terrain, nicht Teil dieses Scopes.
2. Kein authentifizierter curl-Test von `POST …/ports/assign` — nur der
   401-Pfad wurde live bestätigt. Der Reviewer sollte einen echten
   Dashboard-Login + Assign-Roundtrip einmal fahren.
3. `go test` lief nicht (siehe oben) — falls der Reviewer das für Merge-
   Freigabe braucht, bitte koordiniert gegen den geteilten Stack anstoßen.
4. `internal/metadata/ontology.go` hat einen `claude-code`-Eintrag (Tech-
   Erkennung nach Image-Name für die Exposure-Kategorisierung), aber keinen
   für `gemini-cli` — beide würden ohnehin nicht zuverlässig per Image-Name
   erkannt (beide nutzen `node:22-bookworm` als Basis), daher nicht ergänzt.
   Vorbestehende Inkonsistenz, nicht von dieser Session verursacht.
5. Der laufende `jimesh-verify-*`-Stack (pg/redis/backend) und der
   `jimesh-framework-task030-verify-82113`-Container wurden absichtlich NICHT
   aufgeräumt (Protokoll: "Kein Aufräumen des Worktrees" — sinngemäß auch für
   Verify-Artefakte, die als Beleg dienen). Der Reviewer/Operator sollte sie
   nach Review stoppen.

### Branch

worktree-agent-a4d9f71e9b274ff5b, Commits seit `9f769e0` (Branchpunkt): 3
eigene (2 Feature-Commits + 1 Merge von main), letzter Commit wird nach
diesem Report-Commit `git log -1` sein.
