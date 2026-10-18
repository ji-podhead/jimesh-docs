# Sprint 10 — NVIDIA Quota Probes + Stream Token Counting + UI Overhaul

## Goal

Make NVIDIA (and vLLM/NIM-based) quota detection robust without relying
solely on x-ratelimit headers, add stream token counting for real tok/s
on streaming responses, and fix the operator-facing UI (console, sidebar,
canvas, routing metrics).

## Background

- NVIDIA's cloud API (`integrate.api.nvidia.com`) sends **no** x-ratelimit-*
  headers — verified live (200 returns only `nvcf-reqid` + `nvcf-status`).
  The original assumption that headers appear on "some" responses was wrong;
  they appear on NO responses.
- NVIDIA has no user quota limits — models are just sometimes overloaded
  (503/529). The per-pool overload retry is the correct response, not
  quota harvesting.
- Self-hosted NIM containers expose `/v1/health/ready` (readiness) —
  zero-cost health check. The cloud API 404s on this endpoint (expected).
- Stream responses don't include `usage` by default — `stream_options.include_usage`
  must be injected to get token counts for tok/s.

## Work Packages

### WP1 — x-header verification + NVIDIA readiness probe ✅
- [x] Verified `RecordQuotaFromResponse` reads ALL response headers via
  `resp.Header.Get(spec.Limit/Remaining/Reset)` — the code is correct;
  NVIDIA simply doesn't send them (proven live).
- [x] Added `nim-health` probe method: `GET /v1/health/ready` (zero-cost,
  no tokens). 200 = healthy, 404 = not available on cloud API.
- [x] Added header diagnostic: when 0 observations harvested, logs ALL
  response headers so the operator sees what was actually sent.
- [x] Updated NVIDIA schema to be honest: `HeadersOn: "none"`,
  `OwnBench: true`, methods = `nim-health` + `models-health`.
- [ ] `nim-metrics` (Prometheus `/v1/metrics` parsing) — deferred.
  Self-hosted NIM only; NVIDIA cloud 404s. Low priority.

### WP2 — Stream token counting (stream_options.include_usage) ✅
- [x] Chat proxy injects `stream_options: {"include_usage": true}` when
  `stream: true` is in the request body, before forwarding upstream.
- [x] `streamUsageReader` wraps the SSE pass-through and extracts
  `prompt_tokens` / `completion_tokens` via regex (not fragile JSON slicing).
- [x] Sandbox-proven: SSE mock returns `usage: {prompt_tokens: 7,
  completion_tokens: 3}` → `request_log` persists `7|3` → tok/s computed.
- [x] `/api/analytics/models` now returns `avgTtfbMs` + `avgTps` (from
  `ModelTTFBAvg()` + `ModelThroughputAvg()`).

### WP3 — API_DOCS + sprint doc sync ✅
- [x] API_DOCS.md updated with: streaming injection, NVIDIA schema change,
  key performance routing, quota header diagnostic, analytics/models
  avgTtfbMs/avgTps fields.
- [x] Sprint doc updated with actual outcomes (this file).
- [x] BACKLOG.md mirrored.

### WP4 — Console SSE fix ✅
- [x] EventSource URL: hardcoded external port `9091` (was using
  `NEXT_PUBLIC_BACKEND_PORT=3010` — internal Docker port, browser can't reach).
- [x] `log.Printf` → `s.log.Printf` for 5 proxy routing log calls — the
  `serverLogBridge` only wraps `s.log`, not the standard library logger.
- [x] Sandbox-proven: `[proxy] → attempt 1 POST...` appears live in SSE.

### WP5 — Routing: TTFB + throughput as tie-breakers ✅
- [x] `KeyPerformanceStats()` query: per-key `AVG(ttfb_ms)` +
  `AVG(output_tokens / (latency - ttfb))` from `request_log` (last 24h).
- [x] `sortKeysByQuota` now 3-stage: quota remaining (desc) → TTFB (asc) →
  throughput (desc). Same-quota keys are ordered by performance.

### WP6 — UI overhaul ✅
- [x] Info box (Quota & Rate-Limit detection) moved to top of mesh tab.
- [x] Quick Test curl: compact 4th card next to Endpoint/Model/Token +
  Show modal (Eye button opens Dialog with curl command).
- [x] Provider Endpoints & Keys moved below the logs widget.
- [x] Logs widget: expand/collapse button (default h-52, toggle h-[32rem]).
- [x] Sidebar: 6 static "No data" panels replaced with real analytics
  (error distribution, recent errors, recent calls, per-key performance)
  + `refetchInterval: 5000` for live auto-refresh.
- [x] Mini traffic stats bars inside pool node members (Req/OK/Lat/TPS).
- [x] Canvas hint: "Drag between nodes to connect · Double-click an edge
  (or select + Backspace) to delete".
- [x] Trashcan drag fix: `elementsFromPoint` (plural) — was
  `elementFromPoint` which returned the dragged node instead of the
  trashcan underneath.
- [x] Removed legacy Edit (Pencil) button → opened useless ModelDetailPage.
- [x] Pref field: static `<span>` → editable `<input>` (0-10, step 0.5,
  persists immediately).
- [x] Removed dead "Save Pool as Preset" button (could save but not load).
- [x] Max Overload Retries added to pool tuning panel (gear icon on
  existing pools — was only at creation time).

## Acceptance Criteria

- [x] RecordQuotaFromResponse verified to read all headers (NVIDIA sends none)
- [x] nim-health probe method added to providerSchemas
- [x] Stream responses produce non-zero token counts in request_log (7|3 proven)
- [x] /api/analytics/models shows tok/s for streaming traffic
- [x] API_DOCS updated
- [x] Console SSE shows [proxy] routing logs live
- [x] Routing uses TTFB + throughput as tie-breakers
- [x] Sidebar shows real analytics data with auto-refresh
- [x] Canvas: trashcan drag, edge hint, mini stats, editable pref

## Deferred

- `nim-metrics` (Prometheus `/v1/metrics` parsing) — self-hosted NIM only.
- Proto/gRPC fields — `protoc` not available in sandbox (documented limitation).
- favicon.ico 500 — cosmetic.
