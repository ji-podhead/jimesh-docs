# JiMesh Research 04: OTel-Tracing-Spine fuer Agent-Traces

Report-Only-Audit (keine Code-Aenderung, keine Git-Ops). Basis: interne Research-Basis
docs_dev/research/agent_firewalls_article.md (Sektionen 3, 4, 7, Follow-ups), direkte
Code-Lektuere in /home/ji/projects/jimesh/src/backend, Shallow-Clones der externen
Repos unter /home/ji/projects/jimesh/docs_dev/research/research-forks/ (Klon-Stand
2026-09-16 bis 2026-09-18). Kernfrage: Wie bekommt JiMesh eine OpenTelemetry-Tracing-Spine
fuer Agent-Traces (Retrieval, Tool-Calls, Verify-Schritte), OHNE das Audit-Ledger zu
ersetzen? Kurzantwort: OTel wird die zweite Schicht (Debug/Observability), die AUS den
existierenden Ledger-Pfaden und Request-Kontexten speist und nach deren Schreiben exportiert;
das Ledger bleibt Compliance-Ground-Truth.

## Was das externe Tool macht

Alle Pfade unter research-forks = /home/ji/projects/jimesh/docs_dev/research/research-forks/.

### OpenLLMetry (traceloop/openllmetry)

- Was: eine Suite aus OpenTelemetry-Instrumentierungen fuer LLM- und Agent-Anwendungen.
  Eigenbeschreibung aus dem Klon: "set of extensions built on top of OpenTelemetry",
  "still outputting standard OpenTelemetry data" (traceloop__openllmetry/README.md Zeilen 54 bis 59);
  instrumentiert alles, was open-telemetry-python-contrib schon abdeckt, plus eigene
  LLM/VectorDB-Erweiterungen (README.md Zeile 118).
- Bestand (verifiziert, ls packages/): 30+ Python-Instrumentierungspakete, darunter
  opentelemetry-instrumentation-openai, -anthropic, -litellm, -langchain, -llamaindex,
  -crewai, -ollama, -bedrock, -vertexai, -mistralai, -groq, -cohere, -sagemaker,
  -together, -openai-agents, plus Vector-DBs (chromadb, qdrant, pinecone, weaviate,
  milvus, lancedb, marqo) und opentelemetry-instrumentation-mcp; dazu das
  traceloop-sdk (Bootstrap/Pipeline) und opentelemetry-semantic-conventions-ai
  (semconv-Helfer), sample-app. Siehe traceloop__openllmetry/packages/.
- Version: traceloop-sdk 0.62.3 (packages/traceloop-sdk/pyproject.toml: "version = \"0.62.3\"";
  CHANGELOG.md: "v0.62.3 (2026-08-10)"). Klon-HEAD-Commit 2026-09-17.
- Lizenz: Apache-2.0 (traceloop__openllmetry/LICENSE, "Apache License, Version 2.0").
- Stars: ca. 7.4k (Quelle: Research-Basis, agent_firewalls_article.md Zeilen 1206 bis 1214,
  Scrape 2026-09-18; aus dem Klon selbst nicht verifizierbar).
- Privacy-relevant: die Instrumentierungen schreiben Prompts/Completions per Default in
  Span-Attribute; abschaltbar mit TRACELOOP_TRACE_CONTENT=false
  (packages/opentelemetry-instrumentation-mcp/README.md, Privacy-Abschnitt).
- Sprache: nur Python (plus JS-Schwesterprojekt, im Klon nicht enthalten). Kein Go-SDK.
- Langfuse-Anbindung: OpenLLMetry exportiert Standard-OTLP; die Langfuse-Integration ist
  in der eigenen Doku gelistet (README.md Zeile 114: "OpenTelemetry Collector"-Integration,
  exporting-Doku fuer weitere Backends).

### open-telemetry/semantic-conventions + semantic-conventions-genai

- Die GenAI-Konventionen sind aus dem Haupt-Repo ausgezogen: docs/gen-ai/gen-ai-spans.md
  und gen-ai-agent-spans.md sind im Klon open-telemetry__semantic-conventions reine
  Verweis-Stubs ("Moved ... semantic-conventions-genai", docs/gen-ai/gen-ai-spans.md
  Zeilen 5 bis 11). Das bestätigt die in-repo-Notiz in
  docs_dev/knowledge/security-and-observability/guardrails-and-firewalls/
  r37-guardrails-otel-reference-stack.md (R37 §2, Zeilen 37 bis 39).
- Klon open-telemetry__semantic-conventions-genai (Commit c88d504, 2026-09-16), Lizenz
  Apache-2.0 (LICENSE), Status der GenAI-Doku: Development (docs/gen-ai/gen-ai-agent-spans.md
  Zeile 7). Definierte Span-Namen (Datei:Zeile im Klon):
  - "create_agent {gen_ai.agent.name}" (gen-ai-agent-spans.md Zeile 45)
  - "invoke_agent {gen_ai.agent.name}" (Zeilen 200 und 551)
  - "invoke_workflow {gen_ai.workflow.name}" (Zeile 820)
  - "plan {gen_ai.agent.name}" (Zeile 983)
  - "Execute tool span" als eigene Sektion (Zeile 1050), Operation "execute_tool" als
    operation.name-Wert (Zeilen 138, 478, 756, 941, 1032)
  - LLM-Client-Span-Format "{gen_ai.operation.name} {gen_ai.request.model}"
    (docs/gen-ai/gen-ai-spans.md Zeile 53)
- Definierte Attribute (Datei:Zeile im Klon): gen_ai.agent.id (agent-spans.md Zeilen 62
  und 218), gen_ai.conversation.id (agent-spans.md Zeile 221; gen-ai-spans.md Zeile 68),
  gen_ai.operation.name und gen_ai.provider.name (agent-spans.md Zeilen 58 bis 59),
  gen_ai.request.model (Zeile 65 der LLM-Tabelle), gen_ai.prompt.name/version,
  gen_ai.usage.* (Registry), gen_ai.tool.definitions als Opt-In (Zeile 253). Die
  operation.name-Liste enthaelt auch "retrieval" (Zeile 144) fuer zukuenftige
  Retrieval-Spans.

### open-telemetry/opentelemetry-go

- Was: das pure-Go OpenTelemetry-SDK inkl. OTLP-Exportern. Lizenz Apache-2.0
  (LICENSE; live-Verifikation der Lizenz bereits in R37 §2, Zeile 36: "Apache-2.0,
  pure Go -> Mandat-7-kompatibel"). Version im Klon: 1.47.0-rc.1 (2026-08-28, CHANGELOG.md;
  darunter "[Unreleased]"). Klon-HEAD-Commit 2026-09-18.
- OTLP-Exporter im Klon: otlptracegrpc und otlptracehttp
  (exporters/README.md Zeilen 16 bis 17). OTLP/HTTP-Default-Endpunkt:
  "https://localhost:4318/v1/traces" (exporters/otlp/otlptrace/otlptracehttp/doc.go
  Zeile 6) und "OTEL_EXPORTER_OTLP_ENDPOINT (default: \"https://localhost:4318\")"
  (doc.go Zeile 12). Die gRPC-Variante entspricht dem 4317-Port, den R37 §2
  (Zeilen 47 bis 51) fuer das Langfuse-Collector-Beispiel verifiziert hat.
- Stars: aus dem Klon nicht verifizierbar (hier bewusst keine Zahl behauptet).

### langfuse/langfuse (v4)

- Was: Self-Hosted LLM/Agent-Observability-Plattform; im Klon bestätigt, dass Traces
  nativ per OpenTelemetry/OTLP angenommen werden: Route
  web/src/pages/api/public/otel/v1/traces/index.ts; API-Vertrag in
  fern/apis/server/definition/api.yml Zeile 5: "The only real-time path to get tracing
  data is to ingest via OpenTelemetry (POST /api/public/otel/v1/traces)" mit Pflicht-Header
  "x-langfuse-ingestion-version: 4". Die alte v3-Ingestion-API ist deprecatet
  (fern/apis/server/definition/ingestion.yml Zeile 12: Cloud-Abschaltung am 2026-11-16
  ausser score-create; Self-Hosted bis zum v4-Upgrade unverändert).
- Version: package.json "version": "4.38.0" (Klon-HEAD ca. 2026-09-18).
- Lizenz: LICENSE Zeilen 1 bis 10: Copyright 2023-2026 ClickHouse, Inc.; Kern MIT-Expat,
  Inhalte unter ee/, web/src/ee/ und worker/src/ee/ unter ee/LICENSE. Der Auftrag ging von
  "Apache-2.0" aus, das LICENSE-File sagt das nicht; R37 §2 (Zeile 65) nennt Langfuse
  ebenfalls "unsere bestehende Wahl, MIT". Korrektur hier festgehalten.
- GenAI-Span-Mapping: Observation-Typen inkl. guardrail, tool, agent, retriever sind in
  Langfuse first-class (R37 §2, Zeilen 47 bis 51, live verifiziert).
- Stars: aus dem Klon nicht verifizierbar.
- Clone-Fehlschlag dokumentiert: langfuse/langfuse-go existiert unter diesem Pfad nicht
  (git-Klon-Antwort: "Repository not found"). Ein Go-SDK von Langfuse ist damit aus den
  Klons nicht belegt.

## Was JiMesh heute dafuer hat

JiMesh-Pfad-Basis: /home/ji/projects/jimesh/src/backend. Zeilen-Belege aus direkter Lektuere.

1. Bestehender Langfuse-Client (Sprint 7), handgerollt, nur Chat-Proxy-Traces:
   - internal/tracing/langfuse.go Zeilen 1 bis 12: Paket-Doku, Export via "POST
     /api/public/ingestion, Basic auth pk:sk", fire-and-forget, Session-Gruppierung
     ueber JiMesh-sessionId, disabled ohne LANGFUSE_PUBLIC_KEY/SECRET_KEY.
   - Zeilen 29 bis 46: ChatCall-Struct (TraceID, SessionID, UserID, AgentTypeID,
     ChainID, Strategy, ModelID, Platform, KeyID, Success, LatencyMs, InputTokens,
     OutputTokens, CostUSD, Error, TsUnixMs).
   - Zeilen 74 bis 108: NewFromEnv (LANGFUSE_BASE_URL/PUBLIC_KEY/SECRET_KEY/ENABLED,
     Default https://cloud.langfuse.com).
   - Zeilen 148 bis 244: RecordChat erzeugt je Call ein "trace-create" plus
     "generation-create"-Event (Tags aus AgentTypeID/Platform/ModelID, Metadata mit
     chain_id/strategy/key_id/session_id/agent_type/cost_usd).
   - Zeilen 246 bis 257 (enqueue, Queue-Cap 1000), Zeilen 259 bis 299 (flush:
     Zeile 280 POST /api/public/ingestion, Zeile 286 SetBasicAuth; Fehler werden
     geloggt und der Batch verworfen), Zeilen 301 bis 318 (SanitizeID, 64-Zeichen-Cap).
   - Verkabelung: cmd/server/main.go Zeilen 166 bis 170 (tracer := tracing.NewFromEnv();
     tracer.Start(); defer tracer.Stop()); ENV-Beleg .env.example Zeilen 163 bis 170.
2. Feed-Pfad in die Traces: internal/service/service.go
   - Zeilen 300 bis 327: RequestSummary (inkl. ConsumerKeyID Zeile 321 "Sprint 22 WP7",
     WorkspaceID Zeile 324 "Sprint 35 WP1c").
   - Zeilen 329 bis 389: RecordRequestSummary: In-Memory-Ring (Zeilen 335 bis 340),
     Persistenz-Queue logCh (Zeilen 344 bis 349, requestLogToRow), Budget-Buchung
     (Zeilen 358 bis 365), Redis-Stream jimesh:requests (Zeilen 367 bis 369),
     Tracer.RecordChat (Zeilen 370 bis 388). Kommentar Zeile 330: fire-and-forget,
     "never blocks the proxy path on Redis/Langfuse".
   - Quelle der Summaries: internal/analytics/observers.go Zeilen 28 bis 63
     (recordAttemptSummary; Kommentar Zeile 29: "in-memory ring + jimesh:requests
     stream + Langfuse trace").
3. Audit-Ledger fuer Agent-Tool-Calls (der zu erhaltende Ground-Truth):
   - internal/subagents/toolcalls.go Zeilen 3 bis 19: Paket-Doku (allow/guard/deny,
     Ledger-Row je Outcome, GUARDED-Queue, capability caller-DECLARED plus
     Spawn-Grant-Reconciliation; Intent-Verifikation als dokumentiertes Follow-up).
   - Zeilen 107 bis 123: OPA-Evaluation VOR Ausfuehrung, fail-closed (Engine nil ->
     500; Eval-Error -> 500).
   - Zeilen 128 bis 168: guard -> CreateSubagentToolCall status='guarded' (Zeilen
     133 bis 136), deny -> status='denied' (Zeilen 155 bis 158), beides mit Risk
     und Reason verbatim.
   - Zeilen 170 bis 188: allow -> Ledger-Row status='approved' (Zeilen 171 bis 178),
     executeInContainer (Zeile 179), UpdateSubagentToolCallStatus auf done/error
     (Zeile 180).
   - Zeilen 191 bis 277: JIT approve/deny fuer die GUARDED-Queue (decideGuarded,
     Doppel-Entscheidung ausgeschlossen, decidedBy-Audit).
   - Zeilen 283 bis 300: executeInContainer (docker exec im Subagent-Container,
     Result-Cap 64 KiB), Zeilen 331 bis 335: requestedByLabel ("key:"+ck.ID oder
     "operator").
   - Schema: internal/store/subagents.go Zeilen 56 bis 73 (SubagentToolCallRow:
     ID "tc-<16hex>", Status guarded|approved|denied|done|error, Risk, Reason,
     Result, RequestedBy, DecidedBy) und Zeilen 99 bis 118 (CREATE TABLE
     subagent_tool_calls plus Index), Zeilen 412 bis 433 (CreateSubagentToolCall),
     Zeilen 500 bis 503 (UpdateSubagentToolCallStatus).
4. Identitaetskette, aus der Spans-Attribute sauber ableitbar sind:
   - internal/auth/auth.go Zeilen 618 bis 621: X-JiMesh-Key-Kind/Workspace-Id/
     Session-Id/Project-Id werden VOR jedem Zugriff geloescht (INGRESS-DERIVED-ONLY).
   - Zeilen 687 bis 700 (/api/sdk-Branch), Zeilen 757 bis 773 und 882 bis 898
     (/v1-Consumer-Key-Pfad): Re-Stamp der Header aus der verifizierten
     ConsumerKeyRow in den Request-Kontext.
   - internal/subagents/spawn.go Zeilen 173 bis 200: "Identity before existence":
     CreateSubagentSession (Zeile 179, parent = Workspace-Session), 
     MintSubagentSessionToken (Zeile 186), CreateSubagentServiceKey (Zeile 195).
   - Zeilen 218 bis 226: docker run ENV fuer den Agent-Container (JIMESH_SUBAGENT_ID,
     JIMESH_WORKSPACE_ID, JIMESH_SESSION_ID, JIMESH_SESSION_TOKEN, OPENAI_API_KEY =
     Service-Key, OPENAI_BASE_URL = Gateway-URL). Keine OTEL_*-Variablen.
   - Zeilen 424 bis 435: validateGrantableCapabilities, fail-closed am Spawn.
5. Policy-Entscheidung als strukturiertes Objekt (Spans-Quelle):
   - internal/policy/capabilities.go Zeilen 41 bis 56 (CapabilityInput,
     CapabilityDecision: Allow/Guard/Risk/Reason) und Zeilen 82 bis 121
     (EvaluateCapability, fail-closed, allow+guard gegenseitig ausgeschlossen).
   - internal/policy/policies/capabilities.rego Zeilen 1 bis 23 (Decision-Vertrag)
     und Zeilen 113 bis 120 (Catalog als Single Source of Truth).
6. Weitere Telemetrie-Surfaces, die OTel ergaenzen wuerde:
   - sdk_logs-Pipeline (Sprint 36): internal/sdklogs/sdklogs.go Zeilen 66 bis 69
     (Register /api/sdk/logs, /api/sdk/sessions), Zeilen 112 bis 124
     (resolveSession, Server-seitige Session-Auswahl); internal/store/sdk_logs.go
     Zeilen 23 bis 63 (SDKLogRow + ensureSDKLogsTable), Zeilen 73 bis 87
     (InsertSDKLog + fireAuditCritical), Zeilen 19 bis 21 (jimesh:events-Stream,
     Postgres als durable copy).
   - SSE-Event-Hub: internal/subagents/hub.go Zeilen 1 bis 14 (in-memory Fanout,
     Kommentar: "the durable truth is the subagents / subagent_tool_calls rows"),
     Zeilen 18 bis 24 (Event), Zeile 32 (eventRingCap 50).
   - SDK-Logger mit gen_ai.*-Namenskonvention OHNE OTel-SDK:
     internal/sdk/logger/logger.go Zeilen 17 bis 20 ("use plain gen_ai.*-named keys
     inside Payload without any opentelemetry-go dependency (deliberate v1 decision)").
7. Planungs-Doku, die OTel bereits als Richtung nennt:
   - R37 (docs_dev/knowledge/security-and-observability/guardrails-and-firewalls/
     r37-guardrails-otel-reference-stack.md) Zeilen 34 bis 57: opentelemetry-go
     Mandat-7-kompatibel, gen_ai-semconv Status Development, Langfuse akzeptiert OTLP,
     WP5-Entscheidung "eigene kompakte Schema-Gen_ai-Feldnamen + optionaler
     OTLP-Export-Pfad (opentelemetry-go)".
   - docs/FEATURE_ROADMAP.md Zeilen 103 bis 105 (LangSmith optional; "Custom Trace
     Format - OpenTelemetry-kompatibel" offen) und Zeile 205 ("Tracing - OpenTelemetry").
   - docs/K-LAF-ARCHITECTURE.md Zeile 118 (Traces: Langfuse-Layer, jimesh:events).

## Was fehlt

1. Kein OTel-SDK im Backend: src/backend/go.mod Zeilen 5 bis 18 (require-Block) enthaelt
   pgx, redis, OPA, prometheus, grpc, protobuf, mcp-go, franz-go, jwt, websocket. Keine
   go.opentelemetry.io/otel-Abhaengigkeit. Damit gibt es keine TracerProvider, keine
   Spans, keinen OTLP-Exporter.
2. Keine Agent-Spans: spawn.go erzeugt Identitaet und Container (Zeilen 154 bis 253)
   und hub.go emits SSE-Events (Zeilen 18 bis 24), aber es entsteht kein OTel-Span
   fuer Session, Agent-Instanz, Tool-Call, Policy-Entscheidung oder Verify-Ergebnis.
   Die einzige Trace-Familie ist ChatCall (langfuse.go Zeilen 29 bis 46) fuer den
   LLM-Proxy-Pfad.
3. Kein OTLP-Export und keine OTLP-Route: der bestehende Client spricht nur die alte
   Langfuse-/api/public/ingestion (langfuse.go Zeilen 3 und 280). Die ist in Langfuse v4
   deprecatet (langfuse-Klon, fern/apis/server/definition/ingestion.yml Zeile 12); der
   OTLP-Pfad POST /api/public/otel/v1/traces (fern/apis/server/definition/api.yml
   Zeile 5) wird nirgendwo in JiMesh genutzt. Es gibt keinen OTel-Collector und keinen
   Empfangs-Endpunkt fuer Container-Spans.
4. Keine Korrelation Ledger <-> Trace: SubagentToolCallRow (store/subagents.go Zeilen
   59 bis 73) hat keine trace_id-/span_id-Spalte; die ChatCall-TraceID (langfuse.go
   Zeile 30) ist eine JiMesh-interne Zeichenkette (SanitizeID, Zeilen 301 bis 318),
   keine W3C-Trace-ID, und die Ledger-Rows fuer Tool-Calls haben gar keine Trace-ID.
5. Kein gen_ai.*-Span-Schema auf der Agent-Seite: gen_ai.* existiert nur als freie
   Payload-Schluessel im SDK-Logger (logger.go Zeilen 17 bis 20). Die ratifizierten
   semconv-Span-Namen (invoke_agent, execute_tool, create_agent) und Attribute
   (gen_ai.agent.id, gen_ai.conversation.id, gen_ai.tool.*) sind nicht abgebildet.
6. Container-Inneninstrumentierung fehlt: spawn.go Zeilen 218 bis 226 setzt keine
   OTEL_*-ENV; Agent-Container koennen zudem mangels Egress (Default-Deny-nftables,
   internal/network/egress.go, zitiert in der Research-Basis Zeilen 727 bis 735) nur
   das Gateway erreichen. Jeder OTLP-Export aus einem Container muss deshalb am
   Gateway bzw. im Backend terminieren; ein direkter Export zu Langfuse Cloud waere
   durch die Netz-Politik gesperrt (was korrekt ist, aber design-entscheidend).
7. Verify-Ergebnis nur als Ledger-Text: der Ausgang eines Tool-Calls liegt als
   Status done/error plus Result-Feld vor (store/subagents.go Zeile 68; toolcalls.go
   Zeile 180). Ein strukturiertes Verify-Signal (Policy-Intent-Check, DLP-Scan) existiert
   nicht; die Research-Basis fuehrt beides als offene Follow-ups (Zeilen 1341 bis 1347).
8. Zum Auftrag erwaehnte persist_*-Pfade: im Code nicht auffindbar (grep ueber
   store/subagents.go und toolcalls.go liefert nur Kommentare zur "persisted GUARDED
   queue"). Die realen Persistenzpfade sind die oben zitierten Rows; persist_*-Dateien
   gibt es nicht, also werden sie hier auch nicht zitiert.

## Implementierungsplan fuer JiMesh

Leitprinzip: Das Audit-Ledger bleibt Compliance-Ground-Truth (subagent_tool_calls-Rows,
sdk_logs-Typ=audit, Budget-Buchungen). OTel wird eine zusaetzliche Schicht, die
nach dem Ledger-Write abgeschickt wird (Export, nie Ersatz). Verlust oder Ausfall der
OTel-Pipeline darf das Verhalten nie aendern: gleiche fire-and-forget-Disziplin wie
Sprint 7 (langfuse.go Zeilen 6 bis 7, service.go Zeile 330).

Span- und Attribut-Design (Kernantwort auf die Kernfrage):

- Trace = eine Agent-Session. Root-Span "invoke_agent {gen_ai.agent.name}" (semconv,
  agent-spans.md Zeile 200) beim Spawn eines Subagents; beim Spawn der Instanz zusaetzlich
  ein "create_agent"-Span (Zeile 45). JiMesh-Attribute: jimesh.subagent.id (= subagents.id,
  "sa-<hex>", store/subagents.go Zeile 40), jimesh.workspace.id, jimesh.project.id,
  jimesh.session.id (= subagents.session_id, spawn.go Zeile 183),
  jimesh.consumer.key.kind (aus der verifizierten ConsumerKeyRow, auth.go Zeilen 689 bis
  698), jimesh.consumer.key.id. semconv-Attribute: gen_ai.agent.id = jimesh.subagent.id,
  gen_ai.agent.name = Subagent-Name, gen_ai.conversation.id = JiMesh session_id.
- Tool-Call-Span "execute_tool" (semconv, agent-spans.md Zeile 1050) je POST
  /api/subagents/{id}/tool-calls, Kind INTERNAL bzw. CLIENT je Perspektive. Attribute:
  gen_ai.tool.name = req.Capability ("namespace:action", toolcalls.go Zeile 47),
  jimesh.toolcall.id = Ledger-ID "tc-<16hex>" (store/subagents.go Zeile 60),
  jimesh.policy.decision = allow|guard|deny, jimesh.policy.risk, jimesh.policy.reason
  (aus CapabilityDecision, capabilities.go Zeilen 51 bis 56), jimesh.requested_by
  (toolcalls.go Zeilen 331 bis 335), jimesh.tool.status = guarded|approved|denied|
  done|error. Guard- und JIT-Entscheidungen (decideGuarded, toolcalls.go Zeilen 206 bis
  277) werden als Span-Events angehaengt (decided_by, approve/deny), nicht als neue Rows.
- Policy-Entscheidung: eigenes Span-Event "jimesh.policy.evaluated" am Tool-Call-Span
  mit allow/guard/risk/reason verbatim; alternativ, wenn getrennte Aufzeichnung gewuenscht
  ist, ein kurzer Child-Span jimesh.policy.evaluate um EvaluateCapability
  (capabilities.go Zeilen 82 bis 121). Das Rego-Objekt ist bereits strukturiert, es muss
  nur 1:1 in Attribute kopiert werden.
- Verify-Ergebnis: solange es keinen separaten Verify-Mechanismus gibt (Research-Basis
  Zeilen 1341 bis 1347: Intent-Check und DLP-Schuell als offene Follow-ups), wird das
  Ergebnis als Span-Status (OK/ERROR) plus jimesh.tool.result.bounded (64-KiB-Cap aus
  toolcalls.go Zeile 36) abgebildet. Ein eigenes Verify-Span-Modell ist bewusst erst
  vorgesehen, wenn der Intent-Check/DLP-Schritt existiert; dann als Child-Span
  jimesh.verify.<name> mit jimesh.verify.verdict-Attribut.
- Retrieval-Spans: heute ohne Surface (kein RAG-Pfad im Backend). Vorbereitet:
  semconv operation.name=retrieval (agent-spans.md Zeile 144); wenn Retrieval-Container
  kommen, decken OpenLLMetry-Pakete (chromadb/qdrant/pinecone/weaviate/milvus) die
  Python-Seite automatisch ab; die Gateway-Route (Phase 3) nimmt die Spans entgegen.
- Export-Ziel: OTLP/HTTP (Default-Port 4318, opentelemetry-go otlptracehttp doc.go
  Zeilen 6 und 12) gegen Langfuse v4 (POST /api/public/otel/v1/traces mit Header
  x-langfuse-ingestion-version: 4, api.yml Zeile 5) oder einen OTel-Collector als
  Fan-out-Stub (Langfuse bleibt damit eines der Backends; Tempo/Prometheus spaeter
  additiv). ENV: OTEL_EXPORTER_OTLP_ENDPOINT, OTEL_EXPORTER_OTLP_HEADERS (Langfuse
  pk:sk-Basic-Auth je Langfuse-Doku), JIMESH_OTEL_ENABLED (Default aus; ohne ENV
  byte-gleiches Verhalten).

Phase 1 (klein, ca. 1 bis 2 Tage): Go-OTLP-Spine im Backend, Export nach Ledger-Write.
- Neu: internal/oteltrace/ (Paket: TracerProvider, Resource "jimesh.backend", BatchSpan-
  Processor, otlptracehttp-Exporter; keine Abhaengigkeit in sonstigen Pfaden). Abhaengig-
  keiten: go.opentelemetry.io/otel, -/sdk, -/exporters/otlp/otlptrace/otlptracehttp
  (Apache-2.0, pure Go, Mandat-7-kompatibel laut R37 Zeile 36).
- Aendern: internal/subagents/toolcalls.go (Span um Gate plus Exec in handleToolCallSubmit
  und decideGuarded; Events fuer guard/deny/JIT; Export NACH CreateSubagentToolCall bzw.
  UpdateSubagentToolCallStatus, damit das Ledger immer zuerst steht), 
  internal/subagents/spawn.go (create_agent/invoke_agent-Spans um die Identitaets- und
  Container-Erstellung, Zeilen 154 bis 253), cmd/server/main.go (Provider-Init/Shutdown
  neben tracer.Start, Zeilen 166 bis 170), .env.example (JIMESH_OTEL_ENABLED-Block).
- Keine neuen Routen, keine Policy-Aenderungen. Mandate beachten: API_DOCS.md unveraendert
  (keine Route), Sprint-/Backlog-Eintrag Pflicht (CLAUDE.md-Doku-Mandat).
- Aufwand: klein.

Phase 2 (klein bis mittel, ca. 2 bis 3 Tage): Ledger-Korrelation plus Lesebruecke.
- Migration im ensure-Pattern (store/subagents.go Zeilen 77 bis 125 als Vorbild):
  Spalten trace_id (W3C 32-hex) und span_id (16-hex) auf subagent_tool_calls und subagents;
  geschrieben im selben Insert wie die Row (CreateSubagentToolCall, Zeilen 412 bis 433),
  nie nachtraeglich. GetSubagent/ListSubagentToolCalls liefern die IDs mit.
- Route: GET /api/subagents/{id}/tool-calls erweitert um trace_id; neu GET
  /api/traces/{trace_id} als Proxy auf Langfuse v4 (Trace-Deep-Link oder v2-Read-API)
  bzw. collector-lokaler Query spaeter. CLI: jimeshctl-Subcommand "jimeshctl traces
  <tc-id|subagent-id>" (nur lesen).
- API_DOCS.md-Eintraege Pflicht (CLAUDE.md-Mandat: Route existiert in gateway.go muss
  auch dokumentiert sein).
- Aufwand: klein bis mittel.

Phase 3 (mittel, ca. 3 bis 5 Tage): OTLP-Ingest am Gateway fuer Container-Spans.
- Neu: Route POST /api/otel/v1/traces (OTLP/HTTP-Protobuf; go.opentelemetry.io/proto/otlp
  oder eigenes Mapping; protobuf ist als Abhaengigkeit schon da, go.mod Zeile 17). Auth:
  bestaehende Middleware-Kette (Session/Service-Key/Consumer-Key, auth.go Zeilen 613 bis
  898), INGRESS-DERIVED-ONLY gilt: Client-JiMesh-Attribute (workspace/session/project/
  key-kind) werden serverseitig aus der verifizierten Identitaet ueberschrieben oder
  verworfen, niemals vertraut (gleiche Vertragslinie wie die Header-Re-Stamps).
- Verhalten: Spans werden nur Observability-Backend zugefuehrt; KEIN Schreibpfad in
  Ledger-Tabellen. DLP-light: redactSecrets-Muster (spawn.go Zeilen 227 bis 228) auf
  Span-Payload, Größen-Cap, Rate-Limit je Key.
- Container-Seite: spawn.go Zeilen 218 bis 226 um OTEL_EXPORTER_OTLP_ENDPOINT=<gateway>,
  OTEL_EXPORTER_OTLP_HEADERS, OTEL_SERVICE_NAME=jimesh-subagent-<id>, 
  OTEL_SDK_DISABLED=1 als Default erweitern (opt-in je Deploy). Python-Agenten: 
  OpenLLMetry traceloop-sdk 0.62.3 (pip, Apache-2.0) mit TRACELOOP_TRACE_CONTENT=false
  (packages/opentelemetry-instrumentation-mcp/README.md) als Referenz-Wiring im 
  Sample-Container; Go-Agenten: opentelemetry-go direkt.
- Go-vs-Python-Klaerung (Kernfrage): JiMesh-Backend ist Go, also MUSS die Spine
  (Phase 1) und der Gateway-Ingest (Phase 3) auf opentelemetry-go gebaut werden;
  OpenLLMetry ist Python-only (Klon-Bestand, packages/ ohne Go-Paket) und 1:1 nutzbar
  nur fuer das Innenleben von Python-Agent-Containern. Ein Python-Export in toolcalls.go
  ist nicht sinnvoll und nicht noetig: toolcalls.go benoetigt den Go-Export (Phase 1),
  die Container brauchen (falls Python) OpenLLMetry. Ein verifiziertes langfuse-go
  gibt es nicht (Klon-Fehlschlag, "Repository not found").
- Aufwand: mittel.

Phase 4 (klein, ca. 1 bis 2 Tage): Backends, CI, Doku.
- Collector-Fan-out (optional): OTel-Collector im jimesh-net, OTLP gRPC 4317 inbound,
  Export zu Langfuse plus z. B. Tempo; Backend- und Gateway-Pfad bleiben unveraendert.
- CI: make check-backend erweitert (go-vet plus oteltrace-Paket-Tests mit stdout-Exporter:
  Span-Snapshots je Decision allow/guard/deny). Kein echter OTLP-Call in Tests.
- Doku: K-LAF-ARCHITECTURE.md Zeile 118 aktualisieren (OTel-Layer daneben), Sprint-File,
  Backlog-Spiegel (Mandate). R37-WP5-Anmerkung abloesen (OTLP-Pfad dann real).
- Aufwand: klein.

Policy- und CI-Verkabelung (quer durch die Phasen):
- Der OPA-Gate-Pfad aendert sein Entscheidungsverhalten NICHT (capabilities.rego unangetastet);
  die Policy-Entscheidung wird nur ZUSAETZLICH als Span-Event exportiert. Fail-closed bleibt
  unberuehrt (capabilities.go Zeilen 82 bis 121, toolcalls.go Zeilen 107 bis 123).
- Budget-/Ledger-Buchungen (ChargeConsumerKeyCost, consumer_keys.go Zeilen 318 bis 329;
  RecordRequestSummary Zeilen 358 bis 365) bleiben die einzige Kostenwahrheit; OTel-Spans
  mit gen_ai.usage.* sind Debug-Ansicht, nicht Abrechnungsquelle.
- CI-Verifikationsregel: Mit JIMESH_OTEL_ENABLED unset muessen alle bestehenden Tests und
  Ablaeufe byte-gleich bleiben; mit stdout-Exporter muss je Tool-Call genau ein
  execute_tool-Span mit den oben definierten Attributen entstehen.

## Verifikationskriterien

1. Bau: make check-backend gruen (go-vet plus Tests); JIMESH_OTEL_ENABLED unset: alle
   bestehenden Subagent-Tests gruenn, Verhalten unveraendert (kein Netz-Call, Ledger-Rows
   identisch; Fire-and-forget-Vertrag wie service.go Zeile 330).
2. Span-Snapshot (stdout-Exporter in Tests): je Spawn ein create_agent- plus ein
   invoke_agent-Span; je Tool-Call ein execute_tool-Span mit gen_ai.tool.name =
   Capability, jimesh.toolcall.id = Ledger-ID, jimesh.policy.decision/risk/reason =
   Rego-Verbatim (toolcalls.go Zeilen 133 bis 136 und 155 bis 158), jimesh.session.id =
   Subagent-Session (spawn.go Zeile 179), jimesh.consumer.key.kind aus der verifizierten
   Key-Row (auth.go Zeilen 689 bis 698). deny/guard-Span traegt ERROR-Status bzw. die
   JIT-Events (decideGuarded, toolcalls.go Zeilen 206 bis 277).
3. Echt-Backend: JIMESH_OTEL_ENABLED=1 + OTLP-Endpunkt Langfuse v4
   (/api/public/otel/v1/traces, Header x-langfuse-ingestion-version: 4): Spans erscheinen
   in der Langfuse-Session-Ansicht, gruppiert ueber gen_ai.conversation.id = JiMesh
   session_id; Observation-Typen tool/agent werden laut R37 §2 first-class gemappt.
4. Korrelation (Phase 2): SELECT id, trace_id FROM subagent_tool_calls liefert pro
   Tool-Call die W3C-Trace-ID; der Wert entspricht dem trace_id-Feld des exportierten
   Spans. jimeshctl traces <tc-id> oeffnet/beschreibt den Trace ohne manuelles Suchen.
5. Ledger-Integritaet: OTel-Ausfall (Endpoint black-holed) aendert NICHT: HTTP-Status,
   Ledger-Status-Maschine (guarded/approved/denied/done/error), GUARDED-Queue-Verhalten
   (toolcalls.go Zeilen 128 bis 277), Budget-Buchungen (service.go Zeilen 358 bis 365).
   Droptest analog Sprint 7 (langfuse.go Zeilen 246 bis 299: Fehler werden geloggt und
   verworfen).
6. Egress-Nachweis (Phase 3): Agent-Container-OTLP an einen externen Host wird durch die
   Default-Deny-nftables blockiert (Research-Basis Zeilen 727 bis 735); nur die
   Gateway-Route ist erreichbar. Gateway-Ingest ueberschreibt Client-Claim-Attribute
   serverseitig (jimesh.*-Attribute niemals client-vertraut).
7. Privacy: Exportierte Span-Payloads enthalten keine Service-Keys oder Session-Tokens
   (redactSecrets-Muster, spawn.go Zeilen 227 bis 228; Test-Scan auf den Export-Payload);
   Container-Default TRACELOOP_TRACE_CONTENT=false; gen_ai.tool.definitions nur opt-in
   (semconv, agent-spans.md Zeile 253). MAESTRO-Punkt "Sensitive Data in Telemetry"
   (Research-Basis Zeilen 1105 bis 1112) als Anforderung abgearbeitet.
8. Deprecation-Freiheit nach Phase 1/2: kein neuer Code nutzt die v3-/api/public/ingestion;
   der Alt-Client (langfuse.go) bleibt bis zur Abloesung, aber der Write-Path fuer neue
   Traces ist OTLP (Langfuse v4-Vertrag, api.yml Zeile 5).

## Grenzen

- Report-Only: dieser Report veraendert keinen Code und macht keine Git-Ops. Alle
  Implementierungsangaben sind Plan, kein Stand. Bei Umsetzung gelten die MANDATES.md-
  und Dokumentations-Mandate (API_DOCS.md, Sprint-File, Backlog) unverkuerzt.
- semconv-Status: die GenAI-Konventionen sind Development, nicht stable
  (agent-spans.md Zeile 7). Span-/Attribut-Namen muessen beim Bau gegen den gepinnten
  Klon-Stand (Commit c88d504, 2026-09-16) versioniert werden; ein semconv-Upgrade kann
  Umbenennungen mit sich bringen (R37 §2, Zeilen 42 bis 44, sagt dasselbe).
- Star-Zahlen: nur OpenLLMetry ca. 7.4k ist belegt (Research-Basis, Scrape 2026-09-18,
  Zeilen 1206 bis 1214). Fuer opentelemetry-go, semantic-conventions(-genai) und Langfuse
  sind aus den Klons keine Star-Zahlen verifizierbar; hier wird bewusst keine Zahl behauptet.
- Lizenz-Korrektur: die Auftragsannahme "Langfuse = Apache-2.0" wurde vom Klon nicht
  bestaetigt. LICENSE (Zeilen 1 bis 10): MIT-Expat-Kern, Copyright 2023-2026 ClickHouse,
  Inc., ee/-Verzeichnisse unter ee/LICENSE. Bei Kommerzialisierung sind die ee/-Teile
  (und die ClickHouse-Haltungsfrage) separat zu pruefen; R37 Zeile 65 (MIT) bleibt
  konsistent.
- Kein verifiziertes Langfuse-Go-SDK: der Klonversuch langfuse/langfuse-go endete mit
  "Repository not found". Falls JiMesh ein Go-SDK wuenscht, bleibt nur opentelemetry-go
  plus OTLP-Vertrag (oder eine erneute, aktive Pruefung des echten Repo-Pfads).
- persist_*-Angabe: die im Auftrag erwaehnten persist_*-Pfadnamen liessen sich im Code
  nicht belegen (grep: nur Kommentare zur "persisted GUARDED queue"). Die zitierten
  Persistenzpfade sind store/subagents.go, store/sdk_logs.go und die logCh-Queue in
  service.go; persist_*-Dateien sind nicht zitiert, weil es sie (nach diesem Audit)
  nicht gibt.
- Verify-Spans sind Zielbild: JiMesh hat heute keinen separaten Verify-Mechanismus
  (nur Ledger done/error plus Result, store/subagents.go Zeile 68). Das Verify-Span-Modell
  aus dem Plan ist an den Intent-Check/DLP-Follow-up der Research-Basis (Zeilen 1341 bis
  1347) gebunden und erst dann real messbar. Retrieval-Spans analog: semconv-Baustein
  existiert (agent-spans.md Zeile 144), eine JiMesh-RAG-Surface existiert nicht.
- Egress-Bedingung: alle Container-Spans muessen am Gateway terminieren (Default-Deny,
  Research-Basis Zeilen 727 bis 735). Ein externer OTel-Collector waere fuer Agent-Container
  unerreichbar; ein Collector innerhalb jimesh-net ist Phase-4-Option, nicht Voraussetzung.
- Legacy-Client: internal/tracing/langfuse.go bleibt bis zur Abloesung im Betrieb; die
  v4-Migration (OTLP) ersetzt den Write-Path, aber ChatCall-Metadaten (KeyID, ChainID,
  Strategy) muessen im neuen Attribut-Satz erhalten bleiben, sonst verliert das Dashboard
  Felder. Die Mapping-Tabelle im Plan deckt die Felder 1:1 ab; ein Diff-Test beim Umbau
  ist Pflicht.
- Keine Go-Seite der GenAI-semconv-Instrumentierung in openllmetry: fuer die Backend-Spine
  wird die semconv-Manuell-Mapping-Tabelle aus diesem Report verwendet; ein fertiges
  Go-Paket "genai semconv helpers" ist im opentelemetry-go-Klon nicht enthalten und wurde
  nicht behauptet.
