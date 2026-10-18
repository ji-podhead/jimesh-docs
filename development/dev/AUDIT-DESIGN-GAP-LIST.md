# AUDIT — DESIGN-GAP-LISTE: 56 Stitch-Screens & Operator-Prompts vs. echter Code (27.9.2026)

Auftrag: Lies ALLE Stitch-Designs und ALLE Operator-Prompts, vergleiche sie mit
dem aktuellen Code (Routen / View-Dateien / Nav-Erreichbarkeit) und liste ALLE Lücken.

**Methode:** Vollständiges Lesen von `docs_dev/prompts/USER_REQUIREMENTS_SUMMARY.md`,
`docs/PROMPTS-STITCH-DESIGN.md`, `docs/ARCHITECTURE.md` §8,
`docs_dev/prompts/glm-sidebar-scope-redesign.md`, aller weiteren Operator-Prompts in
`docs_dev/prompts/` (glm-session-*), Auflistung aller 56 PNGs in
`design-assets/stitch/` (inkl. `manifest.json`), danach Datei-für-Datei-Verifikation
gegen `src/frontend/src/App.tsx` (765 Zeilen, alle Routen),
`src/frontend/src/lib/section-nav.ts` (Nav-Modell),
`src/frontend/src/components/sidebar/HierarchySidebar.tsx` (849 Zeilen),
`src/frontend/src/components/command-palette.tsx`, alle 74 Dateien in
`src/frontend/src/views/` (Kopf + gezielte Greps je Design) und die betroffenen
Backend-Handler (`internal/deploy`, `internal/gateway`). Kein Befund aus dem
Alt-Audit (`AUDIT-2026-09-21-GAP-LIST.md`) wurde ungeprüft übernommen — jeder
wurde gegen den heutigen HEAD neu verifiziert (Abschnitt 7 zeigt das Delta).

**Design-Basis:** 56 eindeutige PNGs = 52 × `jimesh-*.png` + 4 × `website-*.png`.
`manifest.json` enthält 60 Screen-Einträge (mit Stitch-Refinement-Duplikaten, z. B.
Dashboard Builder ×4, App Discovery ×3 — alle zeigen auf dieselben PNGs) und KEINE
website-*-Einträge. Die Tabelle läuft über die 56 eindeutigen PNGs; Refined-Varianten
erscheinen als eigene Zeile, weil sie jeweils ein eigenes Design-Dokument sind.

---

## 1. Kurzfassung

| Status | Anzahl | Bedeutung |
|---|---|---|
| **BUILT** | 44 | Route + View + Erreichbarkeit vorhanden, Design-Kern umgesetzt |
| **PARTIAL** | 7 | Route/View existiert, aber Erreichbarkeit oder Design-Kern fehlt |
| **GAP** | 5 | Keine Route/View — Design nicht umgesetzt |
| **Summe** | **56** | |

**Die 5 GAPs:** Admin-Settings-API-Keys (Credential Scopes) · Design-Assets-Folder
(Stitch-Import) · Distributed-Trace-Detail (backend-blockiert, OTel F-05) ·
Stitch-Designer-Plugin-Detail (kein /plugins/:id) · Vault-Access-Matrix (OPA-Matrix).

**Die 7 PARTIALs:** Agent-Chat-Proxy-Status · Onboarding (+refined, nirgends verlinkt) ·
Dashboard-Builder (nur 5 Fix-Cards statt Widget-Editor) · Firewall-Rules (Top-Nav-Lücke) ·
Security-Findings (+refined, Nav-Lücke).

**Auffälligste Einzelbefunde (P0):** das Onboarding (`/onboarding`) ist von KEINEM
UI aus erreichbar; die im Sidebar-Redesign-Prompt zwingend geforderte Multi-Select-
Audit-Tabelle („Endpoint | Multi-fähig JETZT? | …") existiert NICHT, obwohl das
Multi-Select-UI (SPRINT-52) bereits gebaut wurde (Reihenfolge-Verstoß); der dritte
Layout-Modus „All Servers" aus derselben Operator-Spec fehlt (nur 2 Modi gebaut);
`/security/findings` hat keinen einzigen Nav-Eintrag.

---

## 2. Haupttabelle — alle 56 Designs: Route / Status / Lücke

Legende: Route = Eintrag in `App.tsx` · Nav = erreichbar über Top-Nav
(`section-nav.ts`), Sidebar (`HierarchySidebar.tsx`) oder Command-Palette; „inline"
= nur über Links innerhalb einer Page erreichbar; „URL" = nur direkte URL.

| # | Design (PNG) | Route (App.tsx) | View / Komponente | Nav | Status | Lücke / Kommentar |
|---|---|---|---|---|---|---|
| 1 | jimesh-admin-settings-api-keys | ❌ keine | ❌ | — | **GAP** | Design: „API Keys & Credential Scopes" — Global Utility Keys (Stitch AI Engine, GitHub VCS, OpenAI/Anthropic Gateway) + „Project Overrides & Scoped Precedence". Nicht gebaut; `/keys` (LLM-Provider-Keys) und `/admin/consumer-keys` (User-sk-Keys) decken Utility-Keys + Project-Override-Precedence nicht ab. Vor Neubau mit Operator klären (Alt-Audit #164: „komplett andere Produktidee als im Design"). |
| 2 | jimesh-agent-chat-with-proxy-status | ✅ `/chat` | ChatInterface.tsx | ✅ nav.chat | **PARTIAL** | Design-Kern „LLM Proxy & Routing Status"-Live-Panel + „Export Transcript"/„Copy Trace" im Chat fehlen komplett (0 Proxy-Referenzen in ChatInterface.tsx); Chat ruft direkt `/v1/models` + `/v1/chat/completions`, kein Routing-Status-Layer. |
| 3 | jimesh-agent-config-scanner | ✅ `/security/agent-scan` | AgentConfigScannerPage.tsx | ✅ securityItems | **BUILT** | — |
| 4 | jimesh-agent-session-detail-sess-a8f2c | ✅ `/sessions/:sessionId` | AgentSessionDetailPage.tsx | ✅ AgentsPage→SubagentsPanel (inline) | **BUILT** | Conversation + Tool Calls + Export Transcript; ECHTE Daten (`/api/sessions`, `/api/subagents/{id}/tool-calls`). War im Alt-Audit „100% Theater" — inzwischen komplett auf echte Queries umgebaut („nothing here is hardcoded", Z. 488). Trace-Waterfall ist separates Design (#18). |
| 5 | jimesh-app-detail-dsh-agent-7f2e-interfaces | ✅ `/workspaces/apps/:appId` | AppDetailPage.tsx | ✅ Sidebar-Tree / Workspace-Apps | **BUILT** | Tabs Interfaces | Logs | Audit; Interfaces NUR aus echten App-Feldern (Mandat 2); AppType-Pill-Farben wie Design. Teil-Gaps: Audit-Tab = ehrlicher Empty-State (keine Datenquelle), Logs siehe #13. |
| 6 | jimesh-app-discovery-with-networks | ✅ `/projects/discover` | AppDiscoveryPage.tsx | ✅ nav.appDiscovery | **BUILT** | Echter Docker-Sock-Scan (POST `/api/servers/discover`). Mini-Gap: keine per-App-Typ-Icons im Resultat (Operator-Wunsch aus alter Session; `getAppIcon` existiert, wird aber nur in Sidebar/ScopeSelector benutzt). |
| 7 | jimesh-app-discovery-with-networks-refined | ✅ `/projects/discover` | AppDiscoveryPage.tsx | ✅ dito | **BUILT** | Refined-Variante in dieselbe Page eingearbeitet. |
| 8 | jimesh-app-selector-modal | ✅ (Modal) | overview/ScopeSelectorModal.tsx (Level `app`) | ✅ Sidebar-Scope-Section | **BUILT** | War verwaist (Backlog #137), seit SPRINT-52 WP1 in der Sidebar angedockt. |
| 9 | jimesh-browser-integration-selection | ✅ `/workspaces/deployments?browser=1` | workspaces/BrowserRuntimeModal.tsx | ✅ nav.browserIntegration | **BUILT** | Bewusste Anpassung: Modal statt eigener Page (ehrlich dokumentiert); KasmWeb/VNC-Optionen + Playwright real. |
| 10 | jimesh-browser-integration-selection-refined | ✅ dito | BrowserRuntimeModal.tsx | ✅ dito | **BUILT** | — |
| 11 | jimesh-cluster-onboarding-initialization | ✅ `/onboarding` | OnboardingPage.tsx | ❌ **nur URL** | **PARTIAL** | 4 Steps Welcome→Worker Node→Firewall→Deploy, echter SSH-Probe (POST `/api/nodes/provision`, live Log). ABER: kein Nav-Eintrag, kein Sidebar-Eintrag, kein Palette-Eintrag, kein First-Start-Trigger — der Onboarding-Flow ist von nirgendends im UI erreichbar (grep: 0 navigate('/onboarding')). |
| 12 | jimesh-cluster-onboarding-initialization-refined | ✅ `/onboarding` | OnboardingPage.tsx | ❌ nur URL | **PARTIAL** | dito. |
| 13 | jimesh-container-logs-tab | ✅ `/workspaces/apps/:appId` → Logs-Tab | components/apps/ContainerLogViewer.tsx | ✅ über App-Detail | **BUILT** | Backend EXISTIERT und ist live verifiziert: GET `/api/projects/{id}/containers/{cid}/logs` als SSE (`deploy.go:94`, `container_logs.go`), Query aktiv (`enabled: Boolean(projectId && containerId)`, GHOST-AUDIT-Fix 20.9.). Cleanup offen: 2 stale TODO-Kommentare (Z. 17–23, 149–155) behaupten noch, die Route existiere nicht. |
| 14 | jimesh-dashboard-builder | ✅ `/builder` | DashboardBuilderPage.tsx | ✅ platformItems | **PARTIAL** | Design: freie Widgets, „Widget Properties"-Panel, „Connector Source", „Add Blank Row", „Save Dashboard", „Editing Live". Realität: 5 fixe Summary-Cards an/aus/umordnen (localStorage). Ehrlich als Phase 2 markiert (Alt-Audit #161) — aber die Design-Feature-Fläche fehlt. |
| 15 | jimesh-dashboard-overview | ✅ `/overview` | OverviewPage.tsx | ⚠️ nur Root-Redirect/Brand-Klick | **BUILT** | BreadcrumbBar + NodeHealthStrip (ECHT `/api/nodes/health`) + 5 Summary-Cards + OverviewGrid (react-grid-layout). Design-Abweichungen: kein grouped/flat-Layout-Toggle oben rechts; „N targets selected"-Multi-Select-Header fehlt (Multi-Chips leben stattdessen in der BreadcrumbBar). Kein expliziter Nav-Eintrag für /overview. |
| 16 | jimesh-deployment-detail-deploy-20260919 | ✅ `/workspaces/deployments/:projectId/:deploymentId` | DeploymentDetailPage.tsx | ✅ WorkspaceDeploymentsPage Zeilenklick | **BUILT** | GET `/api/projects/{id}/deployments/{depId}` real; 7-Step-Pipeline des Designs bewusst nicht vorgetäuscht (Backend-Truth). |
| 17 | jimesh-design-assets-folder | ❌ keine | ❌ | — | **GAP** | Design: „Design Assets & AI Sessions" — Datei-Browser (Login-Screen-Mockup, Dashboard Redesign, Sidebar v2), „Import from Stitch", „Synced 2m ago", „Exported Specs". Keine Route, keine View — die Stitch-Integration lebt nur im externen MCP-Workflow (CLAUDE.md/STITCH-MCP-GUIDE.md), nicht im Produkt. |
| 18 | jimesh-distributed-trace-detail-dsh-agent-session | ⚠️ `/security/traces` | TracesPage.tsx (= ehrlicher Placeholder) | ✅ securityItems (traces) | **GAP** | Design: Trace-Waterfall „Trace: dsh-agent-session" + „Export to Langfuse" + OpenLLMetry/OTel. Route existiert, ist aber der bewusste NOT-IMPLEMENTIERT-Placeholder (Mandat 2): OTel-Spine hat 0 Call-Sites, EndSpan schreibt nichts, keine Route serviert Spans (AUDIT-BACKEND-SECURITY F-05). Backend-Reparatur ist Voraussetzung — dann TracesPage durch echte Waterfall-Detail-View ersetzen. |
| 19 | jimesh-firewall-provider-setup-wizard | ✅ `/security/firewall/provider-setup` | FirewallProviderSetupPage.tsx | ✅ securityItems (firewallSetup) | **BUILT** | NftablesProvider live, OPNsense interface-ready, Cloud/BYOF ehrlich geplant. |
| 20 | jimesh-firewall-rules | ✅ `/security/firewall-rules` | FirewallRulesPage.tsx | ⚠️ Sidebar Events ✓, Top-Nav ❌ | **PARTIAL** | Seite + Editor (TASK-053/TASK-J4) real; securityItems (Top-Nav-Dropdown) hat die Route NICHT — dort liegen nur provider-setup/traffic/opnsense. Über die Sidebar (Events & Observability) erreichbar. |
| 21 | jimesh-firewall-traffic-log | ✅ `/security/firewall/traffic` | FirewallTrafficLogPage.tsx | ✅ securityItems (firewallTraffic) | **BUILT** | SIEM-Audit-Feed real. |
| 22 | jimesh-global-search-command-palette | ✅ (Overlay, ⌘K) | command-palette.tsx | ✅ Navbar-Button | **BUILT** | Gap bleibt: Pages-Liste der Palette deckt viele Routen NICHT ab (kein /overview, /builder, /proxy/overview, /proxy/chains, /routing-analytics, /realtime-monitor, /security/*, /sessions, /subagents/*, /plugins*, /onboarding, /admin/*, /dbs/*, /api-docs); keine Live-Registry-Suche (Alt-Audit #159, weiter offen). |
| 23 | jimesh-infrastructure-sidebar | ✅ (Shell-Komponente) | sidebar/HierarchySidebar.tsx | ✅ immer sichtbar | **BUILT** | Bewusst NEU strukturiert nach Operator-Spec (glm-sidebar-scope-redesign): 4 Sections Scope / Navigation / Events & Observability / Tree; Hierarchie Project→Workspace→App nach §8 (nicht SSH→Project→App wie im Original-Prompt 1). Abweichungen im Detail: siehe §3.3. |
| 24 | jimesh-infrastructure-sidebar-refined-app-ssh-icons | ✅ dito | HierarchySidebar.tsx | ✅ | **BUILT** | App-Typ-Icons via `lib/app-icons.ts` (`getAppIcon`) wie im Refined-Design. |
| 25 | jimesh-integrations-and-plugins | ✅ `/plugins` | PluginCatalogPage.tsx + plugins/ActiveDeploymentsSection.tsx | ✅ nav.pluginCatalog | **BUILT** | Beide Design-Hälften stehen jetzt: Katalog links (GET `/api/plugins`, Fake-Ratings entfernt — Backlog #145) + „Active Deployments" rechts mit echtem Sidecar-Management (SPRINT-54, Backlog #170, GET `/api/deployments`). Rest-Gap: „Quick Deploy"-Leiste (Framework-Dropdown + SSH-Target + Deploy, Prompt 3) fehlt als eigene Fläche — Deploy-Dialog existiert nur auf Workspace-Detail. |
| 26 | jimesh-llm-proxy-overview | ✅ `/proxy/overview` | LlmProxyOverviewPage.tsx | ✅ proxyItems (proxyOverview) | **BUILT** | Echte Analytics (`/api/analytics/*`), Design-Fiktionen (mesh://-Endpoint, eBPF-Pills, Fake-Trends) bewusst ersetzt. |
| 27 | jimesh-network-management-vlans-overlay | ✅ `/workspaces/networks` | NetworkEditingPage.tsx | ✅ workspaceItems (networkEditing) | **BUILT** | Per-Project VLAN/Netzwerk-Zuweisung (TASK-049/080). Strukturell anders als das Design (Formular statt Multi-Netzwerk-Graph), Daten echt (Alt-Audit #163). |
| 28 | jimesh-notification-center | ✅ `/notifications` | NotificationCenterPage.tsx | ✅ securityItems (notifications) | **BUILT** | Gleiche echten Feeds wie die Bell, persistierte Dismissals. |
| 29 | jimesh-opnsense-firewall-config | ✅ `/security/firewall/opnsense` | OpnsenseFirewallConfigPage.tsx | ✅ securityItems (firewallOpnsense) | **BUILT** | Interface-ready, keine Fake-„Connected"-Session (Mandat 2). |
| 30 | jimesh-outbound-dlp-settings | ✅ `/security/dlp` | DlpSettingsPage.tsx | ✅ securityItems (outboundDlp) | **BUILT** | GET/POST `/api/settings/dlp_enabled` real. |
| 31 | jimesh-plugin-catalog | ✅ `/plugins` | PluginCatalogPage.tsx | ✅ | **BUILT** | Siehe #25; metadataMap-Fakes (rating 4.8/„4.2k installs") sind restlos entfernt. |
| 32 | jimesh-plugin-install-wizard | ✅ (Dialog auf /plugins) | plugins/PluginInstallWizardDialog.tsx | ✅ | **BUILT** | Fake-„Test Connection" (600 ms, immer Erfolg) entfernt → ehrliche „backend exposes NO verify endpoint"-Notiz (Z. 446–448). |
| 33 | jimesh-plugin-settings | ✅ `/plugins/settings` | PluginSettingsPage.tsx | ✅ | **BUILT** | Echte apiFetch-Buttons/Filters; Dead-Buttons aus Alt-Audit sind weg. |
| 34 | jimesh-project-overview-iac-files-tab | ✅ `/workspaces/projects/:projectId` | ProjectDetailPage.tsx | ✅ Sidebar-Tree (Project-Klick/Gear) | **BUILT** | Tabs overview | deployments | **iac** | secrets | integrations; IaC-Files real (GET `/api/projects/{id}/iac-files`); §8.3b (Secrets + Apps inline) erfüllt: Secrets-Tab + „Bound Applications" im Overview-Tab. Konsistenz-Risiko: `childApps`-Filter nutzt `a.projectId` (Z. 103) — das Feld ist im `App`-Typ (types/domain/hierarchy.ts) NICHT deklariert; funktioniert nur, weil `DeploymentRow`-JSON (store/deployments.go) `projectId` mitschickt und `ignoreBuildErrors: true` den Typfehler versteckt. Andere Stellen resolven über `workspaceId` — Vereinheitlichen. |
| 35 | jimesh-project-selector-modal | ✅ (Modal) | ScopeSelectorModal.tsx (Level `project`) | ✅ Sidebar-Scope-Section | **BUILT** | — |
| 36 | jimesh-proxy-chain-overview-graph-first | ✅ `/proxy/chains` | ProxyChainsPage.tsx | ✅ proxyItems (proxyChains) | **BUILT** | Echter Graph-Payload (GET `/api/chains/{id}/graph`), Hand-rolled-SVG-DAG + Node-Inspector = Graph-First wie Design. Rest-Mock: `mesh://llm-proxy:8080/v1`-Ingress-Pill (Z. 270) ist eine NICHT existente URI mit Copy-Button — Fiktion kopierbar; eBPF-Badge jetzt ehrlich „not verified" (statt „Enforced"). |
| 37 | jimesh-scope-selector-component | ✅ (Modal) | ScopeSelectorModal.tsx | ✅ Sidebar-Scope-Section | **BUILT** | Checkbox-Baum + Chips + „Apply Scope" wie Prompt 6; Multi-Select-Arrays in `lib/global-scope.ts`. |
| 38 | jimesh-scope-selector-component-refined | ✅ dito | ScopeSelectorModal.tsx | ✅ | **BUILT** | — |
| 39 | jimesh-secrets-vault | ✅ `/vault-dashboard` | VaultDashboardPage.tsx | ✅ platformItems (vault) | **BUILT** | Engines-Registry + die 4 konsolidierten Namespace-Tabs (§8.3c, SPRINT-50: internal / llm / projects/{id} / projects/{id}/users/{uid}) + „New Engine", „Add Secret", „Import from Engine". Gap: „Rotate" aus dem Design fehlt (kein Rotations-UI/-Endpoint). |
| 40 | jimesh-security-findings | ✅ `/security/findings` | SecurityFindingsPage.tsx | ❌ **kein Nav-Eintrag**; 1 inline-Link (WorkspaceDetailPage Z. 407) | **PARTIAL** | Seite real (ehrlicher Fallback auf `/api/security/events` + `/api/sdk/logs`, weil GET `/api/security/findings` im Backend nicht existiert). Weder in securityItems (Top-Nav) noch in der Sidebar noch in der Palette verlinkt. |
| 41 | jimesh-security-findings-refined | ✅ dito | SecurityFindingsPage.tsx | ❌ dito | **PARTIAL** | dito. |
| 42 | jimesh-siem-events-timeline | ✅ `/security/siem` | SIEMEventsPage.tsx + lib/siem-timeline.ts | ⚠️ Sidebar Events ✓, Top-Nav ❌ | **BUILT** | Timeline-Strip (Stacked-Severity-Bars) wie Design; `/security/siem` fehlt allerdings in securityItems (dort liegt nur `/security/events`) — über die Sidebar erreichbar. |
| 43 | jimesh-ssh-target-detail-root-187-124-2-174 | ✅ `/workspaces/targets/:targetName` | SSHTargetDetailPage.tsx | ✅ Endpoints-Rows (inline) | **BUILT** | §8-konform: sshTarget-Freitext-Match, zeigt ALLE Workspaces auf dem Server, kein Fake-FK. |
| 44 | jimesh-stitch-designer-plugin-detail | ❌ keine (kein `/plugins/:id`) | ❌ (nur Katalog-Karten) | — | **GAP** | Design: Plugin-Detail „Stitch Designer" — Design Import & Two-Way Sync, Session History & Prompt Replay, Asset Management & Token Export, „Open Studio". Es gibt keine Plugin-Detail-Route; PluginCatalogPage hat nur Katalog + Install-Wizard. Hängt am unvollständigen Plugin-System (Backlog #106–116). Generischer Plugin-Detail-Surface-Renderer (#110) wäre der Träger. |
| 45 | jimesh-subagent-approval-queue | ✅ `/subagents/approvals` | SubagentApprovalQueuePage.tsx | ✅ workspaceItems (subagentApprovals) | **BUILT** | — |
| 46 | jimesh-target-selector-modal | ✅ (Modal) | ScopeSelectorModal.tsx (Level `ssh`) | ✅ | **BUILT** | — |
| 47 | jimesh-teams-resource-bindings | ✅ `/admin/teams` | TeamsPage.tsx + rbac/team-bindings-panel.tsx | ✅ Admin-Nav | **BUILT** | Team-Detail mit Members + Resource Bindings nach Stitch-Tabs. Design-Rest offen: Access-Preview/Live-Simulations-Sidebar + Rule-Trace (Alt-Audit #165). |
| 48 | jimesh-tool-call-inspector | ✅ `/subagents/tool-calls` | ToolCallInspectorPage.tsx | ✅ workspaceItems (toolCallInspector) | **BUILT** | — |
| 49 | jimesh-user-management | ✅ `/admin/users` | AdminUsersPage.tsx | ✅ Admin-Nav | **BUILT** | Stitch-referenziert (jimesh-user-management), Create-User-Contract getestet (AdminUsersPage.test.tsx). |
| 50 | jimesh-vault-access-matrix | ❌ keine | ❌ (nur Screenshot-Deko in TourPage.tsx) | — | **GAP** | Design: „Vault Access Control" — Identity×Ressource-Kreuztabelle (Full/Read-Only/Denied/Inherited-Badges, Violation-Highlight), „Active OPA Policy Rules", „Database Engine Gate", „Root Envelope Protection", „Zero-Trust Egress". Keine Matrix-/Grant-Struktur in VaultDashboardPage/ProjectSecretsPage. Struktur-Spec steht im Alt-Audit (#167) + Backlog; braucht vermutlich OPA-Eval-Endpoint pro (Identity, Ressource) — `capabilities.rego` (#070) potenziell wiederverwendbar. |
| 51 | jimesh-workspace-detail-prod-workspace | ✅ `/workspaces/ws/:workspaceId` | WorkspaceDetailPage.tsx | ✅ Sidebar-Tree (Workspace-Klick) | **BUILT** | Sprint-50-Cleanup: ALLE Fake-Daten (6 Fake-Container, erfundene Secrets-Liste, Fake-Findings-Call) ersetzt durch echte `/api/deployments`, Vault-Secrets (`projects/{id}/`-Prefix) und Findings-Feeds. Der uralte Backlog-#128-Vorbehalt (GET /api/deployments fehlt) ist obsolet — die Route existiert und wird benutzt. |
| 52 | jimesh-workspace-selector-modal | ✅ (Modal) | ScopeSelectorModal.tsx (Level `workspace`) | ✅ | **BUILT** | — |
| 53 | website-docs | ✅ `/docs` (public, pre-AuthGate) | DocsPage.tsx | ✅ Landing/Tour-Links | **BUILT** | Von der eBPF/SPIFFE-Fiktion auf echte zur Build-Zeit gebündelte Docs umgeschrieben. |
| 54 | website-landing | ✅ `/landing` (public) | LandingPage.tsx | ✅ | **BUILT** | Auf echtes Produkt umgeschrieben (echter Quickstart, echter /overview-Screenshot, PolyForm). IA-Abweichung: Root `/` redirectet auf `/overview` (Dashboard), die Landing liegt auf `/landing` — nicht Root wie im Design-Konzept. |
| 55 | website-landing2 | ✅ `/landing` | LandingPage.tsx | ✅ | **BUILT** | Zweit-Variante, gleiche Page. |
| 56 | website-tour | ✅ `/tour` (public) | TourPage.tsx | ✅ Landing-Links | **BUILT** | 1:1-Struktur der Stitch-Tour-Page mit echten Screenshots (assets/stitch/). |

---

## 3. Detail-Analysen

### 3.1 GAPs — Designs ohne Route/View (5)

1. **Admin-Settings-API-Keys (#1)** — „Global Utility Keys" sind eine eigene Key-Kategorie
   (Stitch-AI-Engine-Key, GitHub-VCS-Connector, LLM-Gateway-Keys) mit Project-Override-
   Precedence. Heute existieren nur: `/keys` (Provider-Keys, paid/free), `/admin/consumer-keys`
   (User-sk-Keys), `/vault-dashboard` Namespaces (internal/llm/projects). Die Utility-Key-
   Kategorie + Override-Precedence fehlt in Backend UND Frontend. **Vor Bau: mit Operator
   klären, ob das Design noch gewollt ist** (Alt-Audit #164 klassifizierte es als „andere
   Produktidee" — es könnte durch das Vault-Namespace-Modell §8.3c abgelöst sein).
2. **Design-Assets-Folder (#17)** — Stitch-Import/Sync im Produkt. Setup: kein Endpoint, keine
   Seite. Nächster Träger wäre das Plugin-System (#106–116) bzw. ein eigener File-Browser-
   Dialog auf `design-assets/` (FileBrowserModal existiert generisch).
3. **Distributed-Trace-Detail (#18)** — Backend-blockiert. Reihenfolge: (a) OTel-Spine
   Call-Sites geben (Routers/Proxy/Agent-Session), (b) Export (File/OTLP) implementieren,
   (c) Route für Trace-Queries servieren, (d) DANN TracesPage durch echte Waterfall-View
   ersetzen (Design hat Langfuse-Export + OpenLLMetry-Referenz). Bis dahin bleibt der
   ehrliche Placeholder korrekt (Mandat 2).
4. **Stitch-Designer-Plugin-Detail (#44)** — braucht generische Plugin-Detail-Route
   (`/plugins/:pluginId`) als Teil des Surface-Renderers (#110); die Stitch-spezifischen
   Features (Two-Way-Sync, Prompt-Replay, Token-Export) sind separat zu klären, weil das
   Stitch-MCP bisher ein Operator-Workflow (CLAUDE.md) ist, kein Produkt-Feature.
5. **Vault-Access-Matrix (#50)** — wertvollster neuer Endpoint: OPA-basierte
   (Identity × Ressource)-Evaluation. `capabilities.rego` (#070) existiert; Frontend-Matrix
   + „Active OPA Policy Rules"-Karten fehlen komplett. Struktur-Spec: Alt-Audit #167.

### 3.2 PARTIALs — Route/View da, Kern oder Erreichbarkeit fehlt (7)

1. **Onboarding (#11/#12) — Erreichbarkeit = 0.** `/onboarding` existiert mit echtem 4-Step-
   Flow, aber: kein einziger `navigate('/onboarding')`, kein Nav-/Sidebar-/Palette-Eintrag.
   OnboardingPage fragt selbst `GET /api/settings/onboarding_complete` ab — ein First-Start-
   Redirect (wenn `completed !== true`) wäre der natürliche Einstieg. **Billigster P0-Fix
   des ganzen Audits.**
2. **Agent-Chat-Proxy-Status (#2)** — das Design zeigt rechts „LLM Proxy & Routing Status"
   (aktive Kette, Fallback-Stand, Latenz) während des Chats. ChatInterface hat KEINE
   Verbindung zum Proxy-Routing (ruft direkt `/v1/chat/completions`). Baustein existiert:
   `/api/analytics/*`, `/api/profiles/active`, `/api/fallback` — ein Status-Rail im Chat
   wäre mit echten Daten füllbar.
3. **Dashboard-Builder (#14)** — Phase-2-Doku ist ehrlich, aber der Design-Screen
   (Widget-Properties-Panel, Connector-Quellen, „Add Blank Row", „Save Dashboard") ist
   ein anderes Produkt als die heutigen 5 Fix-Cards. Entweder Backlog-Eintrag als
   „Design-Reduktion akzeptiert" oder Phase 2 bauen.
4. **Firewall-Rules Top-Nav (#20)** — `/security/firewall-rules` fehlt in
   `securityItems` (section-nav.ts). 1 Zeile + i18n-Key. Gleiches Muster:
   `/security/siem` (#42) ebenfalls nicht in securityItems.
5. **Security-Findings Nav (#40/#41)** — die Findings-Seite (Kern des Security-Designs!)
   ist nirgends navigierbar. Entweder securityItems-Eintrag oder als Tab hinter
   SecurityOverview exponieren.
6. Siehe außerdem §3.3 für die bewussten Sidebar-Abweichungen (Operator-Spec vs. Ist).

### 3.3 Bewusste Abweichungen vom Original-Design (dokumentiert, kein heimlicher Gap)

Die Sidebar-Designs (#23/#24) wurden — wie im Operator-Prompt
`glm-sidebar-scope-redesign.md` angeordnet — bewusst umgebaut (4 Sections statt
Original-Prompt-1-Baum). Gegen den NEUEN Operator-Spec selbst bleiben 4 Abweichungen:

1. **Dritter Layout-Modus „All Servers" fehlt** — Spec: „By Server / By Project /
   **All Servers** (Overview über alle Server+Projects gleichzeitig — dritter Modus,
   zusätzlich zum bestehenden 2er-Toggle)". Gebaut: `SidebarViewMode = 'project' |
   'server'` — NUR 2 Modi. Der „ALL SSH TARGETS"-Parent-Button navigiert zu
   `/workspaces` mit scope all, ist aber kein dritter Toggle-Modus.
2. **Position des Layout-Toggles** — Operator: „ganz oben soll der layout button sein".
   Gebaut: der By-Project/By-Server-Toggle liegt in der MITTE der Sidebar (unter dem
   ALL-Parent in der Tree-Section), nicht ganz oben über dem Scope-Selector.
3. **Workspace-Dropdown unter Project in beiden Modi** — Spec: „Workspaces bleiben immer
   ein Dropdown UNTER dem gewählten Project — in BEIDEN Modi". Gebaut: im Server-Modus
   hängen Workspaces direkt unter dem SERVER (gruppiert), eine Project-Refinement-Stufe
   darunter fehlt.
4. **Multi-Select-Audit-Tabelle fehlt** — Spec: „BEVOR Multi-Select in der UI gebaut wird:
   vollständige Liste … Output dieser Prüfung: eine Tabelle ‚Endpoint | Multi-fähig JETZT?
   | Multi-fähig NÖTIG? | Aufwand' — bevor irgendein Multi-Select-UI-Code geschrieben
   wird." **Diese Tabelle existiert NICHT** (verifiziert: 0 Treffer in docs_dev/ + docs/),
   aber das Multi-Select-UI (ScopeSelectorModal-Multi-Arrays, `setGlobalScope`,
   SPRINT-52) ist bereits gebaut. Der Reihenfolge-Auftrag wurde verletzt; die Prüfung
   (Network-Create? Deployment-Create? Plugin-Install? Overview-Scope-Filter?) ist
   **nachzuholen** — bis dahin ist unklar, ob die gebauten Multi-Scopes überall echt
   wirken oder nur Chips setzen.

---

## 4. Operator-Prompts aus USER_REQUIREMENTS_SUMMARY.md — Status gegen Code

Alle 10 chronologischen Operator-Prompts der LLM-Proxy-Ära sind im heutigen Code
verifiziert vorhanden:

| # | Operator-Forderung (Kurz) | Verifikation im Code | Status |
|---|---|---|---|
| 1 | Models-Seeding + `POST /api/premium/sync` | `gateway.go:313` `mux.HandleFunc("/api/premium/sync", s.handlePremiumSync)` | ✅ BUILT |
| 2 | `/api/models` + `/api/models/{id}` statt 404 | `gateway.go:206–207` | ✅ BUILT |
| 3 | Dynamischer Model-Crawler bei Key-Anlage (nicht gehardcodet) | `components/keys/discover-models-dialog.tsx` + Backend-Crawler (unbegrenzte Discovery) | ✅ BUILT |
| 4 | „Keys" → „Providers" + Model-Scope-Edit-Button | `components/keys/provider-list.tsx` + `model-scope-dialog.tsx` | ✅ BUILT |
| 5 | `__SERVER_PORT__` Injektion + NVIDIA-Multi-Model-Fix | `next.config.mjs` DefinePlugin (`"3010"`); Keyword-Filter entfernt | ✅ BUILT |
| 6 | mTLS (client-chain.pem) + WebSocket-Completion-Proxy | `internal/ai/proxy.go:780` (certPath) + `/v1/chat/completions/ws` (`aihandlers.go:52`, gorilla/websocket upgrader) | ✅ BUILT |
| 7 | Chain-Profile erstellen + is_paid-Switch | `gateway.go:202–204` (`/api/profiles`, `/api/profiles/active`, `/api/profiles/{id}`) + `ModelDetailPage.tsx:609` „Is Paid Model"-Switch | ✅ BUILT |
| 8 | Multi-Provider-Model-Scope + Refresh + expandierende Provider-Rows | `model-scope-dialog.tsx` (Multi-Provider) + provider-list Refresh/Chevron | ✅ BUILT |
| 9 | OpenRouter-Specs + Provider/Key/Type-Filter + Stats-Sidebar | `FallbackPage.tsx`: Filter + „Model Insights & Engine Stats"-Slide-out (Z. 606–736) + `/api/fallback/stats` | ✅ BUILT |
| 10 | Select All/None + Key-Level Paid/Free-Toggle | `model-scope-dialog.tsx:73,81` + `provider-list.tsx:618` (PATCH `/api/keys/{id}` isPaid) | ✅ BUILT |

**Anmerkung (Doku-Drift, kein Code-Gap):** USER_REQUIREMENTS_SUMMARY.md beschreibt noch
die LEGACY-Architektur („SQLite (CGO-Free)", Port 3009 gRPC / 3010 HTTP, Next.js SPA).
Der aktuelle Stack ist PostgreSQL/pgx-v5 (CLAUDE.md) mit anderer Port-/Compose-Topologie.
Das Dokument selbst sollte modernisiert werden — die 10 Forderungen sind im heutigen
Code trotzdem alle erfüllt.

Die weiteren Operator-Prompts (`docs_dev/prompts/`):

- **glm-session-fill-the-gaps.md** — Item 1 File-Browser-Backend (`/api/ssh/explore`):
  Route existiert (`gateway/ssh_explore.go`, registriert in `gateway.go:293`); der
  Alt-Audit-§1-Kritikal-Befund „DOPPELTE Registrierung (deploy.go:78 UND gateway.go:293
  → ServeMux-PANIC)" ist GEHEILT — verifiziert 27.9.: nur noch EINE Registrierung, das
  deploy.go-Duplikat ist entfernt. Item 2 (Secrets §8.3c)
  BUILT, Item 3 (5 Design-Routen) BUILT bis auf Trace-Detail (#18, backend-blockiert),
  Item 4 (WorkspaceDetailPage echt) BUILT, Item 5 Plugin-System: Registry/Installation
  real (`/api/plugins`, `/api/plugin-installations`), Manifest-Spec/Auth-Connector/
  Surface-Renderer weiterhin Backlog (#106–116).
- **glm-session-item2-item3.md** — alle 5 genannten Design-Lücken gebaut
  (App-Discovery, Deployment-Detail, SSH-Target-Detail, Browser-Integration via Modal),
  außer OTel-Trace-Detail (s.o.).
- **glm-session-full-task-split.md** — GLM-Items 1–4 erledigt; Backlog #130 (User-
  Provisionierung), #131 (Shared Workspace), #132 (Projekt-Migration) weiterhin offen
  (§8.3/§8.5 PLANNED). Claude-Items (§8.3b Project-Detail-Komponenten, RBAC-Visibility,
  Detail-Dual-View): §8.3b Secrets+Apps inline BUILT; RBAC-Visibility (Company Project,
  Scratch-Section, Default-Workspace-Einträge) NICHT gebaut; Dual-View in Detail-Pages
  NICHT gebaut (nur Sidebar-Toggle).
- **glm-session-sync-architecture.md** — §8-Bezug überall eingehalten (Sidebar, SSH-
  Target-Detail, Overview alle am §8-Modell ausgerichtet, verifiziert).

---

## 5. Cross-Cutting-Nav-Befunde (Routen vs. Erreichbarkeit)

| Route | In App.tsx | Top-Nav | Sidebar | Palette | Befund |
|---|---|---|---|---|---|
| `/overview` (Haupt-Dashboard!) | ✅ | ❌ | ❌ (ALL-Parent → /workspaces) | ❌ | Nur via Root-Redirect/Brand-Klick erreichbar — kein expliziter Nav-Eintrag. |
| `/onboarding` | ✅ | ❌ | ❌ | ❌ | **Gar nicht erreichbar.** |
| `/security/findings` | ✅ | ❌ | ❌ | ❌ | Nur 1 inline-Link (WorkspaceDetailPage). |
| `/security/siem` | ✅ | ❌ | ✅ (Events) | ❌ | Top-Nav-Dropdown kennt nur /security/events. |
| `/security/firewall-rules` | ✅ | ❌ | ✅ (Events) | ❌ | securityItems haben nur die 3 firewall/*-Subroutes. |
| `/dbs/datalake` | ✅ | ❌ (dbItems: backups+discovery) | ❌ | ❌ | Route ohne Nav (kein Stitch-Design, aber derselbe Reachability-Defekt). |
| `/api-docs`, `/premium`, `/admin/*` | ✅ | Admin-Marker/Palette teils | — | /premium ✓ | ok (bewusst). |
| Command-Palette | — | — | — | — | ~24 Pages; es fehlen u. a. alle /security/*, /sessions, /subagents/*, /plugins*, /builder, /proxy/*, /overview, /onboarding, /admin/*, /dbs/*. |

**Toter Code (aus Alt-Audit §8, verifiziert immer noch aktuell):**
`ProjectsPage.tsx` (1351 Zeilen, enthält als EINZIGE Oberfläche das
`DeleteProjectDialog`) wird importiert (App.tsx:40) aber NICHT gerendert —
`/projects` ist nur ein `<Navigate to="/workspaces">`. Projekt-Löschung bleibt damit
für den Operator unerreichbar (Ursache des alten „Geisterprojekte"-Wutausbruchs). Fix:
Delete-Flow in WorkspacesPage/ProjectDetail integrieren oder ProjectsPage dekommissionieren.

---

## 6. Type-/Ehrlichkeits-Randfunde (aus diesem Audit neu)

1. **App-Typ-Drift:** `ProjectDetailPage.tsx:103` filtert `a.projectId` — im `App`-Typ
   nicht deklariert; funktioniert nur wegen undokumentiertem Runtime-Feld aus
   `DeploymentRow.projectId`. `ignoreBuildErrors: true` (next.config.mjs) versteckt den
   Typfehler. Vereinheitlichen auf `workspaceId`-Resolution (wie AppDetailPage/store)
   oder `projectId` in den Typ aufnehmen.
2. **Stale Kommentare (Lüge durch Kommentar):** `ContainerLogViewer.tsx:17–23` und
   149–155 behaupten, die Logs-Route existiere nicht — sie existiert und ist live
   verifiziert (GHOST-AUDIT-Fix 20.9.). Nur Kommentar-Cleanup nötig.
3. **`mesh://llm-proxy:8080/v1`-Ingress-Pill** (ProxyChainsPage:270): nicht existente
   URI, per Copy-Button „kopierbar" — Rest-Mock aus dem Design (Mandat 2 verletzt).
   Durch echte Origin-URL ersetzen (wie LlmProxyOverviewPage es macht).
4. **App-Icons fehlen im App-Discovery-Result:** Operator-Wunsch (Docker-Hub-Metadaten →
   App-Typ-Icon); `lib/app-icons.ts` existiert und wird in Sidebar/ScopeSelector
   benutzt, aber nicht in AppDiscoveryPage.

---

## 7. Delta zum AUDIT-2026-09-21-GAP-LIST.md — was seitdem GEFIXT wurde

| Alt-Audit-Befund (21.9.) | Heute (27.9.) |
|---|---|
| 4 Selector-Modals „keine Datei im Frontend" | ✅ GEFIXT — ScopeSelectorModal angedockt (SPRINT-52), alle 4 Levels (ssh/project/workspace/app) wired. |
| Zweiter verwaister Scope-Selector (`components/layout/scope-selector.tsx`) | ✅ ENTFERNT — layout/-Verzeichnis existiert nicht mehr. |
| PluginCatalogPage Fake-Ratings/fiktive Plugins (metadataMap) | ✅ GEFIXT — Backlog #145, nur echte `/api/plugins`-Daten. |
| Integrations nur linke Hälfte (kein Active-Deployments-Panel) | ✅ GEFIXT — ActiveDeploymentsSection (SPRINT-54 #170). |
| AgentSessionDetailPage „100% Theater" | ✅ GEFIXT — echte `/api/sessions` + tool-calls Queries. |
| PluginInstallWizard Fake-Connection-Test (600 ms) | ✅ GEFIXT — ehrliche Notiz, kein Fake. |
| PluginSettings Dead-Buttons/Live-Stream-Fake | ✅ GEFIXT — echte apiFetch-Handler. |
| ContainerLogViewer „Query aktiv, Route existiert" vs. TODO-Kommentar | ⚠️ TEILS — Query aktiv + Route real, aber die stale Kommentare stehen noch (§6.2). |
| ProxyChainsPage „eBPF Token Gate: Enforced"-Fake | ✅ GEFIXT — zeigt jetzt ehrlich „not verified". Aber `mesh://`-Pill bleibt (§6.3). |
| ProjectDetailPage: `useParams` aus 'react' (Bundle-Killer) | ✅ GEFIXT — Import aus 'react-router-dom' (App.tsx:intakt). |
| WorkspaceDetailPage Fake-Containers/Secrets | ✅ GEFIXT — Sprint-50-Cleanup, echte Daten. |
| Backlog #128 „GET /api/deployments existiert nicht" | ✅ OBSOLET — Route existiert (`deploy.go:77`), SSOT-Store nutzt sie. |
| Vault-Access-Matrix fehlt | ❌ WEITERHIN OFFEN (GAP #50). |
| Admin-Settings-API-Keys „andere Produktidee" | ❌ WEITERHIN OFFEN (GAP #1). |
| Live-Proxy-Status im Agent-Chat | ❌ WEITERHIN OFFEN (PARTIAL #2). |
| ProjectsPage tot / Delete-UI unerreichbar | ❌ WEITERHIN OFFEN (§5). |
| Command-Palette ohne Live-Registry-Suche (#159) | ❌ WEITERHIN OFFEN. |
| DashboardBuilderPage Phase-2-Mangel (#161) | ❌ WEITERHIN OFFEN (PARTIAL #14). |
| Teams Access-Preview/Rule-Trace (#165) | ❌ WEITERHIN OFFEN. |
| Doppelte `/api/ssh/explore`-Registrierung (ServeMux-PANIC, kritisch) | ✅ GEFIXT — verifiziert 27.9.: nur noch EINE Registrierung (`gateway.go:293`), deploy.go-Duplikat entfernt. |

---

## 8. Priorisierte Liste der fehlenden Features

### P0 — Erreichbarkeit & Operator-Aufträge (billig, sofort)

1. **Onboarding-Erreichbarkeit** — Nav/Palette-Eintrag + First-Start-Redirect auf
   `/onboarding`, wenn `GET /api/settings/onboarding_complete` ≠ true. (Design #11/#12)
2. **Multi-Select-Audit-Tabelle nachholen** (glm-sidebar-scope-redesign: „Auditpflicht vor
   UI-Arbeit") — Tabelle „Endpoint | Multi-fähig JETZT? | Multi-fähig NÖTIG? | Aufwand"
   über: Network-Create, App/Deployment-Create, Plugin-Install, Overview-Scope-Filter
   (`lib/global-scope.ts`). Prüfen, ob SPRINT-52-Multi-Scopes überall wirklich filtern
   oder nur Chips setzen.
3. **`/security/findings` + `/security/siem` + `/security/firewall-rules` in
   securityItems** aufnehmen (3 Zeilen + i18n-Keys) — sonst ist der Security-Tab
   unvollständig navigierbar.
4. **Dritter Sidebar-Modus „All Servers"** + Layout-Toggle nach oben (Operator-Spec
   Punkt 1) — `SidebarViewMode` um `all` erweitern.
5. **`/overview` als expliziter Nav-Eintrag** (Palette + ggf. Sidebar-Navigation).

### P1 — fehlende Design-Screens (neue Flächen)

6. **Vault-Access-Matrix** (#50/#167) — OPA-Eval-Endpoint (Identity×Ressource) + Matrix-UI;
   `capabilities.rego` wiederverwenden. Höchster Nutzerwert der 5 GAPs (Security-Kern).
7. **Agent-Chat-Proxy-Status-Panel** (#2) — Live-Routing-Status im Chat aus echten
   `/api/analytics` + `/api/profiles/active` + `/api/fallback`-Daten; Transcript-Export.
8. **Distributed-Trace-Detail** (#18) — ZUERST Backend (OTel Call-Sites + Export + Query-
   Route, F-05), dann Waterfall-UI (Langfuse-Export). Ehrlicher Placeholder bleibt bis dahin.
9. **Plugin-Detail-Route `/plugins/:pluginId`** (#44) — Träger: Plugin-System #110
   (Surface-Renderer); Stitch-Designer-Features (Two-Way-Sync, Prompt-Replay) separat
   klären, da Stitch-MCP bisher Operator-Workflow ist.
10. **Admin-Settings-API-Keys / Credential Scopes** (#1) — VOR Bau Operator-Freigabe
    einholen (Alt-Audit #164: möglicherweise durch §8.3c-Namespaces abgelöst).
11. **Design-Assets-Folder / Stitch-Import** (#17) — an #9/#10 gekoppelt; ohne Plugin-
    System nicht sinnvoll baubar.

### P2 — Partial-Flächen vervollständigen

12. **Dashboard-Builder Phase 2** (#14) — freie Widgets + Properties + Connector-Quellen,
    oder Reduktion offiziell ins Backlog schreiben.
13. **Quick-Deploy-Leiste** im Integrations-Design (#25) — oder ehrlich streichen.
14. **ContainerLogViewer-Kommentare aufräumen** (#13/§6.2) — Funktion ist live, Kommentare
    lügen.
15. **`mesh://`-Ingress-Pill ersetzen** (§6.3) — echte Origin-URL wie LlmProxyOverview.
16. **Command-Palette** — fehlende Pages nachtragen + Live-Registry-Suche (#159).
17. **Secrets „Rotate"** (#39) — Rotations-Endpoint + UI, oder aus dem Design entfernen.
18. **Teams Access-Preview/Rule-Trace** (#47/#165).
19. **App-Typ-Icons im App-Discovery-Result** (§6.4) — `getAppIcon` in AppDiscoveryPage.
20. **Projekt-Löschung erreichbar machen** (§5) — Delete-Flow aus der toten ProjectsPage
    in WorkspacesPage/ProjectDetail übernehmen.

### P3 — Konsistenz & §8-PLANNED-Arbeit

21. **App-Typ-Drift fixen** (§6.1) — `projectId` deklarieren oder per `workspaceId` resolven.
22. **Workspace-Dropdown unter Project im Server-Modus** (§3.3.3).
23. **§8.3b RBAC-Visibility** — Company Project, User-Scratch-Section, Default-Workspace-
    Einträge („my project workspace" / „company workspace") — PLANNED, ungebaut.
24. **Backlog #130 User-Provisionierung, #131 Shared Workspace, #132 Projekt-Migration**
    (§8.3/§8.5) — zugewiesen, ungebaut.
25. **USER_REQUIREMENTS_SUMMARY.md modernisieren** (SQLite→Postgres-Drift, §4).
26. ~~Doppelte `/api/ssh/explore`-Registrierung~~ — bereits gefixt (nur noch
    `gateway.go:293`), kein Handlungsbedarf mehr; hier nur der Vollständigkeit halber
    dokumentiert, dass der Alt-Audit-§1-Kritikalpunkt erledigt ist.

---

## 9. Verifikations-Befehle für den Operator

- Routen: `grep -n "Route path" src/frontend/src/App.tsx`
- Nav-Modell: `cat src/frontend/src/lib/section-nav.ts`
- Sidebar-Sections: `grep -n "NAVIGATION_ITEMS\|EVENTS_ITEMS\|SidebarViewMode" src/frontend/src/components/sidebar/HierarchySidebar.tsx`
- Onboarding-Erreichbarkeit (leer = unerreichbar): `grep -rn "navigate('/onboarding" src/frontend/src/`
- Container-Logs-Route: `grep -n "containers/{cid}/logs" src/backend/internal/deploy/deploy.go`
- Multi-Select-Audit existiert nicht: `grep -rn "Multi-fähig" docs_dev/ docs/`

*Erstellt vom Design-Audit-Agent (DSH), 27.9.2026. Kein Code verändert — nur Analyse.
Dieses Dokument ergänzt (nicht ersetzt) AUDIT-2026-09-21-GAP-LIST.md; Abschnitt 7
listet das Delta zwischen beiden.*
