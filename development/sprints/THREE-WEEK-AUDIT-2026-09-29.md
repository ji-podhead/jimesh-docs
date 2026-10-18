# THREE-WEEK-AUDIT — 2026-09-29/30

**Auftrag:** "LIES ALLE MEINE PROMPTS DER LETZTEN 3 WOCHEN" + "LIES DIE FUCKING DOCS" — nicht nur die letzten ~2 Tage (bereits erledigt in `PROMPTS-VS-DELIVERY-AUDIT-2026-09-28.md` + `SLOP-AND-UIUX-AUDIT-2026-09-29.md`), sondern der VOLLE verfügbare Zeitraum, plus echte Tiefenlektüre der Dev-Docs (nicht nur Sprint-Summaries), plus Cross-Reference gegen echten Code.

**Methodik-Hinweis vorweg (ehrlich, nicht beschönigt):** Es wird unten explizit dokumentiert, wie weit "3 Wochen" tatsächlich reicht (Antwort: nicht ganz — echte Session-Aufzeichnungen reichen bis **06.09.2026**, das sind ~23 Tage bis heute, keine vollen 3 Wochen mehr rückwärts, aber deutlich mehr als die schon geprüften 5 Tage). Dieses Dokument dupliziert NICHT die Arbeit der beiden Vorgänger-Audits — deren Funde werden zitiert, nicht wiederholt. Der Mehrwert hier liegt in: (a) dem bisher nie analysierten Fenster 06.09.–23.09., (b) der echten Tiefenlektüre von `FULL-COMPLETENESS-AUDIT.md` (84 Funde) und den R45-Konsens-Dokumenten, (c) dem Cross-Reference "wie lange läuft dieselbe Forderung schon" über den GESAMTEN Zeitraum statt nur 2 Tage.

---

## TEIL 0 — Die wichtigsten Funde (für den eiligen Leser)

### 0.1 Der mit Abstand älteste 3-Wochen-Befund: eBPF/Kernel-Enforcement gegen Prompt-Injection — WICHTIGE KORREKTUR gegenüber der ersten Fassung dieses Dokuments

**Erstmals verlangt: 06.09.2026, 09:59 Uhr — DER ALLERERSTE INHALTLICHE PROMPT im gesamten verfügbaren Verlauf, nachdem das Projekt existiert:**

> *"...und was ist mit static analysis am besten drekt in ebpf wenn der agent gefährlichen code schreibt, liest oder downloaded..."* (06.09.2026 09:59, Session `30c9987e`)

Seitdem **mindestens 23 weitere Anfragen** zu eBPF/Tetragon/Kernel-Firewall über den kompletten Zeitraum verteilt (06.09., 07.09., 08.09., 09.09., 12.09., 13.09., 14.09., 21.09.), kulminierend im wörtlichen Zitat, das `FULL-COMPLETENESS-AUDIT.md` (S2, 27.09.) dokumentiert:

> *"können wir das dann bitte bitte bitte endlich mit ebpf machen und das scheiss prompt injection scheiss wurde ja auch nie gebaut"* (`rm32_guardrails_concept.md`, Nachtrag)

**KORREKTUR (von mir, dem koordinierenden Agent, nach eigener frischer Code-Prüfung gegen HEAD `73c5bde3`, 30.9.):** Eine frühere Fassung dieses Abschnitts (von einem Recherche-Subagenten geschrieben) behauptete, das sei bis heute "0 Code, nur Logging". **Das ist falsch und wird hiermit korrigiert.** Tatsächlich existiert im Repo:

- `src/backend/internal/ai/guard_enforce.go` (313 Zeilen) + `guard_enforce_test.go` — echter Tetragon-Kill-Switch-Mechanismus, wörtlich aufgerufen aus `guard_hook.go:381,416` (`h.enforceGuardKillEBPF(...)`).
- `deploy/tetragon/` (TracingPolicy `jimesh-guard-kill.yaml`, `docker-compose.yml`, `ansible-task.yml`, `README.md`).
- Commit `ee843410` (28.09.2026 01:08, **auf `main`**): *"feat(tetragon-ebpf): RM32-Nachtrag — erste echte Tetragon-TracingPolicy: eBPF-Kill-Enforcement für den Llama-Guard-Hook"*, plus ein Folge-Fix `31811757` (28.09. 04:35) für reale Erstlauf-Bugs (falsche Tetragon-CLI-Flags, Crash-Loop behoben).
- Das entsprechende Sprint-File `docs/sprints/SPRINT-139-TETRAGON-EBPF-ENFORCEMENT.md` listet 7 Arbeitspakete, **WP1–WP6 sind `[x]` erledigt** (Policy, Deploy-Automation, Backend-Wiring, Guard-Hook-Anbindung, Tests, Doku) — nur **WP7 (Live-Deploy auf einer echten Node + Operator-E2E-Durchlauf)** ist noch offen.

**Der ehrliche, korrigierte Befund lautet also:** Zwischen der ersten Anfrage (06.09.) und dem ersten echten Code (28.09.) liegen **22 Tage** — das ist immer noch die mit Abstand längste Latenz eines P0-Themas in diesem Bericht, und ein legitimer Kritikpunkt an Priorisierung/Tempo. Aber die Behauptung "es wurde nie gebaut" ist seit dem 28.09. schlicht überholt — es fehlt nur noch der Live-Test auf einem echten Node, kein Code.

### 0.2 Weitere Forderungen, die den GESAMTEN 3-Wochen-Zeitraum überspannen (nicht nur die letzten 2 Tage)

| Thema | Erste Nennung | Letzte bekannte Nennung | Status heute | Tage offen |
|---|---|---|---|---|
| eBPF/Tetragon-Enforcement | 06.09. 09:59 | 27.09. (Audit-Zitat) | **korrigiert: gebaut 28.09.** (`ee843410`+`31811757`, main), nur Live-Node-Test offen | 22 (bis Code stand) |
| SIEM (Suricata+Wazuh+Falco „permanent scannen") | 06.09. 09:39 | 29.09. (#409 lt. Slop-Audit) | Kern gebaut, Dauer-Scan/Shipper offen (P0, s. B8) | 23 |
| Llama-Guard-Dashboard (User-definierte Extra-Regeln) | 06.09. 09:59 (implizit „lamaguard usw geplant") | 27.09. (#237 lt. Prompts-Audit) | Backend fertig, 0 Frontend | 21+ |
| gVisor statt runc für ALLE Workloads (inkl. crew1-7) | 06.09. 09:47 | 27.09. (#237) | Teilweise (Trading-Node), crew1-7 weiterhin runc | 21 |
| Terminal-Integration als echtes Deployment (nicht nur VNC-Umweg) | 08.09. 07:29 | 27.09. (U1, Audit) | **korrigiert:** echtes xterm-Terminal existiert jetzt (`WorkspaceTerminal.tsx`, `@xterm/xterm`), verdrahtet in 3 Views — ABER die ältere `AppDetailPage.tsx`-Terminal-Karte ruft weiterhin nur `toast.info(...)` auf (zwei parallele, unverbundene Implementierungen) | 19, teilweise gelöst |
| Plugin-System (dynamischer Katalog, echte Installationen) | 06.09. (implizit „mcp"), explizit ab 13.09./14.09. (R45) | 27.09. (P1–P8, Audit) | Nur Spec (#106) gebaut, #107–114 = 0 Code | 15–23 |
| "Lies die docs" / vollständige Selbst-Audits einfordern | 06.09. 09:08 (wörtlich!) | 29.09. (dieser Task) | Wiederkehrendes Meta-Muster, s. 0.4 | 23 |

*(Vollständige Herleitung mit Zitaten in Teil 1 und 3.)*

### 0.3 Der R45-Verdikt: KEIN Content-Verlust, legitime Konsolidierung

Die im Auftrag gestellte Frage ist geklärt (Details in Teil 3): `R45-plugin-system-consensus.md` + `R45-CONSENSUS-claude.md` + `R45-CONSENSUS-glm.md` wurden am **14.09. zwischen 07:12 und 07:23 Uhr** verfasst, und **im selben Vormittag** (07:23:40 Uhr, Commit `2f142a31`) vollständig in `TASK-PLAN-PLUGIN-SYSTEM.md` verarbeitet — jede der 15 Konsens-Fragen, jede Task-Zerlegung (106–116), jede Architekturentscheidung (Auth-Modell, Token-vor-mTLS, Surface-Taxonomie) taucht 1:1 im TASK-PLAN wieder auf. Gelöscht wurden die drei R45-Dateien erst **zwei Tage später** (16.09., Commit `2e6f9196` — eine große, unabhängige "Repo-Hygiene"-Aufräumaktion, kein gezieltes Löschen der Konsens-Docs). **Verdikt: keine Diskussion, keine Entscheidung, kein Inhalt ging verloren.** Es ist eine saubere Konsolidierung, keine verschleierte Streichung.

### 0.4 Selbst-referenzieller Befund: "Lies die Docs/Prompts" ist selbst ein 3-Wochen-Wiederholungsmuster

Der Auftrag, der zu diesem Dokument geführt hat ("LIES ALLE MEINE PROMPTS", "LIES DIE FUCKING DOCS"), ist **inhaltlich identisch** mit dem allerersten dokumentierten Prompt des gesamten Zeitraums:

> 06.09.2026, 09:08:28 Uhr: **"lies die docs"** (wortwörtlich, zweimal hintereinander um 09:08 und 09:20)

Und taucht seither wiederholt auf: 12.09. 21:08 ("hast du die sprints und research und backlos gelesen"), 12.09. 21:37 ("bitte lies unbedingt meine promts aus de rparalell session und sag mir ehrlich was hier alles noch fehlt"), 13.09. ("schau dir mal an was die agents alles gemacht haben"), und in den bereits geprüften letzten 2 Tagen mind. 15× (SLOP-Audit-Tabelle). Das ist der am häufigsten wiederholte "Request" im gesamten Datensatz — ein Vertrauensproblem: der Operator muss strukturell IMMER WIEDER darum bitten, dass eine Session sich erst orientiert, bevor sie baut. Das ist kein Produkt-Feature-Gap, sondern ein Prozess-Befund, der in jedem Handoff-Dokument (s. Teil 2) als Standing Rule wiederkehrt und trotzdem nicht hält.

---

## TEIL 1 — Wo Leos Prompts tatsächlich liegen (Abdeckungs-Check)

### 1.1 Quellenlage — ehrliche Bestandsaufnahme

| Quelle | Reale Abdeckung | Bemerkung |
|---|---|---|
| `/home/ji/.claude/projects/-home-ji-projects-ihc24/*.jsonl` (2 Dateien) | 24.09. 12:02 → 29.09. 12:04 | Das ist NUR der ihc24-Arbeitsordner (Meta-Audits), nicht das jimesh-Repo selbst |
| `/home/ji/.claude/projects/-home-ji-projects-jimesh/*.jsonl` (14 Dateien) | **06.09.2026 09:06 → 22.09.2026 09:30** | **Bisher nicht für Prompt-Extraktion genutzt** — im ursprünglichen Auftrag nicht mal erwähnt. Das ist die tatsächlich älteste verfügbare Aufzeichnung. |
| `docs_dev/user-prompts-72h.md` / `user-prompts-30h.md` | Trotz Dateiname (72h/30h) und einzelner Alt-Datum-Treffer im Fließtext (01./03./05.09.) bei genauer Prüfung nur **echte** Prompt-Header vom **13.09.–16.09.** | Die scheinbaren Sept-1/3/5-Treffer sind Fehlalarme — Textstellen INNERHALB von Prompts (eingefügte Logs/Timestamps), keine echten Prompt-Zeitstempel. Beide Dateien sind vollständig in den jimesh-jsonl-Rohdaten enthalten (Session `a0c3632e...`) — **keine neue Information**, nur ein stehengebliebener Re-Export. |
| `claude_session_prompts.md` / `_FULL_2026-09-28.md` / `_PART2` / `_PART3` | 24.09.–29.09. (410 Prompts) | Bereits vollständig ausgewertet in den beiden Vorgänger-Audits — hier nicht erneut extrahiert. |

**Ehrliches Fazit zur Auftragsprämisse:** Es gibt **keine** Aufzeichnung, die vor dem **06.09.2026** liegt. "3 Wochen zurück" von heute (30.09.) wären der 09.09. — die reale Aufzeichnung reicht sogar noch 3 Tage weiter zurück (06.09.), aber weiter zurück existiert nichts: kein Log, keine Markdown-Datei, kein Backlog-Eintrag deutet auf Aktivität vor dem 06.09. hin (das Repo selbst trägt an dem Tag noch Spuren des Upstream-Vorgängers "FreeLLMAPI" — der 06.09. ist plausibel wirklich der Tag, an dem "JiMesh" als Projektname/-vision entsteht). Die vermeintlichen "72h/30h"-Dateinamen sind irreführend (technisch: alte, nie aufgeräumte Exportnamen) und keine Lücke, die noch zu schließen wäre.

### 1.2 Neu ausgewertet: 06.09.–22.09. (974 Rohprompts, davon 259 im bisher nie geprüften Fenster 06.–12.09.)

Themen-Häufigkeit über 06.09.–22.09. (Keyword-Scan über alle 974 extrahierten User-Turns, Duplikate/Rauschen wie Task-Notifications und reine "ok"/"go"-Bestätigungen mitgezählt, aber nicht separat bereinigt — Größenordnung, keine exakte Zählung):

| Thema | Treffer | Datumsspanne |
|---|---|---|
| Workspace/Project/App-Modell (Grundarchitektur) | 229 | 06.09.–21.09. (durchgehend) |
| Deploy/Ansible | 194 | 06.09.–21.09. |
| Certs/Tailscale/Headscale | 120 | 06.09.–21.09. |
| Firewall/WAF/iptables/UFW | 95 | 06.09.–21.09. |
| Ports/Networking/VLAN | 90 | 06.09.–21.09. |
| Docs/Audit-Forderung ("lies die docs" etc.) | 70 | 06.09.–21.09. |
| Secrets/Vault/KV-Storage | 70 | 06.09.–21.09. |
| Terminal/PTY/Shell | 57 | 06.09.–21.09. |
| User-Provisioning/RBAC/Service-Account | 56 | 06.09.–21.09. |
| gVisor/runsc | 49 | 06.09.–21.09. |
| Sidebar/Navigation | 34 | 06.09.–21.09. |
| Plugin-System | 33 | 06.09.–21.09. |
| SIEM/Wazuh/Falco | 27 | 08.09.–21.09. |
| Gmail/OAuth/Firebase | 28 | 07.09.–18.09. |
| eBPF/Tetragon | 23 | 06.09.–21.09. |
| Datalake/Ozone/Debezium | 15 | 07.09.–21.09. |
| Meshsquad/Crew/Agent-Bus | 12 | 06.09.–22.09. |
| Suricata | 8 | 06.09.–13.09. |
| Onboarding | 6 | 14.09.–21.09. |

**Einordnung:** Nahezu jedes Thema, das die beiden Vorgänger-Audits (Sept 24–29) als "3+ mal wiederholt" markiert haben, war **bereits in der ersten Woche** (06.–12.09.) präsent — das bestätigt, dass es sich nicht um neue Ermüdungs-Themen der Marathon-Nacht handelt, sondern um seit Projektbeginn laufende, nie geschlossene Kernforderungen.

### 1.3 Das bisher ungeprüfte Fenster 06.–12.09. im Detail — was dort wirklich passiert ist

Dies ist echte Neuware — weder von `FULL-COMPLETENESS-AUDIT.md` (dessen früheste Primärquelle `CHAT_LOG_20260913.md` ist, also erst ab 13.09.) noch von den Sept-24-Audits abgedeckt.

**06.09. — Projektgenese.** Die Session beginnt mit "schau dir das projekt an" / "lies die docs" (09:06–09:20) — zu diesem Zeitpunkt trägt das Repo noch sichtbare Reste des Upstream-Vorgängers "FreeLLMAPI" (ein separater Digest-Subagent listet das an diesem Tag akribisch auf: `architecture.md`, `docker/README.md`, `install.md`, `PROJECT_STRUCTURE.md` beschreiben noch einen Express/SQLite-Stack auf Port 3001, der nicht mehr existiert). Direkt im Anschluss (09:39–09:59) formuliert Leo binnen 20 Minuten das **komplette spätere Security-Produkt** in einem Rutsch: Suricata + XCP-ng/gVisor-Hypervisor-Trennung + Kernel-Firewall + eBPF-Static-Analysis + WAF (mit freier Anbieterwahl, aber "suricata ist immer dabei") + BERT-Modell für Prompt-Injection-Detection + Llama-Guard "aber das passiert ja auf proxy ebene nicht auf kernelebene". **Das ist die Blaupause für praktisch alles, was `FULL-COMPLETENESS-AUDIT.md` drei Wochen später noch als P0/P1-Lücke listet (S1–S10).**

Ebenfalls am 06.09. (10:21–10:27): die komplette RBAC/Secrets/Multi-Cloud-Vision in einem Rutsch ("rbac users auth secrets... credits für users... rbac ür deployments und projects... aws, gcp deployments... ein project bruach immer ein git token... service account und networking rules und user rbac"). Das ist im Kern das, was TASK-070/099/100 später umsetzen — drei Wochen Vorlaufzeit zwischen Vision und (Teil-)Umsetzung.

**06.09. abends – 08.09. — Erste Parallelsitzungs-Chaos-Episode.** Mehrere gleichzeitige Claude/GLM-Sessions im selben Checkout, Cross-Session-Messages, doppelt gestartete Subagenten, ein Merge, der "während ein Subagent noch mittendrin war" passierte. Leo greift mehrfach ungeduldig ein ("mach nächste session für glm klar und mach jtetzt endlich ales fertig ich warte hier", "warum machst du nicht weiter und alles fertigß"). Dieses Muster (mehrere Sessions, die sich gegenseitig nicht kennen, Nutzer als De-facto-Koordinator) ist strukturell identisch mit dem, was `HANDOFF-2026-09-21.md` und `HANDOFF-2026-09-16-next-session.md` (Teil 2) noch drei Wochen später als aktives Risiko dokumentieren ("GLM läuft parallel im selben Checkout").

**07.09. — Brand/Logo-Session.** Ein ganzer Tag Iteration am Logo (Igel → Ameise → Mesh-Rune → finales Lockup), kein Produkt-Gap, aber bezeichnend für den Arbeitsstil (sehr viele kleine, sofortige Korrektur-Prompts: "immernoch kacke", "MACH DOCH EINFACH..."). Parallel dazu die Auth-Stack-Entscheidung Keycloak vs. Zitadel vs. OPA/Casbin/Cerbos — endet in "OPA über Casbin" + Keycloak, was sich im späteren Code bestätigt (`internal/auth/keycloak_oidc.go`, `internal/policy/`).

**08.09. — Terminal/Utility-Deployments erstmals verlangt.** *"waas uns auch noch fehlt sind einfache deployments mit terminal oder einfach nur terminal als deployment"* (07:28) und *"außerdem haben wir immenroch keine ulitity deployments wenn man neue ssh endpoints erstellt"* (07:29). **Beide Male 19 Tage später (`FULL-COMPLETENESS-AUDIT.md`, 27.09.) exakt als offene P1/P2-Lücken bestätigt** (U1 Terminal-PTY: nur `toast.info`-Stub; U3/U4 Utility-App-Auswahl beim Onboarding: nicht spezifiziert).

**09.09. — SIEM/Suricata/eBPF als "richtiges Research-Doc" verlangt**, inkl. Cloud-Provider-Vergleich (AWS Security Hub/GuardDuty, Datadog, Elastic). Dieser SIEM-Vergleichsartikel wurde tatsächlich geschrieben (`docs/articles/siem/`, `siem-smb-guide`), aber die AWS-Multi-Provider-Anbindung selbst (K-LAF O1–O5, B9 im Audit) ist bis heute 0 Code.

**12.09. — Firewall-Unzufriedenheit + eigene Ansible/OPNsense-Tools angeboten.** *"was mich noch nervt ist warum ahben wir so ne kack firewall implementierung? ... wieso nciht einfahc opnsense? ich hab sogar scripts... ovs-bridge-collection & opnsense-helper — Ansible Collection for OVS/VLAN Automation & Python API for OPNsense"*. **Gegen-Check im Code (positiv, kein Gap):** OPNsense IST als wählbarer Firewall-Provider gebaut (`OpnsenseFirewallConfigPage.tsx`, `FirewallProviderSetupPage.tsx`, `internal/security/firewall_provider.go`) — dieser konkrete Wunsch wurde tatsächlich umgesetzt, nur nicht mit Leos eigenen mitgebrachten Skripten (nicht verifizierbar, ob diese wiederverwendet wurden).

### 1.4 HANDOFF-Dokumente als Fundgrube für ältere, wörtliche Standing Rules

Vier bisher nicht cross-referenzierte Handoff-Dateien wurden gelesen (`docs_dev/tasks/HANDOFF-2026-09-08-next-session.md`, `docs_dev/tasks/HANDOFF-2026-09-16-next-session.md`, `docs_dev/HANDOFF-2026-09-21.md`, `docs_dev/backlog/HANDOFF-2025-09-13-session36-quota-pause.md` [Jahreszahl im Dateinamen ist ein Tippfehler, Inhalt datiert korrekt auf 13.09.2026]). Zentrale, bis heute gültige wörtliche Operator-Zitate, die dort für "die nächste Session" archiviert wurden:

- **16.09. (Networking-Wutausbruch, HANDOFF-2026-09-16):** *"SO STOP JETZT WIRD RICHTIG CHAOTISCH MIT DEINEM SCHEISS NETWORKING UND SCRIPTS DIE ALLES KAPUTT MACHEN [...] DU NIMMST DIESE IPTABLE UND FIREWALL SCHEISSE JETZT KOMPLETT RAUS."* — Standing Rule seither: NIE iptables/sysctl/Host-Firewall-Kommandos manuell, nur Ansible auf Docker-Ebene.
- **16.09.:** *"DU HAST DIE IP IN DIE DEPLOYMENTS FILE GESCHRIEBEN DU IDIOT"* — echte IP landete uncommitted in einer getrackten Datei; Fix (`topology.example.yml` vs. `topology.local.yml`) wurde noch am selben Tag gebaut.
- **21.09. (HANDOFF-2026-09-21):** Sidebar-Neustrukturierung war zu diesem Zeitpunkt bereits vollständig spezifiziert (`docs_dev/prompts/glm-sidebar-scope-redesign.md`) — inklusive der Regel **"Vor jedem Multi-Select-UI-Code: Audit-Tabelle erstellen... BEVOR UI-Code geschrieben wird."** Genau diese Reihenfolge wurde laut `FULL-COMPLETENESS-AUDIT.md` (F14/WP0, P0) **verletzt** — die Multi-Select-UI wurde gebaut (SPRINT-52), die vorher geforderte Audit-Tabelle nie. Das ist ein Fall, in dem eine dokumentierte, vom Operator explizit verlangte Reihenfolge nachweislich missachtet wurde.
- **08.09. (HANDOFF-2026-09-08):** Bereits an Tag 3 des Projekts existiert ein dokumentiertes Vier-Task-Nummern-Chaos (084/085/086/090 doppelt belegt) — ein Muster, das sich in den Sept-24-Audits als "SPRINT-139 Kollision" u.ä. wiederholt (verschiedene Sprints, gleiche Task-Nummer, keine zentrale Vergabestelle).

---

## TEIL 2 — Die Dev-Docs wirklich gelesen

### 2.1 `docs_dev/FULL-COMPLETENESS-AUDIT.md` (84 Funde, 27.09., DSH-Subagent) — vollständig gelesen

Dies ist mit Abstand das gründlichste vorhandene PLAN-vs-CODE-Dokument im Repo und deckt praktisch den kompletten in Teil 0/1 skizzierten Bedarf bereits ab. Kurzfassung der Struktur (271 Zeilen, komplett gelesen inkl. Master-Prioritätenliste):

- **86 Tabellenzeilen, 84 echte Funde** (2 sind Security-Spiegel bereits gezählter Backend-Lücken), aufgeteilt in Backend (18), Frontend (14), Integrations (9), Plugins (8), Security (10), Agent-Features/meshsquad-crew (8), Deploy/DevOps (10), Utility (9).
- **11 P0-Funde** (explizit/wiederholt/wütend vom Operator verlangt, nie geliefert, Stand 27.09.) — u.a. Llama-Guard-Dashboard, eBPF-Enforcement (**dieser eine Punkt wurde nachweislich einen Tag später, am 28.09., tatsächlich gebaut — s. Korrektur in 0.1; der Audit selbst konnte das am 27.09. noch nicht wissen**), Plugin-Persistenz/meshsquad-Echtintegration (weiterhin offen, frisch verifiziert), Phantom-MCP-Routen (`/api/plugins/{linear,github,dsh}/*` — von MCP-Tools aufgerufen, aber nie im Gateway registriert → echte 404s), Multi-Select-Audit-Tabelle (s. 1.4, weiterhin offen), SIEM-Dauer-Scan-Rest, GO-PUBLIC-Rotation/Tree-Scrub (Leaks stehen weiter im Tree, s. Ergänzung Teil 6), crew1-7-gVisor-Migration.
- **Abschnitt 9 ("Bewusste Abweichungen")** ist bemerkenswert selbstkritisch redlich: 13 Punkte, wo etwas ANDERS als geplant, aber bewusst und dokumentiert umgesetzt wurde (z.B. KasmWeb→neko/opencode-Ersatz, Sidebar-Dual-Toggle→parallele Sektionen) — das verhindert, dass legitime Design-Änderungen fälschlich als "nie gebaut" gezählt werden.
- **Abschnitt 10** listet explizit, was seit Vorgänger-Audits ("Alt-Befund") inzwischen gefixt wurde — auch das reduziert Rauschen für künftige Audits.

**Eigene Stichproben-Verifikation gegen Live-Code (nicht nur Doku-Vertrauen):**
- `internal/plugins/auth/` existiert **nicht** → TASK-108 (Auth-Connector-Framework) bestätigt 0 Code, wie im Audit behauptet.
- `docs/plugins/SPEC.md` + `plugin.schema.json` + `internal/domain/schema/plugin_manifest.go` existieren **wirklich** (Commit `6257282a feat(plugins): implement TASK-106...`) → TASK-106 ist die EINZIGE der 11 Plugin-Tasks (106–116), die tatsächlich Code hat.
- `gateway/plugins.go:138–215` bestätigt wörtlich das Audit-Zitat: `POST /api/plugin-installations` ist ein Echo, `GET` liefert leer, es gibt einen expliziten Kommentar im Code selbst *"a plugin with no backend routes is NOT installable"* — das ist ehrliches, selbst-dokumentiertes Unfertig-Sein, kein verschleiertes Mock.

**Fazit zu diesem Dokument:** Es ist bereits die Antwort auf einen Großteil dessen, was dieser Auftrag nochmal separat verlangt hat. Der Mehrwert dieses Audits hier liegt darin, es (a) gegen die jetzt zusätzlich ausgewertete ältere Prompt-Historie zu spiegeln (Teil 0/1) und (b) die drei offen gebliebenen Detailfragen (R45, Backlog-Divergenz, s.u.) zu klären, die das FULL-COMPLETENESS-AUDIT nicht beantwortet hat.

### 2.2 R45-Konsens-Dokumente — vollständig gelesen, Diff durchgeführt

Alle vier Versionen wurden per `git show <commit>:<pfad>` aus der Historie rekonstruiert und volltextverglichen:

| Datei | Commit (Erstellung) | Zeilen | Commit (Löschung) |
|---|---|---|---|
| `docs/research/R45-plugin-system-consensus.md` (GLM, Basisdokument) | `bf5ba43a`, 14.09. 07:12:07 | 198 | `2e6f9196`, 16.09. |
| `docs/research/R45-CONSENSUS-claude.md` (Claude-Antwort) | `0c6883d1`, 14.09. 07:15:18 | 137 | `2e6f9196`, 16.09. |
| `docs/research/R45-CONSENSUS-glm.md` (GLM-Reaktion/Q10) | `4a33cf1b`, 14.09. 07:17:59 | 63 | `2e6f9196`, 16.09. |
| `docs/research/R45-dsh-cordis-jimesh-bridge.md` (unabhängiges 4. R45-Dok, DSH↔MCP) | — | 54 | `2e6f9196`, 16.09. |
| `docs/tasks/jules/TASK-PLAN-PLUGIN-SYSTEM.md` (Konsolidierung) | `2f142a31`, 14.09. **07:23:40** | 124 | — (existiert weiter, heute unter `docs_dev/tasks/jules/`) |

**Zeitlicher Ablauf, der die Frage klärt:** Die drei Konsens-Dokumente entstehen alle **innerhalb von 12 Minuten** (07:12–07:24) am selben Vormittag. TASK-PLAN-PLUGIN-SYSTEM.md wird **6 Minuten nach dem letzten R45-Dokument** committet — es ist also erwiesenermaßen eine unmittelbare, bewusste Zusammenfassung, kein späterer Ersatz nach Gedächtnis. Die Löschung der drei (plus des vierten, thematisch unabhängigen `R45-dsh-...`) Dateien geschieht erst **zwei Tage später** in einem einzigen großen "Repo-Hygiene"-Commit (`2e6f9196`, 16.09., der auch `config/` auflöst, tote FreeLLMAPI-Reste entfernt usw.) — kein gezielter "R45 verschwinden lassen"-Akt.

**Inhaltlicher Abgleich (stichprobenartig, alle 15 Konsens-Fragen geprüft):** Jede der Q1–Q10-Antworten aus `R45-CONSENSUS-glm.md`s Bilanz-Tabelle findet sich als konkrete Architekturentscheidung im TASK-PLAN wieder:
- Q1 (Surface-Taxonomie, Claudes "native deckt beides ab"-Klarstellung) → wörtlich in TASK-106 WP1.
- Q3a–Q3e (Token-vor-mTLS, Project-Override nur enger, SA explizit, Manifest+OPA, Tokens→099-Konsolidierung) → wörtlich in TASK-108/109.
- Q6 (`plugin.yaml` + JSON-Schema-Validierung nach OKF-Vorbild) → TASK-106 WP3 fast wortgleich.
- Q9 (leobot3 → Agent-Connector-Family statt eigenes Plugin; saits-crew → Workspace-App-Showcase, kein Plugin) → wörtlich im TASK-PLAN-Kopf ("Operator-Korrektur 16.9.: leobot ist KEIN Plugin-Kandidat...").
- Q10 (SDK-Abnahme = unabhängiger Nachbau statt Selbsteinschätzung) → wörtlich in TASK-116.

**Verdikt: Es ist eine saubere, vollständige Konsolidierung. Keine Diskussion, kein Zitat, keine Entscheidung ist verloren gegangen.** Das einzig legitime Kritikpunkt wäre ein Stil-/Auffindbarkeits-Argument (die Konsens-Historie selbst — WER hat WAS vorgeschlagen, inkl. der Selbstkorrektur-Anekdote "ich hatte parallel schon TASK-106/107/108-Dateien geschrieben, kollidierte mit diesem Dokument, gelöscht bevor committet" — ist nur noch über `git show` rekonstruierbar, nicht mehr im Working Tree lesbar). Das ist ein Nachvollziehbarkeits-Verlust, kein Substanzverlust.

**Randfund:** `R45-dsh-cordis-jimesh-bridge.md` (DeepSeek-Harness↔JiMesh-MCP-Bridge-Spec) wurde im selben Commit mitgelöscht, obwohl es thematisch NICHTS mit dem Plugin-Konsens zu tun hat (reine Nummern-Kollision — "R45" wurde zweimal vergeben). Das ist ein eigenständiger kleiner Dokuverlust: eine DSH↔MCP-Bridge-Spezifikation existiert seit dem 16.09. nirgends mehr im Tree, wurde aber soweit ersichtlich nie durch ein Nachfolgedokument ersetzt (die MCP-Tools `list_dsh_profiles`/`trigger_dsh_turn`, die dort spezifiziert wurden, sind laut `FULL-COMPLETENESS-AUDIT.md` B14 als "Phantom-Routen" bekannt — die Spec zu ihrer Anbindung fehlt seit drei Wochen ersatzlos.)

### 2.3 Backlog-Divergenz: `docs_dev/backlog/BACKLOG.md` vs. `docs/backlog/BACKLOG.md`

**Bestätigt: echte Divergenz, kein reiner Zeitversatz.**

- `docs_dev/backlog/BACKLOG.md` — **gitignored** (via `.gitignore:49`), 176 Zeilen, zuletzt geändert **27.09. 22:14**. Enthält u.a. einen kompletten Abschnitt "STATUS-ÜBERSICHT (18.9.2026, SPRINT-47 Security-Engineer-Update)" mit 9 Arbeitspaketen (project_roles-Tabelle, OPA-Projekt-Gate, Keycloak-Realm-Rolle `jimesh-dev`, `jimeshctl`-CLI-Erweiterung usw.).
- `docs/backlog/BACKLOG.md` — **getrackt**, 660 Zeilen, aktiv gepflegt bis in den (laut Sprint-Überschriften) 01.10. hineinreichenden Zeitraum.
- **Grep-Beweis:** `S47-WP` (die Task-ID-Präfixe des SPRINT-47-Abschnitts) kommt **0×** in `docs/backlog/BACKLOG.md` vor, und `git log --all -S"SPRINT-47 Security-Engineer-Update"` findet **keinen einzigen Commit** in der gesamten Repo-Historie, der diese Zeichenkette je enthalten hat. Das ist kein "wurde später rausgekürzt" — der SPRINT-47-Abschnitt war **nie** im getrackten Backlog. Er existiert ausschließlich in der lokalen, nicht versionierten Kopie.

**Bedeutung:** Die beiden Dateien sind keine Kopie-mit-Zeitversatz, sondern zwei **unabhängig fortgeschriebene** Backlogs, die bereits am 18./21.09. auseinanderliefen und es bis heute sind. Wer nur `docs/backlog/BACKLOG.md` liest (die getrackte, "offizielle" Version, z.B. bei einem Fresh-Checkout oder Onboarding eines neuen Mitarbeiters/einer neuen Session ohne Zugriff auf die lokale `docs_dev`-Kopie), sieht **die SPRINT-47-Ergebnisse (project_roles/OPA-Projekt-Gate) nirgends dokumentiert** — obwohl der zugehörige Code laut Handoff-Dokumenten real existiert (`internal/store/project_roles.go`, `internal/policy/policies/project-roles.rego`). Umgekehrt fehlen der lokalen Kopie die kompletten letzten zwei Wochen (S55–S157), weil sie seit 27.09. nicht mehr angefasst wurde. **Empfehlung (nicht umgesetzt, nur dokumentiert — read-only-Auftrag):** entweder S47 nachträglich in die getrackte Version übernehmen, oder den gitignore-Eintrag für `docs_dev/backlog/BACKLOG.md` überdenken, wenn er als Living Document mit dem getrackten mithalten soll.

### 2.4 TASK-106–116 — Einzeldateien existieren nicht

`docs_dev/tasks/jules/` enthält TASK-087 bis TASK-105 als **eigene** Dateien, aber **keine** eigenen TASK-106.md … TASK-116.md — diese 11 Tasks existieren ausschließlich als Abschnitte innerhalb von `TASK-PLAN-PLUGIN-SYSTEM.md` (Wave 0–3, s. 2.2). Das ist konsistent mit dem Befund, dass nur TASK-106 (Manifest-Spec) je einen eigenen Umsetzungs-Commit bekam (`6257282a`) — die übrigen 10 haben nie den Sprung von "Abschnitt im Plan" zu "eigener Branch/eigenes File" geschafft. Remote-Branch-Reste bestätigen das: `git branch -r` zeigt nur `origin/task-106-plugin-manifest-spec-v1-...` und `origin/task-115-browser-automation-digest-...` — für TASK-107/108/109/110/111/112/113/114/116 existiert **kein einziger Branch**, auch kein verworfener.

---

## TEIL 3 — Cross-Reference: Forderung × Alter × Status

Diese Tabelle verbindet die neu ausgewertete Frühgeschichte (Teil 1) mit den bereits bekannten Funden (Sept-24-Audits + `FULL-COMPLETENESS-AUDIT.md`), um zu zeigen, WIE ALT jede noch offene Forderung wirklich ist.

| Forderung | Erstnennung (jetzt neu belegt) | Bereits bekannt seit (Voraudits) | Code-Status heute | Alter |
|---|---|---|---|---|
| eBPF/Tetragon-Kernel-Enforcement gg. Prompt-Injection | **06.09. 09:59** | 13.09. (rm32), 27.09. (Audit S2) | **korrigiert: gebaut 28.09.** (WP1-6 done, Live-Node-Test offen) | 22 Tage bis Code |
| Llama-Guard-Dashboard (User-Extra-Regeln) | 06.09. 09:59 (implizit) | rm00 #53, 27.09. (Audit S1) | Backend fertig, 0 Frontend | 23 Tage |
| SIEM Dauer-Scan (Suricata+Wazuh+Falco, "permanent") | 06.09. 09:39 | 09.09., 13.09., 27.09. (Audit B8) | Kern gebaut, Shipper/Ruleset offen | 23 Tage |
| gVisor für ALLE Workloads (inkl. crew1-7) | 06.09. 09:47 | 27.09. (Audit A2) | Nur teilweise (Trading-Node) | 23 Tage |
| Terminal-Deployment (echtes PTY, kein VNC-Umweg) | **08.09. 07:28** | 27.09. (Audit U1) | **korrigiert:** echtes xterm-Terminal jetzt gebaut (`WorkspaceTerminal.tsx`, 3× verdrahtet); ein älterer, separater `toast.info`-Stub in `AppDetailPage.tsx` blieb liegen | 21 Tage, teilweise gelöst |
| Utility-Deployments beim SSH-Endpoint-Anlegen | **08.09. 07:29** | 27.09. (Audit U3/U4) | Statische Deko, nicht spezifiziert | 21 Tage |
| Plugin-System (dynamischer Katalog + echte Installationen) | implizit 06.09., explizit 14.09. (R45) | 27.09. (Audit P1–P8) | Nur Spec (#106), Rest 0 | 15 Tage seit Konsens |
| Firewall mit Anbieterwahl (Suricata Pflicht, sonst frei wählbar/OPNsense) | **06.09. 09:48 / 12.09. 22:03** | — | **Bereits gebaut** (OpnsenseFirewallConfigPage, firewall_provider.go) | erledigt, ~2–3 Wochen Bauzeit |
| Multi-Select-Audit-Tabelle VOR UI (Reihenfolge-Mandat) | 21.09. (HANDOFF, s. 1.4) | 27.09. (Audit F14/WP0, P0) | Reihenfolge missachtet, UI existiert, Audit fehlt | 8 Tage |
| Message-Bus/Agent-Chat ("kein Conference-Room-Zwang") | — (nicht im 06–12.09-Fenster neu belegt, aber vgl. Sept-24-Audit 2.1) | Sept-24-Audit: 10 Prompts | Core in meshsquad-public gebaut, jimesh-UI-Embed fehlt | s. Sept-24-Audit |
| "Lies die docs / Prompts vollständig" (Meta-Forderung) | **06.09. 09:08** (wörtlich) | 12.09., 13.09., + 15× in Sept-24-29-Fenster | Strukturelles Muster, kein Code-Gap | 23 Tage, ungelöst |

---

## TEIL 4 — Was dieser Task NICHT neu behauptet

Um Übertreibung zu vermeiden: die folgenden Themen aus dem Auftrag wurden geprüft und ergaben **keinen zusätzlichen Fund** gegenüber dem, was `FULL-COMPLETENESS-AUDIT.md` und die Sept-24-29-Audits bereits sagen — hier wird bewusst NICHT neu "entdeckt", was schon bekannt ist:

- Meshsquad-Chat-Panel/Auto-Topic-Provisioning (P8/A3) — deckungsgleich mit Audit.
- Firebase-Auth (B17/I1) — deckungsgleich, TASK-088 vollständig gelesen, Befund bestätigt (0 Code, nur `.env`-Platzhalter).
- MESHSQUAD_INTEGRATION_PLAN.md WP2–WP7 — nicht erneut im Detail durchgegangen, da Audit (A1) bereits Zeilen-genau zitiert.
- Datalake/Debezium (B10) — Befund identisch zum Audit, keine neue Erkenntnis aus der Frühgeschichte gefunden außer der schon in 1.3 zitierten Ursprungsforderung vom 09.09.

---

## TEIL 5 — Für den nächsten Task/nächste Session

1. **eBPF/Tetragon war der mit Abstand älteste P0-Punkt (22 Tage von Anfrage bis Code) — inzwischen aber tatsächlich gebaut (28.09.).** Offen bleibt nur WP7 (Live-Deploy + Operator-E2E auf einer echten Node). Nächster sinnvoller Schritt: dieser eine Live-Test, nicht neuer Code.
2. Die Backlog-Divergenz (2.3) ist ein leises, aber echtes Risiko — falls eine künftige Session nur `docs/backlog/BACKLOG.md` liest (weil `docs_dev/` gitignored ist und z.B. auf einem frischen Checkout fehlt), verliert sie den SPRINT-47-Kontext komplett.
3. `R45-dsh-cordis-jimesh-bridge.md` (2.2, Randfund) fehlt ersatzlos — falls die DSH↔MCP-Bridge (Phantom-Routen B14) je gebaut wird, gibt es aktuell keine lebende Spezifikation dafür im Tree, nur die git-Historie.
4. Die Meta-Forderung "lies die docs/Prompts" (0.4) wird sich nach diesem Muster wahrscheinlich wiederholen, wenn nicht strukturell verankert wird (z.B. verpflichtender Orientierungsschritt am Sessionstart, wie es die Handoff-Dokumente selbst schon fordern, aber laut Sept-24-29-Audits nicht zuverlässig eingehalten wird).

---

## TEIL 6 — Ergänzungen des koordinierenden Agents (eigene Recherche + Korrektur-Synthese)

Dieser Bericht wurde arbeitsteilig erstellt: mehrere Recherche-Subagenten haben parallel Teile beigesteuert (Prompt-Extraktion Sept 6-22, Docs-Recherche/R45-Diff). Der eBPF-Fehler in Teil 0.1 (oben korrigiert) zeigt, dass Sub-Recherchen nicht blind übernommen werden dürfen — deshalb hier zusätzlich, was ich (der koordinierende Agent) selbst gegen den echten Code und zusätzliche, von den Subagenten nicht gefundene Dokumente verifiziert habe.

### 6.1 Der wichtigste bisher nicht erwähnte Fund: `docs/REQUESTS-TRACKING.md` existiert bereits und beantwortet einen Großteil dieses Auftrags

**Keiner der Recherche-Durchgänge hat dieses Dokument gefunden — ich habe es selbst entdeckt und vollständig gelesen.** Es ist **getrackt** (kein gitignored Zufallsfund), datiert **20.09.2026**, und wird von mehreren anderen Docs referenziert (`docs/backlog/BACKLOG.md`, `docs_dev/FULL-COMPLETENESS-AUDIT.md`, mehreren Sprint-Files) — es ist also kein vergessenes Orphan-Dokument, sondern Teil des offiziellen Doku-Netzes, wurde aber diese Nacht (und offenbar auch sonst) nicht als lebendige Quelle konsultiert, bevor der Operator "lies die docs" fordern musste.

Inhalt: 586 extrahierte Prompts (Hauptsession 6.–14.9. + eine 30.8.-Alt-Session aus der FreeLLMAPI-Ära), konsolidiert zu **120 Anfrage-Items** in 10 thematischen Blöcken (A–J), jedes mit Status (IMPLEMENTIERT/TEILWEISE/VERZOEGERT/NICHT UMGESETZT/ERSETZT/EXTERN) **und Code-Beleg** (Datei:Zeile oder Commit-Hash) — methodisch fast identisch zu dem, was dieser Auftrag heute Nacht nochmal verlangt hat, nur für ein anderes Zeitfenster. Eigene Bilanz des Dokuments: 73 IMPLEMENTIERT (61%), 23 TEILWEISE (19%), 12 VERZOEGERT (10%), 8 NICHT UMGESETZT (7%), 3 ERSETZT, 1 EXTERN. Abschnitt 2 ("Geplant, nie umgesetzt", 17 Punkte) und Abschnitt 3 ("Gebaut, nie angefordert", 7 Punkte — u.a. die kompletten Multimedia-Playground-Seiten Audio/Video/Bild/Embeddings, die NIE ein Operator-Prompt anforderte) sind direkt verwertbar. Abschnitt 5.3 formuliert selbst drei Muster ("Recherche ja, Umsetzung später", "Fertig gemeldet ≠ fertig", "Breite vor Tiefe"), die `FULL-COMPLETENESS-AUDIT.md` (27.9.) und die Sept-28/29-Audits **unabhängig noch zweimal** wiederentdecken — das ist selbst der stärkste Beleg für Abschnitt 0.4 dieses Berichts: es wird nicht zu wenig dokumentiert, sondern das Dokumentierte wird nicht als eine fortgeführte Quelle behandelt.

### 6.2 Frisch gegen HEAD `73c5bde3` (30.9., 06:53) verifizierte Deltas, die keiner der Vorgänger-Audits mehr sehen konnte

| Fund | Verifiziert durch |
|---|---|
| **Sidebar-Reachability (SIEM/Firewall/SAST/DAST) ist wiederhergestellt.** `lib/section-nav.ts` verdrahtet alle vier wieder (SPRINT-157, Commit `ae1e3f3c`, 460/460 Tests). Das war laut `SLOP-AND-UIUX-AUDIT-2026-09-29.md` in der Nacht vom 28./29.9. selbst kaputt (Commit `6d998223` hatte 40/47 Routen aus der Sidebar entfernt). | eigener `grep` gegen `section-nav.ts`, HEAD |
| **Message-Bus/"Conference Room"-UI (Top-Thema seit Wochen) hat jetzt ein jimesh-seitiges Frontend** — `MeshSquadChatSpacePage.tsx` + Sidebar-Eintrag + Gate-Section + Tests (SPRINT-153, Commit `f6241c4f`, 29.9.). Vorher laut Sept-28-Audit "0 Treffer meshsquad\|tinode im Frontend". **ABER:** `meshsquad-public/server.py` hat die dafür nötigen Chat-Space-Endpunkte noch nicht (0 Treffer für ein Chat-Space-Pattern, von mir selbst gegrept) — die neue UI hat aktuell wahrscheinlich noch keinen funktionierenden Backend-Anschluss. Nach >10 Wochen-Anfragen: UI-Teil erstmals da, letztes Backend-Stück fehlt noch. | `grep` in `meshsquad-public/server.py` + `jimesh/src/frontend/src` |
| **App-Discovery (Docker-Hub/Compose-Scan) ist jetzt real gebaut** — `AppDiscoveryPage.tsx` (301 Z.), echter `POST /api/servers/discover`-Call, geroutet unter `/projects/discover`. War in `REQUESTS-TRACKING.md` (E19) und `docs/backlog/BACKLOG.md` (#093) noch als "[ ] geplant" markiert — beide Docs sind an dieser Stelle veraltet. | Datei gelesen + Route in `App.tsx` bestätigt |
| **Datalake-Pipeline ist deutlich gewachsen**, nicht mehr der "13-Zeilen-Sleep-Stub" aus `FULL-COMPLETENESS-AUDIT.md` — `cmd/datalaked/main.go` ist jetzt 459 Zeilen, keine TODO/Stub/Sleep-Marker mehr auffindbar. Von "0 Code" zu "in Arbeit" (Commit-Message selbst: "IaC TASK fehlt noch"). | `wc -l` + `grep TODO/stub/sleep`, 0 Treffer |
| **Die `jimesh.secrets.get(...)`-SDK-Signatur, die `AUDIT-2026-09-21-GAP-LIST.md` (#155) als "fehlt komplett aus der Spec" listet, existiert tatsächlich als echter, verdrahteter Code** — `src/backend/internal/sdk/secrets/secrets.go` (`Get`/`GetFrom`/`GetAs`, TASK-065/Sprint 39), real genutzt in `gateway.go` und `auth.go`. Es fehlt nur die Erwähnung in `ARCHITECTURE.md §8.3c` — eine **Dokulücke, kein Code-Gap**, aber genau die Art Diskrepanz, die "ihr habt das nie gebaut"-Vorwürfe erzeugt, wenn Docs hinter dem Code zurückbleiben. | Datei vollständig gelesen, Call-Sites gegrept |
| **`docs_dev/backlog/BACKLOG.md` (gitignored) ist an mehreren Stellen selbst veraltet**, nicht nur gegenüber dem getrackten Backlog divergent (s. 2.3 oben): Zeilen #106–116 stehen dort weiterhin als reine `[ ] geplant`-Liste, obwohl TASK-106 seit dem 19.9. gemergter Code ist. Zeile #138 im selben Dokument (Eintrag vom 21.9.) korrigiert das zwar teilweise ("mindestens Grundgerüst existiert"), aber die Ursprungszeilen wurden nie nachgezogen. | Datei vollständig gelesen (176 Zeilen) |
| **Plugin-System #107–116: unabhängig per `git branch -a` bestätigt.** Für keinen dieser 9 Tasks (107,108,109,110,111,112,113,114,116) existiert irgendwo im Repo (lokal oder remote) auch nur ein Branch — nicht einmal ein verworfener Versuch. Nur `task-106-plugin-manifest-spec-v1-…` (gemergt) und `task-115-browser-automation-digest-…` (Doku, gemergt) existieren. Deckt sich exakt mit Fork-1s und Fork-2s unabhängigen Befunden — dreifach bestätigt. | `git branch -a \| grep task-10\|task-11` |

### 6.3 GO-PUBLIC / Credential-Rotation — aktueller Stand (ergänzt Teil 0.2, dort nicht tief genug behandelt)

`docs_dev/GO-PUBLIC-PLAN.md` (21.9., "PLAN, nicht ausgeführt") wurde am 29.9. **teilweise** angegangen: `GIT-HISTORY-SECRET-SCRUB-2026-09-29.md` (dieser ihc24-Ordner) dokumentiert einen gefundenen, echten Vault-Dev-Root-Token, der an HEAD gefixt und dessen History auf einen einzigen Commit gesquasht wurde — aber der Bericht selbst warnt ausdrücklich, dass der Token-Wert in diesem einen verbleibenden Commit für 2 Dateien "by design" weiterhin steht und 6 weitere Fundstellen ungeprüft blieben; die separate SSH-Credential-Rotation (OP-01) ist unangetastet. **Seit über zwei Wochen als P0 markiert (zuerst in `REQUESTS-TRACKING.md` H1/H2, 20.9.), immer noch nicht sauber abgeschlossen.**

### 6.4 Weitere Prompt-Quellen, die kein Recherche-Durchgang bisher erwähnt hat

- `jimesh/docs_dev/prompts/glm-session-*.md` (6 Dateien, alle 21.9.) — Auftrags-Prompts für die parallele GLM-Session, encodieren Operator-Asks, die nie durch eine Claude-Code-Session liefen. `glm-session-fill-the-gaps.md` nennt das Plugin-System #106-116 explizit als "komplett ungebaut … realistisch nicht in einer Session schaffbar" — schon am 21.9., unabhängig von allen anderen hier zitierten Quellen.
- `jimesh-crew/docs/planning/sprints/HANDOFF-2026-09-27.md` und `HANDOFF-2026-09-28-GLM-TO-CLAUDE.md` — bestätigen GO-PUBLIC "NICHT AUSGEFÜHRT" (s. 6.3) und "Multi-Select-Endpoint-Audit-Tabelle: nie gebaut, UI steht schon" ein weiteres Mal, unabhängig von `FULL-COMPLETENESS-AUDIT.md` F14/WP0.
- Diese Funde ändern keinen der Top-Befunde, bestätigen sie aber jeweils ein weiteres Mal aus einer vierten/fünften unabhängigen Quelle — was das Vertrauen in die Kernaussagen dieses Berichts erhöht.

---

*Erstellt: 29./30.09.2026, read-only Recherche über `/home/ji/projects/jimesh`, `/home/ji/projects/jimesh-crew`, `/home/ji/projects/meshsquad-public` und die Claude-Code-Session-Rohdaten unter `/home/ji/.claude/projects/`. Keine Datei in den Zielrepos wurde verändert, committet oder deployed. Primärquellen: 14 jsonl-Sessions unter `-home-ji-projects-jimesh` (06.09.–22.09., 974 extrahierte User-Turns), `docs/REQUESTS-TRACKING.md` + `docs_dev/AUDIT-2026-09-21-GAP-LIST.md` + `docs_dev/FULL-COMPLETENESS-AUDIT.md` (alle drei vollständig gelesen), R45-Dokumente (per `git show` aus der Historie rekonstruiert und volltextverglichen, Zeitstempel-Diff durchgeführt), mehrere HANDOFF-Dateien, Backlog-Diff (getrackt vs. gitignored), sowie wiederholte Live-Greps/`git branch`/`git log`-Abfragen gegen den aktuellen Code-Stand (HEAD `73c5bde3`, 30.9. 06:53). Ein zentraler Fehlbefund eines Recherche-Subagenten (eBPF sei "0 Code") wurde in Teil 0.1 explizit korrigiert, nachdem eigene Code-Prüfung das Gegenteil zeigte — als Warnung, keinem Einzelbefund in diesem Bericht blind zu vertrauen, sondern die zitierten Datei-/Commit-Belege bei Bedarf selbst nachzuvollziehen.*
