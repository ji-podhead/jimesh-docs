# Worktree-Protokoll für ausgelagerte Tasks (GLM-5.3 / DSH)

> **Zweck:** Diese Datei ist der verbindliche Präfix für jede Task, die an ein
> externes Modell (GLM-5.3 via DSH) ausgelagert wird. Jede Task-Datei unter
> `docs/tasks/TASK-0NN-*.md` verweist hierher statt die Regeln zu wiederholen.
> **Claude reviewt jedes Ergebnis, bevor irgendetwas nach `main` geht.**

## 1. Isolation — Pflicht, keine Ausnahme

```bash
git -C /home/ji/projects/jimesh worktree add -b task/0NN-<slug> \
    ../jimesh-worktrees/task-0NN-<slug> main
```

* Arbeite **ausschließlich** im Worktree-Verzeichnis. Niemals im Hauptcheckout
  (`/home/ji/projects/jimesh`) editieren, committen oder `git checkout` auf `main`
  ausführen — dort läuft der aktive Dev-Stack (`docker compose`), ein Checkout-Wechsel
  reißt den Container-Mount weg.
* Branch-Name exakt wie in der Task-Datei angegeben (`task/0NN-<slug>`).
* **Kein `git push`, kein `git merge`, kein `git rebase` auf `main`.** Committen reicht.
  Die Zusammenführung entscheidet der Operator nach Claudes Review.
* Wenn die Task nur Dokumentation ändert, gilt dasselbe — auch Docs-Änderungen laufen
  über den Worktree, damit der Diff sauber reviewbar ist.

## 2. Kontext, den du vor dem ersten Edit gelesen haben musst

In dieser Reihenfolge, alle im Hauptrepo (nicht im Worktree — die Docs sind identisch,
aber falls das Umschalten Zeit spart, hier lesen):

1. `CLAUDE.md` — Build-Kommandos, Architektur-Constraints
2. `MANDATES.md` — **bindend**, insbesondere Mandat 2 (No-Mock), Mandat 6 (Verifikation),
   Mandat 7 (Pure Go, keine Dependency ohne Not), Mandat 9 (Zero-Trust Secrets),
   Mandat 12 (Port-Bindings explizit)
3. `docs/K-LAF-ARCHITECTURE.md` — Sicherheitsarchitektur, falls die Task K-LAF betrifft
4. Die konkrete Task-Datei selbst — sie nennt die genauen Dateien/Zeilen

**Nicht raten, nicht großzügig interpretieren.** Wenn eine Task-Datei eine Zeilennummer
nennt und der Code dort inzwischen anders aussieht: kurz im Report vermerken und mit der
inhaltlichen Absicht der Task weiterarbeiten, nicht mit der wörtlichen Zeile.

## 3. Ehrlichkeits-Regel (aus `docs/tasks/README.md`, hier verschärft)

* Jede Behauptung über den Zustand des Codes braucht eine Fundstelle (Datei:Zeile).
* **Kein Build-Erfolg behaupten, den du nicht ausgeführt hast.** Dieses Repo hat kein
  Go auf dem Host — Build läuft im Container:
  ```bash
  docker run --rm -v $(pwd)/src/backend:/src -w /src golang:latest \
      sh -c 'go build ./... && go vet ./...'
  ```
  (Pfad `$(pwd)` = dein Worktree, nicht der Hauptcheckout.)
* Wenn der Build nicht läuft oder du ihn nicht ausführen konntest: explizit sagen,
  nicht verschweigen.
* Kein Endpoint als "getestet" markieren, den du nicht wirklich mit `curl` getroffen hast.
* Negativbefunde zählen. "Ich habe X gesucht und nicht gefunden" ist ein Ergebnis, kein
  Fehlschlag.

## 4. Sicherheitsposition — dieses Projekt hat eine Vorgeschichte

Dieses Repo hatte am 5.9.2026 einen echten Security-Incident (siehe
`docs/sprints/SPRINT-19-SECURITY-INCIDENT-KLAF.md`). Die Mandate 9 und 12 existieren,
weil genau die Abkürzungen, die du vielleicht naheliegend findest, den Vorfall verursacht
haben. Konkret:

* Kein `docker run -p PORT:PORT` ohne `127.0.0.1:` Prefix.
* Kein Secret, kein Token, kein Passwort im Klartext in Log-Ausgaben oder API-Responses,
  die nicht ausdrücklich dafür vorgesehen sind (Task sagt es, wenn ein Passwort einmalig
  zurückgegeben werden soll).
* Keine neue Web-UI ohne Auth deployen.
* Bei Unsicherheit, ob etwas ein Sicherheitsrisiko ist: im Report als offene Frage
  markieren, nicht selbst entscheiden und stillschweigend committen.

## 5. Was du NICHT selbst entscheidest

Die offenen Entscheidungen E1–E8 in `docs/sprints/SPRINT-20-KLAF-FOUNDATION.md` und
`docs/PRODUCT-ROADMAP.md` § E8 gehören dem Operator. Jede Task, die auf einer solchen
Entscheidung aufbaut, nennt explizit den **Default**, gegen den du arbeitest — das ist
kein Freibrief, ihn zu ändern. Wenn dir beim Arbeiten auffällt, dass der Default falsch
oder unvollständig ist: im Report vermerken, nicht umgehen.

## 6. Abschlussbericht — Pflichtformat

Jede Task endet mit einem Bericht in dieser Struktur (passend zum bestehenden
Ergebnis-Format aus `docs/tasks/README.md`):

```
## Geändert
<Datei:Zeilen — was, in einem Satz>

## Build/Test-Status (ehrlich)
<exakter Befehl + Ergebnis, oder "nicht ausgeführt, weil ...">

## Abweichungen von der Task-Vorgabe
<falls der Code seit Task-Erstellung gedriftet ist>

## Offene Fragen für den Reviewer
<max. 5, konkret>

## Branch
task/0NN-<slug>, Commits: <Anzahl>, letzter Commit: <Hash>
```

Kein Aufräumen des Worktrees am Ende — Claude liest den Diff direkt aus dem Branch.

## 7. Wohin der Bericht geschrieben wird — Pflicht, keine Ausnahme

**Der Bericht geht in die `## Ergebnis`-Sektion der EIGENEN Task-Datei**
(`docs/tasks/TASK-0NN-*.md`), committed im eigenen Branch. **Niemals** in eine
geteilte Datei schreiben — nicht `docs/backlog/BACKLOG.md`, nicht
`docs/tasks/README.md`, nicht die `## Ergebnis`-Sektion einer anderen Task.

Grund: Mehrere Tasks laufen parallel in getrennten Worktrees. Zwei Prozesse, die in
dieselbe geteilte Datei schreiben, überschreiben sich gegenseitig — der zweite
Schreibvorgang gewinnt, der erste ist weg, ohne Fehlermeldung. Jede Task hat
deshalb ihre eigene Datei als alleinigen Schreibort. Die Zusammenführung mehrerer
Ergebnisse in `BACKLOG.md`/`README.md` macht **ausschließlich Claude beim Review**,
nachdem alle Branches vorliegen — nie eine Task selbst und nie parallel.

Falls eine Task-Datei aus irgendeinem Grund eine geteilte Datei referenziert: das ist
ein Fehler in der Task-Spezifikation, im Bericht vermerken, nicht trotzdem
hineinschreiben.
