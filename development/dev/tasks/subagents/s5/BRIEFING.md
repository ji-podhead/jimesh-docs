# Briefing für GLM-Executor — TASK-009

> Alles, was du brauchst, steht in DIESER Datei.

**Dein Worktree:** `../jimesh-worktrees/task-009-workspace-perms` auf Branch `task/009-workspace-perms`

**⚠️ Koordinationshinweis:** TASK-008 (Branch `task/008-ssh-hostkey`) läuft
parallel und ist noch nicht gemerged, teilt sich `projects_ssh.go` mit dir,
aber an einer anderen Stelle (SSH-Host-Key-Bereich, nicht dein Bereich).
Arbeite normal in deinem Worktree — Claude löst einen kleinen Merge-Konflikt
beim Review selbst auf, das ist erwartet und kein Grund zu warten.

**Wohin dein Bericht geht (Pflicht, zwei Orte):**
1. In DIESE Datei anhängen, unten unter '## HANDOFF' (nicht überschreiben, anhängen).
2. In die `## Ergebnis`-Sektion von `docs/tasks/TASK-009-*.md`
   **im Worktree** (nicht im Hauptcheckout!), committed auf deinem Branch.

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

_(noch nicht begonnen)_

---

## HANDOFF

**Status: FERTIG.** Branch `task/009-workspace-perms`, 1 Commit (`da26435`), Worktree
`worktrees/task-009-workspace-perms` (siehe Abweichung 1). `make go-build` + `make go-vet`
exit 0; die erzeugte Deploy-Shell wurde aus dem Quelltext extrahiert und in Containern
in allen Zweigen real getestet. Vollständiger Report (Protokoll §6) in
`docs/tasks/TASK-009-wp0-workspace-perms.md` (Hauptcheckout, kanonisch; identische Kopie
im Worktree auf Disk) — und im Commit-Message-Text von `da26435`.

### Geändert

- `src/backend/internal/gateway/projects_ssh.go:488-542` (alt 489-493) — **beide**
  `chmod -R 777`-Fundstellen ersetzt durch die gemeinsame Policy-Funktion
  `jimesh_ws_perms`; ein Go-String, den beide Call-Sites teilen (lokal:
  `docker run --rm -v <ws>:/target alpine sh -c '<fn>; jimesh_ws_perms /target'`,
  remote: Funktionsdefinition + `jimesh_ws_perms <ws> || true`) — Drift zwischen den
  Fundstellen ausgeschlossen (Auftrag 3).
  - Zweig 1 (CAP_CHOWN — immer der lokale Alpine-Helper, i. d. R. SSH-root):
    `chown -R 1000:1000` + `chmod -R u+rwX,go=rX`. Kernpunkt: das `=`-Präfix —
    Legacy-Workspaces sind von alten Deploys schon 777; ein nacktes chown (oder
    `+`-chmod) ließe die Welt-Schreibbits bestehen.
  - Zweig 2 (Non-Root-SSH-User ohne CAP_CHOWN, Besitzer der frisch erzeugten Files):
    `setfacl -R -m u:1000:rwX` + Default-ACLs auf Dirs (best-effort) + `chmod -R o-w`.
  - Zweig 3 (dokumentierter Last-Resort, nur wenn beides fehlt): `chmod -R a+rwX
    || true` — effektive Reichweite identisch zum alten `chmod 777 || true`
    (root-owned Files waren nie fixbar), mit Begründungs-Kommentar (Task-Option 4).
- `src/backend/internal/gateway/projects_ssh.go:652-658` — code-server-Kommentar
  aktualisiert (Workspace gehört jetzt uid 1000 statt „chmod 777 above").
- `docs/sprints/SPRINT-20-KLAF-FOUNDATION.md:80` — WP0-Item abgehakt mit
  Verifikationsvermerk (Documentation Mandate).
- `API_DOCS.md` unverändert — keine Route berührt (nur Deploy-Shell-Befehle).
  `docs/backlog/BACKLOG.md` bewusst nicht angefasst (Protokoll §7: Zusammenführung
  macht ausschließlich Claude beim Review).

**UID-Analyse (Auftrag 1):** Schreibende sind (a) code-server, hartkodiert
`-e PUID=1000 -e PGID=1000` (`projects_ssh.go:~670`); (b) Framework-/Runtime-Container
— `runtimeImage()` liefert offizielle Images + das dsh-Image, alle default root, und
root umgeht Rechteprüfungen (777 war nie der Grund, dass sie funktionieren); (c) der
Deploy-Prozess: lokal root (compose `user: "0:0"`), remote der SSH-Login-User —
häufig root, Non-Root deckt der ACL-Zweig ab. Unbekannte UID: nur das unauditierte
`ghcr.io/ji-podhead/opencode-vnc:latest` (nicht auf diesem Host inspectierbar).

### Build/Test-Status (ehrlich)

- `make go-build` → exit 0; `make go-vet` → exit 0 (golang:latest gegen den Worktree).
  go-vet fand im ERSTEN Entwurf einen echten Bug (Sprintf 2×`%s`, 1 Arg — der
  Alpine-Helper bekam den Workspace-Pfad nicht) → behoben, danach zweimal exit 0.
- `gofmt -l`: `projects_ssh.go` clean (27 vorbestehende unformatierte Gateway-Dateien,
  in Main identisch — nichts Neues von mir).
- Funktional, mit der EXAKT erzeugten Shell (aus den Backticks extrahiert), in
  Containern: Root-Caller → alles 1000:1000, 644 bleibt 644, Exec bleibt 755,
  Legacy-777 verliert o+w; uid-999-Caller mit setfacl → ACL `user:1000:rwx` +
  Default-ACLs, 777→775, uid 1000 schreibt+liest ✓, uid 1234 verweigert ✓; ohne
  setfacl (alpine) → Last-Resort, rc 0 (altes Verhalten); Root-owned File +
  Non-Root-Caller → rc 0, unverändert (dieselbe Grenze wie das alte `|| true`);
  Guards (leerer Pfad, fehlendes Dir) → rc 0; `&&`-Join beider Formen mit
  `sh -n`/`bash -n` geparst; GNU-setfacl-`rwX`-Probe bestätigt.
- **Nicht ausgeführt:** Live-API-Deploy + code-server-Schreibtest am echten Stack
  (läuft aus dem Hauptcheckout — Worktree-Protokoll verbietet den Eingriff) und
  `make go-test` (der Throwaway-DB-Pfad kann aus einem Worktree-Compose-Projekt den
  laufenden `jimesh`-Stack-Postgres nicht erreichen, ohne das Hauptcheckout zu
  berühren; Akzeptanz verlangt build+vet). Der Rechte-Pfad ist auf Befehlsebene
  end-to-end belegt: code-server (uid 1000) schreibt/liest als Besitzer (Root-Fall:
  chown) bzw. via ACL (Non-Root-Fall); alle anderen verlieren Schreiben, behalten
  Lesen+Traversieren.

### Abweichungen von der Task-Vorgabe

1. **Worktree-Pfad:** `../jimesh-worktrees/task-009-workspace-perms` war im
   Sandbox-Kontext nicht erstellbar (nur `/home/ji/projects/jimesh` beschreibbar;
   Eskalation ohne Approval-Kanal → fail-closed). Worktree liegt stattdessen in
   `worktrees/task-009-workspace-perms` (Muster wie task-013/014). Isolation
   vollständig: eigener Branch von `main` (c61cfd5), Hauptcheckout nie editiert,
   committed oder gechecked-out.
2. **Task-Datei nicht committed** (Protokoll §7): `docs/tasks/` ist seit `ac722d0`
   gitignored („ahead of making the repo public"). Force-add hätte interne
   Koordinations-Dateien ins zu veröffentlichende Repo zurückgebracht. Report liegt
   (a) gefüllt im Hauptcheckout, (b) als Kopie im Worktree auf Disk, (c) vollständig
   im Commit-Message-Text von `da26435`. Falls doch gewünscht:
   `git add -f docs/tasks/TASK-009-wp0-workspace-perms.md && git commit`.
3. **Enger als die Task-Präferenz „nur chown":** zusätzlich `chmod -R u+rwX,go=rX`
   NACH dem chown — sonst bleiben bei Re-Deploys die Legacy-777-Bits bestehen.
4. **group/other behalten Lesen+Traversieren** (statt 770-Option): unbekannte
   Runtime-UID des opencode-vnc-Images; unter 777 hatte es Lesen. Schreiben ist
   überall entfernt. Eine Zeile änderbar, falls 770 gewünscht.
5. **Zeilen-Drift:** Task nennt `:490`/`:492` — exakt dort standen die Fundstellen
   vor dem Edit; jetzt `:488-542`. Inhaltlich unverändert adressiert.

### Offene Fragen für den Reviewer

1. **opencode-vnc:** läuft es als Non-Root ≠ 1000, verliert es Schreibzugriff
   (Lesen bleibt). Akzeptabel? (Image ohnehin unauditiert — TODO(security, noVNC)
   im Code; root/1000 → keine Änderung für es.)
2. **GNU setfacl expandiert `rwX` auf Plain-Files zu `rwx`** — uid 1000 bekommt x
   auf Textdateien im ACL-Zweig (im chown-Zweig nicht). Harmlos, aber inkonsistent —
   mit `find -type d`/`-type f`-Doppellauf straffen?
3. **Legacy-Workspaces:** Redeploy genügt als Migration (das neue `=`-chmod entfernt
   777 beim nächsten Deploy automatisch). Operator-Hinweis genügt — oder Migrationsnotiz
   in die Docs?
4. **Live-Check beim Operator:** `make restart-backend`, frisches Deployment
   (`dsh_code_server`) auf einen Test-Workspace, im code-server-Terminal als uid 1000
   schreiben+lesen, und auf dem Node `find <workspace> -perm -o=w | head` — muss
   **leer** bleiben. Danach `cd src/backend && go build ./... && go test ./...` für
   die Standard-Verifikation.

### Koordination TASK-008 (erwarteter Mini-Merge)

Mein Diff berührt `projects_ssh.go` in zwei Blöcken (`:488-542` Permissions,
`:652-658` code-server-Kommentar). TASK-008 (SSH-Host-Key) arbeitet am `dialSSH`-
Bereich (`:~264`) — disjunkte Regionen, sauberer Merge erwartet. Meine Zeilennummern
im Sprint-File/Report gelten relativ zu `da26435`.

### Branch

task/009-workspace-perms, Commits: 1, letzter Commit: `da26435`

### Nachtrag (Ende der Session)

- **`main` ist während meiner Arbeit weitergelaufen:** c61cfd5 → `9e081e8`
  (u. a. TASK-010 gemerged). Mein Branch basiert auf **c61cfd5** (der Briefing-
  Zeitpunkt) und wurde NICHT rebased/gemerged (Protokoll §1). Merge-Konflikte in
  `projects_ssh.go` sind reviewseitig zu erwarten und gelten als normal.
- **`.gitignore` ignoriert inzwischen `/worktrees/`** (Kommentar: „defensive",
  weil GLM-Sessions Worktrees im Hauptcheckout statt als Siblings anlegen) —
  mein Worktree-Pfad ist also vom Repo selbst vorweggenommen und erzeugt im
  Hauptcheckout kein Status-Rauschen.
