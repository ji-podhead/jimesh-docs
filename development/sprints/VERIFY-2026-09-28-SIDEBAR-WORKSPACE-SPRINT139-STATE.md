# VERIFY 2026-09-28 — SIDEBAR / WORKSPACE / SPRINT-139 STATE (ground truth, read-only)

**Repo:** /home/ji/projects/jimesh — branch `main`.
**Git status relevant — UPDATE mid-verification:** when this audit started, HEAD was `97848b6` and the tree carried UNCOMMITTED changes to `section-nav.ts`, `WorkspaceDeploymentsPage.tsx`, `ProjectDetailPage.tsx`, `PluginCatalogPage.tsx`, `Makefile`, deploy/ansible+ozone files, `src/scripts/render-inventory.py` (exactly the "about to be committed" set the task warned about). At **03:34:06, DURING this verification**, those changes were committed as **`b642993`** ("feat(sprint-59): Deploy-Flow-Luecken gefixt — Projekt-Loeschung erreichbar (ProjectDetailPage→DELETE /api/projects/{id} …), Browser-Integration auf den echten Integrations-Tab /plugins verschoben …"; 16 files, +518/−46). All file:line evidence below was read from the tree and is UNCHANGED by that commit — only the committed/uncommitted framing changed. Where the text below says "uncommitted working-tree change", read it as "the change that landed in b642993 at 03:34". Still untracked (not committed): `src/backend/datalaked`, `gateway/files.go.s138wip` + `files_test.go.s138wip` (SPRINT-138 WIP, disabled via extension), `components/workspaces/FileBrowser.tsx` (WIP, not imported by the sidebar — the sidebar uses `components/files/FileBrowserModal`), `src/frontend/scripts/__pycache__/`, `add-sprint138-wsfiles-i18n.mjs`. Everything below reports what is IN THE TREE.

---

## SO IT IS RIGHT NOW (top summary)

1. **Onboarding** sits ONLY as the first flat link in the sidebar's "Navigation" block (`HierarchySidebar.tsx:241` → `/onboarding`). It is **NOT** in `section-nav.ts` at all (no top-nav tab, no dropdown, no SectionRail item) and **NOT** a member of the sidebar's "ALL SSH TARGETS" (servers) tree section. e348871's commit message claims "Onboarding+Deployments aus Navigation" but that commit touched only docs + a probe test — **no nav code was ever changed; both entries are still there**.
2. **Deployments** lives at `/workspaces/deployments` in BOTH surfaces: `section-nav.ts:120` (inside the Workspaces section, top nav + rail) and `HierarchySidebar.tsx:245` (sidebar Navigation block). There is no global /deployments entry anywhere.
3. **No Sprint-139 collision exists.** `feat-app-panel` (tip `094e886`, 01:08) is a **strict ancestor of main** — `git log main..feat-app-panel` is EMPTY, merge-base == branch tip. The app-panel work is fully on main and is the base the workspace-lifecycle stack (bbf6b4e, 14d1012, 97848b6) was built on. Nothing to merge, nothing to re-implement.
4. **Terminal deploy path is real and end-to-end plausible**: workspace-row Terminal button (always visible) → deployed → `WorkspaceTerminal` → WS `GET /api/workspaces/{id}/terminal` (registered `gateway.go:257`) → handler docker-execs into the gVisor workspace container through the gateway's LOCAL Docker daemon (`terminal.go`) — **no host SSH anywhere**, per the standing rule; the "separate mechanism" is exactly this docker-exec WebSocket.
5. **Workspace delete UI EXISTS** (prior claim "absent" is wrong): `WorkspacesPage.tsx` row [Delete] ConfirmButton → `DELETE /api/workspaces/{id}` (`408-418`, `880-888`), plus a separate confirm-gated "remove worktree" dialog (`869-879`, `901+`). Present since Sprint-37 commit `2c99334` (2026-09-12), unchanged in the working tree.
6. **Team/user access on workspaces: still effectively none.** What exists: single `owner_user_id` (one user, picked at create), `workspace_kind` user|shared (shared = admin/operator-only for terminal/provision), and team-bindings rows that CAN name a workspace as resourceType but are **not enforced by any access path**. No multi-user/team grant for workspace access, no members table, no UI.

---

## 1. NAV/SIDEBAR CURRENT STATE

### 1a. `src/frontend/src/lib/section-nav.ts` (278 lines; modification landed in `b642993` at 03:34 — was uncommitted when read, tree content identical)

The ONE canonical nav model for the top navbar + right-edge SectionRail. **5 sections** (`navGroups`, lines 227–269), order: Workspaces → Platform → Security → DBs → LLM-Proxy ("die LLM-Proxy-Fläche ist ein Tool unter vielen, nicht der Einstieg").

**Section 1 — Workspaces** (`to: '/workspaces'`, labelKey `nav.workspaces`; `workspaceItems` lines 114–140):
| # | Entry (to) | labelKey (DE label) | line |
|---|---|---|---|
| 1 | `/workspaces` | nav.workspaces (Workspaces) | 115 |
| 2 | `/workspaces/networks` | nav.networkEditing (Netzwerk-Bearbeitung) | 117 |
| 3 | `/workspaces/apps` | nav.workspaceApps (Apps) | 118 |
| 4 | `/workspaces/endpoints` | nav.sshEndpoints (SSH-Endpunkte) | 119 |
| 5 | **`/workspaces/deployments`** | nav.workspaceDeployments (**Deployments**) | 120 |
| 6 | `/projects/discover` | nav.appDiscovery (App-Discovery) | 124 |
| 7 | `/workspaces/settings` | nav.workspaceSettings (Einstellungen) | 125 |
| 8 | `/projects` (divider) | nav.playground (Projects) | 126 |
| 9 | `/agents` | nav.agents (Integrations) | 127 |
| 10 | `/plugins` | nav.pluginCatalog (Plugins) | 128 |
| 11 | `/plugins/settings` | nav.pluginSettings (Plugin-Einstellungen) | 129 |
| 12 | `/plugins?browser=1` | nav.browserIntegration (Browser-Integration) | 136 — **in `b642993` (03:34, during this audit; was uncommitted before): was `/workspaces/deployments?browser=1` at `97848b6`; the change moves it to /plugins per SPRINT-59 finding** |
| 13 | `/subagents/approvals` | nav.subagentApprovals | 137 |
| 14 | `/subagents/tool-calls` | nav.toolCallInspector | 138 |
| 15 | `/chat` | nav.chat | 139 |

**Section 2 — Platform** (`platformItems` 145–160): `/control-planes` (148, Control Planes), `/vault-dashboard` (151, Vault), `/networks` (152, Netzwerke), `/builder` (153, Dashboard Builder), `/dashboards` (159, Dashboards).

**Section 3 — Security** (`securityItems` 168–207): `/security/overview` (169), `/security/exposure` (170), `/security/waf-matrix` (173), `/security/firewall/provider-setup` (179), `/security/firewall/traffic` (180), `/security/firewall/opnsense` (181), `/security/secrets` (182), `/security/events` (183), `/security/audit-log` (188), `/security/scans/iac` (189–194, isActive covers all /security/scans/*), `/security/testing` (195), `/security/agent-scan` (196), `/security/traces` (200), `/notifications` (203, divider), `/security/dlp` (206).

**Section 4 — DBs** (`dbItems` 213–217): `/dbs/backups` (214), `/dbs/discovery` (215), `/dbs/datalake` (216).

**Section 5 — LLM-Proxy** (`proxyItems` 93–109): `/proxy/overview` (98), `/config` (99), `/proxy/chains` (100), `/keys` (101), `/routing-analytics` (102), `/analytics` (103), `/sdk-logs` (107), `/realtime-monitor` (108).

**There is NO "Onboarding" entry anywhere in section-nav.ts** and NO global "Deployments" entry. There is also **no "servers" section** in the top nav — "servers" exists only as the sidebar's SSH-targets tree (below).

### 1b. `src/frontend/src/components/sidebar/HierarchySidebar.tsx` (1583 lines; committed, identical to HEAD)

Sidebar anatomy (top→bottom): **B "ALL SSH TARGETS"** (Server → Workspaces → Apps tree, header 1302–1310, default collapsed) → **C "PROJECTS"** (Project → Workspaces → Apps, 1331–1402, default open) → **D "Navigation"** (flat links + ActiveAppsDropdown) → **E "Events & Observability"** → **A scope bar at the very bottom** (+ admin WorkspaceSwitcher) — per the header comment 61–154.

**Section D "Navigation" links** (`NAVIGATION_ITEMS`, lines 240–248; rendered via renderSectionLinks 1416):
| # | Entry | labelKey | line |
|---|---|---|---|
| 1 | **`/onboarding`** | nav.onboarding (**Onboarding**) | **241** — first item |
| 2 | `/agents` | nav.agents | 242 |
| 3 | `/workspaces/apps` | nav.workspaceApps | 243 |
| 4 | `/plugins` | nav.pluginCatalog | 244 |
| 5 | **`/workspaces/deployments`** | nav.workspaceDeployments (**Deployments**) | **245** |
| 6 | `/workspaces/endpoints` | nav.sshEndpoints | 246 |
| 7 | `/workspaces/settings` | nav.workspaceSettings | 247 |

Above them: `ActiveAppsDropdown` (line 1415, SPRINT-139 app-panel). **Section E links** (`EVENTS_ITEMS` 253–264): `/security/firewall-rules`, `/security/siem`, `/networks`, `/security/scans/sast`, `/security/scans/dast`, `/security/audit-log`.

Other Onboarding touchpoints in the sidebar (buttons that NAVIGATE to /onboarding, but no nav entry inside the servers tree): empty-servers "Register Server" button (line 1319), zero-projects "Start Onboarding" button (line 1356), scope-popover "Register Server" (line 1456).

### 1c. Where "Onboarding" and "Deployments" live — and the e348871 check

- **Onboarding RIGHT NOW:** exactly one nav registration — sidebar "Navigation" block first link (`HierarchySidebar.tsx:241`). NOT in section-nav.ts (so not in the top navbar tabs/dropdowns, not on the SectionRail), NOT inside the "ALL SSH TARGETS" servers section. It was added there by commit `66065a0` ("fix(onboarding): /onboarding UI-erreichbar machen — Sidebar-Navigation + Palette") and never removed since.
- **Deployments RIGHT NOW:** `/workspaces/deployments` in the Workspaces section of the top nav (`section-nav.ts:120`) AND in the sidebar Navigation block (`HierarchySidebar.tsx:245`). No standalone/global entry.
- **Commit e348871** (2026-09-28 01:13, ancestor of main): message says "fix(sidebar): Operator-Layout — **Onboarding+Deployments aus Navigation**, nodeHost-Fallback …" but `git show --stat e348871` shows it touched ONLY: `docs/sprints/SPRINT-139-WORKSPACE-LIFECYCLE.md` (+64), `docs/sprints/SPRINT-RM35-SOC2-ADMIN-AUDIT-LOG.md` (+47), `src/frontend/src/components/sidebar/__probe.test.tsx` (+95). The probe test is a popover-draft-vs-tree-selection probe (asserts popover pre-check after tree click) — nothing about nav removal. The doc additions describe the workspace-lifecycle plan (WP1–WP7), no nav-removal work package. **The "raus" claim was never executed in code.**
- **Later commits touching these files:** section-nav.ts: latest committed touch = `8ee85e4` (01:32, added `/security/audit-log`) then `20c5fb3` (dashboards entry); PLUS the change that was still uncommitted during the audit and landed as `b642993` at 03:34 (Browser-Integration entry `/workspaces/deployments?browser=1` → `/plugins?browser=1`, matching the WorkspaceDeploymentsPage de-integration + PluginCatalogPage integration in the same commit — coherent SPRINT-59 follow-up). HierarchySidebar.tsx: latest touch = `14d1012` (02:10, SPRINT-139 lifecycle status dot + deploy gate + panel wiring); it still contains BOTH nav links. **No commit ever removed Onboarding or Deployments from the sidebar.**

### 1d. Resolving the operator contradiction (evidence, not opinion)

- The earlier correction "Onboarding+Deployments raus" was **documented as a commit message but never implemented** — the tree still has both in the sidebar Navigation block (`HierarchySidebar.tsx:241, 245`).
- The later complaint "wieso ist Onboarding immer noch nicht bei **Servers** mit drinne" refers to the sidebar's "ALL SSH TARGETS" section (the only "Servers" surface that exists — there is no servers section in the top nav). Onboarding is NOT a member there; it sits two sections below it in the flat Navigation block. The only onboarding hooks inside the servers section are its empty-state "Register Server" buttons (1319) — which jump to /onboarding but vanish once servers exist.
- **Placement decision inputs:** top-nav taxonomy = Workspaces / Platform / Security / DBs / LLM-Proxy (`section-nav.ts:227-269`); sidebar taxonomy = ALL SSH TARGETS / PROJECTS / Navigation (7 flat links) / Events & Observability / scope bar (`HierarchySidebar.tsx:61-154`). Any "Onboarding into servers" move is a HierarchySidebar-only change (add a link into section B or its header); any "Deployments raus aus der Top-Nav-Workspace-Gruppe" is a section-nav.ts:120 change. The two surfaces are independent tables and today contradict each other's placement story only in the operator's head — the code is internally consistent.

---

## 2. SPRINT-139 COLLISION: feat-app-panel vs main

**Verdict: there is NO collision. feat-app-panel is fully contained in main (a strict ancestor). The branch is dead weight.**

Command results (as requested):
- `git log --oneline main..feat-app-panel | head -40` → **EMPTY** (0 commits).
- `git log --oneline feat-app-panel..main | head -40` → **exactly 8 commits** (run at main@97848b6, the HEAD when the audit started): `97848b6` (i18n 02:31), `14d1012` (lifecycle frontend 02:10), `8570e78` (docs 01:45), `bbf6b4e` (lifecycle backend 01:35), `8ee85e4` (rm35 audit-log 01:32), `e348871` (docs+probe 01:13), `a4e4ce8` (datalake 01:11), `ee84341` (tetragon 01:08). (After the mid-audit commit it would be 9 — `b642993` added on top; the ancestor conclusion is unaffected.)
- `git merge-base main feat-app-panel` → `094e886` = **exactly the feat-app-panel tip** (`git rev-parse`: feat-app-panel=094e886, main=97848b6-at-audit-time; main is now b642993).
- `git diff --stat main feat-app-panel | tail -40` → 122 files, +1174/−11975 — read backwards: everything main added after the branch point (the −11975 is what the diff "deletes" going main→feat-app-panel: rm35 admin-audit, workspace-status, the WorkspacesPage rework, 58-locale i18n fills, etc.). Includes `section-nav.ts | 6 -` (the audit-log entry), `WorkspacesPage.tsx | 517 ++/--`, `lib/workspace-status.ts | 124 ---`.

**Files both sides touch (conflict candidates):** since main..feat-app-panel is empty, no file diverges. Of the named candidates:
- `HierarchySidebar.tsx`: touched by 094e886 (app-panel: panelTarget, AppPanelDrawer, ActiveAppsDropdown) AND by 14d1012 (status dot + deploy gate) — **both already in main, applied sequentially, no conflict**.
- `section-nav.ts`: NOT touched by 094e886 (its non-locale file list contains no section-nav.ts); touched on main by 8ee85e4 (+audit-log entry) and by `b642993` (browserIntegration → /plugins?browser=1 — that change was the uncommitted working-tree diff during most of this audit).
- `WorkspaceDeploymentsPage.tsx`: NOT touched by 094e886 nor by 14d1012; changed by `b642993` (BrowserRuntimeModal/?browser=1 integration removed — moved to PluginCatalogPage per SPRINT-59).
- `App.tsx`: touched by NEITHER side (not in 094e886 stat, not in 14d1012 stat, not modified in the working tree).

**Is the app-panel concept already on main?** Fully, not partially: 094e886 (feat-app-panel tip, 01:08) is the direct parent stack base of the sprint-139 lifecycle work (e348871 → 8ee85e4 → bbf6b4e → 8570e78 → 14d1012 → 97848b6). On main the sidebar carries `panelTarget` (`HierarchySidebar.tsx:635`), app-name click opens the drawer (`openAppPanel` 858–860, renderAppRow 931), `AppPanelDrawer.tsx` + `ActiveAppsDropdown.tsx` + tests exist (`src/frontend/src/components/apps/`), and WorkspaceTerminal has the embedded form (WorkspaceTerminal.tsx:48–54, 305–330).

**Recommendation (evidence-based):** Do NOT merge anything — there is nothing to merge; main already contains 100% of feat-app-panel plus the 8-commit sprint-139/rm35 stack on top. Continue all work on main. Optionally retire the `feat-app-panel` branch ref (or keep it as a historical bookmark pointing at 094e886) to stop future sessions from treating it as divergent work. The work that was still uncommitted during most of this audit (browserIntegration move to /plugins, ProjectDetailPage delete wiring, deploy/ozone changes) was committed as `b642993` at 03:34 during the audit — nothing else in this area remains un-landed.

---

## 3. TERMINAL DEPLOY PATH (Terminal button flow)

**Verdict: end-to-end REAL and plausible — route registered, handler does genuine docker exec into the gVisor workspace container via the gateway's local Docker daemon, no host SSH anywhere (the standing rule is respected BY DESIGN).**

### 3a. When the button appears and what it does (frontend)

- **Workspace-row Terminal button** (`renderWorkspaceRow`): rendered on EVERY workspace row, ALWAYS visible — "no hover gate, no deployment gate (the operator's whole point)" (`HierarchySidebar.tsx:1105–1126`, Terminal icon button 1108–1116). State: `terminalTarget` declared line 638 ("the REAL shell — docker exec into the gVisor container, never a host SSH hop").
- Handler `openWorkspaceTerminal` (`HierarchySidebar.tsx:1013–1023`):
  1. `ws.status === 'deployed'` → `setTerminalTarget(ws)` → renders `<WorkspaceTerminal>` (`1491–1498`).
  2. Not deployed but the workspace's project row resolves as runtime context (`asBrowserRuntimeProject`, 333–351) → `BrowserRuntimeModal` deploy fallback (deploys a shell runtime; POSTs `/api/workspaces/deploy` — registered in `internal/deploy/deploy.go:65` via `s.deploy.Register(mux)`, `gateway.go:227`).
  3. Neither → honest toast `sidebar.terminalRequiresContext` (1022). No SSH hop, ever (comment 1009–1012: "NEVER an SSH hop onto the host — the operator's security decision").
- `WorkspaceTerminal.tsx`: connects xterm.js to `(ws|wss)://host + BASE_URL + /api/workspaces/{id}/terminal?token=` (131–141), binary frames = stdin, JSON text frames = resize (96), honest error/exited frames + close-code map (59–74: 4001 not running, 4003 forbidden, 4004 unknown, 1011 server error). Also hosted embedded in the AppPanelDrawer TERMINAL tab (WorkspaceTerminal.tsx:305–330).
- **App-row [T] badge is a DIFFERENT chain** (`renderAppRow` 893–987): badge appears only when the deployment row really has a terminal, vnc or code-server interface or a runtime fallback exists (`HierarchySidebar.tsx:941`); `openTerminal` (912–924) opens `appTunnelUrl(projectId, port)` — port 3080 for a terminal interface (`WEB_TERMINMAL_PORT` 171), the vnc port, or the code-server port — i.e. the app's own ports via the tunnel route (`lib/tunnel.ts:15–23`: local node → direct http://host:port; remote node → `/api/projects/{id}/tunnel/{port}` SSH reverse proxy). Fallback: BrowserRuntimeModal. This is the per-APP web-terminal path, not the workspace shell.
- Additional consumer: WorkspaceDetailPage "Open Terminal" button (`WorkspaceDetailPage.tsx:288–291`) → same WorkspaceTerminal.

### 3b. Backend endpoint and route registration

- Route: `mux.HandleFunc("/api/workspaces/{id}/terminal", s.handleWorkspaceTerminal)` — **`src/backend/internal/gateway/gateway.go:257`** (registered; auth comment 250–256: session middleware, ?token= included because browser WS cannot set headers). The whole mux is wrapped `corsMiddleware(s.auth.Middleware(s.auth.Throttled(s.mux)))` (`gateway.go:428`); bearerToken accepts Bearer header, `jimesh_session` cookie, and the ?token= query param (`internal/auth/auth.go:492–499`).
- Handler `internal/gateway/terminal.go:129–231` — real work, no mock:
  - Store row lookup (`Store.GetWorkspace`, 152–164) — honest "unknown workspace" 4004.
  - **Ownership gate** `terminalAccessAllowed` (110–126, applied 166–177): operator password session, OR Keycloak sub == `workspaces.owner_user_id`, OR jimesh-admin realm role; everything else fails closed (owner-less shared workspace = operator/admin-only).
  - Docker client `client.FromEnv` (183) → the gateway's LOCAL daemon (backend container bind-mounts /var/run/docker.sock).
  - Container resolution (195, 249–290): row's recorded containerId (inspect, must be Running) → fallback prefix scan `jimesh-framework-<wsId>-` + status=running; no match → the operator-quoted honest message `workspace container not running — deploy first` (with the node named when the row points at a remote node — "remote exec is deliberately not wired (**no SSH, ever**)", 246–248, 278–284).
  - Exec create `/bin/bash` → `/bin/sh` fallback for minimal images (204, 298–318), `ContainerExecAttach` TTY (215), bidirectional pump with mutex-guarded writes, 20s keepalive ping, resize frames (324–424). A closed terminal only ends the exec session; the container keeps running (227–230).
  - Tests: `terminal_test.go`, `workspaces_lifecycle_test.go` (in tree). Documented in API_DOCS.md line 1199.
- File header makes the rule explicit (`terminal.go:9`): "KEIN SSH auf den Host. NIEMALS."

**Plausibility caveats (honest, by design):** the exec terminal only reaches containers on the **backend's local Docker daemon**; a workspace whose row names a remote node gets the honest 4001 naming that node. The app-row [T] chain for remote nodes rides the SSH reverse-*proxy* tunnel route for app ports (that is the app's own port surface, not a shell onto the host).

---

## 4. WORKSPACE DELETE UI

**Verdict: wired — the frontend delete EXISTS (prior "absent" finding is wrong). It lives in `WorkspacesPage.tsx` row actions and has been there since Sprint-37; the other three checked surfaces have none.**

- Backend: `gateway.go:239` `mux.HandleFunc("/api/workspaces/{id}", s.handleWorkspaceDelete)`; handler `workspaces.go:267–370` — real work: revokes the workspace's live service key (295–304), confirm-gated worktree removal with node-coordinate body (306–351), deletes the row (353–356), returns honest notices (worktree kept without confirm=true, session row kept as audit trail). Documented in API_DOCS.md:923.
- Frontend (all in `src/frontend/src/views/WorkspacesPage.tsx`, committed — file NOT in the uncommitted diff):
  - `del` mutation → `apiFetch(\`/api/workspaces/\${id}\`, { method: 'DELETE', body })` — **lines 408–418** (fetch at 410–413; success toast `workspaces.deletedToast` 416).
  - Row [Delete] **ConfirmButton** → `del.mutate({ id, body: { confirm: false } })` — **lines 880–888** (row keeps the worktree; backend answers with the recovery note).
  - Row [Remove worktree] ghost button (visible when `ws.worktreePath`) → `setRemoveOpenFor(ws)` — **lines 869–879**; separate informed dialog (node host/user/port/auth + SSH credential fields) at **901–940+**, submitting `del.mutate({id, body:{confirm:true, …}})` via `handleRemoveWorktree` (439–457).
  - Buttons are rendered for everyone; non-admin denial surfaces as the exact backend 403 toast (RBAC note, lines 90–101).
  - Origin: `git log -S 'del.mutate' -- WorkspacesPage.tsx` → single introduction commit `2c99334` (TASK-037 Sprint-37-WP6, 2026-09-12) — never removed since.
- Checked and ABSENT (no delete button/handler): `WorkspaceDeploymentsPage.tsx` (grep delete/trash = 0 hits; its b642993 change only removes the BrowserRuntimeModal integration), `workspace-deploy-dialogs.tsx` (only deploy/redeploy/stop modes, header comment lines 35–39), `AppPanelDrawer.tsx` (INFO/TERMINAL/DASHBOARD tabs only, header 39–69; no delete).
- Reference-pattern note: the "ProjectDetailPage delete button pattern" was uncommitted working-tree work during most of this audit and landed in **`b642993`** (03:34, during the audit) — `ProjectDetailPage.tsx` (+113 lines) newly imports `DeleteProjectDialog` (line 48), adds the Trash2 rose-outline button (371–379) and renders the dialog (485). If workspace-delete were ever needed on more surfaces (e.g. WorkspaceDetailPage or a sidebar row action), the established in-repo patterns to copy are: WorkspacesPage row ConfirmButton (880–888) for inline confirm-delete, or the ProjectDetailPage button+DeleteProjectDialog pair.

---

## 5. TEAM/USER ACCESS ON WORKSPACES

**Verdict: still no real user/team access selection for workspaces. What exists today: one `owner_user_id` (single owner), `workspace_kind` user|shared, SPRINT-138 admin scope-switching, and team-binding rows that can NAME a workspace but are enforced NOWHERE.**

- **Schema** (`internal/store/workspaces.go` DDL ~59–112): `owner_user_id TEXT` (NULLable — NOT NULL dropped in SPRINT-139, guarded ALTER 110–112), `workspace_kind TEXT NOT NULL DEFAULT 'shared'` (71, additive ALTER 92–93), backfill user/shared (99–105), unique index per (project, owner) + partial unique index for one shared row per project (83–88). Kind is a closed set validated at create (172–182): owner set → `user`, owner NULL/"" → `shared`.
- **What owner_user_id/workspace_kind DO allow (today):**
  - Create-time single-owner pick: POST /api/workspaces body `ownerUserId` (`workspaces.go:44`, validation 199–209: must be a real, enabled user). Frontend: create-dialog kind radio user/shared (`WorkspacesPage.tsx:512–557`) + ONE owner Select from GET /api/users (`559–574`; body assembly line 305). Exactly one owner; no multi-select, no teams in this form.
  - Visibility tenancy (SPRINT-138): GET /api/workspaces — scope header → one workspace; non-admin Keycloak → only OWN workspaces (`ListWorkspacesOwnedByIdentity`, `workspaces.go:127–151`); admin/operator → all (`?all=1` override for the admin WorkspaceSwitcher, 100–109).
  - Mutation/terminal gates: owner OR admin (provision: ownership gate handler-side per gateway.go:240–249 + API_DOCS 922; terminal: `terminalAccessAllowed` terminal.go:110–126). A shared (owner-less) workspace is operator/admin-only for terminal and provision.
  - Admin scope-switch: `X-JiMesh-Scope-Workspace-Id` (SPRINT-138) + sidebar `WorkspaceSwitcher` (`HierarchySidebar.tsx:1470`, renders null for non-admins) — an admin can work scoped INTO any workspace. Not a grant model.
- **Teams:** a team model exists (`TeamsPage`, /api/teams) and `team-bindings` (`gateway.go:291–295`, `team_bindings.go`) accept resourceType from the closed set **"ssh_target, workspace, project, app"** (validation at `team_bindings.go:99–102`) with accessLevel read|write|admin (111–114); the frontend `team-bindings-panel.tsx` offers 'workspace' as a type (lines 38, 51). **BUT no workspace access path reads team bindings**: `handleWorkspacesList` gates on scope/identity/admin only; the terminal gate is owner-or-admin only; the provision gate likewise. A team-to-workspace binding is therefore bookkeeping + UI today — it grants nothing. (No workspace_members / workspace_teams / access-control table exists anywhere; repo-wide grep found none.)
- **Net:** prior finding re-verified and holds — there is no way, in backend schema or any UI, to grant a workspace to multiple users or to a team. `workspace_kind`/ `owner_user_id` buy: per-user ownership + display semantics (§8.3b "my project workspace"/"company workspace", `HierarchySidebar.tsx:715–730`, `WorkspacesPage.tsx:744–747`) + the tenancy gates above. Enforced team access would require wiring the existing team_bindings rows into the workspace gates (or a members table) — none of that exists now.

---

## Appendix — verification commands run

`git status --short` (at audit start: 10 modified + untracked; at audit end: committed as b642993, only untracked remain), `git branch -a --list`, `git log --oneline -8 --format='%h %ad %s'`, `git show --stat e348871`, `git log --follow` on both nav files, `git log --oneline main..feat-app-panel`, `git log --oneline feat-app-panel..main`, `git merge-base main feat-app-panel`, `git rev-parse feat-app-panel main`, `git diff --stat main feat-app-panel`, `git show --stat 094e886/14d1012/bbf6b4e`, `git show e348871 -- docs/sprints/…`, `git log -S 'del.mutate' -- WorkspacesPage.tsx`, `git log -S "to: '/onboarding'"`, `git diff` (working tree), plus file reads of section-nav.ts, HierarchySidebar.tsx (full), WorkspaceTerminal.tsx (full), terminal.go (full), workspaces.go (full), WorkspacesPage.tsx (relevant ranges), team_bindings.go, AppPanelDrawer.tsx, API_DOCS.md greps. No file in /home/ji/projects/jimesh was modified.
