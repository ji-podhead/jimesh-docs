# Worktree/Branch-Forensik-Audit — jimesh, 2026-09-28

Repo: `/home/ji/projects/jimesh`. Read-only Analyse (`git log/show/diff/status/worktree`), nichts committed/gemerged/verändert. `main` HEAD zum Zeitpunkt des Audits: `b6609c8` (SPRINT-145, 06:42 Uhr).

`git worktree list` wurde neu ausgeführt — **identisch zur Liste, die Leo mitgegeben hat**, keine Worktrees seither verschwunden oder neu hinzugekommen.

## TL;DR — die 3 Funde, die wirklich zählen

1. **Commit `2e6f919`** ("chore(repo): root/repo hygiene cleanup", 2026-09-16, 995 Files / 86.809 Deletions) hat **komplett stillschweigend** die gesamte `knowledge/`-Wissensbasis (118 Dateien, OKF v1.0, 2 Tage zuvor mit "118 Files" gefeiert gemerged) und den kompletten `docs/reference/`-Baum (29 Dateien: AUTH-CONTRACT.md, AUTH-ARCHITECTURE.md, ARCHITECTURE-DESIGN.md, gvisor/, litellm/, debezium/, aws/, plugin.schema.json, …) gelöscht. Die Commit-Message rechtfertigt nur Root-/Config-Aufräumarbeiten — von diesen ~150 gelöschten Doku-Dateien ist **keine Silbe** die Rede. Nichts davon wurde seitdem wiederhergestellt. Das ist der eindeutigste "silent loss"-Fall im ganzen Audit — technisch kein Worktree-Problem, aber genau das, wovor Leo Angst hat.
2. **`task/080-vlan-network-isolation`** ist eine SLOPPY-MERGE: Der eigentliche Code (VLAN-Store, Frontend-Tab) ist über einen *anderen*, parallelen Commit (`2a4859e`/`f5b0609`) inhaltsgleich in main gelandet — aber main hat dabei einen live-verifizierten Bugfix **zurückgedreht**: die Branch hatte `&&`-Command-Chains durch separate Statements ersetzt (weil `set -e` bei `&&`-Ketten Fehler verschluckt — dokumentierter Live-Fund: ein fehlgeschlagenes `ip link add` wurde als Erfolg gewertet) und einen Regressionstest dafür geschrieben. Mains Version hat die `&&`-Kette **und den Bug wieder drin**, der Test ist weg.
3. **`task/architecture-docs`** (`docs/reference/ARCHITECTURE-DESIGN.md`, 343 Zeilen Package-Struktur/Schema-Doku) ist Kollateralschaden von genau demselben Commit `2e6f919` — kein Nachfolgeartefakt, komplett weg.

Daneben: drei parallele, nie gemergte Doku-Restrukturierungsversuche (`docs/restructure`, `jules-pr-integration`/`origin/feat/public-repo-docs-cicd-polish-*`, `origin/feature/okf-knowledge-base-*`) liegen tot auf Branches — niemand hat sich entschieden, welche (falls überhaupt) landen soll.

Alle 10 aktiven Arbeits-Worktrees sind **uncommitted-clean** — nirgendwo droht Verlust durch nicht committete Änderungen.

---

## 1. Uncommitted-Check (alle Worktrees)

```
git -C <path> status --short
```
war für **alle zehn** Worktrees leer (keine modifizierten Tracked-Files, keine Untracked-Files):

- jimesh-sprint51, docs-restructure, jules-active, task-078-headscale-networks, task-079-identity-router, task-080-vlan-network-isolation, task-architecture-docs, jimesh-wsmulti, /tmp/jimesh-fix-crashes, /tmp/jimesh-tsc-base

→ **Kein UNCOMMITTED-RISK** irgendwo. Risiko #1 aus dem Auftrag entfällt vollständig für den aktuellen Zeitpunkt.

---

## 2. Worktrees im Detail

### `jimesh-sprint51` — Branch `sprint51-agent-session-fake-telemetry-fix`
- **Verdict: CLEAN**
- `main..branch` leer (Ancestor). Tip `e3286ce` (2026-09-27 18:00, "docs(sprint-136): Kollisions-Endzustand + ehrliche i18n-Zahlen") ist derselbe Commit-Hash, der direkt in mains Historie sitzt (kein Rebase/Squash) — Inhalt ist per Definition identisch, keine Degradation möglich.

### `jimesh-worktrees/docs-restructure` — Branch `docs/restructure`
- **Verdict: UNMERGED**
- 2 eigene Commits, NICHT in main: `56bdf2d` (2026-09-08, "docs: restructure docs/ into guide/reference/planning/legacy") und `eda0ea6` (Nachzug, Pfad-Fixes).
- Main's aktueller `docs/`-Baum ist weiterhin die alte flache Struktur (60+ `.md`-Dateien direkt unter `docs/`, keine `docs/guide|reference|planning|legacy/`-Unterordner: `git ls-tree -r main -- docs/ | grep -cE '^docs/(guide|reference|planning|legacy)/'` → `0`).
- Es gibt eine **komplett andere** zweite Restrukturierung, die ebenfalls nie gelandet ist (siehe §3, `jules-pr-integration`, andere Taxonomie: `architecture/`, `development/`, `llm_providers/`, …). main hat also **keine** von beiden — die Doku wächst seit Wochen unstrukturiert weiter.

### `jimesh-worktrees/jules-active` — Branch `jules-work`
- **Verdict: CLEAN**
- `main..branch` leer. Eigene Arbeit (TASK-084/085/086: SubagentsPanel, OpenAPI-Generator, Query-Key-Registry, Slop-Gate-Script) ist über echten Merge in main (`10a66b4`) gelandet. Spätere Commits an denselben Dateien (`SubagentsPanel.tsx`, `query-keys.ts`) sind additiv (Feature-Ausbau), nicht Rückbau. `scripts/check-frontend-slop.mjs` taucht in einem naiven Diff als "gelöscht" auf, ist aber im Zuge der `scripts/ → src/scripts/`-Monorepo-Konsolidierung (`2e6f919`) nur **verschoben**, nicht verloren — liegt jetzt unter `src/scripts/check-frontend-slop.mjs`.

### `jimesh-worktrees/task-078-headscale-networks` — Branch `task/078-headscale-networks`
- **Verdict: CLEAN**
- `main..branch` leer, Tip `97bbc51` ist direktes 2nd-parent eines main-Merge-Commits (`10a66b4`). Kern-Dateien `acl-policy.ts`/`acl-policy.test.ts`/`mesh-topology.tsx`: 0 spätere Commits, byte-identisch zu main HEAD. `NetworksPage.tsx` hat 1 späteren, rein additiven Commit (`b03e494`, Suricata-Panel, +9 Zeilen).

### `jimesh-worktrees/task-079-identity-router` — Branch `task/079-identity-router`
- **Verdict: CLEAN**
- `main..branch` leer, Tip `beddaa8` ist direktes 2nd-parent von `c25dc9c`. Alle 5 Kern-Dateien (`wsproxy.go`, `identity.go`, `routes.go`, `main.go`, `store/workspace_routes.go`): 0 spätere Änderungen, identisch. Feature ist aktiv im Einsatz (`deploy/router-bootstrap/*.yml` referenziert es), spätere Arbeit (`20c5fb3`, SPRINT-57 Dashboard-Embedding) baut nachweislich *auf* diesem Router auf statt ihn zu ersetzen.

### `jimesh-worktrees/task-080-vlan-network-isolation` — Branch `task/080-vlan-network-isolation`
- **Verdict: SLOPPY-MERGE** (Detailfund, kein reiner Ancestor-Fall)
- 1 eigener Commit `2808825` (2026-09-13, "TASK-080 — Per-Project VLAN-Isolation"), NICHT direkt in main (`merge-base --is-ancestor` → NEIN in beide Richtungen).
- Main hat das Feature über einen **parallelen** Commit-Strang (`2a4859e` → merged via `f5b0609`) bekommen — Duplicate-Effort, zwei Agenten haben denselben Task parallel bearbeitet, `2808825` wurde beim Zusammenführen verwaist.
- Datei-Ebene: `src/backend/internal/store/project_vlans.go` — 0 Diff zu main (identisch). `NetworkEditingPage.tsx` — nur 12-Zeilen-Diff (main minimal verfeinert). **Aber**: `2808825`s Commit-Message dokumentiert einen Live-Smoke-Test-Fund — Shell-Provisioning-Befehle müssen einzelne Statements sein statt `&&`-Ketten, weil `set -e` bei `&&`-Listen nicht greift (ein fehlgeschlagenes `ip link add` wurde als Erfolg gewertet). `git diff 2808825 main -- vlan.go` zeigt: mains `VLANProvisionCommands` ist wieder die `&&`-verkettete Einzeiler-Form — der Bug ist zurück. `git diff 2808825 main -- vlan_test.go` zeigt: die beiden Regressionstest-Assertions, die genau das absichern sollten, sind in main **nicht vorhanden** (gelöscht/nie übernommen).
- **Das ist ein echter, aktuell scharfer Bug in main**, kein nur-historischer Fund.

### `jimesh-worktrees/task-architecture-docs` — Branch `task/architecture-docs`
- **Verdict: SLOPPY-MERGE / effektiv LOST**
- `main..branch` leer (1 Commit `a8ae67f`, 2026-09-06, `docs/reference/ARCHITECTURE-DESIGN.md`, 343 Zeilen: Package-Struktur, Basis-Klassen-Hierarchie, API-Gruppen, SQL-Schemas, 2 offene Fragen explizit markiert). Datei wurde noch am selben Tag korrigiert (`e5817f4`, §3-Schema-Fix — unkritisch).
- Dann: **komplett gelöscht** durch `2e6f919` ("chore(repo): root/repo hygiene cleanup", 2026-09-16) — kein Rename erkannt (`git log --follow` findet nichts), keine Erwähnung in der Commit-Message (die nur Root-Dateien/Config/Scripts-Verschiebungen rechtfertigt). `docs/ARCHITECTURE.md` wurde im *selben* Commit editiert, aber mit unabhängigem neuem Inhalt (§7 Deployment-Topologie) — keine Migration des gelöschten Inhalts.
- `git grep -i "ARCHITECTURE-DESIGN\|Package-Struktur\|Base-Klassen" main` → nichts. Kein Nachfolgeartefakt. Siehe §4 für den vollen Umfang von `2e6f919`.

### `jimesh-wsmulti` — Branch `feat-workspace-multitenancy`
- **Verdict: CLEAN** (mit historischem, bereits selbst-korrigiertem Hiccup)
- `main..branch` leer, Tip `4632f7b` (2026-09-27 20:08, "Workspace-Multi-Tenancy — X-Workspace-Scope, SPRINT-138") direkt in mains Historie. Merge lief über `bf9d65d` ("merge: feat-workspace-multitenancy — i18n-Konflikte als Union geloest").
- Direkt danach dokumentiert `f69229d` ("fix(sidebar-v2): Multitenancy-Merge-Reparatur") selbst, dass die Merge-Konfliktauflösung eine doppelte Scope-Bar reaktiviert und bereits gelöschte Chip-Referenzen zurückgebracht hatte (Compile-Bruch) — wurde **noch am selben Tag** gefixt, verifiziert (Sidebar-Suite 36/36). Kein offenes Problem mehr, aber ein gutes Beispiel dafür, dass genau die Art Merge-Kollision, vor der Leo Angst hat, hier tatsächlich passiert ist — nur eben schon selbst bemerkt und repariert.
- Kern-Dateien `workspace-scope.ts`/`workspace-scope.test.ts`: keine späteren Commits, unverändert.

### `/tmp/jimesh-fix-crashes` — Branch `fix-crashes-integrations`
- **Verdict: CLEAN**
- `main..branch` leer, Tip direkt in mains Historie (identischer Commit-Hash, keine Degradation möglich).

### `/tmp/jimesh-tsc-base` — detached HEAD `037ed11`
- **Verdict: CLEAN / kein Risiko**
- Ancestor von main (`037ed11`, 2026-09-27 08:54, "fix(auth): apiFetch URL-Fallback"), keine eigene Branch dahinter — sieht nach einem reinen tsc-Baseline-Scratch-Checkout aus (Name legt "tsc baseline" nahe). Nichts zu tun.

---

## 3. Named Branches ohne (mehr) lebenden Worktree

### `feat-app-panel` (SPRINT-139 "Unified App Panel") — erneut verifiziert
- **Verdict: CLEAN**, Behauptung von heute früh hält weiterhin.
- `main..feat-app-panel` weiterhin leer nach allen heutigen Commits. Eigener Commit `094e886` (73 Files: `AppPanelDrawer.tsx`, `ActiveAppsDropdown.tsx`, `lib/app-status.ts`, `lib/tunnel.ts`, u.a.).
- Spätere Berührungen: `AppPanelDrawer.tsx` ← `b4dd808` (SPRINT-143, additiv: neue Danger-Zone-Section, nichts entfernt). `HierarchySidebar.tsx` ← `8de9a24`/`07b51b5`/`8ee85e4`: additive Nav-Umbauten, App-Panel-Wiring unberührt. Alle anderen Kern-Dateien seit `094e886` unangetastet.
- Randnotiz: `e348871`s Commit-Message behauptet "Onboarding+Deployments aus Navigation", der tatsächliche Diff zeigt aber nur Docs+Probe-Test, kein Nav-Code — wurde von `07b51b5` selbst korrigiert nachgeholt. Message war irreführend, aber folgenlos (kein Code-Schaden).

### `feat-workspace-lifecycle` (SPRINT-139 backend/frontend/i18n)
- **Verdict: CLEAN**
- 3 eigene Commits (`bbf6b4e`, `14d1012`, `97848b6`) weiterhin Ancestor von main. Spätere Anfasser (`b6609c8` SPRINT-145, `b4dd808` SPRINT-143, `8966348` SPRINT-146) sind durchgehend additiv bzw. sauberer Refactor (z.B. `WorkspacesPage.tsx`: Inline-Delete → gemeinsame `WorkspaceDeleteButton`-Komponente, gleiche Semantik). `workspace_kind`-Feld, Create-/Provision-Dialoge, Status-Kette weiterhin intakt und live in main HEAD.

### `preserve/glm-embeddings-attempt-wip` (2026-09-08)
- **Verdict: STALE/ABANDONED — by design, korrekt**
- Dokumentierter Duplicate-Effort-Fund (ein GLM/DSH-Prozess hatte direkt im geteilten main-Checkout unverkommittet an `embeddings.go` gearbeitet, parallel zu TASK-031). Bewusst preserved, nie gemerged. `src/backend/internal/settings/embeddings.go` existiert auf main nicht — korrekt verworfen, TASK-031 (`e055908`) ist die tatsächlich gelandete Implementierung. Kein Handlungsbedarf, Branch kann bei Bedarf gelöscht werden.

### `preserve/glm-embeddings-family-wip` (2026-09-08)
- **Verdict: CLEAN — Sorge der Commit-Message ist überholt**
- Commit-Message behauptet explizit "nicht gemerged, konfligiert mit TASK-029s Flat-Model-Contract". Tatsächlicher Diff gegen main (`git diff d5fe648 main -- embeddings_endpoints.go`) zeigt: nur kosmetische Unterschiede (Kommentar-Wortlaut, Struct-Formatierung) — das Family/Dimensions-Konzept (`embeddingSpec`, `classifyEmbedding`, `embeddingsID`) ist **inhaltsgleich in main vorhanden**, gelandet über die spätere TASK-031-Fix-Iteration (`6ff2d5e "fix(TASK-031): embeddings admin surface — dashboard contract shapes"`). Die Sorge, dass das Family-Konzept verloren ginge, hat sich nicht bewahrheitet — es ist da, nur über einen anderen Commit-Pfad. Kein Handlungsbedarf.

### `worktree-agent-a563d2ea206259ea0` (Sprint-36 WP6 "Edge Control-Plane Node target selection", 2026-09-13)
- **Verdict: STALE/ABANDONED — Duplicate-Effort, Feature existiert trotzdem (anders gebaut)**
- 1 Commit `cb58318`, kein lebender Worktree mehr, nirgendwo sonst referenziert (`git branch --all --contains cb58318` → nur sich selbst).
- Eigene Implementierung: `DeployRequest.DeployEdgeNode`, Persistenz nach `projects.edge_control_plane`, Container `jimesh-router-edge`. **Nichts davon existiert in main** (`git grep "edge_control_plane\|DeployEdgeNode\|jimesh-router-edge" main` → 0 Treffer).
- ABER: main hat unter demselben Sprint/Task-Rahmen ("Sprint-36 WP6") ein **eigenständig neu gebautes** Edge-Node-Feature via TASK-058 (`cb95a01`, ancestor von main), mit anderem Vertrag: Feld `EdgeNode`/`edgeNode`, Container `jimesh-router-<nameKey>`, inklusive genau der Dinge, die `cb58318` explizit als "nicht gebaut" auswies (Log-Ingest, CDC-Forward, WAN-down-Buffer). D.h. die *Fähigkeit* ist nicht verloren — aber `cb58318`s konkreter Code (268 Zeilen `projects_ssh.go`, 50 Zeilen `store.go`, 109 Zeilen `ProjectsPage.tsx`, eigenes Dockerfile) ist komplett verworfener Doppelaufwand. Branch kann gelöscht werden, kein funktionaler Verlust, aber ein Beispiel für unkoordinierte Parallelarbeit am selben Sprint-Slot.

### Doku-Restrukturierungs-Cluster (3 konkurrierende, alle unmerged)
- **`docs/restructure`** (s.o., §2) — Taxonomie `guide/reference/planning/legacy`.
- **`jules-pr-integration` = `origin/feat/public-repo-docs-cicd-polish-5898372805603157199`** (identischer Commit `61ceda8`, 2026-09-17) — Taxonomie `architecture/development/llm_providers/references/roadmap/schemas`, integriert zusätzlich Jules' PR #5 (Diagramme, Docsify-Portal, README-Badges, `docs/roadmap/PLUGINS.md`).
- **`pr-5-review`** (`0f2a0d4`, google-labs-jules[bot], 2026-09-16) — die rohe Jules-PR, von obigem Branch "statt direktem Merge" integriert.
- **Verdict: alle drei UNMERGED**, keine gegenseitige Supersession zu main. main hat weder eine der beiden Taxonomien noch die 4 neuen SVG-Diagramme (`deployment-flow.svg`, `hero-explainer.svg`, `isolation-concept.svg`, `linkedin-social.svg`, `technical-architecture.svg` — main hat nur die 5 alten `docs/diagrams/old/*` + `what-is-jimesh.svg`), noch `docs/roadmap/PLUGINS.md`, noch `docs/index.html`/`docs/_sidebar.md` (Docsify-Portal), noch README-Badges. Das ist **echte, seit 11-19 Tagen liegengebliebene Arbeit** — kein Fall von "eh schon anders gelöst", sondern schlicht nie entschieden.

### `origin/feature/okf-knowledge-base-7099990697800291167` (`cd6eb60`, 2026-09-14)
- **Verdict: UNMERGED** (eigener, dritter Strang derselben Knowledge-Base-Idee)
- 67 Files (`knowledge/README.md`, `knowledge/gateway-specifications/`, `knowledge/skills/`, GraphRAG-Portal-Ausbau von `docs/index.html`). NICHT Ancestor von main.
- main hatte tatsächlich **eine eigene** OKF-Knowledge-Base-Serie gemerged (`0cf335a` "118 Files", `cc7d2ff`, `af3c7b1`, `def9ac9` — 2026-09-13/14) — bis sie am 2026-09-16 durch `2e6f919` komplett gelöscht wurde (siehe §4). Der heute auf main sichtbare `knowledge/`-Ordner (nur 2 Dateien: `agent-browser-control.md`, ein Blogpost) stammt aus **späteren, unabhängigen** TASK-115-Commits, nicht aus einer Wiederherstellung. Dieser Remote-Branch (`cd6eb60`) ist also weder die Quelle des gelöschten noch des jetzigen Rests — ein dritter, ebenfalls toter Ast derselben Idee.

### `feat/security-engineer-gateway-commands` (lokal, `164748b`) vs. `origin/feat-security-engineer-gateway-commands-13668009785623557718` (`4da3b99`) — zwei völlig verschiedene Branches, gleicher/ähnlicher Name
- **`feat/security-engineer-gateway-commands` (lokal) — Verdict: STALE, sicher löschbar.** Enthält trotz Branch-Namen WP8-Website-Arbeit (Next.js `website/`) — inhaltsgleich (fast wortgleiche Commit-Message) direkt auf main als `105690d` nachgezogen und mit `c8f1570` (WP9-Repair: echte Docs statt Fiktion) weiterentwickelt. Diff zwischen Branch-Tip und main ist minimal (trailingSlash, gen-docs.mjs) — Substanz ist in main, sogar verbessert.
- **`origin/feat-security-engineer-gateway-commands-13668...` (Remote) — Verdict: STALE/ABANDONED.** Ein *anderer*, älterer Versuch: animierte Landingpage **innerhalb** von `src/frontend/src/website/` (App.tsx-Integration, eigene Animationskomponenten). main hat `src/frontend/src/website/` nicht — dieser Ansatz wurde zugunsten der separaten Next.js-App (`website/`, s.o.) verworfen. Keine Restfunktion verloren, da die dortige Fiktion (u.a. laut späterem WP9-Commit "erfundene eBPF/SPIFFE-Stitch-Fiktion") ohnehin nicht das gewünschte Produkt beschrieb.

---

## 4. Der eigentliche Hauptfund: Commit `2e6f919` (2026-09-16 09:22)

„chore(repo): root/repo hygiene cleanup + SPRINT-44 deploy restructure completion" — **995 Dateien geändert, 2.207 Insertions, 86.809 Deletions.**

Nachweislich durch diesen einen Commit verloren, **ohne Erwähnung in der Commit-Message**:

| Pfad | Dateien vorher | Dateien nachher | Wiederhergestellt? |
|---|---|---|---|
| `knowledge/` (OKF-Wissensbasis) | 118 | 0 | Nein — die 2 heute sichtbaren `knowledge/general/*`-Dateien stammen aus späteren, unabhängigen TASK-115-Commits, nicht aus Recovery |
| `docs/reference/` | 29 (u.a. `AUTH-CONTRACT.md`, `AUTH-ARCHITECTURE.md`, `ARCHITECTURE-DESIGN.md`, `PLUGIN-SPEC.md`, gvisor/litellm/debezium/aws-Notizen, `plugin.schema.json`) | 0 | Nein, keine Spur unter irgendeinem Pfad in main |

Die Commit-Message rechtfertigt ausschließlich: Entfernen toter FreeLLMAPI-Legacy-Dateien, `config/` → `deploy/<service>/`, `scripts/` → `src/scripts/`, `sdk/` → `src/sdk/`, Entfernen eines versehentlichen Git-Submodule-Links. Kein Wort zu `knowledge/` oder `docs/reference/`.

Das ist der mit Abstand größte, konkreteste "silent loss"-Fund im gesamten Audit — 147 Dateien, mehrere Tage vorherige Multi-Agent-Arbeit (OKF-Knowledgebase-Merge wurde 2 Tage zuvor noch als "118 Files ... publication-ready" gefeiert), durch eine pauschale "Hygiene"-Aufräumaktion mitgerissen.

---

## Action-needed-Liste

**Braucht eine Operator-Entscheidung:**
1. **`2e6f919`-Verlust** (`knowledge/`, `docs/reference/`) — soll das aus der Historie wiederhergestellt werden (`git checkout 2e6f919^ -- knowledge/ docs/reference/` + manuelle Prüfung, ob Pfade heute noch passen)? Größter Einzelposten.
2. **`task/080-vlan-network-isolation`** — der `&&`-Chain-Bug ist aktuell wieder in main (`vlan.go`/`VLANProvisionCommands`). Fix + Regressionstest aus `2808825` zurückportieren.
3. **Doku-Restrukturierungs-Cluster** — drei tote, konkurrierende Vorschläge (`docs/restructure`, `jules-pr-integration`, `origin/feature/okf-knowledge-base-*`). Entscheiden: eine davon landen, alle verwerfen, oder neu synthetisieren — aktuell wächst `docs/` einfach unstrukturiert weiter.
4. **`task/architecture-docs`** — 343-Zeilen-Architekturdokument wiederherstellen (steckt unverändert in `a8ae67f`) oder bewusst als obsolet einstufen.

**Sicher zu löschen (kein Verlust, Verdict STALE/ABANDONED/CLEAN-identisch):**
- `sprint51-agent-session-fake-telemetry-fix`, `jules-work`, `task/078-headscale-networks`, `task/079-identity-router`, `feat-workspace-multitenancy`, `fix-crashes-integrations`, `feat-app-panel`, `feat-workspace-lifecycle` — alle inhaltlich vollständig in main, Worktrees können abgeräumt werden.
- `preserve/glm-embeddings-attempt-wip`, `preserve/glm-embeddings-family-wip` — beide durch TASK-031 abgedeckt/absorbiert.
- `worktree-agent-a563d2ea206259ea0` — Edge-Control-Plane-Fähigkeit existiert (anders gebaut) via TASK-058.
- `feat/security-engineer-gateway-commands` (lokal) + `origin/feat-security-engineer-gateway-commands-13668...` — beide durch spätere Website-Arbeit ersetzt.
- `/tmp/jimesh-tsc-base` — reiner Scratch-Checkout, kein Branch dahinter.

**Kein Handlungsbedarf, nur zur Kenntnis:**
- `feat-workspace-multitenancy`s Merge-Hiccup (`f69229d`) war real, ist aber bereits selbst gefixt.
- `e348871`s Commit-Message war irreführend (behauptete Nav-Änderung, die nicht stattfand), folgenlos da `07b51b5` es später tatsächlich umsetzte.
