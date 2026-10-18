# FRONTEND-MOCK-PLAN — JiMesh-UI nach den Stitch-Designs

| | |
|---|---|
| **Status** | Plan — **kein Code in dieser Änderung** (Auftrag: „KEINE Code-Änderungen — nur der Plan") |
| **Auftrag** | Die 29 Stitch-HTML-Designs in `design-assets/stitch/` in eine React-Mock-Implementierung überführen: Routen-Mapping, Komponenten-Dekomposition, shadcn-Mapping, Baureihenfolge für JULES, Backend-Verträge, Animations-Regeln |
| **Analyse-Basis** | `docs/COMPONENT-SCHEMA.md` (vollständig), `src/frontend/src/App.tsx` (Routen 1–637), `lib/section-nav.ts`, `components/sidebar/HierarchySidebar.tsx`, `components/overview/OverviewGrid.tsx`, `components/nodes/NodeHealthStrip.tsx`, `types/domain/hierarchy.ts`, `index.css` (Theme-Tokens), `package.json` (Dependencies); Stitch: 6 Kern-Screens im Detail (sidebar-refined, dashboard-overview, app-detail-interfaces, ssh-target-detail, integrations-and-plugins, scope-selector-refined) + strukturelle Extraktion aller übrigen 23 Dateien |
| **Belegdisziplin** | Jede Behauptung über den Ist-Zustand trägt `datei:pfad` bzw. `App.tsx:Zeile`. Backend-Lücken sind mit dem Beleg aus `COMPONENT-SCHEMA.md` §9 markiert — nichts wird als vorhanden behauptet, was nicht im Code liegt. |

---

## 0. Inventar & Ehrlichkeit vorab

**Der Bestand ist 29, nicht 32.** `design-assets/stitch/` enthält genau **29 HTML-Dateien** (kein Subfolder, `find design-assets -name '*.html' | wc -l` → 29). Davon sind **5 „refined"-Varianten** (sidebar, onboarding, scope-selector, browser-integration-selection, security-findings) und **1 nicht-Produkt-Screen** (`jimesh-design-assets-folder.html` — ein Stitch-Tool-Mockup „Design Assets & AI Sessions", **kein JiMesh-Feature**). Das ergibt **23 eindeutige Produkt-Screens + 5 Verfeinerungen**. Eine dedizierte **„App Discovery"**-Datei existiert nicht — der Name taucht im Req-Brief auf, im Bestand ist der nächstliegende Screen `jimesh-project-overview-iac-files-tab.html` (Entdecken von Compose-Services aus dem Manifest) bzw. die existierende `/dbs/discovery`-Fläche (DiscoveryPage). Das ist im Route-Mapping ehrlich ausgewiesen.

**Stitch-Design-Charakter:** dunkle „Control-Plane"-Ästhetik (Material-3-Tokens, `surface-container`, `outline-variant`, `bg-primary/10`), Material-Symbols-Ligaturen als Icons, Geist-artige Sans + weite `tracking-wider`-Labels, tabellenlastige Listen, Live-Log-Strips. Die Mock-Copy der Designs (MeshCore, eBPF, WireGuard, PromQL, „v3.4 CORE") wird als **Copy-Vorlage** übernommen, Brand-Mark bleibt **JiMesh** (`components/brand/jimesh-mark.tsx`).

---

## 1. Design-System-Brücke: Stitch (Material 3) → JiMesh (shadcn)

Die Stitch-Dateien nutzen **Material-3-Token-Namen**, die es in JiMesh nicht gibt. JiMesh fährt das Standard-shadcn-Set (`index.css`: `--background/--foreground/--card/--muted/--accent/--destructive/--border/--ring` + `sidebar-*` + `chart-1..5`, neutral-monokrom, Light/Dark). **Regel: keine Material-3-Klassen kopieren — jede Übersetzung geht über die shadcn-Tokens.** Die Designs sind dark-first; die Implementierung baut auf den shadcn-Klassen und gewinnt Dark-Mode über `dark:`-Varianten gratis.

### 1.1 Token-Mapping (bindend)

| Stitch-Klasse | JiMesh-Übersetzung | Anmerkung |
|---|---|---|
| `bg-surface-container` (Aside/Header) | `bg-sidebar` (Links) · `bg-card` (Kontext-Chrome) | Sidebar-Token existiert |
| `bg-surface-container-lowest` (Main) | `bg-background` | |
| `bg-surface-container-low` (Card) | `bg-card` | Card-Shadow via `shadow-sm` |
| `bg-surface-container-high(est)` (Chips) | `bg-muted` / `bg-accent` | |
| `border-outline-variant` | `border-border` | |
| `bg-primary/10 + border-primary/30` (Status-Container) | `bg-primary/10 border-primary/30` | identische Muster, shadcn-Alpha |
| `bg-primary-fixed-dim`, `bg-primary-container` | `bg-primary` (Buttons) · `bg-primary/10` (Tint) | kein fixed-dim im Theme |
| `bg-secondary-container`, `bg-tertiary/10` | `bg-secondary`, `bg-muted` | |
| `bg-error-container/…`, `bg-error` | `bg-destructive/10`, `text-destructive`, `bg-destructive` | |
| `bg-emerald-*/10`, `bg-amber-*/10`, `bg-red-950/80` (Status-Tint) | Emerald/Amber/Red-Skala **bleibt Tailwind-Standard**, nicht tokenisieren | Status-Tints sind semantisch (positive/warning/critical) → `TONE_CLASS` aus `OverviewGrid.tsx` ist das Repo-Präzedenz-Muster |
| `rounded`-Stufen | shadcn-Radien (`rounded-md/lg/xl`, `--radius`-Leiter in `index.css`) | |
| Hardcoded-Hex (`#0d0e15`, `#232538`, `#13141f`) | **verboten** → `bg-sidebar`, `border-border`, `bg-card` | sonst bricht Light-Mode |

### 1.2 Typografie & Meter

- `font-semibold tracking-tight` für Screen-H1 → Geist Sans (Theme), H1 20–24px; `uppercase tracking-wider text-[10px]` für Gruppierungs-Labels (`OVERVIEW`, `SECURITY RUNTIME`) → shadcn-Präzedenz: `HierarchySidebar.tsx` (10px uppercase Label).
- Zahlen, Pfade, Ports, Hashes, Log-Zeilen: `font-mono tabular-nums` (Geist Mono Variable).
- Footer-Statuszeilen (`Cluster Sync: Active · Latency: 12ms`) = `text-xs text-muted-foreground`, Pipe-Separatoren `·`.

### 1.3 Icon-Brücke: Material Symbols → lucide-react

Die Designs nutzen Material-Ligaturen (`span` mit Text `dns`, `terminal`, …). JiMesh fährt **lucide-react** (`package.json`); Mapping als ein Modul `lib/mesh-icons.ts` (eine Quelle; `getAppIcon` aus `lib/app-icons.ts` ist das Repo-Präzedenz-Muster):

| Material-Symbol | lucide | Nutzung |
|---|---|---|
| `dns`, `terminal` | `Server`, `SquareTerminal` | SSH-Target, Shell |
| `folder`, `folder_open`, `folder_special`, `folder_code` | `Folder`, `FolderOpen`, `FolderLock`, `FolderCode` | Project/Workspace, IaC |
| `apps`, `deployed_code` | `LayoutGrid`, `Boxes` | Applications, App |
| `hub`, `lan`, `alt_route` | `Waypoints`, `Network`, `AltRoute` | Integrations, Netz, Routing |
| `smart_toy` | `Bot` | Agent/DSH |
| `code` | `Code` | code-server |
| `desktop_windows` | `MonitorPlay` | VNC/Browser |
| `language` | `Globe` | Web/HTTP |
| `shield`, `security`, `verified_user`, `gpp_bad` | `ShieldCheck`, `ShieldAlert`, `BadgeCheck`, `ShieldX` | Security |
| `crisis_alert` | `Siren` | SIEM |
| `lock`, `lock_open`, `vpn_key`, `key` | `Lock`, `LockOpen`, `KeyRound` | Secrets |
| Rest (database, memory, speed, hard_drive, schedule, layers, rocket_launch, sync, search, filter_alt, refresh, notifications, help, logout, settings, add, close, content_copy, delete, edit, more_vert, expand_more/less, chevron_right, arrow_forward, check, check_circle, error, block, pause, play_arrow, download, upload, visibility, visibility_off, person, group, account_circle) | direkte lucide-Äquivalente (`Database`, `Cpu`, `Gauge`, `HardDrive`, `Clock`, `Layers`, `Rocket`, `RefreshCw`, `Search`, `SlidersHorizontal`, …) | 1:1 |

### 1.4 Screen-Chrome: fünf Bausteine

Jeder Detail-Screen der Designs hat dieselben fünf Bausteine — das wird zu **einer** gemeinsamen Page-Skeleton (§4.1 `MeshPageShell`):
1. **Breadcrumb + Scope-Chip** (`All / trading / workspace-prod / …` + `Scope: 3 Selected`),
2. **Header-Stat-Leiste** (4–5 `MetricTile`),
3. **Tab-Strip mit Count-Chips** (`Overview · Interfaces (4) · Logs (2.4k) · Audit · Settings`),
4. **Content-Grid** aus `SectionCard`-Sektionen,
5. **Footer-Statuszeile** (Sync/Latency/Version).

---

## 2. Mock-Daten-Architektur

### 2.1 Prinzip

1. **Mock first, ehrlich:** Screens rendert man aus React-Query (`@tanstack/react-query` ist schon da, `App.tsx:92`), deren `queryFn` auf die **später echten** Endpunkte zeigt (§7). Der Mock liegt als **fetch-Interceptor unter `apiFetch`** (`lib/api.ts`), nicht als harter Fake in der Komponente — der Swap auf das echte Backend wird ein Flag, kein Umbau.
2. **Mandate 2 (nichts schönfärben):** jede Mesh-Fläche trägt oben rechts einen dezenten **`MOCK`-Chip** (`MeshMockBadge`, `title` = Ursprungs-HTML-Datei). Solange die Quelle der Schein ist, steht es an der Oberfläche. Daten, die der Mock vorgibt (Uptime „14d", Latenz „12ms"), stammen aus den Designs und sind als Beispiel gekennzeichnet — keine erfundenen „echten" Quellen.
3. **Shapes folgen dem Schema, nicht der Design-Copy:** `types/domain/hierarchy.ts` (SSHTarget/Workspace/Project/App), `types/domain/plugins.ts` (Plugin/PluginInstallation), `COMPONENT-SCHEMA.md` §1 (DeploymentSpec, InterfaceSpec, SecretScopeBinding, DockerImageMeta). **Keine Parallel-Typen**, sonst driftet der Mock vom kanonischen Schema.

### 2.2 Dateilayer (Zielstruktur, Neubau)

```
src/frontend/src/
  mocks/
    enable-mocks.ts        // fetch-Interceptor: window.fetch wrappen, wenn import.meta.env.VITE_MOCK=1 (dev-only)
                           // Route-Matching-Table: URL-Pattern → Mock-Handler (~80ms Latency, 5% Fehlersimulation)
    handlers/              // je Domäne: ssh-targets.ts, workspaces.ts, projects.ts, apps.ts,
                           // deployments.ts, interfaces.ts, iac-files.ts, firewall.ts, siem.ts,
                           // secrets.ts, integrations.ts, teams.ts, users.ts, sessions.ts,
                           // subagents.ts, nodes-health.ts, overview.ts, logs-stream.ts
    fixtures/              // rohe Datensätze (aus den Designs übersetzt, typed nach §2.1)
    persistence.ts         // localStorage jimesh.mock-db (MANDATES §3: Nutzer-Arbeit überlebt Reload auch im Mock)
  lib/mesh-icons.ts        // §1.3
  components/mesh/         // §4.1 Primitives
  views/                   // §4.2 Screens (Konvention XxxPage.tsx bleibt)
```

- **Keine neue Dependency nötig.** MSW/Service-Worker wäre die Luxus-Variante; der Interceptor (`VITE_MOCK=1`, Guard `import.meta.env.DEV`) ist abhängigkeitsfrei und dockt exakt dort an, wo später das echte Backend anbindet. `apiFetch` selbst bleibt unverändert — der Interceptor sitzt eine Ebene darunter.
- **Realtime-Log-Streams** (`container-logs-tab`, `deployment-detail` Live-Tail, SIEM-„Live Stream"): Mock antwortet mit `ReadableStream` (`text/event-stream` bzw. chunked), Mündung im `lib/logs.ts`-Muster; Timing-Daten sind Fixtures.
- **Mutationen** (Deploy, Firewall-Apply, Create User, Approve/Deny) im Mock: persistieren in `persistence.ts` und antworten mit dem realen Response-Shape — sonst lügt die UI über Zustände, die sie selbst erzeugt (Mandate 2).

### 2.3 Mock-Fixtures (aus den Designs)

| Fixture | Quelle (Screen) | Shape |
|---|---|---|
| 4 SSH-Targets (`root@187.124.2.174`, `deploy@192.168.10.45`, `admin@10.0.4.12` stage, `k8s-master-01@172.16.0.8`) | sidebar-refined | `SSHTarget` + `data: {pingMs, os, kernel}` |
| 3 Workspaces (prod/test/analytics) | ssh-target-detail | `Workspace` + Resource-Footprint |
| 6–8 Projects inkl. `no_parent`-Bucket | dashboard-overview Tabelle | `Project` + status/replicas/commit |
| 7 Apps (dsh-agent-7f2e, redis-cluster-cache, kafka-event-bus, grpc-exec, nginx-ingress, …) | app-detail, workspace-detail | `App` + `data: {image, pod, uptime, cpuPct, memMB}` |
| Deployment `deploy-20260919` mit 7-stufiger Pipeline | deployment-detail | `DeploymentSpec` (§1-C) + pipeline-steps |
| 4 Interfaces (terminal/PTY, DSH-Session, VS Code, Web) | app-detail-interfaces | `InterfaceSpec[]` nach PLUGINS-Spec §8.1 |
| 4 IaC-Files (docker-compose.yml, Dockerfile, main.tf, deploy.yml) + 3 geparste Services | iac-files-tab | `iac-file`-Component + Discovery-Result |
| 18 Firewall-Regeln (4 In/14 Out) mit Prio/CIDR/Verdict/Scope/Packets | firewall-rules | `FirewallRule` (store.tsx:22–30) + traffic-Feld |
| 457 SIEM-Events, 6 detailliert | siem-events-timeline | `SIEMEvent` (store.tsx:32–40) |
| 5 Secrets-Engines, 48 Keys, OPA-Evaluations-Stream | secrets-vault | `SecretsEngineRow` + `VaultSecretRow` + Audit |
| 5 Integrations (Shell, VS Code, VNC Desktop, DSH Agent, Web Interface) + 4 Active Deployments | integrations-and-plugins | `IntegrationSpec` + `IntegrationInstallation` (§1-D) |
| Browser/VNC-Runtimes (KasmWeb Chrome v1.15.0-edge, kasmweb/desktop) | browser-integration-selection | Runtime-Katalog |
| 4 Teams mit Bindings/Members/Budget | teams-resource-bindings | `TeamRow` + Resource-Bindings |
| 24 Keycloak-User (22 aktiv, 2 locked) + Create-User-Dialog | user-management | `KeycloakUser` |
| Agent-Session `sess-a8f2c` (14 Messages, 9 Tool-Calls) | agent-session-detail | `SessionListRow` + Transcript + ToolCalls |
| 7 Subagents (2 pending approval) | subagent-approval-queue | `SubagentRow` (SubagentsPanel.tsx:32–50) |
| 4 VLANs + 1 WireGuard-Overlay mit IPAM | network-management-vlans | `VLANNetwork` (networking.ts:21–32) |
| Node-Health (CPU 23%, RAM 6.2/16GB, NVMe 145/500GB, Load 0.84/0.91/0.76, Uptime 14d6h) | ssh-target-detail | `NodesHealth`-Shape aus `NodeHealthStrip.tsx` |
| Onboarding-Pipeline (4 Steps, SSH-Handshake-Log) | onboarding-refined | Wizard-State |
| Admin-API-Keys (4 live, `sk-…••••39fa`) | admin-settings-api-keys | Keys-Registry-Shape der KeysPage |

---

## 3. Routen-Mapping (Stitch-Screen → JiMesh-Route)

Legende: **neu** = Route existiert nicht (`App.tsx:485–618`), **umbau** = Route + View existieren, Screen wird auf das Design gehoben.

| # | Stitch-Datei | JiMesh-Route | View | Status | Prio |
|---|---|---|---|---|---|
| 1 | `jimesh-dashboard-overview.html` | **`/overview`** | `views/OverviewPage.tsx` | **neu** — Kardinal-Redirect `/ → /overview` planen (`App.tsx:486` navigiert heute nach `/config`); Overview-Gruppe in `section-nav.ts` ergänzen | **P1** |
| 2 | `jimesh-infrastructure-sidebar-refined-app-ssh-icons.html` (+ Basis-Variante) | Shell-Komponente, keine Route | `components/sidebar/HierarchySidebar.tsx` **umbau** | existiert als 3-Ebenen-Baum; wird auf refined-Design gehoben (Status-Badges, App-Icon-Action-Buttons, SSH-Quick-Connect, Identity-Footer) | **P1** |
| 3 | `jimesh-ssh-target-detail-root-187-124-2-174.html` | `/workspaces/target/:targetId` | `views/SSHTargetDetailPage.tsx` | **neu** (Target-Klick geht heute auf `/workspaces`, `HierarchySidebar.tsx:78`) | **P2** |
| 4 | `jimesh-workspace-detail-prod-workspace.html` | `/workspaces/ws/:workspaceId` | `views/WorkspaceDetailPage.tsx` | **neu** (`WorkspacesPage` bleibt Liste) | **P2** |
| 5 | `jimesh-app-detail-dsh-agent-7f2e-interfaces.html` | `/workspaces/apps/:appId` | `views/AppDetailPage.tsx` | **neu** (`WorkspaceAppsPage` bleibt Liste) | **P2** |
| 6 | `jimesh-container-logs-tab.html` | `/workspaces/apps/:appId/logs` (Tab von #5) | `views/AppDetailPage.tsx` (Tab) | **neu** — `TerminalTape` geteilt mit #8 | **P3** |
| 7 | `jimesh-project-overview-iac-files-tab.html` | `/workspaces/projects/:projectId` (+ Tab `/iac-files`) | `views/ProjectDetailPage.tsx` | **neu** — 5 Tabs des Designs: Overview · Deployments(18) · IaC Files(4) · Secrets(9) · Integrations; File-Ebene unterhalb des Projects (IAC-Spec §1.2) | **P3** |
| 8 | `jimesh-deployment-detail-deploy-20260919.html` | `/workspaces/deployments/:deploymentId` | `views/DeploymentDetailPage.tsx` | **neu** (`/workspaces/deployments`-Liste existiert, `App.tsx:605`) | **P3** |
| 9 | `jimesh-integrations-and-plugins.html` | `/workspaces/integrations` | `views/IntegrationsPage.tsx` | **neu** — heute lebt der Plugin-Teil in `WorkspaceSettingsPage.tsx:222` (`PluginActivationCard`); Seite wird eigenständig: Katalog + Active Deployments + Quick-Deploy-Footer | **P3** |
| 10 | `jimesh-browser-integration-selection-refined.html` (+ Basis) | Modal auf #9 (+ Zugriff aus App-Detail) | `components/integrations/BrowserRuntimeModal.tsx` | **neu** | **P3** |
| 11 | `jimesh-scope-selector-component-refined.html` (+ Basis) | Globales Modal (Header-Chip, alle Mesh-Screens) | `components/layout/scope-selector.tsx` **umbau** zum Baum-Modal | Umbau — Komponente existiert mit Tests (`scope-selector.tsx` + 2 Testdateien); Design erweitert auf Target→Workspace→Project-Baum mit Checkboxes, Hidden-Entities, Active-Selection-Chips | **P1** |
| 12 | `jimesh-cluster-onboarding-initialization-refined.html` (+ Basis) | `/onboarding` | `views/OnboardingPage.tsx` **umbau** zum 4-Step-Wizard | Umbau — Route existiert (`App.tsx:614`) | **P4** |
| 13 | `jimesh-firewall-rules.html` | `/security/firewall-rules` | `views/FirewallRulesPage.tsx` **umbau** | Umbau — Route existiert (`App.tsx:555`), Testdatei existiert (`FirewallRulesPage.test.tsx`) | **P2** |
| 14 | `jimesh-siem-events-timeline.html` | `/security/siem` | `views/SIEMEventsPage.tsx` **umbau** | Umbau — Route existiert (`App.tsx:564`) | **P2** |
| 15 | `jimesh-security-findings-refined.html` (+ Basis) | `/security/events` | `views/SecurityEventsPage.tsx` **umbau** | Umbau — Route existiert (`App.tsx:565`); `UnifiedFinding`-Shape in `lib/security-events.ts:10–22` | **P2** |
| 16 | `jimesh-secrets-vault.html` | `/vault-dashboard` | `views/VaultDashboardPage.tsx` **umbau** | Umbau — Route existiert (`App.tsx:604`); Design = Engines-Registry + Secret-Tabelle + OPA-Eval-Stream (passt zu `VaultDashboardPage.tsx:111–115`) | **P3** |
| 17 | `jimesh-agent-session-detail-sess-a8f2c.html` | `/workspaces/sessions/:sessionId` | `views/AgentSessionPage.tsx` | **neu** — 3-Spalten-Layout (Transcript · Tool-Calls · Context); `GET /api/sessions` existiert (`gateway.go:206`) | **P3** |
| 18 | `jimesh-subagent-approval-queue.html` | `/workspaces/subagents` | `views/SubagentQueuePage.tsx` | **neu** — `SubagentsPanel.tsx` (Komponente + Tests existieren) wird zur Page: Approval-Queue oben, Execution-Pool unten | **P3** |
| 19 | `jimesh-network-management-vlans-overlay.html` | `/workspaces/networks` | `views/NetworkEditingPage.tsx` **umbau** | Umbau — Route existiert (`App.tsx:612`), Topologie existiert (`components/networks/mesh-topology.tsx`, `@xyflow/react`) | **P4** |
| 20 | `jimesh-teams-resource-bindings.html` | `/admin/teams` | `views/TeamsPage.tsx` **umbau** | Umbau — Route existiert (`App.tsx:573`) | **P4** |
| 21 | `jimesh-user-management.html` | `/admin/users` | `views/AdminUsersPage.tsx` **umbau** | Umbau — Route existiert (`App.tsx:572`), Create-User-Dialog im Design | **P4** |
| 22 | `jimesh-admin-settings-api-keys.html` | `/admin/settings` (Sub-Navigation General · API Keys · Vault · Security · Integrations · System) | `views/AdminSettingsPage.tsx` | **neu** (Admin-Layout hat heute users/teams/consumer-keys/budgets/capabilities, `App.tsx:570–580`); „API Keys" ist der aktive Tab des Designs — bestehende Keys-Logik aus `components/keys/*` importieren, **kein Duplikat** | **P4** |
| 23 | `jimesh-dashboard-builder.html` | `/overview/dashboards/:dashboardId` | `views/DashboardBuilderPage.tsx` | **neu** — Phase 2 des Overview-Specs §7 (`dashboard`-Typ, §2 Zeile 23); Widget-Library-Sidebar + 12-Spalten-Grid (`react-grid-layout` + `@dnd-kit` sind bereits Dependencies) | **P4** |
| 24 | `jimesh-design-assets-folder.html` | **keine Route** | — | **Nicht-Ziel**: Stitch-Tool-Mockup (Design-Asset-Browser), kein JiMesh-Produkt-Screen; dient nur als Referenz für Session-Historie-Muster | — |

**Kein „App Discovery"-Screen im Bestand** (§0): die Service-Entdeckung des IaC-Screens (#7, „Discovered Services (3)" aus docker-compose.yml) übernimmt die Discovery-Rolle in der Mesh-Welt; die bestehende `/dbs/discovery`-Fläche bleibt unberührt.

---

## 4. Komponenten-Dekomposition

### 4.1 Gemeinsame Primitives — `components/mesh/`

| Komponente | Datei | Props (Skizze) | Beleg-Screens |
|---|---|---|---|
| `MeshPageShell` | `mesh/MeshPageShell.tsx` | `breadcrumb: Crumb[]`, `scope?: ScopeRef`, `tabs?: TabDef[]`, `actions?: ReactNode`, `footer?: FooterStat[]` | alle Detail-Screens |
| `MeshBadge` | `mesh/MeshBadge.tsx` | `kind: OverviewBadgeKind`, `value`, `tone` — **bindet an `OverviewBadge` (COMPONENT-SCHEMA §1)**; `TONE_CLASS`-Muster aus `OverviewGrid.tsx` | alle |
| `StatusDot` | `mesh/StatusDot.tsx` | `status: string` (verbatim!) → Farbe, `pulse?: boolean` | sidebar, app-detail, workspace-detail |
| `MetricTile` | `mesh/MetricTile.tsx` | `icon`, `label`, `value`, `unit`, `sub?`, `tone?` (CPU 23%/32 Cores, RAM 6.2/16GB, Latency 12ms) | ssh-target, workspace, app, overview |
| `SectionCard` | `mesh/SectionCard.tsx` | `icon`, `title`, `count?: CountChipProps`, `actions?`, `children` | overview, target, workspace |
| `TabStrip` | `mesh/TabStrip.tsx` | `tabs: {id,label,count?,icon?}[]`, `active`, `onChange` — auf `ui/tabs.tsx` (§5) | app-detail, project, admin-settings |
| `TerminalTape` | `mesh/TerminalTape.tsx` | `lines: LogLine[]`, `severityCounts`, `search`, `wrap`, `autoScroll`, `streamUrl` | container-logs, deployment-detail, onboarding |
| `KeyValueList` | `mesh/KeyValueList.tsx` | `items: {label, value, mono?}[]` (Target Specification: Kernel, Public Address, WireGuard Overlay, Memory, NVMe) | ssh-target, workspace, app |
| `BarMeter` | `mesh/BarMeter.tsx` | `value`, `max`, `tone`, `segments?` (CPU-Bars, IPAM 82% Free, Budget 24.8%) | overview, target, workspace, teams |
| `ChipGroup` | `mesh/ChipGroup.tsx` | `chips: MeshBadgeProps[]` (`Envoy Sidecar · Port 6379:tcp`) | overview, integrations |
| `AvatarCluster` | `mesh/AvatarCluster.tsx` | `members: {initials, active?}[]`, `max` (AV DL RK +3) | teams, user-management |
| `PipelineSteps` | `mesh/PipelineSteps.tsx` | `steps: {id,label,detail,duration?,state}[]` (Source-Checkout → eBPF-Health) | deployment-detail, onboarding |
| `MeshFooterBar` | `mesh/MeshFooterBar.tsx` | `stats: {icon,label,value}[]` (Cluster Sync · Latency · Version) | fast alle |
| `CountChip` | `mesh/CountChip.tsx` | `n: number`, `tone` (Badge `count` mit echtem N, COMPONENT-SCHEMA §1) | alle |
| `MeshMockBadge` | `mesh/MeshMockBadge.tsx` | `sourceFile: string` — Ehrlichkeits-Chip (Mandate 2) | alle Mock-Screens |
| `EmptyMockState` | `mesh/EmptyMockState.tsx` | `labelKey`, `action?` — ehrliche Leerzustände statt erfundener Karten (Präzedenz `components/empty-state.tsx`) | alle |

**Sidebar-Zerlegung** (Design #2 → `HierarchySidebar.tsx` Umbau; Tree-Derivation `useMemo` bleibt):

- `HierarchySidebar` (Shell: sticky, w-64, Gruppen) — existiert
- `TargetNode` (Server-Icon, `user@host` mono, Ping-Badge, Hover-Settings-Button — Pattern existiert `HierarchySidebar.tsx:243–252`)
- `WorkspaceNode` (neu: Tier zwischen Target und Project, `Active/Healthy`-Badge, Footprint)
- `ProjectNode` (live-Badge, Chevron, Count-Chip) — existiert rudimentär (`renderProjects`)
- `AppRow` (App-Icon via `getAppIcon`, Name, `:{port}` mono — existiert `HierarchySidebar.tsx:186–199`)
- `AppActionDots` (neu: Icon-Buttons Terminal/Code/Web je App im refined-Design)
- `SSHQuickConnectButton` (`⌘K`-Chip; Palette-Bridge `command-palette-state.ts`)
- `SidebarIdentityFooter` (Avatar-Initialen, Operator-Name, `ed25519-valid`-Key-Badge, Logout)

### 4.2 Screen-Zerlegung (Kern-Screens)

**A) `/overview` (#1)** — Aggregations-Landing (Overview-Spec §3.4):
- `OverviewHealthStrip` (5 MetricTiles: CPU/MEM/DISK/LOAD/MESH-Overlay + Live-Dot) — `NodeHealthStrip`-Muster + Mesh-Felder
- `DeployedProjectsCard` (`Table`: Project/Status/Replicas/Latency/Commit/Actions[Logs·Inspect·Restart]) — `GET /api/deployments` + `GET /api/projects`
- `RunningAppsCard` (Liste: Icon, Name, Sidecar-Chips, Port, Uptime) — `GET /api/deployments`
- `SecuritySummaryCard` (Firewall 18 Regeln · SIEM 24H · Findings mit Severity-Chips) — `GET /api/firewall/rules`, `GET /api/sdk/logs?type=audit`, `lib/security-overview.ts`
- `NetworksSummaryCard` (WireGuard Overlay, VLAN-Zeilen: Subnet/Peers/Latency) — VLAN-Registry
- `SecretsSummaryCard` (Vault-Status, Key-Zeilen maskiert `••••` + Block-Chips) — `GET /api/secrets-engines`, `GET /api/vault/secrets`
- `IaCSummaryCard` (Git-Rev-Header, Manifest-Zeilen mit Check-Badges, tf-plan-Buttons)
- Rendern **nicht** via `OverviewGrid.tsx` in P1: die Karten sind `SectionCard`-Stapel im `grid-cols-12`; `react-grid-layout`-Persistenz ist Phase 2 (#23, Overview-Spec §7.3).

**B) `/workspaces/target/:targetId` (#3)**:
- `TargetHeaderCard` (h1 `user@host`, IP-Chip, Connected-Dot, OS/Kernel-Zeile, Actions: Provision · SSH Shell · Settings · Disconnect)
- `TargetMetricRow` (5 MetricTiles) — `NodeHealthStrip` erweitert auf **Target-**Health
- `WorkspaceOnTargetCard` (`WorkspaceNodeCard` × N: Name, Status-Badge, Projects-Zeile, Cores/Mem, Footprint, Inspect)
- `ContainersOnTargetCard` (`ContainerRow`: Icon, Name, Sandbox-Chip `gVisor runsc`, Ports, Pod, Actions Logs/Restart)
- `TargetNetworksCard` (`VlanRow`: Subnet-Chip, MTU, Egress, Latency, Peers)
- `TargetFirewallCard` (`Table`: Rule/Proto, Port/Target, Verdict, Packets)
- `TargetSiemStrip` (severity-getönte Event-Zeilen CRIT/WARN/INFO)
- `TargetSpecCard` (`KeyValueList`)

**C) `/workspaces/apps/:appId` (#5)**:
- `AppHeaderCard` (h1, Typ-Badge `agent`, Framework-Chip, sha256-Fingerprint, Running-Dot, Pod/Image/Uptime/CPU/Mem-Zeile, Actions: Install Integration (Dropdown) · Restart · Delete)
- `AppTabStrip` (Overview · Interfaces(4) · Logs(2.4k) · Audit · Settings)
- `InterfacesPanel` → `InterfaceCard` × N: Icon, Titel (`Terminal`), Kind-Chip (`PTY`/`eBPF`/`IDE`/`HTTP/2`), Status (`CONNECTED`/`AVAILABLE`), Beschreibung, Endpoint-Zeile (Socket/Mesh-Route/Bind-Host/Ingress), Sekundär-Aktion, Primär-Button (`OPEN`/`CONNECT`) — `InterfaceSpec` nach PLUGINS-Spec §8.1
- `FilterChips` (All(4)/Connected(2)/Available(2) + Search)
- `TelemetryStripCard` (Active Sockets · Tunnel-Latency p99 · Sandboxing · Flush-Button)

**D) Modal-Screens (#10, #11)**:
- `ScopeSelectorModal`: Baum mit Checkbox pro Ebene, Select-all/Clear-all, Filter-Input, Hidden-Entities-Zeile (`visibility_off 3`), Active-Selection-Chips mit `close`, „Scope applies across N tabs"-Warn-Chip, Cancel/Apply — Umbau der bestehenden `components/layout/scope-selector.tsx`, Testbasis behalten
- `BrowserRuntimeModal`: 2 Runtime-Cards (Full Browser `kasmweb/chrome:1.15.0` / Full Desktop `kasmweb/desktop:1.15.0` mit Image/Resources/Stream-Protocol/Port-Zeilen), RECOMMENDED-Flag, Deploy-Buttons, Addons-Panel (Playwright, Session-TTL, Persistence), Isolation-Guarantee-Strip

**E) Tabellenlastige Ops-Screens (#13, #14, #16, #18, #20, #21)** — gemeinsames Raster: `MeshPageShell + Stats-Header + Filter/Tab-Zeile + Table + Sidebar-Karte + Footer`:
- Firewall: `RuleTable` (Prio, Direction-Icon, Proto:Port, CIDR→CIDR, Verdict-Chip, Scope, Traffic, Actions) + `FirewallProviderSidebar` (Nftables LIVE / OPNsense INTERFACE-READY / Cloud PLANNED / BYOF PLANNED) + Kernel-Stats
- SIEM: `SeverityHistogram` (Critical 3 … Info 340) + `ThreatTimelineChart` (recharts) + `SiemEventTable` mit expandierbarem `DiagnosticDump` (`Accordion`)
- Secrets: `EnginesRail` (5 Engines mit Scope-Badge) + `SecretsTable` (Key, Vault-Path, Last-Accessed, Calls, OPA-Status, Actions) + `OpaEvalStream` + `CryptoEnvelopeCard`
- Subagents: `ApprovalQueueCard` (`REQUIRES IMMEDIATE HUMAN APPROVAL`, Intercepted-Tool-Call-Karten mit Payload/Diff, DENY/APPROVE) + `SubagentPoolTable` (Running/Completed/Error mit `BarMeter`-Progress)
- Teams: `TeamListRail` (4 Teams: AvatarCluster + Bindings-Count) + `TeamBindingsTable` (Resource-Type, Target/ARN, Access-Level, Inheritance, OPA-Ref, Actions) + `AccessPreviewPanel` (Capability-Tree, OPA Dry-Run-Console)
- Users: `UsersTable` (Initialen, Name+handle, Email, Role-Chip, Keycloak-Sub mit Copy, Status, Last-Login, Actions) + `UserStatsRow` (Total/Active/Locked/MFA) + `CreateUserDialog`

**F) Projekt-Fläche (#7)**: `ProjectHeaderBar` (Name, active-Badge, Cluster/Env/Git-Rev/Uptime, Trigger-Deploy/Sync-Git) + `ProjectTabStrip` (Overview · Deployments · IaC Files · Secrets · Integrations) + `IaCFileList` (`IaCFileRow`: Typ-Icon, git-tracked, Größe, Services, Edited-by) + `IaCInspector` (Pfad, SHA, Copy/Edit/Dry-Run, `DiscoveredServices`-Tabelle, Code-Viewer als `pre code` mit Zeilennummern — **ohne** neue Syntax-Highlight-Dep)

**G) Onboarding (#12)**: `WizardSteps` (4 Steps + Progress) + `ProvisionForm` (Host/IPv4/Port/User/Auth-Mode, gVisor-Checkbox) + `HandshakeLogTape` (`TerminalTape` LIVE) + `FirewallProviderCards` (gleiche Komponente wie Firewall-Sidebar!) + `ReadinessChecklist`

---

## 5. shadcn/UI-Mapping

Vorhandene Primitives (`components/ui/`): `badge, button, card, dialog, dropdown-menu, field-error, input, label, popover, segmented-control, select, separator, skeleton, switch, table, textarea` + Custom `tooltip.tsx`, `confirm-button.tsx`, `empty-state.tsx`.

| Stitch-Element | shadcn-Primitive | Anmerkung |
|---|---|---|
| Status-/Verdict-/Count-Chips | `Badge` + `MeshBadge`-Wrapper | `TONE_CLASS`-Farbmuster |
| Karten-Sektionen | `Card` / `SectionCard` | |
| Tab-Strips mit Count-Badges (App-Detail, Project, Admin-Settings) | **`Tabs` fehlt** → `ui/tabs.tsx` neu (auf `@base-ui/react`, Dep existiert) | `TabStrip` baut darauf |
| Breadcrumbs | **`Breadcrumb` fehlt** → `ui/breadcrumb.tsx` neu | alle Mesh-Screens |
| Tabellen (Firewall, Users, Secrets, Projects-Overview) | `Table` (existiert) + `Skeleton` | |
| Primär-/Geist-/Destructive-Buttons (`+ Add Rule`, `Deploy Service`) | `Button` (`buttonVariants`-Muster, `App.tsx:313`) | |
| Kontext-Aktionen (⋯, Restart-Dropdown, Bulk-Actions) | `DropdownMenu` (existiert) | |
| Scope-Selector, Browser-Runtime, Create-User | `Dialog` + `Popover` (existieren) | |
| Formulare (Onboarding-Provision, Create-User, Quick-Deploy) | `Input`/`Label`/`Select`/`Textarea`/`Switch` | Checkbox: nativer `input`+`label`-Muster |
| Firewall-Switches, Vault-Quorum, `activated`-Flags | `Switch` | |
| Suchfelder (`Search tokens, hash, scopes… (Press /)`) | `Input` + Tastatur-Hint; Palette `command-palette.tsx` existiert | |
| Filter-Segmente (All/Inbound/Outbound, Severity, Connected/Available) | `segmented-control.tsx` (existiert!) | |
| Footer-Trenner | `Separator` | |
| Ladezustände | `Skeleton` | kein Spin-Only |
| Tooltip auf Icon-Buttons | `components/tooltip.tsx` (Custom, existiert) | |

**Neu zu bauen (`components/ui/`, shadcn-Stil):** `tabs.tsx`, `breadcrumb.tsx`, `progress.tsx` (BarMeter-Basis), `accordion.tsx` (Diagnostic-Dump, Capability-Tree), `sheet.tsx` (Provider-Sidebar mobil). `command.tsx` **nicht** bauen — Palette läuft Custom und bleibt.

---

## 6. Was JULES baut — Priorisierung & Dependencies

**P0 — Fundament (macht alles andere erst möglich)**
1. `lib/mesh-icons.ts` (§1.3)
2. `ui/tabs.tsx`, `ui/breadcrumb.tsx`, `ui/progress.tsx`, `ui/accordion.tsx` (§5)
3. `components/mesh/` Kern-Primitives: `MeshBadge, StatusDot, MetricTile, SectionCard, CountChip, KeyValueList, BarMeter, ChipGroup, MeshPageShell, MeshFooterBar, MeshMockBadge, EmptyMockState` (+ Vitest-Render-Smoke nach Repo-Präzedenz `*.render.test.tsx`)
4. `mocks/`-Layer (§2.2) + Fixtures für Hierarchy/Deployments/Node-Health — **Dependency für alles**
5. Dark-Mode-Abdeckung der Primitives (Designs sind dark-first; shadcn `dark:`-Varianten)

**P1 — Navigation & Landing (Rückgrat)**
6. `HierarchySidebar`-Umbau (§4.1) — Dep: P0 + SSOT-Store (existiert)
7. `ScopeSelectorModal`-Umbau (§4.2-D) — Dep: P0 (Baum = Sidebar-Daten)
8. `/overview` + `OverviewPage` (§4.2-A) — Dep: P0/P1; Redirect `/ → /overview` + `section-nav`-Anpassung im selben Change
9. Command-Palette: neue Routen registrieren (Muster `command-palette.tsx` `pages`-Gruppe)

**P2 — Detail-Tier + Security-Tabellen**
10. `SSHTargetDetailPage` — Dep: P0, P1-Sidebar
11. `WorkspaceDetailPage` — Dep: 10
12. `AppDetailPage` mit Interfaces-Tab — Dep: 10/11 (Breadcrumb-Kette)
13. Firewall-/SIEM-/Findings-Umbauten (#13–15) — Dep: P0 (existierende Routen, geringe Kreuzabhängigkeit; `FirewallProviderCards` teilt Komponente mit Onboarding)

**P3 — Operations**
14. `TerminalTape` + App-Logs-Tab (#6) — Dep: 12
15. `DeploymentDetailPage` + `PipelineSteps` (#8) — Dep: 14
16. `ProjectDetailPage` mit IaC-Tab (#7) — Dep: 11/12
17. `IntegrationsPage` + `BrowserRuntimeModal` (#9/#10) — Dep: P0; TASK-103-Rename-Disziplin (UI „Integrations") beachten
18. `AgentSessionPage` + `SubagentQueuePage` (#17/#18) — Dep: P0; `SubagentsPanel`-Feldtypen wiederverwenden
19. `VaultDashboardPage`-Umbau (#16) — Dep: P0

**P4 — Governance & Phase 2**
20. Onboarding-Wizard (#12) — Dep: P3 (Firewall-Provider-Cards wiederverwendet)
21. Admin-Fläche (#20 Teams, #21 Users, #22 Admin-Settings/API-Keys) — Dep: P0
22. `NetworkEditingPage`-Umbau (#19) — Dep: P0 (`mesh-topology.tsx`/`@xyflow` bleibt)
23. `DashboardBuilderPage` (#23) — **Dep: P1-Overview + Phase-2-Persistenz** (Overview-Spec §7.3); `react-grid-layout` + `@dnd-kit` vorhanden

**Kette:** P0 → Sidebar/Palette → Overview → TargetDetail → WorkspaceDetail → AppDetail → Logs/Deploy/IaC → Integrations → Admin/Onboarding → DashboardBuilder.

---

## 7. Was das Backend liefern muss (API-Verträge je Mock-Screen)

Legende: ✅ existiert · 🟡 existiert, Ausbau nötig · ❌ Lücke (Screen läuft im Mock trotzdem — gegen Fixture, §2). Grundlage `API_DOCS.md`-Disziplin + Lücken-Liste `COMPONENT-SCHEMA.md` §9 (grep-belegt).

| Screen | Endpoint | Status | Kommentar |
|---|---|---|---|
| Sidebar, Scope-Selector, Overview | `GET /api/settings/ssh_endpoints`, `GET /api/workspaces`, `GET /api/projects`, `GET /api/deployments` | ✅ | SSOT-Feeds `lib/store.tsx:61–87` |
| Overview-Health-Strip | `GET /api/nodes/health` | ✅ | `NodeHealthStrip.tsx` konsumiert es bereits — pro-Target-Ausbau: `GET /api/targets/:id/health` ❌ |
| Overview-Adapter-Karten | `GET /api/overview` (Adapter-Aggregat, Overview-Spec §3.4) | ❌ | P1-Variante: Karten aus SSOT-Feeds im Frontend zusammenbauen — dann kein neuer Endpoint |
| Target-Detail | Endpoints-Row, `GET /api/discovery` (Container), `GET /api/firewall/rules`, `GET /api/sdk/logs?type=audit`, Workspaces per `sshTargetId` | ✅/🟡 | Filter `?targetId=` ist Ausbau |
| Workspace-Detail | Containers (`container_id`-Join), `GET /api/vault/secrets`, `GET /api/budgets`, `GET /api/sessions` | ✅ | Joins teils Frontend-seitig (Felder `workspaces.go:53–64`) |
| App-Detail (Interfaces) | `GET /api/deployments`; `InterfaceSpec`-Ableitung nach PLUGINS-Spec §8.1 | ❌ | §9-1: keine `interfaces`-Spalte; P2/P3: Frontend-Ableitung aus `port/vncPort/codeServerPort/framework` + Backend-Nachzug |
| App-Logs | `GET /api/apps/:id/logs` (SSE/chunked `LogLine{ts,level,source,text}`) | ❌ | Redis-Stream-Infra (`jimesh:events`) vorhanden |
| Deployment-Detail | `GET /api/projects/{id}/deployments` + `GET /api/deployments` | ✅ | `deploy.go:71–98`; Pipeline-Steps + Build-Log-Stream ❌ (§9-2) |
| IaC-Files | `GET /api/projects/{id}/iac-files`, `.../{fileId}`, Service-Discovery | ❌ | §9-3 (grep `iac_files` → 0 Treffer); Soll-Vertrag IAC-Spec §3.6/§4.2 |
| Integrations | `GET /api/plugins`, `GET/POST /api/plugin-installations` | ✅/❌ | §9-5: POST spiegelt nur zurück, persistiert nicht — Install-Button bleibt ehrlich „Mock" bis Store existiert |
| Browser-Runtimes | Runtime-Katalog (Kasm-Images) | ❌ | v1 Static-Katalog im Fixture |
| Firewall | `GET /api/firewall/rules`, CRUD, „Apply to Kernel (Atomic)" | ✅/🟡 | Atomic-Apply-Gegenstück fehlt; `FirewallRulesPage.test.tsx` schützt Regressionen |
| SIEM | `GET /api/sdk/logs?type=audit` | ✅ | `store.tsx:95–99`; Histogramm/Timeline aggregiert Frontend-seitig |
| Secrets/Vault | `GET /api/secrets-engines`, `GET/POST /api/vault/secrets`, Audit-Log | ✅/🟡 | OPA-Sichtfilterung fehlt (§9-7) — `OPA`-Chip erst, wenn Endpoint `visibleTo` liefert |
| Teams | `GET /api/teams` | ✅ | Resource-Bindings-Vertrag ❌ (Bauplan IA-Spec §2.6) |
| Users | `GET /api/users` (`KeycloakUser`) | ✅ | Sync/Create-Vertrag 🟡 (Admin-Mutationen über OPA-Admin-Gate) |
| Admin-API-Keys | bestehende Keys-Endpoints der `KeysPage` | ✅ | kein neuer Vertrag; Fläche wird nur unter Admin-Settings angeordnet |
| Sessions | `GET /api/sessions` | ✅ | `gateway.go:206` (`SessionListRow`) |
| Subagents | SubagentsPanel-Endpoints | ✅ | `subagents.go:78/99`; Approval-Queue-Vertrag (intercepted calls, approve/deny) ❌ |
| Networks/VLAN | `GET /api/networks` (Mesh, TASK-078) | ✅ | VLAN-IPAM-Vertrag 🟡 (`networking.ts`-Shape) |
| Dashboard-Builder | `GET/PUT /api/dashboards` (`DashboardDefinition`) | ❌ | Phase 2 (Overview-Spec §7.3) — davor lokal persistiert |

**Regel:** Ein Mock-Screen darf nie einen anderen Vertrag behaupten als §7 notiert — der Interceptor (§2.2) implementiert exakt diese Shapes (typed an §2.1), damit der Backend-Nachzug ohne UI-Umbau andockt.

---

## 8. Animationen — schlicht bevorzugen (CSS first)

**Grundsatz:** **keine framer-motion-Dependency** (nicht installiert; Bundle-Budget). Alles Nötige ist da: `tw-animate-css` (`animate-in fade-in slide-in-from-* zoom-in` — shadcn-Dialog/Popover nutzen es bereits), native `transition-*`, `@dnd-kit` für Drag, `recharts` für Charts.

| Muster | Umsetzung | Technologie |
|---|---|---|
| Hover-Aufhellung (`hover:bg-accent`, Border-Tint) | `transition-colors duration-150` | CSS |
| Sidebar-Baum Ein/Ausklappen | `grid-rows-[0fr]→[1fr]` + `transition-[grid-template-rows] duration-200` | CSS |
| Tab-Wechsel (`TabStrip`) | Content `animate-in fade-in duration-150`; Indikator statisch | CSS |
| Dialoge/Popovers (Scope-Selector, Browser-Runtime, Create-User) | shadcn-Defaults via `tw-animate-css` (schon aktiv) | CSS |
| Log-Stream (`TerminalTape`) | **kein** Per-Line-Anim; Batching via `requestAnimationFrame`, Auto-Scroll `scrollTo({behavior:'smooth'})` | JS-light |
| Pipeline-Steps (Deployment, Onboarding) | gestaffelt `animate-in slide-in-from-left-2 fade-in` mit CSS `animation-delay`; `running`-Icon ein `animate-pulse` | CSS |
| Status-Dots | `animate-pulse` nur für **echt lebende** Zustände (Streaming/Connecting) — statische „Running"-Dots pulsen nicht (Ehrlichkeit) | CSS |
| Card-Reorder (Dashboard-Builder, später DnD-Reassignment §6.3 Schema) | `@dnd-kit`-Transitionen (Dep existiert) | JS |
| Grid-Resize (Overview-Phase 2 / Builder) | `react-grid-layout`-eigenes Drag/Resize, ohne Zusatz-Anim | JS |
| Count-up/Progress-Ring-Morphing | **nicht** bauen — statische `tabular-nums`-Werte; Mock-Ästhetik ersetzt keine Telemetrie | — |
| Screen-Einstieg | eine dezente `animate-in fade-in slide-in-from-bottom-1 duration-200` auf `MeshPageShell`-Inhalt | CSS |

**Verboten:** Parallax, Framer-Motion-Spring-Choreografien, Stagger über 3 Items hinaus, animierte Fake-Zahlen. `prefers-reduced-motion` respektieren (`motion-reduce:` auf die drei UI-Übergänge).

---

## 9. i18n, Tests, Qualitäts-Gates

1. **i18n:** alle Strings über `t()` (`useI18n`-Präzedenz `HierarchySidebar.tsx`); Namespace `mesh.*`; `npm run check:i18n` bleibt Gate. Labels mit Zählern (`Applications · 4`) = `t('mesh.nav.applications')` + `CountChip`, nicht als zusammengesetzter String.
2. **Tests:** Render-Smoke je Screen (`views/*.render.test.tsx`-Muster wie `scope-selector.render.test.tsx`), Interceptor-Handler-Tests (Shape-Verträge gegen §7), Sidebar-Derivations-Tests (bestehende Baum-Logik). Gates: `npm run test` (vitest + check:i18n), `npm run lint` — jeweils in `src/frontend/`.
3. **Mock-Sichtbarkeit:** `VITE_MOCK=1` ist dev-only (`import.meta.env.DEV`-Guard); der Production-Build bindet den Interceptor **nicht** ein. Screens ohne echte Datenquelle fallen auf `EmptyMockState` statt zu lügen (Mandate 2).
4. **Dokumentations-Mandat:** Umsetzung beginnt mit Sprint-Eintrag (`docs/sprints/`) + Backlog-Spiegel (`docs/backlog/BACKLOG.md`); neue Routen nie „beiläufig" in die nächste Nav-Gruppe (`section-nav.ts`-Regel).
5. **Perf:** Log-Streams ab ~500 Zeilen virtualisieren (einfaches Windowing, keine neue Dep); kein Route-Level-Code-Splitting nötig, `React.lazy` optional.

---

## 10. Nicht-Ziele & offene Fragen

**Nicht-Ziele der Mock-Phase:** echte Deployments/Pipeline-Ausführung, eBPF/WireGuard-Funktionalität (Design-Copy!), Keycloak-Real-Sync, Docker-Hub-Abgleich (COMPONENT-SCHEMA §7 „Nicht-Ziel"), Dashboard-Persistenz-Backend, das `design-assets-folder`-Tool-Mockup (#24).

**Offene Fragen an den Operator:**
1. `/overview` als neuer Landing-Redirect (`/ → /overview` statt `/config`) — gewünscht? (P1-Änderung an `App.tsx:486` + `section-nav.ts`.)
2. Interfaces-Tab: P2/P3 rendert die Frontend-Ableitung nach PLUGINS-Spec §8.1 aus `port/vncPort/codeServerPort/framework`, oder warten auf Backend `DeploymentSpec.interfaces` (§9-1)? Empfehlung: Frontend-Ableitung sofort (Bausteine sind real), Badge `derived` ehrlich.
3. Admin-API-Keys (#22): neue `/admin/settings`-Sektion mit Unterseiten **oder** bestehende `/keys`-Fläche im Design restylen? Empfehlung: `/admin/settings` neu, Keys-Logik aus `components/keys/*` importiert (keine Duplikate).
4. Terminologie: Designs sagen „MeshCore Console", Bestand nutzt `JiMesh`. Empfehlung: JiMesh-Brand, „MeshCore"-Begriffe nur als Sektions-Flavor („Core Controller") — i18n-Key entscheidet.
