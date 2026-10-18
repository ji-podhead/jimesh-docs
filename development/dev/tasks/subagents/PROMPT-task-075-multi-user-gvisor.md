# ⛔ RETIRED — ERSETZT DURCH TASK-079 (Identity-based Router Proxying)./# Die "gVisor hilft bei Ports"-Annahme war FALSCH (Docker-Netns gibt jedem Container/# seinen eigenen Port-Space egal welche Runtime; gVisor = nur Syscall-Isolation).

**Status:** 🔲 offen | **Quelle:** Operator 14.9. + gVisor-MAGI-Blog (April 2026): „You do NOT need to simulate a second kernel manually — every runsc container gets its own independent userspace kernel reimplementation automatically. Two users containers on the same host are ALREADY kernel-isolated. The real problem is purely a PORT-ALLOCATION problem."

## Fundstellen
- internal/deploy/exec_sandbox.go + node_provision.go (gVisor-Wiring existiert)
- cmd/jimesh-router/firewall.go (TASK-050: per-Alias Inbound-Port-Management, real+merged)
- internal/deploy/workspaces.go (TASK-037: Worktree-Isolation, per-User-Branch)
- internal/store/workspaces.go (Tabelle + CRUD)

## Aufgabe
1. „Clone Workspace for another User"-Flow: WorkspacesPage-Create-Dialog + Backend (check TASK-037 ob Clone-Concept existiert oder ob es neu ist)
2. Clone: Auto-Detect freie Host-Ports (reuse network.ParsePorts oder equivalentes Port-Scan-Code), neues Port-Mapping mit dem Router (extend firewall.go alias-grant)
3. Verify: 2 Workspaces vom selben Projekt, beide „Port 3000" intern → DIFFERENTE Host-Ports → beide über Router erreichbar ohne Kollision
4. Ports-Section in Workspace und App-Views (echte allocated Host-Ports je App)

- GIT: explizite Pfade, kein -A, NICHT pushen
