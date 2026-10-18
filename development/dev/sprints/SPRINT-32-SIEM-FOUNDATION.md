# SPRINT-32 — SIEM & Defense-in-Depth: kompletter Umsetzungsplan

> **Quelle:** Operator-Anforderung 8.9.2026 („SIEM planen, OSS-Framework
> finden, Integration, Ports/IP-Verwaltung, Threat-Per-Deployment,
> Log-Zuordnung") + Research `docs/research/R26_Siem.md`.
> **Status:** in Umsetzung — TASK-054 (14.9.2026) hat Stack B+C live
> gebracht: `deploy/siem/` (Wazuh 4.14.7 + Falco 0.41.3 + siem-bridge,
> opt-in profile `siem`, alle Services healthy) verkabelt an
> `/api/sdk/logs`; E-SIEM-1..5 nach Plan-Defaults implementiert,
> Operator-Bestätigung ausstehend; WP1/WP3/WP7 offen.
> **Verwandt:** Sprint 20 K-LAF (WP1-Identitätskette, WP5-Egress — live),
> Sprint 28 (Kernel-SAST), Sprint 29 (Deployment-Gates, Findings-Pipeline),
> ROADMAP §9 (Security-Page pro Endpoint/App).

---

## Teil 1 — Drei Stack-Approaches (mit Abwägung für JiMesh)

### Approach A — „JiMesh-native Light" (kein externes SIEM)

```
[Workspace] ──nftables default-drop──► [JiMesh Gateway]
     │                                        │
     ▼                                        ▼
[socket-guard (docker.sock)]   [security_events (Postgres)]   [request_log]
     └────────────► Scanner (Regex-Secrets) + RBAC-Denials + Freeze
                            │
                            ▼
                [Security-Sidebar im Dashboard]
```

**Komponenten:** alles, was JiMesh HEUTE schon hat (WP5-Egress live verifiziert,
socket-guard, WP2-Regex-Scanner, WP3-Freeze, security_events-Tabelle,
Exposure-Scan, FirewallProvider read-only).
**Vorteile:** 0 externes Setup, 0 laufende Kosten, Daten bleiben in Postgres,
E3/DSGVO trivial. **Schwächen:** keine Volltext-Suche/Retention (Postgres-
Tabelle + Limits), keine Kernel-/Netz-Sicht, keine externen Correlations,
kein Compliance-Dashboard.
**Wann:** Ein-Operator-Instanzen, minimized attack surface, Ressourcenknappheit.

### Approach B — „SIEM-Kern": Wazuh + Eventbrücke (Empfehlung, Teilumsetzung gestartet)

```
JiMesh Backend ──(WP1 Shipper, JSON, redigiert)──► Wazuh Manager (TCP 1514)
        ▲                                                    │
        │            [Wazuh Indexer + Dashboard (Tiefenanalyse)]
security_events ◄──(WP2 alerts.json-Tailer)── [Wazuh Manager Rules/FIM/Vuln]
```

**Komponenten:** Wazuh single-node (manager, indexer, dashboard, 4.14.7 —
stabil, images verfügbar; 5.1.0 ist alpha ohne Images) als opt-in
compose profile `siem`. Dazu FIM + Vulnerability-Detection + SCA gratis
dabei. JiMesh bleibt das Frontline-UI (Sprint 29-Sidebar), Wazuh-Dashboard
das Tiefenanalyse-Tool (E-SIEM-4).
**Vorteile:** Voll-SIEM (Retention, Suche, Korrelation, Compliance-Dashboards)
ohne K8s. **Kosten:** ~4 GB RAM. **Datenschutz:** nur redigierte Metadaten
schiffen (K-LAF E3), Retention über Indexer-ILM (E-SIEM-5).

### Approach C — „Defense-in-Depth" (R26-Variante): eBPF-Sensor + Netz-IDS + SIEM

```
[Host]  Suricata (XDP, af-packet) ──eve.json──► Wazuh Agent ─┐
[Host]  Falco modern-eBPF ──events──► Wazuh Agent ───────────┼─► [Wazuh SIEM]
[Workspace-Container]  T3-Alternativen:                       │
   ├─ Variante A: gVisor runsc ─► Falco (observe-only! R25)   │
   └─ Variante B: Kata/KVM guest-kernel ─► Tetragon eBPF-LSM ─┘
[OPNsense/Firewall-Grenze] ← CrowdSec/Blocklists (später)
```

**Komponenten und was sie jeweils leisten:**
1. **Suricata (Netz-IDS, XDP-Modus):** Inbound-Attack-Detection am Host-NIC
   (Log4j/Exploit-ET-Signaturen), eve.json. XDP = Paket-Drop im
   Treiber, bevor der Stack sieht — billigste Abwehrstufe. Braucht:
   Kernel ≥ 5.x, NIC-AF_XDP-Support, ET-Ruleset-Updates.
2. **Falco modern-eBPF (Runtime):** Syscall-Events pro Container —
   Shell-in-Container, Container-Escape, Crypto-Miner, out-of-band
   Writes in Volume-Pfade. Container-attributed (container_id!).
   Kein LSM-Enforcement (Observation) — R25 belegt, dass synchronous
   Blocken im gVisor-Sandbox-Fall nicht geht.
3. **Tetragon eBPF-LSM (Enforcement, nur mit echtem Kernel):**
   sync `SIGKILL` bei Policy-Verstoß (Sprint 28 WP0-Spike entscheidet,
   ob der Host `lsm=bpf` trägt — NUR dann hartes Killen; sonst bleibt
   Falco-Sensor + async Remediation über die Freeze-Leiter).
4. **gVisor/Kata (Prävention):** R25-Kernfakten — gVisor Sentry = ein
   Prozess aus Host-Sicht (kein in-Sandbox-eBPF-Attribution); Kata-Kata
   = echter Gast-Kernel → eBPF-LSM IM GAST-KERNEL produktionsbewiesen
   (AntCWPP). Kata braucht nested virt → T3-Enterprise-Pfad, nicht v1.

**Empfehlung als Pfad:** A ist live und bleibt Basis (immer an).
B als `siem`-Profile ab WP0 (gestartet). C in Stufen: Falco-Sensor (WP4,
beste ROI) → Suricata (WP6) → gVisor/Kata (T2/T3-Backlog, R25/26).

### Firewall-Schichten (wer sperrt was wo)

| Layer | Werkzeug | was gesperrt wird | Status JiMesh |
|---|---|---|---|
| Kernel-Netz NIC | Suricata XDP | bekannte Exploits/Scans an Paketen | geplant (WP6) |
| Host-nftables (inbound) | FirewallProvider WRITE (neu, WP7) | Ports pro Deployment + erlaubte IPs/CIDRs | read-only heute |
| Workspace-nftables (egress) | EgressRuleset | Workspace-Outbound default-drop + Allowlist | **live verifiziert** |
| Docker-Sock | socket-guard | Container-Escape via Sock | live |
| Kernel-LSM | Tetragon/Falco(eBPF-LSM) | bösartige Syscalls/Threads | Sprint 28 (E-S1..S3) |
| Proxy | JiMesh /v1-Gate + Budgets | LLM-Traffic erzwingen | **live** |

---

## Teil 2 — Port-Freischaltung/Sperre + IP-Allowlists (WP7 „Inbound Firewall Control Plane")

**Warum:** Exposure-Scan sagt heute „Port offen für die Welt"; der Operator
kann nichts DRAN TUN. Ziel: per Deployment/Port erlaubte IPs (z. B. nur
Tailscale-IP 100.x.y.z, VPN-CIDR) — „keine öffentlichen Ports, nur via
Tailscale" ist exakt der Operator-Use-Case (Aufforderung 9.9.).

1. **Datenmodell** (klein, Mandat 7): Tabelle `port_rules`
   `(id, project_id, deployment_id, port, protocol, action('allow'|'deny'),
   source ('cidr' | 'ip'), value, note, created_by, created_at, enabled)`.
   Default-Deny als Deployment-Attribut (`firewall_mode: 'tailscale_only' |
   'allowlist' | 'open'`), nicht als generisches Policy-Ding.
2. **Backend (`internal/security/firewall_provider.go` erweitern — heute
   read-only):**
   - `ApplyInboundRules(node, projectID, rules)`: rendert pro Node eine
     nft-Tabelle `jimesh_inbound_<proj>`: `chain input { type filter hook
     input priority -10; ip saddr == <IP> tcp dport <PORT> accept; ...; tcp
     dport <PORT> drop }` via SSH-Shell-Schritt (gleicher Muster-Pfad wie
     WP5-Egress, KEIN Docker-SDK).
   - Pre-Checks: Node-ssh_host_keys-TOFU-Pin (WP0-Muster), nft-Binärität,
     Konflikt-Pre-Check gegen bestehende UFW/nft-Regeln (Idempotenz).
   - **Audit:** jede Apply/Delete → `security_events`
     (`event_type='firewall_rule'`, firewall-Source, diff im Detail
     (redacted), Operator-Identity aus der Session).
3. **Routen (API_DOCS + Operator-Gate RBAC):**
   - `GET  /api/firewall/rules?deploymentId=…` — effektive Regeln +
     live-nft-Footprint (was WIRKLICH geladen ist, nicht was konfiguriert
     wurde — WP6-Lektion!)
   - `POST /api/firewall/rules` — `{deploymentId, port, action, source}`
   - `DELETE /api/firewall/rules/{id}` / `POST /api/firewall/rules/{id}/enabled`
   - `POST /api/firewall/apply?nodeId=…` — re-apply (Änderungs-Replay)
4. **Lokal vs. Tailscale:** deployment manifest bekommt
   `firewall_mode: 'tailscale_only'` → erlaubt nur 100.64.0.0/10
   (CGNAT-Tailscale) + loopback — damit braucht der Operator gar keine
   öffentlichen Ports (R23-/Crew-Setup-Pattern).
5. **Suricata-Kopplung (WP6):** Suricata-Sicht MUSS nicht in die Port-
   Control — IPs, die Suricata/CSIP-Feeds als böse flaggt, können per
   Code-Fall in dieselbe nft-Tabelle als Deny-Row landen (Security-Onion-
   pattern, ohne Security Onion).

---

## Teil 3 — Log-/Event-Zuordnung (Deployment/App/Project)

**Schlüssel-Insight:** Die K-LAF WP1-Identitätskette liefert bereits die
Attribute, die jede Security-Row braucht: `sessions(id, agent_type_id,
project_id, container_id)` + `request_log.session_id` (Index!) +
`security_events.{session_id, container_id, project_id}`. Attribution
heißt: jede externe Quelle auf diese Identity-Kette MAPPEN.

| Quelle | Natürlicher Key | Mappung → Project/App |
|---|---|---|
| JiMesh-eigen (scanner, freeze, RBAC, budget, consumer-key, DAST) | `session_id`/`project_id` direkt | fertig (security_events-Columns) |
| Wazuh (FIM/Vuln/Agent-Docker) | `agent.id` → Agent-Name = Node; Docker-Container-Namen in Metadata → `sessions.container_id` Lookup | Ingest-Mapper (WP2) löst container→session→project auf und schreibt project_id in die Row |
| Falco/Tetragon | `container.id` → `sessions.container_id` | gleicher Mapper (ingest-time enrichment) |
| Suricata (eve.json) | Ziel-Port → `deployments.port/vncPort/codeServerPort` (deployments-Tabelle hat Ports; Port-Discovery verknüpft schon) | Mapper: port→deployment→project (bei Mehrdeutigkeit: mehrere Rows / warn) |
| nftables-Egress-Drops (WP5) | Tabelle heißt `jimesh_egress_<projID>` | projID direkt im Tabellennamen |
| request_log / traffic | `session_id` + `trace_id` | fertig |

**Konsequenz im Datenmodell:** `security_events` bekommt KEIN neues Schema —
die Mapper schreiben in die existierenden Columns. Was fehlt: die
Wazuh/Falco/Suricata-Quelle als `scanner`-Wert (`'wazuh' | 'falco' |
'suricata'`), `raw_id` (SIEM-Fingerprint für Dedup), und für Attribuier-
Fehlschläge `project_id=''` + ehrliche `detail='unattributed (port 63123)'
→ kein Deployment` statt geratener Zuordnung (No-Mock: Attribution-Confidence
steht im Detail).

**Retention:** `security_events`-Archiv-Task in Approach B schreibt Wazuh
als Langzeit-Store (ILM, E-SIEM-5), Approach A braucht einen einfachen
Purge-Job (E3-Löschfrist, konfigurierbar).

---

## Teil 4 — Dashboard (Security-Page pro Project/Endpoint/App/Port)

1. **Hierarchie-Selector** (Sprint 29 WP3, ROADMAP §9): Project → Endpoint
   (SSH-Target) → Deployment/App → Port, als Dropdown in der Security-Page.
   Dieselbe Widget-Familie rendert pro Knoten.
2. **Threat-Detections pro Deployment:** Feed = security_events gefiltert
   auf die Knoten-Kette (project→deployment-container). Quellen-Badges
   zeigen Herkunft (scanner|wazuh|falco|suricata|rbac|firewall|siem).
3. **Ports-Panel pro Deployment:** Status live aus `/api/security/exposure`
   + Firewall-Regeln (WP7) + Discovery-Ports — in EINEM Panel:
   Port, „erreichbar von" (Wer darf rein — IP-Liste), recent drops.
4. **Security-Report** (WP4 Forensik, existiert) bekommt Quellen-Sektion
   (SIEM/Suricata/Falco-Zitate als redigierte Metadaten, nie Payloads).
5. **Wazuh-Dashboard verlinkt** aus dem Deep-Dive (E-SIEM-4: JiMesh =
   Frontline, Wazuh = SOC-Tiefenanalyse).

---

## Teil 5 — Work Packages (Umsetzung, der Rest nach WP0)

**Umsetzungsstand TASK-054 (14.9.2026, live verifiziert):** der
Single-Node-Stack läuft jetzt als `deploy/siem/` (opt-in Profile `siem`,
Wazuh 4.14.7, alle 5 Services healthy) und ist über die
siem-bridge (`internal/siem/`, `cmd/siem-bridge/`) an die bestehende
sdk_logs-Pipeline verkabelt — Falco-Events UND Wazuh-Alerts landen als
`type=audit`-Rows in `POST /api/sdk/logs` (curl-verifiziert). Details und
Fundstellen: Abschnitt „Live-Verifikation TASK-054" unten.

- [x] **WP0 — Wazuh single-node deploy (TASK-054):** kanonischer Stack ist
  jetzt `deploy/siem/docker-compose.yml` (Wazuh 4.14.7-Images — 5.1.0 hatte
  keine Images; 4.x-Layout: `/var/ossec`-Pfade, ossec.conf via
  `/wazuh-config-mount`, internal_users.yml via opensearch-security),
  Zertifikate via `deploy/siem/gen-certs.sh` (gepinntes 4.3-Tool,
  idempotent), Healthchecks live verifiziert (Manager: analysisd+apid
  running — NICHT „kein Daemon not running": clusterd/maild sind im
  Upstream-Config bewusst abgeschaltet; Indexer: authentifizierter
  Cluster-Check; Dashboard: HTTP-Antwort, 401 heißt „App lebt",
  Auth ist Pflicht). Loopback-Bindings 1514/1515/55000/19200/5601
  (Mandat 12), Netzwerk `jimesh_jimesh-net` (external). Das
  WP0-Scaffold `deploy/wazuh/` (5.1.0-Layout) ist damit superseded.
  **Offen:** `make siem-up`/`siem-down`-Targets (Makefile liegt in
  Parallel-Sessions; direkt: `cd deploy/siem && docker compose --profile
  siem up -d`).
- [ ] **WP1 — Shipper (JiMesh→Wazuh):** `internal/security/siem_shipper.go`
  — security_events + Lifecycle → JSON → Wazuh (socket/syslog), redigierte
  Details; JIMESH_WAZUH_ENDPOINT; Attribuierungsfelder
  (session_id/project_id/container_id) SIND IM PAYLOAD (damit Wazuh sie
  behält). Live-Verify: Event landet im Indexer. **Unverändert offen.**
- [~] **WP2 — Ingest (Wazuh→JiMesh) — DELTA via TASK-054 realisiert:** der
  geplante alerts.json-Tailer (security_events, event_type='siem_alert')
  ist NICHT der gebaute Pfad. Gebaut: der siem-bridge pollt die Wazuh-
  indexer-API (`GET /wazuh-alerts-*/_search`, Cursor + at-least-once,
  _source-Metadaten-Allowlist K-LAF E3) und shipped über die BESTEHENDE
  sdk_logs-Pipeline (TASK-032) statt in security_events. Grund: die
  sdk-logs-Oberfläche ist der Live-Kanal ins Dashboard (Operator-Anforderung
  14.9.), der Manager-API-55000 hat KEINEN /alerts-Endpoint (verifiziert
  gegen v4.14.7 spec.yaml) — der Indexer IST die Alerts-API. Attribution
  serverseitig aus dem Service-Key (Mandat: nie aus dem Body); der
  Wazuh-Agent-name + Container-Namen reisen im Payload. **Offen bleibt:**
  der direkte security_events-Ingest mit project_id-Mapper aus Teil 3 (für
  die Security-Report-Widgets).
- [ ] **WP3 — JiMesh-Ruleset (Wazuh):** K-LAF-Szenarien (Shell im
  Workspace, secret_leak-Korrelation, Egress-Drop-Sturm, Freeze-Audit) als
  benannte Regeln mit operator-reviewbaren IDs. **Offen** (braucht WP1 —
  nur gepingte Events korrelieren).
- [x] **WP4 — Falco-Sensor (TASK-054, Approach C, geändert bezüglich
  Zielpfad):** `deploy/siem/docker-compose.yml` Service `falco`
  (falcosecurity/falco:**0.41.3** — 0.41.0-2 crashen auf Docker-Hosts,
  falcosecurity/plugins#828, live hier reproduziert; modern_eBPF, kein
  Kernel-Modul, privileged, /host/proc + Docker-Socket). Regelsatz
  `deploy/siem/config/falco/jimesh_rules.yaml` = SPRINT-20-WP8-Tripwire-
  Liste, exakt auf `jimesh-framework-*`-Workspace-Container gescoped
  (curl|sh, Write außerhalb Workspace, Listening-Socket, AF_PACKET,
  +x-chmod in Dropper-Dirs via evt.args — fd.name ist bei chmod-Events
  leer, empirisch verifiziert —, Miner-Binary). Events → file_output
  (JSON) → siem-bridge → `/api/sdk/logs` (alias=falco) — die offizielle
  Events→Wazuh-Integration aus dem Plan ist bewusst NICHT gebaut: das
  Dashboard ist das Frontline-UI, Wazuh bleibt Tiefenanalyse; ein
  zweites Falco-Target (Wazuh) wäre eine neue Pipeline. Alle 6 Regeln
  live getriggert und in sdk_logs verifiziert (s. Live-Verifikation).
- [ ] **WP5 — Log-Zuordnung finalize:** Attributions-Mapper aus Teil 3 +
  security_events.project_id befüllt für ALLE Quellen; verifiziert mit
  echten Deploy-Container-Namen. **Teilweise via TASK-054 abgedeckt:** der
  Bridge leitet einen `project_id_hint` aus dem Container-Namensvertrag
  (`jimesh-framework-<projID>-<runID>`) in den Payload ab (ehrlich als
  HINT gelabelt, nie als Attribution — die kommt aus dem Service-Key).
  Offen: der direkte security_events-Mapper mit Confidence.
- [~] **WP6 — Suricata (XDP) als Netz-IDS — ehrlich als v2 markiert
  (TASK-054):** compose-Platzhalter (auskommentiertes Service-Gerüst im
  `siem-xdp`-Profil, nie Teil von `--profile siem`) + Doku der
  Kernel-Abhängigkeiten (Kernel ≥ 5.x, AF_XDP/NIC-Treiber-Support,
  eBPF-Privilegien, ET-Ruleset-Feed) in `deploy/siem/README.md` §Suricata.
  Bewusst NICHT gebaut: ein halb konfiguriertes IDS, das still nichts
  mitbekommt, wäre eine vorgeschobene Mandat-2-Verletzung. Der v2-Pfad:
  Host-Install (kein Container), eve.json→Wazuh, ET-open-Rules,
  SPRINT-29-E-D1-Niveauplan.
- [ ] **WP7 — Inbound-Firewall-Control-Plane (Teil 2):** port_rules-Tabelle
  + FirewallProvider-WRITE (nft per SSH), Routen, Audit, Tailscale-Mode.
  **Unverändert offen** (TASK-050-WP1 hat bereits Firewall-Grants live).
- [ ] **WP8 — Dashboard:** Hierarchie-Selector + Quellen-Badges +
  Ports-Panel (Teil 4). TASK-029 hat die Basis gemergt — hier Fortschritt.
- [~] **WP9 — Doku + Retention (TASK-054-Teil):** E-SIEM-5 umgesetzt:
  `deploy/siem/apply-retention.sh` (ISM-Policy 30d, attach an bestehende
  Indizes + ism_template für künftige — live am Stack angewendet und
  verifiziert) + `deploy/siem/README.md` (Operator-Guide). USER_GUIDE/
  API_DOCS-Teile offen (Routen-Doku-Pflicht lag in TASK-054 bewusst bei
  Sprint-File + Task-File, s. dort; die verbaute Route ist die BESTEHENDE
  `/api/sdk/logs` aus TASK-032, keine neue Route).

## E-SIEM-1..5 — implementiert nach Plan (TASK-054, 14.9.2026); Operator-Bestätigung der Defaults ausstehend

Die Empfehlungen aus dem Plan sind als Defaults umgesetzt und live
verifiziert („Default gilt, bis er widersprochen wird" — die
Widerspruchsfrist ist offen, die Umsetzung blockiert nicht auf sie):

| # | Entscheidet | Empfehlung → implementiert als (Fundstellen) |
|---|---|---|
| E-SIEM-1 | Engine | **Wazuh 4.14.7** — `deploy/siem/docker-compose.yml` (Images verifiziert) |
| E-SIEM-2 | compose-Profil | **opt-in profile `siem`** — alle Services `profiles: ["siem"]`; `make up` unberührt |
| E-SIEM-3 | Falco-Sensor | **ja** — Service `falco` + `deploy/siem/config/falco/jimesh_rules.yaml`, alle 6 Regeln live gefeuert |
| E-SIEM-4 | beiderlei Dashboards | **beides** — JiMesh-Frontline: sdk-logs-Rows (type=audit, agent=falco|wazuh); Wazuh-UI: `https://127.0.0.1:5601` (loopback) |
| E-SIEM-5 | Retention | **30 Tage** — `deploy/siem/apply-retention.sh` + `config/wazuh_indexer/ism-policy-30d.json`, live angewendet: `wazuh-alerts-4.x-2026.09.12 -> jimesh-siem-retention-30d` |

## OpenSearch — bewusst NICHT gebaut (Approach D / E-BYOL)

E-Build-Mandat (kein neuer Service ohne Not): OpenSearch bleibt wie
geplant **Approach D — AWS-native SIEM-Variante** (SPRINT-33:
GuardDuty/SecurityHub/OpenSearch/CloudTrail/Config) bzw. optionaler
**Kunden-BYOL** (E-BYOL-Entscheidung vom 14.9., siehe
`docs/decisions/DECISIONS.md` / E-BYOL-Session). Der `wazuh.indexer` im
siem-Compose ist Wazuhs eigener Single-Node-Store — kein separater
OpenSearch-Service. Dokumentiert im `deploy/siem/README.md` §OpenSearch.

## Live-Verifikation TASK-054 (13./14.9.2026, Host jimesh — Kernel 6.14, BTF ok)

- `docker compose --profile siem up -d` (deploy/siem): **alle 5 Services
  healthy** (manager/indexer/dashboard healthgeprüft, falco + bridge up).
- **Falco, alle 6 Regeln echt getriggert** in
  `jimesh-framework-t054-*`-Containern: curl|sh (`sh -c curl … | sh`),
  Out-of-Workspace-Write (`echo x >> /etc/…`), Listening-Socket
  (`nc -l -p 8099`), AF_PACKET (Go `socket(AF_PACKET, SOCK_RAW)`),
  +x-chmod in /tmp (evt.args mit `S_IXUSR`), Miner-Binary ( Prozess
  namens `xmrig`) — jede Zeile mit container.name-Attribution im
  Events-File bestätigt.
- **siem-bridge live**: Falco-Events (offset-Cursor 3019→16027) und
  Wazuh-Alerts (Rule 502 „Manager started", SCA 19003/19008) — beides
  `POST /api/sdk/logs`, bestätigt per
  `curl "…/api/sdk/logs?type=audit&limit=…"` mit dem Service-Key
  (alias=wazuh|falco, Level-Mapping, Payload mit rule_id/alert_id,
  evt.args, project_id_hint). Attribution serverseitig:
  workspace ws-task054-siem / project proj-1789128901174 (aus dem Key,
  nie aus dem Body).
- **E-SIEM-5 live**: ISM-Policy angelegt und an den existierenden
  wazuh-alerts-Index angehängt (explain zeigt `policy_id
  jimesh-siem-retention-30d`), ism_template deckt künftige Tages-Indizes.
- **Gebrochene Pfade ehrlich gefixt statt umgangen** (alles im
  Compose/README dokumentiert): falco 0.41.0-Crash (plugins#828 → 0.41.3);
  /host/proc + Docker-Socket unter HOST_ROOT; containerd/cri-Collector
  abgeschaltet (Docker-only); Stock-Regelsatz bewusst nicht geladen
  (`-r`, kein „Drop and execute new binary"-Feuer pro `go build`);
  Healthchecks mit echten Daemon-/HTTP-Semantiken.
- Go: `gofmt` clean, `go vet` + `go test ./internal/siem/...` (19 Tests)
  + `go build ./...` im golang-Container grün; Unit-Tests mit
  echten Fixture-Shapes (`internal/siem/testdata/wazuh_alert.json`,
  `falco_event.json`).

## Nicht-Ziele (unverändert)

- Keine Payload-/Prompt-Weiterleitung (K-LAF E3: nur redigierte Metadaten).
- Keine automatisierte Response aus SIEM-Alerts (HITL-Gate, Freeze-Leiter
  bleibt operator/policy-gesteuert).
- Kein Security-Onion (eigene Distro — raus).

---

## WP-Frontend — Security-Frontend-Integration (TASK-064, R41 §C4, 14.9.2026)

**Plan (vor Code, Dokumentations-Mandat):** R41 (Operator-Feedback-Blitz)
listet §C4 als GROSSE LÜCKE, wörtlich: „beide Systeme [Wazuh, Falco]
LIEFERN Daten, aber das Frontend zeigt sie NICHT im Security-Tab" — live
gegen den laufenden Stack verifiziert (13.9., authentifizierter curl gegen
`GET /api/sdk/logs`): echte Falco-Events (xmrig, dpkg-lock-Drift) und
Wazuh-Alerts (CIS/SCA) fließen bereits, waren aber nirgends im Security-Tab
sichtbar — nur über die fachfremde `/sdk-logs`-Seite unter dem Proxy-Tab.

**Work Packages:**
1. Security-Overview-Panel (`/security/overview`, neuer Default der
   Security-Tab-Gruppe) — aggregiert `GET /api/sdk/logs` (type=audit,
   alle Scanner) + `GET /api/security/events` in einer Ansicht, filterbar
   nach Schweregrad/Scanner/Ziel, Zeitraum-Auswahl. Kein neuer Backend-Route
   nötig — beide Endpunkte existierten bereits (TASK-032/Sprint-20 K-LAF).
2. Wazuh-Dashboard-Einbettung — echtes iframe gegen den laufenden
   `jimesh-siem-dashboard`-Container (127.0.0.1:5601, Port-Binding-Mandat),
   mit „Open in new tab"-Fallback und ehrlichem Hinweis, dass ein leerer
   Frame ein selbstsigniertes Zertifikat bedeutet, nie eine tote Kachel.
   **KORRIGIERT durch TASK-067 (13.9.2026, Absatz unten):** das iframe ist
   entfernt — die Self-Signed-Origin kann im Frame nie akzeptiert werden,
   jetzt führt ein prominenter New-Tab-Link zum Dashboard.
   Falco hat kein eigenes Dashboard im Stack — dessen Events laufen über
   dieselbe Overview-Tabelle (klar dokumentiert, keine erfundene Kachel).
3. SAST/IaC/DAST-Tabs (`/security/scans/{iac,sast,dast}`) — IaC- und
   SAST-Funde aus `security_events` (scanner=checkov/sast-v1, TASK-059)
   plus das HITL-Quarantäne-Worklist (`GET/POST /api/security/quarantine*`,
   bereits live). DAST hat noch keinen Scanner im Backend (geprüft:
   internal/deploy, internal/scanner, internal/security — nichts
   DAST-Förmiges) → ehrlicher „noch nicht implementiert"-Tab, keine
   erfundenen Funde (Mandat 2, R39-Antipattern).
4. Notifications — Glocke in der Top-Nav (`SecurityNotificationsBell`),
   pollt dieselben zwei Feeds wie das Overview-Panel, zeigt kritische Funde
   mit Unread-Badge von überall in der App. Lesestatus liegt bewusst nur
   im Browser-`localStorage` (keine Per-User-Read-Tabelle im Schema) —
   im Panel selbst als solches beschriftet, nie als serverseitig behauptet.
5. Testing/Demo (`/security/testing`) — steuert den echten
   Llama-Guard-Hook (`internal/ai/guard_hook.go`, K-LAF WP2) über den
   echten `/v1/chat/completions`-Pfad mit einem synthetischen
   Prompt-Injection-String; zeigt Block/Allow-Urteil + die resultierende
   `security_events`-Zeile. Live-verifiziert (13.9.): auf diesem Stack ist
   `guard_scanner.enabled` nicht gesetzt → Seite zeigt den ehrlichen
   „nicht konfiguriert"-Zustand samt Erklärung, keinen erfundenen Block.

**Acceptance Criteria:** jedes Panel zeigt entweder echte, live abgefragte
Daten oder einen ehrlichen Empty-State (nie erfundene Beispieldaten,
Mandat 2); kein neuer Backend-Fake-Endpunkt; `tsc --noEmit` sauber für alle
neuen Dateien; `check:i18n` grün über alle 60 Locales.

**Live-Verifikation (13.9.2026, laufender Stack, authentifizierter Session-Token):**
- `GET /api/sdk/logs?type=audit&agent=falco&limit=5` → reale Falco-Zeilen
  (Regel „write outside workspace to system path", Container
  `jimesh-framework-ws-…`).
- `GET /api/sdk/logs?type=audit&agent=wazuh&limit=5` → reale Wazuh-Zeilen
  (Rule 502 „Wazuh server started", SCA 19003).
- `GET /api/security/events` → `count:0` auf diesem Stack (Checkov/SAST/
  Guard haben hier noch keine Funde erzeugt) — die IaC/SAST-Tabs zeigen
  dafür ehrlich den leeren Zustand, nicht erfundene Zeilen.
- `GET /api/security/quarantine` → `count:0`, leeres Worklist, ehrlich.
- `GET /api/settings/guard_scanner.enabled` und `.chain_id` → beide leer
  (`{}`) → Testing-Seite zeigt den „nicht konfiguriert"-Zustand.
- `docker ps` bestätigt `jimesh-siem-dashboard` (127.0.0.1:5601, healthy),
  `jimesh-siem-falco`, `jimesh-siem-manager`, `jimesh-siem-indexer`,
  `jimesh-siem-bridge` — alle live.

**Korrektur TASK-067 (13.9.2026) — der iframe-Ansatz aus WP 2 war still
kaputt:** Der Browser verweigert die Self-Signed-Origin im Frame
(`ERR_SSL_SSLV3_ALERT_CERTIFICATE_UNKNOWN`), und im iframe gibt es KEIN
Zertifikats-Interstitial — der User konnte das Cert nie akzeptieren, die
Kachel blieb still leer (der „nie eine tote Kachel"-Anspruch hielt der
Praxis nicht stand). **Option 2 geprüft, verworfen (nicht trivial):** Das
Dashboard terminiert TLS selbst mit eigenem Cert (`deploy/wazuh/docker-
compose.siem.yml`, `gen-certs.sh`), das JiMesh-Frontend selbst läuft ohne
TLS — es gibt kein „gleiches", browser-vertrautes TLS, auf das ein
Reverse-Proxy aufsitzen könnte; ein solcher wäre eine neue Backend-Route
plus Edge-TLS-Setup, mkcert/Local-CA eine Ops-Prozedur auf jeder
Operator-Maschine. **Korrigierter Ansatz (Option 1):** kein Embed — die
Kachel (`WazuhDashboardTile`, `SecurityOverviewPage.tsx:83-113`) öffnet
das Dashboard per prominentem `target="_blank"`-Link im eigenen Tab, wo
das Cert einmalig akzeptiert wird. Der iframe-referenzierende Fallback-
Hinweis („Frame oben leer") ist ersatzlos entfernt — kein weiterer
Fallback-Text, der Link ist der Pfad; `wazuhTile.description` erklärt den
echten Grund statt Symptome. **Geänderte Stellen:**
`src/frontend/src/views/SecurityOverviewPage.tsx:64-76` (Begründungs-
Kommentar), `:83-113` (Kachel: iframe → Link), `wazuhTile` in allen 60
Locales (`fallbackNote`-Key überall entfernt, `description` in en/de neu
übersetzt, 58 Locales english-verbatim nachgezogen). **Verifiziert:** kein
`<iframe>` mit der Self-Signed-Origin verbleibt in der Security-Page,
Link nutzt die bestehende Verdrahtung (`WAZUH_DASHBOARD_PORT=5601` +
`window.location.hostname` — keine Env/Config für die URL vorhanden),
`check:i18n` grün (60 Locales, 1903 Keys), `tsc --noEmit -p tsconfig.app.json`:
0 Fehler in den geänderten Dateien (205 pre-existing Fehler in
unverwandten Dateien — keys/*, chain-mesh-graph, FallbackPage — bleiben
unberührt).

**Korrektur TASK-069 (13.9.2026) — zwei Bugs im WP-1/WP-4-Frontend:**
**Bug 1 (Ziel-Filter war Freitext):** der „Ziel"-Filter des
Overview-Panels war ein Substring-Freitextfeld — der Operator musste die
exakte Workspace-/Projekt-ID selbst TIPpen, um irgendetwas zu filtern.
Korrigiert: echter Picker (`ModelCombobox`, das bestehende durchsuchbare
Auswahl-Control aus dem Playground) über die REALEN Target-Registries —
`GET /api/workspaces` (Workspace-IDs + deren Projekt-/Container-IDs,
Loader wie in `WorkspacesPage`) und `GET /api/projects` (Projekt-IDs,
Cache-Key `['projects']` wie in `WorkspacesPage`/`ControlPlanesPage`
geteilt), PLUS jeder Target-String, der in den geladenen Funden
vorkommt (ein Audit-Trail-Target wie `ws-task054-siem`, das nie als
Workspace-Row provisioniert wurde, bleibt wählbar statt tippbar). Der
Filter vergleicht jetzt exakt (`f.target !== targetFilter`) — Tippfehler
sind nicht mehr erreichbar; „Alle"-Option leert den Filter.
SSH-Endpoints bewusst NICHT als Optionen: kein Fund trägt je eine
Endpoint-ID als Target (Targets sind workspace_id/project_id/
container_id) — anbietbare, nie matchbare Optionen wären unehrlich
(Mandat 2). `securityOverview.filters.targetPlaceholder` ist jetzt die
Suchzeilen-Beschriftung des Pickers (en/de neu formuliert), 5 neue
`securityOverview.targetPicker.*`-Keys (en/de übersetzt, 58 Locales per
`backfill-i18n.mjs`).
**Bug 2 („toter" Notification-Link — Prämisse widerlegt, echter Bug
gefixt):** der Task meldete, `/security/events/:id` existiere nicht in
App.tsx — stimmt NICHT für den aktuellen Baum: die Route existiert seit
TASK-021 (Commit `78fb1dc`, App.tsx `<Route path="/security/events/:id">`
→ `SecurityReportPage`) und dahinter liegt der echte Backend-Handler
`GET /api/security/report/{eventId}` (`internal/security/security.go:54`
+ `internal/security/forensics.go`, numerische ID). Live verifiziert am
laufenden Stack (13.9., authentifiziert): mit einer transienten,
deutlich markierten Verifikations-Zeile in `security_events` lieferte
`GET /api/security/events` die Zeile und `GET /api/security/report/16`
den vollen Forensic-Report (200, echte Daten; Zeile danach sofort
gelöscht). Der plausible echte Grund für „Klick tut nichts Reales":
Radix schließt ein Popover bei internen Link-Klicks NICHT — die Route
wechselte HINTER dem offen stehenden Glocken-Panel. Gefixt:
`SecurityNotificationsBell` führt den Popover-Open-State kontrolliert
(`open`/`onOpenChange`) und schließt ihn bei jedem Link-Klick („Detail
ansehen →" und „Alle ansehen"), damit die Navigation sichtbar wird.
Kein toter Link verblieb und keiner wurde erzeugt; keine Backend-Route
ergänzt, keine App.tsx-Zeile geändert.
**Verifiziert:** `tsc --noEmit -p tsconfig.app.json` → 0 Fehler in den
geänderten Dateien (pre-existing Noise in unverwandten Dateien
unberührt); `check:i18n` grün (60 Locales, 1909 Keys); `vitest run` →
225/230 grün, die 5 Fehler in `chart-axis.render.test.tsx` sind
pre-existing (mit gestashten TASK-069-Änderungen identisch failend
verifiziert). Live: `GET /api/workspaces` → `[]` (ehrlich leer, keine
Workspace-Rows auf diesem Stack), `GET /api/projects` → 2 reale Rows,
SDK-Audit-Funde liefern `ws-task054-siem`/`proj-1789128901174` als
Finder-Targets — der Picker zeigt also auf diesem Stack genau: Alle,
beide Projekt-IDs, beide Fund-Targets.

**Nicht geshippt in diesem Durchgang:** Network-Observing-Tab (Anomaly-
Detection/Router-Übersicht, ebenfalls Teil von R41 §C4, aber ein
eigenständiges Backend-Thema ohne bestehende Datenquelle — kein
Backend-Fund dafür in dieser Session, also bewusst ausgelassen statt
fake gebaut); Agent-Feedback-Loop (R41 §C5, eigene große Idee, eigener
Task). Beides bleibt offen in BACKLOG.md.

**Fundstellen:** `src/frontend/src/views/SecurityOverviewPage.tsx`,
`src/frontend/src/views/SecurityScansPage.tsx`,
`src/frontend/src/views/SecurityGuardDemoPage.tsx`,
`src/frontend/src/components/security-notifications.tsx`,
`src/frontend/src/lib/security-overview.ts`, Routing/Nav in
`src/frontend/src/App.tsx`.


falco https://github.com/cncf/artwork/blob/main/projects/falco/stacked/color/falco-stacked-color.svg

opensearch https://github.com/metarank/opensearch-project-website/blob/main/assets/brand/SVG/Logo/opensearch_logo_default.svg

coraza https://github.com/corazawaf/coraza.io/blob/main/assets/favicon.svg

mlflow https://user-images.githubusercontent.com/17848490/219058675-ae83b435-7432-4628-8f08-86e7a29d8fb4.svg

checkov
<svg xmlns="http://w3.org" viewBox="0 0 250 250" width="100%" height="100%">
  <!-- Hintergrund-Styling optional, Logo ist transparent -->
  <g fill="none" fill-rule="evenodd">
    <!-- Äußeres geometrisches Hauptsegment (Branding-Blau) -->
    <path fill="#2463EB" d="M125 15 L225 190 L25 190 Z" opacity="0.15" />
    <path fill="#1E40AF" d="M125 15 L210 165 H40 Z" />
    <!-- Das charakteristische weiße, offene Checkov-C / Check-Symbol -->
    <path fill="#FFFFFF" d="M125 55 C155 55 175 75 175 105 C175 120 165 135 150 145 L130 130 C140 122 145 115 145 105 C145 92 137 83 125 83 C113 83 105 92 105 105 C105 118 113 127 125 127 C130 127 135 125 138 122 L152 137 C145 147 136 152 125 152 C95 152 75 132 75 102 C75 72 95 55 125 55 Z" />
    <!-- Innerer Fokus-Prisma-Punkt -->
    <circle cx="125" cy="105" r="12" fill="#38BDF8" />
  </g>
</svg>


suricata 
<svg xmlns="http://w3.org" viewBox="0 0 300 120" width="100%" height="100%">
  <g fill="none" fill-rule="evenodd">
    <!-- Suricata Erdmännchen-Vektorgrafik (Wachsamkeit-Icon) -->
    <path fill="#EF4444" d="M45 20 C48 20 51 22 52 25 C53 28 51 32 47 35 C48 42 52 50 56 60 C62 72 65 85 63 95 L61 100 H35 L33 90 C32 80 34 68 38 55 C34 45 33 35 36 28 C38 23 41 20 45 20 Z" />
    <!-- Detail-Auge für die Vektorsilhouette -->
    <circle cx="43" cy="27" r="2" fill="#FFFFFF" />
    <!-- Rechter Arm/Pfote in Lauerstellung -->
    <path fill="#B91C1C" d="M50 52 C53 55 54 60 52 64 L46 62 C48 59 48 56 46 54 Z" />
    
    <!-- Offizieller Suricata-Schriftzug daneben -->
    <text x="85" y="65" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="34" font-weight="800" fill="#1F2937" letter-spacing="1">SURICATA</text>
    <text x="87" y="85" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="13" font-weight="600" fill="#6B7280" letter-spacing="3">IDS / IPS ENGINE</text>
  </g>
</svg>
