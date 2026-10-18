# JiMesh Repository State — Complete Documentation

**Branch**: `feat/s186-wp3-workspace-file-editor` (includes all work below)
**Base**: `main` at commit `d3682c03` (feat(s186-wp3): Workspace-Datei-Editor)
**Date**: 2026-10-04

---

## ✅ COMPLETED — Already in Branch

### 1. Workspace File Editor (SPRINT-186 WP3)
**Files**: 
- `src/frontend/src/components/workspaces/WorkspaceFileEditor.tsx`
- `src/frontend/src/components/workspaces/WorkspaceFileEditor.test.tsx`
- `src/frontend/src/components/workspaces/FileBrowser.tsx` (modified)
- `src/frontend/src/lib/workspace-files.ts` (new)
- 60 locale files updated (`meshsquadChat.*` keys)

**Features**:
- Text/Markdown editing with Edit/Preview tabs
- Inline editor overlay (textarea + react-markdown preview)
- Only editable extensions: `.md`, `.txt`, `.json`, `.yaml`, `.yml`, `.toml`, `.ini`, `.conf`, `.cfg`, `.sh`, `.py`, `.js`, `.ts`, `.tsx`, `.jsx`, `.go`, `.rs`, `.java`, `.kt`, `.swift`, `.rb`, `.php`, `.cs`, `.cpp`, `.c`, `.h`, `.hpp`, `.css`, `.scss`, `.less`, `.html`, `.htm`, `.xml`, `.svg`, `.dockerfile`, `.makefile`, `.gitignore`, `.env`, `Dockerfile`, `Makefile`, dotfiles
- Binary files (images, archives) remain download-only
- i18n: 11 new keys × 60 locales = 660 translations (en/de hand-written, 58 fallback)
- Tests: 4/4 passing (gating, raw-body PUT, list invalidation, error handling)

---

### 2. SquadMesh Documentation (feat/squadmesh-docs branch)
**Files** (in `/squadmesh/`):
- `SPEC.md` — Full architecture (81 KB): Governance, Workers, Model/Workflow layers, PyTorch Lightning, Agent Lifecycle, Permissions
- `SPRINTS.md` — 10 sprint areas (S1-S7 + S6 cloud + S7-8 Lightning + S7-9 Lifecycle + S7-10 Permissions)
- `AUDIT_FINDINGS.md` — All audit findings mapped to sprints
- `README.md` — Overview

**Pushed**: `feat/squadmesh-docs` branch (up to date)

---

### 3. SquadMesh Go Implementation (feat/squadmesh-impl branch)
**Files** (in `/squadmesh/`):
```
cmd/main.go                    — Entry point
bus/backend.go, client.go      — Redis Streams message bus
gateway/gateway.go             — HTTP gateway + WebSocket
ws/hub.go                      — WebSocket hub
agent/standalone.go             — Agent runtime
orchestrator/orchestrator.go   — Workflow orchestration
scheduler/scheduler.go         — Scheduling
workers/manager.go             — Worker lifecycle
workers/providers/             — AWS Lambda, GCP Cloud Run, Cloudflare, gVisor, Workerd, Workers AI
governance/governance.go       — Policy engine
governance/tags.go             — Tag-based governance
integrations/registry.go       — Integration registry
integrations/vault.go          — Vault integration
storage/s3.go                  — S3 storage
internal/config/config.go      — Config
internal/tracing/              — OpenTelemetry tracing
```

**Blocker**: Go module dependencies fail on `superleo` (otel SDK resource version mismatch, field_mask invalid revision). Cannot verify compilation locally. Docker build fails (no go.sum).

**Pushed**: `feat/squadmesh-impl` branch (up to date)

---

### 4. MeshSquad Integration Docs (in main repo)
**Files**:
- `SQUADMESH_JIMESH_INTEGRATION.md` — Connector system, OpenCode/LangGraph/DeepAgents, temp worker deployment
- `ST2_AGENT_BUILDER_INTEGRATION.md` — meshsquad-public team creator → jimesh port plan

---

### 5. MeshSquad Team Builder Frontend (NEW — this commit)
**Components** (`src/frontend/src/components/meshsquad/`):
- `RoleNode.tsx` — Canvas node (react-flow), left handle=input, right handle=output
- `RolePanel.tsx` — Full role editor (name, instructions, watches, react_mode, max_react_loop, result_kind, request_kind, mandates, harness, tools)
- `TeamForm.tsx` — Team config (name, orchestrator_instructions, max_round, max_sub_agents, mandates, save-as name)
- `TeamsList.tsx` — Table: Name, Source, Active, Actions (Load/Activate/Delete)

**Library** (`src/frontend/src/lib/meshsquad/`):
- `types.ts` — TeamConfig, RoleDefinition, REACT_MODES, HARNESS_NAMES (mirrors meshsquad-public agents.py)
- `api.ts` — MeshsquadApiClient (fetch-based, calls crew API directly: GET/POST /teams, /teams/{name}/activate, DELETE /teams/{name})

**Views**:
- `MeshSquadTeamBuilderPage.tsx` — `/chat/team-builder` (3-panel: TeamsList | Canvas/List | TeamForm+RolePanel)
- `MeshSquadTeamBuilderEntry.tsx` — Sidebar entry (AI section, below MeshSquadChatEntry)

**Integration**:
- Route added in `App.tsx`: `/chat/team-builder`
- Sidebar entry in `HierarchySidebar.tsx`
- Shared gating via `useMeshSquadChatStatus()` (same as chat entry)
- 44 i18n keys `meshsquadTeamBuilder.*` added to en.json + de.json, propagated to 58 locales
- Calls meshsquad crew API directly from browser (requires CORS on meshsquad side, no jimesh proxy)

**Architecture**: Meshsquad-public team creator ported to jimesh. Operator assembles teams visually → saved to meshsquad crew API → deployed by meshsquad runtime.

---

### 6. Stitch Design Prompts
**File**: `STITCH_DESIGN_PROMPTS.md` — 9 detailed prompts for missing UIs:
1. React Flow Canvas (Team Builder center panel)
2. Plugin Install Wizard — meshsquad config step (crewApiUrl + X-API-Key + test connection)
3. Workers Dashboard (S1 hybrid runtime: gVisor, Cloudflare, AWS Lambda, GCP Cloud Run, Workerd)
4. SquadMesh Gateway Status (WebSocket connections, bus metrics, topology)
5. Agent Lifecycle Manager (S7-9: spawn, scale, hibernate, terminate)
6. Permission Scoping UI (S7-10: subjects/resources/policies, CEL conditions)
7. PyTorch Lightning Training Dashboard (S7-8: runs, experiments, models registry)
8. Cloud Provider Worker Config (S6: AWS/GCP/Cloudflare credentials + defaults)
9. MeshSquad Chat Message View (meshsquad-public Tinode client skin)

**API Key**: `STITCH_API_KEY` in `.env` (gitignored) — endpoint `https://stitch.googleapis.com/v1/generate` returns 404 (API may not be public/stable yet)

---

## 📋 PENDING — Must Do Next

### Immediate (Unblock SquadMesh Go)
| Task | Owner | Status |
|------|-------|--------|
| Fix Go module deps: use compatible otel versions (v1.24.0 for otel/sdk/sdk.resource) | Backend | Blocked on superleo |
| Generate go.sum via `go mod tidy` in container with Go 1.23 | Backend | Blocked |
| Create Makefile (bind-mount + golang:latest runtime compilation) | Backend | Not started |
| Verify `cmd/main.go` compiles, run integration tests | Backend | Blocked |

### Sprint 1 (S1) — Core SquadMesh
| Task | Spec Ref | Status |
|------|----------|--------|
| Message bus (Redis Streams) — publish/subscribe/ack | SPEC.md §2 | Implemented in `bus/` |
| Gateway — REST + WebSocket `/ws` | SPEC.md §3 | Implemented in `gateway/`, `ws/` |
| Workers runtime — gVisor, Workerd, Cloudflare, AWS Lambda, GCP Cloud Run | SPEC.md §4 | Implemented in `workers/providers/` |
| WorkerManager Dashboard (Stitch Prompt #3) | SPEC.md §4.5 | **Needs Stitch design** |
| Gateway Status page (Stitch Prompt #4) | SPEC.md §3.5 | **Needs Stitch design** |

### Sprint 2 (S2) — Model/Workflow/Invocation Layers
| Task | Spec Ref | Status |
|------|----------|--------|
| Model layer — registry, versioning, serving | SPEC.md §5 | Not started |
| Workflow layer — DAG execution, checkpoints | SPEC.md §6 | Not started |
| Invocation layer — agent calls, tool calls, streaming | SPEC.md §7 | Not started |

### Sprint 3 (S3) — PyTorch Lightning (S7-8)
| Task | Spec Ref | Status |
|------|----------|--------|
| LightningModule wrapper for SquadMesh workers | SPEC.md §8 | Not started |
| Training Dashboard (Stitch Prompt #7) | SPEC.md §8.5 | **Needs Stitch design** |
| Model registry + ONNX export | SPEC.md §8.6 | Not started |

### Sprint 4 (S4) — Agent Lifecycle (S7-9)
| Task | Spec Ref | Status |
|------|----------|--------|
| Spawn/scale/hibernate/terminate API | SPEC.md §9 | Not started |
| Agent Lifecycle Manager (Stitch Prompt #5) | SPEC.md §9.5 | **Needs Stitch design** |
| Temporary worker deployment (agents deploy agents) | SPEC.md §9.7 | Not started |

### Sprint 5 (S5) — Permission Scoping (S7-10)
| Task | Spec Ref | Status |
|------|----------|--------|
| Fine-grained RBAC engine | SPEC.md §10 | Not started |
| Permission Scoping UI (Stitch Prompt #6) | SPEC.md §10.5 | **Needs Stitch design** |
| Audit trail + GitOps export/import | SPEC.md §10.6 | Not started |

### Sprint 6 (S6) — Cloud Providers
| Task | Spec Ref | Status |
|------|----------|--------|
| Provider configs (Stitch Prompt #8) | SPEC.md §11 | **Needs Stitch design** |
| Credentials in Vault + rotation | SPEC.md §11.3 | Not started |

### Frontend Polish
| Task | Status |
|------|--------|
| React Flow Canvas for Team Builder (Stitch Prompt #1) | **Needs Stitch design** |
| Plugin Install Wizard meshsquad step (Stitch Prompt #2) | **Needs Stitch design** |
| MeshSquad Chat Message View (Stitch Prompt #9, meshsquad-public repo) | **Needs Stitch design** |
| Run `npm run lint` + `npm test` + `npm run check:i18n` | Passes (371 pre-existing missing keys unrelated) |

---

## 🔗 INTEGRATION POINTS (Cross-Repo)

| JiMesh Component | Meshsquad-Public Component | Contract |
|------------------|---------------------------|----------|
| `MeshSquadChatSpacePage` → `/chat/space` | chat-gateway topic_map | GET/POST `/chat/channels` |
| `MeshSquadTeamBuilderPage` → `/chat/team-builder` | server.py Team Assembly | GET/POST `/teams`, `/teams/{name}/activate` |
| `meshSquadChatDeepLink()` | plugin installation config | `crewApiUrl` + optional `X-API-Key` |
| `useMeshSquadChatStatus()` | plugin catalog + installations | GET `/api/plugins`, `/api/plugin-installations` |
| Plugin lifecycle routes | `gateway/meshsquad.go` | status/health/uninstall |

**CORS Requirement**: Meshsquad crew API MUST send `Access-Control-Allow-Origin: <jimesh-dashboard-origin>` for all `/chat/*` and `/teams/*` endpoints.

---

## 🌿 BRANCH STATUS

| Branch | Purpose | Status |
|--------|---------|--------|
| `main` | Stable | At `d3682c03` |
| `feat/s186-wp3-workspace-file-editor` | Workspace Editor + Team Builder | **HEAD** (this doc) |
| `feat/squadmesh-docs` | SPEC/SPRINTS/AUDIT | Pushed, up to date |
| `feat/squadmesh-impl` | Go implementation | Pushed, up to date (deps broken) |

---

## 🚀 NEXT ACTIONS (Priority Order)

1. **Fix Go deps** → verify SquadMesh compiles → `make build` in container
2. **Run Stitch prompts** (9 designs) → drop components into `src/views/`, `src/components/`
3. **Wire Stitch outputs** → add routes, sidebar entries, i18n keys
4. **S1 Integration Test**: Deploy SquadMesh + meshsquad-public → test Team Builder → Chat Space flow
5. **S2-S5**: Implement backend layers per SPEC.md
6. **Merge** `feat/s186-wp3-workspace-file-editor` → `main` (after review)
7. **Merge** `feat/squadmesh-docs` → `main` (docs only, safe)
8. **Merge** `feat/squadmesh-impl` → `main` (after Go deps fixed)

---

## 📁 KEY FILE LOCATIONS

```
jimesh/
├── SQUADMESH_JIMESH_INTEGRATION.md
├── ST2_AGENT_BUILDER_INTEGRATION.md
├── STITCH_DESIGN_PROMPTS.md
├── REPO_STATE.md (this file)
├── squadmesh/                    # Go implementation (feat/squadmesh-impl)
│   ├── SPEC.md
│   ├── SPRINTS.md
│   ├── AUDIT_FINDINGS.md
│   ├── cmd/main.go
│   ├── bus/, gateway/, ws/, agent/, orchestrator/, scheduler/
│   ├── workers/providers/
│   ├── governance/, integrations/, storage/, internal/
│   ├── go.mod (deps broken)
│   └── docker-compose.yml
├── src/
│   ├── backend/internal/gateway/meshsquad.go   # Plugin lifecycle routes
│   └── frontend/
│       ├── src/
│       │   ├── components/meshsquad/           # RoleNode, RolePanel, TeamForm, TeamsList
│       │   ├── components/sidebar/MeshSquadTeamBuilderEntry.tsx
│       │   ├── lib/meshsquad/                  # types.ts, api.ts
│       │   ├── lib/meshsquad-chat.ts           # Chat space client
│       │   ├── views/MeshSquadTeamBuilderPage.tsx
│       │   ├── views/MeshSquadChatSpacePage.tsx
│       │   ├── App.tsx                         # Routes
│       │   └── components/sidebar/HierarchySidebar.tsx
│       └── scripts/add-sprint186-meshsquad-team-builder-i18n.mjs
└── meshsquad-public/ (separate repo)
    ├── frontend/src/components/                # Source of RoleNode, RolePanel, TeamForm, TeamsList
    ├── frontend/src/lib/api.ts + types.ts
    └── chat-gateway/ (topic_map, tinode bridge)
```

---

**Generated**: 2026-10-04 by opencode session
**Action**: Commit this file to `feat/s186-wp3-workspace-file-editor` and push

---

# Security & Observability — SPRINT-186 (added 2026-10-04)

This section documents the security/observability work done on this branch
(firewall observation, internal threat detection, Grafana dashboards) and the
parts that are still missing. Everything below is verified against the code as
of this commit; nothing here is aspirational unless explicitly marked MISSING.

## Built and verified in this branch

### 1. Grafana dashboards — file-provisioned, no import step

`deploy/grafana/provisioning/dashboards/default.yml` watches
`/var/lib/grafana/dashboards`, so dropping a JSON in that directory is enough.
Six dashboards ship:

| uid | file | panels | fed by scrape job |
|---|---|---|---|
| `jimesh-falco` | `deploy/grafana/dashboards/falco.json` | 15 | `falco` → `jimesh-siem-falco:8765` |
| `jimesh-suricata` | `deploy/grafana/dashboards/suricata.json` | 23 | `suricata_exporter` → target NOT deployed |
| `jimesh-postgres` | `deploy/grafana/dashboards/postgres.json` | 32 | `postgresql` |
| `jimesh-redis` | `deploy/grafana/dashboards/redis.json` | 12 | `redis_exporter` |
| `jimesh-firewall` | `deploy/grafana/dashboards/firewall.json` | 8 | `jimesh-backend` (+ router job commented out) |
| `jimesh-threat-detection` | `deploy/grafana/dashboards/threat-detection.json` | 10 | `jimesh-backend` |

The two newer dashboards were generated and validated by
`/tmp/opencode/validate_dashboards.py`, which cross-checks every PromQL metric
token against the metric contract below and fails on an invented name (verified
by injecting a fake metric: negative control returns exit 1).

### 2. Metric contract

No `prometheus/client_golang` dependency was added — it was deliberately removed
in S55-3 and both expositions are hand-written Prometheus 0.0.4 text.

**Backend `GET /metrics`** (route registered in
`src/backend/internal/ai/aihandlers.go:56`, handler
`src/backend/internal/ai/metrics.go`; reachable on the container network,
deliberately unauthenticated like `/ready` — see `internal/ai/metrics.go`):

| family | labels | notes |
|---|---|---|
| `jimesh_guard_requests_total` | `scanner`, `verdict` = `block\|allow\|bypass` | prompt-injection verdicts |
| `jimesh_guard_response_scans_total` | `scanner`, `verdict` = `redact\|pass\|bypass` | response side |
| `jimesh_guard_secret_scans_total` | `verdict` = `block\|warn\|allow` | regex secret scanner |
| `jimesh_ebpf_enforcement_total` | `result` = `enforced\|missed\|failed\|skipped` | Tetragon marker kill |
| `jimesh_guard_configured` | — | gauge 0/1 |
| `jimesh_guard_enforcement_mode` | — | gauge 0/1 (`guard_scanner.enforcement == "ebpf"`) |
| `jimesh_firewall_rules_applied` | `container` | from the freshest `POST /api/firewall/report` |
| `jimesh_firewall_rule_packets` | `container`, `table`, `chain`, `handle`, `index` | **gauge**, resets on re-apply |
| `jimesh_firewall_rule_bytes` | same | gauge |
| `jimesh_firewall_report_age_seconds` | — | `NaN` until first report |
| `jimesh_firewall_report_up` | — | 1 iff age <= 90s (`FirewallReportStaleAfter`) |
| `jimesh_firewall_last_report_rules` | — | `len(report.Rules)` |

**Router `GET /metrics`** (`src/backend/cmd/jimesh-router/metrics.go`, route in
`ingest_http.go`) emits the same `jimesh_firewall_*` families from the router's
own apply/read-back cycle. It binds `127.0.0.1:3100`, which the Prometheus
container cannot reach, so its scrape job in `deploy/grafana/prometheus/prometheus.yml`
is **commented out on purpose** with the three enable conditions spelled out in
the file. The backend source is the one that actually scrapes today.

Metric names carry no `_total` on the firewall families because nft counters are
deleted and recreated on every reconcile — they are instantaneous reads, not
monotonic counters.

### 3. Firewall observation (nft counters end to end)

- `renderInboundRuleset` (`src/backend/cmd/jimesh-router/firewall.go`) emits a
  `counter` statement before every `accept` (3 base rules + the grant loop).
- `EffectiveRule` (`src/backend/internal/security/firewall_provider.go:113-134`)
  gained `Packets`/`Bytes` with `omitempty`; `nftCounterRe` extracts
  `counter packets N bytes M` from the `nft list ruleset` text arm while `Text`
  keeps the raw line so existing consumers are unaffected.
- The values survive the wire: `POST /api/firewall/report` decode → in-memory
  store → `GET /api/firewall/status` encode. Covered by
  `TestFirewallReportCountersSurviveTheWire`; the status payload itself changed
  zero lines, so `src/frontend/src/lib/firewall-provider.ts` still matches.
- `nft` syntax was verified with `nft -c -f` inside an isolated
  `unshare -Urn` netns, not against a production kernel.

### 4. Internal threat detection — two real bugs fixed

- **Guard scans were counted as `chat`.** `typeCounts` in
  `src/backend/internal/analytics/analytics_derived.go` now has a dedicated
  `guard-scan` bucket; list and detail rows go through `requestTypeOrChat()`.
- **Fail-open windows were invisible.** When the guard is configured but the
  model is unreachable, `guard_hook.go` now writes a `security_events` row
  (`event_type=guard_bypass`, `scanner=llama-guard`, `verdict=warn`,
  `direction=request|response`, `status=open`) instead of only `log.Printf`.
  The "guard not configured" path is deliberately NOT recorded — that is not a
  bypass.

### 5. `GET /api/security/events` is now queryable

Optional params, all defaulting to today's behaviour: `?scanner=`,
`?event_type=`, `?verdict=`, `?status=`, `?limit=` (capped, not unbounded),
`?from=`/`?to=` (RFC3339, malformed → 400). Response is
`{"events":[...],"summary":{...}}` — never `null`. Filter logic lives in
`src/backend/internal/store/security_events.go` (`SecurityEventFilter`,
`ListSecurityEventsFiltered`, `SecurityEventSummary`).

## Fixed while doing the above

- **`deploy/grafana/prometheus/prometheus.yml` was invalid YAML.** Three jobs
  (`redis_exporter`, `falco`, `suricata_exporter`) were indented 4 spaces
  instead of 2, so Prometheus could not load the file at all — postgres and
  redis dashboards were dead too. Verified fixed with `yaml.safe_load`; the file
  now parses with 6 jobs.
- The `suricata_exporter` scrape target **does not exist anywhere in this repo**.
  The job is kept as a declared intent with an honest comment (target stays
  DOWN, dashboard reads "No data") rather than deleted to make a panel green.

## Gate results (this commit)

```
cd src/backend && go build ./...                     OK
cd src/backend && go vet ./...                        OK
cd src/backend && go test ./...                       exit 0, 32 packages, 0 failures
gofmt -l (touched packages)                           clean (internal/store/store.go pre-existing)
prometheus/client_golang in go.mod                    absent, as required
python3 yaml.safe_load(prometheus.yml)                VALID
src/frontend tsc -p tsconfig.app.json --noEmit        8 errors, ALL pre-existing and in
                                                      UNMODIFIED files (WidgetSettingsDrawer.tsx,
                                                      HierarchySidebar.tsx); 0 in files touched here
```

## MISSING — honest gaps, not started in this session

1. **i18n for the Grafana widget.** `dashboards.grafana.*` (12 keys) and
   `dashboards.sessionRequired` are referenced by
   `src/frontend/src/components/dashboard/grafana-dashboards-widget.tsx` but are
   absent from all 60 locales, so that widget renders raw keys. Explicitly
   deferred to a dedicated translation session (operator decision:
   English-only from here on). The two new dashboards have NO widget entries
   yet for the same reason.
2. **Firewall scrape target.** The router job is commented out; the
   backend job is the working one. See the three enable conditions in
   `deploy/grafana/prometheus/prometheus.yml`.
3. **Suricata exporter.** No implementation exists — only the job and the
   dashboard target it.
4. **Suricata eve.json ingestion into JiMesh.** Still not built; there is only
   the SSH status pull (`internal/gateway/suricata.go`) and the local
   threat-responder tail.
5. **Alerting.** No Alertmanager anywhere, no `rule_files`/`alerting:` in
   `prometheus.yml`, no notification rule engine. The only notifier is
   `notify.Dispatcher`, called exactly once (threat correlation → SMTP).
   `docs/SCHEMA-notifications.md` specifies `threat.prompt_injection` but has
   zero producer code.
6. **Streaming bypasses the guard.** `internal/ai/proxy.go` runs the guard for
   non-streaming responses only; the SSE path, `handleEmbeddingsProxy` and
   `handleChatCompletionsWS` have no guard call.
7. **Only the last user message is scanned** (`lastUserMessageContent`), and
   multimodal/non-string content is skipped without an event.
8. **eBPF enforcement is default OFF and never proven live.** SPRINT-139 WP7
   (`make redeploy SERVICE=tetragon` + E2E) is still open. The kernel arm kills
   a self-generated marker process only — it does not analyse prompts
   (`docs/K-LAF-ARCHITECTURE.md` §8b).
9. **No Llama Guard model is referenced anywhere.** `meta-llama/Llama-Guard-3-8B`
   has zero hits in the repo; the guard only runs if the operator wires a chain.
10. **Wazuh has no Grafana dashboard** (needs an OpenSearch datasource this
    stack does not have); Wazuh ships its own UI on `127.0.0.1:5601`.
11. **`runsc`/gVisor is not installed on superleo** (`config.yml`
    `install_gvisor: false`), blocked by S180-14/S180-15.
12. **A "bpf jailer" integration does not exist and was rejected on purpose** —
    see `docs/sprints/SPRINT-139-TETRAGON-EBPF-ENFORCEMENT.md` (Tetragon chosen
    over BpfJailer because the latter is not open source) and
    `docs_dev/reference/ebpf/jailer.md` ("observe, do not integrate").

**Generated**: 2026-10-04 by opencode session
