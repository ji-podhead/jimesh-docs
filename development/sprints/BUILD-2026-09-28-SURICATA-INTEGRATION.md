# BUILD-2026-09-28 — SURICATA-INTEGRATION (Suricata sichtbar im jimesh-Dashboard)

Build-Agent: Suricata-Integration (SPRINT-60). Kein Commit (Standing Order). Fremde
Dateien unberührt — gateway.go / section-nav.ts / HierarchySidebar.tsx / BACKLOG.md
haben andere Besitzer bzw. in-flight-Änderungen; deren exakte Edits stehen hier.

## Was gebaut wurde (live-verified)

**Ziel:** Der Operator klickt „Network Monitoring" (sidebar.networkMonitoring → /networks)
und sieht jetzt ECHTE Suricata-Daten: Dienst-Status, Capture-Volumen, letzte Alerts,
ehrliche Leer-/Fehlerzustände. Keine zweite Fläche (SSOT), keine Nav-Änderung nötig.

### 1. Backend — `GET /api/suricata/status` (NEU: `src/backend/internal/gateway/suricata.go`)

- EINE echte SSH-Session via `deploy.DialSSH` (derselbe verifizierte Pfad wie
  /api/ssh/explore und die Deploy-Engine: TOFU-Pinned Host-Keys, gleiche Auth-Kette,
  15s Timeout), EIN read-only Marker-Probe (systemctl is-active/is-enabled/
  list-unit-files, command -v, suricata -V, wc/stat/grep/tail auf
  /var/log/suricata/eve.json + suricata.log). Nichts wird erfunden (Mandat 2).
- **Credential-Kaskade — exakt der /api/projects/{id}/ports-Vertrag**
  (internal/security/exposure.go): Query-Params (`host, port, user, password, keyPem,
  authMethod`) gewinnen; sonst globale Settings `ssh_host/ssh_user/ssh_password/
  ssh_key_pem` (per Feld); sonst der ERSTE `ssh_endpoints`-Registry-Eintrag
  (nur non-secret Felder — die Registry speichert bewusst keine Secrets); sonst ehrliches
  400 mit allen drei Wegen im Meldungstext. SSH-Fehler → 502 mit der echten Meldung.
- **Ehrliche Zustände:** ohne Suricata → `installed:false, status:"not-installed"`
  (nie „gestoppt" gelogen); 0 Alerts → `alertEvents:0, alerts:[]`; 0 Signaturen →
  `signaturesLoaded:0` PLUS die echte Warnzeile aus suricata.log in
  `rulesWarning`; ungelesene Zähler (suricata.log nicht lesbar, eve.json fehlt)
  → `null`, nie 0. Unparsbare Zeilen werden in `parseErrors` gezählt.
- Severity-Konvention roh durchgereicht (Suricata: 1=high, 2=medium, 3=low).

### 2. Frontend — SuricataIdsPanel (NEU + 3 Zeilen-Edits in NetworksPage.tsx)

- NEU `src/frontend/src/components/networks/suricata-ids-panel.tsx`: Status-Badge
  (Active/Inactive/Failed/Not installed/Unknown) + Boot-State, amber Warnbanner wenn
  keine Regeln geladen, 6 Stat-Zellen (Signaturen, kernel_packets, drops+errors,
  eve-Zeilen+Bytes, Alert-Events, Uptime + „letzter eve.json-Schreibzugriff vor Ns"),
  Alert-Tabelle (Zeit, Severity-Badge, Signatur+Kategorie — inert, 5.9.-Präzedenz —,
  `src:port → dst:port`), ehrliche 0-Alerts-Zeile, ehrliches Fehlerbanner (die
  echte 400/502-Meldung 1:1), 30s-Polling, eigener Refresh-Button im Card-Header.
- `NetworksPage.tsx`: Import + `<SuricataIdsPanel />` direkt unter der
  Machines-Tabelle (vor Mesh-Topology) + `invalidateQueries({queryKey: suricataQueryKey})`
  in `refresh()` — der EINE Refresh-Button der Seite gilt für alle Sektionen.

### 3. i18n (check:i18n PASS — 60 Locales, 3058 Keys)

`network.suricata.*` (37 Keys): en + de handübersetzt; die 58 weiteren Locales
bekommen den englischen Fallback-Wert (bestehende Präzedenz, z.B. sidebar.networkMonitoring).
Chirurgische Einfügung nach `topologyUnresolved` in jedem Locale-File — der Rest
jeder Datei bleibt byte-identical (andere Agents haben uncommittete Arbeit in diesen
Dateien). Placeholders `{seconds}`/`{count}` konsistent (Checker grün).

### 4. Tests

- Backend `suricata_test.go` — 19 Tests: Resolver-Kaskade (Query gewinnt,
  Settings-Fallback pro Feld, Registry-Fallback ohne Secrets, Port-Validierung,
  Password→authMethod-Default), Probe-Parser (Live-Fixture: aktiv+2 Alerts+1 kaputte
  Zeile→parseErrors, not-installed, eve fehlt), Route-Tests am echten Store
  (settings_dlp-Test-Muster; SSH-Seams `suricataDial/suricataExec` gestubb —
  nie echtes SSH in Unit-Tests): 405/400-Limit/400-Port, 502 dial (echte Meldung),
  502 exec, 200 aktiv (0 Signaturen = *0, nicht null), 200 not-installed.
- Backend `suricata_live_test.go` — OPT-IN Live-Smoke (skippt ohne
  `SURICATA_LIVE_TARGET`): registriert die Route auf eigenem Mux (validiert die
  exakte Parent-Registrationszeile!), echter DialSSH + TOFU (Throwaway-DB als Store),
  echte read-only Probe. **PASS gegen trading** (s.u.).
- Frontend `suricata-ids-panel.test.tsx` — 6 Tests (jsdom, real Provider,
  fetch-Stubs mit der ECHTEN Wire-Shape): Fixture rendert Badge/Warnung/Alerts/Flow,
  ehrliche 0-Alerts-Zeile, not-installed, 502 verbatim, 400-Remedy verbatim.

## ─── FÜR DEN PARENT: exakte Zeilen-Edits ───

### A) gateway.go — Registration (ICH HABE DIE DATEI NICHT ANGEFASST)

Einzufügen in `New()` direkt nach `s.registerNetworks(mux)` (aktuell ~Zeile 283,
direkt nach dessen Kommentarblock „...documented in API_DOCS.md."):

```go
	// SPRINT-60 (Suricata-Integration): the Network-IDS read surface behind
	// the NetworksPage "Network Monitoring" panel — honest SSH probe of
	// the sensor (service state, capture volume, recent alerts; no data
	// invented). Handlers in suricata.go; documented in API_DOCS.md
	// ("Network IDS — Suricata").
	mux.HandleFunc("/api/suricata/status", s.handleSuricataStatus)
```

Das ist ALLES: Handler ist `(s *Server)` im Package gateway, keine neuen Imports
in gateway.go nötig, kein extra Auth-Wiring (Session-Middleware wrappt den ganzen Mux
wie jeder /api/*-Route; GET ist session-lesbar).

### B) Nav — NICHTS zu tun (bewusst)

/networks ist bereits an BEIDEN Nav-Registern angemeldet (section-nav.ts securityItems
+ HierarchySidebar.tsx EVENTS_ITEMS, `sidebar.networkMonitoring`). Das Panel
erweitert genau diese Seite — SSOT, keine zweite Fläche, keine Nav-Edit-Zeilen nötig.
section-nav.ts und HierarchySidebar.tsx wurden nicht angefasst.

### C) docs/backlog/BACKLOG.md — Spiegel (Datei hat fremde uncommittete Änderungen — Parent trägt ein)

Ganz OBEN einfügen (über `## Sprint-Spiegel S59 …`):

```markdown
## Sprint-Spiegel S60 (Suricata sichtbar: ehrlicher SSH-Reader + /networks-Panel; 28.9.2026 — docs/sprints/SPRINT-60-SURICATA-VISIBILITY.md)

| Nr | Task | Status |
|---|---|---|
| S60-1 | Backend GET /api/suricata/status (gateway/suricata.go: 1 SSH-Session, read-only Marker-Probe, Credential-Kaskade wie /api/projects/{id}/ports, ehrliche Zustände; Registration-Zeile im Build-Report — gateway.go gehört dem anderen Agenten) | [x] erledigt |
| S60-2 | Frontend SuricataIdsPanel auf /networks (Status-Badge, Capture-Stats, Alert-Tabelle, ehrliche 0-/Fehler-Zustände) + NetworksPage-Wiring | [x] erledigt |
| S60-3 | i18n network.suricata.* en+de handübersetzt, 58 Locales English-Fallback; check:i18n PASS | [x] erledigt |
| S60-4 | Tests: Backend 19 (Resolver/Parser/Route, echter Store, SSH-Seams gestubb) + opt-in Live-Smoke (PASS vs. trading); Frontend vitest 6/6 | [x] erledigt |
| S60-5 | Docs: API_DOCS-Abschnitt, Sprint-File SPRINT-60, dieser Spiegel (Edit beim Parent) | [x] erledigt |
| S60-6 | gateway.go-Registration + curl-Smoke am laufenden Stack (nach Landung des anderen Agenten) | [ ] offen — Parent |
```

## Verifikation — was lief, was NICHT lief (Mandat 6)

### GELAUFEN (alles diese Session):

1. `docker run --rm -v …/src/backend:/src -w /src golang:latest go build ./…` → OK
   und `go vet ./…` → OK (ganzer Backend-Baum, zu dem Zeitpunkt grün).
2. `go test ./internal/gateway/` (VOLL: meine 19 + alle vorhandenen) → `ok`.
3. **LIVE-End-to-End-Smoke** (opt-in `TestSuricataLiveSmoke`, Scratch-Worktree,
   Throwaway-DB `jimesh_test` als TOFU-Store, echtes `~/.ssh`, read-only
   Probe) → **PASS**. Antwort von trading (echt, unmaskiert nur die harmlosen Felder):
   `status:"active", enabled:"enabled", version:"This is Suricata version 7.0.3
   RELEASE", installed:true, evePresent:true, eveLines:4866, kernelPackets:1,089,379,
   captureUptime:4217s, signaturesLoaded:0, rulesWarningSet:true, alertEvents:0,
   parseErrors:0` — 20/20 Tests PASS, SCRATCH_BUILD_OK, SCRATCH_VET_OK.
   (Scratch statt Shared-Tree: s. „Nicht gelaufen" Punkt 2.)
4. tsc: `npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -c 'error TS'` → **474**
   (Baseline 477, KEINE Fehler in meinen Dateien — grep suricata/NetworksPage: 0 Treffer).
5. vitest: `suricata-ids-panel.test.tsx` **6/6**; angrenzend `FirewallRulesPage.test.tsx`
   4/4, `HierarchySidebar.test.tsx` 36/36 (Sidebar mit dem Network-Monitoring-Link).
6. `npm run check:i18n` → **PASS: 60 locales, 3058 keys**.
7. Parsing-Annahmen LIVE am Trading-Node per ssh verifiziert (read-only, BatchMode,
   maskiert): is-active=active, is-enabled=enabled, `suricata -V`=7.0.3 RELEASE,
   eve.json kompakt-JSON (keine Leerzeichen nach Doppelpunkten), wächst,
   `grep -c '"event_type":"alert"'`=0 (ECHT — Neustart 01:48 UTC mit leerem Regelsatz,
   suricata.log: „Warning: detect: 1 rule files specified, but no rules were loaded!",
   „0 signatures processed").

### NICHT gelaufen (ehrliche Lücken):

1. **curl-Smoke gegen den LAUFENDEN Backend** — unmöglich: die Route ist noch nicht
   registriert (gateway.go gehört dem anderen Agenten; der Parent wendet Punkt A an).
   Danach: `make restart-backend`, dann
   `curl -s 'http://127.0.0.1:19092/api/suricata/status?host=<trading>&user=<user>&password=<pw>&limit=10' | jq .`
   (oder OHNE Params, sobald ssh_host/ssh_user/ssh_password-Settings gesetzt sind).
2. **go build auf dem AKTELLEN Shared-Tree schlägt derzeit fehl** — an
   `internal/gateway/node_services.go` (Syntaxfehler Zeilen 244/274): das ist eine
   FREMDE, ungetrackte, in-flight Datei eines anderen Agenten (04:51 geschrieben;
   +node_services_test.go hängt davon ab). Ich habe sie NICHT angefasst (Standing
   Order) und stattdessen im Scratch-Worktree ohne genau diese beiden fremden Dateien
   verifiziert (RM35-9-Präzedenz). Der Parent: `make go-build` wiederholen, sobald
   der andere Agent gelandet ist.
3. **Panel im Browser** — braucht die registrierte Route + `make restart-backend`
   + Frontend-Refresh; visuell nicht abgenommen (nur per vitest/jsdom verifiziert).

## Ehrliche Realität auf trading (wichtig für die Erwartung des Operators)

Suricata 7.0.3 läuft aktiv + enabled und capturt (1,09 Mio kernel_packets, eve.json
wächst — 1207 → 4866 Zeilen in ~1h) — ABER: Neustart 01:48 UTC mit LEEREM Regelsatz
(0 Signaturen, „no rules were loaded!"). Das Panel zeigt genau das: grüner
Active-Badge + amber Warnbanner + ehrliche 0 Alerts. Bis auf dem NODE Regeln
installiert sind (suricata-update / et-open — Sensor-Seite, keine jimesh-Lücke),
KANN kein Alert feuern; eve.json rotiert offenbar periodisch (alte Alerts sind weg).

Außerdem ehrlich: Damit das DASHBOARD Trading-Daten zeigt, braucht der BACKEND-SSH-Zugang
auf trading (Container hat kein ~/.ssh, es existieren noch KEINE ssh_*-Settings-Rows):
entweder (a) einmalig `PUT /api/settings/ssh_host` + `ssh_user` + `ssh_password`
(oder `ssh_key_pem`), oder (b) Endpoint über die WorkspaceEndpointsPage registrieren
(Registry liefert non-secret Felder; Passwort/Key braucht trotzdem Weg a oder passwortlose
Auth), oder (c) Route mit Query-Params aufrufen. Die 400er-Meldung der Route nennt alle
Wege wörtlich.

## Geänderte Dateien (nur meine)

| Datei | Art |
|---|---|
| src/backend/internal/gateway/suricata.go | NEU (Handler + Probe + Parser + Credential-Kaskade) |
| src/backend/internal/gateway/suricata_test.go | NEU (19 Tests) |
| src/backend/internal/gateway/suricata_live_test.go | NEU (opt-in Live-Smoke) |
| src/frontend/src/components/networks/suricata-ids-panel.tsx | NEU (Panel) |
| src/frontend/src/components/networks/suricata-ids-panel.test.tsx | NEU (6 Tests) |
| src/frontend/src/views/NetworksPage.tsx | EDIT: 3 Zeilen-Bereiche (Import, invalidate, Render) |
| src/frontend/src/i18n/locales/*.json (60×) | EDIT: network.suricata.* eingefügt, Rest byte-identisch |
| docs/API_DOCS.md | EDIT: Abschnitt „Network IDS — Suricata (SPRINT-60)" |
| docs/sprints/SPRINT-60-SURICATA-VISIBILITY.md | NEU (Plan + Retrospektive) |

NICHT angefasst (Besitzer/in-flight): gateway.go (→ Punkt A), section-nav.ts,
HierarchySidebar.tsx (→ kein Nav-Edit nötig), docs/backlog/BACKLOG.md (→ Punkt C),
node_services.go/node_services_test.go (fremd, in-flight, kaputt).


---

## NACHTRAG (05:15 UTC, kurz nach dem Commit) — Backend-Container crash-loopt (NICHT Suricata-bedingt)

Der Parent hat SPRINT-60 committet (b03e494) und die Registration live ergaenzt
(gateway.go:345). Aber: der Container `jimesh` crash-loopt seit ~03:38 UTC
(RestartCount 97) an einem NETZWERK-Problem:

- Log (jeder Zyklus): `compiling backend… OK` (inkl. meines Commits — doppelter
  Live-Build-Beweis) → `starting JiMesh server…` → `failed to open database:
  dial tcp 172.21.0.2:5432 (jimesh-postgres): connect: connection timed out`.
- Der Container hat GAR KEINEN Egress: auch das apt-Install im Entrypoint schlaegt fehl
  (deb.debian.org unreachable). Postgres selbst akzeptiert lokal Verbindungen
  (pg_isready OK), alle drei Container haengen korrekt auf `jimesh-net`
  (jimesh=172.21.0.5, postgres=172.21.0.2, redis=172.21.0.3).
- => intra-bridge Traffic bricht fuer den jimesh-Container (veth/netns kaputt) oder
  host-weit (iptables-FORWARD/ufw geflusht). Zeitlich korreliert mit den ~03:38er
  SIEM-Staging-Whitelist/Firewall-Parallelarbeiten — NICHT mit meiner Aenderung:
  der Abbruch passiert beim DB-Connect VOR jedem Routing, meine Route wird nie erreicht.

FUER DEN PARENT/OPERATOR: iptables/ufw-FORWARD bzw. den veth pruefen, dann
`make restart-backend` (wartet auf /health). Danach der offene curl-Smoke:
`curl -s http://127.0.0.1:19092/api/suricata/status` — ohne Session kommt 401
(Beweis: Route lebt + Auth-Gate greift), mit gesetzten ssh_*-Settings + Session 200
mit den echten trading-Daten (siehe Live-Smoke-Abschnitt oben).
