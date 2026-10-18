# Tasks — eigenständige Arbeitspakete

> Zweck: Selbstausführbare Arbeitspakete, die nicht in einen Sprint gehören —
> Reviews, Spikes, Auswertungen. Jede Task-Datei ist ohne Session-Kontext
> ausführbar (Vorbedingung: die unten genannten Kontext-Doks überfliegen).

## Konventionen

* **Benennung:** `TASK-<NNN>-<slug>.md`, fortlaufend nummeriert.
* **Status** im Header: ⏳ OFFEN · 🔀 IN ARBEIT · ✅ ERLEDIGT · ❌ VERWORFEN (mit Begründung).
* **Vorab-Kontext** für JiMesh-Aufgaben, skimmend lesen:
  `docs/sprints/SPRINT-20-KLAF-FOUNDATION.md`, `docs/PRODUCT-ROADMAP.md`, `MANDATES.md`.
* **Lesebudget:** max. ~30 Dateien pro Ziel-Repo. Priorität: README →
  `find <repo> -maxdepth 2 -not -path '*/.git*'` → Compose-/Config-/CI-Dateien →
  Kernmodule. `node_modules`/`venv`/`dist`/`.git` immer überspringen.
* **Ehrlichkeit:** Jede Aussage mit Fundstelle (Repo/Pfad) belegen; Unsicherheiten
  markieren; nichts erfinden. Negativbefunde sind Ergebnisse („nichts gefunden" zählt,
  wenn gesucht wurde).
* **Ergebnis** in der Task-Datei festhalten; falls die Task ein R-Doc speist, dort
  Querverweis setzen. Erledigte Tasks bleiben als Verlauf liegen.

## Ergebnis-Format (für Review-/Analyse-Tasks)

```
## Reusable für JiMesh
| Fund | Fundstelle (Repo/Pfad) | JiMesh-Problem (WP/Roadmap) | Aufwand S/M/L | Warum wertvoll |
## Nicht portieren
| Was | Warum nicht |
## Drift/Überraschungen
## Offene Fragen
(3–5 Stück)
```

## Ausführungs-Zuteilung (6.9.2026, Operator-Entscheidung)

GLM-5.3 (via DSH) bekommt nur mechanische, eng spezifizierte Tasks. Alles mit
echtem Abwägungsbedarf (Dependency-Entscheidung, Tool-Recherche, Architektur)
macht Claude selbst — kein Vertrauen in GLM-Urteilsvermögen bei diesen Fragen.

| Task | Ausführung | Grund |
|---|---|---|
| 008, 009, 010, 012 | Claude-Session (Sequenz-Block) | teilen sich `projects_ssh.go` |
| **011** | **Claude** (nicht GLM) | Kern-Architektur, mehrere Dateien, SDK-vs-Shellout-Abwägung |
| 013, 014 | GLM via DSH | mechanisch genug, Briefing in `subagents/s3`, `s4` — laufen |
| **015** | **Claude** (nicht GLM) | braucht echte Tool-Recherche — **erledigt**, socket-guard implementiert & getestet |
| 009, 010 | GLM via DSH | mechanisch genug, Briefing in `subagents/s5`, `s6` |
| **012** | **Claude** (nicht GLM, umgewidmet) | braucht pragmatische Recherche (DNS-Allowlist vs. Egress-Proxy), gleiche Klasse wie 011/015 |
| 016, 017 | Claude-Session (inline) | reine Doku/Entscheidungsvorlage |

Konsolidierte Briefings pro GLM-Agent (Worktree-Protokoll + Mandates + Task in
EINER Datei, kein Herumsuchen im Repo nötig): `docs/tasks/subagents/sN/BRIEFING.md`.
Handoff-Bericht kommt in dieselbe Datei (Anhang unten) UND in die `## Ergebnis`-
Sektion der Task-Datei im Worktree.

## Index

| Task | Titel | Status | Speist |
|---|---|---|---|
| TASK-001 | jimesh-Review: Security & Identity | ✅ ERLEDIGT | R20, Epic 15 |
| TASK-002 | jimesh-Review: Plattform & Gateway | ✅ ERLEDIGT | R20, Epic 15 |
| TASK-003 | jimesh-Review: Ops & Observability | ✅ ERLEDIGT | R20, Epic 15 |
| TASK-004 | jimesh-Review: AI, RAG & Skills | ✅ ERLEDIGT | R20, Epic 15 |
| TASK-005 | jimesh-Review: Trading & Agent-Infra | ✅ ERLEDIGT | R20, Epic 15 |
| TASK-006 | jimesh-Review: Aggregation & Verwertung | ✅ ERLEDIGT | R20 §3, BACKLOG/Roadmap |
| TASK-007 | Logo (SVG) & Shader-Morph-Loop | ⏳ OFFEN | repo-assets/ (Hero) — **andere Session** |
| TASK-008 | WP0: SSH-Host-Key-Verifikation | ⏳ OFFEN | Sprint 20 WP0 |
| TASK-009 | WP0: Workspace-Berechtigungen | ⏳ OFFEN | Sprint 20 WP0 |
| TASK-010 | WP0: Restaufräumung (toter Code, Doc-Links, .env.example) | ⏳ OFFEN | Sprint 20 WP0 |
| TASK-011 | WP1: Identitätskette | ⏳ OFFEN | Sprint 20 WP1 |
| TASK-012 | WP5: Egress-Allowlist | ⏳ OFFEN | Sprint 20 WP5 |
| TASK-013 | WP6: Exposure-Dashboard & FirewallProvider | ✅ ERLEDIGT | Sprint 20 WP6 — auf main, Live-Smoke offen |
| TASK-014 | WP7: Workspace-Integrität & Execution-Sandbox | ⏳ OFFEN | Sprint 20 WP7 |
| TASK-015 | Docker-Socket-Proxy (Incident-Root-Cause) | ⏳ OFFEN | saits-Review Top-5 #5 |
| TASK-016 | Epic 17: Policy-Konsolidierung (Entscheidungsvorlage, kein Code) | ✅ ERLEDIGT | DECISIONS-Entwurf im File; Freigabe: Operator |
| TASK-017 | API_DOCS-Drift-Audit (170 Routen, reine Doku) | ✅ ERLEDIGT | 76 Lücken geschlossen (P1–P5-Fill + 2 Security-Routen, a65928d); Python-Endaudit: 0 echte Gaps |
| TASK-018 | API_DOCS-Lücken-Fill (76 Routen, reine Doku) | ✅ ERLEDIGT | GLM-Headless-Lauf gescheitert (leerer HANDOFF); Fill über P1–P5-Commits der anderen Session + 2 Security-Routen |
| TASK-020 | Frontend: Keycloak-OIDC-Login verdrahten | ✅ ERLEDIGT | Sprint 27 WP3/WP4 — gemergt (f61999f), kein interaktiver Browser-Klick-Test (kein GUI-Tool in der ausführenden Session) |
| TASK-022 | Frontend: Security-Tab (Freeze/Release + Firewall-Status) | ✅ ERLEDIGT | Sprint 20 WP3/WP6 — FirewallStatusTile + SecurityEventsSection + FreezeDialog auf der Exposure-Page, gemergt 8.9.2026; Backend-Live-Verifikation eingeschränkt (siehe Task-Datei) |
| TASK-021 | Frontend: Forensik-Report-Widget | ✅ ERLEDIGT | Sprint 20 WP4 — SecurityReportPage + SecurityEventsPage, gemergt 8.9.2026; tsc/tests/i18n grün |
| TASK-028 | Sprint 22 WP1/2/3/5: Dashboard-IA + Admin-Konsole + Quota-Widgets | ✅ ERLEDIGT | 4 Haupttabs (Proxy/Projects/Security/DBs), /admin-Konsole (Teams/Users/Budgets/Consumer-Keys), BudgetStatus-Widget auf Keys, DBs-Tab mit ehrlichen Empty-States; 230/230 + i18n 60 Locales grün, alle Routen live 200 (8.9.2026) |
| TASK-029 | Frontend: Bugfix-Runde + Security-IA | ✅ ERLEDIGT | 4 React-Bugs gefixt (setState-in-render, nested button, asChild, Backups-Crash), Logs-SSE korrigiert, Security-Hierarchie + Embeddings rebuild; gemergt (a63ec77) |
| TASK-030 | Frameworks + VNC loopback + Ports→Projekt | ✅ ERLEDIGT | claude-code/gemini-cli wählbar, shell-only-UI ehrlich (4c173b2); Backend 3246297; Ergebnis f8ba91a |
| TASK-031 | Backend: /api/embeddings* CRUD | ✅ ERLEDIGT | Real CRUD + usage (e055908), Contract-Shapes gefixt (6ff2d5e); live verifiziert |
| TASK-027 | Frontend: Consumer-Keys-Verwaltung | ✅ ERLEDIGT | Sprint 22 WP7 — ConsumerKeysPage (/admin/consumer-keys), gemergt 8.9.2026; 230/230 Tests + i18n 60 Locales grün, Route live (200); Browser-Mint-Durchlauf offen (Session-Login in der ausführenden Session nicht möglich) |
