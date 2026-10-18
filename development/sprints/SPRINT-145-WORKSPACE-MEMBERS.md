# SPRINT-145 — WORKSPACE-MEMBERS: "waehl die User aus, die Zugriff haben"

**Status:** ✅ VERIFIZIERT GEBAUT (feat-workspace-members, 28.9.2026 — Working Tree, kein Commit)
**Ausloeser (Operator, 28.9.2026, verbatim):** "warum kann mein teamlevel workspace das team
oder die user nicht auswaehlen die dazu zugriff haben sollen?"
**Verifier-Befund (parallel):** Workspaces tragen NUR ein einzelnes `owner_user_id` + `workspace_kind`
user|shared; `team_bindings`-Rows KOENNEN resourceType 'workspace' nennen (team_bindings.go:99-102),
aber KEIN Zugriffspfad liest sie — reine Buchhaltung. Es gab keine Members-Tabelle, keinen
Multi-User-Grant, keine UI. Dieser Sprint liefert das ehrliche v1.

## Ziel-Modell

- **Echte Grants statt Buchhaltung:** `workspace_members`-Rows (PostgreSQL, UNIQUE (workspace_id,
  user_id), role CHECK viewer|collaborator, created_at BIGINT ms) — gelesen von den WIRKLICHEN
  Workspace-Gates, verwaltet über echte Routes.
- **Zugriffsmodell ehrlich erweitert:** Owner ODER Member ODER Admin (`workspaceAccessAllowed`,
  terminal.go) — Terminal sofort wirksam, Provisioning über den gemeldeten Edit (s.u.).
- **Owner-or-Admin verwaltet:** Members duerfen die Memberliste NICHT selbst erweitern
  ("non-owner non-admin → 403" — die Operator-Forderung; Access wird GEWAEHRT, repliziert sich nicht).
- **Benutzerauswahl server-seitig validiert:** userId (users.id ODER Keycloak-sub) wird gegen den
  users-Store aufgeloest — 404 statt Phantom-Grant; deaktivierte Identitaeten 403; der Owner ist
  kein Member (409 — stehender Zugriff); Rollen ausserhalb viewer|collaborator 400.
- **UI dort, wo der Operator den Workspace verwaltet:** Workspace Settings (`/workspaces/settings`,
  TASK-053-Flaeche mit Configure/Redeploy + Users-Liste) bekommt die Members-Karte —
  WorkspaceDeleteButton-Idiom: shared component, silenceToast, ehrliche 403-Wording-Toast,
  ['workspace-members', wsId]-Invalidierung.

## Plan (vor Implementierung — Work-Packages)

- **WP1 Store:** NEW `internal/store/workspace_members.go` — Tabelle idempotent (Ensure),
  AddMember (Upsert auf Rolle, created-Flag), RemoveMember (dual-shape, ehrliches not-found),
  ListMembers (ehrliches []), IsWorkspaceMemberByIdentity (Gate-Leg, dual-shape wie
  ListWorkspacesOwnedByIdentity). **Akzeptanz:** Migration idempotent, keine Zeile ohne echten
  User, closed role set erzwungen, Tests gegen echte Postgres.
- **WP2 Gateway:** NEW `internal/gateway/workspace_members.go` — GET/POST/DELETE
  /api/workspaces/{id}/members mit Owner|Admin-Manage-Gate und Owner|Member|Admin-Read-Gate.
  **Akzeptanz:** 404/400/403/409 ehrlich, sichtbare Keys dual-shape, OPA-Posture dokumentiert.
- **WP3 Gates:** `terminalAccessAllowed` in `terminal.go` (das EINE Gate-Helper-File im Scope)
  erweitern: member-aware `workspaceAccessAllowed` + dual-shape-Owner-Leg; Terminal-Handler ruft
  sie. Provision-Gate (workspaces_provision.go, AUSSERHALB Scope) → exakte Edit-Zeilen an den
  Parent. **Akzeptanz:** Terminal-Gate member-aware + SPRINT-138/139-Gate-Tests bleiben gruen.
- **WP4 Frontend:** NEW `WorkspaceMembersPanel.tsx` (shared component, Settings-Mount) — echte
  Liste, Rollen-Select, Add/Remove mit ConfirmButton, ehrliche 403-Handling, i18n en+de+Backfill.
  **Akzeptanz:** Klick-Pfad /workspaces/settings → Workspace waehlen → Members-Karte (Mandat 14);
  tsc-Baseline 474 nicht schlechter; vitest gruen.
- **WP5 Tests:** Store-Test + Gateway-Handler/Gate-Test + Frontend-Vitest gegen echte Wire-Shapes.
- **WP6 Docs:** API_DOCS.md (3 Routes + 2 Gate-Beschreibungen nachgezogen), dieses Sprint-File,
  BUILD-Report ihc24; store.go/gateway.go/policy.go-Zeilen im Report (nicht selbst editiert).

## Umgesetzt & verifiziert

- **WP1 [x]** `internal/store/workspace_members.go`: `workspace_members(id TEXT PK, workspace_id
  TEXT NOT NULL, user_id TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN
  ('viewer','collaborator')), created_at BIGINT NOT NULL DEFAULT 0)`; UNIQUE-Index
  `idx_workspace_members_ws_user` (Index statt Constraint — das workspaces.go-Muster), Lookup-Index
  `idx_workspace_members_user` (Gate-Resolutions-Leg). `AddWorkspaceMember` = Probe + INSERT/UPDATE
  (created-Flag ehrlich, kein RETURNING-Hack), `RemoveWorkspaceMember` dual-shape + not-found-Error,
  `IsWorkspaceMemberByIdentity` loest sub → users.id server-seitig auf (beide Keys, wie
  ListWorkspacesOwnedByIdentity). Test: `TestWorkspaceMembersStoreLifecycle` PASS (0.53s, echte
  jimesh_test).
- **WP2 [x]** `internal/gateway/workspace_members.go`: `registerWorkspaceMembers(mux)` —
  `"/api/workspaces/{id}/members"` (GET|POST Switch, JSON-405) + `"DELETE /api/workspaces/{id}/members/{userId}"`
  (method-pinned wie die provision-Route). Read-Gate = `workspaceAccessAllowed` (Terminal-Staerke:
  Members sehen, wer mit ihnen teilt; Fremde 403). Manage-Gate = `workspaceMemberManageAllowed`
  (isAdminRequest | dual-shape Owner — Members duerfen NICHT verwalten). Validation: user server-seitig
  (id→sub-Reihenfolge, 404), disabled 403, Owner-as-Member 409, Rolle closed set 400. Responses mit
  ehrlicher v1-note. Tests: 4 Handler-Tests + 1 Gate-Test PASS (7/7 zusammen mit den unveraenderten
  Terminal-Gate-Tests).
- **WP3 [x]** `terminal.go` (das eine erlaubte Gate-File): NEW `workspaceAccessAllowed(r, ws)` —
  reine `terminalAccessAllowed` bleibt Fast-Path (unveraendert, terminal_test.go bleibt gruen), dazu
  (a) dual-shape-Owner-Leg (`workspaceOwnedByIdentity`-Mirror aus auth.go — auth's Version ist
  package-private) und (b) Member-Leg via IsWorkspaceMemberByIdentity (Store-Read schlaegt fehl →
  DENY). Handler-Gate-Aufruf getauscht, Deny-Text nennt jetzt owner/member/admin. Terminal-
  Header-Kommentar ehrlich nachgezogen. `workspaceMembersQueryKey`-Consumer + Wire-Shapes im Test.
- **WP4 [x]** `WorkspaceMembersPanel.tsx` (components/workspaces/) + Mount in
  `WorkspaceSettingsPage.tsx` (additiv: Import + eine JSX-Sektion vor der Plugins-Karte; die Seite
  war im Working Tree sauber — SPRINT-140 war committet). Klick-Pfad: Workspaces-Subnav →
  Einstellungen (`/workspaces/settings`, section-nav.ts:139) → Workspace im Select waehlen →
  Members-Karte. Picker filtert Owner (409), Existing-Member (Upsert) und deaktivierte User (403)
  heraus — das Backend verweigert sie, die UI bietet sie nie an. 403-Manage-Deny und 403-Read-Deny
  je eigene ehrliche Wording (silenceToast-Idiom wie WorkspaceDeleteButton). Empirisch: base-ui
  Select oeffnet im jsdom-Test per mousedown (pointerdown nicht) — im echten Browser irrelevant.
- **WP5 [x]** Tests: Backend `internal/store/workspace_members_test.go` (1 Test, 12 Assertion-
  Bloecke) + `internal/gateway/workspace_members_test.go` (5 Tests: honest empty, Full-Lifecycle
  inkl. Member-liest-aber-verwaltet-nicht, Validation 404/400/403/409, sub-shaped Keys,
  MemberAwareGate matrix). Frontend `WorkspaceMembersPanel.test.tsx` (6 Tests: reale Rows,
  honest empty + disabled Add, 403-Read-Wording, Two-Click-Remove + exakte DELETE-URL + Toast,
  403-Remove-Wording, Picker-Filter + echter POST-Body {userId, role} + Invalidierung).
- **WP6 [x]** API_DOCS.md: 3 neue Zeilen in der Workspaces-Tabelle + Terminal-Gate-Satz
  (member-aware) + Provision-Row-Statusnotiz. check:i18n PASS. BACKLOG-Spiegel AUSSERHALB Scope
  (Parent — siehe Offen-Liste).

## VOM PARENT ANZUWENDENDE ZEILEN (Dateien ausserhalb meines File-Scopes)

### 1. `internal/store/store.go` — migrate()-Registrierung (eine Zeile)
Nach Zeile 317 (`_ = d.EnsureWorkspacesTable()`), einfuegen:

```go
	// SPRINT-145 (feat-workspace-members): workspace_members — the REAL
	// per-workspace user grants behind GET/POST/DELETE
	// /api/workspaces/{id}/members (store layer: workspace_members.go).
	_ = d.EnsureWorkspaceMembersTable()
```

(Hochfahren genuegt nicht: die Store-Accessoren lazy-ensuren zwar selbst — Tests beweisen es —,
aber migrate() ist der ehrliche Boot-Pfad, wie bei workspaces/project_roles/….)

### 2. `internal/gateway/gateway.go` — Routen-Registrierung (New())
Nach Zeile 249 (`mux.HandleFunc("POST /api/workspaces/{id}/provision", s.handleWorkspaceProvision)`),
einfuegen:

```go
	// SPRINT-145 (feat-workspace-members): the per-workspace member grants —
	// GET (list, owner|member|admin) + POST/DELETE (manage, owner|admin),
	// handlers in workspace_members.go. Reads are session-open (GETs never
	// hit the OPA admin gate); the manage gate is handler-side, and the OPA
	// posture is documented with the policy.go exemption below.
	s.registerWorkspaceMembers(mux)
```

Ohne diese Zeile existieren die Routes nicht (Mandat: nicht in gateway.go → nicht existent).
Bis dahin sind Handler + Tests gruen, das UI bekommt ehrliche 404/405.

### 3. `internal/policy/policy.go` — OPA-Exemption fuer Members-Mutationen
POST/DELETE unter `"/api/workspaces"` sind Admin-Mutationen (IsAdminMutation-Prefix-Liste).
Damit ein NICHT-Admin-OWNER die Mitglieder SEINES Workspaces verwalten kann (genau die
Operator-Forderung), braucht es die provision-Route-Exemption nochmal fuer die Members-Flaeche —
sonst 403'd die Middleware den Owner, bevor das Handler-Gate (owner ODER admin) laeuft. Der
Operator (password) und Keycloak-Admins funktionieren auch OHNE diesen Edit.

(a) In `IsAdminMutation`, direkt nach dem `isWorkspaceProvisionMutation`-Block (Zeile ~45):

```go
	// SPRINT-145 (feat-workspace-members): POST /api/workspaces/{id}/members
	// and DELETE /api/workspaces/{id}/members/{userId} are owner-scoped at
	// the HANDLER (gateway/workspace_members.go: owner | admin manages,
	// members cannot) — the "/api/workspaces" prefix below would gate them
	// as full-admin mutations and thereby deny the OWNER the member
	// management of their own workspace before the finer handler rule runs
	// (same precise-match pattern as isWorkspaceProvisionMutation above).
	if isWorkspaceMembersMutation(method, path) {
		return false
	}
```

(b) Neben `isWorkspaceProvisionMutation` (Zeile ~159), die Funktion:

```go
// isWorkspaceMembersMutation matches EXACTLY the workspace-member grant
// surface (SPRINT-145, feat-workspace-members):
//
//	POST   /api/workspaces/{id}/members
//	DELETE /api/workspaces/{id}/members/{userId}
//
// The workspace owner may manage their own workspace's members — the
// handler-side gate (gateway/workspace_members.go) enforces owner-or-admin,
// and members themselves can never manage — so these paths are exempt from
// the "/api/workspaces" admin prefix, exactly like the provision mutation.
// GET (the list) never reaches the admin gate anyway (read access stays
// open for every authenticated identity; the finer owner|member|admin
// read gate lives handler-side).
func isWorkspaceMembersMutation(method, path string) bool {
	if !strings.HasPrefix(path, "/api/workspaces/") {
		return false
	}
	rest := strings.TrimPrefix(path, "/api/workspaces/")
	parts := strings.Split(rest, "/")
	switch method {
	case "POST":
		return len(parts) == 2 && parts[1] == "members"
	case "DELETE":
		return len(parts) == 3 && parts[1] == "members"
	}
	return false
}
```

### 4. `internal/gateway/workspaces_provision.go` — Gate auf member-aware umstellen (Zeilen 120–128)
Alt (exakt):

```go
	// Ownership gate (server-derived identity only — auth.Middleware strips
	// client copies of these headers ingress-side).
	source := r.Header.Get("X-JiMesh-Identity-Source")
	roles := r.Header.Get("X-JiMesh-Identity-Roles")
	sub := r.Header.Get("X-JiMesh-Identity-Sub")
	if !terminalAccessAllowed(source, roles, sub, ws.OwnerUserID) {
		s.errorJSON(w, http.StatusForbidden, "workspace provisioning denied — only the workspace owner or an admin may provision")
		return
	}
```

Neu:

```go
	// Ownership gate (server-derived identity only — auth.Middleware strips
	// client copies of these headers ingress-side). SPRINT-145: member-aware
	// (owner | member | admin) — the same workspaceAccessAllowed the terminal
	// route gates with (terminal.go); the pure terminalAccessAllowed stays
	// that gate's fast path.
	if !s.workspaceAccessAllowed(r, ws) {
		s.errorJSON(w, http.StatusForbidden, "workspace provisioning denied — only the workspace owner, a member, or an admin may provision")
		return
	}
```

(Die `source`/`sub`-Locals entfallen in diesem Block; keine weitere Nutzung in der Funktion —
pruefen vor dem Apply: grep auf `source`/`sub` in handleWorkspaceProvision.)

### 5. Optional: Member-Sichtbarkeit in Workspace-Liste + Scope-Switch (Follow-up, nicht v1)
Ein Member SIEHT das Workspace heute nicht in seiner eigenen Liste (handleWorkspacesList:
non-admin → ListWorkspacesOwnedByIdentity, beides ausserhalb meines Scopes) und kann den
Scope-Switch nicht nutzen (auth.go workspaceOwnedByIdentity || admin). Wer das Member-Erlebnis
rund machen will:
- `internal/store/workspaces.go` — `ListWorkspacesOwnedByIdentity` zusaetzlich
  `IsWorkspaceMemberByIdentity` je Workspace pruefen (Oder: JOIN ueber workspace_members), und
- `internal/auth/auth.go` — `workspaceOwnedByIdentity` um die Member-Leg erweitern (Zeile ~665).
Beides bewusst NICHT selbst gemacht: store/workspaces.go + auth.go stehen nicht in meinem
File-Scope, und die Gate-Erweiterung (WP3) ist die Wirkung, die die Operator-Forderung nennt.

## Verifikation (alles echt gelaufen)

- `docker run --rm -v …/src/backend:/app -w /app golang:latest go build ./internal/...` → RC 0.
  (`go build ./...` scheitert NUR an `cmd/threat-responder` ("function main is undeclared") — der
  parallel arbeitende SPRINT-140-WP3-Agent, NICHT meine Aenderung; vor meinen Edits identisch.)
- `go vet ./internal/store/ ./internal/gateway/ ./internal/auth/ ./internal/policy/` → RC 0
  (golang:latest, make-Pattern). gofmt ueber alle meine Files.
- `go test` gegen die throwaway jimesh_test (docker exec jimesh-postgres psql DROP/CREATE; Test-
  Container --network host, weil der Host-Firewall neue Container-Verbindungen ins compose-Netz
  blockt — der gleiche Postgres, gleiche DB):
  `-run 'TestWorkspaceMembersStoreLifecycle' ./internal/store/` → PASS (0.53s);
  `-run 'TestWorkspaceMembers|TestWorkspaceAccessAllowedMemberAwareGate|TestTerminalAccessAllowed|TestTerminalHandler' ./internal/gateway/` → 7/7 PASS;
  SPRINT-139-Regression `-run 'TestWorkspaceEnsure|TestWorkspaceProvision|TestWorkspaceSharedRow|TestWorkspaceRowLifecycle'` → ok (gateway + store).
- Frontend (src/frontend): `npx vitest run src/components/workspaces/` → 5 Dateien, 30/30 PASS
  (meine 6 neu + WorkspaceTerminal 9 + workspace-deploy-dialogs 5 + PluginActivationCard 4 + …);
  `npx tsc --noEmit -p tsconfig.app.json` → **474 = Baseline**, 0 Errors in meinen Dateien
  (483-Zwischenstand war 1 ungenutzer Import von mir — gefixt — plus konkurrierende Agent-Edits,
  die sich im selben Fenster wieder aufloesten);
  `npm run check:i18n` → PASS, 60 Locales, 3113 Keys (18 neue wsMembers-Keys; en+de hand-
  uebersetzt, 58 Locales English-Backfill ueber scripts/backfill-i18n.mjs — das dokumentierte
  WS-DELETE-Sibling-Muster).

## Ehrliche Offen-Liste (was v1 NICHT tut)

1. **Provision-Gate + OPA-Exemption + store/gateway-Registrierung** warten auf die Parent-Edits
   oben (1)–(4); bis dahin: Routes unregistriert (404), non-admin-Owner POST/DELETE → OPA-403.
2. **Member-Sichtbarkeit** des gewährten Workspaces in der eigenen Liste + Scope-Switch → (5).
3. **Team-Level-Grants** (Operator sagte "das team ODER die user"): team_bindings kann workspace
   nennen, aber kein Pfad liest es. v1 ist USER-level; Team-Grants braeuchten eine echte
   Gate-Leg ueber ListTeamBindings — bewusst kein halbfertiges Interface gebaut.
4. **Rollen-Semantik v1:** viewer|collaborator gewaehren BEIDE heute denselben Gate-Zugriff
   (Terminal + Provisioning) — dokumentiert in Route-Note + UI-Hint, persistiert fuer die
   Nur-Lese-Oberflaechen. Kein Fake-Unterschied.
5. **Referenz-Hygiene wie ueberall im Repo (kein ON DELETE CASCADE existiert):** beim Workspace-
   Delete (handleWorkspaceDelete, gateway/workspaces.go) bleiben member-Rows orphaned; beim
   User-Delete zaehlt SurveyUserDeletes (store/users.go) workspace_members NICHT. Exakte Zeilen
   fuer den Parent: handleWorkspaceDelete nach `store.DeleteWorkspace`-Aufruf ein
   `db.RemoveWorkspaceMembers…`-Sweep bzw. einen Store-Call `DeleteWorkspaceMembersForWorkspace(id)`
   ergänzen; `SurveyUserDeletes` +1 Subselect `(SELECT count(*) FROM workspace_members WHERE user_id = ?)`
   + Feld in UserDeleteSurvey.
6. **Admin-Audit-Luecke der Exemption:** die RM35-Audit-Zeilen feuern nur im IsAdminMutation-Zweig
   — owner-gefeuerte Member-POSTs (nach Edit 3) landen NICHT in admin_audit_log. Gleiche Klasse
   wie die provision-Exemption (SPRINT-139); wenn das Audit das decken soll, gehoert der Member-
   Write in die handler-seitige Audit-Hilfe.

## Dateien (Referenz)

Backend NEU: `internal/store/workspace_members.go`, `internal/store/workspace_members_test.go`,
`internal/gateway/workspace_members.go`, `internal/gateway/workspace_members_test.go`.
Backend GEAENDERT (im Scope): `internal/gateway/terminal.go` (workspaceAccessAllowed + Handler-Gate +
Header-Doc).
Frontend NEU: `src/components/workspaces/WorkspaceMembersPanel.tsx`,
`src/components/workspaces/WorkspaceMembersPanel.test.tsx`. GEAENDERT (additiv):
`src/views/WorkspaceSettingsPage.tsx` (Import + Members-Karte vor der Plugins-Sektion).
i18n: en.json + de.json (18 Keys, hand-uebersetzt), 58 Locales via scripts/backfill-i18n.mjs.
Docs: docs/API_DOCS.md (3 neue Rows + 2 Gate-Saetze), dieses File.
NICHT angefasst (Parent-Aufgabe): gateway.go, store.go, policy.go, workspaces_provision.go,
docs/backlog/BACKLOG.md, WorkspacesPage.tsx, section-nav, HierarchySidebar.
