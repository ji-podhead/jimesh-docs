# TASK-105 — Datalake-as-a-Service: Debezium/CDC-Engine implementieren (R44-Spez umsetzen)

**Quelle:** Operator 16.9. („was ist mit dem Datalake Debezium Task?") · **Spec:** `docs/research/R44-datalake-utility-app-concept.md` (APPROVED CONCEPT & SPECIFICATION, 358 Z.)
**Status:** 0 Zeilen Code existieren — `grep jimesh_datalake|DatalakeService|AutoDiscovery|BackupEngine src/backend/` = 0 Treffer. Das Konzept ist die Spec, dieser Task setzt es um.

---

## Was bereits existiert (Fundstellen — NICHT neu bauen, sondern nutzen)

| Baustein | Fundstelle | Rolle im Datalake |
|---|---|---|
| **kafkabridge** | `src/backend/cmd/kafkabridge/main.go` | Redis Streams → Kafka-Mirror (franz-go, pure Go, at-least-once mit ACK-nach-Kafka-Confirm) — der Debezium-adjazente Pfad für externe Konsumenten |
| **pglogrepl CDC** | TASK-034 (Sprint-33): StartReplication → Channel, Slot-Manager, Integration-Test | Der Postgres-WAL-Source — `SourcePostgresWAL` baut DARAUF auf, kein neuer Replication-Code |
| **Edge-Node CDC-Forwarder** | `cmd/jimesh-router/` (TASK-058), JSONL-Journal + Cursor | WAN-Puffer-Pattern für unterbrochene Verbindungen (Reuse im Source-Adapter) |
| **SIEM-Compose-Pattern** | `deploy/siem/docker-compose.yml` | Vorlage für `deploy/datalake/` (Volumes, Healthchecks, .env-Variablen — KEINE hardcoded Creds) |
| **Redis Streams Pipeline** | `jimesh:events` Consumer-Group-Muster | `SourceRedisStream` nutzt XREADGROUP wie kafkabridge |
| **R38 CDC-Synthese** | `docs/research/` (OKF: general/llm-orchestration-and-routing/cdc-and-synthesis/) | Die theoretische Basis, die R44 zitiert |

## Die R44-Spezifikation (implementiere GENAU das — docs/research/R44-datalake-utility-app-concept.md)

### 3-Schichten-Modell
```
SOURCE ADAPTER:      PostgresCDCSource · RedisStreamSource · DebeziumHubSource
   ↓
TRANSFORM PIPELINE:  CDCEventTransformer · AnonymizerTransformer · EmbeddingEnricher
   ↓
SINK ADAPTER:        ColumnarStorageSink (OpenSearch) · RedisCacheSyncSink · PostgresSyncSink · S3Sink
```

### Die Interfaces (Pure Go, §2 der Spec)
```go
type SourceAdapter interface {
    Init(ctx context.Context, config map[string]any) error
    // + Start/Stop/Health nach Spec
}
type SinkAdapter interface { /* Init/Write/Flush/Health */ }
type TransformPipeline interface { /* Process chain */ }
```

---

## WORK PACKAGES

### WP1 — Infra-Base: `deploy/datalake/` Compose-Stack
- `deploy/datalake/docker-compose.yml`: **Debezium Kafka Connect** (debezium/connect image) + Kafka (KRaft-Modus, kein Zookeeper) + **OpenSearch** (der Columnar-Sink) + optional MinIO (S3-Sink-Test)
- `.env.example` mit allen Variablen (CONN-Strings, Topics, Retention) — KEINE hardcoded Credentials (die Wazuh-Demo-Cred-Lektion aus deploy/siem/ NICHT wiederholen)
- Debezium-Connector-Registrierung als JSON-Files in `deploy/datalake/connectors/` (postgres-source.json, redis-source.json)
- Healthchecks + Restart-Policies; `make datalake-up`-Target im Makefile

### WP2 — Source-Adapter-Layer (`src/backend/internal/datalake/source/`)
- `source.go`: das `SourceAdapter`-Interface + Registry (exakt §2a der Spec)
- `postgres_cdc.go`: `SourcePostgresWAL` — WRAPPER um den existierenden pglogrepl-Code (TASK-034), KEINE neue Replikationslogik
- `redis_stream.go`: `SourceRedisStream` — XREADGROUP Consumer-Group (kafkabridge-Muster)
- `debezium_hub.go`: `SourceDebezium` — konsumiert Debezium-CloudEvents von Kafka (franz-go wie kafkabridge, §4b: CloudEvents-Interpretation in Go)

### WP3 — Transform-Pipeline (`src/backend/internal/datalake/transform/`)
- `pipeline.go`: Chain-of-Responsibility (§2c)
- `cdc_event.go`: CDCEventTransformer (unified Event-Envelope: source, table/key, before/after, op, ts_ms, lsn)
- `anonymizer.go`: AnonymizerTransformer — K-LAF-E3-Redaction wiederverwenden (`internal/klauf/` bzw. siem-bridge-Muster): max. 1 Identitäts-Feld pro Event
- `embedding.go`: EmbeddingEnricher als STUB mit ehrlichem "not configured"-Error (kein Mock-Output, Mandat 2) — der Echte kommt mit dem Embeddings-Feature

### WP4 — Sink-Adapter-Layer (`src/backend/internal/datalake/sink/`)
- `sink.go`: `SinkAdapter`-Interface (§2b)
- `opensearch.go`: `ColumnarStorageSink` — Bulk-Index nach OpenSearch (index-per-source-table, ISM-Retention wie siem)
- `redis_sync.go`: `RedisCacheSyncSink` — Hot-Cache-Sync (Hash-Update oder Delete bei op=d)
- `postgres_sync.go`: `PostgresSyncSink` — Replikation in die jimesh_datalake-Ziel-DB (pgx v5, Batch-Upserts)
- `s3.go`: `S3Sink` — erst Interface + Config, Implementierung mit MinIO in WP1-Compose testbar

### WP5 — Persistenz + API (`src/backend/internal/datalake/` + `internal/gateway/`)
- Store-Migration: `jimesh_datalake`-Schema nach §3a der Spec (pipeline_runs, sink_lag, event_stats, source_registry)
- Gateway-Routen (in gateway.go registriert + API_DOCS.md):
  - `GET /api/datalake/status` — Sources/Sinks + Lag + Health
  - `POST /api/datalake/sources` / `DELETE /api/datalake/sources/{id}` — Source-Registry CRUD
  - `POST /api/datalake/sinks/{id}` — Sink-Registry
  - `GET /api/datalake/events/stats` — Event-Zähler nach §4a (metrics die auch Prometheus-Endpunkte spiegeln)
- Der Datalake-Runner als eigenes cmd: `cmd/datalaked/` (Long-Running-Process, NICHT im Gateway-Loop — gleiche Trennung wie jimesh-router)

### WP6 — Metriken + Grafana (§4a der Spec)
- Prometheus-Metriken vom datalaked: connector_lag_seconds, events_in_total, events_out_total, transform_errors_total, sink_batch_duration
- `deploy/datalake/grafana/` Dashboard-JSON: Debezium-Connector-Übersicht + Pipeline-Lag + Sink-Throughput
- Die Metrik-Namen exakt wie in §4a der Spec tabelliert

### WP7 — Frontend: Datalake-Tab (Utility App)
- `views/DatalakePage.tsx` (Platform-Tab-Sektion): Source/Sink-Status-Kacheln, Live-Lag-Sparklines, Event-Stats, Connector-Start/Stop
- `section-nav.tsx`-Eintrag + Query-Keys im Registry (`lib/query-keys.ts`)
- i18n: alle neuen Keys in 60 Locales (check-i18n muss grün bleiben)

---

## Regeln (Mandate — jede Verletzung = Review-Reject)

1. **CGO_ENABLED=0** — franz-go/pglogrepl/pgx sind pure Go, KEINE neue Dep die CGO braucht
2. **No-Mock** (Mandat 2): Sink/Source liefern ehrliche Errors wenn Infra fehlt („OpenSearch not reachable"), NIEMALS Fake-Daten
3. **No Silent Fail** (Mandat 3): Journal + Cursor wie Edge-Node bei Unterbrechung, ACK erst nach Sink-Confirm (kafkabridge-Muster)
4. **Live-Verify** (Mandat 6): Ende = echtes CDC-Event durch die ganze Kette: INSERT in Postgres → Source → Transform → OpenSearch-Doc sichtbar + Redis-Sync da. Mit curl-Befehlen dokumentiert.
5. **Doku-Sync**: API_DOCS.md (jede Route), SPRINT-File (`SPRINT-45-DATALAKE.md`), BACKLOG-Zeilen [x]-Status
6. **Kein `git add -A`** — nur die Files des Tasks
7. **.env-Variablen** für alle Credentials, deploy/datalake/.env.example committed, echte .env NIEMALS
8. **Worktree-Pattern**: ein Task = ein Worktree = ein Branch (nicht im Main-Checkout arbeiten)

## Acceptance (Done = das hier live verifiziert)

- [ ] `make datalake-up` startet Debezium+Kafka+OpenSearch, alle healthy
- [ ] Echtes Postgres-INSERT erscheint als OpenSearch-Doc (curl-Beleg im PR)
- [ ] Redis-Stream-Event landet im Hot-Cache-Sync
- [ ] `GET /api/datalake/status` zeigt Source-Health + Lag live
- [ ] Grafana-Dashboard zeigt connector_lag_seconds + events_out_total
- [ ] DatalakePage zeigt Status + Stats, i18n 60/60 grün
- [ ] tsc + Vitest grün, API_DOCS + SPRINT-File aktualisiert
- [ ] KEIN neues Feature das Anonymizer umgeht (K-LAF-E3 greift im Transform-Schritt)

## Reihenfolge-Empfehlung (Claude's Audit vom 16.9.)

TASK-101 (CI-Fix, P0) → TASK-084 (SSOT, P0) → **TASK-105 (dieser)** — der Datalake kann parallel zu 085/086 laufen, braucht aber die grüne CI damit die Deploys verifizierbar sind.
