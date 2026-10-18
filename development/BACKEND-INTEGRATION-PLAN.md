# BACKEND-INTEGRATION-PLAN — Backend-Verdrahtung der 32 Stitch-Designs

| | |
|---|---|
| **Status** | Plan — **kein Code in dieser Änderung** (Design-Dokument, verifiziert am Ist-Code) |
| **Auftrag** | Für alle 32 Stitch-Designs (14 Screen-Gruppen) festlegen: welche Backend-Routen jeder Screen braucht (Ist + Fehlliste mit Response-Shapes), was prioritär fehlt, welche Datenbank-Änderungen nötig sind, wie der bestehende JiMesh-LLM-Proxy (`/v1/*`) in die App-Detail-Seite angeschlossen wird, welche Backend-„Säulen" zuerst gebaut werden müssen, damit Jules die Frontend-Mocks gegen einen fixen Vertrag verdrahten kann — und wie die Route-Struktur das React-Query-GC-Verhalten unterstützt (Operator-Beobachtung). |
| **Quellen** | `docs/MASTER-PLAN.md` §4 (25 neue Routen), `docs/COMPONENT-SCHEMA.md` §9 (13 Backend-Lücken), `docs/DESIGN-ASSET-MANAGEMENT-SPEC.md`, `docs/STITCH-DESIGN-STATUS-USERFLOWS.md`, `docs/sprints/SPRINT-1/2/3-*.md`, `docs/API_DOCS.md`; Ist-Code verifiziert: `src/backend/internal/gateway/gateway.go` (Register :185–350), `internal/ai/aihandlers.go` (:48–59), `internal/deploy/deploy.go` (:48–78), `internal/security/security.go` (:41–85), `internal/subagents/subagents.go` (:79–88), `internal/deploy/projects_ssh.go` (DeployRequest :31–154, Deploy-Response :2356–2403) |
| **Beleg-Disziplin** | Jede Ist-Aussage trägt `datei:zeile`. Fehl-/Neu-Entwürfe sind als **NEU** markiert — nichts wird als vorhanden behauptet, was nicht registriert ist („if the route is not in gateway.go, it does not exist", Agents.md). |

---

## 0. Screens, Lesart und Konventionen

### 0.1 Die 14 Screen-Gruppen (= 32 Stitch-Designs, Desktop-/Mobile-Varianten)

Die 32 Designs des Operators gruppieren sich zu 14 funktionalen Screens (Operator-Liste, hier bindend):

| # | Screen-Gruppe | Backend-Schwerpunkt |
|---|---|---|
| 1 | **SSH Target Detail** (Node-Health-Strip, Workspaces/Container, Networks, Firewall-Status, SIEM-Strip) | Hierarchie-Reads + Node-Health |
| 2 | **Workspace Detail** (Container, Secrets, Budget) | Workspace-Row + Vault-Filter + Budgets |
| 3 | **App Detail** (Interfaces, Logs, Audit) | Deployment-Wahrheit + Logs + Proxy |
| 4 | **Integrations** (Katalog, aktive Deployments, Quick Deploy, Docker-Hub-Metadaten) | Plugins + Deploy-Kontrakt |
| 5 | **App Discovery** (Network-Topology, Discovered Containers, Claim) | Discovery-Surface + Claim |
| 6 | **SIEM** (Event-Timeline, Filter) | SDK-Audit-Logs + Security-Events |
| 7 | **Firewall** (Rules-Tabelle, Provider-Status) | Router-Report-Modell |
| 8 | **Secrets Vault** (Engines, OPA-gefilterte Secrets) | Vault-CRUD + OPA-Sichtfilter |
| 9 | **Teams** (Resource Bindings, OPA) | Team-Registry + Bindings (fehlt) |
| 10 | **User Management** (Keycloak-User) | Users + Roles |
| 11 | **Admin Settings** (API-Keys im Vault) | Settings-KV + Vault-Konvention |
| 12 | **Deployment Detail** (Pipeline-Steps, Live-Logs) | Deploy-Kontrakt + Log-Persistenz (fehlt) |
| 13 | **Container Logs** (SSE-Stream, Time-Range) | **NEU** SSE-Route |
| 14 | **Project Overview** (IaC-Files, Deployment-Code) | **NEU** iac_files-Surface |

### 0.2 Konventionen (bindend für jede Umsetzung)

- **Legende:** ✅ existiert (Register-Stelle zitiert) · 🔧 erweitern (bestehender Pfad + Feld) · ❌ fehlt (**NEU**).
- Neue Routen folgen dem **Register-Muster** (handler in der Domänen-Datei, `mux.HandleFunc` in der `Register`-Funktion), brauchen den **API_DOCS.md-Eintrag im selben Change** (Agents.md-Doku-Pflicht) und die **Admin-Mutation-Politik**: POST/PUT/DELETE laufen durch `policy.IsAdminMutation` → OPA, GETs sind session-lesbar (Policy-Muster, internal/policy).
- **No-Mock-Mandat (MANDATES.md):** keine Route darf vortäuschen. Mocks gibt es ausschließlich im FE-Entwicklungszweig gegen die in §1 eingefrorenen Shapes (siehe §5).
- **SSE-Muster** existiert im Backend 6× — verbindlich als Vorlage für alle neuen Streams: `subagents/{id}/events` (subagents.go:295–337: Content-Type text/event-stream, Status-Replay vor dem Live-Abonnement, 30-s-`: ping`-Heartbeat, ehrliches `end`-Event bei Terminal-Zustand), `discovery/events` (discovery.go:49+), `traffic/stream` (traffic_inspector.go:152), `agents/logs/stream` (agentlog.go:64), `bridge/stream` (bridge.go:381), `jules/events` (jules.go:249).
- **Doku-Synchronisation:** jede neue Route referenziert MASTER-PLAN §4 statt ihn neu zu erfinden; Abweichungen werden im Sprint-File vermerkt.

### 0.3 Detail-Route-Struktur (Vorschlag, bindend für §6)

Die Stitch-Screens werden als **eigene Routes** umgesetzt — nicht als Modal über einer Liste und nicht als eine `DetailPage` mit Switch-Case (beides zerstört den GC-Vorteil, §6). Namensschema konsistent zur bestehenden FE-Navigation (`/workspaces` als IA-Wurzel, PLUGINS-Spec §8.2):

| Route | Screen | QueryKey-Wurzel (§6) |
|---|---|---|
| `/workspaces` | Hierarchy-Liste (Sidebar-Ziel) | `['tree']` |
| `/workspaces/targets/:targetId` | SSH Target Detail | `['target', targetId]` |
| `/workspaces/targets/:targetId/workspaces/:wsId` | Workspace Detail | `['workspace', wsId]` |
| `/workspaces/targets/:targetId/projects/:projectId` | Project Overview | `['project', projectId]` |
| `/workspaces/targets/:targetId/projects/:projectId/apps/:appId` | App Detail | `['app', appId]` |
| `/workspaces/apps/:appId/integrations` | Integrations-Tab | `['app', appId, 'integrations']` |
| `/workspaces/apps/:appId/logs` | Container Logs | SSE (nicht im Query-Cache, §6.2-6) |
| `/workspaces/deployments/:depId` | Deployment Detail | `['deployment', depId]` |
| `/workspaces/iac/:fileId` | IaC-File-Detail | `['iac-file', fileId]` |
| `/discovery`, `/siem`, `/security/firewall-rules`, `/security/secrets`, `/vault-dashboard`, `/admin/teams`, `/admin/users`, `/admin/settings`, `/overview` | Querschnitts-Screens | `['discovery']`, `['siem']`, ... |

Bestehende FE-Routen bleiben, wo sie sind (z. B. `/projects` → redirect `/workspaces`); die Tabelle ist das **Ziel-Bild** der Detail-Ebenen, nicht ein Rename-Auftrag.

---

## 1. API-CONTRACT je Screen

Jeder Abschnitt listet: (a) die Routen, die der Screen **heute** konsumiert (✅, mit Ist-Shape), (b) die Routen, die **fehlen** (❌ **NEU**, mit verbindlichem Response-Shape = „Contract-Freeze" für die Jules-Mocks, §5).

### 1.1 SSH Target Detail

**Zweck:** Ein SSH-Target als eigene Page mit Node-Health-Strip (CPU/RAM/Disk/Load), den Workspaces/Projects darunter, Netz-, Firewall- und SIEM-Streifen (Stitch-Prompts #1/#2, STITCH-STATUS §4.2).

| Status | Route | Response-Shape / Bemerkung |
|---|---|---|
| ✅ | `GET /api/settings/ssh_endpoints` | Settings-KV (gateway.go:278) → `{targets: [{id, host, port, user, hasGvisor, …}]}` — Store-Feed store.tsx:61–69 |
| ❌ **NEU** | `GET /api/hierarchy` | **Geister-Route, gelöscht 20.9. (GHOST-AUDIT B.2, Commit af9dc75):** nie konsumiert (0 Frontend-/Deploy-/Doku-Referenzen), Response fabriziert Bindings (SSHTargets immer leer, `WorkspaceID = p.ID` als "Default binding", App-Port hardcoded 8080) — dokumentiert wäre Erfundenes als Fakt (Mandat 2). Echte Sidebar-Feeds heute: `GET /api/workspaces` (unten) + `GET /api/settings/ssh_endpoints` (oben). Ein ehrlicher Hierarchy-Endpoint gehört als ❌ NEU mit Contract-Freeze in diesen Plan, sobald der SSH-Target-Detail-Screen gebaut wird |
| ✅ | `GET /api/workspaces` | Rows mit `project_id, container_id, session_id, ssh_target, worktree_path, status` (workspaces.go:53–64) |
| ✅ | `GET /api/projects`, `GET /api/deployments` | `{deployments: [...]}` verbatim (deploy.go:84–98) |
| ✅ | `GET /api/firewall/status?project_id=` | Router-Report-Modell (firewall.go:70–116): `{capabilities, rules, enforcement, projectId, hostname, reportedAt, receivedAt, stale, routerSeen}`; **ehrlicher Empty-State** ohne Router: `{capabilities:{available:false, error:"no jimesh-router node has reported yet…"}, rules:[], stale:true, routerSeen:false}` |
| ✅ | `GET /api/sdk/logs?type=audit` | SIEM-Strip-Feed (sdklogs.go:66; Store siemEvents store.tsx:95–99) |
| ✅ | `GET /api/networks/users|nodes|preauthkeys|policy` | Headscale-Oberfläche (networks.go:65–69); bei unset Client **ehrliche 503** (gateway.go:150–153) |
| ✅ | `GET /api/discovery` + `GET /api/discovery/events` (SSE) | `DiscoveredContainer {id, name, image, status, ports[], labels, isMcp, isAgentTool, discoveredAt}` (discovery.go:25–35) |
| ✅ | `GET /api/projects/{id}/vlan` | VLAN-Zuordnung (deploy.go:59, project_vlans) |
| ❌ **NEU** | `GET /api/nodes/health?target=<endpointId>` | **Per-Target-SSH-Probe.** `/api/nodes/health` (gateway.go:232) misst heute NUR den Gateway-Host aus /proc (nodes_health.go:13–19: „Für REMOTE ssh endpoints … ist ein SSH-Probe-Follow-up geplant"). Shape (Contract-Freeze): `{target, source: "ssh-probe"|"gateway-host", load:{l1,l5,l15}, cpuPercent, ram:{total_mb,used_mb,percent}, disk:{total_gb,used_gb,percent}, uptimeSeconds, measuredAt}`; SSH nicht erreichbar ⇒ `503 {error, target}` — nie erfundene Zahlen. Trivial, weil `network.Pool` (discovery.go:75–77 nutzt es bereits) die gepoolte SSH-Session liefert. |

### 1.2 Workspace Detail

| Status | Route | Response-Shape / Bemerkung |
|---|---|---|
| ✅ | `GET /api/workspaces`, `POST /api/workspaces` (idempotenter Ensure), `DELETE /api/workspaces/{id}?confirm=true` | TASK-037-Vertrag (gateway.go:221–231) |
| ✅ | `GET /api/projects`, `GET /api/deployments` | Container-/App-Bezug über `containers.workspace_id` (Deploy-Pfad schreibt sie, projects_ssh.go:2192–2197) |
| ✅ | `GET /api/vault/secrets?project_id=` | `{secrets: [{id, name, projectId, workspaceId, hasValue, allowedAgents, createdAt, updatedAt}]}` (vault.go:23–34; Werte werden nie serialisiert, :29) |
| ✅ | `GET /api/secrets-engines` | Engine-Registry mit `scope_kind`/`scope_id`/`is_default` (secrets_engines.go:58–62, DDL :49–59) |
| ✅ | `GET /api/budgets` | `ProjectBudget {projectId, userId, role, maxBudgetUSD, spentBudgetUSD, enabled}` (security.go:74–75) |
| ✅ | `GET /api/sessions`, `GET /api/subagents?workspace=<wsId>` | Session-/Subagent-Feed (gateway.go:206, subagents.go:91–99) |
| ❌ **NEU** | — | Keine neue Route nötig; fehlen nur die **Deployment-Interfaces-Spalten** (§3.6) und der OPA-Secrets-Filter (§1.8). |

<!-- APPEND2 -->
