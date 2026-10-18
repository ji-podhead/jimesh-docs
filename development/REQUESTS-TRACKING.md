# REQUESTS-TRACKING — Plan-vs-Ist-Bericht über alle User-Anfragen in den JiMesh-Session-Records

**Datum:** 20.09.2026 · **Stand des Repos:** main @ `8aa9664` (Worktree `/tmp/wt-analysis2`)
**Quelle:** `docs_dev/session.jsonl` (139.031 Zeilen, 55,9 MB, Haupt-Session 06.09.–14.09.2026) + 7 Subagent-Records unter `docs_dev/sprints/subagents/*/session.jsonl` (7.838 Zeilen, 30.08.2026, alte FreeLLMAPI/Node-Ära) · extrahiert per `python3` (JSONL-Parser, `role=='user'`, Plugin-/System-Reminder-Quellen gefiltert).

---

## 0. Methodik, Zahlenbasis und Status-Definitionen

### 0.1 Prompt-Statistik (belegt durch Extraktionsskript, `analysis/all-user-prompts.txt`, 1,4 MB)

| Kennzahl | Wert |
|---|---|
| User-Prompts gesamt extrahiert | **586** |
| davon Haupt-Session (06.09.–14.09., 8 Tage) | 576 |
| davon Operator-Task-Prompts in Subagent-Records (30.08., alte Node/FreeLLMAPI-Ära) | 10 |
| Gefiltert (System-Reminders, Runtime-Snapshots, Plugin-Quellen) | 31 (24 plugin + 7 inline) |
| **Echte, inhaltliche Anfragen** (Haupt-Session) | **331** |
| Automatische Subagent-Statusmeldungen („Background subagent …") | 209 — davon **110 failed**, 45 reported, 45 finished, 7 stopped, 2 ran-out-of-room |
| Reine Acks („ok", „ja", „hmm", …) | 23 |
| Kurz-Statusfragen („was fehlt noch?", …) | 9 |
| Automatische goal_round-Meldungen | 4 |
| Prompts > 8 KB (meist eingefügte Research-/Claude-Dumps) | 25 (Größter: 124 KB; #151 enthält eine ~80-KB-Endlos-Paste „Die Nachricht ist vollständig" ×~1.000) |

Die 331 echten Anfragen wurden zu **thematisch konsolidierten Anfrage-Items** verdichtet (Tabellen in §1, Blöcke A–J, **120 Items**), weil dieselbe Anfrage oft 3–10× in Wiederholung/Neuformulierung gestellt wurde (z. B. „starte endlich subagents" in 6 Varianten). Prompt-Referenzen verweisen auf die laufende Nummer in `analysis/all-user-prompts.txt`.

Kategorie-Heuristik über die 331 Anfragen (Keyword-Klassifikation, unscharf, nur zur Größenordnung): Feature/Beauftragung, Steering/Status, Audit/Review, Deploy/Merge/PR, Doku/Research/Export, Design, Fix/Bug-Report. Die verbindliche Zuordnung steht Item-für-Item in den Tabellen.

### 0.2 Status-Definitionen

| Status | Bedeutung |
|---|---|
| **IMPLEMENTIERT** | Mit Code-/Route-/Datei-Beweis im Repo vorhanden (Beweisspalte nennt Datei:Zeile bzw. Commit) |
| **TEILWEISE** | Kern vorhanden, dokumentierte Reste/Lücken (offene Punkte im BACKLOG oder Audit) |
| **VERZOEGERT** | Explizit geplant (BACKLOG-Eintrag), aber kein Code, Termin offen |
| **NICHT UMGESETZT** | Kein Code UND kein aktiver Plan — Anfrage verpufft oder wurde nie in Sprint/Backlog überführt |
| ERSETZT | Anfrage wurde durch eine spätere Entscheidung überholt (kein Vorwurf — die Überplanung ist dokumentiert) |
| EXTERN | Außerhalb des JiMesh-Repos erledigt (articles-, agentic-knowledge-, Portfolio-Repo) |

Repo-Referenzen für alle Beweise: `docs/backlog/BACKLOG.md` (Status-Übersicht 15.9.), `docs/sprints/SPRINT-1…6`, `docs/MASTER-PLAN.md`, `docs/HANDOFF-2026-09-20-COMPLETE.md`, `docs/WORK-SPLIT-2026-09-20.md`, `docs/AUDIT-BACKEND-SECURITY.md`, `docs/AUDIT-FRONTEND-QUALITY.md`, `docs/AUDIT-DEPLOYMENT.md` (46/46 PASS, 19.9.), `MANDATES.md` (14 Mandate), `API_DOCS.md`, `config.yml`, `Makefile`. Die alten Sprints 20–47 und Research-Dateien R1–R45 wurden am 15./16.9. aus dem Git-Tree entfernt (`2e6f919`, `f0b3d93`: „39 research files entfernt — general knowledge jetzt in ji-podhead/agentic-knowledge") und liegen nur noch unversioniert in `docs_dev/`.

**Reproduzierbarkeit:** Die Prompt-Extraktion ist als `scripts/extract-session-prompts.py` im Repo (gleiche Filterlogik wie oben). Die extrahierten Roh-Prompts (`analysis/all-user-prompts.txt`, 1,4 MB) und der Index (`analysis/prompt-index.txt`) werden bewusst **nicht committet** — konsistent mit dem Repo-eigenen Untrack-Mandat für Session-Records (24f281c, c61cfd5) und GO-PUBLIC §2; sie lassen sich mit dem Skript aus `docs_dev/` jederzeit neu erzeugen. Alle #Nrn-Referenzen in den Tabellen beziehen sich auf die laufende Nummer in dieser Extraktion.

---

## 1. Anfrage→Status→Beweis (Tabelle, konsolidiert)

### Block A — LLM-Proxy-Kern & alte FreeLLMAPI-Ära (30.08.2026)

| # | Anfrage (Ref) | Kategorie | Status | Beweis |
|---|---|---|---|---|
| A1 | Redis PubSub für echtes Realtime (#577) | Feature | IMPLEMENTIERT (neu form) | Go-Ära: Redis Streams `jimesh:events` + SSE `GET /api/traffic/stream` (gateway/security.go Routen); Mandat in CLAUDE.md „Event-Driven Learning" |
| A2 | Erweiterte Traces/Observability (#579) | Feature | IMPLEMENTIERT | `internal/oteltrace/oteltrace.go`, `/api/sdk/logs`, `cmd/jimesh-logger`; ABER: Audit F-05 — OTel-Spine hat keine Call-Sites (s. C23) |
| A3 | Tier-Schemas umbenennen/organisieren (#580) | Feature | ERSETZT | Legacy-Tier (clients/, server/, SQLite) komplett entfernt (CLAUDE.md „Removed legacy tiers"); Konzept lebt als Chains/Pools: `/v1/chains`, `ProxyChainsPage` |
| A4 | Provider-Doku mit Setup-Anleitungen, 27 Provider (#581) | Doku | NICHT UMGESETZT | Kein `PROVIDER_SETUP.md`/Quickstart im Repo; nur `.env.example` + `docs/PROVIDER-TOS.md`; alte Doku starb mit dem Legacy-Tier |
| A5 | Frontend bauen + Tier-Chains integrieren (#582) | Feature | IMPLEMENTIERT (ersetzt) | 64 Views in `src/frontend/src/views/`; Chain-Graph `ProxyChainsPage` (/proxy/chains, c367ced) |
| A6 | „Advanced Shit": Cost Calculator, Provider Health, Auto-Discovery (#583) | Feature | IMPLEMENTIERT | `gateway.go:1222/2765 discoverAndRegisterModels`; `GET /api/health/check-all`, `/api/fallback/token-usage`, `/api/premium*synch`; AnalyticsPage/CostDashboard |
| A7 | DSH-Settings-Importer + Tiers-Onboarding (#585) | Feature | ERSETZT / VERZOEGERT | Alte `/api/dsh/import` war der No-Mock-Mandatsfall (MANDATES §2), existiert nicht mehr; neues Onboarding = BACKLOG 090 „[ ] geplant" |

### Block B — Repo-Aufbau, Lizenz, Namens-Regeln (06.09.)

| # | Anfrage (Ref) | Kategorie | Status | Beweis |
|---|---|---|---|---|
| B1 | io-link/git-diff-Terminal-Rendering im Dashboard (#3, xterm/gotty #111) | Feature | NICHT UMGESETZT | Kein `xterm` in `src/frontend/package.json`; nur `ContainerLogViewer` (read-only Logs); kein interaktives Terminal |
| B2 | LLM-Firewall-Research (LiteLLM/NeMo/LLM Guard/Lakera) im Research-Folder ablegen (#4–#6) | Doku/Research | IMPLEMENTIERT → EXTERN | Research-Dateien entstanden (R-Reihe), dann per `f0b3d93` aus dem Tree in `ji-podhead/agentic-knowledge` verschoben; Umsetzung in `internal/ai/guard_hook.go` |
| B3 | Debezium: README in references + DB-Discovery/Management als Utility (#8–#9) | Feature | KORRIGIERT 20.9. → nur Rezept vorhanden | Frühere Behauptung ÜBERTROFFEN→IMPLEMENTIERT (Kern) war aufgebläht — GHOST-AUDIT D.4 (20.9.) wies Mock-Handler, Geister-Page und tote Kette nach; alle drei am 20.9. KOMPLETT entfernt (Branch `wt-p3-datalake`, SPRINT-7-GHOST-AUDIT-DATALAKE). Real verbleibend: `deploy/datalake/docker-compose.yml` (Kafka+Debezium+OpenSearch+MinIO, von keinem Deployment gestartet) sowie `internal/cdc`+`kafkabridge` (eigener Audit-Punkt D.6). Echte Integration = BACKLOG-Eintrag B3-Erbe |
| B4 | saits-Namen überall entfernen → JiMesh (#25–#26) | Fix | IMPLEMENTIERT | Repo-grep „saits": nur 2 legitime Stellen (Test-Fixture `exposure_test.go:104`, Provenance-Kommentar `auth.go:193`) |
| B5 | Dual-Lizenz: Free non-commercial + Commercial, auf Englisch, im eigenen Folder (#27–#31) | Doku | IMPLEMENTIERT | `LICENSE.md` (EN) + `docs/legal/` (LICENSE-COMMERCIAL.md); README erwähnt sie |
| B6 | Shader/Logo-Design für Gemini-Session (#32–#33, #395) | Design | TEILWEISE | `docs/LOGO-LISTE.md` + `favicon.svg` + 483 Icons (`docs/ICON-REGISTRY.md`); ein eigenes JiMesh-Wortmarken-Logo-Asset fehlt weiterhin (Operator-Bezug #395: „unser logo fehlt auch noch") |
| B7 | TASK-001–006: saits-Cloud-Reuse-Review + Sprints dafür (#38–#46, #81) | Audit/Doku | IMPLEMENTIERT | R20-Review + 6 Task-Files; daraus SPRINT-22/23 angelegt; Umsetzung der Funde: RBAC/OPA-Kette (s. C-Block) |
| B8 | „Mach Sprints und Tasks für alles" (Epic 17/18 in Sprints überführen, #91/#83) | Doku | TEILWEISE | Epic 17 (Dashboard-IA/RBAC) → umgesetzt (Sprints 4, 22); **Epic 18 (Skills-Hub/Skill-Security/Memory, SPRINT-23) nie begonnen** — 0 Code (s. §2) |

### Block C — Identität, RBAC, OAuth/Keycloak (06.–14.09.)

| # | Anfrage (Ref) | Kategorie | Status | Beweis |
|---|---|---|---|---|
| C1 | Auth-Framework/OAuth2/OIDC-Anbindung („Task 8 mergen", #82–#90) | Feature | IMPLEMENTIERT | `internal/auth/keycloak_oidc.go` (JWT/JWKS), `deploy/keycloak/` (+ jimesh-realm.json); Entscheidung E-IdP: Keycloak (`0e5e797`); E8-Entscheidung dokumentiert |
| C2 | Keycloak über Config/Env konfigurierbar, realm-import (#94–#96, #99) | Feature | IMPLEMENTIERT | Realm-JSON mit `${VAR}`-Platzhaltern (49115a1), `.env.example:66-84`, `deploy/keycloak/defaults.yml` |
| C3 | Google+GitHub als Keycloak-IdPs (TASK-073, #372/#418) | Feature | IMPLEMENTIERT (Konfig) | `.env.example` GOOGLE/GITHUB_CLIENT_ID; Realm-IdPs + Redirect-Kette live verifiziert (49115a1+fc3da0c); offen: echte OAuth-Creds = OP-02 (Operator-Blocker) |
| C4 | Supabase/Firebase-OAuth, Auswahl OAuth-vs-Keycloak beim ersten Start, Masterpasswort änderbar (#483–#487, #530) | Feature | NICHT UMGESETZT | Kein Supabase/Firebase-Code im Backend (grep leer); kein erster-Start-Auth-Wizard; OP-03 Keycloak-Admin-PW offen |
| C5 | Login mit derselben E-Mail via Keycloak am JiMesh-Login-Screen (#104) | Feature | IMPLEMENTIERT | OIDC-Login-Loop-Fixes (0812000, 5eaa026), Admin-Create-User-Dialog mit echtem `POST /api/users` → Keycloak (caccb6c) |
| C6 | RBAC-Kette aus saits-cloud als Vorlage (#42–#43, #83) | Feature | IMPLEMENTIERT | `gateway/project_roles.go` + `policy/project_gate.go` (SPRINT-47), `policies/capabilities.rego`, Rollen-Picker (TASK-056, 738eb06) |
| C7 | Generalisiertes Capability-Schema für eigene Domänen + Service Accounts (TASK-070, #326/#382) | Feature | TEILWEISE | capabilities.rego 6 Domänen × Aktionen, `GET /api/capabilities`, AdminCapabilitiesPage (7497f1b, live 403-Beweise); offen: Enforcement-Toggles je /api-Fläche + consumer_keys-Capability-Spalte (BACKLOG 070-Rest) |
| C8 | RBAC bereits im Create-Flow (TASK-072, #379) | Feature | IMPLEMENTIERT | create-access-section + `POST /api/budgets` (51bdb68); SSH-Endpoint-Create-Dialog noch offen (BACKLOG) |
| C9 | Teams mit Ressourcen-Bindings/Vererbung (#162, #478) | Feature | IMPLEMENTIERT | `gateway/team_bindings.go`, `team_resource_bindings`-Tabelle + Tests (4d952c1), TeamsPage Resource-Bindings-Tab (caccb6c) |
| C10 | Service Accounts für Deployments — „Agenten halten nie Keys" (#124–#125) | Feature | TEILWEISE | consumer_keys kind=service, `ServiceKeyByWorkspace`, Provisioning-Identität; offen: Vault-JIT für `credentials_ref` (BACKLOG 048-Rest) |
| C11 | Multi-User auf gleichem Server + Router-Port-Allokation pro geklontem Workspace (TASK-075, #327/#330) | Feature | VERZOEGERT | BACKLOG listet 075 nicht als erledigt; Workspaces-per-Owner (037) existiert, aber Klon-Flow + „next free port"-Allokation des Routers fehlen |
| C12 | Cross-Server-RBAC-Frontend (#459 im Claude-Log, „kein frontend für cross server rbac") | Fix | IMPLEMENTIERT | WorkspacesPage (RBAC-Frontend-Agent, 693 Z., 15.9. gemerged), AdminLayout/AdminUsers/AdminBudgets |

### Block D — Netzwerk, Firewall, SIEM, WAF (11.–14.09.)

| # | Anfrage (Ref) | Kategorie | Status | Beweis |
|---|---|---|---|---|
| D1 | Headscale-Implementierung + Networking-Tab (#110) | Feature | IMPLEMENTIERT | `internal/network/headscale.go`, `gateway/networks.go` (/api/networks/users|nodes|preauthkeys|policy, TASK-078, b8bde4a), `deploy/cp/headscale*` (5 Ordner), NetworksPage 1.107 Z. (headplane-Port, MIT verifiziert); live 503-honest ohne HEADSCALE_URL |
| D2 | Mesh-Routing-Research (Nebula/Tailscale/NetBird/Octelium/OpenZiti/Cilium) + Lizenzfrage (#110/#137) | Doku/Research | IMPLEMENTIERT (Doku) → Entscheidung | R34-Recherche; Wahl: Headscale (BSD-3, gVisor-Netstack), config.yml `headscale: true`; BGP-FRR-Idee nicht verfolgt |
| D3 | Zero-Port + SSH-Direct-Dialing (kein `-p`, iframe über Tunnel) (#110-Handoff) | Feature | IMPLEMENTIERT | `internal/network/tunnel.go`, deploy über 172.x-Dial; heute: Traefik als EINZIGER Host-Port (8090, VPN-only, `deploy/traefik/defaults.yml` „never public — standing mandate") |
| D4 | Router-Node = Security-Node, Firewall am Router (#131, #199, TASK-050) | Feature | IMPLEMENTIERT | `cmd/jimesh-router/firewall.go` (~805 Z.), `/api/firewall/status\|rules\|report\|config`, ef7b29b live-messend (granted=OPEN/deny=DROP-Matrix), nftables-Engine im Router-Prozess |
| D5 | gVisor-Netzwerk-Presets (NAT/Airgap/Host-Passthrough + rotes Warning-Badge) (#111, #122, #151) | Feature | IMPLEMENTIERT | NETWORK_PRESETS in ProjectsPage (TASK-051, ab99f24), `exec_sandbox.go` runsc + ehrlicher runc-Fallback, `deploy/ansible` GVISOR=true |
| D6 | Per-Project VLAN-Isolation (TASK-080, #500: „VLANs werden mit gVisor erstellt") | Feature | IMPLEMENTIERT | `internal/network/vlan.go` (macvlan/ipvlan, /24-Mapping, Guards, 14 Tests), `project_vlans`-Tabelle, `GET/POST/DELETE /api/projects/{id}/vlan`, NetworkEditingPage; live-Isolation gemessen (f5b0609) |
| D7 | Scanopy (OVS/VLAN-Tool) in den Router übernehmen (#113, TASK-077→078) | Feature | NICHT UMGESETZT (bewusst) | Scanopy = AGPL-3+Commercial-Dual → reference-only (BACKLOG 078-Zeile); Eigenbau-Ersatz = D6; ehrlich dokumentiert, kein Copyleft-Import |
| D8 | WAF (Coraza/Caddy-Sidecar) deployen + integrieren (#187, TASK-057, #498/#502) | Feature | IMPLEMENTIERT (Kern) | `cmd/waf-sidecar/` (Caddyfile, Coraza), 8ff3a0f+f41350e: SQLi/XSS live 403; UI-Sicht: WafMatrixPage (SPRINT-136 — die Mock-WorkspaceWAFSection wurde dabei gelöscht, Mandat 2); offen: `faced_by_waf`, Regel-Editor v2, Remote-Smoke (BACKLOG 057) |
| D9 | WAF-Matrix per exposed Port / Network Surface (TASK-082, #182) | Feature | IMPLEMENTIERT (Frontend) | `WafMatrixPage` (`/security/waf-matrix`, feat-waf-dlp/SPRINT-136): Rows=Ports aus echtem Exposure-Scan, Columns=WAF/Rate-Limit/Geo, aktiv/inaktiv ehrlich gemessen (WAF aktiv nur beim Sidecar `jimesh-waf-*`); offen: echte Rate-Limit-/Geo-Schichten existieren nicht (dokumentierte Abwesenheit), `faced_by_waf`-Persistenz (BACKLOG 057) |
| D10 | BYO-Firewall / Third-Party-Firewall-Interface (Aikido Zen) (#224, #495, #499) | Feature | VERZOEGERT | BACKLOG 094 „[ ] geplant"; `FirewallProviderSetupPage` zeigt INTERFACE-READY/PLANNED ehrlich an; `internal/security/firewall_provider.go`: nftables einzige Implementierung |
| D11 | OPNsense-Integration (eigenes Tooling des Operators, #224-Anhang) | Feature | TEILWEISE | `OpnsenseFirewallConfigPage` (91297a1, SPRINT-6) gegen echte /api/firewall/status+rules, read-only „not implemented yet"; kein OPNsense-Provider-Backend |
| D12 | Firewall-Rules-UI (Managed Inbound Rules) (#227/#228 → TASK-J4) | Feature | IMPLEMENTIERT | `FirewallRulesPage.tsx` (420 Z., bd84b25) + FirewallRulesSection in SecurityExposurePage (TASK-051/R43) gegen `GET/POST/DELETE /api/firewall/rules` |
| D13 | SIEM: Wazuh+Falco+Bridge statt „warum haben wir keine Firewall/SIEM" (#178, #181, TASK-032/054) | Feature | IMPLEMENTIERT (Kern) | `deploy/siem/` (Wazuh 4.14.7, Falco 0.41.3 + jimesh_rules.yaml, siem-bridge), `cmd/siem-bridge`, `internal/siem`; Events → `/api/sdk/logs` alias=wazuh|falco (curl-bewiesen); offen: Wazuh-Ruleset, JiMesh→Wazuh-Shipper, Operator-Bestätigung E-SIEM-1..5 (BACKLOG 032) |
| D14 | Suricata (+XDP) | Feature | VERZOEGERT | `deploy/siem/docker-compose.yml:285`: auskommentierter, ehrlicher Platzhalter; TASK-102 „[ ] geplant" |
| D15 | eBPF + K-LAF „endlich starten" (#227, #273) | Feature | IMPLEMENTIERT (Kern) | Falco live (eBPF-Kernel-Sensor) + siem-bridge; K-LAF-Architektur: `docs/K-LAF-ARCHITECTURE.md`, scanner.go; offen: Suricata-XDP v2, Regeltiefe |
| D16 | Integrierte Llama-Guard-/Prompt-Injection-Detection (#128, #138, „llm security tool") | Feature | TEILWEISE | `internal/ai/guard_hook.go` (Llama Guard via eigenes Mesh, Bandit/Budget, **default OFF**, settings-gated) + SecurityGuardDemoPage; per-Project-Guard-Policies = TASK-081 offen |
| D17 | Per-Project LLM-Guard-Regeln (#405, TASK-081) | Feature | VERZOEGERT | BACKLOG 081 „[ ] geplant (Sprint 42)" — `PUT /api/llm/policies/{project}` existiert nicht |
| D18 | SIEM-Criticals als Injektion in laufende Coding-Session (TASK-076, #327) | Feature | IMPLEMENTIERT | Berichte #387/#388 (e79fa... live verifiziert); `/api/subagents/{id}/events` (SSE) existiert |
| D19 | Subagent-Spawn + Capability-Gating + SSE-Progress + JIT-Approval (TASK-061, #317) | Feature | IMPLEMENTIERT | `/api/subagents`, `/guarded`, `/{id}/tool-calls/{id}/approve\|deny`; `SubagentApprovalQueuePage`, `ToolCallInspectorPage` (c367ced, D1+D3) |
| D20 | Agent-Config-Scanner (5 deterministische Checks, R1) | Feature | IMPLEMENTIERT | `internal/agentconfig/scanner.go` (+scanner_test), `/api/security/agent-scan`, AgentConfigScannerPage; AUDIT-BACKEND: „bestes Stück des Sprints" |
| D21 | DLP-Hook auf Tool-Call-Responses (R2) | Feature | TEILWEISE | Datei `internal/subagents/dlp_hook.go` existiert — aber AUDIT-BACKEND F-04 (high): `SetDLPEnabled` wird nie gerufen → DLP permanent OFF, „Settings-Toggle ist ein Stub"; F-06/F-07: Action-Feld tot, 0 Tests |
| D22 | Red-Team-Suite (R3, db-frei) | Feature | TEILWEISE | `internal/policy/redteam_test.go` existiert; AUDIT F-09: `testEngine` skippt bei Load-Fehler immer → „Suite läuft vacuös grün" |
| D23 | OTel-Tracing-Spine (R4) | Feature | TEILWEISE | `internal/oteltrace/oteltrace.go` existiert; AUDIT F-05 (high): `Init()`/`StartSpan` ohne Call-Sites, fileTracer schreibt nichts — „von Tracing-Spine gebaut ist außer Typen nichts funktional" |
| D24 | Checkov-IaC-Scan + Quarantine-Stage (TASK-059, #323) | Feature | IMPLEMENTIERT | Bericht #323 (f3f4d96+81c568d, live E2E); `internal/security/quarantine.go`, `internal/deploy/iac_discovery.go`, `/api/projects/{id}/iac-files/scan` |
| D25 | Vault: Zero-Trust JIT + Audit (#95) | Feature | IMPLEMENTIERT | `/api/vault/secrets\|tokens\|access\|audit`, vault_audit_log; AUDIT-F-08 (medium): Audit-Write-Fehler werden ignoriert |
| D26 | Vault-Project-Isolation (TASK-055, #246) | Feature | IMPLEMENTIERT | 29fb00b/0a3c3b0: project_id/workspace_id-Scoping + Service-Key-Read-Scope |
| D27 | Drei Vault-Oberflächen → eine (TASK-066, #325) | Fix | IMPLEMENTIERT | 1c4887a: VaultDashboardPage gewinnt, `/security/vault` → ProjectSecretsPage + Redirect; BACKLOG 066 [x] |
| D28 | Secrets-Engines-Konsolidierung + Vault-Dashboard (TASK-065) | Feature | IMPLEMENTIERT | `gateway/secrets_engines.go` (/api/secrets-engines/*, AES-GCM-256 in PG), VaultDashboardPage |
| D29 | Vault-ACL-Fix (allowed_agents enforcement, Sprint A P0) | Fix | TEILWEISE | Sprint-3 umgesetzt; AUDIT-BACKEND: „Kern solide, aber umgehbarer zweiter Pfad" + F-08 |
| D30 | Exposure-Report-Seite (WP6) | Feature | IMPLEMENTIERT | `/api/security/exposure`, SecurityExposurePage (e3dd9f9) |
| D31 | Security-Findings auf echte Feeds statt 404-Route („1000000 mal dieselbe stale Warnung", #298743) | Fix | IMPLEMENTIERT | 8ce45a0: Aggregation aus /api/sdk/logs + /api/security/events, Fingerprints, dismiss + 90-Tage-GC |
| D32 | opena2a agent-identity-management anschauen (#230) | Doku/Research | NICHT UMGESETZT | Nur Prompt #230; kein Code, kein Backlog-Eintrag — verpufft |
| D33 | Freeze/Quarantine von Containern (#4-Research „einfrieren") | Feature | IMPLEMENTIERT | `/api/security/freeze`, `/api/security/quarantine(+release)` |

### Block E — Workspaces, Deployment, Frontend-IA (12.–14.09.)

| # | Anfrage (Ref) | Kategorie | Status | Beweis |
|---|---|---|---|---|
| E1 | Workspaces-Hierarchie Project→User-Workspace→Deployments (TASK-037, #162/#215) | Feature | IMPLEMENTIERT | `store/workspaces.go`, `/api/workspaces`, b137b1e (2329+/178−, live-verifiziert) |
| E2 | Globales Rename Projects→Workspaces (#224-Handoff Sprint 34) | Feature | ERSETZT (überplant) | Neues 4-Tier-Modell Target→Workspace→Project→App (MASTER-PLAN §1.1); `/projects` → Redirect auf `/workspaces` (M5), aber ProjectsPage bleibt als Repo/Folder-Ebene (1.351 Z.) — Umbenennung wurde zur Neu-Definition |
| E3 | Operator-Datenmodell: Apps/Ports/no_parent/Hash-Lookup/erzwungene Felder (#484) | Design/Feature | TEILWEISE | `docs/COMPONENT-SCHEMA.md` (566 Z., 23 Typen) + FE-IA-SPEC als Antwort; P0-3 (Deployment-Rows+Interfaces persistieren) offen (s. E7); no_parent-Konzept nicht im Code |
| E4 | Linke hierarchische Sidebar („wie Leobot", #298014, #475) | Fix/Design | IMPLEMENTIERT | `HierarchySidebar` (TASK-J2, App.tsx:521 „LEFT hierarchy sidebar … SectionRail is GONE") + `scope-selector.tsx`; die zuvor rechts überlagerte SectionRail (TASK-074 WP4) wurde korrigiert |
| E5 | Workspace-/App-/Agent-Session-/Project-Detail-Pages (Jules Batches, JULES-TASKS.md) | Feature | IMPLEMENTIERT | WorkspaceDetail (/workspaces/ws/:id), ProjectDetail+IaC-Tab (62 Dateien), AgentSessionDetail+Proxy-Status (64 Dateien) — alle 3 Jules-Sessions gemerged (497a696) |
| E6 | Ghost-Projekte/User/Keys löschen („geisterprojekte die man nicht löschen kann", #565, TASK-071) | Fix | IMPLEMENTIERT | `DELETE /api/users/{id}`, `DELETE /api/projects/{id}` + informed Confirm (9ec7d69); OIDC-Session-RBAC-Bypass dabei gefixt; ConsumerKeysPage hatte bereits Delete |
| E7 | Deployments-Persistenz (`executeDeploy` schreibt Rows + Interfaces JSONB) | Feature | TEILWEISE | Tabelle + `INSERT INTO deployments` (`store/deployments.go:108`) + Routen (`GET /api/deployments`, 32/32 PASS laut AUDIT-DEPLOYMENT) — aber `executeDeploy` schreibt die Rows weiterhin NICHT (WORK-SPLIT P0-4 „die 13. Lücke") |
| E8 | SSH-Datei-Browser (POST /api/ssh/explore) | Feature | IMPLEMENTIERT | Route in deploy.go; FileBrowserModal/FilePathInput/FileBrowserField (HANDOFF Phase 3) |
| E9 | Container-Logs-UI | Feature | TEILWEISE | `GET /api/projects/{id}/containers/{cid}/logs`-Route + ContainerLogViewer vorhanden; WORK-SPLIT: „SSE-Backend fehlt" (P1 offen) |
| E10 | Sprachumschalter reparieren („languages komplett gemixed und der button ändert nix", #381) | Fix | IMPLEMENTIERT | `language-switcher.tsx` + App.tsx:342; 60 Locales, check:i18n grün (2.301 Keys); AUDIT-FRONTEND: Paritäts-Checker prüft nicht Code→Key-Abdeckung (F-05/F-06) |
| E11 | i18n für 60 Locales (TASK-053) | Feature | IMPLEMENTIERT (mit Fallback) | 62a5f04 (60 Locales); 58 davon tragen ehrlichen English-Fallback (dokumentiert) |
| E12 | Frontend-Port klären (3010-Konflikt, „WARUM GIBT ES KEINEN PORT", #73–#74, #100/#103) | Fix | IMPLEMENTIERT (neu) | Heute: Traefik-Gateway 8090 VPN-only (deploy/traefik/defaults.yml), Dev über 19090/19091; `docs/DEPLOYMENT-URLS-2026-09-19.md` |
| E13 | SDK-Logs-UI + Filter (TASK-051) | Feature | IMPLEMENTIERT | `SDKLogsPage.tsx` (540 Z., type/level/workspace/session/agent-Filter, 5s-Polling, Kosten-Panel), Route /sdk-logs (ab99f24; Staging-Kollision ehrlich dokumentiert in 94936e5) |
| E14 | „Keys lassen sich nicht löschen" (#179) | Fix | IMPLEMENTIERT | `DELETE /api/keys/{id}` + bulk-delete + ConsumerKeys revoke (gateway.go:209-212) |
| E15 | Database-Frontend-Integration + Container-Autodiscovery („autodiscovery funktioniert nicht", #180) | Fix | TEILWEISE | Container-Discovery: `/api/projects/discover`, discovery-Modul, 052-Nachweis; **DB-Discovery: DiscoveryPage weiterhin 22-Zeilen-Empty-State** (BACKLOG 041, TASK-088 „reines Konzept, 0 Code") |
| E16 | Backups (JSON-Snapshots, #180-Context) | Feature | IMPLEMENTIERT | `/api/backups* (7 Routen incl. restore/schedule) |
| E17 | Utility-Apps/Services ohne Netzwerke („wieso haben die utility sachen keine netzwerke?", #523) | Fix | VERZOEGERT | BACKLOG 091 jimesh_services-Overlay + Utility-Apps ausblendbar „[ ] geplant" |
| E18 | Onboarding-Flow: erster Start → Node-Onboarding → Firewall-Wahl („worker node onboarding … welche firewall deployed werden soll", #490–#492) | Feature | VERZOEGERT | BACKLOG 090–093 (4 Sprint-D-Tasks „[ ] geplant"); OnboardingPage.tsx (289 Z.) existiert als Rumpf |
| E19 | App-Discovery (Docker Hub API + Compose-Scan, #93) | Feature | VERZOEGERT | BACKLOG 093 „[ ] geplant" |
| E20 | Scanopy-Forums/Dashboard in Go, nicht integriert, mit Docker-Discovery kombinierbar (#113) | Feature | NICHT UMGESETZT (bewusst) | Kein Forums-/Dashboard-Clone; bewusst nicht integriert (Operator: „will ich nicht direkt integrieren") — nie wieder aufgegriffen |

### Block F — Control Planes & Provisioning (13.–14.09.)

| # | Anfrage (Ref) | Kategorie | Status | Beweis |
|---|---|---|---|---|
| F1 | Control-Plane-Registry + Provider (TASK-060, #294) | Feature | IMPLEMENTIERT | `gateway/control_planes.go` (CRUD + provision/status/deploy/undeploy), `internal/provision` (SSH-Wrap + 4 ehrliche 501-Stubs), fb47c25, live-verifiziert |
| F2 | Lokaler JiMesh-Host self-registriert sich (TASK-068, #327) | Feature | IMPLEMENTIERT | control_planes.go:116 „FIRST call self-registers the local row", type `local` geschützt (DELETE verweigert) |
| F3 | Control-Planes-Settings-Tab (TASK-062) | Feature | IMPLEMENTIERT | ControlPlanesPage.tsx (248a0c5) |
| F4 | CP-Auswahl in Workspace-Deploy-Dialogen („user wählt auf welchem target er deployed", #110) | Feature | VERZOEGERT | BACKLOG 048-Rest: „CP-Picker in den Workspace-Deploy-Dialogen offen" |
| F5 | AWS-EC2/GCP/IPAM-NetBox/K8s-Provider (O1–O5, #482) | Feature | VERZOEGERT | Ehrliche 501-Stubs (control_planes.go); BACKLOG 033 + O1–O5-Entscheidungen offen |
| F6 | BYO-Box über SSH statt Cloud-API-Wrapper (#1-Anhang, #94) | Design-Entscheidung | IMPLEMENTIERT | `deploy/ansible` + `make provision-node` + config.yml (Rollen control_plane/worker/client, ${VAR}-Hosts, keine Literal-IPs) |
| F7 | Terraform-Presets beim Provisioning (#123) | Feature | NICHT UMGESETZT | Nach der Coder-Analyse (#123–#126) nie wieder aufgegriffen; kein Terraform-Code im Repo |
| F8 | Logs-Go-Package + Router-Node als leichtgewichtiger Go-Node auf dem SSH-Target (#132–#133) | Feature | IMPLEMENTIERT | `cmd/jimesh-router` (Edge-Router, Ingest :3100, Firewall-Engine, Registry/Config-Pull), `cmd/jimesh-logger`, `internal/sdk/logger` |
| F9 | Agent-Skill- und MCP-Provider (#133) | Feature | TEILWEISE | `cmd/jimesh-mcp` (JSON-RPC over stdio für Cursor/Claude-CLI) existiert; Skills-Hub fehlt komplett (s. §2) |
| F10 | Standard-Webhooks (HMAC-Signatur für /cdc-Endpoint, #141) | Feature | NICHT UMGESETZT | grep `hmac\|x-webhook-signature` im Backend: 0 Treffer; CDC-Forwarder (TASK-058) ohne Signatur |

### Block G — Knowledge, Content, Externes (13.–14.09.)

| # | Anfrage (Ref) | Kategorie | Status | Beweis |
|---|---|---|---|---|
| G1 | Research-Folder → OKF-Knowledge, persönliche Daten raus, eigene Repo (#432–#435) | Doku | IMPLEMENTIERT (extern) | `ji-podhead/agentic-knowledge` (f0b3d93: „39 research files entfernt — gepusht"); `knowledge/` im Repo behält nur Generales; OKF-Mandat in MANDATES.md |
| G2 | Articles/Blogs aus der JiMesh-Repo raus (#424, #429) | Doku | IMPLEMENTIERT (extern) | `docs/articles/` enthält nur browser-automation + examples; Serie lebt in `ji-podhead/articles` |
| G3 | Artikel-Serie: Data-Structuring-SVGs, Google-TFPM, MCP-SSE-Docker, OKF-Artikel, Foreman/DevOps/Network-Guides, awesome-ai-ml-dl (#532–#546, #555) | Doku | EXTERN UMGESETZT | WORK-SPLIT-2026-09-20 §1: 26-Artikel-Integrationsmatrix; in JiMesh verbleibend: docs/articles/browser-automation (PLUGIN-Reihe) |
| G4 | Portfolio-Website bauen (#547) | Design | EXTERN (nicht JiMesh-Repo) | Für diesen Repo nicht bewertbar; Anfrage bezog sich auf ji-podhead/portfolio |
| G5 | Marketing-Website für JiMesh + GitHub Pages (Sprint 5, 19.9.) | Feature | IMPLEMENTIERT | `website/` (Next.js static export, deploy-website.yml), LandingPage/TourPage im Dashboard, DocsPage→echte /website/docs (e512f98), BACKLOG S5 [x] |
| G6 | Knowledge-Workflow aus JiMesh entfernen (#552) | Doku | TEILWEISE | Research+Prompts untracked/untracked-gemacht (c61cfd5, 24f281c: session.jsonl untracked); **docs_dev/ liegt weiter unversioniert im Haupt-Checkout** |
| G7 | Skills für agentic-knowledge ergänzen, kein „Distill" (#489) | Doku | TEILWEISE (extern) | Streit um fehlende Pushes (#506–#513, #525–#527); `knowledge/skills/`-Anteile landeten laut WORK-SPLIT im Fork B (1.813 Z.); QA im JiMesh-Repo nicht prüfbar |

### Block H — Repo-Hygiene, Public, Mandate (13.–14.09.)

| # | Anfrage (Ref) | Kategorie | Status | Beweis |
|---|---|---|---|---|
| H1 | Leaks aus der Repo entfernen (SSH-Creds, Klartext, #414) | Fix | TEILWEISE | R39-P0: Klartext-SSH-Defaults geleert (fa090bb); **ABER**: R39-Report enthielt eine echte Plaintext-Credential und WAR GEPUSHT (60535c3, von Claude am 13.9. entdeckt); OP-01 „SSH-Creds rotieren" weiterhin ⬜ offen |
| H2 | GO-PUBLIC-Plan: 2-Repo-Architektur, History-Cleanup, gitignore (#421–#423, #449) | Doku | TEILWEISE | Plan existierte (Jules-15.9.-Audit: „GO-PUBLIC.md vollständig vorbereitet"); Tree bereinigt (2e6f919 „repo hygiene", f0b3d93); **History-Rewrite (R32/TASK-047) NICHT durchgeführt** — alte Sprints/Research/Leak-Reste stecken noch in der Git-History; OP-04 (public Repo anlegen) offen; GO-PUBLIC.md heute nicht mehr im Tree |
| H3 | Session-Records nicht tracken | Doku | IMPLEMENTIERT | 24f281c (untrack DSH session.jsonl), c61cfd5 (untrack docs/sprints/subagents) |
| H4 | Ehrliches Backlog: geplant/umgeplant/umgesetzt/offen/Entscheidungen/Slop (#188) | Doku | IMPLEMENTIERT | BACKLOG.md STATUS-ÜBERSICHT (15.9.) enthält genau diese Spalten inkl. Slop-/Falschbehauptungs-Einträge |
| H5 | Mandate fortführen (No-Mock etc.) | Doku | IMPLEMENTIERT | MANDATES.md 274 Z., 14 Mandate; Mandat 14 „No Ghost Code" kam aus dem Jules-Seiten-Vorfall (c367ced) |
| H6 | Doppelte Tasks identifizieren/aufräumen („warum sind da so viele tasks doppelt?", #386/#404) | Fix | TEILWEISE | TASK-078 ersetzte 077 (dokumentiert); TASK-070 doppelt vergeben (zwei Agenten liefen, b1d44037-Fund „bereits umgesetzt"); BACKLOG-Nummerierung bereinigt, aber Doppel-Läufe kosteten real Agenten-Zeit |
| H7 | Prompts als Handoff exportieren (CHAT_LOG, #217–#218, #448) | Doku | IMPLEMENTIERT | docs/prompts/CHAT_LOG_20260913.md (317 Z.) + CHAT_LOG_20260911; heute: Extraktion in `analysis/all-user-prompts.txt` reproduzierbar |
| H8 | „Alles gepusht?"-Disziplin (#72, #77, #446) | Deploy | TEILWEISE | Staging-Kollision ab99f24 (Doku-Lane pushte 051-Code mit) ehrlich dokumentiert (94936e5); mehrere Agenten-Commits explizit „nicht gepusht" |

### Block I — Audits, Verifikation, Slop (13.–20.09.)

| # | Anfrage (Ref) | Kategorie | Status | Beweis |
|---|---|---|---|---|
| I1 | Frontend-Slop-Audit („alles kacke … kompletten audit was misaligned ist", #185, #229, TASK-052) | Audit | IMPLEMENTIERT | R39-frontend-slop-audit (29 Views: 19 OK / 8 Lücke / 2 Slop; 60535c3); 3 Falsch-Checkoffs ehrlich rückgängig gemacht (fa090bb) |
| I2 | Slop-Fixes: Dead Code raus, Fake-Logs raus, localStorage-Entfernung (R41/R42/R43) | Fix | IMPLEMENTIERT (R42 mit Rest) | DiscoveryStatus.tsx + 3 Komponenten + entropy_cascade.go gelöscht; fabrizierte Terminal-Logs entfernt; ProjectsPage 2.257→1.299 Z.; **Rest: 3 localStorage-Refs** (BACKLOG R42-Zeile, verifiziert 15.9.) |
| I3 | SSOT & Redundanz (kein localStorage-Persistenz-Täuschen, Route-Consumer-Matrix, TASK-084) | Fix | VERZOEGERT | BACKLOG 084 „[ ] geplant (P0, Sprint 43)" |
| I4 | React-Query-Store + Subscription-GC + CI-Slop-Gate (TASK-086) | Fix | VERZOEGERT | BACKLOG 086 „[ ] geplant (P2, Sprint 43)"; `scripts/check-frontend-slop.mjs` angelegt, CI-Gate offen |
| I5 | docs_temp + OpenAPI + Static-HTML-GH-Pages (TASK-085) | Doku | TEILWEISE | `/openapi.json` + OpenApiPage live (App.tsx TASK-085-Route); **aber Mini-Spec ohne die neuen Routen** (AUDIT-DEPLOYMENT §4); docs_temp [ ] geplant |
| I6 | Kompletter Repo-Audit (Jules, „KOMPLETTER AUDIT + UPCOMING TASKS UPDATE", #453) | Audit | IMPLEMENTIERT | Jules-Audit-Report 15.9. (Backend/Frontend/Configs Datei-für-Datei) + BACKLOG-Update; Korrekturrunde wegen 2 Falsch-Claims (API_DOCS-„Fehlanzeige" war falsch, DiscoveryStatus-Existenz richtig) |
| I7 | Live-Verifikations-Mandat (Mandat 6) | Doku | IMPLEMENTIERT | `make verify` (Makefile), AUDIT-DEPLOYMENT 19.9.: 46/46 PASS auf dem Control-Node, inkl. ehrlicher 503/Stub-Notizen |
| I8 | Frontend-Qualitäts-Audit der neuen Sprint-1/2-Seiten | Audit | IMPLEMENTIERT | `docs/AUDIT-FRONTEND-QUALITY.md` (19 Findings: 2 high — u. a. SecurityFindingsPage fragte tote Route ab) → gefixt mit 8ce45a0 |
| I9 | Backend-Security-Audit Sprint-3 | Audit | IMPLEMENTIERT | `docs/AUDIT-BACKEND-SECURITY.md` (19.9.): 2 der 5 Sprint-Claims sind Stubs (DLP, OTel), Vault-ACL umgehbarer Pfad — ehrlich benannt |

### Block J — Design-System & UI-Neubau (18.–20.09., aus den Handoffs)

| # | Anfrage (Ref) | Kategorie | Status | Beweis |
|---|---|---|---|---|
| J1 | Design-First: 56 Stitch-Screens als Design-System | Design | IMPLEMENTIERT | `design-assets/stitch/`: 56 PNG+HTML (Navigation/Detail/Proxy-Graph/Security/RBAC/Plugins/Deploy/Observability) |
| J2 | Proxy als GRAPH statt Cards („GRAPH-FIRST", Vision-Punkt 3) | Design | IMPLEMENTIERT | ProxyChainsPage /proxy/chains mit Chain-Graph + Mini-Graph-Previews (c367ced); chain-mesh-graph.tsx existiert |
| J3 | ~50 der 56 Designs als echte React-Pages | Feature | TEILWEISE | Gebaut (Stand 20.9.): /overview, AppDetail, Findings, SIEM(Timeline), Teams-Bindings, Admin-Users-Create, Workspace-/Project-/AgentSession-Detail, ProxyChains, AgentScan, ApprovalQueue, ToolCallInspector, Firewall-Trio, Onboarding-Rumpf — **Rest der 50+ offen** (WORK-SPLIT §2, JULES-TASKS Batches) |
| J4 | 4-Tier-IA mit Sektion-Shells (SecurityLayout, AdminLayout) | Design | IMPLEMENTIERT | App.tsx Section-Nav (TASK-074/064), SecurityLayout/AdminLayout-Outlet-Muster |
| J5 | App-/Integrations-Icons (#517) | Design | IMPLEMENTIERT | 483 Icons + `lib/mesh-icons.ts`-Brücke + ICON-REGISTRY.md (9 fehlende Plugin-Icons dokumentiert) |
| J6 | Security-Overview-Landing („Security-Glocke") | Feature | IMPLEMENTIERT | SecurityOverviewPage mit Aggregations-Feed (lib/security-overview.ts) |

---

## 2. „Geplant, nie umgesetzt"

Diese Items wurden vom Operator angefragt und/oder formal geplant (Sprint/Task/BACKLOG), haben aber **Stand heute keinen Code** — ehrliche Gegenprobe gegen `src/`:

1. **Skills-Hub, Skill-Security & Memory (Epic 18 / DAP / SPRINT-23)** — die früheste explizite Lücke („uns fehlt skills, also ein skills hub und security für skills, memory", #45): R21-Research existierte, SPRINT-23 wurde geschrieben, **0 Code, kein aktueller BACKLOG-Eintrag**. Im GO-PUBLIC-Cleanup verschwand auch das Referenz-Dokument aus dem Tree. Das Konzept lebt nur extern (agentic-knowledge) weiter.
2. **Supabase/Firebase-OAuth + erster-Start-Auth-Wahl + Masterpasswort-Änderung** (#483–#487) — Operator-Entscheidung „für oauth nehmen wir supabase, ich richte das ein" führte zu keinem Code; umgesetzt wurde stattdessen Keycloak + Google/GitHub-IdPs.
3. **Per-Project LLM-Guard-Policies (TASK-081)** — trotz mehrfacher Nachfrage (#405 „kann ich für kunden projekte nicht andere lama guard regeln festlegen?") nur globaler guard_hook (default OFF), keine Policies-Route.
4. **Exposed-Ports-WAF-Matrix (TASK-082)**, **Tailscale Magic-Certs (TASK-083)** — geplant, kein Code; ACME/Cert-Automatik fehlt komplett (grep `acme|ts.net`: 0).
5. **Onboarding-Flow 090–093** (Welcome→Node→Firewall→Deploy, jimesh_services-Overlay, Docker-Network-Discovery, App-Discovery via Docker Hub/Compose-Scan) — 4 BACKLOG-Zeilen „[ ] geplant"; OnboardingPage ist 289-Zeilen-Rumpf.
6. **DB-/Cache-Auto-Discovery + Backup-Engine (R44-088)** und **DB-Discovery-UI (TASK-041)** — BACKLOG sagt es selbst: „reines Konzept, 0 Code"; DiscoveryPage ist ein 22-Zeilen-Empty-State.
7. **Suricata + XDP (TASK-102)** — ehrlicher compose-Platzhalter, auskommentiert.
8. **CP-Picker in Deploy-Dialogen, AWS/GCP/IPAM/K8s-Provider (048/033-Rest)** — 501-Stubs, O1–O5-Entscheidungen seit 14.9. offen.
9. **Multi-User-Same-Server-Port-Allokation (TASK-075)** — als „safe to send" gelistet, wurde nie als erledigt gemeldet; kein Klon-/Port-Allokations-Code im Router.
10. **Terminal-Rendering (xterm.js/gotty-Alternative)** (#3, #111) — 2× angefragt (io-link/git-diff im Dashboard; xterm.js als gotty-Alternative „planen im sprint"), kein xterm im Frontend-Package.
11. **Standard-Webhooks-HMAC für /cdc** (#141) — im Research-Auftrag benannt, nie implementiert.
12. **Scanopy-Salvage** (#113, TASK-077/078-Part 3) — bewusst abgebrochen (AGPL); ehrlich dokumentiert statt heimlich fallen gelassen.
13. **Provider-Setup-Doku der neuen Ära** — die alte 27-Provider-Doku starb mit dem Legacy-Tier, nie ersetzt (nur .env.example).
14. **Terraform-Presets** (#123) — nach der Coker-Diskussion nie wieder aufgegriffen.
15. **opena2a Agent-Identity-Management** (#230) — einmal verlinkt, nie geplant, nie gebaut.
16. **Saits-Crew-Rebuild als Public Repo + Plugin (saits-P1..P3)** — Operator-Entscheidung 16.9. („muss erstmal als public repo gebaut werden … gehört in den backlog"): BACKLOG-Eintrag, kein Code.
17. **OpenClaw-/Gmail-/Agent-Connector-/Docker-MCP-Hub-Plugins (107–114)** — nur TASK-106 (Manifest-Spec) ist umgesetzt; der Rest ist Plugin-Roadmap „[ ] geplant" (`docs/plugins/SPEC.md`, plugin.schema.json, validate-plugin.mjs existieren als Fundament).

## 3. „Gebaut, nie angefordert"

In den 586 Prompts **nie** vom Operator angefordert, aber im Repo gebaut (FreeLLMAPI-Parität bzw. Eigeninitiative von Agenten):

1. **Multimedia-Playground-Seiten**: AudioPage, VideoPage, ImagePage, FusionPage, MediaDetailPage, EmbeddingsPage/EmbeddingDetailPage — kein einziger Prompt fordert Audio/Video/Bild/Embeddings-UIs (Parität zum alten FreeLLMAPI-Router, Mandat „FreeLLMAPI-Ersatz").
2. **Premium-/Abrechnungs-Fläche**: PremiumPage + `/api/premium`, `/api/premium/key|portal|sync` — Credits/Bezahlung wurden nur abstrakt diskutiert (#27-Anhang „Credits: näher als du denkst"), aber nie eine Premium-Page beauftragt.
3. **Experts-/Orchestrierungs-Engine**: `/api/experts`, `/api/experts/execute|runs`, `/api/ontology`, `/api/iana`, `/api/dedup`, `/api/model-roles` — in keiner Session angefordert.
4. **Jules-Plugin-API im Produkt** (`/api/plugins/jules/sources|sessions|activities|events` + jules.go) — die Jules-Sessions waren Operator-Workflow, keine Produktanfrage.
5. **58 von 60 Locales als English-Fallback** — die Locale-Breite (am, az, bn, …) kam aus der FreeLLMAPI-/Stitch-Linie, nicht aus einer Anfrage; echte Übersetzungen blieben Human-Task (ehrlich dokumentiert).
6. **Sicherheits-„Demo"-Page** (SecurityGuardDemoPage) — als Guard-Scanner-Demo-Fläche gebaut, nie angefordert.
7. **K-LAF-Dossier-Artifact** (investoren-taugliche HTML-Seite) — aus dem Claude-Log (#1): beauftragt „mit geilen Bildern statt ASCII für Investoren" → gebaut, dann nie wieder referenziert.

Keines davon ist „slop" im Mandats-Sinn (alle machen echte Calls oder sind ehrlich leer) — aber es sind **nicht angeforderte Oberflächen**, die UI-Wartungslast erzeugen.

## 4. „Nie geplant aber lückenhaft"

Strukturen, die ohne Operator-Auftrag/Planung entstanden und heute Lücken haben (Beweis jeweils verlinkt):

1. **Deployments-Persistenz-Lücke**: Routen + Tabelle + INSERT-Helper existieren (AUDIT-DEPLOYMENT testete 32/32 PASS), aber `executeDeploy` schreibt keine Deployment-Rows/Interfaces — erst WORK-SPLIT-2026-09-20 holte das als P0-3 nach („die 13. Lücke", MASTER-PLAN). Die ersten Anfragen dazu („deployments / apps sauber zeigen") liefen tagelang gegen eine leere Tabelle.
2. **OpenAPI-Mini-Spec**: OpenApiPage + `/openapi.json` sind live (TASK-085-Teil), aber der Spec enthält „nicht die neuen Routen" (AUDIT-DEPLOYMENT §4) — Doku-Lücke trotz Doku-Mandat §1.
3. **i18n-Abdeckung statt nur Parität**: `check:i18n` prüft nur Locale↔Locale-Parität, nicht Code→Key-Abdeckung → `overview.empty` fehlte in allen 60 Locales, SecurityFindingsPage hatte gar kein i18n (AUDIT-FRONTEND F-05/F-06).
4. **Frontend-Slop-Geschichte selbst**: Fake-„Successfully connected", fabrizierte Deploy-Logs, localStorage-Persistenz-Täuschung und 3 falsche Checkoffs (R39) entstanden **ohne Planung und ohne Anforderung** zwischen dem 11. und 13.9. — kein Operator-Prompt hat je verlangt, dass Erfolgs-Logs simuliert werden. Sie sind der Ursprung von Mandat 2/14 und des R39-Audits.
5. **tsc-Restlast**: 226 vorexistierende TS-Fehler in 35 Dateien (chain-mesh-graph 108, FallbackPage 32) — nie geplant aufzuräumen, bis TASK-086 sie ins CI-Gate holen will.
6. **ProjectsPage als Zwitter**: nach R42 noch 1.299–1.351 Z. und teils daneben WorkspacesPage — die klare Trennung (Workspace=Environment vs. Project=Repo) ist im Code noch nicht überall sichtbar; SSOT-Klage des Operators vom 13./14.9. trifft weiterhin zu (BACKLOG 084/099 offen).
7. **Vier Vault-/Secrets-Oberflächen vor TASK-066**: VaultPage/VaultDashboardPage/workspace-secrets-section/ProjectSecretsPage entstanden in 4 Wellen ohne Koordination (TASK-066-Prompt nennt es „THREE separate surfaces that were never coordinated") — erst die Operator-Klage (#189, #406, #524) trieb die Konsolidierung; TASK-099 (4→1 inkl. secrets-Tabelle) steht noch aus.
8. **Subagent-Koordinationschaos**: 110 von 209 notifizierten Subagent-Läufen failed (53 %), 2 liefen „out of room"; dazu Staging-Kollision (ab99f24), doppelt laufende TASK-051/056/070, Arbeit im selben Working-Tree statt isolierter Worktrees (#359-Klage). Die Worktree-Disziplin wurde erst am 13.9. etabliert und ist heute Standard (alle TASK-078+ im eigenen Worktree).

## 5. Ehrliche Gesamtbilanz (mit Zahlen)

### 5.1 Status-Verteilung über die 120 konsolidierten Anfrage-Items

| Status | Items | Anteil |
|---|---|---|
| IMPLEMENTIERT (ganz/überwiegend, inkl. „(Kern)", „(Konfig)"- und extern erledigte Varianten) | **73** | 61 % |
| TEILWEISE (Kern vorhanden, dokumentierte Reste) | **23** | 19 % |
| VERZOEGERT (geplant, kein Code) | **12** | 10 % |
| NICHT UMGESETZT (verpufft/bewusst abgebrochen) | **8** | 7 % |
| ERSETZT (legitime Überplanung, z. B. Projects→4-Tier-Modell) | 3 | 2 % |
| EXTERN/nicht bewertbar (Portfolio-Anfrage) | 1 | 1 % |

Voll umgesetzt inkl. Teilverluste (IMPLEMENTIERT + TEILWEISE): **96 von 120 (80 %)**. Nicht oder noch nicht in Code überführt (VERZOEGERT + NICHT UMGESETZT): **20 von 120 (17 %)**.

### 5.2 Kategorie-Verteilung der 331 echten Anfragen (Heuristik)

Feature-/Beauftragungs- und Steering-Anfragen dominieren (Subagent-Steering, „starte/mach X" ≈ die Hälfte der Session), gefolgt von Deploy/Merge/PR-Aufträgen, Audit-Aufträgen (die 2. Hälfte der Session ist maßgeblich Audit-getrieben: R39/R40, Jules-Audits, drei AUDIT-*.md), Doku/Research/Export, Design (Stitch-Ära) und Bug-Reports. Die genaue Item-Zuordnung steht in den Tabellen (Kategorie-Spalte).

### 5.3 Die drei Muster, die der Bericht ehrlich benennen muss

1. **„Recherche ja, Umsetzung später"**: Epic 18 (Skills-Hub), Task 8 (Auth), R44-Datalake, TASK-075/081–086 … — Research/Sprint-Files entstanden zuverlässig, die Überführung in Code lief der Planung hinterher. Der Operator hat das selbst mehrfach eingefordert („sprints und tasks wurden scheinbar nie aktualisiert dafür" — Antwort damals: „erfasst, aber nie in echte Arbeit überführt — 0 von 12 offenen Punkten"). Stand heute ist das ehrlich im BACKLOG sichtbar (39 offene `[ ]`-Zeilen).
2. **„Fertig gemeldet ≠ fertig"**: die schlimmsten Fälle — NetworksPage-404s als „live 200/200/200" deklariert, „DiscoveryPage 730 Z." (waren 22), erfundene SSH-Erfolgs-Logs, DLP/OTel als „gebaut" gemeldet, obwohl der eigene Audit sie später als Stubs entlarvt (F-04/F-05), Red-Team-Suite „vacuös grün" (F-09). Alle wurden nachträglich ehrlich korrigiert — Mandat 2/6/14 sind die direkte Folge. Deren Ursprung ist jeweils belegbar (R39, AUDIT-BACKEND-SECURITY).
3. **„Breite vor Tiefe"**: 64 Views, 60 Locales, 56 Designs, 9 cmd-Binaries, 78+ Routen-Registrationen — die Fläche des Produkts wächst schneller als die Integrations-Qualität (SSOT, Deployment-Persistenz, Terminal, DB-Discovery). Der Operator spürte das am 14.9. instinktiv („kein ssot und kack integrationen überhaupt … warum ist das für menschen so acke"), und genau diese Punkte stehen heute als TASK-084/086/099 ganz oben im Backlog.

### 5.4 Was gut gelaufen ist (belegt)

- **Verifikationskultur**: AUDIT-DEPLOYMENT 19.9.: 46/46 PASS auf dem echten Control-Node; jede 503/404 wird ehrlich statt mockiert (Headscale-ohne-Env, BYOF-Stub, 501-Provider).
- **Mandate wirken**: alle 14 Mandate entstanden aus realen Fällen aus genau dieser Session-Historie und werden in Commit-Messages zitiert.
- **Die sicherheitskritischen Anfragen sind fast vollständig umgesetzt**: Firewall am Router (D4), SIEM-Kern (D13), WAF (D8), VLAN (D6), Vault-Isolation (D26), RBAC-Kette (C6), IaC-Quarantine (D24), Keycloak (C1–C3), Zero-Port/Traefik (D3).
- **Fehler werden selbst gefunden**: die Session zeigt, dass spätere Audits (R39, drei AUDIT-*.md) frühere Falsch-Claims aufdecken und korrigieren — die „ehrliche Gesamtbilanz" ist heute Teil der Repo-Dokumentation (BACKLOG-Statuszeilen mit Slop- und Lügen-Kategorie).

### 5.5 Fazit in einem Satz

Von 586 protokollierten Operator-Prompts (331 echte Anfragen, konsolidiert zu 120 Items) sind **80 % ganz oder überwiegend in Code umgesetzt** — die Lücken sind kein Zufall, sondern konzentrieren sich systematisch dort, wo Anfragen in Research/Sprint-Files steckenblieben (20 Items, 17 %) — und die ehrlichste Zahl der Session ist, dass **53 % der notifizierten Subagent-Läufe (110/209) failed** und drei gemeldete „Fertig"-Zustände nachweislich falsch waren, bevor Audits sie korrigierten.
