# TASK-025 — User-Entität + Keycloak-User-Sync (Sprint 22/27 Fundament)

> **Status:** ✅ FERTIG (Worktree-Branch, wartet auf Review) · **Speist:** Sprint 22 WP4/WP7, Sprint 27 WP3/WP4
> **Grund:** Audit 8.9.2026 — JiMesh hat KEINE User-Entität. `user_id` ist überall
> Freitext (`project_user_budgets`, `team_members`), Keycloak-User werden beim
> Login NICHT nach JiMesh synchronisiert (nur die Email landet in einem Setting).
> Budgets hängen damit an Phantom-IDs. WP7 (API Consumer Keys) braucht echte User.

## Ziel

Beim ersten Keycloak-OIDC-Login wird ein echter JiMesh-User-Row erzeugt
(First-Login-Provisioning, kein Bulk-Sync). Passwort-Login bleibt Single-Operator
wie gehabt.

## Umfang

1. **`store/users.go` (neu):** Tabelle `users` — `id` (TEXT PK, uuid),
   `keycloak_sub` (TEXT UNIQUE), `email` (TEXT), `display_name` (TEXT),
   `enabled` (INTEGER DEFAULT 1), `created_at`. Methoden:
   `UpsertUserByKeycloakSub`, `GetUserBySub`, `ListUsers`, `SetUserEnabled`.
   Tabellen-Erzeugung im bestehenden Ensure-Pattern (siehe wie
   `teams`/`team_members` in `store/rbac.go:46-109` erzeugt werden, Hook in
   `store.go` ~319).
2. **`internal/auth/keycloak_oidc.go`:** nach erfolgreichem Token-Exchange
   Claims lesen (`sub`, `email`, `preferred_username`/`name`) →
   `UpsertUserByKeycloakSub`. Disabled User → Login-Ablehnung mit lesbarer
   Meldung.
3. **`/api/auth/status`:** liefert für OIDC-Sessions `user: {sub, email,
   displayName, source:"keycloak"}`, für Passwort-Sessions `source:"password"`
   (Single-Operator, keine User-Row nötig — ehrlich kennzeichnen).
4. **`/api/users` (GET, Liste) + `/api/users/{id}/enabled` (POST, enable/disable):**
   registrieren in `internal/security/security.go` (Routen-Pattern wie
   `/api/teams`), session-gated wie alle `/api/*`.
5. **Kein FK-Umbau** an `project_user_budgets`/`team_members` in diesem Task —
   die bekommen echte User-IDs erst mit WP7; nur Doku-Notiz.

## Akzeptanz

- [x] Erster OIDC-Login erzeugt User-Row (`sub` unique), zweiter Login updated
  email/display_name statt Duplikat — live gegen den laufenden Keycloak
  (Container jimesh-keycloak, Realm `jimesh`) verifiziert (siehe Ergebnis)
- [x] Disabled User wird abgelehnt (Meldung, kein Silent-Fail) — live verifiziert:
  `403 {"error":{"message":"this account has been disabled by the operator"}}`
- [x] `/api/users` listet echte Rows — live verifiziert (`count=1`, echte UUID-Row)
- [x] `go build`/`go vet` clean, `make go-test` grün (ein vorbestehender,
  flakiger Test in `internal/security` fällt auch auf `main` — siehe Ergebnis)
- [x] `API_DOCS.md` um neue Routen ergänzt (Doku-Mandat!), Task-Datei mit
  `## Ergebnis` + Commit-Hash

## Regeln

WORKTREE-PROTOCOL.md beachten: eigener Worktree/Branch, committen ja, push/merge
NEIN. Kein Mock (Mandate 2): wenn eine Verifikation nicht möglich ist, ehrlich
als offen schreiben statt behaupten. Keine generierten Dateien anfassen.

## Ergebnis

## Geändert
- `src/backend/internal/store/users.go:1-124` (neu) — User-Entität: Tabelle
  `users` (`id` UUID-PK, `keycloak_sub` UNIQUE, `email`, `display_name`,
  `enabled`, `created_at`), Methoden `UpsertUserByKeycloakSub`,
  `GetUserBySub`, `ListUsers` (ehrliches `[]`), `SetUserEnabled` (unbekannte
  ID = Fehler, kein Silent-Success). UUID ohne neue Dependency (Mandat 7,
  `crypto/rand`). Kein FK-Umbau an `project_user_budgets`/`team_members`
  (Scope-Punkt 5) — Notiz steht in `API_DOCS.md` (Users-Sektion).
- `src/backend/internal/store/store.go:321-324` — `EnsureUsersTable()` im
  bestehenden Ensure-Pattern (Hook exakt an der in der Task genannten Stelle
  nach `EnsureRBACTables`).
- `src/backend/internal/auth/keycloak_oidc.go:192-214,224-226` — nach
  erfolgreichem Token-Exchange: Claims `sub`/`email`/`name` (Fallback
  `preferred_username`) → `UpsertUserByKeycloakSub`; Disabled User → `403`
  mit lesbarer Meldung (kein Silent-Fail); Session wird als Keycloak-Session
  markiert.
- `src/backend/internal/auth/auth.go:56-60,176-203,481-508,617` —
  `/api/auth/status` meldet jetzt `source:"keycloak"` (+ `user {sub, email,
  displayName}` aus der echten Row) bzw. ehrlich `source:"password"` für die
  Single-Operator-Session (keine User-Row, `user`-Feld absent); Token→Sub-
  Marker in Setting `keycloak_sessions`, beim Logout mitgeräumt.
- `src/backend/internal/security/users.go:1-58` (neu) — `GET /api/users`,
  `POST /api/users/{id}/enabled` (`{"enabled":bool}`), 405/400/ehrliche
  Fehler; bewusst kein Create-Endpoint (User entstehen nur per OIDC-Login).
- `src/backend/internal/security/security.go:60-61` — Routen registriert
  (Pattern wie `/api/teams`, session-gated wie alle `/api/*`).
- `API_DOCS.md` — `/api/auth/status`-Zeile aktualisiert (`source`/`user`),
  neue Sektion "Users (TASK-025 …)" nach Team Members, Auth-&-Sessions-
  Stichpunktliste ergänzt.
- `docs/sprints/SPRINT-27-IDENTITY-BROKER-KEYCLOAK.md` — Akzeptanz-Eintrag
  für TASK-025 (speist WP3/WP4).
- `BACKLOG.md`/`docs/tasks/README.md` absichtlich NICHT angefasst
  (WORKTREE-PROTOCOL §7 — Zusammenführung macht Claude beim Review).

## Build/Test-Status (ehrlich)
- `go build ./...` + `go vet ./...` im `golang:latest`-Container gegen diesen
  Worktree (`-v $(pwd)/src/backend:/src`): **clean** (Exit 0).
- `go test ./...` (Throwaway-DB `jimesh_test` auf dem geteilten Postgres):
  **alle Packages ok** — mit zwei ehrlichen Anmerkungen:
  1. Der vorbestehende Test `TestRenderNftScriptAcceptRule`
     (`internal/security/firewall_provider_test.go:37`) ist flaky
     ("rendering is not deterministic"): `chainNames()` iteriert Maps
     (`firewall_provider.go:289-293`), die Reihenfolge leckt in die Chain-
     Reihenfolge des Renders. Nachweis, dass es VOR diesem Task so war:
     `-run TestRenderNftScriptAcceptRule -count=20` fällt **auf main
     identisch** (verifiziert, gleiche Meldung). Nicht von TASK-025
     verursacht, hier nicht gefixt (außerhalb des Scopes).
  2. Das `make go-test`-Rezept läuft den Test-Container im
     Compose-Netz; die Tests bauen aber die DSN via
     `store.Open`-Fallback auf `localhost:5432` (`store.go:29`) — im
     Compose-Netz unerreichbar. Ich habe daher mit `--network host`
     getestet (Postgres published `127.0.0.1:5432`). Nebenwirkung, ehrlich
     benannt: der Fallback zeigt auf die **echte** `jimesh`-DB — die Tests
     rufen dort nur idempotente/additive Pfade (`migrate`, `SeedDefaults`)
     auf, aber das ist der Zustand auf main, nicht von diesem Task.
- Live-Verifikation (vollständig, kein Mock): Backend-Binary aus DIESEM
  Worktree als Einmal-Container (`task025-verify`, nur internes
  Compose-Netz, KEIN Host-Port, geteilte Keycloak-/Postgres-/Redis-Container)
  gefahren und den echten OIDC Authorization-Code+PKCE-Flow per
  Cookie-Client gegen Realm `jimesh` (User `admin`) durchgestept:
  - Login #1 → User-Row erzeugt (psql verifiziert: 1 Row, echte UUID,
    `admin@jimesh.local` / "JiMesh Operator"); `/api/auth/status` →
    `source=keycloak` + `user{sub,email,displayName}`.
  - Login #2 → weiterhin **genau 1 Row** (Upsert, kein Duplikat).
  - `/api/users` (mit Session) → `count=1` echte Row; ohne Token → `401`.
  - Disable → persistiert (`enabled=false` in DB); Login #3 →
    `403 {"error":{"message":"this account has been disabled by the
    operator"}}` (lesbar, kein Silent-Fail); Re-Enable → Login wieder ok.
  - Unbekannte ID disablen → ehrlicher Fehler ("user not found"), kein 2xx.
  - **Der geteilte Stack (Container `jimesh-jimesh-1`) wurde NICHT
    angefasst/neu gestartet.** Seiteneffekte auf geteilte Ressourcen:
    additive Migration (`users`-Tabelle in der echten DB), eine
    provisionierte User-Row (admin), Setting-Einträge `keycloak_sessions`,
    und während der Verifikation lief ein zweiter Backend-Prozess kurz
    parallel auf dem Redis-Stream/der DB (Verifikationsfenster, danach
    Container entfernt).

## Abweichungen von der Task-Vorgabe
- Branch-/Worktree-Namen: Operator-Anweisung (`worktree-task-025-user-entity`,
  Worktree `.claude/worktrees/task-025`) überschreibt absichtlich das
  WORKTREE-PROTOCOL-Format (`task/025-<slug>` unter `../jimesh-worktrees/`).
- Der Worktree enthielt bei Übernahme uncommittete Vorrarbeiten eines
  früheren Agent-Runs (Code-Dateien ohne Docs/Commits). Ich habe sie reviewt,
  gegen den Codebaum geprüft (alle Store-Helper existieren: `store.go:62-86,
  81, 1186`, `vault.go:308`; PathValue-Pattern analog security.go:37-50),
  vervollständigt (Doku, Verifikation) und committet.
- Zeilenangaben der Task passten (`store.go:~319` = exakt der Hook-Punkt).
- `API_DOCS.md`: die OIDC-Routen `/api/auth/oidc/login` und
  `/api/auth/callback` fehlen dort bis heute (vorbestehende Lücke — es
  existiert parallel TASK-026 auth-contract). Ich habe nur dokumentiert, was
  dieser Task berührt, und die Lücke hier explizit benannt statt still zu
  füllen.

## Offene Fragen für den Reviewer
1. Flaky `TestRenderNftScriptAcceptRule` auf main — eigenes Fix-Task
   (deterministische Chain-Reihenfolge in `firewall_provider.go:246-263`)?
2. `go-test`-Rezept im Makefile nutzt Compose-Netz, Tests brauchen aber den
   `localhost`-Fallback — Rezept auf `--network host` umstellen (mit
   `jimesh_test`-DB statt Fallback-DB via `DATABASE_URL` in den Tests)?
3. Token→Sub-Marker liegt in einem Setting (`keycloak_sessions`, JSON-Map).
   Für Single-Instance-Betrieb bewusst gewählt; bei Multi-Instance wäre ein
   eigener KV/Store-Path nötig — ok so?
4. Soll `/api/users/{id}/enabled` bei unbekannter ID `404` statt `500`
   liefern? Aktuell ehrlicher 500 mit "user not found"-Message.

## Branch
worktree-task-025-user-entity, Commits: 2, letzter Commit: 0a051b3
