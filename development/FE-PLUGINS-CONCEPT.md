# FE-PLUGINS-CONCEPT — Apps, Deployments, Interfaces & Plugins

**Status:** Spezifikations-Entwurf (Konzept-Forschung, KEIN Code geändert)
**Auftrag:** Domänenmodell „Apps vs. Deployments vs. Interfaces (Plugins)“ — UI- und API-Konzept inkl. Sidebar-Integration, Tab-Switch, iframe-Einbettung und Migrations-Plan.
**Verwandt:** `docs/FE-IA-SPEC.md` (IA, Scope, Hierarchy-Sidebar), `MANDATES.md` §8 (Migration), §12 (Port-Binding), §13 „Domain Hierarchy“ (4-Tier-Modell), `docs/API_DOCS.md` (Routen).

---

## 0. Zusammenfassung (Executive Summary)

1. **Die heutige Verwirrung ist real und liegt im Datenmodell begründet:** Der SSOT-Store lädt „Apps“ (Tier 3 der Hierarchie) **direkt aus `GET /api/deployments`** (`src/frontend/src/lib/store.tsx:82-86`, queryKey `deployments`, TASK-086). Deployment-Rows *sind* im Frontend die Apps — gleichzeitig zeigt der Deployments-Tab dieselben Rows als „Deployments“ (`WorkspaceDeploymentsPage.tsx`). Zwei Wörter, ein Objekt.
2. **Der Operator-Gedanke ist korrekt, aber der Name „Plugin“ ist bereits vergeben:** TASK-103 hat `GET /api/plugins` + `/api/plugin-installations` und `types/domain/plugins.ts` (Auth-Integrations-Plugins: Jules, Linear, GitHub App — `src/backend/internal/gateway/plugins.go:7-41`). Ein zweites, inkompatibles „Plugin“-Konzept würde die Verwirrung verdreifachen. **Empfehlung:** Domänenbegriff **Interface** (Backend/Datenmodell), UI-Label **„Plugin“** für die Badge-/Launcher-Sicht — und TASK-103 wird zu „Integration“ umbenannt (klein, siehe §2.2).
3. **Zentrale Backend-Lücke:** Der Deploy-Pfad erzeugt **niemals** `deployments`-Rows (`internal/deploy/projects_ssh.go` persistiert die allokierten Ports in der *projects*-Row, Z. 2083-2103 + 2141-2143; `CreateDeployment` existiert nur hinter `POST /api/projects/{id}/deployments`, das **kein Frontend aufruft**). Der Deployments-Tab zeigt daher heute nur manuell angelegte Rows — die Interfaces (Web/VNC/VS Code/Shell) existieren nur als *abgeleitete Frontend-Raterei* (`ProjectsPage.tsx`: `framework.includes('opencode')`).
4. **Soll-Modell:** `App` (logisch, Tier 3) → `Deployment` (Container-Instanz auf einem SSH-Target) → `Interface` (ein konkretes Web-/VNC-/Terminal-Surface mit Port + Access-Pfad) → `Plugin` (UI-Wrapper/Badge über einem Interface). Alle vier Begriffe werden als Typen fixiert (§3.2), das Backend bekommt einen deklarativen Interface-Record statt Frontend-Geraten (§7).

---

## 1. Ist-Analyse (Belege)

### 1.1 Backend — Deploy-Pfad und Deployment-Store

**DeployRequest (`src/backend/internal/deploy/projects_ssh.go:16-159`):**
- `Framework` (`json:"framework"`, Z. 26): `dsh, opencode, claude-code, gemini-cli, code-server, dsh_code_server, opencode_code_server, claude-code_code_server, gemini-cli_code_server, jimesh` — der Kommentar im Code nennt exakt diese Liste.
- Ports: `Port` (App-Port), `VncPort`, `CodeServerPort` (Z. 28-30); zusätzlich `VncType` (`'neko'|'novnc'`, Z. 112).
- TASK-030: Shell-Frameworks `dsh, opencode, claude-code, gemini-cli (+ _code_server)` bekommen das Container-Tag `'shell'` (`isShellFramework`, Z. 319-332). Die Response-Doku im Code (Z. 2281-2295) stellt klar: *„Shell access (tag 'shell'): reach this deployment either via the SSH tunnel + `docker exec` … or — only if a graphical VNC session is actually running for this framework (currently just opencode's noVNC desktop) — via the loopbound noVNC port … allocatedVncPort is still allocated/reported for every shell framework for uniformity, even when nothing listens on it.“*
- Der Deploy-Response meldet die Port-Realität als `allocatedPort`, `allocatedVncPort`, `allocatedVSCodePort` (Z. 2083-2103: Parsing aus dem Bash-Output; Z. 2357-2366: `response` mit `allocatedPort/allocatedVncPort/allocatedVSCodePort/codeServerPassword/volume/notice/securityNotes` plus `tags`/`shellAccess`).
- **Kernpunkt:** Diese allokierten Ports landen in der **projects-Row** (Z. 2141-2143 `Port/allocatedVncPort/allocatedVSCodePort` → Update-Pfad) — **nicht** in der `deployments`-Tabelle.

**Deployment-Store (`src/backend/internal/store/deployments.go:6-18`):**

```go
type DeploymentRow struct {
    ID, ProjectID, Name, Type, RemotePath string
    Port int; ConfigPath, Status, ChainID string
    AutoProvision bool; CreatedAt string
}
```

- DDL (`store/store.go:327-339`): `type TEXT DEFAULT 'custom'`, `status TEXT DEFAULT 'stopped'`, `chain_id`, `auto_provision`. **Keine Framework-Referenz, keine Interface-/VNC-/CodeServer-Felder, kein `workspace_id`** (im Gegensatz zu `containers.workspace_id`, Z. 318-322).
- `GET /api/deployments` = `ListAllDeployments` (`deploy/deploy.go:77-101`, TASK-086: „the SSOT store's apps feed consumed this route long before it existed“ — API_DOCS.md Z. 1043).
- `GET/POST /api/projects/{id}/deployments`, `GET/PUT/DELETE …/{depId}`, `POST …/{depId}/redeploy` (setzt nur `status='building'`, `deploy/deployments.go:100-120`). **POST hat keinen Frontend-Consumer** (grep über `src/frontend/src`: nur GET-Aufrufe in `DeploymentsDialog.tsx:52`, `WorkspaceDeploymentsPage.tsx:85`, `SecurityExposurePage.tsx:317`).

### 1.2 Frontend — drei parallele „App/Deployment“-Welten

**a) SSOT-Hierarchie (`lib/store.tsx` + `types/domain/hierarchy.ts`):**
- 4-Tier-Modelle: `SSHTarget → Workspace → Project → App` (`hierarchy.ts:5-9`; MANDATES §13). `App` hat `type: 'website'|'api'|'service'|'tool'|'database'`, `port`, `status`, `containerId?` (`hierarchy.ts:10-37`).
- **Die Apps werden aus `GET /api/deployments` geladen:** `queryFn: apiFetch('/api/deployments').then(listFrom<App>(d, 'deployments'))` mit queryKey `deployments` (TASK-086-Kommentar). D. h. `DeploymentRow` muss strukturell auf `App` passen — `type` (`'custom'`) passt aber auf keinen `AppType`, `name` ist frei, `projectId` ist Text. Das Mapping ist heute „kompatibel per Feld-Namensgleichheit“, nicht per Semantik.
- `HierarchySidebar.tsx` baut daraus die 3-sichtbare-Ebenen-Navigation (Workspace kollabiert in das Target-Mapping, Z. 18-21, 33-46); Klick auf eine App navigiert zu `/workspaces/apps` (Z. 84-89) und setzt den globalen Scope; die App-Zeile zeigt `:{port}` (Z. 137).
- `portLookupTable` aggregiert Ports nach oben (PortAggregationLookup, `store.tsx` + `hierarchy.ts:38-46`) — konsistent mit MANDATES §13 („Ports … aggregate upwards“).

**b) Container-Welt (`WorkspaceAppsPage.tsx`, `workspace-apps-dropdown.tsx`):**
- TASK-053: der „Apps“-Tab zeigt **Container** — attribuiert über `containers.workspace_id` und Discovery (`GET /api/discovery`); Matching per Namens-Prefix `jimesh-framework-<wsId>-<runID>` / `jimesh-codeserver-<wsId>-<runID>` (`workspace-apps-dropdown.tsx:10-19, 40-48`). Ehrlich leer ohne Scan („ports unknown“, Mandat 2).

**c) Playground/Projekt-Welt (`ProjectsPage.tsx`):**
- `activePaneTab: 'iframe' | 'vscode' | 'terminal'` (Z. 171) — der Interface-Switch existiert **schon**, heißt aber nicht so.
- `iframeUrl` (Z. 678-697): lokal `http://<host>:<port|vncPort|codeServerPort>`, remote `/api/projects/{id}/tunnel/<port>?token=…` (Route: `deploy.go:67`, API_DOCS Z. 685). **Die Interface-Auswahl wird per `framework.includes('opencode')` bzw. Framework-Switch geraten** — kein deklaratives Backend-Feld.
- `hasVSCode` (Z. 698): `code-server` + alle `*_code_server`-Varianten; `isShellOnlyFramework` (Z. 700-704): `claude-code`, `gemini-cli` (+ `_code_server`) → „Shell-only framework — no web UI“-Empty-State (Z. 874-886) mit `docker exec`-Hinweis.
- iframes (Z. 888-907, 908-923): `sandbox='allow-scripts allow-same-origin allow-popups allow-forms'`, `loading='lazy'`, Auth-Parameter `?token=<jimesh_dashboard_token>`.
- `ProjectExplorerSidebar.tsx`: Projekt-Zeilen mit Framework-Kürzeln (`DSH + VS`, `Code + VS`, `VS Code`, Z. 158-170), Hover-Button „View deployments“ (Layers-Icon, Z. 172-181), leere Nodes: „No deployments yet.“ (Z. 210).

**d) Deployments-Tab (`WorkspaceDeploymentsPage.tsx` + `DeploymentsDialog.tsx`):**
- Tab „Deployments“ (`de.json:2187` — pageTitle „Deployments“, Top-Nav-Eintrag `nav.workspaceDeployments`, `section-nav.ts:99`): DeploymentRows-Tabelle (Name/Typ/Port/Status/Erstellt) + Redeploy-Button (setzt nur `building`) + statischer „Projekt-Ports“-Chip aus der projects-Row (App/noVNC/VS Code, Z. 130-146).
- `DeploymentsDialog` (per Projekt, von `ProjectExplorerSidebar` geöffnet): Port-Chips „App {port} · noVNC {vncPort} · VS Code {codeServerPort}“ (Z. 77-90) — **dieser Chip ist faktisch die heutige Interfaces-Liste**, abgeleitet aus der projects-Row.

### 1.3 Präzise Diagnose: warum „Apps“ und „Deployments“ verwirren

| Symptom | Ursache |
|---|---|
| „App“ bedeutet dreierlei: Tier-3-`App` (SSOT), Container (Apps-Tab), deploytes Projekt (Playground) | drei Quellen (deployments-Rows, discovery-Container, projects-Row) tragen denselben Namen |
| Der Deployments-Tab zeigt Rows, die *nicht* aus Deployments stammen | Deploy-Pfad schreibt nur in `projects`; `deployments`-Rows entstehen nur per manuellem POST |
| „Ein Deployment mit Web-UI“ ist kein Deployment-Objekt, sondern Frontend-Ableitung | Interfaces (port/vncPort/codeServerPort + tunnel) leben als Felder der projects-Row + `includes('opencode')`-Heuristik |
| VNC-Port existiert auch bei Frameworks ohne VNC-UI | Backend: „allocatedVncPort … even when nothing listens on it“ (Z. 2286) — der Wert ist nicht wahrheitsfähig als Interface |

---

## 2. Namenskonflikt: „Plugin“ ist bereits belegt (TASK-103)

### 2.1 Beleg

- `GET /api/plugins` (Katalog: **Google Jules**, **Linear**, **GitHub App**) und `GET/POST /api/plugin-installations` (`gateway/plugins.go:7-41, 48+`; `gateway.go:234`).
- `types/domain/plugins.ts`: `Plugin { id, name, description, wrapperApiBase, authModes: ('api_key'|'github_app')[], configSchema }`, `PluginInstallation { pluginId, scopeType: 'workspace'|'project', scopeId, activated, authMode, secretRef?, … }`.
- UI: `WorkspaceSettingsPage.tsx:200-230` — Abschnitt „Workspace Plugins & Integration“ mit `PluginActivationCard` („Activate Google Jules Plugin“).
- RBAC-Sektionen nennen `deployments` als eigene Domain (`API_DOCS.md:1589, 1662-1670`).

Diese „Plugins“ sind **Auth-/Service-Integrations** (Wrapper-API + Credentials) — semantisch nichts als ein Deployment-Interface. Ein zweites Plugin-Konzept mit demselben Namen im selben Nav-Baum wäre ein Fehler.

### 2.2 Empfehlung (zwei saubere Optionen)

**Option A — empfohlen:** Domänenbegriff **Interface** (Backend-Objekt), UI-Begriff **„Plugin“** nur als Label für die Badge-/Launcher-Sicht über Interfaces (das, was der Operator „Plugin-Badge“ nennt). TASK-103 wird in „Integration“ umbenannt (Routen `/api/integrations`, `/api/integration-installations`; Typdatei `types/domain/integrations.ts`; Abschnitts-Titel „Workspace Integrations“). Aufwand klein: ein Handler + eine Card + i18n-Keys; MANDATES §8-Lesart „rename the semantics, then move the data“ deckt genau das ab.

**Option B:** Interfaces heißen im UI „Interfaces“/„Konsolen“, „Plugin“ bleibt exklusiv bei TASK-103. Weniger Radikaler Umbenennungs-Aufwand, aber der Operator-Vorschlag („Deployments mit Interface heißen Plugins“) wird nicht umgesetzt und die Badge-Metapher bleibt unbesetzt.

**Abgrenzung im Modell (gilt für beide Optionen):** Plugin ≠ Interface. Ein Interface ist das *Surface* (Port+Protokoll+Access-Pfad); ein „Plugin“ (UI) ist die *präsentierbare Einheit* (Badge + Launcher + i18n-Label + Icon) über **einem** Interface (später optional: mehrere Interfaces einer App zu einer Plugin-Karte gruppiert). Migration/Vererbung wie in §8.

---

## 3. Domänenmodell (Soll)

### 3.1 Begriffe

- **App** (Tier 3, logisch): „die Anwendung“ — eine Website, API, Tool-Shell oder Agent-Harness, die der Operator betreibt. Die *veröffentlichten* Ports gehören zur App (MANDATES §13: „Apps ALWAYS carry published ports“).
- **Deployment**: die konkrete Container-Instanz einer App auf einem SSH-Target (heute `jimesh-framework-<nameKey>-<runID>`). Ein Deployment ist die *Instanz*, aus der Interfaces lauschen. Mehrere Deployments pro App sind möglich (Workspace-Deploy vs. Task-Worktree-Deploy, `DeployRequest.TaskID` vs. `WorkspaceID`, projects_ssh.go Z. 128-141).
- **Interface**: ein deklariertes Surface eines Deployments mit `kind` (`http` | `vnc` | `code-server` | `terminal`), Port und Access-Pfad (loopback-only + SSH-Tunnel bzw. Tunnel-Route; MANDATES §12). Genau ein Interface pro Port, wahrheitsgemäß („currently just opencode's noVNC“ — Z. 2286).
- **Plugin** (UI-Ebene): der Badge-/Launcher-Wrapper über einem Interface, der in Sidebar/Tabs als klickbare Karte erscheint. Kein eigenes Backend-Objekt in v1 — abgeleitet aus Interfaces (`pluginEnabled`-Flag kommt in Phase 2, §7.3).

### 3.2 TypeScript-Typen (neu `src/frontend/src/types/domain/interfaces.ts`)

```ts
// ── Tier 3: App (logisch, unverändert aus hierarchy.ts) ──
export type AppType = 'website' | 'api' | 'service' | 'tool' | 'database'
// App bleibt wie in types/domain/hierarchy.ts definiert — ergänzt um:
export interface AppWithInterfaces extends App {
  interfaceIds: string[]   // aggregiert aus ihren Deployments (Lookup, kein Feld-Dublett)
  hasPlugin: boolean       // abgeleitet: mindestens ein Interface mit pluginEnabled
}

// ── Deployment: Instanz (1:1 zu einer Container-Run-Reihe) ──
export interface Deployment {
  id: number
  projectId: string
  workspaceId?: string            // NEU: TASK-037-Parität zu containers.workspace_id
  name: string
  type: string                    // heute 'custom' — Phase 2: framework-Presets
  framework?: FrameworkId         // NEU — für Labels/Icons ohne Joins
  remotePath: string
  configPath: string
  status: 'stopped' | 'building' | 'active' | 'failed'
  chainId: string
  autoProvision: boolean
  interfaces: InterfaceSpec[]     // NEU: der Kern dieser Spezifikation
  createdAt: string
}

export type FrameworkId =
  | 'dsh' | 'opencode' | 'gotty' | 'claude-code' | 'gemini-cli'
  | 'code-server' | 'jimesh'
  | 'dsh_code_server' | 'opencode_code_server'
  | 'claude-code_code_server' | 'gemini-cli_code_server'

// ── Interface: ein konkretes Surface ──
export type InterfaceKind = 'http' | 'vnc' | 'code-server' | 'terminal'
export type InterfaceAccess = 'loopback-tunnel'   // v1 immer; MANDATES §12

export interface InterfaceSpec {
  id: string                      // z. B. "123:web"
  deploymentId: number
  kind: InterfaceKind
  label: string                   // i18n-artig: 'iface.web' | 'iface.vnc' | …
  port: number                    // der ALLOKIERTE, wirklich lauschende Port
  vncType?: 'neko' | 'novnc'      // nur kind='vnc'
  auth: 'token' | 'password-once' | 'none-via-tunnel'   // codeServerPassword-Modell
  pluginEnabled: boolean          // Badge sichtbar?
  uiOrder: number                 // Reihenfolge der Tabs
}

// ── Plugin: reine UI-Ableitung (kein Backend-Objekt in v1) ──
export interface PluginBadge {
  interfaceId: string
  kind: InterfaceKind
  label: string                   // i18n
  icon: 'globe' | 'monitor' | 'code' | 'terminal'
  url: string                     // lokal http://host:port — remote /api/projects/{id}/tunnel/{port}
}
```

### 3.3 Mapping Ist → Soll

| Ist | Soll | Mechanismus |
|---|---|---|
| `DeploymentRow` (store) | `Deployment` + `interfaces[]` | Backfill: aus der projects-Row abgeleitete Interface-Records (§8) |
| `project.port / vncPort / codeServerPort` | `InterfaceSpec` (`http`/`vnc`/`code-server`) | Der Deploy-Pfad erzeugt bei jedem Deploy Interface-Records statt (nur) projects-Felder (§7.3, P1) |
| Container-Tag `'shell'` (`isShellFramework`) | `InterfaceSpec { kind: 'terminal' }` ohne HTTP-Port | `docker exec`-Pfad; Backend meldet `shellAccess` bereits (Z. 2281-2295) |
| `framework.includes('opencode')` im Frontend | deklarativer `InterfaceSpec`-Record | Backend entscheidet, Frontend rendert |
| `framework.includes(...) → iframeUrl` | `PluginBadge.url`-Ableitung (zentral in `lib/interfaces.ts`) | Host-Wechsel lokal `http://host:port` ↔ remote `/api/projects/{id}/tunnel/{port}` bleibt wie heute |
| SSOT `apps = GET /api/deployments` | bleibt strukturell, wird semantisch korrekt: `App`-Aggregat aus deployments + interfaces | `portLookupTable`-Muster wie heute (§4) |

---

## 4. Integration in die 4-Tier-Hierarchie (ohne Bruch)

MANDATES §13 fixiert: SSH Target → Workspace → Project → App; `no_parent`-Fallback; Ports leben auf App-Ebene und aggregieren nach oben. Das Konzept fügt **unterhalb der App** hinzu, ändert oben nichts:

```
Tier 0  SSH Target        (SSH-Endpoints; HierarchySidebar Z. 189-221)
Tier 1  Workspace         (workspaces-Tabelle, RBAC-Tier, TASK-037)
Tier 2  Project           (projects-Row; trägt heute die Ports — bleibt bestehen)
Tier 3  App               (logisch; Port-Aggregation via PortAggregationLookup)
          └ Deployment    (Container-Instanz; NEU als benanntes Objekt)
              └ Interface (Port + Protokoll + Access-Pfad; NEU)
                  └ Plugin-Badge (UI; NEU)
```

- **Keine neue Tier-Ebene:** Deployment/Interface hängen an der App (Tier 3), nicht an Workspace/Project. Ein Deploy mit `WorkspaceID` (TASK-037) attributiert sein Deployment zusätzlich zum Workspace — analog `containers.workspace_id` (`store.go:318-322`); das Deployment-Objekt bekommt `workspaceId?: string` dafür (§3.2).
- **Port-Aggregation unverändert:** `portLookupTable` aggregiert weiterhin über `apps` nach oben (Store-Muster, `store.tsx`). Interfaces ändern nur, **woher** die App-Ports kommen — nicht das Aggregationsschema.
- **Kein Parent-Breach bei `no_parent`:** Deployments/Interfaces erben den Fallback der App; ein Interface ohne App-Eltern (`projectId: ''`) landet im `no_parent`-Bucket wie heute (MANDATES §13: „displayed … only when unassigned … exist“).
- **Redeploy-Vertrag bleibt:** Volume/Agent-Context preserved (MANDATES §5); Interfaces werden bei Redeploy **neu deklariert** (Ports können sich ändern — `allocated*` ist die Wahrheit), die App/Row-Identität bleibt.

---

## 5. Sidebar-Integration

### 5.1 HierarchySidebar (Haupt-Navigation, TASK-J2)

Heute: Target → Project → App-Zeilen mit `:{port}` (Z. 124-158). Vorschlag:

1. **App-Zeile + Plugin-Badges:** nach `{a.name}` und `:{a.port}` eine kompakte Badge-Gruppe — ein Icon pro Interface (`Globe` = http, `Monitor` = vnc, `Code2` = code-server, `Terminal` = terminal), aus `useSSOTStore().apps` → interfaces-Lookup. Badge-Anzahl begrenzen (`+n`-Fall), Title-Tooltip mit Label+Port.
2. **Klick-Semantik:** Klick auf die App-Zeile = Scope setzen + `navigate('/workspaces/apps')` (wie heute, Z. 84-89). Klick auf ein **Badge** = App öffnen mit **diesem Interface aktiv** — implementiert als Scope-Zusatz `{ kind: 'app', containerId, projectId, activeInterfaceId }`; die App-Overview (§6.3) liest den Parameter und aktiviert den passenden Tab. Kein Direct-iframe-Overlay nötig — die Overview-Page ist das Shared Surface („logic once“, MANDATES §11).
3. **no-Plugin-Apps:** Apps ohne Interfaces zeigen keinen Badge-Slot (ehrlich leer, Mandat 2) — kein „stub“-Badge.
4. **Struktur unverändert:** Target/Project-Ebenen bekommen **keine** Plugin-Badges (Badges sind App-Ebene, Tier-Konvention §4).

### 5.2 ProjectExplorerSidebar (ProjectsPage, Playground)

Heute: Framework-Kürzel-Chips + Hover-„View deployments“-Button (Z. 158-181). Vorschlag:

1. Kürzel-Chips bleiben (dsh / DSH + VS / Code + VS / VS Code) — sie sind Framework-Labels, kein Badge-Ersatz.
2. Der Layers-Button „View deployments“ öffnet künftig **InterfacesDialog** (umbenannt aus `DeploymentsDialog`, gleiche Route/Props): oben die Interface-Chips (App/noVNC/VS Code/Shell — bereits identisch vorhanden, Z. 77-90), darunter (zusammengeklappt) die Deployment-Rows-Historie mit Redeploy.
3. Neuer Hover-Button „Interface öffnen“ (Globe/ExternalLink-Icon) pro Projekt: navigiert zur Overview mit `activeInterfaceId='web'` — derselbe Contract wie 5.1.

### 5.3 Top-Nav / SectionRail (`section-nav.ts`)

- `workspaceItems` Z. 97/99: `'/workspaces/apps' → nav.workspaceApps` (bleibt „Apps“) und `'/workspaces/deployments' → nav.workspaceDeployments` (wird **„Interfaces“**, `nav.workspaceInterfaces`, Icon `Rocket → PanelsTopLeft`-Äquivalent). E-IA-Regel („new routes never land by convenience“): die Umbenennung ist eine Label-Änderung in der einen canonical table — App.tsx/SectionRail erben sie.
- `command-palette.tsx:142-143` folgt (Labels + keywords: `'interfaces vnc code-server terminal plugin'`).

---

## 6. Tab- und Page-Konzept

### 6.1 Apps-Tab (`/workspaces/apps` — bleibt)

Inhalt unverändert: Container-Attribution über `containers.workspace_id` + Discovery (`WorkspaceAppsPage.tsx:11-22`). Ergänzung: Spalte „Interfaces“ — Plugin-Badges pro Container-Zeile (aus dem Interface-Lookup via Namens-Mapping `jimesh-framework-<wsId>-<runID>` ↔ Deployment). Klick auf Badge → App-Overview (§6.3).

### 6.2 Deployments-Tab → Interfaces-Tab (`/workspaces/deployments`)

1. **Primärinhalt = Interfaces:** eine Liste aller Interface-Records (gruppiert nach Projekt, Auswahl wie heute via Projekt-Select, Z. 66-103): Spalten Plugin (Badge), Interface-Kind, Port, Status (abgeleitet aus Deployment-Status), Erstell/Run-Zeit, Aktionen: **Öffnen** (iframe in Overview) statt heutigem reinen Redeploy.
2. **Sekundär (zugeklappt): Deployment-Rows:** die bestehende Tabelle (Name/Typ/Port/Status/Created + Redeploy, Z. 172-206) bleibt als „Run-Historie“-Sektion — Redeploy ist ein Deployment-Vorgang, kein Interface-Vorgang.
3. **Der Port-Chips-Block** („Projekt-Ports: App · noVNC · VS Code“, Z. 130-146) wandert in die Interfaces-Liste und wird überflüssig, sobald das Backend Interfaces liefert.
4. Route bleibt `/workspaces/deployments` (URL-Stabilität, kein Redirect-Zwang; Label-Änderung §5.3 reicht). Alternativ Phase-2-Umbenennung zu `/workspaces/interfaces` mit Redirect.

### 6.3 App-Overview mit iframe (neue Shared Surface)

Heute existiert die iframe-Welt **nur** in `ProjectsPage.tsx` (Playground-Paned). Vorschlag: ein generisches **AppOverviewPanel** (neu, `components/apps/AppOverviewPanel.tsx`), das die komplette Pane-Logik aus ProjectsPage übernimmt (Terminal-Logs, Stop/Start/Re-Deploy-Buttons, Edit) und den Interface-Switch deklarativ rendert:

- Tab-Leiste = `deployment.interfaces` in `uiOrder` (statt heutiger fester `activePaneTab: 'iframe'|'vscode'|'terminal'`): jeder Tab rendert `<iframe src={badge.url} sandbox='allow-scripts allow-same-origin allow-popups allow-forms' loading='lazy'>` (identisch zu heute, Z. 888-907) plus „In neuem Tab öffnen“ (`ExternalLink`, heute Z. 890-896).
- `kind: 'terminal'` rendert keinen iframe, sondern den Shell-Access-Hinweis (`docker exec -it jimesh-framework-<id> sh` über SSH-Tunnel — exakt der heutige Empty-State, Z. 874-886) und später ttyd-URL, wenn ein Terminal-Interface einen Port bekommt.
- Eingebettet wird das Panel in:
  - **ProjectsPage** (heutiger Standort — ersetzt die inline-Kopie),
  - **App-Overview-Route** `/workspaces/apps/:appId` (neu): Landing für Sidebar-App-Klicks und Badge-Klicks (§5.1); Scope-Parameter `activeInterfaceId` wählt den initialen Tab.
- **URL-Bildung zentral** in `lib/interfaces.ts` (heute doppelt geraten, Z. 678-697): lokal `http://<sanitizedHost>:<port>` (localhost → `window.location.hostname` wie heute), remote `/api/projects/{id}/tunnel/{port}?token=…`. Token bleibt `jimesh_dashboard_token` (localStorage) — unverändert.

---

## 7. API-Änderungen

### 7.1 Erweiterte Felder (bestehende Routen, rückwärtskompatibel)

| Route | Änderung |
|---|---|
| `GET /api/deployments`, `GET /api/projects/{id}/deployments`, `…/{depId}` | Row um `workspaceId`, `framework`, `interfaces: InterfaceSpec[]` erweitert (neue Spalten, §8); alte Felder bleiben |
| `POST /api/projects/deploy` (Response) | zusätzlich `interfaces: InterfaceSpec[]` (aus `allocatedPort/allocatedVncPort/allocatedVSCodePort/shellAccess/tags` abgeleitet — die Werte sind bereits vorhanden, Z. 2357-2366) |
| `GET /api/projects` | optional `interfaces` je Projekt (Ableitung wie Deploy-Response) — für Dialog-/Sidebar-Fallback ohne zweite Query |

### 7.2 Neue/umbenannte Routen

- **NEU** `GET /api/projects/{id}/interfaces`: die Interfaces-Liste eines Projekts (kanonische Quelle für Tab §6.2 und Dialog §5.2) — aggregiert aus deployments + projects-Ports-Ableitung. (Die `ports`-Route `/api/projects/{id}/ports` ist SSH-Sicherheits-Scan (`security/exposure.go:105-108`) und bleibt getrennt.)
- **Rename (TASK-103, §2.2 Option A):** `GET /api/plugins → GET /api/integrations`; `/api/plugin-installations → /api/integration-installations`; Backend `gateway/plugins.go` Handler-Paths in `gateway.go:234` + FE `types/domain/plugins.ts` → `integrations.ts`. API_DOCS-Einträge in derselben Änderung (Mandate §1).
- **Bleibt:** `POST /api/projects/{id}/deployments/{depId}/redeploy` (setzt `building`) — ohne Interface-Bezug.
- **Später (nicht in Phase 1):** Interface-CRUD (`PUT /api/deployments/{depId}/interfaces/{ifaceId}` für `pluginEnabled/uiOrder`) — v1 leitet `pluginEnabled` deterministisch ab (§8.1).

### 7.3 Was am Backend fehlt (Lücken-Liste)

1. **Deploy-Pfad persistiert keine Deployments:** `executeDeploy` schreibt Port-Variablen in die projects-Row (Z. 2141-2143), nie `CreateDeployment`. → Interface-Erzeugung muss im Deploy-Path erfolgen (Phase P1), sonst bleiben Interfaces reine Frontend-Ableitung.
2. **Keine Framework-/Workspace-Referenz in `deployments`** (DDL Z. 327-339): `type` ist freier Text (`'custom'`), kein `framework`, kein `workspace_id` → Klassifikation/Migration ohne diese Spalten unmöglich (§8).
3. **Kein Interface-Objekt:** Ports ohne „läuft wirklich“-Wahrheit (`allocatedVncPort` „even when nothing listens on it“, Z. 2286). Der Interface-Record muss die securityNote-Wahrheit kodieren: `vnc`-Interface nur bei real lauschendem VNC (opencode/neko/novnc), sonst `terminal`/`http` allein.
4. **POST `/api/projects/{id}/deployments` hat keinen Consumer** — entweder als Admin/jimeshctl-Pfad dokumentieren oder in P1 vom Deploy-Path automatisch befüllen (Doku-Pflicht Mandate §1, API_DOCS Z. 494-499).
5. **SSOT-Mapping `DeploymentRow→App` verliert Felder** (`framework`, interfaces) — Store-Mapper `listFrom<App>` (`store.tsx:82-86`) muss erweitert werden (FE-Arbeit, aber Backend liefert die Felder).

---

## 8. Migration-Plan

Grundlage: MANDATES §8 — „the migration covers **existing rows too** … in `migrate()`/`SeedDefaults()`, idempotently“.

### 8.1 Klassifikation bestehender Deployments

Bestehende `deployments`-Rows (DDL: `type` default `'custom'`, `port`, `remote_path`, `config_path`, `chain_id`, `auto_provision`) werden so klassifiziert:

| Regel | Resultat |
|---|---|
| `port > 0` | Interface `{kind:'http', label:'iface.web', port, pluginEnabled: true}` |
| Projekt-Row des `project_id` hat `vncPort > 0` **und** `framework` ∈ `opencode/opencode_code_server` (neue Spalte §7.3-2) | Interface `{kind:'vnc', port: vncPort, vncType: project.vncType || 'neko'}` |
| Projekt-Row hat `codeServerPort > 0` **und** `framework` ∈ `code-server/*_code_server` | Interface `{kind:'code-server', port: codeServerPort}` |
| `framework` ∈ `isShellFramework`-Set (claude-code/gemini-cli/…) **ohne** `_code_server` | zusätzlich `{kind:'terminal', port: 0}` (kein HTTP-Port; Shell-Hinweis-UI) |
| sonst (keine Ableitung möglich) | `interfaces: []` — ehrlich leer (Mandat 2), Badge bleibt weg, Tab zeigt „kein Interface erfasst“ |

Zusätzlich: Projekte, die **deployt, aber ohne deployments-Row** sind (der Normalfall heute), bekommen beim ersten `POST /deploy`/`redeploy` nach P1 automatisch eine Row + Interfaces; für Bestandsprojekte liefert `GET /api/projects/{id}/interfaces` die Ableitung aus der projects-Row **ohne** Schreib-Migration (Read-Modell), bis der nächste Deploy die Persistenz erzeugt.

### 8.2 Phasen

- **P0 — Umbenennung (FE + API-DOC):** Nav-Label `nav.workspaceDeployments → nav.workspaceInterfaces` (`section-nav.ts:99`, i18n de/en + weitere Locale-Dateien, `command-palette.tsx:143`), `DeploymentsDialog → InterfacesDialog` (Datei bleibt, Titel/Chips als Interfaces). TASK-103-Rename zu „Integrations“ (§7.2). Keine Datenänderung.
- **P1 — Backend-Interfaces (wahrheitsfähig):** DDL-Erweiterung `deployments` um `workspace_id`, `framework`, `interfaces JSONB` (idempotent via `columnExists`-Muster, `store.go:295-339`); Deploy-Path schreibt Interface-Records (`executeDeploy` nach Z. 2103); `GET …/interfaces` neu; Response-Felder §7.1; API_DOCS + Sprint-File (Mandate §1) + Backlog-Mirror.
- **P2 — FE-Modell & Views:** `types/domain/interfaces.ts`, `lib/interfaces.ts` (URL-Builder, ersetzt die iframeUrl-Raterei), `AppOverviewPanel` inkl. Einbau in ProjectsPage + neue Route `/workspaces/apps/:appId`, Apps-Tab-Spalte „Interfaces“, HierarchySidebar-Badges (§5.1).
- **P3 — Migration/Backfill:** Bestehende Rows nach §8.1 klassifizieren (idempotenter Backfill in `migrate()`; „New code with clean semantics on top of dirty legacy rows“ ist verboten); Backend-Backfill für alle Projekte mit deployments-Rows; Read-Ableitung für Row-lose Projekte bleibt als Fallback dokumentiert.
- **P4 — Optional:** Interface-CRUD (`pluginEnabled/uiOrder`), terminal-Interface mit ttyd-Port (runtime keep-alive installiert ttyd bereits: `projects_ssh.go:204-214`, Port 3080 im Container — Publishing ist eine bewusste §12-Entscheidung), URL-Rename `/workspaces/deployments → /workspaces/interfaces` mit Redirect.

### 8.3 Akzeptanzkriterien (prüfbar)

1. Nach P1 meldet jede Deploy-Response Interfaces, deren Ports exakt `allocated*` entsprechen; kein Interface ohne lauschenden Port (`vnc` nur bei realer VNC-Session).
2. Nach P2 zeigt der Interfaces-Tab Interfaces aus dem Backend (kein `framework.includes('opencode')` mehr im Code); Dialog-Chips sind aus Backend-Daten gerendert.
3. Nach P3 sind Legacy-Rows klassifiziert (oder ehrlich `interfaces: []`); `GET /api/deployments` liefert `interfaces` für jede Row.
4. API_DOCS.md ist für jede touched Route aktualisiert (Mandate §1); Sprint-File + Backlog spiegeln P0-P3.

---

## 9. Offene Fragen (an den Operator)

1. **Namensentscheidung §2.2:** Option A (UI „Plugin“, TASK-103 → „Integrations“) oder Option B (UI „Interfaces“)? Das Modell ist identisch, nur Labels/Claim ändern sich.
2. Sollen **Shell-only-Apps** (claude-code/gemini-cli) ein Plugin-Badge bekommen (Öffnen zeigt docker-exec-Hinweis statt iframe) oder badge-los bleiben?
3. Soll der Interfaces-Tab die **Run-Historie** (heutige Deployments-Tabelle) dauerhaft behalten (§6.2-2) oder in ein Projekt-Detail auslagern?
4. Priorität der terminal-Interface-URLs (ttyd-Publishing wäre ein Port-Binding-§12-Review) — P4 oder explizit gewünscht?

---

## Anhang A — Belegliste (Datei:Zeile)

- `src/backend/internal/deploy/projects_ssh.go`: DeployRequest 16-159 (framework 26, ports 28-30, vncType 112, task/workspace 128-141); isShellFramework 319-332; loopback-Doku 866-869; allocated-Parsing 2083-2103; UpdateProject-Ports 2141-2143; response 2357-2401; shell/securityNotes 2245-2295; ttyd keep-alive 204-214.
- `src/backend/internal/deploy/deploy.go`: Routen 49-77 (tunnel 67, deployments 71-73, /api/deployments 77); handleDeploymentsList 80-101.
- `src/backend/internal/deploy/deployments.go`: GET/POST 13-45; GET/PUT/DELETE 48-97; redeploy→building 100-120.
- `src/backend/internal/store/deployments.go`: DeploymentRow 6-18; ListAllDeployments (TASK-086) 20-35.
- `src/backend/internal/store/store.go`: containers.workspace_id 318-322; deployments-DDL 327-339.
- `src/backend/internal/gateway/plugins.go`: Katalog 7-41; installations 48+; `gateway.go:234`.
- `src/backend/internal/security/exposure.go`: `/ports`-Scan 105-108, 656-677.
- `docs/API_DOCS.md`: deployments 494-499; tunnel 685-686; /api/deployments 1043; RBAC-Domain 1589/1662-1670.
- `src/frontend/src/lib/store.tsx`: StoreState 42-52; apps ← GET /api/deployments 82-86; projects-Mapping 119-135; portLookupTable 138-152.
- `src/frontend/src/types/domain/hierarchy.ts`: 4-Tier 5-9; AppType 10; App 23-37; PortAggregationLookup 38-46.
- `src/frontend/src/types/domain/plugins.ts`: Plugin/PluginInstallation (TASK-103) 1-29.
- `src/frontend/src/components/sidebar/HierarchySidebar.tsx`: TASK-J2 10-14; Tree-Derive 18-60; selectApp 84-89; App-Zeile 124-158.
- `src/frontend/src/lib/section-nav.ts`: workspaceItems 95-102; navGroups 174-206.
- `src/frontend/src/views/ProjectsPage.tsx`: activePaneTab 171; iframeUrl 678-697; hasVSCode 698; isShellOnlyFramework 700-704; iframe 888-907; vscode-iframe 908-923; deploy-Response-Mapping (allocated*) ~532-560.
- `src/frontend/src/components/projects/ProjectExplorerSidebar.tsx`: Framework-Kürzel 158-170; View-deployments-Button 172-181; „No deployments yet“ 210.
- `src/frontend/src/components/projects/DeploymentsDialog.tsx`: Project 18-35; DeploymentRow 37-49; Chips 77-90; Redeploy 56-66.
- `src/frontend/src/views/WorkspaceAppsPage.tsx`: TASK-053 11-22; Tabelle 98-133.
- `src/frontend/src/components/workspaces/workspace-apps-dropdown.tsx`: Namens-Matching 10-19/40-48.
- `src/frontend/src/views/WorkspaceDeploymentsPage.tsx`: TASK-053 12-14; Query 81-90; Port-Chips 130-146; Tabelle 172-206.
- `src/frontend/src/views/WorkspaceSettingsPage.tsx`: PluginActivationCard-Einbau 200-230.
- `src/frontend/src/i18n/locales/de.json`: wsApps 2167-2186; wsDeployments 2187-2205.
- `MANDATES.md`: §8 Migration 110-118; §12 Port-Binding 168-208; §13 Hierarchy 223-238.
