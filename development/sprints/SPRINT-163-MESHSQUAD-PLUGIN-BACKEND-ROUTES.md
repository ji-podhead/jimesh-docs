# SPRINT-163 — MESHSQUAD-PLUGIN-BACKEND-ROUTES (RM25 / S153-7)

**Status:** ✅ Abgeschlossen 1.10.2026 (Code + Verifikation, ehrlich ohne
lokalen Stack — Operator-Order „nicht lokal deployen"). Kein Agent-Commit
(Standing Mandate) — Arbeitsbaum-Diff, Parent committet.
**Kontext:** SPRINT-153 S153-7 + RM25-4 (docs/sprints/SPRINT-153-MESHSQUAD-CHAT-CHATROOMS.md
Zeile 122, docs/sprints/SPRINT-RM25-CREW-PLUGIN-MANIFEST.md „Nachtrag“):
`pluginBackendRoutes["meshsquad"] = {}` → `installable=false` →
Sidebar-Entry + Deploy-Dialog-Gate bleiben ausgegraut, Installation
unmöglich. Das ist ein jimesh-BACKEND-Arbeitspaket (RM25-4), kein
Frontend-Redesign.

## Plan (vor dem Code festgelegt, Mandat 1.4)

**Ziel:** Das Gateway serves ECHTE meshsquad-Lifecycle-Routen
(`gateway/meshsquad.go`), registriert in `New()`:
`pluginBackendRoutes["meshsquad"]` listet genau diese Routen →
`installable=true` im Katalog (abgeleitet, nie handgesetzt) → der
bestehende Install-Flow (POST /api/plugin-installations, SPRINT-140)
persistiert die Row mit `config.crewApiUrl` (nicht secret-shaped →
Plaintext-Config wie jules' mcpUrl; Credentials blieben vault secret_ref).
Sidebar-Entry + Gate spiegeln das ehrlich (bereits gebaut, SPRINT-153);
repariert wird nur echtes Hardcoding (Wizard-Config-Komposition), kein
Gate-Redesign.

**Work Packages:**

| WP | Inhalt | Akzeptanz |
|---|---|---|
| WP1 | Backend-Lifecycle `gateway/meshsquad.go`: GET `/api/plugins/meshsquad/status` (echte plugin_installations-Rows, ehrlich leer), GET `/api/plugins/meshsquad/health` (ECHTER Probe auf `{crewApiUrl}/health` — manifest healthCheck.path, 5s Timeout —, echte Messwerte: statusCode/durationMs, nie erfunden), DELETE `/api/plugins/meshsquad/installations/{id}` (S154-artige Schutzregeln, s. u.) | 405/400/404-Zweige präzise; health misst wirklich; keine Fake-Daten (Mandat 2) |
| WP2 | Registrierung: 3 Zeilen in `gateway.go New()` + `pluginBackendRoutes["meshsquad"]` synchron | Route im Gateway existiert (sonst existiert sie nicht — Repo-Mandat) |
| WP3 | Store `plugin_installations.go`: `GetPluginInstallationByID`, `DeletePluginInstallation`, `ErrPluginInstallationNotFound` (RowsAffected/ErrNoRows-Idiom wie vault.go) | re-DELETE → 404 |
| WP4 | Install-Validierung + Wizard-Repair: crewApiUrl muss gültige http(s)-URL sein wenn gesetzt (400 sonst, im generischen POST); Wizard komponiert Config pro Plugin (meshsquad → `{crewApiUrl}`, KEIN apiKey-Feld — service_account, der Stack authentifiziert sich selbst laut plugin.yaml; ein Browser-Client darf ohnehin kein Secret halten, Mandate 2+9), jules unverändert | install persistiert brauchbare crewApiUrl; tsc/vitest ohne Regression |
| WP5 | docs/API_DOCS.md: MeshSquad-Sektion (3 Routen), /api/plugins-installable-Zeile, POST-Zeile (crewApiUrl-Validierung) | jede neue Route dokumentiert (Method/Path/Payload/Response/Fehlercodes) |
| WP6 | Tests: plugins_test.go-Wahrheitstabelle (meshsquad → true), meshsquad_test.go (hermetisch: Validierungs- + Probe-Zweige via httptest; DB-backed: Lifecycle-e2e mit ehrlichem Skip ohne Postgres — project_internal_test.go-Muster), vitest: neuer Wizard-Config-Test + Suite grün | Hermetische Go-Tests grün ohne Stack |
| WP7 | Dieses Sprint-Doc; i18n: KEINE neuen Keys in Locales (FREMD) — Wiederverwendung + Handoff-Liste | check:i18n unverändert PASS |

**S154-artige Schutzregeln für Uninstall (wo anwendbar — ehrlich):**
405 non-DELETE; 404 unbekannte id (nie still success); Closed-Set: die
meshsquad-Route löscht NIEMALS die Row eines anderen Plugins (404 mit
Begründung); Vault-Cleanup: die von der Installation erzeugten
vault_secrets (secretRef) werden mitgelöscht (Best-Effort; Scope-Row
bereits weg → ehrlicher Notice statt Fake-Erfolg). Kein is_internal-artiger
In-Use-Refuse: ES EXISTIERT heute keine persistierte Referenz aus
Deployments auf eine meshsquad-Installation (grep internal/deploy:
0 Treffer) — ein 409 „in use“ wäre eine erfundene Regel, kein Schutz.

**Akzeptanz-Kriterien:**
1. GET /api/plugins: meshsquad installable=true, abgeleitet aus
   pluginBackendRoutes (synchron mit gateway.go-Registrierung).
2. POST /api/plugin-installations (meshsquad, crewApiUrl) persistiert die
   Row; crewApiUrl-Garbage → 400.
3. status/health: echte Rows/echte Messung; nicht konfiguriert → ehrlicher
   Zustand, kein Fake.
4. Uninstall: 200 + Row weg (+ Status zählt 0), re-DELETE 404, fremde
   Plugin-id 404, Vault-Secrets weg.
5. make go-build + make go-vet Exit 0; hermetische Go-Tests grün (DB-Tests
   skippen ehrlich — Stack ist bewusst down); Frontend: tsc 471 Baseline,
   vitest grün, check:i18n unverändert PASS.

## Arbeitslog (was tatsächlich passiert ist, Datei:Zeilen-Belege)

**Attribution ehrlich:** Der S163-Agent stieg ohne Meldung ab (Abbruchmuster
dieser Welle), der komplette Arbeitsbaum war jedoch schon im Tree. Der
Fortsetzungs-Agent hat nichts neu erfunden, sondern nur noch Verifikation +
Dieses Doc gefahren — Belege unten sind am fertigen Tree geprüft.

**WP1 — `src/backend/internal/gateway/meshsquad.go` (NEU, ~300 Z.):**
- Routenkopf + Sync-Hinweis (Zeilen 12–17): `GET /api/plugins/meshsquad/
  status`, `GET …/health`, `DELETE …/installations/{id}`.
- `validateMeshSQuadInstallConfig` (63): `config.crewApiUrl` muss, WENN
  gesetzt, eine gültige http(s)-URL sein — sonst 400 mit Beispiel (74);
  leer/unset bleibt erlaubt (Katalog-Default deckt es).
- `meshSquadCrewAPIBase` (86): liest die NEUESTE aktivierte Installation —
  kein erfundener Default-Host.
- `probeMeshSquadHealth` (125): ECHTER Probe gegen `{base}/health`
  (manifest `healthCheck.path`, 5s Timeout), liefert statusCode/durationMs
  — 2xx = healthy (meshsquad-Compose-Healthcheck = `curl -f`, gleiche
  Semantik), Netzfehler werden VERBATIM gemeldet.
- `handleMeshSquadStatus` (156): echte Rows, ehrliches `[]` + `count: 0`;
  Query-Validator: `scopeType`/`scopeId` paarweise oder gar nicht (400).
- `handleMeshSQuadHealth` (189): nicht konfiguriert →
  `{configured:false, reachable:false, notice}` (199) statt Fake.
- `handleMeshSquadUninstall` (230): 405/400/404-Zweige, **Closed-Set**
  (fremde plugin_id → 404 mit Begründung, 251), Vault-Secrets-Cleanup
  mit ehrlichem `notice`, wenn die Scope-Row schon weg ist. Bewusst KEIN
  "in use"-409 (grep `internal/deploy`: 0 Treffer — erfundene Regel).

**WP2 — Registrierung:**
- `gateway/gateway.go:352–354` die 3 `mux.HandleFunc`-Zeilen + Kommentar
  341–351 (Warum keine Chat-Proxy: der Chat-Raum bleibt ein Direkt-Call).
- `gateway/plugins.go:74–77` = `pluginBackendRoutes["meshsquad"]` mit
  exakt denselben 3 Routen → der Katalog leitet `installable=true` AB,
  nie handgesetzt (Akzeptanz 1); Kommentare 30–31, 65–68, 116–125.

**WP3 — `src/backend/internal/store/plugin_installations.go`:**
- `ErrPluginInstallationNotFound` (239), `GetPluginInstallationByID` (242,
  `sql.ErrNoRows` → Präzisionsfehler), `DeletePluginInstallation` (275,
  RowsAffected 0 → nie still ok). Idiom = `vault.go`/`DeleteVaultSecret`.

**WP4 — Install-Validierung + Wizard-Repair (Frontend):**
- `gateway/plugins.go:264–269`: meshsquad-Branch im generischen
  POST-Validator (crewApiUrl-URL-Check, 400 sonst).
- `PluginInstallWizardDialog.tsx`: `authMode`-Union +`service_account`,
  `mcpUrl` → `endpointUrl`, `isMeshSquad`-Komposition — der Config-Body
  wird pro Plugin gebaut: meshsquad → `{crewApiUrl}` (KEIN apiKey-Feld,
  der Stack authentifiziert sich selbst laut plugin.yaml), jules
  unverändert `{mcpUrl, apiKey}`; Review-Zeilen spiegeln dasselbe
  Label-Mapping.
- `types/domain/plugins.ts`: `authModes`/`authMode`-Union um
  `'service_account'` (der Wire-Spiegel darf nicht lügen).
- `meshsquad-chat.ts` + `MeshSquadChatEntry.tsx` + `MeshSquadChatGate-
  Section.tsx`: die alten "HONEST CAVEAT — installable ist HEUTE immer
  false"-Kommentare auf den neuen Zustand umgeschrieben (echter Signal-
  Pfad, auf altem Binary weiterhin ehrlich ausgegraut).

**WP5 — `docs/API_DOCS.md` (+29 Zeilen):** `/api/plugins`-Zeile
(`meshsquad → true since SPRINT-163`), `POST /api/plugin-installations`-
Zeile (+ crewApiUrl-400), neue Sektion „Plugins — MeshSquad lifecycle"
mit den 3 Routen inkl. Payload/Response/Fehlercodes + Curl-Beispiel.

**WP6 — Tests:** `meshsquad_test.go` (4: Validierung ohne DB, PROBE misst
wirklich gegen httptest, Uninstall-Zweige ohne DB, Lifecycle-E2E mit
ehrlichem `t.Skip` ohne Postgres), `plugins_test.go` Wahrheitstabelle
`TestPluginCatalogInstallableSignal` erwartet `meshsquad: true`, Wizard-
Config-Test (`PluginInstallWizardDialog.meshsquad.test.tsx`, 2),
Titel-Präzisierung in `MeshSquadChatEntry.test.tsx` +
`MeshSquadChatGateSection.test.tsx` (SIGNAL, nicht "heute immer false").

**WP7 — Dieses Doc; i18n: KEINE neuen Keys** (Wiederverwendung, die 2
Titel-Änderungen sind Test-Strings, keine Locale-Strings) → check-i18n
unverändert.

## Verifikations-Transkript (1.10., OHNE lokalen Stack — Operator-Order
„nicht lokal deployen"; die DB-Tests skippen dafür ehrlich)

1. `make go-build` → Exit **0** (Container `golang:latest`, kein Host-Go).
2. `make go-vet` → Exit **0**.
3. `go test ./... -count=1` (ohne `DATABASE_URL`): `internal/gateway` **ok**,
   `internal/store` **ok**. Bewusst fehlschlagend nur die 4 Packages, die
   eine Postgres-Verbindung erzwingen (`internal/service`, `internal/ai`) —
   `dial tcp 127.0.0.1:5432: connect: connection refused`, Stack ist down,
   nicht S163-verursacht.
4. `go test ./internal/gateway/ ./internal/store/ -count=1 -v` — die
   S163-Relevanz:
   - `--- PASS: TestMeshSquadStatusValidationNoDB`
   - `--- PASS: TestMeshSquadProbeMeasuresReally`
   - `--- PASS: TestMeshSquadUninstallValidationNoDB`
   - `--- SKIP: TestMeshSquadLifecycleEndToEnd` (ehrlich: kein Postgres)
   - `--- PASS: TestPluginCatalogInstallableSignal` (meshsquad = true)
   - `--- PASS: TestPluginInstallValidationNoDB`
5. Frontend: `npx vitest run` → **61 Dateien / 493 Tests grün**; gezielt
   die S163-Suiten: `MeshSquadChatGateSection` 3/3, `MeshSquadChatEntry`
   4/4, `PluginInstallWizardDialog.meshsquad` 2/2 → **9/9**.
6. `npx tsc -p tsconfig.app.json --noEmit | grep -c 'error TS'` → **414**,
   davon **0** in S163-Dateien (grep `meshsquad|plugins|GateSection|
   WizardDialog` → 0 Zeilen).
7. `node scripts/check-i18n.mjs` → PASS 60 Locales / 3307 Keys (unverändert).

## Offene Items (ehrlich)

- **Lifecycle-E2E ist NICHT gegen echte DB gelaufen** (`TestMeshSquad-
  LifecycleEndToEnd` = SKIP ohne Postgres). Vollständig grün wird sie mit
  `make go-test`, sobald der Stack mal läuft — derselbe Befehl, kein Code-
  Change nötig.
- **Kein Live-Install gegen ein echtes meshsquad-Stack** behauptet: der
  health-Probe-Pfad ist unit-seitig gegen httptest bewiesen, nicht gegen
  `127.0.0.1:8113`. Operator-Schritt, wenn die crew-api läuft:
  `POST /api/plugin-installations {pluginId:"meshsquad", …}` →
  `GET /api/plugins/meshsquad/health`.
- **`authModes`-Union ist eine Wire-Erweiterung**: alte Frontends auf
  neuem Backend (oder umgekehrt) sind tolerierbar (union nur erweitert),
  aber ein Rollback des Backends macht `service_account`-Rows wieder
  ungültig — im Rollback-Runbook nicht dokumentiert (Handoff).
- **`plugins.crewApiUrl` als eigener i18n-Key fehlt noch** — der Wizard
  nutzt aktuell den generischen Label-Pfad (bewusst, kein Locale-Slop in
  diesem Sprint); Handoff an die nächste i18n-Welle.
- **`/api/plugins/meshsquad/*` steht NICHT hinter einem eigenen
  Rollout-Gate** — die Routen nutzen denselben Auth-Middleware-Pfad wie
  `/api/plugins` (kein Sonderfall erfunden).

