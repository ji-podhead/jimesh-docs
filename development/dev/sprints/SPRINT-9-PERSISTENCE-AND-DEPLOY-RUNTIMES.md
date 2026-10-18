# Sprint 9 — Persistence & Proxy Integrity + Deployment Runtimes

**Status:** IN PROGRESS
**Started:** 2026-09-04
**Trigger:** Operator report: "nothing is saved — fallback chain, pools, edges,
models; the proxy functionality as a whole is not given." Follow-up requests:
runtime selection for agent deployments (docker/python/go/…, **make**), Git
token provisioning, working docker-socket pass-through, and a redeploy that
preserves the agent's volume + session context.

---

## Goal

1. Every save action in the dashboard round-trips to PostgreSQL and survives a
   backend restart.
2. The proxy (`/v1/chat/completions|embeddings|ws`) routes over the *saved*
   chains with working failover and live SSE streaming.
3. Agent deployments are configurable per runtime/toolchain, can authenticate
   against Git, and can be redeployed **without losing the volume or the DSH
   session context**.

## Work Package 1 — Persistence & proxy integrity (backend)

Root causes found in the audit (all fixed in this sprint):

- [x] `SeedDefaults()` wiped **all** discovered models of the major platforms
      and every `auto:*` chain (canvas pools!) on **every** startup
      → nothing ever stuck in PostgreSQL. `src/backend/internal/store/store.go`
      now only *adds* the missing `default` chain; user data is never purged.
- [x] Seeded `default` chain had `auto_skip_exhausted = 0` → the proxy never
      failed over on 429/402. New seeds start with failover ON; untouched
      legacy installs get a one-time backfill (`store.SeedDefaults`).
- [x] `POST /api/profiles` ignored the payload `id`/`tier` and generated
      `custom:<name>` — canvas pools (`auto:…`) were orphaned. The handler now
      honors the requested id/tier, validates and 409s duplicates.
      `src/backend/internal/gateway/gateway.go` (`handleProfiles`).
- [x] No `PATCH/PUT /api/profiles/{id}` — pool rename could not persist.
      Implemented (name/tier).
- [x] Mesh-canvas **edges** were visual-only state. New endpoint
      `GET/PUT/DELETE /api/fallback/edges?profile_id=` persists edges in the
      chain `metadata.mesh_edges` JSON column (round-trips through
      `UpsertChain`, no schema change).
- [x] `GET /api/models/{id}` returned 405 (sidebar specs broke) and
      `DELETE /api/models/{id}` returned `success` **without any store call**.
      Both implemented for real (GET resolves by model-id or chain position;
      DELETE removes the chain entry + the model row, `DeleteModelByIDPlatform`).
- [x] `PUT /api/fallback` with the sparse payload of the model detail page
      (`{modelDbId, priority, enabled}` — no `modelId`) **replaced every chain
      entry with empty rows** = silent total wipe of the saved chain. The
      handler now merges sparse rows positionally instead of replacing.
- [x] Missing key routes the dashboard calls:
      `POST /api/keys/bulk-toggle`, `POST /api/keys/bulk-delete`,
      `DELETE /api/keys/{id}/cooldowns` (new `keypool.Pool.ClearCooldown`).
- [x] `POST /api/discovery/sync` was missing ("Sync now" 404'd) → reuses
      `SyncCatalog`.
- [x] Proxy chain resolution ignored the active dashboard profile:
      `resolveChainForRequest()` now tries model-as-chain → active profile →
      `default` → first chain. Applied to chat, embeddings and WS proxy.
- [x] Proxy retry loop only retried 429/402 when `autoSkip` was set; upstream
      5xx was never retried. Now: 5xx always retryable, 402/429 per chain flag.
- [x] SSE streaming was buffered (`io.Copy` without flush) →
      `flushWriter` flushes per chunk.

## Work Package 2 — Deployment runtimes, Git token, safe redeploy

Plan (acceptance criteria below):

- [~] **Runtime selection** — `DeployRequest.Runtime` with presets
      `dsh` (harness), `python`, `go`, `node`, `docker`, `base` (ubuntu).
      Unknown/empty falls back to the framework default. Persisted per project.
- [~] **Extra tools layer** — `DeployRequest.Tools` (e.g. `make`, `gcc`,
      `docker`, `python`, `node`, `go`) installed best-effort into the running
      container so agents can actually build/deploy ("make muss auswählbar
      sein").
- [~] **Docker socket** — `DeployRequest.DockerSock` was sent by the UI but
      **not even parsed** by the backend. Now mounts
      `/var/run/docker.sock:/var/run/docker.sock` when set.
- [~] **Git token provisioning** — `DeployRequest.GitToken` (never persisted in
      PostgreSQL) is injected as `GIT_TOKEN` env and configured as a
      `credential.helper store --file=<volume>/.git-credentials` inside the
      persistent volume, so private-repo auth survives redeploys.
- [~] **Volume-safe lifecycle** — undeploy no longer deletes the named volume
      `jimesh-dsh-data-<projId>` unless the caller explicitly sends
      `purgeVolume: true` (the old sweep `docker volume rm`-ed the agent's
      `/root/.dsh` state = context loss).
- [~] **Redeploy endpoint** — `POST /api/projects/redeploy` stops+removes the
      containers (without `-v`), then re-runs the deployment with the same
      project id → same named volume → volume + context preserved.
- [~] **Project persistence** — new `store.ProjectRow` +
      `UpsertProject/ListProjects/DeleteProject`; deploy/redeploy persist the
      full non-secret config (runtime, framework, node host/user/port,
      workspace path, ports, router, volume name); `GET /api/projects` lists
      from PostgreSQL so the dashboard no longer depends on localStorage.

## Work Package 3 — Dashboard wiring (frontend)

- [x] `views/ProjectsPage.tsx`: runtime + tools section in deploy/edit dialogs,
      git-token field, redeploy button calls the new endpoint, delete asks
      whether to purge the volume.
- [x] `components/chain-mesh-graph.tsx`: edges load/save via
      `/api/fallback/edges` (hydrate on load, PUT on connect, DELETE/PUT on
      remove), pool rename via `PATCH /api/profiles/{id}`, presets via the
      settings KV (`pool_presets`), profile creation + rename invalidate the
      profiles query. Edges save INSTANTLY (no Save button) by design.
- [x] `views/FallbackPage.tsx`: pass `profileId` into the mesh graph; save
      payload defaults `chainId` to the selected profile (no phantom `auto:s`).

## Work Package 4 — Router really uses the saved chains & pools (backend)

- [x] `service.Route()`: POOL-AWARE routing. Entries group by pool
      (`model_type`, empty = the router's own pool id); pool traversal order
      follows the SAVED mesh edges (chain metadata `mesh_edges`) breadth-first
      from the entry pool, then unconnected pools by best entry priority.
      Within a pool the bandit picks (`escalation_cost` chains sort by cost);
      a pool without eligible keys is the pool-level failover step.
- [x] Failure exclusion: `MarkRouteFailure`/`ClearRouteFailure`/`routeFailureActive`
      (90 s TTL, in-memory). The proxy retry loop marks 429/402/5xx candidates
      dead, so the NEXT `Route()` walks ON through the chain instead of
      re-picking the same entry. Attempts now scale with chain length
      (min 3, max 8).
- [x] Missing models rows no longer hard-skip an entry — explicit pool
      membership wins, routing falls back to catalog defaults (WARN logged).
- [x] Legacy tier presets `auto:s`/`auto:a`/`auto:b` deleted at startup
      (`SeedDefaults`); entries without a pool normalized to their chain id
      (`model_type = chain_id`) — the phantom "auto:s" pool/router is gone.
      User-created `auto:<name>` pools are untouched.
- [x] `handleFallback` GET/PUT: `chainId` semantics fixed — empty pool maps to
      the router's own chain id on both read and write (no implicit `auto:s`).

## Work Package 5 — De-mocking the dashboards (backend)

- [x] `handleDshImport`: was `{"imported": 3}` pure lie → REAL import. Parses
      the uploaded DSH `settings.yaml`/`.json` (multipart `file`, optional
      `credentials` file for `.credentials.yaml` refs) with a minimal
      indentation-based YAML-subset parser (`gateway/dsh_import.go`, no new
      deps — CGO_ENABLED=0 pure Go). Creates keys (dedupe by platform+label,
      backfill empty secrets), stores base URLs as `custom_base_url:<keyId>`
      and imports every provider model ENABLED into the catalog.
- [x] `handleDshPreview`: real dry-run (`{preview:[{name, platform, baseURL,
      models, keyConfigured}]}`) instead of `[]`.
- [x] `handleDshTest`: REAL `GET {baseURL}/models` probe with the stored key
      (8 s timeout, honest latency + HTTP status + errors) instead of fake
      "connected, 140ms"; reports `no-key` when nothing is stored.
- [x] `handleDshSettings`: REAL state from PostgreSQL (providers = keys +
      stored base URLs + `keyConfigured`, tiers = chains + model counts)
      instead of hardcoded mock providers.
- [x] `handleFallbackStats`: real counters from the recorded request ring
      (requests, avg latency, success rate, tokens, key status) — the
      hash-based fake `142 requests` is gone.
- [x] `handleFallbackTokenUsage`: `totalUsed` from REAL recorded tokens;
      budget rows remain the documented 5M/platform policy.
- [x] `handleFallbackRateLimitUsage`: real per-model RPM/RPD/TPM windows from
      the measured `quota_states` table; window `null` = nothing measured
      (honest) instead of `rows: []` always.
- [x] `endpoints_info.go`: `modelsServed` = key's ModelScope size when set,
      else ALL registered platform models (was: enabled-only count → "0
      models" for freshly imported providers).
- [x] `TierOnboarding.tsx` import button no longer pretends; `OnboardingPage`
      gains an optional `.credentials.yaml` picker next to the settings file.
- [x] `handleAnalyticsSummary`: real aggregates from the request ring (p50/p95,
      success rate %, token totals, savings estimate from observed paid price)
      — was `keysCount*12` fake requests with hardcoded latency/success.
- [x] `handleAnalyticsByClient`: real rows grouped by SESSION (clientAgent)
      instead of fabricated per-key counters.
- [x] `handleFallbackPenaltyInspector`: real rows — bandit penalty
      (failures/samples), live cooldowns, recent errors, reasons; was `rows: []`.
- [x] `handleApiHealth`: real per-key rollup across the ACTUAL platforms from
      KeyPool statuses; was five hardcoded platforms, all "healthy".
- [x] `handleHealthCheck*`: report current status instead of writing a fake
      "healthy" for every key; single check still triggers real discovery.
      (Active per-provider probing = follow-up, tracked in backlog.)
- [x] `gateway/analytics_derived.go`: 14 previously-404 dashboard endpoints
      implemented from the real request ring — analytics timeline / by-model /
      by-key / by-platform / errors / error-distribution / requests(+detail by
      trace id) and all five `/api/cost/*` reports (real recorded costs;
      cache savings honest zeros). Full audit of every frontend `apiFetch`
      recorded in BACKLOG Deferred with the remaining gaps.

## Live end-to-end verification & the bugs it caught (WP6)

The whole backend was compiled and run **outside Docker for the first time**
(Go 1.25 + local PostgreSQL 15 + Redis): `go build ./...`, `go vet`, the full
`go test ./...` suite against real Postgres, then real HTTP calls against the
running server with the operator's actual DSH key. Four real bugs surfaced —
all fixed and re-verified live:

- [x] **The proxy never recorded anything** (`gateway.go`): no
      `RecordRequestSummary` / `EmitRouteEvent` call existed anywhere —
      analytics stayed empty and the bandit never learned. Now every final
      chat/embeddings outcome is recorded (tokens from non-streamed usage,
      catalog cost computed; SSE passes through live with tokens 0) and only
      rate/quota/server failures teach the bandit (4xx never poison it).
      Verified live: import → entry → `/v1/chat/completions` (real upstream
      answer) → `/api/analytics/*` shows the call, `/api/cost/*` the tokens.
- [x] **`store.AddKey` returned 0** — pgx has no `LastInsertId`; the DSH
      import therefore stored base URLs under `custom_base_url:0` and every
      per-key lookup missed. Fixed with `INSERT … RETURNING id`.
- [x] **The YAML subset parser broke on real DSH files**: `key:` with an empty
      value parsed as `""` instead of a nested map (`no providers found`), and
      a naive `Cut(":")` truncated `baseURL: https://…`. New `cutYAMLKey`
      handles both; real import now yields 34 models + 1 key + base URL.
- [x] **KeyPool missed keys imported after startup** — the in-memory pool only
      knew startup keys, so a fresh import + immediate call failed with
      "no healthy keys available". Import now refreshes the pool
      (`AutoDiscoverKeys` reload).
- Also fixed: missing newline between two statements in `store.go`
      (syntax error), `fmt.Errorf` vet violation, gofmt on all touched files,
      `TimelineAgg` field casing, map-index-addressing in `costDayBuckets`,
      per-model cost rows now carry their platform.

## Makefile overhaul (WP7) — no more lying targets

The old targets lied in three ways: `make build` ran `docker compose build`
which printed "No services to build" (the backend is a bind-mounted source
container — there IS no image to build); `make restart-backend` did a plain
restart with no signal when the recompiled binary was actually live (the
recurring "old binary" confusion); and `apt-get install docker.io` ran on
EVERY container start.

- [x] `make help` self-documenting target list (default goal)
- [x] Real builds/checks: `make go-build` / `go-vet` / `go-test` /
      `check-backend` — host toolchain when present, otherwise inside the
      same `golang:latest` container with the same caches; tests always run
      against a throwaway `jimesh_test` database, never the operator's data
- [x] `make restart-backend` = force-recreate + health wait (✓/✗, 180s
      timeout with log dump) — the operator now knows exactly when the new
      binary is live
- [x] `scripts/backend-entry.sh`: installs docker.io only when missing,
      compiles once to a real binary (clear compile errors) and `exec`s it
- [x] `make frontend-clean` (the recurring stale-`next`-cache pain) and
      `frontend-build` (production build as your user, caches in /tmp)
- [x] CLAUDE.md build/test sections rewritten to match reality

## Work Package 8 — Real persistence + the whole missing API surface (backend)

The dashboard called a long tail of endpoints that answered 404 or returned
hardcoded payloads ("needsSetup:false, authenticated:true" as a const). This
work package closes that tail **for real** — every handler below was built
and verified live against a running server.

### WP-A — Proxy records request types (chat / embedding / realtime)

- [x] `RequestSummary.RequestType` recorded by all three proxy paths:
      chat (incl. SSE), embeddings, and the WebSocket realtime handler —
      previously every summary was an implicit "chat".
- [x] `requestTypeCounts` surfaced in `/api/analytics/summary`
      (`{"chat":n,"embedding":n,"realtime":n}` — no-type rows count as chat).

### WP-B — Analytics survive restarts (persisted request log)

- [x] New `request_log` table (BIGSERIAL id, `ts_unix_ms`, full summary
      columns) + `idx_request_log_ts`; async batched writer (256 rows /
      500 ms) with graceful drain on shutdown — verified: a live chat call
      lands as a row with real token counts.
- [x] On startup the analytics ring preloads from the newest persisted
      rows — verified live: after a server restart the summary showed the
      pre-restart call (1 request, 13+50 tokens, `requestTypeCounts` intact).
- [x] pgx pitfall honored everywhere: `tx.Prepare` needs manual
      `toPostgresSQL` conversion — the first insert attempt silently wrote
      zero rows because of it.

### WP-C — Real dashboard auth (was a hardcoded mock)

- [x] `internal/gateway/auth.go`: bcrypt-hashed admin password in settings
      KV (`dashboard_password_hash`), 24h sessions (`dashboard_sessions`,
      token → expiry), opt-in gateway gate for `/v1/*` against the
      `jimesh-sk-…` API key, and one-time `setup_code` for remote (non-
      loopback) first setup.
- [x] `authMiddleware` wraps the mux in `Start()`; `/health`,
      `/frontend-dist`, `/api/auth/*` and `/v1/models` stay open.
- [x] Verified live end-to-end: setup → token → protected `/api/keys` 401
      without / 200 with token → wrong password 401 → change-password kills
      the old password → logout invalidates the session → forgot-password
      answers honest 501 (self-hosted, no mail provider).
- [x] The old `handleAuthStatus` const-mock was deleted (duplicate method).

### WP-D — The keys import flow (all four calls were 404s)

- [x] `POST /api/keys/preview` — multipart env/YAML/JSON parser; platform
      detection from variable names; `*_BASE_URL` lines become a `baseUrl`
      hint on custom rows instead of fake key rows; duplicate detection
      against stored secrets and within the batch; unparseable files land in
      `skipped` (never fabricated keys).
- [x] `POST /api/keys/import-selected` — real `AddKey` (RETURNING id) +
      KeyPool upsert + `AutoDiscoverKeys` reload; per-key errors reported;
      optional `baseUrl` persists as `custom_base_url:<id>`.
- [x] `POST /api/keys/custom/probe` — ONE real chat request: model picked
      from a real GET `/models`, latency measured, success/latency taught to
      the pool, `reasoning`/`toolCalls` reported only when the response
      actually contained them (absent = unknown); unreachable endpoints give
      honest 400/502 (verified against a non-LLM URL).
- [x] `PATCH /api/platform-keys/{platform}` — whole-platform toggle (own
      path: Go's ServeMux rejects `/api/keys/platform/{p}` as ambiguous with
      `/api/keys/{id}/reveal`; the frontend was moved along).

### WP-E — Real provider health monitoring (was 404s)

- [x] `POST /api/health/monitor/start?intervalMs=` + `/stop` — background
      prober: one cheap real GET `/models` per platform with the first
      enabled key (no tokens billed), first round immediately.
- [x] `GET /api/health/providers` — per-platform rollup with honest
      `unprobed` state (never faked healthy), latency, uptime windows.
- [x] `GET /api/health/uptime/{platform}` — real check history with
      downtime incidents built from consecutive non-healthy probes.
- [x] Custom platforms probe their stored `custom_base_url:<keyID>` (falls
      back to any stored custom base URL — the first custom key is not
      necessarily the one with the URL).

### WP-F — Real JSON backups (was 404s)

- [x] `POST /api/backups` dumps the chosen (or all) tables to
      `data/backups/backup-<ms>.json`; manifest lives next to the files so a
      restore cannot destroy it (restoring overwrote the settings KV that
      previously held the manifest — file wins).
- [x] Paged `GET /api/backups`, `GET /api/backups/tables`,
      `GET /api/backups/{id}/download`, `DELETE /api/backups/{id}`.
- [x] `POST /api/backups/{id}/restore` — wipes + reinserts in ONE
      transaction (dynamic columns, JSON→DB value coercion), takes an
      automatic `pre-restore` snapshot first and reloads keys/models into
      memory. Verified live: full cycle backup → restore → delete.
- [x] `GET|PUT /api/backups/schedule` persisted; an in-process scheduler
      really takes "scheduled" backups when due.

### WP-G — Settings ops (was 404s)

- [x] `POST /api/settings/proxy/test` — real proxied HTTP probe; a dead
      proxy returns the real dial error (verified: connection refused).
- [x] Agent URL tokens: create (one-time full `jit-…` token) / list
      (prefix only) / revoke — persisted in settings KV.

### WP-H — Update check (was 404s)

- [x] `/api/update/release|check|status` — real GitHub releases lookup for
      `ji-podhead/JiMesh2`, opt-in via `update_check_enabled`. A 404 from
      GitHub (no release published yet) answers an empty release with a
      note instead of a 502 toast.

### WP-I — Honest extras (were 404s or hardcoded empties)

- [x] `/api/free-tier` — real per-platform rollup from `quota_state` +
      key/model counts; undocumented pools stay "undocumented", credits
      stay 0 (not tracked — stated, not invented).
- [x] `/api/compression/stats` — REAL request count from `request_log`;
      compressed counts stay 0 with an explicit note (no compression
      pipeline in Go); `/api/compression/preview` answers honest 501.
- [x] `/api/client-profiles` CRUD + rotate — real per-client `jsk-…` keys,
      KV-persisted (key marshaled into KV but never listed to the UI);
      verified live incl. rotate-after-restart masked-key correctness.
- [x] `/api/media` + `/api/media/usage` — real image-capable models from
      the models table with real request counts from `request_log`;
      modalities the schema cannot express (video/audio) return honest
      empty lists; custom media delete answers honest 501.

### WP-C revision (operator call): default admin instead of a setup wall

The first version made every operator walk a setup screen before the
dashboard rendered anything — the right mechanism with the wrong default.
Operator call: "nimm den scheiss raus und mach irgend nen default user".

- [x] `seedDefaultAdmin()` at gateway start: `admin@jimesh.local / admin`
      (bcrypt) + `dashboard_default_auth=true` — the dashboard ships OPEN
      (`needsSetup:false, authenticated:true, defaultAuth:true`), no setup
      screen, no login wall, `/api/*` not gated.
- [x] Personalization (change-password / change-email with the current
      password) flips `dashboard_default_auth=false` → the real gate
      engages: 401 without session, `admin/admin` rejected. Verified live
      in both directions.
- [x] Login with admin/admin still issues a real session for operators who
      want one before personalizing.

### Frontend truths fixed in the same wave

- [x] `src/frontend/src/pages/` was a stale duplicate tree whose
      `*.test.ts` files Next compiled as routes — `next build` failed
      ("Failed to collect page data"), which is why the user's dashboard
      loaded nothing. Tree deleted (`git rm -r`); `next build` is green and
      the app serves through the `[[...slug]]` catch-all → `views/`.
- [x] Dead `chain-manager.tsx` (imported by nobody) + its source-scanning
      test removed; a new `fallback-page.test.ts` pins the REAL persistence
      behavior (staged edits scoped to their profile, profileId in the save
      payload, debounced auto-save, onError surfaced).
- [x] `copyText` awaited nothing: a rejected Clipboard API still flashed
      "Copied" while nothing landed. Now async + falls through to the
      legacy path on rejection (frontend suite: 230/230 green).
- [x] Verification: `scripts/verify-stack.sh` 12/13 against the live
      server (the one FAIL is an honestly empty models table in the test
      DB, not code), `go build`/`go vet`/`go test` clean.

## Work Package 9 — Quota pipeline re-wired (x-ratelimit headers were dead)

Sprint 6 claimed the gateway hooks "eingehängt" — after the proxy
refactors `RecordQuotaFromResponse` had zero callers: nothing ever wrote
`quota_state`, so the endpoints panel, rate-limit-usage, headroom routing
and free-tier all read an empty table. Restored on all four paths (chat,
embeddings, WS realtime, custom /models discovery) and verified live with
a fake OpenAI-style upstream that sends real x-ratelimit-* headers:

- [x] Every upstream response feeds quota_observations + quota_state
      (remaining counts down per call, reset_at from the provider header)
- [x] Exhausted window benches the key until the provider reset —
      `/api/keys/endpoints` shows status=cooldown + cooldownUntil
- [x] `MAX(a,b)` in UpsertQuotaState is invalid PostgreSQL (SQLite
      heritage) and failed silently — now `GREATEST()`
- [x] `Pool.Success` (async feedback) wiped the fresh bench seconds after
      it was set — `Entry.Benched` now marks provider-informed benches;
      Success keeps them, blind cooldowns still clear on success, DB
      reloads preserve them
- [x] Proxy answers carry `X-JiMesh-{Chain,Platform,Model,Key-Id,Attempt,
      Strategy,Trace-Id}` and forward upstream x-ratelimit-* headers
      (API_DOCS "Proxy response headers" section)

## Work Package 10 — Canvas rewired onto the node model (G1–G4)

Operator finding: creating a pool on the canvas produced a new chain
("Mesh Router") that never appeared as a graph node. Root cause: the
canvas conflated pools with chains. The proto already defines pools as
`SMART_CONTAINER` nodes of a chain, and the router implements all three
node types — only the wiring was wrong.

- [x] `internal/store/chain_nodes.go`: granular node CRUD (create with
      auto priority, update, delete, member upsert/remove)
- [x] `internal/gateway/chain_graph.go`: `GET /api/chains/{id}/graph`,
      `POST|PATCH|DELETE /api/chains/{id}/nodes[/{nodeId}]`, member
      add/remove, `PUT /api/chains/{id}/edges` (registered via
      `registerChainRoutes`)
- [x] Node routing made tolerant to missing catalog rows (STATIC and
      SMART_CONTAINER silently dropped members whose model row was
      absent — the "all nodes exhausted" trap)
- [x] Canvas (`chain-mesh-graph.tsx`): graph query as SSOT, pools render
      from SMART_CONTAINER nodes, create-pool posts a node (no synthetic
      `auto:` chain), member add/remove/toggle/pref/key round-trip through
      the API, pool delete removes the node, strategy changes persist via
      PATCH, edges save to `/api/chains/{id}/edges`
- [x] Verified live: chain → pool node with member → chat call routes
      through the member and reports X-JiMesh-* headers; graph readback;
      member add/remove; node delete leaves an honest empty graph
- [x] `agents_test.go` session-count assertion made id-robust (tests
      share the Postgres instance)

## Acceptance criteria

1. Create pool + edge + entries on the canvas → **restart backend** →
   everything still there (edges persist instantly via PUT, no Save button;
   PostgreSQL row check or UI reload).
2. Model edit/delete on the model detail page persists; toggling a provider no
   longer wipes the chain.
3. `curl /v1/chat/completions` with `model: <active-profile-id>` and with an
   arbitrary model name both route over the saved chain **pool by pool in
   mesh-edge order**; a 429 from upstream marks the candidate dead and the
   retry walks to the next entry; streaming responses arrive incrementally.
4. Deploy a project with runtime `go` + tools `make` + docker socket → the
   container has `go`, `make`, `git`, `docker` available; a provided Git token
   works for private clones and survives redeploy.
5. Undeploy keeps the volume; `redeploy` restores the container with the same
   volume; only explicit `purgeVolume: true` deletes it.
6. Import a real DSH `settings.yaml` (+ `.credentials.yaml`) via onboarding →
   keys with base URLs and models appear (endpoints panel shows real
   `modelsServed` and base URLs); `/api/dsh/test` returns honest reachability.
7. No phantom `auto:s` router/pool after restart; `GET /api/dsh/settings`
   reflects the real database, not hardcoded mocks.
