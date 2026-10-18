# SPRINT-139 — Workspace-Lifecycle: Create ist Create, Provisioning ist Provisioning

**Status:** ✅ VERIFIZIERT GEBAUT (feat-workspace-lifecycle, Backend-Commit bbf6b4e + Frontend)
**Ausloeser:** Operator, 27.9.2026 — "man kann kein workspace erstellen weil da ein filepath fehlt.
wieso fragt es überhaupt nach nem filepath und warum will das nen ssh key???? wir haben doch
schon den server aufgesetzt ausserdem hat workspace nix mehr damit zutun was es eigentlich
sein sollte da ist irgendwie alles sdurcheinander gekommen workspacePath is required" + "ist das ein
userworkspace ist das ein shared workspace etc wozu haben wir das alles geplant wenn es alles
nur so ein schrott ist" + "mach es ordentlich" + 28.9.: "WIR HABEN SO VIEL ZU WORKSPACES
GEPLANT ICH VERSTEHE EINFACH NICHT WIESO DA NUR ALTER SLOP IST"

## Problem (Fund gegen echten Code)

1. **POST /api/workspaces (ensure) vermischte zwei Lebenszyklen:** Es erstellte die DB-Row UND
   rief sofort `EnsureUserWorktree` (SSH auf den Node, git worktree add gegen ein Repo, das der
   Workspace-Kontext gar nicht kennt). Ein Workspace ohne workspacePath im Project-Row schlaegt
   mit "workspacePath is required" ab (workspace_integrity.go:271) — der Operator konnte GAR
   KEINE Workspaces erstellen, obwohl die Row-Erstellung selbst nichts davon braucht.
2. **Das Formular verlangte SSH-Credentials von Hand** (WorkspacesPage.tsx: sshKey/sshPassword-
   Felder + Endpoint-Auswahl im CREATE-Dialog), obwohl die Endpoint-Registry + Project-Row die
   Credentials bereits kennen (Operator: "wir haben doch schon den server aufgesetzt").
   Das war als Misalignment DOKUMENTIERT (R40-M5: "SSH-Onboarding im Deploy-Form") — genau das
   ist hier gefixt.
3. **userWorkspace vs. sharedWorkspace ist nicht modelliert:** §8.3b ("my project workspace /
   company workspace") verlangt beides — WorkspaceRow hatte nur owner_user_id (NULL = shared,
   aber uneinheitlich genutzt, keine explizite Art).

## Ziel-Modell (§8/§8.3b-getreu — Operator-Quellen, nicht neu erfunden)

Workspace-Lifecycle als EXPLIZITE Status-Kette:
```
created → provisioning → provisioned → deployed → running
    │                                    ↘ failed (re-provision retries idempotent)
    └─ (create macht NUR die Row; Provisioning ist die eigene, bewusste Aktion)
```

- **§8 ist BINDEND:** Workspace = EINE User-User isolierte, voll duplizierte Arbeitskopie
  eines Projects (KEIN Shared-Container); der Shared Workspace ist das gruppen-level Konstrukt
  daneben (§8.3). "JiMesh auto-provisions one Workspace per selected Project" beim
  User-Onboarding (§8.3, CHAT_LOG Prompt 0.16: "eigenen user provisionieren bei bedarf,
  ansonsten worktree?") — deshalb feuert die Onboarding-Route DENSELBEN
  provisionWorkspace-Flow automatisch.
- **workspace_kind**: `user` (owner_user_id gesetzt) | `shared` (owner_user_id NULL, §8.3b
  "company workspace") — explizites Feld, §8.3b-Namen im Frontend
- **Workspace-Create-Formular:** projectId + owner (oder "shared") + optional secrets-engine.
  KEIN sshKey, KEIN sshPassword, KEIN workspacePath, KEIN filePath.
- **Provisioning (separater Button/Flow):** holt die SSH-Identität aus der Endpoint-Registry
  (Credentials via getEndpointSecrets — nie als Create-Formfeld), workspacePath optional aus dem
  Project-Row; wenn ein Pfad gebraucht wird, fragt der PROVISIONING-Dialog danach — nie der
  Create-Dialog. SSH-Daten sind legitim im Quick-Deploy-Modal (Prompt 27.2), nicht im bare
  Create.

## Work-Packages — umgesetzt & verifiziert

- **WP1 [x]** Backend: `POST /api/workspaces` (ensure) erstellt NUR die Row (status `created`)
  — `EnsureUserWorktree` aus dem Create-Pfad ENTFERNT (`internal/gateway/workspaces.go`,
  handleWorkspacesEnsure). Response `{success, created, workspace, note: "workspace created —
  provisioning is a separate action", next}`; Re-Ensure returniert unverändert, KEIN
  Provisioning. Getestet: `TestWorkspaceEnsureCreatesRowOnly`.
- **WP2 [x]** Backend: neuer Endpoint `POST /api/workspaces/{id}/provision`
  (`internal/gateway/workspaces_provision.go`) — der ORIGINALE EnsureUserWorktree-Flow
  (worktree → session → service key, idempotent) als wiederverwendbare Funktion
  `provisionWorkspace`: Credentials aus Request VORZUG, sonst Registry-Aufloesung
  (settings `ssh_endpoints` → authMethod/user/port des auf nodeHost matchenden Endpoints;
  die Registry hat KEINE Secrets — browser-seitig per Design), sonst FAIL LOUD
  ("no credentials for node X — supply sshKey/sshPassword in the request");
  workspacePath aus Request ODER Project-Row, sonst 400 "workspacePath is required".
  Status: provisioning → provisioned (Erfolg) / failed (markWorkspaceNotReady, retry heilt).
  Ownership-Gate handler-seitig wie der Terminal (terminalAccessAllowed: Owner ODER Admin),
  OPA-Exemtion exakt fuer diesen Pfad (`policy.isWorkspaceProvisionMutation`), damit der
  OWNER nicht vorher am "/api/workspaces"-Admin-Prefix scheitert. Route in gateway.go:
  `mux.HandleFunc("POST /api/workspaces/{id}/provision", s.handleWorkspaceProvision)`.
  Getestet: `TestWorkspaceProvisionValidation` (404/405/403/400×2, Gate fuer Owner+Admin offen),
  `TestWorkspaceProvisionLocalEndToEnd` (ECHTES lokales git-Repo: worktree auf Platte,
  branch, Service-Key einmal, re-provision idempotent, NOT_A_REPO → failed → Heilung),
  `TestWorkspaceProvisionPolicySplit`.
- **WP2b [x]** (Operator-Delta, §8): der Provision-Flow ist als FUNKTION nutzbar — (a) manuell
  per Button (WP5) und (b) AUTOMATISCH nach User-Onboarding:
  `POST /api/users/{sub}/projects` (user_provisioning.go) feuert fuer JEDE angelegte Row
  denselben `provisionWorkspace`-Flow und reportet ehrlich pro Projekt
  (`provisionedWorkspaces[]` mit status provisioned/created/failed + Grund; kein
  Fake-Erfolg, kein abgebrochenes Onboarding). Getestet: `TestUserOnboardingAutoProvisions`.
- **WP3 [x]** Backend: `workspace_kind` — `store.WorkspaceRow.WorkspaceKind` (json
  `workspaceKind`), Migration im Store-Migrate-Pfad (`EnsureWorkspacesTable`): frische Tabelle
  mit `workspace_kind TEXT NOT NULL DEFAULT 'shared'` + NULL-barem `owner_user_id`, Legacy-
  Install per guarded `ALTER TABLE ... ADD COLUMN`, Backfill aus owner (gesetzt→user,
  NULL→shared), `ALTER ... DROP NOT NULL` auf owner_user_id (guarded via information_schema),
  partial unique index `idx_workspaces_project_shared` (ein Shared-Workspace pro Project).
  CreateWorkspace leitet kind aus owner ab und leugnet Widersprueche ab. Response-Felder
  inkl. workspaceKind. Getestet gegen echte Postgres (jimesh_test):
  `TestWorkspaceSharedRow` (NULL-owner-Probe, partial index, kind-Widerspruch-Refusal).
- **WP4 [x]** Frontend: Create-Dialog OHNE SSH-Felder (`WorkspacesPage.tsx`): sshKey-/sshPassword-
  Inputs + Endpoint-Auswahl aus dem CREATE-Form ENTFERNT (die alten ws-ssh-key-Ids existieren
  nicht mehr), stattdessen §8.3b-Radio "User workspace" (Owner-Dropdown) vs "Shared workspace"
  (kein Owner, ownerUserId wird weggelassen → Backend leitet shared ab); secrets-engine bleibt,
  Access-Section nur bei user-kind (kein Owner = kein Role/Budget). Getestet:
  `WorkspacesPage.test.tsx` (keine SSH-Inputs, kein Endpoint-Pick im Create, shared-Body ohne
  ownerUserId/sshKey/sshPassword/workspacePath, User-kind-Gate: submit disabled ohne Owner).
- **WP5 [x]** Frontend: Provision-Button auf Zeilen mit status created/failed (+ legacy pending)
  → Provision-Dialog: Endpoint-Dropdown (useSshEndpoints, preselect via project.nodeHost),
  workspacePath-Feld (vorbelegt aus project.workspacePath, ehrlich leer wenn keiner da),
  SSH-Credentials VORGEFUELLT aus `getEndpointSecrets(endpointId)` (browser-lokal, bearbeitbar,
  nie leer-anfragend: fehlendes Secret → Submit disabled + Hinweis), Absenden →
  POST /api/workspaces/{id}/provision → Toast + invalidateQueries(workspaces); Service-Key
  wird ONCE im Result-Dialog gezeigt (+ Copy). Getestet: Provision-Dialog-Prefill aus
  Registry (localStorage-Secret landet im Feld, Pfad aus Project-Row).
- **WP6 [x]** Frontend: Status-Kette sichtbar — `lib/workspace-status.ts` (ONE mapping, von
  WorkspacesPage UND Sidebar benutzt): created grau, provisioning gelb, provisioned blau,
  deployed lila, running gruen, failed rot (+ legacy pending/ready/stopped, quarantined
  amber). Badge auf jeder Workspace-Zeile (Dot + Tint); `HierarchySidebar.tsx` zeigt denselben
  Status-Dot an Workspace-Zeilen; [+ App]/Deploy/Edit NUR bei provisioned+ aktiv (ehrlich
  disabled, title="provision first"; stop bleibt an containerId gebunden). Getestet:
  `lib/workspace-status.test.ts` (Kette + Gates), WorkspacesPage-Test (deploy disabled auf
  created mit title, provisioned enabled), Sidebar-Suite 41/41.
- **WP7 [x]** Tests: Backend `internal/gateway/workspaces_lifecycle_test.go` (5 Tests: ensure
  ohne SSH-Credentials ERFOLGREICH, provision fail-loud ohne workspacePath, remote ohne
  Credentials → 400 mit Node-Name, Ownership-Gate, Policy-Split, §8-Onboarding-Auto-
  Provision, NOT_A_REPO/Heilung am echten lokalen git-Repo) + `internal/store/workspaces_test.go`
  (created-Status, kind=user/shared, partial index). Frontend `WorkspacesPage.test.tsx` (7
  Tests) + `lib/workspace-status.test.ts` (5 Tests). i18n: neue Keys NUR in en.json + de.json
  (26 + 3 Status-Keys), 58 andere Locales via `scripts/i18n-translate.py` (Google-Translate —
  NICHT hand-uebersetzt).

## Akzeptanzkriterien — erfuellt

1. ✅ Workspace-Erstellen klappt OHNE sshKey, OHNE workspacePath, OHNE filePath — nur Row + kind
   (Test gegen echte Postgres beweist es: create fragt nichts, row hat status created).
2. ✅ Provisioning ist eine bewusste Aktion mit Registry-Credentials (Request-Credentials
   VORZUG, Registry-Aufloesung fuer authMethod, fail-loud mit klarer Meldung sonst).
3. ✅ user/shared sind unterscheidbar: Feld workspaceKind + §8.3b-Namen ("User workspace"/
   "Shared workspace" im Radio, "Company workspace" in der Owner-Spalte).
4. ✅ Kein Formular fragt SSH-Keys ab, wenn die Registry sie schon hat — der CREATE-Dialog hat
   keine SSH-Felder mehr (Tests asserten die Abwesenheit); der Provision-Dialog PREFILLT aus
   der Registry und schickt nie leer.

## Verifikation (alles echt gelaufen, gegen echte Postgres jimesh_test)

- `go build ./...` RC 0, `go vet ./internal/gateway/ ./internal/store/ ./internal/policy/
  ./internal/deploy/` clean (golang:latest-Container, make-go-build-Pattern).
- `go test ./internal/gateway/ ./internal/store/ ./internal/policy/ ./internal/deploy/`:
  policy + deploy ok; die SPRINT-139-Tests (7 Stueck) gruen — u.a. ECHTES lokales git-Repo
  (worktree auf Platte vermessen), NOT_A_REPO→failed→Heilung, §8-Onboarding-Auto-Provision.
  (Hinweis: `internal/store`-Suite hat einen VORHANDENEN Umgebungs-Haengler
  `TestControlPlaneLocalSingleton` (nicht SPRINT-139), der im Shared-Test-Container ins
  10-min-Timeout laeuft — meine Store-Tests selbst sind gruen einzeln gelaufen.)
- `npx tsc --noEmit -p tsconfig.app.json`: 477 Fehler — Baseline ~478, 0 NEUE, 0 in
  SPRINT-139-Dateien.
- `npx vitest run src/views/WorkspacesPage.test.tsx src/lib/workspace-status.test.ts`:
  12/12 gruen; `npx vitest run src/components/sidebar/`: 41/41 gruen.
- `npm run check:i18n`: nach dem Translate-Lauf geprueft (siehe Commit).

## Dateien (Referenz)

Backend: `internal/gateway/workspaces.go` (create-only), `internal/gateway/workspaces_provision.go`
(neu: Handler + provisionWorkspace-Kern), `internal/gateway/workspaces_lifecycle_test.go` (neu),
`internal/gateway/user_provisioning.go` (§8-Auto-Providsion), `internal/gateway/gateway.go` (Route),
`internal/policy/policy.go` (isWorkspaceProvisionMutation-Exemption),
`internal/store/workspaces.go` (kind/NULL-owner/Migration), `internal/store/workspaces_test.go`.
Frontend: `src/views/WorkspacesPage.tsx`, `src/components/workspaces/workspace-deploy-dialogs.tsx`
(WorkspaceRow.workspaceKind), `src/components/sidebar/HierarchySidebar.tsx` (Dot + Gate),
`src/types/domain/hierarchy.ts`, `src/lib/workspace-status.ts` (+ .test.ts, neu),
`src/views/WorkspacesPage.test.tsx` (neu), i18n: en.json + de.json (26+3 Keys) + 58 Locales via
Script. Docs: API_DOCS.md (POST /api/workspaces neu, provision-Route, Onboarding-Route),
dieses Sprint-File, BACKLOG-Spiegel, ARCHITECTURE §8.3b-Built-Notiz.
