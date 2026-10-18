# HANDOFF 2026-10-05 — OTEL TRACING + S174 PHASE 2

## Status: BLOCKED auf oteltrace.go Syntaxfehler

### Was läuft (Commit `399702d2` auf `feat/s174-oteltrace-phase2`)

| Feature | Status | Files |
|---------|--------|-------|
| **S170-E2 Auth Fix** | ✅ | `auth.go` — Keycloak Token Validierung für `/utility/*` (same chain wie `/embed`) |
| **Utility Proxy** | ✅ | `project_utility.go`, `gateway.go` — `/utility/{id}/*` Reverse Proxy |
| **ClickHouse Schema + Deployment** | ✅ | `deploy/clickhouse/` |
| **Kafka Deployment Config** | ✅ | `deploy/kafka/` |
| **OpenReplay Deployment Config** | ✅ | `deploy/openreplay/` |
| **Log Schema** | ✅ | `logschema/logschema.go` — 30+ LogTypes, Retention, Topics |
| **Logger SDK** | ✅ | `logger/logger.go` — Redis + OpenSearch dual output |
| **OpenSearch Client** | ✅ | `opensearch/opensearch.go` — bulk, semantic search, ILM |
| **Store Methods** | ✅ | `store/store.go` — TraceSession, NetworkEvent, Span |
| **Stream Topics Extended** | ✅ | `streams/streams.go` — 14 neue Topics |
| **Traces API** | ✅ | `gateway/traces_api.go` — Sessions, Spans, Network Events, Replay |
| **Frontend Components** | ✅ | `TraceWaterfall.tsx`, `NetworkEventsTable.tsx`, `OpenReplayEmbed.tsx` |
| **OTel Instrumentation** | ⚠️ | Call-Sites in Gateway, AI Proxy, Utility, Deploy, SIEM Bridge |

### Blockierer: `oteltrace.go` Syntaxfehler

**Fehler:** Doppelte Typ-Deklarationen im File (File ist 2x vorhanden — doppelte `type noopTracer`, `type otelTracer`, `type fileTracer`, `var globalTracer/initOnce`)

**Datei:** `src/backend/internal/oteltrace/oteltrace.go` (428 Zeilen, duplizierter Content)

**Lösung:** File auf erste vollständige Implementation kürzen (bis `func genID() string {`), dann einmalig Constants/Init/Wrapper anhängen.

### Offene PRs / Branches

| Branch | Status |
|--------|--------|
| `feat/s174-oteltrace-phase2` | **Aktiv** — WIP oteltrace.go Fix |
| `main` | Sauber bis `399702d2` |
| `origin/main` | `7b36b1c7` (16 Commits hinterher) |

### Nächste Schritte (für nächste Session)

1. **oteltrace.go bereinigen:**
   ```bash
   # File auf erste vollständige Implementation kürzen (bis genID)
   # Dann EINMALIG Constants/Wrapper/Init anhängen
   ```

2. **Build verifizieren:**
   ```bash
   make go-build && make go-test
   ```

3. **Deploy testen:**
   ```bash
   make redeploy SERVICE=backend NODE=superleo
   # Spans in /opt/jimesh/data/jimesh-spans.jsonl prüfen
   ```

4. **Dann Commit + Push + PR:**
   ```bash
   git add -A
   git commit -m "feat(s174): OTEL tracing pipeline — ClickHouse, OpenSearch, Logger SDK, OTel instrumentation"
   git push origin feat/s174-oteltrace-phase2
   ```

### Verifikation (läuft bereits)

| Test | Ergebnis |
|------|----------|
| `/utility` mit validem Token | ✅ HTTP 302 → code-server |
| `/utility` mit invalid Token | ✅ HTTP 401 |
| `/api/projects` mit same Token | ✅ HTTP 200 |
| Utility Tests | ✅ 14/14 PASS |
| Auth Tests | ✅ 12/12 PASS |

### Offene TODOs (nach oteltrace Fix)

| Priorität | Task |
|-----------|------|
| P0 | oteltrace.go Syntax bereinigen + Build grün |
| P1 | Spans in `/opt/jimesh/data/jimesh-spans.jsonl` verifizieren (File Tracer aktiv via `JIMESH_OTEL_SPANS_PATH=/data/jimesh-spans.jsonl`) |
| P2 | Frontend Traces Page + i18n (60 Locales) + Vitest |
| P2 | OTel Call-Sites verifizieren: AI Proxy, Utility Launch, Project Deploy, SIEM Bridge |
| P3 | OpenReplay Deploy + Frontend Injection |
| P3 | Kafka Pipeline (optional, ClickHouse reicht für Phase 1) |

### Context für nächste Session

- **Branch:** `feat/s174-oteltrace-phase2`
- **Commit Base:** `399702d2` (S174 Phase 1 complete docs)
- **oteltrace.go Problem:** Doppelte Implementierung — File ist 2x im File (History von gescheiterten Write-Versuchen)
- **Fix Strategy:** File auf erste `func genID() string {` + closing brace kürzen, dann einmalig Constants/Wrapper/Init anhängen
- **File Tracer:** Konfiguriert via `JIMESH_OTEL_SPANS_PATH=/data/jimesh-spans.jsonl` in ansible-task.yml
- **Spans File:** `/opt/jimesh/data/jimesh-spans.jsonl` (Owner 65532:65532 gesetzt)
- **OpenReplay:** Config bereit in `deploy/openreplay/`, wartet auf Deploy
- **ClickHouse:** Schema + Docker Compose bereit, wartet auf Deploy
- **Kafka:** Config bereit, optional für Phase 1

### Wichtige Files (Modified on Branch)

```
M deploy/backend/ansible-task.yml          # JIMESH_OTEL_SPANS_PATH env var
M src/backend/cmd/siem-bridge/main.go       # oteltrace.Init() call
M src/backend/go.mod                        # otel dependencies
M src/backend/go.sum
M src/backend/internal/ai/proxy.go          # OTel spans in AI proxy
M src/backend/internal/deploy/projects_ssh.go  # SpanDeployProject
M src/backend/internal/gateway/gateway.go   # oteltrace.Init(), CHClient
M src/backend/internal/gateway/project_utility.go  # SpanUtilityLaunch
M src/backend/internal/oteltrace/oteltrace.go  # BLOCKIERT - Syntax
M src/backend/internal/siem/falco.go        # SpanSIEMBridge
M src/backend/internal/siem/wazuh.go        # SpanSIEMBridge
M src/backend/internal/logschema/logschema.go
M src/backend/internal/logger/logger.go
M src/backend/internal/opensearch/opensearch.go
M src/backend/internal/streams/streams.go
A src/backend/internal/logschema/logschema.go
A src/backend/internal/logger/logger.go
A src/backend/internal/opensearch/opensearch.go
A deploy/clickhouse/
A deploy/kafka/
A deploy/openreplay/
A src/frontend/src/components/traces/
```

---

**Nächste Session Start:** `oteltrace.go` bereinigen → Build grün → Deploy → Spans verifizieren → PR erstellen.