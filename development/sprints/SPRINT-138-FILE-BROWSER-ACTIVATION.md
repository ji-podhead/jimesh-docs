# SPRINT-138 — FILE-BROWSER-ACTIVATION (Ozone-S3-Storage, Phase 1 + Phase 2)

**Status:** ✅ GEBAUT & VERIFIZIERT (Arbeitsbaum, 28.9.2026 — kein Commit, Standing Rule; Parent reviewt+committet)
**Branch:** Arbeitsbaum (kein Commit — Standing Rule)
**Auslöser:** Operator, wiederholt: "es gibt kein S3/Ozone-File-Storage" + "der aktuelle
File-Browser-Ansatz ist komplett falsch" + PHASE-2-Order (SPRINT-58 NACHTRAG 28.9. ~04:15:
Sidebar-Files mit Target-Selector, eingebettete Komponente auf App-Übersichten,
Provider-Abstraktion, Shared-Workspace-Zone).

## Ausgangslage — Audit der geparkten Dateien (bevor irgendetwas aktiviert wurde)

Vier geparkte Dateien aus einer Parallel-Session (untracked): `files.go.s138wip`,
`files_test.go.s138wip`, `components/workspaces/FileBrowser.tsx`,
`scripts/add-sprint138-wsfiles-i18n.mjs`. Befund (vollständig, gegen HEAD verifiziert):

1. **Backend kompiliert nicht in den Gateway hinein:** `files.go` referenziert
   `Server`-Felder (`fileBackend`, `bucketOnce`, `bucketOnceErr`, `bucketReady`), die
   in `gateway.go` NICHT existieren; und der Produktions-Adapter braucht ein
   `*objectstore.Bucket`, aber das (committede) `internal/objectstore` hat KEINEN
   exportierten Konstruktor dafür (nur unexportierte Felder, Tests bauen es paket-intern).
2. **Pfad-Modell falsch:** geparkte Keys waren `workspaces/{wsId}/{name}.jenc` —
   workspace-isoliert, aber OHNE die Projekt-Ebene des SPRINT-58 Tier-1-Defaults
   `ozone://jimesh/{project_id}/{workspace_id}/...`.
3. **Shared-Workspace zerstört den Vault-Pfad:** `vaultFileKeyName` baute
   `projects/{pid}/users//file-keys/...` für owner-lose (shared) Workspace-Rows —
   ungültiger Pfad.
4. **Policy-Annahme falsch:** der Kommentar behauptet eine "präzise Exemption" in
   `policy.IsAdminMutation` — die existiert NICHT. POST/DELETE unter `/api/workspaces`
   bleiben Middleware-Admin-gated (OPA); der Workspace-Owner bekommt sein eigenes
   Upload also erst mit der WP3-Exemption (Design: SPRINT-138-FILE-BROWSER-UPLOAD.md).
5. **Frontend-Ghost + Phantom-Dep:** nichts importiert `FileBrowser.tsx` (Mandat 14),
   und es importiert `react-dropzone` — in `node_modules` vorhanden, aber NICHT in
   `package.json`/`package-lock.json` deklariert (bricht bei jedem Clean Install).
6. **Test-DB-Falle:** `store.Open("./files_test.db")` fällt auf
   `postgres://…@localhost:5432/jimesh` zurück — die ECHTE Dev-DB, nicht die
   Wegwerf-DB; im go-test-Container (localhost ohne Postgres) skippt still. Richtig:
   `os.Getenv("DATABASE_URL")` (Muster `workspaces_lifecycle_test.go`).
7. **Doku-Lücken:** keine API_DOCS-Einträge; `deploy/ozone/README.md` beschreibt noch
   "per-Workspace-Buckets (files/…)" (widerspricht dem vereinbarten Präfix-Modell).

## Plan

**Ziel:** ECHTE S3/Ozone-Workspace-Storage (Upload/Liste/Download/Delete, AES-256-GCM
pro Datei, DEK im Vault, ehrliche 400/503-Zustände) — aktiviert, erreichbar,
dokumentiert. Keine Host-Pfade (Operator-Mandat 27.9.).

**Pfad-Modell (SPRINT-58 NACHTRAG, vereinbart):** JEDER Workspace (user ODER shared)
bekommt sein eigenes Prefix `ozone://jimesh/{project_id}/{workspace_id}/...` (Bucket
`jimesh`, env `OZONE_S3_BUCKET`). Der Shared-Workspace (partial unique index, einer
pro Projekt) teilt SEIN Prefix unter den Containern des Workspace — das ist seine
"Zone". User-Workspaces bleiben 1:1-isoliert. Tier 2 (user-shared
`users/{user_id}/...`) und Tier 3 (project-shared jenseits des Shared-Workspace-Rows)
bleiben dokumentierter Future Work.

**Work Packages:**

| WP | Inhalt | Status |
|---|---|---|
| WP-B1 | `internal/objectstore`: der fehlende exportierte Bucket-Konstruktor (`Client.BucketView`) — additive Methode, damit der Gateway den Storage-Adapter überhaupt bauen kann | [x]
| WP-B2 | `internal/gateway/files.go`: Aktivierung mit Provider-Abstraktion (`fileStorageProvider`, Ozone-S3 = erster echter Provider, keine Stub-Provider), Tier-1-Keys, Shared-Workspace-DEK-Pfad `projects/{pid}/workspaces/{wsId}/file-keys/...`, Runtime-State ohne Server-Struct-Eingriff (sync.Map), ehrliche 503/502/400/404/403 | [x]
| WP-B3 | `internal/gateway/files_test.go`: DATABASE_URL-Wegwerf-DB, Provider-Injection, Shared-Workspace-Lebenszyklus, Tier-1-Key-Behauptung, Access-Matrix, 503/403/404/400 | [x] (9/9 PASS) |
| WP-B4 | Route-Registrierung `gateway.go` (nur Registration) | [x]
| WP-F1 | `FileBrowser.tsx`: EINE Komponente, zwei Modi (general mit Target-Selector / embedded fix), native Drag&Drop statt Phantom-Dep, Provider-Badge aus der API-Antwort (keine S3-Hardcodes), localStorage-Persistenz des letzten Targets (Muster `workspace-scope.ts`) | [x]
| WP-F2 | `FilesPage.tsx` (NEU, Route `/workspaces/files`): Target-Selector über Workspaces, Apps, Container (enumeriert aus den existierenden APIs /api/workspaces, /api/deployments) | [x] |
| WP-F3 | ProjectDetailPage "Files"-Tab (Nur-Files-Bereich) | [x] |
| WP-F4 | Eingebetteter Files-Bereich auf AppDetailPage + DeploymentDetailPage (embedded mode, fixes Target); AppPanelDrawer: eingebaut — die Parallel-Session hatte zwischendurch committed, sauber diffbar | [x] |
| WP-F5 | Sidebar-Nav "Files" (`section-nav.ts` + App.tsx-Route) — Koordinationsregel: Beide Dateien waren during-build in-flight → REPORT-only (exakte Hunks im Build-Report); FilesPage liegt bei | [~] Report-only |
| WP-F6 | i18n-Keys (en+de kuratiert, 58 Locales via Backfill), `check:i18n` PASS | [x] |
| WP-F7 | vitest für FileBrowser (ehrliche Zustände, beide Modi) | [x] (6/6; +12/12 bestehende Drawer-Tests) |
| WP-D1 | API_DOCS.md: 4 Routes + Provider-Modell + Pfad-Modell + Middleware-Posture | [x] |
| WP-D2 | Dieser Sprint-Record (was WIRKLICH geliefert wurde) | [x] |
| WP-E1 | `deploy/ozone/.env.example` + Root-`.env`: `OZONE_S3_ENDPOINT/BUCKET/REGION` angelegt; Credentials NICHT geholt (Live-Befund: getsecret verlangt ozone.security.enabled — Operator-Pfad dokumentiert, Werte nie gedruckt) | [x] (Teil) |
| WP-V1 | Verifikation: go build/vet/test (golang-Container, Wegwerf-DB), tsc-Baseline-Vergleich, vitest, check:i18n — alles ehrlich dokumentiert | [x]

**Akzeptanzkriterien:**

1. `go build ./...` + `go vet` grün (golang:latest-Container); `go test` der Files-Tests
   gegen die Wegwerf-DB grün (oder ehrlich gemeldet, was fehlt).
2. `npx tsc --noEmit -p tsconfig.app.json`: keine NEUEN Fehler gegen die frisch
   gemessene Baseline des Arbeitsbaums (der Baum ist live durch Parallel-Sessions).
3. `npm run check:i18n` PASS (60 Locales, Parität).
4. Ehrlichkeit: Ozone unkonfiguriert → 503 mit Konfigurations-Hinweis, NIE eine
   Fake-Liste; Fehlerzustände 1:1 im UI.
5. Erreichbarkeit (Mandat 14): Klick-Pfad Sidebar → Files + ProjectDetail-Files-Tab +
   App/Deployment-Übersichten; jede neue Route hat einen Consumer.
6. KEIN Host-Pfad irgenwo; KEINE zweite Implementierung der bestehenden
   FileBrowserModal/SSH-Explore-Oberfläche (die bleibt bewusst getrennt, SPRINT-58
   offene Entscheidung #3).

## Retrospektive — was WIRKLICH geliefert wurde (verifiziert gegen Code + Läufe)

### Geliefert (Phase 1 + Phase 2)

**Backend (aktiviert, kompiliert, getestet):**

- `internal/gateway/files.go` (aus `files.go.s138wip` aktiviert und überarbeitet):
  Provider-Abstraktion `fileStorageProvider` (ID/DisplayName/Root/Configured/Backend —
  Responses tragen `provider`/`providerName`, UI bleibt provider-agnostisch), **Ozone-S3
  als erster ECHTER Provider** (keine Stub-Provider, Mandat 2), **SPRINT-58 Tier-1-Keys**
  `ozone://jimesh/{project_id}/{workspace_id}/{name}.jenc` (Bucket `OZONE_S3_BUCKET`,
  Default `jimesh`), **Shared-Workspace-Speicher** mit eigenem DEK-Scope
  `projects/{pid}/workspaces/{wsId}/file-keys/…` (user-kind behält den Owner-Scope),
  Runtime-State per `sync.Map` keyed by `*Server` (gateway.go blieb route-registration-only),
  ehrliche 503 (unkonfiguriert — auch bei Endpoint-ohne-Credentials), 502 (Storage-Fehler),
  413, 400, 404, 403; Vault-Audit bei jedem DEK-Zugriff; Rollback bei Vault-Fehlern.
- `internal/gateway/files_test.go` (aus `.s138wip` aktiviert, überarbeitet):
  DATABASE_URL-Wegwerf-DB-Muster, 9 Tests.
- `internal/objectstore/client.go`: + `Client.BucketView(name)` — der FEHLENDE exportierte
  Konstruktor (4 Zeilen, additiv; ohne ihn war der geparkte Produktions-Adapter NICHT
  baubar — EINBEWEIS-Dokumentation oben). **Einzige Datei außerhalb der erlaubten Liste**
  (implizit vom Design gefordert); Parent möge das bewusst reviewen.
- `internal/gateway/gateway.go`: NUR `s.registerWorkspaceFiles(mux)` + Kommentar (route
  registration only, wie gefordert).
- `.env` (root, gitignored): `OZONE_S3_ENDPOINT=http://jimesh-ozone-s3g:9878`,
  `OZONE_S3_REGION=us-east-1`, `OZONE_S3_BUCKET=jimesh` + kommentierte Plätze für
  `OZONE_S3_ACCESS_KEY/SECRET_KEY` (KEINE Fake-Werte — s. Live-Befund unten).
  `deploy/ozone/.env.example`: Client-Var-Dokumentation ergänzt.

**Frontend (eine Komponente, zwei Modi — Operator-Order Phase 2):**

- `components/workspaces/FileBrowser.tsx` (überarbeitet): **general mode** = Target-Selector
  (Workspaces | Apps & Deployments | Container, gruppiert) mit last-Target-Persistenz
  (`jimesh.files.last-target`, Muster `workspace-scope.ts`); **embedded mode** = fixes
  Target ohne Selector. Native Drag&Drop statt der Phantom-Dep `react-dropzone` (war in
  node_modules, aber NICHT in package.json/lockfile — bei Clean-Install kaputt).
  Provider-Badge + Speicherbereich (root/prefix) 1:1 aus der API-Antwort. Ehrliche
  503/502/Empty-Zustände.
- `views/FilesPage.tsx` (NEU): die Sidebar-„Files"-Seite — Targets aus den existierenden
  APIs (SSOT-Store: /api/workspaces + /api/deployments), kein neuer Endpoint.
- `views/ProjectDetailPage.tsx` (NUR Files-Tab-Bereich): „Files"-Tab neben IaC Files.
- `views/AppDetailPage.tsx`: „Files"-Tab (embedded, fixes Target = App→Workspace).
- `views/DeploymentDetailPage.tsx`: „Verschlüsselte Dateien"-Karte (embedded; Shared-Scope-Rows
  lösen zum Shared-Workspace des Projekts auf — seine Zone).
- `components/apps/AppPanelDrawer.tsx` (Container-Übersicht): „Files"-Tab (embedded;
  zu diesem Zeitpunkt nicht mehr in-flight — SPRINT-143 war committed, eigene Edits sauber
  angewandt).
- `scripts/add-sprint138-wsfiles-i18n.mjs` (überarbeitet, gelaufen): 32 `wsFiles.*`-Keys
  + `projectDetail.tabs.files` + `appDetail.tabFiles` + `nav.files` (en+de kuratiert),
  58 Locales via Backfill (EN-Fallback, RM35-Präzedenz). Modal-Only-Keys (title/close) und
  der consumer-lose `sidebar.badge.wsFiles` wurden NICHT angelegt (kein i18n-Slop).
- `components/workspaces/FileBrowser.test.tsx` (NEU): 6 Tests — beide Modi, Persistenz,
  Provider-agnostische Anzeige, ehrlicher 503, Empty-States.

### Verifikation (alles wirklich gelaufen, docker-golang-Pattern; DB = Wegwerf-jimesh_test)

- `go build ./...`: RC 0 (ganzer Baum inkl. Parallel-Agent-Arbeit).
- `go vet ./internal/gateway/ ./internal/objectstore/ ./internal/filecrypto/`: RC 0.
- `go test ./internal/gateway/ -run '<9 Files-Tests>'` gegen jimesh_test:
  **9/9 PASS** (Sanitizer; Vault-Pfade je Kind; Tier-1-Key; Access-Matrix inkl. Grant-Scan;
  Lifecycle upload→ciphertext→DEK→list→download→DEK-Rotation→delete→404; Shared-Lifecycle
  inkl. Grantee-List + Foreigner-403; 403-ohne-Speicherung; 503 mit echtem Ozone-Provider
  bei leerem Env; Traversal-Neutralisierung per RFC 7578 §4.2 + Storage-Key-Audit + 400
  Non-Multipart + 404 unbekannter Workspace).
  - HINWEIS: `--network jimesh-net` war lokal blockiert (neue Container→Postgres-TCP
    Verbindungen droppen — host-Firewall, kein Passwort-lokales sudo für Diagnose;
    laufende Backend-Connections funktionierten). Tests liefen deshalb über
    `--network host` + `127.0.0.1:5432` (publischer Postgres-Port). Erste zwei Läufe
    scheiterten an (a) genau dieser Netzblockade und (b) einem zwischenzeitlich
    syntax-brochenen `node_services.go` EINES PARALLEL-AGENTS (nicht meiner Datei —
    abgewartet, dann lief alles).
- `npx vitest run FileBrowser.test.tsx AppPanelDrawer.test.tsx`: **18/18 PASS**
  (6 neue + 12 bestehende Drawer-Tests mit dem neuen Files-Tab).
- `npx tsc --noEmit -p tsconfig.app.json`: **474 = Parent-Baseline** (0 neue; 0 in meinen
  neuen Dateien; die 57 in ProjectDetailPage/AppPanelDrawer sind vorbestehender Noise).
- `npm run check:i18n`: **PASS** (60 Locales; Parität — final 3132 Keys nach Parallel-
  Session-Zusatz-Keys).

### Kompatibilität mit dem Operator-Repo (ozone-with-hue-localstack-and-compose)

Geprüft (Clone + Cross-Check gegen `deploy/ozone/docker-compose.yml`):
- Endpoint/Container: Template `s3g:9878` → JiMesh `jimesh-ozone-s3g:9878` auf jimesh-net ✓
- Region `us-east-1` (Template-Hue wie objectstore-Default) ✓ · Pfad-Style-Adressierung ✓
- SigV4 mit GESIGNETEM Payload (strengster Modus, nie UNSIGNED-PAYLOAD) ✓
- `apache/ozone:2.2.1` gepinnt; `getsecret` am `jimesh-ozone-om` ✓ Multipart (Create/
  UploadPart/Complete/Abort) = S3-Standard-Subset ✓
- LocalStack (im Template die S3-Emu-Demo): unser Client ist Endpoint-agnostisch —
  derselbe S3-Subset, also inhärent kompatibel (nicht live getestet, ehrlich).

### Live-Befund Trading-Node (ehrlich — Credentials NICHT geholt)

- s3g UP, anonym = 403 (SigV4 erforderlich) — README-Smoke-Muster bestätigt.
- `ozone s3 getsecret` am OM: **"operation works only when security is enabled"** —
  der Cluster läuft ohne `ozone.security.enabled`; es existieren derzeit KEINE S3-Creds.
- Der Trading-Backend-Container (`jimesh-backend`) hat 0 `OZONE_S3_*`-Env-Vars.
- Operator-Pfad (dokumentiert in .env + API_DOCS): security enabled → getsecret →
  beide Werte in root-.env → Backend-Restart. Bis dahin antwortet die Files-Fläche
  ehrlich 503 mit genau diesem Hinweis — NIE eine Fake-Liste.

### Offen / Follow-ups (ehrlich)

1. **Policy-Owner-Exemption (der EINDEUTIGE funktionale Gap):** POST-Upload und DELETE
   sind Middleware-Admin-gated (`/api/workspaces`-Prefix) — der Workspace-OWNER kann
   bis zur Präzisions-Exemption in `internal/policy/policy.go` (Muster
   `isWorkspaceProvisionMutation`, SPRINT-139) nicht selbst hochladen/löschen; Operator/
   jimesh-admin funktioniert voll. policy.go stand AUSSERHALB meines File-Scopes → nicht
   editiert, exakter Patch im Report (5 Zeilen + 1 Test-Fall).
2. **Sidebar-Files-Nav-Entry:** `section-nav.ts` + `App.tsx` waren während des Builds
   in-flight (Parallel-Agent: /agents→/plugins-Merge + Onboarding-Move) → gemäß Koordinations-
   Regel NUR REPORT: exakte Zeilen-Level-Hunks im Report; `FilesPage.tsx` liegt fertig im
   Baum. Bis zur Anwendung: FilesPage via URL /workspaces/files erreichbar, Nav-Entry fehlt.
3. **Live-S3-Smoke am Stack** (curl upload→list→download→cmp→delete) — brauchts: security
   enabled + Creds + Backend-Restart; Datanode-Parallelsicherung vorausgesetzt.
4. **Container-seitiger S3-Zugriff** (gVisor-Container sprechen selbst S3 mit per-Workspace-
   Credentials) = dokumentierter Ausbau (SPRINT-58 NACHTRAG #5).
5. `deploy/ozone/README.md` sagt noch „per-Workspace-Buckets (files/…)" — veraltet gegenüber
   dem vereinbarten Tier-1-Präfix-Modell; README stand nicht im File-Scope → 1-Satz-Fix im
   Report dokumentiert.
6. BACKLOG-Spiegel: docs/backlog/BACKLOG.md wurde während des Builds von einer Parallel-
   Session bearbeitet (M) → nicht angefasst; Parent möge die Spiegel-Zeilen ergänzen.
