# SPRINT-38 — Control-Plane-Registry: Provider-Interface SSH/AWS/GCP/IPAM/K8s

**Quelle:** Operator 13.9. (TASK-048): „bei der Provision auswählen: SSH vs
AWS vs GCP vs IPAM vs K8s; Control-Planes editieren/provisionieren in
Settings; Router leitet direkt weiter, kein Hop". Spawn-Prompt:
`docs/tasks/subagents/PROMPT-task-060-control-plane-registry.md` (TASK-060).

**Status:** ✅ implementiert & live verifiziert (TASK-060, Subagent-Session,
14.9.2026) — Checkoffs unten sind gegen den Code verifiziert und live
gecurlt, nicht aspiriert (Mandat 1.4).

## Ziel

Der Deploy-Engine ist heute genau EIN Control-Plane-Typ hart verdrahtet:
SSH (`internal/deploy/projects_ssh.go`). TASK-060 generalisiert das zu
einem **Provider-Interface** hinter einer Registry — SSH bleibt der einzige
implementierte Provider (bestehender Code wird GEWRAPPT, nicht umgebaut),
AWS-EC2 / GCP-CE / IPAM-Netbox / Kubernetes-API treten als ehrliche Stubs
bei (Struktur schafft späteren Anbau ohne Umbau). Die Control-Planes
werden in PostgreSQL editierbar (`control_planes`-Tabelle +
`GET/POST/DELETE /api/control-planes`) und `register_router_alias`
(MCP-Tool, Sprint 36 WP4) verdrahtet den Alias DIREKT auf den
provisionierten Control-Plane-Punkt (direct wire, kein Proxy-Hop).

## Work Packages (alle ✅ gegen Code + Live-Curl verifiziert)

### WP1 — `internal/provision/` (neu): Provider-Interface + Registry
- [x] Provider-Interface `Type/Description/Implemented/Deploy/Undeploy/
      Status/Provision` — `src/backend/internal/provision/provider.go:57`;
      Specs mit `store.ControlPlaneRow` + provider-spezifischem
      `json.RawMessage`-Payload; `ErrNotImplemented`-Sentinel (`:36`) +
      `SplitEndpoint` (host[:port], IPv6-safe, `:135`).
- [x] Registry `Register/Get/KnownTypes/Types/Has` —
      `provision/registry.go`; unbekannter Typ = ehrlicher Fehler, kein
      Silent-Fallback (`registry.go:51`). Die Gateway besitzt EINE Instanz
      (kein Globale-Init-Magie): `newControlPlaneRegistry`
      (`internal/gateway/control_planes.go:49`).
- [x] Stubs AWS-EC2/GCP-CE/IPAM-Netbox/Kubernetes — `provision/stubs.go`
      (`AllStubs():18`, `NewAWSEC2Stub():34` …): alle 4 Lifecycle-Calls →
      `ErrNotImplemented` (Gateway → 501), kein Fake (Mandat 2).
- [x] Tests: Registry-Dispatch, Stub-Ehrlichkeit (`errors.Is`), Endpoint-
      Split — `provision/provision_test.go` → `ok` (go test).

### WP2 — `internal/store/control_planes.go`: Tabelle + CRUD
- [x] Tabelle `control_planes` (id, name, type, endpoint,
      credentials_ref, status, config JSON, created_at) —
      `store/control_planes.go:50` (`EnsureControlPlanesTable`), idempotent
      im `migrate()`-Muster (`store.go:295` Aufruf nach EnsureWorkspaces-
      Table); Unique-Index auf `name` (`control_planes.go:66`) — der
      Operator wählt Planes BEI NAME. IDs: `cp-<16 hex>` (crypto/rand,
      `:73`).
- [x] CRUD: `Create`(`:86`)/`Get`/`GetByName`(nil,nil-Sonde)/`List`/
      `Update`(nur name/type/endpoint/credentials_ref/config schreibbar —
      `status` ist gemessener Lifecycle)/`UpdateStatus`/`Delete`
      (`:233`, unknown id = Fehler, kein Stillschluss — Mandat 2).
- [x] Lifecycle-Test gegen Throwaway-DB —
      `store/control_planes_test.go` (create/dup-index/edit/status/list/
      delete/404-Pfade) → `ok` via `make go-test`-Muster.
- [x] `credentials_ref`: opaque Referenz, round-tripped, in v1 NICHT
      aufgelöst (Vault-JIT = TASK-016-Folgearbeit; Plaintext wäre Mandat-9-
      Verstoß) — Doku in `control_planes.go`-Kopf + API_DOCS.

### WP3 — `internal/deploy/ssh_provider.go`: SSH-Provider (WRAP, kein Umbau)
- [x] `SSHProvider` implementiert `provision.Provider` durch Aufruf der
      BESTEHENDEN Pipelines via httptest-Recorder (derselbe Code-Pfad
      bleibt die Autorität — Mandate 11): Deploy → `executeDeploy`
      (`ssh_provider.go:90`), Undeploy → `handleProjectUndeploy`
      (`:119`), Provision → echter Readiness-PreFlight auf den
      bestehenden dialSSH/runSSHCommand-Primitiven (`:166`),
      Status → echte Liveness-Sonde (`:235`).
- [x] Plane-Defaults: endpoint → nodeHost/nodePort, config.nodeUser/
      nodePort → Node-Defaults; Payload überschreibt IMMER
      (`planeNodeDefaults:77`, getestet inkl. Override-Richtung).
- [x] `recorderResult` (`:306`): Status+Body des gewrappten Handlers
      reisen mit — ein 400 bleibt ein 400, ein 502 ein 502, der Body
      kommt verbatim (kein Re-Shape, keine hübschere Lüge).
- [x] Provision ist v1 ein PRE-FLIGHT (docker-daemon-ok/runsc-present/
      df), installiert bewusst nichts — die Install-Schritte bleiben in
      der Deploy-Pipeline (`installGVisor`), ehrlicher Hinweis im
      Response. `runsc-missing` wird als Fakt gemeldet, nicht als Fehler
      getarnt. Grund: `POST /api/nodes/provision` (TASK-058) ist
      uncommitted im Baum — ein Wrap darauf würde meinen Commit at-HEAD
      kaputt machen; dokumentierte Nacharbeit siehe unten.
- [x] Tests: `deploy/ssh_provider_test.go` — Plane-Defaults, Metadaten,
      REAL-Validation-Boundary (Pipeline antwortet ihr eigenes 400,
      Status+Message durchgereicht), recorderResult-Mapping → `ok`.

### WP4 — `internal/gateway/control_planes.go`: Routes
- [x] `GET /api/control-planes` (Liste + Registry-Typen mit implemented-
      Flag, ehrliches `[]`), `POST` (create ohne id / edit mit id — der
      Settings-Anker; Frontend-Tab = TASK-062), `DELETE
      /api/control-planes/{id}` — `control_planes.go:90/104/126/229`.
- [x] Provider-Actions `POST /api/control-planes/{id}/provision|status|
      deploy|undeploy` — dünne Adapter auf das Interface (`:259/287/313/
      335`); Stub-Typen → ehrliches 501 (`writeProviderError:213`);
      deploy/undeploy antworten mit dem Pipeline-Body verbatim.
- [x] Router-Direktleitung `POST /api/router/aliases` (`:437`) — das bis
      heute fehlende Gateway-Ziel des MCP-Tools `register_router_alias`
      (war 404, README sagte „pending gateway"): `conninfo` kann
      `cp:<id>[:port][/db]` sein → Host wird SERVER-seitig aus dem Plane-
      Endpoint aufgelöst und als Upstream-Row in `router_aliases`
      geschrieben (`resolveAliasConninfo:512`); der jimesh-Router
      pulled (GET /api/router/config) und tunnelt DIREKT dorthin — kein
      Proxy-Hop.
- [x] Auth: Session-Mutationen auf `/api/control-planes*` + `/api/router/
      aliases` = OPA-Admin-Gate, INLINE in der auth-Middleware
      (`internal/auth/auth.go:767`) — exakt der TASK-050-Firewall-Präzens:
      `internal/policy/policy.go` trägt UNCOMMITTED Fremd-Arbeit (TASK-061-
      Session, bestätigt per git diff), ein Commit dort würde fremde Hunks
      einschmuggeln. Service-Key-Pfad für `/api/router/aliases` in den
      Machine-Gate-Zweig (`auth.go:674`, gleiche Familie wie router/config
      + firewall/report), Projekt serverseitig gepinnt, ohne Projekt → 403.
- [x] Gateway-Wiring: `provision *provision.Registry` Feld +
      `newControlPlaneRegistry(s.deploy)` + `registerControlPlanes(mux)`
      in `gateway.go` (Import `:32`, Feld `:60`, Komposition `:112`,
      Routen `:171`).

### WP5 — Frontend (TASK-062-Kern, nachträglicher Operator-Scope in
derselben Session, 14.9.): Control-Planes-UI
- [x] `src/views/ControlPlanesPage.tsx` (neu) — Registry-Verwaltung gegen
      die echten TASK-060-Routes: Liste mit Stub-Badges aus dem Backend-
      `types[]` (UI hardcodiert die Provider-Niemals), Create/Edit-Dialog
      (Name/Typ/Endpoint/credentialsRef/config-JSON; Config client-
      validiert, Backend re-validiert), Delete mit Confirm, Provision-
      Dialog mit dem echten PreFlight-Output verbatim, Status-Sonde
      (reachable + Kernel/Docker/Container als gemessene Details,
      unreachable = ehrlicher Fehlertext), Deploy-Dialog (Projekt-Select
      mit Framework/Runtime/workspacePath-Prefill aus der Projekt-Row,
      optionale per-Request-Credentials — nie gespeichert) mit der
      Pipeline-Response verbatim (allocatedPort, securityNotes …).
- [x] Nav + Routing: `App.tsx` — Route `/control-planes`, Eintrag in
      `workspaceItems` (generalisiertes Geschwister der SSH-Endpoints,
      TASK-062-Kommentar), `PROJECT_BASES` ergänzt; Command-Palette:
      `p-control-planes` (Waypoints-Icon, Keywords ssh aws gcp ipam
      kubernetes).
- [x] i18n: `controlPlanes.*` (65 Keys) + `nav.controlPlanes` in `en.json`
      + `de.json` von Hand übersetzt; `node scripts/backfill-i18n.mjs`
      (59 Locales × 65 Keys backgefüllt) + `npm run check:i18n` →
      „passed for 60 locales and 1721 keys".
- [x] Verifikation: `tsc --noEmit -p tsconfig.app.json` — 0 Fehler in
      ControlPlanesPage/App.tsx/command-palette (205 vorbestehende
      Fehler in anderen Views, keine davon in meinen Dateien);
      `eslint` über die 3 Dateien sauber (1 let-Fix nach dem ersten
      Lauf); live auf dem laufenden Dev-Server (Compose-Mount,
      127.0.0.1:19090): `GET /control-planes` → 200, „✓ Compiled in
      2.4s (4145 modules)", keine Compile-Fehler in den Container-Logs.
      Browser-Klick-Test von hier aus nicht möglich (gleiche
      Zurückhaltung wie SPRINT-37) — der Operator sieht die Seite nach
      Refresh unter /control-planes.

## Akzeptanzkriterien — Verifikation (echt, 14.9.2026)

- **Build/Vet:** `HEAD+TASK-060`-Kopie (git archive + meine Dateien, ohne
  fremde In-Flight-Files): `go build ./...` ✓, `go vet` über provision/
  store/gateway/auth ✓. `go vet ./internal/deploy/...` scheitert am
  VORBEFUNDENEN HEAD-Bug (committeter `projects_ssh_egress_test.go` ruft
  3-arg, committete `renderEgressRuleset` hat 4-arg; belegt durch
  identischen Fehler OHNE meine Datei) — NICHT von diesem Task
  eingeführt, der Fix liegt uncommitted im Baum (fremde Session).
- **Tests (Throwaway-DB):** `go test ./internal/provision/...` → ok;
  `go test ./internal/store/...` → ok; `go test ./internal/deploy/... -run
  'TestPlaneNodeDefaults|TestSSHProvider|TestRecorderResult'` → ok.
- **Live-Curl (Operator-Stack 127.0.0.1:19091, nach `make restart-backend`):**
  Login ✓; `GET /api/control-planes` → 200, ehrliches `count:0` + 5 Typen
  mit implemented-Flags ✓; ohne Session → 401 ✓; create ssh + aws-ec2 →
  200 mit `cp-…`-Rows ✓; Negativ: unbekannter Typ 400, fehlende Felder
  400, config-nicht-Objekt 400, Duplikat-Name 409 ✓; Edit mit id →
  endpoint geändert, status bleibt gemessen ✓; Provision auf aws-ec2 →
  **501 „aws-ec2: provision of control plane cp-…: control-plane provider
  not implemented"** ✓; Status-Probe ssh → REAL gemessen: kernel
  `Linux 6.14.0-37-generic`, docker `29.6.1`, 16 laufende Container,
  Row-Status → ready ✓; Provision-PreFlight → `docker-daemon-ok`,
  ehrliches `runsc-missing`, df-Ausgabe, Row → ready ✓; Deploy ohne
  projId → ehrliches 400 mit der echten Pipeline-Message ✓; Deploy auf
  Stub → 501 ✓; Router-Direktleitung `{"alias":"billing-db","conninfo":
  "cp:<id>:5432","projectId":"proj-smoke"}` → `direct:true`, Row
  host=127.0.0.1:5432, im Router-Pull (GET /api/router/config) sichtbar ✓;
  DELETE → 200, nochmal DELETE → 404 ✓; Test-Artefakte wieder entfernt.
- **Persistenz (Mandat 3):** Zeile angelegt → `make restart-backend` →
  Zeile identisch überlebt → bereinigt ✓.

## TASK-068 — Self-Register des lokalen JiMesh-Hosts (13.9.2026)

**Quelle:** Operator-Findung — die Registry hatte NULL Bewusstsein der
eigenen JiMesh-Instanz: eine leere Tabelle, die nur zeigte, was der
Operator manuell eintippte. Sie erkannte nie „das hier ist der
Control-Plane, auf dem ich selbst laufe".
Spawn-Prompt: `docs/tasks/subagents/PROMPT-task-068-control-planes-
self-register.md`. Branch: `task/068-control-planes-self-register`
(Worktree `../jimesh-worktrees/task-068-control-planes-self-register`
nach WORKTREE-PROTOCOL — eine Vorlauf-Phase derselben Aufgabe hatte
uncommitted im Hauptcheckout begonnen; sauber in den Worktree übernommen).

### Plan (vor Implementierung dokumentierte Entscheidungen)

1. **Wo registrieren — Startup ODER lazy beim ersten GET?** → **Lazy
   beim ersten GET /api/control-planes** (`gateway.ensureLocalControlPlane`,
   `internal/gateway/control_planes.go:173`), bewusst so dokumentiert:
   das Gateway besitzt die Typ-Vokabular (Registry), das Store darf
   internal/provision nicht importieren (provision importiert store) —
   ein Boot-Seed würde Typwissen in die Seed-Schicht schmuggeln; die
   Invariante heilt sich selbst nach einem out-of-band SQL-DELETE
   (nicht nur einmal pro Prozessleben); keine Boot-Reihenfolge-Kopplung.
   Race-fest unter gleichzeitigen First-GETs durch den partiellen
   Unique-Index (unten) — der Verlierer sieht beim Re-Probe die Zeile
   des Gewinners.
2. **Typ:** `local` als ECHTER eigener Typ im type-enum
   (`provision.TypeLocal`, `internal/provision/provider.go:40`; Store-
   Spiegel `ControlPlaneTypeLocal`, `internal/store/control_planes.go:62`)
   — KEIN Fake-SSH-Eintrag. Die Zeile trägt einen LEEREN Endpoint (die
   Zeile IST hier — es gibt keine fernzuwählende Adresse).
3. **„GENAU EINE":** die DB selbst erzwingt das Singleton — partieller
   Unique-Index `idx_control_planes_local ON control_planes(type)
   WHERE type='local'` (`internal/store/control_planes.go:93`);
   gefunden per Typ über `GetLocalControlPlane` (`:185`).
4. **Sonden:** gleiche Befehle wie TASK-060s SSH-Status/Provision, nur
   ohne SSH-Hop — `sh -c` direkt am Backend-Host
   (`internal/provision/local.go:54` Status: uname/docker-Version/
   Container-Zahl; `:63` Provision: docker-daemon/runsc/df — prüft,
   installiert bewusst nichts). Fehlender docker-CLI = gemessene
   Tatsache `docker-unavailable`, nie eine erfundene Version (Mandat 2).
5. **PROTECTED:** DELETE der Self-Row → 409 mit klarer Reason
   (`gateway/control_planes.go:336`), Edit der Self-Row → 409 (`:290`),
   manuelles Create mit type local → 400 (`:232`); `status` bleibt
   ausschließlich gemessener Lifecycle (Start `unknown`, gebucht nur
   von provision/status-Calls — wie jede anderen Zeile auch). Alias auf
   `cp:<selfId>` → ehrliche 400 („system-owned, kein Endpoint zu
   verkabeln" statt dem üblichen „edit it first"-Deadend, `:655`).
6. **Frontend:** deutliches „local"-Badge (cyan, HardDrive-Icon),
   distinkt zum Stub-Badge und zu manuellen Remote-Zeilen; Edit/Delete
   für die Self-Row disabled mit Grund als Title (Backend bleibt die
   Autorität); `local` aus dem Create-Dialog-Picker gefiltert
   (Backend-reserviert, sonst garantierte 400). Provision/Status-Buttons
   bleiben aktiv (echte Sonden), Deploy bleibt aktiv und antwortet
   ehrlich 501 wie bei Stubs.

### Verifikation (echt, 13.9.2026, alles aus dem Worktree)

- **Build/Vet/gofmt:** `CGO_ENABLED=0 go build ./...` ✓, `go vet ./...`
  ✓ (kompletter Baum, kein Deploy-Bug mehr — TASK-071-Commit hat den
  alten 4-arg-Vet-Bug behoben), `gofmt -l` über die 4 Scope-Dateien →
  leer (2 Fundstellen gefixt).
- **Tests:** `go test ./internal/provision/... ./internal/store/...`
  gegen Throwaway-DB → `ok` × 2. Neu: `TestLocalProvider*` (4 Tests,
  echte Sonden, `local_test.go:20/35/62/82`) und
  `TestControlPlaneLocalSingleton` (`control_planes_test.go:134` —
  GetLocalControlPlane nil-Probe, Row-Form, **zweiter type-local-Insert
  scheitert am Singleton-Index**, andere Typen unberührt). Alle 6 mit
  `-v -count=1` einzeln gesehen — kein Skip.
- **Live-Curl (Worktree-Binary, docker:27-cli-Container mit Socket-
  Mount, Port nur 127.0.0.1:39999 gebunden — Mandat 12, Throwaway-DB
  `jimesh_live068`, danach gedroppt):** Erster GET → GENAU EINE Row
  `cp-ece379ef69bc46ff` (name `local`, type `local`, endpoint leer,
  status `unknown`, types[] mit `local implemented:true`) ✓; zweiter GET
  → count bleibt 1 (kein Double-Create) ✓; Status-Sonde → **ECHT
  gemessen:** kernel `Linux 6.14.0-37-generic`, docker `29.6.1`,
  17 laufende Container (via Socket — dieselben Fakten wie der
  TASK-060-Live-Test), Row → `ready` ✓; Provision → `docker-daemon-ok`,
  ehrliches `runsc-missing`, df-Ausgabe verbatim ✓; DELETE → **409**
  („the registry must keep knowing itself") ✓; Create type local →
  **400** (reserved) ✓; Edit der Self-Row → **409** ✓; Deploy →
  ehrliches **501** mit Verweis auf den ssh-Provider ✓; Alias
  `cp:<selfId>:5432` → **400** (kein Remote-Endpoint) ✓; Final-GET →
  1 lokale Zeile, status `ready` ✓.
- **Frontend:** `npx eslint src/views/ControlPlanesPage.tsx` → 0
  Befunde; `tsc --noEmit -p tsconfig.app.json` → 205 Fehler, exakt der
  vorbefundene Bestand (SPRINT-38 WP5 dokumentierte dieselben 205),
  **keiner** in ControlPlanesPage; i18n: en+de per Hand (2 neue Keys),
  `node scripts/backfill-i18n.mjs` (59 Locales × 2 Keys), `npm run
  check:i18n` → „passed for 60 locales and 1906 keys" ✓.
- **Live gegen den Operator-Stack (127.0.0.1:19091):** bewusst NICHT
  gelaufen — der Compose-Backend mountet den Hauptcheckout, nicht den
  Worktree; nach dem Merge genügt `make restart-backend` und die Row
  erscheint beim ersten GET. Der Live-Proof oben lief gegen dieselbe
  Binary aus demselben Baum.

## Offen / bewusst NICHT in diesem Task (ehrlich)

- [x] Frontend-Settings-Tab → WP5 oben nachgerüstet (Operator-Scope in
      derselben Session). Offen bleibt daraus: der **CP-Picker in den
      Workspace-Deploy-Dialogen** (die TASK-053-Fläche wählt heute
      ssh-Endpoints statt Control Planes — die Konsolidierung
      ssh-endpoints→control-planes ist die Nacharbeit, bewusst nicht in
      deren Dialoge hineingepatcht: Parallel-Agent-Konfliktgefahr, und
      der Deploy-Pfad über `/control-planes/{id}/deploy` existiert und
      funktioniert heute von der neuen Seite aus).
- [ ] AWS/GCP/IPAM/K8s-Implementierungen — nur Struktur + ehrliche Stubs
      (Sprint-33 KLAF-AWS greift am selben Interface).
- [ ] Vault-JIT-Auflösung von `credentials_ref` (TASK-016-Entwurf — Feld
      ist gespeichert und round-tripped; die UI erklärt das im Formular).
- [ ] SSH-Provision als installierender PreFlight: sobald
      `POST /api/nodes/provision` (TASK-058, aktuell uncommitted im Baum)
      gelandet ist, kann `SSHProvider.Provision` den dortigen
      Install-Teil zusätzlich wrappen — die ehrliche v1-Grenze (nur
      prüfen, nichts installieren) ist oben dokumentiert.
- [x] `/api/control-planes*` + `/api/router/aliases` in
      `policy.IsAdminMutation`'s Präfixliste nachgezogen, nachdem die
      TASK-061-Session `policy.go` committed hatte (Commits
      ecb70b1/81c568d/3507c97) — der temporäre Inline-Check aus auth.go
      ist entfernt (Nachzug-Commit; gleiche Engine, gleiche Deny-Text,
      `policy_test.go` deckt die Präfixe jetzt ab).
- [ ] Service-Key-Pfad von `/api/router/aliases` live getestet nur am
      Session-Pfad (kein Workspace/Service-Key im Test-Stack vorhanden —
      Gate-Zweig ist code-identisch mit router/config + firewall/report).
- [ ] `cmd/jimesh-router` (Consumer-Seite) unangetastet — der Pull kennt
      die Zeilenform bereits (RouterAliasRow unverändert).
