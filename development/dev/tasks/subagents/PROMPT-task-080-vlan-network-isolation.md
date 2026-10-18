# TASK-080 — Per-Project VLAN-Isolation (macvlan/ipvlan) + gVisor = Network-Editing-Tab

**Status:** ✅ umgesetzt 15.9.2026 (Branch `task/080-vlan-network-isolation`, Worktree
`jimesh-worktrees/task-080-vlan-network-isolation`, SPRINT-41-VLAN-NETWORK-ISOLATION.md,
Bericht unten) | **QUELLE:** networks_gvisor.md (verifizierte Research — NICHT
neu ableiten, darauf bauen) + TASK-049 Network-Editing-Tab (bestehender Plan im
BACKLOG: Operator konfiguriert Networking pro Project, deployt Bridges, kann Container
neu starten — BEIDE Pfade: compose-File-Editing UND UI-driven editing)

## Koordinations-Log (für Parallel-Agenten)

- **TASK-078** (`internal/network`): meine Dateien heißen `vlan.go`/`vlan_test.go` und
  berühren `headscale.go`/`egress.go` NICHT (headscale.go trägt selbst einen
  Separation-Note auf vlan.go). Frontend: `NetworkEditingPage.tsx` (Route
  `/workspaces/networks`) ≠ deine `NetworksPage.tsx` (`/networks`, Platform-Tab).
- **TASK-072** (Create-Dialog-RBAC, gelandet via 51bdb68): mein VLAN-Opt-in sitzt als
  eigene Sektion im selben Create-Dialog (ProjectsPage) + WorkspaceDeployDialog —
  getrennte State-Blöcke, Merge-freundlich.
- **TASK-082** (R42-Plan, Ports-View): meine Fläche ist VLAN/Netz-Zuordnung ONLY —
  KEINE Host-Port-Sicht, kein WAF-Status, kein Grant-Status (dein WP2).
- **⚠ Nummerierung:** der R42-Plan-Kontext nannte parallel „Tailscale-Serve (080)" —
  dieser Task hier folgt exakt der Batch-Def (080 = VLAN-Isolation). Operator bitte
  eine der beiden Nummern umbenennen, falls die Tunnel-Arbeit ebenfalls als 080 läuft.

## Bestätigte Architektur (aus der Research, nicht abweichen ohne starken Grund)
- macvlan ODER ipvlan Docker-Network-Driver — NICHT der Default-Bridge-Driver (nicht
  VLAN-aware)
- Pro Project: dynamisch VLAN-Sub-Interface auf der Single-NIC des Hosts erstellen
  (ip link add link eth0 name eth0.<vlanID> type vlan id <vlanID> + ip link set dev
  eth0.<vlanID> up) — Zero-Downtime, touchiert eth0 nicht, kein Reboot, keine
  laufenden Container neu starten
- Neues Docker-Netz an das VLAN-Sub-Interface als Parent hängen (docker network create
  -d macvlan -o parent=eth0.<vlanID> --subnet=... project-<id>-net)
- **ipvlan (L2) über macvlan bevorzugen** wenn der Switch des Ziel-Hosts Port-Security/
  MAC-Table-Limits hat (macvlan = eine unique MAC pro Container → Enterprise-Switch-
  Security oder MAC-Table-Exhaustion bei Scale; ipvlan teilt die Host-NIC-MAC und
  filtert rein per VLAN-Tag). Konfigurierbar machen, nicht hart-coden.
- Host-Schutz ist automatisch und WICHTIG zu erhalten: macvlan/ipvlan-Sub-Interfaces
  können mit ihrem eigenen Parent-Interface per Kernel-Design NICHT kommunizieren —
  verifiziere dass deine Implementation das nicht kaputt macht (z.B. Host-Management-
  Traffic NICHT durch ein Project-VLAN laufen lassen)
- Mit gVisor kombinieren (bereits verdrahtet) als Container-Runtime für diese Project-
  Container — die beiden Layer sind komplementär: VLAN stoppt Project-A-Container
  Project-B-Container zu erreichen (Network-Level), gVisor stoppt einen kompromittierten
  Container in den Host-Kernel zu entkommen (Syscall-Level). VERIFIZIERE dass BEIDE
  aktiv sind, nicht nur einer.
- VLAN-ID-Space ist bei 4094 gedeckelt — wenn das bei erwarteter Scale eine echte
  Einschränkung ist, explizit dokumentieren statt still ignorieren

## Aufgabe
1. Backend: Go-Funktion (netlink — check welche Network-Manipulation-Library im Repo
   schon benutzt wird, CGO-frei bleiben) die ein neues Project-VLAN-Sub-Interface +
   macvlan/ipvlan-Docker-Netz on-demand provisioniert und beim Project-Delete sauber
   abbaut
2. Frontend: der Network-Editing-Tab aus TASK-049 — Operator sieht aktuelle VLAN/
   Network-Zuordnung pro Project, kann neue triggern, Container neu starten (beide
   Pfade: compose-Editing UND UI-Editing funktionieren)
3. In Project/Workspace-Creation als Option einbinden (bekommt ein neues Project
   automatisch ein eigenes VLAN oder opt-in — check TASK-072 RBAC-at-create falls
   gelandet, gehört evtl. in denselben Create-Flow-Bereich)

- VERIFY: 2 Projects auf dem selben Test-Host, jedes mit eigenem VLAN, Container in
  A können B's Container-NICHT erreichen (direkt testen — Verbindungsversuch aus A's
  Container zu B's interner IP, muss fehlschlagen), Host-Management-Interface von
  beiden unberührt
- CGO_ENABLED=0; GIT: explizite Pfade, kein -A, NICHT pushen

## Abschlussbericht (15.9.2026, gegen den Code verifiziert)

**Umsetzung:** WP1 `src/backend/internal/network/vlan.go:1` (Command-Emission, CGO-frei,
keine neue Dependency — `iproute2` ist das netlink-Frontend, läuft über die bestehende
SSH/local-exec-Pipeline; CommandRunner-Seam aus firewall_provider.go lokal gespiegelt) +
`vlan_test.go` (10 Tests: Subnet-Mapping-Grenzfälle 255/256/4094 + 4095-Verweigerung,
Injection-Guards, Idempotenz-Guards, Parent-Niever-Anfassen, Compose-Snippet).
WP2 `src/backend/internal/store/project_vlans.go:1` (UNIQUE vlan_id, FK-CASCADE,
transaktionale Auto-Allokation mit Range-Settings `vlan_id_min/max`, Driver
macvlan/ipvlan konfigurierbar) + 4 DB-Tests gegen jimesh_test (grün).
WP3 `src/backend/internal/deploy/projects_ssh.go` chirurgisch: DeployRequest-Opt-in
`vlanEnabled/vlanId/vlanDriver` (nur networkMode=isoliert + Workspace-Container, sonst
400; persistierte Zuordnung gewinnt bei Redeploy, Konflikt=409), Provision-Commands,
Live-Attach, `JIMESH_RUNTIME`-Echo (gVisor+VLAN = gemessen), Undeploy `purgeVlan`
(workspace-scoped → 400), Delete-`vlanLeftover`-Report.
WP4 `src/backend/internal/deploy/projects_vlan.go:1` (GET/POST/DELETE
`/api/projects/{id}/vlan`, local-oder-SSH-Split wie stopProjectContainers).
WP5 `src/frontend/src/views/NetworkEditingPage.tsx:1` (`/workspaces/networks`) +
Deploy-Dialog-Sektion + ProjectsPage-Create-Sektion + App.tsx/Sub-Nav/Palette +
i18n 60 Locales (en/de hand-, Rest EN-Fallback, check:i18n grün).

**Isolationstest (Test-Umgebung, Docker 29.6.1):** 2 Projekte auf getrennten
macvlan-Netzen am selben Parent — A→B **Network unreachable**, B→A **Network
unreachable**; Host→Container-IP **100 % packet loss** (Kernel-Design: Parent↔Child
getrennt — Host-Schutz erhalten); Live-Attach laufender Container **ok** (dual-homed
bridge=172.17.0.2 + macvlan=172.31.95.1, ohne Neustart); Teardown **restfrei**
(docker network ls + ip link leer). **Ehrliche Grenzen:** der 802.1q-Sub-Interface-Layer
war hier nicht testbar (`ip link add … type vlan` → *Operation not permitted* im
Container-Netns, kein CAP_NET_ADMIN), ipvlan-Container-Ports scheitern an EBUSY,
runsc ist nicht installiert (nur runc) → Command-Emission per Unit-Tests verriegelt;
Operator-Verifikation auf einem VLAN-fähigen Host steht im Sprint-File (2 Projekte,
ping aus A nach B muss fehlschlagen, `ip -br link show eth0.<id>`, Reste-Check).

**Checks:** make go-build ✓, make go-vet ✓, gofmt (meine 4 Dateien) ✓, go test
network/store/deploy ✓ (einzigster Fail: pre-existing
`TestResolveRegistries_EmptyResultIsAnError` — auf main HEAD identisch reproduziert,
DNS-Abhängigkeit der Test-Netns, nicht meine Fläche), tsc: 0 neue Fehler in meinen
Dateien (Basis-Delta 4× DiscoveryStatus.tsx = zwischenzeitlich auf main gefixt,
nie von mir angefasst), check:i18n ✓ (60 Locales/2135 Keys).
