# TASK-018 — API_DOCS: 76 fehlende Routen nachtragen (Drift-Audit-Worklist)

> **Status:** ✅ ERLEDIGT — GLM-Headless-Lauf gescheitert (stummer Exit: kein Worktree, kein Commit, HANDOFF leer). Das Fill kam über die **P1–P5-Commits der anderen Session** (fbe9648, merge) + 2 Security-Routen (a65928d). Python-Endaudit: 0 echte Gaps (9 Rest-Diffs = Normalisierungs-Artefakte). · **Vorbedingung:** `docs/tasks/WORKTREE-PROTOCOL.md` gelesen
> **Branch:** `task/018-apidocs-fill-gaps` · **Speist:** TASK-017 Empfehlung 1

## Kontext

TASK-017 hat 170 Code-Routen gegen `API_DOCS.md` geprüft und 76 echte
Doku-Lücken gefunden (Liste unten, aus `docs/tasks/TASK-017-apidocs-drift-audit.md`
übernommen). Reine Dokumentationsarbeit, kein Code wird angefasst.

## Auftrag

Für jede der 76 Routen unten:
1. Den Handler in `src/backend/internal/gateway/*.go` finden (die Route ist über
   `mux.HandleFunc("<pfad>", s.handle...)` registriert — `grep -rn` reicht).
2. Den Handler lesen: welche Methode(n), welcher Request-Body/Query-Parameter,
   welche Response-Struktur, welche Fehlerfälle.
3. Eine Zeile/einen Abschnitt in `API_DOCS.md` ergänzen, im Stil der
   umgebenden Einträge — **jede Beschreibung aus dem tatsächlichen Handler-Code
   abgeleitet, nichts erfunden** (Mandat 2 gilt sinngemäß auch für Dokumentation:
   eine erfundene Beschreibung ist so falsch wie ein gemockter Endpoint).
4. Wenn ein Handler nur ein Platzhalter/Stub ist (gibt z. B. immer `{}` zurück,
   ohne echte Logik): das **ehrlich so dokumentieren**, nicht als voll
   funktionsfähig ausgeben.

**Priorität, falls die Zeit nicht für alle 76 reicht** (in dieser Reihenfolge
committen, jeweils als eigener kleiner Commit — Sicherheits-Oberfläche zuerst):

1. Security-Oberfläche: `/api/vault/*`, `/api/budgets*`, `/api/teams`,
   `/api/team-members`, `/api/security/audit`, `/api/sessions/query`
2. Projects/Deploy: `/api/projects*`, `/api/projects/*/deployments*`,
   `/api/projects/*/monitoring`, `/api/projects/*/ports`,
   `/api/projects/*/ssh-config`, `/api/projects/*/tunnel/*`
3. Chains (Canvas-Graph): `/api/chains/*/edges|graph|model-roles|nodes*`
4. Agent-Bridge/Discovery: `/api/bridge/*`, `/api/discovery*`
5. Rest: Orchestration, Analytics, Experts, Ontology, `/v1/embeddings`,
   `/v1/mesh/models`, `/v1/providers`, `/v1/route`, `/v1/score`,
   `/v1/chat/completions/ws`, `/`, `/ready`

Vollständige Liste (alle 76): siehe `docs/tasks/TASK-017-apidocs-drift-audit.md`
Abschnitt „(a) Die 76 Doku-Lücken".

## Nicht tun

- Keine Code-Änderungen — reine Dokumentation.
- Keine Beschreibung erfinden, wenn der Handler-Code unklar ist — in dem Fall
  die Route mit einem `TODO(unclear)`-Vermerk versehen und im Report auflisten,
  statt zu raten.
- Nicht versuchen, alle 76 in einem einzigen Commit zu machen — mehrere kleine
  Commits nach der Prioritätsreihenfolge oben, damit ein Reviewer partiell
  mergen kann, falls nicht alles fertig wird.

## Akzeptanz

- Jede der 76 Routen hat einen API_DOCS.md-Eintrag (oder ist im Report als
  "nicht geschafft, aus Grund X" aufgeführt — Teilfortschritt ist ein
  akzeptables Ergebnis, ein erfundener Eintrag ist es nicht).
- `git log` zeigt mehrere kleine, nach Priorität geordnete Commits.

## Ergebnis

_(noch nicht begonnen)_
