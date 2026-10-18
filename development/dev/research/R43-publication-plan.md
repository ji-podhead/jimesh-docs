# R43 — PUBLICATION PLAN: Zwei-Repo-Architektur + Jules-Workflow

**Datum:** 2026-09-14 · **Status:** AKTIV · **Auslöser:** Operator-Entscheidung
„2. Repo im GitHub-Org, clean forked, kein History-Verlauf, keine Leaks, kein
Personal-Kram wie Sprints" + Jules als Rechenressource.

## 1. LEAK-INVENTAR (Audit 2026-09-14, Main-Tree + History)

**In der gepushten History (→ History-Scrub im PUBLIC-Repo via Fresh-Start gelöst):**

| Leak | Where (Main-Tree) | History-Commits |
|---|---|---|
| SSH-Klartext-Credentials (Host+User+Pass) | docs/research/R39:145 | 1 (60535c3) |
| Tailscale-Node-IP + **WAN-IP 88.198.67.200** + User | docs/research/R32:6, docs/prompts/CHAT_LOG_20260911.md, docs/sprints/SPRINT-20:46 | 4 |
| Wazuh-Demo-Creds (SecretPassword/kibanaserver) | deploy/wazuh/*, deploy/siem/* | 2 |
| Persönliche Pfade /home/ji | docker-compose.yml:86, Makefile:25, cdc-Tests | viele |

**Rotationspflicht (Operator, unabhängig vom Repo):** SSH-Key-Trust + Passwort auf
der Target-Node rotieren (die Credentials sind in der History — history egal wie
gesäubert, einmal gepusht = rotieren).

## 2. ZWEI-REPO-ARCHITEKTUR

| | PRIVAT (bestehend) | PUBLIC (neu) |
|---|---|---|
| Repo | jimesh (origin, volle History) | jimesch-public (GitHub-Org, **frischer Initial-Commit, KEINE History**) |
| docs/research/ | bleibt (Agent-Kontext, Secrets → redacted) | **EXCLUDED** |
| docs/sprints/ | bleibt | **EXCLUDED** (→ Jules bekommt Sprints als Text-Prompt) |
| docs/prompts/ (Chat-Logs) | bleibt | **EXCLUDED** |
| docs/tasks/ | bleibt | **EXCLUDED** (→ in CLEAN BACKLOG überführt) |
| /home/ji | bleibt | **→ ${HOME}/Env-Vars** (docker-compose, Makefile) |
| Wazuh-Demo-Creds | bleibt (Demo-Tier, intern) | **→ .env.example-Platzhalter + generate-secrets-Hinweis** |
| Alles andere (Code, Tests, deploy, docs/api) | ✓ | ✓ identisch |

**Beantwortete Frage „Repo löschen + Tree zurücksetzen?":** NEIN für das private
Repo (bleibt Archiv + Agent-Kontext mit voller History). JA implizit für das
Public-Repo: das ist kein Fork/Klon — es ist ein **frischer Export des Trees**
(`git archive` oder orphan-checkout), dadurch ist die History-Frage strukturell
erledigt (es gibt keine History). Späterer PR public→origin = squash-merge der
Clean-Basis, History des Privaten bleibt intern.

## 3. SCRUB-LISTE PRIVATES REPO (Working-Tree, sofort)

Damit Agenten nicht weiter aus den Docs zitieren: konkrete Werte in
R39:145 / R32:6 / CHAT_LOG_20260911 / SPRINT-20:46 → `[REDACTED — siehe Vault]`.
Werte NICHT hier wiederholen. (R43 selbst enthält absichtlich keine.)

## 4. JULES-WORKFLOW: CLEAN BACKLOG + SPRINTS-ALS-PROMPT

**BACKLOG.md (public repo root)** = die maschinenlesbare Task-Quelle. Ein
Jules-Task-Entry hat Pflichtfelder:

```
### TASK-081 — LLM-Security-Tab + per-project Guard-Policies
- status: open            # open | in-progress | done | blocked
- scope: src/frontend/src/pages/Security/*, src/backend/internal/llmproxy/*
- depends: TASK-076 (LLM-Proxy live), TASK-070 (Capability-Store)
- acceptance:
  1. Security-Tab-Sektion "AI Guard" listet Policies pro Project
  2. PUT /api/llm/policies/{project} validiert + persistiert (audit-logged)
  3. linterfaces: blocked_request counter je Policy sichtbar
- context: sprints werden per Text-Prompt geliefert; kein docs/-Zugriff nötig
```

**Sprints als Text-Prompts:** pro Jules-Task wird der relevante Sprint-Abschnitt
(oder R-Doc-Auszug) in das Task-Prompt kopiert — der Agent braucht nie docs/-Zugriff.
Damit bleibt research/sprints/personal-Kram dauerhaft aus dem Public-Repo.

**Zusätzlich im Public-Repo:** CLAUDE.md/AGENTS.md-Kurzversion (Build/Test-Commmands,
Conventions), LICENSE, README (public-sicher), .env.example komplett.

## 5. SEQUENZ

1. ✅ Scrub private Working-Tree-Docs (dieser Commit)
2. ⬜ Operator: Repo `jimesch-public` in der GitHub-Org anlegen (leer, no-readme)
3. ⬜ Clean-Tree-Export (archive → init → first commit: „JiMesh — public base") + push
4. ⬜ CLEAN BACKLOG.md generieren (aus docs/tasks/ — Werte-Geprüft, Jules-Schema)
5. ⬜ Jules-Onboarding: erste 2-3 Tasks als Prompts (Backlog-Entries + Sprint-Auszüge)
6. ⬜ Parallel: Mandate-12 (0.0.0.0) im privaten Repo fixen, bevor der Export läuft
7. ⬜ Wenn Public reif: PR public→origin (Operator entscheidet über Merge-Strategie)

## ANHANG B — TASK-ÜBERSICHT (Audit 2026-09-14, alle Wellen 032–082)

### ✅ FERTIG + VERIFIZIERT (gemerged, live getestet)

| Task | Was | Note |
|---|---|---|
| 032 | Logger-SDK (sdk_logs, X-Header-Kette) | Basis für 076-Feedback-Loop ✓ |
| 033 | Router-Node (L7-Proxy, Alias-Registry, Pull) | Edge-Node 058 baut darauf ✓ |
| 034 | CDC pglogrepl | ✓ |
| 035 | MCP-Provider (register_db_endpoint etc.) | ✓ |
| 053 | Frontend-IA-Trennung (Workspaces/Platform/Ebenen-Badges/Firewall-UI) | Platform-Tab = E-IA ✓ |
| 054 | SIEM Stack-B/C (Wazuh+Falco+Bridge, live Events) | E-SIEM-Confirm offen (Operator) |
| 055 | Vault-Project-Isolation | ✓ |
| 056 | RBAC-Rollen-UI (AdminUsers/Budgets) | erweitert durch 070-Capability-View ✓ |
| 057 | WAF Coraza-Sidecar (SQLi/XSS live geblockt) | WP3-Faced_by_waf offen; Remote-Smoke offen |
| 058 | Edge-Node (Ingest+CDC+WAN-Puffer) | Demux-Deadlock-Fix +2 Bugs mitgefixt ✓ |
| 060 | Control-Plane-Registry (SSH echt, 4×501-Stubs) | Live-Curl braucht Operator-Login ✓ |
| 062 | Control-Planes-UI (CRUD+Provision+Deploy) | ✓ |
| 066 | Vault-Konsolidierung nach E-IA | 2 Agents-Takeover dokumentiert ✓ |
| 067 | Wazuh-Dashboard new-tab (2× unabhängig gefixt) | iframe-Decision korrigiert ✓ |
| 069 | Security-Overview Picker + Popover-Fix | Prämisse widerlegt (Route existierte) ✓ |
| 070 | Capability-RBAC (6 Domänen, Live-403-Kette) | 2× verifiziert (d6b6bec) ✓ |
| 071 | Ghost-Delete + RBAC-BYPASS-FIX (kritisch) | live 403 bewiesen ✓ |
| 072 | RBAC-at-Create (Create-Dialoge) | Abweichung dokumentiert (kein User-Create-API) |
| 073 | OAuth google+github (Realm-JSON, Fall-B-POST-Rezept) | E2E braucht echte Creds (Operator) |
| 074 WP1-4 | MiniSidebar→SectionRail global + Landing + Scope-Selector + Schema | CRASH-FIX + Vitest 256/256 (ENV-Bug behoben) |
| 076 | Agent-Feedback-Loop (SIEM-Criticals→Session-SSE) | live bewiesen, Design-Frage geflaggt |
| — | Brand/Nav (JimeshMark, LLM-Proxy letzter Tab, brand-wordmark) | b73917e ✓ |

### ⚠️ FERTIG, ABER MANGELHAFT / ABZULÖSEN

| Was | Mangel | Ersatz/Fix |
|---|---|---|
| 036 Networks/Agents-UI (ee7055b) | Fake-Success behauptet (R39 bewies 404s) | **ABGELÖST durch TASK-078 (gemerged 10a66b4): NetworksPage = echter headplane-Port** |
| i18n 58 Locales | English-Verbatim als "Übersetzungen" angeboten (Operator: „komplett gemischt") | Gemini-Batch de.json (1184 Keys, Prompt ready); danach Prioritäts-Locales; Switcher sonst ehrlich labeln |
| 078-Part 1 (obsolet) | „UI broken / im Stash" — Part 2+3 wurden nicht aus dem Stash geholt, sondern frisch rekonstruiert (Worktree-Cleanup hatte uncommittete Arbeit vernichtet) und als task/078-headscale-networks@97bbc51 gemerged | erledigt (Stash-Anker obsolet) |
| Wazuh-Manager-Healthcheck | grep-Logik-Fehler (optionale Daemons = unhealthy) | 1-Zeilen-Fix auf Kerndienste-Grep |
| Deploy wazuh/ compose | hardcoded kibanaserver/SecretPassword (deploy/siem nutzt Env-Muster) | Env-Muster angleichen vor Export |
| Flaky TestRenderNftScriptAcceptRule | Go-Map-Iteration (~1/6 Fail) | deterministische Sortierung |
| Container-Test-Harness | ai/service/network scheitern an localhost-DB/DNS | Harness-Task (Host-DB oder Skip-Contract) |
| Mandat-12 | Backend published 0.0.0.0:19091/19092 (2× geflaggt) | HOST_BIND=127.0.0.1 vor Export |

### 🔁 DOPPELT GEARBEITET (Session-Historie, nicht im Tree)

| Was | Warum doppelt | Konsequenz |
|---|---|---|
| 067 Wazuh-Fix ×2 (074-Agent + 070-Verify-Agent) | Operator-Live-Report erreichte beide Sessions | Union-Merge 67b29f0 (beide Berichte dokumentiert) |
| 070 ×2 (Implementation + Independent-Verify) | bewusste Zweitverifikation | d6b6bec — gewollt, Vorlage für kritische Tasks |
| 071 ×2 (Backend 90b2c71 + Frontend 854fc7f) | Parallel-Session committete Backend während Agent arbeitete | Agent nahm Backend als Basis — sauber dokumentiert |
| 069-Commits ×2 in History (d5a7269 + 0d8df88) | mein Rebase re-hashed denselben Inhalt | Public-Export via Fresh-Start = keine doppelte History |
| 074-Prompt-Files ×2 | REVISED-Version nie gelöscht | Aufräume-Commit: workspace-context-sidebar löschen |
| Scope-Selector-Crash-Fix ×2 (e2d04da + 94cab43) | 2 Sessions, derselbe Live-Crash | Merge 67b29f0: Fix + Hierarchie-Bonus vereint |

### 📋 AUSSTEHEND (vollständiges Register)

| Task | Was | Blocked auf |
|---|---|---|
| 081 | LLM-Security-Tab + per-Project Guard-Policies (Operator-Kernanliegen) | **Operator: dispatch go** |
| 080 | VLAN/macvlan-Isolation + Network-Editing-Tab | ✅ 2a4859e (Isolationstest live: A↔B unreachable, Host↔Container 100% loss [Kernel-Design], gVisor als gemessene Runtime; Grenzen: Sub-Interface-Emission per 10 Unit-Tests [kein CAP_NET_ADMIN im Netns], ipvlan-Ports EBUSY setup-spezifisch, runsc-Verifikation = Operator auf VLAN-fähigem Host) || 082 | Exposed-Ports-Default-WAF + Ports-UI + Exposure-Matrix | nach 079/080 |
| 048-Rest | AWS/GCP/IPAM/K8s-Provider-Implementierungen | Sprint-33 (O1-O5 Operator) |
| 049-Rest | Network-Editing-UI-Vollausbau (compose + UI beide Pfade) | nach 080 |
| 050-Rest | Permanent-Scan, IPv6-Relay, prebuilt fwctl-Image | Operator-Priorität |
| E-SIEM | Operator-Bestätigung der Defaults (implementiert, unbestätigt) | **Operator** |
| OAuth E2E | echter Google/GitHub-Login | **Operator: echte Creds** |
| Keycloak-Admin | Live-Curl-Verifikation 068/070-Slots | **Operator: Passwort** |
| 070 §6 | /api-Flächen-Enforcement-Toggles (Baustein bereit) | **Operator: welche Domänen** |
| 076-Design | Multi-Agent-Investigation (Agent callt Sessions) | **Operator: Policy-Entscheidung** |
| 074-Rest | Rail-Replication DBs→Platform→Workspaces→Proxy + WIDE_ROUTES-Präfix-Match + Touch-Pin | nach 082 |
| Wazuh-Doku | Vault-Unterschieds-Absatz (Project Secrets vs Platform Vault — kam 2× auf) | dieser Commit (SPRINT-40/BACKLOG-Verweis) |
| Language | de.json 1184 Keys via Gemini (Prompt ready) + Prioritäts-Locales | **Operator: Gemini-Output** |
| K-LAF | Inerte Payload-Darstellung im Report-Widget, llama-guard-Filter-Badge | Backlog offen |
| Sprint-24 | Doc-Konsolidierung | nach Export (obsolet für Public) |

### PATTERN (R43-Anhang C-Notiz): WORKTREE-CLEANUP × 2

078 UND 079 berichten denselben Zwischenfall: uncommittete Agent-Arbeit wurde durch
die externe Worktree-/Merge-Welle vernichtet (Worktree + Branch-Registrierung
verschwanden) und musste aus der Session-Arbeit frisch rekonstruiert werden.
Lehre (in beiden Sprint-Files dokumentiert, jetzt auch hier als Prozess-Regel):
**Agenten committen nach jedem grünen Check — uncommittete Arbeit im fremden
Worktree-Register gilt als nicht-existent.** Die Worktree-Cleanup-Welle selbst
war meine eigene Parallel-Session-Merge-Welle (074-Merges) — die Aufräum-Logik
darf Worktrees mit laufenden Agenten nie anfassen (Fix-Richtung: Cleanup prüft
den Agenten-Report vor dem Entfernen).

### PUBLICATION-PFAD (R43 §5)

1. ✅ Scrub private Docs (dieser Commit)
2. ⬜ **Operator:** `jimesch-public` in der Org anlegen (leer)
3. ⬜ Clean-Tree-Export (archive → init → „JiMesh — public base") + push
4. ⬜ CLEAN BACKLOG generieren (Jules-Schema, aus docs/tasks + R43-Register)
5. ⬜ Jules-Onboarding (Backlog-Entry + Sprint-Auszug als Prompt)
6. ⬜ Mandat-12 + i18n-Label vor Export
7. ⬜ PR public→origin wenn reif
