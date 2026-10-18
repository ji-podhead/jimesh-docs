# BUILD-2026-09-28 — OZONE-FILEBROWSER (SPRINT-138 FILE-BROWSER-AKTIVIERUNG, Phase 1 + Phase 2)

Build-Agent: Ozone/S3-Platform-Integration · Branch: Arbeitsbaum (KEIN Commit — Standing Rule; Parent reviewt + committet).
Sprint-Record: `docs/sprints/SPRINT-138-FILE-BROWSER-ACTIVATION.md` (Plan + Audit + Retrospektive).

## 1) Was geliefert wurde

### AUDIT FIRST (Auftrag Punkt 1) — die geparkten 4 Dateien, ehrlich befundet

1. `files.go.s138wip`: kompilierte NICHT in den Gateway (Server-Felder existieren nicht; `objectstore.Bucket` hatte KEINEN exportierten Konstruktor); Keys `workspaces/{wsId}/…` statt des SPRINT-58 Tier-1-Modells; Shared-Workspaces erzeugten kaputte Vault-Pfade (`users//file-keys`); Policy-Kommentar behauptete eine existierende policy.go-Exemption (existiert nicht).
2. `files_test.go.s138wip`: öffnete die ECHTE Dev-DB statt der Wegwerf-DB (`store.Open("./files_test.db")` → localhost-Fallback).
3. `FileBrowser.tsx`: Ghost (nichts importierte es) + Phantom-Dep `react-dropzone` (in node_modules, NICHT in package.json/lockfile).
4. `add-sprint138-wsfiles-i18n.mjs`: funktionierte, aber enthielt consumer-lose Keys (Modal-war-geplant, Sidebar-Badge) — entfernt.

### BACKEND — die Plattform-Integration, AKTIVIERT

- `internal/gateway/files.go` (aus .s138wip aktiviert + überarbeitet):
  - **Provider-Abstraktion** `fileStorageProvider` (ID/DisplayName/Root/Configured/Backend) — Phase-2c: Ozone S3 ist der erste ECHTE Provider, KEINE Stub-Provider; alle Responses tragen `provider`/`providerName`/`root`/`prefix`, damit die UI nie S3 hardcodet.
  - **SPRINT-58 Tier-1 Pfadmodell (vereinbart, NACHTRAG):** JEDER Workspace (user ODER shared) bekommt sein Prefix `ozone://jimesh/{project_id}/{workspace_id}/{name}.jenc` (Bucket `OZONE_S3_BUCKET`, Default `jimesh`). Shared-Workspace-Container teilen genau dieses Prefix (seine „Zone"), User-Workspaces bleiben 1:1-isoliert. KEINE Host-Pfade.
  - **Shared-Workspace-Speicher (Phase-2d):** eigene Fläche + eigener DEK-Scope `projects/{pid}/workspaces/{wsId}/file-keys/{name}`; User-Kind behält den Owner-Scope `projects/{pid}/users/{owner}/file-keys/{name}` (Original-Threat-Modell). Jeder DEK-Zugriff auditiert (VaultAudit).
  - **Ehrliche Zustände:** 503 (Provider unkonfiguriert — auch Endpoint-ohne-Credentials, s. Live-Befund), 502 (Storage-Fehler, echte S3-Meldung), 403 (Access-Matrix), 404, 400, 413 (1 GiB-Cap). NIE Fake-Listen.
  - Runtime-State per `sync.Map` (Server-Struct unangetastet → gateway.go blieb „route registration only").
  - Access-Matrix handler-seitig: Operator | Admin (X-JiMesh-Identity-Admin) | Owner | project_roles-Grant; fail-closed.
- `internal/gateway/files_test.go`: DATABASE_URL-Wegwerf-DB-Muster, Test-Provider-Double (echte Wire-Identity `test-mem`), 9 Tests.
- `internal/gateway/gateway.go`: NUR `s.registerWorkspaceFiles(mux)` + Kommentar (plus einem Parallel-Agent-Hunk für SPRINT-145 members — NICHT meiner, unangetastet).
- `internal/objectstore/client.go`: + `func (c *Client) BucketView(name string) *Bucket` — **die EINE Datei außerhalb meiner erlaubten Liste** (4 Zeilen, additiv, ohne sie war der geparkte Produktions-Adapter unbaubar — der Konstruktor fehlte im committeden objectstore). Bitte bewusst reviewen; Rückbau = 1 Hunk + files.go-Anpassung.
- 4 Routes: `POST …/files/upload`, `GET …/files`, `GET …/files/{filename}`, `DELETE …/files/{filename}` — ALLE in `docs/API_DOCS.md` dokumentiert (Provider-Modell, Pfadmodell, Middleware-Posture, Config, Consumer).

### FRONTEND — eine Komponente, zwei Modi (Phase-2a + 2b)

- `components/workspaces/FileBrowser.tsx` (überarbeitet): **general mode** = Target-Selector (Gruppen: Workspaces | Apps & Deployments | Container) + last-Target-Persistenz (labeled localStorage `jimesh.files.last-target`, Muster workspace-scope.ts, Fallback: erstes Target) — **embedded mode** = fixes Target ohne Selector. Native Drag&Drop (react-dropzone ENTFERNT), XHR-Upload-Progress, Provider-Badge + Speicherbereich 1:1 aus der API, ehrliche 503/502/Empty-States.
- `views/FilesPage.tsx` (NEU): die „Files"-Seite — Targets ausschließlich aus existierenden APIs (SSOT-Store: /api/workspaces + /api/deployments), kein neuer Endpoint.
- `views/ProjectDetailPage.tsx` (NUR Files-Tab-Bereich): „Files"-Tab neben IaC Files (Projekt-Targets: dessen Workspaces + Apps + Container).
- `views/AppDetailPage.tsx`: „Files"-Tab (embedded; ehrlicher No-Target-State wenn Workspace fehlt).
- `views/DeploymentDetailPage.tsx`: „Verschlüsselte Dateien"-Karte (embedded; **Shared-Scope-Rows lösen zum Shared-Workspace des Projekts auf** — die Zone).
- `components/apps/AppPanelDrawer.tsx` (Container-Übersicht): „Files"-Tab (embedded; war zum Edit-Zeitpunkt nicht mehr in-flight).
- `components/workspaces/FileBrowser.test.tsx` (NEU): 6 Tests — beide Modi, Persistenz-Verhalten, Provider-agnostische Anzeige, ehrlicher 503, Empty-States.

### i18n

`scripts/add-sprint138-wsfiles-i18n.mjs` (überarbeitet, gelaufen): 32 `wsFiles.*`-Keys + `projectDetail.tabs.files` + `appDetail.tabFiles` + `nav.files` (en+de kuratiert), 58 Locales via `backfill-i18n.mjs` (EN-Fallback, RM35-Präzedenz). Consumer-lose Keys NICHT angelegt.

## 2) Verifikation — was WIRKLICH lief (docker-golang-Pattern, ehrlich)

| Check | Befehl | Ergebnis |
|---|---|---|
| Backend-Build | `docker run … golang:latest go build ./...` (3×: nach meiner Aktivierung, nach Parallel-Fix, final am aktuellen Baum) | **RC 0** (ganzer Baum inkl. Parallel-Agent-Arbeit) |
| Vet | `go vet ./internal/gateway/ ./internal/objectstore/ ./internal/filecrypto/` (Container) | **RC 0** |
| Backend-Tests | `go test ./internal/gateway/ -run '<9 Files-Tests>' -v` gegen Wegwerf-DB (jimesh_test) | **9/9 PASS** — Sanitizer, Vault-Pfade je Kind, Tier-1-Key, Access-Matrix (incl. Grant-Scope + fail-closed), Voll-Lifecycle (Upload→Ciphertext→DEK→List→Download-Byte-Identisch→DEK-Rotation→Delete→404), Shared-Lifecycle (eigene Fläche, Grantee-List, Foreigner-403), 403-ohne-Speicherung, 503 mit ECHTEM Ozone-Provider bei leerem Env, Traversal-Neutralisierung (RFC 7578 §4.2 + Storage-Key-Audit), 400 Non-Multipart, 404 unbekannter WS |
| vitest | `npx vitest run FileBrowser.test.tsx AppPanelDrawer.test.tsx` | **18/18 PASS** (6 neue + 12 bestehende Drawer-Tests mit neuem Tab) |
| tsc | `npx tsc --noEmit -p tsconfig.app.json` | **474 = Parent-Baseline, 0 neue** (0 in meinen neuen Dateien; die in ProjectDetailPage/AppPanelDrawer gezählten sind vorbestehender Noise — nachgewiesen: Gesamtzahl unverändert, meine Imports sind benutzt) |
| check:i18n | `npm run check:i18n` | **PASS — 60 Locales, 3132 Keys** (Finale; zwischen den Läufen ergänzte eine Parallel-Session eigene Keys — Parität hielt) |

**Ehrliche Läufe, die zuerst scheiterten (vollständige Transparenz):**
1. Erster Test-Lauf (`--network jimesh-net`): DB-Tests SKIPPED — neue Container→Postgres-TCP-Verbindungen werden von der Host-Firewall GEDROPPT (Bestandsverbindungen des laufenden Backends funktionierten; kein Passwort-lokales sudo für Diagnose). Abhilfe: `--network host` + `127.0.0.1:5432` (loopback-published Postgres).
2. Zweiter Lauf: BUILD-Fehler in `internal/gateway/node_services.go` — einer PARALLEL-Session in-flight-Datei (nicht meine; abgewartet, danach grün).
3. Ein Testfall (`../../etc/passwd`) erwartete 400, bekam 200: Go's `multipart.Part.FileName()` stript Pfadbestandteile per RFC 7578 §4.2 VOR dem Handler — der Test assertet jetzt das STÄRKERE echte Verhalten (Stored-Name = Basename, kein Pfadbestandteil erreicht je einen Storage-Key).

**Nicht gelaufen (ehrlich):** Live-Smoke am gestarteten Stack (curl upload→list→download→cmp→delete) — NICHT möglich: (a) lokaler Stack ohne Restart (Mandat 6 will curl-Smoke „once the backend is up" — ein Restart des geteilten Containers hätte Parallel-Arbeit des Baums kompiliert, das habe ich bewusst NICHT gemacht), (b) Trading-Node ohne S3-Credentials (s.u.). Kein einziges ungetestetes „done" behauptet.

## 3) Kompatibilität mit dem Operator-Repo (ozone-with-hue-localstack-and-compose) — geprüft ✓

Geklont und gegen `deploy/ozone/docker-compose.yml` gekreuzt: Endpoint/Container (`s3g:9878` → `jimesh-ozone-s3g:9878` auf jimesh-net) ✓ · Region us-east-1 ✓ · Pfad-Style ✓ · SigV4 mit GESIGNETEM Payload (nie UNSIGNED-PAYLOAD) ✓ · `apache/ozone:2.2.1` gepinnt ✓ · Multipart-Subset ✓ · LocalStack (die S3-Emu im Template): unser Client ist Endpoint-agnostisch → inhärent kompatibel (nicht live getestet).

## 4) LIVE-BEFUND Trading-Node — Credentials NICHT geholt (ehrlich, Aufgabe 3-Fallback)

- s3g: UP, anonym 403 (SigV4 erforderlich — README-Smoke-Muster bestätigt).
- `ozone s3 getsecret` am `jimesh-ozone-om`: **"operation works only when security is enabled"** — der Cluster läuft ohne `ozone.security.enabled`, es existieren aktuell KEINE S3-Credentials.
- Trading-Backend-Container (`jimesh-backend`): 0 `OZONE_S3_*`-Env-Vars (per docker inspect, nur Counts geprüft — Werte nie gelesen/gedruckt).
- **Geliefert statt dessen:** Root-`.env` hat `OZONE_S3_ENDPOINT=http://jimesh-ozone-s3g:9878`, `OZONE_S3_REGION=us-east-1`, `OZONE_S3_BUCKET=jimesh` + kommentierte Plätze für die zwei Secrets (KEINE Fake-Werte); Provider behandelt Endpoint-ohne-Credentials als UNKONFIGURIERT (ehrlicher 503 mit den fehlenden Var-Namen statt opaker S3-403). Operator-Pfad (auch in .env + API_DOCS + Sprint-Record): security enabled → `ssh trading sudo docker exec jimesh-ozone-om ozone s3 getsecret` → beide Werte in root-.env → Backend-Restart.

## 5) Was OFFEN bleibt (nach Wichtigkeit)

### 5a) REPORT-ONLY: Sidebar-Nav-„Files" (Koordinationsregel (e) — section-nav.ts + App.tsx waren während des gesamten Builds in-flight)

Die Dateien wurden NICHT angefasst. Bitte diese exakten, kleinen Hunks anwenden:

**`src/frontend/src/lib/section-nav.ts`** — (1) im lucide-react-Import `FolderLock,` ergänzen; (2) in `PROJECT_BASES` den String `'/workspaces/files'` ergänzen (Zeile mit `export const PROJECT_BASES = ['/projects', …]`); (3) in `workspaceItems` direkt nach der Zeile `{ to: '/workspaces/apps', labelKey: 'nav.workspaceApps', icon: LayoutGrid },` einfügen:
```ts
  // SPRINT-138 (FILE-BROWSER-ACTIVATION): the first-class Files surface —
  // encrypted workspace storage with the target selector (workspaces, apps,
  // containers). Route in App.tsx; component FileBrowser.tsx; page FilesPage.
  { to: '/workspaces/files', labelKey: 'nav.files', icon: FolderLock },
```

**`src/frontend/src/App.tsx`** — (1) zu den Views-Imports: `import FilesPage from '@/views/FilesPage'`; (2) neben `<Route path="/workspaces/deployments" … />` (aktuell ~Zeile 748):
```tsx
                      {/* SPRINT-138 (FILE-BROWSER-ACTIVATION): encrypted
                          workspace file storage — target-selector surface. */}
                      <Route path="/workspaces/files" element={<FilesPage />} />
```

Bis zur Anwendung: FilesPage ist per URL `/workspaces/files` erreichbar, nur der Nav-Entry + Route fehlen (Mandat-14-Lücke schließt der Parent damit).

### 5b) REPORT-ONLY: die EINE funktionale Lücke — Owner-Uploads brauchen die policy.go-Exemption

POST-Upload + DELETE liegen unter dem `/api/workspaces`-Admin-Präfix → die Middleware lässt (bis zur Exemption) nur Operator/jimesh-admin durch; der Workspace-OWNER bekommt 403 bevor die feinere Handler-Matrix läuft (GETs funktionieren für ihn). `internal/policy/policy.go` stand außerhalb meines File-Scopes. Exakter Patch (Muster: `isWorkspaceProvisionMutation`, SPRINT-139-Präzedenz):

1. In `IsAdminMutation` nach dem `isWorkspaceProvisionMutation`-Frühreturn ergänzen:
```go
	// SPRINT-138 (FILE-BROWSER-ACTIVATION): the workspace-files sub-surface
	// (POST …/files/upload, DELETE …/files/{filename}) is owner-scoped at the
	// HANDLER (files.go workspaceFileAccess: owner | operator | admin |
	// project-role grant) — same precise-exemption pattern as provision.
	if isWorkspaceFilesMutation(method, path) {
		return false
	}
```
2. Daneben die Funktion:
```go
func isWorkspaceFilesMutation(method, path string) bool {
	if !strings.HasPrefix(path, "/api/workspaces/") {
		return false
	}
	rest := strings.TrimPrefix(path, "/api/workspaces/")
	parts := strings.Split(rest, "/")
	if len(parts) < 3 || parts[1] != "files" {
		return false
	}
	return (method == "POST" && parts[2] == "upload") ||
		(method == "DELETE" && len(parts) == 3)
}
```
3. Test-Fall in `policy_test.go`: POST `/api/workspaces/ws-1/files/upload` + DELETE `/api/workspaces/ws-1/files/report.pdf` → `IsAdminMutation == false`; GETs sowieso.

### 5c) Weitere ehrliche Reste

- **Live-S3-Smoke** (curl upload→list→download→byte-identisch→delete am Stack): braucht security enabled + Creds + Backend-Restart (Datanode-Parallelsicherung vorausgesetzt).
- **Container-seitiger S3-Zugriff** (gVisor-Container sprechen selbst S3 mit per-Workspace-Credentials): dokumentierter Ausbau (SPRINT-58 NACHTRAG #5) — nicht Teil dieses Builds.
- **`deploy/ozone/README.md`** sagt noch „per-Workspace-Buckets (`files/…`)" — veraltet gegenüber dem vereinbarten Tier-1-Modell; README war nicht im Scope. 1-Satz-Fix: „Der File-Browser nutzt EINEN Bucket (`OZONE_S3_BUCKET`, Default `jimesh`) mit Tier-1-Key-Präfixen `{project_id}/{workspace_id}/{name}.jenc` (SPRINT-58)."
- **BACKLOG-Spiegel**: `docs/backlog/BACKLOG.md` war in-flight einer Parallel-Session → nicht angefasst; Parent ergänze die SPRINT-138-Aktivierungs-Zeilen.
- **i18n-Rennen:** eine Parallel-Session bearbeitet dieselben Locale-Dateien (mein Backfill musste einmal erneut laufen). Bitte `check:i18n` zum Commit-Zeitpunkt erneut ausführen.

## 6) Geänderte Dateien (vollständig; KEIN Commit gemacht)

**Meine (aktiviert/überarbeitet/neu):**
- `src/backend/internal/gateway/files.go` (NEU — Aktivierung aus .s138wip; .s138wip entfernt)
- `src/backend/internal/gateway/files_test.go` (NEU — aus .s138wip)
- `src/frontend/src/components/workspaces/FileBrowser.tsx` (überarbeitet)
- `src/frontend/src/components/workspaces/FileBrowser.test.tsx` (NEU)
- `src/frontend/src/views/FilesPage.tsx` (NEU)
- `src/frontend/scripts/add-sprint138-wsfiles-i18n.mjs` (überarbeitet, gelaufen)
- `docs/sprints/SPRINT-138-FILE-BROWSER-ACTIVATION.md` (NEU — Plan + Audit + Retrospektive)
- `docs/API_DOCS.md` (4 Routes + Provider-/Pfad-/Posture-Doku)
- `deploy/ozone/.env.example` (Client-Var-Doku)
- `.env` (root, gitignored — OZONE_S3_ENDPOINT/REGION/BUCKET + kommentierte Secret-Plätze)

**Meine surgical Edits in geteilten Dateien (alle additions-only):**
- `src/backend/internal/gateway/gateway.go` — NUR `s.registerWorkspaceFiles(mux)` + Kommentar (der zweite Diff-Hunk darin — SPRINT-145 registerWorkspaceMembers — ist NICHT meiner)
- `src/backend/internal/objectstore/client.go` — NUR `Client.BucketView` (der EINE bewusste Scope-Übergriff, s.o., bitte reviewen)
- `src/frontend/src/views/ProjectDetailPage.tsx` — NUR Files-Tab-Bereich (Import, Tab-Union, Tab-Button, Content, ProjectFilesTabView am Ende)
- `src/frontend/src/views/AppDetailPage.tsx` — Files-Tab (embedded)
- `src/frontend/src/views/DeploymentDetailPage.tsx` — Files-Karte (embedded, Shared-Workspace-Resolution)
- `src/frontend/src/components/apps/AppPanelDrawer.tsx` — Files-Tab (embedded)
- Locale-Dateien (60×) — via Script + Backfill: ausschließlich additive `wsFiles.*`/`nav.files`/`projectDetail.tabs.files`/`appDetail.tabFiles`-Keys

**NICHT angefasst (in-flight / verboten):** WorkspacesPage.tsx, HierarchySidebar.tsx, PluginCatalogPage.tsx, internal/gateway/plugins.go, deploy/siem/, section-nav.ts, App.tsx (5a liefert die Hunks), docs/backlog/BACKLOG.md, alle anderen Parallel-Arbeiten im Baum. Kein git commit, kein stash, kein checkout, kein clean.
