# BUILD 28.9.2026 — DATALAKE-IaC: deploy/datalake via make redeploy (SPRINT-62)

**Agent:** Datalake-IaC build agent · **Repo:** /home/ji/projects/jimesh ·
**Scope:** deploy/datalake/* + deploy/ansible/playbooks/deploy-service.yml (nur
Registrierungs-Kommentar) + docs (Sprint-File, BACKLOG-Spiegel) · **Kein git
commit** (Standing Order — alles liegt uncommittet im Working Tree).

## 1. Task-Struktur (was gebaut wurde)

### 1.1 deploy/datalake/defaults.yml (NEU)

Macht den fehlgeschlagenen include_vars-Schritt ("Load service defaults") von
deploy-service.yml funktionierend — genau der Schritt, an dem
`make redeploy SERVICE=datalake` bis heute starb. Enthält: Staging-Pfad
(`{{ jimesh_deploy_root }}/deploy/datalake`), Repo-Checkout
(`{{ jimesh_deploy_root }}/repo`, git repo/ref wie backend/siem), die beiden
Pflicht-Quelldateien für den Build (Stale-Ref-Guard), Container-Namen, die
nicht-geheimen Compose-Variablen (MUST die ${VAR:-default}-Fallbacks der Compose
spiegeln), die in der Compose fest verdrahteten Ports (29092 intern,
127.0.0.1:9092 Host, 127.0.0.1:7620 Status — Mandat 12), Probe-Image
(= dasselbe gepinnte confluentinc/cp-kafka:7.6.0, das der Broker-Service nutzt
— auf jedem Node, wo der Stack läuft, bereits lokal; enthält die Kafka-CLI-
Tools + curl, live verifiziert) und die Warte-Budgets.

### 1.2 deploy/datalake/ansible-task.yml (NEU — das Kernstück)

Aufruf über `make redeploy SERVICE=datalake NODE=<name>`. Phasen:

| # | Phase | Verhalten |
|---|---|---|
| 0 | Prechecks | `docker compose version` fehlt → Hard-Fail (ozone-Muster). Ozone-S3G (`jimesh-ozone-s3g`) läuft nicht → Hard-Fail mit `make redeploy SERVICE=ozone NODE=…` — datalaked würde sonst nur crash-loopen (exitet ehrbar beim Start, wenn es den S3-Sink nicht erreicht) |
| 1 | Repo-Checkout | ansible.builtin.git auf `<deploy_root>/repo` (deploy/backend-Konvention, force:true wie backend; der Runner mounted nur deploy/ und kann src/backend nie stagen). Stale-Ref-Hard-Fail mit Fix-Kommandos, wenn `Dockerfile.datalaked`/`cmd/datalaked/main.go` fehlen |
| 2 | Staging | Whitelist-Copy: docker-compose.yml + README.md nach `<deploy_root>/deploy/datalake/` — nie rekursiv, nie die Controller-.env |
| 3 | .env-Render | lineinfile (nie copy!) für JIMESH_NETWORK, JIMESH_DATALAKE_SRC_DIR (der Build-Context!), KAFKA_TOPIC_PREFIX, KAFKA_GROUP, OZONE_S3_ENDPOINT, OZONE_S3_REGION, DATALAKE_BUCKET — NUR nicht-geheime Zeilen; die Operator-Zeilen OZONE_S3_ACCESS_KEY/SECRET_KEY überleben jeden Redeploy (Mandat 9) |
| 4 | Creds-Präsenz | `grep -qE '^OZONE_S3_…=…'` → present/missing, Wert wird NIE gelesen/gedruckt. Missing → Heads-up-Debug VOR dem Deploy |
| 5 | Pull + Up | `docker compose --profile datalake pull kafka` (nur der Broker hat ein Registry-Image; Egress-Fail = eigener Hard-Fail mit docker-save/load-Alternative) → `up -d --build` (datalaked wird aus dem Node-Checkout gebaut; --build pickuppt neuen Code; Layer-Caches halten es schnell) |
| 6 | LIVE-Verify Broker | (a) State.Running-Hard-Fail; (b) Warten auf compose-Healthcheck healthy; (c) Metadaten-Request via docker exec (kafka-broker-api-versions, Inter-Broker-Listener); (d) Throwaway-Container desselben gepinnten Images über jimesh-net auf den CONTAINER-NAMEN (datalakeds exakter Pfad); (e) Loopback-Host-Port 127.0.0.1:9092 (--network host, kcat-Pfad, Mandat-12-Fläche) |
| 7 | LIVE-Verify datalaked | /healthz auf 127.0.0.1:7620 — startet erst NACH ensureBucket: grün beweist Ozone-S3G akzeptiert die SigV4-Creds UND Bucket existiert; danach /status auf der GATEWAY-URL (`http://jimesh-datalaked:7620/status` über jimesh-net — exakt der Default aus internal/gateway/datalake.go) + Spiegel-Kontrolle brokers/consumeRegex/endpoint/bucket gegen die gestagte .env |
| 8 | Creds-Missing-Zweig | Broker läuft + verifiziert; datalaked wird per `compose stop datalaked` ruhiggestellt (kein Crash-Loop); dann Hard-Fail mit dem KOMPLETTEN getsecret-Runbook (§2) — siem-Service-Key-Präzedenz, 1:1 |
| 9 | Abschluss | `docker compose --profile datalake ps` + ehrliches Debug-Ergebnis: was real verifiziert wurde, was Operator-Steps bleiben (kafkabridge!) |

Jeder Hard-Fail nennt exakte Node-Diagnose-Kommandos (docker logs/network
inspect/ss -tlnp/getsecret). until/retries + failed_when:false + separater
Hard-Fail — das Muster empirisch getestet (s. §5): Retry-Erschöpfung failt den
Wait-Task nicht, der Folge-Fail liefert die saubere Diagnose.

### 1.3 deploy/datalake/docker-compose.yml (EDIT, 3 Stellen)

- Build-Context: `context: ${JIMESH_DATALAKE_SRC_DIR:-../../src/backend}` statt
  hartkodiertem relativen Pfad (siem-Präzedenz JIMESH_SIEM_SRC_DIR). Grund: der
  Ansible-Runner mounted NUR deploy/ — er kann src/backend prinzipiell nie
  stagen; der Node-Checkout muss her. Checkout-Nutzung unverändert (Default
  bleibt relativ), live geprüft via docker compose config: Default löst
  checkout-relativ auf, gesetzte Var zu /opt/jimesh/repo/src/backend.
- Kafka-Healthcheck: `kafka-broker-api-versions --bootstrap-server localhost:29092`
  (interval 15s, retries 5, start_period 30s) — live bewiesen: Container war
  nach ~8 s (healthy). "Container läuft" ohne diesen Check wäre keine
  Broker-Readiness (Mandat 2).
- Header-Kommentar: IaC-Weg dokumentiert.

### 1.4 deploy/datalake/README.md (EDIT — Operator-Runbook)

- Quick start: IaC als PRIMÄRER Weg (make redeploy + Voraussetzungen +
  Creds-fehlt-Verhalten), Checkout-Weg bleibt (mit --build, weil datalaked
  gebaut wird).
- NEU "Deploy via IaC": 7 nummerierte Phasen + Render-Liste + ehrliche
  Nicht-Ziele (kein kafkabridge, kein Ozone-Deploy, keine Secrets, kein
  Haupt-Stack).
- NEU "SigV4-Credentials": der EINMALIGE Operator-Step (getsecret auf dem
  Node → zwei .env-Zeilen → re-deploy; überlebt Redeploys).
- NEU "Verifizieren": compose ps, Metadaten-Request, /healthz, /status, kcat —
  plus die ehrliche Bedeutung von starting/connected/degraded (mit
  GHOST-AUDIT-D.4-Kontrast: 0 Pipelines sind ein ehrlicher Leerzustand bis
  kafkabridge läuft, kein Bug).

### 1.5 deploy/ansible/playbooks/deploy-service.yml (EDIT — nur Kommentar)

Registrierungs-Kommentar nach der siem-Notiz (registration-by-existence; NICHT
in jimesh_no_docker_services, weil echter compose-Stack; jimesh-net-Pretask
erforderlich, weil externes Netz; datalaked erreicht jimesh-ozone-s3g:9878 über
es). Kein Code geändert — der generische Dispatch braucht keine Zeile mehr.

### 1.6 docs (NEU/EDIT — Documentation Mandate)

- docs/sprints/SPRINT-62-DATALAKE-IAC.md (NEU): Plan-vor-Code + WP-Liste +
  Geliefert + Ehrlichkeits-Sektion + offene Operator-Items.
- docs/backlog/BACKLOG.md (EDIT): Sprint-Spiegel S62 am Datei-Kopf (vor dem
  inzwischen von einem Concurrent-Agent ergänzten S154-Block eingefügt —
  NICHTS von dessen Inhalt angefasst).
- API_DOCS.md: N/A — keine HTTP-Route angefasst (reines Deploy-IaC; der
  Gateway-Proxy /api/datalake/status liest unverändert
  http://jimesh-datalaked:7620/status).

## 2. Der SigV4-Credential-Runbook (exakt, wie er auch im Task-Fail und README steht)

```bash
# 1) Auf dem Node (Ozone muss dort laufen — der Task-Precheck ensured es):
docker exec jimesh-ozone-om ozone s3 getsecret
#    → aws_access_key_id + aws_secret_access_key

# 2) In die gestagte .env schreiben (root; überlebt jeden Redeploy, weil der
#    Task via lineinfile nur nicht-geheime Zeilen rendert):
echo 'OZONE_S3_ACCESS_KEY=<aws_access_key_id>'    | sudo -n tee -a /opt/jimesh/deploy/datalake/.env
echo 'OZONE_S3_SECRET_KEY=<aws_secret_access_key>' | sudo -n tee -a /opt/jimesh/deploy/datalake/.env

# 3) Vom Controller, aus dem Repo-Root:
make redeploy SERVICE=datalake NODE=<name>
```

Ehrlichkeits-Variante (gewählt + in Task/README/Sprint dokumentiert): ohne
Creds deployed der Task den Broker und verifiziert ihn LIVE, stoppt datalaked
(kein Crash-Loop — es exitet beim Start BY DESIGN, wenn der S3-Gateway es
verweigert), und schlägt als GANZES fehl — mit dem Runbook oben im Fehler-Text.
Der Task minted/shipt/liest die Werte nie (Mandat 9).

## 3. Was der Deploy tut / nicht tut

**Tut:** Prechecks (compose + Ozone-S3G) → Repo-Checkout ensured → Staging
(Whitelist) → .env ohne Secrets (Creds überleben) → Creds-Präsenz → pull/up
(mit Build aus Source) → LIVE-Verify (5 Broker-Proben + 2 datalaked-Proben)
→ ehrliches Abschluss-Debug mit compose-ps-Output. Idempotent in jedem Schritt.

**Tut nicht (Operator-Steps):** SigV4-Creds minten+schreiben (getsecret-Runbook,
§2); kafkabridge deployen (der Produzent — Operator-Binary; bis er läuft, meldet
/status ehrlich "starting" mit 0 Pipelines); Ozone selbst deployen (eigener
Service, Precheck enforced die Reihenfolge); den Haupt-Stack deployen.

## 4. Lokale Live-Funde (dieser Dev-Host, ehrlich)

- Der Kafka-Container (echtes cp-kafka:7.6.0, über die eigene Compose gestartet,
  jimesh-net) war nach ~8 s **(healthy)** — der neue Compose-Healthcheck tut,
  was er behauptet.
- Alle Probe-Kommando-Formen des Tasks sind REAL gelaufen: docker exec
  kafka-broker-api-versions rc=0 ✓; --network host gegen 127.0.0.1:9092 rc=0 ✓;
  cp-kafka-Command-Passthrough (docker run IMAGE cmd) ✓; curl im cp-Kafka-Image
  (7.61.1) ✓.
- **Befund, ehrlich:** der Container-Name-Probe über jimesh-net kann auf DIESEM
  Dev-Host nicht grün werden — der Host blockt Same-Bridge-Traffic auf ALLEN
  Altnetzen (jimesh-net, jimesh_default, jimesh_jimesh-net: alle ICC-BLOCKED;
  frisch angelegtes Test-Netz: ICC-OK; sysctl net.bridge.bridge-nf-call-iptables=1;
  kein sudo/root hier für tiefere iptables-Diagnose). DNS löst korrekt, der
  Java-Client lief — reine TCP-Blockade der lokalen Netzebene. Auf trading ist
  genau dieser Pfad nachweislich grün (S61-Live-Check: one-shot alpine wget über
  jimesh-net → jimesh-backend:3010 → {"status":"ok"}). Auf einem so blockierten
  Node failt mein Probe LAUT mit Diagnose-Kommandos — ehrlich, kein grüner Fake.
- datalaked-Negativtest OHNE Ozone: Daemon exitet beim Start mit der ehrlichen
  Begründung (`bucket "jimesh-datalake": … Head "http://jimesh-ozone-s3g:9878/…":
  … lookup jimesh-ozone-s3g … server misbehaving` in docker logs), RestartCount
  steigt, /healthz verweigert (curl rc≠0) — exakt der Pfad, den der ansible-Task
  mit Hard-Fail + getsecret-Runbook abfängt. Danach vollständiger Teardown
  (Container, Volume, Test-Image entfernt).
- datalaked-Image-Build aus Source (Dockerfile.datalaked): PASS. Lokal mit
  `docker build --network host` gelaufen, weil derselbe Host-Filter den
  Bridge-Egress zu proxy.golang.org tötet (bridge-nf + Policy). Dockerfile/
  Source identisch zum Compose-Build-Pfad; auf Nodes gilt der Default-Pfad
  (erste Build-Phase braucht einmal Egress zu proxy.golang.org, danach CACHED —
  der README erwähnt das).

## 5. Verifikation (ehrlich — live in dieser Session gelaufen)

| Check | Ergebnis |
|---|---|
| python3 yaml.safe_load auf ALLEN angefassten YAML (ansible-task.yml, defaults.yml, docker-compose.yml, deploy-service.yml) | PASS (4×; nach jeder Edit erneut) |
| docker compose --profile datalake config (Default + JIMESH_DATALAKE_SRC_DIR gesetzt) | VALID; Kontext löst beide Richtungen korrekt auf |
| Staging-Simulation (gestagte Compose + exakt die 7 gerenderten .env-Zeilen, Creds auf redacted-for-config-check — nie echte gedruckt) | VALID; alle Werte rendern (Bucket, Endpoint, Topic-Prefix, Group, Netz, Kontext) |
| ansible --syntax-check über die NEUE ansible-task.yml (jimesh-ansible-runner:local, Wrapper mit statischem import_tasks nach include_vars defaults.yml) | exit 0, 0 ERRORs |
| Negative Kontrollen desselben Checks (unbekanntes Modul) | failt laut (exit 4) → der PASS ist belastbar |
| Empirischer until/retries/failed_when-Test (Runner-Container) | Retry-Erschöpfung failt den Wait-Task NICHT; Folge-Task sieht rc=1 → Hard-Fail-Muster funktioniert |
| LIVE: compose-Healthcheck des Brokers | (healthy) nach ~8 s ✓ |
| LIVE: docker exec kafka-broker-api-versions (localhost:29092) | rc=0 ✓ |
| LIVE: --network host → 127.0.0.1:9092 (kcat-Pfad) | rc=0 ✓ |
| LIVE: Command-Passthrough + curl im cp-Kafka-Image | ✓ (Java-Client lief; curl 7.61.1) |
| LIVE: Container-Name-Probe über jimesh-net (HIER) | TCP blockiert durch die lokale Netzebene (s. §4) — Kommando-Form bewiesen, grün nur auf Nodes mit funktionierender Bridge (trading: S61-Präzedenz) |
| datalaked-Build aus Source (Dockerfile.datalaked) | PASS (exit 0; lokal --network host, s. §4) |
| datalaked-Negativtest ohne Ozone (ehrlicher Exit + /healthz verweigert) | PASS — der Hard-Fail-Pfad des Tasks ist real |
| make go-build / make go-vet (golang:latest-Container, House-Cache) | beide EXIT 0 (kein Go-File angefasst) |
| npx tsc --noEmit -p tsconfig.app.json (src/frontend), grep -c 'error TS' | 472 — exakt die Baseline, nicht schlechter (kein Frontend-File angefasst) |
| npm run check:i18n (src/frontend) | PASS — 60 Locales, 3288 Keys |

**NICHT gelaufen (bewusst, Operator-Step wie S61-6/S144-5):** der Deploy selbst
gegen einen Node. Ergo wird nirgends behauptet, der Datalake LAUFE auf einem Node
— das stellt erst `make redeploy SERVICE=datalake NODE=<name>` her, und der Task
verifiziert dann jeden Teil selbst (oder schlägt laut fehl).

## 6. Geänderte Dateien — und Git-Verlauf dieser Session (Parent hat zwischenzeitlich committet)

WICHTIG (Live-Befund beim Final-Sweep): der Parent hat diese Arbeit
MITTLERWEILE selbst committet, während die Verifikation lief —
cbcc942 ("SPRINT-155 Datalake (defaults.yml + compose-Anpassung — IaC TASK
fehlt noch)") und f6241c4 ("Datalake ansible-task.yml vollendet
(IaC-Luecke geschlossen)", 511 Zeilen). Die committeten Versionen sind
byte-identisch mit dem finalen, verifizierten Disk-Stand (git diff leer).
Nummern-Alias: der Parent labelt die Arbeit in seiner Wave-Nummerierung als
"SPRINT-155"; DIESE Doku folgt der IaC-Serie (S54 ozone, S57 grafana, S61
siem) als SPRINT-62 — kein 155er-File existiert, Duplikat bewusst nicht
angelegt (Alias-Notiz im Sprint-File). Falls der Parent ein SPRINT-155-File
nachziehen will: S62-File umbenennen + 3 Verweise (Backlog-Spiegel,
deploy-service.yml-Registrierungskommentar, Sprint-File selbst) mitziehen.

| Datei | Aktion | Git-Stand jetzt |
|---|---|---|
| deploy/datalake/ansible-task.yml | NEU (~510 Zeilen, Kernstück) | vom Parent committet (f6241c4) |
| deploy/datalake/defaults.yml | NEU | vom Parent committet (cbcc942) |
| deploy/datalake/docker-compose.yml | EDIT (Build-Context env-konfigurierbar; Kafka-Healthcheck; Header) | vom Parent committet (cbcc942) |
| deploy/datalake/README.md | EDIT (Quick start IaC primär; "Deploy via IaC"; "SigV4-Credentials"; "Verifizieren") | vom Parent committet (cbcc942/f6241c4) |
| deploy/ansible/playbooks/deploy-service.yml | EDIT (nur Registrierungs-Kommentar, keine Code-Zeile) | vom Parent committet (cbcc942) |
| docs/sprints/SPRINT-62-DATALAKE-IAC.md | NEU (Sprint-Doku + S155-Alias-Notiz) | vom Parent committet (fbf8e26) |
| docs/backlog/BACKLOG.md | EDIT (Sprint-Spiegel S62 am Kopf, oberhalb des Concurrent-S154-Blocks; nichts Bestehendes angefasst) | vom Parent committet (fbf8e26) |

Nachtrag beim Final-Sweep: fbf8e26 ("PLUS SPRINT-155 Datalake-Sprint-File
(SPRINT-62-DATALAKE-IAC)") hat auch die beiden Doc-Dateien übernommen — der
Working Tree enthält von dieser Arbeit nichts Uncommittetes mehr (restliche
untracked Artefakte: src/backend/datalaked, src/backend/threat-responder,
src/frontend/scripts/__pycache__/ = nicht meine). Ich habe selbst NICHT
committet (Standing Order eingehalten). Keine Datei außerhalb des Scopes
angefasst, nichts reverted; Concurrent-Agents-Artefakte blieben unangetastet.

## 7. Exakte Operator-Kommandos

```bash
# (Einmalig pro Node, falls Creds fehlen — Runbook s. §2, dann:)
cd /home/ji/projects/jimesh
make redeploy SERVICE=datalake NODE=<name>

# Live-Verify danach (auf dem Node; Details: deploy/datalake/README.md "Verifizieren"):
ssh <node> 'cd /opt/jimesh/deploy/datalake && docker compose --profile datalake ps'
ssh <node> 'docker exec jimesh-datalake-kafka kafka-broker-api-versions --bootstrap-server localhost:29092 | head -3'
ssh <node> 'curl -s http://127.0.0.1:7620/healthz && curl -s http://127.0.0.1:7620/status'
```

Erwartungshaltung ehrlich: erster Lauf = Image-Pull (~200 MB cp-kafka) +
datalaked-Build (go mod download braucht einmal Egress zu proxy.golang.org,
danach CACHED) + Verifikations-Budgets; fehlen die SigV4-Creds, endet der Lauf
wie designed im LAUTEN Fail — der Broker läuft dann trotzdem verifiziert, und
nach dem Creds-Eintrag + Re-Run liefert derselbe Task den grünen End-to-End-
Nachweis (inkl. /status auf der Gateway-URL).
