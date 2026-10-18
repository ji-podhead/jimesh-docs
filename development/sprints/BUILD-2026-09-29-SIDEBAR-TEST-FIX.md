# BUILD-2026-09-29 — SIDEBAR-TEST-FIX (S157 Sidebar-IA-Reorg + S156 Projekt-Navigation): alle Sidebar-Test-Failures behoben & verifiziert

**Agent:** Sidebar-Test-Fix (delegiert von Parent-Session)
**Repo:** /home/ji/projects/jimesh
**Commits:** Fixes geliefert von der S156+Test-Fix-Agentenlinie, Parent-verifiziert + committet als `ae1e3f3` (SPRINT-156 komplett + 13 Sidebar-Test-Fixes); danach `f6241c4` (Chat-Space/Datalake/Protected-Projects-Nachzug). Der Test-Fix-Agent selbst hat NICHT committet (Vorgabe eingehalten).

---

## 1. Auftrag

Nach Commit `cbcc942` (S157 Sidebar-IA-Reorg: Security/Observability/Alarms getrennt, +176 Zeilen section-nav.ts; S156 Projekt-Navigation: Projektname-Klick navigiert statt Scope-Switch, +222 Zeilen HierarchySidebar.tsx) meldete der Parent 13 FAILING Sidebar-Tests. Auftrag: NUR die Tests an die neue Realität anpassen (Sources nur bei echtem Bug), `npx vitest run src/components/sidebar/ src/lib/section-nav.test.ts` muss 0 Failures haben, Full-Vitest ehrlich berichten, tsc-Baseline ~473, check:i18n muss PASSen.

## 2. Was tatsächlich geschah (ehrlich, inkl. Workspace-Race)

Der Workspace wurde während der Sitzung PARALLEL bearbeitet (Shared Workspace, mehrere Agenten der 29.9.-Welle): Bei meinem ersten Lauf (≈ 00:01 Uhr) waren noch **7 Failures** übrig — 6 der 13 gemeldeten hatte `cbcc942`'s eigener Test-Nachzug (S156-Navigationstests: Name-Row navigiert, [◎]-Scope-Aktion, [↗ Open project]) bereits behoben. Während der Analyse lief ein paralleler Writer exakt dieselben S157-Fixes in meine Scope-Dateien (mtimes 00:04–00:08) und committierte indirekt (Parent) als `ae1e3f3`.

Der Test-Fix-Agent hat daraufhin **nicht blind drübergeschrieben**, sondern:
1. den NEUEN Source (section-nav.ts, HierarchySidebar.tsx) vollständig gelesen und die parallelen Fixes Zeile für Zeile gegen die neue Realität verifiziert,
2. die verbleibende Verifikation vollständig durchgeführt (scoped Suite, Full Suite, tsc, check:i18n),
3. einen echten Bug gesucht (siehe §6) — keiner gefunden,
4. nichts außerhalb des Scopes angefasst, nichts committet.

## 3. Die Fixes (alle committet in `ae1e3f3`; gegen den neuen Source verifiziert)

### `src/frontend/src/lib/section-nav.test.ts` (34 Zeilen geändert)
"maps every section route to its group" auf die neue Registry gepinnt:
- `/networks` → `nav.observabilityEvents` (war `nav.platform` — SuricataIdsPanel ist des Operators "Suricata IDS panel")
- `/security/overview`, `/security/scans/sast`, `/security/firewall/rules`, `/security/threat-response` → `nav.firewallThreatDetection`
- `/security/secrets` → `nav.firewallThreatDetection` (FIREWALL_BASES listet die Cross-cuts explizit)
- `/security/siem`, `/security/events/ev-1`, `/security/audit-log`, `/realtime-monitor`, `/analytics`, `/notifications` → `nav.observabilityEvents` (die Watch-Routes fallen durch die EXPLIZITEN FIREWALL_BASES in die danach deklarierte Observability-Gruppe — Reihenfolge ist Teil des Vertrags)

### `src/frontend/src/components/sidebar/HierarchySidebar.test.tsx`
- Scope-Bar-Test: `'Events & Observability'` → `'Observability & Events'` (DOM-Reihenfolge Scope-Bar unterhalb der Sektion bleibt bewiesen)
- Sektionstests: `sectionHeader('Security')` → `sectionHeader('Firewall & Threat Detection')` mit der echten FIREWALL_ITEMS-Liste (Overview, Findings, Exposure, WAF-Matrix, Static Analysis, Testing / Demo, Agent Config Scanner, Traces, Outbound DLP, Firewall, Threat Response — die Watch/Alarm-Einträge sind bewusst NICHT mehr hier erwartet)
- Observability-&-Events-Test: 7 echte Links nach dem Expandieren (Network Monitoring, SIEM Events, Security Events, Realtime Monitor, Analytics, Admin Audit Log, Notifications), SIEM-Count-Badge ehrlich (2 Fixtur-Events, im Empty-Fall kein Badge — Mandat 2)
- LLM-Proxy-Test: Analytics + Realtime Monitor herausgenommen (jetzt in Observability bewiesen, nicht mehr in PROXY_ITEMS)
- Struktureller Reachability-Guard: Sektionsnamen aktualisiert; `LABEL_TEXT_EXCEPTIONS['/networks']` ENTFERNT — seit S157 benutzen section-nav.ts und Sidebar denselben labelKey `sidebar.networkMonitoring`, beide Register stimmen verbatim überein

### `src/frontend/src/components/sidebar/__probe.test.tsx`
Nur Kommentar (i18n-Wert sidebar.toggleProjectScope als Referenz dokumentiert).

### i18n (60 Locales)
`sidebar.toggleProjectScope`: "Toggle project scope" → **"Toggle scope selection"** (de: "Scope-Auswahl umschalten") — konsistent mit Tests + Probe-Helper geändert; das war das vom Commit genannte "i18n-Race".

## 4. Verifikation (alle gemessen NACH den Commits ae1e3f3/f6241c4, Working Tree für Scope-Dateien clean)

| Check | Kommando | Ergebnis |
|---|---|---|
| Scoped Suite | `npx vitest run src/components/sidebar/ src/lib/section-nav.test.ts` | **7 Dateien, 69/69 PASS, 0 Failures** |
| Full Suite | `npx vitest run` | **56 Dateien, 460/460 PASS, exit 0** |
| tsc-Baseline | `npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -c 'error TS'` | **472** (Baseline ~473 — keine neuen Fehler) |
| check:i18n | `npm run check:i18n` | **PASS — 60 Locales, 3288 Keys** |

## 5. Keine Mock-Verstöße in den Tests
Alle Fixes sind Erwartungs-Updates gegen die ECHTE neue Struktur (echte LabelKeys, echte FIREWALL_BASES/OBSERVABILITY_BASES-Semantik, ehrlicher SIEM-Count). Kein Source-Mock, keine erfundenen Fixtures, nichts ausgeschaltet. Der Count-Badge-Empty-Test bleibt Mandat-2-konform: kein Event → kein Badge.

## 6. Bug-Audit des NEUEN Source — Ergebnis: kein echter Bug

Vollständig gelesen: section-nav.ts (456 Zeilen) + HierarchySidebar.tsx (2082 Zeilen). Geprüft:
- FIREWALL_BASES sind bewusst EXPLIZITE Sub-Paths (kein '`/security`'-Prefix), damit `/security/siem|events|audit-log` an die danach deklarierte Observability-Gruppe durchfallen — korrekt und getestet.
- `/security/secrets` + `/security/email` bleiben in FIREWALL_BASES (Sidebar-Navigation-Cross-cuts, die vorher den Security-Tab über den Prefix leuchteten) — Verhalten erhalten, dokumentiert.
- Sidebar-Spiegel 1:1 gegen section-nav.ts verifizert (FIREWALL_ITEMS == firewallItems, OBSERVABILITY_ITEMS == observabilityItems, PLATFORM/DB/PROXY ebenso); localStorage-Sektions-Keys ('security','events') blieben stabil — persistierter Collapse-State überlebt das Renaming (korrekte Migrations-Haltung).
- `/api-docs` ist in `platformItems`, aber NICHT in `PLATFORM_BASES` → `activeSectionFor('/api-docs')` = null, der Platform-Tab leuchtet dort nicht. **Pre-existing** (identisch in cbcc942~1 verifiziert), KEIN S157-Regressions-Fall — aber ein Kandidat für den Backlog, falls der Tab dort leuchten soll.
- Die 3 verbleibenden "Events & Observability"-Nennungen in HierarchySidebar.tsx sind historische KILL-LIST-/Rename-Kommentare ("renamed from …") — korrekt so, kein Code.

## 7. Offene Punkte für den Parent (nicht Scope dieses Agenten)
- Working Tree hat noch uncommittete Doc-Änderungen (docs/API_DOCS.md, docs/sprints/SPRINT-157-SIDEBAR-IA-REORG.md) — vermutlich Parent in Arbeit.
- Untracked Binaries `src/backend/datalaked`, `src/backend/threat-responder` — gehören evtl. in .gitignore statt ins Repo.
- Aus ae1e3f3 gemeldet (dort schon dokumentiert): Server-Rows [⎈]-Pattern (S156-8); ProjectDetailPage IaC-Tab Mock-Daten — Mandat-2-Verstoß (S156-9) — NICHT von diesem Agenten behoben (außerhalb Scope).

**Fazit:** Auftrag erfüllt. Alle Sidebar-Tests passen auf die neue S157/S156-Realität, alle Gates grün, kein echter Source-Bug gefunden, nichts committet, nichts außerhalb des Scopes verändert.
