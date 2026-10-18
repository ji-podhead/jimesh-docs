
## WP11 — Proxy observability, failover walk, active quota probing (2026-09-04)

Operator demand (verbatim intent): "wenn einer failed dann einen anderen
Endpoint probieren", "es darf nichts still sterben", "die App muss auch ohne
User-Traffic prüfen ob Provider rate-limited sind", "erkennt ob ein Key
free oder paid ist".

- **Request-path logging** (`gateway.go`): `[proxy]` lines for chain → picked
  model/platform/key, every upstream attempt with URL, and the concrete
  transport error; `[router]` line before routing-failure responses.
  Proven in sandbox with a deliberately dead upstream: connection refused
  is now visible per attempt.
- **Failover walk** (`service.go`): `routeFailureActive` is now consulted in
  the NODE path too (STATIC nodes + SMART_CONTAINER members), not only the
  entries path. Verified: chain deadplat→fakeup, attempt 1 dies with
  connection refused, attempt 2 routes fakeup → HTTP 200, client unaffected.
- **Upstream timeouts** (`gateway.go getHTTPClient`): ResponseHeaderTimeout
  10min → 60s (a hanging upstream must fail over); global Timeout removed
  (streams run unbounded). 
- **Active quota prober** (`quota_probe.go`, new): background worker, every
  5min (env `JIMESH_PROBE_INTERVAL`), auto-started in `New`. Free keys on
  OpenAI-compatible platforms get the max_tokens=1 header-harvest probe
  (≈0 cost, same quota pipeline as real traffic); paid keys are NEVER
  chat-probed (budget protected — /models only); OpenRouter keys use the
  auth/key usage endpoint incl. `is_free_tier` mirroring into keys.is_paid.
  Every action logs a `[probe]` line.
- **Free/paid auto-detection** (`service.go deriveKeyPaid`): at pool seed a
  key whose entire servable catalog is paid-classified is routed as PAID;
  free-first ordering lives in `keypool.AvailableKeys` (prefers non-paid,
  then score) so failover goes free → paid. Operator PATCH overrides until
  next derivation.

Backlog (from operator strategy research): stream_options.include_usage
capture, local token counting mid-stream, proxy-side token bucket before
the provider's own 429.

## WP12 — Provider quota-check schemas with fallback chains (2026-09-04)

Operator demand: "für die Provider eine default Methode für den
quota/ratelimit check, mit Fallback auf was was immer funktioniert — über
Schemas für die Provider die wir definitiv kennen."

- `quota_probe.go` rewritten around `knownProviderSchemas`: an ordered
  method list per known provider (openrouter → usage-endpoint; openai/
  nvidia/anthropic → chat-header-harvest; groq/mistral/google → models-
  header-harvest then chat harvest; ollama → health-only, no quota API per
  ollama/ollama#15663). Unknown platforms: generic chain.
- Universal fallback: minimal chat probe (max_tokens=1) — every OpenAI-
  compatible provider answers with x-ratelimit-* headers at ≈0 cost.
  Paid keys: chat probes stripped from their schema (budget protected).
- Fresh installs: chat probe target falls back to the provider's /models
  list when the local catalog is empty.
- Anthropic header family extended (anthropic-ratelimit-requests-*/tokens-*).
- Proven in sandbox logs: models-header-harvest fails honestly ("no quota
  headers on /models") → falls through → chat-header-harvest harvests
  2 quota observations; paid key routes to models-health only; dead
  provider reports every failed attempt.

## WP13 — Artificial Analysis TTFT/TPS sync (2026-09-04)

- `aa_sync.go`: batched fetch (1 request = all models), tolerant field
  mapping, dual storage (AA identity `aa/creator/name` + matched local
  model IDs), persisted 24h budget ledger (restart-proof proven: 1/100
  before and after a server restart), env key `ARTIFICIAL_ANALYSIS_API_KEY`,
  `/api/aa/metrics` + `POST /api/aa/sync`.
- Operator mandate encoded in the file header: AA is ADDITIONAL info only —
  own traffic outranks third-party estimates; no routing decision may rest
  on AA data alone.
- Backlog: surface aa_ttft_ms/aa_tps on model profiles (needs proto field
  extension + `make proto`), seed keypool Speed prior from AA TPS as weak
  prior only.

## WP14 — OpenRouter live performance source (2026-09-04)

- `model_perf.go`: second additional-info source next to Artificial
  Analysis. One free /api/v1/models fetch per prober sweep with an
  existing openrouter key; tolerant performance-field extraction
  (throughput/latency/TTFT, nested or flat); stored under `or/model-id`
  with source tag. MANDATE holds: additional info only, never the sole
  routing basis.
- Sandbox-proven against the real OpenRouter catalog: 427 entries fetched,
  parser honestly reports "none carried performance fields (nothing
  stored — no guessing)" — the listing does not carry the stats, they live
  in the model-detail/endpoints views.
- Backlog: fetch /api/v1/models/{id}/endpoints ONLY for models actually
  used in chains (members/entries) to get the real TTFT/throughput numbers
  without burning hundreds of calls.

## WP15 — OpenRouter benchmarks API replaces AA (2026-09-04)

Operator found the official endpoint (docs/api/api-reference/benchmarks):
GET /api/v1/benchmarks (authed) returns aggregated quality data per model —
intelligence/coding/agentic index, accuracy per benchmark_type, pricing —
and its `source` field shows OpenRouter already aggregates artificial-
analysis numbers. Consequence: our own AA integration stays DORMANT (no key
configured = no traffic) and OpenRouter becomes the single third-party
source. Implemented: fetchOpenRouterBenchmarks (one authed call per sweep,
tolerant index+accuracy parsing, stored under or_benchmark_metrics,
exposed via GET /api/or/benchmarks). Sandbox: honest 401 path proven; real
shape verified from operator's docs. OPENROUTER_API_KEY / NVIDIA_API_KEY /
MISTRAL_API_KEY added to env auto-discovery so the operator's env key is
registered at boot.

## WP16 — Operator decision: drop OR latency/throughput, own measurements rule (2026-09-04)

Operator: endpoint-level latency/throughput from OpenRouter covers only
OR-marketplace endpoints (nvidia-via-OR yes, opencode no) — incomplete
coverage is worse than none, and the proxy MEASURES those itself on real
traffic (bandit Speed/Reliability per key, TTFB in request_log). Removed
fetchOpenRouterEndpointPerf + /api/or/perf. KEPT: /api/v1/benchmarks
(model-level quality indices — broad coverage, OpenRouter-aggregated incl.
AA numbers). The additional-info hierarchy now: own traffic (primary) →
OR benchmarks (static quality) → nothing else.

## WP17 — OpenRouter catalog metadata enrichment (2026-09-04)

Operator: "die ganzen Metadaten und Beschreibungen vom models endpoint
holen". fetchOpenRouterModelMetadata enriches EXISTING local openrouter
models per sweep (one free /api/v1/models call): display_name (when
empty), context_window, per-million pricing from OR per-token prices,
vision (input_modalities), tools (supported_parameters), is_paid_model
(pricing>0). Never creates rows — registration stays the operator's sync
decision. Sandbox-proven: llama-3.3-70b-instruct row enriched with
name/context/pricing/tools/paid after one sweep. Backlog: surface
inputPerM/isPaidModel in /api/models JSON (needs proto fields), model
description column (needs schema+proto).

## WP18 — Probe on boot, import and platform-toggle (2026-09-04)

Operator: "für alle beim serverstart testen und wenn ein neues
hinzugefügt wird". Implemented: boot settle delay 15s → 5s (first sweep
verifies ALL keys right after start); POST /api/keys and
/api/keys/import-selected fire probeKeyWithSchema immediately for each
freshly added key; platform-toggle ON re-probes every enabled key of that
platform. store.KeyByID added for the re-read. Sandbox-proven: sweep ~10s
after boot; imported key probed seconds later with its generic chain,
honestly failing without a base URL (no invented endpoints). Tests:
provider_schema_test.go (matrix, unknown-provider chain, new-provider
flow incl. paid-key zero-probe).

## WP19 — Frontend request log (2026-09-04)

Operator: "die logs für die ganzen requests und die requests die an
unsere endpoint gehen". /api/analytics/requests now exposes chainId,
keyId and statusCode per call (routing failures persisted since WP18).
New frontend component requests-log-panel.tsx: live feed (4s refetch)
showing incoming requests (type, chain) AND their routing outcome
(platform + key, status code, latency, error), mounted on the config tab
next to EndpointsPanel. Sandbox-proven: a failing self-request appears
instantly with its routing error. Honest empty state instead of mock
rows.

## WP20 — NVIDIA rate-limit header family (2026-09-04)

Operator: "warum haben wir zu NVIDIA nicht die Anzahl an verbleibenden
Requests und Tokens?" Root cause: NVIDIA swaps the family/attribute order
vs OpenAI (x-ratelimit-REQUESTS-limit instead of
x-ratelimit-limit-requests), so the generic OpenAI-style spec matched
nothing and the harvest stayed empty. quota.SpecFor now has an explicit
nvidia entry accepting BOTH orders (requests.* / tokens.* families plus
the generic fallback). Harvest runs on EVERY upstream response (success
or error) and on the chat-header-harvest probe, so numbers flow from the
operator's own NVIDIA traffic after deploy. Live header recon with a
fake key was refused by NVIDIA (410/200, no headers) — final proof needs
the operator's real key (git pull + restart-backend, then
backend-logs | grep quota).

## WP21 — Probe walks past broken first model; PATCH stores key baseUrl (2026-09-04)

Operator's NVIDIA reality: the first catalog model can 404 ("Not found
for account") and error responses carry no rate-limit headers — a
single-shot harvest stayed empty forever. chatHeaderHarvest now walks up
to 3 candidate models (enabled catalog first, then provider /models via
new providerModelList), recording every response, until headers appear.
Sandbox-proven: 404 on model 1 → headers harvested on model 2 → req/tok
windows visible on the key. Also fixed: PATCH /api/keys/{id} silently
ignored baseUrl — it now persists custom_base_url (empty string clears
the override). Header-name recon with the operator's exact names
(x-ratelimit-limit-requests family) passes the full pipeline.

## WP22 — Canvas instant visibility + log backlog (2026-09-04)

Operator: "funktioniert einfach alles nicht" — (a) new router's default
entry pool was a phantom (never in the graph, nothing selectable), (b)
own pools not selectable until reload, (c) engine logs invisible in the
Real-Time console. Fixes:
- ensureDefaultPoolNode: POST /api/profiles and /api/chains now seed ONE
  SMART_CONTAINER node ("<id>-pool", balanced) when the chain has none —
  the canvas opens with a real, selectable pool. Proven: graph returns
  proof-router-pool:SMART_CONTAINER immediately.
- Frontend: profile creation invalidates ['chain-graph', id]; pool
  creation also invalidates ['profiles'] — no reload needed.
- SSE backlog: GET /api/streams/logs replays the last 40 lines on
  connect (streams.RevRange) and tails from the newest replayed id —
  the console is never empty again. Proven: opening the stream returns
  recent [aa]/listening lines instantly.
Note: the 500 "all nodes in fallback mesh exhausted" is honest routing
outcome for pools whose models all fail upstream — with the backlog
replay the console now shows WHY (upstream 404s etc.) at a glance.

## WP23 — Operator self-service: curl quick test + model latency (2026-09-04)

Operator: "darunter oder daneben noch ein curl command das man kopieren
kann" + "wir brauchen beides" (per-key AND per-model stats). Shipped:
- QuickTestCard in the provider tab: copy-ready curl built from the real
  endpoint/model/token shown in the Chain Access cards.
- GET /api/analytics/models + store.ModelUsageStats: per-model
  calls/success%/avg-latency from request_log, busiest first; rendered as
  "Model Latency — own traffic" in the provider tab.
- API_DOCS.md §11 documents the new routes and the SSE backlog.

## WP24 — Quota-aware routing + TTFB/throughput metrics (2026-09-04)

Operator: "sammeln wir requests, messen wieviele wir frei haben und nehmen
das auch als Route-Metrik?" — the missing link is now built:
- sortKeysByQuota: every key-selection path (node, pool-member, entries,
  pick) re-orders candidates by provider-reported remaining quota
  (store.QuotaRemainingRatio, worst of requests/tokens windows, stale
  resets ignored). Missing data = no change — never punish unknown keys.
- TTFB measured on EVERY chat attempt (httptrace GotFirstResponseByte),
  persisted as request_log.ttfb_ms (standalone columnExists migration —
  the first attempt hid inside the is_paid_model branch and never ran!).
- Throughput: avg output tokens/s per model = completion window
  (latency − TTFB); exposed via /api/analytics/models (avgTtfbMs,
  avgTps). Sandbox-proven: fake-model-1 163.7 tok/s.
- Entry-node selector now reads the chain-graph SMART_CONTAINER nodes
  (canvas SSOT) — freshly spawned pools are selectable immediately;
  GET /graph seeds the default pool for legacy empty chains.

## WP25 — Key base-URL override wins in the chat path (2026-09-05)

Operator asked "funktioniert das jetzt?" — final runtime proofs:
- Quota-aware routing: with key A benched-empty (0/40, reset future) and
  key B at 37/40 the router picked key B (log: key=12). Rest quota IS a
  routing metric now.
- resolveChatTargetURL honoured the PLATFORM url before the key's
  custom_base_url — every aggregator key (opencode, orcarouter, …) was
  silently called at the platform default instead! Key override now wins.
  Proven: request goes to the key's base URL and returns 200.

## WP26 — Console was never connected + probe outcome visible (2026-09-05)

Operator: "das mit den logs funktioniert nicht, nvidia stats werden nicht
geupdated". ROOT CAUSE for the dead console: realtime-logs.tsx built
EventSource as http://jimesh:3010 (docker-internal hostname, wrong port)
— unreachable from ANY browser, so the console never connected. Now uses
the relative /api/streams/logs (same next-rewrite as apiFetch).
Probe transparency: probeKeyWithSchema persists probe_last:<keyId>
{ts, ok, method, note}; /api/keys/endpoints exposes probeLast; the
provider tab shows a per-key "probe ok/✗ · HH:MM" badge with the failure
note in the tooltip — the operator SEES why quota numbers are missing
(e.g. 410 EOL model) instead of guessing.

## WP27 — Per-pool overload retry (502/503/529) — NOT rate-limit penalty (2026-09-05)

Operator: "können wir für einzelne pools auch ne max retry machen für
service temporarily overloaded also nicht der ratelimit throttle
penalty? bei nvidia braucht man manchmal nur 1-2 retries dann gehts"
- container_strategies.max_retries INTEGER (standalone migration; the
  first attempt hid inside the is_paid_model block and never ran — same
  bug pattern as ttfb_ms, lesson reinforced).
- smartConfigPayload + nodeToPayload + defaultSmartConfig + PATCH all
  carry maxRetries; the Add Pool dialog has a "Max Overload Retries"
  number input (default 2).
- Gateway chat loop: on 502/503/529 with sameNodeRetries < nodeMaxRetries,
  reuses the SAME decision (no re-route, no MarkRouteFailure, no
  KeyPool.RateLimited) and retries the same upstream. Only after
  exhausting the limit does it walk to the next node. Sandbox-proven:
  mock returns 503,503,200 → log shows "↻ same-node retry 1/3" and
  "↻ same-node retry 2/3" then attempt 3 → 200.
- Console SSE: was http://jimesh:3010 (docker-internal, unreachable from
  any browser — the widget was dead since day one). Now relative
  /api/streams/logs (same next-rewrite as apiFetch).
- Probe transparency: probeKeyWithSchema persists probe_last:<keyId>
  {ts, ok, method, note}; /api/keys/endpoints exposes probeLast; the
  provider tab shows a per-key probe ok/✗ badge with the exact failure
  reason on hover.
