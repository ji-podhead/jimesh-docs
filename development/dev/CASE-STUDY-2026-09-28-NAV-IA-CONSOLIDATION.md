# CASE STUDY — Navigation / IA Consolidation: Workspaces, Apps, Deployments, Integrations, Plugins

**Datum:** 28.9.2026
**Auslöser (Operator, wörtlich):** "dieses deployments ding nervt mich halt echt ey. und was ist mit
apps und integrations und plugins ich verstehe da einfach nix mehr."
**Scope:** Reines Read-only-Research + Design-Proposal. Kein Code geändert. Ziel: verstehen, was jede
Fläche TATSÄCHLICH ist, wo sie sich mit anderen überschneidet, und eine konkrete, konsolidierte IA
vorschlagen — inklusive Tabs-statt-Seiten und Nav-Merges.

---

## 0. Top-Line-Empfehlung

Der Operator hat recht: fünf verschiedene Seiten (`/workspaces/apps`, `/workspaces/deployments`,
`/plugins`, `/plugins/settings`, plus Tabs auf `/workspaces/projects/:id` und
`/workspaces/ws/:id`) zeigen **denselben zugrundeliegenden Container-/Deployment-Datensatz**
in bis zu **fünf unterschiedlichen UI-Formen** (Tabelle, Karten-Panel, Read-only-Mini-Tabelle,
Tab-Inhalt, geplantes Drawer) — mit unterschiedlichen Query-Keys, unterschiedlichem Scope
(alle Projekte vs. ein Projekt vs. eine Workspace) und keiner gemeinsamen Komponente außer dem
neuen (noch unverschmolzenen) `AppPanelDrawer`. Das ist der Kern der Verwirrung, nicht ein
Naming-Problem. Empfehlung: **eine** App/Deployment-Fläche pro Kontext-Ebene (Projekt-Ebene,
Workspace-Ebene, global-flach), verbunden durch EIN gemeinsames Drill-down (der bereits gebaute,
aber unmerged `AppPanelDrawer`), plus **eine** Integrations/Plugins-Fläche statt der aktuellen
Aufteilung Catalog/Settings/Interfaces-Tab/Browser-Modal. Der Top-Nav-Tab "Workspaces" schrumpft
von 16 auf ca. 8 sichtbare Einträge (siehe Tabelle §6).

**SPRINT-139-Kollision: BESTÄTIGT, und schlimmer als vermutet.** Es sind nicht nur zwei
gleichnummerierte Sprints — sie liegen auch auf zwei **unterschiedlichen, nicht gemergten
Branches**, und keiner ist im aktuell ausgecheckten Branch (`feat-tetragon-ebpf`, HEAD `20c5fb3`)
enthalten. Details in §1.

---

## 1. KRITISCH: SPRINT-139-Nummernkollision + Branch-Fragmentierung (verifiziert, nicht angenommen)

Zwei völlig unabhängige Features tragen beide die Nummer SPRINT-139:

| | "Unified App Panel" (Apps+Deployments-Merge) | "Workspace-Lifecycle" (Create vs. Provisioning) |
|---|---|---|
| Datei | *(kein `docs_dev/sprints/SPRINT-139*.md` vorhanden — Sprint-Doc fehlt/ist nicht committed)* | `docs/sprints/SPRINT-139-WORKSPACE-LIFECYCLE.md` (untracked, `git status`: `??`) |
| Ort | Commit `63899f7`, **NUR auf Branch `feat-app-panel`** — kein Ancestor von HEAD | Untracked Files im aktuellen Working Tree (`workspaces_lifecycle_test.go`, `workspaces_provision.go`) — noch nicht committed, kein eigener sauberer Branch-Stand |
| Was es tut | `AppPanelDrawer` (Tabs Info/Terminal/Dashboard), `ActiveAppsDropdown`, `lib/app-status.ts`, `lib/tunnel.ts` — 73 Dateien, 3518 Zeilen | `workspace_kind` (user/shared), Split von "ensure" (nur DB-Row) und neuem `POST /api/workspaces/{id}/provision` |
| Status im aktuell laufenden Branch | **NICHT vorhanden** — `find`/`grep` im Working Tree liefert 0 Treffer für `AppPanelDrawer.tsx` | Teilweise vorhanden (uncommitted), laut Sprint-Doc alle WPs mit `[x]` markiert, Status-Feld aber noch "🔄 IN ARBEIT" (Doc selbst ist inkonsistent) |

**Konsequenz:** Der Operator sieht heute (auf dem Branch, den er tatsächlich betreibt) WEDER die
Apps+Deployments-Verschmelzung NOCH einen sauberen Workspace-Lifecycle-Stand — beide Antworten auf
seine Beschwerden existieren nur in Fragmenten auf verschiedenen Ästen. Bevor irgendeine der
IA-Änderungen aus diesem Case Study umgesetzt wird, muss geklärt werden:
1. Wird `feat-app-panel` gemerged? Falls ja: die IA-Vorschläge unten (§6) bauen direkt darauf auf
   (der `AppPanelDrawer` ist exakt der "ein Klick → ein Panel"-Mechanismus, den dieses Case Study
   für App-Detail vorschlägt — nicht neu erfinden).
2. Eine der beiden Sprints muss umbenannt werden (z. B. Workspace-Lifecycle → SPRINT-140), damit
   `docs_dev/sprints/` wieder eine eindeutige Nummer-zu-Feature-Zuordnung hat.
3. Der allgemeine Befund aus `docs_dev/AUDIT-2026-09-27-FRONTEND-INTEGRATION-GAPS.md` — dass Sprint-
   Docs teils gitignored/lokal sind (SPRINT-57 laut eigenem Commit-Text) — erklärt, warum sowas
   unbemerkt bleibt: es gibt keine zentrale, versionierte Sprint-Registry, gegen die eine neue
   Nummer geprüft werden könnte.

---

## 2. Das strukturelle Problem: DREI parallele Nav-Quellen, keine davon vollständig

Der Operator navigiert nicht nur über eine Stelle. Es gibt drei unabhängig gepflegte Link-Listen,
die sich teilweise überschneiden und teilweise widersprechen:

1. **`src/frontend/src/lib/section-nav.ts`** — `workspaceItems` (16 Einträge, siehe §3), rendert
   Top-Navbar-Dropdown + rechte SectionRail.
2. **`components/sidebar/HierarchySidebar.tsx`** — eigenes hartcodiertes `NAVIGATION_ITEMS`
   (Zeile 232–240): Onboarding, Agents, Workspace-Apps, Plugin-Catalog, Workspace-Deployments,
   SSH-Endpoints, Workspace-Settings — **7 von den 16 Einträgen aus section-nav.ts, in anderer
   Reihenfolge, ohne Network-Editing/App-Discovery/Browser-Integration/Playground/Subagents/
   Chat**, PLUS einen Eintrag (`/onboarding`), den section-nav.ts gar nicht kennt.
3. **`components/command-palette.tsx`** (Ctrl+K) — dritte, wieder andere Teilmenge (bestätigt in
   `docs_dev/AUDIT-2026-09-27-FRONTEND-INTEGRATION-GAPS.md`: die `/models/*`-Seiten sind NUR hier
   erreichbar, in section-nav.ts und Sidebar fehlen sie ganz).

Das bedeutet: **selbst wenn die Nav-Einträge unter "Workspaces" konsolidiert werden, bleibt die
Verwirrung**, solange diese drei Listen unabhängig gepflegt werden — der Operator sieht in der
Sidebar eine andere Gruppierung als im Top-Dropdown. Empfehlung dazu in §6 (Punkt "Single Source").

---

## 3. Ist-Zustand: was JEDE Fläche tatsächlich ist (Daten-Fakt, nicht Vermutung)

| Fläche | Route | Was es WIRKLICH ist / welche Daten es zeigt |
|---|---|---|
| **Workspaces (Liste)** | `/workspaces` | `WorkspacesPage.tsx` (874 Z.) — Tabelle aller Workspace-Rows + Create-Dialog + Redeploy/Stop-Actions. Landing-Seite des ganzen Tabs. |
| **Workspace-Detail** | `/workspaces/ws/:id` | Bereits EIN konsolidiertes Beispiel: Tabs **Containers \| Secrets \| Budget \| Settings** für genau EINE Workspace. Enthält eingebettetes Terminal + Deploy-Dialog. |
| **Project-Detail** | `/workspaces/projects/:id` | 968 Zeilen, eigene Tabs **Overview \| IaC \| Deployments \| Secrets \| Integrations**. **Deployments-Tab und Secrets-Tab sind Read-only-Mini-Tabellen ohne Actions** — dieselben Spalten (Name/Type/Port/Status) wie die "echte" Deployments-Seite, nur ohne Redeploy/Undeploy/Logs/Terminal. |
| **Network-Editing** | `/workspaces/networks` | Pro-Projekt VLAN/Docker-Network-Zuweisung (`POST/DELETE /api/projects/{id}/vlan`) — eigenständig, klar abgegrenzt von der Platform-Tab-Seite `/networks` (Headscale-Mesh, anderes Konzept). |
| **Workspace-Apps** | `/workspaces/apps` | Flache Tabelle ALLER Container über ALLE Workspaces hinweg (`containers.workspace_id` + `GET /api/discovery`-Live-Registry). Beantwortet "wo sind meine Apps über alles hinweg". |
| **SSH-Endpoints** | `/workspaces/endpoints` | Registry der Deploy-Ziele (Host/User/Credentials) — Infrastruktur-Ebene, KEIN App-/Deployment-Konzept. |
| **Workspace-Deployments** | `/workspaces/deployments` | Pro-PROJEKT Deployment-Rows (`GET /api/projects/{id}/deployments`) + Redeploy-Action, Klick → `DeploymentDetailPage`. Enthält den `?browser=1`-Query-Param, der `BrowserRuntimeModal` öffnet (siehe unten). |
| **Deployment-Detail** | `/workspaces/deployments/:projectId/:deploymentId` | Eigene Detail-Seite (439 Z.) für EIN Deployment — separat von `AppDetailPage`. |
| **App-Detail** | `/workspaces/apps/:appId` | Eigene Detail-Seite (283 Z.) für EINE App — Tabs **Interfaces \| Logs \| Audit**. "Interfaces"-Tab = IntegrationCards (Terminal/Code/VNC/Web, genau das Stitch-"Integration"-Konzept). |
| **App-Discovery** | `/projects/discover` | Ergebnis eines LIVE `docker ps -a`-Scans (`POST /api/servers/discover`), persistiert neue Projects+Container-Rows. Einmalig-Aktions-Seite, kein laufendes Dashboard. |
| **Browser-Integration** | *(keine eigene Route)* | Nur ein Modal (`BrowserRuntimeModal`, 719 Z.), das über `?browser=1` auf der Deployments-Seite geöffnet wird. Kein eigenständiges Konzept — ist ein Deploy-Wizard-Schritt ("KasmWeb vs. VNC", siehe Stitch Prompt 5). |
| **Plugin-Catalog** | `/plugins` | `PluginCatalogPage.tsx` (301 Z.) = Installierbarer Sidecar-Katalog (`GET /api/plugins`: Shell/VS Code/VNC/DSH-Agent/Web-Interface — identisch zur Stitch-Vorlage) **PLUS eingebettetes `ActiveDeploymentsSection`** (SPRINT-54, eigener Kommentar: *"the missing right half of the Integrations & Plugins design"*) **PLUS** "Installed & Active"-Karten-Grid. Diese Seite ist bereits die (teilweise) gebaute Realisierung des ursprünglichen Stitch-Mockups `jimesh-integrations-and-plugins.html` — nur unter dem Namen "Plugins" statt "Integrations". |
| **Plugin-Settings** | `/plugins/settings` | Verwaltung installierter Plugin-Instanzen (Aktivierung, Scope, Config) — 364 Z., eigene Seite getrennt vom Catalog. |
| **AppPanelDrawer** *(unmerged, `feat-app-panel`)* | *(kein Route — Drawer)* | Tabs **Info \| Terminal \| Dashboard**, öffnet bei Klick auf JEDE App-Zeile (Sidebar, WorkspaceDetailPage-Container-Karten, neues Active-Apps-Dropdown). Das ist der bereits gebaute Ersatz für die Kombination aus `AppDetailPage` + `DeploymentDetailPage` — aber nicht gemerged (§1). |
| **Workspace-Settings** | `/workspaces/settings` | Runtime-Preset + SSH-Target EINER Workspace ändern, via `WorkspaceDeployDialog` (redeploy mode) — dieselbe Dialog-Komponente wie "Configure…" in der Workspaces-Liste. |
| **Playground** | `/projects` | **Toter Redirect** auf `/workspaces`. Die dahinterliegenden Komponenten (`ConversationSidebar`, `SettingsRail`, 3 Support-Libs, alle getestet) sind vollständig verwaist — 0 Referenzen im ganzen Frontend (Audit vom 27.9., Abschnitt 2). |
| **Agents / Chat / Subagent-Approvals / Tool-Call-Inspector** | `/agents`, `/chat`, `/subagents/*` | Agenten-/LLM-Betrieb, thematisch NICHT Teil des Workspace-Infrastruktur-Clusters — siehe §5, "was getrennt bleiben soll". |

**Zusatzfund:** `AppDiscoveryPage`, `WorkspaceAppsPage` und `WorkspaceDeploymentsPage` verwenden
je eigene lokale Interfaces (`DiscoveredContainer`, `WorkspaceRow`, `ProjectRow`, `DeploymentRow`)
für strukturell überlappende Daten — genau das Muster, das die AppPanelDrawer-Commit-Message
selbst als Bug beschreibt ("das lokale DeploymentRow-Interface trug Go-Style-Keys … renderte seit
jeher undefined").

---

## 4. Konkrete Überschneidungen (das Kernproblem, tabellarisch)

| Konzept | Erscheint in diesen Flächen | Bewertung |
|---|---|---|
| **"Deployments" (Container-Liste mit Status/Ports/Actions)** | (1) `/workspaces/deployments` (pro Projekt, volle Actions), (2) `ActiveDeploymentsSection` auf `/plugins` (ALLE Projekte, volle Actions, SPRINT-54), (3) `ProjectDetailPage`'s Deployments-Tab (read-only Mini-Tabelle), (4) `WorkspaceDetailPage`'s Containers-Tab (pro Workspace), (5) `AppPanelDrawer`'s Info-Tab (unmerged) | **Echte Redundanz.** (1) und (2) sind praktisch dasselbe Feature (dieselben Backend-Routen: redeploy/undeploy/logs/monitoring/tunnel), gebaut in zwei verschiedenen Sprints (TASK-053 bzw. SPRINT-54) ohne dass eines das andere ablöst. (3) ist eine dritte, abgespeckte Kopie ohne Actions. |
| **"Integrations" (Terminal/Code/VNC/Web-Zugriff auf eine App)** | (1) `AppDetailPage`'s "Interfaces"-Tab, (2) `ProjectDetailPage`'s "Integrations"-Tab, (3) `PluginCatalogPage`'s "Available Integrations"-Katalog (Install-Perspektive, nicht Nutzungs-Perspektive), (4) `BrowserRuntimeModal` (Spezialfall: Browser-Runtime als eigener Deploy-Schritt) | Zwei unterschiedliche BEDEUTUNGEN teilen sich den Namen: (a) "welche Zugriffsarten hat DIESE App gerade" (AppDetail/ProjectDetail) vs. (b) "welche Sidecar-Typen KANN ich installieren" (Plugin-Catalog). Das ist der Kern von "ich verstehe da nix mehr" — Integrations bedeutet je nach Seite etwas anderes. |
| **"Apps" (was läuft, wo)** | (1) `/workspaces/apps` (global-flach, alle Workspaces), (2) `App-Discovery` (Scan-Ergebnis, einmalig), (3) Workspace-Detail Containers-Tab (pro Workspace), (4) Project-Detail Overview-Tab "Bound Applications"-Zähler | Kein Widerspruch in den Daten, aber vier verschiedene Blickwinkel auf dasselbe Datenmodell ohne Querverlinkung — man kann von (1) nicht direkt zu (3) springen. |
| **Plugin-Catalog vs. Integrations** | `/plugins` heißt "Plugins", zeigt aber inhaltlich exakt das, was der ursprüngliche Stitch-Entwurf "Integrations & Plugins" nannte (siehe `docs/PROMPTS-STITCH-DESIGN.md` Prompt 3 UND `design-assets/stitch/jimesh-integrations-and-plugins.html`, `<title>JiMesh - Integrations and Plugins</title>`) | Der Name ist die Verwirrung, nicht der Inhalt: das Feature existiert schon fast wie ursprünglich geplant, heißt im Code aber "Plugins" statt "Integrations" — der Operator sucht "Integrations" und findet nichts eigenständiges, weil es unter "Plugins" versteckt ist. |

---

## 5. Ursprüngliche Absicht (Stitch-Design) vs. heutige Fragmentierung

`docs/PROMPTS-STITCH-DESIGN.md` Prompt 3 sah von Anfang an EINE Fläche vor:

> Left panel: "Available Integrations" — Install-Cards (Shell, VS Code, VNC, DSH Agent, Web
> Interface). Right panel: "Active Deployments" — Container-Liste mit Actions. Bottom: "Quick
> Deploy" — Framework-Dropdown + SSH-Target + Deploy-Button.

Das reale HTML-Mockup (`design-assets/stitch/jimesh-integrations-and-plugins.html`) zeigt exakt
diese Drei-Zonen-Seite mit dem Titel "Integrations & Plugins" (nicht zwei getrennte Seiten). Die
heutige `/plugins`-Seite (`PluginCatalogPage.tsx`) hat linkes Panel + `ActiveDeploymentsSection`
bereits umgesetzt — der SPRINT-54-Kommentar zitiert das Mockup wörtlich als Quelle. Was fehlt, ist
nur die Umbenennung/Positionierung im Nav (heißt "Plugin Catalog", nicht "Integrations") und die
Einbindung von "Quick Deploy" (unklar ob gebaut — nicht separat verifiziert, außerhalb des
Scopes dieses Case Study). Die Empfehlung in §6 baut direkt auf diesem bereits-fast-fertigen
Zustand auf, statt etwas Neues zu erfinden.

`docs/ARCHITECTURE.md` §8.3b (bindend) verlangt zusätzlich explizit: *"Project Detail page must
show Secrets + Apps as real components, not separate disconnected pages"* — das ist bereits als
Tab-Struktur auf `ProjectDetailPage` umgesetzt (Overview/IaC/Deployments/Secrets/Integrations),
nur mit den oben beschriebenen Redundanz-Problemen zur eigenständigen Deployments-Seite.

---

## 6. Vorschlag: konsolidierte IA (Kernstück)

### 6.1 Nav-Tabelle: Ist vs. Soll

| # | HEUTE (`workspaceItems`, 16 Einträge unter "Workspaces") | VORSCHLAG |
|---|---|---|
| 1 | Workspaces (`/workspaces`) | **Workspaces** (`/workspaces`) — unverändert, Landing-Liste |
| 2 | Network-Editing (`/workspaces/networks`) | **entfernt als Top-Nav-Eintrag** → wird Tab auf Project-Detail (`/workspaces/projects/:id` Tab "Network"), da es ohnehin ein Pro-Projekt-Feature ist, das heute nur zufällig einen eigenen Nav-Slot hat |
| 3 | Workspace-Apps (`/workspaces/apps`) | **Apps** (`/workspaces/apps`) — bleibt die globale flache Übersicht, aber Zeilen-Klick öffnet künftig denselben Drawer wie überall sonst (siehe #9) statt zu `AppDetailPage` zu navigieren |
| 4 | SSH-Endpoints (`/workspaces/endpoints`) | **SSH-Endpoints** (`/workspaces/endpoints`) — bleibt eigenständig (Begründung §7) |
| 5 | Workspace-Deployments (`/workspaces/deployments`) | **entfernt als eigener Top-Nav-Eintrag** — Inhalt wandert in die konsolidierte Fläche #7 (siehe unten); `/workspaces/deployments` bleibt als Redirect für alte Links |
| 6 | App-Discovery (`/projects/discover`) | **Discovery** — bleibt eigenständig, aber verschoben zu `/workspaces/apps` als Tab ("Apps" \| "Discover new") statt eigener Route, weil es eine Aktion AUF demselben Datensatz ist, kein eigenes Konzept |
| 7 | Browser-Integration (`?browser=1`) | **entfernt aus dem Nav komplett** (war ohnehin kein eigenständiges Ziel, nur ein Modal-Trigger) — bleibt als Deploy-Dialog-Schritt erreichbar, nicht als Nav-Eintrag vortäuschen |
| 8 | Workspace-Settings (`/workspaces/settings`) | **Settings** (`/workspaces/settings`) — bleibt |
| 9 | *(kein Eintrag, App/Deployment-Detail nur über Klick)* | **NEU, kein Nav-Eintrag nötig:** der `AppPanelDrawer` (aus `feat-app-panel`, gemerged) wird DIE einzige Drill-down-Fläche für "eine App/ein Deployment ansehen" — ersetzt `AppDetailPage` UND `DeploymentDetailPage` als Ziel jedes Zeilen-Klicks (Sidebar, Apps-Tabelle, Project-Detail, Workspace-Detail). Die beiden alten Detail-Seiten werden zu Redirects, keine zweite Pflege mehr nötig. |
| 10 | Playground (`/projects`, divider) | **entfernt.** Operator-Entscheidung nötig (siehe Audit 27.9.): entweder den orphanierten Playground-Code endgültig löschen, oder falls der Chat-Verlauf/Sampling-Feature noch gewollt ist, als Tab in **Chat** (#14) wiederbeleben — aber NICHT mehr als eigener Nav-Punkt unter Workspaces, wo er keinen Bezug hat |
| 11 | Agents (`/agents`) | **eigener Top-Nav-Tab "Agents"** (siehe §6.2) — nicht mehr unter Workspaces |
| 12 | Plugin-Catalog (`/plugins`) | **Integrations** (`/plugins` bleibt als Route, aber `nav.pluginCatalog` → `nav.integrations` umbenannt) — der Name wird an die tatsächliche Funktion angeglichen (Katalog + Active Deployments, siehe §5) |
| 13 | Plugin-Settings (`/plugins/settings`) | **Tab "Manage"** INNERHALB der Integrations-Seite statt eigener Route — die Seite hat bereits Catalog+ActiveDeployments+Installed-Shelf, "Settings" ist der vierte Tab derselben Fläche, kein Seitenwechsel nötig |
| 14 | Subagent-Approvals (`/subagents/approvals`) | **eigener Top-Nav-Tab "Agents"**, Tab "Approvals" |
| 15 | Tool-Call-Inspector (`/subagents/tool-calls`) | **eigener Top-Nav-Tab "Agents"**, Tab "Tool Calls" |
| 16 | Chat (`/chat`) | **eigener Top-Nav-Tab "Agents"**, Tab "Chat" (oder eigener Tab "Chat" je nach Traffic — siehe §7) |

### 6.2 Ergebnis: Top-Nav-Struktur

```
HEUTE:  Workspaces (16 U-Einträge) │ Platform │ Security │ DBs │ LLM-Proxy

VORSCHLAG:
  Workspaces (6 Einträge: Workspaces, Apps, SSH-Endpoints, Integrations, Settings, + Project-
              Detail-Tabs für Network-Editing/Secrets/Deployments/Integrations)
  Agents     (NEU, 4 Einträge: Agents, Chat, Approvals, Tool Calls — heute unmotiviert unter
              Workspaces versteckt)
  Platform   (unverändert)
  Security   (unverändert)
  DBs        (unverändert)
  LLM-Proxy  (unverändert)
```

**Warum ein eigener "Agents"-Tab:** Agents/Chat/Subagent-Approvals/Tool-Call-Inspector haben mit
Workspace-Infrastruktur (SSH, Container, Netzwerke) inhaltlich nichts zu tun — sie sind LLM-
Betriebsfläche, genau wie LLM-Proxy schon ein eigener Tab ist. Sie liegen heute nur unter
Workspaces, weil `PROJECT_BASES` in `section-nav.ts` historisch `/agents`, `/chat`, `/subagents`
mit aufgenommen hat (Zeile 67) — technische Bequemlichkeit, kein IA-Grund. Das war vermutlich auch
ein Haupttreiber der Operator-Verwirrung: "Agents" klingt nicht nach "Workspace"-Unterpunkt.

### 6.3 Was auf Project-Detail (`/workspaces/projects/:id`) landet

Statt eigener Top-Nav-Einträge für Network-Editing und (Teile von) Deployments: Project-Detail
bekommt die Tabs **Overview | Apps & Deployments | Secrets | Integrations | Network | IaC** — eine
Erweiterung der bereits bestehenden Tab-Struktur (§3), bei der der "Apps & Deployments"-Tab die
VOLLE `ActiveDeploymentsSection`-Komponente einbettet (mit echten Actions) statt der heutigen
Read-only-Mini-Tabelle — eine Komponente, zwei Einbettungsorte (Mandate-11-Geist: "logic once,
thin adapters", bereits so für `WorkspaceDeployDialog` gemacht).

---

## 7. Was ausdrücklich GETRENNT bleiben soll (nicht über-mergen)

- **SSH-Endpoints bleibt eigenständig.** Es ist Infrastruktur-Registry (Credentials, Hosts), kein
  App-/Deployment-Konzept — würde es in "Apps" oder "Integrations" wandern, verschwimmt die
  Trennung zwischen "wo kann ich deployen" und "was läuft". Aktuell schon sauber getrennt, keine
  Änderung nötig außer Nav-Position.
- **`/networks` (Platform-Tab, Headscale-Mesh) bleibt getrennt von `/workspaces/networks`
  (Projekt-VLAN).** Das ist bereits im Code kommentiert (section-nav.ts Z. 64–65, NetworkEditingPage
  Z. 21–23) und ein bewusster, korrekter Schnitt — zwei verschiedene Netzwerk-Ebenen (Mesh-Overlay
  vs. Docker-Bridge pro Projekt), keine Nutzerverwirrung dazu wurde berichtet.
- **App-Discovery bleibt eine bewusste Aktion, kein Live-Dashboard**, auch wenn es als Tab unter
  Apps wandert (§6.1 #6) — es ist ein einmaliger Scan-Trigger (`POST /api/servers/discover`), kein
  laufender Datenfeed; sollte NICHT so gestaltet werden, dass es wie ein Auto-Refresh-Dashboard
  aussieht (Mandate 2: keine Fake-Liveness vortäuschen).
- **Plugin-Settings-Inhalt bleibt funktional getrennt von Plugin-Catalog**, auch wenn er zum Tab
  wird (§6.1 #13) — "was kann ich installieren" (Marketplace-Denken) und "was habe ich konfiguriert"
  (Verwaltungs-Denken) sind unterschiedliche mentale Modelle; ein Tab-Wechsel erhält das, ein
  Zusammenwerfen in eine einzige Liste würde es verwischen.
- **Browser-Integration bleibt ein Modal/Dialog-Schritt, nie eine eigene Seite** — es gibt dafür
  keinen dauerhaften Zustand zum Anzeigen (es IST der Auswahl-Dialog für einen Deploy), eine eigene
  Route würde eine Dauerhaftigkeit vortäuschen, die nicht existiert.
- **Chat bekommt ggf. einen eigenen Tab statt Unter-Tab von Agents** — abhängig davon, ob der
  Operator Chat als Alltags-Tool (hohe Frequenz) oder als Agent-Debug-Werkzeug (niedrige Frequenz)
  nutzt; das ist eine Nutzungsfrequenz-Frage, keine Architektur-Frage, und sollte kurz mit dem
  Operator abgestimmt werden, bevor es fest unter "Agents" versenkt wird.

---

## 8. Sequenzierung / Abhängigkeiten (damit die Umsetzung nicht ins Leere läuft)

1. **Zuerst:** SPRINT-139-Kollision auflösen (§1) — Sprint-Registry bereinigen, entscheiden ob/wie
   `feat-app-panel` gemerged wird. Ohne diesen Schritt baut man den `AppPanelDrawer`-Vorschlag
   (§6.1 #9) auf einer Fläche auf, die der Operator noch gar nicht sieht.
2. **Dann:** Der zweite/dritte Nav-Quellen-Fund (§2) — `HierarchySidebar.NAVIGATION_ITEMS` und
   `command-palette.tsx` sollten aus `section-nav.ts` generiert werden (oder zumindest denselben
   Datensatz importieren) statt drei unabhängige Listen zu pflegen. Sonst wiederholt sich das
   IA-Problem in sechs Monaten identisch, nur mit neuen Einträgen.
3. **Dann erst:** die konkreten Seiten-Merges aus §6 (Project-Detail-Tab-Erweiterung, Integrations-
   Umbenennung, Deployments-Route-Redirects).

---

## 9. Zusammenfassung der Dateien, die diese Analyse stützen

- `src/frontend/src/lib/section-nav.ts` (260 Z., vollständig gelesen)
- `src/frontend/src/App.tsx` (Routen-Block, Z. 527–761)
- `src/frontend/src/components/sidebar/HierarchySidebar.tsx` (Z. 232–265, `NAVIGATION_ITEMS`/`EVENTS_ITEMS`)
- `docs_dev/AUDIT-2026-09-27-FRONTEND-INTEGRATION-GAPS.md` (vollständig gelesen)
- `docs/PROMPTS-STITCH-DESIGN.md` + `design-assets/stitch/jimesh-integrations-and-plugins.html`
- `docs/ARCHITECTURE.md` §8 (Z. 268–427)
- `docs/sprints/SPRINT-139-WORKSPACE-LIFECYCLE.md` (untracked)
- `git show 63899f7 --stat` (Branch `feat-app-panel`, nicht Ancestor von HEAD)
- Views: `WorkspacesPage.tsx`, `WorkspaceDetailPage.tsx`, `ProjectDetailPage.tsx`,
  `WorkspaceAppsPage.tsx`, `WorkspaceDeploymentsPage.tsx`, `DeploymentDetailPage.tsx`,
  `AppDetailPage.tsx`, `AppDiscoveryPage.tsx`, `WorkspaceEndpointsPage.tsx`,
  `WorkspaceSettingsPage.tsx`, `NetworkEditingPage.tsx`, `PluginCatalogPage.tsx`,
  `PluginSettingsPage.tsx`, `DatalakePage.tsx`
- Components: `components/plugins/ActiveDeploymentsSection.tsx`,
  `components/workspaces/BrowserRuntimeModal.tsx`
