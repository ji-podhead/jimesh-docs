# Multi-Scope-Konzept: 3 Wege (21.9.2026)

**Operator-Präzisierung** — wie Multi-Selection im Dashboard funktioniert,
JEDEM Component den richtigen Weg zuordnen. Erweitert ARCHITECTURE.md §8.

## Das Konzept

Wenn der Scope-Selector MEHRERE Server oder MEHRERE Projects ausgewählt hat,
muss jedes UI wissen, welcher der DREI Wege für seine Daten passt:

### Weg 1: MULTI-ACTION (Aktion auf mehrere Ziele)
**Wann:** Der User ERSTELLT oder VERÄNDERT etwas — Deploy, Plugin-Install,
Network-Erstellung, Scan starten.
**Wie:** Das Erstell-Dialog zeigt Multi-Select (Server/Projects/Workspaces),
die Aktion läuft SERIAL gegen alle Ausgewählten. Die Overview-Page selbst
bleibt EIN-sichtig — sie zeigt nachher was existiert.
**Beispiel:** "Deploy App" → wähle 3 Server → Deploy läuft 3× serial →
die Deployment-Liste zeigt alle 3.

### Weg 2: MULTI-VIEW GROUPED (Übersicht pro Server gruppiert)
**Wann:** Der User SIEHT Daten die PRO SERVER entstehen — Security Events,
Monitoring, SIEM, Network-Zustand. Diese Daten existieren UNABHÄNGIG
voneinander auf jedem Server.
**Wie:** Die Overview-Page zeigt die AGGREGIERTEN Kennzahlen oben
(z.B. "Critical: 3"), darunter sind die Daten PER SERVER gruppiert —
jede Server-Gruppe aufklappbar oder als Tab/Dropdown. Man sieht
sofort WELCHER Server das Problem hat.
**Beispiel:** "Security Events" → Multi-Select 3 Server → Header zeigt
"Critical: 3" (aggregiert) → darunter 3 aufklappbare Server-Sektionen
mit je ihren Events.

### Weg 3: MULTI-VIEW AGGREGATED (eine Liste über alle)
**Wann:** Der User sieht Daten die SERVER-ÜBERGREIFEND gleichartig sind —
Deployments, Tasks, Apps. Der Server ist ein Attribut, nicht die Gruppierung.
**Wie:** Eine flache Liste über alle ausgewählten Server, mit Server als
Filterbare-Spalte oder Tag. Gruppierung nach Server ist NICHT nötig.
**Beispiel:** "Deployments" → Multi-Select 3 Server → eine Liste aller
Deployments mit Server-Tag in jeder Row, sortierbar/filterbar.

## Komponenten-Zuordnung (alle Views)

| View / Page | Weg | Begründung |
|---|---|---|
| **OverviewPage** | 2 (Grouped) | Die Startseite muss sofort zeigen: welcher Server hat Probleme / läuft gut — pro Server gruppierte Cards |
| **AppDetailPage** | — (Single) | Apps sind per-Workspace; kein Multi nötig |
| **AppDiscoveryPage** | 1 (Multi-Action) | "Discover Apps" scannt einen Server; Multi = serial scannen |
| **WorkspaceDeploymentsPage** | 3 (Aggregated) | Deployment-Liste über alle Server, Server als Column |
| **DeploymentDetailPage** | — (Single) | Ein Deployment ist einzigartig |
| **SecurityEventsPage** | 2 (Grouped) | "Critical: 3, Warning: 7" aggregiert, darunter pro Server aufklappbar |
| **SecurityOverviewPage** | 2 (Grouped) | Security-Posture pro Server |
| **SecurityExposurePage** | 2 (Grouped) | Ports/Firewall pro Server |
| **SecurityFindingsPage** | 2 (Grouped) | Findings pro Server |
| **SecurityScansPage / SAST / DAST** | 1 (Multi-Action) | Scan auf mehreren Projects serial starten |
| **SIEMEventsPage** | 2 (Grouped) | SIEM-Ereignisse pro Server |
| **FirewallRulesPage** | 2 (Grouped) | iptables-Regeln pro Server |
| **FirewallTrafficLogPage** | 2 (Grouped) | Traffic-Logs pro Server |
| **NetworksPage** | 2 (Grouped) | Netzwerk-Zustand pro Server |
| **NetworkEditingPage** | 1 (Multi-Action) | VLAN-Zuweisung serial auf mehrere Projects |
| **BackupsPage** | 2 (Grouped) | Backup-Status pro Server |
| **AgentsPage** | 3 (Aggregated) | Agent-Liste mit Server-Tag |
| **AgentSessionDetailPage** | — (Single) | Eine Session |
| **PluginCatalogPage** | 1 (Multi-Action) | "Plugin in mehrere Workspaces installieren" — serial |
| **PluginSettingsPage** | 2 (Grouped) | Plugin-Konfiguration pro Workspace |
| **VaultDashboardPage** | 3 (Aggregated) | Secrets über alle Projects, Project als Column |
| **ProjectSecretsPage** | 2 (Grouped) | Project-Secrets + User-Extra pro Project |
| **KeysPage** | — (Single) | LLM-Provider-Keys sind global |
| **NotificationCenterPage** | 3 (Aggregated) | Alle Notifications flach, Server/Project als Tag |
| **AnalyticsPage** | 3 (Aggregated) | LLM-Routing-Statistiken aggregiert |
| **SDKLogsPage** | 3 (Aggregated) | Log-Flut mit Filter |
| **TracesPage** | — (Single) | Bis Backend gebaut ist: ehrlicher Placeholder |

## Implementation-Muster

### Weg 1 (Multi-Action) im Code:
```tsx
// DeployDialog: Multi-Select der Server
const [selectedServers, setSelectedServers] = useState<string[]>([])
// Beim Submit: serial gegen alle
for (const server of selectedServers) {
  await apiFetch('/api/workspaces/deploy', { method: 'POST', body: JSON.stringify({ ...deployBody, nodeHost: server }) })
}
```

### Weg 2 (Multi-View Grouped) im Code:
```tsx
// Page zeigt aggregierten Header + Server-Sektionen
const { scope } = useGlobalScope() // { selectedServers: string[] }
const { data: allEvents } = useQuery(...) // alle Events
const eventsByServer = useMemo(() => {
  const map = new Map<string, Event[]>()
  for (const ev of allEvents) {
    const list = map.get(ev.server) ?? []
    list.push(ev)
    map.set(ev.server, list)
  }
  return map
}, [allEvents])
// Render: Summary (Critical: N) + pro Server eine Sektion
```

### Weg 3 (Multi-View Aggregated) im Code:
```tsx
// Eine flache Liste mit Server als Column/Tag
const { data: allDeployments } = useQuery(...) // alle
// Render: <DataTable columns={[..., { id: 'server', header: 'Server' }]} data={allDeployments} />
```

## Global-Scope Store (Erweiterung)

`lib/global-scope.ts` muss von Single auf Multi erweitert werden:
```ts
interface Scope {
  // SINGLE (abwärtskompatibel — bestehende Pages funktionieren weiter)
  projectId?: string
  workspaceId?: string
  sshEndpointId?: string
  // MULTI (neu)
  selectedServerIds: string[]   // leer = alle
  selectedProjectIds: string[] // leer = alle
  selectedWorkspaceIds: string[] // leer = alle des Scopes
  layoutMode: 'by-server' | 'by-project' | 'all'
}
```

Pages die nur Single kennen (bestehende) nutzen weiterhin `scope.projectId`.
Pages die Multi können nutzen `scope.selectedProjectIds`.
Beide koexistieren — kein Breaking-Change.
