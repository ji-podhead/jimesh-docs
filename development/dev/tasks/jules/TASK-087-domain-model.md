# TASK-087 — Domain-Model Definition + Schema-Design + Code-Audit

**Quelle:** Operator 15.9. — Domain-Modell definiert + Jules soll planen + Code auditieren
**Ziel:** Das 4-Ebenen-Modell (SSH Target → Workspace → Project → App) definieren, Schema-Design, Code-Audit gegen das Modell, Frontend-Hierarchie-Plan
**Format:** Plan + Schemas + Code-Audit (kein Code-Change in diesem Task — Planung + Audit)

---

## 1. DAS 4-EBENEN-MODELL (Operator-Definition, 15.9.)

```
SSH TARGET (Node/Server)
  └─ WORKSPACE (auf dem Server — gruppiert Projects)
       └─ PROJECT (gruppiert Apps)
            └─ APP (hat port + path + type)
```

### App
| Feld | Pflicht | Notes |
|---|---|---|
| port | ✅ IMMER | Der Port ist App-eigen, NICHT Project-eigen |
| path | ✅ IMMER (aber evtl. nicht relevant) | e.g. `/app` oder `/` |
| type | ✅ IMMER | website (e.g. Figma-Embed), service, database, etc. |
| connector/MCP | optional (future) | Direkter Connector oder MCP-Server pro App |
| parent | ✅ Project-Referenz | kein parent → `no_parent` |
| name | ✅ | Der echte Name aus dem Deploy-Parameter |

### Project
| Feld | Pflicht | Notes |
|---|---|---|
| port | ❌ NIEMALS | "ein project sollte selber keinen port haben sondern nur apps" |
| path | optional | "im gegensatz zu app muss der nicht relevant sein" |
| parent | ✅ Workspace-Referenz | kein Workspace → `no_parent` |
| name | ✅ | Der echte Name |
| apps | aggregiert | Ports werden von den child Apps aggregiert (Hash-Lookup) |

### Workspace
| Feld | Pflicht | Notes |
|---|---|---|
| ports | aggregiert | Ports kommen von den child Projects → child Apps (kein eigener Port) |
| parent | ✅ SSH-Target-Referenz | kein SSH Target → `no_parent` |
| name | ✅ | Der echte Name |
| projects | aggregiert | Die child Projects |

### SSH Target (Node)
| Feld | Pflicht | Notes |
|---|---|---|
| host | ✅ | user@host (bereits implementiert: ssh_endpoints) |
| gVisor/runsc | optional | Install-Status (Node-Eigenschaft, NICHT Workspace — R40-M1) |
| workspaces | aggregiert | Die child Workspaces |

### no_parent (Fallback)
Wenn ein App/Project/Workspace keinen Parent hat → landet unter `no_parent`.
`no_parent` ist IMMER deployed (als Default-Container) und sichtbar NUR wenn
Apps/Ports discovered wurden die noch keinem Project zugeordnet wurden.
Drag-and-Drop: Apps/Projects können aus ihrem Parent herausgezogen werden → `no_parent`.

### Ports & Hash-Lookup
- Ports werden von Apps nach oben aggregiert (App → Project → Workspace)
- Hash-Lookup-Table: einmal initialisiert (Variablen), in allen Hierarchie-Komponenten verfügbar
- Lookup-Tools + Search-Filter für die Hierarchie (Port → App finden, Name → Project finden, etc.)

---

## 2. OFFENE FRAGEN (vom Operator, alle zu beantworten)

### 2a. Networking + Scanopy
- Was ist aus TASK-080 (VLAN-Isolation) geworden? → implementiert (macvlan/ipvlan + gVisor, f5b0609)
- Scanopy-Salvage: AGPL-3 → reference-only (R35-Regel). Kein Code übernommen. Die Go-Portierung der OVS/VLAN-Logik ist in TASK-080 als macvlan/ipvlan implementiert (ohne Scanopy-Code).
- Wer kriegt die Network-Settings? → Operator-Frage: Projects, Apps oder beide? (Antwort nötig — beeinflusst das Schema)

### 2b. App-Discovery Integration
- Wie kombiniert man App-Discovery mit der 4-Ebenen-Hierarchie?
  - Discovery findet Container/Ports → automatisch unter `no_parent` einsortieren
  - Der User ordnet sie per Drag-and-Drop einem Project zu
- Welche API für Discovery? → Docker Hub API? Compose-File-Parsing? Beides?
- Scannen wir den Code nach Apps? → "das wäre nice auch welches compose/docker file"
- Wie verwenden wir ordentliche Icons für die Discovery? → devicons/react-icons (aus dem app-type abgeleitet)

### 2c. Schema-Design
- Postgres-Schema: 3 neue Tabellen? (ssh_targets existiert als ssh_endpoints, workspaces existiert, projects ist NEU, apps ist NEU — die alte workspaces-Tabelle wird zu projects?)
- Migration: die bestehende workspaces-Tabelle → projects umbenennen + eine neue workspaces-Tabelle dazwischen? Oder neue Tabellen anlegen?
- FK-Kette: ssh_targets → workspaces → projects → apps (mit FK-CASCADE)
- no_parent: echte Row (eine pro SSH-Target) oder virtueller Fallback?

### 2d. Frontend-Hierarchie
- Die Sidebar: 4 Ebenen (SSH → Workspace → Project → App) — nicht 3
- Die Scope-Selector: 4-Ebenen-Hierarchie (Target → Workspace → Project → App)
- Die Drag-and-Drop-UI: Apps zwischen Projects verschieben
- Der Graph-View: die hierarchische Darstellung als Graph (React-Flow)

### 2e. Frontend-Icons
- devicons/react-icons für Apps (aus dem app-type: website → 🌐, database → 🗄, service → ⚙, etc.)
- Discovery-Icons: wie werden discovered Apps/Ports dargestellt?

### 2f. Error-Handling + User-Creation
- User-Creation: was passiert beim Erstellen eines Users (Keycloak-First-Login → keine User-Create-API)?
- Error-Handling: was passiert wenn eine App kein gültiges Project hat? (→ no_parent, ehrlich dokumentiert)

---

## 3. CODE-AUDIT (Jules: alle Dateien gegen das 4-Ebenen-Modell prüfen)

Jules soll ALLE Dateien prüfen und dokumentieren:
1. **Welche Dateien betreffen die 4 Ebenen?**
   - SSH Target: `internal/deploy/ssh_provider.go`, `ssh_endpoints`-Tabelle, `SSHEndpointsPage.tsx`
   - Workspace: `workspaces`-Tabelle, `WorkspacesPage.tsx`
   - Project: **NEU** (existiert noch nicht als eigenes Level!)
   - App: **NEU** (existiert noch nicht als eigenes Level — Deployments sind die nächste Nähe)
2. **Welche Dateien verletzen das Modell?**
   - Die workspaces-Tabelle hat die Projekt-Funktionen (Name, SSH-Target, Preset) — nach dem 4-Ebenen-Modell müsste das Project die Project-Funktionen haben und Workspace die Workspace-Funktionen
   - Keine apps-Tabelle (Deployments sind in der deployments-Tabelle, aber ohne Project-Referenz)
   - Keine project_vlans als Project-Level (existiert, aber als Project → VLAN — korrekt?)
3. **Migration-Pfad:**
   - Was muss in welcher Reihenfolge geändert werden?
   - Welche Tabellen werden neu angelegt, welche umbenannt, welche erweitert?
   - Welche API-Routen ändern sich?
   - Welche Frontend-Views ändern sich?

---

## 4. DELIVERABLES (Jules liefert)

1. **Domain-Model-Definition** (das 4-Ebenen-Modell als Markdown-Doc, im MANDATES.md-Format)
2. **Schema-Design** (Postgres-DDL für die 4 Ebenen + FK-Kette + no_parent)
3. **Code-Audit-Report** (Datei für Datei: was verletzt das Modell, was fehlt, was muss geändert werden)
4. **Migration-Pfad** (Reihenfolge der Code-Changes)
5. **Frontend-Hierarchie-Plan** (die 4-Ebenen-Sidebar als Wireframe)
6. **Discovery-Integration-Plan** (wie App-Discovery in die Hierarchie einbindet)
7. **Icons-Plan** (devicons/react-icons pro App-Type)
8. **Alle offenen Fragen** dokumentiert + Antworten wo Jules sie aus dem Code ableiten kann

---

## 5. MANDATES-EINTRAG (nach dem Operator-OK)

Das 4-Ebenen-Modell in MANDATES.md als **Mandat 14** eintragen:
- SSH Target → Workspace → Project → App
- Ports nur an Apps (niemals an Project/Workspace direkt)
- no_parent als Default-Fallback (auto-deployed, sichtbar nur bei discovered orphans)
- Hash-Lookup-Table für Ports (einmal init, überall verfügbar)
- Drag-and-Drop zwischen Parents erlaubt (→ no_parent)
- "Projects" und "Workspaces" sind SEPARATE Ebenen (nicht identisch!)
