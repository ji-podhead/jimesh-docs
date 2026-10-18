# FE-OVERVIEW-SPEC — Frontend-Overview-System (Spezifikation)

| | |
|---|---|
| **Status** | Spezifikation / Entwurf — **kein Code in dieser Änderung** |
| **Umfang** | Frontend (src/frontend) + Settings-KV-Key `overview_layouts` + spätere Dashboards-Route |
| **Basis** | grep/read gegen den echten Code — Kernbehauptungen mit Datei:Zeile-Beleg |
| **Mandate-Anker** | MANDATES.md §2 (No-Mock), §3 (Persistence), §7 (keine neuen Deps ohne Need; nur src/views/ geroutet), §8 (Migration), §13 (4-Tier + no_parent) |

---

## 1. Auftrag & Umfang

Der Operator will ein **Overview-System**:

1. ein **Overview-Tab oben in der Navbar**;
2. einen **Layout-Umschalter grouped ↔ flat**;
3. ein **React Grid** (react-grid-layout, MIT) für alle Overview-Darstellungen;
4. **Multiauswahl**: mehrere Workspaces/SSH-Targets gleichzeitig selektieren und gemeinsam ansehen;
5. ein **Component-Template/Schema** als Fundament: jede Component (App, Deployment, Plugin, IaC-File, Container, Secret, Network, Budget, Team, User, …) bekommt ein einheitliches Schema (id, type, parent-scope, child-scopes, overview-widgets, badges, links);
6. **später: eigene Dashboards** (leobot-artig) — das Schema muss dafür vorbereitet sein.

Nicht Bestandteil dieser Spezifikation: Backend-Refactorings außer den in §4.4/§7.3 genannten Erweiterungen; Umbau bestehender Pages auf das Grid.

---

## 2. Ist-Zustand (belegt)

### 2.1 Vier-Tier-Hierarchie

Die Hierarchie ist Level 0–3: **SSHTarget → Workspace → Project → App** (`src/frontend/src/types/domain/hierarchy.ts`:1–7) und als Mandat verankert (MANDATES.md §13 „Domain Hierarchy Mandate“). Regeln, die das Overview-Design betreffen:

- Fallback-Elter `no_parent` — Konstante `FALLBACK_PARENT_ID = 'no_parent'` für Apps ohne Project und Projects ohne Workspace-Zeile (hierarchy.ts:9; Kommentar an Project.workspaceId/App.projectId, hierarchy.ts:33/43).
- Ports enden **ausschließlich** auf App-Ebene und aggregieren hoch über die Lookup-Tabelle `PortAggregationLookup` (hierarchy.ts:53–60; aufgebaut in lib/store.tsx:125–136).
- `no_parent`-Gruppen erscheinen in Navigation **nur, wenn unzugewiesene Arbeit existiert** (MANDATES.md §13; umgesetzt in der Sidebar, HierarchySidebar.tsx:235–250) — die Overview übernimmt dieselbe Regel.

**Praxis-Hinweis (real, nicht idealisiert):** die Sidebar zeigt heute **drei** Ebenen — das Workspace-Level kollabiert in die Project→Target-Ableitung (HierarchySidebar.tsx:11–16, 32–68). Project→Workspace läuft über den `nodeHost/nodeUser`-Match gegen die Targets, wenn keine Workspace-Zeile existiert (store.tsx:112–120; HierarchySidebar.tsx:42–46). Das Overview-Schema (§3) muss **beide** Ableitungen unterstützen, sonst verschwinden real existierende Projects aus dem Baum.

### 2.2 Globaler Scope heute (single-select)

lib/global-scope.ts — Store-Idiom „module-level state + subscribe/getSnapshot + useSyncExternalStore“ (Kommentar global-scope.ts:11–14; Implementierung 43–107):

```ts
export type ScopeKind = 'workspace' | 'session' | 'app' | 'ssh' | 'all'   // :25
export interface GlobalScope {                                            // :27–39
  kind: ScopeKind
  workspaceId?: string   // workspace, in dem die Selektion liegt (wenn bekannt)
  projectId?: string     // „most APIs filter by project, not workspace“ (:32)
  containerId?: string   // app: registrierte Container-Id
  sessionId?: string     // session: Agent-Session-Id
  sshEndpointId?: string // ssh: endpoint id aus GET /api/settings/ssh_endpoints
}
```

- `null` = kein Scope (kein Filter).
- Persistenz: localStorage-Key `jimesh.global-scope` (global-scope.ts:41) als **bewusst kommentierte Entscheidung**: „a UI selection is browser-local state … a filter context over that data“ (global-scope.ts:16–23). Garbage im Storage → `null`, kein Crash (global-scope.ts:46–58; getestet in global-scope.test.ts:69–76).
- Writer heute: HierarchySidebar (kinds ssh/workspace/app/all, HierarchySidebar.tsx:77–96, 184–196) und ScopeSelector (scope-selector.tsx:209–333).
- Der Scope ist **Filterkontext, kein Router-Zwang**: Sidebar-Klicks setzen den Scope UND navigieren (J2-UX, HierarchySidebar.tsx:80–83); der ScopeSelector setzt ihn ohne Navigation (scope-selector.tsx:36–40).

### 2.3 Konsumenten des Scopes (vollständige Liste, grep-verifiziert)

| Konsument | Liest | Semantik |
|---|---|---|
| components/security-landing-strip.tsx | `useGlobalScope()` + `useScopeLabel()` (:371–372) | `findingMatchesScope(f, scope)` als Kind-Switch (:336–350); der Filter wird **nicht** still angewendet: sichtbarer Chip + Clear-Button („Never filter silently (Mandate 2)“, :403–420) |
| views/FirewallRulesPage.tsx | `scope?.projectId` (:425–427) | Client-Filter der Rule-Tabelle (:471–474), sichtbarer Scope-Contract (:469–472, 521–530); ein ssh-Scope kann nicht filtern und **behauptet es nicht** (:422–424) |
| views/WorkspaceDeploymentsPage.tsx | `scope.kind === 'workspace' && scope.projectId` (:69–72) | useEffect preselektiert das Project — „follows it instead of asking the user to pick the same project a second time“ (:67–68) |
| hooks/use-scope-label.ts | kompletter Scope (:93–162) | löst Ids → Label + Status; `known: false`, wenn die Zeile nicht mehr existiert (Mandate-2-Ehrlichkeit, :81–92) |

Zusätzlich existiert `components/layout/scope-selector.tsx` (vollständig, inkl. Tests scope-selector.test.tsx / scope-selector.render.test.tsx), ist aber **aktuell nirgends im App-Shell gemountet** — grep `<ScopeSelector` trifft ausschließlich die eigenen Test-Dateien. Die Kommentare, die ihn am „SectionRail/MiniSidebar“ verorten (scope-selector.tsx:26–28; SecurityLayout.tsx:8–16), sind **veraltet**: der rechtsseitige SectionRail ist mit TASK-J2 entfallen („the old right-edge SectionRail is GONE“, App.tsx:479). Diese Spezifikation hält das fest, statt es zu verschweigen — die Multi-Auswahl (§5.5) braucht ohnehin einen neuen Mount-Kontext.

### 2.4 SSOT-Store (Datenbasis)

lib/store.tsx (`SSOTProvider`/`useSSOTStore`):

- Quellen: `GET /api/settings/ssh_endpoints` (targets, :61–69), `GET /api/workspaces` (:71–75), `GET /api/projects` (:77–81), `GET /api/deployments` (apps, :83–87), `GET /api/firewall/rules` (:89–93), `GET /api/sdk/logs?type=audit` (siemEvents, :95–99).
- `/api/deployments` ist real (src/backend/internal/deploy/deploy.go:77 — `handleDeploymentsList`, persistierte Deployment-Zeilen); `/api/workspaces` ist real (gateway.go:230).
- Ableitungen: project.workspaceId via Target-Match, sonst `FALLBACK_PARENT_ID` (store.tsx:112–120); `portLookupTable` aggregiert Port→App→Project→Workspace→SSH-Target (store.tsx:125–136).
- Shape-tolerante Extraktion `listFrom` (store.tsx:10–18) — unbekannte Response-Shapes werden **ehrlich zu []**, nicht erfunden.

### 2.5 Navbar & Sidebar heute

- **Navbar** (App.tsx:225–410): rendert `navGroups` aus lib/section-nav.ts als Split-Control (TopTab + Chevron-Dropdown, :254–284). Gruppenreihenfolge ist die E-IA-Zielstruktur: **Workspaces → Platform → Security → DBs → LLM-Proxy** (section-nav.ts:43–46, 155–197). Admin ist bewusst separiert (App.tsx:121–124, 285–303). Mobil: Dropdown-Spiegel der Gruppen (App.tsx:346–401).
- **Sidebar** (HierarchySidebar.tsx): links, **in-flow** (keine Route wird überlagert, App.tsx:476–483), sticky `top-14`, `w-64`, `hidden md:flex` (:173). Struktur: „All SSH Targets“ (Scope `all`, :184–196) → Targets → Projects → Apps; „Unassigned“ nur sichtbar, wenn vorhanden (:235–250); Security-Gruppe am Ende (:263–295).
- Die Tab-/Item-Tabelle ist **die eine Quelle** für Navbar (und historisch die Rail) — die E-IA-Regel „new routes never land by convenience in the nearest group“ lebt in section-nav.ts (:32–41).

### 2.6 Sichtbarkeits-Präzedenz: scope-usage-schema.ts

lib/scope-usage-schema.ts ist das Repo-interne Muster für „wann darf ein globales UI-Element sichtbar sein“:

- Tabelle `ScopeUsageEntry { route, exact?, consumesScope, consumer?, planned? }` (:25–42); Match auf Segmentgrenzen, **längste Route gewinnt**, „not declared = not consuming“ (:95–113).
- `consumesScope: true` darf **nur zusammen mit dem lesenden Code im selben Change** geflippt werden (:14–16).

Der Overview-Tab (§6) wird genau nach diesem Muster deklariert.

### 2.7 Aggregations-Präzedenz: Security-Overview

views/SecurityOverviewPage.tsx + lib/security-overview.ts + components/security-landing-strip.tsx zeigen bereits das Muster, das die Overview verallgemeinert:

- Reale Feed-Vereinigung in **einem** Shape (`UnifiedFinding`, security-overview.ts:105–116) statt pro Quelle eigener UI.
- Stat-Tiles + Scanner-Badge-Filter + Target-Picker über **echte Registry-Daten** (SecurityOverviewPage.tsx:198–219) — keine freie Id-Eingabe.
- Fixer Landing-Strip über der Tabelle mit ehrlichem, per `dataUpdatedAt` geankertem 24h-Fenster (security-landing-strip.tsx:377–392).
- Severity-/Verdict-Badge-Töne als zentrale Maps (security-overview.ts:39–45; security-events.ts:24–28).

### 2.8 Relevante Mandate

- **§2 No-Mock**: gilt ausdrücklich auch für UI („Never filter silently“ — landing-strip.tsx:407). Die Overview zeigt nur Rows aus echten Routen; leere Zustände sind ehrlich.
- **§3 Persistence**: „Every canvas/dashboard action that looks like saving must round-trip to PostgreSQL.“ Drag/Resize im Grid (§4.4) und später Dashboards (§7.3) sind solche Aktionen.
- **§7 Architektur**: „No new dependencies without need“ (→ §4.2 begründet react-grid-layout explizit); „Frontend truth: only src/views/ is routed“ (→ Overview-Page unter src/views/).
- **§8 Migration**: analog auf persistierte Layout-/Schema-Versionen anwendbar — Validierung + id-Filter beim Laden, niemals Blind-Import.

### 2.9 Stack-Fakten (package.json, verifiziert)

next ^15.1.0 — das Next-App-Verzeichnis enthält nur den Catch-All `src/app/[[...slug]]/page.tsx`, der App.tsx mit `ssr: false` mountet („let react-router-dom handle client-side routing“); das Routing der App selbst ist also react-router-dom ^7.14.0 in App.tsx. React ^19.2.4, @tanstack/react-query ^5.97.0, @dnd-kit/core ^6.3.1 / sortable ^10.0.0, @xyflow/react ^12.11.5, lucide-react; i18n mit **60 Locale-Dateien** (check-i18n.mjs:9–16; `npm run test` führt vitest + check:i18n aus, package.json:10). Grid-/DnD-Status: **react-grid-layout ist noch nicht installiert** (grep über src: null Referenzen); @dnd-kit wird heute nur für Sortables genutzt (model-table.tsx:3–4), @xyflow/react für Knoten-Graphen (chain-mesh-graph.tsx:17; mesh-topology.tsx:9).

---

## 3. Component-Schema (Fundament)

### 3.1 Kern-Interfaces (neu: src/frontend/src/types/overview/component.ts)

```ts
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

/** Offene Union — jeder neue Typ kommt mit Adapter + Mapping-Zeile (§3.2) dazu. */
export type OverviewComponentType =
  // 4-Tier-Kern (hierarchy.ts:13–51)
  | 'ssh-target' | 'workspace' | 'project' | 'app'
  // app-/workspace-nah (DeploymentRow, WorkspaceDeploymentsPage.tsx:35–47;
  // containerId-Felder: hierarchy.ts:49, workspace-deploy-dialogs.tsx:68)
  | 'container' | 'deployment'
  // Sessions & Agenten (SubagentsPanel.tsx:32–50)
  | 'session' | 'subagent'
  // Security (FirewallRule store.tsx:22–30; SIEMEvent store.tsx:32–40;
  // SecurityEventRow security-events.ts:10–22)
  | 'firewall-rule' | 'siem-event' | 'security-finding' | 'iac-finding'
  // Netz (VLANNetwork networking.ts:21–32; NetworkOwnership network_ownership.ts)
  | 'network'
  // Secrets (VaultDashboardPage.tsx:111–115; VaultSecret ProjectSecretsPage.tsx:41–47)
  | 'secrets-engine' | 'secret'
  // RBAC (ProjectBudget AdminBudgetsPage.tsx:41–49; Team/TeamMember TeamsPage.tsx:43–56;
  // KeycloakUser AdminBudgetsPage.tsx:56–60)
  | 'budget' | 'team' | 'user'
  // Plugins (PluginInstallation plugins.ts:15–29)
  | 'plugin-installation'

export type BadgeTone = 'critical' | 'warning' | 'info' | 'positive' | 'neutral'

/** Badge-Typen. kind steuert Rendering + Ton-Mapping (Vorlagen: die
 *  SEVERITY-/VERDICT-Maps, security-overview.ts:39–45, security-events.ts:24–28). */
export type OverviewBadgeKind =
  | 'status'      // Registry-Status verbatim (WorkspaceRow.status, App.status, …)
  | 'severity'    // low/medium/high/critical (SIEMEvent) bzw. critical/warning/info
  | 'verdict'     // block/warn/allow (SecurityEventRow.verdict)
  | 'count'       // Zähler mit echtem N (z. B. Apps unter einem Project)
  | 'port'        // App.port / DeploymentRow.port (Mono, wie Sidebar :142)
  | 'role'        // PROJECT_ROLES / TEAM_ROLES (AdminBudgetsPage.tsx:65, TeamsPage.tsx:58)
  | 'type'        // AppType (hierarchy.ts:11), Driver, AuthProviderType …
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
 * für echte, laufende Services (Präzedenz Wazuh-Tile,
 * SecurityOverviewPage.tsx:92–129: Link statt Embed, keine Verfügbarkeits-Lüge).
 */
export interface OverviewLink {
  labelKey: string
  to: string
  kind: 'route' | 'external'
}

/**
 * Widget-Katalog einer Component: WELCHE Karten-/Panel-Varianten diese Entity
 * auf einer Overview/Dashboard anbietet. Das ist das Feld „overview-components“
 * des Auftrags — Grundlage für den Dashboard-Builder (§7) und die Standard-
 * Footprints im Grid (§4.3).
 */
export interface OverviewWidgetSpec {
  id: string                      // z. B. "app.status", "siem.latest"
  kind: 'status' | 'metric' | 'list' | 'table' | 'chart'
  labelKey: string                // Widget-Titel (i18n)
  defaultW: number                // 12-Spalten-Raster (§4.3)
  defaultH: number
  minW?: number
  minH?: number
}

/**
 * Die EINE Component-Einheit. Serialisierbar (keine React-Elemente im
 * Datenpfad!) — Bedingung dafür, dass Phase-2-Dashboards (§7) dasselbe
 * Schema persistieren können.
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
```

### 3.2 Parent/Child-Scope-Mapping (Tabelle, alle Zeilen belegt)

Quellen sind ausschließlich echte Felder der geladenen Daten (§2.4). „Ergänzende Quelle“ = Route, die die Adapter zusätzlich per react-query laden (geteilte Query-Keys, kein doppelter Fetch — Muster use-scope-label.ts:37–79).

| Type | Quelle (Route/Store) | parent (ScopeRef) | children (childScopeIds) | Badge-Quellen | primärer Link |
|---|---|---|---|---|---|
| `ssh-target` | `GET /api/settings/ssh_endpoints` → `SSHTarget` (hierarchy.ts:13–21) | `{level:'global'}` | `workspace`: Workspaces mit `sshTargetId === t.id`; **plus** Projects, die nur über `nodeHost/nodeUser` matchen (store.tsx:112–120, HierarchySidebar.tsx:42–46) | flag `hasGvisor` (hierarchy.ts:19), count Workspaces | `/workspaces` (J2-UX-Ziel, HierarchySidebar.tsx:82) |
| `workspace` | `GET /api/workspaces` → `WorkspaceRow` (workspace-deploy-dialogs.tsx:63–80) | `{level:'ssh', id: sshTarget}` | `project`: [`projectId`]; `container` via `containerId`; `plugin-installation` (scopeType workspace, plugins.ts:18–19); `secrets-engine` (scopeKind workspace, VaultDashboardPage.tsx:111) | status verbatim, flag `hasVaultKv`, count Apps | `/workspaces` |
| `project` | `GET /api/projects` → `Project` (hierarchy.ts:31–38; `ProjectRow` workspace-deploy-dialogs.tsx:45–61) | `{level:'workspace', id: workspaceId}` oder `no_parent` | `app`: Apps mit `projectId === p.id`; `deployment` (`GET /api/projects/{id}/deployments`, WorkspaceDeploymentsPage.tsx:61–88); `budget` (`GET /api/budgets`, AdminBudgetsPage.tsx:82–85); `firewall-rule` (`r.projectId`, FirewallRulesPage.tsx:472); `plugin-installation` (scopeType project); `network` (`VLANNetwork.projectId`) | status, runtime/framework (`ProjectRow.framework`) | `/projects` → redirect `/workspaces` (App.tsx:505) |
| `app` | `GET /api/deployments` → `App` (hierarchy.ts:40–51) | `{level:'project', id: projectId}` oder `no_parent` | — | `type` (AppType), `status`, `port` | `/workspaces/apps` |
| `container` | **kein eigener Endpoint** — abgeleitet aus `App.containerId` / `WorkspaceRow.containerId` | parent des Trägers | — | status des Trägers, count | Link des Trägers |
| `deployment` | `GET /api/projects/{id}/deployments` → `DeploymentRow` (WorkspaceDeploymentsPage.tsx:35–47) | `{level:'project', id: projectId}` | — | `status`, `port`, `chainId` (Kurzform) | `/workspaces/deployments` |
| `session` | `GET /api/sessions` → `SessionListRow` (use-scope-label.ts:21–26, 47–55) | `{level:'workspace', id: ws.id}` via sessionId/Container-Match (use-scope-label.ts:120–134; scope-selector.tsx:159–162) | subagent-Rohanzahl | `status` verbatim | `/workspaces` |
| `subagent` | `SubagentRow` (SubagentsPanel.tsx:32–50) | `{level:'workspace', id: workspaceId}` + `{level:'project', id: projectId}` | — | `status` (spawning/running/done/error/stopped), risk-Anhalt | `/workspaces` |
| `firewall-rule` | `GET /api/firewall/rules` → `FirewallRule` (store.tsx:22–30) | `{level:'project', id: projectId}` (optional — Regeln ohne Project sind global) | — | `granted` (verdict-artig), `port`, `protocol`, `layer` | `/security/firewall-rules` |
| `siem-event` | `GET /api/sdk/logs?type=audit` → `SIEMEvent` (store.tsx:32–40) | best-effort `{level:'workspace'\|'project', id: target}` nach `UnifiedFinding.target` (security-overview.ts:118–129) — Events ohne Ziel bleiben `global` | — | `severity`, scanner | `/security/siem` |
| `security-finding` | `GET /api/security/events` → `SecurityEventRow` (security-events.ts:10–22) | `{level:'project', id: projectId}`; container/session in `data` | — | `verdict`, `scanner`, `status` | `/security/events/:id` (echter Detail-Link, security-overview.ts:147) |
| `iac-finding` | `security_events`-Zeilen mit `eventType: 'iac_finding'`, Scanner checkov (SecurityScansPage.tsx:29–33) | `{level:'project', id: projectId}` | — | `verdict`, `scanner`, `status` (quarantine) | `/security/scans/iac` |
| `network` | `VLANNetwork` (networking.ts:21–32) + `NetworkOwnership` (network_ownership.ts) | `{level:'workspace'\|'project', id}` (beide Felder real vorhanden) | `app` via `NetworkOwnership.appId` | `category`, `driver`, `vlanId` | `/networks` bzw. `/workspaces/networks` |
| `secrets-engine` | `GET /api/secrets-engines` → `SecretsEngineRow` (VaultDashboardPage.tsx:111–125) | `scopeKind: 'global'\|'workspace'\|'control_plane'` (VaultDashboardPage.tsx:111) — `control_plane` wird v1 als `global` gerendert und in `data` verbatim mitgeführt | `secret` | `type`, flag `isDefault` | `/vault-dashboard` |
| `secret` | `/api/vault/secrets` → `VaultSecret { id, name, allowedAgents, createdAt, updatedAt }` (ProjectSecretsPage.tsx:41–47) | Engine-/Project-Kontext je Mount | — | count `allowedAgents` | `/security/secrets` |
| `budget` | `GET /api/budgets` → `ProjectBudget { projectId, userId, role, maxBudgetUSD, spentBudgetUSD, enabled }` (AdminBudgetsPage.tsx:41–49) | `{level:'project', id: projectId}` + user-Badge (`userId`) | — | `role`, `enabled`, Auslastung max/spent (echte Zahlen) | `/admin/budgets` |
| `team` | `GET /api/teams` → `Team` (TeamsPage.tsx:43–50) | `{level:'global'}` | `user` via `TeamMember` (TeamsPage.tsx:52–56) | Budget-Summen (echt), `enabled` | `/admin/teams` |
| `user` | `GET /api/users` → `KeycloakUser { id, email, displayName }` (AdminBudgetsPage.tsx:56–60, 92–95) | `{level:'global'}`; Project-Kontext via Budget-Zeilen | `budget` | `role` (aus Budget-Zeilen) | `/admin/users` |
| `plugin-installation` | `GET /api/plugin-installations` → `PluginInstallation` (plugins.ts:15–29; Route gateway.go:234) | `{level: scopeType, id: scopeId}` — `scopeType: 'workspace'\|'project'` ist ein echtes Feld | — | `authMode`, flag `activated`, `assignedFrom` | `/workspaces/settings` (Mount WorkspaceSettingsPage.tsx:222) |

**Mapping-Regeln (bindend für jeden neuen Typ):**

1. `parent` und `childScopeIds` stammen aus **realen Fremdschlüsselfeldern** der Registry — nie aus einem erfundenen Join. Gibt es kein echtes Elter-Row, heißt der Elter `no_parent`, und der Bucket erscheint nur bei Nicht-Leere (§2.1).
2. Ein Typ ohne eigenen Endpoint (Beispiel `container`) ist eine **abgeleitete** Component; sein `data` vermerkt die Quelle verbatim.
3. `security-finding`/`siem-event` mit unbekanntem Ziel bleiben `global` — ein falsch zugeordneter Filter wäre ein stiller Fake (Mandate 2; Präzedenz: der ssh-Scope filtert Firewall-Rules nicht und sagt es, FirewallRulesPage.tsx:422–424).

### 3.3 Badge-Typen und Töne

- Tone-Mapping startet als zentrale Map `OVERVIEW_BADGE_TONES: Record<BadgeTone, cssClass>` und **kopiert die existierenden Töne** (critical/amber/info aus security-overview.ts:39–45; positive/emerald aus security-events.ts:24–28) — keine neue Farbsprache.
- `kind: 'status'` zeigt Registry-Werte **verbatim** (`ws.status`, `app.status`, `session.status` — genau wie der ScopeSelector, scope-selector.tsx:71–74) ohne erfundene Übersetzungstabelle; i18n-Keys nur für die dokumentierten Enums (`severity`, `verdict`, `role`).
- Zähl-Badges (`count`) zählen **nur über echtes Store-/Query-Daten** (Muster `appsByProject`, HierarchySidebar.tsx:58–65).

### 3.4 Adapter-Registry (Zulieferung)

Analog lib/security-overview.ts (Begründung dort: eine .tsx-View darf nur Komponenten exportieren — react-refresh/only-export-components, security-overview.ts:1–5):

```ts
// lib/overview/build.ts (neu, PURE — testbar ohne DOM)
export interface OverviewContext {
  store: StoreState                              // lib/store.tsx SSOT
  extras: {
    deployments?: DeploymentRow[]                // /api/projects/{id}/deployments
    pluginInstallations?: PluginInstallation[]   // /api/plugin-installations
    secretsEngines?: SecretsEngineRow[]          // /api/secrets-engines
    budgets?: ProjectBudget[]                    // /api/budgets
    teams?: Team[]; members?: TeamMember[]       // /api/teams, /api/team-members
    users?: KeycloakUser[]                       // /api/users
    securityEvents?: SecurityEventRow[]          // /api/security/events
    sessions?: SessionListRow[]                  // /api/sessions
    subagents?: SubagentRow[]                    // SubagentsPanel-Query
  }
}

export type ComponentAdapter =
  (ctx: OverviewContext, filter: OverviewFilter) => OverviewComponent[]

/** Registry: type → Adapter. Unbekannter Typ → gar keine Karte (nicht: leere Karte). */
export const COMPONENT_ADAPTERS: Partial<Record<OverviewComponentType, ComponentAdapter>>
```

- `OverviewFilter` (§5) ist das Selection-/Scope-Prädikat; gefiltert wird **nach** dem Aufbau, damit die Build-Funktionen einzeln testbar bleiben.
- Jeder Adapter ist eine **pure** Funktion → Unit-Tests gegen abgespeicherte echte Response-Shapes (Konvention: lib/security-overview.ts als reines Helper-Modul).

### 3.5 Erweiterbarkeit

- Neuer Component-Typ = neuer Eintrag in `OverviewComponentType` + eine Tabellen-Zeile in §3.2 + ein Adapter. Grid, Multiauswahl, Navbar-Tab und Dashboard-Builder brauchen **keine** Änderung — sie konsumieren nur `OverviewComponent`.
- `overviewWidgets` macht aus jeder Component einen **Katalog-Teilnehmer**: Der Dashboard-Builder (§7) listet Widgets pro Typ, ohne die Typen zu kennen.
- `schemaVersion` + Validierung beim Laden persistierter Layouts/Dashboards: unbekannte Felder verwerfen, Ids filtern, Version migrieren (Mandate-§8-Analogie).

---

## 4. Overview-Page-Architektur

### 4.1 Route & Dateien

| Artefakt | Pfad | Anmerkung |
|---|---|---|
| Page | `src/frontend/src/views/OverviewPage.tsx` | Mandat §7: nur `src/views/*` wird geroutet |
| Grid-Renderer | `src/frontend/src/components/overview/OverviewGrid.tsx` | kapselt react-grid-layout vollständig |
| Card-Renderer | `src/frontend/src/components/overview/ComponentCard.tsx` | rendert `OverviewComponent` nach `overviewWidgets` |
| Helper | `lib/overview/build.ts`, `scope-filter.ts`, `layout.ts` | pure Module (§3.4) |
| Route | `<Route path="/overview" element={<OverviewPage />} />` in App.tsx | plus `/overview` in `WIDE_ROUTES` (App.tsx:445) — ein Dashboard-artiges Grid braucht die Breite, die App.tsx:439–445 für `/config`/`/sdk-logs` bereits begründet |
| i18n | `nav.overview` + `overview.*` in allen **60** Locale-Dateien | check-i18n (scripts/check-i18n.mjs) erzwingt Key-Parität |

Next.js-Bezug: ein neuer Pfad braucht **keinen** Next-Filesystem-Entry — der Catch-All (§2.9) mountet die SPA, das Routing läuft über App.tsx.

### 4.2 React-Grid-Layout-Integration

**Paket (Registry-Fakten, verifiziert via `npm view react-grid-layout`):**

- Version **2.2.4**, Lizenz **MIT**, eigene TypeScript-Types (`dist/index.d.ts`), homepage `https://github.com/react-grid-layout/react-grid-layout` — entspricht dem Auftrag.
- peerDependencies `react >= 16.3.0` / `react-dom >= 16.3.0` → erfüllt durch React ^19.2.4.
- Abhängigkeiten: `react-draggable ^4.4.6`, `react-resizable ^3.1.3`, `clsx`, `prop-types`, `fast-equals`, `resize-observer-polyfill`.
- Aktiv gepflegt (letzte Registry-Änderung 2026-07-29).

**Mandate-§7-Begründung (bewusst geführt, weil NEUE Dependency):**

- Was RGL liefert — Drag, Resize, **Grid-Kollisionsauflösung**, responsive Breakpoints, Layout-Serialisierung — ist kein „tiny, stable subset“, den man selbst schreibt; genau das ist der Maßstab des Mandats.
- Die im Repo vorhandene Alternative @dnd-kit liefert nur DnD-Primitives (belegt: Sortables in model-table.tsx:3–4); daraus ein Grid mit Kollision + Resize + Breakpoints zu bauen, wäre Neuerfindung eines stabilen Rades — das Gegenteil der Mandats-Absicht.
- Go-`go.mod` bleibt unberührt; es ist eine Frontend-Abhängigkeit in `src/frontend/package.json`, genau wie @dnd-kit/@xyflow.

**Integration (Vertrag; exakte Prop-Namen beim Implementieren gegen das README der installierten 2.x verifizieren):**

- **12 Spalten**, `rowHeight ≈ 24`, Breakpoints `xl/lg/md` angelehnt an PageContainer-Breiten (max-w-6xl/7xl/1600px, App.tsx:447–460). Width über ResizeObserver-Wrapper, kein statischer Wert.
- Grid-Items = **Component-Cards**: `key = component.id` (§3.1). Default-Footprints pro Widget (`defaultW/defaultH`) — Beispielanker: `ssh-target 4×3`, `workspace 3×3`, `project 3×3`, `app 2×2`, Listen (siem/finding/firewall) `6×4`.
- `onLayoutChange` → Persistenzpfad §4.4 (debounced). Cards bleiben dumb; nur der Grid-Wrapper spricht mit RGL.
- A11y: die Cards behalten ihre Button-/Link-Semantik (Präzedenz: Sidebar nutzt reine Buttons, HierarchySidebar.tsx:107–124); RGL-Drag/Resize läuft über die Grid-Handles, nicht über Card-Buttons.

### 4.3 Layout-Modes: grouped / flat

- **Umschalter**: Segmented-Control (vorhandenes `ui/segmented-control.tsx`) im PageHeader-Bereich — `grouped` | `flat`. Spezifikation: **Page-State**, Persistenz nach §4.4; der Umschalter berührt URL/Scope nicht.
- **grouped**: eine **RGL-Instanz pro Gruppe**; Gruppe = selektierter/fokussierter SSH-Target (bzw. Workspace-Gruppe bei Workspace-Auswahl), Gruppen-Header als normale React-Header **außerhalb** des Grids. Damit bleibt jede Gruppe ein eigener Kollisionsraum, und „Gruppe nur bei Inhalt“ fällt aus der Adapter-Sortierung heraus (no_parent-Regel §2.1) — Struktur statt Sonderlogik.
- **flat**: exakt eine Gruppe „Alle“ = eine RGL-Instanz über alle Karten, sortiert nach Scope-Ebene (ssh→workspace→project→app) dann Name — dieselbe Sortierlogik wie die Sidebar (HierarchySidebar.tsx:56, 65).
- Gruppierungsinformation geht in flat nicht verloren: jede Karte trägt Parent-Badges (§3.2-Spalte „parent“).
- Layouts sind **pro Mode** gespeichert (`grouped` je Gruppe-Key, `flat` als ein Layout, §4.4); der Umschalter mountet die passende Instanz neu, statt Item-Sets unter einer laufenden Instanz auszutauschen.

### 4.4 Persistenz der Layouts (Mandate §3)

Drag/Resize „looks like saving“ → Round-Trip zum PostgreSQL über die **existierende Settings-KV**:

- Backend-Pattern belegt: `GET/PUT /api/settings/{key}` (docs/API_DOCS.md:105–106), Tabelle `settings` in PostgreSQL (store.go:452 — `CREATE TABLE IF NOT EXISTS settings`; `GetSetting`/`SaveSetting` store.go:1419–1430). Frontend-Vorlage genau dieses Musters: lib/ssh-endpoints.ts (`SETTINGS_KEY = 'ssh_endpoints'`, :53; GET :97–99; PUT :115).
- Neuer Key: **`overview_layouts`**, Value (JSON):

```json
{
  "schemaVersion": 1,
  "flat":  [{ "i": "app:42", "x": 0, "y": 0, "w": 2, "h": 2 }],
  "grouped": { "<groupKey>": [{ "i": "workspace:7", "x": 0, "y": 0, "w": 3, "h": 3 }] }
}
```

- **Write**: debounced PUT (~1 s nach letztem `onLayoutChange`), Flush bei Unmount, sichtbarer Save-Zustand im Header. Transportfehler ehrlich als Inline-Meldung (Präzedenz Error-Card mit Retry, SecurityOverviewPage.tsx:272–279).
- **Read**: Shape-Validierung + **id-Filter** (Karten, deren Component nicht mehr existiert, fliegen raus), Fallback auf Default-Footprints — niemals Blind-Import (Mandate §8).
- Ehrliche Grenze, dokumentiert: die Settings-KV hat **keinen Owner** — v1 ist das Layout instanzweit (Single-Operator-Prämisse, wie sie App.tsx für `SHOW_ADMIN_NAV` dokumentiert, App.tsx:121–124). Mehrbenutzer-Persistenz kommt mit den Dashboards-Tabellen (§7.3).

### 4.5 Multiauswahl-UX auf der Page

- Datenbasis: `useGlobalSelection()` (§5) + `useSSOTStore()`; die Adapter (§3.4) bauen die Kartenmenge für die **aktuelle Auswahlgrenze**:
  - keine Selection, kein Scope → „All“: alle Targets/Workspaces (entspricht `kind: 'all'`, HierarchySidebar.tsx:184–196);
  - Selection mit n Ids → Karten aller n Scope-Teilbäume (Union);
  - keine Selection, aber Single-Scope → wie heute: die Grenze nutzt den Scope (Bridge §5.2).
- Sichtbarer Contract analog Landing-Strip: Chip-Leiste „3 Ziele ausgewählt · Prod-Node · Staging-Node“ mit X zum Aufheben (**„Never filter silently“**, landing-strip.tsx:403–420).
- Drilldown: Card-Links navigieren auf die existierenden Unterseiten (`/workspaces`, `/workspaces/apps`, …) und setzen den Scope auf das angeklickte Item — exakt das heutige Sidebar-Verhalten (HierarchySidebar.tsx:77–96). Die Auswahlgrenze selbst wird dadurch nicht still verändert.
- Leerezustände: keine Treffer unter der Grenze → ehrliche `EmptyState` (vorhandene Komponente, components/empty-state.tsx); keine leere Grid-Fläche, keine Demo-Karten (Mandate §2; Präzedenz no_parent-Bucket nur bei Inhalt).

### 4.6 Fehler & Ladezustand

- Adapter fragen mehrere Quellen; einzelne Fehler **isolieren** (react-query je Quelle, Fehler-Card je betroffenem Widget) statt die ganze Overview zu killen — Präzedenz: SecurityOverviewPage behandelt zwei Fehlerquellen getrennt (:150–159, 179–180).
- Polling: 15 s `refetchInterval` nur für Live-Feeds (siem/finding/subagent), wie SecurityOverviewPage/Landing-Strip es tunen (:153, 158, 360, 366). Kein globaler Poll.

---

## 5. Scope-Multiauswahl-Erweiterung (non-breaking)

### 5.1 Datenmodell (additiv in lib/global-scope.ts)

```ts
export type SelectionKind = 'ssh' | 'workspace'   // v1: homogene Mengen (§5.6)

/** Die Multiauswahl — parallel zum Scope, gleiches Store-Idiom. */
export interface SelectionSet {
  kind: SelectionKind
  ids: string[]          // >= 1, dedupliziert
  /** letzter Klick — was Single-Reader (§2.3) sehen */
  anchorId: string
}

export function setGlobalSelection(next: SelectionSet | null): void
export function useGlobalSelection(): { selection: SelectionSet | null; … }
```

Neuer localStorage-Key: `jimesh.global-selection` (der existierende `jimesh.global-scope` bleibt **unverändert** — selbe Begründungslogik wie dort, global-scope.ts:16–23). Validierung beim Laden analog `loadPersisted`: kind-Whitelist, `ids` als string[], ≥ 1, Dedupe; `anchorId ∉ ids` → anchor = `ids[0]`; Garbage → `null` (Test-Vorlage: global-scope.test.ts:69–76).

### 5.2 Bridge-Regeln — warum das non-breaking ist

Beide Stores leben in **einem** Modul mit **einer** internen `apply(scope, selection)`-Funktion (ein emit, kein Echo-Rekursionsrisiko):

1. **Alle existierenden Writer laufen unverändert weiter:** `setGlobalScope(s)` (Signatur unverändert, global-scope.ts:74–78) leitet die Selection ab:
   - `s === null` → Selection `null`;
   - `kind: 'ssh'` → `{ kind: 'ssh', ids: [sshEndpointId], anchorId: sshEndpointId }`;
   - `kind: 'workspace'` → `{ kind: 'workspace', ids: [workspaceId], anchorId: workspaceId }`;
   - `session`/`app`/`all` → Selection `null` (nicht multi-fähig in v1).
2. **Alle existierenden Reader sehen weiterhin einen sinnvollen Single-Scope:** `setGlobalSelection(sel)` leitet den Scope aus dem **Anker** ab — `kind` + Anker-Id (+ Workspace-/Project-Kontext aus der Registry, so wie der ScopeSelector ihn heute beim Schreiben mitliefert, scope-selector.tsx:209–258). Ergebnis: FirewallRulesPage (liest `scope?.projectId`), WorkspaceDeploymentsPage (liest `kind === 'workspace' && projectId`), SecurityLandingStrip (Kind-Switch) und useScopeLabel funktionieren **ohne eine Zeile Änderung** weiter — sie zeigen den Anker.
3. `ids.length === 1` ⇒ das System verhält sich byte-identisch zum heutigen Single-Select — das ist der Non-Breaking-Nachweis (getestet in §8).
4. Multi-Aware-Consumer (OverviewPage; optionaler Landing-Strip-Upgrade) matchen **Union über ids**: `componentMatchesSelection(c, sel)` in lib/overview/scope-filter.ts — Parent-Id in `sel.ids` (oder eine der darunterliegenden Baum-Ebenen) ⇒ sichtbar.

### 5.3 Ableiten statt Migrieren

Ein alter Stand (nur `jimesh.global-scope` gespeichert) braucht **keine** Migration: solange keine Selection persistiert ist, leitet `getGlobalSelection()` die Selection aus dem Scope ab (Regel §5.2.1) — erst `setGlobalSelection` persistiert. Damit bleibt der alte Key kompatibel, und ein Downgrade (alte Frontend-Version) verliert nichts.

### 5.4 Konsumenten-Anpassungen (minimal, explizit gelistet)

| Konsument | v1-Änderung |
|---|---|
| security-landing-strip.tsx | keine Pflicht (Anker genügt); optional: `findingMatchesScope` über Union der ids, Chip „n Ziele“ |
| FirewallRulesPage.tsx | keine Pflicht; optional: `ids.includes(r.projectId)` |
| WorkspaceDeploymentsPage.tsx | keine (Anker-Preselect bleibt) |
| use-scope-label.ts | keine (Anker) |
| scope-usage-schema.ts | `/overview`-Eintrag kommt **im selben Change** wie der konsumierende Code (§6.2) |

### 5.5 Sidebar-Multiauswahl (HierarchySidebar)

- **Gewöhnlicher Klick** bleibt exakt wie heute: `setGlobalScope(...)` + navigate (HierarchySidebar.tsx:77–96).
- **Cmd/Ctrl+Klick** auf eine Target-/Workspace-Zeile: über `setGlobalSelection` zur Auswahl hinzufügen/entfernen — **ohne Navigation**, ohne den Anker zu wechseln (Anker bleibt der letzte gewöhnliche Klick). Die Sidebar ist `hidden md:flex` (Desktop-only, :173), ein Tastatur-Modifier ist dort der übliche Mechanismus.
- Zustandsanzeige: **alle** selektierten Zeilen hervorheben (heute nur die aktive, :105/:199); Anker-Zeile zusätzlich fett. Die Active-Prüfung wechselt auf `selection.kind`/`selection.ids`, damit die Hervorhebung mit der Auswahl, nicht nur mit dem Anker stimmt.
- Chip-Leiste über dem Baum (unter „All SSH Targets“, :184–196), wenn `ids.length > 1`: je Chip Name + X; „Auswahl aufheben“ setzt `setGlobalSelection(null)`.
- Cmd/Ctrl+Klick ist nur aktiv, wo die Route die Auswahl konsumiert (v1: `/overview` — Deklaration §6.2); überall sonst fällt der Modifier-Klick auf das heutige Einzelauswahl-Verhalten zurück (kein Überraschungs-Zustand auf fremden Pages).

### 5.6 Bewusste Grenzen von v1

- **Homogene Mengen**: ssh- und workspace-Selektion nicht mischen. Begründung: Sidebar-Baum und Filtersemantik der Konsumenten (z. B. die Ebenenlogik in `findingMatchesScope`, landing-strip.tsx:336–350) sind ebenengebunden; gemischte Mengen bräuchten neue Semantik pro Konsument — Phase 2, explizit ins Backlog.
- `session`/`app`/`all` sind keine Selection-Kinds (Einzelwesen bzw. bewusster Alles-Filter).
- Cross-Device-Sync: nein (dieselbe dokumentierte localStorage-Entscheidung wie beim Scope, global-scope.ts:16–23).

---

## 6. Navbar-Overview-Tab

### 6.1 Eintrag in lib/section-nav.ts

Neue `NavGroup` an **erster Stelle** von `navGroups` (Auftrag: „oben“; die Reihenfolge ist bewusst gepflegt — E-IA-Regel lebt hier, section-nav.ts:32–41):

```ts
{
  to: '/overview',
  labelKey: 'nav.overview',
  icon: LayoutDashboard,          // Import existiert bereits (section-nav.ts:12)
  isActive: (pathname) => pathIn(pathname, ['/overview']),
  items: [
    { to: '/overview', labelKey: 'nav.overview', icon: LayoutDashboard },
    // Phase 2: { to: '/overview/dashboards', labelKey: 'nav.dashboards', … }
    // — erst mit dem Dashboard-Builder (§7), nie als toter Eintrag (Mandate 2)
  ],
}
```

- Da `navGroups` die **einzige** Quelle für Navbar-Desktop und Mobile-Dropdown ist, bekommt der Tab das mobile Verhalten gratis (App.tsx:346–401).
- „Overview“ ist eine **eigene** Gruppe — kein Item in einer vorhandenen Gruppe, weil der Tab eine Aggregationsfläche über ALLEN Gruppen ist (E-IA: „never land by convenience in the nearest group“).
- Active-State über den eigenen Matcher statt über NavLinks Partial-Match — bewusstes Muster dieser Codebase (App.tsx:127–129; section-nav.ts:130–135).

### 6.2 Sichtbarkeit & scope-usage-schema.ts

- **Sichtbar: immer** (sobald AuthGate durch ist) — die Overview ist die Aggregations-Landing. Dass die Seite den Scope/Selection **wirklich liest**, wird in scope-usage-schema.ts im **selben Change** wie der konsumierende Code deklariert (harte Regel :14–16):

```ts
{ route: '/overview', consumesScope: true,
  consumer: 'views/OverviewPage.tsx — Grid-Filter über lib/overview/scope-filter.ts (Selection/Scope)' }
```

- Damit ist auch dokumentiert, dass die Overview-Page den Scope konsumiert — kein dekorativer Selektor (das genaue Anti-Pattern, vor dem scope-usage-schema.ts:1–8 warnt).
- Der Overview-Tab selbst rendert **keinen** Scope-Selector (der gehört in die Sidebar/den Seitenkontext, §5.5); er zeigt optional einen kleinen Zähler-Badge über der aktiven Selection (`ids.length > 1`).

### 6.3 Interplay mit der Sidebar

- Die Sidebar bleibt **in-flow links** gemountet (App.tsx:476–483) — auch auf `/overview`. Die Overview ist damit die erste Seite, auf der Baum-Multiauswahl (§5.5) und Grid-Ansicht **gleichzeitig** sichtbar sind und direkt interagieren: ein Modifier-Klick in der Sidebar aktualisiert das Grid sofort (useSyncExternalStore-Update, kein Reload).
- „All SSH Targets“ (`kind: 'all'`, HierarchySidebar.tsx:184–196) hebt die Auswahlgrenze auf (`setGlobalSelection(null)` + `setGlobalScope({ kind: 'all' })`) — die Overview rendert dann „alles“.
- Keine URL/Query-Spiegelung der Selection in v1 (Selection bleibt browser-lokal wie der Scope; ein Deep-Link auf eine Auswahl wäre Phase 2 — bewusst zurückgestellt, um die localStorage-Semantik nicht still zu ändern).

### 6.4 i18n

- Neue Keys mindestens: `nav.overview`, `overview.title`, `overview.description`, `overview.mode.grouped`, `overview.mode.flat`, `overview.selection.active`, `overview.selection.clear`, `overview.empty.title`, `overview.empty.description`, `overview.layout.saved`, `overview.layout.saveError`, `overview.layout.reset`.
- **Alle 60 Locale-Dateien** pflegen (check-i18n.mjs:9–16 schlägt bei fehlenden Keys hart fehl; `npm run test` koppelt vitest + check:i18n, package.json:10). Englisch als Master; Platzhalter-Parität ({n}) wie im Validator (check-i18n.mjs:29–32, 65–79).

---

## 7. Dashboard-Builder-Skizze (Phase 2 — „leobot-artig“)

### 7.1 Zielbild

Der Operator baut **eigene benannte Dashboards**: eine Menge von Widget-Instanzen (aus dem Widget-Katalog §3.1), frei in einem RGL-Grid angeordnet, jeweils an einen Scope-Filter gebunden. Editor-Modus (Drag/Resize) und Anzeige-Modus (nur Render) derselben Renderpipeline.

### 7.2 Schema-Erweiterung (auf §3 aufsetzend)

```ts
export interface DashboardDefinition {
  schemaVersion: 1
  id: string
  name: string
  ownerId?: string                 // Phase-2-Tabelle hat einen Owner (v1-KV hat keinen, §4.4)
  layoutMode: 'flat' | 'grouped'   // identische Renderer wie §4.3
  items: DashboardItem[]
  createdAt: string
  updatedAt: string
}

export interface DashboardItem {
  id: string
  /** Query statt absolute componentId — Dashboards überleben Zeilenwechsel: */
  query: {
    type: OverviewComponentType          // Adapter-Registry (§3.4)
    widgetId: string                     // aus overviewWidgets (§3.1)
    scope: ScopeRef | { kind: 'selection' }  // fester Scope oder „folgt der Auswahl“
  }
  layout: { x: number; y: number; w: number; h: number }
  titleOverride?: string
}
```

Warum `query` statt `componentId`: eine Widget-Instanz soll „die Apps von Project X“ bedeuten, nicht „die Row, die heute zufällig id 42 trägt“. Der Renderer löst die Query zur Laufzeit über denselben Adapter auf, den die Overview nutzt — **eine** Renderpipeline, zwei Persistenzarten.

### 7.3 Persistenz & Routen (Phase 2, kein v1-Scope)

- Eigenes Store-Modul `internal/store/dashboards.go` + Tabelle `dashboards` (id, name, owner_user_id, definition JSONB, created_at, updated_at) — **nicht** die Settings-KV: Dashboards sind CRUD-Werk mit Owner und n Einträgen (Mandate §3 für echte Nutzdaten).
- Routen im Gateway (API_DOCS.md im selben Change pflegen — Mandat §1): `GET /api/dashboards`, `POST /api/dashboards`, `GET/PUT/DELETE /api/dashboards/{id}`. Validierung der Definition gegen `OVERVIEW_SCHEMA_VERSION`; Migration alter Versionen beim Schreiben, niemals beim Boot purgen (Mandate §8).
- Editor-Routen: `/overview/dashboards` (Liste) + `/overview/dashboards/:id?edit=1`.

### 7.4 Was v1 konkret vorbereiten muss

1. `OverviewComponent`/`OverviewWidgetSpec` **serialisierbar** halten (keine React-Elemente, keine Funktionen im `data`-Pfad) — sonst kann Phase 2 dasselbe Schema nicht persistieren.
2. Die Adapter-Registry (§3.4) als **einzigen** Karten-Builder etablieren; OverviewPage und der spätere Dashboard-Renderer rufen dieselbe Funktion.
3. `OverviewGrid.tsx` so kapseln, dass „Item-Menge + Layout + Mode“ parametrisierbar sind (Overview übergibt Adapter-Ergebnis; Dashboard übergibt `DashboardItem[]`).
4. Widget-Katalog ausbauen: jede §3.2-Zeile bekommt mindestens ein `status`- und ein `list`-Widget.
5. Layout-Persistenz (§4.4) und Dashboard-Persistenz (§7.3) teilen die RGL-Layout-Serialisierung (`lib/overview/layout.ts`).

---

## 8. Test- & Verifikationsplan

| Prüfung | Wie | Vorlage |
|---|---|---|
| Selection-Bridge (Non-Breaking-Nachweis) | vitest/jsdom `freshModule`-Muster: set scope → selection abgeleitet; set selection → scope-Anker abgeleitet; `ids.length === 1` ⇒ identisches Verhalten; Persistenz-Roundtrip + Garbage | lib/global-scope.test.ts:15–18, 29–76 |
| scope-filter Union-Semantik | pure Tests über `componentMatchesSelection` (ssh-Menge matcht workspaces/projects; workspace-Menge matcht ihre Apps) | scope-usage-schema.test.ts (Matcher-Tests) |
| Adapter | je Adapter: echte Response-Shape-Fixtures → erwartete `OverviewComponent[]` (inkl. no_parent-Bucket nur bei Nicht-Leere) | security-overview.ts als pure-Helper-Vorlage |
| scope-usage-schema | `scopeSelectorVisibleFor('/overview') === true`; Sub-Pfade hidden, bis deklariert | scope-usage-schema.test.ts:11–40 |
| i18n | `npm run check:i18n` (60 Locales, Key-Parität) | scripts/check-i18n.mjs |
| Lint/Typen | `npm run lint`; `tsc --noEmit -p tsconfig.app.json` (Mandat-§6-Praxis) | — |
| Smoke | `/overview` manuell: leere Registries → ehrlicher EmptyState; Layout-Drag → `GET/PUT /api/settings/overview_layouts` im Netzwerk-Tab sichtbar | Devtools/curl, Mandate §6 |
| Grid-Dep | bei Implementierung: `npm view react-grid-layout` gegen die verbaute Version (§4.2-Fakten neu prüfen) + `tsc --noEmit` für die Types | §2.9 |

---

## 9. Offene Punkte & bewusste Nicht-Ziele

1. **Mixed-Kind-Selektion** (ssh + workspace gleichzeitig) — Phase 2; die Semantik pro Konsument müsste neu definiert werden (§5.6).
2. **Selection als URL-State** (?scope=) — bewusst zurückgestellt (§6.3).
3. **Landing-Strip/FirewallRulesPage auf Union umstellen** — optionaler Folgeschritt (§5.4), keine v1-Pflicht.
4. **Stale Mount-Referenzen aufräumen**: ScopeSelector-Kommentare (scope-selector.tsx:26–28) und der Rail-Kommentar in SecurityLayout.tsx:8–16 veralten mit dem entfallenen SectionRail — Aufräumen, sobald die Multi-Auswahl den Selector neu mountet.
5. **IaC-File als eigenständige Registry** existiert nicht — IaC ist heute der `security_events`-Stream (iac_finding, SecurityScansPage.tsx:29–33). Ein echtes IaC-File-Modell wäre ein Backend-Feature, kein Frontend-Schema-Problem; das Schema landet als `iac-finding` (§3.2).
6. **Per-Owner-Layouts** in der Settings-KV — ohne Owner-Spalte nicht möglich (§4.4); Phase 2 über die Dashboards-Tabelle.
7. **Command-Palette-Anbindung** (components/command-palette.tsx, in App.tsx:625 gemountet) — „Overview öffnen“ als Komfort-Follow-up, kein v1-Blocker.
8. **RGL-Prop-Detailverifikation** — der Integrationsvertrag in §4.2 ist bewusst eigenschaftsarm formuliert; exakte Prop-Namen gegen das README der installierten 2.x prüfen (§8, letzte Zeile).