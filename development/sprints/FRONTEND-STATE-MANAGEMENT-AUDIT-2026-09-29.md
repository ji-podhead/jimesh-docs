# Frontend State Management Audit — jimesh/src/frontend

Date: 2026-09-29
Scope: `/home/ji/projects/jimesh/src/frontend` (read-only investigation, no files touched)
Trigger: project-delete bug — deleting a project navigates away from the detail page (looks "fixed") but `HierarchySidebar`'s own project list stays stale until manual reload.

---

## 1. What state management actually exists

**package.json dependencies** (`/home/ji/projects/jimesh/src/frontend/package.json`):

```
"@tanstack/react-query": "^5.97.0"
```

No other state library is present. Confirmed absent from both `dependencies` and `devDependencies`, and absent from the entire `src/` tree (grep for imports, not just package.json):

- `redux` / `@reduxjs/toolkit` — not present
- `zustand` — not present
- `jotai` — not present
- `recoil` — not present
- `valtio` — not present
- `swr` — not present
- `mobx` — not present

Grep results, repo-wide:

```
grep -rn "createStore\|configureStore\|useSelector\|useDispatch" src/   → 0 hits
grep -rn "from 'zustand'" src/                                          → 0 hits
grep -rn "from 'jotai'\|from 'recoil'"  src/                            → 0 hits
```

**React Context usage** — exactly 3 `createContext(` call sites in the whole app:

| File | Purpose |
|---|---|
| `src/theme-context.ts:11` | `ThemeContext` — light/dark/system UI preference only |
| `src/i18n/context.ts:9` | `I18nContext` — locale + translation function only |
| `src/lib/store.tsx:58` | `SSOTContext` — **this is the app-data one** |

Theme and i18n are not cross-cutting *application* state (no server data), so they're out of scope for "is there centralized app state." `src/lib/store.tsx` is the real candidate.

### `src/lib/store.tsx` — the "SSOT" store

This file literally calls itself SSOT (Single Source of Truth) — `SSOTContext`, `SSOTProvider`, `useSSOTStore()`. It is **not** an independent store implementation. It is a thin `Context` wrapper composing **six `useQuery()` calls** from react-query (targets, workspaces, projects, apps, firewallRules, siemEvents — `src/lib/store.tsx:61-99`) into one combined object, exposed via `useSSOTStore()` (`src/lib/store.tsx:146`).

Mounted once at the app root: `src/App.tsx:518` (`<SSOTProvider>`), unmounted at `src/App.tsx:802`.

**Consumers of `useSSOTStore()`** (17 call sites, `grep -rn "useSSOTStore(" src/`):
`src/components/overview/ScopeSelectorModal.tsx`, `src/components/sidebar/HierarchySidebar.tsx`, `src/components/rbac/team-bindings-panel.tsx`, `src/components/overview/BreadcrumbBar.tsx`, `src/components/apps/AppPanelDrawer.tsx`, `src/components/apps/ActiveAppsDropdown.tsx`, `src/views/SIEMEventsPage.tsx`, `src/views/ProjectSecretsPage.tsx`, `src/views/OverviewPage.tsx`, `src/views/ProjectDetailPage.tsx`, `src/views/SSHTargetDetailPage.tsx`, `src/views/WorkspaceDetailPage.tsx`, `src/views/FilesPage.tsx`, `src/views/AppDetailPage.tsx`, `src/views/DeploymentDetailPage.tsx`.

This is a legitimate, common pattern (react-query as cache, Context as an ergonomic facade over several related queries) — **but its correctness is entirely dependent on every consumer and every mutation using the same react-query cache keys as the SSOT queries do.** That dependency is where the bug lives (see §3).

---

## 2. Is react-query the primary data layer, consistently?

Grep counts across `src/views` + `src/components` (229 `.tsx` files):

```
useQuery(< or (          → 254 call sites, in 108/229 files
useMutation(< or (       → 139 call sites
invalidateQueries(       → 208 call sites
```

React-query is overwhelmingly the dominant, default data-fetching mechanism — used in just under half the files, with hundreds of call sites. This is not a codebase where most components independently `useState`+`fetch`.

**Genuine bypasses found** (raw `useState`+`useEffect`+`apiFetch`, no react-query at all, for the project/workspace/deployment domain specifically):

- `src/views/SecurityExposurePage.tsx:252-256` — `SecurityHierarchySelector` component fetches `/api/projects` into local `useState<ProjectRow[]>` on mount (`useEffect(() => { apiFetch(...).then(setProjects) }, [])`), never revalidated by any mutation anywhere else in the app. This is the **only live, reachable component** that bypasses react-query entirely for this domain.
- `src/views/ProjectsPage.tsx:210-301` — same raw-fetch-into-`useState` pattern (`const [projects, setProjects] = useState<Project[]>([])`, loaded via `apiFetch('/api/projects')` in a bare `useEffect(..., [])`, mutated locally via `setProjects(prev => ...)` on every create/delete/deploy). **This file is dead code** — confirmed by `src/App.tsx:40-41`: *"SPRINT-140 PART 2 cleanup: the ProjectsPage import was dead (the /projects route redirects to /workspaces since TASK-053; SSOT plan flagged it)."* Not routed, not reachable, not part of the live bug — but it is a preserved artifact of exactly the "ad hoc local state per page" pattern the operator suspected, and it still contains its own independent `DELETE /api/projects/:id` handler (`ProjectsPage.tsx:633`) that nothing points to anymore. Worth deleting so nobody greps it as a reference pattern.

Everything else that touches "projects"/"workspaces"/"deployments" data goes through `useQuery`/`useMutation`. **Verdict for this section: react-query is the real, consistently-adopted data layer. The problem is not "missing react-query," it's what §3 and §4 describe.**

---

## 3. Root cause of the reported bug — resolved definitively

**This is not "sidebar uses local state, detail page uses react-query."** Tracing `HierarchySidebar.tsx` directly:

- `src/components/sidebar/HierarchySidebar.tsx:57` imports `useSSOTStore`
- `src/components/sidebar/HierarchySidebar.tsx:757` — `const { projects, workspaces, apps, targets, siemEvents, loading } = useSSOTStore()`
- `src/components/sidebar/HierarchySidebar.tsx:989` — `const sortedProjects = useMemo(() => [...projects].sort(...), [projects])`

`sortedProjects` is just a **sorted derivation of react-query data** — it is not a separate fetch. The sidebar *is* on react-query, via the SSOT store. (Whatever was observed "earlier tonight" characterizing it as non-react-query was either an earlier code state or a mischaracterization of what `useMemo` does — as of this read, the sidebar consumes `useSSOTStore()` like everything else.)

**The actual root cause is a query-key mismatch**, not a missing-react-query problem:

1. `src/lib/query-keys.ts:16` — the central registry (added under `TASK-086`, per its own header comment: *"Ensures consistent query keys across all views and prevents cache collision, orphaned background polling, and memory leaks"*) defines:
   ```
   projectsList: ['projects-list'] as const,
   ```
2. `src/lib/store.tsx:78` — the SSOT store's projects query uses exactly this key: `queryKey: queryKeys.projectsList`. This is the cache entry `HierarchySidebar` reads from.
3. `src/views/ProjectDetailPage.tsx:190-193` — the **live** delete mutation's `onSuccess`:
   ```
   toast.success(t('projects.deleteRowRemoved', { name: proj.name }))
   void queryClient.invalidateQueries({ queryKey: ['projects'] })
   void queryClient.invalidateQueries({ queryKey: ['projects-summary'] })
   navigate('/workspaces')
   ```
   It invalidates the string literal `['projects']` and `['projects-summary']` — **neither of which is `['projects-list']`.** `queryKeys.projectsList` is never invalidated. The SSOT cache (and therefore the sidebar) is left holding the pre-delete list until its 30s `staleTime` (`src/lib/store.tsx:80`) lapses or the app remounts — which is exactly the "need to reload the page" symptom reported.

   The detail page *looks* correct after delete only because `onSuccess` also calls `navigate('/workspaces')` — the user is redirected away before they'd notice the SSOT-backed views (which `ProjectDetailPage.tsx:140` itself also reads via `useSSOTStore()`) are equally stale.

4. **This is a known, previously-patched bug class, just not patched here.** Three other mutation sites in the same codebase already invalidate *both* keys together, proving engineers have hit and fixed this exact issue before, ad hoc, per-feature:
   - `src/components/projects/NewProjectDialog.tsx:149-150` (create): `invalidateQueries({queryKey:['projects']})` **and** `invalidateQueries({queryKey: queryKeys.projectsList})`
   - `src/components/plugins/ActiveDeploymentsSection.tsx:780-781` (undeploy): same dual-invalidate
   - `src/views/AppDiscoveryPage.tsx:80-81`: same dual-invalidate (plus `project-deployments`)

   So: **create is fixed, undeploy-from-ActiveDeploymentsSection is fixed, discovery is fixed — delete (`ProjectDetailPage.tsx:192-193`) and the deploy-to-control-plane flow (`src/views/ControlPlanesPage.tsx:344`, which invalidates only `['projects']`, not `projectsList`) are not.** This is inconsistency between near-identical mutations, not an architectural gap.

### Does this pattern repeat beyond delete? Yes — checked create/rename/undeploy:

- **Create** (`NewProjectDialog.tsx:149-150`) — correct, dual-invalidates.
- **Delete** (`ProjectDetailPage.tsx:192-193`) — **broken**, the reported bug.
- **Rename** — no `PATCH /api/projects/:id` endpoint exists in the frontend at all (`grep -rn "PATCH.*projects" src/` → 0 hits); projects apparently cannot be renamed from the UI, so there's no rename flow to check.
- **Undeploy** (`WorkspaceDeleteButton.tsx:87`, workspace-level) — invalidates `['workspaces']` only, but for workspaces (unlike projects) that literal **is** the SSOT key (`queryKeys.workspaces = ['workspaces']`, `src/lib/query-keys.ts:19`) — so this one is actually fine, by coincidence (see §4).
- **Deploy-to-control-plane** (`ControlPlanesPage.tsx:344`) — invalidates `['projects']` only, same gap class as delete, currently un-patched.

---

## 4. Scale — how systemic is this?

### `/api/projects` list: 7 distinct cache identities, 23 live call sites

| Cache key | Call sites | Count |
|---|---|---|
| `queryKeys.projectsList` (`['projects-list']`) | `src/lib/store.tsx:78` (SSOT), `src/views/WafMatrixPage.tsx:292`, `src/views/FirewallRulesPage.tsx:442` | 3 |
| `['projects']` (literal) | `src/views/ControlPlanesPage.tsx:167`, `src/views/WorkspaceAppsPage.tsx:78`, `src/views/WorkspaceSettingsPage.tsx:81`, `src/views/SecurityOverviewPage.tsx:175`, `src/views/WorkspaceDeploymentsPage.tsx:88`, `src/views/WorkspaceDetailPage.tsx:98`, `src/views/NetworkEditingPage.tsx:89`, `src/views/VaultDashboardPage.tsx:165`, `src/views/WorkspacesPage.tsx:173`, `src/components/plugins/PluginInstallWizardDialog.tsx:102`, `src/components/workspaces/BrowserRuntimeModal.tsx:198`, `src/components/plugins/ActiveDeploymentsSection.tsx:677` | 12 |
| `['projects-summary']` | `src/views/AdminBudgetsPage.tsx:88`, `src/views/AdminUsersPage.tsx:149`, `src/views/ConsumerKeysPage.tsx:109`, `src/components/admin/budgets-section.tsx:67` | 4 |
| `['builder-projects']` | `src/components/builder/DeployedProjectsCard.tsx:29` | 1 |
| `['security-findings-page-projects']` | `src/views/SecurityFindingsPage.tsx:125` | 1 |
| `['projects', 'scope']` | `src/hooks/use-scope-label.ts:70` | 1 |
| No react-query (raw `useState`) | `src/views/SecurityExposurePage.tsx:252-256` | 1 |

**23 independent call sites, 7 non-identical cache identities, all fetching the conceptually identical `GET /api/projects` resource.** Only `queryKeys.projectsList` and `WorkspaceDeleteButton`-style literals that happen to match get reliably invalidated together; the rest depend on whichever mutation's author remembered to hit their particular key.

### `/api/workspaces` list: less fragmented, mostly self-healing by coincidence

`src/lib/query-keys.ts:19` — `workspaces: ['workspaces'] as const`. Unlike projects, this literal is the **same string** most call sites already use directly (`src/views/WorkspacesPage.tsx:275/382/426`, `src/components/workspaces/WorkspaceDeleteButton.tsx:87`, `src/components/workspaces/workspace-deploy-dialogs.tsx:218` all invalidate plain `['workspaces']`, which is identical to `queryKeys.workspaces`). So workspace mutations mostly *do* correctly bust the SSOT/sidebar cache — this is why the operator's bug is specific to **projects**, not workspaces: the projects key got renamed to `'projects-list'` under the TASK-086 registry migration while the majority of call sites were never migrated off the old literal; the workspaces key was never renamed, so the accidental consistency held.

Still, workspaces has its own smaller spread: `['workspaces', projectFilter]` (`WorkspacesPage.tsx:198`), `['workspaces','']` (`WorkspaceSettingsPage.tsx:74`, `WorkspaceAppsPage.tsx:71`, `NetworkEditingPage.tsx:98`, `use-scope-label.ts:39`), `['workspaces','all']` (`WorkspaceSwitcher.tsx:67`), `['security-overview-workspaces']` (`SecurityOverviewPage.tsx:168`) — 6 more variants, none of them currently causing a reported bug, but the same latent risk if any single-key invalidation misses a filtered variant.

### `/api/deployments` list: 4 distinct cache identities

`queryKeys.deployments` (`['deployments-ssot']`, SSOT store), `queryKeys.allDeployments` (`['all-deployments']`, `ActiveDeploymentsSection.tsx:661` — **this one is deliberate and documented**, see `src/lib/query-keys.ts:24-31`: the comment explicitly explains it's a separate key because it caches the raw un-mapped payload vs. the SSOT's `App[]`-shaped one), `['builder-deployments']` (`DeployedProjectsCard.tsx:37`), `['builder-running-apps']` (`RunningAppsCard.tsx:22`). Lower stakes than projects — none of these feed the sidebar — but the Builder page's two cards can disagree with the Integrations page's Active Deployments panel after any deploy/undeploy until each independently remounts or its own interval refetch fires.

### Overall scale verdict

This is **not** "state management is fragmented across ad-hoc `useState`" as a broad, pervasive pattern — only 1 live component (`SecurityExposurePage.tsx`) genuinely bypasses react-query for this domain, plus 1 unreachable dead-code file. React-query is used in 108/229 files with 254 `useQuery` and 208 `invalidateQueries` call sites.

It **is** a real, moderately systemic problem within one specific failure mode: **query-key governance**. A central registry (`lib/query-keys.ts`, TASK-086) exists and is well-designed, but adoption is partial — only 3 of 23 `/api/projects`-fetching call sites actually import `queryKeys.projectsList`; the other 20 hardcode 6 different inline string literals. Cache correctness in react-query is entirely a function of key identity, so every one of those 20 call sites is a separate cache entry that can silently drift from the SSOT store's view — and 3 different engineers have already had to independently rediscover and dual-invalidate this exact issue (create, undeploy, discovery), while 2 more spots (delete, deploy-to-control-plane) still have the gap.

---

## 5. Honest assessment

- **React-query as the primary server-state layer: correctly adopted, not the problem.** It's a legitimate alternative to Redux for this use case, and it's used consistently as the dominant mechanism (254 call sites, 108/229 files). Not having Redux/Zustand/Jotai is not itself a deficiency.
- **The `SSOTContext`/`useSSOTStore` layer is a reasonable centralizing facade** over 6 related queries, consumed in 17 places — this is the closest thing to "centralized state" in the app and it works as designed *when* mutations invalidate the same keys it reads.
- **The actual defect is narrow and mechanical: inconsistent query-key literals for the same resource, primarily `/api/projects` (7 spellings, 23 sites) and secondarily `/api/deployments` (4 spellings) and `/api/workspaces` (7 spellings, currently harmless by coincidence).** This is a **fixable consistency/governance bug**, not an architectural absence of state management. It is real, it has already bitten the team multiple times (3 independent ad hoc fixes exist), and it currently has at least 2 known live gaps (project delete, deploy-to-control-plane) beyond the one just reported.
- One genuinely uncached component exists (`SecurityExposurePage.tsx`'s `SecurityHierarchySelector`) and one dead-code relic of the pre-SSOT pattern exists (`ProjectsPage.tsx`, confirmed unreachable since TASK-053).

**Bottom line: react-query is the real single source of truth almost everywhere, with a handful of concrete, locatable gaps — this is fixable in an afternoon, not a rearchitecture.**

---

## 6. Concrete recommendation, ranked by impact

1. **Fix `ProjectDetailPage.tsx:192-193`** (the reported bug) — add `void queryClient.invalidateQueries({ queryKey: queryKeys.projectsList })` alongside the existing `['projects']`/`['projects-summary']` invalidations in the delete `onSuccess`. Same fix needed at **`ControlPlanesPage.tsx:344`** (deploy-to-control-plane success handler — currently only invalidates `['projects']`).
2. **Consolidate the 12 plain-`['projects']` call sites** (`ControlPlanesPage.tsx:167`, `WorkspaceAppsPage.tsx:78`, `WorkspaceSettingsPage.tsx:81`, `SecurityOverviewPage.tsx:175`, `WorkspaceDeploymentsPage.tsx:88`, `WorkspaceDetailPage.tsx:98`, `NetworkEditingPage.tsx:89`, `VaultDashboardPage.tsx:165`, `WorkspacesPage.tsx:173`, `PluginInstallWizardDialog.tsx:102`, `BrowserRuntimeModal.tsx:198`, `ActiveDeploymentsSection.tsx:677`) onto `queryKeys.projectsList`, and the 4 `['projects-summary']` sites (`AdminBudgetsPage.tsx:88`, `AdminUsersPage.tsx:149`, `ConsumerKeysPage.tsx:109`, `budgets-section.tsx:67`) either onto the same key (if the summary shape can be derived from the full list) or explicitly document why they need a separate cache, the way `queryKeys.allDeployments` already does — this is the highest-impact single change since it's the same resource fetched from 16+ places.
3. **Fix or remove `SecurityExposurePage.tsx:252-256`** — the one live component with zero cache coupling; it will keep offering a deleted project as a selectable option in its dropdown indefinitely (no remount, no revalidation trigger exists).
4. **Delete the dead `src/views/ProjectsPage.tsx`** — unreachable since TASK-053 per `App.tsx:40-41`, but it still models the exact "independent local `useState` array, drifts from everything else" anti-pattern and could get copy-pasted as a reference by mistake.
5. **Process fix**: add a lint rule or PR-checklist line requiring `queryKeys.*` imports instead of inline array-literal query keys for any resource already registered in `lib/query-keys.ts`. Three separate engineers have already had to rediscover this exact bug class by hand (create, undeploy, discovery flows) — a lint rule removes the recurring tax instead of relying on the next person noticing.
