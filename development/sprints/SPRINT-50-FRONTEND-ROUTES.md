# SPRINT 50 — FÜNF FRONTEND-ROUTEN MIT VORHANDENEM BACKEND

> Worktree: `/tmp/wt-secrets`, Branch `wt-secrets-consolidation`.
> Auftrag: fünf fehlende Frontend-Routen, deren Backend bereits existiert —
> alle fünf in EINEM Branch, **nicht committen** (Auftragswortlaut). Tatsächlich
> hat der parallel arbeitende Session-Agent die Dateien in den Commits
> 3dfb7ba/d04512e/a25baa7 mit ausgeliefert (siehe Retrospektive); die hier
> verbliebenen Working-Tree-Fixes sind Kollateralfixes, kein Commit seitens
> dieses Pakets.
> Pflichtlektüre vorab: docs/ARCHITECTURE.md §8 (Workspace/SSHTarget-Modell),
> docs/FRONTEND-MOCK-PLAN.md §4.2 (Screen-Zerlegung).

## Ziel

Fünf Routen, die im Backend bereits echt sind, im Frontend erreichbar machen —
mit Mandat 14 (Nav+Links beweisen), Mandat 2 (keine Mocks — ehrliche Zustände
statt Fiktion) und i18n in allen 60 Locales.

## Work Packages & Abnahme

### WP1 — App-Discovery-Result-Page (Route `/projects/discover`)
- **Backend (existierte schon):** POST `/api/projects/discover`
  (internal/deploy/deploy.go:52 → handleProjectsDiscover,
  projects_ssh.go:2724) — Live-`docker ps -a` über den Docker-Socket des
  Gateway-Hosts; parst `jimesh-framework-*`/`jimesh-codeserver-*`-Namen in
  Projekte, persistiert per Upsert.
- **Gebaut:** `views/AppDiscoveryPage.tsx` — „Discover Apps"-Button (POST als
  useMutation, kein Polling-Query, das Ergebnis lebt in der Mutation), Card-
  Liste mit Name, Framework (Typ), echten geparsten Ports (App/noVNC/VS Code =
  die Netzwerk-Info der Response), Status-Badge, Workspace-Attribution
  (`workspaceIds`), `workspacePath`. Netz-Info pro Projekt: ECHTE VLAN-
  Zuordnung via GET `/api/projects/{id}/vlan` (Promise.all, ein Query über
  die Id-Menge). Node-Health-Strip (GET `/api/nodes/health`) als Scan-Quelle —
  der Node, auf dem der Scan läuft.
- **Design-Abweichung (ehrlich):** Das Stitch-Design (jimesh-app-discovery-
  with-networks.png) zeigt eBPF-Telemetrie, Topologie-Graph, „Claim to
  Project" — dafür existiert im Backend KEINE Quelle; keine Zeile davon ist
  erfunden. Der harte Befund aus FRONTEND-MOCK-PLAN §3 („Kein ‚App Discovery'-
  Screen im Bestand") bleibt dokumentiert — die Seite ist der
  POST-/api/projects/discover-Result-Screen, nicht der IaC-Compose-Screen.

### WP2 — Deployment-Detail-Page (Route `/workspaces/deployments/:projectId/:deploymentId`)
- **Backend (existierte schon):** GET `/api/projects/{id}/deployments/{depId}`
  + POST …`/redeploy` (deploy.go:72-73 → deployments.go:59/107); Row trägt
  seit P0-4 `interfaces` + `workspaceId`.
- **Gebaut:** `views/DeploymentDetailPage.tsx` — Status-Timeline aus dem
  ECHTEN Werteraum des Status-Feldes (created → building → deployed →
  stopped; Store-Transitionen: Engine-Upsert 'deployed', Redeploy-Mark
  'building', Pre-Sweep 'stopped'), `created_at` als Erstdeploy-Zeitstempel;
  Interfaces-Karten VERBATIM aus der Row (`[{kind,port,path}]`, leer =
  ehrlicher Leerzustand); Redeploy-Mutation mit Invalidate von Liste+Detail;
  Feld-Tabelle der ganzen Row; Workspace-Link (workspaceId-Scope oder
  „shared project deployment").
- **Verdrahtet:** WorkspaceDeploymentsPage — Row-Klick navigiert zur Detail-
  Seite, Redeploy-Button mit stopPropagation; Cache-Key in der Registry
  (`queryKeys.projectDeploymentDetail`), Liste invalidiert den Detail-Key
  nach Redeploy (kein Stale-Status beim Durchklicken).
- **Design-Abweichung (ehrlich):** Das Stitch-Design (jimesh-deployment-
  detail-deploy-20260919.png) zeigt eine 7-stufige Pipeline mit Sekunden-
  Timings, Security-Findings und Build-Stream — die Row ist eine
  App-IDENTITÄT (P0-4), kein Lauf-Historie; es gibt keine Schritt-Daten im
  Backend. Keine davon ist fabriziert.

### WP3 — SSH-Target-Detail-Page (Route `/workspaces/targets/:targetName`)
- **Modellstreng nach §8:** SSHTarget ist KEIN Foreign Key — Workspace.
  sshTarget ist ein Freitext-Label. Die Seite zeigt (a) den Registry-Eintrag
  aus GET `/api/settings/ssh_endpoints` (Name, Host, User, Port, Auth,
  gVisor-/Provisioning-Zustand; Treffer per Name ODER Host), (b) ALLE
  Workspaces, deren sshTarget-Feld auf den Wert matcht (GET
  `/api/workspaces`, client-side Filter — Workspaces VIELER Projekte können
  auf einem Target laufen). KEIN invertiertes Server→Projects→Workspaces-
  Baum. Ein Label ohne Registry-Eintrag wird ehrlich so benannt; Workspaces
  mit dem Registry-Host als Label sind inkludiert und gekennzeichnet (die
  Engine schreibt den Host, projects_ssh.go:2246).
- **Verdrahtet (Mandat 14):** WorkspaceEndpointsPage-Name → Target-Detail;
  WorkspacesPage-Node-Zelle (nur bei echtem ws.sshTarget) → Target-Detail;
  WorkspaceDetailPage-Parent-Node-Chip → Target-Detail.
- **Design-Abweichung (ehrlich):** CPU/RAM/NVMe/Load-Tiles des Stitch-Designs
  (jimesh-ssh-target-detail-…png) hat das Backend nur für den GATEWAY-Host
  (`/api/nodes/health`); für Remote-Endpoints ist der SSH-Probe ausdrücklich
  geplant, nicht gebaut (nodes_health.go) — die Tiles fehlen, statt Messwerte
  zu erfinden.

### WP4 — OTel-Trace-Detail (Route `/security/traces`)
- **Backend ist KAPUTT (AUDIT F-05, high):** internal/oteltrace hat NULL
  Call-Sites, der File-Tracer schreibt nichts, keine Route liefert Traces.
- **Gebaut (bewusst nur die ehrliche Seite):** `views/TracesPage.tsx` —
  „Tracing not yet implemented" mit dem realen Ist-Stand (Spine existiert,
  unangeschlossen), F-05-Referenz und Links auf die echten Nachbarflächen
  (SIEM-Events, SDK-/Audit-Logs). KEIN Wasserfall-Chart — ohne Backend gäbe
  das Fiktion (Mandat 2). Nav-Eintrag `nav.traces` (Security-Gruppe).

### WP5 — Browser-Integration
- **Ungeklärt im Auftrag — bewusst KEINE erfundene Page.** Die ECHTE Fläche
  ist das BrowserRuntimeModal (kompiliert auf die echten
  POST /api/projects/deploy-Optionen, keine Mock-Runtimes) auf der
  Deployments-Page. Gebaut: Nav-Eintrag `nav.browserIntegration` →
  `/workspaces/deployments?browser=1`; die Page öffnet das Modal einmalig
  und stript den Parameter (kein Re-Open beim Reload).
- **Pre-existing Bug mitgeheilt:** das Modal + die Deployments-Page riefen
  ~57 `browserRuntime.*`-Keys auf, die in KEINEM Locale existierten — die UI
  zeigte rohe Keys („browserRuntime.dialogTitle"). Komplettes Key-Set in
  en+de+58 Locales nachgetragen (Repo-Präzedenz: nur de ist echt übersetzt,
  die anderen tragen englisches Fallback — per Key-Parity-Checker erzwungen).

## i18n (60 Locales)

- Neue Sektionen `appDiscovery`, `deploymentDetail`, `sshTargetDetail`,
  `traces`, `browserRuntime` (komplett) + `nav.appDiscovery/traces/
  browserIntegration` — en-Quelle, echte de-Übersetzung, verbatim-English in
  den übrigen 58 (Repo-Präzedenz, check-i18n.mjs vergleicht 1:1 gegen en).
- **Pre-existing Gate-Brüche mitgeheilt** (SPRINT-48 hatte sie nur in en.json
  angelegt): `sidebar.noWorkspaces/newWorkspace`; `nav.pluginCatalog/
  pluginSettings` (rohe Keys im Workspaces-Dropdown), `nav.proxyOverview/
  proxyChains/firewallSetup/firewallTraffic/firewallOpnsense` (rohe Keys im
  LLM-Proxy-/Security-Dropdown) — der section-nav-Enthüllungstest ist dadurch
  wieder grün (4/4).
- Verifikation: `node scripts/check-i18n.mjs` → „passed for 60 locales and
  2788 keys".

## Verifikation

- **tsc A/B** (Baseline be2554a via Wegwerf-Worktree gegen HEAD a25baa7):
  553 Fehler vorher → 552 nachher — **0 neue Fehler, einer weniger**
  (der Datei-Filter zeigt: alle verbleibenden Fehler liegen in unberührten,
  pre-existing Dateien — SubagentApprovalQueuePage/ToolCallInspectorPage
  t(key,'fallback')-Antipattern, BrowserRuntimeModal-Select-Typing).
- **go build ./… + go vet ./…**: grün — NACH Kollateralfixes (siehe
  Retrospektive); a25baa7 hatte sie kaputt committed (deploy.go-Marker,
  user_provisioning.go-Import).
- **Vitest:** 287 passed; 6 pre-existing Fails UNVERÄNDERT gegen Baseline
  verifiziert (team-bindings-panel 4×, SubagentsPanel 1× — <Link> außerhalb
  Router-Kontext, älterer Bruch; section-nav 1× — durch die i18n-Heilung
  behoben). `npm run test`-Gesamtgate: i18n-Anteil grün.
- **Mandat 14 — Klickpfade (bewiesen):**
  1. Nav „Workspaces → App Discovery" → /projects/discover (Top-Nav-Dropdown,
     section-nav.ts workspaceItems).
  2. Nav „Workspaces → Deployments" → Projekt wählen → Deployment-Row-Klick
     → /workspaces/deployments/:projectId/:deploymentId.
  3. Nav „Workspaces → Servers" → Endpoint-Name-Klick → /workspaces/targets/:name;
     Workspaces-Tabellen-Node-Zelle → gleiche Route; Workspace-Detail →
     Parent-Node-Chip → gleiche Route.
  4. Nav „Security → Traces" → /security/traces.
  5. Nav „Workspaces → Browser Integration" → /workspaces/deployments?browser=1
     → BrowserRuntimeModal öffnet einmalig.
  Discovery-Card → „Open project" → /workspaces/projects/:id (echte Row-Verkettung).

## Retrospektive (ehrlich, 21.9.)

1. **Parallele Commits:** Ein zweiter Agent arbeitete gleichzeitig im selben
   Worktree (Secrets-Backend+Frontend, Branch wt-secrets-consolidation) und
   hat die Dateien dieses Pakets in 3dfb7ba („Sprint-50 Items 2+3+4") und
   d04512e (tsc-Fixes + i18n-Merge) COMmitted — gegen den Wortlaut dieses
   Auftrags („Commite NICHT"), aber vom Parallel-Steam entschieden. Die
   tsc-Korrekturen (AppDiscoveryPage-Typinferenz, ungenutzter Button-Import)
   sind vom Parallel-Steam, nicht von hier.
2. **Stash-Pop-Zwischenfall:** Ein versehentliches `git stash pop` (A/B-Messung
   gegen Baseline; der stash- push fand keine lokalen Änderungen mehr vor,
   weil bereits committet, und poppte stattdessen einen FREMDEN, älteren
   Stash „WIP on feat/marketing-website") erzeugte Konflikte in BACKLOG.md
   und deploy.go. Der Parallel-Steam löste die Konflikte, indem er die MARKER
   MIT COMMITTETE — HEAD kompilierte danach nicht (deploy.go:80 Syntaxfehler,
   „strings imported and not used" in user_provisioning.go). Beides ist in
   diesem Working Tree repariert (deploy.go: iac-files-Routen behalten,
   Marker entfernt; user_provisioning.go: Import entfernt; BACKLOG.md:
   semantische Zusammenführung beider Seiten mit Status-Korrekturen gegen
   HEAD — B05/B07/B15 verifiziert erledigt, S2/S3-Zeilen auf Ist-Stand).
   Der alte Stash blieb erhalten (stash@{0}), nichts ging verloren.
3. **Pre-existing Breakage (zunächst nur benannt, in der Nachzugsrunde
   GEHEILT):** 6 Vitest-Fails (TeamBindingsPanel: fehlender QueryClientProvider
   — das Panel trägt seit B15 eine echte useQuery, der Testkommentar kannte
   nur „v1 UI-only"; SubagentsPanel: <Link> zum Session-Inspect braucht
   MemoryRouter) — gegen die Baseline be2554a identisch rot; die Tests sind
   aktualisiert und grün. Die Commit-Message von a25baa7 behauptete
   „go build+vet RC=0" — zum Commit-Zeitpunkt falsch (siehe 2.); jetzt wahr.
4. **Tool-Hygiene:** das einmalige i18n-Merge-Script lag als
   `src/frontend/scripts/tmp-add-i18n-keys.mjs` (vom Parallel-Commit
   übernommen) — in der Nachzugsrunde GELÖSCHT (sein Inhalt ist mit dem
   Locales-Commit verbraucht; BACKLOG/SPRINT dokumentieren die Keys).

## Nachzugsrunde (21.9., zweite Welle — Commits b4714cb/0e26fd3/b04c602-Umfeld)

1. **b4714cb:** Der Parallel-Stream hat die Kollateral-Reparatur dieses
   Pakets (deploy.go-Marker, user_provisioning.go-Import, BACKLOG-Semantik,
   API_DOCS-users-Routen, 7 Nav-i18n-Heals, dieses Sprint-File) als eigenen
   Fix-Commit übernommen — der Working Tree war danach leer.
2. **0e26fd3-Kollateral (Build-Kaputt):** Das Entfernen des SSH-Explore-
   Duplikats #142 (Gateway-Route bleibt, deploy-Paket-Duplikat +
   ssh_explore.go gelöscht) riss auch `shellQuotePath` mit — iac_discovery.go
   referenzierte ihn weiter (HEAD kompilierte nicht). Repariert: Helper an
   seinen einzigen Consumer umgezogen (iac_discovery.go) — eine
   Implementierung neben dem `find`-Aufruf, mit Herkunfts-Kommentar.
3. **X-JiMesh-Identity-Sub (Sprint-51 #130 Follow-up):**
   - auth.Middleware setzt jetzt den VERIFIZIerten Keycloak-sub als
     `X-JiMesh-Identity-Sub` (nur gesetzt, wenn claims.sub nicht-leer; gleicher
     INGRESS-DERIVED-ONLY-Vertrag).
   - Die Strip-Liste ist vervollständigt: Identity-Source/Roles/Sub gehören
     dazu (der Kommentar behauptete das Strippen schon — die Liste führte
     sie nicht; im SDK-Zweig wird nichts überschrieben, dort war ein
     Spoofing-Fenster offen).
   - `callerSubFromRequest` liest den Sub jetzt vom Sub-Header statt vom
     Roles-Header (der Interim-Workaround verglich einen Rollenstring gegen
     eine UUID — Self-Service-GET /api/users/{sub}/workspaces 403-te für
     JEDE nicht-Operator-Identität, auch die eigene).
   - Ehrlich: abgedeckt durch go build+vet; kein eigener Unit-Test (die
     Middleware braucht Session-/Claims-Fixtures, hier nicht mitgebaut).
4. **Verifikation der Nachzugsrunde:**
   - `npm run test`: **29 Dateien / 293 Tests / 293 passed**, check:i18n
     grün (60 Locales, 2795 Keys — inkl. der In-Flight-Plugin-Keys des
     Parallel-Streams), Gate-Exit 0 — das Gesamtgate ist erstmals in diesem
     Worktree komplett grün.
   - `go build ./… && go vet ./…`: grün (nach shellQuotePath-Restore und
     Sub-Header-Fix).
   - tsc: 549 Fehler (weiter gesunken; keiner in den fünf neuen Routen —
     die restlichen sind der bekannte t(key,'fallback')-Antipattern-Bestand).

## Offen / bewusst nicht hier

- SURICATA/Wasserfall-/eBPF-Visualisierungen der Stitch-Designs — keine
  Backend-Quelle, nicht gebaut (Mandat 2).
- Per-Endpoint-SSH-Health (CPU/RAM-Tiles im Target-Detail) — braucht den
  dokumentierten SSH-Probe (nodes_health.go); erst bauen, dann anzeigen.
- TeamBindingsPanel-/SubagentsPanel-Test-Repair — ERLEDIGT (Nachzugsrunde 2).
- Browser-Integration als eigene Fläche (Integrations-Page #9 aus dem
  Frontend-Mock-Plan) — solange die Modal-Fläche die einzige echte ist,
  zeigt der Nav-Eintrag dorthin; nichts als Page vorgetäuscht.
