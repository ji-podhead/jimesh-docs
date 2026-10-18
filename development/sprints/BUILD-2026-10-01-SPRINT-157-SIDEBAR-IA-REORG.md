# BUILD — SPRINT-157 Sidebar-IA-Reorg (01.10.2026)

**Operator-Demand (verbatim):** „wieso gibt es security, da ist der ganze siem scheiss usw drinne, abe dann gibt es noch mal observability? wieso machst du aus dem einen nicht firewall & threat detection für die settings und dann ne eigene section für observability und events? oder alarms?“

## Was gebaut wurde (Navigation-only — keine Route entfernt, keine URL geändert, kein Backend angefasst)

Die alte Security-Sektion (15 Einträge: Defensiv-Tools UND das komplette „SIEM-Zeug“ gemischt) plus der Mini-Stummel „Events & Observability“ (2 Links) wurden sauber in zwei Sektionen mit je einer Rolle geteilt:

### 1. Firewall & Threat Detection (die Defensiv-/Settings-Fläche)
Overview, Findings, Exposure, WAF-Matrix, Static Analysis (IaC/SAST/DAST-Tabs), Testing/Demo, Agent Config Scanner, Traces, Outbound DLP, **Firewall** (Rules/Setup/Traffic/OPNsense-Tabs), **Threat Response** (Falco+Suricata-Korrelation, SPRINT-147 — Detection/Response ist der Namensgeber der Sektion).

### 2. Observability & Events (die Watching-Tools PLUS Alarms)
**Network Monitoring** (/networks — das Suricata-IDS-Panel, SPRINT-60), **SIEM Events**, **Security Events**, **Realtime Monitor** + **Analytics** (beide aus dem LLM-Proxy hierher — Watching-Tools, keine Proxy-Konfiguration), **Admin Audit Log** (RM35), **Notifications** (das „oder alarms?“: die Alarm-Senke wohnt MIT den Watching-Tools). SIEM-Count-Badge der Sektion zeigt weiterhin NUR echte SIEM-Events (Mandat 2: kein Event, kein Badge).

Tab-Reihenfolge oben (navbar, aus dem Modell generiert): Workspaces → Platform → **Firewall & Threat Detection** → **Observability & Events** → DBs → LLM-Proxy.

Technisch wichtig: FIREWALL_BASES ist eine EXPLIZITE Pfadliste (kein „/security“-Prefix) — sonst würden /security/siem, /security/events, /security/audit-log am Firewall-Tab leuchten statt an Observability, obwohl diese Gruppe danach deklariert ist. /security/secrets und /security/email (Sidebar-Navigation-Cross-Cuts) stehen explizit in FIREWALL_BASES und leuchten weiter wie bisher.

## Reachability-Beweis (Mandat 14)
- Sidebar: Observability & Events aufklappen → 7 Links (Network Monitoring, SIEM Events, Security Events, Realtime Monitor, Analytics, Admin Audit Log, Notifications) — alles Klicks auf die unveränderten Routes.
- Sidebar: Firewall & Threat Detection aufklappen → 11 Links; Threat Response dort, nicht in Observability.
- Der strukturelle Reachability-Guard-Test expandiert ALLE Sektionen und prüft JEDE section-nav.ts-Route gegen die Sidebar — 100 % erreichbar, die frühere /networks-Label-Ausnahme ist entfallen (beide Register nutzen jetzt dasselbe Label).

## Geänderte Dateien (nur diese; nichts revertet, keine fremden Dateien angefasst)
1. `src/frontend/src/lib/section-nav.ts` — IA-Rebuild: FIREWALL_BASES/OBSERVABILITY_BASES, firewallItems/observabilityItems, neue Gruppe, Platform − /networks, LLM-Proxy − /analytics − /realtime-monitor
2. `src/frontend/src/components/sidebar/HierarchySidebar.tsx` — FIREWALL_ITEMS/OBSERVABILITY_ITEMS (RM35-Doppelregistrierung), Header-Renames, Badge bleibt; localStorage-Sektion-Keys (security/events) bewusst unverändert → persistierter Collapse-State des Operators überlebt den Rename
3. `src/frontend/src/i18n/locales/*.json` (×60) — +nav.firewallThreatDetection, +nav.observabilityEvents, +sidebar.observabilityEvents, +sidebar.toggleProjectScope, −sidebar.eventsObservability; de: „Firewall & Bedrohungserkennung“, „Observability & Ereignisse“, „Scope-Auswahl umschalten“
4. `src/frontend/src/lib/section-nav.test.ts` — Gruppen-Zuordnungen auf die neue IA gepinnt (inkl. /security/events/:id-Detail, /security/secrets-Cross-Cut)
5. `src/frontend/src/components/sidebar/HierarchySidebar.test.tsx` — Observability-7-Links-Test, Firewall-11-Labels-Test, LLM-Proxy-Test ohne die zwei umgezogenen Tools, Reachability-Guard mit neuen Sektionsnamen
6. `docs/sprints/SPRINT-157-SIDEBAR-IA-REORG.md` — Plan + Arbeitslog + Verifikation
7. `docs/backlog/BACKLOG.md` — Sprint-Spiegel S157

NICHT angefasst (gemäß Scope): App.tsx, gateway.go, alle .go-Files, meshsquad*, plugins*, files* — API_DOCS.md unverändert, da kein HTTP-Route berührt.

## Nebenbefunde, die der Parent kennen muss
- **SPRINT-156-Reparatur mitgeliefert:** deren (uncommittete, dann via Wave committete) Projekt-Navigation benutzte `sidebar.toggleProjectScope`, der Key fehlte KOMPLETT in en.json (die Sidebar zeigte den rohen Key-String als aria-label), und 4 ihrer Tests waren deshalb rot. Key nachgetragen, Wert auf ihre committete Test-Erwartung („Toggle scope selection“) ausgerichtet → deren Tests grün, meine Suite-Akzeptanz erfüllt. NICHT reverted, nur ergänzt.
- **Wave-Koordinator hat meine laufende Arbeit 2× zwischendurch committet** (cbcc942: section-nav.ts + HierarchySidebar.tsx + Sprint-Plan; ae1e3f3: HierarchySidebar.test.tsx + 60 Locales). Ich habe selbst NICHT committet (gemäß Order).
- **⚠️ WICHTIG: `src/frontend/src/lib/section-nav.test.ts` liegt UNCOMMITTED im Working Tree.** HEAD (ae1e3f3) OHNE diese Datei wäre ROT (der alte Test erwartet nav.security/Security-Tab). Parent: diese Datei mitcommitten.
- cbcc942s Commit-Botschaft „Sidebar-Suite gruen“ war zum Commit-Zeitpunkt sachlich falsch (es waren 12 rot, weil meine Sidebar-Edits schon drin waren, die Test-Anpassungen noch nicht) — hier ehrlich dokumentiert.
- Die Locale-Diffs in den Wave-Commits enthalten außer meinen Keys auch die (bereits im Tree liegenden) Keys anderer Agents (meshsquadChat, deleteInternal*, openProject) — mein Locale-Script hat sie byte-genau bewahrt (Round-Trip-Guard), nichts überschrieben.

## Verifikation (alles wirklich gelaufen, 01.10.2026)
| Check | Befehl | Ergebnis |
|---|---|---|
| Sidebar-Suite | `npx vitest run src/lib/section-nav.test.ts src/components/sidebar/HierarchySidebar.test.tsx` | **49/49 PASS** (5 + 44) |
| Full Frontend | `npx vitest run` | **56 Dateien, 460/460 PASS** |
| i18n | `npm run check:i18n` | **PASS — 60 Locales, 3288 Keys** |
| tsc-Baseline | `npx tsc --noEmit -p tsconfig.app.json \| grep -c 'error TS'` | **472 = exakt Baseline** (nicht schlechter) |
| Backend | `docker run --rm -v …/src/backend:/app golang:latest go build ./internal/... ./cmd/...` + `go vet` (mit jimesh_go-build/Mod-Cache) | **BUILD-OK, VET-OK, exit 0** |

## Was der Operator jetzt sieht
- Navbar-Tabs: „Firewall & Threat Detection“ (leuchtet auf Defensiv-Routes) und „Observability & Events“ (leuchtet auf SIEM/Events/Audit-Log/Networks/Realtime-Monitor/Analytics/Notifications).
- Sidebar unten: „Observability & Events“ (7 Links + ehrlicher SIEM-Count), darüber „Firewall & Threat Detection“ (11 Links) — die alte Doppel-Streuung „Security enthält alles + winziges Observability daneben“ ist aufgelöst.
- Deutsch (Locale de): „Firewall & Bedrohungserkennung“ / „Observability & Ereignisse“.

BUILD by SPRINT-157 Sidebar-IA-Reorg Agent — Working-Tree-Lieferung gemäß Order (kein eigener Commit).
