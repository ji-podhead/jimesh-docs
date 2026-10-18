# COMPONENT-SCHEMA — Das eine Schema für alle JiMesh-Components

| | |
|---|---|
| **Status** | Kanonische Konsolidierung — **kein Code in dieser Änderung** |
| **Auftrag** | EIN Schema, das ALLE JiMesh-Components beschreibt: Parent/Child-Hierarchie, Scope-Vererbung, Secrets-Zuordnung, Integrationen, Deployments, Docker-Hub-Metadaten |
| **Quellen** | `docs/FE-OVERVIEW-SPEC.md` §3, `docs/FE-IA-SPEC.md` §1.1/§2.1/§2.2, `docs/FE-PLUGINS-CONCEPT.md` §3/§4, `docs/FE-IAC-DISCOVERY-SPEC.md` §4/§5/§8 + Operator-Input (Integration als Component, Auto-Project für manuelle Deployments, Secrets als scope-gebundene Component, AppTypes agent/ide/shell/frontend/backend/database/tool, Docker-Hub-Metadaten) |
| **Belegdisziplin** | Jede Behauptung über den Ist-Zustand trägt `datei:zeile`. Operator-Anforderungen ohne Ist-Deckung sind als **„Operator-Soll“** markiert und in §9 als Backend-Lücken verzeichnet — nichts wird als vorhanden behauptet, was nicht im Code liegt. |

---

## 0. Konsolidierungs-Entscheidungen (Wer erbt von wem)

Die vier Specs beschreiben vier Teile desselben Baums. Diese Konsolidierung macht daraus **ein** Schema:

1. **Fundament bleibt `FE-OVERVIEW-SPEC` §3.1**: `OverviewComponent`, `ScopeRef`, `OverviewBadge`, `OverviewLink`, `OverviewWidgetSpec` werden **wörtlich** übernommen (auch die Kommentare). Nichts am Fundament wird umgebaut — die Overview-Page, das Grid, die Multiauswahl und der spätere Dashboard-Builder konsumieren genau diese Typen (Overview-Spec §3.5, §7.4).
2. **Erweitert wird nur die offene Union** `OverviewComponentType` (Overview-Spec §3.1: „jeder neue Typ kommt mit Adapter + Mapping-Zeile dazu“) — um `interface`, `iac-file`, `integration`, `integration-installation` und die als Operator-Soll gesetzten Typen.
3. **Domänen-Feintypen** (`App`, `Deployment`, `InterfaceSpec`, `AppType`, `FrameworkId`) stammen aus `FE-PLUGINS-CONCEPT` §3.2 und `types/domain/hierarchy.ts`; sie werden im `data`-Pfad von `OverviewComponent` referenziert, nicht dupliziert.
4. **Hierarchie und Scope-Vererbung** stammen aus `FE-IA-SPEC` §1.1 (4-Tier-Kette, weiche Project→Workspace-Kette) und §2.1 (Pfad-Semantik `all ⊃ target ⊃ workspace ⊃ project ⊃ app`, Override nach unten).
5. **Deployment-Code-Seite** (`iac-file`) kommt aus `FE-IAC-DISCOVERY-SPEC` §4/§5 — File-Ebene **unterhalb** des Projects, ändert oben nichts (IAC-Spec §6.1: „diese Spec ändert nichts an der IA-Hierarchie, sie hängt nur eine File-Ebene darunter an“).
6. **Neu aus Operator-Input**: Integration als eigenständige Component (`integration`), Secrets als scope-gebundene Component mit OPA-Sichtfilterung (`SecretScopeBinding`), AppType-Erweiterung auf 7 Werte, manuelle Deployments mit Auto-Project (`DeploymentSpec.autoProject`), Docker-Hub-Metadaten (`DockerImageMeta`).

**Scope-Level-Brücke (einmal, dann bindend):** `FE-OVERVIEW-SPEC` §3.1 nutzt `ScopeLevel = 'ssh' | 'workspace' | 'project' | 'app' | 'global'`; `FE-IA-SPEC` §2.1 nutzt `ScopeKind = 'all' | 'target' | 'workspace' | 'project' | 'app' | 'session'`. Die Zuordnung: `all` ≙ `{level:'global'}`, `target` ≙ `'ssh'`, `session` ist **keine** Scope-Ebene, sondern ein `data`-Attribut (`sessionId`) einer App/Workspace-Component — Session-Components hängen auf Workspace-Ebene (Tabelle §2, Zeile `session`). Das globale Scope-Objekt selbst lebt unverändert in `lib/global-scope.ts:25–39` (`ScopeKind` inkl. `'all'`, Persistenz `jimesh.global-scope`, :41) und wird von der IA-Spec-Erweiterung (IA-Spec §2.1, explizites `{kind:'all'}` statt `null`) migriert, sobald sie umgesetzt ist.

---

## 1. Das kanonische TypeScript-Schema

Ein Block, alle Typen. Basis-Kommentare aus `FE-OVERVIEW-SPEC` §3.1/§3.4 und `FE-PLUGINS-CONCEPT` §3.2 sind übernommen; Erweiterungen sind mit `// NEU` markiert. Zielort bleibt `src/frontend/src/types/overview/component.ts` (Basis) + `src/frontend/src/types/domain/interfaces.ts` (Domänen-Feintypen, PLUGINS-Spec §3.2) — Erweiterungstypen gehören in die gleichen Dateien, nicht in neue.

```ts
// ══════════════════════════════════════════════════════════════════════
// A) FUNDAMENT (wörtlich aus FE-OVERVIEW-SPEC §3.1 — unverändert)
// ══════════════════════════════════════════════════════════════════════

/** Schema-Version für spätere Migrationen (Analogie MANDATES §8). */
export const OVERVIEW_SCHEMA_VERSION = 1

/** Die Ebene, auf der eine Component hängt. 'global' = scope-agnostisch. */
export type ScopeLevel = 'ssh' | 'workspace' | 'project' | 'app' | 'global'

/**
 * Eltern-Referenz. id ist immer die ECHTE Registry-Id des Elters;
 * 'no_parent' (FALLBACK_PARENT_ID, hierarchy.ts:9) ist erlaubt und erscheint
 * in der Overview genau nach Mandate §13 nur, wenn der Bucket nicht leer ist.
 */
export interface ScopeRef {
  level: ScopeLevel
  id: string
}

/**
 * Die VOLLSTÄNDIGE Typ-Union (alle §2-Hierarchie-Zeilen). Basis-Union aus
 * Overview-Spec §3.1, erweitert um interface/iac-file/integration-*
 * (PLUGINS-Spec §3, IAC-Spec §3.6, Operator-Input).
 */
export type OverviewComponentType =
  // 4-Tier-Kern (hierarchy.ts:13–51)
  | 'ssh-target' | 'workspace' | 'project' | 'app'
  // app-/workspace-nah (DeploymentRow store/deployments.go:6–18;
  // InterfaceSpec PLUGINS-Spec §3.2; containerId-Felder hierarchy.ts:49,
  // workspace-deploy-dialogs.tsx:68)
  | 'container' | 'deployment' | 'interface'
  // Sessions & Agenten (SubagentsPanel.tsx:32–50)
  | 'session' | 'subagent'
  // Security (FirewallRule store.tsx:22–30; SIEMEvent store.tsx:32–40;
  // SecurityEventRow security-events.ts:10–22)
  | 'firewall-rule' | 'siem-event' | 'security-finding' | 'iac-finding'
  // Deployment-Code als eigenes Objekt (iac_files-Tabelle, IAC-Spec §3.6)
  | 'iac-file'
  // Netz (VLANNetwork networking.ts:21–32; NetworkOwnership network_ownership.ts:6–15)
  | 'network'
  // Secrets (VaultSecretRow store/vault.go:24–34; SecretsEngineRow
  // store/secrets_engines.go:33–43; VaultDashboardPage.tsx:111–115)
  | 'secrets-engine' | 'secret'
  // Integrationen (Operator: Integration als eigene Component; Katalog
  // gateway/plugins.go:17–42; PluginInstallation plugins.ts:15–29)
  | 'integration' | 'integration-installation'
  // RBAC (ProjectBudget AdminBudgetsPage.tsx:41–49; Team/TeamMember
  // TeamsPage.tsx:43–56; KeycloakUser AdminBudgetsPage.tsx:56–60)
  | 'budget' | 'team' | 'user'
  // Phase 2: Dashboard als Widget-Container (Overview-Spec §7.2)
  | 'dashboard'

export type BadgeTone = 'critical' | 'warning' | 'info' | 'positive' | 'neutral'

/** Badge-Typen (Overview-Spec §3.1, unverändert). */
export type OverviewBadgeKind =
  | 'status'      // Registry-Status verbatim (WorkspaceRow.status, App.status, …)
  | 'severity'    // low/medium/high/critical (SIEMEvent) bzw. critical/warning/info
  | 'verdict'     // block/warn/allow (SecurityEventRow.verdict)
  | 'count'       // Zähler mit echtem N (z. B. Apps unter einem Project)
  | 'port'        // App.port / DeploymentRow.port (Mono, wie Sidebar :142)
  | 'role'        // PROJECT_ROLES / TEAM_ROLES (AdminBudgetsPage.tsx:65, TeamsPage.tsx:58)
  | 'type'        // AppType (§1d unten), Driver, AuthProviderType …
  | 'flag'        // boolean-Fakten: hasGvisor, granted, dockerSock, activated …
  | 'category'    // NetworkMetadata.category (networking.ts:7–11)

export interface OverviewBadge {
  kind: OverviewBadgeKind
  /** i18n-Key wenn vorhanden; sonst ehrlicher Rohwert (keine erfundenen Labels) */
  labelKey?: string
  value: string
  tone?: BadgeTone
}

/**
 * Links nur auf REALE Routen (gleiche Disziplin wie UnifiedFinding.link,
 * security-overview.ts:113 — „no dangling link to nowhere“). 'external' nur
 * für echte, laufende Services (Präzedenz Wazuh-Tile).
 */
export interface OverviewLink {
  labelKey: string
  to: string
  kind: 'route' | 'external'
}

/**
 * Widget-Katalog einer Component (Overview-Spec §3.1, unverändert) —
 * Grundlage für Standard-Footprints im Grid und den Dashboard-Builder (§7).
 */
export interface OverviewWidgetSpec {
  id: string                      // z. B. "app.status", "siem.latest"
  kind: 'status' | 'metric' | 'list' | 'table' | 'chart'
  labelKey: string                // Widget-Titel (i18n)
  defaultW: number                // 12-Spalten-Raster (Overview-Spec §4.3)
  defaultH: number
  minW?: number
  minH?: number
}

/**
 * Die EINE Component-Einheit. Serialisierbar (keine React-Elemente im
 * Datenpfad!) — Bedingung dafür, dass Phase-2-Dashboards dasselbe Schema
 * persistieren können (Overview-Spec §7.4).
 */
export interface OverviewComponent {
  schemaVersion: typeof OVERVIEW_SCHEMA_VERSION
  /** eindeutig pro Render: "<type>:<sourceRowId>" */
  id: string
  type: OverviewComponentType
  title: string
  subtitle?: string
  /** parent-scope: wo die Karte hängt */
  parent: ScopeRef
  /** child-scopes: was unter dieser Karte hängt (Ids je Kind-Ebene) */
  childScopeIds: Partial<Record<Exclude<ScopeLevel, 'global'>, string[]>>
  /** welche Typen die children faktisch sind (Kurzform des Baums) */
  childTypes: OverviewComponentType[]
  /** Widget-Katalog dieser Component */
  overviewWidgets: OverviewWidgetSpec[]
  badges: OverviewBadge[]
  links: OverviewLink[]
  /** Registry-Status verbatim (Mandate 2: nichts schönfärben) */
  status?: string
  createdAt?: string
  /** typ-spezifische Nutzdaten — serialisierbar, JSON-safe */
  data: Record<string, unknown>
}

// ══════════════════════════════════════════════════════════════════════
// B) APP-TYPE (Operator-Erweiterung — §5 dieses Dokuments)
// ══════════════════════════════════════════════════════════════════════

/**
 * Operator-Set (7 Werte). Das Backend kennt heute nur 5 (website/api/
 * service/tool/database, internal/domain/schema/hierarchy.go:11–17;
 * Spiegelbild FE hierarchy.ts:11) — Legacy-Werte bleiben lesbar und werden
 * beim ersten Schreibzugriff gemappt (Tabelle §5).
 */
export type AppType =
  | 'agent' | 'ide' | 'shell' | 'frontend' | 'backend' | 'database' | 'tool'

/** Legacy-Werte im Datenbestand — nur Lesetyp, nie neu geschrieben. */
export type LegacyAppType = 'website' | 'api' | 'service'

// ══════════════════════════════════════════════════════════════════════
// C) DEPLOYMENT + INTERFACE (PLUGINS-Spec §3.2, erweitert um Operator-Soll)
// ══════════════════════════════════════════════════════════════════════

/** Interface-Arten einer Deployment-Instanz (PLUGINS-Spec §3.2:141). */
export type InterfaceKind = 'http' | 'vnc' | 'code-server' | 'terminal'
/** v1 immer loopback-tunnel (MANDATES §12; PLUGINS-Spec §3.2:142). */
export type InterfaceAccess = 'loopback-tunnel'

export interface InterfaceSpec {
  id: string                      // z. B. "123:web"
  deploymentId: number
  kind: InterfaceKind
  label: string                   // i18n-artig: 'iface.web' | 'iface.vnc' | …
  port: number                    // der ALLOKIERTE, wirklich lauschende Port
  vncType?: 'neko' | 'novnc'      // nur kind='vnc'
  auth: 'token' | 'password-once' | 'none-via-tunnel'
  pluginEnabled: boolean          // Badge sichtbar?
  uiOrder: number                 // Reihenfolge der Tabs
}

/**
 * Deployment-Spec (Operator-Soll-Teile markiert). Basis: DeploymentRow
 * (store/deployments.go:6–18) + Deployment (PLUGINS-Spec §3.2:118–132).
 */
export interface DeploymentSpec {
  id: number
  projectId: string
  workspaceId?: string            // TASK-037-Parität zu containers.workspace_id
  name: string
  type: string                    // heute 'custom' — Phase 2: framework-Presets
  framework?: FrameworkId         // NEU (Spalte fehlt, DDL store.go:333–344)
  remotePath: string
  configPath: string
  status: 'stopped' | 'building' | 'active' | 'failed'
  chainId: string
  autoProvision: boolean
  interfaces: InterfaceSpec[]     // NEU (PLUGINS-Spec §3.2)
  /** NEU (Operator): wie dieses Deployment entstanden ist. */
  source: 'manual' | 'pipeline' | 'discovery'
  /** NEU (Operator): Deploy ohne Project → Backend erstellt das Project
   *  selbst (§6). true ⇒ projectId wurde vom Backend generiert. */
  autoProject?: boolean
  /** NEU: Docker-Registrierungs-Metadaten (§7). */
  image?: DockerImageMeta
  /** NEU: verknüpfte IaC-Files (iac_files.id-Liste, IAC-Spec §4.2). */
  iacFileIds?: number[]
  createdAt: string
}

export type FrameworkId =
  | 'dsh' | 'opencode' | 'gotty' | 'claude-code' | 'gemini-cli'
  | 'code-server' | 'jimesh'
  | 'dsh_code_server' | 'opencode_code_server'
  | 'claude-code_code_server' | 'gemini-cli_code_server'

// ══════════════════════════════════════════════════════════════════════
// D) INTEGRATION (Operator: Integration als eigene Component)
// ══════════════════════════════════════════════════════════════════════

/**
 * Integrations-Kinds (Operator-Set). Mapping zu InterfaceKind in §4;
 * 'dsh-session' ist neu und über InterfaceKind nicht ausdrückbar —
 * es verweist auf eine DeepSeek-Harness-Session (Backend-Beleg:
 * MCP-Tools list_dsh_profiles/trigger_dsh_turn, mcpserver/tools_dsh.go:13–60,
 * Profile „web, headless, sdk, acp“).
 */
export type IntegrationKind =
  | 'shell' | 'iframe' | 'dsh-session' | 'code-server' | 'vnc'

/**
 * Ein installierbares Integration-Modul. Der Katalog existiert bereits
 * (GET /api/plugins → gateway/plugins.go:17–42: jules, linear, github_app);
 * TASK-103-Rename zu „Integrations“ ist im PLUGINS-Spec §7.2 verankert
 * (/api/plugins → /api/integrations, /api/plugin-installations →
 * /api/integration-installations). „Aus der Overview direkt installierbar“
 * (Operator) = POST auf die Installations-Route; die Installations-
 * Persistenz fehlt heute (gateway/plugins.go:51–63 — §9).
 */
export interface IntegrationSpec {
  /** Katalog-Id, z. B. 'jules' | 'linear' | 'github_app' | 'dsh' */
  id: string
  name: string
  description: string
  wrapperApiBase: string
  authModes: ('api_key' | 'github_app')[]
  configSchema: string
  /** NEU (Operator): Darstellungs-/Anbindungsart der Integration. */
  kind: IntegrationKind
  /** NEU (Operator): ob die Overview einen Install-Button zeigt. */
  installableFromOverview: boolean
}

export interface IntegrationInstallation {
  id: string
  pluginId: string
  scopeType: 'workspace' | 'project'
  scopeId: string
  activated: boolean
  onboardingCompletedAt?: string | null
  authMode: 'api_key' | 'github_app'
  secretRef?: string | null
  githubAppInstallationId?: string | null
  config: string
  assignedFrom: 'workspace' | 'project'
  createdAt: string
  updatedAt: string
}

// ══════════════════════════════════════════════════════════════════════
// E) SECRETS (Operator: Secrets als scope-gebundene Component + OPA-Sicht)
// ══════════════════════════════════════════════════════════════════════

/**
 * Bindet ein Secret an genau einen Scope. Ist-Zustand in PostgreSQL:
 * vault_secrets trägt project_id + workspace_id ('' = legacy-global,
 * store/vault.go:15–21, DDL :61–70); secrets_engines trägt scope_kind/
 * scope_id (secrets_engines.go:49–59). Eine APP-Ebene existiert heute
 * NICHT (grep: keine app_id-Spalte in vault_secrets) — Operator-Soll, §3.
 */
export interface SecretScopeBinding {
  /** das gebundene Secret (vault_secrets.name) */
  secretName: string
  scopeLevel: 'app' | 'project' | 'workspace' | 'global'
  scopeId: string                 // '' nur auf 'global' (Legacy-Zeilen)
  /** Agenten, die das Secret via Gateway-JIT lesen dürfen
   *  (vault_secrets.allowed_agents, JSON-Array; store/vault.go:31). */
  allowedAgents: string[]
  /** OPA-Entscheid „darf der anfragende Subject dieses Secret im Scope
   *  sehen?“ — serverseitig ausgewertet, nie client-seitig (§3.3). */
  visibleTo: string[]             // Rolle/Team-Ids; leer = nur Admin/Operator
}

// ══════════════════════════════════════════════════════════════════════
// F) CONTAINER + DOCKER-HUB-METADATEN (Operator: §7)
// ══════════════════════════════════════════════════════════════════════

/**
 * Registrierungs-Metadaten eines Container-Images. Heute existiert KEINE
 * dieser Datenquelle im Backend (grep-Beleg §9-9) — das Feld ist die
 * Operator-Soll-Erweiterung; die einzige existierende Bild-Quelle ist
 * DiscoveredContainer.image (internal/discovery/discovery.go:25–35).
 */
export interface DockerImageMeta {
  registry: 'docker-hub'          // v1: nur Docker Hub
  /** voller Image-Name inkl. Namespace, z. B. "bridgecrew/checkov" */
  image: string
  /** Tag/Version, z. B. "3.2.421" */
  version: string
  author: string
  pulls: number
  /** letzte erfolgreiche Metadaten-Synchronisation (Ehrlichkeit: stale
   *  Daten sind markiert, nicht frisch lookend). */
  lastSyncedAt?: string
}
```

**Regel für `data` (aus Overview-Spec §3.2, bindend):** `parent` und `childScopeIds` stammen ausschließlich aus **realen Fremdschlüsselfeldern** der Registry — nie aus einem erfundenen Join. Ein Typ ohne eigenen Endpoint (Beispiel `container`) ist eine **abgeleitete** Component; sein `data` vermerkt die Quelle verbatim. Components mit unbekanntem Ziel bleiben `global` — ein falsch zugeordneter Filter wäre ein stiller Fake (Mandate 2; Präzedenz FirewallRulesPage.tsx:422–424).

---

## 2. Die vollständige Parent/Child-Hierarchie (23 Component-Typen)

Tier-Gerüst (`FE-IA-SPEC` §1.1, belegt in `types/domain/hierarchy.ts:13–51` und als Backend-Spiegel `internal/domain/schema/hierarchy.go:19–61`): **SSH-Target (0) → Workspace (1) → Project (2) → App (3)**, unterhalb der App Deployment → Interface (PLUGINS-Spec §4, Baum :183–191), daneben Deployment-Code als File-Ebene unterhalb des Projects (IAC-Spec §1.2). `no_parent`-Buckets erscheinen nur, wenn unzugewiesene Arbeit existiert (MANDATES §13; FALLBACK_PARENT_ID hierarchy.ts:9).

**Die weiche Kette ist Realität, nicht Defekt** (IA-Spec §1.1): Projects tragen `nodeHost/nodeUser` statt einer Workspace-Verknüpfung (store.tsx:107–120 — Mapping `nodeHost/nodeUser` → Target → Workspace, sonst `no_parent`); Workspace-Ebenen kollabieren in der Sidebar in Project-Nodes (HierarchySidebar.tsx:11, 30–31). Jede Vererbung muss mit `no_parent` rechnen.

**Datenquellen:** Die SSOT-Store-Feeds (`lib/store.tsx`) laden `GET /api/settings/ssh_endpoints` (targets, :61–69), `GET /api/workspaces` (:71–75), `GET /api/projects` (:77–81), `GET /api/deployments` (apps, :83–87), `GET /api/firewall/rules` (:89–93), `GET /api/sdk/logs?type=audit` (siemEvents, :95–99); Port-Aggregation über `portLookupTable` (:125–136). Alle übrigen Quellen lädt der Adapter-Registry-Kontext (Overview-Spec §3.4).

| # | type | parent (ScopeRef) | childTypes | Datenquelle (Route → Store-Feld : Zeile) | Badge-Quellen | primärer Link |
|---|---|---|---|---|---|---|
| 1 | `ssh-target` | `{level:'global'}` | `workspace` (via `sshTargetId`), **plus** Projects, die nur über `nodeHost/nodeUser` matchen | `GET /api/settings/ssh_endpoints` → store.tsx targets :61–69; `SSHTarget` hierarchy.ts:13–21 | flag `hasGvisor` (hierarchy.ts:19), count Workspaces | `/workspaces` (J2-UX-Ziel, HierarchySidebar.tsx:82) |
| 2 | `workspace` | `{level:'ssh', id: sshTargetId}` | `project` (via `projectId`), `container` (via `containerId`), `integration-installation` (scopeType workspace, plugins.ts:18–19), `secrets-engine` (scopeKind workspace) | `GET /api/workspaces` → store.tsx workspaces :71–75; DDL workspaces.go:53–64 (`project_id`, `container_id`, `session_id`, `ssh_target`, `worktree_path`, `status`) | status verbatim, flag `hasVaultKv` (workspaces.go:78), count Apps | `/workspaces` |
| 3 | `project` | `{level:'workspace', id: workspaceId}` oder `no_parent` | `app` (via `projectId`), `deployment` (via `projectId`), `interface` (via deployment), `budget`, `firewall-rule` (`r.projectId`), `network` (`VLANNetwork.projectId`), `integration-installation` (scopeType project), `secret` (vault_secrets.project_id), `iac-file` (via workspacePath) | `GET /api/projects` → store.tsx projects :77–81 (+ nodeHost/nodeUser-Mapping :112–120); DDL store.go:597–622 (`framework`, `workspace_path`, `port`, `vnc_port`, `code_server_port`, `category`, `network_mode`, `use_gvisor`) | status, `type` (framework/Runtime, store.go:603/618), port | `/projects` → redirect `/workspaces` (App.tsx:505) |
| 4 | `app` | `{level:'project', id: projectId}` oder `no_parent` | `container` (via `containerId`, hierarchy.ts:49), `session` (via `sessionId`-Bezug) | `GET /api/deployments` → store.tsx apps :83–87; `App` hierarchy.ts:40–51 | `type` (AppType), `status`, `port` | `/workspaces/apps` |
| 5 | `deployment` | `{level:'project', id: projectId}` (+ `workspaceId` als Operator-Soll, DDL-Spalte fehlt) | `interface` | `GET /api/projects/{id}/deployments` + Querschnitt `GET /api/deployments` (deploy.go:71–77, handleDeploymentsList :84–98); `DeploymentRow` store/deployments.go:6–18 | `status` (stopped/building/active/failed), `port`, chainId (Kurzform) | `/workspaces/deployments` |
| 6 | `interface` | `{level:'app'}` — über `deploymentId` an die App gehängt (PLUGINS-Spec §4: „hängt an der App (Tier 3)“) | — | `DeploymentSpec.interfaces` (PLUGINS-Spec §3.2:144–154); Ableitungsregeln PLUGINS-Spec §8.1 (`port>0`→http, `vncPort>0`∧framework∈opencode*→vnc, `codeServerPort>0`∧framework∈code-server*→code-server, isShellFramework→terminal) | `type` (InterfaceKind), `port`, flag `pluginEnabled` | `/workspaces/apps/:appId` (App-Overview, PLUGINS-Spec §6.3) |
| 7 | `container` | parent des Trägers (`app` oder `workspace`) — **kein eigener Endpoint**, abgeleitete Component | — | abgeleitet aus `App.containerId` (hierarchy.ts:49) / `WorkspaceRow.containerId` (workspaces.go:58) / `containers`-Rows (DDL store.go:623–631, inkl. `workspace_id` :630); Discovery `GET /api/discovery` (`DiscoveredContainer` discovery.go:25–35) | status des Trägers, count | Link des Trägers |
| 8 | `session` | `{level:'workspace', id: ws.id}` via sessionId/Container-Match (use-scope-label.ts:120–134) | `subagent` (Rohanzahl) | `GET /api/sessions` (gateway.go:206) → `SessionListRow` (use-scope-label.ts:21–26); `workspaces.session_id` (workspaces.go:59) | `status` verbatim | `/workspaces` |
| 9 | `subagent` | `{level:'workspace'}` + `{level:'project'}` | — | `SubagentRow` (SubagentsPanel.tsx:32–50); Tabellen `subagents`/`subagent_tool_calls` (subagents.go:78, :99) | `status` (spawning/running/done/error/stopped), risk-Anhalt | `/workspaces` |
| 10 | `firewall-rule` | `{level:'project', id: projectId}` (optional — Regeln ohne Project sind global) | — | `GET /api/firewall/rules` → store.tsx firewallRules :89–93; `FirewallRule` store.tsx:22–30 | `granted` (verdict-artig), `port`, `protocol`, `layer` | `/security/firewall-rules` |
| 11 | `siem-event` | best-effort `{level:'workspace'\|'project'}` nach `UnifiedFinding.target` — Events ohne Ziel bleiben `global` | — | `GET /api/sdk/logs?type=audit` → store.tsx siemEvents :95–99; `SIEMEvent` store.tsx:32–40 | `severity`, scanner | `/security/siem` |
| 12 | `security-finding` | `{level:'project', id: projectId}`; container/session in `data` | — | `GET /api/security/events` → `SecurityEventRow` (security-events.ts:10–22); Tabelle `security_finding_dismissals` (security_findings.go:21) | `verdict`, `scanner`, `status` | `/security/events/:id` (echter Detail-Link) |
| 13 | `iac-finding` | `{level:'project', id: projectId}` | — | `security_events`-Zeilen mit `eventType: 'iac_finding'`, Scanner checkov (SecurityScansPage.tsx:29–33; quarantine.go:325–340) | `verdict`, `scanner`, `status` (quarantine) | `/security/scans/iac` |
| 14 | `iac-file` | `{level:'project', id: projectId}` (IaC ist projekt-/workspace-gelogen, nicht app-gelogen — IAC-Spec §1.2) | — | **Operator-Soll:** Tabelle `iac_files` + `GET /api/projects/{id}/iac-files?mode=node\|git` (IAC-Spec §3.6, §5.1); grep `iac_files` in src/backend → **0 Treffer** (§9-3) | `type` (kind: dockerfile/compose/terraform/ansible/agentMcp/snyk), `verdict` (findingCount), flag `gitTracked` | `/workspaces/iac/<fileId>` (IAC-Spec §6.1/§6.3) |
| 15 | `network` | `{level:'workspace'\|'project', id}` (beide Felder real vorhanden) | `app` via `NetworkOwnership.appId` | `VLANNetwork` networking.ts:21–33 (`projectId` :28, `workspaceId` :29, `driver` :27, `metadata` :30) + `NetworkOwnership` network_ownership.ts:6–15; Tabelle `project_vlans` (project_vlans.go:38) | `category` (networking.ts:7–11), `driver`, `vlanId` | `/networks` bzw. `/workspaces/networks` |
| 16 | `secrets-engine` | `scopeKind: 'global'\|'workspace'\|'control_plane'` (VaultDashboardPage.tsx:111) — `control_plane` wird v1 als `global` gerendert und in `data` verbatim mitgeführt | `secret` | `GET /api/secrets-engines` (gateway/secrets_engines.go:58) → `SecretsEngineRow` store/secrets_engines.go:33–43; DDL :49–59 (`scope_kind` :53, `scope_id` :54, `is_default` :56) | `type`, flag `isDefault` | `/vault-dashboard` |
| 17 | `secret` | je `SecretScopeBinding.scopeLevel`: `project`/`workspace` real (vault.go:27–28), `app` Operator-Soll, `global` Legacy (`''`) | — | `/api/vault/secrets` (security/security.go:42–43) → `VaultSecretRow` store/vault.go:24–34 (`project_id` :27, `workspace_id` :28, `allowed_agents` :31); DDL vault.go:61–70 | count `allowedAgents`, flag workspace-bound | `/security/secrets` |
| 18 | `integration` | `{level:'global'}` (Katalog ist instanzweit) | `integration-installation` | `GET /api/plugins` (gateway.go:233) → Katalog gateway/plugins.go:17–42 (jules :19, linear :27, github_app :35); `Plugin` plugins.ts:5–13; Backend-Spiegel domain/schema/plugins.go | `type` (authModes), `type` (kind: IntegrationKind) | `/workspaces/settings` (Katalog+Mount WorkspaceSettingsPage.tsx:222) |
| 19 | `integration-installation` | `{level: scopeType, id: scopeId}` — `scopeType: 'workspace'\|'project'` ist ein echtes Feld (plugins.ts:18–19) | — | `GET/POST /api/plugin-installations` (gateway.go:234) → `PluginInstallation` plugins.ts:15–29; **heute nicht persistiert**: GET liefert hartkodiert `[]`, POST spiegelt nur zurück (gateway/plugins.go:51–63 — §9-5) | flag `activated`, `authMode`, `assignedFrom` | `/workspaces/settings` |
| 20 | `budget` | `{level:'project', id: projectId}` + user-Badge (`userId`) | — | `GET /api/budgets` (security/security.go:74–75, rbac.go:14–22) → `ProjectBudget { projectId, userId, role, maxBudgetUSD, spentBudgetUSD, enabled }`; Tabelle `project_user_budgets` (store.go:1859, Charge-Pfad rbac_charge_test.go:36) | `role`, `enabled`, Auslastung max/spent (echte Zahlen) | `/admin/budgets` |
| 21 | `team` | `{level:'global'}` | `user` via `TeamMember` | `GET /api/teams` (security/security.go:76, rbac.go:111–117) → `TeamRow` (store/rbac.go:305); Tabelle `team_members` (users_delete_test.go:81) | Budget-Summen (echt), `enabled`, `role` | `/admin/teams` |
| 22 | `user` | `{level:'global'}`; Project-Kontext via Budget-Zeilen | `budget` | `GET /api/users` (security/security.go:79) → `KeycloakUser { id, email, displayName }` (AdminBudgetsPage.tsx:56–60) | `role` (aus Budget-Zeilen) | `/admin/users` |
| 23 | `dashboard` *(Phase 2)* | `{level:'global'}` oder fester `scope: ScopeRef` pro Item („folgt der Auswahl“) | — (hält Widget-Queries) | `DashboardDefinition`/`DashboardItem` (Overview-Spec §7.2); Persistenz Phase 2: Tabelle `dashboards` mit Owner (Overview-Spec §7.3) | `count` (items), status des Editors | `/overview/dashboards` (Overview-Spec §7.3) |

**Mapping-Regeln (bindend für jeden neuen Typ; aus Overview-Spec §3.2 unverändert):**
1. `parent`/`childScopeIds` aus realen Fremdschlüsselfeldern, sonst `no_parent` (Bucket nur bei Nicht-Leere).
2. Typ ohne eigenen Endpoint = abgeleitete Component; `data` vermerkt die Quelle verbatim.
3. Components mit unbekanntem Ziel bleiben `global` (Mandate 2).
4. **NEU (dieses Dokument):** neue Typen (`integration`, `integration-installation`, `interface`, `iac-file`) kommen erst mit Adapter + Tabellen-Zeile (diese §2) + Backend-Datenquelle in die Union — nie als leere Karte („Unbekannter Typ → gar keine Karte“, Overview-Spec §3.4).

---

## 3. Secrets-Scope-Modell (Scope-Bindung + OPA-Sichtfilterung)

### 3.1 Ist-Zustand (belegt)

Secrets sind bereits **zweifach** scope-gebunden — nur eben nicht als einheitliches Schema:

| Ebene | Speicherort | Beleg |
|---|---|---|
| Secret-Zeile | `vault_secrets.project_id` („owning project, '' = legacy-global row“) + `vault_secrets.workspace_id` („future per-workspace ACL dimension, '' = not workspace-bound“) | store/vault.go:27–28, DDL :61–70, Scope-Kommentar :15–21 |
| Secrets-Engine | `secrets_engines.scope_kind` ('global'/'workspace'/'control_plane') + `scope_id` + `is_default` | store/secrets_engines.go:49–59 |
| Workspace-Bindung | `workspaces.has_vault_kv` + `workspaces.secrets_engine_id` (TASK-065, additive Spalten) | store/workspaces.go:74–86 |
| Agent-Zugriff | `vault_secrets.allowed_agents` (JSON-Array) + Gateway-JIT `/api/vault/access` (ausdrücklich NICHT Admin-mutierend) | store/vault.go:31; policy/policy.go:32–37 |
| Audit | `vault_audit_log` (scope unter dem zugegriffen wurde, accessor_type human/agent/mcp/service) | store/vault.go:37–47, DDL :75+ |

**Lücke (Operator-Soll „jede App hat ein Secrets-Feld“):** eine **App-Ebene** gibt es in `vault_secrets` nicht — grep über die `vault_secrets`-DDL und -Zugriffe: keine `app_id`-Spalte (Belege §9-6). Die Workspace-Bindung ist als Spalte angelegt, aber im Row-Kommentar ausdrücklich „future“ (vault.go:28).

### 3.2 Soll: SecretScopeBinding als Schema-Regel

1. **Genau ein Scope pro Secret** (`SecretScopeBinding.scopeLevel`): `global` (Legacy `''`) ⊂ `workspace` ⊂ `project` ⊂ `app`. Die Bindung folgt denselben Fremdschlüsseln wie die Hierarchie-Tabelle §2 — ein Project-Secret ist für alle Apps des Projects sichtbar, ein Workspace-Secret für alle Projects/Apps dieses Workspace.
2. **Vererbung:** ein auf Ebene E gesetztes Secret gilt für den gesamten Sub-Baum unter E (Analogie zum Team-Binding-Modell IA-Spec §2.6: „B.resource_id ein Ancestor von Q … inherit=1“). Override nach unten: eine engere Ebene kann ein Secret **verdecken** (nicht löschen) — die engere Bindung gewinnt die Sichtbarkeit, wie bei den Rollen-Bindings „spezifischster Binding gewinnt“ (IA-Spec §2.6-2).
3. **Secrets-Feld pro Component:** `OverviewComponent.data.secrets` trägt je App/Project/Workspace-Component die **sichtbaren** Secret-Namen (nie Werte — AES-GCM-256-verschlüsselt, `EncryptedValue` wird nie serialisiert, vault.go:29). Das „Secrets-Feld“ der Operator-Formulierung ist damit ein abgeleitetes View-Feld, kein neues Speicherobjekt.

### 3.3 OPA-Sichtfilterung

Die eine Authorization-Engine ist OPA/Rego („eine Engine, nicht zwei“, internal/policy/policy.go:1–20; `github.com/open-policy-agent/opa/v1/rego` :16; eingebettetes `policies/default.rego` :19–20). Zwei Module leben bereits auf dieser Engine: der Admin-Mutation-Gate (`IsAdminMutation`, policy.go:26+, Präfix-Liste :38+) und der Project-Gate (`project_roles.go:13–14`: „Neither alone grants anything: the OPA project gate“).

**Soll-Modul `secrets.rego`** (auf dem Project-Gate-Bauplan, IA-Spec §2.6-OPA-Anbindung, Muster project-roles.rego / project_gate.go):

```rego
# data.jimesh.secrets.allow — fail-closed (default allow := false,
# Muster project-roles.rego:38–63)
# input (alles serverseitig aufgelöst, wie ProjectAccessInput project_gate.go:43–49):
#   input.subject    string          — verified sub (Keycloak/Service-Key)
#   input.roles      array[string]   — verified realm roles
#   input.teams      array[string]   — Team-Ids des verified sub (team_members)
#   input.method     string          — "read" | "list" (Liste: Sicht-Entscheid pro Secret)
#   input.secret     { name, scope: { level, id }, allowedAgents }
#   input.chain      array[object]   — Ancestor-Kette des Scopes (Target→Workspace→Project→App)
allow {
  input.roles[_] == "jimesh-admin"                    # Admin-Bypass (Muster project-roles.rego:43–53)
}
allow {
  input.secret.scope.level == "global"                # Legacy-Operator-Sicht
}
allow {                                               # Scope-Mitgliedschaft: Subject sitzt IM Scope
  input.secret.scope.id == input.chain[i].id
}
allow {                                               # Agent: JIT-Liste (allowed_agents)
  input.subject == input.secret.allowedAgents[_]
}
```

- **Lookup-Punkt:** nicht im Frontend. `GET /api/vault/secrets` filtert die Liste serverseitig auf die Zeilen, für die das Rego-Modul `allow` liefert (heute: der CRUD-Filter „any other value is a WHERE filter that a foreign project's rows never pass“, vault.go:19–20 — der OPA-Lookup ersetzt den reinen WHERE-Filter, Semantik bleibt). Das Frontend erhält in `OverviewComponent.data.secrets` **nur die gefilterte Menge** — ein stiller Filter ist verboten (Mandate 2): die Overview zeigt einen Chip „Secrets nach Scope gefiltert (OPA)“ mit Count.
- **Admin-Gate-Interplay:** POST/PUT/DELETE auf `/api/vault/secrets*` bleiben Admin-Mutationen (policy.go-Präfixe); `/api/vault/access` bleibt ausdrücklich ausgenommen (policy.go:32–37) — Agent-JIT läuft über Vault-Tokens, nicht über Dashboard-Sessions.
- **Fail-closed:** kein Binding, keine Mitgliedschaft, kein allowedAgents-Treffer ⇒ `allow = false`. Ein fehlender Scope (`''` auf Nicht-global) ist ein Schema-Verstoß → die Zeile wird **nicht** still als global gerendert, sondern in `data` verbatim mit Legacy-Markierung geführt (Präzedenz: `control_plane`-Engines, Tabelle §2 Zeile 16).

---

## 4. Integration-Modell (Operator: Integration als eigene Component)

### 4.1 kind — fünf Anbindungsarten

| IntegrationKind | InterfaceKind-Äquivalent (PLUGINS-Spec §3.2:141) | Ist-Beleg |
|---|---|---|
| `iframe` | `http` — `project.port` → `InterfaceSpec {kind:'http'}` (PLUGINS-Spec §3.3, Mapping-Tabelle :168–175) | `iframe_url`-Spalte existiert (store.go:616), URL-Bildung heute doppelt geraten → zentral nach `lib/interfaces.ts` (PLUGINS-Spec §6.3) |
| `code-server` | `code-server` — `codeServerPort>0` ∧ framework ∈ code-server/*_code_server (PLUGINS-Spec §8.1) | `code_server_port`-Spalte (store.go:611) |
| `vnc` | `vnc` — `vncPort>0` ∧ framework ∈ opencode/opencode_code_server; nur bei real lauschendem VNC („Ports ohne ‚läuft wirklich‘-Wahrheit“, PLUGINS-Spec §7.3-3) | `vnc_port`-Spalte (store.go:610), `vncType` neko/novnc (InterfaceSpec §3.2:150) |
| `shell` | `terminal` — Container-Tag `'shell'` (`isShellFramework`), kein HTTP-Port, docker-exec-Hinweis (PLUGINS-Spec §3.3) | `isShellFramework` projects_ssh.go:319–332; shellAccess-Response :2281–2295 |
| `dsh-session` | **kein** InterfaceKind-Äquivalent — verweist auf eine DeepSeek-Harness-Session (Profile web/headless/sdk/acp) | MCP-Tools `list_dsh_profiles`/`trigger_dsh_turn` (mcpserver/tools_dsh.go:13–60); `agent_types`-Tabelle + „DSH Advanced Agent Types & Sessions“ (gateway.go:2653–2664, store.go:486) |

### 4.2 Aus der Overview direkt installierbar

- **Katalog-Quelle (real):** `GET /api/plugins` liefert die Katalog-Einträge jules / linear / github_app (gateway/plugins.go:17–42). TASK-103-Rename (UI „Plugin“ → „Integrations“): `/api/plugins → /api/integrations`, `/api/plugin-installations → /api/integration-installations` (PLUGINS-Spec §7.2, Option A) — Label-Änderung an der einen canonical table (`section-nav.ts:99`), API_DOCS im selben Change (Mandat §1).
- **Install-Flow (Operator-Soll auf bestehendem Vertrag):** Overview-Card `integration` zeigt Install-Button ⇢ `POST /api/plugin-installations` mit `{pluginId, scopeType, scopeId, authMode}`. Der Handler existiert (gateway/plugins.go:48–66), **persistiert aber nicht** (§9-5) — die Install-Fähigkeit der Overview wird erst wahr, wenn die Installation eine Row bekommt (Store-Pattern analog `plugin_installations`-Tabelle; Ensure-Pattern wie secrets_engines.go:48–63).
- **Katalog-Regeln der Overview:** nur `installableFromOverview: true` zeigt den Button; der Install-Zustand kommt aus der Installation-Liste (`integration-installation`, Tabelle §2 Zeile 19) — eine doppelte Installation am selben Scope ist ein ehrlicher Fehlerzustand, kein stiller Toggle (Mandate 2).

### 4.3 Konfig und Status

- **Konfig:** `configSchema` (JSON-Schema-String, Katalog) + `IntegrationInstallation.config` (Instance-JSON, plugins.ts:25) + `authMode` (`api_key` | `github_app`, plugins.ts:22) + `secretRef` (Verweis in den Vault, **nie** der Secret-Wert selbst — Mandate 9 „Agents never receive plaintext API keys“, MANDATES.md:119–132; gleiche Disziplin wie `gitToken`: nie persistiert, projects_ssh.go:118–121).
- **Status-Modell:** `status: 'available' | 'installed' | 'active' | 'error'`, abgeleitet: `available` = im Katalog ohne Installation; `installed` = Installation mit `activated=false`; `active` = `activated=true`; `error` = Wrapper-API antwortet nicht (Ehrlichkeit wie der Wazuh-Tile: Link statt Embed, keine Verfügbarkeits-Lüge, Overview-Spec §3.1-Kommentar). `pluginEnabled` (InterfaceSpec, PLUGINS-Spec §3.2:152) bleibt die **Interface-Ebene** desselben Konzepts: Badge sichtbar oder nicht — in v1 deterministisch abgeleitet (PLUGINS-Spec §8.1), Interface-CRUD erst P4 (PLUGINS-Spec §8.2).

---

## 5. Mapping bestehender Frameworks → AppType + Interfaces

AppType-Ist: **5 Werte** in `internal/domain/schema/hierarchy.go:11–17` (Backend-Spiegel) und `types/domain/hierarchy.ts:11` (Frontend): `website | api | service | tool | database`. Operator-Set: **7 Werte** `agent | ide | shell | frontend | backend | database | tool`.

**Legacy-Mapping (beim Schreiben gemappt, beim Lesen verbatim mit Legacy-Badge):**

| Legacy (Datenbestand) | → AppType (Operator-Set) | Begründung |
|---|---|---|
| `website` | `frontend` | veröffentlichte Weboberfläche |
| `api` | `backend` | API-Surface |
| `service` | `backend` | Dienst ohne eigene UI |
| `tool` | `tool` | identisch |
| `database` | `database` | identisch |

**Framework → AppType + Interfaces** (Frameworks verbatim aus PLUGINS-Spec §3.2:134–138 und Deploy-Vertrag; Interface-Ableitung nach PLUGINS-Spec §8.1, Regeln verbatim; Backend-Zuordnung `hasVSCode` projects_ssh.go:1206–1207, Compose-Pfad `jimesh` :1803–1804, Worktree-Mount :1714–1715):

| Framework | AppType | Interfaces (nach §8.1-Regeln) | Anmerkung |
|---|---|---|---|
| `dsh` | `ide` | `http` (port>0); DeepSeek-Harness-UI im Container | DSH-Sessions zusätzlich als `dsh-session`-Integration (§4.1) |
| `dsh_code_server` | `ide` | `http` + `code-server` (codeServerPort>0) | Basis + VS Code-Surface |
| `opencode` | `agent` | `http` + `vnc` (vncPort>0, `vncType` aus Project-Row, default neko — PLUGINS-Spec §8.1-Zeile 2) | „currently just opencode's noVNC“ (PLUGINS-Spec §3.1) |
| `opencode_code_server` | `agent` | `http` + `vnc` + `code-server` | |
| `code-server` | `ide` | `http` + `code-server` | reine IDE-Surface |
| `gotty` | `shell` | `http` (port>0) | Web-Terminal-Share; App-Typ „Shell“ |
| `claude-code` | `agent` | `http` + `terminal` (isShellFramework **ohne** `_code_server`, kein HTTP-Port am Terminal-Interface — PLUGINS-Spec §8.1-Zeile 4) | Shell-Hinweis-UI statt iframe (PLUGINS-Spec §6.3) |
| `claude-code_code_server` | `agent` | `http` + `code-server` + `terminal` | |
| `gemini-cli` | `agent` | `http` + `terminal` | wie claude-code |
| `gemini-cli_code_server` | `agent` | `http` + `code-server` + `terminal` | |
| `jimesh` | `backend` | `http`; Deployment-Vertrag: `git clone/fetch+reset` + `docker compose down/up -d` im Workspace (projects_ssh.go:1798–1804) | klassische App-Deployments; IaC-Files des Stacks landen als `iac-file` (§2 Zeile 14) |

**Nicht ableitbar (ehrlich leer, Mandate 2):** `interfaces: []` und AppType-Fallback `tool` nur, wenn auch das Frontend nichts herleiten kann — sonst bleibt das Legacy-Feld verbatim (PLUGINS-Spec §8.1-Zeile 5: „ehrlich leer, Badge bleibt weg“).

---

## 6. Manuelle Deployments: Auto-Project + Drag & Drop

### 6.1 Ist (belegt)

- `executeDeploy` verlangt **zwingend** `ProjID`: „host, user, and project ID are required“ (projects_ssh.go:1171–1173). Ein Deploy **ohne Project ist heute unmöglich**.
- Das Project-Row-**Upsert** existiert: `UpsertProject` legt die Zeile an, wenn die id fehlt (`INSERT … ON CONFLICT(id) DO UPDATE`, store.go:1720–1739), gerufen aus dem Deploy-Pfad mit Status „deployed“ und allen allocierten Ports (projects_ssh.go:2130–2149).
- `deployments`-Rows schreibt die Deploy-Pipeline **nicht**: `CreateDeployment` wird ausschließlich vom manuellen POST-CRUD gerufen, `redeploy` setzt nur `status=building` (IAC-Spec §2.5; INSERT store/deployments.go:70). Deployments ohne Project-Bezug gibt es daher nicht — jedes Deployment hängt an einem bestehenden `project_id`.
- Id-Generierung hat ein Repo-Präzedenz-Muster: `newSecretsEngineID()` = `"se-" + 8 Zufallsbytes` (secrets_engines.go:65–69).

### 6.2 Operator-Soll: Deploy ohne Project → Auto-Project

1. **Request:** `POST /api/projects/deploy` mit `ProjID = "` (oder weggelassen). `executeDeploy` prüft :1171–1173 und generiert stattdessen eine Id nach dem `newSecretsEngineID`-Muster (`"prj-" + hex`), markiert `autoProject = true` (DeploymentSpec, §1).
2. **Erzeugung:** `UpsertProject` (bestehender Code-Pfad :2130) legt die Project-Row an: Name = Deploy-Name/Framework-Kürzel, `framework`, `node_host/user/port`, `workspace_path`, Ports — exakt die Felder, die der Pfad ohnehin schreibt. `workspaceId` bleibt `no_parent` (FALLBACK_PARENT_ID, hierarchy.ts:9/33) bis eine Workspace-Zeile existiert oder der `nodeHost/nodeUser`-Match (store.tsx:112–120) sie ableitet.
3. **Ehrlichkeit:** die Deploy-Response trägt `projectId` + `autoProject: true`, damit die Overview die Karte als auto-erstellt kennzeichnet (Badge `flag autoProject`). Kein stiller Fund (Mandate 2): der Operator sieht, dass ein Project ohne sein Zutun entstanden ist.
4. **Deployment-Row:** dieselbe P1-Verhaltensänderung wie im PLUGINS-Spec §8.2/§9-1: der Deploy-Pfad schreibt die `DeploymentRow` selbst (`remotePath = workspacePath`, `configPath` aus der IaC-Ableitung, IAC-Spec §4.2 „Alternative“). Bis dahin bleiben Deployment-Links best-effort über `remotePath` und die UI suggeriert keine automatische Verknüpfung (IAC-Spec §4.2, Mandat 2).

### 6.3 Drag & Drop-Vorbereitung

- **Was DnD bedeutet:** App/Deployment/Integration-Installation auf ein anderes Project/Workspace **umhängen** = echtes Parent-Reassignment, kein UI-Spielzeug. Das Overview-Schema trägt die Felder dafür bereits: `parent: ScopeRef` + `childScopeIds` sind abgeleitete Views über dieselben Fremdschlüssel (`app.projectId`, hierarchy.ts:42; `deployment.projectId`, store/deployments.go:8; `plugin-installation.scopeType/scopeId`, plugins.ts:18–19) — ein Umhängen ist eine **Feld-Schreiboperation in der Registry**, und die Karte folgt beim nächsten Adapter-Lauf.
- **Backend-Lücke:** es gibt heute **keine** Reassignment-Route (grep: kein Handler für „move/assign“ auf project/app-Ebene; Port-Zuordnung nur `POST /api/projects/{id}/ports/assign`, API_DOCS.md:1029). Vorschlags-Minimum: `PUT /api/apps/{appId} {projectId}` bzw. `PUT /api/projects/{id}/deployments/{depId} {projectId}` (die deployments-PUT-Route existiert als CRUD, deployments.go:77–89 — sie müsste nur projectId-Feld-Schreibverhalten bekommen) + `no_parent` als ausdrückliches Drop-Ziel („Unassigned“-Bucket, MANDATES §13).
- **DnD-Regeln im Grid:** Drop ist nur dort erlaubt, wo der Ziel-Scope dieselbe `ScopeLevel`-Ebene wie der aktuelle Parent trägt (App auf Project/`no_parent`, Project auf Workspace/`no_parent`, Installation auf workspace/project) — anders wäre der Scope-Pfad (IA-Spec §2.1: „all ⊃ target ⊃ workspace ⊃ project ⊃ app“) gebrochen. Drag-Vorschau zeigt den Ziel-Bucket-Namen; nach dem Drop folgt die Karte der Registry, nicht einem lokalen Zustand (Persistenz-Mandat §3: „looks like saving“ ⇒ echtes Round-Trip, Muster §4.4 des Overview-Specs).

---

## 7. Docker-Hub-Metadaten-Feld

`DockerImageMeta` (§1-F-Block): `registry/image/version/author/pulls/lastSyncedAt`.

- **Warum:** Container-Infos sollen registry-spezifische Fakten zeigen („image, author, version, pulls“ — Operator-Input). Das Bild selbst ist heute vorhanden (`DiscoveredContainer.image`, discovery.go:25–35; Container-Name/Tags in `containers`, store.go:623–631 — `tags TEXT DEFAULT '[]'` :629), **Registry-Metadaten** gibt es nicht.
- **Beleg der Lücke:** grep über `src/backend` nach `dockerhub|docker hub|DockerHub|pulls|author` → Treffer ausschließlich in unrelated Kontexten (wsproxy-Tests „Unauthorized“, socket-guard „image pulls“-Logging, `.ssh/authorized_keys`) — **keine** Docker-Hub-Client/Route/Spalte (§9-9).
- **Wo das Feld hängt:** `DeploymentSpec.image?` (§1-C) und als abgeleites Badge auf `container`-/`deployment`-Karten (`type`-Badge `image`, `count`-Badge `pulls`). Die Metadaten sind **Cache, keine Wahrheit**: `lastSyncedAt` markiert stale Daten; ein nicht synchronisiertes Image zeigt **keine** Metadaten statt erfundener (Mandate 2; gleiche Ehrlichkeits-Disziplin wie „nie gescannt“ in der IaC-Liste, IAC-Spec §6.2).
- **Nicht-Ziel:** ein Docker-Hub-Client eröffnete einen neuen Egress-/Rate-Limit-Kontrakt und ist ein eigener Sprint — dieses Schema definiert nur das **Datenfeld**, nicht den Abgleich.

---

## 8. SSOT-Feeds & Scope-Kinds (Datenbasis des Schemas, grep-verifiziert)

**Store-Feeds** (`lib/store.tsx`, SSOTProvider): targets `GET /api/settings/ssh_endpoints` (:61–69), workspaces `GET /api/workspaces` (:71–75), projects `GET /api/projects` (:77–81, Mapping :112–120), apps `GET /api/deployments` (:83–87), firewallRules `GET /api/firewall/rules` (:89–93), siemEvents `GET /api/sdk/logs?type=audit` (:95–99); Ableitungen `portLookupTable` (:125–136). Shape-tolerante Extraktion `listFrom` (:10–18) — unbekannte Shapes werden **ehrlich zu []**. Adapter-Erweiterungen (`OverviewContext.extras`, Overview-Spec §3.4) ergänzen: deployments/pluginInstallations/secretsEngines/budgets/teams/users/securityEvents/sessions/subagents — neu hier: `iacFiles` (IAC-Spec §5.1) und `integrations` (§4).

**Scope-Kinds** (`lib/global-scope.ts`): `ScopeKind = 'workspace' | 'session' | 'app' | 'ssh' | 'all'` (:25), `GlobalScope` mit workspaceId/projectId/containerId/sessionId/sshEndpointId (:27–39), Persistenz `jimesh.global-scope` (:41). IA-Spec-Zielform (`'all'|'target'|'workspace'|'project'|'app'|'session'` mit Pfad-Semantik, IA-Spec §2.1) migriert die Feldnamen beim Laden (:46–58-Parser). Multiauswahl: `SelectionSet` (Overview-Spec §5.1) bleibt parallel, Anker-Bridge §5.2.

---

## 9. Was am Backend fehlt (Lücken-Liste, grep-belegt)

| # | Lücke | Beleg |
|---|---|---|
| 1 | **Kein Interface-Objekt / keine `interfaces`-Spalte** in `deployments` | DDL hat nur `type TEXT DEFAULT 'custom'`, `port`, `remote_path`, `config_path`, `status`, `chain_id`, `auto_provision` (store.go:333–344); grep `interfaces` im store-Verzeichnis → 0 Treffer. „Ports ohne ‚läuft wirklich‘-Wahrheit“ (PLUGINS-Spec §7.3-3) |
| 2 | **Deploy-Pfad persistiert keine Deployment-Rows**; `deployments` hat kein `framework`/`workspace_id` | `CreateDeployment` nur im manuellen CRUD (store/deployments.go:70, INSERT), `redeploy` nur Status-Flag; DDL :333–344 ohne beide Spalten (IAC-Spec §2.5, §8) |
| 3 | **Keine IaC-File-Discovery / kein `iac_files`-Store** | grep `iac_files` in src/backend → **0 Treffer**; kein Remote-Datei-Listing (`find`/`ls` als Scan-Befehl existiert nicht, IAC-Spec §2.1.4); `/api/projects/{id}/iac-files*`-Routen nicht registriert (deploy.go:48–78 komplett durchgesehen) |
| 4 | **Kein Auto-Project bei Deploy ohne Project** | `executeDeploy` bricht mit 400 ab, wenn `ProjID == ""` (projects_ssh.go:1171–1173); `UpsertProject` kann Zeilen anlegen (:1720–1739), wird aber nur mit mitgelieferter id gerufen (:2130) |
| 5 | **`/api/plugin-installations` nicht persistiert** (Install-Fähigkeit der Integration-Component ist damit Schein) | GET antwortet hartkodiert `{"installations": []}`, POST dekodiert, setzt `Activated=true` und spiegelt den Request zurück — kein Store-Aufruf (gateway/plugins.go:51–63) |
| 6 | **Keine App-Ebene für Secrets** | `vault_secrets` hat nur `project_id`/`workspace_id` (DDL vault.go:61–70; `workspace_id` ausdrücklich „future per-workspace ACL dimension“, :28); grep `app_id`-Binding in vault.go/secrets_engines.go → 0 Treffer |
| 7 | **Kein OPA-Modul für Secret-Sichtbarkeit** | Policy-Engine lädt nur `policies/default.rego` (policy.go:19–20); Secret-Zugriffsfilter ist reiner SQL-WHERE (vault.go:19–20) — keine pro-Subject-Sichtentscheidung im Rego-Lookup |
| 8 | **Keine Parent-Reassignment-Routen** (Drag & Drop-Grundlage) | grep move/assign: nur `POST /api/projects/{id}/ports/assign` (API_DOCS.md:1029); deployments-PUT ist Status-/Feld-CRUD ohne projectId-Reassignment-Vertrag (IAC-Spec §4.2: „Bestätigung = PUT … mit configPath“) |
| 9 | **Keine Docker-Hub-Metadaten** | grep `dockerhub|docker hub|DockerHub|pulls|author` → nur wsproxy/socket-guard-Test- und Logging-Funde; `containers.tags` ist freier JSON-Text (store.go:629), keine Registry-Spalte, kein Client, keine Route |
| 10 | **AppType-Set hinten dran** | Backend `AppType` kennt 5 Werte (website/api/service/tool/database, internal/domain/schema/hierarchy.go:11–17); Operator-Set agent/ide/shell/frontend existiert nirgends (grep `AppType` → nur die 5 Konstanten) |
| 11 | **MCP-DSH-Tools rufen nicht existierende Gateway-Routen** | `tools_dsh.go` ruft `GET /api/plugins/dsh/profiles` / `POST /api/plugins/dsh/turns` (tools_dsh.go:22, :52); grep `plugins/dsh` in gateway → nur die mcpserver-Client-Zeilen, keine `HandleFunc`-Registrierung |
| 12 | **Integration-Kinds haben keine dedizierte Objekt-/Routen-Ebene** | `dsh-session`: keine Session-Zuordnung zu Apps im `sessions`-Schema (store.go:493); shell/iframe/vnc/code-server existieren nur als projizierte Ports auf der projects-Row (store.go:609–616) bzw. als Ableitungsregeln (PLUGINS-Spec §8.1), nicht als deklarative Records |
| 13 | **Team-Bindings ohne Wirkung auf Ressourcen** | Tabelle `team_resource_bindings` existiert nicht (CREATE TABLE-Grep über internal/store: nur die im Anhang gelisteten Tabellen); Vorschlag + OPA-Modul verankert in IA-Spec §2.6 |

**Reihenfolge-Empfehlung** (aus den Quell-Specs abgeleitet, keine neue Entscheidung): P0 Rename Plugin→Integration + Labels (PLUGINS-Spec §8.2-P0), P1 Deployment-Pfad persistiert Rows + Interfaces + `workspace_id`/`framework`-Spalten (PLUGINS-Spec §8.2-P1 + §9-1/2), P2 FE-Modell & Views (§8.2-P2), P3 Backfill/Klassifikation bestehender Rows (§8.2-P3), danach die Operator-Soll-Erweiterungen Auto-Project (§6), Secret-Scope-OPA (§3.3), Integrations-Kinds (§4), Docker-Hub-Meta (§7), iac_files (IAC-Spec §3.6).

---

## Anhang — Belegverzeichnis (Primärquellen dieses Dokuments)

- **Specs:** FE-OVERVIEW-SPEC.md §2–§7; FE-IA-SPEC.md §1.1, §2.1–§2.6; FE-PLUGINS-CONCEPT.md §3, §4, §6–§8; FE-IAC-DISCOVERY-SPEC.md §1–§5, §6, §8.
- **Frontend-Quellen:** types/domain/hierarchy.ts (1–60); types/domain/plugins.ts (5–29); types/domain/networking.ts (7–33); types/domain/network_ownership.ts (6–15); lib/global-scope.ts (25–107); lib/store.tsx (10–171).
- **Backend-Quellen:** internal/domain/schema/hierarchy.go (6–71); internal/store/store.go (333–344, 597–631, 1720–1739, 1859–1879); internal/store/workspaces.go (53–88); internal/store/secrets_engines.go (33–73); internal/store/vault.go (15–80); internal/store/deployments.go (6–30, 70); internal/store/rbac.go (305); internal/policy/policy.go (1–45); internal/deploy/deploy.go (48–98); internal/deploy/projects_ssh.go (1161–1174, 2126–2149); internal/gateway/gateway.go (206, 230–238, 2653–2664); internal/gateway/plugins.go (10–66); internal/gateway/secrets_engines.go (58–59); internal/security/security.go (42–84); internal/mcpserver/tools_dsh.go (13–60); internal/discovery/discovery.go (25–35).
