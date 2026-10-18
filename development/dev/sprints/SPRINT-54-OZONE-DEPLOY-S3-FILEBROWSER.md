# SPRINT-54 — Ozone-Deploy + S3-File-Browser (echt verdrahtet, nicht nur Container hochziehen)

**Status:** 🔄 GLM baut das gerade parallel (File-Browser-Teil). Dieses Sprint-File ist die
Spezifikation/Abnahmekriterien dafür — siehe auch HANDOFF-2026-09-27.md Nachtrag 2.
**Auslöser:** Operator, 2026-09-27 — Ozone als Object-Storage deployen, für Datei-Browser UND als
S3Sink für den Datalake (siehe SPRINT-55).

---

## Real recherchierte Bausteine (nicht raten, diese benutzen)

- **Deploy-Vorlage:** `github.com/ji-podhead/ozone-with-hue-localstack-and-compose`
  (Operator-eigenes Repo) — als `deploy/ozone/` nach additivem Muster
  (`deploy/falco-gvisor-integration/` als Referenz), `.env`-Variablen statt Klartext-Creds.
- **Dashboard kommt gratis mit:** Ozone Recon (read-only, Cluster-Health, Storage, Buckets/Keys,
  Prometheus-Integration) — kein eigenes Monitoring-UI bauen.
- **Go-Client:** `github.com/aws/aws-sdk-go-v2/service/s3` mit `o.BaseEndpoint =
  aws.String("https://<ozone-s3-gateway>")` — offizielles AWS-SDK, funktioniert gegen Ozones
  S3-Gateway ohne Anpassung.
- **React-Komponente:** `@sqlrooms/s3-browser` oder AWS Amplify Storage Browser als Basis für die
  neue Datei-Browser-UI — NICHT den bestehenden `FileBrowserModal.tsx` (SSH-Explorer,
  `/api/ssh/explore`) umbauen, das ist ein anderer Use-Case, bleibt unverändert.

## Abnahmekriterien (damit's kein toter Code wird)

1. `deploy/ozone/` in `deploy-service.yml`/Makefile registriert, `make redeploy SERVICE=ozone
   NODE=<name>` läuft echt durch.
2. Ozone Recon unter einer echten URL erreichbar, zeigt echte Cluster-Daten (nicht nur "Container
   läuft").
3. Neue Backend-Route (z. B. `GET /api/datalake/ozone/browse`) nutzt echt den aws-sdk-go-v2-Client
   gegen den echten Ozone-S3-Gateway — Live-Test: eine Datei hochladen, per API auflisten, per API
   herunterladen — alle drei Schritte tatsächlich ausgeführt und im Sprint-File mit echtem Output
   dokumentiert (kein "sollte funktionieren").
4. Neue Frontend-Seite (S3-Browser-Komponente) zeigt echte Bucket-Inhalte, ist in der Sidebar-Nav
   verlinkt (NICHT wie `DatalakePage.tsx` nur per direkter URL erreichbar, siehe SPRINT-50-Fund).

---

## Update 28.9.2026 — Abnahmekriterium 1 erledigt: `deploy/ozone/` auf das IaC-Muster gehoben

`deploy/ozone/` bestand bis dahin nur aus einem rohen `docker-compose.yml` + `.env`/`.env.example`
(gedacht für lokales `docker compose up`) — **nicht** nach dem Muster, das jeder andere Service in
diesem Repo befolgt (`deploy/<service>/{ansible-task.yml,defaults.yml}`, dispatcht über
`make redeploy SERVICE=<name> NODE=<name>`). Das ist jetzt nachgezogen, Referenz war
`deploy/tetragon/` (selbst compose-basiert, gestaged + hochgefahren über rohes
`docker compose`-CLI via `ansible.builtin.command` — **nicht** `community.docker.docker_compose_v2`,
aus demselben Grund wie in `deploy/redis/ansible-task.yml` dokumentiert: das Modul bräuchte das
Docker-Python-SDK auf dem Zielnode, real bestätigt fehlend auf egress-beschränkten Hosts).

**Geänderte/neue Dateien:**

- `deploy/ozone/ansible-task.yml` (neu) — staged `docker-compose.yml` + ein aus `defaults.yml`
  gerendertes `.env` nach `{{ jimesh_deploy_root }}/deploy/ozone/`, fährt den Stack mit
  `docker compose --profile ozone up -d` hoch. Verification ist NICHT nur "Container läuft"
  (Mandat 2): nach dem Running-State-Check wartet der Task mit Retries auf echte HTTP-Antworten
  von OM-Web-UI, S3-Gateway und Recon, bevor er ein grünes Ergebnis meldet — Ozones
  scm→om→datanode-Bootstrap kann beim ersten Start länger dauern als ein reiner
  Running-Check abdecken würde.
- `deploy/ozone/defaults.yml` (neu) — Port-Variablen (`ozone_om_port: 9874`,
  `ozone_s3g_port: 9878`, `ozone_recon_port: 9888`), `ozone_host_bind: 127.0.0.1` (Mandat 12: alle
  Ports bleiben loopback-only), Container-Namen-Liste für den Verification-Loop.
- `deploy/ozone/docker-compose.yml` (geändert) — die drei Host-Port-Bindings (`om`, `s3g`, `recon`)
  von hartcodierten Literalen auf `${OZONE_HOST_BIND:-127.0.0.1}:${OZONE_..._PORT:-<default>}:...`
  umgestellt (gleiche `${VAR:-default}`-Konvention wie `deploy/datalake`, `deploy/siem`,
  `deploy/grafana`) — lokales `docker compose up` funktioniert unverändert ohne diese Vars zu
  setzen.
- `deploy/ozone/.env.example` (geändert) — die vier neuen Override-Vars dokumentiert.
- `deploy/ansible/playbooks/deploy-service.yml` (geändert) — `ozone` als gültiger `SERVICE`
  registriert (per Existenz von `ansible-task.yml`/`defaults.yml`, gleiches Muster wie
  `falco-gvisor-integration`), mit erklärendem Kommentar direkt neben dem bestehenden.

**NICHT ausgeführt** — reine Datei-Autorenschaft, exakt wie SPRINT-52s `falco-gvisor-integration`
und der gated-Suricata-Task: kein `make redeploy`, kein Ansible-Lauf gegen einen echten Node in
dieser Sitzung. Ein Operator müsste `make redeploy SERVICE=ozone NODE=<name>` selbst ausführen, um
das zu verifizieren.

**`.env`-Check (uncommitted, wie vom Operator gefunden):** enthält nur `JIMESH_NETWORK=jimesh-net`
— kein `OZONE_S3_ACCESS_KEY`/`OZONE_S3_SECRET_KEY` gesetzt (beide bleiben in `.env.example`
auskommentiert). Keine echten Credentials im File, keine Operator-Aktion nötig.

Abnahmekriterium 1 ("`deploy/ozone/` in `deploy-service.yml`/Makefile registriert, `make redeploy
SERVICE=ozone NODE=<name>` läuft echt durch") ist damit **datei-seitig** erfüllt — der reale
Durchlauf gegen einen Node steht noch aus (s.o.). Abnahmekriterien 2–4 (Recon mit echten
Cluster-Daten, Backend-Route, Frontend-Seite) bleiben offen.
