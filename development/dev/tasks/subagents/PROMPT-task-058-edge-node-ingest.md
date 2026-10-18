# TASK-058 — Edge-Node WP6: Lokaler Log-Ingest + CDC-Forward am Router-Node

**Status:** ✅ umgesetzt (13.9.2026 — Commit s. git log; nicht gepusht) | **Quelle:** SPRINT-36 WP6 (Operator 13.9.: „beim SSH-Target-Deploy auswählen ob JiMesh Control Plane dort läuft — Production-Logs ohne WAN-Roundtrip") + E-Editions (Edge = DB-Pro-Feature im Runtime-Entitlement).

## Fundament (alles gemerged — NICHT neu erfinden)

- **cmd/jimesh-router/** (9445fa1, 1670 Z.): L7-Proxy (pgproto3+RESP), Alias-
  Registry (registry.go), Config-Pull (pull.go), Firewall-Engine (firewall.go,
  ef7b29b), Audit-Logger (audit.go), Health auf :3101
- **internal/cdc/** (3ffc260): StartReplication → Channel von CDCEvents,
  Slot-Manager, CheckPrerequisites (wal_level=logical)
- **Gateway-Ingest** (d36c62e): POST /api/sdk/logs — der Zentrale empfängt
- **Service-Keys** (consumer_keys): kind=service, workspace_id-Bindung

## Aufgabe

1. **Lokaler SDK-Logs-Ingest im Router:** /api/sdk/logs-Endpoint am Router
   selbst (localhost:3100) — Apps/Agents auf dem Target loggen OHNE WAN-
   Roundtrip; Router persistiert lokal (SQLite oder JSONL-Spill) UND
   forwardet async (Buffer + Batch-POST) an die zentrale /api/sdk/logs
   (Service-Key des Workspace, Attribution bleibt server-side)
2. **CDC-Forward:** internal/cdc.StartReplication im Router-Process — Events
   landen im lokalen Ingest (nicht direkt an die Zentrale — der lokale
   Puffer sitzt dazwischen)
3. **WAN-down = Edge weiterarbeiten:** Buffer läuft voll → Spill-to-Disk →
   Forward-Resume bei Reconnect (at-least-once, dokumentiert)
4. **Deploy-Checkbox:** beim SSH-Target-Deploy „Deploy JiMesh Edge Node"
   (projects_ssh.go erweitern um Router-Binary-Deploy — gleiche SSH-Pipeline
   wie Socket-Guard/WAF)
5. **Config-Pull erweitern:** der Router-Pull bekommt die Service-Key-Hashes
   seiner Workspaces (für lokale Validierung) + die Forward-Target-URL

## Regeln

- CGO_ENABLED=0, pure Go; SQLite = stdlib (kein CGO!) oder JSONL (einfacher)
- Scope: cmd/jimesh-router/**, internal/deploy/projects_ssh.go (nur die
  Deploy-Checkbox), Task-File. NICHT src/frontend, NICHT internal/siem
- Build: make go-build && make go-vet, gofmt, scoped tests
- No-Mock: echte Ingest-Calls, echte Forward-Spills (Test-Container)
- GIT: explizite Pfade, kein -A, NICHT pushen

## Akzeptanz

- [x] App auf Target → localhost:3100/api/sdk/logs → Puffer → Zentrale —
      `cmd/jimesh-router/ingest.go` (Journal vor 202, Cursor at-least-once) +
      `ingest_http.go` (Handler) + `protocol.go` (HTTP-Demux). Getestet:
      `ingest_test.go` — echte httptest-Zentrale, echter TCP-Listener,
      echte Dateien (TestEdgeIngestForwardDeliversAcceptedRecords,
      TestHTTPDemuxAndIngestHandler).
- [x] CDC-Event → gleicher Pfad — `cmd/jimesh-router/cdc_forward.go`:
      StartReplication im Router-Prozess, Events → derselbe lokale Puffer
      (nicht direkt an die Zentrale). Ehrlich: kein Live-Test gegen
      wal_level=logical in diesem Lauf (Test-DB ohne logical) — der Loop
      ist Thin Wiring über das selbst verifizierte internal/cdc.
- [x] WAN-simulierter Ausfall → Edge weiter, Puffer wächst, Resume bei Up —
      TestEdgeIngestWANDownSpillsAndResumes (25 Records, Zentrale 503,
      Reconnect → alle 25 in Ordnung) + TestEdgeIngestRestartResumesUnfro-
      nishedJournal (Prozess-Tod) + TestEdgeIngestFailedRecordKeepsCursor-
      Contiguous (kein Verlust, Cursor kontiguierlich, re-POST erlaubt).
- [x] Deploy-Checkbox im SSH-Target-Form — Backend-Feld `edgeNode`
      (internal/deploy/projects_ssh.go:86): Socket-Guard-Pipeline 1:1
      (Image aus eigenem Tree, `docker save | ssh docker load`,
      --network host = Node-Loopback 3100, Volume hält Cert+Journal,
      Key-Mint pro Deploy revoked+frisch, redacted), Undeploy-Sweep +
      Purge nur bei purgeVolume. Renderer wörtlich getestet
      (projects_ssh_edge_test.go). Die FRONTEND-Checkbox ist bewusst NICHT
      Teil dieses Tasks (Scope-Regel) — Feldname ist der Vertrag → TASK-051.

## Umsetzungs-Verifikation (13.9.2026, golang-Container — kein Host-Go)

- `go build ./cmd/jimesh-router/... ./internal/store/... ./internal/gateway/... ./internal/deploy/...` ✓
- `go vet` über dieselben Pakete ✓
- `go test ./cmd/jimesh-router/ -count=1` ✓ (alle Tests, inkl. der 7 neuen)
- `go test ./internal/deploy/ -count=1` ✓ · `go test ./internal/gateway/ ./internal/store/` ✓
- gofmt clean auf allen angefassten Dateien
- `make go-build`/`make go-vet` (./...) aktuell ROT durch fremdes, untrackedes
  Parallel-WIP (`internal/provision/provider.go` → fehlendes
  `store.ControlPlaneRow`) — NICHT Teil dieses Tasks; scoped Builds grün.
- Live-Smoke des Edge-Binary (lokal, gegen laufenden Stack): s. Sprint-File
  WP6 „Gebaut"-Abschnitt — Health-Zeile auf :3101, 401 auf /api/sdk/logs vor
  dem ersten Pull (fail-closed), /api/edge/status, Redis/Postgres-Demux
  unverändert.

## Offen (ehrliche Reste, nicht Scope dieses Tasks)

- Frontend-Checkbox + Edge-Status-Kachel (→ TASK-051, „NICHT src/frontend")
- Editions-Gating (E-Entscheidung DECISIONS.md)
- CDC-Integrationstest gegen echte wal_level=logical-DB

## Review-Pass (13.9.2026, zweite Session — parallel beauftragt, Verifikation
gegen den Quellcode + Live-Binary; alle Befunde reproduziert, gefixt,
regressionstestet; Details + Live-Nummern: SPRINT-36 WP6 „Review-Pass")

- **Demux-Stall (KRITISCH, live gemessen):** `isHTTPRequestLine` peekte
  512 Bytes auf dem Live-Socket → JEDE Redis-Verbindung antwortete erst
  nach exakt 30,002s (acceptDeadline; Suite 33s). Unit-Tests sahen es
  nicht (String-Reader-EOF beendet Peek sofort). Fix (protocol.go,
  Stage-1 `Peek(r.Buffered())`, Stage-2 gebunden): PING jetzt 0,003s;
  Regressionstest TestDemuxAnswersHeldOpenSocketsFast (echte Sockets,
  3s-Schranke); Suite 3,2s.
- **Poison-Row-Wedge (HOCH):** permanent abgelehnte Records (real: 403
  fremde session_id aus internal/sdklogs resolveSession) retried für
  immer und verhungerten ließen alle folgenden Records dahinter. Fix
  (ingest.go): 400/403/413/422 → `edgePermanentRefusal` → `dead.jsonl`
  (forensisch) + Cursor rückt darüber; 401 bewusst transient (Router-Key
  = Operator-Zustand). Test:
  TestEdgeIngestPermanentRefusalDeadLettersAndKeepsQueueFlow.
- **Revocation-Propagierung (MEDIUM, war oben als offen vermerkt):**
  `store.ServiceKeyStateVersion` (live-count + max(created_at) — KEINE
  updated_at-Migration nötig) → Composite-Long-Poll-Version
  `al=…;ck=…` (gateway/router_config.go); Revocation flippt die Version
  ohne Alias-Änderung. Test (Throwaway-DB):
  TestServiceKeyHashesAndStateVersion. unchanged-Pull-Antworten tragen
  jetzt `forward_url`, pull.go wendet sie an (Target-Heilung nach
  Gateway-Adresswechsel).
- **Kleineres:** ApplyKeyHashes loggt nur bei echter Änderung;
  `dead_lettered` in /api/edge/status + Health-Zeile;
  projects_ssh_egress_test.go 3→4-Arg-Reparatur (HEAD war inkonsistent,
  deploy-Tests kompilierten nicht).
- **Live-E2E (alles echt):** Stub-Zentrale + Binary: 202→Journal→Forward,
  401 fail-closed, WAN-Tod → 3 Offline-Records gebuffert → Resume:
  forwarded=5/unforwarded=0, Poison → dead.jsonl, RESP 0,003s.
  Verifikation des Passes: `go build ./...` grün (TASK-060-Rot ist mit
  fb47c25 behoben), vet ✓, Tests router/deploy/store (jimesh_test) ✓,
  gofmt clean.
