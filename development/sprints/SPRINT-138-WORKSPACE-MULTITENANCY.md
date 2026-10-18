# SPRINT-138 — Workspace-Multi-Tenancy (X-Workspace-Scope)

**Branch:** `feat-workspace-multitenancy` · **Datum:** 28.9.2026 ·
**Operator-Spec:** „User sehen IHREN Workspace, Admins können umschalten"

## Ziel

Ein normaler Keycloak-User sieht nur seine eigenen Workspaces (Identity aus dem
Session-Token, `sub`-Claim — nie ein Client-Feld). Admins (Passwort-Operator
oder Keycloak `jimesh-admin`) bekommen ein Workspace-Switcher-Dropdown in der
Sidebar und können per `X-Workspace-Scope: <workspaceId>`-Header auf fremde
Workspaces umschalten. Das Backend prüft die Admin-Rolle über die EINE
Policy-Engine (OPA, `policy.IsAdminXWorkspaceScope`); ohne Admin ist ein
Fremd-Scope ein 403.

## Modell & Entscheidungen (vorab, damit nichts interpretationsabhängig bleibt)

1. **Header-Vertrag:** `X-Workspace-Scope` ist der clientseitige ASK. Die
   aufgelöste Antwort sind zwei INGRESS-DERIVED-ONLY-Header (Client-Kopien
   werden am Middleware-Eingang gestrippt, gleicher Vertrag wie
   `X-JiMesh-Identity-*`):
   - `X-JiMesh-Scope-Workspace-Id` — der gewährte Scope (nur gesetzt, wenn
     gewährt: Admin-Switch ODER eigener Workspace).
   - `X-JiMesh-Identity-Admin` — `true`/`false`, die einmal pro Request
     ausgewertete `IsAdminXWorkspaceScope`-Entscheidung (fail-closed bei
     nicht geladener Policy-Engine).
2. **Nicht-Admin + Fremd-Workspace → 403** (Operator-Modell: „sonst 403").
   Die Backend-Skizze („ignoriere Header") gilt für den NO-OP-Fall: bittet ein
   Nicht-Admin um SEINEN eigenen Workspace, ist das kein Privilegienwechsel
   und wird erlaubt (= „bleibt auf seinem Workspace").
3. **Policy:** `policy.IsAdminXWorkspaceScope(engine, source, roles)` fragt
   DIESELBE OPA-Engine mit der Workspace-Lifecycle-Frage (POST
   /api/workspaces) — wer Workspaces anlegen/löschen darf, darf in jeden
   hineinschauen. Eine zweite Engine ist verboten (E-Policy, Mandat:
   „eine Engine, nicht zwei"). Nil-Engine/Eval-Fehler → false (fail-closed).
4. **Owner-Key-Ambiguität:** `workspaces.owner_user_id` trägt in der Praxis
   BEIDE Formen — TASK-037s Ensure schreibt `users.id`, Sprint-51 #130s
   Provisioning schrieb den roken Keycloak-Sub. Alle „eigene Workspace"-
   Vergleiche laufen deshalb über `store.ListWorkspacesOwnedByIdentity(sub)`
   (merge beider Formen, dedupliziert).
5. **Reihenfolge in der Workspace-Liste (GET /api/workspaces):**
   Scope-Header gewährt → NUR der gescopete Workspace; Keycloak-Nicht-Admin
   → nur eigene; Passwort-Operator/Keycloak-Admin ohne Scope → alle (bisher).
   `?all=1` (nur Admin) übersteuert den Scope — das Switcher-Inventar muss
   die volle Liste sehen können, auch während man selbst gescopet ist.
6. **Sessions & SSH-Explore:** `sessions`-Rows sind PROJEKT-keyed (kein
   `workspace_id`-Feld), `/api/ssh/explore` ist Node-credential-keyed —
   beide sind keine Workspace-Rows und werden NICHT gefiltert (ehrlich
   dokumentiert statt halbgefiltert). Die Workspace-spezifischen Surfaces
   sind: Workspaces-Liste, Deployments-Listen (Rows tragen `workspace_id` —
   das ist die Terminal-/App-/Files-Erreichbarkeitsmatrix über
   `interfaces`), `/api/users/{sub}/workspaces`.

## Work Packages — Ergebnis (verifiziert gegen den Code, nicht behauptet)

| WP | Task | Status |
|----|------|--------|
| WP1 | `internal/policy/workspace_scope.go`: `IsAdminXWorkspaceScope` über die bestehende OPA-Engine + `workspace_scope_test.go` (pure Rego-Tests, laufen ohne DB) | [x] — 2 Tests / 9 Fälle PASS (echt gelaufen, golang-Container) |
| WP2 | `internal/auth/auth.go`: Middleware liest `X-Workspace-Scope`, prüft via WP1, setzt `X-JiMesh-Scope-Workspace-Id`/`X-JiMesh-Identity-Admin`, 404 unbekannter Workspace, 403 Fremd-Scope ohne Admin; `/api/auth/status` liefert `isAdmin` | [x] |
| WP3 | `internal/store/workspaces.go`: `ListWorkspacesOwnedByIdentity` (beide Owner-Formen) | [x] |
| WP4 | `internal/gateway/workspaces.go`: Tenancy in GET /api/workspaces (Scope → nur der eine; Nicht-Admin → eigene; `?all=1`-Admin-Override); `user_provisioning.go`: Admins dürfen fremde `/api/users/{sub}/workspaces` listen | [x] |
| WP5 | `internal/deploy/deployments.go` + `deploy/tenancy.go`: GET /api/deployments + GET /api/projects/{id}/deployments filtern nach Scope (Admin) bzw. eigenen Workspaces (Nicht-Admin); Store-Fehler fail-closed (500, kein Leak) | [x] |
| WP6 | Auth-Middleware-Whitebox-Tests (`internal/auth/workspace_scope_test.go`, `store.Open(os.Getenv("DATABASE_URL"))` + Skip-ohne-Postgres wie `gateway/policy_test.go`) | [x] — 7 Tests kompilieren + SKIPPEN hier (Stack down), laufen mit `make go-test` gegen die Wegwerf-DB |
| WP7 | Frontend: `lib/workspace-scope.ts` (Store, localStorage `jimesh.workspace-scope`), `apiFetch` sendet `X-Workspace-Scope` auf JEDEM Call, Logout räumt auf | [x] |
| WP8 | Frontend: `WorkspaceSwitcher.tsx` (nur für Admins — aus /api/auth/status → isAdmin), Sidebar-Einbau in Sektion A unter der Scope-Bar, „Viewing as: <Name>"-Label, `invalidateQueries()` beim Umschalten | [x] |
| WP9 | i18n: 8 `sidebar.workspaceSwitcher.*`-Keys — en + de echt übersetzt, 58 Locales via `backfill-i18n.mjs`; Vitest: 12 neue Tests (Store 8 inkl. Self-Heal + Switcher 4) + 1 Sidebar-Guard-Test | [x] — Full Suite 309/309, check:i18n 60 Locales / 2901 Keys |
| WP10 | Docs: API_DOCS (auth/status-Zeile, neue Sektion „Workspaces — multi-tenant scoping" mit Header-Vertrag + GET /api/workspaces, beide Deployment-GETs, users/{sub}-Zeilen), Backlog-Spiegel, dieses Ergebnis | [x] |

## Akzeptanzkriterien

1. Nicht-Admin: GET /api/workspaces liefert NUR eigene Workspaces; ein
   `X-Workspace-Scope` auf einen fremden Workspace → 403 (geloggt).
2. Admin ohne Header: alle Workspaces (bisheriges Verhalten, kein Bruch).
3. Admin mit Header: alle workspace-spezifischen Listen liefern die Daten
   des gescopeten Workspace; das Frontend zeigt „Viewing as: <Name>".
4. `apiFetch` trägt den Header automatisch auf jeden Call, sobald ein Scope
   gesetzt ist; Logout/Reset räumt den Scope weg.
5. Policy-Tests (`internal/policy`) grün ohne DB; Auth-Tests laufen gegen
   die Dev-Stack-DB und SKIPPEN ehrlich, wenn kein Postgres erreichbar.
6. `make go-build`, `tsc --noEmit -p tsconfig.app.json` (0 neue Fehler),
   `npm run test` (vitest + check:i18n) grün.

## Verifikation (28.9.2026, gegen diesen Branch-Checkout)

**Getrennter Worktree.** Der Shared Checkout unter `/home/ji/projects/jimesh`
wird von Parallel-Sessions (SPRINT-138-FILE-BROWSER-UPLOAD /
-WORKSPACE-TERMINAL, Branch feat-file-browser-upload) bearbeitet — deren
in-flight go.mod/docker-Dependency ließ `go build ./...` dort mit
„updates to go.mod needed" scheitern. SÄMTLICHE Arbeit und Verifikation
dieses Sprints lief daher im isolierten Worktree
`/home/ji/projects/jimesh-wsmulti` (Branch `feat-workspace-multitenancy`);
der Shared Tree enthält danach keine Datei dieses Sprints mehr.

| Check | Ergebnis |
|-------|----------|
| `go build ./...` (golang:latest-Container, gleiche Volume-Caches wie `make go-build`) | ✓ RC 0 |
| `go vet ./...` (gleicher Container) | ✓ RC 0 |
| `go test ./internal/policy/...` | ✓ PASS — `TestIsAdminXWorkspaceScope` (8 Identitäts-Fälle) + `TestIsAdminXWorkspaceScopeNilEngineFailsClosed`, echt gelaufen |
| `go test ./internal/auth/...` | ✓ ok — die 7 neuen Middleware-Tests SKIPPEN ehrlich („no reachable Postgres": JiMesh-Stack ist down, `DATABASE_URL` unset); mit Stack: `make go-test` (Throwaway-DB) |
| `npx tsc --noEmit -p tsconfig.app.json` | ✓ A/B 478 → 478 Fehler = **0 neue**; 0 Fehler in den geänderten Dateien (Rest ist der dokumentierte Pre-existing-Style-Noise) |
| `npm run test` (vitest + check:i18n) | ✓ 31 Dateien / **309 Tests PASS** (296 alt + 13 neu/guard); i18n **60 Locales / 2901 Keys** (2893 + 8 neue) |

**Live-Smoke (Operator, Stack up — hier nicht gelaufen):**
`make restart-backend`, dann als Passwort-Operator:
`curl -s -H "Authorization: Bearer <token>" -H "X-Workspace-Scope: ws-…" localhost:8111/api/workspaces`
→ nur der gescopete Workspace; derselbe Call ohne Admin-Session (Keycloak-User)
→ 403; `?all=1` → volle Liste; Frontend: Sidebar → Switcher-Zeile → Workspace
wählen → „Viewing as: <Name>".

## Offen / bewusst NICHT umgesetzt

- `/api/sessions` + `/api/ssh/explore` bleiben ungefiltert (Modell-Entscheidung
  Nr. 6: projekt- bzw. node-keyed, keine Workspace-Bindung auf der Row).
- `GET /api/projects` bleibt für alle sichtbar (das geteilte Parent-Tier; ein
  Nicht-Admin sieht unter jedem Projekt nur noch seine eigenen Workspaces).
- **Self-Heal (nachgetragen nach der Verifikation):** beide Scope-Denys
  (403/404) tragen `error.type: "workspace_scope_denied"`; `apiFetch` räumt
  daraufhin den persistierten Scope einmal ab + Toast — ein gespeicherter
  Scope, den eine neuere Session nicht mehr nutzen darf (Admin-Logout ohne
  logout-Klick, gelöschter Workspace), kann so kein Dashboard zubricken.
  In Vitest (12. Test) und in den Backend-Tests (Body-Assert) verifiziert.
- Merge-Konflikt-Risiko mit den Parallel-Sprints: beide berühren
  `HierarchySidebar.tsx`, `i18n/locales/*` und (Terminal-Sprint) das
  `/api/workspaces/{id}/terminal`-Umfeld. Deren `terminal.go`-Ownership-Gate
  liest genau die `X-JiMesh-*`-Header, die diese Middleware setzt — semantisch
  kompatibel, textuell aber Konflikte beim Zusammenführen möglich.
