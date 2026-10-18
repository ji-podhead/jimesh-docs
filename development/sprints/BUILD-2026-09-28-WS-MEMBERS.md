# BUILD 2026-09-28 — WORKSPACE-MEMBERS (operator demand, 28.9.: "warum kann mein teamlevel workspace das team oder die user nicht auswaehlen die dazu zugriff haben sollen?")

## 1. Ground truth confirmed

The verifier was right and this build confirms it against code: workspaces carry a single
`owner_user_id` (+ workspace_kind user|shared); `team_bindings` rows CAN name resourceType
'workspace' (store ValidTeamBindingResourceType) but NO access path reads them — bookkeeping
only. No members table, no multi-user grant UI. This build ships the honest v1: REAL grant rows,
REAL routes, a member-aware workspace gate, and the Members card on the surface that owns
workspace configuration.

## 2. What shipped (all NEW files except one in-scope gate file + the settings-page mount)

**Backend**
- NEW `internal/store/workspace_members.go` — `workspace_members(id TEXT PK, workspace_id TEXT
  NOT NULL, user_id TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN
  ('viewer','collaborator')), created_at BIGINT NOT NULL DEFAULT 0)`, UNIQUE index
  `(workspace_id, user_id)` + user_id lookup index; idempotent `EnsureWorkspaceMembersTable`;
  `AddWorkspaceMember` (probe+upsert → honest created flag), `RemoveWorkspaceMember` (dual-shape
  users.id/sub, honest not-found error), `ListWorkspaceMembers` (honest []), and the gate-side
  `IsWorkspaceMemberByIdentity(workspaceID, sub)` (resolves sub → users.id server-side, both
  shapes — ListWorkspacesOwnedByIdentity's dual-shape pattern).
- NEW `internal/gateway/workspace_members.go` — `registerWorkspaceMembers(mux)`:
  `/api/workspaces/{id}/members` (GET list | POST add, in-handler 405 JSON) and
  `DELETE /api/workspaces/{id}/members/{userId}` (method-pinned like the provision route).
  READ gate = owner | member | admin (the same member-aware gate as the terminal); MANAGE gate =
  owner | admin (members cannot grow the list — access is granted, never self-replicated).
  Validation: userId (users.id OR Keycloak sub) resolved server-side → 404 unknown, 403 disabled
  user, 409 owner-as-member (standing access), 400 role outside viewer|collaborator. Response
  notes state the honest v1 semantics (both roles gate terminal+provisioning equally today).
- `internal/gateway/terminal.go` (the ONE gate-helper file in scope, 65 insertions / 8 changed) —
  NEW `(*Server).workspaceAccessAllowed(r, ws)`: pure `terminalAccessAllowed` stays the unchanged
  fast path (its terminal_test.go cases still pass), plus (a) the DUAL-SHAPE owner leg (mirror of
  auth.go's package-private workspaceOwnedByIdentity — TASK-037 wrote users.id, Sprint-51 wrote
  the raw sub; the old terminal gate only matched the sub shape) and (b) the MEMBER leg via
  `IsWorkspaceMemberByIdentity` (broken store read → deny). The terminal handler now gates through
  it; deny text names owner/member/admin; header doc updated honestly.
- NEW tests: `internal/store/workspace_members_test.go` (full store lifecycle incl. unique index,
  role refusal, dual-shape remove, honest [] ), `internal/gateway/workspace_members_test.go`
  (5 tests: honest empty list, full HTTP lifecycle incl. member-reads-but-cannot-manage,
  validation matrix 404/400/403/409, sub-shaped grant keys, and the gate matrix operator/admin/
  owner-both-shapes/member/shared-workspace-member/stranger-fails-closed/nil-fails-closed).

**Frontend**
- NEW `src/components/workspaces/WorkspaceMembersPanel.tsx` — the shared-component idiom
  (WorkspaceDeleteButton pattern): real members list (names joined from GET /api/users, role
  badges, member-since), role Select (viewer|collaborator), add/remove mutations with
  `meta: { silenceToast: true }` + exactly ONE honest self-toasted message each (dedicated 403
  wording or the backend's exact text), invalidation via the panel's ONE cache key
  `['workspace-members', workspaceId]`. The picker never offers what the backend refuses: the
  owner (409), existing members (upsert), disabled identities (403). Honest 403 READ denial
  renders the dedicated wording instead of a list.
- NEW `src/components/workspaces/WorkspaceMembersPanel.test.tsx` — 6 jsdom tests with REAL wire
  fixtures incl. the full add flow driven through the real base-ui Select (mousedown opens it
  under jsdom — pointerdown does not; documented) asserting the exact POST body
  `{userId, role}` + toast + invalidation refetch, the two-click Remove DELETE URL, the honest
  empty state with disabled Add, and both 403 wordings.
- `src/views/WorkspaceSettingsPage.tsx` (additive, two hunks: import + one section before the
  plugins card; file was clean in the tree — SPRINT-140 is committed). Click path (Mandate 14):
  Workspaces sub-nav → Einstellungen (/workspaces/settings, section-nav.ts:139) → pick workspace →
  Members card. Works for BOTH kinds — the shared/company workspace (§8.3b) gets its users
  exactly here.

**i18n + docs**
- en.json + de.json: 18 `wsMembers.*` keys hand-written; 58 other locales English backfill via
  `scripts/backfill-i18n.mjs` (the documented mechanism, same as WS-DELETE sibling).
  `npm run check:i18n` → PASS, 60 locales, 3113 keys.
- docs/API_DOCS.md: 3 new route rows + the terminal row's gate sentence rewritten member-aware +
  an SPRINT-145 status note on the provision row (still owner-or-admin until parent edit 4).
- docs/sprints/SPRINT-145-WORKSPACE-MEMBERS.md: plan, work packages, verification, open list,
  and ALL parent-apply blocks below verbatim.

## 3. EXACT PARENT-APPLY LINES (files outside my scope — nothing else was touched)

### 3a. internal/store/store.go — ONE migrate() line, after `_ = d.EnsureWorkspacesTable()` (line 317):
```go
	// SPRINT-145 (feat-workspace-members): workspace_members — the REAL
	// per-workspace user grants behind GET/POST/DELETE
	// /api/workspaces/{id}/members (store layer: workspace_members.go).
	_ = d.EnsureWorkspaceMembersTable()
```
(The store accessors lazy-ensure, so tests pass without it — but migrate() is the honest boot
path, same as workspaces/project_roles/….)

### 3b. internal/gateway/gateway.go — route registration in New(), after the provision route (line 249):
```go
	// SPRINT-145 (feat-workspace-members): the per-workspace member grants —
	// GET (list, owner|member|admin) + POST/DELETE (manage, owner|admin),
	// handlers in workspace_members.go. Reads are session-open (GETs never
	// hit the OPA admin gate); the manage gate is handler-side, and the OPA
	// posture is documented with the policy.go exemption.
	s.registerWorkspaceMembers(mux)
```
Without it the routes do not exist (the repo rule: not in gateway.go → not existent); until
applied the UI gets honest 404s.

### 3c. internal/policy/policy.go — OPA exemption for member mutations (needed so a NON-admin
OWNER can manage their own workspace's members; operator + jimesh-admins work WITHOUT it —
today POST/DELETE under /api/workspaces are full-admin mutations and the middleware 403s the
owner before the finer handler gate can run):
(a) in `IsAdminMutation`, after the `isWorkspaceProvisionMutation` block (~line 45):
```go
	if isWorkspaceMembersMutation(method, path) {
		return false
	}
```
(b) next to `isWorkspaceProvisionMutation` (~line 159), the exact function + comment shipped in
`docs/sprints/SPRINT-145-WORKSPACE-MEMBERS.md` §"VOM PARENT ANZUWENDENDE ZEILEN" (matches
POST /api/workspaces/{id}/members and DELETE /api/workspaces/{id}/members/{userId} precisely,
nothing else — copy verbatim from the sprint doc).

### 3d. internal/gateway/workspaces_provision.go — swap the gate (lines 120–128, exact old/new
blocks in the sprint doc): replace the source/roles/sub + `terminalAccessAllowed(...)` block with
```go
	if !s.workspaceAccessAllowed(r, ws) {
		s.errorJSON(w, http.StatusForbidden, "workspace provisioning denied — only the workspace owner, a member, or an admin may provision")
		return
	}
```
(the method exists and is tested; the old pure gate remains the terminal's fast path).

## 4. Verification evidence (fresh runs, 28.9.2026 ~06:10–06:20)

- `go build ./internal/...` (docker golang:latest) → RC 0; `go vet` store/gateway/auth/policy →
  RC 0; gofmt clean on all my files. `go build ./...` fails ONLY on `cmd/threat-responder`
  ("function main is undeclared in the main package") — the concurrent SPRINT-140 WP3 agent's
  in-flight files, failing identically before my edits; untouched by me.
- Targeted tests against the throwaway jimesh_test DB (created/dropped via docker exec on
  jimesh-postgres; test container ran --network host because this host's firewall blocks NEW
  container↔container connections to 5432 — the make go-test compose-network path times out;
  same postgres server, same throwaway DB):
  `-run TestWorkspaceMembersStoreLifecycle ./internal/store/` → PASS (0.53s);
  `-run 'TestWorkspaceMembers|TestWorkspaceAccessAllowedMemberAwareGate|TestTerminalAccessAllowed|TestTerminalHandler' ./internal/gateway/` → 7/7 PASS;
  SPRINT-139 regression (ensure/provision/shared/row-lifecycle) → ok in gateway + store.
- Frontend (src/frontend): `npx vitest run src/components/workspaces/` → 5 files, **30/30 PASS**
  (6 new + 24 existing — no regression); `npx tsc --noEmit -p tsconfig.app.json` → **474 errors =
  the baseline**, 0 attributable to my files (one transient unused-import error was mine and
  fixed); `npm run check:i18n` → PASS (60 locales, 3113 keys).
- NOT verified live: no `make restart-backend` and no curl smoke test (the routes are not
  registered until parent edit 3b — curl would honestly 404). Operator smoke after the parent
  applies 3b: GET /api/workspaces/{id}/members → {members: [], count: 0}; POST {userId, role} →
  member row; the workspace terminal opens for that member.

## 5. Honest open items (documented in the sprint doc too)

1. Parent edits 3a–3d pending (routes unregistered → 404; non-admin owner POST/DELETE → OPA 403).
2. Member VISIBILITY: a granted member does not yet SEE the workspace in their own list
   (ListWorkspacesOwnedByIdentity, store/workspaces.go) nor can they scope-switch into it
   (auth.go workspaceOwnedByIdentity) — exact follow-up lines in the sprint doc §5.
3. Team-level grants (the demand said "das team ODER die user"): still bookkeeping-only in
   team_bindings; v1 is user-level. No half-built team surface.
4. Role semantics v1: viewer|collaborator both grant the same gated access today (terminal +
   provisioning after 3d) — persisted and documented, no fake difference.
5. Reference hygiene (repo-wide no-cascade reality): workspace delete leaves member rows
   orphaned (handleWorkspaceDelete lacks a member sweep) and SurveyUserDeletes does not count
   workspace_members — exact suggested lines in the sprint doc.
6. The OPA exemption (3c) routes owner-fired member writes PAST the RM35 admin_audit_log branch
   (same audit gap class as the provision exemption) — if member writes must be audited, wire
   the handler-side audit helper.

## 6. Files (exact)

New: `src/backend/internal/store/workspace_members.go`, `…/workspace_members_test.go`,
`src/backend/internal/gateway/workspace_members.go`, `…/workspace_members_test.go`,
`src/frontend/src/components/workspaces/WorkspaceMembersPanel.tsx`, `…/WorkspaceMembersPanel.test.tsx`,
`docs/sprints/SPRINT-145-WORKSPACE-MEMBERS.md`.
Modified: `src/backend/internal/gateway/terminal.go` (gate file, in scope),
`src/frontend/src/views/WorkspaceSettingsPage.tsx` (additive mount),
`docs/API_DOCS.md`, `src/frontend/src/i18n/locales/en.json` + `de.json` (18 keys) + 58 locales
(English backfill — shared-tree files also carrying concurrent agents' keys).
NOT touched: gateway.go, store.go, policy.go, workspaces_provision.go, WorkspacesPage.tsx,
section-nav/HierarchySidebar, plugins*/files*/suricata*/deploy/*, docs/backlog/BACKLOG.md
(mirror entry is the parent's — outside my file scope).
No git commit (standing order).
