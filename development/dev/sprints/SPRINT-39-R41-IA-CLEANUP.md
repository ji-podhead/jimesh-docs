# SPRINT-39 — R41 IA-Cleanup + UFW-Removal (TASK-063)

**Quelle:** `docs/research/R41-operator-feedback-blitz.md` (Operator-Session
14.9.2026) — Abschnitt A (Naming/IA-Durcheinander) + Abschnitt B
(UFW-Code-Entfernung) + der Canvas-Width-Eintrag aus Abschnitt A's Tabelle.
TASK-053 (commit `62a5f04`) hatte bereits einen ersten IA-Pass gemacht
(SSH-Endpoints von Apps getrennt, Apps-Dropdown, Ebenen-Badges) — dieser
Sprint erledigt die Punkte, die R41 danach noch als offen listete.

## Ziel

Der Operator versteht sein eigenes Produkt nicht mehr wieder: Runtime-Preset
taucht auf Workspace-Ebene auf obwohl das eine App-Eigenschaft ist, Workspace
hängt hart an Project, zwei Logs-Seiten ohne erkennbaren Grund, ein
UFW-Whitelist-Feld das dem expliziten E-Firewall-Entscheid widerspricht, und
eine zu schmale Content-Spalte auf der SDK-Logs-Seite.

## Work Packages + Akzeptanzkriterien (Plan vor Code, Mandat 1.4)

1. **Runtime-Preset → App-Ebene.** Der Preset-Selector darf nur noch im
   Deploy/App-Dialog erscheinen, nicht im Workspace-Create(Ensure)-Dialog.
   Akzeptanz: `WorkspacesPage.tsx`'s Ensure-Dialog hat kein Preset-Select
   mehr; `workspace-deploy-dialogs.tsx`'s Deploy-Dialog behält seins.
2. **Workspace/Project-Kopplung — Entscheidung dokumentieren.** Prüfen, ob
   eine nullable-FK-Migration sicher/klein genug ist; wenn nicht, die
   UX-Reibung so weit wie möglich senken und die Entscheidung explizit
   festhalten (siehe Abschnitt "Entscheidung #2" unten).
3. **VSC-Port** aus dem Workspace-Header entfernen, falls vorhanden.
4. **Zwei Logs-Seiten kombinieren** hinter einem Tab, `/logs` redirectet.
5. **UFW-Code entfernen** (Request-Felder, SSH-Cleanup-Kommandos, DB-Spalte,
   Frontend-Toggle) — nicht deprecaten, tatsächlich löschen.
6. **Canvas-Width** für die SDK-Logs-Seite beheben.

## Was TASK-053 schon erledigt hatte (verifiziert, nicht neu gebaut)

- SSH-Endpoints sind eine eigene Sektion (`/workspaces/endpoints`), getrennt
  von Apps/Deploy-Formularen.
- Apps-Dropdown (`workspace-apps-dropdown.tsx`) zeigt Name/Container-ID/
  Status/**Ports** generisch pro Container — bereits korrekt auf App-Ebene,
  nicht im Workspace-Header. **Punkt 3 (VSC-Port) war für den neuen
  Workspace/App-Pfad bereits gelöst** — die einzige verbliebene Stelle, die
  einen "VS Code {port}"-Badge direkt an einem obersten Objekt zeigt, ist die
  alte `ProjectsPage.tsx` ("Playground", TASK-053 hat sie explizit zur
  Legacy-Flat-Ansicht erklärt, außerhalb der SSH-Target→Workspace→App-
  Hierarchie) — dort ist es weiterhin ein Projekt-Feld, kein Workspace-Feld,
  und bewusst außerhalb des Scopes belassen (Playground ist ein eigenes,
  flaches Werkzeug, keine Kopie der Workspace-Hierarchie).
- Der Deploy/Ensure-Dialog-Split existierte schon (Ensure vs. Deploy vs.
  Redeploy als drei Modi in `workspace-deploy-dialogs.tsx`).

## Was dieser Sprint (TASK-063) tatsächlich gebaut hat

### WP1 — Runtime-Preset raus aus dem Workspace-Ensure-Dialog
- [x] `src/frontend/src/views/WorkspacesPage.tsx`: der `ws-preset`-Select im
      Ensure-Dialog ist entfernt (war Zeile ~340-354 vor diesem Commit),
      ersetzt durch einen Hinweistext (`workspaces.runtimeMovedNote`), der
      erklärt, dass Runtime beim App-Deploy gewählt wird. `newPreset`-State,
      `PRESETS`-Konstante und das `preset`-Feld im Ensure-Request-Body sind
      entfernt (Backend akzeptiert `preset` weiterhin optional für
      API-Aufrufe außerhalb der UI — kein Breaking Change).
- [x] `src/frontend/src/components/workspaces/workspace-deploy-dialogs.tsx`:
      unverändert — der `wsd-runtime`-Select (Deploy/App-Ebene) bleibt der
      einzige Ort, an dem eine Runtime gewählt wird.
- Backend unverändert: `Preset` bleibt ein optionales Feld auf
  `workspaceEnsureRequest`/`WorkspaceRow` (Store-Ebene) — die UI ruft es nur
  nicht mehr auf; am Datenmodell selbst ändert sich an dieser Stelle nichts,
  weil Preset weiterhin sinnvoll programmatisch (API-Aufruf ohne UI) gesetzt
  werden kann.

### WP2 — Workspace/Project-Kopplung: Entscheidung **NICHT** eine Nullable-FK
**Das ist die Stelle, an der der Operator die Entscheidung gegenprüfen
sollte** (Auftrag: "flag any data-model decision you had to make
unilaterally"). Ich habe geprüft, ob `workspaces.project_id` nullable
gemacht werden kann (kleinere Migration, wie im Auftrag als Default
vorgegeben) — und **bewusst dagegen entschieden**, aus folgendem Grund:

`project_id` ist nicht bloß ein Label — es ist transitiv über die gesamte
Deploy-Pipeline hart verdrahtet:

- `POST /api/projects/deploy` (und `/redeploy`, `/undeploy`) selbst
  validieren `req.ProjID == ""` als 400 (`projects_ssh.go:1137,2210`) — der
  Container-Deploy-Schritt (das eigentliche "App"-Werden eines Workspace)
  braucht IMMER eine echte Projekt-ID, unabhängig davon, ob der
  Workspace-ENSURE-Schritt eine akzeptieren würde. Ein "projektloser"
  Workspace könnte ensured, aber NIE deployed werden — ein UI-Pfad, der wie
  Funktionalität aussieht, aber in eine Sackgasse läuft, wäre selbst ein
  Mandat-2-Verstoß (No-Mock: kein UI-Pfad, der so aussieht als würde er
  funktionieren, aber es nicht tut).
- `CreateServiceKey(projectID, ...)` verweigert `projectID == ""` explizit
  (`consumer_keys.go:129-131`) — Budget-Cascade/ACL-Attribution hängt an der
  Projekt-ID des Service-Keys.
- Es gibt **keinen Leichtgewicht-Endpoint, der nur eine Projekt-ZEILE
  anlegt** — ein Projekt entsteht ausschließlich als Nebeneffekt eines
  echten `/api/projects/deploy`-Aufrufs (SSH-Verbindung, `docker run`,
  Node-Host erforderlich). Ein "Quick-Create-Projekt" direkt aus dem
  Workspace-Ensure-Dialog hätte also sofort einen echten Container gestartet
  — das ist nicht dasselbe wie "eine Projekt-Zeile für die Gruppierung".

Eine echte Nullable-FK-Migration hätte also bedeutet: die Deploy-Engine so
umzubauen, dass sie Node/Volume/Mesh-Router-Auflösung auch OHNE Projekt-Zeile
beherrscht — das ist keine kleine Migration, sondern ein Rewrite der
Deploy-Pipeline-Kernlogik, die aktuell von einer anderen Parallel-Welle
(TASK-064/065) möglicherweise mitbenutzt wird. Das widerspricht dem
Auftrag "prefer the safer/smaller migration" — die kleine Migration existiert
hier schlicht nicht.

**Stattdessen umgesetzt (WP2, tatsächlich):**
- [x] `WorkspacesPage.tsx`: der "keine Projekte"-Banner ist jetzt klickbar —
      ein Button "Create a project (Playground)" (`workspaces.goToPlayground`)
      verlinkt direkt auf `/projects`, damit der Operator nicht erst suchen
      muss, wo man ein Projekt anlegt (`Link` aus `react-router-dom`).
- **Nicht umgesetzt, empfohlen für eine spätere Session:** ein echter
  Leichtgewicht-Endpoint `POST /api/projects` (Zeile-Anlage ohne Deploy),
  der es erlauben würde, ein Projekt direkt aus dem Workspace-Ensure-Dialog
  per Quick-Create anzulegen, ohne einen Container zu starten. Das würde die
  eigentliche Reibung ("ich muss erst wo anders hin") lösen, ohne die
  Deploy-Pipeline anzufassen — das ist der kleinere, sicherere Schnitt,
  den ich für eine zukünftige Session vorschlage, statt ihn hier unter
  Zeitdruck parallel zu TASK-064/065 zu bauen.

### WP3 — VSC-Port
- [x] Verifiziert: für den neuen Workspace/App-Pfad bereits durch TASK-053
      korrekt gelöst (siehe oben). Keine Code-Änderung nötig.

### WP4 — Logs-Seiten kombinieren
- [x] `src/frontend/src/views/SDKLogsPage.tsx`: der bisherige Seiteninhalt
      ist in `SdkPipelinePanel()` verschoben (eigene Toolbar statt
      `PageHeader`); die neue `export default function SDKLogsPage()`
      rendert EINEN `PageHeader` + einen äußeren `SegmentedControl`
      ("LLM Proxy" | "SDK / Audit") und schaltet zwischen `<RealtimeLogs />`
      (der gateway-eigene Routing-SSE-Feed, vorher `/logs`) und
      `<SdkPipelinePanel />` um. Initialer Tab kommt aus `?tab=llmProxy`
      (via `useSearchParams`), sonst Default `sdk`.
- [x] `src/frontend/src/App.tsx`: `/logs` ist jetzt
      `<Navigate to="/sdk-logs?tab=llmProxy" replace />` statt einer
      eigenen Seite — alte Links/Lesezeichen landen auf dem richtigen Tab,
      404 vermieden (Mandat 2). Der `/logs`-Nav-Eintrag ist aus `proxyItems`
      entfernt (ein Eintrag `nav.sdkLogs`, jetzt "Logs" gelabelt, bleibt).
      `src/frontend/src/views/LogsPage.tsx` ist gelöscht (kein Import mehr,
      totes File).
- **Ehrlich nicht gebaut:** R41 hatte vorgeschlagen, das LLM-Proxy-Log als
  `type=chat`-Filter INS SDK-Log (`GET /api/sdk/logs`) zu integrieren — das
  würde bedeuten, dass die LLM-Proxy-Pipeline selbst SDK-Log-Zeilen
  schreiben müsste (ein Backend-Feature, keine Frontend-Umbenennung). Das ist
  hier NICHT gebaut — die zwei Pipelines bleiben zwei echte Datenquellen
  hinter einem UI-Tab, kein erfundenes gemeinsames Datenmodell (Mandat 2:
  kein Vortäuschen einer Vereinigung, die es nicht gibt).

### WP5 — UFW-Code-Entfernung (R41 Abschnitt B)
- [x] `src/backend/internal/deploy/projects_ssh.go`: `UfwRule`-Feld aus
      `DeployRequest` und `UndeployRequest` entfernt; der
      `if req.UfwRule && !isLocal { log... }`-Block in `executeDeploy`
      entfernt; der `sudo ufw delete .../iptables -D INPUT ...`-Cleanup-Block
      in `handleProjectUndeploy` vollständig entfernt (lief vorher noch
      echte Host-Firewall-Kommandos per SSH — das war der eigentliche
      Verstoß gegen Mandat 12/E-Firewall, nicht nur das tote Request-Feld);
      Response-Feld `"ufwRule": p.UfwRule` aus `handleProjectsList` entfernt.
- [x] `src/backend/internal/store/store.go`: `ProjectRow.UfwRule` entfernt,
      alle SQL-Referenzen (`INSERT`/`SELECT`/Scan in `UpsertProject`,
      `ListProjects`, `GetProject`) bereinigt. Die
      `ALTER TABLE ... ADD COLUMN ufw_rule`-Migration ist entfernt (die
      Spalte selbst bleibt auf bestehenden Installationen erhalten, wird
      aber nirgends mehr gelesen/geschrieben — keine riskante
      `DROP COLUMN` auf einer fremden DB).
- [x] Frontend: `src/frontend/src/views/ProjectsPage.tsx` (Playground) und
      `src/frontend/src/components/workspaces/workspace-deploy-dialogs.tsx`
      — die "Automate Host UFW Rules Whitelist"/"UFW whitelist"-Checkboxen
      + zugehöriger State + Request-Felder sind vollständig entfernt (nicht
      nur versteckt).
- [x] `API_DOCS.md` + `docs/GO_BACKEND_API.md`: `ufwRule` aus den
      dokumentierten Bodies/Response-Shapes von `/api/projects`,
      `/api/projects/deploy`, `/api/projects/undeploy` entfernt, mit
      Verweis auf diesen Task als Begründung.

### WP6 — Canvas-Width
- [x] `src/frontend/src/App.tsx`: die bisherige `isFallbackPage`-Sonderregel
      (nur `/config` bekam `max-w-7xl xl:max-w-[1600px]`) ist zu
      `WIDE_ROUTES = new Set(['/config', '/sdk-logs'])` verallgemeinert.
      Bewusst NICHT global geändert (Risiko von Regressionen auf Seiten, die
      für 72rem/`max-w-6xl` designt sind) — nur die Route, die der Operator
      konkret als "überlappend/abgeschnitten" gemeldet hat (`/sdk-logs`,
      breite Filterleiste + 340px-Kosten-Sidebar + 7-Spalten-Tabelle).

## Verifikation

- **Frontend:** `npm install` (kein `node_modules` im Worktree vorhanden,
  frisch installiert), `npx tsc --noEmit -p tsconfig.app.json` → 223
  Fehler, alle vorbestehende Noise in unberührten Dateien (0 neue Fehler in
  `WorkspacesPage.tsx`, `ProjectsPage.tsx`, `SDKLogsPage.tsx`, `App.tsx`,
  `workspace-deploy-dialogs.tsx`). `node scripts/check-i18n.mjs` →
  bestanden für 60 Locales/1728 Keys (7 neue Keys in `en`+`de` von Hand
  übersetzt, restliche 58 Locales per `scripts/backfill-i18n.mjs`
  englisch-befüllt — ehrliche Teilübersetzung, kein Blocker). `npx vitest
  run` → 230/230 grün.
- **Backend:** kein Go-Toolchain im Sandbox (wie erwartet) — über
  `docker run golang:latest`. `go build ./...` / `go vet ./...` zeigen
  GENAU EINEN Fehler, unabhängig von diesem Task: `internal/deploy/deploy.go:68`
  registriert `/api/nodes/provision` auf `h.handleNodeProvision`, das
  nirgends im Paket definiert ist — verifiziert **vor** jeder Änderung
  dieses Tasks (`deploy.go` hat keinen Diff gegen HEAD in diesem Worktree,
  der Fehler ist also bereits im Basis-Commit vorhanden, nicht durch TASK-063
  eingeführt). Mit einem temporären, nicht committeten Stub für exakt diese
  eine fehlende Methode (danach sofort wieder gelöscht) vetten
  `./internal/deploy/...`, `./internal/store/...` und `./internal/gateway/...`
  alle drei sauber durch — das isoliert, dass ausschließlich dieser eine,
  von TASK-063 unabhängige Fund den repo-weiten Build bricht.
  **Operator-Befehl zur Bestätigung:**
  `cd src/backend && go build ./... && go vet ./...` (schlägt an besagter
  Stelle fehl, bis der fehlende `handleNodeProvision`-Handler von der
  Session nachgezogen wird, die `/api/nodes/provision` eingeführt hat —
  vermutlich TASK-060/062-Umfeld, Control-Plane-Registry).
- **Nicht live gegen den laufenden Stack getestet:** kein erreichbarer
  Dev-Server in dieser Session (kein `make up`-Stack aktiv) — alle
  Verifikationen oben sind Code-Review + Compiler/Test-Ebene, nicht
  Live-curl. Das ist eine ehrliche Lücke, keine Behauptung von "live
  verifiziert".

## Was noch offen ist (für die nächste Session / den Operator)

- Der pre-existing `handleNodeProvision`-Compile-Fehler (siehe oben) —
  nicht Teil dieses Tasks, blockiert aber `make go-vet`/`go build` für
  JEDE Session bis er gefixt ist.
- Ein Leichtgewicht-`POST /api/projects`-Endpoint (Zeile ohne Deploy), der
  die Workspace/Project-Kopplung wirklich UX-seitig auflösen würde, ohne die
  Deploy-Pipeline umzubauen (siehe WP2-Empfehlung oben).
- R41's `type=chat`-Idee fürs LLM-Proxy-Log im SDK-Log-Store — ein
  Backend-Feature, nicht in diesem Sprint gebaut (siehe WP4).
