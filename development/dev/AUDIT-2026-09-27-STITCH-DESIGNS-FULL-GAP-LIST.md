# Komplette Design-vs-Code Gap-Liste — alle Stitch-Screens (27.9.2026)

Methode: Cross-Check aller 52 `jimesh-*`-Design-Dateien in `design-assets/stitch/`
gegen den echten Frontend-Code (`src/frontend/src/App.tsx` Routen-Tabelle +
jede referenzierte View/Component-Datei, vollständig gelesen, keine Vermutungen).
Baut auf `docs_dev/backlog/BACKLOG.md` (#159-173) und
`docs_dev/AUDIT-2026-09-21-GAP-LIST.md` auf — Designs, die dort schon
tiefengeprüft wurden, wurden hier **erneut verifiziert** (nicht nur zitiert),
weil zwischen 21.9. und heute mehrere Sprints gelandet sind, die frühere
Befunde überholt haben. `website-docs`/`website-landing`/`website-tour`
(Marketing-Site) sind ausgeschlossen. `jimesh-design-assets-folder` ist
ebenfalls ausgeschlossen — siehe Anmerkung am Ende, es ist kein Produkt-Screen.
Damit bleiben 51 klassifizierbare Designs (der Auftrag sprach von "47", die
tatsächliche Dateizahl in `design-assets/stitch/` ist aber 52 `jimesh-*`-Dateien
+ 3 Website-Dateien = 55 total; die Differenz ist rein eine Zähl-Ungenauigkeit
im Auftrag, kein Befund).

**Wichtigste Erkenntnis vorab:** Mehrere Designs, die der 21.9-Audit noch als
"NICHT GEBAUT" oder "gemockt" führte, sind seither (SPRINT-54 u.a., zwischen
21.9. und 27.9.) tatsächlich echt gefixt worden: die 5 Designs aus Backlog
#128 haben jetzt alle eine Route, `PluginCatalogPage.tsx` (#145) hat keine
Fake-Ratings mehr, `PluginInstallWizardDialog.tsx` (#168) und
`PluginSettingsPage.tsx` (#169) simulieren keine Vertrauens-Signale mehr, und
`ActiveDeploymentsSection.tsx` (#170) hat die fehlende Sidecar-Management-Hälfte
von Integrations & Plugins nachgebaut. Der Code bewegt sich schneller als die
Backlog-Dokumentation — dieses Dokument ist der aktuelle Stand.

---

## Gruppe 1 — NOT BUILT (kein passendes Route/Component im Code, 6 von 51)

| Design | Route/File | Belege |
|---|---|---|
| jimesh-app-selector-modal | keine Datei im Frontend | `grep -rli "selectormodal\|selector-modal"` findet nur `ScopeSelectorModal.tsx` + 2 Referenzdateien — kein App-Selector existiert |
| jimesh-project-selector-modal | keine Datei im Frontend | dito |
| jimesh-workspace-selector-modal | keine Datei im Frontend | dito |
| jimesh-target-selector-modal | keine Datei im Frontend | dito — bestätigt Backlog #143, unverändert seit 21.9. |
| jimesh-vault-access-matrix | keine Datei im Frontend | `vault-access-matrix.png` wird nur als statisches Deko-Bild in `TourPage.tsx:13` (`import imgVault from '@/assets/stitch/vault-access-matrix.png'`) verwendet — reine Marketing-Deko, kein Code. `VaultDashboardPage.tsx` und `ProjectSecretsPage.tsx` haben keine Identity×Resource-Matrix, kein Access-Level-Badge-System. Bestätigt Backlog #144/#167, unverändert. |
| jimesh-stitch-designer-plugin-detail | keine Datei im Frontend | 0 Treffer für "stitch_designer"/"stitch designer" im ganzen Code (die alte Fake-Einspeisung aus #145 wurde entfernt, nicht ersetzt durch eine echte Version). `PluginCatalogPage.tsx` hat zudem **keine Per-Plugin-Detailseite überhaupt** — jede Karte verlinkt auf dieselbe generische `/plugins/settings`, nicht auf ein Overview/Configuration/Permissions/API-Keys/Sessions-Tab-System wie im Design gezeigt. Neuer Fund (nicht in bisherigen Audits). |

---

## Gruppe 2 — PARTIALLY BUILT (Route/Component existiert, signifikanter Teil fehlt, 26 von 51)

| Design | Route/File | Was fehlt konkret |
|---|---|---|
| jimesh-agent-chat-with-proxy-status | `/chat` → `components/ChatInterface.tsx` (327 Z.) | Bestätigt Backlog #146, unverändert: `grep -ni proxy ChatInterface.tsx` → 0 Treffer. Zeile 211 zeigt nur einen statischen Hinweistext ("Fallback chain is managed by lmesh's routing system"), keine Live-Anzeige der aktuellen Proxy-/Routing-Kette während des Chats wie im Design. |
| jimesh-agent-session-detail-sess-a8f2c | `/sessions`, `/sessions/:sessionId` → `AgentSessionDetailPage.tsx` | **KORRIGIERT (2026-09-27, SPRINT-51-Fix-Agent):** dieser Audit-Eintrag war beim Erstverfassen falsch als "unverändert seit 21.9." klassifiziert — der Fund war real, aber bereits am 21.9. in Commits `b04c602`/`d896849` gefixt, BEVOR dieses Audit geschrieben wurde (Git-History wurde beim Audit nicht geprüft). Aktueller Stand, verifiziert: leerer Transcript-State, echte Tool-Call-Daten aus `GET /api/subagents/{id}/tool-calls`, ehrliches Label "SESSION TELEMETRY" + "Agent chat backend is not connected — messages are queued locally only." Kein Fix mehr nötig. Details: `docs_dev/sprints/SPRINT-51-AGENT-SESSION-FAKE-TELEMETRY-FIX.md` (Worktree `jimesh-sprint51`). |
| jimesh-app-detail-dsh-agent-7f2e-interfaces | `/workspaces/apps/:appId` → `AppDetailPage.tsx` | Interfaces-Tab ist echt (Zeilen 104-117, aus echten App-Feldern). Terminal-Connect zeigt weiterhin nur `toast.info(t('appDetail.connectTerminalTodo'))` (Zeile 161, bestätigt Backlog #141 unverändert). Audit-Tab ist ein leerer `EmptyState` (Zeilen 273-278). Die im Design gezeigte umgebende "Cluster Infra / Compute Targets / Firewall Rules"-Sidebar hat keine Entsprechung. |
| jimesh-container-logs-tab | in `AppDetailPage.tsx` Logs-Tab, Komponente `components/apps/ContainerLogViewer.tsx` | Route existiert entgegen dem veralteten App.tsx-Kommentar bereits real (GHOST-AUDIT-Fix 20.9., Zeilen 135-138), Level-Coloring/Auto-Scroll/Zeitraum-Filter funktionieren. Fehlt: klickbare Log-Level-Filter-Pills (ALL/ERROR/WARN/INFO/DEBUG aus dem Design), Download-Action, "Attach Sidecar"-Button — 0 Implementierung dafür. |
| jimesh-dashboard-builder | `/builder` → `DashboardBuilderPage.tsx` | Bestätigt Backlog #161, ehrlich als Phase-2 gekennzeichnetes Banner ("drag & drop arrives with Phase 2"). Design zeigt freien Canvas mit Drag/Resize, PromQL-Editor pro Widget, Properties-Panel, Widget-Library-Sidebar — echter Code hat nur 5 feste Kartentypen + Up/Down/Remove/Add-Buttons. Kein Mandat-Verstoß (klar gekennzeichnet), aber substanzielle Design-Lücke. |
| jimesh-deployment-detail-deploy-20260919 | `/workspaces/deployments/:projectId/:deploymentId` → `DeploymentDetailPage.tsx` (440 Z.) | **Korrektur zu Backlog #128**: Route existiert jetzt (seit "Route-wiring WP"). Eigener Datei-Kommentar (Zeilen 47-58) erklärt ehrlich: kein Backend für Pipeline-Run-History, keine Per-Step-Timings, kein Build-Log — Design zeigt 7-stufige CI/CD-Pipeline mit Live-Log-Tail, Trivy/Checkov-Findings, Commit-Diff; echter Code zeigt nur einen 4-Stufen-Status-Lifecycle (created→building→deployed→stopped) + rohe Felder-Tabelle. Ehrlich unvollständig, nicht gemockt. |
| jimesh-distributed-trace-detail-dsh-agent-session | `/security/traces` → `TracesPage.tsx` (80 Z.) | **Korrektur zu Backlog #128**: Route existiert jetzt, ist aber wörtlich ein "honest placeholder" — eine Erklärkarte, die auf `AUDIT-BACKEND-SECURITY.md F-05` verweist (OTel-Spine hat keine Call-Sites, exportiert nichts). Design zeigt volle Trace-Waterfall (Span-Baum, Duration-Bars, `gen_ai.*`-Attribut-Tabellen) — davon existiert nichts, aber auch nichts wird vorgetäuscht. |
| jimesh-ssh-target-detail-root-187-124-2-174 | `/workspaces/targets/:targetName` → `SSHTargetDetailPage.tsx` (272 Z.) | **Korrektur zu Backlog #128**: Route existiert jetzt, respektiert korrekt das neuere §8-Domänenmodell (Freitext-sshTarget statt FK). Eigener Kommentar (Zeilen 41-46) erklärt ehrlich: Live-Node-Fakten (CPU/RAM/NVMe/Load, laufende Container mit Logs/Restart, Netzwerk-Topologie-Karten) existieren im Backend nicht (`/api/nodes/health` deckt nur den Gateway-Host ab) — Design zeigt genau das, echte Seite zeigt nur Registry-Fakten (Host/User/Port/Auth/gVisor) + zugeordnete Workspaces. |
| jimesh-firewall-provider-setup-wizard | `/security/firewall/provider-setup` → `FirewallProviderSetupPage.tsx` (709 Z.) | 3-Step-Wizard und Provider-Karten sind gebaut, aber nur 1 von 4 Providern (nftables) ist funktional — OPNsense/Cloud-SG/BYOF zeigen ehrliche "not implemented"-Banner mit disabled Inputs (Zeilen 553-559, 667-676). |
| jimesh-firewall-traffic-log | `/security/firewall/traffic` → `FirewallTrafficLogPage.tsx` (565 Z.) | Echte Tabelle aus der SIEM-Audit-Pipeline (`/api/sdk/logs?type=audit`). Design-Elemente ohne Entsprechung: BLOCKED/ALLOWED-Verdicts, "pkts/sec", "+14% vs yesterday"-Trend, PCAP-Export — Datei-Kommentar (Zeilen 60-67) erklärt ehrlich, dass das Backend keine Paketzähler/Verdicts liefert, nur Sensor-Severity. |
| jimesh-opnsense-firewall-config | `/security/firewall/opnsense` → `OpnsenseFirewallConfigPage.tsx` (448 Z.) | Status/Grants-Tabs zeigen echte Daten. Credentials- und Sync-Tabs sind komplett disabled/"planned" (Zeilen 293-333, 336-429), Badge liest ehrlich "Interface Ready" statt "Connected" (Zeilen 150-152). Löst nebenbei Backlog #149 auf: `/api/firewall/config` ist eine Router-seitige Service-Route (Edge-Node zieht eigene Enforcement-Regeln über Service-Key) — kein Frontend-Gap, bewusst so designt. |
| jimesh-security-findings | `/security/findings` → `SecurityFindingsPage.tsx` (339 Z.) | **Korrektur zu Backlog #171**: der dort dokumentierte Wiring-Fehler ist seit dem 27.9.-Kommentar im Code selbst behoben — die Seite nutzt jetzt zusätzlich `GET/POST /api/projects/{id}/iac-files(/scan)` (Zeilen 32, 37-46, 112-172), nicht mehr nur den generischen SDK-Logs-Pfad. Dismiss ist echt persistiert (`POST /api/security/findings/dismiss`). Was weiterhin fehlt (aus dem Design): CWE/CVE-Detailfelder, Datei:Zeile-Snippets pro Finding, getrennte Scanner-Marken-Badges (Checkov vs. Gosec). |
| jimesh-security-findings-refined | dieselbe `SecurityFindingsPage.tsx` | Das "refined" Design fügt gegenüber dem Original ein ganzes "Accepted Risk"-Workflow (Ticket-Referenz, Freigabe durch @sec-ops), Dismissal-Notes-Freitextfeld, Expand/Collapse pro Finding und CWE/CVE/CKV-Rule-ID-Spalten hinzu (Text-Diff der beiden Design-HTMLs bestätigt ~30 zusätzliche Strings) — nichts davon existiert im echten Code, deutlich größere Lücke als beim Original-Design. |
| jimesh-plugin-install-wizard | Dialog `components/plugins/PluginInstallWizardDialog.tsx` (655 Z.), geöffnet aus `PluginCatalogPage.tsx` | **Korrektur zu Backlog #168**: alle dort gefundenen Vertrauens-Simulationen sind laut Datei-Kommentar (Zeilen 39-59) entfernt — kein vorbefüllter Fake-API-Key mehr, kein 600ms-Fake-"Test Connection", kein erfundenes "Pre-flight check passed (4/4)"/"Vault KMS Unsealed", Scope-Karten zeigen jetzt echte Workspaces/Projekte. Verbleibende ehrliche Lücke: der Install-POST (`/api/plugin-installations`) "echoes without persisting" (Zeile 57-58, dokumentiertes TASK-103-Backend-Defizit) — UI ist ehrlich, Backend-Persistenz fehlt noch. |
| jimesh-plugin-settings | `/plugins/settings` → `PluginSettingsPage.tsx` (364 Z.) | **Korrektur zu Backlog #169**: Fake-Autor/-Version/-Badge/-Vault-Claim und der hartcodierte "Live Event Stream" sind laut Datei-Kommentar (Zeilen 25-31) entfernt. Verbleibende Lücke: die Save/Discard/Sideload-Buttons aus dem Design wurden komplett entfernt statt funktional gemacht — Config-Felder sind jetzt `readOnly` (Zeilen 288, 300); die Edit/Save-Fähigkeit, die das Design zeigt, existiert schlicht nicht (ehrlich, aber eine echte Funktionslücke). |
| jimesh-secrets-vault | `/vault-dashboard` → `VaultDashboardPage.tsx` (641 Z.) | Bestätigt Backlog #166, unverändert: 0 Treffer für "Real-Time"/"Evaluation Stream"/"ALLOWED"/"BLOCKED" — Multi-Engine-CRUD ist echt und solide, das im Design gezeigte Live-Log von ALLOW/BLOCKED-OPA-Events fehlt komplett, kein bekannter Backend-Endpoint dafür. |
| jimesh-teams-resource-bindings | `/admin/teams` → `TeamsPage.tsx` (444 Z.) | Bestätigt Backlog #165, unverändert: echtes CRUD+Budget+Members+Bindings, aber keine "Access Preview / Live Simulation"-Sidebar, kein Rule-Trace (Workspace→Project-Auflösungskette), kein funktionierender "Audit Access Matrix"-Button (führt ins Leere, da Ziel-Seite #vault-access-matrix nicht existiert). `TeamBindingsPanel`-"Add Binding"-Button bewusst disabled mit ehrlichem Tooltip. |
| jimesh-outbound-dlp-settings | `/security/dlp` → `DlpSettingsPage.tsx` | Bestätigt Backlog #172 (umgesetzt 27.9.): Live-Hook-Status (`GET /api/settings/dlp_enabled`, 10s-Poll) ist echt verdrahtet, mit ehrlicher Notiz "DLP event stream requires backend endpoint". Design zeigt eine volle Live-Inspector-Tabelle (Tool/Timestamp/Latency/Payload pro Event) — die bleibt aus, bis ein echter Event-Endpoint existiert; bewusst keine Mock-Zeilen. |
| jimesh-subagent-approval-queue | `/subagents/approvals` → `SubagentApprovalQueuePage.tsx` (556 Z.) | Approve/Deny-Mutations, Auto-Approve-Rules (echtes `/admin/capabilities`) und Audit-Log (echtes `/security/events`) sind real verdrahtet. Zeile 244: `'SLA Timeout: 4m 18s remaining'` ist ein hartcodierter String, kein echter Countdown pro Item — dasselbe "grüne Lüge"-Muster wie bei #162. |
| jimesh-tool-call-inspector | `/subagents/tool-calls` → `ToolCallInspectorPage.tsx` (557 Z.) | Kern-Daten sind echt (`/api/subagents/guarded` + `/api/subagents`, Zeile 109 bestätigt "no hardcoded synthetic mock strings"). "Export JSON / PCAP"-Button (Zeilen 204-207) und "Replay in Sandbox" (Zeilen 420-425) haben kein `onClick`; Footer-Ticker (Zeilen 540-554) zeigt unbedingt "Cluster sync: ACTIVE / eBPF TC probes: Active / OPA Daemon: Active" ohne jede Abfrage. |
| jimesh-user-management | `/admin/users` → `AdminUsersPage.tsx` (782 Z.) | Kern-CRUD+RBAC ist solide echt (`POST/DELETE /api/users`, Enabled-Toggle, Rollen via `/api/budgets`). Im Design vorhandene, im Code komplett fehlende Elemente: Keycloak-"Sync Realm"-Button, CSV-Export, Bulk-Actions-Leiste, Rollen-Filter-Chips, "MFA Enforced: 100%"-Stat-Kachel. |
| jimesh-workspace-detail-prod-workspace | `/workspaces/ws/:workspaceId` → `WorkspaceDetailPage.tsx` (455 Z.) | **Korrektur zu Backlog #127/#084**: der Sprint-50-Cleanup (Datei-Kommentar Zeilen 32-42) hat die dort gefundenen Fake-Daten (DEMO_CONTAINERS, Fake-Secrets-Liste, hardcodierte "12ms"/Prod-IP) bereits entfernt, ersetzt durch echte `/api/deployments`, `/api/secrets`, `/api/security/events`-Calls. Verbleibend: "SSH Shell"-Button (Zeile 271) macht nur `toast.info('Connecting to SSH Shell...')` (tot); Budget-Tab (Zeilen 416-421) ist ein leerer `EmptyState` trotz Design-Live-Budget-Panel ("$12.40"); keine Topology/Alerts/Audit-Tabs, keine Per-Container-CPU%/MEM/Uptime-Spalten. |
| jimesh-global-search-command-palette | global gemountet, `components/command-palette.tsx` (339 Z.) | Bestätigt Backlog #159, unverändert: `commands`-Array (Zeilen 116-220) ist rein statische Seiten-/Action-Einträge + `/api/fallback`-Modelle — 0 Live-Registry-Suche über Workspaces/Targets/Apps/Projects wie im Design ("Jump to Target/App"-Ergebnisse inkl. SIEM-Treffer). |
| jimesh-proxy-chain-overview-graph-first | `/proxy/chains` → `ProxyChainsPage.tsx` | Bestätigt Backlog #162, unverändert, **zweitkritischster Mock-Fund**: `key.status || 'healthy'` (Zeile 763, exaktes MANDATES.md-Negativbeispiel), erfundene `mesh://llm-proxy:8080/v1`-URI, statisches "eBPF Token Gate: Enforced"-Badge ohne Prüfung, wirkungsloser "Simulate Prompt Route"-Button, erfundene "100% Recovered"/"18ms eBPF switch"-Statistik, "Verify Node Config"-Button der nur `toast.info(...)` zeigt. Graph-Struktur selbst ist gebaut, aber durchsetzt mit Falschangaben. |
| jimesh-scope-selector-component | `components/overview/ScopeSelectorModal.tsx` | Implementiert Design-Prompt 6 fast wörtlich (hierarchische Auswahl, Chips), ist aber **komplett verwaist** — 0 Treffer für `<ScopeSelectorModal` (nur Kommentar-Referenzen in `HierarchySidebar.tsx`). Bestätigt Backlog #137, unverändert. |
| jimesh-scope-selector-component-refined | dieselbe `ScopeSelectorModal.tsx` (die zweite, unabhängige Implementierung aus Backlog #160, `components/layout/scope-selector.tsx`, existiert nicht mehr — Datei wurde seit 21.9. gelöscht, vermutlich Dead-Code-Cleanup) | Design-Text ist fast identisch zum Original (nur Branding-Strings unterscheiden sich, "JiMesh" statt "MeshCore"). Da die zweite Implementierung weg ist, bleibt nur die eine — ebenfalls orphaned, siehe oben. |

---

## Gruppe 3 — STRUCTURALLY DIFFERENT (gebaut, aber komplett anders organisiert, 9 von 51)

| Design | Route/File | Wie es sich unterscheidet |
|---|---|---|
| jimesh-app-discovery-with-networks | `/projects/discover` → `AppDiscoveryPage.tsx` (301 Z.) | Design zeigt einen "unclaimed container"-Triage-Workflow (Claim-to-Project-Button pro Container, Sortierung nach Kategorie, Suggested-Integrations-Chips, ein live-draggable VLAN-Topologie-Graph). Echter Code ist ein einzelner "Scan Now"-Button (`POST /api/servers/discover`), der Ergebnisse direkt automatisch als Projekt-Zeilen upserted und als Karten mit echten Port-/VLAN-Badges listet (Zeilen 64-301) — kein Claim-Schritt, kein Topologie-Graph, keine Kategorisierung. Ehrliche echte Daten, aber komplett anderes Interaktionsmodell. |
| jimesh-app-discovery-with-networks-refined | dieselbe `AppDiscoveryPage.tsx` | Refined-Design fügt nur eine "Switch Target"-Option + Label-Umsortierung hinzu — dieselbe strukturelle Lücke wie beim Original. |
| jimesh-browser-integration-selection | `components/workspaces/BrowserRuntimeModal.tsx` (720 Z.) | Bestätigt Backlog #139: bewusste, gut dokumentierte Substitution (Zeilen 40-66) — KasmWeb Chrome/Desktop aus dem Design wird vom Deploy-Backend nicht unterstützt, stattdessen werden ehrlich die real unterstützten Runtimes angeboten (opencode WebRTC neko:xfce-Desktop, mit/ohne code-server). Kein Gap, bewusste Design-Abweichung. |
| jimesh-browser-integration-selection-refined | dieselbe `BrowserRuntimeModal.tsx` | Refined-Variante fast identisch (fügt nur Portnummern zu zwei Labels hinzu) — gleiche Einschätzung. |
| jimesh-dashboard-overview | `/overview` → `OverviewPage.tsx` | Design ist ein dichtes "Mission-Control"-Telemetrie-Board (Per-Node Ping/Replica-Sparklines, Ingress/Egress-Regelzähler, Cost-Widgets). Echte Seite (Zeilen 101-130) ist stattdessen ein Hierarchie-Summary-Layout: `NodeHealthStrip` + 5 feste Summary-Karten + ein `OverviewGrid` aus echten Project→Workspace→App-Karten (Zeilen 23-99). Daten sind echt, aber das Produktkonzept (ein Live-Board vs. ein hierarchischer Drilldown-Hub) ist komplett verschieden. |
| jimesh-cluster-onboarding-initialization | `/onboarding` → `OnboardingPage.tsx` | Design zeigt einen animierten Single-Screen-Wizard (Live-WireGuard-Keygen-Log, "eBPF Bootstrap Engine v2.4.1", gVisor/nftables-Aktivierungs-Feed, Cmd+Shift+P-Hint). Echte Seite ist ein schlichter 4-Schritt-Formular-Wizard (Welcome→Worker Node→Firewall→Deploy), ehrlich verdrahtet (`POST /api/nodes/provision` Zeile 101, `GET /api/firewall/status` Zeile 62) und labelt nicht-nftables-Provider ehrlich als "interface-ready"/geplant statt die Terminal-Animation vorzutäuschen. |
| jimesh-cluster-onboarding-initialization-refined | dieselbe `OnboardingPage.tsx` | Refined-Design fügt eine AWS/GCP-Sync-Adapter-Option + Custom-WireGuard-Hooks hinzu — existiert im Code nicht (weiterhin "geplant"). Beide Design-Varianten landen auf derselben realen Seite. |
| jimesh-network-management-vlans-overlay | `/workspaces/networks` → `NetworkEditingPage.tsx` | Bestätigt Backlog #163, unverändert: Design zeigt ein Multi-Netzwerk-Dashboard mit Live-Mesh-Graph, mehreren gleichzeitigen Segmenten, Firewall-Regeln pro Segment, IPAM-Pool-Stats. Echter Code ist ein Ein-Projekt-Dropdown-Formular (Provision/Teardown/Restart) — kein Graph, keine Multi-Segment-Ansicht. Daten darin sind ehrlich echt (`/api/projects/{id}/vlan`), kein Mock — reine Produktumfang-Lücke. `NetworkEditingGrid.tsx` (separater Fund #154, orphaned + fabrizierte Security-Badges + toter "Scan NICs"-Button) bleibt zusätzlich unangebunden. |
| jimesh-admin-settings-api-keys | `/keys` → `KeysPage.tsx` (315 Z.) | Bestätigt Backlog #164, unverändert: Design zeigt 4 Global-Utility-Key-Karten + eine "Project Overrides & Scoped Precedence"-Tabelle (pro-Projekt Custom-Key-Override mit Rate-Barriers, Configure/Revert). Echte Seite ist strukturell komplett anders (Tabs Providers/Quota-Signals/Budget-Status/API-Key/Anthropic/Agents) — 0 Treffer für "Override"/"Precedence"/"Revert". Andere Produktidee, keine Detail-Lücke am selben Konzept. |

---

## Gruppe 4 — BUILT AND MATCHES (kein nennenswerter Gap, 10 von 51)

| Design | Route/File | Kurzbegründung |
|---|---|---|
| jimesh-agent-config-scanner | `/security/agent-scan` → `AgentConfigScannerPage.tsx` | Implementiert dieselbe Produktidee wie das Design: Drag-drop `.mcp.json`-Upload, Live-JSON-Editor, dieselben 5 deterministischen Checks (W021/W008/E005/W014/E002), echt verdrahtet (`GET/POST /api/security/agent-scan`, Zeilen 72-97). Nur dekorative tote Buttons ("Inspect AST"/"Suppress Rule"/"Export .SARIF"), kein struktureller Gap. |
| jimesh-firewall-rules | `/security/firewall-rules` → `FirewallRulesPage.tsx` (693 Z.) | Echtes CRUD gegen `GET/POST/DELETE /api/firewall/rules`, optionale Felder ehrlich als "—" statt erfunden. Kein Design-Fiktion gefunden. |
| jimesh-siem-events-timeline | `/security/siem` → `SIEMEventsPage.tsx` (225 Z.) | Echte `useSSOTStore()`-Events, Scanner-/Severity-/Zeitraum-Filter, severity-gestapelter Timeline-Strip (`SiemTimelineStrip`) entspricht dem Design-Konzept; nicht-parsebare Timestamps werden ehrlich ausgeschlossen statt geraten. |
| jimesh-infrastructure-sidebar | `components/sidebar/HierarchySidebar.tsx` (1544 Z.), global gemountet | Per-App-Icons via `getAppIcon(a.type)`, "ALL SSH TARGETS"/"PROJECTS"-Baum genau nach Original-Design-Intent (Operator-bestätigter Rebuild, siehe Backlog #136), Badges an echte Deployment-Interfaces gebunden, keine Fake-Daten gefunden. |
| jimesh-infrastructure-sidebar-refined-app-ssh-icons | dieselbe `HierarchySidebar.tsx` | Der Namenszusatz "app-ssh-icons" ist bereits erfüllt — echte Per-App- und Per-SSH-Icons vorhanden. |
| jimesh-llm-proxy-overview | `/proxy/overview` → `LlmProxyOverviewPage.tsx` (574 Z.) | Bestätigt: 6 echte Queries (`/api/analytics/summary`, `/by-client`, `/timeline`, `/v1/models`, `/api/profiles/active`, `/api/models`), Datei-Kommentar (Zeilen 42-55) dokumentiert explizit die Entfernung von Design-Fiktion (mesh://-Endpoint, eBPF-Pills, Fake-Deltas). Kein Mock gefunden. |
| jimesh-notification-center | `/notifications` → `NotificationCenterPage.tsx` (429 Z.) | Echte Aggregation von 3 Live-Feeds, server-persistierter Dismiss, Critical/Warning/All-Tabs — entspricht dem Design-Aufbau. |
| jimesh-project-overview-iac-files-tab | `/workspaces/projects/:projectId` → `ProjectDetailPage.tsx` ('iac'-Tab) | Echtes `GET/POST .../iac-files(/scan)`, Datei-Liste/Scan-UI entspricht dem Design. |
| jimesh-plugin-catalog | `/plugins` → `PluginCatalogPage.tsx` | **Korrektur zu Backlog #145**: die Fake-Ratings/Reviews/Installzahlen und die 3 fiktiven Fallback-Plugins sind laut Datei-Kommentar (Zeilen 26-31) komplett entfernt — 0 Treffer für "fallbackDefaults"/"metadataMap"/"rating" mehr im File. Seite zeigt jetzt nur echte `/api/plugins`-Felder, ehrlicher Empty-State statt erfundener Zahlen. |
| jimesh-integrations-and-plugins | `/plugins` → `PluginCatalogPage.tsx` + `components/plugins/ActiveDeploymentsSection.tsx` (1087 Z.) | **Korrektur zu Backlog #170**: die fehlende rechte Hälfte des Designs (Sidecar-Deployment-Manager: Ports, Shell-Zugriff, Logs, Monitoring) wurde inzwischen nachgebaut (Datei-Kommentar Zeilen 40-70, explizit "SPRINT-54 (Backlog #170)"), komplett auf echten Routen (`GET /api/deployments`, `/api/projects`, `/api/discovery`, Logs-/Monitoring-SSE, Redeploy/Undeploy-POSTs). Einzige kleine Lücke: keine eigene "Quick Deploy & Attach"-Leiste wie im Design — marginal gegenüber dem Umfang, der jetzt existiert. |

---

## Ausgeschlossen — kein Produkt-Screen

**jimesh-design-assets-folder** — diese HTML zeigt die Oberfläche des Stitch-Design-Tools selbst (sichtbare Strings: "Design Assets & AI Sessions", "Import from Stitch", "Archived Prototypes", "Component Presets v3", "Exported Specs", "3 Active Sessions") — ein Asset-Browser für generierte KI-Design-Sessions, kein JiMesh-Dashboard-Screen. Es gibt dafür keine sinnvolle Code-Entsprechung zu prüfen; aus der 51er-Zählung oben bewusst ausgeschlossen statt fälschlich als "NOT BUILT" geführt.

---

## Zusammenfassung

- **NOT BUILT:** 6 (die 4 Selector-Modals, Vault Access Matrix, Stitch-Designer-Plugin-Detail)
- **PARTIALLY BUILT:** 26 (größte Gruppe — überwiegend ehrlich unvollständig, zwei kritische Mock-Funde: Agent-Session-Detail zu 100% Theater, Proxy-Chain-Overview mit 9 Fake-Stellen)
- **STRUCTURALLY DIFFERENT:** 9 (überwiegend bewusste/ehrliche Abweichungen, keine Mandat-Verstöße)
- **BUILT AND MATCHES:** 10
- **Ausgeschlossen (kein Produkt-Screen):** 1 (design-assets-folder)

**Wichtigste Korrekturen gegenüber dem 21.9-Audit** (Code hat sich seither bewegt):
Backlog #128 (5 Designs "0 Code") ist überholt — alle 5 haben jetzt Routen,
größtenteils ehrlich unvollständig statt fehlend. Backlog #145 (Plugin-Catalog
Fake-Ratings), #168 (Plugin-Install-Wizard Fake-Trust-Signale), #169
(Plugin-Settings tote Buttons) und #170 (Integrations fehlende Sidecar-Hälfte)
sind alle vier inzwischen tatsächlich gefixt — nicht nur teilweise, sondern
mit expliziten "Backlog #XXX"-Kommentaren im Code, die den alten Zustand
dokumentieren und die Behebung erklären. Backlog #171 (Security Findings
falscher Datenpfad) ist ebenfalls seit heute (27.9.) gefixt.
