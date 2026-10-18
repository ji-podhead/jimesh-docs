# SPRINT-39 — Secrets-Engine-Abstraktion + jimesh.secrets.get() + Vault-Dashboard

**Quelle:** R41 (Operator-Feedback-Blitz 14.9.), §C1 „Secrets-System —
GROSSE LÜCKE": `jimesh.secrets.get(<kv>, <secret>, <engine?>, <api-key?>)`
mit Auto-Routing/Override, Workspace-Create fragt nach KV-Storage +
Engine, Vault-Dashboard mit konfigurierten Engines + Export/Import/
Copy-between-Engines, Router entscheidet die nächste Control-Plane für
Secrets. Task: TASK-065.

**Status:** ✅ Backend + Frontend implementiert, live gegen die echte
laufende Stack-DB (`jimesh`, nicht nur `jimesh_test`) verifiziert
(13.9.2026, isolierter Worktree-Agent). Checkoffs unten sind gegen den
Code + curl-Beweise verifiziert, nicht aspiriert (Mandat 1.4).

## Ziel

Secrets sollen nicht nur über den bestehenden `/api/vault/*`-Pfad (TASK-055,
ein embedded-Vault, projekt-skopiert) erreichbar sein, sondern über eine
generalisierte **SecretsEngine-Abstraktion** — genau das gleiche Muster wie
TASK-060s `internal/provision`-Registry für Control-Planes: ein Interface,
eine Registry, ein echter Provider (embedded Vault) + ein ehrlicher Stub
(AWS Secrets Manager). Darüber: ein SDK-Aufruf `jimesh.secrets.get()` mit
Auto-Routing, ein Workspace-Create-Flow der nach KV-Storage + Engine fragt,
und ein Vault-Dashboard das die konfigurierten Engines zeigt und Secrets
zwischen ihnen kopieren kann.

## Work Packages

### WP1 — `internal/secretsengine/` (neu): Engine-Interface + Registry
- [x] Interface `Type/Description/Implemented/Get/Set/Delete/List` —
      `src/backend/internal/secretsengine/engine.go:64`. `List` liefert NUR
      Key-Namen (Redaktions-Disziplin, nie Werte).
- [x] Registry `Register/Get/KnownTypes/Types/Has` (gleiche Form wie
      `provision.Registry`) — `engine.go:112`.
- [x] `VaultEngine` (embedded, real) — wrapt TASK-055s
      `store.GetVaultSecret/CreateVaultSecret/UpdateVaultSecret/
      DeleteVaultSecret/ListVaultSecrets` 1:1, `kv` = TASK-055s
      `projectId`-Scope (keine neue Storage-Dimension) —
      `secretsengine/vault_engine.go:33`. **Live gefunden (13.9.):** die
      TASK-055-Unique-Constraint ist GLOBAL auf `name`, nicht
      `(project_id, name)` — ein Name kann nie in zwei Projekten
      gleichzeitig existieren, auch nicht per Copy (dokumentiert in
      `vault_engine.go:57-68` + `gateway/secrets_engines.go`
      `explainImportFailure`).
- [x] `AWSSecretsManagerStub` — alle vier Methoden → `ErrNotImplemented`
      (Gateway → 501), kein AWS-SDK (Mandat 7) —
      `secretsengine/aws_stub.go`.

### WP2 — `internal/store/secrets_engines.go` (neu): konfigurierte Engines
- [x] Tabelle `secrets_engines` (id, name UNIQUE, type, scope_kind
      global|workspace|control_plane, scope_id, config JSON, is_default,
      created_at, updated_at) — `store/secrets_engines.go:44`
      (`EnsureSecretsEnginesTable`), registriert in `store.go`s
      `migrate()` direkt nach `EnsureVaultTables()`.
- [x] CRUD `Create/Get/GetByName/List/Update/Delete` +
      `FindDefaultSecretsEngine(scopeKind, scopeId)` (nil,nil = kein
      Default konfiguriert → Aufrufer fällt auf embedded-vault zurück,
      niemals ein Fehler) — `secrets_engines.go:97-256`.
- [x] `workspaces`-Tabelle additiv erweitert: `has_vault_kv` (INTEGER),
      `secrets_engine_id` (TEXT) — guarded ALTER im
      `EnsureWorkspacesTable()`-Migrationsmuster —
      `store/workspaces.go:63-73`; `WorkspaceRow` + Setter
      `UpdateWorkspaceSecrets` — `workspaces.go:38-47`, `:233-249`.

### WP3 — `/api/secrets-engines*` (Gateway, Vault-Dashboard-Anker)
- [x] `GET/POST /api/secrets-engines`, `DELETE /{id}`,
      `GET/POST /{id}/secrets`, `DELETE /{id}/secrets/{key}`,
      `POST /{id}/import` — `internal/gateway/secrets_engines.go`
      (`registerSecretsEngines:57`). `{id}=embedded` ist die
      Spezial-ID für die immer verfügbare embedded Vault (kein Row
      nötig — Mandat 2: das ist ein echter Backend, keine Attrappe).
- [x] Admin-Gate: `/api/secrets-engines` in `policy.go`s
      `adminPrefixes` (`policy/policy.go:72-78`) — POST/DELETE OPA-
      gated, GET offen für jede authentifizierte Identität (gleiche
      Rolle wie `/api/vault/`).
- [x] `explainImportFailure` übersetzt die rohe Postgres-Unique-
      Verletzung in eine ehrliche, actionable Erklärung —
      `secrets_engines.go` (Kommentar bei `explainImportFailure`).
- [x] Audit: jeder embedded-Vault-Zugriff über diesen Pfad schreibt eine
      `vault_audit_log`-Zeile (Mandat 9) — `auditEmbeddedEngine`.
- [x] Live verifiziert gegen die echte `jimesh`-DB (siehe „Verifikation"
      unten): CRUD, Type-Validierung (400 bei unbekanntem Typ), Scope-
      Validierung (400 bei fehlender `scopeId`), List (Keys only),
      Set/Delete, Import (Erfolg im Selbst-Copy-Pfad + der ehrliche
      Unique-Collision-Fehler bei Cross-Projekt-Copy desselben Namens).

### WP4 — `jimesh.secrets.get()` SDK + `/api/sdk/secrets`
- [x] `internal/sdksecrets/sdksecrets.go`: `GET /api/sdk/secrets?kv=&
      secret=&engine=` — Auth-Familie erweitert (siehe WP5), `kv` wird
      SERVERSEITIG auf `ck.ProjectID` gepinnt (ein abweichender Client-
      Wert ist ein ehrlicher 403, nie ein stiller Re-Scope — gleiche
      K-LAF-§2-Regel wie `/api/vault/access`). Auto-Routing-Reihenfolge:
      Workspace-Row `secrets_engine_id` → `secrets_engines`
      scope=workspace-Default → scope=global-Default → embedded-vault
      (`sdksecrets.go:resolveEngine`).
- [x] Go-SDK-Client `internal/sdk/secrets/secrets.go` — spiegelt
      `internal/sdk/logger` (gleiches Env-Kontrakt `JIMESH_SERVICE_KEY`/
      `JIMESH_GATEWAY_URL`); `Get(kv, secret)`, `GetFrom(kv, secret,
      engine)`, `GetAs(kv, secret, engine, apiKey)` — die exakte
      4-Parameter-Form aus dem Operator-Zitat.
- [x] Router→Control-Plane-Kopplung (R41 §C1 letzter Punkt): **NICHT**
      tief verdrahtet in dieser Runde — dokumentiert als offener,
      kleiner Folgeschritt in `sdksecrets.go`s Paket-Kommentar (ein
      `secrets_engines`-Row mit `scope_kind=control_plane` müsste sein
      reales Netzwerkziel aus `internal/provision`s Registry statt nur
      aus `config` beziehen). Absichtlich offen gelassen statt still
      übersprungen, wie im Auftrag verlangt.

### WP5 — Auth: `/api/sdk/secrets` akzeptiert `kind=service` ODER `kind=user`
- [x] `auth.gateSecretsKey` (`internal/auth/consumer_key.go`) — volle
      `/v1`-Kette (resolve→revoked→rate-limit→budget), aber `kind IN
      (service, user)` statt nur `service`; verlangt eine echte
      `ProjectID`-Bindung (ehrlicher 403 sonst — kein Client darf eine
      beliebige `kv` wählen, siehe WP4).
- [x] `auth.go`s `/api/sdk/*`-Zweig: `/api/sdk/secrets` bekommt sein
      eigenes Gate (`gateSecretsKey` statt `gateSDKServiceKey`), jede
      andere `/api/sdk/*`-Route bleibt exklusiv `kind=service`
      (`auth.go` um Zeile 605-635).

### WP6 — Workspace-Create: KV-Storage + Engine-Wahl
- [x] `POST /api/workspaces` akzeptiert additiv `createVaultKv` (bool)
      + `secretsEngineId` (string, muss existieren wenn gesetzt) —
      `gateway/workspaces.go` (`workspaceEnsureRequest`, Validierung vor
      der Idempotenz-Probe, `CreateWorkspace(...)`-Aufruf).
- [x] Frontend: isolierte, self-contained „Secrets"-Sektion in
      `WorkspacesPage.tsx`s Create-Dialog — ausgelagert in eine EIGENE
      Datei `components/workspaces/workspace-secrets-section.tsx`
      (Hook `useWorkspaceSecretsField` + Komponente
      `WorkspaceSecretsSection`), damit der Diff in `WorkspacesPage.tsx`
      nur ein Import + drei Zeilen ist — TASK-063 arbeitet PARALLEL am
      selben File (Projekt/Runtime-Entkopplung) und wird durch dieses
      Muster nicht berührt.

### WP7 — Vault-Dashboard (Frontend, neue Seite)
- [x] `src/frontend/src/views/VaultDashboardPage.tsx` — konfigurierte
      Engines (Tabelle, Create/Edit/Delete, Type-Badges „stub" aus dem
      Backend-`types[]`), Secret-Management-Panel (Engine+KV wählen,
      Keys auflisten/setzen/löschen — nie Werte in der Liste), „Import
      from Engine"-Dialog (Copy-between-Engines).
- [x] Bewusste Design-Entscheidung (im Auftrag verlangt, dokumentiert):
      „Import from Engine" ist ein EIGENER Button/Dialog, kein Source-
      Engine-Picker im normalen Create-Secret-Formular — Copy ist ein
      seltener Bulk-Vorgang, kein Teil des Routine-Pfads.
- [x] Bewusst eine ANDERE Seite als `/security/vault` (`VaultPage.tsx`,
      TASK-064-Territorium/Security-Tab) — diese Seite ist die
      Multi-Engine-Registry-Sicht (`internal/secretsengine`), die
      andere bleibt die Ein-Projekt-Vault-CRUD+Audit+Token-Sicht
      (TASK-055). Keine Datei der Security-Tab-Fläche angefasst.
- [x] Nav + Command-Palette additiv verdrahtet: `App.tsx`
      (`workspaceItems`-Array, Route `/vault-dashboard`),
      `command-palette.tsx` (`p-vault-dashboard`).
- [x] i18n: `en.json` + `de.json` vollständig (`vaultDashboard.*`,
      `workspaces.secrets.*`, `nav.vaultDashboard`) — die anderen 58
      Locales fallen ehrlich auf die englische Fallback-Übersetzung
      zurück (bestehender `I18nProvider`-Mechanismus, kein Bug — siehe
      „Offen" unten für die vollständige 60-Locale-Abdeckung).

## Verifikation (13.9.2026, isolierter Worktree-Agent)

- `make go-build` / `make go-vet`: **sauber** für den gesamten Baum,
  NACHDEM eine vorbestehende, unabhängige Baubreite entfernt/umgangen
  wurde (siehe „Vorgefundener, nicht dieser Runde zuzurechnender Bug"
  unten) — mit einem temporären Stub verifiziert, der Stub wurde vor dem
  Commit wieder gelöscht (nicht Teil dieses Commits).
- `go test ./internal/store/... ./internal/secretsengine/...
  ./internal/sdksecrets/... ./internal/sdk/secrets/... ./internal/auth/...
  ./internal/policy/... ./internal/gateway/...` gegen die Throwaway-DB
  `jimesh_test`: **ok** (keine neuen Testdateien für die reinen
  Interface-Pakete, aber die bestehende Suite bleibt grün — additive
  Schema-Änderungen brechen nichts).
- **Live-Round-Trip gegen die ECHTE laufende `jimesh`-DB** (ein temporärer
  zweiter Backend-Container auf Port 19191, gleiche Postgres/Redis/Vault-
  Instanzen, additive Migrationen, danach entfernt):
  - `POST /api/vault/secrets?project=task030-verify` (echtes Secret) →
    `GET /api/sdk/secrets?secret=...` mit einem frisch geminteten
    `kind=user`-Consumer-Key: **200**, korrekter Klartext-Wert,
    `engine=embedded-vault`, `kv` korrekt auto-aufgelöst aus
    `ck.ProjectID`.
  - Scope-Mismatch (`kv=` eines fremden Projekts): **403**, exakte
    Fehlermeldung.
  - Unbekannter Engine-Override: **400**. AWS-Stub-Override: **501**
    mit `secrets engine not implemented`.
  - `vault_audit_log` zeigt genau 3 „read"-Zeilen (die 3 erfolgreichen
    Aufrufe) + 1 „create"-Zeile — keine Zeilen für die drei
    fehlgeschlagenen Aufrufe (Scope-Mismatch/unbekannte Engine/AWS-Stub),
    exakt wie beabsichtigt.
  - `GET /api/secrets-engines`: `engines: []`, `types` zeigt beide
    registrierten Typen mit korrektem `implemented`-Flag (ehrliche
    leere Liste, kein Mock).
  - `POST /api/secrets-engines` (Create/bad-type-400/missing-scopeId-400/
    List/Delete): alle wie erwartet.
  - `POST /api/secrets-engines/embedded/import`: Selbst-Copy (gleiche
    kv) → Erfolg; Cross-Projekt-Copy desselben Namens → der ehrliche,
    erklärte Unique-Collision-Fehler (siehe WP1).
  - `POST /api/workspaces` mit `createVaultKv:true` +
    `secretsEngineId:""`: Workspace-Row persistiert `hasVaultKv:true,
    secretsEngineId:""` korrekt, auch als der nachfolgende Worktree-
    Schritt (unabhängiger Grund: Test-Projekt hat kein
    `workspacePath`) fehlschlug — bewiesen, dass die additiven Felder
    unabhängig vom Rest der Ensure-Pipeline persistieren.
  - Alle Test-Artefakte (3 Vault-Secrets, 1 Consumer-Key, 1
    Workspace-Row, 1 Secrets-Engine-Row) wieder aus der echten DB
    entfernt/revoked.
- `tsc --noEmit -p tsconfig.app.json`: keine neuen Fehler in den
  geänderten/neuen Dateien (`VaultDashboardPage.tsx`,
  `workspace-secrets-section.tsx`, `WorkspacesPage.tsx`,
  `workspace-deploy-dialogs.tsx`, `App.tsx`, `command-palette.tsx`) —
  die verbleibenden ~150 Fehler sind vorbestehende Baumnoise in
  unberührten Dateien (`shared/types`-Modul fehlt, `chain-mesh-graph.tsx`,
  `FallbackPage.tsx` u.a.), verifiziert per Diff gegen `git status`.

### Vorgefundener, nicht dieser Runde zuzurechnender Bug

`internal/deploy/deploy.go:68` registriert
`mux.HandleFunc("/api/nodes/provision", h.handleNodeProvision)`, aber
`handleNodeProvision` existiert nirgends im Baum (bereits so seit Commit
`2486fc9`/`81c568d`, laut `SPRINT-38-CONTROL-PLANE-REGISTRY.md:197`
„TASK-058, aktuell uncommitted im Baum" bereits bekannt) — **`go build
./...` scheitert auf `main` schon VOR dieser Task**, unabhängig von
Secrets-Engine-Arbeit. Nicht in diesem Commit gefixt (fremdes Territorium,
TASK-058-Nachzug); für die eigene Verifikation wurde ein temporärer,
NICHT committeter Stub verwendet und danach gelöscht. Operator-Hinweis:
`make go-build`/`make go-vet` auf `main` schlagen aktuell mit genau diesem
einen Fehler fehl, bis TASK-058s `handleNodeProvision` (oder die
Entfernung der toten Route-Registrierung — die tatsächliche Node-
Provision-Logik läuft seit TASK-060 über `SSHProvider.Provision`, direkt
auf Primitiven gebaut, NICHT über einen HTTP-Handler-Wrap) nachgezogen
wird.

## Offen (dokumentiert, nicht verschwiegen)

1. **Router→Control-Plane-Kopplung für Secrets** (R41 §C1 letzter Punkt):
   `resolveEngine` löst bis zur `secrets_engines`-Row/Typ auf, geht aber
   NICHT durch `internal/provision`s Control-Plane-Registry, wenn
   `scope_kind=control_plane`. Kleiner, offensichtlicher Folgeschritt
   (siehe `sdksecrets.go`-Paket-Kommentar).
2. **Cross-Projekt-Copy mit gleichem Namen** auf der embedded-vault-Engine
   ist strukturell unmöglich (globale `name`-UNIQUE, TASK-055-Entscheidung)
   — nur ein „Move" (erst löschen, dann neu anlegen) funktioniert, kein
   echtes „Copy, Original bleibt". Betrifft nur embedded↔embedded-Kopien;
   ein künftiger echter Remote-Engine hat dieses Problem nicht.
3. **i18n:** nur `en`/`de` vollständig übersetzt; die anderen 58 Locales
   zeigen den englischen Fallback-Text (bestehender, ausdrücklich
   vorgesehener `I18nProvider`-Mechanismus) bis jemand übersetzt.
4. **AWS Secrets Manager** bleibt ehrlicher 501-Stub — kein AWS-SDK
   verdrahtet (Mandat 7, wie bei den TASK-060-Stubs).
5. **RBAC-Feingranularität** für `/api/secrets-engines` ist die gleiche
   binäre Admin-Gate wie `/api/vault/` — keine feinere Rolle (z. B.
   „Secrets-Manager, kein Operator") in dieser Runde.
