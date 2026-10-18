# Post-Commit Verification — 2026-09-29

Repo verified: `/home/ji/projects/jimesh` (HEAD `ba45381c`), read-only. Cross-checked
against `/home/ji/projects/meshsquad-public` (HEAD `a227579`) where relevant.
Method: for every claim, the actual current source was read and traced end-to-end
(not the commit message, not the sprint doc prose) — file:line evidence below.
Where I could execute a real check (tsc, vitest, i18n, `next build`), I ran it
myself against the current tree, not against quoted numbers.

**Environment limitation, stated up front**: this sandbox has no `go` binary and
a docker-based `go build`/`go vet`/`go test` run could not complete — package
download alone exceeded 10+ minutes without finishing (see §7). I could **not**
independently execute the backend test suite or confirm `go build` exits 0.
Every backend claim below is verified by **reading the actual .go source**
(handler wiring, registration, store logic, test assertions) rather than by
running it. That is weaker than execution but still real verification, not
message-trusting.

---

## 1. SPRINT-156 Project-Navigation

**Verdict: CONFIRMED WORKING**, including both self-reported open items.

- Sidebar name-row click: `src/frontend/src/components/sidebar/HierarchySidebar.tsx:1599-1601`
  ```
  onClick={() => navigate('/projects/' + project.id)}
  ```
  and the honest, always-visible `[↗ Open project]` action at `:1631-1639`
  (same navigate target). The old hover-only `[⚙ Settings]` mislabel is gone
  from the **project** row.
- Route registration is real: `src/frontend/src/App.tsx:589`
  `<Route path="/projects/:projectId" element={<ProjectDetailPage />} />`,
  legacy route kept at `:767` (`/workspaces/projects/:projectId`, same element).
- `ProjectDetailPage.tsx` does not crash on an unknown/malformed project: it
  checks `if (!project) return null` for a sub-component (`:114`) and the page
  itself renders an honest "Project Not Found" empty state at `:331-345`
  rather than throwing.
- **S156-8 ("Server-Rows [⚙]-Pattern still open") — accurately reported.**
  Confirmed at `HierarchySidebar.tsx:1554-1564`: the **server** row (not
  project row) still uses the old hover-only, opacity-0 `[⚙ Settings]`
  pattern that was fixed for projects. The commit's own "still open" note is
  correct, not understated or overstated.
- **S156-9 ("ProjectDetailPage IaC-Tab Mock-Daten Mandat-2-Verstoß") —
  accurately reported, and real.** `ProjectDetailPage.tsx:703`:
  ```
  <span>{file.sizeBytes ? `${file.sizeBytes} B` : '1.2 KB'}</span>
  ```
  When the backend doesn't supply a real `sizeBytes`, the UI silently shows a
  **fabricated fixed value "1.2 KB"** instead of an honest "unknown" — a
  genuine, if narrow (one field, one fallback branch), Mandate-2 violation.
  This is the only such fabricated-value instance in the file (grepped for
  `Math.random`/`mock`/`fake`/other hardcoded units — none found elsewhere).

Both flagged gaps are real and neither oversold nor downplayed.

---

## 2. SPRINT-157 Sidebar-IA-Reorg

**Verdict: CONFIRMED WORKING** — the 6d99822 failure mode (navbar-only
registration, sidebar left stale) did **not** recur.

- `src/frontend/src/lib/section-nav.ts:293-341` (`firewallItems`, 11 entries)
  and `:353-367` (`observabilityItems`, 7 entries) define the new split.
- `HierarchySidebar.tsx:432-444` (`FIREWALL_ITEMS`) and `:499-507`
  (`OBSERVABILITY_ITEMS`) were diffed entry-by-entry against section-nav.ts's
  lists — **identical routes, same order, same count** in both files.
- Both are actually rendered, not just defined: `HierarchySidebar.tsx:1891`
  (`renderSectionLinks(FIREWALL_ITEMS)`) and `:1930`
  (`renderSectionLinks(OBSERVABILITY_ITEMS)`), inside sections that are only
  collapsed by default, never hidden.

No dual-registration drift this time.

---

## 3. SPRINT-153 Chat-Space "KOMPLETT"

**Verdict: CONFIRMED WORKING** for what's built — but "KOMPLETT" overstates
reachability. This is the most honestly self-documented feature in the batch.

- `meshsquad-public/server.py` (HEAD `a227579`) genuinely has **no**
  `/chat/channels` routes — only `/teams`, `/teams/{name}`,
  `/teams/{name}/activate` (grepped the full file, lines 42-51, 420-509). The
  commit's own admission ("meshsquad-public server.py hat die
  Chat-Space-Endpunkte noch nicht") is accurate as of this HEAD.
- The jimesh-side UI degrades honestly instead of crashing or faking data:
  `lib/meshsquad-chat.ts:180-193` (`MeshSquadApiError.endpointMissing` on
  404/405) feeds `MeshSquadChatSpacePage.tsx:184-199`, which renders a
  dashed-border "not deployed yet" card with a retry button — never invented
  channel rows.
- The sidebar entry's disabled state is verified against the real backend
  registry, not assumed: `gateway/plugins.go:68` literally has
  `"meshsquad": {}` (empty route list) → `installable=false` in every real
  `GET /api/plugins` response, which is exactly what
  `MeshSquadChatEntry.tsx:30-38`'s "honest caveat" comment claims.
- **Additional finding, not previously flagged**: `MeshSquadChatGateSection.tsx`
  (the deploy-dialog chat gate) is itself real and correct, but its own
  header comment (`:27-43`) discloses it is **currently unreachable in the
  live UI** because `'meshsquad'` is not in `workspace-deploy-dialogs.tsx`'s
  `FRAMEWORKS` list — confirmed at `workspace-deploy-dialogs.tsx:92-100`
  (7 frameworks, no `meshsquad`). So even once the backend endpoints exist,
  a user cannot reach this gate from the deploy dialog today without a
  separate change. This is disclosed in the code, not hidden — but it means
  "KOMPLETT" describes the jimesh-side code surface, not an end-to-end
  usable feature.

---

## 4. SPRINT-154 Protected-Projects

**Verdict: PARTIALLY TRUE, WITH CAVEATS.** The delete-guard mechanism itself
is real and correctly wired; but the sprint's own final commit contains a
genuine commit-message/diff-content contradiction — the exact bug class Leo
flagged, though not a functional regression in the end.

**The guard is real:**
- Registration: `deploy/deploy.go:70` — `mux.HandleFunc("/api/projects/{id}", h.handleProjectDelete)`.
- `deploy/projects_ssh.go:3152-3192` (`handleProjectDelete`): loads the real
  row, and **before** the reference-count survey, checks
  `if projRow.IsInternal` → writes a real `409 Conflict` with
  `error.type: "project_internal"` and a message naming the exact unmark
  route.
- Defense in depth in the store layer too: `store.go:1977-1984`
  (`DeleteProject`) re-checks `is_internal` and returns `ErrProjectInternal`
  independently of the handler.
- PATCH route: `gateway.go:292` —
  `mux.HandleFunc("PATCH /api/projects/{id}/internal", s.handleProjectInternalToggle)`.
- Migration + seed: `store.go:317-323` adds the `is_internal` column and
  seeds `platform-internal` to `is_internal=1` — **confirmed present in the
  current tree**, contrary to what the newest commit's own doc addition
  claims (see below).
- Real test with real assertions (not just "tests exist"):
  `internal/deploy/project_internal_delete_test.go` —
  `TestProjectDeleteInternalRefused409` asserts: 409 status, `error.type ==
  "project_internal"`, the row **survives** (still readable, flag still
  true), the store layer independently refuses with `ErrProjectInternal`,
  and — critically — that **unmarking the flag and retrying succeeds with
  200 and the row is actually gone**. This is a genuine end-to-end guard
  test, not a mock. **I could not execute it** (no reachable Postgres, no
  `go` binary in this sandbox) — the DB-backed cases skip honestly when
  Postgres is unreachable, same as the project's own stated pattern.
- Minor, self-disclosed debt: `store.go:1965`'s comment still says "honest
  403" while the code returns 409 — a stale comment, already flagged in the
  sprint doc's own gap list, cosmetic only.

**The real problem — commit `ba45381c` contradicts its own diff:**
Commit message: *"bestätigt dass PATCH-Route + Seed bereits angewandt und
live sind"* ("confirms PATCH route + seed are **already applied and live**").
The diff it introduces (`docs/sprints/SPRINT-154-PROTECTED-INTERNAL-PROJECTS.md`,
added lines) says the **opposite**:
> "**Noch offen (nur Operator):** die gateway.go-Registrierungszeile + die
> store.go-Seed-Zeile aus dem Abschnitt oben anwenden ... — bis dahin ist die
> PATCH-Route nicht live und platform-internal ungeschützt."

("Still open (operator only): apply the gateway.go line + store.go seed
line ... until then the PATCH route is not live and platform-internal is
unprotected.")

Root cause, reconstructed from git log order: this paragraph documents a
verification pass done against tree state `b0a9e7d3` (**before** `fbf8e26c`
actually applied those two lines). `fbf8e26c` then applied them
two commits before `ba45381c`. So by the time `ba45381c` was committed, the
"still open" finding was **already stale** — but it got committed anyway,
under a summary line claiming the opposite of its own content. **Net
practical effect: zero** — I independently confirmed the gateway.go line and
store.go seed line both exist in current HEAD (§4 above) — but this is a
textbook instance of exactly the pattern that burned trust with `6d99822`:
message says one thing, the artifact being committed says another. The
difference from `6d99822` is that here the *underlying functionality* is
fine; what's broken is the documentation's own internal consistency, and an
operator reading only the commit message (as instructed) would be
factually right by accident, not because the process caught the
contradiction.

---

## 5. Ozone S3 fix (`40e9c443`)

**Verdict: CONFIRMED WORKING (code-correct), NOT verified against a real
deploy — and the project's own docs say so.**

Full diff read (not `--stat`). `deploy/backend/ansible-task.yml` actual added
lines:
```
-e "OZONE_S3_ENDPOINT={{ backend_ozone_s3_endpoint }}"
-e "OZONE_S3_REGION={{ backend_ozone_s3_region }}"
-e "OZONE_S3_BUCKET={{ backend_ozone_s3_bucket }}"
-e "OZONE_S3_ACCESS_KEY_ID={{ backend_ozone_s3_access_key_id }}"
-e "OZONE_S3_SECRET_ACCESS_KEY={{ backend_ozone_s3_secret_access_key }}"
-e "OZONE_S3_ACCESS_KEY={{ backend_ozone_s3_access_key_id }}"
-e "OZONE_S3_SECRET_KEY={{ backend_ozone_s3_secret_access_key }}"
```
Cross-checked against what the Go code actually reads:
`internal/objectstore/client.go:54-70` and `internal/gateway/files.go:233-241`
both read `OZONE_S3_ACCESS_KEY` / `OZONE_S3_SECRET_KEY` (not the `_ID`/
`_ACCESS_KEY` suffixed names). The ansible task passes **both** naming
variants, so the variant the code actually consumes is genuinely populated.
This is correct, not just plausible-looking.

`deploy/ozone/docker-compose.yml` diff adds
`OZONE-SITE.XML_hdds.scm.safemode.min.datanode: "1"` — a real, documented
single-node Ozone setting (matches the stated SCM safe-mode problem).

**Not live-verified — disclosed honestly in the project's own docs**, not
hidden: `docs/sprints/BUILD-2026-09-28-OZONE-FILEBROWSER.md:59`:
> "Nicht gelaufen (ehrlich): Live-Smoke am gestarteten Stack ... NICHT
> möglich" (Not run, honestly: live smoke test on the started stack was
> not possible).

So: reasoned correctly from the code, never claimed to be deploy-verified,
and the docs are upfront about that. This is the pattern working as it
should — an honest "not tested live" next to a claim, not a false "done."

---

## 6. General sweep (commit-message vs. diff mismatches)

Read in full (not `--stat`): `40e9c443`, `cbcc9429`'s `App.tsx` and
`HierarchySidebar.tsx` hunks, `ba45381c`. Stat-scanned all others for
suspicious deletion/insertion ratios.

**Found:**
1. **`ba45381c`** — see §4. The one real, direct message-vs-diff
   contradiction found in this batch.
2. **`69312bc4`** ("Beide Varianten committet ... von gateway.go
   importiert") is **imprecise but not a bug**: `gateway.go` only imports
   `internal/sdkdashboards` (confirmed at `gateway.go:37,67,216,455`) — it
   never imports `internal/sdk/dashboards`. That second package is an
   **external client SDK** (agents/scripts calling `/api/sdk/dashboards`
   over HTTP), deliberately mirroring the already-existing, equally-unimported
   `internal/sdk/secrets` — grepped, confirmed neither `sdk/secrets` nor
   `sdk/dashboards` is imported anywhere in `src/backend`, by design (same
   pattern, not new). The commit's wording makes it sound like both
   variants feed `gateway.go`; only one does. No functional problem, just
   loose phrasing.
3. **`cbcc9429`**'s 492 deletions (renaming `SECURITY_ITEMS`/`EVENTS_ITEMS`
   → `FIREWALL_ITEMS`/`OBSERVABILITY_ITEMS`) were checked line-by-line — every
   deleted export has a live 1:1 replacement, confirmed rendered (§2). This
   is **not** a repeat of the `6d99822` stealth-deletion pattern.
4. No other commit in the reviewed set showed a deletion unmentioned in its
   message, or a "complete" claim sitting next to a stub/TODO that
   contradicts it — aside from the S156-9 mock-data instance already
   self-reported in §1.

**Found outside the 8 commits, but directly relevant to current usability**
(see §7 for how this was found): a live, confirmed **runtime crash** — not
from any of these 8 commits, pre-existing — at
`src/frontend/src/views/OpnsenseFirewallConfigPage.tsx:13,340`: imports
`Sync` from `lucide-react`, which this version of the package does not
export. Both `tsc` (`TS2305: Module "lucide-react" has no exported member
'Sync'`) and `next build` (`Attempted import error: 'Sync' is not exported`)
confirm this independently, and the import is a **value** import (not
`import type`), rendered unconditionally inside the "Sync" tab
(`<Sync className="size-4 text-primary" />` at line 340) — so any user who
opens Firewall → OPNsense config → the Sync tab gets a hard React crash
("Element type is invalid... got: undefined"), not a degraded state. This
predates the reviewed batch but is live in HEAD right now.

---

## 7. Current live TypeScript/test state (self-executed against HEAD, not quoted)

Ran directly, in this sandbox, against `ba45381c`:

- **`npx tsc -p tsconfig.app.json --noEmit`**: **472 errors**, exit code 2.
  This matches the "tsc 472=Baseline" / "tsc 472" figures quoted in
  `ae1e3f3c` and `f6241c4f` almost exactly (`ba45381c`'s own doc range was
  473–477, also consistent). **Not fabricated numbers.**
  Breakdown by error code (472 total): `TS2345` argument-type mismatch 229,
  `TS6133` unused var/import (harmless) 75, `TS2339` property doesn't exist
  59, `TS18046` implicit-`unknown` 56, `TS2307` cannot-find-module 12,
  `TS7006` implicit `any` 10, `TS2322` type-not-assignable 9, rest smaller.
  Only 75/472 (16%) are the harmless "unused" category — the remaining 84%
  are real type mismatches, most concentrated in
  `chain-mesh-graph.tsx` (108), `ProjectDetailPage.tsx` (57, pre-existing —
  last touched by `f6241c4f`, **not** introduced by the SPRINT-156 nav
  commit `ae1e3f3c`, confirmed via `git log --follow`), `ProxyChainsPage.tsx`
  (47), `SubagentApprovalQueuePage.tsx` (44), `FallbackPage.tsx` (32).
  The `TS2307` cluster (12 files, e.g. `KeysPage.tsx:7`,
  `components/keys/*.tsx`) traces to `import type { ... } from
  '.../shared/types'` — **that module genuinely does not exist anywhere in
  the repo** (confirmed by `find`). Because every one of these is a
  type-only import, it's erased at build time — a real, pre-existing type-
  coverage hole in the whole Keys/LLM-Proxy area, but not a runtime crash
  (unlike the `Sync` icon case above, which **is** a value import and
  **does** crash).
- **`npx vitest run`**: **460/460 passed**, 56/56 test files, 8.65s.
  Matches `ae1e3f3c`'s "Full Suite 460/460 PASS" exactly.
- **`node scripts/check-i18n.mjs`**: `i18n validation passed for 60 locales
  and 3288 keys` — matches the quoted "check:i18n PASS 60/3288" exactly.
- **`npx next build`**: succeeds (exit 0), but with the `Sync` import
  warning above surviving into the production bundle — `next build` does
  not fail the build on an unresolved barrel-optimized icon import, it just
  warns and leaves `Sync` as `undefined` at runtime.
- **Backend `go build`/`go vet`/`go test`: could NOT be executed.** No `go`
  binary in this sandbox; a `docker run golang:latest go build ./internal/...
  ./cmd/...` was attempted twice (once via `run_in_background`, once via a
  persistent container with a cached module dir) and both times the
  dependency download alone did not finish inside the time available
  (60+ modules still downloading after 10+ minutes — this environment's
  network to the Go module proxy is slow/throttled). **I cannot confirm or
  deny the "go build/vet OK" / "go test PASS" numbers quoted in every one of
  these 8 commit messages** — this is a real gap in this verification, not
  a finding about the code. Everything backend-related in §1–§6 above was
  verified by reading the actual `.go` source and tracing the call paths by
  hand, which is reliable for the specific mechanisms checked, but is not
  the same as a green test run.

---

## Honest summary

Leo's specific worry — "does a commit message describe something different
or worse than what the diff does" — is **mostly not what happened** in this
batch of 8 commits. SPRINT-156, -157, -153 and the Ozone fix all hold up
under direct code tracing: the navigation, the sidebar reorg, the honest
chat-space degrade, and the S3 env passthrough all do what they say, and two
of them (§1, §5) even self-report their own gaps accurately rather than
hiding them. `6d99822`'s specific failure mode — a commit that deletes real
functionality while claiming to relocate it — did **not** recur here; every
deletion I traced in this batch has a confirmed, live replacement. The 460
passing frontend tests, 472 tsc errors, and 60/3288 i18n pass are all real,
current numbers I reproduced myself, not numbers copied from a commit
message.

There is exactly one genuine instance of the pattern Leo is afraid of: commit
`ba45381c`'s message claims the SPRINT-154 PATCH route and DB seed are
"already applied and live," while the diff it adds says the opposite ("still
open, not live until the operator applies these two lines"). In this
specific case the underlying code turned out to be fine on inspection — the
lines really are in `gateway.go`/`store.go` today — but that's because I went
and checked by hand, not because the commit's own message was trustworthy on
its face. That is the exact erosion of trust Leo is reacting to, even though
this one didn't cost anything in the end.

**On the broader question — "ist das wirklich benutzbare Software, oder nur
ein Haufen Slop wo nix funktioniert":** neither extreme is accurate.

This is not "nichts funktioniert." The pieces reviewed here are real,
non-trivial, end-to-end wired features: a working project-detail route with
a graceful not-found state, a sidebar/navbar reorg that stayed in sync
across both registries, a protected-delete guard with a real 409 contract
and a test that actually asserts the unmark-then-delete path, and an
env-passthrough fix that matches the exact variable names the Go code reads.
None of that is slop — it's careful, defensively-written code with an
unusual amount of self-documented honesty about its own limits (Mandate 2
discipline shows up everywhere: empty states instead of fake data, disabled
buttons with real reasons instead of dead buttons).

But it is also not a finished, hand-off-ready product a stranger could sit
down and use without hitting rough edges. Concretely, right now, in this
exact tree: a real user who opens Security → Firewall → OPNsense → the Sync
tab gets a hard crash, today, unrelated to anything in these 8 commits — it's
just sitting there. 472 TypeScript errors is not a cosmetic number; the
majority are genuine type mismatches (not merely unused imports), including
a whole cluster of Keys/LLM-Proxy pages type-checking against a module that
does not exist in the repository at all. SPRINT-153's chat feature is
UI-complete but has **no live path to actually use it** yet — the backend
doesn't serve the endpoints, and even once it does, the deploy dialog that's
supposed to gate a MeshSquad deployment doesn't have `meshsquad` as a
selectable framework, so the gate can't currently be reached in normal use.
And I could not confirm the backend even builds cleanly in this pass — every
commit message's "go build/vet OK" is unverified by me, for lack of a
working Go toolchain in this sandbox, which is itself worth noting: that
claim has been repeated in 8 consecutive commit messages and nobody outside
the agent that wrote each one has been independently re-checking it.

So: this is a large, mostly-honest, partially-working system with real
functioning slices and real live breakage sitting right next to each other —
closer to "a serious work-in-progress with good bones and known holes" than
either "finished" or "all slop." Leo's "da ist noch lange nix fertig" is the
more defensible of the two positions if the bar is "ready to hand to a real
user today" — it is not, and the Firewall/Sync crash alone proves that. But
"nix funktioniert" would be overstating it in the other direction: the
specific 8 commits under review here do, for the most part, function exactly
as claimed.
