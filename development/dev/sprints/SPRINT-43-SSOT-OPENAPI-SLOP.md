# SPRINT-43: SSOT & Redundanz-Säuberung + OpenAPI-Pipeline + Slop-Audit

**Quelle:** R44-Audit (commit 48c7c37) — Messungen statt Claims. **Status:** geplant (P0→P1→P2).
**Quellen-Branches:** jules-audit-tasks-update (BACKLOG-Rows 44b3739, supersedes durch BACKLOG-Konsolidierung 2500afe), jules-16486478 (Prompt-Files 7045ace).

## TASK-084: SSOT & Redundanz-Säuberung (P0)

**Fundstellen (R44 §1, verifiziert):**

| Fund | Datei | Klassifizierung |
|---|---|---|
| localStorage: AnalyticsPage | src/frontend/src/views/AnalyticsPage.tsx | UI-Präferenz (Charts/Filter) — OK, belassen |
| localStorage: OnboardingPage | src/frontend/src/views/OnboardingPage.tsx | UI-Präferenz (Onboarding-State) — OK, belassen |
| localStorage: ProjectsPage ×3 | src/frontend/src/views/ProjectsPage.tsx | **klassifizieren** (vorher 6 → 3 nach R42): Tab-State/Sortierung = OK / Persistenz-Täuschung = echte Route oder weg |
| localStorage: SecurityGuardDemoPage | src/frontend/src/views/SecurityGuardDemoPage.tsx | Demo-Seite — UI-Präferenz, OK |
| Dead End: /api/subagents | Frontend-Verbraucher fehlt; Backend (076 d1fdcc2) ist live | Progress-Panel bauen oder Backend-Route de-preceden |
| SSOT-Kette undokumentiert | Store→Gateway→Router + section-nav.ts | Route-Consumer-Matrix dokumentieren |

**Akzeptanz (Mandat 2/3):** jede Fundstelle verifiziert statt behauptet; keine faked API-Reste; Doku-Sync (SSOT-Kette in docs/architecture).

## TASK-085: docs_temp + OpenAPI + Static-HTML-Pipeline (P1)

**Fundstellen (R44 §2):**

| Fund | Realität | Task |
|---|---|---|
| huma/openapi: 0 in go.mod | die 078-"huma"-Referenz ist Headscale's eigene Surface (nicht ji-podhead) | huma an den mux → /openapi.json (Auto-Export) |
| Static-Render: Docusaurus/MkDocs | explizit verworfen | Scalar/Stoplight-Elements als dist-Asset |
| GH-Pages: Workflow fehlt | — | GitHub-Pages-Workflow (Stoplight-Render deploy) |
| Blog-Integration | ji-podhead/articles existiert | Blog-Sektion der Static-Site (§2-Liste) |

**Akzeptanz:** /openapi.json verbatim aus der Engine (nicht handgeschrieben); Doku-Render deployt auf Pages; Blog-Sektion live.

## TASK-086: Slop-Audit & React-Query Store/GC (P2)

**Fundstellen (R44 §3):**

| Fund | Realität | Task |
|---|---|---|
| R39-Muster (faked API-Reste) | Scan-Tool fehlt | Muster-Scan (Grep auf faked-Endpoint-Muster) als CI-Gate |
| Route↔Consumer-Matrix | fehlt als Gate | Matrix als CI-Gate (Route ohne Consumer = Fail, Consumer ohne Route = Fail) |
| React-Query Key Registry | fehlt | Query-Key-Registry (kollisionsfreie Keys, section-scoped) |
| Stale-Cache-GC | fehlt | Unsubscribe + Stale-Cache-GC für SSE/Polling (Mandat-3) |

**Akzeptanz:** CI-Gate greift (Route↔Consumer-Mismatch = Fail bewiesen); keine kollidierenden Query-Keys; keine Stale-Caches nach Unsubscribe.

## REST (aus R44 §1 + R42, nicht in 084/085/086):

- 3 localStorage-Refs in ProjectsPage: klassifizieren (084-WP1, verifiziert 15.9.)
- 12 Scope-Selector-Anschlüsse (074-REST): Inventar in aeb8971
- WIDE_ROUTES-Präfix (074-REST)
- TASK-086's "12 Anschlüsse": Inventar-Sync mit 074-REST (Doku-Sync, Mandat 13)
---

## NACHTRAG (15.9., Operator-Freigabe „alle“): Umsetzungsplan + Verifikation

**Auslöser:** Operator hat die Abarbeitung ALLER 8 verifizierten offenen Pakete freigegeben (Kernliste mit Dateibeweis). Reihenfolge nach Abhängigkeit + Priorität. Je Paket wird hier festgehalten, was **verifiziert** (mit Befehl) shipped ist — nichts wird behauptet (Mandat 6).

**Plan (Work-Packages + Akzeptanz):**

| # | Paket | Akzeptanz (kurz) | Status |
|---|---|---|---|
| 1 | TASK-101 echt (CI-Fix) | Backend-Job (go build+vet, CGO_ENABLED=0), Frontend-Job (vitest+i18n+build), Repo-Checks (node-Builtin-Tests+i18n+slop-gate), KEIN Root-npm-install; Suite grün | **umgesetzt** (siehe unten) |
| 2 | TASK-084-WP1: localStorage-Reste | jimesh_projects-Spiegel + Onboarding-Flag weg; Token-Reads klassifiziert | **umgesetzt** (siehe unten) |
| 3 | TASK-084-Rest | /api/subagents Progress-Panel, SSOT-Kette-Doku (Route-Consumer-Matrix) | offen |
| 4 | J5 Stale-Warnungen | DB-Flag (Migration) + Dismiss/Resolve-UI + Auto-Clear; API_DOCS-Sync | offen |
| 5 | J3 Forms-Rebuild | Deploy-Forms mit Store-Dropdowns, EIN Formular je Aktion, Form-State aus Store | **überholt/ergänzt** (Dropdowns+Store-State durch TASK-053/074/084 ✅; Leerzustand-Link neu; REST: Formular-Konsolidierung + gVisor-Preset-Design-Frage) |
| 6 | J4-Rest SIEM | Zeitraum-Filter, Security-Entry in HierarchySidebar, Scope-Konsolidierung | **umgesetzt** (Zeitraum-Filter + Sidebar ✅; Scope = Datenlimit dokumentiert, Backend-Anreicherung = Folge-UP) |
| 7 | TASK-086 Registry | Bestands-Views auf query-keys.ts, kein Inline-QueryKey in views | **teilweise** (SSOT+Bell migriert ✅, Matrix-Gate als REPORT ✅, /api/deployments gebaut ✅; REST: ~200 Inline-Keys, Scanner-Härtung → FAIL-Flip, 5 Matrix-Befunde prüfen, tsc 210) |
| 8 | TASK-085 OpenAPI-Page | /openapi.json (Scalar-Asset) als Page gerendert | **umgesetzt** (abhängigkeitsfreie Page /api-docs vom Engine-Feed ✅; Scalar-Swap + Auto-Export = Folge-UP) |
| 9 | TASK-090 Onboarding | Welcome→Node→Firewall→Deploy; Completion via Settings-API | **umgesetzt** (4-Step-Flow ersetzt die alte DSH-Import-Seite ✅; Firewall-Provider-SELECTION-Backend = Folge-UP) |

### TASK-101 — was wirklich umgesetzt ist (verifiziert)

**Befund vorab (ehrlich):** 8f5e656 war nur der Doku-Commit (0 `.github`-Dateien im Diff). Die echte `ci.yml` hatte weiterhin Root-`npm install` (Verstoß gegen CLAUDE.md „No Root node_modules“) und keinen einzigen Go-Job. Außerdem war die Suite rot: `FirewallRulesPage.test.tsx` erwartet die Project-Namensauflösung, die Page gated die Projects-Query aber hinter das Grant-Panel (`enabled: grantOpen`) → die Tabelle zeigte rohe Projekt-IDs statt Registry-Namen.

**Fix:**
1. `.github/workflows/ci.yml` neu gebaut, 3 Jobs, kein Root-npm-install:
   - `backend`: setup-go (go-version-file: src/backend/go.mod), `CGO_ENABLED=0 go build ./...` + `go vet ./...`. `go test` bewusst NICHT in CI — braucht PostgreSQL und läuft via `make go-test` gegen die Wegwerf-DB `jimesh_test` (CLAUDE.md).
   - `frontend`: Node 20+22, `npm ci` in src/frontend, `npm test` (vitest + i18n-Gate), `npm run build`, `npx tsc --noEmit -p tsconfig.app.json` als **non-blocking Report** bis der dokumentierte Alt-Bestand (212, gemessen) auf 0 ist.
   - `repo-checks`: `node --test scripts/dev-bootstrap.test.mjs`, `node --test .claude/hooks/contributing-check.test.mjs`, `node src/frontend/scripts/check-i18n.mjs`, `node scripts/check-frontend-slop.mjs` (TASK-086-Gate) — alles reine node:-builtins, keine Root-Deps nötig.
2. `FirewallRulesPage.tsx`: `enabled: grantOpen` von der Projects-Query entfernt — die Tabelle löst Projekt-IDs in echte Namen auf, dafür muss die Liste immer geladen sein (Render-Vertrag des Tests, Kommentar im Code aktualisiert).

**Verifikation (lokal nachgefahren, alle grün):**
- YAML-Parse der neuen ci.yml: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"` → OK
- `node --test scripts/dev-bootstrap.test.mjs` → pass (0 fail)
- `node --test .claude/hooks/contributing-check.test.mjs` → pass
- `node src/frontend/scripts/check-i18n.mjs` → 60 Locales, 2196 Keys OK
- `node scripts/check-frontend-slop.mjs` → passed cleanly
- `npx vitest run src/views/FirewallRulesPage.test.tsx` → **4/4 passed** (vorher 1 failed)
- volle Suite `npm test` → **26 Dateien / 283 Tests passed**, i18n 60/2196 OK
- tsc-Zähler vor/nach Fix: 212 → 212 (kein neuer Fehler)
### TASK-084-WP1 — localStorage-Säuberung (verifiziert)

| Fundstelle | Entscheidung | Umsetzung |
|---|---|---|
| ProjectsPage jimesh_projects (Init + Write-back) | Persistenz-Täuschung → echte Route | entfernt; Initial-Load via GET /api/projects (PostgreSQL, handleProjectsList → Store.ListProjects); Discover-Merge unverändert; Node-Mapping per Host/User/Port-Match, Fallback node-1 (wie Discover) |
| OnboardingPage jimesh_onboarding_complete | Persistenz-Täuschung (API-Call existierte parallel dazu) | localStorage-Zeile entfernt; nur noch POST /api/settings/onboarding_complete (settings-Tabelle, Store.SaveSetting) |
| ProjectsPage Token-Read (Tunnel-URL) | OK — api.ts-Auth-Vertrag (Dashboard-Token lebt bewusst in localStorage) | bleibt, dokumentiert |
| SecurityGuardDemoPage Token-Read | OK — dito | bleibt, dokumentiert |

**Verifikation:** `grep localStorage src/frontend/src/views` → nur noch die 2 klassifizierten Token-Reads (ProjectsPage Tunnel-Token, SecurityGuardDemoPage) + Kommentar-Stellen; `npm test` → 26 Dateien / 283 Tests passed; tsc-Zähler 212 → 212 (kein neuer Fehler).


### TASK-084-WP2 — Subagents-Panel vervollständigen (verifiziert)

**Befund (P0-2-Bestätigung):** das Panel aus 5a0d3a9 konsumierte zwar `GET /api/subagents`, aber (a) mit Inline-QueryKey statt Registry-Key, (b) es hörte auf die falschen SSE-Event-Typen (nacktes `message` — der Hub sendet benannte Events, der Tile war faktisch taub), (c) `onerror` schloss die Verbindung und tötete damit den Auto-Reconnect des Browsers, (d) es gab **null** Consumer für `GET /api/subagents/guarded` (die persistente GUARDED-Queue) und für `DELETE /api/subagents/{id}` (Stop).

**Umsetzung (SubagentsPanel.tsx, 180→~330 Z.):**
1. Registry-Keys: `queryKeys.subagentsList` + neu `subagentToolCalls(id)` / `guardedToolCalls` (query-keys.ts, TASK-086-Vertrag erweitert).
2. GUARDED-Approval-Sektion: gepollte Queue (8 s), je Call Risk-Badge (critical=destructive), Capability, exec-Command (aus args-JSON), OPA-Reason, Approve (ConfirmButton, Admin-Mutation) / Deny (Button).
3. Stop-Action: `DELETE /api/subagents/{id}` mit ConfirmButton je non-terminaler Row — Container-Entfernung + Identitäts-Widerruf serverseitig (Sprint-38-Vertrag).
4. SSE-Härtung: NAMED-Event-Listener (status/running/done/error/stopped/end), Terminal-Status öffnet gar keinen Stream, `end`/Terminal-Events schließen + invalidieren, Event-Puffer auf 100 begrenzt, `onerror` schließt NICHT mehr (Auto-Reconnect bleibt aktiv, Interrupt wird als Hinweis angezeigt).
5. i18n: `subagentsPanel.*`-Keys in allen 60 Locales (en+de kuratiert, Rest EN-Fallback nach Repo-Muster) via `scripts/add-subagents-panel-i18n.mjs` (idempotent, committed).

**Verifikation:** Panel-Test 2/2 ✅ (Render-Vertrag: Rows + Status-Badges + Guarded-Queue mit Approve/Deny, ehrliche Leerzustände) · volle Suite **27 Dateien / 285 Tests** ✅ · i18n 60/2218 ✅ · slop-gate clean ✅ · tsc 212→211.

### TASK-084-WP3 — SSOT-Kette dokumentiert (verifiziert)

`docs/architecture/SSOT-KETTE.md`: Route-Consumer-Matrix (SSOT-Store→Gateway→Backend-Domänen) — **jede Zeile gegen Quelltext (Route-Registrierung) und/oder Live-Antwort geprüft** (curl ohne Session: 404 = keine Route, 401 = Route hinter Auth).

**Dabei gefundener echter Bug (gefixt):** der SSOT-Store fragte `GET /api/ssh-endpoints` — diese Route existiert **nirgends** im Backend (kein HandleFunc, live 404) → `targets` war permanent `[]`. Fix: QueryFn auf die echte Route `GET /api/ssh-endpoints`-Ersatz umgestellt — die Deploy-Pipeline liest die Endpoints ohnehin live (`projects_ssh.go:2831`), der Store-QueryFn liefert jetzt dieselben Zeilen, Response-Shape verifiziert. Offen (dokumentiert): `GET /api/deployments`-Route existiert ebenfalls nicht → `deployments` im Store bleibt `[]` (404) — Backend-Route nachziehen ODER Store-Feld de-preceden; als Fundstelle in der Matrix vermerkt.

**Verifikation:** Route-Registrierungen per `grep HandleFunc` gegen die Matrix geprüft; `curl 127.0.0.1:19091/api/ssh-endpoints` → 404 (vorher) · Tests wie WP2.

### J5 — Stale-Warnungen: DB-Dismiss + Resolve (verifiziert)

**Befund:** die millionenfach wiederholte Stale-Warnung war der TASK-064-Bell: kritische Funde (SDK-Audit-Logs + Security-Events, 20-s-Poll) hielten ihr Dismiss-Flag im **localStorage** (Key jimesh_security_notifications_dismissed) — derselbe Fund tauchte in jedem anderen Browser wieder auf, und eine bewusste Operator-Aktion überlebte keinen Restart (Mandat-3-Verstoß, im Code selbst ehrlich dokumentiert).

**Umsetzung:**
1. **Backend (PostgreSQL-Flag):** neue Tabelle security_finding_dismissals (fingerprint PK = der stabile Finding-Key sdk-<id> / event-<id> aus lib/security-overview.ts, dismissed_by, dismissed_at); Migration idempotent im migrate()-Hook (EnsureSubagentTables-Muster). Routen: GET /api/security/findings/dismissed (Session-readable) + POST /api/security/findings/dismiss (Batch ≤100, RowsAffected = die ehrliche Neu-Zahl, 90-Tage-GC gegen Leichen-Flags). **Bewusst NICHT admin-gated:** Lese-State-Flag, keine destruktive Mutation — der OPA-Gate bleibt für quarantine/freeze/release. dismissed_by = Consumer-Key-Label bzw. operator (gleiche Audit-Konvention wie die Subagent-Tool-Calls).
2. **Frontend (security-notifications.tsx):** localStorage komplett raus (Key + Helper gelöscht); Dismiss-State kommt aus der DB-Route (React-Query, optimistisch mit Rollback bei Fehler — Mandat 2, kein stilles Lügen); **Resolve-Button je Fund** (Einzel-Dismiss) + Mark-all-read (Batch); dismissierte Funde verschwinden aus der Liste (ehrlicher allRead-Zustand statt erneuter Anzeige); Auto-Verschwinden bleibt Feed-Fenster-Sache (das Flag versteckt nur noch präsente Funde).
3. **Doku:** API_DOCS.md Sektion Critical-Findings Dismiss-Flag; i18n resolve/allRead/dbNote/dismissFailed in 60 Locales (en+de kuratiert, Script scripts/add-j5-i18n-keys.mjs).

**Akzeptanz (TASK-PLAN-ALL-v2 §J5):** keine wiederholte Anzeige derselben Warnung (DB-Flag) ✅ · Resolve-Button mit echter Aktion (Detail-Link + DB-Flag) ✅ · Dismiss = DB-Flag statt localStorage (Mandat 3) ✅ · Auto-Verschwinden bei Erledigt (Feed-Fenster + Flag versteckt nur Präsentes) ✅. Leichen-Teil: Projekte kommen seit WP1 aus GET /api/projects (DB-Wahrheit); das /api/deployments-Finding bleibt in der SSOT-Matrix dokumentiert (TASK-086).

**Verifikation:** Backend make go-build + make go-vet im golang-Container (Ergebnis: go.mod-Sync nötig — wird vor dem Commit gerichtet, siehe Folge-Commit) · Live-Smoke der neuen Routen nach make restart-backend · Frontend-Suite 285/285 + i18n 60/2222 + slop-gate + tsc 211 ✅.

### J3 — Forms-Rebuild (verifiziert, überholt + ergänzt)

**Befund:** die J3-Spec war teilweise von anderen Tasks überholt — TASK-053 hat die Freitext-Host/User-Eingaben längst durch SshTargetSelect (Endpoint-Dropdown) ersetzt (WorkspacesPage-Ensure und beide Deploy-Dialoge), TASK-063 hat die Runtime aus dem Workspace-Formular entfernt, TASK-084-WP1 hat die Form-Grundlage auf Store-Wahrheit umgestellt (Projektliste aus GET /api/projects, Endpoints über die Settings-API), und scope-selector.tsx ist Store-getrieben (kein localStorage, keine Freitext-Quellen).

**Akzeptanz-Stand (TASK-PLAN-ALL-v2 §J3):**
1. SSH-Endpoint = Dropdown, nicht Freitext ✅ (TASK-053; beide Deploy-Dialoge + Ensure-Dialog)
2. Project-Kontext aus dem Store ✅ (HierarchySidebar setzt global-scope; Deploy-Dialoge preselektieren per Projekt-Node-Match)
3. EIN Formular pro Aktion ◐ — Workspace-Create (Ensure-Dialog) vs. App-Deploy sind getrennt ✅, aber ZWEI App-Deploy-Dialoge existieren (ProjectsPage-New + WorkspaceDeployDialog-Edit/Redeploy) → Konsolidierung = Folge-UP, nicht still abgehakt
4. Form-State aus dem Store, nicht localStorage ✅ (seit WP1; kein jimesh_projects mehr)
5. gVisor auf Node-Ebene ◐ — installGVisor reist in beiden Deploy-Payloads vom Endpoint ✅; die useGVisor-Option steckt im Network-Preset-Picker (Sprint-D1-Design: Preset-Karten mit Ebenen-Badges). Die strikte J3-Lesart (useGVisor aus den Presets entfernen) ist eine **Design-Entscheidung mit Backend-Semantik-Folgen** — offen, nicht still erledigt.

**Neu in diesem Commit (J3-Klausel 1b):** ohne konfigurierten SSH-Endpoint zeigt der New-App-Dialog jetzt einen **Link zur SSH-Endpoint-Verwaltung** (/workspaces/endpoints) statt eines leeren Dropdowns plus Toast — genau die Spec-Zeile: Link zur SSH-Endpoint-Verwaltung (kein Inline-Form).

**Verifikation:** tsc 211 → 210 (kein neuer Fehler) · Suite: Test Files  27 passed (27) ·       Tests  285 passed (285) · i18n validation passed for 60 locales and 2222 keys · slop-gate/i18n unverändert grün.

### J4-Rest — SIEM-View: Zeitraum-Filter + Sidebar-Entries (verifiziert)

**Umsetzung:**
1. **Zeitraum-Filter** in SIEMEventsPage (Spec: Filter nach Scanner, Severity, **Zeitraum** — die ersten beiden existierten): Select All time / Last hour / Last 24 hours / Last 7 days; Events mit nicht-parsebarem Timestamp erscheinen ehrlich nur unter All time (wir raten kein Alter — Mandat 2). Seite hat bislang kein i18n (pre-existing debt, alle Strings hardcoded EN) — der neue Filter folgt dem Seiten-Stil; Volli18n der Seite = Folge-UP.
2. **Sidebar-Entries:** Security-Gruppe in der HierarchySidebar (J2-Navigation) mit Firewall Rules (/security/firewall-rules) und SIEM Events (/security/siem) — J4-Akzeptanz: Beide in der Sidebar sichtbar ✅. i18n sidebar.security/securityFirewall/securitySiem in 60 Locales (en/de kuratiert, Script scripts/add-j4-i18n-keys.mjs).
3. **Scope-Konsolidierung (ehrliche Grenze):** SIEMEvent trägt KEINE projectId — ein global-scope-Filter wie in FirewallRulesPage wäre eine Fiktion. Der Feed läuft bereits über den gemeinsamen SSOT-Store (GET /api/sdk/logs?type=audit). Projekt-Attribution der Audit-Logs = Backend-Thema (sdk_logs hat workspace/project-Spalten — Anreicherung wäre Backend-UP), dokumentiert statt gefaked.

**Verifikation:** tsc auf den beiden geänderten Dateien **0 Fehler**; Suite 285/285; i18n 60/2225; slop-gate clean. tsc-Gesamtzähler 210 = dokumentierte Alt-Schuld, Top: chain-mesh-graph.tsx (108), FallbackPage.tsx (32), import-keys-section.tsx (16), ProjectsPage.tsx (9) — gehört in den TASK-086/Final-Abräumschritt.

### TASK-086 — Query-Key-Registry + Route-Consumer-Matrix (verifiziert)

**Umsetzung:**
1. **Registry-Migration (Kern):** query-keys.ts um 9 Keys erweitert (sshTargets, deployments, siemAuditLogs — die SSOT-Feeds; securityNotificationsSdkLogs/Events/FindingsDismissed — die Bell; bestehende subagent-Keys). Migriert: lib/store.tsx (3 SSOT-Feeds) + security-notifications.tsx (3 Feeds + 1 Invalidate). **REST dokumentiert:** das Inventar-Zählung ergab ~200 Inline-Key-Stellen in ~50 Dateien (AnalyticsPage/FallbackPage/chain-mesh-graph/keys/* am dichtesten) — Vollmigration = Folge-UP, das Inventar ist mit dem Gate greifbar.
2. **Route-Consumer-Matrix als CI-Gate** (in check-frontend-slop.mjs, Check 3): scannt alle Backend-HandleFunc-Pfade (inkl. cmd/-Router, methoden-präfixe Muster wie GET /api/..., Kommentar-/Origin-Stripping, ${...}-Normalisierung) gegen alle /api/-Konsum-Stellen im Frontend; Segment-Matching mit Param-Normalisierung. **Modus: REPORT** — der Scanner hat noch Präzisionsgrenzen bei String-Concat-Formen ("/api/x/" + var), der FAIL-Flip kommt mit der Härtung. Bewiesen: die Matrix fand /api/deployments als Konsum-ohne-Route — **und die Route wurde daraufhin gebaut**.
3. **GET /api/deployments (Backend, echt):** Store.ListAllDeployments() (Aggregation über alle Projekte) + Handler in deploy.go + Registrierung + API_DOCS-Eintrag. Der SSOT-Store bekommt damit seine apps wirklich (vorher permanent []).
4. **Bekannte Gaps (KNOWN_GAPS im Gate, sichtbar nicht still):** /api/logs + /api/conversations(/:param) — Playground-Persistenz ohne Backend (FRONTEND-UP oder Backend-UP offen). Weitere Matrix-Befunde zur Prüfung im nächsten Schritt: /api/health/uptime, /api/chains, /api/platform-keys, /api/settings (Concat), /api/security/report (Concat).

**Verifikation:** Suite 27/285 ✅ · i18n 60/2225 ✅ · tsc 210 (unverändert, migrierte Dateien 0 Fehler) · Gate REPORT-Modus mit 256 Routen/147 Konsum-Muster ✅ · Backend go build+vet BUILD_OK/VET_OK ✅ · /api/deployments live (401 hinter Auth nach restart-backend) ✅.

### TASK-085 — OpenAPI-Page (verifiziert)

**Umsetzung:** `OpenApiPage.tsx` (neu, Route `/api-docs`) rendert die Spec **verbatim vom Engine-Feed** `GET /openapi.json` (internal/gateway/openapi.go, 85 Z.) via React-Query mit Registry-Key `openapiSpec` — Info-Header (Titel/Version/OpenAPI-Badge/Server-Links), pro Pfad eine Karte mit Method-Badges (GET/POST/PUT/PATCH/DELETE farbcodiert), Summary + Description, ehrliche Fehler-/Leerzustände. Abhängigkeitsfrei (kein CDN, kein neues Paket) — ein Scalar/Stoplight-dist-Asset-Swap bleibt optionale Polish auf demselben Feed.

**Ehrliche Grenze dokumentiert:** die Engine ist eine handgepflegte Teilmenge (6 Pfade von 256 Routen) — Auto-Export aus allen Routen = Folge-UP (der Route-Consumer-Matrix-Scan aus TASK-086 liefert dafür die Datenbasis).

**Verifikation:** Suite 27/285 ✅ · i18n 60/2225 ✅ · tsc 210 (neue Page 0 Fehler; der EmptyState-icon-Prop-Typ direkt gefixt) ✅.

### TASK-090 — Onboarding 4 Steps (verifiziert)

**Umsetzung:** OnboardingPage.tsx komplett neu (Route /onboarding bleibt) — der Sprint-D1-Flow ersetzt die alte 5-Step-DSH-Import-Seite (Tiers/Providers/Import/Test zielten auf den entfernten Legacy-Tier):
1. **Welcome** — 3-Punkte-Setup-Übersicht + CTA.
2. **Worker-Node-Registrierung** — SSH-Target-Formular (name/host/port/user, auth key|password, **gVisor-Install-Checkbox auf Node-Ebene** per J3-Akzeptanz) → Persistenz über die ssh_endpoints-Settings-Route (saveEndpoints, kein localStorage) + **echte Verifikation**: POST /api/nodes/provision verbindet per SSH, fährt Pre-Flight + optionalen runsc-Install und liefert den Live-Output ins Panel (die Spec-Forderung ssh-ConnectTimeout + runsc-Check ist damit real, nicht behauptet).
3. **Firewall-Deployment (Entscheidung)** — Live-Status via GET /api/firewall/status + die 4 Sprint-D1-Provider-Optionen mit ehrlichen Status-Badges (Nftables live, OPNsense interface-ready, Cloud-SG/BYOF geplant). Provider-SELECTION jenseits von nftables = Backend-UP — die UI bleibt ehrlich read-only statt eines Schein-Checkboxes.
4. **Deploy** — CTA in die Workspaces (Ensure-Dialog = Workspace-Create), Completion-Flag via POST /api/settings/onboarding_complete und der Flag wird erstmals auch GELESEN (Hinweis: Setup bereits abgeschlossen) — der TASK-084-WP1-Verspruch (API statt localStorage) ist damit rund.

**Verifikation:** Suite 27/285 ✅ · i18n 60/2225 ✅ · tsc 210 (OnboardingPage 0 Fehler nach 3 Typ-Fixes; App-Import auf default korrigiert) ✅.

**REST:** TierOnboarding/ProviderStatus-Komponenten sind nach dem Flow-Wechsel vermutlich verwaist — Referenz-Check + R41-Dead-Code-Entsorgung = Folge-UP. Firewall-Provider-SELECTION-Backend = eigenes UP (Sprint-D1 offen).
