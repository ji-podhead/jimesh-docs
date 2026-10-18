# JiMesh — Jules Task-Plan (alle Tasks, fertig zum Abholen)

**Datum:** 15.9.2026 | **Agent:** Jules (async, GitHub-basiert)
**Format je Task:** Scope (Files) / Kontext / Acceptance / Constraints / Verifikation
**Reihenfolge = Priorität + Abhängigkeit.** Jeder Task ist self-contained (Jules sieht keinen Gesprächskontext).

---

## P0-1 — Sidebar-Rebuild: 3-Ebenen-Hierarchie (SSH → Projects → Apps)

**Scope:** `src/frontend/src/components/layout/*`, `src/frontend/src/views/ProjectsPage.tsx`, `WorkspacesPage.tsx`, `src/frontend/src/lib/global-scope.ts`, `scope-selector.tsx`
**Kontext:** Der Operator hat die aktuelle Sidebar als "komplett schiefgelaufen" beurteilt. Die Soll-Struktur ist die Leobot-Sessions-Hierarchie — auf JiMesh gemappt.
**Soll-Design (exakt):**
```
Sidebar LINKS = Haupt-Navigation:
SSH TARGETS (Level 0, Root)
├─ user@host-1 ▼ (aufklappbar)
│   ├─ Project-A ▼ (Level 1, aufklappbar)   ← UI: "Project-A" | API: "workspace-A"
│   │   ├─ App-1 (Level 2, Deployment)      ← UI: "App-1" | API: "deployment-1"
│   │   ├─ App-2
│   │   └─ [+ Deploy App]
│   ├─ Project-B ▼
│   └─ [+ New Project]
└─ user@host-2 ▼
```
**Regeln:**
1. "Projects" und "Workspaces" sind EIN Konzept — die UI zeigt "Project-XY" für einen Workspace. Kein separates Projects- und Workspaces-Menü.
2. "Apps" und "Deployments" sind EIN Konzept — Deployments laufen IN einem Project und heißen in der UI "Apps". Kein separates Deployments-Menü.
3. Die Hierarchie ist aufklappbar (wie Leobot-Sessions): Target aufklappen → Projects, Project aufklappen → Apps.
4. Klick auf App → navigiert zur Deployment-Detailansicht (Logs/Config/Status).
5. Aktive Selektion (Target/Project/App) ist visuell markiert und steuert den Scope für alle anderen Views.
**Acceptance:**
- [ ] Sidebar ist links und bildet die 3 Ebenen ab
- [ ] Kein separates "Workspaces"- und "Projects"-Menü
- [ ] Kein separates "Deployments"-Menü
- [ ] Klick-Pfad funktioniert: Target → Project → App → Deployment-View
- [ ] Der Scope (Target/Project/App) steuert Log/Analytics-Views
**Constraints:** Kein Backend-Change. Keine neue API. i18n de+en. Kein next build (npm run build verboten).
**Verifikation:** `npm run dev` läuft auf :19090, die Hierarchie ist klickbar, kein Runtime-Crash.

---

## P0-2 — Runtime-Crash-Fix: `workspaces.filter is not a function`

**Scope:** `scope-selector.tsx`, `global-scope.ts`, jede Datei die `GET /api/workspaces` konsumiert
**Kontext:** Runtime-Crash im Frontend — die Workspaces-API liefert nicht-Array-Daten (vermutlich Objekt `{workspaces:[], count:N}` oder Error-Response), `.filter()` crasht.
**Fix:** Vor jedem Array-Call absichern:
```typescript
const list = Array.isArray(data?.workspaces) ? data.workspaces : Array.isArray(data) ? data : []
```
**Acceptance:** Kein Runtime-Crash beim Laden, Scope-Selector zeigt Empty-State bei leeren/faulty Daten.
**Verifikation:** Browser-Console clean, :19090 lädt ohne ErrorBoundary.

---

## P1-1 — Frontend-IA: WorkspacesPage vs SSH-Endpoint getrennt (TASK-053-Rest)

**Scope:** `ProjectsPage.tsx` (2713 Z.!), `WorkspacesPage.tsx`, API-Consumption
**Kontext:** gVisor-Install-Checkbox im Workspace-Form (Fehler — gehört zum Node), SSH-Endpoint-Onboarding im Deploy-Form (Fehler — 2 Pfade), `/projects` UND `/workspaces` parallel (doppelt).
**Acceptance:**
- [ ] gVisor-Install lebt in der SSH-Endpoint-Verwaltung (Node-Eigenschaft)
- [ ] SSH-Endpoint-Onboarding = eigener Pfad (Host/User/Pass + gVisor-Install)
- [ ] Workspace-Deploy = eigener Pfad (Project + SSH-Target-Auswahl + Preset)
- [ ] `/projects` redirected zu `/workspaces` (ein Kanon)
**Constraints:** Kein Backend-Change. Ehrliche Empty-States. Kein next build.

---

## P1-2 — Project-based RBAC: Rollen-Zuweisungs-UI

**Scope:** `AdminUsersPage.tsx`, `rbac.go` (Backend-Route existiert), OPA-Policy
**Kontext:** `project_user_budgets.role` existiert (developer default) aber keine Zuweisungs-UI. AdminUsersPage 105 Z. = nur enable/disable.
**Acceptance:**
- [ ] Rollen-Zuweisung pro (project, user): developer/viewer/admin
- [ ] UI im Workspace-/Project-Kontext
- [ ] OPA-Policy konsumiert die Rolle
**Constraints:** OPA bleibt. Keycloak bleibt. Kein Casbin.

---

## P1-3 — Firewall-Rules-UI (Operator-Lane)

**Scope:** Neue View, `/api/firewall/rules` (OPA-gated, existiert), `SecurityExposurePage.tsx`
**Kontext:** 0 Treffer auf `firewall/rules` in Views — das POST/DELETE-Backend hat NULL Frontend-Verbraucher. Router-Firewall (jimesh_inbound) ist opt-in per --firewall.
**Acceptance:**
- [ ] Rule-Liste (Alias, Port, Protocol)
- [ ] Grant/Revoke-Buttons (Operator)
- [ ] User-Sicht read-only
- [ ] Ebenen-Badges: 1=Sandbox (gVisor), 2=Egress (nftables NS), 3=Router-Firewall
**Constraints:** Router bleibt der EINZIGE Eingang. OPA-Gate bleibt.

---

## P2-1 — SIEM/eBPF: Wazuh-Bridge + Falco (TASK-054)

**Scope:** `deploy/siem/`, `internal/siem/`, SPRINT-32-Checkoffs, BACKLOG E-SIEM-Zeile
**Kontext:** deploy/wazuh/ existiert (WP0, null Go-Verkabelung). Event-Kanal: POST /api/sdk/logs (type=audit). Attribution via X-JiMesh-Header-Kette.
**Acceptance:**
- [ ] docker compose --profile siem up startet Wazuh+Falco
- [ ] Wazuh-Alerts → /api/sdk/logs (alias=wazuh)
- [ ] Falco-Events → gleicher Kanal
- [ ] Suricata-XDP + OpenSearch ehrlich als v2/BYOL dokumentiert
**Constraints:** internal/scanner NICHT anfassen. Kein neuer Service ohne Not.

---

## P2-2 — Claude's Leftovers: Control-Plane-Merge (cb58318)

**Scope:** Worktree `.claude/worktrees/agent-a563d2ea206259ea0` (cb58318)
**Kontext:** Control-plane-target-selection gebaut + committed, aber nie in main gemerged (Claude's Quota-Ende).
**Acceptance:** Review + Merge in main + Build-Verifikation (go build ./...).
**Constraints:** Kein Push ohne Review-Lane-OK.

---

## P2-3 — Claude's Leftovers: WAF + Checkov (WIP-Arbeitung)

**Scope:** Worktrees aa9e9ef (WAF: projects_ssh.go + Sprint-31) und Checkov
**Kontext:** Uncommitted WIP — nicht fertig (Quota-Ende).
**Acceptance:** WIP reviewen, fertigstellen oder verwerfen (ehrliche Doku).

---

## P3 — Operator-Entscheidungen (NICHT Jules-Task)

| Decision | Status |
|---|---|
| E-SIEM-1..5 (Wazuh-Version, opt-in, Falco, Dashboards, 30d) | Defaults dokumentiert — Operator lock-in nötig |
| O1–O5 (AWS SSM vs BYO transport, CA, residency) | Sprint-33 requires before WP3 |
| E8 (narrow AI-workspace vs broad IDP) | Positionierung offen |
| R39:145 credential | Rotation empfohlen, history rewrite deferred |

---

## Jules-Konventionen (für ALLE Tasks)

1. **No next build** — npm run dev :19090 verifizieren
2. **No git add -A** — explizite Pfade
3. **No push** — Review-Lane
4. **No-Mock** — echte API-Calls, ehrliche Empty-States
5. **i18n de+en** — Präzedenz NetworksPage
6. **CGO_ENABLED=0** — pure Go, keine neue Dependency außer golang.org/x
7. **Staging-Kollisions-Schutz** — vor commit git status prüfen (ab99f24-Lesson)
