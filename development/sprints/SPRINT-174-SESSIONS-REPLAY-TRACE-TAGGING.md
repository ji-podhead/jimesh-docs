# SPRINT-174 — Session/Trace/Replay/Network Events Pipeline

**Datum:** 5.10.2026
**Status:** ✅ **PHASE 1 COMPLETE** — Backend Pipeline + Frontend Components deployed
**Commit:** `a0564cbd` — `feat(s174): Session/Trace/Replay/Network Events Pipeline`
**Ziel:** **Session = Trace = Network Event Pipeline** — Jeder Worker/Agent-Deployment bekommt garantiert eine Session. Traces sind global (Kafka/ClickHouse), Session als Selector überall. OpenReplay statt Sentry. Datadog-Style Network Events mit Header-Tags.

---

## 1. Architektur-Übersicht (Implemented)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SESSION/TRACE/NETWORK PIPELINE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    X-Session-ID      ┌──────────────┐    Spans            │
│  │   Worker/    │ ──────────────────▶  │   Gateway    │ ───────────────▶    │
│  │   Agent      │   (Header Propagation)│  (Otel)     │                     │
│  └──────────────┘                        └──────┬───────┘                     │
│                                                 │                             │
│                                    ┌────────────┴────────────┐                │
│                                    ▼                         ▼                │
│                          ┌─────────────────┐       ┌─────────────────┐      │
│                          │   Kafka/        │       │   OpenReplay    │      │
│                          │   ClickHouse    │       │  (Session Replay)│     │
│                          │  (Traces Topic) │       └────────┬────────┘      │
│                          └────────┬────────┘                │               │
│                                   │                         │               │
│                                   ▼                         ▼               │
│                          ┌─────────────────────────────────────────┐       │
│                          │         Traces Page (UI)                 │       │
│                          │  • Session Selector (Global)             │       │
│                          │  • Trace Waterfall (Datadog-Style)       │       │
│                          │  • Network Events (Header Tags)          │       │
│                          │  • Session Replay (OpenReplay iframe)    │       │
│                          └─────────────────────────────────────────┘       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Implementation Status (Phase 1 - COMPLETE)

| Component | Status | Files |
|---|---|---|
| **ClickHouse Schema + Deployment** | ✅ | `deploy/clickhouse/schema.sql`, `docker-compose.yml`, `config.xml` |
| **Kafka Deployment** | ✅ | `deploy/kafka/docker-compose.yml` |
| **OpenReplay Deployment** | ✅ | `deploy/openreplay/docker-compose.yml` |
| **ClickHouse Client (Go)** | ✅ | `src/backend/internal/gateway/clickhouse.go` |
| **Traces API** | ✅ | `src/backend/internal/gateway/traces_api.go` |
| **Gateway Integration** | ✅ | `src/backend/internal/gateway/gateway.go` |
| **Stream Topics Extended** | ✅ | `src/backend/internal/streams/streams.go` |
| **Log Schema** | ✅ | `src/backend/internal/logschema/logschema.go` |
| **Logger SDK** | ✅ | `src/backend/internal/logger/logger.go` |
| **OpenSearch Client** | ✅ | `src/backend/internal/opensearch/opensearch.go` |
| **Store Methods** | ✅ | `src/backend/internal/store/store.go` |
| **TraceWaterfall (Frontend)** | ✅ | `src/frontend/src/components/traces/TraceWaterfall.tsx` |
| **NetworkEventsTable (Frontend)** | ✅ | `src/frontend/src/components/traces/NetworkEventsTable.tsx` |
| **OpenReplayEmbed (Frontend)** | ✅ | `src/frontend/src/components/traces/OpenReplayEmbed.tsx` |

---

## 3. Verification (Live on superleo)

| Test | Result |
|---|---|
| Backend build (`make go-build`) | ✅ RC=0 |
| Backend tests (`make go-test`) | ✅ 0 FAIL (except pre-existing DNS tests) |
| E2 Auth Fix: /utility with valid token | ✅ HTTP 302 → code-server |
| E2 Auth Fix: /utility with invalid token | ✅ HTTP 401 |
| E2 Auth Fix: /utility with no token | ✅ HTTP 401 |
| E2 Auth Fix: /api/projects with same token | ✅ HTTP 200 |

---

## 4. Next Phases

### Phase 2: OTel Instrumentation (Week 1-2)
- [ ] OTLP Export in `oteltrace.go` (Phase 2)
- [ ] Call-Sites in Gateway Handlers (Utility, Deploy, AI, Tunnel)
- [ ] Call-Sites in siem-bridge (Falco/Wazuh → Spans)

### Phase 3: OpenReplay + UI Integration (Week 2)
- [ ] OpenReplay Deploy + Frontend Snippet Injection (App.tsx)
- [ ] TracesPage.tsx + Components integration
- [ ] i18n Keys für 60 Locales

### Phase 4: Worker Session Propagation (Week 2)
- [ ] Utility Container Session Headers Injection
- [ ] DSH/Code-Server/Opencode Agent propagation
- [ ] End-to-End Test: Deploy → Session → Trace → Network Events → Replay

---

## 1. Architektur-Übersicht

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SESSION/TRACE/NETWORK PIPELINE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    X-Session-ID      ┌──────────────┐    Spans            │
│  │   Worker/    │ ──────────────────▶  │   Gateway    │ ───────────────▶    │
│  │   Agent      │   (Header Propagation)│  (Otel)     │                     │
│  └──────────────┘                        └──────┬───────┘                     │
│                                                 │                             │
│                                    ┌────────────┴────────────┐                │
│                                    ▼                         ▼                │
│                          ┌─────────────────┐       ┌─────────────────┐      │
│                          │   Kafka/        │       │   OpenReplay    │      │
│                          │   ClickHouse    │       │  (Session Replay)│     │
│                          │  (Traces Topic) │       └────────┬────────┘      │
│                          └────────┬────────┘                │               │
│                                   │                         │               │
│                                   ▼                         ▼               │
│                          ┌─────────────────────────────────────────┐       │
│                          │         Traces Page (UI)                 │       │
│                          │  • Session Selector (Global)             │       │
│                          │  • Trace Waterfall (Datadog-Style)       │       │
│                          │  • Network Events (Header Tags)          │       │
│                          │  • Session Replay (OpenReplay iframe)    │       │
│                          └─────────────────────────────────────────┘       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Session Propagation (X-Headers) — **BEREITS IMPLEMENTIERT (SPRINT-174-1)**

### Header Standard (propagation.go)

```go
// Canonical X-JiMesh-* header names (SPRINT-174 WP1, Session Propagation).
const (
    HeaderSessionID    = "X-JiMesh-Session-Id"
    HeaderTraceID      = "X-JiMesh-Trace-ID"
    HeaderSpanID       = "X-JiMesh-Span-ID"
    HeaderParentSpanID = "X-JiMesh-Parent-Span-ID"
    HeaderSampled      = "X-JiMesh-Sampled"
    HeaderVLAN         = "X-JiMesh-VLAN"
    HeaderNetwork      = "X-JiMesh-Network"
    HeaderScope        = "X-JiMesh-Scope"
    HeaderAgentID      = "X-JiMesh-Agent-ID"
    HeaderGitRepo      = "X-JiMesh-Git-Repo"
    HeaderGitCommit    = "X-JiMesh-Git-Commit"
)
```

### Ingress Security: `StripIngress()` — **DONE**
- Löscht **alle** INGRESS-DERIVED-ONLY Headers (Client-Spoofing Prevention)
- Aufgerufen an erster Stelle in `Handlers.Middleware`
- Ersetzt 10 einzelne `r.Header.Del` durch eine Liste, eine Implementierung

### Middleware Stamping — **DONE**
```go
StripIngress(r.Header)
traceID := NewTraceID()  // W3C trace-id: 32 hex chars
SetDerived(r.Header, HeaderTraceID, traceID)
SetDerived(w.Header(), HeaderTraceID, traceID)
```

### Scope/VLAN/Network Stamping — **PARTIAL**
| Fall | Wert | Status |
|---|---|---|
| Workspace-Scope umgestellt | `workspace` | ✅ |
| Consumer-Key mit Workspace-Bindung | `workspace` | ✅ |
| Consumer-Key mit Projekt-Bindung | `project` | ✅ |
| VLAN/Network (Tunnel) | `vlan_id` / `VLANDockerNetworkName` | ✅ in `deploy/tunnel.go` |
| Agent-ID / Git-Repo / Git-Commit | **nicht gesetzt** | ⚠️ Keine Quellfelder in Store |

---

## 3. Kafka/ClickHouse Traces Pipeline — **NEU ZU BAUEN**

### Topic Design

```yaml
# Kafka Topics (oder ClickHouse Tables)
topics:
  - name: jimesh.traces.spans
    partitions: 32
    retention: 7d
    config:
      cleanup.policy: delete
      compression.type: snappy
  
  - name: jimesh.traces.events
    partitions: 16
    retention: 30d
    config:
      cleanup.policy: delete
      compression.type: zstd
  
  - name: jimesh.network.events
    partitions: 16
    retention: 7d
    config:
      cleanup.policy: delete
      compression.type: snappy
```

### Span Schema (Protobuf — für Kafka/ClickHouse)

```protobuf
// traces.proto
syntax = "proto3";

message Span {
  string session_id = 1;
  string trace_id = 2;
  string span_id = 3;
  string parent_span_id = 4;
  string operation_name = 5;
  int64 start_time_us = 6;
  int64 duration_us = 7;
  map<string, string> tags = 8;
  map<string, string> logs = 9;
  bool sampled = 10;
  
  // JiMesh Extensions
  string session_source = 100;      // worker|agent|gateway|user
  string project_id = 101;
  string workspace_id = 102;
  string agent_id = 103;
  string vlan = 104;
  string network = 105;
  string scope = 106;               // project|workspace|global
  string git_repo = 107;
  string git_commit = 108;
  string agent_type = 109;
  string container_id = 110;
}
```

### Network Events Schema (Datadog-Style)

```protobuf
// network_events.proto
message NetworkEvent {
  string session_id = 1;
  string trace_id = 2;
  string span_id = 3;
  int64 timestamp_us = 4;
  
  // Network Info
  string src_ip = 10;
  string dst_ip = 11;
  int32 src_port = 12;
  int32 dst_port = 13;
  string protocol = 14;          // tcp|udp|icmp
  int64 bytes_sent = 15;
  int64 bytes_recv = 16;
  
  // HTTP Details
  string http_method = 20;
  string http_url = 21;
  int32 http_status = 22;
  int64 http_latency_us = 23;
  
  // Tags (Header-basiert)
  string session_id_tag = 100;      // X-JiMesh-Session-ID
  string agent_id_tag = 101;        // X-JiMesh-Agent-ID
  string git_repo_tag = 102;        // X-JiMesh-Git-Repo
  string git_commit_tag = 103;      // X-JiMesh-Git-Commit
  string vlan_tag = 104;            // X-JiMesh-VLAN
  string network_tag = 105;         // X-JiMesh-Network
  string scope_tag = 106;           // X-JiMesh-Scope
  string agent_type_tag = 107;      // worker|agent|gateway
  
  // eBPF Enrichment
  string process_name = 200;
  int32 pid = 201;
  string container_id = 202;
  string k8s_namespace = 203;
  string k8s_pod = 204;
}
```

---

## 4. OpenReplay Integration — **NEU ZU BAUEN**

### Deployment (Self-Hosted, docker-compose)

```yaml
# deploy/openreplay/docker-compose.yml
version: '3.8'
services:
  openreplay:
    image: openreplay/backend:latest
    environment:
      - DOMAIN=replay.jimesh.internal
      - DB_PASSWORD=${OPENREPLAY_DB_PASSWORD}
      - REDIS_PASSWORD=${OPENREPLAY_REDIS_PASSWORD}
      - S3_BUCKET=${OPENREPLAY_S3_BUCKET}
      - S3_REGION=${OPENREPLAY_S3_REGION}
      - S3_ACCESS_KEY=${OPENREPLAY_S3_ACCESS_KEY}
      - S3_SECRET_KEY=${OPENREPLAY_S3_SECRET_KEY}
    ports:
      - "127.0.0.1:443:443"
    volumes:
      - openreplay-db:/var/lib/postgresql
      - openreplay-redis:/data
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: '2'
    networks: [jimesh]

volumes:
  openreplay-db:
    name: jimesh-openreplay-db
  openreplay-redis:
    name: jimesh-openreplay-redis
```

### Frontend Integration (Snippet Injection in App.tsx)

```html
<!-- Injected in Frontend HTML (App.tsx) -->
<script>
  (function() {
    var OPENREPLAY_PROJECT_ID = "{{ .ProjectID }}";
    var OPENREPLAY_API_URL = "https://replay.jimesh.internal/ingest";
    
    // Session ID aus Header lesen
    var sessionId = document.querySelector('meta[name="jiMesh-session-id"]')?.content;
    if (!sessionId) return;
    
    (function() {
      var script = document.createElement('script');
      script.src = "https://replay.jimesh.internal/openreplay.js";
      script.async = true;
      script.onload = function() {
        OpenReplay.init({
          projectId: OPENREPLAY_PROJECT_ID,
          sessionId: sessionId,
          defaultInput: "sanitize",
          rootHost: window.location.host,
          maskTextSelector: "input[type=password], .sensitive",
          maskTextClass: "sensitive",
          plugins: [
            new OpenReplay.plugins.Network({ 
              captureHeaders: true,
              captureBody: true,
              maskHeaders: ["authorization", "cookie", "x-jimesh-*"]
            })
          ]
        });
      };
      document.head.appendChild(script);
    })();
  })();
</script>
```

---

## 5. Datadog-Style Network Events UI — **NEU ZU BAUEN**

### Network Events Table Component

```tsx
// src/frontend/src/components/traces/NetworkEventsTable.tsx
const NetworkEventsTable = ({ sessionId }: { sessionId: string }) => {
  const { data: events } = useQuery({
    queryKey: ['network-events', sessionId],
    queryFn: () => apiFetch(`/api/traces/${sessionId}/network-events`),
  });
  
  const columns = [
    { header: 'Time', accessor: 'timestamp', cell: fmtTime },
    { header: 'Protocol', accessor: 'protocol' },
    { header: 'Src → Dst', accessor: row => `${row.src_ip}:${row.src_port} → ${row.dst_ip}:${row.dst_port}` },
    { header: 'Bytes', accessor: row => `${fmtBytes(row.bytes_sent)} ↑ / ${fmtBytes(row.bytes_recv)} ↓` },
    { header: 'HTTP', accessor: row => row.http_method ? `${row.http_method} ${row.http_url} → ${row.http_status}` : '—' },
    { header: 'Latency', accessor: 'http_latency_us', cell: fmtLatency },
    { header: 'Tags', accessor: row => (
      <TagList tags={{
        session: row.session_id_tag,
        agent: row.agent_id_tag,
        repo: row.git_repo_tag,
        commit: row.git_commit_tag,
        vlan: row.vlan_tag,
        network: row.network_tag,
        scope: row.scope_tag,
      }} />
    )},
  ];
  
  return <DataTable data={events} columns={columns} />;
};
```

### Network Events API

```go
// GET /api/traces/:sessionId/network-events
func (h *Gateway) handleNetworkEvents(w http.ResponseWriter, r *http.Request) {
    sessionID := r.PathValue("sessionId")
    
    // Query ClickHouse / Kafka
    events := store.QueryNetworkEvents(store.NetworkEventQuery{
        SessionID: sessionID,
        Limit:     1000,
        Order:     "timestamp DESC",
    })
    
    httpx.WriteJSON(w, map[string]any{
        "events": events,
        "total":  len(events),
    })
}
```

---

## 6. Traces Page (Main UI) — **NEU ZU BAUEN**

```tsx
// src/frontend/src/views/TracesPage.tsx
const TracesPage = () => {
  const { projectId } = useParams();
  
  // Global Session Selector (alle Sessions im Project)
  const { data: sessions } = useQuery({
    queryKey: ['sessions', projectId],
    queryFn: () => apiFetch(`/api/projects/${projectId}/sessions`),
  });
  
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('1h');
  
  return (
    <div className="flex h-full bg-background">
      {/* Sidebar: Session Selector + Filters */}
      <aside className="w-96 border-r p-4 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Sessions</h2>
          <TimeRangePicker value={timeRange} onChange={setTimeRange} />
        </div>
        
        <SessionSelector
          sessions={sessions}
          selected={selectedSession}
          onSelect={setSelectedSession}
          filter={{ timeRange, projectId }}
        />
      </aside>
      
      {/* Main: Trace Detail + Network Events + Replay */}
      <div className="flex-1 flex flex-col">
        {selectedSession ? (
          <>
            {/* Trace Waterfall */}
            <div className="flex-1 min-h-0">
              <TraceWaterfall traceId={selectedSession} />
            </div>
            
            {/* Bottom: Network Events + Replay Tabs */}
            <div className="h-96 border-t flex">
              <Tabs defaultValue="waterfall">
                <TabsList>
                  <TabsTrigger value="waterfall">Trace Waterfall</TabsTrigger>
                  <TabsTrigger value="network">Network Events</TabsTrigger>
                  <TabsTrigger value="replay">Session Replay</TabsTrigger>
                </TabsList>
                
                <TabsContent value="waterfall">
                  <TraceWaterfall traceId={selectedSession} />
                </TabsContent>
                
                <TabsContent value="network">
                  <NetworkEventsTable sessionId={selectedSession} />
                </TabsContent>
                
                <TabsContent value="replay">
                  <OpenReplayEmbed sessionId={selectedSession} />
                </TabsContent>
              </Tabs>
            </div>
          </>
        ) : (
          <EmptyState>Select a session to view traces, network events, and replay</EmptyState>
        )}
      </div>
    </div>
  );
};
```

### OpenReplay Embed Component

```tsx
// src/frontend/src/components/traces/OpenReplayEmbed.tsx
const OpenReplayEmbed = ({ sessionId }: { sessionId: string }) => (
  <iframe
    src={`https://replay.jimesh.internal/session/${sessionId}?embedded=true`}
    className="flex-1 border-none"
    title="Session Replay"
    sandbox="allow-scripts allow-same-origin allow-forms"
  />
);
```

---

## 7. Session Propagation in Worker/Agent Deployment — **PARTIAL**

### Deploy Hook (Ansible — Utility Container)

```yaml
# deploy/utility-container/ansible-task.yml (Extension)
- name: utility-container — inject session headers into worker env
  ansible.builtin.lineinfile:
    path: "{{ utility_workspace_root }}/{{ project_id }}/.env"
    line: "{{ item }}"
    create: yes
  loop:
    - "JIMESH_SESSION_ID={{ deployment_session_id }}"
    - "JIMESH_TRACE_ID={{ deployment_trace_id }}"
    - "JIMESH_VLAN={{ project_vlan }}"
    - "JIMESH_NETWORK={{ project_network }}"
    - "JIMESH_SCOPE=project"
    - "JIMESH_PROJECT_ID={{ project_id }}"
    - "JIMESH_GIT_REPO={{ git_repo_url }}"
    - "JIMESH_GIT_COMMIT={{ git_commit_sha }}"

- name: utility-container — restart code-server to pick up env
  ansible.builtin.command: docker restart utility-{{ project_id }}
  when: deployment_session_id is defined
```

### Worker Code (Session Propagation)

```go
// internal/worker/session.go
func (w *Worker) Start(ctx context.Context) error {
    // Session Headers aus Env lesen
    sessionID := os.Getenv("JIMESH_SESSION_ID")
    traceID := os.Getenv("JIMESH_TRACE_ID")
    
    // HTTP Client mit Session Propagation
    w.httpClient = &http.Client{
        Transport: &sessionRoundTripper{
            sessionID: sessionID,
            traceID:   traceID,
            base:      http.DefaultTransport,
        },
    }
    
    // WebSocket für Terminal/Logs auch mit Session
    w.wsDialer = &sessionDialer{
        sessionID: sessionID,
        traceID:   traceID,
    }
    
    return w.run(ctx)
}

type sessionRoundTripper struct {
    sessionID string
    traceID   string
    base      http.RoundTripper
}

func (rt *sessionRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
    if rt.sessionID != "" {
        req.Header.Set("X-JiMesh-Session-ID", rt.sessionID)
    }
    if rt.traceID != "" {
        req.Header.Set("X-JiMesh-Trace-ID", rt.traceID)
    }
    return rt.base.RoundTrip(req)
}
```

---

## 8. OTel Instrumentation — **NEU ZU BAUEN (Call-Sites)**

### Gateway Handlers → Spans

```go
// In jedem Handler: ctx, span := oteltrace.StartSpan(r.Context(), "handler_name", attrs)
// defer oteltrace.EndSpan(span)

// Beispiel: project_utility.go handleUtilityProxy
ctx, span := oteltrace.StartSpan(r.Context(), "utility_proxy", map[string]string{
    oteltrace.AttrProjectID: projectID,
    oteltrace.AttrSessionID: sessionID,
})
defer oteltrace.EndSpan(span)
```

### Deploy Path → Spans

```go
// internal/deploy/projects_ssh.go DeployProject
ctx, span := oteltrace.StartSpan(ctx, oteltrace.SpanDeploy, map[string]string{
    oteltrace.AttrProjectID: projectID,
    "workspace_id": workspaceID,
    "agent_type": framework,
})
defer oteltrace.EndSpan(span)
```

### AI Proxy → Spans

```go
// internal/ai/proxy.go — bereits Trace-ID in Response Header
// Jetzt auch Span erstellen:
ctx, span := oteltrace.StartSpan(r.Context(), oteltrace.SpanInvokeAgent, map[string]string{
    oteltrace.AttrAgentName: agentName,
    oteltrace.AttrSessionID: sessionID,
})
defer oteltrace.EndSpan(span)
```

---

## 9. Files to Create/Modify

### Backend (Go)

| File | Beschreibung | Status |
|---|---|---|
| `src/backend/internal/gateway/kafka_traces.go` | Kafka Producer für Spans | 🔴 NEU |
| `src/backend/internal/gateway/network_events.go` | Network Events Consumer/Producer | 🔴 NEU |
| `src/backend/internal/gateway/traces_api.go` | Traces API Handler (/api/traces/...) | 🔴 NEU |
| `src/backend/internal/gateway/openreplay.go` | OpenReplay Integration | 🔴 NEU |
| `src/backend/internal/store/sessions.go` | Session Store Methods (ListProjectSessions, etc.) | 🔴 NEU |
| `src/backend/internal/store/network_events.go` | Network Events Store (ClickHouse) | 🔴 NEU |
| `src/backend/internal/oteltrace/oteltrace.go` | **Erweitern**: OTLP Export, Call-Sites | 🟡 ERWEITERN |
| `src/backend/internal/auth/propagation.go` | **FERTIG** (SPRINT-174-1) | ✅ DONE |
| `deploy/kafka/` | Kafka Topics Config | 🔴 NEU |
| `deploy/clickhouse/` | ClickHouse Schema + Deployment | 🔴 NEU |
| `deploy/openreplay/` | OpenReplay Deployment | 🔴 NEU |

### Frontend (React/TS)

| File | Beschreibung | Status |
|---|---|---|
| `src/frontend/src/views/TracesPage.tsx` | Main Traces Page | 🔴 NEU |
| `src/frontend/src/components/traces/TraceWaterfall.tsx` | Trace Waterfall Visualization | 🔴 NEU |
| `src/frontend/src/components/traces/NetworkEventsTable.tsx` | Network Events Table | 🔴 NEU |
| `src/frontend/src/components/traces/OpenReplayEmbed.tsx` | OpenReplay Iframe Embed | 🔴 NEU |
| `src/frontend/src/components/traces/SessionSelector.tsx` | Global Session Selector | 🔴 NEU |
| `src/frontend/src/components/traces/TraceDetail.tsx` | Trace Detail View | 🔴 NEU |
| `src/frontend/src/lib/session.ts` | Session Context, Header Helpers | 🟡 ERWEITERN |
| `src/frontend/src/views/TracesPage.tsx` | Route `/projects/:id/traces` | 🔴 NEU |

### i18n Keys (60 Locales)

```
traces.page.title
traces.session.selector
traces.session.empty
traces.waterfall.title
traces.waterfall.no_data
traces.network.title
traces.network.columns.time
traces.network.columns.protocol
traces.network.columns.src_dst
traces.network.columns.bytes
traces.network.columns.http
traces.network.columns.latency
traces.network.columns.tags
traces.replay.title
traces.replay.loading
traces.replay.error
traces.time_range.1h
traces.time_range.6h
traces.time_range.24h
traces.time_range.7d
```

---

## 10. Acceptance Criteria

| # | Kriterium | Verifikation |
|---|-----------|--------------|
| 1 | Jeder Worker/Agent Deployment bekommt Session ID | `GET /api/projects/{id}/sessions` → neue Session sichtbar |
| 2 | Session Headers propagieren | `curl -H "X-JiMesh-Session-ID: xxx" ...` → Downstream Services erhalten Header |
| 3 | Kafka/ClickHouse Traces Topic empfängt Spans | `kafka-console-consumer --topic jimesh.traces.spans` → Spans sichtbar |
| 4 | OpenReplay Session Replay funktioniert | Traces Page → Replay Tab → Session Replay lädt |
| 5 | Network Events sichtbar | Traces Page → Network Tab → Events mit Tags sichtbar |
| 6 | Datadog-Style Network Events | Src/Dst IP, Port, Protocol, Bytes, HTTP, Latency, Tags |
| 7 | Header Tags in Network Events | Session ID, Agent ID, Git Repo, Commit, VLAN, Network, Scope |
| 8 | Session Selector global | Traces Page → Session Selector zeigt alle Project Sessions |
| 9 | OPA/Permissions Integration | Session ID in OPA Input → Policy Decisions |
| 10 | Trust Ratchet / Threat Detection | Session ID in Security Events korreliert |

---

## 11. Implementation Phases

### Phase 1: Storage & Pipeline (Week 1)
- [ ] ClickHouse Schema + Deployment (`deploy/clickhouse/`)
- [ ] Kafka Topics Config (`deploy/kafka/`)
- [ ] `kafka_traces.go` — Span Producer
- [ ] `network_events.go` — Network Events Pipeline
- [ ] Store Methods für Sessions + Network Events

### Phase 2: OTel Instrumentation (Week 1-2)
- [ ] OTLP Export in `oteltrace.go` (Phase 2)
- [ ] Call-Sites in Gateway Handlers (Utility, Deploy, AI, Tunnel)
- [ ] Call-Sites in siem-bridge (Falco/Wazuh → Spans)

### Phase 3: OpenReplay + UI (Week 2)
- [ ] OpenReplay Deployment (`deploy/openreplay/`)
- [ ] Frontend Injection in App.tsx
- [ ] TracesPage.tsx + Components (Waterfall, NetworkEventsTable, OpenReplayEmbed, SessionSelector)
- [ ] i18n Keys für 60 Locales

### Phase 4: Integration & Verification (Week 2-3)
- [ ] Worker/Agent Session Propagation (Utility Container, DSH, etc.)
- [ ] End-to-End Test: Deploy → Session → Trace → Network Events → Replay
- [ ] Performance: Sampling Rate, Retention, Cardinality

---

## 12. Related Sprints

| Sprint | Relation |
|--------|----------|
| **S170** | Utility Container → Session Headers Injection |
| **S171** | Onboarding → Session Creation bei Project Create |
| **S173** | IA Scope → Session Scope Selector |
| **S182** | Terminal/Container Overview → Session Headers |
| **S182** | Dashboard Builder → Session Context |
| **S184** | DNS → Session ID in DNS Labels |
| **S168** | Threat Correlation → Session ID in Threat Events |
| **S169** | Auto-Mint Service Keys → Session ID in Deploy Records |
| **S185** | Gateway-Fabric → Network Events Source |

---

## 14. WAF Integration mit Traces Pipeline

### Coraza WAF Sidecar (Bestehend — Sprint 31, TASK-057)

| Komponente | Status | Details |
|---|---|---|
| **WAF Image** | ✅ `jimesh-waf` | Coraza v3.7.0 + OWASP CRS v4.25.0 embedded via coraza-caddy v2.6.1 |
| **Deployment** | ✅ Per Project/Workspace | Opt-in via `waf=true` in DeployRequest → Sidecar `jimesh-waf-<nameKey>` joined to project Docker network |
| **Rules** | ✅ OWASP CRS v4 | Paranoia Level 1, Blocking Mode (`SecRuleEngine On`), Request Body Inspection |
| **Port Handling** | ✅ Same port as app | `WAF_LISTEN_PORT` = app port, `WAF_UPSTREAM_HOST` = workspace container name |
| **Rate Limiting** | ❌ Nicht implementiert | Caddyfile hat nur `coraza_waf` + `reverse_proxy`, keine `rate_limit` directive |
| **Geo Blocking** | ❌ Nicht implementiert | Firewall Rules validieren nur IP/CIDR, keine Country Resolution |

### WAF → Traces Integration (NEU für Sprint 174)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        WAF EVENTS IN TRACES PIPELINE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Client Request → WAF Sidecar (Coraza) → App Container                       │
│       │                │                        │                             │
│       ▼                ▼                        ▼                             │
│  ┌─────────┐    ┌─────────────┐          ┌─────────────┐                    │
│  │ Network │    │  WAF Audit  │          │  App Spans  │                    │
│  │ Event   │    │  Log Event  │          │  (OTel)     │                    │
│  └────┬────┘    └──────┬──────┘          └──────┬──────┘                    │
│       │                │                        │                             │
│       └────────────────┼────────────────────────┘                             │
│                        ▼                                                      │
│              ┌───────────────────┐                                           │
│              │  X-JiMesh-* Headers│  (Session-ID, Trace-ID, Scope,          │
│              │  propagieren durch │   VLAN, Network, Agent-ID, Git-Repo,    │
│              │  WAF → App)        │   Git-Commit, Container-ID)             │
│              └─────────┬─────────┘                                           │
│                        ▼                                                      │
│              ┌───────────────────┐                                           │
│              │   ClickHouse       │  (Network Events + Spans Table)          │
│              │   - WAF Events     │  - rule_id, rule_msg, rule_severity     │
│              │   - App Spans      │  - matched_var, tx:variable              │
│              │   - Session Link   │  - Matched via Session-ID + Container-ID │
│              └─────────┬─────────┘                                           │
│                        ▼                                                      │
│              ┌───────────────────┐                                           │
│              │   Traces Page      │  - WAF Events Tab (per Session)          │
│              │   - Waterfall      │  - Rule Matches mit Severity             │
│              │   - Network Events │  - Blocked/Allowed/Detected              │
│              │   - WAF Events     │  - Correlation mit App Spans             │
│              └───────────────────┘                                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### WAF Event Schema Extension (Network Events Table)

```sql
-- Zusätzliche Felder in network_events für WAF Correlation
ALTER TABLE jimesh_traces.network_events ADD COLUMN IF NOT EXISTS
    waf_rule_id         String,
    waf_rule_msg        String,
    waf_rule_severity   String,      -- CRITICAL|ERROR|WARNING|NOTICE
    waf_rule_tags       Array(String), -- OWASP-CRS tags (sqli, xss, rce, etc.)
    waf_matched_var     String,      -- z.B. "ARGS:search", "REQUEST_HEADERS:User-Agent"
    waf_tx_variable     String,      -- Transaktionsvariable (z.B. "TX:ANOMALY_SCORE")
    waf_action          String,      -- "block" | "detect" | "allow"
    waf_paranoia_level  UInt8;       -- 1-4
```

### WAF Metrics → ClickHouse (für Traces Page)

```go
// WAF Metrics aus coraza-caddy (prometheus endpoint auf :8765)
type WAFMetrics struct {
    RequestsTotal       uint64 `prometheus:"coraza_waf_requests_total"`
    RequestsBlocked     uint64 `prometheus:"coraza_waf_requests_blocked_total"`
    RequestsDetected    uint64 `prometheus:"coraza_waf_requests_detected_total"`
    RulesMatched        uint64 `prometheus:"coraza_waf_rules_matched_total"`
    AnomalyScore        float64 `prometheus:"coraza_waf_anomaly_score"`
    ProcessingTimeMs    float64 `prometheus:"coraza_waf_processing_time_seconds"`
}

// Periodisch (alle 15s) scrapen und in ClickHouse schreiben
// → Traces Page zeigt WAF Health pro Session/Container
```

### Frontend: WAF Events Tab in Traces Page

```tsx
// src/frontend/src/components/traces/WAFEventsTable.tsx
const WAFEventsTable = ({ sessionId, containerId }: { sessionId: string; containerId?: string }) => {
  const { data: events } = useQuery({
    queryKey: ['waf-events', sessionId, containerId],
    queryFn: () => apiFetch(`/api/traces/${sessionId}/waf-events?container_id=${containerId || ''}`),
  });

  const columns = [
    { header: 'Time', accessor: 'timestamp', cell: fmtTime },
    { header: 'Rule ID', accessor: 'waf_rule_id' },
    { header: 'Message', accessor: 'waf_rule_msg', cell: truncate(100) },
    { header: 'Severity', accessor: 'waf_rule_severity', cell: badgeSeverity },
    { header: 'Tags', accessor: 'waf_rule_tags', cell: tagList },
    { header: 'Matched Var', accessor: 'waf_matched_var' },
    { header: 'Action', accessor: 'waf_action', cell: badgeAction }, // block/detect/allow
    { header: 'Anomaly Score', accessor: 'waf_tx_variable', cell: fmtScore },
  ];

  return <DataTable data={events} columns={columns} />;
};
```

### API Endpoint für WAF Events

```go
// GET /api/traces/:sessionId/waf-events?container_id=
func (s *Server) handleWAFEvents(w http.ResponseWriter, r *http.Request) {
    sessionID := r.PathValue("sessionId")
    containerID := r.URL.Query().Get("container_id")
    
    // Query ClickHouse network_events with WAF fields
    events, err := s.ch.ListNetworkEvents(ctx, store.NetworkEventFilter{
        SessionID:   sessionID,
        ContainerID: containerID,
        // Filter: nur Events mit waf_rule_id != ""
    })
    // Return enriched events
}
```

---

## 15. Offene Fragen (Operator Decision Required)

1. **Kafka vs. ClickHouse vs. TimescaleDB** für Traces Storage? → **Empfehlung: ClickHouse** (OLAP, komprimiert, SQL-Interface, läuft bereits für andere Workloads)
2. **OpenReplay vs. rrweb** — OpenReplay (Full Suite) vs. rrweb (Core only)? → **Empfehlung: OpenReplay Self-Hosted** (Session Replay + Network Tab + Plugins)
3. **eBPF Network Events** — Cilium/Hubble Integration oder eigenes eBPF? → **Empfehlung: Cilium Hubble** (bereits eBPF, Kubernetes-native, Export nach Kafka/ClickHouse)
4. **Session Retention** — 7d / 30d / 90d? → **Empfehlung: 30d Traces, 90d Network Events, 7d Session Replay**
5. **Sampling Rate** — 100% oder adaptive? → **Empfehlung: 100% für Errors/High-Cardinality, 10% für normale Requests**
6. **Cross-Project Sessions** — Erlaubt oder strikt getrennt? → **Strikt getrennt** (Project Isolation)
7. **WAF Rate Limiting** — In Caddy implementieren (rate_limit directive) oder separater Layer? → **Empfehlung: Caddy rate_limit** (einfaches `rate_limit { requests 100 window 60s }` in Caddyfile)
8. **WAF Geo Blocking** — MaxMind GeoIP in Coraza oder Caddy? → **Empfehlung: Coraza GeoIP** (OWASP CRS hat GeoIP Rules, braucht nur DB)
9. **WAF Custom Rules per Project** — Dashboard Editor für CRS Exclusions/Overrides? → **v2 Decision** (E-W1: v1 = Image-shipped Defaults)

---

## 16. Start-Commits (Diese Session)

1. **Storage Layer**: ClickHouse Schema + `store/network_events.go` + `store/sessions.go`
2. **Pipeline**: `kafka_traces.go` + `network_events.go` (Producer/Consumer)
3. **API**: `traces_api.go` + `openreplay.go` (Routes)
4. **OTel**: `oteltrace.go` erweitern (OTLP Export) + Call-Sites
5. **Deploy**: `deploy/clickhouse/`, `deploy/kafka/`, `deploy/openreplay/`
6. **Frontend**: TracesPage + Components + i18n
7. **Integration**: Worker Session Propagation + Verifikation

---

**Nächster Schritt:** Phase 1 beginnen — ClickHouse Schema + Store Methods + Kafka Producer