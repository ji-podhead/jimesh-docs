# SPRINT-36 — Logger-SDK, Router-Node & DB-CDC (Debezium Server)

**Quelle:** Operator-Vision 13.9.2026 („jimesh ist ein SaaS und LLM security
tool"; „kein direktes coding tool"). Sprint 35 WP1c (Service-Keys,
X-Headers) ist die Grundlage — dieser Sprint macht Loggen/Attribution zum
PRODUKT.

## Ziel — vier Bausteine, die zusammenspielen

```
[App/Agent] --logger.log(alias)--> [jimesh-logger SDK] --X-JiMesh-Header-->
      --> [Router-Node (SSH-Target, localhost:fix)] --> [JiMesh-Gateway]
              ▲                                              │
              │                                              ▼
      [Debezium Server] --HTTP-Sink(CloudEvents)--> Audit-Logs/Traces/Streams
```

1. **jimesh-logger SDK** (Go, kompilierbar): `logger.Log(alias, msg)` für
   ALLES (Agents, Apps, Audit) — einmal gebaut, überall genutzt; keine
   per-Feature-SSE/React-Renderer mehr neu schreiben. Session-Minting +
   `X-JiMesh-*`-Header-Setzung eingebaut → **LiteLLM/genai/OpenAI-Clients
   kriegen Attribution/ACL gratis**, wenn man den Header an ihren Client
   durchreicht.
2. **Router-Node** (leichtgewichtiges Go-Binary auf dem SSH-Target):
   DB-Middleware, fixer localhost-Port (User gibt nur den DB-Alias an,
   NIE URLs), verwaltet aus der Control-Plane.
3. **DB-CDC via Debezium Server** (WP3-Alternative zu pglogrepl, ggf.
   Kombination): DB-Audit-Logs über HTTP-Sink in den Router → Logger.
4. **MCP-Provider/Agent-Skill**: Coding-Agents provisionieren Infra
   (DB-Endpunkte registrieren) über unsere API selbst.

---

## WP1 — jimesh-logger SDK (Go-Package `internal/sdk/logger` + `cmd/jimesh-logger`)

- [x] `logger.Log(alias, payload)` → POST an Router/Gateway
      (`/api/sdk/logs`), Service-Key aus Env (`JIMESH_SERVICE_KEY`) oder
      Container-Metadaten; Alias-Resolution server-seitig.
- [ ] Session-Helper: `logger.NewSession(projectID)` → TASK-011-Mint +
      Header-Template; `logger.Client()` liefert einen
      OpenAI-kompatiblen HTTP-Client mit den Headern gesetzt (LiteLLM:
      Header-Weitergabe dokumentiert).
- [x] Audit-Log-Typen: `audit` | `agent` | `app` (eine Pipeline, gefiltert
      im UI — Endpoints EXISTIEREN ab Tag 1: `/api/sdk/logs?filter=agent`,
      `?workspace=`, `?session=` — die WP1c-Header sind die Filter-Felder).
- [x] Frontend: Agents-Tab/SDKLogsPage bekommt Filter (endpoints, apps,
      sessions, agents) — NUR Query-Parameter auf den bestehenden
      Endpoints, kein neuer Renderer. R39-Audit hatte den vorherigen
      Checkoff zurecht zurückgenommen (ee7055b-Fehler, nie gebaut); jetzt
      von 051-Code-Agent (`17b43a03`) gebaut und von Claude selbst
      gegen den Quellcode verifiziert (nicht nur den Agent-Report geglaubt,
      13.9.2026): `src/frontend/src/views/SDKLogsPage.tsx` — `level`/
      `range`/`limit` als echte `Select`-Dropdowns, `workspace`/`session`/
      `agent` als datalist-gestützte Freitext-Filter (Zeile 148: „every
      one is a real query param of GET /api/sdk/logs"), keine Fake-Optik.
- [ ] Python-Variante: minimaler `jimesh_logger`-Wrapper (requests), der
      dieselbe HTTP-API spricht (kein zweites Backend).

## WP2 — Router-Node (DB-Middleware auf dem SSH-Target)

**Plan (TASK-033, 13.9.2026 — vor Code, gemäß CLAUDE.md-Plan-Mandat):**

*Ziel:* Standalone-Go-Binary `cmd/jimesh-router/` — L7-Proxy für Postgres
(pgproto3) + Redis (RESP) auf fix `localhost:3100`, Alias-Registry per Pull
von der Control-Plane, Audit als JSON-Zeile pro Query. Opt-in (wird nur auf
Wunsch deployt).

*Work-Pakete:*
1. **Gateway-Endpoint (Control-Plane):** `GET /api/router/config` —
   Service-Token-Auth (kind='service' Consumer-Key, Sprint-35-WP1c-Basis),
   Long-Poll über `?version=`/`?wait_seconds=`; `POST/DELETE` für die
   Dashboard-Verwaltung. Persistenz: neue Tabelle `router_aliases`
   (`internal/store/router_aliases.go`, Projekt-Scoping).
2. **Router-Binary:** `main.go` (Flags/Env, fixer Loopback-Listener 3100 +
   Health-Port 3101, Protokoll-Demultiplexer am einen Port: erstes Byte
   druckbar → RESP, sonst → Postgres-Startup-Familie), `postgres.go`
   (pgproto3-Frontend/Backend-Message-Loop, transparenter Relay: auth läuft
   Client↔DB end-to-end, Router sieht jede Query — SetAuthType-Buchhaltung
   für 'p'-Nachrichten ist Pfad, sonst verfälscht pgproto3 SASL),
   `redis.go`+`resp.go` (AUTH <alias> als Alias-Kanal, RESP-Relay),
   `registry.go`, `pull.go`, `audit.go` (JSON-Zeile: stdout + Datei +
   Fire-and-Forget-POST an den Gateway).
3. **Tests:** Unit-Tests mit echten pgproto3-/RESP-Fixtures über lokale
   TCP-Sockets (Fake-Target spricht pgproto3-Backend-Rolle); Live-Check
   gegen den lokalen Postgres-Container, wenn das Docker-Netz kooperiert.

*Akzeptanz:*
- [ ] `psql` über `localhost:3100` mit `database=<alias>` landet auf der
      echten DB; jede Query erscheint als JSON-Zeile.
- [ ] `GET /api/router/config` mit Service-Key liefert Aliase (Long-Poll);
      unbekannter Alias → ehrliches ErrorResponse (3D000).
- [ ] `make go-build && make go-vet` clean, gofmt clean, CGO_ENABLED=0.
- [ ] SSLmode-Caveat dokumentiert (verify-full-Clients verwerfen das
      Router-Cert — CA-Install nötig; require/prefer läuft).
- [ ] API_DOCS.md unberührt (Session 1 besitzt sie) — Endpoint im
      README + Task-File dokumentiert.

- [ ] `cmd/jimesh-router/`: Single-Binary, lauscht fix auf
      `localhost:3100` (alle Targets gleich — deshalb reicht dem User
      `localhost:3100` + Alias).
- [ ] Alias-Registry: `alias → conninfo` wird aus der Control-Plane
      gepusht (verwaltet, wie Headscale-Routen via API).
- [ ] DB-Pfad: Proxy-Mode (TCP-Forwarding mit Policy-Check pro Session)
      für v1; Audit zeichnet jede Verbindung + Query-Sample.
- [ ] Provisioniert per SSH-Deploy (Sprint 34/36-Muster, Zero-Port, der
      Router selbst lauscht nur localhost).
- [ ] **Opt-in** (WP3-Mandat): der Router wird nur deployt, wenn der
      Operator DB-Middleware will. Bestehende Infra bleibt unangetastet.

## WP3 — DB-CDC via Debezium Server (Fundstellen: debezium.io,
   stable/operations/debezium-server)

**Gebaut (TASK-034, 12.9.2026 — in-process CDC, R38 Stufe 3a):** Pure-Go
CDC-Package `src/backend/internal/cdc/` (pglogrepl v0.0.0-20260824 gepinnt,
pgx-Ökosystem, CGO_ENABLED=0) — `StartReplication(ctx, connString, slot,
publication)` → Channel strukturierter CDCEvents (op/lsn/ts/xid/table/
before/after; insert/update/delete/begin/commit/truncate). Slot-Manager mit
IF-NOT-EXISTS-Semantik (check-then-create + Race-Toleranz),
`CheckPrerequisites` als ehrlicher Status-Surface mit typisierten Fehlern
(`ErrWALLevel` — wal_level≠logical → L7-Router-Fallback nach R38 §4;
`ErrNoReplicationRole`; `ErrSlotPluginMismatch`). Verifiziert an der ECHTEN
Replikationsverbindung gegen den lokalen Postgres-Container (Integrationstest
`integration_test.go`, env-guarded `CDC_TEST_DSN` — make go-test läuft
bewusst OHNE ihn, kein Slot-Leak auf Dev-Infra): BEGIN/INSERT/UPDATE/DELETE/
COMMIT als Events mit before/after-Bildern (REPLICA IDENTITY FULL), ts =
Commit-Zeit der Transaktion, LSN-Reihenfolge WAL-getreu, Replay des
unbestätigten Transactions nach Reconnect (at-least-once, by design).
Fundstellen: `internal/cdc/{cdc,conn,preflight,slot}.go`,
`internal/cdc/{cdc,integration}_test.go`, Task-Report
`docs/tasks/TASK-034-wp3-cdc.md`. Router-Merge (WP6 CDC-Forwarder) später —
dieses Package ist STANDALONE (R38 §3a).

- [ ] Debezium-Server-Container auf dem Target (Compose), Quelle:
      `PostgresConnector` (pgoutput/WAL) auf der provisionierten DB.
- [ ] Sink: `debezium.sink.type=http`,
      `sink.http.url=http://localhost:3100/cdc` (K_SINK-Env),
      `format.value=cloudevents`, Batching an,
      Auth: `standard-webhooks` (HMAC-SHA256) mit dem Service-Key-Secret
      des Workspaces.
- [ ] Router-Endpoint `/cdc`: validiert HMAC, mappt
      CloudEvent→Audit-Log-Eintrag (Tabelle, PK, Operation, ts), schreibt
      in den Stream mit der Workspace-Attribution.
- [ ] Dashboard: Audit-Logs der DB erscheinen im Agents-Tab unter dem
      Filter `type=audit` — gleiche Query-Endpoint-Pipeline wie WP1.
- [ ] Abgrenzung pglogrepl (Sprint 26 WP3): Debezium Server = inklusive
      Transformationen + Standalone ohne Kafka; Entscheidung im
      Sprint-26-Kontext, ob pglogrepl (schlanker, in-process) oder
      Debezium Server (Standard, mehr Features) — dieser Sprint baut die
      Router-Pipeline, die beide füttern kann.

## WP4 — MCP-Provider / Agent-Skill

**Gebaut (TASK-035, 12.9.2026):** MCP-Server via mark3labs/mcp-go **v1.0.0
gepinnt** (R38 §5-Entscheidung, MIT) — `src/backend/internal/mcpserver/`
(client.go/server.go/tools_infra.go/tools_sessions.go + httptest-Unit-Tests)
und `src/backend/cmd/jimesh-mcp/main.go` (stdio-Transport v1, Diagnostics
nur stderr). Tool→Route-Abbildung je Tool mit Schemata, Beispielen
(Claude Code, Gemini CLI) und Security-Hinweis dokumentiert in
`src/backend/cmd/jimesh-mcp/README.md` (API_DOCS.md bewusst unberührt —
MCP ist kein REST).

- [x] JiMesh-API als MCP-Server-Endpunkte: `register_db_endpoint`
      (POST /api/db/endpoints), `provision_workspace_db`
      (POST /api/db/provision), `register_router_alias`
      (POST /api/router/aliases), `list_sessions` (GET /api/sessions —
      LIVE-Route, Client-Filter project_id) + `create_session`
      (POST /api/sdk/sessions, TASK-032-Route) — Coding-Agents bauen Infra
      selbst. *Route-Status ehrlich:* nur `list_sessions` spricht heute
      eine existierende Gateway-Route; die übrigen vier sind die
      dokumentierten Verträge (README) — bis die Gateway-Seite steht
      (TASK-032/033), gibt jedes Tool den Gateway-Fehler unverändert
      weiter (GatewayError, kein Fake-Success). Integrationstest-TODO im
      Task-File (`docs/tasks/subagents/PROMPT-task-035-mcp-provider.md`).
- [ ] Agent-Skill-Definition (DAP-kompatibel, R21-Vorlage) für den
      Skills-Hub (Sprint 23).
- [x] Auth: Service-Keys — der Agent braucht den Key, den sein Workspace
      sowieso hat („no LLM keys in workspaces" gilt für Infra-Bau ebenso).
      Client-seitig gebaut: `Authorization: Bearer jimesh-ck-…` aus
      `JIMESH_SERVICE_KEY`, fail-closed ohne Key, Key nie geloggt/echoed.
      Gateway-seitige Akzeptanz von Service-Keys auf `/api/sdk/*` kommt
      mit TASK-032 (eigener Gate-Zweig analog /v1).

## Akzeptanz

- [ ] `logger.Log()` von einem Deployment schreibt mit Workspace-Attribution
      (live verifiziert: Eintrag mit workspace_id im Stream).
- [ ] LiteLLM-Client mit von uns gesetzten Headern → Request erscheint im
      Agents-Tab gefiltert nach der App.
- [ ] Router auf einem SSH-Target: Alias-Anfrage proxied, Audit-Eintrag da.
- [ ] Debezium-Sink POSTet CloudEvents an `/cdc` (HMAC verifiziert),
      Eintrag im Audit-Log.
- [ ] Agents-Tab filtert nach endpoints/apps/sessions/agents (nur Query-
      Parameter, bestehende Endpoints).

## Abhängigkeiten

Sprint 35 WP1c (Service-Keys + X-Header-Stamping) — live gebaut (7fc27f5,
472838d). Sprint 26 WP3 (CDC-Entscheidung pglogrepl/Debezium) wird hier
konkretisiert, nicht ersetzt.

---

## §2b — Korrekturen zum Gemini-Blueprint (13.9.2026, verifiziert)

Gemini's Architektur stimmt mit diesem Sprint überein (Konvergenz), enthält
aber drei Fehler, die hier korrigiert sind:

### 1. Debezium sieht KEINE SELECTs (Audit-Lücke)

WAL/CDC erfasst nur Änderungen (INSERT/UPDATE/DELETE/TRUNCATE, DDL).
Gemini's eigenes Beispiel „Query executed: SELECT * FROM users WHERE id=1"
erscheint im WAL **nie**. Konsequenz — die ehrliche 3-Stufen-Tabelle:

| Stufe | Audit-Abdeckung | Code-Change | DB-Config | Aufwand |
|---|---|---|---|---|
| **SDK-Wrapper** (Approach 1) | Voll: Intention + Query + Result-Metadaten | Ja (User nutzt `jimeshClient.ExecQuery`) | keiner | niedrig |
| **L7-Router** (NEU — Gemini übersah ihn) | Voll: ALLE Queries inkl. SELECT (Protokoll-Terminierung) | Nein (Connect auf localhost) | keiner (TLS terminiert am Router) | mittel |
| **L4 + Debezium** (Approach 2) | **Nur Changes** — keine Reads | Nein | **`wal_level=logical` + Replication-Slot** am Ziel (echte Anfrage an Bestands-Infra!) | mittel |

### 2. L7-Terminierung ist der fehlende Mittelweg — und billig für uns

`jackc/pgproto3` ist **bereits in unserem Tree** (pgx v5.10.0 Dependency;
Upstream-Changelog: „pgproto3 … used directly as a proxy"). Der Router
spricht das Wire-Protokoll (Client↔Router klartext/our-cert, Router↔Target
TLS), sieht damit jede Query — ohne SDK-Zwang, ohne `wal_level`-Anforderung.
Caveat ehrlich dokumentiert: `sslmode=verify-full`-Clients verwerfen unser
Cert (CA-Install nötig); `require/prefer` (der Großteil der Tools) läuft.
**v1-Scope:** Postgres (pgproto3) + Redis (RESP ist Klartext — trivial);
MySQL (eigenes Proto-Lib) und MongoDB (OP_MSG, komplex) später bzw.
nur via SDK-Stufe.

### 3. Kein FastAPI/ClickHouse (Gemini kennt unsere Mandate nicht)

Ingest bleibt **Pure-Go** (Mandat 7: CGO_ENABLED=0), Persistenz bleibt
**Postgres via pgx + Redis Streams** (K-LAF/Streams-Infra existiert seit
Sprint 8/30). ClickHouse/FastAPI wären ein zweiter Stack für dasselbe
Problem — erst wenn Postgres-Ring nachweislich nicht mehr skaliert.

### Zusatz-Fundstellen (verifiziert)

- LiteLLM `extra_headers`: offiziell supported (docs.litellm.ai,
  Provider-Matrix OpenAI/Anthropic/Azure/…) — Header-Injektions-Pfad
  (WP1 SDK) ist kompatibel, kein LiteLLM-Fork nötig.
- Debezium-Server-Fakten unverändert gültig (§WP3): HTTP-Sink,
  standard-webhooks (HMAC-SHA256), CloudEvents, Batching — aber nur für
  Change-Audit einsetzen, nicht als Universal-Query-Audit.

---

## WP6 — Edge-Control-Plane-Node (Operator, 13.9. — nachträglich)

Der Router (WP2) wird zum **Edge Node**: Beim SSH-Target-Deploy Checkbox
„Deploy JiMesh Edge Node". Der Edge Node (localhost-only, Zero-Port):

- [x] L7-Router (WP2-Umfang) — Fundament seit 9445fa1 gemerged; TASK-050
      lief live darauf. TASK-058 erweitert ihn (nichts ersetzt).
- [x] **Lokaler Log-Ingest**: /api/sdk/logs auf dem Edge (localhost:3100),
      Buffer + Async-Forward zur Zentrale — Production-Logs ohne WAN-Latenz
      (TASK-058: ingest.go + ingest_http.go + protocol.go-Demux)
- [x] CDC-Forwarder: TASK-034-Events → lokaler Ingest → Zentrale
      (TASK-058: cdc_forward.go)
- [x] Session/Key-Validierung lokal (Key-Hashes kommen per Config-Pull)
      (TASK-058: validateKey + sdk_key_hashes im Pull)
- [x] WAN-down = Edge weiterarbeiten, Verwaltung pausiert (Buffer+Forward)
      (TASK-058: JSONL-Journal + Cursor, at-least-once, getestet)
- [~] Deploy-Checkbox im SSH-Target-Form + Edge-Status im Networks-Tab —
      Backend-Feld `edgeNode` + volle SSH-Pipeline gebaut (TASK-058,
      projects_ssh.go); die Frontend-Checkbox/Dashboard-Kachel bleibt
      offen (Scope-Regel dieses Tasks: NICHT src/frontend; Feldname ist
      der Vertrag)
- [ ] Editions-Gating (E-Editions-Entscheidung, DECISIONS.md): Core =
      Log-Ingest, DB Pro = Router/CDC, Enterprise = Hub-Tunnel

**Fundstellen:** Router-WIP des gestorbenen TASK-033-Agents liegt vor
(cmd/jimesh-router: 9 Dateien + gateway/router_config.go +
store/router_aliases.go) — wird als Fundament übernommen, nicht neu
gebaut. Pull-Config (outbound-only) ist der Sync-Kanal.

**Plan (TASK-058, vor Implementation — CLAUDE.md-Plan-Mandat):**

*Ziel:* Der Router-Node wird zum Edge Node: Apps/Agents auf dem SSH-Target
loggen gegen einen LOKALEN Ingest (kein WAN-Roundtrip), Puffer + async
Forward an die zentrale `/api/sdk/logs`; WAN-down = Edge weiterarbeiten
(JSONL-Spill auf Disk, Resume bei Reconnect, at-least-once).

*Work-Pakete:*
1. **Lokaler Ingest** (`cmd/jimesh-router/ingest.go`): HTTP-Demux am
   fixen :3100-Listener (Request-Line-Erkennung vor dem
   pgproto3/RESP-First-Byte-Demux), `POST /api/sdk/logs` mit lokaler
   Service-Key-Validierung (SHA-256 gegen gepullte Key-Hashes,
   fail-closed), Attribution server-side aus der Hash-Tabelle (nie aus
   dem Body), persistenter JSONL-Puffer (KEIN SQLite/CGO — Mandat 7),
   async Forwarder (Batch-Drain, pro Zeile ein echter POST — der
   zentrale Wire-Vertrag ist 1 Row/POST).
2. **CDC-Forward** (`cmd/jimesh-router/cdcforward.go`):
   `internal/cdc.StartReplication` im Router-Prozess; jedes CDCEvent
   landet im LOKALEN Puffer (nicht direkt an die Zentrale); typed
   Errors (ErrWALLevel etc.) werden geloggt + Backoff-Retry, der Router
   läuft weiter (Ingest bleibt nutzbar).
3. **WAN-down/Resume:** Puffer-Datei `queue.jsonl` wächst sichtbar;
   Forwarder resumed vom consumed-offset (at-least-once, dokumentiert);
   Kompaktion per atomarem rename; Spill-Dir auf benanntem Volume.
4. **Deploy-Checkbox** (`internal/deploy/projects_ssh.go`):
   `edgeNode` + `edgeServiceKey` (nie persistiert, validiert gegen
   ResolveConsumerKey, redacted im Log) + optionale CDC-Env;
   Image jimesh-edge aus eigenem Tree (Socket-Guard-Muster: local build
   → `docker save | ssh docker load`), Container `jimesh-edge-<nameKey>`
   im Projekt-Netz (Zero-Port, Docker-DNS statt localhost-Host-Bind),
   Spill-Volume `jimesh-edge-data-<nameKey>`, undeploy-Sweep.
5. **Config-Pull erweitern** (`gateway/router_config.go` +
   `store/consumer_keys.go`): Pull-Response bekommt `service_keys`
   (Hashes der Live-Keys des Projekts) + `forward_target` (Settings-KV
   `edge_forward_target`, Fallback: die Base-URL, über die der Pull
   selbst kam); Long-Poll-Version wird Composite (Aliases + Keys +
   Target), damit Revocations ohne Alias-Änderung propagieren.

*Akzeptanz:*
- [x] App auf Target → Edge-Ingest → Puffer → Zentrale (echte POSTs,
      echte Spill-Dateien, kein Mock) — TestEdgeIngestForwardDeliversAcceptedRecords
      + TestHTTPDemuxAndIngestHandler (echter httptest-Zentral-Ingest,
      echter TCP-Demux-Listener, echte Journal-Dateien).
- [~] CDC-Event → derselbe Puffer-Pfad — Code verdrahtet
      (cdc_forward.go: drainCDC → Accept, Begin/Commit ausgespart);
      KEIN Live-PG-Replication-Test in diesem Lauf (braucht
      wal_level=logical + REPLICATION-Rolle in der Test-DB) —
      Follow-up: Integrationstest wie internal/cdc/integration_test.go.
- [x] WAN-Ausfall simuliert → Puffer wächst, Resume liefert nach —
      TestEdgeIngestWANDownSpillsAndResumes (25 Records offline
      gejournalled, Zentrale 503, Reconnect → alle 25 in Ordnung) +
      TestEdgeIngestRestartResumesUnforwardedJournal (Prozess-Tod
      simuliert: Journal überlebt, Resume liefert nach) +
      TestEdgeIngestFailedRecordKeepsCursorContiguous (Cursor bleibt
      kontiguierlich, kein Verlust, re-POST erlaubt).
- [x] Deploy-Checkbox: Backend-Feld `edgeNode` mit voller SSH-Pipeline
      (Frontend-Checkbox ist NICHT Teil dieses Tasks — Scope-Regel
      „NICHT src/frontend"; der Feldname ist der Vertrag) —
      projects_ssh_edge_test.go prüft die gerenderten Kommandos wörtlich.

**Gebaut (TASK-058, 13.9.2026, verifiziert gegen den Code):**

- `cmd/jimesh-router/ingest.go` (EdgeIngest): JEDES akzeptierte Record
  wird VOR der 202 als JSONL-Zeile in `journal.jsonl` gejournalled
  (Accept:314) — das Journal IST die Queue, der in-memory Teil ist das
  gebundene Batch-Fenster des Forwarders (readBatch:467). Forwarder-Loop
  (Run:377, drain:420): Batch-POSTs an die zentrale `/api/sdk/logs` mit
  dem Service-Key DES ROUTERS (Attribution server-side), Cursor
  (`cursor.json`, atomar tmp+rename) rückt nur kontiguierlich vor —
  Crash = max. 1 Batch re-POST, nie Verlust (at-least-once, im
  File-Header dokumentiert). WAN-down: Backoff + eine ehrliche Zeile pro
  Übergang; Rotation (rotateLocked:551) truncates nach vollständigem
  Aufholen (>8 MiB). Lokale Key-Validierung (validateKey:254): SHA-256
  gegen gepullte Hashes, fail-closed (vor dem ersten Pull 401, kein
  still-accept-all). Validierungsregeln (normalizeEdgeLog) spiegeln
  internal/sdklogs exakt — was die Zentrale 400en würde, nimmt der Edge
  gar nicht an.
- `cmd/jimesh-router/protocol.go`: HTTP-Demux — classifyPeer:51 erkennt
  die vollständige Request-Line MIT Versionstoken (isHTTPRequestLine:74)
  VOR dem printable→RESP-Fallback; „GET key" (Redis-Inline) kollidiert
  nicht, pgproto3 unverändert. Ein Port, drei Dialekte.
- `cmd/jimesh-router/ingest_http.go`: POST /api/sdk/logs (handleIngest:117,
  202 + Buffer-Stats) und GET /api/edge/status (handleStatus:168) über
  net/http auf der EINEN akzeptierten Connection (serve:62 —
  oneConnListener wartet auf das Connection-Ende, sonst würde der
  deferred Close die Antwort töten).
- `cmd/jimesh-router/cdc_forward.go`: runCDCForwarder:42 —
  `internal/cdc.StartReplication` im Router-Prozess, Events →
  drainCDC:95 → derselbe lokale Puffer (type=audit, alias=cdc:<slot>,
  volles CDCEvent als Payload). Stream-Ende = Backoff-Reconnect; typed
  Refusals (wal_level/REPLICATION/Slots) in der Operator-Zeile, Router
  läuft weiter. Opt-in per `--cdc-dsn` (leer = aus).
- `cmd/jimesh-router/main.go`: Flags (:51+), Ingest-Wiring (:86+),
  Health-Zeile mit edge=-Pufferstand, applyEdgeConfig:202 füttert
  Key-Hashes + Forward-URL aus jedem Pull in den Ingest.
- `cmd/jimesh-router/pull.go`: PullConfig + `sdk_key_hashes` +
  `forward_url` (:31) — Anwendung bei jedem Versionswechsel.
- `cmd/jimesh-router/Dockerfile` (NEU): distroless/static, VOLUME
  /var/lib/jimesh-router (Cert + WAN-down-Journal), CGO aus (Mandat 7).
- `internal/gateway/router_config.go` (:130+): der Pull (GET
  /api/router/config) serviert jetzt `sdk_key_hashes` (SHA-256 der
  Live-Service-Keys des Projekts — Plaintext reist nie zurück, Mandat 9)
  + `forward_url` (forwardURLFromRequest:164 — die Adresse, über die der
  Router den Pull selbst gemacht hat; Tunnel/Proxy vor dem Gateway
  werden damit automatisch geehrt).
- `internal/store/consumer_keys.go`: ListServiceKeyHashes (:268).
- `internal/deploy/projects_ssh.go` — Deploy-Checkbox (Socket-Guard/WAF-
  Muster 1:1): `edgeNode` (:86), Key-Mint pro Deploy (:1515–1536: alter
  Edge-Key revoked, frischer gemintet + Session-Row `edge-<nameKey>`;
  Plaintext nur in Request + Container-Env + Store-Hash, redacted im
  Log), Sweep+Run (:1767–1769, --network host = der 3100-Listener IST
  der Node-Loopback, Zero-Port/Mandat 12; Volume
  `jimesh-router-data-<nameKey>` hält Cert+Journal über Redeploys),
  Image-Streaming local (:1847) + remote (:1901, `docker save | ssh
  docker load`), Undeploy-Sweep (:2242) + Volume-Purge nur bei
  `purgeVolume: true`. Control-Plane-URL: lokal JIMESH_GATEWAY_IP oder
  127.0.0.1:19091 (das Host-Netns erreicht den Loopback-Publish; das
  Bridge-Gateway des Workspace-config.json tut es nicht), remote
  `http://$GW_IP:19091` (unquoted — Shell-Interpolation).
- `internal/deploy/projects_ssh_edge_test.go` (NEU): Renderer wörtlich.

**Abweichungen vom Plan-Abschnitt oben (ehrlich, mit Grund):**

- Puffer-Dateien heißen `journal.jsonl` + `cursor.json` (Plan:
  queue.jsonl) — zwei Dateien, weil Cursor und Journal getrennt atomar
  geschrieben werden.
- CDC-Loop liegt in `cdc_forward.go` (Plan: cdcforward.go).
- Container/Image heißen `jimesh-router[-data]-<nameKey>` (Plan:
  jimesh-edge) — es IST der Router; ein zweiter Name für denselben Baum
  wäre ein Drittes zu pflegen.
- Der Container läuft `--network host` (Plan: Projekt-Netz + Docker-DNS):
  die Akzeptanz verlangt `localhost:3100` AUF DEM TARGET — im
  Projekt-Netz wäre „localhost" aus App-Perspektive der
  Workspace-Container, nicht der Node. Loopback-Bind bleibt (Mandat 12,
  kein -p).
- Feldnamen `sdk_key_hashes`/`forward_url` (Plan: service_keys /
  forward_target) — Router- und Gateway-Seite im selben Task, kein
  Altvertrag.
- NICHT gebaut (Plan-Punkt 5, letzter Satz): Composite-Long-Poll-Version
  (Aliases + Keys). Ehrliche Grenze: eine Key-Revocation propagiert erst
  beim nächsten Registry-Versions-Bump bzw. Router-Neustart — bis dahin
  akzeptiert der Edge den (auf der Zentrale längst toten) Client-Key
  lokal. → Im Review-Pass desselben Tages NACHGEBAUT (Abschnitt unten):
  `ServiceKeyStateVersion` ohne die hier befürchtete Migration —
  live-count + max(created_at) flippt auf Mint UND Revoke.

**Review-Pass + Live-E2E (TASK-058, 13.9.2026 — zweite Session; jeder
Fund live reproduziert → gefixt → regressionstestet):**

1. **Demux-Stall (KRITISCH, live gemessen):** das HTTP-Demux peekte 512
   Bytes per `bufio.Peek` auf dem LIVE-Socket — Peek(n) blockt, bis n
   Bytes oder ein Reader-Fehler kommen; ein RESP-Client, der sein kurzes
   Kommando geschickt hat und auf die Antwort wartet, liefert beides
   nie. Am gebauten Binary gemessen: JEDE Redis-Verbindung antwortete
   erst nach exakt 30,002s (= acceptDeadline); die Test-Suite lief 33s.
   Die Unit-Tests sahen es nicht (String-Reader-EOF beendet Peek sofort
   — klassische Test-vs-Prod-Lücke). Fix (protocol.go, erste Session,
   nach eigenem curl-Befund): Stage-1 entscheidet auf
   `Peek(r.Buffered())` — exakt das erste TCP-Segment, blockt nie;
   Stage-2 (segmentierte Request-Line) liest weiter, gebunden durch die
   acceptDeadline. Live nach Fix: PING 0,003s. Regressionstest:
   TestDemuxAnswersHeldOpenSocketsFast (echte Sockets, harte 3s-Schranke
   für RESP/HTTP/Postgres) — Suite 33s → 3,2s.
2. **Poison-Row-Wedge (HOCH):** ein Record, den die Zentrale dauerhaft
   verweigert (403: session_id gehört der Workspace des Forwarding-Keys
   nicht — der reale Fall aus internal/sdklogs resolveSession), wurde
   für immer retried — der Cursor rückte nicht, ALLE späteren Records
   verhungerten dahinter (at-least-once ad absurdum: nicht einmal einmal
   geliefert). Fix (ingest.go): postCentral klassifiziert 400/403/413/
   422 als permanent (edgePermanentRefusal), der Drain settledt sie
   nach `dead.jsonl` (volle Journal-Zeile + Grund — forensisch, nie
   wieder gelesen) und rückt darüber hinweg; die Queue fließt weiter.
   401 bleibt bewusst transient (Router-Key defekt = Operator-Zustand —
   kein Massen-Drain nach dead.jsonl). Test:
   TestEdgeIngestPermanentRefusalDeadLettersAndKeepsQueueFlow. Live:
   Poison → dead_lettered=1, alle Records dahinter geliefert.
3. **Revocation-Propagierung (MEDIUM):** die Long-Poll-Version war
   alias-only — eine Key-Revocation bewegte sie nicht; ein laufender
   Edge validierte den toten Key offline weiter. Fix:
   `store.ServiceKeyStateVersion` (consumer_keys.go: live-count +
   max(created_at) der Projekt-Service-Keys) in der Composite-Version
   `al=<aliasV>;ck=<keyV>` (gateway routerConfigVersion) — Mint hebt,
   Revoke senkt, die Version flippt auf Key-Änderungen allein; POST/
   DELETE echoen dieselbe Composite. Test (Throwaway-DB):
   TestServiceKeyHashesAndStateVersion — Mint×2 + Revoke, jeder Flip.
   Zusätzlich: die unchanged-Pull-Antwort trägt jetzt `forward_url`,
   und pull.go wendet die Edge-Config auch dort an — das Forward-Target
   heilt nach einem Gateway-Adresswechsel ohne Alias-/Key-Änderung.
4. **Log-Spam-Guard:** ApplyKeyHashes loggt nur, wenn sich die Hash-Menge
   GEÄNDERT hat (der Live-Stub zeigte sonst eine Zeile pro Pull-Sekunde).
   `dead_lettered` reist jetzt in /api/edge/status und der Health-Zeile.

**Live-E2E (alles echt, kein Mock):** Stub-Zentrale (echtes HTTP,
echter SHA-256-Hash-Pull) + gebautes Binary: App-POST mit gepulltem Key
→ 202 → Journal → Forward; falscher Key → 401 lokal (fail-closed);
WAN-Ausfall (Stub-Tod) → 3 Offline-Records journalled
(unforwarded_bytes 564, dial-refused ehrlich im /api/edge/status) →
Reconnect → Resume nach Backoff-Fenster: forwarded=5, unforwarded=0,
alle 3 offline Records in Reihenfolge; Poison → dead.jsonl; RESP
0,003s. Health-Zeile: `edge=on keys=1 accepted=6 forwarded=5 dead=1
unforwarded_bytes=0`.

**Verifikation dieses Passes:** `go build ./...` GRÜN (das oben als rot
vermerkte TASK-060-WIP wurde mit fb47c25 gefixt — Grenzen-Notiz ist
historisch); `go vet` über router/store/gateway/deploy ✓; `go test
./cmd/jimesh-router/` (3,2s) + `./internal/deploy/` +
`./internal/store/` (jimesh_test-Throwaway-DB) ✓; gofmt clean.
`projects_ssh_egress_test.go` (3→4-Arg-Reparatur) reitet mit: HEAD war
inkonsistent — die Quelle hatte allowUDP, die Tests noch die alte
Signatur, die deploy-Tests kompilierten nicht.

**Ehrliche Grenzen / Follow-ups:**

- Kein Live-SSH-Deploy-Lauf in diesem Task (kein Target provisioniert):
  die Pipeline ist die des Live-getesteten Socket-Guard-Streams 1:1;
  Renderer sind wörtlich getestet. Operator-Check fürs erste Ziel:
  `docker ps --filter name=jimesh-router-<projId>` +
  `curl 127.0.0.1:3101` (Health-Zeile mit edge=-Stand) +
  `curl 127.0.0.1:3100/api/edge/status`.
- CDC-Forward gegen echtes wal_level=logical unverifiziert in diesem
  Lauf (Test-DB ohne logical) — internal/cdc ist selbst getestet; der
  Edge-Loop darüber ist Thin Wiring.
- `make go-build`/`make go-vet` (go build ./...) sind aktuell ROT — durch
  NICHT zu diesem Task gehörendes, untrackedes WIP eines Parallel-Agents
  (`internal/provision/provider.go` referenziert nicht existierendes
  `store.ControlPlaneRow`). Verifiziert wurden die Pakete dieses Tasks
  scoped (golang-Container): `go build ./cmd/jimesh-router/...
  ./internal/store/... ./internal/gateway/... ./internal/deploy/...` ✓,
  `go vet` über dieselben Pakete ✓, `go test ./cmd/jimesh-router/` ✓
  (inkl. aller neuen Ingest-Tests), `go test ./internal/deploy/` ✓,
  `go test ./internal/gateway/ ./internal/store/` ✓, gofmt clean auf
  allen angefassten Dateien.

---

## WP6b — Router-Node als Security-Node: Firewall (TASK-050-WP1, ⚡PRIORITY, 13.9.2026 umgesetzt)

Quelle: Operator 13.9. („die Router-Node ist unsere Security-Node — unsere
sicheren Deployments werden IMMER durch sie geroutet: Firewall dort
integrieren") + E-Firewall + E-Priority (Managed-Ports-First, BYOF später).
Prompt: `docs/tasks/subagents/PROMPT-task-050-router-firewall.md`.

**Plan (vor Implementation):**
1. Target-Fix: Capabilities/EffectiveRule kommen VOM ROUTER-NODE, nicht vom
   Backend-Host (das lokale `nft` auf dem Backend-Container war der Bug hinter
   dem Tile-Fehler „nft: executable not found").
2. Inbound-Enforcement pro Workspace-Alias: Default-DROP inbound im
   Ziel-Container-Netns (Egress-Muster 1:1), erlaubt nur Relay-Path +
   explizit vergebene Ports; verwaltet über Registry + Config-Pull.
3. Managed-Model-API: Port-Freigaben nur durch den OPERATOR (OPA-gated),
   User-Sicht read-only; BYOF nur als dokumentierter Stub.
4. Live-Verifikation am laufenden Stack.

**Gebaut (verifiziert gegen den Code):**
- `internal/security/firewall_provider.go`: Provider bekommt das **Target**
  (E-Firewall-Konsequenz 3): `CommandRunner`-Seam + `NewNftablesProviderAt`
  + exportierter `ParseEffectiveRules`; `Detect/Status/Apply` laufen durch
  den Runner (Default lokal = der Router-Host ist das richtige Ziel).
- `cmd/jimesh-router/firewall.go` (Engine, ~800 Z.): Probe→Report (immer an,
  outbound-only `POST /api/firewall/report`), Grant-Pull
  (`GET /api/firewall/config`), Reconcile per Container (Grants über alle
  Aliase des Netns gemergt — ein Alias-Table, keine gegenseitigen
  Überschreibungen), Renderer (lo/ct-established/Relay-Path/Grants, policy
  drop), Helper-Apply (debian:stable-slim + apt, `--cap-add NET_ADMIN`,
  `/lib/modules:ro`) **mit Read-Back in derselben Helper-Run**,
  Drift-Read alle 10 Zyklen heilt verschwundene Tabellen, State-Transition-
  Logging (journalctl sieht Fehler, nicht nur das Dashboard).
- `internal/security/firewall.go`+`firewall_rules.go`: `GET /api/firewall/status`
  serves den letzten Router-Report (ehrlicher Leerzustand davor — NIE ein
  Backend-Host-Fallback; staleness 90s explizit); `GET/POST/DELETE
  /api/firewall/rules` (Persistenz via Settings-KV `firewall_rules:<proj>`,
  Mandat-7-Minimal-Muster wie Port-Assignments; Versionsbump global);
  `POST /api/firewall/report` + `GET /api/firewall/config` (router-facing).
- `internal/gateway/gateway.go`: Registry-Zeile `s.security.RegisterFirewall(mux)`.
- `internal/auth/auth.go`: Service-Key-Gate-Familie erweitert auf
  report+config (TASK-033-Muster); OPA-Gate für POST/DELETE
  `/api/firewall/rules` — bewusst ALS Middleware-Check gegen DIESELBE
  policy.Engine (gleiches `requestIdentity`+`Allow`+Deny-Text wie jeder
  Admin-Mutation), NICHT über die policy.go-Prefix-Liste, weil policy.go
  uncommitted TASK-033-Hunks eines Parallel-Agents trägt (Commit-Hygiene:
  keine fremden Hunks in den TASK-050-Commit).
- Registry: `Snapshot()`+`Signature()` (cmd/jimesh-router/registry.go) für
  deterministische Reconciles.

**Live-Verifikation (13.9.2026, laufender Stack, alle Befehle nachstellbar):**
- `make restart-backend` ✓; Dashboard-Login → Service-Key (kind=service) →
  Alias `orders-live` (POST /api/router/config) → Grant tcp/15432 (POST
  /api/firewall/rules, OPA erlaubt Passwort-Operator) ✓
- Router-Prozess live (golang-Container, docker.sock, `--firewall`,
  Interval 5s): „firewall: applied inbound table to jimesh-framework-…-livetest
  (aliases=1 grants=1)" ✓
- `docker exec <ws> nft list table inet jimesh_inbound` (Akzeptanz-Befehl):
  policy drop + lo + ct established + Relay-Path + `tcp dport 15432 accept
  comment "jimesh: alias orders-live …"` ✓ (braucht CAP_NET_ADMIN im
  Workspace-Container — ohne es: Helper-Pattern oder Dashboard-Status)
- Enforcement-Matrix (gemessen): 15432 (granted, Dritter) = OPEN (356 ms);
  9999 (nicht granted, Dritter) = DROP (curl-timeout 3328 ms — kein RST);
  9999 von der Bridge-Gateway-Quelle = OPEN (Relay-Path-Regel hält den Router
  als Türöffner am Leben) ✓
- `GET /api/firewall/status`: `routerSeen:true, stale:false`,
  capabilities aus dem ROUTER-Knoten (nach `apt-get install nftables` dort:
  available=true, version v1.1.3, tables [nat] — Messung kommt vom Router,
  nicht vom Backend-Host), enforcement: orders-live → applied (4 gemessene
  Regeln) ✓
- Negative Pfade: Service-Key auf POST /api/firewall/rules = 401 (nur
  report/config nehmen Service-Keys); ohne Session = 401 ✓
- Aufräumen des Live-Tests: Rule revoked, Alias gelöscht, Service-Key
  revoked, Container entfernt ✓

**Ehrliche Grenzen / Follow-ups:**
- `make go-test`: internal/service-Tests failen am DB-Connect (Dial auf
  127.0.0.1:5432/`jimesh` = Default-DSN, nicht die make-Test-DB) —
  pre-existing, Paket von niemandem im Tree angefasst; security/jimesh-router
  grün.
- apt-Helper-Kosten pro Apply (~Sekunden) — Follow-up: pre-built
  jimesh-fwctl-Image (wie jimesh-socket-guard).
- Relay-Path v1 nur IPv4; Alias-Ziele nur lokale Container (Name/IP);
  Remote-DBs = ehrlich skipped. BYOF = Stub (E-Priority).
