# R44 — Datalake-as-a-Service Utility App: Architecture, OOP Hierarchy & Schemas

**Status:** APPROVED CONCEPT & SPECIFICATION
**Datum:** 15. September 2026
**Ziel:** Bereitstellung von **JiMesh Datalake-as-a-Service** als gemanagte Utility App, womit Kunden ihre primären Datenbanken (Postgres, Redis, MongoDB, MySQL) nahtlos in einen Real-Time Datalake + Hot Cache synchronisieren können.

---

## 1. ARCHITEKTUR-ÜBERSICHT (3-SCHICHTEN-MODELL)

Das Datalake-System baut direkt auf der **R38 CDC-Synthese** auf und bietet zwei Betriebsmodi:

```
+-----------------------------------------------------------------------------------+
|                        CUSTOMER DATABASE & REDIS INFRASTRUCTURE                   |
|  +--------------------+     +-------------------+     +------------------------+  |
|  | PostgreSQL (WAL)   |     | Redis (RESP/Stream)|    | MongoDB/NoSQL (Change) |  |
|  +---------+----------+     +---------+---------+     +-----------+------------+  |
+------------|--------------------------|---------------------------|---------------+
             | (pglogrepl / WAL)        | (XREAD / RESP)            | (CloudEvents)
             v                          v                           v
+-----------------------------------------------------------------------------------+
|                       JIMESH DATALAKE UTILITY APP ENGINE                          |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |                          SOURCE ADAPTER LAYER                               |  |
|  |  [PostgresCDCSource]    [RedisStreamSource]    [DebeziumHubSource]         |  |
|  +-------------------------------------+---------------------------------------+  |
|                                        |                                          |
|                                        v                                          |
|  +-----------------------------------------------------------------------------+  |
|  |                       TRANSFORM & ENRICHMENT PIPELINE                       |  |
|  |  [CDCEventTransformer]    [AnonymizerTransformer]    [EmbeddingEnricher]   |  |
|  +-------------------------------------+---------------------------------------+  |
|                                        |                                          |
|                                        v                                          |
|  +-----------------------------------------------------------------------------+  |
|  |                           SINK ADAPTER LAYER                                |  |
|  |  [ColumnarStorageSink]   [RedisCacheSyncSink]   [PostgresSyncSink] [S3Sink]  |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 2. OOP-HIERARCHIE & INTERFACE-ABSTRAKTIONEN (PURE-GO)

### 2a. Source Interfaces (`SourceAdapter`)
```go
type SourceType string

const (
    SourcePostgresWAL SourceType = "postgres_wal"
    SourceL7Router    SourceType = "l7_router"
    SourceRedisStream SourceType = "redis_stream"
    SourceDebezium    SourceType = "debezium_hub"
)

type SourceAdapter interface {
    Init(ctx context.Context, config map[string]any) error
    StartStream(ctx context.Context) (<-chan CDCEvent, error)
    AckLSN(ctx context.Context, lsn LSN) error
    Close() error
}
```

#### Vererbung / Abgeleitete Structural Classes:
- **`PostgresCDCSource`**: Baut auf `internal/cdc` (pglogrepl) auf; erzeugt `CDCEvent` Streams aus dem Postgres WAL.
- **`L7RouterSource`**: Baut auf `internal/router` auf; extrahiert SELECT/INSERT/UPDATE/DELETE Query-Audits aus `pgproto3` & `RESP` Protokollen.
- **`RedisStreamSource`**: Liest Redis Streams (`XREADGROUP`) und konvertiert Hash-Events in `CDCEvent`.
- **`DebeziumHubSource`**: CloudEvents-Ingest-Receiver für Multi-DB Non-Postgres Source Sync.

---

### 2b. Sink Interfaces (`SinkAdapter`)
```go
type SinkType string

const (
    SinkColumnar    SinkType = "columnar_store"  // Parquet / DuckDB / ClickHouse
    SinkRedisCache  SinkType = "redis_cache"     // Redis Stream & Hot Cache Sync
    SinkPostgresDB  SinkType = "postgres_replica"// Cross-DB Sync
    SinkS3Storage   SinkType = "s3_object_store" // MinIO / Cold Archiving
)

type SinkAdapter interface {
    Init(ctx context.Context, config map[string]any) error
    WriteBatch(ctx context.Context, events []CDCEvent) error
    Flush(ctx context.Context) error
    Close() error
}
```

#### Abgeleitete Implementationen:
- **`ColumnarStorageSink`**: Schreibt partitionierte Parquet/JSONL Files für OLAP queries via DuckDB/ClickHouse.
- **`RedisCacheSyncSink`**: Schreibt Invalidation-Events in Redis Key-Value & `XADD` Streams für Hot-Cache Sync.
- **`PostgresSyncSink`**: Führt upserts / deletes auf der Ziel-Postgres aus.
- **`S3ObjectStoreSink`**: Batch-Upload nach MinIO / AWS S3 mit Datums-Partitionierung (`/year=/month=/day=`).

---

### 2c. Transform Pipeline Interfaces (`TransformPipeline`)
```go
type TransformPipeline interface {
    Process(ctx context.Context, event CDCEvent) (*CDCEvent, error)
}

// Chain composition (Composite Pattern)
type PipelineChain struct {
    transformers []TransformPipeline
}
```

---

## 3. DATENBANK-SCHEMAS & PERSISTENZ

### 3a. Postgres Schema (`jimesh_datalake`)

```sql
CREATE SCHEMA IF NOT EXISTS jimesh_datalake;

-- Datalake Pipeline Registry
CREATE TABLE IF NOT EXISTS jimesh_datalake.datalake_pipelines (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    workspace_id TEXT DEFAULT '',
    name TEXT NOT NULL,
    source_type TEXT NOT NULL,
    source_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    sink_type TEXT NOT NULL,
    sink_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'active', -- active | paused | error
    error_message TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Datalake Schema Mappings (Source -> Target Column Mapping)
CREATE TABLE IF NOT EXISTS jimesh_datalake.datalake_schema_mappings (
    id TEXT PRIMARY KEY,
    pipeline_id TEXT NOT NULL REFERENCES jimesh_datalake.datalake_pipelines(id) ON DELETE CASCADE,
    source_table TEXT NOT NULL,
    target_table TEXT NOT NULL,
    column_mappings JSONB NOT NULL DEFAULT '{}'::jsonb,
    primary_keys TEXT[] NOT NULL DEFAULT '{}',
    sync_mode TEXT NOT NULL DEFAULT 'full_sync', -- full_sync | append_only | upsert
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Datalake Sync Watermarks & Position Tracker
CREATE TABLE IF NOT EXISTS jimesh_datalake.datalake_sync_watermarks (
    pipeline_id TEXT NOT NULL REFERENCES jimesh_datalake.datalake_pipelines(id) ON DELETE CASCADE,
    table_name TEXT NOT NULL,
    last_lsn TEXT NOT NULL DEFAULT '0/0',
    last_ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    records_synced BIGINT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'synced',
    PRIMARY KEY (pipeline_id, table_name)
);

-- Datalake Event Audit Log
CREATE TABLE IF NOT EXISTS jimesh_datalake.datalake_audit_log (
    id BIGSERIAL PRIMARY KEY,
    pipeline_id TEXT NOT NULL,
    event_op TEXT NOT NULL,
    table_name TEXT NOT NULL,
    lsn TEXT NOT NULL,
    records_count INT NOT NULL DEFAULT 1,
    checksum TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_datalake_pipelines_project ON jimesh_datalake.datalake_pipelines(project_id);
CREATE INDEX IF NOT EXISTS idx_datalake_audit_pipeline ON jimesh_datalake.datalake_audit_log(pipeline_id, created_at DESC);
```

---

### 3b. Redis Stream & Cache Key-Topologie

1. **CDC Stream Key**:
   `jimesh:datalake:cdc:{project_id}:{table_name}`
   *Inhalt*: Hash von Op, LSN, TS, Before, After.

2. **Hot Cache Key**:
   `jimesh:cache:{project_id}:{table_name}:{primary_key}`
   *Inhalt*: Aktueller Row-Zustand als JSON string mit TTL.

3. **Invalidation Pub/Sub Channel**:
   `jimesh:datalake:events:{project_id}`
   *Inhalt*: `{ "op": "update", "table": "users", "id": "123", "ts": 1757952000 }`

---

## 4. DEBEZIUM METRICS, GRAFANA DASHBOARDS & GO EVENT INTERPRETATION ENGINE

### 4a. Prometheus / Grafana Dashboard Metrics
Für die Beobachtbarkeit der CDC-Pipelines (sowohl pure-Go `pglogrepl` als auch Debezium Server Hub) werden folgende Prometheus-Metriken exportiert:

1. **`jimesh_cdc_replication_lag_ms`**: Aktuelle LSN-Verzögerung in Millisekunden (`MilliSecondsBehindSource`).
2. **`jimesh_cdc_events_total`**: Zähler verarbeiteter CDC-Events nach Typ (`op="insert|update|delete|begin|commit"`).
3. **`jimesh_cdc_queue_capacity_percent`**: Auslastung des in-memory Event-Puffers.
4. **`jimesh_cdc_bytes_synced_total`**: Kumulative Datenmenge des WAL/Debezium-Streams.

### 4b. Go Debezium CloudEvents / Kafka Connect Interpretation
Die Go-Engine interpretiert eingehende Debezium-Payloads (CloudEvents oder Kafka Connect JSON) und mappt sie nativ in das JiMesh `CDCEvent`-Struct:

```go
type DebeziumPayload struct {
    Before map[string]any `json:"before"`
    After  map[string]any `json:"after"`
    Source struct {
        Version   string `json:"version"`
        Connector string `json:"connector"`
        Name      string `json:"name"`
        TsMs      int64  `json:"ts_ms"`
        Snapshot  string `json:"snapshot"`
        Db        string `json:"db"`
        Schema    string `json:"schema"`
        Table     string `json:"table"`
        LSN       uint64 `json:"lsn"`
    } `json:"source"`
    Op   string `json:"op"` // 'c'=create, 'u'=update, 'd'=delete, 'r'=read (snapshot)
    TsMs int64  `json:"ts_ms"`
}

func (d *DebeziumPayload) ToCDCEvent() CDCEvent {
    var op Op
    switch d.Op {
    case "c", "r": op = OpInsert
    case "u":      op = OpUpdate
    case "d":      op = OpDelete
    }
    return CDCEvent{
        Op:     op,
        LSN:    LSN(d.Source.LSN),
        TS:     time.UnixMilli(d.TsMs),
        Table:  d.Source.Schema + "." + d.Source.Table,
        Before: d.Before,
        After:  d.After,
    }
}
```

---

## 5. CROSS-DOMAIN INTEGRATION MATRIX (CAPABILITIES, HIERARCHY, NETWORKING, SCHEMAS)

Die Datalake Utility App schmiegt sich nahtlos in alle bestehenden JiMesh-Konstrukte ein:

| Domäne | JiMesh Standard | Datalake Utility App Integration |
|---|---|---|
| **Hierarchie** | `Project` -> `Workspace` -> `App` | `project_id` isoliert die Datalake Pipelines & WAL Replication Slots; `workspace_id` definiert den Execution Space für DuckDB / S3 Sync. |
| **Capabilities (Rego)** | `namespace:action` (AIM Pattern) | `datalake:read` (low), `datalake:write` (medium), `datalake:delete` (critical), `datalake:admin` (critical) in `policies/capabilities.rego`. |
| **Networking** | E-Priority / Zero Open Ports (DSG) | Outbound-only Mesh Tunneling (Headscale/WireGuard) zu Remote DBs; CDC Sync verläuft im isolierten `jimesh-vlan-<projId>` Netz. |
| **Secrets & Auth** | Zero-Trust Vault (Mandat 9) | DB Passwörter/Replication Credentials verbleiben im Vault; Datalake holt nur flüchtige JIT Tokens via `/api/vault/access`. |
| **Postgres Schema** | Pgx v5 / stdlib | `jimesh_datalake` Schema für Pipeline-Registry, Column-Mappings & Watermarks. |
| **Redis Topology** | Redis 7 Pub/Sub & Streams | Streams: `jimesh:datalake:cdc:{project_id}:{table}`; Cache: `jimesh:cache:{project_id}:{table}:{pk}`. |

---

## 6. UNIFIED SECURITY, TELEMETRY, SETTINGS SCHEMAS & ONBOARDING ARCHITECTURE

### 6a. Integrierte Telemetrie-Pipeline (SIEM + WAF + Firewall + eBPF + CDC)
Alle Sicherheits- und Audit-Ebenen von JiMesh speisen in dasselbe **Unified Event Envelope**:

```
+-----------------------------------------------------------------------------------+
|                        UNIFIED TELEMETRY & AUDIT INGEST                          |
|  +--------------------+  +------------------+  +-------------------+  +----------+|
|  | eBPF (Falco K-LAF) |  | WAF (Coraza 403) |  | Firewall (OPA/In) |  | CDC WAL  ||
|  +---------+----------+  +--------+---------+  +---------+---------+  +----+-----+|
+------------|----------------------|----------------------|-----------------|------+
             v                      v                      v                 v
+-----------------------------------------------------------------------------------+
|            UNIFIED EVENT ENVELOPE (jimesh_datalake.datalake_audit_log)            |
|  { "project_id": "...", "source": "ebpf|waf|firewall|cdc", "payload": {...} }     |
+-----------------------------------------------------------------------------------+
```

### 6b. Erweitere Settings Schemas (`jimesh_settings` Extensions)

1. **`security.siem`**:
   ```json
   {
     "enabled": true,
     "wazuhHost": "siem-wazuh:1514",
     "falcoGrpc": "siem-falco:8765",
     "exportToDatalake": true
   }
   ```
2. **`security.waf`**:
   ```json
   {
     "enabled": true,
     "mode": "blocking",
     "corazaRuleset": "OWASP_CRS",
     "facedByWaf": true
   }
   ```
3. **`security.ebpf`**:
   ```json
   {
     "klafEnabled": true,
     "driver": "modern_ebpf",
     "syscallFilter": ["execve", "connect", "ptrace"]
   }
   ```

### 6c. End-to-End Onboarding Flow (Wizard -> Telemetry Attach)

```
[1. Target Node Onboarding] ---> [2. Preflight Probe] ---> [3. Network & Security] ---> [4. Telemetry & CDC Attach]
(SSH / Local Target)            (Docker, eBPF, WAL)      (VLAN + WAF Sidecar)       (pglogrepl + SIEM Stream)
```

1. **Target Node Onboarding**: Node-Koordinaten eintragen oder Local Host wählen.
2. **Preflight Environment Probe**: Automatische Prüfung von Docker, Kernel eBPF-Support, gVisor (`runsc`), `wal_level=logical`.
3. **Network & Security Provisioning**: Isolierung in `jimesh-vlan-<projId>`, WAF Sidecar Attach (`cmd/waf-sidecar`), OPA Inbound Rules Deployment.
4. **Telemetry & CDC Attach**: Automatische Aktivierung des Logical Replication Slots (`pglogrepl`), Anbindung des SIEM-Shippers (`cmd/siem-bridge`) & Datalake Parquet Exporters.

---

## 7. DATABASE & CACHE APP AUTO-DISCOVERY, BACKUP ENGINE & DEBEZIUM INTEGRATION (TASK-088)

### 7a. Database Engine Type Recognition & Auto-Discovery
Der Auto-Discovery Scanner (`internal/discovery`) prüft laufende Container & Netzwerk-Ports und ordnet DB/Cache-Typen automatisch nach ihren Handshake-Signaturen zu:

| Engine | Port | Signature Handshake | Discovery Metadata |
|---|---|---|---|
| **PostgreSQL** | `5432` | `pgproto3` StartupMessage -> `SELECT version()` | `pg_version`, `wal_level`, `replica_identity` |
| **Redis** | `6379` | RESP `PING` -> `+PONG` -> `INFO server` | `redis_version`, `connected_clients`, `used_memory` |
| **MongoDB** | `27017` | Mongo Wire Protocol `isMaster` / `hello` | `mongo_version`, `ismaster`, `setName` (ReplSet) |
| **MySQL** | `3306` | MySQL Protocol Initial Handshake Packet | `mysql_version`, `auth_plugin` |
| **ClickHouse** | `8123` | HTTP `/ping` -> `Ok.\n` | `clickhouse_version` |

### 7b. Backup Engine & CDC Pre-Snapshot Alignment
Vor der Aktivierung eines neuen CDC Replication Slots (`pglogrepl` oder Debezium Hub) führt die Backup Engine (`internal/security/backups.go`) automatisch einen **Pre-CDC Initial Snapshot** durch:

1. **Pre-CDC Baseline Snapshot**: Erzeugt einen konsistenten JSON/pg_dump Baseline-Snapshot aller Tabellen, speichert das Manifest in `jimesh_backups` und setzt den LSN-Startpunkt in `jimesh_datalake.datalake_sync_watermarks`.
2. **Pre-Restore Safety Guard**: Vor jeder Wiederherstellung (`POST /api/backups/{id}/restore`) wird automatisch ein Sicherheits-Backup generiert (`writeBackup("pre-restore")`), um Datenverlust zu verhindern.

### 7c. Konsolidierte Database-Tab UI Surface (`/dbs`)
Die Benutzeroberfläche unter `/dbs` bündelt alle Datenbank- & Datalake-Funktionen in 4 Unterseiten:
- `/dbs/overview`: Erkannte & gemanagte DBs/Caches mit Health & Metric-Pills.
- `/dbs/discovery`: Automatische Container- & Port-Inspektion (`/api/discovery/sync`).
- `/dbs/backups`: Snapshot-Erstellung, Download, Restore & Scheduler (`/api/backups`).
- `/dbs/watermarks`: Real-Time CDC Watermarks, Replication Lag (ms) & Sync-Status.

---

## 8. INTEGRATION IN DAS UTILITY APP ECOSYSTEM

Die Datalake Utility App wird als erstklassige Service App über die Control Plane registriert:
- **REST Endpoints**: `/api/datalake/pipelines`, `/api/datalake/pipelines/{id}/sync`, `/api/datalake/watermarks`
- **UI Surface**: Bestandteil der **Workspaces / Apps** Sektion (`WorkspaceAppsPage.tsx`).
- **Gating**: PolyForm NC Core (Standard In-Process Sync) + Commercial Entitlement (S3/ClickHouse Multi-Region Hub).
