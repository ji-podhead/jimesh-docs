# SPRINT-172 — IAC-SCANS-PAGE-CRASH (LIVE-BUGFIX, folgt auf S168)

**Status:** repo-seitig abgeschlossen & verifiziert (30.9.2026) — Arbeitslog + Verifikations-Transkript unten. Live-Bestätigung auf dem Trading-Node bleibt Operator-Redeploy (s. Offene Punkte 1).
**Attribution:** Plan + Code (WP1-WP4): Vorgänger-Agent (Absturz ohne Abschlussmeldung). Ist-Stands-Audit gegen den Plan, Verifikation + Doc-Vervollständigung: Fortsetzungs-Agent.
**Gemeldet von:** Operator, live auf dem Trading-Node, 30.9.2026 —
"Uncaught TypeError: P.map is not a function" auf `/security/scans/iac`.
Zweiter Crash derselben Klasse wie SPRINT-168 (threat-correlation null-crash).

---

## Plan (vor Code)

### Ziel

Die Crash-Klasse auf der IaC-Scans-Seite beidseitig beseitigen — exakt nach dem
bewährten S168-Muster (Wire-Contract "Listen sind nie null, höchstens leer" +
Frontend `Array.isArray`-Guards statt bloßer `?? []`):

- Backend: `GET /api/security/events` emitted HEUTE noch `"events": null`
  bei leerer Tabelle (verifiziert, s.u.) — normalisieren wie es
  `handleSecurityQuarantine` schon seit TASK-059 tut.
- Frontend: die `?? []`-Guards in SecurityScansPage.tsx decken nur
  null/undefined ab, NICHT Non-Array-Objekte — das ist exakt die Signatur des
  Live-Crashes ("P.map is not a function": P ist nicht null, sondern kein
  Array). Upgrade auf `Array.isArray` auf ALLEN Listenzugriffen der Seite.
- Beidseitige Regressionstests, die die Live-Crash-Klassen pinnen (null UND
  Non-Array).

### Live-Build-Einordnung (ehrlich, verifiziert)

Der Crash kam aus einem **minifizierten Next-Produktions-Bundle** auf dem Node.
Der Repo-Stand ist ein Vite-Bundle (`src/views/`-Routing, Mandat 7); die Seite
existiert im Git genau in EINER Form (Commit af66b6a0, TASK-064) — schon mit
`?? []`-Guards. Das exakte Live-Bundle lässt sich aus dem Repo NICHT
rekonstruieren (kann älter oder aus einem Worktree-Stand gebaut sein). Daraus
folgt: **Fix die ganze Klasse repo-seitig** (beide Richtungen der Abweichung:
null-Liste UND Objekt-wo-Array), Live-Bestätigung = Operator-Redeploy.

### Verifizierter Root Cause am Repo-Stand (Code-Lektüre)

1. `GET /api/security/events` — `internal/security/freeze.go:207-218`:
   `httpx.WriteJSON(w, map[string]any{"events": events})` **ohne**
   nil-Normalisierung; `store.ListSecurityEvents`
   (`internal/store/security_events.go:59-78`) gibt bei 0 Rows eine **nil-Slice**
   zurück (`var out []SecurityEventRow` + append) → Wire ist bei leerer
   `security_events`-Tabelle **HEUTE** `"events": null`. Das ist exakt die
   S168-Klasse; das Frontend-Interface deklariert den Fall sogar selbst
   (`events: SecurityEventRow[] | null`, SecurityScansPage.tsx:42).
2. `GET /api/security/quarantine` — `internal/security/quarantine.go:47-57`:
   normalisiert beide Listen bereits seit TASK-059 ("honest empty state, never
   null") — kein Fix nötig, wird durch den Frontend-Guard trotzdem mit
   abgesichert.
3. Frontend `src/frontend/src/views/SecurityScansPage.tsx`:
   - Zeile 118: `const all = res.events ?? []` → deckt null ab, aber ein
     **Non-Array-Objekt** landet in `all.filter(...)` (Zeile 119) →
     "P.filter is not a function".
   - Zeile 221: `quarantinedSessions = quarantine?.quarantined_sessions ?? []`
     → ein Non-Array-Objekt passiert `?? []` UND `quarantinedSessions.length
     === 0` (Zeile 237: `undefined === 0` → false) und crasht dann in
     `quarantinedSessions.map(...)` (Zeile 251) → **"P.map is not a function"**
     — die exakte Live-Signatur.
4. Verbraucher-Situation: das Panel iac + sast teilen sich den Hook
   `useSecurityEvents`; Sibling-Consumer `SecurityEventsPage.tsx:37`
   (`res.events ?? []`) ist NICHT in meiner Ownership — null-sicher heute,
   Array.isArray-Upgrade als Handoff vermerkt.

### Work Packages

| WP | Inhalt | Datei(en) |
|----|--------|-----------|
| WP1 | Backend: reine, testbare Funktion `securityEventsResponse(events)` — nil → `[]` vor dem WriteJSON; Wire-Contract "events nie null" | `src/backend/internal/security/freeze.go` (NUR handleSecurityEvents) |
| WP2 | Frontend: `Array.isArray`-Guards auf allen Listenzugriffen (Hook + iac-Page); Wire-Typen von `| null` auf den Vertrag straffen | `src/frontend/src/views/SecurityScansPage.tsx` |
| WP3 | Backend-Regressionstest: nil-Liste (0 Rows) marshallt als `"events":[]`, nie null; echte Rows überleben | NEU `src/backend/internal/security/security_events_wire_test.go` |
| WP4 | Frontend-Regressionstest (jsdom): null-Listen UND Non-Array-Objekte (P.map-Klasse) rendern ohne Crash + ehrliche Empty-States; echte Rows rendern beide Tabellen | NEU `src/frontend/src/views/SecurityScansPage.test.tsx` |
| WP5 | Verifikation + Transkript (Mandat 6) | dieses Doc |

### Acceptance Criteria

1. `GET /api/security/events` marshallt `"events":[…]` — nie `null`, auch bei
   leerer Tabelle (reiner json.Marshal-Test beweist es).
2. Die iac-Page überlebt `events: null`, `events: {}` (Non-Array),
   `quarantined_sessions: null` und `: {}` ohne TypeError und zeigt die
   ehrlichen Empty-States ("Nothing quarantined right now." /
   "No IaC findings recorded yet.").
3. `make go-build` + `make go-vet` Exit 0 (tree-weit transient rot durch
   S163-WIP möglich → dann gezielt + ehrlich attributieren).
4. tsc: 0 Fehler in meinen Dateien; Basis 414 durch mich nicht erhöht
   (S163s transienter +1-WIP kann auftauchen — dann fremd attributiert).
5. `npx vitest run` voll grün inkl. der neuen Tests; check-i18n PASS
   unverändert (keine neuen Keys).
6. Live-Bestätigung bleibt Operator-Schritt (Redeploy Frontend+Backend) —
   von mir NICHT als "live gefixt" behauptet.

### Ownership / Fremd-Abgrenzung

- Meins: SecurityScansPage.tsx (+ neuer Test), internal/security/freeze.go
  (nur handleSecurityEvents + neue reine Funktion), neuer Backend-Test, dieses Doc.
- `quarantine.go`: braucht KEINE Änderung (schon normalisiert) — nicht angefasst.
- FREMD, nicht anfassen: threat-correlation-Dateien (S168 committet),
  PluginInstallWizardDialog/meshsquad/plugins.go (S163 läuft — Kollision
  geprüft: meine Handler liegen in internal/security, nicht in gateway),
  SecurityEventsPage.tsx, API_DOCS.md, BACKLOG, locales.

---

## Arbeitslog (Datei:Zeile)

Plan + Code stammen vom Vorgänger-Agent (Absturz ohne Meldung). Der
Fortsetzungs-Agent hat den Ist-Stand Zeile für Zeile gegen den Plan geprüft
(alles gebaut, nichts Halbes, nichts kaputt — kein Nachbesserungs-Edit nötig),
die Verifikation gefahren und dieses Doc vervollständigt.

### WP1 — Backend: Events-Liste nie null (Mandat-15-Muster)

- `src/backend/internal/security/freeze.go:203-217` — NEU `securityEventsResponse()`:
  nil → `[]store.SecurityEventRow{}` unmittelbar vor dem Encode, mit Mandat-15-
  Kommentar (S168-Klasse; nil-Slice aus `internal/store/security_events.go:69`
  `var out []SecurityEventRow` + append).
- `src/backend/internal/security/freeze.go:233` — `handleSecurityEvents` ruft jetzt
  `httpx.WriteJSON(w, securityEventsResponse(events))` statt der rohen Slice.
- `internal/security/quarantine.go` — absichtlich UNVERÄNDERT (normalisiert beide
  Listen seit TASK-059; verifiziert am Ist-Stand, kein Fix nötig).

### WP2 — Frontend: Array.isArray auf ALLEN Listenzugriffen

- `src/frontend/src/views/SecurityScansPage.tsx:41-47` — Wire-Vertrags-Kommentar +
  `SecurityEventsResponse.events: SecurityEventRow[]` (vorher `| null`): der Typ
  folgt jetzt dem gestraften Vertrag, statt den Fehlerfall zu deklarieren.
- `src/frontend/src/views/SecurityScansPage.tsx:66-75` — `QuarantineResponse`:
  beide Listen ohne `| null` (normalisiert seit TASK-059).
- `src/frontend/src/views/SecurityScansPage.tsx:126-130` — Hook-Guard:
  `const all = Array.isArray(res.events) ? res.events : []` (vorher `?? []`) —
  deckt null UND das Non-Array-Objekt der Live-Crash-Klasse ab.
- `src/frontend/src/views/SecurityScansPage.tsx:233-240` — `quarantinedSessions =
  quarantine && Array.isArray(quarantine.quarantined_sessions) ? … : []` (vorher
  `?? []`): der exakte Live-Crash-Pfad — ein Objekt passierte `?? []` UND die
  `quarantinedSessions.length === 0`-Prüfung (`undefined === 0` → false) und
  crashte dann in `.map` (Z. 270).
- Vollständigkeits-Check aller Listenzugriffe der Datei: `SCAN_TABS.map` (Z. 95,
  Compile-Konstante), `all.filter` (Z. 131, Input durch Guard garantiert Array),
  `events.map` (Z. 162, State wird nur über den Guard gesetzt),
  `quarantinedSessions.length` (Z. 256) + `.map` (Z. 270, beide hinter dem Guard).
  `quarantined_workspaces` wird deklariert, aber nirgends gelesen/gemappt — kein
  Zugriff, kein Guard nötig. SAST teilt sich den gehärteten Hook; DAST ist statisch.

### WP3 — Backend-Wire-Contract-Test (NEU)

- `src/backend/internal/security/security_events_wire_test.go:27-42` —
  `TestSecurityEventsResponseEmptyNeverNull`: `securityEventsResponse(nil)`
  marshallt als `"events":[]` UND enthält KEIN `:null` (Mandat-15-Assert-Paar,
  Vorbild `TestThreatCorrelationReportWireNeverNull`, S168).
- `security_events_wire_test.go:44-68` —
  `TestSecurityEventsResponsePreservesRealRows`: echte Checkov-Row überlebt 1:1
  (Mandat-2-Geländer: Normalisierung schluckt nie echte Findings), weiter kein
  `:null`. Rein hermetisch (json.Marshal, kein DB-Harness).

### WP4 — Frontend-Regressionstest (NEU)

- `src/frontend/src/views/SecurityScansPage.test.tsx:136-148` — echte Rows:
  Checkov-Finding + Quarantine-Row + Release-Action; beide Tabellen
  (2 `tbody tr`).
- `SecurityScansPage.test.tsx:150-159` — Wire-Null-Fall (`events:null`,
  `quarantined_sessions:null`): ehrliche Empty-States, kein Crash.
- `SecurityScansPage.test.tsx:161-172` — Live-Crash-Klasse: Non-Array-OBJEKTE
  statt Listen → ehrliche Empty-States, kein TypeError, keine
  "is not a function"-Leiche im gerenderten Text.
- Fixtures = echte Wire-Shapes: camelCase gemäß `store.SecurityEventRow`-
  JSON-Tags (security_events.go:10-20), snake_case gemäß AgentSessionRow;
  i18n-Keys gegen en.json verifiziert (`securityScans.iac.quarantineEmpty`
  Z.1803, `releaseAction` Z.1809, `findingsEmpty` Z.1813).

## Verifikations-Transkript

Alle Befehle am 30.9.2026 vom Fortsetzungs-Agent ausgeführt (Repo-Wurzel bzw.
`src/frontend/`; Original-Output-Auszüge, nichts geschönt):

1. `make go-build` → **exit 0**.
   `[make] no host go toolchain — compiling in golang:latest container`
   → `go build ./...` im Container OK (kein Host-Go vorhanden).

2. `make go-vet` → **exit 0** (`go vet ./...` im selben Container-Setup).

3. Hermetischer Zieltest (Stack down → `make go-test` verboten; exakt der
   hermetische Befehl):

   ```
   docker run --rm -v /home/ji/projects/jimesh/src/backend:/src -w /src \
     -v /home/ji/go/pkg/mod:/go/pkg/mod -v jimesh_go-build:/root/.cache/go-build \
     golang:latest go test ./internal/security/ -count=1
   ```

   → `ok  github.com/ji-podhead/jimesh/backend/internal/security  0.011s` — **exit 0**.
   Verbositäts-Lauf (`-v`) belegt die SPRINT-172-Tests namentlich:

   ```
   --- PASS: TestSecurityEventsResponseEmptyNeverNull (0.00s)
   --- PASS: TestSecurityEventsResponsePreservesRealRows (0.00s)
   ```

   (+31 weitere PASS der Package-Kollegen; 2 fremde Vault-Handler-Tests SKIPpen
   ehrlich von selbst: "no reachable postgres … connection refused" — im
   hermetischen Container erwartbar.)

4. `npx tsc -p tsconfig.app.json --noEmit` (aus `src/frontend/`) →
   **414 Fehlerzeilen — exakt die Basis, KEINE Erhöhung; 0 Treffer für
   SecurityScansPage** (grep über den vollen Output). Die 414 sind der
   dokumentierte Style-Noise (chain-mesh-graph.tsx 108, ProxyChainsPage 47,
   SubagentApprovalQueuePage 44, …).

5. `npx vitest run` (aus `src/frontend/`) →
   `Test Files  2 failed | 59 passed (61)` / `Tests  3 failed | 486 passed (489)`.

   - **Eigene Suite grün: `src/views/SecurityScansPage.test.tsx (3 tests) 316ms ✓`
     — alle drei SPRINT-172-Regressionstests bestanden.**
   - Die 3 Fails sind ALLE fremd, S165b-WIP attributiert (section-nav /
     HierarchySidebar / locales = dessen Ownership; von S172 NICHT angefasst):
     - `src/lib/section-nav.test.ts` ×2 — der uncommittete `section-nav.ts`-WIP
       (`git diff`: `labelKey: 'nav.ai'` + 5 neue `/models/*`-Routen) mappt
       `/chat` jetzt auf `nav.ai`, und `nav.ai` fehlt noch in en.json.
     - `src/components/sidebar/HierarchySidebar.test.tsx` ×1 — derselbe WIP: die
       5 neuen `/models/{fusion,embeddings,image,video,audio}`-Routen sind (noch)
       nicht über die Sidebar erreichbar (Reachability-Guard schlägt an).
   - Kein Fix von mir (fremde Dateien, laufender Parallel-Sprint).

6. `node scripts/check-i18n.mjs` (aus `src/frontend/`) → **exit 0**:
   `i18n validation passed for 60 locales and 3307 keys` — S172 fügt keine
   neuen Keys hinzu (nutzt nur bestehende, gegen en.json verifiziert).

**Abnahme-Kriterien (Plan) — Ist:** AC1 ✓ (Transkript 3), AC2 ✓ (Transkript 5,
eigene Suite), AC3 ✓, AC4 ✓ (414/414, 0 eigene), AC5 ✓ für die eigene Suite +
check-i18n ✓; ⚠ Suite-gesamt-Grün blockiert NUR durch S165b-WIP (Transkript 5,
ehrlich fremd attributiert), AC6 ✓ (Offene Punkte 1).

## Offene Punkte / Ehrlichkeit

1. **Live-Bestätigung bleibt Operator-Schritt — von mir NICHT als "live gefixt"
   behauptet.** Der Crash kam aus einem minifizierten Next-Bundle auf dem
   Trading-Node, das aus dem Repo nicht rekonstruierbar ist (s.
   Live-Build-Einordnung). Repo-seitig ist die ganze Klasse (null-Liste UND
   Objekt-wo-Array) beidseitig beseitigt und verifiziert; live bestätigt ist sie
   erst, wer Frontend UND Backend neu deployed (die Normalisierung passiert
   serverseitig) und `/security/scans/iac` bei leerer security_events-Tabelle
   lädt: erwartete Wire-Antwort `{"events":[]}`, Page zeigt "No IaC findings
   recorded yet." + "Nothing quarantined right now.".
2. **SecurityEventsPage.tsx:37** — Sibling-Consumer von GET /api/security/events
   (`res.events ?? []`): heute null-sicher, aber noch OHNE Array.isArray-Upgrade.
   Nicht in S172-Ownership; als Handoff notiert (Mandat 15.2: jeder Consumer
   guarded trotzdem).
3. **3 vitest-Fails = S165b-WIP** (section-nav/HierarchySidebar/locales) — ehrlich
   fremd attributiert, NICHT gefixt (Transkript 5). "Suite gesamt grün" gilt
   erst, wenn S165b committet hat.
4. **`quarantined_workspaces`** wird von der iac-Page deklariert, aber nicht
   gerendert — kein toter Code von S172 (Feld ist Teil des echten Wire-Vertrags
   von GET /api/security/quarantine); ein Guard entfällt schlicht, weil kein
   Lesezugriff existiert.
5. **Hermetisches Niveau = das in dieser Session erreichbare.** `make go-test` ist
   verboten (Stack down); der Wire-Test prüft die reine Encoder-Funktion, die
   jsdom-Suite pinnen die Wire-Shapes fixturgenau. Ein DB-gestützter End-to-End-
   Lauf bleibt Operator-Verifikation: Stack up → `curl /api/security/events` bei
   leerer Tabelle → `"events":[]`.
6. **BACKLOG-Spiegel** (Doku-Mandat 1.3): laut Brief NICHT in S172-Ownership —
   der Parent pflegt docs/backlog/BACKLOG.md beim Commit.
7. **Attribution:** Plan + Code (WP1-WP4): Vorgänger-Agent, Absturz ohne Meldung.
   Ist-Stands-Audit gegen den Plan, Verifikation + Doc-Vervollständigung:
   Fortsetzungs-Agent.
