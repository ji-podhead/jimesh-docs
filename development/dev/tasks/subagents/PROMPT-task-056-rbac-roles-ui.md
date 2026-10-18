# TASK-056 — RBAC-Rollen-Zuweisungs-UI (R40-M4): Project-Rollen verwaltbar machen

**Status:** ✅ erledigt (15.9.2026) | **Quelle:** R40-Misalignment-Audit M4 (Operator 14.9.:
„frontend kann nix — auch RBAC usw; project-based RBAC nicht geklärt")

## Fundstellen

- project_user_budgets-Tabelle: HAT role-Spalte (default 'developer') —
  Rollen-Modell existiert im Backend schon!
- security/rbac.go:14 — handleBudgets CRUD existiert (POST /api/budgets
  schreibt role+budget zusammen)
- AdminUsersPage.tsx: 105 Z. — nur enable/disable, 0 role-Referenzen
- Keycloak realm-roles + OPA: admin-mutation-gate existiert (policy.go)
- AdminLayout: /admin/users + /admin/budgets existieren (live 200)

## Aufgabe

1. **AdminUsersPage erweitern:** pro User die Project-Rollen-Zuweisung
   (Rolle: admin|developer|viewer pro Project) — UI: User-Liste →
   aufklappen → Project-Zuweisungen mit Rollen-Picker; nutzt POST
   /api/budgets (rbac.go — es schreibt role UND budget zusammen; Budget
   default 5.00 lassen wenn User nur Rolle setzen will).
2. **AdminBudgetsPage erweitern:** Rollen-Spalte sichtbar + editierbar
   (die Route existiert, zeigt schon Budgets).
3. **Rollen-Anzeige:** in WorkspacesPage (falls von 053 gebaut —
   nicht berühren wenn im Flight!) NICHT integrieren; nur Admin-Scope.
4. **i18n de/en** für neue UI-Strings.
5. **Doku:** API_DOCS /api/budgets (role-Feld dokumentieren), R40-M4
   abhaken, Task-File-Status.

## Regeln

- Scope: src/frontend/src/views/AdminUsersPage.tsx, AdminBudgetsPage.tsx
  (+ i18n), API_DOCS /api/budgets-Sektion. NICHT ProjectsPage/
  WorkspacesPage/Sidebar/App.tsx (053 läuft dort — KONFLIKT!), NICHT Backend
  (Routes existieren)
- No-Mock: echte /api/budgets-Calls; ehrliche 403-Anzeige wenn OPA denied
- VERBOTEN: next build, .d.ts, Credentials-Defaults
- Verifikation: live-curl :19090 /admin/users + /admin/budgets (200)
- GIT: explizite Pfade, kein -A, NICHT pushen

## Akzeptanz

- [x] AdminUsersPage: Rollen-Picker pro (User, Project) — expandierbare
  User-Zeile → Rollen-Picker (admin|developer|viewer) + Budget-Anzeige pro
  Projekt; POST /api/budgets (Budget-Default 5,00 bei neuer Zuweisung,
  bestehende Budget-Werte bleiben bei Rollenwechsel erhalten); REMOVE via
  DELETE /api/budgets mit Confirm (löscht Zuweisung inkl. Budget-Zeile);
  OPA-403 inline + via globalen Toast
- [x] AdminBudgetsPage: Rollen sichtbar/editierbar — ProjectRolesSection
  (alle Zuweisungen aus GET /api/budgets ohne projectId, userId→E-Mail
  aufgelöst, Rollen-Spalte inline editierbar, Budget-Werte werden
  mitschreiben und erhalten); darunter unverändert BudgetsSection (CRUD)
- [x] Live 200 auf beiden Admin-Routen — curl :19090 /admin/users und
  /admin/budgets beide 200 (Next-dev kompiliert die geänderten Views ohne
  Fehler; WorkspaceSettingsPage-Syntax-Fehler im Log = 053-WIP, nicht
  berührt)
- [x] API_DOCS role-Feld + R40-M4 abgehakt — /api/budgets-POST dokumentiert
  role als Free-text mit kanonischem UI-Set admin/developer/viewer (R40-M4);
  R40-M4-Eintrag + Fix-Reihenfolge abgehakt

**Verifikation:** `tsc --noEmit -p tsconfig.app.json` — 0 Fehler in beiden
Views (Pre-existing-Noise in CostDashboard/chain-mesh-graph etc. unverändert);
`node scripts/check-i18n.mjs` — 60 Locales/1656 Keys grün (15 neue Keys je
Locale, de übersetzt, Rest en-Fallback wie 053-Muster); `npx vitest run` —
225 passed, 5 pre-existing chart-axis.act-Fehler (unberührt von TASK-056).
NICHT verifiziert: authentifizierter Daten-Flow (Credentials verboten) —
API-Contract gegen store.UserBudgetRow-JSON-Tags geprüft (projectId/userId/
role/maxBudgetUSD/spentBudgetUSD/enabled/createdAt).
