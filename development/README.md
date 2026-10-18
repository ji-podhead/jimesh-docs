# Dokumentation (privat)

Alle Dokumentation von JiMesh lebt hier — Sprints, Handoffs, Research, Roadmap, Architektur, Audits, interne Notizen.

**Öffentlich bleibt nur:** API-Docs für Contributors im [public JiMesh2 Repo](https://github.com/ji-podhead/JiMesh2/blob/main/docs/API_DOCS.md).

## Struktur

```
docs/
├── sprints/            # Alle Sprints (SPRINT-*, BUILD-*, HANDOFF-*, VERIFY-*, ...)
├── dev/                # Entwickler-/Interne Docs (audits, knowledge, tasks, subagents)
│   ├── knowledge/      # Gateway-Specs, Strategy-Audits, Handoff-Docs
│   ├── tasks/          # Task-spezifische Handoffs
│   ├── sprints/        # Subagent-Sessions (nur *.md, keine session.jsonl)
│   └── internal/       # Root-Level interne Files (REPO_STATE, MANDATES, etc.)
├── internal/           # Operator-Interne Notizen (REPO_STATE, MANDATES, NEXT_SESSION_PROMPTS, etc.)
├── research/           # Research-Docs (ohne vendored research-forks)
├── roadmap/            # Feature-/Product-Roadmap
├── schemas/            # Data-/Component-Schemas
├── architecture/       # Architektur-Docs (K-LAF, Multi-Scope, etc.)
├── development/        # CI/CD, Packages
├── backlog/            # Backlog + Status-Checks
├── articles/           # Blogposts, Case-Studies
├── i18n/               # i18n-Docs
├── llm_providers/      # LLM-Provider-Clients, API, ToS
├── plugins/            # Plugin-Specs
├── references/         # Externe Referenzen
├── legal/              # LICENSE-COMMERCIAL, LICENSE-UPSTREAM-MIT
├── diagrams/           # SVG-Diagramme (hero-explainer, technical-architecture)
├── ARCHITECTURE.md     # Haupt-Architektur
├── MASTER-PLAN.md      # Gesamtplan
├── AUDIT-*.md          # Sicherheits-/Deployment-/Frontend-Audits
└── ...
```

## Zugriff

- **Private Repo** (`ji-podhead/jimeshIO`) — nur Owner/Zugelassene
- **Public Repo** (`ji-podhead/JiMesh2`) — Contributors sehen nur `API_DOCS.md` + `README.md`

## Migration

Ursprünglich in `JiMesh2/docs/` + `JiMesh2/docs_dev/` — migriert am 2026-10-11 ins private `jimeshIO` Repo.
Die public `JiMesh2/docs/` behält nur API-Docs für Contributors.
