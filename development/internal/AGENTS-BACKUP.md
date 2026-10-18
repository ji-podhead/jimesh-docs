# Agents.md — Developer & Agent Workspace Guidance

This file outlines build, test, formatting, and linting commands, along with architecture guidelines, specifically tailored for Claude CLI (Claude Code) and other AI agents.

---

## 🛠️ Build & Development Commands

Run `make help` for the full, self-documenting target list. The important ones:

1.  **Orchestrating Services (Docker Compose):**
    *   Start the whole stack (Postgres + Redis + backend + frontend): `make up`
    *   Stop: `make down` (named volumes survive)
    *   **Apply backend code changes: `make restart-backend`** — force-recreates
        the container and WAITS until the new binary answers `/health` (prints
        ✓/✗). This is the only reliable code-change path: `make up` does
        nothing while containers are running, and `docker compose build` is a
        no-op here (the backend is a bind-mounted source container — there is
        no image to build).
    *   Follow logs: `make logs` (all) / `make backend-logs` / `make frontend-logs`
    *   Container status: `make ps`
    *   Frontend stale-cache pain: `make frontend-clean`; production build:
        `make frontend-build`

2.  **Real builds & checks (not compose build):**
    *   Compile backend: `make go-build` (host toolchain if present, else in
        the `golang:latest` container with the same caches)
    *   Vet: `make go-vet`
    *   Backend tests: `make go-test` — runs against a **throwaway
        `jimesh_test` database**, never your real data (stack must be up)
    *   Vet + tests in one shot: `make check-backend`

3.  **Protobuf & gRPC Codegen:**
    *   Compile schemas and write outputs directly to host: `make proto`
    *   *Constraint:* Never edit generated `.pb.go` or `_grpc.pb.go` files manually. Modify `src/backend/protos/jimesh/jimesh.proto` and run `make proto`.

4.  **Frontend tests (`src/frontend/`):**
    *   Run: `npm run test` (from `src/frontend/` directory)

---

## 🎨 Formatting & Linting

1.  **Go Backend:**
    *   Format code: `go fmt ./...`

2.  **JavaScript / TypeScript:**
    *   Lint code: `npm run lint` (inside `src/frontend/` only)

---

## 🧱 Architectural Mandates

*   **No Root `node_modules`:** All Node.js dependencies live strictly within `src/frontend/`. Do not run `npm install` in the monorepo root.
*   **Pure Go (No CGO):** `CGO_ENABLED=0` build. Persistence is **PostgreSQL via the pgx v5/stdlib driver only**. There is no SQLite in this repo.
*   **Event-Driven Learning:** Clients send execution outcomes to Redis Stream `jimesh:events` (`jimesh-redis:6379` inside the compose network). The backend's background feedback loop consumes them to adjust bandit routing weights.
*   **API surface lives in `src/backend/internal/gateway/`.** There are no hidden/fallback handlers anywhere; if the route is not in `gateway.go`, it does not exist. Routes are documented in `API_DOCS.md`.

## ⚖️ Standing Mandates — read `MANDATES.md` first

All permanent rules for this repo live in **`MANDATES.md`** (repo root): documentation, **no-mock** (no endpoint may pretend — real persistence, real data, honest empty states), persistence (user work survives restarts; startup never purges), proxy (the router really uses saved chains/pools/mesh edges and failover walks the chain), safe deploys (volume + agent context preserved), verification (honest "done", exact commands for the operator), architecture, and migrations. Read it before any change; add new mandates there with the case that earned them.

## 📚 Documentation Mandate (always — no exceptions)

Every functional change to this repo MUST keep the documentation in sync **in the same change**. This is a standing mandate, not an optional nicety:

1.  **`API_DOCS.md`** — Add/update/delete every HTTP route you touch (method, path, payload, response). If a route exists in `gateway.go` but not in `API_DOCS.md`, that is a bug.
2.  **`docs/sprints/`** — Ongoing work lives in the current sprint file (`SPRINT-<N>-<NAME>.md`). New work packages get a new sprint file; finished items get checked off there with file references. Never start work without recording it in the sprint file.
3.  **`docs/backlog/BACKLOG.md`** — Mirror the current sprint's items at the top of the backlog (done `[x]` / in progress `[~]` / open `[ ]`). Closed items move to the sprint archive, they are not deleted.
4.  **Plan before code** — Any multi-file or feature-spanning change starts with a short plan section in the sprint file (goal, work packages, acceptance criteria) before implementation begins.
5.  **Retrospective honesty** — Sprint docs record what actually shipped (verified against the code), not aspirations. Aspirations belong in the backlog.


## 🧹 Removed legacy tiers

The following paths no longer exist and any reference to them is a bug:
*   `clients/cli/` (old FreeLLMAPI TypeScript CLI)
*   `clients/desktop/` (old Electron tray app)
*   `server/` (the original Node.js + better-sqlite3 tier)

Talk to the Go backend directly via `examples/jimeshctl` or any HTTP client. Never assume the legacy tier is reachable.

---

## 🎨 Google Stitch MCP (UI-Design-Tool)

JiMesh nutzt Google Stitch für UI-Designs. Die komplette Anleitung steht in `docs/STITCH-MCP-GUIDE.md`. Die wichtigsten Regeln:

**Verbindung:**
*   **MCP-Endpoint:** `https://stitch.googleapis.com/mcp` (HTTP POST, JSON-RPC)
*   **API-Key:** `X-Goog-Api-Key` Header (liegt in `.env` als `STITCH_API_KEY`)
*   **JiMesh-Projekt-ID:** `18208781056688578837`

**Argument-Regeln (nach Trial&Error verifiziert — NICHT abweichen!):**
1.  `projectId` = NUR die Nummer (z.B. `18208781056688578837`), KEIN `projects/`-Prefix
2.  `selectedScreenIds` = Array von Hex-IDs (z.B. `["b279f9f4e6464543"]`), KEIN `screens/`-Prefix
3.  Es gibt KEIN `screen_name`-Parameter — der Screen-Titel entsteht aus dem Prompt-Text

**Workflow: generieren → prüfen → refinieren → laden:**
1.  `generate_screen_from_text` mit `{projectId, prompt, deviceType:"DESKTOP"}`
2.  `list_screens` mit `{projectId}` → neue Screen-IDs abrufen
3.  `edit_screens` mit `{projectId, selectedScreenIds:["<id>"], prompt}` für Nachprompten
4.  Screenshot+HTML via `screenshot.downloadUrl` + `htmlCode.downloadUrl` aus `list_screens` laden

**Timeouts:** Stitch braucht 60-120s pro Screen. Max 4 pro Batch. Bei Timeout: `list_screens` prüfen — Stitch arbeitet oft weiter.

**56 Screens existieren** (alle als PNG+HTML in `assets/design-assets/stitch/`). Neue beginnen mit `"SCREEN: <Name>. Design a dark-mode ..."`

**Nutze den Node.js-Wrapper aus STITCH-MCP-GUIDE.md statt curl** (Quoting-Probleme!).


# JiMesh — Agent / Developer Mandates

Mandates that apply to every change in this repo. The repo went through a
Go-port migration (Node.js+SQLite → Go+PostgreSQL+Redis Streams); see
`docs/sprints/SPRINT-8-ENTERPRISE-POSTGRES-DEBEZIUM.md` for the
retrospective. Everything below reflects the post-migration reality.

---

## 📁 Repository directory structure

*   `src/backend/`            — Go gateway, **the only business-logic tier**.
    gRPC on `:3009`, HTTP REST on `:3010` (host-mapped to `:19092` /
    `:19091`). Pure Go, `CGO_ENABLED=0`, PostgreSQL via `pgx/v5`.
    Layout: `cmd/server/`, `internal/{gateway,store,service,router,keypool,streams,tracing,protos}/`.
*   `src/frontend/`           — Next.js dashboard on `:5173` (host-mapped to `:19090`). Reads only via
    `/api/*` and `/v1/*` from the Go backend. Has its own `node_modules/`.
*   `src/repo-assets/`        — Brand assets, comparison images.
*   `examples/`               — Standalone integration code that is **not** part of the
    gateway binary:
    *   `examples/jimeshctl`   — Bash + curl + jq operator CLI.
    *   `examples/fetch-relay-worker/` — Cloudflare edge relay.
*   `docs/`                   — Architecture notes, sprint retros, archived guides.
*   `docs/API_DOCS.md`        — Canonical operator-facing HTTP API reference.

The following paths no longer exist (references to them are a bug):
`clients/cli/`, `clients/desktop/`, `server/` (Node.js+better-sqlite3 tier).

---

## 🧱 Core architectural constraints

1.  **PostgreSQL via pgx/v5 stdlib. SQLite is gone.**
    *   Driver pulled in with `_ "github.com/jackc/pgx/v5/stdlib"` only.
    *   Migrations live in `internal/store/store.go:migrate()` — `CREATE TABLE
      IF NOT EXISTS …` + idempotent `ALTER TABLE … ADD COLUMN IF NOT EXISTS …`
      patterns. Add a migration there when you change the schema; do not
      drop/recreate tables in production.
    *   **Every nullable column that Go scans into a plain `string` MUST be
      wrapped in `COALESCE(col, '')` (or `[]`/`{}`) on the SQL side, otherwise
      `database/sql` panics with `converting NULL to string is unsupported`.**
      Existing COALESCE patterns in `internal/store/store.go` are mandatory.

2.  **Pure Go (No CGO).** `CGO_ENABLED=0`. Build with the official
    `golang:1.23-bookworm` (or newer) image.

3.  **Redis Streams for pub/sub.**
    *   `jimesh:events` — bandit feedback loop. Consumed by
      `internal/streams/Hub` → updates KeyPool cooldowns.
    *   `jimesh:logs`   — agent log ingest. Streamed back to the dashboard via
      SSE at `GET /api/streams/logs`.
    *   The Go binary must stay functional when `REDIS_ENABLED=false` (the
      SSE endpoint returns 503 in that mode — that is intentional).

4.  **HTTP route surface lives in one file.** `internal/gateway/gateway.go`.
    Anything not registered there does not exist. The frontend never calls
    the DB directly; if you add a query, add a route and document it in
    `API_DOCS.md`.

---

## ⚡ Development & container conventions

1.  **Bind-mounted source, no image rebuild for code changes.** The `jimesh`
    container mounts `./src/backend` and runs `go run ./cmd/server`. To apply
    changes:
    ```bash
    make restart-backend    # THE code-change path: force-recreate + wait for /health
    ```
    The `jimesh` container intentionally **has no healthcheck** — the boot
    step installs `docker.io` via `apt-get` and a 30-second healthcheck would
    race against that and create an infinite death loop.

2.  **Protobuf codegen.** Modify `src/backend/protos/jimesh/jimesh.proto`,
    then `make proto`. Never hand-edit `*.pb.go`.

3.  **Zero root `node_modules`.** Only `src/frontend/` has Node deps. Do not
    `npm install` at the monorepo root.

4.  **Frontend reads only via the gateway.** The dashboard never opens a
    database connection, never bypasses `/api/*` or `/v1/*`, never implements
    business logic. Mock data, fake-loop simulators, and localStorage-backed
    model pools are all bugs.

---

## 🚦 Verification rules before submitting

*   `make restart-backend` (the only supported code-change path).
*   `curl -s http://localhost:19091/health` returns `{"status":"ok"}`.
*   `curl -s http://localhost:19091/v1/chains` returns the chain list (or
    `{"chains":[]}` if empty — never a 5xx unless you broke `COALESCE`).
*   `curl -s http://localhost:19091/api/models | jq '.models | length'` shows
    the catalog count.
*   Smoke test a chat completion through `examples/jimeshctl stream`.

If any of these fail, the change is not done — fix the route, the COALESCE,
or the migration; do not paper over with a frontend fallback.
