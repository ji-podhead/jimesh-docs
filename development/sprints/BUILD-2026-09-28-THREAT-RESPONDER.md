# BUILD-2026-09-28 — THREAT-RESPONDER (Realtime Threat Protection: Suricata → Container-Freeze + Zero-Route)

Build-Agent: Realtime-Threat-Responder (SPRINT-144, Bau-Agent H). Kein Commit (Standing Order).
File-Scope eingehalten: nur `src/backend/cmd/threat-responder/**` (neu),
`deploy/threat-responder/**` (neu), `docs/sprints/SPRINT-144-REALTIME-THREAT-PROTECTION.md`
(Update) und dieses Berichtsfile. gateway.go / mcpserver / frontend /
deploy/suricata-network-ids unberührt (read-only Referenz). BACKLOG.md-Spiegel von WP2-4
NICHT gesetzt (außerhalb meines Scopes) — exakte Zeilen weiter unten für den Parent.

## Was gebaut wurde

Operator-Auftrag (verbatim): "ne threat protection mit suricata wie wenn jemand secrets
klauen will das suricata dann mit ebpf den container einfrieren kann und das auf 0 routen
kann". Gebaut: Suricata-Regeln für Klartext-Secret-Marker → `cmd/threat-responder` (Go,
tailt `/var/log/suricata/eve.json` live) → Container-Auflösung per Quell-IP über die
Docker-Engine-API → DETECT (Default, ehrliches JSON-Log) / ENFORCE (Opt-in: docker network
disconnect von ALLEN Netzen + docker pause). Mandat 12: NIEMALS Host-Firewall — die Zero-Route
ist container-scoped via Docker-API; eBPF/XDP-veth-Drop ist bewusst dokumentiertes v2.

### 1. `deploy/threat-responder/jimesh-secret-exfil.rules` — 9 Regeln, SIDs 8000001-8000014

- High-Confidence (priority 1): `AWS_SECRET_ACCESS_KEY=` (nocase); PEM-Blöcke über das
  Content-Paar `-----BEGIN` … `PRIVATE KEY-----` (within:64 — deckt PKCS#8/RSA/EC/OPENSSH in
  EINER Regel, beide Operator-Varianten inklusive); `ghp_` + `isdataat:36,relative`;
  `github_pat_` + `isdataat:82,relative` (Längencheck = keine Chat-Erwähnungs-FPs).
- .env-Stil (priority 2, FP-Risiko dokumentiert): `PASSWORD=`, `SECRET_KEY=`, `API_KEY=`,
  `ACCESS_TOKEN=`, `CLIENT_SECRET=`.
- SID-Bereich 8000000-8000099 (ET-lokal-Reserve) = das harte Aktionsfenster des Responders —
  er kann NIE auf offizielle/ET-Regeln reagieren.
- Header dokumentiert ehrlich: TLS-Exfil ist UNSICHTBAR (SPRINT-19); Guard-Hook/Tetragon/Falco
  decken die TLS-Seite; FP-Quellen pro Regel.

### 2. `src/backend/cmd/threat-responder/` — Go-Daemon (stdlib-only, Mandat 7; Stil wie datalaked)

- `eve.go`: EVE-Parser (Felder aus ECHTEN 7.0.9-Ausgaben) + Tailer (Poll/Offset/Inode-Rotation/
  Half-Line-Semantik wie internal/siem's FalcoTailer). **Start am Dateiende** — Realtime-
  Responder, kein Forensik-Replayer (alte Alerts werden nie nachträglich enforcet; eve.json
  bleibt die Evidenz). Rotations-Erkennung per reflect auf `syscall.Stat_t.Ino` (FELD, nicht
  Methode — die Method-Assertion-Variante wäre stille tote Rotationserkennung; interner/siem/
  falco.go trägt denselben latenten Bug — NICHT von mir angefasst, out of scope).
- `docker.go`: Docker-Engine-API über den Unix-Socket (stdlib: /_ping, /networks,
  /containers/{id}/pause, /networks/{net}/disconnect). http-URL-Trick wie socket-guard
  (`http://docker`-Dummy-Schema — Client lehnt relative URLs sonst ab, von den Tests ertrotzt).
  Status-Klassifizierung ehrlich: done / already_done (304 bzw. Daemon-Meldung „already
  paused"/„is not connected") / not_found / failed — Roh-Code + Daemon-Meldung IMMER im Record.
- `respond.go`: Detection-Record (eine JSON-Zeile: detected_at, event_time, sid, signature,
  severity, src/dst, flow_id, in_iface, http-Evidence, mode, container{id,name,networks},
  resolve_note, action, actions[]). ENFORCE-Reihenfolge = Operator-Reihenfolge: erst
  disconnect von JEDEM Netz (zero-route), dann pause (Freeze). (SID,flow_id)-Dedup 8192-FIFO.
  DETECT: `action:"logged_only_detect_mode"`, garantiert null Docker-POSTs (Test beweist es).
- `main.go`: Env-Validierung fail-closed (falscher Modus = Start verweigert, nie geraten),
  Docker-Ping-Pflicht („kein toter Watcher"), Modus-Banner, 5-Min-Heartbeat mit echten Zählern.
- `Dockerfile`: socket-guard-Form (golang:1.26-bookworm → CGO_ENABLED=0 → distroless/static).
  KEINE Modul-Downloads im Build (stdlib-only).

### 3. `deploy/threat-responder/` — GATED IaC, exakt nach suricata-Muster

- `ansible-task.yml` (63 Tasks, NICHT im deploy-all, NICHT in deploy-service.yml registriert,
  Hand-Deploy: `make redeploy SERVICE=threat-responder NODE=<name>`). Fail-closed-Prereqs:
  suricata `active`, eve.json existiert, docker compose, jimesh-net + abgeleitete Bridge
  (`br-<id12>`, ip-link-Beweis), `-i`-Override-Detektion (CLI-Interface-Liste ignoriert die
  YAML-af-packet-Liste → Task verweigert ehrlich statt still nichts zu bewirken),
  rule-files-Sektion + af-packet-`default`-Anker vorhanden, `suricata -T` gegen die ERWEITERTE
  Config.
- **Bridge-Capture (Design-Notwendigkeit, nicht Beiwerk):** Docker MASQUERADE't Container-Traffic
  VOR eth0 — eth0-only sähe `src_ip`=Host-IP, Container-Zuordnung wäre UNMÖGLICH, das Feature
  eine grüne Lüge. Der Task fügt deshalb `docker0` + die jimesh-net-Bridge in die af-packet-
  Liste ein (Cluster-IDs 101/102, vor dem `- interface: default`-Anker) + systemd-Drop-in
  (suricata `Wants=/After=docker.service` — Bridge-Interfaces existieren dann beim Start;
  Wants statt Requires, damit ein totes docker den Sensor nicht mitreißt).
- Anwendung ehrlich unterschieden: `suricatasc -c reload-rules` (nur Regeln, kein Downtime)
  vs. `systemctl restart` (nötig, wenn Capture-Config sich änderte — reload wendet af-packet
  NICHT an). Beide Pfade nach -T.
- Responder-Container: Build aus der auf den Node gestagten Quelle (go.mod, go.sum,
  cmd/threat-responder/, compose) — `docker compose up -d --build`; `network_mode: none`
  (Mandat 12: null Ports — der Responder braucht nur eine Datei + den Socket; Side-Effect:
  er kann sich selbst nie als Container auflösen/enforcen), eve.json `:ro`, docker.sock rw.
  Modus-Banner-Check: gerenderter Modus == laufender Modus (Mandat 2).
- **LIVE-PROBE (Mandat 2, tetragon-Präzedenz):** Throwaway-Container `--network jimesh-net`
  POSTet `AWS_SECRET_ACCESS_KEY=JIMESHPROBENOTAREALSECRET` als Klartext-HTTP an
  `threat_responder_probe_url` (default example.com; egress-override dokumentiert). Der Task
  failt LAUT, wenn nicht ALLES greift: (1) Regel 8000001 in den NEUEN eve.json-Zeilen (wc -l
  vor der Probe → tail -n +N → grep), (2) Responder-Detection mit `"sid":8000001` in docker
  logs, (3) im ENFORCE-Modus: Probe-Container `State.Paused=true` UND `0` Netzwerke (docker
  inspect). Kein Skip-Flag — wer es nicht beweisen kann, bekommt kein Grün.
- `defaults.yml`: `threat_responder_mode: detect` getrackt; ENFORCE NUR `overrides.local.yml`
  (gitignored via bestehende deploy/*/overrides.local.yml-Regel); SID-Fenster, Pfade,
  Probe-Image/URL/Wait.
- `docker-compose.yml` + `README.md`: Runbook (Deploy, Verifizieren, ENFORCE-Flip, Freigabe
  nach Forensik), TLS-Schichtungstabelle, 8 ehrliche Grenzen.

## Verifikations-Evidenz (alle Commands und Outputs echt gelaufen)

1. **Regeln gegen die ECHTE Engine** (jasonish/suricata:7.0.9 — gleiche 7.0.x-Serie wie das
   7.0.3 auf trading):
   - `suricata -T` mit verdrahteter Rule-Datei: „Configuration provided was successfully
     loaded. Exiting."
   - Offline-PCAP-Replay (von Hand gebaut: vollständiger TCP-Handshake + HTTP-POST mit allen 9
     Markern, korrekte IP/TCP-Checksummen): `stats: detect.engines[0].rules_loaded: 9,
     rules_failed: 0`, `alert: 9` — alle 9 Regeln feuerten auf EINEM Flow (beweist das
     (SID,flow)-Dedup-Design). Die 5 Fixture-Zeilen in `eve_test.go` (alert/flow/http/fileinfo/
     stats) sind VERBATIM-Ausgaben dieses Laufs — keine erfundenen Detection-Shapes.
   - Transform-Simulation der suricata.yaml-Edits (lineinfile rule-files + blockinfile
     af-packet) gegen die echte Upstream-7.0.9-Config: yaml.safe_load OK, af-packet-Liste =
     [eth0, docker0, br-abc123def456, default]; danach `suricata -T` im privilegierten
     Container mit den exakten Dummy-Bridges: exit 0. **Die Simulation fing einen echten Bug:**
     af-packet-Listeneinträge brauchen 2-Space-Indent — die erste Version hätte die Config
     zerbrochen; der -T-Gate des Tasks hätte es auf dem Node auch gefangen, aber NACH dem Edit.
2. **Go** (golang:latest-Container, `-v src/backend:/app`): `go build ./...` OK, `go vet ./...`
   OK, `go test ./cmd/threat-responder/` = **16/16 PASS**, `gofmt -l` leer. Die Tests bewiesen
   u.a.: DETECT nimmt NIEMALS eine Docker-Aktion vor; ENFORCE ruft disconnect→disconnect→pause
   in EXAKT dieser Reihenfolge; Duplikate (SID,flow) erzeugen keine zweite Aktion; 304/„already
   paused"→already_done; Resolution-Fehler = fail-closed OHNE Aktion; SID-Fenster-Grenzen;
   Tailer: Start-am-Ende, Half-Line, Rotation (rename → neue Inode → re-read), Missing-File.
   Zwei echte Client-Bugs wurden von den Tests gefangen (relative-URL-Ablehnung des http.Client;
   Stat_t-Ino-Feld statt -Methode) und sind fixt.
3. **YAML:** `python3 yaml.safe_load` OK für ansible-task.yml (1 Doc, 63 Tasks), defaults.yml
   (14 Vars, mode=detect), docker-compose.yml (2 Top-Keys, network_mode=none).
4. **End-to-End-Smoke der ausgelieferten Binärdatei** (dev host, KEIN Node):
   Image mit dem EXAKT vom ansible-Task gestagten Build-Context gebaut (nur go.mod, go.sum,
   cmd/threat-responder/ + Dockerfile) → Container gestartet (detect-Modus, eve.json-Volume :ro,
   echter /var/run/docker.sock): Banner korrekt (mode=DETECT, SID-Fenster, Poll/Heartbeat);
   Start-am-Ende BEWIESEN (die vor dem Start im Volume liegende Zeile wurde nicht verarbeitet);
   zwei nach Start angehängte, echt geformte Alert-Zeilen erzeugten innerhalb 1s Poll-Latenz
   zwei Detection-Records: (a) src 172.19.0.99 → ehrliches "none_src_ip_not_a_container" +
   resolve_note, (b) src 172.21.0.2 → **Auflösung des ECHTEN Containers jimesh-postgres**
   (echte 64-Zeichen-ID, echter Name, echtes jimesh-netz mit echter Netz-ID) →
   "logged_only_detect_mode". Keine POST-Aktionen (detect). ZUSÄTZLICH das AUSGELIEFERTE
   compose-Artefakt selbst validiert: Staging exakt wie der ansible-Task (build-Context + die
   .env aus dem Task-Render-Block), docker compose config OK (Interpolation, network_mode:
   none, Bind-Mount :ro), docker compose up -d --build → Detection-Records über den HOST-
   seitigen Bind-Mount-Anhang (Real-Deploy-Flow) inkl. vollständiger Record mit echter
   jimesh-postgres-Auflösung (ID/Name/Netzwerk-Objekt). Danach compose down + Image +
   Staging entfernt. Alle Smoke-Artefakte (Container,
   Volume, Image, Staging) danach entfernt.
5. **Nicht gelaufen (ehrlich):** KEIN Deploy gegen einen echten Node — der Task wurde nie
   ausgeführt (auch nicht gegen trading). Die Live-PROBE ist Teil jedes Deploy-Laufs.

## Operator-Runbook (exakt)

**Deploy (pro Node, von Hand):**

```bash
make redeploy SERVICE=threat-responder NODE=<name aus config.yml>   # z.B. trading
```

Der Lauf endet mit der Live-PROBE: ohne echten Alert + Responder-Detection (ENFORCE: + Pause/
Disconnect-Beweis) SCHEITERT er. Lesen: die debug-Ausgabe „ehrliches Ergebnis" (Modus, Bridges,
reload-vs-restart, was NICHT getan wurde).

**Verifizieren:**

```bash
docker logs jimesh-threat-responder                      # Banner: mode=DETECT/ENFORCE, Detections, Heartbeat
grep '"signature_id":8000001' /var/log/suricata/eve.json | tail   # Roh-Alerts der Regel
docker inspect jimesh-threat-responder -f '{{.HostConfig.NetworkMode}}'   # → none
```

**Auf ENFORCE umschalten** (nur dann pausiert/disconnectet der Responder real):

```bash
cat > deploy/threat-responder/overrides.local.yml <<EOF   # gitignored, Operator-Opt-in
threat_responder_mode: enforce
EOF
make redeploy SERVICE=threat-responder NODE=<name>       # ENFORCE-Live-Probe beweist den Freeze
```

**Freigabe nach Forensik** (HITL — der Responder released nie selbst):

```bash
docker network connect <netz-name> <container-id>       # steht in der Detection-Zeile
docker unpause <container-id>
```

**Fehlschlag-Diagnose:** Jeder fail-closed-Punkt druckt seine Ursache + die nächsten Schritte
(Sensor inaktiv → erst suricata-network-ids; -i-Override → Unit fixen; keine Alerts → wget-/
Egress-/Bridge-Capture-Hinweise).

## Für den Parent (außerhalb meines Scopes)

- **BACKLOG.md-Spiegel** (Dokumentations-Mandat 3; ich durfte die Datei nicht anfassen). Am
  Top unter dem SPRINT-144-Block spiegeln:
  `- [x] SPRINT-144 WP2: Suricata Secret-Exfil-Regeln (deploy/threat-responder/jimesh-secret-exfil.rules, 9/9 vs. echte Engine)`
  `- [x] SPRINT-144 WP3: cmd/threat-responder (eve-Tailer, IP→Container, DETECT/ENFORCE, 16/16 Tests)`
  `- [x] SPRINT-144 WP4: deploy/threat-responder IaC (gated, Live-Probe; deploy = Hand + overrides.local.yml für ENFORCE)`
- API_DOCS.md: keine neuen Routes (kein Gateway-Contact by design) — kein Eintrag nötig.
- Deploy-Registrierung absichtlich NICHT: threat-responder bleibt wie suricata-network-ids
  unregistriert in deploy-service.yml (gated-Hand-Run ist der Wille des Operators);
  deploy-service.yml habe ich nicht angefasst.

## Offene Punkte (ehrlich, keine Aspirationen)

- Erster Live-Lauf gegen trading steht aus (Operator). Er wird vermutlich das
  systemd-/etc/default/suricata-Invocation-Check und die Bridge-Ableitung auf dem echten Node
  beweisen.
- .env-style-Regeln sind FP-anfällig (Login-Forms!) — ENFORCE-Opt-in + Rules-Kommentar
  dokumentieren den Trade; wer will, kommentiert 8000010-8000014 vor dem Deploy aus.
- Egress-beschränkte Nodes: Probe-URL + Build-Images (golang:1.26-bookworm, distroless) via
  overrides/Hand-Load (Muster im Task + README dokumentiert).
- eve.json-Ingestion in die SIEM-Brücke/das Dashboard ist WP5 (Agent E) — der Responder loggt
  JSON-Zeilen via docker logs (bewusst ohne eigene Persistenz-Fläche).
