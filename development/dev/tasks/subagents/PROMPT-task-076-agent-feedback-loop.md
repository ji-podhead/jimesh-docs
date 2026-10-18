# TASK-076 — Agent-Feedback-Loop: SIEM/Wazuh-Criticals in die verantwortliche Coding-Session injizieren

**Status:** ✅ umgesetzt & live verifiziert (14.9.2026) — Worktree `task/076-agent-feedback-loop` (`../jimesh-worktrees/task-076-agent-feedback-loop`), Details in SPRINT-38-SUBAGENT-SPAWN.md (Abschnitt TASK-076) | **Quelle:** Operator 14.9. („wenn wir code änderungen oder änderungen am system durch coding agents zuweisen können und plötzlich wazuh errors haben, das wir das direkt dem coding agent injecten das er scheisse gebaut hat, sonst muss er ja selber ständig in die logs schauen")

## Fundstellen
- internal/subagents/ (TASK-061: Spawn + SSE + GUARDED)
- internal/store/subagents.go (Subagent-Session + Workspace-Bindung)
- internal/siem/bridge.go (TASK-054: Falco/Wazuh-Funde landen als security_events)
- TASK-032-Logger-SDK (X-JiMesh-Header, Workspace-Attribution)

## Aufgabe
- Bei security_events row mit severity=critical + resolvable workspace_id/project_id:
  - Look up ob dieser Workspace eine aktive Coding-Session hat (workspace-level "primary session ID" — prüfe ob das existiert oder neu ergänzen)
  - Push structured system message auf die Session-SSE (TASK-061-Event-Stream wiederverwenden, KEINEN parallelen bauen)
  - Content: scanner, rule, severity (nie raw payloads — K-LAF-Redaction)
- Open design question FLAGGEN (nicht still entscheiden): soll der Agent dann ANDERE Sessions callen können zum Investigieren? Wenn out of scope: als dokumentierten Next-Step markieren statt half-bauen

- GIT: explizite Pfade, kein -A, NICHT pushen

## Ergebnis (14.9.2026)

- **Korrektur der Fundstelle (ehrlich):** Wazuh/Falco-Funde landen NICHT in
  security_events — die Bridge (eigener Prozess, cmd/siem-bridge) shipped
  via POST /api/sdk/logs in sdk_logs (type=audit, level=ERROR=critical per
  SPRINT-32-Mapping, workspace server-seitig vom Service-Key); Checkov
  (IaC-Gate) schreibt parallel security_events (ohne workspace-Spalte) UND
  dieselbe sdk_logs-Fläche. Der gemeinsame Nenner aller drei Scanner ist
  der InsertSDKLog-Store-Write → DORT sitzt der Hook.
- **Trigger:** `store.ObserveAuditCritical` (internal/store/sdk_logs.go) —
  post-write, eigene Goroutine, nur type=audit ∧ level=ERROR; Ingest
  blockiert nie. internal/siem unangetastet (die Bridge kann den
  In-Memory-Hub ohnehin nie erreichen).
- **Bindung:** subagents-Tabelle IST die Workspace→Session-Bindung (kein
  neues primary_session_id-Feld); Injektion in JEDE aktive
  (spawning|running) Subagent-Session des Workspaces.
- **Injektion:** internal/subagents/feedback.go — Notice
  {scanner, rule, severity, workspaceId, projectId, sourceSessionId,
  logId, message, advice} via `hub.Emit(§, "security-critical", …)` auf
  dem TASK-061-Hub; K-LAF E3: max. EIN Identitäts-Feld aus dem Payload
  (rule_id/rule/check_id), keine raw payloads.
- **Live verifiziert:** eigener Gateway vom Worktree gegen Throwaway-DB,
  echter busybox-Subagent-Spawn, Critical-Inject über die echte
  /api/sdk/logs-Ingest-Fläche → SSE zeigt `event: security-critical`
  (scanner=wazuh rule=100002; zweiter Fall checkov/CKV_DOCKER_3);
  Negativ-Kontrollen (INFO, fremder Alias, ohne Workspace) injizieren
  nicht. Fixtures komplett aufgeräumt (Container weg, DB gedroppt).
- **Geflaggte Design-Frage (nicht still entschieden):** Multi-Agent-
  Investigation — darf ein benachrichtigter Agent andere Sessions callen
  zum Untersuchen? Out of scope; als Next-Step in SPRINT-38 dokumentiert.
