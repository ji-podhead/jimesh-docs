# JiMesh Data & Metrics Schema — Providers and Models

This is the definitive description of every datum JiMesh keeps about
providers (API keys) and models, where it lives, and where it comes from.
Code is the second source of truth: `internal/gateway/quota_probe.go`
(provider capability schemas), `internal/quota/quota.go` (header specs),
`internal/keypool/keypool.go` (live key metrics).

## Evidence hierarchy (standing mandate)

1. **Own measured traffic** — rate-limit headers, latency/TTFB, failures
   from real proxied calls. Always outranks anything else.
2. **Provider APIs** — dedicated endpoints (OpenRouter auth/key,
   benchmarks, catalog) and provider-reported response headers.
3. **Nothing** — if neither exists, we store nothing and say so.
   Third-party data (OpenRouter benchmarks, catalog metadata) is
   additional information only and never the sole basis of a routing
   decision.

## 1. Provider / API key

| Field | Where | Source |
|---|---|---|
| platform, label, enabled | `keys` | operator input |
| is_paid | `keys.is_paid` | operator, auto-derived from catalog (`deriveKeyPaid`), OpenRouter `is_free_tier` |
| base_url | `settings: custom_base_url:<id>` | operator / platform default (`provider_urls.go`) |
| status (ok/cooldown/disabled), cooldown_until, benched | in-memory keypool | live cooldowns, provider-informed benches (BenchUntil) |
| successes, failures, total_requests | keypool | own traffic — bandit feedback |
| reliability, speed (0..1 priors) | keypool | bandit (own traffic, cost-weighted) |
| quota windows (metric, limit, remaining, reset) | `quota_state` / `quota_observations` | provider headers on real calls + probe harvests (`source=probe`) |
| **usage counters hour/day/week/month** | PENDING (WP: `key_usage` table) | own traffic — so routing stops before limits |
| **quota method schema** | `providerSchemas` in `quota_probe.go`, exposed via `GET /api/keys/endpoints → quotaSchema` | this document + verified live probes |

## 2. Model

| Field | Where | Source |
|---|---|---|
| id, platform | `models` | discovery / operator |
| display_name | `models.display_name` | OpenRouter catalog (when locally empty) |
| context_window | `models.context_window` | OpenRouter catalog |
| pricing $/M | `models.input_price_per_m`, `output_price_per_m` | OpenRouter catalog (per-token × 1e6) |
| is_paid_model | `models.is_paid_model` | pricing > 0 (auto) |
| vision, tools | `models.supports_vision/tools` | OpenRouter modalities / supported_parameters |
| intelligence_rank, speed_rank, tier | `models` | operator / catalog sync |
| quality indices | `settings: or_benchmark_metrics` | OpenRouter `/api/v1/benchmarks` (incl. aggregated AA numbers) |
| routing evidence per call | `request_log` | own traffic (success, status, latency, TTFB) |

## 3. Provider capability matrix (quota / rate-limit detection)

| Platform | Method chain (first = preferred) | Headers on | Header family | Dedicated API | Shared pool | own_bench |
|---|---|---|---|---|---|---|
| openrouter | usage-endpoint → chat-header-harvest | chat | `x-ratelimit-*` | `/api/v1/auth/key`, `/api/v1/benchmarks`, `/api/v1/models` | account | — |
| openai | chat-header-harvest | chat | `x-ratelimit-*` | — (no usage endpoint; `/models` carries no headers anymore) | — | — |
| nvidia | chat-header-harvest | chat | `x-ratelimit-*` | — (no `/limits`, no `/usage` — verified) | account | — |
| anthropic | chat-header-harvest | chat | `anthropic-ratelimit-*` (+ `x-ratelimit-requests-*`) | — | — | — |
| groq | models-header-harvest → chat-header-harvest | chat | `x-ratelimit-*` | — | account | — |
| mistral | models-header-harvest → chat-header-harvest | chat | `x-ratelimit-*` | — | — | — |
| google / gemini | models-header-harvest → chat-header-harvest | chat | `x-ratelimit-*` | Cloud Quotas API is org-level only | project | — |
| cerebras | models-header-harvest → chat-header-harvest | chat | `x-ratelimit-*-day/-minute` | — | shared | — |
| ollama | models-health | none | — | — | — | **own_bench** (no quota API, ollama/ollama#15663) |
| custom/unknown | models-header-harvest → chat-header-harvest | unknown | `x-ratelimit-*` attempted | — | — | fallback |

Method glossary:
- **usage-endpoint** — dedicated JSON quota endpoint, zero LLM cost.
- **models-header-harvest** — GET `/models` sniffed for rate-limit headers, zero cost.
- **chat-header-harvest** — minimal chat probe (`max_tokens=1`, prompt ".") — ≈0 cost, forces the provider to emit rate-limit headers; paid keys are never chat-probed.
- **models-health** — plain reachability check only.
- **own_bench** — the proxy's own traffic is the only benchmark.

## 4. Open endpoints for these data

| Endpoint | Shows |
|---|---|
| `GET /api/keys/endpoints` | per key: status, quota windows, **capability schema** (badge in provider tab) |
| `GET /api/aa/metrics` | AA budget ledger + TTFT/TPS (dormant without key) |
| `GET /api/or/benchmarks` | OpenRouter benchmark indices/accuracy |
| `GET /api/analytics/requests` | own traffic: success, status, latency, TTFB (failures included since this sprint) |
| `GET /api/fallback/rate-limit-usage` | quota_state windows per model/platform |
