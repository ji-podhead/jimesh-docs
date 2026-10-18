# JiMesh — Operator Runbook

This is the production-facing runbook for the Go-based JiMesh gateway (no
SQLite, no Node.js tier, no Electron client). If you are looking for legacy
material, see `docs/sprints/` for retrospective coverage.

## Stack overview

| Tier | Implementation | Where |
|------|----------------|-------|
| Persistence | PostgreSQL 16, pgx/v5 stdlib driver (pure-Go) | `jimesh-postgres` container |
| API server | Go 1.25, `CGO_ENABLED=0` | `jimesh` container (→ `:19091`) |
| Dashboard | Next.js + React 19 | `jimesh-frontend` container (→ `:19090`) |
| Pub/Sub | Redis Streams | `jimesh-redis` container (→ `6385`) |

The route surface is owned by one file: `src/backend/internal/gateway/gateway.go`.
Every route that exists in the binary is documented in [API_DOCS.md](./docs/API_DOCS.md)
and reachable from `examples/jimeshctl`.

## Daily operations

### Apply a code change

```bash
# bind-mounted source, so just rebuild the container
make restart-backend
```

The Go server picks up any `src/backend/**/*.go` edit on the next container start.
The `jimesh` image installs `docker.io` on first start, so the `docker compose`
workflow intentionally has no healthcheck (it would race against `apt-get`).

### Inspect the running stack

```bash
make ps          # docker compose ps
make logs        # tail every container
docker logs -f jimesh-jimesh-1          # backend only
docker logs -f jimesh-postgres          # postgres only
docker logs -f jimesh-redis-1           # redis only
```

### Read live routing logs

The dashboard's Logs Console streams `jimesh:logs` over SSE at
`GET /api/streams/logs`. From the shell:

```bash
./examples/jimeshctl http://localhost:19091 logs 30
```

(Without arguments, the tail runs until timeout — Ctrl-C exits cleanly.)

### Re-sync the model catalog

```bash
./examples/jimeshctl http://localhost:19091 sync-catalog
```

This pulls the bundled fallback catalog (or the upstream JSON if you set the
catalog URL back to the legacy feed). For per-key model discovery we rely on
`POST /api/keys` triggering `discoverAndRegisterModels` against the provider's
`/v1/models` endpoint — keys already in the database are NOT re-discovered
unless you toggle them.

### End-to-end smoke test

```bash
HOST=http://localhost:19091

# 1) Health
./examples/jimeshctl $HOST health

# 2) Pick a working key
KEY=$(./examples/jimeshctl $HOST keys \
  | jq -r 'map(select(.platform == "nvidia" and .enabled == true)) | .[0].id')

# 3) Create a chain with one model
./examples/jimeshctl $HOST chain-create smart:nemotron "Smoke" "$KEY" \
  nvidia/llama-3.1-nemotron-70b-instruct

# 4) Activate
./examples/jimeshctl $HOST activate smart:nemotron

# 5) Stream a completion
./examples/jimeshctl $HOST stream smart:nemotron "Hello" | head -c 200
```

If step 5 returns HTTP 429 with `no available/healthy keys for this platform`,
wait 30–60s and retry — the KeyPool cooldown is per-key and decays automatically.

## Disaster recovery

| Symptom                                            | First action                                           |
|----------------------------------------------------|--------------------------------------------------------|
| Backend container in restart-loop                  | `make restart-backend`  (not `docker compose restart`, that won't clear the lock) |
| Wrong / corrupted schema                           | `docker exec jimesh-postgres psql -U jimesh -d jimesh -c "\dt"` to inspect; never DROP a Postgres table while the volume is mounted to a healthy container — use the `psql` interface |
| Keys table shows `id` column not auto-incrementing | Recreate the affected rows via `INSERT INTO keys DEFAULT VALUES` or rebuild the table (destructive) |
| Redis Streams wedged                                | `docker exec jimesh-redis-1 redis-cli XLEN jimesh:events`  → if unexpectedly large, drain with `XDEL` |
| Dashboard gets stale data                            | Hard-reload (Ctrl-Shift-R); the front-end has no business logic, so any drift is a backend bug |

## Adding a provider

1. Add a case in `discoverAndRegisterModels` at
   `src/backend/internal/gateway/gateway.go` (the `switch platform` block —
   pick the provider's `/v1/models` URL and decide whether you want
   `Authorization: Bearer …`).
2. Add a special-case block above the switch if the provider returns a
   non-standard shape (OpenRouter and Pollinations are the two existing ones).
3. Document the new URL in `API_DOCS.md` (`Provider discovery` paragraph).
4. Rebuild with `make restart-backend`.

## Adding a route

1. Add the handler in `src/backend/internal/gateway/gateway.go`.
2. Wire it in `mux.HandleFunc(...)` next to its siblings.
3. Document it in `API_DOCS.md` with at least one curl example.
4. Add a one-line wrapper to `examples/jimeshctl` if the operator will use it.

Anything else ("just put it in the React app", "stick a route in the
deprecated `server/` folder") is a bug.

## Reference

* [API_DOCS.md](./docs/API_DOCS.md) — canonical HTTP API surface
* [Agents.md](./Agents.md) — agent workspace guidance (build commands, removed-tier list)
* [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — component walkthrough
* [docs/sprints/](./docs/sprints/) — retrospective of the Node → Go port
* [docs/legacy/PROJECT_STRUCTURE.md](./docs/legacy/PROJECT_STRUCTURE.md) — directory layout (historical, FreeLLMAPI-era)
