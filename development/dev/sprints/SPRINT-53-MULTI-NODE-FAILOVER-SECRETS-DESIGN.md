# SPRINT-53 — Multi-Node: Failover-Rollen, Secrets-Only-Nodes, Auto-SIEM-Wiring (Design, kein Code)

**Status:** 📋 DESIGN-AUFTRAG — Bestandsaufnahme fertig, Architektur-Entscheidung + Umsetzung offen.
**Auslöser:** Operator, 2026-09-27 — will pro Node im Config deklarieren können, ob er
Failover-Node, Secrets-only-Node o.ä. ist, und dass das über Dashboard-SSH-Deploy GENAUSO
funktioniert wie über CLI/config.yml — inkl. automatischem SIEM-Anschluss für jeden neuen Node.

---

## Bestandsaufnahme (real verifiziert, nicht angenommen)

1. **Genau EIN Control-Plane, hart im Code/Kommentar festgelegt** (`config.yml`, Node `trading`):
   > "There is exactly one main control plane; this flag marks it as the (singleton)
   > Headscale/vpn_node host"
   Kein Rollen-Wert für "Failover" oder "Secrets-only" existiert im Schema (`role:
   control_plane|worker|client` sind die einzigen drei).
2. **Vault: kein HA/Replication-Setup** — `grep -rn "raft|ha_storage|cluster_addr|replication"
   deploy/vault/` → 0 Treffer. Single-Node, keine Failover-Fähigkeit.
3. **Gute Nachricht:** Dashboard-SSH-Provisioning ist **keine Parallel-Implementierung** —
   `src/backend/internal/deploy/ssh_provider.go` (TASK-060) ist explizit als Wrapper gebaut:
   "This file is a WRAPPER, not a rebuild ... Mandate 11: the logic is written once in the Go
   core; this is a thin adapter." Deploy/Undeploy/Provision/Status laufen über dieselbe Pipeline
   wie `make provision-node`/`executeDeploy`. Die vom Operator befürchtete Divergenz zwischen
   "CLI-Weg" und "Dashboard-Weg" existiert für diese vier Aktionen nicht.
4. **Unklar, nicht verifiziert:** ob `handleNodeProvision` einen frisch provisionierten Node
   automatisch mit SIEM (Falco/Wazuh) verbindet, oder ob das ein separater manueller Schritt
   bleibt. Nicht geprüft in diesem Sprint — echter nächster Rechercheschritt, nicht geraten.

## KORREKTUR (2026-09-28) — der eigentliche, konkrete Kern der Anfrage

Operator, verbatim: "der agent hat das nicht kapiert das wir diese scheisse in den configs
definieren müssen was alles deployed werden soll und via dashboard wenn man nen anderen worker
deployed"

Nicht "Grafana/Ozone einmal von Hand deployen" — sondern: **`config.yml` muss pro Node eine
Liste optionaler Services deklarieren können** (z. B. `services: [grafana, ozone, siem]` neben
`role: worker`), und **der Dashboard-Weg, einen neuen Worker/Node hinzuzufügen, muss GENAU
DIESELBE Konfiguration konsumieren** — kein separater manueller Ad-hoc-Weg für "füg noch Grafana
hinzu". Bereits bestätigt (gestern): `ssh_provider.go` ist schon ein Wrapper um dieselbe
Go-Pipeline wie `make provision-node` — das Prinzip ("eine Pipeline, zwei Aufrufwege") existiert
schon für Provisioning selbst, fehlt aber für "welche optionalen Services pro Node".

**Das ist der eigentliche nächste Schritt, nicht einzelne `make redeploy`-Aufrufe.**

**UMGESETZT (2026-09-28):** `config.yml`-Node-Eintrag kann jetzt `services: [grafana, ozone, siem,
suricata-network-ids, ...]` deklarieren — `render-inventory.py` schreibt `.node-services`,
`make deploy-all` deployt für jeden Node genau die dort gelisteten Services, über denselben
`make redeploy SERVICE=<svc> NODE=<node>`-Weg wie die 6 Kern-Plattform-Services (kein zweiter
Mechanismus).

**Firewall gehört in dieselbe `services:`-Liste** (z. B. `services: [firewall]`) — ABER: welche
konkrete Aktion "Firewall deployen" bedeutet, hängt vom Provider ab (siehe Provider-Fund unten).

**Provider-Frage (Operator, 2026-09-28): "was ist wenn der Mensch lieber mit AWS arbeiten will,
nichts soll hardgecodet sein"** — echt geprüft, gute Nachricht: **das ist bereits architektonisch
NICHT hardcodiert.** `internal/provision/provider.go` hat ein reales `Provider`-Interface
(`Type()`, `Description()`, `Implemented() bool`, `Deploy(...)`) mit 5 real deklarierten Typen aus
TASK-048: `ssh` (implementiert), `aws-ec2`/`gcp-ce`/`ipam-netbox`/`kubernetes` (ehrliche Stubs,
`Implemented()==false`, HTTP 501, kein Fake-Erfolg). Die Architektur ist provider-agnostisch
vorbereitet — es fehlt nur die tatsächliche AWS/GCP/K8s-Provider-Logik. Das `services:`-Konzept
oben muss deshalb provider-bewusst gebaut werden: "Firewall deployen" heißt bei `ssh`
nftables/host-Firewall, bei einem künftigen `aws-ec2`-Provider wären es Security-Groups — nicht
derselbe Ansible-Task für beide.

## Design-Fragen, die vor der Umsetzung geklärt werden müssen

1. **Rollen-Erweiterung im Schema:** `role: control_plane` müsste um Sub-Rollen erweitert werden,
   z. B. `role: control_plane`, `failover_for: trading` (dieser Node übernimmt bei Ausfall von
   `trading`) oder `role: secrets_node` (nur Vault, kein Postgres/Backend/Frontend). Das ist eine
   echte Schema-Änderung in `config.yml` + `render-inventory.py`, kein reines Doku-Update.
2. **Vault-Failover ist die härteste Einzelbaustelle:** Vault braucht für echtes Failover
   Raft-Storage-Backend + `cluster_addr`/`retry_join`-Konfiguration zwischen den Nodes — das ist
   eine eigene, nicht-triviale Vault-Architektur-Entscheidung, kein Config-Flag allein.
3. **Auto-SIEM-Wiring für jeden neuen Node:** müsste in `handleNodeProvision` (bzw. dessen
   Ansible-Gegenstück) so verankert werden, dass es unabhängig vom Aufrufweg (CLI vs. Dashboard)
   IMMER passiert — Konsequenz aus Fund 3 oben: da beide Wege schon dieselbe Funktion aufrufen,
   reicht ein Fix AN EINER STELLE, um Konsistenz zu garantieren (kein Doppel-Pflege-Problem).
4. **Ozone (Operator-Vorschlag, github.com/ji-podhead/ozone-with-hue-localstack-and-compose)**
   als S3-kompatibler Storage-Backend passt konzeptionell auf BACKLOG #087
   (Datalake-as-a-Service, bisher 0 Code) — nicht für dieses Sprint akut gebraucht, hier nur
   verknüpft, damit der Vorschlag nicht verloren geht.
5. **Grafana** (github.com/ji-podhead/Grafana-11.5-with-Prometheus-and-Docker-Compose) —
   separat vereinbart, wird als `deploy/grafana/` nach demselben additiven Muster wie
   `deploy/falco-gvisor-integration/` gebaut (Postgres- + Redis-Dashboard passen direkt,
   Envoy-Dashboard braucht Anpassung auf Traefik, da `trading` Traefik statt Envoy fährt).

## Nachtrag (2026-09-27) — OPA-Klarstellung, Debezium/CDC-Fund, volle Control-Plane-Migration

**OPA braucht keine eigene Failover-Arbeit:** `open-policy-agent/opa/v1/rego` ist als Go-Library
direkt im Backend eingebettet (`internal/policy/{policy,capabilities,project_gate,
headscale_gate}.go`) — kein separater OPA-Service, kein Sidecar. OPA failt automatisch mit dem
Backend mit, sobald Backend-/Control-Plane-Failover steht. Kein Zusatzaufwand.

**Debezium/CDC — KORREKTUR (mein erster Fund war unvollständig, Operator hat zu Recht
widersprochen):** ich hatte nur `deploy/datalake/docker-compose.yml` gefunden und daraus fälschlich
auf "totes Scaffold" geschlossen — nicht gründlich genug in `src/backend`/`src/frontend` gesucht.
Echter, jetzt vollständiger Stand:

- **Real und funktionsfähig:** `cmd/kafkabridge/main.go` (143 Z., Redis Streams → Kafka via
  franz-go, pure Go, at-least-once) — kein Stub. Postgres-WAL-CDC via `pglogrepl` (TASK-034,
  Sprint-33, StartReplication+Slot-Manager+Integrationstest) — real. Edge-Node-CDC-Forwarder
  (TASK-058) — real.
- **`DatalakePage.tsx` + `internal/gateway/datalake.go`**: hatte einen echten Mandate-2-Fund
  (hardcodierte Fake-Werte "ActivePipelines:1, ReplicationLag:12ms"), der laut Code-Kommentar
  schon gefixt ist — Health-Check gegen den echten Debezium-Connect-Endpoint, ehrliches
  `"not_connected"` statt Fake-Daten.
- **Real fehlend, laut TASK-105s eigenem `grep`** (`jimesh_datalake|DatalakeService|
  AutoDiscovery|BackupEngine` → 0 Treffer): die **Orchestrierungs-Schicht** aus der R44-Spec
  (358-Zeilen-APPROVED-Konzept) — Source/Transform/Sink-Adapter als vereinheitlichter Service.
  `cmd/datalaked/main.go` ist ein 13-Zeilen-Leerlauf-Stub (nur `sleep`-Loop).
- **Offene Frage, nicht nur Bugfix:** die echten CDC-Bausteine (kafkabridge, pglogrepl) sind
  pure Go, OHNE Debezium/Kafka-Connect/JVM. Das Compose-File (Kafka+Debezium 2.5+OpenSearch+MinIO)
  scheint ein zweiter, nie verdrahteter Ansatz zu sein — klären, ob Debezium selbst noch gebraucht
  wird oder der pure-Go-Pfad die eigentliche, bereits gewählte Richtung ist, BEVOR jemand
  Debezium-Connectoren konfiguriert.

BACKLOG.md #087/R44-088 ("0 Code") ist entsprechend zu präzisieren — 0 Code stimmt nur für die
Orchestrierungs-Schicht, nicht für die darunterliegenden CDC-Bausteine.

**Volle Control-Plane-Migration** (Operator-Auftrag, neu): nicht nur Failover (zwei Nodes parallel,
einer übernimmt bei Ausfall), sondern die Fähigkeit, den kompletten Control-Plane-Node bewusst auf
einen anderen Server umzuziehen (Postgres-Daten, Vault-Secrets, Keycloak-Realm, laufende
Workspaces). Das ist strukturell näher an einem Migrations-Runbook (Backup auf Node A → Restore
auf Node B → DNS/Headscale-Umhängen → alte Node stilllegen) als an klassischem HA-Failover —
beide Konzepte sollten im Design getrennt behandelt werden, nicht als dasselbe Feature.

## Nächste Schritte (Reihenfolge)

1. Verifizieren: läuft SIEM-Wiring schon automatisch in `handleNodeProvision`, oder ist das
   Fund-3-Wrapper-Argument (eine Stelle reicht) noch zu bauen?
2. Vault-Raft/HA-Design als eigene, isolierte Entscheidung (nicht nebenbei in diesem Sprint).
3. `config.yml`-Schema-Erweiterung für Failover-/Secrets-Rollen, inkl. `render-inventory.py`-Anpassung.
4. `deploy/grafana/` bauen (bereits vereinbart, unabhängig von den anderen Punkten hier).
