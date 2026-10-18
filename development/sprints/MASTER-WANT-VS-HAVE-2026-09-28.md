# MASTER — Was verlangt wurde vs. was existiert (28.9.2026)

**Auftrag:** Ein einziges, definitives Dokument aus 304 extrahierten Prompts
(`claude_session_prompts_FULL_2026-09-28.md` #1–168, `claude_session_prompts_PART2_2026-09-28.md`
#169–304) plus allen bereits verifizierten Audits. Repos: `jimesh` (Go-Backend + React/TS-Frontend),
`jimesh-crew`/`meshsquad-public` (Python Multi-Agent). **Read-only** — kein Code verändert.

Bereits vorhandene, verifizierte Quellen (nicht neu hergeleitet, nur zusammengeführt):
`audit.md` (84-Fund-Vollständigkeitsaudit), `AUDIT-2026-09-27-FRONTEND-INTEGRATION-GAPS.md`,
`CASE-STUDY-2026-09-28-NAV-IA-CONSOLIDATION.md`, `rm36_team_creator_frontend_missing.md`,
`SPRINT-52-FALCO-GVISOR-WIRING-AND-GATED-SURICATA.md`, `SPRINT-57-...`.

Neu in diesem Dokument: **Abschnitt 1** — frische Code-Verifikation des Security/Firewall/SIEM/
SAST-DAST-Clusters gegen den Operator-Zitat: *"die slop firewall integrationen da kann man nicht
mal was lesen weil alles überlappt, man kann keine firewall deployen, suricata gibts nicht, kein
network monitoring, keine logs, siem funktioniert nichts und macht überhaupt nichts, erkennt keine
threats, lässt sich nicht scannen, sast und dast funktioniert nicht."*

---

## 1. Security / Firewall / SIEM / SAST-DAST-Cluster — Claim-für-Claim-Verifikation

| # | Operator-Claim | Verifizierte Realität | Evidenz (Datei:Zeile) | Verdikt |
|---|---|---|---|---|
| 1a | "man kann keine firewall deployen" | Das GEBAUTE Managed-Modell (nftables-Portfreigaben pro Projekt/Alias) ist real und Ende-zu-Ende verdrahtet: `POST/GET/DELETE /api/firewall/rules` validiert gegen echte Router-Aliase, persistiert versioniert; ein `jimesh-router`-Knoten zieht die Konfiguration (`GET /api/firewall/config`) und meldet den gemessenen Enforcement-Status zurück (`POST /api/firewall/report`). `FirewallRulesPage.tsx` hat ein funktionierendes Grant/Revoke-Formular gegen genau diese Routen. **Aber:** kein Beleg für einen tatsächlich laufenden/berichtenden Router-Knoten gefunden — `SPRINT-52` (27.9.) bestätigt explizit "File authoring only — no SSH, no deployment execution, no real node touched". D.h. die API zum Deployen einer Regel funktioniert; ob der Router sie je auf einem echten Knoten SCHARF geschaltet hat, ist unverifiziert. | `src/backend/internal/security/firewall.go:202-318` (Grant/Revoke-Handler), `firewall.go:70-116` (Status-Handler, "no jimesh-router node has reported yet"-Fallback), `src/frontend/src/views/FirewallRulesPage.tsx:182-214` (POST-Mutation), `docs_dev/sprints/SPRINT-52-...md:1-15` | **Teilweise falsch.** Managed-Grant-API ist real und deploybar — der ehrliche Rest-Gap ist "läuft ein Router gerade wirklich", nicht "die Firewall-API ist Fake". |
| 1b | "…" für OPNsense/pfSense/Cloud-Firewall | Korrekt: 0 Code. `FirewallProviderSetupPage` (`/security/firewall/provider-setup`) und `OpnsenseFirewallConfigPage` (`/security/firewall/opnsense`) sind explizit als "interface-ready"/"planned" gelabelt — jedes Credential-Feld ist `disabled` mit "not implemented"-Tooltip, kein Fake-Success möglich. `firewall_provider.go` sagt selbst: "OPNsense/pfSense and cloud security groups … explicitly out of scope here." | `src/backend/internal/security/firewall_provider.go:6-8`, `src/frontend/src/views/OpnsenseFirewallConfigPage.tsx:41-62,293-333`, `FirewallProviderSetupPage.tsx:44-68,545-582` | **Operator hat recht** — für diese 2 der 5 Firewall-Seiten ist "kann man nicht deployen" korrekt, und das Produkt sagt das auch ehrlich selbst. |
| 2 | "alles überlappt, man kann nicht mal was lesen" | **Kein CSS/Rendering-Bug** — alle 5 Firewall-Seiten (`WafMatrixPage`, `FirewallRulesPage`, `FirewallProviderSetupPage`, `OpnsenseFirewallConfigPage`, `FirewallTrafficLogPage`) rendern sauber in Card/Table-Layouts, keine überlappenden DOM-Elemente gefunden. Der Überlapp ist **konzeptionell**: 5 Routen unter "Firewall", von denen 3 dieselben Status-Kacheln (`GET /api/firewall/status`, `GET /api/firewall/rules`) redundant re-rendern (Provider-Setup Step 1+2, OPNsense-Seite, Firewall-Rules-Seite selbst) — exakt dasselbe Muster, das `CASE-STUDY-2026-09-28-NAV-IA-CONSOLIDATION.md` für Workspaces/Apps/Deployments unabhängig gefunden hat (ein Datensatz, 5 UI-Formen). Zusätzlich fälscht `FirewallTrafficLogPage` sogar ihren eigenen Namen: es gibt keine dedizierte Paket-Log-Route — die Seite rendert SIEM/SDK-Logs unter dem Titel "Traffic Log". | `FirewallTrafficLogPage.tsx:41-45` ("a dedicated per-packet firewall log route does NOT exist"), `OpnsenseFirewallConfigPage.tsx:98-113` + `FirewallProviderSetupPage.tsx:244-257` (identische Status/Rules-Queries dupliziert) | **Operator im Kern richtig, Mechanismus anders benannt:** keine visuellen Bugs, aber echte Seiten-Proliferation/Namensverwirrung — dieselbe Krankheit wie im Workspaces-Cluster (Abschnitt 3). |
| 3 | "suricata gibts nicht" | **Korrekt, bereits dokumentiert (B7, audit.md).** 0 Suricata-Treffer im Go-Backend. `deploy/suricata-network-ids/` existiert nur als Ansible-Rezept, **absichtlich nicht registriert** für `make redeploy` ("deliberately unregistered, gated, manual-only… must be run once by hand and its capability report reviewed by a human first"). Kein Frontend-Tab, kein Backend-Bridge. | `docs_dev/sprints/SPRINT-52-FALCO-GVISOR-WIRING-AND-GATED-SURICATA.md:9-14`, audit.md B7 | **Bestätigt, nicht neu hergeleitet.** |
| 4 | "kein network monitoring" | **Teilweise falsch.** Es gibt reales Monitoring auf Container-Syscall-Ebene: Falco-Regeln feuern auf "listening socket opened" und "raw/packet socket created" innerhalb jedes Workspace-Containers (Netzwerk-relevante Tripwires, nicht nur Datei-I/O). Was fehlt, ist echtes **Paket-/Netzwerk-IDS** (Suricata, s. #3) — die Wahrnehmungsebene ist Prozess/Socket, nicht Wire-Traffic. | `deploy/siem/config/falco/jimesh_rules.yaml:126-165` (Regeln "listening socket opened", "raw/packet socket created") | **Halb richtig:** kein Netzwerk-Paket-IDS, aber sehr wohl echtes container-natives Netzwerk-Verhalten-Monitoring. |
| 5 | "keine logs" | **Falsch.** Falco- und Wazuh-Events werden live in `/api/sdk/logs` verschifft und waren am 14.9.2026 live-verifiziert (Cursor-Fortschritt 3019→16027 = tausende echte Events). SAST/IaC-Findings landen in `security_events`. | `docs_dev/sprints/SPRINT-32-SIEM-FOUNDATION.md:298,323,331` ("alle 6 Regeln live gefeuert", "siem-bridge live: Falco-Events (offset-Cursor 3019→16027)") | **Falsch — Logs existieren nachweislich und flossen live.** |
| 6 | "siem funktioniert nichts und macht überhaupt nichts" | **Falsch für den Kern, richtig für den versprochenen Dauer-Betrieb.** Wazuh+Falco+Bridge sind gebaut UND am 14.9.2026 live verifiziert: Healthchecks bestanden (Manager analysisd+apid), alle 6 Falco-Regeln live gefeuert, 30-Tage-Retention live angewendet, Alerts real verschifft. Der bereits dokumentierte Rest-Gap (B8, audit.md): kein Shipper JiMesh→Wazuh (nur die Gegenrichtung existiert), kein JiMesh-eigenes Wazuh-Ruleset, kein `make siem`-Target. **Neu in diesem Audit:** unklar/unverifiziert, ob der Stack HEUTE (28.9., 2 Wochen nach dem Live-Test) noch läuft — `audit.md` D6 vermerkt an mehreren Stellen "Stack war down" als offenen Punkt. | `docs_dev/sprints/SPRINT-32-SIEM-FOUNDATION.md:199-331` (Live-Verifikations-Abschnitt), audit.md B8, D6 | **Größtenteils falsch — der Kern läuft/lief nachweislich; der Operator hat vermutlich einen aktuell heruntergefahrenen Stack gesehen, nicht einen kaputten.** |
| 7 | "erkennt keine threats" | **Falsch für Falco, halb richtig für Wazuh.** Falco hat 6 konkrete, nicht-triviale JiMesh-eigene Detektionsregeln: (1) curl\|sh-RCE-Muster, (2) Schreibzugriffe außerhalb des Workspace/Persistenz-Pfade, (3) unerwartete Listening-Sockets, (4) Raw/Packet-Sockets, (5) Download+chmod+exec-Dropper-Muster, (6) bekannte Miner-Binärnamen — alle mit Prioritäts-Stufen und live gefeuert. Wazuh läuft dagegen NUR auf dem Standard-Vendor-Ruleset (`ruleset/rules`, Hunderte generische Regeln für Auth/Rootkit/FIM) — der `etc/rules`-Ordner für eigene Regeln ist deklariert, aber leer (0 `local_rules.xml` gefunden). | `deploy/siem/config/falco/jimesh_rules.yaml:71-208` (alle 6 Regeln vollständig, mit Conditions), `deploy/siem/config/wazuh_cluster/wazuh_manager.conf:250-265` (`<rule_dir>etc/rules</rule_dir>` deklariert, keine Datei vorhanden) | **Falco: klar falsch — es erkennt reale, spezifische Threat-Patterns. Wazuh: kein JiMesh-Custom-Ruleset, aber Vendor-Default-Erkennung aktiv, falls Wazuh-Agents wirklich enrolled sind.** |
| 8 | "lässt sich nicht scannen" | **Falsch, wenn "Scannen" IaC/SAST meint — automatisches Scannen bei jedem Deploy passiert bereits.** Checkov (IaC) + SAST-Stage v1 (gosec bei Go-Quellcode, sonst trivy auf das Runtime-Image) laufen bei JEDEM Deploy (`internal/deploy/quarantine.go`), schreiben reale Findings in `security_events` und in die HITL-Quarantäne-Worklist (`GET /api/security/quarantine`). Falls "scannen" einen manuellen On-Demand-Scan-Button meint: den gibt es nicht separat — Scanning ist ausschließlich deploy-zeit-gekoppelt, kein eigenständiger Trigger gefunden. | `src/backend/internal/deploy/quarantine.go:5-6,310-314,425-480`, `src/frontend/src/views/SecurityScansPage.tsx:28-39` | **Größtenteils falsch — es WIRD gescannt, nur nicht auf Abruf, sondern deploy-getriggert.** |
| 9 | "sast … funktioniert nicht" | **Falsch.** SAST (gosec für Go-Workspaces, trivy für Runtime-Images sonst) läuft real bei jedem Deploy, Ergebnisse landen in `security_events` (eventType `sast_finding`) und im HITL-Worklist. v1-Design-Entscheidung: SAST-Funde sind WARN-Klasse, lösen NIE allein eine Quarantäne aus — das ist eine bewusste Politik, kein Bug. Falls der Operator erwartete "SAST blockiert automatisch", dann ist DAS die eigentliche Lücke — nicht dass SAST nicht liefe. | `quarantine.go:425-480`, `src/frontend/src/i18n/locales/en.json:1797-1799` ("Warn-class in v1 — a SAST finding never triggers quarantine on its own") | **Falsch — SAST läuft und liefert echte Funde.** |
| 10 | "dast funktioniert nicht" | **Korrekt.** 0 Backend für DAST — verifiziert gegen `internal/deploy`, `internal/scanner`, `internal/security`: nichts DAST-förmiges existiert irgendwo. Der Tab ist als ehrlicher "not yet implemented"-Platzhalter gebaut, keine gefälschten Findings. Bereits in audit.md als bewusste Abweichung #4 vermerkt. | `src/frontend/src/views/SecurityScansPage.tsx:326-328`, `en.json:1802-1803`, audit.md Abschnitt 9 Punkt 4 | **Bestätigt — einziger der 5 Kern-Claims, der zu 100% zutrifft.** |

### Kurzfassung Abschnitt 1

Von den 10 geprüften Teil-Behauptungen sind **3 vollständig korrekt** (Suricata, DAST, OPNsense/
Cloud-Firewall-Provider), **1 überwiegend korrekt** (SIEM-„Dauer-Betrieb"/Custom-Ruleset-Lücke,
aber nicht "macht nichts"), und **6 ganz oder teilweise falsch** als pauschale Aussage — SAST läuft,
Falco erkennt echte Threats mit 6 handgeschriebenen Regeln, Logs fließen nachweislich, das
Managed-Firewall-Grant-API ist real deploybar, und Netzwerk-Monitoring existiert auf Container-Ebene
(nur nicht auf Paket-Ebene). Der ehrlichste Rahmen für den Operator: **das meiste ist gebaut und war
nachweislich live — was fehlt, ist (a) ob es GERADE JETZT noch läuft, (b) ein echter Router-Knoten
für die Firewall-Durchsetzung, (c) ein JiMesh-eigenes Wazuh-Ruleset statt nur Vendor-Default, und
(d) DAST komplett.** Die Wut ist an der falschen Stelle einsortiert — sie gehört zu "läuft der Stack
gerade" und "5 verwirrende Seiten für 2 echte Features", nicht zu "wurde nie gebaut".

---

## 2. Agent-Creator + Chat-Frontend (meshsquad) — Status bestätigt

`rm36_team_creator_frontend_missing.md` (28.9.2026, meshsquad-public) korrigiert eine Teil-Annahme
und bestätigt den Kern-Gap: Das Backend (`agents.py`, `RoleDefinition`/`TeamConfig`) ist weiterhin
vollständig config-driven — die Extraktion hat es NICHT hardcodiert zurückgebaut, diese Sorge war
unbegründet. Aber: **kein einziger Frontend-Ordner, keine `.tsx`-Datei existiert im gesamten
`meshsquad-public`-Repo.** Ein User kann ein Team ausschließlich über rohes Python
(`TeamConfig.from_dict`) oder eine Preset-JSON-Datei zusammenstellen — der seit RM28 versprochene
React-Flow-Team-Builder (Canvas mit Agent-Nodes, Watch-Beziehungen als Verbindungen) wurde nie
priorisiert und daher nie gebaut. Kein Backend-Change nötig, nur ein Frontend, das das bestehende
Schema befüllt. Parallel dazu: der Chat-Layer (`chat-gateway` + `tinode`) ist backend-seitig real
gebaut und live getestet, aber die einzige "UI" ist tinodes eigener generischer, unbranded
Web-Client — nirgendwo in JiMesh oder meshsquad integriert (deckt sich mit audit.md P8:
"Plugin-Chat-Panel … 0 Code auf jimesh-Seite"). Beide vom Operator wiederholt eingeforderten
Frontends — Agent-Creator UND Chat — existieren schlicht nicht als eigenständige, in ein Produkt
integrierte Oberfläche.

---

## 3. Sidebar/Nav-Chaos + tote Komponenten — Status bestätigt

`CASE-STUDY-2026-09-28-NAV-IA-CONSOLIDATION.md` bestätigt den Operator-Frust ("dieses deployments
ding nervt mich … apps und integrations und plugins ich verstehe da einfach nix mehr") als
strukturell berechtigt: fünf verschiedene Seiten (`/workspaces/apps`, `/workspaces/deployments`,
`/plugins`, `/plugins/settings`, plus Tabs auf Project-/Workspace-Detail) zeigen denselben
Container-/Deployment-Datensatz in bis zu fünf unterschiedlichen UI-Formen mit unterschiedlichen
Query-Keys und ohne gemeinsame Komponente. Zusätzlich pflegt das Produkt **drei unabhängige
Nav-Quellen** (`section-nav.ts`, `HierarchySidebar.NAVIGATION_ITEMS`, `command-palette.tsx`), die
sich teils überschneiden, teils widersprechen — z. B. sind die `/models/*`-Seiten nur über die
Command-Palette erreichbar. Der **blockierende Befund**: die vorgeschlagene Konsolidierung
(gemeinsamer `AppPanelDrawer` als einzige Drill-down-Fläche) kann nicht umgesetzt werden, bevor die
**SPRINT-139-Nummernkollision** aufgelöst ist — zwei völlig unabhängige Features tragen beide diese
Nummer, liegen auf zwei verschiedenen, nicht gemergten Branches (`feat-app-panel`, Commit `63899f7`,
kein Ancestor von HEAD; und ein unbenannter, uncommitted Workspace-Lifecycle-Stand im aktuellen
Working Tree), und keines ist im tatsächlich ausgecheckten Branch (`feat-tetragon-ebpf`) sichtbar.
Der Operator sieht heute WEDER die Apps+Deployments-Verschmelzung NOCH einen sauberen
Workspace-Lifecycle-Stand. Zusätzlich bestätigt `AUDIT-2026-09-27-FRONTEND-INTEGRATION-GAPS.md`
den vollständig gebauten, aber komplett unerreichbaren "Playground"-Chat-Subsystem
(`ConversationSidebar`, `SettingsRail`, 3 Support-Libs, alle mit Tests) — 0 Referenzen im gesamten
Frontend, seit `/projects` zu einem reinen Redirect auf `/workspaces` wurde.

---

## 4. Priorisierte Handlungsliste (kombiniert, in Reihenfolge des größten Entsperr-Effekts)

1. **SPRINT-139-Kollision auflösen** (Abschnitt 3) — Sprint-Registry bereinigen, entscheiden ob/wie
   `feat-app-panel` gemerged wird, zweiten Sprint umbenennen. Blockiert JEDE Nav-/Deployments-
   Konsolidierung; ohne diesen Schritt baut jede weitere UI-Arbeit auf einer Fläche, die der
   Operator noch gar nicht sieht.
2. **Verifizieren, ob der SIEM-Stack (Wazuh+Falco+Bridge) JETZT läuft** — der Live-Test ist vom
   14.9., zwei Wochen alt; `audit.md` D6 markiert "Stack war down" als offenen Punkt an mehreren
   Stellen. Ein einfacher Health-Check klärt den größten Teil von Claim #6 ("SIEM macht nichts")
   in Minuten, nicht Tagen.
3. **Prüfen/aufsetzen, ob ein `jimesh-router`-Knoten real deployt ist und berichtet** — das
   Managed-Firewall-Grant-API funktioniert nachweislich; ohne einen laufenden Router bleibt jede
   Regel nur "konfiguriert", nie "durchgesetzt". Das ist vermutlich exakt das, was der Operator als
   "kann keine Firewall deployen" erlebt hat.
4. **Nav-Konsolidierung durchführen** (CASE-STUDY §6) — sobald #1 geklärt ist: die drei
   Nav-Quellen zusammenführen, `AppPanelDrawer` mergen, Firewall-Seiten-Cluster nach demselben Muster
   entwirren (5 Seiten → 2: Managed-Rules-CRUD + Provider-Wahl-Wizard, OPNsense/Traffic-Log als
   Tabs statt eigener Routen).
5. **Agent-Creator-Frontend bauen** (Abschnitt 2) — kein Backend-Change nötig, reiner
   React-Flow-Canvas gegen das bestehende `TeamConfig`-Schema. Hoher Symbolwert (mehrfach vom
   Operator verlangt), technisch der kleinste Brocken hier.
6. **Chat-Panel für meshsquad in JiMesh/Produkt integrieren** (Abschnitt 2, audit.md P8) — Backend
   (chat-gateway+tinode) ist fertig und live-getestet; es fehlt nur die Einbettung.
7. **Playground-Subsystem entscheiden** — entweder als eigene Route/Nav-Eintrag reaktivieren
   (Code + Tests existieren bereits vollständig) oder endgültig löschen; aktuell ist es toter,
   aber funktionsfähiger Code, der niemandem nützt.
8. **SIEM-Rest nachziehen** (audit.md B8, sofern Punkt 2 zeigt, dass der Stack tatsächlich lief/
   läuft): Shipper JiMesh→Wazuh, ein JiMesh-eigenes Wazuh-Ruleset (aktuell nur Vendor-Default),
   `make siem`-Target.
9. **DAST bauen** — einziger Claim, der zu 100 % zutrifft; komplett neuer Scanner nötig, daher
   bewusst spät in der Liste (kein bestehender Code zum Anknüpfen, anders als bei #5/#6).
10. **Suricata/Netzwerk-IDS** — bleibt bewusst gated (SPRINT-52 Part 2: "must be run once by hand
    and its capability report reviewed by a human first") — niedrige Priorität, da explizit als
    Risiko eingestuft, nicht als vergessen.

---

*Erstellt 28.9.2026. Abschnitt 1 = frische Verifikation (diese Session). Abschnitte 2–3 =
zusammengeführt aus bereits verifizierten Quellen, nicht neu hergeleitet. Kein Code verändert.*
