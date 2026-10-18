# SIDEBAR-UX-FINAL-CONCEPT — JiMesh-Sidebar: UX-Case-Study & Ziel-Design

**Status:** UMGESETZT (27.9.2026) — Branch `sidebar-ux-final`,
docs/sprints/SPRINT-137-SIDEBAR-UX-FINAL.md (WP1–WP3 + WP5–WP8 shipped;
WP0/WP4 Selection-Mode wie hier vorgeschrieben NICHT ohne Audit-Freigabe,
A3/A9 zurückgestellt — s. Sprint-File „Ehrliche Grenzen"). Der Sidebar-Teil
von ARCHITECTURE.md §8.5 ist auf die parallelen Sektionen aktualisiert.
**Datum:** 27.9.2026
**Inputs (gelesen):**
- `docs/PROMPTS-STITCH-DESIGN.md` — Prompt 1 (Original-Sidebar) + Prompt 6 (Scope Selector)
- `docs/ARCHITECTURE.md` §8 — Server/Project/Workspace/App-Modell, §8.3b (Workspace-Namen, RBAC), §8.5 (Dual View)
- `docs_dev/prompts/glm-sidebar-scope-redesign.md` — Spezifikation + Operator-Bestätigung („BEIDE gleichzeitig sichtbar — nicht als Umschalter")
- `src/frontend/src/components/sidebar/HierarchySidebar.tsx` — aktueller Code (1113 Zeilen, 5 Sections)

**Ersetzt bei Freigabe:** den Sidebar-Teil von ARCHITECTURE.md §8.5 (Layout-Dual-Toggle) und
die Sections-1/2-Mechanik aus `glm-sidebar-scope-redesign.md`. Die Detailseiten behalten ihre
3 Ansichten (Project-gruppiert / Server-gruppiert / Einzel-Entity) — nur die SIDEBAR ändert sich.

---

## 0. TL;DR

Die aktuelle Sidebar fragt den Operator dreimal hintereinander „Wie willst du deine Daten
sehen?" (Layout-Buttons → Entity-Filter → Scope-Modal), bevor er einen einzigen Arbeits-
inhalt zu Gesicht bekommt. Das Original-Design stellte Inhalt sofort hin: zwei parallele
Sektionen (ALL SSH TARGETS + PROJECTS) mit klickbaren Aktions-Badges direkt an jeder App-Zeile.

Ziel-Design in einem Satz: **Zwei immer sichtbare Baum-Sektionen (Server, Projekte) mit
echten Namen statt UUIDs, ein einziger kompakter Scope-Regler darüber, Aktions-Badges
(Terminal / Logs / Code / Web / VNC / DSH) und [+ App]-Quick-Deploy direkt an den Zeilen,
Cross-Cutting-Links darunter.**

Damit sind alle fünf Kern-Flows in 1–2 Klicks erreichbar:

| Flow | Heute | Ziel |
|---|---|---|
| Projekt erstellen | Sackgassen-historisch (Backlog #134), Dialog nur über versteckten Button | **2 Klicks + 1 Formular** |
| App deployen | Nav-Route /workspaces/apps + Projekt/Workspace im Dropdown neu wählen | **2 Klicks + Mini-Dialog** |
| Terminal öffnen | Seitenwechsel + Tab-Umschalter auf ProjectsPage | **1 Klick** (Badge an der App-Zeile) |
| Logs sehen | dito | **1 Klick** (Badge an der App-Zeile) |
| Security prüfen | Section prominent oben, unsortiert zwischen Reglern und Baum | **2 Klicks** (Section unten, aufgeklappt on demand) |

---

## 1. Warum der Operator sagt: „die Sidebar macht keinen Sinn"

### 1.1 Ist-Zustand (Inventar des aktuellen Codes)

Von oben nach unten stehen heute FÜNF gestapelte Einheiten in `HierarchySidebar.tsx`:

1. **Layout-Buttons** [ Server | Workspace | Project ] + darunter ein **Entity-Filter-Dropdown**
   („All X" oder eine Registry-Zeile) — reiner View-State (localStorage), berührt den Scope nicht.
2. **Scope-Section**: „Choose scope…"-Dropdown → wählt LEVEL (SSH/Project/Workspace/App) →
   öffnet `ScopeSelectorModal` → Checkbox-Baum → Apply → Chips. Das ist der GLOBAL SCOPE
   (Daten-Filter für API-Calls, `lib/global-scope.ts`).
3. **Events & Observability** (5 Links: Firewall, SIEM, Network Monitoring, SAST, DAST).
4. **Navigation** (7 Links: Onboarding, Agents, Apps, Plugins, Deployments, Endpoints, Settings).
5. **Der Baum** — modusabhängig: Server→Workspaces→Apps, Projects→Workspaces→Apps oder
   eine FLATTE Workspace-Liste (Modus „Workspace", beide Achsen als Tag pro Zeile).

Dazu „+ New Project" als isolierter Button zwischen Navigation und Baum.

### 1.2 Die sieben Kernprobleme

| # | Symptom | Ursache | Beleg |
|---|---------|---------|-------|
| P1 | Drei „Wähle, was du siehst"-Apparate vor jedem Inhalt | Layout-Modus, Entity-Filter und Scope sind drei getrennte State-Stores mit fast identischer Wirkung; der Code-Kommentar selbst muss erklären, warum das Dropdown „NOT the ScopeSelectorModal" ist — eine Wahrheit, die im UI unsichtbar bleibt | `HierarchySidebar.tsx` Z. 26–50 (Kommentar), Z. 78–124, 861–935 |
| P2 | Umschalter statt paralleler Sektionen | Das bestätigte Original-Design zeigt „ALL SSH TARGETS" und „PROJECTS" BEIDE gleichzeitig; der Toggle versteckt jeweils eine ganze Achse — „Wo ist mein Projekt? Ach, ich bin im falschen Modus" | Operator-Bestätigung, Ende `glm-sidebar-scope-redesign.md`; Prompt 1 |
| P3 | Workspace-Zeilen zeigen **UUIDs** | `{ws.id}` als Label — kein Mensch kann „ws-7f3a…" einem Kontext zuordnen | Z. 702 |
| P4 | Keine Aktionen im Baum | Das Original-Design hat klickbare Integration-Badges (Terminal, Code, VNC, Web) an jeder App-Zeile; der aktuelle Baum zeigt nur `:port` — genau der schnellste Weg zu Terminal/Logs fehlt dort, wo der Nutzer hinschaut | Prompt 1 vs. Z. 720–738 |
| P5 | Modal-Kaskade für die häufigste Meta-Aktion | Einschränken = Dropdown → Level → Modal → Checkboxen → Apply (4 Interaktionen) | Z. 869–903 + Modal Z. 1102 |
| P6 | Falsche Hierarchie der Aufmerksamkeit | Events & Observability (5 teils ehrliche Platzhalter, u. a. DAST not-implemented) stehen ÜBER der Navigation und dem Baum — Monitoring-Rauschen über Arbeitsflächen | Z. 937–947 |
| P7 | Leer-Zustand ohne Anlaufpunkt | Bei 0 Workspaces (realer Stand) zeigen 3 Buttons + 2 Dropdowns + 12 Links + „+ New Project" … und null Inhalt. Das UI erklärt sich nirgends selbst; Onboarding war lange komplett unerreichbar (AUDIT-DESIGN-GAP-LIST P0 #11/#12) | Z. 984–987 |

### 1.3 Die eigentliche Ursache: ein Modell-Problem, kein Styling-Problem

§8.2 definiert Server und Project als **unabhängige Achsen** — die Workspace ist die einzige
Verbindung. Ein Umschalter („zeige Achse A ODER Achse B") widerspricht diesem Modell: er
zwingt, sich für EINE Projektion zu entscheiden, und beantwortet die Frage „was läuft wo?"
jeweils nur zur Hälfte. **Zwei parallele Sektionen sind die ehrliche Form des Modells**: eine
pro Achse, die jeweils andere Achse als kleines Tag auf der Zeile (genau die Tag-Regel aus
§8.5, nur ohne Toggle davor).

Alle P1–P7 verschwinden mit demselben Hebel: **Inhalt zuerst, Regler minimal, Aktionen an
die Zeile.**

---

## 2. Die Top-5-User-Flows

Der Operator arbeitet projektzentriert: ein Projekt anlegen, DSH/OpenCode als App
deployen, per Terminal/Logs hineinschauen, Sicherheit prüfen. Jeder Flow unten enthält:
Ziel → Ist-Klickpfad → Soll-Klickpfad → wie die Sidebar dabei aussieht.

### 2.1 Flow 1 — Projekt erstellen

**Ist:** „+ New Project" (Button zwischen Navigation und Baum) öffnet `NewProjectDialog`
(existiert, POST /api/projects). Davor: Sackgassen-Historie (Backlog #134); danach bleibt der
Baum zu, das neue Projekt taucht unaufgeklappt auf.

**Soll:** Der [+]-Knopf sitzt IM PROJECTS-Sektion-Header. Der Dialog bekommt drei
Voreinstellungen, die den Flow zum Ein-Klick-Erlebnis machen:

```
┌────────────────────────────────────┐
│ ◎ Alle Server & Projekte        ▾ │
├────────────────────────────────────┤
│ ▸ ALL SSH TARGETS              [+] │
├────────────────────────────────────┤
│ ▾ PROJECTS                    [+] │ ← Klick 1 [+]
│   ▾ trading-bot                [⚙] │
│     ▾ my project workspace [trading]│
│       ● dsh-agent :9080 [T][L][C][W]│
├────────────────────────────────────┤
│ …Navigation · Events & Obs…        │
└────────────────────────────────────┘

NewProjectDialog:
  Name            [ trading-analytics ]
  Framework       [ DeepSeek Harness (DSH) ▾ ]   ← vorausgewählt (OpenCode, gotty,
                                                     claude-code, gemini-cli, code-server…)
  Server          [ trading ▾ ]                    ← vorausgewählt, wenn nur einer existiert
  ☑ Standard-App sofort mitdeployen                ← NEU (siehe §6, A3)
  [ Abbrechen ]  [ Projekt erstellen ]             ← Klick 2
```

**Ergebnis:** Projekt ▸ Workspace ▸ App erscheint im Baum (beide Sektionen), auto-expandiert,
App mit Status-Punkt. **2 Klicks + 1 Formular.**
*Abhängigkeit:* die Checkbox „Standard-App sofort mitdeployen" braucht einen echten
Deploy-Endpoint — `GET /api/deployments` existiert noch nicht (Backlog #128). Bis dahen:
Checkbox ehrlich weglassen statt Fake-Deploy (Mandate 2); der Flow läuft dann über Flow 2 nach.

### 2.2 Flow 2 — App deployen (DSH / OpenCode / …)

**Ist:** „+ New App" ist eine NAV-Route (`/workspaces/apps`): neue Seite, dort Projekt UND
Workspace aus Dropdowns neu wählen, Formular, Deploy. Der Baum selbst hat keinen Deploy-Weg.

**Soll:** Deployen ist eine Zeilen-Aktion am Zielort:

```
PROJECTS
  ▾ trading-bot                    [⚙]
    ▾ my project workspace     [trading]
      ● dsh-agent  :9080   [T][L][C][W]
      ▸ postgres    :5432
    [+ App deployen]                     ← Klick 1 (sichtbar bei Hover/expandiert)
→ Quick-Deploy-Dialog (Mini):
     Framework [ DeepSeek Harness (DSH) ▾ ]  ← Projekt-Framework als Default
     Ziel: my project workspace @ trading   ← fix vorbefüllt, read-only
     [ Deployen ]                          ← Klick 2
```

Framework-Liste = `FrameworkId` (`types/domain/overview.ts`): `dsh`, `opencode`, `gotty`,
`claude-code`, `gemini-cli`, `code-server`, `*_code_server`-Varianten — die Deploy-Pfade
mit echten Server-Antworten existieren in ProjectsPage („Terminal renders ONLY real server
responses"). **2 Klicks + Mini-Dialog mit einem echten Entscheidungsfeld (Framework).**
Derselbe [+ App]-Badge hängt auch an Workspace-Zeilen in der SERVERS-Sektion — deployen
geht von beiden Achsen aus.

### 2.3 Flow 3 — Terminal öffnen

**Ist:** ProjectsPage öffnen → Projekt anklicken → Pane-Tab „terminal" — 3–5 Klicks durch
Seitenwechsel.

**Soll:** Das Original-Design hatte Terminal als klickbares Badge an der App-Zeile — genau
das:

```
    ▾ my project workspace          [trading]
      ● dsh-agent   :9080  [T][L][C][W]
                         ↑
                         Klick 1: [T] → PTY des App-Containers öffnet
```

**1 Klick.** Kein Seitenwechsel, kein Tab-Suche, kein Dropdown. Badge erscheint bei Hover
(auf Touch/ohne-Hover: immer sichtbar, siehe §3.5).

### 2.4 Flow 4 — Logs sehen

**Soll:** identischer Mechanismus, zweites Badge:

```
      ● dsh-agent   :9080  [T][L][C][W]
                            ↑
                            Klick 1: [L] → Live-Log-Stream (SSE)
```

**1 Klick.** Die Komponente für Live-Logs existiert bereits (`components/realtime-logs.tsx`).
Zeilen-Klick auf den App-NAMEN bleibt AppDetailPage (Kontext, Metadaten, Logs-Tab) —
Badge = Direkt-Stream, Name = Detailseite. Zwei getrennte, erwartbare Ziele.

### 2.5 Flow 5 — Security prüfen

**Soll:** Events & Observability wandert ans Ende und ist standardmäßig zugeklappt — aber
mit ehrlichem Count-Badge, damit Wichtiges nicht versteckt wird:

```
▸ Events & Observability          ⬤ 12   ← Klick 1: aufklappen
    SIEM Events                          ← Klick 2 (oder Firewall / Monitoring / SAST)
    Firewall Rules
    Network Monitoring
    SAST · DAST (DAST behält ehrliches
    „not yet implemented"-Label)
```

**2 Klicks.** Zweiter Einstieg: Server-Zeile [⚙] → Server-Detail (Firewall-Status des
Konfig-Modells, Bestand). Der Count-Badge zeigt NUR reale Event-Zahlen; keine Events = kein
Badge (Mandate 2).

---

## 3. Das Ziel-Design (1:1-Spec)

### 3.0 Gesamtlayout

256px (bestehende `w-64`), sticky links, Dark `#0d0e15`, Violet-Akzent (unverändert zum
Original-Design). Vertikal, oben nach unten, GENAU diese Reihenfolge:

```
┌──────────────────────────────────────┐
│ A  ◎ Alle Server & Projekte      [▾] │ Scope-Bar (1 Zeile, + Chips darunter)
├──────────────────────────────────────┤
│ B  ▾ ALL SSH TARGETS              [+] │ Baum-Sektion Server (parallel)
│      ● trading                 [⚙]   │
│        ▾ my project workspace [trading]│
│          ● dsh-agent :9080 [T][L][C][W]│
│      ○ workspace-prod           [⚙]   │
├───────────────────────────────────┤
│ C  ▾ PROJECTS                    [+] │ Baum-Sektion Projekte (parallel)
│      ▾ trading-bot              [⚙]  │
│        ▾ my project workspace [trading]│
│          ● dsh-agent :9080 [T][L][C][W]│
│        ▸ company workspace           │
│        ▸ alice                    [projekt]│
├──────────────────────────────────┤
│ D  ▾ Navigation                       │ 7 Cross-Cutting-Links
├──────────────────────────────────┤
│ E  ▸ Events & Observability    (12)   │ default zugeklappt
└──────────────────────────────────┘
   ┌────────────────────────────────┐
   │ 2 ausgewählt ×  [Plugin installieren]│ nur sichtbar im Selection-Mode (§3.8)
   └────────────────────────────────┘
```

Beide Baum-Sektionen (B und C) zeigen dieselbe Workspace-/App-Menge aus der jeweils
anderen Perspektive — das ist Absicht (§1.3: zwei Achsen, ehrlich nebeneinander). Um die
Länge zu bändigen: **PROJECTS default offen, SERVERS default zu** (Arbeit ist projektzentriert;
Server-Sektion ist Ops-/Gesundheitsblick), beide per Chevron umschaltbar, Zustand pro Viewer
persistiert.

### 3.1 Section A — Scope-Bar (der EINZIGE globale Regler)

- **Trigger:** 1 Zeile — Crosshair-Icon + Zusammenfassung des aktiven Scopes:
  - kein Scope: „Alle Server & Projekte"
  - Multi: „2 Server · 1 Projekt"
  - Single: der Name („trading", „my-project")
- **Popover statt Level-Modal:** Klick öffnet EINEN Inline-Popover mit dem Checkbox-Baum
  aus `ScopeSelectorModal` (wiederverwenden, nicht neu bauen): Gruppe „ALL SSH TARGETS"
  mit Checkboxen je Server + Gruppe „PROJECTS" mit Checkboxen je Projekt. Beide Achsen in
  einem Baum — die Levels-Auswahl (Dropdown → Modal) entfällt komplett.
  Apply = `setGlobalScope` mit den Multi-Arrays (bestehende Mechanik, unverändert).
- **Chips:** aktive Multi-Auswahl als eine Zeile kompakte Chips unter dem Trigger
  (bestehende Chip-Logik inkl. Entfernen übernimmt 1:1).
- **Leerer Zustand im Popover:** keine Server/Projekte → ehrlicher Hinweis + zwei Buttons
  [+ Server registrieren] [+ Projekt erstellen] (Springer zu Onboarding bzw. Dialog).
- **Filter-Feld** (optional, WP zuletzt): kleines Suchfeld im Popover UND als zweite Zeile
  der Bar; filtert die Baum-Sektionen B/C client-seitig (reiner View-State, nie Scope).

Baum-Zeilen-Klicks schreiben weiterhin `setGlobalScope` (single-form, wie heute
`selectProject/selectWorkspace/selectApp`): **EIN Scope-Konzept, zwei Eingänge** —
Regler für Multi, Klick für Navigation. Der Entity-Filter (zweiter State-Store) entfällt.

### 3.2 Section B — „ALL SSH TARGETS" (Sektion-Header wie im Original)

- **Header:** Layers-Icon + fett „ALL SSH TARGETS" + [+] (→ Server registrieren: bestehende
  Endpoints-Form, `/workspaces/endpoints`) + Collapse-Chevron.
- **Server-Zeile:** Status-Punkt (§3.9) + Server-Icon + **Name** (Host als `title`) +
  [⚙] → `/workspaces/targets/:name`. Klick = expandieren.
- **Expandiert:** Workspaces auf diesem Server, je Zeile mit **Project-Tag** (§8.5-Tag-Regel),
  darunter deren Apps. Server ohne Workspaces = ehrliche leere Gruppe.
- **Empty State:** „Noch kein Server registriert" + [Server registrieren] (→ Onboarding
  Schritt 2, realer SSH-Probe).

### 3.3 Section C — „PROJECTS"

- **Header:** Folder-Icon + fett „PROJECTS" + [+] (→ `NewProjectDialog`, Flow 1) + Chevron.
- **Projekt-Zeile:** Folder-Icon + Name + [⚙] → ProjectDetailPage. Klick = expandieren
  (das bestehende open/close-Navigationsverhalten: Öffnen → Detail, Schließen → /overview,
  behalten).
- **Expandiert — Workspace-Zeilen nach §8.3b, IMMER diese Reihenfolge:**
  1. **„my project workspace"** (eigene, i18n-Key `sidebar.myWorkspace`)
  2. **„company workspace"** (geteilte, `sidebar.companyWorkspace`)
  3. weitere User-Workspaces: „<User-Name>"; Name unbekannt → ehrliche Raw-ID statt Fake
  4. „Unassigned"-Bucket (bestehende `FALLBACK_PARENT_ID`-Logik), nur wenn belegt
- Jede Workspace-Zeile trägt den **Server-Tag** (`ws.sshTarget`), plus [+ App] und
  [Terminal] bei Hover (§3.5). Unassigned-Workspaces erscheinen zusätzlich unter dem
  Server „no server".
- **Empty State:** „Noch keine Projekte" + [Projekt erstellen].

### 3.4 Section D — Navigation

Die 7 bestehenden Links unverändert (`NAVIGATION_ITEMS`: Onboarding, Agents, Apps, Plugins,
Deployments, SSH Endpoints, Settings) — gleiche Keys (`nav.*`), gleicher `pathIn`-Matcher,
gleiche Icons. Klarstellung im Konzept: die Sidebar ist die ZWEITE Rendering-Stelle (die
obere Navbar bleibt primär); `/workspaces/apps` bleibt als App-Management-Übersicht
erhalten, ist aber nicht mehr der Deploy-Weg (der ist [+ App] an der Zeile).

### 3.5 Row-Anatomie — Aktionen an der Zeile (der wichtigste neue Teil)

Alle Badges erscheinen bei Hover (Desktop) / permanent auf Touch-Geräten; nur Badges
rendern, deren Integration REAL existiert — nichts deklarieren, was nicht da ist (Mandate 2).

**App-Zeile** (in beiden Sektionen identisch):
`[Typ-Icon] Name  :port  [T][L][C][W][V][D]` + Status-Punkt davor.

| Badge | Voraussetzung (`IntegrationKind`, types/domain/overview.ts) | Ziel |
|---|---|---|
| **[T] Terminal** | `shell` | PTY des Containers im rechten Split-Pane (gleiche Technik wie ProjectsPage-Terminal-Tab, nur ohne Seitenwechsel) |
| **[L] Logs** | jede App | Live-SSE-Stream, `realtime-logs.tsx` wiederverwenden |
| **[C] Code** | `code-server` (`dsh_code_server`, `opencode_code_server`, …) | Code-Server-iframe (bestehender Pane) |
| **[W] Web** | `iframe` | App-UI im iframe |
| **[V] VNC** | `vnc` | noVNC-Pane (wie OpenCode-„noVNC Console") |
| **[D] DSH** | `dsh-session` | DSH-Session: `/sessions/:sessionId` bzw. `trigger_dsh_turn` über die bestehenden MCP-Tools (`list_dsh_profiles`, `tools_dsh.go`) |

Zeilen-Klick auf Name = `selectApp` → AppDetailPage + Scope (bestehende Logik 1:1).

**Workspace-Zeile:** `[User-Icon] Name [Gegenachsen-Tag]  [+App] [T]`
- [+ App] → Quick-Deploy-Dialog (Flow 2), Ziel vorbefüllt (Workspace fix, Server aus `ws.sshTarget`, Framework aus Projekt)
- [Terminal] → Workspace-Shell (PTY auf Workspace-Ebene)
- Zeilen-Klick = `selectWorkspace` → WorkspaceDetailPage (bestehende Route; Demo-Daten dort
  bleiben bis Backlog #128 ehrlich als Demo gelabelt)

**Server-Zeile:** Status-Punkt + Name + [⚙] → SSHTargetDetailPage.

### 3.6 Section E — Events & Observability

Inhalt unverändert (`EVENTS_ITEMS`: Firewall Rules, SIEM, Network Monitoring, SAST, DAST —
DAST behält sein ehrliches „not yet implemented"-Label). Änderungen: Position ans Ende,
default zugeklappt, **Count-Badge** mit realer Event-Anzahl (nur > 0; Quelle: bestehende
Events-Endpunkte). Der Scope der Section folgt dem globalen Scope („Events für trading").

### 3.7 Erzeugen = kontextuell (keine isolierten Create-Buttons)

| Objekt | [+] sitzt | Öffnet |
|---|---|---|
| Server | SERVERS-Header | Endpoints-Form (`/workspaces/endpoints`) |
| Projekt | PROJECTS-Header | `NewProjectDialog` (existiert) |
| Workspace | Workspace-Zeile? — nein: Projekt-Kontextmenü „+ Workspace" (bestehendes `?project=`-Ensure-Dialog, heute schon am Projekt-Knoten) | wie heute |
| App | [+ App]-Badge an Workspace-Zeile | Quick-Deploy-Dialog (§2.2) |

Der freistehende „+ New Project"-Knopf zwischen Navigation und Baum entfällt — er lebt
jetzt im PROJECTS-Header.

### 3.8 Multi-Select & Selection-Bar

Die Multi-Select-Pflicht aus `glm-sidebar-scope-redesign.md` bleibt — aber am Objekt statt
im Modal:

- **Einstieg:** kleiner „Auswählen"-Toggle in der Scope-Bar ODER Ctrl/Cmd+Klick auf Zeilen.
  Selektierte Zeilen: Akzent-Border + Checkbox-Icon.
- **Selection-Bar** (floating unten in der Sidebar, nur bei ≥1 Auswahl): „N ausgewählt · ×" +
  Aktions-Buttons. Erweitert die Scope-Auswahl im Popover (gleicher `setGlobalScope`-Store).
- **Audit-Pflicht bleibt unverändert bestehen:** VOR jeder verbindenden Aktion die
  Endpoint-Audit-Tabelle („Endpoint | Multi-fähig JETZT? | NÖTIG? | Aufwand") aus der Spec
  erstellen und vom Operator freigeben. Eine Aktion wie „Plugin in alle ausgewählten
  Workspaces installieren" wird NUR aktiviert, wenn der Endpoint Listen nimmt; sonst
  `disabled` mit Tooltip „Endpoint nimmt nur ein Ziel (Audit-tbd)". Kein Multi-Widget für
  einen single-Ziel-Endpoint (Spec-Zitat, unverändert gültig).
- Selektion ist flüchtig (sessionStorage), NICHT der persistente Scope.

### 3.9 Status-Punkte & Ehrlichkeit

- Grün = läuft, Rot = gestoppt, **Grau = unbekannt** — und grau ist der Default, bis
  `GET /api/deployments` existiert (Backlog #128). Kein Fake-Grün (Mandate 2).
- Event-Count nur aus realen Events.
- DAST-Link behält Platzhalter-Label.
- Workspace-Namen: realer Anzeigename; wenn das Backend den User-Namen (Keycloak `sub`)
  nicht auflöst → Raw-ID, nie ein erfundener Name.

### 3.10 Zustands-Modell (was lebt wo)

| Zustand | Store | Bemerkung |
|---|---|---|
| Global Scope (Multi, Daten-Filter) | `lib/global-scope.ts` (unverändert) | Geschrieben von Scope-Popover UND Zeilen-Klick |
| Sektion/Zeilen aufgeklappt | localStorage `jimesh.sidebar-collapsed` (NEU, ein Key) | **ersetzt** `jimesh.sidebar-view-mode` + `jimesh.sidebar-entity-filter` (beide sterben) |
| Selection-Mode + gewählte Zeilen | sessionStorage (flüchtig) | für Multi-Aktionen |
| Filtertext | Komponenten-State (flüchtig) | reine Ansichts-Hilfe |

---

## 4. Login → „App läuft auf Server" mit minimalen Klicks

### 4.1 Kaltstart (frische Installation: kein Server, kein Projekt)

| Schritt | Aktion | Klicks |
|---|---|---|
| 1 | Login → /overview; PROJECTS-Sektion zeigt Empty-State mit [Onboarding starten] | **1** |
| 2 | Wizard (bestehende OnboardingPage, 4 Schritte): Schritt 2 — SSH-Daten, [Registrieren & Verifizieren] (realer SSH-Probe) | **1** + 1 Formular |
| 3 | Schritt 3 — Firewall-Default übernehmen | **1** |
| 4 | Schritt 4 — Framework **DSH vorausgewählt**, [Deployen & Fertigstellen] | **1** |
| → | Baum: `trading ▸ <projekt> ▸ my project workspace ▸ dsh-agent ●` | — |

**Gesamt: 4 Klicks + 1 SSH-Formular.** Der Wizard existiert vollständig (TASK-090); neu ist
nur, dass der Empty-State der Projekt-Sektion der bewusste Einstieg ist. Deploy-Endpoint
dafür erforderlich (Backlog #128 bzw. bestehender ProjectsPage-Deploy-Pfad) — sonst ehrlich
ohne Auto-Deploy und Flow 4.2 nachschalten.

### 4.2 Warmstart (Server „trading" existiert)

| Schritt | Aktion | Klicks |
|---|---|---|
| 1 | [+] am PROJECTS-Header | **1** |
| 2 | Dialog: Name + Framework (DSH vorausgewählt) + Server (trading vorausgewählt, wenn einziger) + ☑ „Standard-App sofort mitdeployen" → [Erstellen] | **1** + 1 Formular |
| → | Beide Sektionen zeigen `trading-bot ▸ my project workspace ▸ dsh-agent ●`, auto-expandiert | — |

**Gesamt: 2 Klicks + 1 Formular.** Ohne Auto-Deploy-Checkbox: [+ App] an der Workspace-Zeile
(1 Klick) + Mini-Dialog (1 Klick) = 4 Klicks gesamt.

### 4.3 Zum Vergleich: der heutige Pfad

Onboarding war lange unerreichbar (P0 #11/#12); Projekterstellung endete in der
`/workspaces`-Sackgasse (Backlog #134); „+ New App" = Nav-Route mit Neu-Selektion von
Projekt UND Workspace; Terminal/Logs nur über ProjectsPage-Seitenwechsel und Tab-Umschalter;
Erstkontakt mit der Sidebar: 3 Modus-Buttons + 2 Dropdowns + 12 Links, 0 Inhalt.
Summa: >10 Klicks bis „App läuft und ich sehe ihr Terminal". Der Ziel-Pfad braucht 2–4.

---

## 5. Raus damit (Kill-Liste)

| # | Raus | Code-Beleg | Begründung |
|---|---|---|---|
| K1 | **3 Layout-Buttons** [Server|Workspace|Project] + `VIEW_MODE_KEY`/`loadViewMode` | Z. 78–140, Render 805–827 | Parallele Sektionen zeigen beide Achsen; Modus-Frage entfällt (P2). Der Modus „Workspace" (flache UUID-Liste) ist das schlechteste aller Formate. |
| K2 | **Entity-Filter-Dropdown** + `ENTITY_FILTER_KEY` + Validierungs-Memos | Z. 88–124, 285–294, 584–618, 832–858 | Zweiter Selection-Store neben dem Scope mit ununterscheidbarer Wirkung (P1). Zeilen-Klick im gefilterten/existierenden Baum erledigt das Natürlichere. |
| K3 | **Level-Dropdown vor dem Scope-Modal** („Choose scope…" → 4 Level → Modal) | Z. 861–903 | 4 Interaktionen für eine Einschränkung; ein Popover mit beiden Achsen ersetzt alles (P5). Modal-INTERNA (Checkbox-Baum, Chips) bleiben. |
| K4 | **Section-Reihenfolge Events über Navigation** | Z. 937–958 | Monitoring ist Reaktion, nicht Primärarbeit; ans Ende, zu, mit Count (P6). |
| K5 | **Freistehender „+ New Project"-Button** zwischen Nav und Baum | Z. 975–983 | Create gehört in den Sektions-Header (§3.7). |
| K6 | **UUID als Workspace-Label** (`{ws.id}`) | Z. 702 | §8.3b definiert echte Namen; UUIDs sind nicht menschenlesbar (P3). |
| K7 | **„+ New App" als primärer Erzeug-Weg über die Nav-Route** | NAVIGATION_ITEMS + `selectApp` | Deploy ist eine Zeilen-Aktion am Ziel (§2.2). Die Route bleibt Management-Übersicht. |

Nicht gekillt: ScopeSelectorModal-Inhalte, GlobalScope-Store, NewProjectDialog, Events/Nav-Link-
Inventare (nur Position), bestehende Detail-Routen.

---

## 6. Was fehlt (Add-Liste)

| # | Neu | Warum | Vorhandene Basis |
|---|-----|-------|------------------|
| A1 | **Integration-Badges an App-Zeilen** (T/L/C/W/V/DSH) | Flows 3+4 in 1 Klick; Original-Design hatte sie | Prompt 1; `IntegrationKind` + Framework-Typen existieren; Panes/Terminal-Logik in ProjectsPage |
| A2 | **[+ App]-Quick-Deploy an Workspace-Zeile** mit Framework-Presets (DSH-Default, OpenCode prominent) | Flow 2 ohne Neu-Selektion | `FrameworkId`-Liste, ProjectsPage-Deploy mit echten Antworten |
| A3 | **„Standard-App sofort mitdeployen"** in NewProjectDialog (Framework-Vorauswahl DSH) | Login→App-läuft in 1 Dialog | Dialog existiert; braucht echten Deploy-Endpoint (Backlog #128) — ohne ihn ehrlich weglassen |
| A4 | **Auto-Onboarding-Einstieg** über Empty-State (0 Projekte → [Onboarding starten]) | Kaltstart-Pfad 4.1; OnboardingPage existiert, war unerreichbar | OnboardingPage (4 Schritte, realer SSH-Probe) |
| A5 | **Status-Punkte** je Server/App-Zeile | „Läuft das?" auf einen Blick | erst nach #128 real; bis dahin grau = unbekannt |
| A6 | **Event-Count-Badge** an Events & Observability | Wichtiges drängt ohne Dauerrausschalten | bestehende Events-Endpunkte |
| A7 | **Echte Workspace-Anzeigenamen** („my project workspace", „company workspace", <User>) | §8.3b, statt UUIDs | WorkspaceRow + Keycloak `sub`; Raw-ID als ehrlicher Fallback |
| A8 | **Scope-Bar als Zusammenfassung + Popover + Chips** | ein Regler statt drei (P1/P5) | ScopeSelectorModal-Inhalte, Chips-Logik |
| A9 | **Suchfeld** (Tree-Filter, client-only) | ab ~10 Objekten; beide Sektionen sind lang | trivial, nur View-State |
| A10 | **Selection-Bar + Selection-Mode** für Multi-Aktionen | Operator-Use-Case „Plugin in mehrere Workspaces pushen" | Audit-Pflicht aus der Spec bleibt VOR dem Verdrahten |

---

## 7. Umsetzung: Work-Packages, Dateien, Abhängigkeiten

**Betroffene Dateien:** `components/sidebar/HierarchySidebar.tsx` (Hauptumbau),
`components/overview/ScopeSelectorModal.tsx` (Popover-Umbau der Interna, Modal-Shell fällt),
`components/projects/NewProjectDialog.tsx` (A3), `components/realtime-logs.tsx` (Wiederverwendung),
`lib/global-scope.ts` (unverändert), `i18n/locales/*` (60 Locales: ~12 neue Keys, s. u.),
`components/sidebar/HierarchySidebar.test.tsx` (anpassen).

**Neue i18n-Keys (grob):** `sidebar.scopeAll`, `sidebar.myWorkspace`, `sidebar.companyWorkspace`,
`sidebar.quickDeploy`, `sidebar.emptyServers`, `sidebar.emptyProjects`, `sidebar.startOnboarding`,
`sidebar.selectMode`, `sidebar.selectionCount`, `sidebar.badge.terminal/logs/code/web/vnc/dsh`,
`sidebar.deployDefaultApp`. Bestehende Keys (`sidebar.*`, `nav.*`, `scopeSelector.*`) weiterverwenden.

**Reihenfolge (je WP reviewed + getestet):**
1. **WP0** Multi-Select-Endpoint-Audit-Tabelle (aus der Spec, unverändert gültig) → Operator-Freigabe.
2. **WP1** Scope-Bar (Popover aus Modal-Inhalten) + K1/K2/K3 entfernen (ein Selection-Konzept).
   Akzeptanz: jede Overview-Seite respektiert den Scope wie heute; kein zweiter Store mehr.
3. **WP2** Parallele Sektionen B/C inkl. §8.3b-Namen, Tags, Collapse-Persistenz, Empty-States (K6).
4. **WP3** Row-Aktionen: Badges (A1), [+ App] (A2), [⚙], Status-Punkte grau-bis-real (A5).
5. **WP4** Selection-Mode + Selection-Bar, Aktionen NUR für audit-freigegebene Endpoints (A10).
6. **WP5** Sections D/E umsortieren + Count-Badge (K4, A6); A3/A4 (Dialog-Checkbox, Empty-Onboarding) sobald Deploy-Endpoint-Stand geklärt.

**Akzeptanz je Flow (messbar):** F1 ≤ 2 Klicks · F2 ≤ 2 Klicks + Mini-Dialog · F3 = 1 Klick ·
F4 = 1 Klick · F5 ≤ 2 Klicks. Zero-States zeigen je einen handelnden Einstieg (kein reiner Text).

**Offene Abhängigkeiten (ehrlich):**
- `GET /api/deployments` fehlt (Backlog #128) → A3/A5 nur mit echtem Endpoint, sonst
  ehrlich grau/weggelassen.
- Workspace-Anzeigename braucht User-Namens-Auflösung (Keycloak) — sonst Raw-ID.
- Multi-Aktionen: Audit vor UI (WP0), sonst disabled.

**Doku-Pflicht bei Umsetzung (Mandate):** ARCHITECTURE.md §8.5 Sidebar-Teil aktualisieren
(parallele Sektionen statt Dual-Toggle; Tag-Regel + Detailseiten-Dreifachansicht bleiben),
Plan-Sektion im aktuellen Sprint-File, Backlog-Spiegel; API_DOCS nur falls ein neuer
Deploy-Endpoint entsteht. Dieses Dokument hier ist die Vorlage dafür.

---

*Grundprinzip des gesamten Konzepts, in einem Satz: Die Sidebar zeigt das Inventar des
Operators (Server und Projekte, beide Achsen, echte Namen) und legt jede Aktion dorthin,
wo das Objekt steht — Regler nur dort, wo wirklich Auswahl nötig ist.*
