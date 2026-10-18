# MANDATES.md — Standing Mandates for JiMesh

These are **permanent rules** for every human and AI agent working in this repo.
They exist because each one was earned by a real bug. Violations of these
mandates are bugs, even when tests pass. `Agents.md` references this file; the
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
- A read endpoint whose real data source does not exist (yet) is **removed**,
  not faked: wiring it to a live system later re-adds it; keeping a hardcoded
  "healthy" answer trains operators to trust green lies. (Case: the old
  `/api/datalake/status|pipelines` always answered "healthy", 1 pipeline,
  12 ms lag from literals — removed 20.9.2026, GHOST-AUDIT D.4, because the
  datalake behind it was never deployed or wired.)
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

## 7. 🧱 Architecture Mandates (from Agents.md, binding)

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

## 13. 🌐 Domain Hierarchy Mandate (4-Tier Model & Fallback Scope)

The domain representation of infrastructure objects across JiMesh (UI, API, and Store) strictly enforces a **4-tier hierarchy**:

1. **SSH Target (Remote Node)**: Physical/virtual server host (e.g., `user@host:22`) carrying gVisor/runsc runtime capabilities.
2. **Workspace**: Server-level execution workspace that groups multiple Projects on a given SSH Target.
3. **Project**: Functional grouping of applications (e.g. `prj-default`), inheriting paths/mesh settings. **Projects do NOT carry their own published ports.**
4. **App (Deployment)**: Individual app/service instance (e.g. website, API, background tool). **Apps ALWAYS carry published ports, paths, and type classification.**

### Parent Inheritance & Fallback Rules (`no_parent`)
- Ports and endpoints are published **exclusively at the App level** and aggregate upwards to Projects and Workspaces via deterministic hash-lookup tables.
- If an App has no explicit parent Project, or is unassigned/dragged-and-dropped out, it automatically assigns to the fallback parent **`no_parent`**.
- `no_parent` groups and nodes are displayed in navigation surfaces **only when unassigned discovered apps or ports exist**.

---

## 14. 👻 No Ghost Code — Reachability Is Part of Done

**Origin (2026-09-20):** the three Jules-built pages (Workspace-Detail
`/workspaces/ws/:id`, Project-Detail `/workspaces/projects/:id`,
Agent-Session-Detail `/sessions`) shipped as working routes with real API
calls — and ZERO navigation wiring: no sidebar entry, not a single link from
any list or panel. The operator opened the dashboard, found nothing new
("ich find da nix", "nichts integriert") and was right: a page the UI cannot
reach is dead weight no matter how correct its code is. The same defect
class already existed backend-side: `SetDLPEnabled` with no caller
(AUDIT-BACKEND-SECURITY F-04), the OTel spine with no call sites (F-05).

**Rule:** a route/page/endpoint/component is DONE only when it is REACHABLE
and USED:
1. Every new page needs (a) a nav entry in `src/frontend/src/lib/section-nav.ts`
   and/or (b) a link from the surface it belongs to (list rows → detail pages,
   panels → detail views) — wired in the SAME change, never "later".
2. The change's report must PROVE reachability by naming the click path
   (e.g. "Workspace row click → /workspaces/ws/:id").
3. Every new backend route needs a consumer (frontend or documented operator
   flow) in the same work package — endpoints without callers are ghost code.
4. Agent/Jules prompts MUST require the wiring explicitly; "register the
   route" alone is not a complete instruction.
5. A second implementation of an existing capability (second landing, second
   docs page, second icon registry) is ghost code until the original is
   removed in the same change.

---

## 15. 🔒 JSON-Listen sind nie `null` — immer `[]`

**Origin (2026-09-30, SPRINT-168):** mit dem SIEM-Indexer live auf trading lieferte
`/api/security/threat-correlation` erstmals echte Rows — und das Threat-Response-Panel
crashte mit "can't access property 'map', t.correlated is null": `correlate()` deklarierte
eine nil-Slice (0 Paare — korrekt, aber nil statt leer), Go serialisiert nil-Slices als
JSON `null`, und das Frontend mappte ungeguardet drüber. Der Bug war die ganze Zeit da —
unsichtbar, solange der Endpoint leer/fehlernd antwortete. Fix beidseitig (Defense in
Depth): Backend (`make([]T,0)` + normalize vor dem Encode) und Frontend (Array.isArray-
Guards), plus Wire-Contract-Regressionstest.

**Rule:**
1. Jede Go-Struct-Liste, die als JSON rausgeht, wird vor dem Marshal auf nicht-nil
   normalisiert (leer = `[]`, nie `null`) — Initialisierung bei Deklaration oder eine
   normalize-Funktion unmittelbar vor dem Encode.
2. Jedes Frontend, das Wire-Listen konsumiert, guarded trotzdem
   (`Array.isArray(x) ? x : []`) — ein null reicht, um eine ganze Page zu killen.
3. Wire-Contract-Tests: für Report-Endpoint mit Listen gehört ein Test dazu, der den
   0-Fall gegen das Vorhandensein von `"[]"` UND das Fehlen von `":null"` assertet
   (Vorbild: `TestThreatCorrelationReportWireNeverNull`, threat_correlation_test.go).

---

## 16. 📖 OKF Knowledge Mandate (Sprint 43 — earned by documentation sprawl & slop risk)

**Numbering note (1.10.):** this mandate used to sit directly above §13 as a SECOND
"## 13" — a numbering collision. §13 is the Domain Hierarchy Mandate (referenced by
that number in `docs/FE-OVERVIEW-SPEC.md` and BACKLOG #087), so OKF moved to the
bottom, where new mandates are added anyway.

All technical research, architectural specifications, security benchmarks, and agent knowledge documents must be formatted and maintained in the **Open Knowledge Format (OKF v1.0)** within the `knowledge/` taxonomy:

1. **Decoupled Architecture**: Research documents live under `knowledge/<topic>/<subtopic>/<doc-name>.md` and are strictly decoupled from application source code and private sprint logs.
2. **Standardized OKF Frontmatter**: Every document must start with valid YAML frontmatter specifying `okf_version`, `id`, `title`, `topic`, `subtopic`, `status`, `visibility`, `created_at`, `tags`, and `summary`.
3. **Zero Sensitive Data & Zero Slop**: All developer paths (`/home/ji`), credentials, private IPs (`88.198.67.200`), internal prompt chat logs, and unverified AI slop/conversational filler are strictly forbidden.
4. **Standalone Export Readiness**: The `knowledge/` directory must remain self-contained and clean so it can be exported directly to a standalone knowledge repository at any time.

---

---

## 17. ⚖️ Rechtliche Verstöße melden (Case: Tutario-Abmahnung, 1.10.2026)

**Origin story:** Am 1.10.2026 wurde der Operator „wegen dem Tutario-Inzident von saits
abgemahnt, weil wir den Chatbot auf der Tutario-Seite getestet haben" (Operator-Order,
verbatim, SPRINT-178). Der Chatbot selbst war nicht das Problem — das **Verhalten**
(Test/Embedding auf fremder Domain) und die **fehlende Meldung** waren es. Daraus:

Jeder Verdacht auf einen **rechtlichen Verstoß** (Abmahnung, Fremdrechte, DSGVO,
Urheber-/Markenrecht, ToS-Fremdplattformen, scraping/embedding ohne Freigabe) ist ein
**Meldepfad**, kein internes Detail:

1. **Sofort stoppen.** Kein Deploy, kein Weiterbetrieb, kein „nur noch schnell testen"
   des betroffenen Verhaltens.
2. **Dokumentieren** — Fakten, nicht Meinungen: was, betroffene Domain/Partei, Zeitfenster,
   beteiligte Commits/Logs/Chatverläufe, bisherige Kommunikation (verbatim).
3. **Ticket anlegen**: Eintrag im aktuellen `docs/sprints/…`-File **und**
   `docs/backlog/BACKLOG.md` mit Status „rechts offen" — der Status bleibt stehen, bis der
   Operator ihn schließt.
4. **Eskalation in derselben Session** an den Operator, mit dem Originalzitat; nie warten,
   bis jemand nachfragt.
5. **Keine Spuren vernichten** — Logs, Chatverläufe, Exporte aufbewahren (Beweiswert und
   Aufbewahrungspflicht schlagen Aufräumen).
6. **Vor jeder Auslieferung eines Features, das Dritte berührt** (Testing auf fremden
   Seiten, Scraping, Embedding, Crawler, Caching fremder Inhalte, externe APIs) braucht es
   die **explizite Freigabe des Operators**. Ohne Freigabe = nicht getan, auch „nur zum
   Testen" nicht.

Verstößt ein Auftrag gegen Punkt 6, ist die korrekte Antwort die Ablehnung samt Grund —
nicht der Ausführungsvorschlag mit Warnung.

---

*Add new mandates at the bottom with the case that earned them. A mandate
without its origin story is a rule nobody remembers.*
