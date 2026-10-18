# SPRINT-147 — Falco+Suricata Threat Correlation: threat-responder's first web surface + real backend fusion

**Status:** 🔨 GEBAUT (28.9. ~07:20-07:45, direkt nachdem SPRINT-144 als Commit `1819c9a`
gelandet ist — siehe "Was ich von der parallelen Session vorgefunden habe" unten). Verifiziert:
`go build`/`go vet` OK, 17/17 neue Go-Tests PASS, `gofmt` sauber, `tsc` 473=Baseline (keine neuen
Fehler), 8/8 neue vitest-Tests PASS, volle Suite 419/419 PASS (411 Alt + 8 Neu), `check-i18n`
PASS (60 Locales, 3187 Keys). **NICHT committed** (Operator-Weisung: alles staged/unstaged für
die morgige Review lassen).

## Auftrag (Operator, 28.9. Nacht, wiederholt)

> "falco tetragon und realtime threat protection ... " (SPRINT-144-Auftrag) + Folge-Weisung:
> das muss jetzt ordentlich fertig gebaut werden — die parallele Session (Bau-Agent H,
> `cmd/threat-responder`) abwarten, dann die ECHTE Falco+Suricata-Korrelation bauen, die
> UIUX-REDESIGN-PROPOSAL-2026-09-28.md §8.1 als fehlende Backend-Voraussetzung benannt hatte.

## Was ich von der parallelen Session vorgefunden habe

Beim ersten Check (`git status --short src/backend/cmd/threat-responder deploy/threat-responder`,
07:18 Uhr): beide Verzeichnisse `??` (untracked), `eve_test.go` zuletzt um 07:15:33 geändert —
also ~3 Minuten alt, aktive Bearbeitung wahrscheinlich. `deploy/threat-responder/README.md`
07:10:53, `ansible-task.yml` 07:05:33 — durchgehend frisch. Ich habe **nicht** die volle
15-Minuten-Wartezeit gebraucht: beim zweiten Check (07:21:46) war der komplette Baustein bereits
als Commit `1819c9a` gelandet (`feat(threat-responder): SPRINT-144 WP2-4 ...`, 13 Dateien,
2676 Zeilen) — das ist das stärkere Stabilitätssignal als unveränderte mtimes (ein Commit ist
per Standing Mandate 4 die Aussage "Parent hat das gesehen und freigegeben"), also direkt
weitergebaut, keine weitere Wartezeit nötig.

Vorgefunden (verifiziert per `git show --stat`, `go build`/`go vet` gegen den committeten Stand):

- `src/backend/cmd/threat-responder/{main.go,docker.go,eve.go,respond.go}` + 2 Testdateien
  (~1625 Zeilen laut Redesign-Proposal, jetzt committed) — ein echter, getesteter Daemon:
  tailt `eve.json` auf SID 8000000-8000099 (jimesh-eigenes Secret-Exfil-Fenster), löst die
  Quell-IP per Docker-Engine-API zu einem Container auf, DETECT (Default) loggt nur
  (`Detection`-JSON-Zeile, `respond.go`), ENFORCE (nur via gitignored `overrides.local.yml`)
  disconnected von JEDEM Netz und pausiert (cgroup freezer).
- `deploy/threat-responder/{ansible-task.yml,defaults.yml,docker-compose.yml,README.md,
  jimesh-secret-exfil.rules}` — GATED wie Suricata (Hand-Deploy, nicht in deploy-all).
  **Wichtiger Fund für dieses Sprint:** `docker-compose.yml` pinnt `network_mode: none` — der
  Responder-Container hat **keinerlei Netzwerk-Stack**, absichtlich (Mandat 12: "zero published
  ports, zero interfaces"). Das hat die Statusendpoint-Architektur direkt bestimmt (siehe unten).
- Ehrlich offen laut SPRINT-144s eigenem Bericht: **kein Deploy gegen einen echten Node**, kein
  eBPF/XDP, **keine eve.json-Ingestion in Postgres** — "die Detection-Records liegen als
  JSON-Zeilen in `docker logs jimesh-threat-responder`". Das ist exakt die Schnittstelle, die
  dieses Sprint anzapft (kein neuer Ingestion-Pfad nötig, nur ein ehrlicher Leser).

## Was ich gebaut habe

### 1. Backend: `GET /api/threat-responder/status` (threat-responders erste Web-Fläche)

`src/backend/internal/gateway/threat_responder.go` (+`threat_responder_test.go`, 9 Tests).

- **Warum SSH statt direktem HTTP-Call:** `network_mode: none` heißt, ein HTTP-Port AUF diesem
  Container wäre exakt die RCE-Fläche, die Mandat 12 verbietet. Also derselbe Weg wie
  `GET /api/suricata/status` (SPRINT-60, `suricata.go`): eine echte SSH-Session zum Node
  (`resolveSuricataTarget` — bewusst wiederverwendet, die Funktion ist trotz Namens generisch:
  Query → globale `ssh_*`-Settings → `ssh_endpoints`-Registry → ehrliches 400), darauf
  `docker inspect` (State/StartedAt) + `docker logs --timestamps --tail N jimesh-threat-responder`
  (read-only, `|| echo MISSING` — "nicht deployed" ist Daten, kein Fehler).
- **Parsing** (`parseThreatResponderProbe`, reiner Test-Seam wie `parseSuricataProbe`): jede
  Log-Zeile wird von zwei Präfixen befreit (`docker logs --timestamps`'s RFC3339-Präfix + der
  Daemon-eigene `log.LstdFlags|Lmicroseconds`-Präfix), dann entweder als Detection-JSON
  geparst (`{"sid":...}`), als Heartbeat-Zeile (Regex gegen `respond.go`s
  `HeartbeatLine()`-Format) oder als Startbanner (`mode=DETECT`/`mode=ENFORCE`) erkannt. Der
  Modus kommt bevorzugt aus dem letzten Heartbeat (aktuellster Stand), fällt sonst auf den
  Startbanner zurück — nie geraten (`mode:""` wenn keins von beiden gesehen wurde).
- **Ehrliche Zustände:** `containerFound:false` (Container nicht deployed/läuft nicht — SPRINT-144
  WP4s eigene dokumentierte Lücke, keine erfundene "healthy"/"down"-Aussage), `heartbeat:null`
  ("noch kein Heartbeat gesehen", keine Nullen vorgetäuscht), unparsbare Detection-Zeilen zählen
  in `parseErrors`, tauchen nie als erfundene Detection auf.
- 9 Tests: Präfix-Stripping, Heartbeat-Parsing, volles Fixture (Startbanner + 1 Detection +
  1 Heartbeat aus einer ECHTEN `docker logs --timestamps`-Zeilenform), Container-fehlt-Fall,
  unparsbare-JSON-Zeile wird gezählt/nie zur Detection, Detection-Limit nimmt die NEUESTEN N.

### 2. Backend: `GET /api/security/threat-correlation` (die eigentliche Korrelation)

`src/backend/internal/gateway/threat_correlation.go` (+`threat_correlation_test.go`, 8 Tests).

Das ist die Backend-Arbeit, die die Redesign-Proposal §8.1 als Vorbedingung für JEDE UI benannt
hatte ("Falco und Suricata/threat-responder sind zwei separate Detection-Pfade, die NICHT
korreliert sind ... kein 'Unified Threat Detection'-Tab, bis diese Backend-Korrelation real
existiert"). Umgesetzt als reine **Fusion bereits real erkannter Ereignisse**, keine neue
Detection-Regel (Mandat 2):

- **Falco-Seite:** ein Read der bereits durchlaufenden Zeilen — `svc.Store.ListSDKLogs(type=audit,
  agent=falco, range, limit)`, exakt dieselbe Query wie `GET /api/sdk/logs?type=audit&agent=falco`
  heute schon beantwortet (`internal/siem/bridge.go` → `transform.go`s `sdkLogFromFalco` schreibt
  diese Zeilen bereits seit SPRINT-32/61 — kein neuer Ingestion-Pfad). Container-Identität kommt
  aus `payload.fields."container.name"`/`"container.id"` (derselbe String-Raum wie
  `ContainerRef.Name` unten — beide sind der "/"-gestrippte Docker-Name).
- **Suricata/threat-responder-Seite:** derselbe SSH-Probe wie oben (Wiederverwendung, damit
  beide Endpunkte nie auseinanderdriften), Detections mit aufgelöstem Container werden zu
  Timeline-Events.
- **Korrelation** (`correlate`): Container-NAME-Gleichheit + Zeitfenster (Default 600s, 60-3600
  konfigurierbar über `windowSeconds`) — kein Match ohne beide Container-Namen (nie erraten).
- **Ehrlichkeit (`buildCorrelationNoteKey`):** ein GESCHLOSSENES Enum
  (`both_unavailable | falco_unavailable | threat_responder_unavailable | no_data |
  no_correlation | correlated`) statt hartcodierter Prosa — die Sprache gehört ins Frontend
  (i18n), nicht in den Go-Handler. Der Endpoint antwortet **immer 200** und degradiert
  pro Quelle (ein Falco-Ausfall darf einen erreichbaren threat-responder nicht verstecken und
  umgekehrt) — nur kaputte Query-Parameter/Non-GET sind harte Fehler.
- 8 Tests: Falco-Payload→Event (inkl. ehrlicher Fallback auf Ingest-Zeit bei unparsbarem
  Payload), nur aufgelöste Detections tragen einen Container, Korrelation innerhalb/außerhalb
  des Fensters, NIE eine Korrelation ohne beide Container-Namen, alle 6 `noteKey`-Zustände.

Routen registriert in `gateway.go` (Zeile neben `/api/suricata/status`, beide Dateien waren zu
Bearbeitungsbeginn clean/unbearbeitet von anderen Sessions — keine Kollision).

### 3. Frontend: `/security/threat-response`

- `src/frontend/src/components/security/threat-response-panel.tsx` (+Test, 4 Fälle) — Status-Card:
  Mode-Badge (DETECT/ENFORCE/unbekannt), Heartbeat-Zähler-Grid, Recent-Detections-Tabelle,
  ehrlicher "nicht deployed"-Leerzustand, 502-Fehler verbatim. 1:1-Stilkopie von
  `suricata-ids-panel.tsx` (gleiche Query-Pattern, gleiche Fehlerdarstellung).
- `src/frontend/src/components/security/threat-correlation-panel.tsx` (+Test, 3 Fälle) —
  vereinheitlichte Timeline (Falco + Suricata Events, neueste zuerst), "Correlated"-Badge auf
  Containern, die in `correlated` auftauchen, die `noteKey`-Nachricht i18n-gerendert (nie
  Backend-Prosa).
- `src/frontend/src/views/ThreatResponsePage.tsx` — beide Panels untereinander, Seiten-Header.
- Route `/security/threat-response` in `App.tsx` (Import + `<Route>` neben `audit-log`).
- Nav-Eintrag in `section-nav.ts`s `securityItems` (neben `audit-log`, "Siren"-Icon,
  `nav.threatResponse`) — genau die Platzierung, die die Redesign-Proposal §8.1 festgelegt hatte
  ("ein neuer Punkt in securityItems, Block 'Monitoring & Audit'"). **Nicht** angefasst: die
  volle Divider-Umgliederung aus Proposal-Abschnitt 5/9-Phase-1 (das ist ein separater,
  noch nicht ausgeführter Auftrag mit eigenem Scope — hier nur der EINE neue Eintrag, surgisch,
  ohne die laufenden Navbar-Quick-Fixes der Parallel-Session anzufassen).
- 61 Locale-Dateien (`en.json` handgeschrieben, die restlichen 59 per neuem
  `scripts/add-sprint147-threat-correlation-i18n.mjs` mit dem ehrlichen Englisch-Fallback
  propagiert — RM35-Präzedenzfall, keine geratenen Maschinenübersetzungen).

## Verifikation

- `make go-build` / `make go-vet` — beide sauber (golang:latest-Container, kein Host-Go).
- `gofmt -l` auf allen 4 neuen Go-Dateien — clean.
- `go test ./internal/gateway/ -run <neue Tests>` — **17/17 PASS**.
- `npx tsc -p tsconfig.app.json --noEmit` — **473 Fehler = exakt die dokumentierte Baseline**,
  keine neuen.
- `npx vitest run` (volle Suite) — **419/419 PASS** (411 vorher + 8 neu).
- `node scripts/check-i18n.mjs` — **PASS, 60 Locales, 3187 Keys**.
- Kein `make redeploy`, kein Zugriff auf den echten `trading`-Node, kein Commit (Operator-Weisung).

## Was ehrlich offen bleibt

1. **threat-responder ist auf keinem echten Node deployed** (SPRINT-144s eigener Stand) — beide
   neuen Endpunkte sind bis zum ersten Hand-Deploy nur gegen `containerFound:false` /
   `threatResponderAvailable:false` testbar. Das ist der ehrliche Zustand, kein Bug.
2. **Falco-Seite hängt an echten, aktuellen `/api/sdk/logs`-Zeilen** — ob gerade reale Falco-Events
   im gewählten Zeitfenster liegen, hängt vom laufenden SIEM-Stack ab (SPRINT-144 WP5, "Falco +
   SIEM + OpenSearch live", ist laut Sprint-144-Doc noch `[ ]` offen). Die Korrelation selbst ist
   real; ob sie heute Nacht etwas zum Korrelieren FINDET, ist eine separate Frage.
3. **Die volle Security-Nav-Umgliederung** (Proposal-Abschnitte 5/6/9-Phase-1: Firewall-Tabs,
   SIEM-Eintrag, Secrets-Top-Level-Punkt, Divider-Blöcke) ist **nicht** Teil dieses Sprints —
   bewusst nicht angefasst, um nicht mit der parallelen Navbar-Quick-Fix-Session zu kollidieren.
   Mein einziger Nav-Edit ist der eine neue `threat-response`-Eintrag.
4. **`internal/security/freeze.go` vs. threat-responders eigener Freeze-Pfad** — von der
   Redesign-Proposal als künftiger SSOT-Cluster-Kandidat geflaggt (zwei unabhängige
   Freeze-Mechanismen für denselben Effekt). Dieses Sprint löst das nicht, flaggt es nur weiter.
5. **BACKLOG.md-Spiegel** — SPRINT-144 hatte das selbst offen gelassen ("File-Scope des
   Bau-Agents"); dieses Sprint hat ebenfalls keinen BACKLOG-Eintrag gesetzt (nicht angefragt,
   Scope war Sprint-Doc + Code).

## Datei-Übersicht (neu/geändert, alles unstaged für die Morgen-Review)

**Neu:**
- `src/backend/internal/gateway/threat_responder.go`
- `src/backend/internal/gateway/threat_responder_test.go`
- `src/backend/internal/gateway/threat_correlation.go`
- `src/backend/internal/gateway/threat_correlation_test.go`
- `src/frontend/src/components/security/threat-response-panel.tsx` (+`.test.tsx`)
- `src/frontend/src/components/security/threat-correlation-panel.tsx` (+`.test.tsx`)
- `src/frontend/src/views/ThreatResponsePage.tsx`
- `src/frontend/scripts/add-sprint147-threat-correlation-i18n.mjs`
- `docs/sprints/SPRINT-147-FALCO-SURICATA-THREAT-CORRELATION.md` (dieses Dokument)

**Geändert:**
- `src/backend/internal/gateway/gateway.go` (2 neue Routen)
- `src/frontend/src/App.tsx` (Import + Route — surgisch neben der Parallel-Sessions
  Navbar-Quick-Fix-Diff, nicht überschrieben)
- `src/frontend/src/lib/section-nav.ts` (1 neuer Nav-Eintrag + `Siren`-Icon-Import)
- 60 `src/frontend/src/i18n/locales/*.json` (neue `nav.threatResponse` + `threatResponse.*`-Keys)

**Nicht angefasst** (bewusst, Kollisionsschutz): `HierarchySidebar.tsx` (die Proposal-Platzierung
war `section-nav.ts`, nicht `EVENTS_ITEMS`), `src/scripts/local-stack.sh` (fremder Diff, nichts
mit diesem Sprint zu tun).
