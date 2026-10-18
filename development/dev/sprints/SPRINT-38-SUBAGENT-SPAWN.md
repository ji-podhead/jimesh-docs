# SPRINT-38 — Subagent-Spawn + Capability-Gating + SSE-Progress (Epic-3-WP3/4, TASK-061)

**Status:** ✅ implementiert & live verifiziert (14.9.2026, Subagent-Session)
— Checkoffs unten sind gegen den Code verifiziert, nicht aspiriert
(Mandat 1.4). Backend komplett; Frontend (SSE-Tile + Approval-Panel) =
TASK-062.

**Quelle:** TASK-061 (docs/tasks/subagents/PROMPT-task-061-subagent-spawn.md)
+ R40-Anhang A (AIM-Capability-String-Muster: `namespace:action` + Risk-Levels
+ JIT-Approval) + R12 §4 (Subagent-Spawning, SSE-Progress) + R21 §6
(GUARDED-Approval-Queue als JIT-Vorlage).

**Fundament (existiert, wurde NICHT neu gebaut):** MoE-Expert-Registry +
Gating-Agent (Sprint 14), vault-AllowedAgents + `/api/vault/access`-JIT
(Sprint 15/16), OPA embedded als EINE Engine (`internal/policy`, E-Policy),
Service-Keys kind=service mit Workspace-Bindung (Sprint 35 WP1c, TASK-037),
Session-Token-Mint (K-LAF WP1, `MintSessionToken`), SSH-Deploy-Pipeline
(`internal/deploy/projects_ssh.go`: lokal docker.sock / remote dialSSH).

## Ziel

Der Orchestrator (heute: Operator-Dashboard; später TASK-062-Frontend und
der R12-Utility-Orchestrator) kann Subagenten als **echte Container im
Workspace-Scope** spawnen. Jeder Subagent bekommt **einen eigenen
Service-Key** (kind=service, workspace-gebunden) und **ein eigenes
Session-Token** (K-LAF-Identitätskette, parent = Workspace-Session). Jeder
Tool-Call läuft **vor** der Ausführung durch die OPA-Fähigkeiten-Policy
(Capability-String `namespace:action`, AIM-Muster): low/medium + granted →
allow, nicht granted → deny, **critical → GUARDED-Queue** (persistente
`guarded`-Zeilen) bis der Operator im Dashboard bestätigt. Der Fortschritt
(spawn→running→done/error, Tool-Call-Übergänge) läuft als **SSE-Stream**
pro Subagent.

## Plan / Work Packages

### WP3 — Spawn-Schnittstelle (POST /api/subagents)

- [x] Store: `subagents`-Tabelle (id, workspace_id, expert_id, status,
      container_id, session_id + project_id/name/task/image/command/
      container_name/capabilities/ssh_target/error) —
      `internal/store/subagents.go:77` (`EnsureSubagentTables`), migrate()-
      Hook `internal/store/store.go:296` (idempotent, store.go-Muster).
- [x] Spawn-Pipeline nach dem Vorbild von `internal/deploy/projects_ssh.go`
      (NICHT neu erfunden): lokal (Loopback/kein NodeHost) `sh -c docker run`
      über den eigenen docker.sock des Gateway-Containers
      (`internal/subagents/node.go:72` `node.run`), remote via dialSSH
      (TOFU-Host-Key-Pins, network.TOFUHostKeyCallback,
      `internal/subagents/node.go:137`) mit Credentials NUR aus dem
      Request, nie aus PostgreSQL. Kein Port veröffentlicht — `docker
      inspect`-Beweis: `ports: map[]` (Mandate 12).
- [x] Identität: Session-Row `sa-<id>` mit parent_session_id = Workspace-
      Session (K-LAF-Baum, ERSTER echter Caller der Spalte —
      `store.CreateSubagentSession`, subagents.go:335), eigenes
      Session-Token (`MintSubagentSessionToken`, 24 h), eigener Service-Key
      (user_id=`subagent:<wsId>` — `CreateSubagentServiceKey`,
      subagents.go:347). `ServiceKeyByWorkspace` filtert auf
      `user_id='service:'||workspace_id` zurück
      (`internal/store/consumer_keys.go:249`), damit der Workspace-
      Ensure/DELETE weiter den WORKSPACE-Key findet (Test:
      `TestSubagentServiceKeyDoesNotShadowWorkspaceKey`).
- [x] Echter Container: `jimesh-subagent-<id>`, Image default `busybox:1.37`
      (Test-Container, No-Mock), `command` optional (leer = Idle-Worker
      `tail -f /dev/null`; gesetzt = Task, Monitor verfolgt `docker
      inspect` bis done/error — `internal/subagents/spawn.go:336`
      `monitorTask`, Deadline 1 h). Env: JIMESH_SUBAGENT_ID/WORKSPACE_ID/
      SESSION_ID/SESSION_TOKEN + OPENAI_API_KEY=Service-Key +
      OPENAI_BASE_URL (Netzwerk-Gateway dynamisch aufgelöst, deploy-Muster,
      nie hardcodiert — `resolveGatewayBaseURL`, spawn.go:311).
- [x] Routes: GET/POST `/api/subagents`, GET/DELETE
      `/api/subagents/{id}` (`internal/subagents/subagents.go:70`
      Register; Verdrahtung `internal/gateway/gateway.go:244`). POST-Spawn
      und DELETE-Stop sind Admin-Mutationen (`policy.IsAdminMutation` →
      OPA RBAC, `internal/policy/policy.go:88` `isAdminSubagentMutation`;
      Tests `TestIsAdminMutationSubagents`).

### WP4 — SSE-Progress (GET /api/subagents/{id}/events)

- [x] In-Memory-Event-Hub pro Subagent (Ring-Buffer 50, Replay on connect,
      Heartbeat 30 s, agentlog-Muster — `internal/subagents/hub.go`).
      Ereignisse sind echte Emissionen der Spawn-/Monitor-/Tool-Call-Pfade
      — keine synthetischen Ticker (Slow-Subscriber verliert Events,
      blockiert nie den Emitter; `TestHubSlowSubscriberDoesNotStallEmitter`).
- [x] Status-Event `status` on connect = Live-DB-Row; Terminal-Zustand
      (done/error/stopped) → Replay + `end` + sauber schließen
      (`handleEvents`, subagents.go:270). Server-WriteTimeout 60 s beendet
      den Stream (EventSource-Reconnect + Replay machen das nahtlos —
      gleiche Realität wie /api/streams/logs).

### Capability-Gating (OPA-Erweiterung, internal/policy)

- [x] Eingebettetes Rego-Modul `policies/capabilities.rego`
      (package jimesh.capabilities): Risk-Tabelle db:read=low, db:write=
      medium, fs:read=low, fs:write=medium, shell:exec=medium, net:http=
      medium, admin:*=critical (Präfix-Regel — der ganze Admin-Namespace);
      Grant-Matching exakt + Wildcard `ns:*`; Entscheidung
      allow/guard/deny mit Reason; fail closed (unbekannt/mißgebildet →
      deny; Engine-Fehler → refuse). Entscheidungsmatrix:
      `TestCapabilityDecisions` (16 Fälle).
- [x] `policy.Engine` zweite Prepared Query
      (`data.jimesh.capabilities.decision`) + `EvaluateCapability`
      (`internal/policy/capabilities.go:74`, fail closed + allow∧guard-
      Verweigerung); `JIMESH_CAPABILITY_POLICY` überschreibt symmetrisch
      zum RBAC-Env (`capabilities.go:50`); Load() bricht bei kaputter
      Policy ab (fail loud, policy.go:126).
- [x] POST /api/subagents/{id}/tool-calls: OPA-Entscheidung VOR jeder
      Ausführung (`internal/subagents/toolcalls.go:74` `handleToolCallSubmit`);
      deny → 403 + Audit-Row `denied`; allow → `docker exec` im
      Subagent-Container (Isolationsgrenze; 60 s Timeout, 64 KB Result);
      guard → persistente `guarded`-Row + 202. Capability-Grants werden
      schon beim SPAWN gegen die Policy validiert (fail closed an der
      Tür — `validateGrantableCapabilities`, spawn.go:424).

### JIT-Approval (GUARDED-Queue, R21/DAP-Muster)

- [x] GET /api/subagents/guarded — Operator-Sicht auf die Queue
      (persistente Rows + Subagent-Kontext; ehrliches `[]` wenn leer).
- [x] POST /api/subagents/{id}/tool-calls/{callId}/approve|deny —
      Admin-Mutation (OPA); approve → Ausführung + done/error-Row,
      deny → denied-Row; `decided_by` dokumentiert; nur `guarded`-Rows
      sind entscheidbar (Doppel-Click = 409, nie Re-Execute —
      `decideGuarded`, toolcalls.go:206).
- [x] Survival über Restart: Die Queue IST die PostgreSQL-Tabelle
      (status='guarded') — live bewiesen (Restart während des Tests:
      Rows + Statuses überlebten, Queue-Lesefehler-frei).

## Akzeptanz (aus TASK-061) — alle live verifiziert

- [x] POST /api/subagents → Container läuft mit eigenem Key
      (busybox:1.37 auf dem Host-`docker ps`, eigener Service-Key
      user_id=subagent:<wsId> + eigenes Session-Token in env + DB, null
      Ports)
- [x] Tool-Call mit capability=db:write → OPA checkt → allow/deny
      (db:write granted → 200 done + echte exec-Ausgabe
      `hello-from-subagent`; shell:exec nicht granted → 403 + Audit-Row)
- [x] critical-Capability → pausiert bis Operator-Confirm
      (admin:* → 202 guarded → Queue-Sicht → approve → exec → done;
      Doppel-Approve → 409)
- [x] SSE-Stream liefert Status-Events (status/spawn/running/tool-call/
      done + `end`, Replay nach Restart, Monitor-`done` nach exakt der
      45-s-Task)

## Verifikation (14.9.2026, live gegen den laufenden Stack)

Build/Vet/Tests (Container-Toolchain, golang:latest — kein Host-Go):
- `go build ./...` grün auf HEAD+Parallel-In-Flight+eigene Dateien
  (Build-Overlay /home/ji/jimesh-t061-verify — der gemeinsame Baum
  trägt 3 parallele Sessions: TASK-058/059/060).
- `go vet ./internal/policy/ ./internal/subagents/ ./internal/gateway/
  ./internal/store/` grün.
- `go test ./internal/policy/` (RBAC + 16 Capability-Fälle + Admin-
  Mutation-Split) grün; `go test ./internal/subagents/` (Hub, Shell/
  Parse/Host-Helfer, Grant-Validierung) grün; `go test ./internal/store/
  -run Subagent` gegen die throwaway `jimesh_test`-DB grün (3 Tests:
  Row-Lifecycle, Tool-Call-Ledger, Service-Key-Shadowing).
- Full-Suite: 4 Fail-Pakete (cmd/jimesh-router, internal/ai,
  internal/network, internal/service) via Baseline-Overlay
  (HEAD+Parallel-ohne-eigene-Dateien) als VORHANDEN/fremd bewiesen —
  identische Fehler ohne TASK-061-Code. `internal/store/control_planes_
  test.go` (TASK-060-Session, in-flight, eigener Signatur-Break) blockiert
  nur deren eigenes Paket-Vet — nicht meine Dateien.

Live-curl-Kette (make restart-backend, dann gegen :19091): Login →
POST /api/workspaces (echtes Worktree-Ensure) → POST /api/subagents
(busybox, capabilities db:read/db:write/admin:*) → docker ps + docker
inspect (Container, Env-Injektion, Label, ports map[]) → tool-calls
db:write (allow+exec) / shell:exec (403) / admin:* (202 guarded) →
Queue → approve (exec, decided_by) → Doppel-Approve 409 → SSE-Stream
(Replay aller Phasen + end) → 45-s-Task-Monitor-`done` (exit 0) →
DELETE (Container weg, Key+Token revoked, Row stopped) → Restart →
Rows/Statuses überleben. Negative Fälle: unbekannte Capability → 400,
unbekannter Workspace → 404, ohne Token → 401. Test-Fixtures danach
explizit per id entfernt (subagents/tool_calls/sessions/keys/containers/
workspaces/projects + Container-/tmp-Fixture).

**Nicht live verifiziert (ehrlich):** der Remote-SSH-Spawn-Pfad (kein
Remote-Node in der Umgebung — spiegelt projects_ssh.go:816 dialSSH
zeilengetreu, TOFU über dieselbe `ssh_host_keys`-Tabelle); die OPA-403-
Antwort für einen Keycloak-NON-Admin auf Spawn/Approve (kein solcher
Login in der Umgebung — Routing via `TestIsAdminMutationSubagents`
abgedeckt, RBAC-Engine ist der unveränderte Live-Pfad der Workspaces).

## TASK-076 — Agent-Feedback-Loop: SIEM-Criticals → Coding-Session-Injektion

**Status:** ✅ umgesetzt & live verifiziert (14.9.2026, Task-076-Worktree
`../jimesh-worktrees/task-076-agent-feedback-loop`) — Checkoffs unten sind
gegen den Code verifiziert, nicht aspiriert (Mandat 1.4). | **Quelle:**
docs/tasks/subagents/PROMPT-task-076-agent-feedback-loop.md
(Operator 14.9.: „wenn coding agents änderungen machen und plötzlich wazuh
errors haben, das direkt dem coding agent injecten — sonst muss er ja selber
ständig in die logs schauen").

### Plan (vor dem Code, Mandat 1.4)

**Ziel:** Wenn Wazuh/Falco/Checkov einen CRITICAL-Fund meldet, der einem
Workspace zurechenbar ist, wird der aktiven Coding-Session des Workspaces
eine strukturierte System-Message auf ihren SSE-Stream **aktiv injiziert**
— der Agent muss nicht in Logs suchen.

**Recherche-Ergebnis (wo landen Criticals wirklich?):** Die Task-Annahme
„internal/siem/bridge.go → security_events" stimmt so nicht:

- Wazuh/Falco: die Bridge (cmd/siem-bridge, EIGENER Prozess/Container)
  shipped via `POST /api/sdk/logs` → **sdk_logs** (type=audit,
  alias=wazuh|falco; level=ERROR = critical per SPRINT-32-Mapping,
  transform.go). Workspace-Attribution kommt server-seitig vom
  Service-Key (TASK-032). security_events hat KEINE severity- und KEINE
  workspace-Spalte — die Zeilen dort (iac_finding etc.) sind für die
  Injektion nicht workspace-resolvable.
- Checkov: deploy/quarantine.go gateAuditLog → dieselbe sdk_logs-Surface
  (alias=checkov, level=ERROR beim Quarantine, workspace aus dem
  gateContext) + parallel security_events (iac_finding, nur project/session
  — ohne Workspace-Spalte).
- Der gemeinsame Nenner ALLER drei Scanner ist der **InsertSDKLog-Store-Write**
  (sdklogs.ingestLog für wazuh/falco, quarantine.gateAuditLog für checkov).

**Work Packages:**

- WP1 TRIGGER: `store.ObserveAuditCritical` — ein post-write Hook im
  InsertSDKLog (store/sdk_logs.go), feuert in eigener Goroutine NUR für
  persistierte Rows mit type=audit UND level=ERROR (Ingest wird nie
  blockiert; Fehler im Observer → Log-Zeile, weiter). internal/siem wird
  NICHT angefasst — die Bridge ist ein eigener Prozess und erreichte den
  In-Memory-Hub ohnehin nie; ihr Ingest IST die Grenzstelle.
- WP2 BINDUNG: `subagents`-Tabelle IST die Workspace→Session-Bindung
  (workspace_id + status + session_id, TASK-061). Kein neues
  primary_session_id-Feld: der TASK-061-SSE-Hub ist per SUBAGENT-ID
  gekeyed; injiziert wird in JEDEN aktiven (spawning|running) Subagenten
  des Workspaces (der Verursacher ist unter ihnen, die Nachricht nennt
  den Workspace). Kein aktiver Subagent → Log-Zeile, Row bleibt der
  dauerhafte Record. `workspaces.session_id` (die Workspace-Session) hat
  keinen eigenen SSE-Stream — ein Parallel-Kanal wäre Mandatsbruch
  („KEINEN parallelen Kanal bauen").
- WP3 INJEKTION: internal/subagents/feedback.go — Filter (alias ∈
  wazuh|falco|checkov, workspace resolvable) → strukturierte Notice
  (scanner, rule, severity, workspaceId, sessionId, logId, message=
  die bereits redigierte einzeilige Scanner-Summary, advice) →
  `hub.Emit(subagentID, "security-critical", notice)` — der TASK-061-Hub
  WIEDERVERWENDET (Emit blockiert nie: langsame Subscriber verlieren
  Events, der Emitter läuft weiter). KEINE raw payloads (K-LAF E3:
  maximal ein Identitäts-Feld pro Scanner aus dem Row-Payload gepickt,
  der Rest fällt weg).
- WP4 VERIFY: Unit-Tests (Notice-Bau je Scanner + DB-gestützte
  Injektions-Kette gegen die jimesh_test-DB) + Live-Test: eigener
  Gateway-Binary vom Worktree gegen Throwaway-DB, echter Subagent-Spawn
  (busybox), Critical-Audit-Row über die echte /api/sdk/logs-Ingest-Fläche
  (so shipped auch die Bridge), SSE-Stream zeigt die injizierte
  System-Message; Fixtures danach aufgeräumt.
- WP5 DOCS: API_DOCS (SSE-Event-Typ `security-critical`), dieses
  Sprint-File, Task-File-Status, BACKLOG-Spiegel.

**Akzeptanz:**

1. audit+ERROR-Row eines SIEM-Scanners mit workspace → jede aktive
   Subagent-Session des Workspaces bekommt `security-critical` auf ihrem
   SSE-Stream (live bewiesen).
2. Nicht-kritische Rows (INFO/WARN, fremde Aliase) und Rows ohne
   Workspace-Attribution injizieren NICHT (negativ getestet).
3. Der Ingest-Pfad blockiert nie auf die Injektion (Hook läuft in eigener
   Goroutine; Hub-Emit ist non-blocking per Design).
4. Open Design Question „Multi-Agent-Investigation" (kann der Agent andere
   Sessions callen?) ist GEFLAGGT und als dokumentierter Next-Step
   markiert — nicht halb gebaut.

**Offene Design-Frage (GEFLAGGT, nicht still entschieden):** Soll ein
benachrichtigter Agent andere Subagenten-Sessions des Workspaces (oder
sessions-übergreifend) zum Untersuchen CALLen können (Multi-Agent-
Investigation)? Das bräuchte einen neuen Route-Typ
(`/api/subagents/{id}/tool-calls` erweitert um target-session) plus
Policy-Entscheidung, wer wen rufen darf — out of scope hier, als
Next-Step unten dokumentiert.

### Ergebnis (verifiziert, nicht aspiriert)

- [x] WP1 TRIGGER — `store.ObserveAuditCritical` +
  `fireAuditCritical` (`internal/store/sdk_logs.go:81` ff., DB-Feld in
  `store.go:20`): feuert NUR für erfolgreich persistierte Rows mit
  type=audit ∧ level=ERROR, in eigener Goroutine mit der frischen Row-ID.
  Ingest blockiert nie (Fehler im Observer → Log-Zeile; Emit non-blocking).
- [x] WP2 BINDUNG — KEIN neues primary_session_id-Feld: `subagents`-Tabelle
  ist die Bindung. Injektion in JEDE aktive (spawning|running) Session des
  Workspaces (`internal/subagents/feedback.go:99` ff.); Terminal-Sessions
  bekommen nichts; keine aktive Session → Log-Zeile, Row bleibt Record.
  `workspaces.session_id` existiert, hat aber keinen eigenen SSE-Stream —
  ein Parallel-Kanal wäre Mandatsbruch gewesen.
- [x] WP3 INJEKTION — `internal/subagents/feedback.go`
  (`OnAuditCritical`, `buildSecurityCriticalNotice`): Filter alias ∈
  {wazuh, falco, checkov} + workspace resolvable → Notice
  {scanner, rule, severity:"critical", workspaceId, projectId,
  sourceSessionId, logId, message, advice} → `hub.Emit(subagentID,
  "security-critical", notice)` — TASK-061-Hub WIEDERVERWENDET. K-LAF E3:
  aus dem Row-Payload wird maximal EIN Identitäts-Feld gepickt (wazuh:
  rule_id; falco: rule; checkov: erste CRITICAL check_id), message ist die
  bereits redigierte Dashboard-Zeile (truncStr-Disziplin, 4096er-Cap in
  feedback.go), raw payloads (z. B. full_log) wandern NICHT in die Notice.
  Wiring: `subagents.New` registriert den Observer am Store
  (`subagents.go:68` ff.) — Kompositionswurzel bleibt unangetastet, Store
  importiert subagents nie.
- [x] WP4a TESTS — `internal/subagents/feedback_test.go`:
  TestBuildSecurityCriticalNotice (5 Fälle: wazuh/falco/checkov-Extraktion,
  Garbage-Payload → leere Rule, Truncation) +
  TestOnAuditCriticalInjectionChain (echte jimesh_test-DB: InsertSDKLog →
  Hook → Hub → security-critical auf der AKTIVEN Session; Terminal-Session
  bleibt leer; Negativ-Kontrollen INFO/app-Alias/ohne-Workspace/falscher-
  Typ injizieren nicht; Replay-Ring hält beide Notices). Pakete grün:
  subagents, store, siem, deploy (Container-Toolchain, frische
  jimesh_test-DB).
- [x] WP4b LIVE-TEST (eigener Gateway vom Worktree, Throwaway-DB
  `jimesh_task076`, Compose-Redis, docker.sock, 127.0.0.1:19099):
  Arm-Meldung im Gateway-Log → Login → POST /api/subagents → echter
  busybox-Container `jimesh-subagent-sa-615be959067c7e81` (null Ports) →
  SSE-Stream (curl -N) → Critical-Inject über die ECHTE Ingest-Fläche
  (POST /api/sdk/logs mit dem workspace-gebundenen Service-Key — exakt so
  shipped die SIEM-Bridge): `event: security-critical` mit
  scanner=wazuh, rule=100002, severity=critical, workspaceId, logId=1 —
  SSE zeigt die Nachricht, Gateway-Log: „injected wazuh critical (rule
  100002, log row 1) into 1 active subagent session(s)". Checkov-Shape
  (alias=checkov, iac_findings-Payload) → zweite Injektion mit
  rule=CKV_DOCKER_3, logId=4. Negativ-Kontrollen live: INFO-Row und
  app-Alias-ERROR injizieren NICHT (SSE blieb bei genau 2 Events).
  Reconnect-Replay zeigt beide Notices (Ring 50). Cleanup: DELETE-Route
  (Container weg, Key+Token revoked, Row stopped), Throwaway-DB gedroppt,
  Test-Gateway entfernt.
- [x] WP5 DOCS — API_DOCS (SSE-Event-Typ `security-critical`, Ingest-
  Hinweis bei POST /api/sdk/logs, Injektions-Absatz in der Subagents-
  Sektion inkl. Bindungs-Wahl und geflaggter Design-Frage), Task-File-
  Status ✅, BACKLOG-Zeile 076.

**Scope-Abweichungen (ehrlich dokumentiert):** (a) internal/siem wurde
NICHT geändert — die Bridge ist ein eigener Prozess (cmd/siem-bridge) und
kann den In-Memory-Hub des Gateways nie direkt erreichen; ihr Ingest
(POST /api/sdk/logs → InsertSDKLog) IST die Grenzstelle, der Hook liegt
deshalb im Store-Write (der Task-File-Fundstelle „bridge.go →
security_events-Store" traf so nicht zu: security_events hat keine
severity- und keine workspace-Spalte). (b) `internal/store/store.go`:
DB-Struct-Feld für den Observer + ein Fresh-DB-Fix — die guarded ALTERs
liefen VOR dem CREATE TABLE projects und fielen auf neuer DB still
durch (gleiche Fehlerklasse wie der dokumentierte TASK-055-Fix für
containers.workspace_id): Spalten jetzt im CREATE, ALTERs bleiben für
Legacy-DBs idempotent wirksam. Der Live-Test hing an diesem Bug
(spawnSubagent → GetProject).

## Offene Punkte (dokumentiert, nicht gefaked)

- Frontend (read-only SSE-Tile + Approval-Panel) → TASK-062.
- TASK-076-Next-Step (offene Design-Frage, GEFLAGGT): Multi-Agent-
  Investigation — darf ein benachrichtigter Agent andere Sessions des
  Workspaces zum Untersuchen CALLen? Braucht Route-Typ + Policy-
  Entscheidung; nicht halb gebaut.
- Container-authentifizierter Tool-Call-Pfad: Subagent-Service-Keys
  erreichen /v1/* (Sprint 35 WP1c), aber nicht /api/subagents/* — dafür
  fehlt die auth.go-Middleware-Gate-Branche (internal/auth lag parallel
  in-flight); v1-Submits kommen von Dashboard-/Orchestrator-Session.
  API_DOCS dokumentiert es als Follow-up.
- Capability-Strings sind caller-deklariert (Grant-Abgleich + Risk-
  Klassifikation); Intent-Verifikation (R40-Anhang A NanoMind-Muster)
  ist der dokumentierte nächste Schritt.
- DSH-Plugin/npm-Wrapper (Epic-3-WP3-Original-Formulierung) baut auf
  diesen Routes auf — noch offen.
