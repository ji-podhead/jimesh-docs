# HANDOFF — nächste Claude-Session (9.9.2026, nach der Operator-Runde 8.9.)

> **STATUS-UPDATE (8.9. abends):** TASK-029/030/031 sind erledigt und in main
> (a63ec77, 3246297+4c173b2, e055908+6ff2d5e). Worktrees aufgeräumt — nur
> docs-restructure (ungemergt, wartet auf Review/Merge) und
> task-architecture-docs (nicht in main) bleiben. Sessions-Management,
> Login-Throttle, /api/sse/*, Premium, gRPC-Ehrlichkeit, Embeddings-CRUD
> und die 4 gemeldeten React-Bugs sind ALLE erledigt und live verifiziert.
> Rest: Operator-Entscheidungen (unten) + Sprint-28-WP0-Spike.

**Stand main:** `871aeb1` (origin/main — ALLES committet und gepusht).
**Parallele uncommittete Dateien in main's Working-Tree** (Brand-Session
jimesh-92): README.md, docs/README.md, docs/backlog/BACKLOG.md,
docs/research/R19-…, repo-assets/brand/* (README/hero.html), 
src/backend/internal/ai/entropy_cascade.go, untracked articles/brand-Ordner.
**NICHT anfassen, keine Stashes** — sie gehören der anderen Session.

## Worktree-Lage (beraumt am 8.9.)

| Worktree / Branch | Zustand | Aktion |
|---|---|---|
| `task-025-user-entity` | ✅ gemergt | kann entfernt werden |
| `task-026-auth-contract` | ✅ gemergt | kann entfernt werden |
| `task-027-consumer-keys-ui` | ✅ gemergt | kann entfernt werden |
| `task-028-dashboard-ia` | ✅ gemergt | kann entfernt werden |
| `../jimesh-worktrees/docs-restructure` (docs/restructure) | ⚠️ NICHT gemergt — 145 Dateien umsortiert, wartet bewusst auf die Brand-Session (massiver Docs-Move kollidiert mit uncommitteten Brand/README-Dateien) | nach Brand-Session-Commit mergen, dann verwaiste Links fixen |
| `../jimesh-worktrees/task-011-deploy-wiring` | alt/merged | prüfen + entfernen |
| `task/013-frontend-exposure`, `task/018-apidocs`, `task-architecture-docs`, `task/019-wire-egress-socketguard`, `task/020-apidocs-remaining` | alt/merged oder verworfen | prüfen + entfernen |

## Offene Tasks für die nächste Session (Specs liegen in docs/tasks/)

1. **TASK-029** — Frontend: Bugfix-Runde (4 gemeldete React-Bugs!) + tote
   Seiten verdrahten (Logs-SSE, Orphans, Traffic) + Security-IA-Hierarchie
   (Selector Project→Endpoint→App→Port, "No Project"-Ordner,
   Deployments-Detail mit App/noVNC/VSCode-Ports). Worktree:
   `worktree-task-029-frontend-security-ia`.
2. **TASK-030** — Deploy-Frameworks erweitern (opencode + claude-code +
   gemini-cli), Shell-Tag für Shell-Apps (VNC oder SSH-Shell), noVNC/VSCode
   loopback-only binden (Sprint 20 WP5-Rest), Ports→Projekt-Zuweisung
   Backend. Worktree: `worktree-task-030-frameworks-vnc-ports`.
3. **TASK-031** — Backend: /api/embeddings* CRUD + usage echt bauen
   (Vorbild: /api/media/*). Worktree: `worktree-task-031-embeddings-crud`.

Reihenfolge: TASK-029 und TASK-030 parallel (verschiedene Dateibereiche);
TASK-031 zuerst bauen, dann TASK-029s Embeddings-Teil. Alle folgen
WORKTREE-PROTOCOL.md (eigener Branch, committen ja, push/merge nein —
die Session berichtet, ich merge+reviewe).

## Operator-Entscheidungen, die noch offen sind (nicht selbst entscheiden!)

- **Sprint 28 (eBPF-LSM Kernel-SAST):** E-S1 (sync-enforcement-Variante),
  E-S2 (cilium/ebpf vs Tetragon vs ebpfguard), E-S3 (daemon fail-closed?),
  Tendenz dokumentiert in SPRINT-28-…md:198+. WP0 = Feasibility-Spike
  (`lsm=bpf` am Host prüfen) kann OHNE Entscheidungen laufen.
- **Sprint 29 (Katana/nuclei DAST-Gate):** E-D1 (Scanner-Stack), E-D2
  (Scanner-crash fail-closed `held`?) offen; Quarantäne-Gate-State-Machine
  im deploy engine geplant, kein Code.
- **SIEM:** NIRGENDS geplant — neu. Tendenz (Operator-Runde): minimaler
  v1-SIEM-Pfad = security_events-Retention + Suche + Threat-Detections-
  Sidebar (TASK-029 C. baut die Sidebar-UI vor) statt eine ganze SIEM-
  Plattform; oder dedizierter Sprint. Wartet auf Operator.
- **R25-Kernfakten:** gVisor kann NICHT synchron blocken (observe-only),
  echtes Kernel-Enforcement braucht Host mit BPF-LSM oder KVM/Kata-guest
  — Endscheidung T1-hooks-Fallback vs T2-Async-Remediation liegt in E-S1.

## Was heute (8.9.) landete (Kurzprotokoll)

- Budget-Charging real (LLM-Kosten buchen auf project_user_budgets),
- User-Entität + Keycloak first-login provisioning (TASK-025),
- AUTH-CONTRACT.md (TASK-026), Consumer-Keys Backend+Frontend (WP7),
- RBAC-Enforcement OPA/Rego + Keycloak realm-roles (WP4),
- Dashboard-IA 4 Tabs + /admin-Konsole (TASK-028),
- Egress-Akzeptanz-Test + Render-family-Produktionsbug-Fix (WP5),
- Session-Management + Login-Throttle + /api/sse/* + ehrliches Premium/gRPC.

**Regel-Erinnerung:** MANDATES.md lesen (no-mock, persistence, verification,
docs-Mandat: jede Route in API_DOCS, Sprint/BACKLOG spiegeln, Worktree-Tool).
Hunk-Weises Stagen verwenden, wenn docs/ von der Parallel-Session dirty sind
(BACKLOG.md, README.md — häufig).
