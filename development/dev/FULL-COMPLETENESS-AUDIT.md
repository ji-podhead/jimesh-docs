# FULL-COMPLETENESS-AUDIT — JiMesh: ALLE geplanten, aber nie gebauten Features (PLAN vs. CODE)

**Datum:** 27.9.2026 (Vollständigkeits-Audit, DSH-Subagent)
**Auftrag:** Finde ALLE Features, die im Laufe der JiMesh-Entwicklung GEPLANT wurden, aber NIE implementiert wurden. Vergleich PLAN vs. CODE über alle Planungs-Quellen.
**Methode:** Vollständiges Lesen von `docs_dev/prompts/` (alle 9 Dateien inkl. USER_REQUIREMENTS_SUMMARY.md, alle CHAT_LOGs, alle glm-session-Prompts), `docs/PROMPTS-STITCH-DESIGN.md`, `docs_dev/AUDIT-DESIGN-GAP-LIST.md`, `docs_dev/SIDEBAR-UX-FINAL-CONCEPT.md`, `docs/backlog/BACKLOG.md` + `docs_dev/backlog/BACKLOG.md`, `docs_dev/GO-PUBLIC-PLAN.md`, `docs/ARCHITECTURE.md` §8, `docs_dev/tasks/jules/TASK-PLAN-PLUGIN-SYSTEM.md` + `TASK-088-firebase-auth.md`, ALLE Crew-Sprints (`jimesh-crew/docs/planning/` rm00–rm32 + BACKLOG + MESHSQUAD_INTEGRATION_PLAN). Danach Verifikation JEDES Befunds gegen echten Code: `App.tsx` (772 Z., alle Routen), alle 74 Views, alle `mux.HandleFunc`-Registrierungen im Backend (273 Treffer über 30 Dateien), `gateway/plugins.go`, `mcpserver/tools_*`, `guard_hook.go`, `cmd/*`, Makefile, `deploy/*`, `HierarchySidebar.tsx`, `section-nav.ts`, Crew-`services/*` (Inhaltscheck je Service) — plus gezielte Greps (firebase=0, gmail=0, gdrive=0, bybit=0, per-project-guard=0, rotate=0, suricata=0 in Go, rate_limit=0 im WAF-Sidecar, dlp-events=0, getAppIcon in AppDiscoveryPage=0, "Multi-fähig"-Audit-Tabelle=0). Kein Befund aus Alt-Audits wurde ungeprüft übernommen.

**Prioritäts-Legende (nach Operator-Wünschen):**
- **P0** = vom Operator explizit und mehrfach / wütend / als Bedingung verlangt
- **P1** = vom Operator explizit verlangt (einmalig, klar formuliert)
- **P2** = in Plänen/Designs/Backlogs vereinbart, aber nie aktiv eingefordert

---

## 0. Kurzfassung

Zählweise: je Tabellenzeile das höchste beteiligte Prio-Tag (F14 trägt 3 Teil-Prios → hier P0). 2 Security-Zeilen (S3/S4) sind Spiegel von B2/B3 — in der Summe als Spiegel, nicht als neue Funde gewertet.

| Kategorie | Tabellen- zeilen | davon echte Funde | davon P0 | davon P1 | davon P2 |
|---|---|---|---|---|---|
| 1. Backend | 18 | 18 | 5 | 6 | 7 |
| 2. Frontend | 14 | 14 | 1 | 6 | 7 |
| 3. Integrations | 9 | 9 | 0 | 6 | 3 |
| 4. Plugins | 8 | 8 | 1 | 6 | 1 |
| 5. Security | 10 | 8 (+2 Spiegel) | 2 (+2 Spiegel-P0) | 1 | 5 |
| 6. Agent-Features (meshsquad/crew) | 8 | 8 | 1 | 5 | 2 |
| 7. Deploy/DevOps | 10 | 10 | 1 | 6 | 3 |
| 8. Utility | 9 | 7 (+2 Non-Gaps: U2 erledigt, U9 nie geplant) | 0 | 1 | 6 |
| **Summe** | **86 Zeilen** | **84 echte Funde** | **11** | **37** | **36** |

*P0 eindeutig (11): Guard-Per-Project-Rules (B2) · Streaming-Scan (B3) · SIEM-Rest (B8) · Phantom-MCP (B14) · Plugin-Persistenz/Ingestion (B15) · Multi-Select-Audit (F14/WP0) · meshsquad-Echtinstallation (P7) · Guard-Dashboard (S1) · eBPF-Enforcement (S2) · crew1-7-gVisor (A2) · GO-PUBLIC-Phasen (D1).*

**Die P0-Lücken im Überblick (11 Befunde — Guard-Dashboard+per-Project-Rules als eine Nennung, Plugin-Persistenz+meshsquad als eine):**
1. Llama-Guard-Dashboard + per-Project-Guard-Rules (rm32 #53 + TASK-081 — Backend fertig, 0 Frontend/0 per-Project-Modell)
2. Prompt-Injection-Enforcement via eBPF/Tetragon ("bitte bitte bitte endlich mit ebpf machen … wurde ja auch nie gebaut")
3. Plugin-Installations-Persistenz + Manifest-Ingestion + meshsquad-Echt-Integration (MESHSQUAD WP6 / RM25-4)
4. Multi-Select-Endpoint-Audit-Tabelle (Operator-Bedingung "BEVOR Multi-Select-UI" — Reihenfolge verletzt, UI steht schon)
5. Streaming-Response-Guard-Scan (Agenten-Workflows laufen fast immer streaming → ungeschützt)
6. SIEM-Permanent-Scan-Rest (Shipper JiMesh→Wazuh, Wazuh-Ruleset, make siem) — Kern-SIEM steht, der versprochene Dauer-Scan nicht
7. GO-PUBLIC Phase 0–2: Credential-Rotation (OP-01), Tree-Scrub, History-Rewrite — nichts ausgeführt, Leaks stehen weiter im Tree (SSH-ACCESS-ROUTES.md etc.)
8. gVisor: crew1-7 laufen weiter unter runc + Live-E2E des jimesh-Deploy-Wegs offen (mehrfach verlangt: "gvisor implementieren")
9. ~~Chat-Checkpoint-Summaries~~ → P1 (A4); stattdessen hier nochmals das Guard-Dashboard-Setting selbst (Prompt #53: "da müssen wir nur ne llama guard setting im dashboard bauen wo der user seine extra rules definieren kann") — 0 Frontend
10. Phantom-MCP-Routen (`/api/plugins/{linear,github,dsh}/*` werden von MCP-Tools aufgerufen, existieren nicht → echte 404s)

---

## 1. BACKEND geplant, nie gebaut

| # | Feature | Geplant in (Datei:Zeile) | Versprochen | Code-Realität | Prio |
|---|---|---|---|---|---|
| B1 | **OTel-Spine + Trace-Query-Route (F-05)** | docs_dev/backlog/BACKLOG.md:164 (S3-WP5 „OTel-Spine [ ] offen"); AUDIT-DESIGN-GAP-LIST.md:79,135–139; CHAT_LOG.md:212 („was its mit traces langrsmith") | Verteilte Traces (OpenLLMetry), Trace-Waterfall-Detail mit Spans, Export; Langfuse-Export im Design #18 | `internal/oteltrace` existiert, hat 0 Call-Sites, `EndSpan` schreibt nichts, keine Route serviert Spans. TracesPage.tsx:9–20 = ehrlicher Placeholder. (Langfuse-Batching für Chat-Calls ist ECHT gebaut: tracing/langfuse.go, wired in main.go+service.go+observers.go — aber kein span-basierter Waterfall) | **P1** |
| B2 | **Per-Project/Per-Endpoint Guard-Policies** | CHAT_LOG_20260913.md:676–684 („kann ich für zb kunden projekte nicht andere lama guard regeln festlegen"); docs_dev/backlog/BACKLOG.md:26 (#081: `PUT /api/llm/policies/{project}`); rm32_guardrails_concept.md:674 (J2: `guard_scanner.fail_mode`, `categories_json`, `rules.<agent_type_id>`) | Llama-Guard-Regeln je Project/Endpunkt; konfigurierbarer Fail-Mode; eigene Kategorien statt fixer S1–S14-Konstante | guard_hook.go:48–56: nur 2 GLOBALE Settings (`guard_scanner.enabled` + `chain_id`); Fail-Mode hardcodiert fail-open (L2); Kategorien Konstante (L4); grep per-project-guard = 0 Treffer | **P0** |
| B3 | **Streaming-Response-Scan (Guard + Regex)** | rm32_guardrails_concept.md:219 (L3, proxy.go:459 vs. 491–507); rm32 §5.3/J4 | Alle Antworten werden gescannt — auch Streaming-Responses (Agenten-Workloads fast immer streaming) | Streaming-Pfad = reiner Pass-through, weder Regex- noch Guard-Scan. 0 Code für Puffer-/Post-hoc-Variante | **P0** |
| B4 | **DLP-Event-Stream-Endpoint** | docs_dev/backlog/BACKLOG.md:167 (#172: „Design-Latency/Payload-Spalten kommen erst mit echten Backend-Endpoint") | Live-DLP-Event-Liste (Tool/Timestamp/Latency/Payload je Verdict) | dlp_hook wendet Verdicts in-place an, persistiert KEINE per-event-Records; grep dlp/events = 0. S136-3 baute nur Live-Status + ehrliche Notiz | **P1** |
| B5 | **Vault-Access-Matrix OPA-Eval-Endpoint** | AUDIT-DESIGN-GAP-LIST.md:111,144–146 (GAP #50); docs_dev/backlog/BACKLOG.md:139,162 (#144/#167 mit Struktur-Spec) | (Identity × Ressource)-Evaluation + „Active OPA Policy Rules"-Karten; capabilities.rego (#070) wiederverwendbar | 0 Code — kein Endpoint, keine Matrix-Datenquelle. capabilities.rego existiert, wird dafür nicht genutzt | **P1** |
| B6 | **Secrets-Rotate (Endpoint + UI)** | AUDIT-DESIGN-GAP-LIST.md:100 (#39: „Rotate aus dem Design fehlt"); SIDEBAR/Design jimesh-secrets-vault | Rotation von Secrets aus dem Vault-UI | grep rotate in internal/security = 0. Kein Rotate-Endpoint | **P2** |
| B7 | **Suricata/Network-Anomaly-Integration** | docs_dev/backlog/BACKLOG.md:86 (#102 „P1 Sicherheitslücke"); CHAT_LOG_20260913.md:404–405 („permanent gescannt werden, networks aber auch code") | Network-IDS-Anomalien im SIEM + Network-Anomaly-Tab | Go-Backend: 0 suricata-Treffer; `deploy/suricata-network-ids/ansible-task.yml` (27.9.) existiert als Deploy-Rezept, aber keine Bridge, kein Tab (grep anomaly in Frontend = 0). Falco+Wazuh sind da, Suricata nicht | **P1** |
| B8 | **SIEM-Rest: WP1-Shipper (JiMesh→Wazuh), WP3-Wazuh-Ruleset, security_events-Mapper, `make siem`-Targets** | docs_dev/backlog/BACKLOG.md:89 (#032 offen-Spalte); glm-session-fill-the-gaps.md:65–70 (Item 4); CHAT_LOG_20260913.md:399–409 (Prompt 20: „die siem haben und permanent gescannt werden") | JiMesh schickt Security-Events an Wazuh; eigenes Wazuh-Ruleset; make siem startet den Stack | Makefile hat KEIN siem-Target (verifiziert); shipper/ruleset/mapper nicht gebaut. Kern (Wazuh+Falco+siem-bridge+/api/sdk/logs alias) ist live | **P0** |
| B9 | **K-LAF AWS-Multi-Provider (O1–O5)** | docs_dev/backlog/BACKLOG.md:90 (#033 „planned; O1-O5 ausstehend") | AWS-native SIEM-Anbindung (CloudTrail/GuardDuty/Security Hub → JiMesh) | 0 Code | **P2** |
| B10 | **Datalake: echte CDC-Pipeline (Debezium-Consumer, Lag-Messpunkt, Spalten-Store)** | docs/backlog/BACKLOG.md:181 (B3-Erbe: „Echte Datalake/Debezium-Integration … [ ] offen"); docs_dev/backlog/BACKLOG.md:87 (R44-087/TASK-105, Spec APPROVED); rm00 #34-Zitat | CDC Postgres WAL + Redis-Stream-Sync + Columnar Storage (DuckDB/ClickHouse/Parquet) + S3-Archiving + Connector-Registrierung + Lag-Messpunkt | `cmd/datalaked/main.go` = 13-Zeilen-Sleep-Stub; `datalake/sink/sink.go` = No-Op-Stubs (Init/WriteBatch/Flush/Close → nil); Gateway-Routen `/api/datalake/{status,pipelines}` lesen ehrlich Debezium-REST (not_connected), messen KEIN Lag, konsumieren nichts | **P2** |
| B11 | **DB/Cache Auto-Discovery + Backup-Engine** | docs_dev/backlog/BACKLOG.md:88 (R44-088 „reines Konzept, 0 Code"); AUDIT §5 (`/dbs`-Surface) | DB-Engine-Erkennung (Postgres/Redis/Mongo/MySQL/ClickHouse), Auto-Pre-CDC-Baseline-Backup, `/dbs`-Konsolidierung | DiscoveryPage = ehrlicher Empty-State (#041); BackupsPage echt (/api/backups); Recognition/Backup-Engine 0 Code | **P2** |
| B12 | **`GET /api/projects/{id}/iac-files/{fileId}`** | docs/backlog/BACKLOG.md:159 (S2-WP4: „offen: GET einzelner Dateiinhalte fehlt") | IaC-Datei-Inhalte im Frontend anzeigen | Nur list+scan registriert (deploy.go:95–96); deploy.go hat KEINE fileId-Route (verifiziert) | **P2** |
| B13 | **`POST /api/apps/{id}/integrations`** | docs/backlog/BACKLOG.md:157 (S2-WP2: „Integration-Install … existiert nicht") | Integrationen (Terminal/Code/VNC/Web) per API an einer App installieren | Route existiert nicht | **P2** |
| B14 | **Phantom-MCP-Routen `/api/plugins/{linear,github,dsh}/*`** | MESHSQUAD_INTEGRATION_PLAN.md:113 („Nebenbefund (separater Fix)") | MCP-Tools list_linear_issues / github PRs / DSH-Profile über Gateway | tools_linear.go:24,53 (`/api/plugins/linear/issues`), tools_github.go:30,64 (`/api/plugins/github/prs|comments`), tools_dsh.go:22,52 (`/api/plugins/dsh/profiles|turns`) — KEINE davon ist in gateway.go registriert (nur jules/*). Jeder Aufruf = 404 | **P0** |
| B15 | **Plugin-Installations-Persistenz (TASK-103-Schuld) + Manifest-Ingestion** | docs/backlog/BACKLOG.md:112 (T2-Backend-Schuld), 93 (RM25-4); MESHSQUAD_INTEGRATION_PLAN.md:108–109,209 (WP6); rm00-Ledger #34 | Installation überlebt Restart (Persistenz-Mandat); Backend liest plugin.yaml wirklich (`ParsePluginManifest` hat Aufrufer) | gateway/plugins.go:62–80: POST /api/plugin-installations = Echo, GET = immer `[]`; Catalog handgeschrieben (4 Einträge), `ParsePluginManifest` = 0 Aufrufer außer Tests | **P0** |
| B16 | **`/api/plugins/meshsquad/*`-Wrapper + Health-Probe-Loop + service_account-Flow + Secrets-Scope-Wiring** | MESHSQUAD_INTEGRATION_PLAN.md:106–112 (Ehrliche Lücken 3–5), 209 (WP6) | meshsquad als echtes Plugin: Wrapper-Routen auf 8104/8113, Health-Probe gegen healthCheck.endpoint, service_account-Auth, `requiredSecretScopes` durchgesetzt | Alles 0: keine Wrapper-Routen, kein Probe, kein Flow, Scopes rein deklarativ | **P1** |
| B17 | **Firebase-Auth-Backend (`POST /api/auth/firebase` + provider_credentials)** | TASK-088-firebase-auth.md:5 („Implementierung offen"), 100–104, 178–229 | Dual-Auth (Keycloak + Firebase GitHub/Google), Token-Verifikation im Backend, Connected-Accounts-Routen | grep firebase in src/frontend + src/backend = 0. .env trägt VITE_FIREBASE_* (GO-PUBLIC-PLAN.md:238 listet den Key als ROTATE) — Config ohne Implementierung. (Die provider-credentials-Routen wurden S7-WP1 sogar als Geister-Routen GELÖSCHT) | **P1** |
| B18 | **Deploy-Familie in den Admin-Gate + Agent-Self-Spawn-Scope + Capability-Enforcement-Toggles** | docs_dev/backlog/BACKLOG.md:15 (S47-OPEN), 17 (Self-Spawn), 102 (#070 offen: consumer_keys-Capability-Spalte, /api-Flächen-Enforcement, networking:-Namespace) | POST deploy/redeploy/undeploy admin-gated; Subagent-Spawn mit Grant-Vererbung; OPA-Enforcement je Domäne aktiv schaltbar | Alles offen (bewusste Operator-Entscheide dokumentiert, kein Code) | **P2** |

**Weitere dokumentierte Backend-Offen-Items (P2):** Local-Control-Plane-Probe strukturell kaputt (#124, distroless ohne Shell — docs_dev/backlog/BACKLOG.md:72, blockiert #135); CP-Picker in Deploy-Dialogen + AWS/GCP/IPAM/K8s-Provider = 501-Stubs (docs_dev/backlog/BACKLOG.md:96,109); Vault-JIT für credentials_ref (TASK-016); ~10 Backend-Routen ohne Frontend-Nutzung (#149: /api/project-roles, /api/experts, /api/bridge/*, /api/cost-trackers, /api/app-categories, /api/model-roles, /api/dsh/preview, /api/firewall/config, /api/sessions/query, /api/agents/logs/stream — ungeklärt, je „UI nachrüsten oder bewusst dokumentieren").

---

## 2. FRONTEND geplant, nie gebaut

| # | Feature | Geplant in | Versprochen | Code-Realität | Prio |
|---|---|---|---|---|---|
| F1 | **Admin-Settings-API-Keys / Credential Scopes (GAP #1)** | AUDIT-DESIGN-GAP-LIST.md:37,62,125–131; docs_dev/backlog/BACKLOG.md:159 (#164) | Global Utility Keys (Stitch-AI-Engine, GitHub-VCS, LLM-Gateway) + „Project Overrides & Scoped Precedence"-Tabelle mit Configure/Revert | 0 Code. /keys (Provider-Keys) + /admin/consumer-keys decken das Konzept nicht ab. Audit-Empfehlung: vor Bau Operator-Freigabe (evtl. durch §8.3c-Namespaces abgelöst) | **P1** |
| F2 | **Design-Assets-Folder / Stitch-Import im Produkt (GAP #17)** | AUDIT-DESIGN-GAP-LIST.md:78,132–134 | Datei-Browser für Design-Assets, „Import from Stitch", Sync-Status, Exported Specs | 0 Code — Stitch lebt nur als Operator-MCP-Workflow (CLAUDE.md/STITCH-MCP-GUIDE), nicht im Produkt. Generischer FileBrowserModal existiert, aber kein Stitch-Import | **P2** |
| F3 | **Plugin-Detail-Route `/plugins/:pluginId` (GAP #44)** | AUDIT-DESIGN-GAP-LIST.md:105,140–143 | „Stitch Designer"-Detail: Two-Way-Sync, Session History & Prompt Replay, Token Export, Open Studio | Keine Detail-Route; PluginCatalogPage nur Katalog + Install-Wizard. Hängt am Surface-Renderer (#110) | **P2** |
| F4 | **Vault-Access-Matrix-UI (GAP #50)** | AUDIT-DESIGN-GAP-LIST.md:111; docs_dev/backlog/BACKLOG.md:139,162 (#144/#167: Identity×Ressource-Kreuztabelle, Violation-Highlight, Remediate) | Matrix mit Full/Read-Only/Denied/Inherited-Badges + „Audit Access Matrix"-Button (TeamsPage) | Nur Screenshot-Deko in TourPage.tsx; 0 Matrix-Struktur in VaultDashboardPage/ProjectSecretsPage; TeamsPage-Button führt nirgendwohin | **P1** |
| F5 | **Distributed-Trace-Detail/Waterfall (GAP #18)** | AUDIT-DESIGN-GAP-LIST.md:79; docs_dev/prompts/glm-session-item2-item3.md:35–40 | OTel-Waterfall + „Export to Langfuse" | Route /security/traces existiert, ist aber bewusster NOT-IMPLEMENTIERT-Placeholder (backend-blockiert, B1) | **P1** |
| F6 | **Agent-Chat-Proxy-Status-Panel (PARTIAL #2)** | AUDIT-DESIGN-GAP-LIST.md:63,156–159; CHAT_LOG.md:231–243 (Live-Anzeige der Routing-Kette) | Live „LLM Proxy & Routing Status" im Chat (aktive Kette, Fallback, Latenz) + Transcript-Export/Copy Trace | 0 Proxy-Referenzen in ChatInterface.tsx — Chat ruft direkt /v1/chat/completions. Bausteine (/api/analytics, /api/profiles/active, /api/fallback) existieren | **P1** |
| F7 | **Dashboard-Builder Phase 2 (PARTIAL #14)** | AUDIT-DESIGN-GAP-LIST.md:75; docs_dev/backlog/BACKLOG.md:156 (#161) | Freie Widgets, Properties-Panel, Connector-Quellen, „Add Blank Row", „Save Dashboard", PromQL-Editor | 5 fixe Summary-Cards (localStorage-Reihenfolge). Ehrlich als Phase 2 markiert — Fläche fehlt | **P2** |
| F8 | **Quick-Deploy-Leiste im Integrations-Design** | AUDIT-DESIGN-GAP-LIST.md:86; PROMPTS-STITCH-DESIGN.md:39 („Bottom: Quick Deploy — framework dropdown + SSH target + Deploy button") | Dauerhafte Quick-Deploy-Bar auf /plugins | Deploy-Dialog nur auf Workspace-Detail; [+ App]-Badge an Sidebar-Zeilen geht über WorkspaceDeployAppDialog — die Design-Leiste fehlt als eigene Fläche | **P2** |
| F9 | **Command-Palette: Live-Registry-Suche + fehlende Pages** | AUDIT-DESIGN-GAP-LIST.md:83,262,312; docs_dev/backlog/BACKLOG.md:154 (#159) | Live durchsuchbare SSH Targets/Apps/Workspaces/Projects/Secrets; alle Routen als Sprungziele | Sucht nur statische Links + LLM-Modelle; ~24 Pages, /security/*, /sessions, /subagents/*, /plugins*, /builder, /proxy/*, /overview, /onboarding, /admin/*, /dbs/* fehlen | **P1** |
| F10 | **Teams Access-Preview/Live-Simulation + Rule-Trace (#165)** | AUDIT-DESIGN-GAP-LIST.md:108,160,314; docs_dev/backlog/BACKLOG.md:160 | Identität wählen → „Effective Capability Resolved" live; Auflösungskette; Audit-Button | TeamsPage hat echtes CRUD, aber 0 dieser 3 Elemente | **P2** |
| F11 | **Secrets „Real-Time OPA Evaluation Stream" (#166)** | docs_dev/backlog/BACKLOG.md:161 | Live-Log ALLOW/BLOCKED (Actor/Secret/Timestamp) unter Engine-Karten | 0 Code; bräuchte B5-Endpoint | **P2** |
| F12 | **App-Typ-Icons im App-Discovery-Result (#156)** | AUDIT-DESIGN-GAP-LIST.md:286–288 (§6.4); docs_dev/backlog/BACKLOG.md:151 | Icons je erkanntem App-Typ (Docker-Hub-Metadaten) | `lib/app-icons.ts`/getAppIcon existiert (Sidebar/ScopeSelector nutzen es), in AppDiscoveryPage 0 Nutzung (verifiziert) | **P2** |
| F13 | **Projekt-Löschung unerreichbar (ProjectsPage tot, M5/#153/#140)** | AUDIT-DESIGN-GAP-LIST.md:265–269 (§5); docs_dev/backlog/BACKLOG.md:125 (M5), 148 (#153), 60 (#140: /projects nur Redirect) | Delete-Project-UI erreichbar (Ursache des alten „Geisterprojekte"-Wutausbruchs) | App.tsx:40 importiert ProjectsPage, rendert ihn NICHT; /projects = Navigate → /workspaces; DeleteProjectDialog existiert nur in der toten Datei. Einzige funktionierende Delete-UI unerreichbar | **P1** |
| F14 | **Sidebar-Konzept-Reste: WP0-Audit-Tabelle, Selection-Mode/Selection-Bar, A3 Auto-Deploy, A9 Suchfeld** | SIDEBAR-UX-FINAL-CONCEPT.md:477 (WP0), 482 (WP4), 452 (A3), 458 (A9); docs/backlog/BACKLOG.md:15 (S137-7 „zurückgestellt"); glm-sidebar-scope-redesign.md:44–60 (Audit-Pflicht VOR UI) | Endpoint-Audit „Multi-fähig?" VOR Multi-Select-UI; Ctrl+Klick-Selection + Aktions-Bar; „Standard-App sofort mitdeployen"-Checkbox; Baum-Suchfeld | WP0-Tabelle existiert NICHT (grep „Multi-fähig" nur in Audit/Concept-Docs), obwohl Multi-Select-UI längst gebaut ist (SPRINT-52) — Reihenfolge verletzt; WP4/A3/A9 nicht gebaut (A3 braucht keine neue Route mehr — /api/workspaces/deploy existiert — nur die Checkbox fehlt) | **P0** (WP0), **P1** (A3), P2 (A9) |

**Erreichbarkeits-Restbefunde (P1/P2):** `/security/findings` hat weiterhin KEINEN Nav-Eintrag (section-nav 0 Treffer, EVENTS_ITEMS ohne findings — nur 1 Inline-Link; AUDIT P0 #3 teilerledigt: firewall-rules + siem sind via Sidebar erreichbar, findings nicht); `/overview` weiterhin ohne expliziten Nav-Eintrag (nur Root-Redirect); `/dbs/datalake` ohne Nav; `mesh://llm-proxy:8080/v1`-Pill (ProxyChainsPage:270) weiterhin kopierbare Nicht-URI (Mandat-2-Rest); ContainerLogViewer.tsx:17,155 stale TODO-Kommentare lügen (Route existiert); App-Typ-Drift `a.projectId` in ProjectDetailPage:103 (§6.1); §8.3b RBAC-Visibility (Company Project, Scratch-Section, Sichtbarkeitsfilter) weiterhin PLANNED (ARCHITECTURE.md:346–368 — nur die Workspace-NAMEN sind gebaut); Detailseiten-Dreifachansicht offen (ARCHITECTURE.md:431–433); i18n-Parität: 18–21 der 60 Locales en-Fallback (Sprache-Switcher-Beschwerde CHAT_LOG_20260913.md:595–601 nur für neue Keys behoben).

---

## 3. INTEGRATIONS geplant, nie gebaut

| # | Feature | Geplant in | Versprochen | Code-Realität | Prio |
|---|---|---|---|---|---|
| I1 | **Firebase Dual-Auth (GitHub/Google via Firebase)** | TASK-088-firebase-auth.md (komplette Spec: 3 Login-Buttons, VITE_AUTH_MODE hybrid, POST /api/auth/firebase, provider_credentials-Tabelle, Connected-Accounts-UI); Operator 15.9. erstellte das Firebase-Projekt jimesh-71d25 | OAuth-Login neben Keycloak; Tokens verifiziert; Connected Accounts in Settings | 0 Code (Frontend UND Backend). Nur .env-Variablen existieren. **GDrive:** nirgends geplant — 0 Treffer in allen Quellen (kein Plan = kein Befund, hier der Vollständigkeit halber dokumentiert) | **P1** |
| I2 | **Gmail-Plugin (ad1-Pattern)** | TASK-PLAN-PLUGIN-SYSTEM.md:98–101 (TASK-112); docs_dev/backlog/BACKLOG.md:53 (#112) | OAuth readonly+send, Inbox-Widget, Q10-Referenz-Nachbau | grep gmail in src = 0. Nie begonnen (blockiert auf Plugin-Fundament W108/110) | **P1** |
| I3 | **OpenClaw-Plugin (Security-Wrap-Flagship)** | TASK-PLAN-PLUGIN-SYSTEM.md:93–96 (TASK-111); docs_dev/backlog/BACKLOG.md:52 (#111) | OpenClaw als isolierte Workspace-App (VLAN+gVisor+WAF, Egress nur LLM-Endpunkte) + native Panel + Chat | 0 Code (Deployment-Research offen) | **P1** |
| I4 | **Agent-Connector-Family als Plugin (Gemini-CLI/OpenCode/Claude-Code)** | TASK-PLAN-PLUGIN-SYSTEM.md:103–106 (TASK-113); #113 | Family-Plugin mit BYO-Key, Session-Panel, Lizenz-Zitate-Doc | Die Frameworks sind als DEPLOY-Presets echt gebaut; das PLUGIN (Katalog+Chat+Session-Panel) = 0 Code | **P2** |
| I5 | **Docker-MCP-Hub-Plugin** | TASK-PLAN-PLUGIN-SYSTEM.md:108–110 (TASK-114); #114 | Katalog-Browse + MCP-Server-Deploy als Workspace-App, Auth NIE über Docker-Toolkit | 0 Code | **P2** |
| I6 | **Tailscale Magic-Certs / App-SSL-Automation (TASK-083)** | CHAT_LOG_20260913.md:622–628 („wieso haben wir egentlich keine certs für unsere apps? können wir das nicht mit tailscale headscale machen?"); docs_dev/backlog/BACKLOG.md:28 (#083) | Automatisierte `*.ts.net`-ACME-Certs für Apps | 0 Code (R42-Plan: ACME DNS-01 via Tailscale) | **P1** |
| I7 | **Cloudflare-Tunnel + Exposed-Ports-Default-WAF (TASK-081/081a/082)** | CHAT_LOG_20260913.md:630–637; R42-Erweiterung | Extern erreichbare Ports über Cloudflare mit Edge-TLS; Router-Ports nur für nicht-HTTP; Default-WAF auf exponierte Ports | 0 Code für Tunnel/Default-WAF. TASK-082-UI-Teil ist als WafMatrixPage gebaut (misst Coraza-Sidecar), aber keine Default-WAF-Policy | **P1** |
| I8 | **saits-crew als Trading-Plugin (Bybit SA-Auth)** | TASK-PLAN-PLUGIN-SYSTEM.md:127–129 (saits-P3: „SA-Auth für Bybit-Key, WAF-Whitelist nur Bybit-API, VLAN-Isolation — der Showcase"); docs_dev/backlog/BACKLOG.md:63–65 | Trading-Crew als JiMesh-Plugin mit Broker-API-Anbindung (Bybit) | grep bybit in jimesh-crew = 0. saits-P1 (Rebuild: public, Discord-frei, Redis-Streams-Broker) + P2 (eigene Widgets) ebenfalls nie gestartet — Operator: „Quell-Basis erst klären" | **P1** |
| I9 | **Aikido Zen als Third-Party-Firewall-Interface** | docs_dev/backlog/BACKLOG.md:38 (#094) | BYOF-Integration Aikido Zen | 0 Code (BYOF generell = dokumentierter Stub) | **P2** |

**Hinweis (kein Gap):** Broker-Registry/databroker_scanner (86.712 Domains) IST gebaut und live (RM20 ✅, /registry/stats + /registry/lookup). OAuth Google+GitHub über KEYCLOAK ist konfiguriert (#073 ✅) — nur echte OAuth-Creds + E2E-Browser-Test sind Operator-Aktionen. mTLS, WebSocket-Proxy, Langfuse-Tracing, DSH-Deploy-Framework: gebaut.

---

## 4. PLUGINS geplant, nie gebaut

Basis: TASK-PLAN-PLUGIN-SYSTEM.md (R45-Konsensus, Execution-Order 106 → 108/110 → 107 → 109 → Plugins) + Backlog #106–116.

| # | Feature | Geplant in | Versprochen | Code-Realität | Prio |
|---|---|---|---|---|---|
| P1 | **#107 Plugin-Registry-API** | TASK-PLAN-PLUGIN-SYSTEM.md:71–78; docs_dev/backlog/BACKLOG.md:48,220 | Dynamischer Catalog aus plugin.yaml-Manifesten, `POST /api/plugins/{id}/install|enable|disable`, `DELETE` mit Lifecycle, `GET /api/plugins/{id}/health`, verallgemeinerte Events-SSE | gateway/plugins.go: handgeschriebener 4-Eintrag-Katalog (jules/linear/github_app/meshsquad), Echo-Installationen (s. B15). Keine plugins-Tabelle, kein Lifecycle, kein Health, keine generischen Events | **P1** |
| P2 | **#108 Auth-Connector-Framework** | TASK-PLAN-PLUGIN-SYSTEM.md:52–59; #108 | AuthConnector-Interface (APIKey/ServiceAccount/OAuthCodeExchange), Token-Storage konsolidiert in secrets, generischer Auth-Bindungs-Dialog, service_accounts-Tabelle | `internal/plugins/auth/` existiert nicht. service_account-FLOW für meshsquad offen (B16) | **P1** |
| P3 | **#109 Secret-Scope-RBAC + Workspace-Tokens** | TASK-PLAN-PLUGIN-SYSTEM.md:80–87; #109 | `consumer_keys.scopes[]`, Workload-Identity-Tokens, OPA plugin-/secret-scope-Domänen, Project-Override nur enger | consumer_keys kind=service existiert; scopes[]-Spalte + OPA-Domänen = 0 Code | **P1** |
| P4 | **#110 Frontend-Surface-Renderer** | TASK-PLAN-PLUGIN-SYSTEM.md:61–69; #110 | Surface-Registry, native lazy-Komponenten, sandboxed iframe, Widget-Slots, globales Plugin-Chat-Panel mit `plugin_chat_messages` | 0 Code — keine /plugins/:id-Fläche (s. F3) | **P1** |
| P5 | **#111–114 konkrete Plugins** | s. I2–I5 | OpenClaw, Gmail, Connectors, Docker-MCP | Alle 0 | **P1/P2** |
| P6 | **#116 Dev-Docs + SDK + Q10-Abnahme** | TASK-PLAN-PLUGIN-SYSTEM.md:116–119; #116 | DEVELOPER-GUIDE, Template, unabhängiger Gmail-Nachbau als Doku-Abnahme | 0 (nur SPEC.md/schema/Validator aus #106 existieren) | **P2** |
| P7 | **meshsquad-Echtinstallation (MESHSQUAD WP6)** | MESHSQUAD_INTEGRATION_PLAN.md:209 (WP6-Zeile mit allen Unterpunkten) | Manifest-Ingestion, Install-Persistenz, Wrapper-Routen, Health-Probe, service_account, iframe-Rendering, Chat-Panel + Auto-Topic-Provisioning, Secrets-Scope-Wiring, Egress-Enforcement | komplett offen (B15/B16 + Chat-Panel/Auto-Topic s. A3) | **P0** |
| P8 | **Plugin-Chat-Panel (tinode-Team-Topics im JiMesh-UI)** | MESHSQUAD_INTEGRATION_PLAN.md:87 („Plugin-Chat-Panel, das die Team-Topics des installierten meshsquad rendert … pro Team automatisch ein Gruppen-Topic + topic_map-Eintrag provisionieren") | Chat-Surface im JiMesh-Frontend | 0 Code auf jimesh-Seite (chat-gateway + tinode sind crew-seitig echt gebaut) | **P1** |

---

## 5. SECURITY geplant, nie gebaut

| # | Feature | Geplant in | Versprochen | Code-Realität | Prio |
|---|---|---|---|---|---|
| S1 | **Llama-Guard-Dashboard-Setting (Phase 1: „null neue Backend-Zeilen")** | rm32_guardrails_concept.md:673 (J1), 567–655 (§5 Design); rm00-Prompt #53 („da müssen wir nur ne llama guard setting im dashboard bauen wo der user seine extra rules definieren kann") | Settings-UI für `guard_scanner.*` + eigene Extra-Rules über Session-/X-Header (agent id + session) | grep guard_scanner in src/frontend = 0 Treffer. Backend fertig, Frontend fehlt komplett (L1) | **P0** |
| S2 | **eBPF/Tetragon-Guard-Enforcement** | rm32_guardrails_concept.md:14–53 (Nachtrag: Operator „können wir das dann bitte bitte bitte endlich mit ebpf machen und das scheiss prompt injection schiess wurde ja auch nie gebaut"); rm00-Prompts #54/#56 | Bei Guard-Treffer aktive Durchsetzung: Tetragon-TracingPolicy killt/blockiert den auslösenden Agent-Prozess in Millisekunden („Container einriegeln") | Guard-Hook = nur Logging/Fail-Open, kein aktives Eingreifen; Tetragon-Policy 0 Code; „noch nicht gebaut, konkreter nächster Schritt" | **P0** |
| S3 | **Per-Project-Guard-Rules** | s. B2 (TASK-081/081) | s. B2 | s. B2 | **P0** |
| S4 | **Streaming-Scan** | s. B3 | s. B3 | s. B3 | **P0** |
| S5 | **Egress-Enforcement (K-LAF Stufe 4 / L8 / C6)** | rm32_guardrails_concept.md:224 (L8: „Egress-Blackhole bewusst offen; nur deklarativ"), 667 (C6); MESHSQUAD WP6 („Egress-Enforcement prüfen"); CHAT_LOG_20260911.md:114 (Zero-Port-Mandat als Kontext) | `security.egress`-Domains aus plugin.yaml WIRKLICH durchsetzen (Compose-Netz/Socket-Proxy) | plugin.yaml listet Domains, erzwingt nichts. Infra-Level (isoliertes Egress-Netz, Zero-Port) existiert; per-Plugin Enforcement 0 | **P1** |
| S6 | **Unverified-Session-Enforcement (L9)** | rm32_guardrails_concept.md:225 | Freeze greift für Token-lose Clients (heute nur `unverified:<hint>`-Label) | by design offen, dokumentiert | **P2** |
| S7 | **Trust-Ratchet-light (`auto_freeze_threshold`, J5) + Guard-Trace-ID (L6/J3)** | rm32_guardrails_concept.md:677,675 | Auto-Freeze-Schwelle auf Freeze-Infra; recordGuardFinding mit trace_id | 0 Code (freeze.go/recordGuardFinding unverändert) | **P2** |
| S8 | **Red-Team-Suite (S3-WP4)** | docs/backlog/BACKLOG.md:163 („S3-WP4 [ ] offen") | Ausführbare Red-Team-Suite gegen die eigenen Gates | Nur Policy-Regressionstests (policy/redteam_test.go Canary + 5 Header-Spoofing-/RBAC-Tests) — keine Suite/ kein UI | **P2** |
| S9 | **WAF Rate-Limit- + Geo-Schicht** | docs/backlog/BACKLOG.md:24 (S136-1: „Rate-Limit/Geo ehrlich inaktiv … bis eine echte Schicht existiert") | Rate-Limiting + Geo-Filterung pro exponiertem Port (WAF-Matrix-Spalten) | cmd/waf-sidecar/Caddyfile hat kein rate_limit (grep=0); Geo existiert nirgends. Nur OWASP-CRS im Sidecar | **P2** |
| S10 | **WAF v2 Regel-Editor + faced_by_waf + Remote-SSH-Smoke** | docs_dev/backlog/BACKLOG.md:107 (#057 offen-Spalte) | Regel-Editor im Frontend; WAF-Flag an Deployments | 0 (Coraza-Sidecar v1 mit fixen CRS-Regeln, live geblockt SQLi/XSS — Kern gebaut, v2 offen) | **P2** |

**Hinweis:** Falco+Wazuh-Bridge, DLP-Hook, Regex-Scanner, Freeze/Quarantine, Capability-Gate, Subagent-Approval-Queue, OPA-RBAC (project-roles/capabilities/headscale), VLAN-Isolation, Exposure-Scan, WAF-Matrix-UI, Agent-Config-Scanner, Security-Findings-Wiring (S53-4): GEBAUT.

---

## 6. AGENT-FEATURES (meshsquad/crew) geplant, nie gebaut

| # | Feature | Geplant in | Versprochen | Code-Realität | Prio |
|---|---|---|---|---|---|
| A1 | **MESHSQUAD WP2–WP7 (alles außer Rename)** | MESHSQUAD_INTEGRATION_PLAN.md:3 („WP2–WP7 geplant"), 205–210 (Roadmap) | Branch-Konsolidierung, Public-Repo (frische Historie, CI-Gates, Lizenz), Tier-1-Extraktion + Dashboard-Trim, Public-Manifest v0.3, jimesh-Plugin-System (WP6), Publish + AWS-Key-Rotation najani-admin | WP1 ✅ (Rename). WP2: BACKLOG.md hat weiterhin ungelöste Merge-Conflict-Marker (`<<<<<<< HEAD` in rm00:123–199 verifiziert); WP3–WP7: 0 — Dashboard trägt noch `app/{pool,risk-chat,sessions}/` + MainnetWarningBanner (verifiziert), kein LICENSE, keine CI-Gates | **P1** |
| A2 | **crew1-7 gVisor-Migration** | crew BACKLOG.md:49 („crew1-7 laufen weiterhin unter runc — Migration offen"); rm26_gvisor-Sprint Offene Punkte 1–7; rm00 #43 („gvisor implementieren") | Alle Crew-Container unter runsc; kritische Pfade (DOCKER_HOST unter runsc, Discord-Bridge, VNC) verifiziert | runsc auf Trading-Node installiert (27.9.); marketing-agents-Deploy-Weg gebaut (deploy-marketing-agents.sh); aber Live-E2E offen (Stack war down), executeDeploy-Detection-Follow-up offen, crew1-7 unangetastet | **P0** (mehrfach verlangt) |
| A3 | **Chat-Layer-Restpunkte: human_message-Watches je Team-Preset, Auto-Topic-Anlage, UI-Branding/Reverse-Proxy-Auth** | rm27-Doc (Offene Punkte, Zeilen 108/139/206/209/212); rm00-RM27-Status | Menschen erreichen ein Team (Presets watchen kein human_message); pro Team automatisch ein Topic; tinode-Web-UI (127.0.0.1:6060, offene Registrierung!) hinter Auth | chat-gateway + tinode + MESSAGING_BACKEND-Wahl = live verifiziert; alle 3 Restpunkte 0 | **P1** |
| A4 | **Checkpoint-Summaries / Global Checkpoints (leichtgewichtiges Modell)** | rm00-Prompt #34 („wäre auch nice über ein lightweight model einfach zusammenfassungen also global checkpoints zu bauen — wenn er zurück in den channel kommt, kriegt er erstmal die zusammenfassung für den zeitraum"); rm32 C4 | Busy-Agent bekommt beim Wiederkommen eine Zusammenfassung des verpassten Zeitraums (Provenanz-Objekt, nie stiller Ersatz) | 0 Code (C4: „Ausweis {session_id, model, ts, window}" nur Konzept). busy/idle-Puffer + Inbox + Pagination = RM29 ✅ gebaut | **P1** |
| A5 | **Model-Collapse-/Misalignment-Prävention C2/C3** | rm32_guardrails_concept.md:663–665 (C2 Done-Criteria+Verify-Gate, C3 Repetitions-Detektor), §4 (7 Mechanismen) | Terminierende Teams mit ehrlicher Verweigerung; deterministische Wiederholungs-Detektion | 0 Code (nur C1 Router-Wiring umgesetzt) | **P1** |
| A6 | **RedisStreamsBackend im marketing-agents-Bus** | MESHSQUAD_INTEGRATION_PLAN.md:141 („RedisStreamsBackend Stub vs. Manifest-Aussage ehrlich auflösen"); crew BACKLOG.md:36 („Redis-Streams-Backend weiterhin ehrlicher Stub") | Bus-Garantie ohne chat-gateway auf echten Redis Streams | message_bus.py:92–115 = Stub mit ehrlichem Fehler; echte Redis-Streams-Implementierung sitzt nur im chat-gateway | **P2** |
| A7 | **deepagents-Kompatibilität + LangGraph-Auswertung + Repo-Extraktion/Name** | crew BACKLOG.md:53–56 (RM31 open points); rm31-Sprint | deepagents-Harness-Check (Stub steht), LangGraph-Evaluation, eigenes Public-Repo (Name = Operator-Entscheid) | Stub+TODO in harnesses.py, keine Prüfung; pyproject-Name weiter offen; Extraktion blockiert auf Operator-Entscheid | **P2** |
| A8 | **Crew-Session-/Guard-Integration tiefer (X-Header → Agent-ID/Session → ACL)** | CHAT_LOG_20260913.md:147–151 (Prompt 0.13: „ich will diese sessions in den x-headers unbedingt mit allen projekten endpoints usw verbinden dann haben wir direkt auch acl für agents"); rm32 §1.2 | Agent-Identität durchgehend über Session-Header; Guard/Finding einer Agent-Session zuordenbar (Enforcement für Unverified s. S6, Trace-ID s. S7) | X-Header server-set + consumer_keys session_id = gebaut; Guard-Trace-Kopplung + per-Project-Rules offen (B2/L6) | **P1** |

### 6b. Alte Crew-Sprints RM4–RM18 — Rollforward-Offen-Items (aus crew/docs/planning/BACKLOG.md:15–38 + 123–128)

Diese Punkte stehen im Crew-Sprint-Index als offen/in-progress und wurden oben nicht einzeln verifiziert, weil ihre Träger teils im alten crew1-7-Stack bzw. im ZIEL-REPO st-2/leo-bot liegen (nicht in jimesh-crew/services):

| Sprint | Offen-Item (Quelle: crew BACKLOG) | Status lt. Index |
|---|---|---|
| RM5 | Settings-Schema-Consolidation Restblöcke (crew3/crew2/crew7) | 🔄 in progress |
| RM7 Phase 4 | **Persistenter VNC-Supervisor** (crew7) | pending |
| RM8 Phase 4 | `USE_SURREAL_VECTOR=true` 24h-Sign-off + Qdrant-Removal-Verify + **Re-Seed der KB** (HNSW-Index 384 vs. 3072-dim-Gemini-Embeddings → Vektorsuche tot, nur BM25 live — G1/G12) | offen |
| RM10 | **Mobile Views Phase 2** (crew3) | 🔄 in progress |
| RM12 | **Presets → SurrealDB-Migration** | 📋 not started |
| RM17 | Model-Presets-PR #3332 (Rebase), Vault→saits-live-ai LLM-Key-Injection, **4 Services ohne Docker-Healthchecks**, **Telegram-RM-Tool** (roadmap 31149b2) | open actions |
| RM18 | Gap Clearance G1–G25 — **Achtung Repo-Grenze:** die G-Items (G10 Unified-Logs-Widget mit Livestream/Split-Pane, G15 Post-Trade-Analytics-APIs `/api/trades/{id}/overlays`+Equity-Curve+Timeline, G12 RAG-Ingest-Endpoint+SSE, G17 Coin-scoped Risk-Settings, G18 RA→RM-Escalation-Learning, G19 per-Agent-Model-Registry mit qwen, G21 KB-Reranking, G22 Settings-Live-Refresh-Rest, G23 lautes Model-Error-Logging, G24 Tags, G25 TS-Codegen aus Schemas) referenzieren Pfade aus st-2/leo-bot (`/app/src/lcore/…`, `cryptobot_live/knowledge`) — gegen jimesh-crew/services NICHT verifizierbar; sie sind im Crew-Backlog als offene Trading-Bot-Aufgaben gerollt (Quelle: crew BACKLOG.md:62–97, 99–108, 123–142) | 🔄 / [ ] |

---

## 7. DEPLOY/DEVOPS geplant, nie gebaut

| # | Feature | Geplant in | Versprochen | Code-Realität | Prio |
|---|---|---|---|---|---|
| D1 | **GO-PUBLIC Phase 0–2 (Rotation, Tree-Scrub, History-Rewrite)** | GO-PUBLIC-PLAN.md:3 („PLAN, nicht ausgefuehrt. Jedes [ ] ist eine Operator-Aktion"), 212–218 (Phase 0), 285–314 (Phase 1), 317–400 (Phase 2); CHAT_LOG_20260913.md:643 (Operator: „lass uns jetzt mal erstmal die ganzen leaks aus der repo entfernen") | sys_ex-Passwort-Rotation (OP-01), alle 57 .env-Secrets rotieren, SSH-Härtung, Tree-Scrub (IPs/Creds/Docs), git-filter-repo-Scrub der 794-Commit-History | NICHTS ausgeführt: docs/SSH-ACCESS-ROUTES.md + docs/DEPLOYMENT-URLS-2026-09-19.md stehen NOCH im Tree (verifiziert), keine .gitleaks.toml, kein gitleaks-CI-Job, Rewrite-Tools nie installiert, OP-01/OP-04 offen (docs/REQUESTS-TRACKING.md H1/H2: „History-Rewrite NICHT durchgeführt") | **P0** (Sicherheit; Operator hat es direkt befohlen) |
| D2 | **ENCRYPTION_KEY-Rotations-Routine** | GO-PUBLIC-PLAN.md:234 („nicht einfach drehen: Rotationsroutine nötig (alle verschlüsselten Rows re-encrypten), sonst Datenverlust. Eigener Task.") | Re-Encrypt-aller-vault_secrets-Routine für Key-Wechsel | 0 Code | **P2** |
| D3 | **Ansible-Restructure WP3–WP6 (#117)** | docs_dev/backlog/BACKLOG.md:62 („[~] in Arbeit … WP3-WP6 offen"); SPRINT-44 | docker-compose komplett durch Ansible ersetzt; saubere Topologie-Konfiguration | config/ ist weg (WP1 erledigt), ABER: „config/topology.yml-Prämisse war falsch — main.go/vite.config.ts lesen config/topology.json, das es nie gab (toter Pfad, immer Default-Fallback)"; Root-Dockerfile-Verlust bereinigt; src/backend/Dockerfile an KEINE CI angeschlossen | **P1** |
| D4 | **Direkter SSH-/Ansible-Deploy-Weg blockiert (#126)** | docs_dev/backlog/BACKLOG.md:74 („Blockiert den normalen Ansible-Redeploy-Weg komplett") | `make redeploy`/`make provision-node` gegen trading über Public-IP | Timeout (Firewall-Drop-Charakteristik); Workaround VPN-Tunnel Port 2222; Ursache (IPv4-only-iptables vs. IPv6?) nie untersucht | **P1** (operativer Blocker) |
| D5 | **podhead-client ansible-task.yml (#120-Rest)** | docs_dev/backlog/BACKLOG.md:68 | Client-Container per Ansible statt manuellem docker run | Image+Entrypoint robust (✅), aber weiterhin manuell erstellt, keine Ansible-Aufgabe | **P2** |
| D6 | **Live-Smoke-Verifikationen offen (Verifikations-Schuld)** | docs/backlog/BACKLOG.md:16,29,42,52,63,76,84 (S137-8, S136-6, S135-6, S57-5, S54-WS-3, S134-6 …) | Jede dieser Sprints braucht den Operator-Live-Smoke am laufenden Stack | Stack war down — alle Live-Smokes offen (DB-Contract-Tests liefen) | **P1** |
| D7 | **jimesh-net-Host-Networking kaputt (Mandat-12-Territorium)** | docs_dev/backlog/BACKLOG.md:14 (S47-WP8-Note) | Container-Netzwerk für Tests/CI funktional | „jimesh-net-Container-Networking vom Operator klaeren" — offen | **P1** |
| D8 | **check:i18n auf main ROT (S57-H Merge-Schuld)** | docs/backlog/BACKLOG.md:53 (S57-H: „main@3c44204 … 59 Locales noch mit toten Keys → check:i18n auf main ROT (59 Fehler). fix-crashes-integrations nach main mergen") | i18n-Gate grün auf main | Merge offen | **P1** |
| D9 | **Backend-Dockerfile in CI + gitleaks-Gate + Public-CI-Runner** | GO-PUBLIC-PLAN.md:416–418 (Phase 4), 385 (#101/CI-Fix-Kontext) | Go-Backend-Image in der CI gebaut; Secret-Scanning als CI-Job | ci.yml hat 3 Jobs ohne Root-Install (#101 ✅), aber backend-Dockerfile + gitleaks nicht angebunden | **P2** |
| D10 | **Migrations-Fehler Fresh-DB (TASK-070-FUND-1)** | docs_dev/backlog/BACKLOG.md:102 („migrate() ALTERs vor CREATEs → frische DBs ohne Zusatzspalten, GetProject bricht") | Frische Installation startet ohne manuelle Reparatur | Gefunden, eigener Task zugewiesen, nie gefixt (S135-3 hat EINEN Fall nachgezogen — headscale_user —, die Klasse bleibt offen) | **P1** |

---

## 8. UTILITY-Features geplant, nie gebaut

| # | Feature | Geplant in | Versprochen | Code-Realität | Prio |
|---|---|---|---|---|---|
| U1 | **Terminal-Integration im App-Detail (PTY)** | docs_dev/backlog/BACKLOG.md:61 (#141: „Terminal-Integration ist nur ein TODO-Platzhalter … toast.info, keine echte Funktion dahinter — http/code-server/vnc sind echt verdrahtet, Terminal nicht"); CHAT_LOG_20260911.md:53 (Provisioning-Shell-Wunsch als Kontext) | [T]-Badge/IntegrationCard öffnet echte interaktive Shell des Containers | AppDetailPage.tsx:160–161: `toast.info(t('appDetail.connectTerminalTodo'))` — verifiziert. Sidebar-[T]-Badge (S137) geht über Tunnel-iframe (3080/gotty) als Umweg; direktes in-app PTY fehlt | **P1** |
| U2 | **Provisioning-Terminal-Logs bei gVisor-Install (Original-Wunsch)** | CHAT_LOG_20260911.md:51–55 („wieso wird da keine provisioning shell aufgemacht im dashboard?") | Live-SSH-Log-Konsole bei Provisioning | 2026-09-11 als schwebende Retro-Konsole gebaut; heutiger OnboardingPage-SSH-Probe nutzt POST /api/nodes/provision + live Log — ERLEDIGT (kein Gap mehr, zur Delta-Sicherheit notiert) | — (erledigt) |
| U3 | **jimesh_services-Overlay + Utility-Apps ausblendbar (Sprint-D2, #091)** | docs_dev/backlog/BACKLOG.md:35 (#091 „[ ] geplant"); SPRINT-D-ONBOARDING | Overlay-Section zeigt echte Platform-Container; Utility-Apps im Baum ausblendbar | ProjectExplorerSidebar.tsx:93–115: statische 3-Link-Box als Overlay-Deko — KEINE echten Container, kein Ausblenden. #135 (Auto-Workspace für platform-internal) blockiert durch #124 | **P2** |
| U4 | **Onboarding-Node-Step: Firewall- + Utility-App-Auswahl (#157)** | docs_dev/backlog/BACKLOG.md:152 | Onboarding fragt auch Firewall-Defaults + Utility-Apps | Gefunden, nicht spezifiziert, nicht gebaut | **P2** |
| U5 | **OpenAPI/docs_temp-Public-Pipeline (#085/#097)** | docs_dev/backlog/BACKLOG.md:30,42,97 („docs_temp/, OpenAPI Auto-Export … Scalar/Stoplight-Renderer für GH Pages") | Öffentliche API-Doku als statische Page | /openapi.json + OpenApiPage (in-App) existieren; docs_temp-Export/Static-Renderer/GH-Pages-Workflow = 0 | **P2** |
| U6 | **Workspace-Settings-Inheritance (#100)** | docs_dev/backlog/BACKLOG.md:44,133 („Unified port allocation, project-parent network assignment … Implementation pending") | Einheitliche Port-Allokation, Netz-Vererbung Project→Workspace, Auth-Settings-UI | WorkspaceSettingsPage existiert; Vererbungs-Logik 0 | **P2** |
| U7 | **Utility-Dependencies-API-Anbindung (#089) + Networking-Vollausbau-Rest (#098)** | docs_dev/backlog/BACKLOG.md:33,42 („[~] teilweise … API-Anbindung offen / echte VLAN-Daten fehlen") | Schemas an echte Routen; VLAN-Farben/IPs/Scanopy-Audit im Grid | Schemas+Grid-Komponenten da (NetworkEditingGrid wurde S53 als orphaned gelöscht); API-Anbindung offen | **P2** |
| U8 | **Python-Logger-Wrapper** | docs_dev/backlog/BACKLOG.md:91 (#036 offen: „Python-Logger-Wrapper") | `import jimesh_logger` für Python-Agenten | Go-SDK/Logger + Edge-Ingest gebaut; Python-Wrapper 0 | **P2** |
| U9 | **File-Upload** | — (keine explizite Planungsquelle gefunden; indirekt über F2 Stitch-Import) | — | File-BROWSER (`/api/ssh/explore` + FileBrowserModal) ist GEBAUT (gateway.go:293, einzige Registrierung — Alt-Duplikat entfernt). Ein Upload-Endpoint wurde in keiner Quelle spezifiziert; nur der Stitch-Import (F2) bräuchte eine | — (nicht geplant) |

**Hinweis:** Webshell/gotty, noVNC/neko-VNC, code-server, DSH-Deploy, exec/sandbox (`/api/exec/sandbox`, deploy.go:81), Container-Log-SSE, WebSocket-Completion-Proxy: GEBAUT. Playwright: existiert als echtes Tool-Flag im Deploy (TOOL_OPTIONS + projects_ssh.go:837-Install-Rezept); die Design-Checkbox aus Stitch-Prompt 5 wurde bewusst ersetzt (BrowserRuntimeModal.tsx:498–500: „The design's Playwright / TTL / tmpfs rows describe no backend behavior").

---

## 9. Bewusste Abweichungen (dokumentiert, KEINE heimlichen Gaps)

Diese Punkte wurden geplant, dann bewusst ANDERS oder ehrlich reduziert umgesetzt — sie gehören nicht zu „nie gebaut", verhindern aber falsche Vollständigkeits-Behauptungen:

1. **KasmWeb Chrome + VNC-Desktop (Stitch Prompt 5)** → bewusst ersetzt durch die echten Optionen (opencode WebRTC neko:xfce) — BrowserRuntimeModal mit Begründungskommentar (Backlog #139).
2. **Playwright/TTL/tmpfs-Zeilen im Browser-Deploy** → durch echte DeployRequest-Flags ersetzt (s. Utility-Hinweis unter der U-Tabelle).
3. **Sidebar-Dual-Toggle** → durch parallele Sektionen ersetzt (S137, Operator bestätigt: „BEIDE gleichzeitig sichtbar — nicht als Umschalter").
4. **DAST** → ehrlicher „not yet implemented"-Platzhalter in Navigation (kein Fake-Scanner).
5. **Datalake-Mock** → entfernt und als ehrliche not_connected-Statusanzeige neu gebaut (statt Pipeline zu faken).
6. **Projekt-Lösch-Wut** → Root Cause gefunden (F13), Fix bewusst auf M5 verschoben.
7. **HashiCorp-Vault-Integration (SPRINT-16)** → nie real; stillschweigend durch SPRINT-39-Secrets-Engine ersetzt, inzwischen als deprecated markiert (S53-2).
8. **GDrive** → in keiner Planungsquelle spezifiziert (s. I1).
9. **`GET /api/deployments`** → Alt-Backlog-#128-Behauptung ist obsolet: Route existiert (deploy.go:93) und wird genutzt; ARCHITECTURE.md §8.1 (Z. 304–307) ist STALE und sollte aktualisiert werden.
10. **`jimesh.secrets.get()`-SDK (#155)** → CODE IST GEBAUT (internal/sdksecrets + internal/sdk/secrets: Get/GetAs mit kv/secret/engine/apiKey — exakt die Operator-Signatur); nur die §8.3c-Doku hat sie nie nachgetragen. Kein Code-Gap, Doku-Gap.
11. **FlexGrid + Chain-Graph-Builder (CHAT_LOG Prompt 9: „das flexgrid ding aus dem agent dashboard … und auch einen graphbuilder für die fallback chains")** → GEBAUT: OverviewGrid auf react-grid-layout (S1-WP3) + Canvas-Graph-Routen `GET /api/chains/{id}/graph` + Knoten-CRUD (canvas.go:44–50) + ProxyChainsPage graph-first.
12. **Live-Analytics SSE/PubSub „wie im Trading Bot" (CHAT_LOG Prompt 8)** → GEBAUT: `/api/sse/{analytics,models,traces}` (analytics/realtime_sse.go:29–31) + RealtimeMonitor + SDK-Logs-SSE.
13. **Die 10 chronologischen Operator-Prompts aus USER_REQUIREMENTS_SUMMARY.md** → alle 10 im heutigen Code verifiziert gebaut (AUDIT-DESIGN-GAP-LIST §4, Zeilen 207–218 — inkl. mTLS, WS-Proxy, OpenRouter-Specs, Select-All/None, Paid/Free-Toggles). Doku-Drift: USER_REQUIREMENTS_SUMMARY.md selbst beschreibt noch die LEGACY-Architektur („SQLite CGO-Free", Ports 3009/3010) statt PostgreSQL/aktuelle Topologie — Modernisieren empfohlen (AUDIT §4-Anmerkung).

---

## 10. Delta zu früheren Audits — seither GEFIXT (nicht mehr als Lücke zählen)

| Alt-Befund | Status heute |
|---|---|
| Onboarding unerreichbar (AUDIT P0 #11/#12) | ✅ gefixt — NAVIGATION_ITEMS hat /onboarding (HierarchySidebar.tsx:209) + First-Start/Empty-State-Einträge (:1327,1381,1413–1422, „fix-onboarding-reach") |
| Doppelte /api/ssh/explore-Registrierung (PANIC) | ✅ nur noch EINE (gateway.go:293); deploy.go-Duplikat entfernt |
| PluginCatalogPage Fake-Ratings; PluginInstallWizard Fake-Test; PluginSettings Dead-Buttons; AgentSessionDetailPage „Theater"; WorkspaceDetailPage Fake-Daten; 4 tote 404-Calls; NetworkEditingGrid orphaned | ✅ alle gefixt (S50/S52-T2/S53 + #145-#171-Welle) |
| Active-Deployments-Hälfte auf /plugins | ✅ ActiveDeploymentsSection gebaut (S54/SPRINT-54) |
| 5-Design-Routen (App-Discovery, Deployment-Detail, SSH-Target-Detail, Browser-Integration) | ✅ gebaut |
| Secrets-Konsolidierung #099 | ✅ gebaut (/api/secrets + 4 Namespaces + SDK) |
| WAF-Matrix #082 + DLP-Live-Status #172 (UI-Teil) | ✅ gebaut (S136) — Restoffen: S9, B4 |
| Projekt-Server-Select (#173) + Projekt-Erstellung (#134) | ✅ gebaut (S134/S135) |
| Root-Redirect/Brand → /overview | ✅ erreichbar — aber weiterhin ohne expliziten Nav-Eintrag (F-Rest) |

---

## 11. Master-Prioritätenliste (Ableitung für den Operator)

### P0 — Operator-Verstöße (explizit/mehrfach verlangt, nie geliefert)
1. **Llama-Guard-Dashboard + per-Project-Rules + Streaming-Scan** (S1/S3/B2+B3) — Backend steht, UI/Polymodell/Streaming = 0. Operator-Zitate: rm00 #53, CHAT_LOG 33.2, rm32-Nachtrag.
2. **eBPF-Enforcement (Tetragon-Policy)** (S2) — „bitte bitte bitte endlich".
3. **Plugin-System-Echtintegration: Install-Persistenz, Manifest-Ingestion, meshsquad WP6** (B15/P7) — „was ist mit meshsquad integration/plugin?"
4. **Phantom-MCP-Routen linear/github/dsh fixen** (B14) — MCP-Tools laufen in 404.
5. **Multi-Select-Audit-Tabelle nachholen** (F14/WP0) — Operator-Bedingung wurde verletzt; bis dahin ist ungeprüft, ob die gebauten Multi-Scopes überall echt filtern.
6. **SIEM-Permanent-Scan-Rest (Shipper/Ruleset/make siem)** (B8) — „erstmal ist wichtig das wir in unseren safe environments die siem haben und permanent gescannt werden".
7. **GO-PUBLIC Rotation + Tree-Scrub + History-Rewrite** (D1) — Leaks (inkl. SSH-ACCESS-ROUTES.md mit Operator-Allowlist-IP) stehen weiter im Tree.
8. **crew1-7 gVisor-Migration + Live-E2E** (A2).

### P1 — Explizit verlangt / hoher Nutzerwert
9. Projekt-Löschung erreichbar machen (F13/M5) · 10. Vault-Access-Matrix (B5+F4) · 11. Agent-Chat-Proxy-Status (F6) · 12. Trace-Backend F-05 (B1) · 13. Command-Palette-Live-Suche (F9) · 14. Firebase-Auth (B17/I1) · 15. Gmail + OpenClaw + Auth-Connector + Surface-Renderer (P2/P3/P4, I2/I3) · 16. meshsquad-Chat-Panel + Auto-Topic (P8, A3) · 17. Checkpoint-Summaries (A4) · 18. Certs/Tailscale-Magic + Cloudflare-Default-WAF (I6/I7) · 19. Suricata-Anomaly (B7) · 20. DLP-Event-Stream (B4) · 21. Terminal-PTY (U1) · 22. Egress-Enforcement (S5) · 23. Ansible-Rest + #126-SSH-Blocker + #124-Probe + Migrations-Bug (D3/D4/D7/D10) · 24. Live-Smokes + i18n-main-Merge (D6/D8) · 25. saits/Bybit-Plugin-Rebuild (I8) · 26. Admin-Deploy-Gate prüfen (B18) · 27. /security/findings-Nav (F-Rest) · 28. A3 Auto-Deploy-Checkbox (F14) · 29. meshsquad WP2–WP7 Publish-Kette (A1).

### P2 — Vereinbart, nie aktiv eingefordert
Datalake-Pipeline (B10) · DB-Discovery (B11) · K-LAF-AWS (B9) · Rotate (B6) · iac-files/{fileId} (B12) · apps/{id}/integrations (B13) · Red-Team-Suite (S8) · WAF-v2/Rate-Limit/Geo (S9/S10) · SPIFFE/SPIRE (#118) · Trust-Ratchet/Trace-ID/Unverified (S6/S7) · Dashboard-Builder Phase 2 (F7) · Quick-Deploy-Bar (F8) · Teams-Simulation (F10) · OPA-Stream (F11) · App-Icons (F12) · Stitch-Import (F2) · Plugin-Detail-Route (F3) · Admin-Utility-Keys (F1, Operator-Klärung) · Docker-MCP/Connectors-Plugin/Dev-SDK (I4/I5/P6) · Aikido (I9) · deepagents/LangGraph/Repo-Name (A7) · RedisStreamsBackend (A6) · ENCRYPTION_KEY-Routine (D2) · podhead-ansible (D5) · CI-Erweiterungen (D9) · jimesh_services-Overlay (U3) · Onboarding-Erweiterung (U4) · docs_temp (U5) · Settings-Inheritance (U6) · Utility-Anbindung (U7) · Python-Wrapper (U8).

---

*Erstellt vom Vollständigkeits-Audit-Agent (DSH), 27.9.2026. Kein Code verändert — nur Analyse. Jeder Fund wurde am selben Tag gegen den echten Code verifiziert (Zeilenangaben im Text). Dieses Dokument ergänzt AUDIT-DESIGN-GAP-LIST.md (56-Design-Audit) und AUDIT-2026-09-21-GAP-LIST.md (#142–172) um den vollen PLAN-vs-CODE-Vergleich über ALLE Planungs-Quellen inkl. Crew-Repo.*
