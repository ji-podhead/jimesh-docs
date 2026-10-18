# Briefing für GLM-Executor — TASK-018

> Alles, was du brauchst, steht in DIESER Datei.

**Dein Worktree:** `../jimesh-worktrees/task-018-apidocs-fill-gaps` auf Branch `task/018-apidocs-fill-gaps`

**Wohin dein Bericht geht (Pflicht, zwei Orte):**
1. In DIESE Datei anhängen, unten unter '## HANDOFF' (nicht überschreiben, anhängen).
2. In die `## Ergebnis`-Sektion von `docs/tasks/TASK-018-*.md` **im Worktree**, committed auf deinem Branch.

**WICHTIG — bereits mehrfach beobachtetes Problem:** `docs/tasks/` ist im
Hauptrepo per .gitignore ausgeschlossen. Wenn du deine Task-Datei per
`git add -f` erzwingst, wird sie später vom Reviewer wieder entfernt —
das ist beabsichtigt, kein Fehler deinerseits. Committe sie trotzdem
normal (`git add docs/tasks/TASK-018-*.md`), das Ergebnis zählt, nicht
ob sie am Ende getrackt bleibt.

---

# TEIL 1 — Worktree-Protokoll (bindend, vollständig)

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

---

# TEIL 2 — Mandates (bindend, vollständig)

# MANDATES.md — Standing Mandates for JiMesh

These are **permanent rules** for every human and AI agent working in this repo.
They exist because each one was earned by a real bug. Violations of these
mandates are bugs, even when tests pass. `CLAUDE.md` references this file; the
documentation mandate below is mirrored there.

---

## 1. 📚 Documentation Mandate (always — no exceptions)

Every functional change keeps the documentation in sync **in the same change**:

1. **`API_DOCS.md`** — every HTTP route touched (method, path, payload, response).
   A route in `gateway.go` without a doc entry is a bug.
2. **`docs/sprints/`** — ongoing work lives in the current sprint file
   (`SPRINT-<N>-<NAME>.md`). Plan before code: multi-file or feature-spanning
   changes start with a plan section (goal, work packages, acceptance criteria).
3. **`docs/backlog/BACKLOG.md`** — mirror the sprint's items at the top
   (`[x]` done / `[~]` in progress / `[ ]` open).
4. **Retrospective honesty** — sprint docs record what actually shipped
   (verified against the code), never aspirations.

## 2. 🚫 No-Mock Mandate (nothing may lie)

**No endpoint may pretend.** Concretely:

- A write endpoint (`POST`/`PUT`/`PATCH`/`DELETE`) **must actually persist** to
  PostgreSQL (or honestly report why it did not). Answering
  `{"success": true, "imported": 3}` without doing the work is the original sin
  of this codebase — never again. (Case: the old `/api/dsh/import`.)
- A read endpoint must return **real measured/stored data**. No hash-based fake
  counters, no hardcoded providers, no invented latencies. If there is no data
  yet, return an honest empty state (`0`, `[]`, `null` windows, "No traffic
  recorded yet") — an honest zero beats a fake number. (Case: the old
  `/api/fallback/stats` returned `requests: 142` from a char-sum hash.)
- A "test" endpoint must actually probe the target and report the real result,
  including failures. (Case: the old `/api/dsh/test` always said "connected,
  140ms".)
- No system-generated mock objects in user-facing surfaces: no preset routers,
  pools or tiers nobody asked for. Seed only what is needed (the `default`
  router), never clutter. (Case: the phantom `auto:s` router/pool.)

## 3. 💾 Persistence Mandate (user work survives restarts)

Everything the operator configures — pools, chain entries, mesh edges, models,
keys, key assignments, base URLs, projects, deployments, settings — **must
survive a backend restart**. Every canvas/dashboard action that looks like
saving must round-trip to PostgreSQL, either instantly (edges) or via an
explicit save (entries). Startup code may only **add** missing defaults;
**purging user data on boot is forbidden**. Legacy garbage is removed
explicitly by id, never by broad wildcard patterns.

## 4. 🔀 Proxy Mandate (it is a real router, not a facade)

JiMesh is the **pure-Go replacement for FreeLLMAPI**. Therefore:

- The router (`service.Route()`) must actually **use the saved chains, pools
  and mesh edges**: pools are traversed in saved edge order, the bandit picks
  within a pool, an exhausted pool is a failover step to the next pool.
- Failover must **walk the chain**: an upstream 429/402/5xx excludes the dead
  candidate so retries continue at the next entry instead of re-picking it.
  `auto_skip_exhausted` defaults ON; a seeded chain must never silently disable
  failover.
- Streaming must stream (SSE flushed incrementally), not buffer.
- The proxy must honor the **active profile** and route arbitrary model names
  over the saved chain.

## 5. 🚀 Deploy Mandate (safe redeploys, agent-grade containers)

Projects/deployments exist so the agent can rebuild itself:

- Runtime (dsh, python, go, node, docker, base) and extra tools (**make**,
  gcc, docker, …) must be selectable at deploy **and** edit; `make` and `git`
  are always present.
- A provided **Git token** reaches the container (`GIT_TOKEN` env + credential
  store inside the state volume) and is **never stored in PostgreSQL**.
- **Docker socket mount must actually work** when requested — the container
  must be able to build and run containers.
- Every project has a named state volume `jimesh-dsh-data-<projId>`
  (agent workspace, DSH context, git creds). **Redeploy preserves the volume
  and the agent context.** The volume is only deleted on explicit
  `purgeVolume: true` opt-in.

## 6. ✅ Verification Mandate (honest "done")

- **Done means verified against the code**, not "edited and hoped".
- There is no Go toolchain in the agent sandbox: after backend changes, hand
  the operator the exact check (`make restart-backend`, then
  `cd src/backend && go build ./... && go test ./...`). Frontend changes are
  checked with the available toolchain (`tsc --noEmit -p tsconfig.app.json`,
  filtered for real errors against the repo's pre-existing style noise).
- New routes are smoke-tested with curl once the backend is up.
- If a verification cannot run, say so explicitly — never claim it passed.

## 7. 🧱 Architecture Mandates (from CLAUDE.md, binding)

- Pure Go, `CGO_ENABLED=0`; persistence is **PostgreSQL via pgx v5/stdlib
  only** — no SQLite, no second database.
- **No new dependencies without need.** If a dependency would only cover a
  tiny, stable subset (e.g. YAML parsing of a known file shape), implement the
  subset (see `gateway/dsh_import.go`) instead of growing `go.mod`.
- Never edit generated `.pb.go` / `_grpc.pb.go` files; change
  `protos/jimesh/jimesh.proto` and run `make proto`.
- The API surface lives exclusively in `src/backend/internal/gateway/` —
  no hidden/fallback handlers anywhere.
- Frontend truth: only `src/views/` is routed (`App.tsx` imports `@/views/*`);
  `src/pages/` is a stale duplicate — do not build on it.

## 8. 🧹 Migration Mandate (rename the semantics, then move the data)

When a data model changes meaning (e.g. "entries without a pool belong to the
router's own chain id, not to `auto:s`"), the migration covers **existing rows
too** — in `migrate()`/`SeedDefaults()`, idempotently. New code with clean
semantics on top of dirty legacy rows is a bug in waiting.

---

## 9. 🔒 Zero-Trust Secret Mandate (Sprint 16 — earned by Vault design)

AI agents **never** receive plaintext API keys, passwords, or tokens. The
gateway is the sole trust boundary:

1. Secrets live in HashiCorp Vault (or AES-GCM-256 encrypted PostgreSQL
   fallback).
2. Agents call `POST /api/vault/access` with a time-limited token. The gateway
   fetches the secret, injects it just-in-time, executes the operation, and
   returns only structured result rows. The secret never crosses the agent
   boundary.
3. Every secret access is logged in `vault_audit_log` (who, what, when).
4. Violation: any code path that passes a plaintext secret to an agent
   response body is a critical bug, even if tests pass.

---

## 10. 💰 Budget-Before-Call Mandate (Sprint 16 — earned by cost runaway risk)

Every LLM or infrastructure call that costs money **must** check the cascading
RBAC budget **before** executing, not after:

1. Check order: Team → Project → User/Agent.
2. If `spent + cost > max`, return **402 Payment Required** immediately. Do
   not execute the call and bill it retroactively.
3. The in-memory cost circuit breaker (`CostTracker`) is a second line of
   defense: `context.Cancel()` fires when a single run exceeds its limit
   (default $0.50), even if the budget check passed.
4. Violation: any proxy or bridge handler that executes a paid call without
   a budget check first is a bug.

---

## 11. 🌉 Dual-Protocol Bridge Mandate (Sprint 18 — earned by agent ecosystem fragmentation)

The agent bridge exposes the **same Go core logic** through two protocols:

1. **REST** (OpenAPI 3.0 at `/api/bridge/openapi.json`) — for LLM function
   calling, web agents, and any HTTP client.
2. **MCP** (JSON-RPC over stdio/WebSocket) — for CLI agents like Claude Code
   and Aider.
3. The business logic (`ExecuteSelfProvisioning`, etc.) is written **once** in
   the Go core. The REST handler and MCP handler are thin adapters that call
   the same function. Duplicating logic across protocols is a bug.
4. Dynamic tool registration is hot-reload: new tools appear at runtime
   without gateway restart. A restart requirement for new tools is a bug.

---

## 12. 🔌 Port-Binding Mandate (Sprint 19 — earned by the incident of 5 September 2026)

**Every published port is bound to an explicit address. The default is
`127.0.0.1`.** This covers `docker-compose.yml`, every `docker run` command the
deployment code emits (`gateway/projects_ssh.go`), and anything else that
publishes a port. `-p 8111:3080` is a bug; `-p 127.0.0.1:8111:3080` is the rule.
Binding wider than loopback is an explicit, documented opt-in per service
(`${HOST_BIND:-127.0.0.1}`), never a default and never an omission.

*Why:* the Docker daemon inserts its own DNAT rules and thereby **bypasses the
`ufw`/iptables `INPUT` chain**. A firewall rule that looks correct — policy
`DROP`, nothing allowed — does not apply to a published container port. "No port
was open" is not something a host firewall can tell you here; only `ss -tlnp`
and the mapping itself can.

Cases that earned it:

1. **`deepseek-harness` on `0.0.0.0:8111`** — found by an automated scanner,
   driven by indirect prompt injection into dumping six `.env` files in
   plaintext, then used for an attempted host escape via the mounted Docker
   socket (incident of 5 September 2026, see
   `docs/sprints/SPRINT-19-SECURITY-INCIDENT-KLAF.md`). The escape failed by
   luck — the image ran unprivileged — not by control.
2. **Vault on `0.0.0.0:8200`** — missed during the port hardening that followed
   the incident. The one service holding every secret was the one left exposed.
   Corrected in the working tree on 6 September 2026.
3. **The deployment ports for noVNC and code-server** — `projects_ssh.go`
   published `$ALLOC_PORT`, `$ALLOC_VNC` and `$ALLOC_VS` with no bind address,
   and then wrote `ufw`/iptables rules that, per the reasoning above, do not
   govern them. Every mapping emitted there carries an explicit bind address
   from now on.

**No web UI is deployed without authentication.** noVNC, code-server, agent
harness UIs and dashboards are remote-code-execution surfaces. No empty
password, no root user, no public interface — reach them through an SSH tunnel,
a WireGuard/Tailscale interface, or an authenticating reverse proxy.
*Case:* `projects_ssh.go` shipped code-server with `-e PASSWORD=""` and
`-e PUID=0` — an unauthenticated root shell in a browser, on an unbound port.
A deployer that starts a UI must generate and surface a credential; an empty
password is a bug, not a convenience.

---

*Add new mandates at the bottom with the case that earned them. A mandate
without its origin story is a rule nobody remembers.*

---

# TEIL 3 — Deine Task (autoritativ)

# TASK-018 — API_DOCS: 76 fehlende Routen nachtragen (Drift-Audit-Worklist)

> **Status:** ⏳ OFFEN · **Vorbedingung:** `docs/tasks/WORKTREE-PROTOCOL.md` gelesen
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

---

# TEIL 4 — Referenz: die vollständige 76-Routen-Liste mit Fundstellen

# TASK-017 — API_DOCS-Drift-Audit (170 Routen)

> **Status:** ✅ ERLEDIGT (6.9.2026) · **Speist:** Sprint 20 WP0-Fund („mechanisch 170 distinkte `HandleFunc`-Muster, nicht gegen API_DOCS.md abgeglichen") · Langfristig: jimesh-api-Contract-CI-Muster (TASK-002-Fund)

## Auftrag

- [x] Routen mechanisch gezählt (repo-weit, nicht nur gateway/*.go): **170 unique**
- [x] API_DOCS.md-Routen extrahiert: **100 unique** (109 Tabellenzeilen)
- [x] Diff in drei Klassen mit Normalisierung (`{id}` → `*`, Query-Strip, Method-Strip — die erste Auswertung hatte einen SED-BRE-Bug, korrigiert)
- [x] Klasse (b) live + repo-weit verifiziert (nach WP0-Fix 401-t die Middleware alles unter `/api/*` vor dem Routing — Curl allein ist nicht mehr beweiskräftig, der Repo-grep ist es)
- [x] Klasse (b) behoben: 5 tote Doku-Zeilen aus API_DOCS entfernt (Commit im Worktree `task/016-policy-konsolidierung`)
- [x] Klasse (a): komplette Lücken-Liste als Worklist (unten) — die 76 Dokumentationen brauchen Handler-Lektüre (ehrlich: Beschreibungen nicht fabrizieren) → eigener Doku-Commit

## Ergebnis

### Zahlen

| Seite | unique Routen |
|---|---|
| Code (repo-weit, `HandleFunc`-Patterns normalisiert) | **170** |
| API_DOCS.md (vor Fix) | **100** |
| **(a) Im Code, fehlt in API_DOCS** | **76** |
| **(b) In API_DOCS, fehlt im Code (tot)** | **5 → entfernt** |

### (b) Entfernte tote Doku-Zeilen (verifiziert)

| Zeile | Route | Verifikation |
|---|---|---|
| 60 | `GET /api/settings/api-key` | 0 Treffer repo-weit (nur `/api/settings/api-key/regenerate` existiert — Zeile bleibt) |
| 101 | `GET /v1/health` | 0 Treffer repo-weit; live 404 |
| 157 | `DELETE /v1/chains/{id}` | 0 Treffer repo-weit; live 404 |
| 187 | `POST /v1/completions` | 0 Treffer repo-weit; live 404 („legacy") |
| 202 | `/api/agents/analytics/summary` | 0 Treffer repo-weit |

### (a) Die 76 Doku-Lücken (Worklist für den Doku-Commit)

**Security-Oberfläche (höchste Priorität):**
`/api/vault/secrets`, `/api/vault/secrets/*`, `/api/vault/tokens`, `/api/vault/tokens/*/revoke`, `/api/vault/audit`, `/api/vault/access`, `/api/budgets`, `/api/budgets/check`, `/api/teams`, `/api/team-members`, `/api/security/audit`, `/api/sessions/query`

**Projects/Deploy (Deploy-Engine):**
`/api/projects`, `/api/projects/*`, `/api/projects/deploy`, `/api/projects/redeploy`, `/api/projects/undeploy`, `/api/projects/discover`, `/api/projects/*/deployments`, `/api/projects/*/deployments/*`, `/api/projects/*/deployments/*/redeploy`, `/api/projects/*/monitoring`, `/api/projects/*/ports`, `/api/projects/*/ssh-config`, `/api/projects/*/tunnel/*`

**Chains (Canvas-Graph):**
`/api/chains/*/edges`, `/api/chains/*/graph`, `/api/chains/*/model-roles`, `/api/chains/*/nodes`, `/api/chains/*/nodes/*`, `/api/chains/*/nodes/*/members`, `/api/chains/*/nodes/*/members/*`

**Agent-Bridge/Discovery (Sprint 17/18):**
`/api/bridge/openapi.json`, `/api/bridge/provision`, `/api/bridge/stream`, `/api/bridge/tools`, `/api/discovery`, `/api/discovery/events`, `/api/discovery/scan`, `/api/discovery/status`, `/api/discovery/sync`

**Orchestration/Analytics/Sonstige:**
`/api/orchestrate`, `/api/orchestrate/cancel`, `/api/orchestrate/history`, `/api/experts`, `/api/experts/execute`, `/api/experts/runs`, `/api/analytics/models`, `/api/app-categories`, `/api/backups/schedule`, `/api/cost-trackers`, `/api/dedup`, `/api/export`, `/api/health/check`, `/api/health/monitor/start`, `/api/health/uptime/*`, `/api/iana`, `/api/import`, `/api/keys/*/cooldowns`, `/api/keys/custom`, `/api/keys/custom/discover-models`, `/api/model-roles`, `/api/models/*/enrich`, `/api/models/*/enrichment`, `/api/models/enrich-all`, `/api/models/enrichment`, `/api/ontology`, `/api/or/benchmarks`, `/api/premium`, `/api/traffic`, `/api/traffic/stream`, `/`, `/ready`, `/v1/chat/completions/ws`, `/v1/embeddings`, `/v1/mesh/models`, `/v1/providers`, `/v1/route`, `/v1/score`

### Methoden-Drift (Beobachtung, zweiter Ordnung)

Die `chains`-Routen registrieren **methoden-spezifische** Go-1.22-Pattern (`POST /api/chains/*/nodes` etc.) — API_DOCS führt sie je Methode. Keine Drift gefunden, aber die Audit-Methode muss Methoden-Patterns künftig mit-normalisieren (getan).

### Empfehlung

1. **Sofort (eigener Doku-Commit):** die 76 Routen mit ehrlichen Beschreibungen nachziehen — jede Beschreibung aus dem Handler gelesen, nicht fabriziert (Mandat 2). Die Liste oben ist die Worklist.
2. **Dauerhaft:** das `jimesh-api`-Muster (TASK-002-Fund: redocly lint + `openapi-diff --fail-on-incompatible` als CI-Gate) — dann kann diese Drift nicht wieder passieren. Als Epic-Item formulieren (Epic 11-Nachbar).

---

## HANDOFF

_(vom Executor auszufüllen)_
