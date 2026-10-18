# STITCH-DESIGN-STATUS + USERFLOWS + SCHEMA-MAPPING

> **Stand:** 19.9.2026, nach erster Stitch-Generierungsrunde
> **Stitch-Projekt:** projects/18208781056688578837
> **Stitch Skills Repo:** https://github.com/google-labs-code/stitch-skills

---

## 1. Was existiert in Stitch (4 Screens)

| Screen | ID | Prompt-Quelle | Status | Was fehlt |
|---|---|---|---|---|
| Dashboard Overview | e9e676a6 | PROMPTS-STITCH-DESIGN.md #2 | ✅ generiert | Breadcrumb-Back-Button, Layout-Toggle, Multi-Select-Chips |
| Infrastructure Sidebar | b279f9f4 | PROMPTS-STITCH-DESIGN.md #1 | ✅ generiert | Integration-Badges auf App-Zeilen, Security-Section, Settings-Gear |
| Integrations and Plugins | 7f0e2322 | PROMPTS-STITCH-DESIGN.md #3 | ✅ generiert | Docker-Hub-Metadaten, Quick-Deploy-Form |
| Cluster Onboarding | afd78a0a | PROMPTS-STITCH-DESIGN.md #4 | ✅ generiert | Browser-Deploy-Step fehlt, Verify-Log-Panel |

### NICHT generiert (noch):
| Screen | Prompt-Quelle | Grund |
|---|---|---|
| Browser Deployment | PROMPTS-STITCH-DESIGN.md #5 | Timeout bei Generierung |
| Scope Selector | PROMPTS-STITCH-DESIGN.md #6 | Timeout bei Generierung |

---

## 2. USERFLOWS (wie der Operator durch JiMesh navigiert)

### Flow 1: Erster Start → Workspace deployed
```
[Login] → Onboarding Step 1 Welcome
  → Step 2: SSH Target registrieren + Verify (SSH-Probe)
  → Step 3: Firewall-Status prüfen (read-only)
  → Step 4: Deploy → /workspaces öffnet
  → Sidebar zeigt: ALL SSH TARGETS
      └── trading (100.64.0.6)
          └── Project: my-first-app
              └── App: dsh-agent [type: agent]
                  ├── Integration: Terminal 📟
                  └── Integration: DSH Session 🤖
```

### Flow 2: App über Sidebar öffnen → Overview → Interface nutzen
```
[Sidebar] Klick auf trading (SSH Target)
  → /workspaces mit Node-Health-Strip (CPU/RAM/Disk/Load)
  → Klick auf Project my-first-app
    → Project-Overview: Cards für Apps, Deployments, IaC, Secrets
    → Klick auf App dsh-agent
      → App-Overview: Tabs [Logs | Audit | Interfaces]
      → Klick auf Integration Terminal 📟
        → Terminal öffnet (iframe oder KasmWeb)
```

### Flow 3: Container discovered → Integration installieren
```
[Dashboard] /overview
  → Grid zeigt: "Running Apps" Card
  → Discovered Container: web-frontend [type: frontend, Port 3000]
  → Badge "Integration verfügbar" erscheint
  → Klick auf Badge → Integration-Popover:
      ├── 📟 Shell (docker exec)
      ├── 🌐 Web Interface (iframe auf :3000)
      └── 🤖 DSH Agent (wenn App-Typ agent)
  → Klick auf 🌐 → Integration installiert
  → Badge wird zu aktivem Link → Klick öffnet iframe
```

### Flow 4: Team → Server Zugriff konfigurieren
```
[Sidebar] Security → oder [Settings] Teams
  → Teams-Page → Team "developers"
  → Tab "Resource Bindings"
  → Add Binding: Team developers → SSH Target trading
  → Vererbung: Workspace prod → Project my-app → alle Apps darunter
  → OPA prüft bei jedem Request: hat der User über sein Team Zugriff auf diese Resource?
```

### Flow 5: Manuelle Shell deployen (ohne Project → Auto-Project)
```
[Integrations-Tab] Quick Deploy
  → Framework: Shell (gotty)
  → SSH Target: trading (aus Sidebar-Scope preselected)
  → Kein Project ausgewählt
  → Deploy → Backend erstellt auto-project "shell-trading-20260919"
  → Container läuft → Auto-Project erscheint in Sidebar
  → Später: Drag & Drop in anderes Project
```

---

## 3. COMPONENT-SCHEMA → STITCH-SCREEN MAPPING

Jeder Stitch-Screen rendert OverviewComponent[] des folgenden Typs:

| Screen | Component-Typen die gerendert werden | Schema-Typ |
|---|---|---|
| Sidebar | ssh-target, workspace, project, app, firewall-rule, siem-event | Hierarchy-Baum |
| Overview Grid | ALLE 23 Typen als Cards | overviewWidgets (§3.1 COMPONENT-SCHEMA.md) |
| Integrations Tab | app, deployment, integration, integration-installation, container | DeploymentSpec + IntegrationSpec |
| Onboarding | ssh-target, firewall-rule (Nftables) | OnboardingFlow (speziell) |
| Browser Deploy | app (type: browser), integration (kind: shell/vnc) | AppType + IntegrationKind |
| Scope Selector | scope-referenz (all/target/workspace/project) | ScopeRef + SelectionSet |

---

## 4. WAS WIR NACHPROMPTEN MÜSSEN (Iterieren)

### 4.1 Sidebar (b279f9f4) — Refinements:
- [ ] Integration-Badges JEDE App-Zeile (Icons: Terminal, Code, VNC, Web)
- [ ] Settings-Gear auf Hover (rechts in der SSH-Target-Zeile)
- [ ] Security-Section unten (collapsible: Firewall Rules + SIEM Events)
- [ ] „Alle SSH Targets" als Parent mit violettem Highlight wenn aktiv
- [ ] App-Type-Icons korrekt: 🤖 agent, 🔧 ide, 📟 shell, 🌐 frontend, ⚙️ backend, 🗄️ database

### 4.2 Overview Grid (e9e676a6) — Refinements:
- [ ] Breadcrumb oben links: All > trading > my-project (klickbar)
- [ ] Layout-Toggle oben rechts: grouped (nach Target gruppiert) / flat
- [ ] Multi-Select Chips: [trading] [workspace-prod] mit X-Button
- [ ] Node-Health-Strip als erste Card-Row (CPU%, RAM bar, Disk bar)
- [ ] Card "IaC Files" mit Datei-Icons und git-tracked Badges

### 4.3 Integrations Tab (7f0e2322) — Refinements:
- [ ] Docker Hub Metadaten: Image, Author, Pulls, Version als Sub-Zeile
- [ ] Quick Deploy: SSH-Target preselectet aus Scope
- [ ] App-Type-Badge auf jedem Deployment

### 4.4 Onboarding (afd78a0a) — Refinements:
- [ ] Step 2 Verify: dunkles Terminal-Panel mit grünem SSH-Log
- [ ] Step 3: nur Status-Infos, keine interaktiven Options
- [ ] Step 4: braucht "Open Workspaces" + "Finish" zwei Buttons

### 4.5 NOCH ZU GENERIEREN:
- [ ] Browser Deployment (KasmWeb Chrome vs VNC Desktop)
- [ ] Scope Selector (Navbar-Komponente mit Multiauswahl)
- [ ] Container Logs Tab (dunkles Terminal mit Time-Range-Filter)
- [ ] Project Overview (IaC-Files + Deployment-Code Tab)
- [ ] Design Folder (Stitch-Session-Import)

---

## 5. STITCH-SKILLS (https://github.com/google-labs-code/stitch-skills)

Das offizielle Google-Stitch-Skills-Repo enthält:
- Skill-Definitionen für Stitch-MCP-Integrationen
- Code-Generation aus Designs
- Export-Formate (HTML, React, Vue)

Für JiMesh: Nutze Stitch-Skills um die generierten HTML-Screens
direkt in React-Komponenten zu konvertieren die mit unserem
shadcn/ui + Tailwind-Setup funktionieren.

---

## 6. ITERATIONS-PROZESS (JiMesh baut JiMesh)

```
Schleife:
  1. Prompt in Stitch eingeben (oder via MCP generieren)
  2. Screenshot reviewen
  3. Wenn gut: edit_screens für Refinements nutzen
  4. Wenn ok: HTML exportieren
  5. HTML → React-Komponente (via Stitch-Skills oder manuell)
  6. React-Komponente in JiMesh-Frontend integrieren
  7. Backend-API anbinden (Component-Adapter)
  8. Auf Trading deployen (Hot-Reload)
  9. Feedback → zurück zu 1.
```

## 7. WICHTIGE STITCH MCP TOOLS FÜR ITERATION

| Tool | Was |
|---|---|
| generate_screen_from_text | Neuen Screen generieren |
| edit_screens | Bestehenden Screen mit Text-Prompt verändern |
| generate_variants | Varianten eines Screens generieren |
| get_screen | Screen-Details + Screenshot-URL + HTML-Code abrufen |
| upload_design_md | DESIGN.md hochladen (Design-System-Regeln) |
| create_design_system | Design-System für konsistente Generierung |
| apply_design_system | Design-System auf Screens anwenden |