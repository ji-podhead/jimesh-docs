# SPRINT-7 — GHOST-ROUTE-CLEANUP P2 (14 Backend-Geister-Routen, GHOST-AUDIT B.2)

> Worktree: `/tmp/wt-p2`, Branch `wt-p2-ghost-routes` (Basis: main @ 808bacc).
> Auftrag: `docs/GHOST-CODE-AUDIT-2026-09-20.md` Abschnitt B — je Route ehrliches
> Urteil: (a) legitime Operator-/API-Fläche → aus HANDLER-CODE in API_DOCS.md
> dokumentieren + behalten, (b) tot/ersetzt → Registrierung + Handler löschen
> (vorher Referenz-grep). **Mandat 14: keine Route bleibt undokumentiert+unbenutzt.**

## Urteils-Tabelle (14 Routen + Sonderfall /api/sdk/logs)

| # | Route (Registrierung) | Urteil | Beweis (Kurz) |
|---|---|---|---|
| 1 | POST `/api/projects/{id}/ports/assign` (security/security.go:76) | **BEHALTEN — bereits dokumentiert** | API_DOCS.md:684 (Body, Fehlercodes, Response vollständig); Handler echt (security/exposure.go:693), persistiert Settings-Keys, deren einziger LEBENDER Leser resolvePortProject (exposure.go:659-675, GET /api/security/exposure) ist. Audit-Behauptung "undokumentiert" = Extraktionsfehler. |
| 2 | GET `/api/hierarchy` (gateway/gateway.go:193) | **GELÖSCHT** (Commit af9dc75) | 0 Referenzen Repo-weit (kein Frontend-Literal, kein Deploy/SDK, kein API_DOCS); Handler fabriziert: SSHTargets bleibt IMMER leer (hierarchy.go:29), Project.WorkspaceID=p.ID "Default binding" (:43), App.Port hardcoded 8080 (:68) — dokumentieren hieße Erfundenes als Fakt dokumentieren (Mandat-2-Verstoß). Ersetzt durch TASK-037: GET /api/workspaces + /api/settings/ssh_endpoints. Mitgelöscht: gateway/hierarchy.go + schema/hierarchy.go (Typen NUR dort referenziert). FE-Typ-Mirror types/domain/hierarchy.ts BLEIBT (live importiert: HierarchySidebar.tsx:8-9, store.tsx:19-20, AppDetailPage.tsx:24, app-icons.ts:10, team-bindings-panel.tsx:7). BACKEND-INTEGRATION-PLAN.md:75 ("✅ Sidebar-Feed") war veraltet → Zeile ehrlich auf ❌ NEU umgestellt. |
| 3 | GET/POST `/api/settings/provider-credentials` (gateway.go:194) | **GELÖSCHT** (Commit af9dc75) | 0 Referenzen; Handler speichert OAuth Access-/Refresh-Tokens als Klartext-JSON in der settings-Tabelle (provider_credentials.go:20,52) — gegen das Vault-Mandat; ersetzt durch /api/vault/* (R16) + Secrets-Engines (TASK-065). Mitgelöscht: gateway/provider_credentials.go + schema/provider_credentials.go + FE-Orphan-Typ types/domain/provider_credentials.ts (Audit C.1, 0 Importer). |
| 4 | GET `/api/plugins/jules/sources` (gateway.go:240) | **BEHALTEN + DOKUMENTIERT** | KEIN Geist im strengen Sinn: Consumer = MCP-Tool `list_jules_sources` (internal/mcpserver/tools_jules.go:23 → cmd/jimesh-mcp); Geschwister-Routen sind Dashboard-Consumer (JulesSessionsWidget.tsx:33,44; jules-events.ts:30). Echter Jules-Proxy mit ehrlichem Empty-State ohne Key (jules.go:86-104). Neu: API_DOCS-Sektion "Plugins — Jules integration" mit der ganzen Familie. |
| 5 | POST `/api/projects/task/start` (deploy/deploy.go:61) | **BEHALTEN — bereits dokumentiert** | API_DOCS.md:1099-1114 (vollständige HITL-Worktree-Spec); echter SSH+git-Code (workspace_integrity.go:755), Unit-Tests workspace_integrity_test.go:381,518; Deploy-Wiring `taskId` konsumiert den Task-Worktree-Zustand (projects_ssh.go:127,1299,2274). |
| 6 | GET `/api/projects/task/status` (deploy.go:62) | **BEHALTEN — bereits dokumentiert** | API_DOCS.md:1120-1127 (Live-Messung aus git, -1 statt Fabrikation); workspace_integrity.go:779. |
| 7 | POST `/api/projects/task/apply` (deploy.go:63) | **BEHALTEN — bereits dokumentiert** | API_DOCS.md:1128-1138 (HITL-Merge-Gate VOR jeder Ausführung, 409-Konfliktmodell); workspace_integrity.go:813. |
| 8 | POST `/api/projects/task/discard` (deploy.go:64) | **BEHALTEN — bereits dokumentiert** | API_DOCS.md:1139-1146 (Confirm-Rail, Snapshot-Branch bleibt Audit-Trail); workspace_integrity.go:844. |
| 9 | GET `/api/projects/{id}/monitoring` (deploy.go:69) | **BEHALTEN — bereits dokumentiert** | API_DOCS.md:688 (SSE-Metriken über SSH: free/df/top/docker stats); tunnel.go:175-247. |
| 10 | GET/PUT/DELETE `/api/projects/{id}/deployments/{depId}` (deploy.go:73) | **BEHALTEN — bereits dokumentiert** | API_DOCS.md:496-498 (drei Zeilen GET/PUT/DELETE); echter Store-CRUD (deployments.go:56-101); Geschwister live: Liste WorkspaceDeploymentsPage.tsx:103, Redeploy :111. |
| 11 | GET `/api/auth/sessions` (auth/auth.go:181) | **BEHALTEN + DOKUMENTIERT** | Echte Session-Verwaltung (auth.go:1150-1184): Hash-IDs, current-Flag, Neueste-zuerst. Neu: API_DOCS "Auth & Sessions". Audit-Empfehlung ("als Operator-API dokumentierenswert") gefolgt. |
| 12 | POST `/api/auth/sessions/revoke` (auth.go:182) | **BEHALTEN + DOKUMENTIERT** | auth.go:1187-1216: Self-Revoke verweigert (→ /api/auth/logout), 404 unbekannt. |
| 13 | POST `/api/auth/sessions/refresh` (auth.go:183) | **BEHALTEN + DOKUMENTIERT** | auth.go:1221-1238: Rolling-Refresh um dashboardLoginTTL (24h) — ohne ihn stirbt ein aktiver Operator-Tab exakt bei 24h. |
| 14 | GET `/api/agents/analytics/summary` (analytics/analytics.go:42) | **BEHALTEN + DOKUMENTIERT** | Echte Aggregation (agentlog.go:153; ComputeAgentAnalytics service/agents.go:143; gRPC-Zwilling cmd/server/grpc_sprint67.go:309); service.go:1717 nennt die Route als kanonische Free/Paid-Split-Fläche. Neu: API_DOCS §6-Tabelle + Agent-Types-Bullet. Ehrlich dokumentiert: nur session_id/agent_type_id sind implementiert. |
| — | **/api/sdk/logs-Doppelregistrierung** (Gateway sdklogs.go:67 + Edge-Router ingest_http.go:53) | **ABGRENZUNG DOKUMENTIERT, nichts gelöscht** | Bewusst (TASK-058): Gateway = zentraler Ingest (POST) + Query (GET) mit server-seitiger Attribution; Edge-Router = POST-only auf 127.0.0.1:3100, lokale SHA-256-Key-Validierung, 202 + at-least-once (Journal VOR 202, async Forward an die Zentrale mit DEM Router-Key). Router-Fläche dokumentiert in cmd/jimesh-router/README.md (bleibt dort beheimatet), Abgrenzungs-Blockquote jetzt auch in API_DOCS SDK-Sektion. |

## Korrektur des Audits (ehrlich festgehalten)

Die Audit-Kernzahl "14 echte Geister-Routen, ALLE zugleich API_DOCS-Lücken = 14 Bugs" ist
ein **Extraktionsfehler des Audit-Skripts**: `git diff 463ee6f..main -- docs/API_DOCS.md`
ist leer — die Doku-Abschnitte existierten schon zur Audit-Basis. Real waren:

- **6× bereits dokumentiert** (Audit-Claim falsch): ports/assign (API_DOCS:684),
  monitoring (:688), task/start|status|apply|discard (:1099-1146), deployments/{depId} (:496-498).
- **6× echte Doku-Lücke** → behoben: jules/sources, auth/sessions ×3,
  agents/analytics/summary (dokumentiert) sowie hierarchy + provider-credentials
  (gelöscht statt dokumentiert — ihre Responses wären Fabrikation gewesen).
- **jules/sources ist kein Geist im strengen Sinn** (MCP-Consumer existiert).
- Die Consumer-Losigkeit (kein Dashboard-/Deploy-Aufruf) stimmt für alle 14 —
  das Urteil "dokumentieren statt löschen" folgt dem Audit-Tipp (:277) für
  Operator-Flächen; die Task-API ist KEIN Löschkandidat, da vollständig
  dokumentiert, getestet und ins Deploy-Wiring integriert.

## Work Packages

- [x] **WP1** Löschungen: gateway.go:193+194, gateway/hierarchy.go,
      gateway/provider_credentials.go, schema/hierarchy.go,
      schema/provider_credentials.go, FE-Orphan types/domain/provider_credentials.ts
      — Commit af9dc75.
- [x] **WP2** API_DOCS-Nachdokumentation aus Handler-Code: agents/analytics/summary,
      auth/sessions ×3, Jules-Familie (neue Sektion) — Commit 8479c95.
- [x] **WP3** /api/sdk/logs-Abgrenzung Gateway vs. Edge-Router (API_DOCS SDK-Sektion;
      Router unangetastet — Auftrag).
- [x] **WP4** Doku-Sync: BACKEND-INTEGRATION-PLAN.md:75 (hierarchy-Zeile ❌ NEU),
      dieses Sprint-File, Backlog-Spiegel.

## Verifikation

- `make go-build` ✓ und `make go-vet` ✓ (Host-Go /home/ji/sdk/go/bin, Auto-Toolchain
  go1.26.0; Achtung Worktree-Lage: Snap-Docker bindet /tmp NICHT — der
  Makefile-Container-Fallback ist im /tmp-Worktree unbrauchbar, host-build genutzt.)
- `tsc --noEmit -p tsconfig.app.json` A/B: 461 Fehler mit == 461 ohne die gelöschte
  Orphan-Datei — **0 neue Fehler**, nur eine Löschung (488 Zeilen Log, alle Pre-existing).
- Referenz-grep je Route vor jedem Urteil (Frontend, deploy/, SDKs, examples/jimeshctl,
  docs/, API_DOCS) — siehe Urteils-Tabelle.

## Offen / bewusst nicht hier (Sichtgrenzen, kein stilles Versprechen)

- `/api/plugins` + `/api/plugin-installations` (plugins.go:11,49) sind dokumentationslos,
  haben aber Dashboard-Consumer → nicht Teil des P2-Auftrags (Audit B.1 zählt sie zu
  den 184 Consumer-Routen). Deren Doku-Bug bleibt offen.
- Die 54 DOCS_ONLY-Routen (Audit B.4) sind außerhalb des Auftrags.
- FE-Geister (Kap. A/C: ProjectsPage, /landing, Vite-Ära …) gehören zu anderen
  Paketen (P1/P3-Parellelworktrees).
