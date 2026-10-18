# TASK-009 — Workspace-Berechtigungen statt chmod 777

> **Status:** ⏳ OFFEN · **Vorbedingung:** `docs/tasks/WORKTREE-PROTOCOL.md` gelesen
> **Branch:** `task/009-workspace-perms` · **Speist:** Sprint 20 WP0-Restfunde

## Kontext

`src/backend/internal/gateway/projects_ssh.go:490` und `:492` machen den kompletten
Agent-Workspace world-writable:

```
docker run --rm -v %s:/target alpine chmod -R 777 /target
chmod -R 777 %s || true
```

Das war laut TASK-001-Fund (Deployment-Security-Fix, siehe Sprint-20-WP0-Historie) nötig,
damit code-server unter UID 1000 (statt Root) den Workspace beschreiben kann.

## Auftrag

1. Finde heraus, welche UIDs tatsächlich in den Workspace schreiben müssen — heute
   ist das der code-server-Prozess (UID 1000, seit dem WP0-Fix) und ggf. der
   Deploy-Prozess selbst (welche UID hat der?).
2. Ersetze `chmod -R 777` durch eine engere Variante:
   - Bevorzugt: `chown -R 1000:1000` (oder die tatsächlich passende UID) statt
     world-writable.
   - Falls mehrere UIDs schreiben müssen (Host-Prozess + Container-UID
     unterschiedlich): `chmod -R 770` mit passender Gruppen-Zuordnung, oder ein
     gemeinsames GID-Schema.
3. Prüfe beide Fundstellen — die eine läuft über einen Alpine-Hilfscontainer, die
   andere direkt auf dem Host über SSH. Beide müssen konsistent behandelt werden.
4. Wenn eine Variante am Ende doch 777 braucht (z. B. weil Host-UID und
   Container-UID nicht im Vorfeld bekannt sind): Kommentar mit Begründung, keine
   stille Lösung.

## Nicht tun

- Nicht das gesamte Deployment-Auth-Modell umbauen — nur diese eine
  Berechtigungs-Frage.
- Keine neuen Abhängigkeiten.

## Akzeptanz

- `make go-build`/`go-vet` sauber.
- Ein frisches Deployment kann weiterhin über code-server im Workspace schreiben
  UND lesen (falls live testbar; sonst den Rechte-Pfad im Report nachvollziehbar
  erklären: welche UID schreibt, welche liest, welches Chmod/Chown das abdeckt).

## Ergebnis

> **Status: ERLEDIGT** — Branch `task/009-workspace-perms`, 1 Commit (`da26435`), build+vet exit 0, Branch-Tests der erzeugten Shell grün. Report-formatiert nach Worktree-Protokoll §6. (Hinweis: `docs/tasks/` ist seit ac722d0 gitignored — diese Datei liegt im Hauptcheckout kanonisch und als Kopie im Worktree auf Disk, ist aber NICHT im Branch committed; vollständiger Report zusätzlich im Commit-Message-Text von `da26435`.)

## Geändert

- `src/backend/internal/gateway/projects_ssh.go:488-542` (alt 489-493) — **beide** `chmod -R 777`-Fundstellen ersetzt durch die gemeinsame Policy-Funktion `jimesh_ws_perms` (ein Go-String, beide Call-Sites teilen ihn — Drift ausgeschlossen): lokal `docker run --rm -v <ws>:/target alpine sh -c '<fn>; jimesh_ws_perms /target'`, remote Funktionsdefinition + `jimesh_ws_perms <ws> || true`.
  - Zweig 1 (CAP_CHOWN vorhanden — immer der lokale Alpine-Helper, i. d. R. SSH-root): `chown -R 1000:1000` + `chmod -R u+rwX,go=rX`. Das `=`-Präfix ist der Kernpunkt: Legacy-Workspaces sind von alten Deploys schon 777, ein nacktes chown (oder `+`-chmod) lässt die Welt-Schreibbits bestehen.
  - Zweig 2 (Non-Root-SSH-User ohne CAP_CHOWN, Besitzer der frisch erzeugten Files): `setfacl -R -m u:1000:rwX` + Default-ACLs auf Dirs (`find -type d -exec setfacl -m d:u:1000:rwX {} +`, best-effort) + `chmod -R o-w`.
  - Zweig 3 (dokumentierter Last-Resort, nur wenn beides fehlt): `chmod -R a+rwX || true` — effektive Reichweite identisch zum alten `chmod 777 || true` (root-owned Files waren nie fixbar), mit Begründungs-Kommentar im Code (Task-Option 4: „keine stille Lösung").
- `src/backend/internal/gateway/projects_ssh.go:652-658` — code-server-Kommentar aktualisiert („workspace is chowned to uid 1000 above (jimesh_ws_perms …)" statt „chmod 777 above").
- `docs/sprints/SPRINT-20-KLAF-FOUNDATION.md:80` — WP0-Item abgehakt mit Verifikationsvermerk (Documentation Mandate).
- `API_DOCS.md` — bewusst **unverändert**: keine HTTP-Route berührt, nur Deploy-Shell-Befehle.
- `docs/backlog/BACKLOG.md` — bewusst **nicht angefasst** (Protokoll §7: Zusammenführung macht ausschließlich Claude beim Review).

**UID-Analyse (Auftrag 1):** Schreibende im Workspace sind (a) code-server mit hartkodiertem `-e PUID=1000 -e PGID=1000` (`projects_ssh.go:~670`), (b) Framework-/Runtime-Container — `runtimeImage()` liefert offizielle Images (python/golang/node/docker/ubuntu) und das dsh-Image, alle laufen default als root; root umgeht Rechteprüfungen, 777 war nie der Grund, dass sie funktionieren; (c) der Deploy-Prozess selbst: lokal root (docker-compose.yml setzt `user: "0:0"` für den Backend-Container), remote der SSH-Login-User — häufig root, Non-Root wird vom ACL-Zweig abgedeckt. Einziger bekannter Non-Root-Konsument mit unbekannter UID: das unauditierte `ghcr.io/ji-podhead/opencode-vnc:latest` (nicht auf diesem Host inspectierbar; TODO(security, noVNC) im Code).

## Build/Test-Status (ehrlich)

- `make go-build` → **exit 0** (golang:latest-Container gegen den Worktree, Caches wie im Makefile).
- `make go-vet` → **exit 0**; fand im ERSTEN Entwurf einen echten Bug (`fmt.Sprintf` mit 2×`%s`, 1 Arg — der Alpine-Helper bekam den Workspace-Pfad gar nicht) → behoben, danach exit 0; zweiter Lauf nach der `go=rX`-Korrektur erneut exit 0.
- `gofmt -l` (Container): `projects_ssh.go` clean — nicht in der Liste der 27 vorbestehenden unformatierten Gateway-Dateien (in Main identisch 27, also nichts Neues, nichts von mir).
- **Funktional, mit der EXAKT erzeugten Shell** (aus dem Quelltext zwischen den Backticks extrahiert, in Containern ausgeführt):
  1. Root-Caller (Deckung: lokaler Alpine-Helper + SSH-root) über Legacy-777-Baum: alle Dateien `1000:1000`; 644 bleibt 644, Exec-Datei bleibt 755, Legacy-777-Datei verliert o+w (→755), Dir 755.
  2. Non-Root-Caller uid 999 mit setfacl (golang:latest + `apt-get install acl`; Deckung: SSH-User ohne CAP_CHOWN): chown schlägt fehl → ACL-Zweig: ACL `user:1000:rwx` gesetzt, Default-ACLs auf Dirs, 777→775 (o-w weg), **uid 1000 schreibt+liest ✓, uid 1234 Schreibversuch verweigert ✓**, rc=0.
  3. Non-Root-Caller uid 999 OHNE setfacl (alpine/busybox): Last-Resort-Zweig → a+rwX, rc=0 — exakt das alte Verhalten, dokumentiert, kein Stillstand.
  4. Root-owned File (700, 0:0) + Non-Root-Caller: rc=0, Datei unverändert — dieselbe Grenze wie das alte `chmod 777 || true` (Root-Files waren nie fixbar; kein Stillstand des Deploys).
  5. Guards: nicht existierendes Verzeichnis / leerer Pfad → rc=0 (Deployment bricht nicht ab).
  6. `&&`-Join beider Call-Site-Formen (Inline-in-`sh -c` und Definition+Aufruf) mit `sh -n` und `bash -n` geparst; GNU-setfacl-`rwX`-Semantik per Probe bestätigt (`user:1000:rwx` im ACL-Output).
- **NICHT ausgeführt:** Live-API-Deploy (`make restart-backend` + `POST /api/projects/deploy` + code-server-Schreibtest am echten Workspace). Grund: der Dev-Stack läuft aus dem Hauptcheckout; das Worktree-Protokoll verbietet mir jeden Eingriff dort. Der Rechte-Pfad ist stattdessen auf Befehlsebene end-to-end belegt (Tests 1-4): **code-server (uid 1000) schreibt und liest als Besitzer** (Root-Fall: chown) **bzw. via ACL** (Non-Root-Fall); alle anderen verlieren Schreiben, behalten Lesen+Traversieren.

## Abweichungen von der Task-Vorgabe

1. **Worktree-Pfad:** `../jimesh-worktrees/task-009-workspace-perms` war im Sandbox-Kontext nicht erstellbar (nur `/home/ji/projects/jimesh` beschreibbar; Eskalation ohne verfügbaren Approval-Kanal → fail-closed). Worktree liegt stattdessen in `worktrees/task-009-workspace-perms` — dasselbe Muster wie task-013/014. Isolation vollständig gewahrt: eigener Branch von `main` (c61cfd5), Hauptcheckout nie editiert/committed/gechecked-out.
2. **Task-Datei nicht committed** (Abweichung von Protokoll §7): `docs/tasks/` ist seit `ac722d0` gitignored („moved to .gitignore ahead of making the repo public"). Ein `git add -f` hätte interne Koordinations-Dateien ins zu veröffentlichende Repo zurückgebracht — gegen die explizite Repo-Entscheidung. Diese Datei liegt gefüllt im Hauptcheckout (kanonisch) und als Kopie im Worktree auf Disk; der vollständige Report steht zusätzlich im Commit-Message-Text von `da26435`. Falls der Operator sie doch im Branch will: `git add -f docs/tasks/TASK-009-wp0-workspace-perms.md && git commit`.
3. **Enger als die Task-Präferenz „nur chown":** zusätzlich `chmod -R u+rwX,go=rX` NACH dem chown — sonst bleiben bei Re-Deploys auf Legacy-Workspaces die 777-Bits bestehen (das `=` entfernt sie aktiv; verifiziert in Test 1).
4. **group/other behalten Lesen+Traversieren** (statt Task-Option „770"): die Runtime-UID des unauditierten opencode-vnc-Images ist unbekannt; unter 777 hatte es Lesen. Schreiben ist jetzt überall entfernt. Falls 770 gewünscht: eine Zeile (`go=rX` → `go=` bzw. `-rwx`-Stufen) ändern.
5. **Zeilenangaben der Task gedriftet:** Task nennt `:490`/`:492` — die Fundstellen standen exakt dort (vor dem Edit), sind jetzt `:488-542` (neuer Block). Inhaltlich unverändert adressiert.

## Offene Fragen für den Reviewer

1. **opencode-vnc:** unbekannte Runtime-UID (Image nicht auf diesem Host). Läuft es als Non-Root ≠ 1000, verliert es Schreibzugriff auf den Workspace (Lesen bleibt). Akzeptabel? Das Image ist ohnehin unauditiert (TODO(security, noVNC) im Code); ist es root oder 1000, ändert sich für es nichts.
2. **GNU setfacl expandiert `rwX` auf Plain-Files zu `rwx`** (Probe: `user:1000:rwx` auf einer 644-Datei) — uid 1000 bekommt x auf Textdateien im ACL-Zweig, im chown-Zweig nicht. Harmlos (keine Binaries im Workspace), aber inkonsistent — mit `find -type d`/`-type f`-Doppellauf straffen?
3. **Legacy-Workspaces:** Redeploy genügt als Migration (das neue `=`-chmod entfernt 777 beim nächsten Deploy automatisch, siehe Test 1). Reicht ein Operator-Hinweis, oder soll eine Migrationsnotiz in die Docs (Mandat 8 betrifft DB-Zeilen, nicht Filesysteme — habe bewusst nichts in migrate()/SeedDefaults() gebaut)?
4. **Live-Check beim Operator** (exakte Kommandos): `make restart-backend`, dann ein frisches Deployment mit Framework `dsh_code_server` auf einen Test-Workspace, dann im code-server-Terminal als uid 1000 schreiben+lesen, und auf dem Node `find <workspace> -perm -o=w | head` — muss **leer** bleiben (vorher: alles).

## Branch

task/009-workspace-perms, Commits: 1, letzter Commit: `da26435`
