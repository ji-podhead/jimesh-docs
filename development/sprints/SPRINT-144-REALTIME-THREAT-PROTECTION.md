# SPRINT-144 — Realtime Threat Protection: Suricata-Detection + Container-Freeze/Zero-Route

**Status:** 🔨 IN BAU (28.9. ~06:00 — Tetragon-Deploy auf trading angestoßen; SIEM-IaC-Agent E
baut parallel; Responder-ENFORCE bleibt Operator-Opt-in. **WP2/WP3/WP4 GEBaut** von Bau-Agent H —
siehe unten; noch nicht gegen einen echten Node deployed, das macht der Operator per Hand)

## Auftrag (Operator, 28.9. ~06:00 — Design verbatim eingereicht)

> "falco tetragon und realtime threat protection fehlt uns ja auch noch komplett: ne threat
> protection mit suricata wie wenn jemand secrets klauen will das suricata dann mit ebpf den
> container einfrieren kann und das auf 0 routen kann"

Operator-Design (pasted): Suricata erkennt Secret-Exfiltration (z. B. Regel auf
`AWS_SECRET_ACCESS_KEY=` im Traffic) → Event in eve.json → Überwachungs-Dämon liest den Alert →
(a) Traffic sofort auf 0 routen (Operator-Vorschlag: eBPF XDP_DROP auf dem Container-veth),
(b) Container einfrieren (docker pause / cgroup freezer — Forensik-tauglich). Genannte
Out-of-the-Box-Referenzen: Tetragon (eBPF-Kill/SIGSTOP bei Dateizugriffen), Falco Talon.

## Ehrliche Schichtungs-Analyse (Build-Grundlage)

1. **TLS-Realität:** Suricata-Content-Regeln sehen NUR Klartext. Exfil über TLS = unsichtbar
   (SPRINT-19-Postmortem dokumentierte genau das). Content-Regeln sind also Defense-in-Depth,
   nicht die primäre Schicht.
2. **Die primären Schichten existieren teils schon:**
   - **Guard-Hook** scannt Request/Response-Content am LLM-Proxy — dem EINEN Ort, an dem TLS
     terminiert wird und Content wirklich inspectable ist. Für ihn existiert bereits eine echte
     Tetragon-TracingPolicy mit eBPF-Kill-Enforcement (Commit ee84341, SPRINT-139-Tetragon).
   - **Falco** (via runsc-falco, deploy/falco-gvisor-integration) sieht die Syscall-Seite in der
     Sandbox — Syscall-seitiger Secret-Zugriff wird VOR dem Netz sichtbar.
   - **Tetragon** (deploy/tetragon, wird JETZT auf trading deployt): Kernel-Events + Kill.
   - **IaC-Quarantine-Gate** (iacGate): Checkov-CRITICAL → docker stop + Release-Route — existiert.
   - **freeze.go** (rm32-Guardrails): Stage-4-Egress-Blackhole ist laut eigenem Kommentar NICHT
     implementiert — bekannte Lücke.
3. **Responder v1 (NEU, Agent H baut):** eve.json-Tailer → bei Secret-Exfil-SID:
   - DETECT (Default): ehrlich loggen, nichts tun.
   - ENFORCE (nur via overrides.local.yml-Opt-in): `docker pause` (Freeze für Forensik) +
     `docker network disconnect` ("auf 0 routen", container-scoped).
   - **Mandat 12:** JiMesh schreibt NIE Host-Firewall-Regeln (ufw/iptables) — die Isolation ist
     container-scoped via Docker; eBPF-XDP-Drop auf dem veth ist eine spätere v2-Optimierung.
4. **Bekannte Lücken, die STAYEN (ehrlich):** Guard-Streaming-Gap (SSE-Antworten unscanned,
   aus dem Prompts-Audit) + Guard default OFF + Guard-Rules-Dashboard fehlt.

## Workpackages

- **WP1 [x]** Tetragon auf trading deployen (IaC existierte als Compose-Vorlage, nie ausgeführt).
- **WP2 [x]** Suricata Secret-Exfil-Regeln — **gebaut, gegen die echte Engine verifiziert**:
  `deploy/threat-responder/jimesh-secret-exfil.rules` (9 Regeln, SIDs 8000001-8000014, lokaler
  ET-Bereich; FP-Hinweise + TLS-Caveat im Header). Verifikation: `suricata -T` gegen die
  Upstream-7.0.x-Config (jasonish/suricata:7.0.9-Container, gleiche 7.0.x-Serie wie trading) OK,
  Offline-PCAP-Replay (synthetischer TCP-Handshake + HTTP-POST mit allen 9 Markern) durch die
  ECHTE Engine: `rules_loaded: 9, rules_failed: 0`, 9 Alerts, ein flow_id — die Test-Fixtures
  in `cmd/threat-responder/eve_test.go` sind VERBATIM-Ausgaben dieses Laufs.
- **WP3 [x]** cmd/threat-responder **gebaut** (Stil wie cmd/datalaked, package stdlib-only —
  Mandat 7): `eve.go` (EVE-Parser + Tailer: Rotation/Inode/Half-Line, Start am Dateiende —
  realtime, kein Forensik-Replayer; Inode-Erkennung per reflect, weil syscall.Stat_t ein Ino-FELD
  hat, keine Methode — die Method-Assertion-Variante wäre stille Tote-Rotation-Erkennung),
  `docker.go` (Engine-API über den Unix-Socket: /networks, /containers/{id}/pause,
  /networks/{net}/disconnect; Mandat 12: container-scoped, NIE Host-Firewall),
  `respond.go` (DETECT=logged_only / ENFORCE=disconnect-von-ALLEN-Netzen + pause, zero-route
  ZUERST (Operator-Reihenfolge), dann Freeze; (SID,flow_id)-Dedup 8192 FIFO; SID-Fenster
  8000000-8000099 als harte Grenze — offizielle/ET-Regeln sind nie actionable), `main.go`
  (Env-Validierung fail-closed, Docker-Ping-Pflicht, Modus-Banner, ehrlicher Heartbeat).
  Verifikation: `go build ./...` + `go vet ./...` + `go test ./cmd/threat-responder/` =
  16/16 PASS via golang:latest-Container; gofmt sauber. Tests: Parser gegen die ECHTEN
  Replay-Fixtures, Decision-Tests gegen ein gescriptetes Docker-API-Double auf echtem
  Unix-Socket (POST-Reihenfolge disconnect→disconnect→pause, Idempotenz 304/already_done,
  fail-closed Resolution, DETECT nimmt NIE eine Aktion vor). ZUSÄTZLICH End-to-End-Smoke der
  Binärdatei auf dem dev host (kein Node): aus dem ansible-gleichen Staging-Context gebautes
  Image, detect-Modus, echtes docker.sock — Start-am-Ende bewiesen, unverarbeitbare
  (halbzeilige) Input-Datei korrekt ignoriert, unverbindbare src ehrlich als
  none_src_ip_not_a_container geloggt, Container-Auflösung mit dem ECHTEN jimesh-postgres
  nachgewiesen (echte ID/Name/Netzwerk im Record), 1s-Poll-Latenz.
- **WP4 [x]** deploy/threat-responder/{ansible-task.yml,defaults.yml,docker-compose.yml,README.md}
  **gebaut** — GATED wie suricata (NICHT im deploy-all, NICHT in deploy-service.yml registriert;
  Hand-Deploy; 63 Tasks). Fail-closed: suricata aktiv, eve.json existiert, docker compose, jimesh-
  net + abgeleitete Bridge (br-<id12> + ip-link-Beweis), -i-Override-Detektion (CLI-Interfaces
  ignorieren die YAML-af-packet-Liste), rule-files-Sektion vorhanden, af-packet-default-Anker
  vorhanden, `suricata -T` gegen die ERWEITERTE Config. Wired: Rules (absoluter Pfad) + af-packet-
  Bridge-Capture (docker0 + jimesh-Netz-Bridge, Cluster-IDs 101/102 — WICHTIG: Container-Traffic
  wird vor eth0 geNAT't; ohne Bridge-Capture wäre die Container-Zuordnung unmöglich und das
  Feature eine grüne Lüge) + systemd-Drop-in (suricata Wants/After docker). Anwendung: reload-rules
  (nur Regeln) vs. Restart (Capture-Config), ehrlich gemeldet. Responder-Container: build aus der
  gestagten Quelle, network_mode: none (Mandat 12: null Ports), eve.json :ro + docker.sock,
  Modus-Banner-Check. **LIVE-PROBE (Mandat 2):** Throwaway-Container POSTet einen FAKE-Marker
  (AWS_SECRET_ACCESS_KEY=JIMESHPROBENOTAREALSECRET) als Klartext-HTTP — Task failt LAUT, wenn
  nicht alles greift: Regel in den NEUEN eve.json-Zeilen, Responder-Detection im Log, und im
  ENFORCE-Modus der Probe-Container wirklich paused (docker inspect) + von jedem Netz getrennt.
  ENFORCE nur via overrides.local.yml (gitignored); getrackter Default detect. Transform der
  suricata.yaml gegen die Upstream-Config SIMULIERT und mit der echten Engine -T-validiert (die
  Simulation fing einen echten Indent-Bug ab — 2-Spaces-List-Indent, sonst kaputtes YAML).
  Zusätzlich validiert: das ausgelieferte compose-Artefakt — docker compose config OK, und ein
  kompletter compose-up-Smoke (Staging + .env-Render exakt wie der Task) mit host-seitigem
  Bind-Mount-Anhang erzeugte Detection-Records inkl. echter Container-Auflösung
  (jimesh-postgres, echte ID/Name/Netzwerk) — danach vollständig abgerissen und bereinigt.
- **WP5 [ ]** Falco + SIEM + OpenSearch live (Agent E IaC → Deploy → Wazuh-Dashboard via /embed).
- **WP6 [ ]** Guard-Streaming-Gap schließen (SSE-Branch scannt) — queued.
- **WP7 [ ]** freeze.go Stage-4 Egress-Blackhole — queued (Architektur-Review mit Operator).

## Was NICHT geliefert wurde (Bau-Agent H, ehrlich)

- **Kein Deploy gegen einen echten Node** — der Task wurde nie ausgeführt; die Live-PROBE ist Teil
  jedes Deploy-Laufs. Runbook: deploy/threat-responder/README.md.
- **Kein eBPF/XDP-veth-Drop** — bewusst v2 (Mandat 12: keine Host-Firewall; v1 zero-routet
  container-scoped via docker disconnect + pause).
- **Keine eve.json-Ingestion in Postgres/die SIEM-Brücke** — die Detection-Records liegen als
  JSON-Zeilen in docker logs jimesh-threat-responder (WP5s siem-Fluss ist Agent Es Feld).
- **BACKLOG-Spiegel von WP2-4 nicht durch H gesetzt** (File-Scope des Bau-Agents: nur
  cmd/threat-responder/**, deploy/threat-responder/**, dieses Sprint-File + Berichtsfile) —
  parent möge den BACKLOG.md-Spiegel nachziehen.
