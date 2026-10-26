# JiMesh — Backlog (Complete)

**Doku-Regel (Operator, 4.10.):** „vergiss nicht alles in den sprints und
backlogs zu dokumentieren mit meinen zitat" — jede Sprint-Entscheidung und
jede Zuweisung wird mit dem **verbatim** Operator-Wortlaut festgehalten
(Muster: `**Anlass (verbatim):**` oben in der Sektion, `> „…"` im Sprint-Dok),
nach dem Motto der bereits gesetzten Stellen (S181 „schau dir den code und
docs dev und docs an…", S184 „ich will nicht localhost benutzen…",
S169 „ICH HABE GESAGT DIESE KEYS SOLLEN AUTOMATISCH ERZEUGT WERDEN").

## Sprint-Spiegel S200 (Multi-Source-Observability: JTSO Event-Bus, OpenReplay NPM, Grafana & OpenSearch Sync, 26.10.2026 — docs/sprints/SPRINT-200-MULTI-SOURCE-OBSERVABILITY-CORRELATION.md)

**Anlass (verbatim):** „das muss auch sein eigenes research doc und sprint werden: wie lösen wir dsa problem von verschiedenen datenquellen, eigene dashboards von uns und sachen wie openreplay npm package? dann bitte alles planen und dann mit subagents machen aber erstmal sprints schrieben nd backlog updaten auch die issues refernzieren und meine prompts. und fix dan auch das was noch von vorhin offen ist“

| Nr | Task | Status |
|---|---|---|
| S200-1 | Globaler Timeline Observer Context (`useTimelineSync`) — synchrone Time-Ranges, Cursors und Filter | [ ] geplant |
| S200-2 | OpenReplay NPM Tracker Integration (`@openreplay/tracker`) — client-seitiges DOM Replay mit DSGVO-Maskierung und Meta-Attribution | [ ] geplant |
| S200-3 | Iframe Bridge für Grafana & OpenSearch (`postMessage` `JIMESH_TIME_RANGE_CHANGE`) | [ ] geplant |
| S200-4 | Multi-Tenant DLS/FLS Proxy für OpenSearch basierend auf `X-Workspace-Scope` | [ ] geplant |
| S200-5 | Integriertes Observability Cockpit (`UnifiedObservabilityPage.tsx`) mit synchronisiertem DOM-Replay, OpenSearch Traces, Grafana Charts | [ ] geplant |

## Sprint-Spiegel S199 (IP-Tracking: Geo-Map, Headscale DNS, User Leases & Adaptive SIEM Tagging, 26.10.2026 — docs/sprints/SPRINT-199-IP-TRACKING-GEOMAP-HEADSCALE-SIEM.md)

**Anlass (verbatim):** „ordentliche integration in networking mit geomap und auch ips die intern auf irgendwas zugreifen oder zugegriffen haben speichern und auch in kombination mit unseren eigenen headscale dns, bei iptracking die user zuweisen, alte ips auch usern zuweisen, auch mit outboudn dlp abgleichen, über ip tracking auch die user flagging und tagging bauen das auch wieder wichtig ist für unser siem, suricata und siem events kombinieren mit ip tracking und geo fencing, ordentliches global acces und outbound dashboard bauen oder grafana dashboards einbauen aber wir müssen dsa uach irgendwie wieder syncen mit unseren eigenen widgets und daten“

| Nr | Task | Status |
|---|---|---|
| S199-1 | Schema für IP-Tracking & User-Lease-Historie (`ip_leases`, `user_ip_history`) | [ ] geplant |
| S199-2 | Headscale DNS Reverse Lookup & MagicDNS Mapping | [ ] geplant |
| S199-3 | Interaktive GeoMap-Komponente (`GeoAccessMap.tsx`) in Networking | [ ] geplant |
| S199-4 | Anomaly Engine: Impossible Travel & Risk Scoring mit Keycloak Step-Up MFA | [ ] geplant |
| S199-5 | User Tagging & Flagging im OpenSearch SIEM (`security_events`) | [ ] geplant |
| S199-6 | Global Access & Outbound Cockpit Dashboard | [ ] geplant |

## Sprint-Spiegel S198 (Outbound-DLP: MITRE TA0010 Exfiltration, Falco eBPF & AI Egress Defense, 26.10.2026 — docs/sprints/SPRINT-198-OUTBOUND-DLP-TA0010-FALCO.md)

**Anlass (verbatim):** „outbound dlp ist zu mager, /home/superleo/jimeshOps/source/jimesh-docs/development/research/outbound_dlp.md konsultieren, Taktik TA0010 implementieren und acuh die anderen docs von mitre ziehen, gerade auch zu den ki sachen, andere frameowrks anschuen und guken was wir davon klauen können, outbound dlp mit falco und ip tracking kombinieren“

| Nr | Task | Status |
|---|---|---|
| S198-1 | MITRE ATT&CK TA0010 Taxonomie- & Alert-Mapper (T1048, T1567, T1052) | [ ] geplant |
| S198-2 | Presidio & Microsoft SITs PII Pattern Engine (IBAN, Kreditkarten, JWT) | [ ] geplant |
| S198-3 | OpenSearch k-NN Semantic Vector Matching für Code-Leakage-Prävention | [ ] geplant |
| S198-4 | Falco eBPF Rule Integration für unberechtigte Repo- & Key-Zugriffe | [ ] geplant |
| S198-5 | Outbound DLP Dashboard Widget mit Timeline-Alerts und Payload-Blockade | [ ] geplant |

## Sprint-Spiegel S197 (Network-Scoping: Dual View, `scope` Prop & Workspace Overview Card, 26.10.2026 — docs/sprints/SPRINT-197-NETWORK-SCOPING-AND-WORKSPACE-OVERVIEW.md)

**Anlass (verbatim):** „network editing bruacht scope als prop, muss auch in workspace overview angezeigt werden, networks bruachen roject oder workspace scope damit man auch in suricata direkt sieht welches project oder vlan das ist, 2 networking seiten, eine für alle projects/workspace, oder mit selector und eins nur für das single project, project/workspace scoped netowrking seite auch in worspace overview aber den selector verbergen für scope“

| Nr | Task | Status |
|---|---|---|
| S197-1 | `scope` als explizite Prop in allen Netzwerk-Views (`NetworksPage`, `NetworkGraphPage`) | [ ] geplant |
| S197-2 | Selektor-Verbergen im Scoped-Modus (saubere Breadcrumbs statt Dropdown) | [ ] geplant |
| S197-3 | Scoped Network Card in Workspace Overview (`/workspaces`) | [ ] geplant |
| S197-4 | Suricata / eBPF Metadaten-Tagging mit `project_id` und VLAN-ID | [ ] geplant |
| S197-5 | Routen-Split: Global `/infrastructure/networks` vs Scoped `/workspaces/networking` | [ ] geplant |

## Sprint-Spiegel S196 (Deployments: gVisor MicroVM vs K8s Runtime & Pod-Mapping, 26.10.2026 — docs/sprints/SPRINT-196-DEPLOYMENTS-GVISOR-K8S-RUNTIME-SPEC.md)

**Anlass (verbatim):** „dpeloyments unklar was das eigenlich sein soll, bruacht klare definitoin wie ist dsa in gvisor und in k8s und wo läuft der code? läuft er in der microvm oder spawnen wir k8s und gvisor container, wenn user eigene node hat kann er auch namespaces angeben, weil das ja sein cluster ist und das gleiche bräuchte es auch für gvisor, namespaces und networking sind auch untergeordnet, user kann im default netowrk deplyen wo der utility container ist oder ein network erstellen,d as muss für gvisor vlans und k8s funktionieren, problem bei gvisor ist das er ja bei docer compose das auch angeben muss, oder nur im befehl? können wir dsa irgendwie mit pods lösen für gvisor“

| Nr | Task | Status |
|---|---|---|
| S196-1 | Deployment Schema & Runtime-Definition (`runsc` Sandbox vs K8s Namespace) | [ ] geplant |
| S196-2 | Custom Node Namespace Selector in Deployment Form | [ ] geplant |
| S196-3 | gVisor Pod-Mapping Engine für Multi-Container Compose Services | [ ] geplant |
| S196-4 | Dual-Network Attachment (Default Utility Network vs 802.1q VLAN Bridges) | [ ] geplant |
| S196-5 | UI-Refactor Deployments View mit Runtime-Badge (gVisor/K8s) & Namespace-Spalte | [ ] geplant |

## Sprint-Spiegel S195 (Workspace-Hierarchie: Namensbindung, Teams, Owner & Utility Auto-Start, 26.10.2026 — docs/sprints/SPRINT-195-WORKSPACE-HIERARCHY-AND-TEAMS.md)

**Anlass (verbatim):** „erstmal bei der selection verstehe ich 2 sachen nicht, was ist view as admin? und wieso ist die selection nicht von dem namen abhängig? worspaces bruachen immer einen ordentlichen namen, niemals die id anzeigen und immer das dazugehörige projekt als tag oder so anzeigen ode rimmer daneben schreiben wenn es nicht eh selectiert ist und es klar ist dsa ein workpsace zu einem projekt oder user gehört. user ist auch wichtig. ein workspace muss usern zugeordnet sein, rausfinden wie die aktuelle hierarhie ist, es sollte so sein: project -> workspaces -> owner -> team -> team kann entweder empty sein oder default, dann ist das erstmal nur owner -> users, bei der erstellung eines projektes muss der namen des workspaces änderbar sein, der default name ist <project>-workspace, es braucht keine shared workspaces mehr, ein workspace hat immer user oder teams, ein team kann auch einfach nur der user sein, das können wir auch in der beschreibung den docs und marketing seite änderen und da einfach in der section share you workspaces schrieben oder so. wichtig ist auch: agents sind user die man in einen workspace holen kann oder ihn berechtigungen gibt, welche services sie dann erreichen dürfen ist dann noch mal ne andere sache, teams müssen sich in workspace erstellung auch erstellen lassen, ein workspace kann mehrere teams haben, wieso 2 internal projete? bei erstellung eines projektes muss der utility container gestartet werden und das projekt deployed werden.“

| Nr | Task | Status |
|---|---|---|
| S195-1 | Schema-Anpassung `workspaces.name`, Pflicht-Owner & Migration von Hash-IDs zu `<project>-workspace` | [ ] geplant |
| S195-2 | TargetScopeModal: Reines Namen-Display, Projekt- & User-Badges, Entfernen des „View as admin“-Blocks | [ ] geplant |
| S195-3 | NewProjectDialog: Editierbarer Workspace-Name (Default: `<project>-workspace`), Team-Erstellung Inline | [ ] geplant |
| S195-4 | Doku & Marketing: Ablösung „Shared Workspaces“ durch „Team Workspaces & Agents“ | [ ] geplant |
| S195-5 | Interne Projekte Konsolidierung: Nur `platform-internal` ist intern (`is_internal = 1`) | [ ] geplant |
| S195-6 | Utility-Container Auto-Start & Deployment Trigger bei Projekterstellung | [ ] geplant |

## Sprint-Spiegel S194 (Browser-Session-Recording: Verbosity + Fake-Replay,23.10.2026 — docs/sprints/SPRINT-194-BROWSER-SESSION-RECORDING-REPLAY.md)

**Anlass (verbatim):** „ich weiß man kann browser replay oder session replay nicht für jede xbeliebige website machen weil man das framework auch installieren muss und die traces auch irgendwo hin senden muss aber man kann zumindest aufzeichnen was der agent in der session im browser gemacht hat und ein fake replay machen und einfach nur das script abspielen bzw einfach irgendwelche fotos speichern je nach verbosity level für warnings, auth/login, post/put/delete usw."

| Nr | Task | Status |
|---|---|---|
| S194-1 | CDP-Klassifizierer L0–L4 → JSONL `browser_session_actions` | [ ] geplant |
| S194-2 | Screenshot-Service (captureScreenshot ≥ Level, MinIO/Ozone, TTL=Session) | [ ] geplant |
| S194-3 | VerbosityProfile + UI-Picker + Recording-Banner | [ ] geplant |
| S194-4 | ReplayPlayer (Keyframes + Cursor-Reenactment + farbcodeierte Marker) | [ ] geplant |
| S194-5 | Anbindung Sessions/AgentSessionDetail + JSONL-Export | [ ] geplant |
| S194-6 | Grenze: OpenReplay=Console-UI, uns=External-Sites, rrweb ausgeschlossen (R47§3) | [ ] geplant |

## Sprint-Spiegel S193 (Shared-Browser-Collab: Multi-User, Sidebar, Chat-Rail,23.10.2026 — docs/sprints/SPRINT-193-SHARED-BROWSER-COLLAB-CHAT.md)

**Anlass (verbatim):** „ich will eigentlich direkt in der idebar bei workspaces so wie email auch eine browser section und bei der browser section will ich eigentlich nur das machen was schon geplant war das man quasi mit seinem team zusammen einen browser zusammen steuern kann und am besten auch direkt die aus sieht aber auch den chat aufmachen kann und da die browser session die man zusammen betrieben will verlinken kann quasi wie google meet und den google chat aber halt ne browser session die man zusammen hat."

| Nr | Task | Status |
|---|---|---|
| S193-1 | Sidebar-Section BROWSER + Route /workspaces/browser + BrowserSessionsPage | [ ] geplant |
| S193-2 | Presence-WS + Cursor-Overlays (Humans grau, Agents violett/cyan) | [ ] geplant |
| S193-3 | neko-Multi-User + Control-Handover (Request-Queue) | [ ] geplant |
| S193-4 | Chat-Rail (S153-Raum pro Session, Meeting-Link-Card) | [ ] geplant |
| S193-5 | AgentSessionDetail: Tab BROWSER mit EINKLINKEN/MITAGEN | [ ] geplant |
| S193-6 | Responsive (lg: Chat als Sheet) | [ ] geplant |

## Sprint-Spiegel S192 (Shared-Browser-Runtimes: Camoufox + nologin,23.10.2026 — docs/sprints/SPRINT-192-SHARED-BROWSER-RUNTIMES-CAMOUFOX.md)

**Anlass (verbatim):** „also die idee ist quasi dass man sowas wie nologin mit camoufox direkt dazu anbietet aber nicht nur für marketing sondern einfach für alles was man so braucht inklusive frontend debugging und vibe coding aber auch einfach nur agent tasks was auch immer das ist"

| Nr | Task | Status |
|---|---|---|
| S192-1 | Runtime-Enum camoufox + BrowserRuntimeModal-Card | [ ] geplant |
| S192-2 | Backend-Profil (neko-firefox + camoufox + Fingerprint-Volume pro Scope) | [ ] geplant |
| S192-3 | nologin: kein Auth-Flow am Browser, Scope-RBAC regelt Sichtbarkeit | [ ] geplant |
| S192-4 | Presets Marketing/Stealth (L4) vs Debug/Agent (L3) | [ ] geplant |
| S192-5 | Ehrlichkeits-Copy (R47§2) | [ ] geplant |
| S192-6 | MASTER-PLAN P2-10 + SPRINT-2-Checkboxen nachziehen | [ ] geplant |

## Sprint-Spiegel S191 (Embedding: Wazuh/Ozone-Recon + S57-Restposten, 7.10.2026 — docs/sprints/SPRINT-191-EMBEDDING-WAZUH-OZONE-WEBVIEW.md)

**Anlass (verbatim):** „alle sprints schreiben und erstmal pr mergen dann alles machen"

| Nr | Task | Status |
|---|---|---|
| S191-1 | WP1 Wazuh-Dashboard einbetten: `server.basePath` des OpenSearch-Dashboards **messen** (laut `deploy/grafana/README.md:302-305` noch nie verifiziert), dann `backend_embed_targets` ergänzen + Backend-Redeploy | [ ] geplant |
| S191-2 | WP2 Ozone Recon einbetten: kein Sub-Pfad → Rewrite-Modus `embed.go:172-193`, Pfad-Erhalt getestet (`embed_test.go:122-131`) | [ ] geplant |
| S191-3 | WP3 Frontend-Ehrlichkeit: Quick-Links `grafana:3000`/`wazuh:5601` existieren im Netz nicht (echt: `jimesh-grafana` `defaults.yml:115`, `jimesh-siem-dashboard` `docker-compose.yml:143`); Presets bereits API-Quelle (`WebviewPanelCard.tsx:99-110`, `query-keys.ts:89`) | [ ] geplant |
| S191-4 | WP4 S57-8/9d/9e abholen — Live-Smoke (`BACKLOG.md:643`), Wazuh/Ozone (`:644`), Deploy `trading` (`:551`), Roundtrip (`:552`) | [ ] offen — Operator |
| S191-5 | **erledigt 7.10. (gemessen):** Backend-Redeploy `superleo` RC=0, Log-Gate „1 embed target(s) mounted … /embed/grafana→http://jimesh-grafana:3000", `/api/embeds` = 401 ohne Session → S57-9d-Teil (Backend-Container) erfüllt, `trading` bleibt offen | [x] done |
| S191-6 | Nebenbefund (Richtigstellung): `RealtimeMonitor` nutzt `instanceId="suricata-monitor"` — repo-weit **1 Treffer**, nur localStorage (`widget-config.ts:39`), **keine Backend-Instanz** | [x] belegt |

## Sprint-Spiegel S190 (Threat-Action: Falco → Response, 7.10.2026 — docs/sprints/SPRINT-190-THREAT-ACTION-FALCO-RESPONSE.md)

**Anlass (verbatim):** „alle sprints schreiben und erstmal pr mergen dann alles machen"
**Freigabe (verbatim, pauschal):** „ alles" — u. a. falco-talon, Mandat-12-Pfade

| Nr | Task | Status |
|---|---|---|
| S190-0 | Befund: `falco-talon`/`falco-actions`/`falcosidekick` = **0 Repo-Treffer**; Wazuh `<active-response>` auskommentiert (`wazuh_manager.conf:224-228`), Befehle aber vollständig definiert (`:183-222`); threat-responder verarbeitet **nur** Suricata `eve.json` SID 8000000-99, kein Falco-Pfad | [x] belegt |
| S190-1 | WP1 `<active-response>` scharf schalten (Empfehlung `firewall-drop :195`), Nachweis über `active-responses.log` (`:305-309`), Config nur über den SIEM-Deploy-Pfad (Mount `docker-compose.yml:89`) | [ ] geplant |
| S190-2 | WP2 Falco→Response, zwei Stufen `logged_only` → `enforce` (analog S144-2); Rauschen-Gate aus S188 **vor** dem Response-Pfad (`metrics.interval=15s`, `docker-compose.yml:249`); `file_output`-Pfad der Bridge unberührt | [ ] geplant |
| S190-3 | WP3 `threat-responder` deployen (`BACKLOG.md:485`) + eigenen Falco-Eingang (SID-Fenster 8000000-99 **nicht** aufweiten), Mandat-12-Loopback-Pfade freigegeben (`deploy/threat-responder/README.md:20-21`) | [ ] offen — Operator |
| S190-4 | WP4 Doku-Korrektur: `BACKLOG.md:1964` Security-Zeile — „Threat Responder" nur noch als *Code/IaC gemergt, Betrieb offen* | [x] done |

## Sprint-Spiegel S189 (Network: Tabs + Suricata-IDS + Network-Anomaly, TASK-102, 7.10.2026 — docs/sprints/SPRINT-189-NETWORK-TABS-SURICATA-ANOMALY.md)

**Anlass (verbatim):** „alle sprints schreiben und erstmal pr mergen dann alles machen"

| Nr | Task | Status |
|---|---|---|
| S189-0 | Befund: `NetworksPage.tsx` **ohne Tabs**, `<SuricataIdsPanel/>` hängt loose ein (`:693`); `/api/suricata/status` existiert als Route, Compose hat Suricata nur als **Placeholder ohne Container** (`deploy/siem/docker-compose.yml:339-357`) → Route ohne Prozess; Tab-Primitive vorhanden (`components/ui/tabs.tsx:50`) | [x] belegt |
| S189-1 | WP1 NetworksPage auf Tabs umbauen (Default `overview`, Suricata-Panel in eigenen Tab, bestehende Sektionen unverändert) | [ ] geplant |
| S189-2 | WP2 Suricata-Betrieb: Empfehlung Compose-Service in `deploy/siem/` (Mandat-12, published ports nur `127.0.0.1`); Host-Rolle `deploy/suricata-network-ids/` = XDP/eBPF-Folgesprint | [ ] geplant |
| S189-3 | WP3 Network-Anomaly-Tab über **bestehende** Quellen (Wazuh-Alerts `wazuh.go:152`, `threat_correlation.go:127-131`, `GET /api/security/events`, Falco-Metriken `prometheus.yml:41-44`), ehrlicher Empty-State solange WP2 offen | [ ] geplant |
| S189-4 | Zuordnung: TASK-102 = `BACKLOG.md:917` (dortiger Eintrag verweist auf diesen Sprint) | [ ] geplant |

## Sprint-Spiegel S188 (SIEM-Ingest: Rauschen, Wazuh-Indexer, `security_events`-Mapper, 7.10.2026 — docs/sprints/SPRINT-188-SIEM-INGEST-RAUSCHEN-INDEXER-MAPPER.md)

**Anlass (verbatim):** „alle sprints schreiben und erstmal pr mergen dann alles machen"
**Freigabe (verbatim, pauschal):** „ alles" — u. a. Loki/Falcosidekick, ML-Runtime

| Nr | Task | Status |
|---|---|---|
| S188-0a | **Gemessen (nicht behauptet):** alias `falco` in `sdk_logs` = **4.662 `metrics-snapshot` vs. 12 echte Regel-Treffer (99,7 % Rauschen)**, Ursache `metrics.interval=15s` (`deploy/siem/docker-compose.yml:249`) | [x] belegt |
| S188-0b | **Gemessen:** kein `<localfile>` liest `jimesh-events.json` (`wazuh_manager.conf:231,237,244,306` nur `df`/`netstat`/`last`/AR-Log) → Falco erreicht den Indexer nie | [x] belegt |
| S188-0c | **Toter Code:** `internal/opensearch` hat **0 Importe** (`Config.Enabled` nie setzbar), `streams.TopicThreats` ohne Publisher/Consumer, `logschema.go:312` ConsumerGroup ohne Caller — dagegen `BACKLOG.md:147`/`:1205` führen S174-7 als „[x] Dual output, semantic search" | [x] belegt |
| S188-1 | WP1 Rauschen am Eingang filtern: Choke-Point `falco.go:187` (einzige Ship-Stelle) mit eigenem Skip-Zähler; **nicht** `log_level` senken (Warnung leeres `/metrics`, `docker-compose.yml:229-233`) | [ ] geplant |
| S188-2 | WP2 Falco → Wazuh-Indexer, Entscheidung offen: (a) `<localfile>` am Manager (**Empfehlung**, Stock-Ruleset greift) vs. (b) Direkt-Bulk `127.0.0.1:19200` | [ ] geplant — Operator-Entscheidung |
| S188-3 | WP3 `security_events`-Mapper (WP2-Delta aus `BACKLOG.md:920`): `RecordSecurityEvent` existiert (`store/security_events.go:192-202`), **0 `internal/siem/`-Datei schreibt dorthin** | [ ] geplant |
| S188-4 | WP4 AD-Detector im Wazuh-Indexer: 17 Plugins inkl. `opensearch-anomaly-detection`, **0 Detektoren/0 Monitore** (ML-Runtime freigegeben) | [ ] geplant |

## Sprint-Spiegel S187 (VS Code Agents × JiMesh — Integrationsrecherche, 5.10.2026 — docs/research/VSCODE-AGENTS-INTEGRATION.md)

**Anlass (verbatim, Prompt 1):** „hier nochmal diesen tas bitte genau dokumentieren mit research
folde rund alles ins backlog und meinen prompt dazu alter wie geil guck dir mal dieses vs code agents
an. die frage ist wie integrieren wir das dass wir da unsere workspaces auswählen? wir müssen das über
den git/vscode account von dem user machen das unsere workspaces/ontianer direkt die remote git
workspaces sind dann kann man wenn man ein github project aufmacht direkt in dieser agents ansicht via
usner dashboard arbeiten und die leute können remote von vs code aus in unserem workspace arbeiten, aber
dazu müssten wir uns mal fragen wie und ob das überhaupt geht und uns mal vs code server und agents mal
genau ansehen oder forken und eventuell noch für unseren scheis ein plugin geschrieben das all unsere
workspaces automatisch in git rmeote sind und auch zustzlich eine extra extension ansicht das ddass
dann genauso wie bei uns ist aber in vs code"

**Anlass (verbatim, Prompt 2):** „https://github.com/microsoft/vscode/blob/main/src/vs/sessions/test/browser/agentsPartCard.test.ts
https://github.com/microsoft/vscode/blob/main/test/smoke/src/areas/agentsWindow/agentsWindow.test.ts
guck mal ob wir da was benutzen können"

**Anlass (verbatim, Prompt 3):** „schau dir mal den rest von dieser agents geshcichte an und ob das
auch statt ssh mitunseren containers gehen würde oder ob wir dann quasi den remote target überall gleich
haben aber den phad von dem workspace halt unterschiedlich, die workspace pfade der contianer sind ja
alle leider auf dem hsot irgendwo, statt in den contianer reinzugehen könnten wir die auch mounten aber
das wäre geiler wenn das irgendiwe anders geht mit dev containers und direkt unser subnet von internal
headscale.... ja eigentlich... aber dann bräuchte man ja quasi ein doppeltes ssh was ja irgendwie auch
nciht geht....kp"

**Anlass (verbatim, Prompt 4):** „obwohl ne wenn man im subnet ist kann man direkt in den contianer /
dann würde das sogar gehn :D dann könnten wir jimesh mit vs code syncen / nice das wollte ich eh
irgendwann haben"

**Anlass (verbatim, Prompt 5):** „nur müssen wir dann unsere agent schiesse direkt da integrieren
irgendweil weil agents laufen ja auch im container bei uns"

**Anlass (verbatim, Prompt 6):** „und squadmesh müsste da auch integriert erden also müssten wir das
wohl forken"

**Ergebnis (5.10.):** Recherche fertig, **kein Code angefasst**. Vollständiger Bericht inkl. aller
Quellen, Messungen und Variantenrechnung: `docs/research/VSCODE-AGENTS-INTEGRATION.md`.

**Scope-Entscheidung (Operator, 6.10.):** (1) erster Slice = **eine eigene, kleine JiMesh-Sidebar-
Extension im JiMesh2-Repo** (`src/vscode-extension/`, S187-12), (2) spätere Forks (`coder/vscode-coder`
bzw. VS Code) laufen **in einem eigenen Repo/Worktree, nicht in JiMesh2**.

| Nr | Task | Status |
|---|---|---|
| S187-1 | **Architektur der Agents-Ansicht dokumentieren** — eigenes Fenster (Profile `User/profiles/builtin/agents/settings.json`), `.agent-sessions-workbench`, **Agent Host** als eigener Prozess + **AHP**-Protokoll (JSON-RPC), Sessions-Subsystem `src/vs/sessions/` mit `ISessionsService` → `ISessionsManagementService` → `ISessionsProvidersService`; Specs `SESSIONS.md`/`LAYERS.md`/`README.md` | [x] done |
| S187-2 | **Integrationsstelle gefunden:** `ISessionsProvider` (`src/vs/sessions/services/sessions/common/sessionsProvider.ts`, 851 Z, `@internal`) mit `browseActions` („Open Workspace"-Picker-Beiträge), `resolveWorkspace`, `createNewSession`, `sendRequest`. **Grenze: kein Proposed-API dafür** → Marketplace-Extensions können das nicht registrieren. Vorhandene Proposed-APIs vermessen: `agentSessionsWorkspace` (nur read-only Flag), `chatSessionsProvider` (Session-Einträge via contribution `chatSessions`), `remoteCodingAgents`, `tunnelFactory`/`tunnels`, `resolvers` | [x] done |
| S187-3 | **Workspace-Pfad: „remote target überall gleich, Pfad unterschiedlich" bestätigt.** Aus `test/automation/src/agentsWindow.ts` (1137 Z): Befehle `workbench.action.sessions.connectViaSSH` („Connect via SSH" → `user@host:port` → Auth-Method → Passwort → **„Name Remote"** → Host-Key-Dialog → **„Select Folder on `<host>`"**), `connectViaTunnel`, `connectViaWSL`, `openWorkspaceInAgentsWindow`, `sessions.newChat`; Selektoren `.sessions-workspace-picker-trigger > .action-label`, Zeilen `aria-label="Remote"`, `.sessions-chat-session-type-picker .action-label`. **Ein Remote-Name pro Host, Ordnerwahl pro Session** | [x] done |
| S187-4 | **Dev-Container-Pfad belegt** (`test/smoke/.../agentsWindow.test.ts`, 934 Z): verschachtelte Transportschichten im AHP-JSONL — `_ahpLog.transport` ∈ `ssh`/`tunnel`/`wsl`/`devcontainer`, `method: "vscode/devContainers/connect"`, `params.workspaceFolder`, `vscode.clientConnectionKind: remote-devcontainer__…`, `[AgentHost] _invokeAgent called for resource: remote-devcontainer__…`. Settings: `chat.remoteAgentHostsEnabled`, `chat.agentHost.devContainer.enabled`, `chat.agentHost.codexAgent.enabled`, `chat.agentHost.ahpJsonlLoggingEnabled` → `<logsPath>/ahp/*.jsonl` als **Maschinen-Nachweis, dass die Session in unserem Container lief** | [x] done |
| S187-5 | **„Doppeltes SSH" verneint** — es gibt nur EINEN Hop; die zweite Schicht ist `docker exec` (Dev-Container), nicht ein zweites Login. Drei Varianten gerechnet: **A** sshd im Container (gemessen: **0 Treffer** für `openssh-server`/`sshd` in allen `Dockerfile`/`*.yml`/`*.j2`; Headscale `10.80.0.0/16` enthält nur Nodes, Container hängen am `jimesh-net`), **B** SSH auf den Node + Dev-Container-Submenu = VS-Code-nativ und im Smoke-Test bewiesen, **C** Host-Pfade mounten (dann läuft der Agent Host auf dem Node und sieht die `*_code_server`-SDKs **nicht**). **Empfehlung: B für Phase 1** | [x] done |
| S187-6 | **„Über den git/vscode account des Users"** — für Workspace-Ordner existiert das **nicht**: die Agents-Ansicht bindet an lokale/SSH-Ordner, der GitHub-Account steuert nur Copilot-/Cloud-Sessions. Ehrlicher Ersatz = **JiMesh/Keycloak-Login** der Remote-Extension. Steht als offene Frage 2 im Research-Doc | [ ] offen — Entscheidung Operator |
| S187-7 | **Externe-Session-Discovery als Billig-Trick geprüft:** VS Code liest `~/.copilot/session-state/<id>/{events.jsonl,workspace.yaml}` via FileSystemWatcher, dazu `~/.claude`, `~/.codex`; Schalter `github.copilot.advanced.showExternalSessions` default **false**. Funktioniert nur, wenn der Agent Host denselben Dateisystem-Root sieht → erst relevant, wenn wir per SSH im Container sind | [x] done (nichts zu tun) |
| S187-8 | **Test-Dateien auswerten (Prompt 2):** `agentsWindow.test.ts` = **sehr verwertbar** (Page-Object `test/automation/src/agentsWindow.ts`, `connectSSHHost`/`selectRemoteFolder` als Blaupause für unsere E2E, AHP-JSONL-Asserts, Settings-Vorbelegung beider Profile, Warm-up-Muster gegen `github/copilot-agent-runtime#9876`, `dumpFailureDiagnostics`/`createRemoteDevContainerFixture`). `agentsPartCard.test.ts` = **kaum verwertbar** — reiner Layout-Vertrag (`.agents-part-card`, `getAgentsPartCardContentSize`, `modern-ui-compact`, `phone-layout`, 4px/8px/1px-Konstanten) → nur als Design-Referenz, wenn unsere eigene Sidebar „genauso wie bei uns" nativ aussehen soll | [x] done |
| S187-9 | **Fork-Ziel festlegen.** A = `coder/vscode-coder` forken (MIT, 739 Commits, URI-Handler `vscode://…/open?owner=&workspace=&agent=&folder=`, Sidebar, Keyring, start-on-open; hängt an `ms-vscode-remote.remote-ssh`), B = VS-Code-Fork (nötig, wenn **SquadMesh als echter Provider** in der Sessions-Liste auftaucht; Kosten: Agent Host + Sessions-Subsystem mitführen, Upstream-Merges, `product.json`-Stamp für `agentSdks`), C = code-server-Fork (läuft schon bei uns, bringt aber die Agents-Ansicht nicht). **Operator (Prompt 6): „müssen wir das wohl forken"** → Empfehlung Reihenfolge A dann B. **Scope (Operator 6.10.):** erst eigene Sidebar-Extension (S187-12), Fork erst danach in **eigenem Repo** | [~] teilweise — Scope-Entscheidung steht, Ziel-Reihenfolge A→B offen |
| S187-10 | **Agent-SDK-Pfade in unseren Containern** — der Agent Host löst SDKs über `product.agentSdks.<name>` bzw. `VSCODE_AGENT_HOST_*_SDK_ROOT` bzw. `node_modules`; unsere `*_code_server`-Images haben die CLI schon drin, aber **keinen** dieser Pfade gesetzt. Beim Fork/der Extension nachziehen. Customizations liest der Host aus `~/.copilot`, `~/.claude`, `.mcp.json` | [ ] offen |
| S187-11 | **SSH-Allowlist als Echtblocker für Nutzer-Laptops** (`docs/SSH-ACCESS-ROUTES.md`): iptables-INPUT-Policy DROP + Allowlist, IP-Rotation 5–7×/Tag bricht jede Verbindung; nur „Weg 1" (socat über den Tailscale-Container, `ssh -F /dev/null -p 2222 …@172.17.0.2`) ist stabil. Vor jedem Kundenzugang muss die VPN-Route stehen, sonst sieht die Agents-Ansicht „keine Hosts" | [ ] offen |
| S187-12 | **Sidebar-Extension (erster Slice, Operator 6.10.)** — `src/vscode-extension/`, Package `jimesh.jimesh-workspaces`, ActivityBar-Container `jimesh` + TreeView `jimesh.workspaces`, 6 Befehle (refresh, openSettings, openWorkspace, copySsh, copyPath, openDashboard). **URL-Vertrag = Port von `src/frontend/src/lib/tunnel.ts`** (lokal direkt `http://<dash-host>:<port>`, remote `GET /api/projects/{id}/tunnel/{port}` + `?token=`); `GET /api/projects` mit `Authorization: Bearer`, Token nie in einer URL. **Zusammengesetztes `contextValue`** (`project.ide.ssh.path`) mit `when` `\.ide`/`\.ssh`/`\.path` (nicht suffix-basiert — sonst verliert ein Pfad-ohne-Node-Eintrag seine Aktionen). i18n en/de über `package.nls(.de).json` + `pickStrings(vscode.env.language)`. Reine Module `model`/`api`/`strings` getestet, `tree`/`extension` importieren `vscode`. **Gates: `tsc --noEmit` 0, `vitest` 30/30.** Ohne Bundler, ohne Runtime-Abhängigkeiten. **v0.1 bewusst NICHT:** Remote-Authority/`ssh-remote`-Verbindung, Sessions-Provider, Dev-Container-Picker (→ S187-2/9), SSH-Allowlist (→ S187-11) | [x] done |

## Sprint-Spiegel S181 (Slop-Audit: die vier kritischen Befunde, 3.10.2026 — docs/sprints/SPRINT-181-SLOP-AUDIT-KRITISCH.md)

**Anlass (verbatim):** „schau dir den code und docs dev und docs an, gleich kommen
updates, kannst direkt ein slop audit machen und finden was nicht gut implementiert
ist oder hält" · „ja mach". Audit über Backend/Frontend/Docs-Abgleich/Hygiene.
`make go-vet` + `go-build` grün, 493 FE-Tests grün — und trotzdem vier Befunde, die
ein grüner Build nicht sieht.

| Nr | Task | Status |
|---|---|---|
| S181-1 | WP0 `ansible-runner/Dockerfile` `bash`+`openssl`+`curl` — **inzwischen erledigt** unter S180-12/13 (`f1965e39`), hier nicht doppelt | [x] done |
| S181-2 | WP1 `/api/keys` in `policy.adminPrefixes` — jedes Session-Identity las Plaintext-Provider-Keys (`/reveal`) ohne Rollencheck, obwohl `/api/consumer-keys` daneben gelistet war. Fix in `policy.go` + `TestIsAdminMutation` + roter `TestRedTeam_NonAdminCannotRevealProviderKey` | [x] done |
| S181-3 | WP2 `POST /api/dsh/test` Panic: `req, _ := http.NewRequest` mit user-URL → nil-deref. Fix `newModelsRequest()` (DB-frei testbar) **+** `panicGuard()` in der Gateway-Kette mit Flusher/Hijacker-Passthrough; 6 Guard-Tests + 4 DSH-Tests | [x] done |
| S181-4 | WP3 `check-i18n.mjs` prüft nur Locale-vs-`en.json`, nie Code-vs-`en.json` → **341** fehlende Keys rendern rohe Key-Strings, Checker läuft grün. Zweiter Lauf + `--strict`-Gate gebaut; Präfixe `t('a.b.'+x)` mitgeprüft | [x] done |
| S181-5 | WP4 Vite-Leiche löschen (`vite.config.ts`, `index.html`, `src/main.tsx`, `dev/mockApi.ts`) + Deps `@vitejs/plugin-react`/`@tailwindcss/vite`; das Pre-Hydration-Script vorher nach `layout.tsx` gerettet (Key `freellmapi.locale`, nicht `jimesh.locale`) | [x] done |
| S181-6 | WP4 doppelte Lockfiles löschen (`pnpm-lock.yaml`, `pnpm-workspace.yaml`) — real läuft npm; `package-lock.json` neu erzeugt, `npm ci` RC=0 | [x] done |
| S181-16 | WP4 Doc-Sync nach Operator-Cleanup: `CLAUDE.md`+`GEMINI.md` → `Agents.md`, `design-assets/` → `assets/design-assets/`, `jimesh-dashboard.png` gelöscht → 14 verwaiste Verweise in `Agents.md`/`README`/`MANDATES`/`SECURITY`/`CONTRIBUTING`/`OPERATOR_GUIDE`/`API_DOCS`/`STITCH-MCP-GUIDE`/`BACKLOG` nachgezogen, inkl. zweiter Fundstelle „Vite frontend" in `CONTRIBUTING.md:35` | [x] done |

### Aus dem Audit übernommen (nicht in S181, eigene Einträge)

| Nr | Task | Status |
|---|---|---|
| S181-7 | **341** fehlende i18n-Keys in `en.json` nachführen **und** in die 59 anderen Locales übersetzen (die Sektion-1-Invarianz verlangt identische Key-Mengen in allen 60 Dateien — reines `en.json`-Eintragen würde ~20k neue Fehler produzieren); danach `npm run check:i18n:strict` in `npm test` hängen. Liste: `npm run check:i18n:strict` | [ ] offen — **Sektion 1 (Locale-Vollständigkeit) wieder grün:** die 29 Keys der DNS- und Dashboards-Sprints (`projectDetail.dns*` ×23 + `projectDetail.dashboards*` ×6) fehlten in 59 Locales und hatten `npm test` rot gemacht; in 7 Batches übersetzt (Terminologie je Locale aus dem Vokabular der eigenen Datei, Tech-Begriffe JiMesh/DNS/FQDN/Traefik/URL unverändert), 59 Dateien × 29 Keys = 1.711 Strings. Verifiziert: `npm test` (606 Tests + `check:i18n`) RC=0, Key-Mengen aller 60 Dateien identisch (3.355 Keys). **Offen:** die 341 Code-Keys, die auch in `en.json` noch fehlen → `check:i18n:strict` bleibt rot (bewusst, sonst ~20k neue Fehler) |
| S181-8 | 414 TS-Fehler in 44 Dateien + `next.config.mjs` `typescript.ignoreBuildErrors`/`eslint.ignoreDuringBuilds` aufheben; Lint 317 Fehler in `src/` | [x] done — **TS: 414 → 0** (`npx tsc -p tsconfig.app.json` RC=0, Repo-Root als Volume gemountet, sonst findet `src/shared` niemand): `src/shared/types.ts` als fehlendes Modul angelegt (12 `import type`-Importer, S181-11 damit mitgelöst), ~100 `t()`-Fehler durch das S181-4-Signatur-Update `t(key, vars?)` bereinigt (string-Fallbacks raus — bei fehlendem Key liefert `t()` ohnehin den Key), Tote-Code-Löschungen nach Mandat 14 (`QuickTestCard`, `activateProfileMutation`/`rateUsage`, `storedRange`, `suggestions`, `cleanHost`/`activeEditPreset`/`applyEditPreset`, wertlose Setter → value-only `useState`), `FallbackEntry` um die vom Gateway real gesendeten Felder `chainId`/`userPreference`/`apiKeyId` ergänzt (`gateway.go:1848-1850`), `MeshGraphEntry`-Union-Widerruf (TS2430), RF-Drag-Handler auf DOM-Event-Union, base-ui-`Button` hat kein `asChild` → 5× `Link`+`buttonVariants` (Pattern wie `TracesPage`), `mesh-icons.ts`-Tabellen ohne Aufrufer gelöscht (2 Schlüssel existieren in den Unions gar nicht), `onLayoutChange`-Signatur + `useCSSTransforms`-Prop auf RGL 2 angepasst, 2 Test-Fixtures um `isPaidModel` ergänzt. Verifiziert: `tsc` 0, `vitest` 68 Dateien/606 Tests PASS. **Offen innerhalb des Tickets:** `next.config.mjs:16/19` (`ignoreDuringBuilds`/`ignoreBuildErrors`) erst entfernen, wenn `npm run lint` grün ist. **Stand 4.10. nach S181-12: 336 Probleme = 308 Errors + 28 Warnings in ~86 Dateien** (vorher 322; Verteilung: 130 `@typescript-eslint/no-explicit-any`, 45 `react-hooks/set-state-in-effect`, 37 `react-refresh/only-export-components`, 37 `@typescript-eslint/no-unused-vars`, 13 `no-useless-escape`, 6 `no-empty`; nur 2 Errors + 1 Warning per `--fix`; Dateien dieser Session WP3/WP4 = **0**, `ProjectDetailPage` (Session 3) = 4; `.next/types` nur 4 Treffer, also kein Hebel beim Ignorieren generierter Dateien). **Zuweisung (Operator 4.10., wörtlich):** „Laptop-Session als W6" — die Lint-Welle läuft bei deren Welle, diese Session liefert nur den Report und fasst das Frontend-Lint nicht an (keine Kollision). **Tabu-Aufhebung (Operator 4.10., wörtlich):** „Tabu für diesen Eingriff aufheben" — die zwei Flags dürfen von dieser Session entfernt werden, **sobald lint grün ist**, und sonst nichts an `next.config.mjs` |
| S181-9 | Mandat-2-Befunde Backend: `SyncCatalog` meldet `success:true` bei offline (`service.go:1571`), `POST /api/import` zählt ungeprüfte Writes (`config_export.go:142`), `lastCheckedAt: time.Now()` erfunden (`gateway.go:2691`) | [x] done — **und die Fundstelle war schlimmer als notiert:** die Katalogquelle antwortet auf JEDE Anfrage HTTP 404 (`src/repo-assets/models.json` existiert in diesem Repo nicht), der Statuscode wurde nie geloggt (Grund stand als `<nil>` da) → jeder Sync meldete `success:true` mit 0 Modellen und stempelte obendrein `premium_sync_at`. Beim Ausbessern gefunden: Custom-URL/Model-Scope von `POST /api/import` wurden unter der **fremden Datenbank-id** (`k.ID` statt der neu erzeugten) gespeichert. Fix: `SyncCatalog` gibt bei Fetch/Status/Decode-Fehler einen echten Fehler zurück (`catalogSource` als Test-Var), Import zählt `imported` nur bei allen Writes + neue `failed`/`errors`-Antwort + neue-key-id statt Export-id, `/api/health` liefert `lastCheckedAt: null` (existiert nirgends gespeichert). Verifiziert: `make go-vet` RC=0, `make go-test` RC=0, 7 neue Tests einzeln mit `-v` PASS (nichts geskippt), API_DOCS 4 Stellen nachgezogen |
| S181-10 | Vault-Scope aus `?project=` ohne Membership-Check (`security/vault.go:85`) → Cross-Project-Secret-Read; dazu `_ = requestedUser` in `secrets_consolidated.go:96` — der kommentierte User-Check existiert nicht | [x] done — `requireVaultScope` → `requireVaultScopeFor(w,r,namedProject)`, Projekt kommt aus `?project=`/`?scope=prj:`/dem Pfadsegment selbst (`projectFromSecretPath`), Gate = `VaultProjectDenial` (Service-Key-Pin → operator/admin → **beide** Schwellen: `jimesh-dev`-Realmrolle **und** `project_roles`-Row `developer`); User-Check in `handleSecretsList` ist echt (verifizierter Sub vs. `X-JiMesh-Identity-Sub`, eigener Namespace nur self, sonst 403); eingebettete KV-Engines hängen an derselben Prüfung (`denyEmbeddedKv`); neue `projects/`-Secrets ohne Projekt sind **400** (ehrlicher Text), Falsch-Projekt-Update **404**. Verifiziert: `make check-backend` RC=0, 15 neue Tests einzeln PASS, tsc-A/B 414=414, eslint 1=1, API_DOCS an 6 Stellen nachgezogen |
| S181-11 | 12 Dateien `import type` aus `shared/types`, das es nicht gibt → still `any`; 12 Dateien fixen oder Modul anlegen | [x] done — `src/shared/types.ts` angelegt, Typen aus den echten Backend-Payloads abgeschrieben (`gateway.go handleKeys` u.a.); beide Import-Tiefen (`../../../shared/types` aus views, `../../../../shared/types` aus components/keys) lösen darauf auf, TS2307 = 0 |
| S181-12 | 3.027 tote Frontend-Zeilen (u.a. `ProjectsPage.tsx`, Route zeigt `/workspaces`) + 34 Goroutines ohne `recover()` + N+1 `Store.Keys()` in `gateway.go:1757`. **Frontend-Anteil erledigt (4.10.): 1.973 Zeilen gelöscht** — `ProjectsPage.tsx` 1.321, `ProjectExplorerSidebar.tsx` 230 (0 weitere Importeure), `ScopeSelectorModal.tsx` 306 (0 Importeure, nie gemountet) + die Access-Blocker-Kaskade (~116: `showUserPicker`/`withUsers`/`AccessUser`/Users-Query/Picker-JSX, einziger Importeur war die tote Seite) + 4 tote `createAccess.*`-Keys × 60 Locales (−240 Zeilen i18n); Kommentare, die die tote Seite noch als Besitzer behaupteten, korrigiert (`use-scope-label`, `BreadcrumbBar`, `HierarchySidebar`), Test `create-access-section.test.ts` pinnt jetzt die ABWESENZ der Picker-Symbole (kommentarfrei). **Backend-Teil erledigt (4.10.):** `internal/safego` neu — `defer safego.Recover("file:func")()` mit std-`log` + `debug.Stack()`, `where` nennt Fundstelle, ohne Panik kein Log; **34 Stellen in 23 Dateien** bestückt (11 `cmd/`, 23 `internal/`, die zwei einzeiligen Körper geteilt, bei `langfuse` erst `wg.Done` dann Recover wegen LIFO); **N+1 raus aus `handleFallback`** — `Store.Keys()` lag pro Chain-Entry in der Schleife (O(entries × keys), nur für `kcnt` gebraucht), jetzt einmal vor der Loop zu `keyCountByPlatform` aggregiert, Abfragezahl `len(chain.Entries)` → 1. **RCs 4.10.:** `gofmt -d` Diff ausschließlich in den 4 vorab unformatierten Dateien und **0 safego-Zeilen** darin (fremde Zeilen unberührt) · `go build ./...` → `BUILD_RC=0` · `go vet ./...` → `VET_RC=0` · `go test ./internal/safego/ -v` → `TEST_RC=0` (echter Panic, Logzeile + Stack + Prozess lebt; ohne Panic kein Log) · `make go-test` → `GOTEST_RC=2` = **genau** die 5 `TestProjectDNS_*` (S184-11, Laptop-Session), kein weiterer FAIL in keiner der 23 Dateien. **Nachmessung 4.10., nachdem die Laptop-Session S184-11 in `dns_test.go` fixte: `make go-test` → `GOTEST_RC=0`, `--- FAIL` = 0 Treffer, `internal/safego` ok** — der oben genannte `RC=2`-Zustand bleibt als Messkette stehen, er war zum Zeitpunkt dieser Arbeit korrekt. Plan + Ergebnis: `docs/sprints/SPRINT-181-SLOP-AUDIT-KRITISCH.md` WP6 (inkl. Korrektur „18 Dateien" → tatsächlich 23) | [x] done |
| S181-13 | Docs-Abgleich: 3 von 308 Routes ohne `API_DOCS.md`-Eintrag (`/api/secrets/upsert`, `POST /api/sdk/dashboards/{id}/apply-preset`, `/ws/`); die Root-Pfad-Verweise auf `API_DOCS.md` sind inzwischen korrigiert (`Agents.md:135`, `README.md:29`) | [x] done — alle 3 Einträge gegen den laufenden Code geschrieben (Pfadbefund mit ACL-Ebenen, SDK-Zwilling inkl. bewusstem fehlendem `{success}`-Wrapper, 7-stufige Fail-Closed-Kette des Routers mit je ihrem Fehlercode) |
| S181-14 | `.git` 337 MB — committed LLM-Session-Logs (`docs/sprints/session.jsonl` 14 MB, Subagent-Logs mehrfach) aus der Historie; `docs_dev/`+`.env`+Binaries korrekt ignoriert | [ ] offen |
| S181-15 | **`make go-test` kann nicht grün werden** — **9** Teststellen (nicht 8: `gateway/suricata_live_test.go` war überzählt) dialten `store.Open("./xxx.db")` statt `$DATABASE_URL`; `store.Open` biegte jeden fremden DSN still nach `localhost:5432` um; `main.go` defaultete auf `./data/jimesh.db`. Dazu die Makefile-/`local-stack.sh`-DSN ohne das rotierte SPRINT-167-Passwort (28P01). Beim Verifizieren aufgedeckt: Migrationsrace über Paketgrenzen (duplicate key in den Systemkatalogen, meldete „kein Postgres" statt Defekt) **und** 47 ALTER vor den CREATEs → 9 fehlende Spalten auf frischer DB **und** produktiv. Fix: DSN ehrlich, Advisory-Lock in `migrate()`, Spalten in die CREATE, `store.ErrMigrate`-Sentinel. Verifiziert: `make go-test` RC=0 (27 ok/0 FAIL), frische DB + 1 Lauf = 0 fehlende Spalten, 0 Migrations-Skips | [x] done |

## Sprint-Spiegel S184 (DNS Overhaul: Host + Tailnet + URLs, 3.10.2026 — docs/sprints/SPRINT-184-DNS-OVERHAUL.md)

**Anlass (verbatim):** „ich will nicht localhost benutzen und auch nicht immer mit localhost arbeiten wenn wir irgendwelche URLs haben das ist scheiße — deswegen halt dns container dazu". Alle Services kriegen NAMEN statt "localhost:8090"-Mischmasch.

| Nr | Task | Status |
|---|---|---|
| S184-1 | **Bind9 DNS Resolver** (`deploy/cp/dns/`): Dual-Bind (127.0.0.1 + 100.127.129.65), vpn-flagged A-Records, Forward-Zone `jimesh-net` → Docker DNS (127.0.0.11), Wildcard `* IN A {{ dns_vpn_bind }}` (C2), DNSSEC Validation AUS, Static IP 172.18.255.253, Verification via `dig` | [x] done |
| S184-2 | **Client Split-DNS** (`deploy/client/dns-client/`): `make deploy-client` (Commercial Tailscale) + `make deploy-client2` (Internal Headscale 10.80.0.0/16), systemd-resolved drop-in via Ansible (`ansible_connection=local`) | [x] done |
| S184-3 | **Traefik** (`deploy/traefik/`): Port 80 + `CAP_NET_BIND_SERVICE`, VPN-only Bind (100.127.129.65), File-Provider für dynamische Projekt-Host-Regeln (C3), Atomic Write via Temp+Rename | [x] done |
| S184-4 | **Keycloak** (`deploy/keycloak/`): VPN-only Bind (100.127.129.65:8081), Realm Fixup bei JEDEM Redeploy (kcadm, Vollständiger REPLACE von redirectUris/webOrigins), Killt `http://:8090/*` Einträge | [x] done |
| S184-5 | **Backend/Frontend**: Shared Traefik Dynamic Volume, DNS-basierte URLs (`JIMESH_FRONTEND_ORIGIN=http://dashboard.jimesh.internal`), ProjectDNSCard in Project-Overview-Panel | [x] done |
| S184-6 | **Client Make Targets**: `make deploy-client` (Commercial Tailscale + DNS), `make deploy-client2` (Internal Headscale + DNS + Auto-SSH-Key-Registrierung via Ansible auf superleo) | [x] done |
| S184-7 | **Verifikation**: `dig @127.0.0.53 dashboard.jimesh.internal` → 100.127.129.65, Login Flow `dashboard.jimesh.internal` → 302 → `keycloak.jimesh.internal:8081` → callback → Session | [x] done |
| S184-8 | **Backend-Route zu S184-5 fehlt komplett** (Nachweis 4.10., `docs/backlog/STATUS-CHECK-2026-10-04.md`): `ProjectDNSCard.tsx:47/71/86` ruft `GET/POST/DELETE /api/projects/{id}/dns` auf, aber `internal/gateway/dns.go` existiert nicht, `grep '"dns"' gateway/*.go` = 0, kein `API_DOCS`-Eintrag → die Karte liefert ausschließlich 404 (ihr eigener Kommentar `:22` räumt „nothing answers for it yet" ein). Ehrliche Fehlerantwort statt totem Frontend: Route + Store + API_DOCS + Tests bauen. **NACHTRAG 4.10. (Befund am selben Vormittag überholt):** Route/Store/Tests lagen um 09:44 (`2e2c49c3`, 3. Session) und 10:29 (`5cac559a`, superleo) vor — `internal/gateway/dns.go` existiert, `gateway.go:456-458` registriert GET/PUT/DELETE, Tabelle `project_dns` (`store.go:801`), 6 Tests. Offen blieb nur der `API_DOCS`-Eintrag, dazu kam S184-11. **Befund-Korrektur:** das Frontend sendet GET/PUT/DELETE (`ProjectDNSCard.tsx:47/71/86`), **nicht** POST — es gibt keinen Methodenkonflikt. | [x] erledigt — **API_DOCS fehlte noch:** `docs/API_DOCS.md:1263-1265` (GET/PUT/DELETE, `persisted=false` = berechneter Default statt gespeicherter Zeile, 404 läuft dem Methoden-Switch voraus, `validDNSLabel`-Fehlermeldungen, idempotentes DELETE ohne Zeilenzähler). **S184-11 mitgelöst:** 5 rote Tests — an **6** Stellen in `dns_test.go` fehlte `req.SetPathValue("id", …)`, ohne es antwortete der Handler `400 project id required` statt 200/404/405; der 6. (`Put_InvalidLabel`) fiel zum Grund 177 **falsch** durch (erwartet 400 und bekam 400, aber wegen der fehlenden id, nie wegen des Labels). **Nachweis:** VORHER (Datei von `origin/main`, Stand `1e9bec7c` = vor meinem Fix) exakt **5 FAIL** an `dns_test.go:51/109/232/265/289` → NACHHER `go test ./internal/gateway/ -run TestProjectDNS -count=1` **RC=0, 0 FAIL / 11 PASS**; `go vet ./...` + `go build ./...` RC=0 (4.10., erzwungene Reproduktion über eine wegwerf-Postgres ohne Volume/Stack, danach entfernt). |
| S184-9 | **Apex-Record `jimesh.internal` fehlt komplett** — `dig jimesh.internal` = NODATA, ein Wildcard `*` deckt den Apex laut RFC 4592 nicht ab (leerer linker Label); alle echten Namen sind Subdomains, der Apex blieb tot. Fix in `deploy/cp/dns/zone.j2` hinter der NS-Zeile: guarded `if dns_vpn_bind nicht leer und != 127.0.0.1 → @ IN A {{ dns_vpn_bind }}` / `else → @ IN A {{ _dns_ip }}` (beide Zweige nie leer — ein unbedingter `@ IN A {{ dns_vpn_bind }}` würde bei leerem Wert eine leere Ziela rendern und BIND lehnt die GESAMTE Zone ab). **Nicht** `{{ _dns_ip }}` allein: live gemessen `ns1.jimesh.internal → 172.18.255.253` (docker-intern, ping vom Laptop 100 % Verlust) → Apex wäre weiter tot. **Anlass (verbatim):** „nslookup jimesh.internal → EINE Adresse (erwartet 100.127.129.65), nicht 'No answer'" · „hast du jetzt wie er das iwll neudeployed?" · „aber warum hast du da unsere ip hardgecodet geht das nicht mit den make targets und iac?" → beantwortet: **kein Wert steht im Template**, Record rendert aus `config.yml vpn_ip` ← `.env SUPERLEO_VPN_IP` bzw. `ansible-task.yml` (`_dns_ip`), Deploy über `make redeploy SERVICE=cp/dns NODE=superleo`; nur die zwei gemessenen IPs in den KOMMENTAREN standen dort und sind raus (knotenspezifisch). Verifikation: 2× `REDEPLOY_RC=0 ok=20 failed=0`, apex → 100.127.129.65, dashboard unverändert, Wildcard ok, deployed Zone == Repo (Block Z.16/Record Z.33), Logs ohne Zone-/Syntaxfehler. Commit `706f28e1`, Details `docs/sprints/SPRINT-184-DNS-OVERHAUL.md` NACHTRAG. **Vom Laptop nachgemessen 4.10. (die dort ausstehende Probe, damit erbracht):** `nslookup jimesh.internal` → `100.127.129.65`, `nslookup dashboard.jimesh.internal` → `100.127.129.65`, kein „No answer" | [x] done |
| S184-10 | **`record-deploy` seit PR #13 nicht mehr benutzbar** — `Makefile:386` übergibt `$(SERVICE)` an `src/scripts/record-deploy.sh`, das nur `[A-Za-z0-9._-]` **ohne Slash** akzeptiert, seit PR #13 aber `SERVICE=cp/dns` (Pfad) übergeben wird. Am Ende beider Deploy-Läufe: „record-deploy: refusing service name 'cp/dns' — must be 1..64 chars of [A-Za-z0-9._-] starting alnum (the health probe interpolates it into a remote command)". Folge: **jeder Deploy mit `cp/`- bzw. `client/`-Präfix wird nicht im Deploy-Protokoll/der Health-Probe erfasst** (Ansible selbst läuft durch, `REDEPLOY_RC=0`). **Gelöst über PR #14** (Branch `fix/s184-service-key-path-slash`, 4 Dateien +59/−11): genau **ein** Slash im Gate (`^[A-Za-z0-9][A-Za-z0-9._-]*(/[A-Za-z0-9][A-Za-z0-9._-]*)?$`, jedes Segment alnum-führend → weder führender Slash noch `..`-Traversal noch `a/b/c` darstellbar), 1..64-Länge explizit geprüft, **ZWEI** Stellen mit einem Vertrag: CLI `record-deploy.sh` **und** Gateway `node_services.go` — breiter als meine beiden Varianten (a)/(b). Squash-Merge `4be2614e` nach Operator-Wahl 4.10. („Squash-Merge von #14"). **Anlass (verbatim):** „aber warum hast du da unsere ip hardgecodet geht das nicht mit den make targets und iac?" (Befund kam beim Redeploy-Audit ans Licht) · „kannst du auch alles mergen ohne das advanced shit verloren geht usw?". **Verifikation superleo 4.10. (PR lokal nachgebaut, Worktree `414e22bc`):** `go vet ./internal/gateway/` → `VET_RC=0`; `go test -run 'NodeService|ServiceName'` → `TEST_RC=0` (4 PASS, 4 DB-Skips ehrlich); `bash -n record-deploy.sh` → `BASHN_RC=0`; **A/B am echten Skript** (`SERVICE` als `$2`): ALT-MAIN lehnt `cp/dns` **und** `client/dns` ab (→ seit PR #13 kein Record, der Befund), PR #14 lässt beide durch und lehnt weiterhin `../etc`, `/dns`, `a/b/c`, `cp/../etc` und 65 Zeichen ab; Gate-ablehnung hat `rc=2`. CI rot = der bekannte Lock-File-Fehler, kein Regressionssignal | [x] done — PR #14, `4be2614e` |

## Sprint-Spiegel S184-WP3/WP4 (Terminal + Container Overview Widget, 4.10.2026 — docs/sprints/SPRINT-182-DASHBOARD-GRID-AND-NAVBAR-IA.md)

**Anlass (verbatim):** Operator-Prompts 144166, 144961 — Terminal in Projects (Default Utility Container) + Container Overview Widget mit SSH Target. Die Platzierung des Terminals ist eine ausdrückliche Operator-Entscheidung: „TERMINAL → PROJECTS, ausdrücklich entschieden (Ausnahme vom Global-Charakter — deployed eh by default im Utility-Container)". Zielzustand WP3 wörtlich: „Laufender Container des Projekts, sonst ehrlicher Fehler. Dropdown listet die REAL laufenden Container des Projekts (Docker-Fakt, Mandate 2), Vorauswahl = erster laufender; keiner da → klare Meldung 'kein laufender Container — deploy first'. Wenn S170 kommt, wird utility-<projectId> automatisch zuerst genommen."

| Nr | Task | Status |
|---|---|---|
| S182-WP3 | **Terminal in Projects** (Default Utility Container): Route `/workspaces/projects/:id/terminal`, Default Utility Container, Container Dropdown, WebSocket Terminal | [x] done — 4.10. diese Session: `GET /api/projects/{id}/terminal` (WS, method-gelockt, `gateway/project_terminal.go`) + `registerProjectTerminal`; Gate `security.VaultProjectDenial`; Ownership-Set serverseitig (`filterProjectContainers`/`owns`, utility-`<projectId>`-Präferenz S170-fertig), zwei ehrliche Ablehnungen getrennt (fremd 4003 / gehört dir, läuft nicht 4001); Frontend `ProjectTerminalPage` + `WorkspaceTerminal`-Props `terminalPath`/`container`/`scope` + Route in `App.tsx` + 9 i18n-Keys in 60 Locales. Verifikation: `VET_RC=0`, `BUILD_RC=0`, gofmt leer, 7 Go-Tests PASS (davon 1 mit Daemon-Socket), `TSC_RC=0`, `check:i18n RC=0`, Vitest 604 bestanden — 4 Rotstellen nachweislich fremd (`NewProjectDialog.test`, sauberer HEAD 24e67c74, identischer Fehler). Sprint-Datei `docs/sprints/SPRINT-182-WP3-PROJECT-TERMINAL.md` §6 — **Querschrift-Zwischenfall dokumentiert (§6.2):** die eine `gateway.go`-Zeile wurde von Session 3 in `5cac559a` mitcommitted, während der Handler noch untrackt war → HEAD unbaubar (`registerProjectTerminal undefined`, `HEAD_BUILD_RC=1`), geheilt durch `03538bcf`; Regel für alle drei Sessions: nur eigene Pfade committen |
| S182-WP4 | **Container Overview Widget** mit SSH Target: `ContainerOverviewWidget` Component, dynamischer SSH Target per Prop, Dashboard Embed, Container Detail Page, App Panel Drawer | [x] done — `gateway/containers.go` (GET /api/containers/{id}/overview + /ssh-target + /api/projects/{id}/containers), `ContainerOverviewWidget.tsx` (live Metrics, SSH Target, Actions), `ContainerDetailPage.tsx` (/workspaces/containers/:id), `ProjectDetailPage.tsx` Containers-Tab, i18n keys en/de |

## Offene Test-Rotstände 4.10. (fremd verursacht, Zuweisung hier festgehalten)

**Anlass (verbatim):** „vergiss nicht alles in den sprints und backlogs zu dokumentieren mit meinen zitat" — beide Rotstände lagen auf `origin/main`, bevor sie einen Besitzer hatten; hier eingetragen, damit sie niemand als eigen abheilt und niemand sie zweimal „entdeckt".

| Nr | Task | Status |
|---|---|---|
| S184-11 | **`dns_test.go` — 5 Tests rot** (Commit `5cac559a`, Session 3): `dns_test.go:51/109/232/265/289` → `expected 200 OK, got 400: {"error":{"message":"project id required"}}`. Ursache: der Test ruft `handleProjectDNS` ohne `r.SetPathValue("id", …)` auf, der Handler liest aber `r.PathValue("id")` — der Testharness, nicht `dns.go`. Die in Nemotrons Phase 1 genannte ErrNoRows-Lücke in `dns.go` ist davon zu trennen (zwei verschiedene Defekte in derselben Datei). Nachweis: `make go-test` → `GOTEST_RC=2`, `grep -- '--- FAIL'` = genau diese 5 | [ ] offen — an Nemotron (Phase 1) |
| S182-WP4-T | **`NewProjectDialog.test.tsx` — Tests rot** (Commit `24e67c74`, Nemotron): `Error: server select trigger not found` (`NewProjectDialog.test.tsx:131`, `document.getElementById('new-project-server')` liefert nichts), Stand 4.10. 4 von 6 Fällen (Läuferschwankung 5→4). **Nicht von S182-WP3 verursacht:** derselbe Test auf sauberem `24e67c74` in eigenem Worktree mit echtem `node_modules`-Mount reproduziert exakt dieselben Fälle und dieselbe Fehlerursache (`HEAD_VITEST_RC=1`). Volllauf 4.10.: Vitest 604 bestanden \| 4 fehlgeschlagen (608), `check:i18n` RC=0, `TSC_RC=0` | [ ] offen — an Nemotron (Frontend-Phase) |

## Sprint-Spiegel S174 (Sessions/Traces: OpenReplay + Kafka + Datadog-Style Network Events, 30.9.2026 — docs/sprints/SPRINT-174-SESSIONS-REPLAY-TRACE-TAGGING.md)

**Anlass:** Operator-Prompts 135137, 138019, 140187 — Sessions/Traces Pipeline, OpenReplay/rrweb, Kafka, Datadog-Style Network Events, OPA/Trust-Ratchet/Threat-Detection Integration.

| Nr | Task | Status |
|---|---|---|
| S174-1 | **Session Propagation** (X-Headers): `X-JiMesh-Session-ID`, `X-JiMesh-Trace-ID`, `X-JiMesh-Scope`, `X-JiMesh-VLAN`, `X-JiMesh-Network`, `X-JiMesh-Agent-ID`, `X-JiMesh-Git-Repo`, `X-JiMesh-Git-Commit` | [x] **a0564cbd** — `auth/propagation.go` + Middleware stamping, StripIngress, all 8 headers |
| S174-2 | **Kafka/ClickHouse Traces Pipeline**: Topic `jimesh:traces`, `jimesh:projects`, `jimesh:agents`, `jimesh:threats`, `jimesh:abuse`, `jimesh:traffic`, `jimesh:integrations`, ClickHouse schema + client, Store methods | [x] **a0564cbd** — `deploy/clickhouse/`, `gateway/clickhouse.go`, `streams/streams.go`, `store/store.go` |
| S174-3 | **OpenReplay Integration**: Self-Hosted Deployment, Frontend Embed Component, Session Replay UI | [x] **a0564cbd** — `deploy/openreplay/`, `OpenReplayEmbed.tsx`, `traces_api.go:/replay` |
| S174-4 | **Datadog-Style Network Events UI**: NetworkEventsTable, TraceWaterfall, Session Selector, OpenReplay Embed | [x] **a0564cbd** — `NetworkEventsTable.tsx`, `TraceWaterfall.tsx`, `OpenReplayEmbed.tsx` |
| S174-5 | **Session Propagation in Worker Deployment**: Ansible Hook für Session Headers, Worker Code Propagation | [ ] offen — Phase 4 |
| S174-6 | **OPA/Trust-Ratchet/Threat-Detection Integration**: Session ID in OPA Input, Security Events Korrelation | [ ] offen — Phase 4 |
| S174-7 | **Logger SDK + OpenSearch**: Dual output (Redis Streams + OpenSearch), semantic search, sampling, context enrichment | [x] **a0564cbd** — `logger/logger.go`, `opensearch/opensearch.go`, `logschema/logschema.go` |

## Sprint-Spiegel S171 (Onboarding + Presets + Dynamic Sidebar, 30.9.2026 — docs/sprints/SPRINT-171-ONBOARDING-PRESETS-DYNAMIC-SIDEBAR.md)

**Anlass:** Operator-Prompt 111113 — Onboarding Flow, Project Creation, Plugin Selection, Jira-Style Presets (Dev/Design/Marketing/DevOps), Dynamic Sidebar via Context Keys.

| Nr | Task | Status |
|---|---|---|
| S171-1 | **Onboarding Wizard**: 4 Schritte (Preset → Details → Services → Review), Webview-basiert | [ ] offen |
| S171-2 | **Presets (Jira-Style)**: Dev, Design, Marketing, DevOps, Custom — Default Services, Scope Selector Config | [ ] offen |
| S171-3 | **Dynamic Sidebar (Context Keys)**: `projectPreset`, `utilityContainer`, `meshsquadInstalled`, `features` → Sidebar Filter via `when` Expressions | [ ] offen |
| S171-4 | **Plugin/Service Selection UI**: Dynamic Service Selector basierend auf Preset, Override möglich | [ ] offen |
| S171-5 | **Onboarding API**: `POST /api/onboarding/complete` → Project Create + Services + Utility Container Deploy + Git Repo + n8n | [ ] offen |
| S171-6 | **Presets Config**: `presets.yaml` mit Default Services, Scope Selector Config, Multi-Select | [ ] offen |

## Sprint-Spiegel S170 (Utility Container: code-server + SilverBullet + Git Graph + n8n + Claude Code, 30.9.2026 — docs/sprints/SPRINT-170-UTILITY-CONTAINER.md)

**Anlass:** Operator-Prompts 111113, 116157 — Single Utility Container pro Projekt (code-server, SilverBullet, Git Graph, n8n, Claude Code), S3 File Ops, VS Code Sidebar, Shared Workspace, Git Graph (MIT), SilverBullet statt Obsidian.

| Nr | Task | Status |
|---|---|---|
| S170-1 | **Base Image**: `coder/code-server:latest` + SilverBullet + n8n + Git Graph Extension + Claude Code CLI | [x] done — `deploy/utility-container/Dockerfile`, **BUILD_RC=0** (fünf Läufe, jede Todesursache gemessen und im Sprint-Doc §15: `coder/code-server` existiert auf Docker Hub nicht → `ghcr.io/coder/code-server`; SilverBullet v2 hat kein npm-CLI mehr → Standalone-Release 2.11.1; distutils weg auf trixie + `make`/`g++` fehlten → Toolchain in derselben Layer, danach `purge`; n8n 2.41.6 verlangt `engines node >=24.0.0` → nodesource 24). **Im Image gemessen** (nicht aus der Spec): `claude 2.1.289` · `git 2.47.3` · `silverbullet 2.11.1` · `n8n 2.41.6` · `node v24.21.0` · code-server mit `--auth password`. Basis-Image-Specname `coder/code-server:latest` war falsch, ersetzt durch den gemessenen ghcr-Namen. Ein Container, drei Prozesse unter Supervisord als PID 1 (Operator-Direktive 30.9.) |
| S170-2 | **Container Structure**: `/workspace` (S3 Mount), Supervisord für code-server (8080), SilverBullet (3000), n8n (5678) | [~] teilweise — Supervisord + alle drei Services **gemessen** am laufenden Container (`PROZESSE_GEZAHLT=5`, PID 1 = `supervisord -n -c …`, Flags im Prozessbaum = die aus `supervisord.conf`, `PROBES_RC=3/3` auf 8080/3000/5678, `PUBLISH_COUNT=0`). `/workspace` existiert im Image (gebaut, `chown coder`), aber **der S3-/Host-Mount fehlt noch** — der kommt beim Projekt-Launch in Slice D; Parkfrage §13/1 an den Operator steht (S3-FUSE vs. Host-Bind). Ein Dauer-Container ist bewusst NICHT Teil dieses Services, der Smoke wird nach der Messung entfernt |
| S170-3 | **Git Integration**: Native VS Code Git + Git Graph Extension (.vsix pre-installed, MIT) | [x] done — `.vsix` wird beim **Build** aus Open VSX geholt (Version 1.30.0 gemessen; die Spec-1.32.0 existiert dort nicht, antwortet 404), **nicht** ins Repo (S181-14). Eigener Fund: das erste Image legte die Datei nur nach `/opt/extensions` — `code-server --list-extensions` war leer (`extensions.json` 2 Bytes), der Beweis wäre also ein Papiersieg gewesen. Fix `c7184ffa`: `--install-extension` in den Build **plus** `chown -R coder:coder /home/coder/.local`, weil die Installtion `.local`/`.local/share` als root 700 anlegte und `coder` danach mit `EACCES` nicht mehr ins eigene Home kam. Nachmessung als User `coder`: `mhutchie.git-graph`, **LIST_RC=0**; `git --version` → 2.47.3 im Image |
| S170-4 | **S3 File Ops**: Rename = Copy + Delete API (`POST /api/s3/rename`) | [ ] offen |
| S170-5 | **VS Code Sidebar Integration**: Container Filebrowser Tab, `GET /api/projects/{id}/container/files` | [ ] offen |
| S170-6 | **Onboarding Integration**: Project Create → Utility Container Deploy (Ansible) | [x] done — `make redeploy SERVICE=backend NODE=superleo` **RC=0** (Ansible ok=14 failed=0, SuppGids=["973"]); Live D3 auf superleo: **POST Launch RC=0** (3.9s, 4/4 Probes ok, `mounted:true`), **GET Status RC=0** (`mounted:true`, ContainerId, 3× Probe ok), **DELETE Stop RC=0** (`STOP=clean`, Mount weg `findmnt=nein`, rclone_procs=0, Container weg, Helper weg, `/run/jimesh` leer); Code: `rcloneObscure` (AES-CTR + RawURLEncoding, `rclone reveal` roundtrip 3/3), `mkdir -p $MountDir` (rclone legt ihn NICHT an), `mountpoint -q → findmnt` (FUSE-Erkennung), Host-Mode Image-Check in Go (Helper hat kein docker CLI), Dispatch-Name `jimesh-dispatch-<hex>` nicht von `utility-` filter; Verifiziert: `make go-build/go-vet/go-test` RC=0 (volle Suite 0 FAIL, 4 neue Tests grün: Launch-Skript-Contract, `bash -n`, Runner-Selection, Dispatch-Name) |
| S170-E1 | **Utility Proxy Backend**: `/utility/{id}/*` Reverse Proxy + Auth Middleware | [x] done — `registerUtilityProxy` + `handleUtilityProxy` in `project_utility.go`, Auth Middleware Branch in `auth.go` (gleiche Kette wie `/embed`: Bearer, Cookie, `?token=`), `httputil.ReverseProxy` nach `utility-<id>:8080` auf `jimesh-net`, Path-Rewrite (`/utility/{id}/...` → `/...`), X-Frame-Options/CSP-Strip, `?token=` Handoff → Cookie; `make go-build/go-vet/go-test` RC=0, `make redeploy` RC=0 |
| S170-E2 | **Utility Proxy Auth Fix**: Keycloak Token für `/utility/*` | [x] 6872af33 — Middleware verwendet identische Kette wie `/embed`: `validKeycloakToken` + Session-Cookie-Fallback, fail-closed; Verifiziert: gültiger Token → 302 Proxy, ungültiger → 401 |
| S170-E3 | **Frontend Utility Reiter**: Status, Start/Stop, Proxy-Links | [ ] offen — Projects-Bereich: Reiter "Utility" mit Status-Chips, Start/Stop-Buttons, 3 Proxy-Links (code-server/SilverBullet/n8n); i18n 60 Locales, Vitest |
| S170-7 | **Security (gVisor)**: `--runtime=runsc`, `--security-opt seccomp=unconfined`, `cap_add SYS_ADMIN`, `apparmor:unconfined` | [ ] offen — **blockiert auf S180 WP2**, gemessen statt behauptet: `Default Runtime: runc`, `Runtimes: io.containerd.runc.v2 runc` (kein `runsc` registriert), kein `/usr/bin/runsc`, `/etc/docker/daemon.json` existiert nicht — genau der Ist-Zustand, den S180 WP2 als offen notiert hat. Der eigene Sprint-Plan hatte „Nachweis über `NStgid`-Tiefe" versprochen; das trägt nicht (ein Container im eigenen PID-Namespace zeigt immer EINEN Wert: lokal 102, Node 7) — maßgeblich ist `HostConfig.Runtime`. Korrektur auch am Flag-Text dieser Zeile: `seccomp=unconfined` + `SYS_ADMIN` + `apparmor:unconfined` wäre die weiteste Öffnung, die die Spec nennt, **nicht** umgesetzt; erst `runsc` installiert + `daemon.json` (S180 WP2), dann `--runtime=runsc` und Nachweis über das Runtime-Feld |
| S170-8 | **S3 File Ops API**: `POST /api/s3/rename` → Copy + Delete | [ ] offen |

## Tier 0 Critical Fixes (aus Post-Audit `glm-session-post-audit-tasks.md`)

| Nr | Task | Status |
|---|---|---|
| S181-16 | **#142** `/api/ssh/explore` doppelt registriert (`deploy/ssh_explore.go` vs `gateway/ssh_explore.go`) | [x] done — `0e26fd35`: deploy-Duplikat gelöscht, nur gateway-Registrierung, grep-verifiziert |
| S181-17 | **#162** `ProxyChainsPage.tsx:763` — `key.status \|\| 'healthy'` (Mandat 2 Verstoß) | [x] done — `0e26fd35`: Fallback jetzt `'unknown'`, kein Fake-Healthy mehr |
| S181-18 | **#147** `AgentSessionDetailPage.tsx` — 100% Fake-Data (Chat, Metrics, eBPF Trace) | [x] done — `d896849d`: echte Queries `/api/sessions` + `/api/subagents/{id}/tool-calls`, Chat startet leer, keine fabrizierten Fallback-IDs |
| S181-19 | **#145** `PluginCatalogPage.tsx` — fake Ratings/Reviews, fallbackDefaults | [x] done — `d896849d`: nur `GET /api/plugins` + `GET /api/plugin-installations`, ehrlicher Empty-State statt Fallback-Plugins |
| S181-20 | **Plugin-Installation ohne Membership-Gate** — `POST /api/plugin-installations` prüfte nur, ob die Scope-Row EXISTIERT (nicht ob der Caller sie darf); `/api/plugins*` fehlt in `policy.adminPrefixes`. Folge: jede authentifizierte Identität konnte in JEDEN Projekt-Workspace installieren — und Handler-Stufe 7 schreibt secret-förmige Config danach ins VAULT DIESES Projekts unter Angreifer-namen (`plugin/{id}/{scope}/{id}/{key}`). Gleiche Defektklasse wie S181-10. Fix: `security.VaultProjectDenial(r, store, projectID)` → 403 in `plugins.go` (Create) und `meshsquad.go` (Uninstall löscht fremde Row + fremde Vault-Secrets, owningProjectID jetzt vorher aufgelöst). Neue rote Tests: `TestPluginInstallRequiresProjectGrant` (403 ohne Identität / ohne `jimesh-dev` / ohne Grant — und 0 persistierte Rows; 200 als Operator), Happy-Path-Tests tragen Operator-Identität | [x] done — `make go-test` RC=0 (27 Pakete, 0 FAIL) |
| S181-21 | **Startup-Blocker aus S183 (#12, gemergt `fdfdbbb3`)**: `mux.HandleFunc("/api/dashboard-presets/utility", …)` (alle Methoden) **konfliktiert mit `DELETE /api/dashboard-presets/{id}`** — ServeMux panikt in BEIDEN Reihenfolgen („matches more methods … more specific path"). Das Signal war rot: `TestUtilityDashboardPresetsOperatorGate` erhielt ServeMux-405 statt Handler-403, weil die Literal-Route nur in `New()` hing, der Test-Mux aber `registerDashboards` nutzt. `gateway.New()` hätte beim nächsten Deploy **beim Start gecrasht**. Fix: Route nach `registerDashboards` verschoben (genau eine Registrierung, produktiver + Test-Mux) und auf `GET /…` gelockt (damit sind die Methodenmengen disjunkt); der im Handler dadurch nicht mehr erreichbare `Method != GET`-Check ist tot → gelöscht (Mandat 14, Präzedenz `handleDashboardApplyPreset`). **Verifiziert mit echten Kommandos:** 293 Produktions-Routen-Patterns registrierbar ohne Konflikt, echter Gateway-Boot gegen Wegwerf-DB (`HTTP listening on :8099`, kein Panic), `make go-test` RC=0 | [x] done |
| S181-22 | **Gap-Liste der Prompts gegen den Code verifiziert** (`docs_dev/last_dsh/GAP_ANALYSIS_COMPLETE.md`, Stand 4.10. 05:00) — die Liste war teils veraltet: Design-Routen 1/3/5 (`AppDiscoveryPage`, `DeploymentDetailPage`, `SSHTargetDetailPage`), `WorkspaceDetailPage`→`/api/deployments`, #153 (Delete-Weg auf `ProjectDetailPage`), #170/#171/#172 und Browser-Integration (`BrowserRuntimeModal`) sind bereits IM CODE; nur OTel-Trace-Detail bleibt durch Audit-F-05 blockiert | [x] done — jeder Eintrag mit file:line belegt statt geglaubt |
| S181-23 | **Wirklich offene Prompt-Reste** (Auswahl der verifizierten Liste). **Erledigt am 4.10. (Mandat 14 zuerst):** tote `ScopeSelectorModal.tsx`, `ProjectsPage.tsx` + `ProjectExplorerSidebar.tsx` und die Access-Picker-Kaskade gelöscht (#143 wird damit **obsolet** — der nie gemountete 4-Level-Modal existiert nicht mehr, der Selektor lebt als Popover in `HierarchySidebar` und deckt heute nur ssh+projects ab). **Offen:** #160 live-Duplikate (Sidebar-Popover vs. Scope-Section, 2–3 Selektoren-Implementierungen), #159 CommandPalette (Models live, Pages statisch), #164–#167 (Admin-API-Keys-Oberfläche, Access-Preview, OPA-Stream, Vault-Access-Matrix), Secrets-Konsolidierung 4→1 Ablagen (#099), SIEM WP1/WP3/Mapper (#032), Plugin-Manifest→Registry→RBAC (`ParsePluginManifest` hat 0 Nicht-Test-Aufrufer), GET `/api/plugin-installations` listet cross-projekt alle Rows (nur Secret-Ref-Namen, Config gestrippt — Lese-Sicht nach Membership filtern), OTel-Trace-Detail (durch Audit-F-05 blockiert) | [ ] offen |

## Sprint-Spiegel S180 (Deploy-Gate + gVisor + Härtung + Shared-Volume/GPU-Stack, 3.10.2026 — docs/sprints/SPRINT-180-DEPLOY-GATE-GVISOR-HARDENING-SHARED-VOLUME.md)

**Anlass (verbatim):** „wenn einer was deployed und das root hat bringt das ja
wieder alles nix das ist schon echt kacka" · „ich will halt nicht dass jemand aus dem
container heraus auf den host kommt mit privilege escalation and iteration" ·
„wir wollen das doch ordentlich machen mit gvisor und separiert vom host".
Plan im Sprint-File (WP1–WP5, vor dem Code). **Reihenfolge ist Absicht:** Gate
zuerst — Container-Härtung ist wertlos, wenn die Pipeline beliebiges Root liefert.

| Nr | Task | Status |
|---|---|---|
| S180-1 | WP1 Pre-Flight in `deploy-all`/`redeploy`: checkov + `deploy/scan/checks`, Default-deny bei CRITICAL, **3 benannte Ausnahmen** (siem, tetragon, threat-responder) | [x] done — `src/scripts/checkov-preflight.sh` + `deploy/ansible-runner/Dockerfile` (jq, checkov), `Makefile` (CHECKOV_PREFLIGHT + CHECKOV_PREFLIGHT_REDEPLOY), Ausnahmen dokumentiert · **Nachtrag 4.10.: der Pre-Flight ist in sich defekt und blockiert jeden Redeploy — siehe S180-1b** |
| S180-1b | **S180-1 Pre-Flight macht JEDEN `make redeploy`/`deploy-all` rot (rc=2), bevor `record-deploy.sh` überhaupt läuft** — erster Live-Einsatz 4.10.: `BACKEND_RC=2`, `FRONTEND_RC=2`, während Ansible selbst sauber ist (RECAP `superleo ok=12 changed=4 failed=0` backend, `ok=10 changed=3 failed=0` frontend). **Drei gemessene Ursachen** in `src/scripts/checkov-preflight.sh`: (1) **`--check-file` ist kein checkov-Flag** (gültig wäre `--external-checks-dir`) → checkov gibt usage aus und endet mit **exit 2** → exakt unser `make: *** [Makefile:371: redeploy] Fehler 2`; (2) die `find`-Liste zieht die Scan-Fixtures `deploy/scan/testdata/clean/` und `deploy/scan/testdata/vulnerable/` mit, als wären es Services (9 statt 7) — daher die selbstwidersprüchlichen Zeilen „[checkov-preflight] Scanning clean..." → „❌ clean: CRITICAL findings detected"; (3) `jq -e` mit dem Filter `length > 0` auf `.results.failed_checks` ist **logisch invertiert** (ein sauberer Scan ergibt `false` → `jq -e` exit 1 → `!` landet im ❌-Zweig), und `set -euo pipefail` rafft den Lauf in der zweiten `checkov`-und-`jq`-Pipeline ab, sodass „FAIL: …" bzw. „✅ All scans passed" nie kommen. **Folge: seit `d1dc20e7` kein einziger automatischer Deploy-Record mehr** (das Rezept bricht vor `record-deploy.sh` ab) — beide Deploys 4.10. manuell nachgetragen: `record-deploy.sh superleo backend` und `… frontend` mit `0 4be2614e` → `RC=0`, Service-Ids 1/18. Service-Verifikation trotzdem grün: `/api/nodes/services`, `/api/dns/zones`, `/api/projects/1/containers`, `/api/projects/1/terminal` → je **401** (Gateway antwortet ehrlich, kein 404), `GET /` → 200, `GET /projects/1/terminal` → 200, Backend-Image 10:38, `ProjectTerminalPage.tsx` im Frontend-Container 10:37. **Anlass (verbatim):** „von der anderen session auf dem laptop, kannst du dann alles pullen und deployen damit dann bei mir alles funkioniert mit dns und der ganze netowrking kram uswß??" · „ok alles committen pr machen und weiter". Fix offen — Datei stammt aus `d1dc20e7` (fremde Session), Zuweisung offen | [x] done — **gefixt von dieser Session** (Operator 4.10. wörtlich: „Ich fixe ihn jetzt") in `src/scripts/checkov-preflight.sh`: `--external-checks-dir` statt des nicht existierenden `--check-file`, `find -not -path '*/scan/testdata/*'` (7 statt 9 Files), und statt dem invertierten `jq -e`-Zustand jetzt explizit `failed_count` aus `.results.failed_checks`, bei unparsebarem Output ehrlich exit 2 statt stiller Durchwinkerei. **Verifikation 4.10.:** `bash -n` → `BASHN_RC=0` · Positivlauf am echten `deploy/` → `POS_RC=0` („✅ All scans passed", 3 Ausnahmen, scan/grafana/ozone/datalake je clean) · **Negativlauf** mit `testdata/vulnerable` als Service → `NEG_RC=1`, 6 echte Funde (CKV_JIMESH_COMPOSE_1/2/3/4: privileged, Docker-Socket, offene Ports, Host-Namespace) — der Default-Deny greift also weiterhin · End-to-End `make redeploy SERVICE=backend NODE=superleo` → **`REDEPLOY_RC=0`** (vorher 2), Ansible `ok=12 changed=4 failed=0`, und der Deploy-Record kam wieder **von selbst**: `record-deploy: recorded 'backend' (rc=0, gitSha=b5af9d52, source=cli)` |
| S180-2 | WP2 `install_gvisor: true` für superleo **+** `deploy-all` reicht `-e install_gvisor` durch (Makefile-Lücke, bisher nur `provision-node`) | [x] done — `Makefile:304` `-e "install_gvisor=$(or $(GVISOR),false)"` im Container-Zweig; lokaler Zweig hatte es schon |
| S180-3 | WP2 `daemon.json` für `runsc` — **ohne** `--file-access-mounts=exclusive` (Z.110 Data-Corruption) und **ohne** `--overlay2` auf dem Shared-Mount (Z.11 bricht Teilen); Doku-Widerspruch Z.65 vs Z.84 gegen `g3doc/user_guide/filesystem.md` klären | [ ] offen |
| S180-4 | WP2 GPU-Befund festhalten: 8 GiB (8151 MiB) nicht 16; `--gpus all` → `AMD CDI spec not found`; `--device nvidia.com/gpu=all` funktioniert; CDI-Spec unter `/var/run/cdi/nvidia.yaml` | [ ] offen |
| S180-5 | WP3 neuer Mandat-Block: `cap_drop:[ALL]`, `no-new-privileges`, Nicht-Root, `read_only`, kein docker.sock/`pid: host` — Ausnahme nur mit benannter Begründung | [ ] offen |
| S180-6 | WP4 Shared-Pfad per Bind-Mount (`/srv/jimesh/<ws>`, keine Partitionierung — 842 G frei), gVisor-Regeln `shared`-Default beibehalten | [ ] offen |
| S180-7 | WP4 **zwei** Filebrowser-Arten: Container-FS = echtes `filebrowser`, S3 = MinIO Console/`rclone serve` (**nicht** filebrowser auf s3fs) | [ ] offen |
| S180-8 | WP4 GPU-Python-Container unter `runsc`, Nicht-Root, `cap_drop ALL`, Shared-Mount, GPU via `--device nvidia.com/gpu=all` | [ ] offen |
| S180-9 | WP4 **Operator-Entscheidung offen:** läuft CUDA unter gVisor? Gegen die echte 5060 Ti testen, bevor der Stack sich darauf abstützt | [ ] offen |
| S180-10 | WP5 Overview: frontend + beide Filebrowser immer mitführen (abhängig von S180-7) | [ ] offen |
| S180-11 | Escape-Audit als Bestand festhalten: siem `privileged`+docker.sock+`user:"0:0"`, tetragon `pid:host`+`privileged`, threat-responder docker.sock; `cap_drop`/`no-new-privileges`/`read_only` fehlen in **keinem** Compose — Lücke, keine Absicht | [x] done |
| S180-12 | WP6 conn=local-Vollständigkeit: `bash`+`openssl`+`curl` ins Runner-Image (live gefangen: rc=2 bei postgres, `curl` nicht gefunden bei keycloak) | [x] done |
| S180-13 | WP6 `LOCAL_NET=--network host` wenn ein Inventory-Ziel `ansible_connection=local` — sonst scheitert jeder `127.0.0.1`-Probe am Runner-Loopback, obwohl der Dienst auf dem Host antwortet (`NET=` bleibt Master) | [x] done |
| S180-14 | WP6 **Entscheidung getroffen (Ausführung offen):** Host-Werkzeuge unter conn=local — `apt` (suricata), `systemctl` (falco/threat-responder), `tetra` (tetragon), `runsc` (falco/provision-node). **Nicht per Package im Alpine-Container lösbar.** Beschlossener Weg: **kein SSH** (superleo hat keinen sshd, Operator: „wenn local ist dann brauchen wir auch kein ssh"), sondern **lokal ausführen** — dann laufen Werkzeuge direkt auf dem Host. Offen: erst der Lauf auf superleo | [~] in Arbeit |
| S180-15 | WP6/`runsc install` unter conn=local schreibe in den flüchtigen Container → **blockiert WP2** (`install_gvisor: true`), solange S180-14 offen ist | [ ] offen |
| S180-16 | WP7 **Secret-Rotation:** `JIMESH_POSTGRES_PASSWORD` wurde in dieser Sitzung statt der Länge ausgegeben → Wert im Log. Rotieren (DB `ALTER USER` + beide `.env`) | [ ] offen |
| S180-17 | WP7 `.env` podhead↔superleo abgleichen: 75 identisch, 12 nur podhead (`HEADSCALE2_*`, `SUPERLEO_{HOST,SSH_PORT,USER}`, `TRADING_*`). Unter `conn: local` auf superleo unbelegt und wirkungslos — prüfen, ob `client2-join`/`client2-ca-fetch` künftig von superleo laufen sollen | [ ] offen |
| S180-18 | WP6 **Forecast/Strategie entschieden:** `PLATFORM_SERVICES` (6) fahren unter conn=local durch; die 8 `node-services` sind host-level und brächen im Runner (tetragon → falco → suricata). Statt „node-Services per SSH": **WP8 lokaler Controller ohne Container und ohne SSH** — Plan steht im Sprint (WP8a/b/c) | [x] done |
| S180-19 | WP8 Umsetzung: `setup-local-controller.sh` + Makeziel `controller-setup` + `LOCAL_TARGETS`-Zweig in `redeploy` und `deploy-all` (Playbook läuft direkt, `.env` zeilenweise exportiert) + 5× `controller_env_file`. **Code steht; Verifikation auf superleo ausstehend** (`git pull`, `make controller-setup`, Akzeptanz `make redeploy SERVICE=postgres NODE=superleo` ohne `docker run`) | [~] in Arbeit |
| S180-20 | `make help` repariert: zeigte alle 32 Ziele als `Makefile` (grep liest seit `include .env` zwei Dateien → Präfix, mawks `FS` hängt daran) → `grep -Eh` | [x] done |
| S180-21 | **Git-Credentials für root (become:true):** `backend`/`frontend`/`siem`/`datalake` klonen per HTTPS, beide Repos privat, aber die Task läuft als root ohne Helper → `could not read Username`. Auf superleo per Hand gelöst (`GH_CONFIG_DIR` auf superleos gh). **Reproduzierbar machen:** in `provision-node`/`setup-local-controller.sh` aufnehmen, sonst bricht es auf jedem frischen Knoten wieder | [ ] offen |
| S180-22 | WP6 **siem-Indexer-Boot-Defekt (live, 3.10.)** — `Unable to read …/config/certs/root-ca.pem`, Restart-Loop. Zwei Ursachen in *einer* Task (`ansible-task.yml` alter Z.166): `recurse:true`+`state:directory` setzte die **Datei**-Modi auf das **Verzeichnis** (`dr--------`, für niemanden betretbar), und **kein `owner`** → unter `become:true` PKI `root:root`, während `wazuh-indexer`/`wazuh-dashboard` **uid 1000** laufen (gemessen, 4.7.2) — der alte Kommentar „wazuh containers run as root" stimmt nur für den Manager. Fix: Verzeichnisse `0700/0750` **mit** `+x`, Dateien `0400/0640`, alles `owner:1000` über `siem_wazuh_uid` | [x] done |

## Sprint-Spiegel S179 (conn=local + die Deploy-Blocker, 1.10.2026 — docs/sprints/SPRINT-179-CONN-LOCAL-AND-DEPLOY-BLOCKERS.md)

**Anlass:** `make deploy-all` brach mehrfach vor `frontend` ab, Operator-Order
„super leo ist das neue total control plane mit allen services" / „können wir nicht die beiden
Hauptfamilien supporten auch mit if else?". Vier echte Bugs (nicht Workarounds) + `conn=local`
machbar gemacht. Plan im Sprint-File, Verifikation mit echten Befehlen dort dokumentiert.

| Nr | Task | Status |
|---|---|---|
| S179-1 | WP1a `lineinfile` `EBUSY` auf Single-File-Bind-Mount → `unsafe_writes` (postgres/keycloak/router-bootstrap) | [x] done |
| S179-2 | WP1b awk schrieb in leere Node-`.env` (0 Bytes, rc=0) → `END`-Block; 3 Stellen (postgres/keycloak/grafana) | [x] done |
| S179-3 | WP1c `default('127.0.0.1')` greift bei `''` nicht → iptables `IndexError` → `default(..., true)` (keycloak/traefik/backend) | [x] done |
| S179-4 | WP1d `services:` von trading → superleo byte-identisch übernommen | [x] done |
| S179-5 | WP2 OS-Familien if/else in `provision-node.yml` (Debian→Role, Alpine→apk), Guard gated auf `not docker_already_present`, gVisor-Failclosed, ehrlicher Report | [x] done |
| S179-6 | WP3 `conn=local` real: `docker.sock`+`/opt/jimesh`-Mounts (`LOCAL_MOUNTS`), `docker-cli`+`sudo` im Runner-Image | [x] done |
| S179-7 | Sprint-File + Backlog-Spiegel | [x] done |
| S179-8 | `make deploy-all` von podhead zu Ende bringen (backend → frontend → 7 Node-Services); letzter Lauf brach an `Logged out` von podheads Tailscale ab, nicht am Code | [ ] offen |
| S179-9 | `SUPERLEO_CONN=local` gegen den echten superleo-Host durchziehen (bisher nur „Runner selbst als Ziel"-Test) | [ ] offen |
| S179-10 | `record-deploy` auto-mint schlägt fehl, solange kein Keycloak `:8081`/Backend `:19091` lokal läuft — Deploy-Record fehlt, nicht blockierend | [ ] offen |

## Sprint-Spiegel S178 (Safe Local LLM + abgesicherter Chatbot, 1.10.2026 — docs/sprints/SPRINT-178-SAFE-LOCAL-LLM-CHATBOT.md)

Operator-Order (verbatim) steht komplett im Sprint-File. **Anlass: Abmahnung („Tutario-Inzident")
wegen Tests des alten Chatbots auf fremder Seite** → Chatbot-Neuentwurf, sicher, plus Local-LLM
auf CUDA ohne offene Ports, Vercel-Subpage mit eigener `robots.txt`, Cloudflare als einziger
öffentlicher Pfad (WAF/OWASP + Rate-Limit + Turnstile), stateless Rate-Limit über JWT-TTL +
HMAC-IP (kein Server-Speicher, CRM-taugliches Format), Safety-Gate + algorithmischer
Grauzonen-Chatbot, reactive/proactive Widgets. **Nur Plan — kein Code, kein Deploy.**

| Nr | Task | Status |
|---|---|---|
| S178-0 | WP0 Recherche/Entscheidung: CUDA-Node + Modell/Quantisierung, Safety-Gate (LlamaGuard vs. Decision-/Eval-Modell), Cloudflare-Plan, Domain der Subpage | [ ] offen — braucht Operator-Entscheidung (6 offene Punkte im Sprint-File) |
| S178-1 | WP1 Local-LLM-Stack (GPU-Container, Bind nur `127.0.0.1`/Tailnet, **kein** publish-Port, Healthcheck) | [ ] offen |
| S178-2 | WP2 Gateway-Policy: JWT-Issuer/Prüfung, TTL-basiertes Rate-Limit (Blacklist ohne Server-State), HMAC-IP-Identität, Quota-Tiers Gast/Google | [ ] offen |
| S178-3 | WP3 Vercel-Subpage `/chat` mit eigener `robots.txt` (`Disallow`) + `X-Robots-Tag`; Hauptseite unverändert SEO | [ ] offen |
| S178-4 | WP4 Cloudflare: OWASP-WAF, Rate-Limiting-Rules, Turnstile, Tunnel — einziger öffentlicher Pfad | [ ] offen |
| S178-5 | WP5 Widgets (reactive + proactive) + algorithmischer Grauzonen-Chatbot | [ ] offen |
| S178-6 | WP6 Safety-Gate vor/nach Inferenz, CRM-/Analyse-Log-Format | [ ] offen |
| S178-7 | WP7 Doku-Mandat + Testkatalog (harte Regel: **kein Test auf fremden Domains**) | [ ] offen |

## Sprint-Spiegel S177 (Paranoia-Level-Alarmierung + SSH-Traces + Log-Neuplanung, 1.10.2026 — docs/sprints/SPRINT-177-PARANOIA-LEVEL-ALERTING.md)

Operator-Order (verbatim) steht komplett im Sprint-File. Fünf Anforderungen: Zero-Trust-SSH-Traces,
Paranoia-Level für Alarme, SSH-Alarmstufen je nach Sicherheitslevel, Exception-Registry (Kontext wie
Cloudflare Tunnel/WAF), Log-Neuplanung + Datadog-Recherche. **Nur Plan/Recherche — kein Code, kein Deploy.**

| Nr | Task | Status |
|---|---|---|
| S177-0 | Recherche Severity-Modelle (OWASP CRS PL1–PL4, Wazuh 0–16, Suricata severity, ECS/Datadog 1–5, Grafana/Loki, OCSF) → `docs/research/PARANOIA-LEVEL-MODEL.md` + Entscheidungsvorlage | [x] done (Recherche liegt vor; **Entscheidung offen → S177-8**) |
| S177-1 | Log-Bestandsaufnahme aller Quellen + Retention + Lücken → Log-Neuplanung | [ ] offen |
| S177-2 | Paranoia-Level-Datenmodell + Policy-Schicht (P1–P4, Global-Default, User/Node/Port-Override-Reihenfolge) | [ ] offen |
| S177-3 | SSH-Trace-Pipeline (User, Quelle, Auth-Status, RBAC-Zuordnung; Nicht-Auth/kein-RBAC → stufenabhängiger Alarm) | [ ] offen |
| S177-4 | Exception-Registry mit Kontext (Tunnel/WAF/Peer) statt Global-Aus | [ ] offen |
| S177-5 | Routing in die bestehenden Notification-Settings (kein zweites Kanalsystem) | [ ] offen |
| S177-6 | UI: Paranoia-Level-Regler + Alarm-Preview + Exceptions | [ ] offen |
| S177-7 | MANDATES-Eintrag „SSH-Stufen je nach Sicherheitslevel", sobald das Modell steht (Case: diese Order) | [ ] offen |
| S177-8 | **Operator-Entscheidung** über das Paranoia-Modell (6 offene Punkte aus `docs/research/PARANOIA-LEVEL-MODEL.md`); S177-1..7 bleiben bis dahin gestoppt | [ ] offen (Operator) |

## Sprint-Spiegel S176 (Zweite Control-Node superleo + 2. Client, 1.10.2026 — docs/sprints/SPRINT-176-SECOND-CONTROL-NODE-SUPERLEO.md)

Operator-Order (verbatim): *"wir wollen eine 2. control node auf einem anderen server deployen … unterschiedliche subnet"* / *"also haben wir quasi 2 localhost hosts aber mit nem if in ansible dann haben wir ne gemeinsame codebase und können von beiden seiten aus deployen"* / *"drüben deployen wir den controlplane und hier den client also dann schreib im deployment die sachen um und kopiere es"*. **Nur Code/Deploy-Umbau — kein Deploy ausgeführt.**

| Nr | Task | Status |
|---|---|---|
| S176-1 | `render-inventory.py`: `conn: local\|ssh` pro Node → `ansible_connection=local` (gleiche config.yml auf beiden Maschinen, jeder deployt zu sich selbst) | [x] erledigt (`py_compile` grün) |
| S176-2 | `config.yml`: Node `superleo` (role control_plane, `headscale: true`, alle Werte `${SUPERLEO_*}` — nie literal) | [x] erledigt (YAML valide, 3 Nodes) |
| S176-3 | Prefix-/Base-Domain-Parameterisierung (`config.yaml.j2` + `defaults.yml` via `*_override`-Muster) — Defaults = alte Werte, trading rendert byte-identisch, **kein Headscale-Neustart** | [x] erledigt |
| S176-4 | `client-join.sh` parametrisierbar (Container/State/CA/Hostname/Dash-Port/Auto-Forward) — Defaults unverändert, `make client-join` identisch | [x] erledigt (`bash -n` grün; beim Nachziehen 5 Lücken gefunden und geschlossen: `-p`-Port, CA-Mount, Hostname, falscher `.env`-Fallback, CA-Check nach `up` verschoben, Auto-Forward-Gate) |
| S176-5 | Makefile `client2-join/-status/-down/-exec/-dashboard/-ca-fetch` + `.env`/`.env.example` (`SUPERLEO_*`, `HEADSCALE2_*`) | [x] erledigt — `make render-inventory` zeigt `3 node(s), 0 skipped`; superleo-Zeile mit allen `*_override`, trading-Zeile unverändert |
| S176-6 | Doku-Mandat (Handoff-Nachzug) + Delta-rsync nach superleo | [x] erledigt — Sprint-File (Umsetzungsstand + Nachweis) und Backlog gespiegelt, 2,35 GB / 53.172 Dateien kopiert, Delta-Verifikation 0 zu übertragen |
| S176-7 | Bewusst OFFEN (Operator-Bestätigung): Deploy nach superleo, Preauth-Key, CA-Fetch für Client2, 2. Client live, Gleichzeitigkeitstest alt+neu | [ ] offen — **4 von 5 erledigt** (Stand 4.10., Nachweis `docs/sprints/HANDOFF-2026-10-04-SUPERLEO-PROMPTS.md` §2): Deploy nach superleo ✓ (`https://100.127.129.65:443/health` → 200), CA-Fetch ✓ (`deploy/cp/headscale/tls-ca/jimesh-superleo.crt`, 4.10. 08:35, CN=`jimesh-headscale`, gültig bis 28.9.2036), 2. Client live ✓ (`jimesh-client2` läuft seit 4.10. 04:32Z, Interface `ts-jimesh` mit `10.80.0.1/32` aus dem neuen Pool), Preauth-Key **nicht mehr leer** ⚠ (`.env:249`), aber podhead 88 Zeichen vs. superleo 29 Zeichen — **unterschiedliche Werte, ungeklärt welcher gültig ist** (nur Längen verglichen, kein Wert ausgegeben). **Offen bleibt allein der Gleichzeitigkeitstest**: von podhead aus nicht durchführbar, solange der socat-Forward tot ist (`100.64.0.6:8090` und `localhost:8090` ohne Antwort, siehe `docs/DEPLOYMENT-URLS-2026-09-19.md` Failure-Mode) — **nicht gescheitert, nur nicht ausführbar** |

## Offene Anträge (Operator, 1.10.2026)

| Nr | Antrag (Operator, verbatim) | Status |
|---|---|---|
| A-1 | *"wir sollten vllt ein zusatz paket bei jimesh mitliefern ds clients über suricata und ebpg wenn sie linux benutzen direkt mitgeschützt werden und gemonitored werden und der ssh zugrifff auf dem host über dei jimesh user und x authentication header auch direkt cool ist und warnungen geben wenn jemand unauthorisiertes daten zieht oder halt kein known jimesh user ist"* — Zusatzpaket „Client-Hardening": Suricata + eBPF (Falco/Tetragon) Pflicht auf Linux-Clients, SSH nur über `jimesh`-User + X-Auth-Header, Alerts bei unbekanntem User / Datenzugriff | [ ] offen — Bau des Backend-Gegenteils existiert teilweise (`deploy/suricata-network-ids` gated, `deploy/tetragon`, `deploy/falco-gvisor-integration`, SIEM-Alerts); **nichts davon läuft jemals auf einem Client**; Voraussetzung P0 = headscale-ACLs (`policy: mode: disabled` → jeder auth-Node sieht alles) |
| A-2 | ebenda: *"das nervt dass wir das jetzt erst selber bauen müssen oder unser eigenes teleport"* — Bewertung: Transport-Zero-Trust existiert (Tailscale), fehlend sind **ACLs, pro-User-SSH-Identität + Session-Recording, Egress-Alerting**. Teleport nicht einbauen, die drei Lücken schließen | [ ] offen — vor Bau: Sprint-File mit Plan (nutzt bestehendes Keycloak-Identity + Suricata/Falco-Stack, kein neues Produkt) |

## Sprint-Spiegel S175 (Hygiene-/Slop-Runde ohne Deploy, 1.10.2026 — docs/sprints/SPRINT-175-HYGIENE-SLOP-ROUNDE.md)

Operator-Order (verbatim): *"nicht deployen, aber den rest schon mal fixen"* + *"hast du auch devdocs gelesen?"*. Work-Pakete gegen `WORKTREE-AUDIT-2026-09-28.md` / `THREE-WEEK-AUDIT-2026-09-29.md` / `docs_dev/`. Verifikation OHNE Stack (bewusst kein `make up`/`restart-backend`, `make go-test` wegen ~80 % SKIP ohne Postgres nicht gelaufen): go vet+build grün, `go test ./internal/network/... ./internal/deploy/...` ok, vitest 61 Dateien/493 Tests, check:i18n 60/3305, lint 443/415 = exakt Basis, tsc 0 in den geänderten Dateien, API_DOCS-Route-Maschinencheck 101/101 (**Nachtrag 1.10.: ehrlich 100/101 — `GET /openapi.json` fehlte, nachgetragen, Neulauf 106/106**).

| Nr | Task | Status |
|---|---|---|
| S175-1 | Team-Bindings-Panel: echte Add-/Delete-Aktionen (POST/DELETE `/api/team-bindings`), entpackter `{success,bindings,count}`-Query-Bug, `bindingsRouteMissing`-Claim-Key aus 60 Locales, 4 Tests inkl. Live-POST-Assertion | [x] erledigt (lokal grün; gegen echte DB erst live prüfen) |
| S175-2 | Container-Logs-SSE endlich funktionsfähig: Backend `data:`-Frames waren invalides JSON (`json.Marshal` statt barem `Fprintf`), Frontend echter SSE-Reader statt JSON-Poll (fand vorher nie), key-basierter Stream-State (kein setState im Effect-Body), i18n `logsEmpty*` auf ehrlichen Leerzustand | [x] erledigt (lokal grün; Live-Stream erst mit Stack prüfbar) |
| S175-3 | Mandat-15-Guard `Array.isArray(res.events)` in SecurityEventsPage (S172-Pmap-Klasse) | [x] erledigt |
| S175-4 | `vlan.go`: `&&`-Ketten-Bug (POSIX `set -e`-Ausnahme ließ fehlgeschlagenes `ip link add` als Erfolg durch) aus Ref `2808825` wiederhergestellt + 2 Regressionssassertions | [x] erledigt (network-Suite grün; am echten Node erst live) |
| S175-5 | Doku-Mandat 1: API_DOCS auf 101/101 Routen angeglichen (`/ready`-Korrektur, `/api/nodes/health`, neue Dashboards- und Security-/Notification-Sektion), BACKLOG S150–S157-Altstände, Sprint-Mirrors S153/S156, MANDATES Doppel-`## 13` → OKF=§16 | [x] erledigt |
| S175-6 | Toten Code raus: `lib/deployed-services.ts` (0 Importe), 19× `*.test.*.bak`, i18n-Key `nav.llmProxy` (0 Referenzen) | [x] erledigt |
| S175-7 | `docs_dev/` gelesen (gitignored Altbestand): gemeldete Theater-Kritik (`ProxyChainsPage` fake-healthy, `AgentSessionDetailPage` hardcoded, `NetworkEditingGrid`) ist am HEUTEN Stand bereits erledigt/bzw. aus dem Tree; `docs_dev/backlog/BACKLOG.md` bewusst NICHT aktualisiert | [x] geprüft (nichts zu tun) |
| S175-8 | Bewusst offen → Operator/Deploy: Live-Bestätigung Bindings+SSE+VLAN, S167-P2, S159-6/-7 Live-E2E, Git-History-Scrub, 6 Stashes (nur gemeldet), oteltrace-OTLP-Phase 2, `capabilities.rego`-Durchsetzung | [ ] offen (nicht Teil „nicht deployen") |

## Sprint-Spiegel S159 (Chromium-Plugin-Renderer, Nacht 29./30.9. — docs/sprints/SPRINT-159-CHROMIUM-PLUGIN-RENDERER.md)

Operator-Order (verbatim): "CHROMIUM WAR DAFÜR GEDACHT DIE GANZEN WEBSITES STATT IFRAME DIREKT IM FRONTEND ZU RENDERN". Generische Mechanik: echte Chromium-Engine pro Plugin-Session auf dem SSH-Node (m1k1o/neko:chromium, WebRTC-Stream + binärer DataChannel für Maus/Tastatur), kein iframe. Von Build-Agent fertiggestellt; die Session starb 30.9. 07:12 an der Quota VOR dem Commit — Arbeit uncommitted im Tree aufgefunden, von der Folge-Session Parent-verifiziert und gesichert (make go-build/vet grün, tsc 471=Baseline/0 in S159-Dateien, vitest 57 Dateien/464 Tests, check:i18n 60 Locales/3307 Keys).

| Nr | Task | Status |
|---|---|---|
| S159-1 | Store: plugin_renderer_sessions-Tabelle + CRUD + Migrations-Wiring | [x] erledigt |
| S159-2 | Backend: Session-Lifecycle (synchron), Chromium-Deploy-Script, In-Memory-Secrets, WS-Ticket, generischer SSH-Tunnel-Proxy | [x] erledigt |
| S159-3 | network.Pool: GetReverseProxyGeneric + HTTPClientVia | [x] erledigt |
| S159-4 | Frontend: ChromiumPluginRenderer (echter WebRTC-Client) + Renderer-Tab im AppPanelDrawer | [x] erledigt |
| S159-5 | i18n: 19 neue Keys × 60 Locales | [x] erledigt |
| S159-6 | End-to-End gegen echten SSH-Node + echten Browser | [ ] offen (Code+Protokoll verifiziert, NICHT live behauptet — Mandat 2) |
| S159-7 | Full-Version-Gaps: VLAN-Isolation, Restart-Recovery (Vault-Secret-Ref), Session-Pool/Wiederverwendung, Multi-Peer, volle Tastatur, Navigations-UI | [ ] offen (Details im Sprint-File) |

## Agent-Welle 30.9. (6 Subagents, SPRINT-161 bis SPRINT-166)

Nächste Arbeitspakete aus Handoff + SPRINT-160-Auftrag, vergeben an 6 Subagents (Parent verifiziert+committet je Agent). SPRINT-165 startet nach Fertigstellung von SPRINT-164 (beide berühren HierarchySidebar.tsx — Kollisionsvermeidung).

| Nr | Task | Status |
|---|---|---|
| S161 | Vault-Secret-Hardening: Root-Token-Fallback (Known-Dev-Literal, hier redigiert) entfernen — vault_client.go fail-closed, beide defaults.yml ohne Default, beide ansible-task.yml fail-Guards, local-stack.sh require_vault_root_token(), 3 Docs redigiert + Operator-Rotations-Runbook — P0 laut Handoff | [x] erledigt (30.9. gesichert; echte Rotation = Operator-Runbook im Sprint-Doc offen; API_DOCS:1202-Redaktion folgt mit S163) |
| S162 | SIEM-Deploy-Blocker: gen-certs.sh-REWRITE (9-File-Idempotenz, Prereq-Fails, Rollback, Post-Install-Verify) + Re-Stat-Hard-Fail + Falco-gVisor Varianten-Detektion (0.41.3 = engine-config-keys, am echten Binary verifiziert) + runsc-Binary/RW-Socket//moby-Root-Fixes | [x] erledigt (30.9. gesichert; Trading-Deploy = Operator: siem → falco-gvisor → deploy-all; /moby-Root + Engine-Wechsel-Semantik als Offen-Items im Sprint-Doc) |
| S163 | RM25/S153-7: echte jimesh-Backend-Routen fürs meshsquad-Plugin (pluginBackendRoutes["meshsquad"] leer → installable=false → Entry/Gate ausgegraut) | [x] erledigt (1.10. gesichert; 3 echte Lifecycle-Routen gateway/meshsquad.go — status=echte Rows, health=REALER Probe mit statusCode/durationMs, uninstall mit Closed-Set+Vault-Cleanup; pluginBackendRoutes synchron → Katalog leitet installable=true AB; Store GetPluginInstallationByID/DeletePluginInstallation + ErrPluginInstallationNotFound; Wizard repariert (crewApiUrl statt mcpUrl/apiKey, authMode service_account); API_DOCS: +29 Z. mit neuer MeshSquad-Sektion; Verifikation OHNE Stack: go build/vet 0, gateway+store grün (meshsquad 3 PASS, E2E ehrlich SKIP ohne Postgres), vitest 61/493 + S163-Suiten 9/9, tsc 414/0 in S163-Dateien, check-i18n 60/3307) |
| S164 | SPRINT-160-WP1 Responsive Shell: Sidebar-Drawer unter lg + Standard-Tier max-w-7xl statt 6xl (Operator: "DAS HAUPT PANEL IN DER MITTE … so schmal") | [x] erledigt (30.9. gesichert; 375px-Live-Check offen bis Stack-Start; 2 i18n-Keys → S165) |
| S165 | SPRINT-160-WP3 AI-Sektion in der Sidebar: Chat + 8×LLM-Proxy + MeshSquad + Workers/Serverless-Kategorie (ehrlicher Empty-State, Research-Verweis) — OHNE Agent-Builder-Eintrag (Operator: MeshSquad bekommt eigenes Frontend; Python/Go-Thema nächste Welle); übernimmt auch S164s 2 i18n-Handoff-Keys | [x] erledigt (1.10. gesichert; AI-Gruppe mit 13 items = 2 Chat + 6 Proxy + 5 /models — die Models-Familie bekommt ihren ERSTEN Nav-Eintrag, Mandat-14-Lücke zu; Workers = ehrlicher Empty-State ohne Link; 60 Locales: +3 Keys, 5 ungenutzte entfernt, check-i18n 60/3307 netto 0; Verifikation OHNE lokalen Stack (Operator: "nicht lokal deployen"): tsc 414/0 in S165-Dateien, vitest 61 Dateien/493 Tests, Backlog-Spiegel hier) |
| S166 | S156-9: ProjectDetailPage IaC-Tab Mock-Daten entfernen (Mandat-2-Verstoß) — echte /iac-files-Wiring, ehrliche Empty-/Error-/Unsupported-States, 6 Tests, tsc −57 | [x] erledigt (30.9. gesichert; fehlende Deploy-Engine-Routen als Offen-Items im Sprint-Doc, nächste Welle) |
| S167 | Auto-generierte Service-Secrets statt Known-Defaults (DBs/Redis u.a., Operator 30.9.: "generiert werden wenn der user nicht explizit eins angibt"; User-Credentials bei Existing-DB-Reuse gewinnen immer) — SPRINT-167-AUTO-GENERATED-SERVICE-SECRETS.md | [~] PHASE 1 fertig 1.10. gesichert (deploy/postgres + deploy/keycloak + deploy/grafana: einheitliche Matrix User-Wert > gespeicherter Node-.env-Wert > openssl rand auf frischem Ziel > LAUTER Fail; no_log-Resolution, Controller-.env-Sync, Realm-JSON ohne Secret-Literale, Grafana-Compose `:?`-Pflicht statt Known-Default, LIVE-Verifikationen in den Tasks [psql-Auth, Login-Probe, kcadm]); statisch verifiziert OHNE Deploy: 7× YAML OK, ansible --syntax-check 3× rc=0 im jimesh-ansible-runner:local, bash -n über 32 Snippets ok, 0 Known-Default in Wertposition, Baselines grün (go build/vet 0, tsc 414, vitest 61/493, i18n 60/3307); PHASE 2 OFFEN: deploy/backend, deploy/siem, deploy/vault, local-stack/.env.example, Redis requirepass, Backups-Bootstrap + Live-Redeploy auf trading = Operator |
| S168 | Threat-Detection-Crash-Fix: "t.correlated is null" (SIEM jetzt live → echte Rows → Panel crasht) — Backend-Always-Array + Frontend-Guard + Wire-Contract-Regressionstests; Mandat 15 (JSON-Listen nie null) daraus abgeleitet | [x] erledigt (30.9. gesichert; Live-Bestätigung auf laufendem Backend = Operator-Schritt: restart + jq .correlated → []; API_DOCS-Wire-Satz folgt mit S163) |
| S169 | Auto-Mint der Deploy-Consumer-Keys (JIMESH_SIEM_SERVICE_KEY, JIMESH_DEPLOY_RECORD_KEY) — Operator-Order 30.9. verbatim: "ICH HABE GESAGT DIESE KEYS SOLLEN AUTOMATISCH ERZEUGT WERDEN": Mint über das ECHTE Admin-API mit vorhandener Admin-Auth, Auto-Append an lokale + Node-.env, Default-Attribution platform-internal, ehrliches Fail nur wenn gar keine Admin-Auth existiert — SPRINT-169-AUTO-MINT-SERVICE-KEYS.md | [x] erledigt (1.10. gesichert; mint-service-key.sh 365 Z. [Auth-Kette JIMESH_ADMIN_TOKEN→ROPC, Mint via POST /api/consumer-keys, Plaintext nur 0600-Tempfile→Ziel, Idempotenz, Injection-Guards] + record-deploy.sh Auto-Mint-Block + ensure-siem-service-key.sh 139 Z. [Node-Facts aus .rendered.ini, gleiche Presence-Semantik wie der siem-Task] + Makefile-Hook nur für SERVICE=siem mit || true; VERIFIZIERT ohne Stack: bash -n auf allen 3 OK, make -n redeploy zeigt den Vor-Schritt, 0 Key-Wert im Codepfad (nur Variablennamen geloggt); OFFEN = Operator-Live-Mint O-1/O-4/O-5 + shellcheck nicht installiert |
| S170 | Files→S3-Rename + VS-Code-Sidebar-Reiter + neuer "Files"-Reiter als CONTAINER-Filebrowser + IMMER ein Haupt-Shared-Workspace bei jedem Projekt-Create (Utility-Files, optional Git-Repo, Notes-Deployment-Frage geklärt: Obsidian proprietär → Logseq als Open-Source-Fit) — SPRINT-170-S3-VSCODE-CONTAINER-FILES-SHARED-WORKSPACE.md | [ ] geplant (startet nach S163+S165; NACHTRAG: EIN Utility-Container pro Projekt mit code-server+Notes+(optional Claude-CLI/n8n als Prozesse, Supervisord-Muster) + Git Graph (MIT) als .vsix, GitLens abgelehnt) **NACHTRAG 4.10. (diese Session): die Utility-Container-Hälfte ist gebaut und deployed** — S170-1 `[x]`, S170-3 `[x]`, S170-2 `[~]` (S3-/Host-Mount fehlt, Parkfrage §13/1 steht), S170-7 `[ ]` blockiert auf S180 WP2 (`runsc` fehlt am Node, gemessen); `make redeploy SERVICE=utility-container NODE=superleo` zweimal `SLICE_C_RC=0` (`ok=16 changed=7 failed=0`), Record id=20 automatisch mit `gitSha=c7184ffa`. Diese Zeile bleibt offen, weil sie die ZWEITE Linie beschreibt (S3-Rename, VS-Code-Reiter, Container-Filebrowser, Shared-Workspace-Create, Notes = WP1..WP6 des zweiten S170-Docs) — die liegt ungeteilt weiter, nicht bei dieser Session |
| S171 | Post-Onboarding-Projekt-Wizard ("Projekt erstellen?, darf leer sein") + Plugin-/Service-Auswahl im Onboarding (Git optional, Dash-Deployment, Worker, n8n-Server, Notes) + Jira-artige Projekt-Presets (Design/Dev/Marketing) + kontextuelle Sidebar (Unnötiges ausblenden, später freischaltbar) — SPRINT-171-ONBOARDING-PRESETS-DYNAMIC-SIDEBAR-N8N.md | [ ] geplant (Welle 3; braucht S163+S165+S170 + WP5-Registry-Bau davor) |
| S172 | Live-Crash /security/scans/iac: "P.map is not a function" (Operator 30.9., Live-Build auf trading) — Mandat-15-Klasse wie S168: Wire-Shape beidseitig fixen + Guards + Wire-Contract-Test — SPRINT-172-IAC-SCANS-PAGE-CRASH.md | [x] erledigt (30.9. gesichert; Live-Bestätigung auf dem Trading-Node = Operator-Schritt: FE+BE-Redeploy, dann {"events":[]} auf leerer Tabelle; SecurityEventsPage-Array-Upgrade als Handoff notiert; gebaut vom Vorgänger-Agent, auditiert+verifiziert vom Fortsetzungs-Agent nach Absturz) |
| S173 | IA/Scope-Redesign (Operator-Design 1.10.): PROJECTS (SAST+DAST hierher) | INFRA (Security & Monitoring) | AI (global) | DATABASES | GENERAL/UTILITY (Email/Settings/Admin/Secrets/+Dashboards, KEIN Scope-Selector) — 2 Selector-Implementierungen (Scopes real nur Observability+S3), multi/all nur wo sinnvoll, Auswahl per MODAL+TAGS statt Dropdown; + Dashboard-Builder nach st2-Widget-Registry-Muster (Edit-Mode + Add-Widget-Dropdown + pro Widget E2E) mit Grafana-Embed-Widget-Typ — SPRINT-173-IA-SCOPE-REDESIGN.md | [~] **Nav-Umbau + Dashboard-Builder LIVE** (Nachweis 4.10. `docs/backlog/STATUS-CHECK-2026-10-04.md`: 6 Gruppen `section-nav.ts:188-292`, Route `/builder` `App.tsx:625` — vorher Stand „geplant" war veraltet); **offen: Terminal→Projects** (S182-WP3, läuft) **+ Firewall-global**; Rest geplant (IA-Blaupause für die S150-Live-Session; Nav-Umbau live mit Operator; NACHTRAG 1: Firewall-Settings GLOBAL-scoped mit Bulk-Editing — rahmt den OPNsense-Bau, der bislang 0 Backend-Code/Stub ist; NACHTRAG 2: ob Firewall EIGENE Kategorie oder unter Security&Observability — 3/2/1-Frage, entscheidet der UIUX-Agent im finalen Design-Audit, eBPF-Doppelrolle Detektion+Enforcement macht die Grenze fließend; NACHTRAG 3: Email + Chat in die GENERAL/UTILITY-Section (gehören NICHT in Workspaces/Projects) — Chat-Spanne LLM-Playground(AI, S165 läuft) vs. Team-Chat(Utility) klärt der UIUX-Agent im finalen Audit; NACHTRAG 4: TERMINAL → PROJECTS, ausdrücklich entschieden (Ausnahme vom Global-Charakter — deployed eh by default im Utility-Container; globale Container-Auswahl nur als Evolution-Option notiert) |
| S174 | SESSIONS unter PROJECTS (Session Replay + Agents) — OpenSessionReplay-Integration statt Sentry (Evaluierung: OpenReplay/rrweb als bekannte MIT-Kandidaten), Session-ID IMMER bei jedem Worker-/Agent-Deploy via X-Headers, Session-Selector in Traces (= Hauptübersicht, belebt den toten OTel-Spine), Datadog-style Network-Event-Tracing per Header-Tag → Agent/Git-Repo/VLAN/Scope-Zuordnung, Kreis schließt mit OPA-Permissions + Trust-Ratchet + Threat Detection — SPRINT-174-SESSIONS-REPLAY-TRACE-TAGGING.md (Operator-Prompt KOMPLETT verbatim drin) | [ ] geplant (Welle 3; nach S173+WP5-Registry+S171; NACHTRAG: Sessions+Traces = gleiches Grundgerüst, Traces GLOBAL in INFRA/Security&Observability mit Network-Events, GANZE Pipeline Pflicht-Kafka auf dem bestehenden Datalake-Broker S62/S155) |

## Sprint-Spiegel S62 (Datalake-IaC: deploy/datalake via make redeploy; 28.9.2026 — docs/sprints/SPRINT-62-DATALAKE-IAC.md)

Der SPRINT-55-Datalake-Stack (Kafka KRaft-Broker + datalaked, build-from-source via
Dockerfile.datalaked) war wie zuvor ozone/siem NICHT über make redeploy dispatchbar —
deploy/datalake/ hatte nur docker-compose.yml + README (der Aufruf starb an
deploy-service.ymls "Load service defaults"). Ehrliches Creds-Design wie S61: Task
rendert NUR nicht-geheime .env-Zeilen (lineinfile); fehlende OZONE_S3_*-Creds
deployen+verifizieren den Broker, stoppen datalaked sauber (kein Crash-Loop) und
failen LAUT mit getsecret-Runbook.

| Nr | Task | Status |
|---|---|---|
| S62-1 | deploy/datalake/{ansible-task.yml,defaults.yml} — Prechecks (compose + Ozone-S3G läuft), Node-Repo-Checkout (backend-Konvention, Stale-Ref-Hard-Fail), Staging-Whitelist, .env-Render ohne Secrets (Operator-Cred-Zeilen überleben) | [x] erledigt |
| S62-2 | docker-compose.yml: Build-Context ${JIMESH_DATALAKE_SRC_DIR:-../../src/backend} (Runner mountet nur deploy/) + echter Kafka-Healthcheck (kafka-broker-api-versions; live: healthy nach ~8 s) | [x] erledigt |
| S62-3 | LIVE-Verifikation im Task: Broker-Metadaten-Request (docker exec), Healthcheck, Container-Name-Erreichbarkeit auf jimesh-net (gleiches gepinntes Image), Loopback-Port 9092, datalaked /healthz (beweist Ozone-Creds+Bucket) + /status auf der Gateway-URL mit Spiegel-Kontrolle | [x] erledigt |
| S62-4 | Creds-Handling ehrlich (Mandat 9): Präsenz-Check ohne Wert; Broker deployt+verifiziert, datalaked gestoppt, LAUTES Fail mit getsecret-Runbook | [x] erledigt |
| S62-5 | README-Operator-Runbook (IaC primär, "SigV4-Credentials", "Verifizieren") + Registrierungs-Kommentar in deploy-service.yml + Sprint-File S62 | [x] erledigt |
| S62-6 | Deploy gegen einen Node AUSFÜHREN (Operator: make redeploy SERVICE=datalake NODE=<name>; Voraussetzung: ozone läuft dort + SigV4-Creds in der Node-.env) | [ ] offen |

## Sprint-Spiegel S154 (Protected/Internal-Projects, 28.9.→1.10. — docs/sprints/SPRINT-154-PROTECTED-INTERNAL-PROJECTS.md)

Operator-Order (verbatim): "(a) a protection flag so certain projects cannot
be deleted, (b) a UI setting to hide/show internal projects in the sidebar."
Backend-Schutz: `projects.is_internal` → DELETE /api/projects/{id}
verweigert mit 409 (error.type "project_internal"), kein ?force=;
PATCH /api/projects/{id}/internal (Admin-only) togglet; Delete-Dialog zeigt
den ehrlichen Internal-Zustand statt einer garantiert scheiternden Bestätigung;
Sidebar-Augen-Toggle blendet internal-Projekte aus (Default: sichtbar,
localStorage-only), offenes Projekt bleibt sichtbar.

| Nr | Task | Status |
|---|---|---|
| S154-1 | Refuse im Delete-Handler: 403→409, Unmark-Route in der Message ( beide Zweige) | [x] erledigt |
| S154-2 | isInternal in der GET/POST-/api/projects-Wire-Row (projectRowJSON) | [x] erledigt |
| S154-3 | PATCH-Handler Admin-only (fail closed, Pflicht-Boolean, 404 ehrlich) — internal/gateway/project_internal.go NEU | [x] erledigt |
| S154-4 | Backend-Tests: 409-Delete (deploy) + PATCH-Validation/End-to-End (gateway, echter mux mit Precedence-Beweis) | [x] erledigt |
| S154-5 | Delete-Dialog ehrlicher Internal-State (Lock-Icon, Purge weg, Button disabled) | [x] erledigt |
| S154-6 | ProjectDetailPage: isInternal durchgereicht + eigener 409-Toast | [x] erledigt |
| S154-7 | Sidebar: Augen-Toggle + localStorage + Tree-/Picker-Filter + ehrlicher alles-versteckt-Zustand | [x] erledigt |
| S154-8 | i18n 5 Keys × 60 Locales (en+de handgeschrieben), check:i18n PASS (3286 Keys) | [x] erledigt |
| S154-9 | Vitest: Dialog 2 + Sidebar-Toggle 6 — 8/8 grün | [x] erledigt |
| S154-10 | gateway.go-Registrierungszeile + store.go migrate()/Seed-Zeile (platform-internal) — exakte Zeilen im BUILD-Report, von diesem Agenten nicht anfassbar | [ ] offen — Operator wendet an |
| S154-11 | UI zum Admin-Togglen des Flags bewusst NICHT gebaut (Flag = Admin-API; Demand war Dialog + Sidebar-Setting) | [ ] geplant (späterer Sprint) |
| S154-12 | BUILD-Report /home/ji/projects/ihc24/BUILD-2026-10-01-SPRINT-154-PROTECTED-INTERNAL-PROJECTS.md | [x] erledigt |

## Sprint-Spiegel S157 (Sidebar-IA-Reorg, 1.10.2026 — docs/sprints/SPRINT-157-SIDEBAR-IA-REORG.md)

Operator-Order (verbatim): „wieso gibt es security, da ist der ganze siem scheiss usw drinne, abe dann gibt es noch mal observability? wieso machst du aus dem einen nicht firewall & threat detection für die settings und dann ne eigene section für observability und events? oder alarms?“ — Security-Sektion gesplittet: **Firewall & Threat Detection** (Defensiv: Scans, Findings, Exposure, WAF, DLP, Traces, Firewall, Threat Response) + eigene Sektion **Observability & Events** (Watching + Alarms: Suricata-IDS-Panel /networks, SIEM, Security Events, Realtime Monitor + Analytics aus dem LLM-Proxy hierher, Admin Audit Log, Notification Center). Navigation-only — jede Route bleibt erreichbar, nichts entfernt, keine URL geändert.

| Nr | Task | Status |
|---|---|---|
| S157-1 | section-nav.ts: FIREWALL_BASES (explizit, kein /security-Prefix) + OBSERVABILITY_BASES, firewallItems (11) + observabilityItems (7), Gruppe Observability & Events, Platform ohne /networks, LLM-Proxy ohne /analytics + /realtime-monitor | [x] erledigt |
| S157-2 | HierarchySidebar.tsx: FIREWALL_ITEMS + OBSERVABILITY_ITEMS, Header-Renames, SIEM-Count-Badge bleibt, localStorage-Keys (security/events) unverändert (persistierter Collapse-State überlebt) | [x] erledigt |
| S157-3 | i18n 60 Locales: +4 Keys (nav.firewallThreatDetection, nav.observabilityEvents, sidebar.observabilityEvents, sidebar.toggleProjectScope — letzterer fehlte SPRINT-156 komplett in en.json), −sidebar.eventsObservability; check:i18n PASS 3288 Keys | [x] erledigt |
| S157-4 | Tests: section-nav.test.ts Gruppen-Pinning + HierarchySidebar.test.tsx (Observability-7-Links, Firewall-11-Labels, Reachability-Guard ohne die obsoleten /networks-Label-Ausnahme) — Suite 49/49, Full 460/460 | [x] erledigt |
| S157-5 | SPRINT-156-Reparatur (Voraussetzung für grün): fehlender i18n-Key nachgetragen, Wert auf deren committete Test-Erwartung (Toggle scope selection) ausgerichtet — deren 4 rote Tests grün | [x] erledigt |
| S157-6 | Achtung Parent: section-nav.test.ts-Fix liegt UNCOMMITTED im Tree (HEAD ohne ihn wäre rot); BUILD-Report /home/ji/projects/ihc24/BUILD-2026-10-01-SPRINT-157-SIDEBAR-IA-REORG.md | [x] erledigt (committet — f6241c4f / f108dc00 tragen die Datei; Working-Tree sauber) |
## Sprint-Spiegel S153 (Meshsquad-Chat/Chatrooms, 28.9. spät — docs/sprints/SPRINT-153-MESHSQUAD-CHAT-CHATROOMS.md)

Operator-Order (verbatim): "jede squadmesh crew kriegt ihre chat rooms also quasi ihr eigenes slack
mit subchannels" + "ein wählbarer Haupt-Channel (Team-spezifisch ODER firmenweiter
Haupt-Tutario-Chat mit Agents als Berater, nicht an eine Crew gebunden)". jimesh-seitig komplett:
Chat-Space-Page /chat/space (Sub-Channels je Crew, anlegen/wechseln, org:main-Firmenchat-Modus),
Gate im Deploy-Dialog öffnet den Chat, Sidebar-Entry navigiert zur Page, Cross-Repo-Wire-Contract
(GET/POST {crewApiUrl}/chat/channels) im Sprint-File dokumentiert. NICHT fertig — die offene
meshsquad-public-seitige server.py-Endpunktstrecke (S153-3b) hält die Fläche heute im ehrlichen
Grau-/Empty-State; (b) die jimesh-Backend-Routen RM25 (S153-7) sind MIT SPRINT-163 erledigt —
Plugin ist installierbar, Entry/Gate nicht mehr ausgegraut.

| Nr | Task | Status |
|---|---|---|
| S153-1 | Sidebar-Chat-Eintrag + Ausgrauen-Logik (installierbar → Wizard, sonst Tooltip) | [x] erledigt (ea45aa2; Navigation + i18n hier) |
| S153-2 | Deploy-Zeit-Gate für Chat-Requirement (§10.2, inline im Deploy-Dialog) | [x] erledigt (ea45aa2; "Open chat" hier) |
| S153-2b | Chat-Space-Page /chat/space: Sub-Channels je Crew, anlegen/wechseln, Firmenweiter Haupt-Chat (org:main) | [x] erledigt |
| S153-2c | Wire-Contract dokumentiert + i18n meshsquadChat.* 45 Keys × 60 Locales + Tests (Entry 4, Gate 3, Page 6) | [x] erledigt |
| S153-3 | Sub-Channel-Modell auf topic_map/topic_map_store (channel_name/is_main/org:main) | [~] in Arbeit (meshsquad-public, uncommitted vorgefunden) |
| S153-3b | server.py-Chat-Space-Endpunkte GET/POST /chat/channels + CORS für die jimesh-Origin | [ ] offen (meshsquad-public) |
| S153-4 | `ChatSpaceModal` (Crew+Human gemeinsam) | [ ] geplant (meshsquad-public) |
| S153-5 | Channel-Mitgliedschaft `role.channels` im Agent-Builder | [~] in Arbeit (meshsquad-public, uncommitted vorgefunden) |
| S153-6 | "Make main"-Schalter pro Team (set-main-Contract fehlt im Store) — Page zeigt is_main nur darstellend | [ ] offen (braucht meshsquad-Endpoint) |
| S153-7 | RM25: echte jimesh-Backend-Routen für meshsquad (gateway/plugins.go pluginBackendRoutes ist leer → installable=false → Entry/Gate bleiben ausgegraut, Installation unmöglich) | [x] erledigt (SPRINT-163, 1.10., commit b3df2835 — 3 Lifecycle-Routen gateway/meshsquad.go, pluginBackendRoutes synchron; Spiegel-Zeile oben) |

## Sprint-Spiegel S156 (Projekt-Navigation: Sidebar → Projekt-Detail, Nacht 28./29.9.2026 — docs/sprints/SPRINT-156-PROJEKT-NAVIGATION.md)

Operator-Report: Projektnamen-Klick in der Sidebar navigierte NICHT (nur Scope-Umschaltung),
die echte Projekt-Detailseite war nur über ein hover-only, als "Settings" fehlbeschriftetes
Zahnrad-Icon unter dem Workspaces-Namespace erreichbar. Behoben: Namenzeile navigiert nach
/projects/{id}, [◎]-Scope-Toggle als immer sichtbare Sekundäraktion, ehrliches immer sichtbares
[↗ Open project] statt des Settings-Mismatches; Legacy-Route /workspaces/projects/{id} bleibt
(Bookmarks); i18n 2 Keys × 60 Locales; jsdom-Navigationstests 45/45 grün.

| Nr | Task | Status |
|---|---|---|
| S156-1 | Sidebar: Projektnamenzeile navigiert zur Detailseite (primäre Aktion), Selection-Highlight bleibt darstellend | [x] erledigt |
| S156-2 | [◎]-Scope-Multi-Select-Toggle als eigene, immer sichtbare Sekundäraktion (gleicher setGlobalScope-Writer wie das Popover) | [x] erledigt |
| S156-3 | Hover-only [⚙ "Settings"]-Fehllabel entfernt → ehrliches, immer sichtbares [↗ Open project] | [x] erledigt |
| S156-4 | Route /projects/{id} → ProjectDetailPage ergänzt; Legacy-Route bleibt; bare /projects bleibt /workspaces-Redirect; /projects/discover static precedence | [x] erledigt |
| S156-5 | i18n: sidebar.openProject + sidebar.toggleProjectScope in en + 59 Locales (41 handübersetzt, 19 dokumentierter EN-Fallback per RM35-Präzedenz) | [x] erledigt |
| S156-6 | Tests: jsdom-Navigations-Assertion (Name-Row + [↗]), FIX-3-Scope-Tests auf [◎] umgestellt, __probe.test.tsx mitgezogen; 45/45 PASS | [x] erledigt |
| S156-7 | Docs: Sprint-File SPRINT-156, dieser Spiegel, BUILD-Report ihc24; API_DOCS.md ohne Eintrag (keine HTTP-Route berührt) | [x] erledigt |
| S156-8 | Server-Rows: derselbe hover-only [⚙]-Pattern → SSHTargetDetailPage nachziehen (nicht im Operator-Report, bewusst offen) | [ ] offen |
| S156-9 | ProjectDetailPage IaC-Tab: hartkodierte Mock-Daten ("Discovered Services (3)", Fake-Compose-Preview, "eBPF routing active") — Mandat-2-Verstoß, eigenes WP nötig | [x] erledigt (S166, 30.9. — Mock-Daten raus, echte /iac-files-Wiring; siehe S166-Zeile oben) |

## Sprint-Spiegel S150-S153 (UIUX-Redesign Phase 2/3/5/6 — "Ghost-Phasen", 28.9.2026)

Aus `docs/sprints/SPRINT-149-UIUX-REDESIGN-NAVBAR-SIDEBAR.md` (Phase 1+4 sind umgesetzt, siehe deren
eigene Sprint-Spiegel weiter unten). Phase 2/3/5/6 waren zunächst NUR im Proposal-Dokument beschrieben,
nicht als eigene Sprints getrackt — hier nachgeholt, Operator-Order 28./29.9. Stand 1.10.:
Phase 3 (S151) und Phase 5 (S152) sind gebaut und committet, Phase 2 (S150) bleibt bewusst ungestartet,
Phase 6 (S153) jimesh-seitig fertig / meshsquad-public offen.

| Nr | Task | Status |
|---|---|---|
| S150 | Tab-Leiste statt Navbar (Phase 2) — SPRINT-150-TAB-STRIP-NAVBAR-REPLACEMENT.md | [ ] geplant (bewusst nie gestartet — größter Blast-Radius, nur mit Leo live) |
| S151 | Sidebar-Dashboards-Sektion + Presets + jimesh.dashboards-SDK (Phase 3) — SPRINT-151-SIDEBAR-DASHBOARDS-SECTION-SDK.md | [x] gebaut + committet (bcf70bd9; CRUD-Routen live, inzwischen auch in API_DOCS.md dokumentiert) |
| S152 | Email/Notification-System (Phase 5) — SPRINT-152-EMAIL-NOTIFICATIONS-SYSTEM.md | [x] erster Cut gebaut + committet (ea45aa2b; SMTP-Kanal + Threat→Email-Trigger + Sidebar-Tab) — Rest-Umfang S152-5 bleibt [ ] offen (braucht Operator-Freigabe) |
| S153 | Meshsquad-Chat/Chatrooms (Phase 6, teils meshsquad-public) — SPRINT-153-MESHSQUAD-CHAT-CHATROOMS.md | [~] jimesh-Seite erledigt (S153-1/2/2b/2c), meshsquad-Öffnung siehe eigener Spiegel oben |

## Sprint-Spiegel S144 (Realtime Threat Protection, 28.9.2026 — docs/sprints/SPRINT-144-REALTIME-THREAT-PROTECTION.md)

Suricata-Detection → Container einfrieren + auf 0 routen. DETECT default, ENFORCE nur via gitignored overrides.local.yml.

| Nr | Task | Status |
|---|---|---|
| S144-1 | 9 Secret-Exfil-Regeln (SIDs 8000001-14: AWS-Keys, PEM-Blöcke, ghp-/.env-Marker; TLS-Caveat ehrlich) | [x] erledigt |
| S144-2 | Go-Responder-Daemon cmd/threat-responder (eve.json-Tail mit Rotation/Inode, Container-Auflösung via Docker-Engine-API, DETECT=logged_only / ENFORCE=disconnect-all-then-pause, dedup, hartes SID-Fenster 8000000-99) | [x] erledigt — 16/16 Tests + Binary-Smoke auf echtem docker.sock |
| S144-3 | Gated IaC deploy/threat-responder/ (hand-run wie suricata, fail-closed prereqs, Regeln+docker0/Bridge-Capture in suricata.yaml, suricata -T vor jedem Reload, LIVE-PROBE am Deploy-Ende) | [x] erledigt |
| S144-4 | Operator-Runbook + ENFORCE-Flip + Forensics-Release | [x] erledigt — deploy/threat-responder/README.md |
| S144-5 | Deploy gegen trading | [ ] offen — Operator: make redeploy SERVICE=threat-responder NODE=trading → **Sprint S190 (7.10.): WP3 übernimmt Deploy + Mandat-12-Pfade + eigenen Falco-Eingang — docs/sprints/SPRINT-190-THREAT-ACTION-FALCO-RESPONSE.md** |

## Sprint-Spiegel S61 (SIEM-IaC: deploy/siem via make redeploy; 28.9.2026 — docs/sprints/SPRINT-61-SIEM-IAC.md)

Der SIEM-Stack (Wazuh manager/indexer/dashboard + Falco + siem-bridge) war der letzte NICHT über make redeploy dispatchbare Service. Ehrliches Key-Design: Task minted/liest den Key NIE (Mandat 9) — fehlender Key deployt+verifiziert den Core, stoppt die Bridge sauber und failt LAUT mit Mint-Runbook.

| Nr | Task | Status |
|---|---|---|
| S61-1 | deploy/siem/{ansible-task.yml,defaults.yml} — Staging (Whitelist ohne Controller-.env), idempotente PKI (9-File-Check, kein Rotieren), .env-Render ohne Secrets (lineinfile, Key überlebt), Node-Repo-Checkout (backend-Konvention) | [x] erledigt |
| S61-2 | LIVE-Verifikation im Task: Indexer-Endpoint, Manager/Dashboard-Healthchecks, Falco-Tripwire-Beweis (Baseline-gezählt), Retention (Fresh-Stack ehrlich), Bridge-Marker + Key-Rejection = Hard-Fail | [x] erledigt |
| S61-3 | Service-Key-Missing ehrlich: Core deployt+verifiziert, Bridge gestoppt, LAUTES Fail mit Mint-Runbook | [x] erledigt |
| S61-4 | docker-compose.yml: siem-bridge-Source-Mount ${JIMESH_SIEM_SRC_DIR:-../../src/backend} (Runner mountet nur deploy/); compose config live validiert | [x] erledigt |
| S61-5 | README-Operator-Runbook (IaC-Weg, Service-Key-curl, Live-Verify, Retention) + Sprint-File S61 | [x] erledigt |
| S61-6 | Deploy gegen trading AUSFÜHREN (Operator: make redeploy SERVICE=siem NODE=trading) | [ ] offen |

## Sprint-Spiegel S143 (Workspace-Delete auf den Operator-Flächen, 28.9.2026 — docs/sprints/SPRINT-143-WS-DELETE-SURFACES.md)

Delete existierte seit Sprint-37 — gefehlt hat er auf Deployments-Liste + App-Panel. EINE geteilte WorkspaceDeleteButton-Komponente statt Duplikat; Defect-Fixes am Bestands-Flow (11 neue Delete-Tests, weggeworfene Worktree-Notice jetzt getoastet).

| Nr | Task | Status |
|---|---|---|
| S143-1 | Geteilte WorkspaceDeleteButton (confirm:false, ['workspaces']-Invalidierung, ehrlicher 403-Toast) | [x] erledigt |
| S143-2 | AppPanelDrawer-Danger-Zone + WorkspaceDeploymentsPage-Zeilen-Delete (+ ehrliche No-Kaskade-Note) | [x] erledigt |
| S143-3 | Defect-Fixes + 11 neue Tests; Verifikation 25/25+70/70, tsc 474≤477, check:i18n PASS | [x] erledigt |

## Sprint-Spiegel S140 (Integrations-Install: die Echo-Route wird echt; 28.9.2026 — docs/sprints/SPRINT-140-INTEGRATIONS-INSTALL.md)

Operator-Report: "warum lassen sich in der integrations seite keine integrations
installieren — aber auch bei der workspace-seite bei integrations nicht?" Root Cause
(auch bestätigt durch /home/ji/projects/ihc24/PROMPTS-VS-DELIVERY-AUDIT-2026-09-28.md):
POST /api/plugin-installations war ein **No-Persistence-Echo** (success:true, nichts
in PostgreSQL, GET antwortete hardcoded []) — jede Fläche zeigte deshalb nie etwas als
installiert. Behebung ECHT end-to-end, plus ehrliche Verfügbarkeit für Plugins ohne
Backend-Routen (SPRINT-49-Präzedenz: tote Install-Buttons weg).

| Nr | Task | Status |
|---|---|---|
| S140-1 | Store `plugin_installations` (internal/store/plugin_installations.go: Ensure + Upsert + List, UNIQUE (plugin_id, scope_type, scope_id)) + migrate()-Hook | [x] erledigt |
| S140-2 | Gateway plugins.go: POST persistiert ECHT (404 unbekanntes Plugin/Scope, 409 nicht-installierbar, 400 closed sets/config, 404 Scope-Row fehlt), GET liest echte Rows; Katalog trägt `installable`, abgeleitet von den REAL registrierten Backend-Routen (jules only) | [x] erledigt |
| S140-3 | Mandat 9: Wizard-apiKey wird beim Install in vault_secrets (AES-GCM-256, projekt-scoped) gespeichert; Row/GET tragen nur secretRef, NIE Klartext (VaultAudit mitschrieben) | [x] erledigt |
| S140-4 | jules.go: Key-Resolution env → Header → vaulted Installations-Secret ("installiert" bedeutet für Jules jetzt etwas; Notice-Text endlich wahr) | [x] erledigt |
| S140-5 | Frontend: PluginCatalogPage ehrliche Nicht-Installierbar-Badges (Browser-Trigger bleibt); ProjectDetailPage Integrations-Tab: toter Configure-Button → echter Zustand; WorkspaceSettingsPage+PluginActivationCard: echter Katalog statt inline-Hardcode, echtes installation-Prop (Active erreichbar), Invalidate nach POST | [x] erledigt |
| S140-6 | Tests: gateway/plugins_test.go (5: Katalog-Signal, Validierung, Persistenz+Secret-Stripping+Vault+Upsert, ehrliche 404er — gegen jimesh_test, skip ohne Postgres) + vitest PluginCatalogPage.test.tsx (4) + PluginActivationCard.test.tsx (4) | [x] erledigt |
| S140-7 | Docs: API_DOCS (Katalog+Installation+Jules-Key), dieser Spiegel, Sprint-File, BUILD-Report ihc24; i18n en+59 Locales (3 neue Keys; handübersetzt wo sicher, sonst dokumentierter EN-Fallback per RM35-Präzedenz) | [x] erledigt |
| S140-8 | Verifikation: go build/vet PASS (docker golang), go test gateway+store PASS (jimesh_test via netns-Route — jimesh-net TCP zu Postgres wird still gedroppt, Umgebungsproblem dokumentiert), vitest 388/389 (1 vorbestehend), tsc 474 ≤ 477-Baseline (−3), check:i18n PASS 60 Locales/3021 Keys | [x] erledigt |
| S140-9 | DELETE /api/plugin-installations/{id} (Deinstallation) | [x] done — `gateway/plugins.go:handlePluginInstallationDelete` mit VaultProjectDenial-Gate (S181-20 Muster), Vault-Cleanup nach `meshsquad.go` Muster, Upsert-only → echtes DELETE |
| S140-10 | meshsquad/linear/github_app: installierbar erst wenn echte Backend-Integration (manifest ingestion bzw. eigene Routen) | [ ] offen (bewusst) |
| S140-11 | PART 2 Overview-Fusion (Operator 28.9. ~05:30): /plugins = kanonische Fläche `Integrations & Plugins` — SubagentsPanel (Einziginhalt von /agents) auf /plugins gemountet; /agents → Redirect auf /plugins (App.tsx, /subagents-Muster); AgentsPage.tsx gelöscht; Command-Palette-Eintrag gemerged; Titel/Subtitle/nav.pluginCatalog Werte-Update in 60 Locales | [x] erledigt |
| S140-12 | PART 2 Tests/i18n/Verifikation: PluginCatalogPage.test erweitert (Merge-Anchor, Subagents-Wire-Stubs); vitest 389/390 (1 vorbestehend), tsc 474 ≤ 477, check:i18n PASS (60 Locales/3058 Keys) | [x] erledigt |
| S140-13 | PART 2 Nav-Aufräumung (section-nav.ts:141 + :74, HierarchySidebar.tsx:246, section-nav.test.ts:34) — EXAKTE Zeilen-Edits im Sprint-File + BUILD-Report; AUSSTEHEND beim Parent (Dateien beim Onboarding-Agent) | [ ] offen (Parent) |

| S140-14 | **Deploy-Time-Plugin-/Service-Picker beim Projekt-Anlegen** (OPEN-ITEMS #5, bestätigt 4.10.): `components/projects/NewProjectDialog.tsx` (256 Z.) kennt nur Server/SSH-Endpoint-Auswahl, 0 Treffer für `plugin`/`service`/`preset` → Auswahl + `POST /api/plugin-installations` im Create-Flow, Abbruch = Projekt ohne Plugins statt Fake-Checkboxen | [x] done — 3-Schritt-Dialog (Name&Server → Plugins → Confirm), `POST /api/plugin-installations` im Create-Flow, `VaultProjectDenial`-Gate (S181-20), `VaultProjectDenial` Pattern, Abbruch = Projekt ohne Plugins |

## Sprint-Spiegel S57-9 (Grafana-IaC: Node-Deploy des SPRINT-57-Monitoring-Stacks, 28.9.2026 — docs_dev/sprints/SPRINT-57-NATIVE-DASHBOARD-EMBEDDING-VIA-ROUTER.md §Nachtrag)

Der Live-Fund: make redeploy SERVICE=grafana NODE=trading failte an fehlendem
defaults.yml — der SPRINT-57-Compose-Stack lief nie auf einem Node, das
/embed-Proxy-Ziel existierte nirgends. Nachtrag baut die IaC nach (Muster
deploy/ozone) + Operator-Runbook; Frontend-Teil (DashboardsPage, kein iframe)
war aus WP6 vollständig da und wurde nur verifiziert, nicht dupliziert.

| Nr | Task | Status |
|---|---|---|
| S57-9a | deploy/grafana/defaults.yml (Staging, File-Liste, Container, Embed-Pfad, Cred-Lookups aus Controller-.env, Exporter-DSN, Retry) | [x] erledigt — YAML-safe_load PASS |
| S57-9b | deploy/grafana/ansible-task.yml (Compose-Check, Staging 1:1, .env-Render 0600, compose --profile dash up, ECHTE Verifikation: Running-State, Sub-Pfad-/api/health per Probe-Container auf jimesh-net, Prometheus ready, pg_up/redis_up Exporter+TSDB) | [x] erledigt — YAML-safe_load PASS |
| S57-9c | deploy/grafana/README.md Operator-Runbook (Deploy-Befehl, Erwartung, Verifikation, Diagnose, NICHT-Gemachtes inkl. Backend-Embed-Env-Fund) | [x] erledigt |
| S57-9d | Erster echter Deploy auf trading (Operator) + danach make redeploy SERVICE=backend NODE=trading (Backend-Container hat JIMESH_EMBED_TARGETS noch nicht — live verifiziert) | [ ] offen — Operator |
| S57-9e | Live-Roundtrip Platform → Dashboards → Grafana öffnen (Vollbild, kein iframe) am deployten Stack | [ ] offen — Operator |

## Sprint-Spiegel S59 (Deploy-Flow-Lücken: Projekt-Löschung, Browser-Integration, Ozone-IaC, services:-Render, SURICATA_INTERFACE; 28.9.2026 — docs/sprints/SPRINT-59-DEPLOY-TIME-GAPS.md)

| Nr | Task | Status |
|---|---|---|
| S59-1 | Projekt-Löschung erreichbar: ProjectDetailPage → echter DeleteProjectDialog → DELETE /api/projects/{id} (+ Best-Effort-Node-Cleanup nur bei Endpoint-Secrets, sonst ehrlich ungesweept) | [x] erledigt |
| S59-2 | Browser-Integration: Modal-Trigger von /workspaces/deployments?browser=1 nach /plugins?browser=1 (echter Integrations-Tab) | [x] erledigt |
| S59-3 | Ozone-IaC: deploy/ozone/{ansible-task.yml,defaults.yml} + deploy-service.yml-Registrierung + .env.example (keine Credentials) | [x] erledigt |
| S59-4 | services:-Render CLI-Weg (.node-services via render-inventory.py + Makefile deploy-all); Dashboard-Weg bewusst blockiert dokumentiert (distroless-Backend, keine Identity-Bridge) | [x] erledigt (CLI) |
| S59-5 | SURICATA_INTERFACE dokumentiert (.env.example + neues suricata-README), trading=eth0 gesetzt, Deploy angestoßen | [x] erledigt |
| S59-6 | Deploy-Time-Integrations-Picker beim Project/Workspace-Anlegen | [ ] offen |
| S59-7 | Ozone-Datanode-Permissions-Fix — Volume-Chown 1000:1000 live gefixt (Datanode UP, Raft-Leader elected) + als idempotente Ansible-Task in deploy/ozone/ansible-task.yml verankert | [x] erledigt |

## Sprint-Spiegel S139-WL (Workspace-Lifecycle: Create ist Create, Provisioning ist Provisioning, 28.9.2026 — docs/sprints/SPRINT-139-WORKSPACE-LIFECYCLE.md; Branch feat-workspace-lifecycle)

Das Create fragt NICHTS mehr, was die Registry schon hat: POST /api/workspaces schreibt NUR die Row (status `created`, workspace_kind user|shared, §8.3b); der alte SSH-Worktree-Flow ist der bewusste, separate Endpoint POST /api/workspaces/{id}/provision (Owner-oder-Admin, Credentials aus Request VORZUG, sonst Registry-Aufloesung, sonst fail-loud) — und derselbe Flow feuert AUTOMATISCH beim User-Onboarding (§8: "JiMesh auto-provisions one Workspace per selected Project").

| Nr | Task | Status |
|---|---|---|
| WL-1 | Backend: ensure = create-only (EnsureUserWorktree raus, status created, note "provisioning is a separate action") | [x] erledigt |
| WL-2 | Backend: POST /api/workspaces/{id}/provision (workspaces_provision.go: Handler + wiederverwendbarer provisionWorkspace-Kern, Ownership-Gate, OPA-Exemtion, fail-loud 400er) | [x] erledigt |
| WL-3 | Backend: §8-Onboarding-Auto-Providsion (user_provisioning.go feuert provisionWorkspace, provisionedWorkspaces[]-Report) | [x] erledigt |
| WL-4 | Backend: workspace_kind (Migration + NULL-owner + partial unique index, derive aus owner, Widerspruch-Refusal) | [x] erledigt |
| WL-5 | Frontend: Create-Dialog ohne SSH-Felder, §8.3b-Radio User/Shared | [x] erledigt |
| WL-6 | Frontend: Provision-Button + -Dialog (Registry-Prefill via getEndpointSecrets, workspacePath aus Project-Row, nie leer-anfragend) | [x] erledigt |
| WL-7 | Frontend: Status-Kette sichtbar (lib/workspace-status.ts, Badge+Dot, Sidebar-Dot, [+ App]/Deploy-Gate "provision first") | [x] erledigt |
| WL-8 | Tests: Backend workspaces_lifecycle_test.go (5, u.a. ECHTES lokales git-Repo) + store shared/kind-Tests; Frontend WorkspacesPage.test.tsx (7) + workspace-status.test.ts (5) | [x] erledigt |
| WL-9 | i18n en+de (26+3 Keys), 58 Locales via i18n-translate.py | [x] erledigt |
| WL-10 | Docs: API_DOCS (create + provision + onboarding), Sprint-File, dieser Spiegel, ARCHITECTURE §8.3b-Built-Notiz | [x] erledigt |

## Sprint-Spiegel RM35 (SOC 2-Fundament: Admin-Aktions-Audit-Log, 28.9.2026 — docs/sprints/SPRINT-RM35-SOC2-ADMIN-AUDIT-LOG.md; Branch feat-admin-audit-log)

Die ALLGEMEINE Admin-Aktions-Audit-Spur (RM35-SOC2-Mapping, crew-docs): Tabelle `admin_audit_log`, befüllt an GENAU den Stellen, die schon `policy.IsAdminMutation`-Gates haben (`internal/auth` Middleware + das inline `/api/firewall/rules`-Gate) — erlaubte UND abgelehnte Versuche (SOC 2 will sehen, wer es VERSUCHT hat). Keine Request-Bodies im Log (Vault-/Key-Secrets!), `after_diff` trägt das Outcome-JSON. Admin-only-Leseroute `GET /api/admin/audit-log`, Frontend `/security/audit-log` mit Filtern (Actor/Aktion/Zeitraum) und expandierbarem Diff — Nav an BEIDEN Registrierungsstellen (`section-nav.ts` Security-Tab + `HierarchySidebar.tsx` Events & Observability), Operator-Vorgabe.

| Nr | Task | Status |
|---|---|---|
| RM35-1 | Store `internal/store/admin_audit.go`: Tabelle + Ensure + Record/List (Actor-Substring, Action exakt, From/To, Limit-Clamp) + migrate()-Hook | [x] erledigt |
| RM35-2 | Klassifizierung `internal/policy/admin_audit.go` (`ClassifyAdminMutation`, Tests) | [x] erledigt |
| RM35-3 | Gate-Hook `internal/auth/admin_audit.go` + auth.go (IsAdminMutation-Gate + Firewall-Twin; Denies mit Grund, Erfolg aus echtem HTTP-Status) | [x] erledigt |
| RM35-4 | API `GET /api/admin/audit-log` (`internal/gateway/admin_audit.go`, Admin-only, fail closed) | [x] erledigt |
| RM35-5 | Frontend `AdminAuditLogPage.tsx` (`/security/audit-log`, Tabelle + Filter + Diff-Expand, Route in App.tsx) | [x] erledigt |
| RM35-6 | Nav an BEIDEN Stellen + Sidebar-Test-Update (5→6 Links) + section-nav-Test | [x] erledigt |
| RM35-7 | i18n en+de handübersetzt, 58 Locales via i18n-translate-Mechanik (nur die eigenen Keys — fremde in-flight-Keys unberührt) | [x] erledigt |
| RM35-8 | Docs: API_DOCS-Route, Sprint-File, dieser Spiegel | [x] erledigt |
| RM35-9 | Verifikation: go-build (Commit-Baum im Scratch-Worktree — Shared-Tree hat eine fremde kaputte ungetrackte Datei), go test policy+store, tsc, vitest, check:i18n | [x] erledigt — siehe Sprint-File |
| RM35-10 | Live-Smoke am laufenden Stack (Operator: Admin-Aktion ausführen, /security/audit-log prüfen) | [ ] offen — Operator |

## Sprint-Spiegel S55 (Datalake-Integration End-to-End, 28.9.2026 — docs_dev/sprints/SPRINT-55-DATALAKE-INTEGRATION-END-TO-END.md; Branch feat-datalake-ozone)

Minimal-Pfad ECHT verbunden: jimesh.*-Kafka-Topics → Apache Ozone. cmd/datalaked (Stil wie kafkabridge, franz-go + aws-sdk-go-v2 mit BaseEndpoint) schreibt jedes Event 1:1 als JSON-Objekt nach Ozone — at-least-once mit deterministischen, idempotenten Keys, kein Transform in v1. Debezium (JVM) endgültig gefallen gelassen (Entscheidung im Sprint-File); deploy/datalake ist Kafka + datalaked (build-from-source), Ozone deployed in deploy/ozone/ (Vorlage: Operator-Repo ozone-with-hue-localstack-and-compose).

| Nr | Task | Status |
|---|---|---|
| S55-1 | deploy/ozone/ Compose (scm/om/datanode/s3g/recon, Ozone 2.2.1 gepinnt, opt-in Profile ozone, externes jimesh-net, Loopback-Ports, .env-Creds, README) | [x] erledigt — docker compose config -q grün |
| S55-2 | deploy/datalake/docker-compose.yml: Debezium+MinIO+OpenSearch entfernt, Kafka (gepinnt 7.6.0) + datalaked (build: Dockerfile.datalaked, IaC-Deploy) auf jimesh-net, Profile datalake | [x] erledigt — docker compose config -q grün |
| S55-3 | aws-sdk-go-v2 nachgetragen (aws/credentials/service/s3, BaseEndpoint+UsePathStyle); internal/datalake No-Op-Stubs entfernt (sink warf Daten still weg); prometheus/client_golang aus go.mod entfernt (metrics.go war einziger Nutzer) | [x] erledigt — go build + vet grün |
| S55-4 | cmd/datalaked: Regex-Subscription, MarkCommitRecords nach erfolgreichem PUT, Live-Assignments via OnPartitionsAssigned, Status-Endpoint :7620 | [x] erledigt — go build + vet grün |
| S55-5 | gateway/datalake.go: echter Proxy auf datalaked (activePipelines aus Partition-Zuweisungen, lastSyncedAt, ehrliches not_connected) | [x] erledigt |
| S55-6 | DatalakePage.tsx ehrlich (Fake-Fallbacks entfernt) + Nav-Eintrag /dbs/datalake (section-nav DBs-Gruppe, nav.datalake in 60 Locales) | [x] erledigt — tsc A/B 478→477 (0 neue), check:i18n grün |
| S55-7 | Docs: API_DOCS (beide Routes), .env.example, #087/#088 hier, Sprint-File mit Deploy-/Live-Test-Prozedur | [x] erledigt |
| S55-8 | Deploy + Live-Beweis (echtes Event → Ozone-Objekt, Hash/Timestamp; activePipelines > 0 am laufenden Stack): Stack deployt der OPERATOR über die IaC (Operator-Entscheidung: wir deployen mit IaC wenn alles gemerged ist) — Prozedur im Sprint-File, Live-Output danach dort dokumentieren | [ ] offen — Operator-Deploy |
| S55-9 | Folge-Sprints: Transform-Schicht (Anonymizer/Embeddings), OpenSearch-Columnar-Sink, Postgres-WAL-Quelle (pglogrepl-Adapter), Datalake-Deploy als Frontend-Integration/Plugin | [ ] offen — R44-Rest |

## Sprint-Spiegel S139 (Tetragon-eBPF-Enforcement, 27.9.2026 — docs/sprints/SPRINT-139-TETRAGON-EBPF-ENFORCEMENT.md; Branch feat-tetragon-ebpf)

RM32-Nachtrag, Operator verbatim: "bitte bitte bitte endlich mit ebpf machen" — erste echte Tetragon-TracingPolicy: der Llama-Guard-Hook erkennt Prompt-Injections, der eBPF-Layer KILLT den Prozess, der die Injection ausführt (SIGKILL auf security_bprm_check, VOR dem exec), defense in depth zur 403. Hook-Seite: Setting `guard_scanner.enforcement`=="ebpf" (Default AUS) → docker exec des Kill-Switch-Markers `/tmp/jimesh-guard-kill.<session>` in den Container der geblockten Session (nur provisioned, K-LAF §2); Tetragon-Policy matchArgs Prefix + matchNamespaces NotIn host_ns + Sigkill. Ehrlichkeits-Protokoll: exit 137 → `ebpf_kill_enforced`, exit 42 (Tetragon fehlt/gVisor) → `ebpf_enforcement_missed` — kein Fake-Enforcement, jede Zeile in `security_events` (Scanner tetragon-ebpf).

| Nr | Task | Status |
|---|---|---|
| S139-1 | TracingPolicy `deploy/tetragon/jimesh-guard-kill.yaml` (v1.7.1-CRD, gegen Upstream-Quelltext verifiziert): exec-Gate (Marker → Post+Sigkill) + exec/ptrace-Watch | [x] erledigt — yaml-lint Parse+Schema OK |
| S139-2 | Deploy: docker-compose.yml (Standalone-Form: pid/cgroup host, privileged, BTF-Mount, gRPC-Unix-Socket, Event-Export+Rotation; kein published Port) + ansible-task.yml mit LAUTen Prereqs (BTF/Kernel≥4.19/compose/Pull) + tetra-CLI (sha256) + **Live-Kill-Probe** (exit 137 Pflicht, sonst Hard-Fail) + defaults.yml | [x] erledigt — docker compose config OK |
| S139-3 | Backend `internal/ai/guard_enforce.go` + guard_hook.go-Wiring (beide BLOCKED-Pfade), async 10s, Exit-Code→security_events, gVisor/runsc ehrlich als missed statt fake | [x] erledigt — scoped Build RC 0, vet clean |
| S139-4 | Tests: 4 reine Protokoll-Tests + 1 DB-Test (Gating + ehrlicher Skip); Suite 12/12 ok (Throwaway-DB) | [x] erledigt |
| S139-5 | Fund+Fix: models-Tabelle shippte `description` nicht im CREATE (Fresh-DB-Bootstrap-Klasse, TASK-076-Muster; Kontrollexperiment am BESTEHENDEN Guard-Test) | [x] erledigt |
| S139-6 | Docs: deploy/tetragon/README.md (Deploy, Exit-Code-Tabelle, Test-Procedure Injection→Kill→Event-Log, Grenzen), API_DOCS (Setting-Key + tetragon-ebpf-Events), Sprint-File, dieser Spiegel | [x] erledigt |
| S139-7 | Operator-Live: `make redeploy SERVICE=tetragon NODE=<name>` + README-Test-Procedure mit echtem Testagent | [ ] offen — Operator |

## Sprint-Spiegel S57 (Native Dashboard-Embedding, 27.9.2026 — docs_dev/sprints/SPRINT-57-NATIVE-DASHBOARD-EMBEDDING-VIA-ROUTER.md; Branch feat-native-embedding)

Grafana/Wazuh/Ozone Recon NATIV im JiMesh-Dashboard: der Gateway reverse-proxied `/embed/{name}/*` auf der Dashboard-Origin (Traefik :8090), session-geprüft, X-Frame-Options gestrippt — KEIN iframe, KEIN Agent-Browser; die Page IST die Route (voller Viewport). #079-wsproxy blieb unangetastet: Seine Mechanik ist generisch, sein Gate aber workspace-gebunden (Loopback-Router-Node + JWT-Bearer) — der Gateway besitzt Session-Auth + Origin (Claude's offene Frage, im Code beantwortet).

| Nr | Task | Status |
|---|---|---|
| S57-1 | Backend embed.go: JIMESH_EMBED_TARGETS (JSON [{name,url,path}]), /embed/{name}/* längste-Präfix, Pfad-Erhalt (serve_from_sub_path) + Rewrite-Modus, X-Frame-Options/CSP-frame-ancestors-Strip, ehrliche 404er ohne Config | [x] erledigt — go build/vet RC 0, 6 Tests PASS (echter httptest-Upstream) |
| S57-2 | Session-Gate in auth middleware für /embed* (Bearer/Cookie/?token=) + ?token=→HttpOnly-Cookie(Path=/embed)+302-Handoff | [x] erledigt |
| S57-3 | GET /api/embeds (session-geprüft, echte Config, keine erfundenen Dashboards) | [x] erledigt |
| S57-4 | Traefik: /embed an Backend-Router (local-stack.sh + deploy/backend/ansible-task.yml/defaults.yml inkl. JIMESH_EMBED_TARGETS-Durchreichung) | [x] erledigt |
| S57-5 | Frontend DashboardsPage (/dashboards, Platform-Tab): GET /api/embeds, vollseitiger Handoff zu /embed/{name}?token=, ehrlicher Empty-State; i18n en+de + 58 Locales | [x] erledigt — tsc clean, check:i18n 60/2925 |
| S57-6 | deploy/grafana: Grafana 11.5.0 Sub-Pfad-Modus (root_url=http://localhost:8090/embed/grafana, serve_from_sub_path=true) + Prometheus + postgres/redis-exporter gegen die ECHTEN Haupt-Stacks, Dashboards postgres.json/redis.json provisioniert, Profil `dash`, KEIN Envoy, KEINE host-Ports | [x] erledigt — docker compose config -q RC 0 |
| S57-7 | Docs: API_DOCS §Embedding, .env(.example), deploy/grafana/README, Sprint-File, dieser Spiegel | [x] erledigt |
| S57-8 | Live-Smoke am laufenden Stack (Operator: Profile `dash` hochfahren, Platform → Dashboards → Grafana öffnen) | [ ] offen — Operator |
| S57-9 | Wazuh-/Ozone-Recon-Embedding (Sub-Path-/Header-Verifikation, dann nur Config erweitern) | [ ] offen — Backlog |

## Sprint-Spiegel S138 (Workspace-Terminal, 27.9.2026 — docs/sprints/SPRINT-138-WORKSPACE-TERMINAL.md; Branch feat-workspace-terminal)

Operator-Sicherheitsentscheidung: ECHTER Workspace-Terminal im Browser via `docker exec` in den gVisor-Container — KEIN SSH auf den Host, NIEMALS. GET /api/workspaces/{id}/terminal (WebSocket, Session-Auth auch via `?token=`), Ownership-Gate: Workspace-Owner ODER Admin (fail closed). xterm.js-Modal (WorkspaceTerminal.tsx), Resize-Frames, Copy/Paste, Ctrl+C durchgereicht; Container-Down → ehrliche Meldung "workspace container not running — deploy first".

| Nr | Task | Status |
|---|---|---|
| S138-1 | Backend `gateway/terminal.go`: WS-Upgrade + ContainerExecCreate/Attach (Docker SDK v28.5.2, TTY), /bin/bash→/bin/sh-Fallback, bidirektionales Pumpen, ehrliche Fehler-Frames, 20s-Ping | [x] erledigt — go build RC 0, vet gateway clean, 2 Unit-Tests |
| S138-2 | Ownership-Gate `terminalAccessAllowed` (X-JiMesh-Identity-*, INGRESS-DERIVED-ONLY): Owner/Admin; Shared-Workspace = Admin-only | [x] erledigt — 13 Gate-Fälle getestet |
| S138-3 | Route-Registrierung gateway.go + go.mod: docker/docker nachgetragen (war nicht drin), gorilla/websocket wiederverwendet | [x] erledigt |
| S138-4 | Frontend WorkspaceTerminal.tsx (xterm.js 6 + addon-fit, WS-Protokoll binary/text), WorkspaceDetailPage-Button (ersetzt den Fake-"SSH Shell"-Toast), Sidebar-Workspace-[T] öffnet Exec-Modal (deployed) bzw. BrowserRuntimeModal-Fallback | [x] erledigt — 7 Protokoll-Tests + 1 Sidebar-Reachability-Test |
| S138-5 | i18n: terminal.*-Gruppe + wsDetail.openTerminal (sshShell entfernt), en+de übersetzt, Rest backfill (60 Locales) | [x] erledigt — check:i18n 60/2905 |
| S138-6 | Docs: API_DOCS-Route, Sprint-File, dieser Spiegel | [x] erledigt |
| S138-7 | Live-Smoke am laufenden Stack (Operator klickt [T] in der Sidebar / Open Terminal auf der Detail-Page) | [ ] offen — Operator |

## Sprint-Spiegel S138 (Sidebar-V2-Fixes, 27.9.2026 — docs/sprints/SPRINT-138-SIDEBAR-V2-FIXES.md; Branch sidebar-v2-fixes)

4 live gemeldete Operator-Fixe an der S137-Sidebar (HierarchySidebar.tsx); lib/global-scope.ts, ScopeSelectorModal.tsx und die API-Fläche unberührt.

| Nr | Task | Status |
|---|---|---|
| S138-1 | FIX 1: [+]-Button in Sektions-Headern auf Zeilen-Item-Metrik (px-2 py-1.5 text-sm) — kein Mini-Button neben vollgroßen Zeilen | [x] erledigt — tsc A/B 478→478/0 neue |
| S138-2 | FIX 2: Scope-Bar GANZ UNTEN (Reihenfolge B→C→D→E→Scope), mt-auto + sticky bottom-0 am Sidebar-Boden, Popover öffnet nach oben (side="top"); Chips entfernt — die Bar zeigt nur die Zusammenfassung | [x] erledigt |
| S138-3 | FIX 3: Baum = Multi-Select-Scope-Selector — Projekt-/Server-Label-Klicks togglen selectedServerIds/selectedProjectIds über setGlobalScope (derselbe Writer wie der Popover, leer = clear), Highlight bg-primary/15 + Check + aria-pressed, Chevron expandiert, Workspace-Klick ohne Scope-Change; Single-Form-Anker einer Page zählt als Auswahl mit | [x] erledigt — Sidebar-Suite 31/31 (10 neue Tests: Multi-Select, Highlight, Bottom-Bar, [+]-Metrik) |
| S138-4 | FIX 4: Jede Workspace-Zeile trägt IMMER sichtbare [Terminal]/[Files]-Icons — Terminal: Shell-Tunnel oder BrowserRuntimeModal-Deploy-Fallback (Workspace-Projekt-Kontext), Files: echtes FileBrowserModal auf dem registrierten Node ab project.workspacePath (useSshEndpoints für volles SshEndpoint-Row), sonst ehrliche Toasts | [x] erledigt — Terminal→Modal, Terminal→Tunnel(3080), Files→/api/ssh/explore-Body verifiziert; Voll-Suite 306/306 |
| S138-5 | i18n: 4 neue sidebar.*-Keys (badge.files, terminalRequiresContext, filesRequireEndpoint, filesPathCopied) — en+de von Hand, 58 Locales via scripts/i18n-translate.py (Google Translate) | [x] erledigt — check:i18n-Ergebnis im Sprint-File |
| S138-6 | Docs: SPRINT-138-File, Backlog-Spiegel hier; API_DOCS unverändert (keine Route berührt); pre-existing FileBrowserModal-Title-Bug (t(key,fallback)-Muster) als Fund notiert, nicht gefixt | [x] erledigt |
| S138-7 | Live-Smoke am laufenden Stack (Operator prüft die 4 Fixes im GUI) | [ ] offen — Operator |

## Sprint-Spiegel S138 (Workspace-Multi-Tenancy, 28.9.2026 — docs/sprints/SPRINT-138-WORKSPACE-MULTITENANCY.md; Branch feat-workspace-multitenancy)

Operator-Spec „User sehen IHREN Workspace, Admins können umschalten": Nicht-Admins bekommen ihre Workspace-Identität aus dem Session-Token (sub) und sehen NUR eigene Workspaces (GET /api/workspaces, Deployment-Listen); Admins (Passwort-Operator / Keycloak jimesh-admin) schalten per `X-Workspace-Scope: <workspaceId>`-Header auf fremde Workspaces um — geprüft über die EINE OPA-Engine (`policy.IsAdminXWorkspaceScope`), Fremd-Scope ohne Admin = 403, eigener Workspace = No-Op erlaubt, unbekannt = 404. Frontend: admin-only Workspace-Switcher in der Sidebar (Sektion A), „Viewing as: <Name>", Header automatisch auf jedem apiFetch-Call, Logout räumt auf.

| Nr | Task | Status |
|---|---|---|
| S138-1 | Backend Policy: `internal/policy/workspace_scope.go` — `IsAdminXWorkspaceScope` über die bestehende OPA-Engine (Workspace-Lifecycle-Frage POST /api/workspaces; Nil-Engine fail-closed) + pure Rego-Tests | [x] erledigt — 2 Tests / 9 Fälle PASS (golang-Container, echt) |
| S138-2 | Middleware (`internal/auth/auth.go`): `X-Workspace-Scope` lesen → Admin-Check → `X-JiMesh-Scope-Workspace-Id` setzen; 403/404-Semantik; `X-JiMesh-Identity-Admin` einmal pro Request ausgewertet; beide Header ingress-stripped; `/api/auth/status` → `isAdmin` | [x] erledigt — 7 Whitebox-Tests (Skip ohne Postgres, laufen via make go-test) |
| S138-3 | Tenancy in den Workspace-Listen: GET /api/workspaces (Scope → nur der eine; Nicht-Admin → eigene via `ListWorkspacesOwnedByIdentity`, beide owner_user_id-Formen; `?all=1` = Admin-Override fürs Switcher-Inventar), GET /api/deployments + /api/projects/{id}/deployments (gleicher Filter, Store-Fehler fail-closed), /api/users/{sub}/workspaces + /users/{sub}/projects für Admins geöffnet | [x] erledigt — go build/vet RC 0 |
| S138-4 | Frontend: `lib/workspace-scope.ts` (localStorage `jimesh.workspace-scope`), apiFetch-Header auf JEDEM Call, Logout-Reset + Self-Heal auf `workspace_scope_denied` (typisierter Fehler aus dem Backend), `WorkspaceSwitcher.tsx` (nur bei isAdmin), Sidebar-Sektion-A-Einbau, „Viewing as", Query-Invalidierung, 8 i18n-Keys × 60 Locales | [x] erledigt — Vitest 309/309 (12 neu + 1 Guard), tsc A/B 478→478 (0 neue), check:i18n 2901 Keys |
| S138-5 | Docs: API_DOCS (auth/status, neue Multi-Tenant-Sektion, Deployment-GETs, users/{sub}), Sprint-File mit ehrlicher Verifikation, dieser Spiegel | [x] erledigt |
| S138-6 | Live-Smoke am laufenden Stack (curl-Scope-Wechsel + visuelle Switcher-Prüfung) | [ ] offen — Operator (Stack down in dieser Umgebung; exakte Befehle im Sprint-File) |

## Sprint-Spiegel S137 (Sidebar-UX-FINAL, 27.9.2026 — docs/sprints/SPRINT-137-SIDEBAR-UX-FINAL.md; Branch sidebar-ux-final)

Vorlage docs_dev/SIDEBAR-UX-FINAL-CONCEPT.md (Operator-freigegeben): zwei PARALLELE Baum-Sektionen (ALL SSH TARGETS + PROJECTS, je einklappbar), echte Namen statt UUIDs (§8.3b), EINE kompakte Scope-Bar mit Popover darüber, Aktions-Badges + [+ App]-Quick-Deploy an den Zeilen, Events & Observability nach unten. lib/global-scope.ts und ScopeSelectorModal.tsx unangetastet; bestehende Detail-Seiten unverändert.

| Nr | Task | Status |
|---|---|---|
| S137-1 | K1/K2/K3: Layout-Buttons + Entity-Filter + `jimesh.sidebar-view-mode`/`jimesh.sidebar-entity-filter` entfernt; Level-Modal-Kaskade → EINE Scope-Bar (Zusammenfassung + Popover mit BEIDEN Achsen als Checkbox-Bäume + Chips; Apply → setGlobalScope Multi-Arrays, leer = clear); EIN neuer Persistenz-Key `jimesh.sidebar-collapsed` für Sektionen+Zeilen | [x] erledigt — tsc A/B 478→478/0 neue |
| S137-2 | P2: Sektionen B/C parallel (Servers default zu, Projects default offen), §8.3b-Workspace-Namen (my project workspace / company workspace / echter User-Name via /api/users+auth, sonst Raw-ID), Gegenachsen-Tags, Unassigned-Bucket nur wenn belegt, Empty-States mit Onboarding-/Create-/Register-Einstieg (A4) | [x] erledigt — Sidebar-Suite 21/21 |
| S137-3 | A1/A2/A5: App-Badges [T][L][C][W][V][D] nur aus echten interfaces/framework der Deployment-Row ([T] Tunnel 3080/vnc/code-server bzw. BrowserRuntimeModal-Fallback, [L] ContainerLogViewer-Dialog, [C]/[W]/[V] Tunnel-iframe-Dialog, [D] → /sessions), [+ App] → WorkspaceDeployAppDialog (DSH-Default), [⚙] auf Server-/Project-Zeilen, Status-Punkte echt/grau ehrlich; K4/A6: Events unten, zu, echter SIEM-Count; K7: Deploy = Zeilen-Aktion | [x] erledigt — Voll-Suite 296/296 |
| S137-4 | K1/K2-Folge: NewProjectDialog-Preselect von den toten Keys auf den GLOBAL SCOPE umverdrahtet (kind 'ssh' + sshEndpointId, Stale-ID → 'All Servers'); Test-Suite scope-getrieben umgestellt | [x] erledigt — NewProjectDialog-Suite 6/6 |
| S137-5 | i18n: 17 neue sidebar.*-Keys in ALLEN 60 Locales (39 echt übersetzt inkl. de, 21 en-Fallback nach S55/S135-Standard); en.json-Deduplikation des doppelten projects.newProject-Keys als Nebenwirkung | [x] erledigt — check:i18n grün (60 Locales, 2893 Keys) |
| S137-6 | Docs: SPRINT-137-File, Backlog-Spiegel hier, ARCHITECTURE.md §8.5 Sidebar-Teil (parallele Sektionen statt Dual-Toggle; Detailseiten-Dreifachansicht bleibt offen), Konzept-Statusnote; API_DOCS unverändert (keine Route berührt) | [x] erledigt — dieser Nachtrag |
| S137-7 | Nicht umgesetzt (Konzept-getreu): WP0/WP4 Selection-Mode + Selection-Bar (Audit vor UI), A3 Auto-Deploy-Checkbox (Deploy-Endpoint-Stand #128), A9 Suchfeld („optional, WP zuletzt") | [~] zurückgestellt — Follow-up |
| S137-8 | Live-Smoke am laufenden Stack (Visuelle Prüfung der Flows F1–F5 durch den Operator) | [ ] offen — Operator (Stack down in dieser Umgebung) |

## Sprint-Spiegel S136 (WAF-Matrix + DLP-Live-Inspector, 27.9.2026 — docs/sprints/SPRINT-136-WAF-MATRIX-DLP-INSPECTOR.md; Branch feat-waf-dlp)

Design-Audit P1 — Backlog #082 (Exposed-Ports-WAF-Matrix) + #172 (DLP „Live Inspector"): reine Frontend-Arbeit auf bereits existierenden Backend-Endpunkten, kein neuer Backend-Endpoint wird erfunden (Mandat 2).

| Nr | Task | Status |
|---|---|---|
| S136-1 | WAF-Matrix (#082): `WafMatrixPage` (`/security/waf-matrix`) — Rows=Ports aus dem ECHTEN Exposure-Scan (GET /api/security/exposure?`all=1` bzw. ?project=), Columns=WAF/Rate-Limit/Geo; WAF-Badge „aktiv" NUR wenn der Scan den Port beim Coraza-Sidecar `jimesh-waf-*` (Image `jimesh-waf`) publiziert sieht (deploy: projects_ssh.go wafRunCommand — der Sidecar hält die einzige -p-Publikation); Rate-Limit/Geo ehrlich „inaktiv" mit code-verifizierter Begründung (Sidecar shippt nur OWASP-CRS, kein rate_limit — cmd/waf-sidecar/Caddyfile; Geo existiert nirgends, firewall_rules.go validiert Source nur IP/CIDR); Workspace-Join über GET /api/workspaces (nameKey=wsId, TASK-037) | [x] erledigt — WafMatrixPage.test.tsx 2/2 (Sidecar-Port=aktiv, Rest inaktiv, 0-of-N-Notiz); tsc A/B 0 neue Fehler |
| S136-2 | Erreichbarkeit (Mandat 14): Route in App.tsx, Security-Nav-Eintrag (ShieldCheck, hinter Exposure), Command-Palette-Eintrag (p-waf-matrix), Link von der SecurityExposurePage; Mock-WorkspaceWAFSection (hartcodiert „Active (Filtering)" + Fake-24h-Counter — exakte Mandat-2-Verletzung) gelöscht und durch ehrlichen Link-Karte auf die Matrix ersetzt | [x] erledigt — Klick-Pfad: Security-Tab → WAF-Matrix; Exposure-Page → „WAF-Matrix öffnen" |
| S136-3 | DLP-Live-Inspector (#172): Sektion auf der DlpSettingsPage — LIVE-Hook-Status (GET /api/settings/dlp_enabled, 10s-Poll = exakt der Zustand, den dlpScan() konsultiert; externe POSTs/Restart-Load zeigen live) + ehrliche Notiz „DLP event stream requires backend endpoint": der Hook wendet Verdicts in-place an und persistiert KEINE per-event-Records; Blocks landen nur als decidedBy='dlp' im Tool-Call-Ledger (Link auf /sessions), Redaktionen hinterlassen keine Event-Zeile — KEINE Mock-Zeilen | [x] erledigt |
| S136-4 | i18n: 55 neue Keys (44 wafMatrix.* + 10 dlp.inspector* + nav.wafMatrix) — en + de echt übersetzt, 58 Locales en-Fallback via scripts/backfill-i18n.mjs (S55-Standard); die Locale-Dateien führen zusätzlich 17 sidebar.*-Keys der live laufenden Parallel-Session mit (shared Checkout, s. Sprint-File Parallel-Kollision) | [x] erledigt — check:i18n grün (60 Locales, 2893 Keys) |
| S136-5 | Docs: Sprint-File SPRINT-136, Backlog-Spiegel (hier + docs_dev #082/#172), REQUESTS-TRACKING D9, API_DOCS-Consumer-Note der Exposure-Route | [x] erledigt |
| S136-6 | Live-Smoke am laufenden Stack (Matrix gegen echten Scan + DLP-Chip beim Flip) | [ ] offen — Operator (Stack down in dieser Umgebung) |

## Sprint-Spiegel S135 (Project-Server-Select, 27.9.2026 — docs/sprints/SPRINT-135-PROJECT-SERVER-SELECT.md; Branch fix-project-server-select)

Operator-Anfrage: „wieso kann man bei new project nicht den server im modal auswählen bzw ist der der aktuell ausgewählt ist" — der NewProjectDialog (S134) hatte nur ein Name-Feld.

| Nr | Task | Status |
|---|---|---|
| S135-1 | Backend: POST /api/projects nimmt den optionalen Server-Pin nodeHost/nodeUser/nodePort an (Validierung: Host ≤255, Port 0/absent→22-Default, 0-65535 sonst 400, Pin ohne Host 400) und persistiert ihn über Store.CreateProjectOnNode in die ECHTEN projects.node_host/node_user/node_port-Spalten (Mandat 3 — kein localStorage); ohne Pin bleibt Store.CreateProject (3 Spalten, Schema-Defaults) unverändert, rückwärtskompatibel | [x] erledigt — go-build/vet RC 0; Validierungs-Test (4 neue 400s) + DB-Contract-Test (Pin-Roundtrip Create→Response→GET, Port-Default 22) PASS gegen frische Wegwerf-jimesh_test |
| S135-2 | Frontend: Server-Dropdown im NewProjectDialog (useSshEndpoints → GET /api/settings/ssh_endpoints, 'All Servers'-Option, items-Registry am Select.Root damit der Trigger das LABEL der Vorbelegung zeigt — Base UI leitet Labels erst aus Popup-Items ab); Preselect = Sidebar-Modus 'server' + konkreter Server-Slot (jimesh.sidebar-entity-filter, HOST), Stale/anderer Modus/All Servers → keine Vorauswahl; Submit: Pin in den Create-Body bzw. Name-only | [x] erledigt — tsc A/B 479→479/0 neue; NewProjectDialog.test.tsx 6/6 (Preselect, Degradation, Wire-Body, manuelle Wahl), Voll-Suite 287/287 |
| S135-3 | Bonus-Fund (TASK-076-Lücken-Klasse): headscale_user fehlte im Fresh-DB-CREATE TABLE projects (Sprint-40-Spalte hing nur im stummen ALTER-Vor-CREATE-Block) → jede frische jimesh_test wäre am GetProject-Readback gescheitert; Spalte in den CREATE nachgezogen, ALTER bleibt für Legacy-Rows | [x] erledigt — Contract-Test auf FRISCHER DB jetzt PASS, Store-Paket-Suite grün |
| S135-4 | i18n: projects.createServerLabel + createServerHint in alle 60 Locales (42 echt übersetzt inkl. de/es/fr/it/pt/nl/pl/ru/uk/tr/skandinavisch/…, 18 en-Fallback via scripts/backfill-i18n.mjs — S55-Standard); 'All Servers' wiederverwendet sidebar.allServers | [x] erledigt — check:i18n grün (60 Locales, 2821 Keys); Diff-Disziplin +3/−1 je Datei, keine Churn |
| S135-5 | Docs: API_DOCS.md (POST-Zeile mit Pin-Contract), Sprint-File SPRINT-135, Backlog-Spiegel hier, docs_dev #173 | [x] erledigt — dieser Nachtrag |
| S135-6 | Live-Smoke am laufenden Stack (POST mit Pin gegen echte Session + Klick durchs Modal) | [ ] offen — Operator (Stack down in dieser Umgebung; DB-Tests liefen einmalig gegen den gestarteten, danach wieder gestoppten jimesh-postgres) |

## Sprint-Spiegel S57 (Operator-Crash-Report + Integrations-Update, 27.9.2026 — docs/sprints/SPRINT-57-OPERATOR-CRASH-INTEGRATIONS.md; Branch fix-crashes-integrations)

| Nr | Task | Status |
|---|---|---|
| S57-1 | Crash-Fix /workspaces/deployments („c.find is not a function") + /workspaces/settings („c.map is not a function"): drei Raw-Writer des geteilten ['projects']-Query-Cache (ActiveDeploymentsSection — auf /plugins gemountet, BrowserRuntimeModal, PluginInstallWizardDialog) legten das ROHE {projects:[…]}-Objekt in den Cache, den alle Workspaces-Pages als Array lesen; auf kanonische Array-Extraktion umgestellt (+ ['workspaces'] im Wizard: SSOT-Store degradierte still auf []). Die Crash-Pages selbst extrahierten bereits korrekt; ['projects'] vs ['projects-list'] ist das dokumentierte Zwei-Keys-Muster, kein Konflikt | [x] erledigt — tsc A/B 479→479 (Menge identisch/0 neue), Voll-Suite 280/280, eslint A/B 13→11/0 neu |
| S57-2 | Integrations-Page (/agents): „Connect coding tools"-Setup (npx jimesh setup-claude-Quickstart, API-Key-Reveal, 12-Tool-Katalog mit BASE_URL/API_KEY) KOMPLETT entfernt → ActiveDeploymentsSection + SubagentsPanel (bestehende echte Komponenten); data/agent-tools.json + components/agent-icons.tsx gelöscht (0 Fremd-Importer); Plugin-Katalog bleibt auf /plugins | [x] erledigt |
| S57-3 | i18n: 27 tote agents.*-Setup-Leaf-Keys aus allen 60 Locales entfernt, agents.title „Integrations" + neue Beschreibung (de echt, Rest EN-Fallback) — check:i18n grün (60 Locales, 2818 Keys); en.json chirurgisch (doppelter projects.newProject-Key) | [x] erledigt |
| S57-4 | Docs: SPRINT-57-File + Backlog-Spiegel; API_DOCS.md unverändert (keine Route berührt) | [x] erledigt |
| S57-5 | Live-Smoke am laufenden Stack | [ ] offen — Operator (Stack down) |
| S57-H | Haupt-Tree-Heilung: main@3c44204 hat via 907dde6 nur die en.json-Bereinigung — 59 Locales dort noch mit den toten Keys → check:i18n auf main ROT (59 Fehler). fix-crashes-integrations nach main mergen | [ ] offen — Operator/Merge |

## Sprint-Spiegel S55 (Sidebar-Layout-V2, 27.9.2026 — docs/sprints/SPRINT-55-SIDEBAR-LAYOUT-V2.md; Branch fix-sidebar-layout-v2)

| Nr | Task | Status |
|---|---|---|
| S55-1 | Layout-Buttongruppe OBEN statt Scope-Selector: [ By Server ] [ All Projects ] [ All Workspaces ] (Operator-Entscheidung zu glm-sidebar-scope-redesign.md) — `SidebarViewMode` 'server'/'projects'/'workspaces', Legacy-'project'→'projects' migriert; reine Anordnungs-Schalter (localStorage `jimesh.sidebar-view-mode`), berühren NIE den globalen Scope | [x] erledigt — tsc A/B 479→479/0 neue, Sidebar-Suite 11/11 |
| S55-2 | Scope-Section (docked ScopeSelectorModal + Chips, SPRINT-52 WP1) unter die Layout-Buttons gerückt, Funktionalität unverändert (globaler Scope = Data Filtering); Events & Observability VOR Navigation (Operator-Reihenfolge), beide immer sichtbar; alter 2-Wege-Toggle + ALL-Parent-Button entfernt („alles sehen" = Default jedes Modus) | [x] erledigt |
| S55-3 | Neuer Modus 'workspaces': ALLE Workspaces in EINER flachen Liste (Sortierung Project→Server→Id), jede Row mit Project-Tag UND sshTarget-Tag („Unassigned" statt rohem no_parent), Rows aufklappbar (Apps) + klickbar (Workspace-Detail), ehrlicher Empty-State | [x] erledigt |
| S55-4 | i18n: `sidebar.allProjects`/`sidebar.allWorkspaces` in alle 60 Locales (de: „Alle Projekte"/„Alle Workspaces", Rest English-Fallback wie viewByServer) | [x] erledigt — check:i18n grün (60 Locales, 2841 Keys) |
| S55-5 | Live-Smoke am laufenden Stack (visuelle Prüfung der drei Modi durch den Operator) | [ ] offen — Operator (Stack down in dieser Umgebung); Voll-Suite stattdessen grün (Nachtrag: 280/280) |
| S55-K1 | Operator-Klarstellung 27.9.: Buttons [ Server ] [ Workspace ] [ Project ] + je Modus ein Entity-Selector ('All <Axis>' oder konkrete Registry-Row) — Layout+Filter als EIN Unit, Baum gefiltert (Server→Workspaces→Apps / Workspaces→Apps / Projects→Workspaces→Apps), KEIN ScopeSelectorModal für die Anordnung; global-scope separat (Scope-Section unverändert) | [x] erledigt — Sidebar-Suite 13/13 |
| S55-K2 | Per-Mode-Selection-Slots (localStorage `jimesh.sidebar-entity-filter`), gegen Live-Registries validiert (stale id → 'All'), Auto-Expand der gefilterten Gruppe; i18n: modeServer/modeWorkspace/modeProject + allServers in 60 Locales (de echt) | [x] erledigt — check:i18n grün (2845 Keys), tsc 479→479/0 neue, eslint 0, Voll-Suite 280/280 |

## Sprint-Spiegel S134 (Project-Creation Backlog #134, 27.9.2026 — docs/sprints/SPRINT-134-PROJECT-CREATION.md; Branch fix-project-creation)

| Nr | Task | Status |
|---|---|---|
| S134-1 | Backend: POST /api/projects (handleProjectsList → GET/POST-Dispatch, neuer handleProjectCreate): `{name}` validiert (Pflicht, getrimmt, ≤255), ID `proj-`+16 Hex server-generiert, Status `stopped`, alle Deployment-Metadaten behalten Schema-Defaults (nichts erfunden, Mandat 2); Response `{success, created, project}` in der exakten GET-Shape (projectRowJSON geteilt) | [x] erledigt — go build+vet RC 0; Validierungs-Test PASS; DB-Contract-Test PASS gegen Wegwerf-Postgres (Create→Readback→GET-Sichtbarkeit) |
| S134-2 | Admin-Gate: policy.IsAdminMutation um präzises `POST /api/projects`-Match erweitert (Create-Schwester des DELETE-Gates; Sub-Path-POSTs bleiben Session-only) — Dev-Tier 403, Operator/jimesh-admin passieren | [x] erledigt — TestIsAdminMutation PASS mit neuen Asserts |
| S134-3 | Frontend: NewProjectDialog (Name-Feld → POST → invalidate BEIDER Project-Caches ['projects'] + projectsList → Toast); „+ New Project" auf /projects (WorkspacesPage-Header + Empty-State statt Redirect-Loop) UND in der Sidebar (Baum-Abschnitt; refresht den SSOT-Baum ohne Reload) | [x] erledigt — tsc 0 Fehler in angefassten Dateien, Vitest 274/274, ESLint 0 neu (HEAD-A/B mit Kopie bewiesen) |
| S134-4 | i18n: 9 projects.*-Keys in alle 60 Locales, echt übersetzt je Sprache, {name}-Platzhalter paritätisch | [x] erledigt — check:i18n grün (60 Locales, 2839 Keys); löst damit auch den S52-R-Fremd-Fund (Roh-Key-Rendern) |
| S134-5 | Docs: API_DOCS.md (POST-Zeile + RBAC-Sektion), Sprint-File, Backlog-Spiegel, docs_dev #134 | [x] erledigt — dieser Nachtrag |
| S134-6 | Live-Smoke am laufenden Stack (POST gegen echte Session) | [ ] offen — Operator (Stack down in dieser Umgebung, kein Compose-File mehr) |

## Sprint-Spiegel S54-WS (Deploy-App-Dialog Workspace-Detail, 27.9.2026 — docs/sprints/SPRINT-54-WS-DEPLOY-APP-DIALOG.md; Branch fix-deploy-dialog)

| Nr | Task | Status |
|---|---|---|
| S54-WS-1 | Fake-Deploy-Button auf Workspace-Detail-Page (toast.info statt Dialog) → echter „Deploy App"-Dialog (components/workspaces/WorkspaceDeployAppDialog.tsx): App-Dropdown dsh/opencode/claude-code/gemini-cli/code-server/python/go/node/docker, ehrliches Mapping auf DeployRequest.framework+runtime (Runtime-Presets OHNE runtime würden KEINEN Container starten), SSH-Target-Auswahl (/api/settings/ssh_endpoints), Tools-Checkboxes, Ports nur für wirklich gestartete Interfaces, POST /api/workspaces/deploy mit workspaceId | [x] erledigt — tsc A/B 481→479/0 neue, eslint 0/0, vitest 274/274 |
| S54-WS-2 | Fehlender wsDetail.*-i18n-Block (Page renderte rohe Keys wie „wsDetail.deployContainer") + deployApp.*-Keys: en.json + 60-Locales-Backfill (de übersetzt) | [x] erledigt — meine Blöcke paritätisch; FULL-Gate rot VORBELEGT von main (59×5 #133-Keys, S52-R-i18n repariert) |
| S54-WS-3 | Live-Deploy-Verifikation am laufenden Stack (make restart-backend + Deploy-Click) | [ ] offen — Operator |

## Sprint-Spiegel RM25 (jimesh-crew als jimesh-Plugin, 26.9.2026 — docs/sprints/SPRINT-RM25-CREW-PLUGIN-MANIFEST.md; Crew-Repo: jimesh-crew/docs/planning/sprints/rm25_jimesh_crew_plugin_manifest.md)

| Nr | Task | Status |
|---|---|---|
| RM25-1 | `plugin.yaml` (Manifest v1) im jimesh-crew-Repo: alle Pflichtfelder (id/name/version/surfaces/authSupported/security.egress+capabilities) + optionale Felder; gegen Go-Schema (`ParsePluginManifest`, golang-Container) und `docs/plugins/plugin.schema.json` (AJV) validiert — beides VALID, Schema-Tests grün | [x] erledigt |
| RM25-2 | Draft-Korrekturen (crew-Doc): icon → Lucide `users` (crew-icon.svg existierte nicht); requiredSecretScopes → `secrets:read:<name>`-Konvention (keine Scope-Taxonomie im Backend, grep-verifiziert); egress um gateway.discord.gg + cdn.discordapp.com | [x] erledigt |
| RM25-3 | Plattform-Stopgap: `jimesh-crew` als 4. Catalog-Eintrag (gateway/plugins.go) — `GET /api/plugins` listet es; API_DOCS-Katalog-Zeile synchronisiert | [x] erledigt |
| RM25-4 | Echte Installation offen: kein Manifest-Ingestion-Pfad (`ParsePluginManifest` hat 0 Aufrufer außer Tests), `POST /api/plugin-installations` persistiert nicht (TASK-103-Schuld), keine `/api/plugins/jimesh-crew/*`-Routen, kein Health-Probe, kein service_account-Flow, kein Widget | [ ] offen |

## Sprint-Spiegel S53 (TIER-2 Post-Audit-Fixes #154/#148/#152/#171, 21.9.2026 — docs_dev/sprints/SPRINT-53-TIER2-POST-AUDIT-FIXES.md; Issue-Nummern siehe docs_dev/backlog/BACKLOG.md #142–172)

| Nr | Task | Status |
|---|---|---|
| S53-1 | #154 NetworkEditingGrid.tsx: 0 Importer verifiziert (grep: nur eigene Export-Zeile) → Datei gelöscht; Mitanlass gelöscht: types/domain/networking.ts (einziger Importeur war die Grid, danach 0 Importer — gleiche Defektklasse, Mandat 14). Die 3 statischen Fake-Badges (gVisor Isolated/L2 Promiscuous/WireGuard Mesh, Z.77–88) + tote "Scan NICs"-Buttons (Z.31–34) starben mit der Datei | [x] erledigt — tsc A/B 538→536 (genau die 2 Grid-Fehler), 0 neue |
| S53-2 | #148 SPRINT-16-Deprecated-Hinweis: HashiCorp-Vault-Behauptungen nie real (vault_client.go 0 Aufrufer, kein compose-Service) → Banner oben in docs_dev/sprints/SPRINT-16-SECOPS-VAULT-RBAC.md, verweist auf SPRINT-39-SECRETS-ENGINE.md; Datei existiert nur im Main-Checkout (docs_dev/ gegitignored) | [x] erledigt — Claims gegen Code verifiziert |
| S53-3 | #152 14 undokumentierte Routen aus Handler-Code in API_DOCS.md nachgetragen (plugins, plugin-installations, nodes/provision, premium/key+portal, containers/{cid}/logs SSE, iac-files+scan, dlp_enabled, sse/analytics+models+traces, analytics/by-workspace, agents/logs/stream); 2 Datalake-Routen existieren nicht mehr (SPRINT-7-Removal) → nichts erfunden; Bonus: 3 Stale-Doc-Einträge korrigiert (/api/streams/logs 2× → echte Route /api/agents/logs/stream, GET→POST agents/logs); POST /api/plugin-installations ehrlich als ECHO-ohne-Persistenz dokumentiert (Mandat-2-Kandidat) | [x] erledigt — jede Route am Handler gelesen |
| S53-4 | #171 (TIER-3 vorgezogen, nur Wiring) SecurityFindingsPage an den IaC-Scanner verdrahtet: 3. Quelle = Projekt-Picker + POST …/iac-files/scan + GET …/iac-files als info-Rows (source 'iac-scan', kein Dismiss — Inventar); unifyFromIacFiles+IaCFileRow in lib/security-overview.ts (source-Union um 'iac', 7 Konsumenten geprüft). Korrigierte Prämisse: Checkov-CKV-Findings erzeugt der Deploy-Quarantine-Gate und kamen schon über /api/security/events an; iac-files ist Datei-DISCOVERY — beides jetzt sichtbar und ehrlich getrennt | [x] erledigt — eslint 0, tsc 0 neue, keine i18n-Keys nötig |

## Sprint-Spiegel TIER-2-Frontend-Audit (#150/#168/#169, 21.9.2026 — docs_dev/sprints/SPRINT-52-SIDEBAR-SCOPE-MULTISELECT.md § TIER 2)

| Nr | Task | Status |
|---|---|---|
| T2-#150 | Vier tote 404-Calls: playground-conversations-Wrapper (/api/conversations nie existent) entfernt; lib/logs.ts + Test gelöscht (Phantom-Ringbuffer, kein Caller); keys/shared.tsx Chat-Delete auf reales /api/models/{id}; custom-provider-section Fake-POST /api/media/custom entfernt (Backend speichert keine Custom-Media-Modelle, DELETE ehrlicher 501); API_DOCS-Media-Anhang-Phantom-Routen korrigiert | [x] erledigt — Commit 9200883 (Operator); tsc 0 neu, i18n-Parität nachgezogen |
| T2-#168 | PluginInstallWizardDialog: Fake-Test-Connection (600ms → "Handshake verified 18ms TLS 1.3") entfernt (keine Verify-Route im Backend — ehrlicher Hinweis), Fake-API-Key '.....39fa' geleert, "Pre-flight 4/4"/"Vault KMS Unsealed"/hartcodierte Capabilities durch reale Summary ersetzt, Scope-Karten auf echte GET /api/workspaces + GET /api/projects-Zeilen umgestellt, Phantom-Import DialogContent→DialogPopup behoben | [x] erledigt — Working Tree (nicht committet); tsc 509→484/0 neu, vitest 275 grün |
| T2-#169 | PluginSettingsPage tote Buttons (Save/Discard/Sideload): Nachprüfung — bereits in der #145-Runde (d896849) entfernt, alle Buttons verdrahtet, 0 tsc-Fehler | [x] erledigt — nur Verifikation, keine Änderung nötig |
| T2-i18n | 3 Fake-Keys (plugins.officialVerified/testConnection/handshakeVerified) aus 60 Locales entfernt; 7 neue ehrliche Wizard-Keys + keys.customMediaUnsupported in alle Locales backgefüllt | [x] erledigt — check:i18n grün (60 Locales, 2800 Keys) |
| T2-Backend-Schuld | POST /api/plugin-installations ECHOT ohne Persistenz, GET antwortet immer [] — TASK-103 (in API_DOCS.md ehrlich dokumentiert); Backend-Tier muss echte Persistenz bauen, bevor „Installed"-Realität stimmt | [ ] offen — Backend-Tier |

## Sprint-Spiegel S52-T1 (Sidebar-Scope-MultiSelect Tier 1, 21.9.2026 — docs_dev/sprints/SPRINT-52-SIDEBAR-SCOPE-MULTISELECT.md)

| Nr | Task | Status |
|---|---|---|
| S52-T1-1 | Multi-Scope-Store: lib/global-scope.ts um selectedServerIds/selectedProjectIds/selectedWorkspaceIds/layoutMode ERWEITERT (Single-Felder bleiben — Abwärtskompatibilität), setGlobalScope beide Formen (Anchor-Ableitung kind-gefiltert), localStorage-Validierung der neuen Felder, multi-bewusste Selection-Bridge | [x] erledigt — global-scope.test.ts 7/7 (4 neue Tests, TDZ-Bug beim Persistieren gefunden+gefixt) |
| S52-T1-2 | Verwaiste ScopeSelectorModal (SPRINT-1 WP3, nie verdrahtet — Mandate-14-Fall) an HierarchySidebar angedockt: Scope-Button → Level-Menü → Modal → Apply schreibt den Multi-Scope; Chips zeigen/entfernen die Auswahl | [x] erledigt — HierarchySidebar.test.tsx 4/4 (vollständiger Klickpfad bewiesen); Modal-Fix: Projekt-Selections tragen jetzt kind 'project' statt 'workspace' |
| S52-T1-3 | Route-Renaming (Operator freigegeben): /api/workspaces/{deploy,redeploy,undeploy} + /api/servers/discover KANONISCH auf dieselben Handler (Dual-Registrierung internal/deploy/deploy.go, kein Code-Duplikat), /api/projects/* bleiben als deprecated Aliase; Frontend alle Calls umgestellt (ProjectsPage, AppDiscoveryPage, workspace-deploy-dialogs, BrowserRuntimeModal); API_DOCS kanonisch + Alias-Zeile + GET/POST-discover ehrlich | [x] erledigt — go build+vet RC=0 (Container-Kopie-Bau: /tmp ist für den Docker-Daemon unsichtbar — im Sprint-File vermerkt), tsc A/B 519→511/0 neue (normalisierter Diff; die 8 weniger stammen aus dem Parallel-Tier-0-Stream), npm-run-test-Gate 301/301 + check:i18n grün |
| S52-T1-4 | Stitch-Design-Plan Multi-Views (NUR Plan, keine Generierung): docs_dev/DESIGN-PLAN-MULTI-VIEWS.md — Server-Grouped Overview (Weg 2), Aggregated Deployments (Weg 3), Multi-Select Deploy-Dialog (Weg 1), je Zweck/Datenquellen/Layout-Skizze + Generierungs-Regeln + Reihenfolge | [x] erledigt — Tier-2-Vorlage |
| S52-Rest | WP2 Navigation-Section, WP3 Events & Observability-Umbenennung, WP4-Vollausbau (Overview-Pages auf Multi-Arrays, Stitch-Generierung) | [ ] offen — Tier 2 |

## Sprint-Spiegel S50 (Fünf Frontend-Routen mit vorhandenem Backend, 21.9.2026)

| Nr | Task | Status |
|---|---|---|
| S50-1 | App-Discovery-Result-Page `/projects/discover` (POST /api/projects/discover, deploy.go:52): Discover-Button + Card-Liste (Name, Framework/Typ, Ports, Status) + echte VLAN-Zuordnung je Projekt (GET /api/projects/{id}/vlan) + Node-Health des Scan-Nodes; Nav `nav.appDiscovery` | [x] erledigt — AppDiscoveryPage.tsx, Route App.tsx:724, Commits 3dfb7ba/d04512e |
| S50-2 | Deployment-Detail-Page `/workspaces/deployments/:projectId/:deploymentId` (GET/POST …/deployments/{depId}, deploy.go:72-73): Status-Timeline aus dem echten Status-Werteraum, Interfaces aus der P0-4-Row, Redeploy-Mutation, Row-Klick in WorkspaceDeploymentsPage navigiert hierher | [x] erledigt — DeploymentDetailPage.tsx (Route App.tsx:719), Liste verdrahtet (navigate + stopPropagation, Registry-Key projectDeploymentDetail) |
| S50-3 | SSH-Target-Detail-Page `/workspaces/targets/:targetName` §8-Modell: Registry-Eintrag (GET /api/settings/ssh_endpoints) + ALLE Workspaces mit passendem sshTarget-Freitext-Label (GET /api/workspaces, client-side) — NICHT das alte invertierte Modell; Links von Endpoints-, Workspaces- und Workspace-Detail-Seite | [x] erledigt — SSHTargetDetailPage.tsx (Route App.tsx:728), 3 Klickpfade verdrahtet |
| S50-4 | OTel-Trace-Detail `/security/traces`: ehrliche „Tracing not yet implemented"-Seite (AUDIT F-05: Spine ohne Call-Sites, kein Export, keine Route) statt Wasserfall-Fiktion; Nav `nav.traces` | [x] erledigt — TracesPage.tsx (App.tsx:668) |
| S50-5 | Browser-Integration: Nav-Eintrag `nav.browserIntegration` auf die ECHTE Fläche (BrowserRuntimeModal auf der Deployments-Page, `?browser=1` öffnet es einmalig) — keine erfundene Page | [x] erledigt — section-nav.ts:126 + WorkspaceDeploymentsPage browser-Param-Effekt |
| S50-6 | i18n: alle neuen Keys (appDiscovery/deploymentDetail/sshTargetDetail/traces/nav.×/browserRuntime-Complete-Set) in 60 Locales + gechlte pre-existing Lücken (sidebar.noWorkspaces/newWorkspace, nav.pluginCatalog/pluginSettings/proxyOverview/proxyChains/firewallSetup/firewallTraffic/firewallOpnsense — teils rohe Keys in der UI) | [x] erledigt — check:i18n grün (60 Locales, 2788 Keys) |
| S50-7 | Verifikation: tsc A/B 553→552 (0 neue, inzwischen 522 — Tier-0-Stream reduziert weiter, keiner in den 5 Routen), go build+vet grün (nach Stash-Pop-Kollateralfix deploy.go/user_provisioning.go), section-nav-Test geheilt | [x] erledigt — siehe SPRINT-50-FRONTEND-ROUTES.md |
| S50-8 | Nachzugsrunde: 6 pre-existing Test-Fails geheilt (TeamBindingsPanel: QueryClientProvider — Panel trägt seit B15 eine echte useQuery; SubagentsPanel: MemoryRouter für den Session-Link) → npm-run-test-Gate erstmals GESAMT grün (29 Dateien/293 Tests, i18n 60 Locales) | [x] erledigt — Commit 0e26fd3 (Parallel-Stream übernahm die Test-Fixes) |
| S50-9 | 0e26fd3-Kollateral behoben: shellQuotePath an einzigen Consumer (iac_discovery.go) umgezogen — HEAD kompilierte nach dem SSH-Explore-Duplikat-Removal nicht | [x] erledigt — Working Tree |
| S50-10 | Sprint-51 #130 Follow-up: X-JiMesh-Identity-Sub (Middleware setzt VERIFIZIERTEn sub; Strip-Liste um Identity-Source/Roles/Sub vervollständigt — SDK-Zweig-Spoofing-Fenster zu; callerSubFromRequest liest Sub statt Roles → Self-Service-Workspaces-Scope funktioniert) | [x] erledigt — Working Tree; build+vet grün, kein eigener Unit-Test (ehrlich dokumentiert) |

## Sprint-Spiegel S7 (Ghost-Route-Cleanup P2, 20.9.2026)

| Nr | Task | Status |
|---|---|---|
| S7-WP1 | 14 Backend-Geister-Routen (GHOST-AUDIT B.2) urteilen: 2× LÖSCHEN — GET /api/hierarchy (0 Referenzen, fabrizierte Bindings) + GET/POST /api/settings/provider-credentials (0 Referenzen, Klartext-OAuth-Tokens in settings) inkl. Handler, Schema-Typen und FE-Orphan-Typ | [x] erledigt — Commit af9dc75 (wt-p2-ghost-routes), make go-build+go-vet grün, tsc A/B 461=461/0 neu |
| S7-WP2 | 6 echte Doku-Lücken schließen (aus Handler-Code): /api/plugins/jules/sources (+Familie), /api/auth/sessions ×3, /api/agents/analytics/summary | [x] erledigt — Commit 8479c95; 6 weitere der 14 waren bereits dokumentiert (Audit-Extraktionsfehler, siehe Sprint-File) |
| S7-WP3 | /api/sdk/logs-Doppelregistrierung: Gateway-vs-Edge-Abgrenzung dokumentieren, Router unangetastet | [x] erledigt — API_DOCS SDK-Sektion (Edge = POST-only 202 at-least-once auf 127.0.0.1:3100, Router-Doku bleibt cmd/jimesh-router/README.md) |
| S7-WP4 | Doku-Sync: BACKEND-INTEGRATION-PLAN hierarchy-Zeile (❌ NEU), SPRINT-7-GHOST-ROUTES-P2.md, Backlog-Spiegel | [x] erledigt — dieser Commit |

## Sprint-Spiegel S1–S4 (Stitch-Design-, Security- & RBAC-Sprints — WIP-Stash wieder eingeordnet, Stand 21.9.2026)

| Nr | Task | Status |
|---|---|---|
| S1-WP1 | Stitch-Designs erstellen (56 Screens!) | [x] erledigt (Stitch-Projekt 18208781056688578837) |
| S1-WP2 | Design-Assets in JiMesh importieren | [~] Plugin-System designed, Backend offen |
| S1-WP3 | Scope-Fundament (Component-Schema + Multiauswahl + ScopeSelector) | [~] in Arbeit — Schema-Typen + SelectionSet + OverviewGrid erledigt (siehe Sprint-File WP3) |
| S1-WP4 | Brand/Logos | [~] 483 Icons katalogisiert (ICON-REGISTRY), JiMesh-Logo offen |
| S2-WP1 | Deploy-Persistenz (Deployment-Rows + Interfaces) | [x] erledigt — siehe S2-WP1-Spiegel unten (P0-4, Commits 17db45f, 52fdc42): deployments-Tabelle interfaces+workspace_id, UpsertDeployment, Undeploy/Redeploy-Statuswechsel |
| S2-WP2 | Apps & Deployments UI | [~] teilweise — Deployment-Detail-Route (/workspaces/deployments/:projectId/:deploymentId mit Interfaces aus der Row) + App-Discovery-Result-Page (/projects/discover, POST /api/projects/discover) gelandet (SPRINT-50, Commits 3dfb7ba/d04512e); offen: Integration-Install (POST /api/apps/{id}/integrations existiert nicht), Playwright-Option |
| S2-WP3 | Team→Server-Bindings | [~] teilweise — Tabelle + GET/POST/DELETE /api/team-bindings registriert (gateway.go:272, OPA-Admin-Gate policy.go:98) + Teams-Page-Bindings-Tab (S4-WP1); offen: dediziertes team-bindings.rego (Route läuft über das generische Admin-Mutation-Gate) |
| S2-WP4 | IaC-Discovery | [~] teilweise — iac_files-Tabelle + GET /api/projects/{id}/iac-files + POST …/iac-files/scan registriert (deploy.go:81-82) + ProjectDetailPage-IaC-Tab; offen: GET einzelner Dateiinhalte (…/iac-files/{fileId} fehlt) |
| S3-WP1 | Vault-ACL-Fix | [x] erledigt — `GetVaultSecretACL` (store) + `agentAllowedByACL`-Enforcement in `handleVaultAccess` (403 + Audit), Tests in internal/security/vault_test.go, Legacy-Entscheid `''`/`[]`=offen dokumentiert (dieser Commit) |
| S3-WP2 | Outbound-DLP | [x] erledigt — Commit 879c9c3 (wt-s1-notifications-dlp): /security/dlp-Settings-Page + GET/POST /api/settings/dlp_enabled mit Persistenz + dlp_hook-Live-Wiring (schließt AUDIT F-04) |
| S3-WP3 | Agent-Scan (lokal) | [~] Scanner-Kern + Route erledigt — 5 deterministische Checks (W021/W008/E005/W014/E002) in internal/agentconfig/scanner.go + 33 Tests, POST /api/security/agent-scan admin-gated (internal/security/agent_scan.go + policy.go-Prefix), Consent-trap-frei (nur Parsen, keine Server-Execution), API_DOCS dokumentiert; `jimeshctl scan` offen (dieser Commit) |
| S3-WP4 | Red-Team-Suite | [ ] offen |
| S3-WP5 | OTel-Spine | [ ] offen |
| S4-WP1 | TeamsPage Resource-Bindings-Tab (v1 UI-only, Route fehlt → B15) | [x] erledigt — team-bindings-panel.tsx + Tabs, ehrlicher Empty-State (caccb6c) |
| S4-WP2 | Create-User-Dialog (echtes POST /api/users) | [x] erledigt — Dialog + Real-Wiring + Inline-Fehler (caccb6c) |
| S4-WP3 | User-Tabelle nach Design (Avatar/Roles/Status) | [x] erledigt — Roles-Badges aus /api/budgets, Realm-Rolle → B16 (caccb6c) |
| S4-WP4 | i18n-Keys + API_DOCS POST /api/users | [x] erledigt — 60 Locales, check:i18n grün (caccb6c) |

## Sprint-Spiegel S2-WP1 (Deploy-Persistenz / P0-4, 20.9.2026)

| Nr | Task | Status |
|---|---|---|
| S2-WP1 | Deploy-Persistenz (REQUESTS-TRACKING E7: executeDeploy schreibt die Rows): deployments-Tabelle interfaces+workspace_id (idempotente Migration), UpsertDeployment pro (projectId, workspaceId) statt Redeploy-Duplikaten, Undeploy/Redeploy-Statuswechsel auf stopped, interfaces in allen GETs/Responses, Regression-Tests | [x] erledigt 20.9. — Branch wt-p1-deployments (Commits 17db45f, 52fdc42 + Tests), siehe docs/sprints/SPRINT-2-APP-DEPLOYMENT-TRUTH.md WP1-Retro; go build+vet gruen, go test ./... exit=0 gegen Wegwerf-DB |

## Sprint-Spiegel S7 (GHOST-AUDIT D.4 Datalake-Removal, 20.9.2026)

| Nr | Task | Status |
|---|---|---|
| S7-WP1..WP5 | No-Mock-Verstoß Datalake auflösen: Mock-Handler + Routen /api/datalake/* + Geister-Page /dbs/datalake + tote Kette (cmd/datalaked, internal/datalake*) KOMPLETT entfernt; go.mod-Kette (prometheus) aufgeräumt; deploy/datalake-Compose bleibt als Rezept | [x] erledigt — siehe docs/sprints/SPRINT-7-GHOST-AUDIT-DATALAKE.md (Branch wt-p3-datalake, Commits 14b74aa/5319dd2/d22b8ea) |
| B3-Erbe | Echte Datalake/Debezium-Integration (Connector-Registrierung, Consumer, Lag-Messpunkt, Gateway-Abfrage, Page-Wiedereinführung) | [ ] offen — erst bauen, dann verdrahten (Mandat 14 in beide Richtungen) |

## Sprint-Spiegel S5 (Marketing-Website, 19.9.2026)

| Nr | Task | Status |
|---|---|---|
| S5-WP1..WP6 | Sprint-Plan, Logo-Assets, Tour-Assets, 1:1-Stitch-Integration in der Dashboard-SPA, Public Routes vor AuthGate, Verifikation+Push | [x] erledigt — siehe docs/sprints/SPRINT-5-MARKETING-WEBSITE.md (Commits dfbb2cb, 891634b, 2991703, c51e88d, 3e3a381, 121a729) |
| S5-WP7 | Stitch-Pages 1:1 integrieren (website-landing/docs/tour.html aus 40baa72 als Design-Quelle) | [x] erledigt — Landing/Docs/Tour 1:1 nachgebaut, echte Screens in der Tour, Palette/Typo 1:1 (3e3a381) |
| S5-WP8 | Eigenes Next.js-Frontend fuer GitHub Pages (website/, static export, deploy-website.yml) | [x] erledigt — website/ mit next.config.ts (output export + PAGES_BASE_PATH basePath + unoptimized), 3 Routes als 1:1-Stitch-Konvertierung, next/font/google, Assets in public/, Workflow nach Official-Template; build gruen, out/ verifiziert, gepusht |

## STATUS-ÜBERSICHT (15.9.2026, Jules-Audit-Update) — geplant/umgeplant/umgesetzt/offen/entschieden/slop/Integration/Frontend

| Nr | Task | Status | Kategorie | Offene Frage / Lücke |
|---|---|---|---|---|
| R41 | Dead-Code Cleanup (DiscoveryStatus.tsx + entropy_cascade) | [x] umgesetzt 15.9. (Branch `jules-1648647822100541056-44c4731e`): `DiscoveryStatus.tsx` (460 Z. Alt-Code), `getting-started.tsx`, `peak-hours-controls.tsx`, `custom-weights-popover.tsx` & Backend `entropy_cascade.go` gelöscht | umgesetzt(Jules) | Toter Code aus R39/R41 vollständig eliminiert |
| R43 | E-Priority UI & Headscale Proxy Wiring | [x] umgesetzt 15.9. (Branch `jules-1648647822100541056-44c4731e`): Headscale `/api/networks/*` Proxy angebunden, `FirewallRulesSection` (`/api/firewall/rules`) in SecurityExposurePage.tsx live | umgesetzt(Jules) | Headscale & Inbound Enforcement UI live |
| R42 | ProjectsPage Refactor (Mandat-2/3 Compliance) | [~] überwiegend umgesetzt 15.9. (Branch `jules-1648647822100541056-44c4731e`): `ProjectsPage.tsx` 2257→1300 Zeilen, Sub-Komponenten (Delete/Deployments/Sidebar), fabrizierte Terminal-Logs gelöscht, `installGVisor` auf Node-Ebene; **REST: 3 localStorage-Refs verbleiben** (vorher 6 — R44 §1b, verifiziert 15.9.) | überwiegend/REST offen | 3 localStorage-Refs → klassifizieren (084-WP1): UI-Pref ok / Persistenz-Täuschung → echte Route |
| 081 | LLM-Security-Tab + per-project Guard-Policies | [ ] geplant (SPRINT-42): AI Guard Tab mit Policies je Project (`PUT /api/llm/policies/{project}`) | geplant | Dynamic Rail Gating |
| 082 | Exposed Ports WAF Matrix & Network Surface | [x] umgesetzt 27.9. (Branch `feat-waf-dlp`, SPRINT-136-WAF-MATRIX-DLP-INSPECTOR.md, Spiegel oben): `WafMatrixPage` (`/security/waf-matrix`) — Rows=Ports aus dem echten Exposure-Scan, Columns=WAF/Rate-Limit/Geo, ehrliche aktiv/inaktiv-Badges (WAF aktiv nur beim gemessenen Coraza-Sidecar `jimesh-waf-*`; Rate-Limit/Geo dokumentierte Abwesenheit); Mock-WorkspaceWAFSection gelöscht | umgesetzt | WAF Inspection per Port — echte Rate-Limit-/Geo-Schicht bleibt Backlog, bis sie existiert |
| 083 | Tailscale Magic-Certs & App SSL Automation | [ ] geplant (R42-Refinement): Automated Tailscale MagicDNS ACME Certs (`*.ts.net`) | geplant | Cert Provisioning Flow |
| 084 | SSOT & Redundanz-Säuberung (Frontend-Backend Alignment) | [ ] geplant (P0, SPRINT-43): localStorage-Audit (nur UI-Prefs bleiben), Dead-Ends schließen (/api/subagents Progress-Panel), SSOT-Garantie (Route-Consumer-Matrix) | geplant | P0 Alignment & SSOT |
| 085 | docs_temp & OpenAPI + Static HTML GitHub Pages | [ ] geplant (P1, SPRINT-43): Public-Docs Ordner `docs_temp/`, OpenAPI Auto-Export aus Go-Engine + schlanker Static HTML Renderer (Scalar/Stoplight) für GH Pages | geplant | Public Docs Pipeline |
| 086 | Slop-Audit & React Query Store / Subscription GC | [ ] geplant (P2, SPRINT-43): React-Query Key Registry, Unsubscribe & Stale Cache GC für SSE/Polling, CI-Gate gegen tote Fetches/Routen | geplant | Frontend Store GC & CI Gate |

| 089 | Utility-Dependencies + WAF/Firewall/Network-Sections | [~] teilweise (Jules 93d3e95: Schemas+Komponenten, API-Anbindung offen) | SPRINT-MASTER-PLAN-15SEP |
| 090 | Onboarding-Flow (Welcome→Node→Firewall→Deploy, Sprint-D1) | [ ] geplant | SPRINT-D-ONBOARDING |
| 091 | jimesh_services-Overlay + Utility-Apps ausblendbar (Sprint-D2) | [ ] geplant | SPRINT-D-ONBOARDING |
| 092 | Docker-Network-Discovery + App-Discovery + React-Icons (Sprint-D3) | [ ] geplant | SPRINT-D-ONBOARDING |
| 093 | App-Discovery: Docker Hub API + Compose-File-Scan | [ ] geplant | SPRINT-D-ONBOARDING |
| 094 | Aikido Zen als Third-Party-Firewall-Interface | [ ] geplant | TASK-100-WP5 |
| 095 | Workspace-Sidebar final (WAF+Firewall+Networks+Security Sections) | [ ] geplant | TASK-089 |
| 096 | Security-Page-Integration (Workspace→App→Section, kein iframe) | [ ] geplant | TASK-089-WP4 |
| 097 | OpenAPI-Pipeline (huma/openapi.go → /openapi.json → Scalar) | [ ] geplant | TASK-085 |
| 098 | Networking-Tab Vollausbau (VLAN-Farben/IPs/Schemas, React-Grid, Scanopy-Audit, App-Icons) | [~] teilweise (Jules 9e9b42b+14fc705: Grid+Schema, echte VLAN-Daten fehlen) | TASK-098 |
| 099 | Vault/Secrets-Konsolidierung (4→1: secrets-Tabelle, /api/secrets, Scope-Selector) | [ ] geplant | TASK-099 |
| 100 | Workspace-Settings-Inheritance (Project-Selector, Utility-Settings, Network-Vererbung, Auth-Settings-UI) | [ ] geplant | TASK-100 |
| 101 | CI-Fix: Workflows von Legacy-Tier entkoppeln (⚡ P0) | [ ] geplant | TASK-101 |

| 106 | Plugin-Manifest-Spec v1 (plugin.yaml + JSON-Schema + Lifecycle) | [x] umgesetzt: `docs/plugins/SPEC.md`, `docs/plugins/plugin.schema.json`, `scripts/validate-plugin.mjs`, `plugin_manifest.go` Go schema + unit tests, CI validation step wired | TASK-PLAN-PLUGIN-SYSTEM |
| 107 | Plugin-Registry-API (dynamischer Catalog, Health, Events) | [ ] geplant | TASK-PLAN-PLUGIN-SYSTEM |
| 108 | Auth-Connector-Framework (api-key/service-account/both + ad1-OAuth) | [ ] geplant | TASK-PLAN-PLUGIN-SYSTEM |
| 109 | Secret-Scope-RBAC + Service-Accounts + Workspace-Tokens + OPA | [ ] geplant | TASK-PLAN-PLUGIN-SYSTEM |
| 110 | Frontend-Surface-Renderer (iframe/native/widget/chat + globales Chat-Panel) | [ ] geplant | TASK-PLAN-PLUGIN-SYSTEM |
| 111 | OpenClaw-Plugin (Security-Wrap-Flagship + Deployment-Research) | [ ] geplant | TASK-PLAN-PLUGIN-SYSTEM |
| 112 | Gmail-Plugin (ad1-Pattern, readonly+send, Q10-Nachbau) | [ ] geplant | TASK-PLAN-PLUGIN-SYSTEM |
| 113 | Agent-Connector-Family: Gemini-CLI + OpenCode + Claude-Code (nach Q8-Call; OHNE leobot) | [ ] geplant | TASK-PLAN-PLUGIN-SYSTEM |
| 114 | Docker-MCP-Hub-Plugin (nur Katalog, nie Docker-Auth) | [ ] geplant | TASK-PLAN-PLUGIN-SYSTEM |
| 115 | Browser-Automation Digest + Artikel | [ ] geplant (parallel, keine Deps) | TASK-PLAN-PLUGIN-SYSTEM |
| 116 | Plugin-Dev-Docs + SDK + Q10-Abnahme | [ ] geplant | TASK-PLAN-PLUGIN-SYSTEM |
| saits-P1 | saits-crew Rebuild: Public Repo, Discord-frei, Message-Broker (Redis Streams) | [ ] BACKLOG — Quell-Basis erst klären | Operator-Korrektur 16.9. |
| saits-P2 | saits-crew eigene Widgets (Web-Dashboard) | [ ] BACKLOG | nach saits-P1 |
| saits-P3 | saits-crew als JiMesh-Plugin (SA-Auth Bybit, VLAN+WAF) | [ ] BACKLOG | nach P1+P2+Wave1 |
| 102 | Suricata + Network-Anomaly-Tab (P1 Sicherheitslücke) | [ ] geplant → **Sprint S189 (7.10.): WP1 Tabs-Umbau, WP2 Suricata-Betrieb (heute Route ohne Prozess), WP3 Anomaly-Tab — docs/sprints/SPRINT-189-NETWORK-TABS-SURICATA-ANOMALY.md** | TASK-102 |
| R44-087 / TASK-105 | Datalake-as-a-Service (Kafka/Ozone) | [~] Minimal-Pfad ECHT umgesetzt (SPRINT-55, Branch feat-datalake-ozone, 28.9.): cmd/datalaked konsumiert jimesh.*-Kafka-Topics (franz-go, at-least-once, idempotente Keys) und schreibt jedes Event 1:1 als JSON nach Apache Ozone (aws-sdk-go-v2, BaseEndpoint auf den deploy/ozone/-S3G); GET /api/datalake/status zeigt echte activePipelines/lastSyncedAt (Proxy auf datalaked :7620); DatalakePage nav-erreichbar (/dbs/datalake, DBs-Tab). ENTSCHEIDUNG: Debezium/Kafka-Connect (JVM) gefallen gelassen — pure-Go-Pfad (pglogrepl/internal/cdc + kafkabridge + datalaked) ist offiziell; Debezium/MinIO/OpenSearch aus deploy/datalake entfernt (Rezept im Git-Verlauf). Offen (Folge-Sprints): Deploy durch Operator (IaC) + Live-Beweis im Sprint-File, Transform-Schicht, weitere Sinks (OpenSearch columnar, Postgres-Sync), AutoDiscovery/BackupEngine (R44-Vision) | R44-datalake-concept + TASK-105 + SPRINT-55 |
| R44-088 | DB/Cache Auto-Discovery + Backup-Engine | [ ] reines Konzept, 0 Code — ans Ende (bleibt R44-Folge-Sprint; der SPRINT-55-Minimal-Pfad (087) braucht ihn nicht — die jimesh.*-Topics existieren bereits via kafkabridge) | R44-datalake-concept + SPRINT-55 |
| 032 | SIEM-Foundation | [~] TASK-054 (14.9., live verifiziert): Stack B+C in `deploy/siem/` — Wazuh 4.14.7 + Falco 0.41.3 + siem-bridge (`internal/siem/`, `cmd/siem-bridge/`), opt-in profile `siem`, alle 5 Services healthy; Falco-Events + Wazuh-Alerts → `/api/sdk/logs` (alias=wazuh\|falco, curl-verifiziert); E-SIEM-1..5 nach SPRINT-32-Defaults implementiert (30d-ISM live angewendet) | umgesetzt(Kern)/offen(Reste) | Operator-Bestätigung der E-SIEM-Defaults ausstehend; offen: WP1-Shipper (JiMesh→Wazuh), WP3-Wazuh-Ruleset, security_events-Mapper (WP2-Delta), make siem-Targets; Suricata-XDP ehrlich v2-Platzhalter, OpenSearch ehrlich Approach D (SPRINT-33)/E-BYOL → **Sprint S188 (7.10.): alle vier Reste mit Belegen aufgenommen (Rauschen 4.662 vs. 12, kein Falco-`<localfile>`, `internal/opensearch` = 0 Importe) — docs/sprints/SPRINT-188-SIEM-INGEST-RAUSCHEN-INDEXER-MAPPER.md** |
| 033 | K-LAF-AWS-Multi-Provider | planned | geplant | O1-O5 ausstehend; OpenSearch = Approach D hier |
| 036 | Logger-SDK/Router/CDC | [x] ee7055b (Networks/Agents live); TASK-058 (13.9.): Router=Edge-Node — lokaler Ingest `/api/sdk/logs` auf :3100 (HTTP-Demux), JSONL-Journal+Cursor (at-least-once, WAN-down getestet), CDC-Forwarder, Key-Hashes+forward_url per Config-Pull, Deploy-Checkbox `edgeNode` (Socket-Guard-Pipeline); Review-Pass: Demux-Stall (30s/Redis) gefixt+regressionstestet, Poison→dead.jsonl, Composite-Version (Revocation propagiert) | umgesetzt | offen: Frontend-Checkbox/Dashboard-Kachel (051), Editions-Gating, CDC-Live-Test mit wal_level=logical, Python-Logger-Wrapper |
| 037 | API_DOCS-Konsolidierung | planned (nach Merge) | geplant | API_DOCS exklusiv nach WP0 |
| 041 | DB-Discovery + Audit-Logs | [~] DiscoveryPage ist Empty-State (22 Z., R39-Nachweis — „730Z live" war falsch behauptet, korrigiert 13.9.); Audit-Logs-UI fehlt | LÜCKE + Falschbehauptung korrigiert | TASK-051 (SDK-Logs-Ansicht; 051-Code-Agent läuft) |
| 042 | Security-Report-Tab | [x] 449Z, Route live | umgesetzt | — |
| 047 | History-Rewrite (R32) | planned | geplant | Public-Flip nach K-LAF |
| 048 | Control-Planes (Planes/Router/Direktleitung) | [~] TASK-060 (14.9., live verifiziert): Backend komplett — Provider-Interface `internal/provision` (SSH implementiert = Wrap der bestehenden Deploy-Pipelines; AWS-EC2/GCP-CE/IPAM-Netbox/K8s ehrliche 501-Stubs), `control_planes`-Tabelle + CRUD-Routes `GET/POST/DELETE /api/control-planes` (+ provision/status/deploy/undeploy-Actions), Router-Direktleitung `POST /api/router/aliases` (MCP-Tool register_router_alias, `cp:<id>`-Auflösung serverseitig, kein Proxy-Hop); TASK-062-Kern (Settings-Tab `/control-planes`: CRUD + Provision/Status/Deploy-Dialoge) mitgeschafft; SPRINT-38-CONTROL-PLANE-REGISTRY.md | umgesetzt(Backend+Settings-UI)/offen(Reste) | offen: CP-Picker in den Workspace-Deploy-Dialogen (TASK-053-Fläche), AWS/GCP/IPAM/K8s-Implementierungen (Sprint-33); Vault-JIT für credentials_ref (TASK-016); 049/050 hängen daran |
| 049 | Project-Model + Network-Editing-Tab + Beide-Pfade | [~] TASK-080 (15.9., Worktree, SPRINT-41-VLAN-NETWORK-ISOLATION.md): Network-Editing-Tab als VLAN/Netz-Zuordnung gelandet — `NetworkEditingPage` (`/workspaces/networks`, Workspaces-Sektion nach E-IA) zeigt die Zuordnung pro Projekt, triggert Provisioning/Teardown (GET/POST/DELETE `/api/projects/{id}/vlan`) und Container-Restart (volumenerhaltender Redeploy); BEIDE Pfade konvergieren auf DEMSELBEN realen Docker-Netz `jimesh-vlan-<projId>` (UI-Route ODER Compose-Snippet mit `external: true` — kein zweites Schema, TASK-049-Anforderung) | umgesetzt(VLAN-Editing)/offen(Project-Model-Rest) | offen aus 049: Repo/Folder=Project-Ummodellierung + projekt-scoped Discovery (040-Flow), Bridge-Provider-nftables/fv1-Presets (050/051); Ports-Sicht = TASK-082-WP2 |
| 080 | Per-Project VLAN-Isolation (macvlan/ipvlan + gVisor) | [x] umgesetzt 15.9. (Branch `task/080-vlan-network-isolation`, Worktree-Pattern, SPRINT-41-VLAN-NETWORK-ISOLATION.md): `internal/network/vlan.go` (Command-Emission nach Research — `ip link add … type vlan` + `docker network create -d macvlan/ipvlan -o parent=<parent>.<id>`, deterministisches /24-Mapping 172.16.0.0/12, 4094-Cap dokumentiert, Shell-Injection-Guards, keine neue Dependency, CGO-frei), `project_vlans`-Tabelle (UNIQUE vlan_id, FK-CASCADE, transaktionale Auto-Allokation mit Range-Settings), Deploy-Opt-in `vlanEnabled/vlanId/vlanDriver` (Validierungen: nur networkMode=isoliert + Workspace-Container; persistierte Zuordnung gewinnt bei Redeploy, Konflikt=409), Live-Attach ohne Neustart, `JIMESH_RUNTIME`-Echo (gVisor+VLAN = gemessen, nicht behauptet), Undeploy `purgeVlan`, Delete-Leftover-Report, UI-Tab + Deploy-Dialog + Create-Wizard-Opt-in + i18n 60 Locales; LIVE verifiziert in der Test-Umgebung: macvlan-Cross-Netz-Isolation (A→B/B→A unreachable), Host→Container 100 % loss (Kernel-Design), Live-Attach dual-homed, Teardown restfrei; ehrliche Grenzen: 802.1q-Sub-Interface (kein CAP_NET_ADMIN im Container-Netns), ipvlan-Ports (EBUSY), runsc (nicht installiert) — Command-Emission per Unit-Tests verriegelt (10+4 Tests), Operator-Verifikation auf VLAN-fähigem Host dokumentiert | umgesetzt | Koordination: TASK-078 (headscale.go trägt Separation-Note auf vlan.go), TASK-072-Create-Dialog (eigene Sektion), TASK-082-Ports-View disjunkt; Nummerierungs-Konflikt-Hinweis im Sprint-File (R42-Kontext nannte „Tailscale-Serve 080") |
| 050 | Inbound-Enforcement + Permanent-Scan (DSG) | [~] WP1 Firewall umgesetzt (13.9., live verifiziert — SPRINT-36 WP6b, TASK-050-WP1) | umgesetzt(WP1)/offen(Reste) | E-Priority: wir verwalten Ports (BYOF = Stub dokumentiert); offen: Permanent-Scan (E-SIEM-1..5), prebuilt fwctl-Helper-Image, IPv6-Relay-Path |
| 051 | Frontend-Finalisierung (SDK-Logs-UI + Presets) | spawned 13.9. | Frontend-LÜCKE | Logs/Presets = Frontend-Fehlteile 040/042 |
| 052 | Slop-Audit + Lücken-Dokument (Extra-Agent) | spawned 13.9. | Audit | Ergebnis: R39-frontend-slop-audit.md |
| 070 | Capability-RBAC-Schema für JiMesh-Domänen (SPRINT-41) | [x] umgesetzt + live verifiziert 15.9. (Branch `task/070-capability-rbac`, Worktree `jimesh-worktrees/task-070-capability-rbac`, SPRINT-41-CAPABILITY-RBAC.md): `policies/capabilities.rego` um 6 Domänen × 4 Aktionen erweitert (registry/workspaces/deployments/security/vault/gateway; Katalog `data.jimesh.capabilities.catalog` als Single Source, Risk-Tabelle daraus ABGELEITET — kein Drift; Proxy-Spezialfall gateway:write=critical, gateway:read=low; operatorToggles nach SPRINT-31-Muster als ehrliche TODOs), Katalog-Lader `capabilities.go` (policy.go unberührt — Fremd-In-Flight-Lane), `GET /api/capabilities` (Katalog VERBATIM aus der Engine + Grants je Subagent klassifiziert + Service-Keys ehrlich nicht-verdrahtet), Admin-Tab `/admin/capabilities` (AdminCapabilitiesPage + i18n 60 Locales), Tests: 6 Policy-Tests (Katalog↔Entscheidung-Konsistenz) + 2 Gateway-Route-Tests; LIVE-curl-Beweise am eigenen Worktree-Backend :19093: vault:delete ungewährt → 403, deployments:admin gewährt → 202 guarded, registry:read gewährt → 200 + echte exec-Ausgabe, billing:read unbekannt → 403 fail-closed | umgesetzt(Schema+View)/offen(Enforcement-Toggles) | offen (Operator-Entscheide, SPRINT-41 §6): /api-Flächen-Enforcement je Domäne (Toggle-Muster), consumer_keys-Capability-Spalte + Service-Key-Grants (→TASK-078-RBAC-Part), networking:-Namespace (→TASK-078), dsh/daphne-Default-Grants (nicht code-ableitbar — Fundat §5); **TASK-070-FUND-1: Fresh-Install-Migrations-Bug** (migrate() ALTERs vor CREATEs → frische DBs ohne Zusatzspalten, GetProject bricht; store.go ist Fremd-In-Flight — eigener Task) |
| 078 | Echte Headscale-Networks-Page (API-Fix + headplane-Port + Topology + OPA-RBAC) | [x] umgesetzt 14.9. (Branch `task/078-headscale-networks`, SPRINT-40-HEADSCALE-NETWORKS.md): **Part 1 Backend** (main b8bde4a, live curl-bewiesen) — /api/networks/users\|nodes\|preauthkeys (+ expire/policy) an die echte Headscale-0.29-REST-Surface (huma, kein gRPC mehr), OPA-Gate `headscale.rego` (3. Modul auf DER einen Engine, policy.go unberührt — TASK-070-Lane), X-JiMesh-Identity-*-Header server-derived; **Part 2** — NetworksPage.tsx als echter headplane-Port (MIT, tale/headplane, Lizenz im Clone selbst verifiziert): Machines-Tabelle (Name/IP-Suche, Status-Filter online/offline/expired, Sortierung name/IPv4-Oktette/lastSeen, Showing-X-of-Y, echte ipAddresses-Felder — das alte 'addresses' existierte nie), AuthKeys (User-/Status-Filter mit headplanes exakter active/expired-Semantik, Attribut-Rows, Create-Dialog mit Tag-only-Key, aclTags mit tag:-Prefix, 90d-Default-Expiration, Reusable/Ephemeral-Switches, EINMALIGER Key-Reveal + tailscale-up-Copy-Block, Expire nur an aktiven Keys), User-Rows (Display-Name-Fallback, Member-since, Maschinen-Status); 77 existierende network-i18n-Keys verdrahtet + 3 neue Keys in 60 Locales via `scripts/task078-i18n-insert.py`; **Part 3** — MeshTopology-Graph (React Flow @xyflow/react vorhanden; Atlas-MIT-Pattern-Port statt vis-network-Dependency) + `lib/acl-policy.ts` (HuJSON-Scanner + Policy→Kanten-Resolver, fail-closed: unmappbare Regeln zeichnen KEINE Kanten statt Teil-Kanten; 21 Unit-Tests); Berechtigungs-Topologie ehrlich beschriftet (policy disabled = realer Voll-Mesh — IST der Zustand; NICHT gemessener Traffic, Control-Plane sieht WireGuard-P2P nie); Scanopy = AGPL-3+Commercial-Dual → reference-only wie headscale-admin (GPL-3), kein Code; RBAC: kein zweites Permission-System — OPA-403-Deny erscheint verbatim als Toast; live verifiziert über Worktree-Dev-Server :5175 → laufender Backend :19091 (alle 4 Routes durch die Next-Rewrite mit echten Daten, /networks 200, eigener Code im kompilierten Bundle nachgewiesen) | umgesetzt | offen (Operator-Entscheidung, Design im Sprint-File): OPA→Headscale-ACL-Push-Route bauen (Gate-Action push-policy + SetPolicy-Client verdrahtet; Voraussetzung `policy.mode: database` — bewusster Control-Plane-Posture-Wechsel, kein Dashboard-Default); ACL-on-Live-Test des Resolvers erst mit policy.mode ≠ disabled; Zwischenfall ehrlich dokumentiert: erste UI-Umsetzung wurde uncommittet durch externe Worktree-Cleanup entfernt, aus Session-Arbeit rekonstruiert, jetzt sofort-pro-Part-Commits (Details SPRINT-40 §Abrechnung) |
| 054 | eBPF/K-LAF Foundation (Falco+Wazuh-Bridge, SPRINT-40) | [x] umgesetzt 14.9. (Branch task/078-headscale... —TASK-054: deploy/siem/ Stack B+C live, /api/sdk/logs alias=wazuh\|falco, 30d-ISM) | umgesetzt(Kern)/offen(Reste) | WP1-Shipper, WP3-Ruleset, make-Targets; E-SIEM-Confirm offen |
| 055 | Vault-Project-Isolation (R40-M3) | [x] umgesetzt 14.9. (TASK-055: project_id/workspace_id + WHERE-Filter, Service-Key-Read-Scope) | umgesetzt | Vault-ACL je Workspace (später) |
| 056 | RBAC-Rollen-UI (R40-M4) | [x] umgesetzt 14.9. (TASK-056: Rollen-Picker admin/developer/viewer, AdminUsers+Budgets, i18n 60 Locales) | umgesetzt | — |
| 057 | WAF Coraza-Sidecar (SPRINT-31) | [x] umgesetzt 14.9. (TASK-057 + f41350e: SQLi/XSS live geblockt 403, Portumkehr §4, Kontrollgruppe bewiesen) | umgesetzt | WP3 faced_by_waf, Remote-SSH-Smoke; v2 Regel-Editor |
| 058 | Edge-Node Ingest (SPRINT-36 WP6) | [x] umgesetzt 14.9. (cb95a01: lokaler Ingest :3100, CDC-Forward, WAN-down-Puffer, Deploy-Checkbox; 3 Bugs gefixt: Demux-Deadlock 30s→0.003s, Poison-Row, Revocation) | umgesetzt | Frontend-Checkbox (051), Editions-Gating, CDC-Live-Test |
| 060 | Control-Plane-Registry (SPRINT-38) | [x] umgesetzt 14.9. (fb47c25: Provider-Interface SSH-Wrap, AWS/GCP/IPAM/K8s 501-Stubs, Router-Direktleitung; + TASK-062 UI 248a0c5) | umgesetzt | CP-Picker in Deploy-Dialogen, 4 Provider-Implementierungen (Sprint-33), Vault-JIT |
| 062 | Control-Planes-UI (Settings-Tab) | [x] umgesetzt 14.9. (248a0c5: CRUD+Provision+Status+Deploy-Dialoge, Pipeline-Response verbatim, Stub-501 sichtbar) | umgesetzt | — |
| 066 | Vault-Konsolidierung nach E-IA | [x] umgesetzt 14.9. (1c4887a: Platform-Tab, VaultDashboardPage gewinnt Vault, /security/vault → ProjectSecretsPage + Redirect) | umgesetzt | — |
| 067 | Wazuh-Dashboard new-tab (self-signed cert) | [x] umgesetzt 14.9. (286dbc8 + a2be900: iframe entfernt — kein Cert-Interstitial aus iframes möglich; 2× unabhängig gefixt) | umgesetzt | — |
| 069 | Security-Overview Picker + Popover-Fix | [x] umgesetzt 14.9. (0d8df88: Target-Combobox aus /api/workspaces+/api/projects, Radix-Popover schließt bei Link-Klick; Prämisse widerlegt — Route existierte) | umgesetzt | — |
| 071 | Ghost-Data-Delete + RBAC-BYPASS-FIX | [x] umgesetzt 15.9. (9ec7d69: DELETE /api/users/{id}+/api/projects/{id}, informed Confirm, 409-Surveys; KRITISCH: OIDC-Session-RBAC-Bypass gefixt [kcSessionMarker sub+roles], live 403 bewiesen) | umgesetzt | 0.0.0.0-Binding (Mandat-12) andere Lane |
| 072 | RBAC-Access-Sektion in Create-Dialogen | [x] umgesetzt 15.9. (51bdb68: Role-Picker + Budget-Default 5.00, POST /api/budgets nach Creation, existing-row-Schutz; Abweichung: kein User-Create-API [Keycloak-First-Login]) | umgesetzt | SSH-Endpoint-Create-Dialog offen |
| 073 | OAuth Google+GitHub (Keycloak-IdPs) | [x] umgesetzt 15.9. (49115a1+fc3da0c: Realm-JSON IdPs mit ${VAR}-Platzhaltern, Mapper, Fall-B-POST-Rezept; live: Import+Substitution+Redirect-Kette bis google/github) | umgesetzt(Konfig)/offen(E2E) | Echte OAuth-Creds nötig (Operator) |
| 074 | MiniSidebar→SectionRail + Scope-Selector + Landing (WP1-4) | [x] umgesetzt 15.9. (dd6735b+56b29ad+16a9d91+1191319+aeb8971: MiniSidebar→globale SectionRail [rechts Overlay, icons→Hover-Expansion], Security-Layout-Outlet, Scope-Selector hierarchisch [Project→Workspace→App] mit Schema-Gate, Landing-Strip, Crash-Fix ×2, Vitest 256/256 [ENV-Bug behoben], 12 Anschluss-Inventar) | umgesetzt | Rail-Replication (DBs→Platform→Workspaces→Proxy), WIDE_ROUTES-Präfix, Touch-Pin, 12 Scope-Anschlüsse |
| 076 | Agent-Feedback-Loop (SIEM-Criticals→Session-SSE) | [x] umgesetzt 15.9. (d1fdcc2: ObserveAuditCritical-Hook im InsertSDKLog, Injektion security-critical in aktive Subagent-Sessions, K-LAF E3 redaction, live bewiesen) | umgesetzt | Multi-Agent-Investigation (Operator-Policy) |
| 079 | Identity-based Router Proxying (ERSETZT 075) | [x] umgesetzt 15.9. (beddaa8: Routing-Tabelle+Ownership-Gate [sub≠ownerSub→403 bewiesen auf identischem Port], path-based /ws/{wsId}/app/{port}, RS256+JWKS) | umgesetzt | Frontend-/ws-Nutzung (066/074-Lane), Remote-Node-Verify |
| 084 | SSOT & Redundanz-Säuberung (R44, P0) | [ ] geplant (SPRINT-43): localStorage-Audit [AnalyticsPage/OnboardingPage/ProjectsPage(3 Rest-Refs)/SecurityGuardDemo], Dead-Ends (/api/subagents Progress-Panel), Route-Consumer-Matrix | geplant | P0 Alignment & SSOT |
| 085 | docs_temp + OpenAPI + Static-HTML-Pipeline (R44, P1) | [ ] geplant (SPRINT-43): docs_temp (GO-PUBLIC §2-Liste), huma→/openapi.json, Scalar/Stoplight-Static-Render + GH-Pages-Workflow, Blog-Integration (ji-podhead/articles) | geplant | Public-Docs-Pipeline |
| 086 | Slop-Audit & React-Query Store/GC (R44, P2) | [ ] geplant (SPRINT-43): R39-Muster-Scan, Route↔Consumer-Matrix als CI-Gate, Query-Key-Registry + Stale-Cache-GC | geplant | Frontend Store GC & CI Gate |
| 087 | Datalake-as-a-Service Utility App Engine & UI (R44) | [~] Minimal-Pfad umgesetzt (SPRINT-55, 28.9., Branch feat-datalake-ozone): Kafka `jimesh.*` → Ozone-S3 1:1 via `cmd/datalaked` (kein Transform in v1), `/api/datalake/status` echt, `/dbs/datalake` in der Nav; Debezium gefallen gelassen (pure Go). R44-Rest (Columnar DuckDB/ClickHouse/Parquet, OOP-Adapter-Hierarchie, `jimesh_datalake`-Schema, Postgres-WAL-Quelle) bleibt Folge-Sprint | [~] Kern umgesetzt / Rest geplant | Real-Time Datalake Utility App |
| 088 | Database & Cache App Auto-Discovery & Backup Engine (R44) | [ ] geplant (SPRINT-43, R44 Concept): DB Engine Recognition (Postgres, Redis, Mongo, MySQL, ClickHouse), Auto-Pre-CDC Baseline Backup, `/dbs` Surface Consolidation (Overview/Discovery/Backups/Watermarks) — unverändert R44-Folge-Sprint; SPRINT-55 brauchte keine Discovery (Quellen sind die eigenen `jimesh.*`-Topics via kafkabridge) | geplant | Database & Cache Utility Alignment |
| M5 | Routes-Vereinheitlichung (/projects → /workspaces) | [ ] geplant: ProjectsPage-Rest-Funktionen in WorkspacesPage, /projects = Redirect (Jules-Audit-Vorschlag) | geplant | nach 084 |
| R41 | Dead Code Removal | [x] umgesetzt: 4 ungenutzte Frontend-Komponenten (DiscoveryStatus, getting-started, peak-hours-controls, custom-weights-popover) & ungenutzte Backend-Datei (entropy_cascade.go) entfernt. | umgesetzt | — |
| R42 | ProjectsPage Refactor & No-Mock | [x] umgesetzt: ProjectsPage.tsx modular aufgeteilt, Subkomponenten extrahiert, gefakte clientseitige Deploy-Log-Outputs & gefakte Connection-Toasts entfernt, gVisor Checkbox auf Node-Ebene verlagert. | umgesetzt | — |
| R43 | P1 Frontend Gaps & Firewall UI | [x] umgesetzt: NetworksPage an echte Headscale-Proxy-Routen angebunden, Firewall Priority Rules Management UI (FirewallRulesSection) zu SecurityExposurePage hinzugefügt. | umgesetzt | — |
| 087 | 4-Tier Domain Hierarchy & Schema Standardization | [~] geplant: Mandat 13 & TASK-087 Prompt spezifiziert. Strict 4-tier model (SSH Target -> Workspace -> Project -> App), no_parent fallback, port hash-lookup tables, dynamic app icons. | geplant | Backend/UI Migration & Subagent Execution pending |


| 090 | Scanopy Networking Salvage & Grid UI | [x] umgesetzt: Go backend and TypeScript domain schemas (`VLANNetwork`, `NetworkMetadata`, `NetworkInterfaceCard`), `NetworkEditingGrid` component, and operator reference documentation. | umgesetzt | — |
| 100 | Unified Settings & Utility Network Inheritance | [~] geplant: TASK-100 Prompt spezifiziert. Unified port allocation, project-parent network assignment, and jimesh_services utility overlay. | geplant | Implementation pending |

## Offene Baustellen B01–B16 (WIP-Stash wieder eingeordnet, Stand 21.9.2026 — B05/B07/B15 gegen HEAD verifiziert erledigt)

| Nr | Task | Status |
|---|---|---|
| B01 | Dashboard-Builder (leobot-artig) | [ ] geplant |
| B02 | Docker-Hub-Container-Metadaten | [ ] geplant |
| B03 | Figma-Integration | [ ] geplant |
| B04 | DrawIO/Flowchart-Integration | [ ] geplant |
| B05 | Container-Logs SSE-Route | [x] erledigt — GET /api/projects/{id}/containers/{cid}/logs als echter SSE-Stream (docker logs --follow über die Deploy-SSH-Session, 15s-Keepalive; internal/deploy/container_logs.go, Registrierung deploy.go:79) |
| B06 | Auto-Project-Erstellung | [ ] geplant |
| B07 | Post /api/ssh/explore (File-Browser-Backend) | [x] erledigt — Commit 0273f4a (Sprint-48 Item 1): echter SSH-Dial via deploy.DialSSH (TOFU-gepinnt), Path-Sanitizer + Shell-Injection-Guard, 10 Tests |
| B08 | Utility-API-Keys im Vault (global→workspace→project) | [ ] geplant |
| B09 | project_roles-UI (Sprint-47 follow-up) | [ ] geplant |
| B10 | Weiche nodeHost/nodeUser-Kette auf echte FKs migrieren | [ ] geplant |
| B11 | Pagination-Kontrakte für grosse Collections | [ ] geplant |
| B12 | Retention/GC für Logs | [ ] geplant |
| B13 | E2E-Journey-Tests | [ ] geplant |
| B14 | Backup/DR-Strategie | [ ] geplant |
| B15 | GET/POST/DELETE /api/team-bindings (team_resource_bindings: ssh_target/workspace/project/app × read/write/admin, Vererbung) — das S4-Bindings-Panel rendert leer, bis die Route existiert | [x] erledigt — store/team_bindings.go + gateway/team_bindings.go, Routen registriert über registerTeamBindings (gateway.go:272), admin-gated über policy.go:98, Store-Tests vorhanden |
| B16 | Realm-Rolle (admin/operator/viewer) in den users-Contract aufnehmen — heutige GET /api/users-Row trägt keine Rolle; UI zeigt bis dahin ehrlich nur Projekt-Rollen aus /api/budgets | [ ] geplant |
## Sprint-Spiegel S139 (Tetragon-eBPF-Enforcement, 27.9.2026 — docs/sprints/SPRINT-139-TETRAGON-EBPF-ENFORCEMENT.md; Branch feat-tetragon-ebpf)

RM32-Nachtrag, Operator verbatim: "bitte bitte bitte endlich mit ebpf machen" — erste echte Tetragon-TracingPolicy: der Llama-Guard-Hook erkennt Prompt-Injections, der eBPF-Layer KILLT den Prozess, der die Injection ausführt (SIGKILL auf security_bprm_check, VOR dem exec), defense in depth zur 403. Hook-Seite: Setting `guard_scanner.enforcement`=="ebpf" (Default AUS) → docker exec des Kill-Switch-Markers `/tmp/jimesh-guard-kill.<session>` in den Container der geblockten Session (nur provisioned, K-LAF §2); Tetragon-Policy matchArgs Prefix + matchNamespaces NotIn host_ns + Sigkill. Ehrlichkeits-Protokoll: exit 137 → `ebpf_kill_enforced`, exit 42 (Tetragon fehlt/gVisor) → `ebpf_enforcement_missed` — kein Fake-Enforcement, jede Zeile in `security_events` (Scanner tetragon-ebpf).

| Nr | Task | Status |
|---|---|---|
| S139-1 | TracingPolicy `deploy/tetragon/jimesh-guard-kill.yaml` (v1.7.1-CRD, gegen Upstream-Quelltext verifiziert): exec-Gate (Marker → Post+Sigkill) + exec/ptrace-Watch | [x] erledigt — yaml-lint Parse+Schema OK |
| S139-2 | Deploy: docker-compose.yml (Standalone-Form: pid/cgroup host, privileged, BTF-Mount, gRPC-Unix-Socket, Event-Export+Rotation; kein published Port) + ansible-task.yml mit LAUTen Prereqs (BTF/Kernel≥4.19/compose/Pull) + tetra-CLI (sha256) + **Live-Kill-Probe** (exit 137 Pflicht, sonst Hard-Fail) + defaults.yml | [x] erledigt — docker compose config OK |
| S139-3 | Backend `internal/ai/guard_enforce.go` + guard_hook.go-Wiring (beide BLOCKED-Pfade), async 10s, Exit-Code→security_events, gVisor/runsc ehrlich als missed statt fake | [x] erledigt — scoped Build RC 0, vet clean |
| S139-4 | Tests: 4 reine Protokoll-Tests + 1 DB-Test (Gating + ehrlicher Skip); Suite 12/12 ok (Throwaway-DB) | [x] erledigt |
| S139-5 | Fund+Fix: models-Tabelle shippte `description` nicht im CREATE (Fresh-DB-Bootstrap-Klasse, TASK-076-Muster; Kontrollexperiment am BESTEHENDEN Guard-Test) | [x] erledigt |
| S139-6 | Docs: deploy/tetragon/README.md (Deploy, Exit-Code-Tabelle, Test-Procedure Injection→Kill→Event-Log, Grenzen), API_DOCS (Setting-Key + tetragon-ebpf-Events), Sprint-File, dieser Spiegel | [x] erledigt |
| S139-7 | Operator-Live: `make redeploy SERVICE=tetragon NODE=<name>` + README-Test-Procedure mit echtem Testagent | [ ] offen — Operator |

## Sprint-Spiegel S139 (Unified App Panel: Apps+Deployments kombiniert, Klick-to-Panel, 28.9.2026 — docs/sprints/SPRINT-139-APP-PANEL-DRAWER.md; Branch feat-app-panel)

Die Operator-Anfrage („apps mit deployments kombinieren? dropdown für aktive apps? ein konzept: klick drauf → settings/terminal/dashboard?") als EINE Fläche: der **AppPanelDrawer** (rechts, ~60 %) öffnet bei jedem App-Zeilen-Klick (Sidebar-Tree beider Sektionen, WorkspaceDetailPage-Container-Karten, Active-Apps-Dropdown) und vereint App-Row + Deployment-Row in drei Tabs — **INFO** (Framework, Runtime, Ports, Volume, Status-Badge aus GET /api/projects/{id}/deployments, Settings-Links zur Workspace-Konfigseite/Projekt/App-Detail, echte Log-Vorschau), **TERMINAL** (die existierende WorkspaceTerminal-Komponente, neue `embedded`-Form: docker exec per WebSocket, kein Host-SSH), **DASHBOARD** (App-UI als iframe über die Tunnel-Route, ehrlicher Leerzustand ohne Port). Dazu das **Active-Apps-Dropdown** in der Sidebar-Navigation (alle laufenden Deployments aus GET /api/deployments, Status-Dot, Klick → Drawer). Status-Dots: EIN Shared-Mapping (`lib/app-status.ts`): grün = deployed/running, GRAU = stopped/unbekannt (Operator-Vorgabe), rot = echte Fehler — ersetzt zwei lokale Kopien. Badges [T][L][C][W][V][D] unberührt (Direkt-Streams). Keine neue Backend-Route (nur dokumentierte konsumiert).

| Nr | Task | Status |
|---|---|---|
| S139-1 | `components/apps/AppPanelDrawer.tsx` — Drawer + 3 Tabs, ehrliche Defaults, Deployment-Row-Matching | [x] erledigt |
| S139-2 | `WorkspaceTerminal.tsx` `embedded`-Prop (inline statt Modal, gleiche WS-Route) + redundanter setState-Lint-Fix | [x] erledigt |
| S139-3 | `lib/app-status.ts` — das EINE Status-Dot-Mapping (grün/grau/rot/amber) + `appInterfaces` | [x] erledigt |
| S139-4 | `lib/tunnel.ts` — der EINE Tunnel-URL-Builder (local direkt / remote SSH-Reverse-Proxy) | [x] erledigt |
| S139-5 | `components/apps/ActiveAppsDropdown.tsx` — aktive Apps in der Sidebar-Navigation | [x] erledigt |
| S139-6 | `HierarchySidebar.tsx` — Name-Klick → Drawer (keine Navigation/Scope), Dropdown, Shared-Dots | [x] erledigt |
| S139-7 | `WorkspaceDetailPage.tsx` — Karten + passende Deployment-Rows → Drawer; Wire-Shape-Fix des lokalen DeploymentRow-Interfaces (Go-Style-Keys renderten je undefined) | [x] erledigt |
| S139-8 | i18n `appPanel.*` (32 Keys) en+de handübersetzt, 58 Locales via `scripts/i18n-translate.py` — Google 429 auf der Shared-IP: dokumentierter EN-Fallback, Backfill per `--key` | [x] erledigt |
| S139-9 | Tests: 9 neue Drawer-Tests, 3 Dropdown-Tests, 2 embedded-Terminal-Tests, App-Klick-Vertrag der Sidebar ersetzt (betroffene Suiten grün, Full-Suite 351 grün) | [x] erledigt |
| S139-10 | Docs: Sprint-File, dieser Spiegel; API_DOCS unverändert (keine Route neu) | [x] erledigt |
| S139-11 | Verifikation: tsc 478=478 gegen den Parent-Commit (Diff leer), vitest Full-Suite 347 grün (4 rot = fremde RM35-In-flight-Datei), eslint geänderte Dateien grün, check:i18n im Commit-Baum grün | [x] erledigt |
| S139-12 | Live-Smoke am laufenden Stack (Operator: Drawer per Sidebar-/Karten-/Dropdown-Klick) | [ ] offen — Operator |


## Remote Branch Status (Stand 4.10.2026, main = `793eb999`)

| Branch | Commits Ahead of Main | Status / Description |
|--------|----------------------|----------------------|
| `origin/main` | 0 (HEAD) | Production baseline — all S180-1/2, S182-WP3/4, S184-8, S140-9/14, S181-7 i18n merged |
| `origin/feat/sprint-180-182-184-dashboard-enhancements` | 0 | Identical to main (PR branch, can be deleted) |
| `origin/feat/s186-wp3-workspace-file-editor` | 1 | **S186-WP3**: Workspace file editor (text/markdown edit vs download) — ready for review |
| `origin/feat/s184-client2-join` | 1 | **S184**: Second Tailnet join as single flow + deploy/cp\|client repo split — ready |
| `origin/fix/s184-service-key-path-slash` | 1 | **S184-10**: Service key regex allows single slash for `cp/dns` — merged as PR #14 (`4be2614e`) |
| `origin/pr-11-s184` | 2 | S184 DNS + CI fix — ancestor of fix/s184-service-key-path-slash |
| `origin/docs/restructure` | 2 | Docs restructure into guide/reference/planning/legacy + API-doc consolidation |
| `origin/feat/public-repo-docs-cicd-polish-5898372805603157199` | 1 | Docs restructure + Jules PR polish (rebased) |
| `origin/feat/s184-dns-client-deploy` | 0 | Identical to main (DNS client deploy done) |
| `origin/feat/security-engineer-gateway-commands` | 0 | Identical to main |
| `origin/feat/squadmesh-docs` | 2 | SquadMesh architecture docs + S184 client2-join |
| `origin/feat/squadmesh-impl` | 7 | **SquadMesh impl**: Cloudflare workerd, Workers AI, Agent Lifecycle, PyTorch Lightning, Cloud Provider Workers — **large feature branch** |
| `origin/feature/okf-knowledge-base-7099990697800291167` | 1 | OKF knowledge base + Docsify GraphRAG portal |
| `origin/task-106-plugin-manifest-spec-v1-1004778615001292163` | 0 | Identical to main |
| `origin/task-115-browser-automation-digest-1123386847615709662` | 0 | Identical to main |
| `origin/task/080-vlan-network-isolation` | 0 | Identical to main |
| `origin/jules-15275777102129622916-d1a2c335` | 0 | Identical to main |
| `origin/jules-1648647822100541056-44c4731e` | 0 | Identical to main |
| `origin/jules-audit-tasks-update-1228466343042555529` | 0 | Identical to main |
| `origin/feat/marketing-website` | 0 | Identical to main |
| `origin/preserve/glm-embeddings-attempt-wip` | (not checked) | Preserved WIP — embeddings attempt |
| `origin/preserve/glm-embeddings-family-wip` | (not checked) | Preserved WIP — embeddings family |

### Branch Action Items

| Branch | Action | Owner |
|--------|--------|-------|
| `feat/s186-wp3-workspace-file-editor` | Review + merge (S186-WP3 complete) | — |
| `feat/s184-client2-join` | Review + merge (S184 complete) | — |
| `fix/s184-service-key-path-slash` | Already merged via PR #14 (`4be2614e`) — delete branch | — |
| `pr-11-s184` | Superseded by fix/s184-service-key-path-slash — delete | — |
| `docs/restructure` | Review + merge (docs reorganization) | — |
| `feat/public-repo-docs-cicd-polish-...` | Review + merge (docs polish) | — |
| `feat/squadmesh-impl` | **Large feature** — needs architecture review before merge | — |
| `feat/squadmesh-docs` | Depends on squadmesh-impl — hold | — |
| `feat/security-engineer-gateway-commands` | No delta — delete | — |
| `feat/marketing-website` | No delta — delete | — |
| `feat/s184-dns-client-deploy` | No delta — delete | — |
| `feat/sprint-180-182-184-dashboard-enhancements` | No delta — delete | — |
| `task-*` branches | No delta — delete | — |
| `jules-*` branches | No delta — delete | — |
| `preserve/*` | Keep (WIP archives) | — |

### Open Work (Not Yet Branched)

From BACKLOG analysis, these are the next concrete work packages:

| Priority | Task | Dependencies | Notes |
|----------|------|--------------|-------|
| **P0** | S180-1b: Fix checkov-preflight (blocks all deploys) | — | `src/scripts/checkov-preflight.sh` 3 bugs |
| **P0** | S180-3: `daemon.json` for runsc (no file-access-mounts=exclusive) | S180-14/15 | gVisor runtime registration |
| **P0** | S180-14/15/18/19: Local controller (no SSH) | S180-14 | `setup-local-controller.sh` + Makefile targets |
| **P0** | S184-11: Fix `dns_test.go` (5 tests rot) | — | Missing `r.SetPathValue("id", …)` in 6 test cases |
| **P0** | S182-WP4-T: Fix `NewProjectDialog.test.tsx` (4 rot) | — | Portal/async test infra |
| **P1** | S180-5/6/7/8: Container hardening (cap_drop, no-new-privs, read_only) | S180-3 | Shared mount + GPU |
| **P1** | S180-16: Secret rotation (DB + .env) | — | Password leaked in log |
| **P1** | S180-20: Git credentials for root (become:true) | — | HTTPS clone fails in CI |
| **P1** | S181-7: Translate 366 keys to 59 locales | en.json done | 21k strings — script needed |
| **P1** | S181-8: Remove `ignoreBuildErrors`/`ignoreDuringBuilds` | Lint green | 336 lint problems |
| **P1** | S181-14: Git history scrub (337 MB .git) | — | LLM session logs in history |
| **P2** | S170-2: S3/Host mount for utility container | S180 WP2 | rclone/FUSE vs bind |
| **P2** | S170-4/5/8: S3 rename API + VS Code sidebar + Filebrowser | S170-2 | |
| **P2** | S159-6: Chromium E2E test (live SSH node) | — | Code ready, not live |
| **P2** | S167 Phase 2: Auto-secrets for backend/siem/vault/redis | S167 Phase 1 | |
| **P3** | S171/S173/S174: Onboarding, IA redesign, Sessions/Traces | S163+S165+S170 | Welle 3 |
| **P3** | S175-8: Live verification (Bindings, SSE, VLAN) | Stack up | |
| **P3** | S177: Paranoia alerting model | Operator decision | Research done |
| **P3** | S178: Safe local LLM chatbot | Operator decision | 6 open points |


## Missing Features / Unmerged Branches / Never-Landed Work (Stand 4.10.2026)

### A. Branches with Actual Work Ahead of Main (Need Review/Merge)

| Branch | Sprint | Status | What It Adds | Blockers |
|--------|--------|--------|--------------|----------|
| `feat/s186-wp3-workspace-file-editor` | S186-WP3 | Ready | Workspace file editor (edit text/markdown vs download only) | — |
| `feat/s184-client2-join` | S184 | Ready | Second Tailnet join as single flow + deploy/cp\|client repo split | — |
| `docs/restructure` | — | Ready | Docs restructure into guide/reference/planning/legacy + API consolidation | — |
| `feat/public-repo-docs-cicd-polish-...` | — | Ready | Docs restructure + Jules PR polish (rebased) | — |
| `feat/squadmesh-impl` | SquadMesh | **Large** | Cloudflare workerd, Workers AI, Agent Lifecycle, PyTorch Lightning, Cloud Provider Workers | Architecture review needed |
| `feat/squadmesh-docs` | SquadMesh | Depends on impl | SquadMesh architecture docs + sprint plans | Hold until impl reviewed |
| `feat/okf-knowledge-base-...` | OKF | Ready | OKF knowledge base + Docsify GraphRAG portal | — |

### B. Branches Identical to Main (Delete Candidates)

| Branch | Action |
|--------|--------|
| `feat/s184-dns-client-deploy` | Delete — merged |
| `fix/s184-service-key-path-slash` | Delete — merged via PR #14 |
| `pr-11-s184` | Delete — superseded |
| `feat/security-engineer-gateway-commands` | Delete — no delta |
| `feat/marketing-website` | Delete — no delta |
| `feat/sprint-180-182-184-dashboard-enhancements` | Delete — no delta |
| `task-*` (3 branches) | Delete — no delta |
| `jules-*` (3 branches) | Delete — no delta |

### C. SPRINT-149 UI/UX Redesign — **PLANNED BUT NEVER IMPLEMENTED**

**Document:** `docs/sprints/SPRINT-149-UIUX-REDESIGN-NAVBAR-SIDEBAR.md` (661 lines, read-only analysis)

| Phase | Feature | Status | Current Reality |
|-------|---------|--------|-----------------|
| **1** | **Top-Navbar → Browser Tab Strip** | **NOT STARTED** | Old inline `Navbar()` in `App.tsx:294` with 5 tab-groups + dropdowns still active |
| **2** | **Sidebar "Dashboards" Section** | **NOT STARTED** | Only `/builder` (single layout) + `/dashboards` (3rd-party embeds) exist |
| **3** | **Security Section Reorg** | **NOT STARTED** | 15-item flat `securityItems` + split `EVENTS_ITEMS` in Sidebar still active |
| **4** | **Dedup Rule Applied** | **NOT STARTED** | 4 Firewall routes in 2 registries, SIEM only in Sidebar, Secrets under Security |
| **5** | **OPNsense Graying** | **NOT STARTED** | OPNsense tab clickable but backend doesn't exist |
| **6** | **Service-Aware Graying** | **NOT STARTED** | No `useDeployedServices()` hook, no graying mechanism |
| **7** | **Missing Nav Entries** | **NOT STARTED** | `/overview`, `/api-docs`, `/security/findings`, threat-responder all missing |

**Current Navbar Code:** `src/frontend/src/App.tsx:294-452` — inline `Navbar()` with:
- 5 `navGroups` tabs (Workspaces/Platform/Security/DBs/LLM-Proxy) + chevron dropdowns
- Brand, Command Palette, Security Bell, Language, Account Dropdown
- Admin marker as special link
- Mobile collapse into single dropdown

**No `TabStrip` component exists.** No `jimesh.tab-strip` localStorage. No `OpenTab` state model.

### D. SPRINT-171 Onboarding + Dynamic Sidebar — **PLANNED, NOT STARTED**

| Task | Status | Dependencies |
|------|--------|--------------|
| S171-1 Onboarding Wizard (4 steps) | [ ] offen | S163+S165+S170 |
| S171-2 Jira-Style Presets | [ ] offen | — |
| S171-3 Dynamic Sidebar (Context Keys `when` expressions) | [ ] offen | — |
| S171-4 Plugin/Service Selection UI | [ ] offen | — |
| S171-5 Onboarding API | [~] partially | Auto-provision exists |
| S171-6 `presets.yaml` | [ ] offen | — |

### E. SPRINT-170 Utility Container — **HALF BUILT**

| Task | Status | Notes |
|------|--------|-------|
| S170-1 Base Image (code-server + SilverBullet + n8n + Git Graph) | [x] Built + pushed | `deploy/utility-container/` |
| S170-2 S3/Host Mount | [~] Offen | Parkfrage §13/1 (rclone/FUSE vs bind) |
| S170-3 Git Integration | [x] Built | .vsix pre-installed |
| S170-4 S3 Rename API | [ ] Offen | `POST /api/s3/rename` |
| S170-5 VS Code Sidebar Integration | [ ] Offen | `GET /api/projects/{id}/container/files` |
| S170-6 Onboarding Integration | [x] Deployed | `make redeploy SERVICE=utility-container` |
| S170-7 gVisor | [ ] Blockiert | Needs S180 WP2 (`runsc` install) |

### E. SPRINT-159 Chromium Plugin Renderer — **CODE READY, NEVER LIVE TESTED**

| Task | Status |
|------|--------|
| S159-1 Store + CRUD | [x] Code |
| S159-2 Session Lifecycle + Chromium Deploy | [x] Code |
| S159-3 Network Pool | [x] Code |
| S159-4 Frontend `ChromiumPluginRenderer` + Renderer Tab | [x] Code |
| S159-5 i18n (19 keys × 60 locales) | [x] Code |
| S159-6 **E2E Live Test** | [ ] **OFFEN** — Mandate 2 |
| S159-7 Full Version Gaps (VLAN, Recovery, Pool, Multi-Peer, Keyboard, Nav) | [ ] Offen |

### F. SPRINT-167 Auto-Generated Service Secrets — **PHASE 1 DONE, PHASE 2 OPEN**

| Task | Status |
|------|--------|
| Phase 1: postgres/keycloak/grafana | [x] Done + verified |
| Phase 2: backend/siem/vault/redis/local-stack | [ ] Offen — needs live redeploy on trading |

### G. SPRINT-173 IA/Scope Redesign — **NAV UMBau LIVE, REST PLANNED**

| Task | Status |
|------|--------|
| Nav-Umbau (6 Gruppen in `section-nav.ts`) | [x] Live |
| Dashboard Builder (st2 Widget Registry) | [x] Live |
| Terminal → Projects | [ ] Offen (S182-WP3 läuft) |
| Firewall Global | [ ] Offen |
| Rest (IA-Blaupause) | [ ] Geplant |

### H. SPRINT-174 Sessions/Traces — **PHASE 1 COMPLETE (Welle 3)**

| Task | Status |
|------|--------|
| S174-1 Session Propagation (X-Headers) | [x] **a0564cbd** — all 8 headers implemented |
| S174-2 Kafka/ClickHouse Traces Pipeline | [x] **a0564cbd** — ClickHouse + Kafka topics |
| S174-3 OpenReplay Integration | [x] **a0564cbd** — Deploy + Embed component |
| S174-4 Datadog-Style Network Events UI | [x] **a0564cbd** — Components built |
| S174-5 Worker Deployment Session Prop | [ ] Offen — Phase 4 |
| S174-6 OPA/Trust-Ratchet/Threat Integration | [ ] Offen — Phase 4 |
| S174-7 Logger SDK + OpenSearch | [x] **a0564cbd** — Dual output, semantic search |

### I. SPRINT-177 Paranoia Alerting — **RESEARCH DONE, DECISION OFFEN**

| Task | Status |
|------|--------|
| S177-0 Severity Model Research | [x] Done |
| S177-1..7 | [ ] Blocked on Operator decision (6 open points) |

### J. SPRINT-178 Safe Local LLM Chatbot — **PLAN ONLY**

| Task | Status |
|------|--------|
| S178-0..7 | [ ] 6 open points, needs Operator decision |

### K. SPRINT-180 gVisor/Deploy Gate — **WP1/2 PARTIAL, REST OPEN**

| Task | Status |
|------|--------|
| S180-1 Checkov Pre-Flight | [x] Done + **fixed** (was broken) |
| S180-2 `install_gvisor` propagation | [x] Done |
| S180-3 `daemon.json` for runsc | [ ] Offen |
| S180-4 GPU Befund | [ ] Offen |
| S180-5/6/7/8 Container Hardening | [ ] Offen |
| S180-14/15/18/19 Local Controller | [~] In Arbeit |
| S180-16 Secret Rotation | [ ] Offen |
| S180-20 Git Credentials for root | [ ] Offen |

### L. SPRINT-181 Slop Audit — **MOSTLY DONE, 3 OPEN**

| Task | Status |
|------|--------|
| S181-7 i18n (366 keys → en.json) | [x] **DONE this session** |
| S181-7 i18n (translate to 59 locales) | [ ] **OFFEN** — 21k strings |
| S181-8 Remove `ignoreBuildErrors`/`ignoreDuringBuilds` | [ ] Offen — 336 lint problems |
| S181-14 Git History Scrub (337 MB .git) | [ ] Offen |

### M. SPRINT-184 DNS — **DONE EXCEPT TEST FIX**

| Task | Status |
|------|--------|
| S184-1..10 | [x] Done |
| S184-11 `dns_test.go` (5 rot) | [ ] **OFFEN** — missing `r.SetPathValue("id", …)` |

### N. SPRINT-182 — **WP3 TERMINAL OPEN, WP4 DONE**

| Task | Status |
|------|--------|
| S182-WP3 Terminal in Projects | [ ] **OFFEN** — in Arbeit |
| S182-WP4 Container Overview | [x] Done |

---

## Session 2026-10-05 — PR-Merge-Audit & Verlust-Suche

Alle 5 offenen PRs sind über lokale Refs in `main` gemergt (`gh` war unbenutzbar):
`51f8eebc` PR #5 · `56796b21` PR #7 · `99107a65` PR #10 · `d13b09b6` PR #11 ·
`3e87589c` PR #11 Fixes · `b2a7f961` PR #12 · `d250ad0a` OKF ·
`d060c0c3`/`10e4a669` Type-/Syntax-Fixes. **Stand: 13 Commits unpushed**, `origin/main = d13b09b6`.

### tsc-Baseline: der „132-Fehler-Irrtum"

| Zustand | `tsc -p tsconfig.app.json` |
|---|---|
| Pre-Merge `7b36b1c7` | **5 Zeilen** (scheinbar fast sauber) |
| Pre-Merge `7b36b1c7` **+ Syntaxfix in WidgetSettingsDrawer** | **132** |
| HEAD nach Merge, vor Fix | 141 |
| HEAD nach Fix | **132** (= Baseline) |

**Ursache:** TypeScript unterdrückt die *semantische* Prüfung des gesamten Programms,
solange eine Datei Parse-Fehler hat. Der kaputte `</Badge>` in `WidgetSettingsDrawer.tsx`
verdeckte also 127 Altfehler. **Die 132 Fehler sind Pre-existing-Bestand**, keine
Merge-Regression — `npm run build` sieht sie nicht, weil `next.config.ts`
`typescript.ignoreBuildErrors: true` setzt.

### Die 8 echten Merge-Regressionen (behoben in `d060c0c3`)

| Datei | Fehler | Herkunft |
|---|---|---|
| `lib/query-keys.ts` | 3× TS1117 doppelte Keys `projectDNS`/`dnsRecords`/`dnsSettings` | PR #11 (zweiter Block, Bereinigung `3e87589c` sah nur den ersten) |
| `views/DashboardBuilderPage.tsx` | TS2322 `useCSSTransforms` | PR #10 — steht in keinem anderen Elternteil, runtime Default `true` |
| `sidebar/MeshSquadCrewsBlock.tsx` | 4× TS2345 `t(key, 'Fallback')` | PR #10 — Signatur ist `t(key, vars?)`, kein Fallback |

### Offene Punkte aus dem Audit

- **`WidgetSettingsDrawer.tsx` — ENTSCHEIDUNG AUSSTEHEND.** Tod (niemand importiert ihn),
  Merge-Müll (4 doppelte Imports, doppelter Codeblock `endpoints`/`node`/`valid`,
  doppelte Übersetzungs-Keys, doppeltes `export`), und er importiert
  `@/components/ui/sheet`, **das es im Repo nicht gibt**. 67 der 132 Fehler.
  → abwarten auf anstehende Widget-Änderungen (Operator-Entscheidung).
- **`origin/feat/squadmesh-impl`** — 18 Go-Dateien / ~13k Zeilen NICHT in `main`:
  `governance/`, `integrations/` (registry+vault), `orchestrator/`, `scheduler/`,
  `storage/s3`, `workers/` (AWS Lambda, GCP Cloud Run, Cloudflare workerd,
  Workers AI, gVisor), `internal/config`, `internal/tracing`.
  → andere Session arbeitet aktuell an einem SquadMesh-PR.
- **Verlust-Suche abgeschlossen:** `git fsck` = 0 dangling commits, 1 Worktree,
  9 Stashes. Nicht verloren (Inhalt in `main`, nur anderer Commit): `docs/restructure`,
  `pr-5-review`, `website/` (WP8), VLAN (TASK-080), Edge-Control-Plane (S36-WP6), pr-11-DNS.
  `stash@{7}` (NetworksPage +1.064 Z.) ist veralteter WIP — Nachfolger `d93cd62d` ist drin.
- **OKF-Merge teilweise:** `pages.yml` bewusst NICHT genommen — `path: '.'` würde das
  ganze Repo als GitHub-Pages-Artifact publizieren und `workflow_dispatch` fällt raus.

---

## Session 2026-10-05 (II) — PR #15–#17 geprüft, gefixt, gemergt

**Anlass (verbatim):** „ok schau dir die prs an und diese widgetprobleme usw"

> „ok schau dir die prs an und diese widgetprobleme usw"

### PR-Status nach `git fetch`

| PR | Head | Befund |
|---|---|---|
| #15 `fix/navbar-widget-settings-grafana` | `82ed5a35` | ✅ **merge-fertig** — 0 Konflikte, build 0, Tests = Baseline, i18n = Baseline, **keine neue Dependency**. Basis = damals aktuelles main |
| #16 `feat/meshcore-integration` | `fb80fa29` | ⚠️ **baute nicht und stürzte ab** → gefixt in `5fa6bfb8` |
| #17 | `fb80fa29` | **identischer Head wie #16 = Duplikat** → eines schließen |
| #18 `feat/squadmesh-docs` | `ad4e2106` | Inhalt (`squadmesh/*`) **liegt längst in main**; der Branch hängt auf altem main und würde 17 absichtlich gelöschter Dateien zurückholen (3 Components = 1.973 tote Zeilen aus S181-12, 14 umgezogene Docs) → **schließen statt mergen** |
| #19 `feat/squadmesh-impl` | `e770777d` | SquadMesh (8 Commits, root `go.mod`) — andere Session |

### Die Widget-Frage ist entschieden (PR #15)

`ui/sheet.tsx` ist **neu** und gebaut auf `@base-ui/react/drawer` — das Package ist schon
als Dependency da (`@base-ui/react ^1.3.0`), `package.json`/`package-lock.json` bleiben
unverändert → **keine neue Dependency (Zustimmungsregel verletzt nicht)**.
`WidgetSettingsDrawer.tsx`: 489 → 259 Zeilen, **67 → 0 tsc-Fehler**, keine doppelten
Imports/Exports mehr — und **er ist nicht mehr tot**: `DashboardBuilderPage` importiert
ihn (Zeile 41) und rendert ihn mit `settingsOpen` (Zeile 272). Punkt 10 der Next Steps
ist damit **erledigt**.

### Was an PR #16/#17 kaputt war (behoben in `5fa6bfb8`)

| # | Defekt | Folge |
|---|---|---|
| 1 | `PluginInstallWizardDialog.tsx`: 3 unbeschlossene `<div>` + 2 überzählige `}` | webpack/esbuild-Syntaxfehler → **Build-Abbruch**, **9 Testdateien** als Kollateralschaden |
| 2 | `TeamsPage.tsx`: fehlendes `}` hinter `render={<Button…/>}` (294), fehlendes `</div>` für div 178 | Build-Abbruch |
| 3 | `index.css`-Rewrite hatte **`--color-foreground` gelöscht** (main: Zeile 42) | `@apply bg-background text-foreground` → Tailwind-Fehler **und** jeder `text-foreground` im App-Code wäre stillschweigend tot geworden |
| 4 | `style="font-variation-settings…"` als **String** statt Objekt | React wirft |
| 5 | `ArrowBack`/`ArrowForward` existieren in **lucide-react nicht** | `undefined` im JSX → „Element type is invalid" |
| 6 | `config` wurde als **Objekt** gesendet, `authMode` steckte darin statt auf Top-Level | Backend `pluginInstallRequest` (gateway/plugins.go) will `config` als **JSON-String** und `authMode` oben → **400 bei JEDEM Install** |
| 7 | Auto-Select der ersten Scope-Zeile **entfernt** | SPRINT-140-Vertrag „the preselected REAL workspace scope" gerissen → Effekt zurück |
| 8 | Guard `isJules && !selectedSource` | `GET /api/plugins/jules/sources` liefert `{sources: []}` ohne Jules-Key → **Schritt 2 dauerhaft gesperrt (Deadlock)** → Guard entfernt, `sourceId` bleibt optional |

Locale-Konflikte (alle 60 Dateien, beide Seiten rein additiv) als **echter 3-Way-Merge**
aufgelöst statt blind `--ours`/`--theirs`: **+840 Keys, 0 echte Konflikte**. Ursache: #16/#17
hing auf merge-base `d13b09b6` (PR #11) und zog main nie ein, #15 hatte das via `82ed5a35` getan.

### Tore nach dem Port auf `399702d2` (Merge-Commit `fec9c67f`)

| Gate | Ergebnis |
|---|---|
| `go build` / `go vet` / `go test` | **0 / 0 / 0** ✅ |
| `npm run build` | **exit 0** ✅ |
| `npx vitest run` | **23 failed / 602 passed** — **exakt dieselben 7 Dateien wie Baseline (Delta = 0)** ✅ |
| `npm run check:i18n` | **767** = Baseline ✅ |
| `tsc -p tsconfig.app.json` | ⚠️ **239 Fehlerzeilen** (Baseline 132) |

### Offene Punkte

- **tsc 239 statt 132 — meshcore bringt ~170 eigene Type-Fehler**, verdeckt durch
  `typescript.ignoreBuildErrors: true`. Gröbste Nest: `MeshSquadTeamBuilderPage` (44),
  `meshcore/*` (57), `keys/*` (25), `DashboardBuilderPage` (17), `AgentSessionDetailPage` (16),
  `RolePanel` (15), `PluginInstallWizardDialog` (15), `TeamsPage` (10), `SubagentApprovalQueuePage` (11).
  → **Operator-Entscheidung: später angehen, hier nur dokumentiert.**
- **`src/frontend/src/components/traces/OpenReplayEmbed.tsx` (S174, `a0564cbd`) hat einen
  Parse-Fehler** — `<TooltipProvider>` (Zeile 106) ohne `</TooltipProvider>` → TS17008 + TS1128.
  Die Datei ist **nirgends importiert**, deshalb fällt `npm run build` nicht auf sie an,
  **tsc aber maskiert sie das GESAMTE Programm** (siehe „132-Fehler-Irrtum" oben): solange sie
  kaputt ist, meldet tsc nur diese 2 Zeilen. Messung ohne sie = 239. Andere Session (S174) —
  **nicht angefasst**.

---

## Session 2026-10-05 (III) — PR #20/#21 gemergt, die 6 neuen Views semantisch repariert

**Anlass (verbatim):** „es gibt neue prs"

> „es gibt neue prs"

### PR-Status (nach `git fetch '+refs/pull/*/head:refs/remotes/pr/*'`)

| PR | Head | Befund |
|---|---|---|
| #20 `fix/utility-route-traefik` | `1aff9ea1` | ✅ **gemergt** (`a05f9697`) — 1 Commit, 0 Konflikte: `PathPrefix('/utility')` in der Traefik-Regel (ansible-Label + local-stack-Spiegel byte-identisch), `ai/metrics.go`, `docs/API_DOCS.md` +37 Z. |
| #21 `feat/git-graph-backend` | `f3cc0283` | ✅ **gemergt** (`218ebbc3`) — 1 Commit, 0 Konflikte: `deploy/git_log.go` (233 Z., read-only) + `git_log_test.go` (293 Z.), 2 Hooks in `deploy.go`/`workspace_integrity.go`, API_DOCS +21 Z. |
| #17 | `26e32388` | ✅ **inzwischen gemergt** (`f8dbd7db`) — hatte 2 echte neue Commits bekommen, „Duplikat"-Urteil war veraltet |
| #18 `feat/squadmesh-docs` | `ad4e2106` | ⛔ **schließen** — `git diff main pr/18` zeigt, er würde REPO_STATE.md, NEXT_SESSION_PROMPTS.md, pages.yml und die ClickHouse/Grafana-Deploy-Dateien **löschen** (Branch hängt auf altem `ac39cbb1`); seine „neuen" Dateien sind absichtlich gelöschte |
| #19 `feat/squadmesh-impl` | `e770777d` | ⏸ anderes Session-Eigentum, unberührt |

**Sonderfall `deploy/backend/ansible-task.yml`:** PR #20 ändert dieselbe Datei, in der
**fremde uncommittete Arbeit** liegt (`JIMESH_OTEL_SPANS_PATH`). Reihenfolge: Diff nach
`/tmp` sichern → Datei auf HEAD zurücksetzen → mergen → Diff exakt wieder anbringen →
`git reset --` (wieder unstaged). Verifikation: gespeichert vs. jetzt = **genau eine Zeile**
(der PR-#20-Traefik-Regel), der fremde OTEL-Eintrag ist unverändert da.

### Der eigentliche Befund: PR #17s neue Views hatten 67 Syntax- UND 135 Type-Fehler

Syntaxfehler unterdrücken die semantische Prüfung — als die6 Syntaxfehler weg waren,
kamen **135 TS-Fehler in denselben 6 Dateien** zum Vorschein (Probe-Config
`/tmp/opencode/tsconfig.newviews.json`, da `tsc -p tsconfig.app.json` weiterhin von
`OpenReplayEmbed` maskiert wird). Ursachen und Fixes:

| Datei | Fehler | Fix |
|---|---|---|
| `PermissionsPage` (65) | 3× doppelter Konstantenblock (`SUBJECT_TYPES`/`RESOURCE_TYPES`/`ACTIONS`/`EFFECTS`), 2× doppeltes `queryClient`/State-Block, 2× `findResource`, `Checkbox`-Import ohne Modul (`ui/checkbox` existiert nicht), `DotsVertical` nicht in lucide | Duplikate entfernt (jetzt **genau 1×** je Deklaration), Import raus, `EllipsisVertical`/`CircleCheck`/`CircleX` |
| `LightningDashboardPage` (45) | doppelter State-Block + `queryClient`, `useQueryClient` nicht importiert, `Eye`/`Rocket`/`FlaskConical` nicht importiert, `Progress value` = string statt number | Block raus, Imports ergänzt, `Number(progress)` |
| `WorkersDashboardPage` (14) | `queryFn`-Mock erfüllt `Worker` nicht (env-Union), 4× `Partial`-resources-Select-Kaskade, 2× Select-Handler | `as Worker[]` / `as Worker['resources']`, `(v ?? 'all') as …` |
| `AgentLifecyclePage` (5) | toter `Dialog`-Import, 2× Select-Handler | Import gelöscht, `v => setX(v ?? 'all')` |
| `CloudProviderConfigPage` (4) | toter `Dialog`-Import, `value={v \|\| ''}` mit `{}` | Import gelöscht, `v as string` |
| `SquadMeshStatusPage` (2) | `<Select className>` (Root hat kein `className`), `toast.warning` existiert nicht | `className` auf `SelectTrigger`, `toast.info` |

Zusätzlich **API-Mismatch über alle PR-#17-Views + `TeamsPage`**: die Dateien importierten
`DialogContent`/`DialogHeader`/`DialogFooter`, die `ui/dialog.tsx` (base-ui) gar nicht
exportiert → `<div>`-Header/Footer, `DialogPopup` statt `DialogContent`. Das Gleiche steht
im Baseline-Bestand (`DashboardBuilderPage` 2×, `TeamsPage`), dort bewusst **nicht**
angetastet.

**Ergebnis: `tsc`-Probe 241 → 105 Fehlerzeilen, in den 6 Views = 0** (Rest =
Altbestand anderer Dateien, s. „Offene Punkte" oben).

### Tore nach PR #20/#21 + View-Reparatur

| Gate | Ergebnis |
|---|---|
| `go build` / `go vet` / `go test` | **0 / 0 / 0** ✅ (inkl. `go vet`, der durch `logger.go` `derive()`-Fix erst grün wurde — Copylocks war Baseline-Find aus `a0564cbd`) |
| `npm run build` | **exit 0** ✅ |
| `npx vitest run` | **23 failed / 606 passed** — dieselben 23 wie Baseline, +4 neue grüne Tests ✅ |
| `npm run check:i18n` | **767** = Baseline ✅ (exit 1 bewusst, S181-7) |
| `npx tsc --noEmit` | ⚠️ weiterhin Baseline-Problem (Config `TS6306`/`TS5101` + `OpenReplayEmbed`-Maske) — **Operator-Entscheidung: später angehen** |

### Offene Punkte

- **`MeshSquadTeamBuilderPage.tsx` + `components/meshsquad/RolePanel.tsx` sind Waisen:**
  ihre 5 Import-Dependencen (`lib/meshsquad/api`, `lib/meshsquad/types`, `RoleNode`,
  `TeamForm`, `TeamsList`) wurden von `0207887c` gelöscht, die zwei Seiten sind nicht
  geroutet und nicht von `App.tsx` importiert → Build geht durch, isolierter tsc = 37 Fehler.
  **Entscheidung offen: 5 Module zurückholen oder die 2 Dateien fallen lassen.**
- **`deploy/backend/ansible-task.yml`, `src/backend/go.mod`/`go.sum`, `ai/proxy.go`,
  `gateway/*.go`, `siem/*`, `oteltrace`, `siem-bridge`, `projects_ssh.go` = fremde
  uncommittete Arbeit** — in dieser Session weder gestaged noch committed (nur die
  ansible-Datei wurde temporär für den Merge angefasst, s. o.).

---

## Session 2026-10-05 (IV) — PR #19: SquadMesh baut zum ersten Mal, main gemergt

### Ausgangslage: die „42 errors resolved" waren ungeprüft

PR #19 stand auf `7877438b` („fix Go compilation errors - 42 errors resolved") — in der
meldenden Session gab es kein Go (der eigene Next Step lautete „Test on superleo with
Go 1.23"), kompiliert wurde nie. Reproduziert in `golang:1.24`:

| Zustand | Ergebnis |
|---|---|
| `go.mod` wie gepusht | **nicht parsbar** — `go` startet gar nicht (3 ungültige Einträge) |
| nach Reparatur, `7877438b` | exakt **42** Fehler — unverändert zum Stand vor dem Fix |
| nach dem `cloudflare.go`-Syntaxfix | **50** — die zuvor maskierten Paketfehler kamen zum Vorschein |
| Endstand dieser Session | **0** |

Fairness-Befund: die Duplikat-Bereinigung war **echt** (workerd 5→0, workers_ai 3→0,
gcp_cloudrun 4→0, aws_lambda 4→0, cloudflare 4→0, gvisor 5→1) — sie war nur durch den
`cloudflare.go`-Backtick verdeckt, der das gesamte `workers/providers`-Paket am Parsen
hinderte. Nicht angefasst hatte der Fix dagegen `tracing` (18), `manager.go` (9),
`bus` (6) und `storage` (5) — genau die vier Gruppen der gezählten 42.

### Reparatur

- **go.mod / go.sum**: ungültige Einträge entfernt (`go.opentelemetry.io/otel/semconv/v1.21.0`
  als Modulpfad, Phantom `otel/propagation`, `ugorji v1.21.11` → `v1.2.11`), `go mod tidy`,
  **`go.sum` ergänzt**, `go 1.26.0` (erzwungen durch `cloud.google.com/go/run v1.23.0`;
  `src/backend` steht bereits auf `1.26.0`), Root-`go.mod` **gelöscht** (stale Duplikat des
  squadmesh-Moduls mit dem fabrizierten `tinode/chat/proto v0.0.0-…-000000000000`-Pin).
- **Struktur**: `workers/manager.go` deklarierte `package providers`, lag aber ein
  Verzeichnis höher — es konnte die Provider-Konstruktoren nicht sehen, und `orchestrator`
  konnte `WorkerManager` nicht. Verschoben nach `workers/providers/`.
- **Verschluckte Deklarationen**: `governance/governance.go` enthielt den Platzhalter
  `type Request struct { ... }`, der die Signatur von `SubmitRequest` fraß (4 Aufrufer);
  `RequestTemplate` fehlte komplett. `cmd/main.go` hatte ein überzähliges `}` (die
  Funktion endete ~450 Zeilen zu früh, Chat-API stand auf Paketebene).
- **API-Fixes**: tracing (doppelte `Attr*`-Konstanten, `trace.WithAttributes(...)` statt
  barem `[]attribute.KeyValue`), bus (`RedisCursorStore` vom `CursorStore`-Interface
  getrennt, `XRevRangeN`), storage (Multipart über `minio.Core` — `*minio.Client` hat nur
  unexportierte Helfer; zugleich wird der letzte Teil jetzt wirklich hochgeladen statt
  verworfen), ws (`send` war gleichzeitig Kanal und Methode → `deliver()`, `Invite`-Arity 5,
  `gin-contrib/sse` hat kein `Writer` → `io.Writer` + `sse.Encode`, Catch-Up fächert auf
  den Channel auf), aws (`config`-Shadowing, `lambda/types`), gcp (GAPIC-Client
  `cloud.google.com/go/run/apiv2` statt genproto-Interface), gateway
  (`SubscribeTopic` liefert 3 Werte).
- **CLI-Flags zurückgeholt**: `README.md` ist beidseitig identisch und dokumentiert
  `./squadmesh -mode=gateway -channels=general,marketing` — seit der Abspaltung von
  `internal/config` band aber nichts mehr. `config.Load()` bindet jetzt 11 Flags
  (Defaults = die Env-Werte), verifiziert per `-h`-Smoke-Test.
- `gofmt`: 21 von 24 Dateien unformatiert → **0** (gofmt parst alle Dateien, d. h. damit
  ist auch sicher, dass kein weiterer Platzhalter mehr im Code steht).

### Merge `origin/main` (`2de2ecba`) — 10 Konflikte, alle add/add

squadmesh existiert im Merge-Base (`ac39cbb1`) nicht, daher konfliktiert jede
beidseitig unterschiedliche Datei. Auflösungen:

| Datei | → | Begründung |
|---|---|---|
| `Makefile` (Root) | **main** (622) | Der Branch hatte `squadmesh/Makefile` nach oben verschoben; dieses kommt von main zurück und ist **byte-identisch** mit dem, was der Branch im Root hatte → nichts verloren |
| `squadmesh/go.mod` | **Branch** | der reparierte Stand (+ `go.sum`) |
| `cmd/main.go`, `agent/standalone.go`, `bus/*.go`, `gateway/gateway.go`, `ws/hub.go` | **Branch** | mains Fassungen sind **byte-identisch** mit den Branch-Versionen *vor* meinen Fixes — es ist genau der Code, der nicht kompilierte |
| `squadmesh/SPRINTS.md` | **Branch + main** | Branch bringt Architecture Vision + S6/S7 (1221 vs. 621 Zeilen); mains **Cross-Cutting-Concerns**-Tabelle wurde an main's Position (direkt vor „Definition of Done") wieder eingefügt |
| `squadmesh/AUDIT_FINDINGS.md` | **Branch + main** | Branch ergänzt Demand Cluster 8–11; mains Schreibweise „machen **kann**" übernommen (Branch hatte „kan") |
| Root-`go.mod` | **gelöscht** | s. o. |
| `lightning_wrapper/*`, `squadmesh/Makefile` | automatisch | nur in main vorhanden → vom Merge übernommen |

### Tore

| Gate | Ergebnis |
|---|---|
| squadmesh `go build` / `go vet` / `go test` | **0 / 0 / 0** ✅ — erstmals grün seit Bestehen des Moduls |
| squadmesh `gofmt -l` | **0** ✅ |
| `src/backend` `go build` / `go vet` / `go test` | **0 / 0 / 0** ✅ |
| `npm run build` | **exit 0** ✅ |
| `npx vitest run` | **23 failed / 612 passed** — 23 = oberes Baseline-Ende (14–23), 612 > Baseline 599–606, main hat Tests dazugebracht ✅ |
| `npm run check:i18n` | **149 fehlende Keys** = identisch zu main's eigenem Baum → kein Regression; exit 1 weiterhin by design (S181-7) |
| `npx tsc --noEmit` | ⚠️ **398 Fehlerzeilen** — Baseline-Rotstand, Operator-Entscheidung „später angehen" gilt weiterhin |

### Offene Punkte dieser Session

- **tinode-Pin**: `github.com/tinode/chat` wird **nirgends importiert** (der Gateway
  definiert sein eigenes `TinodeClient`-Interface plus `MockTinodeClient`);
  `go mod tidy` entfernt deshalb jeden ungenutzten Pin wieder.
  **Operator-Entscheidung offen:** Pin drinlassen (dann `tidy` nicht mehr laufen lassen)
  oder warten, bis der Gateway das echte Modul importiert.
- **PR #24** (`feat/s186-wp3-workspace-file-editor`, 11 Dateien / +2819) noch nicht bewertet.
- **Push-Gate**: `feat/squadmesh-impl` lokal auf `846443a3` (2 eigene Commits + Main-Merge),
  `origin/feat/squadmesh-impl` steht bei `7877438b` → Push wäre Fast-Forward.
  **Kein Push ohne Operator-Zuruf.**

---

## Session 2026-10-06 — Netzwerk-Inventar, Doku-Restore & Zugriffsmodell Shared-Workspace

**Anlass (verbatim):** „zum thema zero trust access haben wir auch noch garnix und verschlüsselung.
der ansatz ist da aber irgendwie fehlt das alles" · „haben wir pro user vlans oder pro workspace?"

**Merge-Hinweis vorab:** PR #19 (`feat/squadmesh-impl`) trägt `## Session 2026-10-05 (IV)` an
derselben Einfügestelle (beide Blöcke sitzen vor `## Summary:`) → beim Merge **beide behalten**,
rein additiv, es überschneidet sich kein Inhalt.

### 1. Netzwerk-Ist vs. Soll — nur gelesen, nichts geändert

| Befund | Beleg |
|---|---|
| **VLANs sind pro Projekt**, nicht pro User und nicht pro Workspace | `project_vlans.vlan_id UNIQUE`; `vlanEnabled requires networkMode isolated` + `single-workspace framework deploy` (`deploy/projects_ssh.go:1600-1604`). Workspace-Ebene = L7-Routen (`workspace_routes`), User-Ebene = nur API-Grants |
| **S185 ist weiterhin nur Plan** (Header selbst: „PLAN — nichts davon gebaut") | `domain/schema/fabric.go` existiert nicht · `google/nftables` fehlt in `go.mod` · 0 Treffer auf `jimesh_fabric`/`DataplaneState` · `enable_nat` immer noch `DEFAULT 1` · **kein** Code, der NAT schreibt (macht implizit Docker) |
| **Die Soll-Direktive steht im Repo, wird aber gebrochen** | `deploy/traefik/defaults.yml:4-6` zitiert den Operator (16.9.): *„Traefik is the ONLY service that ever needs a host port"* — `deploy/topology.yml` publiziert trotzdem **6 Services / 7 Loopback-Ports** (backend 19091/19092, frontend 19090, postgres 5432, redis 6385, vault 8200, keycloak 8081); nur **3** Services tragen `traefik.enable=true` |
| **Kein einzelner Go-Ingress, sondern vier Feature-Silos** | `cmd/jimesh-router` (node-seitig, fail-closed JWT) + `internal/gateway/{embed,project_utility,tunnel}.go`; der echte Edge ist **Traefik** (nicht Go, nicht unser) |
| **Zero-Trust/Encryption: Transport fehlt** | da: Vault (Mandat 9), Service-Keys, OPA, Keycloak-JWT, WireGuard node-to-node · **fehlt**: alles Container-zu-Container (`sslmode=disable`, kein Redis-TLS, kein mTLS) · **Achtung: `SPRINT-185` O-12 ist ein Operator-Zitat** („https fehlt aber scheissdrauf") → TLS war dort **bewusst ausgeschlossen**; ein „Verschlüsselung jetzt"-Auftrag hieße, O-12 explizit aufzuheben |

### 2. Doku-Verlust gefunden und (teilweise) gerettet

- **`docs_dev/` steht in `.gitignore:51` und war nie in git.** Der Hygiene-Commit `2e6f9196`
  („root/repo hygiene cleanup", 351 Doc-Dateien, die Commit-Message nennt `docs/research/` **nicht**)
  hat **24 research-Docs aus dem Tree genommen**. Auf der Platte sind sie alle noch — byte-identisch
  unter `docs_dev/research/`. Verloren ist also **der Git-Tree**: jeder frische Clone, CI und jeder
  andere Worktree haben sie nicht.
- **`docs/research/networks_gvisor.md` wiederhergestellt** — 319 Zeilen, `git hash-object` =
  `6d1a6304…` **byte-identisch** mit `2e6f9196^`. Zuvor hingen **4 Code-Verweise** ins Leere,
  alle mit „verified research, do not re-derive" (`internal/network/vlan.go:4`,
  `store/workspace_routes.go:20`, `cmd/jimesh-router/routes.go:4` + README:119). Die lösen sich
  wieder auf. Datei ist **nur restored, nicht gepusht** (Push-Gate gilt).
- **Audit vom 29.9. (`THREE-WEEK-AUDIT-2026-09-29.md`) hatte R44/R45 schon bewertet:** die drei
  Konsens-Docs sind in `TASK-PLAN-PLUGIN-SYSTEM.md` konsolidiert → *kein* Inhalt verloren.
  **`R45-dsh-cordis-jimesh-bridge.md`** ist dagegen als **echter, ersatzloser Verlust** markiert
  (DSH↔MCP-Bridge-Spec zu den Phantom-Routen B14) — sie liegt nur in `docs_dev/`. → **Restore
  offen, Operator-Entscheidung.**

### 3. Zugriffsmodell Shared-Workspace — entschieden und dokumentiert

**Operator (6.10., verbatim):** „user zu erstellen in den container ist bullshit für jetzt …
entweder hat der halt write, dann hat er ne shell und kann da sachen direkt deployen und direkt
auf die project settings zugreifen in dem workspace, oder er hat es halt nicht, dann hat er halt
seinen eigenen workspace der separiert ist."

→ **Binäres Modell**, kein Read-Only-Zustand, keine OS-User im Container (die earlier-Idee
„Hauptworkspace default read-only bis auf Admins" ist zusammen mit den OS-User **vertagt**).
Lief dokumentiert in **`docs/sprints/SPRINT-186-…-LINEAR.md` §6** — dort auch die Belege und die
Acceptance-Erweiterung für WP1–WP3. Die harten Befunde dahinter:

| # | Befund |
|---|---|
| 1 | **Drei Gates, zwei Membership-Wahrheiten:** Workspace-Terminal = owner **OR `workspace_members`**; Files-GET = owner **OR `project_roles`**; Projekt-Terminal/Utility/Vault/Plugins/MeshSquad = `VaultProjectDenial` (**`project_roles`** + `jimesh-dev`). Ein Member-Grant reicht für die Shell, **nicht** für die Dateien — und umgekehrt. Upload/DELETE sind via OPA sogar **admin-only** (striker als die Shell) |
| 2 | **`workspace_members.role` ist tot:** `viewer\|collaborator` wird persistiert (CHECK), `IsWorkspaceMemberByIdentity` liefert aber `bool`; `WorkspaceMemberCollaborator` außerhalb seiner Definitionsdatei **0 Vorkommen** |
| 3 | **Vier unverdrahtete Rollensysteme:** Keycloak `admin\|operator\|viewer` · `workspace_members` `viewer\|collaborator` · `project_roles` `admin\|manager\|developer\|sub_agent` · Realm `jimesh-dev` |
| 4 | **Shared-Workspace-Default ist heute „niemand außer admin"**, nicht „alle lesen": `terminal.go:36` — *„operator/admin-only unless a member grant names the caller"* |
| 5 | Read-Only ohne OS-User **nicht definierbar**: kein Primitive auf User-Ebene (VLAN pro Projekt, Routen pro Workspace, Mounts pro Container) und `createWorkspaceExec` setzt kein `User:` (`gateway/terminal.go:356`) |

### 4. In dieser Session getan

- `main` nur **fast-forward** `22e4786a` → `2de2ecba` (kein eigener Inhalt darauf)
- `docs/research/networks_gvisor.md` wiederhergestellt
- `docs/sprints/SPRINT-186-…-LINEAR.md` §6 neu (Zugriffsmodell)
- **Nichts gepusht** (Push-Gate), SquadMesh unberührt, PR #19 unverändert

### 5. Offen

1. **Push-Gate weiterhin offen** — PR #19 (`664d10a0` + `846443a3` + `3a525c20` über `7877438b`)
   wartet auf den Zuruf; tinode pin-vs-`go mod tidy` unentschieden.
2. **`R45-dsh-cordis-jimesh-bridge.md`** aus `docs_dev/` in den Tree zurückholen? (Audit sagt:
   echter Verlust.)
3. **S185 gegen Ist nachschärfen** — Status „nichts gebaut" ist oben verifiziert; O-1…O-11 stehen
   als Paraphrase mit `[Zitat-TODO]` da, der Wortlaut fehlt.
4. **Port-/Ingress-Inventar** als Grundlage für „nur Gateway + Headscale haben NAT" — nicht
   erstellt (in dieser Session bewusst nur gelesen).
5. **Read-Only-Modell / OS-User im Container** — vertagt, erst wenn der Shared-Workspace
   multi-user-*editierbar* werden soll (dann zusammen mit §6 neu bewerten).

### 6. Go-Signal (10.10.): Push, alle PRs gemergt, Deploy gestartet

**Anlass (verbatim):** „ja mach halt jetzt und deploy mal alles"

| Was | Ergebnis |
|---|---|
| Restore `docs/research/networks_gvisor.md` | ✅ `477f60de`, byte-identisch `6d1a6304…`, die 4 Code-Verweise lösen sich wieder auf |
| Restore `docs/research/R45-dsh-cordis-jimesh-bridge.md` | ✅ `0128e169`, byte-identisch `e67e76e3…` (Audit-Befund „echter Verlust" damit erledigt) |
| **Push `main`** | ✅ `2de2ecba` → `0128e169` (rein additiv, FF) |
| **PR #19 `feat/squadmesh-impl`** | ✅ **MERGED** `848cc358` — Push `7877438b` → `e3b9bdc6` (FF), **Gates vor dem Push: squadmesh build/vet/test/gofmt = 0/0/0/0, backend = 0/0/0**. Erwarteter BACKLOG-Konflikt („(IV)" vs. „10-06" an derselben Einfügestelle) **additiv aufgelöst, beide Blöcke** (`e3b9bdc6`) |
| **PR #24 `s186-wp3-workspace-file-editor`** | ✅ **MERGED** `2f91db08` — 3 Konflikte aufgelöst (`facf7151`), s. u. |
| **PR #26 `s187-vscode-extension`** | ✅ **MERGED** `aff7675b` — konfliktfrei; 3134 Z. reine `src/vscode-extension/*` + 6 Backlog-Zeilen, Plattformcode unberührt |
| **Offene PRs** | **keine mehr** |

**Auflösung PR #24 im Detail (3 Konflikte, bewertet statt blind gewählt):**

| Datei | Wahl | Warum |
|---|---|---|
| `views/ContainerLogsPage.tsx` (add/add, 23 Bloecke) | **main** | PR importiert `DialogContent/DialogHeader/DialogFooter`, die `ui/dialog.tsx` **nicht exportiert** (nur `Dialog, DialogTrigger, DialogClose, DialogPopup, DialogTitle, DialogDescription`), Zeile 346 kaputtes JSX (`<span>Log Detail</DialogTitle>`), `Tabs/Table/Textarea/Separator` importiert und **0× benutzt**. main = die reparierte Fassung (`8f1bdb57`) |
| `views/LightningDashboardPage.tsx` (8 Bloecke) | **main** | main hat die volle Fassung (Run/Model/Experiment-Typen, Status-Configs, queryClient, Edit-Dialog); die PR-Fassung (`d3f7c833`) ist ein Lint-Sweep, der genau diese Strukturen entfernte, weil der PR-Zweig `56c7a7c1` (semantische Reparatur) nie bekam |
| `eslint.config.js` (1 Zeile) | **PR** | `project: './tsconfig.app.json'` statt `./tsconfig.json` — das ist die Config, die auch der Gate `tsc -p tsconfig.app.json` benutzt |

**Nichts verloren:** die 7 neuen PR-Dateien (STITCH-Prompt, lightning Design-Assets,
`squadmesh/lightning_wrapper`) liegen in `origin/main` **byte-identisch** (geprüft gegen
`848cc358`) — sie kamen über `9039bb2b` rein. `git diff origin/main` nach der Auflösung zeigt
deshalb **nur** `eslint.config.js`.

**Tore PR #24 (Baseline-Vergleich, Frontend):** `npm run build` **RC 0** ✅ · vitest **23 failed /
612 passed = exakt Baseline** ✅ · `check:i18n` **149 = Baseline** ✅ · `tsc --noEmit` 1189 Zeilen
— **Kontrolllauf auf `origin/main` mit identischer Methode: 1189 Zeilen, 392× TS6305, mit
`-p tsconfig.app.json` 493 = identisch** → **kein tsc-Regression** (die in älteren Sessions
notierte „398" stammt aus einer anderen Messmethode; entscheidend ist die Gleichheit mit main).

### ⚠️ CI-Befund (NEU, bislang nie diagnostiziert) — `main` ist chronisch rot

Alle `JiMesh CI/CD Pipeline`-Läufe auf `main` schlagen fehl — **auch vor dem heutigen Push**
(`18c06a65`, `b0a43270`, `ee365521`, `22e4786a`, `2de2ecba` = alle `failure`). Drei Ursachen:

1. **`Test & build (Node 20/22)` — `npm error Missing script: "test"`.** `ci.yml:108/110` ruft
   `npm test` und `npm run build` **im Repo-Root**; `package.json` (Root) hat aber nur
   `validate:plugins` und `check:i18n`. Die Frontend-Tests **laufen in CI seit Wochen nie an**
   (`npm ci` davor läuft korrekt mit `working-directory: src/frontend`).
   → Fix wäre `working-directory: src/frontend` an beiden Schritten.
2. **Selbst mit dem Fix bliebe der Job rot:** `npm test` in `src/frontend` ist
   `vitest run …; check:i18n …` → vitest 23 failed **und** i18n 149 (S181-7) → RC≠0.
   **Erst S181-7 + die 23 Testfälle machen diesen Job grün** — deshalb hier bewusst
   **nicht** angetastet (sonst verschiebt sich die Gate-Baseline mitten im Deploy).
3. **`Secrets & Credentials Scan`** scheitert auf PRs mit `RequestError: Resource not
   accessible by integration` (gitleaks `ScanPullRequest` braucht `pull-requests: read`;
   der Workflow hat **keinen `permissions:`-Block**). Auf `main` geht er durch.

**Konsequenz:** „Gates grün" gilt hier für die **lokalen Gates** (die oben tabelliert sind);
die CI-Pipeline ist ein eigenständiges, offenes Backlog-Item. → Next Steps 14.

### 7. `make deploy-all` war von Anfang an defekt + Trading-Rest-Audit

**Anlass (verbatim):** „nicht auf dem alten trading server deployen, ich hoffe die ip usw ist
aus den configs raus" · „du musst lokal deployen wir sind schon auf dem richtigen server"

**Erster Deploy-Lauf endete mit RC=2**, nachdem Provisioning und Checkov bereits sauber
waren:

```
[deploy-all] lokales Ziel — provision-node ueber ansible-playbook direkt hier, kein Runner-Container, kein SSH
Node ready: Docker 29.8.2 (was already present, no install tasks ran), network 'jimesh-net' present, gVisor not requested.
[checkov-preflight] ✅ All scans passed
/bin/sh: 11: Syntax error: Unterminated quoted string
make: *** [Makefile:306: deploy-all] Fehler 2
```

**Ursache (nicht im Deploy, im Makefile):** das control-plane-Rezept war **zweimal** eingefügt
und die **erste Kopie mitten im String abgeschnitten** — Zeile 337 war exakt
`\t\techo "[deploy-all] n` (21 Bytes, kein schließendes `"`, kein abschließendes `fi`), gefolgt
von einer **zweiten, vollständigen Kopie** (338–349). `sh` parst den `if…else…fi`-Block als
Ganzes → ein nicht geschlossenes Anführungszeichen bricht *jede* Ausführung ab.

*Fix:* `9957c277` — die 11 Zeilen der kaputten Kopie entfernt, die vollständige behalten.
`make -n deploy-all` geht damit von RC=2 auf **RC=0**, doppelter Block 2 → 1, abgeschnittene
`echo`-Zeilen 1 → 0.

**Warum das nie auffiel:** `config.yml` behauptet selbst „deploy-all wurde NICHT ausgeführt" —
der Defekt war der **Grund** dafür, nicht die Folge. Er liegt bereits in `main` (Working-Tree
war sauber, `git show HEAD:Makefile` liefert denselben Defekt), die letzte Makefile-Änderung
ist der Merge `b2a7f961`.

**Trading-Rest-Audit (Evidenz, kein Bauchgefühl):**

| Prüfstelle | Ergebnis |
|---|---|
| `config.yml`, `config.example.yml`, `Makefile` | **0** `TRADING_*` — der alte Knotenblock (`host: ${TRADING_CLIENT_BRIDGE_IP}` etc.) ist durch `superleo` ersetzt (`fe09f88c`) |
| `.env` — hier stecken die *echten* Werte | **0** `TRADING_*`-Variablen definiert |
| `deploy/ansible/inventory/.rendered.ini` | nur `client ansible_connection=local` + `superleo ansible_connection=local` — **kein einziges Remote-Ziel** |
| `.env` → Ziel | `SUPERLEO_CONN=local`, `SUPERLEO_PUBLIC_IP/VPN_IP=100.127.129.65` = diese Kiste |

Verbliebene `TRADING_`-Nennungen (4 Code-Zeilen, alle handlungslos):
`deploy/client/scripts/client-join.sh:320` **liest** `TRADING_VPN_IP` aus `.env` → dort leer →
die `-n`-Prüfung bei `:412` unterdrückt den Auto-Forward; dazu `deploy/client/.env.example:42`
und 2 READMEs (Doku). `192.168.178.116` in `config.yml:60` ist **superleos eigenes WLAN**, kein
Trading-Server.

> Ergebnis: der Deploy-Pfad enthält **keine** alte Trading-IP mehr und kann technisch **gar
> kein** Remote-Ziel treffen — alles läuft über `ansible_connection=local`.

### 8. Deploy-Ergebnis, drei weitere Defekte, Creds-Automatisierung (S186-Datenseite)

**`make deploy-all`: erst RC=2 (§7), dann `DEPLOY_ALL_RC=0`** — 14 Services dispatched,
Log `/tmp/opencode/logs/deploy-all-2.log` (4 Fatals in Zeile 204/1495/1895/2449).
Vier Defekte dabei gefunden und behoben:

| # | Defekt | Fix | Beweis |
|---|---|---|---|
| 1 | `deploy-all`-Rezept doppelt, erste Kopie bei Zeile 337 mitten im String abgeschnitten (`echo "[deploy-all] n`) | `9957c277` (§7) | `make -n` RC 2 → **0** |
| 2 | `deploy/siem/docker-compose.yml` Zeilen 227–263 mit Einrückung **8** statt **6** (37 Zeilen) → `yaml.safe_load` Fehler, blockierte **siem + falco-gvisor-integration** | Dedent, 74 Z. geändert | `yaml.safe_load` OK, danach `siem` **RC=0** |
| 3 | `Makefile` `PLATFORM_SERVICES := dns …` — `deploy/dns/` existiert seit dem cp\|client-Split **nicht** mehr | `:= cp/dns …` | `cp/dns` redeploybar, RC=0 |
| 4 | `make redeploy` ließ `rc` nach `record-deploy` verloren → **jeder Fehler wurde als `status:"deployed"` protokolliert** (falsch-grün) | Pre-Dispatch `CHECKOV_PREFLIGHT_REDEPLOY` + `fi; \ record-deploy … exit $$rc` in **einer** Shell vereint | `SERVICE=dns NODE=superleo` → **RC=2** und `record-deploy` schreibt `ansibleRc:2,"status":"failed"` (vorher immer 0/success) |

**Service-RCs nach den Fixes:** `cp/dns` **0** · `siem` **0** (Wazuh 4.14.7 + Falco 0.42.0 +
siem-bridge LIVE verifiziert) · `datalake` **0** · `falco-gvisor-integration` **RC=2** (offen).

#### Creds-Automatisierung — Anlass (verbatim): „kannst du das nicht aus vault ziehen?" ·
„wieso kann man das nicht automatisieren mit ansible?"

Vault war die falsche Schublade: `deploy/vault/` enthält **keine** Ozone-/S3-Referenz
(`sealed: False, initialised: True` — der Pfad existiert schlicht nicht). Und ein Mint über
Ansible ist genau der Teil, der **nicht** automatisiert gehörete: `ozone s3 getsecret` in der
Redeploy-Schleife = **Rotation pro Deploy** = gebrochener laufender Client.

Was die Faktenlage aber zeigte:

| Befund | Beleg |
|---|---|
| Die Creds **existieren bereits** | `.env` trägt 7 `OZONE_S3_*`-Variablen, davon `OZONE_S3_ACCESS_KEY` (18 B) + `OZONE_S3_SECRET_KEY` (64 B) nicht-leer |
| Die „Grenze" existiert nur auf dem Papier | `Makefile:85` `LOCAL_ENV … export "$_l" < .env` und `Makefile:398` `--env-file .env` — der komplette Secret-Satz steht **bereits** in der Ansible-Umgebung; lokal dazu `ansible_connection=local`, also ohne Agent-Grenze |
| Das gewünschte Muster gibt es **bereits** | `deploy/backend/defaults.yml:134-139` liest dieselben Werte per `lookup('ansible.builtin.env')`, `deploy/backend/ansible-task.yml:148-151` reicht sie als `-e` durch (SPRINT-138/158) |
| Der Backend-Container hatte sie trotzdem **nicht** | `docker exec jimesh-backend env \| grep -c '^OZONE_S3'` → **0** |
| Minting ist der einzige echte Grund | „einmalig pro Node" steht genau deshalb im README |

**Entscheidung (Operator): „Automatisierung ins Repo bauen".** Gebaut:

- `deploy/datalake/ansible-task.yml` — 3 Tasks vor dem Präsenz-Check: Controller-Werte per
  `lookup('ansible.builtin.env')` → `set_fact` (**`no_log`**), Präsenz-**namen**-Probe (Shell,
  `grep -qE`, Ausgabe nur „welche Zeile fehlt"), `lineinfile` **fill-if-missing** — eine
  manuell gesetzte Node-Zeile wird nie ersetzt, ein leerer Controller erfindet keinen Wert,
  `no_log` auf allem, was einen Wert hält.
- Fail-Closed-Meldung und README aktualisiert: **Controller-`.env` zuerst prüfen**, Minting
  bleibt Operator-Step mit ausformuliertem Warum.
- **„Tut der Task nicht"** präzisiert: *minten* weiterhin nein, *stagen* ja (früher beides nein).

**Live-Beweis (`make redeploy SERVICE=datalake NODE=superleo` → RC=0):**

```
superleo : ok=28  changed=3  unreachable=0  failed=0  skipped=18
record-deploy: … "ansibleRc":0,"status":"deployed"
2026/10/06 12:21:34 [datalaked] ozone bucket "jimesh-datalake" ready at http://jimesh-ozone-s3g:9878
2026/10/06 12:21:34 [datalaked] consuming /^jimesh./ from [jimesh-datalake-kafka:29092] → Ozone … bucket "jimesh-datalake"
```

- Node-`.env` trägt jetzt `OZONE_S3_ACCESS_KEY` (18 B) + `OZONE_S3_SECRET_KEY` (64 B),
  **identisch mit der Controller-`.env`** (vergleich ohne Ausgabe der Werte).
- **Secret-Leak-Test:** Vorkommen von AccessKey und Secret im gesamten Deploy-Log = **0 / 0**.
- **Idempotenz:** `changed=3` beim ersten Lauf; identische Werte → kein Change beim nächsten.
- `jimesh-datalaked` stabil (`Up` über 50 s ohne Neustart), `/status` meldet
  `ozone: jimesh-datalake @ jimesh-ozone-s3g:9878`; Bucket existiert
  (`ozone sh bucket info s3v/jimesh-datalake`, owner `jimesh-filebrowser` — von der
  bestehenden Identität angelegt, d.h. die gestagten Creds sind **die richtigen**).
- `/status` steht ehrlich auf `"starting"` mit 0 Pipelines — solange keine `jimesh.*`-Topics
  existieren (kafkabridge noch nie gelaufen), kein Fake (README, Mandat 2).

#### 8b. `falco-gvisor-integration` — erster Defekt gefixt, zweiter eingegrenzt (RC=2)

**Defekt 1 (GEOFIXT): die runsc-Mount-Quelle nannte einen Pfad, den Docker nur als
leeres Verzeichnis auto-anlegt.**

| Befund | Beleg |
|---|---|
| `falco_gvisor_runsc_bin: "/usr/local/bin/runsc"` (`defaults.yml:92`) passt nur zu `src/scripts/install-gvisor.sh` (`mv runsc /usr/local/bin/`, Z.48) | Repo |
| provision-node installiert aber über die **grababyte-APT-Rolle** → das `runsc`-deb landet in `/usr/bin/runsc` | `dpkg -S /usr/bin/runsc` → Paket `runsc` |
| `/usr/local/bin/runsc` existierte als **Verzeichnis**, 4096 B, `mtime 13:44:45` | `stat` → `directory` |
| Der Container mounted genau das: `bind /usr/local/bin/runsc -> /usr/local/bin/runsc rw=false` | `docker inspect` |
| Folge: Falco stirbt mit `Error: Cannot find runsc binary`, Container `Restarting (1)` | `docker logs jimesh-siem-falco` |
| **Warum der eigene Pre-Check das nicht fing:** `runsc --version` läuft über PATH (`/usr/bin/runsc`) → **grün**, während der Mount auf dem leeren Verzeichnis sitzt | Task-Z.98–113 vs. Override-Z.86 |

*Fix:* der Task löst die Quelle **aus dem PATH auf** (`command -v runsc`), verifiziert per
`stat`, dass es eine **reguläre Datei** ist (`stat.exists` allein würde das leere Verzeichnis
akzeptieren), failt **vor** dem Recreate, und räumt Docks Auto-Artefakt weg
(`file: state=absent`, nur wenn `isdir`). Der Override bindet `{{ _runsc_mount_src }}` statt
des rohen Defaults. Nach dem Fix: `bind /usr/bin/runsc -> /usr/local/bin/runsc`,
Falco 0.42.0 läuft, Engine offen, `gvisor.sock` entsteht.

**Defekt 2 (NICHT gefixt, sauber eingegrenzt): Falco liest den Anschluss der Sandbox nie.**

| Befund | Beleg |
|---|---|
| Sandbox verbindet sich tatsächlich | `ss -xap`: `u_seq ESTAB … /var/run/…/gvisor.sock … users:(("falco",pid=…,fd=16))` |
| **Aber: `Send-Q = 2116`** — der Connector hat gesendet, Falco **liest nicht** | dasselbe `ss`-Ausgabe-Feld |
| Falco verbraucht **null** CPU über den ganzen Zeitraum | `ps -o time` = `00:00:00` vor **und** nach 40 s Sandbox mit 3000 Datei-Writes (6× `gvisor_sentry` live) |
| Kein einziges neues Event, auch keine Metrics-Snapshots mehr | `jimesh-events.json` eingefroren bei **10** Zeilen (letzte 12:36:22) |
| Exakter Task-Probe (`docker run --rm --runtime=runsc-falco --name jimesh-framework-demo-1 … "echo x >> /etc/jimesh-demo"`) in 0,2 s durchgelaufen, **0 neue Events** über 50 s Wartezeit | manuelle Reproduktion, Baseline demo=5 → 5 |
| Falco crasht gelegentlich mit `Error: vector` und startet neu (3 Instanzen in 8 min) | `docker logs`, 2× `Error:` |

→ Die Kette „Sandbox → Socket" steht, „Socket → Falco-Engine" nicht: Falco 0.42.0 blockiert
nach `Trying to open the right engine!`. Das ist **kein** Repo-/Config-Fehler mehr und wurde
deshalb nicht weiter überplant — der Task failt hier zu Recht ehrlich (Mandat 2).

**Nebenbefund (Diagnostik irreführend):** Docker hängt **allen** runsc-Varianten denselben
State-Root an — `runsc-sandbox --root=/var/run/docker/runtime-runc/moby`, sowohl für
`--runtime=runsc` als auch für `--runtime=runsc-falco` (Gegenprobe beide Fälle).
`/var/run/docker/runtime-runsc-falco/moby/` bleibt deshalb **leer**, und jede
`runsc --root {{ falco_gvisor_docker_runtime_root }} list`-Diagnose (Task-Z.566) liefert
zwingend „keine Sandboxes" — auch wenn 6 `gvisor_sentry`-Prozesse laufen. Die
Socket-Brücke funktioniert trotzdem, weil der Endpoint in `pod-init.json` absolut ist.

**Operator-Entscheidung (S186):** „Basis-Falco wiederherstellen". Ein Sensor, der 0 Events
liefert, schützt nichts — also der gVisor-Override abgenommen
(`docker compose -f /opt/jimesh/deploy/siem/docker-compose.yml --profile siem up -d falco`).
Verifiziert: `scap.engine_name: "modern_bpf"`, **0 runsc-Mounts**, `scap.n_evts` 24 → 160 473
in 15 s (11 934/s), Events-Datei 11 → 14 Zeilen in 35 s. **Aber Achtung:** der nächste
`make redeploy SERVICE=falco-gvisor-integration` setzt den Override wieder auf — der
Zustand ist bis zur Lösung von Defekt 2 also **nicht dauerhaft**. Bewusst NICHT am Task
herumgeschraubt: dessen Fail-Closed-Verhalten (Mandat 2) ist korrekt, das Problem sitzt in
Falcos gVisor-Engine.

**Noch offen nach §8/8b:** `falco-gvisor-integration` **RC=2** (Defekt 2, upstream-nah;
Betrieb läuft auf Basis-Falco, Override-Konflikt siehe oben) ·
`install_gvisor`-Präzedenz: `Makefile:310` schickt `-e install_gvisor=$(or $(GVISOR),false)`,
Extra-Var schlägt den Inventory-Eintrag `install_gvisor=true` → `deploy-all` meldet
„gVisor not requested" (befundlich, aber bewusst **nicht** umgestellt: der True-Pfad ließe
`provision-node` Docker neu starten, mitten im Deploy) · tinode pin-vs-`go mod tidy` ·
`tsc --noEmit` Baseline rot · CI chronisch rot (Next Steps 14).

---

## Session 2026-10-07 — Zwei stille Deploy-Defekte gemessen und repariert

Beide Defekte hatten dieselbe Form: **die Konfiguration war richtig, der
Transport war kaputt** — und beide fielen erst durch ein Gate auf, nicht durch
eine Fehlermeldung. Nichts davon war aus der Theorie abgeleitet; jede Kette
unten ist einzeln nachmessen.

### 1. Grafana/Prometheus: wer Staging-Werte prüft, muss die laufenden Bytes prüfen

`make redeploy SERVICE=grafana` lief grün (Staging stimmte gegen den Repo),
während `jimesh-prometheus` eine **veraltete** `prometheus.yml` servierte —
3 Scrape-Jobs statt 6, ohne jede Fehlermeldung. Messung:

| Blick | `prometheus.yml` | Inode | SHA |
|---|---|---|---|
| Repo / staged | 6 aktive Jobs | 44957984 | `dfb0f73c…` |
| **im Container** | 3 aktive Jobs | 44043524 | `8de2138b…` |

Ursache ist eine Kette aus drei harmlos wirkenden Einzelheiten: ein
**Einzel-Datei-Bind-Mount hängt am INODE**, `ansible.builtin.copy` ersetzt per
**rename** (neuer Inode), und `docker compose up -d` vergleicht nur die
**Compose-Konfiguration** → kein Recreate. Isoliert nachgestellt: `append` ist
sofort sichtbar (gleicher Inode), `rename over` liefert die alten Bytes, erst
`docker restart` löst den Mount neu (**SIGHUP bräuchte man gar nicht
ausprobieren** — es läse denselben veralteten Inode).

Reparatur in `deploy/grafana/defaults.yml` + `ansible-task.yml`:
- **EINE Quelle** `grafana_staged_file_mounts` (Pfad → Container + Pfad im
  Container); `grafana_staged_files` wird daraus abgeleitet. Damit kann ein
  Dashboard nicht mehr „im Repo existieren, aber nie gestaged werden" — genau
  so lagen `falco/firewall/suricata/threat-detection` wochenlang nur im Repo.
- Der Restart hängt nicht mehr an „hat MEIN copy geändert?" (das war der erste,
  **falsche** Versuch: die Datei war am Vortag gestaged, heute änderte sie
  sich nicht, der Restart lief nie), sondern an **beobachteter Divergenz**
  staged-Bytes vs. laufende Bytes — das heilt auch Altbestand und ist danach
  ein No-Op.
- Zwei Gates, die laut scheitern: `staged=6 running=6` (nur echte
  `- job_name:`-Zeilen, kommentierte zählen nicht mit) und
  `repo=6 staged=6 running=6` Dashboards.

### 2. Embed-Handoff: `JIMESH_EMBED_TARGETS` war **immer** gesetzt — und immer zerstört

Symptom im Dashboard: „No Grafana embed target is configured. Set
JIMESH_EMBED_TARGETS…". Die Variable stand aber in der `.env` **und** im
Container — nur ohne Anführungszeichen:

| Stelle | Wert | Urteil |
|---|---|---|
| `.env:184` roh | `[{"name":"grafana",…}]` | gültiges JSON |
| Make `include .env` + `export` (zeilenweise, kein Shell-Parsing) | identisch | heil |
| `ansible.builtin.command` mit **Freiform-`cmd:`** | `[{name:grafana,…}]` | **jedes `"` als Quote-Delimiter gefressen** |
| Container-Env `jimesh-backend` | `[{name:grafana,…}]` | byte-identisch zum Repro |
| `gateway/embed.go:114` | `json.Unmarshal` → Fehler | `/embed/*` aus, `GET /api/embeds` = `[]` |

Die Freiform-Variante läuft nicht durch eine Shell, wird aber **so gesplittet
wie eine** — das reicht, um die `"` zu verschlucken. Ein isolierter
Reproduktionslauf mit den drei Modi (argv / Freiform / shell) liefert das
Argument des Modus `argv` mit und die beiden anderen ohne Anführungszeichen,
und der Freiform-Wert ist byte-identisch mit dem, was im Container stand.

Reparatur in `deploy/backend/ansible-task.yml` (3 Teile, jeder einzeln getestet):
1. `-e 'JIMESH_EMBED_TARGETS={{ … }}'` einfach quotiert → überlebt den Split.
2. **Pre-Flight-Gate vor `docker rm -f`** (bewusst vor dem ersten destruktiven
   Schritt — sonst bliebe bei kaputtem Wert gar kein Backend mehr): muss ein
   JSON-ARRAY sein und darf kein `'` enthalten; bricht mit Klartext-Meldung
   über `block/rescue`.
3. **Log-Gate danach** liest das *eigene Verdikt des Gateways*
   (`not set` / `is not valid JSON` / `N embed target(s) mounted`) mit Retries
   gegen das Startrennen und verlangt, dass der konfigurierte Wert wirklich
   gemountet wurde.

Gemessen: **6 Fälle** (echter Container, Erfolgspfad, leer+ehrlich, Drift,
ohne Verdict, kaputter Wert) — alle wie spezifiziert. Dabei fielen **zwei
eigene Fehler** auf, die nur die Messung offenlegte: verschachtelte Quotes
machten zwei Assert-Bedingungen immer wahr (Jinja sah rechts ein
String-Literal), und `docker logs` musste `2>&1` bekommen, weil Go auf
**stderr** loggt — die erste Fassung maß `stdout` und fand dort gar nichts,
obwohl der Gateway die richtige Zeile geschrieben hatte.

**Live verifiziert (Deploy RC=0, `ok=18 failed=0`):** Container-Env gültiges
JSON · Gateway `1 embed target(s) mounted under /embed/*:
/embed/grafana→http://jimesh-grafana:3000` · `GET /embed/grafana/` = **401**
(session-gated, vorher **404**).

### 3. Befunde, bewusst NICHT behoben

- **Exposure-Scan ist auf dem Node defekt**: `internal/network/procdetect.go`
  (SPRINT-186: „das Backend-Image ist distroless, `sh` gibt es nicht") wird
  **nirgends aufgerufen** — `grep DetectProc` findet nur die Definition.
  `security/exposure.go:595` ruft weiter `exec.CommandContext(ctx, "sh", "-c",
  …)` auf → im distroless Container `exec: "sh": executable file not found in
  $PATH`, `ss_available:false`, leere Portliste. Der Local-Pfad braucht den
  Anschluss an `DetectProc` (Remote-Pfad läuft über SSH und ist davon
  unberührt).
- **Sidebar vs. Exposure**: In der DB liegen exakt 3 Projekte
  (`final-test`, `d3-final-test`, `d3-dispatch-test`), alle `is_internal=0`,
  `status=stopped`, `node_host=127.0.0.1`. Sie sind **nicht** intern, und die
  Sidebar liest dieselbe `GET /api/projects` ohne Filter — sichtbar werden
  sie trotzdem nur, wenn die persistierte Sektion „Projekte" offen ist. Die
  `127.0.0.1` erklären außerdem den `ssh dial 127.0.0.1:22: connection
  refused` im Exposure-Report: Test-Relikte, keine echten Nodes.
- **App-Scanner / Docker Hub**: BACKLOG `093` (Docker Hub API +
  Compose-File-Scan) und `B02` (Docker-Hub-Container-Metadaten) sind weiter
  `[ ] geplant` — **baut aktuell die andere Session**, in dieser hier bewusst
  nicht angerührt. `/api/discovery{,/scan,/events}` existiert zwar, ist aber
  ein SSH-Docker-Events-Listener pro Node und speist keine Embed-Targets.

---

| Category | Implemented & Merged | Planned/Built Not Merged | Planned Never Built |
|----------|---------------------|-------------------------|---------------------|
| **Backend API** | DNS, Containers, Plugins, Projects, Terminal, SIEM, Networks, Secrets, Dashboards, Workspaces, Deployments, Subagents, Control Planes, Capabilities, Suricata, Threat Responder, Datalake, **OKF KB (seit 2026-10-05)** | SquadMesh (7 commits), Plugin Manifest Spec, Browser Automation | — |
| **Frontend UI** | Dashboard Builder (new), Container/Terminal/Pages, SIEM, Networks, Firewall, Secrets, Projects, Workspaces, Subagents, Settings | SquadMesh impl (large), Workspace File Editor | **Tab Strip (SPRINT-149)**, **Onboarding Wizard (S171)**, **Dynamic Sidebar (S171)**, **Dynamic Sidebar Context Keys**, **VS Code Sidebar Integration (S170-5)**, **S3 File Ops (S170-4/8)**, **AppPanelDrawer refinements** |
| **Infrastructure** | DNS (Bind9 + Traefik + Keycloak), Headscale Mesh, Utility Container (half), gVisor propagation | SquadMesh runtime | **Local Controller (S180-19)**, **conn=local full rollout (S179-9)**, **GPU/gVisor test (S180-9)**, **Chromium E2E (S159-6)** |
| **Security** | SIEM (Falco+Suricata), Firewall (nftables), Vault, Audit Log — **Threat Responder: Code/IaC gemergt (S144-1..4), BETRIEB NICHT: `BACKLOG.md:485` Deploy offen, S190 übernimmt** | SquadMesh security | **Paranoia Alerting (S177)**, **Safe Local LLM Chatbot (S178)**, **Client Hardening Package (A-1)**, **Falco→Response-Kanal (S190)**, **Suricata-IDS-Betrieb (S189)** |
| **Developer Experience** | Command Palette, Dashboard Builder, Plugin Catalog, Terminal, File Browser | Workspace File Editor (S186-WP3) | **Onboarding Wizard**, **Dynamic Sidebar**, **Command Palette Pages**, **Jira-Style Presets** |

---

## Immediate Next Steps (Priority Order)

1. **Delete 11 stale branches** identical to main
2. **Merge 4 ready branches**: s186-wp3, s184-client2, docs/restructure, public-repo-docs
3. **Fix S180-1b** (already done this session) → verify `make redeploy` works
4. **Fix S184-11** (`dns_test.go` missing path value)
5. **Fix S182-WP4-T** (`NewProjectDialog.test.tsx` portal/async)
6. **Decide on SPRINT-149 Tab Strip** — the biggest UI debt; either implement Phase 1 or archive the doc
7. **Decide on S177/S178** — Operator decisions needed
8. **Finish S180-3/14/19** — gVisor runtime + local controller (unblocks S170-7, S180-5-8)
9. **Push-Gate**: `origin/main` ist aktuell (der andere Stand hat #22/#23/#25 gepusht), lokal ist `main` nur noch 2 Commits hinterher. Offen zum Zuruf: **`feat/squadmesh-impl`** (`846443a3` = Reparatur-Commit + Main-Merge, FF auf `7877438b`) — **Operator-Gate: pushen nur auf Zuruf**
10. **Close PR #18** (`feat/squadmesh-docs` — Inhalt liegt schon in main, der Merge würde 17 absichtlich gelöschte Dateien zurückholen); **#17 ist gemergt** (`f8dbd7db`) — der „identischer Head"-Befund war veraltet
11. **`OpenReplayEmbed.tsx` reparieren** (S174, `<TooltipProvider>` ohne Schließtag) — solange kaputt, **maskiert tsc das ganze Programm** und man sieht die 239 nicht
12. **tsc-Altbestand 239 → 0** (S181-7 analog): ~170 davon neu aus meshcore (`MeshSquadTeamBuilderPage` 44, `meshcore/*` 57, `RolePanel` 15 …), Rest `keys/*` `Cannot find module shared/types` (25), `DashboardBuilderPage` (17), `Sparkline` (4) — alles von `ignoreBuildErrors: true` verdeckt. **Operator-Entscheidung offen: später angehen**
13. **PR #19 reviewen & mergen** — in dieser Session vorbereitet: kompiliert, grüne Gates, `origin/main` eingemergt (10 Konflikte siehe „Session 2026-10-05 (IV)"); noch nicht gepusht
14. **Entscheidung: `MeshSquadTeamBuilderPage.tsx` + `RolePanel.tsx`
15. **PR #24** (`feat/s186-wp3-workspace-file-editor`, 11 Dateien / +2819) bewerten und mergen — letzter offener PR neben #19 (Waisen, nicht geroutet)** — 5 fehlende Module wiederherstellen oder die 2 Dateien fallen lassen (37 isolierte tsc-Fehler)

