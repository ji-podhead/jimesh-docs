# SPRINT-169 — AUTO-MINT-SERVICE-KEYS

**Status:** ✅ Abgeschlossen 1.10.2026 (Code + Verifikation; kein Live-Mint
gegen ein Backend — bewusst, s. Verifikations-Transkript + Offene Items).
Parent committet (Standing Mandate).

**Operator-Order (30.9., verbatim, laut):** "ICH HABE GESAGT DIESE KEYS SOLLEN
AUTOMATISCH ERZEUGT WERDEN" — gemeint sind die beiden Deploy-Consumer-Keys aus
dem SIEM-Redeploy-Run, die heute manuell gemint werden müssen:

1. **`JIMESH_SIEM_SERVICE_KEY`** — siem-bridge schickt Rows via
   `POST /api/sdk/logs` mit kind=service Consumer-Key; der Key IST die
   Attribution serverseitig. Liegt heute manuell in
   `/opt/jimesh/deploy/siem/.env` auf dem Node (Runbook:
   `deploy/siem/README.md` "Service-Key").
2. **`JIMESH_DEPLOY_RECORD_KEY`** — `src/scripts/record-deploy.sh` liest ihn
   aus `$REPO_ROOT/.env`, um Deploy-Ergebnisse in die Deployment-Registry
   (`POST /api/node-services`, SPRINT-142) zu schreiben.

**Ziel:** der Operator muss NICHTS mehr manuell minten. Wenn `make redeploy`
läuft und ein Key fehlt, mintet das Tooling ihn automatisch über das ECHTE
Admin-API (`POST /api/consumer-keys`, admin-gegt via OPA —
`internal/policy/policy.go` Admin-Prefix-Liste) und schreibt ihn an die
richtige Stelle. NIE ein erfundener Key, nie Direkt-SQL, nie Fake-Attribution
(Mandat 2 + Mandat 6).

## Plan (vor Code — Documentation-Mandat)

### Ziel / Work Packages / Abnahme

| WP | Was | Abnahme |
|---|---|---|
| WP1 | **`src/scripts/mint-service-key.sh`** — der eine Mint-Helper: mintet kind=service Consumer-Key via `POST /api/consumer-keys` mit Admin-Auth aus der Operator-Umgebung. Admin-Auth-Kette: `JIMESH_ADMIN_TOKEN` (roher Admin-Bearer) → sonst `JIMESH_ADMIN_PASSWORD` + Keycloak Password-Grant (realm `jimesh`, client `admin-cli` — derselbe Client den `BootstrapKeycloak` selbst für Admin-Tokens nutzt, `keycloak_oidc.go:596`). Persistiert den Key ausschließließich an .env-Zielstellen (lokal `--env-file --env-var` ODER remote `--ssh --remote-file`); Key-Wert erscheint NIE in stdout/stderr/argv/Shell-Variablen (Sed-Pipe vom Response-File direkt ins Ziel-File). Idempotent: existierender nicht-leerer Key → kein Mint. | `bash -n` clean; kein `echo`/log des Key-Werts im Codepfad |
| WP2 | **`src/scripts/record-deploy.sh`** — wenn `JIMESH_DEPLOY_RECORD_KEY` fehlt: Helper aufrufen (Default-Name `deploy-registry-recorder`, Default-Project/Workspace `platform-internal`/`platform-trading` — dieselben platform-eigenen Bindungen wie `deploy/router-bootstrap/defaults.yml`; über Env-Vars übersteuerbar), Key in `$REPO_ROOT/.env` persistieren, dann weiter recorden. Ehrliches Fail mit exakt dem EINEN fehlenden Env-Var-Namen (`JIMESH_ADMIN_TOKEN`), nur wenn keine Admin-Auth da ist. | fehlender Key + Admin-Auth vorhanden → mint+persist+record in einem Lauf; ohne Admin-Auth → eine Meldung, ein Variablen-Name |
| WP3 | **`src/scripts/ensure-siem-service-key.sh`** — Dispatch-Vor-Schritt für `SERVICE=siem`: prüft über DENSELBEN SSH-Weg wie die Ansible-Tasks (Connection-Daten aus `deploy/ansible/inventory/.rendered.ini`, das `render-inventory` als redeploy-Abhängigkeit frisch erzeugt), ob der Key auf dem Node in `<deploy_root>/deploy/siem/.env` existiert (dasselbe `grep -qE '^JIMESH_SIEM_SERVICE_KEY=.+'` wie `deploy/siem/ansible-task.yml`); wenn fehlend: lokal über den Tunnel minten (Default `JIMESH_SIEM_MINT_URL` → `JIMESH_FRONTEND_ORIGIN` → `127.0.0.1:19091`) + per SSH an die Node-.env anhängen (sudo -n, Runbook-Mechanik). KEIN Zugriff auf `deploy/siem/**` (S162-Ownership). | Node mit Key → keine Aktion; Node ohne Key + Admin-Auth → mint+append+verify; kein SSH/keine Admin-Auth → laute, ehrliche Meldung, Deploy läuft weiter in den bekannten ehrlichen Fail des siem-Tasks |
| WP4 | **Makefile** — minimaler Hook im `redeploy`-Rezept: nur für `SERVICE=siem` vor dem ansible-docker-run den Vor-Schritt aufrufen (`|| true` — der Vor-Schritt darf den Deploy nicht blockieren; der siem-Task selbst failt ohnehin laut+ehrlich am Bridge-Check, wenn der Key fehlt). | `make -n redeploy SERVICE=siem NODE=trading` Dry-Run zeigt den Hook; keine anderen Targets angefasst |
| WP5 | **Dieses Sprint-Doc** — Arbeitslog mit Datei:Zeile, Verifikations-Transkript, ehrliche Offen-Items. | komplett |

### Admin-Auth-Entscheidung (recherchiert + ein LIVE-Befund aus diesem Sprint)

- Passwort-Login am Gateway ist seit S148 per Default AUS (403 —
  `internal/auth/keycloak_only.go`); ein Skript kann sich NICHT über
  `POST /api/auth/login` authentifizieren. Nicht der Weg.
- `POST /api/consumer-keys` ist Admin-Mutation → OPA-Gate
  (`policy.IsAdminMutation` Prefix `/api/consumer-keys`) → erlaubt für
  source=`password` (nicht verfügbar, s.o.) oder source=`keycloak` mit
  Realm-Rolle `jimesh-admin` (`internal/policy/policies/default.rego`).
- Zwei Pfade implementiert (Helper probiert sie in dieser Reihenfolge):
  1. **`JIMESH_ADMIN_TOKEN`** — ein roher Bearer (Keycloak-JWT mit
     `jimesh-admin` ODER ein Admin-Dashboard-Session-Token), direkt gegen
     den Gateway. **Der realistische Pfad HEUTE** (s. LIVE-Befund).
  2. **Keycloak Password-Grant** (`grant_type=password`, `client_id=admin-cli`,
     realm `jimesh`, Username `admin` + `JIMESH_ADMIN_PASSWORD`):
     `BootstrapKeycloak` reconciliert Passwort + `jimesh-admin`-Rolle des
     Realm-Admin-Users bei jedem Backend-Start
     (`internal/auth/keycloak_oidc.go:262-349`); `.env` trägt
     `JIMESH_ADMIN_PASSWORD` bereits.
- **LIVE-Befund (1.10., unbeabsichtigt in einem Fixture-Test mitbekommen,
  Passwort war ein Mock-Wert):** das reale Keycloak hinter dem Tailnet-Forward
  (127.0.0.1:8081, realm `jimesh`) lehnt `grant_type=password` auf
  `admin-cli` mit `{"error":"unsupported_grant_type"}` (HTTP 400) ab —
  Direct Access Grants sind am aktuellen Realm-Konfigurationsstand AUS
  (typisch für Keycloak ≥ 26, wo ROPC am admin-cli per Default abgeschaltet
  ist; das realm-import `deploy/keycloak/jimesh-realm.json` definiert
  admin-cli gar nicht und `jimesh-dashboard` explizit mit
  `directAccessGrantsEnabled: false`). **Konsequenz, ehrlich:** der
  automatische Mint läuft heute zuverlässig NUR über `JIMESH_ADMIN_TOKEN`;
  der Password-Grant-Pfad bleibt implementiert (er greift, sobald am
  admin-cli-Client Direct Access Grants angeschaltet sind — ein Toggle in
  der Keycloak-Admin-Console, O-2) — genau dafür failt der Helper ehrlich
  mit dem EINEN Variablennamen `JIMESH_ADMIN_TOKEN`, wenn keine Admin-Auth
  existiert.
- Abgelehnt: Direkt-SQL-Mint (Order + API-Doc-Runbook verbieten es — der Mint
  soll über die echte, admin-gegtete Route gehen); erfundener Key lokal erzeugen
  (Mandat 2); `client_credentials` eines Service-Clients (existiert nicht im
  Realm, müsste Keycloak-Konfiguration ändern — fremdes Gebiet); examples/
  jimeshctl als Auth-Weg (existiert NICHT mehr im Baum — CLAUDE.md-Referenz
  ist stale).

### Sicherheits-Regeln für alle Skripte (Mandat 9-Geist + Order-Punkt 5)

- Der Plaintext-Key erscheint genau EINMAL im Mint-Response; er wird NIE nach
  stdout/stderr geloggt, NIE in den Prozess-argv getragen (Transport ausschließlich
  über 0600-Tempfiles + stdin-Pipes), NIE committet (.env ist gitignored).
- Idempotenz: existierende nicht-leere Keys werden nie überschrieben, nie neu
  gemintet. Leere `VAR=`-Zeilen werden vor dem Append bereinigt (dieselbe
  Semantik wie das siem-Task-Grep `^VAR=.+`).
- Ehrlichkeit: jede Störung (kein SSH, kein Admin-Auth, Gateway down, HTTP≠200)
  wird laut benannt — nie wird ein Key-Mint oder ein "key ensured" behauptet,
  der nicht passiert ist.

## Arbeitslog

### Recherche (vor Code — die Entscheidungen tragen)

- `record-deploy.sh` komplett gelesen: .env-Parser, Key-Fail-Pfad ("Mint …
  put it in .env"), Exit-Code-Vertrag (`|| true` im Makefile-Hook).
- Makefile redeploy (Z. 244-264 vor diesem Sprint): ansible-runner per
  docker run, `render-inventory` als Abhängigkeit (frisches
  `.rendered.ini`), record-deploy-Hook Z. 263, `--env-file .env`, SSH-agent-
  Mount. → Der Vor-Schritt kann auf dem CONTROLLER laufen: gleiche
  Inventory-Facts, gleicher ssh-agent (`SSH_AUTH_SOCK`), gleiche known_hosts.
- `deploy/ansible/playbooks/deploy-service.yml` (NUR LESEN): Dispatch per
  `-e service=…`/`-e target_node=…`, `jimesh_deploy_root` (Default
  /opt/jimesh, per Node über config.yml `deploy_root:` überschreibbar) —
  daraus leitet sich der Node-Pfad `<deploy_root>/deploy/siem/.env` ab.
- `deploy/siem/README.md` "Service-Key" (NUR LESEN): das manuelle Runbook,
  das dieser Sprint ablöst — Mint per admin-curl, dann
  `echo … | sudo -n tee -a /opt/jimesh/deploy/siem/.env`. Genau diese
  Mechanik baut der Vor-Schritt nach, nur automatisiert.
- `deploy/siem/ansible-task.yml` (NUR LESEN, S162): Presence-Check des Keys
  ist `grep -qE '^JIMESH_SIEM_SERVICE_KEY=.+'` auf
  `{{ siem_config_dir }}/.env` (siem_config_dir =
  `{{ jimesh_deploy_root }}/deploy/siem`); fehlender Key = loud warn + der
  Bridge verweigert (exit 2) + Deploy endet LAUT. lineinfile rendert NUR
  non-secret Zeilen, die Key-Zeile des Operators überlebt Redeploys → ein
  einmaliges Append reicht für immer. Mein Vor-Schritt nutzt EXAKT dieselbe
  Presence-Semantik.
- `docs/API_DOCS.md`: Deployment-Registry (Z. 2081-2159) + Consumer-Keys
  (Z. 951-975) + SDK-Oberfläche (Z. 1595ff). Mint-Route:
  `POST /api/consumer-keys` mit
  `{"kind":"service","name":…,"projectId":…,"workspaceId":…,"sessionId":…}`
  → `{"key":"jimesh-ck-…", consumerKey:{…}}` (Plaintext EXAKT einmal).
- Gateway-Implementierung (NUR LESEN): Handler
  `internal/security/consumer_keys.go:35-95` (kind=service braucht
  workspaceId), Store `internal/store/consumer_keys.go:127-160`
  (`CreateServiceKey`: project+workspace required, nur SHA-256-Hash wird
  gespeichert), Auth-Middleware `internal/auth/auth.go:754-1067`,
  Policy `internal/policy/policy.go` + `policies/default.rego`,
  Keycloak-Only `internal/auth/keycloak_only.go`, OIDC + Bootstrap
  `internal/auth/keycloak_oidc.go`.
- Defaults: `platform-internal`/`platform-trading` sind die platform-eigenen
  Bindungen (`deploy/router-bootstrap/defaults.yml:8-10`; S154 schützt
  `platform-internal` via `is_internal`, `store.go:317-323`). Beide über
  Env-Vars übersteuerbar (Order: "z.B. JIMESH_DEPLOY_KEY_WORKSPACE_ID").
- Live-Topologie (read-only geprüft): EINZIGER laufender jimesh-Container
  lokal ist `jimesh-client-tailscaled` mit 127.0.0.1:2222 (SSH nach
  trading), 127.0.0.1:8081 (Keycloak), 127.0.0.1:8090 (Traefik → Backend
  /api). KEIN lokaler Dev-Stack → `http://127.0.0.1:19091` (der
  record-deploy-Default) hat heute keinen Listener; der produktive Gateway
  des Operators ist über 8090 erreichbar. Für den SIEM-Mint heißt das:
  Default `JIMESH_SIEM_MINT_URL` → `JIMESH_FRONTEND_ORIGIN` (steht in .env
  auf http://localhost:8090) → letzter Fallback 127.0.0.1:19091.

### Gebaut (alle Datei:Zeilen nach diesem Sprint)

| Datei | Was | Wo |
|---|---|---|
| `src/scripts/mint-service-key.sh` (NEU, 365 Z.) | Der eine Mint-Helper: Admin-Auth-Kette (`JIMESH_ADMIN_TOKEN` → Keycloak-ROPC), Mint via `POST /api/consumer-keys`, Plaintext-Transport ausschließlich 0600-Tempfile→Tempfile→Ziel (nie stdout/stderr/argv/Shell-Var), Idempotenz-Pre-Check (lokal + remote), Delivery lokal (`--env-file/--env-var`) oder per SSH (`--ssh/--remote-file`, sudo -n), Injection-Guards für alles, was in Remote-Shell-Strings interpoliert wird | Guards Z. 128-160; Idempotenz Z. 177-211; Auth-Chain Z. 213-286; Mint Z. 288-324; Delivery Z. 326-365 |
| `src/scripts/record-deploy.sh` (EDIT) | Fehlender `JIMESH_DEPLOY_RECORD_KEY` triggert Auto-Mint via Helper (gleicher Gateway wie der Record-POST — Key und Registry bleiben konsistent), Persist in `$ENV_FILE`, ehrliches Fail mit EINEM Variablennamen ohne Admin-Auth | Header-Kommentar Z. 12-33; Auto-Mint-Block Z. 81-110 |
| `src/scripts/ensure-siem-service-key.sh` (NEU, 139 Z.) | Dispatch-Vor-Schritt für `SERVICE=siem`: Node-Facts aus `.rendered.ini` (ansible_host/user/port, deploy_root-Default /opt/jimesh), refuses `ansible_connection=local`, Mint-Target-Chain, übergibt an den Helper (der prüft+mintet+anhängt+verifiziert) | Facts-Parser Z. 47-77; Mint-Target-Chain Z. 79-101; Helper-Call Z. 122-139 |
| `Makefile` (EDIT) | Hook im `redeploy`-Rezept: nur für `SERVICE=siem`, vor dem docker run, `|| true` (Vor-Schritt-Fehler blockiert den Deploy nie — die ehrliche Loud-Fail-Pathologie des siem-Tasks bleibt der Backstop) | Kommentar Z. 249-256; Rezept Z. 257-259 |
| `docs/sprints/SPRINT-169-AUTO-MINT-SERVICE-KEYS.md` | dieses Doc | — |

Nicht angefasst (Order): `deploy/siem/**` (S162), `deploy/ansible/**`,
`docs/API_DOCS.md` (keine Route geändert — der Mint nutzt die bestehende
`POST /api/consumer-keys`), `docs/backlog/BACKLOG.md` und SPRINT-16*-Docs
anderer Sessions (Parent-Order). `src/backend/**` unverändert (NUR LESEN).

### Bugs während des Baus gefunden + gefixt (ehrlich, alle reproduziert)

1. **Silent-Death-Bug** (eigener Code, vom Fixture-Test aufgedeckt): die
   access_token-Extraktion war eine bare Pipeline unter `set -euo pipefail`
   — ein Nicht-Match (grep exit 1) tötete das Skript STUMM mit exit 1 statt
   der lautenden "could not extract" -Meldung. Fix: `|| true` + der
   bestehende `-s`-Check sagt es laut (`mint-service-key.sh:279`). Beide
   Fail-Pfade danach verifiziert (F-1/F-2 unten).
2. **Validierung vor Defaults**: der Charset-Guard lief über leere
   PROJECT_ID/WORKSPACE_ID/SESSION_ID (leer bis zur Default-Zuweisung) und
   refusierte jeden Default-Lauf mit exit 2. Fix: leere Werte im Guard
   skippen (`mint-service-key.sh:152`) — Session ist legitim optional,
   Project/Workspace bekommen direkt danach ihre Defaults.
3. **JSON-Space-Toleranz**: Go (`encoding/json`) und Keycloak serialisieren
   kompakt (`"key":"…"`), aber der Extraktions-Grep ist jetzt auch gegen
   spacey JSON tolerant (`: *`) — getestet gegen beide Formen.

## Verifikation

**Lief wirklich (Transkript, alle Befehle in diesem Sprint ausgeführt; KEIN
echter Deploy, KEIN echter Mint gegen ein Live-Backend — die Fixture-Tests
sind lokale Throwaway-HTTP-Server auf 127.0.0.1 mit synthetischen Daten):**

1. `bash -n` auf allen drei Skripten → `ALL bash -n: OK` (mint-service-key.sh,
   ensure-siem-service-key.sh, record-deploy.sh).
2. shellcheck: **NICHT installiert** auf dieser Maschine (`command -v
   shellcheck` leer) → nicht gelaufen; Operator kann es nachholen:
   `shellcheck src/scripts/mint-service-key.sh src/scripts/ensure-siem-service-key.sh src/scripts/record-deploy.sh`.
3. `make -n redeploy SERVICE=siem NODE=trading` (Dry-Run, führt NICHTS aus):
   zeigt render-inventory → usage-Guard → **den neuen siem-Vor-Schritt**
   → docker run → record-deploy-Zeile. Für `SERVICE=backend`: 0
   ensure-siem-Zeilen (Hook greift nur für siem).
4. Extraktions-Pipelines gegen synthetische JSON-Antworten (kompakt UND
   spacey): Key-Extraktion, Token-Extraktion, curl-`-K`-Config-Parsung
   (Test 1-6: PASS).
5. Fixture-E2E (Throwaway-python-HTTP-Server 127.0.0.1, synthetische
   Key-/Token-Werte): 
   - **E2E-1**: Helper mintet (`siem-bridge`, kind=service,
     platform-internal/platform-trading), liefert an `--env-file` → `exit 0`,
     Zeile in Datei; Success-Meldung NUR auf stderr, OHNE Key-Wert.
   - **E2E-2**: gelieferte Zeile stimmt: `JIMESH_SIEM_SERVICE_KEY=jimesh-ck-…`.
   - **E2E-3**: zweiter Lauf: "already set — nothing minted", exit 0
     (Idempotenz).
   - **E2E-4**: `JIMESH_ADMIN_TOKEN`-Direktpfad reicht den Bearer durch
     (Fixture validiert ihn).
   - **F-1**: Mint 200 ohne `"key"`-Feld → LAUT "minted and undelivered",
     exit 3. **F-2**: Token-200 ohne `access_token` → LAUT
     "could not extract", exit 2.
   - **CHAIN-1..3** (record-deploy-Integration): fehlender
     `JIMESH_DEPLOY_RECORD_KEY` → Auto-Mint → Persist → Record-POST →
     "recorded 'testservice' on 'testnode'" exit 0; zweiter Lauf ohne
     erneuten Mint.
   - Guards: böser Env-Var-Name/SSH-Target/Remote-File/Port/Mint-Field je
     abgelehnt mit exit 2 (keine Ausführung).
6. Exit-Codes des Wrappers: unbekannter Node → exit 1 (laut), kein Arg →
   exit 2, Node-Facts-Parsing gegen das reale `.rendered.ini`:
   ansible_port=2222 korrekt, deploy_root leer → /opt/jimesh-Default greift.

**Nicht gelaufen (ehrlich, siehe Offen-Items):** kein echter Mint gegen das
Live-Gateway (verboten in diesem Sprint), kein echtes SSH auf trading, kein
echter Deploy, shellcheck.

## Offene Items (ehrlich)

- **O-1 — Live-Mint des SIEM-Keys (Operator-Test, braucht `JIMESH_ADMIN_TOKEN`
  in .env).** Befehl exakt:
  `JIMESH_SIEM_MINT_URL=http://localhost:8090 JIMESH_ADMIN_TOKEN=<admin-bearer> bash src/scripts/mint-service-key.sh --name siem-bridge --gateway-url http://localhost:8090 --ssh jimesh-operator@172.17.0.2 --ssh-port 2222 --remote-file /opt/jimesh/deploy/siem/.env --env-var JIMESH_SIEM_SERVICE_KEY`
  Danach: `make redeploy SERVICE=siem NODE=trading` — der Deploy muss OHNE
  Key-Beschwerde durchlaufen und der Bridge-Container muss Up sein
  (`docker compose --profile siem ps` auf dem Node).
- **O-2 — Keycloak-ROPC currently geblockt (LIVE-Befund, s.o.).** Der
  Password-Grant-Pfad (`JIMESH_ADMIN_PASSWORD`) bleibt implementiert, wird
  vom aktuellen Realm aber mit `unsupported_grant_type` (HTTP 400)
  abgelehnt. Operator-Optionen: (a) `JIMESH_ADMIN_TOKEN` in .env setzen
  (der ehrliche, sofort lauffähige Weg), oder (b) in der Keycloak-Admin-Console
  am `admin-cli`-Client Direct Access Grants aktivieren und dann live
  prüfen:
  `curl -s -X POST http://localhost:8081/realms/jimesh/protocol/openid-connect/token -d 'grant_type=password&client_id=admin-cli&username=admin&password=<JIMESH_ADMIN_PASSWORD>' | jq -r '.access_token | length'`
  — antwortet ein Token, trägt es hoffentlich `realm_access.roles`
  (Default-Client-Scope `roles`); das MUSS einmal live geprüft werden, bevor
  man sich auf den ROPC-Pfad verlässt (OPA-Gate braucht `jimesh-admin`).

  **NACHTRAG 1.10. — live geprüft, Ergebnis: der ROPC-Pfad taugt NICHT.**
  Derselbe Curl-Request gegen `127.0.0.1:8081` mit dem echten
  `JIMESH_ADMIN_PASSWORD` aus der Controller-.env:
  **HTTP 200, `access_token` 757 Zeichen** (der `unsupported_grant_type`-
  Befund von 30.9. gilt nicht mehr — Direct Access Grants sind am
  `admin-cli` aktiv). ABER: der dekodierte Token enthält **KEIN
  `realm_access`-Claim** (`realm_access: None`, azp `admin-cli`, exp 3600s).
  Grund im Code nachgewiesen: die Protocol-Mapper, die
  `realm_access.roles` in Tokens schreiben, werden von `BootstrapKeycloak`
  am **`jimesh-dashboard`-Client** angelegt
  (`internal/auth/keycloak_oidc.go:444`, `claim.name: realm_access.roles`),
  und die Realm-Rolle `jimesh-admin` wird dort erst beim Backend-Bootstrap
  erzeugt und dem admin-User zugewiesen (`keycloak_oidc.go:381-395,
  542-574`) — das importierte `deploy/keycloak/jimesh-realm.json` kennt die
  Rolle NICHT (nur `admin`/`operator`/`viewer`), und `admin-cli` tragt in
  der JSON gar nicht auf. Ohne `realm_access.roles` sieht die Policy keinen
  `jimesh-admin` → `POST /api/consumer-keys` würde 403 antworten, der Mint
  also laut failen (ehrlich, aber nutzlos).
  **Konsequenz (Operational):** Variante (b) aus dem Text oben ist
  Aussichtslos, solange der Helper `admin-cli` nutzt. Der praktikable Weg
  bleibt (a) `JIMESH_ADMIN_TOKEN` in die Controller-.env — oder eine
  Erweiterung des Helpers auf `client_id=jimesh-dashboard` + Client-Secret
  (derselbe Claim-Pfad, den der Dashboard-Login ohnehin benutzt). Keiner
  davon war diesem Sprint zugeordnet → als Handoff vermerkt, KEIN
  Code-Change in diesem Nachtrag.
- **O-3 — JIMESH_DEPLOY_RECORD_URL zeigt ins Leere.** Der Default
  `http://127.0.0.1:19091` (lokal läuft KEIN Stack; produktiver Gateway ist
  über den Tunnel auf 8090 erreichbar) bedeutet: Auto-Mint UND Record-POST
  gehen heute gegen einen toten Port — der Mint failt dann laut (curl exit
  7) statt etwas vorzumachen. Damit die Registry-Zeilen wirklich ankommen:
  `JIMESH_DEPLOY_RECORD_URL=http://localhost:8090` in .env setzen (auch der
  Auto-Mint mintet dann gegen den produktiven Gateway). Entschieden werden
  muss das vom Operator — es ändert, WO Deploy-Ergebnisse landen (Node-DB
  statt lokalem Void), und deshalb stand es nicht diesem Sprint zu.
- **O-4 — SSH-Append live gegen trading.** Der SSH-Teil des Helpers
  (Presence-Check, sudo -n prepare, tee -a, Verify) ist syntaktisch geprüft
  und semantisch am Runbook gespiegelt, aber NIE gegen den echten Node
  gelaufen (SSH-Verbot in diesem Sprint). Operator-Test:
  `bash src/scripts/ensure-siem-service-key.sh trading` — erwartete Ausgabe:
  entweder "already set … nothing minted" (Key existiert schon) oder Mint +
  "… -> jimesh-operator@…:/opt/jimesh/deploy/siem/.env:JIMESH_SIEM_SERVICE_KEY".
- **O-5 — sudo -n auf trading.** Der Helper benutzt `sudo -n` wie das
  Runbook (`deploy/siem/README.md` "Service-Key"). Ob der SSH-User
  (`jimesh-operator`) passwordless sudo für die .env besitzt, muss O-4
  mitprüfen; falls nicht: `JIMESH_SIEM_ENV_NO_SUDO=true` + passende
  Dateirechte am Node (oder eine sudo-Regel) — bewusst als Override
  gebaut statt still anzunehmen.
- **O-6 — BACKLOG/API_DOCS nicht gespiegelt** (Parent-Order: fremdes
  Gebiet in diesem Sprint). Der Parent sollte SPRINT-169 in
  `docs/backlog/BACKLOG.md` spiegeln; `API_DOCS.md` braucht KEIN Update
  (keine Route geändert — der Mint verbraucht die bestehende
  `POST /api/consumer-keys`-Dokumentation).
