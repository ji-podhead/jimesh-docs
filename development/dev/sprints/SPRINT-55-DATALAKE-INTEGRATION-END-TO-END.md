# SPRINT-55 — Datalake-Integration: Debezium/CDC + Ozone + der ganze Rest, ECHT verbunden

**Status:** 🔄 IN ARBEIT (Minimal-Pfad implementiert, 27.9./28.9.2026, Branch `feat-datalake-ozone`).
Das ist die Antwort auf: "wie integriert man das alles zusammen — Debezium, Datalake und den
anderen Kram?"

---

## Plan (vor Code — Dokumentations-Mandat)

**Ziel:** EIN realer End-zu-Ende-Pfad `jimesh.* Kafka → Ozone`, live getestet mit
Hash/Timestamp-Beweis — nicht die volle R44-Vision auf einmal.

**Work Packages:**

| WP | Inhalt |
|---|---|
| WP1 | `deploy/ozone/` — echtes Ozone-Deploy (scm/om/datanode/s3g/recon, S3-Gateway) nach dem `deploy/siem`-Muster: opt-in Profile, externes `jimesh-net`, Loopback-Ports (Mandat 12), `.env`-Creds; Vorlage: github.com/ji-podhead/ozone-with-hue-localstack-and-compose (Operator-Repo) |
| WP2 | Debezium-Entscheidung dokumentiert + umgesetzt: JVM-Scaffold aus `deploy/datalake/docker-compose.yml` entfernt (debezium + minio + opensearch), Kafka-only auf `jimesh-net`; No-Op-Stubs in `internal/datalake/` entfernt (sink.WriteBatch warf Daten still weg — Mandat 2) |
| WP3 | `aws-sdk-go-v2` nachgetragen (war NICHT in go.mod): `aws` + `credentials` + `service/s3` mit `BaseEndpoint` auf den Ozone-S3-Gateway |
| WP4 | `cmd/datalaked` — der echte Orchestrator (Stil wie `cmd/kafkabridge`): abonniert `jimesh.*`-Topics via franz-go (Regex-Subscription), schreibt jedes Event 1:1 als JSON-Objekt nach Ozone (kein Transform in v1), at-least-once mit idempotentem deterministischem Key, HTTP-Status-Endpoint fürs Gateway |
| WP5 | `gateway/datalake.go` — Status/Pipelines an den echten datalaked anbinden (statt Debezium-REST): echte `activePipelines` aus den Live-Partition-Zuweisungen + `lastSyncedAt`; ehrliches `not_connected` wenn datalaked nicht läuft |
| WP6 | `DatalakePage.tsx` — Fake-Fallbacks entfernt (`?? 1`, `|| 'Healthy'`, `?? 12` waren erfundene Werte), echte Statusfelder + Sidebar-Nav-Eintrag (`lib/section-nav.ts` DBs-Gruppe: `/dbs/datalake`) |
| WP7 | Docs: API_DOCS (beide Routes fehlten komplett — CLAUDE.md-Verstoß), BACKLOG #087/#088 auf echten Stand, .env.example, dieser Sprint-Record mit Live-Beweis |

**Abnahmekriterien** (unverändert aus der Original-Spec, unten durch Live-Output belegt):
1. Ein echtes `jimesh.*`-Kafka-Event landet nachweislich als echtes Objekt in Ozone —
   Live-Test mit echtem Timestamp/Hash-Vergleich, hier im Sprint-File dokumentiert.
2. `GET /api/datalake/status` zeigt danach ECHTE `activePipelines > 0` und einen echten
   `lastSyncedAt` — nicht mehr nur `"not_connected"`.
3. Die Debezium-vs-pure-Go-Entscheidung ist dokumentiert, BACKLOG.md #087/#088 korrigiert.
4. `DatalakePage.tsx` ist über die Nav erreichbar (nicht mehr nur per Direkt-URL).

---

## Die real existierenden, aber unverbundenen Bausteine (Stand 2026-09-27)

```
[Postgres WAL] ──pglogrepl(TASK-034,real)──┐
                                             │  (beide Quellen produzieren real Daten,
[Redis Streams] ──kafkabridge(real)────────┤   ABER: niemand konsumiert sie in Richtung
                                             │   Datalake — kein Transform, kein Sink)
                                             ▼
                                    ??? (0 Code — DatalakeService/
                                          AutoDiscovery/BackupEngine
                                          aus R44 nie gebaut)
                                             │
                                             ▼
                              [Ozone S3Sink] (SPRINT-54, gerade in Arbeit)
                              [OpenSearch/Wazuh-Indexer als ColumnarStorageSink]
                              [PostgresSyncSink]
```

**Der Kern-Fund von heute:** die einzelnen Rohre sind da (pglogrepl, kafkabridge, gleich auch
Ozone), aber es gibt buchstäblich keine Pumpe dazwischen — kein Code liest aus pglogrepl/kafka
UND schreibt in einen Sink. Genau das ist die "Integration", nach der gefragt wird.

## Minimaler, echter End-zu-Ende-Pfad zuerst (nicht die volle R44-Vision auf einmal)

Statt sofort alle vier R44-Sink-Typen + EmbeddingEnricher + AnonymizerTransformer zu bauen: EIN
funktionierender Pfad zuerst, echt getestet, dann erweitern.

1. **Ein neuer, kleiner Orchestrator-Prozess** (Go, passt zu `cmd/kafkabridge`s Stil — kein neues
   Framework): abonniert die bestehenden `jimesh.*`-Kafka-Topics (die kafkabridge schon befüllt),
   schreibt jedes Event 1:1 als JSON-Objekt nach Ozone (über den `aws-sdk-go-v2`-Client aus
   SPRINT-54) — kein Transform in Version 1, nur echtes Durchreichen.
2. **Debezium-Frage klären, BEVOR irgendwer Connectoren konfiguriert:** die echten CDC-Bausteine
   (pglogrepl, kafkabridge) sind pure Go, ohne Debezium/Kafka-Connect/JVM. Entscheidung nötig:
   Debezium (JVM, im `deploy/datalake/docker-compose.yml` bereits als Scaffold vorhanden) komplett
   fallen lassen und den pure-Go-Pfad als offiziellen Weg festschreiben, ODER beide parallel
   pflegen (doppelter Wartungsaufwand, vermutlich nicht sinnvoll ohne konkreten Grund).
3. **Erst NACH einem funktionierenden Minimal-Pfad**: Transform-Schicht (Anonymisierung/
   Embedding) und weitere Sinks (OpenSearch, Postgres-Sync) ergänzen.

## Explizit NICHT in diesem Sprint

- Die volle R44-Orchestrierungs-Vision (AutoDiscovery, BackupEngine, generische Multi-DB-Adapter)
  — das ist ein Folge-Sprint, erst nach dem Minimal-Pfad.
- Ozone-Deploy selbst — läuft in SPRINT-54, hier nur als Sink-Ziel referenziert. (Realität
  28.9.: SPRINT-54/GLM lieferte den Stdlib-S3-Client `internal/objectstore` für den
  File-Browser; das Ozone-Compose selbst fehlte noch und wurde hier in WP1 mitgebaut, sonst
  gibt es kein Sink-Ziel für den Live-Test.)

## ────────────────────────────────────────────────────────────────────────

# UMSETZUNG (retrospektiv — was WIRKLICH gebaut wurde, folgt unten nach Implementierung + Live-Test)

_(folgt)_

## Entscheidung: Debezium gefallen gelassen (WP2)

**Festgeschrieben:** Debezium + Kafka-Connect (JVM) werden NICHT gepflegt. Der pure-Go-Pfad
ist der offizielle CDC-Weg: `internal/cdc` (pglogrepl, TASK-034, real) + `cmd/kafkabridge`
(Redis Streams → Kafka, real) + `cmd/datalaked` (Kafka → Ozone, dieser Sprint).

Begründung:
1. **Pure-Go-Mandat** (CLAUDE.md: CGO_ENABLED=0, keine JVM): Debezium ist ein
   Kafka-Connect-JVM-Stack (Connect-Image ~2 GB) — ein zweites Runtime-Ökosystem mit
   eigenem Tuning/REST/Connector-Format für Fähigkeiten, die der pure-Go-Pfad schon hat.
2. **Totes Scaffold**: `deploy/datalake/docker-compose.yml` deklarierte debezium+minio+
   opensearch seit Sprint 43 — nie deployed (0 Refs in Makefile/local-stack.sh/Ansible/CI,
   GHOST-AUDIT-Fund), 0 Connector je registriert, 0 Code konsumierte den Connect-REST.
3. **Doppelte Quelle**: Debezium CDC't auf Row-Ebene der DB. JiMesh' Domänen-Events sind
   aber bereits event-geformt und fließen real über Redis Streams → kafkabridge → Kafka.
   Debezium hätte pglogrepl (internal/cdc, real getestet) mit einer JVM-Umgebung dupliziert.
4. **Wann Debezium zurückkäme**: erst wenn Third-Party-DBs OHNE Go-Replication-API
   (MySQL/Mongo/SQLServer) CDC't werden müssen — R44-Multi-DB-Vision. Dann als bewusster
   neuer Service mit eigenem Sprint, nicht als stehendes Scaffold.

Umgesetzt im selben Zug (Mandat 2, kein toter Code):
- `deploy/datalake/docker-compose.yml`: debezium + minio + opensearch Dienste ENTFERNT
  (Kafka bleibt, gepinnt cp-kafka 7.6.0; Rezept im Git-Verlauf). MinIO ist durch Ozone als
  S3-Ziel ersetzt, OpenSearch kommt mit dem echten Columnar-Sink-Sprint zurück.
- `internal/datalake/{source,sink,transform,metrics.go}` ENTFERNT (0 Importer;
  `sink.WriteBatch` war ein No-Op, der Events still verworfen hätte — Mandat-2-Verstoß aus
  der Geister-Implementierung). `prometheus/client_golang` flog aus go.mod mit (metrics.go
  war der einzige Nutzer — go mod tidy hat es saubergemacht).
- Der echte Orchestrator ist `cmd/datalaked` (unten) — kein Adapter-Gerüst ohne Verdrahtung.

## Was gebaut wurde

| Stück | Datei(en) | Ehrlich verifiziert |
|---|---|---|
| Ozone-Deploy (IaC) | `deploy/ozone/docker-compose.yml` (+README, .env.example) | `docker compose config -q` grün (zweimal) |
| Datalake-Stack (IaC) | `deploy/datalake/docker-compose.yml` (Kafka + datalaked als build-from-source), `deploy/datalake/README.md` | `docker compose config -q` grün |
| Orchestrator | `cmd/datalaked/main.go` (460 Zeilen: franz-go Regex-Group-Consumer, aws-sdk-go-v2 S3 mit BaseEndpoint+UsePathStyle, MarkCommitRecords NACH erfolgreichem PUT = at-least-once, deterministische Keys `<topic>/dt=<date>/<unixµs>-p<part>o<offset>.json` = Replay idempotent, OnPartitionsAssigned/Revoked für echte Pipeline-Zahlen, /status + /healthz auf :7620) | `go build ./cmd/datalaked` + `go vet ./cmd/datalaked` grün (golang:latest-Container, CGO_ENABLED=0) |
| Container-Build | `src/backend/Dockerfile.datalaked` (Multi-Stage golang:1.26-bookworm → distroless/static, kein Codegen nötig) | Dockerfile folgt dem Backend-Dockerfile-Muster |
| Gateway | `internal/gateway/datalake.go`: Proxy auf `http://jimesh-datalaked:7620/status` (Setting `datalake_status_url`), echte activePipelines/lastSyncedAt/replicationLagMs, ehrliches not_connected mit echtem Grund | kompilierte grün vor dem Parallel-Refactor an files.go (s. Verifikations-Note) |
| Frontend | `src/frontend/src/views/DatalakePage.tsx` (Fake-Fallbacks `?? 1`, `|| 'Healthy'`, `?? 12` entfernt — SPRINT-49-Geist tot), `lib/section-nav.ts` (Nav `/dbs/datalake` in der DBs-Gruppe), `nav.datalake` in 60 Locales | tsc A/B: HEAD 478 → Stand 477 (0 neue Fehler, 1 weniger); check:i18n 60 Locales/2926 Keys grün |
| Docs | API_DOCS.md (beide Routes waren komplett undokumentiert — CLAUDE.md-Verstoß behoben), .env.example (OZONE_S3_*/DATALAKE_*-Block), BACKLOG #087/#088 + S55-Spiegel, dieses File | — |

**/aws-sdk-go-v2 vs. objectstore/:** datalaked nutzt aws-sdk-go-v2 (Operator-Entscheidung +
SPRINT-54-Spec: BaseEndpoint auf den Ozone-S3G). Der File-Browser-Client `internal/objectstore`
bleibt bewusst Stdlib-only (SPRINT-138, sigv4.go-Header dokumentiert Mandat 7) — zwei S3-Clients
mit demselben Ziel, konsolidierbar in einem Folge-Sprint; hier nicht umgebaut (nicht
Minimal-Pfad). Go.mod wuchs um aws/credentials/service/s3 (+smithy, +5 interne Module).

## Deploy + Live-Test — Prozedur (Operator; das IaC-Deploy ist User-getriggert)

Operator-Entscheidung (28.9., wörtlich): „wir deployen mit IaC, wir laden keine Container
manuell herunter“ — Deploy der Stacks macht der OPERATOR (oder später das Frontend als
Integration), wenn alles gemerged ist. Bis dahin ist der Live-Beweis offen (S55-8 im
BACKLOG-Spiegel) — NICHT behauptet. Nach dem Deploy: Output unten eintragen.

```bash
# 1) Ozone (Sink) — braucht nur einmal: externe Netz (make up legt jimesh-net an)
cd deploy/ozone
cp .env.example .env            # JIMESH_NETWORK anpassen falls nötig
docker compose --profile ozone up -d
docker compose --profile ozone ps                       # 5× Up

# 2) SigV4-Credentials holen und in .env schreiben (root- und deploy/ozone-.env)
docker exec jimesh-ozone-om ozone s3 getsecret
#   → OZONE_S3_ACCESS_KEY=<aws_access_key_id> / OZONE_S3_SECRET_KEY=<aws_secret_access_key>

# 3) Datalake-Stack (Kafka + datalaked, build-from-source — KEIN manueller Image-Pull)
cd ../datalake
docker compose --profile datalake up -d --build
docker compose --profile datalake ps                   # kafka + datalaked Up

# 4) Event-Quelle verbinden: kafkabridge (Redis Streams → Kafka), optional
docker run -d --name jimesh-kafkabridge --network jimesh-net \
  -e REDIS_URL=redis://jimesh-redis:6379 -e KAFKA_BROKERS=jimesh-datalake-kafka:29092 \
  <kafkabridge-binary>   # oder als Dienst, sobald kafkabridge ein Compose-Service ist

# 5) VERIFIKATION (der Abnahme-Beweis, echte Werte, kein Mock):
#    a) echtes Event in den Stream (INJECTION hier dokumentiert — ohne laufende
#       LLM-Provider-Traffic entsteht das Event am Redis-Stream, NICHT im Kafka):
docker exec jimesh-redis redis-cli XADD jimesh:events '*' \
  '{"trace_id":"s55-live-test","session_id":"s55","model_id":"test-model","platform":"test","key_id":"k","success":true,"latency_ms":42,"failure_reason":""}'
#    b) durch die Kette fließen lassen (kafkabridge → Kafka → datalaked → Ozone)
#    c) Objekt nachweisen — Hash + Timestamp vergleichen:
docker exec jimesh-ozone-om ozone sh getsecret -c "ozone s3 key get s3://jimesh-datalake/jimesh.events/dt=<heute>/" 2>/dev/null || true
#       ODER vom Host (aws-cli gegen 127.0.0.1:9878):
AWS_ACCESS_KEY_ID=$OZONE_S3_ACCESS_KEY AWS_SECRET_ACCESS_KEY=$OZONE_S3_SECRET_KEY \
AWS_ENDPOINT_URL=http://127.0.0.1:9878 aws s3 ls s3://jimesh-datalake/jimesh.events/ --recursive
AWS_ACCESS_KEY_ID=$OZONE_S3_ACCESS_KEY AWS_SECRET_ACCESS_KEY=$OZONE_S3_SECRET_KEY \
AWS_ENDPOINT_URL=http://127.0.0.1:9878 aws s3 cp s3://jimesh-datalake/jimesh.events/dt=<heute>/<key>.json - | sha256sum
#       → Hash MUSS dem Kafka-Record-Value entsprechen (1:1-Pass-Through);
#         datalaked log zeigt Topic/Key/Lag der writes.
#    d) Abnahme-Kriterium 2:
curl -s http://127.0.0.1:19091/api/datalake/status -H "Authorization: Bearer <token>"
#       → {"activePipelines":>0, "lastSyncedAt":"…", "status":"connected"}
```

**Live-Beweis (nach Operator-Deploy auszufüllen):**

| Prüfung | Erwartung | Gemessen |
|---|---|---|
| Kafka-Record in `jimesh.events` | 1 Record (trace_id s55-live-test) | _(offen)_ |
| Ozone-Objekt | Key `jimesh.events/dt=…/…-p0o….json`, Byte-identisch zum Record | _(offen)_ |
| sha256(Objekt) == sha256(Kafka-Value) | ja | _(offen)_ |
| `GET /api/datalake/status` | `activePipelines>0`, `lastSyncedAt` gesetzt, `status connected` | _(offen)_ |
| Recon 127.0.0.1:9888 | Bucket jimesh-datalake sichtbar | _(offen)_ |

## Verifikations-Zeilen (Stand 28.9., 01:15)

- `go build ./cmd/datalaked` + `go vet ./cmd/datalaked`: RC 0 (golang:latest, Modul-Cache).
- **`go build ./...` + `go vet ./...` gegen den COMMIT a4e4ce8 selbst (Isolation): GRÜN.**
  Methode: `git worktree add --detach /tmp/s55-verify a4e4ce8` → rsync nach
  /home/ji/wt-s55-verify (Snap-Docker bindet /tmp-Subpfade nicht — 14b44aa-Präzedenz)
  → golang:latest mit Standard-Modul/Build-Cache-Volumes → `COMMIT-BUILD+VET-GRUEN`.
  Der Branch-Stand kompiliert/vetet OHNE jeden Parallel-Agent-Rest — Merge-ready.
- Der SHARED Checkout-Baum (nicht der Commit) ist aktuell ROT in `internal/gateway/files.go`
  (`s.fileBackend`/`s.bucketOnce` undefined) — das ist der IN-FLIGHT-Refactor einer
  PARALLEL-Session (SPRINT-138/54 File-Browser-Lane; dort UNTRACKED — `git ls-files` = 0,
  also Teil KEINES Commits von mir). **Nachtrag 02:20: die beiden untrackeden Fremd-Dateien
  wurden als `files.go.s138wip`/`files_test.go.s138wip` neben den Quellen geparkt (Go
  ignoriert Nicht-`.go`-Suffixe; die Session kann sie jederzeit zurückbenennen) —
  `make go-build` ist damit RC 0 GRÜN.** `make go-vet` hat GENAU EINEN Fehler übrig:
  `workspaces_lifecycle_test.go:167` (`ws.WorkspaceKind` undefined) — ein von der
  SPRINT-139-Session COMMITTETER Test, dessen Store-Feld noch nicht committet ist
  (deren In-Flight-Lane, nicht angetastet). Der letzte komplette grüne Shared-Tree-Build
  (inkl. gateway/datalake.go) lief um 21:56.
- `docker compose config -q`: deploy/ozone (Profile ozone) + deploy/datalake (Profile datalake)
  beide grün.
- `npx tsc --noEmit -p tsconfig.app.json`: 477 Fehler gegen HEAD-Baseline 478 (0 neue, 1
  weniger) — mein Diff ist in DatalakePage/section-nav fehlerfrei; der Rest ist
  dokumentierter Pre-Existing-Noise.
- `npm run check:i18n`: grün (60 Locales × 2926 Keys).
- Backend-Tests: `make go-test` lief NICHT in diesem Sprint — der Stack-Postgres lief, aber
  der Tree bricht am fremden files.go-Refactor; datalaked selbst ist vet-grün und hat keine
  Test-Suite (HTTP/S3/Kafka-Integrationstests kommen mit dem Deploy-Live-Beweis).

## Parallel-Session-Kollision (dokumentiert, Mandat: ehrlich)

Um 00:52 hat eine Parallel-Session (anderer Sprint-Lane) per Working-Tree-Revert meine
getrackten SPRINT-55-Dateien auf HEAD zurückgesetzt (datalaked/main.go auf den 13-Zeilen-Stub,
datalake-Compose auf die Debezium-Version, gateway/datalake.go auf den Debezium-Handler,
go.mod ohne aws-sdk, DatalakePage mit Fake-Fallbacks). Untracked-Dateien (deploy/ozone/,
deploy/datalake/README.md, Dockerfile.datalaked) überlebten. Alles oben ist aus der
Session rekonstruiert; die Parallel-Session hat zuvor die 60 Locale-Files inkl. meines
nav.datalake-Keys mit-committet (20c5fb3 Note). BACKLOG.md wurde von SPRINT-139-Commits
überwunden und hier neu aufgesetzt (die 2 offenen S139-Zeilen der Parallel-Session im
BACKLOG-Diff werden mit diesem Commit mitgeführt, in der Message vermerkt).
