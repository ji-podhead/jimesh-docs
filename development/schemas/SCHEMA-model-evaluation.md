# Model Evaluation Schema — What We Measure and How

## Overview

Every model in the JiMesh catalog is evaluated across two dimensions:
1. **Static facts** — inherent model properties (context length, pricing, modality)
2. **Dynamic parameters** — live performance metrics measured by the proxy

This document defines every field we track, its source, its category,
and how the enrichment pipeline populates it.

---

## Static Facts (Model Inherent Properties)

These rarely change. Sources: OpenRouter, Artificial Analysis, model card, SearXNG.

| Field | Type | Source | Description |
|---|---|---|---|
| `context_length` | int | OpenRouter / model card | Max input context window (tokens) |
| `input_price_per_m` | float | OpenRouter | Cost per 1M input tokens (USD) |
| `output_price_per_m` | float | OpenRouter | Cost per 1M output tokens (USD) |
| `supports_vision` | bool | OpenRouter `input_modalities` | Accepts image input |
| `supports_tools` | bool | OpenRouter `supported_parameters` | Supports function calling |
| `supports_streaming` | bool | OpenRouter `supported_parameters` | Supports SSE streaming |
| `supports_reasoning` | bool | OpenRouter / Artificial Analysis | Has reasoning/thinking mode |
| `modality` | string | OpenRouter `architecture.modality` | text, vision, audio, multimodal |
| `architecture` | string | OpenRouter `architecture` | MoE, dense, etc. |
| `tokenizer` | string | OpenRouter `architecture.tokenizer` | Tokenizer name |
| `max_completion_tokens` | int | OpenRouter `top_provider` | Max output tokens per request |
| `mmlu_score` | float | Artificial Analysis | MMLU benchmark score (0-100) |
| `humaneval_score` | float | Artificial Analysis | HumanEval coding benchmark (0-100) |
| `quality_score` | float | Artificial Analysis | Aggregated quality score |
| `speed_benchmark` | float | Artificial Analysis | Tokens/s in controlled test |

---

## Semi-Static Facts (Change Occasionally)

Sources: Artificial Analysis, periodic re-evaluation.

| Field | Type | Source | Description |
|---|---|---|---|
| `benchmark_tps` | float | Artificial Analysis | Throughput in controlled environment |
| `benchmark_ttfb_ms` | float | Artificial Analysis | TTFB in controlled environment |
| `provider_uptime_24h` | float | Health checks (rolling) | Uptime % over 24h window |
| `provider_uptime_7d` | float | Health checks (rolling) | Uptime % over 7d window |

---

## Dynamic Parameters (Live, Proxy-Measured)

These change with every request. Sources: request_log, response headers, health checks.

| Field | Type | Source | Description |
|---|---|---|---|
| `avg_ttfb_ms` | int | `request_log` (24h avg) | Average time to first byte |
| `avg_tps` | float | `request_log` (24h avg) | Average output throughput (tokens/s) |
| `avg_latency_ms` | int | `request_log` (24h avg) | Average total request latency |
| `error_rate` | float | `request_log` (24h) | Error % (non-2xx responses) |
| `success_count_24h` | int | `request_log` (24h) | Successful requests in 24h |
| `total_count_24h` | int | `request_log` (24h) | Total requests in 24h |
| `quota_remaining` | float | Response headers | Remaining quota ratio (0..1) |
| `quota_reset_at` | timestamp | Response headers | When quota resets |
| `cost_today` | float | `request_log` (today) | Total cost today |
| `cost_month` | float | `request_log` (month) | Total cost this month |
| `availability` | string | Health check | green/yellow/red |
| `overload_count_24h` | int | `request_log` (24h) | 503/529 count in 24h |

---

## Routing Parameters (Used by sortKeysByQuota)

These are derived from dynamic parameters and drive the routing decision.

| Parameter | Weight | Source | Description |
|---|---|---|---|
| `is_free_key` | ALWAYS first | `keys.is_paid` | Free keys always before paid |
| `quota_remaining_ratio` | Stage 1 (desc) | Response headers | Higher = preferred |
| `avg_ttfb_ms` | Stage 2 (asc) | `request_log` | Lower = preferred |
| `avg_tps` | Stage 3 (desc) | `request_log` | Higher = preferred |
| `bandit_score` | Blend (0.7) | Feedback loop | Learned routing weight |
| `user_preference` | Blend (0.3) | `container_members` | Manual override |

---

## Entropy Parameters (Sprint 13 WP1)

| Parameter | Default | Source | Description |
|---|---|---|---|
| `entropy` | 0 | Per-request | Avg normalized Shannon entropy |
| `escalated` | false | Per-request | True if escalated to reasoning |
| `entropy_threshold` | 0.45 | Settings | Escalation threshold |
| `planner_model` | nemotron-nano | Model roles | Routing role model |

---

## Enrichment Pipeline

```
Model in catalog
     │
     ▼
┌─────────────────────────────────────────┐
│ Stage 1: OpenRouter Lookup              │
│ GET openrouter.ai/api/v1/models         │
│ → context_length, pricing, modality,   │
│   supported_parameters, architecture    │
│ Store in: model_enrichment (source=or)  │
└────────────────┬────────────────────────┘
                 │ not found?
                 ▼
┌─────────────────────────────────────────┐
│ Stage 2: Artificial Analysis Lookup      │
│ (requires API key in settings)           │
│ → MMLU, HumanEval, quality_score,       │
│   speed_benchmark, benchmark_tps/ttfb    │
│ Store in: model_enrichment (source=aa)   │
└────────────────┬────────────────────────┘
                 │ not found?
                 ▼
┌─────────────────────────────────────────┐
│ Stage 3: SearXNG Search + Utility Model  │
│ 1. SearXNG: search "{model} benchmark"   │
│ 2. Utility model extracts JSON:          │
│    { context_length, pricing, modality } │
│ Store in: model_enrichment (source=sx)   │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ Stage 4: Fuzzy Deduplication             │
│ Group by base ID (strip prefix, -free)   │
│ Enrichment shared across variants        │
│ Duplicate models flagged                 │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ Stage 5: Dynamic Parameters (separate)   │
│ Live from request_log, response headers  │
│ Updated on every request                 │
│ NOT cached — always fresh                │
└─────────────────────────────────────────┘
```

---

## DB Schema for Enrichment

```sql
CREATE TABLE model_enrichment (
    model_id TEXT NOT NULL,
    field TEXT NOT NULL,           -- context_length, input_price_per_m, etc.
    value TEXT NOT NULL,           -- JSON-encoded value
    source TEXT NOT NULL,          -- openrouter, artificial_analysis, searxng, manual
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (model_id, field)
);
```

---

## Settings (User-Configurable)

| Setting | Default | Description |
|---|---|---|
| `openrouter_api_key` | "" | API key for OpenRouter enrichment |
| `artificial_analysis_key` | "" | API key for Artificial Analysis |
| `searxng_url` | "http://searxng:8080" | SearXNG instance URL |
| `enrichment_cache_ttl` | "86400" | Enrichment cache TTL in seconds (24h) |
| `fuzzy_dedup_enabled` | "true" | Group identical model classes |

---

## ModelFactSheet Go Struct (from research)

```go
package metadata

type ReferenceSource string

const (
	ArtificialAnalysis ReferenceSource = "artificial_analysis"
	OpenRouter         ReferenceSource = "openrouter"
	ArxivAcademic      ReferenceSource = "arxiv_paper"
	JiMeshProxyLocal   ReferenceSource = "jimesh_telemetry"
	SearXNG            ReferenceSource = "searxng"
)

type ModelFactSheet struct {
	ModelID          string          `json:"model_id"`
	MatchedAliases   []string        `json:"matched_aliases"`     // Fuzzy-matched duplicates
	PrimaryReference ReferenceSource `json:"primary_reference"`  // Where architecture data comes from

	Architecture struct {
		IsMoE            bool   `json:"is_moe"`
		TotalParameters  int64  `json:"total_parameters"`
		ActiveParameters int64  `json:"active_parameters"`
		ContextWindow    int    `json:"context_window"`
		SpeculativeDraft string `json:"recommended_draft_model,omitempty"`
	} `json:"architecture"`

	AcademicCitations []string `json:"academic_citations"` // e.g. ["arXiv:2406.04692"]

	GroundTruthMetrics map[ReferenceSource]struct {
		TTFBms              float64 `json:"ttfb_ms"`
		TokensPerSec        float64 `json:"tokens_per_sec"`
		InputCostPerMillion  float64 `json:"input_cost_usd_m"`
		OutputCostPerMillion float64 `json:"output_cost_usd_m"`
	} `json:"ground_truth_metrics"`
}
```

This struct ensures the proxy uses hardcoded, scientifically and empirically
validated parameters (context limits, real parameter sparsity) as weighting
in routing decisions — not just vague model names.
