# SPRINT-47 - Projekt-scoped Developer-Rolle + Gateway-CLI-Befehle

Ausgelöst durch: Operator-Auftrag 18.9.2026 (Security-Engineer-Runde) auf
Basis von `docs_dev/research/agent_firewalls_article.md` §8: JiMesh kennt
zwei menschliche Identitäts-Tiers (Operator-Passwort = impliziter Voll-Admin,
jeder Keycloak-Identity mit `jimesh-admin` = Voll-Admin auf ALLE Projekte),
aber KEINE projekt-scoped Entwickler-Rolle. Zusätzlich: die im letzten
Forum-Post genannten Gateway-Befehle (`lcore`, `llm mesh`, `mesh`,
`firewall`) fehlen als CLI-Oberfläche.

Hinweis zur Lage: der Sprint lebt in `docs_dev/sprints/` (dort liegen die
58 bestehenden Sprint-Files - `docs/sprints/` existiert im Repo nicht;
CLAUDE.md nennt den Pfad generisch, die Repo-Wirklichkeit ist docs_dev).

## Ziel

1. Ein menschlicher Dev kann auf BESTIMMTE Projekte beschränkt werden:
   Keycloak-Realm-Rolle `jimesh-dev` + `project_roles`-Zeile (subject →
   project, role `developer`) → darf Mutationen auf SURFACES SEINES
   Projekts, sonst nichts. Voll-Admin (Operator-Passwort, jimesh-admin)
   bleibt UNVERÄNDERT bestehen.
2. jimeshctl bekommt die vier genannten Befehle als echte CLI-Unterbefehle,
   die NUR gegen wirklich existierende Gateway-Routen laufen (kein erfundener
   Endpunkt, kein Mock).

## Work Packages

- **WP1 - Plan + Backlog-Spiegel.** Dieses File + `docs_dev/backlog/BACKLOG.md`
  (Top-Eintrag, [~]).
- **WP2 - `project_roles`-Tabelle.** `internal/store/project_roles.go`:
  `EnsureProjectRolesTable` (CREATE TABLE IF NOT EXISTS, id TEXT PK,
  keycloak_sub, project_id, role DEFAULT 'developer', granted_by,
  created_at, UNIQUE(keycloak_sub, project_id, role)) + Accessoren
  (GrantProjectRole, RevokeProjectRole, ListProjectRoles,
  ProjectRolesForSub, ProjectRoleExists). Migration eingehängt in
  `migrate()` (idempotent, Ensure-Pattern wie EnsureWorkspacesTable,
  store.go).
- **WP3 - OPA-Projekt-Gate.** Neue Policy-Modul-Datei
  `internal/policy/policies/project-roles.rego` (`data.jimesh.projectaccess.allow`,
  viertes Modul auf DERSELBEN Engine - E-Policy "eine Engine, nicht zwei",
  Muster wie capabilities.rego + headscale.rego) + Go-Gate
  `internal/policy/project_gate.go` (eigener Prepared Query, Env-Override
  `JIMESH_PROJECT_ACCESS_POLICY`, fail-closed). Eingehängt in
  `internal/auth/auth.go` Middleware: bei admin-Mutation zuerst der
  bestehende Voll-Admin-Check (rbac.Allow), bei keycloak-Identity ohne
  Treffer zusätzlich das Projekt-Gate mit den serverseitig aus dem VERIFIED
  sub geladenen Grants. Rego-Regel: keycloak + `jimesh-dev` + Grant auf
  project_id == Pfad-Segment + Mutation unter `/api/projects/{id}/…`
  mit mind. einem Segment NACH der Projekt-Id. Explizit NICHT erlaubt für
  devs: DELETE/PATCH `/api/projects/{id}` selbst (Projekt-Row), alles
  außerhalb `/api/projects/{id}/`, alle anderen Admin-Surfaces
  (users/budgets/vault/workspaces/subagents/firewall rules/project-roles).
- **WP4 - Keycloak-Realm-Rolle `jimesh-dev`.**
  `internal/auth/keycloak_oidc.go`: `ensureProjectDevRealmRole` (idempotent,
  analog ensureRBACRealmRole) in BootstrapKeycloak - Rolle wird erzeugt,
  aber NICHT automatisch zugewiesen (Zuweisung ist Operator-Aufgabe im
  Keycloak-Admin; der DB-Grant ist die zweite, unabhängige Schwelle).
- **WP5 - Gateway-Routen `/api/project-roles`.** Neue Datei
  `internal/gateway/project_roles.go`:
  GET (list, ?project_id= filter, session-lesbar),
  POST (grant: projectId + role:'developer' + keycloakSub | email→Auflösung
  über users-Tabelle; validiert Project/Existenz ehrlich, 404 statt orphan),
  DELETE `/api/project-roles/{id}` (revoke).
  POST/DELETE sind Admin-Mutationen: "/api/project-roles" in
  `policy.IsAdminMutation` (policy.go, adminPrefixes).
- **WP6 - jimeshctl-Befehle.** `src/examples/jimeshctl`: `lcore`
  (GET /api/nodes/health - der Route, die nodes_health.go explizit als
  Portierung des st-2-lcore health/manager dokumentiert), `llm-mesh`
  (+ Alias-Wortfolge `llm mesh`: models/chains/profiles/edges/scores →
  GET /v1/models, /v1/chains, /api/profiles, /api/fallback/edges, /v1/score),
  `mesh` (nodes/users/keys → GET /api/networks/nodes|users|preauthkeys,
  key-mint → POST /api/networks/preauthkeys), `firewall`
  (status/rules/grant/revoke → GET /api/firewall/status, GET/POST/DELETE
  /api/firewall/rules). Jede gemappte Route existiert in gateway.go /
  networks.go / security.go RegisterFirewall - verifiziert gegen den Code.
- **WP7 - API_DOCS.md.** Neue Routen + CLI-Abschnitt aktualisiert (gleiches
  Change, Dokumentations-Mandat).
- **WP8 - Verifikation + Commit.** `make go-vet`, `make check-backend`
  (Stack via `make up` falls nötig), Smoke-Test der Routen via curl,
  Commit auf `feat/security-engineer-gateway-commands` (nie direkt auf main).

## Akzeptanzkriterien

- [x] make go-vet grün; check-backend-Äquivalent grün (go vet ./... &&
      go test ./... -count=1, 19/19 Packages, Throwaway-DB jimesh_test;
      Lauf über --network host statt jimesh-net, Begründung in WP8 - der
      jimesh-net-Pfad ist aktuell hostseitig kaputt, reproduziert an
      sauberem HEAD ohne meine Aenderungen).
- [x] Gate-Entscheidungen verpinnt in project_gate_test.go (16 Cases):
      jimesh-dev+Grant erlaubt NUR /api/projects/{X}/{sub}-Mutationen;
      DELETE /api/projects/{X} (Row), POST /api/projects, Projekt Y,
      POST /api/project-roles, POST /api/users, /api/vault/* -> 403-Deny.
      (E2E über echtes Keycloak-JWKS lief hier nicht - Smoke über Operator-
      Session deckt die Routen, den Store und die ehrlichen Fehlerfälle.)
- [x] Operator-Passwort und jimesh-admin Identity: unverändert Voll-Zugriff
      (Regel 1+2 im rego; alle bestehenden Tests der touched Packages grün).
- [x] project_roles überlebt Backend-Restart (PostgreSQL; Smoke-Lauf
      bestätigte Persistenz über Server-Neustart hinaus in derselben DB).
- [x] jimeshctl: alle vier Befehle laufen gegen reale Routen; jede benutzte
      Route ist in API_DOCS.md dokumentiert; kein erfundener Endpunkt.
- [x] Kein Em-Dash in neuem Text (grep-geprüft über alle neuen Dateien).

## Ergebnisse (Retrospektive - verifiziert gegen den Code, 18.9.2026)

- WP1: Plan + Backlog-Spiegel (dieses File; docs_dev ist gitignored - Repo-Konvention: interne Docs leben auf der Platte, nicht in git).
- WP2: src/backend/internal/store/project_roles.go (180 Z.): ProjectRoleDeveloper (Z. 31), ProjectRoleRow (Z. 34), EnsureProjectRolesTable (Z. 45, CREATE TABLE IF NOT EXISTS + columnExists-Nachzug), GrantProjectRole (Z. 70, Upsert; Re-Grant refresht granted_by, keine Duplikate via UNIQUE), RevokeProjectRole (Z. 98, ehrlicher not-found-Fehler), ListProjectRoles (Z. 119), ProjectRolesForSub (Z. 150), ProjectRoleExists (Z. 176). Migration-Hook: EnsureProjectRolesTable in migrate() (internal/store/store.go, direkt nach EnsureWorkspacesTable). Persistenz: PostgreSQL, kein Purge.
- WP3: internal/policy/policies/project-roles.rego (86 Z., package jimesh.projectaccess; allow-Regeln Z. 43/50/57; project_scoped_mutation Z. 72 verlangt mind. ein Segment NACH der Projekt-Id) + internal/policy/project_gate.go (122 Z.: ErrProjectGateFailClosed Z. 29, NewProjectGate Z. 61 mit JIMESH_PROJECT_ACCESS_POLICY-Override, Evaluate Z. 86 fail-closed) + Middleware-Weg internal/auth/auth.go: projectGate-Feld Z. 84, Gate-Load Z. 105-110, allowProjectScopedMutation Z. 135-172 (Grants vom VERIFIZIERTEN sub, fail-closed bei Store-Fehler), Aufruf Z. 866 NUR wenn der voll-Admin-Check fehlschlug und source==keycloak. Das Firewall-Inline-Gate (auth.go, POST/DELETE /api/firewall/rules) bleibt operator-only.
- WP4: internal/auth/keycloak_oidc.go: ensureProjectDevRealmRole Z. 342-368 (idempotent; jimesh-dev wird angelegt, aber NIEMANDEM automatisch zugewiesen), Aufruf in BootstrapKeycloak Z. 325-331.
- WP5: internal/gateway/project_roles.go (147 Z.): registerProjectRoles Z. 34, list Z. 52, grant Z. 75 (ehrliche 404 bei unbekanntem Projekt / bei E-Mail ohne User-Row, 400 bei fremder Rolle - nur "developer" existiert), revoke Z. 128 (404 bei unbekannter Id). Registrierung internal/gateway/gateway.go Z. 265; Admin-Präfix "/api/project-roles" in internal/policy/policy.go Z. 87; GetUserByEmail in internal/store/users.go. Store-Test: internal/store/project_roles_test.go (Lifecycle + Empty-Input, skip-honest ohne DB).
- WP6: src/examples/jimeshctl: llm_mesh() Z. 57, mesh_cmd() Z. 77, firewall_cmd() Z. 107, Case-Branches Z. 250-262 (lcore, llm-mesh, llm+mesh Zwei-Wort-Form, mesh, firewall), help Z. 165-184. Alle gemappten Routen existieren real: /api/nodes/health (nodes_health.go, als st-2-lcore-Port dokumentiert), /v1/models, /v1/chains, /api/profiles, /api/profiles/active, /api/fallback/edges, /v1/score (gateway.go), /api/networks/nodes|users|preauthkeys|preauthkeys/expire|policy (networks.go), /api/firewall/status|rules (internal/security/firewall.go RegisterFirewall). /api/firewall/report|config bewusst NICHT in der CLI (kind=service-Router-Kanäle, keine Dashboard-Session).
- WP7: docs/API_DOCS.md: Sektion "Project-Scoped Developer Role (SPRINT-47)" (Tabelle für alle 3 Routen mit Payload/Response/Statusfällen) + CLI-Beispiele im Reference-clients-Abschnitt.
- WP8: Verifikation: make go-vet GRUEN (docker-golang-Fallback, exit 0). check-backend-Äquivalent (go vet ./... && go test ./... -count=1 gegen die Throwaway-DB jimesh_test): 19/19 Packages ok, 0 FAILs. Zwei ehrliche Abweichungen: (a) Der Makefile-Lauf nutzt --network jimesh-net; in der aktuellen Host-Umgebung erreichen NEUE Container auf jimesh-net den Postgres nicht (dial timeout; auch der Backend-Container selbst: "dial tcp 172.21.0.2:5432: connect: connection timed out" in docker logs jimesh). Reproduzierbar an einem sauberen HEAD-Worktree OHNE meine Aenderungen -> identischer Gate-Lauf über --network host gegen denselben Postgres (Host-Mapping 127.0.0.1:5432) und dieselbe Throwaway-DB. (b) Dabei zwei VORHANDENE Defekte gefunden und behoben (Bonus). Live-Smoke: Binary (CGO_ENABLED=0) gegen jimesh_test auf Port 19999: /api/project-roles 401 ohne Session; Setup+Session ok; GET leere Liste; Grant-404 bei unbekanntem Projekt; Grant-Erfolg + Re-Grant-Refresh; 400 bei fremder Rolle; Liste mit Grant; Revoke 200; Revoke-Wiederholung 404. jimeshctl lcore liefert echte /proc-Werte, llm mesh chains echte DB-Chains, mesh nodes ehrliche 503 (HEADSCALE_URL fehlt), firewall status ehrlicher leerer State. E2E des jimesh-dev-Pfads braucht Keycloak (JWKS) und lief hier nicht - die Gate-Entscheidung ist in project_gate_test.go (16 Cases) verpinnt.
- Bonus (vorhandene Defekte, im Lane-Umfeld behoben): (1) internal/security/firewall_provider.go renderNftScript war NICHT deterministisch (chainNames() liest Maps in zufälliger Reihenfolge; TestRenderNftScriptAcceptRule schlug zufällig fehl). Fix: sortierte known-Chains-Reihenfolge; security-Suite 3x grün. (2) internal/network/egress.go ResolveRegistries gab bei DNS-Ausfall eine hart-kodierte CDN-IP-Liste mit nil-Fehler zurück (Mandate-2-Verstoß, den der eigene Test TestResolveRegistries_EmptyResultIsAnError anmahnt; der deploy-Caller buildEgressRuleset dokumentiert selbst den loud-failure contract). Fix: ehrlicher Fehler statt erfundener Allowlist; network+deploy-Suiten grün.
- Wichtige Nutzwahrheit (keine Beschönigung): /api/projects/{id}/<sub>-Mutationen sind heute NICHT admin-gated (policy.IsAdminMutation gate-t nur DELETE /api/projects/{id} als Ein-Segment-Match). Das Projekt-Gate wird deshalb auf der ALLOW-Seite erst scharf, wenn eine Projekt-Sub-Surface in den Admin-Gate wandert (nächster Schritt, siehe Offen); auf der DENY-Seite ist es ab sofort für jede Admin-Mutation einer Nicht-Admin-Keycloak-Identity aktiv (voll-Admin-Check fällt, Projekt-Gate entscheidet, Log-Zeile benennt es).

## Offen (ehrlich, nicht in diesem Sprint)

- Posture-Change: die deploy/redeploy/undeploy-Familie (POST
  /api/projects/deploy|redeploy|undeploy, Body projectId) ist heute nur
  session-gated - jede Workspace-Session kann reale Deploys auslösen. Sie
  in den Admin-Gate zu nehmen (mit serverseitig gelesenem body.projectId
  als input.target_project im Projekt-Gate) ist der nächste Schritt, aber
  eine bewusste Posture-Änderung für ALLE Workspace-User - Absprache mit
  dem Operator, keine Einbahnentscheidung (der Kommentar in policy.go
  TASK-071 hat genau das damals explizit vermieden).
- Workspace-Ensure (POST /api/workspaces) für Projekt-Devs: braucht
  serverseitige Bindung body.project_id in den Grants des callers - offen.
- Frontend-Oberfläche für die Grants (Projekt-Mitglieder-Tab) - offen.
- Agent-Self-Spawn (Research §8, Lücke 2): POST /api/subagents bleibt
  Admin-only und ist NICHT auf der Service-Key-Whitelist
  (internal/auth/auth.go, Middleware-Service-Key-Branch); Scope-Vererbung/
  Verschmälerung beim Spawn existiert nicht (spawn.go
  validateGrantableCapabilities prüft nur Risk-Klassifikation, nie
  Parent-Grants). Beides ist bewusst NICHT hier implementiert - eigenes
  Work Package, Entwurf folgt.
- Vault-/Budget-Oberflächen für Projekt-Devs (read-only-Projekt-Scoping
  existiert dort bereits über service keys, aber nicht über humans): offen.
- Host-Netzwerk-Befund (Umgebung, nicht Repo): Container auf jimesh-net
  erreichen den Postgres-Container derzeit nicht (auch nicht der Backend-
  Container); Ursache liegt außerhalb des Repos (Host-Firewall/Netzwerk,
  Mandate-12-Territorium) und gehört dem Operator.
