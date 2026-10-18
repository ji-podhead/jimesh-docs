# TASK-028 — Sprint 22 WP1+WP2+WP3+WP5: Dashboard-IA (Tabs) + Admin/RBAC-Seite + Scopes/Quotas

> **Status:** ✅ FERTIG (Worktree, Review/Merge ausstehend) · **Speist:** Sprint 22 WP1, WP2, WP3, WP5
> **Lesen zuerst:** docs/sprints/SPRINT-22-DASHBOARD-IA-ADMIN-RBAC.md,
> docs/tasks/WORKTREE-PROTOCOL.md

## Ist-Zustand (8.9.2026)

`App.tsx` hat 6 flache Top-Nav-Items (config, models→/config, playground→/projects,
analytics, logs, agents) plus einen Split-Control mit Sekundäreinträgen
(exposure, vault, teams, consumer-keys, security-events). Admin-Seiten
(/admin/teams, /admin/consumer-keys) und Security-Seiten existieren als
eigenständige Pages — es fehlt die WP1-Tabstruktur und die WP2-Admin-Konsole.

## WP1 — Hauptseiten-Tabstruktur (4 Tabs, kein siebter Slot)

Top-Navigation wird auf GENAU 4 Haupttabs umgebaut, mit Sub-Navigation:

1. **Proxy:** Config/Models (existiert), Keys (`/keys`), Routing/Analytics
   (`/routing-analytics`), Fallback (`/fallback` → ist Navigate-Redirect zu
   /config — echte Fallback-Seite? Ist FallbackPage — prüfen), Logs,
   Realtime-Monitor
2. **Projects:** Projects/Deployments (`/projects`), Agents (`/agents`), Chat
   (`/chat`), Playground-Flows
3. **Security:** Exposure (`/security/exposure`), Vault (`/security/vault`),
   Security Events (`/security/events`), Traffic (falls vorhanden)
4. **DBs:** Backups (Backend existiert: /api/backups*), Discovery/Debezium —
   **Backend-Pages existieren teils nicht**: ehrliche Empty-States ("Sprint 26,
   blockiert auf CDC-Entscheidung") statt Fake-UI. Backups kann echte Liste
   gegen /api/backups zeigen (Backend fertig).

Alle bestehenden Routen bleiben ERREICHBAR (kein URL-Bruch — Redirects oder
Behalten), nur die Navigation wird gruppiert. Icons konsistent (lucide),
i18n: neue Keys `nav.proxy`, `nav.projects`, `nav.security`, `nav.dbs` +
Sub-Items in en/de, Rest per Fallback-Skript (REPO-STANDARD: check:i18n
erzwingt Parität — fehlende Keys aus en.json in alle 60 Locales kopieren).

## WP2 — Admin/RBAC-Seite

- Neue Route `/admin` als eigene Verwaltungsseite mit eigener Sub-Navigation:
  Teams (bestehend, /admin/teams), Consumer-Keys (/admin/consumer-keys),
  Users (/api/users — einfache Tabelle: email, displayName, enabled-Toggle,
  Quelle Keycloak), Budgets (/api/budgets — Projekt×User-Rollen-Tabelle mit
  Upsert, Vorbild: existierende Budget-Widgets falls vorhanden).
- Admin-Nav-Eintrag sichtbar aber separat von den 4 Haupt-Tabs (z.B. eigener
  Marker im Sidebar-Footer) — deaktivierbar im Code (Konstante), damit
  Single-Operator-Instanzen ihn ausblenden können (Sprint-22-Vorgabe).
- Die /admin/-Seiten teilen Components mit Hauptseiten (WP5), sind aber
  komplett separat aufrufbar.

## WP3 — Scopes+Quotas im Proxy-Kern

- Im Proxy-Tab (Keys oder Config — dein IA-Urteil): Quota-/Budget-Status-
  Widget pro User/Key, verdrahtet gegen `/api/budgets` + `/api/budgets/check`
  (echte Werte: spent/max/remaining). Kein Mock.
- **Verwaltung (Anlegen/Ändern von Rollen) kommt auf die /admin-Seite**
  (WP2-Budgets-Sektion) — Bedienung im Proxy-Tab heißt: Status ANZEIGEN,
  nicht editieren.

## WP5 — Components-Sharing-Entscheidung

Kurze Liste (in diese Datei ins Ergebnis): welche Widgets werden geteilt
(Badge, Table, ConfirmButton, EmptyState, PageHeader, … — die existieren
alle unter src/components/) und welche Admin-Widgets bewusst separat
bleiben. Eine Tabelle reicht.

## Akzeptanz

- [ ] Genau 4 Haupttabs; alle existierenden Routen weiterhin erreichbar
- [ ] /admin komplett separat nutzbar, Budgets+Users-Verwaltung echt
  verdrahtet (200/401/403-Liveflow gegen den Stack)
- [ ] RBAC greift sichtbar: Nicht-Admin-Mutation → Backend 403 wird im UI
  als lesbarer Fehler gezeigt (Backend-Gate WP4 existiert bereits)
- [ ] `npm run test` grün (vitest + check:i18n, 60 Locales)
- [ ] Live gegen localhost:19091/19090 (Backend-Routen per curl verifizieren,
  Frontend-Build läuft) — ehrlich melden, was im Browser geprüft wurde
- [ ] `## Ergebnis` in dieser Datei + Commits auf dem Branch

## Regeln

WORKTREE-PROTOCOL: eigener Worktree (`.claude/worktrees/`, Branch
worktree-task-028-dashboard-ia), committen ja (regelmäßig!), push/merge nein,
main nicht anfassen. App.tsx wird gleichzeitig von niemand anderem geändert —
du bist der alleinige Owner dieser Runde. node_modules: main's ist sauber
(8.9.2026 reinstalliert) — im Worktree symlinken oder npm install, main's
node_modules NICHT anfassen.

## Ergebnis

### Geändert

- `src/frontend/src/App.tsx:80-152` — WP1: `navItems`/`analyticsItems`/`navMenus`
  (6 flache Items + Analytics-Split) ersetzt durch `navGroups`: GENAU 4
  Haupttabs (Proxy, Projects, Security, DBs) mit Sub-Items, lucide-Icons,
  Segment-Matching-`isActive`; Admin-Marker separat via `SHOW_ADMIN_NAV`
  (Konstante, WP2). `App.tsx:479-491` — Routen: `/admin` als Nested Layout
  (users/teams/consumer-keys/budgets), `/dbs/backups`, `/dbs/discovery`; alle
  Alt-Routen unverändert erreichbar (`/fallback` bleibt Redirect zu `/config`).
- `src/frontend/src/views/AdminLayout.tsx` (neu) — WP2: Admin-Konsole mit
  eigener Sub-Navigation (Users, Teams, Consumer-Keys, Budgets).
- `src/frontend/src/views/AdminUsersPage.tsx` (neu) — WP2: Users-Tabelle
  (email, displayName, Keycloak-Quelle, createdAt) mit echtem Enabled-Toggle
  gegen `POST /api/users/{id}/enabled`; 403/401-Messages kommen roh als
  Error-Toast durch (`mutationCache.onError`, App.tsx).
- `src/frontend/src/components/admin/budgets-section.tsx` (neu) — WP2/WP5:
  Budget-Verwaltung (Upsert/Check/Delete gegen `/api/budgets`) aus TeamsPage
  extrahiert, von TeamsPage und `/admin/budgets` geteilt genutzt.
- `src/frontend/src/views/AdminBudgetsPage.tsx` (neu), `TeamsPage.tsx` —
  dünner Wrapper bzw. Cleanup (Abschnitt entfernt, Widget importiert).
- `src/frontend/src/components/keys/budget-status-section.tsx` (neu) — WP3:
  read-only Quota-/Budget-Status (spent/max/remaining aus GET `/api/budgets`,
  Live-Check gegen POST `/api/budgets/check` inkl. roher 402/403-Verdicts) +
  Link auf `/admin/budgets`; als neuer Tab `budgetStatus` in `KeysPage.tsx`
  verdrahtet. Verwaltung bewusst NICHT hier (Sprint-22-Vorgabe).
- `src/frontend/src/views/BackupsPage.tsx` (neu) + `components/keys/
  backups-section.tsx` (`BackupsPanel` exportiert) — WP1/WP5: `/dbs/backups`
  nutzt dasselbe Panel wie die Keys-Seite, echt gegen `/api/backups*`.
- `src/frontend/src/views/DiscoveryPage.tsx` (neu) — WP1: ehrlicher
  Empty-State (Sprint 26, CDC-Entscheidung offen), kein Fake-UI (Mandat 2).
- i18n: `en.json`/`de.json` um 41 Keys erweitert (`nav.*` neu,
  `admin.*`, `keys.tabBudgetStatus`), neuer Backfill-Standard
  `src/frontend/scripts/backfill-i18n.mjs` — fehlende Keys aus en.json in alle
  59 weiteren Locales kopiert (English Copy, Repo-Standard), check:i18n grün.
- Doku: Sprint-22-Datei (Plan + WP5-Entscheidung + Akzeptanz-Update),
  BACKLOG.md (Epic 17 gespiegelt). API_DOCS.md unangetastet — keine
  Backend-Routen geändert.

### WP5 — Components-Sharing-Entscheidung (Tabelle)

| Widget/Component | Geteilt zwischen | Entscheidung |
|---|---|---|
| `PageHeader` | alle Haupt- und Admin-Seiten | geteilt |
| `Table`/`ui/*` (Button, Input, Dialog, Select, Switch, Badge) | Haupt + Admin | geteilt |
| `ConfirmButton` | ConsumerKeys, Backups, Media | geteilt |
| `EmptyState` | Discovery, QuotaSignals, BudgetStatus | geteilt |
| `BudgetsSection` | TeamsPage + `/admin/budgets` | geteilt (aus TeamsPage extrahiert, WP2) |
| `BackupsPanel` | Keys-Seite (Settings-Tab) + `/dbs/backups` | geteilt (exportiert statt dupliziert) |
| `AdminLayout`-Subnav | nur `/admin` | separat (Admin-eigenes IA-Stück) |
| `AdminUsersPage`-Tabelle | nur Admin | separat (Keycloak-spezifisch, kein Hauptseiten-Pendant) |
| `BudgetStatusSection` | nur KeysPage (Proxy-Kern) | separat — bewusst read-only, keine Edit-Widgets im Proxy-Tab (WP3-Vorgabe) |

### Build/Test-Status (ehrlich)

- `npm run test` (vitest + check:i18n) im Worktree: **grün** — 230/230 Tests
  (18 Dateien), i18n-Parität 60 Locales / 1345 Keys.
- `tsc --noEmit -p tsconfig.app.json`: 275 Fehler — **exakt der
  Main-Baseline** (vorgewiesene Stilrauschen-Fehler inkl. des vorbestehenden
  kaputten `../../../shared/types`-Imports aus der entfernten Legacy-Tier);
  0 Fehler in den neuen/geänderten Dateien dieser Task.
- `npm run build` (next build) im Worktree: erfolgreich. Hinweis (ehrlich):
  next.config.mjs setzt `typescript.ignoreBuildErrors: true` — die
  Typ-Reinheit der Änderung ist daher durch den separaten tsc-Lauf oben
  belegt, nicht durch den Build allein.
- Live gegen localhost:19091 per curl (Login admin@jimesh.local, 8.9.2026):
  `GET /api/users` 200 (5 echte Keycloak-User), `GET /api/budgets` 200
  (echte Zeilen), `GET /api/backups` 200 (`[]`, ehrlich leer),
  `GET /api/teams` 200, `GET /api/consumer-keys` 200; `POST /api/budgets/check`
  200 (`allowed`, remaining $0.65); `POST /api/users/{id}/enabled` 200
  (admin-Session, idempotent `enabled:true`) und **401** ohne Token;
  `POST /api/budgets` Upsert 200 + `DELETE /api/budgets` 200 (Testzeile
  `task028-livecheck-*` angelegt und restlos gelöscht — DB sauber).
- **Nicht verifiziert (offen):** Browser-Level-Check der neuen Routen gegen
  localhost:19090 — der Dev-Server bind-mountet main, nicht den Worktree, und
  durfte nicht neugestartet werden. Eine echte RBAC-403-Antwort mit
  Nicht-Admin-Session war per curl nicht mint-bar (Passwort-Operator-Sessions
  sind immer admin); der 403-Pfad war in Sprint 22 WP4 E2E verifiziert, die
  UI zeigt Backend-Messages unverändert als Toast.

### Abweichungen von der Task-Vorgabe

1. **Worktree-Pfad/Branch:** WORKTREE-PROTOCOL.md nennt `../jimesh-worktrees/`
   + `task/0NN-<slug>`; die Operator-Anweisung für diese Task schrieb
   explizit `.claude/worktrees/` + `worktree-task-028-dashboard-ia` vor —
   der Operator-Vorgabe gefolgt.
2. **"Fallback"-Sub-Item unter Proxy entfällt:** `/fallback` ist ein reiner
   Redirect auf `/config`, und `/config` IST die FallbackPage — ein zweiter
   Nav-Eintrag auf dasselbe Ziel wäre tote Navigation. Route bleibt als
   Redirect erhalten (kein URL-Bruch).
3. **`/analytics` hängt unter dem Proxy-Tab** statt als eigener Eintrag —
   IA-Urteil gemäß WP1 (die Task nennt nur "Routing/Analytics"); die Seite
   ist über das Proxy-Dropdown erreichbar und per URL unverändert.
4. **Backfill-Skript neu angelegt** (`backfill-i18n.mjs`): das Task-Text
   zitierte Repo-Standard ("fehlende Keys aus en.json in alle 60 Locales
   kopieren") existierte als Skript nicht — Negativbefund, nun Skript statt
   Einmal-Handgriff.

### Offene Fragen für den Reviewer

1. IA-Judgment-Calls: `/analytics` + `/logs` + `/realtime-monitor` unter
   Proxy, Chat unter Projects, `/admin` als Navbar-Marker statt Footer —
   gewollt? (Alle per `navGroups` in App.tsx in einer Minute umsortierbar.)
2. `SHOW_ADMIN_NAV = true` als Default — Sprint-22-Vorgabe sagt
   "deaktivierbar", aber nicht welcher Default gilt; Default nicht selbst
   entschieden, nur umgesetzt.
3. Soll `/admin` (Index) nach Users redirecten (aktuell) oder eine
   Übersichtsseite bekommen?
4. Der vorbestehende kaputte `shared/types`-Type-Import (Legacy-Tier-Überrest,
   12 tsc-Baseline-Fehler) — eigener Cleanup-Task?

### Branch

`worktree-task-028-dashboard-ia`, Commits: 3, letzter Commit: siehe
`git log` (feat- + docs-Commits auf Basis main d023d17). Nicht gepusht,
nicht gemergt; main-Arbeitsbaum unangetastet.
