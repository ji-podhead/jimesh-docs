# SPRINT-37 — Workspaces-Hierarchie: Project → per-User-Workspace → Deployments

**Quelle:** Operator-Entscheid 13.9.2026 — Deployments brauchen einen
User-RBAC-Space: neuer User onboarded → EIGENER Workspace, aber dasselbe
Projekt. Lösung (Operator): **BEIDES** — per-User-Provisionierung
(Container+Key+Session) **plus** Worktree-Stufe. Die Deploy-Engine hat
bereits Task-Worktree-Isolation (Sprint 20 WP7, TASK-014) — dieser Sprint
generalisiert sie zu per-User-Worktrees.

**Status:** ✅ implementiert & verifiziert (TASK-037, Subagent-Session,
13.9.2026) — Checkoffs unten sind gegen den Code verifiziert, nicht
aspiriert (Mandat 1.4).

## Ziel + Grundmodell (Operator-approved)

```
Project (Shared: Codebase/Chains/DB-Schema/Budget — Team-Ebene)
  └── Workspace (PER-USER-RBAC-SPACE: owner_user_id, preset, container,
                 service-key, session) — Worktree des Projekts
        └── Deployments/Containers (Kind des Workspace, auf SSH-Target)
```

- **Onboarding:** neuer User in Projekt → `POST /api/workspaces` = Row +
  Worktree + Service-Key + Session (idempotent, kein Shared-Container).
- **RBAC:** Workspace-Mutationen sind Admin-Actions (OPA, s.u.), GET bleibt
  für jede authentifizierte Identity lesbar. Budget-Cascade
  (Team→Projekt→User) greift am Workspace über den Service-Key
  (Sprint-35-WP1c-Attribution) — Wiederverwendung, kein neues Quota-Modell.
- **Isolation:** Container-Namen, State-Volume (`jimesh-dsh-data-<wsId>`),
  Egress-Netz, Socket-Guard keyen auf die Workspace-ID — zwei Owner desselben
  Projekts sehen/sweepen sich gegenseitig NICHT.

## Work Packages

### WP1 — Store: `workspaces`-Tabelle + CRUD + ensure-per-User
- [x] Tabelle `workspaces` (id, project_id, owner_user_id, preset,
      container_id, session_id, ssh_target, worktree_path, status,
      created_at) — `src/backend/internal/store/workspaces.go:29`
      (`EnsureWorkspacesTable`), idempotent im `migrate()`-Muster
      (`store.go:290` Aufruf).
- [x] Idempotenz-Anker: `CREATE UNIQUE INDEX idx_workspaces_project_owner
      ON workspaces(project_id, owner_user_id)`
      (`store/workspaces.go:43`) — ein Workspace pro (Projekt, User);
      `CreateWorkspace` scheitert laut am Duplikat, `GetWorkspaceByOwner`
      ist die Ensure-Sonde ((nil,nil) = noch keiner).
- [x] CRUD: `CreateWorkspace`/`GetWorkspace`/`GetWorkspaceByOwner`/
      `ListWorkspaces(projectID|""=alle)`/`UpdateWorkspaceWorktreePath`/
      `SetWorkspaceSession`/`UpdateWorkspaceStatus`/
      `UpdateWorkspaceDeployed`/`DeleteWorkspace` (unknown id = Fehler,
      kein Stillschluss — Mandat 2).
- [x] `containers`-Rows bekommen `workspace_id` (ALTER, default '',
      `store.go:296` + Index `store.go:549`) — vor-TASK-037-Rows behalten
      exakt diese Form. `ContainerRow.WorkspaceID` +
      `SaveContainerForWorkspace` (`store.go`); `SaveContainer` ist ein
      dünnner Wrapper mit `workspace_id=''` → `internal/provisioning`
      (self-spawn) bleibt unberührt.
- [x] Helfer: `GetUserByID` (users.go), `SetSessionContainer` (rbac.go —
      bindet die Ensure-Session an den echten Container, trust_class
      'provisioned'), `ServiceKeyByWorkspace` (consumer_keys.go —
      Lookup/Revoke für ensure/delete).

### WP2 — Deploy-Integration: per-User-Worktree statt Task-Worktree
- [x] `internal/deploy/workspaces.go`: `userWorktreePath`
      (`<repo>/.jimesh/worktrees/<wsId>`), `UserBranchName`
      (`jimesh/ws-<wsId>`), `sanitizeWorkspaceID` (Pfad/Shell-Injection-
      Guard, reusing die Task-ID-Regeln), `EnsureUserWorktree`
      (idempotent: vorhandener Worktree = created:false NO-OP; verlorener
      Worktree + erhaltener Branch → Branch wird an SEINER Spitze
      ausgecheckt, User-Commits gehen NIEMALS verloren),
      `RemoveUserWorktree` (confirm-gated, idempotent, Branch-Löschung
      wird ehrlich berichtet).
- [x] `DeployRequest.WorkspaceID`/`OwnerUserID` + `UndeployRequest.
      WorkspaceID` (`projects_ssh.go:71-84, 107-119`).
- [x] `executeDeploy` (`projects_ssh.go:943-983`): Workspace-Validierung
      (unbekannt → 404, fremdes Projekt → 400, TaskID+WorkspaceID
      gegenseitig exklusiv → 400); Worktree-Path kommt von der ROW (Legacy-
      Rows: ableiten + persistieren); `agentMountPath` = User-Worktree;
      laut-miss-Guard wie bei Tasks (E6: fehlender Worktree bricht den
      Deploy ab, `projects_ssh.go:1003-1007`).
- [x] `nameKey` (`projects_ssh.go:917-921`): alle Container-Namen/Sweeps,
      das State-Volume, Egress-Netz + Socket-Guard keyen auf Workspace-ID
      statt Projekt-ID — ohne `workspaceId` byte-identisch zum alten
      Verhalten (Backward-compat-Pflicht erfüllt).
- [x] Persistenz nach Deploy: Container-Rows mit `workspace_id`,
      `UpdateWorkspaceDeployed` (container_id, ssh_target, status) +
      `SetSessionContainer` — Buchhaltungsfehler werden geloggt UND im
      Response als `workspaceRowUpdateFailed` berichtet, nie
      weggeschmiegelt.
- [x] Security-Note + Response-Felder (`workspaceId`,
      `workspaceWorktreePath`, `workspaceVolume`).
- [x] `handleProjectUndeploy` mit `workspaceId`: owner-scoped Sweeps
      (Container/Volume/Netz/Guard), WORKSPACE-Row wird `stopped`, die
      Projekt-Row behält ihren Status (andere User laufen evtl. noch).
- [x] `stopProjectContainers`/Redeploy-Pre-Sweep: `WorkspaceID`-aware
      (`stopSweepRequest.nameKey()`), damit ein Workspace-Redeploy nicht
      fremde Container stoppt.
- [x] `handleProjectDelete`: Workspaces des Projekts werden explizit
      entfernt + deren Service-Keys revoked (Response nennt die IDs).

### WP3 — Routes (Gateway) + RBAC (OPA)
- [x] `internal/gateway/workspaces.go`: `POST /api/workspaces` (ensure:
      Projekt MUSS existieren (404), Owner MUSS real+enabled sein (404/403),
      Preset-Validierung, Row + Worktree + Session + Service-Key — alles
      idempotent, Plaintext-Key genau EINMAL im Response), `GET
      /api/workspaces?project=`, `DELETE /api/workspaces/{id}`
      (Key-Revoke immer; Worktree nur mit `confirm=true`, sonst ehrliche
      Pfad/Branch-Notiz für manuelle Bergung — Persistenz-Mandat).
- [x] Registry: `gateway.go` (handleWorkspaces + handleWorkspaceDelete).
- [x] RBAC: `/api/workspaces` in `policy.IsAdminMutation` adminPrefixes
      (`internal/policy/policy.go:57`) → POST/DELETE laufen durch die
      eingebettete OPA-Engine (Password-Operator + Keycloak
      `jimesh-admin` passieren, alles andere 403 aus der Middleware);
      GET bleibt lesbar. `policy_test.go` deckt Route + `{id}`-Variante ab.

### WP4 — App-Discovery-Verkabelung
- [x] `handleProjectsDiscover` (`projects_ssh.go:1948+`): gefundene
      Container `jimesh-framework-<key>-<runID>` werden gegen die
      workspaces-Tabelle aufgelöst — ein `<wsId>`-Key attribuiert zur
      echten Projekt-ID + schreibt `workspace_id` in die Container-Row
      (`SaveContainerForWorkspace`); `DiscoveredProject.WorkspaceIDs`
      im Response; DB-Fehler beim Lookup werden geloggt und degradieren
      den Key NICHT zum Phantom-Projekt.
- [x] Container-Rows pro Name-Key (statt pauschal pro Projekt): ein
      Projekt mit Workspaces bekommt eine Row pro Workspace + die
      Projekt-Row, wenn Shared-Container existieren. Ohne Workspaces
      byte-identisch zur alten einzelnen Row.

### WP5 — Tests (echte DB, echtes Git — keine Mocks)
- [x] `internal/store/workspaces_test.go`:
      `TestWorkspaceRowLifecycle` — Ensure-Sonde, Create, Unique-Index-
      Duplikat-Fehler, alle Update-Pfade, Session-Binding (inkl. ehrlicher
      Fehler bei Geist-Session), Container-Attribution (workspace vs.
      shared), Service-Key Lookup/Mint/Revoke, List-Filter, Delete
      (unknown id = Fehler). Läuft gegen jimesh_test-DB, skipped ohne PG.
- [x] `internal/deploy/workspaces_test.go`: Pfad/Branch/Sanitize-Tests,
      `RuntimePresetExists` (dsh ist Framework-Preset!), E2E mit echtem
      Git: Ensure-Idempotenz, Commits überleben Re-Ensure, verlorener
      Worktree + erhaltener Branch → Commits bleiben, Non-Repo 422,
      Escape-ID 400, Remove-Lifecycle + Idempotenz.
- [x] `internal/policy/policy_test.go`: `/api/workspaces` +
      `/api/workspaces/{id}` als Admin-Mutationen, GET frei.

## API-Vertrag (hier dokumentiert — API_DOCS.md gehört dieser Runde Session 050)

Der Vollständigkeit halber die drei Routes; übernimmt sie in API_DOCS.md,
sobald die Ownership wieder frei ist:

| Route | Auth | Body/Query | Response |
|---|---|---|---|
| `POST /api/workspaces` | Session + OPA-Admin | `{projectId, ownerUserId, preset?, workspacePath?, nodeHost?, nodeUser?, nodePort?, authMethod?, sshPassword?, sshKey?}` | `{success, created, workspace:WorkspaceRow, worktree:{worktreePath,branch,created}, serviceKey? (nur bei Neumint, einmalig!), notice}` — 400 Validierung, 404 Projekt/User unbekannt, 403 disabled, 422 kein Git-Repo, 502 Node-SSH |
| `GET /api/workspaces?project=<id>` | Session | — | `{success, workspaces:[WorkspaceRow], count}` (leeres `[]` ist ehrlich) |
| `DELETE /api/workspaces/{id}` | Session + OPA-Admin | optional Body `{confirm, workspacePath?, nodeHost?, ...}` oder `?confirm=true` | `{success, id, serviceKeyRevoked, worktreeRemoved, branchDeleted, notice?, sessionNote}` — ohne confirm bleibt der Worktree inkl. Pfad/Branch-Notiz am Node |

**WorkspaceRow:** `{id, projectId, ownerUserId, preset, containerId,
sessionId, sshTarget, worktreePath, status, createdAt}` — Status-Lifecycle:
`pending → provisioning → ready → deployed → stopped` (Fehlschlag:
`failed`, Re-Ensure heilt).

**Deploy mit Workspace:** `POST /api/projects/deploy` bekommt
`workspaceId` (optional; exklusiv zu `taskId`) — Container mounten dann
`<repo>/.jimesh/worktrees/<wsId>`, Volume/Netz/Namen keyen auf `<wsId>`.
`POST /api/projects/undeploy` mit `workspaceId` swept nur den Owner.

## Verifikation (alle Befehle tatsächlich gelaufen, 13.9.2026)

- `make go-build` → Exit 0 (kompletter Baum, golang-Container).
- `go vet ./internal/...` → meine Pakete (store, deploy, gateway, policy)
  clean. **Fremdfehler im Baum (nicht TASK-037, nicht mein Scope):**
  `internal/security/firewall_rules_test.go:120` und
  `cmd/jimesh-router/firewall_test.go:227` (Parallel-Agent 050,
  in-flight) — dort bricht aktuell auch `make go-vet`.
- `go test ./internal/store/... ./internal/deploy/... ./internal/policy/...`
  gegen jimesh_test-DB → **ok** (alle grün). Fremde/mitgeführte Tests:
  `internal/ai` + agents/analytics-Tests failen mit hardcoded
  `127.0.0.1:5432`-Connects (Umgebung, vor TASK-037 so),
  `internal/network`-egress-Test failt am TASK-033-WIP.
- **Migration live verifiziert** (Real-DB nach `make restart-backend`):
  `\d workspaces` zeigt alle 10 Spalten + `idx_workspaces_project_owner`
  (UNIQUE); `containers.workspace_id` + `idx_containers_workspace`
  existieren.
- **Live-Verify (curl, authentifiziert mit Operator-Session):**
  - `GET /api/workspaces` → 200 `{"count":0,"success":true,"workspaces":[]}`
  - `POST` ohne Felder → 400; mit Phantom-Projekt → 404; `DELETE` auf
    unbekannte ID → 404; ohne Auth → 401 (Middleware).
  - **Bewusst NICHT live ausgeführt:** voller `POST`-Ensure + Workspace-
    Deploy gegen die Real-DB (würde echte Rows + einen echten Worktree im
    Operator-Repo anlegen). Der Flow ist durch Store-Tests (jimesh_test-DB)
    + Worktree-E2E-Tests (echtes Git) abgedeckt; Operator-Beispiel-Curl:
    ```
    POST /api/workspaces {"projectId":"<id>","ownerUserId":"<users.id>"}
    POST /api/projects/deploy {"projId":"<id>","workspaceId":"<aus Response>","framework":"dsh",...}
    ```

## WP6 — Frontend (Subagent, 12.9.2026 Abend)

- [x] Neue Seite `src/frontend/src/views/WorkspacesPage.tsx` — listet
      `GET /api/workspaces?project=` (echte PostgreSQL-Rows, `[]` ehrlich
      bei keinen Treffern), kreuzreferenziert `GET /api/users`
      (`keycloakSub` → `id`, gleiches Muster wie `ConsumerKeysPage.tsx`) und
      `GET /api/auth/status` (`user.sub`), um „nur meine" (Default-Filter)
      zu berechnen; Passwort-Operator-Session bekommt eine ehrliche Notiz
      (`workspaces.operatorNote`) statt eines stillen Leerfilters — es gibt
      keine persönliche User-Row für Passwort-Logins (TASK-025).
- [x] Ensure-Dialog (`POST /api/workspaces`: Projekt-/Owner-/Preset-Select +
      optionale Node-Override-Felder, nie serverseitig gespeichert) und
      zwei getrennte Delete-Pfade: Zeilen-Delete ohne `confirm` (Row +
      Service-Key, Worktree bleibt — Persistenz-Mandat) und ein eigener
      „Worktree entfernen…"-Dialog mit `confirm:true` + Warnhinweis
      (uncommittete Arbeit geht verloren). Service-Key wird exakt einmal
      angezeigt (gleiches Idiom wie `ConsumerKeysPage`).
      **Korrektur TASK-063/SPRINT-39 (R41):** der Preset-Select ist wieder
      aus dem Ensure-Dialog entfernt — der Operator empfand ihn als
      „Workspace hat ein Runtime-Preset, dachte das wären jetzt Apps".
      Preset/Runtime wird seither ausschließlich im Deploy/App-Dialog
      gewählt (`workspace-deploy-dialogs.tsx`); das Backend-Feld `preset`
      bleibt (optional, API-kompatibel), nur die UI fragt nicht mehr danach.
- [x] Nav: `App.tsx` — Import, `PROJECT_BASES`/`projectItems` (Eintrag
      `nav.workspaces`), Route `/workspaces`. Command Palette:
      `command-palette.tsx` — `p-workspaces`-Eintrag (Icon `Server`).
      `ProjectsPage.tsx` bewusst NICHT angefasst (Parallel-Agenten-Konflikt
      vermeiden, Operator-Vorgabe).
- [x] i18n: `workspaces.*` (68 Keys) + `nav.workspaces` in `en.json` +
      `de.json` von Hand übersetzt; `node scripts/backfill-i18n.mjs` +
      `npm run check:i18n` → „passed for 60 locales and 1509 keys" (deckt
      auch 74 Alt-Lücken ab, die vor diesem Change schon in den 58
      Nicht-en/de-Locales fehlten — mechanischer Backfill, keine
      Hand-Übersetzung, Repo-Standard laut `scripts/backfill-i18n.mjs`-Kopf).
- [x] RBAC-in-der-UI: `/api/auth/status` liefert keine Realm-Roles (nur
      `source`/`sub`/`email`), also gibt es kein Client-Signal, um
      Ensure/Delete vor einem Klick auszublenden — gleiche Situation wie
      `TeamsPage`/`ConsumerKeysPage` (kein Rollen-Gate, Buttons immer
      sichtbar). Die Ablehnung ist nie still: der globale
      `MutationCache.onError` (App.tsx) toastet die echte Backend-Message
      ("admin permission required — denied by policy …").
- [x] Verifikation (authentifiziertes Live-Curl gegen den laufenden Stack,
      127.0.0.1:19091, Operator-Login): `GET /api/workspaces` → 200
      `{"count":0,"workspaces":[]}`; `GET /api/users` → 200, 5 echte Rows;
      `GET /api/projects` → 200, 8 echte Rows (`nodeHost` teils gesetzt);
      beide ohne Auth → 401 (bestätigt R39-Lektion: kein SPA-Fallback-Fake-
      200). Negative Pfade: `POST {}` → 400, `POST` mit Phantom-Projekt →
      404, `DELETE` unbekannte ID → 404 — Wortlaut deckt sich exakt mit
      dieser Sprint-Doku oben. **Bewusst NICHT live ausgeführt:** ein echter
      `POST`-Ensure (würde einen echten Git-Worktree unter
      `/home/ji/projects/jimesh/.jimesh/worktrees/<wsId>` im geteilten
      Haupt-Checkout anlegen, den andere parallele Agenten sehen würden —
      dieselbe Zurückhaltung wie oben bei WP3 dokumentiert). `tsc --noEmit`
      und `eslint` sauber für die drei geänderten/neuen Dateien (Rest-Baum
      hat 227 vorbestehende Fehler in anderen Views, keiner davon in den
      hier geänderten Dateien). Die laufende Frontend-Compose-Instanz
      mountet `/home/ji/projects/jimesh/src/frontend` (Haupt-Checkout), nicht
      diesen isolierten Worktree — ein visueller Klick-Test im Browser war
      von hier aus nicht möglich; das ist der nächste Schritt nach dem Merge.

## Offen / Folgearbeit (ehrlich, nicht in diesem Task)

- [x] Frontend (ProjectsPage/Workspace-UI) — siehe WP6 oben
      (`WorkspacesPage.tsx`, bewusst nicht in `ProjectsPage.tsx`).
- [ ] `/api/workspaces` in API_DOCS.md übernehmen, sobald Session 050 die
      Ownership freigibt (Vertrag steht oben, tabellenfertig).
- [ ] Projekt-Row behält bei Workspace-Deploys die letzten Ports/Node-
      Felder (Shared-Metadaten, letzter Deploy gewinnt) — Ports pro
      Workspace sind nicht im Task-Schema; falls gewünscht: Spalte
      ergänzen.
- [ ] Workspace-Deploy für Framework `jimesh` (Compose-Stack) mountet den
      Worktree, aber die Container sind nicht per-User benamst — dokumentierte
      Lücke, analog TASK-019-Notiz für den Shared-Fall.
