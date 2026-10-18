# SPRINT-136 — WAF-Matrix + DLP-Live-Inspector (feat-waf-dlp)

> Branch: **feat-waf-dlp**. Design-Audit P1: die zwei fehlenden
> Security-Features aus Backlog #082 (Exposed-Ports-WAF-Matrix) und
> #172 (Outbound-DLP „Live Inspector"). Beide sind reine Frontend-Arbeit
> auf bereits existierenden Backend-Endpunkten — kein neuer
> Backend-Endpoint wird in diesem Sprint erfunden (Mandat 2).

## Ziel

1. **WAF-Matrix (#082):** eine Matrix, die pro Project/Workspace zeigt,
   welche Ports exponiert sind und ob der Coraza-WAF davor sitzt:
   Rows=Ports (aus dem ECHTEN Exposure-Scan), Columns=WAF / Rate-Limit /
   Geo, pro Port ein ehrliches aktiv/inaktiv-Badge.
2. **DLP-Live-Inspector (#172):** eine „Live Inspector"-Sektion auf der
   DlpSettingsPage, die den LIVE gemessenen Hook-Zustand zeigt. Da es
   KEINEN Backend-Endpoint für DLP-Events gibt (der Hook wendet sein
   Verdict in-place an und persistiert KEINE per-event records), zeigt
   die Sektion ehrlich: den Live-Status + die Notiz, dass ein Event-
   Stream einen Backend-Endpoint braucht — keine Mock-Zeilen (Mandat 2).

## Plan (Work Packages)

| WP | Inhalt |
|---|---|
| WP-1 | views/WafMatrixPage.tsx (neu, Route /security/waf-matrix): GET /api/security/exposure (?all=1 bzw. ?project=<id>) als einzige Datenquelle; WAF-Badge = gemessenes Signal „Port wird vom Coraza-Sidecar jimesh-waf-* (Image 'jimesh-waf') publiziert" (deploy: projects_ssh.go wafRunCommand — mit WAF hält die SIDECAR den einzigen -p-Bind); Rate-Limit/Geo = ehrliches „inaktiv" mit Begründung aus dem Code (der Sidecar shippt nur OWASP-CRS, kein rate_limit-Directive — cmd/waf-sidecar/Caddyfile; Geo-Filter existiert nirgends, Firewall-Quellen sind IP/CIDR-validiert — firewall_rules.go). Workspace-Join: jimesh-waf-<wsId> → GET /api/workspaces (nameKey ist bei Workspace-Deploys die wsId, projects_ssh.go TASK-037) |
| WP-2 | Erreichbarkeit (Mandat 14): Route in App.tsx, Nav-Eintrag in lib/section-nav.ts (Security-Sektion, hinter Exposure), Link von der SecurityExposurePage |
| WP-3 | Mock-Aufräumung: components/workspaces/WorkspaceWAFSection.tsx (hartcodiert „Active (Filtering)", „0 (24h)" — exakte Mandat-2-Verletzung) von der SecurityExposurePage entfernen und die Komponente löschen; die ehrliche Matrix ersetzt die Lüge |
| WP-4 | DLP-Live-Inspector-Sektion auf der DlpSettingsPage: Live-Status (reaktiver Query auf GET /api/settings/dlp_enabled, 10s-Poll = der Zustand, den dlpScan() WIRKLICH konsultiert — subagents.DLPEnabled()), ehrliche Event-Stream-Notiz („DLP event stream requires backend endpoint": der Hook persistiert keine events; Blocks landen nur als decidedBy='dlp' im Tool-Call-Ledger — Link auf /subagents/tool-calls), Null Mock-Zeilen |
| WP-5 | i18n: neue wafMatrix.*-, dlp.inspector*- und nav.wafMatrix-Keys in en.json (+ de.json echt übersetzt), Rest via scripts/backfill-i18n.mjs (S55-Standard), check:i18n grün |
| WP-6 | Docs: dieses Sprint-File, Backlog-Spiegel (#082/#172 in docs + docs_dev), REQUESTS-TRACKING D9 |

## Akzeptanzkriterien

- [x] Matrix zeigt ausschließlich Zeilen aus dem echten Exposure-Report
      (kein synthetischer Port), mit ehrlichen leeren Zuständen.
- [x] WAF-Spalte: „aktiv" NUR wenn der Scan den Port beim Sidecar
      jimesh-waf-* sieht; sonst „inaktiv" — nie behauptet.
- [x] Rate-Limit-/Geo-Spalte zeigen ehrliches „inaktiv" + die
      code-verifizierte Begründung, warum es diese Schutzschicht (noch)
      nicht gibt — als Abwesenheit dokumentiert, nicht vorgetäuscht.
- [x] DLP-Live-Inspector zeigt den Live-Zustand des Hooks und die
      ehrliche Notiz; keine erfundenen Event-Zeilen.
- [x] Seite ist erreichbar: Security-Nav + Link von der Exposure-Page
      (Mandat 14) — Klick-Pfad: Security-Tab → „WAF-Matrix" bzw.
      Exposure-Page → „WAF-Matrix öffnen"; zusätzlich Command-Palette
      (p-waf-matrix).
- [x] tsc --noEmit -p tsconfig.app.json: 0 NEUE Fehler — A/B gegen den
      per git stash ermittelten Clean-Tree-Baseline (501 real errors);
      NEW-Errors-Menge leer (comm: leer); die 3 verschwundenen Fehler
      sind der gelöschte Mock (TS6133 ShieldAlert) + 2 Fixes der
      Parallel-Session im Sidebar-WIP.
- [x] npm run check:i18n grün (60 Locales, 2876 Keys).

## Was gebaut wurde

### Frontend — WAF-Matrix (#082)

- **views/WafMatrixPage.tsx (neu, ~400 Z.)** — Route /security/waf-matrix.
  Datenquelle ist ausschließlich GET /api/security/exposure: Scope-Select
  „Alle Nodes" → ?all=1 (lokal + jede Projekt-Node mit SSH-Host), konkrete
  Projekt-Wahl → ?project=<id> (beides echte Backend-Filter, exposure.go).
  Pro Node eine Matrix-Karte: Rows=Ports (Risiko-sortiert wie die
  Exposure-Page), Columns Port / Bind+Container / Project-Workspace /
  Erreichbarkeit / **WAF** / **Rate-Limit** / **Geo**.
  - WAF-Badge „aktiv" (emerald) NUR wenn docker_container mit
    jimesh-waf- beginnt bzw. docker_image === 'jimesh-waf' — das
    gemessene Signal „der Coraza-Sidecar hält die einzige -p-Publikation
    dieses Ports" (projects_ssh.go wafRunCommand/wafContainerName).
    Tooltip nennt den Container; sonst ehrlich „inaktiv" (muted).
  - Rate-Limit/Geo: überall ehrlich „inaktiv" mit Tooltip-Begründung,
    column-header-tooltips + drei Legende-Tiles mit derselben,
    code-verifizierten Begründung: kein rate_limit-Directive im Sidecar
    (cmd/waf-sidecar/Caddyfile: nur coraza_waf + reverse_proxy), Router-
    Inbound-Enforcement ist allow/deny; Geo: firewall_rules.go validiert
    Source als IP/CIDR, keine Komponente resolved Länder. Dokumentierte
    Abwesenheit statt fake Grün (Mandat 2).
  - Workspace-Join: GET /api/workspaces → Containername enthält wsId
    (nameKey ist bei Workspace-Deploys die wsId, projects_ssh.go TASK-037)
    → Scope-Zelle zeigt „Workspace <wsId>" + Project. Backend-Attribution
    (project_id/project_name) hat Vorrang; ohne beides ehrlich
    „Kein Project".
  - Aggregat-Tiles (Nodes/Ports/extern erreichbar/WAF-gefrontet) sind
    Summen über den Report; „0 von N Ports sind WAF-gefrontet"-Notiz
    wenn kein Sidecar gemessen wurde; Scan-Fehler (ss_error/docker_error)
    erscheinen als Warnstreifen, checkedAt als Zeitstempel.
- **types/domain/security.ts (neu)** — ExposurePort/ExposureNode/
  ExposureReport aus der SecurityExposurePage extrahiert (byte-identisch
  zu exposure.go); beide Seiten teilen jetzt DIE Form.
- **Erreichbarkeit (Mandat 14):** App.tsx-Route „waf-matrix",
  section-nav securityItems-Eintrag (ShieldCheck, direkt hinter Exposure),
  Command-Palette p-waf-matrix, Link-Karte auf der SecurityExposurePage.
- **Mock-Aufräumung:** components/workspaces/WorkspaceWAFSection.tsx
  GELÖSCHT (hartcodiertes „Active (Filtering)", „Threat Injections
  Blocked 0 (24h)", Aikido-„Configure Key"-Deko — ohne jede Datenquelle
  die exakte Mandat-2-Verletzung; einziger Konsument war die
  SecurityExposurePage, grep-verifiziert). Ersetzt durch die ehrliche
  Link-Karte auf die echte Matrix.
- **views/WafMatrixPage.test.tsx (neu):** 2 Tests gegen echte Provider
  (I18nProvider/react-query/MemoryRouter) mit Fetch-Stubs in echter
  Wire-Shape — (1) genau der Sidecar-Port ist „active", alle anderen
  Spalten „inactive" (1×active, 5×inactive), Workspace-Join sichtbar;
  (2) ohne Sidecar: 0×active, 3×inactive + „0 of 1 ports are
  WAF-fronted". 2/2 PASS.

### Frontend — DLP-Live-Inspector (#172)

- **views/DlpSettingsPage.tsx** — neue „Live Inspector"-Karte (zwischen
  Regel-Tabelle und Pre-Ledger-Note):
  - LIVE-Zustands-Chip: emerald+pulsierend wenn an, muted wenn aus —
    gespeist aus dem bestehenden Query auf GET /api/settings/dlp_enabled,
    der jetzt alle 10 s pollt (der Zustand, den subagents.DLPEnabled()
    bzw. dlpScan() WIRKLICH konsultiert; Flips von anderen Surfaces und
    der Restart-Persistence-Load erscheinen live).
  - Status-Block: was JETZT mit Tool-Call-Responses passiert (gescannt +
    Verdict-Semantik vs. ungeskannt durchgereicht).
  - Ehrliche Stream-Notiz (amber): „DLP event stream requires backend
    endpoint" — der Hook wendet Verdicts in-place an und persistiert KEINE
    per-event-Records; Blocks landen nur als decidedBy='dlp' im
    Tool-Call-Ledger (verlinkt auf /sessions), Redaktionen schreiben nur
    das gespeicherte Result um. KEINE erfundenen
    Tool/Timestamp/Latency/Payload-Zeilen (Mandat 2).
  - „zuletzt gemessen"-Zeile aus enabledQuery.dataUpdatedAt.
  Der Toggle-/Save-Flow ist unberührt (desired-Adoption-Effect greift
  weiter nur bei desired === null).

### i18n

- 55 neue Keys: wafMatrix.* (44), dlp.inspector* (10), nav.wafMatrix —
  en + de echt übersetzt, 58 Locales en-Fallback via
  scripts/backfill-i18n.mjs. check:i18n: 60 Locales, 2893 Keys (2876 meine +
  17 sidebar.*-Keys der Parallel-Session, s. Parallel-Kollision), grün.

### Verifikation (Mandat 6 — was LIEF, was nicht)

- `tsc --noEmit -p tsconfig.app.json`: Clean-Tree-Baseline per
  `git stash` A/B ermittelt (501 real errors nach TS6305-Filter) →
  mit meinen Änderungen 498; **NEW-Errors-Menge leer** (comm -13 leer).
  Vorgefundene TS6305-Stale-Output-Fluktuation des inkrementellen Builds
  wurde gefiltert (reproduzierbar zwischen zwei Läufen desselben Trees).
- `npm run check:i18n`: grün (60 Locales, 2893 Keys — 55 meine + 17
  sidebar.*-Keys der Parallel-Session, s. Parallel-Kollision).
- vitest: WafMatrixPage.test.tsx 2/2, section-nav.test.ts 4/4,
  NewProjectDialog-Suite unberührt grün. Voll-Suite: 278 PASS; die
  einzigen Failures liegen in HierarchySidebar.test.tsx — der LIVE
  laufenden Parallel-Session (s. u.), nicht diesem Sprint: die Datei
  wuchs während meiner Testläufe von 14 auf 21 Tests, Fehler kamen und
  gingen mit deren WIP-Stand; ohne meine Änderungen liefen die damals
  vorhandenen 14/14 grün.
- eslint auf allen berührten Dateien: meine Dateien clean (WafMatrixPage,
  test, command-palette, section-nav, query-keys, types/security); die
  gemeldeten Probleme in DlpSettingsPage (13 Regex-Escapes aus den
  verbatim dlp_hook.go-Patterns + 1 set-state-in-effect des bestehenden
  desired-Adoption-Effects, nur Zeilen-verschoben) und SecurityExposurePage
  (6 bestehende load-in-Effects) sind pre-existing, keines durch mich neu.
- Live-Smoke am laufenden Stack: NICHT gelaufen (Stack down in dieser
  Umgebung) — Operator-Check: `make up`, dann /security/waf-matrix
  öffnen (Scan läuft gegen den echten Local-Node) und auf /security/dlp
  den Live-Chip beim POST-Save flippen sehen.

### Parallel-Kollision (wie S134/S135 dokumentiert)

- Commit bbfb85d (fix-project-server-select: NewProjectDialog-Refactor)
  landete WÄHREND dieses Sprints auf dem ausgecheckten Branch feat-waf-dlp
  (shared checkout) — nicht mein Commit, ohne Überlappung mit meinen
  Dateien, im Branch belassen statt History-Rewrite am aktiven Tree.
- HierarchySidebar.tsx + HierarchySidebar.test.tsx + NewProjectDialog.tsx
  werden von der Parallel-Session live weitergebaut (WIP, uncommitted) —
  von diesem Sprint bewusst NICHT angefasst und NICHT committed.
- EINE Ausnahme, ehrlich notiert: die 60 Locale-Dateien führen 17
  sidebar.*-Keys der Parallel-Session MIT (deren Backfill lief über
  denselben shared Checkout; chirurgisches Herausschneiden aus 61 Dateien
  hätte deren Live-WIP riskiert). Die Keys sind in allen 60 Locales
  vollständig — check:i18n ist damit an jedem Zwischenbaum grün
  (2893 Keys); ohne Mitnahme wäre der Commit-Baum i18n-rot.
- Endzustand der Kollision: die Parallel-Session hat ihren Sidebar
  UX-Final-Commit (67160cc, 17:54) über den SHARED INDEX gezogen und damit
  den zu diesem Zeitpunkt gestagten kompletten S136-Feature-Satz
  mit-committet (WAF-Matrix + DLP-Inspector sind namentlich in deren
  Commit-Message genannt). Sämtlicher S136-Code liegt damit auf
  feat-waf-dlp — gemischt mit deren Sidebar-Arbeit in EINEM Commit;
  ein History-Rewrite zur Trennung hätte die noch laufende Session
  gefährdet und unterblieb bewusst (S134/S135-Präzedenz). Dieser
  Sprint dokumentiert den Anteil stattdessen hier und in den
  Backlog-Spiegeln.
