# Sprint 7: Langfuse Tracing, Sessions/Agents & Agent-Analytics über Redis Streams / Kafka

**Duration:** 2026-09-02 → 2026-09-16
**Status:** 🚧 In Progress (Go-Kern in diesem Sprint gelandet; Kafka-Bridge + gRPC-Wrapper als Specs)
**Goal:** **Endlich ordentliches Langfuse-Tracing** — jede geroutete LLM-Anfrage als Trace+Generation mit Session-ID. User können **Sessions und Agent-Typen** erstellen (REST jetzt, gRPC-Wrapper per Proto-Spec). **Analytics und Logs für Agenten wie im leobot2-Trading-Bot** — aber direkt hier, über die vorhandene Redis-Streams-Infrastruktur (Kafka-Bridge optional, Debezium bewertet).

---

## 🧭 Design-Entscheidungen

1. **Langfuse Sessions kommen kostenlos über `sessionId`**: Langfuse gruppiert Traces zu Sessions, wenn jedes Trace-Objekt dieselbe `sessionId` trägt (https://langfuse.com/docs/observability/features/sessions). JiMesh muss also nur konsistent stempeln — kein extra Session-API-Aufruf nötig.
2. **JiMesh bleibt SSOT für Sessions/Agenten** (SQLite `sessions` + `agent_types` Tabellen existieren bereits, REST-Handler auch). Langfuse ist die Observability-Projektion, nicht das System of Record.
3. **Agent-Logs laufen über Redis Streams** (`jimesh:logs`, persistent + replaybar) — bewusst Stream statt Pub/Sub wie im leobot2-`logs:*`-Kanal-Design, weil Dashboards reconnecten und History sehen sollen. Das leobot2-`skill_log_stream`-Muster (XADD, XRANGE-Export) ist die Blaupause.
4. **Kein Polling** (leobot2-Operator-Mandat): Dashboards tailen per SSE/gRPC-Streaming die Streams, niemals REST-Loops.
5. **Kafka kommt als Bridge, nicht als Rückgrat**: JiMesh-Events bleiben in Redis Streams (bereits gebaut, gRPC-Streaming hängt dran). Eine optionale Bridge spiegelt `jimesh:*` via Consumer-Group nach Kafka, wenn externe Systeme (Debezium/Kafka-Connect, Data-Lake) andocken wollen.

---

## 🏗️ Architektur

```
┌─────────────┐   POST /api/agents/logs    ┌──────────────────────────┐
│ Agents/DSH/ │ ─────────────────────────► │ jimesh:logs (Stream)     │◄──┐
│ Wrappers    │                             └───────────┬──────────────┘   │
└─────────────┘                                         │ XADD             │
                                                        ▼                  │
┌─────────────┐  X-JiMesh-Session/-Agent-Type           SSE GET             │
│ Chat-Calls  │ ───────┐                       /api/streams/logs           │
│ /v1/chat/…  │        │                       (filter session/agent)      │
└─────────────┘        ▼                       ┌──────────────────────────┐
              ┌────────────────────┐           │ Dashboard (Next.js)      │
              │ Gateway Proxy      │           │ Realtime-Logs-Widget     │
              │ · Route-Decision   │           └──────────────────────────┘
              │ · Quota-Header     │
              │ · usage/Cost       │──► jimesh:requests (Request-Summaries)
              │ · Latency/Fehler   │──► jimesh:events   (RouteEvent → Feedback-Loop)
              │                    │──► jimesh:quota    (Quota-Live-State)
              └─────────┬──────────┘
                        │ async, batched
                        ▼
              ┌────────────────────┐         ┌─────────────────────────┐
              │ Langfuse-Client    │  HTTP   │ Langfuse (Cloud oder    │
              │ POST /api/public/  │ ──────► │ self-host Compose-Stack)│
              │   ingestion        │         │ Traces → Sessions →     │
              │ trace-create +     │         │ Agent-Ansichten, Costs  │
              │ generation-create  │         └─────────────────────────┘
              └────────────────────┘
                        │
                        ▼  (optional, Task 7.5)
              ┌────────────────────┐         ┌─────────────────────────┐
              │ Kafka-Bridge       │ produce │ Apache Kafka            │
              │ (franz-go, pure    │ ──────► │ Topics: jimesh.logs,    │
              │  Go, kein CGO!)    │         │ jimesh.requests, …      │
              │ Consumer-Groups    │         │ → Debezium/Kafka-Connect│
              │ pro Stream         │         │   Anbindung extern      │
              └────────────────────┘         └─────────────────────────┘
```

---

## 🛠️ Implementierung (Status dieses Sprints)

| Baustein | Datei | Status |
|----------|-------|--------|
| Langfuse-Client (Batch-Ingestion, Basic-Auth,Flush 2s/25 Events) | `src/backend/internal/tracing/langfuse.go` | ✅ neu |
| Session-/Agent-Stempel im Chat-Proxy (`X-JiMesh-Session`, `X-JiMesh-Agent-Type`) | `gateway.go` | ✅ |
| Request-Summaries (Trace/Session/Agent/Model/Platform/Tokens/Cost/Latenz) → `jimesh:requests` + In-Memory-Ring (500) | `service.go` | ✅ |
| Agent-Log-Event-Ingest: `POST /api/agents/logs` | `agentlog.go` | ✅ neu |
| Agent-Log-SSE-Live-Tail: `GET /api/streams/logs?session_id=&agent_type_id=` | `agentlog.go` | ✅ neu |
| Agent-Analytics: `GET /api/agents/analytics/summary?session_id=` (Totals, per Model, per Agent, recent) | `agentlog.go` | ✅ neu |
| Sessions/Agent-Types CRUD (bereits vorhanden: `POST/GET /api/sessions`, `/api/agent-types` mit Seeds trading/expert/risk) | `gateway.go` | ✅ bestand |
| Stream-Topics `jimesh:logs` + `jimesh:requests`-Nutzung | `streams.go` | ✅ |
| Kafka-Bridge | — | 📋 Task 7.5 Spec |
| gRPC-Wrapper (CreateSession/StreamAgentLogs/…) | — | 📋 Task 7.4 Proto-Spec |

### Langfuse-Ingestion-Details

- **Endpoint:** `POST {LANGFUSE_BASE_URL}/api/public/ingestion`, Basic-Auth `pk-lf-…:sk-lf-…`
- **Body:** `{batch:[{id, type:"trace-create", timestamp, body:{…}}, {type:"generation-create", body:{…}}]}`
- **Trace:** `id` (sanitizte TraceID), `name` = Agent-Typ (default `jimesh-chat`), `sessionId`, `tags:[agent_type, platform, model_id, tier]`, `metadata:{chain_id, strategy, key_id, session_id, agent_type}`
- **Generation:** `traceId`, `name:"chat.completion"`, `model`, `startTime/endTime`, `usage:{input,output,total,unit:"TOKENS"}`, `metadata:{platform, cost_usd, quota_remaining, …}`, `level:"DEBUG|DEFAULT|ERROR"`, `statusMessage` bei Upstream-Fehlern
- **Config (`.env`):** `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_BASE_URL` (default `https://cloud.langfuse.com`), `LANGFUSE_ENABLED=false` default → aktiv nur bei gesetzten Keys + Flag
- **Selbst hosten:** Langfuse MIT-Core als Compose-Service (Task 7.3) — dann Base-URL `http://langfuse:3000`, keine Cloud-Abhängigkeit
- **Kosten der Traces:** metadata.cost_usd aus Sprint-6-Kostenrechnung → Langfuse Session-Ansichten zeigen echte USD pro Session/Agent

### Request-Summary-Schema (`jimesh:requests`)

```json
{
  "trace_id": "trace-…", "session_id": "sess-…", "agent_type_id": "trading",
  "chain_id": "auto:a", "strategy": "exploit",
  "model_id": "gpt-4o", "platform": "openai", "key_id": 3,
  "is_paid_model": true, "is_paid_key": true,      // Auto-Klassifizierung Sprint 6
  "success": true, "status_code": 200, "latency_ms": 812,
  "input_tokens": 1520, "output_tokens": 340, "cost_usd": 0.0129,
  "error": "", "ts_unix_ms": 1788350000000
}
```

**Free/Paid-Trennung (Operator-Anforderung):** Jede Analytics-Fläche gruppiert nach `is_paid_model`/`is_paid_key` — `/api/agents/analytics/summary` liefert `{totals, free: {…}, paid: {…}, by_model: […mit is_paid_model…], by_agent: […], recent: […]}`, token-usage/rate-limit-usage-Rows tragen `isPaidModel`. Die Flags kommen aus der Auto-Klassifizierung (SPRINT-6, `quota.ClassifyPaid`) — der User setzt nichts mehr manuell.

### Agent-Log-Event-Schema (`jimesh:logs`, leobot2-`logs:*`-Pattern als Stream)

```json
{
  "ts_unix_ms": 1788350000000,
  "session_id": "sess-…",        // optional
  "agent_type_id": "trading",    // optional
  "level": "INFO",               // DEBUG | INFO | WARN | ERROR
  "message": "entry signal confirmed",
  "data": {"symbol": "BTCUSDT", "conf": "0.82"}   // freie Key-Value-Pairs
}
```

`POST /api/agents/logs` nimmt genau dieses Objekt (ohne ts — wird serverseitig gesetzt), validiert Level, XADDs auf `jimesh:logs`. Agents, DSH-Wrappers oder CLI-SDKs publishen damit ihre Aktivität; Dashboards tailen live.

---

## 📋 Offene Tasks

### Task 7.4: gRPC-Wrapper für Sessions/Agents ✅ (gelandet — protoc 29.3 + protoc-gen-go v1.35.2)

`jimesh.proto` trägt jetzt `Session`/`AgentType`/`AgentLogEvent`/`AgentTotals`/`AgentBucket`/`AgentAnalyticsSummary` und die RPCs `CreateSession`, `ListSessions`, `UpsertAgentType`, `ListAgentTypes`, `PublishAgentLog`, `StreamAgentLogs`, `AgentAnalytics` — implementiert in `cmd/server/grpc_sprint67.go`. Die Business-Logik (Validierung, Publish, Analytics-Aggregation mit Free/Paid-Split) liegt in `internal/service/agents.go` und wird von REST UND gRPC geteilt — die Oberflächen können nicht auseinanderdriften. Testdeckung: `internal/service/agents_test.go` (Session-ID-Generierung, Free/Paid-Split, Filter-Isolation, Log-Validierung).

```protobuf
// ---------- Sessions & Agents (Sprint 7) ----------
message Session {
  string id = 1;
  string agent_type_id = 2;
  map<string, string> metadata = 3;
  repeated string tags = 4;
  int64 created_at_unix_ms = 5;
}
message CreateSessionRequest {
  string id = 1;                  // leer = server-generiert
  string agent_type_id = 2;
  map<string, string> metadata = 3;
  repeated string tags = 4;
}
message CreateSessionResponse { Session session = 1; }
message ListSessionsRequest { string agent_type_id = 1; string tag = 2; }
message ListSessionsResponse { repeated Session sessions = 1; }

message AgentType {
  string id = 1; string label = 2; string description = 3;
  repeated string default_tags = 4; repeated string default_fallback_chain = 5;
}
message UpsertAgentTypeRequest { AgentType type = 1; }
message UpsertAgentTypeResponse { AgentType type = 1; }
message ListAgentTypesRequest {}
message ListAgentTypesResponse { repeated AgentType types = 1; }

message AgentLogEvent {                       // identisch zum REST-JSON
  int64 ts_unix_ms = 1; string session_id = 2; string agent_type_id = 3;
  string level = 4; string message = 5; map<string, string> data = 6;
}
message PublishAgentLogRequest { AgentLogEvent event = 1; }
message PublishAgentLogResponse { bool ok = 1; }
message StreamAgentLogsRequest { string session_id = 1; string agent_type_id = 2; string level = 3; }

message AgentAnalyticsRequest { string session_id = 1; string agent_type_id = 2; int64 window_ms = 3; }

// in service JiMesh ergänzen:
rpc CreateSession(CreateSessionRequest) returns (CreateSessionResponse);
rpc ListSessions(ListSessionsRequest) returns (ListSessionsResponse);
rpc UpsertAgentType(UpsertAgentTypeRequest) returns (UpsertAgentTypeResponse);
rpc ListAgentTypes(ListAgentTypesRequest) returns (ListAgentTypesResponse);
rpc PublishAgentLog(PublishAgentLogRequest) returns (PublishAgentLogResponse);
rpc StreamAgentLogs(StreamAgentLogsRequest) returns (stream AgentLogEvent);
rpc AgentAnalytics(AgentAnalyticsRequest) returns (AgentAnalyticsSummary);
```

Damit ist der „Wrapper mit gRPC" abgedeckt: SDKs (Sprint 4 Task 4.6) bekommen Sessions/Logs/Analytics als First-Class RPCs, REST bleibt Parallel-Interface.

### Task 7.5: Kafka-Bridge (Spec) 📋

- **Go-Library:** `github.com/twmb/franz-go` — pure Go, **kein CGO** (CLAUDE.md-Mandat „Pure Go (No CGO)")
- **Service:** eigener Prozess `cmd/kafkabridge/main.go` — pro `jimesh:{logs,requests,events,quota,scores}` eine Consumer-Group (`cg-kafkabridge-<topic>`), jede Nachricht wird als `kafka.TopicPublisher`-Produce auf `jimesh.<topic>` gemirrort (Key = session_id/trace_id wenn vorhanden, sonst Stream-ID)
- **Config:** `KAFKA_BROKERS` (leer = Bridge aus), `KAFKA_TOPIC_PREFIX=jimesh.`
- **Warum Bridge statt direkt produzieren:** Redis Streams bleiben die In-Process-Pipeline (Latenz, Feedback-Loop, gRPC-Tail); Kafka wird nur bei echtem externen Bedarf aktiviert. Keine latenten Dependencies im Hot Path.
- **go.mod:** wird auf dem Host benötigt (`go get github.com/twmb/franz-go` + `make restart`) — bewusst NICHT in diesem Sandbox-Sprint gelandet

### Task 7.6: Debezium-Bewertung (Entscheidung) 📋

**Befund:** Debezium hat **keinen SQLite-Connector** (unterstützt Postgres/MySQL/MongoDB/SQL Server/Oracle/Db2). JiMesh nutzt `modernc.org/sqlite` (pure Go, WAL).

**Optionen:**

| Option | Aufwand | Was man kriegt | Empfehlung |
|--------|---------|----------------|------------|
| A. Status quo: SQLite + Redis Streams als Event-Backbone | 0 | Replays über `XRANGE`, Consumer-Groups, SSE/gRPC-Tails — funktional CDC für Events | ✅ erstmal |
| B. Kafka-Bridge (7.5) + Kafka-Connect-Sink (ohne Debezium) | mittel | Events in Kafka → beliebige Sinks (S3, ClickHouse, Postgres-Warehouse) | bei externen Konsumenten |
| C. Postgres-Sidecar + Debezium-Connector | hoch | Echtes Tabellen-CDC (`quota_observations`, `requests`-Log-Tabelle) — aber Bruch mit „pure Go / SQLite-single-file"-Mandat | nur wenn Tabellen-CDC wirklich gebraucht wird (Audit-Compliance) |

**Empfehlung:** A jetzt, B sobald externe Konsumenten existieren, C nur auf expliziten Compliance-Bedarf. In jedem Fall: `quota_observations` + künftige `request_log`-Tabelle sind append-only — die sind die natürliche Debezium-/Bridge-Quelle, `quota_state` ist nur abgeleiteter Zustand.

### Task 7.3: Self-Hosted Langfuse (Spec) 📋

Compose-Service `langfuse` (Image `langfuse/langfuse`, needs Postgres) + `LANGFUSE_BASE_URL=http://langfuse:3000`. Nur wenn Cloud nicht in Frage kommt — sonst Cloud-Keys in `.env`.

### Task 7.2: Frontend-Widgets 📋

- **Realtime Agent Logs**: Terminal-artige Liste, tailt `GET /api/streams/logs` (Pattern: `useRealtimeStore`/EventSource + Exponential-Backoff aus `OPERATOR_GUIDE.md`), Filter-Dropdowns für Session/Agent/Level (leobot2-`LogTerminal`-Vorbild, inkl. „nur abonnieren wenn sichtbar")
- **Agent Analytics Page**: `/api/agents/analytics/summary` — Requests, Tokens, Kosten (USD), p50/p99-Latenz, Fehlerquote pro Agent/Modell; Session-Dropdown
- **Langfuse-Link**: pro Session ein Deep-Link `{LANGFUSE_BASE_URL}/sessions/{session_id}` (public dashboard URL konfigurierbar)

---

## ✅ Akzeptanzkriterien

1. `curl -X POST /api/sessions -d '{"id":"sess-1","agent_type_id":"trading"}'` + Chat-Call mit `X-JiMesh-Session: sess-1` → Langfuse-UI zeigt eine Session mit genau einem Trace/Generation inkl. Usage+Cost-Metadaten
2. `curl -X POST /api/agents/logs -d '{"session_id":"sess-1","level":"INFO","message":"test"}'` + `curl -N /api/streams/logs` → Event kommt live im SSE-Stream an (Reconnect holt die History via Stream-Replay)
3. `/api/agents/analytics/summary?session_id=sess-1` liefert echte Totals (Requests/Tokens/Cost/Latenz) aus den Request-Summaries — keine Multiplikations-Fakes mehr
4. Ohne `LANGFUSE_*`-Env startet das Backend normal, Tracing loggt `[tracing] disabled` — keine Fehler, kein Blockieren
5. Tracing ist **feuer-und-vergessen**: Upstream-Latenz unverändert (Client queued & flusht async); Langfuse-Ausfall beeinträchtigt Routing nicht
6. Kafka/Debezium: Entscheidung 7.6 dokumentiert, Bridge-Spec reviewbar, keine unbenaunten Dependencies im Build
