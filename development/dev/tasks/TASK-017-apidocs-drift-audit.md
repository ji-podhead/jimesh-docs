# TASK-017 — API_DOCS-Drift-Audit (170 Routen)

> **Status:** ✅ ERLEDIGT + GAPS GESCHLOSSEN (6.9.2026) — der P1–P5-Fill (fbe9648) + die 2 Security-Routen (a65928d) schließen die 76-Lücken-Worklist **komplett**. Python-Endaudit: 176 Code-Routen vs 175 Doku-Routen, 9 Rest-Diffs = Normalisierungs-Artefakte (Method-Präfixe/Leading-Slash), **0 echte Gaps**. · **Speist:** Sprint 20 WP0-Fund („mechanisch 170 distinkte `HandleFunc`-Muster, nicht gegen API_DOCS.md abgeglichen") · Langfristig: jimesh-api-Contract-CI-Muster (TASK-002-Fund)

## Auftrag

- [x] Routen mechanisch gezählt (repo-weit, nicht nur gateway/*.go): **170 unique**
- [x] API_DOCS.md-Routen extrahiert: **100 unique** (109 Tabellenzeilen)
- [x] Diff in drei Klassen mit Normalisierung (`{id}` → `*`, Query-Strip, Method-Strip — die erste Auswertung hatte einen SED-BRE-Bug, korrigiert)
- [x] Klasse (b) live + repo-weit verifiziert (nach WP0-Fix 401-t die Middleware alles unter `/api/*` vor dem Routing — Curl allein ist nicht mehr beweiskräftig, der Repo-grep ist es)
- [x] Klasse (b) behoben: 5 tote Doku-Zeilen aus API_DOCS entfernt (Commit im Worktree `task/016-policy-konsolidierung`)
- [x] Klasse (a): komplette Lücken-Liste als Worklist (unten) — die 76 Dokumentationen brauchen Handler-Lektüre (ehrlich: Beschreibungen nicht fabrizieren) → eigener Doku-Commit

## Ergebnis

### Zahlen

| Seite | unique Routen |
|---|---|
| Code (repo-weit, `HandleFunc`-Patterns normalisiert) | **170** |
| API_DOCS.md (vor Fix) | **100** |
| **(a) Im Code, fehlt in API_DOCS** | **76** |
| **(b) In API_DOCS, fehlt im Code (tot)** | **5 → entfernt** |

### (b) Entfernte tote Doku-Zeilen (verifiziert)

| Zeile | Route | Verifikation |
|---|---|---|
| 60 | `GET /api/settings/api-key` | 0 Treffer repo-weit (nur `/api/settings/api-key/regenerate` existiert — Zeile bleibt) |
| 101 | `GET /v1/health` | 0 Treffer repo-weit; live 404 |
| 157 | `DELETE /v1/chains/{id}` | 0 Treffer repo-weit; live 404 |
| 187 | `POST /v1/completions` | 0 Treffer repo-weit; live 404 („legacy") |
| 202 | `/api/agents/analytics/summary` | 0 Treffer repo-weit |

### (a) Die 76 Doku-Lücken (Worklist für den Doku-Commit)

**Security-Oberfläche (höchste Priorität):**
`/api/vault/secrets`, `/api/vault/secrets/*`, `/api/vault/tokens`, `/api/vault/tokens/*/revoke`, `/api/vault/audit`, `/api/vault/access`, `/api/budgets`, `/api/budgets/check`, `/api/teams`, `/api/team-members`, `/api/security/audit`, `/api/sessions/query`

**Projects/Deploy (Deploy-Engine):**
`/api/projects`, `/api/projects/*`, `/api/projects/deploy`, `/api/projects/redeploy`, `/api/projects/undeploy`, `/api/projects/discover`, `/api/projects/*/deployments`, `/api/projects/*/deployments/*`, `/api/projects/*/deployments/*/redeploy`, `/api/projects/*/monitoring`, `/api/projects/*/ports`, `/api/projects/*/ssh-config`, `/api/projects/*/tunnel/*`

**Chains (Canvas-Graph):**
`/api/chains/*/edges`, `/api/chains/*/graph`, `/api/chains/*/model-roles`, `/api/chains/*/nodes`, `/api/chains/*/nodes/*`, `/api/chains/*/nodes/*/members`, `/api/chains/*/nodes/*/members/*`

**Agent-Bridge/Discovery (Sprint 17/18):**
`/api/bridge/openapi.json`, `/api/bridge/provision`, `/api/bridge/stream`, `/api/bridge/tools`, `/api/discovery`, `/api/discovery/events`, `/api/discovery/scan`, `/api/discovery/status`, `/api/discovery/sync`

**Orchestration/Analytics/Sonstige:**
`/api/orchestrate`, `/api/orchestrate/cancel`, `/api/orchestrate/history`, `/api/experts`, `/api/experts/execute`, `/api/experts/runs`, `/api/analytics/models`, `/api/app-categories`, `/api/backups/schedule`, `/api/cost-trackers`, `/api/dedup`, `/api/export`, `/api/health/check`, `/api/health/monitor/start`, `/api/health/uptime/*`, `/api/iana`, `/api/import`, `/api/keys/*/cooldowns`, `/api/keys/custom`, `/api/keys/custom/discover-models`, `/api/model-roles`, `/api/models/*/enrich`, `/api/models/*/enrichment`, `/api/models/enrich-all`, `/api/models/enrichment`, `/api/ontology`, `/api/or/benchmarks`, `/api/premium`, `/api/traffic`, `/api/traffic/stream`, `/`, `/ready`, `/v1/chat/completions/ws`, `/v1/embeddings`, `/v1/mesh/models`, `/v1/providers`, `/v1/route`, `/v1/score`

### Methoden-Drift (Beobachtung, zweiter Ordnung)

Die `chains`-Routen registrieren **methoden-spezifische** Go-1.22-Pattern (`POST /api/chains/*/nodes` etc.) — API_DOCS führt sie je Methode. Keine Drift gefunden, aber die Audit-Methode muss Methoden-Patterns künftig mit-normalisieren (getan).

### Empfehlung

1. **Sofort (eigener Doku-Commit):** die 76 Routen mit ehrlichen Beschreibungen nachziehen — jede Beschreibung aus dem Handler gelesen, nicht fabriziert (Mandat 2). Die Liste oben ist die Worklist.
2. **Dauerhaft:** das `jimesh-api`-Muster (TASK-002-Fund: redocly lint + `openapi-diff --fail-on-incompatible` als CI-Gate) — dann kann diese Drift nicht wieder passieren. Als Epic-Item formulieren (Epic 11-Nachbar).
