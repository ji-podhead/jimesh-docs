# HANDOFF — Session 36 → Quota-Pause (13.9., ~90 min bis Quota-Rückkehr)

**Lesezeit 3 min. Nächste Session: §4 "Sofort-Lane" starten.**

## 1) Stack-Lage JETZT

| Service | Status |
|---|---|
| Backend (:19091) | ✅ `{"status":"ok"}` |
| Keycloak (:8081) | ✅ 302 |
| Headscale (:8082) | ✅ 200 |
| Postgres | ✅ (Backend→pg bewiesen via /dev/tcp) |
| Frontend (:19090) | 🟡 `npm ci` in-flight (fresh boot; 2. Versuch nach Dead-Process bei 534 pkgs; entry-fallback `|| npm install` abgesichert) |

**Root-Causes dieser Session (gefixt/dokumentiert):**
1. Backend-`entry.sh` starb fail-loud bei `apt docker-cli` → Fix: WARN statt exit (degraded boot).
2. Frontend `npm ci` Dead-Process bei 534 pkgs → Container-Restart; `|| npm install`-Fallback greift.
3. Messfehler `wget --spider :5432` = HTTP-Handshake → exit 4 trotz offenem TCP (bewiesen: Backend→pg OK).

## 2) Diese Session abgeschlossen (alle gepusht auf main)

| Commit | Task | Inhalt |
|---|---|---|
| d36c62e | 032 | jimesh-logger SDK + `/api/sdk/logs` + sessions |
| 3ffc260 | 034 | CDC pglogrepl in-process (581 Z. + 396 Z. Tests, preflight/slot) |
| 1d727c2 | 035 | MCP-Provider (stdio, 5 Tools) |
| 9445fa1 | 033 | **Edge-Node jimesh-router FINALISIERT** (1670 Z.: RESP, Alias→DB-Map, pg+redis; agent-Arbeit, von mir verifiziert build+vet+test) |
| 5f27ce4 | — | Spawn-Prompts 036+037 |

## 3) LÄUFT GERADE (2 Subagents, ca. 60-90 min)

| Agent-ID | Task | Scope | Prompt |
|---|---|---|---|
| `371d24cf` | 036 Frontend | `src/frontend/**` NUR | `docs/tasks/subagents/PROMPT-task-036-frontend-networks-agents.md` |
| `6aa81b4d` | 037 Workspaces-Hierarchie | Backend: workspaces-Tabelle, per-User-RBAC-Space, Worktree-Generalisierung, Discovery-Verkabelung, API_DOCS (exklusiv diese Runde) | `docs/tasks/subagents/PROMPT-task-037-workspaces-hierarchy.md` |

**037 beantwortet die Operator-Frage:** Deployments brauchen User-RBAC-Space →
**beides** (per-User-Provisionierung Container/Key/Session + Worktree-Stufe),
generalisiert aus projects_ssh.go:881 (Task-Worktree → per-User-Worktree,
wenn `owner_user_id` gesetzt; ohne = Backward-compat wie heute).

## 4) SOFORT-Lane nächste Session (mit Quota)

1. `git log --oneline -6` → 036/037-Commits einsammeln, reviewen, mergen
   (Agents committen, pushen NICHT — ich merge nach Review).
2. Falls nicht fertig: Prompts erneut spawnen (Files liegen in
   `docs/tasks/subagents/`, sind self-contained).
3. Frontend-Health checken (`curl :19090` — npm ci-Fallback sollte
   gegriffen haben; sonst `docker restart jimesh-frontend-1`).
4. **Sprint-37-File** sollte 037 angelegt haben
   (`docs/sprints/SPRINT-37-WORKSPACES-HIERARCHY.md`) — checken + abhaken.

## 5) Task-Map (Vollständigkeit — „fast alles geplant" ✓)

**Geplant & wartet auf Slot (nach 036/037-Merge):**
- **WP2-4 K-LAF** (E1-E5 entblockt): Scanner-Framework (WP2), Freeze/Release (WP3), Forensik-Pipeline (WP4) — Achtung `internal/store`-Konflikt mit 037 → erst nach 037-Merge spawnen
- **040-042 Frontend-Welle** (nach 036-Merge): DB-Discovery-UI + Audit-Logs, Security-Report-Tab, Preset-Picker
- **Docs-Phase** (nach 037-Merge, API_DOCS exklusiv): API_DOCS-Konsolidierung, User-Guides
- **047 History-Rewrite** (R32: 4 Tokens + IP/User) + Public-Flip
- **Edge-Node WP6** (046): Local-Ingest + CDC-Forward — Basis liegt (033+034)!

**Operator-Items (deine Lane):** E1-E5-Haken · Lizenz-Platzhalter · 4 Token-Verifikation · Public-Flip · Debezium-Hub v1-vs-Enterprise-Finalcall

## 6) Konventionen (unverändert)

- Agents: committen ja, pushen nein; explizite Pfade statt `git add -A`;
  API_DOCS exklusiv pro Runde; Live-Verify wenn Stack kooperiert, sonst
  ehrlich dokumentieren (No-Mock).
- Merge-Reihenfolge immer: scoped build+vet+test → review → ich merge+push.
