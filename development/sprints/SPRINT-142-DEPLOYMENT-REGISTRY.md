# SPRINT-142 — Deployment-Registry: Deploys persistieren, Health nur für Reales

**Status:** 🔨 IN BAU (Agent I, 28.9. ~06:30). **Auslöser (Operator, verbatim):** "warum kann man
nicht alle auf einmal deployen und wieso haben wir keine health checks oder speichern wenn wir
sachen deployen also in der db oder sonstwo — dann müssen wir auch keine health checks laufen
lassen wenn da sowieso nix da ist."

## Diagnose (echter Fund, bestätigt)

- Jeder Deploy ist ein wegwerfender Ansible-Lauf — Zustand lebt nur im Terminal-Scrollback.
- Keine Tabelle sagt "trading hat Ozone 2.2.1, Suricata 7.0.3, Tetragon v1.7.1, Backend@<sha>,
  rc=0, deployt 06:15". Deshalb: Health-Checks ins Leere, Fake-Gefahr, "deployed aber
  nicht integriert" (Ozone-Fund von gestern).
- `config.yml services:` = Deploy-INTENTION (CLI), nie gemessener Zustand (Punkt 4 OPEN-ITEMS).

## Ziel-Modell

1. **Tabelle `node_services`** (store): node_name, service, git_sha, ansible_rc, status
   (deployed|failed|unknown), deployed_at, last_health_at, health (ok|degraded|down|unknown),
   last_error, source (cli|api). Migration idempotent (MANDATES §8).
2. **POST /api/node-services** — der CLI/Operator-Desktop meldet nach jedem `make redeploy`:
   {node, service, git_sha, rc, log_excerpt}. Auth: kind=service Consumer-Key aus .env
   (never printed). Honest: rc!=0 → status failed, kein Fake-Erfolg.
3. **GET /api/node-services?node=X** — Inventar pro Node (Dashboard-Fläche am Server-Detail,
   SSHTargetDetailPage) — ehrliches Leerbild, wenn nichts recorded ist.
4. **Health NUR für Recorded Services** (Operator-Argument): SSH-basierte Prüfroute für
   aufgezeichnete Services (docker ps/Service-spezifisch, Muster = W1-Suricata-Reader) —
   kein Record → kein Check → keine Fake-Grüns.
5. **CLI-Hook**: src/scripts/record-deploy.sh (oder Makefile-Wrapper) POSTet nach make redeploy.
6. **NICHT in Scope** (bleibt Architektur-Entscheidung Punkt 4): Dashboard-getriggerte Deploys
   (Ansible-Runner-Sidecar) — die Registry RECORDERT und PRÜFT, sie deployt nicht selbst.

## Workpackages

- WP1 [x] Store node_services — `src/backend/internal/store/node_services.go` (NEU): Tabelle
  (id, node_name, service, git_sha, ansible_rc NULL="nicht recorded", status, deployed_at,
  last_health_at, health, last_error, source, log_excerpt; UNIQUE(node_name, service) als
  CREATE UNIQUE INDEX), `migrateNodeServices(d)` idempotent (§8: CREATE IF NOT EXISTS +
  sentinel-gecetterte ALTER-Backfills) + LAZY `ensureNodeServicesTable` pro Methode
  (ensureConsumerKeyTables-Muster — die Oberfläche funktioniert auch, solange die eine
  store.go-Registrierungszeile auf den Eigentümer wartet; die exakte Zeile steht im
  Build-Report /home/ji/projects/ihc24/BUILD-2026-09-28-DEPLOY-REGISTRY.md).
  Upsert in-place (App-Identität, deployed_at = letzter Deploy), ListNodeServices (ehrliches []),
  GetNodeService (sql.ErrNoRows → 404), UpdateNodeServiceHealth (nur gemessene Werte).
- WP2 [x] Gateway `src/backend/internal/gateway/node_services.go` (NEU): POST
  /api/node-services (status ehrlich aus dem echten rc: 0→deployed, ≠0→failed, fehlt→unknown;
  source aus der Identität: Service-Key→cli, Admin-Session→api; 403 fail-closed ohne eines von
  beiden), GET ?node= (ehrliches []), POST /{id}/health-check (NUR recorded: 404 ohne Row,
  400 ohne auflösbaren SSH-Target — Query→Registry(name|host)→Settings-Kaskade wie
  suricata.go, 502 bei Dial/Probe-Fehler OHNE den gespeicherten Health anzufassen;
  EIN read-only Probe-Lauf: docker ps -a + systemctl is-active/is-enabled, Marker-Parser,
  jimesh-<service>-Konvention, exakt kein Substring-Match; ok/degraded/down/unknown-Mapping).
  gateway.go-Registrierungszeilen + die auth.go-Zeile für den Service-Key-Zweig: Build-Report.
- WP3 [x] CLI-Hook `src/scripts/record-deploy.sh` (NEU, chmod +x): POSTet
  {node, service, git_sha, rc} nach dem Ansible-Lauf; JIMESH_DEPLOY_RECORD_KEY aus env/.env
  (never printed), URL default `http://127.0.0.1:19091`; ohne Key: lauter Skip (exit 0),
  HTTP-Fail: exit 3, Makefile-Zeile toleriert mit || true — der Deploy-rc wird nie maskiert.
  Makefile-Integration als exakte Zeilen im Build-Report (Makefile nicht editiert).
- WP4 [x] Frontend: SSHTargetDetailPage-Sektion "Deployed services" — Query auf BEIDE
  realen Labels (config.yml-Name + Registry-Host, gemergt/dedupe nach id, wie die §8-Workspace-
  Logik), Status-Badge, Health-Dot+Label, deployed_at/last_health_at ("never" ohne Probe),
  git sha, Quelle; per-Row "Check health"-Button (POST …/health-check, refetch zeigt das
  GEMESSENE Ergebnis); ehrliches Leerbild + Backend-Fehler wörtlich.
- WP5 [x] API_DOCS-Abschnitt "Deployment Registry" (alle 3 Routen + Mint-Flow + Honest-States),
  Tests (siehe Verifikation), dieser Sprint; BACKLOG-Spiegel bleibt beim Parent (Agent I
  fasst BACKLOG.md nicht an).

## Verifikation (echt gelaufen, 28.9. ~06:25–06:35)

- `go build ./...` + `go vet ./...` im golang:latest-Container (Bind-Mount
  src/backend): beide leer/grün.
- `go test ./internal/store/ ./internal/gateway/ -run NodeService` gegen die
  Wegwerf-DB jimesh_test: 12/12 PASS (Store: Upsert-Identität, Scope-Isolation, ehrliches [],
  Health-Roundtrip, idempotenter 2. migrate-Lauf; Gateway: rc→Status, Namens-Gate +
  Injektions-Guard, Probe-Parsing über echte Marker-Shapes, Auth-Gate, 404/400/502,
  Messwert-Persistenz). Anmerkung: der volle `make go-test` scheitert aktuell an einer
  FREMDEN, uncommitted Datei (workspace_members_test.go einer Parallel-Session) — meine
  Tests liefen deshalb gegen eine Kopie des Backends ohne genau diese fremden Testdateien.
- record-deploy.sh: `bash -n` ok; Missing-Key-Pfad (laut, exit 0), Injection-Gate
  (exit 2), E2E gegen einen Stub-HTTP-Server (rc=2 als failed gemesst, JSON sauber, Key nie
  in stdout/stderr).
- Frontend: `npx vitest run src/views/SSHTargetDetailPage.test.tsx` → 4/4 PASS.
- `npx tsc --noEmit -p tsconfig.app.json`: 474 Fehler, 0 daraus aus meinen Dateien
  (Baseline vor diesem Sprint im lebenden Baum: 479 — Parallel-Agents haben gefixt; nichts
  verschlechtert).
- `npm run check:i18n`: PASS — 60 Locales, 3132 Keys; 19 neue sshTargetDetail.*-Keys
  echt in en+de übersetzt, 58 Locales via scripts/backfill-i18n.mjs (S55-Standard).
- Händischer Operator-Smoke-Test der Routen steht aus, bis der Parent die gateway.go-Zeilen
  angewendet hat (`make restart-backend`; dann `curl -X POST .../api/node-services` mit
  dem geminteten Service-Key).
