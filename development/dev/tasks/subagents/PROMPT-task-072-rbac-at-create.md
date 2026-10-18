# TASK-072 — RBAC bei der ERSTELLUNG (nicht nur nachträglich im Admin-Tab)

**Status:** ✅ abgeschlossen (14.9.2026, Branch `task/072-rbac-at-create`, s. Ergebnis) | **Quelle:** Operator 14.9. („wenn man neue Projekte/Workspaces/Remote-Targets erstellt, sollte man nicht direkt schon die RBACs einstellen können")

## Fundstellen
- TASK-056: Admin-Rollen-Zuweisung NACH dem Erstellen (Admin-Tab)
- ProjectsPage/WorkspacesPage Create-Dialoge: KEINE Access-Sektion
- POST /api/budgets (rbac.go) — Rolle+Budget in einer Zeile

## Aufgabe
- Additive "Access"-Sektion in Project-Create, Workspace-Create (WorkspacesPage ensure-Dialog), SSH-Endpoint-Create-Dialog:
  - Wer hat SSH-Zugriff
  - Wer hat read-only Workspace/App-Sicht
  - Welcher User bekommt einen auto-geklonten Workspace auf diesem Target
- Wire zur echten Rolle-Zuweisung: POST /api/budgets bei Creation (kein zweiter Admin-Tab-Trip)
- Additiv zu den Create-Dialogen — isolate in eigene Sektion (TASK-065 workspace-secrets-section.tsx-Muster: eigenes Komponenten-File in den Dialog eingebunden)
- Prüfe recent git log auf WorkspacesPage/ProjectsPage (mehrere Tasks haben heute editiert) — isolation statt collision

- GIT: explizite Pfade, kein -A, NICHT pushen

## Ergebnis (14.9.2026, Agent-Session, Worktree ../jimesh-worktrees/task-072-rbac-at-create)

### Geändert
- **NEU** `src/frontend/src/components/rbac/create-access-section.tsx` — eigenes Komponenten-File nach dem TASK-065-Muster (Hook + Sektion + Sequenz-Helper, `<details>`-Sektion, kollabiert, Summary zeigt die Werte, die gesendet werden): `useCreateAccessField` (:89, Defaults developer + 5.00 USD, optionaler GET /api/users-Picker), `useApplyCreateAccess` (:154, POST /api/budgets :190; existing-row-Schutz: `spentBudgetUSD: existing?.spentBudgetUSD ?? 0` + `enabled: existing?.enabled ?? true` — ein Upsert wischt KEIN Ausgaben-Stand), Rollen-Set admin|developer|viewer, Budget-Feld nur bei Rolle ≠ viewer, Fehler-Fall: ehrlicher Toast „Rolle konnte nicht gesetzt werden — bitte manuell in /admin/budgets" + Server-Meldung, NIE wirft die Zuweisung die Creation um (:221, `return false`).
- **NEU** `src/frontend/src/components/rbac/create-access-section.test.ts` — 12 source-pinned Tests (Repo-Konvention für `@/`-importierende UI, wie settings-dialog.test.ts): Sektion + Sequenz in BEIDEN Dialogen verdrahtet, Viewer-Regel, Defaults, i18n-Key-Parität en/de inkl. Platzhaltern.
- `src/frontend/src/views/ProjectsPage.tsx` — Add-Project-Wizard: `useCreateAccessField({ withUsers: true })` (:390), Sektion mit User-Picker im Wizard (:1677), Capture vor dem Form-Reset (:570), Sequenz Create→postBudget: `triggerBootstrap(newProject, access)` → erst NACH erfolgreichem Deploy (UpsertProject ist persistence-Punkt, projects_ssh.go:1963) `applyCreateAccess({...access, projectId: proj.id})` (:689). Kein User gewählt → ehrlich KEINE Zuweisung.
- `src/frontend/src/views/WorkspacesPage.tsx` — Ensure-Dialog: `useCreateAccessField()` (:202), Capture des (Project, Owner, Rolle, Budget)-Tupels in `handleEnsure` VOR mutate (:244, pendingAccessRef — das Form resettet im onSuccess), Feuer in `ensure.onSuccess` (:233), Sektion unter der Secrets-Sektion (:450) — der im Form gewählte Owner bekommt Rolle+Budget im selben Submit.
- `src/frontend/src/i18n/locales/en.json` + `de.json` — 12 neue Keys im Namespace `createAccess` (de übersetzt, en Original); Rest via `scripts/backfill-i18n.mjs` (58 Locales × 12 Keys).

### Build/Test-Status (ehrlich)
- `npx tsc --noEmit -p tsconfig.app.json` — meine 3 Dateien: 0 Fehler (Repo-Noise pre-existing, unverändert).
- `npm run check:i18n` — grün: 60 Locales, 1993 Keys, Parität.
- `npx vitest run` — meine 12 Tests grün; Gesamt: 237 passed, 5 failed — NUR `src/lib/chart-axis.render.test.tsx`, identisch am Hauptcheckout (pre-existing, nicht durch diesen Task).
- `npx eslint` — meine Hunks sauber; das neue Komponenten-File trägt denselben `react-refresh/only-export-components`-Fehler wie das committete TASK-065-Vorbild workspace-secrets-section.tsx (akzeptiertes Muster); alle 21 ProjectsPage-Fehler sind pre-existing (`any`/`Date.now()` in Alt-Code, per diff geprüft).
- **Live-Curl als Admin gegen :19091** (Backend jimesh-jimesh-1, Login via JIMESH_ADMIN_PASSWORD aus .env, Sequenz exakt wie der Component-Code sie sendet; DB-Zustand danach unverändert, 7 Rows):
  1. GET existing-row-Check + POST `{projectId:"task030-verify", userId:<real>, role:"developer", maxBudgetUSD:7.5, spentBudgetUSD:0, enabled:true}` → `ok:true`, GET bestätigt Zeile 7.5 ✓
  2. POST role-only `"viewer"` (OHNE maxBudgetUSD, wie der Viewer-Pfad sendet) → dokumentierter Default 5.0 ✓, Cleanup DELETE → 0 Rows ✓
  3. Bestehende Zeile (ck-test-project…, developer/1/0): Viewer-Upsert erhält max 1 + spent 0 (existing-row-Schutz live bewiesen) → Original developer/1/0 wiederhergestellt ✓
  4. Fehlerpfade: POST ohne userId → 400 „projectId and userId required"; ohne Auth → 401 ✓
- Dialog-Render: auf tsc-/Test-Ebene verifiziert (Sektion + Sequenz in beiden Dialogen source-pinned); ein Browser-Check gegen die laufende GUI war aus dem Worktree nicht möglich (Dev-Stack :19090 bind-mounted das Hauptcheckout) — nach Merge einmal im Browser nachsehen.

### Abweichungen von der Task-Vorgabe
1. **User-Create (AdminUsersPage.tsx) existiert NICHT** — es gibt bewusst keinen Create-User-Endpoint (security/users.go:3-6: „there is intentionally no 'create user' endpoint here; users come into existence by logging in via Keycloak"). Ein User-Create-Dialog wäre ein No-Mock-Verstoß (Form ohne dahinterliegende API) und Backend-Scope (ausgeschlossen). Der reale „User-bekommt-Zugriff"-Ort aus dem Task-File ist der WorkspacesPage-Ensure-Dialog („Welcher User bekommt einen auto-geklonten Workspace") — dort implementiert. AdminUsersPage unangetastet (TASK-056-UI deckt Nachträgliches ab).
2. **SSH-Endpoint-Create-Dialog nicht angebaut** — der Dispatch-Prompt grenzte auf „BEIDE Create-Dialoge" ein und nannte AdminUsersPage/ProjectsPage-ODER-WorkspacesPage; SSH-Endpoint-Create erzeugt kein project_user_budgets-Subjekt und war im Scope explizit draußen. Für den Reviewer offen (s. u.).
3. „Wer hat SSH-Zugriff / read-only Workspace-Sicht" als separate Picker im Dialog entfällt — POST /api/budgets kennt nur EINE (project, user, role, budget)-Zeile; die Rolle admin/developer/viewer IST der Zugriffsgrad (R40-M4). Kein Schema erfunden (Mandat 7).

### Offene Fragen für den Reviewer
1. SSH-Endpoint-Create-Dialog: dort eine Access-Sektion ergänzen oder als bewusst offen verwerfen? (Task-File-Zeile 11 nennt ihn, Dispatch-Prompt schloss ihn aus.)
2. Defaults im Ensure-Dialog sind aktiv (Owner bekommt developer/5.00 auch wenn die Sektion nie aufgeklappt wurde — Summary zeigt es an). Gewollt?
3. `src/frontend/package.json` trägt seit dem Initial-Commit next.js-Skripte („next dev/build") in einem Vite-Repo — unberoührt gelassen; separates Chore?
4. chart-axis.render.test.tsx: 5 pre-existing Failures (auch am Hauptcheckout) — Host/Env-Problem, nicht repo-bedingt?
5. WorkspacesPage-Ensure schreibt die Budget-Zeile immer via POST (auch wenn bereits vorhanden → upsert); ein „nicht überschreiben"-Modus ist nicht eingebaut — Overwrite-Politik ok?

### Branch
`task/072-rbac-at-create` (Worktree `../jimesh-worktrees/task-072-rbac-at-create`, Basis main@bd2ce6c), Commits: 1, nicht gepusht, kein Merge — Review macht Claude, Merge entscheidet der Operator.
