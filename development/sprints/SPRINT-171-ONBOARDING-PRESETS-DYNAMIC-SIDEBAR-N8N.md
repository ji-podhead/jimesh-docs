# SPRINT-171 — POST-ONBOARDING-PROJEKT-WIZARD, PLUGIN-AUSWAHL, PRESETS, KONTEXTUELLE SIDEBAR + n8n

**Status:** 📋 Geplant, NICHT gebaut. Welle 3 — baut auf S163+S165 (Sidebar/Gateway-Freiheit),
S170 (Shared-Workspace/VS-Code/Container-Files) und der WP5-Registry-Entscheidung (Operator
30.9.: node_services auf ALLE Service-Typen erweitern) auf. Empfehlung: WP5-Registry-Bau als
eigenes Welle-3-Paket VOR S171 — sie ist der Daten-Rückgrat für die kontextuelle Sidebar.

**Operator-Order 30.9., verbatim:** "es wäre halt noch nice wenn man nach dem onboarding dann
[ge]fragt wird ob man ein project erstellen will und das kann auch ers[t]mal leer sein und dann
kan man plugins beim onboarding quasi auswählen weil es muss ja keine git repo haben es kann auch
einfach nur ein dash deployment sein, oder ein worker code, oder ein n8n server, können wir
übrigens auch mithinzufügen und eigentlich wäre es dann auch cool wenn das einem gleich die
[sachen] in der sidebar dann nicht anzeigt die man nicht braucht das würde auch irgendwie so ein
wenig zu dem service register passen und das man dann presets auswählen kann wie in jira je
nachdem was man für ein project hat wie design, oder project oder marketing, aber man kann später
alle features intern wieder freischalten"

## Konzept (5 Bausteine)

1. **Post-Onboarding-Project-Wizard**: nach dem Onboarding wird gefragt, ob man ein Projekt
   anlegen will — Projekt DARF leer starten (kein Zwangs-Git, kein Zwangs-Service).
2. **Plugin-/Service-Auswahl im Onboarding**: pro Projekt wählbar: Git-Repo (optional), Dash-
   Deployment, Worker-Code, n8n-Server, (Notes-Deployment via S170). Was gewählt wird, wird
   wirklich deployt/registriert — nichts Gewähltes wird gefaket (Mandat 2).
3. **n8n als neuer Service-Typ**: n8n.io/n8n als Container im gVisor-Workspace-Muster.
   Lizenz-Ehrlichkeit: n8n ist FAIR-CODE ("Sustainable Use License") — NICHT OSI-open-source,
   aber Self-Hosting + interne Nutzung ausdrücklich erlaubt → für JiMesh-internale Deployments
   passend; im UI entsprechend kennzeichnen. Secrets via S167-Muster auto-generiert
   (N8N_ENCRYPTION_KEY u.a.).
4. **Jira-artige Projekt-Presets** (Design / Dev-Project / Marketing / …): Preset = Start-
   Auswahl an Plugins/Services + empfohlene Sidebar-Sektionen; KEIN Lock-in — alles jederzeit
   änderbar.
5. **Kontextuelle Sidebar**: Projekt-abhängig werden nicht benötigte Features ausgeblendet
   (Presets/aktivierte Services steuern die Sichtbarkeit); jedes Feature ist später manuell
   wieder freischaltbar. Datenbasis = erweiterte node_services-Registry (WP5) + plugin_installations.

## Bewertung der Parallel-Session-Research (Operator-Paste 30.9.)

Übernommen als Bewertungsoptionen:
- **n8n self-hosted pro Workspace-Container** — ja, übernimmt das gVisor/Workspace-Deploy-Muster.
- **SilverBullet** (MIT, self-hosted Markdown+Lua) — aufgenommen als zweite Notes-Option neben
  **Logseq** (AGPL) für S170s Shared-Workspace-Notes-Layer.
- **Eclipse Theia / OpenVSCode Server (Gitpod)** — als EVALUATION-Notiz für S170: JiMesh nutzt
  bereits code-server (der OSS VS Code Server von Coder). Theia/OpenVSCode wären nur dann ein
  Thema, wenn wir die IDE selbst anpassen wollen. Für die Dashboard-Sidebar wird KEINE VS Code
  Extension gebraucht — JiMesh ist Dashboard-first; der VS-Code-Reiter (S170) + code-server
  decken den IDE-Pfad.
- **S3-Rename = copy+delete** — korrekte Semantik-Notiz für S170s Dateioperationen (jimesh
  geht über den eigenen Backend-Client, nicht über eine VS Code Extension mit AWS-SDK).
- **VS Code-Extension-/ViewContainer-Ansatz** — bewusst NICHT übernommen: löst ein Problem,
  das JiMesh im Dashboard hat, im falschen Werkzeug (IDE statt Dashboard).

## Bau-Auftrag (Welle 3, nach WP5-Registry-Bau)

- Backend: Projekt-Preset-Feld + Wizard-Routen + n8n-Service-Typ im Deploy-Katalog + Registry-
  Verdrahtung; API_DOCS pflegen.
- Frontend: Onboarding-Wizard-Step („Projekt erstellen?") + Preset-/Plugin-Auswahl + Sidebar-
  Sichtbarkeits-Logik (section-nav-Reiter pro Projekt-Preset, "Alle Features"-Toggle zum
  Freischalten).
- Ehrlichkeit: nie ausgewählte Features als "läuft" darstellen; Registry zeigt nur echten
  Zustand.
