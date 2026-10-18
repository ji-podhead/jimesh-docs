# SIDEBAR REGRESSION FIX — 2026-09-29

**Status: staged, unstaged in the working tree, NOT committed, NOT pushed, NOT deployed.**
Repo: `/home/ji/projects/jimesh`, base commit `a82a90c` (HEAD, clean except this fix + 3 untracked build artifacts unrelated to this change: `src/backend/datalaked`, `src/backend/threat-responder`, `src/frontend/scripts/__pycache__/`).

Files touched — exactly 2, nothing else:
- `src/frontend/src/components/sidebar/HierarchySidebar.tsx`
- `src/frontend/src/components/sidebar/HierarchySidebar.test.tsx`

`src/frontend/src/lib/deployed-services.ts` (the "service-aware graying" hook) was deliberately **left untouched**. It is confirmed dead code (defined, zero call sites, exactly as the audit found), but wiring it into the newly-restored entries is a separate, non-trivial feature decision (which of ~40 routes map to which `node-services` registry service name is not 1:1 — most of these routes are platform/security/config pages with no per-node "deployed service" concept at all) and out of scope for a pure reachability fix. Not done here, on purpose.

---

## 1. What commit `6d99822` actually did (verified via `git show`)

`git show 6d99822 -- .../HierarchySidebar.tsx` confirms the audit's finding exactly:

- `EVENTS_ITEMS` (the "Events & Observability" sidebar section) went from 6 entries to 2. Removed: `Firewall Rules` (`/security/firewall-rules`), `SIEM Events` (`/security/siem`), `SAST` (`/security/scans/sast`), `DAST` (`/security/scans/dast`). Kept: `Network Monitoring` (`/networks`), `Admin Audit Log` (`/security/audit-log`).
- The SAST/DAST removal was a **legitimate** consolidation (SPRINT-149 §6.3 — those two flat links duplicated `SecurityScansLayout`'s own tab bar; the merged "Static Analysis" entry already existed in `section-nav.ts`).
- The Firewall Rules and SIEM Events removal was **not** a consolidation — nothing replaced them in the sidebar. `section-nav.ts` gained a SIEM entry for the first time that same commit, and a new consolidated `/security/firewall/rules` entry — but both only feed the **top navbar**, a surface the operator has repeatedly said he does not use.
- `git show 6d99822 -- .../HierarchySidebar.test.tsx` confirms the test file was rewritten in the same commit to assert `Firewall Rules`, `SIEM Events`, `SAST`, `DAST` are **absent** from `document.body.textContent` — i.e., the test suite was made to certify the regression as correct, not catch it.

Cross-checked against `lib/section-nav.ts` and `App.tsx`: all 47 `section-nav.ts` routes are real, routed pages (`App.tsx` route registrations exist for every one, confirmed by direct read of the route table) — none of this is speculative or fake-route cleanup. The audit's "40 of 47 unreachable" figure is accurate.

## 2. The fix

Kept `EVENTS_ITEMS` as the audit found it (`/networks`, `/security/audit-log`) rather than restoring Firewall/SIEM to that exact array — SPRINT-149's Security reorg (grouping SIEM, Firewall, and the rest of Security into one registry) was itself a legitimate design improvement; the bug was that the *sidebar* copy of that registry was never built, not that the reorg was wrong. So the fix mirrors `lib/section-nav.ts`'s own group structure into 5 new/extended sidebar sections instead of undoing the reorg:

| New/extended sidebar section | Source group in `section-nav.ts` | Routes added |
|---|---|---|
| `NAVIGATION_ITEMS` (existing, unchanged) | — | — |
| `WORKSPACES_MORE_ITEMS` (new, collapsible) | `workspaceItems` (10 of 15 not already in `NAVIGATION_ITEMS`/`SERVERS_SECTION_ITEMS`) | `/overview`, `/workspaces`, `/workspaces/networks`, `/workspaces/files`, `/workspaces/deployments`, `/projects/discover`, `/plugins/settings`, `/subagents/approvals`, `/subagents/tool-calls`, `/chat` |
| `PLATFORM_ITEMS` (new, collapsible) | `platformItems` (5 of 6 — `/networks` stays covered by `EVENTS_ITEMS`) | `/control-planes`, `/api-docs`, `/vault-dashboard`, `/builder`, `/dashboards` |
| `SECURITY_ITEMS` (new, collapsible) | `securityItems` (all 15, verbatim) | `/security/overview`, `/security/findings`, `/security/exposure`, `/security/waf-matrix`, `/security/scans/iac` (Static Analysis), `/security/testing`, `/security/agent-scan`, `/security/traces`, `/security/dlp`, `/security/firewall/rules` (the consolidated 4-tab firewall shell), `/security/siem`, `/security/events`, `/security/audit-log` (dual-registered, RM35 pattern — also in `EVENTS_ITEMS`), `/security/threat-response`, `/notifications` |
| `DB_ITEMS` (new, collapsible) | `dbItems` (all 3, verbatim) | `/dbs/backups`, `/dbs/discovery`, `/dbs/datalake` |
| `PROXY_ITEMS` (new, collapsible) | `proxyItems` (all 8, verbatim) | `/proxy/overview`, `/config`, `/proxy/chains`, `/keys`, `/routing-analytics`, `/analytics`, `/sdk-logs`, `/realtime-monitor` |

All 5 new sections use the same `SectionHeader`/`renderSectionLinks` pattern the existing "Events & Observability" section already uses, default collapsed (same reasoning: "more" drawers, not primary nav), persisted through the existing `jimesh.sidebar-collapsed` localStorage key (`SectionName` type and `DEFAULT_COLLAPSED`/`loadCollapsed` extended, backward-compatible with old stored state — new keys default to collapsed via the same `!== false` pattern the existing `servers`/`events` keys use).

Every new entry reuses the **exact same `labelKey`** `section-nav.ts` already uses for that route. All of these keys were already present and fully translated across all 60 locales (verified by direct lookup in `en.json` before writing any code) — **zero new i18n keys were added**, so `check-i18n.mjs` (which only validates locale-file parity, not source-code key coverage) needed no changes and passes unmodified.

## 3. Full restored-route list (all 40 routes the audit flagged as sidebar-unreachable)

Verified one-by-one against the audit's own list in `SLOP-AND-UIUX-AUDIT-2026-09-29.md` §2.2 — every route is accounted for:

**Workspaces (10, → `WORKSPACES_MORE_ITEMS`):** `/overview`, `/workspaces`, `/workspaces/networks`, `/workspaces/files`, `/workspaces/deployments`, `/projects/discover`, `/plugins/settings`, `/subagents/approvals`, `/subagents/tool-calls`, `/chat`

**Platform (5, → `PLATFORM_ITEMS`):** `/control-planes`, `/api-docs`, `/vault-dashboard`, `/builder`, `/dashboards`

**Security (14, → `SECURITY_ITEMS`; `/security/audit-log` was already reachable, not counted twice):** `/security/overview`, `/security/findings`, `/security/exposure`, `/security/waf-matrix`, `/security/scans/iac` (Static Analysis — SAST+DAST+IaC merged), `/security/testing`, `/security/agent-scan`, `/security/traces`, `/security/dlp`, `/security/firewall/rules` (+ its 3 sibling tabs: provider-setup, traffic, opnsense — one entry, `FirewallLayout` renders the tab bar), `/security/siem`, `/security/events`, `/security/threat-response`, `/notifications`

**DBs (3, → `DB_ITEMS`):** `/dbs/backups`, `/dbs/discovery`, `/dbs/datalake`

**LLM-Proxy (8, → `PROXY_ITEMS`):** `/proxy/overview`, `/config`, `/proxy/chains`, `/keys`, `/routing-analytics`, `/analytics`, `/sdk-logs`, `/realtime-monitor`

**Total: 10 + 5 + 14 + 3 + 8 = 40.** Matches the audit's count exactly.

## 4. Test suite fix

- The existing "Events & Observability ... expand shows the 2 remaining links" test's comment was rewritten to stop implying Firewall/SIEM don't exist anywhere — it now explains they were legitimately regression-fixed into the new Security section, and that test itself only asserts `EVENTS_ITEMS`' own (smaller, intentional) contents.
- Added a new `describe('HierarchySidebar reachability (regression fix 2026-09-29)')` block with:
  - 5 targeted tests, one per new section, each expanding the section and asserting its real labels render (values pulled from actual `en.json`, not guessed — caught and fixed 5 label-text mistakes during writing: `sidebar.securityFirewall` renders `"Firewall"` not `"Firewall Rules"`, `nav.securityTesting` renders `"Testing / Demo"`, `nav.wafMatrix` renders `"WAF-Matrix"`, `nav.securityFindings` renders `"Findings"`, `nav.keys` renders `"Providers"`, `nav.sdkLogs` renders `"Logs"`, `nav.llmProxy` renders `"LLM Proxy"` with a space not a dash).
  - **A structural regression guard**: imports `navGroups` from `lib/section-nav.ts` directly, expands every collapsible sidebar section, and asserts every single route's translated label text is present somewhere in the rendered sidebar DOM. One documented exception (`/networks` — legitimately dual-registered under a different, more descriptive label, `"Network Monitoring"` vs. the navbar's bare `"Networks"`; route is the same, label text differs on purpose). This test reads `lib/section-nav.ts` and `HierarchySidebar.tsx` independently and will fail if a future change ever again adds a route to `section-nav.ts` without a matching sidebar entry — the exact bug class `6d99822` introduced.

## 5. Verification evidence

- `npx tsc -p tsconfig.app.json --noEmit`: **499 errors before and after** the change (byte-identical count) — all pre-existing, unrelated baseline noise (confirmed by running `tsc` against `git stash`-ed HEAD too). Zero new errors, zero errors in either touched file.
- `npx vitest run` (full suite, not just the sidebar file): **48/48 test files, 425/425 tests passing**, run twice in a row for stability. (One run mid-session showed 3 unrelated files — `WorkspaceSwitcher.test.tsx`, `FileBrowser.test.tsx`, `WorkspaceTerminal.test.tsx` — timing out; reproduced this is pre-existing full-suite parallel-load flakiness, **not** caused by this change: those 3 files pass individually both with and without the fix applied, and the *baseline* (`git stash`, fix removed) full-suite run also showed intermittent variance before settling; two consecutive full runs with the fix applied were both 100% green.)
- `HierarchySidebar.test.tsx` alone: **42/42 passing** (36 pre-existing + 6 new).
- `node scripts/check-i18n.mjs`: **passed for 60 locales and 3191 keys**, unchanged — no locale files were touched, since every reused `labelKey` was already present in all 60 locale files before this change.
- `npx eslint` on both touched files: clean, no warnings.
- Manually cross-checked all 40 routes from the audit's §2.2 list against the new `WORKSPACES_MORE_ITEMS`/`PLATFORM_ITEMS`/`SECURITY_ITEMS`/`DB_ITEMS`/`PROXY_ITEMS` arrays one by one (§3 above) — all 40 accounted for, none missed, none duplicated across arrays in a way that isn't the pre-existing, deliberate RM35 dual-registration pattern.
- Manually cross-checked every route in `lib/section-nav.ts`'s `navGroups` against `App.tsx`'s route table to confirm all 47 are real, currently-routed pages before restoring sidebar entries for them (not blind-restoring anything fake or dead).

## 6. Scope discipline

This diff touches only the 2 files listed at the top. No sprint docs, no backend, no other frontend files, no `deployed-services.ts` wiring, nothing bundled in. Not committed, not pushed, not deployed — left in the working tree for the operator/coordinator to review given the trust broken by `6d99822`'s own commit message not matching its diff.
