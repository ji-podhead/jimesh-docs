# GO-PUBLIC — Definitiver Plan: Public-Repo-Release

> Status: PLAN, nicht ausgeführt. Operator-Aktion nötig bei jedem ⬜.
> Referenz: R43-PUBLICATION-PLAN.md (Vorgänger-Audit), R42 (App-Certs),
> R43-Anhang-B (Task-Übersicht), R41 (Prioritäten).

---

## 1. ZWEI-REPO-ARCHITEKTUR

| | PRIVAT (bestehend) | PUBLIC (neu) |
|---|---|---|
| Repo | JiMesh2 (origin/main, 83 MB objects, 2095 Objekte) | **ji-mesh/agentic-knowledge** (Agent-Wissen) + **ji-mesh/jimesch-public** (Produktcode) |
| History | volle History — alle Credentials/Leaks unrettbar gebunden | **frischer Initial-Commit** (keine History) |
| Workflow | Sprint-Docs + Task-Files + Research-Ordner | CLEAN BACKLOG + User-Guide + API-DOCS |
| Ziel | Entwicklung (Agents/Operator) | Veröffentlichung (Jules + Öffentlichkeit) |

---

## 2. PUBLIC-REPO: WAS BLEIBT (und warum)

### 2a. Code (alles `src/`)
```
src/backend/          — Go-Quellcode (CGO-frei, die eigentliche Engine)
src/frontend/         — Next.js/Vite-Quellcode (UI)
config/               — Topologie-Schema (Ports/Service-Bindings, KEINE Secrets)
deploy/               — Docker-Compose + YAML-Deploy-Definitionen
                          ⚠ SANITIZE: Wazuh-Demo-Creds aus docker-compose.siem.yml
                          (SecretPassword, kibanaserver) → Env-Platzhalter
scripts/              — Build-/Deploy-Skripte (backend-entry.sh, frontend-entry.sh)
                          ⚠ SANITIZE: docker-entrypoint.sh hatte /home/ji-Pfade (gelöscht)
examples/             — jimeshctl-Beispielcode
Makefile              — Build-Targets (⚠ /home/ji/go/pkg/mod → ${GO_CACHE_DIR} ersetzen)
docker-compose.yml    — ⚠ /home/ji/go/pkg/mod Bind-Mounts → ${HOME} oder entfernen
```

### 2b. Docs (öffentliche Dokumentation — NUR diese)
```
docs/API_DOCS.md      — HTTP-API-Referenz (Route-Doku, 2000+ Zeilen, keine Leaks)
docs/ARCHITECTURE.md  — Systemdesign (T1-T3-Isolationsmodell, K-LAF-Übersicht)
docs/USER_GUIDE.md    — Endbenutzer-Handbuch
docs/K-LAF-ARCHITECTURE.md — Kernel-Assisted-LAF-Architektur (eBPF-Grundlagen)
docs/PRODUCT-ROADMAP.md — öffentliche Feature-Roadmap
docs/FEATURE_ROADMAP.md  — Feature-Liste (reviewen für interne Hinweise)
docs/PACKAGES.md      — Go-Paket-Landkarte (Referenz für Mitwirkende)
docs/DATA-SCHEMA.md   — Postgres-Schema-Referenz (falls keine Creds drin)
docs/PROVIDER-TOS.md  — Provider-Nutzungsbedingungen-Zusammenfassung
docs/i18n/            — i18n-Infrastruktur-Doku (KEINE locale-JSONs — die sind in src/)
```

### 2c. Root-Dateien
```
README.md             — Öffentliche Projekt-Übersicht (REWRITE: siehe §5a)
LICENSE               — PolyForm-Noncommercial + LICENSE-COMMERCIAL.md-Verweis
LICENSE-COMMERCIAL.md — Zahlende-Kunden-Pfad
CLAUDE.md             — Agent-Arbeitsrichtlinien (⚠ scrub: /home/ji, persönliche Pfade)
MANDATES.md           — Repo-Konventionen (⚠ scrub: keine Operator-Namen)
.env.example          — ⚠ SANITIZE: KEINE echten Werte, nur Platzhalter
.gitignore            — erweitern: .env*, docs/prompts/, docs/research/, docs/sprints/,
                        docs/articles/, docs/tasks/, docs/registers/, *.tar, *.bundle
AGENTS.md             — Optional: Jules-Arbeitsvertrag (neu schreiben, siehe §5b)
CHANGELOG.md          — Optional: öffentliche Versionshistorie (neu schreiben)
CONTRIBUTING.md       — Optional: PR-Richtlinien (neu schreiben)
```

---

## 3. PUBLIC-REPO: WAS EXCLUDED WIRD

| Exclude | Grund |
|---|---|
| `docs/prompts/**` (4 Dateien) | Operator-Chat-Logs — Rohe Prompts, Session-Kontext, IP/Node-Beweise |
| `docs/research/**` (57 Dateien) | R1-R43-Archive — interne Audits, Handoff-Docs, Session-Kontext, Leak-Referenzen (R32: WAN-IP, R39: SSH-Creds) |
| `docs/sprints/**` (52 Dateien) | Sprint-Docs — Operator-Interna, Task-Detailgrade, kollidierende Historie |
| `docs/tasks/**` | Agent-Task-Files (Jules bekommt sie als Text-Prompts) |
| `docs/articles/**` | Bereits extrahiert → ji-podhead/articles |
| `docs/registers/**` | Operator-Registrierungs-Files |
| `docs/legacy/**` | Alt-Backend-Doku (Node.js-Ära, veraltet) |
| `docs/i18n-translation/**` | Gemini-Batch-Arbeitsdaten (nicht final) |
| `docs/reference/aws/**` | CloudiQS-Interview-Prep (Operator-Karriere-Kontext) |
| `docs/backlog/**` | Internes Backlog → wird durch CLEAN BACKLOG.md ersetzt |
| `docs/GO-PUBLIC.md` | Dieser Plan selbst |
| `docs/BUILD-STATUS.md` | Interne Build-Metadaten |
| `docs/OPEN-QUESTIONS.md` | Interne offene Fragen |
| `docs/REFERENCES.md` | Interne Referenzlisten (⚠ Review ob public-sicher) |
| `docs/fetch-relay.md` | Interne Infra-Doku |
| `docs/compression.md` | Interne Kompressions-Design-Doku |
| `docs/openai_api.md` / `docs/openai_api_go.md` | ⚠ Review — API-Contract fürs Frontend, public-sicher wenn keine Secrets |
| `docs/GO_BACKEND_API.md` | ⚠ Review — Go-API-Contract, evtl. redundant mit API_DOCS.md |
| `docs/api.md` | ⚠ Review — Legacy-API-Doku (alt-Backend?) |
| `docs/legacy/**` (6 Dateien) | Alt-Backend-Doku (Node.js-Ära) |
| `docs/reference/**` | Interne Referenz-Liste (⚠ CloudiQS-Interview-Prep, Operator-Karriere-Kontext) |
| `docs/legal/**` | ⚠ Review — Rechtliches (public-sicher wenn nur Lizenz-Texte) |
| `.env` | GITIGNORED (✓ bereits) |
| `.env.example.jimesh` | ⚠ Review — Topology-Derivat, 39 Z., keine echten Secrets — public-safe ODER merge in .env.example |
| `node_modules/**` | GITIGNORED (✓ bereits) |
| `src/frontend/node_modules/**` | GITIGNORED (✓ bereits) |
| `.worktrees/**` | GITIGNORED (neu hinzufügen) |
| `.claude/**` | GITIGNORED (neu hinzufügen) |
| `repo-assets/**` | ⚠ Review — Brand-SVGs + Operator-Handoff-Docs (svg/ kann public, old/ + HANDOFF-CLAUDE.md nicht) |
| `scripts/task078-i18n-insert.py` | Interne Task-Skripte |
| `scripts/backend-entry.sh` | ✅ Public (⚠ /home/ji-Pfade scrub) |
| `scripts/frontend-entry.sh` | ✅ Public |
| `*.tar`, `*.bundle` | GITIGNORED (neu hinzufügen) |

**Regel:** Alles was NICHT in §2 gelistet ist, wird EXCLUDED — wenn unsicher, exclude.

---

## 4. GIT-HISTORY-CLEANUP: FRISCHER START (kein BFG, kein Filter-Branch)

**Methode:** Orphan-Branch auf dem Public-Repo.

```bash
# 1. Neuen git-verlaufsfreien Branch auf dem Working Tree erzeugen
git checkout --orphan public-release

# 2. Alle Dateien stagen (die aus §3 exclusiven sind VORHER raus)
git add -A

# 3. Review: git status — KEINE der excluded-Dateien darf auftauchen
git status

# 4. Initial commit
git commit -m "Initial public release: JiMesh — multi-provider LLM routing gateway

CGO-free Go backend + Next.js/Vite frontend.
PolyForm-Noncommercial (LICENSE-COMMERCIAL.md für zahlende Kunden).
Agent-ready (Jules): CLEAN BACKLOG als Task-Quelle."

# 5. Zum Public-Remote pushen
git remote add public https://github.com/ji-mesh/jimesch-public.git
git push public public-release:main

# 6. Lokalen Branch wieder auf main zurücksetzen
git checkout main
git branch -D public-release
```

**Warum kein BFG/Filter-Branch?** BFG/Filter-Branch sind unverlässlich (Tokens
wandern trotzdem durch Commit-Messages, Squash-commits, amend-Fragmente, AI-
chat-log-Residuen in sprint-docs). Der frische Start eliminiert die History
komplett — es gibt nichts zu scrubben.

**Leak-Inventar (aus der History, alle durch Fresh-Start eliminiert):**

| Leak | Stelle | Commits in History |
|---|---|---|
| SSH-Creds (Host+User+Pass) | R39:145 (research) | 1 (60535c3) |
| Tailscale-Node-IP + WAN-IP | R32:6, CHAT_LOG, SPRINT-20 | 4 |
| Wazuh-Demo-Creds | deploy/wazuh/* | 2 |
| /home/ji-Pfade | docker-compose, Makefile, Tests | 26 |
| podhead/tailnet-Domain | R42, SPRINT-40, Section-Nav | 3 |
| saits.ai | R42 | 2 |
| 3× „CHANGE_ME"-Skripte | deploy/ | 3 |

---

## 5. NEUE DOCS FÜRS PUBLIC-REPO

### 5a. README.md — Öffentliche Übersicht

Schreibt NEU: Was ist JiMesh (Multi-Provider LLM Routing Gateway + Secure
Agent-Deployment), Quickstart (make up), Architecture-Overview (Verweis auf
ARCHITECTURE.md), License-Hinweis (PolyForm + Commercial-Path), Contributing-
Hinweis. KEINE internen Task-Nummern, KEINE Sprint-Verweise, KEINE Operator-
Namen, KEINE Node-IPs.

### 5b. CLEAN BACKLOG.md — Jules-Arbeitsvertrag

Ersetzt docs/backlog/BACKLOG.md (intern). Ein Task-Entry hat Pflichtfelder:

```
### TASK-081 — LLM-Security-Tab + per-project Guard-Policies
- status: open            # open | in-progress | done | blocked
- scope: src/frontend/src/views/Security/*, src/backend/internal/llmproxy/*
- depends: TASK-076 (LLM-Proxy live), TASK-070 (Capability-Store)
- acceptance:
  1. Security-Tab "AI Guard" listet Policies pro Project
  2. PUT /api/llm/policies/{project} validiert + persistiert (audit-logged)
  3. blocked_request counter je Policy sichtbar
- context: sprints werden per Text-Prompt geliefert; kein docs/-Zugriff nötig
```

Regeln: KEINE Sprint-Nummern, KEINE internen Datei-Pfade (außer src/), KEINE
Operator-Namen, KEINE Session-Nummer. Der Agent bekommt zusätzlich einen
Text-Prompt mit dem relevanten Sprint-Auszug — docs/-Zugriff nicht nötig.

### 5c. AGENTS.md — Optional

Ein Kurzvertrag für Coding-Agents (Jules/Claude/GLM): Mandate-Kurzversion,
Build-Verifikations-Pflichten, Live-Verify-Pflichten, keine internen Pfad-
Referenzen. Ersetzt CLAUDE.md im Public-Repo (CLAUDE.md hat /home/ji-Referenzen).

### 5d. Zu scrubben (vor dem Initial-Commit)

| Datei | Scrub |
|---|---|
| Makefile:25 | `/home/ji/go/pkg/mod` → `${GO_CACHE_DIR}` (Umgebungsvariable) |
| docker-compose.yml:86 | `/home/ji/go/pkg/mod` → env-Var oder entfernen |
| src/backend/internal/cdc/integration_test.go:19/33 | Kommentar-Pfad → generisch |
| src/frontend/src/components/DiscoveryStatus.tsx | löschen (Dead-Code, R41) |
| internal/ai/entropy_cascade.go | löschen oder deprecated markieren (R41) |
| deploy/wazuh/docker-compose.siem.yml:109-137 | SecretPassword/kibanaserver → ${WAZUH_..._PASSWORD} |
| deploy/siem/docker-compose.yml:57/123/138/140 | ${VAR:-SecretPassword} → ${VAR:-CHANGE_ME_BEFORE_START} |
| deploy/keycloak/jimesh-realm.json | ⚠ Review — enabled:false-Default ist public-safe |
| CLAUDE.md | /home/ji-Pfade scrub, interne Task-Nummern scrub |
| MANDATES.md | Operator-Namen scrub |

---

## 6. SEQUENZ

```
Phase 1 — Scrub (privates Repo, Working Tree, vor dem Export):
  ⬜ Operator: SSH-Creds auf der Target-Node rotieren (R43 §1, CRITISCH)
  ⬜ Alle Dead-Code-Items aus TASK-R41 löschen (DiscoveryStatus etc.)
  ⬜ Makefile + docker-compose.yml: /home/ji → ${GO_CACHE_DIR}
  ⬜ deploy/wazuh/*: Demo-Creds → Env-Platzhalter
  ⬜ CLAUDE.md + MANDATES.md: /home/ji + Operator-Namen scrub
  ⬜ .gitignore erweitern: .worktrees/, .claude/, *.tar, *.bundle,
      docs/prompts/, docs/research/, docs/sprints/, docs/tasks/, docs/registers/
  ⬜ docs/articles/: ✅ bereits entfernt (bc0711b → ji-podhead/articles)

Phase 2 — Public-Repo vorbereiten:
  ⬜ Operator: ji-mesh/jimesch-public anlegen (leer, kein README-Init)
  ⬜ AGENTS.md schreiben (Kurzvertrag, neu)
  ⬜ CLEAN BACKLOG.md schreiben (aus R43-Anhang-B + Task-Files, Jules-Schema)
  ⬜ README.md neu schreiben (public-sicher)
  ⬜ docs/ sanieren: NUR die Dateien aus §2 behalten, §3 exclusives entfernen
  ⬜ ARCHITECTURE.md + USER_GUIDE.md reviewen für interne Verweise
  ⬜ .env.example auf public-Safe prüfen (keine echten Werte, nur Platzhalter)

Phase 3 — Export (git — für jede der beiden Repos):
  ⬜ git checkout --orphan public-release
  ⬜ git add -A && git status → REVIEW: keine excluded Datei darf auftauchen
  ⬜ git commit -m "Initial public release: JiMesh — ..."
  ⬜ git remote add public https://github.com/ji-mesh/jimesch-public.git
  ⬜ git push public public-release:main
  ⬜ git checkout main && git branch -D public-release

Phase 4 — Jules-Onboarding:
  ⬜ Erste 2-3 Tasks aus CLEAN BACKLOG.md an Jules schicken (Text-Prompts)
  ⬜ AGENTS.md als Kontext-Basis an Jules übergeben
  ⬜ Later: PR public → origin (Operator-Entscheidung über Merge-Strategie)

Phase 5 — PR auf origin (OPERATOR-ENTSCHEIDUNG):
  ⬜ WANN? Wenn public-repo Feature-Komplett + Tests grün
  ⬜ WIE? Squash-Merge (die History des Public-Repos ist bereits clean)
  ⬜ VORSICHT: origin/main hat die LEAK-History — ein Merge zieht die History
      des Public-Repos NICHT zurück auf origin (der Operator entscheidet,
      ob origin/main anschließend neu initialisiert wird)
```

---

## 7. REGELN FÜR JULES (im Public-Repo)

1. **No Mock** — niemals Erfolg vortäuschen (Mandat 2).
2. **Live-Verify** — Done heißt verifiziert (Mandat 6).
3. **Keine internen Datei-Pfade** — nur `src/`-Pfade referenzieren.
4. **Keine Sprint-Nummern** — der Kontext kommt per Text-Prompt.
5. **Build-Verify** — `make check-backend` + Frontend-Typecheck in jedem Commit.
6. **Keine Secrets** — nichts in localStorage, Code, .env-Commits.
7. **Git-Hygiene** — keine --amend auf fremden Commits, keine Rebase auf
   fremden Branches (Session-Überschneidungs-Lektion).

---

## 8. CHECKLISTE FÜR DEN OPERATOR (PRINT-OUT)

```
LEAK-CREDITS ROTIEREN (unverzüglich):
[ ] SSH-Passwort auf der Target-Node ändern (R39-Referenz, CRITISCH)
[ ] SSH-Key-Trust auf der Target-Node neu minten
[ ] Wazuh-Dashboard-Passwörter ändern (Demo-Creds: SecretPassword/kibanaserver)
[ ] Keycloak-Admin-Passwort ändern (betrieblich aktiv)
[ ] Alle Operator-API-Keys (sk-ant, AKIA, sk-..., falls je verwendet) rotieren

PUBLIC-REPO-VORBEREITUNG:
[ ] ji-mesh/jimesch-public Repo anlegen
[ ] AGENTS.md schreiben
[ ] CLEAN BACKLOG.md schreiben
[ ] README.md neu schreiben
[ ] Alle /home/ji-Pfade scrubben
[ ] Alle Demo-Creds aus deploy/* scrubben
[ ] CLAUDE.md/MANDATES.md scrubben oder AGENTS.md als Ersatz
[ ] .gitignore erweitern
[ ] docs/ sanieren (nur §2-Dateien behalten)

EXPORT:
[ ] orphan-Branch
[ ] git add -A → REVIEW
[ ] Initial-Commit + push
[ ] main zurücksetzen

JULES:
[ ] Erste 2-3 Tasks übergeben
[ ] AGENTS.md als Kontext
```
