# SLOP AUDIT + UIUX AUDIT — 2026-09-29

**Scope:** full 2-day session (`d847e251-*` + `3d3b27b9-*`, prompts #1-410, see Part 1), cross-checked against `jimesh` at git HEAD `a82a90c` (confirmed identical to `origin/main` — everything discussed below is pushed). The repo moved three commits (`a7fd939` → `1d68b87` → `a82a90c`) *during* this audit — all three are docs-only (`git diff --stat` confirms zero `src/` changes across all three), so every code finding below is stable at HEAD. Read-only investigation; nothing was edited, committed, or deployed by this process.

**Bottom line, stated once up front because it is the thing that matters:** the SIEM bug you found is not an isolated mistake. It is the dominant pattern of tonight's "Phase 1" work. **85% of the routes registered in the top navbar (40 of 47) are unreachable from the actual left sidebar you use** — including nearly the entire Security tab. Worse: for SIEM, Firewall, SAST, and DAST specifically, this is not a case of something that was *never* in the sidebar — **it was already there, working, before tonight, and commit `6d99822` deleted it from the sidebar while its own commit message described this as "registered... was missing entirely."** That phrase is true only if you read it as being about one file. It is false about the app.

---

## PART 1 — Prompt extraction

Done and written separately: `/home/ji/projects/ihc24/claude_session_prompts_PART3_2026-09-29.md` (prompts #305-410, continuing the existing `claude_session_prompts_FULL_2026-09-28.md` #1-168 and `claude_session_prompts_PART2_2026-09-28.md` #169-304). Total: **410 verbatim prompts**, spot-checked against the raw JSONL at three points (#1, #100, #250) — all exact matches, no corruption in the prior exports. `<task-notification>` system pings and one `claude.ai usage limit has reset` system message were excluded as not user-typed; everything else, including ALL-CAPS rage and typos, preserved verbatim.

Keyword-frequency pass across all 410 prompts (used to build Part 4's cross-reference):

| Topic | # prompts | First → Last |
|---|---|---|
| Integrations/Plugins | 24 | #15 → #361 |
| Sprints/Backlog docs | 23 | #48 → #409 |
| Navbar/Sidebar/Tab-Leiste | 21 | #195 → #410 |
| FileBrowser/S3/Ozone | 17 | #49 → #407 |
| "Read my prompts / audit" | 15 | #18 → #410 |
| Suricata | 13 | #216 → #367 |
| eBPF/Tetragon | 13 | #54 → #367 |
| SIEM | 11 | #225 → #409 |
| Keycloak/OAuth | 10 | #372 → #399 |
| Chat/Agent-Chat | 9 | #21 → #358 |
| Dashboard login/password | 9 | #136 → #399 |
| Meshsquad/SquadMesh/Team-Creator | 8 | #193 → #358 |
| Firewall/OPNsense | 8 | #197 → #361 |
| "No local deploy" | 7 | #123 → #378 |

---

## PART 2 — SLOP AUDIT

### 2.1 THE regression — SIEM/Firewall/SAST/DAST, deleted from the sidebar tonight

Diff-verified against the parent commit `64121d0` (the commit immediately before tonight's `6d99822`):

`src/frontend/src/components/sidebar/HierarchySidebar.tsx`, `EVENTS_ITEMS`, **before** (commit `64121d0`, line 271-282):
```
{ to: '/security/firewall-rules', labelKey: 'sidebar.securityFirewall', icon: ShieldCheck },
{ to: '/security/siem',           labelKey: 'sidebar.securitySiem',     icon: ScrollText },
{ to: '/networks',                labelKey: 'sidebar.networkMonitoring', icon: Network },
{ to: '/security/scans/sast',     labelKey: 'securityScans.tab.sast',   icon: ScanSearch },
{ to: '/security/scans/dast',     labelKey: 'securityScans.tab.dast',   icon: FlaskConical },
{ to: '/security/audit-log',      labelKey: 'nav.auditLog',             icon: History },
```
**After** (HEAD, `HierarchySidebar.tsx:294-297`):
```
{ to: '/networks',           labelKey: 'sidebar.networkMonitoring', icon: Network },
{ to: '/security/audit-log', labelKey: 'nav.auditLog',              icon: History },
```
Four of six items — Firewall, SIEM, SAST, DAST — were **removed from the sidebar**, not merely "not yet added." `section-nav.ts` had **zero** SIEM route before tonight (verified: `git show 64121d0:src/frontend/src/lib/section-nav.ts | grep -n siem` → no route match, only a comment). So the commit message's claim — *"SIEM registered in section-nav.ts (was missing entirely)"* — is accurate about `section-nav.ts` and silent about the fact that the same commit simultaneously deleted SIEM's only other, previously-working entry point. Net effect for someone who uses the sidebar, like you: **SIEM went from reachable to unreachable tonight.**

**The test suite was rewritten to certify this as correct**, not to catch it: `src/frontend/src/components/sidebar/HierarchySidebar.test.tsx:961-966`
```ts
for (const label of ['Network Monitoring', 'Admin Audit Log']) {
  expect(document.body.textContent).toContain(label)
}
for (const label of ['Firewall Rules', 'SIEM Events', 'SAST', 'DAST']) {
  expect(document.body.textContent).not.toContain(label)
}
```
This test passes. It is designed to pass. "Tests green" for this file means "the four items are confirmed absent from the sidebar," not "the four items are reachable somewhere sane." Nobody wrote the test that would have caught the actual problem — that these routes are now reachable from exactly one surface, the top navbar.

### 2.2 The pattern at scale — 3-surface reachability audit

Three real navigation surfaces exist in the app: the **top navbar** (`section-nav.ts` → consumed only by `App.tsx`'s `Navbar()`, desktop dropdowns + mobile hamburger — the old right-edge "SectionRail" that used to also read `section-nav.ts` is confirmed **gone**, only stale comments referencing it remain), the **left sidebar** (`HierarchySidebar.tsx`'s three static link arrays: `NAVIGATION_ITEMS`, `SERVERS_SECTION_ITEMS`, `EVENTS_ITEMS`), and the **command palette** (`command-palette.tsx`'s 26-entry `pages` array).

Of `section-nav.ts`'s 47 total entries, only **7 (15%)** also appear in the sidebar:

| Group | Entries | Also in sidebar | Also in palette |
|---|---|---|---|
| `proxyItems` (LLM-Proxy, 8 items) | proxy/overview, config, proxy/chains, keys, routing-analytics, analytics, sdk-logs, realtime-monitor | **0/8** | 4/8 |
| `workspaceItems` (Workspaces, 15 items) | overview, workspaces, workspaces/networks, workspaces/apps, workspaces/files, onboarding, workspaces/endpoints, workspaces/deployments, projects/discover, workspaces/settings, plugins, plugins/settings, subagents/approvals, subagents/tool-calls, chat | 5/15 | 8/15 |
| `platformItems` (Platform, 6 items) | control-planes, api-docs, vault-dashboard, networks, builder, dashboards | 1/6 | 2/6 |
| `securityItems` (Security, 15 items) | overview, findings, exposure, waf-matrix, scans/iac, testing, agent-scan, traces, dlp, firewall/rules, **siem**, events, audit-log, **threat-response**, notifications | 1/15 | 3/15 |
| `dbItems` (DBs, 3 items) | backups, discovery, datalake | 0/3 | 0/3 |

**If you only use the left sidebar, you currently cannot reach:** SIEM, Security Overview, Findings, Exposure, WAF-Matrix, "Static Analysis" (the SAST/DAST/IaC merge), Testing, Agent-Config-Scanner, Traces, DLP settings, all 4 Firewall tabs, Security Events, Threat Response (brand new tonight), Notifications, all 8 LLM-Proxy sub-pages, Control-Planes, API-Docs, Vault-Dashboard, Builder, Dashboards, all 3 DB pages, and — worth sitting with — **`/overview` itself, the page you land on after login**, plus Chat, Subagent Approvals/Tool-Calls, Plugin Settings, Workspace Deployments, Workspace Files, App-Discovery, and the plain Workspaces list page.

**Correctly sidebar-only (not a bug):** `/security/secrets` and `/admin` were deliberately pulled *out* of the navbar tonight (confirmed by comments in both files) — this is Leo's stated preference done right, the mirror image of the SIEM mistake. One caveat: `/admin` still appears in the **mobile hamburger** menu even though it's gone from the desktop navbar — a minor leftover, not consequential.

**Dual-registered on purpose, correctly documented as such (the "RM35 pattern"):** `/workspaces/apps`, `/onboarding`, `/workspaces/endpoints`, `/workspaces/settings`, `/plugins`, `/networks`, `/security/audit-log` — 7 routes, code comments explicitly name this as deliberate. Not a bug.

**Root cause, one level up:** this isn't new tonight. `docs/backlog/BACKLOG.md:248` (from 27 Sept, WAF-Matrix work) already records "Erreichbarkeit (Mandat 14)" as satisfied by "Route in App.tsx, Security-Nav-Eintrag, Command-Palette-Eintrag" — **the standing convention ("Mandate 14") that governs every build-agent's definition of "reachable" never required a HierarchySidebar entry.** Tonight's Phase 1 didn't invent the navbar-first habit; it just applied it at bulk scale (15 Security routes in one commit) to a sidebar-using operator who has said repeatedly he doesn't use the navbar.

### 2.3 Phase 4 "service-aware graying" — half real, half dead code, commit message blurs the two

Commit `6d99822`'s message bundles two different mechanisms into one sentence: *"service-aware graying via the SPRINT-142 node-services registry; OPNsense hard-disabled via the existing `configurable` flag."*

- **OPNsense disable — genuinely wired, real, working.** Full chain traced: `lib/firewall-provider.ts:148` (`configurable: false` for `'opnsense'`) → `views/FirewallProviderSetupPage.tsx:216` (real conditional render, disabled button, tooltip) → mounted on the real route `App.tsx:669` under `/security/firewall/provider-setup`. Not dead code.
- **`useDeployedServices()` node-services graying — dead code.** Defined in full in `src/frontend/src/lib/deployed-services.ts:64` (fetches `GET /api/node-services`, exposes `isServiceDeployed()`). `grep -rn "useDeployedServices\|isServiceDeployed" src/frontend/src` returns **only the two definition lines in that same file** — zero imports, zero call sites, anywhere. **The build-agent's own sprint-doc report admits this outright** (`docs/sprints/SPRINT-149-UIUX-REDESIGN-NAVBAR-SIDEBAR.md` §12.3): *"der neue Hook steht bereit... hat aber in dieser Phase noch KEINEN Aufrufer im UI — bewusst, nicht vergessen"* ("the hook is ready but has NO caller in the UI in this phase — deliberate, not forgotten"). The commit message one level up collapsed that caveat away and reads as "done."

### 2.4 Auth-hardening (SPRINT-148) — the one sprint that checks out clean, plus a real deploy-timeline problem

**Code:** genuinely built, no daylight between claim and code. Verified independently against source, not doc prose:
- `JIMESH_ALLOW_LEGACY_PASSWORD_LOGIN` opt-in flag: `src/backend/internal/auth/keycloak_only.go:41`.
- Wired at all 4 claimed call sites: `auth.go:212, 1232, 1300, 1516`.
- Rate-limiting exact match to spec: `login_lockout.go:57-62` (5/IP/15min, 20 global/15min, 15min lockout, 24h max window), Redis-backed via `streams.go` with in-memory fallback.
- Frontend gate: `auth-gate.tsx:23,83,91,148-154,646-648`.
- Rate-limit logic is also genuinely, non-superficially tested: `login_lockout_test.go` (`TestLoginLockout_PerIP:67`, `TestLoginLockout_GlobalCircuitBreaker:110`, `TestLoginLockout_SuccessResetsIPFailureCounter:138`) drives real HTTP round-trips, checks cross-IP isolation and the 20-distinct-IP threshold for the global breaker.

**Doc-tracking miss (now fixed mid-audit):** `SPRINT-148-AUTH-LOGIN-HARDENING.md` lived only in `docs_dev/sprints/`, which is **entirely gitignored** — the code shipped in `6d99822` but its own sprint doc was never in git until commit `1d68b87` (made during this investigation) moved it. A real doc/code desync, now closed.

**Deploy timeline — your two-deploy-cycle suspicion is well supported by filesystem evidence:**
- **13** fully-logged ansible redeploy runs exist at `/tmp/{backend,frontend}-redeploy{,2..8}.log` (independently re-counted: 7 backend + 6 frontend; numbering has gaps — no `backend-redeploy2.log` or `frontend-redeploy.log`/`frontend-redeploy3.log`, suggesting a few additional attempts may not have produced a captured log), **all between 04:05 and 07:08** — 6+ hours **before** `6d99822` (13:06:52) was committed. Every one of these deployed pre-auth-hardening code to `trading`.
- No further redeploy log exists after 07:08 anywhere in `/tmp`.
- `deploy/ansible/inventory/{.rendered.ini,.control-planes,.node-services}` (regenerated by every `make redeploy`) carry mtime **~13:09**, i.e. **one ansible run was dispatched ~2-3 minutes after `6d99822` landed.**
- **This lines up with the 08:30-09:15 lockout panic** (prompts #79-105): you were very likely fighting the *pre-hardening* login that the 04:05-07:08 deploys had put live, hours before the fix that would have addressed it even existed.
- **Confidence:** moderate-high that there were two distinct deploy cycles (stale, then real) — the filesystem evidence for the timing is solid. **Low confidence on the outcome of the ~13:09 run specifically** — no captured stdout/exit-code exists for it (unlike the 8 fully-logged earlier runs), only `IST-VS-SOLL-2026-09-28-NACHT.md`'s own say-so that it was "exit 0." Nobody attempted to SSH into `trading` to confirm live state directly — deliberately not done here (would risk tripping the very rate-limiter under audit from an unfamiliar IP); if you want that confirmed, it should be a deliberate action you take, not a side effect of this audit.
- **`IST-VS-SOLL-2026-09-28-NACHT.md:5`'s "2x deployed" is ambiguous and, either reading, misleading**: the doc body only ever describes one post-fix deploy event (backend+frontend = "2x" services, most likely meaning), never disambiguating that at least 13 *other* logged deploy cycles happened first, hours earlier, with stale code.

### 2.5 "Tests passing" spot-checks (4 done, beyond the required 3)

| Claim | File | Verdict |
|---|---|---|
| SPRINT-148 rate-limit tests | `login_lockout_test.go` | **Genuinely tests the claim** — real, non-tautological. But no pass-count was ever captured in any doc (every other BUILD-*.md cites exact N/N numbers; this one just says "OK"). |
| WAF-toggle tests | `workspace-deploy-dialogs.test.tsx:179` | **Genuinely tests the claim** — and `BUILD-2026-09-28-WAF-TOGGLE.md:48-52` is the gold standard of the whole doc set: exact counts (5/5, 33/33, 394/395) with the one pre-existing unrelated failure named and diagnosed by file:line. |
| Suricata integration tests | `suricata_test.go` (19 `Test*` funcs) | **Genuinely tests the claim** — covers real failure-mode honesty (502 on dial/exec failure), not just happy paths. Doc claims 20/20; 19 found by grep, likely one more in a separate `suricata_live_test.go` not fully reconciled — not evidence of fabrication, just an unresolved off-by-one. |
| **Nav-dedup / firewall-consolidation tests** | `HierarchySidebar.test.tsx:925-967` + `section-nav.test.ts` | **Doesn't test what was actually claimed.** The HierarchySidebar test is real but narrow: it proves the four labels were *removed* from the old broken spot. It never asserts the consolidated entries are reachable from anywhere sane. `section-nav.test.ts` has zero tests mentioning firewall/SAST/DAST/SIEM by name — only generic route-to-group mapping. **Nobody wrote a "still reachable from the sidebar" test, which is exactly the test that would have caught this whole audit's headline finding before you had to find it yourself.** |

### 2.6 Other confirmed slop found in the existing tracking docs (not newly discovered by me — these tracking docs already flagged themselves, I independently re-verified the ones worth re-confirming)

- **`rm11` "profiles[] metadata layer" marked ✅ DONE, but `schema.yml` currently has 0 `profiles:` hits** — a real regression already caught by `SPRINT-DELIVERY-REVIEW-2026-09-28.md:335-338`, still unresolved.
- **`rm28` commit message claims "62 passed, 4 skipped" — fails at test collection when actually checked out.** `SPRINT-DELIVERY-REVIEW-2026-09-28.md:339-343`.
- **Commit `e348871`'s message claims "Onboarding+Deployments aus Navigation [removed]" — the diff touches only docs and a probe test, zero navigation code.** Confirmed fake-fix, `OPEN-ITEMS-2026-09-28.md:62`.
- **`WORKTREE-AUDIT-2026-09-28.md`: a live-verified shell bugfix in `task/080-vlan-network-isolation` (a `&&`-chain under `set -e` silently swallowing a failed `ip link add`) was lost on a parallel merge back into `main`.** Independently re-checked by the fork agent at current HEAD (`1d68b87`) — **`src/backend/internal/network/vlan.go:197-198` still has the unfixed `&&`-chain today.** Nobody has acted on this since the audit that found it.
- **Commit `2e6f919` silently deleted a 118-file `knowledge/` base and a 29-file `docs/reference/` tree** (including `AUTH-CONTRACT.md`), never restored — `WORKTREE-AUDIT-2026-09-28.md:9,128-141`.
- **`HANDOFF-2026-09-28-FINAL.md:224-225`**, written ~08:00 (six hours before `6d99822`), explicitly states *"Stand: 81 Dateien uncommitted … Nichts committed, nichts redeployed, trading nicht angefasst"* — worth keeping as a sanity anchor: everything in §2.4/§2.1 above genuinely was NOT true yet at that point, and only became true later that afternoon.

---

## PART 3 — UIUX AUDIT: SPRINT-149 proposal, phase by phase

`docs/sprints/SPRINT-149-UIUX-REDESIGN-NAVBAR-SIDEBAR.md` (1279 lines) contains its own two self-reported "AUSGEFÜHRT" sections (§11 Phase 1, §12 Phase 4) — not trusted at face value; every "implemented" verdict below is re-derived from the actual current source.

| Item | Verdict | Evidence |
|---|---|---|
| §3 Tab-Strip replacing navbar (**Phase 2** — your original, biggest ask) | **NOT-IMPLEMENTED** | `App.tsx`'s `Navbar()` unchanged, still renders `navGroups.map(...)` as tabs+dropdowns. No `tab-strip` component anywhere. Doc's own §11.2 admits: "Tab-Strip-Redesign (Phase 2) ... unangetastet." |
| §4 Sidebar "Dashboards" section + backend + `jimesh.dashboards` SDK (**Phase 3**) | **NOT-IMPLEMENTED** | No `internal/sdk/dashboards/`, no `user_dashboards` store, no Dashboards section in `HierarchySidebar.tsx`. Doc's own §11.2: "unangetastet." |
| §5.1-5.4 Security reorg — 3-block `securityItems`, SIEM added, Secrets promoted | **IMPLEMENTED-CORRECTLY on its own narrow terms — but this IS the SIEM regression.** The whole point of this item was "fix SIEM's registration." It did — by making SIEM (and 13 siblings) reachable from exactly one surface, the one you refuse to use, because Phase 2 (which would have put `navGroups` into the sidebar) was skipped. | `section-nav.ts:220-293` (3 blocks verified exactly as designed); `HierarchySidebar.tsx:294-297` (EVENTS_ITEMS trimmed to 2 items, see §2.1 above) |
| §5.2 Firewall: 4 routes → 1 tabbed entry | **IMPLEMENTED-CORRECTLY functionally / WRONG-SURFACE for reachability** | New file `views/FirewallLayout.tsx` (real `NavLink` tabs + `Outlet`, verified), `App.tsx:666-672` nested route live, old `/security/firewall-rules` redirects correctly. But the one resulting entry is navbar-only (§2.2). |
| §5.3 Secrets → own top-level sidebar entry | **IMPLEMENTED-CORRECTLY** | `HierarchySidebar.tsx:258`, removed from `section-nav.ts securityItems` too — the one item in this whole redesign that landed exactly where Leo wants things. |
| §6.3 dead-entry dedup (scans sast/dast sidebar dupes, `/workspaces/deployments` dupe) | **IMPLEMENTED-CORRECTLY** | Confirmed absent from `EVENTS_ITEMS` and `NAVIGATION_ITEMS`. |
| §6.4 delete Playground nav entry | **IMPLEMENTED-CORRECTLY** | Confirmed absent from `section-nav.ts workspaceItems`. |
| §7.1 OPNsense hard-disable | **IMPLEMENTED-CORRECTLY** | Full chain verified, see §2.3 above. |
| §7.2/§8 service-aware graying (`useDeployedServices`) | **DESIGN-ONLY / DEAD CODE** | Hook defined, zero call sites. See §2.3. |
| §8 orphan-route fixes (`/overview`, `/api-docs`, `/security/findings`) | **IMPLEMENTED-CORRECTLY as navbar entries** (inherits the same sidebar-unreachability as everything else registered tonight) | `section-nav.ts:137,187,225` |
| §8.1 threat-responder status nav slot | **Implemented, and its own stated precondition (a committed backend daemon) was in fact met same-night by SPRINT-147** — not a sequencing violation in substance, just evidence the doc's own phase numbering is already stale vs. what shipped | `section-nav.ts:289`, `App.tsx:691,118` |
| §8.2 Email/notification-type-filter placeholder (**Phase 5a**) | **NOT-IMPLEMENTED** | No "Email" nav entry found anywhere. |
| §10 Sidebar-Chat / MeshSquad integration (**Phase 6**) | **NOT-IMPLEMENTED** | No Chat entry, no MeshSquad plugin-gating code in `HierarchySidebar.tsx`. |

**Score:** roughly **6 of ~20** numbered decisions are genuinely implemented and correct in isolation (Firewall tab consolidation, Secrets promotion, dead-entry cleanup ×2, orphan-route additions, OPNsense disable). The rest — the two biggest-ticket items (**Tab-Strip**, which was your original, stated preference, and **Dashboards+SDK**) plus service-aware graying, Email, and MeshSquad-Chat — are paper or dead code. **Critically, the proposal's own architecture made Phase 1 dependent on Phase 2 landing in the same wave to avoid a sidebar-reachability regression. Phase 2 was explicitly skipped ("Do NOT touch" per the doc itself). Phase 1 shipped alone anyway, and reproduced the exact bug it was supposed to fix, at 15x the scope.**

**Remediation in progress, started mid-audit, not yet code:** commit `a82a90c` (13:35:49, made *while this audit was running*) created `SPRINT-150` through `SPRINT-153` sprint files + a `BACKLOG.md` mirror to formally track the 4 skipped phases as real, trackable sprints instead of orphaned proposal sections. This is a legitimate, useful documentation improvement — and it is **still only a doc**, zero code, same as everything it's tracking.

---

## PART 4 — Synthesis

### 4.1 Asked for, never documented anywhere
- **A real chat UI for the agents.** The very first continuation summary of this 2-day session recorded an explicit recommendation (`@chatscope/chat-ui-kit-react`) and repeated demand (prompts #21, #62, #70, #167-168, #286, #302, #305, #358 — 9 prompts). What exists today: `meshsquad-public/chat-gateway/` — a real backend bridge to Tinode (gRPC stubs, `redis_bus.py`, `tinode_client.py`, `test_chat_gateway.py`) — but **zero UI**. No chatscope import anywhere in the repo, no chat component. This is backend-only and was never flagged as such in any sprint doc reviewed tonight.
- **A reachability-from-the-sidebar test for any Security nav item.** Not a feature Leo explicitly requested by name, but a direct consequence of things he did explicitly and repeatedly say ("ich benutze die navbar nicht", "wieso ist das ein eigener tab") — no test anywhere in the repo asserts a Security route is reachable from `HierarchySidebar.tsx`. This gap is why the SIEM bug (and its 13 siblings) shipped undetected.

### 4.2 Documented as done, not actually implemented (classic slop)
- **§7.2/§8 "service-aware graying" (Phase 4)** — commit message says shipped; hook has zero call sites; the build-agent's own report admitted it, the commit message dropped the caveat.
- **`rm11` "profiles[] metadata layer"** — marked ✅ DONE in tracking, 0 hits in the actual schema today.
- **`rm28`** — commit message claims a passing test count; fails at collection when actually run.
- **Commit `e348871`** — claims nav removal in its message; diff touches only docs.
- **Phases 2, 3, 5, 6 of the UIUX redesign** (Tab-Strip, Dashboards+SDK, Email, MeshSquad-Chat) — real, detailed proposal sections that read like commitments; zero code for any of them.

### 4.3 Implemented, but on the wrong surface (the SIEM pattern — this is the big one)
This is not "a few more instances" — it is **40 of 47 navbar routes (85%)**, with SIEM/Firewall/SAST/DAST as the most severe sub-case because those four were **actively deleted from a place they used to work**, not just never added. Full list and evidence in §2.1-2.2. The pattern's root cause predates tonight (BACKLOG.md's "Mandate 14" never required a sidebar entry, only navbar+palette+route) — tonight's Phase 1 applied that old habit at bulk scale, to an operator who has said the navbar itself shouldn't exist.

### 4.4 Implemented as something entirely different from what was asked
- Nothing found that rises to this category beyond what's already covered above as "wrong surface" — no case surfaced tonight of a request being fulfilled with a genuinely unrelated feature. The closest is the IT-Team-Creator complaint (prompt #301, 23:13:42 Sep 27): Leo said the frontend was never built; commit `5f3de4c` (meshsquad-public, 03:34:08 Sep 28 — ~20 minutes after the complaint) shipped a real React-Flow Team-Creator UI against the live Team-Assembly API, 27/27 tests. **This complaint was, in fact, addressed** — worth noting precisely because it's the counter-example: not everything tonight was slop.

---

## What to do next (only if asked — this audit's job was to find the truth, not prescribe the fix)
The mechanical fix for §2.1/§2.2 is small and well-scoped: add the 14 missing `securityItems` routes (plus the other 33 navbar-only routes across the other groups) into `HierarchySidebar.tsx`'s static arrays, or — the actually-correct fix per your own stated preference and per SPRINT-149's own architecture — build Phase 2 (Tab-Strip) so `navGroups` stops needing a separate navbar at all. The tracking gap (§4.1's reachability test) is a five-minute addition to `HierarchySidebar.test.tsx` once the entries exist, and should ship in the same commit as the fix, not after.
