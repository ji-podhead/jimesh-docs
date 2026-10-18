# BUILD 2026-09-28 — Onboarding-Navigation in die Servers-Sektion

**Operator demand (repeated):** *"was ist onboarding, wieso ist das ein
eigener tab und nicht bei servers mit drinne???"*

**Scope:** navigation-only. The `/onboarding` route, OnboardingPage and the
command-palette entry (`p-onboarding`) are untouched. "Deployments" is
explicitly left alone (SPRINT-139 consolidation territory, separate analysis).
**Nothing committed** — working tree only.

---

## 1. Ground truth (code, not commit messages)

Commit `e348871` ("Operator-Layout — Onboarding+Deployments aus Navigation …")
claims Onboarding+Deployments were removed from navigation. **Trust only the
code**: that commit touched ONLY `docs/sprints/SPRINT-139-WORKSPACE-LIFECYCLE.md`,
`docs/sprints/SPRINT-RM35-SOC2-ADMIN-AUDIT-LOG.md` and
`src/frontend/src/components/sidebar/__probe.test.tsx` (3 files, 206
insertions, 0 source changes). Before this change the code still had:

- `HierarchySidebar.tsx:241` — `{ to: '/onboarding', labelKey: 'nav.onboarding', icon: ListChecks }`
  as the **FIRST flat link of the sidebar's "Navigation" section** (the "eigener
  Tab" the operator saw), with no grouping to the servers area at all.
- `section-nav.ts` — **NO onboarding entry anywhere** (the top-navbar model
  never carried it; its groups were Workspaces / Platform / Security / DBs /
  LLM-Proxy).
- In-section hooks that already navigated to `/onboarding` (all kept, untouched):
  the ALL-SSH-TARGETS empty-state "Register server" button (~line 1319), the
  zero-projects "Start onboarding" button (~line 1356), the scope-popover
  "Register server" action (~line 1456).
- Command palette `p-onboarding` (command-palette.tsx:139) — kept working.

## 2. Where "the Servers section" IS in each registry

- **Sidebar (`HierarchySidebar.tsx`)**: the first tree section, internally keyed
  `servers` (`SectionName 'servers'`), labeled "ALL SSH TARGETS"
  (`scopeSelector.groupSshTargets` = "SSH targets"). It renders the server tree
  (Server → Workspaces → Apps).
- **Top-navbar model (`lib/section-nav.ts`)**: there is no standalone "Servers"
  group — the **"Servers" entry is `/workspaces/endpoints`
  (`nav.sshEndpoints` = "Servers")** and it lives in the **Workspaces group**
  (`workspaceItems`). That group is the servers area of this registry.

## 3. BEFORE / AFTER nav structure

### 3.1 Sidebar (`src/frontend/src/components/sidebar/HierarchySidebar.tsx`)

| Section (top→bottom)                     | BEFORE (28.9., pre-change)                                                                 | AFTER (this change)                                                                                              |
| ---------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| B — "ALL SSH TARGETS" (`servers`, tree) | Server tree only; empty state has a "Register server" button → /onboarding (unlabeled as onboarding) | Server tree **+ flat "Onboarding" page link below the tree** (renders expanded-only, in empty AND non-empty states; the empty-state "Register server" CTA stays) |
| C — "PROJECTS" (tree)                    | Project tree; zero-projects empty state has "Start onboarding" → /onboarding                | unchanged                                                                                                         |
| D — "Navigation" (flat links)            | **7 links: Onboarding (1st!), Integrations, Apps, Plugins, Deployments, Servers, Settings** | **6 links: Integrations, Apps, Plugins, Deployments, Servers, Settings** (Onboarding moved to section B)         |
| E — "Events & Observability" (collapsed) | 6 links (Firewall, SIEM, Network Monitoring, SAST, DAST, Admin Audit Log)                   | unchanged                                                                                                         |
| A — Scope bar (bottom, popover)          | "Register server" action → /onboarding                                                      | unchanged                                                                                                         |

### 3.2 Top-navbar model (`src/frontend/src/lib/section-nav.ts`) — consumed by App.tsx tabs + dropdowns

| Group (tab order) | BEFORE                                              | AFTER                                                                                                            |
| ----------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Workspaces        | …, Apps, **Servers** (/workspaces/endpoints), Deployments, App Discovery, Settings, then legacy block (Playground/Integrations/Plugins/…) | …, Apps, **Onboarding, Servers**, Deployments, App Discovery, Settings, then legacy block — Onboarding sits **directly adjacent to the Servers entry** |
| Platform          | Control Planes, Vault, Networks, Dashboard Builder, Dashboards | unchanged                                                                                                        |
| Security          | Overview, Exposure, WAF-Matrix, Firewall×3, Secrets, Events, Audit Log, Scans, Testing, Agent-Scan, Traces, Notifications, DLP | unchanged                                                                                                        |
| DBs               | Backups, Discovery, Datalake                        | unchanged                                                                                                        |
| LLM-Proxy         | Proxy Overview, Config, Chains, Providers, Routing Analytics, Analytics, Logs, Realtime Monitor | unchanged                                                                                                        |
| Section membership (`PROJECT_BASES`) | `/onboarding` in NO group (nav-tab dark while on the wizard) | `/onboarding` added to `PROJECT_BASES` — the Workspaces tab lights up while the wizard is open (same membership rule as `/notifications` → Security) |

### 3.3 Other entry points — all unchanged

| Entry point                          | Status                                                                |
| ------------------------------------ | --------------------------------------------------------------------- |
| Route `/onboarding` (App.tsx:763 → OnboardingPage) | untouched                                                             |
| Command palette `p-onboarding` (command-palette.tsx:139) | untouched, still routes to `/onboarding`                             |
| Sidebar empty states / scope popover (~1319 / ~1356 / ~1456) | untouched (they keep navigating to /onboarding)                       |
| "Deployments" entries (sidebar Navigation + `workspaceItems`) | untouched (SPRINT-139 consolidation is a separate analysis)           |
| i18n keys                            | none added by the nav change — `nav.onboarding` already existed in all 60 locales |

## 4. Dual registration (the RM35 pattern, mirrored)

RM35 registered `/security/audit-log` twice on the operator's demand:
(1) `section-nav.ts` securityItems, (2) the sidebar's Events & Observability
section. Onboarding now follows the same pattern:

1. **First registration** — `section-nav.ts` `workspaceItems`: `/onboarding`
   directly next to the "Servers" entry (`/workspaces/endpoints`).
2. **Second registration** — `HierarchySidebar.tsx` ALL-SSH-TARGETS section:
   `SERVERS_SECTION_ITEMS` rendered via the same `renderSectionLinks`
   anatomy as the other sidebar link sections.

## 5. Files changed (working tree, NOT committed)

| File                                                    | Change                                                                                                   |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `src/frontend/src/lib/section-nav.ts`                  | `ListChecks` import; `/onboarding` in `PROJECT_BASES`; `/onboarding` entry in `workspaceItems` before the Servers entry (with comments) |
| `src/frontend/src/components/sidebar/HierarchySidebar.tsx` | Onboarding removed from `NAVIGATION_ITEMS` (7→6); new `SERVERS_SECTION_ITEMS`; servers section renders it as a flat link below the tree; comments updated |
| `src/frontend/src/components/sidebar/HierarchySidebar.test.tsx` | 3 tests updated: Navigation list no longer expects Onboarding (asserts absence while collapsed); wizard test now expands the SSH-targets section, proves the entry sits INSIDE the servers block (DOM order) and navigates to `/onboarding`; zero-servers empty state also asserts the named Onboarding link |
| `src/frontend/src/lib/section-nav.test.ts`             | `activeSectionFor('/onboarding')` → `nav.workspaces`; new adjacency test (Onboarding next to Servers entry) |
| 58 locale JSON files (`am.json` … `zh-TW.json`)     | i18n parity backfill ONLY (see §6.2) — 4 keys each, EN-fallback copies via the repo-standard script `scripts/backfill-i18n.mjs` (never overwrites existing translations). The 4 keys themselves (`workspaces.deleteLabel/deleteNote/deleteDenied`, `wsDeployments.deleteWorkspaceNote`) belong to a PARALLEL agent's workspace-delete feature (added to en.json/de.json in the working tree); `de.json`/`en.json` were NOT touched by me. |

Not touched (by instruction): WorkspacesPage.tsx, ProjectDetailPage.tsx,
PluginCatalogPage.tsx, .go files, the /onboarding route, command-palette.tsx,
Deployments entries. **Note:** `docs/sprints/` + `BACKLOG.md` were NOT updated
(the build's file scope was restricted) — the sprint/backlog mirror of this
change still needs to land per the documentation mandate.

## 6. Verification (exact commands, honest results — final readings 04:38–04:41)

### 6.1 The task's three gates

| Check (from `src/frontend/`)                        | Before            | After (final tree)             |
| ---------------------------------------------------- | ----------------- | ------------------------------ |
| `npx vitest run src/components/sidebar/ src/lib/section-nav.test.ts` | sidebar 41/41, section-nav 4/4 | **46/46 passed, 4 files** (36 HierarchySidebar + 4 WorkspaceSwitcher + 1 probe + 5 section-nav), exit 0 |
| `npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -c 'error TS'` | 477 (baseline)    | **474 — ≤ 477 gate PASSES**; 0 errors in the 4 touched source/test files |
| `npm run check:i18n`                               | PASS (60 locales / 3014 keys) | **PASS (60 locales / 3058 keys), exit 0** |

On the tsc number: the working tree is a moving target — parallel agents are
actively editing source files (PluginCatalogPage.tsx, PluginActivationCard,
PluginInstallWizardDialog, WorkspaceSettingsPage.tsx, NetworksPage,
suricata-ids-panel, ProjectDetailPage.tsx — all modified 04:20–04:38, none of
them mine). Interim readings fluctuated 477 → 479 → 474; every error in the
list lives in files I never touched, and my 4 files contribute exactly 0
errors, so the nav change cannot have worsened the count.

### 6.2 The i18n backfill episode (why 58 locale files changed)

At re-verification time `check:i18n` was FAILING (true exit 1) with 58 errors:
`workspaces.deleteLabel, workspaces.deleteNote, workspaces.deleteDenied,
wsDeployments.deleteWorkspaceNote` missing from 58 locales. **Not caused by
this change** (it adds zero i18n keys): the keys came from a parallel agent's
workspace-delete feature, added to en.json/de.json in the working tree
(mtime 04:09) without the standard backfill. Resolution — the repo's own
documented standard (the SPRINT-138 i18n script names it: "the 58 remaining
locales get the EN fallback via scripts/backfill-i18n.mjs (the S55/S135 repo
standard)"; the script's header: "copies any key missing from a locale
straight out of en.json … Existing translations are never overwritten"):

```
$ node scripts/backfill-i18n.mjs
am.json: backfilled 4 keys  …  zh-TW.json: backfilled 4 keys
done — 232 keys backfilled across 59 locales

$ npm run check:i18n
i18n validation passed for 60 locales and 3018 keys   (later: 3058 keys, parallel agents still adding)
TRUE_EXIT=0
```

Verified sample: `yo`/`vi` carry the EN fallback ("Delete workspace"), `de`
keeps its curated German value ("Workspace löschen") — untouched by me.

### 6.3 Full-suite extra (not a task gate)

`npx vitest run` (full suite) → **365/366 passed, 37/38 files** at 04:01. The
1 failure is PRE-EXISTING and unrelated: `src/components/rbac/create-access-section.test.ts`
(TASK-072 source-pinned contract vs WorkspacesPage.tsx, expects
`pendingAccessRef.current = {` at line 118). **Proven unrelated three ways**:
the test reads only create-access-section.tsx / ProjectsPage.tsx /
WorkspacesPage.tsx / en.json / de.json (disjoint from all 4 changed files);
WorkspacesPage.tsx is byte-identical to HEAD; and with this change stashed the
test fails IDENTICALLY (1 failed | 11 passed in its file).

## 7. Reachability proof (Mandate 14 — named click paths)

- Sidebar: **"ALL SSH TARGETS" section (expand) → "Onboarding" row → /onboarding**
  — present in the empty AND non-empty servers state.
- Top navbar: **"Workspaces" tab → chevron dropdown → "Onboarding"** (sits
  directly above "Servers"); the Workspaces tab lights up while on `/onboarding`.
- Command palette: **Ctrl/⌘K → "Onboarding" (p-onboarding)**.
- Sidebar empty states: zero servers → "Register server"; zero projects →
  "Start onboarding" (both pre-existing, unchanged).
