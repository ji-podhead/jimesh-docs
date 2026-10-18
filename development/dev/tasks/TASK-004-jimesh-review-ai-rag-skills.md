# TASK-004 — jimesh-Review: AI, RAG & Skills

> **Status:** ✅ ERLEDIGT (6.9.2026) · **Speist:** `docs/research/R20-jimesh-reuse-review.md` §Ergebnisse, Epic 15
> **Repos:** `/home/ji/projects/jimesh-mirror/` → `jimesh-ai` (106 Dateien), `ragas` (1, Submodule-Stub), `sc-ai` (16), `altfins-ai-skills` (86), `skill-docs` (leer)
> **Ziel-Mapping:** Sprint 17/18 (MCP, Agent-Tool-Registry, Auto-Discovery) · E8 (Multi-Tenant) · `docs/SCHEMA-model-evaluation.md` · WP2 (Scanner-Chain) · Epic 14 (DB/CDC)
> **IA-Zuordnung (Operator-Entscheidung 6.9.2026, siehe R20 §5):** RBAC/OPA/Tenants → separate Admin-Seite; Scopes/Quotas → Proxy-Kern; RAG (falls gebaut) → Utility/Agent-Layer, nicht die Proxy-Hauptseite.

## Auftrag

- [x] RAG-Pipeline geprüft: **sc-ai ist die echte, kompakte Referenz** (~90 Zeilen Kette + ~90 Zeilen Vector-Store); `jimesh-ai` liefert nur Fragmente (Phase-0-Verbatim-Kopie)
- [x] ragas-Eval: **ragas ist nur ein LICENSE-Stub**; die Eval-Spec lebt in `sc-ai/eval/proof-of-search{,2}` (Metriken + Schwellen + Fixtures) — Mapping zu `SCHEMA-model-evaluation.md` gezogen
- [x] Multi-Tenant-Isolation im RAG: Index+Key-Präfix pro Tenant (Redis-Stack HNSW) — Isolation by construction
- [x] Skills-Packaging: SKILL.md-Contract, validated-surfaces-Snapshots, Validierungs-CI, Multi-Plattform-Installer
- [x] Prompt-Management: **kein Registry-Muster gefunden** — Prompts hardcoded in Modulen, „Mandates" als Code; Fakten-Injektion über skill_doc/token_budget
- [x] DB-Discovery/CDC: **Negativbefund** (5. Repo-Gruppe in Folge)
- [x] „Nicht portieren"-Liste geführt

## Regeln

Globale Regeln + Ergebnis-Format: `docs/tasks/README.md`.
Lesebudget ~30 Dateien/Repo (README → Struktur → Pipeline-/Skill-Definitionen).

## Ergebnis

## Reusable für JiMesh

| Fund | Fundstelle (Repo/Pfad) | JiMesh-Problem (WP/Roadmap) | Aufwand | Warum wertvoll |
|---|---|---|---|---|
| Redis-Stack HNSW pro Tenant: `FT.CREATE idx:{tenant}:vectors ON HASH PREFIX 1 vec:{tenant}:` (FLOAT32, COSINE, M=16, EF=200); Isolation über Key-Präfix + eigenen Index, **nicht** über Filter | `sc-ai/lcore/vector/__init__.py` | E8, Projekt-Doku-RAG | S | Isolation by construction — kein Cross-Tenant-Leak über Filterfehler möglich |
| Minimale RAG-Kette: embed → KNN → Context-Assembly → Streaming-Completion mit Grounding-Prompt („nur aus dem Kontext antworten, sonst sagen") | `sc-ai/lcore/rag/__init__.py` | Projekt-Doku-RAG | S | ~90 Zeilen als Minimalismus-Vorbild — JiMesh bräuchte genau das, nicht mehr |
| Eval-Spec mit Fixtures + Schwellen: precision@5 ≥ 0.80, recall@5 ≥ 0.70, MRR ≥ 0.85; E2E: faithfulness ≥ 0.85, answer relevance ≥ 0.80, context recall ≥ 0.70 | `sc-ai/eval/proof-of-search/README.md`, `proof-of-search2/README.md` | `docs/SCHEMA-model-evaluation.md` | S | Konkrete Metriken/Ziele/Fixture-Formate (queries.jsonl / qa.jsonl) für das JiMesh-Modell-Eval |
| SKILL.md-Contract: YAML-Frontmatter (name/description) + Purpose / „Use This Skill When" / **„Do Not Use This Skill When"** + Workflow + references-Links; ein Skill = ein Verzeichnis = ein Package | `altfins-ai-skills/altfins-query-builder/SKILL.md`, `docs/repository-architecture.md` | Sprint 17/18 Tool-Registry | S | Agent-Contract mit expliziten Negativ-Grenzen — passt zum JiMesh-Dok-Stil |
| validated-surfaces-Snapshots: CLI-Help-Outputs + MCP-Surface als eingecheckstes JSON (`runtime_tool_names_confirmed: false`!) + Regel „Tools erst im Client discovern, nie Namen erfinden" | `altfins-ai-skills/docs/validated-surfaces/`, `references/mcp-anchors.md` | Sprint 17/18 MCP | S | Anti-Halluzinations-Disziplin für die Tool-Registry: Snapshots einchecken, Laufzeit-Discovery erzwingen |
| Skill-Validierungs-CI: `validate_skills.py` + `lint_markdown_contracts.py` (Broken-Link-Contract-Linter!) + Installer-Smoke + Release-Smoke (+ Windows-Job) | `altfins-ai-skills/.github/workflows/validate-skills.yml` | Skills-Distribution (falls JiMesh shipped) | S | Qualitätstor für Docs-First-Skills |
| Multi-Plattform-Installer: claude-code / codex / copilot / gemini + project-mode (`.altfins-skills/`, Cursor/OpenClaw-Glue), Homebrew-Tap | `altfins-ai-skills/docs/skill-installation.md`, `bin/` | Skills-Distribution | M | Nur falls JiMesh eigene Skills shipped |
| Token-Budget mit Stufen-Enforcement: 80 % economy, 95 % trade-stop, 100 % full stop; Budget als **eine Zeile** in „hard_facts" (kein Prompt-Pollution); Redis-Counter mit Daily/Monthly-Reset | `jimesh-ai/ai/token_budget.py` | §4 Credits, Gateway-Enforcement | S | Graduierter Enforcement (warn/throttle/stop) statt nur hartem Stopp |
| Two-Tier-Memory: Skill Doc (klein, immer geladen, Agent pflegt ihn per Tool) + Session Log (voll, optional lesbar, auto am Session-Ende) | `jimesh-ai/ai/skill_doc.py` | Agent-Kontextmanagement (Sprint 17/18) | S | Kompakt-Digest + Voll-Log-Split gegen Kontext-Explosion |
| Fingerprint-Semantic-Cache: normalisierter Zustand → SHA256 → TTL-Cache (300s) | `jimesh-ai/ai/agent/semantic_cache.py` | Gateway-Antwort-Caching | S | Kosten/latency bei ähnlichen Inputs |
| Docker-native Inference-Erkennung: `docker exec` → `/proc/net/tcp` → ESTABLISHED-Verbindungen auf :443 zählen → Redis-Status für Widget — **ohne eBPF** | `jimesh-ai/claude/inference_detector.py` | WP8-Beobachtbarkeit | S | Umgeht die Go-eBPF-Lücke (R19/E1) auf Host-Ebene; docker exec via JiMesh-SSH ohnehin vorhanden |
| Agent-Mandate-Schema: Rolle/Server/Permissions/Boundaries/Review + Kollaborations-Kanaltabelle + Conflict-Avoidance (Datei-Lock via Ping + 30s-Wartezeit) | `jimesh-ai/claude/mandates.py` | Sprint 17/18 Multi-Agent | S | Spiegel von JiMesh' `MANDATES.md` auf Agent-Ebene |
| **RBAC im Agenten-Statemachine** (Nachtrag nach Operator-Hinweis 6.9.): Rollen-Hierarchie superadmin(100) > admin(80) > backend/frontend/discord/qa(50) > agent(20) > system(10); `check_permission` → (allowed, forced, reason); SuperAdmin-Force-Override **immer auditiert** (forced-Flag); Capability-Flags `can_kill_agents` / `can_modify_events` / `can_modify_core_tags`; Rollen gespiegelt aus SurrealDB `rbac_roles`, In-Process-Cache ohne DB-Roundtrip | `jimesh-ai/claude/statemachine/rbac.py` (201 Z., Zwillings-Kopie in st-2 `src/lcore/claude/statemachine/`), `engine.py` (RBAC-Check vor jeder Transition, Denials auditiert) | Sprint 17/18, Epic 17 Admin-Layer | S | Arbeitsfähige Autorisierungslogik — Blaupause für JiMesh-Admin-Operationen (Freeze/Kill/Config-Änderung mit Rolle + Audit + Force-Override-Spur) |
| Discord-Kanal-ACL pro Rolle (`channels_write`/`channels_read`), Task-Routing via Role-Mention → Redis-Queue | `jimesh-ai/claude/roles.py` | Sprint 17/18 | S | Kanal-Level-ACL als Muster für JiMesh-Inbox/Themen-Sichtbarkeit |

*(ragas: nur LICENSE-Stub — kein Vendoring vorhanden; `skill-docs`: leer, 0 Dateien.)*

## Nicht portieren

| Was | Warum nicht |
|---|---|
| `jimesh-ai` als Ganzes | Phase-0-Verbatim-Kopie des Trading-Bots; un-decoupled `lcore.*`-Imports; Kopier-Trümmer im Repo (`manager.py.pr2036`, `orders.py.bak.crew4`, `supervisor_agent.py-fixed`) |
| SurrealDB-Memory-Backend | Wird im eigenen Phase-1-Plan gegen Redis-Stack getauscht (README §Phase-1.4) |
| Discord-Integrationen (bot, presence, Surreal-Bridge) | JiMesh ist nicht Discord-zentriert |
| Claude-Worker-Monolith (`claude/api.py` 4932 Z., `claude8_worker.py` 1928 Z.) | Monolith + provider-spezifisch; JiMesh macht Routing im Go-Gateway |
| Clerk-lgateway (`sc-ai/lgateway`) | JiMesh hat eigene Identitätskette (WP1); DPoP-Validierung existiert dort doppelt (s. Drift) |
| ragas-Vendoring | Stub ohne Code; die Eval-Spec (Metriken + Fixtures) ist der Wert |

## Drift/Überraschungen

* **DPoP-Replay-Guard-Dreifachung:** `sc-ai/lgateway/auth/__init__.py` nutzt ein In-Process-dict (Kommentar: „Production: replace with Redis SETNX + TTL") — obwohl das kanonische Lua-Primitiv (`jimesh-cloud/bootstrap/redis-scripts/dpop-jti-dedup.lua`, TASK-002) existiert. Bestätigt die TASK-002-Drift-These repo-übergreifend: drei Consumer, drei Implementierungen.
* **ragas ist nicht da:** Submodule-Stub mit nur LICENSE. „ragas-Eval" ist in Wirklichkeit eine eigene Metriken-Spec in den sc-ai-eval-READMEs (ragas-artige Metriken, ohne ragas-Code).
* **`jimesh-ai` = 106 Dateien Kopie inkl. Trümmern** (`.bak.crew4`, `.pr2036`, `-fixed`-Dateien eingecheckst); README listet Decoupling/Packaging/Provider/Memory-Swap als offene Phase-1 — die ehrlichste Selbstbeschreibung der Gruppe.
* **`altfins-ai-skills` ist das einzige „fertige" Repo der Gruppe** (CI mit 5 Jobs, Installer, Releases, Homebrew, Validierungs-Szenarien + Golden-Examples pro Skill).
* **Prompt-Management = Git:** Prompts hardcoded in Modulen (RAG-Systemprompt, Extraction-Prompts), Mandates als Python-Dict; keine zentrale Prompt-Registry/Versionierung. Wenn JiMesh Prompt-Versionierung will, muss es sie selbst bauen (oder Prompts in Vault/DB legen — Mandat-9-nah).
* Negativbefunde: kein DB-Discovery/CDC (5. Gruppe in Folge); `skill-docs` leer.

## Offene Fragen

1. Projekt-Doku-RAG als JiMesh-Feature (sc-ai-Muster, S-Aufwand): Utility-Layer (Epic 14-Nachbar) oder Agent-Infra (Sprint 17/18)? Und ist Redis-Stack als Vector-Store im JiMesh-Stack überhaupt vorgesehen (aktuell nur Redis ohne Stack-Module)?
2. Eval: Übernimmt `SCHEMA-model-evaluation.md` das Fixtures+Schwellen-Muster (Retrieval-Qualität pro Embedding-Modell messbar)? Wo liegen die Fixtures (Repo vs. Vault vs. DB)?
3. Sprint 17/18: Übernimmt die Agent-Tool-Registry das validated-surfaces-Muster (Snapshots einchecken, „nie Tool-Namen erfinden", `runtime_tool_names_confirmed`-Flag)?
4. §4: Stufen-Enforcement (80/95/100 %) im JiMesh-Gateway statt nur hartem Stopp — und Budget-Injektion als eine Zeile in den Agent-Kontext?
5. Prompt-Versionierung: will JiMesh ein Prompt-Registry (DB/Vault, versioniert) oder bleibt es bei Git-versionierten Prompts im Code?
