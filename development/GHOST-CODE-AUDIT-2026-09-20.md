# Ghost-Code- & Dubletten-Audit — JiMesh (2026-09-20)

**Audit-Geltungsbereich:** kompletter Baum `/` (Frontend, Backend, Deploy, website, docs, Beispiele, Root-Skripte) im frischen Worktree `/tmp/wt-ghost2`, Branch `wt-ghost-audit2`, Basis `main` @ `463ee6f` (fix i18n Locale-Parität).
**Methode:** statische Analyse — React-Import-Graph ab `src/frontend/src/app/[[...slug]]/page.tsx` bzw. `main.tsx`, Route-Registrierungen (`HandleFunc`) gegen Frontend-String-/Template-Literale (`/api/`, `/v1/`), API_DOCS-Extraktion (Tabellen- UND Prosa-Formate), Deploy-Referenzsuche (deploy/, Makefile, Compose, SDKs, jimeshctl). Alle Zahlen per Skript ermittelt, verdächtige Einträge einzeln per grep verifiziert.

---

## Executive Summary — Kernzahlen

| Kennzahl | Wert | Quelle |
|---|---|---|
| Frontend `<Route>`-Elemente | **94** (16 reine `<Navigate>`-Redirects) | `src/frontend/src/App.tsx:508-708` |
| Nav-Einträge in section-nav.ts | **37 Items in 5 Gruppen** (+ Admin-Tab) | `src/frontend/src/lib/section-nav.ts:88-230`, `App.tsx:308-326` |
| **Geister-Routen Frontend (unerreichbar)** | **5** | Kap. A.2 |
| Waisen-Routen (nur über Geist `/landing` erreichbar) | **2** (`/docs`, `/tour`) | Kap. A.3 |
| Tote Redirect-Routen | **3** (`/test`, `/playground`, `/health`) + totes `FULL_BLEED_ROUTES`-Mitglied | Kap. A.4 |
| **Defekte Navigation → 404** | **1**: Sidebar zielt auf nicht existierende Route | `HierarchySidebar.tsx:82` |
| Backend registrierte Routen | **262** (inkl. 1 Catch-all `/`) | `grep -r HandleFunc src/backend` |
| davon mit Dashboard-Consumer | **184** | Kap. B.1 |
| dokumentiert (API_DOCS.md), ohne Dashboard-Consumer | **54** | Kap. B.4 (Anhang) |
| externer Consumer (Deploy/SDK/CLI/Browser-Redirect) | **8** | Kap. B.3 |
| **echte Geister-Routen Backend** | **14** — alle auch undokumentiert = **14 API_DOCS-Bugs** (Verstoß gegen CLAUDE.md-Dokumentationsmandat) | Kap. B.2 |
| Route implementiert, einziger Konsument deaktiviert | **1** (`enabled:false` + falscher TODO-Kommentar) | `ContainerLogViewer.tsx:135-146` |
| nie importierte Frontend-Dateien | **23** | Kap. C.1 |
| Frontend-Geister gesamt | **28 Dateien / 6.623 LOC** (23 Waisen + `ProjectsPage` + 4 Vite-Ära-Artefakte) | Kap. C.1-C.3 |
| Backend-Geisterpakete (von keinem Binary erreicht bzw. Ghost-Binary) | **9 Einheiten / 1.631 LOC** | Kap. D (Tabelle) |
| Backend „dokumentiert, aber nicht im Deploy“ | **4 Einheiten / 1.197 LOC** | Kap. D |
| tote Frontend-Dependencies | **2** (+ 1 zur Diskussion) | Kap. E.1 |
| tote Go-Dependencies | **3** (+ 1 an Ad-hoc-Kette) | Kap. E.2 |
| Dubletten-Cluster | **11** | Kap. D |
| Root-Skript-Geister (stitch-*.cjs) | **16 Dateien / 721 LOC** | Kap. D.10 |
| No-Mock-Verstoß (MANDATES.md) | **1**: Datalake-Handler liefert hartkodierte Fake-Daten — **→ BEHOBEN 20.9.** (wt-p3-datalake, s. D.4) | `gateway/datalake.go:22-33` |
| **Ghost-LOC gesamt** | **≈ 10.172** (6.623 FE + 1.631 BE voll + 1.197 BE ad-hoc + 721 Root-Skripte) | — |

**Die fünf wichtigsten Findings:**
1. **Gateway-Mock + Geister-Page + tote Datalake-Implementierung gleichzeitig** (`gateway/datalake.go:22-33` Mock → Geister-Route `/dbs/datalake` `App.tsx:667` → nie erreichte echte Pakete `internal/datalake*`): ein Feature existiert dreifach, keins davon lebt richtig — und der Mock verletzt das No-Mock-Mandat.
2. **Dashboard-Marketing ist verwaist, website/ dupliziert es extern** — der Einstieg `/landing` (`App.tsx:510`) wird von nichts verlinkt; `/docs`/`/tour` sind nur aus `LandingPage.tsx:101,174,261` / `TourPage.tsx:160,420` erreichbar; parallel läuft dieselbe Fläche als eigenständige Next.js-Site (`website/src/app/page.tsx`, Deploy über `deploy/podhead-client/entrypoint.sh:28`).
3. **14 Backend-Routen sind komplett consumer-los** — inkl. der ganzen Session-Verwaltung `/api/auth/sessions{,/revoke,/refresh}` (`auth.go:181-183`) und der Task-API (`deploy.go:61-64`); alle 14 fehlen zudem in API_DOCS.md.
4. **Kafka/CDC-Kette (1.177 LOC) und Datalake (156 LOC) hängen an Binaries, die nirgends deployt sind** — kafkabridge nur in `.env.example:172-179` erwähnt, datalaked nirgends; die go.mod-Deps franz-go/pglogrepl/Prometheus-Client hängen an totem Code.
5. **Sidebar-Navigation ist kaputt**: `HierarchySidebar.tsx:82` navigiert auf `/workspaces/target/:id` — diese Route existiert in `App.tsx` nicht → jeder Target-Klick landet auf der NotFoundPage.

---

## A) Frontend-Routen: App.tsx vs. section-nav.ts vs. Verlinkung

### A.1 Bestand
- 94 `<Route>`-Elemente: 5 öffentliche (`App.tsx:509-514`: `/`, `/landing`, `/docs`, `/tour`, Splat mit AuthGate) + 89 im authentifizierten Baum (`App.tsx:531-708`).
- 16 `<Navigate>`-Redirects (`App.tsx:128,494,531,538,539,551,558,564,581,611,633,635,654,705,706,707`) — davon sind die meisten Legacy-Kompat (`/models`, `/models/chat`, `/fallback`, `/logs`, `/security/vault`), 3 sind tot (A.4).
- Nav-Quellen: `section-nav.ts:88-178` (37 Items: proxyItems 8 × :93-103, workspaceItems 12 × :110-121, platformItems 3 × :130-134, securityItems 12 × :144-169, dbItems 2 × :176-177), Gruppen-Tabs :188-230, Admin-Tab `App.tsx:308-326`, CommandPalette `components/command-palette.tsx:117-154`, HierarchySidebar `components/sidebar/HierarchySidebar.tsx:82-288`.

### A.2 Geister-Routen (kein Nav-Eintrag, kein Link, kein navigate)
| Route | View | Beleg (einzige Vorkommen) |
|---|---|---|
| `/landing` | `LandingPage.tsx` (269 LOC) | nur Routen-Def `App.tsx:510`; kein `navigate`/`Link` im ganzen Frontend |
| `/onboarding` | `OnboardingPage.tsx` | nur `App.tsx:704` + Selbst-Verweise `OnboardingPage.tsx:69,124`; kein Gate liest `onboarding_complete` |
| `/dbs/datalake` | `DatalakePage.tsx` | nur Import `App.tsx:92` + Routen-Def `App.tsx:667`; dbItems (`section-nav.ts:175-178`) kennen nur backups + discovery |
| `/sessions` (ohne ID) | `AgentSessionDetailPage.tsx` | `App.tsx:561`; verlinkt wird nur `/sessions/${id}` (`SubagentApprovalQueuePage.tsx:511`, `SubagentsPanel.tsx:368`) |
| `/agents/sessions/:sessionId` | `AgentSessionDetailPage.tsx` | `App.tsx:563` — **Dublette** von `/sessions/:sessionId` (`App.tsx:562`), keine einzige Referenz |

### A.3 Waisen-Cluster Marketing (nur über den Geist `/landing` erreichbar)
- `/landing` → `LandingPage.tsx:101,174,261` verlinkt `/tour`; `TourPage.tsx:160,420` verlinkt `/docs`. Da nichts nach `/landing` führt (`/` redirectiert auf `/overview`, `App.tsx:494`), sind `/docs` (`App.tsx:511`) und `/tour` (`App.tsx:512`) faktisch ebenso unerreichbar — und zur gleichen Zeit als eigenständige Website deployt (Kap. D.1).

### A.4 Tote Redirects, irreführende Navigation, defekter Link
- `/test` → `/projects` (`App.tsx:705`) — keine Referenz außerhalb der eigenen Definition.
- `/playground` → `/projects` (`App.tsx:706`) — referenziert NUR aus der CommandPalette (`command-palette.tsx:123` `go('/playground')`, Label `nav.playground`); landet via `/projects`-Redirect (`App.tsx:551`) auf der **Workspaces-Liste** — Label und Ziel passen nicht zusammen.
- `/health` → `/keys` (`App.tsx:707`) — keine Referenz; sinnentleert.
- `FULL_BLEED_ROUTES = ['/projects']` (`App.tsx:445`, Auswertung :472) — tot, weil `/projects` (`App.tsx:551`) vor jedem Render nach `/workspaces` redirectiert; der Full-Bleed-Stil kann nie greifen.
- Nav-Item auf Redirect: `section-nav.ts:117` `{ to: '/projects', labelKey: 'nav.playground' }` — Ziel ist ein Redirect auf `/workspaces`; das „Playground“-Item führt also zur Workspaces-Übersicht.
- **Defekt:** `HierarchySidebar.tsx:82` `navigate('/workspaces/target/' + target.id)` — eine Route `/workspaces/target/:id` existiert in `App.tsx:673-702` nicht → NotFoundPage (`App.tsx:708`). Der Kommentar `HierarchySidebar.tsx:80-81` („Mandate 14: a target click lands on the TARGET DETAIL page“) beschreibt etwas, das nicht existiert.

### A.5 Ohne Nav-Eintrag, aber real verlinkt (keine Geister, aber unsichtbar in der Sektions-Navigation)
`/overview` (nur Root-Redirect `App.tsx:494`), `/premium` (`App.tsx:361,417` + Palette :154), `/api-docs` (einzig `OpnsenseFirewallConfigPage.tsx:159`), `/security/findings` (`security-notifications.tsx:34,80,109`, `NotificationCenterPage.tsx:139,180`), `/security/firewall-rules` (`HierarchySidebar.tsx:280`, `WorkspaceDetailPage.tsx:680`, `FirewallProviderSetupPage.tsx:295`), `/security/siem` (`HierarchySidebar.tsx:288`), `/config/:id` (Palette `command-palette.tsx:204`, `model-table.tsx:348,456`), Detail-Unterseiten (`/models/*/…` via `media-models.tsx:85,241,272`; `/workspaces/apps/:appId` via `OverviewPage.tsx:103`; `/security/events/:id` via `SecurityEventsPage.tsx:99,106`; `/workspaces/ws/:id` via `WorkspacesPage.tsx:576`).

---

## B) Backend-Routen ohne Consumer

### B.1 Verteilung (262 Routen, `HandleFunc` über 26 Dateien)
| Klasse | Anzahl | Bedeutung |
|---|---|---|
| Dashboard-Consumer (Frontend-Literal/-Template) | **184** | apiFetch-Aufruf gefunden (inkl. 2 verifizierte Konkatenations-Fälle) |
| DOCS_ONLY | **54** | in `docs/API_DOCS.md` dokumentiert, Dashboard ruft nie an (Anhang) |
| EXTERN | **8** | Consumer außerhalb des Dashboards: `/health` (Makefile restart-backend + deploy/backend), `/ready` (deploy/backend), `/api/auth/callback` (Keycloak-Browser-Redirect, `auth-gate.tsx` + `API_DOCS.md`-Sektion), `/api/sdk/sessions` (Python-SDK `src/sdk/python/jimesh_logger.py:46`), `/v1/score` + `/api/fallback/edges` (CLI `src/examples/jimeshctl`), `/api/edge/status` + `/ws/` (Edge-Router-Deploy, dokumentiert in `cmd/jimesh-router/README.md`, vgl. `API_DOCS.md`-Deploy-Beschreibung) |
| **GHOST** | **14** | weder Frontend noch API_DOCS noch externer Consumer |
| Consumer deaktiviert | **1** | `/api/projects/{id}/containers/{cid}/logs` |
| Catch-all | 1 | `gateway.go:367` `/` |

### B.2 Die 14 echten Geister-Routen (alle zugleich API_DOCS-Lücken)
| Route | Registrierung |
|---|---|
| `/api/projects/{id}/ports/assign` | `internal/security/security.go:76` |
| `/api/hierarchy` | `internal/gateway/gateway.go:193` |
| `/api/settings/provider-credentials` | `internal/gateway/gateway.go:194` |
| `/api/plugins/jules/sources` | `internal/gateway/gateway.go:240` |
| `/api/projects/task/start` | `internal/deploy/deploy.go:61` |
| `/api/projects/task/status` | `internal/deploy/deploy.go:62` |
| `/api/projects/task/apply` | `internal/deploy/deploy.go:63` |
| `/api/projects/task/discard` | `internal/deploy/deploy.go:64` |
| `/api/projects/{id}/monitoring` | `internal/deploy/deploy.go:69` |
| `/api/projects/{id}/deployments/{depId}` | `internal/deploy/deploy.go:73` (das `…/redeploy`-Geschwister :72 wird genutzt: `WorkspaceDeploymentsPage.tsx:111`) |
| `/api/auth/sessions` | `internal/auth/auth.go:181` |
| `/api/auth/sessions/revoke` | `internal/auth/auth.go:182` |
| `/api/auth/sessions/refresh` | `internal/auth/auth.go:183` |
| `/api/agents/analytics/summary` | `internal/analytics/analytics.go:42` |

### B.3 Sonderfälle
- **Consumer deaktiviert + falscher TODO-Kommentar:** `/api/projects/{id}/containers/{cid}/logs` ist im Backend implementiert (`deploy.go:79`), aber der einzige Aufrufer hält die Query dauerhaft aus: `ContainerLogViewer.tsx:146` `enabled: false`; die Kommentare `ContainerLogViewer.tsx:17,135-138` behaupten, die Route existiere noch nicht — das stimmt nicht mehr. Ein-Befehl-Fix: `enabled: true` + den App.tsx-Kommentar (`App.tsx:680` „Container-Logs bleiben disabled, bis die Backend-Route existiert“) korrigieren.
- **Route doppelt registriert (zwei Binaries):** `/api/sdk/logs` existiert im Gateway (`internal/sdklogs/sdklogs.go:67`) UND als Edge-Ingest im Router (`cmd/jimesh-router/ingest_http.go:53`) — Letzterer ist Teil des edgeNode-Deploys (dokumentiert in `cmd/jimesh-router/README.md`); im Repo-Dokumentationsmandat ist die Router-Surface dort beheimatet. Kein Bug, aber eine Dublette, die man benennen muss, bevor man „die“ Route löscht.
- **Nur-Geister-Consumer:** `/api/projects/{id}` (DELETE) und `/api/projects/{id}/tunnel/{port}` werden ausschließlich aus `ProjectsPage.tsx:630,685-694` aufgerufen — einer View, die nie gerendert wird (Kap. C.2). Löscht man `ProjectsPage.tsx`, kippen diese Routen in GHOST.
- **CLAUDE.md-Regel:** „If a route exists in gateway.go but not in API_DOCS.md, that is a bug“ — die 14 GHOST-Routen sind demnach 14 Dokumentations-Bugs.

### B.4 Dokumentiert, aber vom Dashboard nie angerufen (54)
Vollständige Liste im Anhang; Auffälligkeiten: die komplette Orchestrierungs-Fläche (`/api/orchestrate*`, `/api/experts*`, `/api/model-roles`, `/api/models/*enrich*`, `/api/ontology`, `/api/iana`, `/api/dedup` — `orchestrationhandlers.go:35-49`) ist nur noch Dokumentation ohne UI; gleiches gilt für die MCP-Bridge (`/api/bridge/*`, `provisioning/bridge.go:55-58`), Project-Roles (`project_roles.go:35-36`) und `/v1/embeddings` (`ai/aihandlers.go:53` — SDK-Endpunkt ohne SDK-Nutzer im Repo; die Python-Clients nutzen gRPC/Redis, `src/examples/python-client/client.py:1-30`).

---

## C) Nie importierte Views/Components

### C.1 23 nie erreichbare TS/TSX-Dateien (5.024 LOC)
Import-Graph ab den echten Entry-Punkten (`src/app/[[...slug]]/page.tsx` → `App.tsx`); keiner dieser Dateien wird transitiv erreicht:
| Datei | LOC | Bemerkung |
|---|---|---|
| `views/ProjectsPage.tsx` → siehe C.2 (separat) | 1.351 | importiert, nie gerendert |
| `components/TierOnboarding.tsx` | 400 | auch Test-Kommentar nennt sie „old“ |
| `components/layout/scope-selector.tsx` | 343 | hat verwaiste Tests: `scope-selector.test.tsx`, `scope-selector.render.test.tsx` (beide jsdom) |
| `components/ProviderStatus.tsx` | 320 | 0 Importeure |
| `components/overview/ScopeSelectorModal.tsx` | 297 | 0 Importeure (BreadcrumbBar erwähnt sie nur im Kommentar `BreadcrumbBar.tsx:54,90`) |
| `components/playground/settings-rail.tsx` | 248 | 0 Importeure |
| `components/playground/conversation-sidebar.tsx` | 216 | 0 Importeure |
| `lib/attachments.ts` | 200 | 0 Importeure |
| `lib/playground-sampling.ts` | 206 | nur Importeur des toten settings-rail |
| `lib/playground-conversations.ts` | 194 | nur Importeur des toten conversation-sidebar |
| `lib/logs.ts` | 188 | 0 Importeure |
| `lib/playground-stream.ts` | 187 | 0 Importeure |
| `components/files/FileBrowserModal.tsx` | 172 | nur Importeur: tote FileBrowserField |
| `components/files/FilePathInput.tsx` | 137 | nur Importeur: tote FileBrowserField |
| `components/networks/NetworkEditingGrid.tsx` | 119 | 0 Importeure |
| `lib/scope-usage-schema.ts` | 117 | nur Kommentar-Referenz `SecurityLayout.tsx:16` |
| `lib/mesh-icons.ts` | 98 | nur Importeur: totes `MeshBadge.tsx` |
| `components/files/FileBrowserField.tsx` | 86 | 0 Importeure |
| `types/domain/networking.ts` | 33 | nur Importeur: totes NetworkEditingGrid |
| `components/mesh/MeshBadge.tsx` | 33 | 0 Importeure |
| `types/domain/utility_deps.ts` | 24 | 0 Importeure |
| `components/ui/separator.tsx` | 23 | 0 Importeure (Base-UI-Wrapper) |
| `types/domain/provider_credentials.ts` | 18 | 0 Importeure |
| `types/domain/network_ownership.ts` | 15 | Kommentar-Referenz `types/domain/overview.ts:62` ist nur Text |

### C.2 `ProjectsPage.tsx` — importiert, aber nie gerendert (1.351 LOC)
`App.tsx:37` importiert `ProjectsPage`, aber nirgends steht `<ProjectsPage…>`; `/projects` redirectiert auf `/workspaces` (`App.tsx:551`). Skript-Verifikation: einziger ungenutzter Default-Import im gesamten Frontend. Alle sonstigen „ProjectsPage“-Nennungen sind Kommentare (`lib/ssh-endpoints.ts:5,11,23,27,57`) oder Test-Beschreibungen (`components/rbac/create-access-section.test.ts:88,97`). Consequences: auch `/api/projects/{id}`-DELETE und `/api/projects/{id}/tunnel/{port}` (B.3) sowie der Full-Bleed-Eintrag (A.4) hängen an dieser Leiche.

### C.3 Vite-Ära-Artefakte (248 LOC) — Bau-System-Dublette (siehe D.7)
Das Frontend wird mit Next.js gebaut und betrieben (`package.json:7-12`: next dev/build/start; `Makefile:134,146`; Entry `src/app/[[...slug]]/page.tsx:1-11` + `src/app/layout.tsx:1-27`). Folge: die Vite-Seite ist tot, obwohl vitest (standalone, `vitest.config.ts:1-2` lädt `vite.config.ts` bewusst NICHT) weiterläuft:
| Datei | LOC | Beleg |
|---|---|---|
| `src/main.tsx` | 10 | nur referenziert von `index.html:34` |
| `index.html` | 36 | Vite-Entry; Next nutzt es nicht |
| `vite.config.ts` | 50 | kein npm-Skript startet Vite; vitest lädt es explizit nicht (`vitest.config.ts:1-2`) |
| `dev/mockApi.ts` | 152 | nirgends importiert; sein eigener Kommentar (`mockApi.ts:5`) behauptet, `vite.config.ts` lade es bei `MOCK_API=1` — die Referenz existiert in `vite.config.ts` nicht |

### C.4 Unbenutzte Imports in lebenden Dateien (37 Vorkommen)
Skript-Fund u. a.: `components/ProviderHealthDashboard.tsx:14` importiert 10 recharts-Komponenten, die die Datei nicht benutzt; `views/FallbackPage.tsx:3,6,17` (Link, ShieldAlert, Flame, Settings2, TokenUsageBar); `views/OpnsenseFirewallConfigPage.tsx:34` (PageHeader); `components/model-table.tsx:2` (Link); `views/AgentConfigScannerPage.tsx:4` (queryKeys); `views/ProjectsPage.tsx:6` (Badge, in der toten Datei). Vollliste: 37 Zeilen `UNUSED_IMPORT` (Skript im Audit-Lauf).

### C.5 Test-Waisen
`components/layout/scope-selector.test.tsx:1-8` und `scope-selector.render.test.tsx:1-26` testen ausschließlich die tote `scope-selector.tsx` — Vitest-Pflegeaufwand für Produktionstoten Code (`vitest.config.ts:35` kommentiert ebendiesen Test).

---

## D) Dubletten

### D.1 Marketing doppelt: website/ vs. In-App-`LandingPage`/`DocsPage`/`TourPage`
- Eigenständige Next.js-Website (deployt über Traefik-Pfad `/website`, `deploy/podhead-client/entrypoint.sh:28`): `website/src/app/page.tsx` (Landing), `website/src/app/docs/page.tsx:1-20` (252 LOC, rendert echte Repo-Docs via `scripts/gen-docs.mjs`), `website/src/app/tour/page.tsx:1-20` (echte Screens). Website-src gesamt 1.069 LOC.
- Dieselben drei Seiten zusätzlich INS Dashboard: `views/LandingPage.tsx` (269 LOC), `views/DocsPage.tsx` (28), `views/TourPage.tsx` (429) = 726 LOC — mit der Entry-Route `/landing` als Geist (A.2/A.3). Entweder die In-App-Kopie streichen oder `/landing` als Ziel der Root-URL bzw. aus website/ verlinken — aktuell ist sie schlicht tot.

### D.2 `lib/mesh-icons.ts` (tot) vs. `lib/app-icons.ts` (lebend)
Beide sind Icon-Mapping-Tabellen für App-/Mesh-Kinds. `app-icons.ts` (25 LOC) lebt (`HierarchySidebar.tsx:6`); `mesh-icons.ts` (98 LOC) wird nur vom toten `MeshBadge.tsx:4` importiert. Die größere der beiden ist die tote.

### D.3 Log-Shipping dreifach (Go-SDK vs. Go-Binary vs. Python-Stub)
- `internal/sdk/logger` (292 LOC) + `cmd/jimesh-logger` (94 LOC; Nutzung laut `docs/API_DOCS.md:1485-1486` nur `go run ./cmd/jimesh-logger`).
- `src/sdk/python/jimesh_logger.py:5-6,46,60` — Python-Stub, derselbe Job (POST `/api/sdk/logs`, POST `/api/sdk/sessions`).
- Keines davon ist im Compose/Deploy-Deploy verdrahtet (0 Referenzen in deploy/). Dieselbe Fähigkeit existiert also 2× in 2 Sprachen, beide nur Ad-hoc.

### D.4 Datalake: echte Implementierung tot, Mock-Handler lebt, Seite ist Geist — No-Mock-Verstoß
- Echte Pakete: `internal/datalake` (18) + `sink` (37) + `source` (60) + `transform` (27) + Daemon `cmd/datalaked` (14) = 156 LOC; von keinem anderen Binary importiert, `datalaked` hat repo-weit 0 Referenzen.
- Gateway-Handler `internal/gateway/datalake.go:14-26` liefert hartkodiert `ActivePipelines:1, ReplicationLag:12, Status:"healthy"` (`datalake.go:22-25`) und :28-45 eine Fake-Pipeline „dl-pipeline-1“ (`datalake.go:33`) — klarer Verstoß gegen das No-Mock-Mandat (`MANDATES.md`) und die CLAUDE.md-Regel „real persistence, honest empty states“.
- Der einzige Abnehmer dieser Fake-Daten, `/dbs/datalake` (`DatalakePage.tsx`), ist selbst eine Geister-Route (A.2). Komplett-Entfernung (Handler + Page + Pakete) oder echte Implementierung — aber kein Zustand dazwischen.
- **→ BEHOBEN 20.9.2026** (Branch `wt-p3-datalake`, `docs/sprints/SPRINT-7-GHOST-AUDIT-DATALAKE.md`): **Komplett-Entfernung** gewählt. Mock-Handler + Routen, Geister-Page (View + App.tsx-Import/Route; ein Nav-Eintrag existierte nie) und die tote Kette (`cmd/datalaked`, `internal/datalake{,/sink,/source,/transform}`) samt prometheus-Kette aus `go.mod` entsorgt; `deploy/datalake/docker-compose.yml` bleibt als Rezept für die echte Integration. Beweis gegen Verdrahtung: kein Deployment startet den Debezium-Stack, der Daemon importierte die Pakete nicht, `sink.WriteBatch` war ein No-Op.

### D.5 MCP doppelt: stdio-Server vs. HTTP-Bridge
- `internal/mcpserver` (773 LOC, 13 Tools; Registry `mcpserver/server.go:36-52` lt. `docs/FE-IAC-DISCOVERY-SPEC.md:84`) mit `cmd/jimesh-mcp` (38 LOC) — stdio-Transport für lokale Agents (`cmd/jimesh-mcp/main.go:1-27`); kein Deploy-Bezug, nur Ad-hoc-Doku (`cmd/jimesh-mcp/README.md`, `.gitignore`).
- `internal/provisioning/bridge.go:55-58` (`/api/bridge/*`) — die MCP-fähige HTTP-Bridge im Gateway, dokumentiert (`API_DOCS.md:1243-1246,1389-1392`), aber ohne jeden Dashboard-Consumer (B.4).
- Zwei MCP-Oberflächen für dieselbe Gateway-API; nur eine ist ans Deploy angebunden (keine).

### D.6 CDC/Kafka-Kette an Ghost-Binary
`internal/cdc` (1.033 LOC) wird ausschließlich von `cmd/kafkabridge` (144 LOC) erreicht; kafkabridge taucht nur in `.env.example:172-179` (kommentierte Env-Vars) auf — kein Compose-Service, kein Ansible-Playbook, kein Makefile-Ziel. Am Ende dieser Kette hängen 2 direkte go.mod-Deps (E.2).

### D.7 Build-System: Next (lebend) vs. Vite (tot) — und `pnpm-workspace.yaml`-Platzhalter
Next ist real (`package.json:7-12`, `next.config.mjs`, `Makefile:134,146`, `src/app/…`); Vite existiert nur noch als totes Config-Quartett (C.3). Zusätzlich in `src/frontend`: `package-lock.json` UND `pnpm-lock.yaml` UND `pnpm-workspace.yaml` (Inhalt: „allowBuilds: esbuild: set this to true or false“ — Platzhalter-Müll). Ein Lockfile-Regime fehlt.

### D.8 Namens-Dubletten im Backend
- `internal/provision` (Node-/gVisor-Provisionierung, lebend) vs. `internal/provisioning` (MCP-Bridge, lebend) — beide live, aber die Namen sind praktisch ununterscheidbar.
- `internal/sdk/secrets` (tot, 156 LOC) vs. `internal/sdksecrets` (lebend, Route `/api/sdk/secrets` — die selbst consumer-los ist, B.4/`sdksecrets.go:64`): dasselbe Konzept in zwei Paketen, eines komplett tot.

### D.9 `vconfig.json` ist lebend (keine Dublette)
Kurz geprüft, weil der Name verdächtig ist: `next.config.mjs:8-10` liest `vconfig.json` für Host/Port — keine Leiche.

### D.10 Root-Skript-Geister: 16 `stitch-*.cjs` (721 LOC)
`stitch-download.cjs` … `stitch-selectors.cjs` (Repo-Root): 0 Referenzen in docs/, Makefile, scripts/ (Suche je Dateiname). `docs/STITCH-MCP-GUIDE.md:88` beschreibt stattdessen einen INLINE-Node-Wrapper. Einmalige Prompt-Iteratoren (r2/r3/r4/r5/r6a/r6b/gap1-3/fix-r2/final/…), committet statt aufgeräumt.

### D.11 Doku-Pfad-Fehler
`CLAUDE.md` („Talk to the Go backend directly via `examples/jimeshctl`“) — der CLI liegt real unter `src/examples/jimeshctl` (Bash-Script, 11.696 Bytes, ausführbar). Die CLI selbst lebt und konsumiert ~21 Backend-Routen (u. a. `/v1/chains`, `/v1/score`, `/api/fallback/edges`, `/api/networks/*`).

### Backend-Binärdateien: im Deploy referenziert oder Geisterpakete?
| Binary/Paket | Status | Beleg |
|---|---|---|
| `cmd/server` | **LEBEND** (Hauptbinary) | `Makefile:57,61` go build; deploy/backend |
| `cmd/jimesh-router` | **LEBEND — deployt** | Bootstrap: `deploy/router-bootstrap/{ansible-task.yml,defaults.yml}`; plus edgeNode-Opt-in beim Workspace-Deploy (Beschreibung in `API_DOCS.md`-Deploy-Sektion; Build/Pipeline analog socket-guard) |
| `cmd/socket-guard` | **LEBEND — pro Workspace ausgerollt** | gebaut+ge-shipped als Sidecar: `internal/deploy/projects_ssh.go:54-55,74`; Falco-Regel `deploy/siem/config/falco/jimesh_rules.yaml` |
| `cmd/waf-sidecar` | **LEBEND — pro Workspace (opt-in)** | `internal/deploy/projects_ssh.go:274-286,554-564` (`ensureWAFImageLocal` baut `jimesh-waf` aus `cmd/waf-sidecar/Dockerfile`); nur Caddyfile/Dockerfile, kein Go-Code |
| `cmd/siem-bridge` | **LEBEND — deployt** | `deploy/siem/docker-compose.yml:245-262` (baut im `golang:latest`-Container und `exec`) |
| `cmd/datalaked` + `internal/datalake{,/sink,/source,/transform}` | **GEIST** (156 LOC) | 0 Referenzen; von keinem anderen cmd importiert |
| `cmd/kafkabridge` + `internal/cdc` | **GEIST** (1.177 LOC) | nur `.env.example:172-179`; kein Deploy, kein Make-Ziel |
| `internal/oteltrace` | **GEIST** (142 LOC) | von keinem cmd erreichbar |
| `internal/sdk/secrets` | **GEIST** (156 LOC) | von keinem cmd erreichbar |
| `cmd/jimesh-mcp` + `internal/mcpserver` | **nicht deployt, dokumentiert** (811 LOC) | nur Ad-hoc-Doku; einziger Importeur von `internal/mcpserver` ist `cmd/jimesh-mcp/main.go:18` |
| `cmd/jimesh-logger` + `internal/sdk/logger` | **nicht deployt, dokumentiert** (386 LOC) | `API_DOCS.md:1485-1486` (`go run`); Python-Dublette D.3 |

---

## E) Tote Dependencies

### E.1 Frontend (`src/frontend/package.json`)
| Dep | Befund | Beleg |
|---|---|---|
| `@tailwindcss/vite` (package.json:22) | **TOT** | einziger Importeur ist das tote `vite.config.ts:5`; Tailwind läuft real über `@tailwindcss/postcss` (`postcss.config.js:3`, Next-Build) |
| `shadcn` (package.json:36) | **überflüssig als dependency** | 0 Code-Imports; einzige Referenz `components.json:2` (CLI-Konfiguration) — das ist ein CLI-Tool, keine Laufzeit-Deps |
| `@dnd-kit/core` (package.json:16) | grenzwertig: kein direkter Import (nur das tote `dev/mockApi.ts:63,117,121` nennt es), aber Peer-Requirement von `@dnd-kit/sortable` (`components/model-table.tsx:3`) → **behalten** |
| `jsdom` (package.json:51) | lebend (jsdom-Render-Test `src/lib/chart-axis.render.test.tsx:23`) — ABER der Kommentar `vitest.config.ts:15` behauptet, es stehe „in the root package.json“; ein Root-package.json existiert nicht → veralteter Kommentar |
| alle übrigen geprüften Deps | lebend | `@base-ui/react` (`components/ui/tabs.tsx:1` u. v. a.), `@xyflow/react` (`components/networks/mesh-topology.tsx:9`, `components/chain-mesh-graph.tsx:17`), `recharts` (`views/AnalyticsPage.tsx:6` u. a.), `react-grid-layout` (`components/overview/OverviewGrid.tsx:8`), `react-markdown`/`remark-gfm` (`components/markdown.tsx:2-3`), `tw-animate-css` (`src/index.css:2`), Fonts (`src/index.css:4-5`) |

### E.2 Backend (`src/backend/go.mod`)
| Dep | Befund | Beleg |
|---|---|---|
| `github.com/prometheus/client_golang` (go.mod:9) | **TOT** | einziger Importeur: `internal/datalake/metrics.go` — Paket ist Geist (D.4) |
| `github.com/twmb/franz-go` (go.mod:14) | **TOT** | einziger Importeur: `cmd/kafkabridge/main.go` (Geist-Binary, D.6) |
| `github.com/jackc/pglogrepl` (go.mod:6) | **TOT (an Geister-Kette)** | einzige Importeure: `internal/cdc/*` (nur von kafkabridge erreichbar) |
| `github.com/mark3labs/mcp-go` (go.mod:8) | halb-tot | Importeure nur `cmd/jimesh-mcp/main.go:19` + `internal/mcpserver/*` — nicht deployt (D.5) |
| alle übrigen direkten Deps | lebend | jwt (`internal/auth/auth.go`), websocket (`internal/ai/proxy.go`), pgx (`internal/store/store.go`), opa (`internal/policy/policy.go`), go-redis (`internal/streams/streams.go`), x/crypto (`internal/network/hostkey.go` u. a.), grpc/protobuf (`cmd/server/main.go`, `protos/`) |
| `website/package.json` | vollständig lebend | `marked` (`website/scripts/gen-docs.mjs`), next, react |

---

## F) Zahlenspiegel (Kategorie F)

| # | Metrik | Wert |
|---|---|---|
| 1 | Frontend `<Route>`-Elemente / Redirects / Nav-Items | 94 / 16 / 37 |
| 2 | **Geister-Routen Frontend** (unerreichbar) | **5** + 2 Waisen (`/docs`,`/tour`) + 3 tote Redirects |
| 3 | **Consumer-lose Backend-Routen (echte Geister)** | **14** (von 262); + 54 DOCS_ONLY; + 1 deaktivierter Consumer; + 8 extern |
| 4 | API_DOCS-Lücken (= CLAUDE.md-Bugs) | 14 |
| 5 | Defekte Navigation (404-Klickpfad) | 1 |
| 6 | Nie importierte FE-Dateien / LOC | 23 / 5.024 |
| 7 | FE-Geister gesamt (inkl. ProjectsPage + Vite-Ära) | **28 Dateien / 6.623 LOC** |
| 8 | Backend-Geister (voll) / LOC | datalake-Kette 156 + oteltrace 142 + sdk/secrets 156 + kafkabridge 144 + cdc 1.033 = **9 Einheiten / 1.631 LOC** |
| 9 | Backend „dokumentiert, nicht deployt“ / LOC | jimesh-mcp 38 + mcpserver 773 + jimesh-logger 94 + sdk/logger 292 = **4 Einheiten / 1.197 LOC** |
| 10 | Unbenutzte Imports in lebenden Dateien | 37 |
| 11 | Tote Dependencies | FE: 2 (+1 Peer-Klarfall) · Go: 3 (+1 halb) |
| 12 | Dubletten-Cluster | 11 |
| 13 | Root-Geister-Skripte | 16 Dateien / 721 LOC |
| 14 | No-Mock-Verstöße | 1 (`gateway/datalake.go`) → **0 seit 20.9.** (BEHOBEN, wt-p3-datalake) |
| 15 | **Ghost-LOC gesamt** | **≈ 10.172** (6.623 + 1.631 + 1.197 + 721) |

---

## Empfehlungen (nach Risiko × Aufwand sortiert)

1. **Sofort:** `ContainerLogViewer.tsx:146` auf `enabled: true` stellen und die TODO-Kommentare (:17,135-138) streichen — die Backend-Route existiert (`deploy.go:79`); der Container-Log-Tab in `AppDetailPage` geht damit live.
2. **Sofort:** `HierarchySidebar.tsx:82` auf eine existierende Route zeigen (`/workspaces/ws/:workspaceId` oder eine neue `/workspaces/target/:id`) — aktuell landet jeder Target-Klick auf 404.
3. **Kurz:** 14 Geister-Routen entscheiden: streichen (dann auch aus `gateway`/Handler-Paketen) oder in `API_DOCS.md` dokumentieren, wenn sie Public-API sein sollen (`/api/auth/sessions*` wäre als Operator-API dokumentierenswert, die Task-API eher Löschkandidat).
4. **Kurz:** `ProjectsPage.tsx` + Import (`App.tsx:37`), `FULL_BLEED_ROUTES`-Mitglied (`App.tsx:445`) und das `nav.playground`-Redirect-Item (`section-nav.ts:117`, `command-palette.tsx:123`) gemeinsam entfernen — ein zusammenhängendes Geister-Paket.
5. **Kurz:** Marketing-Entscheidung: In-App-`/landing|/docs|/tour` (726 LOC) streichen ODER verlinken — aktuell doppelt hält die website/ die Fläche bereits.
6. **Mittel:** Datalake auflösen: Mock-Handler (`gateway/datalake.go`) entfernen oder echt implementieren; entsorgen: `cmd/datalaked`, `internal/datalake*`, `/dbs/datalake`-Route, `DatalakePage.tsx` — oder beides zum Leben erwecken. Der Mock ist ein Mandats-Verstoß.
7. **Mittel:** kafka/CDC-Kette (kafkabridge + cdc, 1.177 LOC + 2 Deps) entweder deployen (Compose-Service) oder entfernen — aktuell schleppt `go.mod` tote Deps für ein nicht vorhandenes Feature.
8. **Mittel:** MCP-Fläche konsolidieren (stdio-`jimesh-mcp` vs. `/api/bridge/*`) und für mindestens eine Oberfläche einen Deploy- oder dokumentierten Betriebspfad festlegen.
9. **Hygiene:** Vite-Ära löschen (`main.tsx`, `index.html`, `vite.config.ts`, `dev/mockApi.ts`, `@tailwindcss/vite`-Dep), Lockfile-Regime festlegen (package-lock ODER pnpm, plus den `pnpm-workspace.yaml`-Platzhalter), 16 `stitch-*.cjs` ins Archiv oder löschen, `CLAUDE.md`-Pfad zu jimeshctl korrigieren, 37 unbenutzte Imports räumen.

---

## Anhang: vollständige DOCS_ONLY-Liste (54 Routen, dokumentiert, ohne Dashboard-Consumer)

```
/api/subagents/{id}/tool-calls/{callId}/approve   subagents.go:86
/api/subagents/{id}/tool-calls/{callId}/deny      subagents.go:87
/api/vault/tokens/{id}/revoke                     security.go:46
/api/vault/access                                security.go:47
/api/security/exposure                            security.go:50
/api/traffic                                      security.go:78
/api/traffic/stream                               security.go:79
/api/app-categories                               security.go:85
/api/backups/{id}/download                        security.go:98
/api/firewall/report                              security.go:123
/api/firewall/config                              security.go:124
/api/sdk/secrets                                  sdksecrets.go:64
/api/bridge/provision                             provisioning/bridge.go:55
/api/bridge/stream                                provisioning/bridge.go:56
/api/bridge/openapi.json                          provisioning/bridge.go:57
/api/bridge/tools                                 provisioning/bridge.go:58
/api/model-roles                                  orchestrationhandlers.go:35
/api/chains/{id}/model-roles                      orchestrationhandlers.go:36
/api/orchestrate                                   orchestrationhandlers.go:37
/api/orchestrate/cancel                           orchestrationhandlers.go:38
/api/orchestrate/history                          orchestrationhandlers.go:39
/api/models/enrich-all                            orchestrationhandlers.go:40
/api/models/enrichment                           orchestrationhandlers.go:41
/api/models/{id}/enrich                           orchestrationhandlers.go:42
/api/models/{id}/enrichment                       orchestrationhandlers.go:43
/api/experts                                      orchestrationhandlers.go:44
/api/experts/execute                              orchestrationhandlers.go:45
/api/experts/runs                                 orchestrationhandlers.go:46
/api/ontology                                     orchestrationhandlers.go:47
/api/iana                                         orchestrationhandlers.go:48
/api/dedup                                        orchestrationhandlers.go:49
/api/team-bindings/{id}                           team_bindings.go:37
/api/project-roles                                project_roles.go:35
/api/project-roles/{id}                           project_roles.go:36
/v1/route                                         gateway.go:197
/v1/providers                                     gateway.go:199
/api/agent-types                                  gateway.go:210
/api/sessions/query                               gateway.go:212
/api/fallback/stats                               gateway.go:305
/api/discovery/status                             gateway.go:313
/api/discovery/sync                               gateway.go:314
/api/control-planes/{id}/undeploy                control_planes.go:78
/api/router/aliases                              control_planes.go:83
/api/discovery/events                             discoveryhandlers.go:32
/api/dsh/preview                                  discoveryhandlers.go:37
/api/exec/sandbox                                 deploy.go:65
/api/agents/logs                                  analytics.go:40
/api/cost-trackers                                analytics.go:63
/api/aa/metrics                                   analytics.go:70
/api/aa/sync                                      analytics.go:71
/api/or/benchmarks                                aihandlers.go:49
/v1/mesh/models                                   aihandlers.go:50
/v1/chat/completions/ws                           aihandlers.go:52
/v1/embeddings                                    aihandlers.go:53
```

*(Alle Dateipfade relativ zu `src/backend/internal/` bzw. `src/frontend/src/`; Backend-Zeilen beziehen sich auf die jeweilige Datei im Verzeichnis `internal/<paket>/`.)*
