# SPRINT-191 — Embedding: Wazuh-/Ozone-Recon, S57-Restposten, Webview-Technik

**Datum:** 7.10.2026 · **Status:** dokumentiert, nicht umgesetzt (Teilstand siehe §0)
**Anlass (verbatim):** „alle sprints schreiben und erstmal pr mergen dann alles machen"
**Recherche:** Subagent-Lauf, Belege `Pfad:Zeile`, Stand `main` = `21cee130`

---

## §0 Warum — was läuft, was fehlt, was heute Morgen passiert ist

**Läuft (S57, live):** Das Gateway-Proxy-Design steht komplett in
`src/backend/internal/gateway/embed.go` — Env-Quelle `:106-112`, JSON-Validation mit
„LOUD stop" `:114-116`, Row-Validierung `:118-146`, ReverseProxy mit Header-Strip
(`X-Frame-Options`/CSP-`frame-ancestors`, `:199-205`) und 502-ErrorHandler `:206-209`,
Registrierung `:217-221`, **Endpunkt `GET /api/embeds`** `:227-243`, Token-Handoff
`?token=` → HttpOnly-Cookie `Path=/embed` + 302 `:261-276`, längste-Präfix-Matching `:285-296`.
Session-Gate: `internal/auth/auth.go:749-767` (`/embed` → Bearer/`validSession`, sonst 401).
Tests gegen echten httputil-Upstream: `gateway/embed_test.go:28-46, :122-131, :182-212`.

**Heute Morgen (7.10., gemessen):** Backend-Redeploy auf `superleo` RC=0, Log-Gate las
aus dem Gateway-Log: *„[embed] SPRINT-57: 1 embed target(s) mounted under /embed/*:
/embed/grafana→http://jimesh-grafana:3000"*, `/api/embeds` antwortet **401 ohne Session**
(Route + Gate aktiv). Damit ist der Teil von S57-9d, der den **Backend**-Container betrifft,
erledigt — SPRINT-57 hatte genau das als Ursache notiert
(`docs/sprints/SPRINT-57-…md:184-188`: „laufender Backend-Container ohne
`JIMESH_EMBED_TARGETS` → zusätzlicher Backend-Redeploy nötig").

**Fehlt (drei echte Lücken):**

1. **Wazuh-Dashboard ist nicht eingebettet.** `deploy/grafana/README.md:302-305`:
   `server.basePath` des OpenSearch-Dashboards ist „noch zu verifizieren — dann nur
   `JIMESH_EMBED_TARGETS` erweitern". Zusätzlich `:298-301`: die Community-Wazuh-Grafana-Dashboards
   (grafana.com 22448/21565/22382) brauchen OpenSearch-/Elasticsearch-Datasources —
   und der laufende Grafana hat **eine einzige**: `provisioning/datasources/prometheus.yml:6-12`
   (Prometheus, `isDefault: true`, `editable: false`). Repo-weiter Grep
   `loki|opensearch|elastic` über `deploy/grafana/dashboards/` → **0 Treffer**.
   → Genau deshalb ist der Wazuh-Weg **Dashboard-Embed**, nicht Grafana-Panel.
2. **Ozone Recon ist nicht eingebettet.** `deploy/grafana/README.md:306-307`: kein Sub-Pfad →
   braucht den **Rewrite-Modus** des Proxys (`embed.go:172-193`, Rewrite/Preserve + `req.Host`).
3. **S57-8 / S57-9d(e) bleiben Operator-Sachen:** `BACKLOG.md:643` (Live-Smoke), `:644`
   (Wazuh/Ozone-Recon-Embedding), `:551` (Deploy auf `trading`), `:552` (Live-Roundtrip
   Platform → Dashboards → Grafana). `:643-644` sind die Aufträge **dieses** Sprints.

**Nebenbefund (Richtigstellung für S189):** `RealtimeMonitor` wurde im PR #28 von recharts/SSE
auf `<WebviewPanelCard instanceId="suricata-monitor" …/>` umgestellt. Repo-weiter Grep
`suricata-monitor` → **genau ein Treffer**, in dieser Datei selbst; der `instanceId` ist nur
ein localStorage-Schlüssel (`lib/widget-config.ts:39`, Speicherung `:61-82`) — **keine
Backend-Instanz**. Die Quick-Links nennen zudem Hostnamen, die es so nicht gibt
(`grafana:3000`/`wazuh:5601` statt `jimesh-grafana` `deploy/grafana/defaults.yml:115` bzw.
`jimesh-siem-dashboard` `deploy/siem/docker-compose.yml:143`).

## WP1 — Wazuh-Dashboard einbetten (Pfad 1: `server.basePath`)

### Was

`wazuh.dashboard` wird ein `/embed/*`-Target wie Grafana — nach Messung des basePath.

### Konkret

- **Portlage vorher messen:** alle published ports sind loopback-only (Mandat 12),
  `deploy/siem/docker-compose.yml:40-41` (Kommentar), `:60-63` Manager,
  `:119-122` Indexer `127.0.0.1:19200`, `:162-163` Dashboard `127.0.0.1:5601`
  (Container `jimesh-siem-dashboard`, `:143`). Im Compose-Netz `jimesh` (`:138`) erreichbar
  über Dienstnamen (`wazuh.indexer:9200`, `:65`).
- Schritt 1: `server.basePath` im laufenden Dashboard **auslesen** (nicht annehmen) —
  die Aussage dazu steht als „noch zu verifizieren" in `deploy/grafana/README.md:302-305`.
- Schritt 2: Target ergänzen (`deploy/backend/defaults.yml:120` →
  `backend_embed_targets`, Formel `JIMESH_EMBED_TARGETS`, Beispiel `.env.example:296`).
  **Kein Handedit in laufender Umgebung** — Pre-Flight verlangt gültiges JSON-Array
  (`deploy/backend/ansible-task.yml:111-112` Bedingung, `:118-132` Assert, `:133-142` rescue
  „LOUD stop") und die `-e`-Übergabe sitzt auf `:195` (single-quoted, S187-Quoting-Fix).
- Schritt 3: Redeploy **backend** (Env sitzt am Gateway, `embed.go:108`), dann Probe über
  `/embed/wazuh` mit Session (401 ohne) — Log-Gate (`ansible-task.yml:245-266`) muss die
  neue Zeile „mounted" melden.
- Hostname im Target = Compose-Dienstname, **nicht** der Quick-Link-Befund aus §0 (dort liegt
  ein Fehler im Frontend-Link, gehört in WP3).

### Acceptance

- [ ] `GET /api/embeds` listet das neue Target (mit Session).
- [ ] `/embed/wazuh` liefert gemessenen `200` (nicht 502, nicht 404) und bleibt hinter dem
      Session-Gate (ohne Session 401, gemessen).
- [ ] Gateway-Log nennt 2 Targets; Deploy RC=0; kein Handedit (Ansible-Weg).

---

## WP2 — Ozone Recon einbetten (Pfad 2: Rewrite-Modus)

### Was

Ein Dienst **ohne** eigenen Sub-Pfad läuft trotzdem unter `/embed/<name>`.

### Konkret

- `deploy/grafana/README.md:306-307` nennt genau diesen Fall (kein Sub-Pfad).
- Der Proxy kann es bereits: Rewrite-/Preserve-Modus mit `req.Host`-Setzung
  `embed.go:172-193`; Pfad-Erhalt ist getestet (`embed_test.go:122-131`).
  Die Regel lautet: **rewrite nur, wenn die App den Pfad nicht kennt** — sonst doppelter Pfad.
- Header: `X-Frame-Options`/CSP werden bereits im `ModifyResponse` entfernt
  (`embed.go:199-205`, Regex `:100`), `req.Host` gesetzt — das ist die Voraussetzung,
  dass Ozone seine eigenen Redirects nicht gegen den Proxy-Host schreibt.
- Achtung Sidebar/Navigation: Ozone ist unabhängig von Grafana geprovisioniert;
  `deploy/grafana/defaults.yml:16-20` sagt explizit, was **nicht** Gegenstand des
  Grafana-Deploys ist (u. a. das Backend-Env) — Ozone bekommt sein eigenes Target,
  nicht „nebenbei" in einem fremden Task.

### Acceptance

- [ ] Target mit Rewrite-Modus konfiguriert, `/embed/<name>/` → gemessener 200.
- [ ] Kein Redirect-Loop (Antwortkette gezählt, nicht „es ging einmal").
- [ ] Duplikat-/Pfad-Validierung greift weiter (`embed.go:132-140`), Tests grün.

---

## WP3 — Frontend-Ehrlichkeit: Links, Presets, Quick-Links

### Was

Die Oberfläche sagt die Wahrheit über die laufende Umgebung.

### Konkret

- **Quick-Link-Hostnamen korrigieren**: `grafana:3000` / `wazuh:5601` existieren im Netz nicht
  (echte Namen: `jimesh-grafana` `deploy/grafana/defaults.yml:115`, `jimesh-siem-dashboard`
  `deploy/siem/docker-compose.yml:143`). Die Links sollen entweder echte Namen verwenden oder —
  weil Ports loopback-only sind (Mandat 12) — **gar keinen direkten Host-Link** anbieten,
  sondern den Embed-Weg (`?token=` → Cookie → 302, `embed.go:261-276`).
- **Presets aus `/api/embeds` statt Hardcode**: die Preset-Liste des Webview-Cards liest den
  Endpunkt bereits (`components/builder/WebviewPanelCard.tsx:99-110`), die Dashboard-Widgets
  nutzen denselben Key (`grafana-dashboards-widget.tsx:68` `name==='grafana'`,
  `query-keys.ts:89` `embedTargets: ['embed-targets']`). Neue Targets aus WP1/WP2 dürfen
  **nicht** an dritter Stelle hartkodiert werden.
- **Leerzustände**: `DashboardsPage.tsx:58-66` (Vollseiten-Handoff `window.location.assign`,
  kein iframe) und `GrafanaPage.tsx:20-21` („ein Button übergibt den ganzen Viewport an
  `/embed/grafana`") sind ehrlich — sie sollen es bleiben, wenn kein Target konfiguriert ist
  (`embed.go:249-252` → 404 ohne Config).

### Acceptance

- [ ] Kein Frontend-Link auf einen nicht existierenden Hostnamen (Grep über die Views).
- [ ] Neues Target erscheint ohne Frontend-Code-Änderung in den Presets (API-Quelle).
- [ ] Frontend-Gates: `npm run build` RC=0, tsc ≤ Baseline (455), vitest Baseline, `check:i18n`.

---

## WP4 — S57-8 / S57-9d(e) abholen (Operator-Runbook)

### Was

Die beiden letzten offenen BACKLOG-Zeilen von S57 bekommen einen nachvollziehbaren Ablauf.

### Konkret

- `BACKLOG.md:643` (S57-8 Live-Smoke), `:644` (S57-9 Wazuh/Ozone-Recon), `:551` (Deploy auf
  `trading` + Backend-Redeploy), `:552` (Live-Roundtrip Platform → Dashboards → Grafana).
- **Was heute schon erledigt ist, wird markiert** (Backend-Redeploy `superleo`, Log-Gate,
  401-Probe — siehe §0), **was nicht geschah, bleibt offen** (`trading`, Roundtrip):
  `deploy/grafana/defaults.yml:16-20` verweist zu Recht darauf, dass `JIMESH_EMBED_TARGETS`
  **nicht** Teil des Grafana-Deploys ist — ein Deploy allein ändert die Zielliste nicht.
- Runbook-Reihenfolge (identisch zu WP1, nur für `trading`):
  Defaults → `make redeploy SERVICE=backend` → Log-Gate lesen → `/api/embeds` (Session)
  → `/embed/<name>` (200) → Roundtrip aus dem Browser.

### Acceptance

- [ ] Jede der vier Zeilen hat entweder einen `record-deploy`-Eintrag oder steht weiterhin
      ausdrücklich auf „offen — Operator" (**kein** Status-Upgrade ohne Beweis).

---

## §7 Reihenfolge

WP1 (klarer Hebel, vorhandene Mechanik) → WP2 (Rewrite) → WP3 (Frontend-Wahrheit) → WP4.

## §8 Bewusst NICHT im Scope

- **Keine neuen Grafana-Datasources** (OpenSearch/Elastic für Community-Wazuh-Dashboards):
  `deploy/grafana/README.md:298-301` lehnt das als eigenständigen Auftrag ab, und S188
  entscheidet erst, welcher Indexer-Weg überhaupt gefahren wird.
- **Kein `iframe` und kein `dangerouslySetInnerHTML`** — die Repo-Konvention steht im Kopf von
  `WebviewPanelCard.tsx:7-18`: eingebettete Oberflächen laufen als **echter Chromium-Container
  mit WebRTC-Video-Stream** (Maus/Tastatur über DataChannel), Render-Zweig `:305-322`,
  Renderer-APIs `ChromiumPluginRenderer.tsx:208/229/242/285`. Ein `iframe` würde nur dort
  auftauchen, wo der Embed-Proxy ohnehin 401 liefert — beides wird nicht vermischt.
- **Config-Zwang**: `widget-config.ts:61-82` speichert Widget-Config bewusst in `localStorage`
  (kein Backend) — das wird in diesem Sprint **nicht** umgebaut.
- **SquadMesh** unberührt.

## §9 Offene Fragen an den Operator

1. WP1: Wazuh mit gemessenem `basePath` einbetten — oder erst `trading` (S57-9d) priorisieren?
2. WP3: Quick-Links durch Embed-Handoff ersetzen (Empfehlung) oder echte Compose-Namen zeigen?
3. Soll `RealtimeMonitor`-`instanceId="suricata-monitor"` dauerhaft nur localStorage bleiben
   (Empfehlung: ja, mit dokumentiertem Key) oder echte Backend-Instanz werden?
