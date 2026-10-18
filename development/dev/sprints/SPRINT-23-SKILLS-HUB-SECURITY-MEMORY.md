# SPRINT-23 — Skills-Hub, Skill-Security & Memory (Epic 18, DAP-Vorlage)

**Quelle:** `docs/research/R21-dap-skills-memory.md` (DAP = Dynamic Agent
Protocol, eigene Spec `ji-podhead/dap-docs` — **PRD-Status, kein Code**).
Bisher nur Backlog-Epic 18, nie in einen Sprint überführt — 0 von 7
Punkten begonnen.

## Ziel

JiMesh fehlen drei zusammenhängende Fähigkeiten: ein Skills-Hub
(Agenten-Qualitätsscore statt flachem Rating), Security für Skill-Zugriff
(welcher Agent darf welches Tool/Skill installieren/nutzen) und
persistenter Agent-Memory. DAP deckt alle drei als Design-Spec ab.

## Blockierende Entscheidung — Vector-Store (vor JEDEM Code, R21 §6.1)

Memory- und Skill-Artifact-Suche brauchen Vektor-Ähnlichkeitssuche.

| Option | Vorbild | Mandat-7-Passung |
|---|---|---|
| **pgvector** (Empfehlung) | pgx-Weg, passt zum bestehenden Postgres-Mandat | Am besten — keine neue Infra-Komponente |
| Redis-Stack HNSW | sc-ai-Muster (R21 §2.4) | Redis läuft schon, aber Stack-Module fehlen im JiMesh-Compose |
| Qdrant | DAPNet-Liste | Neue Infra-Komponente — widerspricht "kein Service ohne Not" |

**Empfehlung: pgvector.** Kein neuer Service, nutzt die bestehende
Postgres-Instanz, pgx v5 unterstützt es nativ. Redis-Stack bräuchte
Compose-Änderungen für Module, die aktuell nicht liegen. Qdrant wäre eine
komplett neue Abhängigkeit für einen Zweck, den Postgres schon lösen kann.

## Work Packages (Reihenfolge = Abhängigkeit)

- **WP0 — Vector-Store-Entscheidung** (Operator, siehe oben) + Skill-
  Dimensionen definieren (coding/deploy/security/research?) + Score-Quelle
  (WP2-Scanner-Verdict? PoT-Qualität? User-Ratings? — hängt an Sprint 20
  WP2, das selbst noch nicht existiert, siehe SPRINT-21-Handoff).
- **WP1 — Skill-Modell:** public/private-Split (Score/Level öffentlich,
  Artifacts/Memories/Strategien nur Agent+aktueller "Arbeitgeber"), Score
  **abgeleitet, nie direkt geschrieben** (`new = old + (quality-0.5) ×
  learning_rate`), Decay pro Idle-Tag, Regime-Shift-Signal.
- **WP2 — Tool-Skill-Binding:** `skill_min` macht Tools **unsichtbar**
  (nicht nur gesperrt) unterhalb der Schwelle; erfolgreiche Calls geben
  `skill_gain` zurück. Baut auf der Agent-/Tool-Registry aus Sprint 17/18
  auf (bereits vorhanden, siehe `docs/sprints/SPRINT-18-*.md`).
- **WP3 — Skill-Security (3-Layer-ACL):** Policy-Engine (siehe SPRINT-22
  E-Policy — **dieselbe Engine verwenden, nicht zweimal entscheiden**) +
  Row-Level (Postgres RLS statt SurrealDB-`PERMISSIONS`) + Capabilities-
  Härtung (kein freies SQL von Agenten, nur definierte Endpunkte). 5
  Store-Access-Levels: NONE/READ_ONLY/**GUARDED**(Approval-Queue mit
  Agent-Reason, HITL — Vorbild: TASK-014 Merge-Gate-Muster aus Sprint
  20 WP7)/**SCOPED**(YAML: max_cost_per_day, Domain-Allow/Deny,
  vendor_tier_minimum)/FULL.
- **WP4 — Memory-Layer:** pgvector-Kollektion pro Agent, dynamische
  Backstory-Injektion (Jinja o.ä.) beim Agent-Init, Write-back mit
  `quality_score` nach jedem Run.
- **WP5 — RAG als Workflow-Phase:** nicht als Tool-Call — Token-Budget
  ~400 (statt rohem Chunk-Dump), `summarize: true`, `persist_links: true`
  (Graph-Links gegen Re-Search), `access_filter: auto`. Skill-Artifacts
  selbst werden eine RAG-Kollektion.
- **WP6 — Bloat-Score:** automatische Schlankheits-Metrik bei jeder
  Tool-/Skill-Registrierung (description/schema/artifact-Tokens) —
  passt zur bestehenden Lean-Doktrin (Mandat 7 sinngemäß).

## Ausdrücklich NICHT übernehmen

SurrealLife-Game-Layer (Careers, SurrealCoin, Contraband — `dap-games.md`
trennt das sauber), DAPCom-Abrechnungsmodell (JiMesh-Credits bleiben
Darstellungsschicht, Roadmap §4).

## Akzeptanzkriterien

- [ ] WP0 vom Operator entschieden (Vector-Store + Skill-Dimensionen), in `DECISIONS.md`
- [ ] WP1–WP2 gebaut, Score-Schreibpfad nur über die Ableitungsformel (kein direkter Override außer audit-logged)
- [ ] WP3 nutzt dieselbe Policy-Engine wie SPRINT-22/E-Policy
- [ ] WP4/WP5 live mit echten Embeddings getestet (kein Mock, Mandat 2)
- [ ] Kein SurrealLife-/DAPCom-Code importiert

## Referenzen

`docs/research/R21-dap-skills-memory.md` (voller Kontext), Querverweis
SPRINT-22 (gemeinsame Policy-Engine-Entscheidung), Sprint 17/18
(Agent-/Tool-Registry als Basis), `docs/SCHEMA-model-evaluation.md`
(PoT-quality_score als Eval-Quelle).
