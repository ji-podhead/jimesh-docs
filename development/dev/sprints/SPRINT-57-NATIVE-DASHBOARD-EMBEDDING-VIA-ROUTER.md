# SPRINT-57 — Native Third-Party-Dashboard-Embedding (Grafana/Wazuh/Ozone Recon) via Router

**Status:** ✅ IMPLEMENTIERT (Branch `feat-native-embedding`) — Backend, Frontend,
Deploy und Docs in einem Change; Live-Smoke am laufenden Stack steht dem
Operator offen (siehe Akzeptanz).

---

## Der Auftrag, präzise (nach mehrfacher Klärung, KEIN Agent-Browser/Neko-Thema)

Fremde Web-Dashboards (Grafana, Wazuh, Ozone Recon — alle heute neu hinzugekommen) sollen NATIV
im jimesh-Dashboard erscheinen, nicht als kaputtes Iframe mit X-Frame-Options-Block.

## Was schon existiert, das dafür genutzt werden kann

**jimeshs Identity-based Router** (#079, real, Commit `beddaa8`) — reverse-proxied bereits
path-basiert (`/ws/{wsId}/app/{port}`) für interne Workspace-Apps, RS256+JWKS-Auth,
Ownership-Gate (`sub≠ownerSub→403`).

**Unverifiziert, echter nächster Rechercheschritt:** proxied dieser Router aktuell NUR gegen
jimesh-eigene Workspace-Container, oder ist er generisch genug für ein beliebiges externes Ziel
(Grafana/Wazuh/Ozone Recon)? Muss im echten Router-Code geprüft werden, bevor man annimmt, es
"geht einfach so".

## Real bestätigt: Grafana unterstützt das offiziell

`root_url` + `serve_from_sub_path` in Grafanas eigener Config — offizieller, dokumentierter
Reverse-Proxy-Unterpfad-Modus, genau für diesen Zweck gebaut.
Quelle: https://grafana.com/tutorials/run-grafana-behind-a-proxy/

**Noch zu prüfen, nicht angenommen:** ob Wazuh-Dashboard und Ozone Recon dieselbe Art
Sub-Path-Unterstützung haben, oder ob deren jeweilige X-Frame-Options/CSP-Header das verhindern.

---

## Die Antwort auf Claude's offene Frage (echter Code gelesen, erster Schritt)

`#079` lebt in **`src/backend/cmd/jimesh-router/wsproxy.go`** (nicht
`workspace_routes.go`):

1. **Die Proxy-Mechanik ist generisch** — `httputil.NewSingleHostReverseProxy`
   auf ein beliebiges Ziel, Director stript den Präfix, WebSockets/SSE reiten mit.
2. **Das Gate ist bewusst workspace-gebunden**: die Routing-Tabelle kommt
   ausschließlich aus dem Control-Plane-Pull (Workspace-Rows, Status
   `deployed`, `ownerSub`-Ownership-Check), der Listener ist der FIXE
   Loopback-Port des Router-Nodes (127.0.0.1:3100), Auth ist ein Keycloak-
   JWT **Bearer-Header** — ein Browser kann bei einer Navigation keinen
   Header setzen, und der Router-Node liegt nicht auf der Dashboard-Origin.

→ **Entscheidung (Schritt 3 des Plans):** Der browser-fassende Same-Origin-Proxy
kommt in den **Gateway** (der die Session-Auth UND den Traefik-Platz auf der
Dashboard-Origin besitzt), mit exakt derselben Reverse-Proxy-Mechanik wie
wsproxy. Der Router selbst bleibt unangetastet — sein Workspace-Vertrag
bleibt 1:1.

## Was gebaut wurde (Work Packages)

- [x] **WP1 Backend — Embed-Proxy** (`src/backend/internal/gateway/embed.go`):
      Konfiguration `JIMESH_EMBED_TARGETS` (JSON `[{name,url,path}]`), Route
      `/embed/{name}/*` (längste Präfix-Übereinstimmung), öffentlicher Pfad
      bleibt upstream erhalten (Grafanas `serve_from_sub_path`-Modus);
      Ziel-URL MIT Pfad = Rewrite-Modus (documented escape hatch für
      Sub-Path-lose Dashboards wie Ozone Recon). `X-Frame-Options` wird
      gestrippt, CSP nur um `frame-ancestors` erleichtert; X-JiMesh-*
      Header leaked nie ins Ziel. Unkonfiguriert = ehrliche 404er (Mandat 2).
- [x] **WP2 Backend — Session-Gate** (`src/backend/internal/auth/auth.go`):
      `/embed*` hängt am selben Fail-Closed-Gate wie `/api/*`
      (Bearer / `jimesh_session`-Cookie / `?token=`). Der `?token=`-Handoff
      (`embed.go`): SPA navigiert mit Token → Gateway setzt HttpOnly-Cookie
      `Path=/embed` → 302 auf die saubere URL (Token bleibt nie in der
      History); alle Assets/XHR/WS des Dashboards reiten auf dem Cookie.
- [x] **WP3 Backend — Liste**: `GET /api/embeds` (session-geprüft) liefert
      die echte Konfiguration — die Dashboards-Page erfindet nichts.
- [x] **WP4 Backend — Tests** (`embed_test.go`): Parsing/Defaults/Duplikate,
      Präfix-Matching, Pfad-Erhalt, Rewrite-Modus, Header-Strip, Cookie-Handoff
      — gegen einen ECHTEN httptest-Upstream (kein Dashboard gefaked).
- [x] **WP5 Traefik**: `/embed` an die Backend-Router-Regel —
      `src/scripts/local-stack.sh` + `deploy/backend/ansible-task.yml` (+
      `defaults.yml` führt `JIMESH_EMBED_TARGETS` auf Node-Deploys ein).
- [x] **WP6 Frontend** (`src/frontend/src/views/DashboardsPage.tsx`, Route
      `/dashboards`, Platform-Tab): Launcher über `GET /api/embeds`;
      „Dashboard öffnen" = VOLL-SEITIGE Navigation zu
      `/embed/{name}?token=…` — **die Page IST die Route**, kein iframe,
      voller Viewport; ehrlicher Empty-Error-State ohne Targets.
      Nav (`lib/section-nav.ts`), i18n (`dashboards.*` + `nav.dashboards`,
      en+de übersetzt, 60 Locales, check:i18n PASS).
- [x] **WP7 deploy/grafana** (Vorlage ji-podhead/Grafana-11.5-with-
      Prometheus-and-Docker-Compose, KEIN Envoy — trading fährt Traefik):
      Grafana **11.5.0** im offiziellen Sub-Pfad-Modus
      (`root_url=http://localhost:8090/embed/grafana`,
      `serve_from_sub_path=true`), Prometheus v3.1.0,
      postgres-/redis-exporter gegen die ECHTEN jimesh-postgres/jimesh-redis,
      Provisioning (Datasource + Dashboards-Provider) und die mitgelieferten
      Dashboards postgres.json (9628, für Docker-Realität entk8s-t) und
      redis.json (11835, file-provisioning-tauglich). Opt-in-Profil `dash`,
      externe Netz-Anbindung, KEINE host-Ports (Mandat 12) — der Session-
      geprüfte Embed-Proxy ist der einzige Ingress.
- [x] **WP8 Env + Docs**: `.env`/`.env.example` (JIMESH_EMBED_TARGETS & Co.),
      `docs/API_DOCS.md` §Embedding, Backlog-Spiegel, dieser Sprint-File,
      `deploy/grafana/README.md` (Operator-Flow).

## Verifikation (real ausgeführt — am sauberen Branch-Checkout)

Alle Checks liefen gegen einen frischen Worktree-Checkout des Commits
(`feat-native-embedding`, final `20c5fb3`) — NICHT gegen den gemeinsamen
Working Tree, in dem parallel eine zweite Session (SPRINT-55/138/RM35)
mit ungecommiteten Änderungen arbeitet:

- `go build ./...` (ganzes Modul — das, was `make go-build` kompiliert) RC 0.
- `go vet ./internal/gateway/ ./internal/auth/` RC 0.
- `go test ./internal/gateway/ -run TestEmbed` PASS (6 Tests, echter
  httptest-Upstream).
- `docker compose -f deploy/grafana/docker-compose.yml --profile dash
  config -q` RC 0 (Services: grafana, prometheus, postgres-exporter,
  redis-exporter).
- `npx vitest run src/views/DashboardsPage.test.tsx` 4/4 PASS
  (node:20-Container, echtes `npm ci` gegen den Lockfile).
- `check:i18n` PASS (60 Locales / 2926 Keys).
- `tsc --noEmit -p tsconfig.app.json`: 478 Fehler = exakt der bekannte
  at-HEAD-Baseline („478→478“ wie in den Vor-Sprints); 0 in den Dateien
  dieses Sprints (DashboardsPage, section-nav, App.tsx-Anteile).
- **Vorbehalten (Live-Smoke am laufenden Stack, Operator):** `make up` +
  `docker compose -f deploy/grafana/docker-compose.yml --profile dash up -d`
  + `make restart-backend`, dann Platform → Dashboards → Grafana öffnen;
  im Sandbox-Stack lief kein Postgres, daher kein Live-Roundtrip.

Hinweis Working Tree: `make go-build` im GEMISCHTEN Working Tree schlägt
an `cmd/datalaked` fehl (kgo-API-Drift aus go.mod-Änderungen der
Parallel-Session) und `internal/gateway` kompiliert dort erst mit deren
ungecommiteten admin_audit.go/files.go — das ist NICHT Gegenstand dieses
Branches; der saubere Branch-Checkout ist vollständig grün.

## Nächste Schritte (offen, ehrlich)

1. **Wazuh:** deploy/siem läuft im `siem`-Profil; prüfen, ob das
   OpenSearch-Dashboard `server.basePath` sauber mitmacht — dann nur
   `JIMESH_EMBED_TARGETS` erweitern. Header-Test bleibt wie im Plan
   beschrieben gegen einen echten Aufruf zu machen.
2. **Ozone Recon:** kein Sub-Pfad-Support → Rewrite-Modus der Ziel-URL
   nutzen (siehe embed.go-Kommentar); nach dem Ozone-Deploy (SPRINT-54/138)
   verdrahten.

---

## Nachtrag 28.9.2026 — WP9: Node-Deploy-IaC (make redeploy SERVICE=grafana)

**Der Fall, der es verdient hat:** Operator-Rückmeldung, `make redeploy
SERVICE=grafana NODE=trading` FAILT ("Could not find or access
.../grafana/defaults.yml") — WP7 lieferte den Compose-Stack, aber nie die
IaC-Dateien; deploy-service.yml's "Load service defaults"-include hatte
kein Ziel. Folge: auf trading lief KEIN Grafana-Container, und die ganze
SPRINT-57-Embed-Fläche hatte nichts zum Proxien (Frontend-/Dashboards-
Page hätte ehrlich `[]` gezeigt bzw. 404).

**Gebaut** (Muster: deploy/ozone — compose-staging, raw docker CLI,
Overrides via gitignored overrides.local.yml):

- `deploy/grafana/defaults.yml` — Staging-Root (`{{ jimesh_deploy_root }}/
  deploy/grafana`), File-Liste (Compose + Provisioning + 2 Dashboard-JSONs +
  Prometheus-Config), Container-Liste, Embed-Pfad, Root-URL/Admin-Creds via
  lookup aus der Controller-`.env` (gleiche Mechanik wie
  deploy/backend/defaults.yml:95), Exporter-DSN (spiegelt
  deploy/postgres/defaults.yml), Probe-Image (curlimages/curl:8.11.1),
  Retry-Parameter.
- `deploy/grafana/ansible-task.yml` — Compose-Check (hard fail), Staging
  1:1, `.env`-Render (Mode 0600 — Admin-Passwort!), `docker compose
  --profile dash up -d`, dann ECHTE Verifikation (Mandat 2): 4×
  Running-State, Grafana `http://jimesh-grafana:3000/embed/grafana/api/health`
  (Sub-Pfad-Modus = der Embed-Contract; OHNE Host-Port, per Probe-Container
  auf jimesh-net — beweist auch die DNS-Auflösung, auf die der Proxy baut),
  Prometheus `/-/ready`, `pg_up 1`/`redis_up 1` direkt an den Exportern
  (falscher DSN failt LAUT), pg_up/redis_up in Prometheus' TSDB
  (Scrape-Pipeline Ende-zu-Ende). Ehrliches Ergebnis mit den NICHT
  gemachten Dingen.
- `deploy/grafana/README.md` — Operator-Runbook (Deploy-Befehl, Erwartungen,
  Verifikation, Diagnose; explizit: der Deploy wired NICHT die Backend-
  Embed-Targets — s.u.).

**Live verifiziert (read-only auf trading, 28.9.2026):** `jimesh-net`
existiert; Haupt-Stack läuft (jimesh-backend/-postgres/-redis/-traefik …);
KEIN Grafana/Prometheus-Container; Staging-Konvention `$deploy_root/deploy/
<svc>` etabliert (ozone/postgres/keycloak liegen dort). **Und der Fund,
der den Runbook-Absatz "was der Deploy NICHT macht" verdient hat:** der
laufende `jimesh-backend` hat `JIMESH_EMBED_TARGETS` NICHT im Env
(docker inspect Config.Env — der Container predatiert die Variable), die
Controller-`.env` hat sie aber. D.h. nach dem Grafana-Deploy ist noch
`make redeploy SERVICE=backend NODE=trading` nötig, damit
`/embed/grafana` live geht.

**Frontend-Teil des Nachtrags (Operator-Frage "auch die Frontend-
Implementierung, kein iframe"):** bereits vollständig aus WP6 —
Verifikation dieser Session: `DashboardsPage.tsx` (Route /dashboards,
Platform-Nav-Eintrag section-nav.ts, `window.location.assign(`${path}?token=…`)= VOLL-SEITIG, kein iframe), Tests grün laut WP6-Verifikation,
i18n in 60 Locales, API-Contract `GET /api/embeds` dokumentiert in
docs/API_DOCS.md §"Native Third-Party Dashboard Embedding" (Zeile ~1972).
KEIN zweiter Bau — Mandat 14 (Ghost-Code-Verbot) schreibt vor, das
Existierende zu verifizieren statt zu duplizieren.

**Verifikation dieses Nachtrags:** `python3 -c "import yaml;
yaml.safe_load(...)"` über beide neuen YAML-Dateien (Repo-Präzedenz) —
PASS. Der Deploy selbst wurde von dieser Session NICHT ausgeführt
(Auftrag: Dateien bauen, der Operator deployed) — der erste echte Lauf
ist `make redeploy SERVICE=grafana NODE=trading` + Backlog-Eintrag
S57-9 unten.
