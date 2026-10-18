# TASK-055 — Vault-Project-Isolation (R40-M3): Secrets nach Project/Workspace trennen

**Status:** ✅ umgesetzt 15.9. (TASK-055-Commit; Tests gegen jimesh_test-DB
grün) | **Quelle:** R40-Misalignment-Audit M3 (Operator 14.9.:
„nur ein Vault KV — nicht geklärt") + Operator-Entscheidung Vorschlag:
Spalte + WHERE-Filter (kein Schema-Bruch, AES-GCM bleibt).

## Fundstellen

- store/vault.go:47-61 — vault_secrets/vault_audit_log: KEINE project/
  workspace-Spalte (global); AllowedAgents (JSON) = einzige ACL
- security/vault.go — Endpoints /api/vault/secrets etc. (existieren, live)
- Service-Keys (consumer_keys) haben workspace_id/project-Bindung —
  Vault-Access via X-JiMesh-Header-Kette kann die Trennung konsumieren

## Aufgabe

1. **Migration (idempotent, store.go-Muster):** vault_secrets +
   vault_audit_log um project_id (TEXT DEFAULT '') und workspace_id
   (TEXT DEFAULT '') ergänzen.
2. **Store-Layer:** alle CRUD-Funktionen um Project-Scope erweitern:
   CreateSecret(projectID,...), ListSecrets(projectID), Get/Delete mit
   project_id-Bedingung; Audit-Log-Zeilen bekommen project_id.
3. **Endpoint-Layer (security/vault.go):** Project-Scope aus der
   authentifizierten Identität ableiten — Service-Key → sein project_id;
   Dashboard-Session → expliziter ?project=-Parameter oder alle (Operator).
   NIE aus dem Body vertrauen (X-Header-Kontrakt).
4. **Backward-compat:** Secrets ohne project_id bleiben erreichbar
   (legacy-Global-Zugriff für den Operator), neue Secrets Pflicht-feld.
5. **Tests:** store/vault_test.go gegen jimesh_test-DB — Project-Isolation
   (Projekt A sieht Projekt B's Secrets nicht), Service-Key-Filter.
6. **Doku:** API_DOCS (die /api/vault-Routes erweitern um project-scope),
   R40-M3 im Audit-File abhaken, BACKLOG-Zeile, Task-File-Status.

## Regeln

- CGO_ENABLED=0, pure Go, keine neue Dependency
- Scope: src/backend/internal/store/vault.go, security/vault*.go,
  API_DOCS.md (NUR die /api/vault-Sektion!), Tests. NICHT src/frontend
  (053 läuft dort), NICHT deploy/siem oder internal/siem (054 läuft dort)
- GIT: explizite Pfade, kein -A, NICHT pushen (Staging-Kollisions-Lesson!)
- Build: make go-build && make go-vet, gofmt, make go-test scoped

## Akzeptanz

- [x] vault_secrets hat project_id/workspace_id (DB-Check — TestVaultProjectIsolation
  prüft columnExists auf beiden Tabellen + EnsureVaultTables-Idempotenz)
- [x] Projekt A kann Projekt B's Secrets nicht lesen (Test:
  store/vault_test.go — List/Get/Update/Delete-Isolation gegen jimesh_test-DB)
- [x] Service-Key sieht nur sein Projekt (Test: security/vault_scope_test.go —
  Pinned-Scope, keine Eskalation über ?project=, Fail-closed ohne Project)
- [x] Legacy-Secrets bleiben für Operator erreichbar (scope "" = Operator-Global;
  Test deckt Legacy-Zeile project_id='' ab)
- [x] API_DOCS + R40-M3 abgehakt (API_DOCS /api/vault-Sektion + RBAC-Absatz,
  R40-M3-Eintrag ✅ BEHOBEN, BACKLOG-Zeile 055)

**Fundstellen der Umsetzung:** Migration store/vault.go:59-113 · Store-CRUD
store/vault.go:130-300 (ErrVaultProjectRequired/ErrVaultSecretNotFound,
RowsAffected-Ehrlichkeit) · Endpoint-Scope security/vault.go:24-105
(resolveVaultScope/requireVaultScope) · Service-Key-Gate auth/auth.go
(vault-Read-Family im selben Gate wie Router/Firewall — NUR für
Consumer-Key-förmige Tokens, Browser-Session-Fails behalten das Standard-401
„log in to the dashboard"; im Live-Smoke gefunden) · Tests
store/vault_test.go:18, security/vault_scope_test.go:18.

**Live-Smoke (15.9., nach make restart-backend):** Echtes HTTP gegen
Wegwerf-Backend auf jimesh_test-DB: Create mit ?project=A/B ok, ohne ?project=
400; Operator-Global sieht beide, ?project=A nur A; Service-Key: Liste nur
Projekt A, ?project=B-Versuch ändert den Pin NICHT, Cross-Read 404, Write 403,
/api/vault/access fremd 404 / eigen 200, Audit-Route 401; Audit-Zeilen als
accessorType „service" + Key-ID + projectId/workspaceId, denied-Versuche mit
geloggt; PUT/DELETE im falschen Scope 404, Wert überlebt. Live-DB-Check
`\d vault_secrets` + `\d vault_audit_log`: Spalten vorhanden (DEFAULT '').
Fail-closed gegen das Live-Backend: kein Auth → Standard-401; Fake
jimesh-ck-Key → Gate-Meldung 401.

**Bei der Verifikation gefundene + gefixte Vorher-so-Bugs (frische DB):**
migrate() crashpte auf jeder FRESH database (containers-Tabelle ohne
workspace_id, aber Index darauf → store.Open fehl) — seit TASK-037
unbemerkt, weil der Live-DB-Altbestand die Spalte schon hatte und alle
jimesh_test-Tests lautlos skippten. Gefixt in store.go (Spalte im CREATE
TABLE); consumer_keys.go ServiceKeyByWorkspace fragte die lazy Tabelle
ohne ensure ab. Beide Fixes nötig, damit die TASK-055-Tests überhaupt
laufen. Rest offener Vorher-Befunde (NICHT von TASK-055, dokumentiert im
Bericht): flaky TestRenderNftScriptAcceptRule (Map-Iteration,
firewall_provider.go:305), models.description fehlt auf frischer DB
(ai/guard_hook_test), diverse Tests mit hartcodiertem localhost:5432.
