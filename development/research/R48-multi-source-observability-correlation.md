# R48 — Multi-Source Observability & Dashboard Correlation Architecture

**Datum:** 26. Oktober 2026  
**Status:** DRAFT / IN REVIEW  
**Autoren:** JiMesh Core Team & Platform Security Architecture  
**Bezug:** `issues.md`, `openreplay_opensearch.md`, `outbound_dlp.md`, `ip-tracking.md`, `SPRINT-174`, `SPRINT-194`, `SPRINT-200`  
**Operator-Leitmotiv (verbatim):**  
> „das muss auch sein eigenes research doc und sprint werden: wie lösen wir dsa problem von verschiedenen datenquellen, eigene dashboards von uns und sachen wie openreplay npm package? dann bitte alles planen und dann mit subagents machen aber erstmal sprints schrieben nd backlog updaten auch die issues refernzieren und meine prompts. und fix dan auch das was noch von vorhin offen ist“

---

## 1. Problemstellung: Die Diskrepanz heterogener Datenquellen

In der JiMesh-Plattform existieren aktuell vier eigenständige, technologisch grundverschiedene Observability- und UI-Säulen:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 JiMesh Observability Surface                                   │
├────────────────────┬────────────────────┬─────────────────────────────┬────────────────────────┤
│ 1. Eigene Widgets  │ 2. OpenSearch      │ 3. Grafana                  │ 4. OpenReplay          │
│ (Custom React/SVG) │ (Dashboards/SIEM)  │ (Prometheus/Loki Webviews)  │ (DOM/DevTools Tracker) │
├────────────────────┼────────────────────┼─────────────────────────────┼────────────────────────┤
│ • Topology Graph   │ • Wazuh Alerts     │ • CPU / RAM / IOPS          │ • DOM Mutation Stream  │
│ • Container Trays  │ • Falco Syscalls   │ • cgroup / host metrics     │ • DevTools Network     │
│ • Firewall Grants  │ • Suricata eve.log │ • Tailscale WireGuard thp   │ • Redux/UI Actions     │
│ • eBPF Jailer Page │ • SDK Audit Logs   │ • Pre-built Network Panels  │ • Visual Session Player│
└────────────────────┴────────────────────┴─────────────────────────────┴────────────────────────┘
```

### Die Kernprobleme in der Praxis:
1. **Disjunkte Zeitachsen (Time-Drift & Window Mismatch):**  
   Wenn ein Operator in einem Custom-Widget (z. B. Suricata Anomaly Strip) ein verdächtiges Zeitfenster `14:23:10 – 14:24:00` anklickt, liefen OpenSearch, Grafana und OpenReplay bisher auf ihren eigenen, statischen Timers (z. B. `now-15m`). Ein synchroner "Time-Travel" existierte nicht.
2. **Isolierte Filter & Selektoren (Siloed Context):**  
   Ein Klick auf eine verdächtige Quell-IP in der Firewall-Log-Tabelle filterte nicht automatisch die Grafana-Bandbreitengraphen oder die OpenSearch-Sigma-Rules für dieselbe IP.
3. **Multi-Tenant Scoping & Token-Handoff:**  
   JiMesh erzwingt Zero-Trust über `X-Workspace-Scope` und kurzlebige JWT-Tokens. Externe Webviews (Grafana/OpenSearch) und das `@openreplay/tracker`-NPM-Package müssen diesen Scope zwingend erben, ohne dass Passwörter oder Master-Keys im Browser exponiert werden.
4. **Fehlende User- & Prozess-Attribution:**  
   Suricata sieht nur Layer-3/4-Pakete (`100.127.129.65 -> 198.51.100.2`), Falco sieht Syscalls (`read /etc/passwd pid 4102`), OpenReplay sieht DOM-Klicks (`User clicked button#export`). Es fehlte der gemeinsame semantische Klebstoff.

---

## 2. Architekturmodell: Der JiMesh Timeline & Scope Observer (JTSO)

Um das Problem ohne schwerfälligen Rewrite der Subsysteme zu lösen, führen wir eine **hybride Event-Bus- und Bridge-Architektur** ein:

```
                       ┌──────────────────────────────────────────────┐
                       │           GlobalScope & TimeRange Context    │
                       │           (React useTimelineSync Hook)       │
                       └──────────────────────┬───────────────────────┘
                                              │
                   ┌──────────────────────────┴──────────────────────────┐
                   ▼                                                     ▼
     ┌───────────────────────────┐                         ┌───────────────────────────┐
     │ In-App React Widgets      │                         │ Embedded Webview Panels   │
     │ (SessionReplay, Firewall, │                         │ (Grafana, OpenSearch)     │
     │  Geomap, Container-Trays) │                         │                           │
     └─────────────┬─────────────┘                         └─────────────┬─────────────┘
                   │                                                     │
                   │ window.dispatchCustomEvent                          │ window.postMessage
                   ▼                                                     ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                            Unified Observability Gateway (/api/obs)                          │
├──────────────────────────┬───────────────────────────┬───────────────────────────────────────┤
│ OpenSearch Proxy Engine  │ OpenReplay Tracker Bridge │ Grafana Query Proxy                   │
│ • k-NN Semantic Vectors  │ • @openreplay/tracker npm │ • Prometheus Scrape Sync              │
│ • Sigma Correlation      │ • metadata: session_id,   │ • scoped org_id / datasource          │
│ • eve.json & falco index │   workspace_id, user_id   │ • dashboard parameter injection       │
└──────────────────────────┴───────────────────────────┴───────────────────────────────────────┘
```

### 2.1. Das Unified Event Schema (`JiMeshCorrelatedEvent`)

Jedes Ereignis aus allen vier Quellen wird im Frontend über ein standardisiertes TypeScript-Interface typisiert:

```typescript
export interface JiMeshCorrelatedEvent {
  id: string;
  tsUnixMs: number;
  source: 'suricata' | 'falco' | 'openreplay' | 'opensearch' | 'grafana' | 'user';
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  
  // Scoping & Attribution
  projectId: string;
  workspaceId: string;
  userId?: string;
  sessionId?: string;
  containerId?: string;
  
  // Network & Geo Context
  sourceIp?: string;
  destinationIp?: string;
  countryCode?: string;
  asn?: number;
  
  // Security & Mitre Correlation
  mitreTactic?: string;     // e.g. "TA0010" (Exfiltration)
  mitreTechnique?: string;  // e.g. "T1048" (Alternative Protocol)
  ruleName?: string;
  
  // Payload & Links
  summary: string;
  rawPayload?: Record<string, unknown>;
  deepLink?: string;        // URL to jump directly to detailed view
}
```

---

## 3. Die Einbindung des OpenReplay NPM-Packages (`@openreplay/tracker`)

### 3.1. Client-Side Tracking ohne Datenschutzverletzung
Das `@openreplay/tracker`-Package wird in JiMesh-Anwendungen und internen Agent-Frontends mit strikter Maskierung betrieben:

```typescript
import Tracker from '@openreplay/tracker';

export const tracker = new Tracker({
  projectKey: process.env.NEXT_PUBLIC_OPENREPLAY_PROJECT_KEY,
  ingestPoint: '/api/openreplay/ingest', // Proxied via Traefik Gateway
  obscureTextNumbers: true,              // DSGVO / PII Protection
  obscureInputEmails: true,
  maskInputOptions: {
    password: true,
    creditCard: true,
  },
  network: {
    sessionTokenHeader: 'X-JiMesh-Session',
    failuresOnly: false,
    ignoreHeaders: ['Authorization', 'Cookie', 'X-CSRF-Token'],
  },
});
```

### 3.2. Session-Attribution und Agent-Tagging
Sobald ein Benutzer oder ein Agent eine Session im Workspace startet, werden Metadaten synchron verknüpft:

```typescript
tracker.setUserID(currentUser.id);
tracker.setMetadata('project_id', currentScope.projectId);
tracker.setMetadata('workspace_id', currentScope.workspaceId);
tracker.setMetadata('workspace_name', currentScope.workspaceName);
tracker.setMetadata('user_role', currentUser.role);
tracker.setMetadata('agent_id', activeAgentId ?? 'human');
tracker.setMetadata('ip_lease', currentVpnIp);
```

Wenn ein Outbound DLP Alert oder Falco Syscall Alert feuert, triggert das Backend ein Custom Event in den OpenReplay Replay Stream:
```typescript
tracker.event('sec_threat_alert', {
  mitre_tactic: 'TA0010',
  technique: 'T1567',
  source_ip: event.sourceIp,
  message: 'Outbound Exfiltration detected by Suricata eBPF',
});
```

---

## 4. Synchronisation mit OpenSearch & Grafana

### 4.1. Bidirektionale `postMessage`-Kommunikation mit Embedded Iframes
Grafana- und OpenSearch-Dashboards werden über isolierte Iframes eingebunden (`WebviewPanelCard`). Um Filter synchron zu halten:

1. **Dashboard -> Parent:**
   Wenn der Benutzer im OpenSearch Dashboard auf einen Log-Cluster klickt, sendet ein Bridge-Script im OpenSearch Base-Path ein `postMessage`:
   ```javascript
   window.parent.postMessage({
     type: 'JIMESH_TIME_RANGE_CHANGE',
     from: 1729930000000,
     to: 1729930900000,
     filterIp: '100.127.129.65'
   }, window.location.origin);
   ```

2. **Parent -> Dashboard:**
   Wenn der Benutzer in unserem Replay-Player den Time-Slider bewegt oder eine Quell-IP selektiert, broadcastet der Parent an alle aktiven Iframes:
   ```javascript
   iframe.contentWindow.postMessage({
     type: 'SET_TIME_RANGE',
     from: currentTimestamp - 30000,
     to: currentTimestamp + 30000,
   }, '*');
   ```

### 4.2. Token- und Scope-Forwarding
- **Grafana:** Erhält Anfragen über `/embed/grafana` mit `X-Forwarded-User` und `X-Workspace-Scope`. Ein Grafana Auth-Proxy Plugin liest diese Header und beschränkt Datenquellen automatisch auf das Subnetz des Projekts (`proj-<id>-vlan`).
- **OpenSearch:** Der Reverse Proxy injiziert DLS/FLS (Document & Field Level Security) Queries:
  ```json
  {
    "term": { "project_id.keyword": "proj-e884bb1d33219913" }
  }
  ```

---

## 5. Korrelation mit Outbound DLP (MITRE TA0010), Falco & IP Tracking

### Die Reaktions- und Visualisierungskette:
1. **Suricata:** Erkennt einen verdächtigen Datenabfluss (HTTP POST mit 50 MB Payload an externe IP `198.51.100.42` über Port 443).
2. **Falco (eBPF Kernel Watcher):** Stellt im selben Zeitfenster fest, dass `curl` im Container `utility-proj-e884bb1d` von Prozess-ID 8922 ausgeführt wurde.
3. **IP Tracking Engine:** Gleicht `198.51.100.42` mit der Geo-Datenbank und Headscale DNS ab. Erkennt: Fremde IP, Datacenter Hosting Flag aktiv, Risikoscore 88/100.
4. **OpenReplay:** Verknüpft die Session des Entwicklers oder des AI-Agents. Im Cockpit (`SessionReplayPage.tsx`) erscheint auf der Timeline ein roter Anomaly Marker `MITRE TA0010: Exfiltration Over Web Service (T1567)`.
5. **Operator-Aktion:** Der Operator klickt auf den Marker:
   - Der DOM-Player springt exakt zu Sekunde 01:24.
   - Der OpenSearch Log Drawer öffnet sich mit dem gefilterten `falco-alerts-*` und `eve.json` Log.
   - Der Operator sieht den genauen Bash-Befehl und kann per 1-Click den Container isolieren oder den Keycloak-User sperren.

---

## 6. Realisierungsphasen (Sprints S195–S200)

| Sprint | Fokus | Kernlieferung |
|---|---|---|
| **S195** | Workspace Hierarchie & Teams | Projekt -> Workspace -> Owner -> Teams -> Users/Agents; Lesbare Namen `<project>-workspace`; Team-Erstellung im Dialog; Beseitigung "Shared Workspace"; Utility Auto-Start. |
| **S196** | Deployments & Runtime-Spec | gVisor microVM (`runsc`) vs K8s Definition; Custom Node Namespaces; Default Utility Network vs VLANs; Docker Compose / Pods Mapping. |
| **S197** | Network Scoping & Overview | `scope` als Prop; Workspace Overview Network-Card; Dual View (Global vs Scoped mit ausgeblendetem Selektor); VLAN-Tagging in Suricata. |
| **S198** | Outbound DLP (MITRE TA0010) & Falco | Exfiltration Rules (T1048, T1567, T1052); AI Data Egress Filter; Presidio PII Engine + OpenSearch k-NN Vektorsuche; Falco Syscall Alerting. |
| **S199** | IP Tracking & Geo-Fencing & SIEM | Interaktive GeoMap in Networking; Historische IP-Leases; Headscale DNS Sync; User-Flagging & Tagging; Adaptive MFA Trigger (Keycloak Step-Up). |
| **S200** | Multi-Source Observability Cockpit | JTSO Event-Bus; OpenReplay Tracker NPM Integration; Bidirektionale Sync-Bridge für Grafana & OpenSearch Dashboards. |

---

## 7. Fazit & Handlungsanweisung

Durch die Entkopplung der Dateninfrastruktur (OpenSearch als zentrales SIEM, Prometheus/Grafana für Metriken, OpenReplay für DOM-Streaming) bei gleichzeitiger browserseitiger Vereinheitlichung über den **Timeline & Scope Observer** wird das Multi-Source-Problem elegant gelöst:
- Kein Duplizieren von Daten.
- Keine proprietäre Neuerfindung bewährter Logging-Engines.
- Volle visuelle Synchronisation in Millisekunden über native Web-Standards (`CustomEvent`, `postMessage`).
