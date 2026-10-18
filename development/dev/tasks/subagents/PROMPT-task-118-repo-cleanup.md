# TASK-118 — Repo-Aufräumung: scripts/sdk/examples nach src/, Dev-Docs-Struktur

**Wichtig zuerst:** Mehrere Sessions arbeiten parallel an diesem Repo. Lies
den aktuellen Zustand jeder betroffenen Datei/Ordner FRISCH (nicht aus
diesem Prompt annehmen), bevor du irgendwas verschiebst — der Stand hat
sich seit dem Schreiben dieses Prompts schon mehrfach geändert.

## Was zu tun ist (nur das, nichts darüber hinaus)

1. **`scripts/`, `sdk/`, `examples/` (Repo-Root) nach `src/` verschieben.**
   - Bekannte Kollision, die du auflösen musst: `src/examples/` und
     `src/clients/examples/` existieren teilweise schon mit
     überlappendem Inhalt (`fetch-relay-worker`, `jimeshctl`). Nicht
     blind überschreiben — Inhalte vergleichen, das aktuellere/
     vollständigere Set behalten, Duplikate löschen.
   - `git mv`, damit die Historie erhalten bleibt (kein `rm` + `add`).
   - Jede Referenz auf die alten Root-Pfade (`Makefile`, `package.json`,
     `src/frontend/package.json`, `deploy/docker-compose.yml`, jede
     `.md`-Doku die den alten Pfad nennt) auf den neuen Pfad anpassen.

2. **`src/repo-assets/` vs. Root-`repo-assets/` klären.** War heute schon
   einmal als totes Duplikat gelöscht, ist aber wieder aufgetaucht
   (vermutlich durch eine andere parallele Session). Prüfe echten
   Real-Zustand: welches wird von `raw.githubusercontent.com/.../repo-assets/...`-
   URLs im Go-Code (`internal/service/service.go`,
   `internal/gateway/gateway.go`) tatsächlich gemeint (root-relativ) —
   das ist das echte. Das andere konsolidieren/löschen, nicht beide
   parallel stehen lassen.

3. **Dev-Docs-Struktur unter `docs/`:** Operator will einen Ordner für
   interne/Operator+AI-Session-Dokumente, mit einem Unterordner für
   LLM-Task-Prompts. `docs/tasks/subagents/` (wo dieser Prompt selbst
   liegt) ist bereits genau das — prüfe, ob der Operator einen zusätzlichen,
   separaten Ordner meinte oder ob eine Umbenennung/Konsolidierung von
   `docs/tasks/`, `docs/sprints/`, `docs/backlog/`, `docs/research/`,
   `docs/prompts/` unter einem gemeinsamen Dach (z.B. `docs/dev/`) reicht.
   Wenn unklar: `docs/dev/tasks/` als das gemeinte Ziel behandeln und
   `docs/tasks/` dorthin verschieben (inkl. `subagents/`-Unterordner) —
   das ist die naheliegendste Lesart.

## Was NICHT zu tun ist

- Keine inhaltlichen Änderungen an SPRINT-44 (config/→deploy/,
  docker-compose→Ansible) — das ist eine andere, parallel laufende Session.
- Keine Änderungen an `deploy/ansible/`, `deploy/<service>/` — nicht anfassen.
- `node_modules`/Root-`package.json` nicht anfassen (separate,
  unentschiedene Frage, nicht Teil dieses Auftrags).

## Abschluss

Wenn fertig: **committen** (der Operator hat das für diesen Task explizit
erlaubt — "verschieben und committen"). Kurze, ehrliche Commit-Message,
was tatsächlich verschoben/gelöscht wurde. Kein Force-Push, kein Rebase.
