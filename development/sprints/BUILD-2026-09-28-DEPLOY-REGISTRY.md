# BUILD-2026-09-28 — DEPLOY-REGISTRY (Deploys persistieren, Health nur für Aufgezeichnetes)

Build-Agent: Deployment-Registry (SPRINT-142). Kein Commit (Standing Order). Fremde Dateien
unberührt — **store.go / gateway.go / auth.go / Makefile / BACKLOG.md** haben andere Besitzer
bzw. in-flight-Änderungen; deren **exakte Edits stehen unten** (nur anwenden, nichts weiter).

**Operator-Demand (verbatim, 28.9. ~06:25):** "warum kann man nicht alle auf einmal deployen
und wieso haben wir keine health checks oder speichern wenn wir sachen deployen also in der db
oder sonstwo — dann müssen wir auch keine health checks laufen lassen wenn da sowieso nix da
ist."

## Was gebaut wurde (live-verified)

**Ziel:** Jeder `make redeploy` speichert sein ECHTES Ergebnis in PostgreSQL (Tabelle
`node_services`, EINE Zeile pro (node, service)); die SSH-Target-Detailseite zeigt das
Inventar + GEMESSENE Health; Health-Checks laufen NUR für aufgezeichnete Services — kein
Record → kein Check → keine Fake-Grüns (Mandat 2).

### 1. Store — NEU `src/backend/internal/store/node_services.go` (+ Test)

- Tabelle `node_services`: id, node_name, service, git_sha, ansible_rc (NULL = "nicht
  recorded" — ein ehrlicher dritter Zustand neben 0/≠0), status (deployed|failed|unknown),
  deployed_at, last_health_at (NULL = nie geprüft), health (ok|degraded|down|unknown),
  last_error, source (cli|api), log_excerpt. UNIQUE(node_name, service) als CREATE UNIQUE
  INDEX (idempotent auch auf älteren Teil-Tabellen).
- `migrateNodeServices(d)`: idempotent per MANDATES §8 (CREATE IF NOT EXISTS +
  sentinel-gecetterte, guarded ALTER-Backfills). Zusätzlich lazy `ensureNodeServicesTable`
  pro Methode (genau das ensureConsumerKeyTables-Muster, consumer_keys.go Fresh-DB-Fix): die
  Oberfläche funktioniert sofort, auch BEVOR die store.go-Zeile unten angewendet ist.
- API: `UpsertNodeService` (in-place Upsert — App-Identität, deployed_at = letzter Deploy,
  Health-Felder werden vom Record-Pfad NIE angefasst), `ListNodeServices` (ehrliches []),
  `GetNodeService` (sql.ErrNoRows → Handler macht 404), `UpdateNodeServiceHealth` (nur
  gemessene Werte).

### 2. Gateway — NEU `src/backend/internal/gateway/node_services.go` (+ Test)

- **POST /api/node-services** — record einen Deploy-Erfolg. Status wird aus dem ECHTEN rc
  abgeleitet (0→deployed, ≠0→failed — kein Fake-Erfolg, fehlt→unknown); `source` aus der
  Identität (kind=service Key→cli, Admin-Session→api). Fail-closed 403 ohne eines von
  beiden (Handler liest die server-derived Header X-JiMesh-Key-Kind / X-JiMesh-Identity-Admin).
  Service-Name-Gate `[A-Za-z0-9][A-Za-z0-9._-]{0,63}` — die Health-Probe interpoliert ihn
  später in ein Remote-Command, exotische Namen werden an der Tür abgewiesen (400).
- **GET /api/node-services?node=X** — Inventar pro Node, ehrliches `[]` wenn nichts
  recorded ist; 400 ohne node-Parameter.
- **POST /api/node-services/{id}/health-check** — SSH-Probe NUR für RECORDED Services
  (Operator-Regel): 404 ohne Row; Target-Auflösung per Kaskade Query-Params → ssh_endpoints-
  Registry (Match auf Name ODER Host — deshalb funktioniert `NODE=trading`) → globale
  ssh_* Settings → sonst 400 mit Wegbeschreibung; EINE read-only SSH-Session über
  `deploy.DialSSH` (derselbe verifizierte Pfad wie /api/suricata/status und die Deploy-Engine):
  `docker ps -a` + `systemctl is-active/is-enabled`, Marker-Parser, Container-Match über die
  ECHTE deploy/*/defaults.yml-Konvention (`jimesh-<service>`, exakter Name / Präfix-Form —
  NIE Substring: "backend" matcht nicht "my-backend-tool"). Mapping: running/active→ok,
  restarting/paused/activating→degraded, exited/dead/failed/nichts-gefunden→down,
  Node ohne docker UND systemctl→unknown "cannot measure". 502 bei Dial/Probe-Fehler OHNE den
  gespeicherten Health anzufassen (eine unerreichbare Node ist kein "down"-Service) — die
  echte SSH-Meldung reist mit. last_error nur bei ≠ok (ein erholtes ok räumt den alten Grund
  ab); der gemessene Grund reist immer im `probe`-Report mit.

### 3. CLI-Hook — NEU `src/scripts/record-deploy.sh` (chmod +x)

- POSTet `{node, service, git_sha, rc}` nach dem Ansible-Lauf (git sha auto aus dem Repo);
  `JIMESH_DEPLOY_RECORD_KEY` aus env/.env (never printed, kein set -x),
  `JIMESH_DEPLOY_RECORD_URL` default `http://127.0.0.1:19091` (loopback, Mandat 12).
- Ohne Key: lauter Skip auf stderr, exit 0 (Deploy wird nicht blockiert). HTTP-Fail: exit 3 +
  echte Status-/Gateway-Meldung. Ohne jq (reines sed/awk-JSON-Escaping — kein neues Dep).
- Verhalten live getestet: Missing-Key-Pfad (laut, exit 0), Injection-Gate (exit 2),
  E2E gegen Stub-Server: rc=2 landet als rc=2 im JSON, Bearer korrekt, Key erscheint NIE
  in stdout/stderr.

### 4. Frontend — SSHTargetDetailPage.tsx-Sektion "Deployed services" (+ NEU Test)

- Query auf BEIDE realen Labels (config.yml-Node-Name + Registry-Host, gemergt/dedupe nach
  id — dieselbe Zwei-Label-Logik wie die §8-Workspace-Logik der Seite), neuester Deploy zuerst.
- Pro Row: Service, git sha, Status-Badge (Deployed/Failed/Unknown), Health-Dot+Label
  (OK/Degraded/Down/Not measured), deployed_at, last_health_at ("never" ohne Probe),
  Quelle (CLI hook / API), "Check health"-Button → POST /{id}/health-check, Refetch zeigt das
  GEMESSENE Ergebnis, Fehler-Toast mit der echten Backend-Meldung. Ehrliches Leerbild wenn
  nichts recorded ist; die 400/403/502-Meldungen erscheinen wörtlich.
- Erreichbarkeit (Mandat 14): Workspaces → SSH Endpoints → Target-Zeile → Detailseite
  (/workspaces/targets/:targetName) — Sektion ist Teil der bestehenden Seite.

### 5. Doku + i18n

- API_DOCS.md: NEU Abschnitt "Deployment Registry — node_services (SPRINT-142)" mit allen
  3 Routen, Auth-Modell, Honest-States, Mint-Flow für JIMESH_DEPLOY_RECORD_KEY
  (router-bootstrap-Muster: openssl rand → sha256 → INSERT INTO consumer_keys kind='service').
- 19 neue `sshTargetDetail.*`-Keys: en+de echt übersetzt, 58 Locales via
  scripts/backfill-i18n.mjs (S55-Standard), `npm run check:i18n` PASS.
- docs/sprints/SPRINT-142-DEPLOYMENT-REGISTRY.md: WP1–WP5 auf [x] gesetzt + Verifikation.
  BACKLOG.md unberührt (Parent spiegelt).

---

## EXAKTE EDITS für fremd-besessene Dateien (Parent: nur diese anwenden)

### A) store.go — migrate-Registrierung (NEU: 3 Zeilen zwischen heutiger Zeile 712-714)

Nach dem migrateProjectVLANs-Block, VOR `return nil` (heute: Zeilen 712-714 sind
`if err := migrateProjectVLANs(d); err != nil {` / `return err` / `}` und dann `return nil`):

```go
	if err := migrateProjectVLANs(d); err != nil {
		return err
	}
	if err := migrateNodeServices(d); err != nil {
		return err
	}
	return nil
```

(d.h. NEU sind die zwei mittleren Zeilen `if err := migrateNodeServices(d); err != nil {` /
`return err` plus schließende `}` direkt nach dem VLANs-Block.)

### B) gateway.go — Route-Registrierung (2 Zeilen + Kommentar, nach heutiger Zeile 279)

Direkt nach `mux.HandleFunc("/api/nodes/health", s.handleNodesHealth)`:

```go
	// SPRINT-142 (deployment registry): POST records a deploy result (the
	// make-redeploy hook src/scripts/record-deploy.sh via kind=service consumer
	// key, or an admin session), GET serves one node's recorded inventory
	// (SSHTargetDetailPage "Deployed services" section). The {id}/health-check
	// probe route is session-only (the auth.go edit below matches the exact
	// /api/node-services path only, never the probe route).
	mux.HandleFunc("/api/node-services", s.handleNodeServices)
	mux.HandleFunc("/api/node-services/{id}/health-check", s.handleNodeServiceHealthCheck)
```

### C) auth.go — Service-Key-Zweig für den Record-Pfad (1 Bedingungszeile, heute Zeile 859-860)

In der Middleware-Bedingung EINE Zeile ergänzen — consumer-key-förmige Tokens ONLY, damit
eine abgelaufene Browser-Session die normale Login-Antwort behält (gleiche Datei, Vault-
Präzedenz; der Handler erzwingt zusätzlich kind=service ODER admin fail-closed):

```go
				if path == "/api/router/config" || path == "/api/router/aliases" || path == "/api/firewall/report" || path == "/api/firewall/config" ||
					(isVaultRead && strings.HasPrefix(token, store.ConsumerKeyPrefix)) ||
					// SPRINT-142: POST /api/node-services is the deploy-record path
					// (src/scripts/record-deploy.sh after make redeploy) — same
					// kind=service gate family as /api/sdk/*. Exact-path match:
					// the {id}/health-check route stays session-only.
					(path == "/api/node-services" && strings.HasPrefix(token, store.ConsumerKeyPrefix)) {
```

(d.h. NEU ist die letzte `(path == "/api/node-services" && …)`-Zeile samt Kommentar; der
Rest der Bedingung bleibt unverändert.)

### D) Makefile — redeploy-Hook (Rezept-Ende, heute Zeilen 261-262)

Der letzte Recipe-Block des redeploy-Targets endet heute:

```make
		-e service=$(SERVICE) -e target_node=$(NODE) \
		/ansible/deploy/ansible/playbooks/deploy-service.yml
```

ERSETZE die letzte Zeile durch (an die Playbook-Zeile kommt ein `; \`, dann zwei neue
Zeilen):

```make
		/ansible/deploy/ansible/playbooks/deploy-service.yml; \
		rc=$$?; bash src/scripts/record-deploy.sh "$(NODE)" "$(SERVICE)" "$$rc" || true; \
		exit $$rc
```

Damit wird JEDES Deploy-Ergebnis recorded — auch rc≠0 (Fail wird als Fail gespeichert, nie
gegreenwash't); ein Recording-Fail bricht das Target nicht (`|| true`), und make behält den
echten Ansible-Exit-Code (`exit $$rc`). `deploy-all` braucht NICHTS: es ruft redeploy per
`$(MAKE) redeploy` auf und erbt damit den Hook.

---

## Verifikation (alles echt gelaufen, 28.9. ~06:25–06:35)

- `docker run --rm -v <repo>/src/backend:/app -w /app golang:latest go build ./...` → leer;
  `go vet ./...` → leer (zweimal gelaufen, auch nach dem letzten Fix).
- `go test ./internal/store/ ./internal/gateway/ -run NodeService` gegen die Wegwerf-DB
  `jimesh_test` → **12/12 PASS** (Store: Upsert-Identität/kein Duplikat, Scope-Isolation,
  ehrliches [], Health-Roundtrip inkl. NULL-rc, idempotenter 2. migrate-Lauf; Gateway:
  rc→Status, Namens-Gate + Probe-Injektions-Guard, Probe-Parsing über echte Marker-Shapes,
  Record-Auth-Gate (403), 400/404/502-Verträge, Messwert-Persistenz, 502 fasst Health NICHT
  an). WICHTIG (ehrlich): der VOLLE `make go-test` kompiliert aktuell an einer FREMDEN,
  uncommitted Datei einer Parallel-Session nicht (`internal/store/workspace_members_test.go`
  bzw. das gateway-Pendant: `db.UpsertProject returns 1 value` — NICHT meine Datei, unberührt).
  Meine Tests liefen deshalb gegen eine Kopie des Backends ohne genau diese fremden
  Testdateien (sonst identischer Code-Stand).
- `bash -n src/scripts/record-deploy.sh` ok; Missing-Key → laute Meldung + exit 0;
  Injection-Name → exit 2; E2E gegen Stub-HTTP-Server: rc=2 im JSON angekommen, Bearer
  korrekt, Key NIE in stdout/stderr.
- `npx vitest run src/views/SSHTargetDetailPage.test.tsx` → **4/4 PASS** (beide Labels
  gerendert, ehrliches Leerbild, Health-Check-POST + Refetch des GEMESSENEN Werts,
  Backend-Fehler wörtlich).
- `npx tsc --noEmit -p tsconfig.app.json` → **474** Fehler, **0 aus meinen Dateien**
  (Baseline im lebenden Baum zu Sessionsbeginn: 479 — Parallel-Agents haben gebessert;
  nichts verschlechtert).
- `npm run check:i18n` → **PASS** — 60 Locales, 3132 Keys; 19 neue Keys in en+de echt
  übersetzt, Rest via scripts/backfill-i18n.mjs.

## AUSSTEHEND beim Parent / Operator (nach Anwendung der Edits oben)

1. Edits A–D anwenden, dann `make restart-backend`.
2. Key ONCE minten (der genaue Flow steht im neuen API_DOCS-Abschnitt "Deployment Registry")
   und als `JIMESH_DEPLOY_RECORD_KEY=<jimesh-ck-…>` in `.env` ablegen (nie printen).
3. Smoke-Test:

```bash
curl -s "http://127.0.0.1:19091/api/node-services?node=trading" -H "Authorization: Bearer <session>"
curl -s -X POST "http://127.0.0.1:19091/api/node-services" \
  -H "Authorization: Bearer $JIMESH_DEPLOY_RECORD_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"node":"trading","service":"backend","rc":0}'
```

4. Einmal `make redeploy SERVICE=backend NODE=trading` — danach zeigt die SSH-Target-
   Detailseite von trading den Eintrag in "Deployed services", und "Check health" misst
   per echtem SSH (docker ps / systemctl auf der Node).
