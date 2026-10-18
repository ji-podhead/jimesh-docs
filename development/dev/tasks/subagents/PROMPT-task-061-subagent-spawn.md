# TASK-061 — Epic-3-WP3/4: Subagent-Spawn-Schnittstelle + SSE-Progress-UI

**Status:** ✅ umgesetzt & live verifiziert (14.9.2026, Subagent-Session —
Sprint-File: `docs/sprints/SPRINT-38-SUBAGENT-SPAWN.md`) | **Quelle:** BACKLOG
Subagent-Lücken (R40-Anhang AIM: Capability-String-Muster für Tool-Call-Gating
+ JIT-Approval) + Epic-3-WP3/4 (DSH-Plugin: npm + cordis-YAML) + R12
(Subagent-Coordination).

## Fundament

- MoE-Expert-Registry existiert (Epic-3-WP1: 3 Seeds, CRUD)
- Gating-Agent + Execution-Engine existiert (Epic-3-WP2: parallel/sequential)
- vault-AllowedAgents + /api/vault/access (JIT) = ACL-Basis
- OPA embedded (policy.go) kann Capability-Strings konsumieren (AIM-Muster)
- SSE-Infra existiert (Streams, /api/agents/logs/stream)

## Aufgabe

1. **Spawn-Schnittstelle (WP3):** POST /api/subagents — spawnt einen
   Subagent-Container (Workspace-scope, eigener Service-Key, eigenes
   Session-Token); Store: subagents-Tabelle (id, workspace_id, expert_id,
   status, container_id, session_id)
2. **Capability-Gating:** OPA-Policy erweitert um Capability-Strings
   (namespace:action — AIM-Muster: db:read=low, db:write=medium, admin:*=critical);
   Subagent-Tool-Calls gehen durch OPA BEVOR der Container sie ausführt
3. **SSE-Progress-Panel (WP4):** GET /api/subagents/{id}/events — SSE-Stream
   mit Status/Laufzeit-Events (spawn→running→done/error); Frontend-Anker
   (read-only-SSE-Tile — Frontend kommt in TASK-062, NICHT dein Scope!)
4. **JIT-Approval-Muster:** Capability mit risk_level=critical → Ausführung
   pausiert (GUARDED-Queue aus R21/DAP), Operator bestätigt im Dashboard

## Regeln

- CGO_ENABLED=0, pure Go; Subagent-Container = Docker-Deploy via bestehender
  SSH-Pipeline (NICHT neu erfinden)
- Scope: internal/subagents/** (neu), internal/policy/ (Capability-Erweiterung),
  internal/gateway/ (nur deine Routes), Task-File. NICHT src/frontend,
  NICHT cmd/jimesh-router, NICHT internal/siem, NICHT internal/deploy
- No-Mock: echte Spawns (Test-Container), echte OPA-Gates
- GIT: explizite Pfade, kein -A, NICHT pushen
- Build: make go-build && make go-vet, gofmt, scoped tests

## Akzeptanz

- [x] POST /api/subagents → Container läuft mit eigenem Key
      (busybox:1.37 live auf dem Host-`docker ps`, Service-Key
      user_id=subagent:<wsId> + Session-Token in env + DB, null Ports;
      Fundstellen: Route `internal/subagents/subagents.go:99`,
      Pipeline `internal/subagents/spawn.go:82`, Store
      `internal/store/subagents.go:63`)
- [x] Tool-Call mit capability=db:write → OPA checkt → allow/deny
      (live: db:write → 200 done mit echter docker-exec-Ausgabe;
      shell:exec ohne Grant → 403 + Audit-Row; Fundstellen: Policy
      `internal/policy/capabilities.go:74` +
      `policies/capabilities.rego`, Gate
      `internal/subagents/toolcalls.go:74`)
- [x] critical-Capability → pausiert bis Operator-Confirm
      (live: admin:* → 202 guarded → GET /api/subagents/guarded →
      approve → exec → done; Doppel-Approve → 409; Queue IST die
      persistente subagent_tool_calls-Tabelle, Restart-getestet)
- [x] SSE-Stream liefert Status-Events
      (live: status/spawn/running/tool-call/done + `end`, Replay nach
      Restart, Monitor-`done` nach der 45-s-Task mit exit 0; Fundstelle:
      `internal/subagents/subagents.go:270` handleEvents + hub.go)

Offen (dokumentiert im Sprint-File): Frontend-Tile/Approval-Panel →
TASK-062; container-authentifizierter Tool-Call-Pfad (auth.go-Gate-Branch);
Intent-Check (R40-Follow-up); DSH-Plugin/npm-Wrapper; Remote-SSH-Spawn
live-ungetestet (kein Remote-Node in der Umgebung — Code spiegelt die
Deploy-Pipeline zeilengetreu).
