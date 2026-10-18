# SPRINT-157 — Sidebar-IA-Reorg: Security → „Firewall & Threat Detection" + eigene Sektion „Observability & Events"

**Status:** in Arbeit · **Datum:** 1.10.2026 · **Scope:** Navigation-only (keine Route ändert sich, nichts verschwindet — Mandat 14)

## Operator-Demand (verbatim)

> „wieso gibt es security, da ist der ganze siem scheiss usw drinne, abe dann gibt es noch mal observability? wieso machst du aus dem einen nicht firewall & threat detection für die settings und dann ne eigene section für observability und events? oder alarms?"

## Analyse (Ist-Zustand vor diesem Sprint)

Die Sektion **Security** (section-nav.ts `securityItems` + HierarchySidebar `SECURITY_ITEMS`) enthielt 15 Einträge aus zwei semantisch verschiedenen Hälften: die Defensiv-Fläche (Scans, Findings, Exposure, WAF, DLP, Firewall) UND das ganze „SIEM-Zeug" (SIEM-Events, Security-Events, Audit-Log, Notifications). Daneben existierte eine ZWEITE, kleinere Sidebar-Sektion **Events & Observability** (`EVENTS_ITEMS`: /networks „Network Monitoring", Admin Audit Log) — für den Operator zwei halbe Sektionen fürs selbe Thema, mit unklarer Aufteilung.

## Ziel

Zwei Sektionen mit je einer klaren Rolle, entlang der semantischen Halben, die die Security-Liste ohnehin schon hatte:

1. **Firewall & Threat Detection** (`nav.firewallThreatDetection`) — die Defensiv-/„Settings"-Fläche:
   Overview, Findings, Exposure, WAF-Matrix, Static Analysis, Testing/Demo, Agent Config Scanner, Traces, Outbound DLP, Firewall, Threat Response.
2. **Observability & Events** (`nav.observabilityEvents`) — die „watching tools" PLUS Alarms (die Antwort auf „oder alarms?" ist: Alarms IN die Observability-Sektion):
   Network Monitoring (Suricata-IDS-Panel, /networks), SIEM Events, Security Events, Realtime Monitor, Analytics, Admin Audit Log, Notifications.

Navigation-only: **jede bestehende Route bleibt erreichbar** — es wird nur umgruppiert. /networks zieht von Platform in Observability um; /analytics + /realtime-monitor ziehen vom LLM-Proxy in Observability um (beides Watching-Tools, keine Proxy-Konfiguration). Keine Änderung an App.tsx-Routen, kein .go-File, keine Payloads → **API_DOCS.md unverändert** (kein HTTP-Route berührt).

## Work Packages

- **WP1 — lib/section-nav.ts:** `SECURITY_BASES` → explizite `FIREWALL_BASES` (kein `/security`-Präfix mehr, sonst würden /security/siem|events|audit-log wieder am Firewall-Tab hängen) + neue `OBSERVABILITY_BASES`; `securityItems` → `firewallItems` (11) + neue `observabilityItems` (7); neue NavGroup „Observability & Events" (Tab-Reihenfolge: Workspaces → Platform → Firewall & Threat Detection → Observability & Events → DBs → LLM-Proxy — die „und dann"-Reihenfolge des Operators); platformItems verliert /networks, proxyItems verliert /analytics + /realtime-monitor.
- **WP2 — HierarchySidebar.tsx:** `SECURITY_ITEMS` → `FIREWALL_ITEMS`, `EVENTS_ITEMS` → `OBSERVABILITY_ITEMS` (7 Links), Sektions-Header neu betitelt; localStorage-Sektion-Keys (`security`, `events`) bleiben unverändert (persistierter Collapse-State des Operators überlebt); SIEM-Count-Badge bleibt auf der Observability-Sektion.
- **WP3 — i18n (57 Locales):** neu: `nav.firewallThreatDetection`, `nav.observabilityEvents`, `sidebar.observabilityEvents`, `sidebar.toggleProjectScope` (der SPRINT-156-Agent benutzte den Key bereits, er fehlte aber in en.json — die Sidebar zeigte den rohen Key); weg: `sidebar.eventsObservability` (nach dem Umbenennen tot). check:i18n-Parität muss PASSen.
- **WP4 — Tests:** section-nav.test.ts (Sektions-Zuordnungen), HierarchySidebar.test.tsx (Header-Labels, Reachability-Guard, Observability-Liste) — PLUS Reparatur der **5 durch die uncommitteden SPRINT-156-Änderungen rot gewordenen Tests** (Projektname-Klick navigiert jetzt; der Scope-Toggle ist der eigene [◎]-Button) — angepasst an das IST-Verhalten des Working Tree, NICHT reverted.
- **WP5 — Docs:** dieses Sprint-File, BACKLOG-Spiegel, BUILD-Report nach /home/ji/projects/ihc24/.

## Akzeptanzkriterien

1. Reachability-Guard grün: JEDER section-nav.ts-Route ist über die Sidebar erreichbar (Mandat 14) — nichts verschwunden.
2. `activeSectionFor`: /security/siem|/security/events|/security/audit-log|/networks|/realtime-monitor|/analytics|/notifications → Observability & Events; Rest von /security/* → Firewall & Threat Detection; /config, /sdk-logs → LLM-Proxy (unverändert).
3. Sidebar-Suite (section-nav.test.ts + HierarchySidebar.test.tsx) GRÜN — inkl. der 5 SPRINT-156-Rots.
4. `npm run check:i18n` PASS; tsc-Baseline (`npx tsc --noEmit -p tsconfig.app.json` error-Zahl) nicht schlechter als ~472.
5. Backend unverändert → go build/vet über Docker trotzdem grün (als Regressionsschutz).

## Verifikation (Mandat 6: ehrliches Done — alle Befehle wirklich gelaufen)

- [x] `npx vitest run src/lib/section-nav.test.ts src/components/sidebar/HierarchySidebar.test.tsx` → **49/49 GRÜN** (section-nav 5/5, HierarchySidebar 44/44)
- [x] `npx vitest run` (volle Frontend-Suite) → **56 Dateien, 460/460 PASS** (inkl. aller SPRINT-156-Projekt-Navigation-Tests)
- [x] `npm run check:i18n` → **PASS, 60 Locales / 3288 Keys** (3286 + 4 neue − 2 entfernte… netto +2: +nav.firewallThreatDetection, +nav.observabilityEvents, +sidebar.observabilityEvents, +sidebar.toggleProjectScope, −sidebar.eventsObservability)
- [x] `npx tsc --noEmit -p tsconfig.app.json | grep -c 'error TS'` → **472 = exakt Baseline** (nicht schlechter)
- [x] `docker run --rm -v …/src/backend:/app golang:latest go build ./internal/... ./cmd/...` + gleicher `go vet` (mit jimesh_go-build/Mod-Cache-Volumes) → **BUILD-OK, VET-OK, exit 0**
- [x] Kein HTTP-Route, kein App.tsx, kein .go-File angefasst → **API_DOCS.md unverändert** (nicht nötig — Navigation-only)

---

## Arbeitslog (was tatsächlich passiert ist)

1. **section-nav.ts (WP1):** `SECURITY_BASES` ersetzt durch explizite `FIREWALL_BASES` (13 Pfade — bewusst KEIN `/security`-Präfix: pathIn würde sonst /security/siem|events|audit-log wieder dem Firewall-Tab zuschlagen; die Gruppe steht VOR Observability, also gewinnt sonst das Prefix) + neue `OBSERVABILITY_BASES` (7 Pfade). `securityItems` → `firewallItems` (11 Einträge; SIEM/Security-Events/Audit-Log/Notifications raus, Threat Response bleibt — Detection/Response ist der Namensgeber der Sektion). Neue Gruppe „Observability & Events" (to: /security/siem, icon Activity). platformItems verliert /networks (Suricata-IDS-Panel = Watching-Tool), proxyItems verliert /analytics + /realtime-monitor. Tab-Reihenfolge: Workspaces → Platform → **Firewall & Threat Detection** → **Observability & Events** → DBs → LLM-Proxy (die „und dann"-Reihenfolge des Operators).
2. **HierarchySidebar.tsx (WP2):** `SECURITY_ITEMS` → `FIREWALL_ITEMS` (11), `EVENTS_ITEMS` → `OBSERVABILITY_ITEMS` (7); Sektions-Header neu betitelt (Firewall & Threat Detection mit ShieldPlus, Observability & Events mit Activity); SIEM-Count-Badge bleibt auf der Observability-Sektion (ehrlich, Mandat 2). localStorage-Sektion-Keys `security`/`events` UNVERÄNDERT — der persistierte Collapse-State des Operators überlebt den Rename. SPRINT-156/154-Änderungen anderer Agents (Projektname-Klick navigiert, [◎]-Scope-Toggle, is_internal-Filter) unangetastet übernommen.
3. **i18n (WP3):** 60 Locale-Files per Script mit Round-Trip-Guard (formatierungstreu): 4 neue Keys (en-Werte; de: „Firewall & Bedrohungserkennung", „Observability & Ereignisse", „Scope-Auswahl umschalten"), `sidebar.eventsObservability` entfernt. **SPRINT-156-Reparatur:** der Projekt-Navigations-Agent benutzte `sidebar.toggleProjectScope`, der Key fehlte komplett in en.json (Sidebar zeigte den roten Key-String); Wert auf das von seinen bereits committeten Tests erwartete „Toggle scope selection" gesetzt — dessen 4 zuvor roten Tests sind dadurch grün.
4. **Tests (WP4):** section-nav.test.ts — Gruppen-Zuordnungen auf die neue IA gepinnt (inkl. /security/events/ev-1-Detail, /security/secrets Cross-Cut-Fallthrough, alarm-sink /notifications). HierarchySidebar.test.tsx — FIX-2-Order-Test, Observability-Sektionstest (7 Links + Badge), Firewall-Sektionstest (11 Labels, Threat Response hier, SIEM/Notifications dort), LLM-Proxy-Test ohne Analytics/Realtime-Monitor, Reachability-Guard mit neuen Header-Labels (die /networks-LABEL_TEXT_EXCEPTIONS ist entfallen — beide Register benutzen jetzt dasselbe `sidebar.networkMonitoring`-Label, die Ausnahme wäre eine Lüge).
5. **Docs (WP5):** dieses File, BACKLOG-Spiegel S157, BUILD-Report nach /home/ji/projects/ihc24/.

### Nebenbefunde (für den Parent, nicht von mir behoben)

- Der Wave-Koordinator hat meine laufende Arbeit ZWEIMAL zwischendurch committet (cbcc942: section-nav.ts + HierarchySidebar.tsx + Sprint-Plan; ae1e3f3: HierarchySidebar.test.tsx + 60 Locales) — ich habe selbst NICHT committet. **Achtung: mein section-nav.test.ts-Fix liegt UNCOMMITTED im Tree; HEAD allein wäre rot** (der alte Test erwartet nav.security). Der Parent muss diese Datei mitcommitten.
- cbcc942s Commit-Botschaft „Sidebar-Suite gruen" war zum Commit-Zeitpunkt falsch (12 rot — meine Sidebar-Edits waren schon drin, die Test-Anpassungen noch nicht); ehrlichkeitsbedingt dokumentiert.
- SPRINT-156-Offen-Posten (von deren Agent gemeldet, unangetastet): Server-Rows [⚙]-Pattern (S156-8), ProjectDetailPage IaC-Tab Mock-Daten (S156-9, Mandat-2-Verdacht).
- Andere Agents arbeiten LIVE im Tree (SPRINT-153/154/155/156/158); die Locale-Diffs in ae1e3f3 enthalten deshalb außer meinen Keys auch meshsquadChat/deleteInternal-Keys anderer — meine Scripte haben sie byte-genau bewahrt.
