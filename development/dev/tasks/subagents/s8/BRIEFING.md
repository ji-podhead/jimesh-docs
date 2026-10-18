# Briefing für GLM-Executor — TASK-019

> Alles, was du brauchst, steht in DIESER Datei.

**Dein Worktree:** `../jimesh-worktrees/task-019-wire-egress-socketguard` auf Branch `task/019-wire-egress-socketguard`

**⚠️ Koordination:** Eine andere Session (TASK-018) arbeitet parallel, aber
NUR an `API_DOCS.md` — kein Overlap mit deiner Arbeit in
`projects_ssh.go`/`internal/network/`/`cmd/socket-guard/`.

**Wohin dein Bericht geht (Pflicht, zwei Orte):**
1. In DIESE Datei anhängen, unten unter '## HANDOFF'.
2. In die `## Ergebnis`-Sektion von `docs/tasks/TASK-019-*.md` im Worktree, committed.

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

# TASK-019 — Egress-Allowlist + Socket-Guard in den Deploy-Pfad verdrahten

> **Status:** ⏳ OFFEN · **Vorbedingung:** `docs/tasks/WORKTREE-PROTOCOL.md` gelesen
> **Branch:** `task/019-wire-egress-socketguard` · **Speist:** Sprint 20 WP5/TASK-015 Deferred-Wiring

## Kontext

Zwei fertige, getestete Bausteine liegen bereits in `main`, aber unverdrahtet:

1. **`internal/network/egress.go`** (TASK-012) — `EgressRuleset.Render()` erzeugt
   nftables-Regeln für Default-Deny-Egress. `ResolveRegistries()` löst die
   Registry-Domains auf. Nichts davon wird beim Deploy aufgerufen.
2. **`cmd/socket-guard/`** (TASK-015) — Reverse-Proxy vor `docker.sock`, blockt
   gefährliche Binds im `container/create`-Body. Existiert als eigenständiges
   Binary + Dockerfile, wird beim Deploy nicht gestartet.

Beide sollen jetzt in `src/backend/internal/gateway/projects_ssh.go`
(`executeDeploy`, dieselbe Funktion, in der Port-Bindings und Docker-Socket-Mount
schon passieren) angeschlossen werden.

## Auftrag

### 1. Egress-Allowlist

Nach dem Deploy-Schritt, der den Workspace-Container startet (dort wo heute
`extraVol` für den Docker-Socket-Mount gebaut wird — such nach
`if req.DockerSock`):

- Rufe `network.ResolveRegistries(ctx, network.DefaultRegistryDomains)` auf,
  um die aktuellen Registry-IPs zu bekommen.
- Baue ein `network.EgressRuleset` mit: `GatewayIP` (die vorhandene
  `gatewayIPFallback()`), `GitRemoteHost` (aus der Projekt-URL/dem
  `cloneURL`, auflösen zu einer IP), `RegistryIPs` (von oben).
- `Render()` aufrufen, das Ergebnis über SSH (lokal: über den bestehenden
  Alpine-Helper-Container-Pfad, remote: direkt) mit `nft -f -` anwenden.
- `NetworkInterface`: für lokale Deploys das Docker-Bridge-Interface des
  Workspace-Containers ermitteln (`docker network inspect` o. ä. — prüfe
  den pragmatischsten Weg, erfinde nichts). Für Remote-SSH-Deploys: prüfe,
  ob das überhaupt sauber geht (siehe E9 in `docs/tasks/TASK-011-*.md` —
  das ist möglicherweise dieselbe offene Frage). Falls nicht sauber lösbar:
  im Report als Grenze dokumentieren, nicht erzwingen.
- Undeploy muss die Regeln wieder entfernen (`nft delete table inet
  jimesh_egress_<interface>`).

### 2. Socket-Guard statt Raw-Mount

Wo heute steht:
```go
if req.DockerSock {
    extraVol += " -v /var/run/docker.sock:/var/run/docker.sock"
}
```
- Stattdessen: `socket-guard` als eigenen Sidecar-Container im selben
  Docker-Netz wie der Workspace starten (`docker run -d --name
  jimesh-socket-guard-<projID> -v /var/run/docker.sock:/var/run/docker.sock
  <image>`), der Workspace-Container bekommt `-e
  DOCKER_HOST=tcp://jimesh-socket-guard-<projID>:2376` statt des direkten
  Socket-Mounts.
- Das `socket-guard`-Image muss gebaut und irgendwo verfügbar sein — prüfe,
  ob ein lokaler Build-Schritt reicht (`docker build -f
  cmd/socket-guard/Dockerfile -t jimesh-socket-guard src/backend/`) oder ob
  das in eine Registry gehört. Für lokale Deploys reicht ein lokaler Build;
  für Remote-SSH-Deploys muss das Image auf den Zielhost (Build dort, oder
  Push in eine erreichbare Registry — recherchiere den pragmatischsten Weg
  für dieses Repo, erfinde nichts).
- Undeploy muss den `socket-guard`-Container mit stoppen/entfernen.

## Nicht tun

- Keine neuen Go-Dependencies.
- Nicht versuchen, das Egress-Refresh-Intervall (periodischer Neu-Resolve)
  als laufenden Scheduler zu bauen — einmaliges Anwenden beim Deploy reicht
  für diese Task. Der Refresh-Loop ist als eigener offener Punkt in TASK-012
  vermerkt.
- Keine Änderung an der Docker-Socket-Proxy-Logik selbst (`cmd/socket-guard/`)
  — nur die Integration in den Deploy-Pfad.

## Akzeptanz

- `make go-build`/`go-vet` sauber.
- Ein Test-Deploy mit `docker_sock=true`: Workspace-Container hat keinen
  direkten Socket-Mount mehr, `DOCKER_HOST` zeigt auf den Sidecar.
- Ein Test-Deploy: nftables-Regeln sind nach dem Deploy aktiv (`nft list
  ruleset` zeigt die `jimesh_egress_*`-Tabelle), Undeploy entfernt sie
  wieder.
- Report nennt ehrlich, was für Remote-SSH-Deploys tatsächlich funktioniert
  hat vs. was eine dokumentierte Grenze blieb.

## Ergebnis

_(noch nicht begonnen)_

---

# TEIL 4 — Referenz: K-LAF-Architektur (Egress-Allowlist-Motivation)

# K-LAF — Kernel-Level LLM Application Firewall

> **Status:** Produkt-Spezifikation. Kein Code. Entstanden aus dem Security-Incident
> vom 5. September 2026 (siehe `docs/sprints/SPRINT-19-SECURITY-INCIDENT-KLAF.md`).
> Umsetzungsplan: `docs/sprints/SPRINT-20-KLAF-FOUNDATION.md`.

Konsolidiert aus drei getrennten Entwürfen (K-LAF-Spec, XCP-ng/Suricata-Blueprint,
Libvirt/eBPF-Konzept). Wo sich diese widersprachen, ist die getroffene Entscheidung
unter **Entschieden** vermerkt.

---

## 1. Die These

Bestehende Werkzeuge sehen jeweils nur eine Hälfte:

| Werkzeugklasse | Sieht | Sieht nicht |
|---|---|---|
| Netzwerk-Firewalls (Palo Alto, Fortinet, Suricata) | IP-Pakete, Ports, TLS-SNI, Volumen | Den Prompt — LLM-Traffic ist TLS-verschlüsselt |
| AI-Guardrails (Llama Guard, NeMo, Lakera) | Prompt- und Antworttext | Ob der Agent nebenbei Sockets öffnet oder `/etc/shadow` liest |
| Syscall-Sandboxes (gVisor, Tetragon, Falco) | Systemaufrufe, Prozesse, Sockets | Warum — der semantische Auslöser fehlt |

**K-LAF korreliert semantischen Inhalt mit Systemzustand.** Das ist der Differenzierer.
Die Detektion selbst ist Commodity und wird zugekauft bzw. eingebunden, nicht selbst
trainiert.

### Was K-LAF nicht ist

Ausdrücklich festgehalten, weil frühere Entwürfe das vermischt haben:

* **gVisor erkennt keine Prompt Injection.** Es ist eine Syscall-Sandbox und weiß
  nicht, was ein Prompt ist. Beim Incident vom 5.9. waren die Lesezugriffe auf die
  `.env`-Dateien aus Kernel-Sicht völlig legitime `open()`/`read()`-Aufrufe.
* **Suricata sieht keine Prompts.** LLM-Traffic ist TLS zu den Provider-Endpunkten.
  Suricata bekommt SNI, JA3-Fingerprint, Volumen und Timing. Wertvoll gegen
  DNS-Tunneling, C2-Beaconing und Exfiltrations-Volumina — wirkungslos gegen Injection.
* **Das Gateway ist der einzige Ort mit Klartext.** Deshalb ist es die primäre
  Inspektionsebene, nicht der Kernel.

---

## 2. Die Identitäts-Brücke (das eigentliche Problem)

Eine Bedrohung erkennen ist wenig wert, wenn unklar bleibt, *wen* man einfrieren soll.
Die Brücke hat drei Ebenen:

| Ebene | Identität | Quelle |
|---|---|---|
| Host / VM | PID, Socket | eBPF (Tetragon) |
| Container | Container-ID, Name | Docker API |
| Session | `session_id`, `trace_id` | JiMesh-Gateway |
| Request | Request-ID | `request_log` |

### Bindung — und warum Selbstauskunft nicht reicht

Ein kompromittierter Agent, der seine eigene `session_id` oder `container_id` im
Header setzt, **kann lügen**. Er behauptet, ein anderer Container zu sein, oder kapert
eine fremde Session. Selbstdeklarierte Identität taugt für Observability, ist als
Grundlage für Enforcement aber wertlos.

**Entschieden — zwei unabhängige Bindungen:**

1. **Provisionierungs-Bindung (autoritativ):** JiMesh spawnt die Container selbst
   (`ExecuteSelfProvisioning`, Sprint 18) und kennt dabei die Container-ID. Es mintet
   ein Session-Token, legt es in `vault_tokens` mit TTL ab und injiziert es als
   Env-Variable in den Container. Der Agent *präsentiert* das Token, er *wählt* seine
   Identität nie selbst.
2. **Netzwerk-Bindung (unabhängig):** Requests kommen aus dem Docker-Netz. Das Gateway
   sieht die Source-IP, die Docker-API sagt, welcher Container sie hat.

**Divergenz beider Bindungen ist selbst ein Threat-Signal** — damit ist
Session-Spoofing erkennbar, ohne dass ein Detektor dafür nötig wäre.

### Zwei Vertrauensklassen

* **Von JiMesh provisioniert** — Identität mit Sicherheit bekannt, Enforcement möglich.
* **Fremd (manuell gestartet)** — nur Discovery-Heuristik, Identität unsicher.
  Warnung statt Freeze.

### Session als Baum, nicht als flacher Key

Ein Agent startet Sub-Agents; ein Auftrag („Coin analysieren und deployen") spannt viele
Calls. `sessions` braucht `parent_session_id`, `container_id` und `project_id`.
Die heutige Tabelle hat nur `id`, `agent_type_id`, `metadata`, `tags`, `created_at`.

---

## 3. Freeze-Review-Release

Vier Eskalationsstufen statt zwei, von billig nach teuer:

| Stufe | Wirkung | Mechanismus | Voraussetzung |
|---|---|---|---|
| 1. Session-Token sperren | Agent bekommt 403, Container läuft weiter | `vault_tokens` invalidieren | ✅ Schema existiert |
| 2. Kontrollierte Fehlerantwort | Statt der Modellantwort eine Sicherheitsmeldung | `return` im Gateway-Handler | ✅ Gateway ist Chokepoint |
| 3. Container-Freeze | Prozess pausiert, Speicher bleibt für Forensik | Docker API `pause` (bzw. `SIGSTOP`) | ❌ `docker/docker` fehlt in `go.mod` |
| 4. Egress-Blackhole | Netzwerk tot, nur für Non-LLM-Traffic nötig | nftables `drop` bzw. `ip route add blackhole` | ❌ |

> **Terminologie-Korrektur:** Frühere Entwürfe sprachen von „Sockets auf `0.0.0.0`
> routen". `0.0.0.0` ist keine Null-Route. Gemeint ist ein Blackhole-Route- oder
> DROP-Eintrag.

Der Agent erhält in Stufe 2 eine kontrollierte Meldung statt eines
Verbindungsabbruchs — das verhindert unkontrollierte Abstürze und Retry-Stürme.
Freigabe erfolgt manuell im Dashboard.

---

## 4. Forensik-Report

Zu großen Teilen Zusammenbau vorhandener Daten, nicht Neuerfassung:

| Bestandteil | Quelle | Stand |
|---|---|---|
| Session-Verlauf vor dem Vorfall | `sessions` + `request_log` | ✅ |
| Latenz, Tokens, TTFB, Status | `request_log` | ✅ |
| Durchsatz, Fehlerraten | `traffic_inspector` (RAM) | ✅ |
| Traces | Langfuse-Layer, `jimesh:events` | ✅ |
| CPU/RAM pro Container | Docker Stats API | ❌ |
| PID- und Socket-Zuordnung | eBPF | ❌ |
| **Prompt/Response-Payload** | — | ❌ bewusst nicht gespeichert |

### Payload-Speicherung ist eine Compliance-Entscheidung

Payloads zu speichern heißt, Secrets zu speichern — beim Incident wären das exakt die
geleakten `.env`-Inhalte gewesen. Zusätzlich können Prompts personenbezogene Daten
enthalten. Ein forensischer Payload-Store braucht daher **von Anfang an** Löschfristen,
Zugriffskontrolle und Redaktion vor der Ablage. Nicht nachrüstbar.

### Bedrohungs-Klassifizierung

Nicht nur Prompt Injection: Data Exfiltration, Privilege Escalation
(Docker-Socket-Missbrauch), Network Scanning, Ressourcen-Missbrauch (Miner).

---

## 5. Isolationsmodell

**Entschieden:** Drei Stufen, nach Onboarding-Aufwand gestaffelt. Der Nutzer soll auf
Stufe 1 starten können, ohne etwas zu installieren.

| Stufe | Isolation | Host-Anforderung | Zielgruppe |
|---|---|---|---|
| **T1** | Rootless Docker, kein Socket-Mount, unprivilegierter User | nur Docker | Laptop, lokale Entwicklung |
| **T2** | gVisor (`runsc`, Systrap) | ein Binary + `daemon.json` | Teams, Standard-Cloud-VMs |
| **T3** | VM pro Projekt (KVM/libvirt), darin Docker + gVisor | Bare-Metal mit KVM | Enterprise, Multi-Tenant |

**Entschieden — KVM/libvirt statt XCP-ng.** Ein früherer Entwurf schlug XCP-ng mit
Open vSwitch und Inline-Suricata in Dom0 vor. Dagegen spricht: XCP-ng ist ein
Xen-Stack mit eigener Management-Ebene (Xen Orchestra), also ein zweiter zu pflegender
Infrastruktur-Stack; Suricata inline in Dom0 ist dort nicht der vorgesehene Weg (das
übliche Muster ist eine dedizierte Firewall-VM als Transit-Gateway); und XCP-ng
braucht Blech. KVM/libvirt liefert dieselbe Isolationsgrenze, ist aus Go über `virsh`
fernsteuerbar und war bereits die ursprüngliche Wahl. **Der Hypervisor ist nicht der
Differenzierer.**

### gVisor-Präzisierungen

* Systrap ist **nicht** ptrace. Die alte Ptrace-Plattform wurde wegen ihrer Latenz
  durch Systrap (seccomp + injizierter Trap-Handler) ersetzt. Systrap braucht keine
  Hardware-Virtualisierung und läuft damit in jeder gewöhnlichen Cloud-VM.
* Kata Containers braucht dagegen Nested Virtualization.
* **eBPF läuft nicht *innerhalb* von gVisor** — im Sandkasten gibt es keinen echten
  Kernel. Der eBPF-Sensor läuft auf dem Kernel der Workspace-VM und beobachtet den
  Sentry-Prozess von außen.
* Zur Sicht *in* die Sandbox hinein: gVisor hat eigene Trace-Points, die Ereignisse
  über einen Socket-Sink ausgeben. Ein früherer Entwurf beschrieb das als „Export ins
  eBPF-Subsystem des Host-Kernels" — das trifft den Mechanismus nicht. Das Ergebnis
  (Sichtbarkeit) stimmt, der Weg ist ein anderer.

---

## 6. Netzwerk: Allowlist schlägt Detektion

**Entschieden — Default-Deny-Egress vor allem anderen.**

Frühere Entwürfe setzten auf Suricata-Regeln zur *Erkennung* von DNS-Tunneling,
TOR-Verbindungen und Massen-POSTs. Der härtere und billigere Weg ist, den Traffic
konstruktiv unmöglich zu machen: Egress-Allowlist pro Workspace auf JiMesh-Gateway,
Paket-Registries und Git-Remote.

Damit gilt:

* Exfiltration an beliebige Ziele ist ausgeschlossen, nicht heuristisch erkannt.
* **Aller LLM-Traffic wird zwangsweise durch JiMesh geleitet** — die Inspektion wird
  unumgehbar statt freiwillig. Solange ein Agent direkt zu `api.anthropic.com`
  telefonieren kann, ist die gesamte Gateway-Inspektion optional, und Malware wählt
  sie nicht.
* Suricata wird zum Backstop für den Rest, nicht zur Hauptkontrolle.

---

## 7. Controller-Level-Features

| Feature | Problem | Lösung | Stand |
|---|---|---|---|
| **DLP / Key-Redaktion** | Agent druckt Keys im Klartext in den Chat | Muster (`sk-`, `gho_`, `BEGIN PRIVATE KEY`, `.env`-Zeilenform) in der **Antwort** maskieren | ❌ — hätte den Incident erwischt, ist reine Regex |
| **HITL-Gate** | Agent führt `bash`/`write_file` autonom aus | Gateway hält an, Dashboard-Freigabe per Y/N | ❌ |
| **Ephemere Workspaces** | Container laufen tagelang und bieten Angriffsfläche | VM/Container nach Task bzw. Inaktivität zerstören | ❌ |
| **Zero-Trust Credentials** | `.env` im Klartext im Projektordner | Vault, JIT-Injektion nur in den Prozessspeicher | ✅ Mandat 9, Schema existiert |

---

## 8. Detektor-Strategie

Injection-Erkennung wird **nicht selbst gebaut**. Sie ist ein bewegliches
Forschungsziel, und spezialisierte Anbieter haben auf großen Angriffskorpora
trainiert.

**Entschieden — pluggable Detektor, der durch das eigene Mesh läuft.** Modelle mit
offenen Gewichten (Prompt Guard, Llama Guard) liegen auf NVIDIA NIM, wohin JiMesh
ohnehin routet. Der Scanner wird damit einfach eine weitere Chain — mit Bandit,
Failover und Budget-Check. Kein zweites Inferenz-System.

Die billigste Stufe braucht gar kein Modell: Secret-Muster in der Antwort sind Regex,
kosten Mikrosekunden und decken den real eingetretenen Schadensfall ab.

> Versionsstände, Lizenzen und Wartungszustand der genannten Projekte sind vor einer
> Produktentscheidung zu prüfen — das Feld bewegt sich schnell.

---

## 8b. Bestehende Werkzeuge (statt selbst bauen)

Zwei Open-Source-Projekte decken die Kernel-Schicht bereits ab. Details und Einordnung:
`docs/reference/ebpf/`.

| Projekt | Rolle | Einschätzung |
|---|---|---|
| **AgentSight** (`reference/ebpf/agentsight.md`) | Beobachtung — eBPF + TLS-Klartext an SSL-Grenzen, Korrelation LLM ↔ Prozess ↔ Datei | MIT, Rust, arXiv:2508.02736. **OTLP/GenAI-Export** ist der Integrationspunkt. Nicht neu bauen. |
| **Jailer** (`reference/ebpf/jailer.md`) | Durchsetzung — BPF-LSM-MAC für file/network/exec | Upstream: *nicht produktionsreif*. Braucht Grub-Änderung + Reboot → widerspricht Tier-1-Onboarding. Beobachten. |

Beide bestätigen die Aufgabenteilung aus §1: **eBPF liefert Ereignisse und
Syscall-Durchsetzung, keine Prompt-Analyse.** Jailer kontrolliert `open`, `connect`,
`bind`, `execve` — nirgends Inhaltsverständnis.

Und beide ändern die Priorisierung nicht: Ihr Hauptwert ist Zero-Instrumentation für
Pfade, die man nicht kontrolliert. JiMesh kontrolliert den eigenen Proxy-Pfad. Der
Restbereich — Traffic *an* JiMesh vorbei — wird von der Egress-Allowlist (WP5)
billiger geschlossen als von einem eBPF-Sensor.

---

## 9. Marktposition

Kommerzielle LLM-Firewalls liefern ein Urteil zurück — und dort endet es. Keine von
ihnen kann den Container einfrieren, der den Call abgesetzt hat, weil keine von ihnen
ihn provisioniert hat.

**JiMesh provisioniert die Workspaces selbst.** Daraus folgt die Identitätskette, und
aus der folgt Enforcement. Das ist die verteidigbare Position — nicht die Detektion.

---

## HANDOFF

_(vom Executor auszufüllen)_
