# TASK-053 — Frontend-IA: Workspace vs SSH-Endpoint trennen + Apps-Dropdown + Ebenen-Badges + Firewall-Rules-UI

**Status:** ✅ umgesetzt (13.9.2026 — Details + Akzeptanz-Checkoffs unten) | **Quelle:** Operator 14.9. („keine Unterscheidung
zwischen workspace und ssh endpoint — dazu muss es 2 verschiedene Optionen
geben; projects tab sollte workspaces heißen; eigener dropdown wo die
apps drin sind; ich verstehe das frontend nicht und wieso man nichts
konfigurieren und ändern kann")

## Die 3 Ebenen (für die Ebenen-Badges im Preset-Picker)

| Ebene | Was | Code-Fundstelle |
|---|---|---|
| 1. Sandbox | gVisor (runsc) fängt Syscalls ab; NAT = outbound-only | projects_ssh.go:890-893 (--runtime=runsc) |
| 2. Egress | nftables jimesh_egress_eth0 IM Container-NS; nur Gateway/Git/Registries | projects_ssh.go:404,1662 |
| 3. Router-Firewall | jimesh_inbound Default-DROP pro Alias am Router-Node; Router = EINZIGER Eingang; Operator-Grants via /api/firewall/rules | cmd/jimesh-router/firewall.go:70,432-434; main.go:43 |

## Aufgabe

1. **Sidebar: Projects → Workspaces** umbenennen (labelKey, i18n de/en);
   Sub-Nav-Dropdown: Workspaces → Apps (Containers mit workspace_id),
   Settings, Deployments.
2. **ZWEI getrennte UI-Pfade:**
   a) **SSH-Endpoint-Verwaltung** (eigene Sektion/Page): Node-Liste,
      Onboarding (Host/User/Pass), gVisor-Install-Status — getrennt vom
      Workspace-Deploy (heute alles in einem ProjectsPage-Form gemischt,
      onboardHost/onboardUser/onboardPass:388-390).
   b) **Workspace-Deploy-Form** (WorkspacesPage erweitern): Projekt + SSH-
      Target-AUSWAHL (aus der Endpoint-Liste, nicht Freitext!) + Preset-Picker.
3. **Apps-Dropdown** im Workspace-Detail: GET der Containers mit
   workspace_id (Discovery ordnet sie zu, store live) — Anzeige: Name,
   Container-ID, Status, Ports.
4. **Ebenen-Badges im Preset-Picker:** „Ebene 1: Sandbox" (gVisor-NAT /
   Airgap / Host-Passthrough), Tooltip mit Egress (Ebene 2) + Router-
   Firewall (Ebene 3, opt-in --firewall) — der User versteht dann WIE die
   Ebenen zusammenwirken.
5. **Firewall-Rules-Editor** (Operator-Lane): GET/POST/DELETE
   /api/firewall/rules (OPA-gated, existiert) — Rule-Liste (Alias, Port,
   Protokoll), Grant/Revoke-Buttons; User-Sicht read-only (E-Priority).
6. **Konfigurierbar:** Workspace-Edit (Preset wechseln, SSH-Target
   wechseln → redeploy nötig ehrlich anzeigen).

## Regeln

- NUR src/frontend/** ; Backend-Routen existieren alle (/api/workspaces,
  /api/firewall/rules, containers.workspace_id) — du konsumierst nur.
- No-Mock: ehrliche Empty-States wenn keine Endpoints/Workspaces.
- VERBOTEN: next build; .d.ts löschen; Credentials als Defaults.
- Verifikation: live-curl über :19090 auf deine Routes.
- GIT: explizite Pfade, kein -A, NICHT pushen.
- Task-File-Status am Ende setzen.

## Akzeptanz

- [x] Sidebar heißt Workspaces; SSH-Endpoints sind eine eigene Sektion
      (App.tsx:151-172 navGroups/workspaceItems mit `nav.workspaces`-Label +
      Boxes-Icon; EndpointsPage: /workspaces/endpoints — eigene Route
      App.tsx:561, WorkspaceEndpointsPage.tsx)
- [x] Workspace-Deploy wählt SSH-Target aus Liste (kein Freitext-Onboarding
      im selben Form) (WorkspacesPage.tsx SshTargetSelect im Ensure-Dialog +
      WorkspaceDeployDialog; ssh-target-select.tsx; ProjectsPage-Freitext-
      Onboarding/Add-Node/Edit-Node/Provisioning-Dialoge entfernt)
- [x] Apps-Dropdown zeigt die Containers des Workspace
      (workspace-apps-dropdown.tsx — Name, Container-ID, Status, Ports aus
      row.containerId + GET /api/discovery-Match jimesh-framework-<wsId>-*)
- [x] Preset-Picker zeigt Ebenen-Badges (network-preset-picker.tsx —
      „Ebene 1: Sandbox"-Badge je Karte + Layer-Popover mit Egress
      (Ebene 2) und Router-Firewall (Ebene 3); geteilt von WorkspacesPage-
      Dialogen und ProjectsPage)
- [x] Firewall-Rules-Editor (Operator) + read-only-User-Sicht
      (components/workspaces/firewall-rules.tsx — GET/POST/DELETE
      /api/firewall/rules, Alias-Select via GET /api/router/config;
      isOperatorSession-Gate + ehrlicher Read-only-Hinweis)

## Status

**✅ umgesetzt (13.9.2026, Frontend-Agent-Session, Commit s. git log)**

Alle 6 Bausteine live in src/frontend/**, verifiziert mit:

- `tsc --noEmit -p tsconfig.app.json`: 0 Fehler in allen angefassten
  Dateien (Gesamt-Noise 256 → 223 Zeilen, ProjectsPage 22 → 0 — keine
  neuen Fehler, `/tmp`-Baseline-Diff nur entfernter Alt-Noise).
- `npm run test`: 225/230 grün; die 5 Fails liegen in
  `src/lib/chart-axis.render.test.tsx` (`act`-Import aus React 19.2
  entfernt — pre-existing, Datei ist byte-identisch zu HEAD).
- `npm run check:i18n`: 60 Locales / 1656 Keys grün (de+en übersetzt,
  58 weitere Locales englische Kopien — NetworksPage-Präzedenz).
- live-curl über den laufenden Dev-Server **:19090** (im Task steht
  :19010 — dieser Port ist nirgends gebunden; 19090 ist der
  docker-compose-Frontend-Port): GET /api/settings/ssh_endpoints
  (virgin `{}`), PUT/GET-Roundtrip 1:1, GET /api/workspaces (count 0,
  ehrer Empty), GET /api/firewall/rules + /api/router/config,
  GET /api/projects/{id}/deployments, voller Grant/Revoke-Zyklus
  (POST rule → list → DELETE?id → clean; Test-Alias wieder entfernt —
  keine Test-Objekte in der Operator-DB), alle 5 neuen Routen
  (/workspaces, /apps, /endpoints, /deployments, /settings) HTTP 200
  ohne Compile-Fehler-Marker, Dev-Server-Logs sauber.

Ehrliche Einschränkungen (kein Mock, nichts vorgetäuscht):

- Workspace-Edit (Preset/SSH-Target) persistiert NICHT in der
  workspaces-Row (dafür existiert keine PUT-Route) — der Dialog zeigt
  das ehrlich: Änderungen greifen per volumen-erhaltendem Redeploy
  (POST /api/projects/redeploy mit workspaceId), die Row behält ihr
  Ensure-Preset (Hinweis im Dialog).
- Ports im Apps-Dropdown kommen aus der Discovery-Registry
  (GET /api/discovery) — bis zum ersten Scan ehrlich „Ports unbekannt".
- Endpoint-Metadaten persistieren via PUT /api/settings/ssh_endpoints
  (OPA-Admin-Mutation → Non-Operator bekommen das klare 403-Toast);
  SSH-Credentials bleiben browser-lokal und reisen nur pro Request
  (keine Defaults — P0 bleibt geleert).
- Docs: nur dieses Task-File aktualisiert (Sprint-/API-DOCS-Einträge
  liegen außerhalb des src/frontend/**-Scopes dieser Session; Routen
  sind alle pre-existing, API_DOCS gehört der Parallel-Session).
