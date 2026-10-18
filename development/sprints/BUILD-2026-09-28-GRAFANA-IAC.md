# BUILD 2026-09-28 — Grafana-IaC (deploy/grafana als make-redeploy-Service)

**Operator demand:** `make redeploy SERVICE=grafana NODE=trading` failte
live ("Could not find or access .../grafana/defaults.yml") — deploy/grafana/
enthielt nur den SPRINT-57-Compose-Stack, aber KEINE IaC-Dateien. Folge: auf
trading lief NULL Grafana-Container, das Dashboard zeigte nirgends
Monitoring, und die SPRINT-57-Embed-Flaeche (`internal/gateway/embed.go`,
`JIMESH_EMBED_TARGETS`) hatte kein Proxy-Ziel.

**Scope:** reine Deploy-IaC + Runbook. NICHT geaendert: der Compose-Stack
des Operators (basiert auf ji-podhead/Grafana-11.5-with-Prometheus-and-
Docker-Compose — 1:1 uebernommen wie er ist, "kein Slop"), deploy-service.yml
(generisch), Frontend/Gateway-Dateien. Nicht committed — Working Tree.

---

## 1. Task-Struktur (was gebaut wurde)

| Datei | Inhalt |
|---|---|
| `deploy/grafana/defaults.yml` (NEU, 107 Z.) | Staging-Root `{{ jimesh_deploy_root }}/deploy/grafana`, gestagte File-Liste (Compose + prometheus.yml + 2x provisioning + 2x Dashboard-JSON), Container-Liste, Embed-Pfad, Root-URL/Admin-Creds via `lookup(ansible.builtin.env)` aus der Controller-.env (gleiche Mechanik wie deploy/backend/defaults.yml:95 `backend_embed_targets`), Exporter-DSN (spiegelt deploy/postgres/defaults.yml), Probe-Image `curlimages/curl:8.11.1`, Retries 30x5s |
| `deploy/grafana/ansible-task.yml` (NEU, 258 Z.) | Ozone-Muster: compose-check (hard fail) -> Staging 1:1 -> .env-Render (Mode 0600 — Admin-Passwort!) -> `docker compose --profile dash up -d` -> ECHTE Verifikation (Mandat 2) -> ehrliches Ergebnis inkl. NICHT-Gemachtem |
| `deploy/grafana/README.md` (erweitert) | Operator-Runbook: Deploy-Befehl, Was-wird-gemacht (4 Schritte), Was-NICHT, Erwartung, Verifikation, Diagnose-Befehle |
| `docs_dev/sprints/SPRINT-57-NATIVE-DASHBOARD-EMBEDDING-VIA-ROUTER.md` | Nachtrag WP9 (Fall, Bau, Live-Funde, ehrliche Verifikation) |
| `docs/backlog/BACKLOG.md` | Sprint-Spiegel S57-9a..e oben gespiegelt |

**Dispatch:** unverändert generisch — deploy-service.yml laedt
deploy/<service>/defaults.yml + include_tasks ansible-task.yml; der Service
registriert sich allein durch Existenz der beiden Dateien (exakt wie ozone,
im Playbook selbst dokumentiert). Keine Zeile an deploy-service.yml geaendert.

## 2. Der Embed-URL-Contract (aus embed.go, lesend verifiziert)

`src/backend/internal/gateway/embed.go` (SPRINT-57) + deploy/backend:

- **Upstream-URL:** `http://jimesh-grafana:3000` — der BACKEND-Container
  loest den Containernamen auf `jimesh-net` auf (docker DNS).
  `JIMESH_EMBED_TARGETS=[{"name":"grafana","url":"http://jimesh-grafana:3000","path":"/embed/grafana"}]`
- **Pfad:** oeffentlicher Pruefix /embed/grafana bleibt END-TO-END erhalten
  (NICHT gestrippt) — exakt Grafanas offizieller Sub-Pfad-Modus (root_url +
  serve_from_sub_path=true). Grafana antwortet selbst unter /embed/grafana/*;
  der Gateway braucht kein URL-Rewriting. (Escape-Hatch fuer Sub-Pfad-lose
  Apps: Ziel-URL MIT Pfad -> Rewrite-Modus, fuer Ozone Recon vorgemerkt.)
- **Auth:** Session-Gate wie /api/*; SPA-Handoff ?token= -> HttpOnly-Cookie
  Path=/embed -> 302 auf saubere URL.
- **Frontend (Operator-Wunsch "auch die Frontend-Implementierung, kein
  iframe"): bereits vollstaendig aus WP6 vorhanden** — verifiziert, NICHT
  dupliziert (Mandat 14): DashboardsPage.tsx (Route /dashboards, Platform-Nav
  section-nav.ts, i18n 60 Locales, Tests) listet nur GET /api/embeds und
  navigiert VOLL-SEITIG via window.location.assign("<path>?token=...") —
  KEIN iframe; API-Doku existiert in docs/API_DOCS.md, Abschnitt "Native
  Third-Party Dashboard Embedding" (Z. ~1972).

**Was die IaC daraus folgert:** Die gerenderte .env setzt
JIMESH_NETWORK={{ jimesh_network }} (auf trading live verifiziert: Netz
jimesh-net existiert, jimesh-backend haengt dran) -> das external-true-Netz
des Compose matchet. **Host-Ports: NULL** (strenger als Mandat-12-Loopback;
der Session-gepruefte /embed-Proxy ist der einzige Ingress) — deshalb
verifiziert der Task per `docker run --rm --network jimesh-net
curlimages/curl ...`-Probe gegen die Container-Namen. Kein Frontend-/
Gateway-File angefasst.

## 3. Was der Deploy TUT (make redeploy SERVICE=grafana NODE=trading)

1. Hard-fail, falls docker compose fehlt; Staging nach
   /opt/jimesh/deploy/grafana (live verifizierte Konvention — ozone/
   postgres/keycloak liegen dort): docker-compose.yml, prometheus/
   prometheus.yml, provisioning/{datasources,dashboards}, dashboards/
   {postgres,redis}.json — 1:1, unveraendert.
2. Rendert .env dort aus Ansible-Variablen: Netz, Root-URL, Admin-User/
   -Passwort (Quelle: Controller-.env), Exporter-DSNs, Retention — Mode 0600.
3. `docker compose --profile dash up -d` — Pull von 4 Images beim
   Erstdeploy; benannte Volumes (jimesh-dash-*-data) ueberleben Redeploys.
4. **Verifikation (Mandat 2, alles hard-fail mit Diagnose-Befehlen):**
   - 4x Container-Running-State (docker inspect)
   - Grafana http://jimesh-grafana:3000/embed/grafana/api/health — der
     Sub-Pfad-Modus IST der Contract; ein nacktes :3000/api/health wuerde
     ihn nicht beweisen
   - Prometheus /-/ready
   - pg_up 1 am postgres-exporter (echter DB-Scrape; falscher DSN = LAUTER
     Fehlschlag, kein gruenen Luegen-Pod)
   - redis_up 1 am redis-exporter
   - pg_up=1 + redis_up=1 IN Prometheus' TSDB (Scrape-Pipeline Ende-zu-Ende
     — die Dashboards lesen aus Prometheus, nicht direkt aus Exportern)
   - Jeder Probe laeuft auf jimesh-net -> DNS-Aufloesung der Container-Namen
     ist mitbewiesen (die Grundlage des Embed-Proxys).

## 4. Was der Deploy NICHT tut (ehrlich, im Task-Output + README)

- **Backend-Embed-Targets NICHT.** Live-Fund (docker inspect Config.Env):
  der laufende jimesh-backend auf trading hat JIMESH_EMBED_TARGETS NICHT —
  der Container predatiert die Variable, obwohl die Controller-.env sie hat.
  Der Grafana-Stack laeuft nach dem Deploy, aber /embed/grafana geht erst
  live nach: `make redeploy SERVICE=backend NODE=trading`
- **Kein Admin-Passwort-Change:** Grafanas eigener Login gilt (admin /
  jimesh_grafana_change_me sind die bekannten Defaults — via
  JIMESH_GRAFANA_ADMIN_PASSWORD in der .env aendern, VOR dem Deploy).
- Keine Firewall-Aenderung, keine Published Ports, kein Compose-Edit.
- Wazuh-/Ozone-Recon-Embeds: offen (siehe README "Naechste Ziele").

## 5. Verifikationsstand dieser Session (Mandat 2, ehrlich)

- python3 yaml.safe_load: defaults.yml + ansible-task.yml PASS (nach Fix
  zweier when:-Skalare, die mit ' begannen — YAML-Plain-Skalar-Regel).
- ansible-playbook --syntax-check im Repo-eigenen jimesh-ansible-runner:local
  gegen deploy-service.yml mit -e service=grafana: exit 0.
- Live read-only auf trading (ssh BatchMode, sudo -n docker, IPs maskiert):
  jimesh-net existiert; Haupt-Stack up (jimesh-backend/-postgres/-redis/
  -traefik/-keycloak/-vault); KEIN Grafana/Prometheus-Container;
  Staging-Konvention deploy_root/deploy/<svc> bestaetigt; Backend ohne
  JIMESH_EMBED_TARGETS (Config.Env).
- **NICHT getan (per Auftrag):** der Deploy selbst. Der erste echte Lauf ist
  der Operator-Befehl unten; danach zaehlen nur dessen Output und die
  Verify-Schritte im README — keine Behauptung "laeuft" ohne Messung.

## 6. Operator-Befehle

```bash
# 1. Der eigentliche Deploy (vom Repo-Checkout; liest TRADING_HOST/TRADING_USER aus .env):
make redeploy SERVICE=grafana NODE=trading

# 2. Embed-Flaeche aktivieren (Backend-Container kennt die Targets noch nicht):
make redeploy SERVICE=backend NODE=trading

# 3. Verifizieren: Platform -> Dashboards -> Grafana -> "Dashboard oeffnen"
#    (Vollbild, kein iframe; danach Grafanas eigener Login)
```

Erwartung Schritt 1: Staging + Image-Pull (erstes Mal Minuten), dann Retries
(30x5s), bis Grafana gebootet UND Prometheus den ersten 15s-Scrape-Zyklus
durch hat, dann die ehrliche Ergebnis-Meldung des Tasks. Fails sind laut und
nennen Node-seitige Diagnose-Befehle (docker logs ..., compose ps,
curl /api/v1/targets).

*Nicht committed — Working Tree. Keine Secrets gedruckt; trading-IPs in
diesem Report maskiert.*
