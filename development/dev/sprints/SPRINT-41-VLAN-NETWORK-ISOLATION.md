# SPRINT 41 — Per-Project VLAN-Isolation (macvlan/ipvlan) + gVisor + Network-Editing-Tab

> **TASK-080** · Quelle: `docs/research/networks_gvisor.md` (verifizierte Gemini-Research —
> OVS verworfen, macvlan/ipvlan bestätigt) + TASK-049 Network-Editing-Tab-Plan
> (`docs/backlog/BACKLOG.md` Zeile 49: Operator will Networking pro Project einstellen,
> Container neu starten — **beide Pfade: Compose-Editing UND UI-Editing**).
> Schwester-Sprints: `SPRINT-40-HEADSCALE-NETWORKS.md` (TASK-078, Headscale-Mesh =
> Platform-Tab — berührt diese Fläche NICHT; headscale.go trägt selbst einen
> Separation-Note auf vlan.go) und die RBAC-Lane (TASK-070, `internal/policy` — disjunkt).

## Plan (vor Code, Mandat 1.4)

**Ziel:** Opt-in pro Project: dynamisches 802.1q VLAN-Sub-Interface auf der Single-NIC
des Ziel-Hosts (`ip link add link <parent> name <parent>.<id> type vlan id <id>`) +
macvlan/ipvlan-Docker-Netz am Sub-Interface als Parent (`docker network create -d
macvlan|ipvlan -o parent=<parent>.<id>`). Container des Projects werden dual-homed:
Management-Interface (bestehende Egress-Bridge, SSH-Tunnel, WAF) bleibt unberührt,
das VLAN trägt das isolierte Projekt-Segment. Kombiniert mit gVisor (runsc) sind
BEIDE Layer aktiv: VLAN = L2-Isolation zwischen Projects, gVisor = Syscall-Isolation
gegen den Host-Kernel.

**Architektur-Entscheidungen (aus der Research, nicht abweichen):**
1. **macvlan ODER ipvlan (L2), konfigurierbar, nicht hart-codiert.** Default `macvlan`
   (unique MAC pro Container, beste Intra-VLAN-Isolation); `ipvlan` L2 wenn der Switch
   Port-Security/MAC-Table-Limits hat (alle Container teilen die Host-MAC, Isolation
   rein per VLAN-Tag). Per-Request wählbar, Default via Setting `vlan_driver`.
2. **VLAN-ID-Allokation:** Auto-Next-Free aus DB (UNIQUE vlan_id, Transaktion + Retry)
   im Range `vlan_id_min`..`vlan_id_max` (Settings, Defaults 2/4094), ODER explizite
   ID im Request (validiert gegen 1..4094, 409 bei Fremdvergabe). **Cap 4094 ist eine
   harte Kernel-Grenze des 802.1q-Tag-Felds (12 Bit)** — bei erwarteter Scale > ~4000
   isolierter Projects pro Host ist VLAN nicht das richtige Werkzeug; ehrlich
   dokumentiert statt still ignoriert.
3. **Subnet deterministisch aus der VLAN-ID:** `172.16.0.0/12`-Deckungsraum —
   `172.(16 + id>>8).(id&255).0/24` (4096 /24s, kollisionsfrei über den gesamten
   ID-Raum; 10.<id>.x.y würde ab id 256 brechen — als Unit-Test verriegelt).
4. **Host-Schutz bleibt Kernel-Design:** macvlan/ipvlan-Sub-Interfaces können per
   Kernel-Design NICHT mit ihrem Parent kommunizieren — die Implementation provoziert
   das nicht: `ip link set <parent> down` kommt NIEMALS vor, das Management-Interface
   (untagged Parent) wird nie durch ein Project-VLAN geführt, der Parent bekommt nie
   eine IP im VLAN-Subnet. Live verifiziert: Host → macvlan-Container-IP = 100 % loss.
5. **CGO-frei, keine neue Dependency:** das Repo hat KEIN netlink-Binding (go.mod
   geprüft) und braucht keins — Host-Manipulation läuft im etablierten Idiom als
   `ip`/`docker`-Command-Emission über die Deploy-Pipeline (lokal exec oder SSH,
   wie gVisor-Install, Egress, Socket-Guard). Ein netlink-Socket im Backend-Prozess
   könnte ohnehin nur das eigene Netns erreichen, nie den Remote-Node. `iproute2`
   IST das netlink-Frontend. CommandRunner-Seam-Muster aus
   `internal/security/firewall_provider.go` lokal gespiegelt für Unit-Tests mit
   Fixture-Commands (kein internal/network → internal/security Import-Edge).
6. **Dual-Homing statt VLAN-only:** ein VLAN-only-Container wäre vom Host unerreichbar
   (Kernel-Design) — SSH-Tunnel, Egress-Allowlist, WAF und Tunnel-Route brächen. Der
   Workspace-Container behält die Egress-Bridge (Management) und bekommt das VLAN
   als zweite NIC (isoliertes Projekt-Segment). Isolation zwischen Projects bleibt
   hart: getrennte VLANs haben kein gemeinsames L2, der Host besitzt keine IP in
   den VLAN-Subnetzen (macvlan-Parent trägt keine IP) → keine Route. Live verifiziert:
   A→B und B→A = Network unreachable.
7. **Beide Pfade (TASK-049):** das VLAN-Netz ist ein ECHTES Docker-Netz mit
   deterministischem Namen `jimesh-vlan-<projId>` — UI-Editing (API-Routes) und
   Compose-Editing (externe Netzwerk-Referenz `external: true`, Snippet wird in der
   UI angezeigt) führen zum SELBEN Zustand. Kein zweites Schema.

## Work Packages

- **WP1 Backend-Provisioning** `internal/network/vlan.go` (NEU, klar getrennt von
  TASK-078s `headscale.go`/`egress.go` im selben Package): Spec-Typen, Validierung
  (inkl. Shell-Injection-Guard — alle interpolierten Werte), deterministische
  Subnet-Ableitung, Command-Emission (Provision/Attach/Disconnect/Teardown/
  Live-Probe), Compose-Snippet.
- **WP2 Persistenz** `internal/store/project_vlans.go` (NEU): `project_vlans`-Tabelle
  (PK project_id, UNIQUE vlan_id, FK→projects ON DELETE CASCADE), transaktionale
  Auto-Allokation (Next-Free + Range), CRUD.
- **WP3 Deploy-Wiring** `internal/deploy/projects_ssh.go` (chirurgisch): DeployRequest
  `vlanEnabled`/`vlanId`/`vlanDriver` (Opt-in, default OFF), Validierung (nur
  networkMode=isoliert + Workspace-Container), Provision-Commands vor Container-Start,
  Live-Attach (`docker network connect`, kein Neustart), Runtime-Echo
  (`JIMESH_RUNTIME` — gVisor+VLAN beide aktiv = messbar), UndeployRequest `purgeVlan`,
  Project-Delete berichtet VLAN-Reste ehrlich.
- **WP4 VLAN-Routes** `internal/deploy/projects_vlan.go` (NEU) + Route-Registrierung
  in `deploy.go`: GET/POST/DELETE `/api/projects/{id}/vlan`.
- **WP5 Frontend Network-Editing-Tab** `NetworkEditingPage.tsx` (NEU, Route
  `/workspaces/networks` — E-IA: Projekt-Level-Feature gehört in die Workspaces-
  Sektion, NICHT in TASK-078s Platform-`/networks`): Zuordnung anzeigen, neue
  Provisioning triggern, Teardown, Container-Redeploy (bestehende Deployment-Route),
  Compose-Snippet zum Kopieren. Deploy-Dialog + ProjectsPage-Create-Wizard: VLAN-Opt-in.
- **WP6 Doku** API_DOCS (neue Routes/Felder), Backlog-Spiegel, Task-File-Status.

## Koordination mit Parallel-Tasks (14:05-Abstimmung)

- **TASK-082 (R42-Plan, Ports-View):** dessen WP2 plant eine „Ports-Section in
  Workspaces und Apps" (allocated Host-Ports, WAF-Status, Grant-Status). Dieses
  Sprint hier baut bewusst NUR die VLAN/Netz-Zuordnungs-Fläche (TASK-049-Scope):
  VLAN-ID, Driver, Sub-Interface, Docker-Netz, Container-Attach — KEINE Host-Port-
  Sicht, kein WAF-Status, kein Grant-Status. Keine Datei-Überlappung mit 082.
- **Nummerierungs-Hinweis für den Operator:** im R42-Plan-Kontext wurde parallel
  „Tailscale-Serve (080)" genannt, während Batch-Index
  (`docs/tasks/subagents/GLM-SESSION-BATCH-20260914.md`) und Task-File TASK-080 =
  VLAN-Isolation definieren. Falls die Tunnel-Arbeit ebenfalls als „TASK-080"
  geführt wird, muss der Operator eine der beiden umbenennen — dieser Sprint hier
  folgt exakt `PROMPT-task-080-vlan-network-isolation.md`.
- **TASK-078 (Headscale-NetworksPage, Platform-Tab):** disjunkt — meine UI-Datei
  heißt `NetworkEditingPage.tsx` (Route `/workspaces/networks`), nicht
  `NetworksPage.tsx` (Route `/networks`). Backend: `internal/network/vlan.go`
  berührt `headscale.go`/`egress.go` nicht (dort steht der Separation-Note).
- **TASK-072 (Create-Dialog-RBAC):** gelandet (Merge 51bdb68) — mein VLAN-Opt-in
  wird als SEPARATE Sektion neben die Access-Section gesetzt, gleiche Dateien,
  getrennte State-Blöcke, Merge-freundlich.

## Abnahme-Kriterien

1. `make go-build && make go-vet` grün, gofmt clean, scoped Tests grün.
2. Zwei Projects auf einem Host, je eigenes VLAN: Container in A erreichen B's VLAN-IP
   nicht (direkter Verbindungsversuch aus A's Container muss fehlschlagen); Host-
   Management-Interface unberührt; Teardown ohne Reste.
3. gVisor+VLAN: Deploy-Response meldet die gemessene Container-Runtime — beide Layer
   benennbar, nicht nur behauptet.
4. Dokumentation im selben Commit: API_DOCS + Backlog + Task-File.

## Verifikations-Grenzen dieser Test-Umgebung (ehrlich, Mandat 6)

Live verifiziert in dieser Umgebung (Docker 29.6.1, Container-Netns): macvlan-Netzcreate,
ipvlan-Netzcreate; Cross-Netz-Isolation zweier Projekte auf getrennten macvlan-Netzen
(A→B und B→A *Network unreachable*); Host→Container 100 % packet loss (Kernel-Design
erhalten); Live-Attach laufender Container per `docker network connect` (Dual-Homing:
bridge=172.17.0.2 + macvlan=172.31.95.1 in einem Container, ohne Neustart); Teardown
restfrei (Netz-Liste + ip link leer danach). **NICHT testbar hier:** (a) der
802.1q-Sub-Interface-Layer — `ip link add … type vlan` scheitert im Container-Netns an
*Operation not permitted* (kein CAP_NET_ADMIN im Host-Netns) → Unit-Tests decken die
Command-Emission ab, Operator-Verifikation auf echtem Host unten; (b) ipvlan-Container-
Ports — EBUSY in diesem Setup (Netzcreate ok, Port-Attach schlägt fehl) → auf echtem
Host prüfen; (c) gVisor — runsc ist hier nicht installiert (nur runc) → kombinierte
Aktivierung ist über das `JIMESH_RUNTIME`-Echo messbar, Live-Check braucht runsc-Host.

## Operator-Verifikation auf einem VLAN-fähigen Host

```bash
# Host-Voraussetzungen: modprobe 8021q (Kernel-Modul), runsc installiert (für Layer-2-Nachweis)
# 2 Projects deployen (vlanEnabled, je eigenes VLAN), dann aus A's Container:
docker exec <container-A> ping -c2 -W2 <vlan-ip-von-B>     # MUSS fehlschlagen (anderes VLAN, keine Route)
docker exec <container-A> ping -c2 -W2 <vlan-ip-des-2.-containers-in-A>  # Projekt-intern: OK
ip -br link show eth0.100 eth0.101                          # beide Sub-Interfaces UP, eth0 selbst unangetastet
docker inspect -f '{{.HostConfig.Runtime}}' <container-A>   # runsc → gVisor+VLAN beide aktiv
# nach Teardown (purgeVlan oder DELETE /api/projects/{id}/vlan):
ip link show | grep 'eth0\.'        # MUSS leer sein
docker network ls | grep jimesh-vlan # MUSS leer sein
```

---

## Umsetzung (verifiziert gegen den Code)

- [x] WP1 `internal/network/vlan.go` (Provision/Attach/Disconnect/Teardown/Live-Probe,
      deterministisches /24-Mapping `172.(16+id>>8).(id&255).0/24` in 172.16.0.0/12,
      4094-Cap, Shell-Injection-Guards, Compose-Snippet) + `vlan_test.go` — 10 Tests grün
      (Subnet-Grenzfälle 255/256/4094 + 4095-Verweigerung, Idempotenz-Guards,
      Parent-never-touched, ipvlan-Mode-Flags).
- [x] WP2 `internal/store/project_vlans.go` — `project_vlans` (PK project_id, UNIQUE
      vlan_id, FK→projects ON DELETE CASCADE) in migrate() verdrahtet, transaktionale
      Auto-Allokation (explizite ID = typisierter 409-Konflikt, Auto = niedrigste freie
      im Settings-Range, ErrVLANIDRace-Retry), 4 DB-Tests gegen jimesh_test grün.
- [x] WP3 `projects_ssh.go` — DeployRequest `vlanEnabled/vlanId/vlanDriver` (400 bei
      networkMode≠isolated, 400 ohne Workspace-Container, 409 bei ID-Konflikt;
      persistierte Zuordnung gewinnt bei Redeploy), Provision-Commands vor
      Container-Start, Live-Attach nach Container-Start (docker network connect),
      `JIMESH_RUNTIME`-Echo (gVisor-Schicht GEMESSEN), `JIMESH_VLAN_NETS`-Echo
      (Attach GEMESSEN), securityNote mit Dual-Homing- + Layer-Kombinations-Fakten,
      Undeploy `purgeVlan` (400 bei Workspace-Sweep, Row-Löschung erst nach
      erfolgreicher Node-Sweep), Delete-`vlanLeftover`-Report.
- [x] WP4 `projects_vlan.go` — GET (Zuordnung + Compose-Snippet, ehrliches
      assigned:false), POST (Provision + Live-Attach ALLER laufender Projekt-Container,
      pro-Container idempotent + ehrlich), DELETE (Teardown, Credentials Pflicht wenn
      Zuordnung existiert — keine stille Row-Löschung), registriert in deploy.go.
- [x] WP5 Frontend — `NetworkEditingPage.tsx` (`/workspaces/networks`): Zuordnungs-Karte
      mit Fakten-Grid + Copy-fähigem Compose-Snippet, Provision/Teardown mit
      Node-Ziel-Auswahl + Driver/ID, echte Command-Ausgabe im UI, Container-Restart
      über den bestehenden volumenerhaltenden WorkspaceDeployDialog (kein zweites
      Deploy-Request-Schema — Mandat 11); Deploy-Dialog-Sektion (deploy/redeploy) +
      ProjectsPage-Create-Sektion (eigener Block neben TASK-072-Access); App.tsx
      Route + Workspaces-Sub-Nav + Command-Palette-Eintrag; i18n 60 Locales
      (en/de handübersetzt, Rest EN-Fallback — check:i18n grün, 2135 Keys).
- [x] WP6 API_DOCS (4 Zeilen: deploy/redeploy-Felder, undeploy purgeVlan, delete
      vlanLeftover, GET/POST/DELETE vlan-Route), Backlog-Spiegel (049 [~], 080 [x]),
      Task-File-Status + Koordinations-Log.

## Retrospektive (ehrlich, gegen den Code verifiziert)

- Live in dieser Umgebung verifiziert (Docker 29.6.1, Container-Netns): zwei Projekte
  auf getrennten macvlan-Netzen am selben Parent — A→B **Network unreachable**,
  B→A **Network unreachable** (Isolation), Host→Container-IP **100 % packet loss**
  (Kernel-Design: Parent↔Child getrennt — Host-Schutz erhalten, Management-Interface
  unberührt); Live-Attach laufenden Containers per `docker network connect` **ok**
  (dual-homed: bridge=172.17.0.2 + macvlan=172.31.95.1, ohne Neustart); Teardown
  **restfrei** (docker network ls + ip link danach leer).
- **Nicht live testbar hier** (ehrliche Grenzen): (a) der 802.1q-Sub-Interface-Layer —
  `ip link add … type vlan` scheitert im Container-Netns an *Operation not permitted*
  (kein CAP_NET_ADMIN im Host-Netns); Command-Emission stattdessen per Unit-Tests
  verriegelt, Operator-Verifikation oben. (b) ipvlan-Container-Ports — Netzcreate ok,
  Port-Attach schlägt mit EBUSY fehl (Setup-spezifisch); macvlan-Pfad vollständig
  verifiziert. (c) runsc — nicht installiert (nur runc); die kombinierte Aktivierung
  ist über das `JIMESH_RUNTIME`-Echo messbar nachvollziehbar, kein Live-Beweis hier.
- Checks: `make go-build` ✓, `make go-vet` ✓, gofmt (meine Dateien) ✓, go test
  network/store/deploy ✓ — einzigster Fail `TestResolveRegistries_EmptyResultIsAnError`
  ist pre-existing (auf main HEAD identisch reproduziert, DNS der Test-Netns, nicht
  diese Fläche). tsc: 0 neue Fehler in meinen Dateien (Deltamenge vs. main =
  4× DiscoveryStatus.tsx, zwischenzeitlich auf neuerem main gefixt — nie von diesem
  Task angefasst). check:i18n ✓.
- Kein neues Go-Package in go.mod (Mandat 7), CGO-frei, keine netlink-Binding-Dep —
  Command-Emission folgt dem Repo-Idiom (gVisor-Install, Egress, Socket-Guard) und
  erreicht Remote-Nodes über SSH, was ein Prozess-netlink gar nicht könnte.
- Dual-Homing ist bewusst (Research-Fakt: VLAN-only bricht SSH-Tunnel/Egress/WAF, da
  Host↔Parent per Kernel-Design getrennt ist) — als securityNote + API-Doc-Fakt
  dokumentiert, nicht versteckt.
