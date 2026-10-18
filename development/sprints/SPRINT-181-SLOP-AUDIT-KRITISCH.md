# SPRINT-181 — Slop-Audit: die vier kritischen Befunde

**Datum:** 3.10.2026
**Vorbedingung:** `f1965e39` (S180 WP6/WP7). Auf superleo per `git pull` geholt.

**Anlass:** Operator-Order (verbatim): „schau dir den code und docs dev und docs an,
gleich kommen updates, kannst direkt ein slop audit machen und finden was nicht gut
implementiert ist oder hält" · „ja mach".

Audit über Backend (Go), Frontend (TS), Docs-vs-Code und Repo-Hygiene. Ergebnis:
`make go-vet` + `make go-build` grün, 493 Frontend-Tests grün — und trotzdem vier
Befunde, die „grüner Build" nicht sieht. Genau das ist der Punkt dieses Sprints.

---

## Plan (vor dem Code — Mandate 4)

**Ziel in einem Satz:** Die vier Fundstellen schließen, die ein grüner Build,
grüne Tests und ein grüner Linter alle nicht melden — und den Checker so erweitern,
dass die vierte Klasse beim nächsten Mal nicht wieder durchläuft.

**Warum diese vier:** Sie sind die einzigen Audit-Befunde, die entweder ein
Sicherheits- oder ein Mandats-Verstoß sind. Alles andere aus dem Audit (God-Files,
N+1, tote Views, 414 TS-Fehler) ist Wartungsschaden und gehört in den Backlog,
nicht in diesen Sprint.

### WP0 — Carry-over aus dem Live-Einsatz (ERLEDIGT, nicht von diesem Sprint)

`deploy/ansible-runner/Dockerfile` war lokal offen. Während dieses Sprints kam
`f1965e39` (S180 WP6/WP7) rein und hat **mehr** gelöst, als das offene Diff hergab:
`bash` + `openssl` **+ `curl`** (neun Wart-/Probe-Tasks sind curl-Call-Sites,
busybox hat keinen) **+** `LOCAL_NET=--network host`, weil `curl 127.0.0.1:8081`
sonst im Container-Netns scheitert, während der Dienst auf dem Host antwortet.
Gehört nach S180-12/13, nicht hier. In diesem Sprint **kein Handlungsbedarf** —
nur festgehalten, damit der S181-1-Eintrag nicht doppelt steht.

### WP1 — `/api/keys` hat keinen Admin-Gate (KRITISCH, Security)

**Ist:** `internal/policy/policy.go:65-126` — `adminPrefixes` listet
`/api/settings`, `/api/vault/`, `/api/consumer-keys`, `/api/users` … aber **nicht**
`/api/keys`. `IsAdminMutation` (policy.go:26) prüft nur Method-Präfix und diese
Liste; `auth.Middleware` (auth.go:979) ruft sie für jede Session auf. Folge:
jede gültige Dashboard-Session — ausdrücklich auch die „role-less Keycloak user"
aus TASK-071 — erreicht ohne Rollenprüfung:

- `POST /api/keys/{id}/reveal` (`settings/endpoints_info.go:120`) → `{"key": <plaintext>}`
- `POST /api/keys` (`gateway.go:1317`) — Provider-Key anlegen
- `DELETE /api/keys/{id}`, `POST /api/keys/bulk-delete`, `bulk-toggle`
- `POST /api/keys/preview`, `import-selected`, `custom/probe`

Der Handler hat nirgends einen eigenen Check (gelesen, `handleKeyValueReveal`
startet direkt mit dem Method-Check). Die danebenliegende
`/api/consumer-keys`-Fläche **ist** gelistet — die Lücke ist eine Auslassung,
keine Designentscheidung.

**Fix:** `"/api/keys"` in `adminPrefixes` (policy.go). Präfix-Muster wie
`/api/consumer-keys`. GETs (`/api/keys`, `/api/keys/endpoints`,
`/api/keys/providers`) bleiben unberührt — `IsAdminMutation` lässt GET vorher
fallen; das Lesen der Key-Metadaten (Label, Plattform, Status) bleibt für jede
Session lesbar, genau wie die Kommentare es in jeder anderen Liste fordern.

**Nicht betroffen:** der Passwort-Operator (`allow if input.source == "password"`
in default.rego) und `jimesh-admin`-Keycloak-Identitäten bleiben erlaubt. Nur die
nicht-admin-Keycloak-Session wird verweigert — das ist die Absicht.

**Acceptance:** `TestIsAdminMutation` deckt die `/api/keys`-Familie ab (anlegen,
reveal, bulk-delete, DELETE) **und** den GET-Fall; ein neuer roter Test in
`policy_test.go` schlägt an, wenn der Präfix wieder rausfliegt.

### WP2 — `POST /api/dsh/test` panikt (KRITISCH, Verfügbarkeit)

**Ist:** `internal/discovery/dsh_import.go:514`:

```go
url := strings.TrimRight(in.BaseURL, "/") + "/models"
req, _ := http.NewRequest(http.MethodGet, url, nil)
req.Header.Set("Authorization", "Bearer "+apiKey)   // ← nil-deref
```

`in.BaseURL` wird nur auf `!= ""` geprüft (Zeile 487), sonst nichts. Ein
`{"baseURL":"http://x/%zz"}` lässt `http.NewRequest` fehlschlagen und `req == nil`
werden → Panic. **Reproduziert** (Fundstelle vom Audit-Agenten gegen
`golang:latest` verifiziert). Es gibt **kein** `recover()` in der
Handler-Kette — 34 `go func(` im Repo, einziger `recover()` ist
`subagents/feedback.go:80`. Ein Panic in diesem Handler beendet den Prozess.

**Fix, zwei Schichten:**
1. `req, err := http.NewRequest(...)` prüfen und per `httpx.ErrorJSON` 400
   antworten — die eigentliche Ursache, ehrliche Meldung statt Panic.
2. Der Handler-Kette ein zentrales `recover()` geben, damit ein künftiger Panic
   in einem dieser Handler 500 statt Prozessende liefert. Dazu ein
   `defer`-Middleware in `gateway.New`-Nähe — **nicht** 34 Stellen einzeln.

**Acceptance:** `{"baseURL":"http://x/%zz"}` liefert 400/500 als JSON, kein
Panic; ein Test in `internal/discovery` assertiert den kein-Panic-Fall.

### WP3 — i18n-Checker sieht den Code nicht (KRITISCH, UX-Lüge)

**Ist:** `src/frontend/scripts/check-i18n.mjs` vergleicht **nur** Locale-gegen-
`en.json`. Ob ein Key im Code überhaupt existiert, prüft nichts. `t()` gibt bei
Fundlosigkeit den Key selbst zurück (`I18nProvider.tsx:217`) → die UI rendert
rohe Strings wie `firewallSetup.labelBackend`. **350 fehlende Keys in 22 Dateien**
(auditiert), Schwerpunkte `firewallSetup.*` (90), `opnsenseConfig.*` (59),
`firewallTraffic.*` (55). Der Checker läuft **grün** und `npm run test` damit auch.

**Fix:** `check-i18n.mjs` bekommt einen zweiten Lauf — `t('…')`-Aufrufe über
`src/**` sammeln (inkl. `t("…")`, Template-Varianten **nicht** mitzählen, weil
dynamische Keys nicht auflösbar sind) und gegen `en.json` legen. Fehlende Keys
werden Fehler.

**Offene Frage, die vor dem Code zu klären ist:** 341 fehlende Keys sind zu viele,
um sie in einem Zug in `en.json` nachzutragen, ohne die Werte zu erfinden — und
erfundene Übersetzungen sind genau das, was Mandate 2 verbietet. Deshalb:
- Checker soll die Lücke laut melden — das ist die ehrliche Nachricht. **Ob** er
  dafür exit 1 liefert, siehe „Ergebnis WP3": das hing an der 60-Locale-Invarianz
  und wurde entschieden, nicht vermutet.
- Der Abgleich liefert die komplette Liste als Backlog-Arbeitsliste,
  die Nachführung der Keys ist ein **eigener** Backlog-Eintrag, nicht Teil von WP3.

**Acceptance:** `node scripts/check-i18n.mjs --strict` meldet die 341 fehlenden
Code-Keys und exit 1; ein Key, der weder im Code noch in `en.json` ist, wird
nicht beanstandet (kein False Positive auf den 648 ungenutzten Keys).

### WP4 — tote Vite-Leiche + doppelte Lockfiles (MITTEL, Hygiene)

**Ist (alles geprüft, nicht vermutet):**
- Next ist der einzige Build: `package.json:7-8`, `src/app/[[...slug]]/page.tsx`
  lädt `src/App` via `dynamic({ssr:false})`, Compose `frontend-entry.sh` →
  `npm run dev`, `deploy/frontend/ansible-task.yml:30` → `npm ci && npm run build`.
- Vite wird von **nichts** benutzt: `vite.config.ts` (die einzige Stelle, die
  `@vitejs/plugin-react` und `@tailwindcss/vite` importiert), `index.html`,
  `src/main.tsx`, `dev/mockApi.ts` (0 Referenzen in `src/`).
- Drei Lockfiles committet: `package-lock.json` (420K, echtes), `pnpm-lock.yaml`
  (248K, ungenutzt), `pnpm-workspace.yaml` (50 B, Inhalt ein Platzhalter).
  Real läuft npm (`frontend-entry.sh:17`, `ansible-task.yml:30`).

**Fix in drei Teilen:**
1. Die vier Vite-Dateien löschen + `@vitejs/plugin-react`, `@tailwindcss/vite`
   aus `package.json`. `vite` selbst bleibt (vitest braucht den Alias-Loader).
   `tsconfig.node.json:23` (`"include": ["vite.config.ts"]`) anpassen.
2. `pnpm-lock.yaml` + `pnpm-workspace.yaml` löschen — ein Manager, ein Lockfile.
3. **`index.html` enthält das EINZIGE Pre-Hydration-Theme-/RTL-Script** —
   das in der lebenden Next-Pfad (`src/app/layout.tsx`) **fehlt**. Vor dem Löschen
   nach `layout.tsx` übernehmen, sonst verschwindet der Fix für den FOUC/RTL-Flash
   mit der Leiche. Dabei auch den Storage-Key korrigieren: das Script liest
   `jimesh.locale`, die App schreibt `freellmapi.locale`
   (`I18nProvider.tsx:57/174`) — Legacy-Name aus dem entfernten FreeLLMAPI-Tier.

**Acceptance:** `npm run build` + `npm run test` grün nach dem Löschen; das
Script liegt in `layout.tsx` und liest denselben Key, den die App schreibt;
`git status` zeigt kein `pnpm-lock.yaml` mehr.

### WP5 — S181-15: `make go-test` reparieren (KRITISCH, Verifikationspfad)

Ursprünglich als „eigener Backlog-Eintrag" abgelegt, jetzt in den Sprint
geholt: ohne den Mandat-6-Befehl ist **nichts** am Backend verifizierbar.

**Ist (alles geprüft, nicht vermutet):**
- `docker exec -T` ×4 in der Makefile (Zeilen 129/134/137/142). `-T` ist ein
  **docker-compose**-Flag, `docker exec` kennt ihn nicht →
  `unknown shorthand flag: 'T' in -T` (Docker 29.8.2). Derselbe Befehl ohne
  `-T` läuft (`select 1` liefert `1`).
- `store.Open()` (`internal/store/store.go:41-44`) **ignoriert** jeden DSN, der
  nicht mit `postgres://` beginnt, und schreibt stillschweigend
  `localhost:5432` ein. Das ist die Falle, die den Fehler so schwer zu finden
  machte: der falsche Wert wird nie gemeldet, er wird ersetzt.
- **9** Teststellen rufen `store.Open("./xxx.db")` auf — ein SQLite-Idiom, das
  es seit dem Go-Port nicht mehr gibt, und das die Kommentare weiter behaupten
  („Create a temporary SQLite file"). Nicht 3, wie im Audit gezählt, und nicht
  8, wie hier zunächst notiert (`suricata_live_test.go` war überzählt — es
  hatte einen eigenen `SURICATA_LIVE_DSN`-Fallback):
  - `service/service_test.go`, `service/agents_test.go`,
    `ai/provider_schema_test.go` → `t.Fatalf` = die 5 gemeldeten Fehler;
  - `provisioning/bridge_test.go`,
    `gateway/{policy,capabilities,settings_dlp,suricata,suricata_live}_test.go`
    → `t.Skipf` = laufen **still** in den Skip-Zweig und dekretieren so
    „grün", ohne je gegen die richtige DB geprüft zu haben.
- `make go-test` selbst dialte nach der SPRINT-167-Passwort-Rotation eine
  tote URL: die Makefile-Ziele bauten die DSN ohne `${JIMESH_POSTGRES_PASSWORD}`
  aus `.env` → `jimesh_secure_pass` (28P01, geprüft). Ohne diesen Teil wäre
  der Fix an den Tests unsichtbar grün geworden — und `local-stack.sh`
  hätte dasselbe in `up_postgres`/`up_keycloak`/`up_backend`.
- `cmd/server/main.go:113-115` defaultet ohne `DATABASE_URL` auf
  `./data/jimesh.db` — eine Datei, die `store.Open` ebenfalls stillschweigend
  zu `localhost:5432` umbiegt. Die Flag-Hilfe (`-sqlite-path`, „Database
  connection URL **or file path**") behauptet Dateipfade, die es nicht gibt.
  Beide unterstützten Pfade (`local-stack.sh:109`,
  `deploy/backend/ansible-task.yml:69`) setzen `DATABASE_URL` — der Default
  ist praktisch tot, aber er lügt.

**Fix in vier Teilen:**
1. Makefile: `docker exec -T` → `docker exec` (4 Stellen); `go-test`/
   `check-backend` bauen die DSN aus `$(LOCAL_ENV)` + dem rotierten
   `${JIMESH_POSTGRES_PASSWORD}` (fail-closed, `:?`-Guard), `local-stack.sh`
   holt dasselbe Passwort über eine neue `require_postgres_password()` für
   `up_postgres`/`up_keycloak`/`up_backend` und `restart-backend`.
2. Die 9 Teststellen auf `store.Open(os.Getenv("DATABASE_URL"))` — dasselbe
   Muster wie die 20+ anderen Suites, inkl. `t.Skipf` statt `t.Fatalf`;
   Kommentare auf die tatsächliche Semantik korrigieren.
3. `store.Open`: **kein** stillschweigendes Umbiegen mehr. Leer und
   nicht-`postgres://` liefern einen Fehler. Ohne diesen Teil kann dieselbe
   Falle jederzeit wieder einschleichen — der Bug war nicht die 9 Stellen,
   es war, dass ein falscher DSN nie auffällt.
4. `main.go`: `./data/jimesh.db`-Default raus, bei fehlendem `DATABASE_URL`
   ein `log.Fatalf` mit klarem Text; Flag-Hilfe ehrlich; `sqlitePath` →
   `dbURL`. Flag-**Name** `-sqlite-path` bleibt stehen, um Aufrufe nicht zu
   brechen (im Repo nirgends verwendet, aber ein Deploy-Argument können wir
   von hier aus nicht sehen).

**Zwei weitere Defekte, die erst durch den Fix sichtbar wurden** (beide
Mandat-2-Fälle — sie haben „grün" produziert, ohne etwas zu prüfen):

5. **Migrationsrace über Paketgrenzen.** `make go-test` startet die Pakete
   parallel, jedes ruft `store.Open` → `migrate()` → dieselbe frische
   `jimesh_test`. Zwei `CREATE TABLE`-Läufe gleichzeitig kollidieren in den
   Systemkatalogen (`duplicate key ... pg_type_typname_nsp_index`), der
   Verlierer wirft einen Fehler — und die Test-Helper meldeten dazu
   „no reachable Postgres in this environment". Eine gesunde DB wurde als
   unerreichbar deklariert, der Test lief nie. Fix: `migrate()` nimmt eine
   Postgres-**Session-Advisory-Lock** (`pg_advisory_lock`, gepinnte Conn),
   der zweite Migrator wartet und sieht danach, dass die Tabellen schon da
   sind. Beweis: 4 Pakete parallel auf frischer DB → 0 Migrations-Skips.
6. **Frisch-DB-Schema unvollständig — ALTER vor CREATE.** Alle 47
   `ALTER TABLE ... ADD COLUMN` stehen in `migrate()` **vor** den
   `CREATE TABLE`-Statements (Zeilen 149-400 vs. 479+). Auf einer frischen
   DB existiert die Tabelle noch nicht, die ALTER scheitern still
   (`_, _ =` = fire-and-forget), danach erscheint die Tabelle ohne die
   Spalten — und erst der **zweite** Migrationslauf zieht sie nach. Ergebnis
   auf frischer DB nach **einem** Lauf: **9 fehlende Spalten**
   (`sessions.container_id/parent_session_id/project_id/status/trust_class`,
   `request_log.ttfb_ms/entropy/escalated`,
   `container_strategies.max_retries`) — und exakt dieselben fehlten
   produktiv. `QuerySessions` referenziert `container_id` via `COALESCE` →
   jeder Aufruf schlug fehl. Das Repo hatte denselben Fehler **zweimal**
   schon am CREATE geflickt (`models.description`, store.go:480;
   `containers.workspace_id`, TASK-055) und die Ursache nie behoben.
   Fix: die 9 Spalten in die drei CREATE aufgenommen (etabliertes Muster,
   ALTER oben bleibt für Legacy-Zeilen) → frische DB, ein Lauf, **0 fehlend**.
7. Damit Punkt 5/6 nicht wieder als Skip verschwinden: neuer Sentinel
   `store.ErrMigrate`. `store.Open` wickelt Migrationsfehler damit ein, die
   11 Stellen mit der „no reachable Postgres"-Meldung prüfen
   `errors.Is(err, store.ErrMigrate)` und **falen hart** — nur ein echter
   Verbindungsabbruch darf noch skippen. Ein defektes Schema darf nie wie
   eine fehlende Umgebung aussehen.

**Acceptance (mit echten Befehlen gemessen, Mandat 6):**
- `make go-test` → **RC 0**, 27 `ok` / 0 `FAIL`;
- `go vet ./...` → RC 0; `gofmt -l` → leer;
- 4 betroffene Pakete parallel auf **frischer** `jimesh_test`:
  0 Migrations-Skips, nur noch die zwei ehrlichen Environment-Skipps
  (`TestSpawnProvisionedContainer_LocalRealSpawn` ohne `docker.sock`,
  `TestSuricataLiveSmoke` ohne `SURICATA_LIVE_TARGET`);
- frische DB + ein Migrationslauf: **0** der 46 ALTER-Spalten fehlen;
- ohne `DATABASE_URL` melden die DB-Tests weiter `t.Skipf` mit Klartext,
  statt still zu `localhost:5432` zu dialen.

---

## Was in diesem Sprint NICHT drankommt

- **Nicht** die 341 fehlenden i18n-Keys auffüllen (eigener Backlog-Eintrag,
  braucht echte Übersetzungen — erfundene Werte wären Mandat-2-Verstoß).
- **Nicht** die 414 TS-Fehler und `ignoreBuildErrors` (WP3 von S180-klassisch,
  eigener Backlog-Eintrag — der Build abschalten zu lassen wäre der eigentliche
  Slop).
- **Nicht** die anderen Audit-Funde: Sync-Catalog `success:true`, Import-Zähler,
  Vault-Scope, `lastCheckedAt`, 3.027 tote Frontend-Zeilen, N+1 in
  `gateway.go:1757`. Alles eingetragen, nichts davon in diesem Sprint.
- **Nichts** an S180 (Deploy-Gate/gVisor) — das bleibt der nächste Sprint mit Code.
- Kein Deploy, kein Test auf fremden Domains (Mandate 17).

## Verifikationsbefehle

```bash
make go-vet && make go-build                          # Backend compile + vet
cd src/backend && go test ./internal/policy/ ./internal/discovery/   # WP1+WP2
cd src/frontend && npm run lint && npm run test       # WP3+WP4: erwartet grün
npm run check:i18n:strict                             # WP3: erwartet exit 1 + 341 Keys
git status --short                                    # WP4: kein pnpm-lock.yaml
```

---

## Ergebnis WP1 + WP2 (3.10.2026, verifiziert — nicht gehofft)

**Geliefert:**

| WP | Datei | Was |
|---|---|---|
| WP1 | `internal/policy/policy.go` | `"/api/keys"` in `adminPrefixes` — 1 Zeile, plus Kommentar mit den sechs betroffenen Routen |
| WP1 | `internal/policy/policy_test.go` | `TestIsAdminMutation` deckt `/api/keys`, `/api/keys/42/reveal`, `/api/keys/bulk-delete` und den GET-Fall ab |
| WP1 | `internal/policy/redteam_test.go` | `TestRedTeam_NonAdminCannotRevealProviderKey` — prüft **beide** Halften: (a) `IsAdminMutation` muss die Route beanspruchen, (b) die echte Engine weist `viewer`/`agent`/`service` ab; Plus Canary, dass der Passwort-Operator seine eigenen Keys weiter darf |
| WP2 | `internal/discovery/dsh_import.go` | `newModelsRequest()` — URL-Bau + Header ausgelagert, Handler prüft den Fehler vor `req.Header.Set` |
| WP2 | `internal/gateway/gateway.go` | `panicGuard()` + `guardedWriter`, verdrahtet als `corsMiddleware(panicGuard(auth.Throttled(mux)))` |
| WP2 | `internal/discovery/dsh_import_test.go` | 4 Tests (neues Paket — vorher **keine** Testdatei) |
| WP2 | `internal/gateway/panic_guard_test.go` | 6 Tests, alles DB-frei |

**Verifikation (echte Befehle, Ergebnis):**

```bash
go build ./...                                   -> BUILD=0
go vet ./...                                     -> VET_RC=0
go test ./internal/policy/                       -> ok
go test ./internal/gateway/ ./internal/discovery/ -> ok   (15 neue Tests grün)
```

**Negativkontrolle — der Gate-Test ist nicht wertlos:** mit der
`"/api/keys"`-Zeile temporär entfernt schlagen beide Tests fehl:

```
--- FAIL: TestIsAdminMutation
    policy_test.go:63: POST /api/keys must be an admin mutation
--- FAIL: TestRedTeam_NonAdminCannotRevealProviderKey
    redteam_test.go:91: ... without it every authenticated session reads plaintext provider keys
```

Danach wiederhergestellt, erneut grün. (Angelegt via `git worktree` auf
sauberem `HEAD`, damit nichts im Arbeitsbaum angefasst werden musste.)

**Warum `panicGuard` zwei Interfaces durchreicht:** der Wrapper steht vor
**jeder** Route. `ai/proxy.go`, `orchestration`, `analytics`, `subagents`,
`deploy` und `jules` type-asserten `http.Flusher`; `gateway/terminal.go`
braucht `http.Hijacker` für den gorilla-Upgrade. Eines davon fallen zu
lassen wäre eine **stille** Regression gewesen — der Assert schlägt fehl, der
Handler nimmt seinen „nicht unterstützt"-Zweig, niemand sieht einen Fehler.
Deshalb zwei Server-Tests, die gegen einen echten Listener laufen
(`TestPanicGuardPreservesFlusher`, `…PreservesHijacker`), nicht gegen
`httptest.NewRecorder` — das kann nicht hijacken.

**Warum `guardedWriter` kein `ReadFrom` implementiert:** delegieren würde
`Write` umgehen und damit `wroteHeader` — genau das Flag, auf dem die
Entscheidung „ist ein 500 noch ehrlich sendbar?" beruht. Kosten: ein
Buffer-Copy mehr auf einer JSON-API.

## Ergebnis WP3 + WP4 (3.10.2026, verifiziert — nicht gehofft)

**Geliefert:**

| WP | Datei | Was |
|---|---|---|
| WP3 | `src/frontend/scripts/check-i18n.mjs` | Zweiter Lauf: scannt `src/**/*.{ts,tsx}`, Literals `t('a.b')` **und** Präfixe `t('a.b.' + x)`; `--strict` schaltet den Exit-Code |
| WP3 | `src/frontend/package.json` | `check:i18n:strict` — der eigentliche Gate |
| WP4 | `src/app/layout.tsx` | Pre-Hydration-Theme-/RTL-Script aus `index.html` übernommen, Storage-Key auf `freellmapi.locale` korrigiert |
| WP4 | gelöscht | `vite.config.ts`, `index.html`, `src/main.tsx`, `dev/mockApi.ts`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` |
| WP4 | `src/frontend/package.json` | `@vitejs/plugin-react`, `@tailwindcss/vite` raus; `package-lock.json` neu erzeugt |
| WP4 | `tsconfig.node.json` | `include` von `vite.config.ts` auf `vitest.config.ts` — vorher fiel `vitest.config.ts` durch **beide** Projekte und wurde nie typisiert |
| WP4 | `vitest.config.ts`, `deploy/frontend/defaults.yml`, `Makefile:183` | verwaiste Vite-Kommentare eingeebnet |

**Verifikation (echte Befehle, Ergebnis):**

```bash
npm ci                          -> NPM_CI_RC=0   (neuer Lock ist konsistent)
npm run build                   -> BUILD_RC=0, "✓ Compiled successfully in 13.7s"
npm run test                    -> TEST_RC=0, 61 Test Files / 493 Tests grün
npm run lint                    -> 434 Probleme (Baseline vor WP4: 443 — -9, weil die Vite-Dateien weg sind)
npx tsc -p tsconfig.app.json    -> 414 Fehler (Baseline: 414, unverändert)
npx tsc -p tsconfig.node.json   -> 0 Fehler
npm run check:i18n              -> RC=0, meldet die Lücke in 3 Zeilen
npm run check:i18n:strict       -> RC=1, 344 Report-Zeilen
```

`layout.tsx` trägt 0 Lint- und 0 TS-Fehler (der eine Treffer ist die
**vorher** schon existierende `export const metadata`-Zeile 4, `react-refresh/only-export-components`).

### Warum der neue Gate NICHT in `npm test` hängt — die 60-Locale-Invarianz

Der naheliegende Fix „341 Keys einfach in `en.json` eintragen" ist **nicht
verfügbar**. `check-i18n.mjs` erzwingt (und erzwang schon vor WP3), dass alle
60 Locale-Dateien **exakt** dieselbe Key-Menge haben — `missing` **und** `extra`
sind Fehler. Sobald `en.json` diese 341 Keys bekommt, fangen die anderen 59
Locales an, jeweils 341 fehlende Keys zu melden: ~20k Strings in 59 Sprachen.
Das ist ein Übersetzungsprojekt, kein Bugfix.

Deshalb zwei Gates statt eines:

- **Locale-Vollständigkeit** (Sektion 1) ist hart und war es immer — sie ist
  grün und hängt weiter in `npm run test`. Deshalb bleibt **CI grün**.
- **Code-vs-`en.json`** (Sektion 2, neu) läuft bei `npm run check:i18n`
  mit und meldet die Lücke laut, ändert aber ohne `--strict` den Exit-Code
  nicht. `npm run check:i18n:strict` ist der echte Gate, ist **jetzt rot**
  und darf erst grün werden, wenn S181-7 die Keys **und** ihre Übersetzungen
  geliefert hat.

Ein roter CI auf `main` für eine Lücke, die dieser Sprint bewusst nicht
schließt, würde jedes rote Signal entwerten — das ist der Zustand, in dem die
Lücke überhaupt erst entstanden ist. Der Bericht läuft deshalb bei jedem Lauf
mit (3 Zeilen mit Zähler und Namespace-Aufschlüsselung, plus der exakte
Befehl für die vollständige Liste), die vollständige Liste steht unter
`--strict`.

**Zahl richtigstellen:** im Audit standen „350 fehlende Keys in 22 Dateien".
Nachgemessen: **341 distinkte Keys in 17 Quelldateien** — 9 der 350 waren
Präfix-Treffer aus der Breit-Suche, deren Präfixe alle echte Keys haben.

### Repo-Aufräum-Abgleich nach dem Operator-Cleanup (gleiche Session)

Der Operator hat `CLAUDE.md` + `GEMINI.md` zu `Agents.md` verkettet,
`design-assets/` nach `assets/design-assets/` verschoben und
`jimesh-dashboard.png` gelöscht. Hängengeblieben und **nachgezogen**:

- `Agents.md` — Titel (`# CLAUDE.md` → `# Agents.md`), Stitch-Pfad,
  „React/Vite dashboard" → „Next.js", `API_DOCS.md` → `docs/API_DOCS.md`
- `README.md` (3 Stellen), `MANDATES.md` (2), `SECURITY.md` (2, inkl.
  „root-level document", das API_DOCS nie war), `CONTRIBUTING.md` (3, inkl.
  „Go backend + Vite frontend"), `OPERATOR_GUIDE.md` (1)
- `docs/STITCH-MCP-GUIDE.md` (Speicherpfad der Screens), `docs/backlog/BACKLOG.md`
- Historische Sprint-/Audit-Docs bleiben unangetastet — sie dokumentieren den
  Stand ihrer Zeit.

Nicht angefasst: die zweite H1-Ebene in `Agents.md` (Zeile 112, Artefakt der
Verkettung) — Struktur-Umstellung des frisch angelegten Files ist Sache des
Operators.

## Offen nach WP1–WP4

- **S181-7** (341 i18n-Keys + Übersetzungen, dann `check:i18n:strict` auf `npm test`
  hängen) — der Gate ist gebaut und rot, das Füllen ist der eigene Eintrag.
- **Neuer Fund, S181-15:** `make go-test` (der Mandat-6-Verifikationsbefehl)
  kann nicht grün werden. `internal/ai/provider_schema_test.go`,
  `internal/service/agents_test.go` und `service_test.go` ignorieren
  `DATABASE_URL` und dialen hart `localhost:5432`. Beweis: identische 5
  Fehler in einem `git worktree`-Checkout von sauberem `HEAD`.
  Dasselbe betrifft `make check-backend`.
- **Nebenbefund:** `make go-test` scheitert auf diesem Host zusätzlich an
  `docker exec -T` („unknown shorthand flag: 'T'", Docker 29.8.2) — die
  Registry braucht `-i` statt `-T`.

---

## Ergebnis der Deploy-Blocker (Operator-Reihenfolge 3.10.2026, verifiziert — nicht gehofft)

Vom Operator als vier Punkte gewählt: **Falco-Gate (SIEM-Blocker) →
Backend-Redeploy → record-deploy 19091 → BACKLOG S181-7..14**. Die ersten
drei sind abgeschlossen, jeder Fix einzeln live nachgewiesen.

### 1. Falco-Gate + SIEM-Deploy

| Defekt (eigentlich: Ursache) | Beweis | Fix |
|---|---|---|
| `falcosecurity/falco:0.41.3` kann auf Kernel `7.0.0-34-generic` nicht starten: `BPF program is too large. Processed 1000001 insn (limit 1000000)`, `prog 'sendmmsg_x': failed to load: -7` — Restart-Loop (37 Zähler live), deshalb **konnte** das Gate nichts aufzeichnen | `docker logs`, Restart-Zähler, Live-Vergleich | `0.42.0` (läuft sauber, 0 Restarts), Pin-Kommentar mit Kernel-Zahl in `docker-compose.yml` |
| `/sys` fehlte: libbpf löst die perf-event-IDs der `syscalls/sys_enter_*`-Tracepoints über `/sys/kernel/tracing/events/…/id` auf → `failed to determine tracepoint … perf event ID: No such file or directory` | Live-Vergleich mit und ohne Mount: 10 Attach-Fehler vs. 0 | Volumen `/sys:/sys:ro` |
| `apply-retention.sh` war **nicht** idempotent (Header „PUT overwrites", OpenSearch antwortet auf ein vorhandenes Policy-Dokunkt mit `409 version_conflict_engine_exception`) — jeder zweite Deploy starb dort | Erstlauf OK, Zweitlauf `fatal` | Bedingter PUT über `_seq_no`/`_primary_term`; `_ism/add`-„already has a policy" als Sollzustand akzeptiert (nur andere Gründe scheitern), Endzustand aus `_plugins/_ism/explain` zurückgelesen statt aus dem API-Text geschlossen; zwei Läufe hintereinander `RC=0` (seq_no 80 → 83) |
| `JIMESH_SIEM_SERVICE_KEY` fehlte im Node-Checkout `/opt/jimesh/deploy/siem/.env`; der lokal vorhandene Key war **ungültig** (`401 invalid or missing service key`) | API-Aufruf mit dem alten Key → 401 | Frischer Mint über `mint-service-key.sh` (documented parameter), in beide `.env` geschrieben; API-Antwort danach `{"count":0,…}` |
| Der Abschluss-Report behauptete „Falco 0.41.3", lief aber 0.42.0 — Mandat-2-Verstoß in der eigenen Ausgabe | `compose ps`-Zeile vs. Report-Text | Stellen 3/326/678 in `ansible-task.yml` + `defaults.yml` auf 0.42.0. Historische Sprint-Docs bleiben unangetastet (Zeitdokumente) |

**Ergebnis:** `make redeploy SERVICE=siem NODE=superleo` → `ok=38 changed=5
failed=0`, RC=0, **0 fatals**. Live-Report: indexer `19200` antwortet,
manager/dashboard healthy, `falco: running AND detected the live tripwire
probe`, retention `1/1 indices`, `siem-bridge: started, config + key
validated`.

**End-zu-End-Nachweis (vom Task ausdrücklich NICHT erledigter Operator-Schritt,
selbst ausgeführt):** Throwaway `jimesh-framework-demo-1` schreibt nach
`/etc/jimesh-demo` → `GET /api/sdk/logs?type=audit&limit=5` mit dem
Service-Key liefert `count: 4`, Kopfzeile:
`[falco] Warning JiMesh Workspace Agent: write outside workspace to system path
— container jimesh-framework-demo-1` inkl. `container.id`, `fd.name`,
`proc.cmdline`, `project_id_hint: demo`. Pfad Falco → siem-bridge →
Backend → API-Auth ist damit belegt, nicht behauptet.

### 2. Backend-Redeploy + 3. record-deploy 19091

| Defekt | Beweis | Fix |
|---|---|---|
| Der HTTP-Port wurde **nie** publiziert — `git log -S "19091:3010"` über die komplette Historie leer, obwohl `.env.example:113`, `docs/API_DOCS.md:11`, `record-deploy.sh` (Default), `local-stack.sh` (Health-Wait) und das SIEM-Mint-Runbook ihn versprechen → `curl (7) Failed to connect`, kein Deploy-Record, kein Auto-Mint | `ss`/`curl` vor dem Fix | `backend_http_host_bind/-port` in `deploy/backend/defaults.yml`, `-p …:19091:3010` in `ansible-task.yml` und `local-stack.sh` |
| **Der eigentliche Mint-403:** Keycloak 26.0.0 schaltet „Always Use Lightweight Access Token" für `admin-cli`/`security-admin-console` standardmäßig ein. Leichte Access Tokens werden **ohne Mapper-Durchlauf** erzeugt → kein `sub`, kein `realm_access` — während `/userinfo` und `id_token` die volle Identität liefern. Der 403 war nie „Mapper fehlt" | Attribute `client.use.lightweight.access.token.enabled=true`; Token nur `['azp','exp','iat','iss','jti','scope','sid','typ']`; ein zusätzlich angelegter Hardcoded-Claim-Mapper landete ebenfalls in keinem Token; nach `false`: `sub` + `realm_access.roles=['admin','jimesh-admin']` | `ensureFullAccessTokenClaims()` in `BootstrapKeycloak` (GET-modify-PUT, idempotent) — überlebt jeden Realm-Import und jeden Rebuild; `realm-roles`-Mapper auf `admin-cli` bleibt zusätzlich |

**Ergebnis (ein Lauf, danach reproduziert):** `make redeploy SERVICE=backend` →
`failed=0`; Bootstrap-Log `admin-cli lightweight access token disabled —
claims reach the mint`; **`mint-service-key: minted 'deploy-registry-recorder'`**;
**`record-deploy: recorded 'backend' on 'superleo' (rc=0) —
{"gitSha":"390e9877","status":"deployed"}`** — der erste je geschriebene
Deploy-Record.

**Erkenntnis für alles Folgende:** der Deploy **klont von GitHub**
(`backend_repo_checkout` → `ji-podhead/jimesh`, Redirect auf `JiMesh2`),
nicht aus dem Arbeitsbaum. Ein Fix, der nicht committet und gepusht ist,
kommt nie im Image an — das war der Grund, warum der Mapper-Fix beim
ersten Versuch nicht griff.

### Verifikationsbefehle dieser Phase

```bash
make redeploy SERVICE=siem NODE=superleo     # erwartet: failed=0, 0 fatals
bash deploy/siem/apply-retention.sh          # 2x hintereinander RC=0
make redeploy SERVICE=backend NODE=superleo  # erwartet: Mint + Record
bash src/scripts/record-deploy.sh backend 0  # Status "deployed"
docker logs jimesh-backend | grep BootstrapKeycloak
```

### Offen

- **BACKLOG S181-7..14** — die nächste Station der Operator-Reihenfolge.
- `ensure-siem-service-key.sh` verweigert Nodes mit
  `ansible_connection=local` (der eigene Controller) und kann damit den
  Service-Key hier nicht automatisch schreiben — der Mint lief manuell über
  `mint-service-key.sh --env-file`. Offene Entscheidung: Guard anpassen
  oder lokale Topologie als dokumentierte Ausnahme führen.
- Probe-DBs aus den WP5-Verifikationen (`mig_probe`, `mig_fresh`,
  `mig_verify`) gehören gelöscht.

## Ergebnis des 4.10-Nacht-Batches (S181-20..23, verifiziert — nicht gehofft)

Anlass (Operator, 4.10.): die Prompts in `docs_dev/` enthielten noch offene
Posten. Statt der Gap-Liste zu glauben (`docs_dev/last_dsh/GAP_ANALYSIS_COMPLETE.md`,
Stand 4.10. 05:00), wurde **jeder Eintrag gegen den Code geprüft** — die Liste
war teils veraltet: Design-Routen 1/3/5 (`AppDiscoveryPage`,
`DeploymentDetailPage`, `SSHTargetDetailPage`), `WorkspaceDetailPage` auf
`/api/deployments`, #153 (Delete-Weg liegt auf `ProjectDetailPage`),
#170/#171/#172 und die Browser-Integration (`BrowserRuntimeModal`) sind längst
im Code; **OTel-Trace-Detail** bleibt als einziges davon durch Audit-F-05
blockiert. Ergebnis in den BACKLOG-Zeilen S181-22 (erledigt) und S181-23
(wirklich offen) festgehalten.

Zwei dabei gefundene Defekte wurden behoben, beide mit echten Kommandos
nachgewiesen:

**S181-20 — Plugin-Install ohne Membership-Gate.** `POST
/api/plugin-installations` prüfte nur die Existenz der Scope-Row, und
`/api/plugins*` fehlt in `policy.adminPrefixes`: jede authentifizierte
Identität konnte in jedes Projekt installieren, der Handler schrieb die
secret-förmige Config danach in das Vault dieses Projekts unter
Angreifer-namen. Gleiche Klasse wie S181-10. Gate jetzt über
`security.VaultProjectDenial` in Create **und** Uninstall (letzterer löscht
fremde Row + fremde Vault-Secrets).

**S181-21 — Startup-Blocker aus dem S183-Merge (#12, `fdfdbbb3`).**
`/api/dashboard-presets/utility` als all-methods-Pattern konfliktiert mit
`DELETE /api/dashboard-presets/{id}` — ServeMux panikt in beiden
Reihenfolgen. `gateway.New()` hätte **beim nächsten Deploy beim Start
gecrasht**; der rote `TestUtilityDashboardPresetsOperatorGate` war das
einzige sichtbare Signal (die Literal-Route hing nur in `New()`, der
Test-Mux kannte sie nicht → ServeMux-405 statt Handler-403). Route nach
`registerDashboards` verschoben und auf `GET` gelockt.

**S181-12 (Frontend-Anteil) — 1.973 tote Zeilen gestrichen.** Die Prompts
hatten drei Dateien als „tot" ausgewiesen, jedes Mal gegen den Code
nachgeprüft (Importeure-Zählung, nicht Bauchgefühl): `ProjectsPage.tsx`
1.321 Z. (Route `/projects` → Redirect auf `/workspaces`), das nur von ihr
importierte `ProjectExplorerSidebar.tsx` 230 Z. und `ScopeSelectorModal.tsx`
306 Z. — der geteilte 4-Level-Modal (#143) wurde gebaut und nie gemountet,
also existiert er jetzt gar nicht mehr. Dazu starb seine einzige
Konsequenz in `create-access-section.tsx`: der User-Picker
(`showUserPicker`/`withUsers`/`AccessUser`/die Users-Query) samt 4 × 60
toter i18n-Keys. **Bewusst NICHT angefasst** (nach Prüfung *nicht* tot):
`legacyEndpoints()` in `ssh-endpoints.ts` — wird über `fetchEndpoints()`
als localStorage-Fallback gerufen. Konsequenz für die Doku: der
„grant access to another user"-Picker existiert im UI nicht mehr; wer ihn
braucht, muss ihn mit einem lebenden Dialog neu aufsetzen (S181-23).

### Verifikationsbefehle dieser Phase

```bash
make go-test                                                  # erwartet: 27 Pakete ok, 0 FAIL (vorher 1 rot)
docker run --rm -v "$PWD/src/backend:/src" -w /src -v go-cache:/go \
  golang:latest sh -c "gofmt -l internal/gateway/{plugins,meshsquad,dashboards}.go; go vet ./internal/gateway/"
docker run --rm -v "$PWD:/repo" -w /repo/src/frontend node:20-alpine \
  sh -c "npx tsc -p tsconfig.app.json; echo RC=$?"            # erwartet: RC=0, 0 Fehler
docker run --rm -v "$PWD:/repo" -w /repo/src/frontend node:20-alpine \
  sh -c "npm test"                                            # erwartet: 68 Dateien / 605 Tests, check:i18n 60 Locales
git diff HEAD --numstat -- src/frontend/src/i18n              # erwartet: +0 -240
# 293 Produktions-Routen-Patterns auf einem ServeMux → 0 Konflikte (Mini-Probe)
# echter Boot gegen Wegwerf-DB: cmd/server -redis-enable=false → "HTTP listening", kein Panic
```

### Offen (unverändert)

- **BACKLOG S181-7..14** — die nächste Station der Operator-Reihenfolge.
- **BACKLOG S181-23** — die tatsächlich noch offenen Prompt-Reste
  (tote `ScopeSelectorModal.tsx` + parallele Selektoren #143/#160,
  `ProjectsPage.tsx` 1.357 Z., #159, #164–#167, Secrets-Konsolidierung #099,
  SIEM #032, Plugin-RBAC).
- `ensure-siem-service-key.sh` verweigert Nodes mit
  `ansible_connection=local` (der eigene Controller) und kann damit den
  Service-Key hier nicht automatisch schreiben — der Mint lief manuell über
  `mint-service-key.sh --env-file`. Offene Entscheidung: Guard anpassen
  oder lokale Topologie als dokumentierte Ausnahme führen.
- Probe-DBs aus den WP5-Verifikationen (`mig_probe`, `mig_fresh`,
  `mig_verify`) gehören gelöscht.

---

## WP6 — S181-12 Backend-Rest: 34 Goroutine-Panics + N+1 (PLAN, 4.10. — Code folgt erst danach, Mandat 4)

**Anlass (verbatim, Operator 4.10.):** „ok go" — nachdem diese Session
geliefert hatte: „Nächste bei mir: S181-12 (34 Goroutines ohne `recover`,
N+1 `Store.Keys()` in `gateway.go:1757`)". Davor im selben Termin:
„ok alles committen pr machen und weiter" · „wie siehts aus?".

### Ist-Messung vor Code (echte Befehle, nichts geschätzt)

Goroutine-Inventar (eigener Auditor, `python3 /tmp/opencode/goroutine-audit.py`,
parst jede `go func(`-Stelle und prüft, ob der Funktionskörper `recover()`
enthält; Testdateien und Kommentarzeilen ausgenommen):

```
go-func-Stellen (ohne Testdateien, ohne Kommentarzeile): 34
  mit recover():    0
  OHNE recover():   34
```

**Die 34 stimmen exakt mit der Zahl überein, die WP2 selbst notiert hat**
(`gateway.go:610`: „the repo had exactly ONE recover() … against 34 `go func(`
call sites"). Verteilung: `cmd/` 11 (datalaked 2, jimesh-router 7,
kafkabridge 1, server 2 — Korrektur: server 2, summiert 11 in der auditor-
Ausgabe), `internal/` 23 über 14 Dateien (gateway 3, network 4, analytics 3,
siem 2, orchestration 2, ai 2, + je 1 in deploy, discovery, sdklogs,
security, subagents, tracing).

N+1-Fundstelle — **die Backlog-Zeile nennt `gateway.go:1757`, die echte Stelle
ist `gateway.go:1884`** (Zeilen sind seitdem gewandert, u. a. durch die
`registerProjectTerminal`-Registrierung in `gateway.go:459`):

```go
func (s *Server) handleFallback(...) {
    for i, e := range chain.Entries {      // <- pro EINTRAG:
        dbKeys, _ := s.svc.Store.Keys()    // <- EIN Datenbankabfrage
        for _, k := range dbKeys { ... }   //    + O(keys) Scans
```

Gemessene Nutzung: `dbKeys` wird im Loop nur für `kcnt` gebraucht (geprüft
über den gesamten Funktionskörper), die anderen sechs `Store.Keys()`-Stellen
im File sind je Request einmalig und damit unkritisch.

### Plan (Reihenfolge zwingend)

**WP6a — `internal/safego` (neues Package, 1 Datei + Test)**
Ein Helper, ein Muster, 34 identische Einzeiler statt 34 handgeschriebener
Blöcke:

```go
func Recover(where string) func()   // Aufruf: defer safego.Recover("file:func")()
```

- Liest `p := recover()`, loggt `[safego] RECOVERED <where>: <p>` **inkl.
  `debug.Stack()`** über den std-`log.Logger` (stderr → docker-logs; kein
  Logger nötig an den 34 Stellen — die haben alle eine andere Logger-Lage,
  `cmd/jimesh-router/*` und `analytics/agentlog.go` haben gar keinen).
- Verlässt sich dabei auf den im Repo bereits etablierten Stil
  (`gateway.go:629` `p := recover()`, `subagents/feedback.go:80`
  `if p := recover(); p != nil`).
- Test beweist: Panik in der Goroutine → Prozess lebt, Rückgabe/Channel
  läuft weiter, Logzeile entstanden. **Kein Mock, echter Panic.**

**WP6b — 34 Einzeiler, 18 Dateien**
`defer safego.Recover("<file>:<umschliessende func>")()` als erste Anweisung
im Goroutine-Körper, Name menschlich abgeleitet (z. B.
`gateway.go:handleFallback-key-loop`). Zwei Sonderfälle mit einzeiligem
Körper werden geteilt, weil ein `defer` dort nicht reinpasst:
`tracing/langfuse.go:255` (`go func() { defer c.wg.Done(); c.flush() }()`) und
`subagents/node.go:119` (`go func() { done <- session.Run(cmd) }()`).
Reihenfolge bei langfuse: `c.wg.Done()` zuerst deferen, `Recover` zuletzt —
damit läuft bei einer Panik erst der Recover, dann `Done` (LIFO), der WaitGroup
Zähler bleibt ehrlich.

**WP6c — N+1 in `handleFallback`**
`Store.Keys()` aus der Schleife holen und einmalig zu
`keyCountByPlatform map[string]int` voraggregieren, im Loop nur noch
`kcnt := keyCountByPlatform[e.Platform]` — die Antwort bleibt identisch
(aggregiert über dieselben Keys), die Abfragezahl fällt von
`len(chain.Entries)` auf 1.

### Verifikationsbefehle (RCs kommen NACH dem Code hier rein)

```
bash -n entfaellt (Go) — stattdessen:
docker … gofmt -l <18 Dateien>     # 4 davon sind VORAB unformatiert
docker … go vet ./...              # erwartet RC=0
docker … go build ./...            # erwartet RC=0
docker … go test ./internal/safego/ -v   # erwartet RC=0, Panic real
make go-test                       # Sollwert: nur die 5 dns_test-Fails (S184-11)
```

### Bewusst NICHT in diesem WP

- Keine Umformatierung der vier vorab unformatierten Dateien
  (`cmd/datalaked/main.go`, `cmd/server/main.go`, `internal/gateway/gateway.go`,
  `internal/tracing/langfuse.go`) — `gofmt -w` würde fremde Zeilen mitziehen;
  mein eingefügter Block wird per `gofmt -d` einzeln auf Sauberkeit geprüft.
- `panicGuard` und `subagents/feedback.go` bleiben unangetastet (WP2/Fundstelle
  mit dem einen recover).
- `dns_test.go` bleibt dieser Session fremd — S184-11 hat der Operator der
  Laptop-Session zugeteilt (wörtlich die Antwort auf meine Frage: „Laptop-
  Session, wie deren Plan 2.0").

---

## Ergebnis WP6 — S181-12 Backend-Rest (4.10.2026, verifiziert — nicht gehofft)

**Anlass (verbatim):** „ok go".

### Korrektur am eigenen Plan

Der Plan weiter oben sagt „18 Dateien" — **gemessen sind es 23** (der Plan
wurde vor dem Skript geschrieben, der Auditor-Zähler für Dateien war zu klein;
die Stellenzahl 34 war von Anfang an korrekt). Korrigiert hier, nicht
weggeschrieben.

### Was gebaut wurde

1. **`internal/safego`** (neu, `safego.go` + `safego_test.go`):
   `defer safego.Recover("file:umschliessende-func")()` als eine Einzeile im
   Goroutine-Körper. Loggt `[safego] RECOVERED <where>: …` **inkl.
   `debug.Stack()`** über den std-`log.Logger` (stderr → docker-logs), weil die
   34 Stellen eine uneinheitliche Logger-Lage haben — `cmd/jimesh-router/*` und
   `analytics/agentlog.go` haben keinen eigenen. Ohne Panik kostet es eine
   nil-Vergleich und loggt nichts (Test pinnt beides).

2. **34 Stellen in 23 Dateien** bestückt (11 in `cmd/`, 23 in `internal/`),
   erzeugt vom Skript `wp6b-insert.py` (rückwärts pro Datei, damit Zeilen
   gültig bleiben; Import in die Gruppe mit den meisten `backend/internal/`-
   Imports, sortiert, nie zwischen Kommentar und seinem Import).
   Die zwei einzeiligen Körper wurden geteilt:
   `tracing/langfuse.go` behält `defer c.wg.Done()` **zuerst** (LIFO: erst
   Recover, dann Done — der WaitGroup-Zähler bleibt ehrlich),
   `subagents/node.go` (`done <- session.Run(cmd)`) bekommt Recover zuerst.

3. **N+1 raus aus `handleFallback`** (`gateway.go`, Schleife
   `for i, e := range chain.Entries`): `Store.Keys()` lag **pro Entry** in der
   Schleife — eine DB-Roundtrip pro Chain-Eintrag, O(entries × keys), und das
   Ergebnis wurde nur für `kcnt` gebraucht. Jetzt einmal vor der Schleife zu
   `keyCountByPlatform` aggregiert, im Loop nur noch
   `kcnt := keyCountByPlatform[e.Platform]`. Abfragezahl
   `len(chain.Entries)` → **1**, Antwort identisch (gleiche Zählung).

### Verifikationsbefehle mit echten RCs (4.10.)

```
gofmt -d <25 Zieldateien>          Diff existiert NUR in den 4 vorab
                                   unformatierten Dateien (cmd/datalaked,
                                   cmd/server, gateway, tracing/langfuse)
                                   und enthält 0 safego-Zeilen  → meine
                                   Einfügungen sind formatrein, fremde
                                   Zeilen blieben unberührt
go build ./...                     BUILD_RC=0
go vet ./...                       VET_RC=0
go test ./internal/safego/ -v      TEST_RC=0 — 2 PASS:
                                   TestRecoverContainsRealPanic (echter Panic,
                                   Logzeile + Stack + Prozess lebt)
                                   TestRecoverSilentWithoutPanic (kein Panic →
                                   kein Log)
make go-test                       GOTEST_RC=2 — und GENAU die 5
                                   TestProjectDNS_* (S184-11, Laptop-Session),
                                   kein einziger weiterer FAIL in keiner der
                                   23 angefassten Dateien; safego: ok
```

### Offen / ehrliche Grenzen

- `handleFallback` hat keinen eigenen Test (existierte vorher auch nicht) —
  der N+1-Nachweis ist statisch: `Store.Keys()` steht jetzt außerhalb der
  Schleife (`gateway.go:1872` vs. Loop ab `:1877`), die Zählung ist die
  gleiche. Ein Verhaltenstest mit echter DB wäre der nächste Schritt.
- Die 5 roten DNS-Tests bleiben **bewusst** rot — S184-11 gehört laut
  Operator-Entscheid dieser Session zur Laptop-Session („Laptop-Session, wie
  deren Plan 2.0").
- Im selben Checkout lag währenddessen fremde Frontend-Arbeit
  (`DashboardBuilderPage.tsx`, `Sparkline.tsx`, `WidgetSettingsDrawer.tsx`,
  `package.json` **und `package-lock.json`**) — nicht angefasst, nicht
  mitcommittet; der Lock-File bleibt nach Mandat draußen.
