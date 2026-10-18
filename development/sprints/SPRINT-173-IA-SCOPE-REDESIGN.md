# SPRINT-173 — IA/SCOPE-REDESIGN: Projects | Infra | AI | DBs | General — Scope-Auswahl als Modal+Tags

**Status:** 📋 Konzept (Operator-Design 1.10.), NICHT gebaut. Das löst das Sidebar/UIUX-Chaos —
IA-Grundlage für die SPRINT-150-Live-Session. Das Navigation-only-Prinzip von S157 bleibt:
jede Route bleibt erreichbar (Mandat 14).

**Operator verbatim (1.10.):** "ich weiß wie man das chaos mit dem uiux flow und der sidebar
löst[...] wir müssen uns zu erst mal fragen was [ist] project based und was ist irgendwie global
oder server based und warum oder wer braucht das überhaupt[...] da ist mir eingefallen das wir
einfach 2 mal selector bauen können, das mit den scopes ist eigentlich nur für observability und
s3 irgendwie relevant. sast und dast kommt zu projects. 2 haupt kategorien: projects und infra
oder security & monitoring und da dann unter kategorien. 3. global kategorie könnte ai sein und
ja databases kann auch ne section sein und dann haben wir noch so basic sachen wie email,
settings, admin, secrets[...] die braucht per se jetzt erstmal keinen eigenen scope selector.
jedenfalls haben diese kategorien alle einen scope selector aber nicht alle haben multi oder
all, wie projects zb. und ist auch nicht mehr so ein nerviges dropdown sondern einfach ein
modal und dann so tags"

## Kern-Entscheidungen

1. **Leitfrage vor jeder Nav-Entscheidung:** Ist das project-based, global oder server-based —
   und WER braucht es überhaupt?
2. **ZWEI Selector-Implementierungen** statt einem Universell-Scope: Project-Selector +
   Infra-Selector. Scopes sind real nur für **Observability + S3** relevant.
3. **Haupt-Kategorien:**
   - **PROJECTS** — mit Subkategorien; **SAST + DAST ziehen hierher** (aus Security raus)
   - **INFRA** (Arbeitstitel; alias "Security & Monitoring") — mit Subkategorien
   - **AI** — dritte, GLOBALE Kategorie (S165s laufende AI-Sektion passt exakt: global,
     ohne Projekt-Bezug)
   - **DATABASES** — eigene Section
   - **GENERAL/UTILITY** (Name offen — Operator entscheidet): Email, Settings, Admin, Secrets
     **+ DASHBOARDS** (Operator-Order 1.10.) — **KEIN eigener Scope-Selector**
4. **Scope-Semantik je Kategorie:** jede Kategorie hat einen Scope-Selector, aber NICHT alle
   unterstützen multi/all — multi/all nur wo sinnvoll (Observability, S3).
5. **Selector-UI:** nerviges Dropdown weg → **MODAL mit TAG-CHIPS** (Mehrfachauswahl sichtbar,
   einzeln löschbar).

## Dashboard-Builder nach st2 (Operator-Anweisung: "guck dir an wie ich das mit den widgets und
dashboard builder in st2 gemacht hab [...] das ist auch geil mit unseren grafana dashboards das
wir diese ganzen sachen in so nem dashboard builder haben")

**Gelesen 1.10.: /home/ji/projects/trading/st-2** — das Muster ist pragmatisch und genau richtig
groß (NICHT der komplizierte GitLens-artige Overkill):
- **Widget-Registry:** AVAILABLE_WIDGETS + WIDGET_LABELS + renderWidget — ein Widget = Eintrag
  in der Registry + Render-Funktion (Beispiele dort: WorkflowGraph, TierOwnershipCard,
  LlmCostDashboard).
- **Edit-Mode-Toggle → "Add Widget"-Dropdown** → Widget hinzufügen. Kein Full-Drag-Editor.
- **Jedes Widget holt seine eigenen Daten** von seinem Endpoint (z.B. LLM-Cost-Widget mit
  eigenen Budget/Cost-Endpoints).
- **Pro Widget ein Playwright-E2E** mit Netzwerk-Mocks (tr4-dashboard-workflow-tiercard-
  widgets.spec.ts, widget-llm-cost-dashboard.spec.ts).
- **Für jimesh (WP2/SPRINT-160):** eigenes Widget-System nach diesem Muster, plus die
  bestehenden Grafana-Dashboards (SPRINT-57-Native-Embeds) als eigener Widget-Typ
  ("Grafana-Embed-Widget") — Operator-Order: Dashboards leben in der GENERAL/UTILITY-Kategorie.

## Verhältnis zu bestehender Arbeit

- **S150 (Tab-Strip, live mit Operator):** baut auf S173 auf — die Live-Session hat jetzt eine
  konkrete Operator-Blaupause statt einer offenen Design-Frage.
- **S157 (letzte IA-Reorg):** Re-Grouping wird von S173 abgelöst; Mandat 14 (Reachability)
  bleibt unverändert gültig.
- **S165 (läuft):** AI-Sektion = die globale AI-Kategorie — passt, kein Rework.
- **S171 (Presets):** Preset-Sichtbarkeit operiert auf den S173-Kategorien.
- **S138-Scope-Bar:** wird durch das Modal+Tags-Modell ersetzt.
- **WP2/SPRINT-160:** Dashboard-Builder = st2-Widget-Registry-Muster + Grafana-Widget-Typ.

## Bau-Sequenz

1. Welle 3: WP5-Registry (node_services auf alle Typen) → S170 (Utility-Container/Files/VS Code)
   → S171 (Onboarding/Presets, operiert auf S173-Kategorien).
2. Der S173-Nav-Umbau selbst: **live mit dem Operator in der S150-Session** (der Operator wollte
   den größten Umbau bewusst live) — Konzept ist jetzt verschriftlicht, die Live-Session baut
   gegen diese Blaupause.

## Nachtrag 1.10. — Firewall-Settings in den GLOBAL scope (Bulk-Editing)

**Operator verbatim:** "firewall settings kommen auch in den global scope damit man auch bulk
editing machen kann"

- **Firewall-Settings = INFRA/global-scoped** (nicht project-scoped): Die Firewall-Fläche
  gehört in den globalen Scope-Selektor (Infra-Selector) — damit wird **Bulk-Editing möglich**:
  Regeln/Settings fleet-weit über mehrere Nodes/Projekte gleichzeitig editieren statt pro
  Projekt einzeln.
- Ehrlicher Realitäts-Anker (Security-Stack-Reality-Check 29.9.): Die OPNsense-Integration ist
  bislang **0 Backend-Code (Stub)** — die globale Bulk-Editing-Fläche ist der Build-Auftrag, der
  den OPNsense-Bau richtig rahmt. Die bestehenden WAF/DLP-Flächen profitieren sofort vom globalen
  Scope.
- Scope-Modell-Folge: Firewall zählt damit zu den Flächen wie Observability + S3, die den
  Infra-Scope-Selektor (mit multi/all) wirklich brauchen — projektbezogene Firewall-Ausnahmen
  bleiben als projekt-scoped Ansicht/Filter darauf aufgesetzt, nicht als eigene Kopie.

**Zweite Operator-Präzisierung, verbatim:** "obwohl firewall eigentlich ne eigene kategorie ist
also das wo man bei security handelt statt monitoring und observability aber es is ja auch tief
verknüpft weil ja mit ebpf ja beides genutzt wird um den angriff zu stoppen. ich weiß nicht wie
man das macht ob man 3,2,1 kategorien aufmacht das sollte der uiux agent der dann den finalen
audit macht entscheiden"

- **Kategorie-Frage OFFEN, Entscheidungsbefugnis geklärt:** Firewall als EIGENE Kategorie
  (Handlungs-Fläche: "wo man bei security handelt") vs. unter Security & Observability
  (Monitoring-Fläche) vs. andere Aufteilung (3/2/1 Kategorien) — **entscheidet der UIUX-Agent
  im finalen UIUX-Design-Audit** (Handoff-Punkt 9; Vorarbeit:
  SLOP-AND-UIUX-AUDIT-2026-09-29.md).
- **Technischer Grund der Verknüpfung:** eBPF dient BEIDEN — Detektion (Falco/Tetragon-Events)
  UND Enforcement (Tetragon-Kill-Enforcement, live verifiziert 29.9., exit 137). Die Trennlinie
  Handlung vs. Monitoring ist inhaltlich fließend — deshalb gehört die Kategorien-Entscheidung
  in die Design-Perspektive, nicht in die Technik-Diktion.
- **Fest steht unabhängig davon** (Nachtrag 1): Firewall-Settings sind GLOBAL-scoped mit
  Bulk-Editing. Nur die Kategorien-Platzierung ist UIUX-Audit-Sache.

## Nachtrag 3 — Email + Chat in die GENERAL/UTILITY-Section (raus aus Workspaces/Projects)

**Operator verbatim:** "email und chat kommt auch gleich in diese utility main section" +
"gehört eigentlich nicht in workspaces und projects"

- **GENERAL/UTILITY-Section (aktuelle Liste):** Email (S152), Settings, Admin, Secrets,
  **Dashboards** (Nachtrag via S170/173), **+ Chat** — alles KEIN eigener Scope-Selector.
- **Email + Chat gehören NICHT in Workspaces/Projects** — Kommunikations-Utilities sind
  Plattform-Flächen, keine Workspace-/Projekt-Inhalte.
- **Ehrliche Spanne, dem UIUX-Agenten zur Klärung übergeben** (wie bei der Firewall-Kategorie,
  Nachtrag 2): Der SPRINT-160-Auftrag ("ai section wo proxy und meshsquad reinkommt aber wieso
  steht da nur chat") verschiebt den **LLM-Playground-Chat (/chat)** gerade laufend per S165 in
  die **AI-Sektion**. Beide Operator-Direktiven stehen verbatim; plausible Auflösung für den
  finalen UIUX-Audit: **LLM-Playground-Chat → AI** (Model-Oberfläche), **Team-/Crew-Chat
  (MeshSquad Chat-Space) → Utility** (Kommunikation) — oder Chat komplett nach Utility, wenn der
  Operator das final so will. Keine dieser Varianten wird bis dahin als entschieden behandelt;
  S165s laufende Arbeit (AI-Sektion mit Chat) bleibt davon unberührt bestehen.

## Nachtrag 4 — Terminal in PROJECTS (bewusste Ausnahme vom Global-Charakter)

**Operator verbatim:** "terminal kommt in workspaces/projects rein obwohl das eigentlich auch
global ist aber ausnahmsweise machen wir das in projects rein obwohl man eigentlich da auch nen
container auswählen darf aber wir lassen es da weil es immer by default im utility container das
terminal deployed"

- **Terminal → WORKSPACES/PROJECTS.** Bewusste AUSNAHME: das Terminal ist seinem Wesen nach
  eigentlich auch global — aber es sitzt in Projects, WEIL das Terminal **immer by default im
  Utility-Container deployed** (S170-Nachtrag: EIN Utility-Container pro Projekt) — pro Projekt
  gibt es damit ohnehin immer genau ein Standard-Terminal.
- Der mögliche spätere Ausbau — Terminal als GLOBALE Fläche mit freier **Container-Auswahl** —
  ist als Evolution-Option notiert, NICHT gebaut und NICHT geplant. Im Gegensatz zur Firewall-
  Kategorien- und Chat-Platzierungs-Frage ist hier AUSDRÜCKLICH entschieden: Projects, kein
  UIUX-Audit-Vorbehalt.
