# TASK-054 — K-LAF WP8 + SIEM Stack-B/C: eBPF (Falco) + Suricata-XDP + OpenSearch + Wazuh-Bridge

**Status:** ✅ umgesetzt (14.9.2026, live verifiziert — Stack läuft, Pipeline
curl-verifiziert; Bericht unten) | **Quelle:** Operator 14.9. („bitte auch das
ebpf und klaf schiess endlich mal starten") + SPRINT-32-SIEM-FOUNDATION
(Vollplan, 3 Stack-Approaches; WP0 gestartet: deploy/wazuh/ existiert mit
Configs aber null Go-Verkabelung) + SPRINT-20 WP8 (eBPF-Tripwire-Plan).

## Fundstellen (Ergebnis)

- `deploy/siem/` — kanonischer SIEM-Stack (docker-compose.yml mit opt-in
  Profile `siem`: wazuh.manager/indexer/dashboard 4.14.7 + falco 0.41.3 +
  siem-bridge; gen-certs.sh, apply-retention.sh [E-SIEM-5, 30d ISM], README,
  config/: wazuh_*-Templates [offizielle v4.14.7-Dateien], Falco-Regeln
  `config/falco/jimesh_rules.yaml` + `falco.container_plugin.yaml`)
- `src/backend/internal/siem/` (NEU) — Shipper (POST /api/sdk/logs,
  Bearer-Service-Key), Wazuh-Indexer-Alerts-Client (GET
  /wazuh-alerts-*/_search — der Manager-API 55000 hat KEINEN /alerts-
  Endpoint, verifiziert gegen v4.14.7 spec.yaml), Falco-Tailer
  (Rotation, at-least-once, evt.args-fähig), Transform (Level-Mapping,
  K-LAF-E3-Metadaten-Allowlist, project_id_hint aus Container-Namensvertrag),
  State-File (Cursor), 19 Unit-Tests mit echten Fixture-Shapes
  (testdata/wazuh_alert.json, falco_event.json)
- `src/backend/cmd/siem-bridge/main.go` (NEU) — Entrypoint (exit 2 ohne
  Service-Key: Attribution wird nie gefaked)
- SPRINT-32-File: WP0/WP2/WP4/WP6/WP9-Checkoffs + E-SIEM-Tabelle
  implementiert (Operator-Bestätigung ausstehend) + Live-Verifikations-
  Abschnitt + OpenSearch-Approach-D/E-BYOL-Vermerk
- BACKLOG: Zeilen 032, K-LAF-Utilities, E-SIEM-1..5 aktualisiert

## Live-Verifikation (13./14.9.2026, Host: Kernel 6.14 + BTF)

- `docker compose --profile siem up -d` → alle 5 Services healthy/running
- Falco: alle 6 Regeln (curl|sh, Out-of-Workspace-Write, Listening-Socket,
  AF_PACKET, +x-chmod-Dropper mit S_IXUSR in evt.args, Miner-Binary) in
  `jimesh-framework-*`-Containern echt getriggert → Events-File → Bridge →
  `/api/sdk/logs` → curl-Query zeigt alias=falco-Rows mit container.name +
  project_id_hint
- Wazuh: echte Alerts (502 „Manager started", SCA 19003/19008) über
  Indexer-Poll → alias=wazuh-Rows (alert_id, rule_id/level, full_log)
- E-SIEM-5: ISM-Policy 30d angelegt + an existierenden Index angehängt
  (explain verifiziert) + ism_template für künftige Tages-Indizes
- Ehrlich gefixt (dokumentiert in README/Compose): falco 0.41.0-Crash
  (plugins#828 → 0.41.3), /host/proc + Socket-Mounts (HOST_ROOT),
  Docker-only-Container-Collector, Stock-Regelsatz bewusst nicht geladen
  (go-build-Noise), Healthchecks mit echter Daemon-/HTTP-Semantik
- Go: gofmt clean, go vet + 19 Tests + go build ./... im Container grün

## Ursprüngliche Fundstellen (Eingangszustand)

- deploy/wazuh/: docker-compose.siem.yml + config/ + wazuh/ (WP0, ungekabelt)
- SPRINT-32-SIEM-FOUNDATION.md: Approaches A (native light), B (Wazuh+
  Eventbridge), C (Falco/eBPF + Suricata-XDP); E-SIEM-1..5 (Backlog sagt
  offen; SPRINT-32 listet Defaults: Wazuh 4.14.7, opt-in compose profile,
  Falco yes, beide Dashboards, 30d Retention)
- internal/scanner/scanner.go: nur Regex-Secret-Scan; Modell-Scanner
  (Llama Guard via Mesh) kam via 73a21b9 (Claude) — NICHT anfassen
- SIEM-Attribution: Deployment/App/Project via K-LAF-Identitätskette
  (X-JiMesh-Header, Service-Keys) — die sdk_logs-Pipeline (TASK-032)
  ist der existing Event-Kanal

## Aufgabe

1. **Falco (eBPF-Tripwire, Approach C):** Falco-Container in deploy/siem/
   compose (opt-in Profile `siem`), Regelsatz der auf Agent-Container-
   Events matcht (execve, Socket-Öffnen, Schreibzugriffe außerhalb des
   Workspace-Pfads, curl|sh-Muster — SPRINT-20-WP8-Liste), Falco-Output →
   Filesystem-Output → JiMesh-Ingest (POST /api/sdk/logs mit
   type=audit als Service-Key — der bestehende Kanal).
2. **Suricata-XDP:** Plan-Item, NICHT bauen — nur compose-Platzhalter +
   Dokumentation der XDP-Abhängigkeit (Kernel >=5.x,-root) — ehrlich als
   „v2" markieren.
3. **Wazuh-Verkabelung (Approach B):** Go-Bridge in internal/siem/:
   Wazuh-API-Client (GET alerts), Poll-Loop, Alerts → /api/sdk/logs
   (type=audit, alias=wazuh) — die bestehende Wazuh-Compose-Stack wird
   damit an das Dashboard angeschlossen. Attribution über die
   X-JiMesh-Header-Kette soweit aus Alert ableitbar.
4. **OpenSearch:** NICHT als eigener Service (E-Build-Mandat: kein neuer
   Service ohne Not) — Doku: OpenSearch bleibt Approach D (AWS, SPRINT-33)
   bzw. optionaler Kunde-BYOL (E-BYOL-Entscheidung vom 14.9.). Im
   Sprint-File vermerken.
5. **E-SIEM-1..5:Implementation nach SPRINT-32-Defaults** (Wazuh-Version,
   opt-in-Profile, Falco on, Dashboards verlinkt, 30d Retention) — die
   Defaults im Sprint-File als „implemented nach Plan" abhaken, und die
   BACKLOG-Zeile („E-SIEM offen") aktualisieren: implementiert, Operator-
   Bestätigung der Defaults ausstehend.
6. **Doku:** SPRINT-32-WP-Checkoffs, BACKLOG-Status, Task-File-Status.

## Regeln

- CGO_ENABLED=0, pure Go; Falco/Wazuh als Container in deploy/siem/
  (compose opt-in Profile siem), keine neue Go-Dependency außer golang.org/x
- No-Mock: echte Falco-Events / echte Wazuh-API-Calls (Test-Umgebung:
  compose up siem → curl-Verifikation); wenn der Stack hier nicht
  startet (Host-Beschränkungen), Unit-Tests mit Fixture-Alerts + ehrliche Doku
- Scope: deploy/siem/**, internal/siem/** (neu), SPRINT-32-File, BACKLOG —
  NICHT internal/scanner (Claudes Modell-Scanner), NICHT src/frontend,
  NICHT cmd/jimesh-router (050-merge läuft)
- API_DOCS: NICHT anfassen (053-Parallel-Session könnte — klären: nein,
  du dokumentierst Routes in SPRINT-32 + Task-File)
- GIT: explizite Pfade, kein -A, NICHT pushen

## Akzeptanz

- [x] docker compose --profile siem up startet Wazuh+Falco (live: alle 5
  Services healthy — manager/indexer/dashboard healthgeprüft, falco + bridge
  running; make-Targets bewusst nicht angetastet — Makefile lag in
  Parallel-Sessions)
- [x] Falco-Event → /api/sdk/logs sichtbar (live curl:
  `GET /api/sdk/logs?type=audit` zeigt alias=falco-Rows mit Level, Rule,
  container.name, project_id_hint — alle 6 Regeln echt getriggert)
- [x] Wazuh-Alerts → gleicher Kanal (live: Rule 502 + SCA 19003/19008 als
  alias=wazuh-Rows mit alert_id/rule_id/rule_level/full_log)
- [x] Suricata-XDP + OpenSearch ehrlich als v2/BYOL dokumentiert (Compose-
  Platzhalter im siem-xdp-Profil + README §Suricata; §OpenSearch →
  Approach D SPRINT-33 / E-BYOL; zusätzlich SPRINT-32-Abschnitt)
- [x] SPRINT-32-Checkoffs + BACKLOG-E-SIEM-Zeile aktualisiert (WP0 ✅,
  WP2-Delta dokumentiert, WP4 ✅, WP6 [~] ehrlich v2, WP9 [~];
  E-SIEM-1..5 implementiert, Operator-Bestätigung ausstehend)
