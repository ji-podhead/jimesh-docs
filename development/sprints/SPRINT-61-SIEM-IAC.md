# SPRINT-61 — SIEM-IaC: deploy/siem in das verbindliche make-redeploy-Muster

**Status:** ✅ GEBAUT (28.9.2026); Verifikation dieser Session siehe unten —
der Deploy selbst wurde BEWUSST NICHT ausgeführt (Auftrag: „Do NOT run the
deploy yourself"; der Operator führt `make redeploy SERVICE=siem NODE=trading`
aus, das Runbook dafür steht in deploy/siem/README.md).

**Auslöser (Operator, mehrfach):** „das scheiss SIEM geht" + „wäre auch nice
wenn das in den docs steht damit andere auch deployen können". Live-Befund
28.9. via SSH: auf trading existiert KEIN siem-Container — und deploy/siem war
der EINE Dienst ohne ansible-task.yml/defaults.yml, also der letzte Verstoß
gegen das binding IaC-Muster (Mandat aus SPRINT-44/54: jedes deploy/<service>/
wird über `make redeploy SERVICE=<name> NODE=<node>` dispatched, NIE raw
ansible-playbook).

## Plan (vor Code — Documentation Mandate)

**Ziel:** `make redeploy SERVICE=siem NODE=trading` bringt den kompletten SIEM-Stack
(Wazuh 4.14.7 manager/indexer/dashboard + Falco 0.41.3 + siem-bridge, opt-in
Profile „siem") auf den Node — idempotent, ehrlich beim Service-Key, LIVE-verifiziert
(Mandat 2), mit vollständigem Operator-Runbook in deploy/siem/README.md.

**Work Packages + Akzeptanz:**
- WP1: `deploy/siem/defaults.yml` + `ansible-task.yml` nach ozone/tetragon-Muster
  (staging → gen-certs idempotent → .env ohne Secrets → compose up → echte
  Verifikation: Indexer-Health-Endpoint, Manager/Dashboard-Healthchecks, Falco
  LIVE-Tripwire-Probe, Retention; fehlender JIMESH_SIEM_SERVICE_KEY = lautes
  Fail mit Mint-Runbook, NICHT still).
- WP2: docker-compose.yml — siem-bridge Source-Mount über
  `${JIMESH_SIEM_SRC_DIR:-../../src/backend}` konfigurierbar (der Ansible-Runner
  mounted nur deploy/, kann src/backend nie stagen; Checkout-Verhalten unverändert).
- WP3: README.md — kompletter Deploy-Runbook (IaC-Weg, Service-Key-Mint mit exact
  curl, Live-Verify, Retention, Teardown), damit „andere auch deployen können".
- WP4: Live-Sanity über SSH (read-only) an trading: Kernel/BTF, compose, jimesh-net
  mit jimesh-backend, Repo-Checkout mit siem-bridge-Quellen, Egress zu
  packages.wazuh.com, Gateway-/health via jimesh-net.

## Geliefert

- **WP1 [x]** `deploy/siem/defaults.yml` + `deploy/siem/ansible-task.yml`:
  - Staging (Whitelist, NIE die Controller-`.env` — Secret bleibt Operator-Step),
    PKI-Check über ALLE neun gemounteten Cert-Dateien (gen-certs.sh ist selbst
    idempotent, der Task-Check ist vollständig — ein Re-Run kann eine laufende
    PKI nie rotieren), Cert-Modes wie gen-certs.sh (0400/0640).
  - `.env`-Render via lineinfile (JIMESH_NETWORK, JIMESH_SIEM_INGEST_URL auf
    http://jimesh-backend:3010/api/sdk/logs — live-verifiziert am 28.9. auf
    trading via jimesh-net —, JIMESH_SIEM_SRC_DIR): bestehende Operator-Zeilen
    (sprich: der Service-Key) überleben jeden Redeploy.
  - Repo-Checkout auf dem Node = deploy/backend-Konvention (gleicher Pfad,
    gleiches Modul, force wie backend — Redeploys verwerfen lokale Checkout-
    Änderungen, dasselbe Risiko, das backend bereits trägt); hartes Fail mit
    Fix-Kommandos, wenn der Ref die siem-bridge-Quellen nicht hat.
  - **Service-Key — gewählte ehrliche Variante (dokumentiert in Task + README):**
    Der Task minted/shipt/liest den Key-Wert NIE (Mandat 9). Fehlt der Key:
    Core (Wazuh + Falco + Retention) geht hoch und wird verifiziert, der Bridge
    (exit 2, BY DESIGN — Attribution nie faken, internal/siem/bridge.go) wird
    gestoppt statt im Crash-Loop gelassen, und der Deploy FAILT LAUT mit dem
    exakten Mint-Runbook (POST /api/consumer-keys {"kind":"service",…} →
    `echo … | sudo tee -a <node>/.env` → re-run).
  - Verifikation ist NICHT mit „Container läuft" abgetan: Indexer-Endpoint
    (cluster_name), Manager (analysisd+apid-Healthcheck), Dashboard (Login-
    Answer 200/302/401), **Falco-LIVE-PROBE** (Throwaway-Container schreibt auf
    /etc/jimesh-demo — Baseline-Zählung verhindert, dass alte Probe-Events als
    Beweis herhalten; tetragon LIVE-KILL-PROBE-Präzedenz), Retention mit
    ehrlicher Fresh-Stack-Behandlung (keine wazuh-alerts-* Indices = Template
    deckt sie bei Erstellung ab, kein Fake-Attach), Bridge-Start-Marker +
    Key-Rejection = Hard-Fail, Ship-Failures = Warnung im Ergebnis.
- **WP2 [x]** `deploy/siem/docker-compose.yml`: siem-bridge-Mount
  `${JIMESH_SIEM_SRC_DIR:-../../src/backend}:/src` (+ Header-Notiz zum IaC-Weg).
  Checkout-Nutzung identisch (Default relativ), IaC setzt ihn auf den Node-Checkout.
- **WP3 [x]** `deploy/siem/README.md`: Quick start (IaC als primärer Weg +
  Checkout-Weg), „Deploy via IaC" (was der Task tut/nicht tut),
  „Service-Key" (exact Mint-curl als admin-gated Route, Node-`.env`-Write,
  Re-Deploy), Runbook: Deploy-Kommando, Live-Verify (Indexer-curl, Bridge-Logs,
  End-to-End-Tripwire, Rows-Check via /api/sdk/logs), Retention, Teardown.
- **WP4 [x]** Live-Sanity trading (read-only, BatchMode-SSH, IPs maskiert):
  Kernel 6.8.0-107-generic + BTF ✓ (falco modern_bpf), Docker Compose v5.1.3 ✓,
  jimesh-net vorhanden mit jimesh-backend ✓ (Bridge-Ingest-URL-Ziel real
  erreichbar: `{"status":"ok"}` via one-shot alpine wget über jimesh-net),
  KEINE siem-Container ✓, /opt/jimesh/{deploy,repo} ✓, Checkout b642993
  (28.9., 03:34 MESZ) ENTHÄLT src/backend/cmd/siem-bridge ✓,
  Egress packages.wazuh.com → HTTP/2 200 ✓, 299G Platte ✓.

## Verifikation dieser Session (ehrlich, Mandat 6)

- `python3 -c "import yaml; yaml.safe_load(open(f))"` für ALLE angefassten
  YAML (ansible-task.yml, defaults.yml, docker-compose.yml): PASS (Output im
  Build-Report). Zusätzlich `docker compose config` über die editierte
  Compose-Datei und ein ansible --syntax-check über den Task (Ergebnis im
  Build-Report — nichts davon wurde behauptet, was nicht lief).
- `npm run check:i18n` (src/frontend): PASS (kein Frontend-Touch).
- `npx tsc --noEmit -p tsconfig.app.json` (src/frontend): Baseline 477 nicht
  schlechter (kein Frontend-Touch — Zahlen im Build-Report).
- NICHT gelaufen (bewusst, per Auftrag): der Deploy selbst gegen trading; ergo
  ist „SIEM läuft auf trading" NICHT behauptet — erst `make redeploy
  SERVICE=siem NODE=trading` + die Live-Verify-Schritte aus dem README machen
  daraus eine verifizierte Aussage.
- API_DOCS.md: keine HTTP-Route angefasst — N/A.

## Bewusst offen / an den Parent (line-level, NICHT von diesem Agent editiert)

1. `deploy/ansible/playbooks/deploy-service.yml` — siem registriert sich durch
   Existenz (kein Code nötig); der übliche Registrierungs-Kommentar wäre an
   die ozone-Notiz (Zeilen ~53–62) anzuhängen — exakte Zeilen im Build-Report
   BUILD-2026-09-28-SIEM-IAC.md.
2. `docs/backlog/BACKLOG.md` — Sprint-Spiegel S61 (Block am Dateikopf, vor
   „## Sprint-Spiegel S59") — exakte Zeilen im Build-Report (der Parent
   appliziert sie mit dem Commit; die Datei steht im Concurrent-Agent-Fluss).
3. Der Deploy-Lauf selbst: Operator (`make redeploy SERVICE=siem NODE=trading`,
   dann ggf. Service-Key-Mint + Re-Run — beides steht Schritt für Schritt im
   README).
