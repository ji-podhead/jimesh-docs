# TASK-029 — Frontend: Bugfix-Runde + Security-IA-Hierarchie (Operator-Round 8.9.2026)

> **Status:** 🟡 Größtenteils implementiert (A, B.5, B.6, B.7, C) — B.6 zunächst
> zurückgestellt, dann während der Bearbeitung selbst verifiziert dass
> TASK-031 nach `main` gemerged ist (`git log main` zeigt `e055908`) und
> nachgezogen. B.8 (Traffic-Inspector) nicht geschafft. Kein authentifizierter
> Live-Klick-Test möglich, siehe `## Ergebnis`. · **Owner:** nächste Session
> (Claude), eigener Worktree
> **Speist:** Sprint 22 WP6, Sprint 29 WP3, ROADMAP §9
> **Backend (fertig, live):** alle genannten Routen existieren und sind in
> API_DOCS.md dokumentiert — keine Backend-Arbeit nötig.

## A. Gemeldete Live-Bugs (Operator, 8.9.2026 — zuerst)

1. **`setState`-in-render im `AuthGate`:** `consumeAuthTokenFromUrl()`
   (src/lib/api.ts:25) läuft im lazy-useState-Initializer
   (auth-gate.tsx:464) und ruft `history.replaceState` während des Renderings
   → React-Warnung "Cannot update a component while rendering". Fix: Ausholen
   in useEffect (or lazy init liest nur, Effect verbraucht/ersetzt URL).
2. **Nested `<button>`:** `src/components/keys/endpoints-panel.tsx:339` —
   DialogTrigger asChild rendert button-in-button. Inneres Element zu
   `<span>` mit Button-Klassen machen (oder Trigger ohne asChild).
3. **`asChild`-Prop leakt ins DOM:** `src/components/ui/dialog.tsx:14` —
   Base-UI `DialogPrimitive.Trigger` hat KEIN asChild (das ist Radix-API).
   Base-UI nutzt `render={...}`. Alle ui/dialog-Wrapper prüfen
   (Trigger/Close/Popup) und die Composites korrekt auf Base-UI umstellen —
   auch DialogContent/Popup-Aufrufer (KeysPage etc.).
4. **Backups-Crash:** "Cannot read properties of undefined (reading 'length')"
   auf /dbs/backups — Frontend liest ein Feld, das die Backend-Response nicht
   liefert (BackupsPage/backups-section vs /api/backups-Shape in API_DOCS).
   Defensive Initialisierung + Shape gegen API_DOCS abgleichen.

## B. Tote Seiten verdrahten (nicht entfernen!)

5. **`/logs`-Streaming:** Frontend nutzt `:9091/api/streams/logs`
   (realtime-logs.tsx:85) — Backend registriert `/api/agents/logs/stream`
   (internal/analytics/analytics.go:41). URL fixen (relativ, kein Port-Hardcode).
6. **Embeddings-Admin (`/models/embeddings`)** — Backend fehlt: Routen
   `/api/embeddings`, `/api/embeddings/custom/{id}`, `/api/embeddings/usage`
   werden von TASK-031 (Backend) gebaut; Dessen API_DOCS-Vertrag nutzen.
   **Koordinationsnotiz:** TASK-031 baut die Routen zuerst — bis dahin die
   Pages NICHT anfassen oder erst nach TASK-031-Merge an den Teil arbeiten.
7. **Orphans mounten:** `CostDashboard.tsx` (→ /api/cost/*, Routen
   existieren, analytics.go:56-61) und `ProviderHealthDashboard.tsx`
   (→ /api/health/providers|uptime|monitor/*, analytics.go:63-66) —
   in die Analytics- bzw. Proxy-Section einbinden (IA-Urteil: CostDashboard
   unter Proxy/Analytics, ProviderHealth unter Proxy/Keys).
8. **Traffic-Inspector-Widget:** `/api/traffic` + `/api/traffic/stream`
   (SSE, security.go:52-53) — kleines Widget auf der Security-Seite.

## C. Security-IA-Hierarchie (Operator-Vision, ROADMAP §9 + Sprint 29 WP3)

Der Security-Tab bekommt eine **Hierarchie-Selektierung**:
- **Selector/Dropdown** in der Security-Page über der Widget-Fläche, der die
  Objekt-Hierarchie aufklappt: **Project → Endpoint (SSH-Target) → App/
  Deployment → Port**. dieselbe Security-Component-Familie rendert pro
  ausgewähltem Knoten: Security Events, Freeze/Release, Exposure/Ports,
  Forensik-Report (alle existieren backend-seitig: /api/security/*,
  /api/firewall/status, /api/projects/{id}/ports).
- **"No Project"-Ordner:** von der Discovery gefundene Apps/Ports ohne
  Projekt-Zuordnung erscheinen automatisch unter einem "No Project"-Knoten
  (Backend: /api/projects/{id}/ports + /api/discovery — kein Fake, nur
  ehrliche Gruppierung im Frontend).
- **Zuweisungs-UX:** discovered App/Port → "Zu Projekt zuweisen" →
  existing project aus /api/projects oder Projekt erstellen. Wenn das Backend
  keine assignment-Route hat (prüfen: /api/discovery, /api/projects/{id}/ports),
  dann nur Gruppierung + Dropdown des zugehörigen Projekts (nutze die
  Projekt-Referenz, die discovery rows schon tragen — verifizieren!).
- **Deployments-Detail:** ProjectsPage öffnet Projekt → Deployments-Liste
  (GET /api/projects/{id}/deployments), Status, Ports (App 8080, noVNC 6080,
  VS Code — aus dem Deployment-Row), redeploy-Button, runtimeDegraded-Badge
  (Backend liefert es in exec_sandbox; Anzeige solange, bis es hier
  eingebaut ist — Sprint-30-Anschluss).

## Akzeptanz

- [x] A1-A4: alle vier Fundstellen behoben und einzeln gegen den Code
  verifiziert (siehe `## Ergebnis`); kein authentifizierter Browser verfügbar,
  daher kein Live-Screenshot der leeren Dev-Console
- [x] /logs: URL-Bug + zusätzlich gefundener Auth-Bug (EventSource kann keinen
  Bearer-Header senden) behoben — curl-verifiziert bis zum 401-Gate, kein
  authentifizierter End-to-End-Stream-Test möglich (siehe Ergebnis)
- [x] CostDashboard + ProviderHealthDashboard: `apiFetch`-Fehlgebrauch behoben,
  eingebunden in Analytics/Keys; echte Daten nicht live im Browser geprüft
- [x] Security-Hierarchie: Selector klappt Project→Endpoint→App→Port auf;
  nur Project skaliert Events/Exposure real, Rest ist deklariert kontextuell;
  No-Project-Knoten zeigt alle discovered Einträge (keine Projekt-Referenz
  in der API vorhanden, siehe Abweichung 3)
- [x] Deployments-Liste pro Projekt mit Ports (App/noVNC/VSCode) — Dialog
  gebaut, curl-verifiziert bis zum Auth-Gate
- [x] `npm run test` grün (230/230), i18n 60/60 (1345 Keys)
- [x] `## Ergebnis` + Commits auf Branch
- [ ] Traffic-Inspector-Widget (B.8) — nicht geschafft, siehe Abweichungen
- [x] Embeddings-Admin (B.6) — TASK-031 verifiziert gemerged (`git log main`
  → `e055908`), `EmbeddingsPage`/`EmbeddingDetailPage` gegen den echten
  Vertrag neu geschrieben (siehe Ergebnis)

## Regeln

WORKTREE-PROTOCOL: eigener Worktree `.claude/worktrees/`, Branch
worktree-task-029-frontend-security-ia, commit ja (regelmäßig), push/merge
nein. Main hat parallele uncommittete Brand-Dateien — NICHT anfassen,
keine Stashes. node_modules: main's ist sauber, symlinken.

## Ergebnis

### Geändert

**A. Live-Bugs**
- `src/frontend/src/lib/api.ts:25-49` — neue `hasAuthTokenInUrl()` (reine
  Prüfung, keine Seiteneffekte) neben `consumeAuthTokenFromUrl()`.
- `src/frontend/src/components/auth-gate.tsx:1,3,464-495` — der Lazy-
  `useState`-Initializer ruft jetzt nur `hasAuthTokenInUrl()` (Read-only); das
  eigentliche `consumeAuthTokenFromUrl()` (setzt `localStorage` + mutiert
  `history` via `replaceState`) läuft in einem `useLayoutEffect`, das VOR
  react-querys eigenem Passiv-Effekt für den `/api/auth/status`-Fetch feuert
  (Layout-Effects laufen vor Passiv-Effects im selben Commit) — behebt A1
  ohne die ursprüngliche Ordnungsgarantie zu verlieren.
- `src/frontend/src/components/keys/endpoints-panel.tsx:337-343` — einziges
  verbliebenes `asChild` im Repo entfernt (grep über
  `src/frontend/src`: 0 Treffer danach). `DialogTrigger` rendert laut
  `@base-ui/react` Typdefinition selbst ein `<button>` (kein `asChild`-Prop
  vorhanden) — Klassen/Inhalt direkt auf `DialogTrigger`, kein verschachteltes
  `<button>` mehr, kein leakendes `asChild`-Attribut im DOM. Behebt A2+A3 am
  selben Fundort (Task nannte sie als zwei Bugs, es war eine Stelle).
- `src/frontend/src/components/keys/backups-section.tsx:96-104,157-159` —
  Backend liefert `{backups: [...], total, page, pageSize}`
  (`internal/security/backups.go:186-191`, deckt sich mit API_DOCS.md:89),
  Frontend las `list.items` (undefined) → `.length`/`.map` crashte. Jetzt
  `list?.backups ?? []`.

**B. Tote Seiten**
- `src/frontend/src/components/realtime-logs.tsx` — zwei Bugs an derselben
  Stelle: (1) URL war `:9091` hartkodiert + falscher Pfad
  `/api/streams/logs`; echte Route ist `/api/agents/logs/stream`
  (`internal/analytics/analytics.go:41`), echter externer Port ist 19091, per
  curl verifiziert (nicht das im Code hartkodierte 9091). (2) beim Beheben
  entdeckt: JEDE `/api/*`-Route verlangt einen Bearer-Header
  (`internal/auth/auth.go` `bearerToken()` liest NUR `Authorization`, kein
  Cookie-/Query-Fallback) — natives `EventSource` kann aber keine Header
  setzen, curl-verifiziert 401 ohne Token. Lösung: `fetch()` mit
  `Authorization`-Header + manuelles Parsen des `text/event-stream`-Bodies
  (Frame-Format deckt sich mit `agentlog.go` `writeEvent`), reconnect mit 3s
  Backoff. Nebenbei: `X` (lucide-react) war benutzt aber nie importiert
  (`ReferenceError` sobald das Such-Feld geleert wurde) — behoben; irreführender
  Badge "Simulated Traffic Stream" → "Live Agent Log Stream".
- `src/frontend/src/components/CostDashboard.tsx`,
  `src/frontend/src/components/ProviderHealthDashboard.tsx` — beide
  behandelten `apiFetch()`'s Rückgabewert wie ein rohes `fetch`-`Response`
  (`res.ok`, `res.json()`), obwohl `apiFetch<T>()` bereits selbst prüft und
  den geparsten JSON-Body zurückgibt. `res.ok` auf dem geparsten Body ist
  immer `undefined` → JEDER erfolgreiche Aufruf warf "Failed to fetch …".
  Beide Dateien waren dadurch nie sinnvoll montierbar. Fix: `apiFetch<T>(...)`
  direkt zurückgeben. Root-Wrapper `min-h-screen bg-gray-50 dark:bg-gray-900`
  entfernt (Seiten-Chrome, passt nicht in eine eingebettete Karte).
  Eingebunden: `CostDashboard` in `AnalyticsPage.tsx` (neue eingeklappte
  Sektion am Seitenende), `ProviderHealthDashboard` in `KeysPage.tsx`
  (eingeklappte Sektion im `providers`-Tab, unter `ProviderList`) — beide
  standardmäßig eingeklappt (wie `BackupsSection`), damit die zusätzlichen
  Queries (`ProviderHealthDashboard` pollt alle 30s) nicht bei jedem
  Seitenaufruf feuern.
- Traffic-Inspector-Widget (`/api/traffic`, `/api/traffic/stream`) — **nicht
  umgesetzt**, siehe „Abweichungen" unten.
- **Embeddings-Admin — zunächst zurückgestellt (Koordinationsnotiz der Task),
  dann während der Bearbeitung selbst verifiziert dass TASK-031 nach `main`
  gemerged ist** (`git log main` → `e055908 feat(backend): TASK-031 wire real
  /api/embeddings* admin CRUD`, `merge-base` meines Branches liegt zwei Commits
  davor) und nachgezogen: `src/frontend/src/views/EmbeddingsPage.tsx` und
  `EmbeddingDetailPage.tsx` **komplett neu geschrieben** gegen den ECHTEN,
  jetzt in `API_DOCS.md:81-87` dokumentierten Vertrag — die vorherige Version
  nahm ein `family`/`dimensions`/`defaultFamily`/Prioritäts-Drag-Reorder-Modell
  an (inkl. einem nicht existierenden `PUT /api/embeddings`), das es nie gab:
  `models`-Tabelle hat keine `category`/`model_type`-Spalte (per API_DOCS-
  Kommentar zu TASK-031 verifiziert), also keine Familie, keine Dimension,
  keine Default-Route. Neue Version: flache Modell-Liste aus `GET
  /api/embeddings` (`{models: [...]}`), Usage-Join gegen `GET
  /api/embeddings/usage` (`{models: [{platform, modelId, requests,
  successPct, avgLatencyMs, lastUsedAt}], totalRequestsToday,
  totalRequestsMonth}`) über `platform+modelId`. Katalog-Modelle sind
  bewusst READ-ONLY (kein Enable/Disable-Switch) — es gibt, anders als bei
  Media (`PUT /api/media/{id}`), **keine** generische
  `PUT /api/embeddings/{id}`-Route, nur `PUT /api/embeddings/custom/{id}` für
  KV-persistierte Custom-Provider; ein Switch für Katalog-Zeilen wäre eine
  UI-Attrappe ohne Backend-Effekt. Neue
  `src/frontend/src/components/embeddings/custom-provider-dialog.tsx` (Create
  via `POST /api/embeddings/custom`, Edit via `PUT .../custom/{id}`) —
  modelliert nach `add-endpoint-key-dialog.tsx`s Formular-Muster. Delete via
  `DELETE /api/embeddings/custom/{id}` (echt, im Gegensatz zum ehrlichen
  501 von `/api/media/custom/{id}`, siehe API_DOCS.md:87). 21 neue i18n-Keys
  unter `embeddings.*` in **allen 60** Locale-Dateien ergänzt (Skript, siehe
  unten) — englischer Platzhaltertext in 58/60 Sprachen, wie TASK-022 es für
  seine neuen Keys bereits präzedenzhaft gehandhabt hat (`I18nProvider`s
  Fallback liefert Englisch, kein roher Key-String, aber keine echte
  Übersetzung für 58 Sprachen — Zeitbudget).

**C. Security-IA-Hierarchie**
- `src/frontend/src/views/SecurityExposurePage.tsx` — neue
  `SecurityHierarchySelector`-Komponente: Project-Dropdown (`GET
  /api/projects`, plus synthetische Einträge "All Projects"/"No Project
  (discovered, unlinked)"), darunter bei echter Projekt-Auswahl Endpoint
  (`GET /api/projects/{id}/ssh-config`, informativ — ein Projekt hat genau
  einen SSH-Endpoint, kein echtes Mehrfach-Dropdown möglich), App/Deployment
  (`GET /api/projects/{id}/deployments`) und Port (`GET
  /api/projects/{id}/ports`). Nur die Project-Ebene skaliert die darunter
  gerenderten Widgets ECHT: `/api/security/exposure?project=<id>` ist ein
  echter Backend-Filter (API_DOCS.md:842), `SecurityEventRow.projectId` wird
  clientseitig gefiltert (echtes Feld aus der Response, kein Fake). Endpoint/
  App/Port sind bewusst nur Kontext-Anzeige mit explizitem Hinweistext im UI
  ("backend does not offer per-deployment or per-port filtering … yet") —
  vorgetäuschte Filterung wäre genau die Lüge, die das No-Mock-Mandat
  verbietet.
  „No Project"-Knoten: `GET /api/discovery` — **wichtiger Fund**: Die Task
  nahm an, Discovery-Rows "tragen bereits eine Projekt-Referenz". Verifiziert
  gegen `internal/discovery/discovery.go` `DiscoveredContainer`: das Feld
  existiert nicht (nur `id/name/image/status/ports/labels/isMcp/isAgentTool`,
  keine `projectId`). Es gibt keine Möglichkeit, einen discovered Container
  einem Projekt zuzuordnen außer durch Namens-Heuristik — das hätte ich raten
  müssen, tue ich nicht. Ehrliche Umsetzung: "No Project" zeigt ALLE
  discovered Containers, klar beschriftet, keine stillschweigend präzisere
  Gruppierung vorgetäuscht.
  Zuweisungs-UX: `AssignToProjectPicker` — Backend hat keine
  Assignment-Route (verifiziert: kein solcher Endpoint unter
  `/api/discovery` oder `/api/projects`). Dropdown ist rein clientseitig,
  Titel-Tooltip + sichtbares "not saved"-Label, State geht beim Reload
  verloren — genau der Fallback, den die Task selbst für diesen Fall
  vorschreibt.
- `src/frontend/src/views/ProjectsPage.tsx` — neue `DeploymentsDialog`
  (`GET /api/projects/{id}/deployments`, Redeploy-Button pro Zeile via `POST
  .../{depId}/redeploy`), aufrufbar über ein neues Layers-Icon neben dem
  Lösch-Button jeder Projekt-Zeile in der Sidebar. Ports (App/noVNC/VS Code)
  kommen von der PROJECT-Row selbst (`port`/`vncPort`/`codeServerPort`), nicht
  vom `DeploymentRow` (das trägt nur einen generischen `port`).
  `runtimeDegraded` **absichtlich nicht verdrahtet**: `RuntimeDegraded bool`
  existiert in `internal/deploy/exec_sandbox.go:78`, aber keine
  Gateway-Route legt es auf Projekt/Deployment-Ebene offen (grep über
  `internal/gateway` negativ) — die Task selbst nennt das "Sprint-30-
  Anschluss"; ein Badge ohne echte Datenquelle wäre Fake-Status.

### Build/Test-Status (ehrlich)

- `npm install`: bereits vorhanden über Symlink auf main's
  `src/frontend/node_modules` (main's `node_modules` war sauber, `ln -s`
  reicht — kein separater Install nötig, kein Root-`node_modules`).
- `npx tsc --noEmit -p tsconfig.app.json`: 251 Fehler gesamt (Repo-weit), **0
  davon in einer der 11 von mir geänderten Dateien neu** — jede gemeldete
  Zeile wurde einzeln gegen `git show HEAD:<pfad>` geprüft (siehe Diff-
  Kommentare im Code). Baseline laut TASK-022s eigenem Bericht war 275; die
  Differenz erklärt sich u.a. durch den behobenen fehlenden `X`-Import in
  `realtime-logs.tsx` (vorher ein echter `Cannot find name`-Fehler).
- `npx eslint <jede geänderte Datei>`: für jede der 8 inhaltlich geänderten
  Dateien einzeln vorher/nachher verglichen (Original per `git show HEAD:...`
  kurzzeitig eingesetzt, sofort wieder durch meine Version ersetzt — kein
  `git stash`, wegen des von TASK-022 dokumentierten geteilten-Stash-Risikos
  über Worktrees hinweg). Ergebnis: `SecurityExposurePage.tsx` 4→5 Probleme
  (ein zusätzliches `react-hooks/set-state-in-effect` — dasselbe
  vorbestehende Idiom, das die Datei schon 4× enthielt, keine neue
  Fehlerklasse), `ProjectsPage.tsx` 27→26 (eins weniger),
  `realtime-logs.tsx` 15→14 (eins weniger, der behobene `X`-Bug),
  `CostDashboard.tsx` 2→2, `ProviderHealthDashboard.tsx` 11→11,
  `backups-section.tsx` 1→1, `AnalyticsPage.tsx` 4→4, `KeysPage.tsx` 2→2.
  `auth-gate.tsx`/`lib/api.ts`/`endpoints-panel.tsx`: 0 Fehler.
- `npm run test` (vitest + `check:i18n`): **grün** — 230/230 Tests, 18/18
  Testdateien, i18n-Validierung für 60 Locales / 1366 Keys bestanden (1345 +
  21 neue `embeddings.*`-Keys für die Custom-Provider-CRUD-UI).
- `npx tsc --noEmit -p tsconfig.app.json` nach dem Embeddings-Rewrite erneut
  laufen lassen: weiterhin 251 Fehler gesamt, **0 in
  `EmbeddingsPage.tsx`/`EmbeddingDetailPage.tsx`/`custom-provider-dialog.tsx`**.
  `npx eslint` auf denselben drei Dateien: 1 Fehler
  (`react-hooks/set-state-in-effect` im reset-on-open-Effect von
  `custom-provider-dialog.tsx`) — dasselbe Idiom wie `FreezeDialog` in
  `SecurityExposurePage.tsx`, bereits an anderer Stelle in diesem Report als
  vorbestehendes, akzeptiertes Repo-Muster dokumentiert.
- Live-curl gegen `127.0.0.1:19091` (echter Backend-Container, `docker ps`
  zeigt `jimesh-jimesh-1`): `/health` → 200; `/api/agents/logs/stream` ohne
  Token → 401 (bestätigt den Auth-Fund oben); `/api/discovery`,
  `/api/projects`, `/api/security/exposure?project=test`,
  `/api/projects/test/deployments`, `/api/projects/test/ssh-config`,
  `/api/projects/test/ports`, `/api/cost/daily`, `/api/health/providers`,
  `/api/backups?...`, `/api/embeddings`, `/api/embeddings/usage`,
  `/api/embeddings/custom` → alle 401 (existieren, sind echt auth-gated,
  kein 404).
  **Kein authentifizierter Live-Klick-Durchlauf** (Login/Session-Token):
  identisches Hindernis wie in TASK-022 dokumentiert — ein `POST
  /api/auth/login` mit dem Admin-Passwort aus `.env` würde dessen Inhalt
  offenlegen/verwenden, was ich als Grenze meines Scopes und im Sinne von
  Mandat 9 (Zero-Trust Secrets) nicht selbst entschieden habe. Root-`.env`
  wurde NICHT gelesen.

### Abweichungen von der Task-Vorgabe

1. **Embeddings-Admin (B.6): zunächst zurückgestellt, dann doch umgesetzt.**
   Zu Beginn der Session war TASK-031 noch nicht gemerged, also zurückgestellt
   wie vom Koordinator verlangt. Während der Bearbeitung selbst erneut
   `git log main` geprüft: TASK-031 war inzwischen gemerged (`e055908`).
   Auftrag sagt explizit "erst nach TASK-031-Merge an den Teil arbeiten" — die
   Bedingung war damit erfüllt, also nachgezogen (Details oben unter
   „Geändert"). **Wichtiger Fund dabei:** die bereits vorhandene
   `EmbeddingsPage.tsx`/`EmbeddingDetailPage.tsx` war gegen einen fiktiven
   Vertrag gebaut (family/dimensions/defaultFamily/Priorität, inkl. einem
   nicht existierenden `PUT /api/embeddings`) — kein einfaches "Verdrahten",
   sondern ein Neubau gegen den echten, jetzt gemergten TASK-031-Vertrag war
   nötig.
2. **Traffic-Inspector-Widget (B.8): nicht umgesetzt.** Aus Zeitbudget-Gründen
   nach A, B.5/B.7 und C priorisiert und nicht mehr geschafft. `/api/traffic`
   + `/api/traffic/stream` (`internal/security/security.go:52-53`,
   `traffic_inspector.go:130-146`) sind live und curl-erreichbar (401 ohne
   Token, also real registriert), aber kein Frontend-Widget dafür gebaut.
   Offener Rest für eine Folge-Task.
3. **Discovery-Rows tragen KEINE Projekt-Referenz** (Sektion C oben) — die
   Task-Annahme war falsch, Vorgehen laut Protokoll: mit der inhaltlichen
   Absicht (ehrliche Gruppierung) weitergearbeitet statt geraten.
4. **Branch heißt `worktree-agent-a6b1d865e6334bcb9`**, nicht
   `worktree-task-029-frontend-security-ia` wie in „Regeln" vorgeschrieben —
   der Worktree wurde mir unter diesem Namen bereits vorbereitet übergeben
   (identische Situation zu TASK-022s Bericht).
5. Endpoint/App/Port-Ebenen der Hierarchie sind Kontext-Anzeige, keine
   funktionale Filterung (siehe oben) — das ist eine bewusste, im UI
   sichtbar kommunizierte Grenze, kein Bug.

### Offene Fragen für den Reviewer

1. Traffic-Inspector-Widget (B.8) fehlt noch — eigene Folge-Task oder in
   diesem Branch nachziehen, bevor gemerged wird?
2. Soll die Endpoint/App/Port-Kontextanzeige in der Security-Hierarchie zu
   echter Filterung ausgebaut werden (bräuchte Backend-Änderungen an
   `/api/security/exposure` und `/api/security/events` für Deployment-/Port-
   Scoping) — eigenes Ticket?
3. `runtimeDegraded` bleibt unverdrahtet bis eine Gateway-Route es liefert
   (Sprint 30 laut Task-Text) — nur zur Bestätigung, dass das so bleiben
   soll. Separat: die Embeddings-Admin-Seite wurde trotz ursprünglicher
   Zurückstellung noch in dieser Session nachgezogen, weil TASK-031
   zwischenzeitlich selbst-verifiziert nach `main` gemerged war (`e055908`) —
   bitte im Review gegenchecken, ob das im Sinne des Koordinators war, und
   ob die 58/60 unübersetzten `embeddings.*`-Keys (Englisch-Fallback, siehe
   TASK-022-Präzedenzfall) nachgezogen werden sollen.
4. Kein authentifizierter Live-Klick-Test möglich (s.o.) — sollte ein Mensch
   mit echtem Login die vier A-Bugs, das SSE-Log-Streaming und die
   Hierarchie-Widgets vor dem Merge im Browser bestätigen?
5. `AssignToProjectPicker` ist rein kosmetisch (kein Persistenz-Pfad) — falls
   der Operator eine echte Zuordnung will, braucht es eine neue Backend-Route
   (z. B. `POST /api/discovery/{id}/assign`); das ist expliziter
   Out-of-Scope-Fund, kein Bug in meiner Umsetzung.

### Branch

`worktree-agent-a6b1d865e6334bcb9` (siehe Abweichung 4). Commits: siehe
`git log` auf diesem Branch — dieser Report wird im selben Commit wie die
letzten Code-Änderungen committet.
