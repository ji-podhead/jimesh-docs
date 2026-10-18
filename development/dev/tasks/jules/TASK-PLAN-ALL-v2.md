# JiMesh — Jules Task-Plan v2 (komplett überarbeitet nach Operator-Feedback)

**Datum:** 15.9.2026 (v2) | **Agent:** Jules (async, GitHub-basiert)
**Ersetzt:** v1 (die alte Plan-Datei hatte die Probleme nicht konkret genug — der Operator hat die Lücken benannt)
**Format je Task:** Problem / Ursache / Scope / Acceptance / Constraints

---

## ÜBERGREIFENDE DIAGNOSE (warum es so kacke ist)

| # | Problem | Ursache |
|---|---|---|
| 1 | User-Forms: alles doppelt eingeben (SSH-Endpoints + Projekte separat) | Die Forms sind als 2 getrennte Pfade gebaut statt SSH-Endpoints als Voraussetzung (Dropdown-Auswahl) im Workspace-Form |
| 2 | Die schönen Forms (Dropdowns) sind weg | Die neue IA (TASK-053) hat die Formulare neu gebaut ohne die Dropdown-Variante zu erhalten |
| 3 | Integrations existieren, aber NULL nutzbar | Firewall-Backend: 0 Frontend-Verbraucher · SIEM-Backend: 0 Verbraucher · SDK: 0 Verbraucher — die Backends wurden gebaut, NULL Views konsumieren sie |
| 4 | Firewall + SIEM fehlen im Frontend komplett | gleiche Ursache wie 3 |
| 5 | Alles hartkodiert, NULL dynamisch | statische Namen/Arrays statt API-Daten; kein dynamisches Auswählen aus bestehenden SSH-Endpoints/Projects |
| 6 | Stale-Warnung 1000000× wiederholt, nichts wird damit gemacht | statischer Warn-Text ohne Logik-Verbraucher; kein Auto-Resolve, kein "als gelesen markieren" |
| 7 | Kein SSOT — redundante Integrations, die sich nicht kennen | kein gemeinsamer Frontend-Store; Firewall/SIEM/SDK/Scanner laufen parallel ohne gemeinsame State-Source |
| 8 | Das geplante Sidebar-Feature (Hierarchie + Dropdowns) fehlt | TASK-053 hat's geplant, aber nie gebaut (die Sidebar wurde als rechtsseitiges Overlay gebaut statt links als Haupt-Navigation) |
| 9 | Piss-Dropdown, keine Sortierung nach Target→Workspace→App | das Dropdown zeigt Auto-named Apps unsortiert; keine 3-Ebenen-Sortierung |
| 10 | Kryptische Namen, die kein Mensch versteht; teilweise Leichen | automatische Namensgebung ohne Existenz-Prüfung; kein Leichen-Bereinigen |

**Die Wurzel:** Jede View wurde ISOLIERT gebaut (parallel, von verschiedenen Agents), ohne gemeinsamen Store, ohne Backend→Frontend-Verbraucher-Matrix, ohne dynamische Namen aus der API. Das Ergebnis: 1000 Inseln, die sich nicht kennen.

---

## TASK-J1 — SSOT-Frontend-Store + dynamische API-Daten (die WURZEL von 3, 4, 5, 6, 7, 9)

**Problem:** Alles hartkodiert, NULL dynamisch, kein SSOT — jede View hat eigene statische Arrays statt API-Daten.
**Ursache:** Kein gemeinsamer Frontend-Store; jede View hat ihre eigenen lokalen State-Werte.
**Scope:**
- `src/frontend/src/lib/store.ts` (NEU — zentrale Frontend-State-Verwaltung)
- Alle Views: statische Arrays → API-Daten aus dem Store
**Aufgabe:**
1. **Zentraler Store bauen** (React Context oder Zustand — NICHT Redux, das ist Overkill): SSH-Endpoints, Projects/Workspaces, Apps/Deployments, Firewall-Rules, SIEM-Events — alles als Queries aus der API, ein Store, alle Views konsumieren daraus.
2. **Statische Arrays eliminieren:** Jede Hardcoded-Liste (Firewall-Regeln, SIEM-Events, Node-Namen, App-Namen) → API-Query aus dem Store.
3. **Dynamische Namen:** Kein "jimesh-app-3" als Label — der echte Name aus der API (Project-Name, App-Name vom Deploy-Parameter).
4. **Leichen eliminieren:** Apps/Projects die nicht mehr in der DB sind, aber noch im Frontend-State hängen → automatische Synchronisation mit der API (kein manuelles Bereinigen).
5. **Stale-Warnungen verarbeiten:** Die "stale warning" ist nicht statischer Text — sie bekommt einen "als gelesen markieren"-Mechanismus (DB-Flag) oder wird aus dem Store entfernt wenn das Problem gelöst ist.
**Acceptance:**
- [ ] Kein statisches Array in Views (alles aus dem Store)
- [ ] Der Store kennt SSH-Endpoints, Projects, Apps, Firewall, SIEM
- [ ] Die Namen sind dynamisch aus der API (keine kryptischen Auto-Namen)
- [ ] Leichen sind automatisch weg (API-Sync)
- [ ] Stale-Warnungen haben einen Verarbeitungs-Mechanismus

---

## TASK-J2 — Sidebar-Rebuild: 3-Ebenen-Hierarchie, LINKS, aus dem SSOT-Store (die WURZEL von 1, 8, 9, 10)

**Problem:** Die Sidebar existiert nicht (oder ist als Overlay rechts gebaut statt links als Haupt-Nav). Das geplante Hierarchie-Feature (SSH → Projects → Apps) wurde nie gebaut.
**Ursache:** TASK-053 hat es geplant, aber nie gebaut; die Sidebar wurde als rechtsseitiges Overlay gebaut statt links als Haupt-Navigation.
**Scope:**
- `src/frontend/src/components/sidebar/` (NEU — 3-Ebenen-Hierarchie-Komponente)
- `src/frontend/src/lib/store.ts` (Daten aus TASK-J1)
- Alle Views: die alte Sidebar entfernen
**Aufgabe:**
1. **3-Ebenen-Hierarchie bauen** (aufklappbar, wie Leobot-Sessions):
   - Level 0: SSH-Targets (user@host, aus dem Store — dynamisch!)
   - Level 1: Projects/Workspaces unter dem Target (aus dem Store — dynamisch!)
   - Level 2: Apps/Deployments unter dem Project (aus dem Store — dynamisch!)
2. **Sortierung innerhalb jeder Ebene:**
   - SSH-Targets: alphabetisch nach Hostname
   - Projects: alphabetisch nach Name (der echte Name aus der API, kein kryptischer Auto-Name)
   - Apps: alphabetisch nach Name
3. **"New Project" / "New App" Buttons** am Ende jeder Ebene (öffnet das bestehende Formular, NICHT localStorage)
4. **Klick-Pfad:** Target aufklappen → Project aufklappen → App klicken → navigiert zur Deployment-Ansicht
5. **Aktive Selektion visuell markiert** — steuert den Scope für alle anderen Views (Logs, Analytics, Security)
6. **Die alte SectionRail/MiniSidebar entfernen** (die rechtsseitige Overlay-Variante)
**Acceptance:**
- [ ] Sidebar ist LINKS, als Haupt-Navigation
- [ ] 3 Ebenen: SSH-Target → Project → App (aufklappbar)
- [ ] Sortierung: alphabetisch in jeder Ebene
- [ ] Dynamische Namen aus der API (keine kryptischen Auto-Namen)
- [ ] Keine Leichen (nur echte, aus der DB)
- [ ] [+ New] Buttons öffnen die bestehenden Formulare
- [ ] Die alte rechtsseitige Rail ist weg
**Constraints:** Kein Backend-Change. Die Daten kommen aus TASK-J1's Store.

---

## TASK-J3 — Forms-Rebuild: Dropdown-Auswahl statt doppelt eingeben (die WURZEL von 1, 2)

**Problem:** Alles doppelt eingeben (SSH-Endpoints + Projects separat). Die schönen Forms mit Dropdowns sind weg.
**Ursache:** Die Formulare wurden als 2 getrennte Pfade gebaut ohne die bestehenden Endpoints als Dropdown-Auswahl zu nutzen.
**Scope:**
- `ProjectsPage.tsx`, `WorkspacesPage.tsx`, `scope-selector.tsx`
- Die Formulare nutzen den Store aus TASK-J1
**Aufgabe:**
1. **Workspace-Deploy-Form:** SSH-Endpoint als **Dropdown-Auswahl** aus dem Store (nicht Freitext-Host/User/Pass). Wenn der User keinen Endpoint hat → Link zur SSH-Endpoint-Verwaltung (kein Inline-Form).
2. **App-Deploy-Form:** Project als **Dropdown-Auswahl** aus dem Store (nicht Freitext-Name). SSH-Target als Dropdown (geerbt vom Project).
3. **EIN Formular pro Aktion** (kein separates "New Project"- und "New Workspace"-Formular):
   - "New Project" = Workspace-Create (Name + SSH-Endpoint-Dropdown + Preset)
   - "New App" = App-Deploy (Project-Dropdown + Framework + Runtime + Ports)
4. **Der Form-State kommt aus dem Store** (nicht localStorage): der ausgewählte SSH-Endpoint, das ausgewählte Project, die App-Konfiguration — alles aus dem SSOT-Store (TASK-J1).
5. **gVisor-Checkbox** bleibt auf der SSH-Endpoint-Verwaltung (Node-Eigenschaft, nicht Workspace).
**Acceptance:**
- [ ] SSH-Endpoint = Dropdown-Auswahl (nicht Freitext)
- [ ] Project = Dropdown-Auswahl (nicht Freitext)
- [ ] Keine doppelte Eingabe (SSH-Endpoint einmal konfigurieren, dann überall auswählen)
- [ ] Die Form-State kommt aus dem Store
- [ ] gVisor bleibt auf der Node-Ebene
**Constraints:** Kein Backend-Change. Die bestehenden API-Endpoints werden genutzt.

---

## TASK-J4 — Firewall-Rules-UI + SIEM-Events-View (die WURZEL von 3, 4)

**Problem:** Integrations existieren, aber NULL nutzbar. Firewall + SIEM fehlen komplett im Frontend.
**Ursache:** Die Backends wurden gebaut, NULL Views konsumieren sie (0 Treffer auf firewall/rules und siem in Views).
**Scope:**
- Firewall: `src/frontend/src/views/FirewallRulesPage.tsx` (NEU)
- SIEM: `src/frontend/src/views/SIEMEventsPage.tsx` (NEU)
- Beide nutzen den Store aus TASK-J1
**Aufgabe:**
1. **Firewall-Rules-UI:**
   - Liste: Alias, Port, Protocol (aus GET /api/firewall/rules)
   - Grant/Revoke: POST/DELETE (Operator-Lane, OPA-gated)
   - User-Sicht: read-only
   - Ebenen-Badges: 1=Sandbox (gVisor), 2=Egress (nftables NS), 3=Router-Firewall
2. **SIEM-Events-View:**
   - Liste: Scanner (Wazuh/Falco/Checkov), Rule, Severity, Zeit
   - Filter: nach Scanner, Severity, Zeitraum
   - Die Daten kommen aus GET /api/sdk/logs?type=audit (die bestehende API)
   - Die Security-Critical-Injektion (TASK-076) rendert hier als Events
3. **Beide in der Sidebar sichtbar** (TASK-J2-Hierarchie: unter Security oder als eigener Entry)
**Acceptance:**
- [ ] Firewall-Rules-UI zeigt echte Regeln (aus der API, nicht hardcodiert)
- [ ] Grant/Revoke funktioniert (Operator)
- [ ] SIEM-Events-View zeigt echte Events (Wazuh/Falco/Checkov)
- [ ] Filter funktionieren (Scanner, Severity, Zeit)
- [ ] Beide in der Sidebar sichtbar
**Constraints:** Kein Backend-Change — die Routen existieren.

---

## TASK-J5 — Stale-Warnungen + Leichen-Bereinigung (die WURZEL von 6, 10)

**Problem:** Stale-Warnung 1000000× wiederholt, nichts wird damit gemacht. Kryptische Namen, Leichen.
**Ursache:** statischer Warn-Text ohne Logik-Verbraucher; automatische Namensgebung ohne Existenz-Prüfung.
**Scope:**
- `src/frontend/src/views/SecurityExposurePage.tsx` (stale warnings)
- Der Store aus TASK-J1 (Leichen-Sync)
**Aufgabe:**
1. **Stale-Warnungen:**
   - Jede Warnung bekommt einen "Resolve"-Button (mit Aktion: was muss getan werden)
   - Jede Warnung bekommt ein "Dismiss"-Flag (DB-Flag, nicht localStorage)
   - Wenn das Problem gelöst ist (API prüft), verschwindet die Warnung automatisch
   - Keine wiederholte Anzeige derselben Warnung ohne neue Daten
2. **Leichen-Bereinigung:**
   - Apps/Projects die nicht mehr in der DB sind → automatische Synchronisation (TASK-J1's Store)
   - Kryptische Auto-Namen → der echte Name aus der Deploy-Parameter (der Name, den der User beim Deploy angegeben hat)
   - Leichen-Detection: Projekte mit Status `failed` oder `deleted` aber noch im Frontend-State → aus dem Store entfernen
**Acceptance:**
- [ ] Keine wiederholte Anzeige derselben Warnung (Dismiss-Flag funktioniert)
- [ ] Warnungen haben einen "Resolve"-Button mit echter Aktion
- [ ] Keine kryptischen Namen (der echte Name aus der API)
- [ ] Keine Leichen (nur echte, aus der DB)
**Constraints:** DB-Flag statt localStorage (Mandat 3).

---

## Task-Reihenfolge (Abhängigkeiten)

```
TASK-J1 (SSOT-Store) ← DIE WURZEL, alles andere hängt daran
  ↓
TASK-J2 (Sidebar-Hierarchie) ← braucht TASK-J1's Store
  ↓
TASK-J3 (Forms-Rebuild) ← braucht TASK-J1's Store + TASK-J2's Sidebar
  ↓
TASK-J4 (Firewall + SIEM UI) ← braucht TASK-J1's Store + TASK-J2's Sidebar
  ↓
TASK-J5 (Stale + Leichen) ← braucht TASK-J1's Store
```

---

## Was NICHT Jules-Task ist (Operator-Entscheidungen)

| Decision | Status |
|---|---|
| E-SIEM-1..5 | Defaults dokumentiert — Operator lock-in nötig |
| O1–O5 | Sprint-33 requires before WP3 |
| E8 | Positionierung offen |
| SSH-Creds Rotation | Operator-Aktion (CRITISCH) |
| jimesch-public Repo | Operator-Aktion |
