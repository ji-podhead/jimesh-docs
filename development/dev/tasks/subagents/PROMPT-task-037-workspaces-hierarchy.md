# TASK-037 — Workspaces-Hierarchie: Project → per-User-Workspace → Deployments

**Status:** ✅ DONE (13.9.2026, Subagent-Session 21:59+ — implementiert,
gebaut, getestet, live-verifiziert; Details + Checkoffs:
`docs/sprints/SPRINT-37-WORKSPACES-HIERARCHY.md`). Ursprung: Operator 13.9. +
Sprint-34-Rename user-RBAC-space; neuer User onboarded → eigener Workspace,
selbes Projekt; eigener User provisionieren bei Bedarf, ansonsten worktree")
+ Sprint-34-Rename + E4/E5-Entscheidungen.

## Grundmodell (Operator-Approved über die Sprint-35/36-Doku hinaus):

```
Project (Shared: Codebase/Chains/DB-Schema/Budget — Team-Ebene)
  └── Workspace (PER-USER-RBAC-SPACE: owner_user_id, preset, container,
                 service-key, session) — Worktree des Projekts
        └── Deployments/Containers (Kind des Workspace, auf SSH-Target)
```

- **Worktree-Stufe:** die Deploy-Engine hat bereits Task-Worktree-Isolation
  (projects_ssh.go:881-919, mount per-task `<workspace>/.jimesh/tasks/<id>`)
  → GENERALISIERE zu per-user-Worktree (`<repo>/.jimesh/worktrees/<wsId>`,
  mount statt Task-Worktree wenn owner_user_id gesetzt).
- **Onboarding:** neuer User in Projekt → automatisch Workspace-Row +
  Worktree + Service-Key + Session (bei Bedarf — kein Shared-Container).
- **RBAC:** Projekt-Rollen (Keycloak/OPA) → was darf der User; Workspace
  → sein eigener Ausführungsraum; Budget-Cascade Team→Projekt→User
  (TASK-016-Entwurf) greift am Workspace an.
- **Discovery-Verkabelung:** App-Discovery (Sprint 8) ordnet Containers
  automatisch ihrem Workspace/Project zu (Workspace-Row als Parent für
  discovered Containers).

## Aufgabe

1. **Store:** `workspaces`-Tabelle (id, project_id, owner_user_id,
   preset, container_id, session_id, ssh_target, worktree_path, status,
   created_at) + CRUD + ensure-Workspace-per-user (idempotent).
2. **Deploy-Integration:** projects_ssh.go — Workspace-Parameter
   (owner_user_id optional; Worktree-Path vom Workspace statt Task);
   Backward-compat: ohne Workspace verhält es sich wie heute.
3. **Routes:** `POST /api/workspaces` (ensure per-user),
   `GET /api/workspaces?project=`, `DELETE /api/workspaces/{id}` —
   Project-/User-RBAC-Check via OPA/Keycloak-Middleware (bestehende
   Policy-Engine).
4. **App-Discovery-Verkabelung:** containers-Rows bekommen
   `workspace_id` (ALTER, default ''); Discovery schreibt es.
5. **Migration-Sicherheit:** alle ALTERs idempotent (store.go-Muster).
6. **Doku im selben Change:** API_DOCS (neue Routes), Sprint-37-File
   erzeugen (`docs/sprints/SPRINT-37-WORKSPACES-HIERARCHY.md`) mit WP-
   Struktur + Checkoffs, BACKLOG-Spiegel.

## Regeln

- CGO_ENABLED=0, pure Go, keine neue Dependency
- No-Mock (Mandat 2) — echte Tabelle, echte Routes, echte Worktree-Creation
- Backward-compat-Pflicht: bestehende Projekte ohne Owner weiterlaufen lassen
- Build: make go-build && make go-vet (Container), gofmt clean, make go-test
  (nur deine neuen Tests gegen jimesh_test-DB)
- GIT: nur eigene Files (explizite Pfade), NIEMALS git add -A, NICHT pushen
- API_DOCS.md: NUR DU darfst es anfassen in dieser Runde (032/034/035 sind
  gemerged — keine Konflikte); Router/Edge-Doku kommt aus TASK-033-WIP
- Live-Verify wenn Stack kooperiert (curl mit Service-Key auf
  /api/workspaces), sonst ehrlich dokumentieren

## Umsetzung 13.9. (diese Session — API_DOCS.md NICHT berührt, Session 050
besitzt es diese Runde; Routen hier + im Sprint-37-File dokumentiert)

1. **Store** (`internal/store/workspaces.go`, NEW; + `users.go`/`rbac.go`/
   `consumer_keys.go`-Helfer; `store.go`-Migration):
   `workspaces`-Tabelle (alle 10 Spalten) + UNIQUE `(project_id,
   owner_user_id)` + CRUD + `GetWorkspaceByOwner` (Ensure-Sonde, (nil,nil)
   = keiner). `containers.workspace_id` ALTER (default '') + Index;
   `SaveContainerForWorkspace` (Wrapper `SaveContainer` bleibt für
   internal/provisioning). `SetSessionContainer` bindet die Ensure-Session
   an den echten Container (trust_class 'provisioned').
2. **Deploy** (`internal/deploy/workspaces.go`, NEW; `projects_ssh.go`):
   `userWorktreePath` = `<repo>/.jimesh/worktrees/<wsId>`, Branch
   `jimesh/ws-<wsId>`, `EnsureUserWorktree` idempotent (erhaltener Branch
   wird an SEINER Spitze wieder ausgecheckt — User-Commits überleben),
   `RemoveUserWorktree` confirm-gated. `DeployRequest.WorkspaceID`/
   `OwnerUserID`: executeDeploy mountet den User-Worktree (von der ROW),
   loud-miss-Guard wie bei Tasks, `nameKey` isoliert Container-Namen,
   Sweeps, Volume (`jimesh-dsh-data-<wsId>`), Egress-Netz + Socket-Guard.
   Ohne `workspaceId`: byte-identisch vorher (Backward-compat ✓).
   Undeploy/Redeploy-Pre-Sweep/Delete sind Workspace-aware.
3. **Routes** (`internal/gateway/workspaces.go`, NEW; Registry in
   `gateway.go`; RBAC: `/api/workspaces` in `policy.IsAdminMutation` →
   eingebettete OPA):
   - `POST /api/workspaces` — ensure per-user (idempotent): Row + Worktree
     + Session + Service-Key (Plaintext einmalig); 404 unbekanntes
     Projekt/User, 403 disabled, 400 Preset/Validation, 422 kein Git-Repo.
     Body: `{projectId, ownerUserId, preset?, workspacePath?, nodeHost?,
     nodeUser?, nodePort?, authMethod?, sshPassword?, sshKey?}` — Node-
     Fallback aus der Projekt-Row (nur Nicht-Secrets), Credentials nie
     gespeichert. Response: `{success, created, workspace, worktree,
     serviceKey?, notice}`.
   - `GET /api/workspaces?project=<id>` — Rows aus PG (leer = ehrliches
     `[]`).
   - `DELETE /api/workspaces/{id}` — Row + Service-Key-Revoke immer;
     Worktree nur mit `confirm=true` (sonst Response-Notiz mit Pfad+Branch
     für manuelle Bergung — Persistenz-Mandat).
4. **Discovery** (`handleProjectsDiscover`): `jimesh-framework-<wsId>-*`
   wird über die workspaces-Tabelle aufgelöst → Container-Row bekommt
   `workspace_id` + echte Projekt-ID; Response führt `workspaceIds` pro
   Projekt.
5. **Tests**: `store/workspaces_test.go` (echte jimesh_test-DB, Lifecycle),
   `deploy/workspaces_test.go` (echtes Git: Idempotenz, Commit-Erhalt,
   Remove, 422/400-Fälle), `policy_test.go` erweitert. Alle grün;
   `make go-build` Exit 0.
6. **Live-Verify** (Operator-Session, Backend via `make restart-backend`
   mit neuem Code): GET → 200 `{"count":0,...}`, POST-Validierungen 400/404,
   DELETE 404, ohne Auth 401; Migration auf Real-DB geprüft (Tabelle +
   Unique-Index + containers.workspace_id + Index). Voller Ensure-Deploy
   bewusst NICHT gegen die Real-DB gespielt (würde echte Rows + echten
   Worktree im Operator-Repo anlegen) — durch Tests abgedeckt.

**Bekannte Fremdfehler im Baum (NICHT TASK-037):** `make go-vet` bricht in
`cmd/jimesh-router/firewall_test.go` + `internal/security/
firewall_rules_test.go` (Parallel-Agent 050, in-flight); ai/agents-Tests
wollen hardcoded 127.0.0.1:5432 (Umgebung).
