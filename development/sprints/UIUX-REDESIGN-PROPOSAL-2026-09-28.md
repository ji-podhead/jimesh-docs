# UI/UX-Redesign-Vorschlag — Top-Navbar → Tab-Strip, Sidebar-Dashboards, Security-Reorg

**Datum:** 2026-09-28. **Auftrag:** Leo (Operator), verbatim in der Aufgabenstellung zitiert — komplette
IA-Neuordnung von Top-Navbar + Sidebar, weil "Höllenchaos": Duplikate, tote Routen, Secrets unter Security
während SIEM daneben liegt, OPNsense immer sichtbar obwohl nicht deployed.

**Status dieser Datei:** READ-ONLY-Analyse + Vorschlag. Keine Code-Datei in `jimesh` wurde angefasst. Eine
andere Session committet PARALLEL SSOT-Cleanup-Wellen (SPRINT-140/142/146) in genau den Dateien, die dieser
Vorschlag beschreibt (`section-nav.ts`, `HierarchySidebar.tsx`, `App.tsx`, `command-palette.tsx`) — **jede
Zeilennummer hier ist ein Snapshot vom 28.9., ~Vormittag.** Jeder Build-Agent, der eine Phase unten
übernimmt, MUSS die Datei vor dem Edit frisch lesen und die zitierte Zeile gegen den aktuellen Stand
verifizieren (Memory-Regel "verify before claim") — nicht blind patchen.

**Aufbau dieser Datei:** Abschnitt 2 ist der verifizierte Ist-Zustand (Grundlage für alles Weitere).
Abschnitte 3–8 beantworten Leos 7 nummerierte Punkte, in seiner Reihenfolge, mit **einer** Entscheidung pro
Frage — keine Optionsliste. Abschnitt 9 ist der Ausführungsplan, phasiert und gegen die aktuell laufende
SSOT-Welle sequenziert.

---

## 1. Gelesene Grundlagen (nicht neu hergeleitet, hier zitiert)

- `/home/ji/projects/ihc24/SSOT-PLAN-2026-09-28-FRONTEND.md` (889 Z.) — Component-Inventar, Duplikat-Cluster
  1–16, Dialog-Familien-Deep-Dive, Phase A (13 sofort löschbare Dateien), Phase B (Konsolidierungen B1–B7),
  Phase C (Operator-Entscheidungen C1–C7 mit Empfehlung), Phase D (protected/in-flight). **Dieser Vorschlag
  dupliziert die Inventarisierung NICHT** — er zitiert SSOT-Items per ID (z. B. "Cluster 16", "C6", "A1").
- `/home/ji/projects/ihc24/HANDOFF-2026-09-28-FINAL.md`, `OPEN-ITEMS-2026-09-28.md`,
  `PROMPTS-VS-DELIVERY-AUDIT-2026-09-28.md`, `VERIFY-2026-09-28-SIDEBAR-WORKSPACE-SPRINT139-STATE.md` —
  Stand der laufenden Agent-Wellen, Standing Mandates, "nie gebaut"-Liste, Nav-IA-Historie (e348871-Fake-Fix,
  SPRINT-141-Onboarding-Move, SPRINT-140-PART-2-Agents→Plugins-Fusion).
- `src/backend/internal/gateway/node_services.go` (629 Z., SPRINT-142) — volle Datenform der
  Deployment-Registry, im Detail in Abschnitt 2.4.
- `src/frontend/src/views/SSHTargetDetailPage.tsx` (455 Z.) — der einzige existierende Frontend-Konsument
  der Registry, Referenzmuster für Abschnitt 7.
- `src/frontend/src/lib/section-nav.ts` (295 Z.), `src/frontend/src/components/sidebar/HierarchySidebar.tsx`
  (1607 Z., Header-Kommentar Z. 60–156), `src/frontend/src/App.tsx` (797 Z., `Navbar()` Z. 267–452) — der
  komplette aktuelle Ist-Zustand, live gelesen (nicht aus Doku übernommen).
- `src/frontend/src/views/DashboardBuilderPage.tsx` (273 Z.) und `DashboardsPage.tsx` (139 Z.) — die beiden
  existierenden "Dashboard"-Konzepte, Grundlage für Abschnitt 4.
- `src/frontend/src/views/FirewallProviderSetupPage.tsx` (Kommentar Z. 44–67) — Beweis, dass OPNsense als
  Backend-Provider **überhaupt nicht existiert** (Abschnitt 6).

---

## 2. Ist-Zustand (live verifiziert, 28.9., Vormittag)

### 2.1 Die Top-Navbar (`App.tsx:267-452`, Funktion `Navbar()`)

Kein separates Navbar-File — `Navbar()` lebt inline in `App.tsx`. Struktur (Desktop, `md:flex`):

| Element | Zeile | Was |
|---|---|---|
| `<Brand/>` | 291 | JiMesh-Logo + Wordmark, Link `/` |
| 5 Tabs aus `navGroups` | 296-326 | Label-Link (navigiert zur `group.to`-Seite) + Chevron-Dropdown (rendert `group.items`) — **das ist bereits die Tab+Dropdown-Grundform**, die Leo als Filer/Tab-Leiste will, nur global statt pro geöffneter Seite |
| Admin-Marker | 327-345 | `/admin`, eigener Link, `SHOW_ADMIN_NAV`-Flag |
| Command-Palette-Button | 351-359 | `⌘K`/`Ctrl K`, öffnet `<CommandPalette/>` (App.tsx:782) |
| `<SecurityNotificationsBell/>` | 363 | echte SIEM/Checkov/Guard-Findings, TASK-064 |
| `<LanguageSwitcher/>` | 364 | Locale-Wahl |
| Account-Dropdown | 365-386 | `AccountMenuItems`: Upgrade (falls unlicensed), Settings (öffnet `SettingsDialog`), Change-Email/-Password, Sign-out |
| Mobile-Menü | 388-443 | dieselben Inhalte zusammengefasst in EINEM Dropdown (`md:hidden`) |

Layout-Fakt (`App.tsx:540-546`): `<Navbar/>` und `<HierarchySidebar/>` sind Geschwister in einer Flex-Row
unter `<AuthGate>`; die Sidebar ist NICHT Teil der Navbar-Komponente.

### 2.2 `lib/section-nav.ts` — die "eine kanonische" Top-Nav-Registry (5 Gruppen)

| Gruppe (`navGroups`) | `to` | Items (Anzahl) |
|---|---|---|
| Workspaces (`nav.workspaces`) | `/workspaces` | 15 (`workspaceItems`, Z. 120-156) |
| Platform (`nav.platform`) | `/control-planes` | 5 (`platformItems`, Z. 161-176) |
| Security (`nav.security`) | `/security/overview` | 15 (`securityItems`, Z. 184-223) |
| DBs (`nav.dbs`) | `/dbs/backups` | 3 (`dbItems`, Z. 229-233) |
| LLM-Proxy (`nav.llmProxy`) | `/config` | 8 (`proxyItems`, Z. 99-115) |

Wichtigster aktueller Fakt für Abschnitt 5: **`securityItems` enthält KEIN SIEM-Item.** Die 15 Einträge sind
overview/exposure/waf-matrix/firewall-provider-setup/firewall-traffic/firewall-opnsense/**secrets** (Z. 198,
`nav.projectSecrets`)/events/audit-log/scans/testing/agent-scan/traces/notifications/dlp. SIEM
(`/security/siem`) taucht in `section-nav.ts` **nirgends** auf.

### 2.3 `HierarchySidebar.tsx` — die zweite Registry + der Baum

Eigener Header-Kommentar (Z. 60-156) beschreibt die aktuelle Anatomie top→bottom:

- **B "ALL SSH TARGETS"** — Baum Server → Workspaces → Apps, default eingeklappt.
- **C "PROJECTS"** — Baum Project → Workspaces → Apps, default offen. B/C sind die zwei §8.2-Achsen,
  GLEICHZEITIG sichtbar (kein Umschalter).
- **D "Navigation"** — 5 flache Links (`NAVIGATION_ITEMS`, Z. 246-252): `/workspaces/apps`, `/plugins`,
  `/workspaces/deployments`, `/workspaces/endpoints`, `/workspaces/settings`. Darüber: `<ActiveAppsDropdown/>`
  (Z. 1415-ish).
- **E "Events & Observability"** — 6 flache Links (`EVENTS_ITEMS`, Z. 271-282): `/security/firewall-rules`
  (`sidebar.securityFirewall`), **`/security/siem`** (`sidebar.securitySiem`), `/networks`
  (`sidebar.networkMonitoring`), `/security/scans/sast`, `/security/scans/dast`, `/security/audit-log`.
  Default eingeklappt, mit Badge (echte SIEM-Event-Zahl).
- **A Scope-Bar** — ganz unten, sticky, Multi-Select-Checkbox-Tree (Server-Achse + Project-Achse) + Admin-
  `WorkspaceSwitcher`.

**Bonus-Fund (nicht in SSOT-PLAN so benannt, hier neu):** `/security/firewall-rules` (Sidebar E, Z. 272,
`FirewallRulesPage.tsx`, 694 Z.) ist eine VIERTE, eigenständige Firewall-Seite — zusätzlich zu den DREI in
`section-nav.ts`'s `securityItems` (`/security/firewall/provider-setup`, `/security/firewall/traffic`,
`/security/firewall/opnsense`). Vier Firewall-Routen, in zwei verschiedenen Registern, ohne dass eine der
beiden Registries von der anderen weiß. Siehe Abschnitt 5, Eintrag "Firewall-Cluster".

**Servers-Sektion enthält bereits (SPRINT-141, Z. 254-266) genau einen Eintrag** (`SERVERS_SECTION_ITEMS`):
`/onboarding` — Leos frühere Forderung "Onboarding soll bei Servers rein" ist umgesetzt. Das ist das Muster,
das Abschnitt 4 und 6 für neue kontextuelle Einträge wiederverwenden.

### 2.4 SPRINT-142 Deployment-Registry — die Datenform, die Abschnitt 6 antreibt

`node_services.go` (629 Z., Kommentar Z. 1-49 zitiert Leos Auftrag verbatim: "wieso haben wir keine health
checks … wenn wir sachen deployen … dann müssen wir auch keine health checks laufen lassen wenn da sowieso
nix da ist"). Drei Routen (noch nicht in `gateway.go` registriert — Parent-Aufgabe, wie bei `suricata.go`):

```
POST /api/node-services                    — Deploy-Ergebnis aufzeichnen (service key ODER admin)
GET  /api/node-services?node=<name>        — Inventar EINES Nodes (session-lesbar)
POST /api/node-services/{id}/health-check  — SSH-Probe EINER aufgezeichneten Zeile (nur Session/Admin)
```

Wire-Shape (aus `SSHTargetDetailPage.tsx:68-81`, `interface NodeService`):

```ts
{ id, node, service, gitSha, ansibleRc, status: 'deployed'|'failed'|'unknown',
  deployedAt, lastHealthAt, health: 'ok'|'degraded'|'down'|'unknown', lastError, source: 'cli'|'api' }
```

Entscheidende Eigenschaften für das Nav-Design (Abschnitt 6):

1. **Pro Node, nicht global.** `GET` braucht `?node=`. Es gibt keinen "ist X irgendwo deployed"-Endpoint.
   `SSHTargetDetailPage.tsx:87-96` (`fetchNodeServices`) zeigt das existierende Aggregations-Muster: mehrere
   Node-Namen abfragen, per `id` mergen. Das ist die Vorlage für eine plattformweite Aggregation.
2. **`service` ist ein freier String**, validiert gegen `^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$`
   (`nodeServiceNameRe`, Z. 217) — die Konvention ist der `deploy/<service>/`-Ordnername
   (Kommentar Z. 47-49: "Container matching follows the deploy playbooks' real naming convention
   (jimesh-<service>, deploy/*/defaults.yml)"). D. h. der Schlüssel für "ist Suricata deployed" ist der
   String `"suricata-network-ids"` (der echte Ordnername unter `deploy/`), nicht ein Freitext-Label.
3. **`status` kommt vom Deploy-Lauf** (ansible-rc), **`health` kommt von einer SSH-Probe** (Docker-Container-
   State ODER systemd-Unit — `deriveNodeServiceHealth`, Z. 398-439). Ein Service ohne jemals gelaufenen
   Health-Check hat `health: 'unknown'`, `lastHealthAt: ''`.
4. **Es füllt sich nur, wenn `make redeploy` tatsächlich lief** (der CLI-Hook `record-deploy.sh`, im
   Kommentar erwähnt, Z. 21) — kein automatisches Backfill für vergangene Deploys. **Das heißt: die Registry
   ist heute für die meisten Nodes leer**, bis der Hook einmal für jeden Service durchgelaufen ist. Das ist
   in Abschnitt 6 die zentrale Einschränkung des Konzepts.
5. `deploy/` enthält aktuell (verifiziert per `ls`): `ansible, ansible-runner, backend, datalake,
   deployments, falco-gvisor-integration, frontend, grafana, headscale, headscale-client(+3 Varianten),
   keycloak, operator-user, ozone, podhead-client, postgres, redis, router-bootstrap, scan, siem,
   ssh-allowlist, suricata-network-ids, tetragon, threat-responder, traefik, vault`. **Kein `opnsense`-
   Ordner** — bestätigt Abschnitt 6.

---

## 3. Top-Bar → Tab-Strip (Leos Punkt 1)

### 3.1 Entscheidung

Die 5 `navGroups`-Tabs + ihre Dropdowns (`App.tsx:296-326`) werden durch einen **Browser-Tab-artigen Strip
offener Seiten** ersetzt. Die Navigation selbst (wohin man klicken kann) bleibt komplett in
`section-nav.ts` + `HierarchySidebar.tsx` — der Tab-Strip zeigt nur, WAS gerade offen ist, nicht WAS
existiert. Das trennt zwei Dinge, die die jetzige Navbar verschmilzt: "Wo kann ich hin" (bleibt Sidebar/
Sub-Navbar-Sache) und "Was habe ich gerade offen" (wird der Tab-Strip).

### 3.2 State-Modell

```ts
interface OpenTab {
  id: string            // stabil pro (path ohne dynamische Query-Params)
  path: string           // die volle Route inkl. :id-Segmente
  labelKey?: string      // wenn die Route aus section-nav/HierarchySidebar kommt (statischer Titel)
  labelText?: string     // wenn die Route ein dynamischer Detail-Titel ist (z.B. Workspace-Name)
  pinned: boolean
  lastVisitedAt: number  // für LRU-Eviction unangepinnter Tabs
}
interface TabStripState {
  tabs: OpenTab[]
  activeTabId: string | null
}
```

- **Ein Tab pro besuchter Route**, dedupliziert nach `path` (Query-Strings NICHT Teil des Dedupe-Keys —
  `/workspaces/ws/123?foo=1` und `/workspaces/ws/123` sind derselbe Tab, sonst wächst der Strip bei jedem
  Filter-Klick).
- **Pin = überlebt Navigation weg und zurück**; unangepinnte Tabs werden LRU-evictiert, wenn die Strip-Breite
  eine konfigurierte Obergrenze überschreitet (z. B. 12 offene Tabs) — genau wie ein Browser.
- **Detail-Seiten bekommen einen echten Titel, keine UUID**: dieselbe Regel, die die Sidebar für Workspace-
  Namen schon anwendet (§8.3b, `HierarchySidebar.tsx` Z. 143-147, "WORKSPACE NAMES … never the UUID"). Ein
  Tab für `/workspaces/ws/<uuid>` zeigt den §8.3b-Displaynamen, nicht die UUID — dieselbe Resolution-Logik
  (GET /api/users + ownerUserId-Cross-Reference) wird vom Tab-Strip wiederverwendet, nicht neu gebaut.

### 3.3 Persistenz

**localStorage, key `jimesh.tab-strip`**, NICHT Backend. Begründung: Tabs sind ein reines Client-UI-
Artefakt (wie Browser-Tabs selbst) — kein Team-Mitglied muss die offenen Tabs eines anderen sehen, es gibt
keine Multi-Device-Sync-Anforderung in Leos Brief, und jede Backend-Persistenz hier wäre eine neue Tabelle
für ein Feature, das noch niemand angefordert hat. Genau das Muster, das `DashboardBuilderPage.tsx:82`
(`STORAGE_KEY = 'jimesh.builderLayout'`) bereits für ein sehr ähnliches "meine UI-Anordnung"-Problem
etabliert hat — Wiederverwendung des Musters, keine neue Mechanik.

Falls Leo später Multi-Device-Sync will: dieselbe Migration wie in Abschnitt 4.4 vorgeschlagen (localStorage
zuerst, Backend-Tabelle als Phase 2, wenn der Bedarf real ist) — nicht vorab bauen.

### 3.4 Interaktion mit Routing

- **Jede Navigation (Sidebar-Klick, Tab-Strip-eigener Klick, direkter Link, Browser-Back/Forward) reused
  einen existierenden Tab für denselben `path`**, öffnet NIE einen zweiten Tab für dieselbe Route. Das ist
  die Browser-Tab-Semantik (ein Browser-Tab navigiert auch nur um, er dupliziert sich nicht bei jedem Klick
  auf einen bereits offenen Link).
- **Ein Sidebar-Klick auf eine NEUE Route** (noch kein Tab offen) fügt einen neuen unangepinnten Tab ganz
  rechts an und aktiviert ihn.
- **Schließen eines Tabs** navigiert zum vorherigen aktiven Tab (Browser-Verhalten), nicht zu `/overview`.
- **Pin-Klick** setzt `pinned: true`; angepinnte Tabs sortieren sich links vor unangepinnten, überleben
  Browser-Reload (aus localStorage rehydriert) und werden nie automatisch evictiert.

### 3.5 Was GLOBAL bleibt — die Sub-Navbar

Leo erlaubt explizit eine schmale globale Leiste für Dinge, die nicht pro Tab Sinn ergeben. Geprüft, was
heute in der Navbar wirklich global ist (nicht: "was könnte man dort hinlegen") — Ergebnis, mit Begründung
pro Punkt:

| Element (heutige Zeile) | Bleibt global? | Begründung |
|---|---|---|
| `<Brand/>` (App.tsx:291) | **Ja** | Logo/Home-Link ist per Definition tab-unabhängig |
| Command-Palette-Button (App.tsx:351-359) | **Ja** | ⌘K ist die Cross-Cutting-Suche über ALLE Routen — genau Leos eigenes Kriterium "global search" |
| `<SecurityNotificationsBell/>` (App.tsx:363) | **Ja** | Explizit so gebaut: "reachable from anywhere in the app — not buried in a logs page" (TASK-064-Kommentar, Z. 360-362). Ein Tab-Strip würde das Gegenteil bewirken |
| `<LanguageSwitcher/>` (App.tsx:364) | **Ja** | Locale ist eine Session-weite Einstellung, kein Seiteninhalt |
| Account-Dropdown (Settings/Logout/Upgrade, Z. 365-386) | **Ja** | Nutzer-Identität/Session-Aktionen sind per Definition nicht pro Tab |
| Admin-Marker `/admin` (Z. 327-345) | **Nein — wird ein normaler Tab** | Ist einfach eine Route wie jede andere (die visuelle Abtrennung war nur, weil es früher kein Tab-Konzept gab); Sidebar/Command-Palette bekommen stattdessen einen `/admin`-Eintrag |
| Die 5 `navGroups`-Tabs selbst (Z. 296-326) | **Nein — werden zu Sidebar/Sub-Navbar-Einträgen** | Das ist die eigentliche Ablösung: die 5 Gruppen ENTHALTEN die Navigationsstruktur, die jetzt in die Sidebar wandert (siehe 3.6) |

Ergebnis: Die Sub-Navbar bleibt fast unverändert schmal — Brand, ⌘K, Notification-Bell, Language-Switcher,
Account-Menü. Nur der Admin-Marker verliert seinen Sonderstatus.

### 3.6 Wohin wandert die `navGroups`-Struktur?

Die 5 Top-Level-Gruppen (Workspaces/Platform/Security/DBs/LLM-Proxy) sind der Rahmen, den auch die
`SectionRail`-Kommentare referenzieren (`section-nav.ts:49-53`: "App.tsx's top navbar consumes it for the
tabs and dropdowns; the SectionRail … consumes it for the right-edge section rail" — die SectionRail ist laut
`App.tsx:543` bereits **entfernt** ("the old right-edge SectionRail is GONE"), `section-nav.ts` ist also
schon jetzt NUR NOCH von der Navbar konsumiert, kein zweiter Renderer mehr). Empfehlung: `navGroups` wird
zur **Top-Level-Gliederung der Sidebar selbst** — fünf collapsible Sidebar-Sections (Workspaces / Platform /
Security / DBs / LLM-Proxy), analog zu den existierenden B/C/D/E-Sections, VOR der heutigen "Navigation"-
Sektion D. Das ist kein neuer Mechanismus: `renderSectionLinks()` (HierarchySidebar.tsx, an mehreren Stellen
z. B. Z. 1350/1440/1455) rendert bereits genau diese Art flacher Listen — die 5 `navGroups` werden 5 weitere
Aufrufe derselben Funktion, keine neue Rendering-Logik. `lib/section-nav.ts` bleibt die SSOT-Datenquelle
(einzige Änderung: `Navbar()` in `App.tsx` konsumiert sie nicht mehr, `HierarchySidebar.tsx` übernimmt).

---

## 4. Sidebar "Dashboards"-Sektion (Leos Punkt 2)

### 4.1 Was es schon gibt — und warum es NICHT reicht

Zwei existierende "Dashboard"-Konzepte, geprüft (SSOT-Cluster 15 nennt 5 "Dashboard"-Namen insgesamt, hier
nur die zwei relevanten):

- **`DashboardBuilderPage.tsx` (/builder, 273 Z.)** — EIN Card-Layout pro Browser (`localStorage
  jimesh.builderLayout`, Z. 82), Katalog aus genau 5 fest codierten Karten (`ALL_CARDS`, Z. 36-72:
  deployed-projects, running-apps, security-summary, networks-summary, secrets-summary), Add/Remove/Reorder,
  ein "Reset to default"-Button (Z. 110-112, `DEFAULT_LAYOUT`). **Kein Multi-Dashboard-Konzept** — es gibt
  nur EINE gespeicherte Anordnung, keine Namen, kein Duplizieren, keine Presets.
- **`DashboardsPage.tsx` (/dashboards, 139 Z.)** — komplett anderes Konzept: Launcher für Third-Party-Embeds
  (Grafana/Wazuh/Ozone-Recon über `/embed/{name}`, SPRINT-57), datengetrieben von `GET /api/embeds`. Kein
  User-Content, keine Presets — das ist ein Katalog externer Tools.

**Entscheidung: `DashboardBuilderPage`'s Karten-Katalog + Colspan-Modell wird die Grundlage für Leos
Multi-Dashboard-Feature — NICHT `DashboardsPage`.** `DashboardsPage` bleibt unverändert (Cluster 15: keine
Code-Verschmelzung nötig, nur Namens-Dokumentation).

### 4.2 Datenmodell

```ts
interface DashboardDef {
  id: string                 // uuid, client-generiert
  name: string                // Nutzer-Titel, z.B. "Meine Übersicht"
  cardIds: CardId[]           // wiederverwendet: DashboardBuilderPage.tsx CardId-Union (Z. 21-26)
  isDefault: boolean          // genau EIN Dashboard trägt das (das wiederherstellbare)
  presetKey?: PresetKey       // gesetzt, wenn aus einem Preset erzeugt — für "erneut aus Preset erstellen"
  createdAt: string
}
type PresetKey = 'default' | 'security-focused' | 'ops-focused'  // Startset, erweiterbar
```

- **Presets sind Daten, kein Code** — exakt das Muster, das die SSOT-PLAN-Referenzdokumente für
  meshsquad's Team-Presets loben (`presets/{social-media,marketing,...}.json`, PROMPTS-VS-DELIVERY-AUDIT
  §2.2: "Presets as data, not code"). Für JiMesh: ein `DASHBOARD_PRESETS: Record<PresetKey, CardId[]>`-Objekt
  neben `ALL_CARDS` in `DashboardBuilderPage.tsx` (oder ausgelagert nach `lib/dashboard-presets.ts`, wenn es
  über eine Handvoll Einträge wächst) — **kein Server-Roundtrip für Preset-Definitionen**, nur für die
  Nutzer-Dashboards selbst (siehe 4.4).
- **Karten-Katalog (`ALL_CARDS`) bleibt exakt wie heute** — 5 Karten, jede an eine reale Query gebunden
  (`DeployedProjectsCard`, `RunningAppsCard`, `SecuritySummaryCard`, `NetworksSummaryCard`,
  `SecretsSummaryCard`, alle unter `components/builder/`). Neue Karten (z. B. eine SIEM-Card, siehe
  Abschnitt 8) erweitern `ALL_CARDS`, nicht das Dashboard-Datenmodell.

### 4.3 UI: Dropdown, nicht Liste

Neue Sidebar-Section **"Dashboards"**, direkt UNTER der bestehenden "Navigation"-Sektion D (gleiche
Flat-Link-Optik wie `NAVIGATION_ITEMS`/`SERVERS_SECTION_ITEMS`), mit einem **Dropdown-Header** statt
Flat-Links:

```
▾ Dashboards
   [Meine Übersicht ▾]   ← aktuell aktives Dashboard, Klick öffnet Dropdown:
       ✓ Meine Übersicht (Default)
         Security-Fokus
         + Neues Dashboard …
         + Aus Preset erstellen …
         ─────────────
         [🗑] Default-Dashboard löschen
```

Begründung Dropdown statt Liste: Leo nennt selbst "dropdown" im Brief ("wir erstellen … einen neuen sidebar
section für eigene dashboards mit einem dropdown"). Eine Liste würde bei >3 Dashboards die Sidebar-Höhe
sprengen — das Dropdown hält die Sektion konstant klein, konsistent mit `ActiveAppsDropdown` (bereits
existierendes Sidebar-Dropdown-Pattern, Cluster 11) und `WorkspaceSwitcher` (ebenfalls ein Sidebar-Dropdown).
Klick auf einen Dashboard-Namen navigiert zu `/builder?dashboard=<id>` (Query-Param, kein neuer Routen-Pfad
— `DashboardBuilderPage` liest `dashboard` aus der URL und lädt den passenden `DashboardDef` statt des
einen globalen Layouts).

### 4.4 "Default-Dashboard löschen, später aus Presets neu erstellen" — operativ

1. **Löschen:** Der Eintrag mit `isDefault: true` kann wie jedes andere Dashboard gelöscht werden (Leos
   Wort: "was man aber auch löschen kann"). Löschen entfernt NUR die `DashboardDef`-Zeile — es gibt danach
   möglicherweise 0 Dashboards.
2. **0-Dashboards-Zustand:** `DashboardBuilderPage` zeigt einen ehrlichen Empty-State (kein Fake-Fallback)
   mit genau zwei Buttons: "Default-Dashboard wiederherstellen" (erzeugt sofort ein neues `DashboardDef`
   mit `presetKey: 'default'`, `isDefault: true`, `cardIds: DEFAULT_LAYOUT`) und "Aus Preset erstellen"
   (öffnet die Preset-Auswahl aus 4.2).
3. **"später als default dashboard wieder aus den presets erstellen"** heißt konkret: der `'default'`-Preset
   ist einfach EIN Eintrag in `DASHBOARD_PRESETS` wie jeder andere — es gibt keinen Sonderpfad, der
   Default von einem selbstgebauten Preset unterscheidet, außer dem `isDefault`-Flag auf der resultierenden
   Instanz. Das hält die Operation trivial: "Preset X anwenden" ist immer derselbe Code (`cardIds:
   DASHBOARD_PRESETS[key]`), egal ob X der System-Default oder ein eigenes Preset ist.
4. **Eigene Presets speichern:** ein Button "Als Preset speichern" auf einem bestehenden Dashboard schreibt
   dessen aktuelle `cardIds` unter einem nutzergewählten Namen in denselben `DASHBOARD_PRESETS`-Store (siehe
   4.5 für WO).

### 4.5 Persistenz — Phasenmodell (nicht alles auf einmal)

- **Phase 1 (dieser Vorschlag, sofort baubar): localStorage**, key `jimesh.dashboards` (Array von
  `DashboardDef`) + `jimesh.dashboard-presets` (nutzerdefinierte Presets, System-Presets bleiben Code-
  Konstanten). Exakt das Muster von `DashboardBuilderPage.tsx:82` fortgeschrieben — kein neuer Server-Code,
  keine Migration, in einem Build-Agent-Durchgang machbar.
- **Phase 2 — durch den Agent/Script-Zugriffs-Nachtrag (4.6) JETZT VERPFLICHTEND, nicht mehr optional:**
  eine Backend-Tabelle nach dem Muster, das `node_services` bereits etabliert (`store.NodeServiceRow` als
  Vorlage) — `user_dashboards(owner_user_id, name, card_ids_json, is_default, preset_key, created_at)` +
  `GET/POST/DELETE /api/dashboards`. **Ursprünglich als "später, nur falls Multi-Device gebraucht wird"
  eingestuft — das gilt nicht mehr**, sobald Agents/Scripts Dashboards lesen/verwalten sollen (Leos
  Nachtrag, 4.6): ein `localStorage`-Key ist von einem Server-Prozess mit einem Consumer-Key aus schlicht
  nicht erreichbar. Phase 1 (UI) und Phase 2 (Backend-Tabelle + SDK) werden dadurch EIN gemeinsamer
  Baustein statt zweier getrennter Stufen — Details der SDK-Seite in 4.6, Ausführung in Abschnitt 9 Phase 3.

### 4.6 Agent-/Script-Zugriff — `jimesh.dashboards`-SDK-Surface (Leos Nachtrag, 28.9. später)

Leos Nachtrag: Dashboards sollen genau wie Secrets heute auch PROGRAMMATISCH lesbar/verwaltbar sein, nicht
nur über die UI. Vorbild geprüft (vollständig gelesen): `src/backend/internal/sdk/secrets/secrets.go`
(155 Z., das `jimesh.secrets.get()`-SDK) und sein Geschwister `src/backend/internal/sdk/logger/logger.go`
(291 Z., das `jimesh-logger`-SDK) — beide folgen exakt demselben Vertrag, den das neue
`jimesh.dashboards`-SDK 1:1 übernimmt, statt einen dritten, eigenen zu erfinden (Leos eigene Dedup-Regel,
Punkt 4, auf SDK-Ebene angewendet).

**Der gemeinsame Vertrag beider Vorbilder (zitiert, nicht neu erfunden):**

- `New()` liest `JIMESH_SERVICE_KEY` (der Consumer-Key, `jimesh-ck-…`, `kind='service'` = Deploy-Zeit-Key
  ODER `kind='user'` = der persönliche Key des Operators) + `JIMESH_GATEWAY_URL` (Default
  `http://jimesh:3010`, Compose-Netzwerk) — fehlt der Key, schlägt die Konstruktion sofort fehl
  ("fail fast at construction/boot", `secrets.go:51-58`, `logger.go:57-64`) statt einen späteren 403
  stillschweigend zu verschlucken.
- Auth: `Authorization: Bearer <key>` auf jedem Request (`secrets.go:125`, `logger.go:217`) — keine zweite
  Auth-Mechanik.
- Scope-Regel (`secrets.go:14-16`, wörtlich): "The kv-storage scope is pinned server-side to the
  authenticated key's own project — passing a kv this key does not own is refused, never silently
  redirected." Genau diese Regel gilt 1:1 für Dashboards.
- Ein `APIError{Status, Message}`-Typ pro Paket, kein String-Matching auf Fehlertexte (`secrets.go:79-84`,
  `logger.go:99-106`).
- Reale HTTP-Calls, kein Mock — Mandate 2 gilt für SDKs genauso wie für UI-Seiten.

**Neues Go-Paket `src/backend/internal/sdk/dashboards/dashboards.go`** (gleiche Struktur, gleiche
Namenskonvention wie `secrets.go`):

```go
// Package dashboards is the jimesh.dashboards SDK client — mirrors
// internal/sdk/secrets on purpose (same env contract, same Bearer-key
// auth, same gateway base URL default): reading/managing a caller's
// dashboards is the same shape of problem as reading a secret, just a
// different resource.
c, err := dashboards.New()                         // JIMESH_SERVICE_KEY + JIMESH_GATEWAY_URL env
list, err := c.List()                               // GET /api/sdk/dashboards
one, err := c.Get("dash-abc123")                     // GET /api/sdk/dashboards?id=dash-abc123
created, err := c.Create("Ops-Blick", []string{"deployed-projects","running-apps"}, "")
err = c.Delete("dash-abc123")                        // DELETE /api/sdk/dashboards?id=dash-abc123
recreated, err := c.ApplyPreset("dash-abc123", "default") // POST /api/sdk/dashboards/{id}/apply-preset
```

**Neue Gateway-Routen** (Registrierung in `gateway.go` bleibt Parent-Aufgabe, gleiche Konvention wie
`node_services.go` Z. 10-13 und `suricata.go`):

```
GET    /api/sdk/dashboards            — Liste der Dashboards des Callers (service-key-Scope oder Session)
GET    /api/sdk/dashboards?id=<id>    — ein Dashboard
POST   /api/sdk/dashboards            — anlegen {name, cardIds[], presetKey?}
DELETE /api/sdk/dashboards?id=<id>    — löschen
POST   /api/sdk/dashboards/{id}/apply-preset  — {presetKey} → cardIds aus DASHBOARD_PRESETS überschreiben
```

**Scope-Regel (wortgleiche Übertragung der Secrets-Regel):** ein `kind='service'`-Key ist an genau EIN
Projekt/Workspace gebunden (Mint-Zeit-Bindung, wie `logger.go:181-183` es für Sessions beschreibt: "a key
for project A cannot mint sessions for project B") — dieselbe Bindung entscheidet servers-eitig, welche
`user_dashboards`-Zeilen ein Service-Key sehen darf: Dashboards, deren `owner_user_id` auf den
Projekt-Owner bzw. das an den Key gebundene Projekt auflöst. Ein `kind='user'`-Key (der persönliche Key des
Operators) sieht stattdessen alle Dashboards des Operators selbst, exakt wie die UI es tut. Kein Fall darf
eine fremde `owner_user_id` lesen oder schreiben — Rückgabe ist ein 403 mit derselben `APIError`-Form, nie
ein stilles Leer-Ergebnis (Mandate 2: ein leeres `[]` bedeutet "diese Person hat 0 Dashboards", nie
"kein Zugriff, aber wir sagen es nicht").

**Kein neuer Server-Mechanismus für die Business-Logik:** `Create`/`Delete`/`ApplyPreset` rufen serverseitig
exakt dieselben Store-Funktionen auf, die auch die `DashboardBuilderPage`-UI aus Abschnitt 4.2-4.4 verwendet
(EINE `user_dashboards`-Tabelle, EIN Satz Handler-Funktionen) — das SDK ist ein zweiter Eingang zur selben
Tür, kein zweites Datenmodell (Leos Dedup-Regel wieder direkt angewendet, diesmal auf Backend-Ebene statt
Nav-Ebene).

---

## 5. Security-Sektion-Reorg (Leos Punkt 3) — Item für Item

### 5.1 Entscheidung: Security bleibt eine Sidebar-Section — aber NEU aufgeräumt, mit klaren Untergruppen

Leo lässt beides zu ("können wir als section komplett abschaffen oder eine eigene security section … machen,
aber dann auch ordentlich"). Entscheidung: **behalten, aber intern in drei klar benannte Untergruppen
teilen**, statt einer 15-Punkte-Flachliste (`securityItems`) plus einer zweiten, inkonsistenten Teilmenge in
der Sidebar (`EVENTS_ITEMS`). Begründung gegen "abschaffen": Security ist mit 15+ Items (plus die 4
Firewall- und SIEM-Reste unten) die zweitgrößte Gruppe im ganzen Produkt — sie aufzulösen würde die Items
irgendwo anders unterbringen müssen, ohne dass ein anderer Ort thematisch passender wäre. Das eigentliche
Problem ist nicht die Gruppe, sondern dass sie **zwei widersprüchliche Register** hat (section-nav.ts vs.
HierarchySidebar EVENTS_ITEMS) und keine interne Struktur.

**Neue interne Gliederung (eine einzige `securityItems`-Quelle in `section-nav.ts`, drei `divider`-getrennte
Blöcke, keine zweite Sidebar-Registry mehr):**

1. **Übersicht & Scans** — Overview, Exposure, WAF-Matrix, Scans (IaC/SAST/DAST), Testing, Agent-Config-
   Scanner, Traces, DLP.
2. **Firewall** — GENAU EIN Eintrag, nicht vier (siehe 5.2).
3. **Secrets** — eigener Top-Level-Punkt, NICHT unter "Übersicht" versteckt (siehe 5.3).
4. **Monitoring & Audit** — SIEM (neu hierher verschoben, siehe 5.4), Security-Events, Audit-Log,
   Notifications.

### 5.2 Der Firewall-Cluster — von 4 Routen auf 1 Nav-Eintrag mit Tabs

Vier Firewall-Seiten existieren, über zwei Register verteilt:

| Route | View | Bisheriges Register | Zeilen |
|---|---|---|---|
| `/security/firewall-rules` | `FirewallRulesPage.tsx` (694 Z.) | NUR HierarchySidebar `EVENTS_ITEMS` | HierarchySidebar.tsx:272 |
| `/security/firewall/provider-setup` | `FirewallProviderSetupPage.tsx` (710 Z.) | NUR section-nav `securityItems` | section-nav.ts:195 |
| `/security/firewall/traffic` | `FirewallTrafficLogPage.tsx` (566 Z.) | NUR section-nav `securityItems` | section-nav.ts:196 |
| `/security/firewall/opnsense` | `OpnsenseFirewallConfigPage.tsx` (449 Z.) | NUR section-nav `securityItems` | section-nav.ts:197 |

**Entscheidung:** EIN Nav-Eintrag "Firewall" (`/security/firewall`), der eine getabbte Seite öffnet (Rules /
Setup / Traffic / OPNsense als Tabs INNERHALB einer Seite — das exakte Muster, das `SecurityScansPage.tsx`
schon für IaC/SAST/DAST verwendet, s. `isActive`-Kommentar `section-nav.ts:178-183`: "Scans gets an
isActive predicate … NavLink's partial match alone would not keep the entry lit"). Das ist Leos eigene
Dedup-Regel aus Punkt 4 direkt angewendet: vier separate Nav-Einträge für eine Sache, die inhaltlich
zusammengehört (alles "Firewall"), werden EIN Eintrag. Die OPNsense-Tab wird zusätzlich service-aware
ausgegraut (Abschnitt 6.3).

### 5.3 Secrets — eigener Top-Level-Punkt

Aktuell: `/security/secrets` (`nav.projectSecrets`, section-nav.ts:198) ist ein Flachpunkt UNTER Security,
gleichrangig mit 14 anderen Items — Leos Beschwerde ("warum ist das unter security aber SIEM dann nicht")
trifft hier exakt zu: Secrets ist formal ein Security-Kind-Item, aber inhaltlich Cross-Cutting (jedes
Projekt braucht es). Zusätzlich existiert ein **zweites** Secrets-Konzept: `/vault-dashboard` (Platform-
Sektion, `nav.vault`, section-nav.ts:167) — laut Kommentar bewusst getrennt ("the embedded vault's per-
project runtime secrets live on in Security → Project Secrets", Z. 158-160) — zwei verschiedene Dinge
(Secrets-ENGINE-Registry vs. Projekt-Secrets), die aber denselben Wortstamm "Secrets/Vault" tragen und daher
für den Operator wie ein Duplikat aussehen.

**Entscheidung:** `/security/secrets` wird EIN eigener Sidebar-Top-Level-Eintrag (nicht mehr Kind von
Security), mit klarem Label "Secrets (Projekte)" — der Namenszusatz löst die Verwechslung mit `/vault-
dashboard` ("Vault (Engines)"), ohne Code zu verschmelzen (SSOT-PLAN dokumentiert das bereits als
"kein Codemerge nötig, aber Namens-/Erwartungs-Kosten", Cluster 15 — dieser Vorschlag zieht daraus die
Konsequenz: wenn schon kein Merge, dann wenigstens sichtbare Trennung durch Platzierung + Label statt zwei
gleich klingende Flachpunkte in verschiedenen Gruppen).

### 5.4 SIEM — der eigentliche Fund

**Beweis (live verifiziert, nicht aus Doku übernommen):** `section-nav.ts`'s `securityItems` (Z. 184-223,
alle 15 Zeilen einzeln gelesen) enthält **keinen** SIEM-Eintrag. `/security/siem` existiert **ausschließlich**
in `HierarchySidebar.tsx`'s `EVENTS_ITEMS` (Z. 273, `sidebar.securitySiem`) — einer Sektion, die laut
Sidebar-Header-Kommentar (Z. 79-81) "Events & Observability" heißt, nicht "Security". Genau Leos Beobachtung:
Secrets ist ein Security-Kind (falsch platziert, siehe 5.3), SIEM ist gar nicht in Security registriert,
sondern in einer komplett anderen Sidebar-Gruppe. Zwei verschiedene Register, zwei verschiedene
Zugehörigkeits-Antworten für zwei Dinge, die beide "irgendwie Security" sind.

**Entscheidung:** SIEM wird ein Security-Item in **section-nav.ts** (neuer Eintrag `/security/siem` im
Block "Monitoring & Audit", 5.1), UND aus `HierarchySidebar.tsx`'s `EVENTS_ITEMS` entfernt. Die "Events &
Observability"-Sidebar-Sektion (E) bleibt für das, was tatsächlich sektionsübergreifend ist:
`/networks` (Mesh + Suricata, siehe C6 unten) und die zwei Scan-Tabs — SIEM ist inhaltlich Security, nicht
Observability über mehrere Bereiche.

### 5.5 C6 aus SSOT-PLAN (Network-Monitoring-Mislabel) — Status hier bestätigen, nicht neu entscheiden

SSOT-PLAN §C6 ist bereits FREIGEGEBEN (W1-Suricata gelandet, `b03e494`) und beschreibt exakt die
Label-SSOT-Lösung für `/networks` (ein Label in beiden Registern statt "Network Monitoring" vs. "Networks").
Dieser Vorschlag übernimmt C6 unverändert — keine neue Entscheidung nötig, nur Ausführungsreihenfolge
(Abschnitt 9, Phase 1 bündelt C6 mit den hier neuen Nav-Edits, weil beide dieselben zwei Dateien anfassen —
"ein Nav-Fenster, alle Zeilen", SSOT-PLAN Z. 238).

---

## 6. Dedup-Regel auf JEDEN aktuellen Nav-Eintrag (Leos Punkt 4)

Leos Regel wörtlich angewendet: *reachable elsewhere ⇒ kein Extra-Eintrag, außer cross-cutting genug für
ein Dropdown.* Klassifikation ALLER Einträge aus `section-nav.ts` (46 Items über 5 Gruppen) und
`HierarchySidebar.tsx` (`NAVIGATION_ITEMS` 5 + `SERVERS_SECTION_ITEMS` 1 + `EVENTS_ITEMS` 6). SSOT-PLAN-
Funde werden per ID zitiert, nicht wiederholt.

### 6.1 KEEP-AS-IS (cross-cutting genug, bleibt eigener Eintrag)

`/workspaces`, `/workspaces/networks` (VLAN-Zuweisung, wird laut C6 umbenannt, Route bleibt),
`/workspaces/apps`, `/workspaces/endpoints` ("Servers"), `/workspaces/settings`, `/plugins` (Integrations,
nach SPRINT-140-Fusion), `/plugins/settings`, `/subagents/approvals`, `/subagents/tool-calls`, `/chat`,
`/control-planes`, `/vault-dashboard`, `/networks`, `/builder`, `/dashboards`, `/security/overview`,
`/security/exposure`, `/security/waf-matrix`, `/security/secrets` (jetzt Top-Level, 5.3), `/security/events`,
`/security/audit-log`, `/security/scans/*`, `/security/testing`, `/security/agent-scan`, `/security/traces`,
`/notifications`, `/security/dlp`, `/dbs/backups`, `/dbs/discovery`, `/dbs/datalake`, alle 8 `proxyItems`
(LLM-Proxy ist ein in sich geschlossenes Werkzeug-Set, jedes Item eigenständig genutzt).

### 6.2 MOVE (bleibt als Feature, wandert an einen anderen Platz)

| Item | Von → Nach | Begründung |
|---|---|---|
| `/onboarding` | bereits bei Servers (SPRINT-141) — **zusätzlich** Sub-Navbar/Sidebar-weite Sichtbarkeit prüfen: heute NUR in `SERVERS_SECTION_ITEMS`, nicht mehr in `section-nav.ts workspaceItems` gegenläufig gepflegt (Doppel-Registrierungspflicht laut Kommentar Z. 125-131 IST bereits erfüllt — kein Move nötig, nur bestätigt) | RM35-Dual-Registrierungs-Pattern korrekt angewendet |
| `/security/firewall-rules`, `/security/firewall/{provider-setup,traffic,opnsense}` | → EIN `/security/firewall`-Eintrag mit 4 Tabs (5.2) | Cluster: 4 Einträge für 1 Konzept |
| `/security/siem` | HierarchySidebar `EVENTS_ITEMS` → `section-nav.ts securityItems` (5.4) | falsche Sektion, wie oben begründet |
| `/security/secrets` | Kind von Security → eigener Top-Level-Sidebar-Punkt (5.3) | Cross-cutting genug (jedes Projekt) |

### 6.3 MERGE-INTO-EXISTING-SURFACE (kein eigener Nav-Eintrag mehr, weil anderswo erreichbar)

**Der Fall, den Leo direkt angesprochen hat — Security Scans (IaC/SAST/DAST):** Über die Gesamt-Navigation
verteilt existieren HEUTE drei separate Link-Objekte für EIN Feature, das seine eigene Unter-Navigation
schon selbst mitbringt:

- `section-nav.ts:205-210` — EIN Eintrag `/security/scans/iac` (`nav.securityScans`) mit einem `isActive`-
  Prädikat, das explizit ALLE drei Scan-Routen abdeckt (Kommentar Z. 178-183: "Scans gets an isActive
  predicate: its entry URL is /security/scans/iac while sast/dast are siblings").
- `HierarchySidebar.tsx:275-276` — ZWEI ZUSÄTZLICHE, separate Einträge in `EVENTS_ITEMS`:
  `/security/scans/sast` (`securityScans.tab.sast`) und `/security/scans/dast` (`securityScans.tab.dast`).

Macht **drei Link-Objekte über zwei Register für eine einzige Seite** — und diese Seite,
`SecurityScansPage.tsx`, hat bereits ihre EIGENE interne Tab-Leiste: `SecurityScansLayout` (Kommentar Z. 75,
Datei-Kommentar Z. 28: "TASK-064 (R41 §C4): SAST & DAST Tabs im Security-Bereich") rendert `<NavLink>`s
(Z. 88-100) + `<Outlet/>` (Z. 103) für exakt IaC/SAST/DAST; `App.tsx:671` registriert die Default-Route
(`<Route index element={<Navigate to="/security/scans/iac" replace />}/>`) unter genau diesem Layout. Die
Seite kann ihre drei Zustände schon selbst umschalten — die zwei Sidebar-Einträge duplizieren eine
Sub-Navigation, die es bereits gibt.

**Entscheidung:** Die zwei `HierarchySidebar.tsx`-Einträge (Z. 275-276, sast/dast) werden GELÖSCHT — sie
sind Leos eigenes Beispiel für "eine Component, die dann wieder woanders drin ist". Es bleibt GENAU EIN
Nav-Eintrag (der bestehende `section-nav.ts`-Eintrag mit dem `isActive`-Prädikat, das schon alle drei
Unterseiten abdeckt), Label wie von Leo vorgeschlagen: **"Static Analysis"** statt des technischeren
"Security Scans" — die Seite selbst übernimmt danach komplett, welcher der drei Tabs aktiv ist.

| Item | Bereits erreichbar über | Aktion |
|---|---|---|
| `/plugins?browser=1` (Browser-Integration) | Bereits ein Modal-Trigger, KEIN eigener Seiteninhalt (SSOT-PLAN Cluster: "kein Nav-Label wert, sondern ein Query-Flag") | Aus `workspaceItems` als sichtbarer Nav-Eintrag entfernen, als Button INNERHALB `PluginCatalogPage.tsx` belassen (Query-Flag-Öffnung bleibt technisch identisch) |
| `/workspaces/deployments` (Deployments) | Erreichbar über Workspace-Zeile im Baum (Sektion B/C) UND als eigener Nav-Punkt in gleich ZWEI Registern (`NAVIGATION_ITEMS` UND `section-nav.ts`) | Bleibt als EIN globaler Eintrag (Deployments-Liste über ALLE Projekte hinweg ist echt cross-cutting — pro Workspace reicht der Baum nicht), ABER aus `NAVIGATION_ITEMS` (Sidebar-Duplikat) entfernen — nur noch `section-nav.ts` (5.1-Analogie: ein Eintrag, nicht zwei) |
| App-Discovery `/projects/discover` | Ergebnis einer Aktion (POST /api/servers/discover), kein eigenständiger Denkraum | KEEP — bleibt, weil der einzige Zugang zu einem echten Backend-Feature (kein Duplikat, nur geprüft und bestätigt) |

### 6.4 DELETE (SSOT-PLAN hat das bereits beschlossen — hier nur zitiert, nicht neu diskutiert)

- Playground-Nav-Eintrag `/projects` (`nav.playground`, section-nav.ts:140) → **C1: löschen** (SSOT-PLAN).
- `/agents`-Eintrag → bereits entfernt (SPRINT-140 PART 2, per aktuellem Codestand bestätigt, Abschnitt 2.2).
- Kommentar-Leichen zu `ScopeSelectorModal` (A1) verschwinden mit, sobald A1 landet.

### 6.5 Kein Dropdown wert (Leos "brauchen wir gar kein dropdown"-Fall)

`ActiveDeploymentsSection` (in `PluginCatalogPage`), `workspace-apps-dropdown` (pro-Workspace) — beide
bereits laut SSOT-PLAN Cluster 11 als "kein Duplikat, verschiedene Scopes" bewertet. Kein Nav-Änderungsbedarf.

---

## 7. Service-Aware Graying — der OPNsense-Fall (Leos Punkt 5)

### 7.1 Der OPNsense-Fall ist KEIN Graying-Fall — er ist ein "Feature existiert nicht"-Fall

Beweis (`FirewallProviderSetupPage.tsx`, Kommentar Z. 44-67, wörtlich zitiert): "ONE implemented provider:
nftables … OPNsense/pfSense … a future provider plugs in here. But NO route stores OPNsense credentials
(POST /api/firewall/providers/opnsense/ … deliberately NOT built)." Zusätzlich: **kein `deploy/opnsense/`-
Ordner** (Abschnitt 2.4, Punkt 5) — es gibt buchstäblich keinen Ansible-Weg, OPNsense jemals zu deployen,
also auch nie eine `node_services`-Zeile mit `service: "opnsense"`. Ein Graying über die SPRINT-142-Registry
würde hier IMMER "nicht deployed" zeigen, für immer — nicht weil OPNsense gerade nicht läuft, sondern weil
niemand je einen Weg gebaut hat, es zu deployen.

**Entscheidung, konkret:** Der OPNsense-Tab (im neuen `/security/firewall`-Eintrag, 5.2) wird **hart
ausgegraut + disabled**, mit Tooltip "OPNsense-Provider ist noch nicht implementiert" — NICHT über eine
dynamische Registry-Abfrage, sondern als **statisches Flag** (`SUPPORTED_PROVIDERS.opnsense.implemented =
false` neben der schon existierenden `PROVIDER_ICON`/`PROVIDER_INFO`-Tabelle in
`FirewallProviderSetupPage.tsx:89-107`). Genau Leos Wortlaut angewendet: "grau es aus, dass man es nicht
anklicken kann, wie wenn gar kein opnsense deployed ist" — der Unterschied zu "andere Services, die z.T.
deployed sind" ist, dass hier die Grau-Bedingung nie `true` wird, bis jemand tatsächlich einen OPNsense-
Provider baut (dann wird das Flag `true`, kein Registry-Query nötig).

### 7.2 Der ECHTE Graying-Mechanismus — für Services, die tatsächlich deploybar sind

Für alles, was einen `deploy/<name>/`-Ordner hat (Abschnitt 2.4, Punkt 5) UND potenziell nicht auf jedem
Node läuft:

```ts
// lib/deployed-services.ts (neu) — EINE Aggregations-Hook, Wiederverwendung des
// SSHTargetDetailPage.tsx:87-96-Musters (fetchNodeServices), nur plattformweit
// statt pro-Target: iteriert über ALLE registrierten SSH-Endpoints
// (useSshEndpoints — bereits ein Hook, workspaces/ssh-target-select.tsx),
// fragt GET /api/node-services?node=<name> pro Endpoint ab, merged in eine
// Map<service, {anyOk: boolean, nodes: string[]}>.
function useDeployedServices(): Record<string, { anyOk: boolean; nodes: string[] }>
```

**Sichtbarkeits-Entscheidung: Grayed+disabled, NICHT versteckt.** Leo lässt beides offen ("ODER zeig im
dropdown … NUR das, was wir wirklich deployed haben"). Begründung für Grayed statt Hidden: ein komplett
verschwundener Nav-Eintrag sieht für den Operator wie ein Bug aus ("wo ist mein Grafana-Link hin") — das ist
exakt die Handoff-Erfahrung, die die ganze SSOT-Aktion ausgelöst hat ("Höllenchaos", Dinge die man nicht
findet). Ein ausgegrauter Eintrag mit Tooltip "nicht auf einem registrierten Node deployed — `make redeploy
SERVICE=<x> NODE=<node>`" ist ehrlich (Mandate 2: kein Fake-Grün) UND auffindbar. Zusätzlich: Mandate 2 gilt
auch andersrum — ein deployed-aber-`health:down`-Service sollte NICHT ausgegraut sein (er ist erreichbar,
nur kaputt) — Graying gilt nur für `status !== 'deployed'` bzw. gar keine Zeile vorhanden, nicht für
`health === 'down'` (das zeigt die Seite selbst mit einem roten Badge, wie `SSHTargetDetailPage.tsx:400-414`
es bereits vormacht).

### 7.3 Welche Nav-Items denselben "optional, je nach Deploy"-Fall haben wie OPNsense — geprüft, nicht geraten

| Item | Genuinely optional-per-node? | Mechanismus HEUTE | Handlungsbedarf |
|---|---|---|---|
| **OPNsense** (Firewall-Tab) | Ja — aber Backend fehlt komplett | Kein Mechanismus (nur UI-Auswahl) | 7.1: statisches Disabled-Flag, kein Registry-Query |
| **Suricata-Panel** (`/networks`, `suricata-ids-panel.tsx`) | Ja, pro Node (host-apt-Install, `deploy/suricata-network-ids/`) | **Bereits ein EIGENER, echter Mechanismus**: `GET /api/suricata/status`, dieselbe SSH-Probe-Familie wie `node_services.go` (Kommentar `node_services.go:70-73`: "The exec default IS suricataExec — one session-runner, not a second implementation") | KEIN neuer Graying-Code nötig — Suricata hat schon einen ehrlichen Empty/Error-State (SSOT-PLAN C6). Mittelfristig: die Suricata-Deploys sollten AUCH als `node_services`-Zeile (`service: "suricata-network-ids"`) aufgezeichnet werden, damit `SSHTargetDetailPage` und das Suricata-Panel dieselbe Quelle zeigen (sonst entsteht ein neues Mini-Duplikat: zwei Wege, "ist Suricata deployed" zu beantworten) |
| **Grafana** (`/dashboards`) | Ja, plattformweit (nicht pro Node, ein Grafana-Stack) | **Bereits gelöst**, andere Mechanik: `GET /api/embeds` (`JIMESH_EMBED_TARGETS`-Config) — `DashboardsPage.tsx` zeigt schon einen ehrlichen Empty-State, wenn nichts konfiguriert ist (Z. 99-109) | Kein Handlungsbedarf — dieser Mechanismus ist bereits Leos Anforderung ("NUR das zeigen was deployed ist"), nur für Embeds statt für Firewall/Suricata |
| **Ozone/S3-Browser** | Ja, plattformweit | `components/workspaces/FileBrowser.tsx` (Agent-C-Feature, in-flight — SSOT-PLAN Phase D) — noch kein Graying-Bedarf, weil noch nicht genavt | Sobald Agent C landet: dessen Nav-Eintrag (wo auch immer er hinkommt) sollte denselben `useDeployedServices()`-Hook konsultieren (`service: "ozone"`) — Phase in Abschnitt 9 |
| **SIEM** (`/security/siem`) | Teils — der Stack ist plattformweit, aber ob er LÄUFT ist unklar (PROMPTS-VS-DELIVERY-AUDIT §2.3: "Live status of the whole stack on trading was never re-checked since 14.9.") | Die Seite selbst zeigt bereits nur echte Events (Mandate 2), aber der NAV-EINTRAG selbst wird nie ausgegraut, wenn der ganze SIEM-Stack down ist | Niedrige Priorität, aber derselbe `useDeployedServices()`-Hook mit `service: "siem"` (bzw. den einzelnen SIEM-Compose-Services) würde den Eintrag ausgrauen können — Phase 3 (Abschnitt 9), nicht P0 |

**Wichtige Erkenntnis, die dieser Vergleich zeigt:** Es gibt in der Codebase heute schon ZWEI verschiedene,
beide legitime "ist X deployed"-Mechanismen — `node_services` (per-Node, SSH-Probe-basiert) und
`GET /api/embeds` (plattformweite Config, kein SSH). Das ist KEIN Duplikat im SSOT-Sinn, sondern zwei
unterschiedliche Fragen: "läuft dieser Service auf DIESEM Node" vs. "ist DIESES externe Dashboard überhaupt
konfiguriert". Der `useDeployedServices()`-Hook aus 7.2 ist NUR für die erste Frage — er ersetzt `/api/embeds`
nicht, er ergänzt es für die Fälle, die `/api/embeds` nicht abdeckt (Suricata, künftig Ozone, künftig SIEM-
Compose-Status).

---

## 8. Was komplett fehlt (Leos Punkt 6)

Cross-Referenz: reale, funktionierende Backend-Features aus den Audit-Dokumenten gegen ALLE aktuellen
Nav-Einträge (section-nav.ts + HierarchySidebar.tsx, vollständig gelesen). Nur Dinge, die Mandate-2-konform
ECHT funktionieren, keine Stubs:

| Feature | Backend-Beweis | Nav-Status HEUTE | Wohin (dieser Vorschlag) |
|---|---|---|---|
| **SPRINT-142 Deployment-Registry selbst** (`node_services.go`, 629 Z.) | 3 echte Routen, Datenform in 2.4 | **NULL** — kein Nav-Eintrag irgendwo, nur als Kapitel INNERHALB `SSHTargetDetailPage` sichtbar | Braucht KEINEN eigenen Top-Level-Eintrag (das wäre wieder ein Duplikat — die Registry ist per Design pro-Node und lebt schon in `SSHTargetDetailPage`, Abschnitt 6.1-Analogie "reachable elsewhere"). Stattdessen: die Aggregation aus 7.2 macche sie implizit über das ganze Produkt sichtbar (Graying), das IST ihre Nav-Präsenz |
| **`/overview`** (Root-Landing, `OverviewPage.tsx`, `OverviewGrid` + `BreadcrumbBar`) | Orphan laut SSOT-PLAN Appendix B: "nur Root-Redirect, kein Nav-Eintrag irgendwo" | **NULL** | Erster Eintrag in `workspaceItems` bzw. ein eigenes "Home"-Icon ganz links im neuen Tab-Strip-Bereich (SSOT-PLAN B6.2 plant das bereits — hier bestätigt, nicht neu erfunden) |
| **`/api-docs`** (OpenAPI-Explorer) | 1 zufälliger Inline-Link, sonst 0 (SSOT-PLAN Appendix B) | **NULL** | `platformItems`, neben Control-Planes/Vault/Networks (SSOT-PLAN B6.2, hier bestätigt) |
| **`/security/findings`** (`SecurityFindingsPage.tsx`, 340 Z., real geroutet) | 1 Inline-Link (`WorkspaceDetailPage.tsx:453`), fehlt komplett in `securityItems` | **NULL** | `securityItems`, Block "Übersicht & Scans" (5.1) |
| **WAF-Toggle im Deploy-Dialog** (Backend kann `waf:true`, Coraza/Caddy-Sidecar + OWASP-CRS; Matrix-Ansicht existiert) | OPEN-ITEMS "WAF-UI-GAP": Backend real, aber "der kanonische Deploy-Dialog exponiert das Flag NICHT" (nur 1 Kommentar-Treffer) | Kein Nav-Problem — ein FEHLENDES FORM-FELD im kanonischen `WorkspaceDeployDialog`, nicht fehlende Navigation. Build-Agent K (laut HANDOFF bereits dispatched) ist der richtige Owner, nicht dieser IA-Vorschlag | Erwähnt hier nur zur Vollständigkeit — kein Nav-Phase-Punkt, siehe Abschnitt 9 Hinweis |
| **Team-Bindings mit `resourceType: workspace`** (`team_bindings.go`, VERIFY-Dokument §5: Rows können angelegt werden, greifen aber NIRGENDS — reine Bookkeeping-UI) | `team-bindings-panel.tsx` existiert, ist aber wirkungslos für Workspaces | Nav-technisch erreichbar (`/teams`), aber FUNKTIONAL fehlt die Durchsetzung — kein Nav-Fix möglich, das ist ein Backend-Gap (Agent J, "Workspace-Members", laut HANDOFF bereits am Bauen) | Kein Phase-Punkt hier — Nav zeigt schon hin, das Feature dahinter ist unvollständig |
| **`/dbs/datalake`** | War Orphan, SSOT-PLAN R5 bestätigt bereits gefixt (`section-nav.ts:232`, heute verifiziert vorhanden) | ✅ bereits erledigt | — |
| **threat-responder** (`src/backend/cmd/threat-responder/`, 1625 Z.: `main.go`, `docker.go`, `eve.go`, `respond.go` + 2 Testdateien) | **Real, substanziell — ABER NOCH UNCOMMITTED** (`git status --porcelain`: `?? src/backend/cmd/threat-responder/`, verifiziert). Standalone-Daemon: tailt Suricatas `eve.json` auf Secret-Exfil-Signaturen (SID 8000000-8000099), löst den auffälligen Container per IP über die Docker-API auf; DETECT-Modus (Default, nur Logging) vs. ENFORCE-Modus (opt-in, gitignored Override — `docker network disconnect` + `docker pause`, NIE Host-iptables, Mandat 12-konform) | **NULL** — kein Status-/Mode-Indikator irgendwo, kein Event-Feed | Braucht MINDESTENS eine Status-Anzeige (DETECT/ENFORCE-Modus, Live-Event-Zahl) — siehe Abschnitt 8.1 für den Platz UND die Backend-Voraussetzung |
| **Email-Versand / allgemeines Notification-System** | **Existiert in `jimesh` NICHT** — 0 Treffer für SMTP/E-Mail/Webhook-Notification-Channel unter `internal/`. Ein Email-Gateway EXISTIERT (`services/email-gateway/` in der SEPARATEN `jimesh-crew`-Repo, Branch `feat-email-gateway` — verifiziert per `git branch -a`), aber **0 Verbindung zu jimesh** | **NULL** — kein Email-Tab, keine allgemeine Notifications-Fläche (die bestehende `SecurityNotificationsBell`/`/notifications` ist NUR Security-Findings, kein generischer Kanal) | Nav-Platz vorgesehen (8.2), Versand-Backend fehlt komplett — siehe 8.2 für die Backend-Abhängigkeit |

### 8.1 threat-responder — Backend-Voraussetzung, bevor irgendein Nav-Schritt sinnvoll ist

Der Daemon ist **kein Web-Service** (kein HTTP-Handler im gelesenen Code, reiner Docker/eve.json-Tailer) —
er hat heute buchstäblich nichts, das eine Frontend-Seite abfragen könnte. Bevor irgendein Nav-Eintrag
sinnvoll ist, braucht es ZUERST:

1. **Ein HTTP-Statusendpoint** (nach dem `/api/suricata/status`-Muster, `suricata.go`): mindestens Modus
   (`detect`/`enforce`), Zähler seit Start, letzte N Events, letzte Enforce-Aktion (falls welche griff).
2. **Committen** — der Daemon ist noch nicht einmal `git add`-ed; kein Build-Agent darf einen Nav-Eintrag
   für einen Code-Stand bauen, den der Parent noch nicht gesehen/committed hat (Standing Mandate 4).

Erst danach ist ein Nav-Slot sinnvoll: ein neuer Punkt in `securityItems`, Block "Monitoring & Audit"
(5.1) — z. B. "Threat Response" — der den neuen Statusendpoint zeigt (Modus-Badge + Live-Zähler), analog zum
Suricata-Panel auf `/networks`. **Dieser Vorschlag legt NUR den Nav-Platz fest — der Statusendpoint selbst
ist Backend-Arbeit außerhalb des Scopes hier** (vermutlich derselbe Agent, der den Daemon gebaut hat, oder
ein Nachfolge-Sprint).

**Wichtiger Vorbehalt, den Leo hier explizit hören sollte:** Falco und Suricata/threat-responder sind
**zwei separate Detection-Pfade, die NICHT korreliert sind** — sie teilen sich nur ein Code-Muster
(Tailer-Semantik), keine tatsächliche Event-Korrelation. Falls Leos Redesign-Wunsch eine EINE vereinheitlichte
"Threat Detection"-Fläche impliziert (Falco-Events + Suricata-Alerts + threat-responder-Aktionen in einer
Tabelle), ist das **kein reiner UI-Merge** — das braucht neue Backend-Korrelationsarbeit (ein gemeinsames
Event-Schema, eine Zusammenführung nach Container/Zeit/IP), bevor eine Seite ehrlich "eine Sicht" zeigen
kann. Dieser Vorschlag schlägt daher NUR getrennte Nav-Einträge vor (SIEM, Suricata-Panel auf /networks,
threat-responder-Status) — kein "Unified Threat Detection"-Tab, bis diese Backend-Korrelation real existiert.

**Duplikat-Hinweis (nicht Teil des Scopes hier, aber der SSOT-Disziplin wegen genannt):** Container-Freeze
existiert jetzt an ZWEI Stellen — `internal/security/freeze.go` (älter, durch Token-Revocation ausgelöst)
und threat-responders eigener `docker pause` + `network disconnect` (durch Suricata ausgelöst). Zwei
unabhängig entstandene Freeze-Mechanismen für denselben Effekt (Container einfrieren) sind ein Kandidat für
einen künftigen SSOT-PLAN-Cluster-Eintrag (wie Cluster 1-16) — dieser IA-Vorschlag löst das nicht, flaggt es
nur, damit es nicht übersehen wird.

### 8.2 Email / allgemeines Notification-System — Nav-Platz ja, Versand-Backend nein

Leo will konkret: (a) einen Email-Tab in der Sidebar, (b) E-Mail-Versand bei Threats/Anomalien (Anknüpfung
an threat-responder oben), (c) "Notifications für alles" als generelles Querschnittsthema. Alle drei sind
**KEIN reines Nav-Problem**:

- Es gibt in `jimesh` heute **keinen einzigen Notification-Kanal** (kein SMTP-Client, kein Webhook-Sender,
  0 Treffer unter `internal/`). Die bestehende `SecurityNotificationsBell` + `/notifications`
  (`NotificationCenterPage.tsx`) ist NUR ein In-App-Feed für Security-Findings — kein Versand-Mechanismus,
  keine E-Mail-Funktion.
- Ein Email-Gateway EXISTIERT bereits, aber in der falschen Repo: `jimesh-crew/services/email-gateway/`
  (Python, `email_ai.py`/`email_backend.py`/`gmail_backend.py`/`firebase_backend.py`/`gdrive_backend.py`),
  auf einem unmerged Branch `feat-email-gateway` — **0 Verbindung zu `jimesh`** heute. Es als
  "jimesh kann E-Mails senden" zu verkaufen wäre Mandate-2-widrig, solange die Verbindung nicht existiert.

**Was dieser IA-Vorschlag JETZT festlegen kann (Nav-Platz, kein Code):**

- Ein neuer Sidebar-Eintrag **"Email"** neben "Secrets" (5.3) als eigener Top-Level-Punkt — Platzhalter-
  Seite mit ehrlichem "noch nicht verdrahtet"-Empty-State (Mandate 2: keine erfundene Inbox), bis das
  Backend real ist.
- Ein generischer **"Notifications"-Baustein** wird NICHT neu erfunden — `/notifications`
  (`NotificationCenterPage.tsx`, bereits ein Security-Bells-Sibling, section-nav.ts:219) wird zur
  Zielfläche für ALLE künftigen Notification-Typen (nicht nur Security), sobald ein generischer Kanal
  existiert — Erweiterung des bestehenden Feeds um einen `type`-Filter, kein zweiter Notification-Center-Bau.

**Was NICHT Teil dieses Vorschlags ist (explizite Backend-Vorbedingung, eigener Sprint):** (1) den
`jimesh-crew`-Email-Gateway-Branch nach `jimesh` portieren oder eine neue, jimesh-native SMTP/Webhook-
Integration bauen, (2) threat-responder (8.1) an diesen Kanal anschließen, (3) einen generischen
Notification-Event-Bus, der Security/Deploys/Threats/… alle in ein Schema bringt. Der Nav-Platz aus diesem
Abschnitt ist so gebaut, dass er beides — Email-Tab und erweiterter Notification-Center — aufnehmen kann,
OHNE dass die IA nochmal geändert werden muss, wenn das Backend nachzieht.

**Kurzfassung für Leo:** Die reinen "Feature ohne jeden Nav-Zugang, Backend ist fertig"-Fälle bleiben
`/overview`, `/api-docs`, `/security/findings` (SSOT-PLAN B6.2, hier nur bestätigt) — für die reicht ein
Nav-Edit. threat-responder und Email/Notifications sind ANDERS: das sind Fälle, wo dieser Vorschlag den
NAV-PLATZ festlegt, aber die eigentliche Funktion erst nach neuer Backend-Arbeit lebt — **UI-only wäre hier
eine Attrappe, kein Fix**. WAF-Toggle und Team-Durchsetzung bleiben reine Feature-Vollständigkeits-Lücken
mit eigenen Build-Agents (K, J) — kein Nav-Problem, kein Punkt in diesem Vorschlag.

---

## 9. Execution Plan (Leos Punkt 7) — phasiert, gegen die laufende SSOT-Welle sequenziert

**Vorbedingung für JEDE Phase:** `section-nav.ts`, `HierarchySidebar.tsx`, `App.tsx`, `command-palette.tsx`
sind laut Aufgabenstellung GERADE JETZT von einer anderen Session bearbeitet (SPRINT-140/142/146). Kein
Build-Agent darf eine dieser 4 Dateien anfassen, ohne vorher frisch zu lesen UND zu bestätigen, dass die
zitierten Zeilennummern noch stimmen — sonst genau das Kollisionsrisiko, das die Standing-Order ("Agenten
committen NIEMALS, nur der Parent") vermeiden soll. Jede Phase unten liefert einen Arbeitsbaum-Diff, kein
Commit (Standing Mandate 4, HANDOFF §1).

### Phase 0 — Voraussetzung (Parent, kein Build-Agent)

Warten, bis die aktuell laufende SSOT-Welle (SPRINT-140/142/146 + SSOT-PLAN Phase A+B, siehe
`SSOT-PLAN-2026-09-28-FRONTEND.md` §5a/5b) gelandet ist. Insbesondere: SSOT-PLAN C6 (Network-Label-SSOT)
und die ausstehenden `nav.agents`-Zeilen sollten im SELBEN Nav-Edit-Fenster laufen wie Phase 1 unten (SSOT-
PLAN Z. 238: "ein Nav-Fenster, alle Zeilen") — NICHT als zwei getrennte Wellen gegen dieselben zwei Dateien.

### Phase 1 — Security-Reorg + Dedup (Abschnitte 5, 6) — EIN Nav-Fenster

*Betrifft: `section-nav.ts`, `HierarchySidebar.tsx` (Kern-Scope dieses Vorschlags).*

1. `securityItems` in `section-nav.ts` in 4 `divider`-getrennte Blöcke gliedern (5.1); SIEM-Eintrag NEU
   hinzufügen (`/security/siem`, 5.4); Secrets-Eintrag entfernen (wandert zu Schritt 3).
2. 4 Firewall-Einträge zu 1 zusammenführen (`/security/firewall`, getabbt, 5.2) — neue kleine
   Tab-Wrapper-Komponente analog `SecurityScansPage.tsx`'s Tab-Muster; die 4 bestehenden Views werden NICHT
   umgeschrieben, nur unter Tabs gehängt.
3. Secrets zu einem eigenen Sidebar-Top-Level-Punkt machen (5.3) — Label "Secrets (Projekte)".
4. `HierarchySidebar.tsx`: `EVENTS_ITEMS` um den SIEM-Eintrag kürzen (jetzt in section-nav), um
   `/security/firewall-rules` kürzen (jetzt Tab in Schritt 2), UND um die zwei Scan-Einträge
   `/security/scans/sast` + `/security/scans/dast` kürzen (Z. 275-276 — der named example aus 6.3: die
   Seite hat schon ihre eigene Tab-Leiste, `section-nav.ts`'s einer `isActive`-Eintrag reicht);
   `NAVIGATION_ITEMS` um `/workspaces/deployments` kürzen (6.3 — bleibt nur in section-nav). Label des
   verbleibenden `section-nav.ts`-Scans-Eintrags auf "Static Analysis" ändern (Leos Vorschlag).
5. `/plugins?browser=1` als Nav-Eintrag aus `workspaceItems` entfernen, als Button in `PluginCatalogPage.tsx`
   behalten (6.3).
6. C1 (Playground-Eintrag löschen), B6.2 (`/overview`, `/api-docs`, `/security/findings` ergänzen, Abschnitt
   8) im selben Fenster mitziehen — sie sind bereits von SSOT-PLAN geplant und berühren dieselben 2 Dateien.
7. Verifikation: `npm run test` (vitest + check:i18n), `npx tsc --noEmit -p tsconfig.app.json` gegen die
   dokumentierte Baseline (SSOT-PLAN §6).

*Kollision: Phase 1 darf NICHT parallel zur laufenden Session laufen (identische Dateien) — Phase 0 ist
Pflicht.*

### Phase 2 — Top-Bar → Tab-Strip (Abschnitt 3)

*Betrifft: `App.tsx` (`Navbar()`-Funktion umbauen), NEU: `components/tab-strip/TabStrip.tsx`,
`lib/tab-strip-store.ts`.*

1. `lib/tab-strip-store.ts`: State-Modell (3.2), localStorage-Persistenz (3.3), Reuse-by-path-Logik (3.4).
2. `components/tab-strip/TabStrip.tsx`: rendert offene Tabs, Pin-Toggle, Close-Button, aktiviert bei Klick.
3. `App.tsx`: `Navbar()` wird auf die Sub-Navbar-Elemente aus 3.5 reduziert (Brand, ⌘K, Bell, Language-
   Switcher, Account-Menü); `<TabStrip/>` wird direkt darunter gerendert (neue Zeile zwischen `<Navbar/>`
   und dem `flex min-h-0 flex-1`-Container, `App.tsx:540-546`).
4. `navGroups`-Rendering aus `Navbar()` entfernen — die 5 Gruppen werden 5 neue `renderSectionLinks()`-
   Aufrufe in `HierarchySidebar.tsx`, oberhalb der bestehenden Sektion D (3.6).
5. Admin-Marker verliert Sonderstatus, wird ein normaler Sidebar-/Palette-Eintrag `/admin` (3.5-Tabelle).
6. Jeder existierende `<Link>`/`<NavLink>`-Klick im Produkt muss weiterhin durch die Tab-Reuse-Logik laufen
   — kein Extra-Wiring nötig, wenn Schritt 1 als React-Router-`Link`-Wrapper implementiert wird, der VOR der
   Navigation den Tab-Store aktualisiert (ein zentraler Hook, kein Patch an jedem Link).

*Kollision: `App.tsx` ist Teil der aktuell laufenden Welle (Phase-D-Tabelle, SSOT-PLAN) — NACH Phase 0
UND NACH Phase 1 (Phase 1 könnte `App.tsx`-Routen für `/security/firewall` neu anlegen, Reihenfolge
vermeidet Merge-Konflikte zwischen den beiden Phasen dieses Vorschlags selbst).*

### Phase 3 — Sidebar "Dashboards"-Sektion + Backend-Persistenz + `jimesh.dashboards`-SDK (Abschnitt 4)

*Betrifft: NEU `internal/store` (Tabelle `user_dashboards`), NEU `internal/gateway` (5 Routen, Abschnitt
4.6), NEU `internal/sdk/dashboards/dashboards.go` (Go-SDK), NEU Frontend `lib/dashboard-store.ts`,
`lib/dashboard-presets.ts`; Änderung: `DashboardBuilderPage.tsx` (Multi-Instanz statt Single-Layout),
`HierarchySidebar.tsx` (neue Dropdown-Sektion). Wegen des Agent/Script-Zugriffs-Nachtrags (4.6) ist die
Backend-Tabelle jetzt Teil DIESER Phase, nicht mehr optional-später — Frontend und Backend/SDK können aber
als zwei parallele Teil-Schritte (3a Backend/SDK, 3b Frontend) von zwei Build-Agents gebaut werden, da sie
unterschiedliche Dateien anfassen.*

**3a — Backend + SDK (kein Frontend-Datei-Overlap mit Phase 1/2):**

1. `internal/store`: Tabelle `user_dashboards(id, owner_user_id, name, card_ids_json, is_default,
   preset_key, created_at)` — Muster: `store.NodeServiceRow` (`node_services.go`-Vorlage, Abschnitt 2.4).
2. `internal/gateway`: die 5 Routen aus 4.6 (`GET/POST/DELETE /api/sdk/dashboards`,
   `POST /api/sdk/dashboards/{id}/apply-preset`) + die Scope-Regel (kind='service' → Projekt-Bindung,
   kind='user' → Operator-Dashboards) — Routen-Registrierung in `gateway.go` bleibt, wie bei
   `node_services.go`/`suricata.go`, eine vom Parent auszuführende Zeilen-Ergänzung.
3. `internal/sdk/dashboards/dashboards.go`: das Go-Client-Paket (4.6), 1:1 nach dem Muster von
   `internal/sdk/secrets/secrets.go`.
4. API_DOCS.md-Eintrag für die 5 neuen Routen (Mandate: Route + Doku in derselben Änderung).

**3b — Frontend (baut auf 3a's Routen auf, kann aber mit Mock-losen Platzhaltertypen parallel starten):**

1. `lib/dashboard-store.ts`: `DashboardDef`-Modell (4.2), Persistenz jetzt DIREKT gegen die neuen
   `/api/sdk/dashboards`-Routen (kein localStorage-Zwischenschritt mehr nötig, da 3a ohnehin gebaut wird —
   die ursprüngliche "localStorage zuerst"-Empfehlung aus 4.5 ist durch den SDK-Nachtrag überholt),
   CRUD-Funktionen (create/duplicate/delete/apply-preset) als dünne Wrapper um die REST-Calls.
2. `DashboardBuilderPage.tsx`: liest `?dashboard=<id>` aus der URL, lädt/speichert über den neuen Store;
   Migration: ein vorhandener `jimesh.builderLayout`-localStorage-Wert wird EINMALIG per
   `POST /api/sdk/dashboards` (Session-Auth, kein Service-Key) in eine erste `DashboardDef{isDefault:true}`
   übernommen (kein Datenverlust für Nutzer, die schon ein Custom-Layout haben).
3. `HierarchySidebar.tsx`: neue Dropdown-Sektion "Dashboards" (4.3), direkt unter Sektion D.
4. Empty-State + Preset-Anwendung (4.4) in `DashboardBuilderPage.tsx`.

*Kollision: `HierarchySidebar.tsx`-Änderung (3b, Schritt 3) kollidiert potenziell mit Phase 1 (dieselbe
Datei) — diesen Schritt NACH Phase 1 einplanen, gegen den dann aktuellen Zeilenstand. 3a hat keinen
Datei-Overlap mit Phase 1/2 und kann davon unabhängig/parallel laufen.*

### Phase 4 — Service-Aware Graying (Abschnitt 7)

*Betrifft: NEU `lib/deployed-services.ts`; Änderung: `FirewallProviderSetupPage.tsx` (7.1, statisches
Disabled-Flag — unabhängig von Phase 4, kann SOFORT nach Phase 0 laufen, keine Nav-Datei-Kollision),
`HierarchySidebar.tsx`/Firewall-Tab-Wrapper (7.2 Graying anwenden).*

1. `lib/deployed-services.ts`: `useDeployedServices()`-Hook (7.2), aggregiert `GET /api/node-services` über
   alle `useSshEndpoints()`-Namen — Wiederverwendung von `SSHTargetDetailPage.tsx:87-96`'s Merge-Pattern.
   **Voraussetzung: die 3 `node_services`-Routen müssen in `gateway.go` registriert sein** — laut
   `node_services.go`-Kommentar (Z. 10-13) ist das absichtlich Parent-Aufgabe, noch offen zum
   Audit-Zeitpunkt. Phase 4 kann NICHT vor dieser Registrierung starten.
2. OPNsense-Tab: statisches `implemented: false`-Flag (7.1) — unabhängig, kann vorgezogen werden.
3. Suricata: KEIN neuer Code (7.3) — nur dokumentieren, dass künftige `make redeploy SERVICE=suricata-
   network-ids`-Läufe idealerweise auch `record-deploy.sh` aufrufen, damit `node_services` und das
   Suricata-Panel dieselbe Quelle zeigen (Empfehlung, kein Pflicht-Build-Schritt dieser Phase).
4. Grafana/Dashboards: KEIN Handlungsbedarf (7.3) — bereits über `/api/embeds` gelöst.

*Kollision: gering — neue Datei + kleine Ergänzung in bereits-in-Phase-1/3-editierten Dateien. NACH Phase 1
(Firewall-Tab muss existieren, bevor OPNsense-Tab darin ausgegraut werden kann) und NACH der
gateway.go-Registrierung der node-services-Routen.*

### Phase 5 — threat-responder-Status + Email/Notifications-Nav-Platz (Abschnitt 8.1, 8.2)

**Diese Phase ist GEMISCHT — ein Teil ist reine IA (sofort baubar), der größere Teil braucht neue
Backend-Arbeit, die NICHT Teil dieses Vorschlags ist. Explizit markiert, damit kein Build-Agent und kein
Leo eine reine Nav-Änderung erwartet, wo Backend-Arbeit fehlt:**

**5a — reine IA, sofort baubar (nach Phase 1, gleiche Dateien):**

1. Platzhalter-Nav-Eintrag "Email" — eigener Sidebar-Top-Level-Punkt neben Secrets (8.2) — Zielseite mit
   ehrlichem "Backend noch nicht verdrahtet"-Empty-State, kein Fake-Compose-Formular (Mandate 2).
2. `/notifications` (`NotificationCenterPage.tsx`) bekommt einen `type`-Filter-Slot in der UI vorbereitet
   (auch wenn er heute nur `security` liefert) — kein neuer Notification-Center-Bau, nur die
   Erweiterungsstelle, damit spätere Typen (Email-Versandbestätigung, Threat-Response-Events) ohne
   IA-Änderung andocken.

**5b — BRAUCHT NEUE BACKEND-ARBEIT ZUERST (nicht Teil dieses Vorschlags, hier nur als Abhängigkeit benannt):**

1. threat-responder committen (Standing Mandate 4 — der Parent muss den Daemon erst sehen/freigeben) +
   einen HTTP-Statusendpoint dafür bauen (8.1, Analogie `/api/suricata/status`). ERST DANACH ergibt ein
   Nav-Eintrag "Threat Response" in `securityItems` (Block "Monitoring & Audit", 5.1) einen Sinn — er zeigt
   Modus (detect/enforce) + Live-Event-Zahl, analog zum Suricata-Panel.
2. Ein generischer Notification-Versand-Kanal (SMTP/Webhook) in `jimesh` — entweder der
   `jimesh-crew/feat-email-gateway`-Branch nach `jimesh` portiert, oder eine neue jimesh-native
   Integration. ERST DANACH befüllt sich der 5a-Email-Nav-Platz mit echtem Inhalt.
3. Falco/Suricata/threat-responder-Korrelation (falls Leo eine EINE "Threat Detection"-Sicht will, 8.1) —
   neues Event-Korrelations-Schema, kein UI-Merge. Kein Nav-Schritt in diesem Vorschlag, bis das existiert.
4. (Nur als Hinweis, kein Pflichtschritt dieser Phase): `internal/security/freeze.go` vs. threat-responders
   eigener Freeze-Pfad — ein künftiger SSOT-Cluster-Kandidat (8.1), nicht hier aufzulösen.

*Kollision: 5a teilt Dateien mit Phase 1 (nach Phase 1 einplanen); 5b hat keine Nav-Datei-Überschneidung,
ist aber ein eigenständiger Backend-Sprint, kein UI-Build-Agent-Durchgang.*

### Reihenfolge-Zusammenfassung

```
Phase 0 (warten auf laufende SSOT-Welle + gateway.go-Route-Registrierung für node-services)
   ├─→ Phase 1 (Security-Reorg + Dedup — section-nav.ts + HierarchySidebar.tsx)              [reine IA]
   │      ├─→ Phase 2 (Tab-Strip — App.tsx, unabhängig von Dashboards/Graying)                 [reine IA]
   │      ├─→ Phase 3b (Dashboards-Frontend — HierarchySidebar.tsx NACH Phase 1)          [IA, braucht 3a]
   │      ├─→ Phase 4 (Service-Aware Graying — braucht Phase 1's Firewall-Tab + node-services)  [IA, braucht node-services-Registrierung]
   │      └─→ Phase 5a (Email-Platzhalter + Notification-Filter-Slot)                          [reine IA]
   └─→ Phase 3a (Dashboards-Backend + jimesh.dashboards-SDK)                    [BACKEND, parallel zu Phase 1]

Phase 5b (threat-responder committen+Statusendpoint, Email-Versand-Kanal, Falco/Suricata-Korrelation)
   — EIGENSTÄNDIGER BACKEND-SPRINT, kein Build-Agent-Nav-Durchgang; Phase 5a's Email-/Threat-Response-
     Nav-Plätze bleiben ehrliche Platzhalter, bis 5b liefert.
```

**Legende:** `[reine IA]` = Nav/Sidebar-Edit, kein neuer Backend-Code, sofort nach Vorbedingung baubar.
`[IA, braucht X]` = Nav-Edit, aber blockiert auf eine bereits laufende/geplante Backend-Vorbedingung (SDK-
Routen, gateway.go-Registrierung). `[BACKEND, ...]` = kein Nav-Schritt, eigener Scope. Jede reine-IA-Phase
ist für sich klein genug für einen Build-Agenten-Durchgang (max. 2-3 Kern-Dateien + 1-2 neue Dateien) und
liefert einen eigenständig testbaren Zustand (vitest + tsc + i18n-Check nach jeder Phase, wie SSOT-PLAN §6
es für alle Phasen vorschreibt). Die als `[BACKEND]` markierten Punkte (3a, 5b) sind KEIN Nav-Arbeitspaket
und sollten nicht an einen UI-Build-Agenten gegeben werden. **Phase 6 (Sidebar-Chat / MeshSquad-Chaträume,
Abschnitt 10) ist NICHT in dieses Diagramm gezeichnet, weil sie zwei Repos aufspannt** (`jimesh` +
`meshsquad-public`) — eigene Reihenfolge + Legende in Abschnitt 10.6.

---

## 10. Sidebar-Chat / MeshSquad-Chaträume (Leos Nachtrag, 28.9. später)

Leos verbatim-Auftrag (unverändert): *"können wir auch in der sidebar den chat einfügen und halt ausgrauen
wenn die integration nicht installiert ist und wenn jemand squadmesh deployen will muss er die chat
requirement plugin/integration erst installieren oder beim deployen und lass das so machen das wir
chatrooms haben, also jede squadmesh crew kriegt ihre chat rooms also quasi ihr eigenes slack mit
subchannels und humans können das auch für sich zum chatten erstellen was dann das selbe modal ist wie
wenn man in der squadmesh crew die chatid aussucht und die presets können dann gleich die channels mit
anlegen für die agents, oder man muss die halt im agent builder selber anlegen und welche agents in die
subchannels da halt reindürfen usw."*

**Repo-Übersicht vorab (wichtig, weil dieser Punkt anders als alles bisher in diesem Vorschlag ist):** Das
Sidebar-Gating (10.1) und der Deploy-Time-Gate (10.2) sind **jimesh-seitig**. Das eigentliche
Chatraum-/Subchannel-Feature (10.3-10.5) lebt **komplett in `meshsquad-public`** (`message_bus.py`,
`chat-gateway/`, das Team-Creator-Frontend) — eine ANDERE Repo als der Rest dieses Vorschlags. Jede
Phase in 10.6 nennt explizit, welches Repo sie betrifft.

### 10.1 Sidebar-Chat-Eintrag — Graying über dieselbe Plugin-Installations-Mechanik wie Abschnitt 7

Geprüft (nicht angenommen): `gateway/plugins.go` führt `meshsquad` bereits als Katalog-Eintrag
(Z. 106-115, "renamed from jimesh-crew 2026-09-27"), aber `pluginBackendRoutes["meshsquad"] = {}`
(Z. 63-68, LEER) — der Kommentar dort ist wörtlich: "the crew-api stack is SEPARATELY deployed and the
JiMesh backend has no manifest ingestion and no meshsquad routes" — macht `installable: false` für diesen
Eintrag (Handler-Beweis Z. 211-215: "a plugin with no backend routes is NOT installable"). Frontend-Beweis:
`PluginCatalogPage.tsx:88` (`isInstalled(pluginId)`, liest die echten `plugin_installations`-Zeilen) +
Z. 311-321 (der `!plugin.installable`-Zweig rendert eine ehrliche "nicht installierbar"-Badge, nicht die
normale Install-Aktion).

**Entscheidung:** Der neue Sidebar-Eintrag "Chat" konsultiert **exakt diese bestehende Mechanik** —
denselben `isInstalled('meshsquad')`-Check, den `PluginCatalogPage.tsx` schon hat — statt eine zweite
Prüfung zu erfinden. Visuelles Muster identisch zu Abschnitt 7.2 (grayed+disabled, Tooltip statt
Verschwinden). **Wichtiger, ehrlicher Vorbehalt, der Leo hier direkt gesagt werden sollte:** Weil
`pluginBackendRoutes["meshsquad"]` heute LEER ist, würde dieser Sidebar-Eintrag beim ersten Bauen SOFORT
UND DAUERHAFT ausgegraut bleiben — nicht weil ein Operator es nicht deployt hat, sondern weil `jimesh`
noch keine einzige echte Route für die meshsquad-Integration hat (identisches Muster zum OPNsense-Fall,
7.1: ein Katalog-Eintrag ohne Backend dahinter). Das Sidebar-Graying (10.1) ist damit zwar sofort baubar,
zeigt aber erst dann etwas anderes als "ausgegraut", sobald echte `jimesh↔meshsquad`-Integrationsrouten
existieren (das ist ein Backend-Punkt außerhalb des Scopes hier, RM25 laut Kommentar Z. 63-68).

### 10.2 Deploy-Time-Gate für MeshSquad-Crews — Entscheidung: inline, nicht blockierender Pre-Check

Leo lässt beides zu ("erst installieren … oder beim deployen"). **Entscheidung: inline in den bestehenden
Deploy-Dialog, nicht ein zweiter, separater Blocking-Screen.** Begründung: Die kanonische Deploy-Dialog-
Familie (SSOT-PLAN Cluster 1, `WorkspaceDeployDialog`/`WorkspaceDeployAppDialog`) prüft schon heute
kontextuelle Voraussetzungen inline (Credentials, Ports, Framework-Zulässigkeit) — ein zusätzlicher
Blocking-Modal VOR dem eigentlichen Dialog wäre ein zweiter Dialog-Schritt für ein Konzept, das der
bestehende Dialog schon als Sektion abbildet (genau Leos eigene Dedup-Regel, Punkt 4, auf Dialog-Ebene).

Konkrete UX: Wenn der Deploy-Dialog eine MeshSquad-Crew als Ziel erkennt (Framework/Preset-Auswahl =
meshsquad, `lib/deploy-catalog.ts` aus SSOT-PLAN B4), erscheint eine neue Sektion "Chat-Integration"
zwischen Framework- und Ports-Sektion: Status-Zeile (identisch zum 10.1-Graying-Zustand: installiert /
nicht installierbar), und — NUR wenn `installable: true` aber `isInstalled: false` — ein Inline-Button
"Jetzt installieren", der denselben Call auslöst, den `PluginInstallWizardDialog.tsx` heute schon macht
(POST `/api/plugin-installations`), OHNE den Deploy-Dialog zu verlassen. Der "Deploy"-Submit-Button bleibt
disabled, solange die Chat-Integration weder installiert noch (ehrlich) installierbar ist — mit Tooltip,
der den Grund nennt (dieselbe Formulierung wie 10.1).

### 10.3 Chatraum-Modell — was der Code heute wirklich hergibt, und was neu ist

**Heute, verifiziert (nicht angenommen):**

- **EIN Bus-Channel pro Team.** `message_bus.py`'s `MessageBusBackend`-Protokoll (Z. 46-56) kennt gar keine
  feste Menge an Räumen — "creating a new chatroom is posting to a channel name nobody used before"
  (Z. 50-51, `test_multiple_rooms_dont_leak` beweist NUR, dass zwei beliebige Channel-Strings sich nicht
  überschneiden, NICHT dass ein Team mehrere Channels gleichzeitig hat). Die README-Beispiele
  (`chat-gateway/README.md:64-66`) zeigen konsequent EIN `bus_channel` pro Team ("marketing-team").
- **EIN tinode-Gruppen-Topic pro Team**, 1:1 auf den Bus-Channel gemappt: `topic_map.py`'s
  `TeamTopicMapping`-Dataclass (Z. 54-59) + die `TopicMap.load()`-Validierung (Z. 88-127) — Topic-Erstellung
  ist HEUTE MANUELL ("create the topic in the web UI first, then list it", README Z. 59-60), und der Datei-
  eigene Kommentar sagt es explizit: **"Auto-provisioning topics at team-creation time is an explicitly
  open point in the RM27 plan"** (`topic_map.py:26`) — also ist "Chatroom entsteht automatisch beim
  Crew-Deploy" bereits als offener Punkt bekannt, nicht neu erfunden von diesem Vorschlag.
- **`watches` ist ein CLIENT-SEITIGER FILTER auf EINEM gemeinsamen Channel, keine Subchannel-Trennung**:
  `AgentBusClient` (`message_bus.py:173-221`) ist "one agent's view of ONE channel" (Z. 174) — `watches`
  (in `RolePanel.tsx:49`, `role.watches`) filtert, welche Nachrichten aus DIESEM EINEN Channel für die Rolle
  relevant sind (`_relevant()`, Z. 212), es öffnet keinen zweiten Channel. **Sub-Channels pro Crew existieren
  im Code heute nicht.**
- **Team-Creator-Frontend hat 0 Chat-Bezug**: `grep chat|topic|channel` über `TeamForm.tsx` + `server.py`
  ergibt 0 Treffer — die "Chat-ID aussuchen"-Modal, die Leo als Vorbild nennt, **existiert nicht** (weder im
  Team-Creator noch sonstwo). Leos Formulierung beschreibt eine GEWÜNSCHTE UX, keine vorhandene.

**Was das für Sub-Channels bedeutet — neu, aber kein Neubau von Grund auf:**

`TopicMap` (topic_map.py) erzwingt Eindeutigkeit NUR auf `tinode_topic` und `bus_channel` (Z. 117-122,
`seen_topics`/`seen_channels`) — **NICHT auf `team`**. D. h. mehrere Einträge mit demselben `team`-Wert,
aber verschiedenen `tinode_topic`/`bus_channel`-Paaren, sind vom Datenmodell HEUTE SCHON zulässig — das ist
der natürliche Mechanismus für "eine Crew, mehrere Subchannels" (z. B. `{"team":"marketing",
"tinode_topic":"grpXXX1","bus_channel":"marketing-team-general"}` + `{"team":"marketing",
"tinode_topic":"grpXXX2","bus_channel":"marketing-team-design"}`). **Echt neu (Backend-Arbeit, nicht nur
UI):**

1. Ein `_by_team`-Lookup auf `TopicMap` (kleine Ergänzung, Analogie zu `_by_topic`/`_by_channel`,
   `topic_map.py:67-68`), damit der Gateway/die UI "alle Subchannels von Team X" gruppiert abfragen können.
2. **Automatische Tinode-Topic-Erstellung** bei Crew-Anlage — `tinode_client.py`'s bereits vorhandene gRPC-
   Node-API (`{sub topic:"new"}`, README Z. 26-29) wird von der Team-Creator-Aktion aus aufgerufen, statt
   manuell in der tinode-Web-UI — DAS ist der offene RM27-Punkt (`topic_map.py:26`), hier konkretisiert.
3. **`topic_map.json` wird API-verwaltet statt handgepflegt** — ein kleiner CRUD-Layer über die Datei (oder
   eine Ablösung durch eine echte Tabelle, wenn das Team-Wachstum das rechtfertigt), damit Crew-Anlage +
   Subchannel-Anlage nicht mehr "Datei manuell editieren, Gateway neu starten" bedeutet.

### 10.4 Menschen erstellen dieselbe Struktur — EIN gemeinsames Modal, kein zweites

Da die "Chat-ID aussuchen"-Modal (10.3) nicht existiert, wird sie NEU gebaut — aber von Anfang an als EIN
gemeinsam genutztes `ChatSpaceModal`, nicht zweimal:

```ts
interface ChatSpaceModalProps {
  ownerKind: 'crew' | 'human'
  ownerId: string          // team-Name bei crew-initiiert, Nutzer-Id bei human-initiiert
  presetChannels?: string[]  // vorbelegt, wenn ein Preset welche mitbringt (10.5)
}
```

- **Crew-initiiert:** Team-Creator (`TeamForm.tsx`) öffnet `ChatSpaceModal` mit `ownerKind:'crew'` als
  letzten Schritt der Crew-Erstellung (oder als eigener Button in `TeamsList.tsx` für bereits existierende
  Teams ohne Chatraum).
- **Human-initiiert:** derselbe Modal-Typ, aufgerufen aus dem NEUEN jimesh-Sidebar-Chat-Eintrag (10.1) mit
  `ownerKind:'human'` — "Für sich selbst zum Chatten erstellen" ist exakt derselbe Formular-Flow
  (Kanal-Namen, ggf. Presets), nur ohne Crew-Kontext. **Wo lebt diese Komponente technisch?** Da das
  eigentliche Backend (`chat-gateway`, `topic_map`) in `meshsquad-public` liegt, lebt `ChatSpaceModal` dort
  im `frontend/`-Ordner; der jimesh-Sidebar-Eintrag (10.1) ruft sie NICHT lokal, sondern verlinkt/embedded
  auf die meshsquad-public-Chat-UI (wie `/dashboards` bei Grafana: kein Duplikat, ein Deep-Link auf die
  Stelle, wo das Feature wirklich lebt) — kein Cross-Repo-Component-Import.

### 10.5 Channel-Mitgliedschaft — Erweiterung von `RolePanel`/`RoleNode`, kein separates Panel

Leo lässt beides zu (Presets legen Channels mit an, ODER der Operator legt sie manuell im Agent-Builder an).
**Entscheidung: BEIDES, über denselben Mechanismus — Presets sind nur vorausgefüllte Daten für dasselbe
Feld, kein zweiter Code-Pfad** (dieselbe "Presets sind Daten, kein Code"-Regel wie Abschnitt 4.2).

- **Wo in der UI:** `RolePanel.tsx` hat bereits `role.watches` als Komma-Liste mit vollständiger manueller
  Kontrolle (Z. 49-52, Kommentar Z. 11-13: "`watches` is edited both here … because both write the same
  role.watches array"). Neues Feld `role.channels: string[]` DANEBEN, exakt demselben UI-Muster folgend
  (Komma-Liste in `RolePanel`, Badge-Zeile in `RoleNode.tsx:34-36` analog zu `watches:` dort) — **kein neues
  separates "Channels"-Panel**, weil das dieselbe Information ein zweites Mal an einem zweiten Ort verwalten
  würde (Leos eigene Dedup-Regel).
- **Presets:** `presets/*.json` (marketing/social-media/coding/outreach) bekommen ein optionales
  `channels`-Array pro Rolle, das beim Laden direkt `role.channels` befüllt — identisch zum bestehenden
  Muster, wie Presets heute schon `watches` vorbelegen (PROMPTS-VS-DELIVERY-AUDIT §2.2 zitiert dieses
  "Presets as data, not code"-Prinzip bereits für genau diese Dateien).
- **Durchsetzung:** ein Agent darf nur in Channels posten/lesen, die in seinem `role.channels` stehen — das
  ist eine NEUE Prüfung im Bus-Client (`AgentBusClient` müsste dann pro Rolle einen Channel aus der Menge
  wählen/mehrere öffnen können, Konsequenz aus 10.3 Punkt 1-3), nicht nur UI-Anzeige.

### 10.6 Execution — Phase 6, repo-getaggt

**Phase 6a — jimesh: Sidebar-Chat-Eintrag + Deploy-Gate** `[IA, braucht 10.1-Backend-Vorbehalt]`
*Repo: `jimesh`. Betrifft: `HierarchySidebar.tsx` (neuer Chat-Eintrag, Dropdown- oder Flat-Link je nach
Landing-Ziel), `WorkspaceDeployDialog`/`workspace-deploy-dialogs.tsx` (10.2, neue "Chat-Integration"-
Sektion).* Reine IA + ein Dialog-Feld — sofort nach Phase 1 baubar. **Ehrlicher Vorbehalt:** bleibt sichtbar
ausgegraut, bis `pluginBackendRoutes["meshsquad"]` (jimesh-seitig) tatsächlich befüllt wird — das ist NICHT
Teil dieser Phase.

**Phase 6b — meshsquad-public: Sub-Channel-Datenmodell + Auto-Provisioning** `[BACKEND]`
*Repo: `meshsquad-public`. Betrifft: `chat-gateway/topic_map.py` (`_by_team`-Lookup),
`chat-gateway/tinode_client.py` (automatische Topic-Erstellung statt manueller Web-UI-Schritt),
Ablösung/API-Wrapper für `topic_map.json`.* Der eigentliche "jede Crew kriegt ihr eigenes Slack mit
Subchannels"-Kern — löst den in `topic_map.py:26` bereits dokumentierten offenen RM27-Punkt.

**Phase 6c — meshsquad-public: `ChatSpaceModal` (crew- + human-initiiert)** `[BACKEND + IA, braucht 6b]`
*Repo: `meshsquad-public` (`frontend/src/components/ChatSpaceModal.tsx`, neu). Betrifft: `TeamForm.tsx`/
`TeamsList.tsx` (Aufruf crew-initiiert) + einen neuen Aufrufpunkt aus jimeshs Sidebar-Chat-Eintrag heraus
(Deep-Link, kein Cross-Repo-Import, 10.4).* Braucht 6b's Routen.

**Phase 6d — meshsquad-public: Channel-Feld in RolePanel/RoleNode + Preset-Schema** `[reine IA + Preset-
Daten]` *Repo: `meshsquad-public` (`frontend/src/components/RolePanel.tsx`, `RoleNode.tsx`,
`presets/*.json`).* Kann PARALLEL zu 6b/6c laufen (reine Formular-Erweiterung nach bestehendem Muster),
die serverseitige DURCHSETZUNG des Feldes ist Teil von 6b/6c.

**Reihenfolge:** `6a` unabhängig von `6b/6c/6d` (verschiedene Repos, kein Datei-Overlap) — kann sofort
parallel zu Phase 1 starten. Innerhalb `meshsquad-public`: `6b` vor `6c` (Modal braucht die Sub-Channel-
Routen), `6d` parallel zu beiden.

---

## 11. Phase 1 — AUSGEFÜHRT (2026-09-28, Build-Agent, Arbeitsbaum-Diff, kein Commit)

**Vorbedingung geprüft:** `git status --short` vor Start zeigte die erwarteten laufenden Wellen (SPRINT-147
Threat-Correlation unstaged, ein früherer Navbar-Fix-Agent — Admin → Sidebar, Search-Icon relabelt — beide
unstaged in `section-nav.ts`/`HierarchySidebar.tsx`/`App.tsx`), aber keinen Merge-Konflikt-Kandidaten (kein
zweiter Agent lief parallel auf denselben Dateien). Jede Datei wurde vor dem Edit frisch gelesen (nicht aus
diesem Dokument übernommen) — mehrere Zeilennummern aus Abschnitt 2/5/6 hatten sich seit dem Vormittags-
Snapshot verschoben (z. B. war `/security/threat-response` bereits neu in `securityItems` eingefügt, SIEM-
Route `/security/siem` UND `/security/findings` waren bereits in `App.tsx` geroutet, nur ohne Nav-Eintrag).

### 11.1 Was geändert wurde (Datei:Zeile, Stand nach Ausführung)

- **`src/frontend/src/lib/section-nav.ts`** — komplette Neuordnung wie in Abschnitt 5/9 Phase 1 entschieden:
  - `securityItems` (Z. 220–293) jetzt DREI `divider`-Blöcke: (1) Übersicht & Scans — Overview, **Findings
    (neu, Z. 225, B6.2)**, Exposure, WAF-Matrix, Scans (Label jetzt **"Static Analysis"**, Z. 236–240),
    Testing, Agent-Scan, Traces, DLP; (2) Firewall — **EIN** Eintrag `/security/firewall/rules` (Z. 261–267,
    `isActive` deckt alle `/security/firewall/*`-Routen ab); (3) Monitoring & Audit — **SIEM neu** (Z. 274,
    vorher nirgends in `section-nav.ts`), Security-Events, Audit-Log, **Threat-Response** (Z. 289, jetzt
    formal in diesem Block gruppiert statt lose zwischen Audit-Log und Scans zu stehen), Notifications.
  - `/security/secrets` **entfernt** aus `securityItems` (war Z. 211 im Vormittags-Snapshot) — wandert nach
    `HierarchySidebar.tsx` (siehe unten), Label bleibt `nav.projectSecrets`, Text jetzt "Secrets (Projects)".
  - `workspaceItems` (Z. 131–174): `/overview` **neu als erster Eintrag** (Z. 137, B6.2 — war Orphan);
    Playground-Eintrag `/projects` (`nav.playground`) **gelöscht** (C1); `/plugins?browser=1`-Eintrag
    (`nav.browserIntegration`) **gelöscht** (6.3 — Modal hat bereits einen eigenen Button in
    `PluginCatalogPage.tsx:119-122`, kein zweiter Trigger nötig).
  - `platformItems` (Z. 179–199): `/api-docs` **neu** (Z. 187, B6.2 — war Orphan).
  - Icon-Imports bereinigt: `Flame`, `Gamepad2`, `MonitorPlay`, `ArrowLeftRight` entfernt (orphaned nach den
    obigen Löschungen — `noUnusedLocals: true` in `tsconfig.app.json` hätte sonst tsc-Fehler erzeugt);
    `BookOpen`, `FileSearch`, `Home` neu importiert.
- **`src/frontend/src/components/sidebar/HierarchySidebar.tsx`**:
  - `NAVIGATION_ITEMS` (Z. 247–265): `/workspaces/deployments` **entfernt** (6.3 — Doppel-Registrierung ohne
    RM35-Begründung, bleibt nur in `section-nav.ts`); `/security/secrets` **neu** (Z. 254, `KeyRound`-Icon,
    Label "Secrets (Projects)" — Sekunden-Punkt 5.3, jetzt eigener Top-Level-Sidebar-Eintrag statt
    Security-Kind).
  - `EVENTS_ITEMS` (Z. 279–294 → jetzt nur 2 Einträge): `/security/firewall-rules`, `/security/siem`,
    `/security/scans/sast`, `/security/scans/dast` **entfernt** (5.2/5.4/6.3 — Firewall konsolidiert, SIEM
    zu `section-nav.ts` verschoben, Scans-Tabs dupliziert `SecurityScansLayout`s eigene Tab-Leiste). Bleiben:
    `/networks`, `/security/audit-log` (RM35-Dual-Registrierung, bewusst beibehalten).
  - Icon-Imports bereinigt: `FlaskConical`, `Rocket`, `ScanSearch`, `ScrollText` entfernt (orphaned);
    `KeyRound` neu importiert.
- **`src/frontend/src/views/FirewallLayout.tsx`** (NEU, 45 Z.) — Tab-Shell für die 4 Firewall-Views, 1:1 das
  Muster aus `SecurityScansPage.tsx`s `SecurityScansLayout` (NavLink-Tabs + `<Outlet/>`). Die 4 bestehenden
  View-Komponenten (`FirewallRulesPage`, `FirewallProviderSetupPage`, `FirewallTrafficLogPage`,
  `OpnsenseFirewallConfigPage`) wurden **NICHT verändert** — nur neu unter Tabs gehängt, wie in 5.2/9
  festgelegt. Bekannter kosmetischer Nebeneffekt (nicht behoben, da die 3 Views laut Vorgabe unangetastet
  bleiben sollten): Setup/Traffic/OPNsense rendern jeweils noch ihren EIGENEN `PageHeader` unterhalb der
  neuen Tab-Leiste — ein leicht doppelter Titel-Look auf diesen 3 Tabs. Die Rules-Seite hat keinen eigenen
  Header, dort ist es sauber.
- **`src/frontend/src/App.tsx`**: `firewall-rules`-Route redirectet jetzt auf `/security/firewall/rules`
  (Z. 665, Mandate 2 — alter Bookmark bleibt erreichbar); neue `firewall`-Elternroute (Z. 666–672) mit
  `FirewallLayout` + 4 Kind-Routen `rules`/`provider-setup`/`traffic`/`opnsense` (die letzten drei behalten
  ihre exakten alten URLs, jetzt nur eine Ebene tiefer genestet — keine Redirects nötig). Bestehende interne
  Links auf `/security/firewall-rules` (`SecuritySummaryCard.tsx:108`, Breadcrumbs in
  `OpnsenseFirewallConfigPage.tsx`/`FirewallProviderSetupPage.tsx`/`FirewallTrafficLogPage.tsx`) **nicht
  angefasst** — funktionieren über den neuen Redirect weiter.
- **i18n** (`en.json` + alle 59 weiteren Locale-Dateien, per neuem Einmal-Script
  `scripts/add-uiux-redesign-phase1-i18n.mjs`, RM35-Fallback-Muster wie `add-sprint147-…mjs`):
  - Neue Keys: `nav.overview`, `nav.apiDocs`, `nav.securityFindings`, `firewall.tab.rules` — englischer
    Fallback in allen Nicht-Englisch-Locales (ehrlich, keine Maschinenübersetzung erfunden).
  - Text-Änderungen NUR in `en.json` (andere Locales behalten ihre bisherige Übersetzung des wiederverwendeten
    Keys — kleine Qualitätslücke, kein Blocker): `nav.securityScans` "SAST / IaC / DAST" → "Static Analysis";
    `sidebar.securityFirewall` "Firewall Rules" → "Firewall"; `nav.projectSecrets` "Project Secrets" →
    "Secrets (Projects)".
- **`src/frontend/src/components/sidebar/HierarchySidebar.test.tsx`**: 2 Tests aktualisiert, die die ALTE
  Nav-Struktur hart erwartet hatten (`toContain('Deployments')`, `toContain('Firewall Rules')` /
  `'SIEM Events'` / `'SAST'` / `'DAST'` in `EVENTS_ITEMS`) — jetzt gegen die neue Struktur assertiert
  (inkl. expliziter `not.toContain`-Checks für die entfernten Einträge).

### 11.2 Was NICHT angefasst wurde (bewusst, laut Auftrag)

- Tab-Strip-Redesign (Phase 2), Dashboards-Sidebar-Sektion + SDK (Phase 3), Chat/Chatrooms (Phase 6,
  `meshsquad-public`) — alle unangetastet.
- **Phase 4 (Service-Aware Graying):** geprüft, ob die Vorbedingung gelandet ist — **JA**,
  `GET /api/node-services` + `POST /api/node-services/{id}/health-check` sind jetzt in `gateway.go` (Z.
  284-285) registriert (war beim Vormittags-Snapshot noch offen). Trotzdem NICHT gebaut — laut Auftrag
  explizit "Do NOT touch" für heute Nacht, unabhängig vom Registrierungsstatus. Für eine künftige Phase-4-
  Session: die Vorbedingung ist jetzt erfüllt, `lib/deployed-services.ts` könnte jetzt gebaut werden.
- OPNsense-statisches-Disabled-Flag (7.1) — ebenfalls nicht gebaut (Teil von Phase 4 in der
  Reihenfolge-Zusammenfassung, auch wenn 7.1 selbst unabhängig wäre; aus Vorsicht mit Phase 4 zusammen
  ausgelassen, um keine halb-fertige Graying-Geschichte zu hinterlassen).

### 11.3 Verifikation

- `npx tsc -p tsconfig.app.json --noEmit`: **473 Fehler** — identisch zur Baseline (per `git stash`/`stash
  pop` gegengeprüft: exakt dieselbe sortierte Fehlerliste vorher/nachher, 0 neue, 0 behobene). Keine der
  neuen/geänderten Dateien taucht in der Fehlerliste auf.
- `node scripts/check-i18n.mjs`: **passed for 60 locales and 3191 keys**.
- `npx vitest run` (komplette Suite): **419/419 bestanden**, 48 Testdateien (inkl. `section-nav.test.ts`,
  `HierarchySidebar.test.tsx` nach den 2 Update, `FirewallRulesPage.test.tsx`, `PluginCatalogPage.test.tsx`).
- Kein Commit erstellt (Standing Mandate 4) — reiner Arbeitsbaum-Diff, Parent committet.

---

## 12. Phase 4 — AUSGEFÜHRT (2026-09-28, Build-Agent, Arbeitsbaum-Diff, kein Commit)

### 12.1 Voraussetzungs-Check zuerst (Auftrag: "verify RIGHT NOW, don't trust the old report")

Der Build-Auftrag verlangte, vor jedem Frontend-Build zu prüfen, ob die 3 `node_services.go`-Routen
tatsächlich in `gateway.go` registriert sind (ein älterer Report hatte "noch nicht, andere Session"
behauptet). Verifiziert per `grep` + `git blame`:

```
gateway.go:284  mux.HandleFunc("/api/node-services", s.handleNodeServices)
gateway.go:285  mux.HandleFunc("/api/node-services/{id}/health-check", s.handleNodeServiceHealthCheck)
```

Beide Zeilen sind Teil des ursprünglichen SPRINT-142-Commits selbst (`22c16f6d`, 2026-09-28 06:58:46,
Commit-Message zitiert "Parent-Lines: … gateway-Routen …") — **bereits committet, lange vor dieser
Phase**. Der alte "noch nicht registriert"-Report war veraltet/falsch. Die aktuelle uncommittete
`gateway.go`-Änderung im Arbeitsbaum ist ausschließlich SPRINT-147 (`/api/threat-responder/status`,
`/api/security/threat-correlation`) — unrelated. **Ergebnis: keine Registrierung nötig, Phase 4 konnte
direkt mit dem Frontend-Teil starten.** `gateway.go` wurde in dieser Phase NICHT angefasst.

### 12.2 Was gebaut wurde

1. **NEU `src/frontend/src/lib/deployed-services.ts`** (102 Z.) — `useDeployedServices()`-Hook exakt nach
   §7.2-Spezifikation: iteriert `useSshEndpoints()` (`components/workspaces/ssh-target-select.tsx`), ruft
   `GET /api/node-services?node=<name>` pro Endpoint ab (Wiederverwendung des
   `SSHTargetDetailPage.tsx:87-96`-Merge-Patterns, `fetchNodeServiceRows`), merged in
   `Record<string, {anyOk: boolean, nodes: string[]}>`. Gating exakt wie §7.2 verlangt: `anyOk` wird NUR
   bei `status === 'deployed'` gesetzt — ein recorded `failed`-Deploy zählt nicht als "vorhanden" (kein
   Grünwaschen eines echten rc-Fehlers), und Health fließt bewusst NICHT in die Sichtbarkeits-Entscheidung
   ein (das bleibt ein separates Badge, §7.2 wörtlich: "Graying gilt nur für `status !== 'deployed'` …,
   nicht für `health === 'down'`"). Zusätzlich `isServiceDeployed(services, name)` als Convenience-Read.
2. **`src/frontend/src/lib/firewall-provider.ts:135-149`** — §7.1 angewendet: `opnsense.configurable` von
   `true` auf `false` geflippt. Wichtiger Fund beim Lesen des Ist-Zustands: die Proposal-Formulierung
   ("neues statisches Flag `SUPPORTED_PROVIDERS.opnsense.implemented`") beschrieb die Absicht, aber der
   Code hatte bereits GENAU diesen Mechanismus unter einem anderen Namen (`configurable: boolean` in
   `FIREWALL_PROVIDERS`, von `cloud-sg`/`byof` schon benutzt) — `ProviderCard` (Zeile 216-227) zeigt bei
   `configurable === false` bereits einen disabled Button mit `title={provider.backendFact}` als Tooltip.
   Ein zweites, paralleles Flag-System wäre selbst ein neues Mini-Duplikat gewesen (genau das SSOT-Muster,
   das dieser ganze Vorschlag bekämpft) — stattdessen den vorhandenen Mechanismus wiederverwendet, Kommentar
   mit §7.1-Zitat ergänzt, `backendFact`-Text um "not implemented yet" geschärft. **Effekt:** die
   OPNsense-Karte in Schritt 1 des Wizards ist jetzt hart disabled+ausgegraut (identische Optik zu
   cloud-sg/byof), genau wie Leo verlangt hat — vorher war OPNsense `configurable: true` und öffnete ein
   Schritt-2-Formular mit lauter disabled-Inputs (kein Bug, aber nicht das verlangte "wie wenn gar kein
   opnsense deployed ist"-Verhalten).

### 12.3 Was bewusst NICHT gebaut wurde — und warum (Diskrepanz zum Build-Auftrag, hier dokumentiert)

Der Build-Auftrag (Punkt 2) nannte als Ziel für das Graying: "Suricata panel/nav entry, Grafana embed
entry, Ozone-related entries". Der Vorschlag selbst (§7.3, Tabelle, wortwörtlich geprüft) sagt für genau
diese drei etwas anderes:

- **Suricata**: "KEIN neuer Graying-Code nötig — Suricata hat schon einen ehrlichen Empty/Error-State"
  (eigener Mechanismus, `GET /api/suricata/status`). Phase-4-Schritt 3 verlangt nur eine Dokumentations-
  Empfehlung (künftige `make redeploy SERVICE=suricata-network-ids`-Läufe sollten auch `record-deploy.sh`
  aufrufen), **keinen Pflicht-Build-Schritt** — hier als Empfehlung festgehalten, kein Code geändert.
- **Grafana**: "Kein Handlungsbedarf — dieser Mechanismus ist bereits gelöst" (`GET /api/embeds`,
  `DashboardsPage.tsx` hat schon einen ehrlichen Empty-State). Phase-4-Schritt 4 bestätigt das nochmal
  explizit ("KEIN Handlungsbedarf").
- **Ozone**: "noch kein Graying-Bedarf, weil noch nicht genavt" (Agent C/FileBrowser ist in-flight, hat
  noch keinen eigenen Nav-Eintrag) — es gibt aktuell nichts zum Ausgrauen.
- **SIEM** (im Build-Auftrag nicht genannt, aber der einzige Kandidat, wo der neue Hook tatsächlich sofort
  etwas bewirken würde): §7.3 stuft das explizit als "Niedrige Priorität … nicht P0" ein und referenziert
  eine spätere Phase, nicht Phase 4.

Da der Auftrag ausdrücklich sagt "read the proposal's Phase 4 section … follow that decision, don't
re-derive it", wurde die Vorschlags-Tabelle über die (vermutlich aus dem Gedächtnis paraphrasierte)
Auftrags-Kurzfassung gestellt: **kein neuer Graying-Code an Suricata-Panel, Grafana-Embeds oder einem noch
nicht existierenden Ozone-Nav-Eintrag** — genau wie §7.2/§7.3 es vorschreiben. Der neue Hook
(`useDeployedServices`) steht bereit und ist correct-by-construction für den Tag, an dem SIEM- oder
Ozone-Graying tatsächlich beauftragt wird (`isServiceDeployed(services, 'siem')` /
`isServiceDeployed(services, 'ozone')`), hat aber in dieser Phase noch KEINEN Aufrufer im UI — bewusst,
nicht vergessen.

### 12.4 Verifikation

- `npx tsc -p tsconfig.app.json --noEmit`: **473 Fehler** — identisch zur Baseline (0 neue, beide neuen/
  geänderten Dateien tauchen nicht in der Fehlerliste auf).
- `node scripts/check-i18n.mjs`: **passed for 60 locales and 3191 keys** (keine i18n-Keys geändert —
  `backendFact` ist ein Klartext-Zitat, kein i18n-String, konsistent mit dem bestehenden Muster für
  cloud-sg/byof).
- `npx vitest run` (komplette Suite): **419/419 bestanden**, 48 Testdateien — keine Regression, keine der
  beiden Dateien hat einen Testconsumer (kein Testfile existiert für `FirewallProviderSetupPage`/
  `firewall-provider.ts`).
- Backend unverändert (`gateway.go` nicht angefasst) — kein `go build`/`go vet` nötig, kein neuer Diff dort.
- Kein Commit erstellt (Standing Mandate 4) — reiner Arbeitsbaum-Diff, Parent committet.

### 12.5 Geänderte/neue Dateien (Datei:Zeile)

- NEU: `src/frontend/src/lib/deployed-services.ts` (102 Z.)
- GEÄNDERT: `src/frontend/src/lib/firewall-provider.ts:135-149` (`opnsense.configurable` → `false` +
  Kommentar + geschärfter `backendFact`-Text)
