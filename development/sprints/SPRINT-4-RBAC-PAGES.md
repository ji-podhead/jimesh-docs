# SPRINT 4: RBAC-PAGES (Stitch-Umsetzung)

| | |
|---|---|
| **Status** | Abgeschlossen — verifiziert (siehe Verifikation) |
| **Ziel** | Teams/Bindings- und User-Management-Flaechen aus den Stitch-Designs (design-assets/stitch/jimesh-teams-resource-bindings.html, jimesh-user-management.html) in echte Admin-Flaechen uebersetzen — reale Datenstroeme, ehrliche Leeren, keine Mocks |
| **Dauer** | 1 Tag |

## Plan (vor Code — Mandat 1)

**Ausgangslage:**
- POST /api/users existiert REAL (internal/security/users.go: erstellt Keycloak-Realm-User
  username/email/password + Rolle admin|operator|viewer, upsertet die lokale Row) — hatte
  aber KEIN Frontend.
- GET /api/team-bindings existiert NICHT (verifiziert: kein HandleFunc in src/backend) —
  das Bindings-Panel ist deshalb v1 UI-only mit TODO.
- Die echten Team-/TeamMember-Datenstroeme sind die React-Query-Hooks in TeamsPage.tsx
  (/api/teams, /api/team-members); die Resource-Inventare (SSH-Targets, Workspaces,
  Projects, Apps) kommen aus dem SSOT-Store (lib/store.tsx) und liefern die Anzeige-Namen.

## Arbeitspakete

### WP1: TeamsPage — Resource-Bindings-Tab pro Team (v1 UI-only)
- [x] Neues Panel components/rbac/team-bindings-panel.tsx: Tabelle aus dem Design
      (Resource-Type-Badge mit Icon, Resource-Name, Access-Level read/write/admin,
      Vererbungs-Badge direct/inherited), Suche + Typ-/Level-Filter, ehrlicher Empty-State
      (Route fehlt), Add-Binding-Button disabled mit Begruendung.
- [x] TeamResourceBinding-Shape als v1-Vertragsvorschlag im TODO-Kommentar
      (GET /api/team-bindings?teamId=... — Route + Backend-Contract offen, Backlog B15).
- [x] TeamsPage: Detail-Sektion des selektierten Teams bekommt Tabs (SegmentedControl:
      Members | Resource Bindings) — Members-Tab ist der bestehende echte Member-Strom,
      Bindings-Tab das neue Panel. SSOT-Namen-Resolver eingebaut.
- [x] Render-Test: ehrlicher Empty-State (keine erfundenen Rows), Filter vorhanden.

### WP2: AdminUsersPage — Create-User-Dialog (echtes POST /api/users)
- [x] Dialog (Base-UI/shadcn-Dialogmuster des Repos): username (optional — Backend faellt
      auf Email zurueck), email*, password*, Role-Dropdown admin/operator/viewer (exakter
      Backend-Contract). Info-Callout benennt die Keycloak-Synchronisation.
- [x] Submit ruft POST /api/users REAL auf; Erfolg: toast + users-Cache invalidiert;
      Fehler: Inline-Fehlermeldung im Dialog (Backend-Message woertlich, 403 -> Policy-Hinweis),
      Dialog bleibt offen, meta.silenceToast gegen Doppel-Toast.
- [x] Client-Validierung: email/password pflicht (Backend-Contract), sonst nichts erfunden.

### WP3: AdminUsersPage — User-Tabelle nach Design
- [x] Avatar (Initialen aus displayName/email), Username (displayName, Fallback
      Email-Localpart), Email, Role-Badges, Status-Badge (Active/Disabled), Created, Actions.
- [x] Role-Badge: die lokale users-Row traegt KEINE Realm-Rolle (store/users.go UserRow) —
      die Badges zeigen ehrlich die tatsaechlichen Projekt-Rollen des Users aus dem bereits
      geladenen GET /api/budgets-Index (keine erfundene Realm-Rolle); Realm-Rollen-Anzeige
      kommt mit einem Backend-Contract (Backlog B16).
- [x] Actions bleiben die echten: Projekt-Rollen-Expand, Enable/Disable-Switch
      (POST /api/users/{id}/enabled), Delete (DELETE /api/users/{id}).
      Edit/Reset-Password-Buttons aus dem Design gibt es nicht als Routes -> nicht gerendert.

### WP4: i18n + Docs
- [x] Neue Keys (admin.usersCreate*, admin.usersUsername/usersRolesColumn/usersStatus*,
      teams.tab*/bindings*) in en.json + alle 60 Locales (de uebersetzt, Rest
      Englisch-Fallback nach Repo-Praezedenz via Backfill-Skript).
- [x] API_DOCS.md: POST /api/users (Create) nachdokumentiert — Route existierte im Backend,
      fehlte in der Doku (Bug nach Mandat 1).
- [x] BACKLOG.md: B15 (team-bindings Route) + B16 (Realm-Rolle im users-Contract) gespiegelt.

### WP5: Team-Resource-Bindings Backend (B15 — Nachzug zu WP1)

WP1's Panel schrieb den Contract vor (TeamResourceBinding-Shape im
TODO-Kommentar); WP5 liefert die Route dahinter nach.

- [x] store/team_bindings.go: TeamResourceBinding (Contract-Shape, camelCase),
      geschlossene Sets ssh_target/workspace/project/app × read/write/admin,
      EnsureTeamBindingsTable (team_resource_bindings: id, team_id
      FK→teams ON DELETE CASCADE, resource_type, resource_id, resource_name,
      access_level, inherited, created_at, UNIQUE(team_id, resource_type,
      resource_name)), ListTeamBindings, CreateTeamBinding (idempotenter
      Upsert auf team+type+name — Re-Create refreshed, nie Duplikat),
      DeleteTeamBinding (ehrlicher Fehler bei unbekannter Id), TeamExists.
- [x] migrate(): EnsureTeamBindingsTable NACH EnsureRBACTables (FK-Ziel
      teams(id)) — store.go.
- [x] gateway/team_bindings.go: GET /api/team-bindings?teamId=... (400 ohne
      teamId, unbekanntes Team = ehrliche Leere), POST /api/team-bindings
      (404 bei unbekanntem Team — keine Waisen-Zeilen, 400 bei fremdem
      resourceType/accessLevel), DELETE /api/team-bindings/{id} (404 bei
      unbekannter Id). Registriert in gateway.go New() — nur dort existiert
      die Route (Architektur-Mandat).
- [x] policy.go: "/api/team-bindings" in IsAdminMutation — Binding anlegen/
      loeschen ist die Privilegien-Grenze (GET bleibt session-lesbar).
- [x] API_DOCS.md: alle 3 Routen dokumentiert (Mandat 1); BACKLOG.md B15
      erledigt gespiegelt.
- [x] Store-Test team_bindings_test.go (Lifecycle + Validation; skip ohne
      Postgres nach Repo-Praezedenz project_roles_test.go).

**WP5-Verifikation (Mandat 6):**
- Build+Vet: `docker run --rm -v .../src/backend:/src -w /src -v
  /home/ji/go/pkg/mod:/go/pkg/mod -v jimesh_go-build:/root/.cache/go-build
  -e CGO_ENABLED=0 golang:latest sh -c 'go build ./... && go vet ./...'` —
  **exit 0, ohne Ausgabe**.
- Store-Tests REAL gegen die Throwaway-DB `jimesh_test` (Stack up;
  `--network host`, weil die Sandbox Inter-Container-Traffic auf
  `jimesh-net` blockt): `go test ./internal/store/ -run TestTeamBinding -v`
  — **TestTeamBindingLifecycle PASS (0.53s) + TestTeamBindingValidation
  PASS (0.07s)**.
- Volle Suite `go test ./...` (gleiche DB): **18 Pakete ok**; 3 Pakete
  build-fail (cmd/server, deploy, gateway) durch die PARALLEL laufende
  Session (deren uncommittetes deploy/ssh_explore.go: `undefined: String`)
  — nicht B15-Code; gateway baut standalone gruen.
- Historie: 50a4494 (Parallel-Session) committete gateway/team_bindings.go,
  policy-Prefix und den migrate-Hook, aber NICHT store/team_bindings.go —
  HEAD kompilierte ohne sie nicht. WP5-Nachzug (dieser Commit) liefert die
  fehlende Store-Datei + Tests nach und repariert den Build.

## Akzeptanzkriterien
- tsc --noEmit -p tsconfig.app.json: 0 Fehler in den geaenderten Dateien.
- npm run test (vitest + check-i18n): gruen.
- Kein Mock/Mogel-UI: Bindings leer + Begruendung; Create-User real; Badges nur aus echten Daten.
- Commit + Push auf feat/security-engineer-gateway-commands.

## Referenzen
- design-assets/stitch/jimesh-teams-resource-bindings.html (+PNG)
- design-assets/stitch/jimesh-user-management.html (+PNG)
- src/backend/internal/security/users.go (POST /api/users), internal/security/rbac.go
- src/frontend/src/lib/store.tsx (SSOT), src/frontend/src/lib/api.ts

## Verifikation (Mandat 6 — ehrlich, mit exakten Kommandos)
- tsc: `cd src/frontend && npx tsc --noEmit -p tsconfig.app.json` — **0 Fehler in
  den geänderten Dateien** (views/TeamsPage.tsx, views/AdminUsersPage.tsx,
  components/rbac/team-bindings-panel.tsx + beide Testdateien). Der Repo-Bestand
  hat 245 vorexistierende Fehler in 35 NICHT berührten Dateien
  (chain-mesh-graph 108, FallbackPage 32, keys/* …) plus eine kaputte UNTRACKED
  Datei components/ui/tabs.tsx (Syntaxfehler Zeile 47 — gehört nicht zu diesem
  Sprint). Bestands-Rauschen, hier nicht angerührt.
- Tests: `cd src/frontend && npm run test` — **29 Dateien / 293 Tests grün**,
  inkl. der 8 neuen (4x AdminUsersPage Create-User-Contract inkl. echtem
  POST-Body, Inline-Fehler, Client-Validierung; 4x TeamBindingsPanel
  Render-Contract inkl. ehrlichem Empty-State) + `check:i18n` grün
  (60 Locales, 2301 Keys).
- Live-Smoke von POST /api/users: NICHT ausgeführt — der Stack lief in dieser
  Session nicht. Der Backend-Handler (internal/security/users.go) ist
  unverändert; der Frontend-Contract ist im Vitest gegen das echte Wire-Shape
  abgedeckt (Erfolg, Inline-Fehlertext wörtlich, kein POST bei fehlenden
  Pflichtfeldern).
