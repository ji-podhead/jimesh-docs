# COMPREHENSIVE GAP ANALYSIS: All Missing Items from Prompts/Sessions

**Generated:** 4.10.2026
**Source:** All session logs, prompts, subagent logs, chat logs in `docs_dev/`

---

## 📋 EXECUTIVE SUMMARY

**Total Prompts Analyzed:** ~108 user messages across multiple sessions
**Subagents Run:** 12 parallel agents (S162-S169, S172, S165, S163, S167)
**Sprints Documented:** S161-S184 (24 sprints)
**Sprints Built:** S161-S169, S168, S169, S172, S182-WP1, S182-WP2, S183, S184
**Sprints Planned/Documented Only:** S170, S171, S173, S174, S182-WP3/WP4
**Sprints Missing Docs:** S170, S171, S174, S182-WP3/WP4

---

## ❌ MISSING SPRINT DOCS (Need Creation)

| Sprint | Topic | Source | Priority |
|--------|-------|--------|----------|
| **S170** | Utility Container (code-server, SilverBullet, Git Graph, n8n, Claude Code) | Prompt 111113, 116157 | HIGH |
| **S171** | Onboarding + Presets + Dynamic Sidebar | Prompt 111113 | HIGH |
| **S174** | Sessions/Traces (OpenReplay, Kafka, Datadog) | Prompt 135137, 138019, 140187 | HIGH |
| **S182-WP3** | Terminal in Projects | Prompt 144166, 144961 | MEDIUM |
| **S182-WP4** | Container Overview Widget | Prompt 144961 | MEDIUM |

---

## ❌ MISSING BACKLOG ENTRIES (from prompts)

### From `glm-session-fill-the-gaps.md` (21.9.2026)

| # | Gap | Sprint/Backlog | Status |
|---|-----|----------------|--------|
| 1 | **File Browser Backend** (`/api/ssh/explore`) | S170 | ❌ MISSING |
| 2 | **Secrets/Vault Consolidation** (4 unkonsolidierte Ablagen) | Backlog #099 | ❌ MISSING |
| 3 | **Firewall Dashboard Integration** | Backlog #094, #095, #096, #102 | ❌ MISSING |
| 4 | **SIEM Restarbeiten** (WP1 Shipper, WP3 Ruleset, Mapper) | Backlog #032 | ❌ MISSING |
| 5 | **Plugin System** (Manifest Spec → Registry → Auth → RBAC → Renderer) | Backlog #106-#116 | ❌ MISSING |
| 6. | Feature-Workspace bei SSH-Target | Backlog #? | ❌ MISSING |

### From `glm-session-fill-the-gaps.md` (Tier 2)

| # | Fix | Component | Status |
|---|-----|-----------|--------|
| #150 | 4 tote Frontend-Calls (`/api/conversations`, `/api/logs`, `/api/models/custom/{id}`, `/api/media/custom`) | Frontend | ❌ |
| #168 | Plugin Install Wizard: fake Connection-Test | Frontend | ❌ |
| #169 | Plugin Settings: Buttons ohne onClick | Frontend | ❌ |
| #154 | `NetworkEditingGrid.tsx` verwaist | Frontend | ❌ |
| #148 | SPRINT-16 als "durch SPRINT-39 ersetzt" markieren | Doku | ❌ |
| #152 | ~15 undokumentierte Routen in `API_DOCS.md` | Doku | ❌ |

### From `glm-session-post-audit-tasks.md` (Tier 0 - Kritisch)

| # | Fix | File | Status |
|---|-----|------|--------|
| #142 | `/api/ssh/explore` doppelt registriert | `deploy/ssh_explore.go` vs `gateway/ssh_explore.go` | ❌ TIER 0 |
| #162 | `ProxyChainsPage.tsx:763` `key.status \|\| 'healthy'` | `ProxyChainsPage.tsx` | ❌ TIER 0 |
| #147 | `AgentSessionDetailPage.tsx` — 100% Fake-Data | `AgentSessionDetailPage.tsx` | ❌ TIER 0 |
| #145 | `PluginCatalogPage.tsx:73-158` fake Ratings/Reviews | `PluginCatalogPage.tsx` | ❌ TIER 0 |

### From `glm-session-item2-item3.md` (Design-Routen)

| # | Design Route | Backend | Frontend | Status |
|---|-------------|---------|----------|--------|
| 1 | App-Discovery | ✅ `POST /api/projects/discover` | ❌ Route fehlt | ❌ |
| 2 | Browser-Integration-Selection | ❌ Kein Backend | ❌ Klären mit Operator | ❌ |
| 3 | Deployment-Detail | ✅ `GET /api/projects/{id}/deployments/{depId}` | ❌ Route fehlt | ❌ |
| 4 | OTel-Trace-Detail | ❌ Backend kaputt (Audit F-05) | ❌ Blockiert | ❌ |
| 5 | SSH-Target-Detail | ✅ `/api/settings/ssh_endpoints` | ❌ Route fehlt | ❌ |

### From `glm-session-post-audit-tasks.md` (Tier 1 - GLM Queue)

| Item | Task | Status |
|-----|------|--------|
| Item 2 | Secrets/Vault Pfad-Modell + SDK `jimesh.secrets.get()` | ❌ |
| Item 3 | 5 Design-Routen (App-Discovery, Deployment-Detail, SSH-Target, OTel, Browser) | ❌ Teilweise |
| Item 4 | WorkspaceDetailPage echtes Backend (`/api/deployments`) | ❌ |
| #130 | User-Provisionierung mit Pfad-Präfix | ❌ |
| #131 | Shared Workspace | ❌ |
| #132 | Projekt-Migration zwischen Servern | ❌ |
| #133 | Sidebar-Dual-View | ❌ |

### From `glm-session-fill-the-gaps.md` (Tier 3)

| # | Feature | Status |
|---|---------|--------|
| #143 | 4 Selector-Modals (App/Project/Workspace/Target) | ❌ |
| #153 | ProjectsPage reaktivieren oder Delete → WorkspacesPage | ❌ |
| #159 | CommandPalette Live-Registry-Suche | ❌ |
| #160 | Zwei parallele Scope-Selector-Implementierungen | ❌ |
| #163 | NetworkEditingPage — Multi-Netzwerk-Graph | ❌ |
| #164 | Admin-Settings-API-Keys | ❌ |
| #165 | Teams & RBAC — Access-Preview | ❌ |
| #166 | Secrets Vault — Real-Time-OPA-Stream | ❌ |
| #167 | Vault Access Matrix | ❌ |
| #170 | Integrations & Plugins — Sidecar-Deployment | ❌ |
| #171 | Security Findings — Wiring auf IaC-Scanner | ❌ |
| #172 | DLP — Live Inspector-Sektion | ❌ |

---

## 📋 SUBAGENT STATUS (from session logs)

| Subagent | Sprint | Status | Last Report |
|----------|--------|--------|-------------|
| S162 | SIEM Deploy Blockers | ✅ DONE | `d72d408c` |
| S163 | Gateway/Meshsquad | 🔄 Running | Verification |
| S164 | Responsive Shell | ✅ DONE | |
| S165 | AI-Sektion | 🔄 Running | Stabilized (493 tests) |
| S166 | IaC-Tab Mock-Entfernung | ✅ DONE | |
| S167 | Keycloak/Grafana/Postgres Secrets | 🔄 Running | |
| S168 | Threat-Correlation Crash | ✅ DONE | |
| S169 | Auto-Mint Service Keys | ✅ DONE | |
| S172 | IAC-Scans Page Crash | ✅ DONE | |
| S165b | AI-Sektion (resumed) | ✅ Stabilized | 493/493 tests |

---

## 📁 MISSING SPRINT DOCS (Priority Order)

### HIGH PRIORITY (Operator Prompts)

| Sprint | Doc Path | Source Prompt |
|--------|----------|---------------|
| S170 | `docs/sprints/SPRINT-170-UTILITY-CONTAINER.md` | Prompt 111113, 116157 |
| S171 | `docs/sprints/SPRINT-171-ONBOARDING-PRESETS-DYNAMIC-SIDEBAR.md` | Prompt 111113 |
| S174 | `docs/sprints/SPRINT-174-SESSIONS-REPLAY-TRACE-TAGGING.md` | Prompt 135137, 138019, 140187 |

### Already Created (This Session)

| Sprint | Doc Path | Status |
|--------|----------|--------|
| S170 | `docs/sprints/SPRINT-170-UTILITY-CONTAINER.md` | ✅ Created |
| S171 | `docs/sprints/SPRINT-171-ONBOARDING-PRESETS-DYNAMIC-SIDEBAR.md` | ✅ Created |
| S174 | `docs/sprints/SPRINT-174-SESSIONS-REPLAY-TRACE-TAGGING.md` | ✅ Created |
| S182-WP3 | Extended in `SPRINT-182-...` | ✅ Extended |
| S182-WP4 | Extended in `SPRINT-182-...` | ✅ Extended |

---

## 🚨 TIER 0 CRITICAL (Must Fix First)

| # | Issue | File | Mandat | Status |
|---|-------|------|--------|--------|
| #142 | `/api/ssh/explore` doppelt registriert | `deploy/ssh_explore.go` vs `gateway/ssh_explore.go` | Mandat 6 | ❌ |
| #162 | `ProxyChainsPage.tsx:763` `key.status \|\| 'healthy'` | `ProxyChainsPage.tsx` | Mandat 2 | ❌ |
| #147 | `AgentSessionDetailPage.tsx` 100% Fake | `AgentSessionDetailPage.tsx` | Mandat 2 | ❌ |
| #145 | `PluginCatalogPage.tsx` fake Ratings | `PluginCatalogPage.tsx` | Mandat 2 | ❌ |

---

## 📋 BACKLOG ENTRIES TO ADD (Missing)

### S170 Entries (Utility Container)
- S170-1 Base Image (code-server, SilverBullet, Git Graph, n8n, Claude Code)
- S170-2 Container Structure (S3 Mount, Supervisord)
- S170-3 Git Integration (Native + Git Graph .vsix)
- S170-4 S3 File Ops (Rename = Copy+Delete)
- S170-5 VS Code Sidebar Integration
- S170-6 Onboarding Integration
- S170-7 Security (gVisor)
- S170-8 S3 File Ops API

### S171 Entries (Onboarding + Presets)
- S171-1 Onboarding Wizard (4 Steps)
- S171-2 Presets (Dev/Design/Marketing/DevOps/Custom)
- S171-3 Dynamic Sidebar (Context Keys)
- S171-4 Plugin/Service Selection UI
- S171-5 Onboarding API
- S171-6 Presets Config

### S174 Entries (Sessions/Traces)
- S174-1 Session Propagation (X-Headers)
- S174-2 Kafka Traces Pipeline
- S174-3 OpenReplay Integration
- S174-4 Datadog-Style Network Events UI
- S174-5 Session Propagation in Worker Deployment
- S174-6 OPA/Trust-Ratchet/Threat-Detection

### S182-WP3/WP4
- S182-WP3 Terminal in Projects (Default Utility Container)
- S182-WP4 Container Overview Widget mit SSH Target

### Tier 0 Fixes (as S181 entries)
- S181-16: #142 ssh_explore duplicate
- S181-17: #162 ProxyChainsPage healthy fallback
- S181-18: #147 AgentSessionDetailPage fake data
- S181-19: #145 PluginCatalogPage fake ratings

---

## 📋 ACTION PLAN

### Phase 1: Tier 0 Critical Fixes (This Week)
1. Fix #142 ssh_explore duplicate
2. Fix #162 ProxyChainsPage healthy fallback
3. Fix #147 AgentSessionDetailPage fake data
4. Fix #145 PluginCatalogPage fake ratings

### Phase 2: Create Missing Sprint Docs (This Week)
1. S170 Utility Container Doc
2. S171 Onboarding + Presets Doc
3. S174 Sessions/Traces Doc
4. S182 WP3/WP4 (Terminal + Container Widget)

### Phase 3: Backlog Updates
1. Add missing S170, S171, S174 entries to BACKLOG.md
2. Add Tier 0 fixes as S181-16 through S181-19
3. Add Tier 1 GLM queue items as S181-20+
4. Add Tier 2/3 items as future sprints

### Phase 4: Build Missing Features
1. S170 Utility Container Image
2. S171 Onboarding Webview
3. S174 Sessions/Traces Pipeline
4. S182 WP3/WP4 Components

---

## 📁 FILES CREATED THIS SESSION

| File | Description |
|------|-------------|
| `docs/sprints/SPRINT-170-UTILITY-CONTAINER.md` | ✅ Utility Container Sprint |
| `docs/sprints/SPRINT-171-ONBOARDING-PRESETS-DYNAMIC-SIDEBAR.md` | ✅ Onboarding + Presets |
| `docs/sprints/SPRINT-174-SESSIONS-REPLAY-TRACE-TAGGING.md` | ✅ Sessions/Traces Pipeline |
| `docs/sprints/SPRINT-182-DASHBOARD-GRID-AND-NAVBAR-IA.md` | Extended with WP3/WP4 |
| `docs/backlog/BACKLOG.md` | Extended with S170, S171, S174, S182-WP3/WP4, Tier 0 |
| `docs/sprints/SPRINT-184-DNS-OVERHAUL.md` | ✅ DNS Overhaul |
| `docs/sprints/SPRINT-184-DNS-OVERHAUL.md` | ✅ DNS Overhaul |
| `docs_dev/last_dsh/HANDOFF_COMPLETE.md` | ✅ Complete Handoff |

---

## ✅ VERIFICATION CHECKLIST

Before next session, verify:

- [ ] `make go-build` + `make go-vet` → Exit 0
- [ ] `npx tsc -p tsconfig.app.json --noEmit` → ≤ 414 errors (baseline), 0 in new files
- [ ] `npx vitest run` → All tests pass
- [ ] `node scripts/check-i18n.mjs` → PASS 60 locales
- [ ] All new Sprint docs have: Plan, Work Packages, Acceptance Criteria, Files to Create
- [ ] All new BACKLOG entries have: Nr, Task, Status
- [ ] No secrets in any new files
- [ ] All Sprint docs follow structure: Plan → Work Packages → Acceptance → Files → Verification