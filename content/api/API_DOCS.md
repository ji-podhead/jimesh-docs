# JiMesh Public HTTP API

This document covers the operator-facing HTTP surface of the JiMesh Go
backend (no mocks, no SQLite — pure PostgreSQL). It is generated to mirror
the routes registered in `src/backend/internal/gateway/gateway.go`. When
you add a new route, append it here so SDKs / scripts stay in sync.

**Base URL**

```
http://<host>:19091       # Direct Go backend (gRPC :19092, HTTP :19091)
```

The legacy Node.js+SQLite tier on port 9090 is gone. Clients and the bundled
CLI use the URL above directly.

**Auth**

The deployment token is returned by `GET /api/deployment-info` and stored
in the `JIMESH_API_TOKEN` env var when one is provided. Send it on every
operator call:

```
Authorization: Bearer <jimesh-sk-…>
```

The router is implicit: handlers that touch `/v1/...` are OpenAI-compatible
(no auth required when `JIMESH_API_TOKEN` is unset) so external Claude
Code / Cursor / Aider clients can hit them directly.

---

## 1. Health & metadata

| Method | Path                       | Notes                                  |
|--------|----------------------------|----------------------------------------|
| GET    | `/health`                  | `{"status":"ok"}` liveness probe       |
| GET    | `/openapi.json`            | static OpenAPI 3.0.3 self-description (`gateway/openapi.go`): `info`, `servers`, `paths` for `/health` and `/api/*` — served unauthenticated, GET only (405 otherwise) |
| GET    | `/api/health`              | REAL per-key status rollup from the KeyPool: `platforms` (all ACTUAL platforms with healthy/rateLimited/invalid/unknown counts), `keys` (current status each) — no fabricated "healthy", no hardcoded platform list. Per key: `lastCheckedAt` and `lastHealthError` are **null** — nothing in the platform persists a per-key check time or error text (keypool.Entry has no such field, the keys table has no such column), so the old `time.Now()` "checked just now" stamp on this read-only endpoint was a claim about a check it never performs (S181-9) |
| GET    | `/api/health/check-all`    | current status of every key (active probing is a follow-up) |
| GET    | `/api/health/check`        | same as `check-all` — `{success, checked, results: [{id, platform, status}]}` with the CURRENT KeyPool status per key (`unknown` when the pool has not seen the key); no active probing, nothing fabricated |
| GET    | `/api/health/check/{id}`   | current status of one key + triggers REAL model discovery for it (async, in the background when the key exists and has a value) |
| GET    | `/api/health/providers`    | REAL per-platform health rollup from live `/models` probes: `{platform, status: healthy/degraded/unhealthy/unprobed, latencyMs, lastChecked, uptime24h/7d/30d, totalChecks}` — "unprobed" is reported as such, never faked healthy |
| GET    | `/api/health/uptime/{platform}?period=day\|7d\|30d` | REAL probe history: `{uptime, totalChecks, successfulChecks, avgLatencyMs, lastCheck, downtimeIncidents}` |
| POST   | `/api/health/monitor/start?intervalMs=` | background prober — one cheap real GET `/models` per platform (no tokens billed); first round runs immediately; `intervalMs` < 10000 falls back to 60s; idempotent (`alreadyRunning` in the response) |
| POST   | `/api/health/monitor/stop` | stops the background prober |
| GET    | `/api/analytics/summary`   | REAL aggregates from the recorded request ring: `{totalRequests, successRate (%), totalInputTokens, totalOutputTokens, avgLatencyMs, p50LatencyMs, p95LatencyMs, requestTypeCounts, estimatedCostSavings, pinnedRequests}` — pin counters honest zeros; request types (chat/embedding/realtime) are recorded by the proxy for real and survive restarts (persisted `request_log`) |
| GET    | `/api/analytics/by-client` | REAL rows grouped by session: `{clientAgent, requests, successRate (%), avgLatencyMs, totalInputTokens, totalOutputTokens, lastSeenAt}` |
| GET    | `/api/analytics/timeline?range=&tzOffset=` | REAL hour buckets (day buckets for ranges > 48h) on the viewer's wall clock: `{timestamp, requests, successCount, failureCount, inputTokens, outputTokens}` |
| GET    | `/api/analytics/by-model?range=` | REAL per platform+model rows: `{platform, modelId, displayName, requests, successRate, avgLatencyMs, tokens, estimatedCost}` |
| GET    | `/api/analytics/by-key?range=` | REAL per key rows: `{keyId, label, platform, requests, successRate, avgLatencyMs, tokens}` |
| GET    | `/api/analytics/by-platform?range=` | REAL per platform (provider) rows |
| GET    | `/api/analytics/errors?range=` | REAL recent failures (newest first, cap 50) |
| GET    | `/api/analytics/error-distribution?range=` | REAL `{byCategory, byPlatform, detailed}` with categories rate_limit/quota/auth/network/server/other classified from the error text |
| GET    | `/api/analytics/requests?range=` | REAL recent calls (cap 100); `requestType` = real chat/embedding/realtime as recorded by the proxy (also persisted across restarts); client ip/ua null |
| GET    | `/api/analytics/requests/{id}` | REAL detail by trace id (404 when unknown — ring is in-memory); includes the recorded attempt |
| GET    | `/api/cost/daily` | REAL most-recent-day cost report from recorded catalog costs (`totalSavings` honest 0 — no cache accounting) |
| GET    | `/api/cost/monthly` | REAL month-to-date totals with `byDay`/`byModel`/`byProvider` |
| GET    | `/api/cost/savings?period=` | honest zeros — cache savings are not recorded anywhere yet |
| GET    | `/api/cost/providers` | REAL per-platform cost rollup |
| GET    | `/api/cost/top?limit=` | REAL most expensive model+platform pairs with catalog per-M prices |
| POST   | `/api/settings/api-key/regenerate` | rotates the gateway token |
| POST   | `/api/settings/proxy/test`  | `{proxyUrl, testUrl?}` → REAL proxied HTTP probe: `{success, status, latencyMs, error?}` — an unreachable proxy reports the real dial error |
| GET    | `/api/settings/url-tokens`  | `{tokens: [{id, label, tokenPrefix, createdAt, lastUsedAt, revokedAt}]}` — the full token appears only once, at creation |
| POST   | `/api/settings/url-tokens`  | `{label}` → UrlToken incl. one-time `token` (`jit-…`) |
| DELETE | `/api/settings/url-tokens/{id}` | revokes the token (sets `revokedAt`; history stays) |
| GET    | `/api/update/release`       | real GitHub releases lookup (`repos/ji-podhead/JiMesh2`); `{disabled:true}` when `update_check_enabled` is off; empty tagName + note when the repo simply has no release yet |
| POST   | `/api/update/check`         | force a lookup and persist it (`update_check_last/latest`) |
| GET    | `/api/update/status`        | `{enabled, lastCheckedAt?, latest?}` |
| GET    | `/api/free-tier`            | REAL per-platform quota rollup from `quota_state` + key/model counts: `{generatedAt, summary{poolCount, documentedMonthlyTokens, creditsBasedPools, unpublishedPools}, pools[]}` — undocumented pools stay `kind:"undocumented"`, credits stay 0 (not tracked) |
| GET    | `/api/compression/stats`    | `{requests (REAL count from request_log), compressedRequests: 0, estSavedTokens: 0, savingsPercent: 0, enabled: false, note}` — the Go backend has no compression pipeline and says so instead of inventing savings |
| POST   | `/api/compression/preview`  | honest **501** — compression preview is not implemented |
| GET    | `/api/client-profiles`      | real per-client profiles (KV-persisted): `[{id, name, maskedKey, systemPrompt, enabled, createdAt}]` |
| POST   | `/api/client-profiles`      | `{name, systemPrompt?}` → profile incl. one-time `key` (`jsk-…`) |
| PATCH  | `/api/client-profiles/{id}` | `{name?, systemPrompt?, enabled?}` |
| DELETE | `/api/client-profiles/{id}` | removes the profile |
| POST   | `/api/client-profiles/{id}/rotate` | mints a new `jsk-…` key, returns it once |
| GET    | `/api/media?modality=image` | real image-capable models from the models table (`supports_vision`); modalities the schema cannot express return honest empty lists |
| GET    | `/api/media/usage?modality=` | REAL request counts per media model from the persisted `request_log` |
| PUT    | `/api/media/{id}`           | `{enabled}` → toggles that model (stable numeric id from platform+modelId) |
| DELETE | `/api/media/custom/{id}`    | honest **501** — custom media models are not stored by the Go backend |
| GET    | `/api/embeddings`           | TASK-031: real embedding models from the `models` table — identified by the substring `"embed"` (case-insensitive) in id/displayName/description, since the schema has no category/model_type column — plus any KV-persisted custom providers: `{models: [{id, platform, modelId, displayName, enabled, quotaLabel: null, keyCount (REAL, from configured keys), isCustom}]}` |
| GET    | `/api/embeddings/usage`     | TASK-031: REAL per-model rollup from `request_log` filtered to `request_type = 'embedding'` (analogous to `/api/analytics/models`, verified that the embeddings proxy — `internal/ai/proxy.go` `handleEmbeddingsProxy` — writes exactly `"embedding"`, not `"embeddings"`): `{models: [{platform, modelId, displayName, requests, successPct, avgLatencyMs, lastUsedAt}], totalRequestsToday, totalRequestsMonth}` |
| GET    | `/api/embeddings/custom`    | TASK-031: list KV-persisted custom embedding providers: `[{id, platform, modelId, displayName, baseUrl, maskedKey, enabled, createdAt}]` |
| POST   | `/api/embeddings/custom`    | TASK-031: `{platform, modelId, displayName?, baseUrl, apiKey?}` → new custom provider (settings-KV persisted, same mechanism as `/api/client-profiles`) |
| GET    | `/api/embeddings/custom/{id}` | TASK-031: fetch one custom provider |
| PUT    | `/api/embeddings/custom/{id}` | TASK-031: `{displayName?, baseUrl?, apiKey?, enabled?}` → updates it |
| DELETE | `/api/embeddings/custom/{id}` | TASK-031: REAL delete (unlike `/api/media/custom/{id}`'s honest 501 — the Go backend never stored custom media providers; embeddings now does, via the KV list above) |
| GET    | `/api/auth/status`          | `{needsSetup, authenticated, email, defaultAuth, source, isAdmin}` — **default mode: the dashboard ships OPEN with a seeded default admin (`admin@jimesh.local` / `admin`)**; `needsSetup:false, authenticated:true, defaultAuth:true`. Personalizing via change-password/change-email flips `defaultAuth:false` and the real session gate engages. TASK-025: `source` distinguishes the login paths honestly — `"keycloak"` sessions additionally carry `user: {sub, email, displayName}` from the provisioned `users` row; `"password"` sessions are the single operator and have **no** user row (`user` field absent). SPRINT-138: `isAdmin` is the backend's OWN OPA decision (`policy.IsAdminXWorkspaceScope` — password operator or Keycloak `jimesh-admin` realm role), the gate for the dashboard's admin-only workspace switcher; `false` when unauthenticated, fail-closed `false` when the policy engine did not load |
| POST   | `/api/auth/setup`           | first-run dashboard admin `{email, password, setupCode?}` → `{token}`; only relevant before a default admin exists; remote (non-loopback) setup needs the one-time `setup_code` |
| POST   | `/api/auth/login`           | `{password}` (or email) → `{token}` (24h session) |
| POST   | `/api/auth/logout`          | revokes the presented session |
| POST   | `/api/auth/change-password` | `{currentPassword, newPassword}` (revokes other sessions) |
| POST   | `/api/auth/change-email`    | `{currentPassword, newEmail}` |
| POST   | `/api/auth/forgot-password` | honest **501** — self-hosted installs have no mail provider |
| POST   | `/api/auth/reset-password`  | with a valid reset token (none is ever emailed) |
| GET    | `/api/auth/oidc/login`      | TASK-073: real Keycloak Authorization Code+PKCE flow — redirects the browser into Keycloak's `/realms/jimesh/protocol/openid-connect/auth` (frontend just navigates here, `auth-gate.tsx`). Google/GitHub identity-provider brokering is fully wired (`deploy/keycloak/jimesh-realm.json` — client IDs/secrets via `GOOGLE_CLIENT_ID`/`GITHUB_CLIENT_ID` env vars, mappers, claims chain) but ships **`"enabled": false`** — a provider without real operator-supplied credentials must not render a dead login button (No-Mock mandate); activation steps for a fresh or already-running deployment are in `deploy/keycloak/README.md` |
| GET    | `/api/auth/callback`        | TASK-073: Keycloak's redirect target after login — exchanges the auth code for a token, verifies it, provisions/updates the `users` row via `UpsertUserByKeycloakSub`, mints a JiMesh session (`source:"keycloak"`) |
| GET    | `/api/backups`              | paged manifest `{backups: BackupMeta[], total, page, pageSize}` |
| POST   | `/api/backups`              | `{isFull?, tables?}` → real JSON snapshot on disk (all or chosen tables) |
| GET    | `/api/backups/tables`       | dumpable table list |
| GET    | `/api/backups/{id}/download` | the snapshot file |
| POST   | `/api/backups/{id}/restore` | wipes + reinserts the snapshot's tables in one TX; takes an automatic `pre-restore` snapshot first; reloads keys/models into memory |
| DELETE | `/api/backups/{id}`         | deletes file + manifest entry |
| GET/PUT | `/api/backups/schedule`    | persisted schedule `{enabled, time, intervalDays, backupPath}`; an in-process scheduler really takes backups when due. GET returns the stored schedule or the defaults (`enabled:false, time:"03:00", intervalDays:1`); PUT enforces `intervalDays ≥ 1`, always reports the real backup dir, and (re)starts the in-process scheduler |
| GET    | `/api/settings/{key}`      | stored setting value (`gemini-map`/`anthropic-map`/`agent-compatibility`/`url-tokens` return structured empty defaults) |
| PUT    | `/api/settings/{key}`      | store a setting value |
| GET    | `/api/deployment-info`     | Returns `{apiToken, source}`           |
| GET    | `/api/nodes/health`        | REAL host metrics of the node the backend runs on (`gateway/nodes_health.go`, reads `/proc` + disk): `{loadavg{1,5,15}, cpu_percent, cores, ram{totalMB, usedMB, percent}, disk{totalGB, usedGB, percent}, uptime_s, collected_at}` — 405 non-GET (jimeshctl `lcore` uses it) |
| GET    | `/v1/models`               | OpenAI-compatible model list           |
| GET    | `/v1/chains`               | User-defined fallback chains           |
| GET    | `/ready`                   | REAL readiness probe (`gateway.go handleReady`): pings the Postgres store and Redis (2s timeout); `200 {"status":"ready"}` when both answer, `503 {"status":"not_ready","issues":{"store"\|"redis": "<real error>"}}` otherwise — never a stub |
| any    | `/` (catch-all)            | when a static dir is configured: the SPA (file, else `index.html` fallback); without one: `{"error":{"message":"not found"}}` with 404 |

## 1b. Proxy recording & learning (verified live)

- `/v1/chat/completions` and `/v1/embeddings` record every final outcome into
  the request ring (`RecordRequestSummary`) and teach the bandit/keypool via
  `EmitRouteEvent → ApplyFeedback` (inline, or via the `jimesh:events` stream).
- Non-streaming answers are buffered so `usage` tokens are extracted and
  catalog costs are computed; SSE streams pass through live with tokens 0
  (honest — usage lives inside the stream and is not recorded).
- Deterministic client errors (4xx except 429/402) do NOT poison the bandit.
- A key imported while the server is running enters the in-memory KeyPool
  immediately (DSH import + keys POST refresh; DELETE removes).
- WS proxy (`/v1/realtime`) does not record yet (backlog).

## 2. Models

| Method | Path                                       | Notes                                        |
|--------|--------------------------------------------|----------------------------------------------|
| GET    | `/api/models`                              | Admin list (camelCase, includes tier/pricing)|
| GET    | `/api/models?tier=S&enabled=true`          | Filter (tier=`S/A/B/C`, enabled default true) |
| GET    | `/api/models/{id}`                         | Single-model specs for sidebar               |
| POST   | `/api/premium/sync`                        | Reload the MODEL catalog (same `SyncCatalog` as `/api/discovery/sync`) — session-gated (401 without a logged-in session, verified), **500 with the real reason when the source is unreachable or answers non-200**, never a fake `{success:true}` (S181-9) |

## 3. API Keys

| Method | Path                                | Body                                              |
|--------|-------------------------------------|---------------------------------------------------|
| GET    | `/api/keys`                         | —                                                 |
| POST   | `/api/keys`                         | `{platform, key, label, enabled?, isPaid?}`      |
| PATCH  | `/api/keys/{id}`                    | `{enabled?, isPaid?, modelScope?}`               |
| DELETE | `/api/keys/{id}`                    | —                                                 |
| POST   | `/api/keys/{id}/reveal`             | returns plain secret (operator only)              |
| POST   | `/api/keys/bulk-toggle?enabled=…`   | —                                                 |
| DELETE | `/api/keys/bulk-delete`             | `{ids:[1,2,3]}`                                  |
| DELETE | `/api/keys/{id}/cooldowns`          | `{success:true}` — clears the KeyPool cooldown for one key so it is eligible again immediately (405 otherwise, 400 on a non-numeric id; a missing id still answers success) |
| POST   | `/api/keys/custom`                  | NOT a GET — saves a custom OpenAI-compatible provider: body `{baseUrl, apiKey, label?, keyId?, models?, supportsTools?, supportsVision?}`; inserts a key with platform `custom` (or reuses `keyId`'s platform), stores `custom_base_url:<keyId>`, registers each selected model (default `contextWin: 128000`, prices 1.0/M, tier A) and links it into the first chain at the next priority. `{success, id, created}` |
| POST   | `/api/keys/custom/discover-models`  | `{keyId}` or `{baseUrl, apiKey}` → REAL `GET {baseUrl}/models` over the internet (10 s timeout): `{baseUrl, keyId, models: [{id, registered, vision}], total, registeredCount}`; `vision` is inferred from the id (`vision`/`vl` substring); unknown platforms resolve default base URLs (openai/deepseek/groq/nvidia/mistral/…); the discovery probe's quota headers feed the same pipeline; an unreachable/invalid endpoint returns an empty model list so the UI can fall back to manual entry |
| GET    | `/api/keys/providers`               | provider health rollup                            |
| GET    | `/api/keys/endpoints`               | one row per key (url, label, status, quota); `modelsServed` = key ModelScope size, else ALL registered platform models |
| POST   | `/api/keys/preview`                 | multipart `files` (env/YAML/JSON): `{keys: [{keyName, keyValue, detectedPlatform, baseUrl?, isDuplicate?}], skipped: [filenames]}`; `*_BASE_URL` lines attach as `baseUrl` to custom rows instead of becoming fake key rows |
| POST   | `/api/keys/import-selected`         | `{keys: [{platform, keyName?, keyValue, baseUrl?}]}` → `{imported, total, errors[{key, error}]}`; dedupes against stored secrets; `baseUrl` persists as `custom_base_url:<id>` |
| POST   | `/api/keys/custom/probe`            | `{keyId}` → ONE REAL chat request against the custom endpoint (picks the model from a real GET `/models` first): `{modelId, latencyMs, reasoning?, toolCalls?}` — absent capabilities mean unknown; failures teach the pool and answer 400/502 honestly |
| PATCH  | `/api/platform-keys/{platform}`     | `{enabled}` → toggle every key of that platform (own path to avoid the Go mux wildcard conflict with `/api/keys/{id}/…`) |
| POST   | `/api/dsh/import`                   | REAL import — multipart: `file` = DSH `settings.yaml`/`.json`, optional `credentials` = `.credentials.yaml` (maps `apiKeyEnv` → key values). Creates keys + `custom_base_url:<keyId>` + catalog models. Returns `{imported, keys, models, errors}` |
| POST   | `/api/dsh/preview`                  | same upload, dry-run: `{preview:[{name, platform, baseURL, models, keyConfigured}]}` |
| POST   | `/api/dsh/test`                     | `{providerName, baseURL}` → REAL `GET {baseURL}/models` probe with the stored key: `{success, status, latencyMs, error?}` — no more fake "connected" |
| GET    | `/api/dsh/settings`                 | REAL state from PostgreSQL: providers (keys + stored base URLs + `keyConfigured`) and tiers (chains + model counts) |

`modelScope` is a JSON array of model IDs; empty array = the key serves
nothing. `null` (or field omitted) = the key serves every model of the
platform (the historical default).

## 4. Fallback chains

| Method | Path                          | Body / params                                            |
|--------|-------------------------------|----------------------------------------------------------|
| GET    | `/v1/chains`                  | `{chains:[...]}`                                        |
| POST   | `/v1/chains`                  | full chain + entries (upsert)                            |
| GET    | `/api/profiles`               | list (alias layer used by React dashboard)               |
| POST   | `/api/profiles`               | `{id, name, tier}` creates chain with no entries; `409` on duplicate id |
| PATCH  | `/api/profiles/{id}`          | `{name?, tier?}` rename/re-tier (persisted)              |
| DELETE | `/api/profiles/{id}`          | —                                                        |
| POST   | `/api/profiles/active`        | `{profileId}` sets the active profile                    |
| GET    | `/api/fallback?profile_id=…` | entries for the given profile. `chainId` = pool (`model_type`); empty pool = the router's own pool (its chain id) |
| PUT    | `/api/fallback?profile_id=…` | `[{modelId, platform, priority, enabled, isPaidModel, keyId, userPreference, chainId}]` — sparse merge: rows without `modelId` update positionally |
| GET    | `/api/fallback/edges?profile_id=…` | `{profileId, edges:[{source,target}]}` — saved mesh edges (chain metadata `mesh_edges`) |
| PUT    | `/api/fallback/edges?profile_id=…` | `{edges:[{source,target}]}` — idempotent full replace of the mesh edge list |
| DELETE | `/api/fallback/edges?profile_id=…&source=…&target=…` | remove one edge (or all with only `profile_id`) |
| GET    | `/api/fallback/stats?model_id=&key_id=` | REAL counters from recorded requests: `{requests, latencyMs, successRate, totalTokens, status}` |
| GET    | `/api/fallback/routing`       | current routing decisions                               |
| GET    | `/api/fallback/token-usage`   | per-platform token usage — `totalUsed` from REAL recorded tokens (budget rows are the 5M/platform policy) |
| GET    | `/api/fallback/rate-limit-usage` | per-model RPM/RPD/TPM windows from measured `quota_states`; window `null` = nothing measured yet |
| GET    | `/api/fallback/penalty-inspector` | REAL per-entry inspection of the active chain: bandit penalty (failures/samples from router stats), live key cooldowns, recent errors from the request ring, `reasons` array; `lookbackMinutes` = actual ring span |

Routing semantics (Sprint 9): `Route()` walks the saved pools in **mesh-edge order**
(edges persisted per profile via `/api/fallback/edges`), starting at the entry pool,
then unconnected pools by best entry priority. Within a pool the bandit picks;
a pool without eligible keys is the pool-level failover step. Upstream failures
(429/402/5xx) mark the candidate dead for 90 s, so proxy retries walk ON through
the chain instead of re-picking the same entry. Legacy tier presets `auto:s/a/b`
are removed at startup; entries without a pool belong to the router's own pool.

## 5. Routing completions (OpenAI compatible)

| Method | Path                       | Body                                                   |
|--------|----------------------------|--------------------------------------------------------|
| POST   | `/v1/chat/completions`     | OpenAI ChatCompletion                                  |
| POST   | `/v1/embeddings`           | OpenAI Embeddings — same routing (model field → chain-as-model → active profile → `default`), same policy gate (403/402), records `requestType:"embedding"` summaries + bandit feedback like chat |
| GET    | `/v1/chat/completions/ws`  | **WebSocket** upgrade — each text message is a chat-completions JSON body; routing + upstream proxy per message; errors and request summaries (`requestType:"embedding"`) are written per message back over the socket / request ring |
| GET    | `/v1/mesh/models`          | chains as OpenAI-compatible models: `{object:"list", data:[{id:"jimesh:<chainId>", object:"model", created, owned_by:"jimesh-mesh", chain_id, chain_name, chain_type, node_count, member_count}]}` |
| GET    | `/v1/providers`            | `{health, keys}` — provider health rollup + active keys (from the service layer) |
| GET    | `/v1/route?chain_id=&tier=&estimated_tokens=&vision=&tools=` | pure routing decision WITHOUT an upstream call: runs `svc.Route()` with `estimated_tokens` (default 1000), `vision`/`tools` default true (`=false` to disable), tier parsed as `TIER_<X>` → the routing decision JSON; 500 on routing failure |
| GET    | `/v1/score?tier=`          | `{scores: [...]}` — bandit scores (tier filter optional) |
| GET    | `/v1/models`               | OpenAI Model list (Pro tier only; else use /api/models)|
| POST   | `/v1/chat/roundtrip`       | **PLANNED, NOT IMPLEMENTED (SPRINT-178)** — single end-to-end chat roundtrip: JWT/HMAC identity check → TTL-bound quota → safety gate → `POST /v1/chat/completions` (local LLM over the mesh) → safety gate on the answer → response incl. widget decision. Until the handler exists this row is a contract, not a live endpoint: calling it returns 404 today and nothing may pretend otherwise |
| GET    | `/v1/chat/roundtrip/limits`| **PLANNED, NOT IMPLEMENTED (SPRINT-178)** — honest remaining quota + `Retry-After` for the presented token/cookie, derived from the JWT TTL (no per-user blocklist row is ever stored) |

Sprint 178's roundtrip contract (payload, header set, tier/quota rules, widget schema,
safety-gate verdicts) is specified in `docs/sprints/SPRINT-178-SAFE-LOCAL-LLM-CHATBOT.md`
under **FULL-ROUNDTRIP-PROMPT**. Both rows above move to live documentation — payload,
response, error codes — only when the handlers really exist (mandate 2).

The router resolves `model: "auto:s"` / `"custom:<name>"` / explicit
model id against all enabled chains and returns the first healthy
KeyPool entry. On 401/403/429/5xx it auto-escalates down the chain.

## 6. Agent runtime

| Method | Path                              | Notes                                              |
|--------|-----------------------------------|----------------------------------------------------|
| GET    | `/api/agent-types`                | registered agent types                              |
| GET    | `/api/sessions`                   | session list                                       |
| POST   | `/api/sessions/query`             | body `{agent_type_id?, tag?}` → filtered session array (`[]` when nothing matches); GET is not accepted (405) |
| POST   | `/api/agents/logs`                | publish a log entry                                |
| GET    | `/api/agents/analytics/summary?session_id=&agent_type_id=` | REAL aggregate over the in-memory agent request ring (Sprint 6 free/paid classification; gRPC mirror = `AgentAnalytics`, `cmd/server/grpc_sprint67.go`): `{totals, free, paid}` each `{requests, successes, failures, input_tokens, output_tokens, cost_usd, error_rate, p50_latency_ms, p99_latency_ms}`, `by_model`/`by_agent` rows `{key, platform?, is_paid, requests, failures, input_tokens, output_tokens, cost_usd, avg_latency_ms}`, `recent` (up to 100 request rows) + `window` (honest note: the ring lives "since process start") |
| GET    | `/api/agents/logs/stream`         | **SSE**, `event: log\ndata: {…}`                   |

`/api/agents/logs/stream` accepts `?session_id=&agent_type_id=&level=`
filters, replays the last 40 matching `jimesh:logs` rows on connect (then
tails live from the newest replayed id — no duplicates), and pushes a
`: ping\n\n` heartbeat every 30s to keep proxies from reaping the
connection. 503 when redis streams are disabled. (Route name corrected
21.9. #152: the old `/api/streams/logs` doc entry was stale — the
gateway mux registers `/api/agents/logs/stream`, internal/analytics/
agentlog.go; no `/api/streams/logs` handler exists in the backend.)

## 7. Quota tracking (header-fed, verified live)

Every proxy call (chat, embeddings, WebSocket realtime, custom /models
discovery) runs the upstream response through the quota pipeline:

```
upstream response headers (x-ratelimit-*, Retry-After)
  → quota.ParseFromResponse (per-platform specs + generic fallback)
  → quota_observations (audit log, one row per window per call)
  → quota_state (upsert, NULL-preserving merge, GREATEST(confidence))
  → KeyPool benching: exhausted window → key cooled down until the
    provider-reported reset (survives the async success feedback —
    header knowledge beats "the call went through")
  → Redis stream jimesh:quota
```

Consumers of the persisted state (all real): `/api/keys/endpoints`
(quota windows per key), `/api/fallback/rate-limit-usage`,
`/api/quota/headroom?platform=`, `/api/free-tier`, `/api/health`.
A platform whose provider sends no quota headers simply has no rows —
honest absence, never invented windows.

## 8. Frontend dev-server under docker (bind mount)

The frontend container bind-mounts `./src/frontend` and runs `next dev`.
Inotify does not propagate through docker bind mounts — without polling the
dev server silently serves whatever it compiled at container start: after a
host-side `git pull` the browser loads app chunks that no longer exist,
gets the SPA shell HTML instead (Content-Type text/html for .js URLs), the
`import()` of `App.tsx` dies with a MIME error and the dashboard renders
with zero working interactions (no pools, no chains, nothing). Symptom check
from outside: `curl -sI http://HOST:19090/_next/static/chunks/app-pages-browser_src_App_tsx.js`
— `application/javascript` is healthy, `text/html` means the dev server
must be recreated.

Fixed on two rails: `next.config.mjs` enables webpack polling (2000 ms) so
host-side pulls hot-reload inside the container, and `src/scripts/frontend-entry.sh`
(`sh /fentry.sh`) wipes `.next` on every container boot. After pulling:
`docker compose up -d --force-recreate frontend` (or `make frontend-clean`).

## 9. Canvas chain-graph API (pools are nodes)

A pool is a `SMART_CONTAINER` node inside a chain — never a chain of its
own. The canvas reads and writes the graph through (handlers in
`gateway/chain_graph.go`; every route answers 404 when the chain id is
unknown):

| Method | Path | Notes |
|--------|------|-------|
| GET    | `/api/chains/{id}/graph` | the single canvas payload: `{nodes, edges, entries}` — nodes carry `id, type, priority, enabled, modelId/platform/keyId` (STATIC), `smartConfig + members[]` (SMART_CONTAINER) or `targetChainId` (SUB_CHAIN); entries mirror the legacy chain entries |
| POST   | `/api/chains/{id}/nodes` | add node — `{type: STATIC\|SMART_CONTAINER\|SUB_CHAIN, modelId?, platform?, keyId?, targetChainId?, priority?, enabled?, smartConfig?, members?}`; 400 for a type outside the three, STATIC without `modelId`, SUB_CHAIN without `targetChainId`; SMART_CONTAINER gets the smart-config defaults (`strategy=balanced`, weights 0.5/0.25/0.25, `keySelection=auto`) and its members are force-enabled → **201** with the created node |
| PATCH  | `/api/chains/{id}/nodes/{nodeId}` | partial update — only provided fields are applied (`priority` when > 0, `enabled`, STATIC `modelId/platform/keyId`, `targetChainId`, smart-config `strategy/keySelection/exploreEnabled/peakAdjust/maxRetries`) → returns the updated node; 404 unknown node |
| DELETE | `/api/chains/{id}/nodes/{nodeId}` | remove node (container members cascade) → `{success, id}`; 404 unknown node |
| POST   | `/api/chains/{id}/nodes/{nodeId}/members` | drop a model INTO a pool — `{modelId, platform, ...}` (isPaidModel, keyId, userPreference, selfRetry, maxRetries); 400 when the target node is not a SMART_CONTAINER or modelId/platform missing → **201** `{success}` |
| DELETE | `/api/chains/{id}/nodes/{nodeId}/members/{modelId}?platform=…` | remove one member; 400 without the `platform` query param |
| PUT    | `/api/chains/{id}/edges` | replace the mesh-edge list (array of `{source,target}`) — same persistence as `/api/fallback/edges`, under the canonical chains namespace → `{success, count}` |
| GET    | `/api/chains/{id}/model-roles` | list chain-scoped role overrides (inherit from global when absent) |
| PUT    | `/api/chains/{id}/model-roles` | upsert chain override `{modelId, role, priority?}` (`priority` ≥ 1, default 1) → `{ok: true}`; 400 modelId/role missing |
| DELETE | `/api/chains/{id}/model-roles?role=Y` | delete ONE chain override (that role inherits global again); without the `role` param ALL chain overrides are deleted → `{ok: true}` |

The router walks the chain's nodes by priority: STATIC serves the fixed
model, SMART_CONTAINER bandit-picks among its members, SUB_CHAIN recurses
into the target chain. Verified live: a pool node with a member routes a
chat call and reports the X-JiMesh-* headers of the member pick.

The GLOBAL role schema lives at `/api/model-roles` (gateway/model_roles.go):

| Method | Path | Notes |
|--------|------|-------|
| GET    | `/api/model-roles` | all global role assignments |
| PUT    | `/api/model-roles` | upsert `{modelId, role, priority?}` — roles `routing/utility/coding/reasoning/vision/aggregation/gating`; `priority` ≥ 1 (default 1) → `{ok: true}`; 400 modelId/role missing |
| DELETE | `/api/model-roles?modelId=X&role=Y` | delete one assignment → `{ok: true}`; 400 when either param is missing |

## 9. Proxy response headers

On `/v1/chat/completions` and `/v1/embeddings` the proxy adds:

| Header | Meaning |
|--------|---------|
| `X-JiMesh-Chain` | the chain (profile) the request routed through |
| `X-JiMesh-Platform` | provider of the winning chain entry |
| `X-JiMesh-Model` | concrete upstream model id |
| `X-JiMesh-Key-Id` | key id that served the call |
| `X-JiMesh-Attempt` | 1-based attempt number (≥2 means failover happened) |
| `X-JiMesh-Strategy` | bandit decision: exploit / explore / prior |
| `X-JiMesh-Trace-Id` | correlates with /api/analytics/requests/{id} |

Upstream `x-ratelimit-*` and `retry-after` headers are forwarded to the
caller, so OpenAI-compatible clients see the real budget of the key that
served them.

```
## Error envelope

Every error path returns:

```json
{ "error": { "message": "<plain text>", "code": "<short token>" } }
```

`code` is optional. Common tokens: `bad_request`, `not_found`,
`internal`, `cooldown`, `unauthorized`.

## Status codes used

* `200` — success
* `201` — created
* `400` — bad request (malformed JSON, missing fields)
* `404` — path not registered (historically: not_found)
* `409` — duplicate id
* `429` — every viable KeyPool entry is currently on cooldown
* `500` — internal (look at backend stdout for the PG error)
* `503` — Redis Streams disabled (the deployment has `REDIS_ENABLED=false`)

---

## Reference clients

A Bash+curl+jq operator CLI lives in `examples/jimeshctl`; it is the
recommended way to drive the gateway from CI or a remote shell. The
deprecated TypeScript clients (`clients/cli/`, `clients/desktop/`) have
been deleted — they only ever talked to the legacy FreeLLMAPI SQLite
tier that no longer exists.

```bash
HOST=http://100.113.144.81:19091
./examples/jimeshctl $HOST health
./examples/jimeshctl $HOST chains
./examples/jimeshctl $HOST chain-create smart:nemotron "Nemotron Test" 17 nvidia/llama-3.1-nemotron-70b-instruct
./examples/jimeshctl $HOST activate smart:nemotron
./examples/jimeshctl $HOST chat smart:nemotron "Hello"
# SPRINT-47 Gateway-Befehle (echte Routen):
./examples/jimeshctl $HOST lcore                        # GET /api/nodes/health
./examples/jimeshctl $HOST llm-mesh                     # LLM-Mesh-Overview (models/chains/profile/edges/scores)
./examples/jimeshctl $HOST llm mesh chains              # zwei-Wort-Form, hier nur GET /v1/chains
./examples/jimeshctl $HOST mesh nodes                   # GET /api/networks/nodes (Headscale)
./examples/jimeshctl $HOST mesh key-mint admin 90       # POST /api/networks/preauthkeys (admin)
./examples/jimeshctl $HOST firewall status              # GET /api/firewall/status
./examples/jimeshctl $HOST firewall grant prj-1 web 8080 tcp
```

Raw curl, when you don't want the wrapper:

```bash
HOST=http://100.113.144.81:19091
curl -s $HOST/v1/chains | jq .
curl -s -X POST $HOST/v1/chains -H 'Content-Type: application/json' \
  -d '{"id":"smart:nemotron","name":"Nemotron Test","tier":"S","type":"MAIN","entries":[{"modelId":"nvidia/llama-3.1-nemotron-70b-instruct","platform":"nvidia","priority":1,"enabled":true,"isPaidModel":false,"keyId":17}]}'
curl -s -X POST $HOST/api/profiles/active -H 'Content-Type: application/json' -d '{"profileId":"smart:nemotron"}'
curl -s -X POST $HOST/v1/chat/completions -H 'Content-Type: application/json' -d '{"model":"smart:nemotron","messages":[{"role":"user","content":"Hello"}]}'
```

## 10. Artificial Analysis sync (TTFT / tokens-per-second)

Background worker, auto-started. Reads the API key from env
`ARTIFICIAL_ANALYSIS_API_KEY` (override: settings key `aa_api_key`).
ONE batched request fetches every model — the free-tier budget
(100 requests / 24h) is tracked by a persisted ledger that survives
restarts (`aa_window_start`, `aa_requests_used` in settings).
Interval: env `JIMESH_AA_INTERVAL` (default 6h ≈ 4 requests/day).

AA data is ADDITIONAL information only — it never becomes the sole basis
of a routing decision; own-traffic evidence always outranks it.

| Method | Path | Description |
|---|---|---|
| GET  | `/api/aa/metrics` | budget state (`requests_used`, `remaining`, `window_start`, `last_sync`) + merged per-model metrics (`ttft_ms`, `tps`) |
| POST | `/api/aa/sync`    | trigger a sync immediately (see logs for `[aa]` lines) |

## 11. Provider capability schema, key stats & model latency

### GET /api/keys/endpoints
Per key: status, quota windows (`quota`), the capability schema
(`quotaSchema`: `methods` chain, `headersOn`, `headerFamily`,
`dedicatedApi`, `sharedPool`, `ownBench`, `note`) and own-traffic stats
(`stats`: `requests`, `successPct`, `avgLatencyMs`, `lastUsedAt`).
The provider tab renders method badges (`usage-API` / `x-headers@chat` /
`own_bench`), the capability infobox and per-key stats.

### GET /api/or/benchmarks
Stored OpenRouter benchmark data (`or_benchmark_metrics`): per model
`intelligence_index`, `coding_index`, `agentic_index`, per-benchmark
`accuracy`, sources. Requires an enabled openrouter key (fetch happens
in the prober sweep); honest empty payload otherwise.

### GET /api/analytics/models
Per-model own-traffic aggregation (busiest first, top 30): `platform`,
`modelId`, `requests`, `successPct`, `avgLatencyMs`, `lastUsedAt`,
`avgTtfbMs`, `avgTps`. `avgTtfbMs` is the average time-to-first-byte (ms)
from `request_log.ttfb_ms`. `avgTps` is the average output tokens / second
computed as `output_tokens / (latency_ms - ttfb_ms)`. Streaming
responses produce real token counts (via injected `stream_options.include_usage`).
Answers "is ONE model slow or all of them?" — measured on real proxied
requests, no estimates.

### PATCH /api/keys/{id}
Body (all optional): `{"enabled": bool, "isPaid": bool, "modelScope":
[string], "baseUrl": string}`. `baseUrl` persists
`custom_base_url:<id>` (empty string clears the override back to the
platform default) — honoured by routing AND the probe worker.

### GET /api/agents/logs/stream (SSE)
Server-sent events (`event: log`) from the `jimesh:logs` stream. Opens
with a 40-entry backlog replay (filtered by `session_id` /
`agent_type_id` / `level` query params), then tails live. (Route name
corrected 21.9. #152 — the gateway registers `/api/agents/logs/stream`
[internal/analytics/agentlog.go]; no `/api/streams/logs` handler exists.) The engine
bridges its own logs into the stream (`session_id=server`,
`agent_type_id=engine`) — routing (`[proxy]`), probes (`[probe]`),
benchmarks, canvas seeding. Proxy routing logs use `s.log.Printf` so
they flow through the `serverLogBridge` io.Writer into the Redis stream.

### POST /v1/chat/completions (streaming)
When `stream: true` is in the request body, the proxy injects
`stream_options: {"include_usage": true}` before forwarding upstream.
The final SSE chunk (`data: {"choices":[],"usage":{"prompt_tokens":N,"completion_tokens":M}}`)
is scanned by a `streamUsageReader` (regex-based, not buffering) which
extracts `prompt_tokens` / `completion_tokens` for the request summary —
giving real tok/s for streaming responses (previously always 0).

### Provider Schema: nvidia (updated)
NVIDIA's cloud API (`integrate.api.nvidia.com`) sends **no** rate-limit
headers — verified live (200 returns only `nvcf-reqid` + `nvcf-status`).
No user quota limits; models are sometimes overloaded (503/529).
Methods: `nim-health` (GET `/v1/health/ready`, zero-cost, 200 = alive)
+ `models-health` (GET `/v1/models`, 200 = alive, 410 = EOL).
`HeadersOn: "none"`, `OwnBench: true`. The per-pool overload retry
(`maxRetries` in SmartConfig) handles transient 503/529 before walking
to the next node — NOT a rate-limit throttle.

### Key Performance Routing
`sortKeysByQuota` now uses a 3-stage sort: (1) quota remaining ratio
(descending), (2) per-key average TTFB (ascending — lower is better),
(3) per-key average throughput tok/s (descending — higher is better).
Performance data comes from `KeyPerformanceStats()` which reads
`request_log` (last 24h) per key. When quota is unknown for both keys
(ratio 1.0), performance alone decides the order.

### Quota Header Diagnostic
When `RecordQuotaFromResponse` harvests 0 observations from a response,
it logs ALL response headers at `[quota] ✗ no headers harvested for
{platform}/{model} (status {code}) — response headers: {all-headers}`.
This lets the operator see exactly what the provider sent instead of
guessing. Truncated to 500 chars.

### Model Role Schemas (Sprint 13 WP0)

Classify models by their role for entropy routing, orchestration, and MoE.
Resolution order: chain override → global default → catalog heuristic.

**Global model roles:**
- `GET /api/model-roles` — list all global role assignments
- `PUT /api/model-roles` — upsert: body `{ modelId, role, priority }`
  - Roles: `routing`, `utility`, `coding`, `reasoning`, `vision`, `aggregation`, `gating`
- `DELETE /api/model-roles?modelId=X&role=Y` — delete assignment

**Chain-scoped model roles:**
- `GET /api/chains/{id}/model-roles` — list chain-specific overrides
- `PUT /api/chains/{id}/model-roles` — upsert chain override: body `{ modelId, role, priority }`
- `DELETE /api/chains/{id}/model-roles?role=Y` — delete one chain override (inherit from global)
- `DELETE /api/chains/{id}/model-roles` — delete ALL chain overrides (inherit all from global)

### Project Deployments (Sprint 11 WP1)

Deployments are children of projects. Each deployment has its own
remote_path, port, config_path, status, and chain_id
(`store.DeploymentRow`: `id, projectId, workspaceId, name, type,
remotePath, port, configPath, status, chainId, autoProvision, interfaces,
createdAt`). P0-4: `workspaceId` scopes the row the same way the deploy
engine scopes containers (nameKey — `""` shared project deploy, a
workspace id is that owner's own instance) and `interfaces` is the raw
JSON array of reachable interfaces (`[{"kind":"http","port":3000}, …]`,
derived from the REAL allocated ports — `deploy.DeriveInterfaces`, `[]`
when none). The deploy engine UPSERTS one row per `(projectId,
workspaceId)` after every successful deploy/redeploy (app identity —
created_at keeps the first deploy's timestamp, a redeploy updates in place
instead of duplicating), and flips the swept scope's rows to `stopped`
after undeploy/redeploy pre-sweep.

| Method | Path | Notes |
|---|---|---|
| GET    | `/api/projects/{id}/deployments` | `{deployments: [...]}` for that project (each row incl. `workspaceId` + `interfaces`). SPRINT-138 tenancy: narrowed to the request's verified identity — `X-Workspace-Scope`-scoped admins see only the scoped workspace's rows, non-admin Keycloak users only their own workspaces' rows, unscoped operators/admins every row |
| POST   | `/api/projects/{id}/deployments` | full DeploymentRow body (`projectId` overwritten from the path); `status` defaults to `stopped`, `interfaces` to `[]` (invalid JSON → honest 400) → returns the created row incl. new `id` |
| GET    | `/api/projects/{id}/deployments/{depId}` | single row (numeric `depId`, else 400) |
| PUT    | `/api/projects/{id}/deployments/{depId}` | update of the identity fields name/type/remote_path/port/config_path/status/chain_id/auto_provision (`id`/`projectId` taken from the path; `interfaces` + `workspaceId` are NOT rewritten — they are engine-owned facts: interfaces derive from real allocated ports, the scope from the deploy request) → `{ok: true}` |
| DELETE | `/api/projects/{id}/deployments/{depId}` | `{ok: true}` |
| POST   | `/api/projects/{id}/deployments/{depId}/redeploy` | sets `status` to `building` → `{ok: true, status: "building"}`; a following successful engine redeploy (`POST /api/workspaces/redeploy` — canonical since SPRINT-52) upserts the scope's row back to `deployed` — this mark is the operator's intent, the engine run is the fact |

### Config Export/Import
- `GET /api/export` — download full config as JSON (chains, nodes, members, keys, models)
  Key secrets are NOT included (security).
- `POST /api/import` — upload JSON, recreate chains + nodes + members + models.
  Keys imported as DISABLED with placeholder secret — re-enter API key secrets.
  Response: `{imported: {chains, keys, models}, failed: {chains, keys, models}, errors: [...] , note}`.
  **An item counts in `imported` only when every write for it succeeded**; the rest land in
  `failed` with the reason in `errors` (capped at 10). A row that persisted but lost one of its
  optional attributes (custom URL, model scope, a chain node) is counted imported and reported
  in `errors` with "… imported, but …" so the partial state is visible (S181-9 — all three
  buckets used to be bumped unconditionally with every store error discarded).
  The custom URL and model scope are written under the **NEWLY created** key id — the exported
  id belongs to the source database and must never be reused here.

### Entropy Routing (Sprint 13 WP1)

Two-phase request: routing model generates full response with logprobs,
proxy computes avg normalized Shannon entropy. If entropy < threshold,
serve the routing model response (fast, cheap). If entropy >= threshold,
discard and re-route to the reasoning model via normal failover walk.

**Settings (key/value in settings table):**
- `entropy_routing.enabled` = `"true"` — enable entropy routing
- `entropy_routing.threshold` = `"0.45"` — escalation threshold (0..1)
- `entropy_routing.cache_ttl` = `"300"` — cache TTL in seconds (TODO)

**Model roles used:**
- `routing` role → planner/small model (must support logprobs)
- `reasoning` role → escalation target

**Request log columns added:**
- `entropy` REAL — avg normalized Shannon entropy per request
- `escalated` INTEGER — 1 if request was escalated to reasoning model

**How it works:**
1. Non-streaming request arrives on a chain
2. Proxy checks `entropy_routing.enabled` setting
3. If enabled: send to `routing` role model with `logprobs: true, top_logprobs: 5`
4. Compute avg normalized entropy: H_norm = H / log2(k) over all response tokens
5. If entropy < threshold → serve routing model response directly (fast path)
6. If entropy >= threshold → discard, continue normal failover walk (escalation)
7. Log entropy + escalated flag in request_log

### Orchestration Endpoint (Sprint 13 WP2)

Role-based orchestration with SSE streaming. Gating model classifies task,
selects experts by role (from model role schema), executes in parallel or
sequential mode, aggregates results.

**Endpoints:**
- `POST /api/orchestrate` — start orchestration, returns SSE stream
  - Body: `{ "task": "...", "mode": "auto|parallel|sequential", "chainId": "...", "routes": { "coding": "model-id", ... } }`
  - SSE events:
    - `plan` — `{ runId, mode, tasks, chainId }`
    - `expert_start` — `{ expert, role, model, chainId }`
    - `expert_done` — `{ expert, status, tokens, durationMs, error }`
    - `complete` — `{ runId, totalTokens, durationMs, results }`
- `POST /api/orchestrate/cancel?runId=X` — cancel a running orchestration
- `GET /api/orchestrate/history` — list active runs

**Task execution:**
- Parallel: all experts run concurrently via goroutines
- Sequential: planner → coder → reviewer pipeline, each gets previous output
- Tasks resolve model from role schema: request override → chain scope → global
- LLM calls go through the proxy's own `/v1/chat/completions` endpoint

**Go types (internal/gateway/orchestration.go):**
- `AgentRole` — name, role, backstory, allowedTools
- `RouteMapping` — targetModel, role, entropyRoute
- `Task` — id, description, assignedRole, routing, dependencies
- `TaskResult` — taskId, status, rawOutput, tokens, durationMs
- `WorkflowState` — workflowId, chainId, task, mode, tasks, results, cancel

### Model Enrichment Pipeline (Sprint 13 WP5)

Enrichment pipeline: OpenRouter → Artificial Analysis → SearXNG + utility model.
Fuzzy deduplication shares enrichment across same-class model variants.

**Endpoints:**
- `POST /api/models/{id}/enrich` — trigger enrichment for one model
  - Runs pipeline: OpenRouter lookup → AA lookup (if key set) → SearXNG + utility extraction
  - Shares enrichment to fuzzy variants (same base ID)
- `POST /api/models/enrich-all` — enrich all models in catalog
- `GET /api/models/enrichment` — list all enrichment data
- `GET /api/models/{id}/enrichment` — get enrichment for one model

**Settings (key/value in settings table):**
- `openrouter_api_key` — API key for OpenRouter (optional, public API works without it)
- `artificial_analysis_key` — API key for Artificial Analysis
- `searxng_url` — SearXNG instance URL (default: http://searxng:8080)
- `enrichment_cache_ttl` — cache TTL in seconds (default: 86400 = 24h)

**Pipeline stages:**
1. OpenRouter: fetch from `https://openrouter.ai/api/v1/models` (free, curl-able)
   → context_length, pricing, modality, supports_vision, supports_tools
2. Artificial Analysis: fetch with API key (if set)
   → MMLU score, HumanEval score, quality_score, speed_benchmark
3. SearXNG + utility model: search web → utility model extracts JSON
   → context_length, pricing, modality, supports_vision, supports_tools
4. Fuzzy dedup: enrichment shared across same-class variants (strip prefix, -free suffix)

### Expert MoE Agents (Sprint 14 WP1+WP2)

Model-of-Experts pattern: gating agent selects experts → parallel/sequential
execution → LLM synthesis aggregation.

**Expert CRUD:**
- `GET /api/experts` — list all registered experts
- `POST /api/experts` — create: body `{ name, type, modelRole, systemPrompt, tools, enabled }`
- `PUT /api/experts` — update: body `{ id, name, type, modelRole, systemPrompt, tools, enabled }`
- `DELETE /api/experts` — delete: body `{ id }` or `?id=N`

**Expert Execution (SSE):**
- `POST /api/experts/execute` — run MoE pipeline
  - Body: `{ task, chainId, mode: "auto|parallel|sequential" }`
  - SSE events:
    - `gating_start` — `{ task, chainId }`
    - `gating_done` — `{ selectedExperts, mode, confidence, reasoning }`
    - `expert_start` — `{ expertId, expertName, type, modelRole }`
    - `expert_done` — `{ expertId, expertName, type, modelRole, model, output, tokens, durationMs, status, error }`
    - `synthesis_start` — `{ experts }`
    - `complete` — `{ runId, finalOutput, totalTokens, experts }`

**Expert Run History:**
- `GET /api/experts/runs` — list recent expert execution runs

**Seed experts (auto-created on first boot):**
1. Coder (Nemotron Ultra) — coding role, code generation
2. Reviewer (DeepSeek R1) — reasoning role, code auditing
3. Researcher (Utility) — utility role, information gathering

**Pipeline:**
1. Gating agent (`gating` role model) classifies task → selects experts + mode
2. Selected experts execute: parallel (goroutines) or sequential (with context)
3. Aggregation model (`aggregation` role) synthesizes expert outputs → final answer
4. Results stored in `expert_runs` table

**Model resolution per expert:**
- Each expert has a `model_role` (coding, reasoning, utility, etc.)
- Model resolved from: chain-scoped model role schema → global → default

### Virtual Mesh Models Endpoint (Sprint 12 WP2)

Returns chain names as OpenAI-compatible model IDs with richer metadata.
Used by coding tools (OpenCode, DSH, Cursor) for auto-provisioning.

- `GET /v1/mesh/models` — returns mesh chains as models
  - Each entry: `id: "jimesh:smart:coding-free"`, `object: "model"`,
    `chain_id`, `chain_name`, `chain_type`, `node_count`, `member_count`
  - Existing `/v1/models` unchanged (returns chain IDs without prefix)

### Cost Circuit Breaker (R15)

Tracks cumulative token cost per orchestration/expert run. Prevents infinite
agent loops from burning API budget. When limit exceeded → context.Cancel()
all goroutines + SSE event.

- `GET /api/cost-trackers` — list all active cost trackers
  - Returns: `{ trackers: [{ runId, maxCostUSD, currentCost, remaining, exceeded, tokensByModel, costsByModel }] }`
- **Settings**: `max_cost_per_run_usd` — max cost per run (default: 0.50)

### Secret Management (AES-GCM-256) (R15)

Encrypts sensitive settings at rest. Transparent encrypt/decrypt layer.
- **Env**: `JIMESH_ENCRYPTION_KEY` — 32-byte hex key
- **Setting**: `encryption_key` — fallback if env not set
- Store methods: `SetEncryptedSetting(key, value)`, `GetEncryptedSetting(key)`
- If no key set: development mode (no encryption, backward compatible)

### Auto-Discovery (Docker Events + SSH Scan) (R15)

Event-driven container discovery over SSH (handlers in
`gateway/discovery.go`, `gateway/gateway.go`). The registry is an
**in-memory map** — containers found by scan/events are lost when the
backend restarts; `/api/servers/discover` (canonical since SPRINT-52; legacy alias `/api/projects/discover`) is the persisted path for
projects. Every route needs the `ssh_host` setting (400 otherwise) and
answers 502 when the SSH command fails.

| Method | Path | Notes |
|---|---|---|
| GET | `/api/discovery` | `{containers, count}` — the currently tracked containers (start-tracked, die-removed), incl. `id (short), name, image, status, ports, labels, isMcp/isAgentTool` (label-derived, empty unless labels exist) |
| POST | `/api/discovery/scan` | one-time `docker ps --format json` scan over SSH → `{containers, count}`; registers every found container in the registry with parsed host ports |
| GET | `/api/discovery/events` | SSE: `discovery_start` → `container_event` (one per start/die event parsed from `docker events`, capped by `timeout 30` in the remote command) → `discovery_done` (or `discovery_error` when the SSH exec fails) |
| GET | `/api/discovery/status` | literal stub — always `{"active": false}`, no live listener state exists yet |
| POST | `/api/discovery/sync` | NOT docker discovery despite the path — syncs the MODEL catalog: fetches `repo-assets/models.json` from the jimesh GitHub raw, upserts every catalog model, `"removed"` is always 0 → `{success, modelsAdded, modelsUpdated, modelsRemoved, newPlatforms}`. **Fetch, HTTP-status or decode failure → 500 with the real reason** (S181-9: it used to answer `{success:true, modelsAdded:0}` for a catalog it never downloaded — the source currently answers HTTP 404 for every request, so that was every single run — and the callers stamped their last-synced setting on top of it). No hardcoded fallback presets exist by design, so nothing synced is an error, not a clean result |

### SSH Tunnel Bridge + Port Detection (R15)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/suricata/status?host=&port=&user=&password=&keyPem=&authMethod=&limit=` | SPRINT-60 (Network-IDS read surface for the /networks "Network Monitoring" panel): ONE read-only SSH roundtrip to the node — service status (systemctl is-active suricata), capture volume (eve.json line + alert-event count), recent alerts (real alert events, parsed honestly, limit-bounded), signaturesLoaded with the honest 0-signatures warning (live finding on trading: restart 01:48 UTC with an empty ruleset — no alert CAN fire). Credential model = the /api/projects/{id}/ports contract (query params win → global ssh_* settings → ssh_endpoints registry non-secret fields → honest 400 without any target). States: node without suricata → {installed: false, status: "not-installed"}; 0 alerts → honest zero; SSH dial/exec failure → 502 with the real error. |
| GET | `/api/projects/{id}/ports?host=&user=&password=&keyPem=` | SSH-detects open ports on the target (`ss -tlnp`, netstat fallback) — query params win, else the GLOBAL `ssh_host`/`ssh_user`/`ssh_password`/`ssh_key_pem` settings are used (NOT the project-scoped ones); 400 without any host, 502 when the SSH command fails. Response: `{projectId, host, ports: [port + exposure evaluation (externally reachable, ontology, risk — Sprint 20 WP6)], count, externallyReachable}` |
| POST | `/api/projects/{id}/ports/assign` | TASK-030 item 4: manually attach a discovered port/container to project `{id}` when the automatic `jimesh-framework-<id>-`/`jimesh-codeserver-<id>-` name match cannot (a bare non-docker listener, or a container this backend did not deploy). Body: `{containerId?, portId?}` — exactly one required; `portId` is `"<host>:<port>"` (the local exposure node's host is literally `"local"`). Persists via the settings table (no new table — Mandate 7), picked up by the next `GET /api/security/exposure`. 400 missing both fields, 404 unknown project id. Response: `{success, projectId, containerId, portId}` |
| GET | `/api/projects/{id}/tunnel/{port}` | HTTP reverse proxy through the SSH tunnel to `host:port`; needs the `ssh_host` setting (400 otherwise), 502 when the tunnel cannot be established; method is not restricted |
| PUT/POST | `/api/projects/{id}/ssh-config` | `{host, user?, password?, keyPem?, port?}` — stored PROJECT-SCOPED as settings `ssh_<id>_*`; password/key only overwritten when non-empty; registers the config in the tunnel pool → `{ok, projectID}`; 400 without host |
| GET | `/api/projects/{id}/ssh-config` | `{projectId, host, user, port, hasPassword, hasKey}` — booleans only, the secret itself never leaves the gateway |
| GET | `/api/projects/{id}/monitoring` | SSE: `monitoring_start` → one `metrics` snapshot collected over SSH (`memory` from `free -m`, `disk` from `df -h /`, `cpu` from `top -bn1`, `containers` from `docker stats --no-stream`); SSH config from the project-scoped settings, global `ssh_*` as fallback; 400 without any host |

### Plugin Renderer — generisches Chromium-Rendering statt iframe (SPRINT-159)

Deploy-Engine-Fläche (Registrierung in `internal/deploy/deploy.go` Register(), Handler `internal/deploy/plugin_renderer.go`). Operator-Order: "CHROMIUM WAR DAFÜR GEDACHT DIE GANZEN WEBSITES STATT IFRAME DIREKT IM FRONTEND ZU RENDERN" — jede Session startet auf dem SSH-Node einen echten `m1k1o/neko:chromium`-Container (kein Host-Port, interne Bridge-IP via docker inspect), das Dashboard zeigt dessen WebRTC-Stream. Nur Signaling/Control läuft durch den SSH-Tunnel; Audio/Video ist direkter UDP-ICE-Verkehr zur Node-Adresse (dokumentierte Limitierung, Details im Sprint-File).

| Method | Path | Notes |
|---|---|---|
| POST | `/api/plugin-renderer/sessions` | Body `{pluginId, targetUrl, nodeHost, nodeUser?, nodePort?, authMethod?, sshPassword?, sshKey?}` (SSH-Feld-Shapes wie DeployRequest). Synchron: persistiert die Session-Row (`plugin_renderer_sessions`), generiert ein Neko-Admin-Passwort (NUR In-Memory — Mandat 9, nie DB), deployt per SSH `docker run` mit per-Session chromium.conf (`--app=<targetUrl>`), misst die interne IP. 400 bei fehlendem pluginId/nodeHost oder ungültiger targetUrl (nur absolute http(s)-URL, Shell-Metazeichen abgelehnt), 502 SSH-Dial-Fail, 500 Deploy-Fail — jeder Ausgang landet ehrlich als Status (provisioning/running/error) in der Row |
| GET | `/api/plugin-renderer/sessions` | `{sessions: [...]}` — optional `?pluginId=`-Filter |
| GET | `/api/plugin-renderer/sessions/{id}` | Eine Session-Row; 404 unbekannt |
| DELETE | `/api/plugin-renderer/sessions/{id}` | Stoppt+entfernt den Container (`docker stop`/`rm -f` + /tmp-Cleanup) über SSH, schließt Tunnel-Pool-Eintrag und In-Memory-Secret, löscht die Row. Optionaler Body `{nodeUser?, authMethod?, sshPassword?, sshKey?}` — nötig, wenn das Backend seit dem Create neu gestartet ist; sonst 502 mit ehrlichem Hinweis |
| POST | `/api/plugin-renderer/sessions/{id}/ws-ticket` | Mintet einen frischen Neko-Login-Token (Login gegen die container-interne API DURCH den SSH-Tunnel — das Passwort erreicht den Browser nie) → `{token, tunnelPath}`. 409 wenn die Session nicht running ist; 410 wenn das Backend seit Create neu startete (Secret weg — Session löschen und neu anlegen, Mandat 2) |
| any | `/api/plugin-renderer/sessions/{id}/tunnel/{port}/*` | Generischer Reverse-Proxy durch den SSH-Tunnel zur Container-IP:port (Neko-Assets, /api/*, /api/ws WebSocket-Upgrade-Passthrough). Das äußere jimesh-`?token=` prüft die Auth-Middleware; `neko_token` wird erst NACH deren Prüfung in `token` umgetauscht. 502 ohne lebende SSH-Session |

### RBAC Enforcement (Sprint 22 WP4 — gilt für ALLE untenstehenden Admin-Flächen)

Mutations (POST/PUT/PATCH/DELETE) auf den Admin-Flächen (`/api/users`,
`/api/consumer-keys`, `/api/budgets`, `/api/teams`, `/api/team-members`,
`/api/app-categories`, `/api/security/freeze|release`, `/api/vault/*`,
`/api/backups`, `/api/settings`) sind policy-gated (OPA/Rego, embedded,
E-Policy-Entscheidung): Passwort-Operator (single admin) und Keycloak-Identiitäten
mit der Realm-Rolle `jimesh-admin` dürfen mutieren. GETs bleiben für jede
authentifizierte Identität lesbar; `/api/vault/access` (Agent-Endpoint mit
Vault-Token statt Session) ist ausgenommen. TASK-071 ergänzt: genau
`DELETE /api/projects/{id}` (Projekt-Row + Workspaces + Service-Keys)
ist ebenfalls admin-gated; Backlog #134 ergänzt das Create-Pendant:
genau `POST /api/projects` (Projekt-Row-Anlage). NICHT der ganze
`/api/projects`-Prefix: deploy/redeploy/undeploy/task/* behalten ihre
bisherige Session-Gate (beides präzise Matches in
`policy.IsAdminMutation`, Muster wie `/api/subagents`). TASK-055 ergänzt: die Vault-READ-
Family (`GET /api/vault/secrets[/{name}]`, `POST /api/vault/access`) nimmt als
zweite Identität den project-gebundenen `kind=service`-Consumer-Key an
(dasselbe Middleware-Gate wie `/api/router/config` und `/api/firewall/*` —
read-only, serverseitig auf das Key-Projekt gepinnt; Token- und Audit-Routen
bleiben Session+OPA-Flächen). Ablehnung: `403 admin permission
required — denied by policy (source: …, roles: …)`. Policy-Override:
`JIMESH_RBAC_POLICY` (Pfad zu .rego); kaputtes Policy-File verweigert den
Start. Details: `docs/reference/AUTH-CONTRACT.md` §3b. Keycloak-Rollen
arriven im JWT via den von `BootstrapKeycloak` idempotent gesetzten
`realm roles`-Mapper.

### Admin Audit Log (RM35 — SOC 2-Readiness: Admin-Aktions-Audit-Trail)

Die ALLGEMEINE Admin-Aktions-Audit-Spur (neben den bereits existierenden, eng
begrenzten `vault_audit_log` und IaC-`gateAuditLog`): EINE Zeile pro
admin-gated Mutation, geschrieben an GENAU den Stellen, die die Autorisierung
durchsetzen — der Middleware-`policy.IsAdminMutation`-Gate plus dem inline
`/api/firewall/rules`-Operator-Gate (`internal/auth/admin_audit.go`,
`internal/auth/auth.go`). ERLAUBTE wie ABGELEHNTE Versuche werden
protokolliert (403-Denies mit Grund, Erfolg = aufgenommener HTTP-Status).
Klassifizierung: `policy.ClassifyAdminMutation` (action/target aus
Method+Path: `user_create`, `rbac_grant`, `deploy`, `undeploy`,
`provision`, `vault_write`, `settings_change`, …; ehrlicher
`<family>_<method>`-Fallback). BEWUSST ohne Request-Bodies — Vault- und
Key-Writes tragen Secrets, die niemals im Audit-Log landen dürfen;
`before_diff` bleibt bei Gate-Rows leer, `after_diff` trägt das
Outcome-JSON (`{"http_status":…[, "reason"]}`).
actor_type: `operator` (Passwort-Session) | `keycloak` (verifizierter `sub`) |
`service` (reserviert für Machine-Identities). Tabelle: `admin_audit_log` (id,
timestamp, actor_type, actor_id, action, target_type, target_id, success,
before_diff, after_diff, ip), Migration idempotent in `migrate()`
(`EnsureAdminAuditLogTable`, `internal/store/admin_audit.go`).
Frontend: `/security/audit-log` (`AdminAuditLogPage.tsx`), Top-Nav Security-Tab
(`section-nav.ts`) UND Sidebar Events & Observability (`HierarchySidebar.tsx`) —
beide Registrierungsstellen, Operator-Vorgabe.

| Method | Path | Auth | Payload / Query | Response |
|---|---|---|---|---|
| GET | `/api/admin/audit-log` | Session + Admin (server-derived `X-JiMesh-Identity-Admin` — OPA `IsAdminXWorkspaceScope`, fail closed; Service-Keys erreichen die Route nicht) | `?actor=` (Substring auf actor_id, case-insensitiv), `?action=` (exakt), `?from=`/`?to=` (RFC3339, `YYYY-MM-DD HH:MM:SS` oder `YYYY-MM-DD`), `?limit=` (Default 100, Max 1000) | `{entries: [{id, timestamp, actorType, actorId, action, targetType, targetId, success, beforeDiff, afterDiff, ip}], count, limit}`; 403 ohne Admin-Rolle |

### Project-Scoped Developer Role (SPRINT-47)

Neue, dritte Identitaets-Tier fuer Menschen (der Voll-Admin bleibt
unveraendert bestehen): ein Keycloak-Login mit der Realm-Rolle `jimesh-dev`
(BootstrapKeycloak legt die Rolle idempotent an, weist sie aber niemandem
automatisch zu) PLUS einer Grant-Zeile in der `project_roles`-Tabelle darf
Mutationen NUR auf Sub-Surfaces SEINER granted Projekte ausfuehren
(`/api/projects/{id}/...` mit mind. einem Segment nach der Projekt-Id:
deploy/redeploy/undeploy, deployments, ports, task-ops). Ausdruecklich
NICHT: `DELETE`/`PATCH` auf die Projekt-Row selbst, `POST /api/projects`
(anlegen), andere Projekte, und alle uebrigen Admin-Flaechen (users,
budgets, vault, workspaces, subagents, firewall rules, project-roles).
Entscheidung faellt in `data.jimesh.projectaccess.allow`
(`internal/policy/policies/project-roles.rego`, viertes Modul auf
derselben OPA-Engine; Go-Gate `internal/policy/project_gate.go`);
Middleware-Weg: voll-Admin-Check zuerst, bei keycloak-Identity ohne
Treffer das Projekt-Gate mit den serverseitig aus dem VERIFIZIERTEN
`sub` geladenen Grants (`internal/auth/auth.go`,
`allowProjectScopedMutation`). Beide Schwellen sind unabhaengig - weder
Realm-Rolle allein noch Grant allein reicht. Policy-Override:
`JIMESH_PROJECT_ACCESS_POLICY` (Pfad zu .rego).

| Method | Path | Auth | Payload / Query | Response |
|---|---|---|---|---|
| GET    | `/api/project-roles`      | Session (lesbar) | `?project_id=` (optional, filtert auf ein Projekt) | `{success, grants: [{id, keycloakSub, projectId, role, grantedBy, createdAt}], count}` |
| POST   | `/api/project-roles`      | Admin (OPA) | `{projectId, role: "developer", keycloakSub || email}` | `{success, grant}`; 404 wenn Projekt unbekannt oder (bei email) kein User-Row existiert (erster Keycloak-Login fehlt); 400 bei fremder Rolle (nur `developer` existiert); Re-Grant refresh `grantedBy`, keine Duplikate (UNIQUE sub+project+role) |
| DELETE | `/api/project-roles/{id}` | Admin (OPA) | - | `{success, revoked}`; 404 bei unbekannter Grant-Id |

Tabelle: `project_roles` (id, keycloak_sub, project_id, role,
granted_by, created_at, UNIQUE(keycloak_sub, project_id, role)),
Migration idempotent in `migrate()` (`EnsureProjectRolesTable`).

### RBAC Budget Management (R16)

Multi-user RBAC with cascading budget limits. Proxy checks budget before
every LLM call. API keys injected just-in-time from Vault — users/agents
never see plaintext keys. Frontend admin UI: `/admin/teams`
(`src/frontend/src/views/TeamsPage.tsx`, TASK-024) — teams CRUD, team
members, and a per-project budgets table/upsert form; no route changes,
UI only. All routes below sit behind the dashboard session
gate (401 without a valid session).

Project-role assignment UI (TASK-056, R40-M4): `/admin/users`
(`AdminUsersPage.tsx`) expands each user into their per-project roles and
writes them via `POST /api/budgets` — role and budget share one
`project_user_budgets` row, so a role-only assignment gets the documented
`maxBudgetUSD=5.0` default and a role change on an existing row preserves
its budget values; `/admin/budgets` (`AdminBudgetsPage.tsx`) shows every
assignment with an inline, editable role column. Both surfaces are the
honest UI on this route family — there is no separate role route, and a
denied OPA admin gate surfaces as 403 in the UI.

| Method | Path | Body / params | Response / errors |
|---|---|---|---|
| GET | `/api/budgets?projectId=X` | `projectId` optional (empty = all budgets; every row carries its `role`) | `{budgets, count}` |
| POST | `/api/budgets` | `{projectId, userId, role?, maxBudgetUSD?, spentBudgetUSD?, enabled?}` — upsert into `project_user_budgets`; writes `role` AND budget in one row. `role` is stored as given (TEXT, no CHECK constraint); the project-role UI's canonical set is `admin`/`developer`/`viewer` (R40-M4), legacy rows/dialog assignments may carry `manager`/`sub_agent`/`owner`; defaults `role="developer"`, `maxBudgetUSD=5.0` | `{ok, budget}`; 400 missing projectId/userId |
| DELETE | `/api/budgets?projectId=X&userId=Y` | both params required | `{ok}`; 400 when either is missing |
| POST | `/api/budgets/check` | `{projectId, userId}` | `{allowed:true, remaining, budget}`; 403 `access_denied` (no budget row) or `account_disabled` (budget disabled), 402 `quota_exceeded` when `spent >= max` |

### Teams (R16 — future-ready schema)

Hierarchical quota: Organization/Team → Project → User/Agent.

| Method | Path | Body / params | Response / errors |
|---|---|---|---|
| GET | `/api/teams` | — | `{teams, count}` |
| POST | `/api/teams` | `{id, name, maxMonthlyBudgetUSD?}` — create; defaults `maxMonthlyBudgetUSD=500.0`, `enabled=true` | `{ok, team}`; 400 id/name missing |
| DELETE | `/api/teams?id=X` | `id` required | `{ok}`; 400 without id |

### Team Members (R16)

| Method | Path | Body / params | Response / errors |
|---|---|---|---|
| GET | `/api/team-members?teamId=X` | `teamId` required | `{members, count}`; 400 without teamId |
| POST | `/api/team-members` | `{teamId, userId, rbacRole?}` — add/update; default `rbacRole="developer"`; RBAC roles `owner`/`manager`/`developer`/`sub_agent` | `{ok, member}`; 400 teamId/userId missing |
| DELETE | `/api/team-members?teamId=X&userId=Y` | both required | `{ok}`; 400 when either is missing |

### Team Resource Bindings (SPRINT-4 WP1 Nachzug — Backlog B15)

Per-team grants on the resource inventory (SSH targets, workspaces,
projects, apps) — the data behind the TeamsPage "Resource Bindings" tab
(`src/frontend/src/components/rbac/team-bindings-panel.tsx`; the panel's
TODO named this exact contract, camelCase keys). A binding says: team X
reaches resource Y with access level Z; `inherited` marks access that
arrives through a parent scope instead of a direct grant. Auth posture like
`/api/project-roles`: GET session-readable, POST/DELETE admin mutations
(`/api/team-bindings` prefix in `policy.IsAdminMutation` → OPA).

| Method | Path | Auth | Payload / Query | Response / errors |
|---|---|---|---|---|
| GET | `/api/team-bindings?teamId=X` | Session (lesbar) | `teamId` required | `{success, bindings: [{id, teamId, resourceType, resourceId?, resourceName, accessLevel, inherited, createdAt?}], count}`; 400 without teamId; unknown team = honest empty list |
| POST | `/api/team-bindings` | Admin (OPA) | `{teamId, resourceType, resourceName, resourceId?, accessLevel?, inherited?}` — `resourceType` closed set `ssh_target\|workspace\|project\|app`; `accessLevel` closed set `read\|write\|admin` (default `read`); idempotent upsert on (teamId, resourceType, resourceName) — re-create refreshes, never duplicates | `{success, binding}`; 400 missing/foreign fields, 404 unknown team (no orphan rows, Mandate 2) |
| DELETE | `/api/team-bindings/{id}` | Admin (OPA) | - | `{success, deleted}`; 404 unknown id — never a silent success (Mandate 2) |

Tabelle: `team_resource_bindings` (id, team_id FK→teams ON DELETE CASCADE,
resource_type, resource_id, resource_name, access_level, inherited,
created_at, UNIQUE(team_id, resource_type, resource_name)); Migration
idempotent in `migrate()` (`EnsureTeamBindingsTable`, nach
`EnsureRBACTables` wegen des FK-Ziels `teams(id)`).

### Users (TASK-025 — Keycloak first-login provisioning)

One real JiMesh user row per Keycloak identity, created automatically on the
first OIDC login (a second login with the same `keycloak_sub` updates
`email`/`display_name` instead of duplicating), or provisioned explicitly
via POST (the 18.9. operator report: with `registrationAllowed=false` and no
create endpoint, teams/members referenced no real users — POST now creates a
REAL Keycloak realm user via the admin API and upserts the local row).
A disabled user is rejected at the next Keycloak login with a readable
message (`403 this account has been disabled by the operator`).
There is deliberately **no FK** to `project_user_budgets`/`team_members.user_id`
yet — those get real user ids with Sprint 22 WP7 (API Consumer Keys). The
absent FK is exactly why DELETE (TASK-071) is reference-honest instead of
cascading: every row still pointing at the user blocks the delete.

| Method | Path | Body / params | Response / errors |
|---|---|---|---|
| GET | `/api/users` | — | `{users: [{id, keycloakSub, email, displayName, enabled, createdAt}], count}` — honest `[]`/`0` when no one has logged in via Keycloak yet; 401 without session |
| POST | `/api/users` (18.9. create) | `{username?, email, password, role?}` — provisions a REAL Keycloak realm user (email+password+role) via the admin API and upserts the local row; `username` defaults to the email, `role` defaults to `viewer`, `role must be admin\|operator\|viewer` | `{ok, id, sub, email, role}`; 400 invalid body / missing email+password / bad role, 502 `keycloak admin token` / `create keycloak user` failures surface verbatim, 500 local-row failure — never a silent success (Mandate 2) |
| POST | `/api/users/{id}/enabled` | `{"enabled": true\|false}` | `{ok, id, enabled}`; 400 missing id/`enabled`, 500 (honest error) for unknown ids — never a silent success (Mandate 2) |
| DELETE | `/api/users/{id}` (TASK-071) | — | `{ok, id, deleted: true}` — removes the user row. Reference-honest (Mandate 2): the survey counts `workspaces.owner_user_id`, `consumer_keys.user_id`, `project_user_budgets.user_id`, `team_members.user_id` (the `information_schema` reference check — `subagents` has NO user column); ANY non-zero count → `409 {"error": {message: "user … is still referenced by: workspaces (2), consumer keys (1) — remove or reassign these rows first; there is no silent cascade", details: {workspaces, consumerKeys, projectUserBudgets, teamMembers}}}`, nothing deleted. Ghost users (zero references) delete clean. 404 unknown id, 405 non-DELETE. Admin-gated (`/api/users` prefix, OPA) |
| POST | `/api/users/{sub}/projects` (Sprint-51 #130, §8.3; §8 auto-provision since SPRINT-139) | `{projectIds: ["…"]}` + OPTIONAL per-request node fields `workspacePath`/`nodeHost`/`nodeUser`/`nodePort`/`authMethod`/`sshPassword`/`sshKey` (the same contract as `POST /api/workspaces/{id}/provision`, applied to every project's auto-fire) — **admin-gated** since SPRINT-138 (was operator-only: password operator OR Keycloak `jimesh-admin`, via the middleware-set `X-JiMesh-Identity-Admin` — the same OPA class the admin-mutation gate already enforced on this route); 400 on empty/invalid JSON body, 403 for non-admins, 405 non-POST | `{provisioned: [wsId,…], skipped: [projectId,…], sub, provisionedWorkspaces: [{projectId, workspaceId, status, worktreePath?, branch?, provisionError?}]}` — creates ONE workspace row (status `created`, kind derived from the owner) per assigned project, idempotent per (user, project): already-existing pairs land in `skipped`, never duplicated. **SPRINT-139 (§8: "JiMesh auto-provisions one Workspace per selected Project for that User"): after the create, the route FIRES the same `provisionWorkspace` flow the manual [Provision] button uses** — per-project outcome reported honestly in `provisionedWorkspaces` (`status: "provisioned"` + worktree/branch on success; `status: "created"`/`"failed"` + `provisionError` when the project row has no path, a remote node has no credentials, or the SSH/git run failed — never a fabricated success and never a failed onboarding; the owner's manual [Provision] trigger retries). 500 carries the honest store error (check or creation) |
| GET | `/api/users/{sub}/workspaces` (Sprint-51 #130) | — | `{workspaces: [WorkspaceRow], count}` — the owner's own workspaces (`ListWorkspacesByOwner`); a non-admin caller may only query their own sub (403 `cannot list another user's workspaces`), admins see any user (SPRINT-138: password operator OR Keycloak `jimesh-admin` — the cross-tenant view the workspace switcher builds on); 400 empty sub, 405 non-GET |

### Workspaces — multi-tenant scoping (SPRINT-138, feat-workspace-multitenancy)

The workspace surface is **multi-tenant**: a normal user sees only their OWN
workspaces, an admin may switch the view into any workspace. Identity ALWAYS
comes from the verified session (Keycloak `sub` claim / password operator) —
never from a client-supplied field.

**Header contract.** The client ASKS with `X-Workspace-Scope: <workspaceId>`
on any `/api/*` call (the dashboard's `apiFetch` attaches it to EVERY call once
the sidebar's admin-only workspace switcher selected one). The middleware
(`auth.Middleware`) resolves the ask per request through the ONE OPA engine
(`policy.IsAdminXWorkspaceScope` — evaluated against the workspace lifecycle
admin surface) and answers with two **INGRESS-DERIVED-ONLY** headers (client
copies are stripped at ingress, same contract as `X-JiMesh-Identity-*`):

- `X-JiMesh-Identity-Admin: true|false` — the per-request admin decision
  (fail-closed `false` when the policy engine did not load).
- `X-JiMesh-Scope-Workspace-Id: <workspaceId>` — set when the switch is
  granted. Handlers of workspace-scoped reads treat it as the effective
  workspace.

**Deny semantics.** Admin → switch granted. Non-admin asking for their OWN
workspace → granted (a no-op, "user bleibt auf seinem Workspace"). Non-admin
asking for a FOREIGN workspace → **403** `admin permission required — switching
the workspace scope to a foreign workspace is denied by policy` (logged).
Unknown workspace id → **404** `unknown workspace scope <id>` — even for admins.
Both denies carry the machine-readable `error.type: "workspace_scope_denied"`:
the dashboard's `apiFetch` self-heals on it (clears the stale persisted scope
once, so a scope a session may no longer use can never brick every request).

| Method | Path | Notes |
|---|---|---|
| GET | `/api/workspaces` | `{success, workspaces: [WorkspaceRow], count}`. SPRINT-138 tenancy, in precedence order: (1) scope granted (`X-JiMesh-Scope-Workspace-Id`) → ONLY that workspace; (2) non-admin Keycloak identity → ONLY the caller's own workspaces (`store.ListWorkspacesOwnedByIdentity` — resolves the session `sub` to every workspace row whose `owner_user_id` matches the sub OR the `users.id` resolved from it, both shapes exist: TASK-037 ensure wrote `users.id`, Sprint-51 #130 provisioning wrote the raw sub); (3) password operator / Keycloak admin, unscoped → every workspace (the unchanged single-operator inventory). `?project=<id>` filters within the result set as before. `?all=1` is the **admin-only scope override** — the sidebar switcher's inventory fetch (it must see the FULL list to switch away from a scoped view); a non-admin sending the param is ignored and still gets their own rows only |
| POST | `/api/workspaces` | **SPRINT-139 (feat-workspace-lifecycle): CREATE IS CREATE — the row and NOTHING ELSE.** Body: `{projectId}` (required, must be a real projects row), `ownerUserId` (**optional** — set = user workspace, kind `user`; OMITTED/empty = the §8.3b SHARED/company workspace: owner stored NULL, kind `shared`, idempotency via the NULL-owner probe + the partial unique index `idx_workspaces_project_shared`), `preset?`, plus the TASK-065 additions `createVaultKv`/`secretsEngineId`. NO sshKey, NO sshPassword, NO workspacePath, NO node fields are read or needed — the old ensure mixed the row with the full SSH-worktree run and demanded an SSH key the endpoint registry already had, so a fresh instance could not create a workspace at all (the operator's 27.9.2026 report). The handler writes the row with status `"created"` — no node contact, no worktree, no session, no service key. Response: `{success: true, created: bool, workspace: WorkspaceRow, note: "workspace created — provisioning is a separate action", next: "POST /api/workspaces/{id}/provision …"}`. Re-POST for the same (project, owner) — or the same project's shared row — returns the existing row, `created: false`, still without provisioning. Admin-gated (OPA, unchanged). 404 unknown project/owner, 403 disabled owner, 400 missing projectId/invalid JSON. The row shape carries `workspaceKind` (`user\|shared`, §8.3b) and the lifecycle chain `created → provisioning → provisioned → deployed → running` (+ `failed`, `quarantined`; legacy rows may still read `pending`/`ready`/`stopped`) |
| POST | `/api/workspaces/{id}/provision` | **SPRINT-139: the deliberate provisioning step** (handler `workspaces_provision.go` — the same `provisionWorkspace` flow the §8 onboarding auto-provision fires, `user_provisioning.go`). Runs the OLD ensure's node work as its own action: status → `provisioning` → SSH/local worktree ensure (`<repo>/.jimesh/worktrees/<wsId>`, branch `jimesh/ws-<wsId>`, idempotent) → worktree path persisted → agent session `ws-<wsId>` + kind=service key minted exactly once → status `provisioned` (never downgrading a live `deployed`/`stopped`). Body OPTIONAL — `{workspacePath?, nodeHost?, nodeUser?, nodePort?, authMethod?, sshPassword?, sshKey?}`: `workspacePath` request → project row → **400 `workspacePath is required`**; node coordinates request → project row; credentials: **request wins** (`sshPassword`/`sshKey` in the body — the browser sends the registry's browser-local secret), authMethod falls back to the **endpoint registry** (the `ssh_endpoints` settings row — the matching host's authMethod/user/port; the registry stores NO secrets by design, `lib/ssh-endpoints.ts`), and a REMOTE node without usable request credentials answers **400 `no credentials for node X — supply sshKey/sshPassword in the request`** — never a guess. A LOCAL node (no host / localhost / 127.0.0.1) needs no SSH at all. Node/git failures are honest: 422 `NOT_A_REPO`/`NO_COMMITS`, 502 SSH dial, row → `failed` (re-provision retries idempotently). Response: `{success, workspace (status provisioned), worktreePath, branch, created, serviceKey?, serviceKeyNote}` — the key shown exactly ONCE on the minting run. **Ownership gate handler-side** (owner ODER admin, the terminal route's `terminalAccessAllowed`; a shared/owner-less workspace is operator/admin-only) — the OPA admin-prefix gate exempts exactly this path (`policy.isWorkspaceProvisionMutation`) so the OWNER is not 403'd before the handler's finer rule. 404 unknown workspace, 405 non-POST. **SPRINT-145 status:** the handler still calls the pure `terminalAccessAllowed` (owner-or-admin) — the member-aware `workspaceAccessAllowed` exists and is tested (`terminal.go`), but `workspaces_provision.go` was outside SPRINT-145's file scope; the one-block edit (swap the gate call + widen the deny text) ships in the SPRINT-145 sprint doc for the parent to apply, after which provisioning is owner | member | admin like the terminal |
| DELETE | `/api/workspaces/{id}` | unchanged admin mutation (OPA-gated); tenancy of the DELETE itself is not scope-dependent — deleting is an admin action by definition |
| GET | `/api/workspaces/{id}/members` | **SPRINT-145 (feat-workspace-members): the REAL per-workspace user grants** — the answer to the operator's "warum kann mein teamlevel workspace das team oder die user nicht auswaehlen die dazu zugriff haben sollen?" (28.9.2026; until now a workspace carried a single `owner_user_id` and team_bindings rows naming a workspace were bookkeeping no access path read — there was no members table at all). Rows from `store/workspace_members.go` (PostgreSQL `workspace_members`: `id, workspace_id, user_id, role CHECK viewer|collaborator, created_at BIGINT ms`, UNIQUE (workspace_id, user_id)). Response: `{success, members: [{id, workspaceId, userId, role, createdAt}], count}` — honest `[]` for a workspace nobody was added to yet (the owner's access comes from `owner_user_id`, not from a member row). **Read gate handler-side (fail closed): owner | member | admin** — the same member-aware `workspaceAccessAllowed` the terminal route uses (`terminal.go`); a stranger gets 403, never the list. 404 unknown workspace, 400 empty id. Consumed by `WorkspaceMembersPanel.tsx` (the Workspace Settings page's members card) |
| POST | `/api/workspaces/{id}/members` | Add or refresh one grant. Body `{userId, role?}`: `userId` accepts the internal users.id OR the raw Keycloak sub, resolved SERVER-side against the users store (**404 for an unknown id — never a phantom grant row**); the canonical users.id is stored. `role` "" → `viewer`; anything outside the closed set → 400. A DISABLED user is refused (403, enable first); the workspace OWNER is refused as a member (409 — standing access, not a redundant row). Re-adding an existing member refreshes the role (upsert, `created: false`; a second row is impossible on the unique index). Response: `{success, member, created, note}` carrying the honest v1 semantics: both roles gate terminal + provisioning equally today, the viewer/collaborator split is persisted for the read-only surfaces to come. **Manage gate handler-side: owner | admin** — a member may NOT grow the member list (`workspaceMemberManageAllowed`), 403 otherwise. **OPA posture: POST/DELETE under `/api/workspaces` stay admin-prefix-gated until the parent applies the `policy.isWorkspaceMembersMutation` exemption (policy.go is outside SPRINT-145's file scope — exact lines in the sprint doc) — until then admins + the operator manage members out of the box and a non-admin OWNER gets the middleware's honest 403.** 405 non-GET/POST |
| DELETE | `/api/workspaces/{id}/members/{userId}` | Remove one grant. The path `userId` accepts the member row's users.id (what the list returns) or the raw Keycloak sub — removal resolves BOTH shapes server-side (the dual-shape contract the gates read with). A missing grant is an honest 404, never a silent success. Response: `{success, removed: true, userId}`. Manage gate owner | admin (403 otherwise), 404 unknown workspace, 400 empty id, 405 non-DELETE, same OPA posture as the POST above |

**Workspace file storage (SPRINT-138 FILE-BROWSER-ACTIVATION — Ozone S3, the operator-demanded platform integration).** Five routes (handlers `files.go`, registered via `registerWorkspaceFiles`), one storage **provider** abstraction behind them (`fileStorageProvider` — SPRINT-58 NACHTRAG #3: Ozone S3 is the FIRST real provider, no stub providers; responses carry `provider`/`providerName` so the UI stays provider-agnostic). **Path model (SPRINT-58 Tier-1, operator-agreed):** every workspace — user AND shared — gets its own storage area at `ozone://jimesh/{project_id}/{workspace_id}/…` (bucket `OZONE_S3_BUCKET`, default `jimesh`; object keys `{project_id}/{workspace_id}/{name}.jenc`). A shared workspace's containers share exactly its prefix (its "zone"); user workspaces stay 1:1-isolated. NO host paths anywhere. **Crypto:** uploads stream multipart → chunked AES-256-GCM (`filecrypto`, JIMEFS1) → streaming multipart PUT (1 GiB cap, `wsFileUploadLimit`); the per-file DEK lives ONLY in the vault (`vault_secrets`, one engine — Mandate 9): user workspaces `projects/{projectId}/users/{ownerUserId}/file-keys/{filename}`, shared workspaces `projects/{projectId}/workspaces/{workspaceId}/file-keys/{filename}`. Every DEK access is `VaultAudit`-ed. Threat model (operator spec): a hacked instance needs BOTH the ciphertext AND the vault secret + scope. **Access (handler-side matrix, fail-closed):** operator (password session) ∣ admin (`X-JiMesh-Identity-Admin`) ∣ workspace owner (verified sub) ∣ a `project_roles` grant on the workspace's project. **Middleware posture (honest):** GET list/download stay session-readable; POST upload, PUT save and DELETE are EXEMPT from the `/api/workspaces` admin prefix by `policy.isWorkspaceFilesMutation` (`internal/policy/policy.go`, the `isWorkspaceProvisionMutation` pattern) — without that exemption the workspace OWNER's own writes would be answered 403 by OPA before the handler-side matrix could run. SPRINT-186 WP2 added PUT to the exemption. **Configuration (honest 503 when absent, never a fake listing):** `OZONE_S3_ENDPOINT` (e.g. `http://jimesh-ozone-s3g:9878` on jimesh-net), `OZONE_S3_REGION` (default us-east-1), `OZONE_S3_ACCESS_KEY`/`OZONE_S3_SECRET_KEY` (from `ozone s3 getsecret`, gitignored root `.env`), `OZONE_S3_BUCKET` (default `jimesh`) — backend restart applies them. **Frontend consumers:** `FilesPage` (`/workspaces/files` — sidebar Files, target selector over workspaces/apps/containers), the `ProjectDetailPage` "Files" tab, and the embedded mode on `AppDetailPage` / `DeploymentDetailPage` / `AppPanelDrawer` (fixed target, no switching).

| Method | Path | Notes |
|---|---|---|
| POST | `/api/workspaces/{id}/files/upload` | multipart field `file` (streamed, never RAM-buffered; filename sanitized — letters/digits/space/`. _ - + ( )`, ≤200 chars, no separators/metachars). Seals AES-256-GCM (JIMEFS1) and streams into the workspace's Tier-1 area; re-upload overwrites the object AND rotates the DEK. Vault write failure rolls the object back (nothing stored beats stored-but-unreadable). **Exempt from the `/api/workspaces` admin prefix** (`policy.isWorkspaceFilesMutation`) + handler matrix. Response `{success, provider, providerName, workspaceId, name, storedSize (CIPHERTEXT bytes), encrypted, algorithm, vaultKey, storageKey}`. 400 invalid filename/multipart/vault scope, 403 matrix, 404 unknown workspace, 413 >1 GiB, 502 storage unreachable, 503 provider not configured, 405 non-POST |
| PUT | `/api/workspaces/{id}/files/{filename}` | **SPRINT-186 WP2 — the content save** the workspace editor needs: raw request body becomes the file's new content, encrypted exactly like an upload (chunked AES-256-GCM, 1 GiB `wsFileUploadLimit` cap). Creates the file when the name is new (`created: true`), replaces it when it exists (`created: false`); HTTP 200 either way, the body carries which happened (same shape as `POST /api/workspaces`). **An existing file is re-encrypted with its OWN vault DEK and the vault is never written** — so there is no window where the object and its key disagree, and a failed write aborts the multipart upload and leaves the previous object intact. Only a file with no usable DEK mints a fresh one, and that path keeps the upload's fail-closed rollback (delete the object if the vault write fails). **Exempt from the `/api/workspaces` admin prefix** (`policy.isWorkspaceFilesMutation`) + handler matrix. Response `{success, created, provider, providerName, workspaceId, name, storedSize, encrypted, algorithm, vaultKey, storageKey}`. 400 invalid filename/vault scope, 403 matrix, 404 unknown workspace, 409 vault key name taken in another project's scope, 413 >1 GiB, 502 storage unreachable, 503 provider not configured, 405 non-PUT |
| GET | `/api/workspaces/{id}/files` | the REAL object-store listing under the workspace's `{project_id}/{workspace_id}/` prefix (`.jenc` ciphertext metadata only — a DEK value never rides a listing). Response `{success, provider, providerName, root, prefix, files: [{name, size, lastModified, encrypted}], count}` — `root`/`prefix` render the resolved area so the UI never hardcodes the provider. Session-readable + handler matrix. 404 unknown workspace, 502 listing failed, 503 not configured, 405 non-GET |
| GET | `/api/workspaces/{id}/files/{filename}` | decrypt + stream download: DEK from the vault (audited), ciphertext from the store, chunk-authenticated decrypt into the response. Tamper/truncation cuts the stream LOUDLY mid-flight, never delivers garbage as "the file". Headers: `Content-Disposition: filename*=UTF-8''…`, `X-JiMesh-Encrypted: aes-256-gcm`, `X-JiMesh-Storage-Provider`, `X-JiMesh-Workspace`. 404 no vault DEK / object gone / unknown workspace, 400 invalid filename, 500 malformed DEK or container, 502/503 storage states |
| DELETE | `/api/workspaces/{id}/files/{filename}` | removes BOTH halves — object first, then the vault DEK (audited); a partial failure reports exactly what was removed (`fileDeleted`/`vaultKeyDeleted`), never a blanket success. **Exempt from the `/api/workspaces` admin prefix** (`policy.isWorkspaceFilesMutation`) + handler matrix. Response `{success, provider, providerName, workspaceId, name, fileDeleted, vaultKeyDeleted}`. 404 neither half exists, 400 invalid filename, 502/503 storage states, 405 |

### Workspace Proxy Keys (Lane W-TOOLS-SESSION — LLM-proxy API keys at WORKSPACE level)

The workspace-owned key surface for the LLM proxy family
(`/workspaces/tools`, the sidebar's Tools sub-section row — one page,
`ToolsProxyKeysPage`). Handlers `internal/gateway/workspace_proxy_keys.go`,
registered via `registerWorkspaceProxyKeys` next to the members routes.
**Storage contract: the VAULT is the KV storage — the key material NEVER
sits in a plain column, no `proxy_key_refs` metadata row exists** (the
list is decrypt-free metadata served straight from
`store.ListVaultSecretsByPrefix`, so a value-row would have been needed
only if the prefix query could not answer it — it can).

**KV-storage naming** (the vault contract's `plugin/<plugin>/{scopeType}/
{scopeId}/<key>` layout applied to this key family — the name prefix IS
the storage address):

    proxy/workspace/<wsId>/<scope>/<name>

   - `proxy/` = the LLM-proxy family's own KV namespace (the
     `plugin/…` analogue: one namespace per key family),
   - `workspace/<wsId>` = the {scopeType}/{scopeId} resource pair — the
     keys live at WORKSPACE level ("api keys für proxy sollten workspace
     ebene haben"),
   - `<scope>` = the key's power lens, closed set `admin | read` — it
     RIDES THE NAME so the decrypt-free list can parse it without a
     decryption,
   - `<name>` = the caller's leaf (clean KV leaf: `[A-Za-z0-9][A-Za-z0-9._-]{0,63}`,
     unique — `vault_secrets.name` is globally UNIQUE).

The physical row is additionally PROJECT-bound (the workspace's
`projectId` travels the vault scope, the same derivation a
workspace-scope plugin installation uses) and binds `workspace_id` at
birth (`store.CreateWorkspaceVaultSecret` — the one store method that
writes both). The plaintext is generated at mint time with the
consumer-keys FAMILY shape (`jimesh-pk-…`, 24 random bytes hex — a
deliberately different label from `store.ConsumerKeyPrefix`, so the
`/v1` consumer-key chain can never resolve one: these keys write NO
`consumer_keys` hash row, the existing Sprint-35 state stays
unrewired) and lives AES-GCM-256-encrypted in the vault; the vault
audit log records create / read (reveal) / delete with the verified
identity sub as the accessor.

| Method | Path | Notes |
|---|---|---|
| GET | `/api/workspaces/{id}/proxy-keys` | The LIST = `ListVaultSecretsByPrefix('proxy/…')` × both scope levels, merged — decrypt-free metadata (name, scope, workspaceId, createdAt/updatedAt,**no values, no hashes**, unlike `/api/consumer-keys` the masked shaft is not part of the listing because it is only decidable serve-time). **Gate handler-side: workspace owner \| admin** (`workspaceMemberManageAllowed` — the members gate; a member may see the workspace, never its key inventory). 403, 404 unknown workspace |
| POST | `/api/workspaces/{id}/proxy-keys` | Mint body `{name, scope}` (covers `admin|read`). Generates the plaintext, stores it ENCRYPTED in the vault under the naming above, returns `{key: "jimesh-pk-…", entry, masked}` — **the plaintext response is copy-once**; a later recovery path exists via the reveal route. A repeated (scope, name) on the workspace → **409** (`vault_secrets.name` uniqueness, never a silent overwrite). 400 invalid name/scope, 403 gate, 409 conflict. **Exempt from the `/api/workspaces` admin prefix** (`policy.isWorkspaceProxyKeysMutation`, the members/files exemption pattern — the OWNER manages their own workspace's keys without being full admin) |
| POST | `/api/workspaces/{id}/proxy-keys/{name}/reveal?scope=admin\|read` | **Reveal via vault**: decrypts the stored value on demand (VaultAudit-gated `read`) and returns `{key, masked}` — what makes the surface copy-once at mint AND recoverable for a live key. A wrong `?scope=` resolves as an honest 404 (the scope IS the KV level). 400 bad name/scope, 403 gate, 404 unknown |
| DELETE | `/api/workspaces/{id}/proxy-keys/{name}?scope=admin\|read` | Removes the vault row exactly like the vault's own delete (same scoped 404 semantics — a name that exists only under another workspace/scope is not found here). 403 gate, 404 unknown, 405 non-DELETE. Same exemption |

The honest gap, documented on purpose: the masked shaft (prefix-4 + len)
is served on mint/reveal (decryption side) — the LIST cannot carry it
without decrypting, which the lane's contract forbids. If the operator
ever wants the shaft in the listing, the prepared follow-up is the
sketched `proxy_key_refs` metadata row keyed by the vault name — not
built here (Mandate 2: no invented row while the prefix query answers).

**Coexistence with the other key surfaces (the dedup contract):**
`/api/keys` = the upstream PROVIDER keys the proxy consumes (admin-gated
reveal, `KeysPage`); `/api/consumer-keys` = the human/app bearer keys
for `/v1` (admin-level mint, `ConsumerKeysPage`, hash-row family);
`/api/workspaces/{id}/proxy-keys` = the workspace-LEVEL proxy key family
introduced here (vault-only storage, owner-manager). None of the three
reads or writes the other's rows: different tables/rows (provider keys
vs `consumer_keys` hash rows vs `vault_secrets` proxy rows), different
gates — one rule, one implementation each.

### Consumer Keys (Sprint 22 WP7 — per-user keys for external /v1 clients)

`sk`-style bearer keys (`jimesh-ck-…`) that external clients (Cursor, OpenCode,
Kollegen) present against `/v1/*` instead of the shared admin gateway key.
Minted for a real `users` row (TASK-025) — no phantom identities. The
plaintext key is returned **exactly once** at mint time; only a SHA-256 hash
is stored. Resolution chain on `/v1`: key → user identity → budget check
(reuses `project_user_budgets` project×user rows; unscoped key or missing
budget row = fail-open, same opt-in semantics as `ResolvePolicy`) →
chain allowlist (`["*"]` default) → per-key rate limit (in-memory sliding
window, resets on backend restart — documented honestly, not a distributed
limiter). A revoked key gets `403 this consumer key has been revoked`; an
exhausted budget `402 quota_exceeded`; a disabled budget row
`403 account_disabled`; over-limit `429`. Cost of every LLM call books
against the key's `project_user_budgets` row (unscoped keys book nothing).

| Method | Path | Body / params | Response / errors |
|---|---|---|---|
| GET | `/api/consumer-keys` | — | `{keys: [{id, keyPrefix, userId, userName, name, projectId, allowedChains, rateLimitRpm, revoked, createdAt, lastUsedAt}], count}` — prefix only, plaintext never again; 401 without session |
| POST | `/api/consumer-keys` | `{name?, userId, projectId?, allowedChains?: ["chain-id"\|"*"], rateLimitRpm?}` (0 = unlimited) | `{key: "jimesh-ck-…", consumerKey}` — **plaintext, only response ever**; 400 unknown/disabled `userId`, 400 missing userId |
| POST | `/api/consumer-keys/{id}/revoke` | — | `{ok, revoked}` — idempotent |

The chain allowlist is enforced inside the proxy handlers before any upstream
dispatch (`403 consumer key is not allowed to use chain <id>`), not at the
middleware — the chain resolves per request from the model.

### Embeddings Admin (TASK-031 — real CRUD, Vorbild /api/media/*)

Admin surface for embedding providers. Registry models (identified by the
documented "embed"-substring heuristic — the models table has no modality
column) plus operator-defined custom providers (settings-KV persisted, with
base URL + masked key). Families are derived groups (text-embedding-3,
nv-embedqa, …); `dimensions`/`maxInputTokens` come from a documented spec
map — unknown families render 0/null, never an invented number. Provider
ids are JS-safe stable numbers (< 2^53).

| Method | Path | Body / params | Response / errors |
|---|---|---|---|
| GET | `/api/embeddings` | — | `{defaultFamily, families: [{family, dimensions, maxInputTokens, providers: [{id, platform, modelId, displayName, priority, enabled, quotaLabel, keyCount, isCustom}]}]}` |
| PUT | `/api/embeddings` | `{defaultFamily?, providers?: [{id, priority, enabled}]}` — registry providers flip through `SetModelEnabled` (same path as `/api/media/{id}`); priority/enabled stored as config overrides | `{success}`; 400 invalid json |
| GET | `/api/embeddings/custom` | — | `[{id, platform, modelId, displayName, baseUrl, maskedKey, enabled, createdAt}]` — key never leaves the backend unmasked |
| POST | `/api/embeddings/custom` | `{platform, modelId, displayName?, baseUrl, apiKey}` | provider row (maskedKey); 400 without platform/modelId/baseUrl |
| GET | `/api/embeddings/custom/{id}` | — | one provider row (maskedKey); 404 unknown |
| PUT | `/api/embeddings/custom/{id}` | `{platform?, modelId?, displayName?, baseUrl?, apiKey?, enabled?}` | updated row; 404 unknown |
| DELETE | `/api/embeddings/custom/{id}` | — | `{ok}` — REAL delete (embeddings stores custom providers; unlike media/custom's honest 501); 404 unknown |
| GET | `/api/embeddings/usage` | — | `{families: [{family, requestsToday, tokensMonth, platform, quotaLabel}], models: [per-model rollup], totalTokensMonth, totalRequestsToday, totalRequestsMonth}` — real request_log aggregation, `request_type = 'embedding'` |

### App Categories (R16 — Sidebar Grouping)

Deployments grouped by category in sidebar. Auto-categorization based on
deployment type. Smart suggestions (DB deployed → suggest Adminer).

- `GET /api/app-categories` — list categories + typeToCategory + smartSuggestions
  - Default categories: Infrastructure, Databases, Coding Tools, Admin UIs,
    Terminals, Monitoring
  - `typeToCategory`: maps deployment types to categories
  - `smartSuggestions`: maps DB types to suggested admin UIs
    (postgresql → adminer, redis → redis-commander, etc.)
- `POST /api/app-categories` — create category `{ name, icon, sortOrder }`

### Traffic Inspector (R16 — SecOps)

RAM-based live traffic metrics. Powers React Flow topology widget.

- `GET /api/traffic` — current traffic snapshot
  - Returns edges: `{ source, target, requests, errors, bytesSent,
    bytesReceived, avgLatencyMs, requestsPerSec, errorRate, status }`
  - Status: `healthy` (green), `slow` (yellow, >1000ms), `error` (red, >5% errors)
- `GET /api/traffic/stream` — SSE stream of traffic updates (every 2s)
  - Events: `traffic_start` → `traffic_update` (repeating)

### Vault (Zero-Trust Secret Gateway) (R16)

Single HashiCorp Vault deployment, multi-tenant via KV paths.
Agents NEVER access secrets directly — gateway injects just-in-time.

**Project Scope (TASK-055, R40-M3):** `vault_secrets`/`vault_audit_log` carry
`project_id` + `workspace_id` (`TEXT DEFAULT ''`). Every vault route derives its
project scope from the **authenticated identity — never from the body or from
client headers** (X-Header-Kontrakt: `auth.Middleware` strips client-supplied
`X-JiMesh-*` copies and pins the resolved identity server-side):

- **kind=service consumer key** (`Authorization: Bearer jimesh-ck-…`): pinned
  to the key's OWN `project_id` (read-only — list + read its project's secrets
  via `GET /api/vault/secrets`, `GET /api/vault/secrets/{name}` and
  `POST /api/vault/access`; every other method/route → 403/401). A `?project=`
  parameter from the key's caller can neither narrow nor broaden that binding,
  and a request naming ANOTHER project's id is **403** with that pin spelled
  out.
- **Dashboard/Keycloak session**: the project the request NAMES — the explicit
  `?project=`, the dashboard's `?scope=prj:{id}` project selector, or (for a
  named secret and for a list prefix) the resource's own `projects/{id}/…`
  path. **S181-10 added the missing membership check for that pick**
  (`security.vaultProjectDenial`, one exported rule shared with the embedded
  secrets engine): the password operator and a `jimesh-admin` session keep the
  global view; EVERY other identity needs BOTH the `jimesh-dev` realm role AND
  a `project_roles` row (role `developer`) for that exact project — the same
  two thresholds the OPA project gate applies to writes (E-Policy: one rule,
  one implementation, neither threshold alone is enough). Denials are **403**
  with the reason (`a project scope is required … the global vault view is
  operator-only` / `role jimesh-dev required …` / `no grant on project …`),
  never a bare 404 and never a row. Before S181-10 the `?scope=` selector was
  read by NO backend code, the resolved scope of the list route was thrown
  away, and `_ = requestedUser` left the user-namespace check unwritten —
  see the BACKLOG entry for the before/after.

Names remain globally UNIQUE (operator decision R40: column + WHERE filter, no
schema break — pick project-prefixed names like `projects/<id>/db_password`).
New secrets REQUIRE a project — `?project=` or a `projects/{id}/…` name
(never free body text; without either the store refuses the row and the
answer is **400** with that reason, not a 500). Secret rows
expose `projectId`/`workspaceId`; `workspace_id` is recorded for the future
per-workspace ACL (M3 follow-up) and on audit rows (the accessor's workspace)
— the enforced filter today is `project_id`.

**Vault Secret CRUD** (`handleVaultSecrets`, security/vault.go — one handler for
the collection and the `{name}` path):

| Method | Path | Body / params | Response / errors |
|---|---|---|---|
| GET | `/api/vault/secrets` | `?project=` **or** `?scope=prj:{id}` (session; a service key is pinned anyway) | `{secrets: [{id, name, projectId, workspaceId, allowedAgents, createdAt, updatedAt}], count, scope}` — metadata only, no values. Scope: service key → only its own project's rows (**403** when the request names another project); session → the NAMED project after the membership check (S181-10), operator/`jimesh-admin` may name nothing for the global view. Responses carry `scope` (`""` = operator global view). **403** for a non-member, a missing scope on a non-operator session, or a session without the `jimesh-dev` realm role. Rows with a `file-keys/` path segment (per-file workspace DEKs, `vaultFileKeyName`) are **excluded from the list and its `count`** — infrastructure, not operator secrets; read them by exact name instead |
| GET | `/api/vault/secrets/{name}` | `?project=`/`?scope=` (OPTIONAL — a `projects/{id}/…` name IS the scope), `?agentId=` | `{name, value}` — decrypted value (gateway use); audited as `read` (accessor type `service` + key id for service keys, `agent` when `agentId` is given, `human` for sessions). **Agent ACL enforced:** when the secret's `allowed_agents` list is non-empty, an agent accessor (passing `?agentId=`) is served only if on the list — otherwise **403** `agent is not on this secret's allowed_agents list` (audited `read` with `success=false`). **Scope (S181-10):** the name's own `projects/{id}/…` path resolves the project, so a granted member needs no query parameter at all; a `?project=` that contradicts that path → **403** naming both projects; a foreign project → **403** (membership) instead of a silent 404. 404 when the name does not exist in the caller's scope |
| POST | `/api/vault/secrets` | `?project=` **or** a `projects/{id}/…` `name` (one of them REQUIRED) + `{name, value, allowedAgents?}` — `allowedAgents` is a JSON-array string, default `"[]"` | `{ok, name, projectId}`; 400 invalid body / missing name or value / **no project at all** (`a project scope is required to create a secret — name it projects/{id}/… or pass ?project= …` — `internal/` and `llm/` rows stay updatable but cannot be created, TASK-055); 403 for service keys (read-only) and for a session without a grant on that project |
| PUT | `/api/vault/secrets/{name}` | `?project=`/`?scope=` (optional — the name's path scopes the update) + `{value, allowedAgents?}` | `{ok}`; 400 without path name; 404 when the name does not exist in the caller's scope (no silent ok — TASK-055); 403 for service keys and for a non-member session |
| DELETE | `/api/vault/secrets/{name}` | `?project=`/`?scope=` (optional — the name's path scopes the delete) | `{ok}`; 400 without path name; 404 when nothing matched in scope; 403 for service keys and for a non-member session |
| GET | `/api/vault/audit` | `?project=` or `?scope=prj:{id}` | `{entries, count, scope}` — the newest 100 `vault_audit_log` rows; entries carry `projectId`/`workspaceId` (the scope the access ran under). Same membership rule as the rows (S181-10): a non-operator session without a scope → **403**, not a global dump. Session-only surface (service keys 403) |

**Vault Tokens (time-limited agent access — operator tooling, session+OPA-gated; service keys 403):**

| Method | Path | Body | Response / errors |
|---|---|---|---|
| POST | `/api/vault/tokens` | `{secretName, agentId?, ttlSeconds?}` | `{token, secretName, agentId, ttlSeconds}`; 400 missing secretName; audited `issue_token` (with the operator's `?project=` scope, may be '') |
| POST | `/api/vault/tokens/{id}/revoke` | — | `{ok, revoked: id}`; audited `revoke_token` |

**Vault Access (agent/MCP endpoint — the ONLY way agents get secrets):**

| Method | Path | Body | Response / errors |
|---|---|---|---|
| POST | `/api/vault/access` | `{name, token?, agentId?}` | `{name, value}` — validates the token against that exact secret (403 `token invalid` / `token not valid for this secret`), 404 when the secret does not exist in the caller's scope (a kind=service key resolves only its own project's row for that name). **Agent ACL enforced (Sprint-3 WP1, R2-Report fix):** when the secret's `allowed_agents` list is non-empty, an accessor declaring an `agentId` (accessor type `agent`) is served only if that agentId is on the list — otherwise **403** `agent is not on this secret's allowed_agents list` (audited `read` with `success=false`). An empty/`[]` allowlist is the legacy marker for "no restriction"; parsing uses the stored JSON-array string plus the legacy plain comma-separated form and fails closed. Every attempt — success or failure — is written to `vault_audit_log` (accessor type `agent` when `agentId` is set, else `mcp`; `service` + the key id when the caller is a service key — the body's `agentId` is never the accessor of record for a machine caller). Without a vault token the caller must hold a valid dashboard session or a project-bound kind=service key (the `/api/*` auth gate answers 401 otherwise); a session caller additionally passes the S181-10 membership check for the resolved project (operator/`jimesh-admin` bypass it, `jimesh-dev` + grant required otherwise) |

**Security Audit:**

| Method | Path | Response / errors |
|---|---|---|
| GET | `/api/security/exposure` | TASK-013/WP6: tatsächliche Erreichbarkeit pro Projekt/Node — PortInfo mit `bind_addr`, Ontologie-Kategorie, `risk` (critical/high/elevated/ok) + `risk_reason`; Count der externallyReachable |
| GET | `/api/firewall/status` | TASK-050 retargeted: serves the latest ROUTER-NODE report (the router on the SSH target is our security node — Operator 13.9., E-Firewall). Payload: `{capabilities: {backend, available, version?, tables?, nat_supported, error?, notes?}, rules: [EffectiveRule], enforcement: [{alias, container?, state: applied\|skipped\|error, reason?, rulesApplied, appliedAt?, rules?}], projectId, hostname, reportedAt, receivedAt, stale, routerSeen, enforcementEnabled, error?}`. `capabilities`/`rules` mirror the dashboard tile's shapes 1:1. Before any router reports: honest empty state (`routerSeen:false`, `capabilities.available:false` + explanatory error) — NEVER a probe of the backend host (E-Firewall consequence 1). `?project_id=` pins one project's router; without it the freshest report is served with its identity in the payload. `stale:true` after 90s without a report. Session-gated |
| GET | `/api/firewall/rules` | The managed inbound port allowances (E-Priority: operator grants, user view read-only). `?project_id=` scopes to one project (else all projects' grants, each row carries `projectId`). `{version, rules: [{id, projectId, alias, proto, port, portEnd?, source?, comment?, createdBy?, createdAt}]}`. Session-gated (read) |
| POST | `/api/firewall/rules` | OPERATOR-ONLY (OPA-gated in `internal/auth` Middleware — same `data.jimesh.rbac.allow` decision as every admin mutation): upsert one grant `{projectId, alias, proto?, port, portEnd?, source?, comment?}`. Validates the port (1-65535, range `port<=portEnd`), proto (tcp default/udp), source (IP or CIDR) and that the alias exists in the project's router registry (`POST /api/router/config` first — no orphaned grants). Response `{success, rule: FirewallRuleRow, replaced}`; `replaced:true` = same content re-granted (idempotent, id = content hash). Persists in the settings KV (`firewall_rules:<projectID>`) and bumps the global `firewall_rules_version` — routers pull it via GET `/api/firewall/config` and reconcile within one cycle. 403 for non-admin sessions |
| DELETE | `/api/firewall/rules` | OPERATOR-ONLY (same OPA gate): `?id=<ruleId>` or `?project_id=&alias=[&port=][&proto=]`. Response `{success, removed}`; 404 when nothing matched. Bumps the version like POST |
| POST | `/api/firewall/report` | ROUTER-FACING (kind=service consumer key, same Middleware gate family as `/api/router/config`): the router pushes its measured state every cycle (outbound-only sync, E-Editions). Body: `{hostname, capabilities, rules, enforcement, enforcementEnabled, reportedAt}` (the `FirewallNodeReport` contract). In-memory per project (measured state, not configuration — a gateway restart empties it and every router re-reports within one cycle; stale-after 90s is explicit in GET status). `{success, receivedAt}` |
| GET | `/api/firewall/config` | ROUTER-FACING (service key): the grants the router enforces, scoped server-side to the key's project. `{version, rules: [FirewallRuleRow], staleAfterSeconds}`. The router compares `version` across pulls (same discipline as the alias registry) and re-renders/re-applies per-alias nftables inbound tables in the alias targets' network namespaces (default-DROP, allow loopback + established/related + the router's own relay path + these granted ports). 403 for keys without a project |
| GET | `/api/security/audit` | `{score, issues: [{severity, title, detail, fix?}], checkedAt}` — score starts at 100: −30 when no encryption key is stored (`encryption_key` setting empty), −20 when no cost circuit breaker is configured (`max_cost_per_run_usd` ≤ 0). SSH host-key verification (TASK-008): TOFU-pinned via `ssh_host_keys` for both the tunnel pool and `dialSSH`, no longer flagged. An empty vault gets an `info` issue. The call also triggers expired-vault-token cleanup. Honest caveat: the `JIMESH_ENCRYPTION_KEY` env check is currently a no-op stub — only the `encryption_key` setting is read |

**Firewall — BYOF (bring-your-own-firewall) stub (documented, deliberately NOT built, E-Priority):**
JiMesh manages ports/firewall rules directly for the user (the routes above). A future BYOF
provider lets a user bring their own firewall artifacts; the seam is already shaped —
`FirewallRuleRow` is the managed-model contract and a BYOF provider would consume the same
alias/container resolution in the router (cmd/jimesh-router/firewall.go) and swap only the
renderer + applier. Operator decision 13.9.: BYOF comes later — never silently promised.

**K-LAF Freeze/Review/Release + Forensics (Sprint 20 WP2-WP4):**

| Method | Path | Body | Response / errors |
|---|---|---|---|
| POST | `/api/security/freeze` | `{sessionId, reason?}` | `{applied, warning?, securityEventId}` — revokes the session's `vault_tokens` row, `docker pause`s its container (local or remote via the project's SSH pool, no Docker SDK), sets `sessions.status='frozen'`, records a `security_events` row. Only `trust_class='provisioned'` sessions are actually paused (`applied:true`); `discovered` sessions get `applied:false` + a warning instead (K-LAF §2). Session-gated (dashboard/Keycloak), not the gateway `api-key` |
| POST | `/api/security/release` | `{sessionId}` | `{released:true, sessionId}` — reverses freeze: un-revokes the token, `docker unpause`s the container (a failed unpause is logged as a warning event but doesn't block the status/token restore), sets `status='active'` |
| GET | `/api/security/events` | — | `{events: [SecurityEventRow]}` — newest-first, cap 100. One row per scanner finding or WP3 freeze/release action: `{id, sessionId, containerId, projectId, direction, eventType, scanner, verdict, detail, status, createdAt}`. `scanner` is `"regex-secrets"` (WP2 regex), `"llama-guard"` (WP2 model-based guard, below) or `"tetragon-ebpf"` (RM32 eBPF enforcement outcomes, below); `eventType` is `"secret_leak"`, `"unsafe_content"` or one of the `ebpf_*` enforcement outcomes respectively. `detail` is always a redacted scanner snippet or category-code summary, never a raw secret or raw checked content. Consumed by `/security/events` (TASK-021), and — filtered by `scanner`/`verdict` — by the Security Overview panel (`/security/overview`), the SAST/IaC/DAST tabs (`/security/scans/*`, filtered `scanner` prefix `checkov`/`sast`) and the top-nav critical-findings bell (all TASK-064) |
| GET | `/api/security/report/{eventId}` | — | `ForensicReport` for one event: `{event, classification, classificationNote, session?, sessionWarning?, relatedEvents, requestLog, traceIds, containerStats?, containerWarning?, generatedAt}`. `classification` is `"exfiltration"` (a `secret_leak` finding), `"prompt_injection"` (an `unsafe_content` finding — see the model-based guard scanner below), `"response_action"` (a WP3 freeze/release record), or `"unclassified"` — Privilege-Escalation/Scanning/Resource-Missbrauch have no detector behind them yet, so nothing is guessed for those. `containerStats` is a live `docker stats --no-stream` snapshot (CPU/mem/net/block/PIDs, already-formatted strings); missing session/project/container degrades to a `*Warning` string rather than failing the whole report. 404 for an unknown `eventId` |

**Static Agent-Config Scan (R1-P1, SPRINT-3 WP3 — `internal/agentconfig` + `internal/security/agent_scan.go`):**

| Method | Path | Body | Response / errors |
|---|---|---|---|
| POST | `/api/security/agent-scan` | `{config: "<.mcp.json content as a string>"}` | `{success:true, verdict: "PASS"\|"WARN"\|"FAIL", checks: [CheckResult], findings: [Finding]}` — runs the LOCAL deterministic offline scanner (no Snyk API, no model, no network) over an `.mcp.json`-shaped config: five checks, each always reported (PASS included): `W021` hidden Unicode (zero-width/bidi/combining/tag characters in server names, tool names and descriptions; FAIL on a decodable tag sequence or 3+ character classes), `W008` hardcoded secrets in env values/spawn lines/tool definitions (dlp_hook.go stage-1 rule set; placeholder/env-interpolation values like `${VAULT_API_KEY}` are whitelisted), `E005` suspicious URLs (credentials-in-URL → FAIL; localhost/loopback, non-HTTPS, shortener/tunnel hosts → WARN), `W014` manifest structure (JSON validity, `mcpServers` object, required transport field `command` XOR `url`, field types), `E002` tool-name shadowing of the system-command vocabulary (`execute` vs `execute_safe` pattern) and cross-server tool-name collisions. Every finding carries `{checkId, verdict, description, snippet, location}` — the snippet is REDACTED (never a raw secret) and the manifest check reports JSON paths instead of echoing config content. Consent-trap-free by design: the scan parses bytes, it NEVER executes a configured MCP server. An unparseable config is a `W014` FAIL finding (HTTP 200), not an error; empty/missing `config` is a 400. One `agent_scan` security event (verdict mapped to allow/warn/block) is recorded per scan. **Operator-only**: POST is admin-gated by the OPA engine (`policy.IsAdminMutation` covers `/api/security/agent-scan`), the same gate freeze/release/quarantine go through |

**Critical-Findings Dismiss-Flag (J5, Sprint-43-Nachtrag):**

| Method | Path | Body | Response / errors |
|---|---|---|---|
| GET | `/api/security/findings/dismissed` | — | `{success, fingerprints: [string], count}` — every stored dismissal fingerprint (`sdk-<sdk_logs.id>` / `event-<security_events.id>`, the frontend's stable finding keys from `lib/security-overview.ts`). Session-readable like the feed routes it filters. Consumed by the top-nav critical-findings bell (TASK-064 surface): a dismissed finding stops re-surfacing on every device — while a finding whose condition is gone still vanishes on its own (the feed windows roll; the flag only HIDES a still-present finding) |
| POST | `/api/security/findings/dismiss` | `{fingerprints: ["sdk-123", ...]}` (max 100) | `{success, dismissed: <n new>, requested: <n>}` — persists the operator's dismiss flag to PostgreSQL (table `security_finding_dismissals`: fingerprint PK, `dismissed_by` (consumer-key label or `operator`), `dismissed_at`; 90-day GC prunes flags for findings long gone from the feed window). NOT admin-gated: a read-state flag ("mark as seen"), not a destructive mutation — the OPA admin gate stays for quarantine/freeze/release. 400 on empty body or >100 fingerprints |

Mandate-3 story: the bell (TASK-064) kept read state in browser localStorage — the same critical finding re-surfaced on every other device. J5 moves the flag into the DB; the frontend no longer touches localStorage for this (`security-notifications.tsx`).

**IaC Quarantine Gate + HITL Release (TASK-059, SPRINT-28 WP2b + SPRINT-29 WP2):**

| Method | Path | Body | Response / errors |
|---|---|---|---|
| GET | `/api/security/quarantine` | — | `{quarantined_sessions: [AgentSessionRow], quarantined_workspaces: [WorkspaceRow], count, release}` — the operator's HITL worklist: every session with `status='quarantined'` plus the workspace rows in the same state. The `release` field is the how-to string. Open to every authenticated identity (like `/api/security/events`); the release POST is the privilege boundary. Consumed by the IaC tab's quarantine worklist (`/security/scans/iac`, TASK-064), which offers the same confirm-gated Release action inline |
| POST | `/api/security/quarantine/release` | `{sessionId \| workspaceId, confirm: true}` | `{released: true, sessionId, workspaceId, container, hint}` — reverses a quarantine: `docker start`s the container on the node that owns the project (same dispatch the freeze path uses), sets `sessions.status='active'` and `workspaces.status='deployed'`, records a `quarantine_release` security event + an audit sdk-log row (alias=checkov). `confirm:true` is REQUIRED — releasing a deployment the IaC gate stopped over CRITICAL Checkov findings is a human risk decision (HITL, K-LAF §7); `confirm` missing/false is a 400 with the reasoning, a non-quarantined session is 409, a failed `docker start` keeps the session quararantined and is a 502. Exactly one of `sessionId`/`workspaceId` (the workspace route resolves to its minted session). **Operator-only**: POST is admin-gated by the OPA engine (`policy.IsAdminMutation` covers `/api/security/quarantine`), the same gate freeze/release go through |

The quarantine itself is NOT an API action — it is a deploy-pipeline stage: after every successful `POST /api/workspaces/deploy` (canonical since SPRINT-52; and redeploy), the IaC gate runs the pinned Checkov container (`bridgecrew/checkov:3.2.421@sha256:0545…`, with JiMesh's own versioned docker-compose policies baked in — `deploy/scan/checks/`) over the mounted workspace configuration, plus SAST stage v1 (gosec on Go workspaces / trivy on the runtime image). Any CRITICAL finding `docker stop`s the workspace container, marks session+workspace `quarantined`, writes one `iac_finding` security event per finding plus a `quarantine` event, and alerts through the audit log surface below. The gate's verdict travels in the deploy response as `securityGate` (see the deploy row below). Per-request postures: `iacGate:"on"` (default — hard-fail on CRITICAL), `"warn"` (scan+record+alert, never stop), `"off"` (no scan). A failed scan (pull error, timeout, bad JSON) is fail-open with a loud `iac_scan_failed` event — the deployment stays up but is explicitly UNVERIFIED.

Streaming responses are never scanned (only the non-streaming `/v1/chat/completions` path runs either scanner) and no raw prompt/response payload is stored anywhere by this feature — `security_events.detail` is pre-redacted and `request_log` never held message content, so the still-open legal question in `docs/sprints/SPRINT-20-KLAF-FOUNDATION.md` (E3, payload retention period) doesn't yet apply to anything actually persisted.

**Model-based guard scanner (WP2's "Modell-Scanner", Sprint 20/36 — `internal/ai/guard_hook.go`):**

Behavioral/semantic check that ADDS to the regex scanner above, on both the
request (before upstream dispatch) and the response (after the regex
scanner has already run) — it never replaces it. Model: **Llama Guard**,
routed as its own chain through the existing mesh (bandit + failover +
budget-check, same primitives as the main proxy loop — see
`docs/architecture/K-LAF-ARCHITECTURE.md` §8 and `docs/research/R37-guardrails-otel-reference-stack.md`
for why Prompt Guard/the Python guardrail frameworks were not chosen). No
new HTTP route — config lives entirely in the existing
`GET/PUT /api/settings/{key}`:

| Setting key | Values | Default |
|---|---|---|
| `guard_scanner.enabled` | `"true"` \| anything else | disabled |
| `guard_scanner.chain_id` | a chain id (built via the existing chains API/UI, one entry = one Llama Guard model) | `"guard-scanner"` |
| `guard_scanner.enforcement` | `"ebpf"` \| anything else (RM32: fire the Tetragon kill switch on every BLOCKED verdict) | disabled |

Both the flag and a chain with ≥1 entry are required for the check to run
— an operator who enables the flag without wiring a chain (or vice versa)
gets an honestly-skipped check (logged), never a fabricated "safe" verdict
(Mandate 2). An unsafe **request** verdict blocks with `403` before any
upstream call; an unsafe **response** verdict replaces
`choices[0].message.content` with a controlled message, matching the
regex scanner's redaction discipline. Fails open on a guard-model outage
(logged loudly, never silently) — an unconfigured/unreachable guard mesh
behaves exactly as this repo did before this feature existed.

**Per-project guard policies (TASK-081 — `internal/gateway/llm_policies.go`
+ `internal/ai/guardpolicy.go` + `internal/store/guard_policies.go`):**
the workspace settings above stay the MASTER defaults; a policy may
narrow them per project, never widen them. One JSON blob per scope,
stored in `guard_policies` and validated by the same `ai.ParseGuardPolicy`
the hook enforces:

| Route | Auth | Behavior |
|---|---|---|
| `GET /api/llm/policies` | session | every stored policy (incl. `*`) |
| `GET /api/llm/policies/{project}` | session | one policy; no row → `{stored: false, policy: {}}` (inherit) |
| `PUT /api/llm/policies/{project}` | admin (OPA gate) | validate + store; invalid bodies are 400 at write time |
| `DELETE /api/llm/policies/{project}` | admin (OPA gate) | reset to inherit |

`{project}` is a real project id (existence-checked against `store.GetProject`)
or the reserved global scope `"*"`. Policy schema:

```json
{
  "enabled": null | true | false,   // null = inherit guard_scanner.enabled
  "chain_id": "",                   // "" = inherit guard_scanner.chain_id
  "enforcement": "" | "ebpf" | "off", // "" = inherit workspace guard_scanner.enforcement; "ebpf" = force on; "off" = force off. Only meaningful on project scope (the global "*" scope's field is ignored — the workspace setting IS the global answer).
  "extra_rules": [{
    "name": "company secret prefix",
    "pattern": "COMPANY_-",
    "is_regex": false,              // true → the pattern is a Go regexp
    "action": "block" | "warn",     // block: 403/redact BEFORE any model call; warn: security_events row + continue
    "categories": ["optional-labels"], // recorded on the event, metadata only
    "direction": "request" | "response" | "both"
  }]
}
```

Evaluation order per scan: rules under `*` always apply (to EVERY session,
including `unverified:` demo sessions), then the session's project policy
on top; the project's `enabled=false` disables the whole guard (model scan
AND rules) for exactly that project. Rule matches record
`security_events(scanner="llama-guard")` rows with verdicts `block`/`warn`
and a `guard-rule:` detail naming the matched rule(s) — never the matched
content — and block matches also fire the RM32 eBPF enforcement layer
below. **Per-project enforcement override:** a project policy with
`"enforcement": "ebpf"` arms the kill switch for that project's sessions
even when the workspace default is off; `"enforcement": "off"` silences it
even when the workspace default is on. Frontend: `/security/guard-policies`
(SecurityGuardPoliciesPage) + `/security/ebpf-jailer` (EbpfJailerPage).

**eBPF enforcement layer (RM32, Sprint 139 — `internal/ai/guard_enforce.go` + `deploy/tetragon/`):**
with `guard_scanner.enforcement="ebpf"`, every BLOCKED verdict (request
403 AND unsafe response) additionally fires a **Tetragon kill switch** in
the session's own container: the hook docker-execs (local docker.sock or
the project's SSH pool, same dispatch as freeze) a marker script at
`/tmp/jimesh-guard-kill.<session>` and executes it; the TracingPolicy
`jimesh-guard-kill` (cilium.io/v1alpha1, loaded by the tetragon daemon
deployed via `make redeploy SERVICE=tetragon NODE=<name>`) kprobes
`security_bprm_check` and SIGKILLs that exec **in the kernel, before the
program runs**. Only `trust_class='provisioned'` sessions are enforced
(K-LAF §2, same as freeze). The outcome of every attempt is measured by
the docker-exec exit code and recorded as its own `security_events` row
(scanner `tetragon-ebpf`): `ebpf_kill_enforced` (exit 137 — the kernel
killed the marker exec; verdict `block`), `ebpf_enforcement_missed`
(exit 42 — tetragon absent/not enforcing for this container, e.g. a
gVisor/runsc container whose in-sandbox execs are invisible to host
eBPF; verdict `warn` — never faked as enforced), `ebpf_enforcement_failed`
(dispatch/environment error; `warn`) or `ebpf_enforcement_skipped`
(unresolvable/non-provisioned session, no container; `warn`). Off by
default; without the setting the hook behaves exactly as before. Deploy,
live-deploy verification and the operator end-to-end test procedure:
`deploy/tetragon/README.md`.

**eBPF Jailer operator surface (TASK-081):** `/security/ebpf-jailer`
(`EbpfJailerPage`) — the honest operator dashboard for the RM32 kill
switch. Global half: workspace switch `guard_scanner.enforcement` (read/write
via `/api/settings/guard_scanner.enforcement`). Project half: per-project
`enforcement` override via `/api/llm/policies/{project}` (GET+PUT, admin
gated). Ledger: live list of `security_events` filtered by
`scanner=tetragon-ebpf` (`ebpf_kill_enforced`/`ebpf_enforcement_missed`/`ebpf_enforcement_skipped`/`ebpf_enforcement_failed`), empty = honest "never fired", not "no data".

**Frontend testing/demo (TASK-064):** `/security/testing`
(`SecurityGuardDemoPage`) reads the two setting keys above via
`GET /api/settings/{key}` (note: the generic settings route returns the
raw saved bytes, not a JSON-encoded string — an unset key comes back as
the literal `{}` object; `"true"`/a chain id is plain text and is read/
written as such by the page, not `JSON.stringify`'d) and, when both are
set, drives the real guard hook end to end: it posts a synthetic
prompt-injection-shaped message to `POST /v1/chat/completions` with a
throwaway `X-Session-Id`, then looks up the resulting `security_events`
row by that session id. No new backend route. When unconfigured, the
page shows an honest "not configured" state with the two setting keys
and how to wire a real chain — it never fabricates a block.

**Security Exposure (WP6 / TASK-013):**

| Method | Path | Body | Response / errors |
|---|---|---|---|
| GET | `/api/security/exposure` | — | `{nodes: [{id, kind: "local"|"project", host?, vantage, ss_available, ss_error?, docker_available, docker_error?, ports: [{port, bind_addr, process, pid, externally_reachable, loopback_only, iface?, iface_known, seen_in_ss, seen_in_docker, docker_host_ip?, host_bind_addr?, docker_container?, docker_image?, docker_only, tech?, category?, project_id?, project_name?, risk: critical\|high\|elevated\|ok, risk_reason}], discrepancies: [string], summary}], checkedAt}` — **actual** reachability of published ports (ss + docker port mappings + tech ontology), not configured intent. Query: `?project=<id>` scans one project node over SSH; `?all=1` adds every project node that has an SSH host; default is the local node only. Session-gated: 401 without a dashboard session. `project_id`/`project_name` (TASK-030 item 4): on a `?project=<id>` node every port carries that project directly; on the local mixed-bag node it's resolved from the `jimesh-framework-<id>-`/`jimesh-codeserver-<id>-` container-name convention, then from a manual `POST /api/projects/{id}/ports/assign` override — empty on both means "no project" (frontend groups these under "No Project", TASK-029). Consumed by the frontend exposure table (`/security/exposure`, TASK-013 frontend part) and, since SPRINT-136, by the WAF matrix (`/security/waf-matrix`, Backlog #082): rows are this report's ports; the WAF column turns active exactly when a port's docker view names the Coraza sidecar (`jimesh-waf-*`, image `jimesh-waf` — with the deploy `waf` opt-in that sidecar holds the only port publication) |

**HashiCorp Vault (Docker Compose):**
- `jimesh-vault` container: `hashicorp/vault:latest`, dev mode
- Port: 8200, `VAULT_DEV_ROOT_TOKEN_ID=jm_master_root_token_2026`
- Go client: `vault_client.go` — GetSecret, PutSecret, DeleteSecret, ListSecrets
- Multi-tenant: `secret/data/projects/{project_id}/*`
- Fallback: AES-GCM-256 encrypted PostgreSQL (if Vault unavailable)

### Projects — CRUD & workspace deploy pipeline (internal/deploy/projects_ssh.go)

> **SPRINT-52 route renaming (operator-approved, 21.9.2026):** the deploy-family routes are CANONICAL under `/api/workspaces/*` and `/api/servers/discover` — a deploy provisions the workspace's container (Sprint-48 hierarchy), the docker-ps scan is a server-level action. The old `/api/projects/{deploy,redeploy,undeploy,discover}` paths stay registered as **deprecated legacy aliases** on the very same handlers (dual registration in `internal/deploy/deploy.go`, zero code duplication) so no existing client breaks. New code calls the canonical paths.

| Method | Path | Notes |
|---|---|---|
| GET | `/api/projects` | `{projects: [...]}` — every persisted project straight from PostgreSQL, incl. `framework, runtime, status, nodeHost/User/Port, workspacePath, meshRouterId, port, vncPort, codeServerPort, volume, dockerSock, containersCount` and, since **SPRINT-154 (protected-internal-projects)**, `isInternal` (the real `projects.is_internal` column: `true` = protected — the delete below refuses it with a 409 and the sidebar's "hide internal projects" preference filters on it; shape-additive, `false` for every pre-SPRINT-154 row) |
| POST | `/api/projects` | **Backlog #134 (fix-project-creation): project-row creation — the missing tier parent.** Body: `{name}` (required, trimmed, ≤255 chars — `projects.name` is VARCHAR(255); 400 on empty/overlong/invalid JSON) plus the OPTIONAL server pin `nodeHost`/`nodeUser`/`nodePort` (**fix-project-server-select**: the NewProjectDialog's server dropdown sends the operator's pick from the SSH endpoint registry — `nodeHost` given → the three land in the row's real `node_host`/`node_user`/`node_port` columns, exactly where the deploy/ensure flows later write their measured values, so the pin survives restarts; `nodePort` 0/absent defaults to 22 (the schema default), out-of-range 400; user/port without a host 400 — a pin needs a host; host trimmed, ≤255). Absent pin → the pre-#134 behavior, every deployment-metadata column keeps its schema default (`framework ''`, `node_user ''`, `node_port 22`, `network_mode 'isolated'`, `enable_nat 1`). Creates the project row **and, in ONE transaction, that project's one owner-less shared workspace** (SPRINT-186 WP1 / SPRINT-170 WP4 — there is deliberately no "project without a workspace" state for the dashboard to fall into): id is server-generated (`proj-` + 16 hex from crypto/rand), status `stopped` (nothing was deployed — the same value the undeploy sweep leaves); the workspace row lands with `workspaceKind: "shared"`, `ownerUserId: ""`, status `created`. Still ROWS ONLY — no container starts, no SSH runs, no node is contacted, no S3 bucket is touched; provisioning that workspace stays `POST /api/workspaces/{id}/provision`'s job. Names are NOT unique (no constraint exists — same posture as the deploy path, documented not pretended). Response: `{success: true, created: true, project: {...}, sharedWorkspace: WorkspaceRow, note: "project and its shared workspace created — provisioning is a separate action"}` where `project` is the exact GET shape below (fresh row: empty framework/runtime, `containersCount: 0`; node fields empty or the sent pin), so a client can drop it straight into list state, and `sharedWorkspace` is the §8.3b shared workspace created alongside it (additive key — a client that ignores it still works). 405 for anything but GET/POST (DELETE lives on `/api/projects/{id}`). **Admin-gated** (OPA — the precise two-segment `POST /api/projects` match in `policy.IsAdminMutation`, the create sibling of the DELETE gate; password operator and Keycloak `jimesh-admin` pass, the `jimesh-dev` tier is denied — the SPRINT-47 project-roles rego never matched creation, now the admin gate makes that posture real instead of incidental). What exists afterwards is the shared workspace above, plus the parent `POST /api/workspaces` (ensure, for a per-user workspace) and `POST /api/workspaces/deploy` — closing the "workspaces but never projects" dead end the dashboard had. |
| GET | `/api/deployments` | — | `{deployments: [DeploymentRow]}` — every persisted deployment across ALL projects, straight from PostgreSQL (TASK-086: the SSOT store's `apps` feed consumed this route long before it existed — the route-consumer matrix gate flagged it as *consumer without route*). P0-4: the deploy engine writes these rows itself now — upserted per `(projectId, workspaceId)` after every successful deploy/redeploy, so the feed reflects real deployments instead of staying empty unless hand-POSTed; each row carries `workspaceId` ("" = shared project deploy) and `interfaces` (the derived JSON array of reachable interfaces, `[]` when none). Honest empty state: `{deployments: []}` when nothing is persisted. Session-gated like the other deploy reads. SPRINT-138 tenancy (same filter as `GET /api/projects/{id}/deployments`): `X-Workspace-Scope`-scoped admins see only the scoped workspace's rows, non-admin Keycloak users only their own workspaces' rows (identity from the session `sub`, both `owner_user_id` shapes), unscoped operators/admins every row; a store error in the own-workspace lookup fails CLOSED with a 500 (never an unfiltered leak) |
| DELETE | `/api/projects/{id}` | removes the project row + its registered containers (FK cascade) + its workspaces (rows removed, their `kind=service` keys revoked — TASK-037 contract) from PostgreSQL; RUNNING containers on the node are NOT touched (use undeploy). **SPRINT-154 (protected-internal-projects): a row with `is_internal = true` is refused OUTRIGHT — `409 {"error": {message: "project … is marked internal and is protected from deletion — unmark it first if it must go (PATCH /api/projects/{id}/internal with \"internal\": false)", type: "project_internal"}}`, nothing deleted, no `?force=` override (checked BEFORE the TASK-071 reference survey so the reason is the protection, never a reference list; the store layer re-checks via `store.ErrProjectInternal` as defense in depth). Toggle the flag with `PATCH /api/projects/{id}/internal` (below).** TASK-071 made it reference-honest (Mandate 2): the survey counts every NON-cascade row still referencing the project — `consumer_keys` (non-workspace keys pinned to it), `deployments`, `project_user_budgets`, `router_aliases`, `sdk_logs`, `security_events`, `sessions`, `subagents`, `vault_audit_log`, `vault_secrets` (the `information_schema` reference check); ANY non-zero count → `409 {"error": {message: "project … is still referenced by: sessions (3), sdk logs (12) — remove or reassign these rows first; workspaces and containers cascade with the delete, the rest does not", details: {consumerKeys, deployments, …}}}`, nothing deleted. **S192-19 (consent-gated vault purge, operator 8.10.2026): the optional query parameter `?purgeVault=true|false` (default = absent/false, IAC-safe) gives the CONSENT path out of the dead end instead of leaving the vault rows as the permanent blocker: `purgeVault=true` purges the project-qualified vault rows first — `vault_secrets` (the AES-GCM-256 encrypted values) + `vault_audit_log`, store methods `PurgeVaultSecretsForProject` / `PurgeVaultAuditLogForProject`, qualification `project_id = ?` IDENTICAL to the survey, so exactly the rows the 409 named die and the deleted counts come back from `RowsAffected` (never computed) — then the survey is RE-RUN and only the FRESH counts decide: other references still present → the 409 stays with remaining counts + `purgedVault` marker inside `details` (+ top-level) saying what THIS call already removed (one-way purge, never silent); nothing else blocks → the delete proceeds and the success response carries `purgedVault: {vaultSecrets, vaultAuditLog}`. The internal-flag 409 stays FIRST in line: `?purgeVault=true` on an `is_internal` row purges NOTHING (409 project_internal, zero rows touched) — unmark via the PATCH route is its own admin step before the delete (the dashboard's two-stage confirm drives patch-then-delete). Malformed values (`?purgeVault=maybe`) → 400. Consent is opt-in and lives behind the same admin gate as the DELETE itself — there is no un-admin way into the purge.** A reference-free (ghost) project deletes clean → `{success, id, removedWorkspaces?, purgedVault?, vlanLeftover?}`; 404 unknown id, 405 non-DELETE, 400 malformed `purgeVault`. Admin-gated (OPA — precisely this one-segment DELETE, see RBAC section). TASK-080 (Sprint 41): if the project owned a VLAN, the `project_vlans` row dies with the FK cascade but the NODE-side segment (docker network `jimesh-vlan-<id>` + sub-interface `<parent>.<vlanId>`) cannot be torn down from this credential-less route — the response carries `vlanLeftover: {vlanId, driver, subnet, subInterface, network, cleanup: "docker network rm …; ip link del …", notice}` naming the exact residue and cleanup commands (honest, same contract as the untouched running containers). Clean path: undeploy with `purgeVlan: true` BEFORE the delete. |
| PATCH | `/api/projects/{id}/internal` | **SPRINT-154 (protected-internal-projects)** — the admin toggle behind the `projects.is_internal` protection flag: body `{"internal": true|false}` (the boolean is REQUIRED — a missing field is a 400, never a silent true, Mandate 2) → re-reads the row and answers `{success, id, name, isInternal, message, project: {id, name, status, isInternal}}` with the STORED state, never the request's echo. 405 non-PATCH, 400 missing/invalid boolean or bad JSON, 404 unknown project, 403 non-admin. Admin-only (fail closed, HANDLER-side — same privilege class as the delete the flag protects; `isAdminRequest`: the password operator or a Keycloak identity the OPA engine classified admin via the middleware-set `X-JiMesh-Identity-Admin` — client-supplied copies are stripped ingress-side, so it cannot be spoofed; a non-admin cannot even UNMARK). The flag is what `DELETE /api/projects/{id}` refuses (409 above) and what the sidebar's "hide internal projects" preference filters on; marking is an explicit operator action — no project is ever silently reclassified. **ROUTE REGISTRATION: the gateway.go line ships in the SPRINT-154 BUILD report** (parallel agents held gateway.go during the build; handler lives in `internal/gateway/project_internal.go`): `mux.HandleFunc("PATCH /api/projects/{id}/internal", s.handleProjectInternalToggle)` — the more specific pattern wins over deploy.Register's methodless `/api/projects/{id}` (Go 1.22 ServeMux precedence, proven by `TestProjectInternalToggleEndToEnd`). Known admin-audit gap: the RM35 `admin_audit_log` middleware writes only OPA-gated mutations, so this handler-gated toggle does not auto-appear there yet — folding it into `policy.IsAdminMutation` is the operator's one-line follow-up. |
| GET | `/api/projects/{id}/vlan` | TASK-080 (Sprint 41) — the project's VLAN/network assignment (the UI-Editing path of the Network-Editing tab). Unassigned → `{assigned: false, projectId, composeSnippet, notice}` (honest empty state); assigned → `{assigned: true, vlan: {projectId, vlanId, driver, parentIface, subnet, gateway}, vlanId, driver, subnet, gateway, parentIface, subInterface: "<parent>.<id>", dockerNetwork: "jimesh-vlan-<projId>", composeNetwork, composeSnippet}` — the snippet references the SAME docker network as `external: true`, so a compose file on the node edits the identical resource (TASK-049 "beide Pfade", no second schema). No node probe runs (a GET carries no credentials). 404 unknown project. |
| POST | `/api/projects/{id}/vlan` | TASK-080 — provisions (idempotently) the project's VLAN on the node and LIVE-attaches every running `jimesh-framework-<id>*` container (`docker network connect`, no restart needed — verified: a running container bridges its management IP + the VLAN IP simultaneously). Body: `{nodeHost, nodeUser, nodePort?, authMethod?, sshPassword?, sshKey?, vlanId?, driver?, parentIface?}` — `vlanId 0`/absent = auto-allocate the lowest free id in the `vlan_id_min..vlan_id_max` settings range (defaults 2..4094; the 802.1q tag field is 12 bits — ids 1..4094, a HARD kernel cap, documented not ignored); explicit ids must be free → `409` when another project owns them (projects must never share a segment); an existing assignment WINS over a fresh allocation (redeploy/re-provision reuse — a conflicting explicit id is `409`, teardown first). `driver`: `""`/`macvlan` (unique MAC per container) or `ipvlan` (L2, shared host MAC — switch port-security / MAC-table limits; configurable, not hard-coded). `parentIface`: settings key `vlan_parent_iface`, default `eth0`. Provisioning commands (internal/network/vlan.go, command emission — the repo's SSH idiom, no netlink dependency): `ip link add link <parent> name <parent>.<id> type vlan id <id>` + `ip link set dev <parent>.<id> up` (zero-downtime, the PARENT is never touched; macvlan/ipvlan sub-interfaces cannot talk to their parent by kernel design — host management stays untouched, verified: host → macvlan container IP = 100% packet loss), then `docker network create -d <driver> -o parent=<parent>.<id> [-o macvlan_mode=bridge \| -o ipvlan_mode=l2] --subnet 172.(16+id>>8).(id&255).0/24 --gateway ….1 jimesh-vlan-<projId>` (deterministic /24 in 172.16.0.0/12 — collision-free across the whole id space; a naive 10.<id>.x.y would break at id 256). Failure is loud: no `\|\| true` on provisioning — a node without CAP_NET_ADMIN / the 8021q module fails the request with the real stderr. → `{success, projectId, vlan, vlanId, dockerNetwork, subInterface, output (real command output), notice}`; 400 invalid driver/id/parent (shell-metacharacter guard), 409 id conflicts. |
| DELETE | `/api/projects/{id}/vlan` | TASK-080 — the full inverse: disconnects still-attached endpoints, removes the docker network, deletes the sub-interface (`ip link del` — the parent is never touched), and drops the `project_vlans` row. Body (credentials are REQUIRED when an assignment exists): `{nodeHost, nodeUser, nodePort?, authMethod?, sshPassword?, sshKey?}` — without them: `400` (refusing to delete only the DB row while the node-side segment keeps running would silently strand resources; the row is also KEPT when the node sweep fails, so no id stays reserved for a segment that vanished). No assignment → `{success: false, removed: false, notice}` (honest no-op). Success → `{success, removed: true, projectId, vlanId, dockerNetwork, subInterface, output, notice (residue-check commands)}`. |
| GET/POST | `/api/servers/discover` | live `docker ps -a` scan (host socket): parses `jimesh-framework-*`/`jimesh-codeserver-*` names into projects, derives framework/ports/status from the container list and PERSISTS them (upsert) → `{success, projects: [{id, name, framework, status, port, vncPort?, codeServerPort?}]}`. No method gate — GET and POST both run the live scan (the UI's GET merge path and the App-Discovery POST are the two real consumers). SPRINT-52: canonical path; `/api/projects/discover` is the deprecated legacy alias. |
| POST | `/api/workspaces/deploy` | the deploy engine (local `docker` or over SSH). Body `DeployRequest`: `{nodeHost, nodeUser, nodePort?, authMethod?, sshPassword?, sshKey?, projId, projName?, framework, port?, vncPort?, codeServerPort?, workspacePath?, meshRouterId?, runtime?, tools?, dockerSock?, installGVisor?, useGVisor?, waf?, edgeNode?, gitToken?, taskId?, workspaceId?, iacGate?, vlanEnabled?, vlanId?, vlanDriver?}` (R41 section B / Mandate 12, TASK-063: `ufwRule` is gone — JiMesh never writes host-firewall rules) — `framework`: `dsh \| opencode \| claude-code \| gemini-cli \| jimesh` plus each one's `_code_server` variant (TASK-030: `claude-code`/`gemini-cli` added — both install their CLI via `npm install -g` on `node:22-bookworm` at deploy time, since no verified public image bundles either; each needs its own provider API key supplied inside the container, JiMesh does not inject one yet, see `TODO(security, claude-code\|gemini-cli)` in `projects_ssh.go`). `runtime`: `dsh/python/go/node/docker/base` ("" = framework default); `gitToken` is passed ONLY as `GIT_TOKEN` env + credential store inside the state volume, never persisted. Every published port is loopback-bound (`127.0.0.1:`). `waf` (TASK-057, Sprint 31, opt-in): a Coraza/Caddy sidecar `jimesh-waf-<nameKey>` joins the project Docker network, publishes `127.0.0.1:<port>` (the deploy's ONLY host bind — the app container publishes nothing, zero-port since TASK-030) and proxies to the workspace container by Docker DNS with the embedded OWASP-CRS v4 rules blocking (SQLi/XSS → 403 from the WAF, not the app); the tunnel route lands on the WAF too (the deploy echoes the WAF's IP as internal IP); 400 when the framework has no single workspace container (`jimesh` compose), `port` is unset, or networkMode is `host`/`none` (no Docker DNS to proxy by). `edgeNode` (TASK-058, Sprint 36 WP6, opt-in): ships the L7 router binary (`cmd/jimesh-router`, same build/stream pipeline as socket-guard/WAF — `docker save \| ssh docker load`) and runs it as `jimesh-router-<nameKey>` with `--network host`: the node's own `127.0.0.1:3100` becomes the edge surface (alias middleware + local `POST /api/sdk/logs` ingest with a JSONL journal and at-least-once async forward to the central ingest, health on `:3101`, zero published ports), a fresh kind=service key is minted per deploy and injected as `JIMESH_SERVICE_KEY` (revoked+re-minted on redeploy, never logged or stored in plaintext), and the volume `jimesh-router-data-<nameKey>` keeps cert + WAN-down journal across redeploys (removed only on `purgeVolume: true`). The router's own routes (`/api/sdk/logs` on the edge, `GET /api/edge/status`) are documented in `src/backend/cmd/jimesh-router/README.md` (the router surface's documentation home, per the TASK-033 decision). Response: `{success, output, allocatedPort, allocatedVncPort, allocatedVSCodePort, codeServerPassword (one-time, never stored), volume: jimesh-dsh-data-<projId>, notice, securityNotes[], tags: string[] ("shell" for CLI/agent-shell frameworks — TASK-030 item 2), shellAccess: bool, waf: bool, edgeNode: bool, securityGate, deploymentId, deploymentCreated, interfaces}` (P0-4: on success the engine UPSERTS the project's deployments row — keyed `(projectId, workspaceId)`, honest status `deployed`, the mounted checkout as `remotePath` and the ports-derived `interfaces` — `deploymentId` is its id, 0 plus `deploymentRowUpdateFailed: true` when the write failed (loud bookkeeping gap on a RUNNING deployment, never a silent fake); `deploymentCreated: false` means a redeploy UPDATED the existing row instead of duplicating it — the row is an app identity, `created_at` keeps the first deploy's timestamp) + `taskId/taskWorktreePath` when a task worktree is mounted, `workspaceId/workspaceWorktreePath/workspaceVolume/workspaceRowUpdateFailed` for workspace deploys (TASK-037 — the row's `workspaceId` scope is the same nameKey the containers use), `edgeContainer/edgeVolume/edgePorts` when `edgeNode` is set; 400 host/user/projId missing. `vlanEnabled` (TASK-080, Sprint 41, opt-in, default OFF): provisions (idempotently) a dynamic 802.1q sub-interface on the node's parent NIC (settings `vlan_parent_iface`, default eth0) plus a macvlan/ipvlan Docker network `jimesh-vlan-<projId>` and attaches the workspace container LIVE (`docker network connect` — dual-homed: the management egress bridge stays, the VLAN is the isolated project segment; no restart). 400 unless `networkMode` is `isolated` and the framework starts a single workspace container; 409 when the explicit `vlanId` (0 = auto-allocate lowest free in the `vlan_id_min..vlan_id_max` settings range) belongs to another project; a persisted assignment WINS on redeploy (a conflicting explicit id is 409, teardown first). `vlanDriver`: `""`/`macvlan` (unique MAC per container) or `ipvlan` (L2 shared host MAC — switch port-security). The 802.1q id space caps at 4094 (12-bit tag) — documented hard kernel limit. Response then carries `vlan` (assignment spec), `vlanNetwork`, `containerRuntime` (MEASURED via `docker inspect -f '{{.HostConfig.Runtime}}'` — "runsc-falco"/"runsc" when gVisor really executed the container, so "VLAN + gVisor both active" is a fact from the node, not a copy of `useGVisor`) and `vlanAttached` (MEASURED from the container's network list); the securityNote states the dual-homing design, the kernel-level host↔parent separation and the layer combination (incl. the honest DEGRADED note when runsc is absent from the node). `useGVisor` (SPRINT-52 Teil 1, 27.9.2026): the deploy PREFERS the `runsc-falco` runtime — the variant `deploy/falco-gvisor-integration` registers, so the container's sandboxed syscalls stream to `jimesh-siem-falco` (gVisor Runtime Monitoring) — whenever `docker info` lists it, and falls back honestly to plain `runsc` (Falco then receives NO gVisor events from this container) and then `runc`, echoing the chosen runtime and the reason in the deploy `output`. `installGVisor` (pre-existing) installs plain `runsc` over SSH when the node lacks it — it does NOT wire the Falco integration (that is `deploy/falco-gvisor-integration`'s ansible task). `iacGate` (TASK-059, Sprint-28 WP2b + SPRINT-29): the IaC quarantine gate's posture for this deploy — `""`/`"on"` (default) scans the mounted workspace configuration with the pinned Checkov container after the container is up and `docker stop`s it on any CRITICAL finding (release only via the quarantine route above), `"warn"` scans+records+alerts without stopping, `"off"` skips the scan (not persisted — every deploy re-states the posture, like `waf`). `securityGate` is the gate's verdict: `{status: off\|passed\|quarantined\|failed, reason?, critical_findings, high_findings, iac_findings[], sast_findings[], sast_compile_errors?, quarantined_container?, release_hint?, scan_ms}` — `status:"failed"` is fail-open (deployment up but UNVERIFIED), `quarantined` carries the `release_hint`. A `shell`-tagged deployment's `securityNotes` always spell out both access paths: `docker exec` over the SSH tunnel (host/port from the request), and the loopback-bound noVNC port — real only for `opencode`, reserved-but-unused for the other shell frameworks. SPRINT-52 (21.9.2026): canonical path — `/api/projects/deploy` stays registered as the deprecated legacy alias (same handler). |
| POST | `/api/workspaces/redeploy` | same body + `projId` required; tears framework/codeserver containers down WITHOUT touching the named state volume (agent workspace, DSH context, git creds survive), then re-runs the deploy; a failed pre-sweep only logs, it does not abort. P0-4: after a SUCCESSFUL pre-sweep the scope's `(projectId, workspaceId)` deployment rows flip to `stopped` (the containers really are gone — a failed redeploy must not leave them claiming `deployed`); the deploy run itself upserts the row back to `deployed` with the new ports/interfaces on success. SPRINT-52: canonical path — `/api/projects/redeploy` is the deprecated legacy alias (same handler). |
| POST | `/api/workspaces/undeploy` | `{nodeHost, nodeUser, projId, port?, vncPort?, codeServerPort?, purgeVolume?, purgeVlan?}` — stops/removes the project's containers, marks it `stopped` in PostgreSQL; the state volume `jimesh-dsh-data-<projId>` is KEPT unless `purgeVolume: true` (R41 section B / Mandate 12, TASK-063: the legacy `ufwRule` host-firewall cleanup path is removed, not just undocumented — JiMesh never runs `ufw`/`iptables` on a node). `purgeVlan` (TASK-080, Sprint 41, project-scoped): ALSO tears the project's VLAN down on the node (disconnect endpoints, `docker network rm jimesh-vlan-<id>`, `ip link del <parent>.<id>` — best-effort like every sweep) and removes the `project_vlans` row AFTER the sweep ran (a row without its node resources would strand the id forever). Default false — the VLAN survives undeploys so redeploys reuse it (same keep-model as the volume). 400 when a WORKSPACE undeploy (`workspaceId` set) sets it — the segment belongs to the project, other owners may still run on it. Response: `{success, output, notice, vlanPurged?, vlanNotice?, deploymentsStopped, deploymentsStopFailed?}` — `vlanPurged: false` + `vlanNotice` when purgeVlan found no assignment (honest no-op); P0-4: AFTER the sweep succeeded the scope's `(projectId, workspaceId)` deployment rows flip to `stopped` and `deploymentsStopped` carries the honest count (0 = no row claimed to run — the flip deliberately runs only after a sweep that truly ran, so a failed sweep cannot invent `stopped` rows for containers that may still run; a failed flip is logged loudly AND flagged as `deploymentsStopFailed` instead of a silent state split). SPRINT-52: canonical path — `/api/projects/undeploy` is the deprecated legacy alias (same handler). |
### Deploy environment = `k8s` (SPRINT-DEPLOY-DUAL-ENV A1/KD-3 — behind feature flag)

The two deploy aliases above (`/api/workspaces/deploy`, `/api/projects/deploy`) also accept the KD-1
`environment_type` field: a body with `environmentType: "k8s"` (or legacy `env: "k8s"`) takes the k8s
branch instead of the SSH docker-run engine. **The branch is OFF until the settings-KV key
`k8s_deploy_enabled` is truthy (`true`/`1`/`on`/`enabled`; default OFF) — with the flag off the
branch answers the honest `501` "k8s path in-progress (KD-3)" instead of pretending.** Nothing is
read from `DeployRequest` for the branch (that struct stays the gvisor lane's file); the k8s body is
decoded separately in `internal/deploy/k8s_deploy.go` (`K8sDeployRequest`):

- Body: `{workspaceId (required for the k8s path), projId?, clusterId? (provision-target id whose
  kubeconfig is resolved), name?, framework?, image (required — no implicit image invention),
  port? (default 8080), env? (map of compose env-entries, KD-2 fragment interchange)}`.
- kubeconfig resolution (`store.ResolveKubeconfig`, fresh per deploy — OQ2: no caching, no CP-DB
  persistence): 1.) settings-KV `provision/<clusterId>/kubeconfig`, 2.) vault rows under the
  `jimesh-infra` project scope then the legacy-global row (`provision/<clusterId>/kubeconfig`,
  SPRINT-PROVISION-ONPREM-CLOUD-K8S PV-2). No source → honest 502 naming the missed path.
- namespace-per-workspace `jimesh-ws-<workspaceId>` (sanitized RFC1123), applied idempotently
  (create, `AlreadyExists` → update) together with: ResourceQuota `jimesh-ws-quota` — starter-tier
  caps (PRICING-STARTER-TIER: 3 containers × 0.25 vCPU / 512 MB → `pods=3`, `limits.cpu=750m`,
  `limits.memory=1536Mi`, requests counted too), LimitRange `jimesh-ws-limits` — every container
  defaults onto 250m/512Mi unless its manifest states otherwise; K8s Secret `jimesh-env-<name>-…`
  (Opaque, `stringData` — the compose env-entries live in the cluster, never in the CP DB),
  Deployment `1 replica` (resources pinned to the share, `envFrom` the secret when entries exist),
  Service ClusterIP **only** (no NodePort/LoadBalancer — host exposure stays with the
  gateway/provision lanes).
- Response (200): `{status: "applied", namespace, clusterRef, kubeconfigSource, applied[], quota,
  deployment, service, secret, manifests (rendered YAML preview of what the typed clients applied),
  consoleLog[]}` — coordinate facts only, never the kubeconfig or secret VALUES.
- Errors: 400 (missing `image` etc.), 502 (kubeconfig unresolvable/invalid, apply failures — the
  error names the namespace and the failed object; the deployer stops at the first failed object,
  nothing is fabricated into `applied`).
- Deferrals to later packages (documented, not pretended): no deployment-row upsert on the k8s
  path yet, no SSE console streaming (KD-6), no compose→manifest fragments in this endpoint's
 body (KD-2 renderer feeds them into `env`/`image` today), tf-runner jobs are KD-4.

| POST | `/api/projects/deploy` · `/api/projects/redeploy` · `/api/projects/undeploy` · GET/POST `/api/projects/discover` | **DEPRECATED legacy aliases (SPRINT-52, 21.9.2026)** — dual-registered in `internal/deploy/deploy.go` onto the SAME handlers as the canonical `/api/workspaces/{deploy,redeploy,undeploy}` and `/api/servers/discover` rows above: identical bodies, identical responses, zero code duplication. Kept for existing clients only — new code uses the canonical paths. |
| GET | `/api/workspaces/{id}/terminal` (SPRINT-138, feat-workspace-terminal) | **The REAL workspace shell — `docker exec` over WebSocket, NEVER an SSH session onto the host (operator security decision).** Handler `internal/gateway/terminal.go`: gorilla/websocket upgrade (already in go.mod) → ownership gate → Docker SDK (`github.com/docker/docker` v28.5.2, added this sprint; `client.FromEnv` → the backend container's own `/var/run/docker.sock`) → `ContainerExecCreate` + `ContainerExecAttach` with TTY into the workspace container (`jimesh-framework-<wsId>-<runID>`, the naming from `workspaceContainerName`; gVisor/runsc sandboxed — a compromised user stays in the container, no host access, no other workspace). **Auth:** the session middleware ran first — Bearer header, `jimesh_session` cookie OR `?token=` query param (the browser WebSocket API cannot set headers; `bearerToken` already reads the query). **Ownership gate handler-side (fail closed, SPRINT-145 member-aware):** the workspace owner (verified Keycloak sub == `workspaces.owner_user_id`, BOTH id shapes — sub and server-side resolved users.id), a MEMBER (a real `workspace_members` grant row, managed via `/api/workspaces/{id}/members`), or an admin (operator password session / `jimesh-admin` realm role) — `workspaceAccessAllowed` (`terminal.go`), with the pure owner-or-admin `terminalAccessAllowed` as its fast path; an owner-less shared workspace is operator/admin-only unless a member grant names the caller. **Container resolution:** the row's `containerId` first, then a RUNNING `jimesh-framework-<wsId>-*` prefix scan (bookkeeping-lag fallback, newest wins). `/bin/bash` with `/bin/sh` fallback for minimal images. **Protocol:** client→server BINARY frames = raw stdin (keyboard, paste — Ctrl+C reaches the shell); client→server TEXT frames = `{"type":"resize","cols":N,"rows":M}`; server→client BINARY = combined stdio (TTY merges stderr); server→client TEXT = `{"type":"error","message":…}` / `{"type":"exited"}`. Because a pre-upgrade HTTP status is opaque to a browser WS client, the handler upgrades FIRST and delivers every failure as an error frame + close code: **4001** container not running — the exact message is `workspace container not running — deploy first` (with the node named when the row points at a remote node the local daemon does not run), **4003** access denied, **4004** unknown workspace, **1011** server error, **1000** shell exited. A closed terminal only ends the exec session — the workspace container keeps running. Consumed by `WorkspaceTerminal.tsx` (sidebar workspace-row [T], WorkspaceDetailPage "Open Terminal"). |
| GET | `/api/projects/{id}/iac-files` | IaC-file discovery index (Sprint-2 WP4, `iac_discovery.go`): the project's persisted `iac_files` rows straight from PostgreSQL → `{success, files: [{id, projectId, path, type, sha256, gitTracked, sizeBytes, createdAt}]}` (`type`: `dockerfile \| compose \| terraform \| ansible`, classified by filename); honest empty state `files: []` until a scan ran. 405 non-GET, 500 store error. Discovery only — content-level findings come from the deploy IaC gate (checkov, quarantine gate above), not from this route. |
| POST | `/api/projects/{id}/iac-files/scan` | the on-demand IaC scan (`iac_discovery.go`): SSH `find` over the project's `workspacePath` (maxdepth 4, `head -100`: `Dockerfile*`, docker-compose/compose `*.y*ml`, `*.tf`, `*.yml`, `*.yaml`), each hit classified by name and upserted idempotently (deterministic id `iac-<projectId>-<path with / → ->`) → `{success, scanned: <n>, projectId}`; 405 non-POST, 404 unknown project, 502 SSH connect failed / scan failed (real stderr, never swallowed). |
| GET | `/api/projects/{id}/containers/{cid}/logs?tail=100` | **SSE** container log tail (`container_logs.go`): `docker logs --follow --tail <n> <cid>` over the project's SSH connection — `event: log` `data: {"line": "…", "ts": "<RFC3339>"}` per line, terminal `event: end` `data: {}`, `:keepalive` comment every 15s; `tail` defaults to 100. 405 non-GET, 404 unknown project, 502 SSH connect failed. |
| GET | `/api/projects/{id}/dns` | **SPRINT-184 — Project DNS hostname** (`internal/gateway/dns.go`; registered in `gateway.go:456-458` as GET/PUT/DELETE on one handler — the frontend `ProjectDNSCard.tsx:47/71/86` sends GET/PUT/DELETE, so the two match, no method mismatch). Repeats the wire shape `ProjectDNSView` (`ProjectDNSCard.tsx:24`): `{projectId, label, fqdn, target, enabled, persisted, resolved, traefikConfigured}`. **`persisted:false` is the COMPUTED default, not a saved row** — a project without a `project_dns` row gets what the server WOULD use: `label` = first 8 chars of the project id, `target:""`, `enabled:false`, `fqdn` = `label + "." + zone`, `zone` from `JIMESH_DNS_ZONE` with the fallback `jimesh.internal`. With a row: the persisted `label`/`target`/`enabled` and `persisted:true` (`created_at` of the row is never rewritten on update — `ON CONFLICT … DO UPDATE` touches label/target/enabled/updated_at only). `resolved` is a best-effort `net.LookupIP(fqdn)` probe of that name (any resolver failure reports `false`, it is never an error and never faked `true`), `traefikConfigured` says only whether `JIMESH_TRAEFIK_DYNAMIC_FILE` is set. Errors: 400 `project id required` (empty path id), **404 `project not found: <id>`** — the project lookup runs BEFORE the method switch, so a wrong id answers 404 even for a wrong method, 405 `GET, PUT, DELETE only`, 500 on a store error. |
| PUT | `/api/projects/{id}/dns` | upsert the row (same handler): body `{label, target, enabled}` — both strings trimmed; `label` required (400 `label is required`), `target` required (400 `target is required`), malformed JSON → 400 `invalid JSON body: …`; `label` must pass `validDNSLabel` (RFC 1035: 1–63 chars, `[A-Za-z0-9-]` only, no leading/trailing hyphen) → otherwise 400 `label must be alphanumeric with hyphens, no leading/trailing hyphen, max 63 chars`. On success `UpsertProjectDNS` runs `INSERT … ON CONFLICT(project_id) DO UPDATE` and the reply is the SAME GET view with `persisted:true`. 404 unknown project, 405 non-PUT, 500 on a store error. Verified by `internal/gateway/dns_test.go` (`TestProjectDNS_Put_Valid`, `TestProjectDNS_Put_InvalidLabel` — 5 invalid labels each expect 400 and assert that NO row was created). |
| DELETE | `/api/projects/{id}/dns` | `DELETE FROM project_dns WHERE project_id = ?` — a plain delete with no row-count check, so a project that never saved a DNS entry is a **no-op, not an error**, and the reply is the COMPUTED default view (`persisted:false`). 404 unknown project, 405 non-DELETE, 500 on a store error. Verified by `TestProjectDNS_Delete` (row gone afterwards, view back to default) and `TestProjectDNS_Get_NoRow` / `TestProjectDNS_UnknownProject` / `TestProjectDNS_MethodNotAllowed`. |
| POST | `/api/nodes/provision` | node pre-flight & provisioning (`node_provision.go`): body `{nodeHost, nodeUser?, nodePort?, authMethod? ("password"\|"key"\|"prompt"), sshPassword?, sshKey?, installGVisor?, installTailscale?}` — connects over SSH (a local host runs `sh -c` directly; empty nodeUser → `root`, port 0 → 22), prints OS + Docker runtime checks, optionally installs gVisor `runsc` via the official APT repository and/or joins the node to the tailnet (official Tailscale install script + one-time Headscale pre-auth key, `--hostname` derived from the host) → `{success, output}` with the full combined stdout. 400 invalid json, 405 non-POST, 503 headscale not configured, 412 `HEADSCALE_PUBLIC_URL` unset (the internal Docker-URL is unreachable from the node), 502 SSH connection failed, 500 provisioning execution failed. |

### Per-task Workspace Integrity — Git Worktree + HITL Merge Gate (Sprint 20 WP7 / TASK-014)

The agent never works directly in a project's main checkout. Every task gets
a git worktree under `<workspacePath>/.jimesh/tasks/<sessionId>/`, created
from a snapshot branch; the result is merged back ONLY after a human
decision. There is no unattended apply — no timer, no agent, no status check
can trigger a merge. Durable state lives in the project's git (snapshot
branches + stash entries ARE the audit trail); there is no task table, so
nothing drifts across backend restarts.

Node coordinates mirror the deploy endpoints; an empty `nodeHost` means
"operate on the backend host" (`nodePort` default 22). Every refusal echoes
an `ERR:<KIND>:<explanation>` marker and surfaces git's raw output verbatim.

- `POST /api/projects/task/start` — isolate a task in its own worktree
  - Body: `{ workspacePath, sessionId, nodeHost?, nodeUser?, nodePort?, authMethod?, sshPassword?, sshKey? }`
  - `sessionId` must match `[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}` (it becomes a
    path segment and part of a git branch name).
  - Steps: repo check → HEAD resolves → `.jimesh` not staged in the main
    checkout → snapshot branch `jimesh/task-snapshot-<sessionId>` frozen at
    HEAD → double-start guard → register `.jimesh/` in `.git/info/exclude`
    (local-only, untracked) → non-destructive stash capture of tracked
    uncommitted changes (`git stash create` + `store` — the main checkout
    KEEPS its changes) → `git worktree add` at
    `<workspacePath>/.jimesh/tasks/<sessionId>` on branch
    `jimesh/task-<sessionId>` from the snapshot → apply the captured WIP
    INTO the worktree (apply, never pop)
  - Returns: `{ success, sessionId, workspacePath, taskWorktreePath, taskBranch, snapshotBranch, stashSha, wipCarried, trackedChangesCaptured, untrackedFilesNote, next }`
  - 422 `NOT_A_REPO` — non-git project: NO fallback by design (a copy could
    offer neither snapshot nor apply/discard semantics)
  - 422 `NO_COMMITS` — empty repository: a worktree needs a commit to branch from
  - 409 `WORKTREES_INDEXED` — `.jimesh` has index entries in the main checkout;
    committing embedded worktrees would corrupt the repository
  - 409 `TASK_EXISTS` — the task is already started; nothing resets an
    in-flight task (manual merge gate)
- `GET /api/projects/task/status?workspacePath=&sessionId=&nodeHost=&nodeUser=&nodePort=` — live state measured out of git (no mirrored task table)
  - Returns: `{ success, workspacePath, mainBranch, mainCheckoutDetached, tasks: [{ sessionId, worktreePath, branch, head, snapshotBranch, commitsSinceSnapshot, unmergedIntoMain, dirtyCount, dirtyFiles, error }], otherWorktrees }`
  - `commitsSinceSnapshot` / `unmergedIntoMain` / `dirtyCount` are `-1` when
    they could not be measured (never fabricated); `error` carries the git
    reason per task. `unmergedIntoMain` uses patch-equivalence
    (`git cherry`), so an already-merged task reports 0. Without `sessionId`
    all task worktrees are listed; non-task worktrees appear in
    `otherWorktrees`.
- `GET /api/projects/task/git-log?workspacePath=&ref=&limit=&nodeHost=&nodeUser=&nodePort=` — read-only commit history for the git graph
  - Same coordinate contract as `task/status` (query params, no body, same
    SSH credential handling), but a different shape: it needs a ref and a
    limit, is unbounded work on a big repo, and is therefore a separate
    endpoint so the status poll stays cheap.
  - `ref` defaults to `HEAD` and must be a plain ref name (letters, digits,
    `. _ / -`, no leading dash, no `..` range, ≤255 chars) — validated before
    execution so a caller cannot smuggle a git flag or a revision range past
    `shQuote`. 400 otherwise. `limit` defaults to 100, range 1–500.
  - Returns: `{ success, workspacePath, ref, commits: [{ sha, parents,
    author, email, date, subject, refs }], truncated }`
  - `parents` are the graph edges (including for linear history and
    multi-parent merges); `refs` are the `%D` decorations split on commas.
  - `truncated` is MEASURED, not inferred: the executor asks for `limit+1`
    rows and drops the extra one, so a full page is not reported as a cut-off.
  - 422 `NOT_A_REPO` — non-git workspace, same no-fallback rule as `start`.
    The shared Workspace (S3) has no `.git`, so this is the honest state there.
  - 404 `BAD_REF` — the ref name is well-formed but does not resolve to a
    commit in this repository.
  - Injection guards: `workspacePath` and `ref` are both `shQuote`'d, and
    `ref` additionally passes `validGitRef` (closed character set).
- `GET /api/projects/task/tree?workspacePath=&sub=&nodeHost=&nodeUser=&nodePort=` — read-only directory listing for the Code dashboard's filepath picker
  - Same coordinate contract as `task/git-log` (query params, no body, same
    SSH credential handling, same `taskExec` code path — local and remote
    projects share one implementation). One directory level per request; the
    picker navigates the REAL node checkout, no recursion.
  - `sub` is a RELATIVE path under `workspacePath` (empty = the root
    itself), must pass `validTreeSub` (letters, digits, `. _ / -`, no leading
    dash, no `/` prefix/suffix, no `..`, ≤512 chars) — validated before
    execution so nothing smuggles a flag or a parent-walk past `shQuote` and
    the `--` before the path.
  - Returns: `{ success, workspacePath, sub, entries: [{ name, dir }],
    truncated }`
  - `entries` comes from `ls -1Ap` — a trailing `/` is ls' own directory
    marker, stripped and reflected in `dir`; `.` and `..` never surface (a
    walk-up is not a navigable child). `truncated` is MEASURED: more than 500
    entries sets it rather than silently cutting the listing.
  - 422 `NO_SUCH_DIR` — the directory does not exist on the node. This is
    deliberately distinct from an EMPTY listing: "no clone yet" and "empty
    folder" are different states and must not read the same.
  - This endpoint reads CONTENTS-free metadata only (names + dir flags) — it
    is navigation, never a file API.
- `GET /api/projects/task/versions?workspacePath=&nodeHost=&nodeUser=&nodePort=&sessionId=` — the version/release scan (W-CODE-SECTION 3)
  - Same coordinate contract as `task/git-log` / `task/tree`. One call, two
    halves:
    1. Checkout facts via `taskExec`: reads package.json (name+version), pyproject.toml (name+version), Dockerfile FROM lines, compose `image:` lines — each file capped at 64 KiB, existence-guarded (missing = not a source, never an error), parseError on malformed content.
    2. Registry lookups (anonymous public HTTP, 5s timeout per source, parallel): npm via registry.npmjs.org/<pkg>/latest, PyPI via pypi.org/pypi/<pkg>/json, Docker Hub via hub.docker.com/v2/repositories/<ns>/<repo>/tags?ordering=last_updated&page_size=1. Private registry images / digest pins / scoped packages are handled honestly (no lookup, note explaining why). Per-source failures land as that source's `latestError` — one dead registry never blanks the others.
  - Returns: `{ success, workspacePath, scannedFiles[], npm?: {package,version,latest?,latestError?,parseError?}, pypi?: {...}, images:[{file,image,tag,registry?,latestTag?,latestError?,lookupNote?}], imagesTruncated }`
  - NO semver ordering is invented — "identisch" = string equality, "weicht ab" = both present and unequal. A pinned pre-release can exceed the registry's dist-tag latest; claiming "behind" would be a guess.
- `GET /api/projects/task/ci?workspacePath=&nodeHost=&nodeUser=&nodePort=&sessionId=` — the CI/CD scan (W-CODE-SECTION 4)
  - Same coordinate contract. Reads `.github/workflows/*.yml|yaml` off the node via `taskExec` (64 KiB/file cap, 25 files max). Each file parsed as YAML (gopkg.in/yaml.v3) into: triggers (`on`), jobs (id, name, runs-on, needs, if, steps), and steps' `uses`/`run`/`if`/`name`. When a step uses `actions/checkout`, the `with.repository` + optional `with.ref` is extracted as a `usesCheckout` string (`owner/repo@ref` or `owner/repo` for default branch). Missing `.github/workflows` dir = empty workflows array (not error). Per-file YAML parseError is reported on that file — other files proceed.
  - Returns: `{ success, workspacePath, scannedDirs[], workflows:[{file,parseError?,on?,jobs?:[{id,name,runsOn,needs,if,steps:[{name,uses,run,if}]}],usesCheckout?}], workflowsTruncated }`
  - NO external API calls, NO "latest run" data (would require GitHub tokens). The FE can link to the GitHub Actions UI for run history.
- `POST /api/projects/task/apply` — the HITL merge gate
  - Body: `{ workspacePath, sessionId, confirm, node* }`
  - The gate is checked BEFORE any execution: without `confirm: true` the
    request is refused 400 — no SSH dial, no git call, nothing happens.
  - With confirm: `git merge --no-ff --no-edit jimesh/task-<sessionId>` into
    the main checkout's current branch. A conflict is LEFT IN PROGRESS and
    reported 409 `MERGE_CONFLICT` — resolving it is the human's decision, no
    auto-resolution exists. 409 `MERGE_REFUSED` when the merge never started
    (typically local changes would be overwritten). Merging into detached
    HEAD is refused 409.
  - Returns: `{ success, sessionId, workspacePath, targetBranch, taskBranch, mergedHead, gitOutput, next }`
- `POST /api/projects/task/discard` — remove worktree + task branch; the snapshot branch stays as the audit trail
  - Body: `{ workspacePath, sessionId, confirm?, node* }`
  - Safety rail mirrors the apply gate: when discarding would destroy
    measurable work (uncommitted files or unmerged commits), `confirm: true`
    is required and the 409 names exactly what would be lost. Discarding a
    clean task needs no confirm.
  - Returns: `{ success, sessionId, workspacePath, worktreeRemoved, branchDeleted, droppedHead, uncommittedChangesLost, unmergedCommitsLost, snapshotBranch, snapshotPreserved, next }`
  - 404 `NO_TASK` — apply/discard of an unstarted task
- Deploy wiring: `POST /api/workspaces/deploy` (canonical since SPRINT-52; and redeploy) accept
  `taskId` — when set, ALL agent-facing containers (framework, editor,
  code-server) mount the task worktree
  `<workspacePath>/.jimesh/tasks/<taskId>` instead of the main checkout; a
  missing worktree aborts the deploy loudly instead of silently falling back
  to the main checkout. The `jimesh` framework's `git reset --hard
  origin/main` is skipped when taskId is set (it would flatten the task
  branch). The deploy response echoes `taskId` and `taskWorktreePath` and
  adds a security note naming the isolation.

### Execution Sandbox for Generated Code (Sprint 20 WP7 / TASK-014)

Generated code runs in a disposable container that is isolated from the
persistent workspace BY CONSTRUCTION: the snippet is written to a throwaway
directory and ONLY that directory is bind-mounted read-only at `/work`. The
project repository is never visible inside the container.

- `POST /api/exec/sandbox` — run a snippet in the sandbox
  - Body: `{ language, code, image?, timeoutSeconds? }`
  - `language`: `shell`/`bash`/`sh` → `alpine:3.20`, `python`/`python3` →
    `python:3.12-alpine`, `node`/`nodejs`/`javascript`/`js` →
    `node:22-alpine`. Unknown language → 400. `image` optionally overrides
    the preset; it must match `^[a-zA-Z0-9][a-zA-Z0-9._/:@-]{0,127}$` (no
    whitespace, no shell metacharacters). `code` is required and reaches the
    container as a mounted file — never as an argument.
  - Hardcoded (NOT configurable): `--network=none`, `--read-only`,
    `--cap-drop=ALL`, `no-new-privileges`, `--pids-limit 64`,
    `--memory 256m`, `--tmpfs /tmp:rw,size=16m,noexec`, read-only snippet
    mount at `/work`, inner `timeout -s KILL <seconds>` (default 30, cap 120)
    plus an outer Go deadline with a named-container orphan cleanup.
  - Runtime detection per call via `docker info --format '{{json .Runtimes}}'`:
    `runsc` when the host really offers it (`runtimeIsolated: true`), else
    `runc` with `runtimeDegraded: true` and a plain-language
    `degradationReason` (E6: degrading is allowed, silent degradation is not).
  - E6 detected degradation: a host that rejects `no-new-privileges` at
    container start (observed on nested docker daemons) gets ONE retry
    without that flag, loudly reported in `degradationReason` and `mounts`.
    `--network=none` and `--read-only` are never dropped.
  - Returns: `{ success, exitCode, stdout, stderr, stdoutTruncated, stderrTruncated, timedOut, durationMs, image, runtime, runtimeIsolated, runtimeDegraded, degradationReason, availableRuntimes, networkIsolation, readOnlyRootFS, mounts, snippetId }`
  - Each output stream is capped at 256 KiB; truncation is reported honestly
    (`stdoutTruncated` / `stderrTruncated`) and the pipe is kept drained so a
    runaway snippet can never block.
  - Snippet content is NEVER logged (Zero-Trust Secret Mandate) — the log
    line carries metadata only.
  - Mechanics live-verified (the exact `docker run` invocation of this
    route's degraded path, on a runc-only host): `networkIsolation: "none"`
    (DNS resolves nothing), `readOnlyRootFS` + snippet-only mount, exit 0
    with stdout returned. The HTTP route itself was not exercised against a
    running backend in the task worktree — see TASK-014's report for the
    exact operator smoke command.

### Tech Ontology (Static Knowledge Base) (R16)

Deterministic port-to-icon-to-category mapping. 0ms latency, no LLM needed
for known services. 40+ technologies mapped with Iconify icon strings,
categories, default ports, descriptions, and sidecar suggestions.

- `GET /api/ontology` — list all definitions
- `GET /api/ontology?port=5432` — match by port number
  - Returns: `{ baseId, displayName, category, iconString, defaultPorts, description, suggestions }`
  - Suggestions: sidecar apps to auto-attach (e.g., PostgreSQL → Adminer)
- `GET /api/ontology?image=postgres:alpine` — match by Docker image name
- `GET /api/ontology?category=Databases` — list by category

**Categories:** Databases, Infrastructure, Coding Tools, Admin UIs,
Terminals, Monitoring, Web Apps

**Cascading discovery pipeline:**
1. Local ontology check (port + image match) — 0ms, no API call
2. OpenRouter / Artificial Analysis API (for LLM models)
3. Cron-triggered SearXNG + utility model (last fallback, cached X days)

**Sidecar suggestions:**
- PostgreSQL → Adminer, pgAdmin
- MySQL → Adminer, phpMyAdmin
- Redis → Redis Commander
- MongoDB → Mongo Express

**Icon system:** Iconify string IDs (logos:postgresql, logos:redis,
lucide:box) sent from backend → frontend renders via @iconify/react

### Agent Bridge — Self-Provisioning (R18)

Dual-API bridge (REST + MCP compatible). Handlers in
`gateway/agent_bridge.go`, `gateway/dynamic_registry.go`.

**Honest status (verified against the code):** the RBAC/budget check, the
$0.05 cost accounting and the in-memory tool hot-registration are REAL.
The "docker" step is a STUB — no container is spawned; a containerID and
port are only computed from the ontology. The vault step stores a SYNTHETIC
password (`generated_pass_<unixnano>`), not generated credentials. This is
a Mandate-2 violation in the code that still needs fixing — do not rely on
the returned `containerId`/`port` to address a running container.

| Method | Path | Notes |
|---|---|---|
| POST | `/api/bridge/provision` | body `{projectId, userId, serviceType}` (`serviceType`: postgres, redis, mysql, adminer, mongo — anything else → 402 `unknown service type`); pipeline: RBAC budget check (402 `bridge_blocked` on no budget / disabled account / insufficient budget) → stub docker step (ontology lookup only) → vault secret `projects/<projectId>/<serviceType>_password` → hot-register `<serviceType>_query_<suffix>` tool → deduct $0.05. Success: `{containerId, toolName, status: "deployed", costUsd, port}` (port = ontology default) |
| GET | `/api/bridge/stream?runId=X` | SSE — polls the in-memory run every 500 ms: `provision_start` (current steps: rbac/docker/vault/mcp, each pending→running→success/failed) → `provision_update` (repeating) → `provision_complete` when the run leaves the registry. Runs are deleted the moment provisioning returns, so a connect-after-fact yields `provision_complete` with `status: "not_found_or_complete"`; 400 without `runId` |
| GET | `/api/bridge/openapi.json` | static OpenAPI 3.0.3 spec (paths: `/api/bridge/provision` POST incl. serviceType enum, `/api/bridge/stream` GET) for LLM function calling |
| GET | `/api/bridge/tools` | `{tools: [{name, serviceType, containerId, projectId, toolType}], count}` from the in-memory dynamic registry — LOST on gateway restart (nothing persists it) |

**Dynamic Tool Registry**: thread-safe, in-memory hot-reload — new tools are
registered at runtime without gateway restart, but there is no persistence
and no MCP JSON-RPC surface wired to it yet (the "Dual-Protocol REST+MCP"
claim in the original spec is currently REST-only in code).

### Analytics & Monitoring
- `GET /api/analytics/by-client` — requests grouped by client
- `GET /api/analytics/by-key` — requests grouped by API key
- `GET /api/analytics/by-model` — requests grouped by model
- `GET /api/analytics/by-platform` — requests grouped by platform
- `GET /api/analytics/error-distribution` — error code histogram
- `GET /api/analytics/errors` — error requests with details
- `GET /api/analytics/requests` — all logged requests
- `GET /api/analytics/summary` — aggregate stats (total, cost, tokens, latency)
- `GET /api/analytics/timeline` — time-series data
- `GET /api/analytics/by-workspace?range=24h&workspace=` — real request rollup per workspace/app (Sprint 35 WP1c, `analytics_derived.go`): only service-key traffic carries a workspace binding — human consumer-key and admin-gateway traffic is NOT app-attributed; `range` in the dashboard format (`24h`, `48h`, `7d`, `30d`…, default 24h), `workspace` empty = all → `{byWorkspace: [{workspaceId, requests, successRate (0–100), avgLatencyMs, inputTokens, outputTokens, costUSD, errorRate}], count}`
- `GET /api/sse/analytics` — **SSE** realtime routing scores (`analytics/realtime_sse.go`): tails redis stream `jimesh:scores`; `event: scores` `data: {scores: [RoutingScore rows], strategy}` — `strategy` is the active routing profile's REAL name (`active_profile_id` setting, else the first chain — never an invented label); replays the last 1 batch on connect, `: ping` every 30s; 503 when redis streams are disabled
- `GET /api/sse/models` — **SSE** completed-request summaries for the model-requests widget (tails `jimesh:requests`): `event: models` `data: [{id, created_at, platform, model_id, status ok|error, latency_ms, input_tokens, output_tokens}]`; backlog replay 30, `: ping` every 30s; 503 when redis streams are disabled
- `GET /api/sse/traces` — **SSE** the same request stream shaped for the trace table: `event: traces` `data: [{id, created_at, platform, model_id, trace_id, success, latency_ms, input_tokens, output_tokens}]`; backlog replay 30, `: ping` every 30s; 503 when redis streams are disabled

### Artificial Analysis Sync
- `GET /api/aa/metrics` — list synced model benchmarks
- `POST /api/aa/sync` — trigger sync from Artificial Analysis API

### Auth & Sessions
- `POST /api/auth/login` — `{ email, password }` → JWT
- `POST /api/auth/logout` — invalidate session
- `POST /api/auth/change-email` — `{ email }`
- `POST /api/auth/change-password` — `{ old, new }`
- `POST /api/auth/forgot-password` — `{ email }`
- `POST /api/auth/reset-password` — `{ token, password }`
- `POST /api/auth/setup` — initial admin setup
- `GET /api/auth/status` — current session info; TASK-025 adds `source: "keycloak"|"password"` (+ `user {sub, email, displayName}` for OIDC sessions)
- `GET /api/auth/sessions` — active dashboard sessions (self-checked bearer — `/api/auth/*` is exempt from the middleware gate, these handlers verify the token themselves; session ids are sha256 HASHES, never the raw token): `{sessions: [{id, userAgent?, ip?, createdAt, expiresAt (unix ms), current}], count}` — the caller's own session is flagged `current: true` so a UI cannot lock itself out; single-operator instance = every session is the operator's (8.9.2026 session-management pass; tokens stored hashed since then)
- `POST /api/auth/sessions/revoke` — body `{id}` (a session hash as listed above) → `{ok: true, revoked: "<id>"}`; 400 invalid body or when targeting the CURRENT session (use `POST /api/auth/logout` for that), 404 unknown id
- `POST /api/auth/sessions/refresh` — no body; slides the CURRENT session's expiry by the rolling 24h window (`dashboardLoginTTL`) → `{ok: true, expiresAt}` (unix ms); 401 unauthenticated — without this a long-lived operator tab dies at exactly 24h
- `GET /api/users` — provisioned Keycloak users (see Users section)
- `POST /api/users` — create a REAL Keycloak realm user (username/email/password/role), upserts the local row
- `POST /api/users/{id}/enabled` — enable/disable a provisioned user

### Datalake (SPRINT-55 — real now: Kafka → Ozone via cmd/datalaked; Debezium dropped)
- `GET /api/datalake/status` — the orchestrator's real state: `{activePipelines, replicationLagMs, status, lastSyncedAt?, message?}`. `activePipelines` counts the jimesh.* topics with live assigned partitions in datalaked's consumer group; `lastSyncedAt` is the timestamp of the last event that REALLY landed in Ozone (RFC3339, empty when none); `replicationLagMs` is the last write's PUT-time minus the record's Kafka timestamp (-1 = nothing measured yet). `status`: `connected` | `degraded` (pumping but PUTs failed recently) | `starting` (group not joined) | `not_connected` (datalaked not running — `message` carries the real reason) | `error`. 405 non-GET.
- `GET /api/datalake/pipelines` — one row per consumed topic: `{pipelines: [{id, name, sourceType: "kafka", sinkType: "ozone-s3", status: "RUNNING"|"idle"|"degraded", assignedPartitions, eventsSeen, eventsWritten, lastWriteAt?, lastError?}]}`. datalaked down → `{pipelines: [], message}` (honest, never a fabricated list).

Both routes proxy `GET http://jimesh-datalaked:7620/status` (overridable via setting `datalake_status_url`, 3s timeout). The orchestrator itself is `cmd/datalaked`, deployed via `deploy/datalake/docker-compose.yml` (build-from-source, no manual image pulls); its Ozone target is `deploy/ozone/`.

`cmd/datalaked` also carries its own two-route HTTP surface on `:7620` (registered in `cmd/datalaked/main.go:281-282`) — these are **datalaked's** routes, not gateway routes, and nothing outside the container network reaches them:
- `GET /status` — the JSON stats document the two gateway routes above proxy through.
- `GET /healthz` — plain liveness probe used by the compose healthcheck.

### DB-Discovery (Sprint 26 — the real, honest data-source inventory for /dbs/discovery Lane E)
- `GET /api/dbs/discovery` — one live snapshot of every recognized DATA SOURCE, all real queries, no pretending (Mandate 2): `{generatedAt: RFC3339, postgres, redis, datalake}`. Same session-auth as `/api/datalake/*`; 405 non-GET; never a 5xx for source outages — each half answers honestly instead.
  - `postgres`: `{reachable, database, host, version, walLevel, slots: [{name, plugin, active, confirmedFlushLSN?, restartLSN?, lagBytes, stale}], publication: {name, allTables, tables: []} | null, tables: [{schema, name, sizeBytes, rowEstimate, cdcCovered, topic, pipeline: {assignedPartitions, eventsSeen, eventsWritten, lastWriteAt?} | null}], error}`. Real `SHOW wal_level`, all rows of `pg_replication_slots`, the configured publication (`KAFKA_CDC_PUBLICATION`, default `jimesh_cdc_pub` — null when absent), and the 100 biggest user tables by `pg_total_relation_size` (`rowEstimate` = `reltuples::bigint` passed through honestly, `-1` = never estimated). `topic` = `KAFKA_TOPIC_PREFIX` (default `jimesh.`) + `cdc.<schema>.<table>` — the exact contract `cmd/kafkabridge` produces. Unreachable → `reachable: false`, the other fields null/empty and `error` carries the REAL failure text. Slot rows are ADDITIVE since the slot-hygiene work: `lagBytes` = the real measurement `pg_wal_lsn_diff(pg_current_wal_lsn(), COALESCE(confirmed_flush_lsn, restart_lsn))::bigint` — for an `active` slot the real consumer lag, for an inactive slot the RETAINED bytes (they accumulate until the slot is dropped or re-confirmed — the classic Debezium trap made visible; `0` = the slot tracks the current WAL tip, and a slot with no LSN position yet measures honestly as `0`); `stale` = the pure backend classification `dbsSlotStale(active, lagBytes, threshold)` = `!active && lagBytes > threshold`, threshold = `JIMESH_SLOT_STALE_BYTES` env override, documented default `67108864` (64 MiB) — the constant, not a config-DB setting (an unparsable override silently falls back to the documented default, never to 0). Postgres stores neither a confirmed-at timestamp nor an "inactive since" — no such field is invented here; `active` stays the only activity signal. Operational runbook for a `stale:true` slot: `deploy/datalake/README.md` → "Replication-Slot-Hygiene".
  - `redis`: `{reachable, endpoint, streams: [{key, length, topic, groups: [{name, pending, consumers}], pipeline: {…} | null}], error}`. Real `SCAN MATCH jimesh:*` + `TYPE`/`XLEN`/`XINFO GROUPS` against the gateway's own `streams.Hub` client; `endpoint` is `redis://<host>[:<port>]` without credentials. A redis-less process (`REDIS_ENABLED=false`) reports `reachable: false` with that reason, never a crash.
  - `datalake`: `{reachable, status, activePipelines, eventsWritten, replicationLagMs, message}` — the SAME `datalake_status_url` setting and 3s timeout `/api/datalake/status` uses. Unreachable datalaked ⇒ `reachable: false, status: "unreachable", message: <real error>` and every `pipeline` above stays `null` — this does NOT fail the route as a whole (still HTTP 200 with honest nulls); when reachable, real counters are merged per topic into the matching table/stream `pipeline` rows.

### Backups
- `GET /api/backups` — list backups
- `POST /api/backups` — create backup
- `GET /api/backups/{id}` — backup details
- `POST /api/backups/{id}/restore` — restore from backup
- `GET /api/backups/{id}/download` — download backup file
- `GET /api/backups/schedule` — backup schedule
- `GET /api/backups/tables` — available tables

### Client Profiles
- `GET /api/client-profiles` — list
- `POST /api/client-profiles` — create
- `GET /api/client-profiles/{id}` — get one
- `POST /api/client-profiles/{id}/rotate` — rotate secret

### Compression
- `GET /api/compression/stats` — compression stats
- `POST /api/compression/preview` — preview compression

### Cost & Savings
- `GET /api/cost/daily` — daily cost breakdown
- `GET /api/cost/monthly` — monthly cost breakdown
- `GET /api/cost/providers` — cost by provider
- `GET /api/cost/savings` — estimated savings
- `GET /api/cost/top` — top costs

### Agent Types
- `GET /api/agent-types` — list available agent types
- `POST /api/agents/logs` — agent execution log ingest (POST-only, see section 6)
- `GET /api/agents/analytics/summary` — per-session/per-agent aggregate incl. free/paid split (section 6 table)

### Free Tier
- `GET /api/free-tier` — free tier status

### Keys
- `GET /api/keys/endpoints` — key endpoints
- `GET /api/keys/providers` — providers
- `DELETE /api/keys/{id}/cooldowns` — clear one key's cooldown (section 3)
- `POST /api/keys/bulk-delete` — bulk delete
- `POST /api/keys/bulk-toggle` — bulk toggle
- `POST /api/keys/custom` — save a custom OpenAI-compatible provider (NOT a GET; section 3 table)
- `POST /api/keys/custom/discover-models` — discover models
- `POST /api/keys/custom/probe` — probe key

### Media
- `GET /api/media` — list image-capable (vision) models from the models table; modalities the schema cannot express answer honest empty lists
- `GET /api/media/usage?modality=` — real request counts per media model from `request_log`
- `PUT /api/media/{id}` — `{"enabled"}` toggle for one model (stable numeric id from platform+modelId)
- `DELETE /api/media/custom/{id}` — honest **501**: custom media models are not stored by the Go backend (no create route exists either — section 3 table)

<!-- #150 no-mock appendix fix: "POST /api/media — upload", "GET /api/media/{id} — get media"
     and "DELETE /api/media/{id} — delete" were documented routes that never
     existed in settingshandlers.go — the appendix now mirrors the real
     registrations only. -->

### Embeddings (TASK-031)
- `GET /api/embeddings` — list embedding models (real + custom)
- `GET /api/embeddings/usage` — real per-model request_log rollup (`request_type='embedding'`)
- `GET /api/embeddings/custom` — list custom embedding providers
- `POST /api/embeddings/custom` — create a custom embedding provider
- `GET /api/embeddings/custom/{id}` — fetch one
- `PUT /api/embeddings/custom/{id}` — update one
- `DELETE /api/embeddings/custom/{id}` — delete one (real, not a 501)

### Premium
- `GET /api/premium` — premium status
- `POST /api/premium/sync` — runs the MODEL-catalog sync (`/api/discovery/sync` above): 500 + real reason when the catalog source is unreachable/non-200/undecodable; on success `{success, modelsAdded, modelsUpdated, modelsRemoved, newPlatforms}` and the last-synced stamp is only written then (S181-9 — it used to be written on a sync that fetched nothing)
- `POST/DELETE /api/premium/key` — the license key setting (`premium_license_key`, gateway.go): POST body `{key}` persists it → `{ok: true, hasKey: true}`; DELETE clears it → `{ok: true, hasKey: false}`; 400 when the body is not a non-empty `{key}`, 405 otherwise
- `POST /api/premium/portal` — the commercial portal URL from the `premium_portal_url` setting → `{url}`; honest 501 "no premium portal configured on this instance — set the premium_portal_url setting if you operate one" when unset — no invented URL (gateway.go handlePremiumPortal)

### Platform Keys
- `GET /api/platform-keys/{platform}` — platform keys

### Profiles
- `GET /api/profiles` — list profiles
- `GET /api/profiles/active` — active profile
- `GET /api/profiles/{id}` — get profile

### Settings
- `GET /api/settings/{key}` — get setting
- `GET/POST /api/settings/dlp_enabled` — the outbound-DLP live toggle (`settings_dlp.go`, Backend-Audit F-04): GET → `{enabled}` naming the LIVE hook state `dlpScan()` acts on next (not a parse of the stored row); POST/PUT body `{"enabled": true|false}` (unknown fields or missing flag → 400) persists the `dlp_enabled` settings-KV row FIRST, then flips the in-memory hook (`subagents.SetDLPEnabled`) → `{success: true, enabled}`; the persisted value is restored at startup (Persistence Mandate). POST/PUT admin-gated via the `/api/settings` OPA prefix, GET session-readable
- `POST /api/settings/api-key/regenerate` — regenerate API key
- `POST /api/settings/proxy/test` — test proxy
- `GET /api/settings/url-tokens` — URL tokens
- `POST /api/settings/url-tokens` — create URL token
- `DELETE /api/settings/url-tokens/{id}` — delete URL token

### Sessions
- `GET /api/sessions` — list sessions
- `POST /api/sessions/query` — query sessions

### Health
- `GET /health` — liveness
- `GET /ready` — readiness
- `GET /api/health/check` — check all
- `GET /api/health/check/{id}` — check one
- `GET /api/health/providers` — provider health
- `GET /api/health/uptime/{platform}` — uptime
- `POST /api/health/monitor/start` — start monitor
- `POST /api/health/monitor/stop` — stop monitor

### Update
- `GET /api/update/check` — check for updates
- `GET /api/update/release` — latest release
- `GET /api/update/status` — update status

### IANA Port Registry
- `GET /api/iana` — count of mapped ports
- `GET /api/iana?port=5432&proto=tcp` — resolve port to service

### Model Deduplication
- `GET /api/dedup?a=X&b=Y` — compare two model IDs
- `POST /api/dedup` — `{ query, known[] }` → find best match

### Agent Bridge
- `POST /api/bridge/provision` — self-provision infrastructure
- `GET /api/bridge/stream?runId=X` — SSE progress
- `GET /api/bridge/openapi.json` — OpenAPI spec
- `GET /api/bridge/tools` — dynamic tools

### Plugins — catalog & installations (gateway/plugins.go, TASK-103; REAL persistence since SPRINT-140)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/plugins` | the compiled-in plugin catalog → `{plugins: [{id, name, description, wrapperApiBase, authModes, configSchema, installable, createdAt}]}` — today exactly `jules`, `linear`, `github_app`, `meshsquad` (code constants, no DB behind it); 405 non-GET. **`installable` (SPRINT-140)** is the honest availability signal: it is derived from `pluginBackendRoutes` (gateway/plugins.go), the per-plugin backend routes that REALLY exist in `New()` — `jules` → true (the four `/api/plugins/jules/*` routes); `meshsquad` → **true since SPRINT-163** (the three lifecycle routes in gateway/meshsquad.go: status / health / uninstall — see the MeshSquad section below); `linear` / `github_app` → false (the gateway serves NO integration routes for them — an install could not do anything real). The meshsquad entry (RM25; renamed from `jimesh-crew` on 2026-09-27, plan in the crew repo `docs/planning/MESHSQUAD_INTEGRATION_PLAN.md`): wrapperApiBase `http://localhost:8104` = crew-api of the separately deployed meshsquad stack (informational default — the operator configures the real base as `config.crewApiUrl` at install); `plugin.yaml` manifest v1 (docs/plugins/SPEC.md) lives in the meshsquad repo root — the backend still has NO manifest ingestion (open, docs/sprints/SPRINT-RM25-CREW-PLUGIN-MANIFEST.md), the catalog entry stays hand-written |
| GET | `/api/plugin-installations` | the REAL persisted installations (PostgreSQL table `plugin_installations`, store/plugin_installations.go) → `{installations: [PluginInstallation…], count}`, newest update first. Honest `[]` when nothing is installed. Rows survive restarts (persistence mandate) |
| POST | `/api/plugin-installations` | **REAL persistence since SPRINT-140** (before: a no-persistence echo — the root cause of the operator's "keine integrations installieren" complaint). Body: `{pluginId, scopeType "workspace"\|"project", scopeId, authMode, config, githubAppInstallationId?}` → validates honestly and UPSERTS one row per (pluginId, scopeType, scopeId): 404 unknown pluginId; **409 plugin with `installable=false`** (no backend integration — no dead rows); 400 scopeType outside {workspace, project}; 400 authMode not in the plugin's catalog authModes; 400 missing scopeId / config that is not a JSON object; **400 (SPRINT-163) meshsquad `config.crewApiUrl` set but not a valid http(s) URL** (the chat-space client and the health probe call it — empty/unset stays allowed, the catalog wrapperApiBase covers it); 404 scope row does not exist (workspaces/projects registry check — no orphan installations). `activated` is forced true (POST = install/activate). **Mandate 9:** secret-shaped config values (keys matching key/token/secret/password — the same heuristic the UI masks with) are moved into `vault_secrets` (AES-GCM-256, project-scoped: a workspace's project or the project itself) BEFORE the row is written; the stored/served config has them stripped and `secretRef` carries the vault names as a JSON map `{configKey: vaultName}` (audit-logged via vault_audit_log). Success → `{installation: <stored row>, success: true}` — the response is the row that is actually stored, with real server timestamps |

### Plugins — Jules integration (gateway/jules.go, TASK-103/104; installed-key fallback since SPRINT-140)

All four routes proxy the REAL Google Jules API
(`https://jules.googleapis.com/v1alpha`) — no mock data, honest empty
states. The API key is resolved server-side in three tiers (SPRINT-140):
1. `JULES_API_KEY` env, 2. `X-Goog-Api-Key` request header, 3. the
**vaulted secret of the newest activated jules plugin installation**
(`secretRef` of the last POSTed install — the wizard's API key, stored
encrypted by POST /api/plugin-installations). Tier 3 is what makes
"installed" mean something: after installing jules with a key, sources and
sessions work without any env configuration. The gateway reads the secret
itself (JIT injection into the upstream call, Mandate 9 — the value never
crosses into a response body). Without a key the GETs answer an honest
empty state (`{sources: [], notice: "No Jules API key configured. Set JULES_API_KEY, send X-Goog-Api-Key, or install the Jules plugin with an API key (Integrations page — the key is stored encrypted in the Vault and picked up automatically)."}`
/ `{sessions: [], notice: "…"}`) instead of pretending; upstream HTTP status
passes through (502 when the dial to Jules fails).

| Method | Path | Notes |
|---|---|---|
| GET | `/api/plugins/jules/sources` | connected repository sources — JSON passthrough of upstream `/sources`; consumed by the MCP tool `list_jules_sources` (cmd/jimesh-mcp) |
| GET/POST | `/api/plugins/jules/sessions` | GET lists sessions; POST `{sourceId, prompt}` creates one (upstream status code passthrough) |
| GET | `/api/plugins/jules/activities?sessionId=` | one session's activity log (`activities: [{id, sessionId, type, summary, timestamp}]`; 400 without `sessionId`) |
| GET | `/api/plugins/jules/events?sessionId=` | **SSE**: polls the activities endpoint every 4s and emits only UNSEEN activities (`data: {sessionId, type: "activity", message, timestamp}`) + `: keepalive` — Jules has no native push; an empty poll keepalives, never fabricates events |

### Plugins — MeshSquad lifecycle (gateway/meshsquad.go, SPRINT-163; RM25 / S153-7)

The meshsquad plugin's jimesh-side LIFECYCLE. The meshsquad stack itself is
SEPARATELY deployed (crew API + tinode/Redis bus); the chat-space data calls
stay DIRECT browser calls from the dashboard to the configured crew API
(SPRINT-153 decision — these routes are deliberately NOT a chat proxy,
Mandate 14.5). The catalog reports meshsquad `installable=true` because
`pluginBackendRoutes` mirrors these three registrations (gateway.go New()).
Install happens through the GENERIC `POST /api/plugin-installations` with
`config` `{"crewApiUrl": "http://…"}` (crewApiUrl is not secret-shaped
and persists in the row config like jules' mcpUrl; credentials would take
the vault secretRef path — service_account means the stack authenticates
itself, so the wizard sends no credential).

| Method | Path | Notes |
|---|---|---|
| GET | `/api/plugins/meshsquad/status` | the REAL persisted meshsquad installations → `{pluginId: "meshsquad", installations: [PluginInstallation…], count}` (same row shape as GET /api/plugin-installations). Optional narrowing `?scopeType=workspace&scopeId=…` — both or neither (400 half pair); scopeType outside {workspace, project} → 400. Honest `[]` + `count: 0` when none exist. 405 non-GET |
| GET | `/api/plugins/meshsquad/health` | a REAL liveness probe (Mandate 2: it actually dials and reports failures) of the crew API base the NEWEST activated meshsquad installation configured (`config.crewApiUrl`; none → honest `{configured: false, reachable: false, notice}` — never an invented default host). Probes `{crewApiUrl}/health` (manifest plugin.yaml healthCheck.path) with a 5s timeout (manifest timeout) and returns the MEASURED result `{configured, crewApiUrl, probe: {checkedUrl, reachable, healthy, statusCode, durationMs, error?}, reachable, healthy}` — reachable = an HTTP response came back, healthy = 2xx (meshsquad's compose healthcheck runs `curl -f`, same semantics); network errors are reported verbatim, never faked green. 405 non-GET |
| DELETE | `/api/plugins/meshsquad/installations/{id}` | uninstall one meshsquad installation: the row plus the vault secrets its install created (secretRef names, deleted with the owning scope's project, audit-logged). S154-style protections: 405 non-DELETE; 400 missing id; 404 unknown id (re-uninstall is an honest 404); CLOSED SET — a row of another plugin (e.g. jules) is refused with 404 + reason and NEVER deleted; an already-vanished scope row leaves the vault secrets in place with an honest `notice` instead of a fake clean removal. Deliberately NO "in use" refusal: no persisted deployment reference to a meshsquad installation exists today (grep internal/deploy: 0 hits) — an invented 409 would be theater, not protection. Success → `{success: true, installation: <deleted row>, vaultSecretsDeleted: n, notice?}` |

Operator smoke test (once the local stack is up): install via
`POST /api/plugin-installations` with `{"pluginId": "meshsquad", "scopeType": "workspace", "scopeId": <ws>, "authMode": "service_account", "config": "{\"crewApiUrl\": \"http://127.0.0.1:8113\"}"}`,
then `GET /api/plugins/meshsquad/status` lists the row,
`GET /api/plugins/meshsquad/health` probes the real crew API, and
`DELETE /api/plugins/meshsquad/installations/<id>` removes it again.

## Dashboards & Dashboard-Presets (SPRINT-151 / SPRINT-149 — gateway/dashboards.go)

Per-user dashboards for the sidebar's Dashboards section. **Auth:** normal
session; handler-side OWNER scoping (`dashboardOwnerID` — the password
operator resolves to the literal `"operator"`, a Keycloak sub to the
canonical `users.id`, falling back to the raw sub). There is no cross-owner
read and no admin override: a dashboard is personal UI state. Identity that
resolves to nothing → 403 (never a guessed owner).

| Method | Path | Body / params | Response / errors |
|---|---|---|---|
| GET | `/api/dashboards` | — | `{success, dashboards: [{id, ownerUserId, name, cardIds[], isDefault, presetKey?, createdAt, updatedAt}], count}` — only the caller's rows; honest `[]`/`0` |
| POST | `/api/dashboards` | `{name, cardIds[]?, presetKey?, isDefault?}` | `{success, dashboard, created: true}` — a create with `presetKey` but no `cardIds` resolves the preset's cards server-side (system preset or the caller's custom one; unknown key → 400 `unknown preset "…"`); empty `name` → 400 |
| GET | `/api/dashboards/{id}` | — | `{success, dashboard}` — another owner's id → 404 (no existence leak) |
| PUT | `/api/dashboards/{id}` | `{name?, cardIds?}` | `{success, dashboard}` — the builder UI's save path; 404 unknown/foreign id |
| DELETE | `/api/dashboards/{id}` | — | `{success, deleted: true, id}` — the default dashboard IS deletable (SPRINT-149 §4.4 #1); 404 unknown/foreign id |
| POST | `/api/dashboards/{id}/apply-preset` | `{presetKey}` | `{success, dashboard}` — overwrites an EXISTING dashboard's `cardIds` from a system or custom preset; missing/unknown `presetKey` → 400; 404 unknown/foreign id |
| GET | `/api/dashboard-presets` | — | `{success, presets: [{id?, key, name, cardIds, isCustom}], count}` — system presets (code, `isCustom:false`, no `id`) and the caller's custom rows side by side, one shape |
| POST | `/api/dashboard-presets` | `{name, cardIds[]}` | `{success, preset}` — saves a custom preset; empty `name` → 400; duplicate name → 400 with the store's reason |
| DELETE | `/api/dashboard-presets/{id}` | — | `{success, deleted: true, id}` — custom rows only: system presets carry no `id` on the wire, so they can never reach this route; 404 unknown/foreign id |

405 on method combinations not listed above. The same store functions back
the consumer-key SDK twin at `/api/sdk/dashboards` (internal/sdkdashboards)
— one table, two entrances, no second business-logic copy.

## Security & notification surfaces (SPRINT-147 / SPRINT-152)

Read-only, SSH/DB-backed surfaces behind the sidebar's Security and
Email sections. Credential cascade for the SSH probes is exactly
`/api/suricata/status`'s (query params → global `ssh_*` settings → first
`ssh_endpoints` registry entry).

| Method | Path | Body / params | Response / errors |
|---|---|---|---|
| GET | `/api/security/threat-correlation` | `windowSeconds` (60–3600, default 600), `limit` (1–500, default 100), `range` (default `1h`, `store.SDKLogRange` vocabulary) | `{checkedAt, windowSeconds, falcoAvailable, falcoError?, falcoEventCount, threatResponderAvailable, threatResponderError?, threatResponderMode?, detectionCount, events[], correlated[], noteKey}` — ALWAYS 200: Falco comes from durable `/api/sdk/logs` rows (type=audit, agent=falco), the responder side runs the same SSH probe as `/api/threat-responder/status`, so the two never disagree by construction; a dead source rides along as `*Error`, never as a fabricated "all clear". `events`/`correlated` are `[]`, never null; `noteKey` is a closed enum the frontend i18n's (SPRINT-168). 400 bad params, 405 non-GET |
| GET | `/api/threat-responder/status` | `limit` (1–50, default 10: recent detections), `logTail` (100–5000, default 2000: docker-log lines to tail), plus the SSH credential cascade | `{host, targetSource, sshUser, sshPort, checkedAt, containerFound, containerStatus?, startedAt?, mode?, modeSource?, heartbeat?, recentDetections[], logLinesScanned, parseErrors}` — every heartbeat counter mirrors the daemon's own log line verbatim; `mode:""`/`modeSource:""` when neither heartbeat nor startup banner has been seen yet (never a guessed default); detections mirror `cmd/threat-responder`'s JSON tag-for-tag. 400 no SSH target/bad params, 405 non-GET, 502 SSH dial/probe failure (real error rides along) |
| GET | `/api/notifications/email/status` | — | SMTPStatus `{configured, host?, port?, from?, to?}` — ALWAYS 200; `{"configured": false}` honestly when `SMTP_*` is unset (nil channel), never a fabricated `configured:true`; no credential is ever echoed; 405 non-GET |

### Mail accounts — IMAP / POP3 / SMTP (Punkt 5 — gateway/mail.go, internal/mail, store/mail_accounts.go)

Writable counterpart to the read-only status row above: saved accounts whose
endpoints JiMesh can **discover the Thunderbird way** (AutoConfig file →
provider table → MX lookup, in that order) and then **measure** with a real
IMAP/POP3/SMTP handshake.

**Gate:** every route is `isAdminRequest` handler-side (403 otherwise) — these
handlers hold credentials and open outbound connections to hostnames the caller
typed. **Auth:** same session chain as the rest of `/api/*`.

| Method | Path | Body / params | Response / errors |
|---|---|---|---|
| POST | `/api/mail/autodiscover` | `{email}` | `{discovery, ok}` — `discovery` is `{source, sourceUrl, warnings[], imap?, pop3?, smtp?}` (a `mail.Server` is `{host, port, socket, username}`); `ok` is `discovery.Ok()`, i.e. at least one endpoint was found. `400` only when the address does not parse; every network outcome rides along as `warnings[]` + `ok:false`, never as a fabricated server. Timeout 20 s. |
| GET | `/api/mail/accounts` | — | `{accounts[]}` — `store.MailAccountRow` **without any password field**, only `hasPassword bool`. 405 non-GET |
| POST | `/api/mail/accounts` | `mailAccountRequest` `{email, displayName?, username?, password?, enabled?, imapHost/Port/Socket, pop3Host/Port/Socket, smtpHost/Port/Socket}` | `{account}` 201; password is AES-GCM-encrypted at rest. `400` bad body / bad email / bad port |
| GET | `/api/mail/accounts/{id}` | — | `{account}`; `404` unknown |
| PUT | `/api/mail/accounts/{id}` | same body, **`password` omitted or `""` = keep the stored one** | `{account}`; `404` unknown |
| DELETE | `/api/mail/accounts/{id}` | — | `{deleted:true}`; `404` unknown |
| POST | `/api/mail/accounts/{id}/probe` | — | `{results[]}` — one `mail.ProbeResult` per configured endpoint: `{protocol, addr, ok, code?, detail, tls, tlsVersion?, cipher?, latencyMs, authenticated, capabilities?[], mailboxes?[], messages?}`. `code` is a closed enum (`unreachable\|tls\|starttls\|auth\|protocol\|invalid`) because the operator's next action differs per failure. Timeout 25 s |
| POST | `/api/mail/accounts/{id}/send-test` | `{to, subject, text}` | `{sent:true, to[]}` or **502** `{sent:false, code, message}` — a delivery failure is reported, not swallowed |
| POST | `/api/mail/probe` | `{protocol, host, port, socket, username, password}` | `{result}` — the same probe for an endpoint that is NOT saved yet; `400` when `code=invalid` |
| POST | `/api/notifications/email/test` | — | `{sent:true, channels[]}` through the env `SMTP_*` channel, or `400` "SMTP is not configured" / `502` `{sent:false, message}` — never a 200 with a lie |

**Outbound safety:** every socket used for discovery and probing is dialed
through `mail.dialPublic`, which refuses private/loopback/link-local/multicast
addresses and the CGNAT + documentation ranges, pins DNS (the check and the dial
resolve the same IPs, against rebinding) and applies a 10 s/URL, 5-redirect,
256 KiB budget. Port **465 uses implicit TLS** (the first byte is TLS) while
587 stays on STARTTLS — see `internal/notify/smtp.go`.

---

## SDK Surface — jimesh-logger (Sprint 36 WP1, TASK-032)

Service-key-authenticated surface for workspaces/apps. **Auth:** all
`/api/sdk/*` routes accept ONLY `Authorization: Bearer jimesh-ck-…`
consumer keys with `kind='service'` (mint via `POST /api/consumer-keys`
with `{"kind":"service","workspaceId":…}`). Dashboard session tokens and
user keys are rejected at the auth middleware (`internal/auth/auth.go`,
`/api/sdk/` branch). Workspace attribution is derived SERVER-side from
the key — body values are never trusted.

### POST /api/sdk/logs
Ingest one log row. Body:
```json
{"type":"audit|agent|app","level":"INFO|WARN|ERROR|DEBUG","alias":"postgres-prod","message":"…","payload":{…},"session_id":"…","agent":"dsh"}
```
- `type` defaults `app`, `level` defaults `INFO`, `message` required.
- `session_id`: empty → the key's canonical (mint-time) session; non-empty
  → accepted only if that session belongs to the key's workspace.
- 204 on success. 401 missing/invalid key, 403 user-kind key or foreign
  session, 400 malformed body, 429 rate limit.
- **Backend-internal audit writer (TASK-059):** besides this ingest path,
  the deploy pipeline's IaC quarantine gate writes rows DIRECTLY through
  the store (same table, same row shape) with `type="audit"`,
  `alias="checkov"` — scan verdicts, quarantine alerts, releases. Their
  attribution comes from the deploy context the backend just created
  (session/workspace/project), which the backend knows first-hand — a
  different writer than the service-key path, not a client claim wearing
  a key. Query them like any row: `GET /api/sdk/logs?type=audit` (rows
  carry `alias=checkov`, `agent=iac-gate`).
- **Session injection (TASK-076):** a successfully persisted row with
  `type="audit"`, `level="ERROR"` (the SPRINT-32 critical mapping) and
  `alias` `wazuh`|`falco`|`checkov` whose workspace attribution resolves
  (service key for the ingest path, deploy context for the gate writer)
  is pushed — on top of the store write, in its own goroutine, never
  blocking the ingest — as a structured `security-critical` system
  message onto the SSE stream of every ACTIVE subagent session of that
  workspace (see `GET /api/subagents/{id}/events`). Rows without a
  workspace or non-SIEM aliases only persist, they do not inject.

### GET /api/sdk/logs
Query with filters (Operator directive: queryable from day one):
`?type=&level=&workspace=&session=&agent=&alias=&limit=&before=`
- `workspace` filter is allowed but the response always carries the
  caller's own workspace context (service keys see their workspace's
  rows; admin dashboard sessions see all).
- Response: `{"logs":[…],"count":N}` (newest first, default limit 100).
- Consumed by the frontend Security Overview panel (`/security/overview`,
  TASK-064) — aggregated with `GET /api/security/events` into one
  severity-filterable feed; also the source of the top-nav critical-
  findings bell (`SecurityNotificationsBell`, polled every 20s) and the
  pre-existing SDK & Audit Logs page (`/sdk-logs`, TASK-051).

> **Bewusste Doppel-Registrierung — Gateway vs. Edge-Router (kein Bug, nichts zu loeschen):**
> derselbe Pfad `POST /api/sdk/logs` laeuft ZUSAETZLICH auf dem Edge-Router
> (`cmd/jimesh-router`, fixer Loopback-Listener `127.0.0.1:3100`, First-Byte-Demux —
> `cmd/jimesh-router/ingest_http.go:53`). Der Edge-Ingest ist die Router-EIGENE
> Flaeche: **POST-only** (GET-Queries bleiben zentral — lokale Reads sind keine
> v1-Flaeche), der Service-Key wird LOKAL gegen die per Config-Pull gelieferten
> SHA-256-Hashes validiert (vor dem ersten Pull: ehrliches 401, kein
> still-accept-all), und jedes akzeptierte Record wird VOR der
> `202 {ok, accepted, unforwarded_bytes, delivery: "at-least-once"}` lokal
> journalled (`--ingest-dir`) und asynchron an DIESEN zentralen Ingest
> weitergeleitet — der Router-Key traegt die Attribution, die Zentrale leitet
> workspace/project server-seitig aus ihm ab. Flags, Journal, Dead-Letters und
> CDC-Forward sind die Router-eigene Doku: `cmd/jimesh-router/README.md`.

### `ANY /ws/{workspaceId}/app/{port}/{rest…}` — identity-based workspace proxy (TASK-079, router node)

**Not a gateway route.** Served by `cmd/jimesh-router` on its fixed loopback
listener `127.0.0.1:3100`, mounted in the same mux as the edge ingest
(`ingest_http.go:58`). Path-based on purpose: the platform's other workspace
URL (`/api/projects/{id}/tunnel/{port}`) is path-based too, and a subdomain
model (`{port}-{wsId}.domain`) would need wildcard DNS plus per-host TLS on a
loopback listener.

Fail-closed gate, **in this order** — nothing is proxied before every step
passed (`wsproxy.go`):

| # | Check | Answer when it fails |
|---|---|---|
| 1 | parse `/ws/{wsId}/app/{port}/{rest…}` | 400 malformed shape |
| 2 | identity service configured? | 503 — an unconfigured router is a service state, not the client's fault (honest why) |
| 3 | verify the Keycloak JWT (RS256 + JWKS) | 401 |
| 4 | routing-table lookup | 404 unknown workspace **on this node** |
| 5 | workspace `status='deployed'` | 503 — stopped/quarantined is not reachable (no side door around TASK-059's quarantine) |
| 6 | OWNERSHIP: verified `sub` == the route's `ownerSub` | 403 — user A's token never reaches user B's workspace |
| 7 | proxy to `http://backendIp:port` | — (the reverse proxy strips the `/ws/…` prefix, sets `Host` and rewrites the `X-JiMesh-*` identity headers **from the router's own verification**; client-supplied copies are stripped, never trusted — same ingress-derived-only contract as the gateway middleware) |

WebSocket and SSE traffic ride along (`httputil.ReverseProxy` passes
`Upgrade: websocket` through) — that is why live shells/panels work on this
path. Routing rows come from `GET /api/router/config` (`workspaces:
[{workspaceId, projectId, ownerSub, backendIp, status}]`). Without routing
table + identity verifier the route answers an honest
`503 workspace proxy not wired on this router` instead of proxying
(`ingest_http.go:60`).

### POST /api/sdk/sessions
Mint a session row bound to the key's workspace (reuses
`store.CreateSession`, `container_id` = workspace id). Body:
`{"project_id":"proj-…"}` (optional when the key already carries one).
Response: `{"session_id":"sess-…"}`.

### POST /api/sdk/dashboards/{id}/apply-preset

The consumer-key twin of `POST /api/dashboards/{id}/apply-preset` (same
`store.ApplyDashboardPreset` call — one table, two entrances, no second
business-logic copy). Auth is the `/api/sdk/dashboards*` family's:
consumer key (`kind='service'` OR `kind='user'`), owner = the key's minting
user (`sdkdashboards.ownerID`).

- Body: `{"presetKey": "default"}` — required, trimmed.
- Response: **the dashboard row itself** (`{id, ownerUserId, name, cardIds[],
  isDefault, presetKey, createdAt, updatedAt}`). Unlike the session route it
  is NOT wrapped in `{success, dashboard}` — the SDK decodes the row directly.
- 403 no consumer key in context, or the key has no minting user (`this
  consumer key has no minting user — … has no honest owner scope`).
- 400 missing dashboard id, invalid JSON body (1 MiB cap), empty `presetKey`,
  `unknown preset "…"`.
- 404 unknown or foreign dashboard id (the store's reason rides along).

### GET /api/sdk/secrets (Sprint 39, TASK-065 — jimesh.secrets.get())
The ONE `/api/sdk/*` route that ALSO accepts a `kind='user'` consumer key
(the operator's own personal key, per the operator's explicit ask
"service account or my own API key") in addition to `kind='service'` —
both still require a real `projectId` binding.

`?kv=&secret=&engine=`
- `secret` (required): the secret's name.
- `kv` (optional): the KV-storage scope. When given, it MUST equal the
  authenticated key's own `projectId` — a mismatch is a `403`, never a
  silent re-scope (same ingress-derived-identity contract as
  `/api/vault/access`, TASK-055). Omitted = the key's own `projectId`.
- `engine` (optional): a `secrets_engines` row id, or a bare registered
  engine type (`embedded-vault`, `aws-secrets-manager`). Omitted =
  auto-routing: the caller's workspace's chosen engine
  (`workspaces.secrets_engine_id`) → a `secrets_engines` row with
  `scope_kind=workspace` default → a `scope_kind=global` default → the
  always-available `embedded-vault` engine.
- Response: `{"name","value","kv","engine"}`. `404` secret not found in
  scope; `400` unknown engine override; `501` engine not implemented
  (e.g. `aws-secrets-manager`); `403` `kv` mismatch or no project
  binding on the key.
- Every embedded-vault access through this route writes a
  `vault_audit_log` row (Mandate 9), same as the dashboard vault surface.

### Python client
`sdk/python/jimesh_logger.py` speaks the same API (requests, env
`JIMESH_URL` + `JIMESH_SERVICE_KEY`).

### CLI
`cmd/jimesh-logger` — minimal stdin/args-based logger binary using the
SDK package (`go run ./cmd/jimesh-logger -alias … -message …`).

---

## Control-Plane Registry (Sprint 38, TASK-060)

The editable registry of WHERE JiMesh provisions (Operator-TASK-048:
"bei der Provision auswählen: SSH vs AWS vs GCP vs IPAM vs K8s"). One
row = one control plane; the provider layer (`internal/provision`)
dispatches lifecycle calls by the row's `type`. Providers: `ssh`
(implemented — wraps the existing `internal/deploy` pipelines, the SAME
code path as `/api/workspaces/deploy`, canonical since SPRINT-52), `local` (TASK-068 — the
self-registered row for the JiMesh host the backend itself runs on:
REAL local `status`/`provision` probes, no SSH; `deploy`/`undeploy`
stay with the ssh provider), plus the honest stubs `aws-ec2`,
`gcp-ce`, `ipam-netbox`, `kubernetes` (every lifecycle call answers
`501` with `control-plane provider not implemented`).

**Auth:** all routes session-gated. Mutations (POST/DELETE) are
OPERATOR-ONLY — the same OPA `data.jimesh.rbac.allow` decision as every
admin mutation, evaluated inline in `internal/auth` Middleware (same
pattern as `/api/firewall/rules`, see the TASK-050 note there).
`POST /api/router/aliases` additionally accepts a project-bound
`kind=service` consumer key (the MCP tool `register_router_alias`,
Sprint 36 WP4) — the key's project is pinned SERVER-side, body values
are never trusted.

| Method | Path | Body / Query | Response / errors |
|---|---|---|---|
| GET | `/api/control-planes` | — | `{success, controlPlanes: [ControlPlaneRow], count, types: [{type, description, implemented}]}` — honest `[]` when none exist; `types` lists every registered provider with its `implemented` flag so the UI badges stubs honestly. TASK-068: the FIRST call lazily self-registers exactly ONE row of type `local` (the JiMesh host this backend runs on) before listing — the registry always knows itself from the operator's first look onward |
| POST | `/api/control-planes` | `{id?, name, type, endpoint, credentialsRef?, config?}` — no `id` = create, `id` = edit (Settings). `config` must be a JSON object. `status` is NOT writable (measured lifecycle only) | `{success, created, controlPlane}`; 400 unknown `type` (must be one of the registry types) / missing `name`+`type`+`endpoint` / `config` not an object / **type `local` (TASK-068: reserved — the backend self-registers the one local row; manual local rows would break the exactly-one invariant)**; 409 duplicate name (names are unique — the operator picks planes BY name) / **409 on editing the self-registered local row (system-owned: its facts come from the backend's own probes, not an operator's keyboard)**; 404 on edit of an unknown id |
| DELETE | `/api/control-planes/{id}` | — | `{success, id, notice}` — the notice says router aliases wired to the plane keep their resolved host:port (`router_aliases` stores conninfo, not a live reference); 404 unknown id; **409 on the self-registered local row (TASK-068: "refusing to delete … it is the LOCAL JiMesh host (self-registered, system-owned) — the registry must keep knowing itself"; not an RBAC verdict, so 409 not 403)** |
| POST | `/api/control-planes/{id}/provision` | optional `{nodeUser?, authMethod?, sshPassword?, sshKey?}` (ssh credentials per the never-stored contract) | ssh: REAL node readiness pre-flight over SSH (docker daemon functional, gVisor `runsc` presence, disk headroom — raw command output in `output`; it CHECKS, it does not install: installs happen in the deploy pipeline via `installGVisor`). local: the SAME readiness pre-flight run directly on the backend host (`sh -c`, no SSH, credentials ignored). Row status books `provisioning` → `ready`/`failed`. 501 on stub types (row untouched — a stub cannot know a plane's state); 502/4xx replay the pipeline's own honest status+body |
| POST | `/api/control-planes/{id}/status` | optional `{nodeUser?, authMethod?, sshPassword?, sshKey?}` — POST not GET because credentials must never ride in a query string | ssh: REAL liveness probe (`{reachable, details: {kernel, docker, runningContainers}}`); local: the SAME three facts measured on the backend host itself (`sh -c`, no SSH — same probe commands as the ssh provider's local branch). unreachable is a valid honest 200 ANSWER (`reachable:false` + the real error), never a fake; a missing docker CLI reports the measured `docker-unavailable` fact. Row status books `ready`/`failed`. 501 on stub types |
| POST | `/api/control-planes/{id}/deploy` | the exact `/api/workspaces/deploy` body MINUS node coordinates — the plane's `endpoint` + `config` (`nodeUser`, `nodePort`) fill `nodeHost`/`nodePort`/`nodeUser` when the payload omits them (payload always wins); credentials stay per-request and are never stored | The deploy pipeline's OWN response body replayed verbatim (allocatedPort, codeServerPassword, securityNotes … — same pipeline, same authority, Mandate 11); errors keep the pipeline's real status (400 validation, 502 SSH). 501 on stub types and on the `local` row (the local host's deploy path exists and stays with the ssh provider — an ssh plane with a loopback endpoint drives the pipeline's local branch) |
| POST | `/api/control-planes/{id}/undeploy` | the exact `/api/workspaces/undeploy` body minus node coordinates (`purgeVolume` opt-in unchanged) | The sweep pipeline's own response verbatim; 501 on stub types and on the `local` row (same reasoning as deploy) |
| GET | `/api/router/config` | ROUTER-FACING (kind=service consumer key, project-pinned server-side) — the jimesh-router's long-poll pull. Query: `?version=<known>&wait_seconds=N` (server holds the answer until the version changes or the 45s cap; `wait_seconds` only honored when `version` is present). A dashboard session may also call it with `?project_id=` (read view) | Changed answer: `{version, aliases: [RouterAliasRow], sdk_key_hashes: [string], forward_url, workspaces: [WorkspaceRouteRow]}` — the composite version `"al=…;ck=…;ws=…"` moves on alias changes, key mint/revoke AND workspace-route changes. `workspaces` (TASK-079): `{workspaceId, projectId, ownerSub, backendIp, status}` per workspace of the key's project — ownerSub is the owner's `users.keycloak_sub` (the JWT sub the router's ownership gate compares), backendIp is the `ssh_<wsId>_internal_ip` setting (the container's internal Docker IP, persisted by the workspace deploy). Unchanged long-poll answer: `{version, aliases: null, forward_url}` — nil `aliases`/`workspaces` means "keep your tables", an EMPTY `workspaces` array means "clear them". 403 service key without a project |
| POST | `/api/router/aliases` | `{alias, conninfo, kind?, projectId?}` — `conninfo`: `cp:<controlPlaneId>[:port][/db]` (DIREKTLEITUNG: resolves the plane's endpoint host server-side, port defaults per kind 5432/6379) or `host[:port][/db]`. NEVER credentials (v1 alias rows are transparent relays). `projectId` required on the session path; ignored (server-pinned) for service keys | `{success, alias: RouterAliasRow, version, direct?, notice?}` — `direct:true` marks the alias wired straight onto the control-plane point (the router node tunnels to it, no proxy hop; the row lands in the registry the routers pull via GET `/api/router/config`). 400 unknown plane in `cp:` reference / empty host / missing projectId (a project-less alias would be invisible to every router pull) / `cp:` reference to the local self-row (TASK-068: it deliberately keeps an EMPTY endpoint — system-owned, there is no remote point to wire onto, so the error says that instead of the usual "edit it first" dead end); 403 service key without a project |

**The self-registered local row (TASK-068):** the registry knows itself.
Exactly ONE row of type `local` represents the JiMesh host the backend
runs on. It is created LAZILY on the first `GET /api/control-planes`
(not at boot: the gateway owns the type vocabulary, the invariant
self-heals after an out-of-band SQL delete, and no boot order depends
on it); the database enforces the singleton itself via a partial unique
index on `type='local'`, so concurrent first-GETs cannot double-create
and a manual second row is structurally impossible. The row is
system-owned: `endpoint` stays empty (the row IS here — no remote
address to dial), `status` starts honestly at `unknown` and is only
booked by lifecycle probes, manual creates/edits/deletes answer 400/409/409
(see the table above), and its facts (kernel, docker version, running
container count) come from the backend's own local probes — the same
commands the ssh provider runs on a loopback plane, minus the SSH hop.

**`credentialsRef`** is an opaque reference (e.g. a vault secret name)
— stored and round-tripped, deliberately NOT resolved in v1 (vault JIT
wiring follows the TASK-016 design; a plaintext secret here would
violate Mandate 9).

**Row shape (`ControlPlaneRow`):** `{id: "cp-…", name, type, endpoint,
credentialsRef, status: unknown|provisioning|ready|failed, config, createdAt}` —
persists in the `control_planes` table (survives restarts, Mandate 3).

---

## Secrets Engines (Sprint 39, TASK-065 — R41 §C1 "Secrets-System")

The SecretsEngine registry — same pattern as the Control-Plane Registry
above: an interface (`internal/secretsengine`), a registry, one real
implementation (`embedded-vault`, wraps TASK-055's project-scoped
`vault_secrets` store — no new secret storage, no schema break) and one
honest stub (`aws-secrets-manager`, every call → `501`). `jimesh.secrets.get()`
(see the SDK section above) resolves its engine and kv-storage scope
through this registry.

**Auth:** all routes session-gated. Mutations (POST/DELETE) are
OPERATOR-ONLY (`policy.IsAdminMutation` lists `/api/secrets-engines`,
same OPA engine + deny text as `/api/vault/`). GET stays open for every
authenticated identity — so for the embedded engine the `kv` PARAMETER is
membership-checked by hand (S181-10): there `kv` IS a project id
(`internal/secretsengine/vault_engine.go` maps it 1:1 onto TASK-055's
project scope), and before the fix the handler passed it straight to
`ListVaultSecrets(kv)`, which returned another project's key names to any
authenticated identity. `security.VaultProjectDenial` (the one exported
rule `/api/secrets` uses too) now answers every `kv` — **403** for a
non-member, for a session without `jimesh-dev`, and for the empty/global
`kv` on a non-operator session. Non-embedded engines have no
project-shaped kv and are unaffected.

The special engine id **`embedded`** always resolves to the
always-available embedded Vault — no `secrets_engines` row is required
to use it (Mandate 2: it is a real backend, not a placeholder).

| Method | Path | Body / Query | Response / errors |
|---|---|---|---|
| GET | `/api/secrets-engines` | — | `{success, engines: [SecretsEngineRow], count, types: [{type, description, implemented}]}` — `engines` is exactly the configured rows (honest `[]`), `types` is the registry's real registered set |
| POST | `/api/secrets-engines` | `{id?, name, type, scopeKind?, scopeId?, config?, isDefault?}` — no `id` = create, `id` = edit. `scopeKind`: `global` (default) \| `workspace` \| `control_plane` (the latter two require `scopeId`). Setting `isDefault:true` clears any other row's default flag in the SAME scope | `{success, created, engine}`; 400 unknown `type` / missing `name`+`type` / missing `scopeId` for a non-global scope; 409 duplicate name; 404 edit of unknown id |
| DELETE | `/api/secrets-engines/{id}` | — | `{success, id}`; 404 unknown id |
| GET | `/api/secrets-engines/{id}/kvs` | — (`{id}` may be `embedded`) | `{success, kvs: [string], count, projectShaped}` — the kv-SCOPES this engine actually holds, i.e. the storages behind Project Secrets. `kvs[0]` is `""` (the ROOT / global view) for anyone allowed it. Every candidate is filtered through the SAME `security.VaultProjectDenial` that guards `.../secrets?kv=`, so a non-operator never sees root and a granted dev never sees a foreign project. **Only scopes that hold rows are listed** (Mandate 2 — a grant alone does not mint an empty storage); use `POST /api/secrets-engines/{id}/secrets` with a fresh `kv` to seed one. A non-embedded engine answers `projectShaped: false` with `kvs: []` (its `kv` is not project-shaped, see `denyEmbeddedKv`). GET → open to every authenticated identity, like the rest of the reads on this surface. |
| GET | `/api/secrets-engines/{id}/secrets?kv=` | — (`{id}` may be `embedded`) | `{success, keys: [string], count, kv}` — KEY NAMES ONLY, never values (redaction discipline). Embedded engine: `kv` = project id → **403** when the session is not a member of it (or omits it without being operator/admin) |
| POST | `/api/secrets-engines/{id}/secrets` | `{key, value}` + `?kv=` | `{success, kv, key}` (upsert); 501 on an unimplemented engine (e.g. `aws-secrets-manager`); embedded engine: same `kv` membership check as the GET (S181-10) |
| DELETE | `/api/secrets-engines/{id}/secrets/{key}?kv=` | — | `{success, kv, key}`; 404 not found in that kv scope; embedded engine: same `kv` membership check (S181-10) |
| POST | `/api/secrets-engines/{id}/import` | `{fromEngineId, fromKv, toKv, keys?}` — `keys` empty = every key in `fromKv`. Copies VALUES from `fromEngineId`'s `fromKv` into `{id}`'s `toKv` ("Import from Engine" — a deliberate bulk action, not part of the routine set-one-secret flow) | `{success, imported: [string], count, failed: {key: reason}}`. **BOTH sides are membership-checked** when they are the embedded engine (`fromKv` and `toKv` are project ids — S181-10); the route is an admin mutation anyway, so this only matters for the fail-closed default. **Known limitation:** the embedded-vault engine's secret `name` is GLOBALLY unique (TASK-055 — `project_id` is a filter, not a namespace), so importing the SAME name into a DIFFERENT project's kv on the SAME embedded engine always collides when that name already exists anywhere; the response's `failed` map explains this honestly instead of a raw SQL error. Not a bug — a schema property, worth knowing before relying on cross-project copy. |

**Row shape (`SecretsEngineRow`):** `{id: "se-…", name, type, scopeKind,
scopeId, config, isDefault, createdAt, updatedAt}` — persists in the
`secrets_engines` table (survives restarts, Mandate 3). Values are never
part of this row — they live in the engine's own store (`vault_secrets`
for `embedded-vault`).

**Workspace-create additions (TASK-065 #3):** `POST /api/workspaces`
accepts additive `createVaultKv` (bool) and `secretsEngineId` (string,
must name an existing row when non-empty) — the workspace row persists
`hasVaultKv`/`secretsEngineId`, consumed by `jimesh.secrets.get()`'s
auto-routing (see the SDK section above). The full `/api/workspaces`
create contract now lives in the workspaces table above (SPRINT-139:
create writes ONLY the row — the secrets-engine choice is a row property,
provisioning is the separate `POST /api/workspaces/{id}/provision`).

### GET /api/secrets?prefix= (Sprint 50 — konsolidierte Secret-Oberfläche)

One route, four path namespaces, one engine: `internal/…`, `llm/…`,
`projects/{id}/…`, `projects/{id}/users/{uid}/…` (the FULL PATH lives in
`name`). Registered at `internal/security/security.go`, handler
`handleSecretsList` (`internal/security/secrets_consolidated.go`).

| | |
|---|---|
| Query | `prefix=` REQUIRED — must start with `internal/`, `llm/` or `projects/` (a trailing `/` is added when missing) |
| Response | `{secrets: [{name, hasValue, allowedAgents, createdAt, updatedAt}], prefix, count}` — METADATA ONLY, never values |
| ACL | `internal/` + `llm/` → operator-only (**403** for anyone else). `projects/{id}/…` → the PREFIX names the project and is membership-checked (S181-10): operator/`jimesh-admin` bypass, otherwise `jimesh-dev` realm role + `project_roles` grant for that project. **Before the fix the resolved scope was discarded (`_, ok :=`) and the prefix alone selected the rows** — a cross-project list for any authenticated identity |
| User namespace | `projects/{id}/users/{uid}/…` additionally requires `uid` to equal the verified `X-JiMesh-Identity-Sub` (operator/`jimesh-admin` bypass). That check was declared and never written before S181-10 (`_ = requestedUser`) |
| Errors | 405 non-GET · 400 missing/invalid prefix · 403 operator-only scope, non-member project, foreign user namespace, or a non-operator session with no scope |
| File-key rows | A name with a `file-keys/` path segment is a per-file workspace DEK (`vaultFileKeyName` in `internal/gateway/files.go`), not a secret someone put here — it is **excluded from this list** together with `count` (`security.IsFileKeySecret`), so uploaded filenames are never advertised. The rows themselves stay in `vault_secrets` and stay readable **by exact name** through `GET /api/vault/secrets/{name}` |

---

### POST /api/secrets/upsert (Sprint 50)

Create **or** update a secret at a full vault path — the path-taking
sibling of `POST /api/secrets-engines/{id}/secrets`. Registered at
`internal/security/security.go:49`, handler `handleSecretsUpsert`
(`internal/security/secrets_consolidated.go`).

| | |
|---|---|
| Body | `{"name": "projects/proj-…/API_KEY", "value": "…"}` |
| Path rule | `name` must start with `internal/`, `llm/` or `projects/` and carry at least one further component |
| ACL | `internal/` and `llm/` are **operator-only** (`isVaultOperator`); `projects/` goes through `requireVaultScopeFor` with the project taken from the name itself — same two-threshold membership rule as `/api/vault/*` (S181-10) |
| Write | `CreateVaultSecret(projectID, …)`, falling back to `UpdateVaultSecret` when the row already exists (create-then-update, not a separate upsert path); the audit row carries that project id and its error is ignored — the response reports the WRITE, never an audit outcome |
| Response | `{success, name}` |
| Errors | 405 non-POST · 400 invalid JSON / invalid path · **400 new `projects/…` secret without a resolvable project** (S181-10: name it `projects/{id}/…` or pass `?project=` — a bare `projects/foo` is a 400, not a wildcard) · 403 operator-only scope · 404 unknown name on update (names are globally unique, so a wrong project shows up as "not found", never as a cross-project write) · 500 both create and update failed (reason rides along) |

---

## Subagents (Sprint 38, TASK-061 — Epic-3-WP3/4)

Subagents are **real per-workspace agent containers** (own service key, own
session token, K-LAF identity chain with `parent_session_id` = the
workspace's session) spawned via the deploy pipeline's execution paths
(local: the gateway's own docker.sock; remote: SSH dial with request-scoped
credentials, never stored). Every tool call runs through the OPA capability
policy (`data.jimesh.capabilities.decision`, AIM pattern — R40-Anhang A)
**before** the container executes anything:

- granted + risk `low`/`medium` (e.g. `db:read`, `db:write`) → execute now
  (`docker exec` inside the subagent's own container = the isolation
  boundary), ledger row `done`/`error`
- granted + risk `critical` (`admin:*` namespace) → **execution paused**,
  the call sits in the persisted GUARDED queue
  (`subagent_tool_calls.status='guarded'`) until the operator decides
- not granted / malformed / unknown capability → deny (403) — the deny is
  part of the audit trail

Capability risk table (fail closed — a capability without a classification
can never be granted): `db:read`=low, `db:write`=medium, `fs:read`=low,
`fs:write`=medium, `shell:exec`=medium, `net:http`=medium, `admin:*`=critical
(prefix — the whole admin namespace is operator-approval territory).
**TASK-070 (Sprint 41) extends this table with the JiMesh domain schema**
(6 domains × read/write/delete/admin — registry, workspaces, deployments,
security, vault, gateway; the risk table is DERIVED from the rego catalog
`data.jimesh.capabilities.catalog`, see the next section). Domain
capabilities grant/match exactly like the tool ones: exact string or
namespace wildcard (`registry:*` covers `registry:delete`, never `vault:read`).

**Auth:** GET routes session-readable. `POST /api/subagents` (spawn),
`DELETE /api/subagents/{id}` (stop) and the approve/deny decisions are
OPERATOR-ONLY (`policy.IsAdminMutation` → the same OPA RBAC decision as
every admin mutation). The tool-call submit is NOT role-gated — it is
capability-gated per call under the SUBAGENT's spawn-time grants.
Frontend (read-only SSE tile, guarded-queue panel) = TASK-062.

**Security feedback injection (TASK-076, Sprint 38):** when a persisted
`sdk_logs` row carries `type=audit`, `level=ERROR` (the SPRINT-32 critical
mapping) and a SIEM scanner alias (`wazuh` — bridge, `falco` — bridge,
`checkov` — IaC gate) AND the row's workspace attribution resolves, the
backend injects a structured `security-critical` system message onto the
SSE stream of every ACTIVE (`spawning|running`) subagent session of that
workspace — the agent learns "you built something critical" without
polling logs. Notice shape: `{scanner, rule, severity: "critical",
workspaceId, projectId, sourceSessionId, logId, message, advice}` —
structured identity plus the already-redacted one-line scanner summary,
never raw payloads (K-LAF E3: at most one identity field is picked from
the row's payload — rule id / rule name / first CRITICAL check id).
Delivery reuses this package's TASK-061 hub (no parallel channel): the
store fires the observer in its own goroutine after the write (the ingest
never blocks; a slow SSE subscriber drops events, the emitter continues),
and `hub.Emit` puts the notice into the 50-event replay ring — a
reconnecting stream replays it. Binding choice (documented): the
`subagents` table IS the workspace→session binding — no new
`primary_session_id` field; with several active sessions in one
workspace EVERY one is notified (the culprit is among them, the notice
names the workspace); no active session → log line only, the `sdk_logs`
row stays the durable record. Open design question (flagged, NOT built):
whether the notified agent may CALL other sessions to investigate
(multi-agent investigation) — documented as a SPRINT-38 next step.

**Row shape (`SubagentRow`):** `{id: "sa-…", workspaceId, projectId,
expertId, name, task, image, command, containerId, containerName:
"jimesh-subagent-<id>", sessionId, status: spawning|running|done|error|
stopped, capabilities: JSON grant list, sshTarget, error, createdAt,
updatedAt}` — persists in the `subagents` table (survives restarts,
Mandate 3; stopped/done rows are KEPT as the audit trail).

| Method | Path | Body / Query | Response / errors |
|---|---|---|---|
| GET | `/api/subagents` | `?workspace=` / `?project=` filters | `{success, subagents: [SubagentRow], count}` — honest `[]` when none |
| POST | `/api/subagents` | `{workspaceId (required), expertId?, name?, task?, image? (default `busybox:1.37`), command? ("" = idle worker `tail -f /dev/null`), capabilities: ["db:read","db:write","admin:*"], nodeHost?/nodeUser?/nodePort?/authMethod?/sshPassword?/sshKey? (non-secret fields default from the project row; credentials request-only, never stored)}` | `{success, subagent, network, serviceKey (ONCE), sessionToken (ONCE), notice, nextSteps}` — the container publishes NO ports (headless worker, Mandate 12); env: `JIMESH_SUBAGENT_ID`/`JIMESH_WORKSPACE_ID`/`JIMESH_SESSION_ID`/`JIMESH_SESSION_TOKEN` + `OPENAI_API_KEY=<service key>` + `OPENAI_BASE_URL=<gateway>/v1`. 404 unknown workspace; 400 ungrantable capability (no risk classification) / unknown workspace reference; 500 spawn failure books the row `status=error` (row kept, credentials minted for the failed attempt are revoked) |
| GET | `/api/subagents/{id}` | `?live=true` re-probes the container (`docker inspect`) and books the measured transition | `{success, subagent}`; 404 unknown id |
| DELETE | `/api/subagents/{id}` | — | `{success, id, containerRemoved, serviceKeyRevoked, sessionRevoked, notice}` — container `docker rm -f`'d, service key + session tokens revoked, row kept (`status=stopped`); 404 unknown id; 409 already stopped |
| GET | `/api/subagents/guarded` | — | `{success, guarded: [ToolCallRow], subagents: [context rows], count}` — the operator's GUARDED-queue view (persisted; survives restarts) |
| GET | `/api/subagents/{id}/events` | — | SSE stream: `status` anchor (current row state) → replay of the last 50 events (`spawn`, `running`, `tool-call`, `done`, `error`, `stopped`, `monitor-timeout`, `security-critical`) → live events + 30s heartbeat. Terminal states replay + emit `end` + close. Events are REAL pipeline emissions, never synthetic tickers; the in-memory ring dies with the process (the durable truth is the rows — reconnect anchors on `status`) |
| GET | `/api/subagents/{id}/tool-calls` | — | `{success, toolCalls: [ToolCallRow]}` — the full ledger (guarded/approved/denied/done/error), newest first |
| POST | `/api/subagents/{id}/tool-calls` | `{tool: "exec", capability: "db:write", command: "…"}` (command ≤8 KB) | allow → 200 `{success, decision: {allow, guard, risk, reason}, toolCall}` with the REAL exec result (`result`, ≤64 KB); guard → 202 `{success, decision, toolCall, notice}` (persisted guarded row — operator decides next); deny → 403 `denied by capability policy: <reason>` (ledger row `denied`). 404 unknown subagent; 409 subagent not `running`; 400 unknown tool/missing fields; 500 policy engine not loaded → refused (fail closed) |
| POST | `/api/subagents/{id}/tool-calls/{callId}/approve` | — (operator) | `{success, decided: done|error, toolCall}` — executes the guarded command in the subagent container, books `decided_by`; 404 unknown call; 400 call belongs to another subagent; 409 call not `guarded` (atomic Compare-And-Swap state idempotency — concurrent decisions or non-guarded state return 409 without re-executing) or subagent not running |
| POST | `/api/subagents/{id}/tool-calls/{callId}/deny` | — (operator) | `{success, decided: "denied", toolCall}` — same atomic Compare-And-Swap guards as approve |

**Honest v1 boundaries:** the capability string is caller-declared and
reconciled against the spawn-time grants (intent verification — is the
declared capability honest? — is the documented R40 follow-up, not faked
here); tool surface is `exec` (docker exec inside the subagent container);
the container-authenticated tool-call path (service-key gate branch in
`internal/auth`) is documented follow-up — v1 submits come from the
dashboard/orchestrator session; the remote-SSH spawn path mirrors the
deploy pipeline byte-for-byte but was not live-verified here (no remote
node in the test environment — local docker.sock path was).

## Capabilities — the schema view (TASK-070, Sprint 41)

The capability policy module (`internal/policy/policies/capabilities.rego`)
carries a **catalog document** — `data.jimesh.capabilities.catalog` — that is
the single source of truth for the schema: 6 JiMesh domains (registry,
workspaces, deployments, security, vault, gateway) × 4 actions each
(read/list, write, delete, admin) with risk levels and route evidence, plus
the TASK-061 tool namespaces (db, fs, shell, net, admin). The risk table
the decision query uses is DERIVED from the catalog in rego (partial object
rule), so catalog and gate decision cannot drift — `internal/policy/
capabilities_test.go` proves it by evaluating every catalog action.

Risk model (evidence-based, SPRINT-41 §4): `read`=low everywhere; `write`
=medium for registry/workspaces/deployments (the agent's normal working
actions — workspace ensure and self-redeploy are product core), `write`
=critical for security/vault/gateway (operator-only or hot-path surfaces
today — freeze/release are HITL, vault writes are admin-gated, proxy-config
writes reroute every agent's LLM traffic instantly, Mandate 4); `delete`
and `admin` =critical everywhere; `admin:*` keeps its prefix rule.

**Special case proxy:** inside `gateway`, config writes (chain edges,
router aliases, profile switches) are why `gateway:write` is critical while
`gateway:read` stays low — the jimesh-router's config pull
(`/api/router/config`, kind=service, project-pinned) is legitimate read
traffic.

**Enforcement honesty (SPRINT-31 toggle pattern):** the catalog documents
which domain capabilities WOULD gate which /api machine surfaces once the
operator opts in (`operatorToggles` — all marked `TODO(operator-toggle)` /
`TODO(TASK-078 RBAC part)`); nothing on the /api machine-key surfaces is
silently gated by this task. What DOES enforce immediately: every subagent
tool call (the family above) — domain capabilities are grantable at spawn
and enforced per call with no further toggle.

The gateway route (`internal/gateway/capabilities.go`) serves the catalog
VERBATIM out of the engine — the Admin-Console Capabilities tab
(`/admin/capabilities`, `AdminCapabilitiesPage.tsx`) renders it; there is no
hardcoded schema copy anywhere in Go or the frontend.

**Auth:** session-gated by the standard middleware (readable for every
authenticated identity — read-only surface, no `IsAdminMutation` entry).

| Method | Path | Body / Query | Response / errors |
|---|---|---|---|
| GET | `/api/capabilities` | — | `{success, catalog: {version, title, decisionSemantics, domains: [{namespace, routes, actions: [{action, risk, note}]}], toolNamespaces: […], operatorToggles: [{capability, surface, state}]}, agents: [{id, name, workspaceId, projectId, status, createdAt, grants: [{capability, risk, state: known\|unknown}]}], serviceKeys: {keys: [{id, name, projectId, workspaceId, lastUsedAt}], count, capabilityModel: "not wired — consumer_keys has no capability column yet (TODO, TASK-078 RBAC part)"}}`. Grants are the subagents rows' persisted spawn-time grants, classified by the SAME engine the tool-call gate uses (`state=unknown` = no risk classification = the gate denies it today). 405 non-GET; 503 catalog/engine not loaded (fail closed, real reason in the message — never an invented schema) |

`JIMESH_CAPABILITY_POLICY` (file path) replaces the embedded policy module
for BOTH the decision query and the catalog — an override that omits
`data.jimesh.capabilities.catalog` disables this route's schema view with
an honest 503 (the contract requires both documents).

## Networks — Headscale Control Plane (Sprint 39, TASK-078)

The Networks surface (`internal/gateway/networks.go`) wires the
NetworksPage to the REAL Headscale control plane (TASK-036's container,
`headscale/headscale:latest` = v0.29.3) via `internal/network/headscale.go`
— a pure-Go REST client against the verified surface
(`GET/POST /api/v1/user|node|preauthkey|preauthkey/expire`, `GET /api/v1/policy`).
No mock rows anywhere (Mandate 2): `HEADSCALE_URL`/`HEADSCALE_API_KEY`
unset → honest 503 on every route; control plane down/refused → 502 with
Headscale's own message riding along; an empty tailnet stays `[]`/`0`.

Auth model: all routes session-gated by the middleware like every
`/api/*` route. The GETs are readable by every authenticated identity
(read-open, same as all admin surfaces). The two mutations mint/expire
JOIN CREDENTIALS — they gate through the one OPA engine via a SEPARATE
module (`data.jimesh.headscale.allow`,
`internal/policy/policies/headscale.rego`, loaded by
`internal/policy/headscale_gate.go` — `policy.go` stays TASK-070's lane):
password operator (`["admin"]`) and Keycloak identities with the realm
role `jimesh-admin` may mutate; machine identities (consumer keys) are
denied by omission (an agent must not mint itself a door into the
tailnet); fail closed on any evaluation surprise. The identity input is
the middleware's server-derived `X-JiMesh-Identity-Source`/`-Roles`
headers (ingress-derived-only contract, set right after session
validation — client copies are stripped first).

| Method | Path | Body / params | Response / errors |
|---|---|---|---|
| GET | `/api/networks/users` | — | `{success, users: [{id, name, createdAt, displayName, email, providerId, provider, profilePicUrl}], count}` — straight from `GET /api/v1/user`; honest `[]`/`0` when the tailnet has no users; 503 not configured, 502 control plane error (real message), 401 no session |
| GET | `/api/networks/nodes` | — | `{success, nodes: [HeadscaleNode], count}` — `GET /api/v1/node` 1:1; `online` is Headscale's own computation (never re-derived); fields include `ipAddresses`, `user`, `tags`, `expiry`, `lastSeen`, `registerMethod`, `approvedRoutes`, `subnetRoutes`; honest `[]` when no machine has joined (the live default here); 503/502/401 as above |
| GET | `/api/networks/preauthkeys` | — | `{success, keys: [{user, id, key, reusable, ephemeral, used, expiration, createdAt, aclTags}], count}` — keys arrive MASKED from Headscale (`hskey-auth-…-***`); the full value exists exactly once, in the create response |
| POST | `/api/networks/preauthkeys` | `{user?: "1" (headscale user id), reusable: false, ephemeral: false, expirationDays?: 90, aclTags?: ["server"]}` — bare tags get the `tag:` prefix server-side (headplane rule); empty `user` + no tags → 400 ("needs an owner") | `{success, key: {…full key…}}` — the ONE place the plaintext key crosses the wire (never stored, never listed again); 403 OPA deny (policy names source+roles+reason), 400 invalid JSON / ownerless key / `expirationDays` outside 1–365000, 500 gate not loaded (fail closed → refuse), 503/502 as above |
| POST | `/api/networks/preauthkeys/expire` | `{"id": "<headscale key row id>"}` (numeric string) | `{success: true}` — immediate revocation on the control plane; 400 non-numeric/missing id; 403 OPA deny; 404 unknown id (Headscale's own mapping); 503/502 as above |
| GET | `/api/networks/policy` | — | `{success, policy, updatedAt}` — the ACL/Tagging anchor (`GET /api/v1/policy`). HONEST 502 with the control plane's real reason in the current default config: `policy.mode: "disabled"` → Headscale answers 500 itself ("no supported policy mode found in configuration") — the UI shows "ACL enforcement off", never a fabricated policy. With `policy.mode: database` this becomes the read side of the OPA→Headscale ACL push (design section in SPRINT-39) |

**Not shipped (documented follow-ups):** node delete/rename/tag
mutation routes (no frontend consumer yet — the UI shows tags read-only
this round); the policy PUT passthrough (the client surface
`SetPolicy` is implemented and the OPA action `push-policy` is in the
gate vocabulary, but the write route ships only after the operator
flips Headscale to `policy.mode: database` — a control-plane posture
change that is the operator's conscious decision, not a dashboard
default).

### Network IDS — Suricata (SPRINT-60)

`GET /api/suricata/status` — the honest Suricata reader behind the NetworksPage
"Network Monitoring" panel (handlers in `gateway/suricata.go`): ONE real SSH session
(the same `deploy.DialSSH` the deploy engine and /api/ssh/explore use, TOFU-pinned),
ONE read-only marker probe (systemctl is-active/is-enabled, command -v, suricata -V,
wc/stat/grep/tail over /var/log/suricata/eve.json + suricata.log). Everything is parsed
from the real output — no fabricated counters (Mandate 2). Live-verified against the
trading host 28.9.: status "active", version 7.0.3, eve.json growing, and the HONEST
finding that 0 signatures are loaded (the real "no rules were loaded!" warning line is
carried verbatim in rulesWarning).

Credential cascade — exactly the `/api/projects/{id}/ports` contract
(`internal/security/exposure.go`): query params win, else the global
`ssh_host`/`ssh_user`/`ssh_password`/`ssh_key_pem` settings, else the FIRST
`ssh_endpoints` registry entry (non-secret fields only — that registry stores no
secrets by design).

| Method | Path | Body / params | Response / errors |
|---|---|---|---|
| GET | `/api/suricata/status` | `host, port, user, password, keyPem, authMethod` (credential cascade, see above), `limit` (1–50, default 10: how many recent alert events to tail) | `{host, targetSource ("query"|"settings"|"registry"), sshUser, sshPort, checkedAt, installed, binaryPresent, unitPresent, status, enabled, version, signaturesLoaded (int or null when suricata.log is unreadable — an unread counter is not zero), rulesWarning?, evePresent, eveLines, eveBytes, eveAgeSeconds?, alertEvents (int or null when eve.json is absent), alerts: [{timestamp, signature, signatureId, severity (1=high, 2=medium, 3=low — passed through raw), category?, action?, srcIp, srcPort?, destIp, destPort?}], capture? {uptimeSeconds, kernelPackets, kernelDrops, errors, decoderPackets, decoderBytes, detectAlerts}, parseErrors}` — 200 for every honest state including `installed:false`/"not-installed" and `alertEvents:0`; 400 no SSH target configured (message names all three remedies) / bad limit / bad port; 405 non-GET; 502 SSH dial or probe failure (the real error rides along) |

Frontend consumer: `SuricataIdsPanel` (`src/frontend/src/components/networks/suricata-ids-panel.tsx`),
mounted on `/networks` below the machines table — no new page, no nav change (the
"Network Monitoring" link already points there in both nav registries).

### POST /api/ssh/explore

File Browser Backend (Sprint-48): lists a directory on a remote node over a REAL SSH session (same dial path the deploy engine uses, TOFU-pinned). No mock — unreachable host returns the real SSH error.

**Request body** (same shape the deploy API uses):

| Method | Path | Body | Response / errors |
|---|---|---|---|
| POST | `/api/ssh/explore` | `{nodeHost, nodePort?, nodeUser, authMethod?, sshPassword?, sshKey?, path, dirs_only?}` | `{entries: [{name, path, is_dir}]}` — 400 when `nodeHost`/`nodeUser` empty, path not absolute, or contains a single quote (shell-injection guard); 502 when SSH dial or remote `ls -1pa` fails (real error surfaced). `dirs_only: true` filters to directories. Hidden files included. |

## Native Third-Party Dashboard Embedding (SPRINT-57)

The `/embed/*` surface (`internal/gateway/embed.go`) reverse-proxies
third-party dashboards (Grafana first; Wazuh/Ozone Recon follow-ups) onto
the dashboard's OWN origin, so they appear natively — **no iframe, no
agent-browser**. The frontend never frames them: the embed route IS the
dashboard (full viewport), and the DashboardsPage launcher (`/dashboards`)
only lists what the backend actually has configured.

Where this lives architecturally (the sprint's open question, answered
in code): TASK-079's wsproxy is NOT the browser-facing surface — its gate
is workspace-bound (ownership-checked routes pulled from the control
plane) and its listener is the router node's loopback :3100. The gateway
owns session auth and sits behind Traefik on the dashboard origin, so the
embed proxy lives HERE with the same `httputil.ReverseProxy` mechanic.

Target table: `JIMESH_EMBED_TARGETS` (env; `.env.example` documents it) —
JSON `[{name, url, path}]`. `path` is the public mount prefix (default
`/embed/{name}`); `url` is the upstream the BACKEND container reaches over
the docker network (e.g. `http://jimesh-grafana:3000`). Url WITHOUT a path
= sub-path mode (the browser's full public path is forwarded unchanged —
Grafana's official `root_url` + `serve_from_sub_path` mode); url WITH a
path = rewrite mode (the url path replaces the public prefix — the
documented escape hatch for dashboards without sub-path support).

Auth model: `/embed*` is session-gated in the auth middleware with the
same chain as `/api/*` (Authorization Bearer, the scoped `jimesh_session`
cookie, `?token=`). The SPA's first navigation carries `?token=`; the
handler exchanges it for a `HttpOnly` cookie scoped `Path=/embed` and
302s to the same URL without the token (the secret never lingers in
history). The proxied answers get `X-Frame-Options` removed and CSP
`frame-ancestors` stripped (the sprint's explicit requirement — the rest
of the target's CSP survives). Unconfigured table → honest 404s, never
fabricated dashboards. No host ports on the Grafana deploy: the embed
proxy is the only ingress (Mandate 12).

| Method | Path | Body / params | Response / errors |
|---|---|---|---|
| GET | `/api/embeds` | — | `{targets: [{name, url, path}]}` — exactly the backend's configured table; honest `[]` when `JIMESH_EMBED_TARGETS` is unset/invalid. 401 no session (standard `/api/*` gate), 405 non-GET |
| ANY | `/embed/{name}/*` | the dashboard's own requests (assets, XHR, websockets ride along) | Proxied to the configured upstream: full public path preserved (sub-path mode) or prefix-rewritten (url-with-path mode). 302 + `Set-Cookie: jimesh_session` (Path=/embed, HttpOnly) on a GET/HEAD carrying `?token=` (first-navigation handoff). 401 no/invalid session (middleware), 404 no target at the path, 502 upstream unreachable (real target name + host in the error) |

Verification: `internal/gateway/embed_test.go` — config parsing,
longest-prefix matching, public-path preservation, rewrite mode, the
`X-Frame-Options`/CSP strip, and the `?token=` cookie handoff against a
REAL httptest upstream (no dashboard is faked, Mandate 2). Reference
deploy: `deploy/grafana/` (Grafana 11.5 + Prometheus + postgres/redis
exporters, `docker compose --profile dash up -d`, README documents the
operator flow).

## Session Replay — OpenReplay, project-scoped (S174 / OSR lane 9.10.2026)

The self-hosted OpenReplay stack (deploy/openreplay, profile `replay`)
serves 4 routes (`internal/gateway/openreplay.go`
`registerOpenReplayProjectRoutes`) plus the plugin lifecycle trio
(`/api/plugins/openreplay/status|health`, DELETE
`/api/plugins/openreplay/installations/{id}`). The honest ladder before
any upstream dial: `503` when `JIMESH_OPENREPLAY_BASE_URL` (fallback env
`OPENREPLAY_BASE_URL`) is unset — **no invented replay host is ever
assumed** — then `403` Vault-project denial, `404` no activated
openreplay installation row for the project (the row IS the project
scope; workspace rows resolve through their project), `409`
misconfigured installation. `JIMESH_OPENREPLAY_PUBLIC_URL` carries the
browser-facing origin (deploy/openreplay defaults it to the Traefik
Host domain); internal base URLs never leak to browser code.

| Method | Path | Body / params | Response / errors |
|---|---|---|---|
| GET | `/api/projects/{id}/openreplay/config` | — | `{installed, baseUrl, publicUrl, publicConfigured, ingestUrl, projectKey, projectKeyConfigured, apiKeyConfigured}` — the organization `apiKey` is reported as a boolean only; the VALUE rides upstream as the server-injected `Authorization: Bearer` (never to the browser). 503 unconfigured env → 403 → 404 |
| POST | `/api/projects/{id}/openreplay/sessions` | `{userId ≤256, startTimestamp ≥946684800000, endTimestamp>start, limit?, page?, sortOrder?}` — body forwarded VERBATIM (capped 1 MiB) to `{base}/v2/api/public/{projectKey}/users/{userId}/sessions` | proxied answer verbatim (status + content-type, 4 MiB cap); 405 / 503 unconfigured / 403 / 404 no row / 409 missing projectKey or organization apiKey / 400 invalid contract / 502 transport |
| GET | `/api/projects/{id}/openreplay/embed/{sessionId}` | — | `{session_id, embed_url: {public}/session/{id}?embedded=true, base_url, public_url, public_configured}` — the player iframe URL. 503/403/404 ladder |
| GET | `/api/projects/{id}/openreplay/tracker.js` | — | `text/javascript` snippet (`window.initOpenReplay = {projectKey, ingestPoint: public+"/ingest"}` + bundle from `{public}/script/{projectKey}/openreplay.js`), `Cache-Control: no-store`. Same session ladder as config, so a `<script src>` from any logged-in surface works without env or keys in browser code. 409 when the installation carries no projectKey (nothing to record against) |

Health `/api/plugins/openreplay/health` (plugin lifecycle surface) is
MEASURED now (OSR): every activated row is probed with
`GET {openreplayUrl}/healthz` (2 s cap) and answered with
`{healthy, statusCode?, probeUrl, latencyMs, error?, checkedAt}` —
unconfigured rows `"no openreplayUrl"`, unreachable rows transport error,
401/403 count as alive (auth wall answering). The old
"healthy = URL configured" green lie is asserted away by
`TestOpenReplayHealthProbeMeasured`.

Verification: `internal/gateway/openreplay_test.go` — the whole family
served through the SAME mux production registers (a handler with no route
fails the suite), env precedence
(JIMESH_OPENREPLAY_BASE_URL > OPENREPLAY_BASE_URL > empty = honest 503),
identity/install gates, proxy VERBATIM against a real httptest upstream,
tracker snippet shape (key in, apiKey NEVER out) and the measured health
probe. DB-backed tests skip honestly without Postgres. Reference deploy:
`deploy/openreplay/` — the vendored canonical OpenReplay v1.28.0 topology
( manifest-checked image tags; profile `replay`, Traefik labels, zero host
ports; `make redeploy SERVICE=openreplay` boots it with first-boot
migrations), arm = one `make redeploy SERVICE=backend` with
`JIMESH_OPENREPLAY_BASE_URL=http://jimesh-openreplay-nginx` /
`JIMESH_OPENREPLAY_PUBLIC_URL=https://openreplay.jimesh2.internal`.

## Project Utility Container Proxy (SPRINT-170 Slice E)

The `/utility/{projectId}/*` surface (`internal/gateway/project_utility.go`)
reverse-proxies that project's utility container over the internal
`jimesh-net` network. The container runs three processes under supervisord —
code-server `:8080`, SilverBullet `:3000`, n8n `:5678` — with **no published
host ports** (Mandate 12); the proxy is the only ingress, and it targets
`:8080` only. SilverBullet and n8n are therefore NOT reachable through this
surface (they are exposed nowhere today — honest gap, not a misconfiguration
of the proxy).

Auth model: session-gated in the auth middleware with the SAME chain as
`/embed` (Authorization Bearer, the scoped `jimesh_session` cookie,
`?token=` handoff) — fail-closed, an unauthenticated request never reaches
the proxied container. The handler does no second auth check of its own; it
trusts the middleware, validates the project id against `utilityProjectIDRe`
and relies on the container lookup for the rest.

Edge routing: `PathPrefix(\`/utility\`)` sits on the backend's Traefik router
(`deploy/backend/ansible-task.yml`, mirrored verbatim by
`src/scripts/local-stack.sh`) at priority 10, which beats the frontend's
catch-all `PathPrefix(\`/\`)` at priority 1. Without that label the path
falls through to Next.js and 404s.

| Method | Path | Body / params | Response / errors |
|---|---|---|---|
| ANY | `/utility/{projectId}/*` | the utility app's own requests (assets, XHR, **websockets** — code-server needs them; `httputil.NewSingleHostReverseProxy` carries the Upgrade) | Reverse-proxied to `http://utility-{projectId}:8080` with the `/utility/{projectId}` prefix stripped (code-server runs at root), `X-Forwarded-Host`/`-Proto` set, `X-Frame-Options` and `frame-ancestors` CSP stripped like `/embed`. `?token=` on GET/HEAD sets an HttpOnly `jimesh_session` cookie scoped `Path=/utility/{projectId}/` and 302s to the same URL without the token. 401 no/invalid session (middleware), 404 missing/invalid project id or no such container, 503 container present but not running, 500 target URL parse |
| GET | `/api/projects/{id}/utility` | — | current container state for the project |
| POST | `/api/projects/{id}/utility` | — | starts `utility-{id}` on `jimesh-net` with the `/mnt/jimesh-workspaces/{id}` mount. **W-CODE-SECTION 2 (checkout bind):** when the project's node checkout resolves (the provisioned clone `worktreePath` first, the legacy `project.workspacePath` second), the launch ALSO binds it into the container at `/workspace/repo:rw` — code-server serves the operator's OWN git clone there, not just the encrypted S3 zone at `/workspace`. The bind is guarded in-script by a `[ -d <path> ]` check: a missing clone honestly echoes `CHECKOUT=none` and starts without the bind (never a silently mkdir'd stub). The bind applies to a FRESH container start — an already-running session must be restarted once (`/utility/{id}/restart`) to pick it up. The filepath picker (`GET /api/projects/task/tree` + code-server's `?folder=/workspace/repo/<sub>`) rides this mount |
| POST | `/api/projects/{id}/utility/restart` | — | honest stop-then-start via the ONE shared start implementation (`ensureProjectUtility`); a stop that answers 502 (busy mount) never reaches the start step |
| DELETE | `/api/projects/{id}/utility` | — | stops/removes it |

Verification: `internal/gateway/project_utility_test.go` (launch script
shape, mount dir, rclone mount guard). The proxy itself has no httptest
upstream test — untested path, stated rather than implied.

---

## Deployment Registry — node_services (SPRINT-142)

The deployment registry answers the operator demand (28.9., verbatim):
"warum kann man nicht alle auf einmal deployen und wieso haben wir keine
health checks oder speichern wenn wir sachen deployen also in der db oder
sonstwo — dann müssen wir auch keine health checks laufen lassen wenn da
sowieso nix da ist." Every `make redeploy` now records its REAL outcome
into the `node_services` table (ONE row per (node_name, service) — an app
identity, upserted in place; store: `internal/store/node_services.go`),
and the SSH-target detail page shows the inventory plus MEASURED health.
Health checks run ONLY against RECORDED services: no record → no check →
no fabricated greens (Mandate 2).

**Auth model:** GET is session-readable like every `/api/*` read.
POST accepts EITHER a kind='service' consumer key (the deploy-record key
below — the auth middleware's machine branch, same gate family as
`/api/sdk/*`) OR an admin session; the handler enforces this fail-closed
via the server-derived `X-JiMesh-Key-Kind`/`X-JiMesh-Identity-Admin`
headers and derives the row's `source` from the identity (`cli` = the
service key / the make-redeploy hook, `api` = a dashboard session).
POST `/{id}/health-check` is SESSION-only — a service key must not make
the gateway dial SSH.

**Honest states (Mandate 2):** status is derived from the REAL ansible rc
(`0` → deployed, non-zero → failed, absent → unknown — a failed deploy is
never greenwashed); health is only ever the verdict of a real SSH probe
(`unknown` = never probed, the shipped default); a node with no records
answers the honest empty list; a failed dial leaves the stored health
UNTOUCHED (an unreachable node is not a "down" service); the probe measures
docker container states + the systemd unit over ONE read-only SSH session
(same `deploy.DialSSH` path as `/api/suricata/status`, TOFU-pinned) and
matches containers by the deploy playbooks' real `jimesh-<service>`
convention (exact name, never a bare substring match).

**Recording deploy results from `make redeploy` (the CLI hook):**
`src/scripts/record-deploy.sh` POSTs `{node, service, git_sha, rc}`
after the ansible run (git sha auto-derived from the repo). It reads:

- `JIMESH_DEPLOY_RECORD_KEY` — a kind='service' consumer key, minted
  ONCE by the operator and stored in `.env`. It is never printed. Mint it
  like the platform-router key (`deploy/router-bootstrap/ansible-task.yml`
  pattern — only a SHA-256 hash is stored):

```bash
RAW=$(openssl rand -hex 24); PLAIN="jimesh-ck-${RAW}"
HASH=$(printf '%s' "$PLAIN" | openssl dgst -sha256 -hex | awk '{print $2}')
echo "JIMESH_DEPLOY_RECORD_KEY=$PLAIN"   # copy THIS into .env, then clear the shell
docker exec jimesh-postgres psql -U jimesh -d jimesh -v ON_ERROR_STOP=1 -c " \
  INSERT INTO consumer_keys (id, key_hash, key_prefix, user_id, name, project_id, \
  allowed_chains, rate_limit_rpm, revoked, kind, workspace_id, session_id) \
  VALUES ('$(openssl rand -hex 16)', '$HASH', '${PLAIN:0:14}', 'service:platform', \
  'deploy-registry-recorder', 'prj-platform', '["*"]', 0, 0, 'service', 'platform', \
  'deploy-registry');"
```

  (`prj-platform`/`platform` are the platform-router bootstrap's own
  workspace bindings; any REAL project/workspace pair works the same.)
- `JIMESH_DEPLOY_RECORD_URL` — gateway base URL, default
  `http://127.0.0.1:19091` (loopback-published backend, Mandate 12).

Without the key the hook skips LOUDLY (stderr) without failing the deploy;
on an HTTP failure it exits 3 and the Makefile hook line tolerates that
with `|| true` — the deploy's own rc is never masked.

| Method | Path | Body / params | Response / errors |
|---|---|---|---|
| POST | `/api/node-services` | `{node: "trading", service: "backend", git_sha?: "8966348", rc?: 0, log_excerpt?: "PLAY RECAP: …"}` — `node` = the config.yml node name (1..128 chars); `service` = the config.yml service key, restricted to `[A-Za-z0-9][A-Za-z0-9._-]*(/[A-Za-z0-9][A-Za-z0-9._-]*)?` (1..64 chars, at most one `/` between alnum-leading segments — since the deploy/cp|client split it names its repo path, e.g. `cp/dns`; the health probe interpolates it into a remote command); `rc` is the real ansible exit code (`null`/absent → status unknown); `log_excerpt` capped at 4096 chars | `{success: true, service: <stored row>}` — status derived server-side from the rc (0→deployed, non-zero→failed, absent→unknown); `source` derived from the identity (service key→cli, admin session→api). 403 without the service key or an admin session; 400 invalid JSON / node / service name; 405 non-GET/POST |
| GET | `/api/node-services?node=<name>` | the node query parameter is required | `{services: [<rows, newest deploy first>], count}` — honest `[]`/`0` when nothing was recorded for the node; 400 missing node parameter. Row fields: `id, node, service, gitSha, ansibleRc (null = not recorded), status, deployedAt, lastHealthAt ("" = never probed), health, lastError, source, logExcerpt` |
| POST | `/api/node-services/{id}/health-check` | optional per-field SSH override: `?host=&port=&user=&password=&keyPem=&authMethod=` — target resolves by (1) query params, (2) the ssh-endpoints registry entry matching the row's node by name OR host (non-secret fields), (3) the global `ssh_host`/`ssh_user`/`ssh_password`/`ssh_key_pem` settings | `{success: true, service: <updated row>, probe: {host, targetSource, checkedAt, dockerPresent, dockerError?, systemctlPresent, containers, matchedContainers, unitActive?, unitEnabled?, health, reason}}` — health is the MEASURED verdict (running/active→ok, restarting/paused/activating→degraded, stopped/exited/failed/nothing-matching→down, node without docker AND systemctl→unknown "cannot measure"). 404 id with no row (no record → no check); 400 no SSH target resolvable for the node (remedy in the message); 502 SSH dial or probe failed (real error, stored health NOT touched); 405 non-POST |

Verification: `internal/store/node_services_test.go` (upsert identity,
scope isolation, honest empty, health round-trip, idempotent second
migrate) + `internal/gateway/node_services_test.go` (rc→status honesty,
service-name gate + probe injection guard, probe parsing/derivation over
real marker output, record auth gate, list/404/400/502 contracts,
measured-verdict persistence) against the throwaway `jimesh_test`
database, plus `src/frontend/src/views/SSHTargetDetailPage.test.tsx`
(the "Deployed services" section contract: both-label fetch, honest
empty, health-check POST + refetch, verbatim error surfacing).

## Live Topic Stream — GET /api/stream/{family}/{id} (Lane W-PUBSUB-LIVE, 10.10.2026)

The generic pubsub hub behind the dashboard's "interactive page reload": one
SSE surface, one closed topic set, one hook family (src/frontend/src/lib/
live-topic.ts + live-refetch.ts). Every lane's surface subscribes FROM its
own source's change stream and refetches its OWN GET route in place — the
frames are change signals carrying minimal attribution, never the rows
(the row-level ACL stays on the GET; the SSE delivers only nudges).

Topics (closed fail-closed family set — `internal/gateway/stream_hub.go`):

| Topic | Emitter | Refetches |
| :--- | :--- | :--- |
| `logs:{workspace}` / `logs` | sdk logs ingest (POST /api/sdk/logs → sdklogs.SetLiveStream) | SDKLogsPage GET /api/sdk/logs |
| `audit` | admin audit-gate writes (store.ObserveAdminAudit) | AdminAuditLogPage GET /api/admin/audit-log |
| `agents:{workspace}` / `agents` | container + subagent registry writes (store.ObserveAgentRegistry) | WorkersDashboardPage GET /api/workers |
| `files:{workspace}` + `files:{project}` | workspace-file upload/delete/folder + docs CRUD/fromfile (gateway files.go/docs.go) | FilesPage list + DocsManager GET …/docs/filesync |
| `git:{project}` | the provision/repo-bind flow (workspaces_provision.go `emitGit`: provision-started, repo-cloned/reused/failed, worktree-created/reused) — a periodic commit-tick watcher remains **[SOLL]** | CodeDashboardPage repo tab: git-log + task/status in place |

Auth: the SAME middleware chain as every /api/* route (internal/auth
Middleware wraps the mux; connection carries the session via `?token=` —
the documented bearerToken fallback chain, same as /api/sse/*). An unknown
family (or a malformed id — no traversal/whitespace) answers 404, never a
fabricated stream. Wire: `event: replay` (bounded ring, once on connect) →
`: connected` → `event: update` (live), keepalive comments every 25s.

Mirroring: with Redis configured every emission is also XADDed onto
`jimesh:stream:{topic}` (existing internal/streams family) best-effort for
stream consumers (kafkabridge/dashboards); the SSE delivery itself is the
in-process fan-out (the same drop-when-slow subscriber channels the
subagents hub uses).

Verification: `internal/gateway/stream_hub_test.go` (closed-set validation,
exact/wildcard/family-isolated delivery, bounded replay ring, route
registration, SSE wire frames) + `internal/store/live_observers_test.go`
(push-after-durability, nil-observer no-op) and
`src/frontend/src/lib/live-topic.test.tsx` (token handoff, frame decoding,
bounded reconnect + auth-fail quiet-cache, shared-connection lifecycle,
consumer refetch-in-place).

### Traces — global thread query + per-request Trace-ID propagation (S193-2/S193-3)

Standard producer (HANDOFF-OTEL-S174 derivation, SPRINT-193-6): the FILE tracer writes
`JIMESH_OTEL_SPANS_PATH` (deploy: `/data/jimesh-spans.jsonl`, ansible-task.yml) — OTLP
stays an explicit operator env (`OTEL_EXPORTER_OTLP_ENDPOINT`, empty default =
OFF; collector = deploy/otelcol/, new dependency → Operator release). When
`JIMESH_CLICKHOUSE_URL` is set, the S219-6 span bridge lands the SAME spans in
ClickHouse and the query routes read THAT store (the project-scoped traces routes
`/api/projects/{id}/traces/*` keep their documented behaviour untouched).

**Per-request span + propagation (middleware, S193-2).** Every `/api/*` request gets:
- ONE OTel span (`<METHOD> <route-prefix>` name, stabilized attributes:
  `http.method`, `http.path`, `http.route` (ServeMux pattern), `http.status_code`,
  `http.duration_ms`, `service` = `jimesh-gateway`, plus `session.id` / `agent.id` /
  `project.id` when the auth middleware's server-derived
  `X-JiMesh-Session-Id`/`-Agent-Id`/`-Project-Id` headers resolved one). No log
  noise — the span IS the record; `/embed/*`, `/utility/*`, `/v1/*` and the SPA
  assets stay span-free.
- a W3C-shaped `X-JiMesh-Trace-ID`: an inbound VALID id (32 hex, non-zero) is
  adopted for CORRELATION ONLY (normalized lower-case; never a permission
  decision), otherwise one is minted (`auth.NewTraceID`). The id rides the
  request context (handlers read it; no header reaching required) and is echoed
  on the response header — first verbatim writer wins, so the auth middleware's
  stamp no longer mints a third id on `/api/*`.
- the span's TraceID = the echoed id → the JSONL line of the file tracer (and
  therefore `GET /api/traces/{traceId}` and, when ClickHouse is armed, the
  span row) keys on the SAME id the caller holds. Handler spans on the request
  context nest as children (parent_span_id) under the middleware span.

| Method | Path | Body / params | Response / errors |
|---|---|---|---|
| GET | `/api/traces?since=&until=&service=&session_id=&limit=&offset=` | `since`/`until` = epoch-ms (both optional, range on the span start); `service` = span attribute `service`/`service.name` exact match; `session_id` = session attribution; `limit` default 50, max 200; `offset` after grouping | 200 `{traces: [{trace_id, span_count, first_start, last_end, duration_ms?, service?, session_id?, agent_id?}], count, total, configured}` — newest trace first. ClickHouse configured → store rows (no `boundary`); otherwise the file tracer JSONL. Unconfigured + no file spans ⇒ `traces: []` + `configured: false` + `boundary` naming `JIMESH_CLICKHOUSE_URL` AND `JIMESH_OTEL_SPANS_PATH` (S193-3) — never fabricated rows. Error shapes: 403 no project access (not applicable — global route), 500 on store/file read failure with the real reason |
| GET | `/api/traces/{traceId}` | id must be 16..64 hex chars (W3C/file-tracer ids), else 400 | 200 `{trace_id, trace: {…same summary shape as the list}, spans: [{span_id, parent_span_id, name, attributes, start_time (RFC3339), end_time, duration_ms}], count, configured, source}` — source is `file` (the default producer path, tried FIRST) or `clickhouse` (fallback when configured). Honest empty when neither serves the id: `trace: null, spans: [], configured: false, boundary: …` — a trace is never fabricated |
| GET | `/api/opensearch/anomalies/falco?since=&until=` | window epoch-ms, BOTH or NEITHER (absent = last 24h), inverted windows 400 | 200 envelope: unconfigured (`JIMESH_OPENSEARCH_URL` unset — the shipped default, see below) ⇒ `{configured: false, boundary}` naming the env; index not queryable upstream (404 etc.) ⇒ `configured: false` + the upstream status/error evidence; real path ⇒ `{configured: true, index, window, interval, events, timeline?, by_priority?, top_rules?, rcf?}` — `events` is the REAL historical count from `jimesh-falco-events-*` in the window, the aggregates pass through verbatim, and `rcf` is the Anomaly-Detection plugin's `_preview` answer (RCF) verbatim. Zero events ⇒ `configured: true, events: 0, rcf_skipped` (no empty-window RCF call, no fake anomalies). When the AD plugin is missing/unreachable the summary stays real and `rcf_error` carries the failure. Identity fence like the knn/rcf POST routes (401 without a verified `X-JiMesh-Identity-Sub`); 503/502 only when the upstream is RUN but unreachable |

Upstream note (S192-14 lineage, no mock): `JIMESH_OPENSEARCH_URL` is the same env
the knn/rcf/search POST routes gate on. It is NOT part of any shipped deploy
default (the SIEM stack's indexer URL is the wazuh-indexer internal one), so the
shipped honest state of the anomalies card is `configured: false` until the
operator wires the indexer URL — the envelope says exactly that instead of
greenwashing.

## W-SECRETS-SCAN (operator 14.10)

Operator order verbatim: *"vulnerability management fehlt git secrets scaner oder secrets in sast, iac, dast und als eigene notification btw das braucht eigene schemas"*. The git-secrets scanner joins the vulnerability-management family (SAST/IaC/DAST lineage) with its OWN schema (`security_secret_findings`, lifecycle `open | acked | released`, UNIQUE `fingerprint` dedupe) and its OWN notification kind `secrets_finding`. Scanner: the pinned gitleaks container `zricethezav/gitleaks:v8.30.1@sha256:c00b6bd0aeb3071cbcb79009cb16a60dd9e0a7c60e2be9ab65d25e6bc8abbb7f` (digest verified by a real pull on 14.10.2026), mounted read-only over the workspace; it scans the git HISTORY when a `.git` dir exists, else the working tree (`--no-git`). Snippets are MASKED at the scanner boundary (first 8 chars + `!……`) — the raw secret value never reaches the store, the logs or any response.

### End-to-end flow

1. A deploy runs the gate (default `iacGate:"on"`): after Checkov + SAST stage, the new `secrets-v1` stage scans the checkout; findings travel in the deploy response as `securityGate.secrets_findings` (masked) + `securityGate.secrets_new_findings` (rows first-recorded by this run), each as a `secrets_finding` security_event, and — when at least one NEW row landed — the own notification `secrets_finding` fires (subject `Secrets-Scan: N Findings on project <id>`); with no SMTP env it is logged honestly, never fabricated.
2. Standalone: the operator triggers the SAME scan any time via `POST /api/security/secrets/scan` (admin-gated), reads the worklist via `GET /api/security/secrets/findings`, flips lifecycle via `POST /api/security/secrets/findings/status`.

### Wire contract

DDL (store `security_secret_findings`, Ensure in the migrate chain):
`id BIGSERIAL PK, project_id TEXT NN, detector TEXT NN CHECK (detector IN ('sast','iac','dast','git')), rule_id TEXT, severity TEXT, path TEXT NN, line INTEGER, snippet TEXT (MASKED), fingerprint TEXT UNIQUE NN, status TEXT NN DEFAULT 'open' CHECK (status IN ('open','acked','released')), commit_sha TEXT NULL, created_at TIMESTAMPTZ DEFAULT now()`.

| Method | Path | Body / params | Response / errors |
|---|---|---|---|
| GET | `/api/security/secrets/findings?projectId=&status=` | `projectId` REQUIRED; `status` optional `open\|acked\|released` | 200 `{findings: [{id, projectId, detector, ruleId, severity, path, line, snippet, fingerprint, status, commitSha, createdAt}], count, projectId}` — honest `[]`, never null; 400 missing projectId; 400 invalid status; 500 store failure with real reason |
| POST | `/api/security/secrets/findings/status` | `{"id": <finding id>, "status": "acked"}` (lifecycle `open`→`acked`→`released`) | 200 `{ok: true, id, status}`; 400 invalid json/status; 404 unknown id — admin-gated via `policy.IsAdminMutation` prefix `/api/security/secrets` (audit class `secrets_status_change` on `secret_finding`) |
| POST | `/api/security/secrets/scan` | `{"projectId": "…", "workspaceId"?: "…", "workspacePath"?: "…"}` — resolution ladder: explicit `workspacePath` → persisted workspace `worktreePath` → project `WorkspacePath` (workspace row must belong to the project) | 200 `{projectId, workspacePath, workspaceId, mode: "git-history"\|"working-tree", detector: "git", scanner: "secrets-v1", findings: [{path, line, rule_id, severity, snippet, fingerprint, commit_sha?}], finding_count, new_findings, status: "passed", scan_ms, note}`; findings rule_id is the canonical vocabulary (`aws_ak`, `glpat`, `ssh_key`, `jwt`, `generic_pass`) or the gitleaks id passthrough; severity is repo-classified (`high` for credential-takeover classes, `medium` otherwise). Errors, all honest: 400 no workspace coordinate; 404 unknown project/workspace; 502 probe/dispatch failure with the real reason (image not pullable = the scan SKIPPED, no invented findings — Mandate 2); 502 unparseable report ("treat the checkout as UNVERIFIED"). Admin-gated (`secrets_scan` audit class on `project`) |

### cURL (backend at http://127.0.0.1:19091)

```bash
# read the worklist (open rows) — every authenticated identity
curl -s "http://127.0.0.1:19091/api/security/secrets/findings?projectId=prj-abc123&status=open"

# run the scan NOW on the node holding the workspace (operator) — history mode when .git exists
curl -s -X POST "http://127.0.0.1:19091/api/security/secrets/scan" \
  -H 'Content-Type: application/json' \
  -d '{"projectId":"prj-abc123","workspacePath":"/srv/projects/ws-one"}'
# → { "mode":"git-history", "finding_count":2, "new_findings":2, "findings":[{"rule_id":"aws_ak","severity":"high","path":"deploy/env","line":3,"snippet":"AKIA77XK!……","fingerprint":"9f2a…"}, …] }

# acknowledge / resolve a row (operator)
curl -s -X POST "http://127.0.0.1:19091/api/security/secrets/findings/status" \
  -H 'Content-Type: application/json' \
  -d '{"id":12,"status":"acked"}'
```

`security_events` feed: each finding ALSO lands as `{eventType: "secrets_finding", scanner: "secrets-v1", verdict: "warn", direction: "none"}` (capped at 25 rows/run like the IaC/SAST gates) so the existing SIEM pipeline (`GET /api/security/events`) carries the secrets family; a broken scanner run writes `secrets_scan_failed` instead of a fake clean pass. Re-scans of an unchanged checkout report `new_findings: 0` (fingerprint dedupe) and fire no notification — the dedupe IS the anti-spam.

## Workspaces environment_type (SPRINT-DEPLOY-DUAL-ENV KD-1 — architecture A1)

Every workspace carries EXACTLY ONE environment type (`environment_type`, mutually exclusive):

| value | meaning | status |
|---|---|---|
| `gvisor` | isolated gVisor network, one node, docker runtime `runsc`/`runsc-falco` — today's model | **standard + default** |
| `k8s` | namespace per workspace in a target cluster, deploy via K8s-API (no SSH) | **Beta** — cluster provisioning is delivered by KD-3 |

**POST /api/workspaces** (create) accepts the OPTIONAL body field `environmentType`
(`"gvisor"` | `"k8s"`):
- omitted / `""` → the row resolves to the `"gvisor"` default (pre-KD-1 requests are byte-for-byte unchanged);
- `environmentType: "k8s"` → stored verbatim on the row (the create form's selector; provisioning itself is not wired until KD-3);
- any other value → **400**: `unknown environmentType <v> — valid: \"gvisor\" (isolated gVisor network, standard) or \"k8s\" (Beta — requires cluster provisioning, KD-3), or omit for the gVisor default`.

The workspace row (GET /api/workspaces, GET /api/workspaces/{id}, provision/repo responses) now carries `environmentType` alongside the existing fields. Validation is enforced gateway-side AND store-side (`store/workspaces.go` `normalizeWorkspaceRow` refuses anything outside the closed set). **Migration:** additive, guarded, idempotent — `environment_type TEXT NOT NULL DEFAULT 'gvisor'` via `EnsureWorkspacesTable` (legacy installs get the column + backfill on next boot; no schema break, existing rows read `gvisor`). The create form's Environment selector ships this choice (gVisor checked by default; the Kubernetes option is disabled with the "in Beta" label until the KD-3 cluster provisioning exists).

## Beta Access Gate — operator tooling (SPRINT-BETA-ACCESS-GATE, BG-3)

Startup-phase posture (bis Stripe-Live): Login/App-Zugang hinter dem Beta-Gate
(Modal), Seats in der `beta_invites`-Tabelle, gespeichert NUR als bcrypt-Hash
(`store.HashBetaCode` — derselbe Pfad, mit dem das Gate vergleicht
`CompareBetaCode`; kein Klartext, kein 6-Digit-Code).

**EX-1 premium routes** (`premium: true` — seit SPRINT-EX-1-PREMIUM-EXTRACTION
lebt die echte Implementierung im privaten
`github.com/ji-podhead/jimeshIO/packages/go/betagate`-Package; GOPRIVATE=
`github.com/ji-podhead/jimeshIO`-Wiring oder npm `@jimesh/pro-*`-Import für die
pro-Build):

- `premium: true` — `POST/GET /api/beta/gate` (Ein-Zeile-Note): OSS-Stub →
  `GET/POST /api/beta/gate` antwortet ehrlich **503**
  `{"error":{"message":"premium package not present in OSS ..."}}` (GET
  zusätzlich `connected:false, betaGateActive:false` — das BetaGateModal liest
  das als „Gate off" und übergibt den Flow an das unveränderte Auth-Gate),
  andere Verben → 405 (gateway.go `registerBetaGate`).
- `premium: true` — `POST /api/cloud/exchange` (Ein-Zeile-Note): ES-5
  Contract-Route-String bleibt stabil; OSS-Stub → **503**
  `{"error":{"message":"premium package not present in OSS ..."}}`
  (Implementierung im privaten
  `github.com/ji-podhead/jimeshIO/packages/go/cloudexchange`; eine echte
  Token-Kette ist ohne pro-Build nicht erreichbar — kein 401-Theater — gateway.go `registerCloudExchange`).
- `premium: true` — `jimesh-admin beta-invite` / `beta-gate-off` (CLI-Half):
  Parse-Contract bleibt; Ausführung → ehrlicher premium-Error
  (`cmd/jimesh-admin/beta_invite.go`); bis pro-Import degradiert der Operator
  Flow (kein Invite-Lauf, kein Gate-Abbau in OSS-Builds).

Operator-CLI `src/backend/cmd/jimesh-admin` (Make-Targets, container-Style wie
`make go-test`; DATABASE_URL zeigt auf die jimesh-DB aus `.env`):

```bash
# Invite (anlegen ODER rotieren): CODE wird bcrypt-gehasht gepersistet, der
# Summary-Print zeigt nur Salt-Präfix + email + seats + expiry — nie den Klartext.
# Upsert per lower(email): Rotation ersetzt Hash + resettet den Seat, EINE Row.
make beta-invite EMAIL=ops@jimesh.io CODE=<32+ Bytes random> [MAX_USES=n] [EXPIRES_AT=RFC3339|never]

# Gate global abschalten — der Stripe-Live-Tag-Schritt (Settings-KV beta_gate_active=false):
make beta-gate-off [EMAIL=x]
```

Defaults: `MAX_USES=1` (Sprint-Tabelle), `EXPIRES_AT=+30d`. Der DSN kommt wie
bei `cmd/server` aus `DATABASE_URL`, optional `ENTERPRISE_DB_SCHEMA` (folded in
als `search_path`-Runtime-Parameter — kein zweiter Store-Contract).

**Auto-Shutoff ist dokumentiert, NICHT verdrahtet:** sobald `stripe_live_active`
gesetzt ist, muss Operator `make beta-gate-off` laufen lassen (Removal-Playbook:
jimeshIO/docs/sprints/SPRINT-BETA-ACCESS-GATE.md §BG-3 Removal-Doc). Testabdeckung:
`go test ./cmd/jimesh-admin -run TestBeta` (CLI ↔ Store-Integration: Hash
roundtrip, Rotation/Email-Uniqueness, kein Klartext im Output, binäre End-to-End-Aufrufe)
und `go test ./internal/store -run TestBeta` (BG-1-Kontrakte).
**EX-1-Update:** die Store-Hälfte (und ihre BT-Tests) ist seit
SPRINT-EX-1-PREMIUM-EXTRACTION ins private betagate-Package gewandert — die
Store-Tests laufen jetzt in jimeshIO
(`go test ./betagate ./cloudexchange` + `go test -tags dbtest ./betagate`
gegen eine Throwaway-DB), in JiMesh2 bleibt der Stub-Test
(`go test ./cmd/jimesh-admin -run BetaInvite` → 503/Notice-Assertions).

## Compose→Plan-Renderer + tf-runner (SPRINT-DEPLOY-DUAL-ENV KD-2/KD-4 — A2: compose read→render)

Two backend modules deliver the deploy-source layer for the dual-environment
sprint. **KD-2** (`src/backend/internal/deploy/compose_render.go`) parses a
compose file into a structured plan — no HTTP route yet: the plan (`ComposePlan`
) is the fragment the KD-3 k8s lane (`k8s_deploy.go`) applies (one Deployment +
one ClusterIP Service per workspace namespace `jimesh-ws-<wsId>`, where the
object name is workspace-scoped inside the namespace — compose's
`<project>_<service>_1` container prefixing is deliberately NOT reconstructed:
the namespace IS the compose project). **KD-4**
(`src/backend/internal/deploy/tf_runner.go`) returns a DECLARATIVE
opentofu-JobSpec only — no container is built, no binary runs; the real apply
is the later KD-4 finisher step. Both files are library-only by construction
(unittest both: `go test ./internal/deploy -run 'TestComposeRender|TestTfRunner'`).

### KD-2 — `RenderComposePlan(content []byte) (ComposePlan, error)`

Parse subset per A2 (supported keys ONLY; everything else → warning, honest
"unsupported" list — the render never hard-fails on unsupported keys and never
silently drops them):

| service key                      | parse forms                                             | plan field |
|----------------------------------|---------------------------------------------------------|------------|
| `image`                          | non-empty string                                        | `Image`    |
| `env` / `environment`            | `KEY: VAL` map OR `- "KEY=VAL"` list (null → `""`)      | `Env map[string]string` |
| `volumes`                        | short syntax `host:target[:ro\|rw]`, named `vol:target` | `[]ComposeVolume{Source,Target,Mode,Named}` |
| `ports`                          | short syntax `[host:]container[/proto]`                 | `[]ComposePort{Raw,Port,Published,Protocol}` |
| `command` / `entrypoint`         | string (kept WHOLE, one argv element) or list           | `[]string` |
| `restart`                        | `no` \| `always` \| `unless-stopped` \| `on-failure`    | `Restart`  |
| top-level `name` / `version`     | strings (`version` deprecated in the spec, tolerated)   | `Name` / `Version` |

- **ServicePort** `int` — first tcp port (the ONE `K8sDefaultServicePort`-8080
  fallback the KD-3 lane publishes when none declared).
- **Unsupported keys (→ PlanWarning)**: document-level `configs`, `secrets`,
  `networks`, `volumes`, and anything unknown; per-service `build`,
  `healthcheck`, `depends_on` (+conditions — the OQ1 compose-runner debate
  stays open OUTSIDE this file), `deploy`, `labels`, `logging`, `env_file`,
  long-syntax `ports`/`volumes` maps. Message text names the key + the honest
  subset (`… is not part of the KD-2 supported subset — ignored, listed honestly`).
- **PlanError (validation, blocks only THAT service; siblings still render —
  partial truth in the console)**: malformed YAML; missing `services:`;
  service without an image (nothing builds images — the k8s lane invents
  none); non-numeric/range/0/65536+ ports; long-syntax ports/volumes; volume
  modes outside `ro|rw`; non-scalar `restart`.
- YAML lib: `gopkg.in/yaml.v3` (already in go.mod — ci_scan.go uses the same).

### KD-4 — `PlanTfInvocation(req TfRunRequest) (TfJobSpec, error)`

```json
TfJobSpec {
  "stage": "plan|apply", "image": "jimesh-tf-runner:latest",   // opentofu binary image, NOT built (KD-4 finisher)
  "workingDir": "infra/prod", "tfvarsPath": "infra/prod/main.tfvars",
  "planOutPath": ".jimesh/tf/infra-prod/plan.tfplan",          // REQUIRED for BOTH stages — apply consumes the reviewed plan
  "backendName": "jimesh-tfstate-<workspaceId>",               // workspace-scoped default (A2), caller name wins
  "entrypoint": ["/usr/local/bin/tofu"],
  "args": ["plan","-input=false","-no-color","-lock-timeout=30s","-var-file=…","-out=…"],  // ribbon order fix; apply = no -out, planfile positional last
  "env": {}                                // secrets NEVER inline
}
```

- Structural path validation (workspace-relative POSIX only): absolute paths,
  `..` traversal (incl. `a/../..` after clean), `.`-only root spelling
  collapse, backslash separators, drive letters, empty required fields, stage
  outside `plan|apply` — every error NAMES the field (400-grade honesty); no
  spec escapes validation.
- Empty `stage` defaults to `plan` — no implicit apply, ever.
- Honest scope (file header contract): `PlanTfInvocation` EXECUTES nothing.
  The `jimesh-tf-runner:latest` container build + job run (gvisor docker run /
  k8s Job in the quota-bounded workspace namespace — KD-3 carries ResourceQuota
  AND LimitRange, so the terraform lane leans on a bounded namespace) is the
  KD-4 finisher integration; console streaming goes through the KD-6 SSE
  surface (`spec.console` carries the stream id).
