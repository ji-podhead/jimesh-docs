# SPRINT-168 — THREAT-CORRELATION NULL-CRASH (LIVE-BUGFIX)

**Status:** fix gebaut + getestet — **NICHT live verifiziert** (Stack bewusst down; siehe Offene Punkte / Mandat 6)
**Gemeldet von:** Operator, live, 30.9.2026 — "thread detection hat nen bug:
Something went wrong — can't access property 'map', t.correlated is null".
Die Seite crasht, seit der SIEM-Indexer auf dem Node LÄUFT und echte Rows liefert.

---

## Plan (vor Code, gem. Documentation-Mandate)

### Ziel

Der Live-Crash auf `/security/threat-response` wird beidseitig gefixt:

- Root Cause im Backend beseitigen (nil-Slice → JSON `null` statt `[]`),
- Frontend zusätzlich gegen jeden `null`/non-array-Zugriff auf die
  Report-Listen verteidigen (Defense in Depth),
- beidseitige Regressionstests, die genau die Live-Crash-Shape pinnen.

**Kein Scope-Creep:** nur der Crash + die Guards. Kein Redesign, keine neuen
Features, keine neuen i18n-Keys, keine neuen Routen.

### Root-Cause-Hypothese (gestellt, dann am Code verifiziert)

Go-Struct mit nil-Slice serialisiert als JSON `"correlated": null` statt `[]` —
Frontend mappt ohne Guard (`pairs.map` auf `null`).

**Verifiziert — die Hypothese stimmt exakt:**
`handleThreatCorrelation` initialisiert `rep.Correlated = []correlatedPair{}`
(threat_correlation.go:345), **überschreibt** ihn aber mit dem Rückgabewert von
`correlate(...)` — und `correlate` deklarierte `var pairs []correlatedPair`
(nil-Slice bei 0 Matches). JSON-Marshaling macht daraus `"correlated": null`.
Der Bug war immer da — `correlate()` lief bei jedem Request; jede
0-Paar-Antwort war bereits `"correlated":null`. Sichtbar als ganzer Seiten-
Crash wurde er erst, seit der SIEM-Indexer läuft: jetzt antworten beide
Quellen verfügbar mit echten Rows, die Antwort enthält also Events UND wird
vom Panel durch den kaputten `correlated`-Pfad gerendert. Vorher (Quellen
leer oder unavailable) trat derselbe null-Fall auf, aber der Fehler blieb
unerkannt, weil niemand die Seite in genau diesem Zustand offen hatte.
`rep.Events` war nie betroffen (append auf non-nil bleibt non-nil), wird aber
aus demselben Wire-Contract auf BEIDEN Seiten mit abgesichert.

Frontend-Crash-Punkte (beide in threat-correlation-panel.tsx, pre-fix):
- Zeile 115: `correlatedContainerNames(data.correlated)` → `pairs.map` auf `null`
  (das ist der "t.correlated is null" aus dem minifizierten Live-Build: `t` = `data`),
- Zeile 158: `data.correlated.length` → TypeError auf `null`.

### Work Packages

| WP | Inhalt | Datei(en) | Status |
|----|--------|-----------|--------|
| WP1 | Backend: `correlate()` gibt nie nil zurück; Handler normalisiert beide Listen direkt vor dem Marshal (Wire-Contract: Listen sind nie `null`, höchstens leer) | `src/backend/internal/gateway/threat_correlation.go` | ✅ |
| WP2 | Frontend: Guard auf ALLEN correlated-Zugriffen (`Array.isArray`), `events` gleich mit (gleiche Crash-Klasse, gleiche Wire-Vertragslücke) | `src/frontend/src/components/security/threat-correlation-panel.tsx` | ✅ |
| WP3 | Backend-Regressionstest: 0-Paar-Report (exakt der Handler-Fluss) muss `"correlated":[]` liefern, NIEMALS `null` | `src/backend/internal/gateway/threat_correlation_test.go` | ✅ |
| WP4 | Frontend-Regressionstest: Report mit `correlated: null` (Live-Shape) rendert ohne Crash + ehrlichen Empty-State; `events: null` ebenso | `src/frontend/src/components/security/threat-correlation-panel.test.tsx` | ✅ |
| WP5 | Verifikation + Transkript (Mandat 6) | dieses Doc | ✅ |

### Acceptance Criteria

1. `GET /api/security/threat-correlation` marshallt jeden Report mit
   `"events":[…]` und `"correlated":[…]` — Listen sind **nie** `null`, auch
   bei 0 Paaren (Backend-Tests beweisen es über `json.Marshal`, den derselbe
   Encoder des Handlers nutzt). ✅
2. Panel überlebt `correlated: null` UND `events: null` ohne Crash und zeigt
   die ehrlichen Empty-States (0 Paare + no_correlation-Note bzw. noEvents). ✅
3. `make go-build` + `make go-vet` Exit 0. ✅
4. `npx tsc -p tsconfig.app.json --noEmit`: kein Fehler in threat-correlation-
   Dateien, Zahl nicht erhöht (gemessene Baseline 414 — s. Transkript). ✅
5. `npx vitest run` grün inkl. der 2 neuen Tests; `node scripts/check-i18n.mjs`
   PASS unverändert (keine neuen Keys). ✅
6. **Nicht** behauptet wird "live gefixt" — der Stack ist bewusst down; die
   Live-Bestätigung macht erst der Operator nach `make restart-backend`. ✅ (ehrlich offengehalten)

---

## Arbeitslog (Datei:Zeile — Zeilennummern = Post-Fix-Stand)

### Root-Cause-Verifikation (vor dem Fix, Pre-Fix-Zeilennummern)

- `src/backend/internal/gateway/threat_correlation.go:344-346` (pre-fix) — Handler
  initialisiert `rep.Events = []threatEvent{}` / `rep.Correlated = []correlatedPair{}`.
- `src/backend/internal/gateway/threat_correlation.go:394` (pre-fix) —
  `rep.Correlated = correlate(falcoEvents, suricataEvents, windowSeconds)`
  **überschreibt** die Initialisierung; Rückgabewert bei 0 Matches: nil.
- `src/backend/internal/gateway/threat_correlation.go:212` (pre-fix) —
  `var pairs []correlatedPair` = nil-Slice → `json.Marshal` → `"correlated":null`.
- `src/frontend/src/components/security/threat-correlation-panel.tsx:115` (pre-fix) —
  `correlatedContainerNames(data.correlated)` → `pairs.map` crasht auf `null`
  (= der Live-Error "t.correlated is null"; `t` ist der minifizierte `data`).
- `src/frontend/src/components/security/threat-correlation-panel.tsx:158` (pre-fix) —
  `data.correlated.length` crasht ebenso.
- `src/frontend/src/views/ThreatResponsePage.tsx:21-31` — Parent-Page ist ein
  dünner Shell (2 Panels), iteriert NICHT selbst über Reports; der Crash liegt
  vollständig im Panel → keine Änderung an der Page nötig (hypothetische
  "map über Report-Liste" verifiziert und ausgeschlossen).
- Weitere Consumer des Endpoints: keine. Grep über `src/frontend/src` nach
  `threat-correlation`/`ThreatCorrelationPanel`: nur das Panel fetcht
  `/api/security/threat-correlation`; `EmailNotificationsPage` erwähnt es nur im Kommentar.
- Route: `src/backend/internal/gateway/gateway.go:422` registriert den Handler;
  Wire-Shape-Erwartung im Test: `threat_correlation_test.go:121` (pre-fix, Zeile
  ~121, Test `TestBuildCorrelationNoteKeyHonestStates` Fall "correlated").

### WP1 — Backend-Fix (threat_correlation.go)

- Zeile 211-218: `correlate()` — `var pairs []correlatedPair` ersetzt durch
  `pairs := make([]correlatedPair, 0)` + Kommentar (nie nil, Wire-Contract).
- Zeile 104-105: Struct-Kommentare `Events`/`Correlated` um den Wire-Contract
  ergänzt ("NEVER null, at most []").
- Zeile 299-315: neue Funktion `normalizeThreatCorrelationReport` — ersetzt
  nil-Listen durch leere Slices (reine Funktion, unit-testbar).
- Zeile 434: Handler ruft `normalizeThreatCorrelationReport(&rep)` direkt vor
  `json.NewEncoder(w).Encode(rep)` — Vertragsgarantie unabhängig davon, was
  Code davor zugewiesen hat (Defense in Depth gegen künftige Regressionen).

### WP2 — Frontend-Guards (threat-correlation-panel.tsx)

- Zeile 101-107: `correlatedContainerNames` nimmt jetzt
  `CorrelatedPair[] | null | undefined`, `Array.isArray`-Guard intern — null
  (die Live-Crash-Shape) oder Non-Array → leeres Set statt TypeError.
- Zeile 118-127: jede Listennutzung im Component läuft über geprüfte Lokale:
  `const correlated = data && Array.isArray(data.correlated) ? data.correlated : []`
  und `const events = …` (gleiche Crash-Klasse, gleicher Wire-Vertrag).
- Zeile 170: Stat-Cell `correlated.length.toLocaleString()` (statt
  `data.correlated.length`).
- Zeile 212 + 219: Timeline nutzt `events.length === 0` / `events.map`
  (statt `data.events.…`).

### WP3 — Backend-Regressionstests (threat_correlation_test.go)

- Import `encoding/json` ergänzt.
- Zeile 241-252: `TestCorrelateZeroMatchesReturnsEmptySliceNotNull` — die exakte
  Live-Crash-Input-Shape (beide Sensoren liefern Rows, auf VERSCHIEDENEN
  Containern → ehrlich 0 Paare): `correlate` darf nie nil liefern.
- Zeile 256-293: `TestThreatCorrelationReportWireNeverNull` — spiegelt den
  exakten Handler-Fluss (Events appended, `Correlated = correlate(…)` — die
  Zuweisung, die den Bug shippte —, noteKey, pre-encode normalize) und marshallt
  mit `json.Marshal`: `"correlated":[]` MUSS enthalten sein, `:null` DARF
  NIE vorkommen, noteKey muss ehrlich `no_correlation` sein.
- Zeile 296-316: `TestNormalizeThreatCorrelationReportFixesNilLists` —
  Defense-in-Depth-Pin: selbst ein Zero-Value-Report wird als `[]`-Listen
  emittiert.

### WP4 — Frontend-Regressionstests (threat-correlation-panel.test.tsx)

- Zeile 14-19: Header-Kontrakt um Punkte 4./5. (SPRINT-168) ergänzt.
- Zeile 102-137: Fixture `CORRELATED_NULL` — exakt die Wire-Shape, die der
  kaputte Backend schickte: echte Events auf beiden Seiten, `correlated: null`,
  `noteKey: 'no_correlation'`.
- Zeile 139-152: Fixture `LISTS_NULL` — härteste Abweichung: `events: null`
  UND `correlated: null` (backend-seitig nie legitim, Guards müssen trotzdem
  ehrlich degradieren).
- Zeile 243-260: Test "correlated:null renders without crashing + honest
  empty state" — no_correlation-Note ("separate signals, no amplification"),
  beide Events weiter gerendert (2 tbody-Zeilen), Stat "Correlated pairs" zeigt 0
  (via nextElementSibling-Assertion, kein TextGefrickel), KEIN "Correlated
  hits found".
- Zeile 262-268: Test "events:null AND correlated:null → noEvents-Empty-State
  ohne Crash" ("No events from either source…", "honestly nothing to correlate").

---

## Verifikations-Transkript (exakte Befehle + echte Ergebnisse)

Alle Läufe am 30.9.2026 im Working Tree `/home/ji/projects/jimesh` (Host ohne
Go-Toolchain → `make` nutzt `golang:latest`-Container mit `--rm`, wie erlaubt).

### 1) `make go-build`

```
$ make go-build
[make] no host go toolchain — compiling in golang:latest container
(Fehler beim 1. Versuch: internal/gateway/meshsquad.go:38:2: "errors" imported
 and not used — FREMDE Datei, untracked, gehört dem laufenden SPRINT-163-Agent,
 mid-edit. NICHT angefasst, nur dokumentiert. Nach deren Fix:)
# 2. Versuch:
[make] no host go toolchain — compiling in golang:latest container
GO_BUILD_EXIT=0
```
**Exit 0.** (Der rote Zwischenschritt war fremd verursacht — die Datei gehört
einem laufenden Parallel-Agent und ist mir off-limits; nicht angefasst, nur
dokumentiert. Dass meine Dateien sauber kompilieren, belegt Punkt 3 unabhängig
davon: dort kompiliert der komplette Gateway-Testbinary inkl. meiner Dateien
und läuft.)

### 2) `make go-vet`

```
$ make go-vet
[make] no host toolchain — go vet in golang:latest container
GO_VET_EXIT=0
```
**Exit 0.**

### 3) Backend-Regressionstests (pur, ohne Stack)

`make go-test` ist verboten (braucht jimesh-postgres, Stack down). Meine neuen
Tests sind reine Funktionen (kein Store/SSH; die `init()`s im Gateway-Test-
Package setzen nur eine Log-Env-Var, kein `TestMain` vorhanden) — deshalb
durften sie gezielt ohne DB laufen:

```
$ docker run --rm -v /home/ji/projects/jimesh/src/backend:/src -w /src     -v /home/ji/go/pkg/mod:/go/pkg/mod -v jimesh_go-build:/root/.cache/go-build \
    golang:latest go test ./internal/gateway/ -count=1 \
    -run 'Correlat|FalcoRowsToEvents|DetectionsToEvents' -v
```
Echte Ergebnisse (Auszug):
```
--- PASS: TestFalcoRowsToEventsUsesPayloadTimeAndFields
--- PASS: TestFalcoRowsToEventsFallsBackToIngestTimeHonestly
--- PASS: TestDetectionsToEventsOnlyResolvedCarryContainer
--- PASS: TestCorrelateMatchesSameContainerWithinWindow
--- PASS: TestCorrelateNoMatchOutsideWindow
--- PASS: TestCorrelateNeverFabricatesWithoutContainerName
--- PASS: TestBuildCorrelationNoteKeyHonestStates (6 subtests)
--- PASS: TestNewCorrelationsToNotifyFiresOnceForTheSamePair
--- PASS: TestNewCorrelationsToNotifyFiresAgainAfterTTLExpires
--- PASS: TestNewCorrelationsToNotifyTreatsDifferentContainersIndependently
--- PASS: TestNewCorrelationsToNotifyNilCachePassesEverythingThrough
--- PASS: TestBuildCorrelationNotificationCarriesRealFields
--- PASS: TestCorrelateZeroMatchesReturnsEmptySliceNotNull        <- NEU (SPRINT-168)
--- PASS: TestThreatCorrelationReportWireNeverNull                <- NEU (SPRINT-168)
--- PASS: TestNormalizeThreatCorrelationReportFixesNilLists       <- NEU (SPRINT-168)
PASS
ok  github.com/ji-podhead/jimesh/backend/internal/gateway 0.010s
```
**Alle 15 Tests PASS (12 vorbestehende + 3 neue).**

### 4) `npx tsc -p tsconfig.app.json --noEmit` (aus `src/frontend/`)

```
$ npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c 'error TS'
414          # Baseline VOR meinen Edits, im selben Tree gemessen
$ # nach meinen Edits:
$ npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c 'error TS'
414
$ npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -E 'threat-correlation|ThreatResponse'
(kein Treffer)
```
**414 vor = 414 nach meinen Edits; 0 Fehler in threat-correlation-Dateien.**
Hinweis zur Zahl: Der Sprint-Brief nannte 471 vorbestehende Fehler. Die
Parent-Session hat bestätigt: S166 hat 57 vorbestehende Fehler in
`ProjectDetailPage.tsx` gefixt → die tsc-Basis ist jetzt 414. Mein im
Sitzungsstart (VOR meinen Edits) gemessener Stand war exakt diese 414.
Für meinen Fix gilt unverändert: keine Fehler in meinen Dateien,
Gesamtzahl durch mich nicht erhöht (vor/nach identisch 414).

### 5) `npx vitest run` (aus `src/frontend/`)

Zuerst gezielt:
```
$ npx vitest run src/components/security/threat-correlation-panel.test.tsx
 ✓ src/components/security/threat-correlation-panel.test.tsx (6 tests) 111ms
 Test Files  1 passed (1)
      Tests  6 passed (6)
```
Dann die komplette Suite:
```
$ npx vitest run
 Test Files  59 passed (59)
      Tests  484 passed (484)
   Start at  08:14:05
   Duration  10.71s
```
**Grün — 59 Dateien / 484 Tests, inkl. meiner 6 (4 vorbestehende + 2 neue).**

### 6) `node scripts/check-i18n.mjs` (aus `src/frontend/`)

```
$ node scripts/check-i18n.mjs
i18n validation passed for 60 locales and 3307 keys
```
**PASS, unverändert (60/3307)** — ich habe keine neuen i18n-Keys angelegt
(der ehrliche Empty-State nutzt die existierenden note-Keys).

### 7) Final-Re-Verifikation auf dem Parent-bestätigten Tree

Parent-Update nach meiner ersten Verifikationsrunde: (a) tsc-Basis offiziell
414 (S166 fixte 57 in ProjectDetailPage.tsx), (b) tree-weites `make go-build`
grün, (c) S161/S164/S166 committet. Daraufhin alle Gates einmal komplett
wiederholt — echte Ergebnisse:

```
$ make go-build            → GO_BUILD_EXIT=0
$ make go-vet              → GO_VET_EXIT=0
$ docker run --rm … golang:latest go test ./internal/gateway/ -count=1 \
      -run 'Correlat|FalcoRowsToEvents|DetectionsToEvents'
  ok  github.com/ji-podhead/jimesh/backend/internal/gateway 0.010s  (GO_TEST_EXIT=0)
$ npx vitest run            → Test Files 59 passed (59), Tests 484 passed (484)
$ npx tsc … | grep -c 'error TS'          → 415
$ npx tsc … | grep -E 'threat-correlation|ThreatResponse' → 0 Treffer
$ node scripts/check-i18n.mjs             → PASS (60/3307)
```

**Zur 415:** tree-weit EIN Fehler mehr als die bestätigte 414-Basis. Er liegt
NICHT in meinen Dateien (0 Treffer) — Attributierung per
Fehlerliste × Datei-mtime: `src/components/plugins/PluginInstallWizardDialog.tsx`,
in den 15 Minuten vor dem Check von einem Parallel-Agent bearbeitet (fremdes
WIP; nicht angefasst, nur dokumentiert). Für SPRINT-168 bleibt die Regel
erfüllt: keine Fehler in threat-correlation-Dateien, von mir keine Erhöhung —
vor/nach meinen Edits identisch 414; die 415 ist nach meinen Edits durch
fremde Arbeit entstanden.

---

## Offene Punkte / Ehrlichkeit (Mandat 6)

1. **Live-Verifikation aussteht (bewusst):** Der lokale Stack ist down, ein
   Restart ist mir verboten. Status ist daher "fix gebaut + getestet", NICHT
   "live gefixt". Letzte Bestätigung macht der Operator:
   ```
   make restart-backend      # force-recreate + health-wait
   # dann /security/threat-response öffnen (Falco+Suricata-Korrelation-Panel)
   # erwartete Live-Sicht: Seite rendert; bei 0 Paaren Stat "0" + Note
   # "…separate signals, no amplification" statt Crash
   # optional curl: curl -s http://127.0.0.1:19091/api/security/threat-correlation | jq .correlated
   # erwartete Ausgabe: [] — nie null
   ```
2. **API_DOCS.md:** Der Wire-Contract ("Listen sind nie null, höchstens leer")
   wäre der saubere Dokumentationsort für `GET /api/security/threat-correlation`.
   Die Datei ist mir laut Brief verboten — NICHT angefasst. Bitte Parent-Session
   entscheiden, ob der Satz dort ergänzt wird.
3. **BACKLOG.md:** Mir verboten (Brief) — Spiegel-Eintrag dieses Sprints
   (`[x] SPRINT-168 threat-correlation null-crash fix`) bitte durch die
   Parent-Session nach Verifikation nachtragen (Documentation-Mandate Punkt 3).
4. **Fremd-Beobachtung während meiner Verifikation:** `meshsquad.go` (untracked,
   SPRINT-163-Agent) hatte während meines ersten `make go-build` einen
   Compile-Fehler (`"errors" imported and not used`) — fremd verursacht, nicht
   angefasst, von dem Agent selbst behoben; meine finalen go-build/go-vet-Läufe
   waren grün (parent-seitig bestätigt: tree-weit grün, S161/S164/S166 committet).
   Zweite Fremd-Beobachtung in der Final-Re-Verifikation: +1 tsc-Fehler in
   `src/components/plugins/PluginInstallWizardDialog.tsx` (aktives WIP eines
   Parallel-Agents, s. Transkript §7). Keine fremden Änderungen an MEINEN
   Ownership-Dateien beobachtet.
5. **Mögliche Mandats-Ergänzung (Vorschlag, nicht umgesetzt):** Der Fall verdient
   einen Eintrag nach MANDATES-Muster ("JSON-Listen sind nie null — nil-Slices
   vor Marshal zu [] initialisieren"). MANDATES.md gehört nicht zu meinem
   Ownership; Vorschlag an die Parent-Session.

---

## Geänderte Dateien (nur Ownership)

| Datei | Art |
|-------|-----|
| `src/backend/internal/gateway/threat_correlation.go` | Fix + Wire-Contract-Normalisierung |
| `src/backend/internal/gateway/threat_correlation_test.go` | 3 neue Regressionstests |
| `src/frontend/src/components/security/threat-correlation-panel.tsx` | Guards auf allen Listenzugriffen |
| `src/frontend/src/components/security/threat-correlation-panel.test.tsx` | 2 neue Regressionstests + 2 Fixtures |
| `docs/sprints/SPRINT-168-THREAT-CORRELATION-NULL-CRASH.md` | dieses Doc |
