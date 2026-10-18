# TASK-071 — Ghost-Users/Keys/Projects: echte DELETE-Routes + UI

**Status:** ✅ erledigt (14.9.2026) | **Quelle:** Operator 14.9. („Geister users, keys und projects, man kann die nicht löschen")

## Fundstellen
- KEIN DELETE /api/users oder DELETE /api/projects in gateway/
- AdminUsersPage Trash2-Icon löscht nur project_user_budgets-Row, nicht den User
- ConsumerKeys-Delete existiert (prüfen ob es einen echten Backend-Call macht)
- R39-Slop-Audit: `DELETE /api/projects/{id}` existierte backend-seitig bereits, bewusst UI-los; die ProjectsPage-„Delete"-UI filterte nur lokalen State (localStorage) und rief nur `POST /api/projects/undeploy` (SSH-Sweep) — die DB-Row überlebte jeden „Delete" (Ghost-Data-Ursache).
- Audit-Fund: `docs/research/R41-operator-feedback-blitz.md:91`

## Aufgabe
1. DELETE /api/users/{id} — Survey was auf User referenziert (project_user_budgets, workspaces.owner_user_id, consumer_keys.user_id, subagents): CASCADE oder BLOCK mit ehrlicher Reason (Mandat 2)
2. DELETE /api/projects/{id} — survey was cascade-delete (workspaces darunter, control-plane-bindings, secrets_engines) vs. was blockt mit Reason („N aktive Workspaces")
3. Wire echte Confirm-Dialoge in AdminUsersPage + ProjectsPage die EXAKT sagen was entfernt wird (nicht nur „are you sure?")
4. Verify gegen den laufenden Stack (authenticated): Delete entfernt die Row wirklich

- GIT: explizite Pfade, kein -A, NICHT pushen

## Abrechnung (14.9.2026 — gegen Code + Live-Stack verifiziert)

**Backend** (committet auf main als `90b2c71` durch eine Parallel-Session,
dieser Task-Branch basiert darauf):
- `DELETE /api/users/{id}`: Handler `internal/security/users.go:69`
  (Route `security.go:78`), Store `internal/store/users.go`
  (`SurveyUserDeletes`: workspaces/consumer_keys/project_user_budgets/
  team_members — subagents hat KEINE user-Spalte) — Jede Referenz BLOCKT
  mit 409 + Counts, keine stillen Cascades (Mandat 2).
- `DELETE /api/projects/{id}`: `internal/deploy/projects_ssh.go:2625` —
  CASCADE-Familie dokumentiert (workspaces + deren Service-Keys werden
  widerrufen, containers FK-Cascade); ALLES andere (deployments, budgets,
  sdk_logs, security_events, sessions, subagents, vault_audit_log,
  vault_secrets, router_aliases, pinned consumer_keys) BLOCKT mit 409.
- OPA-Gate: `internal/policy/policy.go` (`/api/users`-Prefix +
  Ein-Segment-Match für genau DELETE /api/projects/{id}).
- Tests: `internal/store/users_delete_test.go` (echte Tables, keine Mocks).
- API_DOCS: `/api/users/{id}` (API_DOCS.md:768) + `/api/projects/{id}`
  (API_DOCS.md:992) + RBAC-Sektion (:682-694).

**Frontend** (dieser Branch, worktree `task-071-ghost-data-delete`):
- AdminUsersPage: Delete-Button je User-Row + informed Confirm-Dialog
  (App-Dialog-Muster, kein window.confirm) — sagt exakt: nur die User-Row
  wird entfernt; Referenzen verweigern mit 409 + Liste (Dialog bleibt
  offen); Keycloak-Identität bleibt, Re-Login re-creiert die Row.
- ProjectsPage: window.confirm-Kette ersetzt durch EINEN informed Dialog;
  der echte `DELETE /api/projects/{id}` läuft VOR dem SSH-Sweep — bei
  403/409 bleibt alles sichtbar (ehrlicher DB-Zustand); Volume-Purge =
  separater Opt-in (Default: behalten); `projects-summary` invalidiert.
- i18n: 16 Keys in en.json + alle 60 Locales (de = echte Übersetzung,
  Rest = englischer Original-Spiegel wie der existierende Zustand);
  `check:i18n` grün (60 Locales, 1920 Keys).

**Live-Verifikation** (eigene Worktree-Instanz auf :19099 gegen die echte
DB + Keycloak, Stack-Code von 90b2c71 + RBAC-Fix):
- T1 DELETE /api/users/{id} als Keycloak-Non-Admin → **403** „admin
  permission required — denied by policy (source: keycloak, roles:
  default-roles-jimesh, …)"
- T2 DELETE /api/projects/{id} als Non-Admin → **403**
- T3 unauthentifiziert → **401**
- T4 Admin DELETE referenz-freies Ghost-Projekt → **200** `{success, id}`
- T5 User mit Budget-Row → **409** mit `details:{workspaces:1,
  projectUserBudgets:1,…}` + Message „still referenced by: project
  budgets (1), workspaces (1) — …no silent cascade (Mandat 2)"
- T5c Projekt mit Budget-Row → **409** mit vollem Survey-Details-Body
- T7 Projekt mit Workspace → **200** `{success, removedWorkspaces:
  ["task071-ws"]}` — Workspace-Row danach DB-verifiziert weg (count 0)
- T8 Ghost-User ohne Referenzen → **200** `{ok, id, deleted:true}`
- T9 unbekannte IDs → **404** mit Namen; T10 non-DELETE → **405**
- `tsc --noEmit`: identisch zur Baseline (205 pre-existing Noise-Errors,
  0 in den geänderten Dateien); vitest wie Baseline (5 pre-existing
  chart-axis-Failures); `go vet ./...` clean; `go test ./internal/auth/`
  3× grün, `internal/store` grün (users_delete_test gegen echte DB).

**KRITISCHER NEBENFUND (live gefunden + gefixt in diesem Branch):**
RBAC-Bypass in der Auth-Middleware (`internal/auth/auth.go`): eine per
OIDC gemintete Dashboard-Session ist kein Keycloak-JWT → `claims=nil` →
`requestIdentity(nil)` = `("password", ["admin"])` — JEDER Keycloak-User
mit Dashboard-Login passierte das OPA-Admin-Gate als Operator
(Live-Beweis: der Test-User löschte eine User-Row mit 200 statt 403).
Fix: der Session-Marker (Callback) führt jetzt sub + realm roles
(`kcSessionMarker`), die Middleware resolved den Marker zurück in
synthetische Claims; Legacy-Marker (bare sub) = Null Rollen = fail-closed
(Admin-Mutationen verweigert bis Re-Login). Betroffen war das GANZE
Admin-Gate, nicht nur TASK-071.

**Offen (andere Lanes):** pre-existing Flaky-Test
`TestRenderNftScriptAcceptRule` (map-Iterations-Order in
`renderNftScript`, internal/security/firewall_provider.go:250) —
konstruktionsbedingt nicht deterministisch, ~1/6 Fail-Rate, kein
Zusammenhang mit diesem Task.
