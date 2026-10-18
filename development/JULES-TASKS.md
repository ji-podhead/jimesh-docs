# JULES-TASKS — Frontend-Implementierung aus 56 Stitch-Designs

> **Für Jules:** Dieses File enthält alle Frontend-Pages die gebaut werden müssen.
> Jeder Task hat: Stitch-Design-Referenz, Backend-API, Component-Typen, Priorität.
> Arbeite die Batches in Reihenfolge ab. Baue ECHTE React-Komponenten (shadcn/ui + Tailwind).

## REPO-KONVENTIONEN (MUSS beachtet werden)
1. **Keine neuen npm-Packages** — nutze was da ist (shadcn/ui, Tailwind, @tanstack/react-query, react-router-dom)
2. **tsc --noEmit** muss 0 Fehler in deinen Dateien haben (Bestand hat 226 vorexistierende in fremden Dateien — ignorieren)
3. **i18n:** nutze `t('key', 'fallback')` — füge neue Keys in de.json + en.json hinzu, dann `node scripts/backfill-i18n.mjs` für alle 60 Locales
4. **Icons:** nutze `meshIcon()`, `appTypeIcon()`, `integrationIcon()`, `badgeKindIcon()` aus `lib/mesh-icons.ts`
5. **Badges:** nutze `MeshBadge` aus `components/mesh/MeshBadge.tsx`
6. **Types:** nutze `types/domain/overview.ts` (23 Component-Typen, ScopeRef, OverviewBadge, AppType, IntegrationSpec...)
7. **Store:** `useSSOTStore()` aus `lib/store.tsx` (targets, workspaces, projects, apps, siemEvents...)
8. **Scope:** `useGlobalScope()` + `useGlobalSelection()` aus `lib/global-scope.ts`
9. **UI-Primitives:** `components/ui/tabs.tsx`, `ui/progress.tsx`, `ui/breadcrumb.tsx` existieren bereits
10. **KEINE Mock-Daten** — echte API-Calls mit useQuery oder ehrliche Empty-States (Mandate 2)

---

## BATCH 1: DETAIL PAGES (Priorität HOCH)

### Task 1.1: SSH Target Detail Page
- **Route:** `/workspaces/target/:targetId`
- **Design:** `design-assets/stitch/jimesh-ssh-target-detail-root-187-124-2-174.html`
- **APIs:** `GET /api/nodes/health` (existiert), `useSSOTStore().workspaces`, `useSSOTStore().apps`
- **Aufbau:** Health-Strip (nutze NodeHealthStrip) + Grid: Workspaces auf diesem Node, Running Containers, Networks (VLAN), Firewall Status, Recent SIEM Events
- **Scope-Follow:** Klick auf Workspace → `setGlobalScope({kind:'workspace', workspaceId})`

### Task 1.2: Workspace Detail Page  
- **Route:** `/workspaces/ws/:workspaceId`
- **Design:** `design-assets/stitch/jimesh-workspace-detail-prod-workspace.html`
- **APIs:** `useSSOTStore().apps` (filter auf workspaceId), `GET /api/security/findings`
- **Tabs:** Containers | Secrets | Budget | Settings (nutze ui/tabs.tsx)
- **Aufbau:** Container-Tabelle (Name, Image, Status, Ports, Actions), Secrets-Panel mit Lock-Icons, Budget-Progress (nutze ui/progress.tsx)

### Task 1.3: Project Detail + IaC Tab
- **Route:** `/workspaces/projects/:projectId`
- **Design:** `design-assets/stitch/jimesh-project-overview-iac-files-tab.html`
- **APIs:** `GET /api/projects/{id}/deployments` (existiert), `GET /api/projects/{id}/iac-files` (FEHLT noch — Empty-State mit TODO)
- **Tabs:** Overview | Deployments | IaC Files | Secrets | Integrations
- **IaC-Tab:** File-Liste (Dockerfile, compose.yml, .tf) mit git-tracked Badges + Code-Preview-Panel

### Task 1.4: Deployment Detail Page
- **Route:** `/workspaces/deployments/:deploymentId`
- **Design:** `design-assets/stitch/jimesh-deployment-detail-deploy-20260919.html`
- **APIs:** `GET /api/projects/{id}/deployments` (existiert)
- **Aufbau:** Pipeline-Steps (Checkout → Compile → Static Analysis → Security Scan → Docker Build → Deploy → Health Check) mit Status-Icons + Live-Log-Terminal + Findings-Panel

---

## BATCH 2: SECURITY PAGES (Priorität HOCH)

### Task 2.1: OPNsense Config Page
- **Route:** `/security/firewall/opnsense`
- **Design:** `design-assets/stitch/jimesh-op-sense-firewall-config.html`
- **APIs:** `GET /api/firewall/providers` (FEHLT — Empty-State), `POST /api/firewall/providers/opnsense/config` (FEHLT)
- **Aufbau:** API-URL + Key + Secret Inputs, Verify Connection Button, Rule-Sync-Section mit Toggle + Sync-Button

### Task 2.2: Firewall Provider Setup
- **Route:** `/security/firewall/setup`
- **Design:** `design-assets/stitch/jimesh-firewall-provider-setup-wizard.html`
- **Aufbau:** 4 Provider-Cards (Nftables=LIVE, OPNsense=interface-ready, Cloud SG=planned, BYOF=planned) + Select-Button pro Card

### Task 2.3: Firewall Traffic Log
- **Route:** `/security/firewall/traffic`
- **Design:** `design-assets/stitch/jimesh-firewall-traffic-log.html`
- **APIs:** `GET /api/security/events?type=firewall` (prüfen was existiert)
- **Aufbau:** Stats-Strip (Blocked/Allowed/Unique Sources/Top Port) + Traffic-Tabelle (Timestamp, Direction, Source, Port, Protocol, Verdict, Provider)

### Task 2.4: Agent Config Scanner
- **Route:** `/security/agent-scan`
- **Design:** `design-assets/stitch/jimesh-agent-config-scanner.html`
- **APIs:** `POST /api/security/agent-scan` (FEHLT — Backend kommt in Sprint A)
- **Aufbau:** Upload-Drop-Zone (.mcp.json) + Check-Results (E001, E002, W008, W014, W021 mit PASS/WARN/FAIL Badges)

### Task 2.5: DLP Settings + Tool Call Inspector
- **Routes:** `/security/dlp`, `/security/dlp/inspector`
- **Designs:** `design-assets/stitch/jimesh-outbound-dlp-settings.html`, `design-assets/stitch/jimesh-tool-call-inspector.html`
- **APIs:** `GET /api/security/dlp-settings` (FEHLT), `GET /api/security/dlp-findings` (FEHLT)
- **DLP-Settings:** Master-Toggle (OFF default) + Rule-Liste (pass/redact/block) + Live-Inspector

---

## BATCH 3: PROXY/MESH PAGES (Priorität MITTEL)

### Task 3.1: LLM Chain Overview — GRAPH-FIRST
- **Route:** `/proxy` oder `/chains`
- **Design:** `design-assets/stitch/jimesh-chain-overview-graph-first.html`
- **WICHTIG:** Wir haben bereits `chain-mesh-graph.tsx` (1683 Z.!) mit @xyflow/react — NICHT neu erfinden!
- **APIs:** `GET /api/chains`, `GET /api/pools` (beide existieren)
- **Aufbau:** Chain-Cards mit Mini-Graph-Preview (React Flow in jeder Card), Klick öffnet Graph-Editor

### Task 3.2: Chain Graph Editor Modal
- **Route:** Modal auf /proxy
- **Design:** `design-assets/stitch/jimesh-chain-graph-editor-modal.html`
- **Aufbau:** Nutze chain-mesh-graph.tsx als Basis + Provider-Palette links (drag-to-canvas) + Properties rechts

### Task 3.3: Agent Chat mit Proxy Status
- **Route:** Erweitere bestehende Session-Detail oder eigene Route
- **Design:** `design-assets/stitch/jimesh-agent-chat-with-proxy-status.html`
- **APIs:** `GET /api/sessions`, `GET /api/subagents/{id}/tool-calls`
- **Aufbau:** Chat-Thread + Proxy-Status-Panel rechts (aktive Chain, Provider-Health, Latenz, Cost)

### Task 3.4: Trace Detail (Waterfall)
- **Route:** `/traces/:traceId`
- **Design:** `design-assets/stitch/jimesh-distributed-trace-detail-dsh-agent-session.html`
- **APIs:** `GET /api/traces/{id}` (FEHLT — R4 OTel kommt in Sprint A)
- **Aufbau:** Span-Waterfall (Parent-Child) + Attributes-Table + Export-Button

---

## BATCH 4: ADMIN + MISC (Priorität NIEDRIGER)

### Task 4.1: Plugin Catalog + Detail
- **Route:** `/plugins`
- **Design:** `design-assets/stitch/jimesh-plugin-catalog.html`
- **APIs:** `GET /api/plugins` (existiert — jules/linear/github_app)
- **Aufbau:** Grid mit Plugin-Cards (Icon, Name, Kategorie, Version, Status, Install-Button)

### Task 4.2: Plugin Install Wizard
- **Route:** Modal auf /plugins
- **Design:** `design-assets/stitch/jimesh-plugin-install-wizard.html`
- **3 Steps:** Scope wählen → Config (API-Key etc.) → Review + Install

### Task 4.3: Notification Center
- **Route:** `/notifications`
- **Design:** `design-assets/stitch/jimesh-notification-center.html`
- **Aufbau:** Filter-Chips + Notification-Liste (Type-Icons, Severity-Farben) + Webhook-Config

### Task 4.4: Global Search (Cmd+K)
- **Route:** Overlay-Component
- **Design:** `design-assets/stitch/jimesh-global-search-command-palette.html`
- **Aufbau:** Zentriertes Input + Filter-Chips + Gruppierte Ergebnisse (Targets, Workspaces, Projects, Apps) + Keyboard-Navigation

### Task 4.5: App Discovery
- **Route:** `/workspaces/discovery`
- **Design:** `design-assets/stitch/jimesh-app-discovery-with-networks.html`
- **APIs:** `GET /api/deployments` (discovered Container)
- **Aufbau:** Discovered-Container-Liste + Network-Topology-Panel + Claim-Button

---

## FERTIG ZU MELDEN
Nach jedem Task: `git add <files> && git commit -m "feat(frontend): Task X.X — <beschreibung>" && git push`

## VORLAGE FÜR DIE ERSTE AUFGABE
```
Lies docs/FRONTEND-MOCK-PLAN.md (Baureihenfolge),
src/frontend/src/types/domain/overview.ts (alle Typen),
src/frontend/src/lib/mesh-icons.ts (Icon-Mappings),
src/frontend/src/components/mesh/MeshBadge.tsx.

Baue Task 1.1: SSH Target Detail Page auf Route /workspaces/target/:targetId.
Design-Referenz: design-assets/stitch/jimesh-ssh-target-detail-root-187-124-2-174.html
Nutze NodeHealthStrip (bestehend), OverviewGrid (bestehend), ui/tabs.tsx.
APIs: GET /api/nodes/health + useSSOTStore().
tsc 0 Fehler in deiner Datei. Committe + pushe.
```
