# BUILD 28.9.2026 — SIEM-IaC: deploy/siem via make redeploy (SPRINT-61)

**Agent:** SIEM deployment build agent · **Repo:** /home/ji/projects/jimesh
· **Scope:** deploy/siem ONLY (+ 1 neues Sprint-File) · **Kein git commit**
(Standing Order — alles liegt uncommittet im Working Tree).

## 1. Task-Struktur (was gebaut wurde)

### 1.1 deploy/siem/ansible-task.yml (NEU, 598 Zeilen — das Kernstück)

Aufruf über `make redeploy SERVICE=siem NODE=trading` (dispatched über
deploy/ansible/playbooks/deploy-service.yml, generisches `-e service=siem`;
siem registriert sich allein durch Datei-Existenz — ozone-Präzedenz).
Task-Phasen, in Reihenfolge:

| # | Phase | Verhalten |
|---|---|---|
| 0 | Precheck | `docker compose version` — fehlt → Hard-Fail (ozone-Muster) |
| 1 | Staging | Whitelist-Copy (compose, gen-certs.sh, apply-retention.sh, config.yml, README) + rekursiver config/-Tree nach `<deploy_root>/deploy/siem/`. Die Controller-`.env` wird BEWUSST NIE gestaged (trägt den lokalen Service-Key) |
| 2 | PKI (idempotent) | gen-certs.sh ist selbst idempotent (4-File-Check), aber der Task prüft ALLE 9 von der Compose gemounteten Cert-Dateien via stat: alle da → Script GESKIPPT (ein Re-Run rotiert NIE eine laufende PKI); eine fehlt → gen-certs.sh läuft auf dem Node (Egress zu packages.wazuh.com, live geprüft: HTTP/2 200), Fehler → Hard-Fail inkl. Offline-Alternative. Cert-Modes wie vom Script (indexer 0400, Rest 0640) |
| 3 | .env-Render | lineinfile (nie copy!) für `JIMESH_NETWORK`, `JIMESH_SIEM_INGEST_URL`, `JIMESH_SIEM_SRC_DIR` — NUR Non-Secret-Zeilen; die Operator-Zeile `JIMESH_SIEM_SERVICE_KEY=…` überlebt jeden Redeploy unangetastet |
| 4 | Backend-Quelle | ansible.builtin.git auf `<deploy_root>/repo` (exakt die deploy/backend-Konvention: gleicher Pfad, gleiches Modul, force wie backend). Fehlen die siem-bridge-Quellen im Ref → Hard-Fail mit Fix-Kommandos |
| 5 | Key-Detection | `grep -qE '^JIMESH_SIEM_SERVICE_KEY=.+'` → present/missing. Der Wert wird NIE gelesen/gedruckt (Mandat 9). Fehlt er → Heads-up-Debug BEVOR deployed wird |
| 6 | Images + Up | `docker compose --profile siem pull` (Pull-Fehler = eigener Hard-Fail mit Egress-/docker-save-Hinweis) → `up -d` (changed_when wie ozone) |
| 7 | LIVE-Verifikation | Indexer: `curl -fsk https://127.0.0.1:19200/` bis cluster_name (Budget 60×10s). Manager: `docker inspect .State.Health.Status` == healthy (48×15s; Compose-Healthcheck assertet analysisd+apid). Dashboard: dito (48×15s). Falco: Running-Hard-Fail + **LIVE-TRIPWIRE-PROBE**: `docker run --rm --name jimesh-framework-demo-1 golang:latest sh -c "echo x >> /etc/jimesh-demo"` — das Event MUSS in der geteilten Events-Volume landen (Baseline-Zählung vorher: alte Probe-Events gelten nicht als Beweis dieser Runde; tetragon-LIVE-KILL-PROBE-Präzedenz). Kein Event → Hard-Fail |
| 8 | Retention | `bash apply-retention.sh` mit PASSWORD aus defaults (idempotenter ISM-PUT + attach). Fehlschlag + Indices existieren → Hard-Fail; Fehlschlag + frischer Indexer (noch keine wazuh-alerts-*) → ehrliche Debug-Note (Policy + ism_template decken die Zukunft ab), kein Fake-Attach |
| 9 | Bridge (Key-fallweise) | **Key fehlt:** Core läuft verifiziert weiter; Bridge (exit 2, by design) wird per `compose stop` ruhiggestellt statt Crash-Loop; dann Hard-Fail mit dem KOMPLETTEN Mint-Runbook (§2). **Key da:** warten auf Log-Marker `[siem] bridge starting:` (36×5s; erscheint erst NACH Key-Validierung) → Hard-Fail wenn nie; `rejected the service key` im Log → Hard-Fail; `ship failed` → WARNUNG im Abschluss |
| 10 | Abschluss | `docker compose --profile siem ps` + ehrliches Debug-Ergebnis: was real verifiziert wurde, was Operator-Steps bleiben |

### 1.2 deploy/siem/defaults.yml (NEU, 105 Zeilen)

Staging-Pfad (`{{ jimesh_deploy_root }}/deploy/siem`), Repo-Checkout
(`{{ jimesh_deploy_root }}/repo` + git repo/ref wie backend), Ingest-URL
`http://jimesh-backend:3010/api/sdk/logs` (live verifiziert, s. §4),
Indexer-Passwort (= Upstream-Demo-Default; überschreibbar via
overrides.local.yml, dokumentiert), Container-Liste, die 9 PKI-Dateien,
Warte-Budgets (First-Boot: ~5 GB Image-Pull + JVM), siem_probe_image:
golang:latest (der siem-Stack selbst pullt golang für die Bridge — das
Probe-Image ist IMMER lokal, kein Extra-Egress).

### 1.3 deploy/siem/docker-compose.yml (EDIT, 2 Stellen)

- siem-bridge Source-Mount: `- ${JIMESH_SIEM_SRC_DIR:-../../src/backend}:/src`
  statt hartkodiertem `../../src/backend:/src`. Grund: der Ansible-Runner
  mountet NUR deploy/ (Makefile: `-v $(CURDIR)/deploy:/ansible/deploy:ro`) —
  er kann src/backend prinzipiell nie stagen; der Node-Checkout muss her.
  Checkout-Verhalten unverändert (Default bleibt relativ), live geprüft via
  `docker compose config`: Default löst zu <repo>/src/backend auf, gesetzte
  Var zu /opt/jimesh/repo/src/backend.
- Header-Kommentar: Prerequisites + IaC-Weg dokumentiert.

### 1.4 deploy/siem/README.md (EDIT — Operator-Runbook, „damit andere auch deployen können")

- Quick start: IaC als primärer Weg (make redeploy), Checkout-Weg bleibt.
- NEU „Deploy via IaC": nummerierte Phasen + Render-Tabelle + ehrliche
  Nicht-Ziele des Tasks.
- NEU „Service-Key": der EINE Operator-Präzedenzschritt mit exact curl (s. §2),
  Node-.env-Write, Re-Deploy.
- NEU Runbook: Deploy-Kommando; Live-Verify (Indexer-curl mit jq, ps,
  Bridge-Logs, End-to-End-Tripwire, Rows-Check über /api/sdk/logs);
  Retention (inkl. Fresh-Stack-Erklärung); Teardown (unverändert).

### 1.5 docs/sprints/SPRINT-61-SIEM-IAC.md (NEU, 111 Zeilen)

Plan (vor Code) + WP-Liste + geliefert-Status + Ehrlichkeits-Sektion
(was verifiziert wurde / was bewusst NICHT lief) + offene Parent-Items.

## 2. Der JIMESH_SIEM_SERVICE_KEY-Mint-Runbook (exakt, wie er auch im Task-Fail und README steht)

```bash
# 1) Key minten — als authentifizierter JiMesh-Admin (Route ist admin-gated,
#    policy.IsAdminMutation; Dashboard "Consumer Keys" oder der eigene
#    authentifizierte curl; API-Basis = dort, wo du JiMesh erreichst):
curl -s -X POST http://127.0.0.1:19091/api/consumer-keys \
  -H 'Content-Type: application/json' \
  -d '{"kind":"service","name":"siem-bridge","projectId":"<projId>","workspaceId":"<wsId>"}'
# → {"key":"jimesh-ck-…","consumerKey":{…}}   (Plaintext GENAU EINMAL!)
# workspaceId = der Workspace, dem SIEM-Rows zugeordnet werden — der Key IST
# die serverseitige Attribution; der Bridge schreibt nie selbst Postgres.

# 2) Key auf den Node schreiben (root, eine Zeile; überlebt jeden Redeploy,
#    weil der Task via lineinfile nur Non-Secret-Zeilen rendert):
echo 'JIMESH_SIEM_SERVICE_KEY=<der gemintete jimesh-ck-…>' \
  | sudo -n tee -a /opt/jimesh/deploy/siem/.env

# 3) Deploy (vom Controller, aus dem Repo-Root):
make redeploy SERVICE=siem NODE=trading
```

Ehrlichkeits-Variante (gewählt + in Task/README/Sprint dokumentiert): ohne
Key deployed der Task den Core und verifiziert ihn LIVE, stoppt den Bridge
(kein Crash-Loop), und schlägt als GANZES fehl — mit dem Runbook oben im
Fehler-Text. Er minted/shipt/liest den Key-Wert nie selbst (Mandat 9).

## 3. Was der Deploy tut / nicht tut

**Tut:** Staging (ohne Controller-.env) → PKI (nur wenn unvollständig) →
.env ohne Secrets → Node-Repo-Checkout sicherstellen → pull/up → LIVE-Verify
(Indexer-Endpoint, Manager-/Dashboard-Healthchecks, Falco-Detektions-Beweis,
Retention) → ehrliches Abschluss-Debug mit compose-ps-Output. Idempotent in
jedem Schritt.

**Tut nicht (Operator-Steps):** Service-Key minten+schreiben; Upstream-Demo-
Passwörter rotieren (dokumentiert via WAZUH_* im Node-.env +
siem_indexer_password in overrides.local.yml); den JiMesh-Haupt-Stack
deployen, an den der Bridge posted (muss bereits auf jimesh-net laufen);
der Rows-End-to-End-Check im Dashboard (Befehle im README); Suricata (bleibt
der dokumentierte v2-Platzhalter — Mandat 2).

## 4. Live-Fakten (SSH read-only, 28.9., IPs maskiert)

- trading: Kernel 6.8.0-107-generic, /sys/kernel/btf/vmlinux da (falco
  modern_bpf ok), Docker Compose v5.1.3, 299G frei.
- KEINE siem/falco/wazuh-Container auf trading (Bestätigung des Befunds).
- jimesh-net existiert, jimesh-backend ist Mitglied; Gateway live geprüft:
  `{"status":"ok"}` via one-shot alpine wget `http://jimesh-backend:3010/health`
  über jimesh-net → die gerenderte Ingest-URL ist real erreichbar.
- /opt/jimesh/{deploy,repo} existieren; Repo-Checkout b642993 (28.9. 03:34)
  ENTHÄLT src/backend/cmd/siem-bridge → der Bridge-Build des IaC-Deploy wird
  funktionieren.
- Egress: packages.wazuh.com → HTTP/2 200 (gen-certs.sh-Fallback nutzbar);
  docker.io-Pulls laufen ohnehin (ozone wurde 28.9. dort gezogen).

## 5. Verifikation (ehrlich — live in dieser Session gelaufen)

| Check | Ergebnis |
|---|---|
| `python3 yaml.safe_load` auf ALLEN angefassten YAML (ansible-task.yml, defaults.yml, docker-compose.yml) | PASS (3×; final erneut nach letzter Änderung) |
| `docker compose --profile siem config --quiet` auf der editierten Compose (Service-Key env vorher auf `redacted-for-config-check` gesetzt — niemals gedruckt) | VALID; Mount-Interpolation beide Richtungen geprüft (Default → <repo>/src/backend; IaC → /opt/jimesh/repo/src/backend) |
| ansible `--syntax-check` über die NEUE ansible-task.yml (via jimesh-ansible-runner:local, Wrapper mit statischem import_tasks nach include_vars defaults.yml) | exit 0, 0 ERRORs |
| Negative Kontrollen desselben Checks (unbekanntes Modul / kaputtes Import-Ziel) | schlagen laut fehl → der PASS ist belastbar |
| `npm run check:i18n` (src/frontend) | PASS — 60 Locales, 3058 Keys |
| `npx tsc --noEmit -p tsconfig.app.json` (src/frontend), `grep -c 'error TS'` | 474 (Baseline 477 → NICHT schlechter; kein Frontend-File angefasst — die Differenz stammt nicht aus diesem Task) |
| Geänderte Dateien via `git status --porcelain` (read-only) | s. §6 |

**NICHT gelaufen (bewusst, per Auftrag „Do NOT run the deploy yourself"):**
der Deploy selbst gegen trading. Ergo wird nirgends behauptet, das SIEM
LAUFE auf trading — das stellt erst der Operator-Run (§7) her, und der Task
verifiziert dann jeden Teil selbst (oder schlägt laut fehl).

## 6. Geänderte Dateien (Working Tree, uncommittet — Parent committet)

| Datei | Aktion |
|---|---|
| deploy/siem/ansible-task.yml | NEU |
| deploy/siem/defaults.yml | NEU |
| deploy/siem/docker-compose.yml | EDIT (siem-bridge-Mount env-konfigurierbar; Header-Kommentar) |
| deploy/siem/README.md | EDIT (Quick start, „Deploy via IaC", „Service-Key", Runbook erweitert) |
| docs/sprints/SPRINT-61-SIEM-IAC.md | NEU (Sprint-Doku, Documentation Mandate) |

## 7. Exakte Operator-Kommandos

```bash
# (Einmalig, falls der Bridge Rows liefern soll — Key-Mint s. §2, dann:)
cd /home/ji/projects/jimesh
make redeploy SERVICE=siem NODE=trading

# Live-Verify danach (auf dem Node bzw. README „Live-verify"):
ssh <user>@trading 'cd /opt/jimesh/deploy/siem && docker compose --profile siem ps'
# …und die Schritte aus deploy/siem/README.md „Live-verify"
# (Indexer-curl, Bridge-Logs, End-to-End-Tripwire, Rows-Check).
```

Erwartungshaltung ehrlich: erster Lauf = ~10–30 min (Image-Pulls + JVM-Boot +
Verifikations-Budgets); fehlt der Key, endet der Lauf wie designed im
beschriebenen LAUTEN Fail — Core läuft dann trotzdem verifiziert.

## 8. Line-level-Änderungen für den Parent (nicht von diesem Agent ausgeführt — Shared-File-Standing-Order)

**(a) deploy/ansible/playbooks/deploy-service.yml** — Registrierungs-Kommentar
nach der ozone-Notiz (nach Zeile 62, direkt vor dem
`# deploy/suricata-network-ids …`-Kommentar) einfügen:

    #
    # siem (SPRINT-61, 28.9.2026): same registration-by-existence — deploy/siem/
    # {ansible-task.yml,defaults.yml} close the last IaC gap (the SIEM stack was
    # the one remaining service not dispatchable via make redeploy). NOT added to
    # jimesh_no_docker_services: it stages a real docker-compose.yml and drives
    # it via `docker compose --profile siem up -d` — the jimesh-net check/create
    # pretask above is REQUIRED for it (the compose network is external, the
    # bridge reaches the main-stack gateway as http://jimesh-backend:3010 over
    # it). Run with: make redeploy SERVICE=siem NODE=<name> (live-facts + honest
    # key handling: see docs/sprints/SPRINT-61-SIEM-IAC.md and deploy/siem/README.md).

**(b) docs/backlog/BACKLOG.md** — Sprint-Spiegel als NEUEN Abschnitt am
Datei-Kopf einfügen (vor der Zeile `## Sprint-Spiegel S59 (…)`):

    ## Sprint-Spiegel S61 (SIEM-IaC: deploy/siem via make redeploy; 28.9.2026 — docs/sprints/SPRINT-61-SIEM-IAC.md)

    | Nr | Task | Status |
    |---|---|---|
    | S61-1 | deploy/siem/{ansible-task.yml,defaults.yml} — Staging (Whitelist ohne Controller-.env), idempotente PKI (9-File-Check, kein Rotieren), .env-Render ohne Secrets (lineinfile, Key überlebt), Node-Repo-Checkout (backend-Konvention) | [x] erledigt |
    | S61-2 | LIVE-Verifikation im Task: Indexer-Endpoint, Manager/Dashboard-Healthchecks, Falco-Tripwire-Beweis (Baseline-gezählt), Retention (Fresh-Stack ehrlich), Bridge-Marker + Key-Rejection = Hard-Fail | [x] erledigt |
    | S61-3 | Service-Key-Missing ehrlich: Core deployt+verifiziert, Bridge gestoppt, LAUTES Fail mit Mint-Runbook (Task minted/liest den Key nie — Mandat 9) | [x] erledigt |
    | S61-4 | docker-compose.yml: siem-bridge-Source-Mount `${JIMESH_SIEM_SRC_DIR:-../../src/backend}` (Runner mountet nur deploy/); compose config live validiert | [x] erledigt |
    | S61-5 | README-Operator-Runbook (IaC-Weg, Service-Key-curl, Live-Verify, Retention) + Sprint-File S61 | [x] erledigt |
    | S61-6 | Deploy gegen trading AUSFÜHREN (Operator: make redeploy SERVICE=siem NODE=trading) | [ ] offen |
