# TASK-010 — WP0-Restaufräumung: toter Code, veraltete Doc-Links, .env.example

> **Status:** ✅ FERTIG · **Vorbedingung:** `docs/tasks/WORKTREE-PROTOCOL.md` gelesen
> **Branch:** `task/010-wp0-cleanup-misc` · **Speist:** Sprint 20 WP0-Restfunde

Vier unabhängige, kleine Aufräum-Punkte. Jeder einzeln committen (klarer Diff pro Fund).

## 1. Toter Code in `projects_ssh.go`

Zeile ~580: `sed -i "s/5173:5173/\$ALLOC_PORT:5173/g" .../docker-compose.yml` — das
Muster passt auf die aktuelle Remote-Compose-Datei nicht mehr (die bindet bereits auf
`127.0.0.1:19090:5173`, kein bloßes `5173:5173` mehr). Prüfen:
- Ist der Code wirklich tot (`grep` gegen alle deploybaren Compose-Templates)?
- Falls ja: entfernen, mit Kommentar im Commit, warum.
- Falls er auf einem alten Checkout doch noch greifen könnte (Altbestand bei
  Kunden): NICHT entfernen, sondern robuster machen (das Muster auch für die neue
  Bind-Form erkennen), da er sonst auf `0.0.0.0` publizieren würde.

## 2. Tote Doc-Links in `OPERATOR_GUIDE.md`

Zeilen 127 und 129 verlinken auf `./docs/architecture.md` und
`./docs/PROJECT_STRUCTURE.md` — beide liegen inzwischen unter `docs/legacy/`
(verschoben in Sprint 20). Korrigieren:
- `docs/architecture.md` → `docs/ARCHITECTURE.md` (das gepflegte Uppercase-Doc,
  nicht die verschobene Legacy-Version — Sinn des Links war "component walkthrough",
  das ist heute das gepflegte Doc)
- `docs/PROJECT_STRUCTURE.md` → `docs/legacy/PROJECT_STRUCTURE.md` (falls der Link
  bewusst auf das Legacy-Directory-Layout zeigen sollte) — ODER, besser: prüfen ob
  es ein aktuelles Pendant gibt und darauf verlinken. Falls nicht: auf die Legacy-Version
  verlinken, aber mit einem Hinweis im Linktext, dass es historisch ist.

## 3. `docs/i18n/zh-CN/` — ~10 tote Links

`grep -rln "docs/install.md\|docs/architecture.md\|desktop/README.md" docs/i18n/zh-CN/`
— alle Fundstellen auflisten. Diese Übersetzungen sind Upstream-Erbe (FreeLLMAPI) und
kein Fokus dieses Projekts. **Nicht neu übersetzen.** Nur entscheiden und ausführen:
entweder analog zu den deutschen Docs nach `docs/legacy/i18n/zh-CN/` verschieben,
oder einen einzigen Hinweis-Block oben in `docs/i18n/zh-CN/README.md` ergänzen, der
sagt, dass die Übersetzung veraltet ist. Letzteres ist der günstigere Weg — bevorzugen,
außer der Ordner ist so klein, dass ein Verschieben trivial ist.

## 4. `.env.example` — FreeLLMAPI-Reste

Fundstellen: `ENCRYPTION_KEY=` (Code liest `JIMESH_ENCRYPTION_KEY`, siehe
`grep -rn "JIMESH_ENCRYPTION_KEY" src/backend/`), `PORT=3001`, mehrere SQLite-Absätze
(Zeilen ~3, ~242, ~247, ~255 zur Orientierung — verifiziere selbst, die Datei kann
sich verschoben haben).

Gehe systematisch vor:
1. `grep -rhoE '"[A-Z_]+"|os\.Getenv\("[A-Z_]+"\)' src/backend/ | sort -u` (oder
   äquivalent) um die tatsächlich gelesenen Env-Var-Namen zu ermitteln.
2. `.env.example` komplett gegen diese Liste abgleichen.
3. Alles entfernen, was der Go-Code nicht liest (SQLite-Pfade, `PORT=3001`,
   Node-spezifische Vars).
4. Alles ergänzen, was der Go-Code liest und in `.env.example` fehlt
   (`JIMESH_ENCRYPTION_KEY`, `VAULT_ADDR`, `VAULT_TOKEN`, `DATABASE_URL`, etc. —
   gegen `docker-compose.yml` cross-checken für die vollständige Liste).
5. Jede verbleibende Variable behält eine kurze Kommentarzeile, die sagt, wofür
   sie ist — Stil wie in der bestehenden Datei.

## Akzeptanz

- Vier separate Commits, einer pro Punkt.
- `make go-build`/`go-vet` sauber (Punkt 1 ist der einzige mit Code-Auswirkung).
- Keine toten Links mehr in `OPERATOR_GUIDE.md` zu verschobenen Pfaden.

## Ergebnis

### Geändert

- `src/backend/internal/gateway/projects_ssh.go:579-580` — toter Code entfernt: der
  `sed -i "s/5173:5173/$ALLOC_PORT:5173/g"`-Befehl samt Kommentar (Commit `31f954b`).
- `OPERATOR_GUIDE.md:127,129` — tote Links ersetzt: `./docs/architecture.md` →
  `./docs/ARCHITECTURE.md` (gepflegtes Doc); `./docs/PROJECT_STRUCTURE.md` →
  `./docs/legacy/PROJECT_STRUCTURE.md` mit Hinweis im Linktext
  „(historical, FreeLLMAPI-era)“ (Commit `ad5a8c4`).
- `docs/i18n/zh-CN/` → `docs/legacy/i18n/zh-CN/` — kompletter Ordner verschoben
  (4 Dateien, 906 Zeilen; Commit `549cffc`). Fundstellen der toten Links (grep aus
  der Task): `docs/i18n/zh-CN/README.md` (Zeilen 51, 161, 180, 188, 298, 302, 324 —
  `docs/install.md`/`docs/architecture.md`), `docs/i18n/zh-CN/docs/README.md:22`
  (`desktop/README.md`), `docs/i18n/zh-CN/docs/install.md:221` (`desktop/README.md`).
  Aufgelöst tot: `../../architecture.md` (→ `docs/i18n/architecture.md`, 4x),
  `desktop`/`desktop/README.md` (5x), `server/src/db/README.md` (1x),
  `client/src/i18n/*` (2x), `index.html`/`install.sh`/`install.ps1`/`success.html` (4x).
- `docs/legacy/i18n/README.md` — neu, 7 Zeilen: Mini-Explainer (historisch,
  FreeLLMAPI-Erbe, beschreibt nicht dieses Repo), repariert den `../README.md#status`-
  Link der verschobenen zh-README.
- `docs/README.md:45` — i18n-Eintrag aktualisiert (Policy-Verweis + Legacy-Pfad).
- `docs/api.md:12` — zh-CN-Link → `legacy/i18n/zh-CN/docs/api.md`.
- `.env.example` — komplett neu geschrieben (96 Zeilen statt 342, Commit `e83410f`):
  nur noch Variablen, die der Go-Code wirklich liest, jede mit Kommentarzeile;
  compose-manage Variablen (`DATABASE_URL`, `REDIS_URL`, `VAULT_ADDR`, `VAULT_TOKEN`,
  `PORT`, `HOST_BIND`) dokumentiert aber auskommentiert (Compose `environment:` gewinnt
  über `env_file:`).

### Build/Test-Status (ehrlich)

`docker run --rm -v /home/ji/projects/jimesh/.jimesh-worktrees/task-010-wp0-cleanup-misc/src/backend:/src -w /src -v /home/ji/go/pkg/mod:/go/pkg/mod golang:latest sh -c 'go build ./... && go vet ./...'`
→ **Exit 0, keine Ausgabe** (einmalig nach allen vier Commits; Punkt 1 war der einzige
Code-touch, die restlichen drei sind Docs/Config). `make go-test` nicht ausgeführt —
der Dev-Stack läuft im Hauptcheckout, und die Tests brauchen die laufende DB; für einen
zwei-Zeilen-Deletion-Diff ist build+vet die verhältnismäßige Prüfung (Mandat 6).

### Abweichungen von der Task-Vorgabe

1. **Worktree-Pfad:** Task sagt `../jimesh-worktrees/task-010-wp0-cleanup-misc`; tatsächlich
   liegt er unter `/home/ji/projects/jimesh/.jimesh-worktrees/task-010-wp0-cleanup-misc`.
   Grund: das übergeordnete Verzeichnis war aus der Agent-Sandbox nicht beschreibbar
   (`worktree add` schlug mit read-only-Dateisystem fehl, Eskalation ohne Approval-Kanal
   nicht möglich). Das Muster existiert bereits (task-014 nutzt denselben Pfad).
2. **Item 3 — Verschieben statt Hinweis-Block:** Task bevorzugt den Hinweis-Block,
   außer der Ordner ist klein. Der Ordner war klein (4 Dateien), also griff die
   Ausnahme-Regel. Zusatznutzen: der Move repariert den bereits bestehenden toten Link
   in `docs/legacy/install.md:1` (der zeigte schon auf `i18n/zh-CN/docs/install.md`
   relativ zu `docs/legacy/`) und die `architecture.md`/`install.md`-Links innerhalb
   der zh-Doku (aus dem neuen Basispfad zeigen sie auf `docs/legacy/*`).
3. **Item 4 — `REDIS_ENABLED` entfernt:** Compose setzt `REDIS_ENABLED=true`, aber
   kein Go-Code liest diese Variable (das Enable-Flag ist `-redis-enable` in
   `cmd/server/main.go:123`, per entry-script nicht gesetzt; `agents.go:48` erwähnt den
   Namen nur in einer Fehlermeldung). Nicht in der Task genannt — Beobachtung, nicht
   stillschweigend entschieden: die Variable steht weiterhin in `docker-compose.yml`,
   das zu ändern war nicht Teil dieses Tasks.
4. **Item 4 — `PORT` dokumentiert statt entfernt:** Der Go-Code liest kein `PORT`, aber
   `scripts/backend-entry.sh:24` schon (`-http-port=${PORT:-3010}`). Da Compose `PORT=3010`
   fest setzt (environment gewinnt über env_file), ist die Variable in `.env` wirkungslos —
   deshalb nur auskommentiert dokumentiert, nicht als aktiver Wert.
5. **Item 4 — `GEMINI_API_KEY1` nicht dokumentiert:** `gateway.go:2835/3157/3886` liest
   im Gemini-Fallback `GEMINI_API_KEY1` (mutmaßlicher Tippfehler, danach `GOOGLE_API_KEY`);
   `service.go:1725` (AutoDiscoverKeys) liest `GEMINI_API_KEY`. `.env.example` dokumentiert
   die korrekten Namen; der Tippfehler-Name ist ein Code-Fund, kein Doku-Fund.

### Offene Fragen für den Reviewer

1. Item 1 — passt die Entfernungs-Entscheidung zur Absicht? Das Muster `5173:5173` hat in
   KEINER Revision der einzigen deploybaren Compose-Datei existiert (Initial-Commit
   `faea7f1` hatte `9090:5173`, aktuell `127.0.0.1:19090:5173`), und die Deploy-Kette
   macht unmittelbar vor dem sed `git reset --hard origin/main` — ein Alt-Checkout kann
   den sed-Schritt also nie erreichen. Falls doch eine Legacy-Situation bestehen sollte,
   wäre die Alternative gewesen, das Muster für die neue Bind-Form robuster zu machen
   (Task-Variante 2) — ich habe Variante 1 (entfernen) gewählt, weil ein patterns-
   rewrites auch `$ALLOC_PORT:5173` ohne Bind-Adresse produziert hätte (0.0.0.0,
   Mandat 12).
2. Item 3 — akzeptiert der Reviewer den Move inkl. Mini-Explainer, oder soll stattdessen
   (oder zusätzlich) der Hinweis-Block in der zh-README selbst stehen?
3. Item 4 — `REDIS_ENABLED` in `docker-compose.yml` (Zeile 74) ist totes Compose-Env.
   Rauswerfen? (Nicht Teil dieses Tasks, nur notiert.)
4. Item 4 — `GEMINI_API_KEY1` in `gateway.go` (3 Stellen) ist mutmaßlich ein Tippfehler
   für `GEMINI_API_KEY`. Fixen? (Nicht Teil dieses Tasks.)

### Branch

`task/010-wp0-cleanup-misc`, Commits: 4 (+ 1 für diese Ergebnis-Sektion), letzter Commit: siehe HANDOFF im Hauptrepo.
