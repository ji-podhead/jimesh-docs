# TASK-006 — jimesh-Review: Aggregation & Verwertung

> **Status:** ✅ ERLEDIGT (6.9.2026) · **Voraussetzung:** TASK-001 bis TASK-005 erledigt ✅
> **Speist:** `docs/research/R20-jimesh-reuse-review.md` §3/§4, BACKLOG (Epic 15/17/18), PRODUCT-ROADMAP, RESEARCH-PROMPTS.md

## Auftrag

- [x] Ergebnisse TASK-001 bis TASK-005 konsolidiert (R20 §Ergebnisse: 6 Task-Blöcke + Cross-cutting-Themes)
- [x] Top-5 gesamt als konkrete BACKLOG-Anker überführt (je mit Task-Quelle)
- [x] Gesamturteil: k8s-Welt vs. JiMesh' Docker+SSH-Welt — was bleibt bewusst draußen, und warum
- [x] Offene Fragen aus allen Tasks konsolidiert (6) + 3 neue Research-Prompts in `RESEARCH-PROMPTS.md`
- [x] Abgeschlossen: BACKLOG Epic 15 abgehakt, R20-Status ✅ done, `docs/tasks/README.md` Index aktualisiert

## Ergebnis

### 1. Konsolidierung — 5 Tasks, 31 Repos, ~100 gelesene Dateien

Cross-cutting-Themes über alle Tasks:

1. **Identität & Zugang:** Auth-on-when-configured-Gates (`DASHBOARD_SECRET`, `MIDDLEWARE_GATE`), Session-Cookie + `/login`-Redirect, localhost-Binds (Mandat 12 in jimesh-crew bereits gelebt), DPoP-Replay-Guard (Redis-JTI)
2. **Deklarative Konfiguration statt Code:** Agent-Registry-YAML, Topology-Anchors, Trigger-Engine, Deploy-Profile
3. **Sicherheit zwischen Agenten:** Docker-Socket-Proxy (restricted allowlist), Approval-Queues (GUARDED-Levels, DAP), Eskalationsketten (ra→rm→supervisor), RBAC über 4 Ebenen (Claim → Middleware → Policy → Labels → Egress)
4. **Deployment-Trennung:** Dual-Stack (Demo/Mainnet vollständig getrennt), `MAIN_DB_READ_ONLY` + Analytics via HTTP-API statt direkter DB
5. **Ehrliche Phase-0-Kennzeichnung überall** — die saits-Repos markieren Stubs selbst (sc-control-plane, jimesh-logs, jimesh-admin); bestätigt das JiMesh-Muster

### 2. Top-5 (gesamt) — konkrete Portierungen

| # | Portierung | Task | JiMesh-Ort | Aufwand |
|---|---|---|---|---|
| 1 | **RBAC-Kette** (Claim → Middleware → Policy → Labels → Egress + statemachine-rbac) | TASK-003/004 | Epic 17 WP5 + Roadmap §2 | **M** (größter Einzelport) |
| 2 | **Agent-Registry + Meta-Schema** (YAML: status/semver/owner/escalation/depends_on) | TASK-005 | Sprint 17/18 WP4 | S |
| 3 | **Trigger-Engine** (cron + condition + action, message_agent-Templates) | TASK-005 | JiMesh-Automation (ersetzt die 8 Server-Crons) | S |
| 4 | **Dashboard-Secret-Gate** als WP0-Login (Secret **Pflicht** + Bootstrap-Auto-Generierung) | TASK-004/005 | WP0 | S |
| 5 | **Docker-Socket-Proxy** (restricted allowlist) | TASK-004/005 | WP-Sicherheit / crew-api-Analogie | S |

### 3. Gesamturteil: k8s-Welt vs. JiMesh' Docker+SSH-Welt

**Bewusst draußen bleibt (mit Begründung):**

* **k8s-Enforcement-Layer** (Admission, NetworkPolicies als CRDs, Capabilities-Flags) — die 3-Layer-App-Kette deckt die gleiche Enforcement-Fläche ohne Cluster; JiMesh-Entscheid: **eine** Policy-Engine im Go-Gateway (R21-Frage 4)
* **SurrealDB + Qdrant** — JiMesh: Postgres + pgvector (pgx-Weg); die DAP-Spec ist selbst uneinig (DAPNet-Liste vs. `rag.md`)
* **Trading-Domänen-Code** (engine/exchange/tiers) — Zielsystem für K-LAF, nicht Portierungsobjekt
* **Discord-first-Betrieb + VNC-unauth-Muster** — Discord bleibt optionaler Sink; VNC nicht übernehmen (WP0-KRITISCH)
* **DAPCom-Abrechnungsmodell** — JiMesh-Credits bleiben Darstellungsschicht (Roadmap §4)

**Was portiert wird: Muster, nie Domänen-Code.** Gesamturteil: Die saits-Welt ist eine **Pattern-Quelle ersten Grades** für JiMesh' Docker+SSH-Welt — 40+ Cross-refs in 5 Task-Docs, 0 Übernahme-Blocker; der einzige echte M-Port ist die RBAC-Kette, alles andere sind S-Muster (Config/Gate/YAML).

### 4. Offene Fragen (konsolidiert, 6)

| # | Frage | Quelle | JiMesh-Ort |
|---|---|---|---|
| 1 | WP0-Secret: **Pflicht** statt Optional (mit Bootstrap-Auto-Generierung)? | TASK-004/005 | WP0 |
| 2 | Trigger-Engine ersetzt die 8 Server-Crons? | TASK-005 | Automation |
| 3 | Docker-Zugriff: SSH+API (JiMesh-Weg) vs. lokaler Socket-Proxy? | TASK-005 | crew-api |
| 4 | Agent-Registry: jimesh-crew-Schema; YAML-Ort (Repo `config/` vs. DB)? | TASK-005 | Sprint 17/18 |
| 5 | Casbin vs. OPA — **eine** Policy-Engine-Entscheidung | R21 / TASK-003 | Epic 17, §2 |
| 6 | Vector-Store für Skills/Memory: pgvector vs. Redis-Stack vs. Qdrant | R21 | Epic 18 |

### 5. Neue Research-Prompts (`RESEARCH-PROMPTS.md`)

3 Prompts ergänzt (Abschnitt „saits-Repo-Review", 6.9.2026): **P-R1** Policy-Engine-Entscheid (Casbin-Go vs. OPA-Sidecar vs. eigene Middleware), **P-R2** persistente Agent-Memory (Letta vs. Mem0 vs. CrewAI-Memory vs. pgvector-native), **P-R3** DPoP-Replay-Guard-Referenz (Redis-JTI-Window, fail-closed). Deckt auch den Operator-Wunsch „coolere Software zum Integrieren finden" — die Vergleichs-Kandidaten stehen in den Prompts.

### 6. Abschluss-Verifikation

* BACKLOG Epic 15: 6/6 ✅ — Subagenten-Fan-out 2× gescheitert (10/10), Ausführung sequenziell/inline wie geplant
* R20: Status ✅ done, §Ergebnisse komplett (Task 1–6)
* `docs/tasks/README.md`: Index TASK-001..006 ✅ ERLEDIGT (TASK-007 Logo/Shader bleibt für die andere Session)
* Folge-Epics verankert: **Epic 17** (Admin-Layer, RBAC-Kette als Vorlage), **Epic 18** (Skills-Hub/Skill-Security/Memory, DAP-Vorlage R21)
