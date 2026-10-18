# HANDOFF-2026-09-20 — VOLLSTÄNDIGER SESSION-TRANSFER FÜR CLAUDE

> **An die nächste Session:** Du bist frisch. Lies dieses Dokument VOLLSTÄNDIG, dann die
> referenzierten Dateien. Der vorige Handoff (2026-09-18, 263 Z.) ist VERALTET —
> dieser hier ersetzt ihn.

---

## 1. WAS IN DEN LETZTEN 48 STUNDEN PASSIERT IST

### Phase 1: Research + Spezifikation (9 Subagents, alle fertig)
- 6 Architektur-Specs: FE-IA-SPEC (570Z), FE-PLUGINS-CONCEPT (346Z), FE-OVERVIEW-SPEC (587Z),
  FE-IAC-DISCOVERY-SPEC (357Z), COMPONENT-SCHEMA (566Z, 23 Typen), RESEARCH-SAM-ONTOLOGY (411Z)
- MASTER-PLAN (191Z, 25 neue API-Routen, 3 Sprints, Top-3-Risiken)
- FRONTEND-MOCK-PLAN (387Z, 24 Routen, 16 Mesh-Primitives, Baureihenfolge P0→P4)
- 4+1 Security-Reports in docs_dev/research/reports/ (1.212 Z.)
- Sprint-Infrastruktur: SPRINT-1-4 + BACKLOG.md

### Phase 2: Stitch-Design-System (56 Screens, Google Stitch MCP)
- **Stitch-Projekt:** projects/18208781056688578837 (API-Key in opencode.json/env)
- **56 Screens** in design-assets/stitch/ (PNG+HTML pro Screen)
- **Design-Kategorien:**
  - Navigation: Sidebar (original+refined), Overview, 4 Selector-Modals, Global Search
  - Detail-Pages: SSH Target, Workspace, App (Interfaces), Agent Session, Project (IaC), Deployment, Container Logs
  - **Proxy GRAPH-FIRST:** Chain-Overview mit Mini-Graph-Previews + Chain-Graph-Editor als React-Flow-Modal
  - Security: Firewall Rules, OPNsense-Config, Provider-Setup-Wizard, Traffic-Log, SIEM Timeline, Findings, Agent-Scanner, DLP-Settings, Tool-Call-Inspector, Vault-Access-Matrix
  - RBAC: Teams+Bindings, User-Management, Admin-Settings/API-Keys
  - Plugins: Catalog, Detail, Install-Wizard, Settings
  - Deploy: Integrations, Browser (KasmWeb/VNC), Onboarding, App-Discovery, Dashboard-Builder
  - Observability: Trace-Detail (Waterfall), Notification-Center
- **Refinement-Runden:** Runde 1 (Grund-Designs), Runde 2 (App-Type-Icons, Integration-Badges,
  Docker-Hub-Metadaten, Terminal-Panel), Runde 3 (Multi-Select-Bar, 3 neue Screens),
  Gap-Batches (Firewall, Agent-Scan, DLP, OTel, Vault, Proxy-Graph)

### Phase 3: Frontend-Implementierung (echter Code, tsc-clean, getestet)

| Route | Feature | Commit |
|---|---|---|
| `/overview` | BreadcrumbBar + NodeHealthStrip + OverviewGrid mit Component-Adapter v1 | b23f926 |
| `/workspaces/apps/:appId` | AppDetailPage + ContainerLogViewer (Interfaces/Logs/Audit-Tabs) | 2878331 |
| `/security/findings` | SecurityFindingsPage (echtes POST dismiss) | 6b8be54 |
| `/security/siem` | SIEM-Events mit Timeline-Strip (24 Bins, Severity-Bars) | 6b8be54 |
| Teams-Page | Resource-Bindings-Tab (Typ/Access/Vererbung-Badges) | caccb6c |
| Admin-Users | Create-User-Dialog (ECHTES POST /api/users → Keycloak!) | caccb6c |

**Gebaute Komponenten (alle committed):**
- `types/domain/overview.ts` — 23 Component-Typen aus COMPONENT-SCHEMA
- `global-scope.ts` — Multiauswahl SelectionSet (additiv, non-breaking)
- `components/overview/` — OverviewGrid, ScopeSelectorModal, BreadcrumbBar
- `components/apps/` — ContainerLogViewer
- `components/rbac/` — team-bindings-panel
- `components/mesh/` — MeshBadge
- `lib/mesh-icons.ts` — Icon-Brücke (30+ Mappings auf lucide)
- `lib/siem-timeline.ts` — Timeline Binning (pure Helpers)
- `ui/tabs.tsx, ui/progress.tsx, ui/breadcrumb.tsx` — shadcn-Primitives
- `components/files/` — FilePathInput, FileBrowserModal, FileBrowserField

### Phase 4: Assets + Icons
- **483 Icons** im Repo (311 AWS + 67 Network + 54 Brand + 16 Agent + 13 Provider + 10 Dev + 8 Others)
- **7 neue Integration-Icons** (OPNsense, Snyk, Stitch, Figma, Playwright, DrawIO, KasmWeb)
- **ICON-REGISTRY.md** — alle Quellen + Lizenzen + 9 fehlende Plugin-Icons

---

## 2. WAS CLAUDE JETZT TUN SOLL (priorisiert)

### SOFORT (P0 — blockiert):
1. **Sprint A Security (aus Aggregation):**
   - R3 Phase 0: Red-Team-Korpus als Go-Tests (db-frei, Muster: capabilities_test.go)
   - R2 Phase 1: dlp_hook.go in toolcalls.go:179-183 + 267-277 (vor Ledger-Write, default OFF)
   - R4 Phase 1: internal/oteltrace/ (TracerProvider, OTLP-Spine)
   - R1 Phase 1: internal/agentconfig/ + 5 deterministische Checks
   - §4 Vault-ACL-Fix: allowed_agents in vault.go
2. **Fork A Merge-Review:** project_roles + project-roles.rego + project_gate.go sind auf dem Branch

### DANN (P1):
3. **Backend-Routen für die neuen UI-Pages:**
   - GET /api/team-bindings (Teams-Page braucht die echte Route — Backlog B15)
   - POST /api/ssh/explore (File-Browser-Backend — Frontend-Komponenten sind fertig)
   - Container-Logs SSE (GET /api/projects/{id}/containers/{cid}/logs)
   - GET /api/projects/{id}/iac-files (IaC-Discovery)
4. **Deploy-Persistenz:** executeDeploy schreibt KEINE Deployment-Rows (store.go:333-345) — die 13. Lücke aus COMPONENT-SCHEMA §9

### SPÄTER (P2):
5. Plugin-System-Backend (GET /api/plugins erweitern um die 9 MCP-Dual-Plugins)
6. Docker-Hub-Metadaten-Route
7. Weiche nodeHost/nodeUser-Kette auf echte FKs (MASTER-PLAN Risiko 1)

---

## 3. ALLE PROMPT-DATEIEN (für neue Subagents zum Kopieren)

| Datei | Inhalt |
|---|---|
| docs/PROMPTS-STITCH-DESIGN.md | 6 UI-Design-Prompts für Stitch |
| docs/PROMPT-LORA-CLOUDFLARE.md | Artikel-Prompt LoRA/Cloudflare Workers |
| docs/PROMPT-BROWSER-COMPARE.md | KasmWeb vs Browserless vs Webtop |
| docs/RESEARCH-COMPILE-TIME-OBSERVABILITY.md | otelc, Semgrep, AutoLogger, Deploy-Gate |
| docs/DESIGN-ASSET-MANAGEMENT-SPEC.md | Stitch/Figma/DrawIO als Components + Container-Logs + API-Keys im Vault |
| docs/STITCH-DESIGN-STATUS-USERFLOWS.md | 5 Userflows + Schema-Mapping + Iterations-Prozess |
| docs/ICON-REGISTRY.md | Alle Icon-Quellen + 9 fehlende |

### Subagent-Prompt-Vorlagen (bewährt):
- **Planer:** "Lies [X-Docs], schreibe [Y-Plan].md mit [Abschnitte]. KEINE Code-Änderungen."
- **Implementer:** "BAUE 2 KOMPONENTEN — NICHTS MEHR. KEINE HTML-Dateien lesen (Kontext-Limit!). Ich beschreibe das Design direkt: [Beschreibung]. tsc 0 Fehler. Committe + push."
- **WICHTIG:** Max 3-4 Agents parallel, sonst Rate-Limit. Agents die HTML-Dateien lesen sollen craschen häufig — Design per Text beschreiben statt Dateien lesen zu lassen.

---

## 4. GIT + DEPLOY-STAND

```
Branch: feat/security-engineer-gateway-commands
Remote: origin → JiMesh2.git (dev)
Trading: /opt/jimesh/repo tracked jimesh.git (ANDERES Remote — divergent!)
Frontend auf trading: hot-reload via bind-mount (Datei-Sync per tar reicht)
Backend auf trading: jimesh-backend:local Image (Rebuild nötig bei Backend-Änderungen)
SSH zu trading: ssh -F /dev/null -p 2222 jimesh-operator@172.17.0.2
```

**Frontend-Dateien die auf trading synced wurden:** Alle neuen Views, Komponenten, ui-Primitives, App.tsx-Routen, types/domain/overview.ts, global-scope.ts, store.tsx — SYNC OK verifiziert.

**NICHT deployed:** Backend-Änderungen brauchen Image-Rebuild auf trading.

---

## 5. WAS NICHT FUNKTIONIERT / BEKANNT GUT ZU WISSEN

- **tsc:** 226 vorexistierende Fehler in 35 fremden Dateien (chain-mesh-graph 108, FallbackPage 32...) — NICHT von uns, Bestands-Rauschen
- **Tests:** 293 vitest grün (inkl. 8 neue von RBAC-Pages)
- **i18n:** 60 Locales, 2301 Keys, check-i18n grün
- **Backend-Netzwerk auf trading:** jimesh-net erreicht Postgres nicht (hostseitiges Problem, auch an sauberem HEAD)
- **R2-Rate-Limit:** bei >6-7 parallelen Subagents craschen sie ohne Message
- **Kontext-Limit:** Agents die 34-54KB HTML-Dateien lesen craschen — Design per Text-Beschreibung im Prompt geben

---

## 6. VISION (Operator-Wortlaut, 48h konsolidiert)

1. **JiMesh baut JiMesh** — Stitch designed die UI, JiMesh deployed sie
2. **Design-First** — erst ALLE Designs, dann implementieren
3. **Proxy = GRAPH** — React Flow Editor, keine dummen Cards (chain-mesh-graph.tsx existiert!)
4. **Native vs Plugin klar getrennt** — Core-Security nativ, externe Tools als Plugins
5. **KEINE Mocks die nicht funktionieren** — echte API-Calls oder ehrliche Empty-States
6. **Snyk NICHT als Plugin** — Consent-Falle, lokale Checks stattdessen (R1)
7. **MCP-Dual-Support** — Linear/Neon/Supabase/Tinybird/Context7/v0 als REST + MCP
8. **Rate-Limit beachten** — max 3-4 Agents parallel, Designs per Text statt HTML-Dateien

---

## 7. NÄCHSTE SCHRITTE (reihenfolge)

1. Lies docs/MASTER-PLAN.md (191Z.) für die vollständige P0-P3 Liste
2. Lies docs/FRONTEND-MOCK-PLAN.md (387Z.) für die Frontend-Baureihenfolge
3. Lies docs/COMPONENT-SCHEMA.md (566Z.) §9 für die 13 Backend-Lücken
4. Starte Sprint A (Security: R3-P0 → R2-P1 → R4-P1 → R1-P1 → Vault-ACL-Fix)
5. Deploy-Persistenz (die größte Backend-Lücke)
6. Team-Bindings Backend-Route (Frontend wartet darauf)
