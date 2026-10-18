# JiMesh Deployment-Audit — REMOTER Control-Node

**Audit-Typ:** Deployment-Readiness (lesend — kein Code verändert, kein Container gestartet/gestoppt)
**Zeitpunkt:** 2026-09-19 (UTC, lt. Container-/Git-Zeitstempel der Evidenz)
**Geprüfte Referenz:** podhead-Checkout `/home/ji/projects/jimesh` @ `824dc9b` (2026-09-19)
**Ziel:** JiMesh-Stack auf dem Control-Node, erreichbar über Traefik `http://100.64.0.6:8090`
**Zugriff:** `ssh -F /dev/null -p 2222 jimesh-operator@172.17.0.2 '<befehl>'` (sudo passwortlos); **alle** curl-Checks liefen auf dem Control-Node
**Lokal (podhead):** nichts gestartet, nichts angefasst (Tailscale-Client und Wegwerf-DB `audit-test-pg` unberührt)

---

## Executive Summary

> **Ergebnis: 46/46 PASS — 0 FAIL** (kein Deployment-Showstopper gefunden)

| Bereich | Ergebnis |
|---|---|
| A. Kern-Endpunkte (health / ready / openapi.json) | 3/3 PASS |
| B. Task-Routen (team-bindings, security, iac, deployments, ssh-explore, container-logs, vault, subagents) | 32/32 PASS |
| C. Sanity (bestehende Fläche) | 3/3 PASS |
| D. Frontend (/ Titel, Asset, Deep-Link) | 3/3 PASS |
| E. Container & Infrastruktur (ps, logs, ss 19092, TCP, Binary-Evidenz) | 5/5 PASS |

Zusätzlich dokumentierte **Hinweise/Befunde** (keine Deployment-FAILs): fehlende Route `GET /api/security/findings` (Frontend-Bug F-01), `/ready`-Stub, `/api/networks/*` → 503 ehrlich (Headscale nicht konfiguriert), `openapi.json` ist ein Mini-Spec ohne die neuen Routen — Details in §4.

---

## Methodik und wichtige Erkenntnis zur Beweisführung

Die Aufgabe definierte „401/403 = Route existiert = PASS". Der Live-Test hat gezeigt, dass das **allein nicht tragfähig** ist:

* Die Auth-Middleware umschließt den **gesamten** Mux (`src/backend/internal/gateway/gateway.go:379`: `Handler: corsMiddleware(s.auth.Middleware(s.auth.Throttled(s.mux)))`) und gate't per **Prefix**: alles unter `/api/*` außer `/health`, `/frontend-dist`, `/api/auth/*` bekommt unauthentifiziert 401 (logisch in `internal/auth/auth.go:663 ff.`).
* **Negativprobe beweist das:** `GET /api/definitiv-nicht-existierend-xyz123` → ebenfalls **401 application/json** (nicht SPA-Fallback). Ein 401 zeigt also: Traefik→Backend erreichbar + Auth-Gate fail-closed — aber **nicht**, dass eine konkrete Route registriert ist.
* `GET /openapi.json` ist ein kuratiertes Mini-Spec (nur 6 Pfade: `/api/firewall/rules`, `/api/vault/secrets`, `/api/workspaces`, `/health`, `/v1/chat/completions`, `/v1/embeddings`) — es ist **kein** generiertes Routen-Inventar des laufenden Images und wurde deshalb nicht als Existenznachweis verwendet.

Daher dreistufige Evidenz pro Route:

1. **Code:** Registrierung verifiziert im Quellcode (gateway.go + Sub-Registrare, Datei/Zeile in §1).
2. **Binary:** Route-Pattern-String per `grep -acF` im **laufenden** Container-Binary `/server` (41,6 MB; read-only über `/proc/<PID>/root/server`; das Image ist distroless — `docker exec` hat keine Shell). Binary-mtime `2026-09-19 16:15:24` = Image-Creation-Timestamp von `jimesh-backend:local` exakt → Provenienz gesichert.
3. **Live:** curl gegen `http://100.64.0.6:8090` (auf dem Control-Node).

Alle unauthentifizierten POST-Probes verstarben am Prefix-Gate → **es wurde nichts mutiert**. Die Method-Guards der POST-Handler sind zusätzlich im Code verifiziert (405 bei falscher Methode: `projects_ssh.go:1045`, `iac_discovery.go:36`, `ssh_explore.go:36`, `agent_scan.go:35`, `vault.go:336`).

---

## 1. Routen-Verifikation (live über Traefik)

**Binary-Spalte:** Anzahl der Treffer von `grep -acF '<pattern>' /proc/<PID>/root/server` im laufenden Image („–“ = nicht separat gegriffen, Existenz über denselben Handler/Registry-String bzw. Code gesichert).

### A. Kern-Endpunkte (öffentlich per Design, kein Gate)

| Route | Live-Code | Body | Binary | PASS/FAIL |
|---|---|---|---|---|
| `GET /health` | **200** application/json | `{"status":"ok"}` | ✓ (2) | **PASS** — code: gateway.go:185 |
| `GET /ready` | **200** application/json | `{"status":"ready"}` | – | **PASS** — code: gateway.go:186 (Stub! s. §4) |
| `GET /openapi.json` | **200** application/json | Mini-Spec (6 Pfade) | ✓ (2) | **PASS** — code: gateway.go:187 |

### B. Task-Routen (neue Fläche — alle unauthentifiziert am Gate: 401 application/json `{"error":{"message":"authentication required — log in to the dashboard"}}`)

| Route (Probe-Methode) | Live-Code | Binary | PASS/FAIL |
|---|---|---|---|
| `GET /api/team-bindings` | **401** | – | **PASS** — code: team_bindings.go:36 |
| `GET /api/team-bindings/{id}` | **401** | ✓ (2) | **PASS** — code: team_bindings.go:37 |
| `GET /api/security/exposure` | **401** | ✓ (1) | **PASS** — code: security.go:50 |
| `GET /api/security/events` | **401** | – | **PASS** — code: security.go:53 |
| `GET /api/security/audit` | **401** | – | **PASS** — code: security.go:49 |
| `GET /api/security/findings/dismissed` | **401** | ✓ (1) | **PASS** — code: security.go:59 |
| `GET /api/security/quarantine` | **401** | – | **PASS** — code: security.go:66 |
| `GET /api/security/agent-scan` (GET-Probe) | **401** | ✓ (1) | **PASS** — code: security.go:74, Handler `agent_scan.go:35` (POST-only → 405-Guard) |
| `POST /api/security/agent-scan` | **401** | ✓ (1) | **PASS** — agentconfig-Scanner (R1-P1), LandungCommit `a8d37c3` |
| `GET /api/projects/{id}/iac-files` | **401** | – | **PASS** — code: deploy.go:80 |
| `POST /api/projects/{id}/iac-files/scan` | **401** | ✓ (1) | **PASS** — code: deploy.go:81, Guard `iac_discovery.go:36`, LandungCommit `db6ca9d` |
| `GET /api/projects` | **401** | – | **PASS** — code: deploy.go:53 |
| `GET /api/projects/{id}/deployments` | **401** | – | **PASS** — code: deploy.go:71 |
| `GET /api/projects/{id}/deployments/{depId}` | **401** | – | **PASS** — code: deploy.go:73 |
| `GET /api/projects/{id}/deployments/{depId}/redeploy` | **401** | ✓ (1) | **PASS** — code: deploy.go:72 |
| `GET /api/deployments` | **401** | ✓ (1) | **PASS** — code: deploy.go:77 |
| `POST /api/projects/deploy` | **401** | – | **PASS** — code: deploy.go:49, Guard `projects_ssh.go:1045` |
| `POST /api/projects/redeploy` | **401** | – | **PASS** — code: deploy.go:50, Guard `projects_ssh.go:1065` |
| `POST /api/projects/undeploy` | **401** | – | **PASS** — code: deploy.go:51, Guard `projects_ssh.go:2423` |
| `GET /api/ssh/explore` (GET-Probe) | **401** | ✓ (1) | **PASS** — code: deploy.go:78, Handler `ssh_explore.go:36` (POST-only) |
| `GET /api/projects/{id}/containers/{cid}/logs` **(SSE, `Accept: text/event-stream`, -m 4)** | **401-Header** `HTTP/1.1 401 Unauthorized` innerhalb 4 s | ✓ (1) | **PASS** — code: deploy.go:79, Handler `container_logs.go:12`; Timeout danach ist bei SSE normal |
| `GET /api/projects/{id}/containers/{cid}/logs` (plain) | **401** | – | **PASS** (zweite Nachweisebene zur SSE-Zeile) |
| `GET /api/vault/access` | **401** | ✓ (5) | **PASS** — code: security.go:47; Handler `vault.go:336` (POST-only, GET → 405) |
| `POST /api/vault/access` | **401** | ✓ (5) | **PASS** — Vault-ACL-Enforcement (LandungCommit `50a4494`) |
| `GET /api/vault/secrets` | **401** | – | **PASS** — code: security.go:42 |
| `GET /api/vault/audit` | **401** | – | **PASS** — code: security.go:44 |
| `GET /api/vault/tokens` | **401** | – | **PASS** — code: security.go:45 |
| `GET /api/subagents` | **401** | – | **PASS** — code: subagents.go:80 |
| `GET /api/subagents/guarded` | **401** | – | **PASS** — code: subagents.go:82 |
| `GET /api/subagents/{id}` | **401** | – | **PASS** — code: subagents.go:83 |
| `GET /api/subagents/{id}/events` **(SSE)** | **401-Header** innerhalb 4 s | ✓ (1) | **PASS** — code: subagents.go:84 (SSE-Progress-Stream) |
| `GET /api/subagents/{id}/tool-calls` | **401** | – | **PASS** — code: subagents.go:85 (+ approve/deny subagents.go:86-87, Binary ✓ `{callId}/approve`) |

Zusätzlich code-verifiziert (nicht separat live probiert): `GET /api/security/findings/dismiss` (security.go:60; Handler ist laut `findings.go:33` **GET-only**) und die `/api/networks/*`-Familie (registerNetworks, gateway.go:259 — antwortet derzeit ehrlich 503, s. §4).

### C. Sanity (bestehende Fläche, um Gate-Verhalten einzuordnen)

| Route | Live-Code | PASS/FAIL |
|---|---|---|
| `GET /v1/models` | **200** application/json `{"data":[{"id":"default",...}],"object":"list"}` | **PASS** (OpenAI-kompatibel öffentlich per Design, API_DOCS §Auth) |
| `GET /api/keys` | **401** | **PASS** (Gate, code: gateway.go:208) |
| `GET /api/auth/status` | **200** `{"authenticated":false,"email":"lj@saits.ai","needsSetup":false,"source":"password"}` | **PASS** (öffentlicher Auth-Status, `/api/auth/`-Whitelist) |

---

## 2. Frontend-Checks (alle über Traefik 100.64.0.6:8090)

| Check | Ergebnis | PASS/FAIL |
|---|---|---|
| `GET /` | **200** text/html, 5622 Bytes, `<title>JiMesh Admin Dashboard</title>` | **PASS** |
| Statisches Asset aus dem HTML-Quelltext: `/_next/static/chunks/webpack-97a56208a33f1c55.js` | **200** application/javascript; charset=UTF-8 | **PASS** |
| Deep-Link `GET /overview` | **200** text/html + `<title>JiMesh Admin Dashboard</title>` (SPA-Fallback auf index.html — designed Verhalten, `spaHandler` gateway.go:102-113) | **PASS** |
| Binding-Beleg `localhost:8090` | **000 / Connection refused** — web ist nur auf `100.64.0.6:8090` published (docker ps: `100.64.0.6:8090->80/tcp, 127.0.0.1:8091->8080/tcp`) | **PASS** (entspricht Vorwissen) |

---

## 3. Container-Checks (auf dem Control-Node)

### 3.1 `sudo docker ps -a` — alle jimesh-* Up, kein Restart-Loop

| Container | Image | Status | RestartCount |
|---|---|---|---|
| jimesh-backend | jimesh-backend:local | Up 11 min | **0** |
| jimesh-frontend | node:20-alpine | Up 15 min | **0** |
| jimesh-traefik | traefik:v3.6 | Up 3 days | **0** |
| jimesh-keycloak | quay.io/keycloak/keycloak:26.0 | Up 27 hours | **0** |
| jimesh-headscale | headscale/headscale:latest | Up 3 days | **0** |
| jimesh-headscale-client | tailscale/tailscale:latest | Up 3 days | **0** |
| jimesh-vault | hashicorp/vault:latest | Up 3 days (healthy) | **0** |
| jimesh-redis | redis:alpine | Up 3 days (healthy) | **0** |
| jimesh-postgres | postgres:16-alpine | Up 3 days (healthy) | **0** |

**PASS** — 9/9 `running`, 0 Restarts. Portmapping: `jimesh-backend: 127.0.0.1:19092->3009/tcp` (gRPC-Hostport), `jimesh-frontend: keine eigenen Ports` (nur intern via jimesh-net/Traefik — per Design). Backend-Inspect: `jimesh-backend:local`, Image-Creation `2026-09-19T16:15:24Z` (sha256:d273eba6…), Container-Start `16:20:47Z`.

### 3.2 `sudo docker logs jimesh-backend --tail 15` — keine Errors

Sauberer Start — `gRPC listening on [::]:3009`, `HTTP listening on :3010`, `serving static files from /frontend-dist`, Keycloak-Bootstrap erfolgreich (client secret, realm admin password, realm-roles), Feedback-Loop armed, `[aa] skipped: no key ... TTFT/TPS tracking idle` (ehrlicher Skip, kein Error). Vollständiger Log-Text verbatim reproduzierbar über §5. **PASS** — keine Error-Zeilen.

### 3.3 gRPC-Hostport 19092

`sudo ss -tlnp | grep 19092` → `LISTEN 0 4096 127.0.0.1:19092 ... users:(("docker-proxy",pid=1968597,fd=8))` + TCP-Verbindungstest `</dev/tcp/127.0.0.1/19092` → **OK**. **PASS**

### 3.4 Binary-Evidenz (laufendes Image)

`grep -acF` gegen `/proc/<PID>/root/server` (PID 1968550, `/server -http-port=3010 -grpc-port=3009`): **13/13 geprüfte Route-Patterns vorhanden** (Counts in §1, u. a. `api/team-bindings/{id}`=2, `api/vault/access`=5, `api/projects/{id}/iac-files/scan`=1, `api/ssh/explore`=1, `api/projects/{id}/containers/{cid}/logs`=1, `api/security/agent-scan`=1, `api/security/findings/dismissed`=1, `api/projects/{id}/deployments/{depId}/redeploy`=1, `api/subagents/{id}/tool-calls/{callId}/approve`=1, `api/subagents/{id}/events`=1, `api/deployments`=1, `api/security/exposure`=1, `openapi.json`=2). Binary-mtime = Image-Creation-Timestamp exakt (`2026-09-19 16:15:24`). **PASS**

---

## 4. Befunde & Hinweise (ehrlich, kein Deployment-Showstopper)

1. **F-01 (bekannt, Code-Ebene):** `GET /api/security/findings` existiert im Backend **nicht** — `security.go` registriert nur `findings/dismissed` (:59) und `findings/dismiss` (:60). Das Frontend (`SecurityFindingsPage`) queryt trotzdem `GET /api/security/findings` — dokumentiert im Audit-Commit `824dc9b` als HIGH-Finding. Deployment-mäßig irrelevant (fehlende Route verhält sich hinter dem Gate wie jede andere: 401 unauth.), aber die Seite zeigt für eingeloggte User einen Fehler statt Daten.
2. **`/ready` ist ein Stub:** antwortet immer `{"status":"ready"}` 200, prüft Store/Redis **nicht** (laut API_DOCS dokumentiert, gateway.go:186). Der PASS hier ist Liveness-Evidenz, keine Readiness-Garantie.
3. **`/api/networks/*` → 503 (honest):** Log-Zeile TASK-078 — `HEADSCALE_URL/HEADSCALE_API_KEY not set — /api/networks/* will answer 503 (honest, not fabricated rows)`. Known limitation des Deployments, korrekt statt fabriziert.
4. **`openapi.json` ist ein Mini-Spec** (6 Pfade) und listet die neuen Routen nicht — für SDK-Konsumenten ist die Routen-Doku in `API_DOCS.md` die Quelle, nicht das Spec.
5. **Keine authentifizierten Probes:** bewusst **kein Login versucht** (keine Operator-Credentials genutzt, kein Passwort-Guessing) — daher ist das Verhalten HINTER dem Gate (200er-Datenflüsse, OPA-Entscheidungen) nicht Teil dieses Audits; geprüft wurde Existenz + Gate + Erreichbarkeit.

---

## 5. Operator-Nachspiel-Befehle

Alle Befehle wurden **verbatim in dieser Form** während des Audits ausgeführt und verifiziert.

### Basis (von podhead aus)

```bash
ssh -F /dev/null -p 2222 jimesh-operator@172.17.0.2 '<befehl>'
```

### Routen-Probe (Kompakt-Loop — Kern + Gate-Verhalten)

```bash
ssh -F /dev/null -p 2222 jimesh-operator@172.17.0.2 'for p in /health /ready /openapi.json /v1/models /api/auth/status /api/team-bindings /api/team-bindings/x /api/security/exposure /api/security/events /api/security/audit /api/security/findings/dismissed /api/security/quarantine /api/projects/x/iac-files /api/projects/x/deployments /api/projects/x/deployments/1 /api/projects/x/deployments/1/redeploy /api/deployments /api/ssh/explore /api/projects/x/containers/c1/logs /api/vault/access /api/vault/secrets /api/vault/audit /api/vault/tokens /api/subagents /api/subagents/guarded /api/subagents/sa-1 /api/subagents/sa-1/tool-calls /api/keys; do curl -m 8 -s -o /dev/null -w "%{http_code} %{content_type} $p\n" "http://100.64.0.6:8090$p"; done'
```
Erwartet: `/health`, `/ready`, `/openapi.json`, `/v1/models`, `/api/auth/status` → 200 application/json; **alle anderen → 401 application/json** (Auth-Gate).

### POST-Probes (unauthentifiziert — sterben am Gate, mutieren nichts)

```bash
ssh -F /dev/null -p 2222 jimesh-operator@172.17.0.2 'for p in /api/security/agent-scan /api/projects/x/iac-files/scan /api/projects/deploy /api/projects/redeploy /api/projects/undeploy /api/vault/access; do curl -m 8 -s -o /dev/null -w "%{http_code} %{content_type} POST $p\n" -X POST -H "Content-Type: application/json" -d "{}" "http://100.64.0.6:8090$p"; done'
```
Erwartet: alle **401 application/json**.

### SSE-Routen (Connection-Aufbau genügt; Timeout danach ist normal)

```bash
ssh -F /dev/null -p 2222 jimesh-operator@172.17.0.2 'curl -m 4 -s -D - -o /dev/null -H "Accept: text/event-stream" "http://100.64.0.6:8090/api/projects/x/containers/c1/logs" | head -1'
ssh -F /dev/null -p 2222 jimesh-operator@172.17.0.2 'curl -m 4 -s -D - -o /dev/null -H "Accept: text/event-stream" "http://100.64.0.6:8090/api/subagents/sa-1/events" | head -1'
```
Erwartet: `HTTP/1.1 401 Unauthorized` (Header-Arrival innerhalb 4 s = Route erreichbar, Gate aktiv).

### Negativprobe (belegt das Prefix-Gate — wichtig für die Beweisführung)

```bash
ssh -F /dev/null -p 2222 jimesh-operator@172.17.0.2 'curl -m 8 -s -o /dev/null -w "%{http_code} %{content_type}\n" "http://100.64.0.6:8090/api/definitiv-nicht-existierend-xyz123"'
```
Erwartet: **401 application/json** (nicht 404/SPA) — 401 beweist deshalb nur das Gate, nicht die Route.

### Frontend

```bash
ssh -F /dev/null -p 2222 jimesh-operator@172.17.0.2 'curl -m 8 -s http://100.64.0.6:8090/ | grep -o "<title>[^<]*</title>"'
ssh -F /dev/null -p 2222 jimesh-operator@172.17.0.2 'curl -m 8 -s -o /dev/null -w "%{http_code} %{content_type}\n" "http://100.64.0.6:8090/_next/static/chunks/webpack-97a56208a33f1c55.js"'
ssh -F /dev/null -p 2222 jimesh-operator@172.17.0.2 'curl -m 8 -s http://100.64.0.6:8090/overview | grep -o "<title>[^<]*</title>"'
```
Erwartet: `JiMesh Admin Dashboard`, `200 application/javascript`, `JiMesh Admin Dashboard`.

### Container

```bash
ssh -F /dev/null -p 2222 jimesh-operator@172.17.0.2 'sudo docker ps -a --format "{{.Names}}\t{{.Image}}\t{{.Status}}" | grep jimesh'
ssh -F /dev/null -p 2222 jimesh-operator@172.17.0.2 'sudo docker logs jimesh-backend --tail 15'
ssh -F /dev/null -p 2222 jimesh-operator@172.17.0.2 'sudo ss -tlnp | grep 19092'
```

### Binary-Evidenz (laufendes Image, read-only — existenzbeweisende Stufe 2)

```bash
ssh -F /dev/null -p 2222 jimesh-operator@172.17.0.2 'PID=$(sudo docker top jimesh-backend -o pid | sed -n 2p); echo PID=$PID; sudo grep -acF "api/team-bindings/{id}" /proc/$PID/root/server; sudo grep -acF "api/projects/{id}/iac-files/scan" /proc/$PID/root/server; sudo grep -acF "api/projects/{id}/containers/{cid}/logs" /proc/$PID/root/server; sudo grep -acF "api/ssh/explore" /proc/$PID/root/server; sudo grep -acF "api/vault/access" /proc/$PID/root/server; sudo grep -acF "api/security/agent-scan" /proc/$PID/root/server; sudo grep -acF "api/security/findings/dismissed" /proc/$PID/root/server'
```
Erwartet: jedes `grep` gibt **≥1** zurück (Audit-Lauf-Counts: 2/1/1/1/5/1/1). Das Image ist distroless (kein `sh` im Container) — deshalb der Weg über `/proc/<PID>/root/server` vom Host aus.

---

## 6. Grenzen dieses Audits

* **Existenznachweis-Level:** Route-Existenz im laufenden Image ist über Code-Registrierung + Binary-String + Live-Gate belegt — **nicht** das funktionale Verhalten hinter dem Gate (keine authentifizierten Requests; beabsichtigt, s. §4.5).
* **Container-Zeitpunkt:** Backend/Frontend wurden am Audittag neu erzeugt (Image 16:15 UTC, Start 16:20 UTC) — Uptime-Angaben in §3 sind Momentaufnahmen.
* Der Binary-Grep-Pfad (`/proc/<PID>/root/server`) ist PID-dynamisch; das Nachspiel-Kommando löst die PID selbst auf (§5).
