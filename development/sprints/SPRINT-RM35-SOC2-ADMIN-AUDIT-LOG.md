# SPRINT-RM35 — SOC 2-Fundament: Admin-Aktions-Audit-Log

**Status:** 🚧 IN ARBEIT (Branch `feat-admin-audit-log`)
**Auftrag:** crew-docs `docs/planning/sprints/rm35_soc2_readiness_mapping.md` (jimesh-crew), Abschnitt „Admin-Aktions-Audit-Trail": JiMesh hat zwei echte, aber eng begrenzte Audit-Logs (`vault_audit_log`, IaC-`gateAuditLog`) — was fehlt ist der ALLGEMEINE Admin-Aktions-Trail (Deploy/Undeploy, User-Anlage, RBAC-Änderungen, Provisioning). Backend-Auftrag wörtlich: „eine generische `admin_audit_log`-Tabelle … an genau den Stellen befüllt, die schon `policy.IsAdminMutation`-Gates haben (die Gate-Stellen sind der richtige Einhängepunkt, nicht neu suchen)". Operator-Vorgabe: Frontend von Anfang an mitplanen (eigenes Sidebar-Nav-Entry an BEIDEN Registrierungsstellen — `section-nav.ts` UND `HierarchySidebar.tsx`).

## Ziel

Jede admin-gated Mutation (erlaubt UND abgelehnt) landet persistent in `admin_audit_log` — Actor, Aktion, Ziel, Erfolg/Misserfolg, Outcome — lesbar über `GET /api/admin/audit-log` (Admin-only), durchsuchbar/filterbar im Frontend unter `/security/audit-log`. Das ist die technische Grundlage des SOC-2-Kriteriums „Audit-Trail für privilegierte Aktionen"; das Zertifikat selbst bleibt ein externer Prozess-Schritt (siehe RM35-Mapping-Doku).

## Work Packages

| Nr | Task | Status |
|---|---|---|
| RM35-1 | Store: `internal/store/admin_audit.go` — Tabelle `admin_audit_log` (id, timestamp, actor_type, actor_id, action, target_type, target_id, success, before_diff, after_diff, ip), idempotentes Ensure, `RecordAdminAudit` (fire-and-forget), `ListAdminAudit` (Actor-Substring, Action exakt, From/To, Limit-Clamp 1000) + Migration-Hook in `migrate()` | [x] erledigt |
| RM35-2 | Klassifizierung: `internal/policy/admin_audit.go` — `ClassifyAdminMutation(method, path)` → semantischer Action-Name + Ziel-Entität + Pfad-Id (user_create, rbac_grant, deploy, undeploy, provision, vault_write, settings_change, …; ehrlicher `<family>_<method>`-Fallback) | [x] erledigt |
| RM35-3 | Gate-Hook: `internal/auth/admin_audit.go` (Status-Recorder + `auditAdminAction`, fire-and-forget) + Einhängen in `auth.go` Middleware an DEN Gate-Stellen: `policy.IsAdminMutation` (alle Admin-Präfixe + Subagent-/Projekt-Präzisierungen) und das inline `/api/firewall/rules`-Operator-Gate. DENIES werden mit Grund protokolliert, ALLOWED nach Handler-Lauf mit echtem HTTP-Status. BEWUSST: keine Request-Bodies persistiert (Vault-/Key-Writes tragen Secrets) — `after_diff` trägt das Outcome-JSON | [x] erledigt |
| RM35-4 | API: `GET /api/admin/audit-log?actor=&action=&from=&to=&limit=` (`internal/gateway/admin_audit.go`), Admin-only via server-derived `X-JiMesh-Identity-Admin` (OPA `IsAdminXWorkspaceScope`, fail closed), registriert in `gateway.go` | [x] erledigt |
| RM35-5 | Frontend: `src/views/AdminAuditLogPage.tsx` — Tabelle (Zeit, Actor, Aktion, Ziel, Erfolg/Misserfolg, Diff expandierbar), Filter (Actor, Aktion inkl. Datalist aus echten Rows, Zeitraum), Route `/security/audit-log` in `App.tsx` | [x] erledigt |
| RM35-6 | Nav an BEIDEN Stellen (Operator-Vorgabe): `section-nav.ts` securityItems += `/security/audit-log` (`nav.auditLog`) UND `HierarchySidebar.tsx` EVENTS_ITEMS (Events & Observability) — plus Sidebar-Test-Update (5→6 Links) | [x] erledigt |
| RM35-7 | i18n: `nav.auditLog` + `auditLog.*` in en.json + de.json, dann `scripts/i18n-translate.py` für die 58 anderen Locales | [x] erledigt |
| RM35-8 | Docs: API_DOCS-Route, dieser Sprint-File, BACKLOG-Spiegel | [x] erledigt |
| RM35-9 | Verifikation (siehe unten) | [x] erledigt — siehe Abschnitt Verifikation |

## Acceptance Criteria

1. Tabelle existiert nach Backend-Start (idempotent), Rows überleben Restarts (Persistence-Mandate).
2. Jede admin-gated Mutation (z. B. POST /api/users, POST /api/project-roles, DELETE /api/workspaces/{id}, POST /api/workspaces/deploy, POST /api/settings/{key}) erzeugt eine Row — erlaubte mit Erfolg, abgelehnte (403) mit Misserfolg + Grund.
3. GET /api/admin/audit-log ist nur mit Admin-Identität lesbar (403 sonst), filtert nach Actor/Aktion/Zeitraum, Default-Limit 100, Max 1000.
4. Kein Secret landet im Audit-Log (keine Request-Bodies).
5. /security/audit-log ist über Top-Nav (Security-Tab) UND Sidebar (Events & Observability) erreichbar.
6. Alle 60 Locales haben die neuen Keys (check:i18n grün).

## Verifikation (nach dem Lauf eingetragen, ehrlich)

- `go build ./...` gegen den COMMIT-Baum (HEAD + diese Änderung; Scratch-Worktree, weil der Shared-Tree die fremde, ungetrackte, syntaktisch kaputte Datei `internal/ai/guard_enforce.go` einer anderen Session enthält): **RC 0** — clean.
- `go vet ./internal/policy/... ./internal/store/... ./internal/auth/... ./internal/gateway/...` (Commit-Baum): **RC 0**.
- `go test ./internal/policy/...` (Commit-Baum): **PASS** (ClassifyAdminMutation-Tabelle + No-Panic-Guard + die bestehende IsAdminMutation-Suite). Im Shared-Tree identisch **PASS**.
- `go test ./internal/store/...` gegen eine Throwaway-Postgres-16 (Ad-hoc-Netz `rm35-test-net`; der Operator-Stack läuft aktuell nicht — `jimesh-postgres` existiert nicht): **PASS**, inkl. `TestAdminAuditRoundTrip` (Insert success/failure, Actor-Substring, exakte Action, Zeitfenster, Limit-Clamp). Baseline: HEAD ohne diese Änderung läuft auf derselben Throwaway-DB ebenfalls PASS (keine verdeckte Regression; ein VLAN-Test-Fail beim Doppel-Lauf auf nicht zurückgesetzter DB war DB-Altlast, nach DB-Reset grün). Im Shared-Tree ohne DB **skipped** (Skipf-Vertrag, ehrlich).
- `tsc --noEmit -p tsconfig.app.json` (Shared-Tree): 479 Fehler — **0 in den RM35-Dateien**. Der eine Treffer in `App.tsx:40` (`ProjectsPage` unused) ist bei HEAD bereits vorhanden und nicht Teil dieser Änderung; der Rest ist der bekannte, dokumentierte Style-Noise.
- `vitest run src/views/AdminAuditLogPage`: **5/5 PASS**; `HierarchySidebar`: **36/36 PASS** (inkl. aktualisierter 6-Links-Events-Test); `section-nav`: **PASS**.
- `npm run check:i18n`: **PASS** — 60 Locales, 2988 Keys. en+de handübersetzt; die 58 anderen Locales tragen den ehrlichen English-Fallback des i18n-translate-Skripts (Google-Translate blockt diese IP nach anfänglichem Burst hart mit 429 — 3 Läufe mit Backoff-Pacing, ~0,4–1,0 s Abstand und 15–60 s Cooldowns, alle abgewiesen; selbes Fallback-Muster wie im S57-Commit dokumentiert). Nachtrag, wenn Googles Kontingent zurückkehrt: `cd src/frontend && python3 scripts/i18n-translate.py` — das Skript übersetzt nur fehlende Keys, die Fallback-Werte lassen sich mit `--key nav.auditLog` etc. je Key nachziehen.
- Live-Smoke am laufenden Stack: offen (Operator — Stack aktuell nicht hochgefahren; `make up`, dann als Admin einloggen und /security/audit-log öffnen — jede Admin-Aktion erzeugt Rows).

## Ehrliche Grenzen (dokumentiert, nicht versteckt)

- before_diff bleibt bei Gate-Rows leer — das Gate kennt keinen Entity-Zustand, und Request-Bodies persistieren wir bewusst nicht (s. o.). Handler-Seite könnte später ausgewählte, secret-freie Diffs nachreichen (z. B. project_roles vor/nach).
- actor_type `service` ist im Schema reserviert (MCP-/Router-Identity), wird aber vom Session-Gate noch nicht geschrieben — der Machine-Branch (Service-Keys) läuft am IsAdminMutation-Gate vorbei; dokumentierter Nachzug.
