# SPRINT-62 — DATALAKE-IaC: deploy/datalake in das verbindliche make-redeploy-Muster

# (Sprint-Doku per Documentation Mandate: Plan vor Code; retrospektiv nur was
#  WIRKLICH geschah — die Verifikation dieser Session steht unten.)
# Nummern-Alias: der Parent hat diese Arbeit in seiner Wave-Nummerierung als
# "SPRINT-155 Datalake-IaC" committet (cbcc942 + f6241c4, 29.9.) — DIESE Datei
# folgt der IaC-Serie (S54 ozone, S57 grafana, S61 siem), kein 155er-File
# existiert, Duplikat-Nr. bewusst nicht angelegt.

**Status:** ✅ GEBAUT (28.9.2026); Verifikation dieser Session siehe unten. Der
Deploy gegen einen echten Node wurde BEWUSST NICHT ausgeführt (Operator-Step,
gleiche Konvention wie S61-6/S144-5): make redeploy SERVICE=datalake NODE=<name>
— das Runbook steht in deploy/datalake/README.md.

**Auslöser (Operator-Kontext):** deploy/datalake/ hatte NUR docker-compose.yml +
README.md — KEINE ansible-task.yml/defaults.yml. make redeploy SERVICE=datalake
starb deshalb in deploy-service.yml an "Load service defaults" ("Could not find
or access .../datalake/defaults.yml") — exakt dieselbe Lücke, die SPRINT-54 für
ozone, SPRINT-57 für grafana und SPRINT-61 für siem geschlossen hat. Der
SPRINT-55-Stack (kafka + datalaked) war damit checkout-only: IaC-dispatchbar,
aber nie deploybar.

## Plan (vor Code — Documentation Mandate)

**Ziel:** make redeploy SERVICE=datalake NODE=<name> bringt den SPRINT-55-
Datalake-Stack (pinned Confluent KRaft-Broker + datalaked, build-from-source via
Dockerfile.datalaked) auf den Node — idempotent, ehrlich bei fehlenden
SigV4-Creds, LIVE-verifiziert (Mandat 2), mit vollem Operator-Runbook in
deploy/datalake/README.md.

**Work Packages + Akzeptanz:**
- WP1: deploy/datalake/{defaults.yml,ansible-task.yml} nach ozone/siem-Muster
  (Prechecks → Repo-Checkout → Staging-Whitelist → .env ohne Secrets → pull/up
  → echte Verifikation; fehlende OZONE_S3_*-Creds = Broker deployt+verifiziert,
  datalaked sauber gestoppt, LAUTES Fail mit getsecret-Runbook — nie still).
- WP2: docker-compose.yml — Build-Context env-konfigurierbar
  (JIMESH_DATALAKE_SRC_DIR:-../../src/backend, siem-Präzedenz) + echter
  Kafka-Healthcheck (kafka-broker-api-versions gegen den Inter-Broker-Listener).
- WP3: README.md — kompletter Operator-Runbook (IaC primär, "Deploy via IaC",
  "SigV4-Credentials", "Verifizieren"; Checkout-Weg bleibt).
- WP4: Registrierungs-Kommentar in deploy/ansible/playbooks/deploy-service.yml
  (ozone/siem-Muster, registration-by-existence dokumentiert).

## Geliefert

- **WP1 [x]** deploy/datalake/defaults.yml + ansible-task.yml:
  - Prechecks laut: docker compose fehlt → Hard-Fail; Ozone-S3G
    (jimesh-ozone-s3g) läuft nicht → Hard-Fail mit "deploy ozone first"
    (datalaked würde sonst nur crash-loopen — ehrlich verweigert statt vorgetäuscht).
  - Repo-Checkout auf <deploy_root>/repo (deploy/backend-Konvention: gleicher
    Pfad, gleiches Modul, force:true — welchen Task zuerst läuft, ensured ihn);
    Stale-Ref-Hard-Fail wenn Dockerfile.datalaked/cmd/datalaked fehlen.
  - Staging-Whitelist (docker-compose.yml + README.md — nie rekursiv, nie die
    Controller-.env); .env-Render via lineinfile, NUR nicht-geheime Zeilen
    (JIMESH_NETWORK, JIMESH_DATALAKE_SRC_DIR, KAFKA_TOPIC_PREFIX, KAFKA_GROUP,
    OZONE_S3_ENDPOINT, OZONE_S3_REGION, DATALAKE_BUCKET) — die Operator-Zeilen
    OZONE_S3_ACCESS_KEY/SECRET_KEY überleben jeden Redeploy (Mandat 9: Werte
    werden nie gelesen/gedruckt, nur Präsenz geprüft).
  - Creds fehlen → Broker läuft + wird verifiziert, datalaked per compose stop
    ruhiggestellt (kein Crash-Loop), Hard-Fail mit exaktem getsecret-Runbook
    (siem-Service-Key-Präzedenz, 1:1 gespiegelt für Ozone-SigV4).
  - LIVE-Verifikation (Mandat 2 — NICHT "Container läuft"): Broker-Metadaten-
    Request via docker exec; Compose-Healthcheck healthy; Broker per Container-
    Name auf jimesh-net (Throwaway, gleiches gepinntes Image — datalakeds Pfad);
    Loopback-Host-Port 9092 (kcat-Pfad); datalaked /healthz (beweist MORE: der
    Status-Server startet erst NACH ensureBucket — grün heißt Ozone-S3G + Creds
    + Bucket okay); /status auf der GATEWAY-URL (http://jimesh-datalaked:7620/
    status über jimesh-net — exakt der Default aus internal/gateway/datalake.go)
    + Spiegel-Kontrolle brokers/regex/endpoint/bucket gegen die gestagte .env.
  - until/retries + failed_when:false + separater Hard-Fail mit Diagnose-
    Kommandos — das Muster empirisch getestet (s. Verifikation): Retry-
    Erschöpfung failt NICHT den Wait-Task, sondern liefert dem Folge-Fail die
    saubere Diagnose.
- **WP2 [x]** deploy/datalake/docker-compose.yml (2 Stellen): Build-Context
  context: ${JIMESH_DATALAKE_SRC_DIR:-../../src/backend} (Checkout-Nutzung
  unverändert, IaC setzt ihn auf den Node-Checkout — der Runner mounted nur
  deploy/ und kann src/backend nie stagen); Healthcheck für kafka
  (kafka-broker-api-versions, interval 15s, start_period 30s) — live bewiesen:
  Container war nach 8 Sekunden (healthy).
- **WP3 [x]** deploy/datalake/README.md: Quick start (IaC primär), "Deploy via
  IaC" (Phasen + Render-Liste + ehrliche Nicht-Ziele), "SigV4-Credentials"
  (getsecret-Runbook, Node-.env-Write, überlebt Redeploys), "Verifizieren"
  (compose ps, Metadaten-Request, healthz/status, kcat; ehrliche
  starting/connected/degraded-Bedeutung — GHOST-AUDIT-D.4-Kontrast benannt).
- **WP4 [x]** deploy/ansible/playbooks/deploy-service.yml: Registrierungs-
  Kommentar nach der siem-Notiz (registration-by-existence; NICHT in
  jimesh_no_docker_services, weil echter compose-Stack; jimesh-net-Pretask
  nötig, weil externes Netz).

## Verifikation dieser Session (ehrlich, Mandat 6)

- python3 yaml.safe_load über ALLE angefassten YAML: PASS (docker-compose.yml,
  defaults.yml, ansible-task.yml, deploy-service.yml).
- docker compose --profile datalake config: VALID — beide Richtungen: Default
  löst den Build-Context checkout-relativ auf, gesetztes JIMESH_DATALAKE_SRC_DIR
  auf /opt/jimesh/repo/src/backend. Zusätzlich Staging-Simulation (gestagte
  Compose + exakt die 7 nicht-geheimen .env-Zeilen, die der Task rendert —
  Creds auf redacted-for-config-check, niemals echte): alle Werte rendern.
- ansible --syntax-check (jimesh-ansible-runner:local, Wrapper mit statischem
  import_tasks nach include_vars defaults.yml): exit 0, 0 ERRORs. Negativ-
  Kontrolle (unbekanntes Modul) failt laut (exit 4) → der PASS ist belastbar.
- Empirischer until/retries/failed_when-Test (Runner-Container): Retry-Erschöpfung
  failt den Wait-Task nicht; Folge-Debug erreicht rc=1 → das Hard-Fail-Muster
  der Verifikations-Tasks funktioniert wie designed.
- LIVE gegen einen echten jimesh-datalake-kafka (cp-kafka:7.6.0, gepullt + über
  die eigene Compose gestartet, jimesh-net): Healthcheck (healthy) nach ~8 s ✓;
  docker exec kafka-broker-api-versions rc=0 ✓; --network host gegen
  127.0.0.1:9092 rc=0 ✓; cp-kafka-Command-Passthrough (docker run IMAGE cmd) ✓
  und curl im cp-kafka-Image vorhanden (7.61.1) ✓ → alle Probe-Kommando-Formen
  des Tasks sind real gelaufen.
  - BEFUND, ehrlich: der Container-Name-Probe über jimesh-net (docker run
    --network jimesh-net → jimesh-datalake-kafka:29092) kann auf DIESEM
    Dev-Host nicht grün werden — derselbe Dev-Host blockt Same-Bridge-Traffic
    auf ALLEN Altnetzen (jimesh-net, jimesh_default, jimesh_jimesh-net: ICC
    blockiert; frisch angelegtes Netz: ICC OK; sysctl bridge-nf-call-iptables=1,
    kein root/sudo hier für tiefere iptables-Diagnose). DNS löst korrekt, der
    Java-Client lief — es ist reine TCP-Blockade durch die lokale Netzebene.
    Auf trading ist genau dieser Pfad nachweislich grün (S61-Live-Check:
    one-shot alpine wget über jimesh-net → jimesh-backend:3010 {"status":"ok"}).
    Der Task-Probe failt auf so einem Host LAUT mit diagnose-Kommandos —
    ehrliches Verhalten, kein grüner Fake.
- datalaked-Build aus Source (Dockerfile.datalaked, golang:1.26-bookworm →
  distroless/static): PASS (exit 0). Lokal mit --network host für die Build-
    Steps gelaufen, weil derselbe Dev-Host-Filter den Bridge-Egress zu
    proxy.golang.org tötet — Dockerfile/Source identisch zum Compose-Pfad;
    auf Nodes gilt der Default-Pfad (erste Build-Phase braucht Egress zu
    proxy.golang.org, danach CACHED).
- datalaked-Negativtest OHNE Ozone (echter Beweis für Mandat 2): Daemon exitet
  beim Start mit der ehrlichen Begründung ("bucket \"jimesh-datalake\":
  HeadBucket … lookup jimesh-ozone-s3g … server misbehaving" aus docker logs),
  RestartCount steigt, /healthz verweigert (curl rc!=0) → exakt der Pfad, den
  der ansible-Task mit dem Hard-Fail + getsecret-Runbook abfängt. Danach
  Teardown (Container, Volume, Test-Image entfernt — Dev-Host sauber).
- make go-build / make go-vet (golang:latest-Container, House-Cache-Mounts):
  beide EXIT 0 (kein Go-File angefasst — Bestätigung, dass der Tree baut).
- npx tsc --noEmit -p tsconfig.app.json (src/frontend): 472 'error TS' —
  exakt die Baseline, nicht schlechter (kein Frontend-File angefasst).
- npm run check:i18n: PASS (60 Locales, 3288 Keys).
- NICHT gelaufen (bewusst): der Deploy gegen einen Node. "Datalake läuft auf
  <node>" wird nirgends behauptet — das stellt erst der Operator-Run her, und
  der Task verifiziert dann jeden Teil selbst (oder schlägt laut fehl).
- API_DOCS.md: keine HTTP-Route angefasst — N/A (Deploy-IaC; der Gateway-Proxy
  /api/datalake/status ist unverändert und liest http://jimesh-datalaked:7620/status).

## Bewusst offen / an den Operator

1. Der Deploy-Lauf selbst: make redeploy SERVICE=datalake NODE=<name> —
   Voraussetzung: ozone läuft dort (Pre-Check failt sonst laut) und die
   SigV4-Creds liegen in der Node-.env (Runbook: deploy/datalake/README.md
   "SigV4-Credentials"). Ohne Creds endet der Lauf wie designed im LAUTEN
   Fail — der Broker läuft dann trotzdem verifiziert.
2. kafkabridge (Produzent, Redis Streams → jimesh.*-Topics): Operator-Binary,
   nicht Teil dieses Compose/Task — bis er läuft, meldet /status ehrlich
   "starting" mit 0 Pipelines.
3. Falls ein Node denselben Same-Bridge-Block hat wie dieser Dev-Host: der
   Container-Name-Probe (und datalaked selbst!) failt dort laut — diagnose
   steht im Task-Fail; Fix ist Host-Ebene (iptables FORWARD für die Docker-
   Bridges), nicht IaC.
