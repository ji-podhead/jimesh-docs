# SPRINT-22 — Dashboard-IA + Admin/RBAC-Layer (Epic 17)

**Quelle:** `docs/research/R20-jimesh-reuse-review.md` (saits-cloud-Review),
Operator-Entscheidung 6.9.2026. Bisher nur als Backlog-Epic 17 erfasst,
nie in einen Sprint überführt — 0 von 6 Punkten begonnen.

## Ziel

Eine schlanke Hauptseite (Proxy/Projects/Security/DBs) + eine komplett
separat benutzbare Admin/RBAC-Seite (Tenants, Rollen, Policy-Engine) als
modularer Cloud-Layer — kein Aufblähen des einfachen LLM-Proxy-Kerns.

## Policy-Engine: OPA (entschieden, 7.9.2026)

**E-Policy** — `docs/research/DECISIONS.md` (Epic 17, Access Policy) hatte
P-R1 (Casbin-Go vs. OPA) als "offen, vom kritischen Pfad entkoppelt"
dokumentiert. Für Admin/RBAC-UI + die Agent-/Skill-Capability-ACL (R21 §6)
war eine echte Entscheidung fällig — **eine Engine, nicht zwei** (R21 §6
Punkt 4). Volle Begründung: `docs/research/DECISIONS.md` (Abschnitt
"E-Policy — Policy-Engine: OPA").

| Option | Vorbild | Bewertung |
|---|---|---|
| **OPA (Rego) — entschieden** | saits-cloud nutzt Kyverno/OPA (TASK-002); OPA Go SDK (`open-policy-agent/opa/sdk`) embedded, kein Sidecar | Mächtiger (Rego drückt die Datenresidenz/DSGVO-Attribut-Constraints aus, RBAC allein reicht dafür nicht); Bundle-API verteilt Policy-Änderungen zentral über B2B-Kunden-Deployments hinweg (R22-Szenario) — Casbin hat dafür keinen eingebauten Mechanismus (nur Watcher-basiertes Peer-Reload, kein Bundle-Pull) |
| Casbin (Go-nativ) | R21 3-Layer-ACL nannte Casbin ursprünglich für die Protocol-Ebene | Verworfen zugunsten von OPA, um "eine Engine" einzuhalten |

**Korrektur:** die ursprüngliche Empfehlung (Casbin, Begründung "kein
Sidecar") war falsch — der OPA Go SDK embedded genauso wie Casbin, kein
Sidecar-Prozess nötig. Die tatsächlichen Entscheidungsgründe waren
Rego-Mächtigkeit + Bundle-basierte Cross-Cloud-Verteilung, nicht
Deployment-Komplexität.

**Gilt für WP4 UND für R21s Agent-/Skill-Capability-Layer** (Protocol-ACL,
Tool-Call-Gating) — beide nutzen dieselbe OPA-Instanz/denselben
Rego-Policy-Satz, nicht zwei getrennte Engines.

**E-IdP — separate Achse, nicht mit E-Policy verwechseln:** E-Policy ist
Autorisierung (was darf eine Identität). Wer die Identität ist und welcher
Provider sie bestätigt hat, ist eine eigene Entscheidung — **entschieden
7.9.2026: Keycloak, jetzt deployt** (nicht nur Kontrakt vorgemerkt, siehe
`docs/sprints/SPRINT-27-IDENTITY-BROKER-KEYCLOAK.md` +
`docs/research/DECISIONS.md`). Keycloak liefert das RS256-JWT (Rollen als
Claim), OPA (oben) entscheidet anhand dessen über Zugriff — Login/Identität
und Autorisierung bleiben zwei getrennte Schritte in einer Kette, nicht
eine Engine. Blockiert WP4 NICHT — WP4 baut auf den bestehenden
Sessions/Rollen-Tabellen auf; Keycloak-Rollen-Claims können später zusätzlich
einfließen, ohne WP4 neu zu bauen.

## Work Packages

- **WP1 — Hauptseiten-Tabstruktur:** Proxy (Keys/Scopes/Quotas/Routing),
  Projects (Deployments/Sandbox/Apps), Security (K-LAF/Threats/Firewall),
  DBs (Discovery/Debezium/Backups). Kein siebter Tab-Slot (Konvention aus
  Sprint 20 TASK-013 übernehmen).
- **WP2 — Admin/RBAC-Seite:** eigene Route, eigene Navigation, darf
  Components mit Hauptseite teilen (WP5), aber komplett separat nutzbar
  (auch deaktivierbar für Operator, die keine Multi-Tenancy brauchen).
- **WP3 — Scopes+Quotas im Proxy-Kern:** Bedienung bleibt im Proxy-Tab,
  Verwaltung (Anlegen/Ändern von Rollen) auf der Admin-Seite.
- **WP4 — RBAC-Kette übernehmen ✅ (8.9.2026, live verifiziert — Details
  AUTH-CONTRACT §3b):** Vorbild
  `sso-roles/05–07` aus saits-cloud — JWT-Roles → Policy-Check →
  Egress-Policy-Kopplung. Bestehende `teams`/`team_members`/
  `project_user_budgets`-Tabellen (Sprint 20 E4) als Datenbasis, keine
  neuen Tabellen ohne Not (Mandat 7).
- **WP5 — Components-Sharing ✅ (8.9.2026, TASK-028):** Entscheidung als
  Tabelle in der Task-Datei (`docs/tasks/TASK-028-dashboard-ia-admin.md`,
  Abschnitt Ergebnis): geteilt werden PageHeader, Table/ui-Primitives, Badge,
  ConfirmButton, EmptyState, Dialog/Select/Switch, `BackupsPanel` (Keys-Seite
  + `/dbs/backups`) und `BudgetsSection` (TeamsPage + `/admin/budgets`);
  separat bleiben AdminUsersPage, AdminLayout-Subnav und BudgetStatusSection
  (Proxy-Kontext).
- **WP6 — Doku:** IA in `docs/user/` (sobald es existiert, siehe
  SPRINT-21 Docs-Phase) und `API_DOCS.md` spiegeln, sobald Routen stehen.
- **WP7 — API Consumer Keys ✅ (8.9.2026, Backend live verifiziert, Frontend gemergt):** pro
  User/Team gemintete `sk-…`-Keys, die externe Clients (Cursor, OpenCode,
  Kollegen) gegen `/v1/chat/completions` präsentieren. Auflösungskette auf
  dem Proxy-Path: Key → Identity → Budget-Check → Chain-Allowlist →
  Rate-Limit. Gleiche Philosophie wie die Session-Tokens (WP1 Sprint 20):
  JiMesh mintet, der Consumer präsentiert — nie selbst gewählt.
  - **Identitätslücke, die WP7 schließt:** JiMesh hat heute keine echte
    User-Entität. `user_id` in `project_user_budgets` ist Freitext; auf dem
    Proxy-Path steht der Agent-Typ als „User" (`internal/security/rbac.go`,
    „the agent IS the budget-holding identity"). Keycloak-User (Sprint 27)
    werden nicht nach JiMesh synchronisiert — Budgets hingen bisher an
    Freitext-IDs, nicht an echten Menschen. WP7 verdrahtet Keycloak-User →
    JiMesh-Identity → Consumer-Key.
  - **Keine Endpoint-Quotas heute:** das Budget hängt an project×userId,
    nicht an einem API-Key; `internal/quota` ist Provider-Quota (upstream
    Header), nicht Consumer-Quota. WP7 gibt jedem Key eigenes Limit +
    Chain-Allowlist.
  - **Quota-Components wiederverwenden (Operator-Vorgabe):** die
    Budget-/Quota-Check-Components aus dem bestehenden RBAC-Code laufen auf
    dem Proxy-Path weiter — WP7 baut die Quota-Logik nicht neu, sondern
    hängt die Consumer-Identity an die bestehende Kette.
  - Verwaltung (Mint/Revoke/Allowlist/Limits) auf der WP2-Admin-Seite,
    Bedienung im WP1-Proxy-Tab.

## Akzeptanzkriterien

- [x] E-Policy vom Operator entschieden (OPA), in `docs/research/DECISIONS.md`
- [x] WP4 gebaut + live verifiziert (8.9.2026): OPA/Rego embedded
  (internal/policy, Default-Policy + JIMESH_RBAC_POLICY-Override, fail-loud
  beim Load), Admin-Mutationen via Middleware gatet, GETs offen,
  /api/vault/access ausgenommen. Echte Keycloak-E2E: Token ohne
  `jimesh-admin` → 403 lesbar, mit Rolle → 200, Passwort-Operator → 200;
  BootstrapKeycloak setzt idempotent realm-roles-Mapper + jimesh-admin-
  Realm-Rolle. **Egress-Kopplung (Rolle → Dienst+Port) NICHT gefaked** —
  nftables ist L4-only für v1 (R20-Fund), folgt als eigenes WP im
  Security-Stack. Engine via opa/rego-Package (gleiches Engine-
  Versprechen wie die E-Policy-Entscheidung); Bundle-Server-API (sdk)
  folgt mit dem ersten B2B-Deployment.
- [x] WP1–WP3 gebaut und live verifiziert (kein Mock, Mandat 2) — Frontend
  via TASK-028 (Branch `worktree-task-028-dashboard-ia`, Review/Merge
  ausstehend): 4-Tab-IA in `App.tsx` (WP1), `/admin`-Konsole mit Sub-Nav +
  `AdminUsersPage` (GET/POST `/api/users`) + `AdminBudgetsPage`
  (`BudgetsSection`, POST/DELETE `/api/budgets`) (WP2),
  `BudgetStatusSection` als read-only Tab auf der KeysPage gegen
  GET `/api/budgets` + POST `/api/budgets/check` (WP3). Live per curl
  verifiziert 8.9.2026: GET users/budgets/backups/teams/consumer-keys 200
  mit echten Daten, budgets/check 200 (allowed, remaining $0.65),
  users-enabled 200 (admin-Session) und 401 ohne Token, budgets
  Upsert+Delete 200 (Testzeile wieder gelöscht). Backend-RBAC-403 für eine
  Nicht-Admin-Session per curl nicht mint-bar (Passwort-Sessions sind immer
  admin) — dieser Pfad war in WP4 (oben) E2E verifiziert; UI zeigt die
  Backend-Message roh. Browser-Level gegen den laufenden Dev-Server offen
  (der bind-mountet main, nicht den Worktree).
- [ ] WP4 nutzt bestehende RBAC-Tabellen, keine neue Policy-Tabelle ohne Begründung
- [x] Admin-Seite lässt sich unabhängig von der Hauptseite aufrufen/testen
  (eigene URLs `/admin/users`, `/admin/teams`, `/admin/consumer-keys`,
  `/admin/budgets`; Admin-Marker in der Navbar deaktivierbar via
  `SHOW_ADMIN_NAV` in `App.tsx`)
- [x] WP7 gebaut + live verifiziert (8.9.2026): Mint/List/Revoke per
  `/api/consumer-keys` (plaintext einmalig, SHA-256 in DB), `/v1`-Gate
  akzeptiert Key (200) / falscher Key (401) / über Rate-Limit (429) /
  revoked (403 lesbar) / Chain-Allowlist greift VOR Upstream-Dispatch
  (403 consumer key is not allowed to use chain …). Budget-Buchung am
  Store-Level getestet (`TestConsumerKeyLifecycle`); E2E-Buchung braucht
  einen echten Provider-Call — offen, ehrlich gemeldet. Frontend:
  ConsumerKeysPage (`/admin/consumer-keys`, TASK-027 gemergt, 230/230
  Tests + i18n 60 Locales grün).

## WP1+WP2+WP3+WP5 — Umsetzungsplan (TASK-028, 8.9.2026)

> Ausgearbeitet im Worktree `worktree-task-028-dashboard-ia` (Task-Datei:
> `docs/tasks/TASK-028-dashboard-ia-admin.md`). Plan vor Code (Doku-Mandat).

**Goal:** Top-Navigation auf GENAU 4 Haupttabs (Proxy / Projects / Security /
DBs) mit Sub-Navigation, komplett separat nutzbare `/admin`-Konsole
(Teams, Consumer-Keys, Users, Budgets), read-only Quota-/Budget-Status im
Proxy-Kern, dokumentiertes Components-Sharing. Kein URL-Bruch: alle
bestehenden Routen bleiben erreichbar.

**Work Packages (Dateireferenzen):**

- WP1 — `App.tsx`: `navItems` → 4 Gruppen (Proxy: Config, Keys,
  Routing-Analytics, Analytics, Logs, Realtime-Monitor · Projects: Projects,
  Agents, Chat · Security: Exposure, Vault, Security Events · DBs: Backups
  `/dbs/backups`, Discovery `/dbs/discovery` mit ehrlichem Empty-State
  "Sprint 26, CDC-Entscheidung offen"). Backups-Liste echt gegen
  `/api/backups` via geteiltem `BackupsPanel` (WP5). `/fallback` bleibt
  Redirect zu `/config` (FallbackPage IST /config — kein separater Nav-Eintrag,
  kein URL-Bruch).
- WP2 — neue Route `/admin` als Layout mit Sub-Navigation (Users, Teams,
  Consumer-Keys, Budgets), Teams/Consumer-Keys bleiben unter ihren
  bestehenden URLs aufrufbar. Neu: `AdminUsersPage` (GET `/api/users`,
  POST `/api/users/{id}/enabled` Toggle) und `AdminBudgetsPage`
  (Upsert/DELETE `/api/budgets` via extrahiertem `BudgetsSection`, WP5).
  Admin-Nav-Marker separat von den 4 Tabs, deaktivierbar über die Konstante
  `SHOW_ADMIN_NAV` in `App.tsx`.
- WP3 — `BudgetStatusSection` als neuer Tab auf der KeysPage (Proxy-Kern):
  read-only Status pro Budget (spent/max/remaining aus GET `/api/budgets`)
  + Live-Check gegen POST `/api/budgets/check`. Verwaltung bleibt auf
  `/admin/budgets` (Link hin).
- WP5 — Sharing-Entscheidung in der Task-Datei (Tabelle). Geteilt: PageHeader,
  Table/ui-Primitives, Badge, ConfirmButton, EmptyState, Dialog/Select/Switch,
  `BackupsPanel`, `BudgetsSection`. Separat: AdminUsersPage,
  Admin-Subnavigation (page-scoped).

**Akzeptanz:** siehe Task-Datei. `npm run test` (vitest + check:i18n,
60 Locales) muss grün sein; Live-Verifikation der Backend-Routen per curl,
Browser-Level ehrlich als offen gemeldet (Dev-Server bind-mountet main).

## Referenzen

`docs/research/R20-jimesh-reuse-review.md` §5 (Operator-Feedback Dashboard-IA),
`docs/research/DECISIONS.md` (Epic 17 Access Policy, bereits Enforcement-Punkt
verdrahtet — WP4 baut darauf auf, ersetzt es nicht).
