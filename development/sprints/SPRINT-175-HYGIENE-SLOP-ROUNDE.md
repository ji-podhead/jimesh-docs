# SPRINT-175 — Hygiene-/Slop-Runde (ohne Deploy)

**Status:** `[x]` Code+Docs erledigt und lokal verifiziert (1.10.2026) — **kein Deploy, kein Stack-Start**
**Operator-Order (verbatim):** *"nicht deployen, aber den rest schon mal fixen"* + *"hast du auch devdocs gelesen?"*
**Quellen:** `WORKTREE-AUDIT-2026-09-28.md`, `THREE-WEEK-AUDIT-2026-09-29.md`, `docs_dev/` (gelesen, s. Abschnitt „devdocs"), offene Backlog-Zeilen S150–S157, offene `/logs`-Beobachtung, Lint-/i18n-Befunde.

---

## Plan (vor dem Code festgelegt)

**Ziel:** die als „sloppy" identifizierten Befunde beheben, die **ohne laufenden Stack und ohne Deploy** ehrlich verifizierbar sind — inklusive Mandat-1-Doku im selben Durchgang.

**Arbeitspakete (WP):**

| WP | Inhalt |
|---|---|
| WP1 | Team-Bindings-Panel: Add-/Delete-Aktionen statt toter UI (Mandat 2) + unwrapped Query-Response-Bug + i18n-Aufräumung |
| WP2 | Container-Logs-Route endlich nutzbar: Backend SSE-Frames müssen valides JSON sein; Frontend echter SSE-Reader statt JSON-Poll (beide Seiten waren nie funktionsfähig) |
| WP3 | Mandat-15-Guard in `SecurityEventsPage` (Listen-Shape hart abfragen) |
| WP4 | `vlan.go` `&&`-Ketten-Bug (POSIX `set -e`-Ausnahme) aus Ref `2808825` wiederherstellen + Regressionstests |
| WP5 | Doku: `API_DOCS.md` auf 101 echte Routen angleichen (Dashboards-, Security-/Notification-Block, `/ready`, `/api/nodes/health`), veraltete Backlog-/Sprint-Zeilen korrigieren, `MANDATES.md` Nummerierungs-Kollision, tote i18n-Keys |
| WP6 | Toten Code entfernen: `deployed-services.ts` (0 Importe), 19 `*.test.*.bak`, Key `nav.llmProxy` (0 Referenzen) |

**Acceptance Criteria:**

1. `make go-vet`, `make go-build` grün; `go test ./internal/network/... ./internal/deploy/...` grün.
2. `npm run test` (= `vitest run` + `check:i18n`) grün; `npm run lint` **nicht über der Basis** 443 Probleme / 415 Errors; `tsc` 0 Fehler in den geänderten Dateien.
3. Jede berührte Route steht in `API_DOCS.md` (Maschinen-Check: 101/101 — **Nachtrag 1.10.**: der Check war falsch, `GET /openapi.json` (`gateway.go:235`) fehlte wirklich → nachgetragen, Neulauf 106/106).
4. Backlog-Spiegel + Sprint-File, ehrlich mit dem, was NICHT verifiziert wurde (Mandat 6).
5. Kein Deploy, kein `make up`, kein `make restart-backend`.

---

## Erledigt

### WP1 — Team-Bindings-Panel (echte Aktionen statt Mock-Versprechen)

* `src/frontend/src/components/rbac/team-bindings-panel.tsx` — Add-Button öffnet Inline-Formular (Resource + Typ), speichert via `POST /api/team-bindings`; pro Zeile ein DELETE-Button (`DELETE /api/team-bindings/:id`). Response-Hülle `{success, bindings, count}` wird im `queryFn` entpackt — vorher landete das gewrappte Objekt direkt als `bindings[]`-Array im State (echter Laufzeit-Bug, Panel rendete nie echte Rows). Veralteter `bindingsRouteMissing`-Claim („GET /api/team-bindings does not exist yet") entfernt — die Route existiert seit `4d952c1`.
* `src/frontend/src/views/TeamsPage.tsx` — Kommentar auf den tatsächlichen Stand angepasst.
* i18n: nur bereits vorhandene Keys verwendet (`teams.actions`, `common.cancel`, `common.delete`, `common.saving`) → **0 neue Keys**; toter Key `bindingsRouteMissing` aus allen 60 Locales entfernt (Parität erhalten).
* Tests: `team-bindings-panel.test.tsx` neu geschrieben, **4/4 grün**, inkl. Live-POST-Assertion mit gestubtem `globalThis.fetch` (echter Request-Pfad, kein Mock-Endpoint).

### WP2 — Container-Logs (SSE) repariert

Beide Seiten waren nie funktionsfähig:

* **Backend** `src/backend/internal/deploy/container_logs.go` — die `data:`-Frames waren **invalides JSON** (`fmt.Fprintf` schrieb `line`/`ts` ohne Anführungszeichen); jeder Client-Parse scheiterte. Jetzt `json.Marshal(map[string]string{"line","ts"})`; tote Helferfunktion `escapeSSE` entfernt.
* **Frontend** `src/frontend/src/components/apps/ContainerLogViewer.tsx` — der alte react-query/`apiFetch`-JSON-Poll konnte die SSE-Antwort gar nicht lesen. Jetzt: eigener SSE-Reader (`fetch` + `Bearer`-Token aus `getToken()`, `?tail=500`, Frame-Parser mit `event:`/`data:`/`:keepalive`, 3s-Backoff wie `components/realtime-logs.tsx`, 1000-Zeilen-Cap), Response wird nur über dem dokumentierten Wire-Shape gelesen (`{line, ts}` — kein `Array.isArray`-Guesswerk, kein `firstArrayValue`-Fallback). Toter Code (`firstArrayValue`, `toLine`, `normalizeLogs`) und das veraltete TODO raus.
* Zustands-Refactor: ein einziger `StreamState {key, lines, error}` inkl. `key = projectId/containerId` — der Container-Wechsel ist ein **Vergleich**, keine setState-Mutation im Effect-Body (`react-hooks/set-state-in-effect`), `lines` per `useMemo` stabil (kein `exhaustive-deps`-Warning).
* i18n (60 Locales, gleiche 2 Keys): `appDetail.logsEmpty` = „No container output yet" / „Noch keine Container-Ausgabe"; `logsEmptyDescription` behauptet nicht mehr, die Route fehle — sie beschreibt den ehrlichen Leerzustand.

### WP3 — Mandat-15-Guard

* `src/frontend/src/views/SecurityEventsPage.tsx` — `Array.isArray(res.events) ? res.events : []` vor dem Setzen des Query-Daten (`P.map`-Crash-Klasse aus S172).

### WP4 — vlan `set -e`-Ausnahme

* `src/backend/internal/network/vlan.go` — der `&&`-Ketten-Bug aus SPRINT/Ref `2808825` war durch einen Parallel-Merge verloren gegangen: innerhalb einer `&&`-Liste feuert `set -e` nicht → fehlgeschlagenes `ip link add` galt als Provisioning-Erfolg (Mandat-2-Klasse). Wiederhergestellt: getrennte Statements pro Schritt.
* `vlan_test.go` — die zwei Regressionsschassertions aus derselben Ref wiederhergestellt. **Grün.**

### WP5 — Doku (Mandat 1)

* **`API_DOCS.md`**
  * `GET /ready` als echter Readiness-Probe korrigiert (war als Stub beschrieben).
  * `GET /api/nodes/health` ergänzt (fehlte komplett).
  * Neue Sektion **„Dashboards & Dashboard-Presets (SPRINT-151 / SPRINT-149 — gateway/dashboards.go)"** mit allen 10 Routen; Feldnamen gegen die Go-Structs geprüft (`DashboardRow`, `defaultCorrelationWindowSeconds = 600`).
  * Neue Sektion **„Security & notification surfaces (SPRINT-147 / SPRINT-152)"** (threat-correlation, threat-responder/status, notifications/email/status) mit den realen Feldern (`threatCorrelationReport`, `SMTPStatus{configured,host,port,from,to}`).
  * **Maschinen-Check:** Route-Extraktion über `src/backend/internal/gateway/*.go` → **101 Routen, 0 davon fehlen wörtlich in `API_DOCS.md`.**
* **`docs/backlog/BACKLOG.md`** — veraltete Statuszeilen korrigiert:
  * S157-6 → `[x]` (f6241c4f/f108dc00), S156-9 → `[x]` (S166), S151 → `[x]` (bcf70bd9), S152 → `[x]` (ea45aa2b, mit offenem S152-5), S153 + S153-7 → `[x]` (SPRINT-163); Überschrift „S150-S153 Ghost-Phasen" nach tatsächlichem Stand umgeschrieben (S150 bleibt `[ ] geplant`).
* **Sprint-Mirrors:** `SPRINT-153-…:122` und `SPRINT-156-…:111` → `[x]`.
* **`MANDATES.md`** — doppelte `## 13` (OKF vs. Domain Hierarchy): OKF kam an das Ende als **`## 16`** (dort, wo neue Mandate eh landen) mit Nummerierungs-Hinweis; verdoppelter Footer mitten in der Datei entfernt. Jetzt eindeutig **1–16**, ein Footer.
* Tote i18n-Keys: `nav.llmProxy` (0 Referenzen, `sdkLogs.sourceTabs.llmProxy` ist ein anderer Key) aus allen 60 Locales → **3305 Keys**. Die vier in S166-O4 genannten `projectDetail.*`-Keys existieren längst nicht mehr (nichts zu tun).

### WP6 — Toten Code entfernen

* `src/frontend/src/lib/deployed-services.ts` gelöscht (0 Importe, 102 Zeilen Ghost-Code, Mandat 14).
* 19× `*.test.*.bak` unter `src/frontend/src` gelöscht.

---

## devdocs-Begehung (`docs_dev/`, gitignored)

Gelesen und geprüft. Befund:

* `docs_dev/` ist **veraltete Zwischenablage**: 72 alte Sprint-Dateien (SPRINT-0…148), ein eigenes `backlog/BACKLOG.md` mit 74 offenen `[ ]`-Zeilen, das seit Langem **nicht** der Wahrheit entspricht (aktuelle Wahrheit steht in `docs/backlog/BACKLOG.md`), plus `AUDIT-2026-09-21-*`/`AUDIT-2026-09-27-*`.
* Die dort als kritisch gemeldeten Theater-Funde sind **bereits erledigt** (gegen den heutigen Stand geprüft):
  * `ProxyChainsPage.tsx` `key.status || 'healthy'` → **nicht mehr vorhanden**;
  * `AgentSessionDetailPage.tsx` „hardcoded theater / LIVE TELEMETRY" → **echte** `useQuery`-Anbindung (`GET /api/sessions`, `GET /api/subagents/:id/tool-calls`), Kommentar „nothing here is hardcoded";
  * `NetworkEditingGrid.tsx` toter Fake-Badge-Component → nicht mehr im Tree.
* Einzige Maßnahme: **keine weiteren Änderungen dort** — das Verzeichnis ist gitignored Altbestand; Aktualisierungen würden niemandem helfen und wäre Mandat-17-fremdes Aufblähen. Die veraltete `docs_dev/backlog/BACKLOG.md` wird **bewusst nicht** aktualisiert (unterster Stand der Dokumentationskette, s. Abschnitt „Bewusst offen").

---

## Verifikation (exakt, Mandat 6)

Gehostet, **ohne Stack** (`make ps` leer — `make go-test` würde zu ~80 % SKIP liefern und ist daher bewusst **nicht** gelaufen; kein `make up`, kein `make restart-backend`, kein Deploy):

| Befehl | Ergebnis |
|---|---|
| `make go-vet` | sauber (0 Ausgabe) |
| `make go-build` | rc=0 |
| `go test ./internal/network/... ./internal/deploy/...` (golang:latest-Container, gleiche Caches wie `make go-vet`) | `ok network 0.116s`, `ok deploy 0.605s` |
| `cd src/frontend && npm run test` | **61 Dateien / 493 Tests grün** + `i18n validation passed for 60 locales and 3305 keys` (rc=0) |
| `npx vitest run src/components/rbac/team-bindings-panel.test.tsx` | 4/4 grün |
| `npm run lint` (in `src/frontend/`) | **443 Probleme (415 Errors, 28 Warnungen) = exakt die Basis** vor der Runde; 0 in den von mir geänderten Dateien |
| `npx tsc --noEmit -p tsconfig.app.json` | **414 Errors gesamt, 0 davon in den geänderten Dateien** (ContainerLogViewer, team-bindings-panel(.test), SecurityEventsPage, TeamsPage) |
| Route-Maschinencheck (`API_DOCS.md` ↔ `gateway/*.go`) | **101/101** → ehrliche Korrektur 1.10.: es waren **100/101**, `GET /openapi.json` fehlte (Prüfer übersah die Methode-präfixierten Registrierungen); nachgetragen → Neulauf **106/106, 0 fehlend** |

Nicht verifiziert (bewusst, ehrlich):

* **Live-/Stack-Verifikation jeder Art** — Container-Logs-SSE, Bindings-Panel gegen echte DB, VLAN-Provisioning am echten Node brauchen den laufenden Stack.
* `make go-test` gesamt (SKIP-lastig ohne Stack) und DB-lastige Suite `internal/gateway/...` (läuft, aber E2E-Cases SKIPpen ohne Postgres).
* Deployment/SIEM/Vault/Trading-Redeploy — ausdrücklich vom Operator ausgeschlossen („nicht deployen").

---

## Bewusst offen (nicht in dieser Runde)

* **S167 PHASE 2** (deploy/backend, siem, vault, Redis `requirepass`, Backups-Bootstrap) → **Deploy, Operator**.
* **S159-6/-7** (Chromium-Plugin-Renderer Live-E2E + Full-Version-Gaps), **S159-6-Live**-Bestätigungen, Trading-Redeploy-Mint (S169 O-1/O-4/O-5) → brauchen laufenden Stack/Node.
* **Git-History-Scrub** (Vault-Dev-Literal u. ä. in alten Commits) → irreversibel, Operator-Entscheidung.
* **6 angetroffene `git stash`-Einträge** → nicht angerührt (Datenverlust-Risiko), nur gemeldet.
* **`oteltrace` OTLP-Export Phase 2**, **`capabilities.rego`-Durchsetzung** → eigene Bauschritte, teils Operator-/Policy-Entscheidung.
* **4 Source-Pinning-Tests** (S166-O-Ableitung) → Test-Restrukturierung mit eigenem Risikoprofil, separat.
* **`docs_dev/`-Backlog** wird nicht aktualisiert (Altbestand, gitignored — s. oben).

**Nächster Schritt Operator:** Stack hochfahren und die beiden SSE-/Binding-Flächen live prüfen, dann committen (nichts von S175 ist committet).
